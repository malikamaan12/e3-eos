/**
 * E3-EOS Unified Design System — EosStatusBadge
 * Conforms strictly to E3-EOS Global UI Component Rules (Sections 12, 26).
 */

import React from 'react';
import { TOKENS, EosTone, EosCommonProps } from '../foundations/tokens.js';

export interface EosStatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement>, EosCommonProps {
  tone?: EosTone;
  showDot?: boolean;
  icon?: React.ReactNode;
}

export const EosStatusBadge: React.FC<EosStatusBadgeProps> = ({
  tone = 'neutral',
  showDot = false,
  icon,
  testId,
  style,
  children,
  ...props
}) => {
  const toneMap: Record<EosTone, { fg: string; bg: string; border: string }> = {
    info: {
      fg: '#3B82F6',
      bg: 'rgba(59,130,246,.14)',
      border: 'rgba(59,130,246,.3)',
    },
    success: {
      fg: '#22C55E',
      bg: 'rgba(34,197,94,.14)',
      border: 'rgba(34,197,94,.3)',
    },
    warning: {
      fg: '#F59E0B',
      bg: 'rgba(245,158,11,.14)',
      border: 'rgba(245,158,11,.3)',
    },
    risk: {
      fg: '#F97316',
      bg: 'rgba(249,115,22,.14)',
      border: 'rgba(249,115,22,.3)',
    },
    critical: {
      fg: '#EF4444',
      bg: 'rgba(239,68,68,.14)',
      border: 'rgba(239,68,68,.3)',
    },
    neutral: {
      fg: '#94A3B8',
      bg: 'rgba(148,163,184,.14)',
      border: 'rgba(148,163,184,.3)',
    },
    'ai-suggestion': {
      fg: '#8B5CF6',
      bg: 'rgba(139,92,246,.14)',
      border: 'rgba(139,92,246,.3)',
    },
  };

  const currentTone = toneMap[tone] || toneMap.neutral;

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    height: '24px',
    padding: '0 8px',
    fontSize: '12px',
    fontWeight: 600,
    lineHeight: '1',
    borderRadius: TOKENS.radius.pill,
    color: currentTone.fg,
    backgroundColor: currentTone.bg,
    border: `1px solid ${currentTone.border}`,
    boxSizing: 'border-box',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    ...style,
  };

  const dotStyle: React.CSSProperties = {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: currentTone.fg,
    flexShrink: 0,
  };

  return (
    <span data-testid={testId} style={badgeStyle} {...props}>
      {showDot && <span style={dotStyle} aria-hidden="true" />}
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
