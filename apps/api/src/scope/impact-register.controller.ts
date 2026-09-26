import { Body, Controller, Get, Header, Optional, Param, Post, Query, Req, UseFilters, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { DbService } from '../common/db.service.js';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { ImpactRegisterService } from './impact-register.service.js';

@Controller('projects/:projectId/impact-register')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class ImpactRegisterController {
  private readonly service: ImpactRegisterService;
  constructor(@Optional() db?: DbService) { this.service = new ImpactRegisterService(db || new DbService()); }
  @Get()
  @Header('Cache-Control', 'no-store')
  list(@Param('projectId') projectId: string, @Req() req: Request) { return this.service.list(projectId, req); }
  @Get('assessments')
  @Header('Cache-Control', 'no-store')
  assessments(@Param('projectId') projectId: string, @Req() req: Request, @Query('targetType') targetType?: string, @Query('targetId') targetId?: string) {
    return this.service.assessments(projectId, req, targetType, targetId);
  }
  @Post('assessments')
  @Header('Cache-Control', 'no-store')
  create(@Param('projectId') projectId: string, @Body() body: unknown, @Req() req: Request) { return this.service.create(projectId, body, req); }
}
