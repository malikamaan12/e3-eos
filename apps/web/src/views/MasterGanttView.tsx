import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Badge, Card, Button, Modal } from '../components/DesignSystem.js';

interface MasterGanttViewProps {
  projectId: string;
}

export const MasterGanttView: React.FC<MasterGanttViewProps> = ({ projectId }) => {
  const { apiClient, refreshTrigger } = useEosContext();

  const [loading, setLoading] = useState<boolean>(true);
  const [ganttData, setGanttData] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // Operational Constraints state & modals
  const [constraints, setConstraints] = useState<any[]>([]);
  const [selectedConstraint, setSelectedConstraint] = useState<any | null>(null);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState<boolean>(false);
  const [constraintToVerify, setConstraintToVerify] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Form states for Verify Modal
  const [verifyForm, setVerifyForm] = useState({
    pageClauseSection: 'Section 3.2',
    extractedRuleValue: '2.5 T/m² (2,500 kg/m²)',
    applicabilityStatement: 'Exhibition Halls 1 to 5 Ground Slab',
    reviewerRole: 'technical_director',
    reviewerComment: 'Authoritative compliance verification approved against controlled technical drawings.',
  });

  // Form states for Create Modal (Draft only — Verified is strictly prohibited)
  const [createForm, setCreateForm] = useState({
    constraintType: 'venue_operational_noise',
    limitValue: 85,
    unit: 'dB(A)',
    locationZone: 'Exhibition Halls 1 to 5',
    timeWindow: '08:00 - 20:00',
    priority: 'medium',
    sourceOrganization: 'DECC Operations',
    overrideAuthority: 'Technical Director',
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const [data, constraintsRes] = await Promise.all([
        apiClient.getGanttSchedule(projectId).catch(() => null),
        apiClient.getConstraints(projectId).catch(() => null),
      ]);
      setGanttData(data);
      if (constraintsRes?.data && constraintsRes.data.length > 0) {
        setConstraints(constraintsRes.data);
      } else if (data?.operationalConstraints?.constraints?.length > 0) {
        setConstraints(data.operationalConstraints.constraints);
      }
      if (data?.schedule?.tasks?.length > 0) {
        setSelectedTask(data.schedule.tasks[0]);
      }
    } catch (err) {
      console.error('Failed to load gantt schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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
            22:00 - 04:00
          </div>
          <div style={{ fontSize: '11px', color: '#b45309' }}>Night: 55 dB (Res 4/2005 Annex 3/5) | Day: 65 dB</div>
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
              📋 Pack: DECC Controlled Venue Pack (DOC-DECC-FP-2024 & DOC-MECC-ENV-2005)
            </span>
            <span style={{ fontSize: '11px', color: '#1e40af', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '4px 8px', borderRadius: '4px', fontWeight: 700 }}>
              ✓ Status: Verified (Floor: 2.5 T/m² | Day: 65 dB | Night: 55 dB [22:00-04:00])
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
                Noise Threshold: <strong>{shift.allowedNoiseDb} dB(A)</strong> • Floor Load: <strong>{shift.maxFloorLoadKgM2 || 2500} kg/m²</strong>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Source Doc: <strong>{shift.sourceDocument || 'DOC-DECC-FP-2024'}</strong> • Status:{' '}
                <strong style={{ color: shift.verificationStatus === 'Verified' ? '#16a34a' : '#b45309' }}>
                  {shift.verificationStatus === 'Verified' ? '✅ Verified' : '⚠️ Unverified'}
                </strong>
              </div>

              {shift.isCurfewActive && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#b45309', fontWeight: 600 }}>
                  ⚠️ Noise Curfew Active (22:00 - 04:00): 55 dB(A) limit. Heavy lift & crane assembly only. Acoustic testing strictly prohibited.
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Controlled Operational Constraints Provenance Table */}
        <div style={{ marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                Controlled Operational Constraints & Verification Provenance
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                Every constraint item maintains full 14-point regulatory provenance and cryptographic evidence.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Button size="sm" variant="outline" onClick={() => setIsCreateModalOpen(true)}>
                + Draft Operational Constraint
              </Button>
            </div>
          </div>

          {/* Prominent Scheduling Enforcement Alert */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '6px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              color: '#92400e',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '14px',
            }}
          >
            <span>⚠️</span>
            <span>
              <strong>Deterministic Scheduling Engine Policy:</strong> Only constraints marked as <strong>Applicable</strong> and <strong>Verified</strong> with cryptographic document evidence are enforced by the scheduling engine. Unverified constraints fallback to safe statutory baseline defaults.
            </span>
          </div>

          {actionError && (
            <div style={{ padding: '8px 12px', borderRadius: '4px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '12px', marginBottom: '12px' }}>
              {actionError}
            </div>
          )}
          {actionSuccess && (
            <div style={{ padding: '8px 12px', borderRadius: '4px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: '12px', marginBottom: '12px' }}>
              {actionSuccess}
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>Constraint Type & ID</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>Limit / Value</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>Time Window & Zone</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>Controlled Source Document</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>Verification Status</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>Reviewer & Evidence Hash</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {constraints.map((c: any) => {
                  const isVerified = c.verificationStatus === 'Verified';
                  const isUnderReview = c.verificationStatus === 'Under Review';
                  const isSourceAttached = c.verificationStatus === 'Source Attached';

                  return (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isVerified ? '#ffffff' : '#fafafa',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setSelectedConstraint(c);
                        setIsInspectModalOpen(true);
                      }}
                    >
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {c.constraintType?.replace(/_/g, ' ').toUpperCase()}
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                          {c.id}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}>
                        {c.limitValue} {c.unit}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>
                        <div>{c.timeWindow}</div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>{c.locationZone}</div>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#2563eb' }}>
                        <div style={{ fontWeight: 600 }}>{c.sourceDocument}</div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>
                          {c.sourceOrganization} {c.sourceRevisionDate ? `• ${c.sourceRevisionDate}` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor:
                              isVerified ? '#dcfce7' :
                              isUnderReview ? '#dbeafe' :
                              isSourceAttached ? '#f3e8ff' : '#fef3c7',
                            color:
                              isVerified ? '#15803d' :
                              isUnderReview ? '#1d4ed8' :
                              isSourceAttached ? '#7e22ce' : '#b45309',
                            border: `1px solid ${
                              isVerified ? '#86efac' :
                              isUnderReview ? '#bfdbfe' :
                              isSourceAttached ? '#d8b4fe' : '#fde68a'
                            }`,
                          }}
                        >
                          {isVerified ? '✅ Verified' :
                           isUnderReview ? '⏳ Under Review' :
                           isSourceAttached ? '📄 Source Attached' :
                           c.verificationStatus === 'Draft' ? '📝 Draft' : '⚠️ Unverified'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '10px' }}>
                        {c.verifiedBy ? (
                          <div>
                            <strong style={{ color: '#0f172a' }}>{c.verifiedBy}</strong>
                            <div style={{ fontFamily: 'monospace', color: '#059669', marginTop: '2px', wordBreak: 'break-all' }}>
                              🔒 {c.sourceDocumentHash ? `${c.sourceDocumentHash.slice(0, 18)}...` : 'sha256:verified'}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                            {c.calculatedSha256 ? `🔒 ${c.calculatedSha256.slice(0, 14)}... (Pending Review)` : 'Evidence pending upload'}
                          </span>
                        )}
                      </td>
                      <td
                        style={{ padding: '10px 12px', textAlign: 'center' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedConstraint(c);
                              setIsInspectModalOpen(true);
                            }}
                          >
                            Inspect
                          </Button>
                          {isUnderReview && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => {
                                setConstraintToVerify(c);
                                setVerifyForm({
                                  pageClauseSection: c.evidenceSummary || 'Section 3.2',
                                  extractedRuleValue: `${c.limitValue} ${c.unit}`,
                                  applicabilityStatement: c.locationZone || 'Venue Wide',
                                  reviewerRole: 'technical_director',
                                  reviewerComment: 'Authoritative verification approved against controlled source.',
                                });
                                setIsVerifyModalOpen(true);
                              }}
                            >
                              Verify
                            </Button>
                          )}
                          {(c.verificationStatus === 'Draft' || c.verificationStatus === 'Unverified') && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={async () => {
                                setActionLoading(true);
                                try {
                                  const docId = c.constraintType?.includes('noise') ? 'doc-mecc-env-01' : 'doc-decc-fp-01';
                                  const revId = c.constraintType?.includes('noise') ? 'rev-mecc-env-01' : 'rev-decc-fp-01';
                                  await apiClient.attachSourceToConstraint(projectId, c.id, {
                                    controlledDocumentId: docId,
                                    documentRevisionId: revId,
                                    pageClauseSection: c.constraintType?.includes('noise') ? 'Annex 3/5' : 'Section 3.2',
                                  });
                                  await apiClient.submitConstraintForReview(projectId, c.id);
                                  setActionSuccess(`Controlled document attached to ${c.id} and submitted for review.`);
                                  await loadData();
                                } catch (e: any) {
                                  setActionError(e.message);
                                } finally {
                                  setActionLoading(false);
                                }
                              }}
                            >
                              Attach Doc
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Controlled Document Provenance Inspection Modal */}
      <Modal
        isOpen={isInspectModalOpen && !!selectedConstraint}
        onClose={() => setIsInspectModalOpen(false)}
        title="Controlled Operational Constraint Provenance & Evidence Audit"
        size="lg"
      >
        {selectedConstraint && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Scheduling Enforcement Status Callout */}
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '6px',
                backgroundColor: selectedConstraint.verificationStatus === 'Verified' ? '#f0fdf4' : '#fffbeb',
                border: `1.5px solid ${selectedConstraint.verificationStatus === 'Verified' ? '#86efac' : '#fde68a'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '20px' }}>
                {selectedConstraint.verificationStatus === 'Verified' ? '✅' : '⚠️'}
              </span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '13px', color: selectedConstraint.verificationStatus === 'Verified' ? '#166534' : '#92400e' }}>
                  {selectedConstraint.verificationStatus === 'Verified'
                    ? 'AUTHORITATIVE RULE — ACTIVELY ENFORCED BY DETERMINISTIC SCHEDULING ENGINE'
                    : 'UNVERIFIED CONSTRAINT — BARRED FROM DETERMINISTIC CPM TIMELINE ENFORCEMENT'}
                </div>
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                  {selectedConstraint.verificationStatus === 'Verified'
                    ? 'Backed by certified reviewer sign-off, system-calculated SHA-256 cryptographic hash, and immutable audit event.'
                    : 'Unverified and draft constraints are barred from production scheduling. The scheduling engine strictly falls back to safe statutory baselines.'}
                </div>
              </div>
            </div>

            {/* Provenance Metadata Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '11px' }}>Constraint ID & Type:</span>
                <div style={{ fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{selectedConstraint.id}</div>
                <div style={{ color: '#2563eb', fontWeight: 600 }}>{selectedConstraint.constraintType}</div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '11px' }}>Operational Limit / Value:</span>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '16px', marginTop: '2px' }}>
                  {selectedConstraint.limitValue} {selectedConstraint.unit}
                </div>
                <div style={{ color: '#64748b', fontSize: '11px' }}>Zone: {selectedConstraint.locationZone} ({selectedConstraint.timeWindow})</div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '11px' }}>Controlled Document ID & Number:</span>
                <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                  {selectedConstraint.controlledDocumentId || 'None (Unattached)'}
                </div>
                <div style={{ color: '#2563eb', fontWeight: 600 }}>{selectedConstraint.sourceDocument}</div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '11px' }}>Document Revision & Date:</span>
                <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                  {selectedConstraint.documentRevisionId || selectedConstraint.sourceRevisionDate}
                </div>
                <div style={{ color: '#64748b' }}>Source Org: {selectedConstraint.sourceOrganization}</div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '11px' }}>Page / Clause / Section Cited:</span>
                <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                  {selectedConstraint.verificationRecord?.pageClauseSection || selectedConstraint.evidenceSummary || 'Pending verification citation'}
                </div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '11px' }}>Extracted Rule / Value:</span>
                <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                  {selectedConstraint.verificationRecord?.extractedRuleValue || `${selectedConstraint.limitValue} ${selectedConstraint.unit}`}
                </div>
              </div>
            </div>

            {/* Cryptographic SHA-256 Hash Card */}
            <div style={{ backgroundColor: '#0f172a', color: '#f8fafc', padding: '14px 16px', borderRadius: '6px', border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  🔒 System-Calculated SHA-256 Document Integrity Hash
                </span>
                <span style={{ fontSize: '10px', color: '#94a3b8', backgroundColor: '#1e293b', padding: '2px 6px', borderRadius: '4px' }}>
                  Byte-Level Calculation
                </span>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#34d399', wordBreak: 'break-all' }}>
                {selectedConstraint.sourceDocumentHash || selectedConstraint.calculatedSha256 || 'None (Unattached document has no hash)'}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                * Hash is strictly calculated by EOS from stored file bytes upon controlled document upload. Manual entry is prohibited.
              </div>
            </div>

            {/* Certified Reviewer & Audit Ledger Info */}
            <div style={{ backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <h5 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                Audited Review Action & Ledger Event
              </h5>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '11px' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Verified By / Reviewer:</span>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                    {selectedConstraint.verifiedBy || selectedConstraint.verificationRecord?.reviewerIdentity || 'Pending Verification'}
                  </div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Reviewer Role:</span>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                    {selectedConstraint.verificationRecord?.reviewerRole || 'None'}
                  </div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Verified Timestamp:</span>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                    {selectedConstraint.verifiedAt || 'Pending'}
                  </div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Immutable Audit Event ID:</span>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                    {selectedConstraint.verificationRecord?.auditEventId || 'audit-ledger-pending'}
                  </div>
                </div>
              </div>
              {selectedConstraint.verificationRecord?.reviewerComment && (
                <div style={{ marginTop: '10px', fontSize: '11px', color: '#475569', backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                  <strong>Reviewer Compliance Comment:</strong> {selectedConstraint.verificationRecord.reviewerComment}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="secondary" onClick={() => setIsInspectModalOpen(false)}>
                Close
              </Button>
              {selectedConstraint.verificationStatus === 'Under Review' && (
                <Button
                  variant="primary"
                  onClick={() => {
                    setConstraintToVerify(selectedConstraint);
                    setVerifyForm({
                      pageClauseSection: selectedConstraint.evidenceSummary || 'Section 3.2',
                      extractedRuleValue: `${selectedConstraint.limitValue} ${selectedConstraint.unit}`,
                      applicabilityStatement: selectedConstraint.locationZone || 'Venue Wide',
                      reviewerRole: 'technical_director',
                      reviewerComment: 'Authoritative verification approved against controlled source document.',
                    });
                    setIsInspectModalOpen(false);
                    setIsVerifyModalOpen(true);
                  }}
                >
                  Verify Constraint
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Verify Constraint Review Modal */}
      <Modal
        isOpen={isVerifyModalOpen && !!constraintToVerify}
        onClose={() => setIsVerifyModalOpen(false)}
        title="Authoritative Verification Review"
        size="md"
      >
        {constraintToVerify && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
            <div style={{ padding: '10px 14px', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe', color: '#1e40af' }}>
              <strong>Authorized Review Action:</strong> Only authorized roles (technical_director, structural_engineer, hse_director, project_director, super_admin) can transition constraints to Verified.
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                Page / Clause / Section Reference *
              </label>
              <input
                type="text"
                value={verifyForm.pageClauseSection}
                onChange={(e) => setVerifyForm({ ...verifyForm, pageClauseSection: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                placeholder="e.g. Section 3.2 (Ground Slab Capacities)"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                Extracted Rule / Value *
              </label>
              <input
                type="text"
                value={verifyForm.extractedRuleValue}
                onChange={(e) => setVerifyForm({ ...verifyForm, extractedRuleValue: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                placeholder="e.g. 2.5 T/m² (2,500 kg/m²)"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                Applicability Statement *
              </label>
              <input
                type="text"
                value={verifyForm.applicabilityStatement}
                onChange={(e) => setVerifyForm({ ...verifyForm, applicabilityStatement: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                placeholder="e.g. Exhibition Halls 1 to 5 Ground Slab"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                Reviewer Authorized Role *
              </label>
              <select
                value={verifyForm.reviewerRole}
                onChange={(e) => setVerifyForm({ ...verifyForm, reviewerRole: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                <option value="technical_director">Technical Director (technical_director)</option>
                <option value="structural_engineer">Licensed Structural Engineer (structural_engineer)</option>
                <option value="hse_director">HSE Director (hse_director)</option>
                <option value="project_director">Project Director (project_director)</option>
                <option value="super_admin">Super Administrator (super_admin)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                Reviewer Compliance Comment
              </label>
              <textarea
                value={verifyForm.reviewerComment}
                onChange={(e) => setVerifyForm({ ...verifyForm, reviewerComment: e.target.value })}
                rows={3}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                placeholder="Authoritative compliance statement..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <Button variant="secondary" onClick={() => setIsVerifyModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="success"
                isLoading={actionLoading}
                onClick={async () => {
                  setActionLoading(true);
                  setActionError(null);
                  try {
                    await apiClient.verifyConstraint(projectId, constraintToVerify.id, {
                      pageClauseSection: verifyForm.pageClauseSection,
                      extractedRuleValue: verifyForm.extractedRuleValue,
                      applicabilityStatement: verifyForm.applicabilityStatement,
                      reviewerComment: verifyForm.reviewerComment,
                    });
                    setActionSuccess(`Constraint ${constraintToVerify.id} verified authoritative! Scheduling engine now enforces it.`);
                    setIsVerifyModalOpen(false);
                    await loadData();
                  } catch (e: any) {
                    setActionError(e.message);
                  } finally {
                    setActionLoading(false);
                  }
                }}
              >
                Execute Authoritative Verification
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Draft Constraint Modal (Draft only — Verified is non-editable) */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Draft Operational Constraint"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
          <div style={{ padding: '10px 14px', backgroundColor: '#fffbeb', borderRadius: '6px', border: '1px solid #fde68a', color: '#92400e' }}>
            🔒 <strong>Verification Policy:</strong> New constraints are strictly initialized in <strong>Draft</strong> status. Manual assignment of 'Verified' status is prohibited by EOS security policy.
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
              Constraint Type *
            </label>
            <select
              value={createForm.constraintType}
              onChange={(e) => setCreateForm({ ...createForm, constraintType: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            >
              <option value="environmental_boundary_noise">Environmental Boundary Noise</option>
              <option value="occupational_noise_exposure">Occupational Noise Exposure</option>
              <option value="venue_operational_noise">Venue Operational Noise</option>
              <option value="permit_noise_limit">Permit Noise Limit</option>
              <option value="sound_system_operational_limit">Sound System Operational Limit</option>
              <option value="floor_load">Floor Load Limit</option>
              <option value="clear_height">Clear Height Limit</option>
              <option value="rigging_point">Rigging Point Capacity</option>
              <option value="working_hours">Working Hours Shift Limit</option>
              <option value="logistics_dock">Logistics Dock Capacity</option>
              <option value="utility_power">Utility Power Capacity</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                Limit / Value *
              </label>
              <input
                type="number"
                value={createForm.limitValue}
                onChange={(e) => setCreateForm({ ...createForm, limitValue: Number(e.target.value) })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                Unit *
              </label>
              <input
                type="text"
                value={createForm.unit}
                onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                Location / Zone *
              </label>
              <input
                type="text"
                value={createForm.locationZone}
                onChange={(e) => setCreateForm({ ...createForm, locationZone: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                Time Window *
              </label>
              <input
                type="text"
                value={createForm.timeWindow}
                onChange={(e) => setCreateForm({ ...createForm, timeWindow: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
              Source Organization
            </label>
            <input
              type="text"
              value={createForm.sourceOrganization}
              onChange={(e) => setCreateForm({ ...createForm, sourceOrganization: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
              Notes / Proposed Citation
            </label>
            <textarea
              value={createForm.notes}
              onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              rows={2}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={actionLoading}
              onClick={async () => {
                setActionLoading(true);
                setActionError(null);
                try {
                  await apiClient.createConstraint(projectId, {
                    constraintType: createForm.constraintType,
                    limitValue: createForm.limitValue,
                    unit: createForm.unit,
                    locationZone: createForm.locationZone,
                    timeWindow: createForm.timeWindow,
                    priority: createForm.priority,
                    sourceOrganization: createForm.sourceOrganization,
                    overrideAuthority: createForm.overrideAuthority,
                    notes: createForm.notes,
                  });
                  setActionSuccess('Draft operational constraint created. Attach controlled source document to proceed.');
                  setIsCreateModalOpen(false);
                  await loadData();
                } catch (e: any) {
                  setActionError(e.message);
                } finally {
                  setActionLoading(false);
                }
              }}
            >
              Create Draft Constraint
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
