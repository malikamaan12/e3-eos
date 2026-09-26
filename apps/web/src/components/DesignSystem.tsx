import React from 'react';

// ==========================================
// E3 CORPORATE COLOR SYSTEM & TOKENS (DYNAMIC CSS VARIABLES)
// ==========================================
export const E3_THEME = {
  chrome: {
    sidebarBg: 'var(--canvas, #090d16)',
    sidebarBorder: 'var(--border-subtle, #1e293b)',
    sidebarText: 'var(--text-muted, #94a3b8)',
    sidebarTextHover: 'var(--text-primary, #f8fafc)',
    sidebarActiveBg: 'var(--surface-2, #1e293b)',
    sidebarActiveText: 'var(--text-primary, #ffffff)',
    topbarBg: 'var(--canvas, #090d16)',
    topbarBorder: 'var(--border-subtle, #1e293b)',
  },
  accent: {
    primary: 'var(--accent, #d97706)',      // Warm metallic gold/amber
    hover: 'var(--accent-hover, #b45309)',
    subtle: 'var(--accent-soft, rgba(217,119,6,.14))',
    border: 'var(--focus-ring, #f59e0b)',
  },
  surface: {
    pageBg: 'var(--canvas, #090d16)',
    cardBg: 'var(--surface-1, #0f1624)',
    cardBorder: 'var(--border-default, #2a374b)',
    cardHeaderBg: 'var(--surface-1, #0f1624)',
    tableBorder: 'var(--border-default, #2a374b)',
    tableRowHover: 'var(--surface-2, #151e2e)',
  },
  text: {
    primary: 'var(--text-primary, #f8fafc)',
    secondary: 'var(--text-secondary, #cbd5e1)',
    muted: 'var(--text-muted, #94a3b8)',
    inverted: 'var(--canvas, #090d16)',
  },
  semantic: {
    healthy: { bg: 'rgba(34, 197, 94, 0.14)', text: '#22c55e', border: '#15803d' },
    warning: { bg: 'rgba(245, 158, 11, 0.14)', text: '#f59e0b', border: '#b45309' },
    blocked: { bg: 'rgba(239, 68, 68, 0.14)', text: '#ef4444', border: '#b91c1c' },
    info: { bg: 'rgba(59, 130, 246, 0.14)', text: '#3b82f6', border: '#1d4ed8' },
  },
};

// ==========================================
// FINANCIAL & NUMERIC FORMATTING UTILITIES
// ==========================================
export function formatCurrency(amount: number | string, currency: string = 'QAR'): string {
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]+/g, '')) : amount;
  if (isNaN(num)) return `${currency} 0`;
  
  const isNegative = num < 0;
  const absFormatted = Math.abs(num).toLocaleString('en-US', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });

  return isNegative ? `−${currency} ${absFormatted}` : `${currency} ${absFormatted}`;
}

export function formatCompactNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

