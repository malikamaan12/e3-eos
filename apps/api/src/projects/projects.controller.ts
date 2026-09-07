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
} from '@nestjs/common';
import { Request } from 'express';
import { ProjectCreateSchema, ProjectCreateDto, CommandResult } from '@e3-eos/contracts';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { IdempotencyGuard } from '../common/idempotency.guard.js';
import { TenantIsolationGuard, AllowedAudiences } from '../common/tenant.guard.js';

interface StoredProject {
  id: string;
  organisationId: string;
  projectCode: string;
  title: string;
  description: string;
  originCode: string;
  ownerId: string;
  maturity: string;
  outcome: string;
  rowVersion: number;
  costingData?: {
    contractorBuyRateHourly: string;
    internalMarginTarget: string;
    payrollSchedule: string;
  };
}

// In-memory / repository store for projects
export const projectRepository = new Map<string, StoredProject>();

@Controller('projects')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class ProjectsController {
  @Post()
  @UseGuards(IdempotencyGuard)
  createProject(@Body() body: unknown, @Req() req: Request): CommandResult {
    const parseResult = ProjectCreateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        {
          code: 'INVALID_ARGUMENT',
          title: 'Project validation failed',
          detail: parseResult.error.errors.map((e: { path: (string | number)[]; message: string }) => `${e.path.join('.')}: ${e.message}`).join(', '),
          invalidParams: parseResult.error.errors.map((e: { path: (string | number)[]; message: string }) => ({
            name: e.path.join('.'),
            reason: e.message,
          })),
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const data: ProjectCreateDto = parseResult.data;
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';

    const projectId = `prj-${Date.now()}`;
    const projectCode = data.projectCode || `PRJ-${Date.now().toString().slice(-4)}`;

    const newProject: StoredProject = {
      id: projectId,
      organisationId: orgId,
      projectCode,
      title: data.title,
      description: data.description,
      originCode: data.originCode,
      ownerId: data.ownerId,
      maturity: 'idea',
      outcome: 'undetermined',
      rowVersion: 1,
      costingData: {
        contractorBuyRateHourly: '120.00 QAR',
        internalMarginTarget: '43.75%',
        payrollSchedule: 'CONFIDENTIAL-INTERNAL',
      },
    };

    projectRepository.set(projectId, newProject);

    return {
      data: {
        id: projectId,
        status: 'draft_created',
        recordVersion: 1,
        externalDeliveryStatus: 'not_applicable',
        payload: {
          projectCode,
          title: data.title,
          maturity: 'idea',
          outcome: 'undetermined',
        },
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || `req-${Date.now()}`,
        recordVersion: 1,
        dataAsOf: new Date().toISOString(),
      },
    };
  }

  @Get(':id')
  getProject(@Param('id') id: string, @Req() req: Request) {
    const project = projectRepository.get(id);
    const callerOrgId = (req as any).organisationId;

    // Cross-tenant access denial (AT-001): Deny with 404, no existence leakage
    if (!project || (callerOrgId && project.organisationId !== callerOrgId)) {
      throw new HttpException(
        {
          code: 'NOT_FOUND',
          title: 'Project not found',
          detail: `The requested project does not exist or is not visible in the current scope.`,
        },
        HttpStatus.NOT_FOUND
      );
    }

    return {
      data: {
        id: project.id,
        projectCode: project.projectCode,
        title: project.title,
        description: project.description,
        maturity: project.maturity,
        outcome: project.outcome,
        rowVersion: project.rowVersion,
      },
    };
  }

  /**
   * Internal-only costing endpoint (AT-002).
   * Client accounts calling this must receive 403 Forbidden with zero data leaked.
   */
  @Get(':id/costing')
  @AllowedAudiences('internal')
  getProjectCosting(@Param('id') id: string, @Req() req: Request) {
    const project = projectRepository.get(id);
    const callerOrgId = (req as any).organisationId;

    if (!project || (callerOrgId && project.organisationId !== callerOrgId)) {
      throw new HttpException(
        {
          code: 'NOT_FOUND',
          title: 'Project not found',
        },
        HttpStatus.NOT_FOUND
      );
    }

    return {
      data: {
        projectId: project.id,
        costing: project.costingData,
      },
    };
  }
}
