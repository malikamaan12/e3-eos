/**
 * EOS / Data / KPICard & MetricStrip
 * Conforms to Master Plan Section 6.3 (Data Display) and Section 12 (High-Density Data).
 */

import React from 'react';
import { TOKENS } from '../foundations/tokens.js';
import { Badge, BadgeProps } from '../primitives/Badge.js';

export interface KPICardProps {
  title?: string;
  label?: string;
  value: string | number;
  subtitle?: string;
  subtext?: string;
  change?: string;
  delta?: { text: string; isPositive: boolean };
  trend?: 'positive' | 'negative' | 'neutral' | 'up' | 'down' | string;
  trendDirection?: 'up' | 'down';
  badge?: { label: string; variant: BadgeProps['variant'] };
  accentColor?: string;
  isConfidential?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  label,
  value,
  subtitle,
  subtext,
  change,
  delta,
  trend,
  trendDirection,
  badge,
  accentColor,
  isConfidential = false,
  onClick,
  style,
}) => {
  const displayLabel = title || label || 'KPI Metric';
  const displaySubtext = subtitle || subtext;

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: 'var(--surface-1, #ffffff)',
        border: `1px solid var(--border-default, ${TOKENS.border.default.light})`,
        borderRadius: TOKENS.radius.card,
        padding: '16px 20px',
        boxShadow: TOKENS.elevation.level1,
        borderTop: accentColor ? `3px solid ${accentColor}` : undefined,
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        position: 'relative',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-secondary, #64748b)',
          }}
        >
          {displayLabel}
        </span>
        {badge && (
          <Badge variant={badge.variant} size="sm">
            {badge.label}
          </Badge>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        {isConfidential ? (
          <span
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--text-muted, #94a3b8)',
              backgroundColor: 'var(--surface-inset, #f1f5f9)',
              padding: '2px 8px',
              borderRadius: TOKENS.radius.control,
            }}
            title="Commercial data masked per role permission"
          >
            CONFIDENTIAL •••
          </span>
        ) : (
          <span
            style={{
              fontSize: '26px',
              fontWeight: 800,
              color: 'var(--text-primary, #0f172a)',
              lineHeight: 1.15,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {value}
          </span>
        )}

        {delta && (
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: delta.isPositive ? '#059669' : '#dc2626',
            }}
          >
            {delta.isPositive ? '▲' : '▼'} {delta.text}
          </span>
        )}

        {change && !delta && (
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color:
                trend === 'positive' || trendDirection === 'up'
                  ? '#059669'
                  : trend === 'negative' || trendDirection === 'down'
                  ? '#dc2626'
                  : 'var(--text-secondary, #64748b)',
            }}
          >
            {change}
          </span>
        )}
      </div>

      {displaySubtext && (
        <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
          {displaySubtext}
        </span>
      )}
    </div>
  );
};

export interface MetricStripProps {
  children: React.ReactNode;
  columns?: number;
  style?: React.CSSProperties;
}

export const MetricStrip: React.FC<MetricStripProps> = ({ children, columns, style }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: columns ? `repeat(${columns}, 1fr)` : 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        width: '100%',
        ...style,
      }}
    >
      {children}
    </div>
  );
};
