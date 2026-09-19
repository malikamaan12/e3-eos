/**
 * E3-EOS Unified Design System — EosButton
 * Conforms strictly to E3-EOS Global UI Component Rules (Sections 8, 26).
 */

import React from 'react';
import { TOKENS, EosCommonProps } from '../foundations/tokens.js';

export type EosButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'ghost'
  | 'destructive'
  | 'success'
  | 'icon-only';

export type EosButtonSize = 'sm' | 'md' | 'lg' | 'field';

export interface EosButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    EosCommonProps {
  variant?: EosButtonVariant;
  size?: EosButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const EosButton = React.forwardRef<HTMLButtonElement, EosButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loading,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      readOnly,
      testId,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const isActuallyLoading = isLoading || loading;
    const isActuallyDisabled = disabled || readOnly || isActuallyLoading;

    // Dimensions per Section 8.2 & Section 1 (minimum touch target 44px)
    const sizeMap: Record<EosButtonSize, React.CSSProperties> = {
      sm: {
        height: '32px',
        minHeight: '32px',
        padding: '0 12px',
        fontSize: '13px',
      },
      md: {
        height: '40px',
        minHeight: '40px',
        padding: '0 16px',
        fontSize: '14px',
      },
      lg: {
        height: '48px',
        minHeight: '48px',
        padding: '0 20px',
        fontSize: '15px',
      },
      field: {
        height: '52px',
        minHeight: '52px',
        padding: '0 20px',
        fontSize: '16px',
      },
    };

    // Variants per Section 8.1
    const variantStyles: Record<EosButtonVariant, React.CSSProperties> = {
      primary: {
        backgroundColor: TOKENS.brand.accent,
        color: '#ffffff',
        border: `1px solid ${TOKENS.brand.accentHover}`,
        boxShadow: '0 1px 2px rgba(217, 119, 6, 0.25)',
      },
      secondary: {
        backgroundColor: 'var(--surface-2, #151E2E)',
        color: 'var(--text-primary, #F8FAFC)',
        border: '1px solid var(--border-default, #2A374B)',
      },
      tertiary: {
        backgroundColor: 'transparent',
        color: 'var(--text-secondary, #CBD5E1)',
        border: '1px solid var(--border-subtle, #1D2939)',
      },
      ghost: {
        backgroundColor: 'transparent',
        color: 'var(--text-secondary, #CBD5E1)',
        border: '1px solid transparent',
      },
      destructive: {
        backgroundColor: '#EF4444',
        color: '#ffffff',
        border: '1px solid #DC2626',
        boxShadow: '0 1px 2px rgba(239, 68, 68, 0.25)',
      },
      success: {
        backgroundColor: '#22C55E',
        color: '#ffffff',
        border: '1px solid #16A34A',
        boxShadow: '0 1px 2px rgba(34, 197, 94, 0.25)',
      },
      'icon-only': {
        backgroundColor: 'transparent',
        color: 'var(--text-secondary, #CBD5E1)',
        border: '1px solid transparent',
        padding: '0',
        width: size === 'sm' ? '32px' : size === 'lg' ? '48px' : size === 'field' ? '52px' : '40px',
      },
    };

    const baseStyle: React.CSSProperties = {
      display: fullWidth ? 'flex' : 'inline-flex',
      width: fullWidth ? '100%' : 'auto',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontWeight: 600,
      lineHeight: '1',
      fontFamily: 'inherit',
      borderRadius: TOKENS.radius.md,
      cursor: isActuallyDisabled ? 'not-allowed' : 'pointer',
      opacity: isActuallyDisabled ? 0.55 : 1,
      transition: 'background-color 120ms ease, border-color 120ms ease, color 120ms ease, transform 120ms ease',
      outline: 'none',
      userSelect: 'none',
      whiteSpace: 'nowrap',
      boxSizing: 'border-box',
      ...sizeMap[size],
      ...variantStyles[variant],
      ...style,
    };

    return (
      <button
        ref={ref}
        data-testid={testId}
        disabled={isActuallyDisabled}
        aria-busy={isActuallyLoading}
        style={baseStyle}
        {...props}
      >
        {isActuallyLoading && (
          <span
            style={{
              display: 'inline-block',
              width: '14px',
              height: '14px',
              border: '2px solid currentColor',
              borderRightColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
              flexShrink: 0,
            }}
          />
        )}
        {!isActuallyLoading && leftIcon && (
          <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
            {leftIcon}
          </span>
        )}
        <span>{children}</span>
        {!isActuallyLoading && rightIcon && (
          <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

EosButton.displayName = 'EosButton';
