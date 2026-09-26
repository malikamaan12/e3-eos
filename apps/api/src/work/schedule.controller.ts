import { Body, Controller, Get, Header, Optional, Param, Post, Query, Req, UseFilters, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { DbService } from '../common/db.service.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { ScheduleService } from './schedule.service.js';
@Controller()
@UseGuards(TenantIsolationGuard)
@UseFilters(ProblemDetailsFilter)
export class ScheduleController {
  private readonly service:ScheduleService;
  constructor(@Optional() db?:DbService){this.service=new ScheduleService(db||new DbService());}
  @Get('projects/:projectId/timeline') @Header('Cache-Control','no-store')
  timeline(@Param('projectId') project:string,@Req() req:Request){return this.service.timeline(project,req);}
  @Post('projects/:projectId/tasks/:taskId/forecast-changes')
  forecast(@Param('projectId') project:string,@Param('taskId') id:string,@Body() body:unknown,@Req() req:Request){return this.service.forecast(project,id,body,req);}
  @Get('projects/:projectId/tasks/:taskId/forecast-history') @Header('Cache-Control','no-store')
  history(@Param('projectId') project:string,@Param('taskId') id:string,@Req() req:Request){return this.service.forecastHistory(project,id,req);}
  @Post('projects/:projectId/dependencies/:id/archive')
  archive(@Param('projectId') project:string,@Param('id') id:string,@Body() body:unknown,@Req() req:Request){return this.service.archiveDependency(project,id,body,req);}
  @Get('projects/:projectId/dependencies/:id/history') @Header('Cache-Control','no-store')
  dependencyHistory(@Param('projectId') project:string,@Param('id') id:string,@Req() req:Request){return this.service.dependencyHistory(project,id,req);}
  @Get('schedule/calendar') @Header('Cache-Control','no-store')
  calendar(@Query() query:unknown,@Req() req:Request){return this.service.calendar(query,req);}
}
