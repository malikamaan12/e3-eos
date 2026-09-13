/**
 * EOS / Template / DashboardTemplate
 * Standard Dashboard Template (Master Plan Section 8.1).
 */

import React from 'react';
import { TOKENS } from '../foundations/tokens.js';

export interface DashboardTemplateProps {
  header: React.ReactNode;
  urgentAlertStrip?: React.ReactNode;
  kpiMetricsStrip?: React.ReactNode;
  primaryContent: React.ReactNode;
  secondarySidebar?: React.ReactNode;
  style?: React.CSSProperties;
}

export const DashboardTemplate: React.FC<DashboardTemplateProps> = ({
  header,
  urgentAlertStrip,
  kpiMetricsStrip,
  primaryContent,
  secondarySidebar,
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
      {/* 1. Header & Role Context */}
      <div>{header}</div>

      {/* 2. Urgent Action / Alert Strip */}
      {urgentAlertStrip && <div>{urgentAlertStrip}</div>}

      {/* 3. Primary KPI Metric Strip */}
      {kpiMetricsStrip && <div>{kpiMetricsStrip}</div>}

      {/* 4. Main Dashboard Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: secondarySidebar ? 'minmax(0, 2fr) minmax(320px, 1fr)' : '1fr',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {primaryContent}
        </div>

        {secondarySidebar && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {secondarySidebar}
          </div>
        )}
      </div>
    </div>
  );
};
