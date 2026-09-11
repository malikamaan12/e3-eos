import { Decimal } from 'decimal.js';
import { Money, CurrencyCode } from './money.js';

export type UOM =
  | 'hour'
  | 'shift'
  | 'day'
  | 'week'
  | 'month'
  | 'lump_sum'
  | 'unit'
  | 'sqm'
  | 'meter'
  | 'lot'
  | string;

export interface UnitConversionRule {
  fromUom: UOM;
  toUom: UOM;
  factor: Decimal; // e.g. 1 shift = 10 hours -> factor = 10 (or 0.1 depending on direction)
}

export class UnitConverter {
  /**
   * Converts hourly rate to shift rate given hours per shift.
   * Standard event shifts typically range from 8 to 12 hours.
   */
  static hourlyToShift(hourlyRate: Decimal.Value, hoursPerShift: Decimal.Value = 10): Decimal {
    const rate = new Decimal(hourlyRate);
    const hours = new Decimal(hoursPerShift);
    if (hours.lte(0)) {
      throw new Error('Hours per shift must be strictly positive');
    }
    return rate.mul(hours);
  }

  /**
   * Converts shift rate to hourly rate.
   */
  static shiftToHourly(shiftRate: Decimal.Value, hoursPerShift: Decimal.Value = 10): Decimal {
    const rate = new Decimal(shiftRate);
    const hours = new Decimal(hoursPerShift);
    if (hours.lte(0)) {
      throw new Error('Hours per shift must be strictly positive');
    }
    return rate.div(hours);
  }

  /**
   * Converts a quantity from one unit to another using an explicit factor.
   * targetQuantity = sourceQuantity * conversionFactor
   */
  static convertQuantity(quantity: Decimal.Value, conversionFactor: Decimal.Value): Decimal {
    return new Decimal(quantity).mul(new Decimal(conversionFactor));
  }
}

export interface BOQLineInput {
  id: string;
  lineCode: string;
  description: string;
  descriptionAr?: string;
  quantity: Decimal.Value;
  uom: UOM;
  unitCost: Decimal.Value; // Internal contractor buy rate
  unitSell: Decimal.Value; // Client sell rate
  durationMultiplier?: Decimal.Value; // e.g., number of shifts/days, default 1
  isLumpSum?: boolean;
  parentLineId?: string; // If this line is part of a lump sum breakdown
  allocatedLumpSumPortion?: Decimal.Value; // Allocated amount of parent lump sum
  discountPercent?: Decimal.Value; // Percentage discount on this line (0 - 100)
  taxRate?: Decimal.Value; // Tax rate (e.g. 0.05 for 5% VAT)
  linkedRequirementCode?: string; // Links line to ScopeRequirement code (e.g. REQ-QND-001)
}

export interface CalculatedBOQLine {
  id: string;
  lineCode: string;
  description: string;
  descriptionAr?: string;
  quantity: Decimal;
  uom: UOM;
  durationMultiplier: Decimal;
  unitCost: Money;
  unitSell: Money;
  totalCost: Money;
  grossSell: Money;
  discountAmount: Money;
  netSell: Money;
  taxAmount: Money;
  totalSellWithTax: Money;
  isLumpSum: boolean;
  parentLineId?: string;
}

export interface EstimateSummary {
  currency: CurrencyCode;
  subtotalCost: Money;
  subtotalSell: Money;
  discountAmount: Money;
  discountedSell: Money;
  feeAmount: Money;
  feeRate: Decimal;
  taxableBase: Money;
  taxAmount: Money;
  taxRate: Decimal;
  totalCost: Money;
  totalSell: Money;
  grossProfit: Money;
  markupPercent: Decimal | 'not_applicable';
  marginPercent: Decimal | 'not_applicable';
  lines: CalculatedBOQLine[];
}

export interface ClientProposalLine {
  lineCode: string;
  description: string;
  descriptionAr?: string;
  quantity: string;
  uom: string;
  durationMultiplier: string;
  unitSell: { amount: string; currency: CurrencyCode };
  netSell: { amount: string; currency: CurrencyCode };
  taxAmount: { amount: string; currency: CurrencyCode };
  totalSellWithTax: { amount: string; currency: CurrencyCode };
}

export interface ClientProposalSummary {
  proposalId: string;
  projectId: string;
  currency: CurrencyCode;
  subtotalSell: { amount: string; currency: CurrencyCode };
  discountAmount: { amount: string; currency: CurrencyCode };
  feeAmount: { amount: string; currency: CurrencyCode };
  taxAmount: { amount: string; currency: CurrencyCode };
  totalSell: { amount: string; currency: CurrencyCode };
  lines: ClientProposalLine[];
}