// ==========================================
// BUTTON COMPONENT
// ==========================================
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'success' | 'ghost' | 'outline';
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
  className,
  ...props
}) => {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: 600,
    borderRadius: '8px',
    border: '1px solid transparent',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: disabled || isLoading ? 0.6 : 1,
    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    fontFamily: 'inherit',
    lineHeight: 1,
    whiteSpace: 'nowrap',
    outline: 'none',
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '0 12px', fontSize: '12px', height: '32px' },
    md: { padding: '0 16px', fontSize: '13px', height: '40px' },
    lg: { padding: '0 24px', fontSize: '15px', height: '48px' },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: 'var(--accent, #d97706)',
      color: '#ffffff',
      borderColor: 'var(--accent-pressed, #b45309)',
      boxShadow: '0 1px 2px rgba(217, 119, 6, 0.2)',
    },
    accent: {
      backgroundColor: 'var(--accent, #d97706)',
      color: '#ffffff',
      borderColor: 'var(--accent-pressed, #b45309)',
      boxShadow: '0 1px 2px rgba(217, 119, 6, 0.2)',
    },
    secondary: {
      backgroundColor: 'var(--surface-2, #151e2e)',
      color: 'var(--text-primary, #f8fafc)',
      borderColor: 'var(--border-default, #2a374b)',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
    },
    danger: {
      backgroundColor: '#ef4444',
      color: '#ffffff',
      borderColor: '#dc2626',
      boxShadow: '0 1px 2px rgba(239, 68, 68, 0.15)',
    },
    success: {
      backgroundColor: '#22c55e',
      color: '#ffffff',
      borderColor: '#16a34a',
      boxShadow: '0 1px 2px rgba(34, 197, 94, 0.15)',
    },
    outline: {
      backgroundColor: 'transparent',
      color: 'var(--text-primary, #f8fafc)',
      borderColor: 'var(--border-strong, #475467)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--text-secondary, #cbd5e1)',
      borderColor: 'transparent',
    },
  };

  return (
    <button
      className={['eos-button', className].filter(Boolean).join(' ')}
      data-variant={variant}
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

// ==========================================
// SEMANTIC BADGE COMPONENT (NO CONFETTI)
// ==========================================
export interface BadgeProps {
  variant?: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'purple' | 'secondary' | 'primary' | 'accent' | 'default' | 'outline';
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', size = 'sm', children, style: customStyle, className }) => {
  const variantStyles: Record<string, { bg: string; text: string; border: string }> = {
    neutral: { bg: 'rgba(148, 163, 184, 0.14)', text: 'var(--text-secondary, #cbd5e1)', border: 'rgba(148, 163, 184, 0.25)' },
    default: { bg: 'rgba(148, 163, 184, 0.14)', text: 'var(--text-secondary, #cbd5e1)', border: 'rgba(148, 163, 184, 0.25)' },
    secondary: { bg: 'rgba(148, 163, 184, 0.14)', text: 'var(--text-secondary, #cbd5e1)', border: 'rgba(148, 163, 184, 0.25)' },
    primary: { bg: 'rgba(59, 130, 246, 0.14)', text: 'var(--status-info-fg)', border: 'rgba(59, 130, 246, 0.3)' },
    info: { bg: 'rgba(59, 130, 246, 0.14)', text: 'var(--status-info-fg)', border: 'rgba(59, 130, 246, 0.3)' },
    success: { bg: 'rgba(34, 197, 94, 0.14)', text: 'var(--status-success-fg)', border: 'rgba(34, 197, 94, 0.3)' },
    warning: { bg: 'rgba(245, 158, 11, 0.14)', text: 'var(--status-warning-fg)', border: 'rgba(245, 158, 11, 0.3)' },
    danger: { bg: 'rgba(239, 68, 68, 0.14)', text: 'var(--status-critical-fg)', border: 'rgba(239, 68, 68, 0.3)' },
    purple: { bg: 'rgba(139, 92, 246, 0.14)', text: 'var(--chart-1)', border: 'rgba(139, 92, 246, 0.3)' },
    accent: { bg: 'var(--accent-soft, rgba(217, 119, 6, 0.14))', text: 'var(--accent, #d97706)', border: 'var(--accent, #d97706)' },
    outline: { bg: 'transparent', text: 'var(--text-muted, #94a3b8)', border: 'var(--border-default, #2a374b)' },
  };

  const style = variantStyles[variant] || variantStyles.neutral;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: size === 'sm' ? '2px 8px' : size === 'lg' ? '6px 14px' : '4px 10px',
        fontSize: size === 'sm' ? '12px' : size === 'lg' ? '13px' : '12px',
        fontWeight: 600,
        borderRadius: '4px',
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
        ...customStyle,
      }}
    >
      {children}
    </span>
  );
};

// ==========================================
// SKELETON COMPONENT
// ==========================================
export const Skeleton: React.FC<{ width?: string | number; height?: string | number; style?: React.CSSProperties }> = ({
  width = '100%',
  height = '16px',
  style,
}) => {
  return (
    <div
      style={{
        width,
        height,
        backgroundColor: 'var(--border-subtle, #1d2939)',
        borderRadius: '4px',
        animation: 'pulse 1.5s ease-in-out infinite',
        display: 'inline-block',
        ...style,
      }}
    />
  );
};

