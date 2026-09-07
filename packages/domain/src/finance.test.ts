import { describe, it, expect } from 'vitest';
import { Money } from './money.js';
import { TimeUtil } from './time.js';
import { FinancialCalculator } from './finance.js';

describe('Domain - Money & Decimal Precision', () => {
  it('should handle exact addition and prevent floating point errors', () => {
    const m1 = new Money('0.1', 'QAR');
    const m2 = new Money('0.2', 'QAR');
    const sum = m1.plus(m2);

    expect(sum.toString()).toBe('0.300000');
    expect(sum.toDisplayString()).toBe('0.30');
  });

  it('should reject currency mismatch operations', () => {
    const qar = new Money(100, 'QAR');
    const usd = new Money(100, 'USD');

    expect(() => qar.plus(usd)).toThrowError(/Currency mismatch/);
  });
});

describe('Domain - Time & Half-open intervals', () => {
  it('should correctly evaluate half-open interval [start, end)', () => {
    const start = '2026-09-07T10:00:00.000Z';
    const end = '2026-09-07T14:00:00.000Z';

    // Exactly at start -> inside [start, end)
    expect(TimeUtil.isWithinHalfOpenInterval('2026-09-07T10:00:00.000Z', start, end)).toBe(true);
    // At middle -> inside
    expect(TimeUtil.isWithinHalfOpenInterval('2026-09-07T12:00:00.000Z', start, end)).toBe(true);
    // Exactly at end -> excluded
    expect(TimeUtil.isWithinHalfOpenInterval('2026-09-07T14:00:00.000Z', start, end)).toBe(false);
  });

  it('should detect overlapping half-open intervals', () => {
    const s1 = '2026-09-07T10:00:00Z';
    const e1 = '2026-09-07T14:00:00Z';

    // Adjacent interval starting exactly at e1 does NOT overlap [10, 14) and [14, 18)
    expect(TimeUtil.intervalsOverlap(s1, e1, '2026-09-07T14:00:00Z', '2026-09-07T18:00:00Z')).toBe(false);

    // Overlapping interval [12, 16)
    expect(TimeUtil.intervalsOverlap(s1, e1, '2026-09-07T12:00:00Z', '2026-09-07T16:00:00Z')).toBe(true);
  });
});

describe('AT-066 / Section 3 Worked Financial Example Invariant', () => {
  it('should verify EAC 90,000 before and after accrual-to-invoice reconciliation; contribution margin 43.75%', () => {
    // Initial worked example values from specs/08_REPORTING_FINANCE_AND_ANALYTICS.md:
    // Original budget: 100,000
    // Approved budget changes: 10,000 -> Current authorised budget = 110,000
    // PO authorised: 70,000 (30,000 posted invoices, 10,000 accepted unbilled, 30,000 remaining unperformed)
    // Non-PO posted actual: 5,000 -> Total posted actual = 35,000
    // Other accepted accrual: 2,000 -> Total accrual = 12,000
    // Remaining unperformed commitment = 30,000
    // Uncommitted future forecast = 13,000
    // Approved revenue basis = 160,000

    const initialPosition = {
      currency: 'QAR',
      originalBudget: 100000,
      approvedBudgetChanges: 10000,
      postedActualCost: 35000, // 30,000 PO posted + 5,000 non-PO
      acceptedAccruedCost: 12000, // 10,000 PO unbilled + 2,000 other accrual
      remainingCommitments: 30000, // 30,000 unperformed PO
      uncommittedForecast: 13000,
      approvedRevenueBasis: 160000,
    };

    const initialResult = FinancialCalculator.calculatePosition(initialPosition);

    expect(initialResult.currentAuthorisedBudget.toString()).toBe('110000.000000');
    expect(initialResult.costIncurred.toString()).toBe('47000.000000');
    expect(initialResult.estimateAtCompletion.toString()).toBe('90000.000000');
    expect(initialResult.budgetVariance.toString()).toBe('20000.000000');
    expect(initialResult.forecastContribution?.toString()).toBe('70000.000000');
    expect(initialResult.forecastContributionMarginPercent).toBe('43.75%');

    // Invariant check: When 10,000 accepted-unbilled PO amount is invoiced:
    // actual becomes 45,000 and accrual becomes 2,000.
    // EAC remains 90,000 if nothing else changes!
    const updatedPosition = FinancialCalculator.transitionAccrualToInvoice(initialPosition, 10000);
    const updatedResult = FinancialCalculator.calculatePosition(updatedPosition);

    expect(updatedResult.estimateAtCompletion.toString()).toBe('90000.000000');
    expect(updatedResult.currentAuthorisedBudget.toString()).toBe('110000.000000');
    expect(updatedResult.budgetVariance.toString()).toBe('20000.000000');
    expect(updatedResult.forecastContribution?.toString()).toBe('70000.000000');
    expect(updatedResult.forecastContributionMarginPercent).toBe('43.75%');
  });
});
