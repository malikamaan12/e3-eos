import { Module } from '@nestjs/common';
import { IdentityController } from './identity/identity.controller.js';
import { ProjectsController } from './projects/projects.controller.js';
import { ScopeController } from './scope/scope.controller.js';
import { WorkController } from './work/work.controller.js';
import { DocumentQuarantineService } from './common/upload.service.js';
import { IdempotencyGuard } from './common/idempotency.guard.js';
import { TenantIsolationGuard } from './common/tenant.guard.js';

@Module({
  imports: [],
  controllers: [IdentityController, ProjectsController, ScopeController, WorkController],
  providers: [DocumentQuarantineService, IdempotencyGuard, TenantIsolationGuard],
})
export class AppModule {}
