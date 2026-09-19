/**
 * E3-EOS Design System — Foundations & Semantic Design Tokens
 * Conforms strictly to E3-EOS Global UI Component Rules (specs/12_GLOBAL_UI_COMPONENT_RULES.md).
 */

export interface TokenColorSet {
  light: string;
  dark: string;
}

export interface StatusTokenGroup {
  bg: string;
  text: string;
  border: string;
}

// 2.1 & 2.2 Global Semantic Token Definitions
export const DARK_THEME_TOKENS = {
  '--canvas': '#090D16',
  '--surface-1': '#0F1624',
  '--surface-2': '#151E2E',
  '--surface-3': '#1B2638',
  '--surface-inset': '#0B111D',
  '--border-subtle': '#1D2939',
  '--border-default': '#2A374B',
  '--border-strong': '#475467',
  '--text-primary': '#F8FAFC',
  '--text-secondary': '#CBD5E1',
  '--text-muted': '#94A3B8',
  '--text-disabled': '#64748B',
  '--accent': '#D97706',
  '--accent-hover': '#F59E0B',
  '--accent-pressed': '#B45309',
  '--accent-soft': 'rgba(217,119,6,.14)',
  '--focus-ring': '#F59E0B',
} as const;

export const LIGHT_THEME_TOKENS = {
  '--canvas': '#F4F6F8',
  '--surface-1': '#FFFFFF',
  '--surface-2': '#FFFFFF',
  '--surface-3': '#F8FAFC',
  '--surface-inset': '#EEF2F6',
  '--border-subtle': '#E4E7EC',
  '--border-default': '#D0D5DD',
  '--border-strong': '#98A2B3',
  '--text-primary': '#101828',
  '--text-secondary': '#344054',
  '--text-muted': '#667085',
  '--text-disabled': '#98A2B3',
  '--accent': '#B45309',
  '--accent-hover': '#92400E',
  '--accent-pressed': '#78350F',
  '--accent-soft': '#FFF7ED',
  '--focus-ring': '#D97706',
} as const;

export const SEMANTIC_STATUS_TOKENS = {
  info: { fg: '#3B82F6', bgSoft: 'rgba(59,130,246,.14)', text: '#1e40af', border: '#bfdbfe' },
  success: { fg: '#22C55E', bgSoft: 'rgba(34,197,94,.14)', text: '#065f46', border: '#a7f3d0' },
  warning: { fg: '#F59E0B', bgSoft: 'rgba(245,158,11,.14)', text: '#92400e', border: '#fde68a' },
  risk: { fg: '#F97316', bgSoft: 'rgba(249,115,22,.14)', text: '#c2410c', border: '#ffedd5' },
  critical: { fg: '#EF4444', bgSoft: 'rgba(239,68,68,.14)', text: '#991b1b', border: '#fecaca' },
  neutral: { fg: '#94A3B8', bgSoft: 'rgba(148,163,184,.14)', text: '#334155', border: '#cbd5e1' },
  aiSuggestion: { fg: '#8B5CF6', bgSoft: 'rgba(139,92,246,.14)', text: '#6b21a8', border: '#e9d5ff' },
} as const;

