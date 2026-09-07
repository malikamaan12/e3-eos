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
