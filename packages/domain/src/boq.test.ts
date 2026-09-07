import { describe, it, expect } from 'vitest';
import { Decimal } from 'decimal.js';
import {
  BOQCalculator,
  UnitConverter,
  BOQLineInput,
  VariationLedger,
  VariationData,
  DesignReleaseEngine,
  CertificateValidator,
  ClientPortalManager,
  PublicationData,
} from './index.js';
import { Money } from './money.js';

describe('AT-037: Estimate Hourly/Shift Units and Lump-Sum Breakdown', () => {
  it('converts hourly rates to standard shift rates explicitly', () => {
    // 150 QAR/hr * 10 hrs/shift = 1,500 QAR/shift
    const shiftRate = UnitConverter.hourlyToShift('150', '10');
    expect(shiftRate.toString()).toBe('1500');

    // 1,200 QAR/shift / 8 hrs/shift = 150 QAR/hr
    const hourlyRate = UnitConverter.shiftToHourly('1200', '8');
    expect(hourlyRate.toString()).toBe('150');
  });

  it('decomposes lump-sum line into sub-packages without duplicating or multiplying parent total', () => {
    const parentLumpSum: BOQLineInput = {
      id: 'parent-ls-1',
      lineCode: 'LS-01',
      description: 'Turnkey Main Stage Production Package',
      quantity: 1,
      uom: 'lump_sum',
      unitCost: '60000',
      unitSell: '100000', // 100,000 QAR parent lump sum
      isLumpSum: true,
    };

    const childLines: BOQLineInput[] = [
      {
        id: 'child-01',
        lineCode: 'LS-01.1',
        description: 'Staging & Truss Structure',
        quantity: 1,
        uom: 'lump_sum',
        unitCost: '25000',
        unitSell: '40000',
        allocatedLumpSumPortion: '40000',
        parentLineId: 'parent-ls-1',
      },
      {
        id: 'child-02',
        lineCode: 'LS-01.2',
        description: 'Intelligent Lighting Rig',
        quantity: 1,
        uom: 'lump_sum',
        unitCost: '20000',
        unitSell: '35000',
        allocatedLumpSumPortion: '35000',
        parentLineId: 'parent-ls-1',
      },
      {
        id: 'child-03',
        lineCode: 'LS-01.3',
        description: 'Line Array Audio System',
        quantity: 1,
        uom: 'lump_sum',
        unitCost: '15000',
        unitSell: '25000',
        allocatedLumpSumPortion: '25000',
        parentLineId: 'parent-ls-1',
      },
    ];

    const validation = BOQCalculator.validateLumpSumDecomposition(parentLumpSum, childLines, 'QAR');
    expect(validation.isFullyAllocated).toBe(true);
    expect(validation.parentLumpSumSell.toString()).toBe('100000.000000');
    expect(validation.childrenAllocatedSell.toString()).toBe('100000.000000');

    // When calculating total estimate with parent and breakdown children,
    // the lump-sum total is counted once (100,000 QAR), NOT doubled to 200,000 QAR or 300,000 QAR!
    const summary = BOQCalculator.calculateEstimate([parentLumpSum, ...childLines], 'QAR');
    expect(summary.totalSell.toString()).toBe('100000.000000');
    expect(summary.totalCost.toString()).toBe('60000.000000');
  });

  it('rejects lump-sum decomposition if child allocations exceed parent amount', () => {
    const parentLumpSum: BOQLineInput = {
      id: 'parent-ls-2',
      lineCode: 'LS-02',
      description: 'VIP Lounge Setup',
      quantity: 1,
      uom: 'lump_sum',
      unitCost: '30000',
      unitSell: '50000',
      isLumpSum: true,
    };

    const excessiveChildLines: BOQLineInput[] = [
      {
        id: 'child-ex-1',
        lineCode: 'LS-02.1',
        description: 'Custom Carpentry',
        quantity: 1,
        uom: 'lump_sum',
        unitCost: '20000',
        unitSell: '35000',
        allocatedLumpSumPortion: '35000',
        parentLineId: 'parent-ls-2',
      },
      {
        id: 'child-ex-2',
        lineCode: 'LS-02.2',
        description: 'Luxury Furnishings',
        quantity: 1,
        uom: 'lump_sum',
        unitCost: '20000',
        unitSell: '25000',
        allocatedLumpSumPortion: '25000', // 35k + 25k = 60k > 50k
        parentLineId: 'parent-ls-2',
      },
    ];

    expect(() => {
      BOQCalculator.validateLumpSumDecomposition(parentLumpSum, excessiveChildLines, 'QAR');
    }).toThrow(/exceeds parent lump sum/);
  });
});

