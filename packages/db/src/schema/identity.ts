import { pgTable, text, timestamp, uuid, boolean, uniqueIndex, jsonb, integer } from 'drizzle-orm/pg-core';

export const organisations = pgTable('organisations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const legalEntities = pgTable('legal_entities', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  name: text('name').notNull(),
  countryCode: text('country_code').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  isSuperAdmin: boolean('is_super_admin').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
    userId: uuid('user_id').references(() => users.id).notNull(),
    role: text('role').notNull(), // 'pm', 'finance', 'commercial_director', 'client_viewer', etc.
    audience: text('audience').default('internal').notNull(), // 'internal' | 'client' | 'supplier'
    isRevoked: boolean('is_revoked').default(false).notNull(),
    rowVersion: integer('row_version').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('membership_org_user_idx').on(table.organisationId, table.userId),
  ]
);

export const userInvitations = pgTable('user_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  department: text('department'),
  token: text('token'),
  tokenHash: text('token_hash').unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  lifecycleStatus: text('lifecycle_status').default('legacy_unverified').notNull(),
  audience: text('audience'),
  invitedBy: uuid('invited_by').references(() => users.id),
  inviterMembershipId: uuid('inviter_membership_id').references(() => memberships.id),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancelledBy: uuid('cancelled_by').references(() => users.id),
  acceptedBy: uuid('accepted_by').references(() => users.id),
  acceptanceMode: text('acceptance_mode'),
  deliveryEventId: text('delivery_event_id'),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const passwordResets = pgTable('password_resets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: text('token'),
  tokenHash: text('token_hash').unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userMfa = pgTable('user_mfa', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  secret: text('secret').notNull(),
  isEnabled: boolean('is_enabled').default(false).notNull(),
  recoveryCodes: jsonb('recovery_codes').default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').default('info').notNull(), // 'task', 'approval', 'system', 'mention'
  link: text('link'),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
