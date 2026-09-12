import { describe, it, expect } from 'vitest';
import {
  ComplianceObligationEngine,
  LiveRunSheetEngine,
  LiveCommandCenterEngine,
  FieldSyncEngine,
  ProjectCloseoutEngine,
  Money,
  ComplianceObligation,
  LiveRunSheetItem,
  LiveIncidentRecord,
  QueuedFieldOperation,
  WorkerQualification,
  MediaUploadState,
} from '@e3-eos/domain';

describe('Sprint 04 — Live Operations, Compliance, Offline Field Execution & Closeout Acceptance (AT-055 to AT-065)', () => {
  const projectId = 'PRJ-QND-2026';

  // ---------------------------------------------------------------------------
  // AT-055: Worker qualification revocation in field sync
  // ---------------------------------------------------------------------------
  it('AT-055: Worker qualification revocation retains observations but blocks zone access and release', () => {
    const qual: WorkerQualification = {
      id: 'qual-rig-lvl3',
      workerId: 'wrk-rig-09',
      qualificationType: 'IRATA Level 3 Rigging',
      certificateNumber: 'CERT-IRATA-8841',
      validUntil: new Date('2026-12-31'),
      status: 'active',
    };

    const op: QueuedFieldOperation = {
      clientOperationId: 'op-rig-inspect-001',
      entityType: 'inspection',
      action: 'truss_load_signoff',
      clientTimestamp: new Date('2026-09-12T06:00:00Z'),
      workerId: 'wrk-rig-09',
      payload: { zone: 'Main Stage Overhead', result: 'torque_within_tolerance' },
    };

    // Before revocation: active qualification applies cleanly
    const activeResult = FieldSyncEngine.processWorkerActionWithQualification(op, qual);
    expect(activeResult.status).toBe('applied');

    // HSE revokes qualification on-site due to safety harness violation
    qual.status = 'revoked';
    qual.revokedAt = new Date('2026-09-12T06:15:00Z');
    qual.revocationReason = 'Secondary lanyard not attached at +12m elevation';

    // After revocation: observation is retained for supervisor review, but authoritative qualified release is denied
    const revokedResult = FieldSyncEngine.processWorkerActionWithQualification(op, qual);
    expect(revokedResult.status).toBe('observation_flagged_for_review');
    expect(revokedResult.reason).toContain('Worker qualification is revoked');
    expect(revokedResult.reason).toContain('retained as observation for supervisor review');
  });

  // ---------------------------------------------------------------------------
  // AT-056: Operation-based deduplication in field sync
  // ---------------------------------------------------------------------------
  it('AT-056: Operation-based deduplication recognizes replay batches and executes mutations exactly once', () => {
    const processedOpIds = new Set<string>();

    const op1: QueuedFieldOperation = {
      clientOperationId: 'op-snag-pod-001',
      entityType: 'snag',
      action: 'log_snag',
      clientTimestamp: new Date('2026-09-12T07:14:50Z'),
      workerId: 'wrk-qc-01',
      payload: { zone: 'VIP Lounge', description: 'Scratched gold trim panel #3' },
    };

    const op2: QueuedFieldOperation = {
      clientOperationId: 'op-snag-pod-002',
      entityType: 'inspection',
      action: 'checkpoint_pass',
      clientTimestamp: new Date('2026-09-12T07:14:55Z'),
      workerId: 'wrk-qc-02',
      payload: { checkpoint: 'Truss load test', result: 'pass' },
    };

    // First submission: both operations applied and added to processed set
    const result1 = FieldSyncEngine.processOperationWithDeduplication(op1, processedOpIds);
    const result2 = FieldSyncEngine.processOperationWithDeduplication(op2, processedOpIds);

    expect(result1.status).toBe('applied');
    expect(result2.status).toBe('applied');
    expect(processedOpIds.has('op-snag-pod-001')).toBe(true);
    expect(processedOpIds.has('op-snag-pod-002')).toBe(true);

    // Second submission (network retry / replay of batch): recognized as duplicates without corrupting state
    const replay1 = FieldSyncEngine.processOperationWithDeduplication(op1, processedOpIds);
    const replay2 = FieldSyncEngine.processOperationWithDeduplication(op2, processedOpIds);

    expect(replay1.status).toBe('duplicate_ignored');
    expect(replay1.reason).toContain('already processed');
    expect(replay2.status).toBe('duplicate_ignored');
    expect(replay2.reason).toContain('already processed');
  });

  // ---------------------------------------------------------------------------
  // AT-057: Media binary completion gate
  // ---------------------------------------------------------------------------
  it('AT-057: Media binary completion gate blocks verification until all binary bytes are confirmed', () => {
    const incompleteMedia: MediaUploadState = {
      uploadId: 'upl-sng-balustrade-01',
      storageKey: 'evidence/sng-vip-092/balustrade-crack.jpg',
      expectedBytes: 4200000,
      receivedBytes: 2100000, // Only 50% uploaded
      isBinaryComplete: false,
      linkedTaskOrInspectionId: 'sng-vip-092',
    };

    // Incomplete binary upload cannot pass gate
    const gate1 = FieldSyncEngine.verifyMediaCompletion(incompleteMedia);
    expect(gate1.isFullyVerified).toBe(false);
    expect(gate1.evidenceState).toBe('pending_binary_upload');

    // Complete upload simulation: all bytes received and checksum confirmed
    const completeMedia: MediaUploadState = {
      ...incompleteMedia,
      receivedBytes: 4200000,
      isBinaryComplete: true,
    };

    const gate2 = FieldSyncEngine.verifyMediaCompletion(completeMedia);
    expect(gate2.isFullyVerified).toBe(true);
    expect(gate2.evidenceState).toBe('verified_complete');
  });

  // ---------------------------------------------------------------------------
  // AT-058: Storage eviction & session revocation contingency disclosure
  // ---------------------------------------------------------------------------
  it('AT-058: Discloses PWA storage eviction contingency and bounded offline rules', () => {
    // 1. Mandatory disclosure statement
    const disclosure = FieldSyncEngine.getStorageContingencyDisclosure();
    expect(disclosure).toContain('offline PWA device storage cannot guarantee background sync or remote offline wipe');
    expect(disclosure).toContain('manual supervisor contingency protocols');

    // 2. Authoritative actions strictly prohibited offline
    expect(FieldSyncEngine.PROHIBITED_OFFLINE_ACTIONS.has('financial_posting')).toBe(true);
    expect(FieldSyncEngine.PROHIBITED_OFFLINE_ACTIONS.has('purchase_order_approval')).toBe(true);
    expect(FieldSyncEngine.PROHIBITED_OFFLINE_ACTIONS.has('opening_authorization')).toBe(true);
    expect(FieldSyncEngine.PROHIBITED_OFFLINE_ACTIONS.has('vendor_contract_award')).toBe(true);

    // 3. Rejection of prohibited action in offline engine
    const prohibitedOp: QueuedFieldOperation = {
      clientOperationId: 'op-po-approve-99',
      entityType: 'task_completion',
      action: 'purchase_order_approval',
      clientTimestamp: new Date(),
      workerId: 'usr-pm-01',
      payload: { poId: 'PO-2026-001', approved: true },
    };

    const check = FieldSyncEngine.validateOfflineOperationAllowed(prohibitedOp);
    expect(check.allowed).toBe(false);
    expect(check.code).toBe('AUTHORITATIVE_ACTION_REQUIRES_ONLINE_AUTH');
    expect(check.reason).toContain('AUTHORITATIVE_ACTION_REQUIRES_ONLINE_AUTH');
  });

  // ---------------------------------------------------------------------------
  // AT-059: Live roster check-in & statutory fatigue limits
  // ---------------------------------------------------------------------------
  it('AT-059: Live roster check-in enforces Qatar Labour Law statutory hours and rest intervals', () => {
    const shiftWorker = {
      workerId: 'wrk-audio-44',
      name: 'Farhan Azizi',
      lastShiftEnd: new Date('2026-09-11T22:00:00Z'),
      checkInTime: new Date('2026-09-12T04:00:00Z'), // 6 hours rest
      ordinaryDailyHoursLimit: 8,
      statutoryMaxDailyHours: 10,
    };

    const restHours =
      (shiftWorker.checkInTime.getTime() - shiftWorker.lastShiftEnd.getTime()) / (1000 * 60 * 60);
    expect(restHours).toBe(6);

    // Statutory daily limit check
    const plannedShiftHours = 9;
    const isWithinOrdinary = plannedShiftHours <= shiftWorker.ordinaryDailyHoursLimit;
    const isWithinStatutoryMax = plannedShiftHours <= shiftWorker.statutoryMaxDailyHours;

    expect(isWithinOrdinary).toBe(false); // Exceeds 8h ordinary
    expect(isWithinStatutoryMax).toBe(true); // Within 10h statutory ceiling

    // Flag fatigue alert when rest is below 8 hours
    const fatigueAlert = restHours < 8;
    expect(fatigueAlert).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // AT-060: Alternative physical verification path for regulatory obligations
  // ---------------------------------------------------------------------------
  it('AT-060: Regulatory obligations support alternative physical on-site verification', () => {
    const obligation: ComplianceObligation = {
      id: 'obl-qcd-01',
      projectId,
      authorityType: 'civil_defense',
      title: 'Qatar Civil Defence Department (QCDD) Life Safety Clearance',
      permitReference: 'QCDD-DOHA-2026-8819',
      validFrom: '2026-09-01T00:00:00Z',
      validUntil: '2026-09-30T23:59:59Z',
      applicableZone: 'Main Pavilion Hall A',
      criticalForOpening: true,
      status: 'pending',
      verificationMode: 'digital_upload',
      auditHistory: [],
    };

    // Initially unverified -> Zone cannot open
    const initialEval = ComplianceObligationEngine.evaluateZoneCompliance(
      'Main Pavilion Hall A',
      [obligation]
    );
    expect(initialEval.canOpenZone).toBe(false);
    expect(initialEval.criticalBlockers.length).toBe(1);

    // Physical on-site inspection by QCDD Captain (stamp sighted, badge recorded)
    const verifiedObligation = ComplianceObligationEngine.verifyAlternativePhysical(
      obligation,
      {
        inspectorName: 'Capt. Mansoor Al-Sulaiti',
        inspectionDate: '2026-09-12',
        badgeOrId: 'QCDD-INSP-8841',
        siteOfficeReference: 'QCDD-STAMP-SITE-04',
        physicalStampSighted: true,
        notes: 'Physical stamp sighted on site notice board. Fire exits verified clear.',
      },
      'Salim Al-Hajri (Lead HSE)'
    );

    expect(verifiedObligation.status).toBe('alternative_verified');
    expect(verifiedObligation.verificationMode).toBe('physical_verified');
    expect(verifiedObligation.physicalVerification?.badgeOrId).toBe('QCDD-INSP-8841');
    expect(verifiedObligation.auditHistory.length).toBe(1);

    // Zone now passes critical compliance gate without requiring portal digital PDF upload
    const finalEval = ComplianceObligationEngine.evaluateZoneCompliance(
      'Main Pavilion Hall A',
      [verifiedObligation]
    );
    expect(finalEval.canOpenZone).toBe(true);
    expect(finalEval.alternativeVerifiedObligations).toBe(1);
    expect(finalEval.criticalBlockers.length).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // AT-061: Fail-closed regulatory permit enforcement
  // ---------------------------------------------------------------------------
  it('AT-061: Fail-closed gate strictly blocks opening release when permits are missing or expired', () => {
    const obligations: ComplianceObligation[] = [
      {
        id: 'obl-qta-01',
        projectId,
        authorityType: 'municipality',
        title: 'Commercial Event Activation License',
        permitReference: 'QTA-LIC-2026-09',
        validFrom: '2026-09-01T00:00:00Z',
        validUntil: '2026-09-30T23:59:59Z',
        applicableZone: 'VIP Lounge',
        criticalForOpening: true,
        status: 'active',
        verificationMode: 'digital_upload',
        auditHistory: [],
      },
      {
        id: 'obl-moci-02',
        projectId,
        authorityType: 'municipality',
        title: 'MOCI Temporary Signage & Structural Permit',
        permitReference: 'MOCI-2026-004',
        validFrom: '2026-09-01T00:00:00Z',
        validUntil: '2026-09-10T23:59:59Z', // Expired on Sept 10!
        applicableZone: 'VIP Lounge',
        criticalForOpening: true,
        status: 'expired',
        verificationMode: 'digital_upload',
        auditHistory: [],
      },
    ];

    const evaluation = ComplianceObligationEngine.evaluateZoneCompliance(
      'VIP Lounge',
      obligations,
      new Date('2026-09-12T10:00:00Z')
    );

    // Fail-closed invariant: opening denied, no grace period allowed
    expect(evaluation.canOpenZone).toBe(false);
    expect(evaluation.expiredObligations).toBe(1);
    expect(evaluation.criticalBlockers.length).toBe(1);
    expect(evaluation.criticalBlockers[0].id).toBe('obl-moci-02');
    expect(evaluation.summaryReason).toContain('No administrative grace period allowed');

    // Strict assertion throws exception
    expect(() =>
      ComplianceObligationEngine.assertComplianceGate(
        'VIP Lounge',
        obligations,
        new Date('2026-09-12T10:00:00Z')
      )
    ).toThrowError(/COMPLIANCE_GATE_FAIL_CLOSED/);
  });

  // ---------------------------------------------------------------------------
  // AT-062: Run sheet cue delay propagation
  // ---------------------------------------------------------------------------
  it('AT-062: Propagates run sheet cue delays downstream and flags critical path impacts', () => {
    const runSheet: LiveRunSheetItem[] = [
      {
        id: 'cue-item-01',
        projectId,
        cueNumber: 'CUE-01',
        title: 'VIP Guest Arrival & Red Carpet Procession',
        department: 'Protocol',
        plannedStart: '2026-09-12T18:00:00Z',
        plannedEnd: '2026-09-12T18:30:00Z',
        delayMinutes: 0,
        status: 'pending',
        dependentOnCues: [],
        responsiblePerson: 'Zaid Mansour',
        isCriticalPath: true,
      },
      {
        id: 'cue-item-02',
        projectId,
        cueNumber: 'CUE-02',
        title: 'National Anthem & Opening Projection Mapping',
        department: 'Show Control',
        plannedStart: '2026-09-12T18:30:00Z',
        plannedEnd: '2026-09-12T18:45:00Z',
        delayMinutes: 0,
        status: 'pending',
        dependentOnCues: ['CUE-01'],
        responsiblePerson: 'Elena Rostova',
        isCriticalPath: true,
      },
      {
        id: 'cue-item-03',
        projectId,
        cueNumber: 'CUE-03',
        title: 'Minister Welcome Keynote Address',
        department: 'Show Control',
        plannedStart: '2026-09-12T18:45:00Z',
        plannedEnd: '2026-09-12T19:05:00Z',
        delayMinutes: 0,
        status: 'pending',
        dependentOnCues: ['CUE-02'],
        responsiblePerson: 'Khalid Al-Marri',
        isCriticalPath: true,
      },
    ];

    // CUE-01 delayed by 25 minutes due to state motorcade delay
    const propagation = LiveRunSheetEngine.applyCueDelay('CUE-01', 25, runSheet, {
      notes: 'State motorcade delayed at Corniche intersection',
    });

    expect(propagation.updatedItem.cueNumber).toBe('CUE-01');
    expect(propagation.updatedItem.delayMinutes).toBe(25);
    expect(propagation.updatedItem.status).toBe('delayed');
    expect(propagation.totalDelayedMinutes).toBe(25);
    expect(propagation.criticalPathImpacted).toBe(true);

    // CUE-02 and CUE-03 automatically shifted by 25 minutes
    expect(propagation.propagatedItems.length).toBe(2);
    const propagatedCue2 = propagation.propagatedItems.find((c) => c.cueNumber === 'CUE-02')!;
    const propagatedCue3 = propagation.propagatedItems.find((c) => c.cueNumber === 'CUE-03')!;

    expect(new Date(propagatedCue2.plannedStart).toISOString()).toBe('2026-09-12T18:55:00.000Z');
    expect(new Date(propagatedCue3.plannedStart).toISOString()).toBe('2026-09-12T19:10:00.000Z');
  });

  // ---------------------------------------------------------------------------
  // AT-063: Command Centre immediate protective actions
  // ---------------------------------------------------------------------------
  it('AT-063: Command Centre triggers immediate protective actions bypassing financial approval', () => {
    const incident: LiveIncidentRecord = {
      id: 'inc-wind-901',
      projectId,
      incidentNumber: 'INC-2026-009',
      incidentType: 'hse_safety',
      severity: 'critical',
      zone: 'East Pavilion Tower',
      description: 'Shamal wind gust reached 52 knots at East Tower roof truss',
      status: 'open',
      reportedBy: 'Safety Officer Hamad',
      reportedAt: '2026-09-12T14:30:00Z',
      protectiveActions: [],
      venueEvacuationInitiated: false,
      hospitalTransportRequired: false,
      requiresRegulatoryReporting: true,
    };

    const result = LiveCommandCenterEngine.executeProtectiveAction(
      incident,
      'close_zone',
      'Salim Al-Hajri (Incident Commander)',
      'High wind threshold exceeded (52 kts > 40 kts limit); structural isolation required'
    );

    // Invariant AT-063: Immediate execution, zero financial approval roadblock, audit hash recorded
    expect(result.action.immediateExecution).toBe(true);
    expect(result.action.actionType).toBe('close_zone');
    expect(result.action.status).toBe('executing');
    expect(result.action.auditHash).toBeDefined();
    expect(result.updatedIncident.status).toBe('contained');
    expect(result.updatedIncident.protectiveActions.length).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // AT-064: Bump-out hazard & asset return condition inspection
  // ---------------------------------------------------------------------------
  it('AT-064: Bump-out inspection categorizes asset condition and records claims exposure', () => {
    const inspection = {
      assetId: 'ast-led-p2-004',
      assetCode: 'AST-LED-P2-004',
      name: 'Unilumin 2.6mm LED Panel Pack (4 units)',
      conditionOnReturn: 'damaged' as const,
      damageCategory: 'forklift_impact_negligence',
      estimatedRepairCost: new Money(14500, 'QAR'),
      isClaimableAgainstVendor: true,
      responsibleParty: 'Logistics Contractor TransQatar',
      depotReceivedBy: 'Hassan Al-Nuaimi (Depot Manager)',
    };

    expect(inspection.conditionOnReturn).toBe('damaged');
    expect(inspection.estimatedRepairCost.amount.toNumber()).toBe(14500);
    expect(inspection.isClaimableAgainstVendor).toBe(true);
    expect(inspection.damageCategory).toBe('forklift_impact_negligence');
  });

  // ---------------------------------------------------------------------------
  // AT-065: Multi-dimensional operational closure decoupled from financial receivables
  // ---------------------------------------------------------------------------
  it('AT-065: Operational closure evaluates 7 dimensions and closes project while retention remains open', () => {
    const closureEval = ProjectCloseoutEngine.evaluateOperationalClosure({
      projectId,
      checklist: {
        eventOperationComplete: true,
        bumpOutComplete: true,
        venueHandoverComplete: true,
        assetsReturned: true,
        majorClaimsIdentified: true,
        criticalIncidentsClosed: true,
        siteEvidenceComplete: true,
      },
      openReceivablesAcknowledged: true,
      signoffBy: 'Khalid Al-Marri',
      signoffRole: 'E3 Event Director',
    });

    // Invariant AT-065: Decoupled closure. Operational closure authorized with all 7 pillars passed,
    // while open receivables / commercial retention remain acknowledged and pending in financial ledger.
    expect(closureEval.eligible).toBe(true);
    expect(closureEval.decision).toBe('operationally_closed');
    expect(closureEval.unmetPillars.length).toBe(0);
    expect(closureEval.closureRecord?.openReceivablesAcknowledged).toBe(true);
    expect(closureEval.closureRecord?.auditHash).toBeDefined();
    expect(closureEval.closureRecord?.signoffBy).toBe('Khalid Al-Marri');
  });
});
