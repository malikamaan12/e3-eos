import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { createHash } from 'crypto';

interface CachedIdempotencyResult {
  requestHash: string;
  statusCode: number;
  body: any;
}

// In-memory / transactional cache store for idempotency records
export const globalIdempotencyStore = new Map<string, CachedIdempotencyResult>();

@Injectable()
export class IdempotencyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const method = request.method.toUpperCase();
    if (!['POST', 'PUT', 'PATCH'].includes(method)) {
      return true; // Safe methods do not require idempotency key
    }

    const idempotencyKey = request.headers['idempotency-key'] as string;
    if (!idempotencyKey) {
      throw new HttpException(
        {
          code: 'MISSING_IDEMPOTENCY_KEY',
          title: 'Idempotency-Key header is required',
          detail: 'All state-mutating commands require a unique Idempotency-Key header.',
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (request as any).organisationId || 'default-org';
    const actorId = (request as any).actorId || 'default-actor';
    const operation = `${method} ${request.baseUrl || ''}${request.path}`;

    const rawPayload = JSON.stringify(request.body || {});
    const requestHash = createHash('sha256').update(rawPayload).digest('hex');

    const cacheKey = `${orgId}:${actorId}:${operation}:${idempotencyKey}`;
    const existing = globalIdempotencyStore.get(cacheKey);

    if (existing) {
      if (existing.requestHash === requestHash) {
        // Replay identical result
        response.status(existing.statusCode).json(existing.body);
        return false; // Request handled, do not call handler again
      } else {
        // Same key, different payload -> 409 Conflict
        throw new HttpException(
          {
            code: 'IDEMPOTENCY_CONFLICT',
            title: 'Idempotency key conflict',
            detail: 'This idempotency key was already used with a different request payload.',
          },
          HttpStatus.CONFLICT
        );
      }
    }

    // Capture response to store after successful execution
    const originalJson = response.json.bind(response);
    response.json = (body: any) => {
      globalIdempotencyStore.set(cacheKey, {
        requestHash,
        statusCode: response.statusCode || 200,
        body,
      });
      return originalJson(body);
    };

    return true;
  }
}
