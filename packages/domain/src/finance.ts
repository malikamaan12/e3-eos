import { Money, CurrencyCode } from './money.js';

export interface FinancialPositionInput {
  currency: CurrencyCode;
  originalBudget: Money | string | number;
  approvedBudgetChanges: Money | string | number;
  postedActualCost: Money | string | number;
  acceptedAccruedCost: Money | string | number;
  remainingCommitments: Money | string | number;
  uncommittedForecast: Money | string | number;
  approvedRevenueBasis?: Money | string | number | null;
}

export interface FinancialPositionResult {
  currency: CurrencyCode;
  currentAuthorisedBudget: Money;
  costIncurred: Money;
  estimateAtCompletion: Money; // EAC
  budgetVariance: Money; // Current authorised budget - EAC
  approvedRevenueBasis: Money | null;
  forecastContribution: Money | null; // Approved revenue - EAC
  forecastContributionMarginPercent: string | null; // e.g. "43.75%"
}

export class FinancialCalculator {
  static calculatePosition(input: FinancialPositionInput): FinancialPositionResult {
    const c = input.currency;
    const toMoney = (val: Money | string | number): Money =>
      val instanceof Money ? val : new Money(val, c);

    const origBudget = toMoney(input.originalBudget);
    const budgetChanges = toMoney(input.approvedBudgetChanges);
    const postedActual = toMoney(input.postedActualCost);
    const acceptedAccrued = toMoney(input.acceptedAccruedCost);
    const remainingCommitment = toMoney(input.remainingCommitments);
    const uncommitted = toMoney(input.uncommittedForecast);

    // Current authorised budget = Original budget + Approved budget changes
    const currentAuthorisedBudget = origBudget.plus(budgetChanges);

    // Cost incurred = Posted actual cost + Accepted unposted accrued cost
    const costIncurred = postedActual.plus(acceptedAccrued);

    // EAC = Posted actual cost + Accepted unposted accrued cost + Remaining unperformed commitments + Forecast uncommitted work
    const eac = postedActual
      .plus(acceptedAccrued)
      .plus(remainingCommitment)
      .plus(uncommitted);

    // Budget variance = Current authorised budget - EAC
    const budgetVariance = currentAuthorisedBudget.minus(eac);

    let approvedRevenue: Money | null = null;
    let forecastContribution: Money | null = null;
    let marginPercentStr: string | null = null;

    if (input.approvedRevenueBasis !== undefined && input.approvedRevenueBasis !== null) {
      approvedRevenue = toMoney(input.approvedRevenueBasis);
      if (!approvedRevenue.amount.isZero() && approvedRevenue.isPositive()) {
        forecastContribution = approvedRevenue.minus(eac);
        const marginDecimal = forecastContribution.amount.dividedBy(approvedRevenue.amount);
        const marginPercent = marginDecimal.times(100);
        marginPercentStr = `${marginPercent.toFixed(2)}%`;
      }
    }

    return {
      currency: c,
      currentAuthorisedBudget,
      costIncurred,
      estimateAtCompletion: eac,
      budgetVariance,
      approvedRevenueBasis: approvedRevenue,
      forecastContribution,
      forecastContributionMarginPercent: marginPercentStr,
    };
  }

  /**
   * Transitions an accrued commitment line to a posted invoice.
   * EAC invariant verification:
   * Invoicing an unbilled accrued portion moves amount from accrued to actual,
   * leaving EAC unchanged if no other changes occurred.
   */
  static transitionAccrualToInvoice(
    position: FinancialPositionInput,
    invoicedAmount: Money | string | number
  ): FinancialPositionInput {
    const c = position.currency;
    const inv = invoicedAmount instanceof Money ? invoicedAmount : new Money(invoicedAmount, c);

    const currentActual = position.postedActualCost instanceof Money
      ? position.postedActualCost
      : new Money(position.postedActualCost, c);

    const currentAccrued = position.acceptedAccruedCost instanceof Money
      ? position.acceptedAccruedCost
      : new Money(position.acceptedAccruedCost, c);

    if (inv.greaterThan(currentAccrued)) {
      throw new Error(`Cannot invoice ${inv.toString()} exceeding accrued amount ${currentAccrued.toString()}`);
    }

    return {
      ...position,
      postedActualCost: currentActual.plus(inv),
      acceptedAccruedCost: currentAccrued.minus(inv),
    };
  }

  /**
   * Transitions an approved purchase order commitment into posted actual cost upon invoice approval.
   * Invariant: Zero double-counting:
   * remainingCommitments decreases by invoicedAmount,
   * postedActualCost increases by invoicedAmount,
   * and EAC (Actual + Accrued + Commitments + ETC) remains invariant.
   */
  static transitionCommitmentToActual(
    position: FinancialPositionInput,
    invoicedAmount: Money | string | number
  ): FinancialPositionInput {
    const c = position.currency;
    const inv = invoicedAmount instanceof Money ? invoicedAmount : new Money(invoicedAmount, c);

    const currentActual =
      position.postedActualCost instanceof Money
        ? position.postedActualCost
        : new Money(position.postedActualCost, c);

    const currentCommitment =
      position.remainingCommitments instanceof Money
        ? position.remainingCommitments
        : new Money(position.remainingCommitments, c);

    if (inv.greaterThan(currentCommitment)) {
      throw new Error(
        `Cannot transition ${inv.toString()} exceeding remaining commitments ${currentCommitment.toString()}`
      );
    }

    return {
      ...position,
      postedActualCost: currentActual.plus(inv),
      remainingCommitments: currentCommitment.minus(inv),
    };
  }

