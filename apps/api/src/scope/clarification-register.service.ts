import { HttpException } from '@nestjs/common';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { CANONICAL_ROLES, hasRolePermission, normalizeRole } from '@e3-eos/domain';
import { DbService } from '../common/db.service.js';
import { DurableProjectCommand } from '../projects/durable-project-command.js';
import { ProjectAccessService, type ProjectAccessContext, type ProjectAccessTransaction } from '../projects/project-access.service.js';

const permissions = ['projects.manage', 'design.version', 'operations.manage'];
const readAccess = { level: 'viewer' as const, audiences: ['internal'] as Array<'internal'>, permissions };
const writeAccess = { ...readAccess, level: 'editor' as const };
const reason = z.string().trim().min(1).max(2000);
const date = z.string().datetime({ offset: true }).refine(value => {
  const day = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(Date.parse(value)) && Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === value.slice(0, 10);
}, 'A real calendar date with an explicit UTC offset is required.');
const createSchema = z.object({
  question: z.string().trim().min(3).max(4000), sourceAttribution: reason,
  ownerId: z.string().uuid(), respondentId: z.string().uuid().nullable().optional(),
  requirementId: z.string().uuid().nullable().optional(), dueAt: date.nullable().optional(), reason,
}).strict();
const respondSchema = z.object({ expectedVersion: z.number().int().positive(), response: z.string().trim().min(1).max(8000),
  respondentAttribution: z.string().trim().min(1).max(300), sourceAttribution: reason, reason }).strict();
const reopenSchema = z.object({ expectedVersion: z.number().int().positive(), reason }).strict();
const fail = (code: string, detail: string, status = 400): never => { throw new HttpException({ code, title: detail, detail }, status); };
const timestamp = (value: unknown) => value ? new Date(value as string).toISOString() : null;
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) return fail('CLARIFICATION_VALIDATION_ERROR', 'Check the question, attribution, reason, identifiers and explicit-offset date. Only the documented fields are accepted.');
  return result.data;
}
function identifier(value: string) {
  if (!z.string().uuid().safeParse(value).success) fail('CLARIFICATION_VALIDATION_ERROR', 'A valid clarification UUID is required.');
  return value;
}
const select = `SELECT c.*,r.respondent_attribution AS response_attributed_to,r.source_attribution AS response_source
  FROM clarifications c LEFT JOIN clarification_responses r
    ON r.id=c.latest_response_id AND r.clarification_id=c.id AND r.project_id=c.project_id AND r.organisation_id=c.organisation_id`;
export const CLARIFICATION_LIMITATIONS = [
  'Questions are internal records. Saving a question does not issue it to a client or prove delivery.',
  'Answers record attributed source text; source authorship and authority remain unverified until separately reviewed.',
  'An answer does not approve, amend or satisfy a requirement, design, price, commitment or release.',
  'Legacy questions are retained separately as unverified and are not imported into this controlled register automatically.',
];

/** One stable question, attributed immutable responses and reasoned state history. */
export class ClarificationRegisterService {
  private readonly access: ProjectAccessService;
  private readonly commands: DurableProjectCommand;
  constructor(db: DbService) { this.access = new ProjectAccessService(db); this.commands = new DurableProjectCommand(db); }

