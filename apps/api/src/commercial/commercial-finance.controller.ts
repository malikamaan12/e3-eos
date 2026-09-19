import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpException,
  HttpStatus,
  UseFilters,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { TenantIsolationGuard, AllowedAudiences } from '../common/tenant.guard.js';
import {
  SupplierInvoiceCreateSchema,
  SupplierInvoiceApproveSchema,
  InvoiceOcrConfirmSchema,
  ClientInvoiceCreateSchema,
  PaymentMilestoneCreateSchema,
  CollectionRecordCreateSchema,
  CommercialVariationCreateSchema,
  ProjectExpenseClaimCreateSchema,
  CommercialCloseoutDecisionSchema,
  ClientFeedbackSubmissionSchema,
  LessonsLearnedCreateSchema,
  VendorPerformanceEvaluationSchema,
  ReconciliationExceptionResolveSchema,
  PeriodLockCreateSchema,
} from '@e3-eos/contracts';
import {
  FinancialCalculator,
  FinancialPositionInput,
  ThreeWayMatchEngine,
  PurchaseOrderForMatch,
  ReceiptForMatch,
  CommercialCloseoutEngine,
  CommercialCloseoutChecklist,
  ClientResultsEngine,
  IntegrationReconciliationEngine,
  safeSha256,
  Money,
  CurrencyCode,
  canApproveCommercialAmount,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { projectRepository } from '../projects/projects.controller.js';

// In-Memory State Repositories for Sprint 05
export const financialPositionsRepo = new Map<string, FinancialPositionInput>();
export const supplierInvoicesRepo = new Map<string, any>();
export const clientInvoicesRepo = new Map<string, any>();
export const paymentMilestonesRepo = new Map<string, any>();
export const collectionsRepo = new Map<string, any>();
export const variationsRepo = new Map<string, any>();
export const expenseClaimsRepo = new Map<string, any>();
export const exchangeRatesRepo = new Map<string, any>();
export const taxConfigurationsRepo = new Map<string, any>();
export const closeoutRecordsRepo = new Map<string, any>();
export const monthEndSnapshotsRepo = new Map<string, any>();
export const postEventReportsRepo = new Map<string, any>();
export const projectKpisRepo = new Map<string, any>();
export const clientFeedbackRepo = new Map<string, any>();
export const lessonsLearnedRepo = new Map<string, any>();
export const vendorEvaluationsRepo = new Map<string, any>();
export const enterpriseConnectorsRepo = new Map<string, any>();
export const reconciliationExceptionsRepo = new Map<string, any>();
export const ocrDraftsRepo = new Map<string, any>();

export function resolveCanonicalProjectId(id: string): string {
  if (!id) return id;
  const clean = id.split('?')[0].split('#')[0];
  if (clean === '00000000-0000-4000-8000-000000000001' || clean === 'QND26' || clean === 'PRJ-QND-2026') {
    return 'PRJ-QND-2026';
  }
  if (clean === 'f1111111-1111-4111-8111-111111111111' || clean === 'PRJ-2026-SYNTH-01' || clean === 'PRJ-2026-QATAR-01') {
    return 'PRJ-2026-QATAR-01';
  }
  if (clean === 'a1111111-1111-4111-8111-111111111111' || clean === 'PRJ-2026-FEE-01') {
    return 'PRJ-2026-FEE-01';
  }
  return clean;
}

// Seed helper for canonical projects
function seedCommercialData() {
  const projectId = 'PRJ-QND-2026';
  if (financialPositionsRepo.has(projectId)) return;

  // 1. Financial Positions
  const qndPos = {
    currency: 'QAR',
    originalBudget: '1850000',
    approvedBudgetChanges: '150000',
    postedActualCost: '1180000',
    acceptedAccruedCost: '120000',
    remainingCommitments: '350000',
    uncommittedForecast: '150000',
    approvedRevenueBasis: '2450000',
  };
  financialPositionsRepo.set('PRJ-QND-2026', qndPos);
  financialPositionsRepo.set('00000000-0000-4000-8000-000000000001', qndPos);
  financialPositionsRepo.set('QND26', qndPos);

  const tourismPos = {
    currency: 'QAR',
    originalBudget: '3200000',
    approvedBudgetChanges: '250000',
    postedActualCost: '1950000',
    acceptedAccruedCost: '180000',
    remainingCommitments: '520000',
    uncommittedForecast: '200000',
    approvedRevenueBasis: '4100000',
  };
  financialPositionsRepo.set('PRJ-2026-QATAR-01', tourismPos);
  financialPositionsRepo.set('f1111111-1111-4111-8111-111111111111', tourismPos);
  financialPositionsRepo.set('PRJ-2026-SYNTH-01', tourismPos);

  const feePos = {
    currency: 'QAR',
    originalBudget: '1500000',
    approvedBudgetChanges: '100000',
    postedActualCost: '950000',
    acceptedAccruedCost: '80000',
    remainingCommitments: '220000',
    uncommittedForecast: '100000',
    approvedRevenueBasis: '1950000',
  };
  financialPositionsRepo.set('PRJ-2026-FEE-01', feePos);
  financialPositionsRepo.set('a1111111-1111-4111-8111-111111111111', feePos);

  // 2. Supplier Invoices
  supplierInvoicesRepo.set('INV-SUP-001', {
    id: 'INV-SUP-001',
    projectId,
    vendorId: 'VND-RAYYAN-STEEL',
    vendorName: 'Al Rayyan Structural Steel Co.',
    poId: 'PO-QND-001',
    invoiceNumber: 'INV-AR-8801',
    invoiceDate: '2026-08-10T10:00:00Z',
    dueDate: '2026-09-10T10:00:00Z',
    currency: 'QAR',
    amountExcludingTax: '145000',
    taxAmount: '0',
    totalAmount: '145000',
    paymentTerms: '30_days_net',
    status: 'approved',
    threeWayMatchStatus: 'matched',
    disputedAmount: '0',
    approvedAmount: '145000',
    paidAmount: '145000',
    balanceRemaining: '0',
    approvedBy: 'USR-FIN-01',
    approvedAt: '2026-08-12T14:30:00Z',
    lines: [
      { lineId: 'L1', poLineId: 'POL-01', description: 'Main Arch Frame Fabricated Steel', quantity: 24, unitCost: 5000, totalCost: 120000, taxRate: 0 },
      { lineId: 'L2', poLineId: 'POL-02', description: 'Heavy Duty Ground Baseplates', quantity: 10, unitCost: 2500, totalCost: 25000, taxRate: 0 },
    ],
  });

  supplierInvoicesRepo.set('INV-SUP-002', {
    id: 'INV-SUP-002',
    projectId,
    vendorId: 'VND-DOHA-TRUSS',
    vendorName: 'Doha Trussing & Staging Ltd',
    poId: 'PO-QND-002',
    invoiceNumber: 'INV-DT-4421',
    invoiceDate: '2026-08-15T09:00:00Z',
    dueDate: '2026-09-15T09:00:00Z',
    currency: 'QAR',
    amountExcludingTax: '85000',
    taxAmount: '0',
    totalAmount: '85000',
    paymentTerms: '30_days_net',
    status: 'approved',
    threeWayMatchStatus: 'matched',
    disputedAmount: '0',
    approvedAmount: '85000',
    paidAmount: '85000',
    balanceRemaining: '0',
    approvedBy: 'USR-FIN-01',
    approvedAt: '2026-08-16T11:00:00Z',
    lines: [
      { lineId: 'L1', poLineId: 'POL-01', description: 'Truss Tower Rigging Units 12m', quantity: 10, unitCost: 8500, totalCost: 85000, taxRate: 0 },
    ],
  });

  supplierInvoicesRepo.set('INV-SUP-003', {
    id: 'INV-SUP-003',
    projectId,
    vendorId: 'VND-GULF-AV',
    vendorName: 'Gulf Sound & Audio Visual WLL',
    poId: 'PO-QND-003',
    invoiceNumber: 'INV-GAV-1092',
    invoiceDate: '2026-08-20T14:00:00Z',
    dueDate: '2026-09-20T14:00:00Z',
    currency: 'QAR',
    amountExcludingTax: '120000',
    taxAmount: '0',
    totalAmount: '120000',
    paymentTerms: '30_days_net',
    status: 'match_exception',
    threeWayMatchStatus: 'exception_detected',
    disputedAmount: '20000',
    approvedAmount: '0',
    paidAmount: '0',
    balanceRemaining: '120000',
    lines: [
      { lineId: 'L1', poLineId: 'POL-01', description: 'Line Array Speaker Clusters (8 units)', quantity: 8, unitCost: 12500, totalCost: 100000, taxRate: 0 },
      { lineId: 'L2', poLineId: 'POL-02', description: 'Subwoofer Enclosures (Unplanned Add-on)', quantity: 2, unitCost: 10000, totalCost: 20000, taxRate: 0 },
    ],
  });

  supplierInvoicesRepo.set('INV-SUP-004', {
    id: 'INV-SUP-004',
    projectId,
    vendorId: 'VND-QATAR-LIGHT',
    vendorName: 'Qatar Lighting Tech Systems',
    poId: 'PO-QND-004',
    invoiceNumber: 'INV-QL-5519',
    invoiceDate: '2026-08-25T11:00:00Z',
    dueDate: '2026-09-25T11:00:00Z',
    currency: 'QAR',
    amountExcludingTax: '65000',
    taxAmount: '0',
    totalAmount: '65000',
    paymentTerms: '30_days_net',
    status: 'under_review',
    threeWayMatchStatus: 'pending',
    disputedAmount: '0',
    approvedAmount: '0',
    paidAmount: '0',
    balanceRemaining: '65000',
    lines: [
      { lineId: 'L1', poLineId: 'POL-01', description: 'Architectural LED Profile Fixtures', quantity: 50, unitCost: 1300, totalCost: 65000, taxRate: 0 },
    ],
  });

  // OCR draft
  ocrDraftsRepo.set('OCR-DRAFT-001', {
    id: 'OCR-DRAFT-001',
    fileName: 'INV-QL-5519_Scan.pdf',
    confidenceScore: 0.96,
    status: 'suggested',
    extractedData: {
      vendorName: 'Qatar Lighting Tech Systems',
      invoiceNumber: 'INV-QL-5519',
      invoiceDate: '2026-08-25',
      currency: 'QAR',
      amountExcludingTax: 65000,
      totalAmount: 65000,
      poReference: 'PO-QND-004',
      lines: [
        { description: 'Architectural LED Profile Fixtures', quantity: 50, unitCost: 1300, totalCost: 65000 },
      ],
    },
  });

  // 3. Client Invoices
  clientInvoicesRepo.set('INV-CLI-001', {
    id: 'INV-CLI-001',
    projectId,
    milestoneId: 'MS-01',
    contractReference: 'CTR-QND-2026-01',
    invoiceNumber: 'E3-CLI-2026-001',
    billingType: 'advance',
    currency: 'QAR',
    invoiceDate: '2026-06-01T08:00:00Z',
    dueDate: '2026-06-30T08:00:00Z',
    grossAmount: '735000',
    taxAmount: '0',
    retentionDeduction: '0',
    netDueAmount: '735000',
    collectedAmount: '735000',
    outstandingAmount: '0',
    status: 'paid',
  });

  clientInvoicesRepo.set('INV-CLI-002', {
    id: 'INV-CLI-002',
    projectId,
    milestoneId: 'MS-02',
    contractReference: 'CTR-QND-2026-01',
    invoiceNumber: 'E3-CLI-2026-002',
    billingType: 'milestone',
    currency: 'QAR',
    invoiceDate: '2026-07-15T08:00:00Z',
    dueDate: '2026-08-15T08:00:00Z',
    grossAmount: '735000',
    taxAmount: '0',
    retentionDeduction: '0',
    netDueAmount: '735000',
    collectedAmount: '735000',
    outstandingAmount: '0',
    status: 'paid',
  });

  clientInvoicesRepo.set('INV-CLI-003', {
    id: 'INV-CLI-003',
    projectId,
    milestoneId: 'MS-03',
    contractReference: 'CTR-QND-2026-01',
    invoiceNumber: 'E3-CLI-2026-003',
    billingType: 'milestone',
    currency: 'QAR',
    invoiceDate: '2026-08-20T08:00:00Z',
    dueDate: '2026-09-20T08:00:00Z',
    grossAmount: '490000',
    taxAmount: '0',
    retentionDeduction: '0',
    netDueAmount: '490000',
    collectedAmount: '245000',
    outstandingAmount: '245000',
    status: 'partially_paid',
  });

  clientInvoicesRepo.set('INV-CLI-004', {
    id: 'INV-CLI-004',
    projectId,
    milestoneId: 'MS-04',
    contractReference: 'CTR-QND-2026-01',
    invoiceNumber: 'E3-CLI-2026-004',
    billingType: 'final',
    currency: 'QAR',
    invoiceDate: '2026-09-01T08:00:00Z',
    dueDate: '2026-10-01T08:00:00Z',
    grossAmount: '490000',
    taxAmount: '0',
    retentionDeduction: '0',
    netDueAmount: '490000',
    collectedAmount: '0',
    outstandingAmount: '490000',
    status: 'ready_to_issue',
  });

  // 4. Payment Milestones
  paymentMilestonesRepo.set('MS-01', {
    id: 'MS-01',
    projectId,
    milestoneCode: 'MS-01-ADV',
    milestoneName: 'Mobilization & Advance Payment',
    percentageOfContract: '30',
    contractualAmount: '735000',
    plannedBillingDate: '2026-06-01T00:00:00Z',
    actualBillingDate: '2026-06-01T00:00:00Z',
    collectionStatus: 'fully_collected',
  });

  paymentMilestonesRepo.set('MS-02', {
    id: 'MS-02',
    projectId,
    milestoneCode: 'MS-02-DELIV',
    milestoneName: 'Site Delivery & Structural Erection',
    percentageOfContract: '30',
    contractualAmount: '735000',
    plannedBillingDate: '2026-07-15T00:00:00Z',
    actualBillingDate: '2026-07-15T00:00:00Z',
    collectionStatus: 'fully_collected',
  });

  paymentMilestonesRepo.set('MS-03', {
    id: 'MS-03',
    projectId,
    milestoneCode: 'MS-03-OPEN',
    milestoneName: 'Opening Authorization & VIP Operational Launch',
    percentageOfContract: '20',
    contractualAmount: '490000',
    plannedBillingDate: '2026-08-20T00:00:00Z',
    actualBillingDate: '2026-08-20T00:00:00Z',
    collectionStatus: 'partially_collected',
  });

  paymentMilestonesRepo.set('MS-04', {
    id: 'MS-04',
    projectId,
    milestoneCode: 'MS-04-CLOSE',
    milestoneName: 'Bump-Out Completion & Commercial Closeout',
    percentageOfContract: '20',
    contractualAmount: '490000',
    plannedBillingDate: '2026-09-05T00:00:00Z',
    collectionStatus: 'unbilled',
  });

  // 5. Collections
  collectionsRepo.set('COL-001', {
    id: 'COL-001',
    projectId,
    clientInvoiceId: 'INV-CLI-001',
    amountReceived: '735000',
    paymentDate: '2026-06-15T10:00:00Z',
    paymentReference: 'QNB-TRF-9021882',
    paymentMethod: 'bank_transfer',
    bankAccountId: 'QNB-IBAN-QA29QNBA0000000012345678',
  });

  collectionsRepo.set('COL-002', {
    id: 'COL-002',
    projectId,
    clientInvoiceId: 'INV-CLI-002',
    amountReceived: '735000',
    paymentDate: '2026-08-01T12:00:00Z',
    paymentReference: 'QNB-TRF-9104721',
    paymentMethod: 'bank_transfer',
    bankAccountId: 'QNB-IBAN-QA29QNBA0000000012345678',
  });

  collectionsRepo.set('COL-003', {
    id: 'COL-003',
    projectId,
    clientInvoiceId: 'INV-CLI-003',
    amountReceived: '245000',
    paymentDate: '2026-08-28T09:30:00Z',
    paymentReference: 'QNB-TRF-9148203',
    paymentMethod: 'bank_transfer',
    bankAccountId: 'QNB-IBAN-QA29QNBA0000000012345678',
  });

  // 4b. Payment Milestones for Qatar Tourism (PRJ-2026-QATAR-01)
  const tourProjId = 'PRJ-2026-QATAR-01';
  paymentMilestonesRepo.set('MS-TOUR-01', {
    id: 'MS-TOUR-01',
    projectId: tourProjId,
    milestoneCode: 'MS-01-ADV',
    milestoneName: 'Mobilization & Initial Stand Allocation',
    percentageOfContract: '40',
    contractualAmount: '1640000',
    plannedBillingDate: '2026-07-01T00:00:00Z',
    actualBillingDate: '2026-07-01T00:00:00Z',
    collectionStatus: 'fully_collected',
  });
  paymentMilestonesRepo.set('MS-TOUR-02', {
    id: 'MS-TOUR-02',
    projectId: tourProjId,
    milestoneCode: 'MS-02-DELIV',
    milestoneName: 'DECC Hall 1 Fitout & Technical AV Handover',
    percentageOfContract: '35',
    contractualAmount: '1435000',
    plannedBillingDate: '2026-09-15T00:00:00Z',
    actualBillingDate: '2026-09-15T00:00:00Z',
    collectionStatus: 'fully_collected',
  });
  paymentMilestonesRepo.set('MS-TOUR-03', {
    id: 'MS-TOUR-03',
    projectId: tourProjId,
    milestoneCode: 'MS-03-OPEN',
    milestoneName: 'VIP Gala Opening & Plenary Launch',
    percentageOfContract: '20',
    contractualAmount: '820000',
    plannedBillingDate: '2026-11-15T00:00:00Z',
    actualBillingDate: '2026-11-15T00:00:00Z',
    collectionStatus: 'fully_collected',
  });
  paymentMilestonesRepo.set('MS-TOUR-04', {
    id: 'MS-TOUR-04',
    projectId: tourProjId,
    milestoneCode: 'MS-04-CLOSE',
    milestoneName: 'Post-Event Dismantle & Commercial Closeout Retention',
    percentageOfContract: '5',
    contractualAmount: '205000',
    plannedBillingDate: '2026-12-05T00:00:00Z',
    collectionStatus: 'unbilled',
  });

  // Client Invoices for Tourism
  clientInvoicesRepo.set('INV-TOUR-001', {
    id: 'INV-TOUR-001',
    projectId: tourProjId,
    milestoneId: 'MS-TOUR-01',
    invoiceNumber: 'INV-CLI-TOUR-001',
    billingType: 'advance',
    issueDate: '2026-07-02T00:00:00Z',
    dueDate: '2026-08-01T00:00:00Z',
    currency: 'QAR',
    grossAmount: '1640000',
    taxAmount: '0',
    retentionDeduction: '0',
    netDueAmount: '1640000',
    collectedAmount: '1640000',
    outstandingAmount: '0',
    status: 'paid',
  });
  clientInvoicesRepo.set('INV-TOUR-002', {
    id: 'INV-TOUR-002',
    projectId: tourProjId,
    milestoneId: 'MS-TOUR-02',
    invoiceNumber: 'INV-CLI-TOUR-002',
    billingType: 'progress',
    issueDate: '2026-09-16T00:00:00Z',
    dueDate: '2026-10-16T00:00:00Z',
    currency: 'QAR',
    grossAmount: '1435000',
    taxAmount: '0',
    retentionDeduction: '0',
    netDueAmount: '1435000',
    collectedAmount: '1435000',
    outstandingAmount: '0',
    status: 'paid',
  });
  clientInvoicesRepo.set('INV-TOUR-003', {
    id: 'INV-TOUR-003',
    projectId: tourProjId,
    milestoneId: 'MS-TOUR-03',
    invoiceNumber: 'INV-CLI-TOUR-003',
    billingType: 'progress',
    issueDate: '2026-11-16T00:00:00Z',
    dueDate: '2026-12-16T00:00:00Z',
    currency: 'QAR',
    grossAmount: '820000',
    taxAmount: '0',
    retentionDeduction: '0',
    netDueAmount: '820000',
    collectedAmount: '820000',
    outstandingAmount: '0',
    status: 'paid',
  });
  clientInvoicesRepo.set('INV-TOUR-004', {
    id: 'INV-TOUR-004',
    projectId: tourProjId,
    milestoneId: 'MS-TOUR-04',
    invoiceNumber: 'INV-CLI-TOUR-004',
    billingType: 'retention',
    issueDate: '2026-12-06T00:00:00Z',
    dueDate: '2027-01-06T00:00:00Z',
    currency: 'QAR',
    grossAmount: '205000',
    taxAmount: '0',
    retentionDeduction: '0',
    netDueAmount: '205000',
    collectedAmount: '0',
    outstandingAmount: '205000',
    status: 'ready_to_issue',
  });

  // Collections for Tourism
  collectionsRepo.set('COL-TOUR-001', {
    id: 'COL-TOUR-001',
    projectId: tourProjId,
    clientInvoiceId: 'INV-TOUR-001',
    amountReceived: '1640000',
    paymentDate: '2026-07-20T10:00:00Z',
    paymentReference: 'QNB-TRF-8819201',
    paymentMethod: 'bank_transfer',
    bankAccountId: 'QNB-IBAN-QA29QNBA0000000012345678',
  });
  collectionsRepo.set('COL-TOUR-002', {
    id: 'COL-TOUR-002',
    projectId: tourProjId,
    clientInvoiceId: 'INV-TOUR-002',
    amountReceived: '1435000',
    paymentDate: '2026-10-05T12:00:00Z',
    paymentReference: 'QNB-TRF-8891044',
    paymentMethod: 'bank_transfer',
    bankAccountId: 'QNB-IBAN-QA29QNBA0000000012345678',
  });
  collectionsRepo.set('COL-TOUR-003', {
    id: 'COL-TOUR-003',
    projectId: tourProjId,
    clientInvoiceId: 'INV-TOUR-003',
    amountReceived: '820000',
    paymentDate: '2026-11-28T09:30:00Z',
    paymentReference: 'QNB-TRF-8930219',
    paymentMethod: 'bank_transfer',
    bankAccountId: 'QNB-IBAN-QA29QNBA0000000012345678',
  });

  // 6. Commercial Variations
  variationsRepo.set('VAR-001', {
    id: 'VAR-001',
    projectId,
    variationNumber: 'VO-01',
    title: 'VIP Majlis Ambient Lighting Augmentation',
    reason: 'Client requested enhanced broadcast lighting for dignitary arrivals',
    additionalRevenue: '85000',
    additionalCost: '55000',
    status: 'approved_by_client',
    approvedAt: '2026-07-20T10:00:00Z',
  });

  variationsRepo.set('VAR-002', {
    id: 'VAR-002',
    projectId,
    variationNumber: 'VO-02',
    title: 'Acoustic Sound Baffle Wind Shielding',
    reason: 'Corniche offshore gust dampening compliance requirement',
    additionalRevenue: '65000',
    additionalCost: '45000',
    status: 'approved_by_client',
    approvedAt: '2026-08-05T15:00:00Z',
  });

  // 7. Cost Claims
  expenseClaimsRepo.set('EXP-001', {
    id: 'EXP-001',
    projectId,
    claimantId: 'USR-OPS-TARIQ',
    claimantName: 'Tariq Al-Mansoor',
    date: '2026-08-20T18:00:00Z',
    category: 'site_purchase',
    supplierName: 'Doha Hardware Center',
    amount: '3500',
    currency: 'QAR',
    reason: 'Emergency heavy-duty rubber cable crossover ramps for VIP aisle',
    costCode: 'COST-OPS-MISC',
    approvalStatus: 'approved',
    reimbursementStatus: 'reimbursed',
  });

  expenseClaimsRepo.set('EXP-002', {
    id: 'EXP-002',
    projectId,
    claimantId: 'USR-CREW-SARAH',
    claimantName: 'Sarah Jenkins',
    date: '2026-08-21T21:00:00Z',
    category: 'crew_welfare',
    supplierName: 'Al Meera Hypermarket',
    amount: '1850',
    currency: 'QAR',
    reason: 'Electrolyte drinks and nutrition packs for night shift rigging crew during heat warning',
    costCode: 'COST-CREW-WELFARE',
    approvalStatus: 'approved',
    reimbursementStatus: 'reimbursed',
  });

  // 8. Exchange Rate Locks
  exchangeRatesRepo.set('QAR-USD', { id: 'FX-01', baseCurrency: 'QAR', transactionCurrency: 'USD', exchangeRate: '3.6400', rateSource: 'Qatar Central Bank Peg', rateDate: '2026-08-01T00:00:00Z' });
  exchangeRatesRepo.set('QAR-EUR', { id: 'FX-02', baseCurrency: 'QAR', transactionCurrency: 'EUR', exchangeRate: '3.9550', rateSource: 'Qatar Central Bank', rateDate: '2026-08-01T00:00:00Z' });
  exchangeRatesRepo.set('QAR-GBP', { id: 'FX-03', baseCurrency: 'QAR', transactionCurrency: 'GBP', exchangeRate: '4.6200', rateSource: 'Qatar Central Bank', rateDate: '2026-08-01T00:00:00Z' });

  // 9. Tax Configurations
  taxConfigurationsRepo.set('QA', { id: 'TAX-QA', jurisdictionCode: 'QA', taxName: 'Qatar State Exemption / 0% VAT', taxType: 'zero_rated', standardRatePercent: '0', reverseChargeApplicable: false });
  taxConfigurationsRepo.set('AE', { id: 'TAX-AE', jurisdictionCode: 'AE', taxName: 'UAE Federal Tax Authority VAT', taxType: 'vat', standardRatePercent: '5', reverseChargeApplicable: true });
  taxConfigurationsRepo.set('SA', { id: 'TAX-SA', jurisdictionCode: 'SA', taxName: 'ZATCA Value Added Tax', taxType: 'vat', standardRatePercent: '15', reverseChargeApplicable: true });
  taxConfigurationsRepo.set('UK', { id: 'TAX-UK', jurisdictionCode: 'UK', taxName: 'UK HMRC Standard VAT', taxType: 'vat', standardRatePercent: '20', reverseChargeApplicable: false });

  // 10. Month End Snapshots
  monthEndSnapshotsRepo.set(`${projectId}-2026-07`, {
    id: 'SNAP-2026-07',
    projectId,
    periodKey: '2026-07',
    contractValue: '2385000',
    currentBudget: '1935000',
    committedCost: '1450000',
    actualCost: '735000',
    eac: '1850000',
    vac: '85000',
    marginPercent: '22.43%',
    billedAmount: '1470000',
    collectedAmount: '1470000',
    receivablesAmount: '0',
    netCashExposure: '735000',
    isLocked: true,
    snapshotHash: safeSha256({ period: '2026-07', projectId, actualCost: 735000 }),
    lockedBy: 'Hamad Al-Kuwari (Finance Director)',
    lockedAt: '2026-07-31T23:59:59Z',
  });

  // 11. Project KPIs
  projectKpisRepo.set('KPI-001', { id: 'KPI-001', projectId, kpiCode: 'KPI-TIME-01', name: 'On-Time Opening Milestone', targetValue: '100', actualValue: '100', unit: '%', status: 'met', measurementMethod: 'Authority opening signoff at 16:00 on scheduled date', evaluatedAt: '2026-08-22T16:00:00Z' });
  projectKpisRepo.set('KPI-002', { id: 'KPI-002', projectId, kpiCode: 'KPI-SNAG-01', name: 'Pre-Opening Snag Resolution', targetValue: '95', actualValue: '98', unit: '%', status: 'met', measurementMethod: '39 of 40 snags cleared before doors opened', evaluatedAt: '2026-08-22T15:30:00Z' });
  projectKpisRepo.set('KPI-003', { id: 'KPI-003', projectId, kpiCode: 'KPI-COMM-01', name: 'Budget Adherence (VAC Favorable)', targetValue: '0', actualValue: '200000', unit: 'QAR', status: 'met', measurementMethod: 'Current Budget minus EAC', evaluatedAt: '2026-08-28T18:00:00Z' });
  projectKpisRepo.set('KPI-004', { id: 'KPI-004', projectId, kpiCode: 'KPI-SAT-01', name: 'Client Satisfaction Index', targetValue: '4.5', actualValue: '4.9', unit: 'out of 5.0', status: 'met', measurementMethod: 'Ministerial survey sign-off', evaluatedAt: '2026-08-29T10:00:00Z' });
  projectKpisRepo.set('KPI-005', { id: 'KPI-005', projectId, kpiCode: 'KPI-HSE-01', name: 'Zero Lost Time Incidents (LTI)', targetValue: '0', actualValue: '0', unit: 'Incidents', status: 'met', measurementMethod: 'HSE site register across 42,000 man-hours', evaluatedAt: '2026-08-28T20:00:00Z' });

  // 12. Client Feedback
  clientFeedbackRepo.set('FB-001', {
    id: 'FB-001',
    projectId,
    clientRepresentative: 'Dr. Aisha Al-Thani (Director of Celebrations, Ministry of Culture)',
    surveyMethod: 'structured_meeting',
    overallRating: 5,
    npsScore: 10,
    feedbackComments: 'Flawless execution under tight ceremonial timelines. The pavilion architectural presence was acclaimed by all visiting dignitaries. Communication was proactive, structured, and exemplary.',
    submittedAt: '2026-08-29T11:30:00Z',
  });

  // 13. Lessons Learned
  lessonsLearnedRepo.set('LL-001', {
    id: 'LL-001',
    projectId,
    category: 'procurement',
    observation: 'Specialist acoustic baffles required bespoke overseas air freight due to late supplier production window.',
    rootCause: 'Manufacturer lead time underestimated during tender phase without dedicated factory buffer.',
    impact: 'Required emergency air-freight expedited handling (+15,000 QAR incurred).',
    recommendation: 'Mandate minimum 4-week shipping buffer on all maritime imports from Europe for high-wind installations.',
    reusableAcrossProjects: true,
    applicableProjectTypes: ['mega_event', 'outdoor_stadium', 'national_day'],
    loggedBy: 'Procurement Lead Tariq M.',
    createdAt: '2026-08-26T14:00:00Z',
  });

  lessonsLearnedRepo.set('LL-002', {
    id: 'LL-002',
    projectId,
    category: 'live_ops',
    observation: 'Turnstile access surge peaked 30 minutes earlier than model anticipated.',
    rootCause: 'Early dignitary motorcade arrival advanced public ingress timing by 45 minutes.',
    impact: 'Queue marshals successfully deployed proactive crowd switchbacks without bottlenecks.',
    recommendation: 'Pre-position crowd flow marshals at T-minus 90 minutes rather than T-minus 45 for State VIP events.',
    reusableAcrossProjects: true,
    applicableProjectTypes: ['state_ceremony', 'vip_event'],
    loggedBy: 'Site Ops Director Sarah J.',
    createdAt: '2026-08-27T09:00:00Z',
  });

  // 14. Vendor Evaluations
  vendorEvaluationsRepo.set('VND-RAYYAN-STEEL', {
    id: 'EV-01',
    vendorId: 'VND-RAYYAN-STEEL',
    vendorName: 'Al Rayyan Structural Steel Co.',
    projectId,
    priceScore: 90,
    qualityScore: 95,
    deliveryScore: 92,
    responsivenessScore: 88,
    hseScore: 96,
    averageScore: '92.2',
    evaluatorName: 'Project Director Hamad K.',
    recommendForFutureProjects: true,
    narrativeComments: 'Superb fabrication tolerance. Welds passed 100% NDT inspection first time. Delivered on schedule.',
    createdAt: '2026-08-29T16:00:00Z',
  });

  vendorEvaluationsRepo.set('VND-GULF-AV', {
    id: 'EV-02',
    vendorId: 'VND-GULF-AV',
    vendorName: 'Gulf Sound & Audio Visual WLL',
    projectId,
    priceScore: 85,
    qualityScore: 88,
    deliveryScore: 80,
    responsivenessScore: 82,
    hseScore: 90,
    averageScore: '85.0',
    evaluatorName: 'Technical Director Mike C.',
    recommendForFutureProjects: true,
    narrativeComments: 'Good sound quality, though delivery had slight delay and extra add-ons required invoice reconciliation.',
    createdAt: '2026-08-29T16:30:00Z',
  });

  // 15. Enterprise Connectors
  enterpriseConnectorsRepo.set('CONN-ERP-D365', {
    id: 'CONN-ERP-D365',
    connectorType: 'erp_accounting',
    connectorName: 'Microsoft Dynamics 365 Finance & Ops',
    systemOfRecordDomain: 'General Ledger, Treasury & Supplier Invoices',
    status: 'connected',
    endpointUrl: 'https://e3-prod.operations.dynamics.com/api',
    syncIntervalMinutes: 30,
    lastSyncAt: '2026-08-30T09:00:00Z',
    recordsProcessed: 1420,
    failedRecords: 1,
  });

  enterpriseConnectorsRepo.set('CONN-M365-CAL', {
    id: 'CONN-M365-CAL',
    connectorType: 'm365',
    connectorName: 'Microsoft 365 Calendar & Communications',
    systemOfRecordDomain: 'Ceremonial Protocol Schedule & Calendar Cues',
    status: 'connected',
    endpointUrl: 'https://graph.microsoft.com/v1.0',
    syncIntervalMinutes: 15,
    lastSyncAt: '2026-08-30T09:15:00Z',
    recordsProcessed: 480,
    failedRecords: 0,
  });

  enterpriseConnectorsRepo.set('CONN-GOOGLE-WS', {
    id: 'CONN-GOOGLE-WS',
    connectorType: 'google_workspace',
    connectorName: 'Google Workspace Enterprise Drive',
    systemOfRecordDomain: 'Engineering Drawings & Photographic Archive',
    status: 'connected',
    endpointUrl: 'https://www.googleapis.com/drive/v3',
    syncIntervalMinutes: 60,
    lastSyncAt: '2026-08-30T08:00:00Z',
    recordsProcessed: 310,
    failedRecords: 0,
  });

  // 16. Reconciliation Exceptions
  reconciliationExceptionsRepo.set('REC-001', {
    id: 'REC-001',
    connectorId: 'CONN-ERP-D365',
    entityType: 'supplier_invoice',
    externalId: 'ERP-AP-9921',
    eosId: 'INV-SUP-003',
    mismatchType: 'amount_mismatch',
    externalPayload: JSON.stringify({ invoiceNumber: 'INV-GAV-1092', amount: 125000, vendor: 'Gulf AV' }),
    eosPayload: JSON.stringify({ invoiceNumber: 'INV-GAV-1092', amount: 120000, vendor: 'Gulf AV' }),
    status: 'pending',
    resolutionAction: null,
    justification: null,
    resolvedBy: null,
    resolvedAt: null,
  });
}

@Controller('commercial')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
@AllowedAudiences('internal')
export class CommercialFinanceController {
  constructor() {
    seedCommercialData();
  }

  // ============================================================================
  // 1. Financial Control Center & Invariants
  // ============================================================================

  @Get('financial-control/:projectId')
  getFinancialControl(@Param('projectId') projectId: string) {
    seedCommercialData();
    const canonicalId = resolveCanonicalProjectId(projectId);
    let pos = financialPositionsRepo.get(canonicalId) || financialPositionsRepo.get(projectId);
    if (!pos) {
      const project = projectRepository.get(projectId) || projectRepository.get(canonicalId);
      if (project) {
        const rev = project.financialAssumptions?.revenueValue || '0';
        pos = {
          currency: project.financialAssumptions?.currency || 'QAR',
          originalBudget: '0',
          approvedBudgetChanges: '0',
          postedActualCost: '0',
          acceptedAccruedCost: '0',
          remainingCommitments: '0',
          uncommittedForecast: '0',
          approvedRevenueBasis: rev.toString().replace(/,/g, ''),
        };
        financialPositionsRepo.set(projectId, pos);
        financialPositionsRepo.set(canonicalId, pos);
      } else {
        throw new HttpException({ code: 'NOT_FOUND', message: `Project ${projectId} financial position not found` }, HttpStatus.NOT_FOUND);
      }
    }
    const result = FinancialCalculator.calculatePosition(pos);
    return {
      projectId,
      currency: pos.currency,
      originalBudget: pos.originalBudget,
      approvedBudgetChanges: pos.approvedBudgetChanges,
      currentAuthorisedBudget: result.currentAuthorisedBudget.toString(),
      postedActualCost: pos.postedActualCost,
      acceptedAccruedCost: pos.acceptedAccruedCost,
      remainingCommitments: pos.remainingCommitments,
      uncommittedForecast: pos.uncommittedForecast,
      estimateAtCompletion: result.estimateAtCompletion.toString(),
      budgetVariance: result.budgetVariance.toString(),
      approvedRevenueBasis: result.approvedRevenueBasis?.toString() || '0',
      forecastContribution: result.forecastContribution?.toString() || '0',
      forecastContributionMarginPercent: result.forecastContributionMarginPercent || '0.00%',
      invariants: {
        budgetFormula: 'Current Budget = Original Budget + Approved Changes',
        eacFormula: 'EAC = Posted Actual + Accepted Accrued + Remaining Commitments + ETC',
        vacFormula: 'VAC = Current Budget - EAC',
        zeroDoubleCountingEnforced: true,
      },
    };
  }

  @Post('financial-control/:projectId')
  updateFinancialControl(
    @Param('projectId') projectId: string,
    @Body() body: any
  ) {
    seedCommercialData();
    const canonicalId = resolveCanonicalProjectId(projectId);
    let pos = financialPositionsRepo.get(canonicalId) || financialPositionsRepo.get(projectId);
    if (!pos) {
      pos = {
        currency: (body.currency as CurrencyCode) || 'QAR',
        originalBudget: '0',
        approvedBudgetChanges: '0',
        postedActualCost: '0',
        acceptedAccruedCost: '0',
        remainingCommitments: '0',
        uncommittedForecast: '0',
        approvedRevenueBasis: '0',
      };
    }
    const updated: FinancialPositionInput = {
      currency: (body.currency as CurrencyCode) || pos.currency,
      originalBudget: body.originalBudget !== undefined ? String(body.originalBudget) : pos.originalBudget,
      approvedBudgetChanges: body.approvedBudgetChanges !== undefined ? String(body.approvedBudgetChanges) : pos.approvedBudgetChanges,
      postedActualCost: body.postedActualCost !== undefined ? String(body.postedActualCost) : pos.postedActualCost,
      acceptedAccruedCost: body.acceptedAccruedCost !== undefined ? String(body.acceptedAccruedCost) : pos.acceptedAccruedCost,
      remainingCommitments: body.remainingCommitments !== undefined ? String(body.remainingCommitments) : pos.remainingCommitments,
      uncommittedForecast: body.uncommittedForecast !== undefined ? String(body.uncommittedForecast) : pos.uncommittedForecast,
      approvedRevenueBasis: body.approvedRevenueBasis !== undefined ? String(body.approvedRevenueBasis) : pos.approvedRevenueBasis,
    };
    financialPositionsRepo.set(projectId, updated);
    financialPositionsRepo.set(canonicalId, updated);
    return this.getFinancialControl(projectId);
  }

  @Get('cash-position/:projectId')
  getCashPosition(@Param('projectId') projectId: string) {
    seedCommercialData();
    const canonicalId = resolveCanonicalProjectId(projectId);
    let pos = financialPositionsRepo.get(canonicalId) || financialPositionsRepo.get(projectId);
    if (!pos) {
      const project = projectRepository.get(projectId) || projectRepository.get(canonicalId);
      if (project) {
        const rev = project.financialAssumptions?.revenueValue || '0';
        pos = {
          currency: project.financialAssumptions?.currency || 'QAR',
          originalBudget: '0',
          approvedBudgetChanges: '0',
          postedActualCost: '0',
          acceptedAccruedCost: '0',
          remainingCommitments: '0',
          uncommittedForecast: '0',
          approvedRevenueBasis: rev.toString().replace(/,/g, ''),
        };
        financialPositionsRepo.set(projectId, pos);
        financialPositionsRepo.set(canonicalId, pos);
      } else {
        throw new HttpException({ code: 'NOT_FOUND', message: 'Project not found' }, HttpStatus.NOT_FOUND);
      }
    }

    // Aggregate billed and collected from client invoices
    let totalBilled = new Money('0', pos.currency);
    let totalCollected = new Money('0', pos.currency);
    for (const inv of clientInvoicesRepo.values()) {
      if (inv.projectId === canonicalId || inv.projectId === projectId) {
        totalBilled = totalBilled.plus(new Money(inv.grossAmount, pos.currency));
        totalCollected = totalCollected.plus(new Money(inv.collectedAmount, pos.currency));
      }
    }

    const cash = FinancialCalculator.calculateCashPosition({
      currency: pos.currency,
      contractValue: pos.approvedRevenueBasis || '0',
      billedAmount: totalBilled,
      collectedAmount: totalCollected,
      postedActualCost: pos.postedActualCost,
      remainingCommitments: pos.remainingCommitments,
    });

    const contractValNum = Number(cash.contractValue.toString()) || 1;
    const billedNum = Number(cash.billedAmount.toString()) || 0;
    const collectedNum = Number(cash.collectedAmount.toString()) || 0;

    return {
      projectId,
      currency: cash.currency,
      contractValue: cash.contractValue.toString(),
      billedAmount: cash.billedAmount.toString(),
      collectedAmount: cash.collectedAmount.toString(),
      receivablesAmount: cash.receivablesAmount.toString(),
      unbilledContractAmount: cash.unbilledContractAmount.toString(),
      postedActualCost: cash.postedActualCost.toString(),
      remainingCommitments: cash.remainingCommitments.toString(),
      netCashFlow: cash.netCashFlow.toString(),
      netCashExposure: cash.netCashExposure.toString(),
      billedPercent: `${Math.round((billedNum / contractValNum) * 100)}%`,
      collectedPercent: `${Math.round((collectedNum / contractValNum) * 100)}%`,
    };
  }

  @Get('margin-bridge/:projectId')
  getMarginBridge(@Param('projectId') projectId: string) {
    seedCommercialData();
    const isDemo =
      projectId === 'PRJ-QND-2026' ||
      projectId === 'f1111111-1111-4111-8111-111111111111' ||
      projectId === '00000000-0000-4000-8000-000000000001';

    if (!isDemo) {
      const proj = projectRepository.get(projectId);
      const startingRevenue = Number(String(proj?.financialAssumptions?.revenueValue || '0').replace(/,/g, '')) || 0;
      const startingCost = Number(String(proj?.financialAssumptions?.estimatedCost || '0').replace(/,/g, '')) || 0;
      const margin = startingRevenue - startingCost;
      const marginPct = startingRevenue > 0 ? `${((margin / startingRevenue) * 100).toFixed(2)}%` : '0.00%';

      return {
        projectId,
        waterfall: startingRevenue > 0 ? [
          { step: 'Tender Original Contract', revenue: startingRevenue.toString(), cost: startingCost.toString(), margin: margin.toString(), marginPercent: marginPct },
          { step: 'Approved Client Variations', revenue: '+0', cost: '+0', margin: '+0', marginPercent: '0.00%' },
          { step: 'Current Authorized Baseline', revenue: startingRevenue.toString(), cost: startingCost.toString(), margin: margin.toString(), marginPercent: marginPct },
          { step: 'Procurement Savings & Cost Optimization', revenue: '0', cost: '0', margin: '0', marginPercent: 'N/A' },
          { step: 'Final Forecast At Completion (EAC)', revenue: startingRevenue.toString(), cost: startingCost.toString(), margin: margin.toString(), marginPercent: marginPct },
        ] : [],
        summary: {
          currency: proj?.financialAssumptions?.currency || 'QAR',
          tenderRevenue: startingRevenue,
          tenderCost: startingCost,
          tenderMargin: margin,
          tenderMarginPercent: marginPct,
        },
      };
    }

    const bridge = FinancialCalculator.calculateMarginBridge({
      currency: 'QAR',
      tenderRevenue: '2300000',
      tenderCost: '1850000',
      variationsApprovedRevenue: '150000',
      variationsApprovedCost: '100000',
      costOverrunsOrSavings: '-150000', // 150k procurement cost savings
    });

    return {
      projectId,
      waterfall: [
        { step: 'Tender Original Contract', revenue: bridge.tenderRevenue.toString(), cost: bridge.tenderCost.toString(), margin: bridge.tenderMargin.toString(), marginPercent: bridge.tenderMarginPercent },
        { step: 'Approved Client Variations', revenue: `+${bridge.variationRevenue.toString()}`, cost: `+${bridge.variationCost.toString()}`, margin: `+${bridge.variationMargin.toString()}`, marginPercent: '33.33%' },
        { step: 'Current Authorized Baseline', revenue: bridge.currentBudgetRevenue.toString(), cost: bridge.currentBudgetCost.toString(), margin: bridge.currentBudgetMargin.toString(), marginPercent: '20.41%' },
        { step: 'Procurement Savings & Cost Optimization', revenue: '0', cost: '-150000', margin: '+150000', marginPercent: 'N/A' },
        { step: 'Final Forecast At Completion (EAC)', revenue: bridge.finalForecastRevenue.toString(), cost: bridge.finalForecastCost.toString(), margin: bridge.finalForecastMargin.toString(), marginPercent: bridge.finalForecastMarginPercent },
      ],
      summary: bridge,
    };
  }

  @Get('month-end-snapshots/:projectId')
  getMonthEndSnapshots(@Param('projectId') projectId: string) {
    seedCommercialData();
    const list = Array.from(monthEndSnapshotsRepo.values()).filter((s) => s.projectId === projectId);
    return { projectId, snapshots: list };
  }

  @Post('month-end-snapshots/:projectId/lock')
  lockMonthEndSnapshot(
    @Param('projectId') projectId: string,
    @Body() body: any
  ) {
    seedCommercialData();
    const parsed = PeriodLockCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException({ code: 'VALIDATION_ERROR', errors: parsed.error.issues }, HttpStatus.BAD_REQUEST);
    }

    const pos = financialPositionsRepo.get(projectId);
    if (!pos) {
      throw new HttpException({ code: 'NOT_FOUND', message: 'Project position not found' }, HttpStatus.NOT_FOUND);
    }
    const result = FinancialCalculator.calculatePosition(pos);
    const hash = safeSha256({ projectId, periodKey: parsed.data.periodKey, eac: result.estimateAtCompletion.toString() });

    const snapshot = {
      id: `SNAP-${parsed.data.periodKey}`,
      projectId,
      periodKey: parsed.data.periodKey,
      contractValue: pos.approvedRevenueBasis || '0',
      currentBudget: result.currentAuthorisedBudget.toString(),
      committedCost: pos.remainingCommitments,
      actualCost: pos.postedActualCost,
      eac: result.estimateAtCompletion.toString(),
      vac: result.budgetVariance.toString(),
      marginPercent: result.forecastContributionMarginPercent || '0%',
      billedAmount: '1960000',
      collectedAmount: '1715000',
      receivablesAmount: '245000',
      netCashExposure: '185000',
      isLocked: true,
      snapshotHash: hash,
      lockedBy: parsed.data.lockedBy,
      lockedAt: new Date().toISOString(),
      notes: parsed.data.snapshotNotes,
    };

    monthEndSnapshotsRepo.set(`${projectId}-${parsed.data.periodKey}`, snapshot);
    return { success: true, snapshot };
  }

  // ============================================================================
  // 2. Supplier Invoices & Three-Way Match
  // ============================================================================

  @Get('supplier-invoices/:projectId')
  getSupplierInvoices(@Param('projectId') projectId: string) {
    seedCommercialData();
    const invoices = Array.from(supplierInvoicesRepo.values()).filter((i) => i.projectId === projectId);
    return { projectId, invoices };
  }

  @Post('supplier-invoices')
  createSupplierInvoice(@Body() body: any) {
    seedCommercialData();
    const parsed = SupplierInvoiceCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException({ code: 'VALIDATION_ERROR', errors: parsed.error.issues }, HttpStatus.BAD_REQUEST);
    }

    const id = `INV-SUP-${Date.now().toString().slice(-4)}`;
    const invoice = {
      id,
      ...parsed.data,
      status: 'received',
      threeWayMatchStatus: 'pending',
      disputedAmount: '0',
      approvedAmount: '0',
      paidAmount: '0',
      balanceRemaining: parsed.data.totalAmount.toString(),
      createdAt: new Date().toISOString(),
    };
    supplierInvoicesRepo.set(id, invoice);
    return { success: true, invoice };
  }

  @Post('supplier-invoices/:id/three-way-match')
  evaluateThreeWayMatch(@Param('id') id: string) {
    seedCommercialData();
    const invoice = supplierInvoicesRepo.get(id);
    if (!invoice) {
      throw new HttpException({ code: 'NOT_FOUND', message: `Invoice ${id} not found` }, HttpStatus.NOT_FOUND);
    }

    // Mock PO matching
    const po: PurchaseOrderForMatch = {
      id: invoice.poId || 'PO-GENERIC',
      currency: invoice.currency,
      totalAmount: invoice.totalAmount,
      remainingAmount: invoice.totalAmount,
      lines: (invoice.lines || []).map((l: any, idx: number) => ({
        lineId: l.poLineId || `POL-${idx + 1}`,
        description: l.description,
        quantity: l.quantity,
        unitRate: l.unitCost,
        totalCost: l.totalCost,
      })),
    };

    // If invoice is INV-SUP-003, simulate an unapproved add-on discrepancy
    const receipts: ReceiptForMatch[] = (invoice.lines || []).map((l: any, idx: number) => ({
      receiptId: `REC-${idx + 1}`,
      poId: po.id,
      poLineId: l.poLineId || `POL-${idx + 1}`,
      acceptedQuantity: id === 'INV-SUP-003' && idx === 1 ? 0 : l.quantity,
      isSignedOff: true,
    }));

    const existingList = Array.from(supplierInvoicesRepo.values()).filter((i) => i.id !== id);
    const matchResult = ThreeWayMatchEngine.evaluateMatch(po, receipts, invoice, existingList);

    invoice.threeWayMatchStatus = matchResult.overallMatch ? 'matched' : 'exception_detected';
    invoice.status = matchResult.overallMatch ? 'under_review' : 'match_exception';
    supplierInvoicesRepo.set(id, invoice);

    return {
      invoiceId: id,
      matchResult,
      invoice,
    };
  }

  @Post('supplier-invoices/:id/approve')
  approveSupplierInvoice(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req?: Request
  ) {
    seedCommercialData();
    const parsed = SupplierInvoiceApproveSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException({ code: 'VALIDATION_ERROR', errors: parsed.error.issues }, HttpStatus.BAD_REQUEST);
    }

    const invoice = supplierInvoicesRepo.get(id);
    if (!invoice) {
      throw new HttpException({ code: 'NOT_FOUND', message: `Invoice ${id} not found` }, HttpStatus.NOT_FOUND);
    }

    const callerId = (req as any)?.userId || (req?.headers?.['x-user-id'] as string) || parsed.data.authorizedBy;
    const callerRole = (req as any)?.userRole || (req?.headers?.['x-user-role'] as string) || parsed.data.approverRole || 'finance';
    const isSuperAdmin = (req as any)?.isSuperAdmin === true || (req?.headers?.['x-is-super-admin'] === 'true') || callerRole === 'super_admin';

    // Anti-self-approval rule (Separation of Duties: Submitter cannot approve own invoice)
    if (invoice.submittedBy && invoice.submittedBy === callerId) {
      throw new HttpException({
        code: 'SELF_APPROVAL_PROHIBITED',
        message: 'Separation of Duties violation: Submitter cannot approve their own invoice.',
      }, HttpStatus.FORBIDDEN);
    }

    const approvedAmount = parsed.data.approvedAmount || invoice.totalAmount;
    const numAmount = typeof approvedAmount === 'string' ? parseFloat(approvedAmount) : Number(approvedAmount);

    // Authority ceiling check (POL-COMM-01/02/03)
    if (!canApproveCommercialAmount(callerRole, numAmount, isSuperAdmin)) {
      throw new HttpException({
        code: 'INSUFFICIENT_APPROVAL_AUTHORITY',
        message: `Role '${callerRole}' does not possess sufficient financial authority to approve commitments exceeding authority ceiling (${numAmount} QAR).`,
      }, HttpStatus.FORBIDDEN);
    }

    // Enforce match exception warning unless override justification provided
    if (invoice.threeWayMatchStatus === 'exception_detected' && !parsed.data.justification) {
      throw new HttpException({
        code: 'MATCH_EXCEPTION_REQUIRES_OVERRIDE',
        message: 'Cannot approve invoice with active three-way match exceptions without documented override justification.',
      }, HttpStatus.CONFLICT);
    }

    const pos = financialPositionsRepo.get(invoice.projectId);
    if (!pos) {
      throw new HttpException({ code: 'NOT_FOUND', message: 'Project financial position not found' }, HttpStatus.NOT_FOUND);
    }

    // Apply Transition: Remaining Commitments -> Posted Actual Cost (Zero Double-Counting)
    const updatedPos = FinancialCalculator.applySupplierInvoiceToCommitment(pos, approvedAmount);
    financialPositionsRepo.set(invoice.projectId, updatedPos);

    invoice.status = 'approved';
    invoice.approvedAmount = approvedAmount.toString();
    invoice.approvedBy = parsed.data.authorizedBy;
    invoice.approvedAt = new Date().toISOString();
    supplierInvoicesRepo.set(id, invoice);

    const newPositionCalc = FinancialCalculator.calculatePosition(updatedPos);

    return {
      success: true,
      invoice,
      updatedPosition: {
        postedActualCost: updatedPos.postedActualCost.toString(),
        remainingCommitments: updatedPos.remainingCommitments.toString(),
        eac: newPositionCalc.estimateAtCompletion.toString(),
        vac: newPositionCalc.budgetVariance.toString(),
        invariantVerified: 'EAC remained constant while commitments moved to actual cost',
      },
    };
  }

  @Post('supplier-invoices/ocr-extract')
  ocrExtractSupplierInvoice(@Body() body: { fileName: string; fileHash?: string }) {
    seedCommercialData();
    const draft = ocrDraftsRepo.get('OCR-DRAFT-001') || {
      id: 'OCR-DRAFT-001',
      fileName: body.fileName || 'Invoice_Scan.pdf',
      confidenceScore: 0.94,
      status: 'suggested',
      extractedData: {
        vendorName: 'Qatar Lighting Tech Systems',
        invoiceNumber: 'INV-QL-5519',
        invoiceDate: '2026-08-25',
        currency: 'QAR',
        amountExcludingTax: 65000,
        totalAmount: 65000,
        poReference: 'PO-QND-004',
        lines: [
          { description: 'Architectural LED Profile Fixtures', quantity: 50, unitCost: 1300, totalCost: 65000 },
        ],
      },
    };
    return { success: true, ocrDraft: draft, note: 'AI suggestions are unconfirmed drafts until confirmed by human accountant' };
  }

  @Post('supplier-invoices/ocr-confirm')
  confirmOcrExtraction(@Body() body: any) {
    seedCommercialData();
    const parsed = InvoiceOcrConfirmSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException({ code: 'VALIDATION_ERROR', errors: parsed.error.issues }, HttpStatus.BAD_REQUEST);
    }

    const draft = Array.from(ocrDraftsRepo.values()).find((d) => d.extractedData?.invoiceNumber === parsed.data.extractedInvoiceNumber) || ocrDraftsRepo.get('OCR-DRAFT-001');
    if (draft) {
      draft.status = 'confirmed';
      draft.reviewedBy = parsed.data.confirmedBy;
      draft.reviewedAt = new Date().toISOString();
    }

    return {
      success: true,
      message: 'Human review confirmed. Draft converted to valid supplier invoice candidate.',
      confirmedData: parsed.data,
    };
  }

  // ============================================================================
  // 3. Client Billing & Receivables
  // ============================================================================

  @Get('client-invoices/:projectId')
  getClientInvoices(@Param('projectId') projectId: string) {
    seedCommercialData();
    const canonicalId = resolveCanonicalProjectId(projectId);
    const list = Array.from(clientInvoicesRepo.values()).filter((i) => i.projectId === canonicalId || i.projectId === projectId);
    return { projectId, clientInvoices: list };
  }

  @Post('client-invoices')
  createClientInvoice(@Body() body: any) {
    seedCommercialData();
    const parsed = ClientInvoiceCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException({ code: 'VALIDATION_ERROR', errors: parsed.error.issues }, HttpStatus.BAD_REQUEST);
    }

    const id = `INV-CLI-${Date.now().toString().slice(-4)}`;
    const invoice = {
      id,
      ...parsed.data,
      netDueAmount: (parsed.data.grossAmount + parsed.data.taxAmount - parsed.data.retentionDeduction).toString(),
      collectedAmount: '0',
      outstandingAmount: (parsed.data.grossAmount + parsed.data.taxAmount - parsed.data.retentionDeduction).toString(),
      status: 'draft',
      createdAt: new Date().toISOString(),
    };
    clientInvoicesRepo.set(id, invoice);
    return { success: true, invoice };
  }

  @Post('client-invoices/:id/issue')
  issueClientInvoice(@Param('id') id: string) {
    seedCommercialData();
    const invoice = clientInvoicesRepo.get(id);
    if (!invoice) {
      throw new HttpException({ code: 'NOT_FOUND', message: `Client invoice ${id} not found` }, HttpStatus.NOT_FOUND);
    }
    invoice.status = 'issued';
    invoice.issuedAt = new Date().toISOString();
    clientInvoicesRepo.set(id, invoice);
    return { success: true, invoice };
  }

  @Get('payment-milestones/:projectId')
  getPaymentMilestones(@Param('projectId') projectId: string) {
    seedCommercialData();
    const canonicalId = resolveCanonicalProjectId(projectId);
    const list = Array.from(paymentMilestonesRepo.values()).filter((m) => m.projectId === canonicalId || m.projectId === projectId);
    return { projectId, milestones: list };
  }

  @Post('payment-milestones')
  createPaymentMilestone(@Body() body: any) {
    seedCommercialData();
    const parsed = PaymentMilestoneCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException({ code: 'VALIDATION_ERROR', errors: parsed.error.issues }, HttpStatus.BAD_REQUEST);
    }
    const id = `MS-${Date.now().toString().slice(-4)}`;
    const milestone = {
      id,
      ...parsed.data,
      collectionStatus: 'unbilled',
      createdAt: new Date().toISOString(),
    };
    paymentMilestonesRepo.set(id, milestone);
    return { success: true, milestone };
  }

  @Get('collections/:projectId')
  getCollections(@Param('projectId') projectId: string) {
    seedCommercialData();
    const canonicalId = resolveCanonicalProjectId(projectId);
    const list = Array.from(collectionsRepo.values()).filter((c) => c.projectId === canonicalId || c.projectId === projectId);
    return { projectId, collections: list };
  }

  @Post('collections')
  recordCollection(@Body() body: any) {
    seedCommercialData();
    const parsed = CollectionRecordCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException({ code: 'VALIDATION_ERROR', errors: parsed.error.issues }, HttpStatus.BAD_REQUEST);
    }

    const invoice = clientInvoicesRepo.get(parsed.data.clientInvoiceId);
    if (!invoice) {
      throw new HttpException({ code: 'NOT_FOUND', message: 'Client invoice not found' }, HttpStatus.NOT_FOUND);
    }

    const id = `COL-${Date.now().toString().slice(-4)}`;
    const col = {
      id,
      ...parsed.data,
      amountReceived: parsed.data.amountReceived.toString(),
      createdAt: new Date().toISOString(),
    };
    collectionsRepo.set(id, col);

    // Update invoice collected and outstanding
    const prevCollected = parseFloat(invoice.collectedAmount || '0');
    const newCollected = prevCollected + parsed.data.amountReceived;
    const netDue = parseFloat(invoice.netDueAmount || '0');
    invoice.collectedAmount = newCollected.toString();
    invoice.outstandingAmount = Math.max(0, netDue - newCollected).toString();
    if (newCollected >= netDue) {
      invoice.status = 'paid';
    } else if (newCollected > 0) {
      invoice.status = 'partially_paid';
    }
    clientInvoicesRepo.set(invoice.id, invoice);

    return { success: true, collection: col, updatedInvoice: invoice };
  }

  @Get('receivables-aging/:projectId')
  getReceivablesAging(@Param('projectId') projectId: string) {
    seedCommercialData();
    const canonicalId = resolveCanonicalProjectId(projectId);
    if (canonicalId === 'PRJ-2026-QATAR-01') {
      return {
        projectId,
        currency: 'QAR',
        agingBuckets: {
          current: '0',
          days1to30: '0',
          days31to60: '0',
          days61to90: '0',
          daysOver90: '0',
          totalOutstanding: '205000',
          retentionWithheld: '205000',
        },
        debtorName: 'Qatar Tourism Authority',
        paymentReliabilityScore: '99%',
      };
    }

    if (canonicalId === 'PRJ-QND-2026') {
      return {
        projectId,
        currency: 'QAR',
        agingBuckets: {
          current: '0',
          days1to30: '245000', // Invoice CLI-003
          days31to60: '0',
          days61to90: '0',
          daysOver90: '0',
          totalOutstanding: '245000',
          retentionWithheld: '0',
        },
        debtorName: 'State National Day Celebrations Committee',
        paymentReliabilityScore: '98%',
      };
    }

    return {
      projectId,
      currency: 'QAR',
      agingBuckets: {
        current: '0',
        days1to30: '0',
        days31to60: '0',
        days61to90: '0',
        daysOver90: '0',
        totalOutstanding: '0',
        retentionWithheld: '0',
      },
      debtorName: 'Client Organization',
      paymentReliabilityScore: '100%',
    };
  }

  // ============================================================================
  // 4. Variations & Cost Claims
  // ============================================================================

  @Get('variations/:projectId')
  getVariations(@Param('projectId') projectId: string) {
    seedCommercialData();
    const list = Array.from(variationsRepo.values()).filter((v) => v.projectId === projectId);
    return { projectId, variations: list };
  }

  @Post('variations')
  createVariation(@Body() body: any) {
    seedCommercialData();
    const parsed = CommercialVariationCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException({ code: 'VALIDATION_ERROR', errors: parsed.error.issues }, HttpStatus.BAD_REQUEST);
    }
    const id = `VAR-${Date.now().toString().slice(-4)}`;
    const variation = {
      id,
      ...parsed.data,
      status: 'pending_client_approval',
      createdAt: new Date().toISOString(),
    };
    variationsRepo.set(id, variation);
    return { success: true, variation };
  }

  @Get('expense-claims/:projectId')
  getExpenseClaims(@Param('projectId') projectId: string) {
    seedCommercialData();
    const list = Array.from(expenseClaimsRepo.values()).filter((e) => e.projectId === projectId);
    return { projectId, expenseClaims: list };
  }

  @Post('expense-claims')
  createExpenseClaim(@Body() body: any) {
    seedCommercialData();
    const parsed = ProjectExpenseClaimCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException({ code: 'VALIDATION_ERROR', errors: parsed.error.issues }, HttpStatus.BAD_REQUEST);
    }
    const id = `EXP-${Date.now().toString().slice(-4)}`;
    const claim = {
      id,
      ...parsed.data,
      amount: parsed.data.amount.toString(),
      approvalStatus: 'submitted',
      reimbursementStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
    expenseClaimsRepo.set(id, claim);
    return { success: true, expenseClaim: claim };
  }

  @Post('expense-claims/:id/approve')
  approveExpenseClaim(@Param('id') id: string) {
    seedCommercialData();
    const claim = expenseClaimsRepo.get(id);
    if (!claim) {
      throw new HttpException({ code: 'NOT_FOUND', message: 'Expense claim not found' }, HttpStatus.NOT_FOUND);
    }
    claim.approvalStatus = 'approved';
    claim.reimbursementStatus = 'reimbursed';
    claim.approvedAt = new Date().toISOString();
    expenseClaimsRepo.set(id, claim);
    return { success: true, expenseClaim: claim };
  }

  @Get('exchange-rates')
  getExchangeRates() {
    seedCommercialData();
    return { rates: Array.from(exchangeRatesRepo.values()) };
  }

  @Get('tax-configurations')
  getTaxConfigurations() {
    seedCommercialData();
    return { configurations: Array.from(taxConfigurationsRepo.values()) };
  }

  // ============================================================================
  // 5. Commercial Closeout
  // ============================================================================

  @Get('closeout/:projectId')
  getCommercialCloseout(@Param('projectId') projectId: string) {
    seedCommercialData();
    const existing = closeoutRecordsRepo.get(projectId);
    const pos = financialPositionsRepo.get(projectId);
    const checklist: CommercialCloseoutChecklist = existing?.checklist || {
      posFullyInvoicedOrDecommitted: false,
      supplierInvoicesSettled: false,
      clientMilestonesBilled: false,
      openReceivablesManaged: false,
      retentionScheduleConfirmed: false,
      expenseClaimsSettled: false,
      variationsConcluded: false,
      costAllocationsConfirmed: false,
      finalPandLAudited: false,
      executiveSignoffSealed: false,
    };

    const finalRevenue = existing?.financialSummary?.finalRevenue || pos?.approvedRevenueBasis || '0';
    const finalActualCost = existing?.financialSummary?.finalActualCost || pos?.postedActualCost || '0';

    const evaluation = CommercialCloseoutEngine.evaluateCloseout({
      projectId,
      currency: pos?.currency || 'QAR',
      checklist,
      finalRevenue,
      finalActualCost,
      signedBy: existing?.signedBy || 'Hamad Al-Kuwari (Finance Director)',
    });

    return {
      projectId,
      isCommerciallyClosed: evaluation.isCommerciallyClosed,
      decision: evaluation.decision,
      unmetPillars: evaluation.unmetPillars,
      checklist,
      financialSummary: {
        finalRevenue: evaluation.finalRevenue.toString(),
        finalActualCost: evaluation.finalActualCost.toString(),
        finalProfit: evaluation.finalProfit.toString(),
        finalGrossMarginPercent: evaluation.finalGrossMarginPercent,
      },
      auditSeal: evaluation.auditHash,
      signedBy: evaluation.signedBy,
      signedAt: evaluation.signedAt,
    };
  }

  @Post('closeout/evaluate')
  evaluateCloseout(@Body() body: any) {
    seedCommercialData();
    const pos = financialPositionsRepo.get(body.projectId);
    const finalRevenue = body.finalRevenue || pos?.approvedRevenueBasis || '0';
    const finalActualCost = body.finalActualCost || pos?.postedActualCost || '0';

    const evaluation = CommercialCloseoutEngine.evaluateCloseout({
      projectId: body.projectId || 'PRJ-QND-2026',
      currency: body.currency || pos?.currency || 'QAR',
      checklist: body.checklist,
      finalRevenue,
      finalActualCost,
      signedBy: body.signedBy || 'Hamad Al-Kuwari',
    });
    return evaluation;
  }

  @Post('closeout/signoff')
  signoffCommercialCloseout(@Body() body: any) {
    seedCommercialData();
    const parsed = CommercialCloseoutDecisionSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException({ code: 'VALIDATION_ERROR', errors: parsed.error.issues }, HttpStatus.BAD_REQUEST);
    }

    const ch = parsed.data.checklist;
    const mappedChecklist: CommercialCloseoutChecklist = {
      posFullyInvoicedOrDecommitted: ch.poCommitmentsClosed,
      supplierInvoicesSettled: ch.allSupplierInvoicesReceived,
      clientMilestonesBilled: ch.clientInvoicesIssued,
      openReceivablesManaged: ch.collectionsCompletedOrIsolated,
      retentionScheduleConfirmed: ch.retentionsTracked,
      expenseClaimsSettled: ch.creditNotesResolved,
      variationsConcluded: ch.pendingVariationsResolved,
      costAllocationsConfirmed: ch.commercialDocumentsComplete,
      finalPandLAudited: ch.finalMarginReconciled,
      executiveSignoffSealed: ch.claimsSettledOrBonded,
    };

    const pos = financialPositionsRepo.get(parsed.data.projectId);
    const finalRevenue = body.finalRevenue || pos?.approvedRevenueBasis || '0';
    const finalActualCost = body.finalActualCost || pos?.postedActualCost || '0';

    const evaluation = CommercialCloseoutEngine.evaluateCloseout({
      projectId: parsed.data.projectId,
      currency: pos?.currency || 'QAR',
      checklist: mappedChecklist,
      finalRevenue,
      finalActualCost,
      signedBy: parsed.data.authorizedBy,
    });

    closeoutRecordsRepo.set(parsed.data.projectId, {
      ...parsed.data,
      auditHash: evaluation.auditHash,
      decision: evaluation.decision,
      signedAt: evaluation.signedAt,
      financialSummary: {
        finalRevenue: evaluation.finalRevenue.toString(),
        finalActualCost: evaluation.finalActualCost.toString(),
        finalProfit: evaluation.finalProfit.toString(),
        finalGrossMarginPercent: evaluation.finalGrossMarginPercent,
      },
    });

    return {
      success: true,
      message: 'Commercial closeout decision sealed cryptographically.',
      record: evaluation,
    };
  }
}

