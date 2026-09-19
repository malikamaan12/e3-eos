/**
 * E3-EOS Unified Design System — EosToast, EosInlineAlert & EosBanner
 * Conforms strictly to E3-EOS Global UI Component Rules (Sections 15, 26).
 */

import React, { useEffect } from 'react';
import { TOKENS, EosTone, EosCommonProps } from '../foundations/tokens.js';

export interface EosToastProps extends EosCommonProps {
  id: string;
  message: string;
  tone?: EosTone;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss: (id: string) => void;
  durationMs?: number; // default 5000ms
}

export const EosToast: React.FC<EosToastProps> = ({
  id,
  message,
  tone = 'neutral',
  action,
  onDismiss,
  durationMs = 5000,
  testId,
}) => {
  // Errors remain until dismissed; other tones auto-dismiss after 4-6s
  useEffect(() => {
    if (tone === 'critical') return;

    const timer = setTimeout(() => {
      onDismiss(id);
    }, durationMs);

    return () => clearTimeout(timer);
  }, [id, tone, durationMs, onDismiss]);

  const toneColors: Record<EosTone, { border: string; icon: string }> = {
    info: { border: '#3B82F6', icon: 'ℹ️' },
    success: { border: '#22C55E', icon: '✅' },
    warning: { border: '#F59E0B', icon: '⚠️' },
    risk: { border: '#F97316', icon: '⚡' },
    critical: { border: '#EF4444', icon: '🚨' },
    neutral: { border: '#94A3B8', icon: '🔔' },
    'ai-suggestion': { border: '#8B5CF6', icon: '✨' },
  };

  const current = toneColors[tone] || toneColors.neutral;

  return (
    <div
      role="status"
      data-testid={testId}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: TOKENS.radius.md,
        backgroundColor: 'var(--surface-2, #151E2E)',
        color: 'var(--text-primary, #F8FAFC)',
        borderLeft: `4px solid ${current.border}`,
        boxShadow: TOKENS.elevation.level2,
        minWidth: '320px',
        maxWidth: '480px',
        fontSize: '13px',
        lineHeight: '18px',
        boxSizing: 'border-box',
        animation: 'eosToastEnter 180ms cubic-bezier(0.2, 0, 0, 1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span aria-hidden="true">{current.icon}</span>
        <span>{message}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            style={{
              background: 'transparent',
              border: 'none',
              color: TOKENS.brand.accent,
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              padding: '2px 4px',
              textDecoration: 'underline',
            }}
          >
            {action.label}
          </button>
        )}
        <button
          type="button"
          onClick={() => onDismiss(id)}
          aria-label="Dismiss"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted, #94A3B8)',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '2px',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export interface EosInlineAlertProps extends EosCommonProps {
  title?: string;
  message: string;
  tone?: 'info' | 'success' | 'warning' | 'critical';
  style?: React.CSSProperties;
}

export const EosInlineAlert: React.FC<EosInlineAlertProps> = ({
  title,
  message,
  tone = 'info',
  testId,
  style,
}) => {
  const toneMap = {
    info: { bg: 'rgba(59,130,246,.14)', text: '#3B82F6', border: '#3B82F6', icon: 'ℹ️' },
    success: { bg: 'rgba(34,197,94,.14)', text: '#22C55E', border: '#22C55E', icon: '✅' },
    warning: { bg: 'rgba(245,158,11,.14)', text: '#F59E0B', border: '#F59E0B', icon: '⚠️' },
    critical: { bg: 'rgba(239,68,68,.14)', text: '#EF4444', border: '#EF4444', icon: '🚨' },
  };

  const current = toneMap[tone];

  return (
    <div
      role={tone === 'critical' ? 'alert' : 'region'}
      data-testid={testId}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '12px 16px',
        borderRadius: TOKENS.radius.md,
        backgroundColor: current.bg,
        border: `1px solid ${current.border}`,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <span style={{ fontSize: '16px', lineHeight: 1 }} aria-hidden="true">
        {current.icon}
      </span>
      <div>
        {title && (
          <h4
            style={{
              margin: '0 0 4px',
              fontSize: '13px',
              fontWeight: 600,
              color: current.text,
            }}
          >
            {title}
          </h4>
        )}
        <p style={{ margin: 0, fontSize: '13px', lineHeight: '18px', color: 'var(--text-primary, #F8FAFC)' }}>
          {message}
        </p>
      </div>
    </div>
  );
};
