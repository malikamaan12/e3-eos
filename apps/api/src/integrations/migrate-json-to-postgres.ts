import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDbPool, PgPool } from '@e3-eos/db';

export interface QuarantineEntry {
  id: string;
  type: 'operation' | 'demand' | 'scenario' | 'conflict_decision' | 'unknown';
  reason: string;
  payloadSummary: Record<string, unknown>;
}

export interface EntityMigrationStats {
  total: number;
  valid: number;
  imported: number;
  skippedDuplicates: number;
  quarantined: number;
}

export interface MigrationReport {
  timestamp: string;
  sourceFile: string;
  sourceSha256: string;
  backupFile: string | null;
  isDryRun: boolean;
  operations: EntityMigrationStats;
  demands: EntityMigrationStats;
  scenarios: EntityMigrationStats;
  conflicts: EntityMigrationStats;
  quarantinedRecords: QuarantineEntry[];
  reconciliationSummary: {
    totalRecordsInspected: number;
    totalEligible: number;
    totalCommitted: number;
    totalQuarantined: number;
    status: 'success' | 'dry_run_completed' | 'quarantine_warnings' | 'failed';
  };
}

export class JsonToPostgresMigrator {
  private pool: PgPool;

  constructor(pool?: PgPool) {
    this.pool = pool || getDbPool();
  }

  /**
   * Computes SHA-256 checksum of the target file.
   */
  static computeChecksum(filePath: string): string {
    if (!fs.existsSync(filePath)) {
      return '';
    }
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Executes a controlled, repeatable import of historical JSON operations & drafts.
   * Conforms strictly to Section 4 of the 19 September 2026 Specification.
   */
  async runMigration(options: {
    sourceFilePath?: string;
    dryRun?: boolean;
    backupDir?: string;
  } = {}): Promise<MigrationReport> {
    const isDryRun = options.dryRun ?? false;
    const now = new Date().toISOString();

    const candidatePaths = [
      options.sourceFilePath,
      path.resolve(process.cwd(), 'apps', 'api', 'data', 'integration-operations.json'),
      path.resolve(process.cwd(), 'data', 'integration-operations.json'),
      path.resolve(process.cwd(), 'integration-operations.json'),
    ].filter(Boolean) as string[];

    let targetPath = '';
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        targetPath = p;
        break;
      }
    }

    if (!targetPath || !fs.existsSync(targetPath)) {
      return {
        timestamp: now,
        sourceFile: targetPath || 'none',
        sourceSha256: '',
        backupFile: null,
        isDryRun,
        operations: { total: 0, valid: 0, imported: 0, skippedDuplicates: 0, quarantined: 0 },
        demands: { total: 0, valid: 0, imported: 0, skippedDuplicates: 0, quarantined: 0 },
        scenarios: { total: 0, valid: 0, imported: 0, skippedDuplicates: 0, quarantined: 0 },
        conflicts: { total: 0, valid: 0, imported: 0, skippedDuplicates: 0, quarantined: 0 },
        quarantinedRecords: [],
        reconciliationSummary: {
          totalRecordsInspected: 0,
          totalEligible: 0,
          totalCommitted: 0,
          totalQuarantined: 0,
          status: 'success',
        },
      };
    }

    const sourceSha256 = JsonToPostgresMigrator.computeChecksum(targetPath);
    let backupFile: string | null = null;

    // Step 1: Retain backup
    if (!isDryRun) {
      const backupDirectory = options.backupDir || path.dirname(targetPath);
      const backupName = `integration-operations.backup.${Date.now()}.${sourceSha256.slice(0, 8)}.json`;
      backupFile = path.join(backupDirectory, backupName);
      try {
        fs.copyFileSync(targetPath, backupFile);
      } catch {
        // If directory is read-only (e.g. Vercel), continue migration without creating local disk backup
        backupFile = null;
      }
    }

    // Step 2: Read and parse JSON
    const raw = fs.readFileSync(targetPath, 'utf-8');
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (e: any) {
      throw new Error(`Failed to parse JSON migration source ${targetPath}: ${e.message}`);
    }

    const operationsStats: EntityMigrationStats = { total: 0, valid: 0, imported: 0, skippedDuplicates: 0, quarantined: 0 };
    const demandsStats: EntityMigrationStats = { total: 0, valid: 0, imported: 0, skippedDuplicates: 0, quarantined: 0 };
    const scenariosStats: EntityMigrationStats = { total: 0, valid: 0, imported: 0, skippedDuplicates: 0, quarantined: 0 };
    const conflictsStats: EntityMigrationStats = { total: 0, valid: 0, imported: 0, skippedDuplicates: 0, quarantined: 0 };
    const quarantinedRecords: QuarantineEntry[] = [];

    const rawOperations: any[] = Object.values(parsed.operations || {});
    const rawDrafts: Record<string, any> = parsed.localDrafts || {};

