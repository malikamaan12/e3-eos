import { Body, Controller, Get, Header, Optional, Param, Post, Req, UseFilters, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { DbService } from '../common/db.service.js';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { AllocationRegisterService } from './allocation-register.service.js';

@Controller('projects/:projectId/allocation-register')
@UseGuards(TenantIsolationGuard)
@UseFilters(ProblemDetailsFilter)
export class AllocationRegisterController {
  private readonly service: AllocationRegisterService;
  constructor(@Optional() db?: DbService) { this.service = new AllocationRegisterService(db || new DbService()); }
  @Get() @Header('Cache-Control', 'no-store')
  list(@Param('projectId') project: string, @Req() req: Request) { return this.service.list(project, req); }
  @Post()
  create(@Param('projectId') project: string, @Body() body: unknown, @Req() req: Request) { return this.service.create(project, body, req); }
  @Get(':id') @Header('Cache-Control', 'no-store')
  get(@Param('projectId') project: string, @Param('id') id: string, @Req() req: Request) { return this.service.get(project, id, req); }
  @Get(':id/revisions') @Header('Cache-Control', 'no-store')
  revisions(@Param('projectId') project: string, @Param('id') id: string, @Req() req: Request) { return this.service.revisions(project, id, req); }
  @Post(':id/revisions')
  revise(@Param('projectId') project: string, @Param('id') id: string, @Body() body: unknown, @Req() req: Request) { return this.service.revise(project, id, body, req); }
}
