import { Money, CurrencyCode } from './money.js';
import { TimeUtil, TimeWindow } from './time.js';

export interface ProposedResourceAllocation {
  projectId: string;
  resourceId: string;
  window: TimeWindow;
}

export interface PortfolioScenario {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'applied' | 'rejected';
  proposedAllocations: ProposedResourceAllocation[];
  createdAt: Date;
}

export interface LiveReservation {
  id: string;
  projectId: string;
  resourceId: string;
  window: TimeWindow;
  status: 'confirmed' | 'cancelled';
}

export class ScenarioEngine {
  /**
   * Evaluates and applies a what-if scenario (AT-080).
   * Invariant: A scenario does not hold or lock resources. Calling apply strictly re-evaluates
   * live resource commitments. If another project booked the resource in the interim, apply is rejected.
   */
  static applyScenario(
    scenario: PortfolioScenario,
    liveReservations: LiveReservation[]
  ): { success: boolean; appliedCount: number } {
    for (const proposed of scenario.proposedAllocations) {
      // Find conflicting active live reservations
      const conflict = liveReservations.find(
        (res) =>
          res.status === 'confirmed' &&
          res.resourceId === proposed.resourceId &&
          res.projectId !== proposed.projectId &&
          TimeUtil.overlaps(res.window, proposed.window)
      );

      if (conflict) {
        throw new Error(
          `RESOURCE_COLLISION_DURING_APPLY: Resource ${proposed.resourceId} was reserved by project ${conflict.projectId} across interval [${new Date(conflict.window.start).toISOString()} to ${new Date(conflict.window.end).toISOString()}) while scenario ${scenario.name} was under review. Scenario cannot be applied.`
        );
      }
    }

    return {
      success: true,
      appliedCount: scenario.proposedAllocations.length,
    };
  }
}

export interface RuleEvaluationSummary {
  ruleId: string;
  ruleName: string;
  totalEvaluations: number;
  overrideCount: number;
  approvedExceptionCount: number;
}

export interface RuleAnalyticsResult {
  ruleId: string;
  overrideRatePercent: string;
  sampleSize: number;
  thresholdPercent: string;
  requiresGovernanceReview: boolean;
  message: string;
}

export class RuleAnalyticsEngine {
  /**
   * Computes rule override rates and flags contextual governance reviews (AT-081).
   * Invariant: High override rates flag reviews with explicit sample size/denominator,
   * but NEVER automatically weaken or alter policy thresholds.
   */
  static analyzeRuleOverrides(
    summary: RuleEvaluationSummary,
    thresholdDecimal: number = 0.15,
    minSampleSize: number = 10
  ): RuleAnalyticsResult {
    if (summary.totalEvaluations === 0) {
      return {
        ruleId: summary.ruleId,
        overrideRatePercent: '0.00%',
        sampleSize: 0,
        thresholdPercent: `${(thresholdDecimal * 100).toFixed(2)}%`,
        requiresGovernanceReview: false,
        message: 'Insufficient data points to evaluate rule health.',
      };
    }

    const rate = summary.overrideCount / summary.totalEvaluations;
    const ratePercent = `${(rate * 100).toFixed(2)}%`;
    const thresholdPercentStr = `${(thresholdDecimal * 100).toFixed(2)}%`;

    const isExceeded = summary.totalEvaluations >= minSampleSize && rate > thresholdDecimal;

    return {
      ruleId: summary.ruleId,
      overrideRatePercent: ratePercent,
      sampleSize: summary.totalEvaluations,
      thresholdPercent: thresholdPercentStr,
      requiresGovernanceReview: isExceeded,
      message: isExceeded
        ? `Override rate of ${ratePercent} exceeds recommended threshold (${thresholdPercentStr}) across ${summary.totalEvaluations} evaluations. Flagged for committee review; policy remains strictly in effect.`
        : `Rule performance is within acceptable governance parameters (${ratePercent} overrides across ${summary.totalEvaluations} evaluations).`,
    };
  }
}

export interface EvmInput {
  currency: CurrencyCode;
  plannedValue: Money | string | number; // PV
  actualCost: Money | string | number; // AC
  physicalCompletionPercent: number; // 0 to 100
  hoursLogged: number;
  hoursBudgeted: number;
}

export interface EvmResult {
  currency: CurrencyCode;
  plannedValue: Money; // PV
  actualCost: Money; // AC
  earnedValue: Money; // EV
  costVariance: Money; // CV = EV - AC
  scheduleVariance: Money; // SV = EV - PV
  cpi: string; // Cost Performance Index = EV / AC
  spi: string; // Schedule Performance Index = EV / PV
  hoursLogged: number;
  hoursBudgeted: number;
  note: string;
}

export class EvmEngine {
  /**
   * Calculates Earned Value Management metrics (AT-082).
   * Invariant: EV is strictly earned by verified physical deliverables (PV * physicalCompletionPercent).
   * Hours worked or turnstile scans alone do not earn value.
   */
  static evaluateEvm(input: EvmInput): EvmResult {
    const c = input.currency;
    const pv = input.plannedValue instanceof Money ? input.plannedValue : new Money(input.plannedValue, c);
    const ac = input.actualCost instanceof Money ? input.actualCost : new Money(input.actualCost, c);

    // Invariant AT-082: EV is derived purely from physical completion percentage
    const completionDecimal = Math.max(0, Math.min(100, input.physicalCompletionPercent)) / 100;
    const evAmount = pv.amount.times(completionDecimal);
    const ev = new Money(evAmount, c);

    const cv = ev.minus(ac);
    const sv = ev.minus(pv);

    const cpi = ac.amount.isZero() ? '1.00' : ev.amount.dividedBy(ac.amount).toFixed(2);
    const spi = pv.amount.isZero() ? '1.00' : ev.amount.dividedBy(pv.amount).toFixed(2);

    let note = `Physical progress: ${input.physicalCompletionPercent}%`;
    if (input.hoursLogged >= input.hoursBudgeted && input.physicalCompletionPercent < 100) {
      note += ` (WARNING: ${input.hoursLogged} hours exhausted against ${input.hoursBudgeted} budgeted, but deliverable is only ${input.physicalCompletionPercent}% complete. Earned value reflects physical deliverable, not logged hours).`;
    }

    return {
      currency: c,
      plannedValue: pv,
      actualCost: ac,
      earnedValue: ev,
      costVariance: cv,
      scheduleVariance: sv,
      cpi,
      spi,
      hoursLogged: input.hoursLogged,
      hoursBudgeted: input.hoursBudgeted,
      note,
    };
  }
}
