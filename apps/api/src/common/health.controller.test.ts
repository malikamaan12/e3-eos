import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('child_process', () => ({ execSync: vi.fn() }));
import { execSync } from 'child_process';
import { getEnvironment, HealthController, resolveGitCommit } from './health.controller.js';

beforeEach(() => {
  vi.mocked(execSync).mockReset();
  for (const key of ['ENVIRONMENT', 'NODE_ENV', 'K_SERVICE', 'GIT_COMMIT', 'BUILD_SHA', 'VERCEL_GIT_COMMIT_SHA']) {
    vi.stubEnv(key, undefined);
  }
});

afterEach(() => vi.unstubAllEnvs());

describe('Runtime environment metadata', () => {
  it.each(['local', 'development', 'test', 'staging', 'preview', 'production'])('uses explicit %s configuration before Node or hosting hints', (environment) => {
    vi.stubEnv('ENVIRONMENT', ` ${environment.toUpperCase()} `);
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('K_SERVICE', 'eos-staging');
    expect(getEnvironment()).toBe(environment);
  });

  it('reports an invalid explicit environment as unknown instead of hiding a configuration typo', () => {
    vi.stubEnv('ENVIRONMENT', 'stagging');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('K_SERVICE', 'eos-staging');
    expect(getEnvironment()).toBe('unknown');
  });

  it.each(['development', 'test', 'production'])('uses NODE_ENV=%s when deployment environment is absent', (environment) => {
    vi.stubEnv('NODE_ENV', environment);
    vi.stubEnv('K_SERVICE', 'eos-staging');
    expect(getEnvironment()).toBe(environment);
  });

  it('does not infer deployment environment from the cloud service name', () => {
    vi.stubEnv('K_SERVICE', 'eos-production');
    expect(getEnvironment()).toBe('unknown');
    vi.stubEnv('K_SERVICE', 'eos-staging');
    expect(getEnvironment()).toBe('unknown');
  });

  it('does not accept staging or other unrecognized values in NODE_ENV', () => {
    vi.stubEnv('NODE_ENV', 'staging');
    expect(getEnvironment()).toBe('unknown');
  });

  it('treats blank deployment configuration as absent', () => {
    vi.stubEnv('ENVIRONMENT', '   ');
    vi.stubEnv('NODE_ENV', 'development');
    expect(getEnvironment()).toBe('development');
  });
});

describe('Build identity provenance', () => {
  it('prioritizes explicit build metadata and does not run git when it is supplied', () => {
    vi.stubEnv('GIT_COMMIT', ' first-sha ');
    vi.stubEnv('BUILD_SHA', 'second-sha');
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', 'third-sha');
    expect(resolveGitCommit()).toBe('first-sha');
    vi.stubEnv('GIT_COMMIT', undefined);
    expect(resolveGitCommit()).toBe('second-sha');
    vi.stubEnv('BUILD_SHA', undefined);
    expect(resolveGitCommit()).toBe('third-sha');
    expect(execSync).not.toHaveBeenCalled();
  });

  it('uses the actual repository revision when explicit build metadata is absent or blank', () => {
    vi.stubEnv('GIT_COMMIT', '  ');
    vi.mocked(execSync).mockReturnValue('abcdef0123456789\n');
    expect(resolveGitCommit()).toBe('abcdef0123456789');
    expect(execSync).toHaveBeenCalledWith('git rev-parse HEAD', expect.objectContaining({ encoding: 'utf8' }));
  });

  it('reports unknown when git is unavailable instead of returning a historic fallback SHA', () => {
    vi.mocked(execSync).mockImplementation(() => { throw new Error('git is unavailable'); });
    expect(resolveGitCommit()).toBe('unknown');
  });

  it('reports unknown when git returns no revision', () => {
    vi.mocked(execSync).mockReturnValue(' \n');
    expect(resolveGitCommit()).toBe('unknown');
  });
});

describe('Process health does not certify governance controls', () => {
  it('reports process liveness, actual process metrics, and unverified governance checks', () => {
    vi.stubEnv('ENVIRONMENT', 'local');
    const controller = new HealthController();
    expect(controller.getLiveness()).toMatchObject({ status: 'ok', environment: 'local', service: 'e3-eos-api' });
    const system = controller.getSystemHealth();
    expect(system).toMatchObject({ status: 'ok', checkScope: 'process_liveness', environment: 'local' });
    expect(system.governance).toEqual({
      multiTenantIsolation: 'not_verified', idempotencyEnforcement: 'not_verified',
      documentQuarantineService: 'not_verified', cryptographicAuditing: 'not_verified',
    });
    expect(system.systemMetrics.nodeVersion).toBe(process.version);
    expect(system.systemMetrics.rssMb).toBeGreaterThan(0);
    expect(system.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(Date.parse(system.timestamp))).toBe(false);
  });
});
