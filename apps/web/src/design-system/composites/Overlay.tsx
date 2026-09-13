/**
 * EOS / Feedback & Overlay / Modal, Drawer, Toast, AlertBanner
 * Conforms to Master Plan Section 6.4.
 */

import React, { useEffect } from 'react';
import { TOKENS } from '../foundations/tokens.js';
import { Button } from '../primitives/Button.js';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths: Record<string, string> = {
    sm: '420px',
    md: '580px',
    lg: '760px',
    xl: '960px',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: TOKENS.overlay.scrim,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
        backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: TOKENS.radius.modal,
          boxShadow: TOKENS.elevation.level4,
          width: '100%',
          maxWidth: maxWidths[size],
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: `fadeInModal ${TOKENS.motion.base}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${TOKENS.border.default.light}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: TOKENS.surface.sunken.light,
          }}
        >
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: TOKENS.text.primary.light }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: TOKENS.text.secondary.light,
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>{children}</div>

        {footer && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: `1px solid ${TOKENS.border.default.light}`,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              backgroundColor: '#fafafa',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
  footer?: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  width = '520px',
  footer,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: TOKENS.overlay.scrim,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
        backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: width,
          height: '100%',
          backgroundColor: '#ffffff',
          boxShadow: TOKENS.elevation.level4,
          display: 'flex',
          flexDirection: 'column',
          animation: `slideInRight ${TOKENS.motion.panel}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${TOKENS.border.default.light}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: TOKENS.surface.sunken.light,
          }}
        >
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: TOKENS.text.primary.light }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: TOKENS.text.secondary.light,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>{children}</div>

        {footer && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: `1px solid ${TOKENS.border.default.light}`,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              backgroundColor: '#fafafa',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export interface AlertBannerProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  action?: { label: string; onClick: () => void };
  onClose?: () => void;
  style?: React.CSSProperties;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  type = 'info',
  title,
  message,
  action,
  onClose,
  style,
}) => {
  const typeMap = {
    info: TOKENS.status.info,
    success: TOKENS.status.success,
    warning: TOKENS.status.warning,
    error: TOKENS.status.critical,
  };

  const currentTheme = typeMap[type];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderRadius: TOKENS.radius.card,
        backgroundColor: currentTheme.bg,
        border: `1px solid ${currentTheme.border}`,
        color: currentTheme.text,
        fontSize: '13px',
        gap: '12px',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
        <span style={{ fontSize: '16px' }}>
          {type === 'success' ? '✓' : type === 'warning' ? '⚠️' : type === 'error' ? '🛑' : 'ℹ️'}
        </span>
        <div>
          {title && <strong style={{ display: 'block', marginBottom: '2px' }}>{title}</strong>}
          <span>{message}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {action && (
          <Button size="sm" variant="secondary" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: currentTheme.text,
              fontSize: '14px',
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};
