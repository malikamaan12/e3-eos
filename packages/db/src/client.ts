import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';
const { Pool } = pg;
export type PgPool = pg.Pool;

import * as identitySchema from './schema/identity.js';
import * as projectsSchema from './schema/projects.js';
import * as workSchema from './schema/work.js';
import * as decisionsSchema from './schema/decisions.js';
import * as policySchema from './schema/policy.js';
import * as commercialSchema from './schema/commercial.js';
import * as financeSchema from './schema/finance.js';
import * as inventorySchema from './schema/inventory.js';
import * as operationsSchema from './schema/operations.js';
import * as procurementSchema from './schema/procurement.js';
import * as productionSchema from './schema/production.js';
import * as scopeSchema from './schema/scope.js';
import * as reportingSchema from './schema/reporting.js';
import * as portfolioSchema from './schema/portfolio.js';
import * as integrationsSchema from './schema/integrations.js';
import * as infrastructureSchema from './schema/infrastructure.js';
import * as constraintsSchema from './schema/constraints.js';
import * as documentsSchema from './schema/documents.js';

export const fullSchema = {
  ...identitySchema,
  ...projectsSchema,
  ...workSchema,
  ...decisionsSchema,
  ...policySchema,
  ...commercialSchema,
  ...financeSchema,
  ...inventorySchema,
  ...operationsSchema,
  ...procurementSchema,
  ...productionSchema,
  ...scopeSchema,
  ...reportingSchema,
  ...portfolioSchema,
  ...integrationsSchema,
  ...infrastructureSchema,
  ...constraintsSchema,
  ...documentsSchema,
};

export type EosDatabase = NodePgDatabase<typeof fullSchema>;

let poolInstance: pg.Pool | null = null;
let dbInstance: EosDatabase | null = null;

export function getDbPool(): pg.Pool {
  if (!poolInstance) {
    const connectionString = process.env.DATABASE_URL;
    if (connectionString) {
      const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1') || process.env.DB_SSL === 'false';
      poolInstance = new Pool({
        connectionString,
        max: Number(process.env.DB_POOL_MAX) || 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        ssl: isLocal ? false : { rejectUnauthorized: false },
      });
    } else {
      poolInstance = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'postgres',
        max: Number(process.env.DB_POOL_MAX) || 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        ssl: process.env.DB_SSL === 'false' ? false : (process.env.DB_SSL === 'true' || (process.env.DB_HOST && !['localhost', '127.0.0.1'].includes(process.env.DB_HOST))) ? { rejectUnauthorized: false } : false,
      });
    }

    poolInstance.on('error', (err) => {
      console.error('[PostgreSQL Pool Error]', err);
    });
  }
  return poolInstance;
}

export function getDb(): EosDatabase {
  if (!dbInstance) {
    const pool = getDbPool();
    dbInstance = drizzle(pool, { schema: fullSchema });
  }
  return dbInstance;
}

/**
 * Executes a callback inside a PostgreSQL transaction with local tenant context set via:
 * SET LOCAL app.current_org_id = $orgId
 * This guarantees transaction isolation and prevents connection pool leakage.
 */
export async function withTenantTransaction<T>(
  organisationId: string,
  fn: (tx: NodePgDatabase<typeof fullSchema>) => Promise<T>
): Promise<T> {
  const db = getDb();
  return await db.transaction(async (tx) => {
    if (organisationId) {
      await tx.execute(sql`SELECT set_config('app.current_org_id', ${organisationId}, true)`);
    }
    return await fn(tx as any);
  });
}
