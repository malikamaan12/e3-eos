import { Body, Controller, Get, Header, Optional, Param, Post, Query, Req, UseFilters, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { DbService } from '../common/db.service.js';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { AllowedAudiences, RequireRoles, TenantIsolationGuard } from '../common/tenant.guard.js';
import { ProjectAccessService } from './project-access.service.js';

@Controller('project-access')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
@RequireRoles('super_admin')
@AllowedAudiences('internal')
export class ProjectAccessController {
  private readonly service: ProjectAccessService;
  constructor(@Optional() dbService?: DbService) { this.service = new ProjectAccessService(dbService || new DbService()); }

  @Get()
  @Header('Cache-Control', 'no-store')
  list(@Req() req: Request, @Query('projectId') projectId?: string) { return this.service.list(req, projectId); }

  @Get('projects')
  @Header('Cache-Control', 'no-store')
  projects(@Req() req: Request) { return this.service.projects(req); }

  @Post()
  @Header('Cache-Control', 'no-store')
  create(@Body() body: unknown, @Req() req: Request) { return this.service.create(body, req); }

  @Post(':id/change')
  @Header('Cache-Control', 'no-store')
  change(@Param('id') id: string, @Body() body: unknown, @Req() req: Request) { return this.service.change(id, body, req); }

  @Post(':id/revoke')
  @Header('Cache-Control', 'no-store')
  revoke(@Param('id') id: string, @Body() body: unknown, @Req() req: Request) { return this.service.change(id, body, req, true); }
}
