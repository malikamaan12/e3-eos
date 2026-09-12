import { pgTable, text, timestamp, uuid, integer, numeric, boolean, jsonb } from 'drizzle-orm/pg-core';
import { organisations } from './identity.js';

export const workflowDefinitions = pgTable('workflow_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  workflowCode: text('workflow_code').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  stagesJson: jsonb('stages_json').notNull(),
  gatesJson: jsonb('gates_json').default([]).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  version: integer('version').default(1).notNull(),
  status: text('status').default('active').notNull(), // 'active', 'archived', 'draft'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const policySimulationRuns = pgTable('policy_simulation_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  policyName: text('policy_name').notNull(),
  proposedThresholdsJson: jsonb('proposed_thresholds_json').notNull(),
  simulationMetricsJson: jsonb('simulation_metrics_json').notNull(),
  sampleProjectsEvaluated: integer('sample_projects_evaluated').default(0).notNull(),
  recommendedDisposition: text('recommended_disposition').notNull(), // 'recommend_adoption', 'requires_committee_refinement', 'reject_severe_bottleneck'
  runBy: text('run_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const historicalProjectBenchmarks = pgTable('historical_project_benchmarks', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectType: text('project_type').notNull(), // 'summit', 'festival', 'exhibition', 'sports_ceremony', 'corporate_gala'
  venueType: text('venue_type').notNull(), // 'indoor_arena', 'outdoor_stadium', 'convention_centre', 'public_park'
  scaleCapacity: integer('scale_capacity').notNull(),
  durationDays: integer('duration_days').default(1).notNull(),
  currency: text('currency').default('QAR').notNull(),
  totalDirectCost: numeric('total_direct_cost').notNull(),
  costPerCapacity: numeric('cost_per_capacity').notNull(),
  categorySpendBreakdownJson: jsonb('category_spend_breakdown_json').notNull(),
  marginVariancePercent: numeric('margin_variance_percent').notNull(),
  sampleCount: integer('sample_count').default(1).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const countryPackConfigurations = pgTable('country_pack_configurations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  countryCode: text('country_code').notNull(), // 'QA', 'SA', 'AE'
  jurisdiction: text('jurisdiction').notNull(),
  primaryCurrency: text('primary_currency').default('QAR').notNull(),
  vatRatePercent: numeric('vat_rate_percent').default('0').notNull(),
  labourMaxDailyHours: integer('labour_max_daily_hours').default(10).notNull(),
  summerOutdoorWorkRestrictionJson: jsonb('summer_outdoor_work_restriction_json').notNull(),
  zatcaComplianceEnabled: boolean('zatca_compliance_enabled').default(false).notNull(),
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