export class BOQCalculator {
  /**
   * Calculates profit metrics:
   * Profit = Revenue - Cost
   * Margin = Profit / Revenue (strictly undefined/not_applicable if revenue <= 0)
   * Markup = Profit / Cost (strictly undefined/not_applicable if cost <= 0)
   */
  static calculateProfitMetrics(
    cost: Decimal.Value,
    revenue: Decimal.Value
  ): {
    grossProfit: Decimal;
    marginPercent: Decimal | 'not_applicable';
    markupPercent: Decimal | 'not_applicable';
  } {
    const costDec = new Decimal(cost);
    const revDec = new Decimal(revenue);
    const profit = revDec.minus(costDec);

    // Margin = (Profit / Revenue) * 100
    // When revenue is zero or negative, margin is not applicable (cannot divide by zero)
    let marginPercent: Decimal | 'not_applicable';
    if (revDec.isZero() || revDec.isNegative()) {
      marginPercent = 'not_applicable';
    } else {
      marginPercent = profit.div(revDec).mul(100).toDecimalPlaces(4);
    }

    // Markup = (Profit / Cost) * 100
    // When cost is zero or negative, markup is not applicable
    let markupPercent: Decimal | 'not_applicable';
    if (costDec.isZero() || costDec.isNegative()) {
      markupPercent = 'not_applicable';
    } else {
      markupPercent = profit.div(costDec).mul(100).toDecimalPlaces(4);
    }

    return {
      grossProfit: profit,
      marginPercent,
      markupPercent,
    };
  }

  /**
   * Validates lump-sum decomposition invariant (AT-037):
   * Child lines decompose the parent lump-sum; they do not duplicate or multiply it.
   */
  static validateLumpSumDecomposition(
    parentLine: BOQLineInput,
    childLines: BOQLineInput[],
    currency: CurrencyCode = 'QAR'
  ): {
    parentLumpSumSell: Money;
    childrenAllocatedSell: Money;
    isFullyAllocated: boolean;
  } {
    if (!parentLine.isLumpSum) {
      throw new Error(`Parent line ${parentLine.lineCode} is not marked as a lump sum`);
    }

    const parentSell = new Decimal(parentLine.unitSell).mul(new Decimal(parentLine.quantity || 1));
    let childrenTotal = new Decimal(0);

    for (const child of childLines) {
      const childSell = child.allocatedLumpSumPortion
        ? new Decimal(child.allocatedLumpSumPortion)
        : new Decimal(child.unitSell).mul(new Decimal(child.quantity || 1)).mul(new Decimal(child.durationMultiplier || 1));
      childrenTotal = childrenTotal.plus(childSell);
    }

    if (childrenTotal.gt(parentSell)) {
      throw new Error(
        `Lump-sum decomposition error: sum of child allocations (${childrenTotal.toString()}) exceeds parent lump sum (${parentSell.toString()})`
      );
    }

    return {
      parentLumpSumSell: new Money(parentSell, currency),
      childrenAllocatedSell: new Money(childrenTotal, currency),
      isFullyAllocated: childrenTotal.eq(parentSell),
    };
  }

