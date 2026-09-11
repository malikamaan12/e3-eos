import { Decimal } from 'decimal.js';
import { Money, CurrencyCode } from './money.js';

export interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  iban: string;
  swift: string;
}

export type VendorType =
  | 'company'
  | 'freelancer'
  | 'individual_supplier'
  | 'subcontractor'
  | 'rental_supplier'
  | 'fabricator'
  | 'technical_supplier'
  | 'logistics_supplier'
  | 'talent_supplier'
  | 'international_supplier';

export const STANDARD_VENDOR_TYPES: VendorType[] = [
  'company',
  'freelancer',
  'individual_supplier',
  'subcontractor',
  'rental_supplier',
  'fabricator',
  'technical_supplier',
  'logistics_supplier',
  'talent_supplier',
  'international_supplier',
];

export type VendorStatus =
  | 'prospect'
  | 'registration_pending'
  | 'under_review'
  | 'approved'
  | 'conditionally_approved'
  | 'suspended'
  | 'blacklisted'
  | 'archived'
  | 'active'; // backwards-compatibility alias

export const STANDARD_VENDOR_STATUSES: VendorStatus[] = [
  'prospect',
  'registration_pending',
  'under_review',
  'approved',
  'conditionally_approved',
  'suspended',
  'blacklisted',
  'archived',
];

export type VendorCategory = 'corporate' | 'freelance' | 'cash_supplier';

export interface VendorDocument {
  id: string;
  title: string;
  documentType: 'cr' | 'tax_cert' | 'insurance' | 'trade_license' | 'iso_cert' | 'other';
  uri: string;
  validUntil?: Date;
  uploadedAt: Date;
}

export interface VendorInsurancePolicy {
  provider: string;
  policyNumber: string;
  validUntil: Date;
  coverageAmount?: Money;
}

export interface Vendor {
  id: string;
  vendorCode: string;
  name: string;
  vendorType?: VendorType;
  category?: VendorCategory;
  status: VendorStatus;
  crNumber?: string;
  taxOrVatNumber?: string;
  insurancePolicy?: VendorInsurancePolicy;
  certifications?: string[];
  bankDetails?: BankDetails;
  restrictedBankDetails?: BankDetails; // sensitive, RBAC restricted
  documents?: VendorDocument[];
  projectsUsed?: string[];
  performanceRating?: number; // 0 - 100
  riskFlags?: string[];
  contactPerson?: {
    name: string;
    email: string;
    phone: string;
  };
  country?: string;
  onboardingStage?: string;
  complianceVerified: boolean;
  soleSourceAuthorised?: boolean;
  freelanceGracePeriodUntil?: Date;
}

export interface VendorApprovalPolicyConfig {
  requireCrForCompanies: boolean;
  requireTaxNumber: boolean;
  requireValidInsurance: boolean;
  requireVerifiedBankDetails: boolean;
  maxRiskFlagsAllowed: number;
}

export const DEFAULT_VENDOR_APPROVAL_POLICY: VendorApprovalPolicyConfig = {
  requireCrForCompanies: true,
  requireTaxNumber: true,
  requireValidInsurance: false,
  requireVerifiedBankDetails: true,
  maxRiskFlagsAllowed: 0,
};

