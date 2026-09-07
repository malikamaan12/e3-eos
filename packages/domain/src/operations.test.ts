import { describe, it, expect } from 'vitest';
import {
  ReadinessEngine,
  ReadinessCheckpoint,
  LogisticsWindowEvaluator,
  LogisticsTrip,
  CrewShiftEvaluator,
  Shift,
  IncidentProjectionEngine,
  IncidentRecord,
  HandoverEvaluator,
  VenueHandoverRecord,
  FieldSyncEngine,
  QueuedFieldOperation,
  WorkerQualification,
  MediaUploadState,
  RegulatoryPermit,
} from './index.js';

describe('AT-059: Readiness Matrix & Critical Condition Gate', () => {
  it('blocks opening release when 99% tasks complete but 1 critical inspection is unresolved', () => {
    // 100 checkpoints: 99 non-critical passed, 1 critical unresolved
    const checkpoints: ReadinessCheckpoint[] = [];

    // 99 passed checkpoints
    for (let i = 1; i <= 99; i++) {
      checkpoints.push({
        id: `chk-${i}`,
        zone: 'Zone-A-Dome',
        title: `Fixture Checkpoint #${i}`,
        isCritical: false,
        status: 'passed',
      });
    }

    // 1 unresolved critical checkpoint (e.g. Civil Defense Emergency Fire Exit Sign-Off)
    checkpoints.push({
      id: 'chk-crit-100',
      zone: 'Zone-A-Dome',
      title: 'Civil Defense Emergency Fire Exit Clearance',
      isCritical: true,
      status: 'pending',
    });

    const evalResult = ReadinessEngine.evaluateReadiness('Zone-A-Dome', checkpoints);

    // Invariant (AT-059): Completion is 99%, but canReleaseToOpen is FALSE!
    expect(evalResult.completionPercentage).toBe(99);
    expect(evalResult.unresolvedCriticalCheckpoints.length).toBe(1);
    expect(evalResult.canReleaseToOpen).toBe(false);

    expect(() => {
      ReadinessEngine.assertOpeningRelease('Zone-A-Dome', checkpoints);
    }).toThrow(/OPENING_RELEASE_BLOCKED_CRITICAL_UNRESOLVED/);
  });

  it('allows opening release only when all critical checkpoints have passed', () => {
    const checkpoints: ReadinessCheckpoint[] = [
      {
        id: 'chk-1',
        zone: 'Zone-B',
        title: 'Primary Structural Load Test',
        isCritical: true,
        status: 'passed',
      },
      {
        id: 'chk-2',
        zone: 'Zone-B',
        title: 'Stage Aesthetics & Painting',
        isCritical: false,
        status: 'pending', // non-critical pending
      },
    ];

    const evalResult = ReadinessEngine.evaluateReadiness('Zone-B', checkpoints);
    expect(evalResult.canReleaseToOpen).toBe(true);
    expect(() => ReadinessEngine.assertOpeningRelease('Zone-B', checkpoints)).not.toThrow();
  });
});

describe('AT-062: Logistics Planning Window Conflict', () => {
  it('detects vehicle conflict across full operational lifecycle window (loading to return)', () => {
    // Trip 1: Loading at Nov 01 08:00, public event Nov 02 18:00-22:00, return inspection Nov 03 14:00
    const trip1: LogisticsTrip = {
      id: 'trip-01',
      projectId: 'prj-festival-1',
      vehicleId: 'VEH-TRUCK-40T',
      driverId: 'DRV-ALI-01',
      loadingStart: new Date('2026-11-01T08:00:00Z'),
      travelStart: new Date('2026-11-01T12:00:00Z'),
      venueArrival: new Date('2026-11-01T15:00:00Z'),
      eventStart: new Date('2026-11-02T18:00:00Z'),
      eventEnd: new Date('2026-11-02T22:00:00Z'),
      bumpOutEnd: new Date('2026-11-03T10:00:00Z'),
      returnInspectionEnd: new Date('2026-11-03T14:00:00Z'),
    };

    // Trip 2: Project 2 attempts to book truck on Nov 03 09:00 (during bump-out of Trip 1)
    // Public event hours for Trip 1 ended Nov 02, but truck is still occupied until Nov 03 14:00!
    const trip2: LogisticsTrip = {
      id: 'trip-02',
      projectId: 'prj-concert-2',
      vehicleId: 'VEH-TRUCK-40T',
      driverId: 'DRV-OMAR-02',
      loadingStart: new Date('2026-11-03T09:00:00Z'),
      travelStart: new Date('2026-11-03T11:00:00Z'),
      venueArrival: new Date('2026-11-03T13:00:00Z'),
      eventStart: new Date('2026-11-04T18:00:00Z'),
      eventEnd: new Date('2026-11-04T21:00:00Z'),
      bumpOutEnd: new Date('2026-11-05T08:00:00Z'),
      returnInspectionEnd: new Date('2026-11-05T12:00:00Z'),
    };

    // Invariant (AT-062): Conflict detected on full operational window
    expect(() => {
      LogisticsWindowEvaluator.checkOperationalConflict(trip2, [trip1]);
    }).toThrow(/VEHICLE_WINDOW_CONFLICT/);
  });
});

