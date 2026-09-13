/**
 * EOS / Primitive / Select
 * Conforms to Master Plan Section 6.1 and Section 11 (Forms & Validation).
 */

import React from 'react';
import { TOKENS } from '../foundations/tokens.js';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: SelectOption[];
  requiredIndicator?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  hint,
  options,
  children,
  requiredIndicator = false,
  style,
  id,
  disabled,
  ...props
}) => {
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
      {label && (
        <label
          htmlFor={selectId}
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: TOKENS.text.primary.light,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>{label}</span>
          {requiredIndicator && <span style={{ color: '#dc2626' }} title="Required field">*</span>}
        </label>
      )}

      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: disabled ? TOKENS.surface.sunken.light : '#ffffff',
          border: `1px solid ${error ? '#dc2626' : TOKENS.border.default.light}`,
          borderRadius: TOKENS.radius.control,
          height: TOKENS.controlHeight.standard,
          boxShadow: TOKENS.elevation.level1,
          overflow: 'hidden',
        }}
      >
        <select
          id={selectId}
          disabled={disabled}
          style={{
            width: '100%',
            height: '100%',
            padding: '0 32px 0 12px',
            fontSize: '13px',
            color: TOKENS.text.primary.light,
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            appearance: 'none',
            fontFamily: 'inherit',
            ...style,
          }}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <span
          style={{
            position: 'absolute',
            right: '12px',
            pointerEvents: 'none',
            fontSize: '10px',
            color: TOKENS.text.muted.light,
          }}
        >
          ▼
        </span>
      </div>

      {error ? (
        <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 500 }}>
          {error}
        </span>
      ) : hint ? (
        <span style={{ fontSize: '12px', color: TOKENS.text.muted.light }}>
          {hint}
        </span>
      ) : null}
    </div>
  );
};