describe('AT-038: BOQ Fee, Tax, Discount, and Rounding Scenarios', () => {
  it('calculates exact decimal figures through discount, management fee, and tax basis', () => {
    const lines: BOQLineInput[] = [
      {
        id: 'l1',
        lineCode: 'ITEM-1',
        description: 'LED Video Wall (6x4m)',
        quantity: 2,
        uom: 'unit',
        unitCost: '10000',
        unitSell: '15000', // Gross Sell = 30,000 QAR
        durationMultiplier: 1,
      },
      {
        id: 'l2',
        lineCode: 'ITEM-2',
        description: 'Technical Crew Operations',
        quantity: 4,
        uom: 'shift',
        unitCost: '1200',
        unitSell: '2000', // Gross Sell = 8,000 QAR
        durationMultiplier: 1,
      },
    ];

    // Total Line Gross Sell = 30,000 + 8,000 = 38,000 QAR
    // Total Line Cost = 20,000 + 4,800 = 24,800 QAR
    // 5% Overall Discount = 38,000 * 0.05 = 1,900 QAR
    // Discounted Subtotal = 36,100 QAR
    // 10% Management Fee = 36,100 * 0.10 = 3,610 QAR
    // Taxable Base = 36,100 + 3,610 = 39,710 QAR
    // 5% Tax (VAT) = 39,710 * 0.05 = 1,985.50 QAR
    // Grand Total Sell = 39,710 + 1,985.50 = 41,695.50 QAR

    const result = BOQCalculator.calculateEstimate(lines, 'QAR', {
      overallDiscountPercent: '5',
      overallFeePercent: '10',
      defaultTaxRate: '0.05',
    });

    expect(result.subtotalCost.toString()).toBe('24800.000000');
    expect(result.subtotalSell.toString()).toBe('38000.000000');
    expect(result.discountAmount.toString()).toBe('1900.000000');
    expect(result.discountedSell.toString()).toBe('36100.000000');
    expect(result.feeAmount.toString()).toBe('3610.000000');
    expect(result.taxableBase.toString()).toBe('39710.000000');
    expect(result.taxAmount.toString()).toBe('1985.500000');
    expect(result.totalSell.toString()).toBe('41695.500000');
    expect(result.grossProfit.toString()).toBe('16895.500000'); // 41,695.50 - 24,800
  });
});

describe('AT-039: Margin Confused with Markup or Zero Revenue', () => {
  it('distinguishes margin from markup correctly', () => {
    // Cost = 80, Sell = 100
    // Profit = 20
    // Markup = Profit / Cost = 20 / 80 = 25%
    // Margin = Profit / Revenue = 20 / 100 = 20%
    const metrics = BOQCalculator.calculateProfitMetrics('80', '100');
    expect(metrics.grossProfit.toString()).toBe('20');
    expect((metrics.markupPercent as Decimal).toString()).toBe('25');
    expect((metrics.marginPercent as Decimal).toString()).toBe('20');
  });

  it('safely handles zero revenue returning not_applicable rather than division by zero or fake zero', () => {
    // Cost = 50, Sell = 0 (e.g. internal/unbilled work)
    const metricsZeroRev = BOQCalculator.calculateProfitMetrics('50', '0');
    expect(metricsZeroRev.grossProfit.toString()).toBe('-50');
    expect(metricsZeroRev.marginPercent).toBe('not_applicable');
    expect((metricsZeroRev.markupPercent as Decimal).toString()).toBe('-100');
  });

  it('safely handles zero cost returning not_applicable for markup', () => {
    // Cost = 0, Sell = 100 (pure margin / sponsored item)
    const metricsZeroCost = BOQCalculator.calculateProfitMetrics('0', '100');
    expect(metricsZeroCost.grossProfit.toString()).toBe('100');
    expect(metricsZeroCost.markupPercent).toBe('not_applicable');
    expect((metricsZeroCost.marginPercent as Decimal).toString()).toBe('100');
  });
});

