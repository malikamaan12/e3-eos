import { HttpException } from '@nestjs/common';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { generateDocumentNumber, hasRolePermission, type EngineeringDiscipline, type ControlledDocumentType } from '@e3-eos/domain';
import { DbService } from '../common/db.service.js';
import { ProjectAccessService, type ProjectAccessContext, type ProjectAccessTransaction } from '../projects/project-access.service.js';
import { DurableProjectCommand } from '../projects/durable-project-command.js';

export const DOCUMENT_READ_PERMISSIONS = ['projects.manage', 'design.version', 'finance.manage', 'procurement.manage', 'operations.manage', 'inventory.manage', 'hse.inspect', 'commercial.edit', 'field.inspect'];
export const DOCUMENT_WRITE_PERMISSIONS = ['projects.manage', 'design.version'];
const DISCIPLINES = ['staging', 'lighting', 'audio_visual', 'scenic', 'power_hvac', 'rigging', 'health_safety', 'operations'];
const TYPES = ['drawing', 'specification', 'method_statement', 'schedule', 'calculation', 'report'];
const CLASSIFICATIONS = ['internal', 'client_confidential', 'commercial_sensitive'];
const PURPOSES = ['for_information', 'for_client_approval', 'for_fabrication', 'for_tender', 'as_built'];
const fail = (code: string, detail: string, status = 400): never => { throw new HttpException({ code, title: detail, detail }, status); };
const date = (value: unknown) => value ? new Date(value as string).toISOString() : null;
function text(value: unknown, name: string, maximum: number): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maximum) fail('VALIDATION_ERROR', `${name} must contain 1–${maximum} characters.`);
  return (value as string).trim();
}
function option(value: unknown, name: string, values: string[], fallback?: string): string {
  const resolved = value === undefined ? fallback : value;
  if (typeof resolved !== 'string' || !values.includes(resolved)) fail('VALIDATION_ERROR', `${name} must be one of ${values.join(', ')}.`);
  return resolved as string;
}
function bodyFields(body: any, allowed: string[]) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !allowed.includes(key))) {
    fail('VALIDATION_ERROR', 'This command accepts draft metadata only. File content, storage paths, hashes, approval and scan outcomes cannot be supplied.');
  }
}

/** Durable metadata register. File acquisition, scanning and publication are deliberately separate capabilities. */
export class DocumentRegisterService {
  private readonly access: ProjectAccessService;
  private readonly commands: DurableProjectCommand;
  constructor(db: DbService) { this.access = new ProjectAccessService(db); this.commands = new DurableProjectCommand(db); }

  private classes(access: ProjectAccessContext) {
    const classes = ['internal', 'client_confidential', 'public'];
    if (hasRolePermission(access.role, 'finance.manage', access.isSuperAdmin) || hasRolePermission(access.role, 'commercial.approve', access.isSuperAdmin)) classes.push('commercial_sensitive');
    // Personnel and restricted incidents require a narrower, unpublished policy.
    return classes;
  }
  private capabilities(access: ProjectAccessContext) {
    return { canRegisterDraft: access.accessLevel === 'editor' && DOCUMENT_WRITE_PERMISSIONS.some(permission => hasRolePermission(access.role, permission, access.isSuperAdmin)),
      canUploadFiles: false, canApprove: false, canPublish: false, canDownload: false,
      classifications: this.classes(access).filter(value => value !== 'public'), disciplines: DISCIPLINES, documentTypes: TYPES };
  }
  private document(row: any) {
    return { id: row.id, projectId: row.project_id, projectCode: row.project_code, documentNumber: row.document_number,
      title: row.title, discipline: row.discipline, documentType: row.document_type, confidentialityLevel: row.confidentiality_level,
      currentRevisionCode: null, revisionsCount: row.revisions_count, rowVersion: row.row_version,
      provenanceState: row.provenance_state, status: row.provenance_state === 'metadata_only' ? 'draft' : 'legacy_unverified',
      createdBy: row.created_by, createdAt: date(row.created_at), updatedAt: date(row.updated_at),
      fileState: row.provenance_state === 'metadata_only' ? 'missing' : 'unverified',
      publicationState: 'not_published', canDownload: false };
  }
  private revision(row: any) {
    const metadataOnly = row.provenance_state === 'metadata_only';
    return { id: row.id, documentId: row.document_id, revisionCode: row.revision, originalFilename: row.original_filename,
      mimeType: row.mime_type, changeSummary: row.change_summary, purpose: row.purpose,
      provenanceState: row.provenance_state, fileState: metadataOnly ? 'missing' : 'unverified',
      quarantineScanState: metadataOnly ? 'not_scanned' : 'unverified', approvalState: metadataOnly ? 'draft' : 'unverified',
      status: metadataOnly ? 'draft' : 'legacy_unverified', canDownload: false,
      uploadedBy: row.uploaded_by, uploadedAt: date(row.uploaded_at) };
  }
  private async scopedDocument(tx: ProjectAccessTransaction, access: ProjectAccessContext, documentId: string) {
    text(documentId, 'Document id', 200);
    const row = (await tx.query(`SELECT * FROM controlled_documents
      WHERE id=$1 AND organisation_id=$2 AND project_id=$3 AND confidentiality_level=ANY($4::text[]) FOR UPDATE`,
      [documentId, access.organisationId, access.project.id, this.classes(access)])).rows[0];
    if (!row) fail('DOCUMENT_NOT_FOUND', 'Document does not exist or is not available in this project scope.', 404);
    return row;
  }

