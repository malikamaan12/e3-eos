import React from 'react';
import { EosProvider, useEosContext } from './context/EosContext.js';
import { LayoutShell } from './components/LayoutShell.js';
import { LeadershipView } from './views/LeadershipView.js';
import { PersonalWorkView } from './views/PersonalWorkView.js';
import { ProjectWorkspaceView } from './views/ProjectWorkspaceView.js';
import { FieldOpsView } from './views/FieldOpsView.js';
import { ClientPortalView } from './views/ClientPortalView.js';
import { AdminStudioView } from './views/AdminStudioView.js';
import { Badge, Button } from './components/DesignSystem.js';

const WorkspaceRouter: React.FC = () => {
  const { activeWorkspace, currentLanguage } = useEosContext();

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
      return (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '32px', border: '1px solid #e2e8f0', maxWidth: '640px', margin: '40px auto' }}>
          <Badge variant="purple">Supplier Contribution Token</Badge>
          <h2 style={{ margin: '12px 0 6px 0' }}>RFQ Response & Quotation Upload</h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
            Restricted upload portal for RFQ-2026-AV-01. No general project browsing permitted.
          </p>
          <div style={{ border: '2px dashed #cbd5e1', borderRadius: '8px', padding: '32px', textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📁</div>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>Drop Quotation & Certificate Files Here</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>PDF, XLSX up to 25MB • Scanned for viruses upon receipt</div>
          </div>
          <Button size="md" variant="primary" style={{ width: '100%' }}>
            {currentLanguage === 'ar' ? 'إرسال عرض الأسعار المشفر' : 'Submit Encrypted Quotation'}
          </Button>
        </div>
      );
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
