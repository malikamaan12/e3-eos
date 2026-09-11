import { safeSha256 } from './crypto-util.js';
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
  baselineBudget: Money; // Original authorised cost baseline
  approvedChanges: Money; // Net authorised changes/variations
  currentBudget: Money; // Current Budget = Baseline Budget + Approved Changes
  committedCost: Money; // Approved commitments such as POs/subcontracts
  actualCost: Money; // Cost actually incurred/posted
  forecastToComplete: Money; // Expected remaining project cost (ETC)
  estimateAtCompletion: Money; // EAC = Actual Cost + Forecast to Complete
  varianceAtCompletion: Money; // VAC = Current Budget - EAC
  pendingExposureCost: Money; // Potential unapproved cost exposure (strictly isolated)
  pendingExposureSell: Money; // Potential unapproved sell exposure (strictly isolated)
  approvedContractValue: Money; // Current revenue basis = Baseline Revenue + Approved Changes Sell
  baselineContractValue: Money; // Original authorised client revenue baseline
  approvedChangesSell: Money; // Net authorised changes to client revenue
  unapprovedExposureScenarioEac: Money; // Explicitly labelled unapproved exposure scenario: EAC + pendingExposureCost
  // Compatibility aliases
  approvedCostBudget: Money; // Alias for currentBudget
  totalForecastCost: Money; // Alias for estimateAtCompletion
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
    return safeSha256(data);
  }

  /**
   * Calculates baseline financials maintaining strict separation of pending exposure from approved baseline (AT-040)
   * and enforcing EAC = Actual Cost + Forecast to Complete (never Budget + Pending Exposure).
   */
  static calculateFinancials(
    currency: CurrencyCode,
    baselineContract: Money,
    baselineBudget: Money,
    variations: VariationData[],
    actuals?: {
      committedCost?: Money;
      actualCost?: Money;
      forecastToComplete?: Money;
    }
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

    const approvedChangesCostMoney = new Money(approvedVarCost, currency);
    const approvedChangesSellMoney = new Money(approvedVarSell, currency);
    const pendingExposureCostMoney = new Money(pendingCost, currency);
    const pendingExposureSellMoney = new Money(pendingSell, currency);

    // Current Budget = Baseline Budget + Approved Changes
    const currentBudget = baselineBudget.plus(approvedChangesCostMoney);
    // Approved Contract Value = Baseline Contract + Approved Changes Sell
    const approvedContractValue = baselineContract.plus(approvedChangesSellMoney);

    // Actuals & Commitments
    const committedCost = actuals?.committedCost || new Money(0, currency);
    const actualCost = actuals?.actualCost || new Money(0, currency);

    // Forecast to Complete (ETC): If supplied, use it; otherwise default to expected remaining budget (currentBudget - actualCost), clamped >= 0
    let forecastToComplete = actuals?.forecastToComplete;
    if (!forecastToComplete) {
      const remainingBudgetDecimal = currentBudget.amount.minus(actualCost.amount);
      forecastToComplete = new Money(
        remainingBudgetDecimal.isNegative() ? new Decimal(0) : remainingBudgetDecimal,
        currency
      );
    }

    // EAC = Actual Cost + Forecast to Complete
    const estimateAtCompletion = actualCost.plus(forecastToComplete);

    // VAC = Current Budget - EAC
    const varianceAtCompletion = currentBudget.minus(estimateAtCompletion);

    // Unapproved exposure scenario (strictly segregated from official EAC)
    const unapprovedExposureScenarioEac = estimateAtCompletion.plus(pendingExposureCostMoney);
    const totalForecastSell = approvedContractValue.plus(pendingExposureSellMoney);

    return {
      projectId: variations[0]?.projectId || 'unknown',
      currency,
      baselineBudget,
      approvedChanges: approvedChangesCostMoney,
      currentBudget,
      committedCost,
      actualCost,
      forecastToComplete,
      estimateAtCompletion,
      varianceAtCompletion,
      pendingExposureCost: pendingExposureCostMoney,
      pendingExposureSell: pendingExposureSellMoney,
      baselineContractValue: baselineContract,
      approvedChangesSell: approvedChangesSellMoney,
      approvedContractValue,
      unapprovedExposureScenarioEac,
      // Compatibility aliases
      approvedCostBudget: currentBudget,
      totalForecastCost: estimateAtCompletion,
      totalForecastSell,
    };
  }

  /**
   * Demonstrates that moving an unapproved exposure across the commercial lifecycle:
   * Pending Exposure -> Approved Change -> Committed Cost -> Actual Cost
   * never causes double-counting in any financial summary metric.
   */
  static simulateCostLifecycle(
    baselineContract: Money,
    baselineBudget: Money,
    costDelta: Money,
    sellDelta: Money
  ): {
    step1Pending: BaselineFinancials;
    step2Approved: BaselineFinancials;
    step3Committed: BaselineFinancials;
    step4Actual: BaselineFinancials;
  } {
    const currency = baselineBudget.currency;

    // Step 1: Pending Exposure (VO drafted/submitted to client)
    const vo1: VariationData = {
      id: 'vo-lifecycle-1',
      projectId: 'sim-prj',
      variationCode: 'VO-SIM-01',
      title: 'Additional Arena LED Displays',
      scopeDescription: 'LED displays',
      costImpact: costDelta,
      sellImpact: sellDelta,
      timeImpactDays: 0,
      status: 'submitted_to_client',
    };
    const step1Pending = this.calculateFinancials(currency, baselineContract, baselineBudget, [vo1], {
      committedCost: new Money(0, currency),
      actualCost: new Money(0, currency),
      forecastToComplete: baselineBudget,
    });

    // Step 2: Approved Change (Client formally approves VO)
    // Moves from pending exposure to approved changes. Current Budget increases.
    const vo2: VariationData = { ...vo1, status: 'client_approved' };
    const step2Approved = this.calculateFinancials(currency, baselineContract, baselineBudget, [vo2], {
      committedCost: new Money(0, currency),
      actualCost: new Money(0, currency),
      forecastToComplete: baselineBudget.plus(costDelta),
    });

    // Step 3: Committed Cost (PO issued to supplier for approved work)
    // Budget remains unchanged; Committed cost rises by costDelta; ETC includes committed portion; EAC remains identical!
    const step3Committed = this.calculateFinancials(currency, baselineContract, baselineBudget, [vo2], {
      committedCost: costDelta,
      actualCost: new Money(0, currency),
      forecastToComplete: baselineBudget.plus(costDelta),
    });

    // Step 4: Actual Cost (Supplier invoice posted & verified)
    // Actual cost rises by costDelta; ETC decreases by costDelta; Committed cost decreases; EAC remains identical!
    const step4Actual = this.calculateFinancials(currency, baselineContract, baselineBudget, [vo2], {
      committedCost: new Money(0, currency),
      actualCost: costDelta,
      forecastToComplete: baselineBudget,
    });

    return { step1Pending, step2Approved, step3Committed, step4Actual };
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
