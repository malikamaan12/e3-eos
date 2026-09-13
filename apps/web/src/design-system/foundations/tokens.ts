/**
 * E3-EOS Design System — Foundations & Semantic Design Tokens
 * Conforms strictly to the E3-EOS UI System and Framer Component Plan (Section 4).
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

export const TOKENS = {
  // 4.2 Semantic Colour Tokens
  brand: {
    primary: '#090d16',      // E3 Deep Obsidian Chrome
    secondary: '#1e293b',    // Slate Chrome
    accent: '#d97706',       // Warm Metallic Gold / Amber
    accentHover: '#b45309',
    accentSubtle: '#fef3c7',
    onPrimary: '#ffffff',
  },

  surface: {
    canvas: { light: '#f8fafc', dark: '#090d16' },
    panel: { light: '#ffffff', dark: '#131b2e' },
    raised: { light: '#ffffff', dark: '#1e293b' },
    sunken: { light: '#f1f5f9', dark: '#0b1120' },
    overlay: { light: 'rgba(15, 23, 42, 0.65)', dark: 'rgba(0, 0, 0, 0.85)' },
  },

  text: {
    primary: { light: '#0f172a', dark: '#f8fafc' },
    secondary: { light: '#475569', dark: '#94a3b8' },
    muted: { light: '#64748b', dark: '#64748b' },
    inverse: { light: '#ffffff', dark: '#0f172a' },
    link: { light: '#2563eb', dark: '#60a5fa' },
  },

  border: {
    subtle: { light: '#f1f5f9', dark: '#1e293b' },
    default: { light: '#e2e8f0', dark: '#334155' },
    strong: { light: '#94a3b8', dark: '#475569' },
    focus: '#d97706',
  },

  status: {
    info: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
    success: { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
    warning: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
    risk: { bg: '#fff7ed', text: '#c2410c', border: '#ffedd5' },
    critical: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
    neutral: { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' },
    purple: { bg: '#faf5ff', text: '#6b21a8', border: '#e9d5ff' },
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
    selected: 'rgba(217, 119, 6, 0.08)',
  },

  // 4.4 Spacing & Sizing Scale (4px base)
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

  controlHeight: {
    compact: '32px',
    standard: '40px',
    comfortable: '48px',
    fieldPrimary: '52px',
  },

  radius: {
    control: '6px',
    card: '8px',
    modal: '12px',
    pill: '9999px',
  },

  // 4.6 Elevation Levels
  elevation: {
    level0: 'none',
    level1: '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
    level2: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    level3: '0 10px 15px -3px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    level4: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
  },

  // 4.8 Motion Tokens
  motion: {
    fast: '120ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '180ms cubic-bezier(0.4, 0, 0.2, 1)',
    panel: '240ms cubic-bezier(0.16, 1, 0.3, 1)',
    emphasis: '320ms cubic-bezier(0.16, 1, 0.3, 1)',
  },

  // 4.5 Responsive Breakpoints
  breakpoint: {
    mobile: 390,
    tablet: 768,
    desktop: 1024,
    wideDesktop: 1440,
  },
} as const;

export type ThemeMode = 'light' | 'dark';
export type Direction = 'ltr' | 'rtl';
export type DensityMode = 'compact' | 'standard' | 'comfortable';