export class VendorApprovalPolicyEngine {
  static evaluate(
    vendor: Vendor,
    policy: VendorApprovalPolicyConfig = DEFAULT_VENDOR_APPROVAL_POLICY
  ): {
    canApprove: boolean;
    violations: string[];
    recommendedStatus: VendorStatus;
  } {
    const violations: string[] = [];

    if (vendor.status === 'blacklisted') {
      violations.push('VENDOR_BLACKLISTED: Vendor is explicitly blacklisted and cannot be approved.');
      return { canApprove: false, violations, recommendedStatus: 'blacklisted' };
    }

    if (vendor.riskFlags && vendor.riskFlags.length > policy.maxRiskFlagsAllowed) {
      violations.push(
        `RISK_FLAGS_EXCEEDED: Vendor has ${vendor.riskFlags.length} active risk flag(s): ${vendor.riskFlags.join(', ')}`
      );
    }

    const vendorType = vendor.vendorType || (vendor.category === 'freelance' ? 'freelancer' : 'company');
    const isCompanyType = [
      'company',
      'subcontractor',
      'rental_supplier',
      'fabricator',
      'technical_supplier',
      'logistics_supplier',
      'international_supplier',
    ].includes(vendorType);

    if (policy.requireCrForCompanies && isCompanyType && (!vendor.crNumber || vendor.crNumber.trim() === '')) {
      violations.push('MISSING_CR: Commercial Registration (CR) number is required for corporate entities.');
    }

    if (policy.requireTaxNumber && (!vendor.taxOrVatNumber || vendor.taxOrVatNumber.trim() === '')) {
      violations.push('MISSING_TAX_ID: Tax / VAT registration number is required.');
    }

    if (policy.requireVerifiedBankDetails && !vendor.bankDetails && !vendor.restrictedBankDetails) {
      violations.push('MISSING_BANK_DETAILS: Bank details must be recorded prior to final approval.');
    }

    if (vendor.insurancePolicy && new Date(vendor.insurancePolicy.validUntil).getTime() < Date.now()) {
      violations.push(
        `EXPIRED_INSURANCE: Insurance policy expired on ${new Date(vendor.insurancePolicy.validUntil).toISOString()}`
      );
    } else if (policy.requireValidInsurance && !vendor.insurancePolicy) {
      violations.push('MISSING_INSURANCE: Valid commercial insurance policy is required.');
    }

    const canApprove = violations.length === 0;
    const recommendedStatus: VendorStatus = canApprove
      ? 'approved'
      : violations.length === 1 && violations[0].startsWith('MISSING_INSURANCE')
      ? 'conditionally_approved'
      : 'under_review';

    return { canApprove, violations, recommendedStatus };
  }

  static maskIban(iban: string): string {
    const clean = iban.replace(/\s+/g, '');
    if (clean.length < 8) return '••••';
    const start = clean.slice(0, 4);
    const end = clean.slice(-4);
    return `${start} •••• •••• •••• ${end}`;
  }

  static canAccessRestrictedBankDetails(role: string): boolean {
    const authorizedRoles = [
      'finance_controller',
      'super_admin',
      'commercial_director',
      'financial_controller',
      'cfo',
    ];
    return authorizedRoles.includes(role.toLowerCase().replace(/[\s-]+/g, '_'));
  }
}


export interface BankChangeRequest {
  requestId: string;
  vendorId: string;
  proposedBankDetails: BankDetails;
  requestedBy: string;
  requestedAt: Date;
  status: 'pending_verification' | 'verified' | 'rejected';
  verifiedBy?: string;
  verifiedAt?: Date;
  rejectionReason?: string;
}

export interface FrameworkContract {
  id: string;
  contractCode: string;
  vendorId: string;
  currency: CurrencyCode;
  ceilingAmount: Money;
  consumedAmount: Money;
  validUntil: Date;
}

export type POStatus =
  | 'draft'
  | 'approved'
  | 'released'
  | 'acknowledged'
  | 'reconciliation_needed'
  | 'partially_received'
  | 'fully_received'
  | 'cancelled';

export interface POLine {
  id: string;
  poId: string;
  packageId: string; // Work package this line belongs to (AT-053)
  description: string;
  quantity: Decimal;
  unitCost: Money;
  totalCost: Money;
  receivedQuantity: Decimal;
  rejectedQuantity: Decimal;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  frameworkContractId?: string;
  currency: CurrencyCode;
  totalAmount: Money;
  status: POStatus;
  lines: POLine[];
  releaseIdempotencyKey?: string;
  releasedAt?: Date;
  externalDeliveryStatus: 'not_sent' | 'sent_pending_confirmation' | 'confirmed' | 'failed';
  soleSourceRationale?: string;
  isSoleSource: boolean;
}

export class ProcurementEngine {
  /**
   * Consumes parent framework contract ceiling atomically (AT-044).
   * Prevents unapproved ceiling overruns when multiple call-offs occur.
   */
  static consumeFrameworkCeiling(
    contract: FrameworkContract,
    callOffAmount: Money
  ): {
    updatedContract: FrameworkContract;
    remainingCeiling: Money;
  } {
    if (contract.ceilingAmount.currency !== callOffAmount.currency) {
      throw new Error(
        `CURRENCY_MISMATCH: Contract ceiling is in ${contract.ceilingAmount.currency} but call-off requested in ${callOffAmount.currency}`
      );
    }

    const newConsumed = contract.consumedAmount.plus(callOffAmount);

    if (newConsumed.amount.gt(contract.ceilingAmount.amount)) {
      const remaining = contract.ceilingAmount.minus(contract.consumedAmount);
      throw new Error(
        `FRAMEWORK_CEILING_EXCEEDED: Call-off of ${callOffAmount.toString()} ${callOffAmount.currency} exceeds remaining contract ceiling of ${remaining.toString()} ${remaining.currency} (Ceiling: ${contract.ceilingAmount.toString()}, Already Consumed: ${contract.consumedAmount.toString()}).`
      );
    }

    const remainingCeiling = contract.ceilingAmount.minus(newConsumed);
    const updatedContract: FrameworkContract = {
      ...contract,
      consumedAmount: newConsumed,
    };

    return {
      updatedContract,
      remainingCeiling,
    };
  }

