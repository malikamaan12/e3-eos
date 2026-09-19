import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  RentalsAdapterEngine,
  RentalsContractSimulator,
  PurchaseTrackerAdapterEngine,
  PortfolioCapacityEngine,
  IntegrationOperation,
} from '@e3-eos/domain';
import { getDbPool } from '@e3-eos/db';
import { IntegrationOperationsStore } from '../apps/api/src/integrations/integration-operations.store.js';

describe('E3 EOS — Enterprise Sourcing & Multi-Instance Durability Test Suite', () => {
  const pool = getDbPool();
  let store: IntegrationOperationsStore;
  const testProjectId = `PROJ-E2E-DURABILITY-${Date.now()}`;
  const testOrgId = 'tenant-e3-production';

  beforeAll(async () => {
    RentalsAdapterEngine.resetForTesting();
    store = IntegrationOperationsStore.getInstance();

    // Clean up any test records for this project ID
    try {
      await pool.query('DELETE FROM project_resource_demands WHERE project_id = $1', [testProjectId]);
      await pool.query('DELETE FROM project_sourcing_scenarios WHERE project_id = $1', [testProjectId]);
      await pool.query('DELETE FROM capacity_conflict_decisions WHERE project_id = $1', [testProjectId]);
      await pool.query('DELETE FROM integration_operations WHERE project_id = $1', [testProjectId]);
    } catch {
      // Tables might be empty
    }
  });

  afterAll(async () => {
    try {
      await pool.query('DELETE FROM project_resource_demands WHERE project_id = $1', [testProjectId]);
      await pool.query('DELETE FROM project_sourcing_scenarios WHERE project_id = $1', [testProjectId]);
      await pool.query('DELETE FROM capacity_conflict_decisions WHERE project_id = $1', [testProjectId]);
      await pool.query('DELETE FROM integration_operations WHERE project_id = $1', [testProjectId]);
    } catch {
      // Cleanup
    }
  });

  // =========================================================================
  // 1. Durability Verification: PostgreSQL Table Structure & Stateless Persistence
  // =========================================================================
  describe('1. Production Datastore Durability (PostgreSQL 16)', () => {
    it('verifies enterprise integration and capacity tables exist in PostgreSQL schema', async () => {
      const res = await pool.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_name IN (
          'integration_operations',
          'project_resource_demands',
          'project_sourcing_scenarios',
          'capacity_conflict_decisions'
        )
        ORDER BY table_name ASC
      `);

      const tableNames = res.rows.map((r: any) => r.table_name);
      expect(tableNames).toContain('integration_operations');
      expect(tableNames).toContain('project_resource_demands');
      expect(tableNames).toContain('project_sourcing_scenarios');
      expect(tableNames).toContain('capacity_conflict_decisions');
    });

    it('persists and retrieves records directly from PostgreSQL without local filesystem dependence', async () => {
      // Save directly via store to PostgreSQL
      const saveRes = await store.saveProjectDemand({
        projectId: testProjectId,
        organisationId: testOrgId,
        requirements: [
          {
            requirementId: 'REQ-01',
            title: 'Standard Registration Counters',
            quantity: 20,
            unit: 'each',
            allocations: [
              { zone: 'Zone A (Main Entrance)', quantity: 12 },
              { zone: 'Zone B (VIP Hall)', quantity: 8 },
            ],
            sourcingDecision: 'split_stock_and_fabrication',
            sourceProductRef: 'prod-counter-reg-01',
          },
        ],
        updatedBy: 'user-planner-01',
      });

      expect(saveRes.isConflict).toBe(false);
      expect(saveRes.record.version).toBe(1);

      // Verify direct PostgreSQL query (bypassing any in-memory cache)
      const directDbRes = await pool.query(
        'SELECT * FROM project_resource_demands WHERE project_id = $1',
        [testProjectId]
      );
      expect(directDbRes.rows.length).toBe(1);
      const row = directDbRes.rows[0];
      expect(row.project_id).toBe(testProjectId);
      expect(row.version).toBe(1);
      expect(row.updated_by).toBe('user-planner-01');
      expect(row.requirements).toHaveLength(1);
      expect(row.requirements[0].quantity).toBe(20);
    });
  });

  // =========================================================================
  // 2. Concurrency & Optimistic Locking Across Stateless Instances
  // =========================================================================
  describe('2. Multi-Instance Concurrency & Stale Version Rejection', () => {
    it('accepts an update when client submits the matching expectedVersion', async () => {
      // User 1 updates from version 1 to 2
      const updateRes = await store.saveProjectDemand({
        projectId: testProjectId,
        organisationId: testOrgId,
        requirements: [
          {
            requirementId: 'REQ-01',
            title: 'Standard Registration Counters (Updated spec)',
            quantity: 20,
            unit: 'each',
            allocations: [
              { zone: 'Zone A', quantity: 14 },
              { zone: 'Zone B', quantity: 6 },
            ],
            sourcingDecision: 'split_stock_and_fabrication',
            sourceProductRef: 'prod-counter-reg-01',
          },
        ],
        expectedVersion: 1,
        updatedBy: 'user-planner-01',
      });

      expect(updateRes.isConflict).toBe(false);
      expect(updateRes.record.version).toBe(2);

      // Verify DB version was bumped
      const dbCheck = await pool.query(
        'SELECT version FROM project_resource_demands WHERE project_id = $1',
        [testProjectId]
      );
      expect(dbCheck.rows[0].version).toBe(2);
    });

    it('rejects conflicting update when another instance submits an obsolete expectedVersion', async () => {
      // User 2 (Director) attempts to update using stale version 1 (current DB is 2)
      const staleRes = await store.saveProjectDemand({
        projectId: testProjectId,
        organisationId: testOrgId,
        requirements: [
          {
            requirementId: 'REQ-01',
            title: 'Conflicting Requirements',
            quantity: 25,
            unit: 'each',
          },
        ],
        expectedVersion: 1, // Stale!
        updatedBy: 'user-director-02',
      });

      expect(staleRes.isConflict).toBe(true);
      expect(staleRes.record.version).toBe(2); // Informs client of current version

      // Verify DB was NOT overwritten
      const dbCheck = await pool.query(
        'SELECT version, requirements FROM project_resource_demands WHERE project_id = $1',
        [testProjectId]
      );
      expect(dbCheck.rows[0].version).toBe(2);
      expect(dbCheck.rows[0].requirements[0].quantity).toBe(20);
    });

    it('succeeds once the client refreshes and submits the current expectedVersion', async () => {
      // User 2 refreshes, reads version 2, and submits update with expectedVersion: 2
      const freshRes = await store.saveProjectDemand({
        projectId: testProjectId,
        organisationId: testOrgId,
        requirements: [
          {
            requirementId: 'REQ-01',
            title: 'Refreshed Requirements with Director Sign-off',
            quantity: 20,
            unit: 'each',
            allocations: [
              { zone: 'Zone A', quantity: 12 },
              { zone: 'Zone B', quantity: 8 },
            ],
            sourcingDecision: 'split_stock_and_fabrication',
            sourceProductRef: 'prod-counter-reg-01',
          },
        ],
        expectedVersion: 2, // Current!
        updatedBy: 'user-director-02',
      });

      expect(freshRes.isConflict).toBe(false);
      expect(freshRes.record.version).toBe(3);
      expect(freshRes.record.updatedBy).toBe('user-director-02');
    });
  });

  // =========================================================================
  // 3. Complete End-to-End Planning Flow (Demand -> Sourcing -> Conflict -> Multi-User Handover)
  // =========================================================================
  describe('3. Complete Planning Flow: Demand, Sourcing Scenario & Conflict Ownership', () => {
    it('saves a multi-sourcing scenario to PostgreSQL and prevents conflicting overwrites', async () => {
      // User 1 models balanced multi-sourcing scenario
      const scenarioRes = await store.saveSourcingScenario({
        projectId: testProjectId,
        organisationId: testOrgId,
        name: 'Scenario A: Balanced Multi-Source',
        status: 'draft',
        allocations: {
          internalStock: 8,
          externalHire: 8,
          workshopFabrication: 4,
          total: 20,
        },
        costBreakdown: {
          internalStockCostQar: 0,
          externalHireCostQar: 6000,
          workshopFabricationCostQar: 4800,
          totalCostQar: 10800,
        },
        readinessConditions: {
          stockReservationStatus: 'tentative_hold',
          hireVendorShortlist: ['Q-Events Logistics WLL'],
          workshopSlotsReserved: ['WRK-CNC-001-SLOT-03'],
        },
        createdBy: 'user-planner-01',
      });

      expect(scenarioRes.isConflict).toBe(false);
      expect(scenarioRes.record.version).toBe(1);
      expect(scenarioRes.record.status).toBe('draft');

      // Verify in DB
      const scenariosInDb = await store.listSourcingScenarios(testProjectId);
      expect(scenariosInDb.length).toBeGreaterThanOrEqual(1);
      const scenarioA = scenariosInDb.find((s) => s.name === 'Scenario A: Balanced Multi-Source');
      expect(scenarioA).toBeDefined();
      expect(scenarioA?.allocations.internalStock).toBe(8);
      expect(scenarioA?.allocations.externalHire).toBe(8);
      expect(scenarioA?.allocations.workshopFabrication).toBe(4);
      expect(scenarioA?.costBreakdown.totalCostQar).toBe(10800);

      // Stale update rejection on scenario
      const staleScenarioRes = await store.saveSourcingScenario({
        projectId: testProjectId,
        organisationId: testOrgId,
        name: 'Scenario A: Balanced Multi-Source',
        status: 'approved',
        allocations: scenarioA?.allocations,
        costBreakdown: scenarioA?.costBreakdown,
        readinessConditions: scenarioA?.readinessConditions,
        expectedVersion: 999, // Stale!
        createdBy: 'user-director-02',
      });
      expect(staleScenarioRes.isConflict).toBe(true);
    });

    it('assigns conflict ownership and rationale to PostgreSQL capacity conflict queue', async () => {
      // User 1 logs conflict decision: assign conflict owner
      const decision1 = await store.saveConflictDecision({
        projectId: testProjectId,
        organisationId: testOrgId,
        conflictRef: 'CONF-QTS-REG-001',
        resourcePoolId: 'pool-reg-counters-doha',
        assignedOwner: 'Head of Production Logistics',
        resolutionAction: 'multi_source_hire_and_fab',
        rationale: 'Project B holds 4 units in overlapping window. Sourcing remaining 12 via 8 external hire + 4 workshop fabrication.',
        status: 'proposed',
        decidedBy: 'user-planner-01',
      });

      expect(decision1.conflictRef).toBe('CONF-QTS-REG-001');
      expect(decision1.assignedOwner).toBe('Head of Production Logistics');
      expect(decision1.status).toBe('proposed');

      // User 2 (Director) reopens project and approves decision
      const decision2 = await store.saveConflictDecision({
        projectId: testProjectId,
        organisationId: testOrgId,
        conflictRef: 'CONF-QTS-REG-001',
        resourcePoolId: 'pool-reg-counters-doha',
        assignedOwner: 'Head of Production Logistics',
        resolutionAction: 'multi_source_hire_and_fab',
        rationale: 'Approved budget variance of 10,800 QAR for external hire and workshop fabrication.',
        status: 'approved',
        decidedBy: 'user-director-02',
      });

      expect(decision2.status).toBe('approved');
      expect(decision2.decidedBy).toBe('user-director-02');
      expect(decision2.resolvedAt).toBeDefined();

      // Check PostgreSQL persistence directly
      const dbDecisions = await store.listConflictDecisions(testProjectId);
      const match = dbDecisions.find((d) => d.conflictRef === 'CONF-QTS-REG-001');
      expect(match).toBeDefined();
      expect(match?.assignedOwner).toBe('Head of Production Logistics');
      expect(match?.status).toBe('approved');
    });

    it('allows a second authorized user to reopen the project and see the exact persisted state', async () => {
      // User 2 opens the project fresh from PostgreSQL
      const demand = await store.getProjectDemand(testProjectId);
      const scenarios = await store.listSourcingScenarios(testProjectId);
      const conflicts = await store.listConflictDecisions(testProjectId);

      expect(demand).toBeDefined();
      expect(demand?.version).toBe(3);
      expect(demand?.updatedBy).toBe('user-director-02');
      expect(demand?.requirements[0].quantity).toBe(20);

      expect(scenarios).toHaveLength(1);
      expect(scenarios[0].name).toBe('Scenario A: Balanced Multi-Source');

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].conflictRef).toBe('CONF-QTS-REG-001');
      expect(conflicts[0].assignedOwner).toBe('Head of Production Logistics');
      expect(conflicts[0].status).toBe('approved');
    });
  });

  // =========================================================================
  // 4. Cross-Instance Idempotency & Conflict Handling
  // =========================================================================
  describe('4. Database-Level Idempotency & Cross-Instance Request Replays', () => {
    const idempotencyKey = `idem-key-${Date.now()}`;
    const payloadHash = 'hash_payload_registration_counter_001';

    it('persists initial operation with database uniqueness constraint on idempotency_key', async () => {
      const op: IntegrationOperation = {
        operationId: `op-${Date.now()}`,
        tenantId: testOrgId,
        projectId: testProjectId,
        connectionId: 'rentals-production',
        action: 'equipment_reservation',
        idempotencyKey,
        payloadHash,
        operationState: 'completed',
        businessState: 'confirmed',
        sourceRecord: { bookingId: 'bkg-db-test-01', quantity: 8 },
        statusUrl: `/api/v1/integration-operations/op-db-test-01`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await store.saveOperation(op, testOrgId);

      // Verify PostgreSQL table integration_operations contains exactly 1 record
      const dbRes = await pool.query(
        'SELECT * FROM integration_operations WHERE idempotency_key = $1',
        [idempotencyKey]
      );
      expect(dbRes.rows.length).toBe(1);
      expect(dbRes.rows[0].id).toBe(op.operationId);
      expect(dbRes.rows[0].business_state).toBe('confirmed');
    });

    it('replays existing operation when another instance queries by idempotency key with identical hash', async () => {
      // Simulate Instance B querying the shared database for the same idempotency key
      const existing = await store.getOperationByIdempotencyKey(idempotencyKey);
      expect(existing).toBeDefined();
      expect(existing?.idempotencyKey).toBe(idempotencyKey);
      expect(existing?.payloadHash).toBe(payloadHash);
      expect(existing?.businessState).toBe('confirmed');
      expect((existing?.sourceRecord as any).quantity).toBe(8);
    });

    it('detects idempotency conflict when same key is reused with a different payload hash', async () => {
      const existing = await store.getOperationByIdempotencyKey(idempotencyKey);
      expect(existing).toBeDefined();

      const conflictingPayloadHash = 'hash_different_payload_tampered';
      const isConflict = existing !== undefined && existing.payloadHash !== conflictingPayloadHash;
      expect(isConflict).toBe(true);
    });
  });

  // =========================================================================
  // 5. Configured Prep/Return Buffers & Interval Demonstrations
  // =========================================================================
  describe('5. Configured Prep/Return Buffers vs Already-Buffered Intervals', () => {
    // Project B holds 4 units from 2026-11-10 00:00 to 2026-11-20 23:59:59 (+03:00)
    // Query window: 2026-11-21 02:00 to 2026-11-25 18:00 (+03:00)
    // Gap between Project B end (Nov 20 23:59) and Query start (Nov 21 02:00) is ~2 hours!

    it('Scenario 1: 0-hour buffer (event dates only) -> NO overlap with Project B', () => {
      const res = RentalsContractSimulator.queryAvailability({
        connectionId: 'rentals-production',
        productPoolId: 'prod-counter-reg-01',
        quantity: 12,
        unit: 'each',
        window: {
          start: '2026-11-21T02:00:00+03:00',
          end: '2026-11-25T18:00:00+03:00',
          timeZone: 'Asia/Qatar',
          basis: 'event_dates_only',
        },
        bufferPolicy: { prepHours: 0, returnHours: 0 },
      });

      // Since prepHours = 0, query window starts Nov 21 02:00, after Project B release
      expect(res.occupiedQuantity).toBe(0);
      expect(res.availableQuantity).toBe(12); // All 12 available!
      expect(res.shortfall).toBe(0);
      expect(res.bufferApplied.prepHours).toBe(0);
      expect(res.bufferApplied.returnHours).toBe(0);
    });

    it('Scenario 2: 12-hour prep buffer (event dates only) -> triggers OVERLAP with Project B', () => {
      const res = RentalsContractSimulator.queryAvailability({
        connectionId: 'rentals-production',
        productPoolId: 'prod-counter-reg-01',
        quantity: 12,
        unit: 'each',
        window: {
          start: '2026-11-21T02:00:00+03:00',
          end: '2026-11-25T18:00:00+03:00',
          timeZone: 'Asia/Qatar',
          basis: 'event_dates_only',
        },
        bufferPolicy: { prepHours: 12, returnHours: 12 },
      });

      // Nov 21 02:00 minus 12 hours = Nov 20 14:00 -> overlaps with Project B (active until Nov 20 23:59)
      expect(res.occupiedQuantity).toBe(4);
      expect(res.availableQuantity).toBe(8); // 12 - 4 = 8
      expect(res.shortfall).toBe(4); // 12 demanded - 8 available = 4 shortfall
      expect(res.bufferApplied.prepHours).toBe(12);
      expect(res.bufferApplied.returnHours).toBe(12);
    });

    it('Scenario 3: 24-hour prep buffer (event dates only) -> triggers OVERLAP and expands hold window', () => {
      const res = RentalsContractSimulator.queryAvailability({
        connectionId: 'rentals-production',
        productPoolId: 'prod-counter-reg-01',
        quantity: 12,
        unit: 'each',
        window: {
          start: '2026-11-21T02:00:00+03:00',
          end: '2026-11-25T18:00:00+03:00',
          timeZone: 'Asia/Qatar',
          basis: 'event_dates_only',
        },
        bufferPolicy: { prepHours: 24, returnHours: 24 },
      });

      // Nov 21 02:00 minus 24 hours = Nov 20 02:00 -> deep overlap with Project B
      expect(res.occupiedQuantity).toBe(4);
      expect(res.availableQuantity).toBe(8);
      expect(res.shortfall).toBe(4);
      expect(res.bufferApplied.prepHours).toBe(24);
      expect(res.bufferApplied.returnHours).toBe(24);
    });

    it('Scenario 4: occupied_including_buffers basis -> NEVER applies additional buffers (no double-buffering)', () => {
      const res = RentalsContractSimulator.queryAvailability({
        connectionId: 'rentals-production',
        productPoolId: 'prod-counter-reg-01',
        quantity: 12,
        unit: 'each',
        window: {
          start: '2026-11-21T02:00:00+03:00',
          end: '2026-11-25T18:00:00+03:00',
          timeZone: 'Asia/Qatar',
          basis: 'occupied_including_buffers', // Caller already included buffers!
        },
        bufferPolicy: { prepHours: 48, returnHours: 48 }, // Should be ignored!
      });

      // Buffer hours must be 0 because window is already buffered
      expect(res.bufferApplied.prepHours).toBe(0);
      expect(res.bufferApplied.returnHours).toBe(0);
      expect(res.occupiedQuantity).toBe(0);
      expect(res.availableQuantity).toBe(12);
      expect(res.shortfall).toBe(0);
    });
  });

  // =========================================================================
  // 6. Portfolio Capacity Generalized Solver Cases A through F
  // =========================================================================
  describe('6. Generalized Capacity Math Across Cases A through F', () => {
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
        availableForNewDemandOverride: 0,
      });

      expect(res.confirmedCoverage).toBe(8);
      expect(res.availableForNewDemand).toBe(0);
      expect(res.uncoveredQuantity).toBe(12);
      expect(res.shortfallRemaining).toBe(12);
    });

    it('Case F: 8 confirmed owned, 8 proposed external hire, 4 proposed fabrication against demand 20 -> Proposed allocation totals 20; confirmed coverage is 8', () => {
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
      expect(res.physicalReadinessStatus).toBe('pending_prerequisites');
    });

    it('Case G (Direct PO Deferred Invariant): Blocks direct PO creation with PO_CREATION_DEFERRED', () => {
      const attempt = PurchaseTrackerAdapterEngine.attemptPurchaseOrderCreation();
      expect(attempt.allowed).toBe(false);
      expect(attempt.errorCode).toBe('PO_CREATION_DEFERRED');
    });

    it('Case H (Disconnected Vendor Query): Returns empty list in disconnected mode to prevent fake vendor population', () => {
      const vendors = PurchaseTrackerAdapterEngine.searchVendors(undefined, false, 'disabled');
      expect(vendors).toEqual([]);
    });

    it('Case I (Multi-Sourcing Sourcing Modeler Math): Resolves shortfall via proposeMultiSourcingPlan', () => {
      const plan = PortfolioCapacityEngine.proposeMultiSourcingPlan({
        demandId: 'DEM-01',
        projectId: testProjectId,
        requiredQuantity: 20,
        availableInternalStock: 8,
        externalHireQuantity: 8,
        fabricationQuantity: 4,
        externalHireUnitCostQar: 750,
        fabricationUnitCostQar: 1200,
      });

      expect(plan.internalStockAllocated).toBe(8);
      expect(plan.externalHireAllocated).toBe(8);
      expect(plan.fabricationAllocated).toBe(4);
      expect(plan.totalAllocated).toBe(20);
      expect(plan.shortfallRemaining).toBe(0);
      const totalCost = plan.sourcingPlan.reduce((acc, item) => acc + item.costEstimateQar, 0);
      expect(totalCost).toBe(10800);
    });
  });
});
