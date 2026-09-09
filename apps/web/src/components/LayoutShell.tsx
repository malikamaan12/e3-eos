import React, { useState } from 'react';
import { useEosContext, CANONICAL_E3_USERS } from '../context/EosContext.js';
import { WorkspaceType } from '../routes.js';
import {
  SYNTHETIC_ORGANISATIONS,
  SyntheticOrganisation,
} from '@e3-eos/test-fixtures';
import { NewProjectWizardModal } from './NewProjectWizardModal.js';
import { CreateTaskModal } from './CreateTaskModal.js';
import { RequestApprovalModal } from './RequestApprovalModal.js';
import { AuditHistoryDrawer } from './AuditHistoryDrawer.js';

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
    currentPath,
    navigate,
    switchPersona,
    logout,
    pendingMutations,
    selectedProjectId,
    isNewProjectModalOpen,
    isTaskModalOpen,
    isApprovalModalOpen,
    isAuditDrawerOpen,
    toggleLanguage,
    toggleOffline,
    setActiveWorkspace,
    setCurrentOrg,
    setCurrentUser,
    setSelectedProjectId,
    setIsNewProjectModalOpen,
    setIsTaskModalOpen,
    setIsApprovalModalOpen,
    setIsAuditDrawerOpen,
  } = useEosContext();

  const [createMenuOpen, setCreateMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const organisations = Object.values(SYNTHETIC_ORGANISATIONS) as SyntheticOrganisation[];

  const mainNavItems = [
    { path: '/', labelEn: 'Home Dashboard', labelAr: 'الرئيسية', icon: '🏠', id: 'nav-home' },
    { path: '/my-work', labelEn: 'My Work', labelAr: 'مهامي الشخصية', icon: '📋', id: 'nav-my-work' },
    { path: '/projects', labelEn: 'Projects Directory', labelAr: 'دليل المشاريع', icon: '🎪', id: 'nav-projects' },
    { path: '/approvals', labelEn: 'Governance Approvals', labelAr: 'الموافقات والحوكمة', icon: '✍️', id: 'nav-approvals' },
    { path: '/calendar', labelEn: 'Master Calendar', labelAr: 'التقويم العام', icon: '📅', id: 'nav-calendar' },
    { path: '/portfolio', labelEn: 'Portfolio Financials', labelAr: 'المحفظة المالية', icon: '📊', id: 'nav-portfolio' },
    { path: '/reports', labelEn: 'Reports & Audits', labelAr: 'التقارير وسجلات التدقيق', icon: '📈', id: 'nav-reports' },
    { path: '/admin/users', labelEn: 'Administration & RBAC', labelAr: 'الإدارة والصلاحيات', icon: '⚙️', id: 'nav-admin' },
  ];

  const portalItems = [
    { path: '/field', labelEn: 'Field Ops Mobile PWA', labelAr: 'عمليات الموقع الميدانية', icon: '📱', id: 'nav-field' },
    { path: '/client', labelEn: 'Client Collaboration Portal', labelAr: 'بوابة تعاون العميل', icon: '🤝', id: 'nav-client' },
    { path: '/supplier', labelEn: 'Supplier Portal (RFQ)', labelAr: 'بوابة الموردين والشركاء', icon: '🏢', id: 'nav-supplier' },
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

        {/* Global Search Bar */}
        <div style={{ flex: 1, maxWidth: '380px', margin: '0 20px' }}>
          <input
            type="text"
            placeholder={currentLanguage === 'ar' ? 'بحث في المشاريع والمهام وأوامر الشراء...' : 'Search projects, tasks, approvals, POs...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              outline: 'none',
            }}
          />
        </div>

        {/* Header Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
          {/* + Create Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setCreateMenuOpen(!createMenuOpen)}
              style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>+ Create</span>
              <span style={{ fontSize: '10px' }}>▼</span>
            </button>

            {createMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: direction === 'ltr' ? 0 : 'auto',
                  left: direction === 'rtl' ? 0 : 'auto',
                  marginTop: '6px',
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
                  border: '1px solid #cbd5e1',
                  width: '240px',
                  zIndex: 200,
                  overflow: 'hidden',
                }}
              >
                <div
                  id="menu-item-new-project"
                  onClick={() => {
                    setCreateMenuOpen(false);
                    navigate('/projects/new');
                  }}
                  style={{
                    padding: '10px 14px',
                    fontSize: '13px',
                    color: '#0f172a',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <span>✨</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>New Project (9-Step)</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Canonical onboarding wizard</div>
                  </div>
                </div>

                <div
                  id="menu-item-new-task"
                  onClick={() => {
                    setCreateMenuOpen(false);
                    setIsTaskModalOpen(true);
                  }}
                  style={{
                    padding: '10px 14px',
                    fontSize: '13px',
                    color: '#0f172a',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <span>📝</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>New Task</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Assign WBS deliverable</div>
                  </div>
                </div>

                <div
                  id="menu-item-new-approval"
                  onClick={() => {
                    setCreateMenuOpen(false);
                    setIsApprovalModalOpen(true);
                  }}
                  style={{
                    padding: '10px 14px',
                    fontSize: '13px',
                    color: '#0f172a',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span>✍️</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>Request Sign-off</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Submit governance decision</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Persona Switcher (Connected to Authentication Session) */}
          <select
            id="user-persona-select"
            value={currentUser.email}
            onChange={(e) => {
              switchPersona(e.target.value);
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
            {CANONICAL_E3_USERS.map((user) => (
              <option key={user.email} value={user.email}>
                👤 {user.name} ({user.role})
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

          {/* User Account / Profile */}
          <button
            id="btn-account-profile"
            onClick={() => navigate('/account')}
            style={{
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>👤</span>
            <span>Profile</span>
          </button>

          {/* Logout */}
          <button
            id="btn-logout"
            onClick={logout}
            style={{
              backgroundColor: '#1e293b',
              color: '#f87171',
              border: '1px solid #7f1d1d',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>

          {/* Language / RTL Toggle */}
          <button
            id="btn-toggle-language"
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
            gap: '4px',
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
            {currentLanguage === 'ar' ? 'التنقل الرئيسي' : 'Main Navigation'}
          </div>

          {mainNavItems.map((item) => {
            const isActive = item.path === '/'
              ? currentPath === '/'
              : currentPath.startsWith(item.path);
            return (
              <button
                key={item.id}
                id={item.id}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
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
                <span style={{ fontSize: '15px' }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{currentLanguage === 'ar' ? item.labelAr : item.labelEn}</span>
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

          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              padding: '16px 8px 6px 8px',
              borderTop: '1px solid #f1f5f9',
              marginTop: '8px',
            }}
          >
            {currentLanguage === 'ar' ? 'البوابات المتخصصة' : 'Portals & Field'}
          </div>

          {portalItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <button
                key={item.id}
                id={item.id}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
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
                <span style={{ fontSize: '15px' }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{currentLanguage === 'ar' ? item.labelAr : item.labelEn}</span>
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

      {/* Modals & Drawers */}
      <NewProjectWizardModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onProjectCreated={(p) => {
          setSelectedProjectId(p.id);
          setActiveWorkspace('project');
        }}
      />

      <CreateTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onTaskCreated={() => {}}
        projectId={selectedProjectId}
      />

      <RequestApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        onApprovalRequested={() => {}}
        projectId={selectedProjectId}
      />

      <AuditHistoryDrawer
        isOpen={isAuditDrawerOpen}
        onClose={() => setIsAuditDrawerOpen(false)}
        projectId={selectedProjectId}
      />
    </div>
  );
};

