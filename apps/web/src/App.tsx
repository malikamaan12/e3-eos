import React from 'react';
import { EosProvider, useEosContext } from './context/EosContext.js';
import { LayoutShell } from './components/LayoutShell.js';
import { LeadershipView } from './views/LeadershipView.js';
import { PersonalWorkView } from './views/PersonalWorkView.js';
import { ProjectWorkspaceView } from './views/ProjectWorkspaceView.js';
import { FieldOpsView } from './views/FieldOpsView.js';
import { ClientPortalView } from './views/ClientPortalView.js';
import { AdminStudioView } from './views/AdminStudioView.js';
import { SupplierPortalView } from './views/SupplierPortalView.js';

const WorkspaceRouter: React.FC = () => {
  const { activeWorkspace } = useEosContext();

  switch (activeWorkspace) {
    case 'leadership':
      return <LeadershipView />;
    case 'personal':
      return <PersonalWorkView />;
    case 'project':
      return <ProjectWorkspaceView />;
    case 'field':
      return <FieldOpsView />;
    case 'client':
      return <ClientPortalView />;
    case 'admin':
      return <AdminStudioView />;
    case 'supplier':
      return <SupplierPortalView />;
    default:
      return <LeadershipView />;
  }
};

export const App: React.FC = () => {
  return (
    <EosProvider>
      <LayoutShell>
        <WorkspaceRouter />
      </LayoutShell>
    </EosProvider>
  );
};

export default App;
