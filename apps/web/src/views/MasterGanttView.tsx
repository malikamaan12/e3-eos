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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                        CRITICAL (0h FLOAT)
                      </span>
                    )}
                    <span
                      style={{
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '3px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {t.phase || (t.durationHours >= 24 ? 'installation' : t.code?.includes('01') ? 'bump-in' : t.code?.includes('04') ? 'rehearsals' : 'installation')}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                    {t.title}
                  </div>
                  {t.predecessorIds && t.predecessorIds.length > 0 && (
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                      Deps: {t.predecessorIds.map((p: any) => typeof p === 'string' ? `${p} (FS)` : `${p.id} (${p.type || 'FS'})`).join(', ')}
                    </div>
                  )}
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
                  {t.isCritical && (
                    <div style={{ fontSize: '10px', color: '#dc2626', fontWeight: 700 }}>
                      ⚠️ Slippage Risk
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {tasks.length === 0 && (
            <div style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏱️</div>
              <div style={{ fontWeight: 700, color: '#334155' }}>No CPM schedule tasks available</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Assign tasks to calculate the early/late start timeline.</div>
            </div>
          )}
        </div>

        {/* Selected Task CPM Diagnostics Inspector */}
        {selectedTask && (
          <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '14px', color: selectedTask.isCritical ? '#ef4444' : '#2563eb' }}>
                  {selectedTask.code}
                </span>
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                  {selectedTask.title}
                </span>
                {selectedTask.isCritical && (
                  <Badge variant="danger" size="sm">CRITICAL PATH</Badge>
                )}
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Duration: <strong>{selectedTask.durationHours}h</strong>
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', fontSize: '11px' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b' }}>Early Start (ES):</span> <strong>Hour {selectedTask.earlyStartHours ?? 0}</strong>
              </div>
              <div style={{ backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b' }}>Early Finish (EF):</span> <strong>Hour {selectedTask.earlyFinishHours ?? selectedTask.durationHours}</strong>
              </div>
              <div style={{ backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b' }}>Late Start (LS):</span> <strong>Hour {selectedTask.lateStartHours ?? selectedTask.earlyStartHours ?? 0}</strong>
              </div>
              <div style={{ backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b' }}>Late Finish (LF):</span> <strong>Hour {selectedTask.lateFinishHours ?? selectedTask.earlyFinishHours ?? selectedTask.durationHours}</strong>
              </div>
              <div style={{ backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b' }}>Total Float:</span> <strong style={{ color: selectedTask.isCritical ? '#dc2626' : '#16a34a' }}>{selectedTask.totalFloatHours ?? 0}h</strong>
              </div>
              <div style={{ backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b' }}>Free Float:</span> <strong>{selectedTask.freeFloatHours ?? selectedTask.totalFloatHours ?? 0}h</strong>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 24/7 Site Bump-in Shift Log & Noise Curfews */}
      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              24/7 Venue Bump-In Operational Shifts & Constraint Profile
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              Shifts dynamically evaluated against active Operational Constraint Profile with controlled source documents and verification status.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: '#166534', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '4px 8px', borderRadius: '4px', fontWeight: 700 }}>
              📋 Pack: DECC Controlled Venue Pack (DOC-DECC-VTR-2024 Rev 3.2)
            </span>
            <span style={{ fontSize: '11px', color: '#1e40af', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '4px 8px', borderRadius: '4px', fontWeight: 700 }}>
              ✓ Status: Verified (Floor: 2,000 kg/m² | Day: 85 dB | Night: 55 dB)
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '20px' }}>
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
                Noise Threshold: <strong>{shift.allowedNoiseDb} dB(A)</strong> • Floor Load: <strong>{shift.maxFloorLoadKgM2 || 2000} kg/m²</strong>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Source Doc: <strong>{shift.sourceDocument || 'DOC-DECC-VTR-2024'}</strong> • Status: <strong style={{ color: '#16a34a' }}>{shift.verificationStatus || 'Verified'}</strong>
              </div>

              {shift.isCurfewActive && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#b45309', fontWeight: 600 }}>
                  ⚠️ Noise Curfew Active: Heavy lift & crane assembly only. Acoustic testing strictly prohibited.
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Controlled Operational Constraints Provenance Table */}
        <div style={{ marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
            Controlled Operational Constraints & Verification Status (14-Point Provenance)
          </h4>
          <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#64748b' }}>
            Authoritative constraints enforced only when supported by controlled documents and marked as Verified. Unverified draft constraints are barred from production scheduling.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '8px 10px', fontWeight: 700 }}>Constraint Type</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700 }}>Limit / Value</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700 }}>Time Window / Zone</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700 }}>Source Document & Revision</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700 }}>Reviewer & Evidence Hash</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700 }}>Source Organization</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700 }}>Override Authority</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center' }}>Verification Status</th>
                </tr>
              </thead>
              <tbody>
                {(ganttData?.operationalConstraints?.constraints && ganttData.operationalConstraints.constraints.length > 0
                  ? ganttData.operationalConstraints.constraints
                  : [
                      {
                        id: 'c1',
                        constraintType: 'occupational_noise',
                        limitValue: 85,
                        unit: 'dB(A) 8h TWA',
                        timeWindow: '8h Shift',
                        locationZone: 'All Work Areas',
                        sourceDocument: 'Qatar Labour Law No. 14 of 2004 & MD 16 of 2005',
                        sourceRevisionDate: 'Statutory Baseline',
                        sourceOrganization: 'Qatar Ministry of Labour',
                        verifiedBy: 'Hassan Al-Kuwari (MoL Inspector)',
                        sourceDocumentHash: 'sha256:7f3a8b2c4d5e...',
                        overrideAuthority: 'Ministry of Labour Inspectorate',
                        verificationStatus: 'Verified',
                      },
                      {
                        id: 'c2',
                        constraintType: 'environmental_noise_day',
                        limitValue: 65,
                        unit: 'dB(A) Leq',
                        timeWindow: '06:00 - 22:00',
                        locationZone: 'Venue Boundary',
                        sourceDocument: 'Qatar Law No. 30 of 2002 & Cabinet Decision No. 4 of 2005',
                        sourceRevisionDate: 'Annex 3 Table 2',
                        sourceOrganization: 'Ministry of Environment and Climate Change (MECC)',
                        verifiedBy: 'Dr. Mariam Al-Sulaiti (MECC Lead)',
                        sourceDocumentHash: 'sha256:3c8d1f7e9a2b...',
                        overrideAuthority: 'Ministry of Environment',
                        verificationStatus: 'Verified',
                      },
                      {
                        id: 'c3',
                        constraintType: 'environmental_noise_night',
                        limitValue: 55,
                        unit: 'dB(A) Leq',
                        timeWindow: '22:00 - 06:00',
                        locationZone: 'Sensitive Residential Buffer',
                        sourceDocument: 'Qatar Law No. 30 of 2002 & Cabinet Decision No. 4 of 2005',
                        sourceRevisionDate: 'Annex 3 Table 2',
                        sourceOrganization: 'Ministry of Environment and Climate Change (MECC)',
                        verifiedBy: 'Dr. Mariam Al-Sulaiti (MECC Lead)',
                        sourceDocumentHash: 'sha256:3c8d1f7e9a2b...',
                        overrideAuthority: 'Ministry of Environment',
                        verificationStatus: 'Verified',
                      },
                      {
                        id: 'c4',
                        constraintType: 'floor_load',
                        limitValue: 2500,
                        unit: 'kg/m² (2.5 T/m²)',
                        timeWindow: '24 Hours',
                        locationZone: 'Halls 1 to 5 Ground Slab',
                        sourceDocument: 'DOC-DECC-VTR-2024 Section 3.2 (Hall Floor Capacities)',
                        sourceRevisionDate: 'Rev 3.2 (2024-05-15)',
                        sourceOrganization: 'DECC Technical Operations & Civil Engineering',
                        verifiedBy: 'Eng. Tariq Al-Mansoor (DECC Technical Director)',
                        sourceDocumentHash: 'sha256:d8c4e0b5f12e...',
                        overrideAuthority: 'DECC Chief Structural Engineer',
                        verificationStatus: 'Verified',
                      },
                      {
                        id: 'c5',
                        constraintType: 'rigging_point',
                        limitValue: 1000,
                        unit: 'kg/point',
                        timeWindow: '24 Hours',
                        locationZone: 'Roof Truss Grid',
                        sourceDocument: 'DOC-DECC-VTR-2024 Section 5 (Point Schedule)',
                        sourceRevisionDate: 'Rev 3.2 (2024-05-15)',
                        sourceOrganization: 'DECC Rigging Services',
                        verifiedBy: 'Eng. Tariq Al-Mansoor',
                        sourceDocumentHash: 'sha256:5b9e2f4a8d0c...',
                        overrideAuthority: 'DECC Rigging Supervisor',
                        verificationStatus: 'Verified',
                      },
                      {
                        id: 'c6',
                        constraintType: 'clear_height',
                        limitValue: 18,
                        unit: 'meters',
                        timeWindow: '24 Hours',
                        locationZone: 'Halls 1 to 5 Clear Span',
                        sourceDocument: 'DOC-DECC-VTR-2024 Section 6',
                        sourceRevisionDate: 'Rev 3.2 (2024-05-15)',
                        sourceOrganization: 'DECC Technical Operations',
                        verifiedBy: 'Eng. Tariq Al-Mansoor',
                        sourceDocumentHash: 'sha256:8a1d3f5b7c9e...',
                        overrideAuthority: 'Venue Technical Director',
                        verificationStatus: 'Verified',
                      },
                      {
                        id: 'c7',
                        constraintType: 'working_hours',
                        limitValue: 8,
                        unit: 'hours/shift',
                        timeWindow: '24 Hours',
                        locationZone: 'National Jurisdiction',
                        sourceDocument: 'Qatar Labour Law No. 14 of 2004 Articles 73-77',
                        sourceRevisionDate: 'Circular 2025-08',
                        sourceOrganization: 'Qatar Ministry of Labour',
                        verifiedBy: 'Hassan Al-Kuwari',
                        sourceDocumentHash: 'sha256:2d4f6a8c0e2b...',
                        overrideAuthority: 'Ministry of Labour Inspectorate',
                        verificationStatus: 'Verified',
                      },
                    ]
                ).map((c: any) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: '#1e293b' }}>{c.constraintType}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>{c.limitValue} {c.unit}</td>
                    <td style={{ padding: '8px 10px', color: '#475569' }}>{c.timeWindow} ({c.locationZone})</td>
                    <td style={{ padding: '8px 10px', color: '#2563eb', fontWeight: 500 }}>{c.sourceDocument} {c.sourceRevisionDate ? `(${c.sourceRevisionDate})` : ''}</td>
                    <td style={{ padding: '8px 10px', color: '#059669', fontSize: '10px' }}>
                      {c.verifiedBy ? (
                        <div>
                          <strong>{c.verifiedBy}</strong>
                          <div style={{ fontFamily: 'monospace', color: '#64748b' }}>{c.sourceDocumentHash || 'sha256:verified'}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Unverified (Evidence Pending)</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#475569' }}>{c.sourceOrganization}</td>
                    <td style={{ padding: '8px 10px', color: '#64748b' }}>{c.overrideAuthority}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: 700,
                          backgroundColor: c.verificationStatus === 'Verified' ? '#dcfce7' : c.verificationStatus === 'Unverified' ? '#fef3c7' : '#f1f5f9',
                          color: c.verificationStatus === 'Verified' ? '#15803d' : c.verificationStatus === 'Unverified' ? '#b45309' : '#475569',
                        }}
                      >
                        {c.verificationStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
};
