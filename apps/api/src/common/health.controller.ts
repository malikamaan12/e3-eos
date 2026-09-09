import { Controller, Get } from '@nestjs/common';
import { ALL_STAGE_ACTIVITIES } from '@e3-eos/domain';

@Controller('health')
export class HealthController {
  private startTime = Date.now();

  @Get()
  getLiveness() {
    return {
      status: 'ok',
      service: 'e3-eos-api',
      environment: process.env.ENVIRONMENT || 'staging',
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
      environment: process.env.ENVIRONMENT || 'staging',
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
