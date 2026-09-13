/**
 * EOS / Governance / StageTracker
 * Conforms to Master Plan Section 6.5 and UI Finding 4.
 */

import React from 'react';
import { TOKENS } from '../foundations/tokens.js';
import { Badge } from '../primitives/Badge.js';

export interface StageItem {
  id: string;
  number: number;
  name: string;
  activitiesCount: number;
  gatesCount: number;
  isCurrent?: boolean;
  isTarget?: boolean;
  isCompleted?: boolean;
  isBlocked?: boolean;
}

export interface StageTrackerProps {
  stages: StageItem[];
  onSelectStage?: (stage: StageItem) => void;
  style?: React.CSSProperties;
}

export const StageTracker: React.FC<StageTrackerProps> = ({
  stages,
  onSelectStage,
  style,
}) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '12px',
        width: '100%',
        ...style,
      }}
    >
      {stages.map((stage) => {
        const isCurrent = stage.isCurrent;
        const isTarget = stage.isTarget;
        const isCompleted = stage.isCompleted;
        const isBlocked = stage.isBlocked;

        const borderColor = isBlocked
          ? '#dc2626'
          : isCurrent
          ? '#2563eb'
          : isTarget
          ? '#d97706'
          : isCompleted
          ? '#059669'
          : TOKENS.border.default.light;

        const bgColor = isBlocked
          ? '#fef2f2'
          : isCurrent
          ? '#eff6ff'
          : isTarget
          ? '#fffbeb'
          : '#ffffff';

        return (
          <div
            key={stage.id}
            onClick={() => onSelectStage && onSelectStage(stage)}
            style={{
              padding: '14px',
              borderRadius: TOKENS.radius.card,
              border: `1px solid ${borderColor}`,
              backgroundColor: bgColor,
              boxShadow: isCurrent || isTarget ? TOKENS.elevation.level2 : TOKENS.elevation.level1,
              cursor: onSelectStage ? 'pointer' : 'default',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              transition: `all ${TOKENS.motion.fast}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: isCurrent ? '#1d4ed8' : isTarget ? '#b45309' : TOKENS.text.muted.light,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Stage {stage.number < 10 ? `0${stage.number}` : stage.number}
              </span>
              {isCurrent && <Badge variant="primary" size="sm">Current</Badge>}
              {isTarget && <Badge variant="accent" size="sm">Target</Badge>}
              {isCompleted && <Badge variant="success" size="sm">✓ Done</Badge>}
              {isBlocked && <Badge variant="danger" size="sm">Blocked</Badge>}
            </div>

            <div style={{ fontSize: '13px', fontWeight: 700, color: TOKENS.text.primary.light }}>
              {stage.name}
            </div>

            <div style={{ fontSize: '11px', color: TOKENS.text.secondary.light, marginTop: '2px' }}>
              {stage.activitiesCount} Activities • {stage.gatesCount} Required Gate{stage.gatesCount === 1 ? '' : 's'}
            </div>
          </div>
        );
      })}
    </div>
  );
};
