import { pgTable, text, timestamp, uuid, integer, boolean } from 'drizzle-orm/pg-core';
import { organisations, users } from './identity.js';
import { projects } from './projects.js';
import { resources } from './inventory.js';

export const productionOrders = pgTable('production_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  designId: uuid('design_id').notNull(),
  designVersionNumber: integer('design_version_number').notNull(),
  title: text('title').notNull(),
  orderedUnits: integer('ordered_units').notNull(),
  completedUnits: integer('completed_units').default(0).notNull(),
  status: text('status').default('queued').notNull(), // 'queued', 'in_progress', 'flagged_for_revision_review', 'completed', 'cancelled'
  builtItemsActualVersion: integer('built_items_actual_version').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const materialIssues = pgTable('material_issues', {
  id: uuid('id').primaryKey().defaultRandom(),
  productionOrderId: uuid('production_order_id').references(() => productionOrders.id).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  resourceId: uuid('resource_id').references(() => resources.id).notNull(),
  quantityIssued: integer('quantity_issued').notNull(),
  issuedBy: uuid('issued_by').references(() => users.id).notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
});

export const productionCheckpoints = pgTable('production_checkpoints', {
  id: uuid('id').primaryKey().defaultRandom(),
  productionOrderId: uuid('production_order_id').references(() => productionOrders.id).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  checkpointName: text('checkpoint_name').notNull(),
  passed: boolean('passed').notNull(),
  notes: text('notes'),
  inspectorId: uuid('inspector_id').references(() => users.id).notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
});
