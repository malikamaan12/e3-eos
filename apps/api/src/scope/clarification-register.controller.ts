import { Body, Controller, Get, Header, Optional, Param, Post, Req, UseFilters, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { DbService } from '../common/db.service.js';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { ClarificationRegisterService } from './clarification-register.service.js';

@Controller('projects/:projectId/scope-register/clarifications')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class ClarificationRegisterController {
  private readonly service: ClarificationRegisterService;
  constructor(@Optional() db?: DbService) { this.service = new ClarificationRegisterService(db || new DbService()); }

  @Get()
  @Header('Cache-Control', 'no-store')
  list(@Param('projectId') projectId: string, @Req() req: Request) { return this.service.list(projectId, req); }

  @Post()
  @Header('Cache-Control', 'no-store')
  create(@Param('projectId') projectId: string, @Body() body: unknown, @Req() req: Request) { return this.service.create(projectId, body, req); }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  get(@Param('projectId') projectId: string, @Param('id') id: string, @Req() req: Request) { return this.service.get(projectId, id, req); }

  @Post(':id/respond')
  @Header('Cache-Control', 'no-store')
  respond(@Param('projectId') projectId: string, @Param('id') id: string, @Body() body: unknown, @Req() req: Request) { return this.service.respond(projectId, id, body, req); }

  @Post(':id/reopen')
  @Header('Cache-Control', 'no-store')
  reopen(@Param('projectId') projectId: string, @Param('id') id: string, @Body() body: unknown, @Req() req: Request) { return this.service.reopen(projectId, id, body, req); }
}
