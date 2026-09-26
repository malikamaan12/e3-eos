import { Body, Controller, Header, Optional, Param, Post, Req, UseFilters, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { DbService } from '../common/db.service.js';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { AllowedAudiences, RequireRoles, TenantIsolationGuard } from '../common/tenant.guard.js';
import { MembershipAdminService } from './membership-admin.service.js';

@Controller('memberships')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class MembershipAdminController {
  private readonly service: MembershipAdminService;

  constructor(@Optional() database?: DbService) {
    this.service = new MembershipAdminService(database || new DbService());
  }

  @Post(':id/role')
  @Header('Cache-Control', 'no-store')
  @RequireRoles('super_admin')
  @AllowedAudiences('internal')
  changeRole(@Param('id') id: string, @Body() body: { role?: unknown; reason?: unknown; expectedVersion?: unknown }, @Req() req: Request) {
    return this.service.changeRole(id, body, req);
  }

  @Post(':id/restore')
  @Header('Cache-Control', 'no-store')
  @RequireRoles('super_admin')
  @AllowedAudiences('internal')
  restore(@Param('id') id: string, @Body() body: { reason?: unknown; expectedVersion?: unknown }, @Req() req: Request) {
    return this.service.restore(id, body, req);
  }
}
