import fs from 'fs';
import path from 'path';
import { IntegrationOperation } from '@e3-eos/domain';
import { getDbPool } from '@e3-eos/db';

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

export class IntegrationOperationsStore {
  private static instance: IntegrationOperationsStore;
  private filePath: string;
  private operations: Map<string, IntegrationOperation> = new Map();
  private localDrafts: Map<string, unknown> = new Map();
  private pool = getDbPool();
  private isDbReady = false;

  private constructor() {
    const candidatePaths = [
      path.resolve(process.cwd(), 'apps', 'api', 'data', 'integration-operations.json'),
      path.resolve(process.cwd(), 'data', 'integration-operations.json'),
      path.resolve(process.cwd(), 'integration-operations.json'),
    ];

    let chosenPath = candidatePaths[0];
    for (const p of candidatePaths) {
      if (fs.existsSync(path.dirname(p))) {
        chosenPath = p;
        break;
      }
    }
    this.filePath = chosenPath;
    this.ensureDirectory();
    this.loadFromDisk();
    this.initializeDbAndMigrateJson();
  }

  static getInstance(): IntegrationOperationsStore {
    if (!this.instance) {
      this.instance = new IntegrationOperationsStore();
    }
    return this.instance;
  }

  isReady(): boolean {
    return this.isDbReady;
  }

