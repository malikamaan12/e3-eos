import { createHash } from 'node:crypto';
import { Money, CurrencyCode } from './money.js';
import { Decimal } from 'decimal.js';

export type VariationStatus =
  | 'draft'
  | 'pending_internal_approval'
  | 'internally_approved'
  | 'submitted_to_client'
  | 'client_approved'
  | 'rejected'
  | 'withdrawn';

export interface VariationData {
  id: string;
  projectId: string;
  variationCode: string;
  title: string;
  titleAr?: string;
  scopeDescription: string;
  costImpact: Money; // Expected cost change (can be positive or negative)
  sellImpact: Money; // Proposed client charge change
  timeImpactDays: number; // Schedule impact in days
  status: VariationStatus;
  clientDecisionId?: string;
  clientDecidedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface BaselineFinancials {
  projectId: string;
  currency: CurrencyCode;
  approvedContractValue: Money; // Approved baseline revenue from client
  approvedCostBudget: Money; // Approved baseline internal cost budget
  pendingExposureCost: Money; // Unapproved/pending variation costs (AT-040)
  pendingExposureSell: Money; // Unapproved/pending variation client sells (AT-040)
  totalForecastCost: Money; // approvedCostBudget + pendingExposureCost
  totalForecastSell: Money; // approvedContractValue + pendingExposureSell
}

export interface ApprovedSnapshot {
  targetId: string;
  targetType: 'proposal' | 'purchase_order' | 'estimate' | 'design';
  contentHash: string;
  approvedAt: Date;
  approverId: string;
  status: 'active' | 'superseded' | 'revoked';
  supersededReason?: string;
}

export class VariationLedger {
  /**
   * Computes the SHA-256 canonical hash of an object/document.
   */
  static computeContentHash(data: unknown): string {
    const canonicalJson = JSON.stringify(data, Object.keys(data as any).sort());
    return createHash('sha256').update(canonicalJson).digest('hex');
  }

  /**
   * Calculates baseline financials maintaining strict separation of pending exposure from approved baseline (AT-040).
   */
  static calculateFinancials(
    currency: CurrencyCode,
    approvedContract: Money,
    approvedBudget: Money,
    variations: VariationData[]
  ): BaselineFinancials {
    let pendingCost = new Decimal(0);
    let pendingSell = new Decimal(0);
    let approvedVarCost = new Decimal(0);
    let approvedVarSell = new Decimal(0);

    for (const v of variations) {
      if (v.status === 'client_approved') {
        // Formally authorized by client: incorporated into approved baseline
        approvedVarCost = approvedVarCost.plus(v.costImpact.amount);
        approvedVarSell = approvedVarSell.plus(v.sellImpact.amount);
      } else if (
        v.status === 'draft' ||
        v.status === 'pending_internal_approval' ||
        v.status === 'internally_approved' ||
        v.status === 'submitted_to_client'
      ) {
        // Pending exposure: strictly excluded from approved baseline (AT-040)
        pendingCost = pendingCost.plus(v.costImpact.amount);
        pendingSell = pendingSell.plus(v.sellImpact.amount);
      }
      // 'rejected' and 'withdrawn' variations do not impact either
    }

    const currentApprovedContract = approvedContract.plus(new Money(approvedVarSell, currency));
    const currentApprovedBudget = approvedBudget.plus(new Money(approvedVarCost, currency));
    const pendingExposureCostMoney = new Money(pendingCost, currency);
    const pendingExposureSellMoney = new Money(pendingSell, currency);

    const totalForecastCost = currentApprovedBudget.plus(pendingExposureCostMoney);
    const totalForecastSell = currentApprovedContract.plus(pendingExposureSellMoney);

    return {
      projectId: variations[0]?.projectId || 'unknown',
      currency,
      approvedContractValue: currentApprovedContract,
      approvedCostBudget: currentApprovedBudget,
      pendingExposureCost: pendingExposureCostMoney,
      pendingExposureSell: pendingExposureSellMoney,
      totalForecastCost,
      totalForecastSell,
    };
  }

  /**
   * Evaluates whether a modification to an approved document invalidates the prior approval (AT-032).
   * If significant amount, supplier, scope, or design changed, the approval is superseded and cannot be executed with the stale hash.
   */
  static evaluateChangeAgainstApproval(
    currentData: Record<string, unknown>,
    approvedSnapshot: ApprovedSnapshot,
    _materialityThresholdPercent: number = 0 // Any material difference invalidates
  ): {
    isSuperseded: boolean;
    currentHash: string;
    approvedHash: string;
    reason?: string;
  } {
    const currentHash = this.computeContentHash(currentData);

    if (currentHash === approvedSnapshot.contentHash) {
      return {
        isSuperseded: false,
        currentHash,
        approvedHash: approvedSnapshot.contentHash,
      };
    }

    // Hashes differ: content was altered post-approval (AT-032)
    return {
      isSuperseded: true,
      currentHash,
      approvedHash: approvedSnapshot.contentHash,
      reason: `Material modification detected after approval. Content hash changed from ${approvedSnapshot.contentHash.substring(0, 8)}... to ${currentHash.substring(0, 8)}... Prior approval is superseded.`,
    };
  }

  /**
   * Validates whether execution can proceed with a given content hash (AT-032).
   * Execution is denied if attempting to reuse a stale approval hash or if document has changed.
   */
  static validateExecutionAuthority(
    currentData: Record<string, unknown>,
    approvedSnapshot: ApprovedSnapshot,
    suppliedApprovalHash: string
  ): void {
    const evaluation = this.evaluateChangeAgainstApproval(currentData, approvedSnapshot);

    if (evaluation.isSuperseded) {
      throw new Error(
        `EXECUTION_DENIED_APPROVAL_SUPERSEDED: ${evaluation.reason} Execution cannot reuse stale content hash.`
      );
    }

    if (suppliedApprovalHash !== approvedSnapshot.contentHash) {
      throw new Error(
        `EXECUTION_DENIED_HASH_MISMATCH: Supplied approval hash (${suppliedApprovalHash}) does not match current valid approval hash (${approvedSnapshot.contentHash}).`
      );
    }

    if (approvedSnapshot.status !== 'active') {
      throw new Error(
        `EXECUTION_DENIED_INACTIVE_APPROVAL: Approval snapshot status is '${approvedSnapshot.status}'. Cannot execute.`
      );
    }
  }
}
