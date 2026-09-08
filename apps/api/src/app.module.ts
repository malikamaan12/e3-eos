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
import { OperationsController } from './operations/operations.controller.js';
import { FieldSyncController } from './field-sync/field-sync.controller.js';
import { FinanceController } from './finance/finance.controller.js';
import { ReportingController } from './reporting/reporting.controller.js';
import { IntegrationsController } from './integrations/integrations.controller.js';
import { PortfolioController } from './portfolio/portfolio.controller.js';
import { AiController } from './ai/ai.controller.js';
import { RolloutController } from './rollout/rollout.controller.js';
import { HealthController } from './common/health.controller.js';
import { OpenApiController } from './common/openapi.controller.js';
import { DocumentQuarantineService } from './common/upload.service.js';
import { IdempotencyGuard } from './common/idempotency.guard.js';
import { TenantIsolationGuard } from './common/tenant.guard.js';

@Module({
  imports: [],
  controllers: [
    OpenApiController,
    HealthController,
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
    OperationsController,
    FieldSyncController,
    FinanceController,
    ReportingController,
    IntegrationsController,
    PortfolioController,
    AiController,
    RolloutController,
  ],
  providers: [DocumentQuarantineService, IdempotencyGuard, TenantIsolationGuard],
})
export class AppModule {}
