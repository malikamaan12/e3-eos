import { pgTable, uuid, integer, jsonb, text, timestamp } from 'drizzle-orm/pg-core';
import { organisations, users } from './identity.js';
import { taskInstances, dependencyEdges } from './work.js';
export const schedulePlanRecords = pgTable('schedule_plan_records', {
  id:uuid('id').primaryKey(), organisationId:uuid('organisation_id').references(()=>organisations.id).notNull(),
  projectId:uuid('project_id').notNull(), kind:text('kind').notNull(), title:text('title').notNull(), payload:jsonb('payload').notNull(),
  rowVersion:integer('row_version').default(1).notNull(), currentRevisionId:uuid('current_revision_id'),
  createdBy:uuid('created_by').references(()=>users.id).notNull(), createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull(),
  updatedAt:timestamp('updated_at',{withTimezone:true}).defaultNow().notNull(),
});
export const schedulePlanRevisions = pgTable('schedule_plan_revisions', {
  id:uuid('id').primaryKey(), organisationId:uuid('organisation_id').references(()=>organisations.id).notNull(),
  projectId:uuid('project_id').notNull(), recordId:uuid('record_id').references(()=>schedulePlanRecords.id).notNull(),
  revisionNumber:integer('revision_number').notNull(), snapshot:jsonb('snapshot').notNull(), snapshotHash:text('snapshot_hash').notNull(),
  reason:text('reason').notNull(), actorId:uuid('actor_id').references(()=>users.id).notNull(), createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull(),
});
export const taskForecastRevisions = pgTable('task_forecast_revisions', {
  id:uuid('id').primaryKey(), organisationId:uuid('organisation_id').references(()=>organisations.id).notNull(),
  projectId:uuid('project_id').notNull(), taskId:uuid('task_id').references(()=>taskInstances.id).notNull(),
  revisionNumber:integer('revision_number').notNull(), snapshot:jsonb('snapshot').notNull(), snapshotHash:text('snapshot_hash').notNull(),
  reason:text('reason').notNull(), actorId:uuid('actor_id').references(()=>users.id).notNull(), createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull(),
});
export const dependencyChanges = pgTable('dependency_changes', {
  id:uuid('id').primaryKey(), organisationId:uuid('organisation_id').references(()=>organisations.id).notNull(),
  projectId:uuid('project_id').notNull(), dependencyId:uuid('dependency_id').references(()=>dependencyEdges.id).notNull(),
  revisionNumber:integer('revision_number').notNull(), action:text('action').notNull(), snapshot:jsonb('snapshot').notNull(), snapshotHash:text('snapshot_hash').notNull(),
  reason:text('reason').notNull(), actorId:uuid('actor_id').references(()=>users.id).notNull(), createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull(),
});
