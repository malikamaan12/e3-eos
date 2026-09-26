import { Body, Controller, Get, Header, HttpException, Optional, Param, Post, Req, UseFilters, UseGuards } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Request } from 'express';
import { PackageAcceptanceSchema, ProtectiveActionSchema, TaskCompleteSchema } from '@e3-eos/contracts';
import type { DependencyEdge, GanttTaskInput } from '@e3-eos/domain';
import { localSyntheticAuthEnabled } from '../auth/local-synthetic-auth.js';
import { DbService } from '../common/db.service.js';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { WorkService } from './work.service.js';
import { ScheduleService } from './schedule.service.js';

export interface StoredWorkPackage {
  id: string; organisationId: string; projectId: string; stageInstanceId?: string;
  name: string; ownerId: string; status: 'active' | 'completed' | 'cancelled';
  acceptanceState: 'pending' | 'accepted' | 'rejected' | 'conditional'; createdAt: string;
}
export interface StoredTask {
  id: string; packageId: string; organisationId: string; projectId: string; title: string;
  assigneeId?: string; state: 'planned' | 'active' | 'completed'; isCompleted: boolean; completedAt?: string;
}

// Kept only for explicitly opted-in direct domain fixtures. HTTP never reads or writes these maps.
export const workPackageRepository = new Map<string, StoredWorkPackage>();
export const taskRepository = new Map<string, StoredTask>();
export const dependencyRepository = new Map<string, DependencyEdge>();
export const protectiveActionRepository = new Map<string, any>();
export const ganttTaskRepository = new Map<string, GanttTaskInput & { projectId: string }>();
function directFixture(req?: Request): boolean {
  return process.env.NODE_ENV === 'test' && localSyntheticAuthEnabled()
    && (!req || (!req.method && !req.url && !req.cookies && !(req as any).user
      && !req.headers?.authorization && !req.headers?.cookie));
}
const fixtureResult = (id: string, status: string, payload: any, recordVersion = 1) => ({
  data: { id, status, payload, recordVersion }, meta: { requestId: `fixture-${randomUUID()}` },
});

@Controller('projects/:projectId')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class WorkController {
  private readonly service: WorkService;
  private readonly schedule: ScheduleService;
  constructor(@Optional() dbService?: DbService) { const db=dbService||new DbService(); this.service = new WorkService(db); this.schedule=new ScheduleService(db); }

  @Get('gantt')
  @Header('Cache-Control', 'no-store')
  getGanttSchedule(@Param('projectId') projectId: string, @Req() req: Request) {
    return this.service.unavailable(projectId, req, 'A persisted schedule with durations and dependencies', false);
  }

  @Get('work-packages')
  @Header('Cache-Control', 'no-store')
  getWorkPackages(@Param('projectId') projectId: string, @Req() req: Request) {
    return this.service.packages(projectId, req);
  }

  @Post('work-packages')
  createWorkPackage(@Param('projectId') projectId: string, @Body() body: unknown, @Req() req: Request) {
    return this.service.createPackage(projectId, body, req);
  }

  @Get('tasks')
  @Header('Cache-Control', 'no-store')
  getTasks(@Param('projectId') projectId: string, @Req() req: Request) {
    return this.service.tasks(projectId, req);
  }

  @Post('tasks')
  createTask(@Param('projectId') projectId: string, @Body() body: unknown, @Req() req: Request) {
    return this.service.createTask(projectId, body, req);
  }

  @Post('tasks/:taskId/complete')
  completeTask(@Param('projectId') projectId: string, @Param('taskId') taskId: string,
    @Body() body: unknown, @Req() req?: Request): any {
    if (!directFixture(req)) return this.service.completeTask(projectId, taskId, body, req!);
    const parsed = TaskCompleteSchema.safeParse(body);
    if (!parsed.success) throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid completion fixture' }, 400);
    const task = taskRepository.get(taskId);
    if (!task || task.projectId !== projectId) throw new HttpException({ code: 'NOT_FOUND', title: 'Task not found' }, 404);
    task.isCompleted = true; task.state = 'completed'; task.completedAt = new Date().toISOString();
    return fixtureResult(taskId, 'completed', { task, packageAcceptanceState: workPackageRepository.get(task.packageId)?.acceptanceState || 'pending' }, 2);
  }

  @Post('work-packages/:pkgId/acceptances')
  acceptWorkPackage(@Param('projectId') projectId: string, @Param('pkgId') pkgId: string,
    @Body() body: unknown, @Req() req?: Request): any {
    if (!directFixture(req)) return this.service.unavailable(projectId, req!, 'Designated work package acceptance');
    const parsed = PackageAcceptanceSchema.safeParse(body);
    if (!parsed.success) throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid acceptance fixture' }, 400);
    const pkg = workPackageRepository.get(pkgId);
    if (!pkg || pkg.projectId !== projectId) throw new HttpException({ code: 'NOT_FOUND', title: 'Work package not found' }, 404);
    pkg.acceptanceState = parsed.data.outcome;
    return fixtureResult(randomUUID(), parsed.data.outcome, { packageId: pkgId, acceptanceState: parsed.data.outcome, conditions: parsed.data.conditions }, 2);
  }

  @Post('dependencies')
  addDependency(@Param('projectId') projectId: string, @Body() body: unknown, @Req() req: Request) {
    return this.schedule.addDependency(projectId, body, req);
  }

  @Post('protective-actions')
  recordProtectiveAction(@Param('projectId') projectId: string, @Body() body: unknown, @Req() req: Request): any {
    if (!directFixture(req)) return this.service.unavailable(projectId, req, 'Protective action recording');
    const parsed = ProtectiveActionSchema.safeParse(body);
    if (!parsed.success) throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid protective action fixture' }, 400);
    const id = randomUUID();
    const record = { id, projectId, ...parsed.data, recordedBy: (req as any).actorId, recordedAt: new Date().toISOString(), status: 'executed_immediately' };
    protectiveActionRepository.set(id, record);
    return fixtureResult(id, 'executed_immediately', record);
  }
}
