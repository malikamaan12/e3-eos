import { describe, it, expect } from 'vitest';
import {
  FinancialCalculator,
  FinancialPositionInput,
  CostAllocationEngine,
  MultiCurrencyValidator,
  SourceImportDeduplicator,
  CreditNoteAdjustmentEngine,
  ThreeWayMatchEngine,
  PurchaseOrderForMatch,
  ReceiptForMatch,
  CommercialCloseoutEngine,
  CommercialCloseoutChecklist,
  ClientResultsEngine,
  ClientResultsRoomData,
  KpiPerformanceEngine,
  IntegrationReconciliationEngine,
  safeSha256,
  Money,
} from '@e3-eos/domain';

describe('Sprint 05 — Financial Reconciliation, Billing, Reporting, Client Results Room & Integrations Acceptance (AT-066 to AT-077)', () => {
  const projectId = 'PRJ-QND-2026';

  // ---------------------------------------------------------------------------
  // AT-066: Transition from PO commitment to approved supplier invoice (Zero Double-Counting)
  // ---------------------------------------------------------------------------
  it('AT-066: Supplier invoice approval reduces remaining commitments and increases actual costs without double-counting; EAC remains invariant', () => {
    const initialPosition: FinancialPositionInput = {
      currency: 'QAR',
      originalBudget: '1850000',
      approvedBudgetChanges: '150000',
      postedActualCost: '1180000',
      acceptedAccruedCost: '120000',
      remainingCommitments: '350000',
      uncommittedForecast: '150000',
      approvedRevenueBasis: '2450000',
    };

    const initialCalc = FinancialCalculator.calculatePosition(initialPosition);
    expect(initialCalc.currentAuthorisedBudget.toDisplayString()).toBe('2000000.00');
    expect(initialCalc.estimateAtCompletion.toDisplayString()).toBe('1800000.00');
    expect(initialCalc.budgetVariance.toDisplayString()).toBe('200000.00'); // VAC = 200k favorable

    // Transition 145,000 QAR approved invoice from PO commitment to actual cost
    const invoiceAmount = '145000';
    const updatedPosition = FinancialCalculator.applySupplierInvoiceToCommitment(initialPosition, invoiceAmount);

    expect(new Money(updatedPosition.postedActualCost, 'QAR').toDisplayString()).toBe('1325000.00');
    expect(new Money(updatedPosition.remainingCommitments, 'QAR').toDisplayString()).toBe('205000.00');

    // EAC and VAC must remain strictly invariant
    const updatedCalc = FinancialCalculator.calculatePosition(updatedPosition);
    expect(updatedCalc.estimateAtCompletion.toDisplayString()).toBe('1800000.00');
    expect(updatedCalc.budgetVariance.toDisplayString()).toBe('200000.00');
    expect(updatedCalc.currentAuthorisedBudget.toDisplayString()).toBe('2000000.00');

    // Invariant: Trying to invoice more than remaining commitment throws an exception
    expect(() => {
      FinancialCalculator.applySupplierInvoiceToCommitment(updatedPosition, '999999');
    }).toThrow(/exceeding remaining commitments/);
  });

  // ---------------------------------------------------------------------------
  // AT-067: Source import deduplication
  // ---------------------------------------------------------------------------
  it('AT-067: Prevents duplicate financial import files or batches from mutating project costs', () => {
    const existingBatches = [
      {
        batchId: 'BATCH-ERP-001',
        sourceSystem: 'Microsoft Dynamics 365',
        fileHash: 'sha256-d365-ledger-aug2026-01',
        importedAt: new Date('2026-08-15T10:00:00Z'),
        recordCount: 45,
        totalAmount: new Money('145000', 'QAR'),
      },
    ];

    // Attempting to re-import identical batch hash throws duplicate error
    expect(() => {
      SourceImportDeduplicator.validateImportUniqueness(
        {
          sourceSystem: 'Microsoft Dynamics 365',
          fileHash: 'sha256-d365-ledger-aug2026-01',
          batchId: 'BATCH-ERP-002',
        },
        existingBatches
      );
    }).toThrow(/DUPLICATE_SOURCE_IMPORT/);
  });

  // ---------------------------------------------------------------------------
  // AT-068: Three-way match discrepancy detection & duplicate invoice block
  // ---------------------------------------------------------------------------
  it('AT-068: Evaluates Three-Way Match across PO, Receipts and Invoice; detects quantity, rate and duplicate invoice discrepancies', () => {
    const po: PurchaseOrderForMatch = {
      id: 'PO-QND-003',
      currency: 'QAR',
      totalAmount: '120000',
      remainingAmount: '120000',
      lines: [
        { lineId: 'POL-01', description: 'Line Array Speaker Clusters', quantity: 8, unitRate: 12500, totalCost: 100000 },
        { lineId: 'POL-02', description: 'Subwoofer Enclosures', quantity: 2, unitRate: 10000, totalCost: 20000 },
      ],
    };

    // Goods receipt has accepted only the speakers (quantity 8), but 0 subwoofers received
    const receipts: ReceiptForMatch[] = [
      { receiptId: 'REC-01', poId: 'PO-QND-003', poLineId: 'POL-01', acceptedQuantity: 8, isSignedOff: true },
      { receiptId: 'REC-02', poId: 'PO-QND-003', poLineId: 'POL-02', acceptedQuantity: 0, isSignedOff: false },
    ];

    // Vendor submits invoice billing for both speakers AND subwoofers
    const invoice = {
      invoiceNumber: 'INV-GAV-1092',
      vendorId: 'VND-GULF-AV',
      currency: 'QAR' as const,
      totalAmount: '120000',
      lines: [
        { poLineId: 'POL-01', description: 'Line Array Speaker Clusters', quantity: 8, unitCost: 12500, totalCost: 100000 },
        { poLineId: 'POL-02', description: 'Subwoofer Enclosures', quantity: 2, unitCost: 10000, totalCost: 20000 },
      ],
    };

    const result = ThreeWayMatchEngine.evaluateMatch(po, receipts, invoice, []);
    expect(result.overallMatch).toBe(false);
    expect(result.quantityMismatch).toBe(true);
    expect(result.discrepancyDetails.some((d) => d.code === 'QUANTITY_MISMATCH')).toBe(true);

    // Duplicate invoice detection
    const existingInvoices = [
      { id: 'INV-01', vendorId: 'VND-GULF-AV', invoiceNumber: 'INV-GAV-1092' },
    ];
    const dupResult = ThreeWayMatchEngine.evaluateMatch(po, receipts, invoice, existingInvoices);
    expect(dupResult.duplicateDetected).toBe(true);
    expect(dupResult.overallMatch).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // AT-069: Post-report credit note adjustment
  // ---------------------------------------------------------------------------
  it('AT-069: Applies credit note adjustments to posted actuals without altering historical frozen snapshots', () => {
    const position: FinancialPositionInput = {
      currency: 'QAR',
      originalBudget: '2000000',
      approvedBudgetChanges: '0',
      postedActualCost: '500000',
      acceptedAccruedCost: '0',
      remainingCommitments: '200000',
      uncommittedForecast: '100000',
    };

    const creditAdjustment = {
      creditNoteId: 'CR-001',
      invoiceId: 'INV-AR-8801',
      creditAmount: new Money('25000', 'QAR'),
      reason: 'Vendor rebate for steel offcuts returned to mill',
      effectiveDate: new Date('2026-08-28'),
    };

    const adjusted = CreditNoteAdjustmentEngine.applyCreditAdjustment(position, creditAdjustment);
    expect(new Money(adjusted.postedActualCost, 'QAR').toDisplayString()).toBe('475000.00');

    // Invariant: Credit note exceeding total actuals is rejected
    expect(() => {
      CreditNoteAdjustmentEngine.applyCreditAdjustment(position, {
        ...creditAdjustment,
        creditAmount: new Money('999999', 'QAR'),
      });
    }).toThrow(/CREDIT_NOTE_EXCEEDS_ACTUAL/);
  });

  // ---------------------------------------------------------------------------
  // AT-070: Multi-package cost allocation guard
  // ---------------------------------------------------------------------------
  it('AT-070: Validates that sum of cost allocations across packages does not exceed invoice line amount', () => {
    const invoiceLineAmount = new Money('100000', 'QAR');

    const validAllocations = [
      { packageId: 'PKG-STEEL', amount: '60000' },
      { packageId: 'PKG-STAGING', amount: '40000' },
    ];
    const result = CostAllocationEngine.validateAllocations(invoiceLineAmount, validAllocations);
    expect(result.isValid).toBe(true);
    expect(result.totalAllocated.toDisplayString()).toBe('100000.00');
    expect(result.remainingUnallocated.toDisplayString()).toBe('0.00');

    // Over-allocation rejection
    const invalidAllocations = [
      { packageId: 'PKG-STEEL', amount: '70000' },
      { packageId: 'PKG-STAGING', amount: '40000' }, // Sum = 110,000 > 100,000
    ];
    expect(() => {
      CostAllocationEngine.validateAllocations(invoiceLineAmount, invalidAllocations);
    }).toThrow(/COST_ALLOCATION_EXCEEDS_INVOICE_LINE/);
  });

  // ---------------------------------------------------------------------------
  // AT-071: Multi-currency consistency enforcement
  // ---------------------------------------------------------------------------
  it('AT-071: Disallows silent mixing of different currencies into QAR basis without approved FX conversion rate', () => {
    const items = [
      { amount: new Money('10000', 'QAR'), description: 'Local Transport' },
      { amount: new Money('5000', 'USD'), description: 'Audio Specialist Overseas Fee' },
    ];

    expect(() => {
      MultiCurrencyValidator.assertConsistentCurrency('QAR', items);
    }).toThrow(/MIXED_CURRENCY_DISCREPANCY/);
  });

  // ---------------------------------------------------------------------------
  // AT-072: Client Results Room server-side redaction security gate
  // ---------------------------------------------------------------------------
  it('AT-072: Client Results Room strictly redacts buy rates, contractor markups, internal labor margins, and internal incidents server-side', () => {
    const rawData: ClientResultsRoomData = {
      projectId,
      projectName: 'Qatar National Day 2026 Ceremonial Pavilion',
      eventDates: { start: '2026-08-20', end: '2026-08-22' },
      venueName: 'Doha Corniche Ceremonial Plaza, Zone A',
      deliveredScope: [
        {
          id: 'SC-01',
          name: 'Main Architectural Pavilion Arch',
          category: 'structural',
          description: 'Dual-cantilever steel structure with parametric canopy',
          quantity: 1,
          unit: 'structure',
          status: 'delivered',
          completionDate: '2026-08-15',
          buyRate: 145000,
          internalMargin: 0.35,
          supplierName: 'Al Rayyan Structural Steel',
        },
      ],
      attendanceMetrics: {
        totalAttendance: 48500,
        vipAttendance: 1200,
        peakOccupancyTime: '2026-08-22 19:45:00',
        accessPacePerHour: 4200,
        turnstileScanCount: 48500,
      },
      executiveHighlights: [
        { id: 'HL-01', title: 'Opening Ceremony', description: 'Flawless execution', category: 'opening', timestamp: '2026-08-22T16:00:00Z' },
      ],
      curatedPhotos: [{ url: '/photo.jpg', caption: 'Sunset Pavilion', zone: 'Zone A' }],
      internalIncidents: [{ id: 'INC-01', detail: 'Secret generator valve issue' }],
      contractorMarkups: [{ markup: '35%' }],
    };

    const redacted = ClientResultsEngine.buildRedactedResultsRoom(rawData);

    // Verify sanitized scope does not have buyRate, internalMargin, or supplierName
    expect((redacted.deliveredScope[0] as any).buyRate).toBeUndefined();
    expect((redacted.deliveredScope[0] as any).internalMargin).toBeUndefined();
    expect((redacted.deliveredScope[0] as any).supplierName).toBeUndefined();

    // Verify internalIncidents and contractorMarkups are completely stripped
    expect((redacted as any).internalIncidents).toBeUndefined();
    expect((redacted as any).contractorMarkups).toBeUndefined();

    // Verify zero sensitive leaks check passes
    const zeroLeaks = ClientResultsEngine.verifyZeroSensitiveLeaks(redacted);
    expect(zeroLeaks).toBe(true);
    expect(redacted.serverRedactionVerified).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // AT-073: Commercial Closeout 10-dimension checklist and cryptographic seal
  // ---------------------------------------------------------------------------
  it('AT-073: Evaluates 10-dimension commercial closeout; computes final P&L and immutable SHA-256 seal', () => {
    const completeChecklist: CommercialCloseoutChecklist = {
      posFullyInvoicedOrDecommitted: true,
      supplierInvoicesSettled: true,
      clientMilestonesBilled: true,
      openReceivablesManaged: true,
      retentionScheduleConfirmed: true,
      expenseClaimsSettled: true,
      variationsConcluded: true,
      costAllocationsConfirmed: true,
      finalPandLAudited: true,
      executiveSignoffSealed: true,
    };

    const result = CommercialCloseoutEngine.evaluateCloseout({
      projectId,
      currency: 'QAR',
      checklist: completeChecklist,
      finalRevenue: '2450000',
      finalActualCost: '1800000',
      signedBy: 'Hamad Al-Kuwari (Finance Director)',
    });

    expect(result.isCommerciallyClosed).toBe(true);
    expect(result.decision).toBe('commercially_closed');
    expect(result.unmetPillars.length).toBe(0);
    expect(result.finalProfit.toDisplayString()).toBe('650000.00');
    expect(result.finalGrossMarginPercent).toBe('26.53%');
    expect(result.auditHash).toBeDefined();
    expect(result.auditHash.length).toBe(64); // SHA-256 length

    // Partial checklist results in conditional or rejected
    const incompleteChecklist = { ...completeChecklist, posFullyInvoicedOrDecommitted: false, variationsConcluded: false };
    const incompleteResult = CommercialCloseoutEngine.evaluateCloseout({
      projectId,
      currency: 'QAR',
      checklist: incompleteChecklist,
      finalRevenue: '2450000',
      finalActualCost: '1800000',
      signedBy: 'Hamad Al-Kuwari',
    });

    expect(incompleteResult.isCommerciallyClosed).toBe(false);
    expect(incompleteResult.decision).toBe('conditional_closure');
    expect(incompleteResult.unmetPillars.length).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // AT-074: Real-time Cash Position & Working Capital
  // ---------------------------------------------------------------------------
  it('AT-074: Calculates net cash flow, receivables and exposure accurately across billed and collected states', () => {
    const cash = FinancialCalculator.calculateCashPosition({
      currency: 'QAR',
      contractValue: '2450000',
      billedAmount: '1960000', // 80%
      collectedAmount: '1715000', // 70%
      postedActualCost: '1180000',
      remainingCommitments: '350000',
    });

    expect(cash.receivablesAmount.toDisplayString()).toBe('245000.00'); // 1,960k - 1,715k
    expect(cash.unbilledContractAmount.toDisplayString()).toBe('490000.00'); // 2,450k - 1,960k
    expect(cash.netCashFlow.toDisplayString()).toBe('535000.00'); // 1,715k collected - 1,180k actual cost
    expect(cash.netCashExposure.toDisplayString()).toBe('185000.00'); // 1,715k - (1,180k + 350k commitments)
  });

  // ---------------------------------------------------------------------------
  // AT-075: Margin Bridge Waterfall Calculation
  // ---------------------------------------------------------------------------
  it('AT-075: Traces margin bridge from tender contract to final forecast completion', () => {
    const bridge = FinancialCalculator.calculateMarginBridge({
      currency: 'QAR',
      tenderRevenue: '2300000',
      tenderCost: '1850000',
      variationsApprovedRevenue: '150000',
      variationsApprovedCost: '100000',
      costOverrunsOrSavings: '-150000', // 150k procurement savings
    });

    expect(bridge.tenderMargin.toDisplayString()).toBe('450000.00');
    expect(bridge.tenderMarginPercent).toBe('19.57%');
    expect(bridge.variationMargin.toDisplayString()).toBe('50000.00');
    expect(bridge.currentBudgetMargin.toDisplayString()).toBe('500000.00');
    expect(bridge.finalForecastRevenue.toDisplayString()).toBe('2450000.00');
    expect(bridge.finalForecastCost.toDisplayString()).toBe('1800000.00');
    expect(bridge.finalForecastMargin.toDisplayString()).toBe('650000.00');
    expect(bridge.finalForecastMarginPercent).toBe('26.53%');
  });

  // ---------------------------------------------------------------------------
  // AT-076: Enterprise Integration Reconciliation Engine
  // ---------------------------------------------------------------------------
  it('AT-076: Detects external ERP invoice amount mismatch and requires audit justification for resolution', () => {
    const external = {
      id: 'EXT-INV-01',
      connectorType: 'erp_accounting',
      entityType: 'supplier_invoice',
      externalId: 'ERP-AP-9921',
      externalAmount: 125000,
      externalTimestamp: '2026-08-20T10:00:00Z',
      rawPayload: { invoiceNumber: 'INV-GAV-1092', amount: 125000 },
    };

    const eos = {
      id: 'EOS-INV-01',
      entityType: 'supplier_invoice',
      eosId: 'INV-SUP-003',
      eosAmount: 120000,
      status: 'under_review',
    };

    const recResult = IntegrationReconciliationEngine.reconcileRecord(external, eos);
    expect(recResult.isMatched).toBe(false);
    expect(recResult.mismatchType).toBe('amount_mismatch');
    expect(recResult.varianceAmount).toBe(5000);
    expect(recResult.suggestedAction).toBe('override_with_eos');

    // Resolving without justification throws error
    expect(() => {
      IntegrationReconciliationEngine.resolveException('REC-001', 'override_with_eos', '', 'Hamad K.');
    }).toThrow(/RECONCILIATION_JUSTIFICATION_REQUIRED/);

    // Resolving with valid justification succeeds
    const resolved = IntegrationReconciliationEngine.resolveException(
      'REC-001',
      'override_with_eos',
      'Agreed contract price in PO-QND-003 is authoritative 120,000 QAR.',
      'Hamad K.'
    );
    expect(resolved.status).toBe('resolved');
    expect(resolved.action).toBe('override_with_eos');
  });

  // ---------------------------------------------------------------------------
  // AT-077: KPI Performance & Vendor Scorecard Engine
  // ---------------------------------------------------------------------------
  it('AT-077: Evaluates project KPIs and composite vendor performance scorecards', () => {
    const kpi = KpiPerformanceEngine.evaluateKpi({
      kpiCode: 'KPI-TIME-01',
      name: 'On-Time Opening Milestone',
      targetValue: 100,
      actualValue: 100,
      unit: '%',
      comparison: 'greater_than_or_equal',
    });
    expect(kpi.status).toBe('met');
    expect(kpi.achievementPercent).toBe(100);

    const vendorScore = KpiPerformanceEngine.scoreVendor({
      vendorId: 'VND-RAYYAN-STEEL',
      vendorName: 'Al Rayyan Structural Steel Co.',
      priceScore: 90,
      qualityScore: 95,
      deliveryScore: 92,
      responsivenessScore: 88,
      hseScore: 96,
    });
    expect(vendorScore.averageScore).toBe(92.2);
    expect(vendorScore.letterGrade).toBe('A');
    expect(vendorScore.isRecommended).toBe(true);
  });
});
