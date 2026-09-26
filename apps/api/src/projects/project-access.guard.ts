import { CanActivate, ExecutionContext, HttpException, Injectable, Optional } from '@nestjs/common';
import type { Request } from 'express';
import { DbService } from '../common/db.service.js';
import { ProjectAccessService } from './project-access.service.js';
import { hasRolePermission } from '@e3-eos/domain';

/** Apply after TenantIsolationGuard. Collection handlers filter grants themselves. */
@Injectable()
export class ProjectAccessGuard implements CanActivate {
  private readonly service: ProjectAccessService;
  constructor(@Optional() dbService?: DbService) { this.service = new ProjectAccessService(dbService || new DbService()); }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const reference = req.params?.id || req.params?.projectId;
    if (!reference) return true;
    if (typeof reference !== 'string') {
      throw new HttpException({ code: 'VALIDATION_ERROR', detail: 'A single project identifier is required.' }, 400);
    }
    const access = await this.service.authorise(req, reference, ['GET', 'HEAD'].includes(req.method) ? 'viewer' : 'editor');
    // Published client projections for cockpit/stages/tasks are a separate
    // capability. A viewer grant must not expose their internal source records.
    if (access.audience === 'client' && context.getHandler().name !== 'getProject') {
      throw new HttpException({ code: 'PROJECT_CLIENT_PROJECTION_UNAVAILABLE', detail: 'This internal project view is unavailable to client accounts.' }, 403);
    }
    if (context.getHandler().name === 'getProjectCosting' && !hasRolePermission(access.role, 'finance.manage', access.isSuperAdmin)
      && !hasRolePermission(access.role, 'projects.manage', access.isSuperAdmin)) {
      throw new HttpException({ code: 'PROJECT_ROLE_PERMISSION_REQUIRED', detail: 'Current role does not permit internal project costing.' }, 403);
    }
    if (['cloneProject', 'closeDimension', 'updateProjectActivity'].includes(context.getHandler().name)) {
      throw new HttpException({ code: 'PROJECT_MUTATION_UNAVAILABLE', detail: 'This legacy project command has no durable audited implementation and cannot be committed.' }, 503);
    }
    (req as any).projectAccess = access;
    if (req.params.id) req.params.id = access.project.id;
    if (req.params.projectId) req.params.projectId = access.project.id;
    return true;
  }
}
