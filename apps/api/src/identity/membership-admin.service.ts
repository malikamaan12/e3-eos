import { HttpException } from '@nestjs/common';
import type { Request } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { CANONICAL_ROLES, normalizeRole } from '@e3-eos/domain';
import { DbService } from '../common/db.service.js';
import { readSessionToken } from '../auth/local-synthetic-auth.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRIVILEGED_ROLES = new Set(['super_admin', 'executive']);
export const ALLOWED_MEMBERSHIP_ROLES = CANONICAL_ROLES.filter((role) => !PRIVILEGED_ROLES.has(role));

type Change = 'role' | 'restore';
type ChangeBody = { role?: unknown; reason?: unknown; expectedVersion?: unknown };
type Member = { id: string; user_id: string; role: string; audience: string; is_revoked: boolean; is_super_admin: boolean; row_version: number };
export interface MembershipChangeResult {
  data: {
    id: string;
    organisationId: string;
    userId: string;
    role: string;
    audience: string;
    isRevoked: false;
    rowVersion: number;
    status: 'role_changed' | 'restored';
    changedBy: string;
    changedAt: string;
    auditEventId: string;
    eventId: string;
    requiresFreshSignIn: true;
    invalidatedSessionCount: number;
    revokedProjectGrantCount: number;
  };
}

function fail(code: string, detail: string, status: number): never {
  throw new HttpException({ code, title: detail, detail }, status);
}
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const roleAudience = (role: string) => role === 'client_user' ? 'client' : 'internal';

/** Changes existing ordinary memberships; never provisions users or privileged access. */
export class MembershipAdminService {
  constructor(private readonly db: DbService) {}

  changeRole(id: string, body: ChangeBody, req: Request): Promise<MembershipChangeResult> {
    return this.change('role', id, body, req);
  }

  restore(id: string, body: ChangeBody, req: Request): Promise<MembershipChangeResult> {
    return this.change('restore', id, body, req);
  }

