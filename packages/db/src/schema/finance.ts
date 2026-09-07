import { pgTable, text, timestamp, uuid, integer, boolean, numeric } from 'drizzle-orm/pg-core';
import { organisations } from './identity.js';
import { projects } from './projects.js';

export const costImports = pgTable('cost_imports', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  sourceSystem: text('source_system').notNull(),
  batchId: text('batch_id').notNull(),
  fileHash: text('file_hash').notNull(),
  recordCount: integer('record_count').notNull(),
  totalAmount: numeric('total_amount').notNull(),
  currency: text('currency').default('QAR').notNull(),
  status: text('status').default('imported').notNull(), // 'imported', 'reconciled', 'quarantined'
  importedAt: timestamp('imported_at', { withTimezone: true }).defaultNow().notNull(),
});

export const costAllocations = pgTable('cost_allocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  invoiceId: text('invoice_id').notNull(),
  lineId: text('line_id').notNull(),
  packageId: text('package_id').notNull(),
  amount: numeric('amount').notNull(),
  currency: text('currency').default('QAR').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  poId: text('po_id'),
  invoiceNumber: text('invoice_number').notNull(),
  amount: numeric('amount').notNull(),
  currency: text('currency').default('QAR').notNull(),
  ledgerStatus: text('ledger_status').default('pending_sync').notNull(), // 'pending_sync', 'synced', 'quarantined_by_ledger', 'rejected_by_ledger'
  quarantineReason: text('quarantine_reason'),
  isPaid: boolean('is_paid').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const billingRequests = pgTable('billing_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  milestoneId: text('milestone_id').notNull(),
  amount: numeric('amount').notNull(),
  currency: text('currency').default('QAR').notNull(),
  status: text('status').default('draft').notNull(), // 'draft', 'submitted', 'approved', 'settled'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const creditNotes = pgTable('credit_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  invoiceId: text('invoice_id').notNull(),
  creditAmount: numeric('credit_amount').notNull(),
  currency: text('currency').default('QAR').notNull(),
  reason: text('reason').notNull(),
  effectiveDate: timestamp('effective_date', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
