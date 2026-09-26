import { HttpException } from '@nestjs/common';
import type { Request } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { hasRolePermission, normalizeRole } from '@e3-eos/domain';
import { DbService } from '../common/db.service.js';
import { ProjectAccessService, type ProjectAccessContext, type ProjectAccessTransaction } from '../projects/project-access.service.js';

export const FIELD_OBSERVATION_PERMISSIONS = ['projects.manage', 'operations.manage', 'field.inspect'];
const operation = 'field.observation.capture';
const fail = (code: string, detail: string, status = 400): never => { throw new HttpException({ code, detail }, status); };
const plainText = z.string().trim().min(1).max(2000).refine(value => !value.includes('\0'));
const observationSchema = z.object({
  clientOperationId: z.string().uuid(), deviceId: z.string().uuid(),
  capturedAt: z.string().datetime({ offset: true }).refine(value => {
    const calendarDay = new Date(`${value.slice(0, 10)}T00:00:00Z`);
    return Number.isFinite(Date.parse(value)) && Number.isFinite(calendarDay.getTime())
      && calendarDay.toISOString().slice(0, 10) === value.slice(0, 10);
  }),
  taskId: z.string().uuid().optional(), baseVersion: z.number().int().positive().max(2147483647).optional(),
  note: plainText, reason: plainText,
}).strict().refine(value => value.baseVersion === undefined || Boolean(value.taskId));

export function validateFieldObservation(body: unknown) {
  const parsed = observationSchema.safeParse(body);
  if (!parsed.success) fail('FIELD_OBSERVATION_SCHEMA_REJECTED', 'Provide operation/device UUIDs, a valid ISO timestamp with timezone, a short note and reason. A baseVersion requires a taskId. Files, approvals, incidents and other action fields are not accepted.');
  const input = parsed.data!;
  return { clientOperationId: input.clientOperationId.toLowerCase(), deviceId: input.deviceId.toLowerCase(),
    capturedAt: new Date(input.capturedAt).toISOString(), taskId: input.taskId?.toLowerCase() || null,
    baseVersion: input.baseVersion ?? null, note: input.note, reason: input.reason };
}
type ObservationInput = ReturnType<typeof validateFieldObservation>;
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function fieldObservationReceipt(row: any) {
  return { id: row.id, organisationId: row.organisation_id, projectId: row.project_id, actorId: row.actor_id,
    clientOperationId: row.client_operation_id, deviceId: row.device_id, deviceIdClaimed: true,
    capturedAt: new Date(row.captured_at).toISOString(), receivedAt: new Date(row.received_at).toISOString(), clientTimestampClaimed: true,
    taskId: row.task_id, baseVersion: row.base_version, currentTaskVersion: row.current_task_version,
    status: row.status as 'accepted' | 'accepted_as_observation_with_conflict', note: row.note, reason: row.reason,
    payloadHash: row.payload_hash, auditEventId: row.audit_event_id, eventId: row.event_id,
    authorityEffect: 'observation_only' as const, contractVersion: 'field-observation.v1' as const };
}

