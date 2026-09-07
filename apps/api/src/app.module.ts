import { Module } from '@nestjs/common';
import { IdentityController } from './identity/identity.controller.js';
import { ProjectsController } from './projects/projects.controller.js';
import { DocumentQuarantineService } from './common/upload.service.js';
import { IdempotencyGuard } from './common/idempotency.guard.js';
import { TenantIsolationGuard } from './common/tenant.guard.js';

@Module({
  imports: [],
  controllers: [IdentityController, ProjectsController],
  providers: [DocumentQuarantineService, IdempotencyGuard, TenantIsolationGuard],
})
export class AppModule {}
