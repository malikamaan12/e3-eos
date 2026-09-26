import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  HttpException,
  HttpStatus,
  UseGuards,
  UseFilters,
  Optional,
  Header,
} from '@nestjs/common';
import { Request } from 'express';
import { createHash, randomUUID } from 'crypto';
import { CANONICAL_ROLE_DEFINITIONS, CanonicalRole, normalizeRole } from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { AllowedAudiences, RequireRoles, TenantIsolationGuard } from '../common/tenant.guard.js';
import { DbService } from '../common/db.service.js';
import { readSessionToken } from '../auth/local-synthetic-auth.js';
import { InvitationService } from './invitation.service.js';

interface MembershipRevocationResult {
  data: {
    id: string;
    organisationId: string;
    userId: string;
    status: 'revoked';
    isRevoked: true;
    revokedBy: string;
    revokedAt: string;
    auditEventId: string;
    eventId: string;
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function commandError(code: string, detail: string, status: HttpStatus): HttpException {
  return new HttpException({ code, title: detail, detail }, status);
}

@Controller()
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class IdentityController {
  private dbService: DbService;

  constructor(@Optional() dbService?: DbService) {
    this.dbService = dbService || new DbService();
  }

  @Get('me')
  @Header('Cache-Control', 'no-store')
  getMe(@Req() req: Request) {
    const userId = (req as any).actorId || (req as any).userId;
    const orgId = (req as any).organisationId;
    const audience = (req as any).audience;
    const role = normalizeRole((req as any).role || '');
    if (!userId || !orgId || !audience || !role) {
      throw commandError('UNAUTHENTICATED', 'A verified session identity is required.', HttpStatus.UNAUTHORIZED);
    }
    const definition = CANONICAL_ROLE_DEFINITIONS[role as CanonicalRole];

    return {
      data: {
        userId,
        organisationId: orgId,
        audience,
        roles: [role],
        permissions: (req as any).isSuperAdmin === true ? ['*'] : [...(definition?.permissions || [])],
      },
    };
  }

  @Get('my-work')
  getMyWork(@Req() req: Request) {
    const userId = (req as any).actorId || 'user-default';
    return {
      data: {
        userId,
        assignedTasks: [],
        pendingApprovals: [],
        notifications: [],
      },
    };
  }

  @Post('invitations')
  @Header('Cache-Control', 'no-store')
  @RequireRoles('super_admin')
  @AllowedAudiences('internal')
  createInvitation(@Body() body: unknown, @Req() req: Request) {
    return new InvitationService(this.dbService).create(body, req);
  }

  @Get('invitations')
  @Header('Cache-Control', 'no-store')
  @RequireRoles('super_admin')
  @AllowedAudiences('internal')
  listInvitations(@Req() req: Request) {
    return new InvitationService(this.dbService).list(req);
  }

  @Post('invitations/:id/cancel')
  @Header('Cache-Control', 'no-store')
  @RequireRoles('super_admin')
  @AllowedAudiences('internal')
  cancelInvitation(@Param('id') id: string, @Body() body: unknown, @Req() req: Request) {
    return new InvitationService(this.dbService).cancel(id, body, req);
  }

  @Post('memberships/:id/revoke')
  async revokeMembership(
    @Param('id') membershipId: string,
    @Req() req: Request,
    @Body() body: { reason?: unknown }
  ): Promise<MembershipRevocationResult> {
    const organisationId = (req as any).organisationId;
    const actorId = (req as any).userId || (req as any).actorId;
    const sessionToken = readSessionToken(req);
    if (!sessionToken || !UUID.test(organisationId || '') || !UUID.test(actorId || '')) {
      throw commandError('UNAUTHENTICATED', 'A current verified session is required.', HttpStatus.UNAUTHORIZED);
    }
    if (!UUID.test(membershipId)) {
      throw commandError('VALIDATION_ERROR', 'A valid membership ID is required.', HttpStatus.BAD_REQUEST);
    }
    const key = req.headers['idempotency-key'];
    if (typeof key !== 'string' || !key.trim() || key.length > 200) {
      throw commandError('MISSING_IDEMPOTENCY_KEY', 'A nonempty Idempotency-Key of at most 200 characters is required.', HttpStatus.BAD_REQUEST);
    }
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    if (!reason || reason.length > 2000) {
      throw commandError('VALIDATION_ERROR', 'A revocation reason of 1–2000 characters is required.', HttpStatus.BAD_REQUEST);
    }
    const operation = `POST /memberships/${membershipId}/revoke`;
    const requestHash = createHash('sha256').update(JSON.stringify({ membershipId, reason })).digest('hex');
    const connect = () => this.dbService.getPool().connect();
    let client: Awaited<ReturnType<typeof connect>> | undefined;
    try {
      client = await connect();
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.current_org_id', $1, true)", [organisationId]);

      // A common organisation lock serializes revocation commands across API processes.
      // Membership/user locks also coordinate with direct role/status SQL updates.
      const organisation = await client.query('SELECT id FROM organisations WHERE id = $1 FOR UPDATE', [organisationId]);
      if (!organisation.rows.length) {
        throw commandError('UNAUTHENTICATED', 'The active membership could not be verified.', HttpStatus.UNAUTHORIZED);
      }
      const members = await client.query(`
        SELECT m.id, m.user_id, m.role, m.audience, m.is_revoked, u.is_super_admin
        FROM memberships m JOIN users u ON u.id = m.user_id
        WHERE m.organisation_id = $1 ORDER BY u.id, m.id
        FOR UPDATE OF m, u
      `, [organisationId]);
      const session = await client.query(`
        SELECT user_id FROM sessions WHERE token = $1 AND user_id = $2 AND expires_at > clock_timestamp()
        FOR UPDATE
      `, [sessionToken, actorId]);
      const actor = members.rows.find((member) => member.user_id === actorId);
      const isAdministrator = (member: any) => member && !member.is_revoked && member.audience === 'internal'
        && (member.is_super_admin === true || normalizeRole(member.role) === 'super_admin');
      if (!session.rows.length || !actor || actor.is_revoked) {
        throw commandError('UNAUTHENTICATED', 'The session or organisation membership is no longer active.', HttpStatus.UNAUTHORIZED);
      }
      if (!isAdministrator(actor)) {
        throw commandError('MEMBERSHIP_REVOKE_FORBIDDEN', 'Current internal Super Admin authority is required.', HttpStatus.FORBIDDEN);
      }

      const receipt = await client.query(`
        SELECT actor_id, operation, request_hash, response_body FROM idempotency_records
        WHERE organisation_id = $1 AND key = $2
      `, [organisationId, key]);
      if (receipt.rows.length) {
        const previous = receipt.rows[0];
        if (previous.actor_id !== actorId || previous.operation !== operation || previous.request_hash !== requestHash) {
          throw commandError('IDEMPOTENCY_CONFLICT', 'This idempotency key belongs to a different command.', HttpStatus.CONFLICT);
        }
        await client.query('COMMIT');
        return previous.response_body as MembershipRevocationResult;
      }

      const target = members.rows.find((member) => member.id === membershipId);
      if (!target) {
        throw commandError('MEMBERSHIP_NOT_FOUND', 'Membership not found.', HttpStatus.NOT_FOUND);
      }
      if (target.is_revoked) {
        throw commandError('MEMBERSHIP_ALREADY_REVOKED', 'Membership is already revoked. Replay the original command key to retrieve its receipt.', HttpStatus.CONFLICT);
      }
      if (isAdministrator(target) && members.rows.filter(isAdministrator).length <= 1) {
        throw commandError('LAST_ADMIN_REVOCATION_PROHIBITED', 'The last active internal administrator cannot be revoked.', HttpStatus.CONFLICT);
      }
      if (target.user_id === actorId) {
        throw commandError('SELF_REVOCATION_PROHIBITED', 'You cannot revoke your own membership.', HttpStatus.CONFLICT);
      }

      const updated = await client.query(`
        UPDATE memberships SET is_revoked = true, row_version = row_version + 1, updated_at = clock_timestamp()
        WHERE id = $1 AND organisation_id = $2 AND is_revoked = false
        RETURNING updated_at
      `, [membershipId, organisationId]);
      if (updated.rowCount !== 1) {
        throw commandError('MEMBERSHIP_CHANGED', 'Membership changed while the command was executing.', HttpStatus.CONFLICT);
      }
      const auditEventId = randomUUID();
      const eventId = randomUUID();
      const revokedAt = new Date(updated.rows[0].updated_at).toISOString();
      const result: MembershipRevocationResult = { data: { id: membershipId, organisationId, userId: target.user_id,
        status: 'revoked', isRevoked: true, revokedBy: actorId, revokedAt, auditEventId, eventId } };
      const event = { ...result.data, reason, previousRole: target.role, previousAudience: target.audience };
      const payloadDigest = createHash('sha256').update(JSON.stringify(event)).digest('hex');
      const previousAudit = await client.query(`
        SELECT payload_digest FROM audit_events WHERE organisation_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1
      `, [organisationId]);
      // Append a new audit event; retries return the receipt rather than rewriting history.
      await client.query(`
        INSERT INTO audit_events (id, organisation_id, actor_id, action, target_type, target_id, payload_digest, previous_digest)
        VALUES ($1, $2, $3, 'membership.revoke', 'membership', $4, $5, $6)
      `, [auditEventId, organisationId, actorId, membershipId, payloadDigest, previousAudit.rows[0]?.payload_digest || null]);
      await client.query(`
        INSERT INTO outbox (event_id, organisation_id, event_type, payload)
        VALUES ($1, $2, 'membership.revoked.v1', $3::jsonb)
      `, [eventId, organisationId, JSON.stringify(event)]);
      await client.query(`
        INSERT INTO idempotency_records (key, organisation_id, actor_id, operation, request_hash, status_code, response_body)
        VALUES ($1, $2, $3, $4, $5, 201, $6::jsonb)
      `, [key, organisationId, actorId, operation, requestHash, JSON.stringify(result)]);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      if (error instanceof HttpException) throw error;
      throw commandError('MEMBERSHIP_REVOCATION_UNAVAILABLE', 'Membership revocation could not be committed. Retry with the same idempotency key.', HttpStatus.SERVICE_UNAVAILABLE);
    } finally {
      client?.release();
    }
  }

  @Get('audit-events')
  @Header('Cache-Control', 'no-store')
  @RequireRoles('super_admin', 'executive')
  @AllowedAudiences('internal')
  async getAuditEvents(@Req() req: Request) {
    const orgId = (req as any).organisationId;
    const token = readSessionToken(req);
    if (!token || !UUID.test(orgId || '')) {
      throw commandError('UNAUTHENTICATED', 'A current organisation session is required.', HttpStatus.UNAUTHORIZED);
    }
    const connect = () => this.dbService.getPool().connect();
    let client: Awaited<ReturnType<typeof connect>> | undefined;
    try {
      client = await connect();
      await client.query('BEGIN READ ONLY');
      await client.query("SELECT set_config('app.current_org_id', $1, true)", [orgId]);
      const result = await client.query(`
        SELECT m.role, m.audience, u.is_super_admin
        FROM sessions s JOIN users u ON u.id = s.user_id
        JOIN memberships m ON m.user_id = u.id AND NOT m.is_revoked
        WHERE s.token=$1 AND s.expires_at>clock_timestamp() AND m.organisation_id=$2
      `, [token, orgId]);
      const actor = result.rows[0];
      if (!actor) {
        throw commandError('UNAUTHENTICATED', 'The current session or membership is not active.', HttpStatus.UNAUTHORIZED);
      }
      if (actor.audience !== 'internal' || (!actor.is_super_admin && !['super_admin', 'executive'].includes(normalizeRole(actor.role)))) {
        throw commandError('AUDIT_READ_FORBIDDEN', 'Current internal administrative authority is required.', HttpStatus.FORBIDDEN);
      }
      const events = await client.query(`
        SELECT id, organisation_id, project_id, actor_id, action, target_type, target_id,
               target_version, payload_digest, previous_digest, created_at
        FROM audit_events WHERE organisation_id=$1 ORDER BY created_at DESC, id DESC LIMIT 100
      `, [orgId]);
      await client.query('COMMIT');
      return { data: events.rows.map((event) => ({ id: event.id, organisationId: event.organisation_id,
        projectId: event.project_id, actorId: event.actor_id, action: event.action, targetType: event.target_type,
        targetId: event.target_id, targetVersion: event.target_version, payloadDigest: event.payload_digest,
        previousDigest: event.previous_digest, createdAt: event.created_at })) };
    } catch (error) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      if (error instanceof HttpException) throw error;
      throw commandError('AUDIT_READ_UNAVAILABLE', 'Audit history could not be read. Please retry later.', HttpStatus.SERVICE_UNAVAILABLE);
    } finally {
      client?.release();
    }
  }

  @Get('jobs/:id')
  getJob(@Param('id') jobId: string) {
    return {
      data: {
        id: jobId,
        status: 'completed',
        progress: 100,
        result: { summary: 'Background job completed successfully' },
      },
    };
  }
}
