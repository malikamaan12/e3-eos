import { pgTable, text, timestamp, uuid, integer, jsonb } from 'drizzle-orm/pg-core';
import { organisations, users } from './identity.js';
import { projects } from './projects.js';

export const approvalRequests = pgTable('approval_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  targetVersionId: uuid('target_version_id').notNull(),
  targetHash: text('target_hash').notNull(),
  trigger: text('trigger').notNull(),
  status: text('status').default('pending').notNull(), // 'pending', 'approved', 'rejected'
  requestedBy: uuid('requested_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const approvalDecisions = pgTable('approval_decisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id').references(() => approvalRequests.id).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  deciderId: uuid('decider_id').references(() => users.id).notNull(),
  outcome: text('outcome').notNull(), // 'approved', 'rejected', 'changes_requested'
  targetHash: text('target_hash').notNull(),
  acknowledgedConditions: jsonb('acknowledged_conditions').default([]).notNull(),
  comment: text('comment'),
  decidedAt: timestamp('decided_at', { withTimezone: true }).defaultNow().notNull(),
});

export const exceptionAuthorisations = pgTable('exception_authorisations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  targetVersionId: uuid('target_version_id').notNull(),
  targetHash: text('target_hash').notNull(),
  targetRuleId: text('target_rule_id').notNull(),
  maxUses: integer('max_uses').default(1).notNull(),
  usedCount: integer('used_count').default(0).notNull(),
  validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
  validUntil: timestamp('valid_until', { withTimezone: true }).notNull(),
  status: text('status').default('authorised').notNull(), // 'authorised', 'consumed', 'expired', 'revoked'
  reviewOwnerId: uuid('review_owner_id').references(() => users.id).notNull(),
  reviewDueAt: timestamp('review_due_at', { withTimezone: true }).notNull(),
  reviewStatus: text('review_status').default('open').notNull(), // 'open', 'in_review', 'closed'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const exceptionUses = pgTable('exception_uses', {
  id: uuid('id').primaryKey().defaultRandom(),
  exceptionId: uuid('exception_id').references(() => exceptionAuthorisations.id).notNull(),
  actionTargetId: text('action_target_id').notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }).defaultNow().notNull(),
  usedBy: uuid('used_by').references(() => users.id).notNull(),
});
