import { pgTable, text, timestamp, uuid, integer, uniqueIndex, jsonb } from 'drizzle-orm/pg-core';
import { organisations, users } from './identity.js';

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
    projectCode: text('project_code').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    originCode: text('origin_code').notNull(),
    ownerId: uuid('owner_id').references(() => users.id).notNull(),
    clientOrganisationId: uuid('client_organisation_id'),
    programmeId: uuid('programme_id'),
    templateId: text('template_id'),
    maturity: text('maturity').default('idea').notNull(), // 'idea', 'developing', etc.
    outcome: text('outcome').default('undetermined').notNull(), // 'undetermined', 'delivered', etc.
    rowVersion: integer('row_version').default(1).notNull(),
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid('created_by').references(() => users.id).notNull(),
    updatedBy: uuid('updated_by').references(() => users.id).notNull(),
  },
  (table) => [
    uniqueIndex('project_org_code_idx').on(table.organisationId, table.projectCode),
  ]
);

export const projectStageInstances = pgTable(
  'project_stage_instances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').references(() => projects.id).notNull(),
    organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
    stageNumber: integer('stage_number').notNull(),
    stageName: text('stage_name').notNull(),
    status: text('status').default('not_started').notNull(), // 'not_started', 'in_progress', 'completed'
    progressPercent: integer('progress_percent').default(0).notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('proj_stage_idx').on(table.projectId, table.stageNumber),
  ]
);

export const projectStageActivities = pgTable(
  'project_stage_activities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').references(() => projects.id).notNull(),
    organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
    stageNumber: integer('stage_number').notNull(),
    activityCode: text('activity_code').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    accountableRole: text('accountable_role').notNull(),
    status: text('status').default('not_started').notNull(), // 'not_started', 'in_progress', 'completed', 'blocked'
    evidenceUris: jsonb('evidence_uris').$type<string[]>().default([]).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    completedBy: uuid('completed_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('proj_activity_code_idx').on(table.projectId, table.activityCode),
  ]
);
