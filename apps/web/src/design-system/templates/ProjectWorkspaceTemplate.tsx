/**
 * EOS / Template / ProjectWorkspaceTemplate
 * Standard Project Workspace Template (Master Plan Section 5.2 & Section 8.3).
 * Renders the standardized Project Header and the 11 permission-aware project modules.
 */

import React from 'react';
import { TOKENS } from '../foundations/tokens.js';
import { Badge, BadgeProps } from '../primitives/Badge.js';

export interface ProjectNavModule {
  id: string;
  labelEn: string;
  labelAr: string;
  icon: string;
  badgeCount?: number;
}

export const PROJECT_MODULE_GROUPS: ProjectNavModule[] = [
  { id: 'overview', labelEn: 'Overview', labelAr: 'نظرة عامة', icon: '📊' },
  { id: 'requirements', labelEn: 'Requirements & RFI', labelAr: 'المتطلبات والاستفسارات', icon: '📋' },
  { id: 'timeline', labelEn: 'Plan & Schedule (CPM)', labelAr: 'الجدول الزمني', icon: '⏱️' },
  { id: 'design', labelEn: 'Creative & Approvals', labelAr: 'التصميم والاعتماد', icon: '🎨' },
  { id: 'commercial', labelEn: 'Commercial & BOQ', labelAr: 'المالية وجداول الكميات', icon: '💰' },
  { id: 'documents', labelEn: 'Controlled Documents', labelAr: 'المستندات الموثقة', icon: '📑' },
  { id: 'operations', labelEn: 'People & Operations', labelAr: 'الفرق والعمليات', icon: '👥' },
  { id: 'live', labelEn: 'Live / Field Ops', labelAr: 'العمليات الميدانية الحية', icon: '📡' },
  { id: 'client-portal', labelEn: 'Client Portal', labelAr: 'بوابة العميل', icon: '🤝' },
  { id: 'closeout', labelEn: 'Closeout & Lessons', labelAr: 'الإغلاق والدروس المستفادة', icon: '🏁' },
  { id: 'audit', labelEn: 'Configuration & Audit', labelAr: 'الإعدادات والتدقيق', icon: '📜' },
];

export interface ProjectWorkspaceTemplateProps {
  projectCode: string;
  projectName: string;
  clientName: string;
  stageName: string;
  health: { label: string; variant: BadgeProps['variant'] };
  deliveryDates: string;
  ownerName: string;
  country: string;
  activeModuleId: string;
  currentLanguage: 'en' | 'ar';
  onSelectModule: (moduleId: string) => void;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const ProjectWorkspaceTemplate: React.FC<ProjectWorkspaceTemplateProps> = ({
  projectCode,
  projectName,
  clientName,
  stageName,
  health,
  deliveryDates,
  ownerName,
  country,
  activeModuleId,
  currentLanguage,
  onSelectModule,
  headerActions,
  children,
  style,
}) => {
  const isAr = currentLanguage === 'ar';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        maxWidth: '1600px',
        margin: '0 auto',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {/* 1. Persistent Project Workspace Header */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: `1px solid ${TOKENS.border.default.light}`,
          borderRadius: TOKENS.radius.card,
          padding: '20px 24px',
          boxShadow: TOKENS.elevation.level1,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px', color: TOKENS.brand.accent }}>
                {projectCode}
              </span>
              <Badge variant={health.variant} size="sm">
                {health.label}
              </Badge>
              <Badge variant="primary" size="sm">
                {stageName}
              </Badge>
              <span style={{ fontSize: '12px', color: TOKENS.text.secondary.light }}>
                📍 {country}
              </span>
            </div>

            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: TOKENS.text.primary.light }}>
              {projectName}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', fontSize: '12px', color: TOKENS.text.secondary.light, flexWrap: 'wrap' }}>
              <span>🏛️ Client: <strong>{clientName}</strong></span>
              <span>📅 Delivery: <strong>{deliveryDates}</strong></span>
              <span>👤 Lead: <strong>{ownerName}</strong></span>
            </div>
          </div>

          {headerActions && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {headerActions}
            </div>
          )}
        </div>

        {/* 2. 11-Module Navigation Tabs with Horizontal Scroll & Chevron Support */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: `1px solid ${TOKENS.border.subtle.light}`,
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {PROJECT_MODULE_GROUPS.map((mod) => {
            const isActive = activeModuleId === mod.id;
            return (
              <button
                key={mod.id}
                onClick={() => onSelectModule(mod.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: TOKENS.radius.control,
                  border: `1px solid ${isActive ? TOKENS.brand.accent : 'transparent'}`,
                  backgroundColor: isActive ? TOKENS.brand.accentSubtle : 'transparent',
                  color: isActive ? TOKENS.brand.accentHover : TOKENS.text.secondary.light,
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: `all ${TOKENS.motion.fast}`,
                }}
              >
                <span>{mod.icon}</span>
                <span>{isAr ? mod.labelAr : mod.labelEn}</span>
                {mod.badgeCount !== undefined && mod.badgeCount > 0 && (
                  <span
                    style={{
                      padding: '1px 6px',
                      borderRadius: '10px',
                      backgroundColor: TOKENS.brand.accent,
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 700,
                    }}
                  >
                    {mod.badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Module Content Workspace */}
      <div>{children}</div>
    </div>
  );
};
