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

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ALLOWED_AUDIENCES_KEY = 'allowedAudiences';
export const AllowedAudiences = (...audiences: Array<'internal' | 'client' | 'supplier'>) =>
  SetMetadata(ALLOWED_AUDIENCES_KEY, audiences);

export const REQUIRE_INTERNAL_ONLY = () => AllowedAudiences('internal');

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
    const allowedAudiences = this.reflector?.getAllAndOverride<string[]>(
      ALLOWED_AUDIENCES_KEY,
      [context.getHandler(), context.getClass()]
    );

    // Extract bearer token or cookie session first to resolve identity from database
    const authHeader = request.headers?.authorization;
    const cookieToken = (request as any).cookies?.['eos_session'];
    const sessionToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : (authHeader?.trim() || cookieToken);

    let callerUserId = (request as any).userId || (request as any).sessionUser?.userId || (request.headers?.['x-user-id'] as string);
    let callerOrgId = (request as any).organisationId || (request as any).sessionUser?.organisationId || (request.headers?.['x-organisation-id'] as string) || (request.headers?.['x-organization-id'] as string);
    let callerAudience = ((request as any).audience || (request as any).sessionUser?.audience || (request.headers?.['x-audience'] as string) || (request.headers?.['x-user-audience'] as string)) as 'internal' | 'client' | 'supplier' | undefined;
    let callerRole = (request as any).role || (request as any).sessionUser?.role || (request.headers?.['x-user-roles'] as string);

    if (sessionToken && this.dbService) {
      try {
        const pool = this.dbService.getPool();
        const res = await pool.query(`
          SELECT s.user_id, u.email, u.name, u.is_super_admin,
                 m.role, m.audience, m.organisation_id
          FROM sessions s
          JOIN users u ON u.id = s.user_id
          LEFT JOIN memberships m ON m.user_id = u.id AND m.is_revoked = false
          WHERE s.token = $1 AND s.expires_at > NOW()
          LIMIT 1;
        `, [sessionToken]);

        if (res.rows.length > 0) {
          const row = res.rows[0];
          callerUserId = row.user_id;
          callerOrgId = row.organisation_id || callerOrgId;
          callerAudience = (row.audience || 'internal') as 'internal' | 'client' | 'supplier';
          callerRole = row.role || callerRole;
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
      }
    }

    // If completely unauthenticated (no session token, no pre-attached user, no auth headers)
    if (!callerUserId && !callerOrgId && !authHeader && !(request as any).sessionUser) {
      throw new HttpException(
        {
          code: 'UNAUTHENTICATED',
          title: 'Authentication session required',
          detail: 'An authenticated session is required to access protected EOS endpoints.',
        },
        HttpStatus.UNAUTHORIZED
      );
    }

    // Default audience to 'internal' if caller has identity but no explicit audience
    if (!callerAudience) {
      callerAudience = 'internal';
    }

    (request as any).organisationId = callerOrgId;
    (request as any).audience = callerAudience;
    (request as any).actorId = callerUserId;
    (request as any).userId = callerUserId;
    (request as any).role = callerRole;

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

    return true;
  }
}
