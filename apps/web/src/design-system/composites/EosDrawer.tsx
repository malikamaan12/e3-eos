/**
 * E3-EOS Unified Design System — EosDrawer
 * Conforms strictly to E3-EOS Global UI Component Rules (Sections 14.2, 24, 26).
 */

import React, { useEffect, useRef } from 'react';
import { TOKENS, EosCommonProps } from '../foundations/tokens.js';

export interface EosDrawerProps extends EosCommonProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  width?: number; // default 480px, bounded 420-560px
  children: React.ReactNode;
  footer?: React.ReactNode;
  direction?: 'ltr' | 'rtl';
}

export const EosDrawer: React.FC<EosDrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  width = 480,
  children,
  footer,
  direction = 'ltr',
  testId,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const clampedWidth = Math.min(Math.max(width, 420), 560);
  const isRtl = direction === 'rtl';

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="eos-drawer-title"
      data-testid={testId}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 950,
        display: 'flex',
        justifyContent: isRtl ? 'flex-start' : 'flex-end',
        backgroundColor: TOKENS.surface.overlay.dark,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={drawerRef}
        style={{
          width: '100%',
          maxWidth: `${clampedWidth}px`,
          height: '100%',
          backgroundColor: 'var(--surface-1, #0F1624)',
          borderLeft: isRtl ? 'none' : '1px solid var(--border-default, #2A374B)',
          borderRight: isRtl ? '1px solid var(--border-default, #2A374B)' : 'none',
          boxShadow: TOKENS.elevation.level3,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'transform 240ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Sticky Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle, #1D2939)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            backgroundColor: 'var(--surface-1, #0F1624)',
            flexShrink: 0,
          }}
        >
          <div>
            <h2
              id="eos-drawer-title"
              style={{
                margin: 0,
                fontSize: '18px',
                lineHeight: '26px',
                fontWeight: 600,
                color: 'var(--text-primary, #F8FAFC)',
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: '13px',
                  lineHeight: '18px',
                  color: 'var(--text-muted, #94A3B8)',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #94A3B8)',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '4px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {children}
        </div>

        {/* Sticky Footer */}
        {footer && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border-subtle, #1D2939)',
              backgroundColor: 'var(--surface-inset, #0B111D)',
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
