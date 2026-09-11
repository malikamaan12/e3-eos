import { pgTable, text, timestamp, uuid, boolean, jsonb } from 'drizzle-orm/pg-core';
import { organisations, users } from './identity.js';
import { projects } from './projects.js';

export const vendors = pgTable('vendors', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  vendorCode: text('vendor_code').notNull(),
  name: text('name').notNull(),
  legalName: text('legal_name'),
  tradingName: text('trading_name'),
  vendorType: text('vendor_type').default('company').notNull(), // 'company', 'freelancer', 'individual_supplier', 'subcontractor', 'international_supplier', 'rental_supplier', 'fabricator', 'talent_supplier', 'technical_supplier', 'logistics_supplier'
  category: text('category').default('corporate').notNull(), // legacy compatibility: 'corporate', 'freelance', 'cash_supplier'
  country: text('country').default('Qatar').notNull(),
  contactPersons: jsonb('contact_persons').default([]),
  email: text('email'),
  phone: text('phone'),
  categories: jsonb('categories').default([]),
  services: jsonb('services').default([]),
  brands: jsonb('brands').default([]),
  commercialRegistration: text('commercial_registration'),
  taxVatNumber: text('tax_vat_number'),
  bankDetails: jsonb('bank_details'),
  insurance: text('insurance'),
  licences: jsonb('licences').default([]),
  certifications: jsonb('certifications').default([]),
  rating: text('rating').default('4.5'),
  qualificationStatus: text('qualification_status').default('approved').notNull(), // 'prospect', 'registration_pending', 'under_review', 'approved', 'conditionally_approved', 'suspended', 'blacklisted', 'archived'
  status: text('status').default('active').notNull(), // 'active', 'suspended', 'pending_verification'
  restrictedBankDetails: jsonb('restricted_bank_details'),
  riskFlags: jsonb('risk_flags').default([]),
  onboardingStage: text('onboarding_stage').default('completed'),
  documents: jsonb('documents').default([]),
  projectsUsed: jsonb('projects_used').default([]),
  complianceVerified: boolean('compliance_verified').default(false).notNull(),
  soleSourceAuthorised: boolean('sole_source_authorised').default(false).notNull(),
  freelanceGracePeriodUntil: timestamp('freelance_grace_period_until', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});


export const vendorBankChangeRequests = pgTable('vendor_bank_change_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  vendorId: uuid('vendor_id').references(() => vendors.id).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  proposedBankDetails: jsonb('proposed_bank_details').notNull(),
  requestedBy: uuid('requested_by').references(() => users.id).notNull(),
  verifiedBy: uuid('verified_by').references(() => users.id),
  status: text('status').default('pending_verification').notNull(), // 'pending_verification', 'verified', 'rejected'
  rejectionReason: text('rejection_reason'),
  requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
});

