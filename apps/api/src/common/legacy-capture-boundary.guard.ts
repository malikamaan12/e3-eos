import { CanActivate, ExecutionContext, HttpException, Injectable, Optional } from '@nestjs/common';
import type { Request } from 'express';
import { DbService } from './db.service.js';
import { ProjectAccessService } from '../projects/project-access.service.js';

/** Legacy fixture engines are not durable command handlers. */
@Injectable()
export class LegacyScopeBoundaryGuard implements CanActivate {
  constructor(@Optional() private readonly db?: DbService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const reference = req.params.projectId;
    if (typeof reference !== 'string') throw new HttpException({code:'INVALID_PROJECT',detail:'A project reference is required.'},400);
    await new ProjectAccessService(this.db || new DbService()).withAccess(req, reference, {level:'viewer',audiences:['internal']}, async () => undefined);
    throw new HttpException({code:'LEGACY_SCOPE_WORKFLOW_UNAVAILABLE',detail:'This legacy workflow is not connected to durable scoped records. Use the requirement, clarification and allocation registers for draft planning. Parser publication and scope approval remain unavailable.'},503);
  }
}

@Injectable()
export class LegacyFieldBoundaryGuard implements CanActivate {
  canActivate(): boolean {
    throw new HttpException({code:'LEGACY_FIELD_WORKFLOW_UNAVAILABLE',detail:'This legacy sync, media or qualification workflow has no durable verified receipt. Text observations are available through the project field-note register; existing unsupported captures remain provisional.'},503);
  }
}

@Injectable()
export class LegacyDesignBoundaryGuard implements CanActivate {
  constructor(@Optional() private readonly db?: DbService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const reference = req.params.projectId;
    if (typeof reference !== 'string') throw new HttpException({code:'INVALID_PROJECT',detail:'A project reference is required.'},400);
    await new ProjectAccessService(this.db || new DbService()).withAccess(req,reference,{level:'viewer',audiences:['internal']},async()=>undefined);
    throw new HttpException({code:'LEGACY_DESIGN_WORKFLOW_UNAVAILABLE',detail:'This legacy design workflow has no durable verified file or approval record. Use the design brief register for versioned internal planning. File upload, client approval and fabrication release remain unavailable.'},503);
  }
}
