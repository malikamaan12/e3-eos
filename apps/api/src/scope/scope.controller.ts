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
import {
  ScopeRequirement,
  evaluateRequirementTraceability,
  generateRequirementsMatrix,
  assessClarificationImpact,
  getUrgentClarifications,
  ClarificationItem,
  RequirementCategory,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { IdempotencyGuard } from '../common/idempotency.guard.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { projectRepository } from '../projects/projects.controller.js';

export interface StoredRequirement extends ScopeRequirement {
  organisationId: string;
}

export const requirementRepository = new Map<string, StoredRequirement>();
export const clarificationRepository = new Map<string, ClarificationItem & { organisationId?: string }>();
export const riskRepository = new Map<string, any>();

function seedInitialScope() {
  const projectIds = [
    '00000000-0000-4000-8000-000000000001',
    'f1111111-1111-4111-8111-111111111111',
  ];
  const orgId = '11111111-1111-4111-8111-111111111111';

  for (const projectId of projectIds) {
    const r1: StoredRequirement = {
      id: `req-001-${projectId.slice(0, 8)}`,
      organisationId: orgId,
      projectId,
      code: 'REQ-QND-001',
      title: 'Main Ceremony 360-Degree Kinetic LED Arch — General Elevation',
      description: 'Continuous 360-degree motorized kinetic LED arch spanning Lusail Boulevard central court.',
      category: 'creative_visual',
      sourceReference: 'RFP Section 4.2.1 - Kinetic Arch Specs',
      ownerId: '10000000-0000-4000-8000-000000000004',
      ownerName: 'Karim Haddad (Technical Director)',
      dueDate: '2026-11-15T00:00:00Z',
      disposition: 'applicable',
      linkedDocumentId: 'doc-001',
      linkedDocumentNumber: 'E3-QND26-AV-DWG-0001',
      linkedDesignId: 'des-001',
      linkedDesignVersion: 'Rev 01',
      linkedBoqLineCode: 'BOQ-AV-001',
      targetCostQar: 450000,
      approvalRequestId: 'appr-req-001',
      isApproved: true,
      deliveryEvidenceHash: 'sha256-d41d8cd98f00b204e9800998ecf8427e',
      fulfillmentStatus: 'approved',
      createdAt: '2026-09-08T10:00:00Z',
    };

    const r2: StoredRequirement = {
      id: `req-002-${projectId.slice(0, 8)}`,
      organisationId: orgId,
      projectId,
      code: 'REQ-QND-002',
      title: 'Lusail Boulevard Royal Pavilion Structural Load Calculations & Footings',
      description: 'Engineered footings, ballast calculations, and deadweight wind stability up to 75 km/h.',
      category: 'staging_technical',
      sourceReference: 'RFP Section 3.1.4 - Substructure Weight Bearing',
      ownerId: '10000000-0000-4000-8000-000000000002',
      ownerName: 'Civil Defence Certified Structural Engineer',
      dueDate: '2026-11-10T00:00:00Z',
      disposition: 'applicable',
      linkedDocumentId: 'doc-002',
      linkedDocumentNumber: 'E3-QND26-STG-DWG-0002',
      linkedDesignId: 'des-002',
      linkedDesignVersion: 'Rev A',
      linkedBoqLineCode: 'BOQ-STG-002',
      targetCostQar: 780000,
      approvalRequestId: 'appr-req-002',
      isApproved: true,
      fulfillmentStatus: 'in_design',
      createdAt: '2026-09-09T14:30:00Z',
    };

    const r3: StoredRequirement = {
      id: `req-003-${projectId.slice(0, 8)}`,
      organisationId: orgId,
      projectId,
      code: 'REQ-QND-003',
      title: 'Fire Safety & Flame-Retardant Material Specifications (Law No. 13 Compliance)',
      description: 'Qatar Civil Defence Department (QCDD) certified fire-resistant drapes, scenic fabrics, and ingress lanes.',
      category: 'health_safety',
      sourceReference: 'Qatar Law No. 13 of 1997 / QCDD Regulations',
      ownerId: '10000000-0000-4000-8000-000000000005',
      ownerName: 'HSE & Civil Defence Lead',
      dueDate: '2026-11-01T00:00:00Z',
      disposition: 'applicable',
      linkedDocumentId: 'doc-003',
      linkedDocumentNumber: 'E3-QND26-HSE-SPC-0003',
      linkedBoqLineCode: 'BOQ-HSE-003',
      targetCostQar: 125000,
      fulfillmentStatus: 'costed',
      createdAt: '2026-09-07T09:00:00Z',
    };

    const r4: StoredRequirement = {
      id: `req-004-${projectId.slice(0, 8)}`,
      organisationId: orgId,
      projectId,
      code: 'REQ-QND-004',
      title: 'VIP Royal Protocol Red Carpet & Shaded Holding Majlis',
      description: 'Ceremonial protocol carpet, shaded arrival portico, and Amiri Diwan secure access perimeter.',
      category: 'protocol_ceremony',
      sourceReference: 'Amiri Diwan Protocol Manual Section 7',
      dueDate: '2026-11-20T00:00:00Z',
      disposition: 'applicable',
      fulfillmentStatus: 'unassigned',
      createdAt: '2026-09-10T12:00:00Z',
    };

    requirementRepository.set(r1.id, r1);
    requirementRepository.set(r2.id, r2);
    requirementRepository.set(r3.id, r3);
    requirementRepository.set(r4.id, r4);

    const c1: ClarificationItem & { organisationId?: string } = {
      id: `clar-001-${projectId.slice(0, 8)}`,
      projectId,
      organisationId: orgId,
      clarificationCode: 'RFI-QND-001',
      title: 'Structural Rigging Load on Boulevard Pylons',
      question: 'Confirm maximum permissible structural rigging load on Lusail Boulevard arch pylons.',
      category: 'technical',
      discipline: 'rigging',
      source: 'bidder_inquiry',
      author: 'Karim Haddad (Technical Director)',
      assignedResponder: 'Venue Technical Authority',
      dateRaised: '2026-09-08T09:00:00Z',
      targetResponseDate: '2026-09-12T18:00:00Z',
      dueAt: '2026-09-12T18:00:00Z',
      hasCommercialImpact: false,
      hasScheduleImpact: false,
      rfpSectionRef: 'Section 4.2.1',
      submittedAt: '2026-09-08T09:00:00Z',
      status: 'answered',
      response: 'Rigging load certified up to 14.5 metric tonnes per arch leg with dual safety factor.',
      respondedBy: 'Karim Haddad (Technical Director)',
      respondedAt: '2026-09-09T11:00:00Z',
      impact: assessClarificationImpact({
        response: 'Certified 14.5 metric tonnes',
        costDeltaQar: 0,
        scheduleDeltaDays: 0,
        scopeAltered: false,
      }),
      linkedRequirementIds: ['REQ-QND-001', 'REQ-QND-002'],
      linkedDesignIds: ['DES-001'],
      linkedBoqLineCodes: ['BOQ-AV-001'],
      linkedScheduleTaskIds: ['TSK-02'],
      linkedDocumentNumbers: ['E3-QND26-AV-DWG-0001'],
      createdAt: '2026-09-08T09:00:00Z',
    };

    const c2: ClarificationItem & { organisationId?: string } = {
      id: `clar-002-${projectId.slice(0, 8)}`,
      projectId,
      organisationId: orgId,
      clarificationCode: 'RFI-QND-002',
      title: 'Drone Rehearsal Window Airspace Extension',
      question: 'Request extension of live drone rehearsal window by 24 hours due to Hamad International airspace corridor.',
      category: 'schedule',
      discipline: 'operations',
      source: 'client_query',
      author: 'Fatima Al-Sulaiti (PM)',
      assignedResponder: 'Civil Aviation Authority',
      dateRaised: '2026-09-10T11:00:00Z',
      targetResponseDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      dueAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      hasCommercialImpact: true,
      hasScheduleImpact: true,
      rfpSectionRef: 'Schedule Addendum C',
      submittedAt: '2026-09-10T11:00:00Z',
      status: 'submitted_to_client',
      impact: assessClarificationImpact({
        costDeltaQar: 45000,
        scheduleDeltaDays: 1,
        scopeAltered: true,
      }),
      linkedRequirementIds: ['REQ-QND-001'],
      linkedDesignIds: [],
      linkedBoqLineCodes: ['BOQ-STR-010'],
      linkedScheduleTaskIds: ['TSK-03'],
      linkedDocumentNumbers: ['E3-QND26-AV-DWG-0001'],
      createdAt: '2026-09-10T11:00:00Z',
    };

    clarificationRepository.set(c1.id, c1);
    clarificationRepository.set(c2.id, c2);
  }
}

seedInitialScope();

@Controller('projects/:projectId')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class ScopeController {
  @Get('requirements/traceability')
  getTraceabilityMatrix(@Param('projectId') projectId: string) {
    const reqs = Array.from(requirementRepository.values()).filter((r) => r.projectId === projectId);
    const matrix = generateRequirementsMatrix(projectId, reqs);
    return { data: matrix };
  }

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

    const reqCount = Array.from(requirementRepository.values()).filter((r) => r.projectId === projectId).length;
    const reqCode = data.code || `REQ-QND-${String(reqCount + 1).padStart(3, '0')}`;
    const reqId = `req-${Date.now()}`;

    const newReq: StoredRequirement = {
      id: reqId,
      organisationId: orgId,
      projectId,
      code: reqCode,
      title: data.title,
      description: data.description,
      sourceReference: data.sourceReference || 'Tender Specifications',
      category: (data.category as RequirementCategory) || 'staging_technical',
      ownerId: data.ownerId,
      dueDate: data.dueDate,
      deliverablePackageId: data.deliverablePackageId,
      disposition: 'applicable',
      linkedDocumentId: data.linkedDocumentId,
      linkedDocumentNumber: data.linkedDocumentNumber,
      linkedDesignId: data.linkedDesignId,
      linkedDesignVersion: data.linkedDesignVersion,
      linkedBoqLineCode: data.linkedBoqLineCode,
      linkedTaskId: data.linkedTaskId,
      targetCostQar: data.targetCostQar,
      createdAt: new Date().toISOString(),
    };

    requirementRepository.set(reqId, newReq);
    const evalResult = evaluateRequirementTraceability(newReq);

    return {
      data: {
        id: reqId,
        status: 'created',
        recordVersion: 1,
        payload: {
          ...newReq,
          traceability: evalResult,
        },
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

  @Get('clarifications')
  getClarifications(@Param('projectId') projectId: string) {
    const list = Array.from(clarificationRepository.values()).filter((c) => c.projectId === projectId);
    const urgent = getUrgentClarifications(list);
    return {
      data: list,
      meta: {
        total: list.length,
        urgentCount: urgent.length,
        urgent,
      },
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
    const clarCount = Array.from(clarificationRepository.values()).filter((c) => c.projectId === projectId).length;
    const clarCode = `RFI-QND-${String(clarCount + 1).padStart(3, '0')}`;
    const clarId = `clar-${Date.now()}`;
    const impact = assessClarificationImpact({
      costDeltaQar: data.costDeltaQar,
      scheduleDeltaDays: data.scheduleDeltaDays,
      scopeAltered: data.scopeAltered,
    });

    const clar: ClarificationItem & { organisationId?: string } = {
      id: clarId,
      projectId,
      clarificationCode: clarCode,
      title: (data as any).title || data.question.slice(0, 60),
      question: data.question,
      category: (data.category as any) || 'technical',
      discipline: (data as any).discipline || 'staging',
      source: (data.source as any) || 'bidder_inquiry',
      author: (data as any).author || 'Project Lead',
      assignedResponder: (data as any).assignedResponder || 'Lead PM',
      dateRaised: new Date().toISOString(),
      targetResponseDate: data.dueAt || new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
      dueAt: data.dueAt || new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
      hasCommercialImpact: Boolean(impact.hasCostImpact),
      hasScheduleImpact: Boolean(impact.hasScheduleImpact),
      rfpSectionRef: data.rfpSectionRef,
      status: 'submitted_to_client',
      impact,
      linkedRequirementIds: data.linkedRequirementIds || [],
      linkedDesignIds: (data as any).linkedDesignIds || [],
      linkedBoqLineCodes: (data as any).linkedBoqLineCodes || [],
      linkedScheduleTaskIds: (data as any).linkedScheduleTaskIds || [],
      linkedDocumentNumbers: (data as any).linkedDocumentNumbers || [],
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    clarificationRepository.set(clarId, clar);

    return {
      data: { id: clarId, status: 'submitted_to_client', recordVersion: 1, payload: clar },
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
    clar.respondedBy = (req as any).userName || (req as any).actorId || 'Technical Lead';
    clar.respondedAt = new Date().toISOString();
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
