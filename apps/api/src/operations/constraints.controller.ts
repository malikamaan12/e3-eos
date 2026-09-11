import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  HttpException,
  HttpStatus,
  UseGuards,
  UseFilters,
  Optional,
} from '@nestjs/common';
import { Request } from 'express';
import { createHash, randomUUID } from 'crypto';
import {
  OperationalConstraintItem,
  createConstraint,
  attachSourceToConstraint,
  submitConstraintForReview,
  verifyConstraint,
  supersedeConstraint,
  AUTHORIZED_VERIFIER_ROLES,
  DECC_VENUE_CONSTRAINTS,
  isConstraintVerifiedWithEvidence,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { IdempotencyGuard } from '../common/idempotency.guard.js';
import { DbService } from '../common/db.service.js';
import { documentRepository, documentRevisionRepository } from '../documents/documents.controller.js';

export const projectConstraintRepository = new Map<string, OperationalConstraintItem[]>();

export function getProjectConstraints(projectId: string): OperationalConstraintItem[] {
  if (!projectConstraintRepository.has(projectId)) {
    const initial = DECC_VENUE_CONSTRAINTS.map((c) => ({ ...c }));
    projectConstraintRepository.set(projectId, initial);
  }
  return projectConstraintRepository.get(projectId)!;
}

@Controller('projects/:projectId/constraints')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class ConstraintsController {
  private dbService?: DbService;

  constructor(@Optional() dbService?: DbService) {
    this.dbService = dbService;
  }

  @Get()
  listConstraints(@Param('projectId') projectId: string) {
    const list = getProjectConstraints(projectId);
    return {
      data: list,
      meta: {
        total: list.length,
        verifiedCount: list.filter((c) => isConstraintVerifiedWithEvidence(c)).length,
        unverifiedCount: list.filter((c) => !isConstraintVerifiedWithEvidence(c)).length,
      },
    };
  }

  @Post()
  @UseGuards(IdempotencyGuard)
  createConstraint(
    @Param('projectId') projectId: string,
    @Body() body: any
  ) {
    if (body.verificationStatus === 'Verified') {
      throw new HttpException(
        {
          code: 'VERIFICATION_STATUS_NON_EDITABLE',
          title: 'Direct Verified status assignment is prohibited.',
          detail: 'Constraints may only achieve Verified status through the formal Verify Constraint workflow by an authorized reviewer.',
        },
        HttpStatus.BAD_REQUEST
      );
    }
    if (body.sourceDocumentHash || body.verifiedBy || body.verifiedAt) {
      throw new HttpException(
        {
          code: 'SYSTEM_MANAGED_FIELDS_IMMUTABLE',
          title: 'Manual provenance fields are prohibited.',
          detail: 'sourceDocumentHash, verifiedBy, and verifiedAt are system-managed and cannot be manually supplied.',
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const list = getProjectConstraints(projectId);
    const newId = `cst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const item = createConstraint({
      id: newId,
      constraintType: body.constraintType || 'venue_operational_noise',
      sourceType: body.sourceType || 'venue',
      sourceOrganization: body.sourceOrganization || 'Venue Operations',
      sourceDocument: body.sourceDocument || 'Pending controlled document attachment',
      sourceRevisionDate: body.sourceRevisionDate || 'Uncontrolled Draft',
      locationZone: body.locationZone || 'Venue Wide',
      effectivePeriod: body.effectivePeriod || 'Operational Horizon',
      timeWindow: body.timeWindow || '24 Hours',
      limitValue: body.limitValue ?? 0,
      unit: body.unit || 'units',
      applicability: body.applicability ?? true,
      priority: body.priority || 'medium',
      overrideAuthority: body.overrideAuthority || 'Technical Director',
      notes: body.notes,
      initialStatus: 'Draft',
    });

    list.push(item);
    return {
      data: item,
      message: `Operational constraint ${item.id} created in Draft status.`,
    };
  }

  @Post(':constraintId/attach-source')
  @UseGuards(IdempotencyGuard)
  attachSource(
    @Param('projectId') projectId: string,
    @Param('constraintId') constraintId: string,
    @Body() body: {
      controlledDocumentId: string;
      documentRevisionId: string;
      pageClauseSection?: string;
    }
  ) {
    const list = getProjectConstraints(projectId);
    const index = list.findIndex((c) => c.id === constraintId);
    if (index === -1) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Constraint not found' }, HttpStatus.NOT_FOUND);
    }

    const doc = documentRepository.get(body.controlledDocumentId);
    if (!doc) {
      throw new HttpException(
        { code: 'NOT_FOUND', title: 'Controlled document not found in EOS document store' },
        HttpStatus.NOT_FOUND
      );
    }

    const rev = documentRevisionRepository.get(body.documentRevisionId);
    if (!rev || rev.documentId !== doc.id) {
      throw new HttpException(
        { code: 'NOT_FOUND', title: 'Controlled document revision not found in EOS document store' },
        HttpStatus.NOT_FOUND
      );
    }

    const calculatedHash = rev.calculatedSha256 || rev.contentHash;
    if (!calculatedHash) {
      throw new HttpException(
        { code: 'HASH_NOT_CALCULATED', title: 'Document revision lacks system-calculated SHA-256 hash' },
        HttpStatus.BAD_REQUEST
      );
    }

    const updated = attachSourceToConstraint(list[index], {
      controlledDocumentId: doc.id,
      documentRevisionId: rev.id,
      calculatedSha256: calculatedHash,
      documentNumber: doc.documentNumber,
      title: doc.title,
      revisionCode: rev.revisionCode,
      pageClauseSection: body.pageClauseSection,
    });

    list[index] = updated;

    return {
      data: updated,
      message: `Controlled document ${doc.documentNumber} (${rev.revisionCode}) attached to constraint ${constraintId}.`,
    };
  }

  @Post(':constraintId/submit-review')
  @UseGuards(IdempotencyGuard)
  submitForReview(
    @Param('projectId') projectId: string,
    @Param('constraintId') constraintId: string
  ) {
    const list = getProjectConstraints(projectId);
    const index = list.findIndex((c) => c.id === constraintId);
    if (index === -1) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Constraint not found' }, HttpStatus.NOT_FOUND);
    }

    try {
      const updated = submitConstraintForReview(list[index]);
      list[index] = updated;
      return {
        data: updated,
        message: `Constraint ${constraintId} transitioned to 'Under Review'.`,
      };
    } catch (err: any) {
      throw new HttpException(
        { code: 'INVALID_TRANSITION', title: err.message },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post(':constraintId/verify')
  @UseGuards(IdempotencyGuard)
  async verifyConstraintAction(
    @Param('projectId') projectId: string,
    @Param('constraintId') constraintId: string,
    @Body() body: {
      pageClauseSection: string;
      extractedRuleValue: string;
      applicabilityStatement: string;
      reviewerComment: string;
    },
    @Req() req: Request
  ) {
    const list = getProjectConstraints(projectId);
    const index = list.findIndex((c) => c.id === constraintId);
    if (index === -1) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Constraint not found' }, HttpStatus.NOT_FOUND);
    }

    const reviewerIdentity =
      (req as any).userName ||
      (req.headers['x-user-name'] as string) ||
      'Senior Technical Director (E3 Compliance)';

    const reviewerRole =
      (req as any).userRole ||
      (req.headers['x-user-role'] as string) ||
      'technical_director';

    if (!AUTHORIZED_VERIFIER_ROLES.includes(reviewerRole)) {
      throw new HttpException(
        {
          code: 'UNAUTHORIZED_VERIFIER',
          title: `Role '${reviewerRole}' is not authorized to verify operational constraints.`,
          detail: `Authorized verifier roles: ${AUTHORIZED_VERIFIER_ROLES.join(', ')}`,
        },
        HttpStatus.FORBIDDEN
      );
    }

    const auditEventId = `audit-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const verifiedAt = new Date().toISOString();

    let updated: OperationalConstraintItem;
    try {
      updated = verifyConstraint(list[index], {
        reviewerIdentity,
        reviewerRole,
        pageClauseSection: body.pageClauseSection,
        extractedRuleValue: body.extractedRuleValue,
        applicabilityStatement: body.applicabilityStatement,
        reviewerComment: body.reviewerComment || 'Authoritative compliance verification approved.',
        auditEventId,
        verifiedAt,
      });
    } catch (err: any) {
      throw new HttpException(
        { code: 'VERIFICATION_FAILED', title: err.message },
        HttpStatus.BAD_REQUEST
      );
    }

    list[index] = updated;

    const auditPayload = {
      constraintId,
      constraintType: updated.constraintType,
      limitValue: updated.limitValue,
      controlledDocumentId: updated.controlledDocumentId,
      documentRevisionId: updated.documentRevisionId,
      sourceDocumentHash: updated.sourceDocumentHash,
      pageClauseSection: body.pageClauseSection,
      extractedRuleValue: body.extractedRuleValue,
      applicabilityStatement: body.applicabilityStatement,
      reviewerComment: body.reviewerComment,
      verifiedBy: reviewerIdentity,
      reviewerRole,
      timestamp: verifiedAt,
    };

    const entryHash = createHash('sha256').update(JSON.stringify(auditPayload)).digest('hex');

    if (this.dbService) {
      try {
        const pool = this.dbService.getPool();
        await pool.query(
          `INSERT INTO audit_events (id, action, actor_id, actor_role, entry_hash, payload, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (id) DO NOTHING;`,
          [
            auditEventId,
            'CONSTRAINT_VERIFIED',
            (req as any).userId || 'usr-technical-director',
            reviewerRole,
            entryHash,
            JSON.stringify(auditPayload),
          ]
        );
      } catch (e: any) {
        console.warn('[ConstraintsController] Audit DB notice:', e.message);
      }
    }

    return {
      data: updated,
      audit: {
        auditEventId,
        action: 'CONSTRAINT_VERIFIED',
        entryHash,
        timestamp: verifiedAt,
      },
      message: `Constraint ${constraintId} verified authoritative. Scheduling engine will now enforce it.`,
    };
  }

  @Post(':constraintId/supersede')
  @UseGuards(IdempotencyGuard)
  supersede(
    @Param('projectId') projectId: string,
    @Param('constraintId') constraintId: string,
    @Body() body: { reason?: string }
  ) {
    const list = getProjectConstraints(projectId);
    const index = list.findIndex((c) => c.id === constraintId);
    if (index === -1) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Constraint not found' }, HttpStatus.NOT_FOUND);
    }

    const updated = supersedeConstraint(list[index], body.reason);
    list[index] = updated;

    return {
      data: updated,
      message: `Constraint ${constraintId} marked as Superseded.`,
    };
  }
}
