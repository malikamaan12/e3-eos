import { pgTable, text, timestamp, uuid, integer, boolean, numeric, jsonb } from 'drizzle-orm/pg-core';
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

// ============================================================================
// SPRINT 05: SUPPLIER INVOICES, THREE-WAY MATCH, OCR & COMMERCIAL TABLES
// ============================================================================

export const supplierInvoices = pgTable('supplier_invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  vendorId: uuid('vendor_id').notNull(),
  poId: uuid('po_id'),
  invoiceNumber: text('invoice_number').notNull(),
  invoiceDate: timestamp('invoice_date', { withTimezone: true }).notNull(),
  receivedDate: timestamp('received_date', { withTimezone: true }).defaultNow().notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }),
  currency: text('currency').default('QAR').notNull(),
  amountExcludingTax: numeric('amount_excluding_tax').notNull(),
  taxAmount: numeric('tax_amount').default('0').notNull(),
  totalAmount: numeric('total_amount').notNull(),
  paymentTerms: text('payment_terms').default('30_days_net').notNull(),
  status: text('status').default('received').notNull(), // 'received', 'under_review', 'match_exception', 'approved', 'partially_approved', 'rejected', 'payment_scheduled', 'paid', 'disputed', 'cancelled'
  threeWayMatchStatus: text('three_way_match_status').default('pending').notNull(), // 'pending', 'matched', 'exception_detected', 'waived'
  supportingDocUri: text('supporting_doc_uri'),
  disputedAmount: numeric('disputed_amount').default('0').notNull(),
  approvedAmount: numeric('approved_amount').default('0').notNull(),
  paidAmount: numeric('paid_amount').default('0').notNull(),
  balanceRemaining: numeric('balance_remaining').notNull(),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const supplierInvoiceLines = pgTable('supplier_invoice_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  supplierInvoiceId: uuid('supplier_invoice_id').references(() => supplierInvoices.id).notNull(),
  poLineId: uuid('po_line_id'),
  description: text('description').notNull(),
  quantity: numeric('quantity').notNull(),
  unitCost: numeric('unit_cost').notNull(),
  totalCost: numeric('total_cost').notNull(),
  taxRate: numeric('tax_rate').default('0').notNull(),
  matchExceptionReason: text('match_exception_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const threeWayMatches = pgTable('three_way_matches', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  supplierInvoiceId: uuid('supplier_invoice_id').references(() => supplierInvoices.id).notNull(),
  poId: uuid('po_id').notNull(),
  receiptId: uuid('receipt_id'),
  overallMatch: boolean('overall_match').notNull(),
  quantityMismatch: boolean('quantity_mismatch').default(false).notNull(),
  rateMismatch: boolean('rate_mismatch').default(false).notNull(),
  taxMismatch: boolean('tax_mismatch').default(false).notNull(),
  duplicateDetected: boolean('duplicate_detected').default(false).notNull(),
  exceedsPoAmount: boolean('exceeds_po_amount').default(false).notNull(),
  serviceUnacknowledged: boolean('service_unacknowledged').default(false).notNull(),
  discrepancyDetails: jsonb('discrepancy_details'),
  evaluatedAt: timestamp('evaluated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const invoiceOcrExtracts = pgTable('invoice_ocr_extracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  fileHash: text('file_hash').notNull(),
  fileName: text('file_name').notNull(),
  extractedData: jsonb('extracted_data').notNull(),
  confidenceScore: numeric('confidence_score').notNull(),
  status: text('status').default('suggested').notNull(), // 'suggested', 'confirmed', 'rejected'
  reviewedBy: uuid('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const clientInvoices = pgTable('client_invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  clientOrganisationId: uuid('client_organisation_id').references(() => organisations.id).notNull(),
  milestoneId: uuid('milestone_id'),
  contractReference: text('contract_reference').notNull(),
  invoiceNumber: text('invoice_number').notNull(),
  billingType: text('billing_type').notNull(), // 'advance', 'milestone', 'progress', 'final', 'variation', 'retention_release', 'credit_note', 'debit_adjustment'
  currency: text('currency').default('QAR').notNull(),
  invoiceDate: timestamp('invoice_date', { withTimezone: true }).notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
  grossAmount: numeric('gross_amount').notNull(),
  taxAmount: numeric('tax_amount').default('0').notNull(),
  retentionDeduction: numeric('retention_deduction').default('0').notNull(),
  netDueAmount: numeric('net_due_amount').notNull(),
  collectedAmount: numeric('collected_amount').default('0').notNull(),
  outstandingAmount: numeric('outstanding_amount').notNull(),
  status: text('status').default('draft').notNull(), // 'draft', 'internal_review', 'ready_to_issue', 'issued', 'client_acknowledged', 'partially_paid', 'paid', 'overdue', 'disputed', 'cancelled', 'credited'
  supportingDeliverables: jsonb('supporting_deliverables'),
  issuedAt: timestamp('issued_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const paymentMilestones = pgTable('payment_milestones', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  milestoneCode: text('milestone_code').notNull(),
  milestoneName: text('milestone_name').notNull(),
  percentageOfContract: numeric('percentage_of_contract').notNull(),
  contractualAmount: numeric('contractual_amount').notNull(),
  plannedBillingDate: timestamp('planned_billing_date', { withTimezone: true }).notNull(),
  actualBillingDate: timestamp('actual_billing_date', { withTimezone: true }),
  collectionStatus: text('collection_status').default('unbilled').notNull(), // 'unbilled', 'billed', 'partially_collected', 'fully_collected'
  evidenceRequirements: jsonb('evidence_requirements'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const collections = pgTable('collections', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  clientInvoiceId: uuid('client_invoice_id').references(() => clientInvoices.id).notNull(),
  amountReceived: numeric('amount_received').notNull(),
  paymentDate: timestamp('payment_date', { withTimezone: true }).notNull(),
  paymentReference: text('payment_reference').notNull(),
  paymentMethod: text('payment_method').default('bank_transfer').notNull(),
  withholdingTax: numeric('withholding_tax').default('0').notNull(),
  deductions: numeric('deductions').default('0').notNull(),
  disputedBalance: numeric('disputed_balance').default('0').notNull(),
  bankAccountId: text('bank_account_id'),
  recordedBy: uuid('recorded_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const projectCostClaims = pgTable('project_cost_claims', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  claimantId: uuid('claimant_id').notNull(),
  claimantName: text('claimant_name').notNull(),
  date: timestamp('date', { withTimezone: true }).notNull(),
  category: text('category').notNull(), // 'staff_expense', 'project_cash_expense', 'site_purchase', 'transport', 'crew_welfare', 'emergency_purchase', 'other'
  supplierName: text('supplier_name').notNull(),
  amount: numeric('amount').notNull(),
  currency: text('currency').default('QAR').notNull(),
  receiptUri: text('receipt_uri'),
  reason: text('reason').notNull(),
  costCode: text('cost_code').default('COST-OPS-MISC').notNull(),
  approvalStatus: text('approval_status').default('submitted').notNull(), // 'submitted', 'approved', 'rejected'
  reimbursementStatus: text('reimbursement_status').default('pending').notNull(), // 'pending', 'reimbursed'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const exchangeRateLocks = pgTable('exchange_rate_locks', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  baseCurrency: text('base_currency').notNull(),
  transactionCurrency: text('transaction_currency').notNull(),
  exchangeRate: numeric('exchange_rate').notNull(),
  rateSource: text('rate_source').default('Qatar Central Bank').notNull(),
  rateDate: timestamp('rate_date', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const taxConfigurations = pgTable('tax_configurations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  jurisdictionCode: text('jurisdiction_code').notNull(), // 'QA', 'AE', 'SA', 'UK'
  taxName: text('tax_name').notNull(),
  taxType: text('tax_type').notNull(), // 'vat', 'gst', 'sales_tax', 'zero_rated', 'exempt', 'withholding', 'reverse_charge'
  standardRatePercent: numeric('standard_rate_percent').notNull(),
  reverseChargeApplicable: boolean('reverse_charge_applicable').default(false).notNull(),
  rulesJson: jsonb('rules_json'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const commercialCloseoutRecords = pgTable('commercial_closeout_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  checklistJson: jsonb('checklist_json').notNull(),
  unmetPillarsJson: jsonb('unmet_pillars_json').notNull(),
  decision: text('decision').notNull(), // 'commercially_closed', 'conditional_closure', 'rejected'
  finalGrossMarginPercent: text('final_gross_margin_percent').notNull(),
  finalRevenue: numeric('final_revenue').notNull(),
  finalActualCost: numeric('final_actual_cost').notNull(),
  finalProfit: numeric('final_profit').notNull(),
  auditHash: text('audit_hash').notNull(),
  signedBy: text('signed_by').notNull(),
  signedAt: timestamp('signed_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const monthEndSnapshots = pgTable('month_end_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  periodKey: text('period_key').notNull(), // e.g. '2026-08'
  contractValue: numeric('contract_value').notNull(),
  currentBudget: numeric('current_budget').notNull(),
  committedCost: numeric('committed_cost').notNull(),
  actualCost: numeric('actual_cost').notNull(),
  eac: numeric('eac').notNull(),
  vac: numeric('vac').notNull(),
  marginPercent: text('margin_percent').notNull(),
  billedAmount: numeric('billed_amount').notNull(),
  collectedAmount: numeric('collected_amount').notNull(),
  receivablesAmount: numeric('receivables_amount').notNull(),
  netCashExposure: numeric('net_cash_exposure').notNull(),
  isLocked: boolean('is_locked').default(true).notNull(),
  snapshotHash: text('snapshot_hash').notNull(),
  lockedBy: text('locked_by').notNull(),
  lockedAt: timestamp('locked_at', { withTimezone: true }).defaultNow().notNull(),
});
