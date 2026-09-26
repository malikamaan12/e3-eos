import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
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
import {
  SubmissionPack,
  SubmissionPackRevisionRecord,
  SubmissionPackItem,
  SubmissionPackArtifact,
  calculatePackFreezeManifest,
  evaluatePackReadiness,
  assemblePureJsPdfPack,
  redactDocumentForClientDistribution,
  EnvelopeType,
} from '@e3-eos/domain';
import {
  SubmissionPackCreateSchema,
  SubmissionPackReorderSchema,
  SubmissionPackItemUpdateSchema,
  SubmissionPackFreezeSchema,
  PdfAssemblyConfigSchema,
  StampSignaturePlacementSchema,
  PackFinalizeSchema,
  PackIssueSchema,
  PackRecordReceiptSchema,
  ClientReviewShareSchema,
} from '@e3-eos/contracts';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { IdempotencyGuard } from '../common/idempotency.guard.js';
import { DbService } from '../common/db.service.js';
import { DocumentsAccessGuard, assertDocumentFixture } from './documents-access.guard.js';
import {
  submissionPacksRepository,
  submissionPackRevisionsRepository,
  submissionPackItemsRepository,
  submissionPackArtifactsRepository,
  documentCommentsRepository,
  authorizedStampSignatureAssetsRepository,
  transmittalIssueRecordsRepository,
  clientReviewSharesRepository,
  evidenceVaultRepository,
  requiredDocumentSlotsRepository,
  projectWorkingCopiesRepository,
} from './documents.repositories.js';

@Controller('projects/:projectId/packs')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard, DocumentsAccessGuard)
export class SubmissionPacksController {
  private dbService: DbService;

  constructor(@Optional() dbService?: DbService) {
    this.dbService = dbService || new DbService();
  }

  getDbPool() {
    return this.dbService.getPool();
  }

  @Get()
  listPacks(@Param('projectId') projectId: string) {
    assertDocumentFixture();
    const packs = Array.from(submissionPacksRepository.values()).filter((p) => p.projectId === projectId);
    return {
      data: packs,
      meta: { total: packs.length },
    };
  }