/** Client operation deduplication is independent of the transport retry key. */
export class FieldObservationsService {
  private readonly access: ProjectAccessService;
  constructor(db: DbService) { this.access = new ProjectAccessService(db); }
  private options(level: 'viewer' | 'editor') { return { level, audiences: ['internal'] as Array<'internal'>, permissions: FIELD_OBSERVATION_PERMISSIONS }; }
  private fieldOnly(access: ProjectAccessContext) { return normalizeRole(access.role) === 'field_supervisor'; }
  private canCapture(access: ProjectAccessContext) { return access.accessLevel === 'editor' && FIELD_OBSERVATION_PERMISSIONS.some(permission => hasRolePermission(access.role, permission, access.isSuperAdmin)); }
  private key(req: Request): string {
    const key = req.headers?.['idempotency-key'];
    if (typeof key !== 'string' || !key.trim() || key.length > 200) fail('MISSING_IDEMPOTENCY_KEY', 'A stable Idempotency-Key of 1–200 characters is required.');
    return key as string;
  }
  private async task(tx: ProjectAccessTransaction, access: ProjectAccessContext, taskId: string | null) {
    if (!taskId) return null;
    const row = (await tx.query(`SELECT id,row_version,assignee_id FROM task_instances
      WHERE id=$1 AND organisation_id=$2 AND project_id=$3 FOR UPDATE`, [taskId, access.organisationId, access.project.id])).rows[0];
    if (!row || (this.fieldOnly(access) && row.assignee_id !== access.userId)) fail('FIELD_TASK_UNAVAILABLE', 'The linked task is unavailable in this project and current assignment scope.', 404);
    return row;
  }
  private async saveTransportReceipt(tx: ProjectAccessTransaction, access: ProjectAccessContext, key: string, payloadHash: string, response: unknown) {
    await tx.query(`INSERT INTO idempotency_records(organisation_id,actor_id,key,operation,request_hash,status_code,response_body)
      VALUES($1,$2,$3,$4,$5,201,$6::jsonb)`, [access.organisationId, access.userId, key, operation, payloadHash, JSON.stringify(response)]);
  }
  async create(projectReference: string, body: unknown, req: Request) {
    const input = validateFieldObservation(body), key = this.key(req);
    return this.access.withAccess(req, projectReference, this.options('editor'), async (tx, access) => {
      // Current membership, action permission and grant have already been locked.
      // Assignment must also still be valid before returning any earlier receipt.
      const task = await this.task(tx, access, input.taskId);
      const payloadHash = hash({ projectId: access.project.id, actorId: access.userId, ...input });
      const transport = (await tx.query('SELECT actor_id,operation,request_hash,response_body FROM idempotency_records WHERE organisation_id=$1 AND key=$2', [access.organisationId, key])).rows[0];
      if (transport && (transport.actor_id !== access.userId || transport.operation !== operation || transport.request_hash !== payloadHash)) {
        fail('IDEMPOTENCY_CONFLICT', 'This HTTP command key belongs to a different request.', 409);
      }
      const prior = (await tx.query('SELECT * FROM field_observations WHERE organisation_id=$1 AND actor_id=$2 AND client_operation_id=$3', [access.organisationId, access.userId, input.clientOperationId])).rows[0];
      if (prior) {
        if (prior.project_id !== access.project.id || prior.payload_hash !== payloadHash) fail('FIELD_OPERATION_CONFLICT', 'This client operation already identifies a different project or payload. Preserve the original receipt; use a new operation ID for a new observation.', 409);
        const data = fieldObservationReceipt(prior);
        const response = { data, meta: { requestId: data.auditEventId, dataAsOf: data.receivedAt } };
        if (!transport) await this.saveTransportReceipt(tx, access, key, payloadHash, response);
        return response;
      }
      if (transport) fail('FIELD_RECEIPT_INCONSISTENT', 'The earlier transport receipt has no corresponding observation. No new record was created; contact support with the operation ID.', 409);
      return this.capture(tx, access, input, key, payloadHash, task?.row_version ?? null);
    });
  }
  private async capture(tx: ProjectAccessTransaction, access: ProjectAccessContext, input: ObservationInput, key: string, payloadHash: string, currentTaskVersion: number | null) {
    const id = randomUUID(), auditEventId = randomUUID(), eventId = randomUUID();
    const receivedAt = new Date((await tx.query('SELECT clock_timestamp() AS received_at')).rows[0].received_at).toISOString();
    const status = input.baseVersion !== null && input.baseVersion !== currentTaskVersion ? 'accepted_as_observation_with_conflict' : 'accepted';
    // Audit/outbox retain provenance and the payload digest, not free-text notes.
    const event = { observationId: id, projectId: access.project.id, clientOperationId: input.clientOperationId,
      taskId: input.taskId, baseVersion: input.baseVersion, currentTaskVersion, status, payloadHash,
      capturedAt: input.capturedAt, receivedAt, clientTimestampClaimed: true, authorityEffect: 'observation_only' };
    const previous = (await tx.query('SELECT payload_digest FROM audit_events WHERE organisation_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1', [access.organisationId])).rows[0];
    await tx.query(`INSERT INTO audit_events(id,organisation_id,project_id,actor_id,action,target_type,target_id,target_version,payload_digest,previous_digest,created_at)
      VALUES($1,$2,$3,$4,'field.observation.recorded','field_observation',$5,1,$6,$7,$8)`, [auditEventId, access.organisationId, access.project.id, access.userId, id, hash(event), previous?.payload_digest || null, receivedAt]);
    await tx.query(`INSERT INTO outbox(event_id,organisation_id,project_id,event_type,payload)
      VALUES($1,$2,$3,'field.observation.recorded.v1',$4::jsonb)`, [eventId, access.organisationId, access.project.id, JSON.stringify({ ...event, auditEventId })]);
    const row = (await tx.query(`INSERT INTO field_observations(id,organisation_id,project_id,actor_id,client_operation_id,device_id,captured_at,received_at,
      task_id,base_version,current_task_version,note,reason,payload_hash,status,audit_event_id,event_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`, [id, access.organisationId, access.project.id, access.userId,
      input.clientOperationId, input.deviceId, input.capturedAt, receivedAt, input.taskId, input.baseVersion, currentTaskVersion, input.note, input.reason, payloadHash, status, auditEventId, eventId])).rows[0];
    const response = { data: fieldObservationReceipt(row), meta: { requestId: auditEventId, dataAsOf: receivedAt } };
    await this.saveTransportReceipt(tx, access, key, payloadHash, response);
    return response;
  }
  async list(projectReference: string, req: Request) {
    return this.access.withAccess(req, projectReference, this.options('viewer'), async (tx, access) => {
      const rows = (await tx.query(`SELECT o.* FROM field_observations o
        WHERE o.organisation_id=$1 AND o.project_id=$2 AND (NOT $3::boolean OR (o.actor_id=$4 AND
          (o.task_id IS NULL OR EXISTS (SELECT 1 FROM task_instances t WHERE t.id=o.task_id AND t.organisation_id=o.organisation_id AND t.project_id=o.project_id AND t.assignee_id=$4))))
        ORDER BY o.received_at DESC,o.id LIMIT 201`, [access.organisationId, access.project.id, this.fieldOnly(access), access.userId])).rows;
      return { data: rows.slice(0, 200).map(fieldObservationReceipt), meta: { limit: 200, truncated: rows.length > 200,
        capabilities: { canCapture: this.canCapture(access) },
        disclosure: 'Low-sensitivity text observations only. Client capture time and device identity are claims. Receipt does not complete a task, approve evidence, certify safety or authorise release. No files are uploaded.' } };
    });
  }
  async get(projectReference: string, observationId: string, req: Request) {
    if (!z.string().uuid().safeParse(observationId).success) fail('FIELD_OBSERVATION_SCHEMA_REJECTED', 'A valid observation UUID is required.');
    return this.access.withAccess(req, projectReference, this.options('viewer'), async (tx, access) => {
      const row = (await tx.query('SELECT * FROM field_observations WHERE id=$1 AND organisation_id=$2 AND project_id=$3', [observationId, access.organisationId, access.project.id])).rows[0];
      if (!row || (this.fieldOnly(access) && row.actor_id !== access.userId)) fail('FIELD_OBSERVATION_NOT_FOUND', 'Observation is not available in the current project and actor scope.', 404);
      if (this.fieldOnly(access)) await this.task(tx, access, row.task_id);
      return { data: fieldObservationReceipt(row) };
    });
  }
}
