/**
 * EOS / Governance / ControlledRecordHeader
 * Conforms to Master Plan Section 16 (Traceability and Audit UX).
 */

import React from 'react';
import { TOKENS } from '../foundations/tokens.js';
import { Badge, BadgeProps } from '../primitives/Badge.js';
import { Button } from '../primitives/Button.js';
import { LinkageBar, LinkageBarProps } from './LinkageBar.js';

export interface ControlledRecordHeaderProps {
  recordId: string;
  title: string;
  projectCode: string;
  moduleName: string;
  status: { label: string; variant: BadgeProps['variant'] };
  owner: { name: string; email?: string };
  revision: string;
  effectiveDate: string;
  approvalState?: string;
  traceabilityPoints?: LinkageBarProps['points'];
  onOpenAuditHistory?: () => void;
  actions?: React.ReactNode;
  style?: React.CSSProperties;
}

export const ControlledRecordHeader: React.FC<ControlledRecordHeaderProps> = ({
  recordId,
  title,
  projectCode,
  moduleName,
  status,
  owner,
  revision,
  effectiveDate,
  approvalState,
  traceabilityPoints,
  onOpenAuditHistory,
  actions,
  style,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '20px',
        backgroundColor: '#ffffff',
        border: `1px solid ${TOKENS.border.default.light}`,
        borderRadius: TOKENS.radius.card,
        boxShadow: TOKENS.elevation.level1,
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: TOKENS.text.muted.light,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {projectCode} • {moduleName}
            </span>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '11px',
                fontWeight: 700,
                color: TOKENS.brand.accent,
                backgroundColor: TOKENS.surface.sunken.light,
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              {recordId}
            </span>
            <Badge variant={status.variant} size="sm">
              {status.label}
            </Badge>
            {approvalState && (
              <Badge variant="purple" size="sm">
                {approvalState}
              </Badge>
            )}
          </div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: TOKENS.text.primary.light }}>
            {title}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', fontSize: '12px', color: TOKENS.text.secondary.light, flexWrap: 'wrap' }}>
            <span>👤 Owner: <strong>{owner.name}</strong></span>
            <span>🏷️ Rev: <strong>{revision}</strong></span>
            <span>📅 Effective: <strong>{effectiveDate}</strong></span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onOpenAuditHistory && (
            <Button size="sm" variant="secondary" onClick={onOpenAuditHistory}>
              📜 Audit History
            </Button>
          )}
          {actions}
        </div>
      </div>

      {traceabilityPoints && (
        <LinkageBar points={traceabilityPoints} />
      )}
    </div>
  );
};
