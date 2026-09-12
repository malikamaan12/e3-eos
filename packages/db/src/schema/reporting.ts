import { pgTable, text, timestamp, uuid, integer, boolean, jsonb } from 'drizzle-orm/pg-core';
import { organisations, users } from './identity.js';
import { projects } from './projects.js';

export const projectReports = pgTable('project_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  reportCode: text('report_code').notNull(),
  version: integer('version').default(1).notNull(),
  targetAudience: text('target_audience').default('client_portal').notNull(), // 'internal_command', 'client_portal', 'public_report'
  publishedAt: timestamp('published_at', { withTimezone: true }).defaultNow().notNull(),
  deterministicContentHash: text('deterministic_content_hash').notNull(),
  isPublished: boolean('is_published').default(false).notNull(),
  content: jsonb('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const reportRevisions = pgTable('report_revisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  reportId: uuid('report_id').references(() => projectReports.id).notNull(),
  version: integer('version').notNull(),
  revisionReason: text('revision_reason').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }).defaultNow().notNull(),
  content: jsonb('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const projectCloseouts = pgTable('project_closeouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  operationalStatus: text('operational_status').default('active').notNull(), // 'active', 'operational_closed'
  operationalClosedAt: timestamp('operational_closed_at', { withTimezone: true }),
  operationalClosedBy: uuid('operational_closed_by').references(() => users.id),
  acceptanceStatus: text('acceptance_status').default('pending').notNull(),
  reportingStatus: text('reporting_status').default('draft').notNull(),
  financialReviewStatus: text('financial_review_status').default('pending').notNull(),
  settlementStatus: text('settlement_status').default('open_receivables').notNull(), // 'open_receivables', 'fully_settled'
  openReceivablesCount: integer('open_receivables_count').default(0).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const projectLessons = pgTable('project_lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  narrative: text('narrative').notNull(),
  policyRevisionProposed: boolean('policy_revision_proposed').default(false).notNull(),
  masterPolicyModified: boolean('master_policy_modified').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================================
// SPRINT 05: CLIENT RESULTS ROOM, POST-EVENT REPORTS, KPIS & KNOWLEDGE TABLES
// ============================================================================

export const clientResultsRooms = pgTable('client_results_rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  status: text('status').default('draft').notNull(), // 'draft', 'published', 'archived'
  publishedAt: timestamp('published_at', { withTimezone: true }),
  projectOverviewJson: jsonb('project_overview_json').notNull(),
  deliveredScopeJson: jsonb('delivered_scope_json').notNull(),
  curatedPhotosJson: jsonb('curated_photos_json').default([]).notNull(),
  attendanceMetricsJson: jsonb('attendance_metrics_json').notNull(),
  executiveHighlightsJson: jsonb('executive_highlights_json').notNull(),
  clientBillingStatusJson: jsonb('client_billing_status_json'),
  serverRedactionVerified: boolean('server_redaction_verified').default(true).notNull(),
  publishedBy: text('published_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const postEventReports = pgTable('post_event_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  reportTitle: text('report_title').notNull(),
  sectionsJson: jsonb('sections_json').notNull(),
  isFinalized: boolean('is_finalized').default(false).notNull(),
  finalizedAt: timestamp('finalized_at', { withTimezone: true }),
  finalizedBy: text('finalized_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const projectKpis = pgTable('project_kpis', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  kpiCode: text('kpi_code').notNull(),
  name: text('name').notNull(),
  targetValue: text('target_value').notNull(),
  actualValue: text('actual_value').notNull(),
  measurementMethod: text('measurement_method').notNull(),
  status: text('status').default('measuring').notNull(), // 'not_started', 'measuring', 'met', 'partially_met', 'missed', 'exception_accepted'
  evidenceReference: text('evidence_reference'),
  evaluatedAt: timestamp('evaluated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const clientFeedbackRecords = pgTable('client_feedback_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  clientRepresentative: text('client_representative').notNull(),
  surveyMethod: text('survey_method').notNull(), // 'portal_survey', 'structured_meeting', 'client_signoff', 'free_text'
  overallRating: integer('overall_rating').notNull(),
  npsScore: integer('nps_score'),
  feedbackComments: text('feedback_comments').notNull(),
  clientSignoffUri: text('client_signoff_uri'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
});

export const lessonsLearned = pgTable('lessons_learned', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  category: text('category').notNull(), // 'commercial', 'procurement', 'production', 'logistics', 'design', 'venue', 'client', 'hse', 'staffing', 'technical', 'marketing'
  observation: text('observation').notNull(),
  rootCause: text('root_cause').notNull(),
  impact: text('impact').notNull(),
  recommendation: text('recommendation').notNull(),
  reusableAcrossProjects: boolean('reusable_across_projects').default(true).notNull(),
  applicableProjectTypes: jsonb('applicable_project_types').default([]).notNull(),
  loggedBy: text('logged_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const vendorPerformanceEvaluations = pgTable('vendor_performance_evaluations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  vendorId: uuid('vendor_id').notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  priceScore: integer('price_score').notNull(),
  qualityScore: integer('quality_score').notNull(),
  deliveryScore: integer('delivery_score').notNull(),
  responsivenessScore: integer('responsiveness_score').notNull(),
  hseScore: integer('hse_score').notNull(),
  averageScore: text('average_score').notNull(),
  evaluatorName: text('evaluator_name').notNull(),
  recommendForFutureProjects: boolean('recommend_for_future_projects').default(true).notNull(),
  narrativeComments: text('narrative_comments'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
