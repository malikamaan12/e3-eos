/**
 * E3-EOS Unified Design System — EosFormField
 * Conforms strictly to E3-EOS Global UI Component Rules (Sections 9, 26).
 */

import React from 'react';
import { EosCommonProps } from '../foundations/tokens.js';

export interface EosFormFieldProps extends EosCommonProps {
  id: string;
  label: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  unitIndicator?: string;
  charCount?: { current: number; max: number };
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const EosFormField: React.FC<EosFormFieldProps> = ({
  id,
  label,
  helperText,
  error,
  required = false,
  unitIndicator,
  charCount,
  children,
  style,
  testId,
}) => {
  return (
    <div
      data-testid={testId}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {/* Label Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '13px',
          lineHeight: '18px',
        }}
      >
        <label
          htmlFor={id}
          style={{
            fontWeight: 600,
            color: 'var(--text-primary, #F8FAFC)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>{label}</span>
          {required && (
            <span style={{ color: '#EF4444', fontWeight: 700 }} aria-hidden="true">
              *
            </span>
          )}
        </label>

        {unitIndicator && (
          <span style={{ fontSize: '12px', color: 'var(--text-muted, #94A3B8)' }}>
            {unitIndicator}
          </span>
        )}
      </div>

      {/* Helper text if before control */}
      {helperText && !error && (
        <p
          id={`${id}-helper`}
          style={{
            fontSize: '12px',
            lineHeight: '16px',
            color: 'var(--text-muted, #94A3B8)',
            margin: 0,
          }}
        >
          {helperText}
        </p>
      )}

      {/* Control Slot */}
      <div style={{ width: '100%' }}>{children}</div>

      {/* Error Row / Char count */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: error || charCount ? '18px' : '0px',
        }}
      >
        {error ? (
          <p
            id={`${id}-error`}
            role="alert"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              lineHeight: '16px',
              color: '#EF4444',
              margin: 0,
              fontWeight: 500,
            }}
          >
            <span aria-hidden="true">⚠️</span>
            <span>{error}</span>
          </p>
        ) : <span />}

        {charCount && (
          <span
            style={{
              fontSize: '11px',
              color: charCount.current > charCount.max ? '#EF4444' : 'var(--text-muted, #94A3B8)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {charCount.current} / {charCount.max}
          </span>
        )}
      </div>
    </div>
  );
};
