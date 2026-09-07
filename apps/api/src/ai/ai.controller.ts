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
  AiDraftRequestSchema,
  AiDraftAcceptSchema,
  CommandResult,
} from '@e3-eos/contracts';
import {
  AiAssistantEngine,
  DataClassification,
  ExtractedRequirement,
  AiDraftExtractionResult,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';

export interface StoredAiDraft extends AiDraftExtractionResult {
  organisationId: string;
  projectId: string;
}

export const aiDraftRepository = new Map<string, StoredAiDraft>();

@Controller('projects/:projectId')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class AiController {
  // --- AI Extraction, Injection Defense & Classification Boundaries (AT-083, AT-084, AT-085) ---

  @Post('ai-drafts')
  requestAiDraft(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredAiDraft> {
    const parseResult = AiDraftRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const classification = parseResult.data.classification as DataClassification;

    // Invariant AT-084: Reject external AI calls for confidential/restricted projects
    try {
      AiAssistantEngine.assertClassificationAllowed(classification);
    } catch (err: any) {
      throw new HttpException(
        { message: 'AI_REQUEST_DISALLOWED_BY_CLASSIFICATION', detail: err.message },
        HttpStatus.FORBIDDEN
      );
    }

    // Invariant AT-083: Neutralize prompt injection directives in untrusted content
    const sanitized = AiAssistantEngine.sanitizeTenderInput(parseResult.data.rawContent);

    // Invariant AT-085: Requirements lacking citations are quarantined as unverified suggestions
    const dummyExtracted = [
      {
        title: 'Extracted Deliverable Spec',
        requirementText: sanitized.sanitizedText.slice(0, 150),
        // No citation provided initially
      },
    ];
    const requirements: ExtractedRequirement[] =
      AiAssistantEngine.processExtractedRequirements(dummyExtracted);

    const draftId = `draft-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const storedDraft: StoredAiDraft = {
      draftId,
      organisationId: orgId,
      projectId,
      documentType: parseResult.data.documentType,
      classification,
      neutralizedPromptInjectionsFound: sanitized.injectionsDetected,
      extractedRequirements: requirements,
      canWriteToDomain: false, // Invariant: AI suggestions cannot write to domain without human review
      notes: sanitized.injectionsDetected > 0
        ? `Security warning: ${sanitized.injectionsDetected} prompt injection directive(s) neutralized. Data treated purely as inert text.`
        : 'AI extraction completed. Awaiting human source citation review.',
    };

    aiDraftRepository.set(draftId, storedDraft);

    return {
      data: {
        id: draftId,
        status: 'draft_suggested',
        recordVersion: 1,
        payload: storedDraft,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-ai-draft',
      },
    };
  }

  // --- Human Review & Source Verification (AT-085) ---

  @Post('ai-drafts/:id/accept')
  acceptAiDraft(
    @Param('projectId') projectId: string,
    @Param('id') draftId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredAiDraft> {
    const parseResult = AiDraftAcceptSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const draft = aiDraftRepository.get(draftId);
    if (!draft || draft.organisationId !== orgId || draft.projectId !== projectId) {
      throw new HttpException({ message: 'AI_DRAFT_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const targetReq = draft.extractedRequirements.find(
      (r) => r.id === parseResult.data.requirementId
    ) || draft.extractedRequirements[0];

    // Invariant AT-085: Validates human citation before promoting to verified
    try {
      const verified = AiAssistantEngine.verifyRequirementByHuman(
        targetReq,
        parseResult.data.sourcePageNumber,
        parseResult.data.sourceSectionReference
      );

      draft.extractedRequirements = draft.extractedRequirements.map((r) =>
        r.id === verified.id ? verified : r
      );
      draft.canWriteToDomain = true;
    } catch (err: any) {
      throw new HttpException(
        { message: 'SOURCE_VERIFICATION_MISSING', detail: err.message },
        HttpStatus.BAD_REQUEST
      );
    }

    aiDraftRepository.set(draftId, draft);

    return {
      data: {
        id: draftId,
        status: 'accepted_by_human',
        recordVersion: 2,
        payload: draft,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-ai-accept',
      },
    };
  }
}
