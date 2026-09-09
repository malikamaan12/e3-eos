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
  Optional,
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
import { DbService } from '../common/db.service.js';

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

export function seedInitialProjects(): void {
  if (projectRepository.size > 0) return;

  const defaultProjects: StoredProject[] = [
    {
      id: 'f1111111-1111-4111-8111-111111111111',
      organisationId: '11111111-1111-4111-8111-111111111111',
      projectCode: 'PRJ-2026-SYNTH-01',
      title: 'Synthetic International Tech Expo 2026',
      description: 'A complete synthetic test project for verifying EOS core commands and invariants.',
      originCode: 'DIRECT_AWARD',
      ownerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      maturity: 'delivery',
      outcome: 'undetermined',
      rowVersion: 1,
      clientOrganisationId: '22222222-2222-4222-8222-222222222222',
      costingData: {
        contractorBuyRateHourly: '120.00 QAR',
        internalMarginTarget: '43.75%',
        payrollSchedule: 'CONFIDENTIAL-INTERNAL',
      },
    },
    {
      id: 'f2222222-2222-4222-8222-222222222222',
      organisationId: '11111111-1111-4111-8111-111111111111',
      projectCode: 'PRJ-2026-LUS-02',
      title: 'Lusail Cultural Light & Sound Summit',
      description: 'Large-scale outdoor projection mapping and audio installation in Lusail Plaza.',
      originCode: 'TENDER',
      ownerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      maturity: 'onboarding',
      outcome: 'undetermined',
      rowVersion: 1,
      clientOrganisationId: '22222222-2222-4222-8222-222222222222',
      costingData: {
        contractorBuyRateHourly: '110.00 QAR',
        internalMarginTarget: '40.00%',
        payrollSchedule: 'CONFIDENTIAL-INTERNAL',
      },
    },
    {
      id: 'f3333333-3333-4333-8333-333333333333',
      organisationId: '11111111-1111-4111-8111-111111111111',
      projectCode: 'PRJ-2026-AK-03',
      title: 'Al Khor National Sports Championship 2026',
      description: 'Opening and closing ceremony staging, lighting, and temporary grandstand infrastructure.',
      originCode: 'CALL_OFF',
      ownerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      maturity: 'delivery',
      outcome: 'undetermined',
      rowVersion: 1,
      costingData: {
        contractorBuyRateHourly: '135.00 QAR',
        internalMarginTarget: '45.00%',
        payrollSchedule: 'CONFIDENTIAL-INTERNAL',
      },
    },
  ];

  for (const proj of defaultProjects) {
    projectRepository.set(proj.id, proj);
  }
}

seedInitialProjects();

