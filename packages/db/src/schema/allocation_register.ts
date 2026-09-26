import { pgTable, uuid, integer, jsonb, text, timestamp } from 'drizzle-orm/pg-core';
import { organisations, users } from './identity.js';
import { requirementAllocations } from './scope.js';

export const requirementAllocationRevisions = pgTable('requirement_allocation_revisions', {
  id: uuid('id').primaryKey(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').notNull(),
  allocationId: uuid('allocation_id').references(() => requirementAllocations.id).notNull(),
  revisionNumber: integer('revision_number').notNull(),
  snapshot: jsonb('snapshot').notNull(),
  snapshotHash: text('snapshot_hash').notNull(),
  reason: text('reason').notNull(),
  authorId: uuid('author_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
