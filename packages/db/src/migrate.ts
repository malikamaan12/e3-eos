import pg from 'pg';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function runMigrations() {
  console.log('=== Running PostgreSQL Migrations ===');
  const connectionString = process.env.DATABASE_URL;
  const isLocal = !connectionString || connectionString.includes('localhost') || connectionString.includes('127.0.0.1') || process.env.DB_SSL === 'false';
  const pool = connectionString
    ? new pg.Pool({ connectionString, ssl: isLocal ? false : { rejectUnauthorized: false } })
    : new pg.Pool({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'postgres',
      });

  let client;
  try {
    client = await pool.connect();
    const isClean = process.argv.includes('--clean') || process.env.DB_CLEAN === 'true';
    if (isClean) {
      console.log('[*] Resetting public schema...');
      await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;');
      console.log('[*] ✓ Public schema reset.');
    }

    const migrationsDir = resolve(__dirname, '../migrations');
    const migrationFiles = [
      '0000_flashy_mastermind.sql',
      '0001_dear_genesis.sql',
      '0001_enable_row_level_security.sql',
      '0002_operational_constraints_and_documents.sql',
      '0003_sprint_03_physical_delivery.sql',
      '0004_sprint_04_live_operations.sql',
      '0005_sprint_05_finance_commercial_reconciliation.sql',
      '0006_sprint_06_enterprise_intelligence.sql',
      '0007_project_metadata.sql',
      '0008_progressive_scope_management.sql',
      '0009_scope_allocations_and_fulfilment.sql',
      '0010_intelligent_document_parser.sql',
      '0011_design_and_creative_module.sql',
      '0012_rfp_document_intelligence_integration.sql',
      '0013_controlled_documents_vault_and_submission_packs.sql',
      '0014_enterprise_integration_operations_and_capacity_store.sql',
    ];

    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    for (let i = 0; i < migrationFiles.length; i++) {
      const file = migrationFiles[i];
      const filePath = resolve(migrationsDir, file);
      if (existsSync(filePath)) {
        const checkRes = await client.query('SELECT 1 FROM _migrations WHERE name = $1', [file]);
        if (checkRes.rows.length > 0) {
          console.log(`[${i + 1}/${migrationFiles.length}] ⏩ ${file} already applied, skipping.`);
          continue;
        }

        console.log(`[${i + 1}/${migrationFiles.length}] Applying Migration from: ${file}`);
        const sql = readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
        try {
          await client.query(sql);
          await client.query('INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT DO NOTHING', [file]);
          console.log(`[${i + 1}/${migrationFiles.length}] ✓ ${file} applied successfully.`);
        } catch (mErr: any) {
          if (mErr.code === '42P07' || mErr.message?.includes('already exists')) {
            console.log(`[${i + 1}/${migrationFiles.length}] ⏩ ${file} objects already exist, marking applied.`);
            await client.query('INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT DO NOTHING', [file]);
          } else {
            throw mErr;
          }
        }
      }
    }

    console.log('=== All PostgreSQL Migrations Completed Successfully ===');
  } catch (err: any) {
    console.error('Migration error:', err.message);
    if (process.argv[1]?.includes('migrate.ts') || process.argv[1]?.includes('migrate.js')) {
      process.exit(1);
    }
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

if (process.argv[1]?.includes('migrate.ts') || process.argv[1]?.includes('migrate.js')) {
  runMigrations().catch(console.error);
}
