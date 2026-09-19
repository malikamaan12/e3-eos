/**
 * E3-EOS Design System — Typography Foundations
 * Conforms strictly to E3-EOS Global UI Component Rules (Section 2.4).
 * Supporting Latin and Arabic with tabular numerals for financials and operational metrics.
 */

import React from 'react';

export const FONT_FAMILY = {
  latin: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif',
  arabic: '"Noto Sans Arabic", Tahoma, "Segoe UI", Arial, sans-serif',
  canonicalStack: 'Inter, "Noto Sans Arabic", system-ui, sans-serif',
  mono: '"JetBrains Mono", Menlo, Monaco, Consolas, monospace',
};

export const TYPOGRAPHY: Record<string, React.CSSProperties> = {
  // 2.4 Styles
  display: {
    fontSize: '32px',
    lineHeight: '40px',
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  displayLg: {
    fontSize: '32px',
    lineHeight: '40px',
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  displayMd: {
    fontSize: '28px',
    lineHeight: '36px',
    fontWeight: 700,
    letterSpacing: '-0.015em',
  },
  pageTitle: {
    fontSize: '24px',
    lineHeight: '32px',
    fontWeight: 700,
    letterSpacing: '-0.01em',
  },
  sectionTitle: {
    fontSize: '18px',
    lineHeight: '26px',
    fontWeight: 600,
  },
  cardTitle: {
    fontSize: '15px',
    lineHeight: '22px',
    fontWeight: 600,
  },
  body: {
    fontSize: '14px',
    lineHeight: '22px',
    fontWeight: 400,
  },
  bodyStrong: {
    fontSize: '14px',
    lineHeight: '22px',
    fontWeight: 600,
  },
  bodyLg: {
    fontSize: '16px',
    lineHeight: '24px',
    fontWeight: 400,
  },
  bodyMd: {
    fontSize: '14px',
    lineHeight: '22px',
    fontWeight: 400,
  },
  label: {
    fontSize: '13px',
    lineHeight: '18px',
    fontWeight: 500,
  },
  caption: {
    fontSize: '12px',
    lineHeight: '16px',
    fontWeight: 400,
  },
  table: {
    fontSize: '13px',
    lineHeight: '18px',
    fontWeight: 500,
    fontVariantNumeric: 'tabular-nums',
  },
  dataTable: {
    fontSize: '13px',
    lineHeight: '18px',
    fontWeight: 400,
    fontVariantNumeric: 'tabular-nums',
  },
  kpi: {
    fontSize: '28px',
    lineHeight: '32px',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.015em',
  },
  kpiNumericLg: {
    fontSize: '36px',
    lineHeight: '40px',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.02em',
  },
  kpiNumericMd: {
    fontSize: '28px',
    lineHeight: '32px',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.015em',
  },
};

export function getFontFamily(isArabic: boolean): string {
  return isArabic ? FONT_FAMILY.arabic : FONT_FAMILY.latin;
}
