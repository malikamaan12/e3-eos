import { HttpException } from '@nestjs/common';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { CANONICAL_ROLES, hasRolePermission, normalizeRole } from '@e3-eos/domain';
import { DbService } from '../common/db.service.js';
import { DurableProjectCommand } from '../projects/durable-project-command.js';
import { ProjectAccessService, type ProjectAccessContext, type ProjectAccessTransaction } from '../projects/project-access.service.js';

const editPermissions = ['projects.manage', 'tasks.manage', 'operations.manage', 'design.version'];
const completePermissions = [...editPermissions, 'field.inspect'];
const reasonSchema = z.string().trim().min(1).max(2000);
const packageSchema = z.object({
  name: z.string().trim().min(3).max(200), ownerId: z.string().uuid(),
  stageInstanceId: z.string().uuid().optional(), reason: reasonSchema,
}).strict();
const taskSchema = z.object({
  packageId: z.string().uuid(), title: z.string().trim().min(3).max(250),
  assigneeId: z.string().uuid().optional(), reason: reasonSchema,
}).strict();
const completionSchema = z.object({
  expectedVersion: z.number().int().positive(), reason: reasonSchema,
  completionEvidence: z.string().trim().min(1).max(4000).optional(),
}).strict();
const fail = (code: string, detail: string, status: number): never => {
  throw new HttpException({ code, title: detail, detail }, status);
};
const timestamp = (value: unknown) => value ? new Date(value as string).toISOString() : null;
function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail('WORK_VALIDATION_ERROR', 'The work payload is invalid. Check required fields, identifiers and reason.', 400);
  return parsed.data;
}
function id(value: string) {
  if (!z.string().uuid().safeParse(value).success) fail('WORK_VALIDATION_ERROR', 'A valid work record UUID is required.', 400);
  return value;
}

export function workPackageSummary(row: any) {
  return {
    id: row.id, organisationId: row.organisation_id, projectId: row.project_id,
    stageInstanceId: row.stage_instance_id, name: row.name, ownerId: row.owner_id,
    ownerName: row.owner_name || null, status: row.status, acceptanceState: row.acceptance_state,
    rowVersion: row.row_version, createdAt: timestamp(row.created_at), updatedAt: timestamp(row.updated_at),
  };
}
export function taskSummary(row: any) {
  return {
    id: row.id, packageId: row.package_id, organisationId: row.organisation_id,
    projectId: row.project_id, title: row.title, assigneeId: row.assignee_id,
    assigneeName: row.assignee_name || null, state: row.state, isCompleted: row.is_completed,
    completedAt: timestamp(row.completed_at), completedBy: row.completed_by,
    completionEvidence: row.completion_evidence, rowVersion: row.row_version,
    createdAt: timestamp(row.created_at), updatedAt: timestamp(row.updated_at),
  };
}

/** Ordinary work records remain independent from designated output acceptance. */
export class WorkService {
  private readonly access: ProjectAccessService;
  private readonly commands: DurableProjectCommand;
  constructor(db: DbService) {
    this.access = new ProjectAccessService(db);
    this.commands = new DurableProjectCommand(db);
  }

  private capabilities(access: ProjectAccessContext) {
    const editor = access.accessLevel === 'editor';
    const canEdit = editor && editPermissions.some(permission => hasRolePermission(access.role, permission, access.isSuperAdmin));
    return { canCreatePackage: canEdit, canCreateTask: canEdit,
      canCompleteTask: editor && completePermissions.some(permission => hasRolePermission(access.role, permission, access.isSuperAdmin)) };
  }

  private async assignedMember(tx: ProjectAccessTransaction, access: ProjectAccessContext, userId: string) {
    const target = (await tx.query(`SELECT m.role FROM memberships m JOIN project_access_grants g
      ON g.membership_id=m.id AND g.organisation_id=m.organisation_id
      WHERE m.organisation_id=$1 AND m.user_id=$2 AND m.audience='internal' AND NOT m.is_revoked
        AND g.project_id=$3 AND NOT g.is_revoked FOR UPDATE OF m,g`,
      [access.organisationId, userId, access.project.id])).rows[0];
    if (!target || !CANONICAL_ROLES.includes(normalizeRole(target.role) as any) || normalizeRole(target.role) === 'client_user') {
      fail('WORK_ASSIGNEE_UNAVAILABLE', 'The owner or assignee must have active internal membership and explicit access to this project.', 404);
    }
  }

