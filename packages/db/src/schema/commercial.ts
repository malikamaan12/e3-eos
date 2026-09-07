import { pgTable, text, timestamp, uuid, boolean, integer } from 'drizzle-orm/pg-core';
import { organisations } from './identity.js';
import { projects } from './projects.js';

export const estimates = pgTable('estimates', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  name: text('name').notNull(),
  currency: text('currency').default('QAR').notNull(),
  status: text('status').default('draft').notNull(), // 'draft', 'approved', 'superseded'
  totalCost: text('total_cost'),
  totalSell: text('total_sell'),
  marginPercent: text('margin_percent'),
  markupPercent: text('markup_percent'),
  versionNumber: integer('version_number').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const boqLines = pgTable('boq_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  estimateId: uuid('estimate_id').references(() => estimates.id).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  lineCode: text('line_code').notNull(),
  description: text('description').notNull(),
  descriptionAr: text('description_ar'),
  quantity: text('quantity').notNull(),
  uom: text('uom').notNull(),
  unitCost: text('unit_cost').notNull(),
  unitSell: text('unit_sell').notNull(),
  durationMultiplier: text('duration_multiplier').default('1').notNull(),
  isLumpSum: boolean('is_lump_sum').default(false).notNull(),
  parentLineId: uuid('parent_line_id'),
  allocatedLumpSumPortion: text('allocated_lump_sum_portion'),
  discountPercent: text('discount_percent').default('0'),
  taxRate: text('tax_rate').default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const proposals = pgTable('proposals', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  estimateId: uuid('estimate_id').references(() => estimates.id).notNull(),
  proposalCode: text('proposal_code').notNull(),
  title: text('title').notNull(),
  clientOrganisationId: uuid('client_organisation_id').references(() => organisations.id).notNull(),
  totalSell: text('total_sell').notNull(),
  currency: text('currency').default('QAR').notNull(),
  status: text('status').default('draft').notNull(), // 'draft', 'submitted', 'accepted', 'rejected', 'superseded'
  contentHash: text('content_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const variations = pgTable('variations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  variationCode: text('variation_code').notNull(),
  title: text('title').notNull(),
  titleAr: text('title_ar'),
  scopeDescription: text('scope_description').notNull(),
  costImpact: text('cost_impact').notNull(),
  sellImpact: text('sell_impact').notNull(),
  timeImpactDays: integer('time_impact_days').default(0).notNull(),
  status: text('status').default('draft').notNull(), // 'draft', 'pending_internal_approval', 'internally_approved', 'submitted_to_client', 'client_approved', 'rejected'
  clientDecisionId: uuid('client_decision_id'),
  contentHash: text('content_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const contracts = pgTable('contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  contractCode: text('contract_code').notNull(),
  clientOrganisationId: uuid('client_organisation_id').references(() => organisations.id).notNull(),
  authorisedValue: text('authorised_value').notNull(),
  currency: text('currency').default('QAR').notNull(),
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
