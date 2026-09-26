import { Body, Controller, Get, Header, Optional, Param, Post, Req, UseFilters, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { DbService } from '../common/db.service.js';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { RequirementIntakeService } from './requirement-intake.service.js';

@Controller('projects/:projectId/scope-register/requirements')
@UseGuards(TenantIsolationGuard)
@UseFilters(ProblemDetailsFilter)
export class RequirementIntakeController {
  private readonly service: RequirementIntakeService;
  constructor(@Optional() db?: DbService) { this.service = new RequirementIntakeService(db || new DbService()); }

  @Get()
  @Header('Cache-Control', 'no-store')
  list(@Param('projectId') projectId: string, @Req() req: Request) { return this.service.list(projectId, req); }

  @Post()
  create(@Param('projectId') projectId: string, @Body() body: unknown, @Req() req: Request) { return this.service.create(projectId, body, req); }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  get(@Param('projectId') projectId: string, @Param('id') id: string, @Req() req: Request) { return this.service.get(projectId, id, req); }

  @Get(':id/revisions')
  @Header('Cache-Control', 'no-store')
  revisions(@Param('projectId') projectId: string, @Param('id') id: string, @Req() req: Request) { return this.service.revisions(projectId, id, req); }

  @Post(':id/revisions')
  revise(@Param('projectId') projectId: string, @Param('id') id: string, @Body() body: unknown, @Req() req: Request) { return this.service.revise(projectId, id, body, req); }
}
