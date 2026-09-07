import { describe, it, expect, beforeEach } from 'vitest';
import {
  OperationsController,
  shiftRepository,
  attendanceRepository,
  tripRepository,
  permitRepository,
  checkpointRepository,
  openingReleaseRepository,
  incidentRepository,
  handoverRepository,
} from './operations/operations.controller.js';
import {
  FieldSyncController,
  qualificationRepository,
  processedOperationIds,
  mediaUploadRepository,
} from './field-sync/field-sync.controller.js';
import { projectRepository } from './projects/projects.controller.js';
import { FieldSyncEngine } from '@e3-eos/domain';

describe('Phase 04 Integration Tests (AT-055 through AT-065)', () => {
  let operationsController: OperationsController;
  let fieldSyncController: FieldSyncController;

  const agencyOrgId = '11111111-1111-4111-8111-111111111111';
  const projectId = 'prj-p04-festival-01';

  beforeEach(() => {
    operationsController = new OperationsController();
    fieldSyncController = new FieldSyncController();

    shiftRepository.clear();
    attendanceRepository.clear();
    tripRepository.clear();
    permitRepository.clear();
    checkpointRepository.clear();
    openingReleaseRepository.clear();
    incidentRepository.clear();
    handoverRepository.clear();
    qualificationRepository.clear();
    processedOperationIds.clear();
    mediaUploadRepository.clear();
    projectRepository.clear();

    projectRepository.set(projectId, {
      id: projectId,
      organisationId: agencyOrgId,
      projectCode: 'P04-FESTIVAL-01',
      title: 'Qatar National Day Mega Stage',
      description: 'Stadium live performance and drone show',
      originCode: 'DIRECT_AWARD',
      ownerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      maturity: 'in_delivery',
      outcome: 'undetermined',
      financialAssumptions: {
        currency: 'QAR',
        expectedRevenueMax: '5000000',
        estimatedCost: '3500000',
      },
      rowVersion: 1,
    });
  });

  const agencyReq = {
    headers: { 'x-request-id': 'req-test-p04', 'x-user-id': 'usr-ops-lead' },
    organisationId: agencyOrgId,
    userId: 'usr-ops-lead',
  } as any;

  // --- AT-055: Worker Qualification Revocation During Offline Operations ---
  describe('AT-055: Worker Qualification Revocation During Offline Operations', () => {
    it('records offline actions as observations flagged for supervisor review when qualification was revoked on server', () => {
      // 1. Worker initially has a valid qualification on server
      const qualRes = fieldSyncController.createQualification(
        {
          workerId: 'wrk-rig-01',
          qualificationType: 'Lead Rigger Level 3',
          certificateNumber: 'CERT-RIG-9901',
          validUntil: '2027-01-01T00:00:00Z',
          status: 'active',
        },
        agencyReq
      );
      const qualId = qualRes.data.id;

      // 2. While field device is offline, server revokes qualification due to safety audit
      fieldSyncController.revokeQualification(
        qualId,
        { reason: 'Failed periodic harness safety re-certification' },
        agencyReq
      );

      // 3. Device reconnects and uploads queued offline action (e.g. safety-critical truss sign-off)
      const syncRes = fieldSyncController.syncBatch(
        {
          deviceId: 'pwa-field-tab-01',
          operations: [
            {
              clientOperationId: 'op-rig-signoff-101',
              entityType: 'task_completion',
              action: 'SIGN_OFF_TRUSS_GRID',
              clientTimestamp: '2026-10-01T14:30:00Z',
              workerId: 'wrk-rig-01',
              payload: { trussId: 'truss-north-01', loadTestedKg: 4500 },
            },
          ],
        },
        agencyReq
      );

      // 4. Invariant: Action is retained as observation flagged for review, NOT authoritative acceptance
      expect(syncRes.data.status).toBe('completed');
      expect(syncRes.data.payload?.processedCount).toBe(1);
      const opResult = syncRes.data.payload?.results[0];
      expect(opResult?.status).toBe('observation_flagged_for_review');
      expect(opResult?.reason).toContain('revoked');
    });
  });

  // --- AT-056: Offline Sync Deduplication (Per-Operation Deduplication) ---
  describe('AT-056: Offline Sync Deduplication', () => {
    it('ensures repeated replays of offline operations are deduplicated idempotently', () => {
      const batch1 = {
        deviceId: 'pwa-device-crew-01',
        operations: [
          {
            clientOperationId: 'op-att-001',
            entityType: 'attendance',
            action: 'CHECK_IN',
            clientTimestamp: '2026-10-01T07:00:00Z',
            workerId: 'wrk-stagehand-01',
            payload: { gate: 'Crew Gate 4' },
          },
          {
            clientOperationId: 'op-att-002',
            entityType: 'attendance',
            action: 'CHECK_IN',
            clientTimestamp: '2026-10-01T07:05:00Z',
            workerId: 'wrk-stagehand-02',
            payload: { gate: 'Crew Gate 4' },
          },
        ],
      };

      // First batch sync
      const res1 = fieldSyncController.syncBatch(batch1, agencyReq);
      expect(res1.data.payload?.processedCount).toBe(2);
      expect(res1.data.payload?.ignoredCount).toBe(0);
      expect(res1.data.payload?.results.every((r) => r.status === 'applied')).toBe(true);

      // Second batch replaying op-att-002 and sending a new op-att-003
      const batch2 = {
        deviceId: 'pwa-device-crew-01',
        operations: [
          {
            clientOperationId: 'op-att-002', // duplicate replay
            entityType: 'attendance',
            action: 'CHECK_IN',
            clientTimestamp: '2026-10-01T07:05:00Z',
            workerId: 'wrk-stagehand-02',
            payload: { gate: 'Crew Gate 4' },
          },
          {
            clientOperationId: 'op-att-003', // new
            entityType: 'attendance',
            action: 'CHECK_IN',
            clientTimestamp: '2026-10-01T07:10:00Z',
            workerId: 'wrk-stagehand-03',
            payload: { gate: 'Crew Gate 4' },
          },
        ],
      };

      const res2 = fieldSyncController.syncBatch(batch2, agencyReq);
      expect(res2.data.payload?.processedCount).toBe(1);
      expect(res2.data.payload?.ignoredCount).toBe(1);

      const op2Result = res2.data.payload?.results.find((r) => r.clientOperationId === 'op-att-002');
      const op3Result = res2.data.payload?.results.find((r) => r.clientOperationId === 'op-att-003');

      expect(op2Result?.status).toBe('duplicate_ignored');
      expect(op2Result?.reason).toContain('already processed');
      expect(op3Result?.status).toBe('applied');
    });
  });

  // --- AT-057: Incomplete Photo / Media Upload Verification ---
  describe('AT-057: Incomplete Photo / Media Upload Verification', () => {
    it('marks evidence as pending binary upload until full bytes and binary completion flag arrive', () => {
      // 1. Create upload intent for 5MB high-res inspection image
      const intentRes = fieldSyncController.createMediaIntent(
        {
          storageKey: 'evidence/inspections/rig-truss-photo-01.jpg',
          expectedBytes: 5242880,
          linkedTaskOrInspectionId: 'chk-rig-north-01',
        },
        agencyReq
      );
      const uploadId = intentRes.data.id;
      expect(intentRes.data.status).toBe('pending_binary_upload');

      // 2. Interrupted binary upload (only 2MB transferred, isBinaryComplete: false)
      const partialRes = fieldSyncController.completeMediaUpload(
        uploadId,
        {
          receivedBytes: 2097152,
          isBinaryComplete: false,
        },
        agencyReq
      );
      expect(partialRes.data.status).toBe('pending_binary_upload');
      expect(partialRes.data.payload?.isFullyVerified).toBe(false);

      // 3. Client attempts task sign-off verification with incomplete binary
      const verifyEngineState = FieldSyncEngine.verifyMediaCompletion(
        mediaUploadRepository.get(uploadId)!
      );
      expect(verifyEngineState.isFullyVerified).toBe(false);
      expect(verifyEngineState.evidenceState).toBe('pending_binary_upload');

      // 4. Successful resumption and completion (5MB, isBinaryComplete: true)
      const completeRes = fieldSyncController.completeMediaUpload(
        uploadId,
        {
          receivedBytes: 5242880,
          isBinaryComplete: true,
        },
        agencyReq
      );
      expect(completeRes.data.status).toBe('verified_complete');
      expect(completeRes.data.payload?.isFullyVerified).toBe(true);
    });
  });

  // --- AT-058: Contingency Disclosure on Storage Eviction / Revoked Session ---
  describe('AT-058: Contingency Disclosure on Storage Eviction / Revoked Session', () => {
    it('truthfully discloses offline storage limitations and contingency protocols on query', () => {
      const res = fieldSyncController.getStorageContingencyDisclosure(agencyReq);
      expect(res.data.status).toBe('disclosed');
      expect(res.data.payload?.disclosure).toContain('offline PWA device storage cannot guarantee');
      expect(res.data.payload?.disclosure).toContain('manual supervisor contingency protocols');
    });
  });

  // --- AT-059: Readiness Checkpoint Critical Condition Gate ---
  describe('AT-059: Readiness Checkpoint Critical Condition Gate', () => {
    it('blocks opening release even at 90%+ completion if a single critical condition is unresolved', () => {
      // 1. Add 9 passed non-critical checkpoints (e.g. branding, waste bins, hospitality)
      for (let i = 1; i <= 9; i++) {
        operationsController.addReadinessCheckpoint(
          projectId,
          {
            zone: 'Zone-Alpha',
            title: `Checklist Item ${i}`,
            isCritical: false,
            status: 'passed',
            inspectorId: 'usr-ops-lead',
          },
          agencyReq
        );
      }

      // 2. Add 1 critical safety checkpoint still pending (e.g. Emergency Exit Signage Illuminated)
      const critRes = operationsController.addReadinessCheckpoint(
        projectId,
        {
          zone: 'Zone-Alpha',
          title: 'Emergency Exit Route Illumination and Clear Egress',
          isCritical: true,
          status: 'pending',
          notes: 'Power feed to Gate 3 emergency light pending secondary generator switchover',
        },
        agencyReq
      );
      const critId = critRes.data.id;

      // 3. Evaluate readiness: 90% completed (9/10), but canReleaseToOpen must be false!
      const evalRes = operationsController.getReadiness(projectId, agencyReq);
      expect(evalRes.data.status).toBe('not_ready');
      expect(evalRes.data.payload?.completionPercentage).toBe(90);
      expect(evalRes.data.payload?.canReleaseToOpen).toBe(false);
      expect(evalRes.data.payload?.unresolvedCriticalCheckpoints.length).toBe(1);

      // 4. Attempt to trigger opening release - must be blocked with 403 FORBIDDEN
      expect(() =>
        operationsController.releaseToOpen(
          projectId,
          {
            zone: 'Zone-Alpha',
            releasedBy: 'usr-ops-lead',
          },
          agencyReq
        )
      ).toThrowError(/OPENING_RELEASE_BLOCKED/);

      // 5. Inspect and pass the critical condition
      const checkpoint = checkpointRepository.get(critId)!;
      checkpoint.status = 'passed';
      checkpoint.inspectedAt = new Date();
      checkpointRepository.set(critId, checkpoint);

      // 6. Now readiness is 100% and release succeeds
      const releaseRes = operationsController.releaseToOpen(
        projectId,
        {
          zone: 'Zone-Alpha',
          releasedBy: 'usr-ops-lead',
        },
        agencyReq
      );
      expect(releaseRes.data.status).toBe('released');
      expect(releaseRes.data.payload?.decision).toBe('released');
    });
  });

  // --- AT-060: Alternative Physical Route for Regulatory Permits ---
  describe('AT-060: Alternative Physical Route for Regulatory Permits', () => {
    it('authorises regulatory permit via verified physical route without requiring digital upload', () => {
      // 1. Record civil defence permit initially absent / without upload
      const pmtRes = operationsController.recordPermit(
        projectId,
        {
          authorityName: 'Qatar Civil Defence (General Directorate of Civil Defence)',
          permitType: 'Temporary Stage & Flame Effect Authorization',
          permitNumber: 'QCDD-2026-F099',
          status: 'absent',
          hasDigitalUpload: false,
        },
        agencyReq
      );
      const pmtId = pmtRes.data.id;

      // 2. Verify alternative physical on-site wet ink stamp by civil defence officer
      const altRes = operationsController.verifyAlternativePermit(
        projectId,
        pmtId,
        {
          verifiedBy: 'Captain Al-Kuwari (QCDD On-site Inspector #402)',
          method: 'PHYSICAL_INSPECTION_WET_STAMP',
          physicalDocReference: 'ORIGINAL_HARDCOPY_BINDER_DOC_04',
        },
        agencyReq
      );

      expect(altRes.data.status).toBe('alternative_verified');
      expect(altRes.data.payload?.hasDigitalUpload).toBe(false);

      // 3. Domain engine confirms authorization without digital upload
      const permitObj = permitRepository.get(pmtId)!;
      const readinessCheck = FieldSyncEngine.validatePermitReadiness(permitObj);
      expect(readinessCheck.isAuthorised).toBe(true);
      expect(readinessCheck.reason).toContain('ORIGINAL_HARDCOPY_BINDER_DOC_04');
    });
  });

  // --- AT-061: Absent External Regulatory Approval Blocks Release ---
  describe('AT-061: Absent External Regulatory Approval Blocks Release', () => {
    it('blocks opening release when external regulatory approval is absent regardless of administrative override', () => {
      // 1. Record an absent mandatory regulatory permit
      operationsController.recordPermit(
        projectId,
        {
          authorityName: 'Ministry of Municipality (Public Event Space Clearance)',
          permitType: 'Public Realm Temporary Occupancy License',
          status: 'absent',
          hasDigitalUpload: false,
        },
        agencyReq
      );

      // 2. Attempt opening release
      expect(() =>
        operationsController.releaseToOpen(
          projectId,
          {
            zone: 'All-Zones',
            releasedBy: 'usr-senior-director',
          },
          agencyReq
        )
      ).toThrowError(/OPENING_BLOCKED_REGULATORY_PERMIT_ABSENT/);
    });
  });

  // --- AT-062: Logistics Transport, Setup, and Return Window Conflict Detection ---
  describe('AT-062: Logistics Transport, Setup, and Return Window Conflict Detection', () => {
    it('detects vehicle conflict on full operational lifecycle window rather than event showtime alone', () => {
      // Trip 1: Loading at warehouse 08:00, show 18:00-22:00, bump out & warehouse return inspection until 06:00 next day
      operationsController.createTrip(
        projectId,
        {
          vehicleId: 'VEH-FLATBED-40FT-01',
          driverId: 'drv-ahmed-01',
          loadingStart: '2026-10-01T08:00:00Z',
          travelStart: '2026-10-01T12:00:00Z',
          venueArrival: '2026-10-01T14:00:00Z',
          eventStart: '2026-10-01T18:00:00Z',
          eventEnd: '2026-10-01T22:00:00Z',
          bumpOutEnd: '2026-10-02T02:00:00Z',
          returnInspectionEnd: '2026-10-02T06:00:00Z',
        },
        agencyReq
      );

      // Trip 2: Show is later on 2026-10-02 at 20:00 (no event hour clash),
      // BUT loading begins at 2026-10-02T04:00:00Z before Trip 1 return inspection completes!
      expect(() =>
        operationsController.createTrip(
          projectId,
          {
            vehicleId: 'VEH-FLATBED-40FT-01',
            driverId: 'drv-khalid-02',
            loadingStart: '2026-10-02T04:00:00Z', // Clashes with Trip 1 return window (until 06:00)
            travelStart: '2026-10-02T10:00:00Z',
            venueArrival: '2026-10-02T14:00:00Z',
            eventStart: '2026-10-02T20:00:00Z',
            eventEnd: '2026-10-02T23:00:00Z',
            bumpOutEnd: '2026-10-03T03:00:00Z',
            returnInspectionEnd: '2026-10-03T07:00:00Z',
          },
          agencyReq
        )
      ).toThrowError(/LOGISTICS_CONFLICT/);
    });
  });

  // --- AT-063: Crew Shift Rest Period Evaluation ---
  describe('AT-063: Crew Shift Rest Period Evaluation', () => {
    it('flags warning when rest period between consecutive shifts is less than 11 hours', () => {
      // Shift 1: Night shift ending at 02:00 AM
      operationsController.createShift(
        projectId,
        {
          workerId: 'wrk-audio-lead-01',
          role: 'FOH Sound Engineer',
          windowStart: '2026-10-01T16:00:00Z',
          windowEnd: '2026-10-02T02:00:00Z',
        },
        agencyReq
      );

      // Shift 2: Morning shift starting at 10:00 AM (8 hours rest provided, < 11h required)
      const res = operationsController.createShift(
        projectId,
        {
          workerId: 'wrk-audio-lead-01',
          role: 'FOH Sound Engineer',
          windowStart: '2026-10-02T10:00:00Z',
          windowEnd: '2026-10-02T18:00:00Z',
        },
        agencyReq
      );

      expect(res.data.status).toBe('scheduled');
      expect(res.data.payload?.restViolationWarning).toContain('REST_PERIOD_VIOLATION_EXCEPTION');
      expect(res.data.payload?.restViolationWarning).toContain('8 hours rest');
    });
  });

  // --- AT-064: Incident Log Audience Projections ---
  describe('AT-064: Incident Log Audience Projections', () => {
    it('strips sensitive personal narratives for client and public views while preserving internal details', () => {
      // 1. Capture incident with confidential medical detail
      operationsController.captureIncident(
        projectId,
        {
          title: 'Generator Exhaust Carbon Monoxide Alarm Trigger',
          severity: 'high',
          operationalImpact: 'Zone B backstage evacuated for 20 minutes; secondary fan deployed',
          restrictedPersonalNarrative:
            'Stagehand Tariq experienced dizziness and was treated with oxygen by Hamad Medical ambulance crew on-site.',
          reportedBy: 'usr-hse-director',
        },
        agencyReq
      );

      // 2. Query as internal command
      const internalReq = {
        ...agencyReq,
        headers: { ...agencyReq.headers, 'x-audience': 'internal_command' },
      };
      const internalRes = operationsController.getIncidents(projectId, internalReq);
      const internalIncident = internalRes.data.payload?.[0];
      expect(internalIncident.restrictedPersonalNarrative).toContain('Stagehand Tariq');

      // 3. Query as client portal
      const clientReq = {
        ...agencyReq,
        headers: { ...agencyReq.headers, 'x-audience': 'client_portal' },
      };
      const clientRes = operationsController.getIncidents(projectId, clientReq);
      const clientIncident = clientRes.data.payload?.[0];
      expect(clientIncident.restrictedPersonalNarrative).toBeUndefined();
      expect(clientIncident.operationalImpact).toContain('Zone B backstage evacuated');

      // 4. Query as public report
      const publicReq = {
        ...agencyReq,
        headers: { ...agencyReq.headers, 'x-audience': 'public_report' },
      };
      const publicRes = operationsController.getIncidents(projectId, publicReq);
      const publicIncident = publicRes.data.payload?.[0];
      expect(publicIncident.restrictedPersonalNarrative).toBeUndefined();
    });
  });

  // --- AT-065: Venue Handover Decoupled from Event Delivery Completion ---
  describe('AT-065: Venue Handover Decoupled from Event Delivery Completion', () => {
    it('truthfully decouples event delivery completion from venue reinstatement and open damage claims', () => {
      // Record handover where delivery is complete, but venue has open turf damage claims and deposit held
      const handoverRes = operationsController.recordVenueHandover(
        projectId,
        {
          deliveryCompleted: true,
          venueReinstatementStatus: 'remedial_required',
          openDamageClaims: [
            {
              claimId: 'clm-stadium-turf-01',
              description: 'Heavy crane outrigger impressions on stadium pitch turf',
              estimatedCost: 35000,
              resolved: false,
            },
          ],
          depositStatus: 'held',
        },
        agencyReq
      );

      expect(handoverRes.data.payload?.deliveryCompleted).toBe(true);
      expect(handoverRes.data.payload?.venueReinstatementStatus).toBe('remedial_required');
      expect(handoverRes.data.payload?.depositStatus).toBe('held');
      expect(handoverRes.data.payload?.openDamageClaims.length).toBe(1);
      expect(handoverRes.data.payload?.openDamageClaims[0].resolved).toBe(false);
    });
  });
});
