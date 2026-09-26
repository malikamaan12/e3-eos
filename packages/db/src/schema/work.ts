import { pgTable, text, timestamp, uuid, boolean, jsonb, integer } from 'drizzle-orm/pg-core';
import { organisations, users } from './identity.js';
import { projects } from './projects.js';

export const workPackages = pgTable('work_packages', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  stageInstanceId: text('stage_instance_id'),
  name: text('name').notNull(),
  ownerId: uuid('owner_id').references(() => users.id).notNull(),
  status: text('status').default('active').notNull(), // 'planned', 'active', 'completed', 'cancelled'
  acceptanceState: text('acceptance_state').default('pending').notNull(), // 'pending', 'accepted', 'rejected', 'conditional'
  rowVersion: integer('row_version').default(1).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const taskInstances = pgTable('task_instances', {
  forecastStart: timestamp('forecast_start', { withTimezone: true }),
  forecastFinish: timestamp('forecast_finish', { withTimezone: true }),
  forecastTimezone: text('forecast_timezone'),
  forecastVersion: integer('forecast_version').default(0).notNull(),
  currentForecastRevisionId: uuid('current_forecast_revision_id'),
  id: uuid('id').primaryKey().defaultRandom(),
  packageId: uuid('package_id').references(() => workPackages.id).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  title: text('title').notNull(),
  assigneeId: uuid('assignee_id').references(() => users.id),
  state: text('state').default('planned').notNull(), // 'planned', 'active', 'completed'
  isCompleted: boolean('is_completed').default(false).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  completedBy: uuid('completed_by').references(() => users.id),
  completionEvidence: text('completion_evidence'),
  rowVersion: integer('row_version').default(1).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const packageAcceptances = pgTable('package_acceptances', {
  id: uuid('id').primaryKey().defaultRandom(),
  packageId: uuid('package_id').references(() => workPackages.id).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  deciderId: uuid('decider_id').references(() => users.id).notNull(),
  outcome: text('outcome').notNull(), // 'accepted', 'rejected', 'conditional'
  conditions: jsonb('conditions').default([]).notNull(),
  comment: text('comment'),
  decidedAt: timestamp('decided_at', { withTimezone: true }).defaultNow().notNull(),
});

export const dependencyEdges = pgTable('dependency_edges', {
  predecessorTaskId: uuid('predecessor_task_id'),
  successorTaskId: uuid('successor_task_id'),
  provenanceState: text('provenance_state').default('legacy_unverified').notNull(),
  rowVersion: integer('row_version').default(1).notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  predecessorId: text('predecessor_id').notNull(),
  successorId: text('successor_id').notNull(),
  dependencyType: text('dependency_type').default('FS').notNull(), // 'FS', 'SS', 'FF'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const protectiveActions = pgTable('protective_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  actionType: text('action_type').notNull(), // 'stop_work', 'evacuate', 'isolate', 'hazard_quarantine'
  location: text('location').notNull(),
  immediateReason: text('immediate_reason').notNull(),
  affectedScopeIds: jsonb('affected_scope_ids').default([]).notNull(),
  recordedBy: uuid('recorded_by').references(() => users.id).notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
});
