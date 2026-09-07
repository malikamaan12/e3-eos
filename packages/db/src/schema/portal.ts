import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';
import { organisations, users } from './identity.js';
import { projects } from './projects.js';

export const publications = pgTable('publications', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  clientOrganisationId: uuid('client_organisation_id').references(() => organisations.id).notNull(),
  roomType: text('room_type').notNull(), // 'concept', 'milestones', 'commercial', 'results'
  title: text('title').notNull(),
  titleAr: text('title_ar'),
  targetVersionId: text('target_version_id').notNull(),
  targetHash: text('target_hash').notNull(),
  projectionPayload: jsonb('projection_payload').notNull(),
  status: text('status').default('published').notNull(), // 'published', 'withdrawn'
  withdrawalReason: text('withdrawal_reason'),
  publishedAt: timestamp('published_at', { withTimezone: true }).defaultNow().notNull(),
  withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
});

export const clientDecisions = pgTable('client_decisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  publicationId: uuid('publication_id').references(() => publications.id).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  clientUserId: uuid('client_user_id').references(() => users.id).notNull(),
  decision: text('decision').notNull(), // 'accepted', 'rejected', 'revision_requested'
  targetHash: text('target_hash').notNull(),
  comment: text('comment'),
  acceptanceClassification: text('acceptance_classification').default('native_portal_decision').notNull(),
  legalNotice: text('legal_notice').notNull(),
  decidedAt: timestamp('decided_at', { withTimezone: true }).defaultNow().notNull(),
});
