import { pgTable, text, timestamp, uuid, integer, jsonb } from 'drizzle-orm/pg-core';
import { organisations, users } from './identity.js';
import { projects } from './projects.js';

export const warehouses = pgTable('warehouses', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  warehouseCode: text('warehouse_code').notNull(),
  name: text('name').notNull(),
  country: text('country').default('Qatar').notNull(),
  city: text('city').default('Doha').notNull(),
  address: text('address').notNull(),
  zones: jsonb('zones').$type<string[]>().default(['AV', 'Lighting', 'Scenic', 'Furniture', 'Games', 'Branding', 'Tools', 'Consumables', 'Quarantine', 'Returns']).notNull(),
  capacity: text('capacity').default('10,000 sq m').notNull(),
  managerId: uuid('manager_id').references(() => users.id),
  operatingHours: text('operating_hours').default('07:00 - 19:00').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  assetTag: text('asset_tag').notNull(),
  barcode: text('barcode').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  subcategory: text('subcategory'),
  brand: text('brand'),
  model: text('model'),
  serialNumber: text('serial_number'),
  quantity: integer('quantity').default(1).notNull(),
  unit: text('unit').default('units').notNull(),
  ownership: text('ownership').default('e3_owned').notNull(), // 'e3_owned', 'vendor_rental', 'client_owned', 'project_purchased', 'consignment'
  warehouseId: uuid('warehouse_id').references(() => warehouses.id),
  zone: text('zone').default('General').notNull(),
  location: text('location').default('Bay 01').notNull(),
  condition: text('condition').default('serviceable').notNull(), // 'new', 'good', 'serviceable', 'needs_maintenance', 'damaged', 'quarantined', 'retired'
  availability: text('availability').default('available').notNull(), // 'available', 'reserved', 'allocated', 'dispatched', 'on_site', 'returned', 'damaged', 'unavailable'
  purchaseValue: text('purchase_value').default('0').notNull(),
  replacementValue: text('replacement_value').default('0').notNull(),
  maintenanceStatus: text('maintenance_status').default('Up to date').notNull(),
  lastInspectionDate: timestamp('last_inspection_date', { withTimezone: true }),
  nextInspectionDate: timestamp('next_inspection_date', { withTimezone: true }),
  images: jsonb('images').$type<string[]>().default([]).notNull(),
  documents: jsonb('documents').$type<string[]>().default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const assetAllocations = pgTable('asset_allocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  assetId: uuid('asset_id').references(() => assets.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  procurementRequirementId: uuid('procurement_requirement_id'),
  boqLineId: uuid('boq_line_id'),
  allocatedQuantity: integer('allocated_quantity').notNull(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
  windowEnd: timestamp('window_end', { withTimezone: true }).notNull(),
  status: text('status').default('confirmed').notNull(), // 'tentative', 'confirmed', 'released', 'returned'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const warehouseMovements = pgTable('warehouse_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  assetId: uuid('asset_id').references(() => assets.id).notNull(),
  source: text('source').notNull(),
  destination: text('destination').notNull(),
  movementType: text('movement_type').notNull(), // 'received', 'stored', 'allocated', 'picked', 'packed', 'dispatched', 'on_site', 'returned', 'inspected', 'restocked'
  quantity: integer('quantity').default(1).notNull(),
  condition: text('condition').default('good').notNull(),
  projectId: uuid('project_id').references(() => projects.id),
  evidenceUris: jsonb('evidence_uris').$type<string[]>().default([]).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  notes: text('notes'),
});


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