  /**
   * Calculates complete estimate including lump-sum handling, fees, discounts, and taxes (AT-037, AT-038).
   *
   * Order of operations:
   * 1. Line Gross Sell = Quantity * UnitSell * DurationMultiplier
   * 2. Line Discount = Gross Sell * DiscountPercent
   * 3. Line Net Sell = Gross Sell - Line Discount
   * 4. If parent is lump-sum with children: parent represents total, children are breakdown allocations
   *    (no double-counting of parent + children).
   * 5. Overall Discount applied.
   * 6. Management / Service Fee applied on discounted sell subtotal.
   * 7. Tax calculated on (Discounted Sell + Fee).
   * 8. Total Grand Sell = Taxable Base + Tax.
   */
  static calculateEstimate(
    lines: BOQLineInput[],
    currency: CurrencyCode = 'QAR',
    options?: {
      overallDiscountPercent?: Decimal.Value;
      overallFeePercent?: Decimal.Value;
      defaultTaxRate?: Decimal.Value;
    }
  ): EstimateSummary {
    const calculatedLines: CalculatedBOQLine[] = [];
    let subtotalCostDec = new Decimal(0);
    let subtotalSellDec = new Decimal(0);
    let totalLineDiscountDec = new Decimal(0);

    // Identify parent lump-sum IDs
    const parentLumpSumIds = new Set(
      lines.filter((l) => l.isLumpSum && !l.parentLineId).map((l) => l.id)
    );

    // Verify children allocations against parents
    for (const parentId of parentLumpSumIds) {
      const parent = lines.find((l) => l.id === parentId)!;
      const children = lines.filter((l) => l.parentLineId === parentId);
      if (children.length > 0) {
        this.validateLumpSumDecomposition(parent, children, currency);
      }
    }

    for (const line of lines) {
      const qty = new Decimal(line.quantity || 1);
      const duration = new Decimal(line.durationMultiplier || 1);
      const unitCostDec = new Decimal(line.unitCost || 0);
      const unitSellDec = new Decimal(line.unitSell || 0);

      const effectiveQty = qty.mul(duration);
      const lineCostDec = unitCostDec.mul(effectiveQty);
      const grossSellDec = unitSellDec.mul(effectiveQty);

      const discountRate = line.discountPercent ? new Decimal(line.discountPercent).div(100) : new Decimal(0);
      const lineDiscountDec = grossSellDec.mul(discountRate);
      const netSellDec = grossSellDec.minus(lineDiscountDec);

      const taxRateDec = line.taxRate !== undefined ? new Decimal(line.taxRate) : new Decimal(options?.defaultTaxRate || 0);
      const taxAmountDec = netSellDec.mul(taxRateDec);
      const totalSellWithTaxDec = netSellDec.plus(taxAmountDec);

      // Invariant AT-037: If this is a child line of a lump sum, the parent lump sum already
      // contains the sell amount. Only add to total if NOT a child line of an included parent lump sum,
      // OR if parent is purely a group header. Here, if parent is included, we accumulate cost/sell
      // from the parent (or children), never both!
      const isChildOfIncludedParent = line.parentLineId && parentLumpSumIds.has(line.parentLineId);

      if (!isChildOfIncludedParent) {
        subtotalCostDec = subtotalCostDec.plus(lineCostDec);
        subtotalSellDec = subtotalSellDec.plus(netSellDec);
        totalLineDiscountDec = totalLineDiscountDec.plus(lineDiscountDec);
      }

      calculatedLines.push({
        id: line.id,
        lineCode: line.lineCode,
        description: line.description,
        descriptionAr: line.descriptionAr,
        quantity: qty,
        uom: line.uom,
        durationMultiplier: duration,
        unitCost: new Money(unitCostDec, currency),
        unitSell: new Money(unitSellDec, currency),
        totalCost: new Money(lineCostDec, currency),
        grossSell: new Money(grossSellDec, currency),
        discountAmount: new Money(lineDiscountDec, currency),
        netSell: new Money(netSellDec, currency),
        taxAmount: new Money(taxAmountDec, currency),
        totalSellWithTax: new Money(totalSellWithTaxDec, currency),
        isLumpSum: !!line.isLumpSum,
        parentLineId: line.parentLineId,
      });
    }

    // Apply overall discount if specified
    const overallDiscountPct = options?.overallDiscountPercent
      ? new Decimal(options.overallDiscountPercent).div(100)
      : new Decimal(0);
    const overallDiscountDec = subtotalSellDec.mul(overallDiscountPct);
    const totalDiscountDec = totalLineDiscountDec.plus(overallDiscountDec);
    const discountedSellDec = subtotalSellDec.minus(overallDiscountDec);

    // Apply fee (e.g. 10% management fee)
    const feeRateDec = options?.overallFeePercent
      ? new Decimal(options.overallFeePercent).div(100)
      : new Decimal(0);
    const feeAmountDec = discountedSellDec.mul(feeRateDec);

    // Taxable base = Discounted Sell + Fee
    const taxableBaseDec = discountedSellDec.plus(feeAmountDec);
    const globalTaxRateDec = options?.defaultTaxRate ? new Decimal(options.defaultTaxRate) : new Decimal(0);
    const taxAmountDec = taxableBaseDec.mul(globalTaxRateDec);

    const grandTotalSellDec = taxableBaseDec.plus(taxAmountDec);
    const totalCostDec = subtotalCostDec;

    const profitMetrics = this.calculateProfitMetrics(totalCostDec, grandTotalSellDec);

    return {
      currency,
      subtotalCost: new Money(subtotalCostDec, currency),
      subtotalSell: new Money(subtotalSellDec, currency),
      discountAmount: new Money(totalDiscountDec, currency),
      discountedSell: new Money(discountedSellDec, currency),
      feeAmount: new Money(feeAmountDec, currency),
      feeRate: feeRateDec,
      taxableBase: new Money(taxableBaseDec, currency),
      taxAmount: new Money(taxAmountDec, currency),
      taxRate: globalTaxRateDec,
      totalCost: new Money(totalCostDec, currency),
      totalSell: new Money(grandTotalSellDec, currency),
      grossProfit: new Money(profitMetrics.grossProfit, currency),
      markupPercent: profitMetrics.markupPercent,
      marginPercent: profitMetrics.marginPercent,
      lines: calculatedLines,
    };
  }

  /**
   * Projects sell-side client proposal with strict server-side secrecy (AT-002, AT-035).
   * Strips all internal costs, buy rates, payroll, and internal margins.
   */
  static projectClientProposal(
    proposalId: string,
    projectId: string,
    summary: EstimateSummary
  ): ClientProposalSummary {
    const clientLines: ClientProposalLine[] = summary.lines.map((l) => ({
      lineCode: l.lineCode,
      description: l.description,
      descriptionAr: l.descriptionAr,
      quantity: l.quantity.toString(),
      uom: l.uom,
      durationMultiplier: l.durationMultiplier.toString(),
      unitSell: l.unitSell.toJSON(),
      netSell: l.netSell.toJSON(),
      taxAmount: l.taxAmount.toJSON(),
      totalSellWithTax: l.totalSellWithTax.toJSON(),
    }));

    return {
      proposalId,
      projectId,
      currency: summary.currency,
      subtotalSell: summary.subtotalSell.toJSON(),
      discountAmount: summary.discountAmount.toJSON(),
      feeAmount: summary.feeAmount.toJSON(),
      taxAmount: summary.taxAmount.toJSON(),
      totalSell: summary.totalSell.toJSON(),
      lines: clientLines,
    };
  }
}
