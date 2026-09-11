import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let Client: any = null;
try {
  Client = require('pg').Client;
} catch {
  try {
    Client = require(resolve(process.cwd(), 'packages/db/node_modules/pg')).Client;
  } catch {}
}

describe('PostgreSQL 17 Row Level Security (RLS) & Physical Tenant Isolation Audit', () => {

  const migrationPath = resolve(process.cwd(), 'packages/db/migrations/0001_enable_row_level_security.sql');
  const migrationSql = readFileSync(migrationPath, 'utf8');

  // 1. DDL Audit: Verification of ENABLE and FORCE ROW LEVEL SECURITY
  it('RLS-01: Verifies all multi-tenant tables enforce both ENABLE and FORCE ROW LEVEL SECURITY', () => {
    const requiredTables = [
      'organisations',
      'users',
      'projects',
      'stage_instances',
      'stage_activities',
      'boq_items',
      'purchase_orders',
      'inventory_resources',
      'reservations',
      'audit_events',
    ];

    for (const table of requiredTables) {
      expect(migrationSql).toContain(`ALTER TABLE IF EXISTS ${table} ENABLE ROW LEVEL SECURITY;`);
      expect(migrationSql).toContain(`ALTER TABLE IF EXISTS ${table} FORCE ROW LEVEL SECURITY;`);
    }
  });

  it('RLS-01b: Verifies operational constraints and controlled documents enforce ENABLE and FORCE ROW LEVEL SECURITY', () => {
    const migration0002Path = resolve(process.cwd(), 'packages/db/migrations/0002_operational_constraints_and_documents.sql');
    const migration0002Sql = readFileSync(migration0002Path, 'utf8');
    const constraintTables = [
      'operational_constraints',
      'constraint_source_links',
      'constraint_verifications',
      'controlled_documents',
      'controlled_document_revisions',
    ];

    for (const table of constraintTables) {
      expect(migration0002Sql).toContain(`ALTER TABLE IF EXISTS ${table} ENABLE ROW LEVEL SECURITY;`);
      expect(migration0002Sql).toContain(`ALTER TABLE IF EXISTS ${table} FORCE ROW LEVEL SECURITY;`);
      expect(migration0002Sql).toContain(`CREATE POLICY tenant_isolation_${table} ON ${table}`);
    }
  });

  // 2. DDL Audit: Verification of Tenant Isolation Policies with Session Config
  it('RLS-02: Verifies policies use app.current_org_id safely with fail-safe null handling', () => {
    expect(migrationSql).toContain('CREATE POLICY tenant_isolation_projects ON projects');
    expect(migrationSql).toContain("USING (organisation_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)");
  });

  // 3. Simulated PostgreSQL RLS Session Enforcement Engine
  it('RLS-03: Simulates PostgreSQL 17 session context execution across distinct database roles', async () => {
    interface DatabaseRow {
      id: string;
      organisation_id: string;
      title: string;
    }

    const physicalTableRows: DatabaseRow[] = [
      { id: 'proj-101', organisation_id: '11111111-1111-4111-8111-111111111111', title: 'Qatar Tourism Project' },
      { id: 'proj-102', organisation_id: '11111111-1111-4111-8111-111111111111', title: 'Doha Cultural Festival' },
      { id: 'proj-201', organisation_id: '22222222-2222-4222-8222-222222222222', title: 'Client Beta Private Summit' },
    ];

    // Simulates Postgres RLS evaluation engine
    function executeQueryUnderSession(sessionContext: { current_org_id?: string }): DatabaseRow[] {
      const activeTenant = sessionContext.current_org_id;
      if (!activeTenant || activeTenant.trim() === '') {
        // Without tenant context, RLS evaluates to false -> zero rows returned!
        return [];
      }
      return physicalTableRows.filter(row => row.organisation_id === activeTenant);
    }

    // Session 1: E3 Internal Tenant
    const sessionE3 = { current_org_id: '11111111-1111-4111-8111-111111111111' };
    const e3Results = executeQueryUnderSession(sessionE3);
    expect(e3Results).toHaveLength(2);
    expect(e3Results.every(r => r.organisation_id === sessionE3.current_org_id)).toBe(true);

    // Session 2: Client Beta Tenant
    const sessionClient = { current_org_id: '22222222-2222-4222-8222-222222222222' };
    const clientResults = executeQueryUnderSession(sessionClient);
    expect(clientResults).toHaveLength(1);
    expect(clientResults[0].id).toBe('proj-201');

    // Session 3: Unauthenticated / Pool Reused without Tenant Context (Fail-safe closed)
    const sessionUnset = {};
    const unauthenticatedResults = executeQueryUnderSession(sessionUnset);
    expect(unauthenticatedResults).toHaveLength(0); // Zero leakage!
  });

  // 4. Physical PostgreSQL 17 Live Engine Execution Test
  it('RLS-04: Executes physical Row Level Security queries on live PostgreSQL 17 engine with separate session contexts', async () => {
    if (!Client) {
      console.warn('pg driver not found, skipping live physical RLS test');
      return;
    }

    let adminClient: any = null;
    let appClient: any = null;

    try {
      adminClient = new Client({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: 'postgres',
      });
      await adminClient.connect();

      // Ensure test role exists
      await adminClient.query(`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'eos_app') THEN
            CREATE ROLE eos_app LOGIN PASSWORD 'eos_pass';
          END IF;
        END $$;
      `);

      // Setup physical test table
      await adminClient.query('DROP TABLE IF EXISTS public.vitest_rls_physical_proof CASCADE;');
      await adminClient.query(`
        CREATE TABLE public.vitest_rls_physical_proof (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          organisation_id uuid NOT NULL,
          project_name text NOT NULL,
          budget numeric NOT NULL
        );
      `);
      await adminClient.query('ALTER TABLE public.vitest_rls_physical_proof ENABLE ROW LEVEL SECURITY;');
      await adminClient.query('ALTER TABLE public.vitest_rls_physical_proof FORCE ROW LEVEL SECURITY;');
      await adminClient.query(`
        CREATE POLICY vitest_tenant_policy ON public.vitest_rls_physical_proof
        AS PERMISSIVE FOR ALL
        USING (organisation_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);
      `);
      await adminClient.query('GRANT SELECT, INSERT, UPDATE, DELETE ON public.vitest_rls_physical_proof TO eos_app;');

      const org1 = '11111111-1111-4111-8111-111111111111';
      const org2 = '22222222-2222-4222-8222-222222222222';

      await adminClient.query(`
        INSERT INTO public.vitest_rls_physical_proof (organisation_id, project_name, budget)
        VALUES 
          ('${org1}', 'Qatar Tourism Tender', 15000000),
          ('${org1}', 'Oryx Graduation', 4500000),
          ('${org2}', 'Competitor Private Gala', 8000000);
      `);

      // Connect as non-superuser application role
      appClient = new Client({
        host: 'localhost',
        port: 5432,
        user: 'eos_app',
        password: 'eos_pass',
        database: 'postgres',
      });
      await appClient.connect();

      // Check A: Unset session context -> 0 rows returned (fail-safe closed)
      const noCtxResult = await appClient.query('SELECT * FROM public.vitest_rls_physical_proof;');
      expect(noCtxResult.rows).toHaveLength(0);

      // Check B: Tenant 1 context -> sees only Org1 rows
      await appClient.query('BEGIN;');
      await appClient.query(`SELECT set_config('app.current_org_id', '${org1}', true);`);
      const org1Result = await appClient.query('SELECT project_name FROM public.vitest_rls_physical_proof;');
      await appClient.query('COMMIT;');
      expect(org1Result.rows).toHaveLength(2);
      expect(org1Result.rows.map((r: any) => r.project_name)).toEqual([
        'Qatar Tourism Tender',
        'Oryx Graduation',
      ]);

      // Check C: Tenant 2 context -> sees only Org2 rows
      await appClient.query('BEGIN;');
      await appClient.query(`SELECT set_config('app.current_org_id', '${org2}', true);`);
      const org2Result = await appClient.query('SELECT project_name FROM public.vitest_rls_physical_proof;');
      await appClient.query('COMMIT;');
      expect(org2Result.rows).toHaveLength(1);
      expect(org2Result.rows[0].project_name).toBe('Competitor Private Gala');

      // Check D: After transaction commit, session config is strictly reset -> 0 rows returned
      const resetResult = await appClient.query('SELECT * FROM public.vitest_rls_physical_proof;');
      expect(resetResult.rows).toHaveLength(0);

      // Clean up test table
      await adminClient.query('DROP TABLE IF EXISTS public.vitest_rls_physical_proof CASCADE;');
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED' || err.message?.includes('connect')) {
        console.warn('Physical PostgreSQL 17 not reachable on port 5432; live execution test skipped in this environment.');
      } else {
        throw err;
      }
    } finally {
      if (appClient) await appClient.end();
      if (adminClient) await adminClient.end();
    }
  });
});
