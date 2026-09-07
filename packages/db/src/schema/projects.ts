import { pgTable, text, timestamp, uuid, integer, uniqueIndex } from 'drizzle-orm/pg-core';
import { organisations, users } from './identity.js';

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
    projectCode: text('project_code').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    originCode: text('origin_code').notNull(),
    ownerId: uuid('owner_id').references(() => users.id).notNull(),
    clientOrganisationId: uuid('client_organisation_id'),
    programmeId: uuid('programme_id'),
    templateId: text('template_id'),
    maturity: text('maturity').default('idea').notNull(), // 'idea', 'developing', etc.
    outcome: text('outcome').default('undetermined').notNull(), // 'undetermined', 'delivered', etc.
    rowVersion: integer('row_version').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid('created_by').references(() => users.id).notNull(),
    updatedBy: uuid('updated_by').references(() => users.id).notNull(),
  },
  (table) => [
    uniqueIndex('project_org_code_idx').on(table.organisationId, table.projectCode),
  ]
);
