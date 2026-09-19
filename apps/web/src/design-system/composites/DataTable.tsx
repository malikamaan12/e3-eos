/**
 * EOS / Data / DataTable
 * Conforms to Master Plan Section 6.3 and Section 12 (Tables & High-Density Data).
 */

import React from 'react';
import { TOKENS } from '../foundations/tokens.js';

export interface ColumnDef<T> {
  key: string;
  header: string;
  width?: string | number;
  minWidth?: string | number;
  align?: 'left' | 'center' | 'right';
  isNumeric?: boolean;
  isSticky?: boolean;
  render?: (item: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  minWidth?: string | number;
  stickyHeader?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  style?: React.CSSProperties;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  minWidth = '1000px',
  stickyHeader = true,
  isLoading = false,
  emptyMessage = 'No records found matching current criteria.',
  onRowClick,
  style,
}: DataTableProps<T>) {
  return (
    <div
      style={{
        width: '100%',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        border: '1px solid var(--border-default, #2A374B)',
        borderRadius: TOKENS.radius.card,
        backgroundColor: 'var(--surface-1, #0F1624)',
        boxShadow: TOKENS.elevation.level1,
        ...style,
      }}
    >
      <table
        style={{
          width: '100%',
          minWidth: minWidth,
          borderCollapse: 'collapse',
          textAlign: 'left',
          fontSize: '13px',
        }}
      >
        <thead>
          <tr
            style={{
              backgroundColor: 'var(--surface-2, #151E2E)',
              borderBottom: '2px solid var(--border-default, #2A374B)',
              position: stickyHeader ? 'sticky' : 'static',
              top: 0,
              zIndex: 10,
            }}
          >
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: '12px 16px',
                  fontWeight: 700,
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--text-secondary, #CBD5E1)',
                  width: col.width,
                  minWidth: col.minWidth,
                  textAlign: col.align || (col.isNumeric ? 'right' : 'left'),
                  position: col.isSticky ? 'sticky' : undefined,
                  left: col.isSticky ? 0 : undefined,
                  backgroundColor: col.isSticky ? 'var(--surface-2, #151E2E)' : undefined,
                  zIndex: col.isSticky ? 11 : undefined,
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted, #94A3B8)' }}>
                <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid var(--border-default, #2A374B)', borderTopColor: 'var(--accent, #D97706)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <div style={{ marginTop: '8px', fontSize: '13px' }}>Loading records...</div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted, #94A3B8)' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📂</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary, #F8FAFC)' }}>{emptyMessage}</div>
              </td>
            </tr>
          ) : (
            data.map((item, rowIdx) => (
              <tr
                key={keyExtractor(item, rowIdx)}
                onClick={() => onRowClick && onRowClick(item)}
                style={{
                  borderBottom: '1px solid var(--border-subtle, #1D2939)',
                  backgroundColor: rowIdx % 2 === 1 ? 'var(--surface-inset, rgba(255,255,255,0.02))' : 'transparent',
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: `background-color ${TOKENS.motion.fast}`,
                }}
                onMouseEnter={(e) => {
                  if (onRowClick) e.currentTarget.style.backgroundColor = 'var(--surface-2, #151E2E)';
                }}
                onMouseLeave={(e) => {
                  if (onRowClick) e.currentTarget.style.backgroundColor = rowIdx % 2 === 1 ? 'var(--surface-inset, rgba(255,255,255,0.02))' : 'transparent';
                }}
              >
                {columns.map((col) => {
                  const content = col.render ? col.render(item, rowIdx) : (item as any)[col.key];
                  return (
                    <td
                      key={col.key}
                      style={{
                        padding: '12px 16px',
                        color: 'var(--text-primary, #F8FAFC)',
                        textAlign: col.align || (col.isNumeric ? 'right' : 'left'),
                        fontVariantNumeric: col.isNumeric ? 'tabular-nums' : undefined,
                        position: col.isSticky ? 'sticky' : undefined,
                        left: col.isSticky ? 0 : undefined,
                        backgroundColor: col.isSticky ? (rowIdx % 2 === 1 ? 'var(--surface-inset, rgba(255,255,255,0.02))' : 'var(--surface-1, #0F1624)') : undefined,
                        zIndex: col.isSticky ? 5 : undefined,
                      }}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