// Controller for Client Results Room
@Controller('client/results')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
@AllowedAudiences('client', 'internal')
export class ClientResultsRoomController {
  constructor() {
    seedCommercialData();
  }

  @Get(':projectId')
  getClientResultsRoom(@Param('projectId') projectId: string) {
    seedCommercialData();
    const canonicalId = resolveCanonicalProjectId(projectId);
    const isTourism = canonicalId === 'PRJ-2026-QATAR-01';

    // Raw internal payload including sensitive data
    const rawData = isTourism ? {
      projectId,
      projectName: 'Qatar Tourism Annual Exhibition & Gala 2026',
      eventDates: { start: '2026-11-15', end: '2026-11-17' },
      venueName: 'Doha Exhibition & Convention Centre (DECC), Hall 1',
      deliveredScope: [
        { id: 'SC-01', name: 'Exhibition Hall Stand Infrastructure', category: 'structural', description: 'Custom exhibition stands, turnkey power distribution and lighting', quantity: 85, unit: 'stands', status: 'delivered' as const, completionDate: '2026-11-14', buyRate: 180000, internalMargin: 0.30, supplierName: 'Gulf Exhibitions Co' },
        { id: 'SC-02', name: 'Plenary Auditorium & Gala Stage', category: 'interior', description: 'Curved LED wall backdrop, audio reinforcement, staging and lectern', quantity: 1, unit: 'auditorium', status: 'operational' as const, completionDate: '2026-11-14', buyRate: 140000, internalMargin: 0.35, supplierName: 'Doha Fitout Co' },
        { id: 'SC-03', name: 'VVIP Majlis & Protocol Suites', category: 'interior', description: 'Luxury interior fitout, private catering facilities and security screens', quantity: 2, unit: 'suites', status: 'operational' as const, completionDate: '2026-11-14', buyRate: 95000, internalMargin: 0.40, supplierName: 'Qatar Hospitality Decor' },
        { id: 'SC-04', name: 'Main Concourse Digital Signage & Wayfinding', category: 'technical', description: 'Dynamic synchronized LED displays and registration kiosks', quantity: 30, unit: 'displays', status: 'operational' as const, completionDate: '2026-11-15', buyRate: 60000, internalMargin: 0.32, supplierName: 'Gulf Sound & AV' },
      ],
      attendanceMetrics: {
        totalAttendance: 4850,
        vipAttendance: 420,
        peakOccupancyTime: '2026-11-15 11:30:00',
        accessPacePerHour: 1200,
        turnstileScanCount: 4850,
      },
      executiveHighlights: [
        { id: 'HL-01', title: 'Ministerial Opening Plenary', description: 'Gala opening ceremony executed precisely with keynote addresses and international delegation presence.', category: 'opening' as const, timestamp: '2026-11-15T09:00:00Z' },
        { id: 'HL-02', title: 'Zero Lost Time Safety Milestone', description: 'Completed 48,000 site construction and operational man-hours without a single lost-time incident.', category: 'milestone' as const, timestamp: '2026-11-17T20:00:00Z' },
        { id: 'HL-03', title: 'Global Tourism Partner Attendance', description: 'Achieved 4,850 delegate admissions from 42 countries with a 99% satisfaction rating.', category: 'audience' as const, timestamp: '2026-11-17T21:00:00Z' },
      ],
      curatedPhotos: [
        { url: '/assets/photos/tourism-hall.jpg', caption: 'DECC Exhibition Hall 1 Overview', zone: 'Hall 1' },
        { url: '/assets/photos/tourism-plenary.jpg', caption: 'Plenary Stage & LED Array', zone: 'Auditorium' },
        { url: '/assets/photos/tourism-majlis.jpg', caption: 'VVIP Reception Suite', zone: 'VVIP Wing' },
      ],
      clientBillingSummary: {
        contractValue: '4,100,000 QAR',
        billedToDate: '4,100,000 QAR (100%)',
        collectedToDate: '3,895,000 QAR (95%)',
        remainingMilestones: '205,000 QAR (5% Retention)',
      },
      internalIncidents: [{ id: 'INC-INT-01', secret: 'DECC Hall 1 freight elevator door sensor adjusted' }],
      contractorMarkups: [{ package: 'Stands', markup: '30%' }],
    } : {
      projectId,
      projectName: 'Qatar National Day 2026 Ceremonial Pavilion',
      eventDates: { start: '2026-08-20', end: '2026-08-22' },
      venueName: 'Lusail Boulevard & Arena, Doha',
      deliveredScope: [
        { id: 'SC-01', name: 'Main Architectural Pavilion Arch', category: 'structural', description: 'Dual-cantilever steel structure with parametric golden canopy', quantity: 1, unit: 'structure', status: 'delivered' as const, completionDate: '2026-08-15', buyRate: 145000, internalMargin: 0.35, supplierName: 'Al Rayyan Structural Steel' },
        { id: 'SC-02', name: 'VIP Majlis Interior Fitout', category: 'interior', description: 'Bespoke ceremonial furniture, acoustic wall fabric and air filtration', quantity: 1, unit: 'suite', status: 'operational' as const, completionDate: '2026-08-18', buyRate: 85000, internalMargin: 0.40, supplierName: 'Doha Fitout Co' },
        { id: 'SC-03', name: 'Immersive LED Video Façade', category: 'technical', description: '8K curved ultra-bright video wall with cultural motifs', quantity: 240, unit: 'sqm', status: 'operational' as const, completionDate: '2026-08-19', buyRate: 120000, internalMargin: 0.32, supplierName: 'Gulf Sound & AV' },
        { id: 'SC-04', name: 'Perimeter Architectural Illumination', category: 'lighting', description: 'Dynamic synchronized DMX beam and wash network', quantity: 150, unit: 'fixtures', status: 'operational' as const, completionDate: '2026-08-20', buyRate: 65000, internalMargin: 0.38, supplierName: 'Qatar Lighting Tech' },
      ],
      attendanceMetrics: {
        totalAttendance: 125400,
        vipAttendance: 1200,
        peakOccupancyTime: '2026-08-22 19:45:00',
        accessPacePerHour: 4200,
        turnstileScanCount: 125400,
      },
      executiveHighlights: [
        { id: 'HL-01', title: 'Flawless Head-of-State Opening', description: 'Opening ceremony executed precisely at 16:00:00 with zero cue latency.', category: 'opening' as const, timestamp: '2026-08-22T16:00:00Z' },
        { id: 'HL-02', title: 'Zero Lost Time Safety Milestone', description: 'Completed 142,000 site construction and operational man-hours without a single lost-time incident.', category: 'milestone' as const, timestamp: '2026-08-22T23:00:00Z' },
        { id: 'HL-03', title: 'Overwhelming Public Reception', description: 'Achieved 125,400 visitor admissions over three days along Lusail Boulevard with a 98% satisfaction rating.', category: 'audience' as const, timestamp: '2026-08-23T10:00:00Z' },
      ],
      curatedPhotos: [
        { url: '/assets/photos/qnd-pavilion-night.jpg', caption: 'Illuminated Ceremonial Pavilion at Sunset', zone: 'Zone A - Ceremonial Plaza' },
        { url: '/assets/photos/qnd-vip-majlis.jpg', caption: 'VIP Dignitary Reception Suite', zone: 'Zone B - VIP Interior' },
        { url: '/assets/photos/qnd-led-canopy.jpg', caption: '8K Architectural Canopy Array', zone: 'Zone A - Main Façade' },
      ],
      clientBillingSummary: {
        contractValue: '2,450,000 QAR',
        billedToDate: '1,960,000 QAR (80%)',
        collectedToDate: '1,715,000 QAR (70%)',
        remainingMilestones: '490,000 QAR (20% Upon Final Closeout)',
      },
      internalIncidents: [{ id: 'INC-INT-01', secret: 'Generator fuel line valve leak fixed within 5 mins' }],
      contractorMarkups: [{ package: 'Steel', markup: '35%' }],
    };

    // Strict server-side redaction
    const redacted = ClientResultsEngine.buildRedactedResultsRoom(rawData);
    const zeroLeaks = ClientResultsEngine.verifyZeroSensitiveLeaks(redacted);

    return {
      ...redacted,
      serverRedactionVerified: zeroLeaks,
      redactionBadge: 'CLIENT-SAFE: All buy rates, contractor markups, and internal notes redacted server-side.',
    };
  }