  private canWrite(access: ProjectAccessContext) {
    return access.accessLevel === 'editor' && permissions.some(permission => hasRolePermission(access.role, permission, access.isSuperAdmin));
  }
  private capabilities(access: ProjectAccessContext) {
    const write = this.canWrite(access);
    return { canCreate: write, canRespond: write, canReopen: write, canIssueExternally: false, canApproveScope: false };
  }
  private summary(row: any, access: ProjectAccessContext) {
    return { id: row.id, organisationId: row.organisation_id, projectId: row.project_id, question: row.question,
      source: row.source, sourceAttribution: row.source_attribution, ownerId: row.owner_id, respondentId: row.respondent_id,
      requirementId: row.requirement_id, requirementVersion: row.requirement_version, requirementRevisionId: row.requirement_revision_id,
      dueAt: timestamp(row.due_at), status: row.status, rowVersion: row.row_version, createdBy: row.created_by,
      createdAt: timestamp(row.created_at), updatedAt: timestamp(row.updated_at), provenanceState: row.provenance_state,
      latestResponse: row.latest_response_id ? { id: row.latest_response_id, response: row.response,
        respondentAttribution: row.response_attributed_to, sourceAttribution: row.response_source,
        recordedBy: row.responded_by, recordedAt: timestamp(row.responded_at), verificationState: 'attributed_unverified' } : null,
      canRespond: this.canWrite(access) && row.status === 'open', canReopen: this.canWrite(access) && row.status === 'answered',
      deliveryState: 'not_issued', scopeApprovalState: 'not_approved' };
  }
  private async assignedMember(tx: ProjectAccessTransaction, access: ProjectAccessContext, userId: string) {
    const row = (await tx.query(`SELECT m.role FROM memberships m JOIN project_access_grants g
      ON g.membership_id=m.id AND g.organisation_id=m.organisation_id
      WHERE m.organisation_id=$1 AND m.user_id=$2 AND m.audience='internal' AND NOT m.is_revoked
      AND g.project_id=$3 AND NOT g.is_revoked FOR UPDATE OF m,g`, [access.organisationId, userId, access.project.id])).rows[0];
    if (!row || !CANONICAL_ROLES.includes(normalizeRole(row.role) as any) || normalizeRole(row.role) === 'client_user') {
      fail('CLARIFICATION_MEMBER_UNAVAILABLE', 'The owner and assigned respondent must have active internal membership and explicit access to this project.', 404);
    }
  }
  private async requirement(tx: ProjectAccessTransaction, access: ProjectAccessContext, id: string) {
    const row = (await tx.query(`SELECT q.id,q.row_version,q.current_revision_id FROM requirements q
      JOIN requirement_revisions r ON r.id=q.current_revision_id AND r.requirement_id=q.id
        AND r.organisation_id=q.organisation_id AND r.project_id=q.project_id
      WHERE q.id=$1 AND q.organisation_id=$2 AND q.project_id=$3 AND q.provenance_state='manually_recorded'
        AND r.provenance_state='manually_recorded' FOR UPDATE OF q,r`, [id, access.organisationId, access.project.id])).rows[0];
    if (!row) fail('CLARIFICATION_REQUIREMENT_UNAVAILABLE', 'The linked requirement must be a recorded draft revision in this project.', 404);
    return row;
  }
  private async scoped(tx: ProjectAccessTransaction, access: ProjectAccessContext, id: string) {
    const row = (await tx.query(`${select} WHERE c.id=$1 AND c.organisation_id=$2 AND c.project_id=$3
      AND c.provenance_state='internal_record' FOR UPDATE OF c`, [id, access.organisationId, access.project.id])).rows[0];
    if (!row) fail('CLARIFICATION_NOT_FOUND', 'Clarification does not exist or is unavailable in this project scope.', 404);
    if (row.requirement_id && !(await tx.query(`SELECT r.id FROM requirement_revisions r JOIN requirements q
      ON q.id=r.requirement_id AND q.organisation_id=r.organisation_id AND q.project_id=r.project_id
      WHERE r.id=$1 AND r.requirement_id=$2 AND r.organisation_id=$3 AND r.project_id=$4
        AND r.provenance_state='manually_recorded' AND q.provenance_state='manually_recorded'`,
      [row.requirement_revision_id, row.requirement_id, access.organisationId, access.project.id])).rows.length) {
      fail('CLARIFICATION_REQUIREMENT_UNAVAILABLE', 'The pinned requirement revision is unavailable in this project scope.', 404);
    }
    return row;
  }
  private async history(tx: ProjectAccessTransaction, access: ProjectAccessContext, id: string, version: number,
    action: string, reason: string, responseId: string | null = null) {
    await tx.query(`INSERT INTO clarification_history(id,organisation_id,project_id,clarification_id,record_version,action,actor_id,reason,response_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [randomUUID(), access.organisationId, access.project.id, id, version, action, access.userId, reason, responseId]);
  }
  private async detail(tx: ProjectAccessTransaction, access: ProjectAccessContext, row: any) {
    const history = (await tx.query(`SELECT * FROM clarification_history WHERE organisation_id=$1 AND project_id=$2
      AND clarification_id=$3 ORDER BY record_version DESC LIMIT 501`, [access.organisationId, access.project.id, row.id])).rows;
    const responses = (await tx.query(`SELECT * FROM clarification_responses WHERE organisation_id=$1 AND project_id=$2
      AND clarification_id=$3 ORDER BY record_version DESC LIMIT 501`, [access.organisationId, access.project.id, row.id])).rows;
    return { ...this.summary(row, access), history: history.slice(0, 500).map(event => ({ id: event.id, rowVersion: event.record_version,
      action: event.action, actorId: event.actor_id, reason: event.reason, responseId: event.response_id, createdAt: timestamp(event.created_at) })),
      responses: responses.slice(0, 500).map(response => ({ id: response.id, rowVersion: response.record_version, response: response.response,
        respondentAttribution: response.respondent_attribution, sourceAttribution: response.source_attribution,
        recordedBy: response.recorded_by, recordedAt: timestamp(response.recorded_at), verificationState: 'attributed_unverified' })),
      historyTruncated: history.length > 500, responsesTruncated: responses.length > 500 };
  }
  async list(project: string, req: Request) {
    return this.access.withAccess(req, project, readAccess, async (tx, access) => {
      const rows = (await tx.query(`${select} WHERE c.organisation_id=$1 AND c.project_id=$2 AND c.provenance_state='internal_record'
        ORDER BY c.created_at DESC,c.id LIMIT 201`, [access.organisationId, access.project.id])).rows;
      return { data: rows.slice(0, 200).map(row => this.summary(row, access)), meta: { limit: 200, truncated: rows.length > 200,
        capabilities: this.capabilities(access), limitations: [...CLARIFICATION_LIMITATIONS] } };
    });
  }
  async get(project: string, id: string, req: Request) {
    identifier(id);
    return this.access.withAccess(req, project, readAccess, async (tx, access) => ({
      data: await this.detail(tx, access, await this.scoped(tx, access, id)), meta: { capabilities: this.capabilities(access), limitations: [...CLARIFICATION_LIMITATIONS] },
    }));
  }
  async create(project: string, body: unknown, req: Request) {
    const parsed = parse(createSchema, body);
    const input = { ...parsed, dueAt: parsed.dueAt ? new Date(parsed.dueAt).toISOString() : null,
      respondentId: parsed.respondentId || null, requirementId: parsed.requirementId || null };
    return this.commands.run(req, project, { ...writeAccess, operation: 'clarification.create', action: 'clarification.created', targetType: 'clarification', input,
      authorize: async (tx, access) => {
        await this.assignedMember(tx, access, input.ownerId);
        if (input.respondentId) await this.assignedMember(tx, access, input.respondentId);
        if (input.requirementId) await this.requirement(tx, access, input.requirementId);
      } }, async (tx, access) => {
      const linked = input.requirementId ? await this.requirement(tx, access, input.requirementId) : null;
      const id = randomUUID();
      await tx.query(`INSERT INTO clarifications(id,organisation_id,project_id,question,source,source_attribution,due_at,status,
        owner_id,respondent_id,requirement_id,requirement_version,requirement_revision_id,created_by,provenance_state)
        VALUES($1,$2,$3,$4,'internal_question',$5,$6,'open',$7,$8,$9,$10,$11,$12,'internal_record')`,
        [id, access.organisationId, access.project.id, input.question, input.sourceAttribution, input.dueAt, input.ownerId,
          input.respondentId, input.requirementId, linked?.row_version || null, linked?.current_revision_id || null, access.userId]);
      await this.history(tx, access, id, 1, 'created', input.reason);
      return { id, version: 1, data: await this.detail(tx, access, await this.scoped(tx, access, id)),
        event: { reason: input.reason, ownerId: input.ownerId, respondentId: input.respondentId, requirementId: input.requirementId,
          requirementVersion: linked?.row_version || null, requirementRevisionId: linked?.current_revision_id || null,
          deliveryState: 'not_issued', scopeApprovalState: 'not_approved' } };
    });
  }
  async respond(project: string, id: string, body: unknown, req: Request) {
    identifier(id); const input = parse(respondSchema, body);
    return this.commands.run(req, project, { ...writeAccess, operation: `clarification.${id}.respond`, action: 'clarification.response_recorded',
      targetType: 'clarification', input, authorize: async (tx, access) => { await this.scoped(tx, access, id); } }, async (tx, access) => {
      const row = await this.scoped(tx, access, id);
      if (row.row_version !== input.expectedVersion) fail('CLARIFICATION_VERSION_CONFLICT', 'Clarification changed. Refresh and retry its current version with a new command key.', 409);
      if (row.status !== 'open') fail('CLARIFICATION_NOT_OPEN', 'Only an open question can receive a new recorded response. Reopen an answered question first.', 409);
      const responseId = randomUUID(), version = row.row_version + 1;
      const response = (await tx.query(`INSERT INTO clarification_responses(id,organisation_id,project_id,clarification_id,record_version,
        response,respondent_attribution,source_attribution,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING recorded_at`,
        [responseId, access.organisationId, access.project.id, id, version, input.response, input.respondentAttribution, input.sourceAttribution, access.userId])).rows[0];
      await tx.query(`UPDATE clarifications SET response=$4,responded_by=$5,responded_at=$6,latest_response_id=$7,status='answered',
        row_version=row_version+1,updated_at=clock_timestamp() WHERE id=$1 AND organisation_id=$2 AND project_id=$3`,
        [id, access.organisationId, access.project.id, input.response, access.userId, response.recorded_at, responseId]);
      await this.history(tx, access, id, version, 'responded', input.reason, responseId);
      return { id, version, data: await this.detail(tx, access, await this.scoped(tx, access, id)),
        event: { reason: input.reason, responseId, previousVersion: row.row_version, verificationState: 'attributed_unverified', scopeApprovalState: 'not_approved' } };
    });
  }
  async reopen(project: string, id: string, body: unknown, req: Request) {
    identifier(id); const input = parse(reopenSchema, body);
    return this.commands.run(req, project, { ...writeAccess, operation: `clarification.${id}.reopen`, action: 'clarification.reopened',
      targetType: 'clarification', input, authorize: async (tx, access) => { await this.scoped(tx, access, id); } }, async (tx, access) => {
      const row = await this.scoped(tx, access, id);
      if (row.row_version !== input.expectedVersion) fail('CLARIFICATION_VERSION_CONFLICT', 'Clarification changed. Refresh and retry its current version with a new command key.', 409);
      if (row.status !== 'answered') fail('CLARIFICATION_NOT_ANSWERED', 'Only an answered question can be reopened.', 409);
      const version = row.row_version + 1;
      await tx.query(`UPDATE clarifications SET status='open',response=NULL,responded_by=NULL,responded_at=NULL,latest_response_id=NULL,
        row_version=row_version+1,updated_at=clock_timestamp() WHERE id=$1 AND organisation_id=$2 AND project_id=$3`, [id, access.organisationId, access.project.id]);
      await this.history(tx, access, id, version, 'reopened', input.reason, row.latest_response_id);
      return { id, version, data: await this.detail(tx, access, await this.scoped(tx, access, id)),
        event: { reason: input.reason, priorResponseId: row.latest_response_id, previousVersion: row.row_version, scopeApprovalState: 'not_approved' } };
    });
  }
}
