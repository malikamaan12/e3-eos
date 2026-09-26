import { pgTable, text, timestamp, uuid, integer, boolean, jsonb, numeric } from 'drizzle-orm/pg-core';
import { organisations } from './identity.js';
import { projects } from './projects.js';

export const controlledDocuments = pgTable('controlled_documents', {
  id: text('id').primaryKey(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  projectCode: text('project_code').notNull(),
  documentNumber: text('document_number').notNull(),
  title: text('title').notNull(),
  discipline: text('discipline').notNull(),
  documentType: text('document_type').notNull(),
  confidentialityLevel: text('confidentiality_level').notNull(),
  currentRevisionCode: text('current_revision_code'),
  revisionsCount: integer('revisions_count').default(0).notNull(),
  rowVersion: integer('row_version').default(1).notNull(),
  provenanceState: text('provenance_state').default('legacy_unverified').notNull(),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const controlledDocumentRevisions = pgTable('controlled_document_revisions', {
  id: text('id').primaryKey(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  documentId: text('document_id').references(() => controlledDocuments.id, { onDelete: 'cascade' }).notNull(),
  revision: text('revision').notNull(),
  storageObjectPath: text('storage_object_path'),
  originalFilename: text('original_filename'),
  mimeType: text('mime_type'),
  size: integer('size'),
  calculatedSha256: text('calculated_sha256'),
  quarantineScanState: text('quarantine_scan_state').default('not_scanned').notNull(),
  approvalState: text('approval_state').default('draft').notNull(),
  provenanceState: text('provenance_state').default('legacy_unverified').notNull(),
  changeSummary: text('change_summary'),
  purpose: text('purpose').default('for_information').notNull(),
  uploadedBy: text('uploaded_by').notNull(),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
});

// =========================================================================
// Company Evidence Vault Tables
// =========================================================================

export const companyEvidenceVault = pgTable('company_evidence_vault', {
  id: text('id').primaryKey(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  evidenceCode: text('evidence_code').notNull(), // e.g. "E3-EV-CORP-0001"
  title: text('title').notNull(),
  category: text('category').notNull(), // 'CORP', 'BRAND', 'STAFF', 'PROJ', 'CERT', 'HSEQ', 'EQUIP', 'SYS', 'COST', 'TMPL'
  legalEntity: text('legal_entity').notNull(),
  documentClass: text('document_class').default('external_controlled').notNull(),
  confidentiality: text('confidentiality').default('internal').notNull(),
  sourceDocumentNumber: text('source_document_number'),
  issuer: text('issuer'),
  reportingYear: text('reporting_year'), // e.g. "FY2024"
  periodStart: text('period_start'),
  periodEnd: text('period_end'),
  auditStatus: text('audit_status').default('not_applicable').notNull(),
  expiryState: text('expiry_state').default('unknown').notNull(),
  expiryDate: text('expiry_date'),
  currentRevisionCode: text('current_revision_code').default('Rev 01').notNull(),
  verificationStatus: text('verification_status').default('pending_verification').notNull(),
  verifiedBy: text('verified_by'),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  retentionHold: boolean('retention_hold').default(false).notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const evidenceVaultRevisions = pgTable('evidence_vault_revisions', {
  id: text('id').primaryKey(),
  vaultItemId: text('vault_item_id').references(() => companyEvidenceVault.id, { onDelete: 'cascade' }).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  revisionCode: text('revision_code').notNull(), // "Rev 01", "Rev 02"
  predecessorRevisionId: text('predecessor_revision_id'),
  contentHash: text('content_hash').notNull(),
  calculatedSha256: text('calculated_sha256').notNull(),
  originalFilename: text('original_filename').notNull(),
  storageKey: text('storage_key').notNull(),
  fileSizeBytes: integer('file_size_bytes').notNull(),
  mimeType: text('mime_type').default('application/pdf').notNull(),
  verificationStatus: text('verification_status').default('pending_verification').notNull(),
  verificationNotes: text('verification_notes'),
  verifiedBy: text('verified_by'),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  uploadedBy: text('uploaded_by').notNull(),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
});

// =========================================================================
// Project Required Document Register & Working Copies
// =========================================================================

export const projectRequiredDocumentSlots = pgTable('project_required_document_slots', {
  id: text('id').primaryKey(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  requirementId: text('requirement_id'),
  title: text('title').notNull(),
  description: text('description'),
  mandatory: boolean('mandatory').default(true).notNull(),
  requestedEntity: text('requested_entity'),
  requestedYears: jsonb('requested_years').$type<Array<string | number>>().default([]).notNull(),
  requestedLanguage: text('requested_language').default('any').notNull(),
  requestedFormat: text('requested_format').default('pdf').notNull(),
  certificationRequired: boolean('certification_required').default(false).notNull(),
  signatureRequired: boolean('signature_required').default(false).notNull(),
  stampRequired: boolean('stamp_required').default(false).notNull(),
  envelope: text('envelope').default('technical').notNull(),
  owner: text('owner'),
  dueDate: text('due_date'),
  status: text('status').default('missing').notNull(), // 'missing', 'linked_pending_review', 'linked_verified', 'wrong_entity', 'expired', 'not_applicable'
  linkedEvidenceVaultId: text('linked_evidence_vault_id'),
  linkedEvidenceRevisionId: text('linked_evidence_revision_id'),
  exclusionReason: text('exclusion_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const projectDocumentWorkingCopies = pgTable('project_document_working_copies', {
  id: text('id').primaryKey(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  documentNumber: text('document_number').notNull(),
  title: text('title').notNull(),
  sourceVaultTemplateId: text('source_vault_template_id'),
  sourceVaultRevisionId: text('source_vault_revision_id'),
  discipline: text('discipline').default('general').notNull(),
  envelope: text('envelope').default('technical').notNull(),
  currentRevisionCode: text('current_revision_code').default('Rev 01').notNull(),
  contentHash: text('content_hash').notNull(),
  isFrozen: boolean('is_frozen').default(false).notNull(),
  frozenAt: timestamp('frozen_at', { withTimezone: true }),
  frozenBy: text('frozen_by'),
  status: text('status').default('working').notNull(), // 'pending', 'working', 'under_review', 'changes_required', 'final_for_submission'
  recordVersion: integer('record_version').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// =========================================================================
// Submission Pack Builder Tables
// =========================================================================

export const submissionPacks = pgTable('submission_packs', {
  id: text('id').primaryKey(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  packCode: text('pack_code').notNull(), // e.g. "PACK-QND26-TECH-01"
  title: text('title').notNull(),
  description: text('description'),
  tenderReference: text('tender_reference'),
  envelope: text('envelope').default('technical').notNull(),
  status: text('status').default('working').notNull(), // 'working', 'under_review', 'ready_for_final_approval', 'ready_to_submit', 'submitted', 'superseded'
  currentRevisionNumber: integer('current_revision_number').default(1).notNull(),
  currentRevisionCode: text('current_revision_code').default('Rev 01').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const submissionPackRevisions = pgTable('submission_pack_revisions', {
  id: text('id').primaryKey(),
  packId: text('pack_id').references(() => submissionPacks.id, { onDelete: 'cascade' }).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  revisionCode: text('revision_code').notNull(), // "Rev 01", "Rev 02"
  revisionNumber: integer('revision_number').notNull(),
  status: text('status').default('working').notNull(),
  manifestHash: text('manifest_hash').notNull(),
  isFrozen: boolean('is_frozen').default(false).notNull(),
  frozenAt: timestamp('frozen_at', { withTimezone: true }),
  frozenBy: text('frozen_by'),
  freezeNotes: text('freeze_notes'),
  exportConfig: jsonb('export_config').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const submissionPackItems = pgTable('submission_pack_items', {
  id: text('id').primaryKey(),
  packRevisionId: text('pack_revision_id').references(() => submissionPackRevisions.id, { onDelete: 'cascade' }).notNull(),
  sequenceIndex: integer('sequence_index').notNull(),
  sectionName: text('section_name').notNull(),
  itemType: text('item_type').notNull(), // 'required_slot', 'vault_evidence', 'project_working_doc', 'section_divider'
  sourceEntityId: text('source_entity_id').notNull(),
  sourceRevisionId: text('source_revision_id').notNull(),
  sourceContentHash: text('source_content_hash').notNull(),
  submissionTitle: text('submission_title').notNull(),
  envelope: text('envelope').default('technical').notNull(),
  isIncluded: boolean('is_included').default(true).notNull(),
  isMandatory: boolean('is_mandatory').default(true).notNull(),
  exclusionReason: text('exclusion_reason'),
  selectedPageRange: text('selected_page_range').default('all').notNull(),
  stampRequired: boolean('stamp_required').default(false).notNull(),
  signatureRequired: boolean('signature_required').default(false).notNull(),
});

export const submissionPackArtifacts = pgTable('submission_pack_artifacts', {
  id: text('id').primaryKey(),
  packRevisionId: text('pack_revision_id').references(() => submissionPackRevisions.id, { onDelete: 'cascade' }).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  manifestHash: text('manifest_hash').notNull(),
  artifactHash: text('artifact_hash').notNull(),
  fileName: text('file_name').notNull(),
  fileSizeBytes: integer('file_size_bytes').notNull(),
  pageCount: integer('page_count').notNull(),
  pageMap: jsonb('page_map').default([]).notNull(),
  isSealed: boolean('is_sealed').default(false).notNull(),
  sealedAt: timestamp('sealed_at', { withTimezone: true }),
  signedMarksApplied: boolean('signed_marks_applied').default(false).notNull(),
  signingLog: jsonb('signing_log').default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// =========================================================================
// Document Comments, Stamp/Signature Assets & Transmittal Issue Records
// =========================================================================

export const documentComments = pgTable('document_comments', {
  id: text('id').primaryKey(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id),
  documentId: text('document_id').notNull(),
  versionId: text('version_id'),
  pageNumber: integer('page_number').default(1).notNull(),
  xPercent: numeric('x_percent'),
  yPercent: numeric('y_percent'),
  authorId: text('author_id').notNull(),
  authorName: text('author_name').notNull(),
  comment: text('comment').notNull(),
  visibility: text('visibility').default('internal_only').notNull(), // 'internal_only', 'client_visible'
  isBlocking: boolean('is_blocking').default(false).notNull(),
  status: text('status').default('open').notNull(), // 'open', 'in_progress', 'resolved', 'reopened'
  resolvedBy: text('resolved_by'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolutionEvidence: text('resolution_evidence'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const authorizedStampSignatureAssets = pgTable('authorized_stamp_signature_assets', {
  id: text('id').primaryKey(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  assetType: text('asset_type').notNull(), // 'stamp', 'signature'
  assetCode: text('asset_code').notNull(), // 'STAMP-CORP-01', 'SIG-MD-01'
  label: text('label').notNull(),
  signatoryName: text('signatory_name').notNull(),
  signatoryAuthority: text('signatory_authority').notNull(),
  confidentiality: text('confidentiality').default('restricted').notNull(),
  storageKey: text('storage_key').notNull(),
  contentHash: text('content_hash').notNull(),
  allowedActors: jsonb('allowed_actors').$type<string[]>().default([]).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const transmittalIssueRecords = pgTable('transmittal_issue_records', {
  id: text('id').primaryKey(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  packRevisionId: text('pack_revision_id').references(() => submissionPackRevisions.id).notNull(),
  transmittalNumber: text('transmittal_number').notNull(),
  recipientOrganisation: text('recipient_organisation').notNull(),
  recipientName: text('recipient_name').notNull(),
  recipientEmail: text('recipient_email').notNull(),
  channel: text('channel').notNull(), // 'portal', 'email', 'physical_courier', 'hand_delivery', 'api_transmittal'
  purpose: text('purpose').notNull(),
  issuedBy: text('issued_by').notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
  artifactHash: text('artifact_hash').notNull(),
  receiptReference: text('receipt_reference'),
  receiptAcknowledgedBy: text('receipt_acknowledged_by'),
  receiptAcknowledgedAt: timestamp('receipt_acknowledged_at', { withTimezone: true }),
  receiptNotes: text('receipt_notes'),
  receiptDocumentUrl: text('receipt_document_url'),
  status: text('status').default('issued').notNull(), // 'issued', 'acknowledged', 'rejected'
});

