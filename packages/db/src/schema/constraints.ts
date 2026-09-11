import { pgTable, text, timestamp, uuid, boolean, integer, numeric } from 'drizzle-orm/pg-core';
import { organisations, users } from './identity.js';
import { projects } from './projects.js';

export const operationalConstraints = pgTable('operational_constraints', {
  id: text('id').primaryKey(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  constraintType: text('constraint_type').notNull(),
  sourceType: text('source_type').notNull(),
  sourceOrganisation: text('source_organisation'),
  locationZone: text('location_zone').notNull(),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }),
  effectiveTo: timestamp('effective_to', { withTimezone: true }),
  timeWindow: text('time_window').notNull(),
  limitValue: numeric('limit_value').notNull(),
  unit: text('unit').notNull(),
  applicability: boolean('applicability').default(true).notNull(),
  priority: text('priority').default('medium').notNull(),
  overrideAuthority: text('override_authority'),
  verificationStatus: text('verification_status').default('Draft').notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  version: integer('version').default(1).notNull(),
});

export const constraintSourceLinks = pgTable('constraint_source_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  constraintId: text('constraint_id').references(() => operationalConstraints.id, { onDelete: 'cascade' }).notNull(),
  controlledDocumentId: text('controlled_document_id').notNull(),
  documentRevisionId: text('document_revision_id').notNull(),
  calculatedSha256: text('calculated_sha256').notNull(),
  pageClauseSection: text('page_clause_section'),
  linkedAt: timestamp('linked_at', { withTimezone: true }).defaultNow().notNull(),
  linkedBy: uuid('linked_by').references(() => users.id),
});

export const constraintVerifications = pgTable('constraint_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  constraintId: text('constraint_id').references(() => operationalConstraints.id, { onDelete: 'cascade' }).notNull(),
  verifierUserId: uuid('verifier_user_id').references(() => users.id).notNull(),
  verifierRole: text('verifier_role').notNull(),
  extractedRuleValue: text('extracted_rule_value').notNull(),
  applicabilityStatement: text('applicability_statement').notNull(),
  reviewerComment: text('reviewer_comment'),
  verifiedAt: timestamp('verified_at', { withTimezone: true }).defaultNow().notNull(),
  auditEventId: text('audit_event_id').notNull(),
  sourceHash: text('source_hash').notNull(),
});
