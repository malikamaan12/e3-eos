import { Body, Controller, Get, Header, Optional, Param, Post, Req, UseFilters, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { DbService } from '../common/db.service.js';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { FieldObservationsService } from './field-observations.service.js';

@Controller('projects/:projectId/field-observations')
@UseGuards(TenantIsolationGuard)
@UseFilters(ProblemDetailsFilter)
export class FieldObservationsController {
  private readonly service: FieldObservationsService;
  constructor(@Optional() database?: DbService) { this.service = new FieldObservationsService(database || new DbService()); }

  @Get()
  @Header('Cache-Control', 'no-store')
  list(@Param('projectId') projectId: string, @Req() req: Request) { return this.service.list(projectId, req); }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  get(@Param('projectId') projectId: string, @Param('id') id: string, @Req() req: Request) { return this.service.get(projectId, id, req); }

  @Post()
  @Header('Cache-Control', 'no-store')
  create(@Param('projectId') projectId: string, @Body() body: unknown, @Req() req: Request) { return this.service.create(projectId, body, req); }
}
