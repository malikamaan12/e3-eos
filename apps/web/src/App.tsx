import React from 'react';
import { EosProvider, useEosContext } from './context/EosContext.js';
import { LayoutShell } from './components/LayoutShell.js';

// Dedicated Enterprise Views
import { LoginView } from './views/LoginView.js';
import { ForgotPasswordView } from './views/ForgotPasswordView.js';
import { AcceptInviteView } from './views/AcceptInviteView.js';
import { AccountView } from './views/AccountView.js';
import { HomeView } from './views/HomeView.js';
import { MyWorkView } from './views/MyWorkView.js';
import { ProjectListView } from './views/ProjectListView.js';
import { NewProjectWizardView } from './views/NewProjectWizardView.js';
import { ProjectCockpitView } from './views/ProjectCockpitView.js';
import { AdminUsersView } from './views/AdminUsersView.js';
import { AdminRolesView } from './views/AdminRolesView.js';

// Portals & Workspaces
import { FieldOpsView } from './views/FieldOpsView.js';
import { ClientPortalView } from './views/ClientPortalView.js';
import { SupplierPortalView } from './views/SupplierPortalView.js';
import { LeadershipView } from './views/LeadershipView.js';
import { MasterCalendarView } from './views/MasterCalendarView.js';
import { AdminStudioView } from './views/AdminStudioView.js';
import { VendorDirectoryView } from './views/VendorDirectoryView.js';
import { WarehouseOperationsView } from './views/WarehouseOperationsView.js';
import { LiveCommandCentreView } from './views/LiveCommandCentreView.js';
import { LiveRunSheetView } from './views/LiveRunSheetView.js';
import { ComplianceRegisterView } from './views/ComplianceRegisterView.js';
import { LiveRosterAttendanceView } from './views/LiveRosterAttendanceView.js';
import { BumpOutCloseoutView } from './views/BumpOutCloseoutView.js';

// Sprint 05 Commercial, Financial & Reporting Views
import { FinancialControlCenterView } from './views/FinancialControlCenterView.js';
import { SupplierInvoicesView } from './views/SupplierInvoicesView.js';
import { ClientBillingView } from './views/ClientBillingView.js';
import { CommercialCloseoutView } from './views/CommercialCloseoutView.js';
import { ClientResultsRoomView } from './views/ClientResultsRoomView.js';
import { PostEventReportBuilderView } from './views/PostEventReportBuilderView.js';
import { PerformanceKnowledgeView } from './views/PerformanceKnowledgeView.js';
import { IntegrationsControlCenterView } from './views/IntegrationsControlCenterView.js';

// Sprint 06 Intelligence, Estimating, Workflows & Country Views
import { AiCopilotView } from './views/AiCopilotView.js';
import { HistoricalEstimatorView } from './views/HistoricalEstimatorView.js';
import { WorkflowBuilderView } from './views/WorkflowBuilderView.js';
import { PolicySimulatorView } from './views/PolicySimulatorView.js';
import { CountryPacksView } from './views/CountryPacksView.js';
import { EnterprisePortfolioIntelligenceView } from './views/EnterprisePortfolioIntelligenceView.js';

// Sprint 07 Production Rollout & Go-Live Console
import { ProductionRolloutView } from './views/ProductionRolloutView.js';

