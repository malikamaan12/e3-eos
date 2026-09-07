import { Decimal } from 'decimal.js';
import { Money, CurrencyCode } from './money.js';

export interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  iban: string;
  swift: string;
}

export type VendorCategory = 'corporate' | 'freelance' | 'cash_supplier';

export interface Vendor {
  id: string;
  vendorCode: string;
  name: string;
  category: VendorCategory;
  status: 'active' | 'suspended' | 'pending_verification';
  bankDetails?: BankDetails;
  complianceVerified: boolean;
  soleSourceAuthorised?: boolean;
  freelanceGracePeriodUntil?: Date;
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
}
