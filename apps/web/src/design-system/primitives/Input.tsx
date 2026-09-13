/**
 * EOS / Primitive / Input
 * Conforms to Master Plan Section 6.1 and Section 11 (Forms & Validation).
 */

import React from 'react';
import { TOKENS } from '../foundations/tokens.js';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  prefixElement?: React.ReactNode;
  suffixElement?: React.ReactNode;
  requiredIndicator?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  prefixElement,
  suffixElement,
  requiredIndicator = false,
  style,
  id,
  disabled,
  ...props
}) => {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
      {label && (
        <label
          htmlFor={inputId}
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
          transition: `border-color ${TOKENS.motion.fast}, box-shadow ${TOKENS.motion.fast}`,
          overflow: 'hidden',
        }}
      >
        {prefixElement && (
          <span
            style={{
              padding: '0 10px',
              backgroundColor: TOKENS.surface.sunken.light,
              borderRight: `1px solid ${TOKENS.border.default.light}`,
              color: TOKENS.text.secondary.light,
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              height: '100%',
              userSelect: 'none',
            }}
          >
            {prefixElement}
          </span>
        )}

        <input
          id={inputId}
          disabled={disabled}
          style={{
            flex: 1,
            height: '100%',
            padding: '0 12px',
            fontSize: '13px',
            color: TOKENS.text.primary.light,
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            fontFamily: 'inherit',
            ...style,
          }}
          {...props}
        />

        {suffixElement && (
          <span
            style={{
              padding: '0 10px',
              backgroundColor: TOKENS.surface.sunken.light,
              borderLeft: `1px solid ${TOKENS.border.default.light}`,
              color: TOKENS.text.secondary.light,
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              height: '100%',
              userSelect: 'none',
            }}
          >
            {suffixElement}
          </span>
        )}
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
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  requiredIndicator?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  hint,
  requiredIndicator = false,
  style,
  id,
  disabled,
  ...props
}) => {
  const textareaId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
      {label && (
        <label
          htmlFor={textareaId}
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
          {requiredIndicator && <span style={{ color: '#dc2626' }}>*</span>}
        </label>
      )}

      <textarea
        id={textareaId}
        disabled={disabled}
        style={{
          width: '100%',
          minHeight: '80px',
          padding: '8px 12px',
          fontSize: '13px',
          color: TOKENS.text.primary.light,
          backgroundColor: disabled ? TOKENS.surface.sunken.light : '#ffffff',
          border: `1px solid ${error ? '#dc2626' : TOKENS.border.default.light}`,
          borderRadius: TOKENS.radius.control,
          outline: 'none',
          boxSizing: 'border-box',
          fontFamily: 'inherit',
          ...style,
        }}
        {...props}
      />

      {error ? (
        <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 500 }}>{error}</span>
      ) : hint ? (
        <span style={{ fontSize: '12px', color: TOKENS.text.muted.light }}>{hint}</span>
      ) : null}
    </div>
  );
};
