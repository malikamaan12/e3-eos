import { Body, Controller, Get, Header, HttpException, Optional, Param, Post, Req, UseFilters, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { DbService } from '../common/db.service.js';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { ReportingService } from './reporting.service.js';

@Controller('projects/:projectId')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class ReportingController {
  private readonly service: ReportingService;
  constructor(@Optional() database?: DbService) { this.service = new ReportingService(database || new DbService()); }

  @Get('reports')
  @Header('Cache-Control', 'no-store')
  listReports(@Param('projectId') projectId: string, @Req() req: Request) { return this.service.list(projectId, req); }

  @Post('reports')
  @Header('Cache-Control', 'no-store')
  createReport(@Param('projectId') projectId: string, @Body() body: unknown, @Req() req: Request) { return this.service.create(projectId, body, req); }

  @Get('reports/:id')
  @Header('Cache-Control', 'no-store')
  getReport(@Param('projectId') projectId: string, @Param('id') reportId: string, @Req() req: Request) { return this.service.get(projectId, reportId, req); }

  @Post('reports/:id/revisions')
  @Header('Cache-Control', 'no-store')
  createRevision(@Param('projectId') projectId: string, @Param('id') reportId: string, @Body() body: unknown, @Req() req: Request) { return this.service.revise(projectId, reportId, body, req); }

  @Post('reports/:id/publish')
  publishReport(): never {
    throw new HttpException({ code: 'REPORT_PUBLICATION_UNAVAILABLE', detail: 'Client publication requires an exact-version review, server-verified recent authentication and a controlled audience projection. Internal drafts cannot be published through this route.' }, 503);
  }

  @Post('closure-decisions')
  recordClosureDecision(): never {
    throw new HttpException({ code: 'PROJECT_CLOSURE_UNAVAILABLE', detail: 'Controlled closure by dimension is not yet connected. This route cannot confirm operational closure, acceptance, financial review or settlement.' }, 503);
  }

  @Post('lessons')
  captureLesson(): never {
    throw new HttpException({ code: 'PROJECT_LESSONS_UNAVAILABLE', detail: 'Durable lessons and their review workflow are not yet connected. No lesson or policy change was saved.' }, 503);
  }
}
