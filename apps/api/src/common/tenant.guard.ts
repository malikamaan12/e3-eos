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
    const request = context.switchToHttp().getRequest<Request>();
    const allowedAudiences = this.reflector?.getAllAndOverride<string[]>(
      ALLOWED_AUDIENCES_KEY,
      [context.getHandler(), context.getClass()]
    );

    // Extract caller identity and scope from headers or session
    let callerOrgId = (request.headers['x-organisation-id'] as string) || (request as any).organisationId;
    let callerAudience = ((request.headers['x-audience'] as string) || (request as any).audience || 'internal') as 'internal' | 'client' | 'supplier';
    let callerUserId = (request.headers['x-user-id'] as string) || (request as any).userId;
    let callerRole = (request.headers['x-user-roles'] as string) || (request as any).role;

    // Check bearer token or cookie session first to resolve identity from database
    const authHeader = request.headers.authorization;
    const cookieToken = (request as any).cookies?.['eos_session'];
    const sessionToken = authHeader?.replace('Bearer ', '') || cookieToken;

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
        }
      } catch (e: any) {
        // Fall back to headers if DB query fails
      }
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
