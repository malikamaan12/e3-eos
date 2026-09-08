import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

export const ALLOWED_AUDIENCES_KEY = 'allowedAudiences';
export const AllowedAudiences = (...audiences: Array<'internal' | 'client' | 'supplier'>) =>
  SetMetadata(ALLOWED_AUDIENCES_KEY, audiences);

export const REQUIRE_INTERNAL_ONLY = () => AllowedAudiences('internal');

@Injectable()
export class TenantIsolationGuard implements CanActivate {
  constructor(private reflector?: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const allowedAudiences = this.reflector?.getAllAndOverride<string[]>(
      ALLOWED_AUDIENCES_KEY,
      [context.getHandler(), context.getClass()]
    );

    // Extract caller identity and scope from headers or session
    const callerOrgId = (request.headers['x-organisation-id'] as string) || (request as any).organisationId;
    const callerAudience = ((request.headers['x-audience'] as string) || (request as any).audience || 'internal') as 'internal' | 'client' | 'supplier';
    const callerUserId = (request.headers['x-user-id'] as string) || (request as any).userId;

    (request as any).organisationId = callerOrgId;
    (request as any).audience = callerAudience;
    (request as any).actorId = callerUserId;

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