  async packages(reference: string, req: Request) {
    return this.access.withAccess(req, reference, { level: 'viewer', audiences: ['internal'] }, async (tx, access) => {
      const fieldOnly = normalizeRole(access.role) === 'field_supervisor';
      const rows = await tx.query(`SELECT p.*,u.name AS owner_name FROM work_packages p
        LEFT JOIN users u ON u.id=p.owner_id WHERE p.organisation_id=$1 AND p.project_id=$2
        AND (NOT $3::boolean OR EXISTS (SELECT 1 FROM task_instances t
          WHERE t.package_id=p.id AND t.organisation_id=p.organisation_id AND t.project_id=p.project_id AND t.assignee_id=$4))
        ORDER BY p.created_at DESC,p.id`, [access.organisationId, access.project.id, fieldOnly, access.userId]);
      return { data: rows.rows.map(workPackageSummary), meta: { capabilities: this.capabilities(access) } };
    });
  }

  async tasks(reference: string, req: Request) {
    return this.access.withAccess(req, reference, { level: 'viewer', audiences: ['internal'] }, async (tx, access) => {
      const fieldOnly = normalizeRole(access.role) === 'field_supervisor';
      const rows = await tx.query(`SELECT t.*,u.name AS assignee_name,p.status AS package_status FROM task_instances t
        JOIN work_packages p ON p.id=t.package_id AND p.organisation_id=t.organisation_id AND p.project_id=t.project_id
        LEFT JOIN users u ON u.id=t.assignee_id
        WHERE t.organisation_id=$1 AND t.project_id=$2 AND (NOT $3::boolean OR t.assignee_id=$4)
        ORDER BY t.created_at DESC,t.id`, [access.organisationId, access.project.id, fieldOnly, access.userId]);
      const capabilities = this.capabilities(access);
      return { data: rows.rows.map(row => ({ ...taskSummary(row),
        canComplete: capabilities.canCompleteTask && (!fieldOnly || row.assignee_id === access.userId)
          && !row.is_completed && ['planned', 'active'].includes(row.state) && row.package_status === 'active',
      })), meta: { capabilities } };
    });
  }

  async createPackage(reference: string, body: unknown, req: Request) {
    const input = parse(packageSchema, body);
    return this.commands.run(req, reference, {
      level: 'editor', audiences: ['internal'], permissions: editPermissions,
      operation: 'POST /projects/:projectId/work-packages', action: 'work.package.created', targetType: 'work_package', input,
    }, async (tx, access) => {
      await this.assignedMember(tx, access, input.ownerId);
      if (input.stageInstanceId && !(await tx.query(`SELECT id FROM project_stage_instances
        WHERE id=$1 AND organisation_id=$2 AND project_id=$3 FOR UPDATE`,
      [input.stageInstanceId, access.organisationId, access.project.id])).rows.length) {
        fail('WORK_STAGE_NOT_FOUND', 'Stage instance is not available in this project.', 404);
      }
      const packageId = randomUUID();
      const row = (await tx.query(`INSERT INTO work_packages
        (id,organisation_id,project_id,stage_instance_id,name,owner_id,status,acceptance_state)
        VALUES($1,$2,$3,$4,$5,$6,'active','pending') RETURNING *`,
      [packageId, access.organisationId, access.project.id, input.stageInstanceId || null, input.name, input.ownerId])).rows[0];
      return { id: packageId, version: row.row_version,
        data: { status: row.status, recordVersion: row.row_version, payload: workPackageSummary(row) },
        event: { reason: input.reason, ownerId: input.ownerId, stageInstanceId: input.stageInstanceId || null } };
    });
  }

