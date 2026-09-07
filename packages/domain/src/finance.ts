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
}
