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
import { ExternalIntegrationsController } from './integrations/external-integrations.controller.js';
import { PortfolioController } from './portfolio/portfolio.controller.js';
import { AiController } from './ai/ai.controller.js';
import { RolloutController } from './rollout/rollout.controller.js';
import { GovernanceController } from './governance/governance.controller.js';
import { AuthController } from './auth/auth.controller.js';
import { AdminController } from './admin/admin.controller.js';
import { DocumentsController } from './documents/documents.controller.js';
import { CompanyVaultController } from './documents/company-vault.controller.js';
import { SubmissionPacksController } from './documents/submission-packs.controller.js';
import { ConstraintsController } from './operations/constraints.controller.js';
import { HealthController } from './common/health.controller.js';
import { LiveOpsController } from './live-ops/live-ops.controller.js';
import {
  CommercialFinanceController,
  ClientResultsRoomController,
  PostEventReportingController,
  EnterpriseIntegrationsController,
} from './commercial/commercial-finance.controller.js';
import { OpenApiController } from './common/openapi.controller.js';
import { AiCopilotController } from './ai/ai-copilot.controller.js';
import { HistoricalEstimatingController } from './portfolio/historical-estimating.controller.js';
import { WorkflowBuilderController } from './governance/workflow-builder.controller.js';
import { PolicySimulatorController } from './governance/policy-simulator.controller.js';
import { CountryPacksController } from './compliance/country-packs.controller.js';
import { PortfolioIntelligenceController } from './portfolio/portfolio-intelligence.controller.js';
import { SettingsController } from './settings/settings.controller.js';
import { DocumentQuarantineService } from './common/upload.service.js';
import { IdempotencyGuard } from './common/idempotency.guard.js';
import { TenantIsolationGuard } from './common/tenant.guard.js';
import { DbService } from './common/db.service.js';

@Module({
  imports: [],
  controllers: [
    OpenApiController,
    HealthController,
    AuthController,
    AdminController,
    IdentityController,
    ProjectsController,
    GovernanceController,
    ScopeController,
    DocumentsController,
    CompanyVaultController,
    SubmissionPacksController,
    ConstraintsController,
    WorkController,
    CommercialController,
    CommercialFinanceController,
    ClientResultsRoomController,
    PostEventReportingController,
    EnterpriseIntegrationsController,
    DesignsController,
    PortalController,
    ProcurementController,
    InventoryController,
    ProductionController,
    OperationsController,
    LiveOpsController,
    FieldSyncController,
    FinanceController,
    ReportingController,
    IntegrationsController,
    ExternalIntegrationsController,
    PortfolioController,
    AiController,
    RolloutController,
    AiCopilotController,
    HistoricalEstimatingController,
    WorkflowBuilderController,
    PolicySimulatorController,
    CountryPacksController,
    PortfolioIntelligenceController,
    SettingsController,
  ],
  providers: [DbService, DocumentQuarantineService, IdempotencyGuard, TenantIsolationGuard],
  exports: [DbService],
})
export class AppModule {}
