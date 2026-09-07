import { pgTable, text, timestamp, uuid, boolean, integer, jsonb } from 'drizzle-orm/pg-core';
import { organisations, users } from './identity.js';
import { projects } from './projects.js';

export const designs = pgTable('designs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  title: text('title').notNull(),
  titleAr: text('title_ar'),
  category: text('category').notNull(), // 'moodboard', 'technical_drawing', 'floorplan', '3d_render'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const designVersions = pgTable('design_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  designId: uuid('design_id').references(() => designs.id).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  versionNumber: integer('version_number').notNull(),
  contentHash: text('content_hash').notNull(),
  storageKey: text('storage_key').notNull(),
  title: text('title').notNull(),
  uploadedBy: uuid('uploaded_by').references(() => users.id).notNull(),
  purpose: text('purpose').default('for_review').notNull(), // 'for_review', 'for_client_approval', 'for_fabrication'
  fabricationApprovalHash: text('fabrication_approval_hash'),
  fabricationApprovedAt: timestamp('fabrication_approved_at', { withTimezone: true }),
  fabricationApprovedBy: uuid('fabrication_approved_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const designAnnotations = pgTable('design_annotations', {
  id: uuid('id').primaryKey().defaultRandom(),
  versionId: uuid('version_id').references(() => designVersions.id).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  authorId: uuid('author_id').references(() => users.id).notNull(),
  pageNumber: integer('page_number').default(1).notNull(),
  coordinates: jsonb('coordinates').notNull(),
  comment: text('comment').notNull(),
  resolved: boolean('resolved').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
