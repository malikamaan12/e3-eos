import { Body, Controller, Get, Header, Optional, Param, Post, Req, UseFilters, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { DbService } from '../common/db.service.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { SchedulePlanningService } from './schedule-planning.service.js';
@Controller('projects/:projectId/schedule-register')
@UseGuards(TenantIsolationGuard)
@UseFilters(ProblemDetailsFilter)
export class SchedulePlanningController {
  private readonly service:SchedulePlanningService;
  constructor(@Optional() db?:DbService){this.service=new SchedulePlanningService(db||new DbService());}
  @Get() @Header('Cache-Control','no-store') list(@Param('projectId') p:string,@Req() req:Request){return this.service.list(p,req);}
  @Post() create(@Param('projectId') p:string,@Body() body:unknown,@Req() req:Request){return this.service.create(p,body,req);}
  @Post(':id/revisions') revise(@Param('projectId') p:string,@Param('id') id:string,@Body() body:unknown,@Req() req:Request){return this.service.revise(p,id,body,req);}
  @Get(':id/history') @Header('Cache-Control','no-store') history(@Param('projectId') p:string,@Param('id') id:string,@Req() req:Request){return this.service.history(p,id,req);}
  @Get('baseline-preview') @Header('Cache-Control','no-store') preview(@Param('projectId') p:string,@Req() req:Request){return this.service.preview(p,req);}
  @Post('baseline-candidates') capture(@Param('projectId') p:string,@Body() body:unknown,@Req() req:Request){return this.service.capture(p,body,req);}
  @Get(':id/comparison') @Header('Cache-Control','no-store') compare(@Param('projectId') p:string,@Param('id') id:string,@Req() req:Request){return this.service.compare(p,id,req);}
}