    operationsStats.total = rawOperations.length;

    // Separate local drafts into respective entity types
    const rawDemands: any[] = [];
    const rawScenarios: any[] = [];
    const rawConflicts: any[] = [];

    for (const [k, v] of Object.entries(rawDrafts)) {
      if (k.startsWith('demand:')) {
        rawDemands.push(v);
      } else if (k.startsWith('scenario:')) {
        rawScenarios.push(v);
      } else if (k.startsWith('conflict:')) {
        rawConflicts.push(v);
      } else {
        // Unrecognized draft key -> Quarantine!
        quarantinedRecords.push({
          id: k,
          type: 'unknown',
          reason: `Unrecognized draft key format: '${k}'. Cannot determine target entity table.`,
          payloadSummary: { key: k },
        });
      }
    }

    demandsStats.total = rawDemands.length;
    scenariosStats.total = rawScenarios.length;
    conflictsStats.total = rawConflicts.length;

    // Step 3: Inspect & Validate records (Quarantine ambiguous / orphaned records)
    const validOperations: any[] = [];
    for (const op of rawOperations) {
      if (!op.operationId || !op.projectId || !op.idempotencyKey) {
        quarantinedRecords.push({
          id: op.operationId || 'missing_id',
          type: 'operation',
          reason: 'Missing critical operation fields (operationId, projectId, or idempotencyKey)',
          payloadSummary: { op },
        });
        operationsStats.quarantined++;
      } else if (!op.tenantId && !op.organisationId) {
        // Invariant Section 4: Never assign ambiguous records to default project or tenant!
        quarantinedRecords.push({
          id: op.operationId,
          type: 'operation',
          reason: 'Unknown tenant ownership (tenantId/organisationId missing). Ambiguous record quarantined.',
          payloadSummary: { operationId: op.operationId, projectId: op.projectId },
        });
        operationsStats.quarantined++;
      } else {
        validOperations.push(op);
        operationsStats.valid++;
      }
    }

    const validDemands: any[] = [];
    for (const d of rawDemands) {
      if (!d.projectId || !Array.isArray(d.requirements)) {
        quarantinedRecords.push({
          id: d.id || 'missing_id',
          type: 'demand',
          reason: 'Missing projectId or requirements array is not valid',
          payloadSummary: { d },
        });
        demandsStats.quarantined++;
      } else if (!d.organisationId) {
        quarantinedRecords.push({
          id: d.id || d.projectId,
          type: 'demand',
          reason: 'Unknown tenant ownership (organisationId missing). Ambiguous record quarantined.',
          payloadSummary: { projectId: d.projectId },
        });
        demandsStats.quarantined++;
      } else {
        validDemands.push(d);
        demandsStats.valid++;
      }
    }

    const validScenarios: any[] = [];
    for (const s of rawScenarios) {
      if (!s.projectId || !s.name || !s.allocations) {
        quarantinedRecords.push({
          id: s.id || 'missing_id',
          type: 'scenario',
          reason: 'Missing projectId, scenario name, or allocations',
          payloadSummary: { s },
        });
        scenariosStats.quarantined++;
      } else if (!s.organisationId) {
        quarantinedRecords.push({
          id: s.id || s.name,
          type: 'scenario',
          reason: 'Unknown tenant ownership (organisationId missing). Ambiguous record quarantined.',
          payloadSummary: { projectId: s.projectId, name: s.name },
        });
        scenariosStats.quarantined++;
      } else {
        validScenarios.push(s);
        scenariosStats.valid++;
      }
    }

    const validConflicts: any[] = [];
    for (const c of rawConflicts) {
      if (!c.projectId || !c.conflictRef || !c.resourcePoolId) {
        quarantinedRecords.push({
          id: c.id || 'missing_id',
          type: 'conflict_decision',
          reason: 'Missing projectId, conflictRef, or resourcePoolId',
          payloadSummary: { c },
        });
        conflictsStats.quarantined++;
      } else if (!c.organisationId) {
        quarantinedRecords.push({
          id: c.id || c.conflictRef,
          type: 'conflict_decision',
          reason: 'Unknown tenant ownership (organisationId missing). Ambiguous record quarantined.',
          payloadSummary: { projectId: c.projectId, conflictRef: c.conflictRef },
        });
        conflictsStats.quarantined++;
      } else {
        validConflicts.push(c);
        conflictsStats.valid++;
      }
    }

    // Step 4: If not a dry run, execute database inserts inside an isolated transaction
    if (!isDryRun) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');

