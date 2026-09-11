import { describe, it, expect } from 'vitest';
import {
  ProcurementEngine,
  ProductionEngine,
  AssetAllocationEngine,
  LogisticsEngine,
  CrewConflictDetector,
  DailySiteReportEngine,
  InstallationTracker,
  ComprehensiveReadinessEvaluator,
  Money,
  ProcurementRequirement,
  RFQ,
  VendorQuote,
  PurchaseOrder,
  ProductionPackage,
  Asset,
  AssetAllocation,
  PackingList,
  CrewAssignment,
  InstallationItem,
  DimensionReadinessCheck,
} from '@e3-eos/domain';

describe('Sprint 03 — End-to-End Physical Delivery Acceptance Journey', () => {
  const projectId = 'a1111111-1111-4111-8111-111111111111'; // PRJ-2026-FEE-01

  it('executes the complete 13-stage physical delivery chain with 100% operational readiness', () => {
    // -------------------------------------------------------------------------
    // STAGE 1: Contract Requirement
    // -------------------------------------------------------------------------
    const requirement: ProcurementRequirement = {
      id: 'req-fee-001',
      projectId,
      source: 'boq_line',
      boqLineId: 'boq-reg-001',
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
    expect(requirement.approvedBudget.amount.toNumber()).toBe(70000);

    // -------------------------------------------------------------------------
    // STAGE 2: Approved Technical Design
    // -------------------------------------------------------------------------
    const approvedDesignRevisionId = 'des-fee-reg-001-rev02';
    expect(approvedDesignRevisionId).toBeDefined();

    // -------------------------------------------------------------------------
    // STAGE 3: BOQ Baseline & Budget Verification
    // -------------------------------------------------------------------------
    const boqBudgetQar = 70000;
    expect(boqBudgetQar).toBeGreaterThanOrEqual(requirement.estimatedCost.amount.toNumber());

    // -------------------------------------------------------------------------
    // STAGE 4: Dual-Source Decision & Fulfillment Split
    // -------------------------------------------------------------------------
    // Inventory inquiry returns 8 units available in Doha Central Depot
    const split = AssetAllocationEngine.calculateInternalFulfillment(requirement.quantity, 8);
    expect(split.allocatedInternally).toBe(8);
    expect(split.externalProcurementRequired).toBe(22);
    expect(split.fulfillmentRatePercent).toBe(27);

    // -------------------------------------------------------------------------
    // STAGE 5: 3-Way Joinery RFQ & Evaluation Matrix
    // -------------------------------------------------------------------------
    const rfq: RFQ = {
      id: 'rfq-fee-2026-001',
      rfqNumber: 'RFQ-FEE-2026-001',
      projectId,
      procurementRequirementId: requirement.id,
      issueDate: new Date('2026-09-01'),
      closingDate: new Date('2026-09-05'),
      invitedVendorIds: ['ven-abc-01', 'ven-qs-02', 'ven-ge-03'],
      technicalSpecification: 'Fabrication of 22 modular counters matching DES-FEE-REG-001 Rev 02',
      quantity: 22,
      deliveryRequirement: 'DECC Hall 1 Direct Delivery',
      attachments: [],
      status: 'closed',
    };

    const quotes: VendorQuote[] = [
      {
        id: 'quote-abc',
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
        id: 'quote-qs',
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
        id: 'quote-ge',
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

    const evaluation = ProcurementEngine.evaluateBids(rfq, quotes);
    expect(evaluation.recommendedVendorId).toBe('ven-abc-01');
    expect(evaluation.evaluations[0].compositeScore).toBe(96);

    // -------------------------------------------------------------------------
    // STAGE 6: PO Release & Commercial Committed Cost Aggregation
    // -------------------------------------------------------------------------
    const awardedPo: PurchaseOrder = {
      id: 'po-qnd26-0045',
      poNumber: 'PO-QND26-0045',
      projectId,
      vendorId: evaluation.recommendedVendorId,
      currency: 'QAR',
      totalAmount: new Money(66000, 'QAR'),
      status: 'released',
      lines: [
        {
          id: 'pol-1',
          poId: 'po-qnd26-0045',
          description: 'Fabrication of 22 modular counters',
          quantity: 22,
          unitCost: new Money(3000, 'QAR'),
          totalCost: new Money(66000, 'QAR'),
        },
      ],
      issuedAt: new Date(),
      issuedBy: 'Rashid Al-Hajri (Financial Controller)',
      metadata: {},
    };

    const committedExpenditure = ProcurementEngine.aggregateCommittedCost([awardedPo], 'QAR');
    expect(committedExpenditure.amount.toNumber()).toBe(66000);

    // Cost variance calculation against BOQ line budget
    const costSavings = requirement.approvedBudget.minus(committedExpenditure);
    expect(costSavings.amount.toNumber()).toBe(4000); // QAR 4,000 savings

    // -------------------------------------------------------------------------
    // STAGE 7: Production Release Gate & Workshop Fabrication
    // -------------------------------------------------------------------------
    const releaseGate = ProductionEngine.evaluateFabricationRelease({
      designApproved: true,
      commercialApproved: true,
      safetyApproved: true,
      vendorAwarded: true,
      approvedBy: 'Karim Haddad (Technical Director)',
    });
    expect(releaseGate.canRelease).toBe(true);

    const productionPackage: ProductionPackage = {
      id: 'pkg-fee-reg-01',
      packageCode: 'PKG-FEE-REG-01',
      projectId,
      vendorId: 'ven-abc-01',
      title: 'Fabrication of 22 Modular Registration Counters',
      quantity: 22,
      completedQuantity: 22,
      material: 'HDF Melamine & Aluminium Frame',
      productionOwnerId: 'usr-karim-004',
      startDate: new Date('2026-09-06'),
      requiredCompletionDate: new Date('2026-09-14'),
      deliveryDate: new Date('2026-09-14'),
      status: 'qc_inspection',
      images: [],
      documents: [],
      boqLineIds: ['boq-reg-001'],
    };

    // Minor snag identified and resolved before dispatch
    const rectifiedSnag = {
      id: 'snag-01',
      projectId,
      packageId: productionPackage.id,
      title: 'Counter #14 edge banding touch-up',
      severity: 'minor' as const,
      status: 'resolved' as const,
      blocksDispatch: false,
      blocksReadiness: false,
      createdAt: new Date(),
    };

    const dispatchCheck = ProductionEngine.validateDispatchReadiness(productionPackage, [rectifiedSnag]);
    expect(dispatchCheck.canDispatch).toBe(true);

    // -------------------------------------------------------------------------
    // STAGE 8: Central Warehouse Asset Lock
    // -------------------------------------------------------------------------
    const asset: Asset = {
      id: 'ast-cnt-001',
      assetTag: 'AST-CNT-001',
      barcode: 'E3-BC-CNT-001',
      name: 'Modular Registration Counter (Branded)',
      category: 'Furniture & Staging',
      quantity: 8,
      unit: 'units',
      ownership: 'e3_owned',
      warehouseId: 'wh-doha-01',
      zone: 'Furniture',
      location: 'Bay 03-A',
      condition: 'serviceable',
      availability: 'available',
      purchaseDate: new Date('2025-01-10'),
      purchaseValue: 12000,
      currency: 'QAR',
    };

    const assetAllocation: AssetAllocation = {
      id: 'alloc-fee-01',
      assetId: asset.id,
      projectId,
      allocatedQuantity: 8,
      status: 'confirmed',
      window: {
        start: new Date('2026-10-10T00:00:00Z'),
        end: new Date('2026-10-20T00:00:00Z'),
      },
    };

    expect(() =>
      AssetAllocationEngine.validateAssetProjectAllocation(asset, [], {
        projectId,
        window: assetAllocation.window,
        quantity: 8,
      })
    ).not.toThrow();

    // -------------------------------------------------------------------------
    // STAGE 9: Multi-Source Packing List Consolidation
    // -------------------------------------------------------------------------
    const packingList: PackingList = {
      id: 'pl-fee-001',
      packingListNumber: 'PL-FEE-001',
      projectId,
      origin: 'Doha Central Logistics Depot',
      destination: 'DECC Hall 1 Loading Bay',
      vehicleId: 'TRUCK-07',
      driverId: 'Hamad Al-Khelaifi',
      status: 'packed',
      items: [
        { assetId: asset.id, description: '8x Internal E3 Assets', quantity: 8, casesPallets: '4 pallets' },
        { packageId: productionPackage.id, description: '22x Fabricated Counters', quantity: 22, casesPallets: '11 pallets' },
      ],
      createdAt: new Date(),
    };

    const totalPackedUnits = packingList.items.reduce((sum, it) => sum + it.quantity, 0);
    expect(totalPackedUnits).toBe(30); // All 30 units accounted for

    // -------------------------------------------------------------------------
    // STAGE 10: Transport & Dispatch
    // -------------------------------------------------------------------------
    const dispatchedPl = LogisticsEngine.dispatchPackingList(packingList);
    expect(dispatchedPl.status).toBe('dispatched');

    // -------------------------------------------------------------------------
    // STAGE 11: Site Delivery & Electronic POD
    // -------------------------------------------------------------------------
    const deliveredPl = LogisticsEngine.deliverPackingList(dispatchedPl, {
      receiverName: 'Omar Farooq (Site Field Supervisor)',
      receiverSignature: 'Verified Electronic Signature',
      timestamp: new Date('2026-10-14T11:30:00Z'),
      photos: ['evidence/pl-fee-001-pod.jpg'],
      discrepancies: [],
    });

    expect(deliveredPl.status).toBe('delivered');
    expect(deliveredPl.deliveryProof?.receiverName).toContain('Omar Farooq');
    expect(deliveredPl.deliveryProof?.discrepancies).toHaveLength(0);

    // -------------------------------------------------------------------------
    // STAGE 12: Site Installation Progression & Acceptance
    // -------------------------------------------------------------------------
    const installationItem: InstallationItem = {
      id: 'inst-fee-01',
      projectId,
      title: '30 Registration Counters (Hall 1 Entry)',
      status: 'not_delivered',
      evidenceUris: [],
    };

    const deliveredItem = InstallationTracker.advanceStatus(installationItem, 'delivered');
    const positionedItem = InstallationTracker.advanceStatus(deliveredItem, 'positioned');
    const installedItem = InstallationTracker.advanceStatus(positionedItem, 'installed', ['photo-installed.jpg'], 'Connected to main power');
    const testedItem = InstallationTracker.advanceStatus(installedItem, 'tested', ['photo-tested.jpg'], 'Badge print dry run passed');
    const acceptedItem = InstallationTracker.advanceStatus(
      testedItem,
      'accepted',
      ['photo-accepted.jpg'],
      'Fully accepted by Qatar Tourism Field Lead',
      'Omar Farooq'
    );

    expect(acceptedItem.status).toBe('accepted');
    expect(acceptedItem.verifiedBy).toBe('Omar Farooq');

    // -------------------------------------------------------------------------
    // STAGE 13: 10-Dimension Operational Readiness Gate
    // -------------------------------------------------------------------------
    const dimensionChecks: DimensionReadinessCheck[] = [
      { dimension: 'Scope', isPassed: true, isCritical: true, scorePercent: 100, details: '30/30 registration counters delivered' },
      { dimension: 'Design', isPassed: true, isCritical: true, scorePercent: 100, details: 'DES-FEE-REG-001 Rev 02 built to spec' },
      { dimension: 'Production', isPassed: true, isCritical: true, scorePercent: 100, details: '22 units fabricated and dispatched' },
      { dimension: 'Assets', isPassed: true, isCritical: true, scorePercent: 100, details: '8 internal units inspected and deployed' },
      { dimension: 'Logistics', isPassed: true, isCritical: true, scorePercent: 100, details: 'Truck 07 delivered on dock slot' },
      { dimension: 'Installation', isPassed: true, isCritical: true, scorePercent: 100, details: '30 units tested and accepted on site' },
      { dimension: 'HSE', isPassed: true, isCritical: true, scorePercent: 100, details: 'Zero safety incidents recorded' },
      { dimension: 'Permits', isPassed: true, isCritical: true, scorePercent: 100, details: 'Civil Defence venue permit approved' },
      { dimension: 'Staffing', isPassed: true, isCritical: true, scorePercent: 100, details: 'Hostesses and technical operators rostered' },
      { dimension: 'Technical Testing', isPassed: true, isCritical: true, scorePercent: 100, details: 'Power and networking dry run 100% verified' },
    ];

    const readinessReport = ComprehensiveReadinessEvaluator.evaluate(projectId, dimensionChecks);

    expect(readinessReport.overallStatus).toBe('READY');
    expect(readinessReport.overallScorePercent).toBe(100);
    expect(readinessReport.canOpen).toBe(true);
    expect(readinessReport.criticalBlockers).toHaveLength(0);
    expect(readinessReport.exceptions).toHaveLength(0);
  });
});
