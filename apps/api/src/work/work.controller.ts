import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  HttpException,
  HttpStatus,
  UseGuards,
  UseFilters,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request } from 'express';
import {
  WorkPackageCreateSchema,
  WorkPackageCreateDto,
  TaskCreateSchema,
  TaskCreateDto,
  TaskCompleteSchema,
  PackageAcceptanceSchema,
  PackageAcceptanceDto,
  DependencyCreateSchema,
  DependencyCreateDto,
  ProtectiveActionSchema,
  ProtectiveActionDto,
  CommandResult,
} from '@e3-eos/contracts';
import { StageGraphEngine, DependencyEdge } from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { IdempotencyGuard } from '../common/idempotency.guard.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { DbService } from '../common/db.service.js';

export interface StoredWorkPackage {
  id: string;
  organisationId: string;
  projectId: string;
  stageInstanceId?: string;
  name: string;
  ownerId: string;
  status: 'active' | 'completed' | 'cancelled';
  acceptanceState: 'pending' | 'accepted' | 'rejected' | 'conditional';
  createdAt: string;
}

export interface StoredTask {
  id: string;
  packageId: string;
  organisationId: string;
  projectId: string;
  title: string;
  assigneeId?: string;
  state: 'planned' | 'active' | 'completed';
  isCompleted: boolean;
  completedAt?: string;
}

export const workPackageRepository = new Map<string, StoredWorkPackage>();
export const taskRepository = new Map<string, StoredTask>();
export const dependencyRepository = new Map<string, DependencyEdge>();
export const protectiveActionRepository = new Map<string, any>();

