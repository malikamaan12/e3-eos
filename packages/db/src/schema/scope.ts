import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { organisations, users } from './identity.js';
import { projects } from './projects.js';

export const requirements = pgTable('requirements', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  sourceReference: text('source_reference'),
  ownerId: uuid('owner_id').references(() => users.id),
  deliverablePackageId: uuid('deliverable_package_id'),
  disposition: text('disposition').default('applicability_unknown').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const clarifications = pgTable('clarifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  question: text('question').notNull(),
  source: text('source').notNull(),
  dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
  response: text('response'),
  respondedBy: uuid('responded_by').references(() => users.id),
  status: text('status').default('open').notNull(), // 'open', 'answered', 'superseded'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const risks = pgTable('risks', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  description: text('description').notNull(),
  severity: text('severity').notNull(), // 'low', 'medium', 'high', 'critical'
  likelihood: text('likelihood').notNull(), // 'low', 'medium', 'high'
  mitigation: text('mitigation'),
  ownerId: uuid('owner_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const qualificationDecisions = pgTable('qualification_decisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  decision: text('decision').notNull(), // 'pursue', 'pause', 'no_go'
  rationale: text('rationale').notNull(),
  decidedBy: uuid('decided_by').references(() => users.id).notNull(),
  decidedAt: timestamp('decided_at', { withTimezone: true }).defaultNow().notNull(),
});
