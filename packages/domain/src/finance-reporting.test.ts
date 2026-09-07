import { describe, it, expect } from 'vitest';
import {
  Money,
  FinancialCalculator,
  FinancialPositionInput,
  CostAllocationEngine,
  MultiCurrencyValidator,
  SourceImportDeduplicator,
  CostImportBatch,
  CreditNoteAdjustmentEngine,
  ReportingEngine,
  ReportSnapshot,
  MetricsAggregationEngine,
  WebhookSecurityEngine,
  ProjectCloseoutEngine,
  ProjectCloseoutState,
} from './index.js';

describe('Phase 05 Domain Logic: Finance, Reporting, Integrations & Closeout', () => {
  // AT-066: Worked 90,000 EAC invariant
  describe('AT-066: Worked 90,000 EAC Invariant', () => {
    it('maintains EAC at exactly 90,000 when 10,000 moves from accrued to posted actual', () => {
      // Step 1: Initial position per specs/08_REPORTING_FINANCE_AND_ANALYTICS.md
      const initialInput: FinancialPositionInput = {
        currency: 'QAR',
        originalBudget: '100000',
        approvedBudgetChanges: '10000', // Current budget: 110,000
        postedActualCost: '35000', // 30,000 PO + 5,000 non-PO
        acceptedAccruedCost: '12000', // 10,000 PO accepted-unbilled + 2,000 other
        remainingCommitments: '30000',
        uncommittedForecast: '13000',
        approvedRevenueBasis: '160000',
      };

      const pos1 = FinancialCalculator.calculatePosition(initialInput);

      expect(pos1.currentAuthorisedBudget.amount.toString()).toBe('110000');
      expect(pos1.costIncurred.amount.toString()).toBe('47000'); // 35,000 + 12,000
      expect(pos1.estimateAtCompletion.amount.toString()).toBe('90000'); // 35k + 12k + 30k + 13k
      expect(pos1.budgetVariance.amount.toString()).toBe('20000'); // 110k - 90k
      expect(pos1.forecastContribution?.amount.toString()).toBe('70000'); // 160k - 90k
      expect(pos1.forecastContributionMarginPercent).toBe('43.75%'); // 70k / 160k = 43.75%

      // Step 2: 10,000 accepted-unbilled PO amount is invoiced
      const transitionedInput = FinancialCalculator.transitionAccrualToInvoice(initialInput, '10000');
      const pos2 = FinancialCalculator.calculatePosition(transitionedInput);

      expect(pos2.costIncurred.amount.toString()).toBe('47000');
      // Posted actual becomes 45,000
      expect(new Money(transitionedInput.postedActualCost, 'QAR').amount.toString()).toBe('45000');
      // Accrued becomes 2,000
      expect(new Money(transitionedInput.acceptedAccruedCost, 'QAR').amount.toString()).toBe('2000');
      // Invariant: EAC remains exactly 90,000 with zero double-counting!
      expect(pos2.estimateAtCompletion.amount.toString()).toBe('90000');
      expect(pos2.budgetVariance.amount.toString()).toBe('20000');
      expect(pos2.forecastContributionMarginPercent).toBe('43.75%');
    });
  });

  // AT-067: Duplicate source file rejection
  describe('AT-067: Source Import Deduplication', () => {
    it('rejects duplicate source files based on batchId and fileHash', () => {
      const existing: CostImportBatch[] = [
        {
          batchId: 'BATCH-SAP-2026-001',
          sourceSystem: 'SAP-ERP',
          fileHash: 'sha256-abcdef123456',
          importedAt: new Date(),
          recordCount: 50,
          totalAmount: new Money('150000', 'QAR'),
        },
      ];

      expect(() =>
        SourceImportDeduplicator.validateImportUniqueness(
          { sourceSystem: 'SAP-ERP', batchId: 'BATCH-SAP-2026-001', fileHash: 'sha256-abcdef123456' },
          existing
        )
      ).toThrowError(/DUPLICATE_SOURCE_IMPORT/);

      // Unique batch succeeds
      expect(() =>
        SourceImportDeduplicator.validateImportUniqueness(
          { sourceSystem: 'SAP-ERP', batchId: 'BATCH-SAP-2026-002', fileHash: 'sha256-xyz987654' },
          existing
        )
      ).not.toThrow();
    });
  });

  // AT-069: Credit note post-report adjustment
  describe('AT-069: Credit Note Post-Report Adjustment', () => {
    it('applies credit note to reduce posted actuals without exceeding actuals', () => {
      const initial: FinancialPositionInput = {
        currency: 'QAR',
        originalBudget: '100000',
        approvedBudgetChanges: '0',
        postedActualCost: '45000',
        acceptedAccruedCost: '2000',
        remainingCommitments: '30000',
        uncommittedForecast: '13000',
      };

      const adjusted = CreditNoteAdjustmentEngine.applyCreditAdjustment(initial, {
        creditNoteId: 'cn-001',
        invoiceId: 'inv-001',
        creditAmount: new Money('5000', 'QAR'),
        reason: 'Vendor volume discount credited post-delivery',
        effectiveDate: new Date(),
      });

      expect(new Money(adjusted.postedActualCost, 'QAR').amount.toString()).toBe('40000');

      // Exceeding actuals fails
      expect(() =>
        CreditNoteAdjustmentEngine.applyCreditAdjustment(initial, {
          creditNoteId: 'cn-002',
          invoiceId: 'inv-001',
          creditAmount: new Money('50000', 'QAR'),
          reason: 'Excessive credit',
          effectiveDate: new Date(),
        })
      ).toThrowError(/CREDIT_NOTE_EXCEEDS_ACTUAL/);
    });
  });

  // AT-070: Cost allocation validation
  describe('AT-070: Cost Allocation Engine', () => {
    it('rejects allocations when total exceeds invoice line amount', () => {
      const invoiceLine = new Money('10000', 'QAR');

      // Valid allocation
      const valid = CostAllocationEngine.validateAllocations(invoiceLine, [
        { packageId: 'pkg-01', amount: '6000' },
        { packageId: 'pkg-02', amount: '4000' },
      ]);
      expect(valid.isValid).toBe(true);
      expect(valid.remainingUnallocated.amount.isZero()).toBe(true);

      // Over-allocation
      expect(() =>
        CostAllocationEngine.validateAllocations(invoiceLine, [
          { packageId: 'pkg-01', amount: '6000' },
          { packageId: 'pkg-02', amount: '4500' },
        ])
      ).toThrowError(/COST_ALLOCATION_EXCEEDS_INVOICE_LINE/);
    });
  });

  // AT-071: Currency discrepancy
  describe('AT-071: Multi-Currency Validation', () => {
    it('rejects mixed currencies without explicit FX rate', () => {
      expect(() =>
        MultiCurrencyValidator.assertConsistentCurrency('QAR', [
          { amount: new Money('10000', 'QAR'), description: 'Local truss rental' },
          { amount: new Money('5000', 'USD'), description: 'International artist fee' },
        ])
      ).toThrowError(/MIXED_CURRENCY_DISCREPANCY/);
    });
  });

  // AT-072: Webhook signature & deduplication
  describe('AT-072: Webhook Security Engine', () => {
    it('verifies signatures and deduplicates replayed webhook events', () => {
      const secret = 'whsec_festival_live_2026';
      expect(WebhookSecurityEngine.verifySignature(secret, 'sig_valid_12345', '{}')).toBe(true);
      expect(WebhookSecurityEngine.verifySignature(secret, 'forged_bad_sig', '{}')).toBe(false);

      const processed = new Set<string>();
      const res1 = WebhookSecurityEngine.processWebhookIdempotently('evt-wh-01', processed);
      expect(res1.isDuplicate).toBe(false);
      expect(res1.status).toBe('processed');

      const res2 = WebhookSecurityEngine.processWebhookIdempotently('evt-wh-01', processed);
      expect(res2.isDuplicate).toBe(true);
      expect(res2.status).toBe('duplicate_replay_ignored');
    });
  });

  // AT-074: Ticketing aggregation
  describe('AT-074: Metrics Aggregation Engine', () => {
    it('prevents summing daily uniques into false unique attendees', () => {
      // 2 attendees over 2 days. Attendee 1 attends both days; Attendee 2 attends only Day 1.
      // Total turnstile scans: 4 scans (attendee 1 scanned twice on day 1 and once on day 2; attendee 2 scanned once on day 1)
      const scans = [
        { ticketId: 't-1', attendeeId: 'att-user-1', day: '2026-10-01', gate: 'G1', timestamp: new Date() },
        { ticketId: 't-1', attendeeId: 'att-user-1', day: '2026-10-01', gate: 'G2', timestamp: new Date() },
        { ticketId: 't-2', attendeeId: 'att-user-2', day: '2026-10-01', gate: 'G1', timestamp: new Date() },
        { ticketId: 't-1', attendeeId: 'att-user-1', day: '2026-10-02', gate: 'G1', timestamp: new Date() },
      ];

      const metrics = MetricsAggregationEngine.aggregateAttendance(scans);
      expect(metrics.totalTurnstileScans).toBe(4);
      expect(metrics.dailyUniqueAttendees['2026-10-01']).toBe(2);
      expect(metrics.dailyUniqueAttendees['2026-10-02']).toBe(1);
      expect(metrics.dailySumOfUniques).toBe(3); // 2 + 1 = 3
      // But actual unique individuals across the festival is 2!
      expect(metrics.totalUniqueAttendees).toBe(2);
      expect(metrics.duplicationRatio).toContain('1.50x');
    });
  });

  // AT-077: Report audience projection
  describe('AT-077: Reporting Audience Projection', () => {
    it('strips internal margins and sensitive narratives for client views', () => {
      const snapshot: ReportSnapshot = {
        projectId: 'prj-test-01',
        reportCode: 'REP-2026-001',
        periodStart: new Date('2026-10-01'),
        periodEnd: new Date('2026-10-03'),
        financials: {
          revenue: '500000',
          currentBudget: '350000',
          actualCost: '320000',
          internalMarginPercent: '36.00%',
          vendorCostBreakdown: { 'Apex Audio': '120000', 'Hamad Staging': '200000' },
        },
        incidents: [
          {
            title: 'Minor Stage Delay',
            severity: 'low',
            operationalImpact: 'Show delayed by 8 minutes',
            restrictedPersonalNarrative: 'Sound operator experienced heat exhaustion and rested in AC tent.',
          },
        ],
        metrics: {
          totalTurnstileEntries: 12500,
          uniqueAttendees: 8200,
          daysCount: 3,
        },
        milestonesCompleted: ['Milestone 1: Stage Handover', 'Milestone 2: Sound Check'],
      };

      // Client view
      const clientContent = ReportingEngine.projectForAudience(snapshot, 'client_portal');
      expect(clientContent.financials.revenue).toBe('500000');
      expect(clientContent.financials.internalMarginPercent).toBeUndefined();
      expect(clientContent.financials.vendorCostBreakdown).toBeUndefined();
      expect(clientContent.incidents[0].restrictedPersonalNarrative).toBeUndefined();
      expect(clientContent.incidents[0].operationalImpact).toBe('Show delayed by 8 minutes');

      // Internal view
      const internalContent = ReportingEngine.projectForAudience(snapshot, 'internal_command');
      expect(internalContent.financials.internalMarginPercent).toBe('36.00%');
      expect(internalContent.incidents[0].restrictedPersonalNarrative).toContain('heat exhaustion');
    });
  });

  // AT-078: Decoupled operational closure
  describe('AT-078: Decoupled Operational Closure', () => {
    it('permits operational closure while financial settlement remains open', () => {
      const state: ProjectCloseoutState = {
        projectId: 'prj-test-closeout',
        operationalStatus: 'active',
        acceptanceStatus: 'accepted',
        reportingStatus: 'published',
        financialReviewStatus: 'completed',
        settlementStatus: 'open_receivables',
        openReceivablesCount: 2,
      };

      const closedState = ProjectCloseoutEngine.closeOperationally(state, 'usr-pm-director');
      expect(closedState.operationalStatus).toBe('operational_closed');
      expect(closedState.operationalClosedBy).toBe('usr-pm-director');
      expect(closedState.settlementStatus).toBe('open_receivables');
    });

    it('captures lessons learned without altering master policy', () => {
      const lesson = ProjectCloseoutEngine.captureLesson('prj-test-closeout', {
        title: 'Buffer generator fuel reserves for desert locations',
        category: 'logistics',
        narrative: 'Heavy sandstorm delayed secondary tanker arrival by 4 hours.',
        policyRevisionProposed: true,
      });

      expect(lesson.masterPolicyModified).toBe(false);
    });
  });
});
