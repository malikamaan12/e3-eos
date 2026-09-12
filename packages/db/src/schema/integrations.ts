import { pgTable, text, timestamp, uuid, integer, boolean } from 'drizzle-orm/pg-core';
import { organisations } from './identity.js';
import { projects } from './projects.js';

export const externalConnectors = pgTable('external_connectors', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  connectorType: text('connector_type').notNull(), // 'BookingQube', 'Metricool', 'GoogleCalendar'
  status: text('status').default('active').notNull(), // 'active', 'provisional_manual_import', 'stale_external_feed', 'disabled'
  hasApiAccess: boolean('has_api_access').default(true).notNull(),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  freshnessDisclosure: text('freshness_disclosure'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  provider: text('provider').notNull(),
  eventId: text('event_id').notNull(),
  status: text('status').default('processed').notNull(), // 'processed', 'duplicate_replay_ignored', 'quarantined'
  processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
});

export const calendarProposals = pgTable('calendar_proposals', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  externalEventId: text('external_event_id').notNull(),
  status: text('status').default('pending_pm_review').notNull(), // 'pending_pm_review', 'accepted_and_applied', 'rejected'
  externalChangeSummary: text('external_change_summary').notNull(),
  baselineStart: timestamp('baseline_start', { withTimezone: true }).notNull(),
  baselineEnd: timestamp('baseline_end', { withTimezone: true }).notNull(),
  externalStart: timestamp('external_start', { withTimezone: true }).notNull(),
  externalEnd: timestamp('external_end', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const metricObservations = pgTable('metric_observations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  metricType: text('metric_type').notNull(), // 'turnstile_entries', 'daily_unique_attendees', 'overall_unique_attendees'
  turnstileScans: integer('turnstile_scans').notNull(),
  uniqueAttendees: integer('unique_attendees').notNull(),
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================================
// SPRINT 05: CONNECTOR FRAMEWORK & RECONCILIATION ENGINE TABLES
// ============================================================================

export const enterpriseConnectors = pgTable('enterprise_connectors', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  connectorType: text('connector_type').notNull(), // 'erp_accounting', 'm365', 'google_workspace', 'crm', 'ticketing', 'marketing'
  connectorName: text('connector_name').notNull(),
  systemOfRecordDomain: text('system_of_record_domain').notNull(),
  status: text('status').default('connected').notNull(), // 'connected', 'degraded', 'disconnected', 'auth_required', 'error', 'disabled'
  endpointUrl: text('endpoint_url'),
  syncIntervalMinutes: integer('sync_interval_minutes').default(60).notNull(),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  recordsProcessed: integer('records_processed').default(0).notNull(),
  failedRecords: integer('failed_records').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const reconciliationExceptions = pgTable('reconciliation_exceptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  connectorId: uuid('connector_id').references(() => enterpriseConnectors.id).notNull(),
  entityType: text('entity_type').notNull(), // 'supplier_invoice', 'payment', 'calendar_cue', 'document_link'
  externalId: text('external_id').notNull(),
  eosId: text('eos_id'),
  mismatchType: text('mismatch_type').notNull(), // 'duplicate_record', 'amount_mismatch', 'missing_reference', 'orphaned_document'
  externalPayload: text('external_payload').notNull(),
  eosPayload: text('eos_payload'),
  status: text('status').default('pending').notNull(), // 'pending', 'resolved', 'quarantined'
  resolutionAction: text('resolution_action'), // 'override_with_eos', 'accept_external', 'quarantine', 'manual_adjustment'
  justification: text('justification'),
  resolvedBy: text('resolved_by'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