export const frameworkContracts = pgTable('framework_contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  vendorId: uuid('vendor_id').references(() => vendors.id).notNull(),
  contractCode: text('contract_code').notNull(),
  ceilingAmount: text('ceiling_amount').notNull(),
  consumedAmount: text('consumed_amount').default('0').notNull(),
  currency: text('currency').default('QAR').notNull(),
  validUntil: timestamp('valid_until', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const procurementRequirements = pgTable('procurement_requirements', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  requirementCode: text('requirement_code').notNull(),
  source: text('source').default('boq_line').notNull(),
  boqLineId: uuid('boq_line_id'),
  requirementId: uuid('requirement_id'),
  designPackageId: uuid('design_package_id'),
  description: text('description').notNull(),
  category: text('category').notNull(),
  quantity: text('quantity').notNull(),
  unit: text('unit').default('units').notNull(),
  requiredOnSiteDate: timestamp('required_on_site_date', { withTimezone: true }).notNull(),
  procurementLeadTimeDays: text('procurement_lead_time_days').default('14').notNull(),
  requiredDeliveryLocation: text('required_delivery_location').notNull(),
  technicalSpecification: text('technical_specification'),
  preferredVendorId: uuid('preferred_vendor_id').references(() => vendors.id),
  procurementOwnerId: uuid('procurement_owner_id').references(() => users.id),
  estimatedCost: text('estimated_cost').default('0').notNull(),
  approvedBudget: text('approved_budget').default('0').notNull(),
  status: text('status').default('draft').notNull(),
  priority: text('priority').default('medium').notNull(),
  sourceDecision: text('source_decision').default('buy').notNull(),
  internalAssetQuantity: text('internal_asset_quantity').default('0').notNull(),
  externalSourcingQuantity: text('external_sourcing_quantity').default('0').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const rfqs = pgTable('rfqs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  rfqNumber: text('rfq_number').notNull(),
  procurementRequirementId: uuid('procurement_requirement_id').references(() => procurementRequirements.id).notNull(),
  issueDate: timestamp('issue_date', { withTimezone: true }).notNull(),
  closingDate: timestamp('closing_date', { withTimezone: true }).notNull(),
  invitedVendorIds: jsonb('invited_vendor_ids').$type<string[]>().default([]).notNull(),
  technicalSpecification: text('technical_specification').notNull(),
  quantity: text('quantity').notNull(),
  deliveryRequirement: text('delivery_requirement').notNull(),
  commercialTerms: text('commercial_terms'),
  attachments: jsonb('attachments').$type<string[]>().default([]).notNull(),
  status: text('status').default('issued').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const vendorQuotes = pgTable('vendor_quotes', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  rfqId: uuid('rfq_id').references(() => rfqs.id).notNull(),
  vendorId: uuid('vendor_id').references(() => vendors.id).notNull(),
  quoteReference: text('quote_reference').notNull(),
  unitRate: text('unit_rate').notNull(),
  totalPrice: text('total_price').notNull(),
  currency: text('currency').default('QAR').notNull(),
  deliveryTimeDays: text('delivery_time_days').notNull(),
  paymentTerms: text('payment_terms').notNull(),
  warranty: text('warranty').notNull(),
  technicalCompliance: text('technical_compliance').notNull(),
  exclusions: text('exclusions'),
  validityDays: text('validity_days').default('30').notNull(),
  attachments: jsonb('attachments').$type<string[]>().default([]).notNull(),
  clarifications: text('clarifications'),
  technicalScore: text('technical_score'),
  commercialScore: text('commercial_score'),
  riskScore: text('risk_score'),
  totalScore: text('total_score'),
  isRecommended: boolean('is_recommended').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const purchaseOrders = pgTable('purchase_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  poNumber: text('po_number').notNull(),
  vendorId: uuid('vendor_id').references(() => vendors.id).notNull(),
  rfqId: uuid('rfq_id').references(() => rfqs.id),
  procurementRequirementId: uuid('procurement_requirement_id').references(() => procurementRequirements.id),
  frameworkContractId: uuid('framework_contract_id').references(() => frameworkContracts.id),
  currency: text('currency').default('QAR').notNull(),
  subtotal: text('subtotal'),
  tax: text('tax').default('0'),
  totalAmount: text('total_amount').notNull(),
  paymentTerms: text('payment_terms'),
  deliveryDate: timestamp('delivery_date', { withTimezone: true }),
  deliveryLocation: text('delivery_location'),
  requestedBy: uuid('requested_by').references(() => users.id),
  approvedBy: uuid('approved_by').references(() => users.id),
  status: text('status').default('draft').notNull(), // 'draft', 'approved', 'released', 'acknowledged', 'reconciliation_needed', 'partially_received', 'fully_received', 'cancelled'
  releaseIdempotencyKey: text('release_idempotency_key'),
  releasedAt: timestamp('released_at', { withTimezone: true }),
  externalDeliveryStatus: text('external_delivery_status').default('not_sent').notNull(), // 'not_sent', 'sent_pending_confirmation', 'confirmed', 'failed'
  isSoleSource: boolean('is_sole_source').default(false).notNull(),
  soleSourceRationale: text('sole_source_rationale'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const poLines = pgTable('po_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  poId: uuid('po_id').references(() => purchaseOrders.id).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  packageId: uuid('package_id').notNull(),
  description: text('description').notNull(),
  quantity: text('quantity').notNull(),
  unitCost: text('unit_cost').notNull(),
  totalCost: text('total_cost').notNull(),
  receivedQuantity: text('received_quantity').default('0').notNull(),
  rejectedQuantity: text('rejected_quantity').default('0').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const poReceipts = pgTable('po_receipts', {
  id: uuid('id').primaryKey().defaultRandom(),
  poId: uuid('po_id').references(() => purchaseOrders.id).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  deliveryNoteNumber: text('delivery_note_number').notNull(),
  receiverId: uuid('receiver_id').references(() => users.id).notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
});
