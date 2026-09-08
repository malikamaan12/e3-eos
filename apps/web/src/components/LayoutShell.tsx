import React from 'react';
import { useEosContext } from '../context/EosContext.js';
import { WorkspaceType } from '../routes.js';
import {
  SYNTHETIC_ORGANISATIONS,
  SYNTHETIC_USERS,
  SyntheticOrganisation,
  SyntheticUser,
} from '@e3-eos/test-fixtures';

export interface LayoutShellProps {
  children: React.ReactNode;
}

export const LayoutShell: React.FC<LayoutShellProps> = ({ children }) => {
  const {
    currentUser,
    currentOrg,
    currentLanguage,
    direction,
    isOffline,
    activeWorkspace,
    pendingMutations,
    toggleLanguage,
    toggleOffline,
    setActiveWorkspace,
    setCurrentOrg,
    setCurrentUser,
  } = useEosContext();

  const organisations = Object.values(SYNTHETIC_ORGANISATIONS) as SyntheticOrganisation[];
  const users = Object.values(SYNTHETIC_USERS) as SyntheticUser[];

  const workspaces: Array<{ id: WorkspaceType; labelEn: string; labelAr: string; icon: string }> = [
    { id: 'leadership', labelEn: 'Leadership Portfolio', labelAr: 'محفظة القيادة التنفيذية', icon: '📊' },
    { id: 'personal', labelEn: 'Personal Work & Approvals', labelAr: 'مهامي والموافقات', icon: '📋' },
    { id: 'project', labelEn: '13-Stage Project Cockpit', labelAr: 'مقصورة المشروع (13 مرحلة)', icon: '🎪' },
    { id: 'field', labelEn: 'Field Ops Mobile PWA', labelAr: 'عمليات الموقع الميدانية', icon: '📱' },
    { id: 'client', labelEn: 'Client Collaboration Portal', labelAr: 'بوابة تعاون العميل', icon: '🤝' },
    { id: 'admin', labelEn: 'Admin Configuration Studio', labelAr: 'استوديو الإعدادات والسياسات', icon: '⚙️' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        fontFamily: currentLanguage === 'ar' ? 'Tahoma, Arial, sans-serif' : 'Inter, -apple-system, sans-serif',
        color: '#0f172a',
      }}
    >
      {/* Top Application Header */}
      <header
        style={{
          height: '60px',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          borderBottom: '1px solid #1e293b',
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '14px',
                padding: '4px 8px',
                borderRadius: '4px',
                letterSpacing: '1px',
              }}
            >
              E3
            </span>
            <span style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '0.5px' }}>EOS</span>
          </div>
          <span style={{ color: '#64748b', fontSize: '13px' }}>|</span>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
            {currentLanguage === 'ar' ? 'نظام تشغيل الفعاليات المؤسسي' : 'Enterprise Event Operating System'}
          </span>
        </div>

        {/* Header Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Organisation Switcher */}
          <select
            value={currentOrg.id}
            onChange={(e) => {
              const found = organisations.find((o) => o.id === e.target.value);
              if (found) setCurrentOrg(found);
            }}
            style={{
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {organisations.map((org) => (
              <option key={org.id} value={org.id}>
                🏢 {org.name}
              </option>
            ))}
          </select>

          {/* User Role Switcher */}
          <select
            value={currentUser.id}
            onChange={(e) => {
              const found = users.find((u) => u.id === e.target.value);
              if (found) setCurrentUser(found);
            }}
            style={{
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                👤 {user.name} ({user.isSuperAdmin ? 'SuperAdmin' : 'Lead'})
              </option>
            ))}
          </select>

          {/* Offline Mode Toggle Button */}
          <button
            onClick={toggleOffline}
            title={isOffline ? 'Offline Mode Active' : 'Online Mode'}
            style={{
              backgroundColor: isOffline ? '#ea580c' : '#1e293b',
              color: '#ffffff',
              border: `1px solid ${isOffline ? '#f97316' : '#334155'}`,
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{isOffline ? '📡' : '🟢'}</span>
            <span>{isOffline ? (currentLanguage === 'ar' ? 'غير متصل' : 'Offline') : (currentLanguage === 'ar' ? 'متصل' : 'Online')}</span>
            {isOffline && pendingMutations.length > 0 && (
              <span
                style={{
                  backgroundColor: '#ffffff',
                  color: '#ea580c',
                  padding: '1px 5px',
                  borderRadius: '10px',
                  fontSize: '10px',
                  fontWeight: 800,
                }}
              >
                {pendingMutations.length}
              </span>
            )}
          </button>

          {/* OpenAPI Docs Link */}
          <a
            href="/api/v1/docs"
            target="_blank"
            rel="noopener noreferrer"
            title="Open Interactive OpenAPI Documentation"
            style={{
              backgroundColor: '#1e293b',
              color: '#38bdf8',
              border: '1px solid #0284c7',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>⚡</span>
            <span>API Docs</span>
          </a>

          {/* Language / RTL Toggle */}
          <button
            onClick={toggleLanguage}
            style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {currentLanguage === 'en' ? 'العربية (RTL)' : 'English (LTR)'}
          </button>
        </div>
      </header>

      {/* Main Body with Sidebar + Content */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar */}
        <aside
          style={{
            width: '240px',
            backgroundColor: '#ffffff',
            borderRight: direction === 'ltr' ? '1px solid #e2e8f0' : 'none',
            borderLeft: direction === 'rtl' ? '1px solid #e2e8f0' : 'none',
            padding: '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              padding: '4px 8px 8px 8px',
            }}
          >
            {currentLanguage === 'ar' ? 'مساحات العمل' : 'Workspaces'}
          </div>

          {workspaces.map((ws) => {
            const isActive = ws.id === activeWorkspace;
            return (
              <button
                key={ws.id}
                onClick={() => setActiveWorkspace(ws.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isActive ? '#eff6ff' : 'transparent',
                  color: isActive ? '#1d4ed8' : '#334155',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '13px',
                  textAlign: direction === 'rtl' ? 'right' : 'left',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: '16px' }}>{ws.icon}</span>
                <span style={{ flex: 1 }}>{currentLanguage === 'ar' ? ws.labelAr : ws.labelEn}</span>
                {isActive && (
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#2563eb',
                    }}
                  />
                )}
              </button>
            );
          })}
        </aside>

        {/* Content Viewport */}
        <main
          style={{
            flex: 1,
            padding: '24px 32px',
            overflowY: 'auto',
            maxWidth: '1440px',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
