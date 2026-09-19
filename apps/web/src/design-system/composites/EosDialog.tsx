/**
 * E3-EOS Unified Design System — EosDialog & EosDestructiveDialog
 * Conforms strictly to E3-EOS Global UI Component Rules (Sections 14.1, 26).
 */

import React, { useEffect, useRef } from 'react';
import { TOKENS, EosCommonProps } from '../foundations/tokens.js';
import { EosButton } from '../primitives/EosButton.js';

export interface EosDialogProps extends EosCommonProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  maxWidth?: 480 | 640 | 800;
  children: React.ReactNode;
  primaryAction?: {
    label: string;
    onClick: () => void;
    isLoading?: boolean;
    disabled?: boolean;
    variant?: 'primary' | 'destructive' | 'success';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
}

export const EosDialog: React.FC<EosDialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  maxWidth = 640,
  children,
  primaryAction,
  secondaryAction,
  testId,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

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
      aria-labelledby="eos-dialog-title"
      data-testid={testId}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: TOKENS.surface.overlay.dark,
        padding: '16px',
        boxSizing: 'border-box',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        style={{
          width: '100%',
          maxWidth: `${maxWidth}px`,
          backgroundColor: 'var(--surface-1, #0F1624)',
          borderRadius: TOKENS.radius.lg,
          border: '1px solid var(--border-default, #2A374B)',
          boxShadow: TOKENS.elevation.level3,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'eosDialogEnter 200ms cubic-bezier(0.2, 0, 0, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--border-subtle, #1D2939)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div>
            <h2
              id="eos-dialog-title"
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
            {description && (
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: '13px',
                  lineHeight: '18px',
                  color: 'var(--text-muted, #94A3B8)',
                }}
              >
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
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

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', maxHeight: '70vh' }}>
          {children}
        </div>

        {/* Action Footer per Section 14.1 (Cancel before primary, primary at inline-end) */}
        {(primaryAction || secondaryAction) && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border-subtle, #1D2939)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              backgroundColor: 'var(--surface-inset, #0B111D)',
            }}
          >
            {secondaryAction && (
              <EosButton
                variant="secondary"
                size="md"
                onClick={secondaryAction.onClick}
                disabled={secondaryAction.disabled}
              >
                {secondaryAction.label}
              </EosButton>
            )}
            {primaryAction && (
              <EosButton
                variant={primaryAction.variant || 'primary'}
                size="md"
                onClick={primaryAction.onClick}
                isLoading={primaryAction.isLoading}
                disabled={primaryAction.disabled}
              >
                {primaryAction.label}
              </EosButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