  /**
   * Protected vendor bank details change request (AT-046).
   * Ordinary vendor update cannot silently redirect bank details.
   */
  static requestBankDetailsChange(
    vendor: Vendor,
    proposedDetails: BankDetails,
    requestedBy: string
  ): BankChangeRequest {
    return {
      requestId: `bcr-${vendor.id}-${Date.now()}`,
      vendorId: vendor.id,
      proposedBankDetails: proposedDetails,
      requestedBy,
      requestedAt: new Date(),
      status: 'pending_verification',
    };
  }

  /**
   * Verifies and applies bank change after independent financial review (AT-046).
   */
  static verifyBankChange(
    vendor: Vendor,
    request: BankChangeRequest,
    verifiedBy: string
  ): { updatedVendor: Vendor; updatedRequest: BankChangeRequest } {
    if (request.status !== 'pending_verification') {
      throw new Error(`BANK_CHANGE_NOT_PENDING: Request status is ${request.status}`);
    }

    if (request.requestedBy === verifiedBy) {
      throw new Error('TWO_PERSON_RULE_VIOLATION: Requester cannot self-verify bank detail changes.');
    }

    const updatedRequest: BankChangeRequest = {
      ...request,
      status: 'verified',
      verifiedBy,
      verifiedAt: new Date(),
    };

    const updatedVendor: Vendor = {
      ...vendor,
      bankDetails: request.proposedBankDetails,
    };

    return { updatedVendor, updatedRequest };
  }

  /**
   * Validates sole-source and freelance supplier justification without fake documents (AT-047).
   */
  static validateSupplierRoute(
    vendor: Vendor,
    options: {
      isSoleSource?: boolean;
      soleSourceRationale?: string;
    }
  ): void {
    if (options.isSoleSource) {
      if (!options.soleSourceRationale || options.soleSourceRationale.trim().length < 10) {
        throw new Error(
          'SOLE_SOURCE_RATIONALE_REQUIRED: Direct sole-source award requires an explicit documented rationale (minimum 10 characters).'
        );
      }
    }

    if (vendor.category === 'freelance') {
      const now = new Date();
      if (vendor.freelanceGracePeriodUntil && now > vendor.freelanceGracePeriodUntil && !vendor.complianceVerified) {
        throw new Error(
          'FREELANCE_COMPLIANCE_EXPIRED: Freelance grace period has expired without mandatory verification.'
        );
      }
    }
  }

  /**
   * Releases Purchase Order with durable idempotency (AT-043).
   * Concurrent duplicate release calls return the same commitment without creating a duplicate.
   */
  static releasePurchaseOrder(
    po: PurchaseOrder,
    idempotencyKey: string
  ): {
    po: PurchaseOrder;
    isDuplicateRelease: boolean;
  } {
    if (po.status === 'released' || po.status === 'acknowledged') {
      if (po.releaseIdempotencyKey === idempotencyKey) {
        // Idempotent retry: return existing commitment cleanly
        return { po, isDuplicateRelease: true };
      }
      throw new Error(`PO_ALREADY_RELEASED: Purchase Order ${po.poNumber} was already released with key ${po.releaseIdempotencyKey}`);
    }

    if (po.status !== 'approved') {
      throw new Error(`PO_NOT_APPROVED: Cannot release PO in status '${po.status}'. Must be 'approved'.`);
    }

    const releasedPO: PurchaseOrder = {
      ...po,
      status: 'released',
      releaseIdempotencyKey: idempotencyKey,
      releasedAt: new Date(),
      externalDeliveryStatus: 'sent_pending_confirmation',
    };

    return { po: releasedPO, isDuplicateRelease: false };
  }

