import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, MetricCard, Badge, Button, Modal, Input, Textarea, Select } from '../components/DesignSystem.js';
import { isSyntheticDemo } from '../services/api-client.js';

export const LiveRunSheetView: React.FC = () => {
  const { currentLanguage, apiClient, selectedProjectId } = useEosContext();
  const isDemo = isSyntheticDemo(selectedProjectId);
  const projectId = selectedProjectId || (isDemo ? 'PRJ-QND-2026' : '');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCue, setSelectedCue] = useState<any>(null);

  // Delay propagation modal
  const [isDelayModalOpen, setIsDelayModalOpen] = useState<boolean>(false);
  const [delayMinutes, setDelayMinutes] = useState<number>(() => (isDemo ? 10 : 0));
  const [delayReason, setDelayReason] = useState<string>(() => (isDemo ? 'VIP Motorcade delayed on Corniche access road.' : ''));
  const [isApplyingDelay, setIsApplyingDelay] = useState<boolean>(false);

  const loadRunSheet = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getLiveRunSheet(projectId);
      setData(res);
    } catch (err) {
      console.error('Failed to load run sheet', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const demo = isSyntheticDemo(projectId);
    setDelayMinutes(demo ? 10 : 0);
    setDelayReason(demo ? 'VIP Motorcade delayed on Corniche access road.' : '');
    loadRunSheet();
  }, [projectId]);

  const handleApplyDelay = async () => {
    if (!selectedCue) return;
    setIsApplyingDelay(true);
    try {
      await apiClient.updateRunSheetItem(selectedCue.cueNumber, {
        status: 'delayed',
        delayMinutes: Number(delayMinutes),
        delayReason,
        actualTime: new Date().toISOString(),
        notes: delayReason,
      });
      setIsDelayModalOpen(false);
      await loadRunSheet();
    } catch (err: any) {
      alert(err.message || 'Failed to update cue');
    } finally {
      setIsApplyingDelay(false);
    }
  };

  const handleStatusChange = async (cueNumber: string, status: string) => {
    try {
      await apiClient.updateRunSheetItem(cueNumber, {
        status,
        delayMinutes: 0,
        actualTime: new Date().toISOString(),
      });
      await loadRunSheet();
    } catch (err: any) {
      alert(err.message || 'Failed to change cue status');
    }
  };

  const items = data?.items || [];
  const completedCount = items.filter((i: any) => i.status === 'completed').length;
  const delayedItems = items.filter((i: any) => i.status === 'delayed' || (i.delayMinutes && Number(i.delayMinutes) > 0));
  const delayedCount = delayedItems.length;
  const maxDelay = items.reduce((max: number, i: any) => Math.max(max, Number(i.delayMinutes || 0)), 0);
  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
              ⏱️ {currentLanguage === 'ar' ? 'جدول تسلسل الفقرات الحي وموجة التأخيرات' : 'Live Master Run Sheet & Delay Propagation'}
            </h1>
            <Badge variant="warning">CRITICAL PATH SYNCHRONIZED</Badge>
          </div>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted, #94a3b8)', fontSize: '13px' }}>
            Real-time stage management and cue execution with automated downstream delay propagation (AT-062).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="outline" onClick={loadRunSheet} id="btn-refresh-runsheet">
            🔄 Refresh Run Sheet
          </Button>
        </div>
      </div>

      {/* Overview KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <MetricCard
          label="Total Cues"
          value={`${items.length}`}
          change="Master Sequence"
          trend="neutral"
        />
        <MetricCard
          label="Completed Cues"
          value={`${completedCount}`}
          change={`${progressPercent}% progress`}
          trend={completedCount > 0 ? 'positive' : 'neutral'}
        />
        <MetricCard
          label="Delayed / Rescheduled"
          value={`${delayedCount}`}
          change={delayedCount > 0 ? 'Downstream propagated' : 'On Schedule'}
          trend={delayedCount > 0 ? 'negative' : 'positive'}
        />
        <MetricCard
          label="Max Cumulative Delay"
          value={`+${maxDelay} min`}
          change="Schedule variance"
          trend={maxDelay > 0 ? 'negative' : 'positive'}
        />
      </div>

      {/* Cues Table */}
      <Card title="Show Cue Execution Schedule">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-default, #2a374b)', color: 'var(--text-secondary, #cbd5e1)', backgroundColor: 'var(--surface-2, #151e2e)' }}>
                <th style={{ padding: '12px' }}>Cue #</th>
                <th style={{ padding: '12px' }}>Title & Description</th>
                <th style={{ padding: '12px' }}>Department</th>
                <th style={{ padding: '12px' }}>Planned Window</th>
                <th style={{ padding: '12px' }}>Actual / Projected</th>
                <th style={{ padding: '12px' }}>Delay</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px' }}>Responsible</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((cue: any) => {
                const isDelayed = cue.delayMinutes > 0;
                return (
                  <tr
                    key={cue.cueNumber}
                    style={{
                      borderBottom: '1px solid var(--border-subtle, #1d2939)',
                      backgroundColor: isDelayed ? '#fffbeb' : 'var(--surface-1, #0f1624)',
                    }}
                  >
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 700 }}>
                      {cue.cueNumber}
                      {cue.isCriticalPath && (
                        <div style={{ fontSize: '10px', color: '#dc2626', fontWeight: 800 }}>CRITICAL PATH</div>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>{cue.title}</div>
                      {cue.dependentOnCues?.length > 0 && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
                          Depends on: <strong>{cue.dependentOnCues.join(', ')}</strong>
                        </div>
                      )}
                      {cue.notes && (
                        <div style={{ fontSize: '11px', color: '#b45309', marginTop: '2px' }}>
                          📝 {cue.notes}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary, #cbd5e1)' }}>{cue.department}</td>
                    <td style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                      {new Date(cue.plannedStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                      {new Date(cue.plannedEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px' }}>
                      {cue.actualStart ? (
                        <span style={{ color: '#059669', fontWeight: 600 }}>
                          {new Date(cue.actualStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted, #94a3b8)' }}>--</span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {cue.delayMinutes > 0 ? (
                        <span style={{ color: '#dc2626', fontWeight: 700 }}>+{cue.delayMinutes} min</span>
                      ) : (
                        <span style={{ color: '#059669' }}>On time</span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Badge
                        variant={
                          cue.status === 'completed'
                            ? 'success'
                            : cue.status === 'in_progress'
                            ? 'warning'
                            : cue.status === 'delayed'
                            ? 'danger'
                            : 'neutral'
                        }
                      >
                        {cue.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: 'var(--text-secondary, #cbd5e1)' }}>
                      {cue.responsiblePerson}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCue(cue);
                            setIsDelayModalOpen(true);
                          }}
                          id={`btn-delay-${cue.cueNumber}`}
                        >
                          + Delay
                        </Button>
                        {cue.status !== 'completed' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleStatusChange(cue.cueNumber, 'complete')}
                            id={`btn-complete-${cue.cueNumber}`}
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
                    No run sheet cues scheduled for this project.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Delay Propagation Modal (AT-062) */}
      {isDelayModalOpen && (
        <Modal
          isOpen={isDelayModalOpen}
          onClose={() => setIsDelayModalOpen(false)}
          title={`Propagate Schedule Delay: ${selectedCue?.cueNumber}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '12px', borderRadius: '6px', fontSize: '12px', color: '#f59e0b' }}>
              <strong>INVARIANT AT-062:</strong> When an upstream cue on the critical path is delayed,
              all dependent cues are automatically re-calculated and shifted downstream with notifications.
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Target Cue</label>
              <Input value={`${selectedCue?.cueNumber}: ${selectedCue?.title}`} disabled />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Delay Duration (Minutes)</label>
              <Input
                type="number"
                value={String(delayMinutes)}
                onChange={(e) => setDelayMinutes(Number(e.target.value))}
                min="1"
                placeholder="0"
                id="input-delay-minutes"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Operational Root Cause</label>
              <Textarea
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                placeholder="State operational root cause (e.g. Protocol delay, weather hold, technical reboot)..."
                rows={3}
                id="input-delay-reason"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="outline" onClick={() => setIsDelayModalOpen(false)}>Cancel</Button>
              <Button
                variant="danger"
                onClick={handleApplyDelay}
                disabled={isApplyingDelay || delayMinutes <= 0}
                id="btn-confirm-propagate-delay"
              >
                {isApplyingDelay ? 'Propagating...' : 'Propagate Delay Downstream'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
