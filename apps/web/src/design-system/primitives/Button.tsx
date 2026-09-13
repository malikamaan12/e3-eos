/**
 * EOS / Primitive / Button
 * Conforms to Master Plan Section 6.1 and Section 7 Standard Properties.
 */

import React from 'react';
import { TOKENS } from '../foundations/tokens.js';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'accent' | 'danger' | 'success' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'field';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  style,
  disabled,
  ...props
}) => {
  const baseStyle: React.CSSProperties = {
    display: fullWidth ? 'flex' : 'inline-flex',
    width: fullWidth ? '100%' : 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: 600,
    borderRadius: TOKENS.radius.control,
    border: '1px solid transparent',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: disabled || isLoading ? 0.6 : 1,
    transition: `all ${TOKENS.motion.fast}`,
    fontFamily: 'inherit',
    lineHeight: 1,
    whiteSpace: 'nowrap',
    outline: 'none',
    boxSizing: 'border-box',
    userSelect: 'none',
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '0 12px', fontSize: '12px', height: TOKENS.controlHeight.compact },
    md: { padding: '0 16px', fontSize: '13px', height: TOKENS.controlHeight.standard },
    lg: { padding: '0 20px', fontSize: '14px', height: TOKENS.controlHeight.comfortable },
    field: { padding: '0 24px', fontSize: '16px', height: TOKENS.controlHeight.fieldPrimary, minHeight: '52px' },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: TOKENS.brand.primary,
      color: '#ffffff',
      borderColor: TOKENS.brand.primary,
      boxShadow: TOKENS.elevation.level1,
    },
    accent: {
      backgroundColor: TOKENS.brand.accent,
      color: '#ffffff',
      borderColor: TOKENS.brand.accentHover,
      boxShadow: '0 1px 2px rgba(217, 119, 6, 0.25)',
    },
    secondary: {
      backgroundColor: '#ffffff',
      color: TOKENS.text.primary.light,
      borderColor: TOKENS.border.default.light,
      boxShadow: TOKENS.elevation.level1,
    },
    tertiary: {
      backgroundColor: TOKENS.surface.sunken.light,
      color: TOKENS.text.secondary.light,
      borderColor: 'transparent',
    },
    danger: {
      backgroundColor: '#dc2626',
      color: '#ffffff',
      borderColor: '#b91c1c',
      boxShadow: '0 1px 2px rgba(220, 38, 38, 0.2)',
    },
    success: {
      backgroundColor: '#059669',
      color: '#ffffff',
      borderColor: '#047857',
      boxShadow: '0 1px 2px rgba(5, 150, 105, 0.2)',
    },
    outline: {
      backgroundColor: 'transparent',
      color: TOKENS.text.primary.light,
      borderColor: TOKENS.border.strong.light,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: TOKENS.text.secondary.light,
      borderColor: 'transparent',
    },
  };

  return (
    <button
      style={{
        ...baseStyle,
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span
          style={{
            display: 'inline-block',
            width: '14px',
            height: '14px',
            border: '2px solid currentColor',
            borderRightColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
          }}
        />
      ) : (
        leftIcon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>{rightIcon}</span>
      )}
    </button>
  );
};
