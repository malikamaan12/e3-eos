import {
  Controller,
  Get,
  Post,
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
import { createHash } from 'crypto';
import {
  EvidenceVaultItem,
  EvidenceVaultRevision,
  EvidenceCategory,
  generateEvidenceCode,
  generateEvidenceExportFilename,
  evaluateEvidenceRenewal,
} from '@e3-eos/domain';
import {
  EvidenceVaultIntakeSchema,
  EvidenceVerificationSchema,
} from '@e3-eos/contracts';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { IdempotencyGuard } from '../common/idempotency.guard.js';
import { DbService } from '../common/db.service.js';
import { CompanyVaultAvailabilityGuard, assertDocumentFixture } from './documents-access.guard.js';
import {
  evidenceVaultRepository,
  evidenceVaultRevisionsRepository,
  submissionPackItemsRepository,
} from './documents.repositories.js';

@Controller('vault')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard, CompanyVaultAvailabilityGuard)
export class CompanyVaultController {
  private dbService: DbService;

  constructor(@Optional() dbService?: DbService) {
    this.dbService = dbService || new DbService();
  }

  getDbPool() {
    return this.dbService.getPool();
  }

  @Get()
  listVaultItems(
    @Query('category') category?: EvidenceCategory,
    @Query('entity') entity?: string,
    @Query('reportingYear') reportingYear?: string,
    @Query('auditStatus') auditStatus?: string,
    @Query('search') search?: string,
    @Req() req?: Request
  ) {
    assertDocumentFixture(req);
    let items = Array.from(evidenceVaultRepository.values()).filter((it) => !it.isArchived);

    if (category) {
      items = items.filter((it) => it.category === category);
    }
    if (entity) {
      const lowerEnt = entity.toLowerCase().trim();
      items = items.filter((it) => it.legalEntity.toLowerCase().includes(lowerEnt));
    }
    if (reportingYear) {
      const yr = String(reportingYear).toUpperCase().replace(/[^0-9]/g, '');
      items = items.filter((it) => String(it.reportingYear || '').toUpperCase().replace(/[^0-9]/g, '') === yr);
    }
    if (auditStatus) {
      items = items.filter((it) => it.auditStatus === auditStatus);
    }
    if (search) {
      const q = search.toLowerCase().trim();
      items = items.filter(
        (it) =>
          it.title.toLowerCase().includes(q) ||
          it.evidenceCode.toLowerCase().includes(q) ||
          it.legalEntity.toLowerCase().includes(q) ||
          (it.sourceDocumentNumber && it.sourceDocumentNumber.toLowerCase().includes(q))
      );
    }

    // Confidentiality filtering
    const userRole = (req?.headers['x-user-role'] as string) || 'pm';
    if (userRole === 'client') {
      items = items.filter((it) => it.confidentiality === 'public' || it.confidentiality === 'internal');
    }

    return {
      data: items,
      meta: { total: items.length },
    };
  }

  @Get('renewals')
  listRenewalAlerts(@Query('currentDate') currentDate?: string) {
    assertDocumentFixture();
    const items = Array.from(evidenceVaultRepository.values()).filter((it) => !it.isArchived);
    const alerts: Array<{
      item: EvidenceVaultItem;
      evaluation: ReturnType<typeof evaluateEvidenceRenewal>;
    }> = [];

    for (const item of items) {
      const evalResult = evaluateEvidenceRenewal({
        expiryDate: item.expiryDate,
        expiryState: item.expiryState,
        currentDate,
      });

      if (evalResult.alertLevel !== 'valid') {
        alerts.push({
          item,
          evaluation: evalResult,
        });
      }
    }

    return {
      data: alerts,
      meta: { totalAlerts: alerts.length },
    };
  }

