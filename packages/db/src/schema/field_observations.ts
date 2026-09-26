import { pgTable, text, timestamp, uuid, integer } from 'drizzle-orm/pg-core';
import { organisations, users } from './identity.js';
import { auditEvents, outbox } from './infrastructure.js';

// Composite scope FKs, operation uniqueness, state checks and append-only
// protection are installed by migration 0023. Client time/device are claims.
export const fieldObservations = pgTable('field_observations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').notNull(),
  actorId: uuid('actor_id').references(() => users.id).notNull(),
  clientOperationId: uuid('client_operation_id').notNull(),
  deviceId: uuid('device_id').notNull(),
  capturedAt: timestamp('captured_at', { withTimezone: true }).notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
  taskId: uuid('task_id'),
  baseVersion: integer('base_version'),
  currentTaskVersion: integer('current_task_version'),
  note: text('note').notNull(),
  reason: text('reason').notNull(),
  payloadHash: text('payload_hash').notNull(),
  status: text('status').notNull(),
  auditEventId: uuid('audit_event_id').references(() => auditEvents.id).notNull(),
  eventId: text('event_id').references(() => outbox.eventId).notNull(),
});
