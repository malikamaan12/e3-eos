/**
 * EOS / Shell / FieldShell
 * Field Operations Mobile & Tablet Shell (Master Plan Section 5.4).
 * Single-thumb touch targets (>= 48px/52px), offline queue indicator, and field quick capture.
 */

import React from 'react';
import { TOKENS } from '../foundations/tokens.js';
import { Badge } from '../primitives/Badge.js';

export interface FieldShellProps {
  eventName: string;
  venueName: string;
  shiftStatus: string;
  isOffline: boolean;
  offlineQueueCount: number;
  activeTab: string;
  currentLanguage: 'en' | 'ar';
  direction: 'ltr' | 'rtl';
  onSelectTab: (tabId: string) => void;
  onQuickCapture?: () => void;
  onSyncOfflineQueue?: () => void;
  children: React.ReactNode;
}

export const FieldShell: React.FC<FieldShellProps> = ({
  eventName,
  venueName,
  shiftStatus,
  isOffline,
  offlineQueueCount,
  activeTab,
  currentLanguage,
  direction,
  onSelectTab,
  onQuickCapture,
  onSyncOfflineQueue,
  children,
}) => {
  const isAr = currentLanguage === 'ar';

  const fieldNav = [
    { id: 'today', labelEn: 'Today', labelAr: 'اليوم', icon: '📍' },
    { id: 'runsheet', labelEn: 'Run Sheet', labelAr: 'الجدول', icon: '⏱️' },
    { id: 'checklists', labelEn: 'Checklists', labelAr: 'القوائم', icon: '✅' },
    { id: 'incidents', labelEn: 'Incidents', labelAr: 'البلاغات', icon: '🚨' },
    { id: 'roster', labelEn: 'Roster', labelAr: 'الطاقم', icon: '👥' },
  ];

  return (
    <div
      dir={direction}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        fontFamily: isAr ? 'Tahoma, Arial, sans-serif' : 'Inter, -apple-system, sans-serif',
      }}
    >
      {/* Field Status Header */}
      <header
        style={{
          padding: '12px 16px',
          backgroundColor: '#090d16',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: '52px',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: TOKENS.brand.accent, textTransform: 'uppercase' }}>
            FIELD OPS • {venueName}
          </div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
            {eventName}
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Badge variant={isOffline ? 'warning' : 'success'} size="sm">
            {isOffline ? 'OFFLINE' : 'LIVE SYNC'}
          </Badge>
          {offlineQueueCount > 0 && (
            <button
              onClick={onSyncOfflineQueue}
              style={{
                backgroundColor: '#d97706',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {offlineQueueCount} queued
            </button>
          )}
        </div>
      </header>

      {/* Main Field Scrollable Content */}
      <main style={{ flex: 1, padding: '16px', overflowY: 'auto', paddingBottom: '90px' }}>
        {children}
      </main>

      {/* Primary Bottom Field Action & Navigation Bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '68px',
          backgroundColor: '#090d16',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '0 8px',
          zIndex: 100,
        }}
      >
        {fieldNav.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                minWidth: '56px',
                minHeight: '52px',
                padding: '4px',
                background: 'none',
                border: 'none',
                color: isActive ? TOKENS.brand.accent : '#94a3b8',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: isActive ? 700 : 500,
              }}
            >
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              <span>{isAr ? item.labelAr : item.labelEn}</span>
            </button>
          );
        })}

        {onQuickCapture && (
          <button
            onClick={onQuickCapture}
            style={{
              position: 'absolute',
              top: '-24px',
              right: '24px',
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: TOKENS.brand.accent,
              color: '#ffffff',
              border: '3px solid #090d16',
              boxShadow: TOKENS.elevation.level3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              cursor: 'pointer',
            }}
            title="Quick Capture / Incident"
          >
            📸
          </button>
        )}
      </div>
    </div>
  );
};
