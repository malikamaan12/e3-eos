import { Module } from '@nestjs/common';
import { IdentityController } from './identity/identity.controller.js';
import { ProjectsController } from './projects/projects.controller.js';
import { ScopeController } from './scope/scope.controller.js';
import { WorkController } from './work/work.controller.js';
import { CommercialController } from './commercial/commercial.controller.js';
import { DesignsController } from './designs/designs.controller.js';
import { PortalController } from './portal/portal.controller.js';
import { ProcurementController } from './procurement/procurement.controller.js';
import { InventoryController } from './inventory/inventory.controller.js';
import { ProductionController } from './production/production.controller.js';
import { DocumentQuarantineService } from './common/upload.service.js';
import { IdempotencyGuard } from './common/idempotency.guard.js';
import { TenantIsolationGuard } from './common/tenant.guard.js';

@Module({
  imports: [],
  controllers: [
    IdentityController,
    ProjectsController,
    ScopeController,
    WorkController,
    CommercialController,
    DesignsController,
    PortalController,
    ProcurementController,
    InventoryController,
    ProductionController,
  ],
  providers: [DocumentQuarantineService, IdempotencyGuard, TenantIsolationGuard],
})
export class AppModule {}