  @Post()
  @UseGuards(IdempotencyGuard)
  createPack(
    @Param('projectId') projectId: string,
    @Body() body: any,
    @Req() req: Request
  ) {
    assertDocumentFixture(req);
    const parseResult = SubmissionPackCreateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { code: 'VALIDATION_ERROR', title: 'Invalid pack creation payload', detail: parseResult.error.message },
        HttpStatus.BAD_REQUEST
      );
    }
    const data = parseResult.data;
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';

    const existingPacks = Array.from(submissionPacksRepository.values()).filter((p) => p.projectId === projectId);
    const packCode = `PACK-${projectId.slice(0, 5).toUpperCase()}-${data.envelope.slice(0, 4).toUpperCase()}-${String(existingPacks.length + 1).padStart(2, '0')}`;
    const packId = `pack-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const revId = `packrev-${packId}-01`;
    const now = new Date().toISOString();

    const pack: SubmissionPack = {
      id: packId,
      projectId,
      organisationId: orgId,
      packCode,
      title: data.title,
      description: data.description,
      tenderReference: data.tenderReference,
      envelope: data.envelope as EnvelopeType,
      status: 'working',
      currentRevisionNumber: 1,
      currentRevisionCode: 'Rev 01',
      createdAt: now,
      updatedAt: now,
    };

    const initialRev: SubmissionPackRevisionRecord = {
      id: revId,
      packId,
      projectId,
      organisationId: orgId,
      revisionCode: 'Rev 01',
      revisionNumber: 1,
      status: 'working',
      manifestHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      isFrozen: false,
      createdAt: now,
    };

    submissionPacksRepository.set(packId, pack);
    submissionPackRevisionsRepository.set(revId, initialRev);
    submissionPackItemsRepository.set(revId, []);

    return {
      data: pack,
      meta: { initialRevision: initialRev },
      message: `Submission pack ${packCode} created successfully.`,
    };
  }

  @Get(':packId')
  getPack(@Param('projectId') projectId: string, @Param('packId') packId: string) {
    assertDocumentFixture();
    const pack = submissionPacksRepository.get(packId);
    if (!pack || pack.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Submission pack not found' }, HttpStatus.NOT_FOUND);
    }
    const currentRev = Array.from(submissionPackRevisionsRepository.values()).find(
      (r) => r.packId === packId && r.revisionNumber === pack.currentRevisionNumber
    );
    const items = currentRev ? submissionPackItemsRepository.get(currentRev.id) || [] : [];
    const sortedItems = [...items].sort((a, b) => a.sequenceIndex - b.sequenceIndex);

    return {
      data: {
        ...pack,
        currentRevision: currentRev,
        items: sortedItems,
      },
    };
  }

  @Post(':packId/items')
  addItemToPack(
    @Param('projectId') projectId: string,
    @Param('packId') packId: string,
    @Body() body: {
      sourceEntityId: string;
      itemType: 'required_slot' | 'vault_evidence' | 'project_working_doc' | 'section_divider';
      submissionTitle?: string;
      sectionName?: string;
      selectedPageRange?: string;
      isMandatory?: boolean;
    }
  ) {
    assertDocumentFixture();
    const pack = submissionPacksRepository.get(packId);
    if (!pack || pack.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Submission pack not found' }, HttpStatus.NOT_FOUND);
    }

    const currentRev = Array.from(submissionPackRevisionsRepository.values()).find(
      (r) => r.packId === packId && r.revisionNumber === pack.currentRevisionNumber
    );
    if (!currentRev || currentRev.isFrozen) {
      throw new HttpException(
        { code: 'PACK_FROZEN', title: 'Cannot modify a frozen pack revision. Fork a new working revision first.' },
        HttpStatus.CONFLICT
      );
    }

    const items = submissionPackItemsRepository.get(currentRev.id) || [];
    const nextSeq = items.length + 1;
    const itemId = `pitem-${Date.now()}-${nextSeq}`;

    let title = body.submissionTitle || 'Document Item';
    let revisionCode = 'Rev 01';
    let contentHash = 'hash-initial';
    let stampRequired = false;
    let signatureRequired = false;

    const itemType = body.itemType || 'vault_evidence';
    const sourceEntityId = body.sourceEntityId || `source-${Date.now()}`;
    const envelope = (body as any).envelope || pack.envelope;

    if (itemType === 'required_slot') {
      const slot = requiredDocumentSlotsRepository.get(sourceEntityId);
      if (slot) {
        title = body.submissionTitle || slot.title;
        stampRequired = slot.stampRequired;
        signatureRequired = slot.signatureRequired;
      }
    } else if (itemType === 'vault_evidence') {
      const vItem = evidenceVaultRepository.get(sourceEntityId);
      if (vItem) {
        title = body.submissionTitle || vItem.title;
        revisionCode = vItem.currentRevisionCode;
      }
    } else if (itemType === 'project_working_doc') {
      const wDoc = projectWorkingCopiesRepository.get(sourceEntityId);
      if (wDoc) {
        title = body.submissionTitle || wDoc.title;
        revisionCode = wDoc.currentRevisionCode;
        contentHash = wDoc.contentHash;
      }
    }

    const newItem: SubmissionPackItem = {
      id: itemId,
      packRevisionId: currentRev.id,
      sequenceIndex: nextSeq,
      sectionName: body.sectionName || 'Section 1: General',
      itemType,
      sourceEntityId,
      sourceRevisionId: revisionCode,
      sourceContentHash: contentHash,
      submissionTitle: title,
      envelope: envelope as EnvelopeType,
      isIncluded: true,
      isMandatory: body.isMandatory ?? true,
      selectedPageRange: body.selectedPageRange || 'all',
      stampRequired,
      signatureRequired,
    };

    items.push(newItem);
    submissionPackItemsRepository.set(currentRev.id, items);

    return {
      data: newItem,
      message: `Item "${title}" added to pack at position ${nextSeq}.`,
    };
  }

  @Put(':packId/items/reorder')
  reorderPackItems(
    @Param('projectId') projectId: string,
    @Param('packId') packId: string,
    @Body() body: any
  ) {
    assertDocumentFixture();
    const parseResult = SubmissionPackReorderSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { code: 'VALIDATION_ERROR', title: 'Invalid reorder payload', detail: parseResult.error.message },
        HttpStatus.BAD_REQUEST
      );
    }

    const pack = submissionPacksRepository.get(packId);
    if (!pack || pack.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Submission pack not found' }, HttpStatus.NOT_FOUND);
    }

    const currentRev = Array.from(submissionPackRevisionsRepository.values()).find(
      (r) => r.packId === packId && r.revisionNumber === pack.currentRevisionNumber
    );
    if (!currentRev || currentRev.isFrozen) {
      throw new HttpException(
        { code: 'PACK_FROZEN', title: 'Cannot reorder a frozen pack revision.' },
        HttpStatus.CONFLICT
      );
    }

    const items = submissionPackItemsRepository.get(currentRev.id) || [];
    const orderedIds = parseResult.data.orderedItemIds;

    // Update sequenceIndex according to user's ordered array
    for (let i = 0; i < orderedIds.length; i++) {
      const it = items.find((x) => x.id === orderedIds[i]);
      if (it) {
        it.sequenceIndex = i + 1;
      }
    }

    items.sort((a, b) => a.sequenceIndex - b.sequenceIndex);
    submissionPackItemsRepository.set(currentRev.id, items);

    return {
      data: items,
      message: `Pack items reordered successfully. Saved sequence index updated.`,
    };
  }

  reorderItems(projectId: string, packId: string, body: any) {
    assertDocumentFixture();
    return this.reorderPackItems(projectId, packId, body);
  }

  @Patch(':packId/items/:itemId')
  updatePackItem(
    @Param('projectId') projectId: string,
    @Param('packId') packId: string,
    @Param('itemId') itemId: string,
    @Body() body: any
  ) {
    assertDocumentFixture();
    const parseResult = SubmissionPackItemUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { code: 'VALIDATION_ERROR', title: 'Invalid item update payload', detail: parseResult.error.message },
        HttpStatus.BAD_REQUEST
      );
    }
    const data = parseResult.data;

    const pack = submissionPacksRepository.get(packId);
    if (!pack || pack.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Submission pack not found' }, HttpStatus.NOT_FOUND);
    }

    const currentRev = Array.from(submissionPackRevisionsRepository.values()).find(
      (r) => r.packId === packId && r.revisionNumber === pack.currentRevisionNumber
    );
    if (!currentRev || currentRev.isFrozen) {
      throw new HttpException(
        { code: 'PACK_FROZEN', title: 'Cannot edit an item in a frozen pack revision.' },
        HttpStatus.CONFLICT
      );
    }

    const items = submissionPackItemsRepository.get(currentRev.id) || [];
    const item = items.find((x) => x.id === itemId);
    if (!item) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Item not found in pack' }, HttpStatus.NOT_FOUND);
    }

    if (data.submissionTitle !== undefined) item.submissionTitle = data.submissionTitle;
    if (data.sectionName !== undefined) item.sectionName = data.sectionName;
    if (data.isIncluded !== undefined) item.isIncluded = data.isIncluded;
    if (data.exclusionReason !== undefined) item.exclusionReason = data.exclusionReason;
    if (data.selectedPageRange !== undefined) item.selectedPageRange = data.selectedPageRange;
    if (data.envelope !== undefined) item.envelope = data.envelope as EnvelopeType;

    submissionPackItemsRepository.set(currentRev.id, items);

    return {
      data: item,
      message: `Pack item "${item.submissionTitle}" updated.`,
    };
  }

  @Delete(':packId/items/:itemId')
  removeItemFromPack(
    @Param('projectId') projectId: string,
    @Param('packId') packId: string,
    @Param('itemId') itemId: string
  ) {
    assertDocumentFixture();
    const pack = submissionPacksRepository.get(packId);
    if (!pack || pack.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Submission pack not found' }, HttpStatus.NOT_FOUND);
    }

    const currentRev = Array.from(submissionPackRevisionsRepository.values()).find(
      (r) => r.packId === packId && r.revisionNumber === pack.currentRevisionNumber
    );
    if (!currentRev || currentRev.isFrozen) {
      throw new HttpException(
        { code: 'PACK_FROZEN', title: 'Cannot remove items from a frozen pack revision.' },
        HttpStatus.CONFLICT
      );
    }

    let items = submissionPackItemsRepository.get(currentRev.id) || [];
    const removedItem = items.find((x) => x.id === itemId);
    if (!removedItem) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Item not found in pack' }, HttpStatus.NOT_FOUND);
    }

    items = items.filter((x) => x.id !== itemId);
    // Re-index remaining items
    items.forEach((it, idx) => {
      it.sequenceIndex = idx + 1;
    });

    submissionPackItemsRepository.set(currentRev.id, items);

    return {
      data: { removedItemId: itemId, remainingCount: items.length },
      message: `Item "${removedItem.submissionTitle}" removed from pack. Source master remains unchanged.`,
    };
  }

  @Get(':packId/readiness')
  checkPackReadiness(
    @Param('projectId') projectId: string,
    @Param('packId') packId: string
  ) {
    assertDocumentFixture();
    const pack = submissionPacksRepository.get(packId);
    if (!pack || pack.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Submission pack not found' }, HttpStatus.NOT_FOUND);
    }

    const currentRev = Array.from(submissionPackRevisionsRepository.values()).find(
      (r) => r.packId === packId && r.revisionNumber === pack.currentRevisionNumber
    );
    const items = currentRev ? submissionPackItemsRepository.get(currentRev.id) || [] : [];
    const comments = Array.from(documentCommentsRepository.values()).flat();

    const readiness = evaluatePackReadiness({
      pack,
      items,
      comments,
      manifestHash: currentRev?.manifestHash,
    });

    return {
      data: readiness,
      meta: {
        packId,
        revisionCode: pack.currentRevisionCode,
        totalItems: items.length,
        includedItems: items.filter((it) => it.isIncluded).length,
      },
    };
  }

  @Post(':packId/freeze')
  freezePack(
    @Param('projectId') projectId: string,
    @Param('packId') packId: string,
    @Body() body: any,
    @Req() req: Request
  ) {
    assertDocumentFixture(req);
    const parseResult = SubmissionPackFreezeSchema.safeParse(body);
    const data = parseResult.success ? parseResult.data : {};

    const pack = submissionPacksRepository.get(packId);
    if (!pack || pack.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Submission pack not found' }, HttpStatus.NOT_FOUND);
    }

    const currentRev = Array.from(submissionPackRevisionsRepository.values()).find(
      (r) => r.packId === packId && r.revisionNumber === pack.currentRevisionNumber
    );
    if (!currentRev) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Pack revision not found' }, HttpStatus.NOT_FOUND);
    }

    const items = submissionPackItemsRepository.get(currentRev.id) || [];
    const manifestHash = calculatePackFreezeManifest(packId, currentRev.revisionCode, items);
    const now = new Date().toISOString();
    const actor = data.authorizedBy || (req as any).sessionUser?.name || 'Authorized Document Controller';

    currentRev.manifestHash = manifestHash;
    currentRev.isFrozen = true;
    currentRev.status = 'frozen';
    currentRev.frozenAt = now;
    currentRev.frozenBy = actor;
    currentRev.freezeNotes = data.freezeNotes;

    pack.status = 'ready_for_final_approval';
    pack.updatedAt = now;

    submissionPackRevisionsRepository.set(currentRev.id, currentRev);
    submissionPacksRepository.set(packId, pack);

    return {
      data: currentRev,
      meta: { manifestHash },
      message: `Submission pack ${pack.packCode} revision ${currentRev.revisionCode} frozen. Manifest hash: ${manifestHash}`,
    };
  }

  @Post(':packId/fork')
  forkNewPackRevision(
    @Param('projectId') projectId: string,
    @Param('packId') packId: string
  ) {
    assertDocumentFixture();
    const pack = submissionPacksRepository.get(packId);
    if (!pack || pack.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Submission pack not found' }, HttpStatus.NOT_FOUND);
    }

    const priorRev = Array.from(submissionPackRevisionsRepository.values()).find(
      (r) => r.packId === packId && r.revisionNumber === pack.currentRevisionNumber
    );
    const priorItems = priorRev ? submissionPackItemsRepository.get(priorRev.id) || [] : [];

    const nextRevNum = pack.currentRevisionNumber + 1;
    const nextRevCode = `Rev ${String(nextRevNum).padStart(2, '0')}`;
    const newRevId = `packrev-${packId}-${String(nextRevNum).padStart(2, '0')}`;
    const now = new Date().toISOString();

    const newRev: SubmissionPackRevisionRecord = {
      id: newRevId,
      packId,
      projectId,
      organisationId: pack.organisationId,
      revisionCode: nextRevCode,
      revisionNumber: nextRevNum,
      status: 'working',
      manifestHash: 'hash-unfrozen-working',
      isFrozen: false,
      createdAt: now,
    };

    // Deep clone prior items into new revision without altering prior frozen items
    const clonedItems: SubmissionPackItem[] = priorItems.map((it, idx) => ({
      ...it,
      id: `pitem-${Date.now()}-${idx + 1}`,
      packRevisionId: newRevId,
    }));

    pack.currentRevisionNumber = nextRevNum;
    pack.currentRevisionCode = nextRevCode;
    pack.status = 'working';
    pack.updatedAt = now;

    submissionPacksRepository.set(packId, pack);
    submissionPackRevisionsRepository.set(newRevId, newRev);
    submissionPackItemsRepository.set(newRevId, clonedItems);

    return {
      data: newRev,
      meta: { itemsCount: clonedItems.length },
      message: `New working revision ${nextRevCode} forked successfully. Prior revision ${priorRev?.revisionCode} remains frozen.`,
    };
  }

  @Post(':packId/assemble-preview')
  assemblePackPreview(
    @Param('projectId') projectId: string,
    @Param('packId') packId: string,
    @Body() body: any
  ) {
    assertDocumentFixture();
    const parseResult = PdfAssemblyConfigSchema.safeParse(body);
    const config: any = parseResult.success ? parseResult.data : {};

    const pack = submissionPacksRepository.get(packId);
    if (!pack || pack.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Submission pack not found' }, HttpStatus.NOT_FOUND);
    }

    const currentRev = Array.from(submissionPackRevisionsRepository.values()).find(
      (r) => r.packId === packId && r.revisionNumber === pack.currentRevisionNumber
    );
    const items = currentRev ? submissionPackItemsRepository.get(currentRev.id) || [] : [];
    const includedItems = items.filter((it) => it.isIncluded).sort((a, b) => a.sequenceIndex - b.sequenceIndex);

    // Assemble pure-JS PDF preview with page map
    const assembled = assemblePureJsPdfPack({
      packTitle: pack.title,
      tenderReference: pack.tenderReference,
      envelope: pack.envelope,
      items: includedItems.map((it) => ({
        title: it.submissionTitle,
        sectionName: it.sectionName,
        pageRange: it.selectedPageRange,
        sourceId: it.sourceEntityId,
        revisionCode: it.sourceRevisionId,
      })),
      config: {
        includeCover: config.includeCoverPage,
        includeToc: config.includeTableOfContents,
        continuousNumbering: config.continuousPageNumbering,
        watermarkText: config.watermarkText,
      },
    });

    return {
      data: {
        fileName: `${pack.packCode}-${pack.currentRevisionCode}-Candidate.pdf`,
        pageCount: assembled.pageCount,
        fileSizeBytes: assembled.pdfBuffer.length,
        sha256: assembled.sha256,
        pageMap: assembled.pageMap,
      },
      message: `Candidate PDF preview assembled (${assembled.pageCount} pages, SHA-256: ${assembled.sha256.slice(0, 16)}...).`,
    };
  }

  @Post(':packId/apply-marks')
  applyAuthorizedMarks(
    @Param('projectId') projectId: string,
    @Param('packId') packId: string,
    @Body() body: any,
    @Req() req: Request
  ) {
    assertDocumentFixture(req);
    const parseResult = StampSignaturePlacementSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { code: 'VALIDATION_ERROR', title: 'Invalid stamp/signature instructions', detail: parseResult.error.message },
        HttpStatus.BAD_REQUEST
      );
    }
    const data = parseResult.data;

    // Check if asset exists and is authorized
    const targetAssetId = data.assetId || data.assetCode;
    const asset =
      (targetAssetId ? authorizedStampSignatureAssetsRepository.get(targetAssetId) : undefined) ||
      Array.from(authorizedStampSignatureAssetsRepository.values()).find(
        (a) => a.assetCode === targetAssetId || a.id === targetAssetId
      );
    if (!asset || !asset.isActive) {
      throw new HttpException(
        { code: 'ASSET_UNAUTHORIZED', title: 'Requested stamp or signature asset is not authorized or inactive' },
        HttpStatus.FORBIDDEN
      );
    }

    // Role / Actor check (Scenario 29)
    const userRole = (req.headers['x-user-role'] as string) || 'pm';
    if (asset.allowedActors.includes('board_chair_only') && userRole !== 'board_chair') {
      throw new HttpException(
        {
          code: 'PERMISSION_DENIED',
          title: 'Unauthorized stamp/signature request',
          detail: `User role "${userRole}" is not authorized to apply ${asset.label}.`,
        },
        HttpStatus.FORBIDDEN
      );
    }

    const pack = submissionPacksRepository.get(packId);
    if (!pack || pack.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Submission pack not found' }, HttpStatus.NOT_FOUND);
    }

    const currentRev = Array.from(submissionPackRevisionsRepository.values()).find(
      (r) => r.packId === packId && r.revisionNumber === pack.currentRevisionNumber
    );

    const appliedLog = data.placements.map((p) => ({
      assetId: asset.id,
      signatoryName: data.signatoryName || asset.signatoryName,
      authority: data.signatoryAuthority || asset.signatoryAuthority,
      pageNumber: p.pageNumber,
      x: p.x,
      y: p.y,
      timestamp: new Date().toISOString(),
      purpose: data.purpose,
      targetManifestHash: currentRev?.manifestHash || 'unknown',
    }));

    return {
      data: {
        applied: true,
        assetCode: asset.assetCode,
        signatoryName: data.signatoryName || asset.signatoryName,
        placementsCount: data.placements.length,
        auditLog: appliedLog,
      },
      message: `Authorized test mark "${asset.label}" applied to ${data.placements.length} page(s). Audit record created.`,
    };
  }

  @Post(':packId/finalize')
  finalizePack(
    @Param('projectId') projectId: string,
    @Param('packId') packId: string,
    @Body() body: any
  ) {
    assertDocumentFixture();
    const parseResult = PackFinalizeSchema.safeParse(body);
    const data: any = parseResult.success ? parseResult.data : {};

    const pack = submissionPacksRepository.get(packId);
    if (!pack || pack.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Submission pack not found' }, HttpStatus.NOT_FOUND);
    }

    const currentRev = Array.from(submissionPackRevisionsRepository.values()).find(
      (r) => r.packId === packId && r.revisionNumber === pack.currentRevisionNumber
    );
    if (!currentRev) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Pack revision not found' }, HttpStatus.NOT_FOUND);
    }

    const items = submissionPackItemsRepository.get(currentRev.id) || [];
    const readiness = evaluatePackReadiness({
      pack,
      items,
      manifestHash: currentRev.manifestHash,
    });

    if (!readiness.readyToSubmit) {
      throw new HttpException(
        {
          code: 'READINESS_FAILED',
          title: 'Pack cannot be finalized: unresolved blocking issues exist',
          detail: readiness.blockers.join('; '),
        },
        HttpStatus.PRECONDITION_FAILED
      );
    }

    // Build sealed final artifact
    const includedItems = items.filter((it) => it.isIncluded).sort((a, b) => a.sequenceIndex - b.sequenceIndex);
    const markInstructions = data.applyAuthorizedMarks
      ? [
          {
            pageNumber: 1,
            signatoryName: 'Zaid Mansour',
            authority: 'Managing Director & Legal Signatory',
            assetLabel: 'TEST_STAMP_AUTHORIZED',
          },
        ]
      : [];

    const assembled = assemblePureJsPdfPack({
      packTitle: pack.title,
      tenderReference: pack.tenderReference,
      envelope: pack.envelope,
      items: includedItems.map((it) => ({
        title: it.submissionTitle,
        sectionName: it.sectionName,
        pageRange: it.selectedPageRange,
        sourceId: it.sourceEntityId,
        revisionCode: it.sourceRevisionId,
      })),
      markInstructions,
    });

    const artifactId = `art-${Date.now()}`;
    const artifact: SubmissionPackArtifact = {
      id: artifactId,
      packRevisionId: currentRev.id,
      projectId,
      organisationId: pack.organisationId,
      manifestHash: currentRev.manifestHash,
      artifactHash: assembled.sha256,
      fileName: `${pack.packCode}-${currentRev.revisionCode}-Sealed.pdf`,
      fileSizeBytes: assembled.pdfBuffer.length,
      pageCount: assembled.pageCount,
      pageMap: assembled.pageMap,
      isSealed: true,
      sealedAt: new Date().toISOString(),
      signedMarksApplied: data.applyAuthorizedMarks ?? false,
      createdAt: new Date().toISOString(),
    };

    currentRev.status = 'ready_to_submit';
    pack.status = 'ready_to_submit';

    submissionPackArtifactsRepository.set(currentRev.id, artifact);
    submissionPackRevisionsRepository.set(currentRev.id, currentRev);
    submissionPacksRepository.set(packId, pack);

    return {
      data: artifact,
      meta: {
        packStatus: pack.status,
        revisionStatus: currentRev.status,
      },
      message: `Pack finalized and sealed. Output SHA-256: ${assembled.sha256}. Status set to Ready to Submit.`,
    };
  }

  @Post(':packId/issue')
  issuePack(
    @Param('projectId') projectId: string,
    @Param('packId') packId: string,
    @Body() body: any,
    @Req() req: Request
  ) {
    assertDocumentFixture(req);
    const validChannels = ['portal', 'email', 'physical_courier', 'hand_delivery', 'api_transmittal'];
    const normalizedBody = {
      ...body,
      channel: validChannels.includes(body.channel) ? body.channel : 'portal',
    };
    const parseResult = PackIssueSchema.safeParse(normalizedBody);
    if (!parseResult.success) {
      throw new HttpException(
        { code: 'VALIDATION_ERROR', title: 'Invalid pack issuance payload', detail: parseResult.error.message },
        HttpStatus.BAD_REQUEST
      );
    }
    const data = parseResult.data;

    const pack = submissionPacksRepository.get(packId);
    if (!pack || pack.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Submission pack not found' }, HttpStatus.NOT_FOUND);
    }

    const currentRev = Array.from(submissionPackRevisionsRepository.values()).find(
      (r) => r.packId === packId && r.revisionNumber === pack.currentRevisionNumber
    );
    if (!currentRev || currentRev.status !== 'ready_to_submit') {
      throw new HttpException(
        { code: 'PRECONDITION_FAILED', title: 'Only finalized packs in "ready_to_submit" status can be issued.' },
        HttpStatus.PRECONDITION_FAILED
      );
    }

    const artifact = submissionPackArtifactsRepository.get(currentRev.id);
    if (!artifact || !artifact.isSealed) {
      throw new HttpException(
        { code: 'PRECONDITION_FAILED', title: 'Sealed final output artifact is missing.' },
        HttpStatus.PRECONDITION_FAILED
      );
    }

    const trCount = Array.from(transmittalIssueRecordsRepository.values()).filter((t) => t.projectId === projectId).length;
    const trNumber = `TR-PACK-${projectId.slice(0, 5).toUpperCase()}-${String(trCount + 1).padStart(4, '0')}`;
    const now = new Date().toISOString();
    const actor = (req as any).sessionUser?.name || 'Zaid Mansour (Lead PM)';

    const issueRecord = {
      id: `tir-${Date.now()}`,
      projectId,
      organisationId: pack.organisationId,
      packRevisionId: currentRev.id,
      transmittalNumber: trNumber,
      recipientOrganisation: data.recipientOrganisation,
      recipientName: data.recipientName,
      recipientEmail: data.recipientEmail,
      channel: data.channel,
      purpose: data.purpose,
      issuedBy: actor,
      issuedAt: now,
      artifactHash: artifact.artifactHash,
      status: 'issued',
    };

    transmittalIssueRecordsRepository.set(issueRecord.id, issueRecord);

    currentRev.status = 'submitted';
    pack.status = 'submitted';
    submissionPackRevisionsRepository.set(currentRev.id, currentRev);
    submissionPacksRepository.set(packId, pack);

    return {
      data: issueRecord,
      message: `Formal transmittal ${trNumber} issued to ${data.recipientOrganisation}. Pack status set to Submitted.`,
    };
  }

  @Post(':packId/record-receipt')
  recordSubmissionReceipt(
    @Param('projectId') projectId: string,
    @Param('packId') packId: string,
    @Body() body: any
  ) {
    assertDocumentFixture();
    const parseResult = PackRecordReceiptSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { code: 'VALIDATION_ERROR', title: 'Invalid receipt payload', detail: parseResult.error.message },
        HttpStatus.BAD_REQUEST
      );
    }
    const data = parseResult.data;

    const pack = submissionPacksRepository.get(packId);
    if (!pack || pack.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Submission pack not found' }, HttpStatus.NOT_FOUND);
    }

    const currentRev = Array.from(submissionPackRevisionsRepository.values()).find(
      (r) => r.packId === packId && r.revisionNumber === pack.currentRevisionNumber
    );
    const artifact = currentRev ? submissionPackArtifactsRepository.get(currentRev.id) : undefined;

    const receiptRecord = {
      id: `rcpt-${Date.now()}`,
      projectId,
      packId,
      revisionCode: pack.currentRevisionCode,
      receiptReference: data.receiptReference,
      acknowledgedBy: data.acknowledgedBy,
      acknowledgedAt: data.acknowledgementDate || new Date().toISOString(),
      notes: data.receiptNotes,
      receiptDocumentUrl: data.receiptDocumentUrl,
      boundArtifactHash: artifact?.artifactHash || 'unknown',
    };

    return {
      data: receiptRecord,
      message: `Submission receipt "${data.receiptReference}" recorded and bound to sealed artifact hash.`,
    };
  }

  @Post(':packId/share-review')
  createClientReviewShare(
    @Param('projectId') projectId: string,
    @Param('packId') packId: string,
    @Body() body: any
  ) {
    assertDocumentFixture();
    const parseResult = ClientReviewShareSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { code: 'VALIDATION_ERROR', title: 'Invalid share payload', detail: parseResult.error.message },
        HttpStatus.BAD_REQUEST
      );
    }
    const data = parseResult.data;

    const pack = submissionPacksRepository.get(packId);
    if (!pack || pack.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Submission pack not found' }, HttpStatus.NOT_FOUND);
    }

    const currentRev = Array.from(submissionPackRevisionsRepository.values()).find(
      (r) => r.packId === packId && r.revisionNumber === pack.currentRevisionNumber
    );

    const token = `share_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const expiresAt = new Date(Date.now() + (data.expiresInHours || 72) * 60 * 60 * 1000).toISOString();

    const shareRecord = {
      token,
      packId,
      revisionId: currentRev?.id,
      revisionCode: pack.currentRevisionCode,
      recipientName: data.recipientName,
      recipientEmail: data.recipientEmail,
      watermarkText: data.watermarkText,
      allowDownload: data.allowDownload,
      requireOtp: data.requireOtp,
      expiresAt,
      isRevoked: false,
      createdAt: new Date().toISOString(),
    };

    clientReviewSharesRepository.set(token, shareRecord);

    return {
      data: {
        shareToken: token,
        reviewUrl: `/public/review-shares/${token}`,
        expiresAt,
      },
      message: `Client review share generated for ${data.recipientEmail}. Snapshot pinned to ${pack.currentRevisionCode}.`,
    };
  }

  @Get('/public/review-shares/:token')
  getClientReviewSnapshot(@Param('token') token: string) {
    assertDocumentFixture();
    const share = clientReviewSharesRepository.get(token);
    if (!share || share.isRevoked) {
      throw new HttpException({ code: 'FORBIDDEN', title: 'Review share link is invalid or has been revoked' }, HttpStatus.FORBIDDEN);
    }

    if (new Date(share.expiresAt).getTime() < Date.now()) {
      throw new HttpException({ code: 'EXPIRED', title: 'Review share link has expired' }, HttpStatus.GONE);
    }

    const pack = submissionPacksRepository.get(share.packId);
    const items = share.revisionId ? submissionPackItemsRepository.get(share.revisionId) || [] : [];

    // Scrub profit margins, internal costs, and internal comments
    const safePayload = redactDocumentForClientDistribution({
      packTitle: pack?.title,
      revisionCode: share.revisionCode,
      watermarkText: share.watermarkText,
      items: items.map((it) => ({
        submissionTitle: it.submissionTitle,
        sectionName: it.sectionName,
        pageRange: it.selectedPageRange,
      })),
      allowDownload: share.allowDownload,
    });

    return {
      data: safePayload,
      meta: {
        zeroCommercialLeakageGuaranteed: true,
        expiresAt: share.expiresAt,
      },
    };
  }

  @Delete('/public/review-shares/:token')
  revokeClientReviewShare(@Param('token') token: string) {
    assertDocumentFixture();
    const share = clientReviewSharesRepository.get(token);
    if (!share) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Share token not found' }, HttpStatus.NOT_FOUND);
    }

    share.isRevoked = true;
    clientReviewSharesRepository.set(token, share);

    return {
      data: { token, isRevoked: true },
      message: 'Client review share revoked. Immediate access terminated.',
    };
  }
}
