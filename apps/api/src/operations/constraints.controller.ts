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
  VerificationStatus,
  CONSTRAINTS_VERIFY_PERMISSION,
  hasConstraintVerifyPermission,
  AUTHORIZED_VERIFIER_ROLES,
  isConstraintVerifiedWithEvidence,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { IdempotencyGuard } from '../common/idempotency.guard.js';
import { ConstraintsAuthGuard } from '../common/constraints-auth.guard.js';
import { DbService } from '../common/db.service.js';

@Controller('projects/:projectId/constraints')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class ConstraintsController {
  private dbService: DbService;

  constructor(@Optional() dbService?: DbService) {
    this.dbService = dbService || new DbService();
  }

  @Get()
  async listConstraints(
    @Param('projectId') projectId: string,
    @Req() req: Request = {} as Request
  ) {
    const orgId = (req as any)?.organisationId || '11111111-1111-4111-8111-111111111111';
    const pool = this.dbService.getPool();

    try {
      const client = await pool.connect();
      try {
        await client.query("SELECT set_config('app.current_org_id', $1, true)", [orgId]);
        const res = await client.query(`
          SELECT c.*, 
                 l.controlled_document_id, l.document_revision_id, l.calculated_sha256 as link_sha256, l.page_clause_section,
                 v.verifier_user_id, v.verifier_role, v.extracted_rule_value, v.applicability_statement,
                 v.reviewer_comment, v.verified_at as record_verified_at, v.audit_event_id, v.source_hash,
                 u.name as verifier_name,
                 d.document_number, d.title as doc_title,
                 r.revision as rev_code
          FROM operational_constraints c
          LEFT JOIN constraint_source_links l ON l.constraint_id = c.id
          LEFT JOIN constraint_verifications v ON v.constraint_id = c.id
          LEFT JOIN users u ON u.id = v.verifier_user_id
          LEFT JOIN controlled_documents d ON d.id = l.controlled_document_id
          LEFT JOIN controlled_document_revisions r ON r.id = l.document_revision_id
          WHERE c.project_id = $1
          ORDER BY c.created_at ASC;
        `, [projectId]);

        const data: OperationalConstraintItem[] = res.rows.map((row) => ({
          id: row.id,
          constraintType: row.constraint_type,
          sourceType: row.source_type,
          sourceOrganization: row.source_organisation,
          sourceDocument: row.controlled_document_id || 'Pending controlled document attachment',
          sourceRevisionDate: row.effective_from ? row.effective_from.toISOString() : 'Operational Horizon',
          locationZone: row.location_zone,
          effectivePeriod: 'Operational Horizon',
          timeWindow: row.time_window,
          limitValue: Number(row.limit_value),
          unit: row.unit,
          applicability: row.applicability,
          priority: row.priority,
          overrideAuthority: row.override_authority,
          verificationStatus: row.verification_status as VerificationStatus,
          controlledDocumentId: row.controlled_document_id,
          documentRevisionId: row.document_revision_id,
          calculatedSha256: row.link_sha256,
          sourceDocumentHash: row.source_hash || row.link_sha256,
          verifiedBy: row.verifier_name || (row.verifier_role ? `Authorized (${row.verifier_role})` : undefined),
          verifiedAt: row.record_verified_at ? row.record_verified_at.toISOString() : undefined,
          evidenceSummary: row.page_clause_section,
          verificationRecord: row.record_verified_at ? {
            verifiedAt: row.record_verified_at.toISOString(),
            reviewerIdentity: row.verifier_name || row.verifier_role || 'Authorized Reviewer',
            reviewerRole: row.verifier_role || 'technical_director',
            controlledDocumentId: row.controlled_document_id || '',
            documentRevisionId: row.document_revision_id || '',
            calculatedSha256: row.source_hash || row.link_sha256 || '',
            systemCalculatedSha256: row.source_hash || row.link_sha256 || '',
            sourceDocumentNumber: row.document_number || 'DOC-CONTROLLED',
            sourceDocumentTitle: row.doc_title || 'Controlled Source Artifact',
            revisionCode: row.rev_code || 'Rev 01',
            pageClauseSection: row.page_clause_section || 'Section Cited',
            extractedRuleValue: row.extracted_rule_value || '',
            applicabilityStatement: row.applicability_statement || '',
            reviewerComment: row.reviewer_comment || '',
            auditEventId: row.audit_event_id,
          } : undefined,
        }));

        return {
          data,
          meta: {
            total: data.length,
            verifiedCount: data.filter((c) => isConstraintVerifiedWithEvidence(c)).length,
            unverifiedCount: data.filter((c) => !isConstraintVerifiedWithEvidence(c)).length,
          },
        };
      } finally {
        client.release();
      }
    } catch (err: any) {
      throw new HttpException(
        { code: 'DB_QUERY_FAILED', title: 'Failed to retrieve operational constraints', detail: err.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post()
  @UseGuards(ConstraintsAuthGuard, IdempotencyGuard)
  async createConstraint(
    @Param('projectId') projectId: string,
    @Body() body: any,
    @Req() req: Request = {} as Request
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

    const sessionUser = (req as any).sessionUser;
    const orgId = sessionUser?.organisationId || (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const newId = `cst-${Date.now()}-${randomUUID().slice(0, 4)}`;

    const pool = this.dbService.getPool();
    const client = await pool.connect();
    try {
      await client.query("SELECT set_config('app.current_org_id', $1, true)", [orgId]);
      await client.query(`
        INSERT INTO operational_constraints (
          id, organisation_id, project_id, constraint_type, source_type, source_organisation,
          location_zone, time_window, limit_value, unit, applicability, priority,
          override_authority, verification_status, created_by, created_at, updated_at, version
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'Draft', $14, NOW(), NOW(), 1
        );
      `, [
        newId,
        orgId,
        projectId,
        body.constraintType || 'venue_operational_noise',
        body.sourceType || 'venue',
        body.sourceOrganization || 'Venue Operations',
        body.locationZone || 'Venue Wide',
        body.timeWindow || '24 Hours',
        body.limitValue ?? 0,
        body.unit || 'units',
        body.applicability ?? true,
        body.priority || 'medium',
        body.overrideAuthority || 'Technical Director',
        sessionUser?.userId || null,
      ]);

      return {
        data: {
          id: newId,
          constraintType: body.constraintType || 'venue_operational_noise',
          sourceType: body.sourceType || 'venue',
          sourceOrganization: body.sourceOrganization || 'Venue Operations',
          sourceDocument: 'Pending controlled document attachment',
          sourceRevisionDate: 'Uncontrolled Draft',
          locationZone: body.locationZone || 'Venue Wide',
          effectivePeriod: 'Operational Horizon',
          timeWindow: body.timeWindow || '24 Hours',
          limitValue: body.limitValue ?? 0,
          unit: body.unit || 'units',
          applicability: body.applicability ?? true,
          priority: body.priority || 'medium',
          overrideAuthority: body.overrideAuthority || 'Technical Director',
          notes: body.notes,
          initialStatus: 'Draft',
          verificationStatus: 'Draft',
        },
        message: `Operational constraint ${newId} created in Draft status.`,
      };
    } finally {
      client.release();
    }
  }

  @Post(':constraintId/attach-source')
  @UseGuards(ConstraintsAuthGuard, IdempotencyGuard)
  async attachSource(
    @Param('projectId') projectId: string,
    @Param('constraintId') constraintId: string,
    @Body() body: {
      controlledDocumentId: string;
      documentRevisionId: string;
      pageClauseSection?: string;
    },
    @Req() req: Request = {} as Request
  ) {
    const sessionUser = (req as any)?.sessionUser;
    const orgId = sessionUser?.organisationId || (req as any)?.organisationId || '11111111-1111-4111-8111-111111111111';
    const pool = this.dbService.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.current_org_id', $1, true)", [orgId]);

      // 1. Lock constraint
      const cRes = await client.query(`
        SELECT * FROM operational_constraints WHERE id = $1 AND project_id = $2 FOR UPDATE
      `, [constraintId, projectId]);

      if (cRes.rows.length === 0) {
        throw new HttpException({ code: 'NOT_FOUND', title: 'Constraint not found' }, HttpStatus.NOT_FOUND);
      }
      const cRow = cRes.rows[0];

      // 2. Validate controlled document and revision exist in PostgreSQL
      const revRes = await client.query(`
        SELECT r.*, d.document_number, d.title as doc_title
        FROM controlled_document_revisions r
        JOIN controlled_documents d ON d.id = r.document_id
        WHERE r.id = $1 AND r.document_id = $2
      `, [body.documentRevisionId, body.controlledDocumentId]);

      if (revRes.rows.length === 0) {
        throw new HttpException(
          { code: 'NOT_FOUND', title: 'Controlled document revision not found in persistent store' },
          HttpStatus.NOT_FOUND
        );
      }
      const revRow = revRes.rows[0];

      if (!revRow.calculated_sha256) {
        throw new HttpException(
          { code: 'HASH_NOT_CALCULATED', title: 'Document revision lacks system-calculated SHA-256 hash' },
          HttpStatus.BAD_REQUEST
        );
      }

      // 3. Upsert into constraint_source_links
      await client.query(`
        INSERT INTO constraint_source_links (
          id, organisation_id, constraint_id, controlled_document_id, document_revision_id,
          calculated_sha256, page_clause_section, linked_at, linked_by
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), $7
        )
      `, [
        orgId, constraintId, revRow.document_id, revRow.id,
        revRow.calculated_sha256, body.pageClauseSection || null, sessionUser?.userId || null
      ]);

      // 4. Update constraint status to 'Source Attached'
      const newVersion = (cRow.version || 1) + 1;
      await client.query(`
        UPDATE operational_constraints
        SET verification_status = 'Source Attached',
            version = $1,
            updated_at = NOW()
        WHERE id = $2
      `, [newVersion, constraintId]);

      await client.query('COMMIT');

      return {
        data: {
          id: constraintId,
          verificationStatus: 'Source Attached',
          controlledDocumentId: revRow.document_id,
          documentRevisionId: revRow.id,
          calculatedSha256: revRow.calculated_sha256,
          sourceDocumentHash: revRow.calculated_sha256,
          evidenceSummary: body.pageClauseSection,
          version: newVersion,
        },
        message: `Source document ${revRow.document_number} attached with system-calculated hash.`,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  @Post(':constraintId/submit-review')
  @UseGuards(ConstraintsAuthGuard, IdempotencyGuard)
  async submitForReview(
    @Param('projectId') projectId: string,
    @Param('constraintId') constraintId: string,
    @Req() req: Request = {} as Request
  ) {
    const sessionUser = (req as any)?.sessionUser;
    const orgId = sessionUser?.organisationId || (req as any)?.organisationId || '11111111-1111-4111-8111-111111111111';
    const pool = this.dbService.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.current_org_id', $1, true)", [orgId]);

      const cRes = await client.query(`
        SELECT * FROM operational_constraints WHERE id = $1 AND project_id = $2 FOR UPDATE
      `, [constraintId, projectId]);

      if (cRes.rows.length === 0) {
        throw new HttpException({ code: 'NOT_FOUND', title: 'Constraint not found' }, HttpStatus.NOT_FOUND);
      }
      const cRow = cRes.rows[0];

      // Check that source link exists
      const linkRes = await client.query(`
        SELECT 1 FROM constraint_source_links WHERE constraint_id = $1
      `, [constraintId]);

      if (linkRes.rows.length === 0) {
        throw new HttpException(
          { code: 'SOURCE_NOT_ATTACHED', title: 'Cannot submit for review without attached controlled source document.' },
          HttpStatus.BAD_REQUEST
        );
      }

      const newVersion = (cRow.version || 1) + 1;
      await client.query(`
        UPDATE operational_constraints
        SET verification_status = 'Under Review',
            version = $1,
            updated_at = NOW()
        WHERE id = $2
      `, [newVersion, constraintId]);

      await client.query('COMMIT');

      return {
        data: {
          id: constraintId,
          verificationStatus: 'Under Review',
          version: newVersion,
        },
        message: `Operational constraint ${constraintId} transitioned to Under Review.`,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  @Post(':constraintId/verify')
  @UseGuards(ConstraintsAuthGuard, IdempotencyGuard)
  async verifyConstraint(
    @Param('projectId') projectId: string,
    @Param('constraintId') constraintId: string,
    @Body() body: {
      pageClauseSection?: string;
      extractedRuleValue?: string;
      applicabilityStatement?: string;
      reviewerComment?: string;
    },
    @Req() req: Request = {} as Request
  ) {
    // 1. Strict Server-Side Session RBAC: No client headers (x-user-role, x-user-name) or defaults allowed
    const sessionUser = (req as any)?.sessionUser;
    if (!sessionUser || !sessionUser.userId) {
      throw new HttpException(
        {
          code: 'UNAUTHENTICATED',
          title: 'Authentication session required',
          detail: 'Verification requires an active authenticated server-side session. Client headers and defaults are strictly prohibited.',
        },
        HttpStatus.UNAUTHORIZED
      );
    }

    const reviewerIdentity = sessionUser.name || sessionUser.email;
    const reviewerRole = sessionUser.role;
    const reviewerUserId = sessionUser.userId;
    const orgId = sessionUser.organisationId || '11111111-1111-4111-8111-111111111111';

    // 2. Permission check: constraints.verify authority
    if (!hasConstraintVerifyPermission(reviewerRole, sessionUser.isSuperAdmin)) {
      throw new HttpException(
        {
          code: 'FORBIDDEN_AUTHORITY',
          title: `Role '${reviewerRole}' is not authorized to verify operational constraints.`,
          detail: `Verification requires '${CONSTRAINTS_VERIFY_PERMISSION}' authority. Authorized roles: ${AUTHORIZED_VERIFIER_ROLES.join(', ')}.`,
        },
        HttpStatus.FORBIDDEN
      );
    }

    // 3. Atomic PostgreSQL Transaction (Row Lock -> State Check -> Revision Verification -> Verification Record -> Constraint Update -> Audit Event)
    const pool = this.dbService.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.current_org_id', $1, true)", [orgId]);

      // Lock current constraint row for update (optimistic concurrency control)
      const cRes = await client.query(`
        SELECT * FROM operational_constraints WHERE id = $1 AND project_id = $2 FOR UPDATE
      `, [constraintId, projectId]);

      if (cRes.rows.length === 0) {
        throw new HttpException({ code: 'NOT_FOUND', title: 'Constraint not found' }, HttpStatus.NOT_FOUND);
      }
      const cRow = cRes.rows[0];

      // State check: Constraint MUST be in 'Under Review' status
      if (cRow.verification_status !== 'Under Review') {
        throw new HttpException(
          {
            code: 'INVALID_STATE_TRANSITION',
            title: `Cannot verify constraint in '${cRow.verification_status}' status. Constraint must be 'Under Review'.`,
          },
          HttpStatus.BAD_REQUEST
        );
      }

      // Check attached source link
      const linkRes = await client.query(`
        SELECT * FROM constraint_source_links
        WHERE constraint_id = $1
        ORDER BY linked_at DESC LIMIT 1
      `, [constraintId]);

      if (linkRes.rows.length === 0) {
        throw new HttpException(
          { code: 'NO_SOURCE_ATTACHED', title: 'Cannot verify constraint without attached controlled source document.' },
          HttpStatus.BAD_REQUEST
        );
      }
      const linkRow = linkRes.rows[0];

      // Verify controlled document revision exists in DB
      const revRes = await client.query(`
        SELECT r.*, d.document_number, d.title as doc_title
        FROM controlled_document_revisions r
        JOIN controlled_documents d ON d.id = r.document_id
        WHERE r.id = $1 AND r.document_id = $2
      `, [linkRow.document_revision_id, linkRow.controlled_document_id]);

      if (revRes.rows.length === 0) {
        throw new HttpException(
          { code: 'DOCUMENT_REVISION_NOT_FOUND', title: 'Attached controlled document revision not found in persistent store.' },
          HttpStatus.NOT_FOUND
        );
      }
      const revRow = revRes.rows[0];

      // Verify hash integrity
      if (linkRow.calculated_sha256 !== revRow.calculated_sha256) {
        throw new HttpException(
          { code: 'SOURCE_HASH_MISMATCH', title: 'Attached source document hash does not match stored revision hash.' },
          HttpStatus.BAD_REQUEST
        );
      }

      const auditEventId = `audit-${Date.now()}-${randomUUID().slice(0, 8)}`;
      const verifiedAt = new Date().toISOString();
      const extractedValue = body.extractedRuleValue || `${cRow.limit_value} ${cRow.unit}`;
      const applicability = body.applicabilityStatement || cRow.location_zone;
      const comment = body.reviewerComment || 'Authoritative compliance verification approved against controlled source.';

      // Insert verification record
      await client.query(`
        INSERT INTO constraint_verifications (
          id, organisation_id, constraint_id, verifier_user_id, verifier_role,
          extracted_rule_value, applicability_statement, reviewer_comment,
          verified_at, audit_event_id, source_hash
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        )
      `, [
        orgId, constraintId, reviewerUserId, reviewerRole,
        extractedValue, applicability, comment, verifiedAt, auditEventId, linkRow.calculated_sha256
      ]);

      // Transition constraint to 'Verified' and increment version
      const newVersion = (cRow.version || 1) + 1;
      await client.query(`
        UPDATE operational_constraints
        SET verification_status = 'Verified',
            version = $1,
            updated_at = NOW()
        WHERE id = $2
      `, [newVersion, constraintId]);

      // Write immutable audit event in the same transaction
      const payloadToDigest = JSON.stringify({
        constraintId,
        projectId,
        organisationId: orgId,
        status: 'Verified',
        verifier: reviewerIdentity,
        verifierRole: reviewerRole,
        verifierUserId: reviewerUserId,
        documentId: linkRow.controlled_document_id,
        revisionId: linkRow.document_revision_id,
        sha256: linkRow.calculated_sha256,
        version: newVersion,
        verifiedAt,
      });
      const payloadDigest = createHash('sha256').update(payloadToDigest).digest('hex');

      await client.query(`
        INSERT INTO audit_events (
          id, organisation_id, project_id, actor_id, action, target_type,
          target_id, target_version, payload_digest, created_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, 'CONSTRAINT_VERIFIED', 'operational_constraint',
          $4, $5, $6, NOW()
        )
      `, [
        orgId, projectId, reviewerUserId, constraintId, newVersion, payloadDigest
      ]);

      // Commit transaction atomically
      await client.query('COMMIT');

      return {
        data: {
          id: constraintId,
          verificationStatus: 'Verified',
          verifiedBy: reviewerIdentity,
          verifiedAt,
          sourceDocumentHash: linkRow.calculated_sha256,
          version: newVersion,
          verificationRecord: {
            verifiedAt,
            reviewerIdentity,
            reviewerRole,
            controlledDocumentId: linkRow.controlled_document_id,
            documentRevisionId: linkRow.document_revision_id,
            calculatedSha256: linkRow.calculated_sha256,
            systemCalculatedSha256: linkRow.calculated_sha256,
            sourceDocumentNumber: revRow.document_number || 'DOC-CONTROLLED',
            sourceDocumentTitle: revRow.doc_title || 'Controlled Document',
            revisionCode: revRow.revision || 'Rev 01',
            pageClauseSection: body.pageClauseSection || 'Section Cited',
            extractedRuleValue: extractedValue,
            applicabilityStatement: applicability,
            reviewerComment: comment,
            auditEventId,
          },
        },
        audit: {
          auditEventId,
          action: 'CONSTRAINT_VERIFIED',
          entryHash: payloadDigest,
          timestamp: verifiedAt,
        },
        message: `Operational constraint ${constraintId} verified authoritative and committed to audit ledger.`,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  @Post(':constraintId/supersede')
  @UseGuards(ConstraintsAuthGuard, IdempotencyGuard)
  async supersedeConstraint(
    @Param('projectId') projectId: string,
    @Param('constraintId') constraintId: string,
    @Body() body: { supersededByConstraintId?: string; reason?: string } = {},
    @Req() req: Request = {} as Request
  ) {
    const sessionUser = (req as any)?.sessionUser;
    const orgId = sessionUser?.organisationId || (req as any)?.organisationId || '11111111-1111-4111-8111-111111111111';
    const pool = this.dbService.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.current_org_id', $1, true)", [orgId]);

      const cRes = await client.query(`
        SELECT * FROM operational_constraints WHERE id = $1 AND project_id = $2 FOR UPDATE
      `, [constraintId, projectId]);

      if (cRes.rows.length === 0) {
        throw new HttpException({ code: 'NOT_FOUND', title: 'Constraint not found' }, HttpStatus.NOT_FOUND);
      }
      const cRow = cRes.rows[0];

      const newVersion = (cRow.version || 1) + 1;
      await client.query(`
        UPDATE operational_constraints
        SET verification_status = 'Superseded',
            version = $1,
            updated_at = NOW()
        WHERE id = $2
      `, [newVersion, constraintId]);

      await client.query('COMMIT');

      return {
        data: {
          id: constraintId,
          verificationStatus: 'Superseded',
          version: newVersion,
          reason: body.reason || body.supersededByConstraintId,
        },
        message: `Operational constraint ${constraintId} has been superseded.`,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async supersede(
    projectId: string,
    constraintId: string,
    body: { supersededByConstraintId?: string; reason?: string } = {},
    req: Request = {} as Request
  ) {
    return this.supersedeConstraint(projectId, constraintId, body, req);
  }

  async verifyConstraintAction(
    projectId: string,
    constraintId: string,
    body: any,
    req: Request = {} as Request
  ) {
    return this.verifyConstraint(projectId, constraintId, body, req);
  }
}
