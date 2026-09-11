import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { DbService } from './db.service.js';
import {
  CONSTRAINTS_VERIFY_PERMISSION,
  hasConstraintVerifyPermission,
  AUTHORIZED_VERIFIER_ROLES,
} from '@e3-eos/domain';

export interface AuthenticatedSessionUser {
  userId: string;
  name: string;
  email: string;
  role: string;
  organisationId: string;
  isSuperAdmin: boolean;
}

@Injectable()
export class ConstraintsAuthGuard implements CanActivate {
  private dbService: DbService;

  constructor(
    @Optional() _reflector?: Reflector,
    @Optional() dbService?: DbService
  ) {
    this.dbService = dbService || new DbService();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // 1. Session Token extraction (Strictly Bearer header or secure cookie — NO client header fallback)
    const authHeader = request.headers.authorization;
    const cookieToken = (request as any).cookies?.['eos_session'];
    const sessionToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : cookieToken;

    if (!sessionToken) {
      throw new HttpException(
        {
          code: 'UNAUTHENTICATED',
          title: 'Authentication session required',
          detail: 'A valid authenticated session is required to perform operational constraint governance.',
        },
        HttpStatus.UNAUTHORIZED
      );
    }

    // 2. Validate session against PostgreSQL sessions table
    const pool = this.dbService.getPool();
    let sessionUser: AuthenticatedSessionUser | null = null;

    try {
      const res = await pool.query(`
        SELECT s.user_id, u.email, u.name, u.is_super_admin,
               m.role, m.audience, m.organisation_id
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        LEFT JOIN memberships m ON m.user_id = u.id AND m.is_revoked = false
        WHERE s.token = $1 AND s.expires_at > NOW()
        LIMIT 1;
      `, [sessionToken]);

      if (res.rows.length === 0) {
        throw new HttpException(
          {
            code: 'SESSION_EXPIRED',
            title: 'Session invalid or expired',
            detail: 'The provided session token is not active in PostgreSQL.',
          },
          HttpStatus.UNAUTHORIZED
        );
      }

      const row = res.rows[0];
      sessionUser = {
        userId: row.user_id,
        name: row.name,
        email: row.email,
        role: row.role || 'viewer',
        organisationId: row.organisation_id || '11111111-1111-4111-8111-111111111111',
        isSuperAdmin: Boolean(row.is_super_admin),
      };
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        {
          code: 'AUTH_DATABASE_ERROR',
          title: 'Authentication database failure',
          detail: err.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    // Bind strictly verified session identity to request
    (request as any).sessionUser = sessionUser;
    (request as any).userId = sessionUser.userId;
    (request as any).organisationId = sessionUser.organisationId;
    (request as any).role = sessionUser.role;

    // 3. Check for verification action
    const handler = context.getHandler();
    const handlerName = handler?.name;
    const isVerificationAction = handlerName === 'verifyConstraint' || request.url.includes('/verify');

    if (isVerificationAction) {
      const authorized = hasConstraintVerifyPermission(sessionUser.role, sessionUser.isSuperAdmin);
      if (!authorized) {
        throw new HttpException(
          {
            code: 'FORBIDDEN_AUTHORITY',
            title: `Role '${sessionUser.role}' lacks ${CONSTRAINTS_VERIFY_PERMISSION} permission.`,
            detail: `Operational constraint verification requires ${CONSTRAINTS_VERIFY_PERMISSION}. Authorized roles: ${AUTHORIZED_VERIFIER_ROLES.join(', ')}.`,
          },
          HttpStatus.FORBIDDEN
        );
      }
    }

    return true;
  }
}
