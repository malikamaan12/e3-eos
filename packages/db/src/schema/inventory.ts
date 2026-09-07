import { pgTable, text, timestamp, uuid, integer } from 'drizzle-orm/pg-core';
import { organisations, users } from './identity.js';
import { projects } from './projects.js';

export const resources = pgTable('resources', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  resourceCode: text('resource_code').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'serialized', 'bulk'
  totalQuantity: integer('total_quantity').notNull(),
  usableQuantity: integer('usable_quantity').notNull(),
  warehouseLocation: text('warehouse_location').notNull(),
  status: text('status').default('serviceable').notNull(), // 'serviceable', 'in_maintenance', 'quarantined', 'retired'
  authoritativeSystem: text('authoritative_system').default('EOS').notNull(), // 'EOS', 'LEGACY_LOCKED'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const resourceReservations = pgTable('resource_reservations', {
  id: uuid('id').primaryKey().defaultRandom(),
  resourceId: uuid('resource_id').references(() => resources.id).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
  windowEnd: timestamp('window_end', { withTimezone: true }).notNull(),
  quantity: integer('quantity').notNull(),
  status: text('status').default('tentative').notNull(), // 'tentative', 'confirmed', 'released', 'cancelled'
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const maintenanceHolds = pgTable('maintenance_holds', {
  id: uuid('id').primaryKey().defaultRandom(),
  resourceId: uuid('resource_id').references(() => resources.id).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  reason: text('reason').notNull(),
  damageReport: text('damage_report'),
  status: text('status').default('active').notNull(), // 'active', 'cleared'
  quarantinedAt: timestamp('quarantined_at', { withTimezone: true }).defaultNow().notNull(),
  releasedAt: timestamp('released_at', { withTimezone: true }),
  inspectorId: uuid('inspector_id').references(() => users.id),
});

export const subrentalRequests = pgTable('subrental_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  resourceId: uuid('resource_id').references(() => resources.id).notNull(),
  requestedQuantity: integer('requested_quantity').notNull(),
  shortageQuantity: integer('shortage_quantity').notNull(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
  windowEnd: timestamp('window_end', { withTimezone: true }).notNull(),
  estimatedSubrentalCost: text('estimated_subrental_cost').notNull(),
  currency: text('currency').default('QAR').notNull(),
  status: text('status').default('open_exposure').notNull(), // 'open_exposure', 'rfq_issued', 'po_created', 'cancelled'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
