import {
  Controller,
  Post,
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
  DesignCreateSchema,
  DesignVersionCreateSchema,
  DesignReleaseSchema,
  DesignAnnotationSchema,
  CommandResult,
} from '@e3-eos/contracts';
import {
  DesignReleaseEngine,
  DesignVersion,
  DesignAnnotation,
  ReleasePurpose,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { IdempotencyGuard } from '../common/idempotency.guard.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { projectRepository } from '../projects/projects.controller.js';

export interface StoredDesign {
  id: string;
  organisationId: string;
  projectId: string;
  title: string;
  titleAr?: string;
  category: string;
  createdAt: string;
}

export interface StoredDesignVersion extends DesignVersion {
  organisationId: string;
  purpose: ReleasePurpose;
}

export interface StoredDesignAnnotation extends DesignAnnotation {
  organisationId: string;
}

export const designRepository = new Map<string, StoredDesign>();
export const designVersionRepository = new Map<string, StoredDesignVersion>();
export const designAnnotationRepository = new Map<string, StoredDesignAnnotation>();

@Controller('projects/:projectId/designs')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class DesignsController {
  @Post()
  @UseGuards(IdempotencyGuard)
  createDesign(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredDesign> {
    const parseResult = DesignCreateSchema.safeParse(body);
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

    const designId = `des-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const design: StoredDesign = {
      id: designId,
      organisationId: orgId,
      projectId,
      title: parseResult.data.title,
      titleAr: parseResult.data.titleAr,
      category: parseResult.data.category,
      createdAt: new Date().toISOString(),
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

  @Post(':designId/versions')
  @UseGuards(IdempotencyGuard)
  createVersion(
    @Param('projectId') projectId: string,
    @Param('designId') designId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredDesignVersion> {
    const parseResult = DesignVersionCreateSchema.safeParse(body);
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

    const existingVersions = Array.from(designVersionRepository.values())
      .filter((v) => v.designId === designId)
      .sort((a, b) => b.versionNumber - a.versionNumber);

    const latestVersion = existingVersions[0];
    const userId = (req as any).userId || 'usr-designer-1';
    const contentHash = DesignReleaseEngine.computeVersionHash(parseResult.data.contentData);
    const versionId = `ver-${designId}-v${parseResult.data.versionNumber}`;

    // Invariant (AT-034): New revision strictly has NO inherited fabrication approval
    const newVersion: StoredDesignVersion = {
      versionId,
      designId,
      organisationId: orgId,
      versionNumber: parseResult.data.versionNumber,
      contentHash,
      storageKey: parseResult.data.storageKey,
      title: parseResult.data.title,
      titleAr: parseResult.data.titleAr,
      uploadedAt: new Date(),
      uploadedBy: userId,
      purpose: parseResult.data.purpose as ReleasePurpose,
      fabricationApproval: undefined, // Explicitly no inherited approval
    };

    if (latestVersion && parseResult.data.versionNumber <= latestVersion.versionNumber) {
      throw new HttpException(
        { message: 'VERSION_NUMBER_MUST_BE_GREATER_THAN_PREVIOUS' },
        HttpStatus.BAD_REQUEST
      );
    }

    designVersionRepository.set(versionId, newVersion);

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
    if (version.purpose === 'for_fabrication') {
      version.fabricationApproval = {
        approvedAt: new Date(),
        approvedBy: parseResult.data.approverId,
        approvalHash: parseResult.data.approvalHash,
      };
    }

    designVersionRepository.set(version.versionId, version);

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

  @Post(':designId/annotations')
  addAnnotation(
    @Param('projectId') projectId: string,
    @Param('designId') designId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredDesignAnnotation> {
    const parseResult = DesignAnnotationSchema.safeParse(body);
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

    const annotId = `annot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const annot: StoredDesignAnnotation = {
      id: annotId,
      versionId: version.versionId,
      organisationId: orgId,
      authorId: (req as any).userId || 'usr-reviewer',
      authorName: (req as any).userName || 'Design Reviewer',
      pageNumber: parseResult.data.pageNumber,
      coordinates: parseResult.data.coordinates,
      comment: parseResult.data.comment,
      resolved: false,
      createdAt: new Date(),
    };

    designAnnotationRepository.set(annotId, annot);

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
}
