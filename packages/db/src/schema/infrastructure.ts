import { pgTable, text, timestamp, uuid, integer, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';
import { organisations, users } from './identity.js';

export const idempotencyRecords = pgTable(
  'idempotency_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull(),
    organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
    actorId: uuid('actor_id').references(() => users.id).notNull(),
    operation: text('operation').notNull(),
    requestHash: text('request_hash').notNull(), // SHA-256 of request payload
    statusCode: integer('status_code').notNull(),
    responseBody: jsonb('response_body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idempotency_key_org_idx').on(table.organisationId, table.key),
  ]
);

export const outbox = pgTable('outbox', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: text('event_id').notNull().unique(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id'),
  eventType: text('event_type').notNull(), // e.g. "project.created.v1"
  payload: jsonb('payload').notNull(),
  status: text('status').default('pending').notNull(), // 'pending', 'dispatched', 'failed'
  retryCount: integer('retry_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
});

export const inbox = pgTable('inbox', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: text('message_id').notNull().unique(),
  source: text('source').notNull(),
  payload: jsonb('payload').notNull(),
  status: text('status').default('received').notNull(), // 'received', 'processed', 'ignored'
  processedAt: timestamp('processed_at', { withTimezone: true }),
});

export const auditEvents = pgTable('audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id'),
  actorId: uuid('actor_id').notNull(),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  targetVersion: integer('target_version'),
  payloadDigest: text('payload_digest').notNull(), // SHA-256 of audited transition
  previousDigest: text('previous_digest'), // Blockchain-style or linked digest for tamper evidence
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const reservationLocks = pgTable('reservation_locks', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  resourceId: uuid('resource_id').notNull(),
  projectId: uuid('project_id').notNull(),
  state: text('state').notNull(), // 'held', 'confirmed', 'in_use', 'released', 'cancelled'
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
