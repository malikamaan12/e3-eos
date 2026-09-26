import { pgTable, uuid, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { organisations, users } from './identity.js';

// Parent and current-pointer composite scope constraints are installed by 0025.
export const designPackageRevisions = pgTable('design_package_revisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').notNull(),
  designPackageId: uuid('design_package_id').notNull(),
  revisionNumber: integer('revision_number').notNull(),
  snapshot: jsonb('snapshot').notNull(),
  snapshotHash: text('snapshot_hash').notNull(),
  reason: text('reason').notNull(),
  authorId: uuid('author_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