export const TOKENS = {
  // 2.1 & 2.2 Semantic Colour Tokens
  brand: {
    primary: '#090d16',      // E3 Deep Obsidian Chrome
    secondary: '#1e293b',    // Slate Chrome
    accent: '#d97706',       // Warm Metallic Gold / Amber
    accentHover: '#f59e0b',
    accentPressed: '#b45309',
    accentSubtle: '#fef3c7',
    accentSoft: 'rgba(217,119,6,.14)',
    onPrimary: '#ffffff',
  },

  surface: {
    canvas: { light: '#f4f6f8', dark: '#090d16' },
    surface1: { light: '#ffffff', dark: '#0f1624' },
    surface2: { light: '#ffffff', dark: '#151e2e' },
    surface3: { light: '#f8fafc', dark: '#1b2638' },
    inset: { light: '#eef2f6', dark: '#0b111d' },
    panel: { light: '#ffffff', dark: '#0f1624' },
    raised: { light: '#ffffff', dark: '#151e2e' },
    sunken: { light: '#eef2f6', dark: '#0b111d' },
    overlay: { light: 'rgba(16, 24, 40, 0.65)', dark: 'rgba(0, 0, 0, 0.85)' },
  },

  text: {
    primary: { light: '#101828', dark: '#f8fafc' },
    secondary: { light: '#344054', dark: '#cbd5e1' },
    muted: { light: '#667085', dark: '#94a3b8' },
    disabled: { light: '#98a2b3', dark: '#64748b' },
    inverse: { light: '#ffffff', dark: '#101828' },
    link: { light: '#3b82f6', dark: '#60a5fa' },
  },

  border: {
    subtle: { light: '#e4e7ec', dark: '#1d2939' },
    default: { light: '#d0d5dd', dark: '#2a374b' },
    strong: { light: '#98a2b3', dark: '#475467' },
    focus: { light: '#d97706', dark: '#f59e0b' },
  },

  status: {
    info: { bg: 'rgba(59,130,246,.14)', text: '#3b82f6', border: '#bfdbfe' },
    success: { bg: 'rgba(34,197,94,.14)', text: '#22c55e', border: '#a7f3d0' },
    warning: { bg: 'rgba(245,158,11,.14)', text: '#f59e0b', border: '#fde68a' },
    risk: { bg: 'rgba(249,115,22,.14)', text: '#f97316', border: '#ffedd5' },
    critical: { bg: 'rgba(239,68,68,.14)', text: '#ef4444', border: '#fecaca' },
    neutral: { bg: 'rgba(148,163,184,.14)', text: '#94a3b8', border: '#cbd5e1' },
    purple: { bg: 'rgba(139,92,246,.14)', text: '#8b5cf6', border: '#e9d5ff' },
    aiSuggestion: { bg: 'rgba(139,92,246,.14)', text: '#8b5cf6', border: '#e9d5ff' },
  },

  workflow: {
    idea: { bg: '#f8fafc', text: '#475569', border: '#cbd5e1' },
    developing: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
    submitted: { bg: '#f5f3ff', text: '#5b21b6', border: '#ddd6fe' },
    negotiating: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
    authorised: { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
    delivering: { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
    closing: { bg: '#fef3c7', text: '#78350f', border: '#fcd34d' },
    closed: { bg: '#f1f5f9', text: '#334155', border: '#94a3b8' },
  },

  data: {
    series01: '#2563eb', // Blue
    series02: '#059669', // Emerald
    series03: '#d97706', // Amber
    series04: '#7c3aed', // Purple
    series05: '#db2777', // Pink
    series06: '#0891b2', // Cyan
    series07: '#ea580c', // Orange
    series08: '#4b5563', // Slate
  },

  overlay: {
    scrim: 'rgba(15, 23, 42, 0.65)',
    hover: 'rgba(15, 23, 42, 0.04)',
    selected: 'rgba(217, 119, 6, 0.14)',
  },

  // 2.5 Spacing Scale (4px base only: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80)
  spacing: {
    0: '0px',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
    20: '80px',
  },

  // 8.2 & 9.2 Control Heights
  controlHeight: {
    compact: '32px',
    standard: '40px',
    comfortable: '48px',
    fieldPrimary: '52px',
  },

  // 2.6 Radius Tokens
  radius: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    pill: '999px',
    control: '6px',
    card: '8px',
    modal: '12px',
  },

  // 2.7 Elevation Levels
  elevation: {
    level0: 'none',
    level1: '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
    level2: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    level3: '0 10px 15px -3px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    level4: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
  },

  // 4.1 Motion Duration Tokens
  motion: {
    instant: '80ms cubic-bezier(0.2, 0, 0, 1)',
    fast: '120ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '180ms cubic-bezier(0.4, 0, 0.2, 1)',
    panel: '240ms cubic-bezier(0.16, 1, 0.3, 1)',
    modal: '200ms cubic-bezier(0.2, 0, 0, 1)',
    page: '220ms cubic-bezier(0.2, 0, 0, 1)',
    emphasis: '320ms cubic-bezier(0.16, 1, 0.3, 1)',
  },

  // 5.1 Responsive Breakpoints
  breakpoint: {
    mobile: 390,
    tablet: 768,
    desktop: 1024,
    wide: 1440,
    wideDesktop: 1440,
  },
} as const;

export type ThemeMode = 'light' | 'dark' | 'system';
export type Direction = 'ltr' | 'rtl';
export type DensityMode = 'compact' | 'standard' | 'comfortable';

// 26. Component API & Naming Rules
export type EosSize = 'sm' | 'md' | 'lg' | 'field';
export type EosTone = 'info' | 'success' | 'warning' | 'risk' | 'critical' | 'neutral' | 'ai-suggestion';

export interface EosCommonProps {
  size?: 'sm' | 'md' | 'lg' | 'field';
  density?: 'compact' | 'standard' | 'comfortable';
  disabled?: boolean;
  readOnly?: boolean;
  loading?: boolean;
  direction?: 'ltr' | 'rtl';
  'aria-label'?: string;
  testId?: string;
}