describe('AT-040: Proposed Change Not Client Authorised', () => {
  it('keeps pending variation exposure strictly separate from approved baseline', () => {
    const approvedContract = new Money('200000', 'QAR');
    const approvedBudget = new Money('140000', 'QAR');

    const variations: VariationData[] = [
      {
        id: 'var-1',
        projectId: 'prj-100',
        variationCode: 'VAR-001',
        title: 'Additional VIP Hospitality Tent',
        scopeDescription: 'Construct extra 200sqm air-conditioned tent',
        costImpact: new Money('30000', 'QAR'),
        sellImpact: new Money('45000', 'QAR'),
        timeImpactDays: 3,
        status: 'submitted_to_client', // Pending client sign-off
      },
      {
        id: 'var-2',
        projectId: 'prj-100',
        variationCode: 'VAR-002',
        title: 'Upgraded Stage FX Pyro',
        scopeDescription: 'Add cold spark machines',
        costImpact: new Money('10000', 'QAR'),
        sellImpact: new Money('15000', 'QAR'),
        timeImpactDays: 0,
        status: 'client_approved', // Client signed off
      },
    ];

    const financials = VariationLedger.calculateFinancials('QAR', approvedContract, approvedBudget, variations);

    // Invariant (AT-040):
    // Approved Contract includes ONLY formally approved variations: 200,000 + 15,000 = 215,000 QAR
    // Approved Budget includes ONLY formally approved variations: 140,000 + 10,000 = 150,000 QAR
    expect(financials.approvedContractValue.toString()).toBe('215000.000000');
    expect(financials.approvedCostBudget.toString()).toBe('150000.000000');

    // Pending exposure tracks unapproved VAR-001: 45,000 sell / 30,000 cost
    expect(financials.pendingExposureSell.toString()).toBe('45000.000000');
    expect(financials.pendingExposureCost.toString()).toBe('30000.000000');

    // Total forecast includes both approved and pending exposure
    expect(financials.totalForecastSell.toString()).toBe('260000.000000');
    expect(financials.totalForecastCost.toString()).toBe('180000.000000');
  });
});

describe('AT-032: Modification Post-Approval Supersedes Prior Decision Hash', () => {
  it('detects material change after approval and rejects execution with stale hash', () => {
    const originalPoData = {
      poNumber: 'PO-2026-001',
      supplierId: 'supp-av-01',
      totalAmount: '50000',
      currency: 'QAR',
      items: [{ item: 'LED Panels', qty: 20 }],
    };

    const approvedHash = VariationLedger.computeContentHash(originalPoData);
    const approvedSnapshot = {
      targetId: 'po-1',
      targetType: 'purchase_order' as const,
      contentHash: approvedHash,
      approvedAt: new Date('2026-09-01T10:00:00Z'),
      approverId: 'usr-fin-lead',
      status: 'active' as const,
    };

    // Execution with unmodified data succeeds
    expect(() => {
      VariationLedger.validateExecutionAuthority(originalPoData, approvedSnapshot, approvedHash);
    }).not.toThrow();

    // Modification: supplier changes price to 55,000 QAR
    const modifiedPoData = {
      ...originalPoData,
      totalAmount: '55000',
    };

    // Attempting execution with stale approval hash must be rejected
    expect(() => {
      VariationLedger.validateExecutionAuthority(modifiedPoData, approvedSnapshot, approvedHash);
    }).toThrow(/EXECUTION_DENIED_APPROVAL_SUPERSEDED/);
  });
});

describe('AT-033: Certificate Issued After Activity Reflects Actual Issuance Date', () => {
  it('records actual issue timestamp and prevents presentation as pre-existing', () => {
    const activityDate = new Date('2026-08-10T14:00:00Z'); // Activity happened Aug 10
    const issueDate = new Date('2026-08-15T09:00:00Z'); // Certificate issued Aug 15

    const cert = CertificateValidator.createCertificate({
      certificateId: 'cert-safety-01',
      projectId: 'prj-safety-01',
      activityType: 'rigging_load_test',
      activityPerformedAt: activityDate,
      issuedAt: issueDate,
      issuerId: 'usr-structural-eng',
    });

    expect(cert.activityPerformedAt).toEqual(activityDate);
    expect(cert.issuedAt).toEqual(issueDate);

    // On Aug 12 (between activity and issuance), the certificate was NOT effective / did not exist
    const checkBeforeIssue = new Date('2026-08-12T00:00:00Z');
    expect(CertificateValidator.isCertificateEffectiveAt(cert, checkBeforeIssue)).toBe(false);

    // On Aug 16 (after issuance), the certificate is effective
    const checkAfterIssue = new Date('2026-08-16T00:00:00Z');
    expect(CertificateValidator.isCertificateEffectiveAt(cert, checkAfterIssue)).toBe(true);
  });
});

