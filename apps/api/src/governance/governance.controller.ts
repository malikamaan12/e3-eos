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
import { createHash } from 'crypto';
import {
  PolicyPublishSchema,
  ApprovalDecisionSchema,
  ExceptionRequestSchema,
  ExceptionAuthoriseSchema,
  ExceptionReviewSchema,
  CommandResult,
} from '@e3-eos/contracts';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { IdempotencyGuard } from '../common/idempotency.guard.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { projectRepository } from '../projects/projects.controller.js';

export interface StoredPolicySnapshot {
  id: string;
  projectId: string;
  organisationId: string;
  version: number;
  draftVersionId: string;
  impactReportId: string;
  authorityDecisionIds: string[];
  snapshotHash: string;
  publishedAt: Date;
  status: 'active' | 'superseded';
}

export interface StoredApprovalRequest {
  id: string;
  projectId: string;
  organisationId: string;
  targetType: 'policy' | 'purchase_order' | 'proposal' | 'design' | 'opening' | 'exception';
  targetId: string;
  targetVersionId: string;
  targetHash: string;
  requiredRole: string;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  outcome?: 'approved' | 'rejected' | 'changes_requested';
  decidedBy?: string;
  decidedAt?: Date;
  comment?: string;
  acknowledgedConditions?: string[];
}

export interface StoredExceptionRecord {
  id: string;
  projectId: string;
  organisationId: string;
  scope: {
    projectId: string;
    targetRecordId: string;
    targetVersionId: string;
    ruleIds: string[];
    allowedActions: string[];
    conditions?: string[];
  };
  reason: string;
  authorityBasisId: string;
  validFrom: string;
  validUntil: string;
  maxUses: number;
  remainingUses: number;
  status: 'requested' | 'authorised' | 'active' | 'consumed' | 'in_review' | 'remediation_required' | 'closed';
  reviewPolicy: {
    mode: 'required' | 'not_required_with_basis';
    ownerId: string;
    reviewDueAt: string;
    templateId?: string;
    basis?: string;
  };
  evidenceVersionIds: string[];
  createdAt: Date;
  authorisedAt?: Date;
  authorisedBy?: string;
  closedAt?: Date;
  closureDisposition?: string;
  remainingActionIds?: string[];
}

export const policySnapshotRepository = new Map<string, StoredPolicySnapshot>();
export const approvalRequestRepository = new Map<string, StoredApprovalRequest>();
export const exceptionRepository = new Map<string, StoredExceptionRecord>();

// Seed initial realistic governance records for Qatar National Day 2026
function seedInitialGovernance(): void {
  const defaultProjectId = '00000000-0000-4000-8000-000000000001';
  const defaultOrgId = '11111111-1111-4111-8111-111111111111';

  // Seed sample Approval Request
  const sampleApprovalId = 'appr-req-001';
  if (!approvalRequestRepository.has(sampleApprovalId)) {
    approvalRequestRepository.set(sampleApprovalId, {
      id: sampleApprovalId,
      projectId: defaultProjectId,
      organisationId: defaultOrgId,
      targetType: 'proposal',
      targetId: 'prop-2026-v2',
      targetVersionId: '00000000-0000-4000-8000-000000000002',
      targetHash: createHash('sha256').update('prop-2026-v2-target-content').digest('hex'),
      requiredRole: 'Commercial Director',
      status: 'pending',
    });
  }

  // Seed sample Exception Record (e.g. Sourcing exception under Invariant AT-012)
  const sampleExceptionId = 'exc-req-001';
  if (!exceptionRepository.has(sampleExceptionId)) {
    exceptionRepository.set(sampleExceptionId, {
      id: sampleExceptionId,
      projectId: defaultProjectId,
      organisationId: defaultOrgId,
      scope: {
        projectId: defaultProjectId,
        targetRecordId: '00000000-0000-4000-8000-000000000010',
        targetVersionId: '00000000-0000-4000-8000-000000000020',
        ruleIds: ['vendor.comparison.required'],
        allowedActions: ['purchase_order.release'],
      },
      reason: 'Urgent specialized kinetic truss motor sourcing for Main Stage Qatar National Day',
      authorityBasisId: '00000000-0000-4000-8000-000000000099',
      validFrom: new Date(Date.now() - 3600000).toISOString(),
      validUntil: new Date(Date.now() + 86400000 * 3).toISOString(),
      maxUses: 1,
      remainingUses: 1,
      status: 'authorised',
      reviewPolicy: {
        mode: 'required',
        ownerId: '00000000-0000-4000-8000-000000000005',
        reviewDueAt: new Date(Date.now() + 86400000 * 7).toISOString(),
      },
      evidenceVersionIds: ['00000000-0000-4000-8000-000000000088'],
      createdAt: new Date(Date.now() - 3600000),
      authorisedAt: new Date(),
      authorisedBy: 'Governance & Commercial Authority',
    });
  }
}

