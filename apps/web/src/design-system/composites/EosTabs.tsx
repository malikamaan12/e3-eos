/**
 * E3-EOS Unified Design System — EosTabs & EosSegmentedControl
 * Conforms strictly to E3-EOS Global UI Component Rules (Sections 6, 26).
 */

import React, { useRef, useEffect } from 'react';
import { TOKENS, EosCommonProps } from '../foundations/tokens.js';

export interface EosTabItem {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
  disabledReason?: string;
  icon?: React.ReactNode;
}

export interface EosTabsProps extends EosCommonProps {
  tabs: EosTabItem[];
  activeTabId: string;
  onChange: (tabId: string) => void;
  variant?: 'page' | 'compact';
  style?: React.CSSProperties;
}

export const EosTabs: React.FC<EosTabsProps> = ({
  tabs,
  activeTabId,
  onChange,
  variant = 'page',
  testId,
  style,
}) => {
  const tabListRef = useRef<HTMLDivElement>(null);
  const isPage = variant === 'page';
  const height = isPage ? '44px' : '36px';
  const fontSize = isPage ? '14px' : '13px';

  // Keyboard navigation per Section 6.2: Left/Right arrow, Home/End
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const enabledTabs = tabs.filter((t) => !t.disabled);
    const currentIndex = enabledTabs.findIndex((t) => t.id === tabs[index].id);

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextTab = enabledTabs[(currentIndex + 1) % enabledTabs.length];
      if (nextTab) onChange(nextTab.id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevTab = enabledTabs[(currentIndex - 1 + enabledTabs.length) % enabledTabs.length];
      if (prevTab) onChange(prevTab.id);
    } else if (e.key === 'Home') {
      e.preventDefault();
      if (enabledTabs[0]) onChange(enabledTabs[0].id);
    } else if (e.key === 'End') {
      e.preventDefault();
      if (enabledTabs[enabledTabs.length - 1]) {
        onChange(enabledTabs[enabledTabs.length - 1].id);
      }
    }
  };

  return (
    <div
      ref={tabListRef}
      role="tablist"
      data-testid={testId}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        overflowX: 'auto',
        maxWidth: '100%',
        scrollbarWidth: 'none',
        borderBottom: isPage ? '1px solid var(--border-subtle, #1D2939)' : 'none',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {tabs.map((tab, idx) => {
        const isActive = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-disabled={tab.disabled}
            disabled={tab.disabled}
            title={tab.disabled ? tab.disabledReason : undefined}
            tabIndex={isActive ? 0 : -1}
            onClick={() => !tab.disabled && onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height,
              padding: isPage ? '0 16px' : '0 12px',
              fontSize,
              fontWeight: 600,
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
              backgroundColor: 'transparent',
              color: isActive
                ? 'var(--text-primary, #F8FAFC)'
                : tab.disabled
                ? 'var(--text-disabled, #64748B)'
                : 'var(--text-secondary, #CBD5E1)',
              border: 'none',
              borderBottom: isActive ? `2px solid ${TOKENS.brand.accent}` : '2px solid transparent',
              cursor: tab.disabled ? 'not-allowed' : 'pointer',
              outline: 'none',
              transition: 'color 120ms ease, border-color 120ms ease',
              boxSizing: 'border-box',
            }}
          >
            {tab.icon && (
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>{tab.icon}</span>
            )}
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1px 6px',
                  borderRadius: TOKENS.radius.pill,
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: isActive ? 'var(--surface-3, #1B2638)' : 'var(--surface-2, #151E2E)',
                  color: 'var(--text-secondary, #CBD5E1)',
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export interface EosSegmentedControlProps extends EosCommonProps {
  options: { id: string; label: string; icon?: React.ReactNode }[];
  selectedId: string;
  onChange: (id: string) => void;
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

export const EosSegmentedControl: React.FC<EosSegmentedControlProps> = ({
  options,
  selectedId,
  onChange,
  size = 'md',
  testId,
  style,
}) => {
  const height = size === 'sm' ? '36px' : '40px';

  return (
    <div
      role="group"
      data-testid={testId}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px',
        backgroundColor: 'var(--surface-inset, #0B111D)',
        borderRadius: TOKENS.radius.md,
        border: '1px solid var(--border-subtle, #1D2939)',
        height,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {options.map((opt) => {
        const isSelected = opt.id === selectedId;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '100%',
              padding: '0 12px',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: 'inherit',
              borderRadius: TOKENS.radius.sm,
              border: isSelected ? '1px solid var(--border-default, #2A374B)' : '1px solid transparent',
              backgroundColor: isSelected ? 'var(--surface-2, #151E2E)' : 'transparent',
              color: isSelected ? 'var(--text-primary, #F8FAFC)' : 'var(--text-secondary, #CBD5E1)',
              cursor: 'pointer',
              outline: 'none',
              transition: 'background-color 120ms ease, color 120ms ease',
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}
          >
            {opt.icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{opt.icon}</span>}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