  /**
   * Applies an approved supplier invoice to PO commitment.
   * Decreases remainingCommitments, increases postedActualCost by invoice amount.
   * EAC remains invariant. Zero double-counting.
   */
  static applySupplierInvoiceToCommitment(
    position: FinancialPositionInput,
    invoicedAmount: Money | string | number
  ): FinancialPositionInput {
    return this.transitionCommitmentToActual(position, invoicedAmount);
  }

  /**
   * Calculates real-time project cash position across billed, collected, actuals and commitments.
   */
  static calculateCashPosition(input: CashPositionInput): CashPositionResult {
    const c = input.currency;
    const toMoney = (val: Money | string | number): Money =>
      val instanceof Money ? val : new Money(val, c);

    const contractValue = toMoney(input.contractValue);
    const billedAmount = toMoney(input.billedAmount);
    const collectedAmount = toMoney(input.collectedAmount);
    const postedActualCost = toMoney(input.postedActualCost);
    const remainingCommitments = toMoney(input.remainingCommitments);

    const receivablesAmount = billedAmount.minus(collectedAmount);
    const unbilledContractAmount = contractValue.minus(billedAmount);
    const netCashFlow = collectedAmount.minus(postedActualCost);
    const netCashExposure = collectedAmount.minus(postedActualCost.plus(remainingCommitments));

    return {
      currency: c,
      contractValue,
      billedAmount,
      collectedAmount,
      receivablesAmount,
      unbilledContractAmount,
      postedActualCost,
      remainingCommitments,
      netCashFlow,
      netCashExposure,
    };
  }

  /**
   * Generates a step-by-step margin bridge waterfall from tender to final forecast.
   */
  static calculateMarginBridge(input: MarginBridgeInput): MarginBridgeResult {
    const c = input.currency;
    const toMoney = (val: Money | string | number): Money =>
      val instanceof Money ? val : new Money(val, c);

    const tenderRevenue = toMoney(input.tenderRevenue);
    const tenderCost = toMoney(input.tenderCost);
    const tenderMargin = tenderRevenue.minus(tenderCost);
    const tenderMarginPercent = !tenderRevenue.amount.isZero()
      ? `${tenderMargin.amount.dividedBy(tenderRevenue.amount).times(100).toFixed(2)}%`
      : '0.00%';

    const variationRevenue = toMoney(input.variationsApprovedRevenue);
    const variationCost = toMoney(input.variationsApprovedCost);
    const variationMargin = variationRevenue.minus(variationCost);

    const currentBudgetRevenue = tenderRevenue.plus(variationRevenue);
    const currentBudgetCost = tenderCost.plus(variationCost);
    const currentBudgetMargin = currentBudgetRevenue.minus(currentBudgetCost);

    const costOverrunsOrSavings = toMoney(input.costOverrunsOrSavings);
    const finalForecastRevenue = currentBudgetRevenue;
    const finalForecastCost = currentBudgetCost.plus(costOverrunsOrSavings);
    const finalForecastMargin = finalForecastRevenue.minus(finalForecastCost);
    const finalForecastMarginPercent = !finalForecastRevenue.amount.isZero()
      ? `${finalForecastMargin.amount.dividedBy(finalForecastRevenue.amount).times(100).toFixed(2)}%`
      : '0.00%';

    return {
      currency: c,
      tenderRevenue,
      tenderCost,
      tenderMargin,
      tenderMarginPercent,
      variationRevenue,
      variationCost,
      variationMargin,
      currentBudgetRevenue,
      currentBudgetCost,
      currentBudgetMargin,
      costOverrunsOrSavings,
      finalForecastRevenue,
      finalForecastCost,
      finalForecastMargin,
      finalForecastMarginPercent,
    };
  }
}

export interface CashPositionInput {
  currency: CurrencyCode;
  contractValue: Money | string | number;
  billedAmount: Money | string | number;
  collectedAmount: Money | string | number;
  postedActualCost: Money | string | number;
  remainingCommitments: Money | string | number;
}

export interface CashPositionResult {
  currency: CurrencyCode;
  contractValue: Money;
  billedAmount: Money;
  collectedAmount: Money;
  receivablesAmount: Money;
  unbilledContractAmount: Money;
  postedActualCost: Money;
  remainingCommitments: Money;
  netCashFlow: Money;
  netCashExposure: Money;
}

