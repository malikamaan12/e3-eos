import pg from 'pg';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations() {
  console.log('=== Running PostgreSQL Migrations ===');
  const pool = new pg.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'postgres',
  });

  const client = await pool.connect();
  try {
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
    ];

    for (let i = 0; i < migrationFiles.length; i++) {
      const file = migrationFiles[i];
      const filePath = resolve(migrationsDir, file);
      if (existsSync(filePath)) {
        console.log(`[${i + 1}/${migrationFiles.length}] Applying Migration from: ${file}`);
        const sql = readFileSync(filePath, 'utf8');
        await client.query(sql);
        console.log(`[${i + 1}/${migrationFiles.length}] ✓ ${file} applied successfully.`);
      }
    }

    console.log('=== All PostgreSQL Migrations Completed Successfully ===');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