  private ensureDirectory() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch {
      // Ignore in read-only filesystem environments (e.g. Vercel)
    }
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed: IntegrationOperationsFile = JSON.parse(raw);
        if (parsed.operations) {
          for (const [k, v] of Object.entries(parsed.operations)) {
            this.operations.set(k, v);
          }
        }
        if (parsed.localDrafts) {
          for (const [k, v] of Object.entries(parsed.localDrafts)) {
            this.localDrafts.set(k, v);
          }
        }
      }
    } catch {
      // File missing or unreadable; start with clean in-memory map
    }
  }

  private persistToDisk() {
    try {
      this.ensureDirectory();
      const payload: IntegrationOperationsFile = {
        version: 1,
        updatedAt: new Date().toISOString(),
        operations: Object.fromEntries(this.operations),
        localDrafts: Object.fromEntries(this.localDrafts),
      };
      fs.writeFileSync(this.filePath, JSON.stringify(payload, null, 2), 'utf-8');
    } catch {
      // Gracefully ignore on read-only environments (Vercel Functions / Cloud Run)
    }
  }

  /**
   * Initializes database connectivity and backfills any legitimate
   * historical JSON records from disk into PostgreSQL.
   */
  private async initializeDbAndMigrateJson() {
    try {
      const client = await this.pool.connect();
      try {
        // Test query
        await client.query('SELECT 1 FROM integration_operations LIMIT 1');
        this.isDbReady = true;

        // Backfill / migrate legitimate JSON records from disk to DB
        if (this.operations.size > 0) {
          for (const op of this.operations.values()) {
            await client.query(
              `INSERT INTO integration_operations (
                id, organisation_id, project_id, connection_id, action,
                idempotency_key, payload_hash, operation_state, business_state,
                source_record, error_detail, status_url, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
              ON CONFLICT (idempotency_key) DO NOTHING`,
              [
                op.operationId,
                op.tenantId || 'tenant-e3-default',
                op.projectId,
                op.connectionId,
                op.action,
                op.idempotencyKey,
                op.payloadHash,
                op.operationState,
                op.businessState,
                op.sourceRecord ? JSON.stringify(op.sourceRecord) : null,
                op.errorDetail || null,
                op.statusUrl,
                op.createdAt ? new Date(op.createdAt) : new Date(),
                op.updatedAt ? new Date(op.updatedAt) : new Date(),
              ]
            );
          }
        }
      } finally {
        client.release();
      }
    } catch (err: any) {
      // DB not ready or not migrated yet
    }
  }

  // =========================================================================
  // Integration Operations (Durable & Idempotent)
  // =========================================================================

  async saveOperation(operation: IntegrationOperation, organisationId: string = 'tenant-e3-default'): Promise<void> {
    this.operations.set(operation.operationId, operation);
    this.persistToDisk();

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
    } catch {
      // Database fallback to in-memory map
    }
  }

  async getOperation(operationId: string): Promise<IntegrationOperation | undefined> {
    try {
      const res = await this.pool.query(
        `SELECT * FROM integration_operations WHERE id = $1`,
        [operationId]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        const op: IntegrationOperation = {
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
        this.operations.set(operationId, op);
        return op;
      }
    } catch {
      // Fall through to in-memory cache
    }
    return this.operations.get(operationId);
  }

  async getOperationByIdempotencyKey(key: string): Promise<IntegrationOperation | undefined> {
    try {
      const res = await this.pool.query(
        `SELECT * FROM integration_operations WHERE idempotency_key = $1`,
        [key]
      );
      if (res.rows.length > 0) {
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
      }
    } catch {
      // Fall through to in-memory map
    }
    for (const op of this.operations.values()) {
      if (op.idempotencyKey === key) return op;
    }
    return undefined;
  }

  async listOperations(projectId?: string): Promise<IntegrationOperation[]> {
    try {
      const query = projectId
        ? `SELECT * FROM integration_operations WHERE project_id = $1 ORDER BY created_at DESC`
        : `SELECT * FROM integration_operations ORDER BY created_at DESC`;
      const params = projectId ? [projectId] : [];
      const res = await this.pool.query(query, params);
      if (res.rows.length > 0) {
        return res.rows.map((row) => ({
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
      }
    } catch {
      // Fallback
    }
    const all = Array.from(this.operations.values());
    return projectId ? all.filter((op) => op.projectId === projectId) : all;
  }

  // =========================================================================
  // Project Resource Demands (with Optimistic Versioning)
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

    try {
      const existingRes = await this.pool.query(
        `SELECT * FROM project_resource_demands WHERE project_id = $1 ORDER BY version DESC LIMIT 1`,
        [params.projectId]
      );

      if (existingRes.rows.length > 0) {
        const existing = existingRes.rows[0];
        // Concurrency Guard: Optimistic version check
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
              updatedAt: existing.updated_at?.toISOString(),
            },
            isConflict: true,
          };
        }

        const newVersion = existing.version + 1;
        const updateRes = await this.pool.query(
          `UPDATE project_resource_demands
           SET requirements = $1, assumptions = $2, version = $3, updated_by = $4, updated_at = NOW()
           WHERE id = $5
           RETURNING *`,
          [
            JSON.stringify(params.requirements),
            params.assumptions ? JSON.stringify(params.assumptions) : null,
            newVersion,
            params.updatedBy || 'system',
            existing.id,
          ]
        );
        const row = updateRes.rows[0];
        const record: ProjectDemandRecord = {
          id: row.id,
          projectId: row.project_id,
          organisationId: row.organisation_id,
          requirements: row.requirements,
          assumptions: row.assumptions,
          version: row.version,
          updatedBy: row.updated_by,
          updatedAt: row.updated_at?.toISOString(),
        };
        this.saveLocalDraft(`demand:${params.projectId}`, record);
        return { record, isConflict: false };
      }

      // Insert fresh demand
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
      const record: ProjectDemandRecord = {
        id: row.id,
        projectId: row.project_id,
        organisationId: row.organisation_id,
        requirements: row.requirements,
        assumptions: row.assumptions,
        version: row.version,
        updatedBy: row.updated_by,
        updatedAt: row.updated_at?.toISOString(),
      };
      this.saveLocalDraft(`demand:${params.projectId}`, record);
      return { record, isConflict: false };
    } catch {
      // In-memory fallback
      const cached = this.getLocalDraft<ProjectDemandRecord>(`demand:${params.projectId}`);
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
      this.saveLocalDraft(`demand:${params.projectId}`, record);
      return { record, isConflict: false };
    }
  }

  async getProjectDemand(projectId: string): Promise<ProjectDemandRecord | null> {
    try {
      const res = await this.pool.query(
        `SELECT * FROM project_resource_demands WHERE project_id = $1 ORDER BY version DESC LIMIT 1`,
        [projectId]
      );
      if (res.rows.length > 0) {
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
      }
    } catch {
      // Fall through to local cache
    }
    return this.getLocalDraft<ProjectDemandRecord>(`demand:${projectId}`) || null;
  }

  // =========================================================================
  // Project Sourcing Scenarios & Multi-Sourcing Records
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
              updatedAt: existing.updated_at?.toISOString(),
            },
            isConflict: true,
          };
        }

        const newVersion = existing.version + 1;
        const updateRes = await this.pool.query(
          `UPDATE project_sourcing_scenarios
           SET allocations = $1, cost_breakdown = $2, readiness_conditions = $3, status = $4, version = $5, updated_at = NOW()
           WHERE id = $6
           RETURNING *`,
          [
            JSON.stringify(params.allocations),
            JSON.stringify(params.costBreakdown),
            JSON.stringify(params.readinessConditions),
            status,
            newVersion,
            existing.id,
          ]
        );
        const row = updateRes.rows[0];
        const record: ProjectSourcingScenarioRecord = {
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
          updatedAt: row.updated_at?.toISOString(),
        };
        this.saveLocalDraft(`scenario:${params.projectId}:${params.name}`, record);
        return { record, isConflict: false };
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
      const record: ProjectSourcingScenarioRecord = {
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
        updatedAt: row.updated_at?.toISOString(),
      };
      this.saveLocalDraft(`scenario:${params.projectId}:${params.name}`, record);
      return { record, isConflict: false };
    } catch {
      const record: ProjectSourcingScenarioRecord = {
        projectId: params.projectId,
        organisationId: orgId,
        name: params.name,
        status,
        demandId: params.demandId,
        allocations: params.allocations,
        costBreakdown: params.costBreakdown,
        readinessConditions: params.readinessConditions,
        version: 1,
        createdBy: params.createdBy,
        updatedAt: new Date().toISOString(),
      };
      this.saveLocalDraft(`scenario:${params.projectId}:${params.name}`, record);
      return { record, isConflict: false };
    }
  }

  async listSourcingScenarios(projectId: string): Promise<ProjectSourcingScenarioRecord[]> {
    try {
      const res = await this.pool.query(
        `SELECT * FROM project_sourcing_scenarios WHERE project_id = $1 ORDER BY updated_at DESC`,
        [projectId]
      );
      if (res.rows.length > 0) {
        return res.rows.map((row) => ({
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
      }
    } catch {
      // Fall through to memory
    }
    return this.listLocalDrafts<ProjectSourcingScenarioRecord>(`scenario:${projectId}`);
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
          organisation_id, project_id, conflict_ref, resource_pool_id, assigned_owner, resolution_action, rationale, status, decided_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
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
    } catch {
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
      };
      this.saveLocalDraft(`conflict:${params.projectId}:${params.conflictRef}`, record);
      return record;
    }
  }

  async listConflictDecisions(projectId: string): Promise<ConflictDecisionRecord[]> {
    try {
      const res = await this.pool.query(
        `SELECT * FROM capacity_conflict_decisions WHERE project_id = $1 ORDER BY created_at DESC`,
        [projectId]
      );
      if (res.rows.length > 0) {
        return res.rows.map((row) => ({
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
      }
    } catch {
      // Fallback
    }
    return this.listLocalDrafts<ConflictDecisionRecord>(`conflict:${projectId}`);
  }

  // =========================================================================
  // Local In-Memory Fallback & Testing Utilities
  // =========================================================================

  saveLocalDraft(key: string, data: unknown): void {
    this.localDrafts.set(key, data);
    this.persistToDisk();
  }

  getLocalDraft<T = unknown>(key: string): T | undefined {
    return this.localDrafts.get(key) as T | undefined;
  }

  listLocalDrafts<T = unknown>(prefix?: string): T[] {
    const results: T[] = [];
    for (const [k, v] of this.localDrafts.entries()) {
      if (!prefix || k.startsWith(prefix)) {
        results.push(v as T);
      }
    }
    return results;
  }

  async clearForTesting(): Promise<void> {
    this.operations.clear();
    this.localDrafts.clear();
    this.persistToDisk();
    try {
      await this.pool.query('DELETE FROM integration_operations');
      await this.pool.query('DELETE FROM project_resource_demands');
      await this.pool.query('DELETE FROM project_sourcing_scenarios');
      await this.pool.query('DELETE FROM capacity_conflict_decisions');
    } catch {
      // Ignore if DB offline
    }
  }
}

export const globalIntegrationOperationsStore = IntegrationOperationsStore.getInstance();