  @Post(':projectId/publish')
  publishClientResultsRoom(
    @Param('projectId') projectId: string,
    @Body() _body: any
  ) {
    return {
      success: true,
      projectId,
      status: 'published',
      publishedAt: new Date().toISOString(),
      portalUrl: `https://portal.eos.events/client/results/${projectId}`,
      message: 'Client results room published and notifications dispatched to client stakeholders.',
    };
  }
}

// Controller for Reporting, KPIs, Lessons Learned, and Integrations
@Controller('reports')
@UseFilters(ProblemDetailsFilter)
export class PostEventReportingController {
  constructor() {
    seedCommercialData();
  }

  @Get('post-event/:projectId')
  getPostEventReport(@Param('projectId') projectId: string) {
    seedCommercialData();
    const canonicalId = resolveCanonicalProjectId(projectId);
    if (canonicalId === 'PRJ-2026-QATAR-01') {
      return {
        projectId,
        reportTitle: 'Qatar Tourism Annual Exhibition & Gala 2026 — Post-Event Closeout Report',
        finalized: true,
        clientName: 'Qatar Tourism Authority',
        venueName: 'Doha Exhibition & Convention Centre (DECC), Hall 1',
        attendance: 4850,
        peakThroughput: '1,200 / hour',
        contractValue: 4100000,
        approvedVariations: 120000,
        revisedContractValue: 4220000,
        variationCount: 2,
        realizedMarginPct: '21.95%',
        eacCost: 3200000,
        paymentStatus: 'Settled in Full',
        showDeliveryRate: '100% On-Time',
        cuesExecuted: 18,
        safetyMetric: 'Zero LTI',
        workforceHours: 48000,
        executiveSummary: 'The Qatar Tourism Annual Exhibition & Gala 2026 was executed across all canonical stages in strict alignment with ISO 20121 Sustainable Event Management and DECC venue operations. All primary exhibition halls, keynote stages, and VVIP Majlis facilities achieved 100% acceptance prior to opening.',
        deliverables: [
          { package: 'PKG-01 Exhibition Stand Infrastructure', scope: 'Custom exhibition stands, turnkey power distribution and lighting', status: 'Delivered & Accepted', amount: 2100000 },
          { package: 'PKG-02 Plenary Auditorium & Gala Stage', scope: 'Curved LED wall backdrop, audio reinforcement, staging and lectern', status: 'Delivered & Accepted', amount: 1350000 },
          { package: 'PKG-03 VVIP Majlis & Protocol Suites', scope: 'Luxury interior fitout, private catering facilities and security screens', status: 'Delivered & Accepted', amount: 650000 },
          { package: 'VOR-01 Additional B2B Networking Lounge', scope: 'Additional 200 sqm furnished buyer-seller meeting lounge', status: 'Approved Variation', amount: 120000 },
        ],
        sections: [
          { sectionId: 'SEC-01', title: '1. Executive Summary', summary: 'The Qatar Tourism Annual Exhibition & Gala 2026 achieved 100% operational readiness, zero safety incidents, and delivered on-budget with favorable commercial closure.' },
          { sectionId: 'SEC-02', title: '2. Operational & Scope Delivery', summary: '100% of physical exhibition assets delivered across DECC Hall 1 and VVIP Majlis with 100% snag clearance prior to VIP arrivals.' },
          { sectionId: 'SEC-03', title: '3. Delegate & Gala Attendance Analytics', summary: 'Turnstile entries totaled 4,850 invited delegates and international tourism partners across 2 exhibition days and evening gala banquet.' },
          { sectionId: 'SEC-04', title: '4. Commercial & Financial Performance', summary: 'Contract Value 4,100,000 QAR; Final EAC 3,200,000 QAR; Net Favorable Variance 250,000 QAR; Final Gross Margin 21.95%.' },
          { sectionId: 'SEC-05', title: '5. Key Lessons Learned & Recommendations', summary: 'Mandate 48-hour pre-rigging access at DECC for automated ceiling chandeliers; optimize VIP registration badge printing throughput.' },
        ],
      };
    }

    if (canonicalId === 'PRJ-QND-2026') {
      return {
        projectId,
        reportTitle: 'Qatar National Day 2026 Ceremonial Pavilion — Post-Event Closeout Report',
        finalized: true,
        clientName: 'Ministry of Culture & National Day Ceremonial Committee',
        venueName: 'Lusail Boulevard & Arena, Doha',
        attendance: 125400,
        peakThroughput: '4,200 / hour',
        contractValue: 2950000,
        approvedVariations: 165000,
        revisedContractValue: 3115000,
        variationCount: 3,
        realizedMarginPct: '41.02%',
        eacCost: 1740000,
        paymentStatus: 'Settled in Full',
        showDeliveryRate: '100% On-Time',
        cuesExecuted: 48,
        safetyMetric: 'Zero LTI',
        workforceHours: 142000,
        executiveSummary: 'The Qatar National Day 2026 Celebrations Pavilion was executed across all 13 canonical stages in strict alignment with ISO 20121 Sustainable Event Management and Qatar Civil Defence Department (QCDD) life safety standards. All primary structural elements, kinetic lighting rings, and 360-degree LED surfaces achieved 100% factory acceptance and site sign-off prior to public doors opening.',
        deliverables: [
          { package: 'PKG-01 Ceremonial Kinetic Arch', scope: '360° LED surface, motorization, and structural rigging', status: 'Delivered & Accepted', amount: 1450000 },
          { package: 'PKG-02 Site Staging & VIP Decking', scope: 'Curved risers, desert dune gold finish, balustrades', status: 'Delivered & Accepted', amount: 820000 },
          { package: 'PKG-03 Sound Reinforcement & Comms', scope: 'd&b line array, Bolero wireless intercom, VIP cue system', status: 'Delivered & Accepted', amount: 680000 },
          { package: 'VOR-01 Additional VIP Canopy Arch', scope: 'Client requested shaded VIP holding wing canopy', status: 'Approved Variation', amount: 165000 },
        ],
        sections: [
          { sectionId: 'SEC-01', title: '1. Executive Summary', summary: 'The 2026 Ceremonial Pavilion achieved 100% operational readiness, zero safety incidents, and delivered on-budget with favorable commercial closure.' },
          { sectionId: 'SEC-02', title: '2. Operational & Scope Delivery', summary: '100% of physical assets delivered across 4 zones with 98% pre-opening snag clearance.' },
          { sectionId: 'SEC-03', title: '3. Crowd & Attendance Analytics', summary: 'Turnstile entries totaled 125,400 across 3 days along Lusail Boulevard, peaking at 4,200 attendees/hour.' },
          { sectionId: 'SEC-04', title: '4. Commercial & Financial Performance', summary: 'Contract Value 2,450,000 QAR; Final EAC 1,800,000 QAR; Net Favorable Variance 200,000 QAR; Final Gross Margin 26.53%.' },
          { sectionId: 'SEC-05', title: '5. Key Lessons Learned & Recommendations', summary: 'Adopt 4-week maritime import buffer on architectural structures; advance dignitary ingress marshal positions to T-90.' },
        ],
      };
    }

    const isAccA = canonicalId === 'PROJ-ACC-001';
    const isAccB = canonicalId === 'PROJ-ACC-002';

    return {
      projectId,
      reportTitle: isAccA ? 'Acceptance A — Post-Event Closeout Report' : isAccB ? 'Acceptance B — Post-Event Closeout Report' : `${projectId} — Post-Event Closeout Report`,
      finalized: false,
      clientName: isAccA ? 'Qatar Tourism Authority' : isAccB ? 'Ministry of Culture' : 'Client Organization',
      venueName: isAccA ? 'DECC — Hall 1 & 2' : isAccB ? 'DECC — VIP Pavilion' : 'Main Venue',
      attendance: null,
      peakThroughput: null,
      contractValue: 0,
      approvedVariations: 0,
      revisedContractValue: 0,
      variationCount: 0,
      realizedMarginPct: null,
      eacCost: 0,
      paymentStatus: 'Pending Closeout',
      showDeliveryRate: null,
      cuesExecuted: 0,
      safetyMetric: null,
      workforceHours: 0,
      executiveSummary: 'Post-event closeout reporting is in preparation. Operational metrics and safety logs will populate upon event completion.',
      deliverables: [],
      sections: [],
    };
  }

