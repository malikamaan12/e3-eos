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
  RequirementCreateSchema,
  RequirementCreateDto,
  RequirementDispositionSchema,
  RequirementDispositionDto,
  ClarificationCreateSchema,
  ClarificationCreateDto,
  ClarificationRespondSchema,
  ClarificationRespondDto,
  RiskCreateSchema,
  RiskCreateDto,
  QualificationDecisionSchema,
  QualificationDecisionDto,
  CommandResult,
} from '@e3-eos/contracts';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { IdempotencyGuard } from '../common/idempotency.guard.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { projectRepository } from '../projects/projects.controller.js';

export interface StoredRequirement {
  id: string;
  organisationId: string;
  projectId: string;
  title: string;
  description: string;
  sourceReference?: string;
  ownerId?: string;
  deliverablePackageId?: string;
  disposition: string;
  createdAt: string;
}

export const requirementRepository = new Map<string, StoredRequirement>();
export const clarificationRepository = new Map<string, any>();
export const riskRepository = new Map<string, any>();

@Controller('projects/:projectId')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class ScopeController {
  @Post('requirements')
  @UseGuards(IdempotencyGuard)
  createRequirement(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult {
    const parseRes = RequirementCreateSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException(
        {
          code: 'INVALID_ARGUMENT',
          title: 'Requirement validation failed',
          detail: parseRes.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const data: RequirementCreateDto = parseRes.data;
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';

    const reqId = `req-${Date.now()}`;
    const newReq: StoredRequirement = {
      id: reqId,
      organisationId: orgId,
      projectId,
      title: data.title,
      description: data.description,
      sourceReference: data.sourceReference,
      ownerId: data.ownerId,
      deliverablePackageId: data.deliverablePackageId,
      disposition: 'applicability_unknown',
      createdAt: new Date().toISOString(),
    };

    requirementRepository.set(reqId, newReq);

    return {
      data: {
        id: reqId,
        status: 'created',
        recordVersion: 1,
        payload: newReq,
      },
      meta: {
        requestId: `req-${Date.now()}`,
        dataAsOf: new Date().toISOString(),
      },
    };
  }

  @Get('requirements')
  getRequirements(@Param('projectId') projectId: string, @Req() req: Request) {
    const orgId = (req as any).organisationId;
    const reqs = Array.from(requirementRepository.values()).filter(
      (r) => r.projectId === projectId && (!orgId || r.organisationId === orgId)
    );

    const total = reqs.length;
    const missingDeliverables = reqs.filter((r) => !r.deliverablePackageId && r.disposition !== 'not_applicable');
    const missingOwners = reqs.filter((r) => !r.ownerId && r.disposition !== 'not_applicable');
    const satisfied = reqs.filter((r) => r.disposition === 'satisfied' || r.disposition === 'not_applicable');

    const coverageRatio = total > 0 ? `${((satisfied.length / total) * 100).toFixed(1)}%` : '100%';

    return {
      data: {
        projectId,
        requirements: reqs,
        coverageReport: {
          totalRequirements: total,
          satisfiedCount: satisfied.length,
          missingDeliverableCount: missingDeliverables.length,
          missingOwnerCount: missingOwners.length,
          coverageRatio,
          unassignedDeliverables: missingDeliverables.map((r) => ({ id: r.id, title: r.title })),
        },
      },
    };
  }

  @Post('requirements/:reqId/disposition')
  @UseGuards(IdempotencyGuard)
  updateDisposition(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string,
    @Body() body: unknown
  ): CommandResult {
    const parseRes = RequirementDispositionSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException(
        { code: 'INVALID_ARGUMENT', title: 'Invalid disposition payload' },
        HttpStatus.BAD_REQUEST
      );
    }

    const data: RequirementDispositionDto = parseRes.data;
    const req = requirementRepository.get(reqId);
    if (!req || req.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Requirement not found' }, HttpStatus.NOT_FOUND);
    }

    req.disposition = data.disposition;
    requirementRepository.set(reqId, req);

    return {
      data: {
        id: reqId,
        status: 'disposition_recorded',
        recordVersion: 2,
        payload: { disposition: data.disposition, rationale: data.rationale },
      },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Post('clarifications')
  @UseGuards(IdempotencyGuard)
  createClarification(
    @Param('projectId') projectId: string,
    @Body() body: unknown
  ): CommandResult {
    const parseRes = ClarificationCreateSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid clarification' }, HttpStatus.BAD_REQUEST);
    }

    const data: ClarificationCreateDto = parseRes.data;
    const clarId = `clar-${Date.now()}`;
    const clar = {
      id: clarId,
      projectId,
      question: data.question,
      source: data.source,
      dueAt: data.dueAt,
      status: 'open',
    };
    clarificationRepository.set(clarId, clar);

    return {
      data: { id: clarId, status: 'open', recordVersion: 1, payload: clar },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Post('clarifications/:clarId/respond')
  @UseGuards(IdempotencyGuard)
  respondClarification(
    @Param('projectId') projectId: string,
    @Param('clarId') clarId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult {
    const parseRes = ClarificationRespondSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid response' }, HttpStatus.BAD_REQUEST);
    }

    const data: ClarificationRespondDto = parseRes.data;
    const clar = clarificationRepository.get(clarId);
    if (!clar || clar.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Clarification not found' }, HttpStatus.NOT_FOUND);
    }

    clar.status = 'answered';
    clar.response = data.response;
    clar.respondedBy = (req as any).actorId;
    clarificationRepository.set(clarId, clar);

    return {
      data: { id: clarId, status: 'answered', recordVersion: 2, payload: clar },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Post('risks')
  @UseGuards(IdempotencyGuard)
  createRisk(
    @Param('projectId') projectId: string,
    @Body() body: unknown
  ): CommandResult {
    const parseRes = RiskCreateSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid risk payload' }, HttpStatus.BAD_REQUEST);
    }

    const data: RiskCreateDto = parseRes.data;
    const riskId = `risk-${Date.now()}`;
    const risk = { id: riskId, projectId, ...data };
    riskRepository.set(riskId, risk);

    return {
      data: { id: riskId, status: 'recorded', recordVersion: 1, payload: risk },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Post('qualification-decisions')
  @UseGuards(IdempotencyGuard)
  recordQualificationDecision(
    @Param('projectId') projectId: string,
    @Body() body: unknown
  ): CommandResult {
    const parseRes = QualificationDecisionSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid decision payload' }, HttpStatus.BAD_REQUEST);
    }

    const data: QualificationDecisionDto = parseRes.data;
    const project = projectRepository.get(projectId);
    if (!project) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Project not found' }, HttpStatus.NOT_FOUND);
    }

    // If decision is 'no_go', project maturity becomes 'closed' and outcome is 'lost' (AT-015)
    if (data.decision === 'no_go') {
      project.maturity = 'closed';
      project.outcome = 'lost';
    } else if (data.decision === 'pursue') {
      project.maturity = 'developing';
    } else if (data.decision === 'pause') {
      project.maturity = 'developing';
    }

    projectRepository.set(projectId, project);

    return {
      data: {
        id: `qual-${Date.now()}`,
        status: data.decision,
        recordVersion: project.rowVersion,
        payload: {
          decision: data.decision,
          rationale: data.rationale,
          updatedProjectMaturity: project.maturity,
          updatedProjectOutcome: project.outcome,
        },
      },
      meta: { requestId: `req-${Date.now()}` },
    };
  }
}
