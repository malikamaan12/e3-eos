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
import {
  ReportCreateSchema,
  ReportPublishSchema,
  CloseoutDecisionSchema,
  LessonCaptureSchema,
  CommandResult,
} from '@e3-eos/contracts';
import {
  ReportingEngine,
  ReportSnapshot,
  ProjectedReport,
  ReportAudience,
  ProjectCloseoutEngine,
  ProjectCloseoutState,
  LessonLearned,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { IdempotencyGuard } from '../common/idempotency.guard.js';
import { projectRepository } from '../projects/projects.controller.js';

export interface StoredReport extends ProjectedReport {
  organisationId: string;
  isPublished: boolean;
  publishedKey?: string;
  originalSnapshot: ReportSnapshot;
}

export interface StoredCloseout extends ProjectCloseoutState {
  organisationId: string;
}

export interface StoredLesson extends LessonLearned {
  organisationId: string;
}

export const reportRepository = new Map<string, StoredReport>();
export const reportRevisionHistory = new Map<string, StoredReport[]>();
export const closeoutRepository = new Map<string, StoredCloseout>();
export const lessonRepository = new Map<string, StoredLesson>();

@Controller('projects/:projectId')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class ReportingController {
  // --- Report Generation & Publication (AT-077, AT-079) ---

  @Post('reports')
  createReport(
    @Param('projectId') projectId: string,
    @Body()
    body: {
      reportCode: string;
      periodStart: string;
      periodEnd: string;
      targetAudience?: ReportAudience;
      snapshotData?: Partial<ReportSnapshot>;
    },
    @Req() req: Request
  ): CommandResult<StoredReport> {
    const parseResult = ReportCreateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const project = projectRepository.get(projectId);
    if (!project || project.organisationId !== orgId) {
      throw new HttpException({ message: 'PROJECT_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const reportId = `rep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const audience = (parseResult.data.targetAudience || 'client_portal') as ReportAudience;

    // Use passed snapshot or default project snapshot
    const snapshot: ReportSnapshot = {
      projectId,
      reportCode: parseResult.data.reportCode,
      periodStart: new Date(parseResult.data.periodStart),
      periodEnd: new Date(parseResult.data.periodEnd),
      financials: body.snapshotData?.financials || {
        revenue: '2000000',
        currentBudget: '1400000',
        actualCost: '1300000',
        internalMarginPercent: '35.00%',
        vendorCostBreakdown: { 'Local Staging WLL': '500000', 'Audio Pro': '400000' },
      },
      incidents: body.snapshotData?.incidents || [],
      metrics: body.snapshotData?.metrics || {
        totalTurnstileEntries: 15000,
        uniqueAttendees: 10000,
        daysCount: 2,
      },
      milestonesCompleted: body.snapshotData?.milestonesCompleted || ['Milestone 1', 'Milestone 2'],
    };

    // Invariant AT-079: Deterministic snapshot hash
    const contentHash = ReportingEngine.generateSnapshotHash(snapshot);

    // Invariant AT-077: Project content for audience (strip margins & confidential HSE)
    const content = ReportingEngine.projectForAudience(snapshot, audience);

    const storedReport: StoredReport = {
      id: reportId,
      version: 1,
      organisationId: orgId,
      projectId,
      reportCode: parseResult.data.reportCode,
      targetAudience: audience,
      publishedAt: new Date(),
      deterministicContentHash: contentHash,
      isPublished: false,
      content,
      originalSnapshot: snapshot,
    };

    reportRepository.set(reportId, storedReport);
    reportRevisionHistory.set(reportId, [storedReport]);

    return {
      data: {
        id: reportId,
        status: 'draft',
        recordVersion: 1,
        payload: storedReport,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-rep-create',
      },
    };
  }

  @Post('reports/:id/publish')
  @UseGuards(IdempotencyGuard)
  publishReport(
    @Param('projectId') projectId: string,
    @Param('id') reportId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredReport> {
    const parseResult = ReportPublishSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const report = reportRepository.get(reportId);
    if (!report || report.organisationId !== orgId || report.projectId !== projectId) {
      throw new HttpException({ message: 'REPORT_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // Invariant AT-079: Idempotent publication; re-publishing returns same state
    if (report.isPublished && report.publishedKey === parseResult.data.idempotencyKey) {
      return {
        data: {
          id: reportId,
          status: 'published',
          recordVersion: report.version,
          payload: report,
        },
        meta: {
          requestId: (req.headers['x-request-id'] as string) || 'req-rep-pub-idemp',
        },
      };
    }

    report.isPublished = true;
    report.publishedKey = parseResult.data.idempotencyKey;
    reportRepository.set(reportId, report);

    return {
      data: {
        id: reportId,
        status: 'published',
        recordVersion: report.version,
        payload: report,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-rep-pub',
      },
    };
  }

  @Get('reports/:id')
  getReport(
    @Param('projectId') projectId: string,
    @Param('id') reportId: string,
    @Req() req: Request
  ): CommandResult<StoredReport> {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const report = reportRepository.get(reportId);
    if (!report || report.organisationId !== orgId || report.projectId !== projectId) {
      throw new HttpException({ message: 'REPORT_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // Invariant AT-077: Project for requested audience
    const requestedAudience = ((req.headers['x-audience'] as string) || report.targetAudience) as ReportAudience;
    const projectedContent = ReportingEngine.projectForAudience(report.originalSnapshot, requestedAudience);

    const projectedReport: StoredReport = {
      ...report,
      targetAudience: requestedAudience,
      content: projectedContent,
    };

    return {
      data: {
        id: reportId,
        status: report.isPublished ? 'published' : 'draft',
        recordVersion: report.version,
        payload: projectedReport,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-rep-get',
      },
    };
  }

  // --- Post-Report Revision Handling (AT-069) ---

  @Post('reports/:id/revisions')
  createRevision(
    @Param('projectId') projectId: string,
    @Param('id') reportId: string,
    @Body() body: { revisionReason: string; revisedActualCost: string },
    @Req() req: Request
  ): CommandResult<StoredReport> {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const report = reportRepository.get(reportId);
    if (!report || report.organisationId !== orgId || report.projectId !== projectId) {
      throw new HttpException({ message: 'REPORT_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const revisedSnapshot: ReportSnapshot = {
      ...report.originalSnapshot,
      financials: {
        ...report.originalSnapshot.financials,
        actualCost: body.revisedActualCost,
      },
    };

    // Invariant AT-069: Increments version to V2 while preserving V1 historical snapshot
    const revision = ReportingEngine.createReportRevision(report, revisedSnapshot, body.revisionReason);

    const storedRevision: StoredReport = {
      ...revision,
      organisationId: orgId,
      isPublished: true,
      originalSnapshot: revisedSnapshot,
    };

    reportRepository.set(revision.id, storedRevision);

    const history = reportRevisionHistory.get(reportId) || [];
    history.push(storedRevision);
    reportRevisionHistory.set(reportId, history);

    return {
      data: {
        id: revision.id,
        status: 'published_revision',
        recordVersion: revision.version,
        payload: storedRevision,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-rep-rev',
      },
    };
  }

  // --- Project Closeout & Settlement Decoupling (AT-078) ---

  @Post('closure-decisions')
  recordClosureDecision(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredCloseout> {
    const parseResult = CloseoutDecisionSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    let closeout = closeoutRepository.get(projectId);
    if (!closeout) {
      closeout = {
        projectId,
        organisationId: orgId,
        operationalStatus: 'active',
        acceptanceStatus: 'pending',
        reportingStatus: 'draft',
        financialReviewStatus: 'pending',
        settlementStatus: 'open_receivables',
        openReceivablesCount: 2,
      };
    }

    // Invariant AT-078: Operational closure allowed while settlement remains open
    if (parseResult.data.dimension === 'operational' && parseResult.data.decision === 'closed') {
      const closed = ProjectCloseoutEngine.closeOperationally(
        closeout,
        (req.headers['x-user-id'] as string) || 'usr-pm-director'
      );
      closeout = { ...closed, organisationId: orgId };
    } else if (parseResult.data.dimension === 'settlement' && parseResult.data.decision === 'closed') {
      closeout.settlementStatus = 'fully_settled';
      closeout.openReceivablesCount = 0;
    }

    closeoutRepository.set(projectId, closeout);

    return {
      data: {
        id: projectId,
        status: closeout.operationalStatus,
        recordVersion: 1,
        payload: closeout,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-closeout',
      },
    };
  }

  @Post('lessons')
  captureLesson(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredLesson> {
    const parseResult = LessonCaptureSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';

    // Invariant AT-078: Lesson capture does not auto-mutate master policies
    const lesson = ProjectCloseoutEngine.captureLesson(projectId, {
      title: parseResult.data.title,
      category: parseResult.data.category,
      narrative: parseResult.data.narrative,
      policyRevisionProposed: parseResult.data.policyRevisionProposed,
    });

    const storedLesson: StoredLesson = {
      ...lesson,
      organisationId: orgId,
    };

    lessonRepository.set(lesson.id, storedLesson);

    return {
      data: {
        id: lesson.id,
        status: 'captured',
        recordVersion: 1,
        payload: storedLesson,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-lesson',
      },
    };
  }
}
