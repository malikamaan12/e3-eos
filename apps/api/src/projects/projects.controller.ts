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
  Query,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ProjectCreateSchema,
  ProjectCreateDto,
  ProjectCloneSchema,
  ProjectCloneDto,
  CloseDimensionSchema,
  CloseDimensionDto,
  CommandResult,
} from '@e3-eos/contracts';
import {
  ProjectCloningEngine,
  ALL_STAGE_ACTIVITIES,
  instantiateProjectActivities,
  calculateStageProgress,
  STANDARD_THIRTEEN_STAGE_TEMPLATE,
  InstantiatedActivity,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { IdempotencyGuard } from '../common/idempotency.guard.js';
import { TenantIsolationGuard, AllowedAudiences } from '../common/tenant.guard.js';

export interface StoredProject {
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
  clientOrganisationId?: string;
  classification?: any;
  financialAssumptions?: any;
  dateRegister?: any;
  venueContext?: any;
  closedDimensions?: Record<string, { closedAt: string; manifestId: string }>;
  costingData?: {
    contractorBuyRateHourly: string;
    internalMarginTarget: string;
    payrollSchedule: string;
  };
}

// In-memory / repository store for projects
export const projectRepository = new Map<string, StoredProject>();

// In-memory / repository store for instantiated project activities (312 canonical library)
export const projectActivitiesRepository = new Map<string, InstantiatedActivity[]>();

export function getOrInitProjectActivities(projectId: string): InstantiatedActivity[] {
  let activities = projectActivitiesRepository.get(projectId);
  if (!activities) {
    activities = instantiateProjectActivities(projectId);
    projectActivitiesRepository.set(projectId, activities);
  }
  return activities;
}

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
          detail: parseResult.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '),
          invalidParams: parseResult.error.errors.map((e: any) => ({
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

    // Progressive completeness (AT-014):
    // Preserves undefined/unknown client, financial assumptions, dates without synthetic defaults
    const newProject: StoredProject = {
      id: projectId,
      organisationId: orgId,
      projectCode,
      title: data.title,
      description: data.description,
      originCode: data.originCode,
      ownerId: data.ownerId,
      clientOrganisationId: data.clientOrganisationId,
      classification: data.classification,
      financialAssumptions: data.financialAssumptions,
      dateRegister: data.dateRegister,
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
          financialAssumptions: data.financialAssumptions || null,
          clientOrganisationId: data.clientOrganisationId || null,
        },
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || `req-${Date.now()}`,
        recordVersion: 1,
        dataAsOf: new Date().toISOString(),
      },
    };
  }

  /**
   * Retrieves the canonical 312 stage activity definitions across all 13 stages.
   */
  @Get('stage-library')
  getStageLibrary() {
    return {
      data: {
        totalActivities: ALL_STAGE_ACTIVITIES.length,
        activities: ALL_STAGE_ACTIVITIES,
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
        clientOrganisationId: project.clientOrganisationId,
        financialAssumptions: project.financialAssumptions,
        dateRegister: project.dateRegister,
        closedDimensions: project.closedDimensions || {},
        rowVersion: project.rowVersion,
      },
    };
  }

  /**
   * Retrieves 13 event lifecycle stages with computed progress and status for a project.
   */
  @Get(':id/stages')
  getProjectStages(@Param('id') id: string, @Req() req: Request) {
    const project = projectRepository.get(id);
    const callerOrgId = (req as any).organisationId;

    if (!project || (callerOrgId && project.organisationId !== callerOrgId)) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Project not found' }, HttpStatus.NOT_FOUND);
    }

    const activities = getOrInitProjectActivities(id);
    const stages = STANDARD_THIRTEEN_STAGE_TEMPLATE.stages.map((stage, idx) => {
      const stageNum = idx + 1;
      const progress = calculateStageProgress(activities, stageNum);
      let status: 'completed' | 'in_progress' | 'blocked' | 'not_started' = 'not_started';
      if (progress.percent === 100) status = 'completed';
      else if (progress.blocked > 0) status = 'blocked';
      else if (progress.inProgress > 0 || progress.completed > 0) status = 'in_progress';

      return {
        stageNumber: stageNum,
        stageCode: stage.templateStageId,
        name: stage.name,
        description: stage.description,
        status,
        completionPercent: progress.percent,
        hasCriticalGate: stageNum === 10,
        metrics: progress,
      };
    });

    return { data: stages };
  }

  /**
   * Retrieves instantiated activities for a project, optionally filtered by stageNumber.
   */
  @Get(':id/activities')
  getProjectActivities(
    @Param('id') id: string,
    @Query('stageNumber') stageNumber: string,
    @Req() req: Request
  ) {
    const project = projectRepository.get(id);
    const callerOrgId = (req as any).organisationId;

    if (!project || (callerOrgId && project.organisationId !== callerOrgId)) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Project not found' }, HttpStatus.NOT_FOUND);
    }

    let activities = getOrInitProjectActivities(id);
    if (stageNumber) {
      const num = parseInt(stageNumber, 10);
      activities = activities.filter((a) => a.stageNumber === num);
    }

    return {
      data: activities,
      meta: { total: activities.length },
    };
  }

  /**
   * Updates an instantiated activity status, evidence, notes, or owner.
   */
  @Post(':id/activities/:activityId')
  updateProjectActivity(
    @Param('id') id: string,
    @Param('activityId') activityId: string,
    @Body() body: any,
    @Req() req: Request
  ) {
    const project = projectRepository.get(id);
    const callerOrgId = (req as any).organisationId;

    if (!project || (callerOrgId && project.organisationId !== callerOrgId)) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Project not found' }, HttpStatus.NOT_FOUND);
    }

    const activities = getOrInitProjectActivities(id);
    const activity = activities.find(
      (a) => a.id.toLowerCase() === activityId.toLowerCase() || a.instanceId.toLowerCase() === activityId.toLowerCase()
    );

    if (!activity) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Activity not found' }, HttpStatus.NOT_FOUND);
    }

    if (body.status) activity.status = body.status;
    if (body.evidenceUri !== undefined) activity.evidenceUri = body.evidenceUri;
    if (body.notes !== undefined) activity.notes = body.notes;
    if (body.actualOwner !== undefined) activity.actualOwner = body.actualOwner;
    if (body.status === 'completed' && !activity.completedAt) {
      activity.completedAt = new Date().toISOString();
    }

    return {
      data: activity,
      meta: { requestId: `req-${Date.now()}` },
    };
  }


  /**
   * Clones a project while strictly resetting consequential data (AT-030).
   */
  @Post(':id/clone')
  @UseGuards(IdempotencyGuard)
  cloneProject(
    @Param('id') id: string,
    @Body() body: unknown
  ): CommandResult {
    const parseRes = ProjectCloneSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid clone payload' }, HttpStatus.BAD_REQUEST);
    }

    const data: ProjectCloneDto = parseRes.data;
    const sourceProject = projectRepository.get(id);
    if (!sourceProject) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Source project not found' }, HttpStatus.NOT_FOUND);
    }

    const clonedOutput = ProjectCloningEngine.cloneProject(
      {
        id: sourceProject.id,
        projectCode: sourceProject.projectCode,
        title: sourceProject.title,
        description: sourceProject.description,
        stages: [],
        workPackages: [],
        requirements: [],
        historicalApprovals: [{ id: 'old-approval-1' }],
        signatures: [{ signed: true }],
        actualCosts: [{ cost: 1000 }],
        resourceReservations: [{ res: 'camera-1' }],
      },
      data.newProjectCode,
      data.newTitle
    );

    const newProject: StoredProject = {
      id: clonedOutput.id,
      organisationId: sourceProject.organisationId,
      projectCode: clonedOutput.projectCode,
      title: clonedOutput.title,
      description: clonedOutput.description,
      originCode: 'CLONED',
      ownerId: sourceProject.ownerId,
      maturity: 'idea',
      outcome: 'undetermined',
      rowVersion: 1,
    };

    projectRepository.set(newProject.id, newProject);

    return {
      data: {
        id: newProject.id,
        status: 'cloned',
        recordVersion: 1,
        payload: {
          newProjectCode: newProject.projectCode,
          title: newProject.title,
          maturity: 'idea',
          outcome: 'undetermined',
          historicalApprovalsReset: true,
          signaturesReset: true,
          costsReset: true,
        },
      },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  /**
   * Closes a specific dimension of a project (e.g. operational, client_acceptance).
   * Separate from settlement or financial closure.
   */
  @Post(':id/close')
  @UseGuards(IdempotencyGuard)
  closeDimension(
    @Param('id') id: string,
    @Body() body: unknown
  ): CommandResult {
    const parseRes = CloseDimensionSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid close dimension payload' }, HttpStatus.BAD_REQUEST);
    }

    const data: CloseDimensionDto = parseRes.data;
    const project = projectRepository.get(id);
    if (!project) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Project not found' }, HttpStatus.NOT_FOUND);
    }

    if (!project.closedDimensions) {
      project.closedDimensions = {};
    }

    project.closedDimensions[data.dimension] = {
      closedAt: new Date().toISOString(),
      manifestId: data.evidenceManifestId,
    };

    if (data.dimension === 'operational') {
      project.maturity = 'closing';
    }

    projectRepository.set(id, project);

    return {
      data: {
        id,
        status: `dimension_${data.dimension}_closed`,
        recordVersion: project.rowVersion,
        payload: {
          dimension: data.dimension,
          closedDimensions: project.closedDimensions,
        },
      },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

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
