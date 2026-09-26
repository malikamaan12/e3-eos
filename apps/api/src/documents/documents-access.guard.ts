import { CanActivate, ExecutionContext, HttpException, Injectable, Optional } from '@nestjs/common';
import type { Request } from 'express';
import { DbService } from '../common/db.service.js';
import { localSyntheticAuthEnabled, readSessionToken } from '../auth/local-synthetic-auth.js';
import { ProjectAccessService } from '../projects/project-access.service.js';
import { DOCUMENT_READ_PERMISSIONS, DOCUMENT_WRITE_PERMISSIONS } from './document-register.service.js';

export function assertDocumentFixture(req?: Request) {
  if (process.env.NODE_ENV !== 'test' || !localSyntheticAuthEnabled() || req?.method || (req && readSessionToken(req))) {
    throw new HttpException({ code: 'DOCUMENT_WORKFLOW_UNAVAILABLE', detail: 'This legacy document workflow is available only to explicit direct test fixtures. A durable implementation is required.' }, 503);
  }
}

/** HTTP never executes legacy in-memory packs, publishing or document workflows. */
@Injectable()
export class DocumentsAccessGuard implements CanActivate {
  private readonly access: ProjectAccessService;
  constructor(@Optional() db?: DbService) { this.access = new ProjectAccessService(db || new DbService()); }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const name = context.getHandler().name;
    const reference = req.params.projectId;
    if (typeof reference !== 'string') throw new HttpException({ code: 'VALIDATION_ERROR', detail: 'A project reference is required.' }, 400);
    const write = !['GET', 'HEAD'].includes(req.method);
    const access = await this.access.withAccess(req, reference, { level: write ? 'editor' : 'viewer', audiences: ['internal'],
      permissions: write ? DOCUMENT_WRITE_PERMISSIONS : DOCUMENT_READ_PERMISSIONS }, async (_tx, verified) => verified);
    req.params.projectId = access.project.id;
    if (context.getClass().name !== 'DocumentsController' || !['listDocuments', 'getDocument', 'listRevisions', 'createDocument', 'uploadRevision'].includes(name)) {
      throw new HttpException({ code: 'DOCUMENT_WORKFLOW_UNAVAILABLE', detail: 'This workflow has no durable verified implementation. Draft document metadata is available in the project document register.' }, 503);
    }
    return true;
  }
}

@Injectable()
export class CompanyVaultAvailabilityGuard implements CanActivate {
  canActivate(): boolean {
    throw new HttpException({ code: 'EVIDENCE_VAULT_UNAVAILABLE', detail: 'The company vault has no durable scoped evidence workflow. Legacy in-memory evidence is not available over HTTP.' }, 503);
  }
}