  async createTask(reference: string, body: unknown, req: Request) {
    const input = parse(taskSchema, body);
    return this.commands.run(req, reference, {
      level: 'editor', audiences: ['internal'], permissions: editPermissions,
      operation: 'POST /projects/:projectId/tasks', action: 'work.task.created', targetType: 'task', input,
    }, async (tx, access) => {
      const pkg = (await tx.query(`SELECT * FROM work_packages
        WHERE id=$1 AND organisation_id=$2 AND project_id=$3 FOR UPDATE`,
      [input.packageId, access.organisationId, access.project.id])).rows[0];
      if (!pkg) fail('WORK_PACKAGE_NOT_FOUND', 'Work package is not available in this project.', 404);
      if (pkg.status !== 'active') fail('WORK_PACKAGE_INACTIVE', 'Tasks can only be added to an active work package.', 409);
      if (input.assigneeId) await this.assignedMember(tx, access, input.assigneeId);
      const taskId = randomUUID();
      const row = (await tx.query(`INSERT INTO task_instances
        (id,package_id,organisation_id,project_id,title,assignee_id,state,is_completed)
        VALUES($1,$2,$3,$4,$5,$6,'planned',false) RETURNING *`,
      [taskId, input.packageId, access.organisationId, access.project.id, input.title, input.assigneeId || null])).rows[0];
      return { id: taskId, version: row.row_version,
        data: { status: row.state, recordVersion: row.row_version, payload: taskSummary(row) },
        event: { reason: input.reason, packageId: input.packageId, assigneeId: input.assigneeId || null } };
    });
  }

  private async scopedTask(tx: ProjectAccessTransaction, access: ProjectAccessContext, taskId: string) {
    const row = (await tx.query(`SELECT t.*,p.acceptance_state,p.status AS package_status FROM task_instances t
      JOIN work_packages p ON p.id=t.package_id AND p.organisation_id=t.organisation_id AND p.project_id=t.project_id
      WHERE t.id=$1 AND t.organisation_id=$2 AND t.project_id=$3 FOR UPDATE OF t,p`,
    [taskId, access.organisationId, access.project.id])).rows[0];
    if (!row || (normalizeRole(access.role) === 'field_supervisor' && row.assignee_id !== access.userId)) {
      fail('WORK_TASK_NOT_FOUND', 'Task is not available in the current project and assignment scope.', 404);
    }
    return row;
  }

  async completeTask(reference: string, taskId: string, body: unknown, req: Request) {
    id(taskId);
    if ((body as any)?.expectedVersion == null) fail('WORK_PRECONDITION_REQUIRED', 'Refresh the task and provide its expectedVersion.', 428);
    const input = parse(completionSchema, body);
    return this.commands.run(req, reference, {
      level: 'editor', audiences: ['internal'], permissions: completePermissions,
      operation: `POST /projects/:projectId/tasks/${taskId}/complete`, action: 'work.task.completed', targetType: 'task', input,
      authorize: async (tx, access) => { await this.scopedTask(tx, access, taskId); },
    }, async (tx, access) => {
      const task = await this.scopedTask(tx, access, taskId);
      if (task.row_version !== input.expectedVersion) fail('WORK_VERSION_CONFLICT', 'Task changed. Refresh and use its current version with a new command key.', 412);
      if (task.is_completed || task.state === 'completed') fail('WORK_TASK_ALREADY_COMPLETED', 'This task is already complete. Retry an uncertain command using its original key.', 409);
      if (!['planned', 'active'].includes(task.state) || task.package_status !== 'active') fail('WORK_TASK_NOT_ACTIVE', 'Only a planned or active task in an active package can be completed.', 409);
      const row = (await tx.query(`UPDATE task_instances SET state='completed',is_completed=true,
        completed_at=clock_timestamp(),completed_by=$4,completion_evidence=$5,row_version=row_version+1,updated_at=clock_timestamp()
        WHERE id=$1 AND organisation_id=$2 AND project_id=$3 RETURNING *`,
      [taskId, access.organisationId, access.project.id, access.userId, input.completionEvidence || null])).rows[0];
      return { id: taskId, version: row.row_version,
        data: { status: 'completed', recordVersion: row.row_version,
          payload: { task: taskSummary(row), packageAcceptanceState: task.acceptance_state } },
        event: { reason: input.reason, packageId: task.package_id, hasCompletionEvidence: Boolean(input.completionEvidence),
          previousVersion: task.row_version, packageAcceptanceState: task.acceptance_state } };
    });
  }

  async unavailable(reference: string, req: Request, operation: string, write = true) {
    return this.access.withAccess(req, reference, { level: write ? 'editor' : 'viewer', audiences: ['internal'] }, async () => {
      fail('WORK_OPERATION_UNAVAILABLE', `${operation} is not implemented as a durable, authorised workflow. No record or approval was created.`, 503);
    });
  }
}
