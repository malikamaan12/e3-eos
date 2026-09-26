import { HttpException } from '@nestjs/common';
import type { Request } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { DbService } from '../common/db.service.js';
import { ProjectAccessService, type ProjectAccessContext, type ProjectAccessTransaction, type ProjectAccessOptions } from './project-access.service.js';

function stable(value: any): any {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => [key, stable(value[key])]));
  }
  return value;
}
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
export interface ProjectCommandOptions extends ProjectAccessOptions {
  operation: string; action: string; targetType: string; input: unknown;
  /** Current record/assignment/classification checks also apply to retries. */
  authorize?: (tx: ProjectAccessTransaction, access: ProjectAccessContext) => Promise<void>;
}
export interface ProjectCommandMutation {
  id: string; data: Record<string, any>; event: Record<string, any>; version?: number;
}

/** Domain change, audit intent and retry receipt are committed together. */
export class DurableProjectCommand {
  constructor(private readonly db: DbService) {}

  async run(req: Request, reference: string, options: ProjectCommandOptions,
    mutate: (tx: ProjectAccessTransaction, access: ProjectAccessContext) => Promise<ProjectCommandMutation>) {
    const key = req.headers?.['idempotency-key'];
    if (typeof key !== 'string' || !key.trim() || key.length > 200) {
      throw new HttpException({ code: 'MISSING_IDEMPOTENCY_KEY', detail: 'A stable Idempotency-Key of 1–200 characters is required.' }, 400);
    }
    return new ProjectAccessService(this.db).withAccess(req, reference, options, async (tx, access) => {
      await options.authorize?.(tx, access);
      const requestHash = hash({ projectId: access.project.id, input: options.input });
      const prior = (await tx.query('SELECT actor_id,operation,request_hash,response_body FROM idempotency_records WHERE organisation_id=$1 AND key=$2', [access.organisationId, key])).rows[0];
      if (prior) {
        if (prior.actor_id !== access.userId || prior.operation !== options.operation || prior.request_hash !== requestHash) {
          throw new HttpException({ code: 'IDEMPOTENCY_CONFLICT', detail: 'This command key belongs to a different request.' }, 409);
        }
        return prior.response_body;
      }
      const result = await mutate(tx, access);
      const auditEventId = randomUUID(), eventId = randomUUID();
      const event = { ...result.event, projectId: access.project.id, targetId: result.id, targetVersion: result.version || 1 };
      const previous = (await tx.query('SELECT payload_digest FROM audit_events WHERE organisation_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1', [access.organisationId])).rows[0];
      await tx.query(`INSERT INTO audit_events(id,organisation_id,actor_id,action,target_type,target_id,target_version,payload_digest,previous_digest,created_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,clock_timestamp())`,
        [auditEventId, access.organisationId, access.userId, options.action, options.targetType, result.id, result.version || 1, hash(event), previous?.payload_digest || null]);
      await tx.query('INSERT INTO outbox(event_id,organisation_id,event_type,payload) VALUES($1,$2,$3,$4::jsonb)',
        [eventId, access.organisationId, `${options.action}.v1`, JSON.stringify({ ...event, auditEventId })]);
      const response = { data: { ...result.data, id: result.id, auditEventId, eventId }, meta: { requestId: auditEventId, dataAsOf: new Date().toISOString() } };
      await tx.query(`INSERT INTO idempotency_records(organisation_id,actor_id,key,operation,request_hash,status_code,response_body)
        VALUES($1,$2,$3,$4,$5,201,$6::jsonb)`, [access.organisationId, access.userId, key, options.operation, requestHash, JSON.stringify(response)]);
      return response;
    });
  }
}
