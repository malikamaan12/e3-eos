import React from 'react';
import { EosProvider, useEosContext } from './context/EosContext.js';
import { LayoutShell } from './components/LayoutShell.js';

// Dedicated Enterprise Views
import { LoginView } from './views/LoginView.js';
import { ForgotPasswordView } from './views/ForgotPasswordView.js';
import { AccountView } from './views/AccountView.js';
import { HomeView } from './views/HomeView.js';
import { MyWorkView } from './views/MyWorkView.js';
import { ProjectListView } from './views/ProjectListView.js';
import { NewProjectWizardView } from './views/NewProjectWizardView.js';
import { ProjectCockpitView } from './views/ProjectCockpitView.js';
import { AdminUsersView } from './views/AdminUsersView.js';
import { AdminRolesView } from './views/AdminRolesView.js';

// Portals
import { FieldOpsView } from './views/FieldOpsView.js';
import { ClientPortalView } from './views/ClientPortalView.js';
import { SupplierPortalView } from './views/SupplierPortalView.js';
import { LeadershipView } from './views/LeadershipView.js';
import { AdminStudioView } from './views/AdminStudioView.js';

const AppRouter: React.FC = () => {
  const { currentPath } = useEosContext();

  // Standalone Authentication Screens (No Shell)
  if (currentPath === '/login') {
    return <LoginView />;
  }
  if (currentPath === '/forgot-password') {
    return <ForgotPasswordView />;
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
    if (currentPath === '/admin/users' || currentPath === '/admin') {
      return <AdminUsersView />;
    }
    if (currentPath === '/admin/roles') {
      return <AdminRolesView />;
    }
    if (currentPath === '/field') {
      return <FieldOpsView />;
    }
    if (currentPath === '/client') {
      return <ClientPortalView />;
    }
    if (currentPath === '/supplier') {
      return <SupplierPortalView />;
    }
    if (currentPath === '/calendar' || currentPath === '/portfolio') {
      return <LeadershipView />;
    }
    if (currentPath === '/reports') {
      return <AdminStudioView />;
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
