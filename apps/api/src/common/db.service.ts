import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { getDb, getDbPool, withTenantTransaction, runMigrations, runSeed, EosDatabase, PgPool } from '@e3-eos/db';

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private pool: PgPool;
  public db: EosDatabase;

  constructor() {
    this.pool = getDbPool();
    this.db = getDb();
  }

  async onModuleInit() {
    try {
      const client = await this.pool.connect();
      client.release();
      await runMigrations();
      await runSeed();
    } catch (err: any) {
      console.warn('[DbService] PostgreSQL initialization notice:', err.message);
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  getPool(): PgPool {
    return this.pool;
  }

  async withTenant<T>(
    organisationId: string,
    fn: (tx: any) => Promise<T>
  ): Promise<T> {
    return await withTenantTransaction(organisationId, fn);
  }
}
