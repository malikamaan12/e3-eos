import { pgTable, text, timestamp, uuid, integer, numeric, jsonb } from 'drizzle-orm/pg-core';
import { organisations } from './identity.js';
import { projects } from './projects.js';

export const portfolioScenarios = pgTable('portfolio_scenarios', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').default('draft').notNull(), // 'draft', 'applied', 'rejected'
  proposedAllocations: jsonb('proposed_allocations').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const ruleAnalytics = pgTable('rule_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  ruleId: text('rule_id').notNull(),
  ruleName: text('rule_name').notNull(),
  totalEvaluations: integer('total_evaluations').default(0).notNull(),
  overrideCount: integer('override_count').default(0).notNull(),
  approvedExceptionCount: integer('approved_exception_count').default(0).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const evmBaselines = pgTable('evm_baselines', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  packageId: text('package_id').notNull(),
  plannedValue: numeric('planned_value').notNull(),
  actualCost: numeric('actual_cost').notNull(),
  physicalCompletionPercent: integer('physical_completion_percent').default(0).notNull(),
  hoursLogged: integer('hours_logged').default(0).notNull(),
  hoursBudgeted: integer('hours_budgeted').notNull(),
  currency: text('currency').default('QAR').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const aiDrafts = pgTable('ai_drafts', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  documentType: text('document_type').notNull(),
  classification: text('classification').default('internal').notNull(),
  sanitizedContent: text('sanitized_content').notNull(),
  injectionsDetected: integer('injections_detected').default(0).notNull(),
  extractedRequirements: jsonb('extracted_requirements').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const countryCells = pgTable('country_cells', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  cellCode: text('cell_code').notNull(),
  countryCode: text('country_code').notNull(),
  jurisdiction: text('jurisdiction').notNull(),
  primaryCurrency: text('primary_currency').default('QAR').notNull(),
  dataProcessingRegion: text('data_processing_region').notNull(),
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
