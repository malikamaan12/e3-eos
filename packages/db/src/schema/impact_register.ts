import { pgTable, uuid, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { organisations, users } from './identity.js';

// Migration 0026 installs explicit scoped allocation/design revision FKs, RLS
// and immutable assessments. Neither advisory history nor this table releases work.
export const impactReviewAssessments = pgTable('impact_review_assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').notNull(),
  allocationId: uuid('allocation_id'),
  allocationRevisionId: uuid('allocation_revision_id'),
  designPackageId: uuid('design_package_id'),
  designRevisionId: uuid('design_revision_id'),
  targetVersion: integer('target_version').notNull(),
  impactFingerprint: text('impact_fingerprint').notNull(),
  sourceSnapshot: jsonb('source_snapshot').notNull(),
  assessment: text('assessment').notNull(),
  proposedAction: text('proposed_action').notNull(),
  reason: text('reason').notNull(),
  actorId: uuid('actor_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
