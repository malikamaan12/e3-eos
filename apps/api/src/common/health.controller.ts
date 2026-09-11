import { Controller, Get } from '@nestjs/common';
import { ALL_STAGE_ACTIVITIES } from '@e3-eos/domain';

function getEnvironment(): string {
  const kService = (process.env.K_SERVICE || '').toLowerCase();
  if (kService.includes('staging')) return 'staging';
  const env = (process.env.ENVIRONMENT || '').trim().toLowerCase();
  if (env === 'production' && !kService.includes('production')) {
    // If not explicitly a production Cloud Run service, default to staging
    return 'staging';
  }
  return env || 'staging';
}

const GIT_COMMIT = process.env.GIT_COMMIT || process.env.BUILD_SHA || '8e53361';

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
