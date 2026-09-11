import { describe, it, expect } from 'vitest';
import {
  ProcurementEngine,
  ProductionEngine,
  ProcurementRequirement,
  RFQ,
  VendorQuote,
  PurchaseOrder,
  ProductionPackage,
  QualityInspection,
  SnagRecord,
  Money,
} from '@e3-eos/domain';

describe('Sprint 03 — Procurement, RFQ & Production Fabrication Suite', () => {
  const projectId = 'a1111111-1111-4111-8111-111111111111';

  describe('1. Procurement Requirement & Dual-Source Decision Logic', () => {
    it('creates procurement requirement linked to BOQ line with dual-source decision attributes', () => {
      const requirement: ProcurementRequirement = {
        id: 'req-fee-proc-01',
        projectId,
        source: 'boq_line',
        boqLineId: '00000000-0000-4000-e000-000000000001',
        description: 'Provide 30 branded registration counters for Hall 1 entry portal',
        category: 'Staging & Fabrication',
        quantity: 30,
        unit: 'units',
        requiredOnSiteDate: new Date('2026-10-15T08:00:00Z'),
        procurementLeadTimeDays: 10,
        requiredDeliveryLocation: 'DECC Exhibition Hall 1',
        estimatedCost: new Money(66000, 'QAR'),
        approvedBudget: new Money(70000, 'QAR'),
        status: 'approved_to_source',
        priority: 'high',
        sourceDecision: 'use_e3_asset',
        internalAssetQuantity: 8,
        externalSourcingQuantity: 22,
      };

      expect(requirement.quantity).toBe(30);
      expect(requirement.internalAssetQuantity).toBe(8);
      expect(requirement.externalSourcingQuantity).toBe(22);
      expect(requirement.internalAssetQuantity + requirement.externalSourcingQuantity).toBe(requirement.quantity);
      expect(requirement.estimatedCost.lessThan(requirement.approvedBudget)).toBe(true);
    });
  });

  describe('2. Multi-Criteria 3-Way RFQ Evaluation Matrix', () => {
    const rfq: RFQ = {
      id: 'rfq-fee-2026-001',
      rfqNumber: 'RFQ-FEE-2026-001',
      projectId,
      procurementRequirementId: 'req-fee-proc-01',
      issueDate: new Date('2026-09-01T00:00:00Z'),
      closingDate: new Date('2026-09-05T00:00:00Z'),
      invitedVendorIds: ['ven-abc-01', 'ven-qs-02', 'ven-ge-03'],
      technicalSpecification: 'Fabrication of 22 modular branded registration counters',
      quantity: 22,
      deliveryRequirement: 'Direct site delivery to DECC Hall 1',
      attachments: [],
      status: 'closed',
    };

    const quotes: VendorQuote[] = [
      {
        id: 'quote-abc-001',
        rfqId: rfq.id,
        vendorId: 'ven-abc-01',
        quoteReference: 'QT-ABC-2026-88',
        unitRate: new Money(3000, 'QAR'),
        totalPrice: new Money(66000, 'QAR'),
        deliveryTimeDays: 10,
        paymentTerms: '30 Days Net',
        warranty: '12 Months',
        technicalCompliance: '100% Compliant',
        validityDays: 60,
        attachments: [],
        technicalScore: 95,
        commercialScore: 95,
        riskScore: 92,
      },
      {
        id: 'quote-qs-002',
        rfqId: rfq.id,
        vendorId: 'ven-qs-02',
        quoteReference: 'QT-QS-2026-104',
        unitRate: new Money(3250, 'QAR'),
        totalPrice: new Money(71500, 'QAR'),
        deliveryTimeDays: 14,
        paymentTerms: '30 Days Net',
        warranty: '12 Months',
        technicalCompliance: '100% Compliant',
        validityDays: 60,
        attachments: [],
        technicalScore: 90,
        commercialScore: 85,
        riskScore: 85,
      },
      {
        id: 'quote-ge-003',
        rfqId: rfq.id,
        vendorId: 'ven-ge-03',
        quoteReference: 'QT-GE-2026-302',
        unitRate: new Money(3400, 'QAR'),
        totalPrice: new Money(74800, 'QAR'),
        deliveryTimeDays: 18,
        paymentTerms: '50% Advance',
        warranty: '6 Months',
        technicalCompliance: 'Minor exclusions',
        validityDays: 30,
        attachments: [],
        technicalScore: 85,
        commercialScore: 80,
        riskScore: 75,
      },
    ];

    it('evaluates quotes objectively and recommends highest composite scoring bidder', () => {
      const evaluation = ProcurementEngine.evaluateBids(rfq, quotes);

      expect(evaluation.quotesEvaluated).toBe(3);
      expect(evaluation.recommendedVendorId).toBe('ven-abc-01');
      expect(evaluation.recommendedQuoteId).toBe('quote-abc-001');
      expect(evaluation.evaluations[0].recommended).toBe(true);
      expect(evaluation.evaluations[0].compositeScore).toBeGreaterThan(evaluation.evaluations[1].compositeScore);
      expect(evaluation.awardRationale).toContain('ven-abc-01');
    });
  });

  describe('3. Purchase Order Committed Cost Aggregation & EAC Integration', () => {
    it('aggregates committed cost from released and approved POs in matching currency', () => {
      const po1: PurchaseOrder = {
        id: 'po-01',
        poNumber: 'PO-QND26-0045',
        projectId,
        vendorId: 'ven-abc-01',
        currency: 'QAR',
        totalAmount: new Money(66000, 'QAR'),
        status: 'released',
        lines: [
          {
            id: 'pol-1',
            poId: 'po-01',
            description: 'Fabrication of 22 modular counters',
            quantity: 22,
            unitCost: new Money(3000, 'QAR'),
            totalCost: new Money(66000, 'QAR'),
          },
        ],
        issuedAt: new Date(),
        issuedBy: 'Rashid Al-Hajri',
        metadata: {},
      };

      const po2Draft: PurchaseOrder = {
        id: 'po-02',
        poNumber: 'PO-DRAFT-999',
        projectId,
        vendorId: 'ven-qs-02',
        currency: 'QAR',
        totalAmount: new Money(15000, 'QAR'),
        status: 'draft', // Not committed yet
        lines: [],
        issuedAt: new Date(),
        issuedBy: 'Rashid Al-Hajri',
        metadata: {},
      };

      const committedTotal = ProcurementEngine.aggregateCommittedCost([po1, po2Draft], 'QAR');

      // Draft PO must NOT be included in committed cost
      expect(committedTotal.amount.toNumber()).toBe(66000);
      expect(committedTotal.currency).toBe('QAR');
    });

    it('throws when aggregating POs with mismatched currency', () => {
      const poUsd: PurchaseOrder = {
        id: 'po-usd',
        poNumber: 'PO-USD-001',
        projectId,
        vendorId: 'ven-intl',
        currency: 'USD',
        totalAmount: new Money(10000, 'USD'),
        status: 'approved',
        lines: [],
        issuedAt: new Date(),
        issuedBy: 'Rashid Al-Hajri',
        metadata: {},
      };

      expect(() => ProcurementEngine.aggregateCommittedCost([poUsd], 'QAR')).toThrow('CURRENCY_MISMATCH');
    });
  });

  describe('4. Fabrication Release Gate Enforcement', () => {
    it('blocks fabrication release if technical design or commercial commitment is unmet', () => {
      const releaseGate = ProductionEngine.evaluateFabricationRelease({
        designApproved: false, // Incomplete design drawing
        commercialApproved: true,
        safetyApproved: true,
        vendorAwarded: true,
        approvedBy: 'Karim Haddad',
      });

      expect(releaseGate.canRelease).toBe(false);
      expect(releaseGate.unmetConditions).toContain('Design package not approved for fabrication');
    });

    it('approves fabrication release when all four release prerequisites are verified', () => {
      const releaseGate = ProductionEngine.evaluateFabricationRelease({
        designApproved: true,
        commercialApproved: true,
        safetyApproved: true,
        vendorAwarded: true,
        approvedBy: 'Karim Haddad',
      });

      expect(releaseGate.canRelease).toBe(true);
      expect(releaseGate.unmetConditions).toHaveLength(0);
      expect(releaseGate.approvedBy).toBe('Karim Haddad');
    });
  });

  describe('5. Production Package State Machine & Snagging Dispatch Blocker', () => {
    const pkg: ProductionPackage = {
      id: 'pkg-fee-reg-01',
      packageCode: 'PKG-FEE-REG-01',
      projectId,
      vendorId: 'ven-abc-01',
      title: 'Fabrication of 22 Modular Registration Counters',
      quantity: 22,
      completedQuantity: 22,
      material: 'HDF Melamine & Aluminium Frame',
      productionOwnerId: 'usr-karim-004',
      startDate: new Date('2026-09-02'),
      requiredCompletionDate: new Date('2026-09-12'),
      deliveryDate: new Date('2026-09-12'),
      status: 'approved_for_production',
      images: [],
      documents: [],
      boqLineIds: ['00000000-0000-4000-e000-000000000001'],
    };

    it('advances production package through valid state transitions', () => {
      const pkgInFab = ProductionEngine.transitionPackageStatus(pkg, 'fabrication');
      expect(pkgInFab.status).toBe('fabrication');

      const pkgInQc = ProductionEngine.transitionPackageStatus(pkgInFab, 'qc_inspection');
      expect(pkgInQc.status).toBe('qc_inspection');
    });

    it('blocks dispatch when an unresolved critical snag exists on the package', () => {
      const criticalSnag: SnagRecord = {
        id: 'snag-crit-01',
        projectId,
        packageId: pkg.id,
        title: 'Structural frame weld fracture on Counter #04',
        severity: 'critical',
        status: 'open',
        blocksDispatch: true,
        blocksReadiness: true,
        createdAt: new Date(),
      };

      const dispatchCheck = ProductionEngine.validateDispatchReadiness(pkg, [criticalSnag]);
      expect(dispatchCheck.canDispatch).toBe(false);
      expect(dispatchCheck.blockingSnags.length).toBeGreaterThan(0);
      expect(() =>
        ProductionEngine.transitionPackageStatus(pkg, 'ready_for_dispatch', [criticalSnag])
      ).toThrow('DISPATCH_BLOCKED_BY_CRITICAL_SNAGS');
    });

    it('allows dispatch once the critical snag is formally resolved and verified', () => {
      const criticalSnag: SnagRecord = {
        id: 'snag-crit-01',
        projectId,
        packageId: pkg.id,
        title: 'Structural frame weld fracture on Counter #04',
        severity: 'critical',
        status: 'open',
        blocksDispatch: true,
        blocksReadiness: true,
        createdAt: new Date(),
      };

      const resolvedSnag = ProductionEngine.transitionSnagStatus(
        criticalSnag,
        'resolved',
        'Re-welded, reinforced with gusset plate, re-inspected and passed QA'
      );

      const dispatchCheck = ProductionEngine.validateDispatchReadiness(pkg, [resolvedSnag]);
      expect(dispatchCheck.canDispatch).toBe(true);
      expect(dispatchCheck.blockingSnags).toHaveLength(0);

      const readyPkg = ProductionEngine.transitionPackageStatus(pkg, 'ready_for_dispatch', [resolvedSnag]);
      expect(readyPkg.status).toBe('ready_for_dispatch');
    });
  });
});
