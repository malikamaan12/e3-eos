import { Controller, Get, Header, Optional, Req, UseFilters, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { DbService } from '../common/db.service.js';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { PortfolioSummaryService } from './portfolio-summary.service.js';

@Controller('portfolio')
@UseGuards(TenantIsolationGuard)
@UseFilters(ProblemDetailsFilter)
export class PortfolioSummaryController {
  private readonly service: PortfolioSummaryService;
  constructor(@Optional() database?: DbService) { this.service = new PortfolioSummaryService(database || new DbService()); }

  @Get('summary')
  @Header('Cache-Control', 'no-store')
  summary(@Req() req: Request) { return this.service.summary(req); }
}