describe('AT-034: New Drawing Revision Has No Inherited Fabrication Approval', () => {
  it('decouples new revision from earlier fabrication approval', () => {
    const v1 = {
      versionId: 'ver-des-1-v1',
      designId: 'des-stage-01',
      versionNumber: 1,
      contentHash: 'hash-v1-bytes',
      storageKey: 'designs/stage-v1.dwg',
      title: 'Main Stage Rigging Layout',
      uploadedAt: new Date('2026-08-01T10:00:00Z'),
      uploadedBy: 'usr-cad-designer',
      fabricationApproval: {
        approvedAt: new Date('2026-08-05T12:00:00Z'),
        approvedBy: 'usr-prod-head',
        approvalHash: 'app-hash-v1',
      },
    };

    // v1 is approved for fabrication
    expect(() => DesignReleaseEngine.verifyFabricationRelease(v1)).not.toThrow();

    // v2 is uploaded internally
    const v2 = DesignReleaseEngine.createRevision(
      v1,
      2,
      'new-dwg-file-bytes-v2',
      'designs/stage-v2.dwg',
      'usr-cad-designer'
    );

    expect(v2.versionNumber).toBe(2);
    expect(v2.fabricationApproval).toBeUndefined(); // Invariant AT-034: Not inherited!

    // v2 cannot be released for fabrication without new approval
    expect(() => DesignReleaseEngine.verifyFabricationRelease(v2)).toThrow(
      /FABRICATION_RELEASE_DENIED/
    );
  });
});

describe('AT-041 & AT-042: Truthful Native Decision & Arabic Accessibility', () => {
  it('truthfully labels client decision as native portal confirmation, not government digital signature', () => {
    const pub: PublicationData = {
      id: 'pub-comm-01',
      projectId: 'prj-01',
      clientOrganisationId: 'client-ministry-01',
      roomType: 'commercial',
      title: 'Festival Stage Sell Proposal v1',
      targetVersionId: 'prop-v1',
      targetHash: 'hash-1234567890abcdef',
      projectionPayload: { totalSell: '150000' },
      status: 'published',
      publishedAt: new Date(),
    };

    const decision = ClientPortalManager.recordClientDecision({
      publication: pub,
      clientOrgId: 'client-ministry-01',
      clientUserId: 'usr-client-exec',
      clientUserName: 'Sheikh Mohammed',
      clientUserEmail: 'mohammed@client.qa',
      decision: 'accepted',
      suppliedTargetHash: 'hash-1234567890abcdef',
      comment: 'Approved as per agreed event scope',
    });

    expect(decision.acceptanceClassification).toBe('native_portal_decision');
    expect(decision.legalNotice).toContain('internal native portal confirmation');
    expect(decision.legalNotice).toContain('does not claim this constitutes a government-qualified electronic signature');
  });

  it('provides RTL layout direction and non-color-only status indicators', () => {
    const metadataAr = ClientPortalManager.getAccessibilityMetadata('ar', 'accepted');
    expect(metadataAr.direction).toBe('rtl');
    expect(metadataAr.locale).toBe('ar');
    expect(metadataAr.statusIndicator.label).toBe('تمت الموافقة');
    expect(metadataAr.statusIndicator.usesColorOnly).toBe(false);
    expect(metadataAr.statusIndicator.icon).toBe('check-circle-icon');

    const metadataEn = ClientPortalManager.getAccessibilityMetadata('en', 'rejected');
    expect(metadataEn.direction).toBe('ltr');
    expect(metadataEn.statusIndicator.label).toBe('Rejected');
    expect(metadataEn.statusIndicator.usesColorOnly).toBe(false);
  });
});
