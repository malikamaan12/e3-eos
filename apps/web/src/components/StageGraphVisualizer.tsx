import React from 'react';
import { useEosContext } from '../context/EosContext.js';
import { getStageTitleInLocale } from '../localization.js';

export interface StageNode {
  stageNumber: number;
  stageCode: string;
  status: 'completed' | 'in_progress' | 'blocked' | 'not_started';
  hasCriticalGate?: boolean;
  completionPercent?: number;
}

export interface StageGraphVisualizerProps {
  stages?: StageNode[];
  activeStageNumber: number;
  onSelectStage: (stageNumber: number) => void;
}

const DEFAULT_STAGES: StageNode[] = [
  { stageNumber: 1, stageCode: 'STAGE-01', status: 'completed', completionPercent: 100 },
  { stageNumber: 2, stageCode: 'STAGE-02', status: 'completed', completionPercent: 100 },
  { stageNumber: 3, stageCode: 'STAGE-03', status: 'completed', completionPercent: 100 },
  { stageNumber: 4, stageCode: 'STAGE-04', status: 'completed', completionPercent: 100 },
  { stageNumber: 5, stageCode: 'STAGE-05', status: 'completed', completionPercent: 100 },
  { stageNumber: 6, stageCode: 'STAGE-06', status: 'completed', completionPercent: 100 },
  { stageNumber: 7, stageCode: 'STAGE-07', status: 'completed', completionPercent: 100 },
  { stageNumber: 8, stageCode: 'STAGE-08', status: 'completed', completionPercent: 100 },
  { stageNumber: 9, stageCode: 'STAGE-09', status: 'completed', completionPercent: 100 },
  { stageNumber: 10, stageCode: 'STAGE-10', status: 'in_progress', hasCriticalGate: true, completionPercent: 85 },
  { stageNumber: 11, stageCode: 'STAGE-11', status: 'not_started', completionPercent: 0 },
  { stageNumber: 12, stageCode: 'STAGE-12', status: 'not_started', completionPercent: 0 },
  { stageNumber: 13, stageCode: 'STAGE-13', status: 'not_started', completionPercent: 0 },
];

export const StageGraphVisualizer: React.FC<StageGraphVisualizerProps> = ({
  stages = DEFAULT_STAGES,
  activeStageNumber,
  onSelectStage,
}) => {
  const { currentLanguage } = useEosContext();

  const getStatusColor = (status: StageNode['status']) => {
    switch (status) {
      case 'completed':
        return { bg: '#ecfdf5', border: '#10b981', text: '#065f46', dot: '#059669' };
      case 'in_progress':
        return { bg: '#eff6ff', border: '#3b82f6', text: '#1d4ed8', dot: '#2563eb' };
      case 'blocked':
        return { bg: '#fef2f2', border: '#ef4444', text: '#b91c1c', dot: '#dc2626' };
      case 'not_started':
      default:
        return { bg: '#f8fafc', border: '#cbd5e1', text: '#64748b', dot: '#94a3b8' };
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        padding: '16px 20px',
        marginBottom: '20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>⚡</span>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
            {currentLanguage === 'ar' ? 'مخطط مراحل دورة حياة الفعالية (13 مرحلة)' : '13-Stage Event Lifecycle Stage Graph'}
          </h3>
        </div>
        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
            {currentLanguage === 'ar' ? 'مكتمل' : 'Completed'}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6' }} />
            {currentLanguage === 'ar' ? 'قيد التنفيذ' : 'In Progress'}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
            {currentLanguage === 'ar' ? 'بوابة أمان حرجة' : 'Critical Gate'}
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: '8px',
        }}
      >
        {stages.map((stg) => {
          const style = getStatusColor(stg.status);
          const isActive = stg.stageNumber === activeStageNumber;
          const stageTitle = getStageTitleInLocale(stg.stageNumber, currentLanguage);

          return (
            <div
              key={stg.stageNumber}
              onClick={() => onSelectStage(stg.stageNumber)}
              style={{
                backgroundColor: isActive ? '#f0fdf4' : style.bg,
                border: `2px solid ${isActive ? '#2563eb' : style.border}`,
                borderRadius: '6px',
                padding: '10px 8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                position: 'relative',
                boxShadow: isActive ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none',
              }}
            >
              {stg.hasCriticalGate && (
                <span
                  title="Critical Safety Gate overrides percentage progress"
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    fontSize: '12px',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                  }}
                >
                  !
                </span>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: style.text }}>
                  {stg.stageCode}
                </span>
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: style.dot,
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#1e293b',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.3,
                }}
                title={stageTitle}
              >
                {stageTitle}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
