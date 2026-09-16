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
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

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

  // Collapsible section state persistence
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('eos_nav_collapsed');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return { closeout: true }; // Default Closeout collapsed for cleaner view
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
  // 7 CANONICAL NAVIGATION GROUPS (SECTION 10)
  // ==========================================
  const rawNavSections: NavSection[] = [
    {
      id: 'home',
      titleEn: 'Home',
      titleAr: 'الرئيسية والمحفظة',
      items: [
        { path: '/', labelEn: 'Home Dashboard', labelAr: 'لوحة المتابعة', icon: '🏠', id: 'nav-home' },
        { path: '/my-work', labelEn: 'My Work Queue', labelAr: 'مهامي الشخصية', icon: '📋', id: 'nav-my-work' },
        { path: '/portfolio', labelEn: 'Portfolio Financials', labelAr: 'المحفظة المؤسسية', icon: '📊', id: 'nav-portfolio' },
      ],
    },
    {
      id: 'control',
      titleEn: 'Control',
      titleAr: 'التحكم والحوكمة',
      items: [
        { path: '/projects', labelEn: 'Projects Directory', labelAr: 'دليل المشاريع', icon: '🎪', id: 'nav-projects' },
        { path: '/projects/f1111111-1111-4111-8111-111111111111', labelEn: 'Project Cockpit', labelAr: 'قمرة القيادة للمشروع', icon: '🎯', id: 'nav-cockpit' },
        { path: '/approvals', labelEn: 'Governance Approvals', labelAr: 'الموافقات والحوكمة', icon: '✍️', id: 'nav-approvals' },
        { path: '/calendar', labelEn: 'Master Calendar', labelAr: 'التقويم العام', icon: '📅', id: 'nav-calendar' },
      ],
    },
    {
      id: 'commercial',
      titleEn: 'Commercial',
      titleAr: 'المالية والمطابقة',
      items: [
        { path: '/commercial/financial-control', labelEn: 'Financial Control Center', labelAr: 'مركز الرقابة المالية', icon: '💰', id: 'nav-fin-control' },
        { path: '/commercial/supplier-invoices', labelEn: 'Supplier Invoices (3-Way Match)', labelAr: 'فواتير الموردين والمطابقة', icon: '🧾', id: 'nav-sup-invoices' },
        { path: '/commercial/client-billing', labelEn: 'Client Billing & Collections', labelAr: 'فوترة العميل والتحصيل', icon: '💳', id: 'nav-client-billing' },
        { path: '/commercial/closeout', labelEn: 'Commercial Closeout (10 Pillars)', labelAr: 'الإغلاق التجاري المالي', icon: '🔒', id: 'nav-comm-closeout' },
        { path: '/estimating/historical', labelEn: 'Historical Estimating', labelAr: 'التقدير التاريخي والتسعير', icon: '📈', id: 'nav-estimating' },
      ],
    },
    {
      id: 'delivery',
      titleEn: 'Delivery',
      titleAr: 'التوريد والمستودعات',
      items: [
        { path: '/vendors', labelEn: 'Vendor Directory', labelAr: 'دليل الموردين', icon: '🏢', id: 'nav-vendors' },
        { path: '/warehouse', labelEn: 'Warehouse Hub', labelAr: 'المستودع المركزي', icon: '📦', id: 'nav-warehouse' },
      ],
    },
    {
      id: 'live',
      titleEn: 'Live Operations',
      titleAr: 'العمليات المباشرة',
      items: [
        { path: '/field', labelEn: 'Field Ops Mobile PWA', labelAr: 'عمليات الموقع الميدانية', icon: '📱', id: 'nav-field' },
        { path: '/live/run-sheet', labelEn: 'Master Run Sheet', labelAr: 'جدول العرض المباشر', icon: '⏱️', id: 'nav-run-sheet' },
        { path: '/live/command-center', labelEn: 'Live Command Centre', labelAr: 'مركز القيادة الميداني', icon: '🛰️', id: 'nav-command-center' },
        { path: '/live/compliance', labelEn: 'Compliance Register', labelAr: 'سجل الامتثال والتراخيص', icon: '⚖️', id: 'nav-compliance' },
        { path: '/live/roster', labelEn: 'Live Roster & Crew', labelAr: 'سجل الحضور والإجهاد', icon: '👥', id: 'nav-roster' },
      ],
    },
    {
      id: 'closeout',
      titleEn: 'Closeout',
      titleAr: 'الإغلاق والتسليم',
      items: [
        { path: '/bump-out', labelEn: 'Bump-Out Closeout', labelAr: 'التفكيك والإغلاق التشغيلي', icon: '🏁', id: 'nav-bumpout' },
        { path: '/reports/post-event', labelEn: 'Post-Event Closeout Report', labelAr: 'تقرير ما بعد الفعالية', icon: '📜', id: 'nav-post-event' },
        { path: '/closeout/performance', labelEn: 'Performance & Knowledge', labelAr: 'الأداء والدروس المستفادة', icon: '🧠', id: 'nav-knowledge' },
      ],
    },
    {
      id: 'admin',
      titleEn: 'Admin & Rollout',
      titleAr: 'الإدارة والإطلاق',
      items: [
        { path: '/admin/release/human-uat', labelEn: 'Human UAT Control Centre', labelAr: 'مساحة اختبار قبول المستخدمين', icon: '🧑‍💼', id: 'nav-human-uat' },
        { path: '/admin/release/uat-defects', labelEn: 'UAT Defect Triage Board', labelAr: 'لوحة فرز عيوب UAT', icon: '🐞', id: 'nav-uat-defects' },
        { path: '/admin/rollout', labelEn: 'Production Rollout Console', labelAr: 'لوحة إطلاق الإنتاج', icon: '🚀', id: 'nav-rollout-console' },
        { path: '/admin/users', labelEn: 'Administration & RBAC', labelAr: 'الإدارة والمستخدمين', icon: '⚙️', id: 'nav-admin' },
        { path: '/governance/workflows', labelEn: 'Visual Workflow Builder', labelAr: 'مصمم تدفق العمل', icon: '🛠️', id: 'nav-workflows' },
        { path: '/governance/simulator', labelEn: 'Policy Simulation Sandbox', labelAr: 'محاكاة السياسات', icon: '🧪', id: 'nav-simulator' },
        { path: '/compliance/country-packs', labelEn: 'Country Packs (QA / SA / AE)', labelAr: 'الحزم الوطنية والامتثال', icon: '🌍', id: 'nav-country-packs' },
        { path: '/admin/integrations', labelEn: 'Enterprise Integrations (ERP)', labelAr: 'تكامل النظم المؤسسية', icon: '🔌', id: 'nav-integrations' },
        { path: '/client', labelEn: 'Client Collaboration Portal', labelAr: 'بوابة تعاون العميل', icon: '🤝', id: 'nav-client' },
        { path: '/client/results', labelEn: 'Client Results Room', labelAr: 'غرفة نتائج العميل', icon: '🏆', id: 'nav-client-results' },
      ],
    },
  ];

  // Role-based navigation filtering (Section 11)
  const navSections = rawNavSections
    .map((sec) => {
      if (isClientUser) {
        // Client only sees Home and Client Portal items
        if (sec.id === 'home') {
          return { ...sec, items: sec.items.filter((i) => i.path === '/') };
        }
        if (sec.id === 'admin') {
          return { ...sec, titleEn: 'Client Portal', titleAr: 'بوابة العميل', items: sec.items.filter((i) => i.path.startsWith('/client')) };
        }
        return null;
      }

      if (isFieldUser) {
        // Field Supervisor focuses on Live Operations and basic work queue
        if (sec.id === 'commercial' || sec.id === 'admin') return null;
        return sec;
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
                    backgroundColor: '#1e293b',
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
                  const isActive = item.path === '/'
                    ? currentPath === '/'
                    : currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
                  const itemLabel = currentLanguage === 'ar' ? item.labelAr : item.labelEn;
                  return (
                    <button
                      key={item.id}
                      id={item.id}
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
                        border: isRail && isActive ? '1px solid #d97706' : 'none',
                        backgroundColor: isActive ? '#1e293b' : 'transparent',
                        color: isActive ? '#ffffff' : '#94a3b8',
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
                            backgroundColor: '#d97706',
                            borderRadius: '2px',
                          }}
                        />
                      )}
                      <span style={{ fontSize: isRail ? '18px' : '15px' }}>{item.icon}</span>
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
        style={{
          height: '56px',
          backgroundColor: '#090d16',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '0 12px' : '0 20px',
          borderBottom: '1px solid #1e293b',
          zIndex: 100,
          boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
            <span
              style={{
                backgroundColor: '#d97706',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '13px',
                padding: '3px 7px',
                borderRadius: '4px',
                letterSpacing: '0.8px',
              }}
            >
              E3
            </span>
            <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '0.5px', color: '#ffffff' }}>EOS</span>
          </div>

          {/* Staging Badge */}
          <span
            id="staging-env-badge"
            style={{
              backgroundColor: '#1e293b',
              color: '#d97706',
              border: '1px solid #d97706',
              fontWeight: 800,
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '4px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
            title="Google Cloud Doha (me-central1)"
          >
            STAGING
          </span>

          {/* Desktop Subtitle */}
          {!isMobile && (
            <>
              <span style={{ color: '#334155', fontSize: '13px' }}>|</span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                {currentLanguage === 'ar' ? 'نظام تشغيل الفعاليات المؤسسي' : 'Enterprise Event Operating System'}
              </span>
            </>
          )}
        </div>

        {/* Global Search Bar (Desktop) */}
        {!isMobile && (
          <div style={{ flex: 1, maxWidth: '340px', margin: '0 20px' }}>
            <input
              type="text"
              placeholder={currentLanguage === 'ar' ? 'بحث في المشاريع والمهام وأوامر الشراء...' : 'Search projects, tasks, approvals, POs...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#131b2e',
                color: '#f8fafc',
                border: '1px solid #1e293b',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* + Create Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              id="btn-create-menu"
              onClick={() => setCreateMenuOpen(!createMenuOpen)}
              style={{
                backgroundColor: '#1e293b',
                color: '#ffffff',
                border: '1px solid #334155',
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
                backgroundColor: '#131b2e',
                border: '1px solid #1e293b',
                fontSize: '12px',
              }}
            >
              <span style={{ fontSize: '13px' }}>👤</span>
              <span style={{ fontWeight: 700, color: '#f8fafc' }}>
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
              backgroundColor: '#1e293b',
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

          {/* Language / RTL Toggle */}
          <button
            id="btn-toggle-language"
            onClick={toggleLanguage}
            style={{
              backgroundColor: '#1e293b',
              color: '#d97706',
              border: '1px solid #d97706',
              borderRadius: '6px',
              padding: '6px 10px',
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
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        {/* Desktop Sidebar (Deep Charcoal / Obsidian Chrome) */}
        {!isMobile && (
          <aside
            style={{
              width: isSidebarCollapsed ? '72px' : '268px',
              flexShrink: 0,
              backgroundColor: '#090d16',
              borderRight: direction === 'ltr' ? '1px solid #1e293b' : 'none',
              borderLeft: direction === 'rtl' ? '1px solid #1e293b' : 'none',
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
            <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #1e293b' }}>
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
                  backgroundColor: '#131b2e',
                  border: '1px solid #1e293b',
                  color: '#94a3b8',
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
              backgroundColor: 'rgba(9, 13, 22, 0.7)',
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
                backgroundColor: '#090d16',
                padding: '20px 14px',
                overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ backgroundColor: '#d97706', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, fontSize: '12px' }}>E3</span>
                  <span style={{ color: '#fff', fontWeight: 700 }}>{currentLanguage === 'ar' ? 'القائمة' : 'Navigation Menu'}</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close Navigation"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
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
        <main
          style={{
            flex: 1,
            minWidth: 0,
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
            backgroundColor: '#090d16',
            borderTop: '1px solid #1e293b',
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
            <span style={{ fontSize: '18px' }}>🏠</span>
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
            <span style={{ fontSize: '18px' }}>📋</span>
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
            <span style={{ fontSize: '18px' }}>📱</span>
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
