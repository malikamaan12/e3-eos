import { describe, it, expect, beforeEach } from 'vitest';
import {
  RentalsAdapterEngine,
  RentalsContractSimulator,
  PurchaseTrackerAdapterEngine,
  PurchaseTrackerContractSimulator,
  PortfolioCapacityEngine,
  WebhookSecurityEngine,
} from '@e3-eos/domain';
import {
  EquipmentAvailabilityQueryDto,
  EquipmentReservationRequestDto,
  VendorOnboardingRequestDto,
  PurchaseRequestCreateDto,
} from '@e3-eos/contracts';

describe('E3 EOS — E3 Rentals & PurchaseTracker API Integration & Capacity Planning Suite', () => {
  beforeEach(() => {
    RentalsAdapterEngine.resetForTesting();
    PurchaseTrackerAdapterEngine.resetForTesting();
  });

  // =========================================================================
  // 1. E3 Rentals Adapter: Disconnected State & Honest Badging
  // =========================================================================
  describe('1. E3 Rentals: Disconnected States & Honest Badging', () => {
    it('returns honest not_connected status when connector is disabled in Central Settings', () => {
      const query: EquipmentAvailabilityQueryDto = {
        connectionId: 'rentals-production',
        productPoolId: 'prod-counter-reg-01',
        quantity: 20,
        unit: 'each',
        window: {
          start: '2026-11-15T08:00:00+03:00',
          end: '2026-11-18T18:00:00+03:00',
          timeZone: 'Asia/Qatar',
          basis: 'occupied_including_buffers',
        },
      };

      const result = RentalsAdapterEngine.queryAvailability(query, 'disabled');

      expect(result.connectionStatus).toBe('not_connected');
      expect(result.availableQuantity).toBe(0);
      expect(result.shortfall).toBe(20);
      expect(result.bufferApplied.prepHours).toBe(0);
      expect(result.bufferApplied.returnHours).toBe(0);
    });

    it('rejects firm reservation mutations when connector is disabled or in read-only mode', () => {
      const request: EquipmentReservationRequestDto = {
        demandId: 'demand-r01-01',
        expectedDemandVersion: 1,
        sourceProduct: {
          connectionId: 'rentals-production',
          entityType: 'product',
          externalId: 'prod-counter-reg-01',
        },
        warehouseRef: 'Doha Main Depot',
        quantity: 8,
        unit: 'each',
        purpose: 'internal_project_use',
        requestedState: 'confirmed',
        window: {
          start: '2026-11-15T08:00:00+03:00',
          end: '2026-11-18T18:00:00+03:00',
          timeZone: 'Asia/Qatar',
          basis: 'occupied_including_buffers',
        },
      };

      const resDisabled = RentalsAdapterEngine.submitReservationCommand(
        'EOS-UAT-LIFECYCLE-RUN01',
        'tenant-e3-test',
        'idemp-test-disabled-01',
        request,
        'disabled'
      );
      expect(resDisabled.operation.operationState).toBe('failed');
      expect(resDisabled.operation.businessState).toBe('rejected');
      expect(resDisabled.operation.errorDetail).toContain('CONNECTOR_DISABLED');

      const resReadOnly = RentalsAdapterEngine.submitReservationCommand(
        'EOS-UAT-LIFECYCLE-RUN01',
        'tenant-e3-test',
        'idemp-test-ro-01',
        request,
        'production_read_only'
      );
      expect(resReadOnly.operation.operationState).toBe('failed');
      expect(resReadOnly.operation.errorDetail).toContain('READ_ONLY_MODE');
    });
  });

  // =========================================================================
  // 2. E3 Rentals: Dated Availability & Buffer Windows
  // =========================================================================
  describe('2. E3 Rentals: Dated Availability & Buffer Windows', () => {
    it('evaluates accurate available pool quantity considering overlapping project bookings and buffers', () => {
      // 12 counters in pool; Project B firmly holds 4 for 2026-11-10 to 2026-11-20
      const query: EquipmentAvailabilityQueryDto = {
        connectionId: 'rentals-sandbox',
        productPoolId: 'prod-counter-reg-01',
        quantity: 20,
        unit: 'each',
        window: {
          start: '2026-11-15T08:00:00+03:00',
          end: '2026-11-18T18:00:00+03:00',
          timeZone: 'Asia/Qatar',
          basis: 'occupied_including_buffers',
        },
      };

      const result = RentalsAdapterEngine.queryAvailability(query, 'sandbox');

      expect(result.connectionStatus).toBe('connected');
      expect(result.totalServiceableQuantity).toBe(12);
      expect(result.occupiedQuantity).toBe(4); // Project B hold
      expect(result.availableQuantity).toBe(8); // Exactly 12 - 4 = 8 available
      expect(result.shortfall).toBe(12); // 20 demanded - 8 available = 12 shortfall
      expect(result.warehouseRef).toBe('Doha Main Depot');
    });

    it('applies configurable buffer policy when window basis is event_dates_only', () => {
      const queryEventDates: EquipmentAvailabilityQueryDto = {
        connectionId: 'rentals-sandbox',
        productPoolId: 'prod-counter-reg-01',
        quantity: 8,
        unit: 'each',
        window: {
          start: '2026-11-15T08:00:00+03:00',
          end: '2026-11-18T18:00:00+03:00',
          timeZone: 'Asia/Qatar',
          basis: 'event_dates_only',
        },
        bufferPolicy: {
          prepHours: 12,
          returnHours: 12,
        },
      };

      const result = RentalsAdapterEngine.queryAvailability(queryEventDates, 'sandbox');
      expect(result.bufferApplied.prepHours).toBe(12);
      expect(result.bufferApplied.returnHours).toBe(12);
    });

    it('does not apply buffers twice when window basis is occupied_including_buffers', () => {
      const queryAlreadyBuffered: EquipmentAvailabilityQueryDto = {
        connectionId: 'rentals-sandbox',
        productPoolId: 'prod-counter-reg-01',
        quantity: 8,
        unit: 'each',
        window: {
          start: '2026-11-14T20:00:00+03:00',
          end: '2026-11-19T06:00:00+03:00',
          timeZone: 'Asia/Qatar',
          basis: 'occupied_including_buffers',
        },
        bufferPolicy: {
          prepHours: 24,
          returnHours: 24,
        },
      };

      const result = RentalsAdapterEngine.queryAvailability(queryAlreadyBuffered, 'sandbox');
      expect(result.bufferApplied.prepHours).toBe(0);
      expect(result.bufferApplied.returnHours).toBe(0);
    });
  });

  // =========================================================================
  // 3. E3 Rentals: Idempotent Reservation Commands & Replay Safety
  // =========================================================================
  describe('3. E3 Rentals: Idempotent Reservation Commands', () => {
    const validReservation: EquipmentReservationRequestDto = {
      demandId: 'demand-r01-01',
      expectedDemandVersion: 1,
      sourceProduct: {
        connectionId: 'rentals-sandbox',
        entityType: 'product',
        externalId: 'prod-counter-reg-01',
      },
      warehouseRef: 'Doha Main Depot',
      quantity: 8,
      unit: 'each',
      purpose: 'internal_project_use',
      requestedState: 'confirmed',
      window: {
        start: '2026-11-15T08:00:00+03:00',
        end: '2026-11-18T18:00:00+03:00',
        timeZone: 'Asia/Qatar',
        basis: 'occupied_including_buffers',
      },
    };

    it('successfully confirms reservation when quantity is available', () => {
      const res = RentalsAdapterEngine.submitReservationCommand(
        'EOS-UAT-LIFECYCLE-RUN01',
        'tenant-e3-test',
        'key-res-success-01',
        validReservation,
        'sandbox'
      );

      expect(res.status).toBe('accepted');
      expect(res.operation.operationState).toBe('completed');
      expect(res.operation.businessState).toBe('confirmed');
      expect(res.operation.sourceRecord).toBeDefined();
      expect(res.operation.sourceRecord?.invoiceSuppressed).toBe(true); // internal use suppresses customer billing
    });

    it('safely replays cached result on duplicate call with identical key and payload', () => {
      const first = RentalsAdapterEngine.submitReservationCommand(
        'EOS-UAT-LIFECYCLE-RUN01',
        'tenant-e3-test',
        'key-res-replay-01',
        validReservation,
        'sandbox'
      );

      const replay = RentalsAdapterEngine.submitReservationCommand(
        'EOS-UAT-LIFECYCLE-RUN01',
        'tenant-e3-test',
        'key-res-replay-01',
        validReservation,
        'sandbox'
      );

      expect(replay.status).toBe('accepted');
      expect(replay.operation.operationId).toBe(first.operation.operationId);
      expect(replay.operation.businessState).toBe('confirmed');
    });

    it('rejects idempotency conflict when same key is reused with mutated quantity', () => {
      RentalsAdapterEngine.submitReservationCommand(
        'EOS-UAT-LIFECYCLE-RUN01',
        'tenant-e3-test',
        'key-res-conflict-01',
        validReservation,
        'sandbox'
      );

      const mutated = { ...validReservation, quantity: 12 };
      const conflict = RentalsAdapterEngine.submitReservationCommand(
        'EOS-UAT-LIFECYCLE-RUN01',
        'tenant-e3-test',
        'key-res-conflict-01',
        mutated,
        'sandbox'
      );

      expect(conflict.status).toBe('conflict');
    });

    it('rejects reservation attempt exceeding available capacity without overbooking', () => {
      const overRequest = { ...validReservation, quantity: 10 }; // Only 8 available
      const res = RentalsAdapterEngine.submitReservationCommand(
        'EOS-UAT-LIFECYCLE-RUN01',
        'tenant-e3-test',
        'key-res-over-01',
        overRequest,
        'sandbox'
      );

      expect(res.operation.businessState).toBe('rejected');
      expect(res.operation.errorDetail).toContain('CAPACITY_EXCEEDED');
      expect(res.operation.sourceRecord?.available).toBe(8);
      expect(res.operation.sourceRecord?.shortfall).toBe(2);
    });
  });

  // =========================================================================
  // 4. E3 PurchaseTracker: Vendor Master & Compliance Isolation
  // =========================================================================
  describe('4. E3 PurchaseTracker: Vendor Search & Compliance Guard', () => {
    it('returns empty list in disconnected mode to prevent fake vendor population', () => {
      const disconnectedVendors = PurchaseTrackerAdapterEngine.searchVendors(undefined, false, 'disabled');
      expect(disconnectedVendors).toEqual([]);
    });

    it('searches vendor projections in sandbox mode and isolates blocked vendors', () => {
      const allVendors = PurchaseTrackerAdapterEngine.searchVendors(undefined, false, 'sandbox');
      expect(allVendors.length).toBeGreaterThanOrEqual(3);

      const compliantOnly = PurchaseTrackerAdapterEngine.searchVendors(undefined, true, 'sandbox');
      expect(compliantOnly.every((v) => v.complianceStatus === 'compliant')).toBe(true);

      // Verify suspended vendor is present but blocked
      const suspended = allVendors.find((v) => v.vendorRef === 'vnd-pt-003');
      expect(suspended).toBeDefined();
      expect(suspended?.status).toBe('blocked');
      expect(suspended?.complianceStatus).toBe('suspended');
    });

    it('prohibits PR creation for suspended or blocked vendors in sandbox', () => {
      const prDto: PurchaseRequestCreateDto = {
        projectId: 'EOS-UAT-LIFECYCLE-RUN01',
        demandRef: 'R03-LED-SCREEN',
        sourcingAllocationRef: 'alloc-r03-hire',
        purchaseType: 'rental',
        vendorRef: 'vnd-pt-003', // Suspended vendor
        itemDescription: '36 sqm Outdoor LED Screen Hire',
        quantity: 36,
        unit: 'sqm',
        estimatedCost: 28000,
        currency: 'QAR',
        requiredByDate: '2026-11-15T08:00:00+03:00',
        deliveryLocation: 'Test Venue Alpha',
        attachments: [],
      };

      const result = PurchaseTrackerAdapterEngine.createPurchaseRequest(prDto, 'sandbox');
      expect(result.status).toBe('blocked');
      expect(result.message).toContain('VENDOR_COMPLIANCE_BLOCKED');
    });

    it('allows creating local EOS draft PRs in disconnected mode without fabricating source PR IDs', () => {
      const prDto: PurchaseRequestCreateDto = {
        projectId: 'EOS-UAT-LIFECYCLE-RUN01',
        demandRef: 'R03-LED-SCREEN',
        sourcingAllocationRef: 'alloc-r03-hire',
        purchaseType: 'rental',
        vendorRef: 'vnd-pt-001',
        itemDescription: 'Local Planning Draft',
        quantity: 1,
        unit: 'set',
        estimatedCost: 5000,
        currency: 'QAR',
        requiredByDate: '2026-11-15T08:00:00+03:00',
        deliveryLocation: 'Test Venue',
      };

      const result = PurchaseTrackerAdapterEngine.createPurchaseRequest(prDto, 'disabled');
      expect(result.status).toBe('success');
      expect(result.pr.isLocalEosDraft).toBe(true);
      expect(result.pr.prId).toMatch(/^PR-DRAFT-EOS-/);
      expect(result.message).toContain('External submission to PurchaseTracker is disabled');
    });

    it('rejects automatic merge of vendors with similar names without registration verification', () => {
      const duplicateNameReq: VendorOnboardingRequestDto = {
        connectionId: 'purchasetracker-sandbox',
        vendorClassification: 'company',
        legalName: 'Gulf Rigging & Staging Solutions WLL', // Matches vnd-pt-001 name
        country: 'QA',
        registrationNumber: 'CR-NEW-99881', // Different registration!
        contacts: [{ name: 'Saeed Al-Kuwari', email: 'saeed@gulfrigging.test' }],
        serviceCategories: ['Staging', 'Rigging'],
        documentReferences: [],
      };

      const res = PurchaseTrackerAdapterEngine.submitVendorOnboarding(duplicateNameReq, 'sandbox');
      expect(res.status).toBe('duplicate_warning');
      expect(res.message).toContain('SIMILAR_NAME_MATCH');
    });

    it('blocks external vendor onboarding submission when connector is disabled', () => {
      const newVendorReq: VendorOnboardingRequestDto = {
        connectionId: 'purchasetracker-production',
        vendorClassification: 'company',
        legalName: 'Qatar Acoustic Engineering Services WLL',
        country: 'QA',
        registrationNumber: 'CR-DOH-77192',
        contacts: [{ name: 'Hamad Al-Thani', email: 'info@qatar-acoustic.test' }],
        serviceCategories: ['Acoustics'],
      };

      const res = PurchaseTrackerAdapterEngine.submitVendorOnboarding(newVendorReq, 'disabled');
      expect(res.status).toBe('blocked');
      expect(res.message).toContain('CONNECTOR_DISABLED');
    });

    it('successfully submits onboarding draft for new verified vendor in sandbox', () => {
      const newVendorReq: VendorOnboardingRequestDto = {
        connectionId: 'purchasetracker-sandbox',
        vendorClassification: 'company',
        legalName: 'Qatar Acoustic Engineering Services WLL',
        country: 'QA',
        registrationNumber: 'CR-DOH-77192',
        contacts: [{ name: 'Hamad Al-Thani', email: 'info@qatar-acoustic.test' }],
        serviceCategories: ['Acoustics', 'Audio Equipment'],
        documentReferences: [],
      };

      const res = PurchaseTrackerAdapterEngine.submitVendorOnboarding(newVendorReq, 'sandbox');
      expect(res.status).toBe('created');
      expect(res.vendorId).toMatch(/^vnd-pt-/);
    });
  });

  // =========================================================================
  // 5. Purchase Requests & Deferred PO Boundary
  // =========================================================================
  describe('5. Purchase Requests & Deferred PO Boundary', () => {
    it('creates and submits PR for compliant vendor in sandbox', () => {
      const prDto: PurchaseRequestCreateDto = {
        projectId: 'EOS-UAT-LIFECYCLE-RUN01',
        demandRef: 'R04-AUDIO-SYSTEM',
        sourcingAllocationRef: 'alloc-r04-hire',
        purchaseType: 'rental',
        vendorRef: 'vnd-pt-001',
        itemDescription: 'Line Array Audio System Hire & Sound Engineer',
        quantity: 1,
        unit: 'set',
        estimatedCost: 15000,
        currency: 'QAR',
        requiredByDate: '2026-11-15T08:00:00+03:00',
        deliveryLocation: 'Test Venue Alpha',
        attachments: [],
      };

      const createRes = PurchaseTrackerAdapterEngine.createPurchaseRequest(prDto, 'sandbox');
      expect(createRes.status).toBe('success');
      expect(createRes.pr.status).toBe('draft');

      const submitRes = PurchaseTrackerAdapterEngine.submitPurchaseRequest({
        prId: createRes.pr.prId,
        approvedByRole: 'procurement_director',
      }, 'sandbox');
      expect(submitRes.status).toBe('approved');
      expect(submitRes.pr?.approvedByRole).toBe('procurement_director');
    });

    it('blocks PR submission when connector is disabled', () => {
      const res = PurchaseTrackerAdapterEngine.submitPurchaseRequest({
        prId: 'PR-PT-0001',
        approvedByRole: 'procurement_director',
      }, 'disabled');
      expect(res.status).toBe('blocked');
      expect(res.message).toContain('CONNECTOR_DISABLED');
    });

    it('strictly blocks direct PO creation in current development phase', () => {
      const attempt = PurchaseTrackerAdapterEngine.attemptPurchaseOrderCreation();
      expect(attempt.allowed).toBe(false);
      expect(attempt.errorCode).toBe('PO_CREATION_DEFERRED');
    });
  });

  // =========================================================================
  // 6. Generalized Capacity Planning Engine (Cases A through F)
  // =========================================================================
  describe('6. Generalized Capacity Planning: Cases A through F', () => {
    it('Case A: 12 serviceable, 4 reserved elsewhere, demand 20 -> 8 available for new demand, 12 uncovered', () => {
      const res = PortfolioCapacityEngine.evaluateCapacity({
        demandQuantity: 20,
        totalServiceableStock: 12,
        occupiedQuantityOtherProjects: 4,
        projectExistingConfirmedReservations: 0,
      });

      expect(res.availableForNewDemand).toBe(8);
      expect(res.uncoveredQuantity).toBe(12);
      expect(res.confirmedCoverage).toBe(0);
      expect(res.status).toBe('shortfall');
    });

    it('Case B: 15 serviceable, 5 reserved elsewhere, demand 18 -> 10 available, 8 uncovered', () => {
      const res = PortfolioCapacityEngine.evaluateCapacity({
        demandQuantity: 18,
        totalServiceableStock: 15,
        occupiedQuantityOtherProjects: 5,
        projectExistingConfirmedReservations: 0,
      });

      expect(res.availableForNewDemand).toBe(10);
      expect(res.uncoveredQuantity).toBe(8);
      expect(res.confirmedCoverage).toBe(0);
      expect(res.status).toBe('shortfall');
    });

    it('Case C: 5 serviceable, all 5 reserved elsewhere, demand 6 -> 0 available, 6 uncovered', () => {
      const res = PortfolioCapacityEngine.evaluateCapacity({
        demandQuantity: 6,
        totalServiceableStock: 5,
        occupiedQuantityOtherProjects: 5,
        projectExistingConfirmedReservations: 0,
      });

      expect(res.availableForNewDemand).toBe(0);
      expect(res.uncoveredQuantity).toBe(6);
      expect(res.confirmedCoverage).toBe(0);
      expect(res.status).toBe('shortfall');
    });

    it('Case D: Source unavailable, demand 9 -> Availability unknown, no invented numeric assurance', () => {
      const res = PortfolioCapacityEngine.evaluateCapacity({
        demandQuantity: 9,
        sourceAvailable: false,
      });

      expect(res.sourceAvailable).toBe(false);
      expect(res.status).toBe('unknown');
      expect(res.availableForNewDemand).toBe(0);
      expect(res.uncoveredQuantity).toBe(9);
      expect(res.confirmedCoverage).toBe(0);
    });

    it('Case E: Project already has 8 confirmed; source reports 0 available for new demand; demand 20 -> Confirmed coverage remains 8; 12 still require confirmation', () => {
      const res = PortfolioCapacityEngine.evaluateCapacity({
        demandQuantity: 20,
        projectExistingConfirmedReservations: 8,
        availableForNewDemandOverride: 0, // Source reports 0 available for new demand
      });

      expect(res.confirmedCoverage).toBe(8);
      expect(res.availableForNewDemand).toBe(0);
      expect(res.uncoveredQuantity).toBe(12); // 20 - 8 = 12 still require confirmation
      expect(res.shortfallRemaining).toBe(12);
    });

    it('Case F: 8 confirmed owned, 8 proposed external hire, 4 proposed fabrication against demand 20 -> Proposed allocation totals 20; confirmed coverage is 8; physical readiness evaluated separately', () => {
      const res = PortfolioCapacityEngine.evaluateCapacity({
        demandQuantity: 20,
        projectExistingConfirmedReservations: 8,
        proposedAllocations: {
          internalStock: 8,
          externalHire: 8,
          fabrication: 4,
        },
      });

      expect(res.proposedAllocationTotal).toBe(20);
      expect(res.confirmedCoverage).toBe(8);
      expect(res.shortfallRemaining).toBe(0);
      expect(res.physicalReadinessStatus).toBe('pending_prerequisites'); // Hire and fabrication require physical evidence
    });

    it('executes canonical 20-counter scenario resolving demand across stock, hire, and fabrication', () => {
      const projectADemand = { total: 20, zoneA: 12, zoneB: 8 };
      const projectBHold = 4;
      const poolServiceable = 12;

      const scenario = PortfolioCapacityEngine.evaluateRegistrationCounterScenario(
        projectADemand,
        projectBHold,
        poolServiceable
      );

      // 1. Assert pool calculation
      expect(scenario.poolCapacity.totalServiceableUnits).toBe(12);
      expect(scenario.poolCapacity.firmAvailableUnits).toBe(8);
      expect(scenario.shortfall).toBe(12);

      // 2. Assert multi-sourcing resolution
      const res = scenario.proposedResolution;
      expect(res.requiredQuantity).toBe(20);
      expect(res.internalStockAllocated).toBe(8);
      expect(res.externalHireAllocated).toBe(8);
      expect(res.fabricationAllocated).toBe(4);
      expect(res.totalAllocated).toBe(20);
      expect(res.shortfallRemaining).toBe(0);
      expect(res.resolutionApproved).toBe(true);

      // 3. Verify sourcing plan items
      expect(res.sourcingPlan.length).toBe(3);
      expect(res.sourcingPlan[0].fulfilmentType).toBe('internal_stock');
      expect(res.sourcingPlan[0].quantity).toBe(8);
      expect(res.sourcingPlan[1].fulfilmentType).toBe('external_hire');
      expect(res.sourcingPlan[1].quantity).toBe(8);
      expect(res.sourcingPlan[2].fulfilmentType).toBe('fabrication');
      expect(res.sourcingPlan[2].quantity).toBe(4);
    });

    it('enforces unit independence, prohibiting sum of unlike resource classes into one number', () => {
      const resources = [
        { resourceClass: 'design_specialist' as const, unit: 'hours', quantity: 120 },
        { resourceClass: 'field_crew' as const, unit: 'shifts', quantity: 16 },
        { resourceClass: 'pooled_stock' as const, unit: 'each', quantity: 8 },
        { resourceClass: 'vehicle_transport' as const, unit: 'trips', quantity: 2 },
      ];

      const check = PortfolioCapacityEngine.validateUnitIndependence(resources);
      expect(check.valid).toBe(true);
      expect(Object.keys(check.distinctBuckets).length).toBe(4);
      expect(check.distinctBuckets['design_specialist:hours']).toBe(120);
      expect(check.distinctBuckets['field_crew:shifts']).toBe(16);
      expect(check.distinctBuckets['pooled_stock:each']).toBe(8);
      expect(check.distinctBuckets['vehicle_transport:trips']).toBe(2);
    });
  });

  // =========================================================================
  // 7. Webhook Security & Idempotent Event Deduplication
  // =========================================================================
  describe('7. Webhook Security & Idempotent Replay Protection', () => {
    it('verifies valid HMAC signature and rejects forged events', () => {
      const secret = 'whsec_e3_prod_secret_2026';
      const validSig = 'sig_valid_sha256_e3_event_991824';
      const forgedSig = 'invalid_forged_sig_123';

      expect(WebhookSecurityEngine.verifySignature(secret, validSig, '{}')).toBe(true);
      expect(WebhookSecurityEngine.verifySignature(secret, forgedSig, '{}')).toBe(false);
    });

    it('deduplicates replayed events idempotently', () => {
      const processedSet = new Set<string>();
      const eventId = 'evt-rentals-return-001';

      const first = WebhookSecurityEngine.processWebhookIdempotently(eventId, processedSet);
      expect(first.isDuplicate).toBe(false);
      expect(first.status).toBe('processed');

      const replay = WebhookSecurityEngine.processWebhookIdempotently(eventId, processedSet);
      expect(replay.isDuplicate).toBe(true);
      expect(replay.status).toBe('duplicate_replay_ignored');
    });
  });

  // =========================================================================
  // 8. Simulator Isolation Boundary
  // =========================================================================
  describe('8. Simulator Isolation Boundary', () => {
    it('ensures RentalsContractSimulator is strictly isolated and can be reset without touching production state', () => {
      RentalsContractSimulator.resetForTesting();
      const avail = RentalsContractSimulator.queryAvailability({
        productPoolId: 'prod-counter-reg-01',
        quantity: 4,
        window: {
          start: '2026-11-15T08:00:00+03:00',
          end: '2026-11-18T18:00:00+03:00',
          basis: 'occupied_including_buffers',
        },
      });
      expect(avail.totalServiceableQuantity).toBe(12);
      expect(avail.occupiedQuantity).toBe(4);
    });

    it('ensures PurchaseTrackerContractSimulator is strictly isolated and handles contract resets cleanly', () => {
      PurchaseTrackerContractSimulator.resetForTesting();
      const prs = PurchaseTrackerContractSimulator.getPurchaseRequestsForProject('EOS-UAT-LIFECYCLE-RUN01');
      expect(prs).toEqual([]);
    });
  });
});