// ==========================================
// METRIC CARD / KPI CARD (ENTERPRISE STANDARD)
// ==========================================
export interface MetricCardProps {
  title?: string;
  label?: string;
  value?: string | number | null;
  unit?: string;
  subtitle?: string;
  subtext?: string;
  change?: string;
  delta?: { text: string; isPositive: boolean };
  trend?: 'positive' | 'negative' | 'neutral' | 'up' | 'down' | string;
  trendDirection?: 'up' | 'down';
  badge?: { label: string; variant: BadgeProps['variant'] };
  accentColor?: string;
  onClick?: () => void;
  isLoading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  label,
  value,
  unit,
  subtitle,
  subtext,
  change,
  delta,
  trend,
  trendDirection,
  badge,
  accentColor = 'var(--accent, #d97706)',
  onClick,
  isLoading = false,
}) => {
  const displayTitle = title || label || '';
  const displaySubtitle = subtitle || subtext || change || '';
  const isTrendPositive = trend === 'positive' || trend === 'up' || trendDirection === 'up';
  const isTrendNegative = trend === 'negative' || trend === 'down' || trendDirection === 'down';
  const isValueLoading = isLoading || value === '…' || value === '...' || value === undefined || value === null;

  return (
    <div
      className="eos-metric"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onClick(); } } : undefined}
      style={{
        backgroundColor: 'var(--surface-1, #0f1624)',
        borderRadius: '8px',
        border: '1px solid var(--border-default, #2a374b)',
        padding: '16px 18px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.1s ease, box-shadow 0.1s ease',
        minHeight: '110px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div className="eos-metric-accent"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          backgroundColor: accentColor,
        }}
      />
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
          <span className="eos-metric-title" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted, #94a3b8)' }}>
            {displayTitle}
          </span>
          {badge && <Badge variant={badge.variant} style={{ whiteSpace: 'normal', overflowWrap: 'anywhere', maxWidth: '100%' }}>{badge.label}</Badge>}
        </div>
        <div className="eos-metric-value" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)', marginBottom: '4px', fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          {isValueLoading ? (
            <Skeleton width="90px" height="26px" style={{ margin: '2px 0' }} />
          ) : (
            <>
              <span>{value}</span>
              {unit && <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted, #94a3b8)' }}>{unit}</span>}
            </>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', minHeight: '18px' }}>
        {isValueLoading ? (
          <Skeleton width="130px" height="14px" />
        ) : (
          <>
            {delta && (
              <span
                style={{
                  fontWeight: 700,
                  color: delta.isPositive ? '#22c55e' : '#ef4444',
                }}
              >
                {delta.isPositive ? '▲' : '▼'} {delta.text}
              </span>
            )}
            {!delta && trend && (
              <span
                style={{
                  fontWeight: 700,
                  color: isTrendPositive ? '#22c55e' : isTrendNegative ? '#ef4444' : 'var(--text-muted, #94a3b8)',
                }}
              >
                {isTrendPositive ? '▲ ' : isTrendNegative ? '▼ ' : ''}
              </span>
            )}
            {displaySubtitle && <span style={{ color: 'var(--text-muted, #94a3b8)' }}>{displaySubtitle}</span>}
          </>
        )}
      </div>
    </div>
  );
};

// ==========================================
// ALERT BANNER COMPONENT
// ==========================================
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
    info: { bg: 'rgba(59, 130, 246, 0.14)', border: 'rgba(59, 130, 246, 0.3)', text: 'var(--status-info-fg)', icon: 'ℹ️' },
    warning: { bg: 'rgba(245, 158, 11, 0.14)', border: 'rgba(245, 158, 11, 0.3)', text: 'var(--status-warning-fg)', icon: '⚠️' },
    error: { bg: 'rgba(239, 68, 68, 0.14)', border: 'rgba(239, 68, 68, 0.3)', text: 'var(--status-critical-fg)', icon: '⛔' },
    success: { bg: 'rgba(34, 197, 94, 0.14)', border: 'rgba(34, 197, 94, 0.3)', text: 'var(--status-success-fg)', icon: '✅' },
  };

  const conf = configs[type];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '8px',
        backgroundColor: conf.bg,
        border: `1px solid ${conf.border}`,
        color: conf.text,
        marginBottom: '16px',
        fontSize: '13px',
      }}
    >
      <span style={{ fontSize: '16px', marginTop: '1px' }}>{conf.icon}</span>
      <div style={{ flex: 1 }}>
        {title && <div style={{ fontWeight: 700, marginBottom: '2px' }}>{title}</div>}
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

