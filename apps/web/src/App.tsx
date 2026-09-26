import { DocumentWorkflowPendingView } from './views/DocumentWorkflowPendingView.js';
import { ProjectPlanningView } from './views/ProjectPlanningView.js';
import { ScheduleView } from './views/ScheduleView.js';
import { DesignPublicationPendingView } from './views/DesignPublicationPendingView.js';
import { ProjectControlView } from './views/ProjectControlView.js';
import { ProjectRecordsView } from './views/ProjectRecordsView.js';
import { PortfolioSummaryView } from './views/PortfolioSummaryView.js';
import { ProjectAccessView } from './views/ProjectAccessView.js';
import React from 'react';
import { EosProvider, useEosContext } from './context/EosContext.js';
import { LayoutShell } from './components/LayoutShell.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { BrandLogo } from './components/BrandLogo.js';

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
import { DesignCreativeModuleView } from './views/DesignCreativeModuleView.js';

// Sprint 08 Controlled Documents, Company Vault & Submission Packs
import { ControlledDocumentsWorkspaceView } from './views/ControlledDocumentsWorkspaceView.js';
import { SettingsAiIntegrationsView } from './views/SettingsAiIntegrationsView.js';
import { PortfolioResourcePlannerView } from './views/PortfolioResourcePlannerView.js';

