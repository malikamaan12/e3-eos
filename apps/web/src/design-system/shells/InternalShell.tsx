/**
 * EOS / Shell / InternalShell
 * Standard Internal Workspace Shell (Master Plan Section 5.1).
 * Houses the fixed 8-destination navigation, search, impersonation audit, and language switch.
 */

import React from 'react';
import { TOKENS } from '../foundations/tokens.js';
import { Button } from '../primitives/Button.js';
import { Badge } from '../primitives/Badge.js';

export interface InternalNavDestination {
  id: string;
  labelEn: string;
  labelAr: string;
  icon: string;
  path: string;
  badgeCount?: number;
}

export const INTERNAL_PRIMARY_NAV: InternalNavDestination[] = [
  { id: 'home', labelEn: 'Home', labelAr: 'الرئيسية', icon: '🏠', path: '/' },
  { id: 'my-work', labelEn: 'My Work', labelAr: 'مهامي', icon: '📋', path: '/my-work' },
  { id: 'projects', labelEn: 'Projects', labelAr: 'المشاريع', icon: '📁', path: '/projects' },
  { id: 'approvals', labelEn: 'Approvals', labelAr: 'الموافقات', icon: '✍️', path: '/approvals' },
  { id: 'calendar', labelEn: 'Calendar', labelAr: 'التقويم', icon: '📅', path: '/calendar' },
  { id: 'portfolio', labelEn: 'Portfolio', labelAr: 'المحفظة', icon: '📊', path: '/commercial/financial-control' },
  { id: 'reports', labelEn: 'Reports', labelAr: 'التقارير', icon: '📈', path: '/reports/post-event' },
  { id: 'admin', labelEn: 'Administration', labelAr: 'الإدارة', icon: '⚙️', path: '/admin/users' },
];

export interface InternalShellProps {
  currentPath: string;
  currentLanguage: 'en' | 'ar';
  direction: 'ltr' | 'rtl';
  userName: string;
  userRole: string;
  environment?: string;
  isImpersonating?: boolean;
  impersonatedBy?: string;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
  onExitImpersonation?: () => void;
  onLogout?: () => void;
  onCreateNew?: () => void;
  children: React.ReactNode;
}

export const InternalShell: React.FC<InternalShellProps> = ({
  currentPath,
  currentLanguage,
  direction,
  userName,
  userRole,
  environment = 'staging',
  isImpersonating = false,
  impersonatedBy,
  onNavigate,
  onToggleLanguage,
  onExitImpersonation,
  onLogout,
  onCreateNew,
  children,
}) => {
  const isAr = currentLanguage === 'ar';

  return (
    <div
      dir={direction}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: TOKENS.surface.canvas.light,
        fontFamily: isAr ? 'Tahoma, Arial, sans-serif' : 'Inter, -apple-system, sans-serif',
        color: TOKENS.text.primary.light,
      }}
    >
      {/* Impersonation Audit Banner */}
      {isImpersonating && (
        <div
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
          <div>
            ⚠️ <strong>Impersonation Audit Active:</strong> Operating as <strong>{userName}</strong> ({userRole}).
            All mutations logged under <em>{impersonatedBy || 'Super Admin'}</em>.
          </div>
          {onExitImpersonation && (
            <Button size="sm" variant="accent" onClick={onExitImpersonation}>
              Exit Impersonation
            </Button>
          )}
        </div>
      )}

      {/* Top Application Header */}
      <header
        style={{
          height: '56px',
          backgroundColor: TOKENS.brand.primary,
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          borderBottom: `1px solid ${TOKENS.brand.secondary}`,
          zIndex: 100,
          boxShadow: TOKENS.elevation.level1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            onClick={() => onNavigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <span style={{ fontSize: '18px', fontWeight: 900, color: TOKENS.brand.accent }}>E3</span>
            <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '0.05em' }}>EOS</span>
            <Badge variant="accent" size="sm">
              {environment.toUpperCase()}
            </Badge>
          </div>
          <span style={{ fontSize: '11px', color: '#94a3b8', borderLeft: '1px solid #334155', paddingLeft: '12px' }}>
            Enterprise Event Operating System
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onCreateNew && (
            <Button size="sm" variant="accent" onClick={onCreateNew}>
              + Create
            </Button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#cbd5e1' }}>
            <span>👤</span>
            <strong>{userName}</strong>
            <span style={{ color: '#94a3b8' }}>({userRole})</span>
          </div>

          <button
            onClick={onToggleLanguage}
            id="btn-toggle-language"
            style={{
              backgroundColor: '#1e293b',
              color: TOKENS.brand.accent,
              border: `1px solid ${TOKENS.brand.accent}`,
              borderRadius: TOKENS.radius.control,
              padding: '6px 10px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {isAr ? 'English (LTR)' : 'العربية (RTL)'}
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              style={{
                backgroundColor: '#1e293b',
                color: '#f87171',
                border: '1px solid #7f1d1d',
                borderRadius: TOKENS.radius.control,
                padding: '6px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {isAr ? 'خروج' : 'Sign Out'}
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace Body */}
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        {/* Fixed 8-Destination Sidebar */}
        <aside
          style={{
            width: '256px',
            backgroundColor: TOKENS.brand.primary,
            borderRight: direction === 'ltr' ? `1px solid ${TOKENS.brand.secondary}` : 'none',
            borderLeft: direction === 'rtl' ? `1px solid ${TOKENS.brand.secondary}` : 'none',
            display: 'flex',
            flexDirection: 'column',
            padding: '16px 8px',
            gap: '4px',
            flexShrink: 0,
          }}
        >
          <div style={{ padding: '0 8px 8px 8px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            {isAr ? 'التنقل الموحد' : 'Internal Workspace'}
          </div>

          {INTERNAL_PRIMARY_NAV.map((item) => {
            const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: TOKENS.radius.control,
                  border: 'none',
                  backgroundColor: isActive ? TOKENS.brand.secondary : 'transparent',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: isAr ? 'right' : 'left',
                  transition: `all ${TOKENS.motion.fast}`,
                }}
              >
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{isAr ? item.labelAr : item.labelEn}</span>
                {item.badgeCount !== undefined && item.badgeCount > 0 && (
                  <span
                    style={{
                      padding: '2px 6px',
                      borderRadius: '10px',
                      backgroundColor: TOKENS.brand.accent,
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 800,
                    }}
                  >
                    {item.badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Content Canvas */}
        <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
};
