/**
 * EOS / Governance / LinkageBar
 * Enforces E3's 7-Point Scope Traceability Invariant:
 * Scope Requirement = Owner + Date + Document + Design + BOQ + Approval + Evidence
 * Conforms to Master Plan Section 16 (Traceability & Audit UX).
 */

import React from 'react';
import { TOKENS } from '../foundations/tokens.js';

export interface TraceabilityPoint {
  id: 'owner' | 'date' | 'document' | 'design' | 'boq' | 'approval' | 'evidence';
  label: string;
  isSatisfied: boolean;
  value?: string;
  url?: string;
}

export interface LinkageBarProps {
  points?: Partial<Record<'owner' | 'date' | 'document' | 'design' | 'boq' | 'approval' | 'evidence', { satisfied: boolean; text?: string }>>;
  style?: React.CSSProperties;
}

export const LinkageBar: React.FC<LinkageBarProps> = ({ points = {}, style }) => {
  const schema: { id: 'owner' | 'date' | 'document' | 'design' | 'boq' | 'approval' | 'evidence'; label: string }[] = [
    { id: 'owner', label: 'Owner' },
    { id: 'date', label: 'Date' },
    { id: 'document', label: 'Document' },
    { id: 'design', label: 'Design' },
    { id: 'boq', label: 'BOQ' },
    { id: 'approval', label: 'Approval' },
    { id: 'evidence', label: 'Evidence' },
  ];

  const satisfiedCount = schema.filter((s) => points[s.id]?.satisfied).length;
  const isComplete = satisfiedCount === 7;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '10px 14px',
        backgroundColor: isComplete ? '#f0fdf4' : '#fffbeb',
        border: `1px solid ${isComplete ? '#bbf7d0' : '#fde68a'}`,
        borderRadius: TOKENS.radius.control,
        fontSize: '12px',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 700, color: isComplete ? '#166534' : '#92400e' }}>
            7-Point Traceability Thread:
          </span>
          <span style={{ color: TOKENS.text.secondary.light }}>
            Scope = Owner + Date + Document + Design + BOQ + Approval + Evidence
          </span>
        </div>
        <span
          style={{
            fontWeight: 700,
            fontSize: '11px',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: isComplete ? '#dcfce7' : '#fef3c7',
            color: isComplete ? '#166534' : '#b45309',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {satisfiedCount} / 7 Verified
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        {schema.map((point) => {
          const status = points[point.id];
          const ok = status?.satisfied;
          return (
            <div
              key={point.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: ok ? '#ffffff' : '#fee2e2',
                border: `1px solid ${ok ? '#86efac' : '#fca5a5'}`,
                color: ok ? '#15803d' : '#991b1b',
                fontWeight: 600,
                fontSize: '11px',
              }}
              title={status?.text || (ok ? 'Verified' : 'Missing required link')}
            >
              <span>{ok ? '✓' : '⚠️'}</span>
              <span>{point.label}</span>
              {status?.text && <span style={{ opacity: 0.75 }}>({status.text})</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
