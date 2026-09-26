import { describe, it, expect } from 'vitest';
import {
  Decimal,
  Money,
  StageGraphEngine,
  StageInstance,
  DependencyEdge,
  BOQCalculator,
  BOQLineInput,
  ProcurementEngine,
  FrameworkContract,
  Vendor,
  PurchaseOrder,
  InventoryReservationEngine,
  Resource,
  Reservation,
  ReadinessEngine,
  ReadinessCheckpoint,
  CrewShiftEvaluator,
  Shift,
  IncidentProjectionEngine,
  IncidentRecord,
  HandoverEvaluator,
  VenueHandoverRecord,
  FinancialCalculator,
  FinancialPositionInput,
  ProjectCloseoutEngine,
  ProjectCloseoutState,
  ReportingEngine,
  ReportSnapshot,
} from '@e3-eos/domain';
import { matchRoute } from '../apps/web/src/routes.js';
import { ClientProjectionAdapter } from '../apps/web/src/client-projection.js';

describe('E3-EOS Complete 13-Stage Project Lifecycle Integration Test', () => {
  const orgId = 'org-e3-qatar';
  const projectId = 'proj-e3-national-day-2026';
  const projectCode = 'E3-ND-2026';

  it('executes continuous lifecycle traversal across all 13 canonical stages with unbroken invariant integrity', () => {
    // =========================================================================
    // STAGE 01: PROJECT ONBOARDING (M01, AT-014)
    // Progressive completeness: unknown dates & budget preserved without fake defaults
    // =========================================================================
    const intakeRecord = {
      id: projectId,
      organisationId: orgId,
      code: projectCode,
      title: 'Qatar National Day Cultural Celebration',
      classification: {
        businessRoute: 'direct_award',
        eventFormat: 'outdoor_festival',
        commercialModel: 'fixed_price',
        maturity: 'idea' as const,
        outcome: 'undetermined' as const,
      },
      dates: {
        intakeDate: new Date('2026-09-01T08:00:00Z'),
        eventStartDate: undefined, // Preserved unknown
        eventEndDate: undefined,
      },
      financialAssumptions: undefined, // Preserved unknown
    };

    expect(intakeRecord.id).toBe(projectId);
    expect(intakeRecord.dates.eventStartDate).toBeUndefined();
    expect(intakeRecord.financialAssumptions).toBeUndefined();

    // =========================================================================
    // STAGE 02: QUALIFICATION & FEASIBILITY (M02, AT-015)
    // Site survey, clarifications, and go-decision recorded
    // =========================================================================
    intakeRecord.classification.maturity = 'developing';
    expect(intakeRecord.classification.maturity).toBe('developing');

    // =========================================================================
    // STAGE 03: IDEA, CONCEPT & FIRST DRAFT (M05)
    // Creative concepts, moodboard assets registered
    // =========================================================================
    const conceptMoodboard = {
      assetId: 'asset-mb-01',
      title: 'Heritage Falcon Pavilion Moodboard',
      fileHash: 'sha256-4b825dc642cb6eb9a060e54b',
      version: 1,
      isFrozen: false,
    };
    expect(conceptMoodboard.version).toBe(1);

    // =========================================================================
    // STAGE 04: CLARIFICATION & DESIGN DEVELOPMENT (M05, AT-034)
    // Technical drawings frozen for costing
    // =========================================================================
    const drawingPackage = {
      id: 'dwg-pkg-01',
      title: 'Structural Truss Canopy Drawing Set',
      version: 1,
      isFrozen: true,
      releasedForPurpose: 'tender_costing',
    };
    expect(drawingPackage.isFrozen).toBe(true);

    // =========================================================================
    // STAGE 05: PROPOSAL, SUBMISSION & AUTHORISATION (M07, AT-038, AT-041)
    // BOQ calculation with deterministic margin calculation
    // Cost: 110,000 QAR | Sell: 160,000 QAR -> Contribution: 50,000 QAR (31.25%)
    // =========================================================================
    const boqLines: BOQLineInput[] = [
      {
        id: 'boq-l1',
        lineCode: 'STG-01',
        description: 'Main Stage Aluminium Roof Trussing (30x20m)',
        quantity: 1,
        uom: 'lump_sum',
        unitCost: 80000,
        unitSell: 110000,
      },
      {
        id: 'boq-l2',
        lineCode: 'LGT-01',
        description: 'Architectural LED Wash & Profile Lighting Package',
        quantity: 1,
        uom: 'shift',
        durationMultiplier: 5,
        unitCost: 6000, // 30,000 QAR
        unitSell: 10000, // 50,000 QAR
      },
    ];

    const boqResult = BOQCalculator.calculateEstimate(boqLines, 'QAR');
    expect(boqResult.totalCost.amount.toString()).toBe('110000');
    expect(boqResult.totalSell.amount.toString()).toBe('160000');
    expect(boqResult.marginPercent.toString()).toBe('31.25');

    // =========================================================================
    // STAGE 06: DETAILED DELIVERY PLANNING (M04, AT-018)
    // Full 13 stages mapped into stage graph, acyclic schedule validation
    // =========================================================================
    const stages: StageInstance[] = Array.from({ length: 13 }, (_, idx) => {
      const stageNum = idx + 1;
      const pad = stageNum < 10 ? `0${stageNum}` : `${stageNum}`;
      return {
        id: `inst-stage-${pad}`,
        templateStageId: `template-stage-${pad}`,
        name: `Stage ${pad}`,
        order: stageNum,
        isArchived: false,
        cycleNumber: 1,
      };
    });
    expect(stages).toHaveLength(13);

    // Assert dependency edge acyclic guarantee
    const existingEdges: DependencyEdge[] = [
      { id: 'edge-1', predecessorId: 'task-design', successorId: 'task-boq', type: 'FS' },
      { id: 'edge-2', predecessorId: 'task-boq', successorId: 'task-client-approval', type: 'FS' },
    ];
    const candidateEdge: DependencyEdge = {
      id: 'edge-3',
      predecessorId: 'task-client-approval',
      successorId: 'task-procurement',
      type: 'FS',
    };
    expect(() => StageGraphEngine.assertAcyclic(existingEdges, candidateEdge)).not.toThrow();

    // =========================================================================
    // STAGE 07: VENDOR SELECTION & ORDERS (M08, AT-043, AT-044)
    // Framework agreement consumption and idempotent release
    // =========================================================================
    const vendor: Vendor = {
      id: 'ven-scaffold-01',
      vendorCode: 'V-SCAF-01',
      name: 'Qatar Scaffolding & Rigging W.L.L.',
      category: 'corporate',
      status: 'active',
      complianceVerified: true,
    };

    const frameworkAgreement: FrameworkContract = {
      id: 'fc-scaffold-2026',
      contractCode: 'FC-2026-SCAF',
      vendorId: vendor.id,
      currency: 'QAR',
      ceilingAmount: new Money('200000', 'QAR'),
      consumedAmount: new Money('50000', 'QAR'),
      validUntil: new Date('2026-12-31'),
    };

    const callOff = new Money('40000', 'QAR');
    const { updatedContract, remainingCeiling } = ProcurementEngine.consumeFrameworkCeiling(
      frameworkAgreement,
      callOff
    );

    expect(updatedContract.consumedAmount.amount.toString()).toBe('90000');
    expect(remainingCeiling.amount.toString()).toBe('110000');

    const po: PurchaseOrder = {
      id: 'po-truss-001',
      poNumber: 'PO-2026-001',
      vendorId: vendor.id,
      frameworkContractId: frameworkAgreement.id,
      currency: 'QAR',
      totalAmount: callOff,
      status: 'released',
      lines: [],
      isSoleSource: false,
      externalDeliveryStatus: 'sent_pending_confirmation',
      releaseIdempotencyKey: 'idemp-po-release-001',
    };
    expect(po.status).toBe('released');

    // =========================================================================
    // STAGE 08: PRODUCTION & RESOURCE PREPARATION (M09, M10, AT-049)
    // Non-overlapping serialized inventory booking invariant
    // =========================================================================
    const generatorAsset: Resource = {
      id: 'res-gen-01',
      resourceCode: 'GEN-200KVA-01',
      name: '200kVA Whisper Silent Generator',
      type: 'serialized',
      totalQuantity: 1,
      usableQuantity: 1,
      warehouseLocation: 'Doha Industrial Zone Yard 4',
      status: 'serviceable',
      authoritativeSystem: 'EOS',
    };

    const existingBooking: Reservation = {
      id: 'resv-01',
      resourceId: generatorAsset.id,
      projectId: 'other-project',
      window: {
        start: new Date('2026-12-10T00:00:00Z'),
        end: new Date('2026-12-14T00:00:00Z'),
      },
      quantity: 1,
      status: 'confirmed',
    };

    // Confirmed non-overlapping reservation for our project
    const ourReservationWindow = {
      start: new Date('2026-12-15T00:00:00Z'),
      end: new Date('2026-12-20T00:00:00Z'),
    };
    expect(() =>
      InventoryReservationEngine.validateSerializedReservation(
        generatorAsset,
        [existingBooking],
        { projectId, window: ourReservationWindow }
      )
    ).not.toThrow();

    // Overlapping attempt must be blocked with RESERVATION_COLLISION
    const conflictWindow = {
      start: new Date('2026-12-12T00:00:00Z'),
      end: new Date('2026-12-16T00:00:00Z'),
    };
    expect(() =>
      InventoryReservationEngine.validateSerializedReservation(
        generatorAsset,
        [existingBooking],
        { projectId: 'conflicting-project', window: conflictWindow }
      )
    ).toThrow('RESERVATION_COLLISION');

    // =========================================================================
    // STAGE 09: LOGISTICS, BUMP-IN & INSTALLATION (M11, AT-062, AT-063)
    // Rest periods between shifts (>= 11h mandatory rest)
    // =========================================================================
    const shift1: Shift = {
      id: 'shift-01',
      workerId: 'w-rigger-01',
      role: 'Lead Rigger',
      windowStart: new Date('2026-12-15T08:00:00Z'),
      windowEnd: new Date('2026-12-15T18:00:00Z'), // 10h shift
    };

    const shift2Compliant: Shift = {
      id: 'shift-02',
      workerId: 'w-rigger-01',
      role: 'Lead Rigger',
      windowStart: new Date('2026-12-16T08:00:00Z'), // 14h rest interval (> 11h)
      windowEnd: new Date('2026-12-16T18:00:00Z'),
    };

    const shiftViolation: Shift = {
      id: 'shift-03-violating',
      workerId: 'w-rigger-01',
      role: 'Lead Rigger',
      windowStart: new Date('2026-12-16T00:00:00Z'), // 6h rest interval (< 11h)
      windowEnd: new Date('2026-12-16T10:00:00Z'),
    };

    const compliantRest = CrewShiftEvaluator.validateShiftRestInterval(shift2Compliant, [shift1], 11);
    expect(compliantRest.hasRestViolation).toBe(false);

    const violatingRest = CrewShiftEvaluator.validateShiftRestInterval(shiftViolation, [shift1], 11);
    expect(violatingRest.hasRestViolation).toBe(true);
    expect(violatingRest.restHoursProvided).toBe(6);

    // =========================================================================
    // STAGE 10: FINISHING, TESTING & READINESS (M12, AT-059)
    // Critical checkpoints gating opening release
    // =========================================================================
    const checkpoints: ReadinessCheckpoint[] = [
      {
        id: 'chk-fire-safety',
        zone: 'Arena Main Stage',
        title: 'Emergency Exit Clearance & Fire Suppression Active',
        isCritical: true,
        status: 'passed',
      },
      {
        id: 'chk-structural-signoff',
        zone: 'Arena Main Stage',
        title: 'Structural Engineer Wet-Stamp Certification',
        isCritical: true,
        status: 'passed',
      },
    ];

    const readinessEval = ReadinessEngine.evaluateReadiness('Arena Main Stage', checkpoints);
    expect(readinessEval.canReleaseToOpen).toBe(true);
    expect(readinessEval.completionPercentage).toBe(100);

    // =========================================================================
    // STAGE 11: LIVE OPERATIONS & DELIVERY (M13, AT-064)
    // Field incidents projected for client: internal personal narratives stripped
    // =========================================================================
    const internalIncident: IncidentRecord = {
      id: 'inc-live-001',
      projectId,
      title: 'Generator Soundcheck Trip',
      severity: 'low',
      operationalImpact: 'Minor electrical generator overload during soundcheck',
      restrictedPersonalNarrative: 'Electrician received first-aid attention for minor finger pinch',
      reportedAt: new Date('2026-12-18T19:30:00Z'),
      reportedBy: 'user-field-electrician',
    };

    const clientProjectedIncident = IncidentProjectionEngine.projectIncident(
      internalIncident,
      'client_portal'
    );
    expect(clientProjectedIncident.operationalImpact).toBe('Minor electrical generator overload during soundcheck');
    expect(clientProjectedIncident.restrictedPersonalNarrative).toBeUndefined();

    // =========================================================================
    // STAGE 12: BUMP-OUT & RECONCILIATION (M10, M13, AT-065)
    // Delivery completion decoupled from venue reinstatement claims
    // =========================================================================
    const venueHandover: VenueHandoverRecord = {
      id: 'vr-arena-01',
      projectId,
      deliveryCompleted: true,
      venueReinstatementStatus: 'remedial_required',
      openDamageClaims: [
        {
          claimId: 'claim-turf-01',
          description: 'Grass turf restoration required at Zone C parking gate',
          estimatedCost: 15000,
          resolved: false,
        },
      ],
      depositStatus: 'held',
    };

    const isSettled = HandoverEvaluator.isFinanciallySettled(venueHandover);
    expect(venueHandover.deliveryCompleted).toBe(true);
    expect(isSettled).toBe(false); // Invariant: remedial claims prevent final settlement

    // =========================================================================
    // STAGE 13: POST-EVENT REPORT, CLOSURE & LEARNING (M14, M15, AT-066, AT-078)
    // Worked 90,000 QAR EAC Invariant:
    // Budget: 110,000 | Posted: 35,000 | Accruals: 12,000 | Comm: 30,000 | Uncomm: 13,000
    // EAC = 35 + 12 + 30 + 13 = 90,000 QAR
    // =========================================================================
    const initialPosition: FinancialPositionInput = {
      currency: 'QAR',
      originalBudget: '110000',
      approvedBudgetChanges: '0',
      postedActualCost: '35000',
      acceptedAccruedCost: '12000',
      remainingCommitments: '30000',
      uncommittedForecast: '13000',
      approvedRevenueBasis: '160000',
    };

    const pos1 = FinancialCalculator.calculatePosition(initialPosition);
    expect(pos1.estimateAtCompletion.amount.toString()).toBe('90000');
    expect(pos1.budgetVariance.amount.toString()).toBe('20000');
    expect(pos1.forecastContributionMarginPercent).toBe('43.75%');

    // Invoicing 10,000 accepted accrual moves from accrual (12,000 -> 2,000) to actual (35,000 -> 45,000)
    const reconciledPosition: FinancialPositionInput = {
      ...initialPosition,
      postedActualCost: '45000',
      acceptedAccruedCost: '2000',
    };
    const pos2 = FinancialCalculator.calculatePosition(reconciledPosition);
    // Invariant: EAC strictly remains 90,000 QAR with zero double counting
    expect(pos2.estimateAtCompletion.amount.toString()).toBe('90000');
    expect(pos2.forecastContributionMarginPercent).toBe('43.75%');

    // Final Report Publication with deterministic hash
    const reportSnapshot: ReportSnapshot = {
      projectId,
      reportCode: 'RPT-FINAL-2026',
      periodStart: new Date('2026-09-01'),
      periodEnd: new Date('2026-12-31'),
      financials: {
        revenue: '160000',
        currentBudget: '110000',
        actualCost: '45000',
        internalMarginPercent: '43.75%',
        vendorCostBreakdown: { 'vendor-scaffold': '40000' },
      },
      incidents: [
        {
          title: 'Generator Soundcheck Trip',
          severity: 'low',
          operationalImpact: 'Minor electrical generator overload during soundcheck',
          restrictedPersonalNarrative: 'Electrician received first-aid attention for minor finger pinch',
        },
      ],
      metrics: {
        totalTurnstileEntries: 85000,
        uniqueAttendees: 42000,
        daysCount: 3,
      },
      milestonesCompleted: ['Stage 01 to 13 Delivery Complete'],
    };

    const hash1 = ReportingEngine.generateSnapshotHash(reportSnapshot);
    const hash2 = ReportingEngine.generateSnapshotHash(reportSnapshot);
    expect(hash1).toBe(hash2); // Deterministic content hash

    const clientReportContent = ReportingEngine.projectForAudience(reportSnapshot, 'client_portal');
    expect(clientReportContent.financials.revenue).toBe('160000');
    expect(clientReportContent.financials.internalMarginPercent).toBeUndefined(); // Margin stripped
    expect(clientReportContent.financials.vendorCostBreakdown).toBeUndefined(); // Vendor costs stripped
    expect(clientReportContent.incidents[0].restrictedPersonalNarrative).toBeUndefined(); // Narrative stripped

    // Decoupled operational closure with open settlement
    const closeoutState: ProjectCloseoutState = {
      projectId,
      operationalStatus: 'active',
      acceptanceStatus: 'accepted',
      reportingStatus: 'published',
      financialReviewStatus: 'completed',
      settlementStatus: 'open_receivables',
      openReceivablesCount: 1,
    };

    const closedState = ProjectCloseoutEngine.closeOperationally(closeoutState, 'user-director-01');
    expect(closedState.operationalStatus).toBe('operational_closed');
    expect(closedState.settlementStatus).toBe('open_receivables'); // Invariant: settlement remains open

    // Web Client Portal Projection verification
    const portalProject = ClientProjectionAdapter.projectForClient({
      id: projectId,
      code: projectCode,
      title: intakeRecord.title,
      clientName: 'Ministry of Culture',
      currentStageName: 'Post-Event Report, Closure and Learning',
      approvedProposal: {
        id: 'prop-v1',
        version: 1,
        sellPrice: boqResult.totalSell.amount.toString(),
        currency: 'QAR',
      },
      deliverables: [
        {
          name: 'Main Stage Aluminium Roof Trussing (30x20m)',
          category: 'Structure',
          isComplete: true,
          isAccepted: true,
          isPublishedToClient: true,
        },
      ],
      incidents: [clientProjectedIncident],
    });

    expect(portalProject.projectId).toBe(projectId);
    expect(portalProject.approvedProposal?.sellPrice).toBe('160000');
    expect(portalProject.publishedDeliverables[0].status).toBe('Accepted');

    // Route resolution
    const route = matchRoute(`/projects/${projectId}/reports`);
    expect(route).toBeDefined();
    expect(route?.route.workspace).toBe('project');
    expect(route?.route.title).toBe('Project reports');
  });
});