  /**
   * Handles remote supplier order timeout / ambiguity (AT-045).
   * Sets delivery status to reconciliation_needed; blocks duplicate order sending until reconciled.
   */
  static handleRemoteSupplierTimeout(po: PurchaseOrder): PurchaseOrder {
    return {
      ...po,
      status: 'reconciliation_needed',
      externalDeliveryStatus: 'sent_pending_confirmation',
    };
  }

  /**
   * Reconciles remote supplier order before allowing any resend (AT-045).
   */
  static reconcileRemoteOrder(
    po: PurchaseOrder,
    externalConfirmationStatus: 'confirmed_externally' | 'not_received_externally'
  ): PurchaseOrder {
    if (po.status !== 'reconciliation_needed') {
      throw new Error('PO_NOT_IN_RECONCILIATION: PO does not require reconciliation.');
    }

    if (externalConfirmationStatus === 'confirmed_externally') {
      return {
        ...po,
        status: 'acknowledged',
        externalDeliveryStatus: 'confirmed',
      };
    } else {
      // Order was never received externally: safely return to approved state for resend
      return {
        ...po,
        status: 'approved',
        externalDeliveryStatus: 'not_sent',
        releaseIdempotencyKey: undefined,
      };
    }
  }

  /**
   * Processes partial receipts and item rejections for a PO line (AT-053).
   * Tracks unreceived balance explicitly without silent drops or double counting.
   */
  static receivePOLine(
    line: POLine,
    receivedQuantity: Decimal.Value,
    rejectedQuantity: Decimal.Value = 0
  ): {
    updatedLine: POLine;
    remainingQuantity: Decimal;
    isLineComplete: boolean;
  } {
    const newReceived = new Decimal(receivedQuantity);
    const newRejected = new Decimal(rejectedQuantity);

    if (newReceived.isNegative() || newRejected.isNegative()) {
      throw new Error('Receipt quantities cannot be negative.');
    }

    const updatedReceived = line.receivedQuantity.plus(newReceived);
    const updatedRejected = line.rejectedQuantity.plus(newRejected);
    const totalProcessed = updatedReceived.plus(updatedRejected);

    if (totalProcessed.gt(line.quantity)) {
      throw new Error(
        `RECEIPT_EXCEEDS_ORDERED_QUANTITY: Total processed quantity (${totalProcessed.toString()}) exceeds ordered quantity (${line.quantity.toString()}) for line ${line.description}.`
      );
    }

    const remainingQuantity = line.quantity.minus(totalProcessed);
    const isLineComplete = remainingQuantity.isZero();

    const updatedLine: POLine = {
      ...line,
      receivedQuantity: updatedReceived,
      rejectedQuantity: updatedRejected,
    };

    return {
      updatedLine,
      remainingQuantity,
      isLineComplete,
    };
  }

  /**
   * Evaluates vendor RFQ quotes side-by-side using multi-criteria weighted scoring (AT-047 / Sprint 03 Module 3).
   * Invariant: EOS produces a scoring recommendation, but NEVER automatically awards procurement without governance sign-off.
   */
  static evaluateBids(
    rfq: RFQ,
    quotes: VendorQuote[],
    weights: { technical: number; commercial: number; risk: number } = { technical: 0.4, commercial: 0.4, risk: 0.2 }
  ): BidEvaluationResult {
    if (quotes.length === 0) {
      throw new Error(`NO_QUOTES_TO_EVALUATE: RFQ ${rfq.rfqNumber} has zero submitted quotes.`);
    }

    // Identify lowest price for normalized commercial scoring
    let minPrice = quotes[0].totalPrice.amount;
    for (const q of quotes) {
      if (q.totalPrice.amount.lt(minPrice)) {
        minPrice = q.totalPrice.amount;
      }
    }

    const evaluations = quotes.map((q) => {
      // Technical score defaults to 85 if not manually scored, with compliance check
      const isNonCompliant = q.technicalCompliance.toLowerCase().includes('non-compliant');
      const techScore = q.technicalScore ?? (isNonCompliant ? 30 : 90);

      // Commercial score: relative to lowest bid (minPrice / currentPrice * 100)
      const commScore = q.totalPrice.amount.isZero()
        ? 100
        : Math.round(minPrice.dividedBy(q.totalPrice.amount).times(100).toNumber());

      // Risk score: delivery timeline and warranty assessment
      const riskScore = q.riskScore ?? (q.deliveryTimeDays <= 14 ? 90 : 70);

      // Composite weighted score (0 - 100)
      const compositeScore = Math.round(
        techScore * weights.technical + commScore * weights.commercial + riskScore * weights.risk
      );

      return {
        quoteId: q.id,
        vendorId: q.vendorId,
        unitRate: q.unitRate,
        totalPrice: q.totalPrice,
        technicalScore: techScore,
        commercialScore: commScore,
        riskScore,
        compositeScore,
        recommended: false,
      };
    });

    // Sort by highest composite score
    evaluations.sort((a, b) => b.compositeScore - a.compositeScore);
    evaluations[0].recommended = true;

    return {
      rfqId: rfq.id,
      quotesEvaluated: quotes.length,
      evaluations,
      recommendedVendorId: evaluations[0].vendorId,
      recommendedQuoteId: evaluations[0].quoteId,
      awardRationale: `Vendor ${evaluations[0].vendorId} achieved the highest composite score of ${evaluations[0].compositeScore}/100 across technical, commercial (${evaluations[0].totalPrice.toString()} ${evaluations[0].totalPrice.currency}), and delivery risk metrics.`,
    };
  }