  async list(project: string, req: Request) {
    return this.access.withAccess(req, project, { level: 'viewer', audiences: ['internal'], permissions: DOCUMENT_READ_PERMISSIONS }, async (tx, access) => {
      const rows = (await tx.query(`SELECT * FROM controlled_documents WHERE organisation_id=$1 AND project_id=$2
        AND confidentiality_level=ANY($3::text[]) ORDER BY created_at DESC,id LIMIT 501`, [access.organisationId, access.project.id, this.classes(access)])).rows;
      return { data: rows.slice(0, 500).map(row => this.document(row)), meta: { total: Math.min(rows.length, 500), truncated: rows.length > 500, limit: 500,
        capabilities: this.capabilities(access), disclosure: 'Draft metadata only. File upload, scanning, approval and publication are unavailable; legacy evidence remains unverified.' } };
    });
  }
  async get(project: string, documentId: string, req: Request) {
    return this.access.withAccess(req, project, { level: 'viewer', audiences: ['internal'], permissions: DOCUMENT_READ_PERMISSIONS }, async (tx, access) => {
      const row = await this.scopedDocument(tx, access, documentId);
      return { data: this.document(row), meta: { capabilities: this.capabilities(access) } };
    });
  }
  async revisions(project: string, documentId: string, req: Request) {
    return this.access.withAccess(req, project, { level: 'viewer', audiences: ['internal'], permissions: DOCUMENT_READ_PERMISSIONS }, async (tx, access) => {
      const document = await this.scopedDocument(tx, access, documentId);
      const rows = (await tx.query(`SELECT r.* FROM controlled_document_revisions r JOIN controlled_documents d
        ON d.id=r.document_id AND d.organisation_id=r.organisation_id
        WHERE r.document_id=$1 AND r.organisation_id=$2 AND d.project_id=$3 ORDER BY r.uploaded_at DESC,r.id LIMIT 501`,
        [document.id, access.organisationId, access.project.id])).rows;
      return { data: rows.slice(0, 500).map(row => this.revision(row)), meta: { rowVersion: document.row_version, truncated: rows.length > 500, limit: 500 } };
    });
  }
  async create(project: string, body: any, req: Request) {
    bodyFields(body, ['title', 'discipline', 'documentType', 'confidentialityLevel', 'reason']);
    const input = { title: text(body.title, 'Title', 300), discipline: option(body.discipline, 'Discipline', DISCIPLINES),
      documentType: option(body.documentType, 'Document type', TYPES), confidentialityLevel: option(body.confidentialityLevel, 'Classification', CLASSIFICATIONS, 'internal'),
      reason: text(body.reason, 'Reason', 2000) };
    return this.commands.run(req, project, { level: 'editor', audiences: ['internal'], permissions: DOCUMENT_WRITE_PERMISSIONS,
      operation: 'document.register', action: 'document.registered', targetType: 'controlled_document', input,
      authorize: async (_tx, access) => {
        if (!this.classes(access).includes(input.confidentialityLevel)) fail('DOCUMENT_CLASSIFICATION_FORBIDDEN', 'Current role cannot register this document classification.', 403);
      } }, async (tx, access) => {
      const count = (await tx.query('SELECT count(*)::int AS total FROM controlled_documents WHERE organisation_id=$1 AND project_id=$2', [access.organisationId, access.project.id])).rows[0].total;
      const id = randomUUID();
      let sequence = Number(count) + 1;
      let documentNumber: string;
      do {
        documentNumber = generateDocumentNumber({ projectCode: access.project.project_code, discipline: input.discipline as EngineeringDiscipline,
          documentType: input.documentType as ControlledDocumentType, sequence: sequence++ });
      } while ((await tx.query('SELECT id FROM controlled_documents WHERE organisation_id=$1 AND project_id=$2 AND document_number=$3',
        [access.organisationId, access.project.id, documentNumber])).rows.length);
      const row = (await tx.query(`INSERT INTO controlled_documents(id,organisation_id,project_id,project_code,document_number,title,discipline,document_type,
        confidentiality_level,current_revision_code,revisions_count,created_by,row_version,provenance_state)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NULL,0,$10,1,'metadata_only') RETURNING *`,
        [id, access.organisationId, access.project.id, access.project.project_code, documentNumber, input.title, input.discipline, input.documentType,
          input.confidentialityLevel, access.userId])).rows[0];
      return { id, data: this.document(row), version: 1, event: { reason: input.reason, classification: input.confidentialityLevel, fileState: 'missing' } };
    });
  }
  async addRevision(project: string, documentId: string, body: any, req: Request) {
    bodyFields(body, ['revisionCode', 'originalFilename', 'mimeType', 'changeSummary', 'expectedVersion', 'reason', 'purpose']);
    if (!Number.isSafeInteger(body.expectedVersion) || body.expectedVersion < 1) fail('VALIDATION_ERROR', 'A positive expectedVersion is required.');
    const input = { documentId: text(documentId, 'Document id', 200), revisionCode: text(body.revisionCode, 'Revision code', 60),
      originalFilename: body.originalFilename == null ? null : text(body.originalFilename, 'Original filename', 255),
      mimeType: body.mimeType == null ? null : option(body.mimeType, 'Declared MIME type', ['application/pdf', 'image/png', 'image/jpeg', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
      changeSummary: text(body.changeSummary, 'Change summary', 2000), expectedVersion: body.expectedVersion,
      reason: text(body.reason, 'Reason', 2000), purpose: option(body.purpose, 'Intended purpose', PURPOSES, 'for_information') };
    if (input.originalFilename && /[\\/\u0000-\u001f]/.test(input.originalFilename)) fail('VALIDATION_ERROR', 'Original filename must be a plain filename, not a path.');
    return this.commands.run(req, project, { level: 'editor', audiences: ['internal'], permissions: DOCUMENT_WRITE_PERMISSIONS,
      operation: 'document.revision.register', action: 'document.revision_registered', targetType: 'controlled_document_revision', input,
      authorize: async (tx, access) => { await this.scopedDocument(tx, access, input.documentId); } }, async (tx, access) => {
      const document = await this.scopedDocument(tx, access, input.documentId);
      if (document.row_version !== input.expectedVersion) fail('DOCUMENT_VERSION_CONFLICT', 'Document changed. Refresh and retry with its current version and a new command key.', 409);
      if ((await tx.query('SELECT id FROM controlled_document_revisions WHERE organisation_id=$1 AND document_id=$2 AND revision=$3', [access.organisationId, document.id, input.revisionCode])).rows.length) {
        fail('DOCUMENT_REVISION_EXISTS', 'This revision code already exists. Use a new revision code.', 409);
      }
      const id = randomUUID();
      const row = (await tx.query(`INSERT INTO controlled_document_revisions(id,organisation_id,document_id,revision,original_filename,mime_type,
        quarantine_scan_state,approval_state,uploaded_by,provenance_state,change_summary,purpose)
        VALUES($1,$2,$3,$4,$5,$6,'not_scanned','draft',$7,'metadata_only',$8,$9) RETURNING *`,
        [id, access.organisationId, document.id, input.revisionCode, input.originalFilename, input.mimeType, access.userId, input.changeSummary, input.purpose])).rows[0];
      await tx.query(`UPDATE controlled_documents SET revisions_count=revisions_count+1,row_version=row_version+1,updated_at=clock_timestamp()
        WHERE id=$1 AND organisation_id=$2 AND project_id=$3`, [document.id, access.organisationId, access.project.id]);
      return { id, data: { ...this.revision(row), rowVersion: document.row_version + 1 }, version: document.row_version + 1,
        event: { documentId: document.id, reason: input.reason, revisionCode: input.revisionCode, fileState: 'missing' } };
    });
  }
}
