import { pgTable, text, timestamp, uuid, integer, boolean, jsonb } from 'drizzle-orm/pg-core';
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

export const productionPackages = pgTable('production_packages', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  packageCode: text('package_code').notNull(),
  vendorId: uuid('vendor_id'),
  linkedRequirementId: uuid('linked_requirement_id'),
  approvedDesignRevisionId: uuid('approved_design_revision_id'),
  boqLineIds: jsonb('boq_line_ids').$type<string[]>().default([]).notNull(),
  title: text('title').notNull(),
  quantity: integer('quantity').notNull(),
  completedQuantity: integer('completed_quantity').default(0).notNull(),
  material: text('material').notNull(),
  finish: text('finish'),
  productionOwnerId: uuid('production_owner_id').references(() => users.id).notNull(),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  requiredCompletionDate: timestamp('required_completion_date', { withTimezone: true }).notNull(),
  deliveryDate: timestamp('delivery_date', { withTimezone: true }).notNull(),
  status: text('status').default('not_released').notNull(), // 'not_released', 'approved_for_production', 'material_procurement', 'fabrication', 'assembly', 'finishing', 'qc_inspection', 'rework_required', 'ready_for_dispatch', 'dispatched', 'installed', 'closed'
  fabricationReleasedAt: timestamp('fabrication_released_at', { withTimezone: true }),
  fabricationReleasedBy: uuid('fabrication_released_by').references(() => users.id),
  images: jsonb('images').$type<string[]>().default([]).notNull(),
  documents: jsonb('documents').$type<string[]>().default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const qualityInspections = pgTable('quality_inspections', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  packageId: uuid('package_id').references(() => productionPackages.id).notNull(),
  itemId: text('item_id'),
  inspectorId: uuid('inspector_id').references(() => users.id).notNull(),
  inspectionDate: timestamp('inspection_date', { withTimezone: true }).notNull(),
  inspectionType: text('inspection_type').notNull(), // 'factory_acceptance', 'site_receipt', 'pre_dispatch', 'installation', 'final_handover'
  checklist: jsonb('checklist').default([]).notNull(),
  result: text('result').default('passed').notNull(), // 'passed', 'failed', 'conditional'
  photos: jsonb('photos').$type<string[]>().default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const snags = pgTable('snags', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  packageId: uuid('package_id').references(() => productionPackages.id),
  inspectionId: uuid('inspection_id').references(() => qualityInspections.id),
  title: text('title').notNull(),
  description: text('description'),
  severity: text('severity').default('minor').notNull(), // 'critical', 'major', 'minor', 'observation'
  status: text('status').default('open').notNull(), // 'open', 'assigned', 'in_progress', 'ready_for_reinspection', 'resolved', 'accepted', 'reopened'
  assignedTo: uuid('assigned_to').references(() => users.id),
  dueDate: timestamp('due_date', { withTimezone: true }),
  resolutionNotes: text('resolution_notes'),
  blocksDispatch: boolean('blocks_dispatch').default(false).notNull(),
  blocksReadiness: boolean('blocks_readiness').default(false).notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
