import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Badge, Card } from '../components/DesignSystem.js';

interface MasterGanttViewProps {
  projectId: string;
}

export const MasterGanttView: React.FC<MasterGanttViewProps> = ({ projectId }) => {
  const { apiClient, refreshTrigger } = useEosContext();

  const [loading, setLoading] = useState<boolean>(true);
  const [ganttData, setGanttData] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const data = await apiClient.getGanttSchedule(projectId).catch(() => null);
        if (isMounted) {
          setGanttData(data);
          if (data?.schedule?.tasks?.length > 0) {
            setSelectedTask(data.schedule.tasks[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load gantt schedule:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [apiClient, projectId, refreshTrigger]);

  if (loading && !ganttData) {
    return <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Calculating Critical Path Method (CPM) timeline...</div>;
  }

  const schedule = ganttData?.schedule || {};
  const tasks = schedule?.tasks || [];
  const shifts = ganttData?.shifts || [];
  const projectDuration = schedule?.projectDurationHours || 86;
  const criticalCount = schedule?.criticalTasksCount || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* CPM Engine Top Banner */}
      <div
        style={{
          backgroundColor: '#0f172a',
          color: '#ffffff',
          borderRadius: '8px',
          padding: '20px 24px',
          border: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Deterministic CPM Scheduling Engine
            </span>
            <Badge variant="danger">{criticalCount} Critical Path Activities</Badge>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
            Critical Path Method: Zero Total Float Defines Venue Delivery Horizon
          </div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            Early Start (ES), Early Finish (EF), Late Start (LS), Late Finish (LF) and total float computed dynamically across DAG dependencies.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Bump-In Window</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#f59e0b' }}>{projectDuration} Hours</div>
          </div>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '12px',
        }}
      >
        <Card style={{ padding: '16px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Critical Path Tasks</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444', margin: '4px 0' }}>
            {criticalCount}
          </div>
          <div style={{ fontSize: '11px', color: '#b91c1c' }}>Zero float: Any delay moves show date</div>
        </Card>

        <Card style={{ padding: '16px', borderLeft: '4px solid #2563eb' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Project Tasks</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#2563eb', margin: '4px 0' }}>
            {schedule.totalTasks || tasks.length}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Acyclic DAG network</div>
        </Card>

        <Card style={{ padding: '16px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Operational Shifts</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', margin: '4px 0' }}>
            {shifts.length}
          </div>
          <div style={{ fontSize: '11px', color: '#047857' }}>24/7 round-the-clock site presence</div>
        </Card>

        <Card style={{ padding: '16px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Noise Curfew Window</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', margin: '4px 0' }}>
            23:00 - 06:00
          </div>
          <div style={{ fontSize: '11px', color: '#b45309' }}>Max 65 dB (Heavy Rigging Only)</div>
        </Card>
      </div>

      {/* Interactive Gantt Chart & Critical Path Matrix */}
      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              Operational Critical Path Timeline (Hour 0 to Hour {projectDuration})
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              Red bars indicate zero-float critical activities. Amber bars indicate float buffer.
            </p>
          </div>
        </div>

        {/* Visual Gantt Bar Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {tasks.map((t: any) => {
            const leftPct = (t.earlyStartHours / projectDuration) * 100;
            const widthPct = Math.max(3, (t.durationHours / projectDuration) * 100);

            return (
              <div
                key={t.id}
                onClick={() => setSelectedTask(t)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '260px 1fr 100px',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: selectedTask?.id === t.id ? '#f1f5f9' : '#ffffff',
                  border: selectedTask?.id === t.id ? '1px solid #cbd5e1' : '1px solid #f1f5f9',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '12px', color: t.isCritical ? '#ef4444' : '#2563eb' }}>
                      {t.code}
                    </span>
                    {t.isCritical && (
                      <span
                        style={{
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: '3px',
                          textTransform: 'uppercase',
                        }}
                      >
                        CRITICAL
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.title}
                  </div>
                </div>

                {/* Timeline Bar Track */}
                <div style={{ position: 'relative', height: '24px', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      top: '2px',
                      bottom: '2px',
                      backgroundColor: t.isCritical ? '#ef4444' : '#3b82f6',
                      borderRadius: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 700,
                      boxShadow: t.isCritical ? '0 0 8px rgba(239, 68, 68, 0.4)' : 'none',
                    }}
                  >
                    {t.durationHours}h
                  </div>
                </div>

                <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748b' }}>
                  Float: <strong style={{ color: t.isCritical ? '#ef4444' : '#16a34a' }}>{t.totalFloatHours}h</strong>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 24/7 Site Bump-in Shift Log & Noise Curfews */}
      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              24/7 Venue Bump-In Operational Shifts
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              Continuous 8-hour shift rotation strictly enforcing Qatar Environmental Noise Law No. 30.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {shifts.slice(0, 6).map((shift: any) => (
            <div
              key={shift.shiftNumber}
              style={{
                border: shift.isCurfewActive ? '1.5px solid #fde68a' : '1px solid #e2e8f0',
                backgroundColor: shift.isCurfewActive ? '#fffbeb' : '#ffffff',
                borderRadius: '6px',
                padding: '14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                  {shift.label}
                </span>
                <Badge variant={shift.isCurfewActive ? 'warning' : 'info'} size="sm">
                  {shift.shiftType?.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>

              <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                Noise Threshold: <strong>{shift.allowedNoiseDb} dB</strong>
              </div>

              {shift.isCurfewActive && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#b45309', fontWeight: 600 }}>
                  ⚠️ Noise Curfew Active: Heavy lift & crane assembly only. Acoustic testing strictly prohibited.
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
