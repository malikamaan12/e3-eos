import React, { useState, useEffect } from 'react';
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
import { E3_THEME } from './DesignSystem.js';
import { BrandLogo } from './BrandLogo.js';
import { WorkspaceIcon } from './WorkspaceIcon.js';

export interface LayoutShellProps {
  children: React.ReactNode;
}

interface NavItem {
  path: string;
  labelEn: string;
  labelAr: string;
  icon: string;
  id: string;
  roles?: string[]; // Allowed roles (if omitted, visible to all internal)
}

interface NavSection {
  id: string;
  titleEn: string;
  titleAr: string;
  items: NavItem[];
}

export const LayoutShell: React.FC<LayoutShellProps> = ({ children }) => {
  const {
    apiClient,
    triggerRefresh,
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
    isImpersonating,
    impersonatedBy,
    exitImpersonation,
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    toggleLanguage,
    toggleOffline,
    theme,
    toggleTheme,
    setActiveWorkspace,
    setCurrentOrg,
    setCurrentUser,
    setSelectedProjectId,
    projects,
    currentProject,
    setIsNewProjectModalOpen,
    setIsTaskModalOpen,
    setIsApprovalModalOpen,
    setIsAuditDrawerOpen,
  } = useEosContext();

  const [createMenuOpen, setCreateMenuOpen] = useState<boolean>(false);
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [runtimeEnvironment, setRuntimeEnvironment] = useState('unknown');

  useEffect(() => {
    let active = true;
    apiClient.getRuntimeEnvironment()
      .then((environment) => { if (active) setRuntimeEnvironment(environment); })
      .catch(() => { if (active) setRuntimeEnvironment('unknown'); });
    return () => { active = false; };
  }, [apiClient]);

  // Responsive breakpoint tracking
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  });

  // Desktop sidebar collapsed state (expanded 268px vs collapsed 72px icon rail)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('eos_sidebar_collapsed');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return false;
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('eos_sidebar_collapsed', JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard accessibility: Escape key closes drawers and menus
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mobileMenuOpen) setMobileMenuOpen(false);
        if (createMenuOpen) setCreateMenuOpen(false);
        if (notificationsOpen) setNotificationsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen, createMenuOpen, notificationsOpen]);

  const mainRef = React.useRef<HTMLElement>(null);

  // Scroll reset to top on navigation path change (O20)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [currentPath]);

  // Collapsible section state persistence
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('eos_nav_collapsed');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return { modules: true }; // Default Enterprise Modules collapsed for cleaner 8-item primary view
  });

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [sectionId]: !prev[sectionId] };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('eos_nav_collapsed', JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  const userRole = (currentUser as any)?.role || 'super_admin';
  const isClientUser = userRole === 'client' || (currentUser?.email ? currentUser.email.includes('client') : false);
  const isFieldUser = userRole === 'field_supervisor' || (currentUser?.email ? currentUser.email.includes('field') : false);

  // ==========================================
  // CANONICAL 8 PRIMARY DESTINATIONS (SECTION 11.1)
  // + COLLAPSIBLE ENTERPRISE MODULES
  // ==========================================
  const rawNavSections: NavSection[] = [
    {
      id: 'primary',
      titleEn: 'Main Navigation',
      titleAr: 'الرئيسية',
      items: [
        { path: '/', labelEn: 'Home', labelAr: 'الرئيسية', icon: '🏠', id: 'nav-home' },
        { path: '/my-work', labelEn: 'My Work', labelAr: 'مهامي', icon: '📋', id: 'nav-my-work' },
        { path: '/projects', labelEn: 'Projects', labelAr: 'المشاريع', icon: '📁', id: 'nav-projects' },
        { path: '/approvals', labelEn: 'Approvals', labelAr: 'الموافقات', icon: '✍️', id: 'nav-approvals' },
        { path: '/calendar', labelEn: 'Calendar', labelAr: 'التقويم', icon: '📅', id: 'nav-calendar' },
        { path: '/portfolio', labelEn: 'Portfolio', labelAr: 'المحفظة', icon: '📊', id: 'nav-portfolio' },
        { path: '/reports', labelEn: 'Reports', labelAr: 'التقارير', icon: '📈', id: 'nav-reports' },
        { path: '/admin/users', labelEn: 'Administration', labelAr: 'الإدارة', icon: '⚙️', id: 'nav-admin' },
      ],
    },
    {
      id: 'modules',
      titleEn: 'Enterprise Modules',
      titleAr: 'الوحدات التشغيلية',
      items: [
        { path: selectedProjectId ? `/projects/${selectedProjectId}` : '/projects', labelEn: 'Project Cockpit', labelAr: 'قمرة القيادة للمشروع', icon: '🎯', id: 'nav-cockpit' },
        { path: '/work-register', labelEn: 'Work packages & tasks', labelAr: 'حزم العمل والمهام', icon: '📋', id: 'nav-work-register' },
        { path: '/schedule', labelEn: 'Schedule & dependencies', labelAr: 'الجدول والاعتماديات', icon: '📅', id: 'nav-schedule' },
        { path: '/requirements/register', labelEn: 'Requirement intake', labelAr: 'تسجيل المتطلبات', icon: '📝', id: 'nav-requirements-register' },
        { path: '/clarifications/register', labelEn: 'Clarification register', labelAr: 'سجل الاستيضاحات', icon: '💬', id: 'nav-clarifications-register' },
        { path: '/documents/register', labelEn: 'Document register', labelAr: 'سجل الوثائق', icon: '📑', id: 'nav-documents-register' },
        { path: '/allocations/register', labelEn: 'Allocation planning', labelAr: 'تخطيط التوزيعات', icon: '📐', id: 'nav-allocation-register' },
        { path: '/designs/register', labelEn: 'Design briefs', labelAr: 'موجزات التصميم', icon: '🎨', id: 'nav-design-register' },
        { path: '/impact-review', labelEn: 'Change impact', labelAr: 'أثر التغييرات', icon: '🔄', id: 'nav-impact-register' },
        { path: '/commercial/financial-control', labelEn: 'Financial Control Center', labelAr: 'مركز الرقابة المالية', icon: '💰', id: 'nav-fin-control' },
        { path: '/commercial/supplier-invoices', labelEn: 'Supplier Invoices (3-Way Match)', labelAr: 'فواتير الموردين والمطابقة', icon: '🧾', id: 'nav-sup-invoices' },
        { path: '/commercial/client-billing', labelEn: 'Client Billing & Collections', labelAr: 'فوترة العميل والتحصيل', icon: '💳', id: 'nav-client-billing' },
        { path: '/commercial/closeout', labelEn: 'Commercial Closeout (10 Pillars)', labelAr: 'الإغلاق التجاري المالي', icon: '🔒', id: 'nav-comm-closeout' },
        { path: '/estimating/historical', labelEn: 'Historical Estimating', labelAr: 'التقدير التاريخي والتسعير', icon: '📈', id: 'nav-estimating' },
        { path: '/vendors', labelEn: 'Vendor Directory', labelAr: 'دليل الموردين', icon: '🏢', id: 'nav-vendors' },
        { path: '/warehouse', labelEn: 'Warehouse Hub', labelAr: 'المستودع المركزي', icon: '📦', id: 'nav-warehouse' },
        { path: '/field', labelEn: 'Field notes', labelAr: 'ملاحظات الموقع', icon: '📱', id: 'nav-field' },
        { path: '/live/run-sheet', labelEn: 'Master Run Sheet', labelAr: 'جدول العرض المباشر', icon: '⏱️', id: 'nav-run-sheet' },
        { path: '/live/command-center', labelEn: 'Live Command Centre', labelAr: 'مركز القيادة الميداني', icon: '🛰️', id: 'nav-command-center' },
        { path: '/live/compliance', labelEn: 'Compliance Register', labelAr: 'سجل الامتثال والتراخيص', icon: '⚖️', id: 'nav-compliance' },
        { path: '/live/roster', labelEn: 'Live Roster & Crew', labelAr: 'سجل الحضور والإجهاد', icon: '👥', id: 'nav-roster' },
        { path: '/bump-out', labelEn: 'Bump-Out Closeout', labelAr: 'التفكيك والإغلاق التشغيلي', icon: '🏁', id: 'nav-bumpout' },
        { path: '/admin/release/human-uat', labelEn: 'Human UAT Control Centre', labelAr: 'مساحة اختبار قبول المستخدمين', icon: '🧑‍💼', id: 'nav-human-uat' },
        { path: '/admin/release/uat-defects', labelEn: 'UAT Defect Triage Board', labelAr: 'لوحة فرز عيوب UAT', icon: '🐞', id: 'nav-uat-defects' },
        { path: '/admin/rollout', labelEn: 'Production Rollout Console', labelAr: 'لوحة إطلاق الإنتاج', icon: '🚀', id: 'nav-rollout-console' },
        { path: '/governance/workflows', labelEn: 'Visual Workflow Builder', labelAr: 'مصمم تدفق العمل', icon: '🛠️', id: 'nav-workflows' },
        { path: '/governance/simulator', labelEn: 'Policy Simulation Sandbox', labelAr: 'محاكاة السياسات', icon: '🧪', id: 'nav-simulator' },
        { path: '/compliance/country-packs', labelEn: 'Country Packs (QA / SA / AE)', labelAr: 'الحزم الوطنية والامتثال', icon: '🌍', id: 'nav-country-packs' },
        { path: '/settings/integrations', labelEn: 'AI & Central Integrations', labelAr: 'الذكاء الاصطناعي والتكامل المركزي', icon: '🤖', id: 'nav-ai-integrations' },
        { path: '/admin/integrations', labelEn: 'Enterprise Integrations (ERP)', labelAr: 'تكامل النظم المؤسسية', icon: '🔌', id: 'nav-integrations' },
        { path: '/client', labelEn: 'Client Collaboration Portal', labelAr: 'بوابة تعاون العميل', icon: '🤝', id: 'nav-client' },
        { path: '/client/results', labelEn: 'Client Results Room', labelAr: 'غرفة نتائج العميل', icon: '🏆', id: 'nav-client-results' },
      ],
    },
  ];

  // Role-based navigation filtering (Section 11)
  const isSuperAdmin = (currentUser as any)?.isSuperAdmin === true || userRole === 'super_admin';
  const isExecutive = userRole === 'executive';
  const isFinance = userRole === 'finance' || userRole === 'finance_controller' || userRole === 'financial_controller';

  const navSections = rawNavSections
    .map((sec) => {
      if (isClientUser) {
        if (sec.id === 'primary') {
          return { ...sec, items: sec.items.filter((i) => i.path === '/') };
        }
        if (sec.id === 'modules') {
          return {
            ...sec,
            titleEn: 'Client Portal',
            titleAr: 'بوابة العميل',
            items: sec.items.filter((i) => i.path.startsWith('/client')),
          };
        }
        return null;
      }

      if (isFieldUser) {
        if (sec.id === 'primary') {
          return {
            ...sec,
            items: sec.items.filter((i) => ['/', '/my-work', '/projects'].includes(i.path)),
          };
        }
        if (sec.id === 'modules') {
          return {
            ...sec,
            items: sec.items.filter((i) => ['/field', '/live/run-sheet', '/live/roster'].includes(i.path)),
          };
        }
        return sec;
      }

      // Restrict Admin & Rollout section for non-super_admin / non-executive
      if (sec.id === 'modules') {
        const filteredItems = sec.items.filter((item) => {
          if (item.path.startsWith('/admin/users') || item.path.startsWith('/admin/rollout')) {
            return isSuperAdmin || isExecutive;
          }
          if (item.path.startsWith('/governance/workflows') || item.path.startsWith('/governance/simulator')) {
            return isSuperAdmin || isExecutive;
          }
          if (item.path.startsWith('/admin/integrations')) {
            return isSuperAdmin || isExecutive || isFinance;
          }
          return true;
        });
        return { ...sec, items: filteredItems };
      }

      return sec;
    })
    .filter(Boolean) as NavSection[];

  // Render navigation list
  const renderNavList = (isRail: boolean = false) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isRail ? '4px' : '8px' }}>
      {navSections.map((section, secIdx) => {
        const isCollapsed = !isRail && !!collapsedSections[section.id];
        const sectionTitle = currentLanguage === 'ar' ? section.titleAr : section.titleEn;
        return (
          <div key={section.id} style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Collapsible Section Header (hidden or divider in rail mode) */}
            {isRail ? (
              secIdx > 0 ? (
                <div
                  style={{
                    height: '1px',
                    backgroundColor: 'var(--surface-3)',
                    margin: '8px 4px',
                  }}
                  title={sectionTitle}
                />
              ) : null
            ) : (
              <button
                onClick={() => toggleSection(section.id)}
                aria-expanded={!isCollapsed}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  outline: 'none',
                  transition: 'color 0.15s ease',
                  minHeight: '32px',
                }}
              >
                <span>{sectionTitle}</span>
                <span style={{ fontSize: '9px', opacity: 0.8 }}>{isCollapsed ? (direction === 'rtl' ? '◀' : '▶') : '▼'}</span>
              </button>
            )}

            {/* Section Items */}
            {(!isCollapsed || isRail) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: (!isRail && direction === 'ltr') ? '4px' : 0, paddingRight: (!isRail && direction === 'rtl') ? '4px' : 0 }}>
                {section.items.map((item) => {
                  const isItemActive = (it: NavItem) => {
                    if (it.path === '/') return currentPath === '/';
                    if (it.id === 'nav-portfolio') {
                      return currentPath === '/portfolio' || currentPath.startsWith('/commercial/financial-control');
                    }
                    if (it.id === 'nav-reports') {
                      return currentPath.startsWith('/reports');
                    }
                    if (it.id === 'nav-admin') {
                      return currentPath.startsWith('/admin') || currentPath.startsWith('/governance');
                    }
                    if (it.id === 'nav-projects') {
                      return currentPath === '/projects' || currentPath === '/projects/new';
                    }
                    return currentPath === it.path || (it.path !== '/' && currentPath.startsWith(it.path));
                  };
                  const isActive = isItemActive(item);
                  const itemLabel = currentLanguage === 'ar' ? item.labelAr : item.labelEn;
                  return (
                    <button
                      key={item.id}
                      id={item.id}
                      className="eos-nav-item"
                      aria-current={isActive ? "page" : undefined}
                      title={isRail ? `${itemLabel} (${sectionTitle})` : undefined}
                      aria-label={itemLabel}
                      onClick={() => {
                        navigate(item.path);
                        if (isMobile) setMobileMenuOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isRail ? 'center' : 'flex-start',
                        gap: isRail ? 0 : '10px',
                        padding: isRail ? '8px 4px' : '9px 12px',
                        borderRadius: '6px',
                        border: isRail && isActive ? '1px solid var(--accent, #d97706)' : 'none',
                        backgroundColor: isActive ? 'var(--surface-2, #1e293b)' : 'transparent',
                        color: isActive ? 'var(--text-primary, #ffffff)' : 'var(--text-muted, #94a3b8)',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '13px',
                        textAlign: direction === 'rtl' ? 'right' : 'left',
                        cursor: 'pointer',
                        transition: 'all 0.12s ease',
                        fontFamily: 'inherit',
                        width: '100%',
                        position: 'relative',
                        outline: 'none',
                        minHeight: isMobile ? '44px' : '38px',
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* Active Metallic Accent Indicator */}
                      {isActive && !isRail && (
                        <div
                          style={{
                            position: 'absolute',
                            [direction === 'rtl' ? 'right' : 'left']: 0,
                            top: '4px',
                            bottom: '4px',
                            width: '3px',
                            backgroundColor: 'var(--accent, #d97706)',
                            borderRadius: '2px',
                          }}
                        />
                      )}
                      <WorkspaceIcon name={item.path} />
                      {!isRail && (
                        <span
                          style={{
                            flex: 1,
                            whiteSpace: 'normal',
                            lineHeight: 1.25,
                            wordBreak: 'break-word',
                          }}
                        >
                          {itemLabel}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="eos-shell"
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: 'var(--canvas, #090d16)',
        fontFamily: currentLanguage === 'ar' ? '"Noto Sans Arabic", Tahoma, Arial, sans-serif' : 'Inter, -apple-system, sans-serif',
        color: 'var(--text-primary, #f8fafc)',
      }}
    >
      {/* Impersonation Audit Banner */}
      {isImpersonating && (
        <div
          id="impersonation-warning-banner"
          style={{
            backgroundColor: '#fef3c7',
            color: '#92400e',
            borderBottom: '1px solid #f59e0b',
            padding: '8px 20px',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 110,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️</span>
            <span>
              <strong>Impersonation Audit Active:</strong> Operating as <strong>{currentUser?.name || 'User'}</strong> ({currentUser?.role || 'Role'}). All mutations logged under <em>{impersonatedBy || 'Super Admin'}</em>.
            </span>
          </div>
          <button
            id="btn-exit-impersonation"
            onClick={exitImpersonation}
            style={{
              backgroundColor: '#92400e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              padding: '3px 10px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Exit Impersonation
          </button>
        </div>
      )}

      {/* Top Application Header (E3 Charcoal / Near-Black Chrome) */}
      <header
        className="eos-app-header"
        style={{
          minHeight: '56px',
          flexShrink: 0,
          backgroundColor: 'var(--canvas, #090d16)',
          color: 'var(--text-primary, #ffffff)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '0 12px' : '0 20px',
          borderBottom: '1px solid var(--border-subtle, #1e293b)',
          zIndex: 100,
          boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
        }}
      >
        <div className="eos-header-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Mobile Hamburger Menu Button */}
          {isMobile && (
            <button
              id="btn-mobile-menu"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open Navigation Menu"
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              ☰
            </button>
          )}

          {/* Logo Brand */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            <BrandLogo />
          </div>

          {/* Environment reported by the current API. */}
          <span
            id="runtime-env-badge"
            style={{
              backgroundColor: 'var(--surface-3)',
              color: '#d97706',
              border: '1px solid #d97706',
              fontWeight: 800,
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '4px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
            title={`API environment: ${runtimeEnvironment}`}
          >
            {runtimeEnvironment === 'unknown' ? (currentLanguage === 'ar' ? 'البيئة غير مؤكدة' : 'ENV UNKNOWN') : runtimeEnvironment.toUpperCase()}
          </span>

          {/* Desktop Subtitle */}
          {!isMobile && (
            <>
              <span style={{ color: '#334155', fontSize: '13px' }}>|</span>
              <span className="eos-header-subtitle" style={{ fontSize: '12px', color: '#94a3b8' }}>
                {currentLanguage === 'ar' ? 'نظام تشغيل الفعاليات المؤسسي' : 'Enterprise Event Operating System'}
              </span>
            </>
          )}
        </div>

        {/* Global Active Project Switcher Dropdown */}
        <div
          id="global-project-switcher-container"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--surface-inset)',
            border: '1px solid var(--border-default)',
            borderRadius: '6px',
            padding: '3px 8px',
            margin: isMobile ? '0 4px' : '0 10px',
            maxWidth: isMobile ? '160px' : '360px',
            flex: isMobile ? '0 1 auto' : '0 1 360px',
            boxShadow: 'none',
          }}
        >
          <span style={{ fontSize: '13px', flexShrink: 0 }}>📁</span>
          <select
            id="global-project-selector"
            aria-label="Active Project"
            value={selectedProjectId || currentProject?.id || '00000000-0000-4000-8000-000000000099'}
            onChange={(e) => {
              const newId = e.target.value;
              setSelectedProjectId(newId);
              if (currentPath.includes('/design')) {
                navigate(`/projects/${newId}/designs`);
              } else if (currentPath.startsWith('/projects/') && !currentPath.includes('/new')) {
                navigate(`/projects/${newId}`);
              }
            }}
            style={{
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              outline: 'none',
              cursor: 'pointer',
              width: '100%',
              textOverflow: 'ellipsis',
              fontFamily: 'inherit',
            }}
          >
            {projects.map((p) => {
              const code = p.projectCode || p.code || p.id;
              const isLab = code.includes('ALL-FORMATS') || p.id === '00000000-0000-4000-8000-000000000099';
              return (
                <option key={p.id} value={p.id} style={{ backgroundColor: 'var(--surface-1)', color: 'var(--text-primary)' }}>
                  {isLab ? `🧪 ${code} — ${p.title || p.name} (18 Formats Lab)` : `${code} — ${p.title || p.name}`}
                </option>
              );
            })}
          </select>
        </div>

        {/* Global Search Bar (Desktop) */}
        {!isMobile && (
          <div className="eos-header-search" style={{ flex: 1, maxWidth: '340px', margin: '0 20px' }}>
            <input
              type="text"
              placeholder={currentLanguage === 'ar' ? 'بحث في المشاريع والمهام وأوامر الشراء...' : 'Search projects, tasks, approvals, POs...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--surface-inset)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {/* Header Right Actions */}
        <div className="eos-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* + Create Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              id="btn-create-menu"
              onClick={() => setCreateMenuOpen(!createMenuOpen)}
              style={{
                backgroundColor: 'var(--surface-3)',
                color: '#ffffff',
                border: '1px solid var(--border-default)',
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
              <span>{currentLanguage === 'ar' ? '+ إنشاء' : '+ Create'}</span>
              <span style={{ fontSize: '9px' }}>▼</span>
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
                  <span>📋</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>Quick Task</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Assigned deliverable</div>
                  </div>
                </div>

                <div
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
                    <div style={{ fontWeight: 600 }}>Request Approval</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Governance sign-off</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Info */}
          {!isMobile && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: 'var(--surface-inset)',
                border: '1px solid var(--border-subtle)',
                fontSize: '12px',
              }}
            >
              <span style={{ fontSize: '13px' }}>👤</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                <span dir="ltr">{currentUser?.name || 'User'}</span>
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>({currentUser?.role || 'Role'})</span>
            </div>
          )}

          {/* Sign Out */}
          <button
            id="btn-logout"
            onClick={logout}
            style={{
              backgroundColor: 'var(--surface-3)',
              color: '#f87171',
              border: '1px solid #7f1d1d',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {currentLanguage === 'ar' ? 'خروج' : 'Sign Out'}
          </button>

          {/* Theme Toggle */}
          <button
            id="btn-toggle-theme"
            onClick={toggleTheme}
            title={theme === 'dark' ? (currentLanguage === 'ar' ? 'التبديل إلى الوضع النهاري' : 'Switch to Light Mode') : (currentLanguage === 'ar' ? 'التبديل إلى الوضع الليلي' : 'Switch to Dark Mode')}
            aria-label="Toggle Theme"
            style={{
              backgroundColor: 'var(--surface-2, #1e293b)',
              color: 'var(--accent, #d97706)',
              border: '1px solid var(--accent, #d97706)',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              minHeight: '34px',
            }}
          >
            <span>{theme === 'dark' ? '🌙' : '☀️'}</span>
            {!isMobile && <span>{theme === 'dark' ? (currentLanguage === 'ar' ? 'ليلي' : 'Dark') : (currentLanguage === 'ar' ? 'نهاري' : 'Light')}</span>}
          </button>

          {/* Language / RTL Toggle */}
          <button
            id="btn-toggle-language"
            onClick={toggleLanguage}
            style={{
              backgroundColor: 'var(--surface-2, #1e293b)',
              color: 'var(--accent, #d97706)',
              border: '1px solid var(--accent, #d97706)',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              minHeight: '34px',
            }}
          >
            {currentLanguage === 'en' ? 'العربية (RTL)' : 'English (LTR)'}
          </button>
        </div>
      </header>

      {/* Main Body with Sidebar + Content */}
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        {/* Desktop Sidebar (Deep Charcoal / Obsidian Chrome) */}
        {!isMobile && (
          <aside className="eos-sidebar"
            style={{
              width: isSidebarCollapsed ? '72px' : '268px',
              flexShrink: 0,
              backgroundColor: 'var(--surface-inset, #090d16)',
              borderRight: direction === 'ltr' ? '1px solid var(--border-subtle, #1e293b)' : 'none',
              borderLeft: direction === 'rtl' ? '1px solid var(--border-subtle, #1e293b)' : 'none',
              padding: isSidebarCollapsed ? '16px 8px' : '16px 12px',
              display: currentPath === '/field' ? 'none' : 'flex',
              flexDirection: 'column',
              gap: '6px',
              boxSizing: 'border-box',
              minHeight: 'calc(100vh - 56px)',
              transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
              {renderNavList(isSidebarCollapsed)}
            </div>

            {/* Sidebar Collapse Toggle Button */}
            <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-subtle, #1e293b)' }}>
              <button
                id="btn-toggle-sidebar"
                onClick={toggleSidebarCollapse}
                title={isSidebarCollapsed ? (direction === 'rtl' ? 'توسيع القائمة' : 'Expand Sidebar') : (direction === 'rtl' ? 'طي القائمة' : 'Collapse Sidebar')}
                aria-label={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--surface-2, #131b2e)',
                  border: '1px solid var(--border-subtle, #1e293b)',
                  color: 'var(--text-muted, #94a3b8)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  minHeight: '38px',
                }}
              >
                {!isSidebarCollapsed && (
                  <span>{currentLanguage === 'ar' ? 'طي القائمة الجانبية' : 'Collapse Sidebar'}</span>
                )}
                <span>{isSidebarCollapsed ? (direction === 'rtl' ? '◀' : '▶') : (direction === 'rtl' ? '▶' : '◀')}</span>
              </button>
            </div>
          </aside>
        )}

        {/* Mobile Slide-Over Drawer Navigation */}
        {isMobile && mobileMenuOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Menu"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(9, 13, 22, 0.75)',
              zIndex: 9999,
              display: 'flex',
              justifyContent: direction === 'rtl' ? 'flex-end' : 'flex-start',
            }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              style={{
                width: '280px',
                height: '100%',
                backgroundColor: 'var(--surface-inset, #090d16)',
                padding: '20px 14px',
                overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle, #1e293b)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BrandLogo />
                  <span style={{ color: 'var(--text-primary, #fff)', fontWeight: 700 }}>{currentLanguage === 'ar' ? 'القائمة' : 'Navigation Menu'}</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close Navigation"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted, #94a3b8)',
                    fontSize: '18px',
                    cursor: 'pointer',
                    padding: '8px',
                    minWidth: '44px',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              </div>
              {renderNavList(false)}
            </div>
          </div>
        )}

        {/* Content Viewport */}
        <main className="eos-main"
          ref={mainRef}
          style={{
            flex: 1,
            minWidth: 0,
            backgroundColor: 'var(--canvas, #090d16)',
            color: 'var(--text-primary, #f8fafc)',
            padding: isMobile ? '16px 12px 70px 12px' : '24px 32px',
            overflowY: 'auto',
            maxWidth: '1440px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Thumb Reach on < 768px) */}
      {isMobile && (
        <nav
          aria-label="Mobile Navigation"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '56px',
            backgroundColor: 'var(--canvas, #090d16)',
            borderTop: '1px solid var(--border-subtle, #1e293b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            zIndex: 999,
            padding: '0 8px',
          }}
        >
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none',
              border: 'none',
              color: currentPath === '/' ? '#d97706' : '#94a3b8',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              fontSize: '10px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <WorkspaceIcon name="/" />
            <span>{currentLanguage === 'ar' ? 'الرئيسية' : 'Home'}</span>
          </button>

          <button
            onClick={() => navigate('/my-work')}
            style={{
              background: 'none',
              border: 'none',
              color: currentPath === '/my-work' ? '#d97706' : '#94a3b8',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              fontSize: '10px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <WorkspaceIcon name="/my-work" />
            <span>{currentLanguage === 'ar' ? 'مهامي' : 'My Work'}</span>
          </button>

          <button
            onClick={() => navigate('/field')}
            style={{
              background: 'none',
              border: 'none',
              color: currentPath === '/field' ? '#d97706' : '#94a3b8',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              fontSize: '10px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <WorkspaceIcon name="/field" />
            <span>{currentLanguage === 'ar' ? 'الميدان' : 'Field'}</span>
          </button>

          <button
            onClick={() => setMobileMenuOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              color: mobileMenuOpen ? '#d97706' : '#94a3b8',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              fontSize: '10px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '18px' }}>☰</span>
            <span>{currentLanguage === 'ar' ? 'القائمة' : 'Menu'}</span>
          </button>
        </nav>
      )}

      {/* Modals & Drawers */}
      <NewProjectWizardModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onProjectCreated={() => triggerRefresh()}
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