describe('AT-063: Crew Rest Periods and Shift Constraints', () => {
  it('flags rest period violations when less than 11 hours rest is provided between shifts', () => {
    const shift1: Shift = {
      id: 's1',
      workerId: 'wrk-sound-eng-1',
      role: 'FOH Sound Engineer',
      windowStart: new Date('2026-10-10T14:00:00Z'),
      windowEnd: new Date('2026-10-10T23:00:00Z'), // Ends 23:00
    };

    // Next shift starts at 07:00 next morning (only 8 hours rest provided, less than 11h)
    const shift2: Shift = {
      id: 's2',
      workerId: 'wrk-sound-eng-1',
      role: 'FOH Sound Engineer',
      windowStart: new Date('2026-10-11T07:00:00Z'),
      windowEnd: new Date('2026-10-11T16:00:00Z'),
    };

    const evalResult = CrewShiftEvaluator.validateShiftRestInterval(shift2, [shift1], 11);
    expect(evalResult.hasRestViolation).toBe(true);
    expect(evalResult.restHoursProvided).toBe(8);
  });
});

describe('AT-064: Incident Logging Audience Separation', () => {
  it('strips sensitive personal and medical narratives when projecting to client portal or public report', () => {
    const incident: IncidentRecord = {
      id: 'inc-01',
      projectId: 'prj-festival',
      title: 'Scaffold Tower Slip and Minor Injury',
      severity: 'medium',
      operationalImpact: 'Tower work paused for 45 minutes for safety inspection. Tower certified safe.',
      restrictedPersonalNarrative:
        'Worker John Doe (QID: 123456789) experienced mild ankle sprain, treated at Al Ahli Hospital and prescribed 3 days medical leave.',
      reportedAt: new Date('2026-10-15T16:00:00Z'),
      reportedBy: 'usr-safety-lead',
    };

    // Internal command view retains full details
    const internalView = IncidentProjectionEngine.projectIncident(incident, 'internal_command');
    expect(internalView.restrictedPersonalNarrative).toContain('John Doe');

    // Client portal projection strictly filters personal details (AT-064)
    const clientView = IncidentProjectionEngine.projectIncident(incident, 'client_portal');
    expect(clientView.restrictedPersonalNarrative).toBeUndefined();
    expect(clientView.operationalImpact).toBe(incident.operationalImpact);
    expect(clientView.severity).toBe('medium');
  });
});

describe('AT-065: Service Delivery vs Venue Handover & Damage Claims Decoupling', () => {
  it('ensures delivery completed is not assumed to be financially settled or venue accepted', () => {
    const record: VenueHandoverRecord = {
      id: 'vhr-01',
      projectId: 'prj-gala',
      deliveryCompleted: true, // Event delivered successfully
      venueReinstatementStatus: 'remedial_required', // Turf damaged by heavy cranes
      openDamageClaims: [
        {
          claimId: 'claim-turf-01',
          description: 'Turf reseeding required by Stadium Management',
          estimatedCost: 25000,
          resolved: false,
        },
      ],
      depositStatus: 'held', // Deposit not released yet
    };

    // Invariant (AT-065): Project is not financially settled
    expect(HandoverEvaluator.isFinanciallySettled(record)).toBe(false);
  });
});