seedInitialGovernance();

@Controller('projects/:projectId')
@UseFilters(ProblemDetailsFilter)
export class GovernanceController {
  // --- Policy Publishing ---

  @Post('policy-drafts/:id/publish')
  @UseGuards(TenantIsolationGuard, IdempotencyGuard)
  publishProjectPolicy(
    @Param('projectId') projectId: string,
    @Param('id') draftId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredPolicySnapshot> {
    const parseResult = PolicyPublishSchema.safeParse(body);
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

    // Existing active snapshots for this project
    const active = Array.from(policySnapshotRepository.values()).filter(
      (p) => p.projectId === projectId && p.status === 'active'
    );

    // Optimistic concurrency check if expectedActiveSnapshotId was supplied
    if (parseResult.data.expectedActiveSnapshotId) {
      const match = active.find((s) => s.id === parseResult.data.expectedActiveSnapshotId);
      if (!match) {
        throw new HttpException(
          { message: 'CONCURRENCY_CONFLICT', detail: 'expectedActiveSnapshotId mismatch' },
          HttpStatus.CONFLICT
        );
      }
    }

    // Mark previous snapshots as superseded
    active.forEach((s) => {
      s.status = 'superseded';
    });

    const version = active.length + 1;
    const snapshotId = `pol-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const snapshotHash = createHash('sha256')
      .update(`${projectId}:${draftId}:${version}:${Date.now()}`)
      .digest('hex');

    const snapshot: StoredPolicySnapshot = {
      id: snapshotId,
      projectId,
      organisationId: orgId,
      version,
      draftVersionId: parseResult.data.draftVersionId,
      impactReportId: parseResult.data.impactReportId,
      authorityDecisionIds: parseResult.data.authorityDecisionIds,
      snapshotHash,
      publishedAt: new Date(),
      status: 'active',
    };

    policySnapshotRepository.set(snapshotId, snapshot);

    return {
      data: {
        id: snapshotId,
        status: 'published',
        recordVersion: version,
        payload: snapshot,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-pol-pub',
      },
    };
  }

  // --- Approval Decisions ---

  @Post('approval-requests/:id/decisions')
  @UseGuards(TenantIsolationGuard, IdempotencyGuard)
  decideApproval(
    @Param('projectId') projectId: string,
    @Param('id') requestId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredApprovalRequest> {
    const parseResult = ApprovalDecisionSchema.safeParse(body);
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

    let approvalReq = approvalRequestRepository.get(requestId);
    if (!approvalReq || approvalReq.projectId !== projectId || approvalReq.organisationId !== orgId) {
      // Create ad-hoc pending approval request if not pre-seeded
      approvalReq = {
        id: requestId,
        projectId,
        organisationId: orgId,
        targetType: 'proposal',
        targetId: parseResult.data.targetVersionId,
        targetVersionId: parseResult.data.targetVersionId,
        targetHash: parseResult.data.targetHash,
        requiredRole: 'Commercial Director',
        status: 'pending',
      };
    }

    // Invariant AT-008: Verify target hash matches targetVersionId
    if (approvalReq.targetHash && approvalReq.targetHash !== parseResult.data.targetHash) {
      throw new HttpException(
        { message: 'TARGET_HASH_MISMATCH', detail: 'The item has been modified since approval request creation' },
        HttpStatus.PRECONDITION_FAILED
      );
    }

    approvalReq.outcome = parseResult.data.outcome;
    approvalReq.status = parseResult.data.outcome;
    approvalReq.decidedBy = (req as any).userId || 'usr-authority-01';
    approvalReq.decidedAt = new Date();
    approvalReq.comment = parseResult.data.comment;
    approvalReq.acknowledgedConditions = parseResult.data.acknowledgedConditions;

    approvalRequestRepository.set(requestId, approvalReq);

    return {
      data: {
        id: approvalReq.id,
        status: approvalReq.status,
        recordVersion: 2,
        payload: approvalReq,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-appr-decide',
      },
    };
  }

  @Get('approval-requests')
  @UseGuards(TenantIsolationGuard)
  listApprovalRequests(@Param('projectId') projectId: string, @Req() req: Request) {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const list = Array.from(approvalRequestRepository.values()).filter(
      (a) => a.projectId === projectId && a.organisationId === orgId
    );
    return { data: list, meta: { total: list.length } };
  }

  // --- Exceptions Lifecycle (Request, Authorise, Review) ---

  @Post('exceptions')
  @UseGuards(TenantIsolationGuard, IdempotencyGuard)
  requestException(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredExceptionRecord> {
    const parseResult = ExceptionRequestSchema.safeParse(body);
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

    const excId = `exc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const record: StoredExceptionRecord = {
      id: excId,
      projectId,
      organisationId: orgId,
      scope: parseResult.data.scope,
      reason: parseResult.data.reason,
      authorityBasisId: parseResult.data.authorityBasisId,
      validFrom: parseResult.data.validFrom,
      validUntil: parseResult.data.validUntil,
      maxUses: parseResult.data.maxUses,
      remainingUses: parseResult.data.maxUses,
      status: 'requested',
      reviewPolicy: parseResult.data.reviewPolicy,
      evidenceVersionIds: parseResult.data.evidenceVersionIds,
      createdAt: new Date(),
    };

    exceptionRepository.set(excId, record);

    return {
      data: {
        id: excId,
        status: record.status,
        recordVersion: 1,
        payload: record,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-exc-req',
      },
    };
  }

  @Post('exceptions/:id/authorise')
  @UseGuards(TenantIsolationGuard, IdempotencyGuard)
  authoriseException(
    @Param('projectId') projectId: string,
    @Param('id') exceptionId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredExceptionRecord> {
    const parseResult = ExceptionAuthoriseSchema.safeParse(body);
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

    const record = exceptionRepository.get(exceptionId);
    if (!record || record.projectId !== projectId || record.organisationId !== orgId) {
      throw new HttpException({ message: 'EXCEPTION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    record.status = 'authorised';
    record.authorisedAt = new Date();
    record.authorisedBy = (req as any).userId || 'usr-commercial-governance';
    record.scope.ruleIds = [parseResult.data.approvedScope.targetRuleId];
    record.validFrom = parseResult.data.approvedScope.validFrom;
    record.validUntil = parseResult.data.approvedScope.validUntil;
    record.maxUses = parseResult.data.approvedScope.maxUses;
    record.remainingUses = parseResult.data.approvedScope.maxUses;

    exceptionRepository.set(exceptionId, record);

    return {
      data: {
        id: record.id,
        status: record.status,
        recordVersion: 2,
        payload: record,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-exc-auth',
      },
    };
  }

  @Post('exceptions/:id/reviews')
  @UseGuards(TenantIsolationGuard, IdempotencyGuard)
  reviewException(
    @Param('projectId') projectId: string,
    @Param('id') exceptionId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredExceptionRecord> {
    const parseResult = ExceptionReviewSchema.safeParse(body);
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

    const record = exceptionRepository.get(exceptionId);
    if (!record || record.projectId !== projectId || record.organisationId !== orgId) {
      throw new HttpException({ message: 'EXCEPTION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // Invariant AT-014: Follow-up review closes or dispositions the exception deviation
    record.status = parseResult.data.outcome;
    record.closureDisposition = parseResult.data.disposition;
    record.closedAt = new Date();
    record.evidenceVersionIds = [
      ...record.evidenceVersionIds,
      ...parseResult.data.evidenceVersionIds,
    ];
    record.remainingActionIds = parseResult.data.remainingActionIds;

    exceptionRepository.set(exceptionId, record);

    return {
      data: {
        id: record.id,
        status: record.status,
        recordVersion: 3,
        payload: record,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-exc-rev',
      },
    };
  }

  @Get('exceptions')
  @UseGuards(TenantIsolationGuard)
  listExceptions(@Param('projectId') projectId: string, @Req() req: Request) {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const list = Array.from(exceptionRepository.values()).filter(
      (e) => e.projectId === projectId && e.organisationId === orgId
    );
    return { data: list, meta: { total: list.length } };
  }
}