  @Get(':id')
  getVaultItem(@Param('id') id: string) {
    assertDocumentFixture();
    const item = evidenceVaultRepository.get(id);
    if (!item) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Evidence vault item not found' }, HttpStatus.NOT_FOUND);
    }
    const revs = evidenceVaultRevisionsRepository.get(id) || [];
    // Resolve current operational revision (most recent approved revision, or current pointer)
    const approvedRev = [...revs].reverse().find((r) => r.verificationStatus === 'approved');
    const operationalRevCode = approvedRev ? approvedRev.revisionCode : item.currentRevisionCode;
    const operationalRevId = approvedRev ? approvedRev.id : item.currentRevisionId;
    return {
      data: {
        ...item,
        currentRevisionCode: operationalRevCode,
        currentRevisionId: operationalRevId,
      },
      meta: { revisions: revs },
    };
  }

  getEvidence(id: string) {
    assertDocumentFixture();
    return this.getVaultItem(id);
  }

  @Get(':id/revisions')
  listRevisions(@Param('id') id: string) {
    assertDocumentFixture();
    const item = evidenceVaultRepository.get(id);
    if (!item) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Evidence vault item not found' }, HttpStatus.NOT_FOUND);
    }
    const revs = evidenceVaultRevisionsRepository.get(id) || [];
    return { data: revs };
  }

  @Post()
  @UseGuards(IdempotencyGuard)
  intakeEvidenceMaster(@Body() body: any, @Req() req: Request) {
    assertDocumentFixture(req);
    const normalizedBody = {
      ...body,
      originalFilename: body.originalFilename || body.fileName || 'evidence.pdf',
    };
    const parseResult = EvidenceVaultIntakeSchema.safeParse(normalizedBody);
    if (!parseResult.success) {
      throw new HttpException(
        { code: 'VALIDATION_ERROR', title: 'Invalid evidence intake payload', detail: parseResult.error.message },
        HttpStatus.BAD_REQUEST
      );
    }
    const data = parseResult.data;
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';

    // Calculate file buffer and SHA-256
    let fileBuffer: Buffer;
    if (data.fileContent) {
      fileBuffer = data.isBase64 ? Buffer.from(data.fileContent, 'base64') : Buffer.from(data.fileContent, 'utf8');
    } else {
      fileBuffer = Buffer.from(
        `E3 Official Vault Evidence Artifact\nEntity: ${data.legalEntity}\nTitle: ${data.title}\nCategory: ${data.category}`,
        'utf8'
      );
    }

    const calculatedSha256 = data.contentHash || createHash('sha256').update(fileBuffer).digest('hex');

    // Scenario 2: Safe duplicate handling - check if identical file already exists in vault
    const existingSameHash = Array.from(evidenceVaultRepository.values()).find((it) => {
      const revs = evidenceVaultRevisionsRepository.get(it.id) || [];
      return revs.some((r) => r.calculatedSha256 === calculatedSha256 || r.contentHash === calculatedSha256) && it.category === data.category && it.legalEntity === data.legalEntity;
    });

    if (existingSameHash && !body.allowDuplicate) {
      return {
        data: existingSameHash,
        meta: { isDuplicate: true, isExistingMaster: true, existingId: existingSameHash.id },
        message: `Identical evidence file already registered as ${existingSameHash.evidenceCode}. Duplicate master avoided.`,
      };
    }

    const countInCategory = Array.from(evidenceVaultRepository.values()).filter((it) => it.category === data.category).length;
    const evidenceCode = generateEvidenceCode(data.category as EvidenceCategory, countInCategory + 1);
    const vaultId = `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const revId = `evr-${Date.now()}-01`;
    const now = new Date().toISOString();
    const uploader = (req as any).sessionUser?.name || (req as any).userName || (req.headers['x-user-name'] as string) || 'Document Controller';

    const initialRevision: EvidenceVaultRevision = {
      id: revId,
      vaultItemId: vaultId,
      organisationId: orgId,
      revisionNumber: 1,
      revisionCode: 'Rev 01',
      contentHash: calculatedSha256,
      calculatedSha256,
      originalFilename: data.originalFilename,
      storageKey: `vault/${data.category}/${evidenceCode}-Rev01.pdf`,
      fileSizeBytes: data.fileSizeBytes || fileBuffer.length,
      mimeType: data.mimeType,
      verificationStatus: 'pending_verification', // New uploads default to Pending Verification (Scenario 1)
      uploadedBy: uploader,
      uploadedAt: now,
    };

    const vaultItem: EvidenceVaultItem = {
      id: vaultId,
      organisationId: orgId,
      evidenceCode,
      title: data.title,
      category: data.category as EvidenceCategory,
      legalEntity: data.legalEntity,
      documentClass: data.documentClass,
      confidentiality: data.confidentiality,
      sourceDocumentNumber: data.sourceDocumentNumber,
      issuer: data.issuer,
      reportingYear: data.reportingYear,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      auditStatus: data.auditStatus,
      expiryState: data.expiryState,
      expiryDate: data.expiryDate,
      currentRevisionId: revId,
      currentRevisionCode: 'Rev 01',
      verificationStatus: 'pending_verification', // Strictly Pending Verification
      retentionHold: data.retentionHold,
      isArchived: false,
      tags: data.tags,
      createdAt: now,
      updatedAt: now,
    };

    evidenceVaultRepository.set(vaultId, vaultItem);
    evidenceVaultRevisionsRepository.set(vaultId, [initialRevision]);

    const exportFilename = generateEvidenceExportFilename({
      title: vaultItem.title,
      legalEntity: vaultItem.legalEntity,
      revisionCode: vaultItem.currentRevisionCode,
      expiryDate: vaultItem.expiryDate,
      reportingYear: vaultItem.reportingYear,
    });

    return {
      data: vaultItem,
      meta: {
        initialRevision,
        exportFilename,
      },
      message: `Evidence master ${evidenceCode} created in Pending Verification status.`,
    };
  }

  @Post(':id/revisions')
  @UseGuards(IdempotencyGuard)
  uploadNewRevision(@Param('id') id: string, @Body() body: any, @Req() req: Request) {
    assertDocumentFixture(req);
    const item = evidenceVaultRepository.get(id);
    if (!item) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Evidence vault item not found' }, HttpStatus.NOT_FOUND);
    }

    const orgId = (req as any).organisationId || item.organisationId;
    const revs = evidenceVaultRevisionsRepository.get(id) || [];
    const nextRevNum = revs.length + 1;
    const revCode = body.revisionCode || `Rev ${String(nextRevNum).padStart(2, '0')}`;

    let fileBuffer: Buffer;
    if (body.fileContent) {
      fileBuffer = body.isBase64 ? Buffer.from(body.fileContent, 'base64') : Buffer.from(body.fileContent, 'utf8');
    } else {
      fileBuffer = Buffer.from(
        `E3 Official Vault Evidence Artifact\nEntity: ${item.legalEntity}\nTitle: ${item.title}\nRevision: ${revCode}\nDate: ${new Date().toISOString()}`,
        'utf8'
      );
    }

    const calculatedSha256 = body.contentHash || createHash('sha256').update(fileBuffer).digest('hex');
    const uploader = (req as any).sessionUser?.name || (req as any).userName || (req.headers['x-user-name'] as string) || 'Document Controller';
    const revId = `evr-${Date.now()}-${String(nextRevNum).padStart(2, '0')}`;
    const now = new Date().toISOString();

    const newRev: EvidenceVaultRevision = {
      id: revId,
      vaultItemId: id,
      organisationId: orgId,
      revisionNumber: nextRevNum,
      revisionCode: revCode,
      predecessorRevisionId: item.currentRevisionId,
      contentHash: calculatedSha256,
      calculatedSha256,
      originalFilename: body.originalFilename || body.fileName || `${item.evidenceCode}-${revCode}.pdf`,
      storageKey: `vault/${item.category}/${item.evidenceCode}-${revCode}.pdf`,
      fileSizeBytes: body.fileSizeBytes || fileBuffer.length,
      mimeType: body.mimeType || 'application/pdf',
      verificationStatus: 'pending_verification', // New revision resets verification
      uploadedBy: uploader,
      uploadedAt: now,
    };

    revs.push(newRev);
    evidenceVaultRevisionsRepository.set(id, revs);

    // Update master pointer:
    // Retain current approved revision as operational pointer until new revision is verified
    const approvedRev = [...revs].reverse().find((r) => r.verificationStatus === 'approved');
    if (!approvedRev) {
      item.currentRevisionId = revId;
      item.currentRevisionCode = revCode;
      item.verificationStatus = 'pending_verification';
    }
    if (body.expiryDate) item.expiryDate = body.expiryDate;
    item.updatedAt = now;
    evidenceVaultRepository.set(id, item);

    return {
      data: newRev,
      meta: { master: item },
      message: `New revision ${revCode} uploaded for ${item.evidenceCode}. Status: Pending Verification.`,
    };
  }

  @Post(':id/revisions/:revId/verify')
  verifyRevision(
    @Param('id') id: string,
    @Param('revId') revId: string,
    @Body() body: any
  ) {
    assertDocumentFixture();
    const item = evidenceVaultRepository.get(id);
    if (!item) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Evidence vault item not found' }, HttpStatus.NOT_FOUND);
    }

    const normalizedBody = {
      verificationDecision: body.verificationDecision || body.status || 'approved',
      verifierName: body.verifierName || 'Authorized Verifier',
      verifierRole: body.verifierRole || 'Lead Procurement Manager',
      notes: body.notes || body.verificationNotes,
      ...body,
    };
    const parseResult = EvidenceVerificationSchema.safeParse(normalizedBody);
    if (!parseResult.success) {
      throw new HttpException(
        { code: 'VALIDATION_ERROR', title: 'Invalid verification payload', detail: parseResult.error.message },
        HttpStatus.BAD_REQUEST
      );
    }
    const data = parseResult.data;

    const revs = evidenceVaultRevisionsRepository.get(id) || [];
    const rev = revs.find((r) => r.id === revId || r.revisionCode === revId);
    if (!rev) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Evidence revision not found' }, HttpStatus.NOT_FOUND);
    }

    const now = new Date().toISOString();
    rev.verificationStatus = data.verificationDecision === 'approved' ? 'approved' : 'rejected';
    rev.verificationNotes = data.notes;
    rev.verifiedBy = data.verifierName;
    rev.verifiedAt = now;

    if (data.verificationDecision === 'approved') {
      item.currentRevisionId = rev.id;
      item.currentRevisionCode = rev.revisionCode;
      item.verificationStatus = 'approved';
      item.verifiedBy = data.verifierName;
      item.verifiedAt = now;
      item.updatedAt = now;
      evidenceVaultRepository.set(id, item);
    } else if (item.currentRevisionId === rev.id) {
      item.verificationStatus = rev.verificationStatus;
      item.updatedAt = now;
      evidenceVaultRepository.set(id, item);
    }

    return {
      data: rev,
      meta: { masterStatus: item.verificationStatus },
      message: `Revision ${rev.revisionCode} verification recorded as ${rev.verificationStatus}.`,
    };
  }

  @Delete(':id')
  deleteOrArchiveEvidence(@Param('id') id: string, @Query('permanent') permanent?: string) {
    assertDocumentFixture();
    const item = evidenceVaultRepository.get(id);
    if (!item) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Evidence vault item not found' }, HttpStatus.NOT_FOUND);
    }

    // Check retention hold
    if (item.retentionHold) {
      throw new HttpException(
        {
          code: 'RETENTION_HOLD_ACTIVE',
          message: 'RETENTION_HOLD_ACTIVE: Cannot delete evidence under legal retention hold',
          title: 'Cannot delete evidence under legal retention hold',
          detail: `Evidence ${item.evidenceCode} is flagged with retentionHold=true and cannot be deleted or archived.`,
        },
        HttpStatus.PRECONDITION_FAILED
      );
    }

    // Check if evidence is used in any frozen or submitted packs
    const usedInPacks: string[] = [];
    for (const [revId, items] of submissionPackItemsRepository.entries()) {
      if (items.some((it) => it.sourceEntityId === id)) {
        usedInPacks.push(revId);
      }
    }

    if (usedInPacks.length > 0 && permanent === 'true') {
      throw new HttpException(
        {
          code: 'DEPENDENCY_ACTIVE',
          title: 'Cannot permanently delete historically used evidence',
          detail: `Evidence ${item.evidenceCode} is referenced in ${usedInPacks.length} submission pack revisions. Soft archive permitted only.`,
        },
        HttpStatus.CONFLICT
      );
    }

    if (permanent === 'true') {
      evidenceVaultRepository.delete(id);
      evidenceVaultRevisionsRepository.delete(id);
      return {
        data: { id, deleted: true, mode: 'permanent' },
        message: `Evidence master ${item.evidenceCode} permanently deleted.`,
      };
    }

    item.isArchived = true;
    item.updatedAt = new Date().toISOString();
    evidenceVaultRepository.set(id, item);

    return {
      data: { id, deleted: true, mode: 'archived' },
      message: `Evidence master ${item.evidenceCode} archived safely with history preserved.`,
    };
  }

  @Post(':id/restore')
  restoreArchivedEvidence(@Param('id') id: string) {
    assertDocumentFixture();
    const item = evidenceVaultRepository.get(id);
    if (!item) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Evidence vault item not found' }, HttpStatus.NOT_FOUND);
    }

    item.isArchived = false;
    item.updatedAt = new Date().toISOString();
    evidenceVaultRepository.set(id, item);

    return {
      data: item,
      message: `Evidence master ${item.evidenceCode} restored successfully.`,
    };
  }
}