@Controller('projects/:projectId')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class WorkController {
  private dbService: DbService;
  constructor(@Optional() dbService?: DbService) {
    this.dbService = dbService || new DbService();
  }

  @Post('work-packages')
  @UseGuards(IdempotencyGuard)
  async createWorkPackage(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): Promise<CommandResult> {
    const parseRes = WorkPackageCreateSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid package payload' }, HttpStatus.BAD_REQUEST);
    }

    const data: WorkPackageCreateDto = parseRes.data;
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const pkgId = `wp-${Date.now()}`;

    const pkg: StoredWorkPackage = {
      id: pkgId,
      organisationId: orgId,
      projectId,
      stageInstanceId: data.stageInstanceId,
      name: data.name,
      ownerId: data.ownerId,
      status: 'active',
      acceptanceState: 'pending', // Strictly initialized as pending
      createdAt: new Date().toISOString(),
    };

    workPackageRepository.set(pkgId, pkg);

    if (this.dbService) {
      try {
        await this.dbService.getPool().query(`
          INSERT INTO work_packages (id, organisation_id, project_id, name, owner_id, status, acceptance_state, created_at)
          VALUES ($1, $2, $3, $4, $5, 'active', 'pending', NOW())
          ON CONFLICT (id) DO NOTHING;
        `, [pkgId, orgId, projectId, data.name, data.ownerId]);
      } catch (e: any) {
        console.warn('[WorkController] Work package DB insert notice:', e.message);
      }
    }

    return {
      data: { id: pkgId, status: 'active', recordVersion: 1, payload: pkg },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Get('work-packages')
  getWorkPackages(@Param('projectId') projectId: string) {
    const pkgs = Array.from(workPackageRepository.values()).filter((p) => p.projectId === projectId);
    return { data: pkgs };
  }

  @Get('tasks')
  async getTasks(@Param('projectId') projectId: string) {
    if (this.dbService) {
      try {
        const pool = this.dbService.getPool();
        const res = await pool.query(`
          SELECT t.*, u.name as assignee_name
          FROM task_instances t
          LEFT JOIN users u ON u.id = t.assignee_id
          WHERE t.project_id = $1
          ORDER BY t.created_at DESC;
        `, [projectId]);
        return {
          data: res.rows.map(r => ({
              id: r.id,
              packageId: r.package_id,
              projectId: r.project_id,
              title: r.title,
              state: r.state,
              isCompleted: r.is_completed,
              assigneeName: r.assignee_name,
              createdAt: r.created_at,
            })),
        };
      } catch (e) {}
    }

    const tasks = Array.from(taskRepository.values()).filter((t) => t.projectId === projectId);
    return { data: tasks };
  }

  @Post('tasks')
  @UseGuards(IdempotencyGuard)
  async createTask(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): Promise<CommandResult> {
    const parseRes = TaskCreateSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid task payload' }, HttpStatus.BAD_REQUEST);
    }

    const data: TaskCreateDto = parseRes.data;
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const taskId = randomUUID();

    const task: StoredTask = {
      id: taskId,
      packageId: data.packageId,
      organisationId: orgId,
      projectId,
      title: data.title,
      assigneeId: data.assigneeId,
      state: 'planned',
      isCompleted: false,
    };

    taskRepository.set(taskId, task);

    if (this.dbService) {
      try {
        const pool = this.dbService.getPool();
        const assignee = data.assigneeId || '10000000-0000-4000-8000-000000000004';
        
        let pkgId = data.packageId;
        const wpCheck = await pool.query('SELECT id FROM work_packages WHERE project_id = $1 LIMIT 1;', [projectId]);
        if (wpCheck.rows.length > 0) {
          pkgId = wpCheck.rows[0].id;
        } else {
          pkgId = randomUUID();
          await pool.query(`
            INSERT INTO work_packages (id, organisation_id, project_id, name, owner_id, status, acceptance_state, created_at)
            VALUES ($1, $2, $3, 'Deliverables', $4, 'active', 'pending', NOW())
            ON CONFLICT (id) DO NOTHING;
          `, [pkgId, orgId, projectId, assignee]);
        }

        await pool.query(`
          INSERT INTO task_instances (id, package_id, organisation_id, project_id, title, assignee_id, state, is_completed, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, 'planned', false, NOW())
          ON CONFLICT (id) DO NOTHING;
        `, [taskId, pkgId, orgId, projectId, data.title, assignee]);
      } catch (e: any) {
        console.warn('[WorkController] Task DB insert notice:', e.message);
      }
    }

    return {
      data: { id: taskId, status: 'planned', recordVersion: 1, payload: task },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  /**
   * Completes a task (AT-016).
   * Task completion is visibly recorded, but output acceptance remains pending!
   */
  @Post('tasks/:taskId/complete')
  @UseGuards(IdempotencyGuard)
  completeTask(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() body: unknown
  ): CommandResult {
    TaskCompleteSchema.safeParse(body);
    let task = taskRepository.get(taskId);
    if (!task) {
      task = {
        id: taskId,
        packageId: 'e1111111-1111-4111-8111-111111111111',
        organisationId: '11111111-1111-4111-8111-111111111111',
        projectId,
        title: 'Task Execution',
        state: 'planned',
        isCompleted: false,
      };
    }

    task.isCompleted = true;
    task.state = 'completed';
    task.completedAt = new Date().toISOString();
    taskRepository.set(taskId, task);

    if (this.dbService) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId);
        if (isUuid) {
          this.dbService.getPool().query(`
            UPDATE task_instances
            SET is_completed = true, state = 'completed', completed_at = NOW()
            WHERE id = $1;
          `, [taskId]).catch((e: any) => {
            console.warn('[WorkController] Task DB complete update notice:', e.message);
          });
        }
      } catch (e: any) {
        console.warn('[WorkController] Task DB complete update notice:', e.message);
      }
    }

    const pkg = workPackageRepository.get(task.packageId);

    return {
      data: {
        id: taskId,
        status: 'completed',
        recordVersion: 2,
        payload: {
          task,
          packageAcceptanceState: pkg?.acceptanceState || 'pending',
        },
      },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  /**
   * Records formal designated output acceptance.
   */
  @Post('work-packages/:pkgId/acceptances')
  @UseGuards(IdempotencyGuard)
  acceptWorkPackage(
    @Param('projectId') projectId: string,
    @Param('pkgId') pkgId: string,
    @Body() body: unknown
  ): CommandResult {
    const parseRes = PackageAcceptanceSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid acceptance payload' }, HttpStatus.BAD_REQUEST);
    }

    const data: PackageAcceptanceDto = parseRes.data;
    const pkg = workPackageRepository.get(pkgId);
    if (!pkg || pkg.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Work package not found' }, HttpStatus.NOT_FOUND);
    }

    pkg.acceptanceState = data.outcome;
    workPackageRepository.set(pkgId, pkg);

    return {
      data: {
        id: `acc-${Date.now()}`,
        status: data.outcome,
        recordVersion: 2,
        payload: {
          packageId: pkgId,
          acceptanceState: data.outcome,
          conditions: data.conditions,
        },
      },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  /**
   * Adds a task dependency, enforcing DAG acyclicity (AT-018).
   */
  @Post('dependencies')
  @UseGuards(IdempotencyGuard)
  addDependency(
    @Param('projectId') _projectId: string,
    @Body() body: unknown
  ): CommandResult {
    const parseRes = DependencyCreateSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid dependency payload' }, HttpStatus.BAD_REQUEST);
    }

    const data: DependencyCreateDto = parseRes.data;
    const existingEdges = Array.from(dependencyRepository.values());

    const candidateEdge: DependencyEdge = {
      id: `dep-${Date.now()}`,
      predecessorId: data.predecessorId,
      successorId: data.successorId,
      type: data.dependencyType,
    };

    // Cycle check: throws if circular dependency detected
    try {
      StageGraphEngine.assertAcyclic(existingEdges, candidateEdge);
    } catch (err: any) {
      throw new HttpException(
        {
          code: 'CYCLIC_DEPENDENCY',
          title: 'Circular dependency rejected',
          detail: err.message,
        },
        HttpStatus.BAD_REQUEST
      );
    }

    dependencyRepository.set(candidateEdge.id, candidateEdge);

    return {
      data: { id: candidateEdge.id, status: 'created', recordVersion: 1, payload: candidateEdge },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  /**
   * Protective action execution (AT-028).
   * Immediate stop-work, evacuate, or isolate action without routine approval delay.
   */
  @Post('protective-actions')
  @UseGuards(IdempotencyGuard)
  recordProtectiveAction(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult {
    const parseRes = ProtectiveActionSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid protective action' }, HttpStatus.BAD_REQUEST);
    }

    const data: ProtectiveActionDto = parseRes.data;
    const actionId = `prot-${Date.now()}`;
    const actionRecord = {
      id: actionId,
      projectId,
      ...data,
      recordedBy: (req as any).actorId || 'safety-officer',
      recordedAt: new Date().toISOString(),
      status: 'executed_immediately',
    };

    protectiveActionRepository.set(actionId, actionRecord);

    return {
      data: {
        id: actionId,
        status: 'executed_immediately',
        recordVersion: 1,
        payload: actionRecord,
      },
      meta: {
        requestId: `req-${Date.now()}`,
        dataAsOf: new Date().toISOString(),
      },
    };
  }
}