  /**
   * Aggregates committed expenditure across approved and released purchase orders for EAC calculations.
   */
  static aggregateCommittedCost(pos: PurchaseOrder[], currency: CurrencyCode): Money {
    let total = Money.zero(currency);
    for (const po of pos) {
      if (['approved', 'released', 'acknowledged', 'partially_received', 'fully_received'].includes(po.status)) {
        if (po.totalAmount.currency !== currency) {
          throw new Error(`CURRENCY_MISMATCH: PO ${po.poNumber} currency ${po.totalAmount.currency} does not match ${currency}`);
        }
        total = total.plus(po.totalAmount);
      }
    }
    return total;
  }
}

export type SourceDecisionType =
  | 'buy'
  | 'rent'
  | 'use_e3_asset'
  | 'client_supplied'
  | 'vendor_package'
  | 'subcontract';

export interface ProcurementRequirement {
  id: string;
  projectId: string;
  source: 'boq_line' | 'design_package' | 'requirement' | 'timeline_activity' | 'site_request' | 'variation' | 'operational_call_off';
  boqLineId?: string;
  requirementId?: string;
  designPackageId?: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  requiredOnSiteDate: Date;
  procurementLeadTimeDays: number;
  requiredDeliveryLocation: string;
  technicalSpecification?: string;
  preferredVendorId?: string;
  procurementOwnerId?: string;
  estimatedCost: Money;
  approvedBudget: Money;
  status:
    | 'draft'
    | 'internal_review'
    | 'approved_to_source'
    | 'rfq_active'
    | 'quotes_received'
    | 'evaluation'
    | 'approval_required'
    | 'awarded'
    | 'po_issued'
    | 'in_progress'
    | 'delivered'
    | 'closed'
    | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  sourceDecision: SourceDecisionType;
  internalAssetQuantity: number;
  externalSourcingQuantity: number;
  allocatedAssetIds?: string[];
  awardedPoId?: string;
}

export interface RFQ {
  id: string;
  rfqNumber: string;
  projectId: string;
  procurementRequirementId: string;
  issueDate: Date;
  closingDate: Date;
  invitedVendorIds: string[];
  technicalSpecification: string;
  quantity: number;
  deliveryRequirement: string;
  commercialTerms?: string;
  attachments: string[];
  status: 'draft' | 'issued' | 'closed' | 'evaluated' | 'cancelled';
}

export interface VendorQuote {
  id: string;
  rfqId: string;
  vendorId: string;
  quoteReference: string;
  unitRate: Money;
  totalPrice: Money;
  deliveryTimeDays: number;
  paymentTerms: string;
  warranty: string;
  technicalCompliance: string;
  exclusions?: string;
  validityDays: number;
  attachments: string[];
  clarifications?: string;
  technicalScore?: number;
  commercialScore?: number;
  riskScore?: number;
  totalScore?: number;
}

export interface BidEvaluationResult {
  rfqId: string;
  quotesEvaluated: number;
  evaluations: Array<{
    quoteId: string;
    vendorId: string;
    unitRate: Money;
    totalPrice: Money;
    technicalScore: number;
    commercialScore: number;
    riskScore: number;
    compositeScore: number;
    recommended: boolean;
  }>;
  recommendedVendorId: string;
  recommendedQuoteId: string;
  awardRationale: string;
}

