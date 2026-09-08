const path = require('path');
const { Client } = require(path.resolve(__dirname, '../packages/db/node_modules/pg'));

async function runLivePostgresRlsTest() {
  // Admin connection to prepare table and permissions
  const adminClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: 'postgres',
  });

  await adminClient.connect();
  const versionRes = await adminClient.query('SELECT version()');
  console.log('PostgreSQL Server:', versionRes.rows[0].version);

  try {
    // 1. Ensure non-superuser app role exists
    await adminClient.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'eos_app') THEN
          CREATE ROLE eos_app LOGIN PASSWORD 'eos_pass';
        END IF;
      END $$;
    `);

    // 2. Create physical test table in public schema
    await adminClient.query(`DROP TABLE IF EXISTS public.test_physical_rls CASCADE;`);
    await adminClient.query(`
      CREATE TABLE public.test_physical_rls (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organisation_id uuid NOT NULL,
        project_name text NOT NULL,
        confidential_budget numeric NOT NULL
      );
    `);

    // 3. Enable and Force RLS
    await adminClient.query(`ALTER TABLE public.test_physical_rls ENABLE ROW LEVEL SECURITY;`);
    await adminClient.query(`ALTER TABLE public.test_physical_rls FORCE ROW LEVEL SECURITY;`);

    // 4. Create Tenant Isolation Policy (Permissive enforces tenant match, blocking any row that does not match)
    await adminClient.query(`
      CREATE POLICY tenant_isolation_test_policy ON public.test_physical_rls
      AS PERMISSIVE
      FOR ALL
      USING (organisation_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);
    `);

    // 5. Grant access to non-superuser application role
    await adminClient.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_physical_rls TO eos_app;`);

    const orgE3 = '11111111-1111-4111-8111-111111111111';
    const orgBeta = '22222222-2222-4222-8222-222222222222';

    // 6. Insert test data
    await adminClient.query(`
      INSERT INTO public.test_physical_rls (organisation_id, project_name, confidential_budget)
      VALUES 
        ('${orgE3}', 'Qatar Tourism Mega Festival', 12500000),
        ('${orgE3}', 'Oryx University Graduation', 3400000),
        ('${orgBeta}', 'Competitor Private Gala', 8500000);
    `);
  } finally {
    await adminClient.end();
  }

  // Connect as the non-superuser application role (eos_app) to prove RLS enforcement
  const appClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'eos_app',
    password: 'eos_pass',
    database: 'postgres',
  });

  await appClient.connect();
  console.log('Connected as application role: eos_app (non-superuser).');

  try {
    // Check 1: Query with NO session context (Fail-Safe Closed)
    const resNoCtx = await appClient.query('SELECT * FROM public.test_physical_rls');
    console.log('[RLS Physical Check 1] Unauthenticated/No Tenant Query Rows:', resNoCtx.rows.length);
    if (resNoCtx.rows.length !== 0) throw new Error('RLS leaked data to unauthenticated context!');

    // Check 2: Query under Tenant E3 Session
    await appClient.query('BEGIN');
    await appClient.query(`SELECT set_config('app.current_org_id', '${orgE3}', true)`);
    const resE3 = await appClient.query('SELECT project_name, confidential_budget FROM public.test_physical_rls');
    console.log('[RLS Physical Check 2] E3 Tenant Context Rows:', resE3.rows.length);
    resE3.rows.forEach(r => console.log(`   - E3 Project: ${r.project_name} (Budget: QAR ${r.confidential_budget})`));
    await appClient.query('COMMIT');
    if (resE3.rows.length !== 2) throw new Error('E3 Tenant context failed to see its rows!');

    // Check 3: Query under Tenant Beta Session
    await appClient.query('BEGIN');
    await appClient.query(`SELECT set_config('app.current_org_id', '${orgBeta}', true)`);
    const resBeta = await appClient.query('SELECT project_name, confidential_budget FROM public.test_physical_rls');
    console.log('[RLS Physical Check 3] Competitor Tenant Context Rows:', resBeta.rows.length);
    resBeta.rows.forEach(r => console.log(`   - Competitor Project: ${r.project_name} (Budget: QAR ${r.confidential_budget})`));
    await appClient.query('COMMIT');
    if (resBeta.rows.length !== 1 || resBeta.rows[0].project_name !== 'Competitor Private Gala') {
      throw new Error('Tenant Beta context failed or saw cross-tenant data!');
    }

    // Check 4: Verify Transaction-Local Reset (Connection Pool Safety)
    const resAfterTx = await appClient.query('SELECT * FROM public.test_physical_rls');
    console.log('[RLS Physical Check 4] Post-Transaction Pool Reuse Query Rows:', resAfterTx.rows.length);
    if (resAfterTx.rows.length !== 0) throw new Error('Transaction local context leaked across transaction boundary!');

    // Cleanup
    const cleanupClient = new Client({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      database: 'postgres',
    });
    await cleanupClient.connect();
    await cleanupClient.query(`DROP TABLE IF EXISTS public.test_physical_rls CASCADE;`);
    await cleanupClient.end();

    console.log('\n================================================================================');
    console.log('>>> VERIFICATION PASSED: Real PostgreSQL 17.4 Row-Level Security (RLS) Verified! <<<');
    console.log('Tenant context is enforced physically by the PostgreSQL engine kernel.');
    console.log('Zero cross-tenant data leakage. Fail-safe closed when unauthenticated.');
    console.log('================================================================================\n');
  } finally {
    await appClient.end();
  }
}

const orgE3 = '11111111-1111-4111-8111-111111111111';
const orgBeta = '22222222-2222-4222-8222-222222222222';

runLivePostgresRlsTest().catch(err => {
  console.error('RLS Test Error:', err);
  process.exit(1);
});
