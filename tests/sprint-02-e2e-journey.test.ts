import { describe, it, expect } from 'vitest';
import {
  ScopeRequirement,
  evaluateRequirementTraceability,
  generateRequirementsMatrix,
  ClarificationItem,
  assessClarificationImpact,
  getClarificationCountdownHours,
  evaluateClarificationCrossModuleImpact,
  DesignPackageItem,
  DesignRevisionRecord,
  DesignAnnotationPin,
  ProductionReleaseGate,
  safeSha256,
  generateDocumentNumber,
  redactDocumentForClientDistribution,
  calculateCpmSchedule,
  generateBumpInShifts,
  GanttTaskInput,
  Money,
  VariationLedger,
  DOHA_DECC_PROFILE,
} from '@e3-eos/domain';

describe('Sprint 02 — End-to-End 12-Step Unbroken Product Journey Test', () => {
  const projectId = 'prj-doha-gala-2026';
  const projectCode = 'DHA26';

  it('executes the full 12-step lifecycle across Requirements, Clarifications, Design, BOQ, CPM, Financials, Transmittal, and Traceability', () => {
    // -------------------------------------------------------------------------
    // STEP 1: Create a Scope Requirement in Stage 04 (Concept Design)
    // -------------------------------------------------------------------------
    const requirement: ScopeRequirement = {
      id: 'req-e2e-kinetic-001',
      projectId,
      code: 'REQ-DHA26-KIN-001',
      title: 'Automated 3-Axis Kinetic Chandelier & Motorized Rigging Assembly',
      description: 'High-bay central kinetic chandelier with DMX-controlled winches suspended in DECC Hall 1.',
      category: 'staging_technical',
      sourceReference: 'RFP Addendum 03 - Core Scenic & Special FX',
      ownerId: 'usr-tariq-lead',
      ownerName: 'Tariq Mansoor (Technical Director)',
      dueDate: '2026-11-20T18:00:00Z',
      disposition: 'applicable',
      createdAt: '2026-09-11T08:00:00Z',
    };

    expect(requirement.id).toBe('req-e2e-kinetic-001');
    expect(requirement.ownerName).toBe('Tariq Mansoor (Technical Director)');
    expect(requirement.disposition).toBe('applicable');

    // -------------------------------------------------------------------------
    // STEP 2: Log a Clarification / RFI linked to that Requirement
    // -------------------------------------------------------------------------
    const rfiDeadline = new Date(Date.now() + 48 * 3600 * 1000).toISOString(); // 48 hours remaining (< 72h)
    const clarification: ClarificationItem = {
      id: 'rfi-e2e-rigging-001',
      projectId,
      clarificationCode: 'RFI-DHA26-001',
      title: 'DECC High-Bay Roof Suspension Point Load & Secondary Safety Protocol',
      question: 'Please confirm maximum dynamic point load allowable on DECC primary roof bridles and secondary safety steel requirements.',
      category: 'technical',
      discipline: 'rigging',
      source: 'bidder_inquiry',
      author: 'Tariq Mansoor',
      assignedResponder: 'DECC Venue Engineering & Operations Lead',
      dateRaised: '2026-09-11T09:00:00Z',
      targetResponseDate: rfiDeadline,
      dueAt: rfiDeadline,
      hasCommercialImpact: false,
      hasScheduleImpact: false,
      status: 'awaiting_response',
      impact: assessClarificationImpact({}),
      linkedRequirementIds: [requirement.id],
      linkedDesignIds: [],
      linkedBoqLineCodes: [],
      linkedScheduleTaskIds: [],
      linkedDocumentNumbers: [],
      createdAt: '2026-09-11T09:00:00Z',
    };

    expect(clarification.status).toBe('awaiting_response');
    expect(clarification.linkedRequirementIds).toContain(requirement.id);

    // Verify urgent countdown highlighting (< 72 hours remaining)
    const countdown = getClarificationCountdownHours(clarification);
    expect(countdown.isUrgent).toBe(true);
    expect(countdown.isOverdue).toBe(false);
    expect(countdown.hoursRemaining).toBeGreaterThan(0);
    expect(countdown.hoursRemaining).toBeLessThanOrEqual(48.5);

    // -------------------------------------------------------------------------
    // STEP 3: Respond to Clarification (Status -> Answered) & Assess Cross-Module Impact
    // -------------------------------------------------------------------------
    clarification.status = 'answered';
    clarification.response = 'Maximum point load is 1,500 kg per primary node. Floor load ceiling is 2,000 kg/m2. Dual 16mm certified safety steels mandatory.';
    clarification.respondedBy = 'Eng. Mansoor Al-Kuwari (DECC Head of Rigging)';
    clarification.respondedAt = '2026-09-11T11:00:00Z';
    clarification.hasCommercialImpact = true;
    clarification.impact = assessClarificationImpact({
      response: clarification.response,
      costDeltaQar: 25000, // Secondary safety steels addition
      scheduleDeltaDays: 0,
      scopeAltered: true,
    });

    expect(clarification.status).toBe('answered');
    expect(clarification.impact.hasScopeImpact).toBe(true);
    expect(clarification.impact.hasCostImpact).toBe(true);
    expect(clarification.impact.estimatedCostImpactQar).toBe(25000);
    expect(clarification.impact.requiresVariationOrder).toBe(true);

    // Cross-module impact evaluation strictly preserves the approved baseline budget and timeline
    const crossImpact = evaluateClarificationCrossModuleImpact(clarification, {
      approvedBudgetQar: 1500000,
      approvedDurationDays: 14,
    });
    expect(crossImpact.preservesBaseline).toBe(true);
    expect(crossImpact.requiresVariationOrder).toBe(true);
    expect(crossImpact.affectedModules).toContain('Requirements');

    // -------------------------------------------------------------------------
    // STEP 4: Upload/Register Design Revision A (Status -> internal_review)
    // -------------------------------------------------------------------------
    const revA: DesignRevisionRecord = {
      revisionCode: 'Rev A',
      versionNumber: 1,
      contentHash: safeSha256('DWG-CHANDELIER-REV-A-VECTOR-CAD-DATA'),
      storageUrl: 's3://eos-vault/projects/prj-doha-gala-2026/designs/des-001/rev-a.dwg',
      uploadedBy: 'usr-tariq-lead',
      uploadedAt: '2026-09-11T11:30:00Z',
      notes: 'Initial structural bridle suspension and 3-axis kinetic motor array layout.',
      releaseStatus: 'internal_review',
    };

    const designPackage: DesignPackageItem = {
      id: 'DES-DHA26-001',
      projectId,
      packageType: 'technical_details',
      title: 'Kinetic Chandelier Suspension & Rigging Layout',
      discipline: 'rigging',
      currentRevisionCode: 'Rev A',
      currentReleaseStatus: 'internal_review',
      revisions: [revA],
      pins: [],
      linkedRequirementId: requirement.id,
      createdAt: '2026-09-11T11:30:00Z',
    };

    expect(designPackage.currentRevisionCode).toBe('Rev A');
    expect(designPackage.currentReleaseStatus).toBe('internal_review');

    // -------------------------------------------------------------------------
    // STEP 5: Place a 2D Pin Annotation on Revision A Requesting Changes
    // -------------------------------------------------------------------------
    const pin1: DesignAnnotationPin = {
      id: 'pin-001',
      pinNumber: 1,
      revisionCode: 'Rev A',
      xPercent: 54.0,
      yPercent: 42.5,
      title: 'Mandatory Secondary Safety Bridle & Shackle Spec',
      discipline: 'health_safety',
      priority: 'urgent',
      status: 'open',
      assigneeName: 'Tariq Mansoor',
      comments: [
        {
          id: 'com-001',
          authorId: 'usr-hse-fatima',
          authorName: 'Fatima Al-Sulaiti (HSE Officer)',
          discipline: 'health_safety',
          message: 'Per RFI-DHA26-001 resolution, secondary safety steels must be explicitly detailed on the apex bridal ring before fabrication clearance.',
          createdAt: '2026-09-11T12:00:00Z',
        },
      ],
      createdAt: '2026-09-11T12:00:00Z',
    };

    designPackage.pins.push(pin1);
    expect(designPackage.pins).toHaveLength(1);
    expect(designPackage.pins[0].status).toBe('open');
    expect(designPackage.pins[0].priority).toBe('urgent');

    // -------------------------------------------------------------------------
    // STEP 6: Upload Design Revision B Addressing Feedback
    // -------------------------------------------------------------------------
    const revB: DesignRevisionRecord = {
      revisionCode: 'Rev B',
      versionNumber: 2,
      contentHash: safeSha256('DWG-CHANDELIER-REV-B-WITH-SECONDARY-SAFETY-STEELS'),
      storageUrl: 's3://eos-vault/projects/prj-doha-gala-2026/designs/des-001/rev-b.dwg',
      uploadedBy: 'usr-tariq-lead',
      uploadedAt: '2026-09-11T14:00:00Z',
      notes: 'Added certified 16mm secondary steel tethers and load-rated apex brackets per RFI response and Pin #1.',
      releaseStatus: 'internal_review',
    };

    designPackage.revisions.push(revB);
    designPackage.currentRevisionCode = 'Rev B';

    // Resolve pin on Rev B
    pin1.status = 'resolved';
    pin1.resolvedAt = '2026-09-11T14:15:00Z';
    pin1.comments.push({
      id: 'com-002',
      authorId: 'usr-tariq-lead',
      authorName: 'Tariq Mansoor',
      discipline: 'rigging',
      message: 'Secondary bridle safety steels fully incorporated in Rev B drawing Section C-C.',
      createdAt: '2026-09-11T14:15:00Z',
    });

    expect(designPackage.revisions).toHaveLength(2);
    expect(designPackage.currentRevisionCode).toBe('Rev B');
    expect(pin1.status).toBe('resolved');

    // -------------------------------------------------------------------------
    // STEP 7: Pass POL-DES-01 Production Release Gate (Structural + HSE Sign-offs)
    // -------------------------------------------------------------------------
    // 7a. "Approved Concept" explicitly does NOT authorize fabrication
    const conceptCheck = ProductionReleaseGate.evaluateProductionRelease(revB, 'approved_concept');
    expect(conceptCheck.allowed).toBe(true);
    expect(conceptCheck.reason).toContain('Concept approval explicitly does NOT permit fabrication');

    // 7b. Attempting fabrication release without certifications is strictly blocked
    const uncertifiedCheck = ProductionReleaseGate.evaluateProductionRelease(revB, 'approved_for_production');
    expect(uncertifiedCheck.allowed).toBe(false);
    expect(uncertifiedCheck.reason).toContain('POL-DES-01 VIOLATION');
    expect(uncertifiedCheck.missingSignoffs).toHaveLength(2);
    expect(uncertifiedCheck.missingSignoffs).toContain('Certified Structural Engineer Sign-off (Civil Defence License)');
    expect(uncertifiedCheck.missingSignoffs).toContain('HSE & Fire Safety Compliance Sign-off (Flame Retardant / Egress)');

    // 7c. Append certified sign-offs
    revB.structuralEngineerSignoff = {
      certified: true,
      certifiedBy: 'Eng. Khalid Al-Mohannadi, PE (Licensed Structural Engineer)',
      certifiedAt: '2026-09-11T15:00:00Z',
      licenseNumber: 'QCD-STR-2026-8891',
    };
    revB.hseSignoff = {
      certified: true,
      certifiedBy: 'Fatima Al-Sulaiti, CMIOSH (Head of HSE)',
      certifiedAt: '2026-09-11T15:30:00Z',
    };

    // 7d. Now fabrication release passes POL-DES-01
    const certifiedCheck = ProductionReleaseGate.evaluateProductionRelease(revB, 'approved_for_production');
    expect(certifiedCheck.allowed).toBe(true);
    expect(certifiedCheck.reason).toContain('POL-DES-01 SATISFIED');

    revB.releaseStatus = 'approved_for_production';
    designPackage.currentReleaseStatus = 'approved_for_production';
    expect(designPackage.currentReleaseStatus).toBe('approved_for_production');

    // -------------------------------------------------------------------------
    // STEP 8: Link to Priced BOQ Line Item
    // -------------------------------------------------------------------------
    const boqLineItem = {
      lineCode: 'BOQ-DHA26-RIG-001',
      description: 'Kinetic Chandelier Motorized Winch & Rigging System',
      quantity: 1,
      unit: 'lot',
      unitCostQar: 280000,
      unitSellQar: 420000,
      subcontractorCostQar: 280000,
      subcontractorName: 'Swiss Rigging Dynamics AG',
      internalMarginPct: 33.33,
      internalNotes: 'Contract negotiated under direct supplier discount.',
    };

    // Cross-link to requirement
    requirement.linkedDesignId = designPackage.id;
    requirement.linkedDesignVersion = designPackage.currentRevisionCode;
    requirement.linkedBoqLineCode = boqLineItem.lineCode;
    requirement.targetCostQar = boqLineItem.unitCostQar;

    expect(requirement.linkedBoqLineCode).toBe('BOQ-DHA26-RIG-001');
    expect(requirement.linkedDesignVersion).toBe('Rev B');
    expect(requirement.targetCostQar).toBe(280000);

    // -------------------------------------------------------------------------
    // STEP 9: Schedule Installation on CPM Timeline under Doha DECC Constraint Profile
    // -------------------------------------------------------------------------
    const ganttTasks: GanttTaskInput[] = [
      { id: 'tsk-01', code: 'TSK-RIG-01', title: 'DECC Hall Floor Marking & Winch Staging', durationHours: 8 },
      { id: 'tsk-02', code: 'TSK-RIG-02', title: 'Bridle Truss Hoisting & Motor Cabling', durationHours: 16, predecessorIds: [{ id: 'tsk-01', type: 'FS' }] },
      { id: 'tsk-03', code: 'TSK-RIG-03', title: 'Chandelier Crystal Array Attachment & Balancing', durationHours: 24, predecessorIds: [{ id: 'tsk-02', type: 'FS' }] },
      { id: 'tsk-04', code: 'TSK-RIG-04', title: 'HSE Load-Cell Proof Testing & Rehearsal Run', durationHours: 8, predecessorIds: [{ id: 'tsk-03', type: 'FS' }] },
    ];

    const cpmResult = calculateCpmSchedule(ganttTasks);
    // 8 + 16 + 24 + 8 = 56 hours total duration on the critical path
    expect(cpmResult.projectDurationHours).toBe(56);
    expect(cpmResult.criticalPathTaskIds).toEqual(['tsk-01', 'tsk-02', 'tsk-03', 'tsk-04']);
    expect(cpmResult.criticalTasksCount).toBe(4);

    // Verify operational shifts under DOHA_DECC_PROFILE (85 dB Day / 55 dB Night, 2,000 kg/m2 floor load)
    const bumpInShifts = generateBumpInShifts(cpmResult.projectDurationHours, DOHA_DECC_PROFILE);
    expect(bumpInShifts.length).toBe(7); // 56 / 8 = 7 shifts

    for (const shift of bumpInShifts) {
      expect(shift.maxFloorLoadKgM2).toBe(2000); // Respects DECC 2,000 kg/m2 structural constraint
      expect(shift.appliedConstraintProfileId).toBe('PROF-VENUE-DECC-001');

      if (shift.isCurfewActive) {
        expect(shift.allowedNoiseDb).toBe(55); // 55 dB DECC Night curfew
      } else {
        expect(shift.allowedNoiseDb).toBe(85); // 85 dB DECC Daytime work
      }
    }

    // -------------------------------------------------------------------------
    // STEP 10: Run Commercial Financials (Baseline -> Approved -> Committed -> Actual)
    // -------------------------------------------------------------------------
    // Simulates the full variation lifecycle:
    // Baseline: Rev = 1,800,000 QAR, Cost = 1,200,000 QAR
    // Variation: Cost = +25,000 QAR, Sell = +40,000 QAR
    const baseRev = new Money('1800000', 'QAR');
    const baseCost = new Money('1200000', 'QAR');
    const costDelta = new Money('25000', 'QAR');
    const sellDelta = new Money('40000', 'QAR');

    const lifecycle = VariationLedger.simulateCostLifecycle(baseRev, baseCost, costDelta, sellDelta);

    // 10a. Step 1 (Pending Exposure): Does NOT inflate EAC
    expect(lifecycle.step1Pending.baselineBudget.amount.toNumber()).toBe(1200000);
    expect(lifecycle.step1Pending.currentBudget.amount.toNumber()).toBe(1200000);
    expect(lifecycle.step1Pending.pendingExposureCost.amount.toNumber()).toBe(25000);
    expect(lifecycle.step1Pending.estimateAtCompletion.amount.toNumber()).toBe(1200000); // EAC = 1,200,000

    // 10b. Step 2 (Approved Change): Moves from Pending to Current Budget
    expect(lifecycle.step2Approved.baselineBudget.amount.toNumber()).toBe(1200000);
    expect(lifecycle.step2Approved.approvedChanges.amount.toNumber()).toBe(25000);
    expect(lifecycle.step2Approved.currentBudget.amount.toNumber()).toBe(1225000);
    expect(lifecycle.step2Approved.pendingExposureCost.amount.toNumber()).toBe(0); // Cleared from pending
    expect(lifecycle.step2Approved.estimateAtCompletion.amount.toNumber()).toBe(1225000);

    // 10c. Step 3 (Committed Cost): Subcontractor PO issued for 25,000 QAR
    expect(lifecycle.step3Committed.currentBudget.amount.toNumber()).toBe(1225000);
    expect(lifecycle.step3Committed.committedCost.amount.toNumber()).toBe(25000);
    expect(lifecycle.step3Committed.actualCost.amount.toNumber()).toBe(0);
    // Crucial: EAC does NOT double-count! It remains exactly 1,225,000 QAR
    expect(lifecycle.step3Committed.estimateAtCompletion.amount.toNumber()).toBe(1225000);

    // 10d. Step 4 (Actual Cost): Invoice posted for 25,000 QAR
    expect(lifecycle.step4Actual.currentBudget.amount.toNumber()).toBe(1225000);
    expect(lifecycle.step4Actual.committedCost.amount.toNumber()).toBe(0);
    expect(lifecycle.step4Actual.actualCost.amount.toNumber()).toBe(25000);
    expect(lifecycle.step4Actual.forecastToComplete.amount.toNumber()).toBe(1200000);
    // EAC = Actual Cost (25,000) + Forecast to Complete (1,200,000) = 1,225,000
    expect(lifecycle.step4Actual.estimateAtCompletion.amount.toNumber()).toBe(1225000);
    // VAC = Current Budget (1,225,000) - EAC (1,225,000) = 0
    expect(lifecycle.step4Actual.varianceAtCompletion.amount.toNumber()).toBe(0);

    // -------------------------------------------------------------------------
    // STEP 11: Issue Outgoing Transmittal with Server-Side Redaction
    // -------------------------------------------------------------------------
    const docNumber = generateDocumentNumber({
      profile: 'e3_standard',
      projectCode,
      discipline: 'rigging',
      documentType: 'drawing',
      sequence: 1,
    });
    expect(docNumber).toBe('E3-DHA26-RIG-DWG-0001');
    requirement.linkedDocumentNumber = docNumber;

    const internalTransmittalPack = {
      transmittalNumber: 'TR-DHA26-0001',
      recipientOrganisation: 'Ministry of Culture (Client)',
      recipientName: 'Dr. Hamad Al-Marri',
      purpose: 'for_client_approval',
      items: [
        {
          documentNumber: docNumber,
          title: 'Kinetic Chandelier Suspension & Rigging Layout',
          revisionCode: 'Rev B',
          unitCost: 280000,
          buyRate: 280000,
          unitSellRate: 420000,
          subcontractorCost: 280000,
          subcontractorName: 'Swiss Rigging Dynamics AG',
          supplierName: 'Swiss Rigging Dynamics AG',
          supplierId: 'SUP-SRD-88',
          internalMarginPercent: 33.33,
          markupPercent: 50.0,
          internalNotes: '10% volume discount secured for direct booking.',
          remarks: 'Certified under POL-DES-01 for client final acceptance.',
        },
      ],
    };

    const redactedPack = redactDocumentForClientDistribution(internalTransmittalPack);

    // Verify client deliverables are preserved
    expect(redactedPack.transmittalNumber).toBe('TR-DHA26-0001');
    expect(redactedPack.items[0].documentNumber).toBe('E3-DHA26-RIG-DWG-0001');
    expect(redactedPack.items[0].revisionCode).toBe('Rev B');
    expect(redactedPack.items[0].unitSellRate).toBe(420000);
    expect(redactedPack.items[0].remarks).toBe('Certified under POL-DES-01 for client final acceptance.');

    // Verify all internal margins, buy rates, and supplier identities are scrubbed
    const redactedItem = redactedPack.items[0] as Record<string, any>;
    expect(redactedItem.unitCost).toBeUndefined();
    expect(redactedItem.buyRate).toBeUndefined();
    expect(redactedItem.subcontractorCost).toBeUndefined();
    expect(redactedItem.subcontractorName).toBeUndefined();
    expect(redactedItem.supplierName).toBeUndefined();
    expect(redactedItem.supplierId).toBeUndefined();
    expect(redactedItem.internalMarginPercent).toBeUndefined();
    expect(redactedItem.markupPercent).toBeUndefined();
    expect(redactedItem.internalNotes).toBeUndefined();

    // -------------------------------------------------------------------------
    // STEP 12: Verify 7-Point Traceability Matrix Reports 100% Current-Stage Maturity
    // -------------------------------------------------------------------------
    // In Stage 04 (Concept Design):
    // Required dimensions:
    // - Owner: Tariq Mansoor (Complete)
    // - Target Date: 2026-11-20 (Complete)
    // - Controlled Document: E3-DHA26-RIG-DWG-0001 (Complete)
    // - Design Revision: Rev B (Complete)
    // Downstream dimensions:
    // - BOQ Line Cost (due Stage 05)
    // - Governance Approval (due Stage 06)
    // - Delivery Evidence (due Stage 09)
    const stage04Evaluation = evaluateRequirementTraceability(requirement, { currentStageNumber: 4 });

    // Current-stage maturity is 100%
    expect(stage04Evaluation.currentStageMaturityPct).toBe(100);
    expect(stage04Evaluation.isStageMaturitySatisfied).toBe(true);
    expect(stage04Evaluation.riskRating).toBe('low');

    // Dimensional statuses verify stage awareness
    const ownerDim = stage04Evaluation.dimensions.find((d) => d.key === 'owner');
    const dateDim = stage04Evaluation.dimensions.find((d) => d.key === 'targetDate');
    const docDim = stage04Evaluation.dimensions.find((d) => d.key === 'controlledDocument');
    const desDim = stage04Evaluation.dimensions.find((d) => d.key === 'designVersion');
    const apprDim = stage04Evaluation.dimensions.find((d) => d.key === 'approvalSignoff');
    const delivDim = stage04Evaluation.dimensions.find((d) => d.key === 'deliveryEvidence');

    expect(ownerDim?.status).toBe('Complete');
    expect(dateDim?.status).toBe('Complete');
    expect(docDim?.status).toBe('Complete');
    expect(desDim?.status).toBe('Complete');
    expect(apprDim?.status).toBe('Required Later'); // Not penalizing Stage 04
    expect(delivDim?.status).toBe('Required Later'); // Not penalizing Stage 04

    // Project-wide Traceability Matrix confirms stage maturity
    const matrixReport = generateRequirementsMatrix(projectId, [requirement], { currentStageNumber: 4 });
    expect(matrixReport.currentStageMaturityPct).toBe(100);
    expect(matrixReport.stageMaturitySatisfiedCount).toBe(1);
    expect(matrixReport.totalRequirements).toBe(1);
    expect(matrixReport.applicableRequirements).toBe(1);
    expect(matrixReport.unassignedRequirements).toBe(0);
  });
});
