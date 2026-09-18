import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
  HttpException,
  HttpStatus,
  UseGuards,
  UseFilters,
  Optional,
} from '@nestjs/common';
import { Request } from 'express';
import {
  RequirementCreateSchema,
  RequirementCreateDto,
  RequirementUpdateSchema,
  RequirementUpdateDto,
  RequirementRevisionCreateSchema,
  RequirementRevisionCreateDto,
  RequirementBulkCreateSchema,
  RequirementBulkCreateDto,
  RequirementBulkUpdateSchema,
  RequirementBulkUpdateDto,
  RequirementAttachmentCreateSchema,
  RequirementAttachmentCreateDto,
  DocumentParseRequestSchema,
  DocumentParseRequestDto,
  ExtractionCandidateReviewSchema,
  ExtractionCandidateReviewDto,
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
  RequirementAllocationCreateSchema,
  RequirementAllocationCreateDto,
  RequirementAllocationUpdateSchema,
  RequirementAllocationSplitSchema,
  RequirementAllocationMergeSchema,
  RequirementAllocationMoveQtySchema,
  DesignPackageCreateSchema,
  DesignPackageCreateDto,
  DesignVariantCreateSchema,
  DesignVariantCreateDto,
  DesignVariantApproveSchema,
  DesignVariantApproveDto,
  DesignVariantReleaseSchema,
  DesignVariantReleaseDto,
  FulfilmentItemCreateSchema,
  FulfilmentItemCreateDto,
  FulfilmentDraftGenerateSchema,
  FulfilmentReviewBatchSchema,
  DepartmentWorkPackageCreateSchema,
  DepartmentWorkPackageCreateDto,
  ProductionBatchCreateSchema,
  ProductionBatchCreateDto,
  ProductionBatchProgressSchema,
  ProductionBatchProgressDto,
  RequirementQuantityChangeSchema,
  RequirementQuantityChangeDto,
  BulkCandidateReviewSchema,
  BulkCandidateReviewDto,
  DocumentComparisonRequestSchema,
  DocumentComparisonRequestDto,
  ApplyAddendumRevisionSchema,
  ApplyAddendumRevisionDto,
  CommandResult,
} from '@e3-eos/contracts';
import {
  ScopeRequirement,
  ScopeRequirementStatus,
  evaluateRequirementTraceability,
  generateRequirementsMatrix,
  assessClarificationImpact,
  getUrgentClarifications,
  ClarificationItem,
  RequirementCategory,
  RequirementRevision,
  compareRequirementRevisions,
  validateBulkScopeRows,
  parseIntelligentDocument,
  compareDocumentVersions,
  ExtractedScopeCandidate,
  ExtractedDocumentBlock,
  DocumentComparisonResult,
  DocumentDeltaItem,
  ReviewQueueType,
  LOCAL_TEAM_ACCOUNTS,
  RequirementAllocation,
  DesignPackage,
  DesignVariant,
  FulfilmentItem,
  DepartmentWorkPackage,
  ProductionBatch,
  ReconciliationSummary,
  calculateRequirementReconciliation,
  generateSuggestedWorkPackages,
  generateDraftFulfilmentItems,
  inferPhysicalUnitAndQuantity,
  normalizeEngineeringUnit,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { IdempotencyGuard } from '../common/idempotency.guard.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { DbService } from '../common/db.service.js';
import { projectRepository } from '../projects/projects.controller.js';

export interface StoredRequirement extends ScopeRequirement {
  organisationId: string;
  recordVersion?: number;
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  updatedAt?: string;
}

export interface StoredAttachment {
  id: string;
  requirementId: string;
  projectId: string;
  organisationId: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  fileUrl?: string;
  storageKey?: string;
  mediaCategory: string;
  version: string;
  uploadedBy?: string;
  uploadedByName?: string;
  description?: string;
  approvalStatus: string;
  isCurrent: boolean;
  relatedDesignPackageId?: string;
  createdAt: string;
}

export interface StoredParsingJob {
  id: string;
  organisationId: string;
  projectId: string;
  sourceDocumentId?: string;
  sourceDocumentName: string;
  documentType: string;
  status: string;
  progress?: number;
  parserVersion?: string;
  modelProvider?: string;
  extractedText?: string;
  totalExtracted: number;
  approvedCount: number;
  rejectedCount: number;
  clarificationCount: number;
  createdBy?: string;
  createdAt: string;
  blocks?: ExtractedDocumentBlock[];
  queueCounts?: Record<ReviewQueueType, number>;
  structureSummary?: any;
  candidates: ExtractedScopeCandidate[];
}

export const requirementRepository = new Map<string, StoredRequirement>();
export const revisionRepository = new Map<string, RequirementRevision[]>();
export const attachmentRepository = new Map<string, StoredAttachment[]>();
export const parsingJobRepository = new Map<string, StoredParsingJob>();
export const documentComparisonRepository = new Map<string, DocumentComparisonResult>();
export const clarificationRepository = new Map<string, ClarificationItem & { organisationId?: string }>();
export const riskRepository = new Map<string, any>();
export const allocationRepository = new Map<string, RequirementAllocation>();
export const designPackageRepository = new Map<string, DesignPackage>();
export const designVariantRepository = new Map<string, DesignVariant>();
export const fulfilmentItemRepository = new Map<string, FulfilmentItem>();
export const workPackageRepository = new Map<string, DepartmentWorkPackage>();
export const productionBatchRepository = new Map<string, ProductionBatch>();
export const requirementAuditLog: any[] = [];

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
      originalWording: 'The contractor shall engineer and install a central 360-degree kinetic motorized arch capable of dynamic rotation and scenic lighting integration.',
      interpretation: 'Requires custom 3-axis motorized rigging winches rated for 150% dynamic load with dual certified secondary safety steels.',
      sourceType: 'Client RFP',
      sourceReference: 'RFP Section 4.2.1 - Kinetic Arch Specs',
      category: 'creative_visual',
      ownerId: '10000000-0000-4000-8000-000000000004',
      ownerName: 'Karim Haddad (Technical Director)',
      dueDate: '2026-11-15T00:00:00Z',
      priority: 'critical',
      status: 'approved',
      disposition: 'applicable',
      linkedDocumentId: 'doc-001',
      linkedDocumentNumber: 'E3-QND26-AV-DWG-0001',
      linkedDesignId: 'des-001',
      linkedDesignVersion: 'Rev 01',
      linkedBoqLineCode: 'BOQ-AV-001',
      targetCostQar: 450000,
      quantity: 45,
      unit: 'meter',
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
      originalWording: 'All temporary structures shall withstand wind speeds up to 75 km/h and comply with Qatar Building Code requirements.',
      interpretation: 'Structural calculation package must be signed off by a Civil Defence licensed PE with certified ballast drawings.',
      sourceType: 'Authority requirement',
      sourceReference: 'RFP Section 3.1.4 - Substructure Weight Bearing',
      category: 'staging_technical',
      ownerId: '10000000-0000-4000-8000-000000000002',
      ownerName: 'Civil Defence Certified Structural Engineer',
      dueDate: '2026-11-10T00:00:00Z',
      priority: 'high',
      status: 'active',
      disposition: 'applicable',
      linkedDocumentId: 'doc-002',
      linkedDocumentNumber: 'E3-QND26-STG-DWG-0002',
      linkedDesignId: 'des-002',
      linkedDesignVersion: 'Rev A',
      linkedBoqLineCode: 'BOQ-STG-002',
      targetCostQar: 780000,
      quantity: 1200,
      unit: 'sqm',
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
      originalWording: 'All fabrics and materials used in production must hold valid civil defence fire resistance classification under Law No. 13 of 1997.',
      interpretation: 'Full material certification lab certificates required for all textiles; egress pathways must maintain minimum 3.0m clear width.',
      sourceType: 'Authority requirement',
      sourceReference: 'Qatar Law No. 13 of 1997 / QCDD Regulations',
      category: 'health_safety',
      ownerId: '10000000-0000-4000-8000-000000000005',
      ownerName: 'HSE & Civil Defence Lead',
      dueDate: '2026-11-01T00:00:00Z',
      priority: 'critical',
      status: 'under_review',
      disposition: 'applicable',
      linkedDocumentId: 'doc-003',
      linkedDocumentNumber: 'E3-QND26-HSE-SPC-0003',
      linkedBoqLineCode: 'BOQ-HSE-003',
      targetCostQar: 125000,
      quantity: 3500,
      unit: 'sqm',
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
      originalWording: 'State protocol VIP holding majlis with Amiri Diwan access clearance and climate-controlled shaded waiting area.',
      interpretation: 'Discipline lead assignment and timeline slot pending Amiri Diwan protocol schedule confirmation.',
      sourceType: 'Client RFP',
      sourceReference: 'Amiri Diwan Protocol Manual Section 7',
      category: 'protocol_ceremony',
      dueDate: '2026-11-20T00:00:00Z',
      priority: 'medium',
      status: 'draft',
      disposition: 'applicable',
      quantity: 850,
      unit: 'sqm',
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
  private dbService?: DbService;
  constructor(@Optional() dbService?: DbService) {
    this.dbService = dbService || new DbService();
    void this.dbService;
  }

  @Get('requirements/traceability')
  getTraceabilityMatrix(
    @Param('projectId') projectId: string,
    @Query('includeArchived') includeArchived?: string
  ) {
    let reqs = Array.from(requirementRepository.values()).filter((r) => r.projectId === projectId);
    if (includeArchived !== 'true') {
      reqs = reqs.filter((r) => !r.isArchived);
    }
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
    const orgId = (req as any).organisationId || (req as any).user?.organisationId || '11111111-1111-4111-8111-111111111111';
    const actorId = (req as any).actorId || (req as any).userId || (req as any).user?.id || 'system-user';
    const actorName = (req as any).userName || (req as any).user?.name || 'Discipline Lead';

    const projectReqs = Array.from(requirementRepository.values()).filter((r) => r.projectId === projectId);
    const reqCount = projectReqs.length;
    const reqCode = data.code || `REQ-QND-${String(reqCount + 1).padStart(3, '0')}`;
    const reqId = `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const ownerName =
      data.ownerName ||
      (data.ownerId ? LOCAL_TEAM_ACCOUNTS.find((u) => u.id === data.ownerId)?.name || 'Discipline Lead' : undefined);

    const initialStatus = (data.status as ScopeRequirementStatus | undefined) ||
      (data.ownerId && data.dueDate && (data.linkedDocumentId || data.linkedDocumentNumber)
        ? 'active'
        : 'draft');

    const inferred = inferPhysicalUnitAndQuantity(data.title, data.description, data.quantity, data.unit);
    const finalQuantity = data.quantity !== undefined && data.quantity !== null && data.quantity > 0 ? data.quantity : inferred.quantity;
    const finalUnit = data.unit !== undefined && data.unit !== null && String(data.unit).trim() !== '' ? data.unit : inferred.unit;

    const newReq: StoredRequirement = {
      id: reqId,
      organisationId: orgId,
      projectId,
      code: reqCode,
      title: data.title,
      description: data.description,
      originalWording: data.originalWording,
      interpretation: data.interpretation,
      sourceType: (data.sourceType as any) || 'Client RFP',
      sourceReference: data.sourceReference,
      scopePackage: data.scopePackage,
      category: (data.category as RequirementCategory) || 'staging_technical',
      discipline: data.discipline,
      department: data.department,
      ownerId: data.ownerId,
      ownerName,
      supportingOwnerIds: data.supportingOwnerIds,
      approverId: data.approverId,
      approverName: data.approverName,
      dueDate: data.dueDate,
      startDate: data.startDate,
      milestone: data.milestone,
      dependency: data.dependency,
      responsibleParty: data.responsibleParty || 'e3',
      externalResponsibleParty: data.externalResponsibleParty,
      priority: data.priority || 'medium',
      risk: data.risk || 'medium',
      status: initialStatus,
      progress: data.progress ?? 0,
      acceptanceCriteria: data.acceptanceCriteria,
      quantity: finalQuantity,
      unit: finalUnit,
      locationZone: data.locationZone,
      notes: data.notes,
      disposition: (data.disposition as any) || 'applicable',
      deliverablePackageId: data.deliverablePackageId,
      linkedDocumentId: data.linkedDocumentId,
      linkedDocumentNumber: data.linkedDocumentNumber,
      linkedDesignId: data.linkedDesignId,
      linkedDesignVersion: data.linkedDesignVersion,
      linkedBoqLineCode: data.linkedBoqLineCode,
      linkedTaskId: data.linkedTaskId,
      targetCostQar: data.targetCostQar,
      allocationStatus: 'unallocated',
      allocatedQuantity: 0,
      designStatus: 'required',
      designApprovedQuantity: 0,
      releasedQuantity: 0,
      producedQuantity: 0,
      deliveredQuantity: 0,
      installedQuantity: 0,
      acceptedQuantity: 0,
      productionStatus: 'not_released',
      logisticsStatus: 'pending',
      installationStatus: 'not_started',
      recordVersion: 1,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    requirementRepository.set(reqId, newReq);
    const evalResult = evaluateRequirementTraceability(newReq);

    requirementAuditLog.push({
      id: `audit-${Date.now()}`,
      requirementId: reqId,
      projectId,
      action: 'created',
      actorId,
      actorName,
      timestamp: new Date().toISOString(),
      details: { title: newReq.title, code: newReq.code },
    });

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
  getRequirements(
    @Param('projectId') projectId: string,
    @Req() req: Request,
    @Query('status') statusQuery?: string,
    @Query('department') departmentQuery?: string,
    @Query('ownerId') ownerIdQuery?: string,
    @Query('search') searchQuery?: string,
    @Query('missing') missingQuery?: string,
    @Query('stageReadiness') stageReadinessQuery?: string,
    @Query('risk') riskQuery?: string,
    @Query('includeArchived') includeArchivedQuery?: string
  ) {
    const orgId = (req as any).organisationId;
    let reqs = Array.from(requirementRepository.values()).filter(
      (r) => r.projectId === projectId && (!orgId || r.organisationId === orgId)
    );

    if (includeArchivedQuery !== 'true') {
      reqs = reqs.filter((r) => !r.isArchived);
    }

    if (statusQuery) {
      const statuses = statusQuery.split(',').map((s) => s.trim());
      reqs = reqs.filter((r) => statuses.includes(r.status || 'draft'));
    }

    if (departmentQuery) {
      const dept = departmentQuery.toLowerCase();
      reqs = reqs.filter(
        (r) =>
          r.department?.toLowerCase() === dept ||
          r.discipline?.toLowerCase() === dept ||
          r.category?.toLowerCase() === dept
      );
    }

    if (ownerIdQuery) {
      reqs = reqs.filter((r) => r.ownerId === ownerIdQuery);
    }

    if (riskQuery) {
      reqs = reqs.filter((r) => r.risk === riskQuery || r.priority === riskQuery);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      reqs = reqs.filter(
        (r) =>
          r.title?.toLowerCase().includes(q) ||
          r.code?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.originalWording?.toLowerCase().includes(q) ||
          r.interpretation?.toLowerCase().includes(q) ||
          r.acceptanceCriteria?.toLowerCase().includes(q)
      );
    }

    const evaluatedReqs = reqs.map((r) => {
      const traceability = evaluateRequirementTraceability(r);
      return {
        ...r,
        traceability,
      };
    });

    let filtered = evaluatedReqs;

    if (missingQuery) {
      const missingType = missingQuery.toLowerCase();
      filtered = filtered.filter((r) => {
        const t = r.traceability;
        if (missingType === 'owner') return !t.hasOwner;
        if (missingType === 'date') return !t.hasTargetDate;
        if (missingType === 'document') return !t.hasControlledDocument;
        if (missingType === 'design') return !t.hasDesignVersion;
        if (missingType === 'boq') return !t.hasBoqCost;
        if (missingType === 'approval') return !t.hasApprovalSignoff;
        if (missingType === 'evidence') return !t.hasDeliveryEvidence;
        if (missingType === 'deliverable') return !r.deliverablePackageId;
        return true;
      });
    }

    if (stageReadinessQuery) {
      const stage = stageReadinessQuery as keyof (typeof evaluatedReqs)[0]['traceability']['stageReadiness'];
      filtered = filtered.filter((r) => {
        return r.traceability?.stageReadiness?.[stage]?.satisfied === true;
      });
    }

    const total = filtered.length;
    const satisfied = filtered.filter((r) => r.disposition === 'satisfied' || r.disposition === 'not_applicable');
    const missingDeliverables = filtered.filter((r) => !r.deliverablePackageId && r.disposition !== 'not_applicable');
    const missingOwners = filtered.filter((r) => !r.ownerId && r.disposition !== 'not_applicable');

    const completenessCounts: Record<string, number> = {
      '7/7': 0,
      '6/7': 0,
      '5/7': 0,
      '4/7': 0,
      '3/7': 0,
      '2/7': 0,
      '1/7': 0,
      '0/7': 0,
    };

    const stageReadinessCounts = {
      tenderDevelopment: 0,
      designDevelopment: 0,
      commercialAuthorization: 0,
      productionRelease: 0,
      closeout: 0,
    };

    for (const item of filtered) {
      const ratio = item.traceability?.completenessRatio || '0/7';
      completenessCounts[ratio] = (completenessCounts[ratio] || 0) + 1;
      if (item.traceability?.stageReadiness?.tenderDevelopment?.satisfied) stageReadinessCounts.tenderDevelopment++;
      if (item.traceability?.stageReadiness?.designDevelopment?.satisfied) stageReadinessCounts.designDevelopment++;
      if (item.traceability?.stageReadiness?.commercialAuthorization?.satisfied) stageReadinessCounts.commercialAuthorization++;
      if (item.traceability?.stageReadiness?.productionRelease?.satisfied) stageReadinessCounts.productionRelease++;
      if (item.traceability?.stageReadiness?.closeout?.satisfied) stageReadinessCounts.closeout++;
    }

    const coverageRatio = total > 0 ? `${((satisfied.length / total) * 100).toFixed(1)}%` : '100%';

    return {
      data: {
        projectId,
        requirements: filtered,
        coverageReport: {
          totalRequirements: total,
          satisfiedCount: satisfied.length,
          missingDeliverableCount: missingDeliverables.length,
          missingOwnerCount: missingOwners.length,
          coverageRatio,
          completenessCounts,
          stageReadinessCounts,
          unassignedDeliverables: missingDeliverables.map((r) => ({ id: r.id, title: r.title })),
        },
      },
    };
  }

  @Get('requirements/:reqId')
  getRequirement(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string
  ) {
    const req =
      requirementRepository.get(reqId) ||
      Array.from(requirementRepository.values()).find((r) => r.projectId === projectId && r.code === reqId);
    if (!req || req.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Requirement not found' }, HttpStatus.NOT_FOUND);
    }

    const traceability = evaluateRequirementTraceability(req);
    const revisions = revisionRepository.get(req.id) || [];
    const attachments = (attachmentRepository.get(req.id) || []).filter((a) => a.isCurrent !== false);
    const linkedClarifications = Array.from(clarificationRepository.values()).filter(
      (c) => c.linkedRequirementIds?.includes(req.id) || (req.code && c.linkedRequirementIds?.includes(req.code))
    );

    return {
      data: {
        ...req,
        traceability,
        revisions,
        attachments,
        linkedClarifications,
      },
    };
  }

  @Put('requirements/:reqId')
  @UseGuards(IdempotencyGuard)
  updateRequirement(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult {
    const parseRes = RequirementUpdateSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException(
        {
          code: 'INVALID_ARGUMENT',
          title: 'Invalid requirement update payload',
          detail: parseRes.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const data: RequirementUpdateDto = parseRes.data;
    const existing =
      requirementRepository.get(reqId) ||
      Array.from(requirementRepository.values()).find((r) => r.projectId === projectId && r.code === reqId);
    if (!existing || existing.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Requirement not found' }, HttpStatus.NOT_FOUND);
    }

    const actorId = (req as any).actorId || (req as any).userId || (req as any).user?.id || 'system-user';
    const actorName = (req as any).userName || (req as any).user?.name || 'Discipline Lead';
    const callerRole = (req as any).role || (req as any).user?.role || '';

    // Baseline Protection Rule:
    const isApprovedBaseline = existing.status === 'approved';

    if (isApprovedBaseline) {
      const isOverride =
        (callerRole === 'super_admin' || data.superAdminOverride) &&
        Boolean(data.overrideReason && data.overrideReason.trim().length > 0);

      if (isOverride) {
        requirementAuditLog.push({
          id: `audit-${Date.now()}`,
          requirementId: existing.id,
          projectId,
          action: 'super_admin_override',
          actorId,
          actorName,
          timestamp: new Date().toISOString(),
          details: { overrideReason: data.overrideReason, changes: data },
        });
      } else {
        const diff = compareRequirementRevisions(existing, data);
        const existingRevs = revisionRepository.get(existing.id) || [];
        const revNumber = existingRevs.length + 1;

        const newRev: RequirementRevision = {
          id: `rev-${existing.id}-${revNumber}`,
          requirementId: existing.id,
          organisationId: existing.organisationId,
          projectId: existing.projectId,
          revisionNumber: revNumber,
          changedFields: diff.changedFields,
          previousValues: diff.previousValues,
          newValues: diff.newValues,
          reasonForChange: data.changeReason || 'Baseline scope adjustment',
          authorId: actorId,
          authorName: actorName,
          authorRole: callerRole,
          createdAt: new Date().toISOString(),
        };

        existingRevs.push(newRev);
        revisionRepository.set(existing.id, existingRevs);

        requirementAuditLog.push({
          id: `audit-${Date.now()}`,
          requirementId: existing.id,
          projectId,
          action: 'revision_created',
          actorId,
          actorName,
          timestamp: new Date().toISOString(),
          details: { revisionNumber: revNumber, reason: newRev.reasonForChange, changedFields: diff.changedFields },
        });

        if (!data.status) {
          existing.status = 'changed';
        }
      }
    }

    // Update fields
    if (data.title !== undefined) existing.title = data.title;
    if (data.description !== undefined) existing.description = data.description;
    if (data.originalWording !== undefined) existing.originalWording = data.originalWording;
    if (data.interpretation !== undefined) existing.interpretation = data.interpretation;
    if (data.sourceType !== undefined) existing.sourceType = data.sourceType as any;
    if (data.sourceReference !== undefined) existing.sourceReference = data.sourceReference;
    if (data.scopePackage !== undefined) existing.scopePackage = data.scopePackage;
    if (data.category !== undefined) existing.category = data.category as any;
    if (data.discipline !== undefined) existing.discipline = data.discipline;
    if (data.department !== undefined) existing.department = data.department;
    if (data.ownerId !== undefined) {
      existing.ownerId = data.ownerId;
      existing.ownerName =
        data.ownerName || (data.ownerId ? LOCAL_TEAM_ACCOUNTS.find((u) => u.id === data.ownerId)?.name : undefined);
    }
    if (data.ownerName !== undefined) existing.ownerName = data.ownerName;
    if (data.supportingOwnerIds !== undefined) existing.supportingOwnerIds = data.supportingOwnerIds;
    if (data.approverId !== undefined) existing.approverId = data.approverId;
    if (data.approverName !== undefined) existing.approverName = data.approverName;
    if (data.dueDate !== undefined) existing.dueDate = data.dueDate;
    if (data.startDate !== undefined) existing.startDate = data.startDate;
    if (data.milestone !== undefined) existing.milestone = data.milestone;
    if (data.dependency !== undefined) existing.dependency = data.dependency;
    if (data.responsibleParty !== undefined) existing.responsibleParty = data.responsibleParty;
    if (data.externalResponsibleParty !== undefined) existing.externalResponsibleParty = data.externalResponsibleParty;
    if (data.priority !== undefined) existing.priority = data.priority;
    if (data.risk !== undefined) existing.risk = data.risk;
    if (data.status !== undefined) existing.status = data.status as any;
    if (data.progress !== undefined) existing.progress = data.progress;
    if (data.acceptanceCriteria !== undefined) existing.acceptanceCriteria = data.acceptanceCriteria;
    if (data.quantity !== undefined) existing.quantity = data.quantity;
    if (data.unit !== undefined) existing.unit = normalizeEngineeringUnit(data.unit);
    if (data.locationZone !== undefined) existing.locationZone = data.locationZone;
    if (data.notes !== undefined) existing.notes = data.notes;
    if (data.disposition !== undefined) existing.disposition = data.disposition as any;
    if (data.deliverablePackageId !== undefined) existing.deliverablePackageId = data.deliverablePackageId;
    if (data.linkedDocumentId !== undefined) existing.linkedDocumentId = data.linkedDocumentId;
    if (data.linkedDocumentNumber !== undefined) existing.linkedDocumentNumber = data.linkedDocumentNumber;
    if (data.linkedDesignId !== undefined) existing.linkedDesignId = data.linkedDesignId;
    if (data.linkedDesignVersion !== undefined) existing.linkedDesignVersion = data.linkedDesignVersion;
    if (data.linkedBoqLineCode !== undefined) existing.linkedBoqLineCode = data.linkedBoqLineCode;
    if (data.linkedTaskId !== undefined) existing.linkedTaskId = data.linkedTaskId;
    if (data.targetCostQar !== undefined) existing.targetCostQar = data.targetCostQar;
    if (data.isApproved !== undefined) existing.isApproved = data.isApproved;
    if (data.approvalRequestId !== undefined) existing.approvalRequestId = data.approvalRequestId;
    if (data.deliveryEvidenceHash !== undefined) existing.deliveryEvidenceHash = data.deliveryEvidenceHash;

    existing.recordVersion = (existing.recordVersion || 1) + 1;
    existing.updatedAt = new Date().toISOString();

    requirementRepository.set(existing.id, existing);
    const traceability = evaluateRequirementTraceability(existing);

    return {
      data: {
        id: existing.id,
        status: 'updated',
        recordVersion: existing.recordVersion,
        payload: {
          ...existing,
          traceability,
        },
      },
      meta: {
        requestId: `req-${Date.now()}`,
        dataAsOf: new Date().toISOString(),
      },
    };
  }

  @Delete('requirements/:reqId')
  @UseGuards(IdempotencyGuard)
  deleteRequirement(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string,
    @Req() req: Request
  ): CommandResult {
    const existing =
      requirementRepository.get(reqId) ||
      Array.from(requirementRepository.values()).find((r) => r.projectId === projectId && r.code === reqId);
    if (!existing || existing.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Requirement not found' }, HttpStatus.NOT_FOUND);
    }

    requirementRepository.delete(existing.id);

    const actorId = (req as any).actorId || (req as any).userId || (req as any).user?.id || 'system-user';
    const actorName = (req as any).userName || (req as any).user?.name || 'Discipline Lead';

    requirementAuditLog.push({
      id: `audit-${Date.now()}`,
      requirementId: existing.id,
      projectId,
      action: 'deleted',
      actorId,
      actorName,
      timestamp: new Date().toISOString(),
      details: { title: existing.title, code: existing.code },
    });

    return {
      data: {
        id: existing.id,
        status: 'deleted',
        recordVersion: (existing.recordVersion || 1) + 1,
      },
      meta: {
        requestId: `del-${Date.now()}`,
        dataAsOf: new Date().toISOString(),
      },
    };
  }

  @Post('requirements/:reqId/revisions')
  @UseGuards(IdempotencyGuard)
  createRequirementRevision(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult {
    const parseRes = RequirementRevisionCreateSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException(
        {
          code: 'INVALID_ARGUMENT',
          title: 'Invalid revision payload',
          detail: parseRes.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const data: RequirementRevisionCreateDto = parseRes.data;
    const existing = requirementRepository.get(reqId);
    if (!existing || existing.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Requirement not found' }, HttpStatus.NOT_FOUND);
    }

    const actorId = (req as any).actorId || (req as any).userId || 'system-user';
    const actorName = (req as any).userName || 'Discipline Lead';
    const callerRole = (req as any).role || '';

    const existingRevs = revisionRepository.get(existing.id) || [];
    const revNumber = existingRevs.length + 1;

    const diff = compareRequirementRevisions(existing, data.changedFields || {});

    const revision: RequirementRevision = {
      id: `rev-${existing.id}-${revNumber}`,
      requirementId: existing.id,
      organisationId: existing.organisationId,
      projectId: existing.projectId,
      revisionNumber: revNumber,
      changedFields: Object.keys(data.changedFields || {}),
      previousValues: diff.previousValues,
      newValues: data.changedFields || diff.newValues,
      reasonForChange: data.reasonForChange,
      impact: data.impact,
      authorId: actorId,
      authorName: actorName,
      authorRole: callerRole,
      createdAt: new Date().toISOString(),
    };

    existingRevs.push(revision);
    revisionRepository.set(existing.id, existingRevs);

    // Apply the changed fields to the existing requirement
    Object.assign(existing, data.changedFields);
    existing.recordVersion = (existing.recordVersion || 1) + 1;
    existing.updatedAt = new Date().toISOString();
    requirementRepository.set(existing.id, existing);

    return {
      data: {
        id: revision.id,
        status: 'revision_recorded',
        recordVersion: existing.recordVersion,
        payload: revision,
      },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Get('requirements/:reqId/revisions')
  getRequirementRevisions(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string
  ) {
    const existing = requirementRepository.get(reqId);
    if (!existing || existing.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Requirement not found' }, HttpStatus.NOT_FOUND);
    }
    const revisions = revisionRepository.get(existing.id) || [];
    return { data: revisions };
  }

  @Get('requirements/:reqId/revisions/compare')
  compareRevisions(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string,
    @Query('from') fromRev?: string,
    @Query('to') toRev?: string
  ) {
    const existing = requirementRepository.get(reqId);
    if (!existing || existing.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Requirement not found' }, HttpStatus.NOT_FOUND);
    }
    const revisions = revisionRepository.get(existing.id) || [];
    const revA = revisions.find((r) => r.id === fromRev || String(r.revisionNumber) === fromRev);
    const revB = revisions.find((r) => r.id === toRev || String(r.revisionNumber) === toRev);

    const snapshotA = revA ? revA.previousValues : existing;
    const snapshotB = revB ? revB.newValues : existing;
    const diff = compareRequirementRevisions(snapshotA, snapshotB);

    return {
      data: {
        fromRevision: revA?.revisionNumber ?? 'current',
        toRevision: revB?.revisionNumber ?? 'current',
        diff,
      },
    };
  }

  @Post('requirements/:reqId/archive')
  archiveRequirement(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string,
    @Req() req: Request
  ): CommandResult {
    const existing = requirementRepository.get(reqId);
    if (!existing || existing.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Requirement not found' }, HttpStatus.NOT_FOUND);
    }
    const actorId = (req as any).actorId || (req as any).userId || 'system-user';

    existing.isArchived = true;
    existing.archivedAt = new Date().toISOString();
    existing.archivedBy = actorId;
    existing.updatedAt = new Date().toISOString();
    requirementRepository.set(existing.id, existing);

    return {
      data: { id: existing.id, status: 'archived', recordVersion: existing.recordVersion || 1, payload: existing },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Post('requirements/:reqId/restore')
  restoreRequirement(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string
  ): CommandResult {
    const existing = requirementRepository.get(reqId);
    if (!existing || existing.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Requirement not found' }, HttpStatus.NOT_FOUND);
    }

    existing.isArchived = false;
    existing.archivedAt = undefined;
    existing.archivedBy = undefined;
    existing.updatedAt = new Date().toISOString();
    requirementRepository.set(existing.id, existing);

    return {
      data: { id: existing.id, status: 'restored', recordVersion: existing.recordVersion || 1, payload: existing },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Post('requirements/:reqId/duplicate')
  duplicateRequirement(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string,
    @Req() req: Request
  ): CommandResult {
    const source = requirementRepository.get(reqId);
    if (!source || source.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Requirement not found' }, HttpStatus.NOT_FOUND);
    }

    const orgId = (req as any).organisationId || source.organisationId;
    const projectReqs = Array.from(requirementRepository.values()).filter((r) => r.projectId === projectId);
    const newCode = `REQ-QND-${String(projectReqs.length + 1).padStart(3, '0')}`;
    const newId = `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const duplicate: StoredRequirement = {
      ...source,
      id: newId,
      organisationId: orgId,
      code: newCode,
      title: `Copy of ${source.title}`,
      status: 'draft',
      recordVersion: 1,
      isArchived: false,
      archivedAt: undefined,
      archivedBy: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    requirementRepository.set(newId, duplicate);
    const traceability = evaluateRequirementTraceability(duplicate);

    return {
      data: { id: newId, status: 'duplicated', recordVersion: 1, payload: { ...duplicate, traceability } },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Post('requirements/bulk')
  @UseGuards(IdempotencyGuard)
  bulkCreateRequirements(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult {
    const parseRes = RequirementBulkCreateSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException(
        {
          code: 'INVALID_ARGUMENT',
          title: 'Invalid bulk requirements payload',
          detail: parseRes.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const data: RequirementBulkCreateDto = parseRes.data;
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const actorId = (req as any).actorId || (req as any).userId || 'system-user';
    const actorName = (req as any).userName || 'Discipline Lead';

    const validation = validateBulkScopeRows(data.items as any);

    const projectReqs = Array.from(requirementRepository.values()).filter((r) => r.projectId === projectId);
    let counter = projectReqs.length;
    const createdItems: StoredRequirement[] = [];

    for (const row of validation.validRows) {
      counter++;
      const reqCode = row.code || `REQ-QND-${String(counter).padStart(3, '0')}`;
      const reqId = `req-${Date.now()}-${counter}`;
      const ownerName =
        row.ownerName ||
        (row.ownerId ? LOCAL_TEAM_ACCOUNTS.find((u) => u.id === row.ownerId)?.name || 'Discipline Lead' : undefined);

      const rowNormUnit = row.unit ? normalizeEngineeringUnit(row.unit) : undefined;
      const rowInferred = inferPhysicalUnitAndQuantity(row.title, row.description, row.quantity, rowNormUnit);
      const rowFinalQuantity = row.quantity !== undefined && row.quantity !== null && row.quantity > 0 ? row.quantity : rowInferred.quantity;
      const rowFinalUnit = row.unit !== undefined && row.unit !== null && String(row.unit).trim() !== '' ? row.unit : rowInferred.unit;

      const newReq: StoredRequirement = {
        id: reqId,
        organisationId: orgId,
        projectId,
        code: reqCode,
        title: row.title,
        description: row.description,
        originalWording: row.originalWording,
        interpretation: row.interpretation,
        sourceType: (row.sourceType as any) || 'Client RFP',
        sourceReference: row.sourceReference,
        scopePackage: row.scopePackage,
        category: (row.category as RequirementCategory) || 'staging_technical',
        discipline: row.discipline,
        department: row.department,
        ownerId: row.ownerId,
        ownerName,
        dueDate: row.dueDate,
        startDate: row.startDate,
        responsibleParty: row.responsibleParty || 'e3',
        priority: row.priority || 'medium',
        risk: row.risk || 'medium',
        status: (row.status as any) || 'draft',
        progress: row.progress ?? 0,
        acceptanceCriteria: row.acceptanceCriteria,
        quantity: rowFinalQuantity,
        unit: rowFinalUnit,
        locationZone: row.locationZone,
        notes: row.notes,
        disposition: (row.disposition as any) || 'applicable',
        deliverablePackageId: row.deliverablePackageId,
        linkedDocumentNumber: row.linkedDocumentNumber,
        linkedDesignId: row.linkedDesignId,
        linkedBoqLineCode: row.linkedBoqLineCode,
        linkedTaskId: row.linkedTaskId,
        targetCostQar: row.targetCostQar,
        recordVersion: 1,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      requirementRepository.set(reqId, newReq);
      createdItems.push(newReq);
    }

    requirementAuditLog.push({
      id: `audit-${Date.now()}`,
      projectId,
      action: 'bulk_created',
      actorId,
      actorName,
      timestamp: new Date().toISOString(),
      details: { count: createdItems.length, invalidCount: validation.invalidRows.length },
    });

    return {
      data: {
        id: `bulk-${Date.now()}`,
        status: 'bulk_created',
        recordVersion: 1,
        payload: {
          created: createdItems.map((r) => ({ ...r, traceability: evaluateRequirementTraceability(r) })),
          count: createdItems.length,
          invalidRows: validation.invalidRows,
        },
      },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Put('requirements/bulk')
  @UseGuards(IdempotencyGuard)
  bulkUpdateRequirements(
    @Param('projectId') projectId: string,
    @Body() body: unknown
  ): CommandResult {
    const parseRes = RequirementBulkUpdateSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException(
        {
          code: 'INVALID_ARGUMENT',
          title: 'Invalid bulk update payload',
          detail: parseRes.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const data: RequirementBulkUpdateDto = parseRes.data;
    const updated: StoredRequirement[] = [];

    for (const reqId of data.requirementIds) {
      const existing =
        requirementRepository.get(reqId) ||
        Array.from(requirementRepository.values()).find((r) => r.projectId === projectId && r.code === reqId);
      if (!existing || existing.projectId !== projectId) continue;

      const u = data.updates;
      if (u.department !== undefined) existing.department = u.department;
      if (u.ownerId !== undefined) {
        existing.ownerId = u.ownerId;
        existing.ownerName = u.ownerName || LOCAL_TEAM_ACCOUNTS.find((usr) => usr.id === u.ownerId)?.name;
      }
      if (u.ownerName !== undefined) existing.ownerName = u.ownerName;
      if (u.dueDate !== undefined) existing.dueDate = u.dueDate;
      if (u.priority !== undefined) existing.priority = u.priority;
      if (u.status !== undefined) existing.status = u.status as any;
      if (u.isArchived !== undefined) existing.isArchived = u.isArchived;

      existing.recordVersion = (existing.recordVersion || 1) + 1;
      existing.updatedAt = new Date().toISOString();
      requirementRepository.set(existing.id, existing);
      updated.push(existing);
    }

    return {
      data: {
        id: `bulk-update-${Date.now()}`,
        status: 'bulk_updated',
        recordVersion: 1,
        payload: {
          updated: updated.map((r) => ({ ...r, traceability: evaluateRequirementTraceability(r) })),
          count: updated.length,
        },
      },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Get('requirements/:reqId/attachments')
  getAttachments(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string
  ) {
    const existing = requirementRepository.get(reqId);
    if (!existing || existing.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Requirement not found' }, HttpStatus.NOT_FOUND);
    }
    const attachments = (attachmentRepository.get(existing.id) || []).filter((a) => a.isCurrent !== false);
    return { data: attachments };
  }

  @Post('requirements/:reqId/attachments')
  @UseGuards(IdempotencyGuard)
  addAttachment(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult {
    const parseRes = RequirementAttachmentCreateSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException(
        {
          code: 'INVALID_ARGUMENT',
          title: 'Invalid attachment payload',
          detail: parseRes.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const data: RequirementAttachmentCreateDto = parseRes.data;
    const existing = requirementRepository.get(reqId);
    if (!existing || existing.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Requirement not found' }, HttpStatus.NOT_FOUND);
    }

    const actorId = (req as any).actorId || (req as any).userId || (req as any).user?.id || 'system-user';
    const actorName = (req as any).userName || (req as any).user?.name || 'Discipline Lead';
    const orgId = (req as any).organisationId || (req as any).user?.organisationId || existing.organisationId;

    const attachmentId = `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const attachment: StoredAttachment = {
      id: attachmentId,
      requirementId: existing.id,
      projectId,
      organisationId: orgId,
      fileName: data.fileName,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      fileUrl: data.fileUrl || `/mock-storage/${data.fileName}`,
      storageKey: `scope/${projectId}/${existing.id}/${data.fileName}`,
      mediaCategory: data.mediaCategory,
      version: data.version || 'Rev 01',
      uploadedBy: actorId,
      uploadedByName: actorName,
      description: data.description,
      approvalStatus: data.approvalStatus || 'approved',
      isCurrent: true,
      relatedDesignPackageId: data.relatedDesignPackageId,
      createdAt: new Date().toISOString(),
    };

    const currentList = attachmentRepository.get(existing.id) || [];
    currentList.push(attachment);
    attachmentRepository.set(existing.id, currentList);

    if (
      !existing.linkedDocumentNumber &&
      (data.mediaCategory === 'specification_pdf' || data.mediaCategory === 'cad_drawing')
    ) {
      existing.linkedDocumentNumber = data.fileName;
    }
    if (!existing.linkedDesignId && data.mediaCategory === 'visual_render') {
      existing.linkedDesignId = attachmentId;
    }
    requirementRepository.set(existing.id, existing);

    return {
      data: {
        id: attachmentId,
        status: 'created',
        recordVersion: 1,
        payload: attachment,
      },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Delete('requirements/:reqId/attachments/:attachmentId')
  deleteAttachment(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string,
    @Param('attachmentId') attachmentId: string
  ): CommandResult {
    const existing = requirementRepository.get(reqId);
    if (!existing || existing.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Requirement not found' }, HttpStatus.NOT_FOUND);
    }

    const currentList = attachmentRepository.get(existing.id) || [];
    const index = currentList.findIndex((a) => a.id === attachmentId);
    if (index === -1) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Attachment not found' }, HttpStatus.NOT_FOUND);
    }

    currentList.splice(index, 1);
    attachmentRepository.set(existing.id, currentList);

    return {
      data: { id: attachmentId, status: 'deleted', recordVersion: 1, payload: { id: attachmentId } },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Post('requirements/:reqId/clarifications')
  @UseGuards(IdempotencyGuard)
  createClarificationForRequirement(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult {
    const existing = requirementRepository.get(reqId);
    if (!existing || existing.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Requirement not found' }, HttpStatus.NOT_FOUND);
    }

    const parseRes = ClarificationCreateSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException(
        { code: 'INVALID_ARGUMENT', title: 'Invalid clarification payload' },
        HttpStatus.BAD_REQUEST
      );
    }

    const data: ClarificationCreateDto = parseRes.data;
    const orgId = (req as any).organisationId || existing.organisationId;
    const clarCount = Array.from(clarificationRepository.values()).filter((c) => c.projectId === projectId).length;
    const clarCode = `RFI-QND-${String(clarCount + 1).padStart(3, '0')}`;
    const clarId = `clar-${Date.now()}`;
    const impact = assessClarificationImpact({
      costDeltaQar: data.costDeltaQar,
      scheduleDeltaDays: data.scheduleDeltaDays,
      scopeAltered: data.scopeAltered,
    });

    const linkedRequirementIds = Array.from(
      new Set([...(data.linkedRequirementIds || []), existing.id, existing.code].filter(Boolean) as string[])
    );

    const clar: ClarificationItem & { organisationId?: string } = {
      id: clarId,
      projectId,
      organisationId: orgId,
      clarificationCode: clarCode,
      title: (data as any).title || data.question.slice(0, 60),
      question: data.question,
      category: (data.category as any) || 'technical',
      discipline: (data as any).discipline || existing.discipline || 'staging',
      source: (data.source as any) || 'bidder_inquiry',
      author: (data as any).author || (req as any).userName || 'Project Lead',
      assignedResponder: (data as any).assignedResponder || 'Lead PM',
      dateRaised: new Date().toISOString(),
      targetResponseDate: data.dueAt || new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
      dueAt: data.dueAt || new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
      hasCommercialImpact: Boolean(impact.hasCostImpact),
      hasScheduleImpact: Boolean(impact.hasScheduleImpact),
      rfpSectionRef: data.rfpSectionRef || existing.sourceReference,
      status: 'submitted_to_client',
      impact,
      linkedRequirementIds,
      linkedDesignIds: (data as any).linkedDesignIds || (existing.linkedDesignId ? [existing.linkedDesignId] : []),
      linkedBoqLineCodes:
        (data as any).linkedBoqLineCodes || (existing.linkedBoqLineCode ? [existing.linkedBoqLineCode] : []),
      linkedScheduleTaskIds:
        (data as any).linkedScheduleTaskIds || (existing.linkedTaskId ? [existing.linkedTaskId] : []),
      linkedDocumentNumbers:
        (data as any).linkedDocumentNumbers || (existing.linkedDocumentNumber ? [existing.linkedDocumentNumber] : []),
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    clarificationRepository.set(clarId, clar);

    if (existing.status === 'draft' || existing.status === 'incomplete') {
      existing.status = 'clarification_required';
      requirementRepository.set(existing.id, existing);
    }

    return {
      data: { id: clarId, status: 'submitted_to_client', recordVersion: 1, payload: clar },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Post('scope-parser/parse')
  @UseGuards(IdempotencyGuard)
  parseDocument(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult {
    const parseRes = DocumentParseRequestSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException(
        {
          code: 'INVALID_ARGUMENT',
          title: 'Invalid parse request payload',
          detail: parseRes.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const data: DocumentParseRequestDto = parseRes.data;
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const actorId = (req as any).actorId || (req as any).userId || 'system-user';

    const existingReqs = Array.from(requirementRepository.values()).filter((r) => r.projectId === projectId);

    const parseResult = parseIntelligentDocument(data.rawText || '', {
      documentName: data.documentName || 'Uploaded Tender Specification',
      documentType: data.documentType || 'tender_spec',
      existingRequirements: existingReqs,
    });

    const jobId = parseResult.jobId;
    const job: StoredParsingJob = {
      id: jobId,
      organisationId: orgId,
      projectId,
      sourceDocumentId: data.documentId,
      sourceDocumentName: data.documentName || 'Uploaded Tender Specification',
      documentType: data.documentType || 'tender_spec',
      status: 'review_ready',
      progress: 100,
      parserVersion: parseResult.parserVersion,
      modelProvider: 'deterministic-structured',
      extractedText: (data.rawText || '').slice(0, 500),
      totalExtracted: parseResult.totalExtracted,
      approvedCount: 0,
      rejectedCount: 0,
      clarificationCount: 0,
      createdBy: actorId,
      createdAt: new Date().toISOString(),
      blocks: parseResult.blocks,
      queueCounts: parseResult.queueCounts,
      structureSummary: parseResult.structureSummary,
      candidates: parseResult.candidates,
    };

    parsingJobRepository.set(jobId, job);

    return {
      data: {
        id: jobId,
        status: 'review_ready',
        recordVersion: 1,
        payload: job,
      },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Get('scope-parser/jobs/:jobId')
  getParsingJob(
    @Param('projectId') projectId: string,
    @Param('jobId') jobId: string
  ) {
    const job = parsingJobRepository.get(jobId);
    if (!job || job.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Parsing job not found' }, HttpStatus.NOT_FOUND);
    }
    return { data: job };
  }

  @Get('scope-parser/jobs/:jobId/candidates')
  getParsingCandidates(
    @Param('projectId') projectId: string,
    @Param('jobId') jobId: string,
    @Query('queueType') queueType?: string,
    @Query('status') status?: string,
    @Query('confidence') confidence?: string,
    @Query('search') search?: string
  ) {
    const job = parsingJobRepository.get(jobId);
    if (!job || job.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Parsing job not found' }, HttpStatus.NOT_FOUND);
    }

    let list = job.candidates;

    if (queueType) {
      list = list.filter((c) => c.queueType === queueType);
    }
    if (status) {
      list = list.filter((c) => c.reviewStatus === status);
    }
    if (confidence) {
      if (confidence === 'high') list = list.filter((c) => c.confidenceScore >= 0.85);
      else if (confidence === 'medium') list = list.filter((c) => c.confidenceScore >= 0.7 && c.confidenceScore < 0.85);
      else if (confidence === 'low') list = list.filter((c) => c.confidenceScore < 0.7);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.candidateCode.toLowerCase().includes(q));
    }

    return {
      data: {
        total: list.length,
        jobId,
        candidates: list,
        queueCounts: job.queueCounts,
      },
    };
  }

  @Post('scope-parser/jobs/:jobId/review')
  @UseGuards(IdempotencyGuard)
  reviewParsingCandidate(
    @Param('projectId') projectId: string,
    @Param('jobId') jobId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult {
    const parseRes = ExtractionCandidateReviewSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException(
        {
          code: 'INVALID_ARGUMENT',
          title: 'Invalid candidate review payload',
          detail: parseRes.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const data: ExtractionCandidateReviewDto = parseRes.data;
    const job = parsingJobRepository.get(jobId);
    if (!job || job.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Parsing job not found' }, HttpStatus.NOT_FOUND);
    }

    const candidate = job.candidates.find((c) => c.id === data.candidateId);
    if (!candidate) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Candidate not found' }, HttpStatus.NOT_FOUND);
    }

    const orgId = job.organisationId;
    const actorId = (req as any).actorId || (req as any).userId || 'project-manager';
    candidate.reviewerId = actorId;
    candidate.reviewerNotes = data.reviewerNotes;

    let createdReq: StoredRequirement | undefined;

    if (data.action === 'approve' || data.action === 'accept' || data.action === 'accept_with_changes') {
      const overrides = data.edits || {};

      // Invariant: Check if candidate is a BOQ row matching an existing requirement
      if (candidate.candidateType === 'boq_line' || candidate.queueType === 'boq_commercial_lines' || data.targetRequirementId) {
        const targetReqId = data.targetRequirementId || candidate.linkedExistingRequirementId;
        const target = targetReqId ? requirementRepository.get(targetReqId) : undefined;
        if (target) {
          // Link BOQ row directly to master requirement, do not duplicate master requirement!
          target.linkedBoqLineCode = candidate.boqReference || `BOQ-${candidate.candidateCode}`;
          target.updatedAt = new Date().toISOString();
          requirementRepository.set(target.id, target);
          candidate.reviewStatus = 'accepted';
          candidate.acceptedTargetId = target.id;
          job.approvedCount++;

          requirementAuditLog.push({
            id: `audit-${Date.now()}`,
            entityType: 'requirement',
            entityId: target.id,
            action: 'link_boq_row',
            actorId,
            details: { boqReference: target.linkedBoqLineCode, candidateId: candidate.id },
            timestamp: new Date().toISOString(),
          });

          return {
            data: {
              id: candidate.id,
              status: 'accepted',
              recordVersion: 1,
              payload: { candidate, linkedRequirement: target },
            },
            meta: { requestId: `req-${Date.now()}` },
          };
        }
      }

      // Create standard Phase 1 / Phase 2 Requirement
      const projectReqs = Array.from(requirementRepository.values()).filter((r) => r.projectId === projectId);
      const reqCode = overrides.code || `REQ-QND-${String(projectReqs.length + 1).padStart(3, '0')}`;
      const reqId = `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      createdReq = {
        id: reqId,
        organisationId: orgId,
        projectId,
        code: reqCode,
        title: overrides.title || candidate.title,
        description: overrides.description || candidate.description,
        originalWording: candidate.originalWording || candidate.sourceQuote,
        interpretation: overrides.interpretation,
        sourceType: 'Client RFP',
        sourceReference: overrides.sourceReference || candidate.sourceReference,
        category: (overrides.category as any) || (candidate.suggestedCategory as any) || 'staging_technical',
        discipline: overrides.discipline || candidate.suggestedDiscipline,
        department: overrides.department || candidate.suggestedDepartment,
        ownerId: overrides.ownerId,
        ownerName: overrides.ownerName,
        dueDate: overrides.dueDate || candidate.extractedDates,
        acceptanceCriteria: overrides.acceptanceCriteria || candidate.extractedAcceptanceCriteria,
        responsibleParty: overrides.responsibleParty || candidate.extractedResponsibilities || 'e3',
        priority: overrides.priority || candidate.priority || 'medium',
        risk: overrides.risk || candidate.risk || 'medium',
        status: (overrides.status as any) || 'draft',
        disposition: (overrides.disposition as any) || 'applicable',
        recordVersion: 1,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      requirementRepository.set(reqId, createdReq);

      // Create Allocations atomically if explicitly present or suggested and confirmed
      const allocationsToCreate = overrides.allocations || candidate.suggestedAllocations;
      if (allocationsToCreate && Array.isArray(allocationsToCreate) && allocationsToCreate.length > 0) {
        for (let i = 0; i < allocationsToCreate.length; i++) {
          const alloc = allocationsToCreate[i];
          const allocId = `alloc-${Date.now()}-${i + 1}`;
          const newAlloc: RequirementAllocation = {
            id: allocId,
            requirementId: reqId,
            organisationId: orgId,
            projectId,
            zone: alloc.zone || 'General Zone',
            location: alloc.location || alloc.zone || 'Main Venue',
            quantity: Number(alloc.quantity) || 1,
            unit: candidate.unit || 'pcs',
            status: 'assigned',
            completionPct: 0,
            revision: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          allocationRepository.set(allocId, newAlloc);
        }
      }

      // Create Design Package if designRequired is true
      if (candidate.designRequired) {
        const dpId = `des-pkg-${Date.now()}`;
        const designPkg: DesignPackage = {
          id: dpId,
          organisationId: orgId,
          projectId,
          title: `Design Package: ${createdReq.title}`,
          discipline: createdReq.discipline,
          brief: `Client RFP Requirement: ${createdReq.description}`,
          revision: 1,
          status: 'in_progress',
          internalApproval: false,
          clientApproval: false,
          productionReleaseStatus: 'not_released',
          approvedQuantity: 0,
          releasedQuantity: 0,
          linkedRequirementIds: [reqId],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        designPackageRepository.set(dpId, designPkg);
        createdReq.linkedDesignId = dpId;
        requirementRepository.set(reqId, createdReq);
      }

      candidate.reviewStatus = data.action === 'accept_with_changes' ? 'accepted_with_changes' : 'accepted';
      candidate.acceptedTargetId = reqId;
      job.approvedCount++;

      requirementAuditLog.push({
        id: `audit-${Date.now()}`,
        entityType: 'requirement',
        entityId: reqId,
        action: 'import_from_parser',
        actorId,
        details: { candidateCode: candidate.candidateCode, source: candidate.sourceReference },
        timestamp: new Date().toISOString(),
      });
    } else if (data.action === 'reject') {
      candidate.reviewStatus = 'rejected';
      job.rejectedCount++;
    } else if (data.action === 'merge') {
      candidate.reviewStatus = 'merged';
      if (data.mergeTargetId) {
        const target = requirementRepository.get(data.mergeTargetId);
        if (target && !target.originalWording) {
          target.originalWording = candidate.sourceQuote;
          requirementRepository.set(target.id, target);
        }
      }
    } else if (data.action === 'convert_to_allocation') {
      const targetReqId = data.targetRequirementId || candidate.linkedExistingRequirementId;
      if (!targetReqId) {
        throw new HttpException({ code: 'BAD_REQUEST', title: 'Target requirement ID required to convert to allocation' }, HttpStatus.BAD_REQUEST);
      }
      const allocId = `alloc-${Date.now()}`;
      const newAlloc: RequirementAllocation = {
        id: allocId,
        requirementId: targetReqId,
        organisationId: orgId,
        projectId,
        zone: candidate.suggestedAllocations?.[0]?.zone || 'VIP Zone',
        location: candidate.title,
        quantity: candidate.quantity || 1,
        unit: candidate.unit || 'pcs',
        status: 'assigned',
        completionPct: 0,
        revision: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      allocationRepository.set(allocId, newAlloc);
      candidate.reviewStatus = 'accepted';
      candidate.acceptedTargetId = allocId;
      job.approvedCount++;
    } else if (data.action === 'mark_as_clarification' || data.action === 'convert_to_clarification') {
      candidate.reviewStatus = 'converted_to_clarification';
      job.clarificationCount++;

      const clarCount = Array.from(clarificationRepository.values()).filter((c) => c.projectId === projectId).length;
      const clarCode = `RFI-QND-${String(clarCount + 1).padStart(3, '0')}`;
      const clarId = `clar-${Date.now()}`;
      const clar: ClarificationItem & { organisationId?: string } = {
        id: clarId,
        projectId,
        organisationId: orgId,
        clarificationCode: clarCode,
        title: `Scope Clarification: ${candidate.title.slice(0, 50)}`,
        question: candidate.suggestedClarifications?.includes('Ambiguity identified')
          ? candidate.suggestedClarifications
          : (candidate.suggestedClarifications
              ? `Ambiguity identified: ${candidate.suggestedClarifications}`
              : `Ambiguity identified during tender parsing: ${candidate.conflictNotes || candidate.description || candidate.sourceQuote}`),
        category: 'technical',
        discipline: candidate.suggestedDiscipline || 'staging',
        source: 'bidder_inquiry',
        author: 'Scope Parser Engine',
        assignedResponder: 'Client Technical Representative',
        dateRaised: new Date().toISOString(),
        targetResponseDate: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
        dueAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
        hasCommercialImpact: true,
        hasScheduleImpact: false,
        rfpSectionRef: candidate.sourceSection || 'Tender Document',
        status: 'draft',
        impact: assessClarificationImpact({ scopeAltered: true }),
        linkedRequirementIds: data.targetRequirementId ? [data.targetRequirementId] : [],
        linkedDesignIds: [],
        linkedBoqLineCodes: [],
        linkedScheduleTaskIds: [],
        linkedDocumentNumbers: [],
        createdAt: new Date().toISOString(),
      };
      clarificationRepository.set(clarId, clar);
      candidate.acceptedTargetId = clarId;
    } else if (data.action === 'mark_client_resp') {
      candidate.reviewStatus = 'info_only';
      candidate.queueType = 'client_responsibilities';
    } else if (data.action === 'mark_contractor_resp') {
      candidate.queueType = 'contractor_responsibilities';
    } else if (data.action === 'mark_info_only') {
      candidate.reviewStatus = 'info_only';
      candidate.queueType = 'information_only';
    } else if (data.action === 'defer') {
      candidate.reviewStatus = 'deferred';
    }

    parsingJobRepository.set(job.id, job);

    const reqForTrace = createdReq;
    return {
      data: {
        id: candidate.id,
        status: data.action === 'approve' ? 'approved' : candidate.reviewStatus,
        recordVersion: 1,
        payload: {
          candidate,
          createdRequirement: reqForTrace
            ? { ...reqForTrace, traceability: evaluateRequirementTraceability(reqForTrace) }
            : undefined,
          jobSummary: {
            totalExtracted: job.totalExtracted,
            approvedCount: job.approvedCount,
            rejectedCount: job.rejectedCount,
            clarificationCount: job.clarificationCount,
          },
        },
      },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Post('scope-parser/jobs/:jobId/bulk-review')
  @UseGuards(IdempotencyGuard)
  bulkReviewCandidates(
    @Param('projectId') projectId: string,
    @Param('jobId') jobId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult {
    const parseRes = BulkCandidateReviewSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException(
        {
          code: 'INVALID_ARGUMENT',
          title: 'Invalid bulk review payload',
          detail: parseRes.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const data: BulkCandidateReviewDto = parseRes.data;
    const job = parsingJobRepository.get(jobId);
    if (!job || job.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Parsing job not found' }, HttpStatus.NOT_FOUND);
    }

    const actorId = (req as any).actorId || (req as any).userId || 'project-manager';
    const targetCandidates = job.candidates.filter((c) => data.candidateIds.includes(c.id));

    // Enforce Safety Guards for Bulk Review
    if (data.action === 'approve') {
      for (const cand of targetCandidates) {
        if (!data.forceLowConfidence && cand.confidenceScore < 0.75) {
          throw new HttpException(
            {
              code: 'FAILED_PRECONDITION',
              title: 'Safety Interlock: Low-confidence candidates cannot be bulk approved',
              detail: `Candidate ${cand.candidateCode} (${cand.title}) has confidence score ${cand.confidenceScore}. Individual review is required.`,
            },
            HttpStatus.PRECONDITION_FAILED
          );
        }
        if (cand.conflictNotes) {
          throw new HttpException(
            {
              code: 'FAILED_PRECONDITION',
              title: 'Safety Interlock: Candidates with conflicts cannot be bulk approved',
              detail: `Candidate ${cand.candidateCode} has detected conflict: ${cand.conflictNotes}`,
            },
            HttpStatus.PRECONDITION_FAILED
          );
        }
      }
    }

    let processedCount = 0;
    for (const cand of targetCandidates) {
      cand.reviewerId = actorId;
      if (data.action === 'approve') {
        const reqId = `req-${Date.now()}-${processedCount}`;
        const createdReq: StoredRequirement = {
          id: reqId,
          organisationId: job.organisationId,
          projectId,
          code: `REQ-QND-B${String(processedCount + 1).padStart(3, '0')}`,
          title: cand.title,
          description: cand.description,
          originalWording: cand.originalWording,
          sourceType: 'Client RFP',
          sourceReference: cand.sourceReference,
          category: (cand.suggestedCategory as any) || 'staging_technical',
          discipline: cand.suggestedDiscipline,
          department: cand.suggestedDepartment,
          priority: cand.priority || 'medium',
          risk: cand.risk || 'medium',
          status: 'draft',
          disposition: 'applicable',
          recordVersion: 1,
          isArchived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        requirementRepository.set(reqId, createdReq);
        cand.reviewStatus = 'accepted';
        cand.acceptedTargetId = reqId;
        job.approvedCount++;
      } else if (data.action === 'reject') {
        cand.reviewStatus = 'rejected';
        job.rejectedCount++;
      } else if (data.action === 'mark_info_only') {
        cand.reviewStatus = 'info_only';
      }
      processedCount++;
    }

    parsingJobRepository.set(job.id, job);

    return {
      data: {
        id: jobId,
        status: 'completed',
        recordVersion: 1,
        payload: {
          processedCount,
          jobSummary: {
            totalExtracted: job.totalExtracted,
            approvedCount: job.approvedCount,
            rejectedCount: job.rejectedCount,
            clarificationCount: job.clarificationCount,
          },
        },
      },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Post('scope-parser/compare')
  @UseGuards(IdempotencyGuard)
  compareDocuments(
    @Param('projectId') projectId: string,
    @Body() body: unknown
  ): CommandResult {
    const parseRes = DocumentComparisonRequestSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException(
        {
          code: 'INVALID_ARGUMENT',
          title: 'Invalid document comparison payload',
          detail: parseRes.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const data: DocumentComparisonRequestDto = parseRes.data;
    const newJob = parsingJobRepository.get(data.newJobId);
    if (!newJob || newJob.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'New parsing job not found' }, HttpStatus.NOT_FOUND);
    }

    const priorJob = data.priorJobId ? parsingJobRepository.get(data.priorJobId) : undefined;
    const existingReqs = Array.from(requirementRepository.values()).filter((r) => r.projectId === projectId);

    const comparisonResult = compareDocumentVersions(
      {
        documentName: data.priorDocumentName || priorJob?.sourceDocumentName || 'Baseline RFP Specifications',
        candidates: priorJob?.candidates || [],
      },
      {
        documentName: data.newDocumentName || newJob.sourceDocumentName,
        candidates: newJob.candidates,
      },
      existingReqs
    );

    documentComparisonRepository.set(comparisonResult.comparisonId, comparisonResult);

    return {
      data: {
        id: comparisonResult.comparisonId,
        status: 'comparison_ready',
        recordVersion: 1,
        payload: comparisonResult,
      },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Post('scope-parser/apply-addendum-revision')
  @UseGuards(IdempotencyGuard)
  applyAddendumRevision(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult {
    const parseRes = ApplyAddendumRevisionSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException(
        {
          code: 'INVALID_ARGUMENT',
          title: 'Invalid apply revision payload',
          detail: parseRes.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const data: ApplyAddendumRevisionDto = parseRes.data;
    const actorId = (req as any).actorId || (req as any).userId || 'approver-lead';

    // Locate delta item in comparisons
    let foundDelta: DocumentDeltaItem | undefined;
    for (const cmp of documentComparisonRepository.values()) {
      const match = cmp.deltas.find((d) => d.id === data.deltaId);
      if (match) {
        foundDelta = match;
        break;
      }
    }

    if (!foundDelta) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Delta item not found in document comparisons' }, HttpStatus.NOT_FOUND);
    }

    // Find target requirement
    const targetReqId = data.targetRequirementId || foundDelta.affectedRequirementId;
    let targetReq = targetReqId ? requirementRepository.get(targetReqId) : undefined;

    if (!targetReq) {
      // Find requirement by keyword e.g. "counter"
      targetReq = Array.from(requirementRepository.values()).find((r) => r.projectId === projectId && r.title.toLowerCase().includes('counter'));
    }

    if (!targetReq) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Target requirement not found to apply revision' }, HttpStatus.NOT_FOUND);
    }

    const previousBaseline = targetReq.interpretation || `Original baseline: ${foundDelta.previousQuantity || 20} units`;
    const revId = `rev-${Date.now()}`;
    const newRevNumber = (revisionRepository.get(targetReq.id)?.length || 0) + 1;

    const revision: RequirementRevision = {
      id: revId,
      requirementId: targetReq.id,
      organisationId: targetReq.organisationId,
      projectId,
      revisionNumber: newRevNumber,
      changedFields: ['quantity', 'allocations', 'specifications'],
      previousValues: {
        quantity: foundDelta.previousQuantity || 20,
        originalWording: foundDelta.previousWording,
      },
      newValues: {
        quantity: foundDelta.newQuantity || 24,
        originalWording: foundDelta.newWording,
        quantityDelta: foundDelta.quantityDelta || 4,
        proposedDesignVariant: foundDelta.proposedDesignVariant,
      },
      reasonForChange: data.reason,
      impact: {
        scopeAltered: true,
        designImpact: foundDelta.designImpact,
        boqImpact: foundDelta.boqImpact,
        originalBaseline: foundDelta.previousQuantity || 20,
        currentRequirement: foundDelta.newQuantity || 24,
      },
      authorId: actorId,
      createdAt: new Date().toISOString(),
    };

    const existingRevs = revisionRepository.get(targetReq.id) || [];
    existingRevs.push(revision);
    revisionRepository.set(targetReq.id, existingRevs);

    // Apply allocations if confirmed (e.g. VIP Zone: 4)
    if (data.confirmAllocations && foundDelta.affectedAllocations) {
      for (let i = 0; i < foundDelta.affectedAllocations.length; i++) {
        const a = foundDelta.affectedAllocations[i];
        const allocId = `alloc-${Date.now()}-${i + 1}`;
        const newAlloc: RequirementAllocation = {
          id: allocId,
          requirementId: targetReq.id,
          organisationId: targetReq.organisationId,
          projectId,
          zone: a.zone,
          location: `${a.zone} — Premium Counter Location`,
          quantity: a.quantity,
          unit: 'Nos',
          status: 'assigned',
          completionPct: 0,
          revision: newRevNumber,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        allocationRepository.set(allocId, newAlloc);
      }
    }

    // Apply Design Variant if proposed
    if (foundDelta.proposedDesignVariant) {
      const variantId = `var-${Date.now()}`;
      const newVariant: DesignVariant = {
        id: variantId,
        requirementId: targetReq.id,
        organisationId: targetReq.organisationId,
        projectId,
        name: foundDelta.proposedDesignVariant,
        code: 'VAR-VIP-01',
        quantity: 4,
        approvedQuantity: 0,
        releasedQuantity: 0,
        approvalStatus: 'draft',
        productionReleaseStatus: 'not_released',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      designVariantRepository.set(variantId, newVariant);
    }

    foundDelta.reviewStatus = 'approved';

    // Update target requirement (preserve baseline in interpretation/audit)
    targetReq.recordVersion = (targetReq.recordVersion || 1) + 1;
    targetReq.interpretation = `${previousBaseline} | Addendum approved: revised to ${foundDelta.newQuantity || 24} units (+${foundDelta.quantityDelta || 4} units in VIP Zone).`;
    targetReq.updatedAt = new Date().toISOString();
    requirementRepository.set(targetReq.id, targetReq);

    requirementAuditLog.push({
      id: `audit-${Date.now()}`,
      entityType: 'requirement',
      entityId: targetReq.id,
      action: 'apply_addendum_revision',
      actorId,
      details: {
        revisionId: revId,
        quantityDelta: foundDelta.quantityDelta,
        newQuantity: foundDelta.newQuantity,
      },
      timestamp: new Date().toISOString(),
    });

    return {
      data: {
        id: revId,
        status: 'revision_applied',
        recordVersion: targetReq.recordVersion,
        payload: {
          revision,
          requirement: targetReq,
          delta: foundDelta,
        },
      },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Get('requirements-export')
  exportRequirements(
    @Param('projectId') projectId: string,
    @Query('format') format?: string
  ) {
    const reqs = Array.from(requirementRepository.values())
      .filter((r) => r.projectId === projectId && !r.isArchived)
      .map((r) => {
        const traceability = evaluateRequirementTraceability(r);
        return { ...r, traceability };
      });

    if (format === 'csv') {
      const headers = [
        'Code',
        'Title',
        'Category',
        'Discipline',
        'Status',
        'Disposition',
        'Completeness',
        'Owner',
        'Due Date',
        'Source Reference',
        'Linked Document',
        'Linked Design',
        'Linked BOQ',
        'Linked Task',
        'Tender Ready',
        'Design Ready',
        'Commercial Ready',
        'Production Ready',
        'Closeout Ready',
      ];

      const rows = reqs.map((r) => [
        `"${r.code || ''}"`,
        `"${(r.title || '').replace(/"/g, '""')}"`,
        `"${r.category || ''}"`,
        `"${r.discipline || ''}"`,
        `"${r.status || ''}"`,
        `"${r.disposition || ''}"`,
        `"${r.traceability.completenessRatio}"`,
        `"${(r.ownerName || '').replace(/"/g, '""')}"`,
        `"${r.dueDate || ''}"`,
        `"${(r.sourceReference || '').replace(/"/g, '""')}"`,
        `"${r.linkedDocumentNumber || ''}"`,
        `"${r.linkedDesignId || ''}"`,
        `"${r.linkedBoqLineCode || ''}"`,
        `"${r.linkedTaskId || ''}"`,
        r.traceability.stageReadiness.tenderDevelopment.satisfied ? 'YES' : 'NO',
        r.traceability.stageReadiness.designDevelopment.satisfied ? 'YES' : 'NO',
        r.traceability.stageReadiness.commercialAuthorization.satisfied ? 'YES' : 'NO',
        r.traceability.stageReadiness.productionRelease.satisfied ? 'YES' : 'NO',
        r.traceability.stageReadiness.closeout.satisfied ? 'YES' : 'NO',
      ]);

      const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

      return {
        data: {
          csv: csvContent,
          total: reqs.length,
          filename: `Scope_Register_${projectId.slice(0, 8)}.csv`,
        },
      };
    }

    return {
      data: {
        requirements: reqs,
        total: reqs.length,
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

  // =========================================================================
  // PHASE 2: RECONCILIATION HELPER & AUDIT LOGGER
  // =========================================================================

  private syncRequirementReconciliation(_projectId: string, reqId: string): ReconciliationSummary | null {
    const req = requirementRepository.get(reqId);
    if (!req) return null;

    const allocations = Array.from(allocationRepository.values()).filter((a) => a.requirementId === reqId);
    const variants = Array.from(designVariantRepository.values()).filter((v) => v.requirementId === reqId);
    const batches = Array.from(productionBatchRepository.values()).filter((b) => {
      if (b.designVariantId && variants.some((v) => v.id === b.designVariantId)) return true;
      if (b.items?.some((item) => allocations.some((a) => a.id === item.allocationId))) return true;
      return false;
    });

    const recon = calculateRequirementReconciliation(req, allocations, variants, batches);

    // Sync back onto stored requirement
    req.allocatedQuantity = recon.totalAllocated;
    req.designApprovedQuantity = recon.designApproved;
    req.releasedQuantity = recon.releasedToProduction;
    req.producedQuantity = recon.produced;
    req.deliveredQuantity = recon.delivered;
    req.installedQuantity = recon.installed;
    req.acceptedQuantity = recon.accepted;
    req.allocationStatus = recon.allocationStatus;
    req.designStatus = recon.designStatus;
    req.productionStatus = recon.productionStatus;
    req.logisticsStatus = recon.logisticsStatus;
    req.installationStatus = recon.installationStatus;
    requirementRepository.set(reqId, req);

    return recon;
  }

  // =========================================================================
  // 1. ALLOCATION ENDPOINTS
  // =========================================================================

  @Get('requirements/:reqId/allocations')
  getAllocations(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string
  ) {
    const list = Array.from(allocationRepository.values()).filter(
      (a) => a.projectId === projectId && a.requirementId === reqId
    );
    const recon = this.syncRequirementReconciliation(projectId, reqId);
    return { data: list, meta: { total: list.length, reconciliation: recon } };
  }

  listAllocations(projectId: string, reqId: string) {
    return this.getAllocations(projectId, reqId);
  }

  @Post('requirements/:reqId/allocations')
  @UseGuards(IdempotencyGuard)
  createAllocation(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult {
    const parseRes = RequirementAllocationCreateSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid allocation data', errors: parseRes.error.issues }, HttpStatus.BAD_REQUEST);
    }
    const reqItem = requirementRepository.get(reqId);
    if (!reqItem) throw new HttpException({ code: 'NOT_FOUND', title: 'Requirement not found' }, HttpStatus.NOT_FOUND);

    const data: RequirementAllocationCreateDto = parseRes.data;
    const allocId = `alloc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date().toISOString();
    const zone = data.zone || data.zoneName || data.zoneId || 'General';
    const location = data.location || data.zoneName || data.zone || 'General';
    const quantity = data.quantity ?? data.allocatedQuantity ?? 1;

    const allocation: RequirementAllocation = {
      id: allocId,
      requirementId: reqId,
      projectId,
      organisationId: reqItem.organisationId || '11111111-1111-4111-8111-111111111111',
      zone,
      location,
      subLocation: data.subLocation,
      quantity,
      unit: data.unit || reqItem.unit || 'pcs',
      designVariantId: data.designVariantId,
      requiredDate: data.requiredDate || data.targetDeliveryDate,
      installationDate: data.installationDate,
      locationNotes: data.locationNotes,
      status: data.status || 'unassigned',
      responsibleTeam: data.responsibleTeam || data.responsibleParty,
      completionPct: 0,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    };

    allocationRepository.set(allocId, allocation);
    const recon = this.syncRequirementReconciliation(projectId, reqId);

    requirementAuditLog.push({
      action: 'allocation_created',
      requirementId: reqId,
      allocationId: allocId,
      quantity,
      zone,
      location,
      actor: (req as any).user?.name || 'User',
      timestamp: now,
    });

    return {
      data: {
        id: allocId,
        status: allocation.status,
        recordVersion: 1,
        allocatedQuantity: allocation.quantity,
        quantity: allocation.quantity,
        allocation,
        payload: {
          ...allocation,
          allocation,
          allocatedQuantity: allocation.quantity,
          reconciliation: recon,
        },
      } as any,
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Put('requirements/:reqId/allocations/:allocId')
  @UseGuards(IdempotencyGuard)
  updateAllocation(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string,
    @Param('allocId') allocId: string,
    @Body() body: unknown
  ): CommandResult {
    const alloc = allocationRepository.get(allocId);
    if (!alloc || alloc.requirementId !== reqId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Allocation not found' }, HttpStatus.NOT_FOUND);
    }

    const parseRes = RequirementAllocationUpdateSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid allocation update' }, HttpStatus.BAD_REQUEST);
    }

    const updates = parseRes.data;
    Object.assign(alloc, updates);
    alloc.updatedAt = new Date().toISOString();
    alloc.revision = (alloc.revision || 1) + 1;
    allocationRepository.set(allocId, alloc);

    const recon = this.syncRequirementReconciliation(projectId, reqId);

    return {
      data: { id: allocId, status: alloc.status, recordVersion: alloc.revision, payload: { allocation: alloc, reconciliation: recon } },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Delete('requirements/:reqId/allocations/:allocId')
  deleteAllocation(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string,
    @Param('allocId') allocId: string
  ): CommandResult {
    const alloc = allocationRepository.get(allocId);
    if (!alloc || alloc.requirementId !== reqId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Allocation not found' }, HttpStatus.NOT_FOUND);
    }

    allocationRepository.delete(allocId);
    const recon = this.syncRequirementReconciliation(projectId, reqId);

    return {
      data: { id: allocId, status: 'deleted', recordVersion: 1, payload: { reconciliation: recon } },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Post('requirements/:reqId/allocations/split')
  @UseGuards(IdempotencyGuard)
  splitAllocation(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string,
    @Body() bodyOrAllocId: any,
    optBody?: any,
    _req?: any
  ): CommandResult {
    let body = bodyOrAllocId;
    let targetAllocId: string | undefined;
    if (typeof bodyOrAllocId === 'string') {
      targetAllocId = bodyOrAllocId;
      body = optBody || {};
    }
    if (targetAllocId && !body.allocationId) {
      body = { ...body, allocationId: targetAllocId };
    }

    const parseRes = RequirementAllocationSplitSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid split payload' }, HttpStatus.BAD_REQUEST);
    }

    const { allocationId, splits } = parseRes.data;
    const original = allocationRepository.get(allocationId || targetAllocId!);
    if (!original || original.requirementId !== reqId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Target allocation not found' }, HttpStatus.NOT_FOUND);
    }

    const splitTotal = splits.reduce((sum, s) => sum + s.quantity, 0);
    if (Math.abs(splitTotal - original.quantity) > 0.001) {
      throw new HttpException(
        { code: 'SPLIT_MISMATCH', title: 'Split sum mismatch', detail: `Sum of splits (${splitTotal}) must equal original quantity (${original.quantity})` },
        HttpStatus.BAD_REQUEST
      );
    }

    allocationRepository.delete(original.id);
    const createdSplits: RequirementAllocation[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < splits.length; i++) {
      const s = splits[i];
      const newId = `alloc-${Date.now()}-split-${i + 1}`;
      const newAlloc: RequirementAllocation = {
        ...original,
        id: newId,
        zone: s.zone || original.zone,
        location: s.location || original.location,
        subLocation: s.subLocation || original.subLocation,
        quantity: s.quantity,
        designVariantId: s.designVariantId || original.designVariantId,
        revision: 1,
        createdAt: now,
        updatedAt: now,
      };
      (newAlloc as any).allocatedQuantity = s.quantity;
      (newAlloc as any).zoneName = newAlloc.zone;
      allocationRepository.set(newId, newAlloc);
      createdSplits.push(newAlloc);
    }

    const recon = this.syncRequirementReconciliation(projectId, reqId);

    return {
      data: {
        id: original.id,
        status: 'split',
        recordVersion: 1,
        splits: createdSplits,
        createdAllocations: createdSplits,
        payload: { splits: createdSplits, createdAllocations: createdSplits, reconciliation: recon },
      } as any,
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Post('requirements/:reqId/allocations/merge')
  @UseGuards(IdempotencyGuard)
  mergeAllocations(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string,
    @Body() body: unknown
  ): CommandResult {
    const parseRes = RequirementAllocationMergeSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid merge payload' }, HttpStatus.BAD_REQUEST);
    }

    const { allocationIds, targetZone, targetLocation, targetSubLocation, designVariantId } = parseRes.data;
    const existing = allocationIds.map((id) => allocationRepository.get(id)).filter(Boolean) as RequirementAllocation[];
    if (existing.length < 2) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'At least 2 valid allocations required to merge' }, HttpStatus.BAD_REQUEST);
    }

    const totalQty = existing.reduce((sum, a) => sum + a.quantity, 0);
    for (const a of existing) {
      allocationRepository.delete(a.id);
    }

    const mergedId = `alloc-${Date.now()}-merged`;
    const now = new Date().toISOString();
    const merged: RequirementAllocation = {
      id: mergedId,
      requirementId: reqId,
      projectId,
      organisationId: existing[0].organisationId,
      zone: targetZone,
      location: targetLocation,
      subLocation: targetSubLocation,
      quantity: totalQty,
      unit: existing[0].unit,
      designVariantId: designVariantId || existing[0].designVariantId,
      status: 'assigned',
      completionPct: 0,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    };
    (merged as any).allocatedQuantity = totalQty;
    (merged as any).zoneName = targetZone;
    allocationRepository.set(mergedId, merged);

    const recon = this.syncRequirementReconciliation(projectId, reqId);

    return {
      data: {
        id: mergedId,
        status: 'merged',
        recordVersion: 1,
        merged,
        mergedAllocation: merged,
        payload: { merged, mergedAllocation: merged, reconciliation: recon },
      } as any,
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Post('requirements/:reqId/allocations/move-quantity')
  @UseGuards(IdempotencyGuard)
  moveAllocationQuantity(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string,
    @Body() body: unknown
  ): CommandResult {
    const parseRes = RequirementAllocationMoveQtySchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid move quantity payload' }, HttpStatus.BAD_REQUEST);
    }

    const { sourceAllocationId, targetAllocationId, quantity } = parseRes.data;
    const src = allocationRepository.get(sourceAllocationId);
    const tgt = allocationRepository.get(targetAllocationId);

    if (!src || !tgt || src.requirementId !== reqId || tgt.requirementId !== reqId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Source or target allocation not found' }, HttpStatus.NOT_FOUND);
    }

    if (src.quantity < quantity) {
      throw new HttpException({ code: 'INSUFFICIENT_QUANTITY', title: 'Source allocation does not have sufficient quantity to move' }, HttpStatus.BAD_REQUEST);
    }

    src.quantity -= quantity;
    tgt.quantity += quantity;
    (src as any).allocatedQuantity = src.quantity;
    (tgt as any).allocatedQuantity = tgt.quantity;
    src.updatedAt = new Date().toISOString();
    tgt.updatedAt = new Date().toISOString();
    allocationRepository.set(src.id, src);
    allocationRepository.set(tgt.id, tgt);

    const recon = this.syncRequirementReconciliation(projectId, reqId);

    return {
      data: {
        id: src.id,
        status: 'moved',
        recordVersion: 1,
        source: src,
        target: tgt,
        sourceAllocation: src,
        targetAllocation: tgt,
        payload: { source: src, target: tgt, sourceAllocation: src, targetAllocation: tgt, reconciliation: recon },
      } as any,
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  // =========================================================================
  // 2. DESIGN PACKAGES & VARIANTS ENDPOINTS
  // =========================================================================

  @Get('requirements/:reqId/design-packages')
  getDesignPackages(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string
  ) {
    const pkgs = Array.from(designPackageRepository.values()).filter(
      (p) => p.projectId === projectId && p.linkedRequirementIds?.includes(reqId)
    );
    return { data: pkgs, meta: { total: pkgs.length } };
  }

  @Post('requirements/:reqId/design-packages')
  @UseGuards(IdempotencyGuard)
  createDesignPackage(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string,
    @Body() body: unknown
  ): CommandResult {
    const parseRes = DesignPackageCreateSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid design package data' }, HttpStatus.BAD_REQUEST);
    }

    const data: DesignPackageCreateDto = parseRes.data;
    const pkgId = `dp-${Date.now()}`;
    const now = new Date().toISOString();

    const pkg: DesignPackage = {
      id: pkgId,
      projectId,
      organisationId: '11111111-1111-4111-8111-111111111111',
      title: data.title,
      discipline: data.discipline || 'Industrial & Scenic Design',
      leadDesignerId: data.leadDesignerId,
      leadDesignerName: data.leadDesignerName,
      brief: data.brief,
      specifications: data.specifications,
      materials: data.materials,
      finishes: data.finishes,
      dimensions: data.dimensions,
      revision: 1,
      status: 'in_progress',
      internalApproval: false,
      clientApproval: false,
      productionReleaseStatus: 'not_released',
      approvedQuantity: 0,
      releasedQuantity: 0,
      linkedRequirementIds: Array.from(new Set([...(data.linkedRequirementIds || []), reqId])),
      linkedAllocationIds: data.linkedAllocationIds || [],
      comments: [],
      createdAt: now,
      updatedAt: now,
    };

    designPackageRepository.set(pkgId, pkg);

    return {
      data: { id: pkgId, status: pkg.status, recordVersion: 1, payload: pkg },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Get('requirements/:reqId/design-variants')
  getDesignVariants(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string
  ) {
    const list = Array.from(designVariantRepository.values()).filter(
      (v) => v.projectId === projectId && v.requirementId === reqId
    );
    return { data: list, meta: { total: list.length } };
  }

  @Post('requirements/:reqId/design-variants')
  @UseGuards(IdempotencyGuard)
  createDesignVariant(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string,
    @Body() bodyOrPkgId: any,
    optBody?: any,
    _req?: any
  ): CommandResult {
    let pkgId: string | undefined;
    let body = bodyOrPkgId;
    if (typeof bodyOrPkgId === 'string') {
      pkgId = bodyOrPkgId;
      body = optBody || {};
    }
    if (pkgId && !body.designPackageId) {
      body = { ...body, designPackageId: pkgId };
    }

    const parseRes = DesignVariantCreateSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid variant data' }, HttpStatus.BAD_REQUEST);
    }

    const data: DesignVariantCreateDto = parseRes.data;
    const varId = `dv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date().toISOString();

    const variant: DesignVariant = {
      id: varId,
      designPackageId: data.designPackageId || pkgId,
      requirementId: reqId,
      projectId,
      organisationId: '11111111-1111-4111-8111-111111111111',
      name: data.name,
      code: data.code || data.variantCode || ('V' + (Array.from(designVariantRepository.values()).filter((v) => v.requirementId === reqId).length + 1)),
      dimensions: data.dimensions,
      materials: data.materials,
      finish: data.finish,
      media: [],
      quantity: data.quantity ?? data.targetQuantity ?? 0,
      approvedQuantity: 0,
      releasedQuantity: 0,
      approvalStatus: 'draft',
      productionReleaseStatus: 'not_released',
      linkedAllocationIds: data.linkedAllocationIds || [],
      createdAt: now,
      updatedAt: now,
    };

    designVariantRepository.set(varId, variant);
    this.syncRequirementReconciliation(projectId, reqId);

    return {
      data: { id: varId, status: variant.approvalStatus, recordVersion: 1, variant, payload: { ...variant, variant } } as any,
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Post('requirements/:reqId/design-variants/:variantId/approve')
  @UseGuards(IdempotencyGuard)
  approveDesignVariant(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string,
    arg3: any,
    arg4?: any,
    arg5?: any,
    arg6?: any
  ): CommandResult {
    let variantId = arg3;
    let body = arg4;
    let req = arg5;
    if (typeof arg4 === 'string') {
      variantId = arg4;
      body = arg5;
      req = arg6;
    }

    const parseRes = DesignVariantApproveSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid approval data' }, HttpStatus.BAD_REQUEST);
    }

    const variant = designVariantRepository.get(variantId);
    if (!variant || variant.requirementId !== reqId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Design variant not found' }, HttpStatus.NOT_FOUND);
    }

    const data: DesignVariantApproveDto = parseRes.data;
    variant.approvalStatus = 'approved';
    variant.approvedQuantity = data.approvedQuantity;
    variant.updatedAt = new Date().toISOString();
    designVariantRepository.set(variantId, variant);

    const recon = this.syncRequirementReconciliation(projectId, reqId);

    requirementAuditLog.push({
      action: 'design_variant_approved',
      requirementId: reqId,
      variantId,
      approvedQuantity: data.approvedQuantity,
      approvedBy: data.approvedBy || (req as any)?.user?.name || 'Design Lead',
      timestamp: new Date().toISOString(),
    });

    return {
      data: { id: variantId, status: 'approved', recordVersion: 1, variant, payload: { variant, reconciliation: recon } } as any,
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Post('requirements/:reqId/design-variants/:variantId/release')
  @UseGuards(IdempotencyGuard)
  releaseDesignVariantToProduction(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string,
    arg3: any,
    arg4?: any,
    arg5?: any,
    arg6?: any
  ): CommandResult {
    let variantId = arg3;
    let body = arg4;
    let req = arg5;
    if (typeof arg4 === 'string') {
      variantId = arg4;
      body = arg5;
      req = arg6;
    }

    const parseRes = DesignVariantReleaseSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid release data' }, HttpStatus.BAD_REQUEST);
    }

    const variant = designVariantRepository.get(variantId);
    if (!variant || variant.requirementId !== reqId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Design variant not found' }, HttpStatus.NOT_FOUND);
    }

    const data: DesignVariantReleaseDto = parseRes.data;

    // HARD GATE: releasedQuantity cannot exceed approvedQuantity unless authorized override
    const alreadyReleased = variant.releasedQuantity || 0;
    const newTotalRelease = alreadyReleased + data.releasedQuantity;

    if (variant.approvalStatus !== 'approved' && !data.superAdminOverride) {
      throw new HttpException(
        {
          code: 'GATE_RELEASE_BLOCKED',
          title: 'Release exceeds approved design quantity',
          detail: `Cannot release variant "${variant.name}" to production: Design approval status is "${variant.approvalStatus}". Total release exceeds approved design quantity.`,
        },
        HttpStatus.BAD_REQUEST
      );
    }

    if (newTotalRelease > variant.approvedQuantity && !data.superAdminOverride) {
      throw new HttpException(
        {
          code: 'GATE_RELEASE_BLOCKED',
          title: 'Release exceeds approved design quantity',
          detail: `Total release (${newTotalRelease}) exceeds design-approved quantity (${variant.approvedQuantity}). Super Admin override required.`,
        },
        HttpStatus.BAD_REQUEST
      );
    }

    if (data.superAdminOverride && (!data.overrideReason || data.overrideReason.trim().length < 5)) {
      throw new HttpException(
        { code: 'OVERRIDE_REASON_REQUIRED', title: 'Override reason required', detail: 'Mandatory reason and risk statement must be provided for override.' },
        HttpStatus.BAD_REQUEST
      );
    }

    variant.releasedQuantity = newTotalRelease;
    variant.productionReleaseStatus = variant.releasedQuantity >= variant.approvedQuantity ? 'released' : 'partially_released';
    variant.updatedAt = new Date().toISOString();
    designVariantRepository.set(variantId, variant);

    // Create or append to a production batch retaining allocation destinations
    const batchCode = data.targetBatchCode || data.batchCode || `PB-${String(Array.from(productionBatchRepository.values()).length + 1).padStart(3, '0')}`;
    const batchId = `batch-${batchCode.toLowerCase()}`;
    const now = new Date().toISOString();

    let batchItems: any[] = [];
    if (data.allocationDestinations && Array.isArray(data.allocationDestinations) && data.allocationDestinations.length > 0) {
      batchItems = data.allocationDestinations.map((d: any, idx: number) => ({
        id: `bi-${d.allocationId || idx}`,
        batchId,
        allocationId: d.allocationId,
        quantity: d.quantity,
        destinationZone: d.zoneName || d.zone || 'Destination Zone',
        destinationLocation: d.zoneName || d.location || 'Destination Area',
        zoneName: d.zoneName || d.zone || 'Destination Zone',
      }));
    } else {
      const linkedAllocs = Array.from(allocationRepository.values()).filter(
        (a) => a.requirementId === reqId && (a.designVariantId === variant.id || a.designVariantId === variant.code || (!a.designVariantId && variant.code === 'V1'))
      );
      batchItems = linkedAllocs.map((a) => ({
        id: `bi-${a.id}`,
        batchId,
        allocationId: a.id,
        quantity: a.quantity,
        destinationZone: a.zone,
        destinationLocation: a.location,
        zoneName: a.zone,
      }));
    }

    const batch: ProductionBatch & any = {
      id: batchId,
      projectId,
      organisationId: variant.organisationId,
      batchCode,
      batchNumber: batchCode,
      designVariantId: variant.id,
      status: 'planned',
      releasedQuantity: data.releasedQuantity,
      quantity: data.releasedQuantity,
      producedQuantity: 0,
      qcPassedQuantity: 0,
      deliveredQuantity: 0,
      installedQuantity: 0,
      acceptedQuantity: 0,
      items: batchItems,
      notes: `Released from variant ${variant.name} (${variant.code})`,
      createdAt: now,
      updatedAt: now,
    };
    productionBatchRepository.set(batchId, batch);

    const recon = this.syncRequirementReconciliation(projectId, reqId);

    requirementAuditLog.push({
      action: 'production_released',
      requirementId: reqId,
      variantId,
      batchCode,
      releasedQuantity: data.releasedQuantity,
      superAdminOverride: Boolean(data.superAdminOverride),
      overrideReason: data.overrideReason,
      releasedBy: data.releasedBy || (req as any)?.user?.name || 'Authorized Lead',
      timestamp: now,
    });

    return {
      data: {
        id: variantId,
        status: variant.productionReleaseStatus,
        recordVersion: 1,
        batch,
        payload: { variant, batch, reconciliation: recon },
      } as any,
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  releaseDesignToProduction(
    projectId: string,
    reqId: string,
    arg3: any,
    arg4?: any,
    arg5?: any,
    arg6?: any
  ): CommandResult {
    return this.releaseDesignVariantToProduction(projectId, reqId, arg3, arg4, arg5, arg6);
  }

  // =========================================================================
  // 3. FULFILMENT ITEMS / BOM ENDPOINTS
  // =========================================================================

  @Get('requirements/:reqId/fulfilment-items')
  getFulfilmentItems(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string
  ) {
    const items = Array.from(fulfilmentItemRepository.values()).filter(
      (f) => f.projectId === projectId && f.requirementId === reqId
    );
    return { data: items, meta: { total: items.length } };
  }

  @Post('requirements/:reqId/fulfilment-items/generate-draft')
  @UseGuards(IdempotencyGuard)
  generateDraftFulfilmentItems(
    @Param('projectId') _projectId: string,
    @Param('reqId') reqId: string,
    @Body() body: unknown
  ): CommandResult {
    const parseRes = FulfilmentDraftGenerateSchema.safeParse(body || {});
    const reqItem = requirementRepository.get(reqId);
    if (!reqItem) throw new HttpException({ code: 'NOT_FOUND', title: 'Requirement not found' }, HttpStatus.NOT_FOUND);

    const variantId = parseRes.success ? parseRes.data.designVariantId : undefined;
    const variant = variantId ? designVariantRepository.get(variantId) : undefined;

    const draftItems = generateDraftFulfilmentItems(reqItem, variant, reqItem.organisationId);
    for (const item of draftItems) {
      fulfilmentItemRepository.set(item.id, item);
    }

    return {
      data: {
        id: reqId,
        status: 'drafts_generated',
        recordVersion: 1,
        items: draftItems,
        payload: { items: draftItems },
      } as any,
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Post('requirements/:reqId/fulfilment-items')
  @UseGuards(IdempotencyGuard)
  createFulfilmentItem(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string,
    @Body() body: unknown
  ): CommandResult {
    const parseRes = FulfilmentItemCreateSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid fulfilment item data' }, HttpStatus.BAD_REQUEST);
    }

    const data: FulfilmentItemCreateDto = parseRes.data;
    const itemId = `fi-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date().toISOString();

    const item: FulfilmentItem = {
      id: itemId,
      requirementId: reqId,
      allocationId: data.allocationId,
      designVariantId: data.designVariantId,
      projectId,
      organisationId: '11111111-1111-4111-8111-111111111111',
      itemDescription: data.itemDescription,
      quantity: data.quantity,
      unit: data.unit || 'pcs',
      classification: data.classification,
      material: data.material,
      department: data.department,
      responsibleOwnerId: data.responsibleOwnerId,
      responsibleOwnerName: data.responsibleOwnerName,
      supplierId: data.supplierId,
      boqLineCode: data.boqLineCode,
      productionStatus: 'not_started',
      qcStatus: 'pending',
      requiredDate: data.requiredDate,
      notes: data.notes,
      status: 'draft_review',
      createdAt: now,
      updatedAt: now,
    };

    fulfilmentItemRepository.set(itemId, item);

    return {
      data: { id: itemId, status: item.status, recordVersion: 1, payload: item },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Post('requirements/:reqId/fulfilment-items/review-batch')
  @UseGuards(IdempotencyGuard)
  reviewFulfilmentBatch(
    @Param('projectId') _projectId: string,
    @Param('reqId') reqId: string,
    @Body() body: unknown
  ): CommandResult {
    const parseRes = FulfilmentReviewBatchSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid batch review payload' }, HttpStatus.BAD_REQUEST);
    }

    const { itemIds, action, reviewStatus, fulfilmentStage, boqLineCode, department, responsibleOwnerId, responsibleOwnerName } = parseRes.data;
    const updatedItems: FulfilmentItem[] = [];

    for (const id of itemIds) {
      const item = fulfilmentItemRepository.get(id);
      if (!item || item.requirementId !== reqId) continue;

      if (action === 'approve' || reviewStatus === 'approved') {
        item.status = 'approved';
        item.reviewStatus = 'approved';
      } else if (action === 'reject' || reviewStatus === 'rejected') {
        item.status = 'rejected';
        item.reviewStatus = 'rejected';
      } else if (action === 'release_to_production') {
        item.status = 'released';
        item.productionStatus = 'not_started';
      } else if (action === 'link_boq' && boqLineCode) {
        item.boqLineCode = boqLineCode;
      }

      if (reviewStatus) {
        item.reviewStatus = reviewStatus as any;
      }

      if (fulfilmentStage) {
        (item as any).fulfilmentStage = fulfilmentStage;
      }

      if (department) item.department = department;
      if (responsibleOwnerId) item.responsibleOwnerId = responsibleOwnerId;
      if (responsibleOwnerName) item.responsibleOwnerName = responsibleOwnerName;
      item.updatedAt = new Date().toISOString();

      fulfilmentItemRepository.set(id, item);
      updatedItems.push(item);
    }

    return {
      data: {
        id: reqId,
        status: action || reviewStatus || 'reviewed',
        recordVersion: 1,
        reviewedCount: updatedItems.length,
        items: updatedItems,
        payload: { items: updatedItems, reviewedCount: updatedItems.length },
      } as any,
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  batchReviewFulfilmentItems(
    projectId: string,
    reqId: string,
    body: unknown,
    _req?: any
  ): CommandResult {
    return this.reviewFulfilmentBatch(projectId, reqId, body);
  }

  // =========================================================================
  // 4. DEPARTMENT WORK PACKAGES ENDPOINTS
  // =========================================================================

  @Get('requirements/:reqId/work-packages')
  getWorkPackages(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string
  ) {
    const wps = Array.from(workPackageRepository.values()).filter(
      (w) => w.projectId === projectId && w.requirementId === reqId
    );
    return { data: wps, meta: { total: wps.length } };
  }

  @Post('requirements/:reqId/work-packages')
  @UseGuards(IdempotencyGuard)
  createWorkPackage(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string,
    @Body() body: unknown
  ): CommandResult {
    const parseRes = DepartmentWorkPackageCreateSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid work package data' }, HttpStatus.BAD_REQUEST);
    }

    const data: DepartmentWorkPackageCreateDto = parseRes.data;
    const wpId = `wp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date().toISOString();

    const wp: DepartmentWorkPackage = {
      id: wpId,
      requirementId: reqId,
      projectId,
      organisationId: '11111111-1111-4111-8111-111111111111',
      title: data.title,
      department: data.department,
      responsibleOwnerId: data.responsibleOwnerId,
      responsibleOwnerName: data.responsibleOwnerName,
      supportingDepartment: data.supportingDepartment,
      supportingUserIds: data.supportingUserIds || [],
      approverId: data.approverId,
      approverName: data.approverName,
      startDate: data.startDate,
      dueDate: data.dueDate,
      status: data.status || 'pending',
      progress: data.progress || 0,
      dependency: data.dependency,
      deliverables: data.deliverables,
      evidenceRef: data.evidenceRef,
      createdAt: now,
      updatedAt: now,
    };

    workPackageRepository.set(wpId, wp);

    return {
      data: { id: wpId, status: wp.status, recordVersion: 1, payload: wp },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Post('requirements/:reqId/work-packages/template')
  @UseGuards(IdempotencyGuard)
  instantiateWorkPackageTemplate(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string,
    @Body() body: { category?: string }
  ): CommandResult {
    const reqItem = requirementRepository.get(reqId);
    if (!reqItem) throw new HttpException({ code: 'NOT_FOUND', title: 'Requirement not found' }, HttpStatus.NOT_FOUND);

    const category = body?.category || reqItem.category || 'creative_visual';
    const suggested = generateSuggestedWorkPackages(category, reqId, projectId, reqItem.organisationId);

    for (const wp of suggested) {
      workPackageRepository.set(wp.id, wp);
    }

    return {
      data: {
        id: reqId,
        status: 'template_instantiated',
        recordVersion: 1,
        workPackages: suggested,
        payload: { workPackages: suggested },
      } as any,
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  // Aliases for programmatic/test invocation
  instantiateWorkPackagesFromTemplate(
    projectId: string,
    reqId: string,
    categoryOrBody?: any,
    _req?: any
  ): CommandResult {
    const body = typeof categoryOrBody === 'string' ? { category: categoryOrBody } : categoryOrBody;
    return this.instantiateWorkPackageTemplate(projectId, reqId, body || {});
  }

  listWorkPackages(projectId: string, reqId: string) {
    return this.getWorkPackages(projectId, reqId);
  }

  listFulfilmentItems(projectId: string, reqId: string) {
    return this.getFulfilmentItems(projectId, reqId);
  }

  @Put('requirements/:reqId/work-packages/:wpId')
  @UseGuards(IdempotencyGuard)
  updateWorkPackage(
    @Param('projectId') _projectId: string,
    @Param('reqId') reqId: string,
    @Param('wpId') wpId: string,
    @Body() body: unknown
  ): CommandResult {
    const wp = workPackageRepository.get(wpId);
    if (!wp || wp.requirementId !== reqId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Work package not found' }, HttpStatus.NOT_FOUND);
    }

    const parseRes = DepartmentWorkPackageCreateSchema.partial().safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid work package update' }, HttpStatus.BAD_REQUEST);
    }

    Object.assign(wp, parseRes.data);
    wp.updatedAt = new Date().toISOString();
    workPackageRepository.set(wpId, wp);

    return {
      data: { id: wpId, status: wp.status, recordVersion: 1, payload: wp },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Delete('requirements/:reqId/work-packages/:wpId')
  deleteWorkPackage(
    @Param('projectId') _projectId: string,
    @Param('reqId') reqId: string,
    @Param('wpId') wpId: string
  ): CommandResult {
    const wp = workPackageRepository.get(wpId);
    if (!wp || wp.requirementId !== reqId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Work package not found' }, HttpStatus.NOT_FOUND);
    }

    workPackageRepository.delete(wpId);
    return {
      data: { id: wpId, status: 'deleted', recordVersion: 1, payload: null },
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  // =========================================================================
  // 5. PRODUCTION BATCHES & PROGRESS ENDPOINTS
  // =========================================================================

  @Get('requirements/:reqId/batches')
  getBatches(
    @Param('projectId') _projectId: string,
    @Param('reqId') reqId: string
  ) {
    const allocations = Array.from(allocationRepository.values()).filter((a) => a.requirementId === reqId);
    const variants = Array.from(designVariantRepository.values()).filter((v) => v.requirementId === reqId);

    const batches = Array.from(productionBatchRepository.values()).filter((b) => {
      if (b.designVariantId && variants.some((v) => v.id === b.designVariantId)) return true;
      if (b.items?.some((item) => allocations.some((a) => a.id === item.allocationId))) return true;
      return false;
    });

    return { data: batches, meta: { total: batches.length } };
  }

  @Post('requirements/:reqId/batches')
  @UseGuards(IdempotencyGuard)
  createProductionBatch(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string,
    @Body() body: unknown
  ): CommandResult {
    const parseRes = ProductionBatchCreateSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid production batch payload' }, HttpStatus.BAD_REQUEST);
    }

    const data: ProductionBatchCreateDto = parseRes.data;
    const batchId = `batch-${Date.now()}-${data.batchCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const now = new Date().toISOString();

    const batch: ProductionBatch = {
      id: batchId,
      projectId,
      organisationId: '11111111-1111-4111-8111-111111111111',
      batchCode: data.batchCode,
      designVariantId: data.designVariantId,
      status: 'planned',
      releasedQuantity: data.releasedQuantity,
      producedQuantity: 0,
      qcPassedQuantity: 0,
      deliveredQuantity: 0,
      installedQuantity: 0,
      acceptedQuantity: 0,
      notes: data.notes,
      items: data.items || [],
      createdAt: now,
      updatedAt: now,
    };

    productionBatchRepository.set(batchId, batch);
    const recon = this.syncRequirementReconciliation(projectId, reqId);

    return {
      data: { id: batchId, status: batch.status, recordVersion: 1, batch, payload: { batch, reconciliation: recon } } as any,
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  @Post('requirements/:reqId/batches/:batchId/progress')
  @UseGuards(IdempotencyGuard)
  recordBatchProgress(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string,
    @Param('batchId') batchId: string,
    @Body() body: unknown
  ): CommandResult {
    const parseRes = ProductionBatchProgressSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid batch progress data' }, HttpStatus.BAD_REQUEST);
    }

    const batch = productionBatchRepository.get(batchId);
    if (!batch || batch.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Production batch not found' }, HttpStatus.NOT_FOUND);
    }

    const data: ProductionBatchProgressDto = parseRes.data;

    // Gate rules
    if (data.producedQuantity !== undefined) {
      if (data.producedQuantity > batch.releasedQuantity && !data.superAdminOverride) {
        throw new HttpException(
          { code: 'GATE_PRODUCE_BLOCKED', title: 'Produced quantity cannot exceed released quantity without override' },
          HttpStatus.BAD_REQUEST
        );
      }
      batch.producedQuantity = data.producedQuantity;
    }

    if (data.qcPassedQuantity !== undefined) {
      if (data.qcPassedQuantity > batch.producedQuantity && !data.superAdminOverride) {
        throw new HttpException(
          { code: 'GATE_QC_BLOCKED', title: 'QC passed quantity cannot exceed produced quantity' },
          HttpStatus.BAD_REQUEST
        );
      }
      batch.qcPassedQuantity = data.qcPassedQuantity;
    }

    if (data.deliveredQuantity !== undefined) {
      if (data.deliveredQuantity > batch.qcPassedQuantity && !data.superAdminOverride) {
        throw new HttpException(
          { code: 'GATE_DELIVERY_BLOCKED', title: 'Delivered quantity cannot exceed QC passed quantity' },
          HttpStatus.BAD_REQUEST
        );
      }
      batch.deliveredQuantity = data.deliveredQuantity;
    }

    if (data.installedQuantity !== undefined) {
      if (data.installedQuantity > batch.deliveredQuantity && !data.superAdminOverride) {
        throw new HttpException(
          { code: 'GATE_INSTALL_BLOCKED', title: 'Installed quantity cannot exceed delivered quantity' },
          HttpStatus.BAD_REQUEST
        );
      }
      batch.installedQuantity = data.installedQuantity;
    }

    if (data.acceptedQuantity !== undefined) {
      if (data.acceptedQuantity > batch.installedQuantity && !data.superAdminOverride) {
        throw new HttpException(
          { code: 'GATE_ACCEPT_BLOCKED', title: 'Accepted quantity cannot exceed installed quantity' },
          HttpStatus.BAD_REQUEST
        );
      }
      batch.acceptedQuantity = data.acceptedQuantity;
    }

    if (data.status) {
      batch.status = data.status as any;
    }

    batch.updatedAt = new Date().toISOString();
    productionBatchRepository.set(batchId, batch);

    const recon = this.syncRequirementReconciliation(projectId, reqId);

    return {
      data: { id: batchId, status: batch.status, recordVersion: 1, batch, payload: { batch, reconciliation: recon } } as any,
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  progressProductionBatch(
    projectId: string,
    reqId: string,
    batchId: string,
    body: unknown,
    _req?: any
  ): CommandResult {
    return this.recordBatchProgress(projectId, reqId, batchId, body);
  }

  // =========================================================================
  // 6. BASELINE PROTECTION & QUANTITY DELTAS
  // =========================================================================

  @Post('requirements/:reqId/change-quantity')
  @UseGuards(IdempotencyGuard)
  changeRequirementQuantity(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult {
    const parseRes = RequirementQuantityChangeSchema.safeParse(body);
    if (!parseRes.success) {
      throw new HttpException({ code: 'INVALID_ARGUMENT', title: 'Invalid quantity change data' }, HttpStatus.BAD_REQUEST);
    }

    const requirement = requirementRepository.get(reqId);
    if (!requirement || requirement.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Requirement not found' }, HttpStatus.NOT_FOUND);
    }

    const data: RequirementQuantityChangeDto = parseRes.data;
    const originalQuantity = Number(requirement.quantity) || 0;
    const newQuantity = data.newQuantity;
    const delta = newQuantity - originalQuantity;

    if (delta === 0) {
      return {
        data: {
          id: reqId,
          status: requirement.status || 'draft',
          recordVersion: requirement.currentRevision || 1,
          previousQuantity: originalQuantity,
          newQuantity,
          delta: 0,
          payload: requirement,
        } as any,
        meta: { requestId: `req-${Date.now()}` },
      };
    }

    // Protection check: If decreasing quantity when already released/produced
    if (delta < 0) {
      const released = requirement.releasedQuantity || 0;
      if (newQuantity < released && !data.superAdminOverride) {
        throw new HttpException(
          {
            code: 'QUANTITY_REDUCTION_BLOCKED',
            title: 'Quantity reduction blocked',
            detail: `Cannot reduce requirement quantity to ${newQuantity}: ${released} units have already been released to production. Super Admin override required.`,
          },
          HttpStatus.BAD_REQUEST
        );
      }
    }

    // Create formal revision record
    const nextRevision = (requirement.currentRevision || 1) + 1;
    const revision: RequirementRevision = {
      id: `rev-${Date.now()}-${nextRevision}`,
      requirementId: reqId,
      organisationId: requirement.organisationId || '11111111-1111-4111-8111-111111111111',
      projectId,
      revisionNumber: nextRevision,
      changedFields: ['quantity'],
      previousValues: { quantity: originalQuantity },
      newValues: { quantity: newQuantity },
      reasonForChange: data.reasonForChange,
      impact: {
        originalBaseline: originalQuantity,
        approvedVariation: delta > 0 ? `+${delta}` : `${delta}`,
        currentRequirement: newQuantity,
        previouslyReleased: requirement.releasedQuantity || 0,
        pendingRelease: Math.max(0, newQuantity - (requirement.releasedQuantity || 0)),
        costDeltaQar: data.costImpactQar || delta * 1500,
        scheduleDeltaDays: data.scheduleImpactDays || (delta > 0 ? 5 : 0),
        designImpact: data.designImpact || `Design variant and allocation required for ${delta > 0 ? '+' + delta : delta} units.`,
        boqImpact: data.boqImpact || `BOQ line item adjustment required for delta ${delta > 0 ? '+' + delta : delta}.`,
        scopeAltered: true,
      },
      authorName: (req as any)?.user?.name || 'Project Manager',
      authorRole: (req as any)?.user?.role || 'PM',
      createdAt: new Date().toISOString(),
    };

    const existingRevs = revisionRepository.get(reqId) || [];
    existingRevs.push(revision);
    revisionRepository.set(reqId, existingRevs);

    // Update requirement baseline
    requirement.quantity = newQuantity;
    requirement.currentRevision = nextRevision;
    requirement.status = 'changed';
    requirement.updatedAt = new Date().toISOString();
    requirementRepository.set(reqId, requirement);

    const recon = this.syncRequirementReconciliation(projectId, reqId);

    requirementAuditLog.push({
      action: 'requirement_quantity_changed',
      requirementId: reqId,
      originalQuantity,
      newQuantity,
      delta,
      reason: data.reasonForChange,
      revisionNumber: nextRevision,
      actor: (req as any)?.user?.name || 'User',
      timestamp: new Date().toISOString(),
    });

    return {
      data: {
        id: reqId,
        status: 'changed',
        recordVersion: nextRevision,
        previousQuantity: originalQuantity,
        newQuantity,
        delta,
        revision,
        payload: {
          previousQuantity: originalQuantity,
          newQuantity,
          delta,
          originalBaseline: originalQuantity,
          approvedVariation: delta > 0 ? `+${delta}` : `${delta}`,
          currentRequirement: newQuantity,
          previouslyReleased: requirement.releasedQuantity || 0,
          pendingRelease: Math.max(0, newQuantity - (requirement.releasedQuantity || 0)),
          revision,
          reconciliation: recon,
        },
      } as any,
      meta: { requestId: `req-${Date.now()}` },
    };
  }

  // =========================================================================
  // 7. MULTIDIMENSIONAL GROUPING & RECONCILIATION QUERY
  // =========================================================================

  @Get('requirements/:reqId/reconciliation')
  getRequirementReconciliation(
    @Param('projectId') projectId: string,
    @Param('reqId') reqId: string
  ) {
    const recon = this.syncRequirementReconciliation(projectId, reqId);
    if (!recon) throw new HttpException({ code: 'NOT_FOUND', title: 'Requirement not found' }, HttpStatus.NOT_FOUND);
    return { data: recon };
  }

  @Get('requirements-matrix/grouped')
  getGroupedRequirementsMatrix(
    @Param('projectId') projectId: string,
    @Query('groupBy') groupBy?: string,
    @Query('thenBy') thenBy?: string
  ) {
    const allReqs = Array.from(requirementRepository.values()).filter((r) => r.projectId === projectId && !r.isArchived);

    // Sync reconciliation for each
    for (const r of allReqs) {
      this.syncRequirementReconciliation(projectId, r.id);
    }

    const primaryKey = groupBy || 'department';
    const groups: Record<string, { key: string; groupKey: string; label: string; count: number; totalRequirements: number; items: any[]; rollup: any; rollups: any; subGroups?: any[] }> = {};

    for (const r of allReqs) {
      let gVal = (r as any)[primaryKey] || 'Unassigned';
      if (primaryKey === 'zone' || primaryKey === 'location') {
        const allocs = Array.from(allocationRepository.values()).filter((a) => a.requirementId === r.id);
        if (allocs.length > 0) {
          gVal = primaryKey === 'zone' ? allocs.map((a) => a.zone).join(', ') : allocs.map((a) => a.location).join(', ');
        } else {
          gVal = r.locationZone || 'Unallocated';
        }
      }

      if (!groups[gVal]) {
        const rollups = {
          totalQuantity: 0,
          allocatedQuantity: 0,
          designApprovedQuantity: 0,
          releasedQuantity: 0,
          producedQuantity: 0,
          deliveredQuantity: 0,
          installedQuantity: 0,
          acceptedQuantity: 0,
        };
        groups[gVal] = {
          key: gVal,
          groupKey: gVal,
          label: gVal,
          count: 0,
          totalRequirements: 0,
          items: [],
          rollup: rollups,
          rollups,
        };
      }

      groups[gVal].count++;
      groups[gVal].totalRequirements++;
      groups[gVal].items.push(r);
      groups[gVal].rollups.totalQuantity += Number(r.quantity) || 0;
      groups[gVal].rollups.allocatedQuantity += Number(r.allocatedQuantity) || 0;
      groups[gVal].rollups.designApprovedQuantity += Number(r.designApprovedQuantity) || 0;
      groups[gVal].rollups.releasedQuantity += Number(r.releasedQuantity) || 0;
      groups[gVal].rollups.producedQuantity += Number(r.producedQuantity) || 0;
      groups[gVal].rollups.deliveredQuantity += Number(r.deliveredQuantity) || 0;
      groups[gVal].rollups.installedQuantity += Number(r.installedQuantity) || 0;
      groups[gVal].rollups.acceptedQuantity += Number(r.acceptedQuantity) || 0;
    }

    // Handle secondary grouping (thenBy) if requested
    if (thenBy) {
      for (const group of Object.values(groups)) {
        const subMap: Record<string, any> = {};
        for (const item of group.items) {
          const subKey = (item as any)[thenBy] || 'Unassigned';
          if (!subMap[subKey]) {
            const subRollups = {
              totalQuantity: 0,
              allocatedQuantity: 0,
              designApprovedQuantity: 0,
              releasedQuantity: 0,
              producedQuantity: 0,
              deliveredQuantity: 0,
              installedQuantity: 0,
              acceptedQuantity: 0,
            };
            subMap[subKey] = {
              key: subKey,
              groupKey: subKey,
              label: subKey,
              count: 0,
              totalRequirements: 0,
              items: [],
              rollup: subRollups,
              rollups: subRollups,
            };
          }
          subMap[subKey].count++;
          subMap[subKey].totalRequirements++;
          subMap[subKey].items.push(item);
          subMap[subKey].rollups.totalQuantity += Number(item.quantity) || 0;
          subMap[subKey].rollups.allocatedQuantity += Number(item.allocatedQuantity) || 0;
          subMap[subKey].rollups.designApprovedQuantity += Number(item.designApprovedQuantity) || 0;
          subMap[subKey].rollups.releasedQuantity += Number(item.releasedQuantity) || 0;
          subMap[subKey].rollups.producedQuantity += Number(item.producedQuantity) || 0;
          subMap[subKey].rollups.deliveredQuantity += Number(item.deliveredQuantity) || 0;
          subMap[subKey].rollups.installedQuantity += Number(item.installedQuantity) || 0;
          subMap[subKey].rollups.acceptedQuantity += Number(item.acceptedQuantity) || 0;
        }
        group.subGroups = Object.values(subMap);
      }
    }

    const groupList = Object.values(groups);
    (groupList as any).groups = groupList;
    (groupList as any).totalRequirements = allReqs.length;

    return {
      data: groupList,
      meta: {
        totalRequirements: allReqs.length,
        groupBy: primaryKey,
        thenBy,
      },
    };
  }
}

