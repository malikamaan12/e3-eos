import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  style,
  disabled,
  ...props
}) => {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: 600,
    borderRadius: '6px',
    border: '1px solid transparent',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: disabled || isLoading ? 0.6 : 1,
    transition: 'all 0.15s ease-in-out',
    fontFamily: 'inherit',
    lineHeight: 1,
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '6px 12px', fontSize: '12px' },
    md: { padding: '8px 16px', fontSize: '14px' },
    lg: { padding: '12px 24px', fontSize: '16px' },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: '#2563eb',
      color: '#ffffff',
      borderColor: '#1d4ed8',
    },
    secondary: {
      backgroundColor: '#f1f5f9',
      color: '#0f172a',
      borderColor: '#cbd5e1',
    },
    danger: {
      backgroundColor: '#dc2626',
      color: '#ffffff',
      borderColor: '#b91c1c',
    },
    success: {
      backgroundColor: '#059669',
      color: '#ffffff',
      borderColor: '#047857',
    },
    outline: {
      backgroundColor: 'transparent',
      color: '#2563eb',
      borderColor: '#2563eb',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: '#475569',
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
      {isLoading && (
        <span
          style={{
            display: 'inline-block',
            width: '12px',
            height: '12px',
            border: '2px solid currentColor',
            borderRightColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
          }}
        />
      )}
      {children}
    </button>
  );
};

export interface BadgeProps {
  variant?: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'purple';
  children: React.ReactNode;
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', size = 'sm', children, style: customStyle }) => {
  const variantStyles: Record<string, { bg: string; text: string; border: string }> = {
    neutral: { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' },
    info: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    success: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
    warning: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
    danger: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
    purple: { bg: '#faf5ff', text: '#6b21a8', border: '#e9d5ff' },
  };

  const style = variantStyles[variant];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: size === 'sm' ? '2px 8px' : '4px 12px',
        fontSize: size === 'sm' ? '11px' : '13px',
        fontWeight: 600,
        borderRadius: '9999px',
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        whiteSpace: 'nowrap',
        ...customStyle,
      }}
    >
      {children}
    </span>
  );
};

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  delta?: { text: string; isPositive: boolean };
  badge?: { label: string; variant: BadgeProps['variant'] };
  accentColor?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  delta,
  badge,
  accentColor = '#2563eb',
}) => {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        padding: '16px 20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          backgroundColor: accentColor,
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: '#64748b' }}>
          {title}
        </span>
        {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
      </div>
      <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
        {value}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {delta && (
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: delta.isPositive ? '#059669' : '#dc2626',
            }}
          >
            {delta.isPositive ? '▲' : '▼'} {delta.text}
          </span>
        )}
        {subtitle && <span style={{ fontSize: '12px', color: '#64748b' }}>{subtitle}</span>}
      </div>
    </div>
  );
};

export interface AlertBannerProps {
  type?: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  children: React.ReactNode;
  action?: { label: string; onClick: () => void };
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  type = 'info',
  title,
  children,
  action,
}) => {
  const configs: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    info: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', icon: 'ℹ️' },
    warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e', icon: '⚠️' },
    error: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', icon: '⛔' },
    success: { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46', icon: '✅' },
  };

  const conf = configs[type];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '6px',
        backgroundColor: conf.bg,
        border: `1px solid ${conf.border}`,
        color: conf.text,
        marginBottom: '16px',
        fontSize: '14px',
      }}
    >
      <span style={{ fontSize: '16px' }}>{conf.icon}</span>
      <div style={{ flex: 1 }}>
        {title && <div style={{ fontWeight: 700, marginBottom: '4px' }}>{title}</div>}
        <div style={{ lineHeight: 1.5 }}>{children}</div>
      </div>
      {action && (
        <Button size="sm" variant="secondary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
};

export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange }) => {
  return (
    <div
      style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '1px solid #e2e8f0',
        marginBottom: '20px',
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: isActive ? 600 : 500,
              color: isActive ? '#2563eb' : '#64748b',
              borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  backgroundColor: isActive ? '#dbeafe' : '#f1f5f9',
                  color: isActive ? '#1d4ed8' : '#64748b',
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              fontSize: '20px',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>{children}</div>
        {footer && (
          <div
            style={{
              padding: '12px 20px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
