/**
 * E3-EOS Design System — Typography Foundations
 * Supporting Latin and Arabic with tabular numerals for financials and operational metrics.
 */

import React from 'react';

export const FONT_FAMILY = {
  latin: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  arabic: 'Tahoma, "Segoe UI", Arial, sans-serif',
  mono: '"JetBrains Mono", Menlo, Monaco, Consolas, monospace',
};

export const TYPOGRAPHY: Record<string, React.CSSProperties> = {
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
    fontSize: '20px',
    lineHeight: '28px',
    fontWeight: 600,
  },
  cardTitle: {
    fontSize: '16px',
    lineHeight: '24px',
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
    fontWeight: 600,
  },
  caption: {
    fontSize: '12px',
    lineHeight: '16px',
    fontWeight: 400,
  },
  dataTable: {
    fontSize: '13px',
    lineHeight: '18px',
    fontWeight: 400,
    fontVariantNumeric: 'tabular-nums',
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
