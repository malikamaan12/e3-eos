import React from 'react';

// ==========================================
// E3 CORPORATE COLOR SYSTEM & TOKENS
// ==========================================
export const E3_THEME = {
  chrome: {
    sidebarBg: '#090d16',
    sidebarBorder: '#1e293b',
    sidebarText: '#94a3b8',
    sidebarTextHover: '#f8fafc',
    sidebarActiveBg: '#1e293b',
    sidebarActiveText: '#ffffff',
    topbarBg: '#090d16',
    topbarBorder: '#1e293b',
  },
  accent: {
    primary: '#d97706',      // Warm metallic gold/amber
    hover: '#b45309',
    subtle: '#fef3c7',
    border: '#f59e0b',
  },
  surface: {
    pageBg: '#f8fafc',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    cardHeaderBg: '#ffffff',
    tableBorder: '#e2e8f0',
    tableRowHover: '#f8fafc',
  },
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    muted: '#64748b',
    inverted: '#ffffff',
  },
  semantic: {
    healthy: { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
    warning: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
    blocked: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
    info: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
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
    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    fontFamily: 'inherit',
    lineHeight: 1,
    whiteSpace: 'nowrap',
    outline: 'none',
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '6px 12px', fontSize: '12px', height: '32px' },
    md: { padding: '8px 16px', fontSize: '13px', height: '38px' },
    lg: { padding: '12px 22px', fontSize: '15px', height: '46px' },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: '#0f172a',
      color: '#ffffff',
      borderColor: '#0f172a',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
    },
    accent: {
      backgroundColor: '#d97706',
      color: '#ffffff',
      borderColor: '#b45309',
      boxShadow: '0 1px 2px rgba(217, 119, 6, 0.2)',
    },
    secondary: {
      backgroundColor: '#ffffff',
      color: '#1e293b',
      borderColor: '#cbd5e1',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
    },
    danger: {
      backgroundColor: '#dc2626',
      color: '#ffffff',
      borderColor: '#b91c1c',
      boxShadow: '0 1px 2px rgba(220, 38, 38, 0.15)',
    },
    success: {
      backgroundColor: '#059669',
      color: '#ffffff',
      borderColor: '#047857',
      boxShadow: '0 1px 2px rgba(5, 150, 105, 0.15)',
    },
    outline: {
      backgroundColor: 'transparent',
      color: '#0f172a',
      borderColor: '#94a3b8',
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

// ==========================================
// SEMANTIC BADGE COMPONENT (NO CONFETTI)
// ==========================================
export interface BadgeProps {
  variant?: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'purple' | 'secondary' | 'primary' | 'accent';
  children: React.ReactNode;
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', size = 'sm', children, style: customStyle }) => {
  const variantStyles: Record<string, { bg: string; text: string; border: string }> = {
    neutral: { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' },
    secondary: { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' },
    primary: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
    info: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
    success: { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
    warning: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
    danger: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
    purple: { bg: '#faf5ff', text: '#6b21a8', border: '#e9d5ff' },
    accent: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
  };

  const style = variantStyles[variant] || variantStyles.neutral;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
        fontSize: size === 'sm' ? '11px' : '12px',
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
// METRIC CARD / KPI CARD (ENTERPRISE STANDARD)
// ==========================================
export interface MetricCardProps {
  title?: string;
  label?: string;
  value: string | number;
  subtitle?: string;
  subtext?: string;
  change?: string;
  delta?: { text: string; isPositive: boolean };
  trend?: 'positive' | 'negative' | 'neutral' | 'up' | 'down' | string;
  trendDirection?: 'up' | 'down';
  badge?: { label: string; variant: BadgeProps['variant'] };
  accentColor?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  label,
  value,
  subtitle,
  subtext,
  change,
  delta,
  trend,
  trendDirection,
  badge,
  accentColor = '#d97706',
  onClick,
}) => {
  const displayTitle = title || label || '';
  const displaySubtitle = subtitle || subtext || change || '';
  const isTrendPositive = trend === 'positive' || trend === 'up' || trendDirection === 'up';
  const isTrendNegative = trend === 'negative' || trend === 'down' || trendDirection === 'down';

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        padding: '16px 18px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.1s ease, box-shadow 0.1s ease',
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>
          {displayTitle}
        </span>
        {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
      </div>
      <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginBottom: '4px', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
        {delta && (
          <span
            style={{
              fontWeight: 700,
              color: delta.isPositive ? '#059669' : '#dc2626',
            }}
          >
            {delta.isPositive ? '▲' : '▼'} {delta.text}
          </span>
        )}
        {!delta && trend && (
          <span
            style={{
              fontWeight: 700,
              color: isTrendPositive ? '#059669' : isTrendNegative ? '#dc2626' : '#64748b',
            }}
          >
            {isTrendPositive ? '▲ ' : isTrendNegative ? '▼ ' : ''}
          </span>
        )}
        {displaySubtitle && <span style={{ color: '#64748b' }}>{displaySubtitle}</span>}
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
        marginBottom: '18px',
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'none',
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
              gap: '6px',
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#0f172a' : '#64748b',
              borderBottom: isActive ? '2px solid #d97706' : '2px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
              marginBottom: '-1px',
              outline: 'none',
            }}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  backgroundColor: isActive ? '#fef3c7' : '#f1f5f9',
                  color: isActive ? '#92400e' : '#64748b',
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
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, size = 'md' }) => {
  if (!isOpen) return null;

  const maxWidth = size === 'sm' ? '420px' : size === 'lg' ? '720px' : size === 'xl' ? '960px' : '560px';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
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
          maxWidth,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              fontSize: '18px',
              color: '#64748b',
              cursor: 'pointer',
              padding: '4px',
              lineHeight: 1,
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
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
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
          backgroundColor: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
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
            backgroundColor: '#f8fafc',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'none', fontSize: '18px', color: '#64748b', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>{children}</div>
        {footer && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
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
}

export const Input: React.FC<InputProps> = ({ label, error, hint, style, id, ...props }) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
      {label && (
        <label htmlFor={inputId} style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        style={{
          padding: '8px 12px',
          fontSize: '13px',
          borderRadius: '6px',
          border: error ? '1px solid #ef4444' : '1px solid #cbd5e1',
          outline: 'none',
          backgroundColor: '#ffffff',
          color: '#0f172a',
          fontFamily: 'inherit',
          height: '38px',
          boxSizing: 'border-box',
          ...style,
        }}
        {...props}
      />
      {hint && !error && <span style={{ fontSize: '11px', color: '#64748b' }}>{hint}</span>}
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
        <label htmlFor={selectId} style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
          {label}
        </label>
      )}
      <select
        id={selectId}
        style={{
          padding: '8px 12px',
          fontSize: '13px',
          borderRadius: '6px',
          border: error ? '1px solid #ef4444' : '1px solid #cbd5e1',
          outline: 'none',
          backgroundColor: '#ffffff',
          color: '#0f172a',
          fontFamily: 'inherit',
          height: '38px',
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
      {hint && !error && <span style={{ fontSize: '11px', color: '#64748b' }}>{hint}</span>}
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
        <label htmlFor={textareaId} style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        style={{
          padding: '8px 12px',
          fontSize: '13px',
          borderRadius: '6px',
          border: error ? '1px solid #ef4444' : '1px solid #cbd5e1',
          outline: 'none',
          backgroundColor: '#ffffff',
          color: '#0f172a',
          fontFamily: 'inherit',
          resize: 'vertical',
          minHeight: '80px',
          boxSizing: 'border-box',
          ...style,
        }}
        {...props}
      />
      {hint && !error && <span style={{ fontSize: '11px', color: '#64748b' }}>{hint}</span>}
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
}

export const Card: React.FC<CardProps> = ({ title, subtitle, action, children, style, noPadding = false }) => {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        overflow: 'hidden',
        marginBottom: '16px',
        ...style,
      }}
    >
      {(title || action) && (
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff',
          }}
        >
          <div>
            {title && <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{title}</h4>}
            {subtitle && <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
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
        backgroundColor: '#0f172a',
        color: '#ffffff',
        borderRadius: '8px',
        padding: '12px 18px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, backgroundColor: '#1e293b', padding: '3px 8px', borderRadius: '4px', color: '#d97706', border: '1px solid #334155' }}>
          {projectCode}
        </span>
        <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
          {projectName}
        </h2>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>• {clientName}</span>
        <Badge variant="neutral" size="sm">{currentStage}</Badge>
        <Badge variant={riskBadge} size="sm">Risk: {riskLevel}</Badge>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '11px', color: '#cbd5e1', display: 'flex', gap: '12px' }}>
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
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px dashed #cbd5e1',
        margin: '16px 0',
      }}
    >
      <div style={{ fontSize: '32px', marginBottom: '10px' }}>{icon}</div>
      <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{title}</h4>
      <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#64748b', maxWidth: '380px', marginInline: 'auto' }}>
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};

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
        backgroundColor: '#e2e8f0',
        borderRadius: '4px',
        animation: 'pulse 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  );
};
