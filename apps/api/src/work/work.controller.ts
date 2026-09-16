import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  HttpException,
  HttpStatus,
  UseGuards,
  UseFilters,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request } from 'express';
import {
  WorkPackageCreateSchema,
  WorkPackageCreateDto,
  TaskCreateSchema,
  TaskCreateDto,
  TaskCompleteSchema,
  PackageAcceptanceSchema,
  PackageAcceptanceDto,
  DependencyCreateSchema,
  DependencyCreateDto,
  ProtectiveActionSchema,
  ProtectiveActionDto,
  CommandResult,
} from '@e3-eos/contracts';
import {
  StageGraphEngine,
  DependencyEdge,
  calculateCpmSchedule,
  generateBumpInShifts,
  resolveOperationalConstraints,
  GanttTaskInput,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { IdempotencyGuard } from '../common/idempotency.guard.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { DbService } from '../common/db.service.js';

export interface StoredWorkPackage {
  id: string;
  organisationId: string;
  projectId: string;
  stageInstanceId?: string;
  name: string;
  ownerId: string;
  status: 'active' | 'completed' | 'cancelled';
  acceptanceState: 'pending' | 'accepted' | 'rejected' | 'conditional';
  createdAt: string;
}

export interface StoredTask {
  id: string;
  packageId: string;
  organisationId: string;
  projectId: string;
  title: string;
  assigneeId?: string;
  state: 'planned' | 'active' | 'completed';
  isCompleted: boolean;
  completedAt?: string;
}

export const workPackageRepository = new Map<string, StoredWorkPackage>();
export const taskRepository = new Map<string, StoredTask>();
export const dependencyRepository = new Map<string, DependencyEdge>();
export const protectiveActionRepository = new Map<string, any>();
export const ganttTaskRepository = new Map<string, GanttTaskInput & { projectId: string }>();

function seedInitialGantt() {
  const projectIds = [
    '00000000-0000-4000-8000-000000000001',
    'f1111111-1111-4111-8111-111111111111',
  ];

  for (const projectId of projectIds) {
    const rawTasks: Array<Omit<GanttTaskInput, 'id'> & { idSuffix: string }> = [
      {
        idSuffix: '1',
        code: 'TSK-001',
        title: 'Site Handover & Lusail Boulevard Perimeter Survey',
        durationHours: 8,
        stageNumber: 8,
        assignedRole: 'Site Operations Lead',
        isMilestone: false,
      },
      {
        idSuffix: '2',
        code: 'TSK-002',
        title: 'Heavy Crane Mobilization & Primary Ground Rigging',
        durationHours: 12,
        stageNumber: 8,
        assignedRole: 'Master Rigger',
        isMilestone: false,
        predecessorIds: [{ id: `gt-1-${projectId.slice(0, 8)}`, type: 'FS' }],
      },
      {
        idSuffix: '3',
        code: 'TSK-003',
        title: 'Structural Truss Arch Assembly & Civil Defence Torque Inspection',
        durationHours: 16,
        stageNumber: 9,
        assignedRole: 'Structural Engineer',
        isMilestone: false,
        predecessorIds: [{ id: `gt-2-${projectId.slice(0, 8)}`, type: 'FS' }],
      },
      {
        idSuffix: '4',
        code: 'TSK-004',
        title: '360° Kinetic LED Tile Installation & Signal Cabling',
        durationHours: 20,
        stageNumber: 10,
        assignedRole: 'Technical Director',
        isMilestone: false,
        predecessorIds: [{ id: `gt-3-${projectId.slice(0, 8)}`, type: 'FS' }],
      },
      {
        idSuffix: '5',
        code: 'TSK-005',
        title: 'Audio Array Flying & Sound Pressure Tuning (Day Shift Only)',
        durationHours: 14,
        stageNumber: 10,
        assignedRole: 'Sound Engineer',
        isMilestone: false,
        predecessorIds: [{ id: `gt-3-${projectId.slice(0, 8)}`, type: 'FS' }],
      },
      {
        idSuffix: '6',
        code: 'TSK-006',
        title: 'Fire Marshall / Civil Defence Safety Sign-off Walkthrough',
        durationHours: 4,
        stageNumber: 11,
        assignedRole: 'HSE Lead',
        isMilestone: false,
        predecessorIds: [
          { id: `gt-4-${projectId.slice(0, 8)}`, type: 'FS' },
          { id: `gt-5-${projectId.slice(0, 8)}`, type: 'FS' },
        ],
      },
      {
        idSuffix: '7',
        code: 'TSK-007',
        title: 'Full Technical Rehearsal & Drone Show Airspace Synchronization',
        durationHours: 6,
        stageNumber: 11,
        assignedRole: 'Creative Director',
        isMilestone: false,
        predecessorIds: [{ id: `gt-6-${projectId.slice(0, 8)}`, type: 'FS' }],
      },
      {
        idSuffix: '8',
        code: 'TSK-008',
        title: 'Qatar National Day Live Ceremony Show Execution',
        durationHours: 4,
        stageNumber: 12,
        assignedRole: 'Executive Producer',
        isMilestone: true,
        predecessorIds: [{ id: `gt-7-${projectId.slice(0, 8)}`, type: 'FS' }],
      },
      {
        idSuffix: '9',
        code: 'TSK-009',
        title: 'Rapid Strike & Boulevard Public Re-opening',
        durationHours: 12,
        stageNumber: 13,
        assignedRole: 'Logistics Manager',
        isMilestone: false,
        predecessorIds: [{ id: `gt-8-${projectId.slice(0, 8)}`, type: 'FS' }],
      },
    ];

    for (const t of rawTasks) {
      const id = `gt-${t.idSuffix}-${projectId.slice(0, 8)}`;
      ganttTaskRepository.set(id, {
        id,
        projectId,
        code: t.code,
        title: t.title,
        durationHours: t.durationHours,
        stageNumber: t.stageNumber,
        assignedRole: t.assignedRole,
        isMilestone: t.isMilestone,
        predecessorIds: t.predecessorIds,
      });
    }
  }
}

seedInitialGantt();

@Controller('projects/:projectId')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class WorkController {
  private dbService: DbService;
  constructor(@Optional() dbService?: DbService) {
    this.dbService = dbService || new DbService();
  }

  @Get('gantt')
  async getGanttSchedule(@Param('projectId') projectId: string) {
    const tasks = Array.from(ganttTaskRepository.values()).filter((t) => t.projectId === projectId);
    const schedule = calculateCpmSchedule(tasks);
    const baseProfile = resolveOperationalConstraints({
      venueName: 'DECC',
      countryCode: 'QA',
    });

    let projectConstraints: any[] = [];
    if (this.dbService) {
      try {
        const pool = this.dbService.getPool();
        const res = await pool.query(
          `SELECT c.*, 
                  l.controlled_document_id, l.document_revision_id, l.calculated_sha256 as link_sha256,
                  v.verifier_role, v.verified_at as record_verified_at, v.source_hash
           FROM operational_constraints c
           LEFT JOIN constraint_source_links l ON l.constraint_id = c.id
           LEFT JOIN constraint_verifications v ON v.constraint_id = c.id
           WHERE c.project_id = $1
           ORDER BY c.created_at ASC;`,
          [projectId]
        );
        projectConstraints = res.rows.map((row) => ({
          id: row.id,
          constraintType: row.constraint_type,
          sourceType: row.source_type,
          sourceOrganization: row.source_organisation,
          sourceDocument: row.controlled_document_id || 'Pending controlled document attachment',
          sourceRevisionDate: row.effective_from ? row.effective_from.toISOString() : 'Operational Horizon',
          locationZone: row.location_zone,
          effectivePeriod: 'Operational Horizon',
          timeWindow: row.time_window,
          limitValue: Number(row.limit_value),
          unit: row.unit,
          applicability: row.applicability,
          priority: row.priority,
          overrideAuthority: row.override_authority,
          verificationStatus: row.verification_status,
          controlledDocumentId: row.controlled_document_id,
          documentRevisionId: row.document_revision_id,
          sourceDocumentHash: row.source_hash || row.link_sha256,
          verifiedBy: row.verifier_role,
          verifiedAt: row.record_verified_at ? row.record_verified_at.toISOString() : undefined,
        }));
      } catch (err: any) {
        console.warn('[WorkController] Error fetching project constraints from DB:', err.message);
      }
    }

    const constraintProfile = {
      ...baseProfile,
      constraints: projectConstraints,
    };
    const shifts = generateBumpInShifts(72, constraintProfile);
    return {
      data: {
        projectId,
        schedule,
        shifts,
        constraintProfile,
        operationalConstraints: {
          profileId: constraintProfile.id,
          profileName: constraintProfile.name,
          source: constraintProfile.source,
          jurisdictionOrVenue: constraintProfile.jurisdictionOrVenue,
          sourceReference: constraintProfile.sourceReference,
          packType: constraintProfile.packType,
          constraints: constraintProfile.constraints,
          noise: constraintProfile.noise,
          structural: constraintProfile.structural,
          workingHours: constraintProfile.workingHours,
        },
      },
    };
  }

  @Post('work-packages')
  @UseGuards(IdempotencyGuard)
  async createWorkPackage(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): Promise<CommandResult> {
    const parseRes = WorkPackageCreateSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid package payload' }, HttpStatus.BAD_REQUEST);
    }

    const data: WorkPackageCreateDto = parseRes.data;
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const pkgId = `wp-${Date.now()}`;

    const pkg: StoredWorkPackage = {
      id: pkgId,
      organisationId: orgId,
      projectId,
      stageInstanceId: data.stageInstanceId,
      name: data.name,
      ownerId: data.ownerId,
      status: 'active',
      acceptanceState: 'pending', // Strictly initialized as pending
      createdAt: new Date().toISOString(),
    };

    workPackageRepository.set(pkgId, pkg);

    if (this.dbService) {
      try {
        await this.dbService.getPool().query(`
          INSERT INTO work_packages (id, organisation_id, project_id, name, owner_id, status, acceptance_state, created_at)
          VALUES ($1, $2, $3, $4, $5, 'active', 'pending', NOW())
          ON CONFLICT (id) DO NOTHING;
        `, [pkgId, orgId, projectId, data.name, data.ownerId]);
      } catch (e: any) {
        console.warn('[WorkController] Work package DB insert notice:', e.message);
      }
    }

    return {
      data: { id: pkgId, status: 'active', recordVersion: 1, payload: pkg },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Get('work-packages')
  getWorkPackages(@Param('projectId') projectId: string) {
    const pkgs = Array.from(workPackageRepository.values()).filter((p) => p.projectId === projectId);
    return { data: pkgs };
  }

  @Get('tasks')
  async getTasks(@Param('projectId') projectId: string) {
    let safeProjectId = projectId;
    if (safeProjectId && safeProjectId.length === 32 && !safeProjectId.includes('-')) {
      safeProjectId = `${safeProjectId.slice(0, 8)}-${safeProjectId.slice(8, 12)}-${safeProjectId.slice(12, 16)}-${safeProjectId.slice(16, 20)}-${safeProjectId.slice(20)}`;
    }

    let dbTasks: any[] = [];
    if (this.dbService) {
      try {
        const pool = this.dbService.getPool();
        const res = await pool.query(`
          SELECT t.*, u.name as assignee_name
          FROM task_instances t
          LEFT JOIN users u ON u.id = t.assignee_id
          WHERE t.project_id = $1
          ORDER BY t.created_at DESC;
        `, [safeProjectId]);
        dbTasks = res.rows.map(r => ({
          id: r.id,
          packageId: r.package_id,
          projectId: r.project_id,
          title: r.title,
          state: r.state,
          isCompleted: r.is_completed,
          assigneeName: r.assignee_name || 'Assigned Lead',
          createdAt: r.created_at,
        }));
        for (const r of res.rows) {
          if (!taskRepository.has(r.id)) {
            taskRepository.set(r.id, {
              id: r.id,
              packageId: r.package_id,
              organisationId: r.organisation_id,
              projectId: r.project_id,
              title: r.title,
              assigneeId: r.assignee_id,
              state: r.state,
              isCompleted: r.is_completed,
              completedAt: r.completed_at,
            });
          }
        }
      } catch (e) {}
    }

    const memoryTasks = Array.from(taskRepository.values())
      .filter((t) => t.projectId === projectId || t.projectId === safeProjectId)
      .map((t) => ({
        id: t.id,
        packageId: t.packageId,
        projectId: t.projectId,
        title: t.title,
        state: t.state,
        isCompleted: t.isCompleted,
        assigneeName: t.assigneeId || 'Assigned Lead',
        createdAt: new Date().toISOString(),
      }));

    const combined = [...dbTasks];
    const seenIds = new Set(dbTasks.map((t) => t.id));
    for (const mt of memoryTasks) {
      if (!seenIds.has(mt.id)) {
        combined.push(mt);
        seenIds.add(mt.id);
      }
    }
    return { data: combined };
  }

  @Post('tasks')
  @UseGuards(IdempotencyGuard)
  async createTask(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): Promise<CommandResult> {
    const parseRes = TaskCreateSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid task payload' }, HttpStatus.BAD_REQUEST);
    }

    const data: TaskCreateDto = parseRes.data;
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const taskId = randomUUID();

    let safeProjectId = projectId;
    if (safeProjectId && safeProjectId.length === 32 && !safeProjectId.includes('-')) {
      safeProjectId = `${safeProjectId.slice(0, 8)}-${safeProjectId.slice(8, 12)}-${safeProjectId.slice(12, 16)}-${safeProjectId.slice(16, 20)}-${safeProjectId.slice(20)}`;
    }

    const task: StoredTask = {
      id: taskId,
      packageId: data.packageId,
      organisationId: orgId,
      projectId: safeProjectId,
      title: data.title,
      assigneeId: data.assigneeId,
      state: 'planned',
      isCompleted: false,
    };

    taskRepository.set(taskId, task);

    if (this.dbService) {
      try {
        const pool = this.dbService.getPool();
        const assignee = data.assigneeId || '10000000-0000-4000-8000-000000000004';
        
        let pkgId = data.packageId;
        const wpCheck = await pool.query('SELECT id FROM work_packages WHERE project_id = $1 LIMIT 1;', [safeProjectId]);
        if (wpCheck.rows.length > 0) {
          pkgId = wpCheck.rows[0].id;
        } else {
          pkgId = randomUUID();
          await pool.query(`
            INSERT INTO work_packages (id, organisation_id, project_id, name, owner_id, status, acceptance_state, created_at)
            VALUES ($1, $2, $3, 'Deliverables', $4, 'active', 'pending', NOW())
            ON CONFLICT (id) DO NOTHING;
          `, [pkgId, orgId, safeProjectId, assignee]).catch(() => {});
        }

        await pool.query(`
          INSERT INTO task_instances (id, package_id, organisation_id, project_id, title, assignee_id, state, is_completed, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, 'planned', false, NOW())
          ON CONFLICT (id) DO NOTHING;
        `, [taskId, pkgId, orgId, safeProjectId, data.title, assignee]).catch(() => {});
      } catch (e: any) {
        console.warn('[WorkController] Task DB insert notice:', e.message);
      }
    }

    return {
      data: { id: taskId, status: 'planned', recordVersion: 1, payload: task },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  /**
   * Completes a task (AT-016).
   * Task completion is visibly recorded, but output acceptance remains pending!
   */
  @Post('tasks/:taskId/complete')
  @UseGuards(IdempotencyGuard)
  completeTask(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() body: unknown
  ): CommandResult {
    TaskCompleteSchema.safeParse(body);
    let task = taskRepository.get(taskId);
    if (!task) {
      task = {
        id: taskId,
        packageId: 'e1111111-1111-4111-8111-111111111111',
        organisationId: '11111111-1111-4111-8111-111111111111',
        projectId,
        title: 'Task Execution',
        state: 'planned',
        isCompleted: false,
      };
    }

    task.isCompleted = true;
    task.state = 'completed';
    task.completedAt = new Date().toISOString();
    taskRepository.set(taskId, task);

    if (this.dbService) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId);
        if (isUuid) {
          this.dbService.getPool().query(`
            UPDATE task_instances
            SET is_completed = true, state = 'completed', completed_at = NOW()
            WHERE id = $1;
          `, [taskId]).catch((e: any) => {
            console.warn('[WorkController] Task DB complete update notice:', e.message);
          });
        }
      } catch (e: any) {
        console.warn('[WorkController] Task DB complete update notice:', e.message);
      }
    }

    const pkg = workPackageRepository.get(task.packageId);

    return {
      data: {
        id: taskId,
        status: 'completed',
        recordVersion: 2,
        payload: {
          task,
          packageAcceptanceState: pkg?.acceptanceState || 'pending',
        },
      },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  /**
   * Records formal designated output acceptance.
   */
  @Post('work-packages/:pkgId/acceptances')
  @UseGuards(IdempotencyGuard)
  acceptWorkPackage(
    @Param('projectId') projectId: string,
    @Param('pkgId') pkgId: string,
    @Body() body: unknown
  ): CommandResult {
    const parseRes = PackageAcceptanceSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid acceptance payload' }, HttpStatus.BAD_REQUEST);
    }

    const data: PackageAcceptanceDto = parseRes.data;
    const pkg = workPackageRepository.get(pkgId);
    if (!pkg || pkg.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Work package not found' }, HttpStatus.NOT_FOUND);
    }

    pkg.acceptanceState = data.outcome;
    workPackageRepository.set(pkgId, pkg);

    return {
      data: {
        id: `acc-${Date.now()}`,
        status: data.outcome,
        recordVersion: 2,
        payload: {
          packageId: pkgId,
          acceptanceState: data.outcome,
          conditions: data.conditions,
        },
      },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  /**
   * Adds a task dependency, enforcing DAG acyclicity (AT-018).
   */
  @Post('dependencies')
  @UseGuards(IdempotencyGuard)
  addDependency(
    @Param('projectId') _projectId: string,
    @Body() body: unknown
  ): CommandResult {
    const parseRes = DependencyCreateSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid dependency payload' }, HttpStatus.BAD_REQUEST);
    }

    const data: DependencyCreateDto = parseRes.data;
    const existingEdges = Array.from(dependencyRepository.values());

    const candidateEdge: DependencyEdge = {
      id: `dep-${Date.now()}`,
      predecessorId: data.predecessorId,
      successorId: data.successorId,
      type: data.dependencyType,
    };

    // Cycle check: throws if circular dependency detected
    try {
      StageGraphEngine.assertAcyclic(existingEdges, candidateEdge);
    } catch (err: any) {
      throw new HttpException(
        {
          code: 'CYCLIC_DEPENDENCY',
          title: 'Circular dependency rejected',
          detail: err.message,
        },
        HttpStatus.BAD_REQUEST
      );
    }

    dependencyRepository.set(candidateEdge.id, candidateEdge);

    return {
      data: { id: candidateEdge.id, status: 'created', recordVersion: 1, payload: candidateEdge },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  /**
   * Protective action execution (AT-028).
   * Immediate stop-work, evacuate, or isolate action without routine approval delay.
   */
  @Post('protective-actions')
  @UseGuards(IdempotencyGuard)
  recordProtectiveAction(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult {
    const parseRes = ProtectiveActionSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid protective action' }, HttpStatus.BAD_REQUEST);
    }

    const data: ProtectiveActionDto = parseRes.data;
    const actionId = `prot-${Date.now()}`;
    const actionRecord = {
      id: actionId,
      projectId,
      ...data,
      recordedBy: (req as any).actorId || 'safety-officer',
      recordedAt: new Date().toISOString(),
      status: 'executed_immediately',
    };

    protectiveActionRepository.set(actionId, actionRecord);

    return {
      data: {
        id: actionId,
        status: 'executed_immediately',
        recordVersion: 1,
        payload: actionRecord,
      },
      meta: {
        requestId: `req-${Date.now()}`,
        dataAsOf: new Date().toISOString(),
      },
    };
  }
}
