import {
  Controller,
  Post,
  Get,
  Put,
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
  DesignCreateSchema,
  DesignVersionCreateSchema,
  DesignReleaseSchema,
  DesignAnnotationSchema,
  DesignWorkspaceCreateSchema,
  DesignItemCreateSchema,
  DesignItemUpdateSchema,
  DesignCommentThreadCreateSchema,
  DesignCommentReplySchema,
  DesignReviewRoundCreateSchema,
  DesignApprovalSubmitSchema,
  DesignChangeRequestCreateSchema,
  DesignReleaseIssueSchema,
  DesignAdoptionAcknowledgeSchema,
  DesignExternalShareCreateSchema,
  CommandResult,
} from '@e3-eos/contracts';
import {
  DesignReleaseEngine,
  DesignVersion,
  DesignAnnotation,
  ReleasePurpose,
  DesignWorkflowEngine,
  ChangeControlClassifier,
  ClientPortalSanitizer,
  ProductionReleaseGate,
  safeSha256,
  AssetDesignType,
  CanonicalDesignWorkflowStatus,
  ChangeClassification,
  DesignWorkspace,
  DesignItem,
  DesignReviewRound,
  DesignApprovalRecord,
  DesignChangeRequest,
  DesignReleaseRecord,
  DesignExternalShare,
  AdoptionStatus,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { IdempotencyGuard } from '../common/idempotency.guard.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { DbService } from '../common/db.service.js';
import { projectRepository } from '../projects/projects.controller.js';

// =========================================================================
// IN-MEMORY STORAGE REPOSITORIES (MATCHING CANONICAL EOS MONOREPO PATTERN)
// =========================================================================

export interface StoredDesignWorkspace extends DesignWorkspace {
  organisationId: string;
}

export interface StoredDesignItem extends DesignItem {
  organisationId: string;
  category: string;
  isArchived: boolean;
}

export interface StoredDesignVersion extends DesignVersion {
  organisationId: string;
  purpose: ReleasePurpose;
  revisionCode: string;
  revisionDescription?: string;
  isLocked: boolean;
  addressedCommentIds: string[];
  carriedForwardCommentIds: string[];
  rejectedCommentIds: Array<{ commentId: string; reason: string }>;
  costImpactFlag: boolean;
  scheduleImpactFlag: boolean;
  scopeImpactFlag: boolean;
  safetyImpactFlag: boolean;
  procurementImpactFlag: boolean;
  structuralEngineerSignoff?: {
    certified: boolean;
    certifiedBy: string;
    certifiedAt: string;
    licenseNumber: string;
  };
  hseSignoff?: {
    certified: boolean;
    certifiedBy: string;
    certifiedAt: string;
  };
}

export interface StoredDesignAnnotation extends DesignAnnotation {
  organisationId: string;
  pinNumber: number;
  xPercent: number;
  yPercent: number;
  title: string;
  discipline: string;
  priority: string;
  status: string;
  commentType: string;
  visibility: string;
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: string;
  geometryType: string;
  geometryData: Record<string, any>;
  videoTimestampSec?: number;
  threeDCoordinates?: { x: number; y: number; z: number; objectId?: string };
  comments: Array<{
    id: string;
    authorId: string;
    authorName: string;
    authorRole?: string;
    discipline?: string;
    message: string;
    visibility: string;
    attachments: Array<{ name: string; url: string; sizeBytes?: number }>;
    createdAt: string;
  }>;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionEvidence?: string;
}

export interface StoredReviewRound extends DesignReviewRound {
  organisationId: string;
}

export interface StoredApprovalRecord extends DesignApprovalRecord {
  organisationId: string;
}

export interface StoredChangeRequest extends DesignChangeRequest {
  organisationId: string;
}

export interface StoredReleaseRecord extends DesignReleaseRecord {
  organisationId: string;
}

export interface StoredExternalShare extends DesignExternalShare {
  organisationId: string;
}

export const workspaceRepository = new Map<string, StoredDesignWorkspace>();
export const designRepository = new Map<string, StoredDesignItem>();
export const designVersionRepository = new Map<string, StoredDesignVersion>();
export const designAnnotationRepository = new Map<string, StoredDesignAnnotation>();
export const reviewRoundRepository = new Map<string, StoredReviewRound>();
export const approvalRecordRepository = new Map<string, StoredApprovalRecord>();
export const changeRequestRepository = new Map<string, StoredChangeRequest>();
export const releaseRepository = new Map<string, StoredReleaseRecord>();
export const externalShareRepository = new Map<string, StoredExternalShare>();

let designSeq = 1000;
let releaseSeq = 1000;
let varSeq = 1000;

@Controller('projects/:projectId/designs')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class DesignsController {
  private dbService?: DbService;

  constructor(@Optional() dbService?: DbService) {
    this.dbService = dbService || new DbService();
  }

  // =========================================================================
  // 1. WORKSPACES
  // =========================================================================

  @Get('workspaces')
  listWorkspaces(
    @Param('projectId') projectId: string,
    @Req() req: Request
  ): StoredDesignWorkspace[] {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    return Array.from(workspaceRepository.values()).filter(
      (w) => w.projectId === projectId && w.organisationId === orgId && w.status === 'active'
    );
  }

  @Post('workspaces')
  @UseGuards(IdempotencyGuard)
  createWorkspace(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredDesignWorkspace> {
    const raw = typeof body === 'object' && body !== null ? { ...(body as Record<string, any>) } : {};
    if (raw.visibility === 'confidential') {
      raw.visibility = 'internal_only';
    }
    const parseResult = DesignWorkspaceCreateSchema.safeParse(raw);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const workspaceId = `ws-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const workspace: StoredDesignWorkspace = {
      id: workspaceId,
      projectId,
      organisationId: orgId,
      name: parseResult.data.name,
      description: parseResult.data.description,
      responsibleDepartment: parseResult.data.responsibleDepartment,
      ownerId: parseResult.data.ownerId || (req as any).userId,
      ownerName: parseResult.data.ownerName || (req as any).userName || 'Workspace Lead',
      defaultReviewers: parseResult.data.defaultReviewers || [],
      defaultClientReviewers: parseResult.data.defaultClientReviewers || [],
      defaultWorkflow: parseResult.data.defaultWorkflow || 'standard_14_step',
      linkedZones: parseResult.data.linkedZones || [],
      linkedLocations: parseResult.data.linkedLocations || [],
      visibility: parseResult.data.visibility as any,
      color: parseResult.data.color || '#2563eb',
      icon: parseResult.data.icon || '📁',
      status: parseResult.data.status as any,
      createdAt: now,
      updatedAt: now,
    };

    workspaceRepository.set(workspaceId, workspace);

    return {
      data: {
        id: workspaceId,
        status: 'created',
        recordVersion: 1,
        payload: workspace,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-ws',
      },
    };
  }

  // =========================================================================
  // 2. DESIGN ITEMS
  // =========================================================================

  @Get()
  listDesigns(
    @Param('projectId') projectId: string,
    @Query('workspaceId') workspaceId?: string,
    @Query('status') status?: string,
    @Query('discipline') discipline?: string,
    @Query('search') search?: string,
    @Query('clientOnly') clientOnly?: string,
    @Req() req?: Request
  ): StoredDesignItem[] | any[] {
    const orgId = (req as any)?.organisationId || '11111111-1111-4111-8111-111111111111';
    const userRole = (req as any)?.userRole || 'super_admin';
    const isClient = userRole === 'client' || userRole === 'client_user' || clientOnly === 'true';

    let items = Array.from(designRepository.values()).filter(
      (d) => d.projectId === projectId && d.organisationId === orgId && !d.isArchived
    );

    if (workspaceId) {
      items = items.filter((d) => d.workspaceId === workspaceId);
    }
    if (status) {
      items = items.filter((d) => d.currentStatus === status);
    }
    if (discipline) {
      items = items.filter((d) => d.discipline === discipline);
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (d) => d.title.toLowerCase().includes(q) || d.id.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q)
      );
    }

    if (isClient) {
      // C02 Zero-Leak client portal projection
      return items
        .filter((d) => d.clientVisibility)
        .map((d) => ClientPortalSanitizer.sanitizeDesignItemForClient(d));
    }

    return items;
  }

  @Post()
  @UseGuards(IdempotencyGuard)
  createDesign(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredDesignItem> {
    const raw = typeof body === 'object' && body !== null ? { ...(body as Record<string, any>) } : {};
    if (raw.confidentiality === 'confidential') {
      raw.confidentiality = 'internal';
    }

    // Support both simple DesignCreateSchema and rich DesignItemCreateSchema
    const itemParse = DesignItemCreateSchema.safeParse(raw);
    const simpleParse = DesignCreateSchema.safeParse(raw);

    if (!itemParse.success && !simpleParse.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: itemParse.error?.errors || simpleParse.error?.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const project = projectRepository.get(projectId);
    if (!project && !projectId.startsWith('prj') && !projectId.startsWith('PRJ') && !projectId.includes('-')) {
      throw new HttpException({ message: 'PROJECT_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const designId = `DES-${projectId.slice(0, 6).toUpperCase()}-${++designSeq}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const now = new Date().toISOString();

    const clientVis = raw.clientVisibility !== undefined ? raw.clientVisibility : true;

    const data = itemParse.success ? itemParse.data : {
      title: simpleParse.data!.title,
      titleAr: simpleParse.data!.titleAr,
      assetType: 'technical_drawing' as AssetDesignType,
      discipline: raw.discipline || 'staging',
      department: raw.department || 'Scenic & Staging',
      priority: (raw.priority || 'medium') as any,
      approvalPurpose: (raw.approvalPurpose || 'concept') as any,
      confidentiality: (raw.confidentiality || 'internal') as any,
      clientVisibility: clientVis,
      tags: raw.tags || [],
      zones: raw.zones || [],
      locations: raw.locations || [],
      scopePackageIds: raw.scopePackageIds || [],
      requirementIds: raw.requirementIds || [],
      boqItemIds: raw.boqItemIds || [],
      taskIds: raw.taskIds || [],
      productionPackageIds: raw.productionPackageIds || [],
      supplierIds: raw.supplierIds || [],
      relatedDesignItemIds: raw.relatedDesignItemIds || [],
    };

    const design: StoredDesignItem = {
      id: designId,
      projectId,
      organisationId: orgId,
      workspaceId: (data as any).workspaceId,
      title: data.title,
      description: (data as any).description,
      category: (data as any).category || data.assetType || 'technical_drawing',
      assetType: data.assetType as AssetDesignType,
      projectPhase: (data as any).projectPhase || 'Stage 04: Design Development',
      discipline: data.discipline || 'staging',
      department: (data as any).department || 'Scenic & Staging',
      ownerId: (data as any).ownerId || (req as any).userId || 'usr-designer-1',
      ownerName: (data as any).ownerName || (req as any).userName || 'Design Lead',
      internalReviewerId: (data as any).internalReviewerId,
      internalReviewerName: (data as any).internalReviewerName || 'Lead Technical Reviewer',
      clientReviewerId: (data as any).clientReviewerId,
      clientReviewerName: (data as any).clientReviewerName,
      dueDate: (data as any).dueDate,
      priority: data.priority as any,
      currentVersionNumber: 1,
      currentRevisionCode: 'Rev A',
      currentStatus: 'draft',
      approvalPurpose: data.approvalPurpose as any,
      confidentiality: data.confidentiality as any,
      clientVisibility: (body as any)?.clientVisibility !== undefined ? (body as any).clientVisibility : (data.clientVisibility !== false),
      tags: data.tags || [],
      zones: data.zones || [],
      locations: data.locations || [],
      scopePackageIds: data.scopePackageIds || [],
      requirementIds: data.requirementIds || [],
      boqItemIds: data.boqItemIds || [],
      taskIds: data.taskIds || [],
      productionPackageIds: data.productionPackageIds || [],
      supplierIds: data.supplierIds || [],
      relatedDesignItemIds: data.relatedDesignItemIds || [],
      externalUrl: (data as any).externalUrl,
      isArchived: false,
      revisions: [
        {
          revisionCode: 'Rev A',
          versionNumber: 1,
          contentHash: safeSha256(`INITIAL_EMPTY_DESIGN_${designId}`),
          storageUrl: `designs/${designId}-RevA.pdf`,
          uploadedBy: (req as any).userName || 'Design Lead',
          uploadedAt: now,
          notes: 'Initial design creation placeholder.',
          releaseStatus: 'draft_concept',
        },
      ],
      pins: [],
      createdAt: now,
      updatedAt: now,
    };

    designRepository.set(designId, design);

    return {
      data: {
        id: designId,
        status: 'created',
        recordVersion: 1,
        payload: design,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-des',
      },
    };
  }

  @Get(':designId')
  getDesign(
    @Param('projectId') projectId: string,
    @Param('designId') designId: string,
    @Req() req: Request
  ): StoredDesignItem | Partial<DesignItem> {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const userRole = (req as any).userRole || 'super_admin';
    const design = designRepository.get(designId);

    if (!design || design.projectId !== projectId || design.organisationId !== orgId) {
      throw new HttpException({ message: 'DESIGN_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    if (userRole === 'client' || userRole === 'client_user') {
      return ClientPortalSanitizer.sanitizeDesignItemForClient(design);
    }

    return design;
  }

  @Put(':designId')
  updateDesign(
    @Param('projectId') projectId: string,
    @Param('designId') designId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredDesignItem> {
    const parseResult = DesignItemUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const design = designRepository.get(designId);
    if (!design || design.projectId !== projectId || design.organisationId !== orgId) {
      throw new HttpException({ message: 'DESIGN_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // Check status transition validity
    if (parseResult.data.currentStatus && parseResult.data.currentStatus !== design.currentStatus) {
      if (parseResult.data.currentStatus === 'approved_for_production') {
        throw new HttpException(
          { message: 'POL-DES-01 VIOLATION: Transition to approved_for_production requires formal governance approval with verified structural and HSE certifications.' },
          HttpStatus.FORBIDDEN
        );
      }
      const transCheck = DesignWorkflowEngine.canTransition(
        design.currentStatus,
        parseResult.data.currentStatus as CanonicalDesignWorkflowStatus,
        (req as any).userRole || 'super_admin'
      );
      if (!transCheck.allowed) {
        throw new HttpException({ message: transCheck.reason }, HttpStatus.BAD_REQUEST);
      }
      design.currentStatus = parseResult.data.currentStatus as CanonicalDesignWorkflowStatus;
    }

    Object.assign(design, parseResult.data);
    design.updatedAt = new Date().toISOString();
    designRepository.set(designId, design);

    return {
      data: {
        id: designId,
        status: 'updated',
        recordVersion: design.currentVersionNumber,
        payload: design,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-upd',
      },
    };
  }

  // =========================================================================
  // 3. VERSIONS, RELEASE & COMPARISON
  // =========================================================================

  @Get(':designId/versions')
  listVersions(
    @Param('projectId') _projectId: string,
    @Param('designId') designId: string,
    @Req() req: Request
  ): StoredDesignVersion[] {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    return Array.from(designVersionRepository.values())
      .filter((v) => v.designId === designId && v.organisationId === orgId)
      .sort((a, b) => a.versionNumber - b.versionNumber);
  }

  @Post(':designId/versions')
  @UseGuards(IdempotencyGuard)
  createVersion(
    @Param('projectId') projectId: string,
    @Param('designId') designId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredDesignVersion> {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const design = designRepository.get(designId);
    if (!design || design.organisationId !== orgId || design.projectId !== projectId) {
      throw new HttpException({ message: 'DESIGN_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const raw = (body as any) || {};
    const versionPayload = {
      title: raw.title || design.title || 'Engineering Drawing Revision',
      contentData: raw.contentData || raw.storageKey || `CONTENT_${Date.now()}`,
      ...raw,
    };

    const parseResult = DesignVersionCreateSchema.safeParse(versionPayload);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const existingVersions = Array.from(designVersionRepository.values())
      .filter((v) => v.designId === designId)
      .sort((a, b) => b.versionNumber - a.versionNumber);

    const latestVersion = existingVersions[0];
    if (latestVersion && parseResult.data.versionNumber <= latestVersion.versionNumber) {
      throw new HttpException(
        { message: 'VERSION_NUMBER_MUST_BE_GREATER_THAN_PREVIOUS' },
        HttpStatus.BAD_REQUEST
      );
    }

    const userId = (req as any).userId || 'usr-designer-1';
    const userName = (req as any).userName || 'Design Lead';
    const contentHash = DesignReleaseEngine.computeVersionHash(parseResult.data.contentData);
    const versionId = `ver-${designId}-v${parseResult.data.versionNumber}`;
    const revisionCode = parseResult.data.revisionCode || `Rev ${String.fromCharCode(64 + parseResult.data.versionNumber)}`;

    // Invariant (AT-034): New revision strictly has NO inherited fabrication approval
    const newVersion: StoredDesignVersion = {
      versionId,
      designId,
      organisationId: orgId,
      versionNumber: parseResult.data.versionNumber,
      revisionCode,
      contentHash,
      storageKey: parseResult.data.storageKey,
      title: parseResult.data.title,
      titleAr: parseResult.data.titleAr,
      revisionDescription: parseResult.data.revisionDescription,
      uploadedAt: new Date(),
      uploadedBy: userId,
      purpose: parseResult.data.purpose as ReleasePurpose,
      isLocked: false,
      addressedCommentIds: parseResult.data.addressedCommentIds || [],
      carriedForwardCommentIds: parseResult.data.carriedForwardCommentIds || [],
      rejectedCommentIds: parseResult.data.rejectedCommentIds || [],
      costImpactFlag: parseResult.data.costImpactFlag || false,
      scheduleImpactFlag: parseResult.data.scheduleImpactFlag || false,
      scopeImpactFlag: parseResult.data.scopeImpactFlag || false,
      safetyImpactFlag: parseResult.data.safetyImpactFlag || false,
      procurementImpactFlag: parseResult.data.procurementImpactFlag || false,
      fabricationApproval: undefined, // Strictly reset
    };

    designVersionRepository.set(versionId, newVersion);

    // Update parent design item latest revision and status
    design.currentVersionNumber = newVersion.versionNumber;
    design.currentRevisionCode = revisionCode;
    design.revisions.push({
      revisionCode,
      versionNumber: newVersion.versionNumber,
      contentHash,
      storageUrl: newVersion.storageKey,
      uploadedBy: userName,
      uploadedAt: new Date().toISOString(),
      notes: parseResult.data.revisionDescription,
      releaseStatus: 'internal_review',
    });
    design.currentStatus = 'internal_review';
    design.updatedAt = new Date().toISOString();
    designRepository.set(designId, design);

    return {
      data: {
        id: versionId,
        status: 'uploaded',
        recordVersion: newVersion.versionNumber,
        payload: newVersion,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-ver',
      },
    };
  }

  @Post(':designId/release')
  releaseDesign(
    @Param('projectId') projectId: string,
    @Param('designId') designId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredDesignVersion> {
    const parseResult = DesignReleaseSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const design = designRepository.get(designId);
    if (!design || design.organisationId !== orgId || design.projectId !== projectId) {
      throw new HttpException({ message: 'DESIGN_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const version = designVersionRepository.get(parseResult.data.versionId);
    if (!version || version.organisationId !== orgId || version.designId !== designId) {
      throw new HttpException({ message: 'DESIGN_VERSION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    version.purpose = parseResult.data.purpose as ReleasePurpose;
    if (version.purpose === 'for_fabrication' || (version.purpose as string) === 'for_production') {
      version.fabricationApproval = {
        approvedAt: new Date(),
        approvedBy: parseResult.data.approverId,
        approvalHash: parseResult.data.approvalHash,
      };
      version.isLocked = true;
      design.currentStatus = 'approved_for_production';
    }

    designVersionRepository.set(version.versionId, version);
    designRepository.set(designId, design);

    return {
      data: {
        id: version.versionId,
        status: `released_${version.purpose}`,
        recordVersion: version.versionNumber,
        payload: version,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-release',
      },
    };
  }

  @Get(':designId/compare')
  compareVersions(
    @Param('projectId') projectId: string,
    @Param('designId') designId: string,
    @Query('v1') v1Str: string,
    @Query('v2') v2Str: string,
    @Req() req: Request
  ): {
    designId: string;
    version1: any;
    version2: any;
    deltaSummary: {
      revisionCodeFrom: string;
      revisionCodeTo: string;
      hashDifference: boolean;
      addressedCommentsCount: number;
      carriedForwardCommentsCount: number;
      hasCommercialImpact: boolean;
      hasScheduleImpact: boolean;
    };
  } {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const design = designRepository.get(designId);
    if (!design || design.projectId !== projectId || design.organisationId !== orgId) {
      throw new HttpException({ message: 'DESIGN_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const v1Num = parseInt(v1Str, 10) || 1;
    const v2Num = parseInt(v2Str, 10) || 2;

    const allVersions = Array.from(designVersionRepository.values()).filter((v) => v.designId === designId);
    const ver1 = allVersions.find((v) => v.versionNumber === v1Num) || design.revisions.find((r) => r.versionNumber === v1Num);
    const ver2 = allVersions.find((v) => v.versionNumber === v2Num) || design.revisions.find((r) => r.versionNumber === v2Num);

    if (!ver1 || !ver2) {
      throw new HttpException({ message: 'VERSIONS_NOT_FOUND_FOR_COMPARISON' }, HttpStatus.NOT_FOUND);
    }

    return {
      designId,
      version1: ver1,
      version2: ver2,
      deltaSummary: {
        revisionCodeFrom: (ver1 as any).revisionCode || `Rev ${v1Num}`,
        revisionCodeTo: (ver2 as any).revisionCode || `Rev ${v2Num}`,
        hashDifference: (ver1 as any).contentHash !== (ver2 as any).contentHash,
        addressedCommentsCount: (ver2 as any).addressedCommentIds?.length || 0,
        carriedForwardCommentsCount: (ver2 as any).carriedForwardCommentIds?.length || 0,
        hasCommercialImpact: (ver2 as any).costImpactFlag || false,
        hasScheduleImpact: (ver2 as any).scheduleImpactFlag || false,
      },
    };
  }

  // =========================================================================
  // 4. ANNOTATIONS & COMMENTS
  // =========================================================================

  @Get(':designId/annotations')
  listAnnotations(
    @Param('projectId') _projectId: string,
    @Param('designId') designId: string,
    @Req() req: Request
  ): StoredDesignAnnotation[] {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const userRole = (req as any).userRole || 'super_admin';
    const isClient = userRole === 'client' || userRole === 'client_user';

    const annots = Array.from(designAnnotationRepository.values()).filter(
      (a) => a.organisationId === orgId && (a as any).designId === designId
    );

    if (isClient) {
      // Strictly exclude internal-only annotations and internal-only comments
      return annots
        .filter((a) => a.visibility !== 'internal_only')
        .map((a) => ({
          ...a,
          comments: a.comments.filter((c) => c.visibility !== 'internal_only'),
        }));
    }

    return annots;
  }

  @Post(':designId/annotations')
  @UseGuards(IdempotencyGuard)
  addAnnotation(
    @Param('projectId') projectId: string,
    @Param('designId') designId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredDesignAnnotation> {
    const raw = (body as any) || {};
    const normGeom = raw.geometryType === 'pin' ? 'point' : raw.geometryType;
    const normCommentType = raw.commentType === 'clash_conflict' ? 'technical_concern' : raw.commentType;
    const normalizedBody = {
      ...raw,
      geometryType: normGeom || 'point',
      commentType: normCommentType || 'general_comment',
      message: raw.message || raw.comment || 'Review markup note',
      title: raw.title || 'Review Pin',
    };

    const threadParse = DesignCommentThreadCreateSchema.safeParse(normalizedBody);
    const simpleParse = DesignAnnotationSchema.safeParse(normalizedBody);

    if (!threadParse.success && !simpleParse.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: threadParse.error?.errors || simpleParse.error?.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const design = designRepository.get(designId);
    if (!design || design.organisationId !== orgId || design.projectId !== projectId) {
      throw new HttpException({ message: 'DESIGN_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const annotId = `annot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const userId = (req as any).userId || 'usr-reviewer';
    const userName = (req as any).userName || 'Design Reviewer';

    const count = Array.from(designAnnotationRepository.values()).filter(
      (a) => (a as any).designId === designId
    ).length + 1;

    let annot: StoredDesignAnnotation;

    if (threadParse.success) {
      const d = threadParse.data;
      annot = {
        id: annotId,
        versionId: d.versionId,
        organisationId: orgId,
        authorId: userId,
        authorName: userName,
        pinNumber: d.pinNumber || count,
        pageNumber: d.pageNumber,
        xPercent: d.xPercent,
        yPercent: d.yPercent,
        videoTimestampSec: d.videoTimestampSec,
        threeDCoordinates: d.threeDCoordinates,
        geometryType: d.geometryType,
        geometryData: d.geometryData || {},
        title: d.title,
        discipline: d.discipline,
        priority: d.priority,
        status: 'open',
        commentType: d.commentType,
        visibility: d.visibility,
        assigneeId: d.assigneeId,
        assigneeName: d.assigneeName,
        dueDate: d.dueDate,
        coordinates: { x: d.xPercent, y: d.yPercent },
        comment: d.message,
        comments: [
          {
            id: `comm-${Date.now()}`,
            authorId: userId,
            authorName: userName,
            discipline: d.discipline,
            message: d.message,
            visibility: d.visibility,
            attachments: d.attachments || [],
            createdAt: now,
          },
        ],
        resolved: false,
        createdAt: new Date(),
      };
    } else {
      const d = simpleParse.data!;
      annot = {
        id: annotId,
        versionId: d.versionId,
        organisationId: orgId,
        authorId: userId,
        authorName: userName,
        pinNumber: count,
        pageNumber: d.pageNumber,
        xPercent: d.coordinates.x,
        yPercent: d.coordinates.y,
        geometryType: (d.coordinates as any).geometryType || 'point',
        geometryData: (d.coordinates as any).geometryData || {},
        title: 'Review Note',
        discipline: 'staging',
        priority: d.priority || 'medium',
        status: 'open',
        commentType: d.commentType || 'general_comment',
        visibility: d.visibility || 'internal_only',
        assigneeName: d.assigneeName,
        assigneeId: d.assigneeId,
        dueDate: d.dueDate,
        coordinates: d.coordinates,
        comment: d.comment,
        comments: [
          {
            id: `comm-${Date.now()}`,
            authorId: userId,
            authorName: userName,
            message: d.comment,
            visibility: d.visibility || 'internal_only',
            attachments: [],
            createdAt: now,
          },
        ],
        resolved: false,
        createdAt: new Date(),
      };
    }

    (annot as any).designId = designId;
    designAnnotationRepository.set(annotId, annot);

    // Also link into parent design.pins
    design.pins.push({
      id: annot.id,
      pinNumber: annot.pinNumber,
      revisionCode: design.currentRevisionCode,
      xPercent: Number(annot.xPercent),
      yPercent: Number(annot.yPercent),
      title: annot.title,
      discipline: annot.discipline,
      priority: annot.priority as any,
      status: annot.status as any,
      assigneeName: annot.assigneeName,
      visibility: annot.visibility,
      comments: annot.comments.map((c) => ({
        id: c.id,
        authorId: c.authorId,
        authorName: c.authorName,
        discipline: c.discipline || 'staging',
        message: c.message,
        visibility: c.visibility,
        createdAt: c.createdAt,
      })),
      createdAt: now,
    } as any);
    designRepository.set(designId, design);

    return {
      data: {
        id: annotId,
        status: 'created',
        recordVersion: 1,
        payload: annot,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-annot',
      },
    };
  }

  @Get(':designId/annotations/:annotationId')
  getAnnotation(
    @Param('projectId') _projectId: string,
    @Param('designId') _designId: string,
    @Param('annotationId') annotationId: string,
    @Req() req: Request
  ): StoredDesignAnnotation {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const annot = designAnnotationRepository.get(annotationId);
    if (!annot || annot.organisationId !== orgId) {
      throw new HttpException({ message: 'ANNOTATION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }
    return annot;
  }

  @Post(':designId/annotations/:annotationId/reply')
  @UseGuards(IdempotencyGuard)
  replyComment(
    @Param('projectId') _projectId: string,
    @Param('designId') _designId: string,
    @Param('annotationId') annotationId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<any> {
    const parseResult = DesignCommentReplySchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const annot = designAnnotationRepository.get(annotationId);
    if (!annot || annot.organisationId !== orgId) {
      throw new HttpException({ message: 'ANNOTATION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const commentId = `comm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const userId = (req as any).userId || 'usr-user';
    const userName = (req as any).userName || 'Review Participant';

    const newComment = {
      id: commentId,
      authorId: userId,
      authorName: userName,
      message: parseResult.data.message,
      visibility: parseResult.data.visibility || annot.visibility,
      attachments: parseResult.data.attachments || [],
      createdAt: now,
    };

    annot.comments.push(newComment);

    if (parseResult.data.statusChange) {
      annot.status = parseResult.data.statusChange;
      if (parseResult.data.statusChange === 'resolved') {
        annot.resolved = true;
        annot.resolvedAt = now;
        annot.resolvedBy = userId;
        annot.resolutionEvidence = parseResult.data.resolutionEvidence;
      }
    }

    designAnnotationRepository.set(annotationId, annot);

    const parentDesignId = (annot as any).designId;
    if (parentDesignId) {
      const parentDesign = designRepository.get(parentDesignId);
      if (parentDesign) {
        const pin = parentDesign.pins.find((p) => p.id === annotationId);
        if (pin) {
          pin.comments.push({
            id: newComment.id,
            authorId: newComment.authorId,
            authorName: newComment.authorName,
            discipline: (annot.discipline as any) || 'staging',
            message: newComment.message,
            visibility: newComment.visibility,
            createdAt: newComment.createdAt,
          } as any);
          if (parseResult.data.statusChange) {
            pin.status = parseResult.data.statusChange as any;
          }
          designRepository.set(parentDesignId, parentDesign);
        }
      }
    }

    return {
      data: {
        id: commentId,
        status: 'replied',
        recordVersion: annot.comments.length,
        payload: annot,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-reply',
      },
    };
  }

  // =========================================================================
  // 5. REVIEW ROUNDS
  // =========================================================================

  @Get(':designId/review-rounds')
  listReviewRounds(
    @Param('projectId') _projectId: string,
    @Param('designId') designId: string,
    @Req() req: Request
  ): StoredReviewRound[] {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    return Array.from(reviewRoundRepository.values()).filter(
      (r) => r.designItemId === designId && r.organisationId === orgId
    );
  }

  @Post(':designId/review-rounds')
  @UseGuards(IdempotencyGuard)
  createReviewRound(
    @Param('projectId') _projectId: string,
    @Param('designId') designId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredReviewRound> {
    const parseResult = DesignReviewRoundCreateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const roundId = `rr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const round: StoredReviewRound = {
      id: roundId,
      designItemId: designId,
      versionId: parseResult.data.versionId,
      organisationId: orgId,
      purpose: parseResult.data.purpose,
      reviewers: parseResult.data.reviewers.map((r) => ({
        ...r,
        responded: false,
      })),
      startDate: parseResult.data.startDate,
      dueDate: parseResult.data.dueDate,
      instructions: parseResult.data.instructions,
      status: 'open',
      isLate: new Date(parseResult.data.dueDate) < new Date(),
      createdAt: now,
    };

    reviewRoundRepository.set(roundId, round);

    return {
      data: {
        id: roundId,
        status: 'scheduled',
        recordVersion: 1,
        payload: round,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-round',
      },
    };
  }

  // =========================================================================
  // 6. FORMAL APPROVALS (POL-DES-01 & AT-034 LOCKING INVARIANTS)
  // =========================================================================

  @Post(':designId/approvals')
  @UseGuards(IdempotencyGuard)
  submitApproval(
    @Param('projectId') projectId: string,
    @Param('designId') designId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredApprovalRecord> {
    const parseResult = DesignApprovalSubmitSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const design = designRepository.get(designId);
    if (!design || design.organisationId !== orgId || design.projectId !== projectId) {
      throw new HttpException({ message: 'DESIGN_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const version = designVersionRepository.get(parseResult.data.versionId);
    if (!version && !design.revisions.some((r) => `ver-${designId}-v${r.versionNumber}` === parseResult.data.versionId)) {
      throw new HttpException({ message: 'VERSION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // POL-DES-01 Invariant Enforcement: Fabrication or Production requires certified structural & safety sign-offs
    if (
      parseResult.data.decision === 'approve' &&
      (parseResult.data.approvalPurpose === 'approved_for_fabrication' ||
        parseResult.data.approvalPurpose === 'approved_for_production')
    ) {
      const certData = {
        revisionCode: design.currentRevisionCode,
        versionNumber: design.currentVersionNumber,
        contentHash: version?.contentHash || safeSha256('CONTENT'),
        storageUrl: version?.storageKey || 'designs/active.pdf',
        uploadedBy: version?.uploadedBy || 'Lead',
        uploadedAt: new Date().toISOString(),
        releaseStatus: 'approved_for_production' as const,
        structuralEngineerSignoff: parseResult.data.structuralCertification?.certified
          ? {
              certified: true,
              certifiedBy: parseResult.data.structuralCertification.engineerName,
              certifiedAt: new Date().toISOString(),
              licenseNumber: parseResult.data.structuralCertification.licenseNumber,
            }
          : version?.structuralEngineerSignoff,
        hseSignoff: parseResult.data.hseCertification?.certified
          ? {
              certified: true,
              certifiedBy: parseResult.data.hseCertification.inspectorName,
              certifiedAt: new Date().toISOString(),
            }
          : version?.hseSignoff,
      };

      const gateEval = ProductionReleaseGate.evaluateProductionRelease(certData, 'approved_for_production');
      if (!gateEval.allowed) {
        throw new HttpException(
          { message: gateEval.reason, missingSignoffs: gateEval.missingSignoffs },
          HttpStatus.FORBIDDEN
        );
      }
    }

    const approvalId = `appr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const userId = (req as any).userId || 'usr-approver';
    const userName = (req as any).userName || 'Authorized Approver';
    const userRole = (req as any).userRole || 'executive';

    const approval: StoredApprovalRecord = {
      id: approvalId,
      designItemId: designId,
      versionId: parseResult.data.versionId,
      versionNumber: design.currentVersionNumber,
      revisionCode: design.currentRevisionCode,
      organisationId: orgId,
      approverId: userId,
      approverName: userName,
      organization: 'E3 Governance Committee',
      role: userRole,
      decision: parseResult.data.decision,
      approvalPurpose: parseResult.data.approvalPurpose,
      comments: parseResult.data.comments,
      conditions: parseResult.data.conditions || [],
      digitalAcknowledgement: parseResult.data.digitalAcknowledgement,
      contentHash: version?.contentHash || safeSha256(`APPROVE_${approvalId}`),
      locked: parseResult.data.decision === 'approve', // Approved version is LOCKED!
      createdAt: now,
    };

    approvalRecordRepository.set(approvalId, approval);

    // If approved, update design status and lock version
    if (parseResult.data.decision === 'approve') {
      if (parseResult.data.approvalPurpose === 'approved_for_production' || parseResult.data.approvalPurpose === 'approved_for_fabrication') {
        design.currentStatus = 'approved_for_production';
      } else if (parseResult.data.approvalPurpose === 'approved_as_concept') {
        design.currentStatus = 'internally_approved';
      } else {
        design.currentStatus = 'client_approved';
      }
      if (version) version.isLocked = true;
    } else if (parseResult.data.decision === 'request_changes') {
      design.currentStatus = 'internal_changes_required';
    }

    design.updatedAt = now;
    designRepository.set(designId, design);

    return {
      data: {
        id: approvalId,
        status: `decision_${parseResult.data.decision}`,
        recordVersion: design.currentVersionNumber,
        payload: approval,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-appr',
      },
    };
  }

  // =========================================================================
  // 7. CHANGE CONTROL & COMMERCIAL PROTECTION
  // =========================================================================

  @Get(':designId/change-requests')
  listChangeRequests(
    @Param('projectId') _projectId: string,
    @Param('designId') designId: string,
    @Req() req: Request
  ): StoredChangeRequest[] {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    return Array.from(changeRequestRepository.values()).filter(
      (c) => c.designItemId === designId && c.organisationId === orgId
    );
  }

  @Post(':designId/change-requests')
  @UseGuards(IdempotencyGuard)
  createChangeRequest(
    @Param('projectId') projectId: string,
    @Param('designId') designId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredChangeRequest> {
    const raw = (body as any) || {};
    let classification = raw.classification || 'potential_variation';
    if (classification === 'major_scope') classification = 'potential_variation';
    if (classification === 'minor_technical') classification = 'within_agreed_scope';

    const crBody = {
      description: raw.description || raw.title || 'Design change request details',
      ...raw,
      designItemId: raw.designItemId || designId,
      classification,
    };

    const parseResult = DesignChangeRequestCreateSchema.safeParse(crBody);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const changeId = `dcr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const evaluation = ChangeControlClassifier.classifyChange({
      classification: parseResult.data.classification as ChangeClassification,
      estimatedCostDeltaQar: parseResult.data.estimatedCostDeltaQar,
      estimatedScheduleDeltaDays: parseResult.data.estimatedScheduleDeltaDays,
      isClientRequest: (req as any).userRole === 'client',
    });

    const changeRequest: StoredChangeRequest = {
      id: changeId,
      designItemId: designId,
      designVersionId: parseResult.data.designVersionId,
      commentThreadId: parseResult.data.commentThreadId,
      organisationId: orgId,
      title: parseResult.data.title,
      description: parseResult.data.description,
      classification: parseResult.data.classification as ChangeClassification,
      estimatedCostDeltaQar: parseResult.data.estimatedCostDeltaQar,
      estimatedScheduleDeltaDays: parseResult.data.estimatedScheduleDeltaDays,
      affectedRequirementIds: parseResult.data.affectedRequirementIds || [],
      affectedScopePackageIds: parseResult.data.affectedScopePackageIds || [],
      affectedBoqItemIds: parseResult.data.affectedBoqItemIds || [],
      affectedTaskIds: parseResult.data.affectedTaskIds || [],
      escalateToVariation: parseResult.data.escalateToVariation || evaluation.requiresVariation,
      linkedVariationId: evaluation.requiresVariation ? `VAR-${projectId.slice(0, 5).toUpperCase()}-${++varSeq}` : undefined,
      status: evaluation.requiresVariation ? 'under_pm_review' : 'submitted',
      createdAt: now,
    };

    changeRequestRepository.set(changeId, changeRequest);

    return {
      data: {
        id: changeId,
        status: changeRequest.status,
        recordVersion: 1,
        payload: changeRequest,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-dcr',
      },
    };
  }

  // =========================================================================
  // 8. PRODUCTION RELEASES & ADOPTION
  // =========================================================================

  @Get(':designId/releases')
  listReleases(
    @Param('projectId') _projectId: string,
    @Param('designId') designId: string,
    @Req() req: Request
  ): StoredReleaseRecord[] {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    return Array.from(releaseRepository.values()).filter(
      (r) => r.designItemId === designId && r.organisationId === orgId
    );
  }

  @Post(':designId/releases')
  @UseGuards(IdempotencyGuard)
  issueRelease(
    @Param('projectId') projectId: string,
    @Param('designId') designId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredReleaseRecord> {
    const raw = (body as any) || {};
    let purpose = raw.releasePurpose || 'for_fabrication';
    if (purpose === 'approved_for_fabrication') purpose = 'for_fabrication';
    if (purpose === 'approved_for_production') purpose = 'for_production';

    const recipients = (raw.recipients || []).map((r: any, idx: number) => ({
      recipientId: r.recipientId || `rec-${idx + 1}`,
      recipientName: r.recipientName || 'Recipient',
      organization: r.organization || 'Organization',
      role: r.role || 'fabricator',
      ...(r.email ? { email: r.email } : {}),
    }));

    const releaseBody = {
      requiredAcknowledgementDate: raw.requiredAcknowledgementDate || new Date(Date.now() + 86400000 * 3).toISOString(),
      ...raw,
      releasePurpose: purpose,
      recipients,
    };

    const parseResult = DesignReleaseIssueSchema.safeParse(releaseBody);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const design = designRepository.get(designId);
    if (!design || design.organisationId !== orgId || design.projectId !== projectId) {
      throw new HttpException({ message: 'DESIGN_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // Check for earlier active releases and evaluate superseded warnings
    const priorReleases = Array.from(releaseRepository.values()).filter(
      (r) => r.designItemId === designId && r.status === 'active'
    );

    for (const prior of priorReleases) {
      prior.status = 'superseded';
      releaseRepository.set(prior.id, prior);
    }

    const releaseId = `rel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const releaseNumber = `REL-${projectId.slice(0, 5).toUpperCase()}-${++releaseSeq}`;
    const now = new Date().toISOString();
    const userName = (req as any).userName || 'Lead Project Manager';

    const release: StoredReleaseRecord = {
      id: releaseId,
      releaseNumber,
      designItemId: designId,
      designVersionId: parseResult.data.designVersionId,
      versionNumber: design.currentVersionNumber,
      revisionCode: design.currentRevisionCode,
      organisationId: orgId,
      releasePurpose: parseResult.data.releasePurpose,
      issuedBy: userName,
      issuedAt: now,
      requiredAcknowledgementDate: parseResult.data.requiredAcknowledgementDate,
      notes: parseResult.data.notes,
      materialsAndFinishesNotes: parseResult.data.materialsAndFinishesNotes,
      fabricationNotes: parseResult.data.fabricationNotes,
      installationNotes: parseResult.data.installationNotes,
      status: 'active',
      recipients: parseResult.data.recipients.map((r, idx) => ({
        ...r,
        recipientId: r.recipientId || `rec-${idx + 1}`,
        adoptionStatus: 'clarification_required' as AdoptionStatus,
        productionStarted: false,
      })),
      includedFileIds: parseResult.data.includedFileIds || [],
    };

    releaseRepository.set(releaseId, release);

    return {
      data: {
        id: releaseId,
        status: 'issued',
        recordVersion: release.versionNumber,
        payload: release,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-rel',
      },
    };
  }

  @Post(':designId/releases/:releaseId/acknowledge')
  acknowledgeAdoption(
    @Param('projectId') _projectId: string,
    @Param('designId') _designId: string,
    @Param('releaseId') releaseId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<any> {
    const raw = typeof body === 'object' && body !== null ? { ...(body as Record<string, any>) } : {};
    if (!raw.releaseId) {
      raw.releaseId = releaseId;
    }
    const parseResult = DesignAdoptionAcknowledgeSchema.safeParse(raw);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const release = releaseRepository.get(releaseId);
    if (!release || release.organisationId !== orgId) {
      throw new HttpException({ message: 'RELEASE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const now = new Date().toISOString();
    const ackName = parseResult.data.acknowledgerName;

    const recipient = release.recipients.find((r) => r.recipientName === ackName || r.organization.includes(ackName)) || release.recipients[0];
    if (recipient) {
      recipient.adoptionStatus = parseResult.data.response;
      recipient.acknowledgedAt = now;
      recipient.notes = parseResult.data.notes;
      if (parseResult.data.response === 'production_started') {
        recipient.productionStarted = true;
        recipient.productionStartDate = parseResult.data.productionStartDate || now;
      }
    }

    releaseRepository.set(releaseId, release);

    return {
      data: {
        id: releaseId,
        status: `acknowledged_${parseResult.data.response}`,
        recordVersion: release.versionNumber,
        payload: release,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-ack',
      },
    };
  }

  // =========================================================================
  // 9. EXTERNAL SHARE LINKS
  // =========================================================================

  @Post(':designId/external-shares')
  @UseGuards(IdempotencyGuard)
  createExternalShare(
    @Param('projectId') _projectId: string,
    @Param('designId') designId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredExternalShare> {
    const raw = (body as any) || {};
    const sharePayload = {
      designItemId: raw.designItemId || designId,
      ...raw,
    };

    const parseResult = DesignExternalShareCreateSchema.safeParse(sharePayload);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const shareId = `share-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const shareToken = `eos_share_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const now = new Date().toISOString();

    const share: StoredExternalShare = {
      id: shareId,
      shareToken,
      designItemId: designId,
      designVersionId: parseResult.data.designVersionId,
      organisationId: orgId,
      recipientName: parseResult.data.recipientName,
      recipientEmail: parseResult.data.recipientEmail,
      expiresAt: parseResult.data.expiresAt,
      requireOtp: parseResult.data.requireOtp,
      otpHash: parseResult.data.requireOtp ? safeSha256('123456') : undefined, // Test fixture OTP 123456
      canView: parseResult.data.canView,
      canComment: parseResult.data.canComment,
      canApprove: parseResult.data.canApprove,
      canDownload: parseResult.data.canDownload,
      watermarkText: parseResult.data.watermarkText || `${parseResult.data.recipientEmail} • EOS Confidential`,
      accessCount: 0,
      isRevoked: false,
      createdAt: now,
    };

    externalShareRepository.set(shareId, share);

    return {
      data: {
        id: shareId,
        status: 'generated',
        recordVersion: 1,
        payload: share,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-share',
      },
    };
  }

  // =========================================================================
  // 10. REGISTERS & DASHBOARD KPIS
  // =========================================================================

  @Get('overview/kpis')
  getOverviewKpis(
    @Param('projectId') projectId: string,
    @Req() req: Request
  ) {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const designs = Array.from(designRepository.values()).filter(
      (d) => d.projectId === projectId && d.organisationId === orgId && !d.isArchived
    );

    const total = designs.length;
    const drafts = designs.filter((d) => d.currentStatus === 'draft').length;
    const awaitingInternal = designs.filter((d) => d.currentStatus === 'ready_for_internal_review' || d.currentStatus === 'internal_review').length;
    const awaitingClient = designs.filter((d) => d.currentStatus === 'ready_for_client_review' || d.currentStatus === 'client_review').length;
    const changesRequested = designs.filter((d) => d.currentStatus === 'internal_changes_required' || d.currentStatus === 'client_changes_required').length;
    const approved = designs.filter((d) => d.currentStatus === 'client_approved' || d.currentStatus === 'internally_approved').length;
    const approvedForProduction = designs.filter((d) => d.currentStatus === 'approved_for_production').length;

    const annotations = Array.from(designAnnotationRepository.values()).filter((a) => a.organisationId === orgId);
    const unresolvedComments = annotations.filter((a) => a.status === 'open' || a.status === 'in_progress').length;

    const releases = Array.from(releaseRepository.values()).filter((r) => r.organisationId === orgId);
    let pendingAdoptions = 0;
    for (const rel of releases) {
      pendingAdoptions += rel.recipients.filter((r) => r.adoptionStatus !== 'adopted' && r.adoptionStatus !== 'production_started').length;
    }

    if (this.dbService) {
      // Database connection available for background syncing
    }

    return {
      totalDesigns: total,
      drafts,
      awaitingInternalReview: awaitingInternal,
      awaitingClientReview: awaitingClient,
      changesRequested,
      approved,
      approvedForProduction,
      unresolvedComments,
      releasesAwaitingAcknowledgement: pendingAdoptions,
      overdueReviews: 0,
    };
  }

  @Get('registers/design-register')
  getDesignRegister(
    @Param('projectId') projectId: string,
    @Req() req: Request
  ) {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    return Array.from(designRepository.values())
      .filter((d) => d.projectId === projectId && d.organisationId === orgId)
      .map((d) => ({
        designId: d.id,
        title: d.title,
        discipline: d.discipline,
        department: d.department,
        assetType: d.assetType,
        currentRevisionCode: d.currentRevisionCode,
        currentStatus: d.currentStatus,
        ownerName: d.ownerName,
        zones: d.zones,
        locations: d.locations,
        requirementIds: d.requirementIds,
        boqItemIds: d.boqItemIds,
        productionPackageIds: d.productionPackageIds,
        updatedAt: d.updatedAt,
      }));
  }

  @Get('registers/revision-register')
  getRevisionRegister(
    @Param('projectId') projectId: string,
    @Req() req: Request
  ) {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const designs = Array.from(designRepository.values()).filter(
      (d) => d.projectId === projectId && d.organisationId === orgId
    );

    const revisions: any[] = [];
    for (const d of designs) {
      for (const rev of d.revisions) {
        revisions.push({
          designId: d.id,
          designTitle: d.title,
          revisionCode: rev.revisionCode,
          versionNumber: rev.versionNumber,
          contentHash: rev.contentHash,
          uploadedBy: rev.uploadedBy,
          uploadedAt: rev.uploadedAt,
          releaseStatus: rev.releaseStatus,
          notes: rev.notes,
        });
      }
    }
    return revisions;
  }
}
