/**
 * EOS / Primitive / Badge
 * Conforms to Master Plan Section 6.1 and Section 14 (Accessibility: status paired with icon/text).
 */

import React from 'react';
import { TOKENS } from '../foundations/tokens.js';

export interface BadgeProps {
  variant?: 'neutral' | 'info' | 'success' | 'warning' | 'risk' | 'critical' | 'purple' | 'accent' | 'secondary' | 'primary' | 'danger';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'sm',
  icon,
  children,
  style: customStyle,
}) => {
  const variantMap: Record<string, { bg: string; text: string; border: string }> = {
    neutral: TOKENS.status.neutral,
    secondary: TOKENS.status.neutral,
    primary: TOKENS.status.info,
    info: TOKENS.status.info,
    success: TOKENS.status.success,
    warning: TOKENS.status.warning,
    risk: TOKENS.status.risk,
    critical: TOKENS.status.critical,
    danger: TOKENS.status.critical,
    purple: TOKENS.status.purple,
    accent: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
  };

  const currentTheme = variantMap[variant] || variantMap.neutral;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
        fontSize: size === 'sm' ? '11px' : '12px',
        fontWeight: 600,
        borderRadius: TOKENS.radius.control,
        backgroundColor: currentTheme.bg,
        color: currentTheme.text,
        border: `1px solid ${currentTheme.border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
        userSelect: 'none',
        ...customStyle,
      }}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
