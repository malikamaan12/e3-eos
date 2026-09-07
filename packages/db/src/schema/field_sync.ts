import { pgTable, text, timestamp, uuid, boolean, integer, jsonb } from 'drizzle-orm/pg-core';
import { organisations, users } from './identity.js';

export const fieldSyncBatches = pgTable('field_sync_batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  deviceId: text('device_id').notNull(),
  syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull(),
  status: text('status').default('completed').notNull(), // 'completed', 'failed'
});

export const fieldOperations = pgTable('field_operations', {
  id: uuid('id').primaryKey().defaultRandom(),
  batchId: uuid('batch_id').references(() => fieldSyncBatches.id).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  clientOperationId: text('client_operation_id').notNull(),
  entityType: text('entity_type').notNull(),
  action: text('action').notNull(),
  clientTimestamp: timestamp('client_timestamp', { withTimezone: true }).notNull(),
  workerId: uuid('worker_id').references(() => users.id).notNull(),
  payload: jsonb('payload').notNull(),
  resultStatus: text('result_status').notNull(), // 'applied', 'duplicate_ignored', 'observation_flagged_for_review', 'rejected'
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const fieldMediaUploads = pgTable('field_media_uploads', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  uploadId: text('upload_id').notNull(),
  storageKey: text('storage_key').notNull(),
  expectedBytes: integer('expected_bytes').notNull(),
  receivedBytes: integer('received_bytes').default(0).notNull(),
  isBinaryComplete: boolean('is_binary_complete').default(false).notNull(),
  linkedTaskOrInspectionId: text('linked_task_or_inspection_id').notNull(),
  status: text('status').default('pending_binary').notNull(), // 'pending_binary', 'completed'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