  private async change(kind: Change, membershipId: string, body: ChangeBody, req: Request): Promise<MembershipChangeResult> {
    const organisationId = (req as any)?.organisationId;
    const sessionToken = readSessionToken(req);
    if (!sessionToken || !UUID.test(organisationId || '')) fail('UNAUTHENTICATED', 'A current scoped session is required.', 401);
    if (!UUID.test(membershipId || '')) fail('VALIDATION_ERROR', 'A valid membership ID is required.', 400);
    const key = req.headers?.['idempotency-key'];
    if (typeof key !== 'string' || !key.trim() || key.length > 200) {
      fail('MISSING_IDEMPOTENCY_KEY', 'A nonempty Idempotency-Key of at most 200 characters is required.', 400);
    }
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    const expectedVersion = body?.expectedVersion;
    if (!reason || reason.length > 2000 || typeof expectedVersion !== 'number' || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
      fail('VALIDATION_ERROR', 'A reason of 1–2000 characters and a positive integer expectedVersion are required.', 400);
    }
    const requestedRole = kind === 'role' && typeof body?.role === 'string' ? normalizeRole(body.role.trim()) : undefined;
    if (kind === 'role' && (!requestedRole || !CANONICAL_ROLES.includes(requestedRole as any))) {
      fail('VALIDATION_ERROR', 'A supported canonical membership role is required.', 400);
    }
    if (requestedRole && PRIVILEGED_ROLES.has(requestedRole)) {
      fail('MEMBERSHIP_PRIVILEGED_CHANGE_FORBIDDEN', 'Privileged role changes require separate recent-MFA governance.', 403);
    }
    const operation = `POST /memberships/${membershipId}/${kind}`;
    const requestHash = digest({ membershipId, reason, expectedVersion, ...(kind === 'role' ? { role: requestedRole } : {}) });
    const connect = () => this.db.getPool().connect();
    let tx: Awaited<ReturnType<typeof connect>> | undefined;
    try {
      tx = await connect();
      await tx.query('BEGIN');
      await tx.query("SELECT set_config('app.current_org_id', $1, true)", [organisationId]);
      const org = await tx.query('SELECT id FROM organisations WHERE id=$1 FOR UPDATE', [organisationId]);
      if (!org.rows.length) fail('UNAUTHENTICATED', 'The current organisation is not available.', 401);

      // Match revocation's order: organisation, ordered membership/user rows, session.
      // This also serializes role/restoration against grants in the same organisation.
      const members = await tx.query<Member>(`SELECT m.id,m.user_id,m.role,m.audience,m.is_revoked,m.row_version,u.is_super_admin
        FROM memberships m JOIN users u ON u.id=m.user_id
        WHERE m.organisation_id=$1 ORDER BY u.id,m.id FOR UPDATE OF m,u`, [organisationId]);
      const session = await tx.query('SELECT user_id FROM sessions WHERE token=$1 AND expires_at>clock_timestamp() FOR UPDATE', [sessionToken]);
      const actorId: string | undefined = session.rows[0]?.user_id;
      const actor = members.rows.find((member) => member.user_id === actorId);
      if (!actorId || !actor || actor.is_revoked) fail('UNAUTHENTICATED', 'The current session or organisation membership is no longer active.', 401);
      if (actor.audience !== 'internal' || (!actor.is_super_admin && normalizeRole(actor.role) !== 'super_admin')) {
        fail('MEMBERSHIP_CHANGE_FORBIDDEN', 'Current internal Super Admin authority is required.', 403);
      }

      const receipt = (await tx.query(`SELECT actor_id,operation,request_hash,response_body FROM idempotency_records
        WHERE organisation_id=$1 AND key=$2`, [organisationId, key])).rows[0];
      if (receipt) {
        if (receipt.actor_id !== actorId || receipt.operation !== operation || receipt.request_hash !== requestHash) {
          fail('IDEMPOTENCY_CONFLICT', 'This command key belongs to a different request.', 409);
        }
        await tx.query('COMMIT');
        return receipt.response_body as MembershipChangeResult;
      }

      const target = members.rows.find((member) => member.id === membershipId);
      if (!target) fail('MEMBERSHIP_NOT_FOUND', 'Membership not found.', 404);
      if (target.user_id === actorId) fail('SELF_MEMBERSHIP_CHANGE_FORBIDDEN', 'You cannot change or restore your own membership.', 403);
      const currentRole = normalizeRole(target.role);
      if (target.is_super_admin || PRIVILEGED_ROLES.has(currentRole)) {
        fail('MEMBERSHIP_PRIVILEGED_CHANGE_FORBIDDEN', 'Changes to privileged memberships require separate recent-MFA governance.', 403);
      }
      if (!ALLOWED_MEMBERSHIP_ROLES.includes(currentRole as any) || roleAudience(currentRole) !== target.audience) {
        fail('MEMBERSHIP_AUDIENCE_CHANGE_FORBIDDEN', 'This membership requires separate audience governance.', 403);
      }
      if (requestedRole && roleAudience(requestedRole) !== target.audience) {
        fail('MEMBERSHIP_AUDIENCE_CHANGE_FORBIDDEN', 'A role change cannot change the membership audience.', 403);
      }
      if (target.row_version !== expectedVersion) {
        fail('MEMBERSHIP_VERSION_CONFLICT', 'Membership changed. Refresh its current version before submitting a new command.', 409);
      }
      if (kind === 'role' && target.is_revoked) fail('MEMBERSHIP_REVOKED', 'Restore the revoked membership before changing its role.', 409);
      if (kind === 'role' && currentRole === requestedRole) fail('MEMBERSHIP_ROLE_UNCHANGED', 'The membership already has this role.', 409);
      if (kind === 'restore' && !target.is_revoked) fail('MEMBERSHIP_ALREADY_ACTIVE', 'Only a revoked membership can be restored.', 409);

      const nextRole = kind === 'role' ? requestedRole! : target.role;
      const changed = await tx.query(`UPDATE memberships SET role=$3,is_revoked=false,row_version=row_version+1,updated_at=clock_timestamp()
        WHERE id=$1 AND organisation_id=$2 AND row_version=$4 RETURNING row_version,updated_at`,
      [membershipId, organisationId, nextRole, expectedVersion]);
      if (changed.rowCount !== 1) fail('MEMBERSHIP_VERSION_CONFLICT', 'Membership changed while the command was executing.', 409);

      // Global opaque sessions carry no organisation boundary. End every target
      // session so stale clients must authenticate again after either change.
      const sessions = await tx.query('DELETE FROM sessions WHERE user_id=$1', [target.user_id]);
      let revokedProjectGrantCount = 0;
      if (kind === 'restore') {
        // Retain old grants as revoked history; restoration never reactivates them.
        // A missing grant store fails the whole transaction rather than restoring
        // membership while silently preserving stale project access.
        const grants = await tx.query(`UPDATE project_access_grants SET is_revoked=true,row_version=row_version+1,
          revoked_by=$3,revoked_at=clock_timestamp(),updated_at=clock_timestamp(),
          reason='Membership restored; fresh project access required.'
          WHERE organisation_id=$1 AND membership_id=$2 AND NOT is_revoked`, [organisationId, membershipId, actorId]);
        revokedProjectGrantCount = grants.rowCount || 0;
      }

      const auditEventId = randomUUID(), eventId = randomUUID();
      const rowVersion = changed.rows[0].row_version;
      const result: MembershipChangeResult = { data: { id: membershipId, organisationId, userId: target.user_id,
        role: nextRole, audience: target.audience, isRevoked: false, rowVersion,
        status: kind === 'role' ? 'role_changed' : 'restored', changedBy: actorId,
        changedAt: new Date(changed.rows[0].updated_at).toISOString(), auditEventId, eventId,
        requiresFreshSignIn: true, invalidatedSessionCount: sessions.rowCount || 0, revokedProjectGrantCount } };
      const event = { ...result.data, reason, previousRole: target.role, previousAudience: target.audience,
        previousVersion: target.row_version, previouslyRevoked: target.is_revoked };
      const previousAudit = (await tx.query('SELECT payload_digest FROM audit_events WHERE organisation_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1', [organisationId])).rows[0];
      await tx.query(`INSERT INTO audit_events(id,organisation_id,actor_id,action,target_type,target_id,target_version,payload_digest,previous_digest,created_at)
        VALUES($1,$2,$3,$4,'membership',$5,$6,$7,$8,clock_timestamp())`,
      [auditEventId, organisationId, actorId, kind === 'role' ? 'membership.role_changed' : 'membership.restored', membershipId, rowVersion, digest(event), previousAudit?.payload_digest || null]);
      await tx.query('INSERT INTO outbox(event_id,organisation_id,event_type,payload) VALUES($1,$2,$3,$4::jsonb)',
        [eventId, organisationId, kind === 'role' ? 'membership.role_changed.v1' : 'membership.restored.v1', JSON.stringify(event)]);
      await tx.query(`INSERT INTO idempotency_records(organisation_id,actor_id,key,operation,request_hash,status_code,response_body)
        VALUES($1,$2,$3,$4,$5,201,$6::jsonb)`, [organisationId, actorId, key, operation, requestHash, JSON.stringify(result)]);
      await tx.query('COMMIT');
      return result;
    } catch (error) {
      if (tx) await tx.query('ROLLBACK').catch(() => {});
      if (error instanceof HttpException) throw error;
      return fail('MEMBERSHIP_CHANGE_UNAVAILABLE', 'Membership change could not be committed. Retry using the same command key.', 503);
    } finally { tx?.release(); }
  }
}
