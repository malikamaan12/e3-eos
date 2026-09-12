import { Money, CurrencyCode } from './money.js';
import { safeSha256 } from './crypto-util.js';

export interface CommercialCloseoutChecklist {
  posFullyInvoicedOrDecommitted: boolean;
  supplierInvoicesSettled: boolean;
  clientMilestonesBilled: boolean;
  openReceivablesManaged: boolean;
  retentionScheduleConfirmed: boolean;
  expenseClaimsSettled: boolean;
  variationsConcluded: boolean;
  costAllocationsConfirmed: boolean;
  finalPandLAudited: boolean;
  executiveSignoffSealed: boolean;
}

export interface CommercialCloseoutInput {
  projectId: string;
  currency: CurrencyCode;
  checklist: CommercialCloseoutChecklist;
  finalRevenue: Money | string | number;
  finalActualCost: Money | string | number;
  signedBy: string;
  signedAt?: Date | string;
}

export interface CommercialCloseoutEvaluationResult {
  isCommerciallyClosed: boolean;
  decision: 'commercially_closed' | 'conditional_closure' | 'rejected';
  unmetPillars: string[];
  finalRevenue: Money;
  finalActualCost: Money;
  finalProfit: Money;
  finalGrossMarginPercent: string;
  auditHash: string;
  signedBy: string;
  signedAt: string;
}

export class CommercialCloseoutEngine {
  private static readonly PILLAR_LABELS: Record<keyof CommercialCloseoutChecklist, string> = {
    posFullyInvoicedOrDecommitted: 'All Purchase Orders fully invoiced or formally decommitted',
    supplierInvoicesSettled: 'All supplier invoices settled, approved, or disputed (zero pending)',
    clientMilestonesBilled: 'All client payment milestones invoiced and accounted',
    openReceivablesManaged: 'Open client receivables collected or acknowledged under action plan',
    retentionScheduleConfirmed: 'Retention release dates confirmed and escrow/terms verified',
    expenseClaimsSettled: 'All project expense claims and petty cash cleared and reimbursed',
    variationsConcluded: 'All commercial variations resolved (zero unapproved client changes)',
    costAllocationsConfirmed: 'Final cost allocations across packages confirmed',
    finalPandLAudited: 'Final project profit and loss statement audited and locked',
    executiveSignoffSealed: 'Executive commercial signoff authorization cryptographically sealed',
  };

  /**
   * Evaluates the 10-dimension commercial closeout criteria and computes the audited closure record.
   */
  static evaluateCloseout(input: CommercialCloseoutInput): CommercialCloseoutEvaluationResult {
    const c = input.currency;
    const toMoney = (val: Money | string | number): Money =>
      val instanceof Money ? val : new Money(val, c);

    const revenue = toMoney(input.finalRevenue);
    const cost = toMoney(input.finalActualCost);
    const profit = revenue.minus(cost);

    let marginPercentStr = '0.00%';
    if (!revenue.amount.isZero() && revenue.isPositive()) {
      const marginDecimal = profit.amount.dividedBy(revenue.amount);
      marginPercentStr = `${marginDecimal.times(100).toFixed(2)}%`;
    }

    const unmetPillars: string[] = [];
    for (const [key, label] of Object.entries(this.PILLAR_LABELS)) {
      if (!input.checklist[key as keyof CommercialCloseoutChecklist]) {
        unmetPillars.push(label);
      }
    }

    const isCommerciallyClosed = unmetPillars.length === 0;
    const decision = isCommerciallyClosed
      ? 'commercially_closed'
      : unmetPillars.length <= 2
      ? 'conditional_closure'
      : 'rejected';

    const timestamp = input.signedAt
      ? new Date(input.signedAt).toISOString()
      : new Date().toISOString();

    const auditPayload = {
      projectId: input.projectId,
      decision,
      finalRevenue: revenue.toString(),
      finalActualCost: cost.toString(),
      finalProfit: profit.toString(),
      finalGrossMarginPercent: marginPercentStr,
      signedBy: input.signedBy,
      timestamp,
      unmetCount: unmetPillars.length,
    };

    const auditHash = safeSha256(auditPayload);

    return {
      isCommerciallyClosed,
      decision,
      unmetPillars,
      finalRevenue: revenue,
      finalActualCost: cost,
      finalProfit: profit,
      finalGrossMarginPercent: marginPercentStr,
      auditHash,
      signedBy: input.signedBy,
      signedAt: timestamp,
    };
  }
}