const AppRouter: React.FC = () => {
  const { currentPath } = useEosContext();

  // Standalone Authentication Screens (No Shell)
  if (currentPath === '/login') {
    return <LoginView />;
  }
  if (currentPath === '/forgot-password') {
    return <ForgotPasswordView />;
  }
  if (currentPath === '/accept-invite') {
    return <AcceptInviteView />;
  }

  // Shell-Wrapped Views
  const renderContent = () => {
    if (currentPath === '/account') {
      return <AccountView />;
    }
    if (currentPath === '/my-work' || currentPath === '/approvals') {
      return <MyWorkView />;
    }
    if (currentPath === '/projects/new') {
      return <NewProjectWizardView />;
    }
    if (currentPath.startsWith('/projects/') && currentPath !== '/projects') {
      return <ProjectCockpitView />;
    }
    if (currentPath === '/projects') {
      return <ProjectListView />;
    }
    if (currentPath === '/vendors') {
      return <VendorDirectoryView />;
    }
    if (currentPath === '/warehouse' || currentPath === '/inventory') {
      return <WarehouseOperationsView />;
    }
    if (currentPath === '/admin/users' || currentPath === '/admin') {
      return <AdminUsersView />;
    }
    if (currentPath === '/admin/roles') {
      return <AdminRolesView />;
    }
    if (currentPath === '/field') {
      return <FieldOpsView />;
    }
    if (currentPath === '/live/command-center' || currentPath === '/command-center' || currentPath === '/live') {
      return <LiveCommandCentreView />;
    }
    if (currentPath === '/live/run-sheet' || currentPath === '/run-sheet') {
      return <LiveRunSheetView />;
    }
    if (currentPath === '/live/compliance' || currentPath === '/compliance') {
      return <ComplianceRegisterView />;
    }
    if (currentPath === '/live/roster' || currentPath === '/roster') {
      return <LiveRosterAttendanceView />;
    }
    if (currentPath === '/bump-out') {
      return <BumpOutCloseoutView />;
    }
    if (currentPath === '/commercial/financial-control' || currentPath === '/commercial' || currentPath === '/portfolio') {
      return <FinancialControlCenterView />;
    }
    if (currentPath === '/commercial/supplier-invoices') {
      return <SupplierInvoicesView />;
    }
    if (currentPath === '/commercial/client-billing') {
      return <ClientBillingView />;
    }
    if (currentPath === '/commercial/closeout') {
      return <CommercialCloseoutView />;
    }
    if (currentPath === '/client/results') {
      return <ClientResultsRoomView />;
    }
    if (currentPath === '/reports/post-event') {
      return <PostEventReportBuilderView />;
    }
    if (currentPath === '/closeout/performance' || currentPath === '/closeout') {
      return <PerformanceKnowledgeView />;
    }
    if (currentPath === '/admin/integrations' || currentPath === '/integrations') {
      return <IntegrationsControlCenterView />;
    }
    if (currentPath === '/client') {
      return <ClientPortalView />;
    }
    if (currentPath === '/supplier') {
      return <SupplierPortalView />;
    }
    if (currentPath === '/calendar') {
      return <MasterCalendarView />;
    }
    if (currentPath === '/leadership' || currentPath === '/executive') {
      return <LeadershipView />;
    }
    if (currentPath === '/reports') {
      return <AdminStudioView />;
    }
    if (currentPath === '/ai/copilot' || currentPath === '/copilot') {
      return <AiCopilotView />;
    }
    if (currentPath === '/estimating/historical' || currentPath === '/estimating') {
      return <HistoricalEstimatorView />;
    }
    if (currentPath === '/governance/workflows' || currentPath === '/workflows') {
      return <WorkflowBuilderView />;
    }
    if (currentPath === '/governance/simulator' || currentPath === '/simulator') {
      return <PolicySimulatorView />;
    }
    if (currentPath === '/compliance/country-packs' || currentPath === '/country-packs') {
      return <CountryPacksView />;
    }
    if (currentPath === '/portfolio/intelligence') {
      return <EnterprisePortfolioIntelligenceView />;
    }
    if (
      currentPath === '/admin/rollout' ||
      currentPath === '/rollout' ||
      currentPath === '/admin/release/feature-flags' ||
      currentPath === '/admin/release/go-live' ||
      currentPath === '/admin/release/certificate' ||
      currentPath === '/admin/operations/support' ||
      currentPath.startsWith('/admin/rollout') ||
      currentPath.startsWith('/admin/release')
    ) {
      return <ProductionRolloutView />;
    }
    // Default route: Home View
    return <HomeView />;
  };

  return <LayoutShell>{renderContent()}</LayoutShell>;
};

export const App: React.FC = () => {
  return (
    <EosProvider>
      <AppRouter />
    </EosProvider>
  );
};

export default App;