describe('AT-055: Worker Qualification Revoked Offline', () => {
  it('retains attendance observation for review but denies authoritative release', () => {
    const revokedQualification: WorkerQualification = {
      id: 'q-rig-01',
      workerId: 'wrk-rigger-99',
      qualificationType: 'IRATA_LEVEL_3',
      certificateNumber: 'CERT-IRATA-9988',
      validUntil: new Date('2027-01-01'),
      status: 'revoked', // Revoked while device was offline
      revokedAt: new Date(),
    };

    const op: QueuedFieldOperation = {
      clientOperationId: 'op-sync-rigger-01',
      entityType: 'attendance',
      action: 'check_in',
      clientTimestamp: new Date(),
      workerId: 'wrk-rigger-99',
      payload: { role: 'Lead High Rigging Inspector' },
    };

    const result = FieldSyncEngine.processWorkerActionWithQualification(op, revokedQualification);
    // Invariant (AT-055): Observation retained for supervisor review, but status is not applied
    expect(result.status).toBe('observation_flagged_for_review');
    expect(result.reason).toContain('Worker qualification is revoked');
  });
});

describe('AT-056: Offline Operations Deduplication', () => {
  it('ignores duplicate operations and avoids overwriting accepted records', () => {
    const processed = new Set<string>();
    const op: QueuedFieldOperation = {
      clientOperationId: 'op-unique-1234',
      entityType: 'task_completion',
      action: 'complete',
      clientTimestamp: new Date(),
      workerId: 'wrk-1',
      payload: { taskId: 'task-led-setup' },
    };

    const res1 = FieldSyncEngine.processOperationWithDeduplication(op, processed);
    expect(res1.status).toBe('applied');

    // Repeated operation replay
    const res2 = FieldSyncEngine.processOperationWithDeduplication(op, processed);
    expect(res2.status).toBe('duplicate_ignored');
  });
});

describe('AT-057: Incomplete Photo Binary Upload', () => {
  it('marks evidence as pending_binary_upload and prevents false completion verification', () => {
    const media: MediaUploadState = {
      uploadId: 'med-upload-01',
      storageKey: 'evidence/rigging-truss-pin.jpg',
      expectedBytes: 4194304, // 4MB
      receivedBytes: 1048576, // Only 1MB received (interrupted network)
      isBinaryComplete: false,
      linkedTaskOrInspectionId: 'task-rig-inspection',
    };

    const verification = FieldSyncEngine.verifyMediaCompletion(media);
    // Invariant (AT-057): Incomplete upload leaves state pending; not accepted as verified
    expect(verification.isFullyVerified).toBe(false);
    expect(verification.evidenceState).toBe('pending_binary_upload');
  });
});

describe('AT-060 & AT-061: Permit Verification Invariants', () => {
  it('allows alternative physical verification without digital upload (AT-060)', () => {
    const permit: RegulatoryPermit = {
      id: 'pmt-civil-defense',
      projectId: 'prj-festival',
      authorityName: 'Qatar General Directorate of Civil Defence',
      permitType: 'Temporary Structure Occupancy Clearance',
      status: 'alternative_verified',
      hasDigitalUpload: false, // No digital PDF uploaded yet
      alternativeVerification: {
        verifiedBy: 'usr-hse-lead',
        verifiedAt: new Date(),
        method: 'physical_stamp_witnessed',
        physicalDocReference: 'QCDD-STAMP-BOOK-2026/8891',
      },
    };

    const check = FieldSyncEngine.validatePermitReadiness(permit);
    expect(check.isAuthorised).toBe(true);
    expect(check.reason).toContain('Authorised via verified alternative method');
  });

  it('rejects activity when regulatory approval is absent without administrative grace bypass (AT-061)', () => {
    const permit: RegulatoryPermit = {
      id: 'pmt-airspace',
      projectId: 'prj-festival',
      authorityName: 'Qatar Civil Aviation Authority',
      permitType: 'Low Altitude Drone Display Permit',
      status: 'absent',
      hasDigitalUpload: false,
    };

    // Invariant (AT-061): Absent approval strictly blocks release; no grace period allowed
    expect(() => {
      FieldSyncEngine.validatePermitReadiness(permit);
    }).toThrow(/REGULATORY_APPROVAL_ABSENT/);
  });
});
