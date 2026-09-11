import { describe, it, expect } from 'vitest';
import {
  AssetAllocationEngine,
  LogisticsEngine,
  CrewConflictDetector,
  DailySiteReportEngine,
  InstallationTracker,
  ComprehensiveReadinessEvaluator,
  OpeningAuthorizationEngine,
  Asset,
  AssetAllocation,
  PackingList,
  CrewAssignment,
  DailySiteReport,
  InstallationItem,
  DimensionReadinessCheck,
} from '@e3-eos/domain';

describe('Sprint 03 — Assets, Logistics, Crew & Field Operations Suite', () => {
  const projectA = 'a1111111-1111-4111-8111-111111111111';
  const projectB = 'b2222222-2222-4222-8222-222222222222';

  describe('1. Inventory Fulfillment & Allocation Split', () => {
    it('calculates optimal split between internal warehouse inventory and external sourcing', () => {
      // 30 required, 8 available in Doha Central Depot
      const split = AssetAllocationEngine.calculateInternalFulfillment(30, 8);
      expect(split.allocatedInternally).toBe(8);
      expect(split.externalProcurementRequired).toBe(22);
      expect(split.fulfillmentRatePercent).toBe(27);
    });

    it('handles 100% internal fulfillment when available stock satisfies demand', () => {
      const split = AssetAllocationEngine.calculateInternalFulfillment(10, 25);
      expect(split.allocatedInternally).toBe(10);
      expect(split.externalProcurementRequired).toBe(0);
      expect(split.fulfillmentRatePercent).toBe(100);
    });
  });

  describe('2. Multi-Project Asset Collision Detection', () => {
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

    const confirmedAllocationProjectA: AssetAllocation = {
      id: 'alloc-prj-a',
      assetId: asset.id,
      projectId: projectA,
      allocatedQuantity: 8,
      status: 'confirmed',
      window: {
        start: new Date('2026-10-10T00:00:00Z'),
        end: new Date('2026-10-20T00:00:00Z'),
      },
    };

    it('rejects asset allocation to Project B during an overlapping window with Project A', () => {
      const conflictingAllocationProjectB = {
        projectId: projectB,
        window: {
          start: new Date('2026-10-15T00:00:00Z'), // Collides with Project A (Oct 10-20)
          end: new Date('2026-10-25T00:00:00Z'),
        },
        quantity: 8,
      };

      expect(() =>
        AssetAllocationEngine.validateAssetProjectAllocation(
          asset,
          [confirmedAllocationProjectA],
          conflictingAllocationProjectB
        )
      ).toThrow('ASSET_PROJECT_COLLISION');
    });

    it('allows allocation to Project B for completely non-overlapping future dates', () => {
      const nonOverlappingAllocation = {
        projectId: projectB,
        window: {
          start: new Date('2026-10-25T00:00:00Z'),
          end: new Date('2026-10-30T00:00:00Z'),
        },
        quantity: 8,
      };

      expect(() =>
        AssetAllocationEngine.validateAssetProjectAllocation(
          asset,
          [confirmedAllocationProjectA],
          nonOverlappingAllocation
        )
      ).not.toThrow();
    });
  });

  describe('3. Logistics, Multi-Source Packing Lists & Electronic POD', () => {
    const packingList: PackingList = {
      id: 'pl-fee-001',
      packingListNumber: 'PL-FEE-001',
      projectId: projectA,
      origin: 'Doha Central Logistics Depot',
      destination: 'DECC Hall 1 Loading Bay',
      vehicleId: 'TRUCK-07',
      driverId: 'Hamad Al-Khelaifi',
      status: 'packed',
      items: [
        { assetId: 'ast-cnt-001', description: 'Internal Counters', quantity: 8, casesPallets: '4 pallets' },
        { packageId: 'pkg-fee-reg-01', description: 'Fabricated Counters', quantity: 22, casesPallets: '11 pallets' },
      ],
      createdAt: new Date(),
    };

    it('transitions packing list status to dispatched and enforces delivery proof', () => {
      const dispatchedPl = LogisticsEngine.dispatchPackingList(packingList);
      expect(dispatchedPl.status).toBe('dispatched');
      expect(dispatchedPl.dispatchedAt).toBeDefined();

      const deliveredPl = LogisticsEngine.deliverPackingList(dispatchedPl, {
        receiverName: 'Omar Farooq',
        receiverSignature: 'Verified Signature',
        timestamp: new Date(),
        photos: ['photos/pod-fee-001.jpg'],
        discrepancies: [],
      });

      expect(deliveredPl.status).toBe('delivered');
      expect(deliveredPl.deliveryProof?.receiverName).toBe('Omar Farooq');
      expect(deliveredPl.deliveryProof?.discrepancies).toHaveLength(0);
    });
  });

  describe('4. Multi-Project Crew Assignment Conflict Engine', () => {
    const assignmentA: CrewAssignment = {
      id: 'crew-omar-01',
      personName: 'Omar Farooq',
      employer: 'E3 Live Operations',
      role: 'Site Field Supervisor',
      department: 'Site Operations',
      projectId: projectA,
      location: 'DECC Hall 1',
      window: {
        start: new Date('2026-10-15T08:00:00Z'),
        end: new Date('2026-10-15T18:00:00Z'),
      },
      accreditation: 'DECC Gold Badge',
      personnelType: 'e3_employee',
      status: 'confirmed',
    };

    it('detects and flags concurrent shift conflicts across different projects', () => {
      const conflictingAssignmentB: CrewAssignment = {
        id: 'crew-omar-02',
        personName: 'Omar Farooq',
        employer: 'E3 Live Operations',
        role: 'Site Safety Lead',
        department: 'HSE',
        projectId: projectB,
        location: 'Lusail Arena',
        window: {
          start: new Date('2026-10-15T12:00:00Z'), // Collides with Project A
          end: new Date('2026-10-15T22:00:00Z'),
        },
        accreditation: 'Lusail Venue Pass',
        personnelType: 'e3_employee',
        status: 'scheduled',
      };

      const conflictCheck = CrewConflictDetector.detectMultiProjectConflict(conflictingAssignmentB, [assignmentA]);

      expect(conflictCheck.hasConflict).toBe(true);
      expect(conflictCheck.conflictMessage).toContain('CREW_PROJECT_CONFLICT');
      expect(conflictCheck.conflictingAssignment?.projectId).toBe(projectA);
    });

    it('allows assignment of the same person on non-overlapping dates', () => {
      const nextDayAssignment: CrewAssignment = {
        id: 'crew-omar-03',
        personName: 'Omar Farooq',
        employer: 'E3 Live Operations',
        role: 'Site Field Supervisor',
        department: 'Site Operations',
        projectId: projectB,
        location: 'Lusail Arena',
        window: {
          start: new Date('2026-10-16T08:00:00Z'),
          end: new Date('2026-10-16T18:00:00Z'),
        },
        accreditation: 'Lusail Venue Pass',
        personnelType: 'e3_employee',
        status: 'scheduled',
      };

      const conflictCheck = CrewConflictDetector.detectMultiProjectConflict(nextDayAssignment, [assignmentA]);
      expect(conflictCheck.hasConflict).toBe(false);
    });
  });

  describe('5. Daily Site Reports Immutability & Installation Progression', () => {
    it('creates immutable Daily Site Report capturing complete site condition', () => {
      const report = DailySiteReportEngine.recordReport({
        projectId: projectA,
        reportDate: '2026-10-15',
        workCompleted: '30 registration counters offloaded, positioned and powered',
        workDelayed: 'None',
        manpowerCount: 18,
        equipmentActive: '2x Forklifts, 4x Pallet Jacks',
        deliveriesReceived: 'Truck 07 offloaded (30 units)',
        incidentsOccurred: 'Zero incidents',
        snagsIdentified: 'Counter #14 edge trim rectified',
        clientInstructions: 'Client approved dry run',
        weatherConditions: 'Indoor 21°C',
        photos: ['dsr-today.jpg'],
        tomorrowPlan: 'Full host dry run',
        recordedBy: 'Omar Farooq',
      });

      expect(report.isImmutable).toBe(true);
      expect(report.id).toContain(projectA);
      expect(report.manpowerCount).toBe(18);
    });

    it('advances installation progression step-by-step up to accepted status', () => {
      const item: InstallationItem = {
        id: 'inst-01',
        projectId: projectA,
        title: '30 Registration Counters',
        status: 'not_delivered',
        evidenceUris: [],
      };

      const delivered = InstallationTracker.advanceStatus(item, 'delivered', ['photos/dock-arrival.jpg']);
      expect(delivered.status).toBe('delivered');

      const installed = InstallationTracker.advanceStatus(delivered, 'installed', ['photos/in-place.jpg'], 'Level and powered');
      expect(installed.status).toBe('installed');

      const accepted = InstallationTracker.advanceStatus(installed, 'accepted', ['photos/client-signoff.jpg'], 'Accepted by client', 'Omar Farooq');
      expect(accepted.status).toBe('accepted');
      expect(accepted.verifiedBy).toBe('Omar Farooq');
      expect(accepted.verifiedAt).toBeDefined();
    });
  });

  describe('6. 10-Dimension Operational Readiness Gate', () => {
    const checks100Pct: DimensionReadinessCheck[] = [
      { dimension: 'Scope', isPassed: true, isCritical: true, scorePercent: 100, details: '100% delivered' },
      { dimension: 'Design', isPassed: true, isCritical: true, scorePercent: 100, details: 'Approved to construction' },
      { dimension: 'Production', isPassed: true, isCritical: true, scorePercent: 100, details: '22 fabricated' },
      { dimension: 'Assets', isPassed: true, isCritical: true, scorePercent: 100, details: '8 assets allocated' },
      { dimension: 'Logistics', isPassed: true, isCritical: true, scorePercent: 100, details: 'Truck 07 delivered' },
      { dimension: 'Installation', isPassed: true, isCritical: true, scorePercent: 100, details: '30 accepted' },
      { dimension: 'HSE', isPassed: true, isCritical: true, scorePercent: 100, details: 'Zero incidents' },
      { dimension: 'Permits', isPassed: true, isCritical: true, scorePercent: 100, details: 'Civil Defence approved' },
      { dimension: 'Staffing', isPassed: true, isCritical: true, scorePercent: 100, details: 'Crew rostered' },
      { dimension: 'Technical Testing', isPassed: true, isCritical: true, scorePercent: 100, details: 'All circuits tested' },
    ];

    it('100% readiness score confers opening review eligibility, not automatic authorization', () => {
      const report = ComprehensiveReadinessEvaluator.evaluate(projectA, checks100Pct);

      expect(report.overallStatus).toBe('READY');
      expect(report.overallScorePercent).toBe(100);
      expect(report.eligibleForOpeningReview).toBe(true);
      expect(report.canOpen).toBe(false); // Invariant: decoupled from automatic opening
      expect(report.criticalBlockers).toHaveLength(0);

      // Now explicit governed authorization transaction succeeds
      const authResult = OpeningAuthorizationEngine.authorize(
        report,
        'Elena Rostova',
        'executive_producer',
        {
          justification: 'All 10 dimensions verified at 100%. Civil Defence safety certificate approved.',
        }
      );

      expect(authResult.error).toBeUndefined();
      expect(authResult.authorization).toBeDefined();
      const auth = authResult.authorization!;
      expect(auth.authorizedRole).toBe('executive_producer');
      expect(auth.readinessStatus).toBe('READY');
      expect(auth.auditHash).toBeDefined();
      expect(auth.auditHash.length).toBeGreaterThan(16);
    });

    it('strictly blocks show opening if a critical dimension fails', () => {
      const blockedChecks: DimensionReadinessCheck[] = [
        ...checks100Pct.slice(0, 7),
        { dimension: 'Permits', isPassed: false, isCritical: true, scorePercent: 0, details: 'Civil Defence fire safety certificate pending inspection' },
        ...checks100Pct.slice(8),
      ];

      const report = ComprehensiveReadinessEvaluator.evaluate(projectA, blockedChecks);

      expect(report.overallStatus).toBe('NOT_READY');
      expect(report.eligibleForOpeningReview).toBe(false);
      expect(report.canOpen).toBe(false);
      expect(report.criticalBlockers.length).toBeGreaterThan(0);
      expect(report.criticalBlockers[0]).toContain('Permits');

      // Attempting governed authorization when critical blockers exist returns error
      const authResult = OpeningAuthorizationEngine.authorize(
        report,
        'Elena Rostova',
        'executive_producer',
        {
          justification: 'Attempting override with missing permits',
        }
      );

      expect(authResult.authorization).toBeUndefined();
      expect(authResult.error).toContain('OPENING_BLOCKED');
    });

    it('permits governed show opening with exceptions when accompanied by justification and acknowledged exceptions', () => {
      const minorExceptionChecks: DimensionReadinessCheck[] = [
        ...checks100Pct.slice(0, 9),
        { dimension: 'Technical Testing', isPassed: false, isCritical: false, scorePercent: 90, details: 'Secondary backup printer IP not mapped', openException: 'Non-critical fallback printer manual entry active' },
      ];

      const report = ComprehensiveReadinessEvaluator.evaluate(projectA, minorExceptionChecks);

      expect(report.overallStatus).toBe('READY_WITH_EXCEPTIONS');
      expect(report.eligibleForOpeningReview).toBe(true);
      expect(report.canOpen).toBe(false); // Still false until signed
      expect(report.exceptions.length).toBeGreaterThan(0);

      // Governed authorization with acknowledged exceptions succeeds
      const authResult = OpeningAuthorizationEngine.authorize(
        report,
        'Elena Rostova',
        'executive_producer',
        {
          justification: 'Non-blocking backup printer fallback active with manual supervisor runner',
          exceptionsAcknowledged: report.exceptions,
        }
      );

      expect(authResult.error).toBeUndefined();
      expect(authResult.authorization).toBeDefined();
      const auth = authResult.authorization!;
      expect(auth.readinessStatus).toBe('READY_WITH_EXCEPTIONS');
      expect(auth.exceptionsAcknowledged).toHaveLength(1);
      expect(auth.auditHash).toBeDefined();
    });
  });
});
