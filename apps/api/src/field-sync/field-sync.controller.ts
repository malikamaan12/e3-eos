import {
  Controller,
  Post,
  Get,
  Patch,
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
  FieldSyncBatchSchema,
  MediaUploadIntentSchema,
  MediaUploadCompleteSchema,
  CommandResult,
} from '@e3-eos/contracts';
import {
  FieldSyncEngine,
  WorkerQualification,
  QueuedFieldOperation,
  OperationSyncResult,
  MediaUploadState,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { IdempotencyGuard } from '../common/idempotency.guard.js';

export interface StoredWorkerQualification extends WorkerQualification {
  organisationId: string;
}

export interface StoredMediaUpload extends MediaUploadState {
  organisationId: string;
}

export const qualificationRepository = new Map<string, StoredWorkerQualification>();
export const processedOperationIds = new Set<string>();
export const mediaUploadRepository = new Map<string, StoredMediaUpload>();

@Controller('field')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class FieldSyncController {
  // --- Worker Qualification Management ---

  @Post('qualifications')
  createQualification(
    @Body()
    body: {
      workerId: string;
      qualificationType: string;
      certificateNumber: string;
      validUntil: string;
      status?: 'active' | 'revoked';
    },
    @Req() req: Request
  ): CommandResult<StoredWorkerQualification> {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const qualId = `qual-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const qualification: StoredWorkerQualification = {
      id: qualId,
      organisationId: orgId,
      workerId: body.workerId,
      qualificationType: body.qualificationType,
      certificateNumber: body.certificateNumber,
      validUntil: new Date(body.validUntil),
      status: body.status || 'active',
    };

    qualificationRepository.set(qualId, qualification);

    return {
      data: {
        id: qualId,
        status: qualification.status,
        recordVersion: 1,
        payload: qualification,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-qual-create',
      },
    };
  }

  @Patch('qualifications/:id/revoke')
  revokeQualification(
    @Param('id') qualId: string,
    @Body() body: { reason: string },
    @Req() req: Request
  ): CommandResult<StoredWorkerQualification> {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const qual = qualificationRepository.get(qualId);
    if (!qual || qual.organisationId !== orgId) {
      throw new HttpException({ message: 'QUALIFICATION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    qual.status = 'revoked';
    qual.revokedAt = new Date();
    qual.revocationReason = body.reason || 'Revoked by supervisor';

    qualificationRepository.set(qualId, qual);

    return {
      data: {
        id: qualId,
        status: 'revoked',
        recordVersion: 2,
        payload: qual,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-qual-revoke',
      },
    };
  }

  // --- Offline Sync Batch Processing (AT-055, AT-056) ---

  @Post('sync')
  @UseGuards(IdempotencyGuard)
  syncBatch(
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<{ results: OperationSyncResult[]; processedCount: number; ignoredCount: number }> {
    const parseResult = FieldSyncBatchSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const results: OperationSyncResult[] = [];
    let processedCount = 0;
    let ignoredCount = 0;

    for (const op of parseResult.data.operations) {
      const queuedOp: QueuedFieldOperation = {
        clientOperationId: op.clientOperationId,
        entityType: op.entityType,
        action: op.action,
        clientTimestamp: new Date(op.clientTimestamp),
        workerId: op.workerId,
        payload: op.payload as Record<string, unknown>,
      };

      // Invariant AT-056: Per-operation deduplication
      if (processedOperationIds.has(queuedOp.clientOperationId)) {
        const dedupRes = FieldSyncEngine.processOperationWithDeduplication(queuedOp, processedOperationIds);
        results.push(dedupRes);
        ignoredCount++;
        continue;
      }

      // Check if qualification check is required for worker
      const workerQualifications = Array.from(qualificationRepository.values()).filter(
        (q) => q.organisationId === orgId && q.workerId === queuedOp.workerId
      );

      // If worker has qualifications on record, find active or latest
      const relevantQual = workerQualifications[0];
      if (relevantQual && relevantQual.status === 'revoked') {
        // Invariant AT-055: Worker qualification revoked on server while device offline.
        // Action is recorded as observation flagged for supervisor review; does not grant authoritative release
        const res = FieldSyncEngine.processWorkerActionWithQualification(queuedOp, relevantQual);
        processedOperationIds.add(queuedOp.clientOperationId);
        results.push(res);
        processedCount++;
        continue;
      }

      // Normal application
      const syncRes = FieldSyncEngine.processOperationWithDeduplication(queuedOp, processedOperationIds);
      results.push(syncRes);
      processedCount++;
    }

    const batchId = `sync-${Date.now()}`;

    return {
      data: {
        id: batchId,
        status: 'completed',
        recordVersion: 1,
        payload: {
          results,
          processedCount,
          ignoredCount,
        },
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-field-sync',
      },
    };
  }

  // --- Media Upload Intent & Binary Completion (AT-057) ---

  @Post('media/upload-intents')
  createMediaIntent(
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredMediaUpload> {
    const parseResult = MediaUploadIntentSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const uploadId = `upl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const media: StoredMediaUpload = {
      uploadId,
      organisationId: orgId,
      storageKey: parseResult.data.storageKey,
      expectedBytes: parseResult.data.expectedBytes,
      receivedBytes: 0,
      isBinaryComplete: false,
      linkedTaskOrInspectionId: parseResult.data.linkedTaskOrInspectionId,
    };

    mediaUploadRepository.set(uploadId, media);

    return {
      data: {
        id: uploadId,
        status: 'pending_binary_upload',
        recordVersion: 1,
        payload: media,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-media-intent',
      },
    };
  }

  @Post('media/:id/complete')
  completeMediaUpload(
    @Param('id') uploadId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<{ uploadId: string; isFullyVerified: boolean; evidenceState: string }> {
    const parseResult = MediaUploadCompleteSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const media = mediaUploadRepository.get(uploadId);
    if (!media || media.organisationId !== orgId) {
      throw new HttpException({ message: 'MEDIA_UPLOAD_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    media.receivedBytes = parseResult.data.receivedBytes;
    media.isBinaryComplete = parseResult.data.isBinaryComplete;

    // Invariant AT-057: verify binary upload completion
    const verification = FieldSyncEngine.verifyMediaCompletion(media);

    mediaUploadRepository.set(uploadId, media);

    return {
      data: {
        id: uploadId,
        status: verification.evidenceState,
        recordVersion: 2,
        payload: {
          uploadId,
          isFullyVerified: verification.isFullyVerified,
          evidenceState: verification.evidenceState,
        },
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-media-complete',
      },
    };
  }

  // --- Contingency Disclosure (AT-058) ---

  @Get('storage-contingency')
  getStorageContingencyDisclosure(
    @Req() req: Request
  ): CommandResult<{ disclosure: string }> {
    const disclosure = FieldSyncEngine.getStorageContingencyDisclosure();

    return {
      data: {
        id: 'contingency-disclosure',
        status: 'disclosed',
        recordVersion: 1,
        payload: { disclosure },
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-disclosure',
      },
    };
  }
}
