import { pgTable, text, timestamp, uuid, integer } from 'drizzle-orm/pg-core';
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
  currentRevisionCode: text('current_revision_code').notNull(),
  revisionsCount: integer('revisions_count').default(1).notNull(),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const controlledDocumentRevisions = pgTable('controlled_document_revisions', {
  id: text('id').primaryKey(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  documentId: text('document_id').references(() => controlledDocuments.id, { onDelete: 'cascade' }).notNull(),
  revision: text('revision').notNull(),
  storageObjectPath: text('storage_object_path').notNull(),
  originalFilename: text('original_filename').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  calculatedSha256: text('calculated_sha256').notNull(),
  quarantineScanState: text('quarantine_scan_state').default('passed').notNull(),
  approvalState: text('approval_state').default('approved').notNull(),
  uploadedBy: text('uploaded_by').notNull(),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
});