        // Operations
        for (const op of validOperations) {
          const res = await client.query(
            `INSERT INTO integration_operations (
              id, organisation_id, project_id, connection_id, action,
              idempotency_key, payload_hash, operation_state, business_state,
              source_record, error_detail, status_url, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (idempotency_key) DO NOTHING
            RETURNING id`,
            [
              op.operationId,
              op.tenantId || op.organisationId,
              op.projectId,
              op.connectionId || 'rentals-production',
              op.action || 'equipment_reservation',
              op.idempotencyKey,
              op.payloadHash || 'migrated_payload',
              op.operationState || 'completed',
              op.businessState || 'confirmed',
              op.sourceRecord ? JSON.stringify(op.sourceRecord) : null,
              op.errorDetail || null,
              op.statusUrl || `/api/v1/integration-operations/${op.operationId}`,
              op.createdAt ? new Date(op.createdAt) : new Date(),
              op.updatedAt ? new Date(op.updatedAt) : new Date(),
            ]
          );
          if (res.rows.length > 0) {
            operationsStats.imported++;
          } else {
            operationsStats.skippedDuplicates++;
          }
        }

        // Demands
        for (const d of validDemands) {
          const demandId = d.id || crypto.randomUUID();
          const res = await client.query(
            `INSERT INTO project_resource_demands (
              id, organisation_id, project_id, requirements, assumptions, version, updated_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO NOTHING
            RETURNING id`,
            [
              demandId,
              d.organisationId,
              d.projectId,
              JSON.stringify(d.requirements),
              d.assumptions ? JSON.stringify(d.assumptions) : null,
              d.version || 1,
              d.updatedBy || 'json_migrator',
              d.createdAt ? new Date(d.createdAt) : new Date(),
              d.updatedAt ? new Date(d.updatedAt) : new Date(),
            ]
          );
          if (res.rows.length > 0) {
            demandsStats.imported++;
          } else {
            demandsStats.skippedDuplicates++;
          }
        }

        // Scenarios
        for (const s of validScenarios) {
          const scenarioId = s.id || crypto.randomUUID();
          const res = await client.query(
            `INSERT INTO project_sourcing_scenarios (
              id, organisation_id, project_id, name, status, demand_id,
              allocations, cost_breakdown, readiness_conditions, version, created_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (id) DO NOTHING
            RETURNING id`,
            [
              scenarioId,
              s.organisationId,
              s.projectId,
              s.name,
              s.status || 'draft',
              s.demandId || null,
              JSON.stringify(s.allocations),
              JSON.stringify(s.costBreakdown || {}),
              JSON.stringify(s.readinessConditions || {}),
              s.version || 1,
              s.createdBy || 'json_migrator',
              s.createdAt ? new Date(s.createdAt) : new Date(),
              s.updatedAt ? new Date(s.updatedAt) : new Date(),
            ]
          );
          if (res.rows.length > 0) {
            scenariosStats.imported++;
          } else {
            scenariosStats.skippedDuplicates++;
          }
        }

        // Conflicts
        for (const c of validConflicts) {
          const conflictId = c.id || crypto.randomUUID();
          const res = await client.query(
            `INSERT INTO capacity_conflict_decisions (
              id, organisation_id, project_id, conflict_ref, resource_pool_id,
              assigned_owner, resolution_action, rationale, status, decided_by, created_at, resolved_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (id) DO NOTHING
            RETURNING id`,
            [
              conflictId,
              c.organisationId,
              c.projectId,
              c.conflictRef,
              c.resourcePoolId,
              c.assignedOwner || null,
              c.resolutionAction || null,
              c.rationale || null,
              c.status || 'unresolved',
              c.decidedBy || null,
              c.createdAt ? new Date(c.createdAt) : new Date(),
              c.resolvedAt ? new Date(c.resolvedAt) : null,
            ]
          );
          if (res.rows.length > 0) {
            conflictsStats.imported++;
          } else {
            conflictsStats.skippedDuplicates++;
          }
        }

        await client.query('COMMIT');
      } catch (err: any) {
        await client.query('ROLLBACK');
        throw new Error(`Migration failed and transaction rolled back: ${err.message}`);
      } finally {
        client.release();
      }
    }

    const totalEligible = operationsStats.valid + demandsStats.valid + scenariosStats.valid + conflictsStats.valid;
    const totalCommitted = operationsStats.imported + demandsStats.imported + scenariosStats.imported + conflictsStats.imported;
    const totalQuarantined = quarantinedRecords.length;

    let status: MigrationReport['reconciliationSummary']['status'] = 'success';
    if (isDryRun) {
      status = 'dry_run_completed';
    } else if (totalQuarantined > 0) {
      status = 'quarantine_warnings';
    }

    return {
      timestamp: now,
      sourceFile: targetPath,
      sourceSha256,
      backupFile,
      isDryRun,
      operations: operationsStats,
      demands: demandsStats,
      scenarios: scenariosStats,
      conflicts: conflictsStats,
      quarantinedRecords,
      reconciliationSummary: {
        totalRecordsInspected: operationsStats.total + demandsStats.total + scenariosStats.total + conflictsStats.total,
        totalEligible,
        totalCommitted,
        totalQuarantined,
        status,
      },
    };
  }
}
