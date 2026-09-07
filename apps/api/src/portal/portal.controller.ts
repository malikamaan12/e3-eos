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
  PublicationCreateSchema,
  PublicationWithdrawSchema,
  ClientPortalDecisionSchema,
  CommandResult,
} from '@e3-eos/contracts';
import {
  ClientPortalManager,
  PublicationData,
  ClientNativeDecision,
  ClientRoomType,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { IdempotencyGuard } from '../common/idempotency.guard.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { projectRepository } from '../projects/projects.controller.js';

export interface StoredPublication extends PublicationData {
  organisationId: string; // E3 Tenant ID
}

export interface StoredClientDecision extends ClientNativeDecision {
  agencyOrganisationId: string;
}

export const publicationRepository = new Map<string, StoredPublication>();
export const clientDecisionRepository = new Map<string, StoredClientDecision>();

@Controller()
@UseFilters(ProblemDetailsFilter)
export class PortalController {
  // --- Agency Management Endpoints ---

  @Post('projects/:projectId/publications')
  @UseGuards(TenantIsolationGuard, IdempotencyGuard)
  createPublication(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredPublication> {
    const parseResult = PublicationCreateSchema.safeParse(body);
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

    // Compute deterministic hash of client projection
    const targetHash = ClientPortalManager.computePayloadHash(parseResult.data.projectionPayload);
    const pubId = `pub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const publication: StoredPublication = {
      id: pubId,
      organisationId: orgId,
      projectId,
      clientOrganisationId: parseResult.data.clientOrganisationId,
      roomType: parseResult.data.roomType as ClientRoomType,
      title: parseResult.data.title,
      titleAr: parseResult.data.titleAr,
      targetVersionId: parseResult.data.targetVersionId,
      targetHash,
      projectionPayload: parseResult.data.projectionPayload,
      status: 'published',
      publishedAt: new Date(),
    };

    publicationRepository.set(pubId, publication);

    return {
      data: {
        id: pubId,
        status: 'published',
        recordVersion: 1,
        payload: publication,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-pub',
      },
    };
  }

  @Post('projects/:projectId/publications/:publicationId/withdraw')
  @UseGuards(TenantIsolationGuard)
  withdrawPublication(
    @Param('projectId') projectId: string,
    @Param('publicationId') publicationId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredPublication> {
    const parseResult = PublicationWithdrawSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const publication = publicationRepository.get(publicationId);
    if (!publication || publication.organisationId !== orgId || publication.projectId !== projectId) {
      throw new HttpException({ message: 'PUBLICATION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // Invariant (AT-036): Mark publication as withdrawn immediately
    publication.status = 'withdrawn';
    publication.withdrawnAt = new Date();
    publication.withdrawalReason = parseResult.data.reason;
    publicationRepository.set(publicationId, publication);

    return {
      data: {
        id: publicationId,
        status: 'withdrawn',
        recordVersion: 2,
        payload: publication,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-withdraw',
      },
    };
  }

  // --- Client Portal User Endpoints ---

  @Get('portal/projects/:projectId/publications/:publicationId')
  getPublication(
    @Param('projectId') projectId: string,
    @Param('publicationId') publicationId: string,
    @Req() req: Request
  ): CommandResult<any> {
    const clientOrgId = (req as any).organisationId || (req.headers['x-client-org-id'] as string);
    if (!clientOrgId) {
      throw new HttpException({ message: 'CLIENT_AUTHENTICATION_REQUIRED' }, HttpStatus.UNAUTHORIZED);
    }

    const publication = publicationRepository.get(publicationId);
    if (!publication || publication.projectId !== projectId) {
      throw new HttpException({ message: 'PUBLICATION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    try {
      // Invariants AT-001 (tenant isolation) and AT-036 (denies access if withdrawn)
      ClientPortalManager.validatePublicationAccess(publication, clientOrgId);
    } catch (err: any) {
      if (err.message.includes('PUBLICATION_WITHDRAWN')) {
        throw new HttpException(
          {
            type: 'https://e3-eos.io/errors/publication-withdrawn',
            title: 'Publication Withdrawn',
            status: HttpStatus.FORBIDDEN,
            detail: err.message,
          },
          HttpStatus.FORBIDDEN
        );
      }
      throw new HttpException({ message: 'ACCESS_DENIED' }, HttpStatus.NOT_FOUND);
    }

    const acceptLang = (req.headers['accept-language'] as string) || 'en';
    const locale = acceptLang.startsWith('ar') ? 'ar' : 'en';
    const accessibilityMeta = ClientPortalManager.getAccessibilityMetadata(locale, 'published' as any);

    return {
      data: {
        id: publication.id,
        status: publication.status,
        recordVersion: 1,
        payload: {
          title: locale === 'ar' && publication.titleAr ? publication.titleAr : publication.title,
          roomType: publication.roomType,
          targetVersionId: publication.targetVersionId,
          targetHash: publication.targetHash,
          projection: publication.projectionPayload,
          publishedAt: publication.publishedAt,
          accessibility: accessibilityMeta,
        },
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-portal-get',
      },
    };
  }

  @Post('portal/projects/:projectId/decisions')
  recordClientDecision(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<ClientNativeDecision> {
    const parseResult = ClientPortalDecisionSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const clientOrgId = (req as any).organisationId || (req.headers['x-client-org-id'] as string);
    if (!clientOrgId) {
      throw new HttpException({ message: 'CLIENT_AUTHENTICATION_REQUIRED' }, HttpStatus.UNAUTHORIZED);
    }

    const publication = publicationRepository.get(parseResult.data.publicationId);
    if (!publication || publication.projectId !== projectId) {
      throw new HttpException({ message: 'PUBLICATION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    try {
      // Invariants AT-035 (hash check), AT-036 (withdrawn check), and AT-041 (native decision)
      const decision = ClientPortalManager.recordClientDecision({
        publication,
        clientOrgId,
        clientUserId: (req as any).userId || (req.headers['x-user-id'] as string) || 'client-usr-1',
        clientUserName: (req as any).userName || (req.headers['x-user-name'] as string) || 'Authorised Client Representative',
        clientUserEmail: (req as any).userEmail || (req.headers['x-user-email'] as string) || 'client@org.qa',
        decision: parseResult.data.decision,
        suppliedTargetHash: parseResult.data.targetHash,
        comment: parseResult.data.comment,
      });

      const storedDecision: StoredClientDecision = {
        ...decision,
        agencyOrganisationId: publication.organisationId,
      };

      clientDecisionRepository.set(decision.id, storedDecision);

      return {
        data: {
          id: decision.id,
          status: decision.decision,
          recordVersion: 1,
          payload: decision,
        },
        meta: {
          requestId: (req.headers['x-request-id'] as string) || 'req-decision',
        },
      };
    } catch (err: any) {
      if (err.message.includes('TARGET_HASH_MISMATCH')) {
        // AT-035: Rejects without leaking internal draft content
        throw new HttpException(
          {
            type: 'https://e3-eos.io/errors/target-hash-mismatch',
            title: 'Target Hash Mismatch',
            status: HttpStatus.CONFLICT,
            detail: err.message,
          },
          HttpStatus.CONFLICT
        );
      }
      if (err.message.includes('PUBLICATION_WITHDRAWN')) {
        throw new HttpException(
          {
            type: 'https://e3-eos.io/errors/publication-withdrawn',
            title: 'Publication Withdrawn',
            status: HttpStatus.FORBIDDEN,
            detail: err.message,
          },
          HttpStatus.FORBIDDEN
        );
      }
      throw new HttpException({ message: 'DECISION_REJECTED', detail: err.message }, HttpStatus.BAD_REQUEST);
    }
  }
}
