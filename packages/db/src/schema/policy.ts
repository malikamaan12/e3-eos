import { pgTable, text, timestamp, uuid, integer, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';
import { organisations, users } from './identity.js';

export const policySnapshots = pgTable('policy_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id'),
  compilerVersion: text('compiler_version').notNull(),
  contentHash: text('content_hash').notNull(), // Canonical SHA-256
  rulesJson: jsonb('rules_json').notNull(),
  compiledAt: timestamp('compiled_at', { withTimezone: true }).defaultNow().notNull(),
});

export const activePolicyPointers = pgTable(
  'active_policy_pointers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
    projectId: uuid('project_id'),
    activeSnapshotId: uuid('active_snapshot_id').references(() => policySnapshots.id).notNull(),
    revision: integer('revision').default(1).notNull(), // Optimistic lock counter
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    updatedBy: uuid('updated_by').references(() => users.id).notNull(),
  },
  (table) => [
    uniqueIndex('active_policy_scope_idx').on(table.organisationId, table.projectId),
  ]
);
