import { IntegrationOperation } from '@e3-eos/domain';
import { getDbPool, PgPool } from '@e3-eos/db';

export class DatastoreUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatastoreUnavailableError';
  }
}

export interface IntegrationOperationsFile {
  version: number;
  updatedAt: string;
  operations: Record<string, IntegrationOperation>;
  localDrafts: Record<string, unknown>;
}

export interface ProjectDemandRecord {
  id?: string;
  projectId: string;
  organisationId: string;
  requirements: any[];
  assumptions?: any;
  version: number;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectSourcingScenarioRecord {
  id?: string;
  projectId: string;
  organisationId: string;
  name: string;
  status: string;
  demandId?: string;
  allocations: any;
  costBreakdown: any;
  readinessConditions: any;
  version: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConflictDecisionRecord {
  id?: string;
  projectId: string;
  organisationId: string;
  conflictRef: string;
  resourcePoolId: string;
  assignedOwner?: string;
  resolutionAction?: string;
  rationale?: string;
  status: string;
  decidedBy?: string;
  createdAt?: string;
  resolvedAt?: string;
}

/**
 * Durable PostgreSQL Store for Integration Operations, Project Demands,
 * Multi-Sourcing Scenarios, and Capacity Conflict Decisions.
 *
 * Conforms strictly to the 19 September 2026 Enterprise Architecture Amendment:
 * - Direct queries to PostgreSQL 16 via @e3-eos/db pool.
 * - Ephemeral file-system persistence (apps/api/data/integration-operations.json) is retired.
 * - Fail-closed error handling: never silently falls back to JSON or in-memory state on DB error.
 * - Database-level unique constraints and atomic conditional updates for optimistic versioning.
 */
export class IntegrationOperationsStore {
  private static instance: IntegrationOperationsStore;
  private pool: PgPool;
  private isDbReady = false;
  private offlineMockMode = false;
  private mockOperations: Map<string, IntegrationOperation> = new Map();
  private mockDrafts: Map<string, unknown> = new Map();

  constructor(pool?: PgPool) {
    this.pool = pool || getDbPool();
  }

  static getInstance(): IntegrationOperationsStore {
    if (!this.instance) {
      this.instance = new IntegrationOperationsStore();
    }
    return this.instance;
  }

  /**
   * Factory method to construct an independent store instance connected to the
   * durable datastore, simulating instance replacement or multiple concurrent API processes.
   */
  static createFreshInstance(pool?: PgPool): IntegrationOperationsStore {
    return new IntegrationOperationsStore(pool);
  }

  isReady(): boolean {
    return this.isDbReady;
  }

  /**
   * Allows isolated test suites to explicitly enable mock in-memory mode if desired.
   * In production, this is strictly false.
   */
  setOfflineMockMode(enabled: boolean): void {
    this.offlineMockMode = enabled;
  }

  // =========================================================================
  // Integration Operations (Durable & Idempotent)
  // =========================================================================

  async saveOperation(operation: IntegrationOperation, organisationId: string = 'tenant-e3-default'): Promise<void> {
    if (this.offlineMockMode) {
      this.mockOperations.set(operation.operationId, operation);
      return;
    }

    try {
      await this.pool.query(
        `INSERT INTO integration_operations (
          id, organisation_id, project_id, connection_id, action,
          idempotency_key, payload_hash, operation_state, business_state,
          source_record, error_detail, status_url, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (idempotency_key) DO UPDATE SET
          operation_state = EXCLUDED.operation_state,
          business_state = EXCLUDED.business_state,
          source_record = EXCLUDED.source_record,
          error_detail = EXCLUDED.error_detail,
          updated_at = NOW()`,
        [
          operation.operationId,
          organisationId,
          operation.projectId,
          operation.connectionId,
          operation.action,
          operation.idempotencyKey,
          operation.payloadHash,
          operation.operationState,
          operation.businessState,
          operation.sourceRecord ? JSON.stringify(operation.sourceRecord) : null,
          operation.errorDetail || null,
          operation.statusUrl,
          operation.createdAt ? new Date(operation.createdAt) : new Date(),
          operation.updatedAt ? new Date(operation.updatedAt) : new Date(),
        ]
      );
    } catch (err: any) {
      throw new DatastoreUnavailableError(`Could not save integration operation ${operation.operationId} to durable datastore: ${err.message}`);
    }
  }

  async getOperation(operationId: string): Promise<IntegrationOperation | undefined> {
    if (this.offlineMockMode) {
      return this.mockOperations.get(operationId);
    }

    try {
      const res = await this.pool.query(
        `SELECT * FROM integration_operations WHERE id = $1`,
        [operationId]
      );
      if (res.rows.length === 0) {
        return undefined;
      }
      const row = res.rows[0];
      return {
        operationId: row.id,
        tenantId: row.organisation_id,
        projectId: row.project_id,
        connectionId: row.connection_id,
        action: row.action,
        idempotencyKey: row.idempotency_key,
        payloadHash: row.payload_hash,
        operationState: row.operation_state,
        businessState: row.business_state,
        sourceRecord: row.source_record,
        errorDetail: row.error_detail,
        statusUrl: row.status_url,
        createdAt: row.created_at?.toISOString() || new Date().toISOString(),
        updatedAt: row.updated_at?.toISOString() || new Date().toISOString(),
      };
    } catch (err: any) {
      throw new DatastoreUnavailableError(`Could not retrieve integration operation ${operationId} from durable datastore: ${err.message}`);
    }
  }

  async getOperationByIdempotencyKey(key: string): Promise<IntegrationOperation | undefined> {
    if (this.offlineMockMode) {
      for (const op of this.mockOperations.values()) {
        if (op.idempotencyKey === key) return op;
      }
      return undefined;
    }

    try {
      const res = await this.pool.query(
        `SELECT * FROM integration_operations WHERE idempotency_key = $1`,
        [key]
      );
      if (res.rows.length === 0) {
        return undefined;
      }
      const row = res.rows[0];
      return {
        operationId: row.id,
        tenantId: row.organisation_id,
        projectId: row.project_id,
        connectionId: row.connection_id,
        action: row.action,
        idempotencyKey: row.idempotency_key,
        payloadHash: row.payload_hash,
        operationState: row.operation_state,
        businessState: row.business_state,
        sourceRecord: row.source_record,
        errorDetail: row.error_detail,
        statusUrl: row.status_url,
        createdAt: row.created_at?.toISOString() || new Date().toISOString(),
        updatedAt: row.updated_at?.toISOString() || new Date().toISOString(),
      };
    } catch (err: any) {
      throw new DatastoreUnavailableError(`Could not query idempotency key from durable datastore: ${err.message}`);
    }
  }

  async listOperations(projectId?: string): Promise<IntegrationOperation[]> {
    if (this.offlineMockMode) {
      const all = Array.from(this.mockOperations.values());
      return projectId ? all.filter((op) => op.projectId === projectId) : all;
    }

    try {
      const query = projectId
        ? `SELECT * FROM integration_operations WHERE project_id = $1 ORDER BY created_at DESC`
        : `SELECT * FROM integration_operations ORDER BY created_at DESC`;
      const params = projectId ? [projectId] : [];
      const res = await this.pool.query(query, params);
      return res.rows.map((row: any) => ({
        operationId: row.id,
        tenantId: row.organisation_id,
        projectId: row.project_id,
        connectionId: row.connection_id,
        action: row.action,
        idempotencyKey: row.idempotency_key,
        payloadHash: row.payload_hash,
        operationState: row.operation_state,
        businessState: row.business_state,
        sourceRecord: row.source_record,
        errorDetail: row.error_detail,
        statusUrl: row.status_url,
        createdAt: row.created_at?.toISOString() || new Date().toISOString(),
        updatedAt: row.updated_at?.toISOString() || new Date().toISOString(),
      }));
    } catch (err: any) {
      throw new DatastoreUnavailableError(`Could not list integration operations from durable datastore: ${err.message}`);
    }
  }

  // =========================================================================
  // Project Resource Demands (Atomic Optimistic Versioning)
  // =========================================================================

  async saveProjectDemand(params: {
    projectId: string;
    organisationId?: string;
    requirements: any[];
    assumptions?: any;
    expectedVersion?: number;
    updatedBy?: string;
  }): Promise<{ record: ProjectDemandRecord; isConflict: boolean }> {
    const orgId = params.organisationId || 'tenant-e3-default';

    if (this.offlineMockMode) {
      const cached = this.mockDrafts.get(`demand:${params.projectId}`) as ProjectDemandRecord | undefined;
      if (cached && params.expectedVersion !== undefined && cached.version !== params.expectedVersion) {
        return { record: cached, isConflict: true };
      }
      const record: ProjectDemandRecord = {
        projectId: params.projectId,
        organisationId: orgId,
        requirements: params.requirements,
        assumptions: params.assumptions,
        version: (cached?.version || 0) + 1,
        updatedBy: params.updatedBy,
        updatedAt: new Date().toISOString(),
      };
      this.mockDrafts.set(`demand:${params.projectId}`, record);
      return { record, isConflict: false };
    }

    try {
      // Step 1: Check if an existing record exists for this project
      const existingRes = await this.pool.query(
        `SELECT * FROM project_resource_demands WHERE project_id = $1 ORDER BY version DESC LIMIT 1`,
        [params.projectId]
      );

      if (existingRes.rows.length > 0) {
        const existing = existingRes.rows[0];

        // Optimistic concurrency check: if client sent expectedVersion and it doesn't match, return conflict immediately
        if (params.expectedVersion !== undefined && existing.version !== params.expectedVersion) {
          return {
            record: {
              id: existing.id,
              projectId: existing.project_id,
              organisationId: existing.organisation_id,
              requirements: existing.requirements,
              assumptions: existing.assumptions,
              version: existing.version,
              updatedBy: existing.updated_by,
              createdAt: existing.created_at?.toISOString(),
              updatedAt: existing.updated_at?.toISOString(),
            },
            isConflict: true,
          };
        }

        // Atomic conditional update: update ONLY IF version still equals existing.version
        const targetVersion = params.expectedVersion !== undefined ? params.expectedVersion : existing.version;
        const updateRes = await this.pool.query(
          `UPDATE project_resource_demands
           SET requirements = $1, assumptions = $2, version = version + 1, updated_by = $3, updated_at = NOW()
           WHERE id = $4 AND version = $5
           RETURNING *`,
          [
            JSON.stringify(params.requirements),
            params.assumptions ? JSON.stringify(params.assumptions) : null,
            params.updatedBy || 'system',
            existing.id,
            targetVersion,
          ]
        );

        if (updateRes.rows.length === 1) {
          const row = updateRes.rows[0];
          return {
            record: {
              id: row.id,
              projectId: row.project_id,
              organisationId: row.organisation_id,
              requirements: row.requirements,
              assumptions: row.assumptions,
              version: row.version,
              updatedBy: row.updated_by,
              createdAt: row.created_at?.toISOString(),
              updatedAt: row.updated_at?.toISOString(),
            },
            isConflict: false,
          };
        } else {
          // Race condition: another concurrent write bumped version between select and update!
          const refreshed = await this.pool.query(
            `SELECT * FROM project_resource_demands WHERE id = $1`,
            [existing.id]
          );
          const r = refreshed.rows[0] || existing;
          return {
            record: {
              id: r.id,
              projectId: r.project_id,
              organisationId: r.organisation_id,
              requirements: r.requirements,
              assumptions: r.assumptions,
              version: r.version,
              updatedBy: r.updated_by,
              createdAt: r.created_at?.toISOString(),
              updatedAt: r.updated_at?.toISOString(),
            },
            isConflict: true,
          };
        }
      }

      // If expectedVersion is specified as > 0 but no record exists, conflict!
      if (params.expectedVersion !== undefined && params.expectedVersion > 0) {
        return {
          record: {
            projectId: params.projectId,
            organisationId: orgId,
            requirements: [],
            version: 0,
          },
          isConflict: true,
        };
      }

      // Fresh insert
      const insertRes = await this.pool.query(
        `INSERT INTO project_resource_demands (
          organisation_id, project_id, requirements, assumptions, version, updated_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 1, $5, NOW(), NOW())
        RETURNING *`,
        [
          orgId,
          params.projectId,
          JSON.stringify(params.requirements),
          params.assumptions ? JSON.stringify(params.assumptions) : null,
          params.updatedBy || 'system',
        ]
      );
      const row = insertRes.rows[0];
      return {
        record: {
          id: row.id,
          projectId: row.project_id,
          organisationId: row.organisation_id,
          requirements: row.requirements,
          assumptions: row.assumptions,
          version: row.version,
          updatedBy: row.updated_by,
          createdAt: row.created_at?.toISOString(),
          updatedAt: row.updated_at?.toISOString(),
        },
        isConflict: false,
      };
    } catch (err: any) {
      throw new DatastoreUnavailableError(`Failed to persist project resource demand to PostgreSQL: ${err.message}`);
    }
  }

  async getProjectDemand(projectId: string): Promise<ProjectDemandRecord | null> {
    if (this.offlineMockMode) {
      return (this.mockDrafts.get(`demand:${projectId}`) as ProjectDemandRecord) || null;
    }

    try {
      const res = await this.pool.query(
        `SELECT * FROM project_resource_demands WHERE project_id = $1 ORDER BY version DESC LIMIT 1`,
        [projectId]
      );
      if (res.rows.length === 0) {
        return null;
      }
      const row = res.rows[0];
      return {
        id: row.id,
        projectId: row.project_id,
        organisationId: row.organisation_id,
        requirements: row.requirements,
        assumptions: row.assumptions,
        version: row.version,
        updatedBy: row.updated_by,
        createdAt: row.created_at?.toISOString(),
        updatedAt: row.updated_at?.toISOString(),
      };
    } catch (err: any) {
      throw new DatastoreUnavailableError(`Failed to fetch project resource demand from PostgreSQL: ${err.message}`);
    }
  }

  // =========================================================================
  // Project Sourcing Scenarios (Atomic Optimistic Versioning)
  // =========================================================================

  async saveSourcingScenario(params: {
    projectId: string;
    organisationId?: string;
    name: string;
    status?: string;
    demandId?: string;
    allocations: any;
    costBreakdown: any;
    readinessConditions: any;
    expectedVersion?: number;
    createdBy?: string;
  }): Promise<{ record: ProjectSourcingScenarioRecord; isConflict: boolean }> {
    const orgId = params.organisationId || 'tenant-e3-default';
    const status = params.status || 'draft';

    if (this.offlineMockMode) {
      const cached = this.mockDrafts.get(`scenario:${params.projectId}:${params.name}`) as ProjectSourcingScenarioRecord | undefined;
      if (cached && params.expectedVersion !== undefined && cached.version !== params.expectedVersion) {
        return { record: cached, isConflict: true };
      }
      const record: ProjectSourcingScenarioRecord = {
        projectId: params.projectId,
        organisationId: orgId,
        name: params.name,
        status,
        demandId: params.demandId,
        allocations: params.allocations,
        costBreakdown: params.costBreakdown,
        readinessConditions: params.readinessConditions,
        version: (cached?.version || 0) + 1,
        createdBy: params.createdBy,
        updatedAt: new Date().toISOString(),
      };
      this.mockDrafts.set(`scenario:${params.projectId}:${params.name}`, record);
      return { record, isConflict: false };
    }

    try {
      const existingRes = await this.pool.query(
        `SELECT * FROM project_sourcing_scenarios WHERE project_id = $1 AND name = $2 LIMIT 1`,
        [params.projectId, params.name]
      );

      if (existingRes.rows.length > 0) {
        const existing = existingRes.rows[0];
        if (params.expectedVersion !== undefined && existing.version !== params.expectedVersion) {
          return {
            record: {
              id: existing.id,
              projectId: existing.project_id,
              organisationId: existing.organisation_id,
              name: existing.name,
              status: existing.status,
              demandId: existing.demand_id,
              allocations: existing.allocations,
              costBreakdown: existing.cost_breakdown,
              readinessConditions: existing.readiness_conditions,
              version: existing.version,
              createdBy: existing.created_by,
              createdAt: existing.created_at?.toISOString(),
              updatedAt: existing.updated_at?.toISOString(),
            },
            isConflict: true,
          };
        }

        const targetVersion = params.expectedVersion !== undefined ? params.expectedVersion : existing.version;
        const updateRes = await this.pool.query(
          `UPDATE project_sourcing_scenarios
           SET allocations = $1, cost_breakdown = $2, readiness_conditions = $3, status = $4, version = version + 1, updated_at = NOW()
           WHERE id = $5 AND version = $6
           RETURNING *`,
          [
            JSON.stringify(params.allocations),
            JSON.stringify(params.costBreakdown),
            JSON.stringify(params.readinessConditions),
            status,
            existing.id,
            targetVersion,
          ]
        );

        if (updateRes.rows.length === 1) {
          const row = updateRes.rows[0];
          return {
            record: {
              id: row.id,
              projectId: row.project_id,
              organisationId: row.organisation_id,
              name: row.name,
              status: row.status,
              demandId: row.demand_id,
              allocations: row.allocations,
              costBreakdown: row.cost_breakdown,
              readinessConditions: row.readiness_conditions,
              version: row.version,
              createdBy: row.created_by,
              createdAt: row.created_at?.toISOString(),
              updatedAt: row.updated_at?.toISOString(),
            },
            isConflict: false,
          };
        } else {
          const refreshed = await this.pool.query(`SELECT * FROM project_sourcing_scenarios WHERE id = $1`, [existing.id]);
          const r = refreshed.rows[0] || existing;
          return {
            record: {
              id: r.id,
              projectId: r.project_id,
              organisationId: r.organisation_id,
              name: r.name,
              status: r.status,
              demandId: r.demand_id,
              allocations: r.allocations,
              costBreakdown: r.cost_breakdown,
              readinessConditions: r.readiness_conditions,
              version: r.version,
              createdBy: r.created_by,
              createdAt: r.created_at?.toISOString(),
              updatedAt: r.updated_at?.toISOString(),
            },
            isConflict: true,
          };
        }
      }

      if (params.expectedVersion !== undefined && params.expectedVersion > 0) {
        return {
          record: {
            projectId: params.projectId,
            organisationId: orgId,
            name: params.name,
            status,
            allocations: params.allocations,
            costBreakdown: params.costBreakdown,
            readinessConditions: params.readinessConditions,
            version: 0,
          },
          isConflict: true,
        };
      }

      const insertRes = await this.pool.query(
        `INSERT INTO project_sourcing_scenarios (
          organisation_id, project_id, name, status, demand_id, allocations, cost_breakdown, readiness_conditions, version, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, $9, NOW(), NOW())
        RETURNING *`,
        [
          orgId,
          params.projectId,
          params.name,
          status,
          params.demandId || null,
          JSON.stringify(params.allocations),
          JSON.stringify(params.costBreakdown),
          JSON.stringify(params.readinessConditions),
          params.createdBy || 'system',
        ]
      );
      const row = insertRes.rows[0];
      return {
        record: {
          id: row.id,
          projectId: row.project_id,
          organisationId: row.organisation_id,
          name: row.name,
          status: row.status,
          demandId: row.demand_id,
          allocations: row.allocations,
          costBreakdown: row.cost_breakdown,
          readinessConditions: row.readiness_conditions,
          version: row.version,
          createdBy: row.created_by,
          createdAt: row.created_at?.toISOString(),
          updatedAt: row.updated_at?.toISOString(),
        },
        isConflict: false,
      };
    } catch (err: any) {
      throw new DatastoreUnavailableError(`Failed to persist sourcing scenario to PostgreSQL: ${err.message}`);
    }
  }

  async listSourcingScenarios(projectId: string): Promise<ProjectSourcingScenarioRecord[]> {
    if (this.offlineMockMode) {
      const results: ProjectSourcingScenarioRecord[] = [];
      for (const [k, v] of this.mockDrafts.entries()) {
        if (k.startsWith(`scenario:${projectId}`)) {
          results.push(v as ProjectSourcingScenarioRecord);
        }
      }
      return results;
    }

    try {
      const res = await this.pool.query(
        `SELECT * FROM project_sourcing_scenarios WHERE project_id = $1 ORDER BY updated_at DESC`,
        [projectId]
      );
      return res.rows.map((row: any) => ({
        id: row.id,
        projectId: row.project_id,
        organisationId: row.organisation_id,
        name: row.name,
        status: row.status,
        demandId: row.demand_id,
        allocations: row.allocations,
        costBreakdown: row.cost_breakdown,
        readinessConditions: row.readiness_conditions,
        version: row.version,
        createdBy: row.created_by,
        createdAt: row.created_at?.toISOString(),
        updatedAt: row.updated_at?.toISOString(),
      }));
    } catch (err: any) {
      throw new DatastoreUnavailableError(`Failed to list sourcing scenarios from PostgreSQL: ${err.message}`);
    }
  }

  // =========================================================================
  // Capacity Conflict Decisions (Assignment & Rationale)
  // =========================================================================

  async saveConflictDecision(params: {
    projectId: string;
    organisationId?: string;
    conflictRef: string;
    resourcePoolId: string;
    assignedOwner?: string;
    resolutionAction?: string;
    rationale?: string;
    status?: string;
    decidedBy?: string;
  }): Promise<ConflictDecisionRecord> {
    const orgId = params.organisationId || 'tenant-e3-default';
    const status = params.status || 'unresolved';

    if (this.offlineMockMode) {
      const record: ConflictDecisionRecord = {
        projectId: params.projectId,
        organisationId: orgId,
        conflictRef: params.conflictRef,
        resourcePoolId: params.resourcePoolId,
        assignedOwner: params.assignedOwner,
        resolutionAction: params.resolutionAction,
        rationale: params.rationale,
        status,
        decidedBy: params.decidedBy,
        createdAt: new Date().toISOString(),
        resolvedAt: status === 'approved' ? new Date().toISOString() : undefined,
      };
      this.mockDrafts.set(`conflict:${params.projectId}:${params.conflictRef}`, record);
      return record;
    }

    try {
      const existingRes = await this.pool.query(
        `SELECT * FROM capacity_conflict_decisions WHERE project_id = $1 AND conflict_ref = $2 LIMIT 1`,
        [params.projectId, params.conflictRef]
      );

      if (existingRes.rows.length > 0) {
        const existing = existingRes.rows[0];
        const updateRes = await this.pool.query(
          `UPDATE capacity_conflict_decisions
           SET assigned_owner = $1, resolution_action = $2, rationale = $3, status = $4, decided_by = $5,
               resolved_at = CASE WHEN $4 = 'approved' THEN NOW() ELSE resolved_at END
           WHERE id = $6
           RETURNING *`,
          [
            params.assignedOwner || existing.assigned_owner,
            params.resolutionAction || existing.resolution_action,
            params.rationale || existing.rationale,
            status,
            params.decidedBy || existing.decided_by,
            existing.id,
          ]
        );
        const row = updateRes.rows[0];
        return {
          id: row.id,
          projectId: row.project_id,
          organisationId: row.organisation_id,
          conflictRef: row.conflict_ref,
          resourcePoolId: row.resource_pool_id,
          assignedOwner: row.assigned_owner,
          resolutionAction: row.resolution_action,
          rationale: row.rationale,
          status: row.status,
          decidedBy: row.decided_by,
          createdAt: row.created_at?.toISOString(),
          resolvedAt: row.resolved_at?.toISOString(),
        };
      }

      const insertRes = await this.pool.query(
        `INSERT INTO capacity_conflict_decisions (
          organisation_id, project_id, conflict_ref, resource_pool_id, assigned_owner, resolution_action, rationale, status, decided_by, created_at, resolved_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), CASE WHEN $8 = 'approved' THEN NOW() ELSE NULL END)
        RETURNING *`,
        [
          orgId,
          params.projectId,
          params.conflictRef,
          params.resourcePoolId,
          params.assignedOwner || null,
          params.resolutionAction || null,
          params.rationale || null,
          status,
          params.decidedBy || null,
        ]
      );
      const row = insertRes.rows[0];
      return {
        id: row.id,
        projectId: row.project_id,
        organisationId: row.organisation_id,
        conflictRef: row.conflict_ref,
        resourcePoolId: row.resource_pool_id,
        assignedOwner: row.assigned_owner,
        resolutionAction: row.resolution_action,
        rationale: row.rationale,
        status: row.status,
        decidedBy: row.decided_by,
        createdAt: row.created_at?.toISOString(),
        resolvedAt: row.resolved_at?.toISOString(),
      };
    } catch (err: any) {
      throw new DatastoreUnavailableError(`Failed to persist capacity conflict decision to PostgreSQL: ${err.message}`);
    }
  }

  async listConflictDecisions(projectId: string): Promise<ConflictDecisionRecord[]> {
    if (this.offlineMockMode) {
      const results: ConflictDecisionRecord[] = [];
      for (const [k, v] of this.mockDrafts.entries()) {
        if (k.startsWith(`conflict:${projectId}`)) {
          results.push(v as ConflictDecisionRecord);
        }
      }
      return results;
    }

    try {
      const res = await this.pool.query(
        `SELECT * FROM capacity_conflict_decisions WHERE project_id = $1 ORDER BY created_at DESC`,
        [projectId]
      );
      return res.rows.map((row: any) => ({
        id: row.id,
        projectId: row.project_id,
        organisationId: row.organisation_id,
        conflictRef: row.conflict_ref,
        resourcePoolId: row.resource_pool_id,
        assignedOwner: row.assigned_owner,
        resolutionAction: row.resolution_action,
        rationale: row.rationale,
        status: row.status,
        decidedBy: row.decided_by,
        createdAt: row.created_at?.toISOString(),
        resolvedAt: row.resolved_at?.toISOString(),
      }));
    } catch (err: any) {
      throw new DatastoreUnavailableError(`Failed to list conflict decisions from PostgreSQL: ${err.message}`);
    }
  }

  // =========================================================================
  // Ephemeral Preparation Drafts (Non-Durable Working State)
  // =========================================================================

  saveLocalDraft(key: string, data: unknown): void {
    this.mockDrafts.set(key, data);
  }

  getLocalDraft<T = unknown>(key: string): T | undefined {
    return this.mockDrafts.get(key) as T | undefined;
  }

  listLocalDrafts<T = any>(prefix?: string): T[] {
    const results: T[] = [];
    for (const [k, v] of this.mockDrafts.entries()) {
      if (!prefix || k.startsWith(prefix)) {
        results.push(v as T);
      }
    }
    return results;
  }

  // =========================================================================
  // Testing & Cleanup Utilities
  // =========================================================================

  async clearForTesting(projectId?: string): Promise<void> {
    this.mockOperations.clear();
    this.mockDrafts.clear();
    try {
      if (projectId) {
        await this.pool.query('DELETE FROM integration_operations WHERE project_id = $1', [projectId]);
        await this.pool.query('DELETE FROM project_resource_demands WHERE project_id = $1', [projectId]);
        await this.pool.query('DELETE FROM project_sourcing_scenarios WHERE project_id = $1', [projectId]);
        await this.pool.query('DELETE FROM capacity_conflict_decisions WHERE project_id = $1', [projectId]);
      } else {
        await this.pool.query('DELETE FROM integration_operations');
        await this.pool.query('DELETE FROM project_resource_demands');
        await this.pool.query('DELETE FROM project_sourcing_scenarios');
        await this.pool.query('DELETE FROM capacity_conflict_decisions');
      }
    } catch {
      // Ignore if DB not reachable during clear
    }
  }
}

export const globalIntegrationOperationsStore = IntegrationOperationsStore.getInstance();
