import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { DbService } from './db.service.js';
import { hasRolePermission, normalizeRole } from '@e3-eos/domain';
import { localSyntheticAuthEnabled, readSessionToken } from '../auth/local-synthetic-auth.js';
import { assertRequestOrigin } from '../auth/request-origin.js';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ALLOWED_AUDIENCES_KEY = 'allowedAudiences';
export const AllowedAudiences = (...audiences: Array<'internal' | 'client' | 'supplier'>) =>
  SetMetadata(ALLOWED_AUDIENCES_KEY, audiences);

export const REQUIRE_INTERNAL_ONLY = () => AllowedAudiences('internal');

export const REQUIRED_ROLES_KEY = 'requiredRoles';
export const RequireRoles = (...roles: string[]) =>
  SetMetadata(REQUIRED_ROLES_KEY, roles);

export const REQUIRED_PERMISSIONS_KEY = 'requiredPermissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);

@Injectable()
export class TenantIsolationGuard implements CanActivate {
  private dbService?: DbService;

  constructor(
    private reflector?: Reflector,
    @Optional() dbService?: DbService
  ) {
    this.dbService = dbService || new DbService();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if endpoint is public
    const isPublic = this.reflector?.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    assertRequestOrigin(request);
    const allowedAudiences = this.reflector?.getAllAndOverride<string[]>(
      ALLOWED_AUDIENCES_KEY,
      [context.getHandler(), context.getClass()]
    );

    const sessionToken = readSessionToken(request);
    const hasCredential = request.headers?.authorization !== undefined
      || request.cookies?.eos_session !== undefined
      || /(?:^|;)\s*eos_session=/.test(request.headers?.cookie || '');
    const fixtureIdentity = localSyntheticAuthEnabled() && !hasCredential;
    let isSuperAdmin = false;
    let callerUserId: string | undefined;
    let callerOrgId: string | undefined;
    let callerAudience: 'internal' | 'client' | 'supplier' | undefined;
    let callerRole: string | undefined;

    if (fixtureIdentity) {
      isSuperAdmin = (request as any).isSuperAdmin === true || (request as any).sessionUser?.isSuperAdmin === true;
      callerUserId = (request as any).userId || (request as any).sessionUser?.userId || (request.headers?.['x-user-id'] as string);
      callerOrgId = (request as any).organisationId || (request as any).sessionUser?.organisationId || (request.headers?.['x-organisation-id'] as string) || (request.headers?.['x-organization-id'] as string);
      callerAudience = (request as any).audience || (request as any).sessionUser?.audience || request.headers?.['x-audience'] || request.headers?.['x-user-audience'] || 'internal';
      callerRole = (request as any).role || (request as any).sessionUser?.role || (request.headers?.['x-user-roles'] as string);
    }

    if (sessionToken && this.dbService) {
      try {
        const pool = this.dbService.getPool();
        const res = await pool.query(`
          SELECT s.user_id, u.email, u.name, u.is_super_admin,
                 m.role, m.audience, m.organisation_id
          FROM sessions s
          JOIN users u ON u.id = s.user_id
          JOIN memberships m ON m.user_id = u.id AND m.is_revoked = false
          WHERE s.token = $1 AND s.expires_at > NOW()
            AND ($2::text IS NULL OR m.organisation_id::text = $2)
          ORDER BY m.created_at, m.id
          LIMIT 1;
        `, [sessionToken, request.headers?.['x-organisation-id'] || request.headers?.['x-organization-id'] || null]);

        if (res.rows.length > 0) {
          const row = res.rows[0];
          callerUserId = row.user_id;
          callerOrgId = row.organisation_id;
          callerAudience = row.audience;
          callerRole = row.role;
          isSuperAdmin = Boolean(row.is_super_admin);
        } else {
          // Explicit token provided but invalid or expired
          throw new HttpException(
            {
              code: 'UNAUTHENTICATED',
              title: 'Session invalid or expired',
              detail: 'The provided authentication session is not active.',
            },
            HttpStatus.UNAUTHORIZED
          );
        }
      } catch (e: any) {
        if (e instanceof HttpException) throw e;
        throw new HttpException(
          { code: 'AUTHENTICATION_UNAVAILABLE', title: 'Authentication unavailable', detail: 'The active session could not be verified. Please retry.' },
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }
    }

    if (!callerUserId || !callerOrgId || !callerRole || !callerAudience) {
      throw new HttpException(
        {
          code: 'UNAUTHENTICATED',
          title: 'Authentication session required',
          detail: 'An authenticated session is required to access protected EOS endpoints.',
        },
        HttpStatus.UNAUTHORIZED
      );
    }

    (request as any).organisationId = callerOrgId;
    (request as any).audience = callerAudience;
    (request as any).actorId = callerUserId;
    (request as any).userId = callerUserId;
    (request as any).role = callerRole;
    (request as any).userRole = callerRole;
    (request as any).isSuperAdmin = isSuperAdmin;
    (request as any).sessionUser = { userId: callerUserId, organisationId: callerOrgId, audience: callerAudience, role: callerRole, isSuperAdmin };
    // Legacy handlers still read identity headers. Replace claims with verified values
    // so passing this guard cannot leave a second, attacker-controlled authority channel.
    request.headers['x-user-id'] = callerUserId;
    request.headers['x-user-role'] = callerRole;
    request.headers['x-user-roles'] = callerRole;
    request.headers['x-user-audience'] = callerAudience;
    request.headers['x-organisation-id'] = callerOrgId;
    request.headers['x-organization-id'] = callerOrgId;
    request.headers['x-is-super-admin'] = String(isSuperAdmin);

    // Check audience restrictions (AT-002: Client calls internal costing API)
    if (allowedAudiences && allowedAudiences.length > 0) {
      if (!allowedAudiences.includes(callerAudience)) {
        throw new HttpException(
          {
            code: 'FORBIDDEN_AUDIENCE',
            title: 'Forbidden audience access',
            detail: 'Client and external accounts are not permitted to access internal operational endpoints.',
          },
          HttpStatus.FORBIDDEN
        );
      }
    }

    // Role & Permission RBAC Checks
    const requiredRoles = this.reflector?.getAllAndOverride<string[]>(
      REQUIRED_ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    const normCallerRole = normalizeRole(callerRole || '');

    if (requiredRoles && requiredRoles.length > 0) {
      if (!isSuperAdmin && normCallerRole !== 'super_admin') {
        if (!normCallerRole || !requiredRoles.some((r) => normalizeRole(r) === normCallerRole)) {
          throw new HttpException(
            {
              code: 'FORBIDDEN_ROLE',
              title: 'Insufficient role privileges',
              detail: `This endpoint requires one of the following roles: ${requiredRoles.join(', ')}. Your role is '${callerRole || 'unassigned'}'.`,
            },
            HttpStatus.FORBIDDEN
          );
        }
      }
    }

    const requiredPermissions = this.reflector?.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (requiredPermissions && requiredPermissions.length > 0) {
      if (!isSuperAdmin && callerRole !== 'super_admin') {
        const hasAll = requiredPermissions.every((perm) =>
          hasRolePermission(callerRole || '', perm, isSuperAdmin)
        );
        if (!hasAll) {
          throw new HttpException(
            {
              code: 'FORBIDDEN_PERMISSION',
              title: 'Insufficient permission privileges',
              detail: `This endpoint requires the following permissions: ${requiredPermissions.join(', ')}.`,
            },
            HttpStatus.FORBIDDEN
          );
        }
      }
    }

    return true;
  }
}
