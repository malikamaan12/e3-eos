/**
 * EOS / Shell / ClientPortalShell
 * External Client Collaboration Portal Shell (Master Plan Section 5.3).
 * STRICT COMMERCIAL ISOLATION: Guarantees zero internal margin or supplier comparison leakage.
 */

import React from 'react';
import { TOKENS } from '../foundations/tokens.js';
import { Badge } from '../primitives/Badge.js';

export interface ClientPortalShellProps {
  clientName: string;
  projectName: string;
  projectCode: string;
  currentLanguage: 'en' | 'ar';
  direction: 'ltr' | 'rtl';
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onToggleLanguage: () => void;
  children: React.ReactNode;
}

export const ClientPortalShell: React.FC<ClientPortalShellProps> = ({
  clientName,
  projectName,
  projectCode,
  currentLanguage,
  direction,
  activeTab,
  onSelectTab,
  onToggleLanguage,
  children,
}) => {
  const isAr = currentLanguage === 'ar';

  const clientNav = [
    { id: 'overview', labelEn: 'Overview', labelAr: 'نظرة عامة', icon: '🏛️' },
    { id: 'requests', labelEn: 'Requests & Scope', labelAr: 'الطلبات والنطاق', icon: '📝' },
    { id: 'reviews', labelEn: 'Reviews & Approvals', labelAr: 'المراجعات والاعتماد', icon: '✍️' },
    { id: 'documents', labelEn: 'Approved Documents', labelAr: 'المستندات المعتمدة', icon: '📑' },
    { id: 'schedule', labelEn: 'Milestone Schedule', labelAr: 'جدول المعالم', icon: '📅' },
    { id: 'messages', labelEn: 'Messages & RFI', labelAr: 'الرسائل والاستفسارات', icon: '💬' },
  ];

  return (
    <div
      dir={direction}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        fontFamily: isAr ? 'Tahoma, Arial, sans-serif' : 'Inter, -apple-system, sans-serif',
        color: TOKENS.text.primary.light,
      }}
    >
      {/* Protected External Banner */}
      <header
        style={{
          height: '60px',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          borderBottom: '2px solid #2563eb',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#60a5fa' }}>E3</span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>Client Collaboration Portal</span>
          <Badge variant="info" size="sm">
            CONFIDENTIAL CLIENT VIEW
          </Badge>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
            Operating for: <strong>{clientName}</strong>
          </div>
          <button
            onClick={onToggleLanguage}
            style={{
              backgroundColor: '#1e293b',
              color: '#60a5fa',
              border: '1px solid #3b82f6',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {isAr ? 'English' : 'العربية'}
          </button>
        </div>
      </header>

      {/* Project Context Header */}
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '16px 24px',
          borderBottom: `1px solid ${TOKENS.border.default.light}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: TOKENS.text.muted.light }}>
            PROJECT REFERENCE: {projectCode}
          </div>
          <h2 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: 800, color: TOKENS.text.primary.light }}>
            {projectName}
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {clientNav.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: TOKENS.radius.control,
                  border: `1px solid ${isActive ? '#2563eb' : TOKENS.border.default.light}`,
                  backgroundColor: isActive ? '#eff6ff' : '#ffffff',
                  color: isActive ? '#1d4ed8' : TOKENS.text.secondary.light,
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                <span>{item.icon}</span>
                <span>{isAr ? item.labelAr : item.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      <main style={{ flex: 1, padding: '24px 32px' }}>{children}</main>
    </div>
  );
};