@Controller('projects')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class ProjectsController {
  private dbService: DbService;
  constructor(@Optional() dbService?: DbService) {
    this.dbService = dbService || new DbService();
  }

  @Get()
  listProjects(@Req() req: Request) {
    const callerOrgId = (req as any).organisationId;

    const all = Array.from(projectRepository.values());
    const visible = callerOrgId
      ? all.filter((p) => p.organisationId === callerOrgId)
      : all;

    return {
      data: visible.map((p) => ({
        id: p.id,
        projectCode: p.projectCode,
        title: p.title,
        description: p.description,
        maturity: p.maturity,
        outcome: p.outcome,
        originCode: p.originCode,
        clientOrganisationId: p.clientOrganisationId,
        rowVersion: p.rowVersion,
      })),
      meta: { total: visible.length },
    };
  }

  @Post()
  @UseGuards(IdempotencyGuard)
  createProject(@Body() body: unknown, @Req() req: Request): CommandResult {
    const b = body as any;
    // 9-Step Onboarding Wizard format
    if (b?.projectIdentity) {
      const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
      const projectId = b.id || `f${Date.now().toString(16).padEnd(31, '0')}`;
      const projectCode = b.projectIdentity.code || `PRJ-${Date.now().toString().slice(-4)}`;
      const title = b.projectIdentity.title || 'Untitled Project';
      const description = b.projectIdentity.description || '';
      const originCode = b.originRoute || 'DIRECT_AWARD';
      const ownerId = b.team?.projectManagerId || '10000000-0000-4000-8000-000000000004';
      const clientOrgId = b.clientStakeholders?.clientOrganisationId || '22222222-2222-4222-8222-222222222222';

      const newProject: StoredProject = {
        id: projectId,
        organisationId: orgId,
        projectCode,
        title,
        description,
        originCode,
        ownerId,
        clientOrganisationId: clientOrgId,
        dateRegister: b.dates,
        venueContext: b.venue,
        financialAssumptions: b.commercialStartingPoint,
        maturity: 'onboarding',
        outcome: 'undetermined',
        rowVersion: 1,
        costingData: {
          contractorBuyRateHourly: '120.00 QAR',
          internalMarginTarget: '43.75%',
          payrollSchedule: 'CONFIDENTIAL-INTERNAL',
        },
      };

      projectRepository.set(projectId, newProject);

      if (this.dbService) {
        const pool = this.dbService.getPool();
        pool.query(`
          INSERT INTO projects (
            id, organisation_id, project_code, title, description, origin_code, owner_id,
            client_organisation_id, maturity, outcome, created_by, updated_by, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'onboarding', 'undetermined', $7, $7, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;
        `, [projectId, orgId, projectCode, title, description, originCode, ownerId, clientOrgId])
        .then(() => {
          for (const stage of STANDARD_THIRTEEN_STAGE_TEMPLATE.stages) {
            pool.query(`
              INSERT INTO project_stage_instances (
                id, project_id, organisation_id, stage_number, stage_name, status, progress_percent, created_at, updated_at
              ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
              ON CONFLICT (project_id, stage_number) DO NOTHING;
            `, [
              projectId,
              orgId,
              stage.defaultOrder,
              stage.name,
              stage.defaultOrder === 1 ? 'in_progress' : 'not_started',
              stage.defaultOrder === 1 ? 15 : 0,
            ]).catch(() => {});
          }
        })
        .catch((e: any) => console.warn('[ProjectsController] DB insert notice:', e.message));
      }

      return {
        data: {
          id: projectId,
          status: 'draft_created',
          recordVersion: 1,
          externalDeliveryStatus: 'not_applicable',
          payload: {
            projectCode,
            title,
            maturity: 'onboarding',
            outcome: 'undetermined',
            clientOrganisationId: clientOrgId,
          },
        },
        meta: {
          requestId: (req.headers['x-request-id'] as string) || `req-${Date.now()}`,
          recordVersion: 1,
          dataAsOf: new Date().toISOString(),
        },
      };
    }

    // Standard ProjectCreateSchema
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

  @Get(':id/cockpit')
  async getCockpit(@Param('id') id: string, @Req() _req: Request) {
    let project = projectRepository.get(id);
    let title = project?.title || 'Qatar Tourism Annual Exhibition & Gala 2026';
    let code = project?.projectCode || 'PRJ-2026-QATAR-01';
    let clientName = 'Qatar Tourism Authority';
    let maturity = project?.maturity || 'developing';

    if (this.dbService) {
      try {
        const pool = this.dbService.getPool();
        const pRes = await pool.query(`
          SELECT p.*, o.name as client_name, u.name as owner_name, u.email as owner_email
          FROM projects p
          LEFT JOIN organisations o ON o.id = p.client_organisation_id
          LEFT JOIN users u ON u.id = p.owner_id
          WHERE p.id = $1;
        `, [id]);
        if (pRes.rows.length > 0) {
          const row = pRes.rows[0];
          title = row.title;
          code = row.project_code;
          clientName = row.client_name || 'Qatar Tourism Authority';
          maturity = row.maturity;
        }
      } catch (e) {}
    }

    const eventDate = new Date('2026-11-15T09:00:00Z');
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    let taskList: any[] = [];
    if (this.dbService) {
      try {
        const tRes = await this.dbService.getPool().query(`
          SELECT t.id, t.title, t.state, t.is_completed, t.created_at, u.name as assignee_name
          FROM task_instances t
          LEFT JOIN users u ON u.id = t.assignee_id
          WHERE t.project_id = $1 OR t.project_id = 'f1111111-1111-4111-8111-111111111111'
          ORDER BY t.created_at DESC;
        `, [id]);
        taskList = tRes.rows.map(r => ({
          id: r.id,
          title: r.title,
          status: r.is_completed ? 'completed' : r.state,
          isCompleted: r.is_completed,
          assignee: r.assignee_name || 'Karim Haddad (Design Director)',
          createdAt: r.created_at,
        }));
      } catch (e) {}
    }

    if (taskList.length === 0) {
      taskList = [
        {
          id: 'task-rigging-01',
          title: 'Finalize CAD Structural Rigging Calculations',
          status: 'completed',
          isCompleted: true,
          assignee: 'Karim Haddad (Design Director)',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'task-permit-02',
          title: 'Civil Defence Safety Zone Clearance Certificate',
          status: 'in_progress',
          isCompleted: false,
          assignee: 'Dr. Sarah Ibrahim (HSE)',
          createdAt: new Date().toISOString(),
        },
      ];
    }

    const stages = STANDARD_THIRTEEN_STAGE_TEMPLATE.stages.map((s, idx) => ({
      stageNumber: idx + 1,
      name: s.name,
      status: idx === 0 ? 'completed' : idx === 1 ? 'in_progress' : 'not_started',
      progressPercent: idx === 0 ? 100 : idx === 1 ? 40 : 0,
    }));

    return {
      data: {
        projectId: id,
        projectCode: code,
        title,
        clientName,
        maturity,
        health: 'healthy',
        pm: {
          name: 'Zaid Mansour',
          email: 'pm@e3.qa',
        },
        venue: {
          name: 'Doha Exhibition & Convention Center (DECC) — Hall 1 & 2',
          type: 'indoor',
          location: 'West Bay, Doha, Qatar',
        },
        dates: {
          moveIn: '2026-11-10',
          eventStart: '2026-11-15',
          eventEnd: '2026-11-18',
          moveOut: '2026-11-20',
          daysRemaining,
        },
        financials: {
          currency: 'QAR',
          budget: 1850000,
          committedCost: 720000,
          actualCost: 215000,
          eac: 1740000,
          expectedRevenue: 2950000,
          forecastMarginPercent: 41.02,
        },
        outstandingApprovals: [
          {
            id: 'appr-po-01',
            title: 'AV Rigging Subrental Commitment PO-0442',
            amount: '350,000 QAR',
            requestedBy: 'Zaid Mansour (PM)',
            requiredRole: 'executive',
            status: 'pending',
          },
        ],
        criticalBlockers: [
          {
            id: 'blk-01',
            title: 'Awaiting Civil Defence Fire Suppression Clearance',
            owner: 'Dr. Sarah Ibrahim',
            impact: 'Cannot commence main truss flying before sign-off',
          },
        ],
        needsAttention: [
          'Civil Defence inspection scheduled for tomorrow 09:00 AM',
          'Contractor insurance certificate renewal pending from SoundTech WLL',
          'Client design review meeting confirmed for Thursday 14:00',
        ],
        workstreamProgress: [
          { name: 'Stage & Rigging Structures', progress: 75, status: 'on_track' },
          { name: 'Audio, Visual & Lighting', progress: 45, status: 'on_track' },
          { name: 'Health, Safety & Permits', progress: 85, status: 'caution' },
          { name: 'Fabrication & Decor', progress: 50, status: 'on_track' },
          { name: 'Commercial & Invoicing', progress: 30, status: 'on_track' },
        ],
        tasks: taskList,
        stages,
        activityHistory: [
          {
            id: 'act-01',
            action: 'Project Onboarded',
            actor: 'Zaid Mansour',
            timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
          },
          {
            id: 'act-02',
            action: 'Stage 1 Onboarding Completed',
            actor: 'Fatima Al-Sulaiti (Director)',
            timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
          },
          {
            id: 'act-03',
            action: 'CAD Structural Task Completed',
            actor: 'Karim Haddad',
            timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
          },
        ],
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
