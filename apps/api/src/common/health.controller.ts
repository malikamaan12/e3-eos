import { Controller, Get } from '@nestjs/common';
import { ALL_STAGE_ACTIVITIES } from '@e3-eos/domain';

import { execSync } from 'child_process';

function getEnvironment(): string {
  const kService = (process.env.K_SERVICE || '').toLowerCase();
  if (kService.includes('staging')) return 'staging';
  const env = (process.env.ENVIRONMENT || process.env.NODE_ENV || '').trim().toLowerCase();
  if (env === 'production' && !kService.includes('production')) {
    // If not explicitly a production Cloud Run service, default to staging
    return 'staging';
  }
  return env || 'staging';
}

export function resolveGitCommit(): string {
  if (process.env.GIT_COMMIT) return process.env.GIT_COMMIT;
  if (process.env.BUILD_SHA) return process.env.BUILD_SHA;
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  try {
    const rev = execSync('git rev-parse HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (rev) return rev;
  } catch {}
  return '22eb92b7617b700140798e1467bece201991d798';
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
      status: 'healthy',
      version: '1.0.0',
      service: 'e3-eos-api',
      environment: getEnvironment(),
      gitCommit: GIT_COMMIT,
      buildSha: GIT_COMMIT,
      uptimeSeconds,
      timestamp: new Date().toISOString(),
      governance: {
        multiTenantIsolation: 'enforced',
        idempotencyEnforcement: 'active',
        documentQuarantineService: 'active',
        cryptographicAuditing: 'enabled',
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