// ==========================================
// TABS COMPONENT
// ==========================================
export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
  icon?: string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  style?: React.CSSProperties;
  ariaLabel?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, style, ariaLabel = 'Navigation Tabs' }) => {
  const isAnyActive = tabs.some((t) => t.id === activeTab);
  const effectiveActiveTab = isAnyActive ? activeTab : (tabs[0]?.id || '');
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '1px solid var(--border-default, #2a374b)',
        marginBottom: '18px',
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'thin',
        WebkitOverflowScrolling: 'touch',
        ...style,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === effectiveActiveTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            id={`tab-${tab.id}`}
            onClick={() => onChange(tab.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--text-primary, #f8fafc)' : 'var(--text-muted, #94a3b8)',
              borderBottom: isActive ? '2px solid var(--accent, #d97706)' : '2px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
              marginBottom: '-1px',
              outline: 'none',
              minHeight: '44px',
              transition: 'color 0.15s ease, border-color 0.15s ease',
            }}
          >
            {tab.icon && <span style={{ fontSize: '15px' }}>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  backgroundColor: isActive ? 'var(--accent-soft, rgba(217,119,6,.14))' : 'var(--surface-2, #151e2e)',
                  color: isActive ? 'var(--accent, #d97706)' : 'var(--text-muted, #94a3b8)',
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

// ==========================================
// MODAL COMPONENT
// ==========================================
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, size = 'md' }) => {
  const titleId = React.useId();
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef(onClose);
  closeRef.current = onClose;
  React.useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]') || []);
    (focusable()[0] || dialog)?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key === 'Tab') {
        const elements = focusable();
        const first = elements[0]; const last = elements[elements.length - 1];
        if (!first) { event.preventDefault(); dialog?.focus(); }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    dialog?.addEventListener('keydown', handleKey);
    return () => { dialog?.removeEventListener('keydown', handleKey); previousFocus?.focus(); };
  }, [isOpen]);
  if (!isOpen) return null;

  const maxWidth = size === 'sm' ? '420px' : size === 'lg' ? '720px' : size === 'xl' ? '960px' : size === 'full' ? '96vw' : '560px';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(9, 13, 22, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{
          backgroundColor: 'var(--surface-1, #0f1624)',
          borderRadius: '10px',
          width: '100%',
          maxWidth,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          border: '1px solid var(--border-default, #2a374b)',
          overflow: 'hidden',
          maxHeight: 'calc(100dvh - 32px)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-subtle, #1d2939)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--surface-2, #151e2e)',
          }}
        >
          <h3 id={titleId} style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>{title}</h3>
          <button
            aria-label={document.documentElement.lang === 'ar' ? 'إغلاق' : 'Close'}
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              fontSize: '18px',
              color: 'var(--text-muted, #94a3b8)',
              cursor: 'pointer',
              padding: '4px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: '20px', minHeight: 0, overflowY: 'auto' }}>{children}</div>
        {footer && (
          <div
            style={{
              padding: '12px 20px',
              backgroundColor: 'var(--surface-2, #151e2e)',
              borderTop: '1px solid var(--border-subtle, #1d2939)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              flexWrap: 'wrap',
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

// ==========================================
// DRAWER COMPONENT (SLIDE-OVER FOR CONTEXT)
// ==========================================
export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
  position?: 'right' | 'left';
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  width = '420px',
  position = 'right',
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(9, 13, 22, 0.75)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: position === 'right' ? 'flex-end' : 'flex-start',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width,
          maxWidth: '90vw',
          height: '100%',
          backgroundColor: 'var(--surface-1, #0f1624)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          borderLeft: position === 'right' ? '1px solid var(--border-default, #2a374b)' : 'none',
          borderRight: position === 'left' ? '1px solid var(--border-default, #2a374b)' : 'none',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle, #1d2939)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--surface-2, #151e2e)',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'none', fontSize: '18px', color: 'var(--text-muted, #94a3b8)', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>{children}</div>
        {footer && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border-subtle, #1d2939)',
              backgroundColor: 'var(--surface-2, #151e2e)',
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

// ==========================================
// FORM CONTROLS WITH ACCESSIBLE FOCUS
// ==========================================
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: React.CSSProperties;
}

export const Input: React.FC<InputProps> = ({ label, error, hint, style, id, containerStyle, ...props }) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: label ? '12px' : '0px', ...containerStyle }}>
      {label && (
        <label htmlFor={inputId} style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        style={{
          padding: '8px 12px',
          fontSize: '13px',
          borderRadius: '8px',
          border: error ? '1px solid #ef4444' : '1px solid var(--border-default, #2a374b)',
          outline: 'none',
          backgroundColor: 'var(--surface-inset, #0b111d)',
          color: 'var(--text-primary, #f8fafc)',
          fontFamily: 'inherit',
          height: '40px',
          boxSizing: 'border-box',
          ...style,
        }}
        {...props}
      />
      {hint && !error && <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>{hint}</span>}
      {error && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>{error}</span>}
    </div>
  );
};

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: Array<{ value: string; label: string }>;
}

export const Select: React.FC<SelectProps> = ({ label, error, hint, options, children, style, id, ...props }) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
      {label && (
        <label htmlFor={selectId} style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>
          {label}
        </label>
      )}
      <select
        id={selectId}
        style={{
          padding: '8px 12px',
          fontSize: '13px',
          borderRadius: '8px',
          border: error ? '1px solid #ef4444' : '1px solid var(--border-default, #2a374b)',
          outline: 'none',
          backgroundColor: 'var(--surface-inset, #0b111d)',
          color: 'var(--text-primary, #f8fafc)',
          fontFamily: 'inherit',
          height: '40px',
          cursor: 'pointer',
          boxSizing: 'border-box',
          ...style,
        }}
        {...props}
      >
        {options ? options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        )) : children}
      </select>
      {hint && !error && <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>{hint}</span>}
      {error && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>{error}</span>}
    </div>
  );
};

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, hint, style, id, ...props }) => {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
      {label && (
        <label htmlFor={textareaId} style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        style={{
          padding: '8px 12px',
          fontSize: '13px',
          borderRadius: '8px',
          border: error ? '1px solid #ef4444' : '1px solid var(--border-default, #2a374b)',
          outline: 'none',
          backgroundColor: 'var(--surface-inset, #0b111d)',
          color: 'var(--text-primary, #f8fafc)',
          fontFamily: 'inherit',
          resize: 'vertical',
          minHeight: '80px',
          boxSizing: 'border-box',
          ...style,
        }}
        {...props}
      />
      {hint && !error && <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>{hint}</span>}
      {error && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>{error}</span>}
    </div>
  );
};

// ==========================================
// CARD COMPONENT
// ==========================================
export interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
  noPadding?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ title, subtitle, action, children, style, noPadding = false, onClick }) => {
  return (
    <div
      className="eos-card"
      onClick={onClick}
      style={{
        backgroundColor: 'var(--surface-1, #0f1624)',
        border: '1px solid var(--border-default, #2a374b)',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        overflow: 'hidden',
        marginBottom: '16px',
        ...style,
      }}
    >
      {(title || action) && (
        <div className="eos-card-heading"
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--border-subtle, #1d2939)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            backgroundColor: 'var(--surface-1, #0f1624)',
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            {title && <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h4>}
            {subtitle && <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted, #94a3b8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</p>}
          </div>
          {action && <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{action}</div>}
        </div>
      )}
      <div style={{ padding: noPadding ? 0 : '16px 18px' }}>{children}</div>
    </div>
  );
};

// ==========================================
// COMPACT PERSISTENT PROJECT CONTEXT HEADER
// ==========================================
export interface ProjectContextHeaderProps {
  projectCode: string;
  projectName: string;
  clientName: string;
  currentStage: string;
  status: string;
  venue: string;
  eventDate: string;
  leadPm: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
}

export const ProjectContextHeader: React.FC<ProjectContextHeaderProps> = ({
  projectCode,
  projectName,
  clientName,
  currentStage,
  status,
  venue,
  eventDate,
  leadPm,
  riskLevel,
  primaryAction,
  secondaryActions,
}) => {
  const riskBadge = riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ? 'danger' : riskLevel === 'MEDIUM' ? 'warning' : 'success';

  return (
    <div
      style={{
        backgroundColor: 'var(--surface-1, #0f1624)',
        color: 'var(--text-primary, #f8fafc)',
        borderRadius: '8px',
        border: '1px solid var(--border-default, #2a374b)',
        padding: '12px 18px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, backgroundColor: 'var(--surface-2, #151e2e)', padding: '3px 8px', borderRadius: '4px', color: 'var(--accent, #d97706)', border: '1px solid var(--border-subtle, #1d2939)' }}>
          {projectCode}
        </span>
        <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-primary, #f8fafc)' }}>
          {projectName}
        </h2>
        <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>• {clientName}</span>
        <Badge variant="neutral" size="sm">{currentStage}</Badge>
        <Badge variant={riskBadge} size="sm">Risk: {riskLevel}</Badge>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary, #cbd5e1)', display: 'flex', gap: '12px' }}>
          <span>📍 {venue}</span>
          <span>📅 {eventDate}</span>
          <span>👤 {leadPm}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {secondaryActions}
          {primaryAction}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// EMPTY STATE & SKELETON
// ==========================================
export interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon = '📂', title, description, action }) => {
  return (
    <div
      style={{
        padding: '36px 20px',
        textAlign: 'center',
        backgroundColor: 'var(--surface-1, #0f1624)',
        borderRadius: '8px',
        border: '1px dashed var(--border-strong, #475467)',
        margin: '16px 0',
      }}
    >
      <div style={{ fontSize: '32px', marginBottom: '10px' }}>{icon}</div>
      <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>{title}</h4>
      <p style={{ margin: '0 0 14px', fontSize: '12px', color: 'var(--text-muted, #94a3b8)', maxWidth: '380px', marginInline: 'auto' }}>
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};
