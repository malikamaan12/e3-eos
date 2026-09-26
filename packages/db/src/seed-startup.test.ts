import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const workspace = fileURLToPath(new URL('../../../', import.meta.url));
const tsxLoader = pathToFileURL(require.resolve('tsx')).href;
const pgModule = pathToFileURL(require.resolve('pg')).href;
const reportPrefix = 'SEED_DATABASE_PROBE=';

interface DatabaseProbe {
  pools: number;
  connections: number;
  statements: string[];
  releases: number;
  ends: number;
}

// Each check uses a fresh production-mode process with the real module graph.
// Replace pg before loading EOS so a regression cannot touch a real database.
function runProbe(mode: 'success' | 'connect-failure' | 'write-failure' | 'end-failure', args: string[]) {
  const preload = `
    import pg from ${JSON.stringify(pgModule)};
    const probe = { pools: 0, connections: 0, statements: [], releases: 0, ends: 0 };
    pg.Pool = class {
      constructor() { probe.pools++; }
      async connect() {
        probe.connections++;
        if (${JSON.stringify(mode)} === 'connect-failure') throw new Error('TEST_CONNECTION_FAILED');
        return {
          async query(sql) {
            const statement = String(sql).trim().split(/\\s+/)[0];
            probe.statements.push(statement);
            if (${JSON.stringify(mode)} === 'write-failure' && statement === 'ALTER') throw new Error('TEST_SEED_WRITE_FAILED');
            return { rows: [], rowCount: 0 };
          },
          release() { probe.releases++; },
        };
      }
      async end() {
        probe.ends++;
        if (${JSON.stringify(mode)} === 'end-failure') throw new Error('TEST_POOL_CLOSE_FAILED');
      }
    };
    process.on('exit', () => console.log(${JSON.stringify(reportPrefix)} + JSON.stringify(probe)));
  `;
  const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('VITEST')));
  const result = spawnSync(process.execPath, [
    '--import', tsxLoader,
    '--import', `data:text/javascript,${encodeURIComponent(preload)}`,
    ...args,
  ], {
    cwd: workspace,
    env: {
      ...environment,
      NODE_ENV: 'production', NODE_OPTIONS: '',
      DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:1/unused',
    },
    encoding: 'utf8', timeout: 20000,
  });
  expect(result.error).toBeUndefined();
  const reportLine = result.stdout.split(/\r?\n/).find((line) => line.startsWith(reportPrefix));
  expect(reportLine, result.stderr).toBeDefined();
  return { ...result, probe: JSON.parse(reportLine!.slice(reportPrefix.length)) as DatabaseProbe };
}

describe('Seed import and explicit CLI boundaries', () => {
  it.each(['index.ts', 'seed.ts'])('importing %s in a fresh non-test process performs no database work', (filename) => {
    const moduleUrl = new URL(filename, import.meta.url).href;
    const result = runProbe('connect-failure', ['--input-type=module', '--eval', `await import(${JSON.stringify(moduleUrl)});`]);
    expect(result.status, result.stderr).toBe(0);
    expect(result.probe).toEqual({ pools: 0, connections: 0, statements: [], releases: 0, ends: 0 });
    expect(result.stdout).not.toContain('[E3-EOS DB Seed]');
    expect(result.stdout).not.toContain('Seeding persistent tables');
    expect(result.stderr).toBe('');
  });

  it('the explicit CLI performs one seed transaction and exits successfully with a mock database', () => {
    const result = runProbe('success', [fileURLToPath(new URL('seed-cli.ts', import.meta.url))]);
    expect(result.status, result.stderr).toBe(0);
    expect(result.probe).toMatchObject({ pools: 1, connections: 1, releases: 1, ends: 1 });
    expect(result.probe.statements[0]).toBe('BEGIN');
    expect(result.probe.statements.at(-1)).toBe('COMMIT');
    expect(result.probe.statements.filter((statement) => statement === 'INSERT').length).toBeGreaterThan(0);
    expect(result.probe.statements).not.toContain('ROLLBACK');
    expect(result.stdout).toContain('Successfully populated');
  }, 25000);

  it('the explicit CLI exits nonzero on connection failure without printing success', () => {
    const result = runProbe('connect-failure', [fileURLToPath(new URL('seed-cli.ts', import.meta.url))]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('TEST_CONNECTION_FAILED');
    expect(result.stdout).not.toContain('Successfully populated');
    expect(result.probe).toEqual({ pools: 1, connections: 1, statements: [], releases: 0, ends: 1 });
  });

  it('the explicit CLI rolls back failed writes, cleans up, and exits nonzero', () => {
    const result = runProbe('write-failure', [fileURLToPath(new URL('seed-cli.ts', import.meta.url))]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('TEST_SEED_WRITE_FAILED');
    expect(result.stdout).not.toContain('Successfully populated');
    expect(result.probe).toEqual({ pools: 1, connections: 1, statements: ['BEGIN', 'ALTER', 'ROLLBACK'], releases: 1, ends: 1 });
  });

  it('the explicit CLI does not swallow pool cleanup failures', () => {
    const result = runProbe('end-failure', [fileURLToPath(new URL('seed-cli.ts', import.meta.url))]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('TEST_POOL_CLOSE_FAILED');
    expect(result.stdout).not.toContain('Successfully populated');
    expect(result.probe).toMatchObject({ releases: 1, ends: 1 });
    expect(result.probe.statements.at(-1)).toBe('COMMIT');
  }, 25000);

  it('programmatic runSeed callers receive database failures instead of a success manifest', () => {
    const source = `
      const { runSeed } = await import(${JSON.stringify(new URL('seed.ts', import.meta.url).href)});
      try {
        await runSeed();
        throw new Error('SEED_UNEXPECTEDLY_SUCCEEDED');
      } catch (error) {
        if (error.message !== 'TEST_SEED_WRITE_FAILED') throw error;
        console.log('PROGRAMMATIC_FAILURE_RECEIVED');
      }
    `;
    const result = runProbe('write-failure', ['--input-type=module', '--eval', source]);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('PROGRAMMATIC_FAILURE_RECEIVED');
    expect(result.probe.statements).toEqual(['BEGIN', 'ALTER', 'ROLLBACK']);
  });
});
