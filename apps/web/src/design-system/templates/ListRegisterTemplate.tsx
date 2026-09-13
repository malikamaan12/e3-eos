/**
 * EOS / Template / ListRegisterTemplate
 * Standard List & Register Template (Master Plan Section 8.2).
 * Used for Projects, RFIs, Documents, Invoices, Suppliers, Users, and Incidents.
 */

import React from 'react';
import { TOKENS } from '../foundations/tokens.js';

export interface ListRegisterTemplateProps {
  title: string;
  count?: number;
  description?: string;
  primaryAction?: React.ReactNode;
  filterBar?: React.ReactNode;
  metricStrip?: React.ReactNode;
  tableOrCards: React.ReactNode;
  pagination?: React.ReactNode;
  style?: React.CSSProperties;
}

export const ListRegisterTemplate: React.FC<ListRegisterTemplateProps> = ({
  title,
  count,
  description,
  primaryAction,
  filterBar,
  metricStrip,
  tableOrCards,
  pagination,
  style,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        width: '100%',
        maxWidth: '1600px',
        margin: '0 auto',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {/* 1. Header Bar with Title, Count, Description, and Primary Action */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: TOKENS.text.primary.light }}>
              {title}
            </h1>
            {count !== undefined && (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  backgroundColor: TOKENS.surface.sunken.light,
                  color: TOKENS.text.secondary.light,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: `1px solid ${TOKENS.border.default.light}`,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {count}
              </span>
            )}
          </div>
          {description && (
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: TOKENS.text.secondary.light }}>
              {description}
            </p>
          )}
        </div>

        {primaryAction && <div>{primaryAction}</div>}
      </div>

      {/* 2. Metric Strip */}
      {metricStrip && <div>{metricStrip}</div>}

      {/* 3. Filter Bar */}
      {filterBar && <div>{filterBar}</div>}

      {/* 4. Main Data Table or Cards */}
      <div>{tableOrCards}</div>

      {/* 5. Pagination */}
      {pagination && <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{pagination}</div>}
    </div>
  );
};
