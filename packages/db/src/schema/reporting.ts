import { pgTable, text, timestamp, uuid, integer, boolean, jsonb } from 'drizzle-orm/pg-core';
import { organisations, users } from './identity.js';
import { projects } from './projects.js';

export const projectReports = pgTable('project_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  reportCode: text('report_code').notNull(),
  version: integer('version').default(1).notNull(),
  targetAudience: text('target_audience').default('client_portal').notNull(), // 'internal_command', 'client_portal', 'public_report'
  publishedAt: timestamp('published_at', { withTimezone: true }).defaultNow().notNull(),
  deterministicContentHash: text('deterministic_content_hash').notNull(),
  isPublished: boolean('is_published').default(false).notNull(),
  content: jsonb('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const reportRevisions = pgTable('report_revisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  reportId: uuid('report_id').references(() => projectReports.id).notNull(),
  version: integer('version').notNull(),
  revisionReason: text('revision_reason').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }).defaultNow().notNull(),
  content: jsonb('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const projectCloseouts = pgTable('project_closeouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  operationalStatus: text('operational_status').default('active').notNull(), // 'active', 'operational_closed'
  operationalClosedAt: timestamp('operational_closed_at', { withTimezone: true }),
  operationalClosedBy: uuid('operational_closed_by').references(() => users.id),
  acceptanceStatus: text('acceptance_status').default('pending').notNull(),
  reportingStatus: text('reporting_status').default('draft').notNull(),
  financialReviewStatus: text('financial_review_status').default('pending').notNull(),
  settlementStatus: text('settlement_status').default('open_receivables').notNull(), // 'open_receivables', 'fully_settled'
  openReceivablesCount: integer('open_receivables_count').default(0).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const projectLessons = pgTable('project_lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  narrative: text('narrative').notNull(),
  policyRevisionProposed: boolean('policy_revision_proposed').default(false).notNull(),
  masterPolicyModified: boolean('master_policy_modified').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