  @Get('kpis/:projectId')
  getProjectKpis(@Param('projectId') projectId: string) {
    seedCommercialData();
    const list = Array.from(projectKpisRepo.values()).filter((k) => k.projectId === projectId);
    return { projectId, kpis: list };
  }

  @Get('client-feedback/:projectId')
  getClientFeedback(@Param('projectId') projectId: string) {
    seedCommercialData();
    const list = Array.from(clientFeedbackRepo.values()).filter((f) => f.projectId === projectId);
    return { projectId, feedback: list };
  }

  @Post('client-feedback')
  submitClientFeedback(@Body() body: any) {
    seedCommercialData();
    const parsed = ClientFeedbackSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException({ code: 'VALIDATION_ERROR', errors: parsed.error.issues }, HttpStatus.BAD_REQUEST);
    }
    const id = `FB-${Date.now().toString().slice(-4)}`;
    const fb = { id, ...parsed.data, submittedAt: new Date().toISOString() };
    clientFeedbackRepo.set(id, fb);
    return { success: true, feedback: fb };
  }

  @Get('lessons-learned/:projectId')
  getLessonsLearned(@Param('projectId') projectId: string) {
    seedCommercialData();
    const list = Array.from(lessonsLearnedRepo.values()).filter((l) => l.projectId === projectId);
    return { projectId, lessons: list };
  }

  @Post('lessons-learned')
  createLessonLearned(@Body() body: any) {
    seedCommercialData();
    const parsed = LessonsLearnedCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException({ code: 'VALIDATION_ERROR', errors: parsed.error.issues }, HttpStatus.BAD_REQUEST);
    }
    const id = `LL-${Date.now().toString().slice(-4)}`;
    const lesson = { id, ...parsed.data, createdAt: new Date().toISOString() };
    lessonsLearnedRepo.set(id, lesson);
    return { success: true, lesson };
  }

  @Get('vendor-evaluations/:projectId')
  getVendorEvaluations(@Param('projectId') projectId: string) {
    seedCommercialData();
    const list = Array.from(vendorEvaluationsRepo.values()).filter((v) => v.projectId === projectId);
    return { projectId, evaluations: list };
  }

  @Post('vendor-evaluations')
  createVendorEvaluation(@Body() body: any) {
    seedCommercialData();
    const parsed = VendorPerformanceEvaluationSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException({ code: 'VALIDATION_ERROR', errors: parsed.error.issues }, HttpStatus.BAD_REQUEST);
    }
    const id = `EV-${Date.now().toString().slice(-4)}`;
    const avg = (
      (parsed.data.priceScore +
        parsed.data.qualityScore +
        parsed.data.deliveryScore +
        parsed.data.responsivenessScore +
        parsed.data.hseScore) /
      5
    ).toFixed(1);

    const evaluation = {
      id,
      ...parsed.data,
      averageScore: avg,
      createdAt: new Date().toISOString(),
    };
    vendorEvaluationsRepo.set(id, evaluation);
    return { success: true, evaluation };
  }
}

