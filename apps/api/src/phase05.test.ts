import { describe, it, expect, beforeEach } from 'vitest';
import {
  FinanceController,
  costImportRepository,
  invoiceRepository,
  creditNoteRepository,
  financialPositionRepository,
} from './finance/finance.controller.js';
import {
  ReportingController,
  reportRepository,
  reportRevisionHistory,
  closeoutRepository,
  lessonRepository,
} from './reporting/reporting.controller.js';
import {
  IntegrationsController,
  processedWebhookIds,
  metricObservationRepository,
  calendarProposalRepository,
} from './integrations/integrations.controller.js';
import { projectRepository } from './projects/projects.controller.js';

describe('Phase 05 Integration Tests (AT-066 through AT-079)', () => {
  let financeController: FinanceController;
  let reportingController: ReportingController;
  let integrationsController: IntegrationsController;

  const agencyOrgId = '11111111-1111-4111-8111-111111111111';
  const projectId = 'prj-p05-doha-expo';

  beforeEach(() => {
    financeController = new FinanceController();
    reportingController = new ReportingController();
    integrationsController = new IntegrationsController();

    costImportRepository.clear();
    invoiceRepository.clear();
    creditNoteRepository.clear();
    financialPositionRepository.clear();
    reportRepository.clear();
    reportRevisionHistory.clear();
    closeoutRepository.clear();
    lessonRepository.clear();
    processedWebhookIds.clear();
    metricObservationRepository.clear();
    calendarProposalRepository.clear();
    projectRepository.clear();

    projectRepository.set(projectId, {
      id: projectId,
      organisationId: agencyOrgId,
      projectCode: 'P05-DOHA-EXPO',
      title: 'Doha Expo Main Pavilion Closing Ceremony',
      description: 'Closing ceremonial production, international broadcast, and VIP reception',
      originCode: 'DIRECT_AWARD',
      ownerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      maturity: 'in_delivery',
      outcome: 'undetermined',
      financialAssumptions: {
        currency: 'QAR',
        expectedRevenueMax: '3000000',
        estimatedCost: '2000000',
      },
      rowVersion: 1,
    });
  });

  const agencyReq = {
    headers: { 'x-request-id': 'req-test-p05', 'x-user-id': 'usr-finance-lead' },
    organisationId: agencyOrgId,
    userId: 'usr-finance-lead',
  } as any;

  // --- AT-066: Worked Accrual-to-Invoice Example (90,000 EAC Invariant) ---
  describe('AT-066: Worked Accrual-to-Invoice Example (90,000 EAC Invariant)', () => {
    it('preserves EAC at exactly 90,000 when 10,000 moves from accepted-unbilled accrual to posted invoice', () => {
      // 1. Initialize exact baseline financial position from specs/08_REPORTING_FINANCE_AND_ANALYTICS.md
      const initRes = financeController.setFinancialPosition(
        projectId,
        {
          currency: 'QAR',
          originalBudget: '100000',
          approvedBudgetChanges: '10000', // Authorized budget: 110,000
          postedActualCost: '35000', // 30,000 PO + 5,000 non-PO
          acceptedAccruedCost: '12000', // 10,000 PO accepted-unbilled + 2,000 other
          remainingCommitments: '30000',
          uncommittedForecast: '13000',
          approvedRevenueBasis: '160000',
        },
        agencyReq
      );

      expect(initRes.data.payload?.currentAuthorisedBudget.amount.toString()).toBe('110000');
      expect(initRes.data.payload?.costIncurred.amount.toString()).toBe('47000');
      expect(initRes.data.payload?.estimateAtCompletion.amount.toString()).toBe('90000');
      expect(initRes.data.payload?.budgetVariance.amount.toString()).toBe('20000'); // 110k - 90k
      expect(initRes.data.payload?.forecastContribution?.amount.toString()).toBe('70000'); // 160k - 90k
      expect(initRes.data.payload?.forecastContributionMarginPercent).toBe('43.75%');

      // 2. Transition the 10,000 accepted-unbilled PO amount to a posted invoice
      const transitionRes = financeController.transitionAccrual(
        projectId,
        { invoicedAmount: '10000' },
        agencyReq
      );

      // 3. Invariant: EAC remains exactly 90,000; posted actual becomes 45,000, accrual becomes 2,000
      expect(transitionRes.data.payload?.estimateAtCompletion.amount.toString()).toBe('90000');
      expect(transitionRes.data.payload?.costIncurred.amount.toString()).toBe('47000');
      expect(transitionRes.data.payload?.budgetVariance.amount.toString()).toBe('20000');
      expect(transitionRes.data.payload?.forecastContributionMarginPercent).toBe('43.75%');

      // 4. Verify GET returns identical invariant position
      const getPos = financeController.getFinancialPosition(projectId, agencyReq);
      expect(getPos.data.payload?.estimateAtCompletion.amount.toString()).toBe('90000');
    });
  });

  // --- AT-067: Financial Source File Imported Twice ---
  describe('AT-067: Financial Source File Imported Twice', () => {
    it('rejects duplicate financial source file imports to prevent duplicate cost effects', () => {
      const importPayload = {
        sourceSystem: 'SAP-S4HANA-QATAR',
        batchId: 'BATCH-GL-2026-10-01',
        fileHash: 'sha256-gl-doha-9912a',
        currency: 'QAR',
        records: [
          { externalTxId: 'tx-01', description: 'Truss generator diesel supply', amount: '25000', currency: 'QAR' },
          { externalTxId: 'tx-02', description: 'Security barrier hire', amount: '15000', currency: 'QAR' },
        ],
      };

      // First import passes
      const res1 = financeController.importCostFile(projectId, importPayload, agencyReq);
      expect(res1.data.status).toBe('imported');
      expect(res1.data.payload?.totalAmount.amount.toString()).toBe('40000');

      // Second import with identical batchId & fileHash must be rejected
      expect(() => financeController.importCostFile(projectId, importPayload, agencyReq)).toThrowError(
        /DUPLICATE_SOURCE_IMPORT/
      );
    });
  });

  // --- AT-068: Invoice Quarantined by Accounting Ledger ---
  describe('AT-068: Invoice Quarantined by Accounting Ledger', () => {
    it('ensures ledger-quarantined invoices never display as posted or paid in EOS', () => {
      // 1. Create invoice
      const invRes = financeController.createInvoice(
        projectId,
        {
          invoiceNumber: 'INV-2026-LEDGER-01',
          amount: '85000',
          currency: 'QAR',
        },
        agencyReq
      );
      const invoiceId = invRes.data.id;

      // 2. Accounting ledger sync returns quarantine / rejection
      const updateRes = financeController.updateLedgerStatus(
        projectId,
        invoiceId,
        {
          ledgerStatus: 'quarantined_by_ledger',
          quarantineReason: 'Missing vendor VAT clearance certificate in statutory compliance gateway',
        },
        agencyReq
      );

      // 3. Invariant: Status shows quarantined_by_ledger and isPaid is false
      expect(updateRes.data.payload?.ledgerStatus).toBe('quarantined_by_ledger');
      expect(updateRes.data.payload?.quarantineReason).toContain('Missing vendor VAT clearance');
      expect(updateRes.data.payload?.isPaid).toBe(false);
    });
  });

  // --- AT-069: Credit Note / Reversal Arrives After Final Report ---
  describe('AT-069: Credit Note / Reversal Arrives After Final Report', () => {
    it('creates revision V2 while retaining V1 historical report and source manifest', () => {
      // 1. Create and publish initial report V1
      const repRes = reportingController.createReport(
        projectId,
        {
          reportCode: 'REP-DOHA-EXPO-FINAL',
          periodStart: '2026-10-01T00:00:00Z',
          periodEnd: '2026-10-05T00:00:00Z',
          targetAudience: 'client_portal',
          snapshotData: {
            financials: {
              revenue: '3000000',
              currentBudget: '2000000',
              actualCost: '1850000',
            },
            incidents: [],
            metrics: { totalTurnstileEntries: 25000, uniqueAttendees: 18000, daysCount: 3 },
            milestonesCompleted: ['Show Complete'],
          },
        },
        agencyReq
      );
      const reportId = repRes.data.id;
      reportingController.publishReport(projectId, reportId, { idempotencyKey: 'idemp-pub-v1' }, agencyReq);

      // 2. Post-report credit note arrives (e.g. 50,000 QAR volume refund from AV supplier)
      financeController.applyCreditNote(
        projectId,
        {
          invoiceId: 'inv-av-01',
          creditAmount: '50000',
          currency: 'QAR',
          reason: 'Supplier volume rebate credited post-show',
        },
        agencyReq
      );

      // 3. Generate report revision V2
      const revRes = reportingController.createRevision(
        projectId,
        reportId,
        {
          revisionReason: 'Supplier volume rebate of 50,000 QAR applied post-show',
          revisedActualCost: '1800000',
        },
        agencyReq
      );

      // 4. Invariant: V2 exists with version 2 and updated financials, V1 is preserved
      expect(revRes.data.payload?.version).toBe(2);
      expect(revRes.data.payload?.content.financials.actualCost).toBe('1800000');
      expect(revRes.data.payload?.revisionReason).toContain('Supplier volume rebate');

      const history = reportRevisionHistory.get(reportId)!;
      expect(history.length).toBe(2);
      expect(history[0].version).toBe(1);
      expect(history[0].content.financials.actualCost).toBe('1850000'); // Preserved!
    });
  });

  // --- AT-070: Allocation Sum Exceeds Invoice Line ---
  describe('AT-070: Allocation Sum Exceeds Invoice Line', () => {
    it('rejects allocations where sum exceeds invoice line amount without duplicating expense', () => {
      const invRes = financeController.createInvoice(
        projectId,
        {
          invoiceNumber: 'INV-2026-RIG-01',
          amount: '50000',
          currency: 'QAR',
        },
        agencyReq
      );
      const invoiceId = invRes.data.id;

      // Over-allocation (35,000 + 20,000 = 55,000 > 50,000)
      expect(() =>
        financeController.allocateInvoiceCost(
          projectId,
          {
            invoiceId,
            lineId: 'line-01',
            allocations: [
              { packageId: 'pkg-main-stage', amount: '35000' },
              { packageId: 'pkg-vip-lounge', amount: '20000' },
            ],
          },
          agencyReq
        )
      ).toThrowError(/ALLOCATION_EXCEEDS_INVOICE/);

      // Valid allocation (30,000 + 20,000 = 50,000)
      const validRes = financeController.allocateInvoiceCost(
        projectId,
        {
          invoiceId,
          lineId: 'line-01',
          allocations: [
            { packageId: 'pkg-main-stage', amount: '30000' },
            { packageId: 'pkg-vip-lounge', amount: '20000' },
          ],
        },
        agencyReq
      );

      expect(validRes.data.status).toBe('allocated');
      expect(validRes.data.payload?.totalAllocated).toBe('50000');
      expect(validRes.data.payload?.remainingUnallocated).toBe('0');
    });
  });

  // --- AT-071: Financial Period / Currency / FX Rate Differs ---
  describe('AT-071: Multi-Currency Validation', () => {
    it('rejects mixing different currencies without explicit FX rate into reporting basis', () => {
      expect(() =>
        financeController.importCostFile(
          projectId,
          {
            sourceSystem: 'GLOBAL-PAYROLL',
            batchId: 'BATCH-USD-01',
            fileHash: 'sha256-usd-payroll',
            currency: 'QAR',
            records: [
              { externalTxId: 'tx-1', description: 'Local crew QAR', amount: '10000', currency: 'QAR' },
              { externalTxId: 'tx-2', description: 'International director USD', amount: '8000', currency: 'USD' },
            ],
          },
          agencyReq
        )
      ).toThrowError(/CURRENCY_MISMATCH/);
    });
  });

  // --- AT-072: Provider Webhook Forged or Replayed ---
  describe('AT-072: Provider Webhook Forged or Replayed', () => {
    it('rejects forged webhook signature and deduplicates repeated replay events', () => {
      // 1. Forged signature rejected with 401
      expect(() =>
        integrationsController.handleWebhook(
          'stripe_or_ticketing',
          {
            provider: 'ticketing',
            eventId: 'evt-ticket-001',
            signature: 'bad_forged_sig',
            payload: { orderId: 'ord-100', amount: 500 },
          },
          agencyReq
        )
      ).toThrowError(/FORGED_OR_INVALID_WEBHOOK_SIGNATURE/);

      // 2. Valid signature processed
      const res1 = integrationsController.handleWebhook(
        'ticketing',
        {
          provider: 'ticketing',
          eventId: 'evt-ticket-001',
          signature: 'sig_valid_ticketing_gate',
          payload: { orderId: 'ord-100', amount: 500 },
        },
        agencyReq
      );
      expect(res1.data.status).toBe('processed');

      // 3. Replay of same eventId ignored without mutating state
      const res2 = integrationsController.handleWebhook(
        'ticketing',
        {
          provider: 'ticketing',
          eventId: 'evt-ticket-001',
          signature: 'sig_valid_ticketing_gate',
          payload: { orderId: 'ord-100', amount: 500 },
        },
        agencyReq
      );
      expect(res2.data.status).toBe('duplicate_replay_ignored');
    });
  });

  // --- AT-073: BookingQube API Unavailable / Unverified ---
  describe('AT-073: BookingQube API Unavailable / Unverified', () => {
    it('discloses provisional manual import without fabricated live metrics when API is unverified', () => {
      const healthReq = {
        headers: { 'x-api-verified': 'false' },
      } as any;

      const healthRes = integrationsController.getConnectorHealth('bookingqube-connector', healthReq);
      expect(healthRes.data.payload?.status).toBe('provisional_manual_import');
      expect(healthRes.data.payload?.hasApiAccess).toBe(false);
      expect(healthRes.data.payload?.freshnessDisclosure).toContain('BookingQube API is unverified/unavailable');
    });
  });

  // --- AT-074: Ticket Entries and Daily Uniques Aggregated ---
  describe('AT-074: Ticket Entries and Daily Uniques Aggregated', () => {
    it('prevents summing daily uniques into false overall unique attendees for multi-day events', () => {
      // 2 attendees across 3 days:
      // Attendee A scans on Day 1, Day 2, Day 3
      // Attendee B scans on Day 1, Day 2
      const scans = [
        { ticketId: 't-A', attendeeId: 'user-A', day: '2026-10-01', gate: 'Gate-1', timestamp: '2026-10-01T10:00:00Z' },
        { ticketId: 't-A', attendeeId: 'user-A', day: '2026-10-01', gate: 'Gate-2', timestamp: '2026-10-01T15:00:00Z' }, // re-entry
        { ticketId: 't-B', attendeeId: 'user-B', day: '2026-10-01', gate: 'Gate-1', timestamp: '2026-10-01T11:00:00Z' },
        { ticketId: 't-A', attendeeId: 'user-A', day: '2026-10-02', gate: 'Gate-1', timestamp: '2026-10-02T10:00:00Z' },
        { ticketId: 't-B', attendeeId: 'user-B', day: '2026-10-02', gate: 'Gate-1', timestamp: '2026-10-02T10:30:00Z' },
        { ticketId: 't-A', attendeeId: 'user-A', day: '2026-10-03', gate: 'Gate-1', timestamp: '2026-10-03T12:00:00Z' },
      ];

      const obsRes = integrationsController.recordMetricObservation(
        projectId,
        {
          metricType: 'overall_unique_attendees',
          scans,
        },
        agencyReq
      );

      // Invariant: Turnstile scans = 6; Daily unique sum = 2+2+1 = 5; Overall unique attendees = 2!
      expect(obsRes.data.payload?.totalTurnstileScans).toBe(6);
      expect(obsRes.data.payload?.dailySumOfUniques).toBe(5);
      expect(obsRes.data.payload?.totalUniqueAttendees).toBe(2);
      expect(obsRes.data.payload?.duplicationRatio).toContain('2.50x');
    });
  });

  // --- AT-075: Metricool Stale or Plan Lacks API ---
  describe('AT-075: Metricool Stale or Plan Lacks API', () => {
    it('discloses provisional status when plan lacks API and flags stale feeds without halting operations', () => {
      // Plan lacks API
      const noApiReq = { headers: { 'x-has-api-plan': 'false' } } as any;
      const res1 = integrationsController.getConnectorHealth('metricool-connector', noApiReq);
      expect(res1.data.payload?.status).toBe('provisional_manual_import');
      expect(res1.data.payload?.freshnessDisclosure).toContain('lacks automated REST API access');

      // Plan has API but feed is 48 hours stale
      const staleReq = {
        headers: { 'x-has-api-plan': 'true', 'x-sync-age-hours': '48' },
      } as any;
      const res2 = integrationsController.getConnectorHealth('metricool-connector', staleReq);
      expect(res2.data.payload?.status).toBe('stale_external_feed');
      expect(res2.data.payload?.freshnessDisclosure).toContain('48h old');
    });
  });

  // --- AT-076: Calendar Event Changed Externally ---
  describe('AT-076: Calendar Event Changed Externally', () => {
    it('creates reconciliation proposal for PM review rather than silently overwriting baseline', () => {
      const propRes = integrationsController.createCalendarProposal(
        projectId,
        {
          externalEventId: 'gcal-vip-dinner-01',
          baselineStart: '2026-10-02T19:00:00Z',
          baselineEnd: '2026-10-02T22:00:00Z',
          externalStart: '2026-10-02T20:30:00Z', // Delayed by 90 minutes in Google Calendar
          externalEnd: '2026-10-02T23:30:00Z',
        },
        agencyReq
      );

      // Invariant: Status is pending_pm_review, baseline is not silently overwritten
      expect(propRes.data.status).toBe('pending_pm_review');
      expect(propRes.data.payload?.externalChangeSummary).toContain('differ from approved EOS project baseline');
    });
  });

  // --- AT-077: Client Report Generated from Internal Data ---
  describe('AT-077: Client Report Generated from Internal Data', () => {
    it('projects client views by stripping internal margins and confidential narratives', () => {
      const repRes = reportingController.createReport(
        projectId,
        {
          reportCode: 'REP-DOHA-CLIENT-PACK',
          periodStart: '2026-10-01T00:00:00Z',
          periodEnd: '2026-10-03T00:00:00Z',
          targetAudience: 'client_portal',
          snapshotData: {
            financials: {
              revenue: '2500000',
              currentBudget: '1600000',
              actualCost: '1500000',
              internalMarginPercent: '40.00%',
              vendorCostBreakdown: { 'Sub-Contractor A': '600000', 'Sub-Contractor B': '900000' },
            },
            incidents: [
              {
                title: 'Minor Lighting Board Power Trip',
                severity: 'low',
                operationalImpact: '3-minute pause before secondary generator engaged',
                restrictedPersonalNarrative: 'Electrician Ahmed suffered minor thumb abrasion during breaker reset.',
              },
            ],
            metrics: { totalTurnstileEntries: 12000, uniqueAttendees: 8000, daysCount: 2 },
            milestonesCompleted: ['VIP Arrival', 'Main Ceremony'],
          },
        },
        agencyReq
      );
      const reportId = repRes.data.id;

      // Query as client portal
      const clientReq = { ...agencyReq, headers: { ...agencyReq.headers, 'x-audience': 'client_portal' } };
      const clientView = reportingController.getReport(projectId, reportId, clientReq);

      expect(clientView.data.payload?.content.financials.internalMarginPercent).toBeUndefined();
      expect(clientView.data.payload?.content.financials.vendorCostBreakdown).toBeUndefined();
      expect(clientView.data.payload?.content.incidents[0].restrictedPersonalNarrative).toBeUndefined();
      expect(clientView.data.payload?.content.incidents[0].operationalImpact).toContain('3-minute pause');

      // Query as internal command
      const internalReq = { ...agencyReq, headers: { ...agencyReq.headers, 'x-audience': 'internal_command' } };
      const internalView = reportingController.getReport(projectId, reportId, internalReq);

      expect(internalView.data.payload?.content.financials.internalMarginPercent).toBe('40.00%');
      expect(internalView.data.payload?.content.incidents[0].restrictedPersonalNarrative).toContain('Ahmed');
    });
  });

  // --- AT-078: Operational Project Closed with Receivable Open ---
  describe('AT-078: Operational Project Closed with Receivable Open', () => {
    it('permits operational closure while accounts receivable settlement remains open', () => {
      // 1. Issue operational closure
      const closeRes = reportingController.recordClosureDecision(
        projectId,
        {
          dimension: 'operational',
          decision: 'closed',
          notes: 'Venue demobilized and site handed back to Katara administration',
        },
        agencyReq
      );

      // Invariant: operationalStatus is operational_closed, settlementStatus remains open_receivables
      expect(closeRes.data.payload?.operationalStatus).toBe('operational_closed');
      expect(closeRes.data.payload?.settlementStatus).toBe('open_receivables');
      expect(closeRes.data.payload?.openReceivablesCount).toBe(2);

      // 2. Record lesson learned without altering master policies
      const lessonRes = reportingController.captureLesson(
        projectId,
        {
          title: 'Pre-wire secondary generator transfer switches',
          category: 'safety',
          narrative: 'Automatic switchover prevented ceremonial broadcast disruption.',
          policyRevisionProposed: true,
        },
        agencyReq
      );

      expect(lessonRes.data.payload?.masterPolicyModified).toBe(false);
    });
  });

  // --- AT-079: Report Generated Twice from Frozen Snapshot ---
  describe('AT-079: Report Generated Twice from Frozen Snapshot', () => {
    it('produces deterministic content and ensures duplicate publication requests are idempotent', () => {
      // 1. Create report
      const repRes = reportingController.createReport(
        projectId,
        {
          reportCode: 'REP-FROZEN-001',
          periodStart: '2026-10-01T00:00:00Z',
          periodEnd: '2026-10-02T00:00:00Z',
          targetAudience: 'public_report',
        },
        agencyReq
      );
      const reportId = repRes.data.id;
      const initialHash = repRes.data.payload?.deterministicContentHash;
      expect(initialHash).toBeDefined();

      // 2. Publish with idempotency key
      const pub1 = reportingController.publishReport(
        projectId,
        reportId,
        { idempotencyKey: 'idemp-freeze-publish-999' },
        agencyReq
      );
      expect(pub1.data.status).toBe('published');

      // 3. Duplicate publication with same idempotency key returns existing state without duplicate effect
      const pub2 = reportingController.publishReport(
        projectId,
        reportId,
        { idempotencyKey: 'idemp-freeze-publish-999' },
        agencyReq
      );
      expect(pub2.data.status).toBe('published');
      expect(pub2.data.id).toBe(reportId);
      expect(reportRepository.size).toBe(1); // No duplicate publication record created
    });
  });
});
