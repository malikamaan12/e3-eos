import { describe, it, expect } from 'vitest';
import {
  evaluateRequirementTraceability,
  generateRequirementsMatrix,
  assessClarificationImpact,
  getUrgentClarifications,
  generateDocumentNumber,
  redactDocumentForClientDistribution,
  calculateCpmSchedule,
  generateBumpInShifts,
  ScopeRequirement,
  ClarificationItem,
  GanttTaskInput,
  Money,
  VariationLedger,
  VariationData,
  DOHA_DECC_PROFILE,
} from '@e3-eos/domain';

describe('Sprint 02 — Event Delivery Machinery & 7-Point Traceability Suite', () => {
  describe('1. 7-Point Scope & Requirements Traceability Invariant', () => {
    it('evaluates a complete requirement with 7/7 points as 100% traceable with low risk', () => {
      const fullReq: ScopeRequirement = {
        id: 'req-qnd-001',
        projectId: 'prj-qnd-2026',
        code: 'REQ-QND-001',
        title: 'Main Ceremony 360-Degree Kinetic LED Arch',
        description: 'Motorized kinetic LED arch spanning Lusail Boulevard central court.',
        category: 'creative_visual',
        sourceReference: 'RFP Section 4.2.1',
        ownerId: 'usr-karim-004',
        ownerName: 'Karim Haddad (Technical Director)',
        dueDate: '2026-11-15T00:00:00Z',
        disposition: 'applicable',
        linkedDocumentId: 'doc-001',
        linkedDocumentNumber: 'E3-QND26-AV-DWG-0001',
        linkedDesignId: 'des-001',
        linkedDesignVersion: 'Rev 01',
        linkedBoqLineCode: 'BOQ-AV-001',
        targetCostQar: 450000,
        approvalRequestId: 'appr-req-001',
        isApproved: true,
        deliveryEvidenceHash: 'sha256-d41d8cd98f00b204e9800998ecf8427e',
        fulfillmentStatus: 'approved',
        createdAt: '2026-09-08T10:00:00Z',
      };

      const evalResult = evaluateRequirementTraceability(fullReq, { isDeliveryStage: true });

      expect(evalResult.completedPoints).toBe(7);
      expect(evalResult.totalPoints).toBe(7);
      expect(evalResult.traceabilityScorePct).toBe(100);
      expect(evalResult.isFullyTraceable).toBe(true);
      expect(evalResult.riskRating).toBe('low');
      expect(evalResult.missingAttributes).toHaveLength(0);
    });

    it('identifies gaps and elevates risk rating when attributes are missing', () => {
      const gappedReq: ScopeRequirement = {
        id: 'req-qnd-004',
        projectId: 'prj-qnd-2026',
        code: 'REQ-QND-004',
        title: 'VIP Royal Protocol Red Carpet & Shaded Holding Majlis',
        description: 'Ceremonial protocol carpet and shaded arrival portico.',
        category: 'protocol_ceremony',
        sourceReference: 'Amiri Diwan Protocol Manual Section 7',
        dueDate: '2026-11-20T00:00:00Z',
        disposition: 'applicable',
        createdAt: '2026-09-10T12:00:00Z',
      };

      const evalResult = evaluateRequirementTraceability(gappedReq);

      expect(evalResult.completedPoints).toBe(1); // hasTargetDate only
      expect(evalResult.traceabilityScorePct).toBe(14);
      expect(evalResult.isFullyTraceable).toBe(false);
      expect(evalResult.riskRating).toBe('critical');
      expect(evalResult.missingAttributes).toContain('Assigned Owner (Lead PM / Discipline Lead)');
      expect(evalResult.missingAttributes).toContain('Controlled Document Reference');
      expect(evalResult.missingAttributes).toContain('Technical CAD / Design Revision');
      expect(evalResult.missingAttributes).toContain('Priced BOQ Line / Budget Allocation');
      expect(evalResult.missingAttributes).toContain('Governance Approval Sign-off');
    });

    it('generates a project-wide Traceability Matrix report with discipline breakdown', () => {
      const reqList: ScopeRequirement[] = [
        {
          id: 'req-01',
          projectId: 'prj-01',
          code: 'REQ-01',
          title: 'Full Rigging Arch',
          description: 'Truss arch',
          category: 'staging_technical',
          sourceReference: 'Sec 1',
          ownerId: 'usr-1',
          dueDate: '2026-11-01',
          linkedDocumentNumber: 'DOC-01',
          linkedDesignVersion: 'Rev 1',
          linkedBoqLineCode: 'BOQ-01',
          isApproved: true,
          deliveryEvidenceHash: 'hash-01',
          disposition: 'applicable',
          createdAt: '2026-09-01',
        },
        {
          id: 'req-02',
          projectId: 'prj-01',
          code: 'REQ-02',
          title: 'Audio Line Array',
          description: 'PA system',
          category: 'creative_visual',
          sourceReference: 'Sec 2',
          dueDate: '2026-11-02',
          disposition: 'applicable',
          createdAt: '2026-09-01',
        },
      ];

      const report = generateRequirementsMatrix('prj-01', reqList);

      expect(report.totalRequirements).toBe(2);
      expect(report.fullyTraceableRequirements).toBe(1);
      expect(report.unassignedRequirements).toBe(1);
      expect(report.uncostedRequirements).toBe(1);
      expect(report.summaryByDiscipline.staging_technical.total).toBe(1);
      expect(report.summaryByDiscipline.staging_technical.traceable).toBe(1);
      expect(report.summaryByDiscipline.creative_visual.total).toBe(1);
      expect(report.summaryByDiscipline.creative_visual.traceable).toBe(0);
    });
  });

  describe('2. Clarifications, RFI & Addenda Impact Assessment', () => {
    it('flags clarification as requiring variation order when cost or schedule is altered', () => {
      const impactWithCost = assessClarificationImpact({
        costDeltaQar: 45000,
        scheduleDeltaDays: 1,
        scopeAltered: true,
      });

      expect(impactWithCost.hasCostImpact).toBe(true);
      expect(impactWithCost.hasScheduleImpact).toBe(true);
      expect(impactWithCost.hasScopeImpact).toBe(true);
      expect(impactWithCost.requiresVariationOrder).toBe(true);
      expect(impactWithCost.estimatedCostImpactQar).toBe(45000);
      expect(impactWithCost.estimatedScheduleImpactDays).toBe(1);

      const impactNoChange = assessClarificationImpact({
        costDeltaQar: 0,
        scheduleDeltaDays: 0,
        scopeAltered: false,
      });

      expect(impactNoChange.requiresVariationOrder).toBe(false);
    });

    it('filters urgent clarifications due within 72 hours of tender submission', () => {
      const now = Date.now();
      const items: ClarificationItem[] = [
        {
          id: 'c1',
          projectId: 'p1',
          clarificationCode: 'RFI-01',
          question: 'Urgent drone airspace query',
          category: 'schedule',
          source: 'client_query',
          submittedAt: new Date(now - 100000).toISOString(),
          dueAt: new Date(now + 24 * 3600 * 1000).toISOString(), // 24h away (urgent)
          status: 'submitted_to_client',
          impact: { hasScopeImpact: false, hasCostImpact: false, hasScheduleImpact: false, requiresVariationOrder: false },
          linkedRequirementIds: [],
          createdAt: new Date().toISOString(),
        },
        {
          id: 'c2',
          projectId: 'p1',
          clarificationCode: 'RFI-02',
          question: 'Long term query',
          category: 'technical',
          source: 'bidder_inquiry',
          submittedAt: new Date(now - 100000).toISOString(),
          dueAt: new Date(now + 120 * 3600 * 1000).toISOString(), // 5 days away (not urgent)
          status: 'submitted_to_client',
          impact: { hasScopeImpact: false, hasCostImpact: false, hasScheduleImpact: false, requiresVariationOrder: false },
          linkedRequirementIds: [],
          createdAt: new Date().toISOString(),
        },
        {
          id: 'c3',
          projectId: 'p1',
          clarificationCode: 'RFI-03',
          question: 'Answered query',
          category: 'technical',
          source: 'bidder_inquiry',
          submittedAt: new Date(now - 100000).toISOString(),
          dueAt: new Date(now + 12 * 3600 * 1000).toISOString(),
          status: 'answered', // Already answered, should not flag as urgent open
          impact: { hasScopeImpact: false, hasCostImpact: false, hasScheduleImpact: false, requiresVariationOrder: false },
          linkedRequirementIds: [],
          createdAt: new Date().toISOString(),
        },
      ];

      const urgent = getUrgentClarifications(items);
      expect(urgent).toHaveLength(1);
      expect(urgent[0].clarificationCode).toBe('RFI-01');
    });
  });

  describe('3. Controlled Documents & Client Redaction Invariant', () => {
    it('generates document numbers across configurable profiles (E3 Standard, ISO 19650, Client, Authority, Custom)', () => {
      // 1. E3 Standard Document Numbering
      const e3Std = generateDocumentNumber({
        profile: 'e3_standard',
        projectCode: 'QND26',
        discipline: 'audio_visual',
        documentType: 'drawing',
        sequence: 1,
      });
      expect(e3Std).toBe('E3-QND26-AV-DWG-0001');

      // 2. ISO 19650-style
      const isoDoc = generateDocumentNumber({
        profile: 'iso_19650',
        projectCode: 'QND26',
        discipline: 'audio_visual',
        documentType: 'drawing',
        originator: 'E3QA',
        volumeOrSystem: '01',
        levelOrLocation: '00',
        role: 'E',
        sequence: 12,
      });
      expect(isoDoc).toBe('QND26-E3QA-01-00-DWG-E-0012');

      // 3. Client Defined
      const clientDoc = generateDocumentNumber({
        profile: 'client_defined',
        clientCode: 'QT',
        projectCode: 'QND26',
        documentType: 'specification',
        sequence: 5,
      });
      expect(clientDoc).toBe('QT-QND26-SPC-0005');

      // 4. Authority / Municipality Defined
      const authDoc = generateDocumentNumber({
        profile: 'authority_defined',
        authorityCode: 'QCD',
        projectCode: 'QND26',
        discipline: 'health_safety',
        documentType: 'calculation',
        sequence: 3,
      });
      expect(authDoc).toBe('QCD-QND26-HSE-0003');

      // 5. Custom Project Template
      const customDoc = generateDocumentNumber({
        profile: 'custom',
        projectCode: 'QND26',
        discipline: 'scenic',
        documentType: 'method_statement',
        clientCode: 'VIP',
        sequence: 99,
        customTemplate: '{CLIENT}-{PROJECT}-{DISCIPLINE}-{TYPE}-{SEQUENCE}',
      });
      expect(customDoc).toBe('VIP-QND26-SCN-MS-0099');
    });

    it('strictly redacts internal unit buy-rates and margins from client distribution', () => {
      const internalDoc = {
        documentNumber: 'E3-QND26-AV-DWG-0001',
        title: 'LED Arch Drawing',
        unitCost: '320000 QAR',
        buyRate: '120 QAR/hr',
        internalMargin: '43.75%',
        subcontractorCost: '250000 QAR',
        clientSellPrice: '450000 QAR',
      };

      const clientRedacted: any = redactDocumentForClientDistribution(internalDoc);

      expect(clientRedacted.documentNumber).toBe('E3-QND26-AV-DWG-0001');
      expect(clientRedacted.unitCost).toBeUndefined();
      expect(clientRedacted.buyRate).toBeUndefined();
      expect(clientRedacted.internalMargin).toBeUndefined();
      expect(clientRedacted.subcontractorCost).toBeUndefined();
      expect(clientRedacted.clientSellPrice).toBe('450000 QAR');
    });
  });

  describe('4. Master Timeline & Critical Path Method (CPM)', () => {
    it('calculates CPM schedule, identifying critical activities with zero total float', () => {
      const taskNetwork: GanttTaskInput[] = [
        { id: 't1', code: 'TSK-01', title: 'Survey', durationHours: 8 },
        { id: 't2', code: 'TSK-02', title: 'Rigging', durationHours: 12, predecessorIds: [{ id: 't1', type: 'FS' }] },
        { id: 't3', code: 'TSK-03', title: 'LED Tiles', durationHours: 20, predecessorIds: [{ id: 't2', type: 'FS' }] },
        { id: 't4', code: 'TSK-04', title: 'PA Tuning', durationHours: 10, predecessorIds: [{ id: 't2', type: 'FS' }] }, // Non-critical parallel
        { id: 't5', code: 'TSK-05', title: 'Safety Signoff', durationHours: 4, predecessorIds: [{ id: 't3', type: 'FS' }, { id: 't4', type: 'FS' }] },
      ];

      const cpm = calculateCpmSchedule(taskNetwork);

      expect(cpm.projectDurationHours).toBe(44); // 8 + 12 + 20 + 4 = 44
      expect(cpm.criticalPathTaskIds).toContain('t1');
      expect(cpm.criticalPathTaskIds).toContain('t2');
      expect(cpm.criticalPathTaskIds).toContain('t3');
      expect(cpm.criticalPathTaskIds).toContain('t5');
      expect(cpm.criticalPathTaskIds).not.toContain('t4'); // t4 has float

      const t4Output = cpm.tasks.find((t) => t.id === 't4');
      expect(t4Output?.totalFloatHours).toBe(10); // 20 - 10 = 10 hours float
      expect(t4Output?.isCritical).toBe(false);
    });

    it('generates operational bump-in shifts governed by configurable Operational Constraint Profiles', () => {
      const shifts = generateBumpInShifts(48, DOHA_DECC_PROFILE);

      expect(shifts.length).toBe(6); // 48 hours / 8 = 6 shifts

      // Night shift curfew check under DECC profile (55 dB night, 22:00 to 06:00 curfew)
      const nightShifts = shifts.filter((s) => s.isCurfewActive);
      expect(nightShifts.length).toBeGreaterThan(0);
      for (const ns of nightShifts) {
        expect(ns.allowedNoiseDb).toBe(55); // Governed by Law No. 30 of 2002 & Cabinet Decision No. 4 of 2005
        expect(ns.occupationalNoiseLimitDb).toBe(85); // Governed by Qatar Labour Law No. 14 of 2004 & MD 16 of 2005
        expect(ns.shiftType).toBe('overnight_heavy_lift');
        expect(ns.maxFloorLoadKgM2).toBe(2500); // Official DECC 2.5 T/m² (2,500 kg/m²), NOT 2,000!
      }

      // Day shift check under DECC profile (65 dB day environmental, 85 dB occupational)
      const dayShifts = shifts.filter((s) => !s.isCurfewActive);
      for (const ds of dayShifts) {
        expect(ds.allowedNoiseDb).toBe(65); // Governed by Law No. 30 of 2002 daytime standard
        expect(ds.occupationalNoiseLimitDb).toBe(85); // Governed by Qatar Labour Law No. 14 of 2004 & MD 16 of 2005
        expect(ds.shiftType).toBe('day_rigging');
        expect(ds.maxFloorLoadKgM2).toBe(2500);
      }
    });
  });

  describe('5. Commercial Control & Dynamic EAC Variance', () => {
    it('updates Estimate at Completion (EAC) dynamically upon variation approval', () => {
      const baseCost = new Money('1000000', 'QAR');
      const baseRev = new Money('1400000', 'QAR');

      const variations: VariationData[] = [
        {
          id: 'v1',
          projectId: 'p1',
          variationCode: 'VO-01',
          title: 'Additional LED Wall Area',
          scopeDescription: 'Add 50sqm LED',
          costImpact: new Money('80000', 'QAR'),
          sellImpact: new Money('120000', 'QAR'),
          timeImpactDays: 1,
          status: 'client_approved', // Approved by client
        },
        {
          id: 'v2',
          projectId: 'p1',
          variationCode: 'VO-02',
          title: 'Extra Generator',
          scopeDescription: 'Backup power',
          costImpact: new Money('30000', 'QAR'),
          sellImpact: new Money('45000', 'QAR'),
          timeImpactDays: 0,
          status: 'submitted_to_client', // Pending client authorization
        },
      ];

      const financials = VariationLedger.calculateFinancials('QAR', baseRev, baseCost, variations);

      // Approved baseline incorporating client-authorized VO-01:
      // Baseline budget = 1,000,000, Approved changes = 80,000 -> Current budget = 1,080,000
      expect(financials.baselineBudget.amount.toNumber()).toBe(1000000);
      expect(financials.approvedChanges.amount.toNumber()).toBe(80000);
      expect(financials.currentBudget.amount.toNumber()).toBe(1080000);

      // Approved contract value = 1,400,000 + 120,000 = 1,520,000
      expect(financials.approvedContractValue.amount.toNumber()).toBe(1520000);

      // Pending exposure strictly isolated (VO-02: 30,000 cost / 45,000 sell):
      expect(financials.pendingExposureCost.amount.toNumber()).toBe(30000);
      expect(financials.pendingExposureSell.amount.toNumber()).toBe(45000);

      // Official EAC = Actual Cost (0) + Forecast to Complete (1,080,000) = 1,080,000
      // Pending exposure (30,000) is NOT rolled into official EAC!
      expect(financials.estimateAtCompletion.amount.toNumber()).toBe(1080000);
      expect(financials.varianceAtCompletion.amount.toNumber()).toBe(0);

      // Only the explicit unapproved exposure scenario reports 1,110,000
      expect(financials.unapprovedExposureScenarioEac.amount.toNumber()).toBe(1110000);
    });

    it('proves zero double-counting across Pending Exposure -> Approved Change -> Committed Cost -> Actual Cost lifecycle', () => {
      const baseRev = new Money('1500000', 'QAR');
      const baseCost = new Money('1000000', 'QAR');
      const costDelta = new Money('50000', 'QAR');
      const sellDelta = new Money('75000', 'QAR');

      const sim = VariationLedger.simulateCostLifecycle(baseRev, baseCost, costDelta, sellDelta);

      // Step 1: Pending Exposure
      expect(sim.step1Pending.currentBudget.amount.toNumber()).toBe(1000000);
      expect(sim.step1Pending.pendingExposureCost.amount.toNumber()).toBe(50000);
      expect(sim.step1Pending.estimateAtCompletion.amount.toNumber()).toBe(1000000);
      expect(sim.step1Pending.committedCost.amount.toNumber()).toBe(0);
      expect(sim.step1Pending.actualCost.amount.toNumber()).toBe(0);

      // Step 2: Approved Change (Moves from Pending to Approved)
      expect(sim.step2Approved.currentBudget.amount.toNumber()).toBe(1050000); // Increased by 50,000
      expect(sim.step2Approved.pendingExposureCost.amount.toNumber()).toBe(0); // Cleared from pending
      expect(sim.step2Approved.estimateAtCompletion.amount.toNumber()).toBe(1050000);
      expect(sim.step2Approved.committedCost.amount.toNumber()).toBe(0);
      expect(sim.step2Approved.actualCost.amount.toNumber()).toBe(0);

      // Step 3: Committed Cost (PO placed for 50,000)
      expect(sim.step3Committed.currentBudget.amount.toNumber()).toBe(1050000);
      expect(sim.step3Committed.committedCost.amount.toNumber()).toBe(50000);
      expect(sim.step3Committed.actualCost.amount.toNumber()).toBe(0);
      // Crucial: EAC does NOT double count! It remains 1,050,000
      expect(sim.step3Committed.estimateAtCompletion.amount.toNumber()).toBe(1050000);

      // Step 4: Actual Cost (Invoice posted for 50,000)
      expect(sim.step4Actual.currentBudget.amount.toNumber()).toBe(1050000);
      expect(sim.step4Actual.committedCost.amount.toNumber()).toBe(0);
      expect(sim.step4Actual.actualCost.amount.toNumber()).toBe(50000);
      // Crucial: EAC does NOT double count! It remains 1,050,000
      expect(sim.step4Actual.estimateAtCompletion.amount.toNumber()).toBe(1050000);
      expect(sim.step4Actual.varianceAtCompletion.amount.toNumber()).toBe(0);
    });
  });
});