export interface MarginBridgeInput {
  currency: CurrencyCode;
  tenderRevenue: Money | string | number;
  tenderCost: Money | string | number;
  variationsApprovedRevenue: Money | string | number;
  variationsApprovedCost: Money | string | number;
  costOverrunsOrSavings: Money | string | number;
}

export interface MarginBridgeResult {
  currency: CurrencyCode;
  tenderRevenue: Money;
  tenderCost: Money;
  tenderMargin: Money;
  tenderMarginPercent: string;
  variationRevenue: Money;
  variationCost: Money;
  variationMargin: Money;
  currentBudgetRevenue: Money;
  currentBudgetCost: Money;
  currentBudgetMargin: Money;
  costOverrunsOrSavings: Money;
  finalForecastRevenue: Money;
  finalForecastCost: Money;
  finalForecastMargin: Money;
  finalForecastMarginPercent: string;
}


export interface CostAllocationLine {
  packageId: string;
  amount: Money | string | number;
  notes?: string;
}

export class CostAllocationEngine {
  /**
   * Validates that sum of cost allocations across packages does not exceed invoice line amount (AT-070).
   */
  static validateAllocations(
    invoiceLineAmount: Money,
    allocations: CostAllocationLine[]
  ): {
    totalAllocated: Money;
    remainingUnallocated: Money;
    isValid: boolean;
  } {
    let total = new Money('0', invoiceLineAmount.currency);
    for (const alloc of allocations) {
      const allocMoney =
        alloc.amount instanceof Money ? alloc.amount : new Money(alloc.amount, invoiceLineAmount.currency);
      total = total.plus(allocMoney);
    }
    if (total.greaterThan(invoiceLineAmount)) {
      throw new Error(
        `COST_ALLOCATION_EXCEEDS_INVOICE_LINE: Total allocated amount ${total.toString()} exceeds invoice line total ${invoiceLineAmount.toString()}. Over-allocation rejected.`
      );
    }
    return {
      totalAllocated: total,
      remainingUnallocated: invoiceLineAmount.minus(total),
      isValid: true,
    };
  }
}

export class MultiCurrencyValidator {
  /**
   * Asserts all cost components share the same reporting currency unless an explicit conversion rate is applied (AT-071).
   * Disallows silent mixing of different currencies (e.g. adding USD directly to QAR).
   */
  static assertConsistentCurrency(
    baseCurrency: CurrencyCode,
    items: Array<{ amount: Money; description: string }>
  ): void {
    for (const item of items) {
      if (item.amount.currency !== baseCurrency) {
        throw new Error(
          `MIXED_CURRENCY_DISCREPANCY: Cannot combine ${item.amount.currency} amount (${item.amount.toString()}) into ${baseCurrency} reporting basis without an approved FX conversion rate.`
        );
      }
    }
  }
}

export interface CostImportBatch {
  batchId: string;
  sourceSystem: string;
  fileHash: string;
  importedAt: Date;
  recordCount: number;
  totalAmount: Money;
}

export class SourceImportDeduplicator {
  /**
   * Validates uniqueness of financial source file import (AT-067).
   * Prevents duplicate financial ledger files from creating duplicate business expense effects.
   */
  static validateImportUniqueness(
    newBatch: { sourceSystem: string; fileHash: string; batchId: string },
    existingBatches: CostImportBatch[]
  ): void {
    const duplicate = existingBatches.find(
      (b) =>
        b.fileHash === newBatch.fileHash ||
        (b.sourceSystem === newBatch.sourceSystem && b.batchId === newBatch.batchId)
    );
    if (duplicate) {
      throw new Error(
        `DUPLICATE_SOURCE_IMPORT: Financial source batch ${newBatch.batchId} with hash ${newBatch.fileHash} has already been imported previously from ${newBatch.sourceSystem} on ${duplicate.importedAt.toISOString()}. Duplicate import rejected.`
      );
    }
  }
}

export interface CreditNoteAdjustment {
  creditNoteId: string;
  invoiceId: string;
  creditAmount: Money;
  reason: string;
  effectiveDate: Date;
}

export class CreditNoteAdjustmentEngine {
  /**
   * Applies post-report credit note adjustment (AT-069).
   * Reduces posted actual costs and produces revised financial position while preserving original historical snapshot.
   */
  static applyCreditAdjustment(
    position: FinancialPositionInput,
    credit: CreditNoteAdjustment
  ): FinancialPositionInput {
    const c = position.currency;
    const cred = credit.creditAmount instanceof Money ? credit.creditAmount : new Money(credit.creditAmount, c);
    const currentActual =
      position.postedActualCost instanceof Money
        ? position.postedActualCost
        : new Money(position.postedActualCost, c);

    if (cred.greaterThan(currentActual)) {
      throw new Error(
        `CREDIT_NOTE_EXCEEDS_ACTUAL: Credit note amount ${cred.toString()} cannot exceed total posted actuals ${currentActual.toString()}.`
      );
    }

    return {
      ...position,
      postedActualCost: currentActual.minus(cred),
    };
  }
}