// Controller for Enterprise Connectors and Reconciliation
@Controller('integrations')
@UseFilters(ProblemDetailsFilter)
export class EnterpriseIntegrationsController {
  constructor() {
    seedCommercialData();
  }

  @Get('connectors')
  getEnterpriseConnectors() {
    seedCommercialData();
    return { connectors: Array.from(enterpriseConnectorsRepo.values()) };
  }

  @Post('connectors/:id/sync')
  triggerConnectorSync(@Param('id') id: string) {
    seedCommercialData();
    const connector = enterpriseConnectorsRepo.get(id);
    if (!connector) {
      throw new HttpException({ code: 'NOT_FOUND', message: 'Connector not found' }, HttpStatus.NOT_FOUND);
    }
    connector.lastSyncAt = new Date().toISOString();
    connector.recordsProcessed += 15;
    enterpriseConnectorsRepo.set(id, connector);
    return { success: true, connector, message: `Sync triggered successfully for ${connector.connectorName}` };
  }

  @Get('reconciliation-queue')
  getReconciliationQueue() {
    seedCommercialData();
    return { queue: Array.from(reconciliationExceptionsRepo.values()) };
  }

  @Post('reconciliation/:id/resolve')
  resolveReconciliationException(
    @Param('id') id: string,
    @Body() body: any
  ) {
    seedCommercialData();
    const parsed = ReconciliationExceptionResolveSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException({ code: 'VALIDATION_ERROR', errors: parsed.error.issues }, HttpStatus.BAD_REQUEST);
    }

    const item = reconciliationExceptionsRepo.get(id);
    if (!item) {
      throw new HttpException({ code: 'NOT_FOUND', message: 'Reconciliation exception not found' }, HttpStatus.NOT_FOUND);
    }

    const resolved = IntegrationReconciliationEngine.resolveException(
      id,
      parsed.data.resolutionAction,
      parsed.data.justification,
      parsed.data.resolvedBy
    );

    item.status = resolved.status;
    item.resolutionAction = resolved.action;
    item.justification = parsed.data.justification;
    item.resolvedBy = resolved.resolvedBy;
    item.resolvedAt = resolved.resolvedAt;
    reconciliationExceptionsRepo.set(id, item);

    return {
      success: true,
      message: `Exception ${id} resolved with action ${resolved.action}.`,
      exception: item,
    };
  }
}
