import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

export class TenantIsolation {
  /**
   * Sets transaction-local tenant context using set_config(..., true).
   * Because is_local = true, PostgreSQL automatically resets this value at the end of the transaction,
   * guaranteeing that pooled connections cannot leak tenant context into subsequent requests (AT-007).
   */
  static async setTenantContext(
    db: NodePgDatabase<any> | { execute: (query: any) => Promise<any> },
    organisationId: string
  ): Promise<void> {
    if (!organisationId) {
      throw new Error('Tenant organisationId is required to set transaction-local context');
    }
    await db.execute(sql`SELECT set_config('app.current_org_id', ${organisationId}, true)`);
  }

  /**
   * Retrieves the current transaction-local tenant context.
   */
  static async getTenantContext(
    db: NodePgDatabase<any> | { execute: (query: any) => Promise<any> }
  ): Promise<string | null> {
    const result = await db.execute(sql`SELECT current_setting('app.current_org_id', true) as org_id`);
    const rows = (result as any).rows || [];
    return rows[0]?.org_id || null;
  }
}