const AppRouter: React.FC = () => {
  const { currentPath, currentUser, isCheckingSession, currentLanguage } = useEosContext();
  const publicPath = currentPath.split('?')[0].split('#')[0];

  // Standalone Authentication Screens (No Shell)
  if (publicPath === '/login') {
    return <LoginView />;
  }
  if (publicPath === '/forgot-password') {
    return <ForgotPasswordView />;
  }
  if (publicPath === '/accept-invite') {
    return <AcceptInviteView />;
  }

  if (isCheckingSession) {
    return <main aria-busy="true" className="eos-invitation-page" style={{ display: 'grid', placeContent: 'center', gap: 24 }}><BrandLogo /><p role="status">{currentLanguage === 'ar' ? 'جارٍ التحقق من الجلسة...' : 'Verifying your session...'}</p></main>;
  }

  // Unauthenticated Visitors Fail Closed -> Redirect to Login
  if (!currentUser) {
    return <LoginView />;
  }

  // Audience Isolation: Client Portal Persona Guard (C02 Zero-Leak)
  const isClient = currentUser.role === 'client' || currentUser.email?.includes('client');
  if (isClient) {
    if (currentPath === '/client/results' || currentPath.startsWith('/portal/projects/')) {
      return <LayoutShell><ClientResultsRoomView /></LayoutShell>;
    }
    if (currentPath.includes('/designs') || currentPath.includes('/design')) {
      const match = currentPath.match(/\/projects\/([^/?#]+)/);
      const prjId = match ? match[1] : 'f1111111-1111-4111-8111-111111111111';
      return <LayoutShell><DesignPublicationPendingView /></LayoutShell>;
    }
    if (currentPath === '/account') {
      return <LayoutShell><AccountView /></LayoutShell>;
    }
    return <LayoutShell><ClientPortalView /></LayoutShell>;
  }

  // Audience Isolation: Supplier Portal Persona Guard
  const isSupplier = currentUser.role === 'supplier' || currentUser.email?.includes('supplier');
  if (isSupplier) {
    if (currentPath === '/account') {
      return <LayoutShell><AccountView /></LayoutShell>;
    }
    return <LayoutShell><SupplierPortalView /></LayoutShell>;
  }

  // Shell-Wrapped Views
  const renderContent = () => {
    const cleanPath = currentPath.split('?')[0].split('#')[0];

    if (cleanPath === '/portfolio') return <PortfolioSummaryView />;
    const planningMatch=cleanPath.match(/^\/projects\/([^/]+)\/(allocations|design-briefs|impact-review|designs?)(?:\/.*)?$/);
    if(planningMatch)return <ProjectPlanningView kind={planningMatch[2]==='allocations'?'allocations':planningMatch[2]==='impact-review'?'impacts':'designs'} projectId={planningMatch[1]}/>;
    if(cleanPath==='/schedule')return <ScheduleView/>;
    const scheduleMatch=cleanPath.match(/^\/projects\/([^/]+)\/(schedule|timeline)$/);
    if(scheduleMatch)return <ScheduleView projectId={scheduleMatch[1]}/>;
    if(cleanPath==='/allocations/register')return <ProjectPlanningView kind="allocations"/>;
    if(cleanPath==='/impact-review')return <ProjectPlanningView kind="impacts"/>;
    if(['/designs/register','/design-lab','/designs','/design'].includes(cleanPath))return <ProjectPlanningView kind="designs"/>;
    const controlMatch = cleanPath.match(/^\/projects\/([^/]+)\/(requirements|scope|clarifications|field-notes)$/);
    if (controlMatch) return <ProjectControlView kind={controlMatch[2] === 'field-notes' ? 'observations' : controlMatch[2] === 'clarifications' ? 'clarifications' : 'requirements'} projectId={controlMatch[1]} />;
    if (cleanPath === '/requirements/register') return <ProjectControlView kind="requirements" />;
    if (cleanPath === '/clarifications/register') return <ProjectControlView kind="clarifications" />;
    if (cleanPath === '/field' || cleanPath === '/field/notes') return <ProjectControlView kind="observations" />;
    const recordsMatch = cleanPath.match(/^\/projects\/([^/]+)\/(work|document-register|reports)$/);
    if (recordsMatch) return <ProjectRecordsView kind={recordsMatch[2] === 'work' ? 'work' : recordsMatch[2] === 'reports' ? 'reports' : 'documents'} projectId={recordsMatch[1]} />;
    if (cleanPath === '/work-register') return <ProjectRecordsView kind="work" />;
    if (['/documents/register', '/documents/controlled'].includes(cleanPath) || cleanPath.endsWith('/controlled-documents')) return <ProjectRecordsView kind="documents" projectId={cleanPath.match(/^\/projects\/([^/]+)/)?.[1]} />;
    if (cleanPath === '/reports' || cleanPath === '/reports/post-event') return <ProjectRecordsView kind="reports" />;
    if (cleanPath === '/account') {
      return <AccountView />;
    }
    if (cleanPath === '/my-work' || cleanPath === '/approvals') {
      return <MyWorkView />;
    }
    if (cleanPath === '/projects/new') {
      return <NewProjectWizardView />;
    }
    if (
      cleanPath === '/documents/controlled' ||
      cleanPath === '/vault' ||
      cleanPath === '/packs' ||
      cleanPath.includes('/controlled-documents') ||
      cleanPath.includes('/vault') ||
      cleanPath.includes('/packs')
    ) {
      const match = cleanPath.match(/\/projects\/([^/?#]+)/);
      const prjId = match ? match[1] : undefined;
      const initialTab = cleanPath.includes('vault') ? 'vault' : cleanPath.includes('pack') ? 'pack' : 'vault';
      return <DocumentWorkflowPendingView />;
    }
    if (cleanPath.startsWith('/projects/') && cleanPath !== '/projects') {
      return <ProjectCockpitView />;
    }
    if (cleanPath === '/projects') {
      return <ProjectListView />;
    }
    if (cleanPath === '/vendors') {
      return <VendorDirectoryView />;
    }
    if (cleanPath === '/warehouse' || cleanPath === '/inventory') {
      return <WarehouseOperationsView />;
    }
    if (cleanPath === '/admin/users' || cleanPath === '/admin') {
      return <AdminUsersView />;
    }
    if (cleanPath === '/admin/access') return <ProjectAccessView />;
    if (cleanPath === '/admin/roles') {
      return <AdminRolesView />;
    }
    if (cleanPath === '/field' || cleanPath.startsWith('/field')) {
      return <FieldOpsView />;
    }
    if (cleanPath === '/live/command-center' || cleanPath === '/command-center' || cleanPath === '/live') {
      return <LiveCommandCentreView />;
    }
    if (cleanPath === '/live/run-sheet' || cleanPath === '/run-sheet') {
      return <LiveRunSheetView />;
    }
    if (cleanPath === '/live/compliance' || cleanPath === '/compliance') {
      return <ComplianceRegisterView />;
    }
    if (cleanPath === '/live/roster' || cleanPath === '/roster') {
      return <LiveRosterAttendanceView />;
    }
    if (cleanPath === '/bump-out') {
      return <BumpOutCloseoutView />;
    }
    if (
      cleanPath === '/portfolio/resources' ||
      cleanPath === '/portfolio/capacity' ||
      cleanPath === '/portfolio/resource-planner' ||
      cleanPath === '/resource-plan' ||
      cleanPath === '/resources' ||
      cleanPath.endsWith('/resources') ||
      cleanPath.endsWith('/resource-plan')
    ) {
      return <PortfolioResourcePlannerView />;
    }
    if (currentPath === '/commercial/financial-control' || currentPath === '/commercial') {
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
    if (
      currentPath === '/settings/integrations' ||
      currentPath === '/settings/ai' ||
      currentPath === '/admin/settings' ||
      currentPath === '/settings'
    ) {
      return <SettingsAiIntegrationsView />;
    }
    // Default route: Home View
    return <HomeView />;
  };

  return (
    <LayoutShell>
      <ErrorBoundary>
        {renderContent()}
      </ErrorBoundary>
    </LayoutShell>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <EosProvider>
        <AppRouter />
      </EosProvider>
    </ErrorBoundary>
  );
};

export default App;
