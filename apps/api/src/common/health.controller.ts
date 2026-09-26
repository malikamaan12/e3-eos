import { Controller, Get } from '@nestjs/common';
import { ALL_STAGE_ACTIVITIES } from '@e3-eos/domain';

import { execSync } from 'child_process';

export type RuntimeEnvironment = 'local' | 'development' | 'test' | 'staging' | 'preview' | 'production' | 'unknown';

export function getEnvironment(): RuntimeEnvironment {
  const configured = process.env.ENVIRONMENT?.trim().toLowerCase();
  if (configured) {
    const recognized: RuntimeEnvironment[] = ['local', 'development', 'test', 'staging', 'preview', 'production'];
    return recognized.includes(configured as RuntimeEnvironment) ? configured as RuntimeEnvironment : 'unknown';
  }
  const nodeEnvironment = process.env.NODE_ENV?.trim().toLowerCase();
  return nodeEnvironment === 'development' || nodeEnvironment === 'test' || nodeEnvironment === 'production'
    ? nodeEnvironment
    : 'unknown';
}

export function resolveGitCommit(): string {
  for (const configured of [process.env.GIT_COMMIT, process.env.BUILD_SHA, process.env.VERCEL_GIT_COMMIT_SHA]) {
    if (configured?.trim()) return configured.trim();
  }
  try {
    const rev = execSync('git rev-parse HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (rev) return rev;
  } catch {}
  return 'unknown';
}

export const GIT_COMMIT = resolveGitCommit();


@Controller('health')
export class HealthController {
  private startTime = Date.now();

  @Get()
  getLiveness() {
    return {
      status: 'ok',
      service: 'e3-eos-api',
      environment: getEnvironment(),
      gitCommit: GIT_COMMIT,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('system')
  getSystemHealth() {
    const memory = process.memoryUsage();
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      status: 'ok',
      checkScope: 'process_liveness',
      version: '1.0.0',
      service: 'e3-eos-api',
      environment: getEnvironment(),
      gitCommit: GIT_COMMIT,
      buildSha: GIT_COMMIT,
      uptimeSeconds,
      timestamp: new Date().toISOString(),
      governance: {
        multiTenantIsolation: 'not_verified',
        idempotencyEnforcement: 'not_verified',
        documentQuarantineService: 'not_verified',
        cryptographicAuditing: 'not_verified',
      },
      catalog: {
        totalStageActivities: ALL_STAGE_ACTIVITIES.length,
        supportedWorkspaces: 7,
        activeModules: 18,
      },
      systemMetrics: {
        nodeVersion: process.version,
        rssMb: Math.round(memory.rss / (1024 * 1024)),
        heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
        heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024)),
      },
    };
  }
}
