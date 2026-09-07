import { pgTable, text, timestamp, uuid, integer, boolean, jsonb } from 'drizzle-orm/pg-core';
import { organisations } from './identity.js';

export const productionGates = pgTable('production_gates', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  environment: text('environment').notNull(), // 'production', 'staging', 'development'
  canGoLive: boolean('can_go_live').notNull(),
  blockers: jsonb('blockers').notNull(),
  verifiedConnectorsCount: integer('verified_connectors_count').default(0).notNull(),
  evaluatedAt: timestamp('evaluated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const compensatingTransactions = pgTable('compensating_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  poId: text('po_id').notNull(),
  originalStatus: text('original_status').notNull(),
  actionType: text('action_type').notNull(), // 'compensating_cancellation_issued', 'credit_memo_requested'
  reason: text('reason').notNull(),
  externalSupplierAcknowledged: boolean('external_supplier_acknowledged').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const backupManifests = pgTable('backup_manifests', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  backupSnapshotId: text('backup_snapshot_id').notNull(),
  isReconciled: boolean('is_reconciled').notNull(),
  discrepancies: jsonb('discrepancies').notNull(),
  evaluatedAt: timestamp('evaluated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const supportRunbookLogs = pgTable('support_runbook_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  incidentType: text('incident_type').notNull(),
  actionTaken: text('action_taken').notNull(),
  isAuditPreserved: boolean('is_audit_preserved').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
