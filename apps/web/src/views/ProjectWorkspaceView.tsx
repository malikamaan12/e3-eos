import React, { useState } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { StageGraphVisualizer } from '../components/StageGraphVisualizer.js';
import { Badge, Button, MetricCard, AlertBanner } from '../components/DesignSystem.js';
import { ViewStateRenderer } from '../components/ViewStateRenderer.js';
import { ViewStateFactory } from '../view-states.js';
import { getStageTitleInLocale, formatCurrencyInLocale } from '../localization.js';
import { getActivitiesForStage } from '@e3-eos/domain';

export const ProjectWorkspaceView: React.FC = () => {
  const { currentLanguage, projects, selectedProjectId } = useEosContext();
  const [activeStage, setActiveStage] = useState<number>(10); // Default to Stage 10 (Readiness)
  const [activeTab, setActiveTab] = useState<'activities' | 'drilldown'>('activities');
  const [isDrawingFrozen, setIsDrawingFrozen] = useState<boolean>(true);
  const [isPermitVerified, setIsPermitVerified] = useState<boolean>(true);
  const [activityStatuses, setActivityStatuses] = useState<Record<string, 'completed' | 'in_progress' | 'blocked' | 'not_started'>>({});
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];
  const viewState = ViewStateFactory.ready(currentProject);

  const stageActivities = getActivitiesForStage(activeStage);

  const getActivityStatus = (actId: string): 'completed' | 'in_progress' | 'blocked' | 'not_started' => {
    if (activityStatuses[actId]) return activityStatuses[actId];
    if (activeStage < 10) return 'completed';
    if (activeStage === 10) {
      const idx = parseInt(actId.split('-')[1], 10);
      return idx <= 18 ? 'completed' : 'in_progress';
    }
    return 'not_started';
  };

  const completedCount = stageActivities.filter((a) => getActivityStatus(a.id) === 'completed').length;
  const stagePercent = Math.round((completedCount / stageActivities.length) * 100);

  const toggleActivityStatus = (actId: string) => {
    const current = getActivityStatus(actId);
    const next = current === 'completed' ? 'in_progress' : current === 'in_progress' ? 'not_started' : 'completed';
    setActivityStatuses((prev) => ({ ...prev, [actId]: next }));
  };

  const distinctRoles = Array.from(new Set(stageActivities.map((a) => a.proposedOwnerRole))).sort();
  const filteredActivities = roleFilter === 'all'
    ? stageActivities
    : stageActivities.filter((a) => a.proposedOwnerRole === roleFilter);

  return (
    <div data-testid="project-workspace">
      {/* Project Banner */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#2563eb' }}>{currentProject.projectCode}</span>
            <Badge variant="info">Stage {activeStage}: {getStageTitleInLocale(activeStage, currentLanguage)}</Badge>
            <Badge variant="purple">{currentProject.originCode}</Badge>
          </div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
            {currentProject.title}
          </h1>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            {currentLanguage === 'ar'
              ? 'الفعالية: معرض تكنولوجيا دولي تركيبي • الموقع: مركز الدوحة للمؤتمرات والمعارض (DECC)'
              : 'Synthetic Tech Exhibition 2026 • Venue: Doha Exhibition & Convention Centre (DECC)'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button size="sm" variant="outline">
            {currentLanguage === 'ar' ? 'سجل التدقيق والمخططات' : 'Audit Manifest'}
          </Button>
          <Button size="sm" variant="secondary">
            {currentLanguage === 'ar' ? 'إعدادات المشروع' : 'Project Settings'}
          </Button>
        </div>
      </div>

      {/* Interactive 13-Stage Lifecycle Graph */}
      <StageGraphVisualizer activeStageNumber={activeStage} onSelectStage={setActiveStage} />

      <ViewStateRenderer viewState={viewState}>
        {() => (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              padding: '24px',
            }}
          >
            {/* Stage Title Strip */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '16px',
                marginBottom: '16px',
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                  Stage {String(activeStage).padStart(2, '0')}: {getStageTitleInLocale(activeStage, currentLanguage)}
                </h2>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  {currentLanguage === 'ar'
                    ? `مكتبة الأنشطة المعيارية (24 نشاطاً) • تم إنجاز ${completedCount} من 24 (${stagePercent}%)`
                    : `Normative Activity Library (24 Activities) • ${completedCount} of 24 Complete (${stagePercent}%)`}
                </div>
              </div>
              <Badge variant={stagePercent === 100 ? 'success' : activeStage === 10 ? 'warning' : 'info'}>
                {stagePercent === 100
                  ? (currentLanguage === 'ar' ? 'مكتمل بنسبة 100%' : '100% Completed')
                  : `${stagePercent}% (${completedCount}/24)`}
              </Badge>
            </div>

            {/* Stage Progress Bar */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                <span>{currentLanguage === 'ar' ? 'نسبة التقدم الإجرائي في المرحلة' : 'Stage Procedural Progress'}</span>
                <span style={{ fontWeight: 700, color: stagePercent === 100 ? '#059669' : '#2563eb' }}>{stagePercent}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${stagePercent}%`,
                    height: '100%',
                    backgroundColor: stagePercent === 100 ? '#10b981' : '#3b82f6',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>

            {/* Sub-Tab Navigation */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <button
                onClick={() => setActiveTab('activities')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'activities' ? '#2563eb' : '#f1f5f9',
                  color: activeTab === 'activities' ? '#ffffff' : '#475569',
                }}
              >
                {currentLanguage === 'ar' ? '📋 قائمة الأنشطة الإلزامية (24)' : '📋 Normative Activities (24)'}
              </button>
              <button
                onClick={() => setActiveTab('drilldown')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'drilldown' ? '#2563eb' : '#f1f5f9',
                  color: activeTab === 'drilldown' ? '#ffffff' : '#475569',
                }}
              >
                {currentLanguage === 'ar' ? '⚡ حوكمة النطاق والقواعد الخاصة' : '⚡ Domain Invariants & Drilldown'}
              </button>
            </div>

            {/* TAB 1: Normative Activities Checklist (24 Activities) */}
            {activeTab === 'activities' && (
              <div>
                {/* Role Filter Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
                    {currentLanguage === 'ar' ? 'تصفية حسب الدور المسند:' : 'Filter by Role:'}
                  </span>
                  <button
                    onClick={() => setRoleFilter('all')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      backgroundColor: roleFilter === 'all' ? '#0f172a' : '#ffffff',
                      color: roleFilter === 'all' ? '#ffffff' : '#475569',
                    }}
                  >
                    All ({stageActivities.length})
                  </button>
                  {distinctRoles.map((role) => (
                    <button
                      key={role}
                      onClick={() => setRoleFilter(role)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        backgroundColor: roleFilter === role ? '#0f172a' : '#ffffff',
                        color: roleFilter === role ? '#ffffff' : '#475569',
                      }}
                    >
                      {role}
                    </button>
                  ))}
                </div>

                {/* Activities List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredActivities.map((act) => {
                    const status = getActivityStatus(act.id);
                    const isDone = status === 'completed';
                    return (
                      <div
                        key={act.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderRadius: '6px',
                          border: isDone ? '1px solid #d1fae5' : '1px solid #e2e8f0',
                          backgroundColor: isDone ? '#f0fdf4' : '#ffffff',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                          <button
                            onClick={() => toggleActivityStatus(act.id)}
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '4px',
                              border: isDone ? 'none' : '2px solid #cbd5e1',
                              backgroundColor: isDone ? '#10b981' : '#ffffff',
                              color: '#ffffff',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              marginTop: '2px',
                              flexShrink: 0,
                            }}
                          >
                            {isDone ? '✓' : ''}
                          </button>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', fontFamily: 'monospace' }}>
                                {act.id}
                              </span>
                              <span
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  color: isDone ? '#065f46' : '#1e293b',
                                  textDecoration: isDone ? 'line-through' : 'none',
                                }}
                              >
                                {act.name}
                              </span>
                              <Badge variant="purple">{act.proposedOwnerRole}</Badge>
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>📄</span>
                              <span><strong>Required Output:</strong> {act.completionOutputOrEvidence}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Badge variant={isDone ? 'success' : status === 'in_progress' ? 'info' : 'neutral'}>
                            {isDone ? 'Completed' : status === 'in_progress' ? 'In Progress' : 'Pending'}
                          </Badge>
                          <Button
                            size="sm"
                            variant={isDone ? 'outline' : 'secondary'}
                            onClick={() => toggleActivityStatus(act.id)}
                          >
                            {isDone ? 'Reopen' : 'Mark Done'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: Specialized Domain Invariants & Drilldown */}
            {activeTab === 'drilldown' && (
              <div>


            {/* STAGE 01: Onboarding with Preserved Unknowns */}
            {activeStage === 1 && (
              <div>
                <AlertBanner type="info" title="Preserved Unknowns Invariant (AT-014)">
                  Business assumptions and open questions begin explicitly marked as Unknown rather than falsified to zero or default dates.
                </AlertBanner>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '6px' }}>
                    <div style={{ fontWeight: 600 }}>Tender Submission Deadline</div>
                    <div style={{ color: '#64748b', fontSize: '13px' }}>Status: Confirmed (28 Sep 2026)</div>
                  </div>
                  <div style={{ border: '1px solid #fde68a', backgroundColor: '#fffbeb', padding: '16px', borderRadius: '6px' }}>
                    <div style={{ fontWeight: 600, color: '#92400e' }}>VIP Protocol Seating Capacity</div>
                    <div style={{ color: '#b45309', fontSize: '13px' }}>Status: UNKNOWN (Awaiting Ministerial Confirmation)</div>
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 04: Technical Design Freezing */}
            {activeStage === 4 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px' }}>Technical Drawing Revisions</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                      Drawing freezes lock specifications for costing. Subsequent modifications branch as unapproved drafts.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={isDrawingFrozen ? 'secondary' : 'primary'}
                    onClick={() => setIsDrawingFrozen(!isDrawingFrozen)}
                  >
                    {isDrawingFrozen ? 'Locked (Frozen v2.4)' : 'Freeze Version 2.4'}
                  </Button>
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>DWG-2026-RIG-004 (Stage Overhead Rigging & Truss Load Calculations)</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Version: 2.4 • SHA-256: e3b0c44298fc1c149afbf4c8996fb924...</div>
                    </div>
                    <Badge variant={isDrawingFrozen ? 'purple' : 'neutral'}>
                      {isDrawingFrozen ? 'Frozen Baseline' : 'Draft'}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 05: BOQ & Commercial Calculation */}
            {activeStage === 5 && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                  <MetricCard title="Cost Basis" value={formatCurrencyInLocale('QAR', 110000, currentLanguage)} />
                  <MetricCard title="Contract Proposal" value={formatCurrencyInLocale('QAR', 160000, currentLanguage)} />
                  <MetricCard title="Target Gross Margin" value="43.75%" badge={{ label: 'Floor > 35%', variant: 'success' }} />
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: currentLanguage === 'ar' ? 'right' : 'left' }}>
                    <thead style={{ backgroundColor: '#f8fafc', fontSize: '12px', color: '#64748b' }}>
                      <tr>
                        <th style={{ padding: '10px 16px' }}>BOQ Line</th>
                        <th style={{ padding: '10px 16px' }}>Category</th>
                        <th style={{ padding: '10px 16px' }}>Cost Rate</th>
                        <th style={{ padding: '10px 16px' }}>Client Rate</th>
                        <th style={{ padding: '10px 16px' }}>Margin</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '13px' }}>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>01.01 Structural Rigging Trussing</td>
                        <td style={{ padding: '12px 16px' }}>Production</td>
                        <td style={{ padding: '12px 16px' }}>35,000 QAR</td>
                        <td style={{ padding: '12px 16px' }}>52,000 QAR</td>
                        <td style={{ padding: '12px 16px', color: '#059669', fontWeight: 600 }}>32.6%</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>01.02 High-Resolution P2.5 LED Panels</td>
                        <td style={{ padding: '12px 16px' }}>AV & Lighting</td>
                        <td style={{ padding: '12px 16px' }}>42,000 QAR</td>
                        <td style={{ padding: '12px 16px' }}>65,000 QAR</td>
                        <td style={{ padding: '12px 16px', color: '#059669', fontWeight: 600 }}>35.3%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* STAGE 08: Inventory & Serialized Non-Overlapping Asset Reservations */}
            {activeStage === 8 && (
              <div>
                <AlertBanner type="success" title="Serialized Collision Invariant (AT-049)">
                  Non-overlapping reservation engine guarantees zero double-booking across regional project dates.
                </AlertBanner>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>GEN-200KVA-01 (Primary Heavy Duty Generator)</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Reserved Interval: 2026-10-10T08:00Z to 2026-10-18T18:00Z</div>
                    </div>
                    <Badge variant="success">Confirmed Allocation</Badge>
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 10: Critical Safety Checkpoint & Readiness Gate */}
            {activeStage === 10 && (
              <div>
                <AlertBanner
                  type={isPermitVerified ? 'success' : 'error'}
                  title={isPermitVerified ? 'Critical Readiness Checkpoint Passed' : 'CRITICAL SAFETY BLOCKER ACTIVE'}
                >
                  {isPermitVerified
                    ? 'Qatar Civil Defense (QCDD) permit verified. Stage 11 Live Operations permitted to open.'
                    : 'A critical condition strictly overrides percentage progress. Operations cannot open without verified safety approval.'}
                </AlertBanner>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>QCDD Temporary Life Safety & Crowd Control Permit</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Check: Ministry of Interior Civil Defense Sign-off</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Badge variant={isPermitVerified ? 'success' : 'danger'}>
                        {isPermitVerified ? 'VERIFIED' : 'MISSING PERMIT'}
                      </Badge>
                      <Button
                        size="sm"
                        variant={isPermitVerified ? 'outline' : 'primary'}
                        onClick={() => setIsPermitVerified(!isPermitVerified)}
                      >
                        {isPermitVerified ? 'Revoke For Drill' : 'Certify Permit Upload'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>Overall Readiness Score: </span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: isPermitVerified ? '#059669' : '#dc2626' }}>
                      {isPermitVerified ? '100% (Ready for Live Opening)' : '95% (BLOCKED BY CRITICAL CHECKPOINT)'}
                    </span>
                  </div>
                  <Button
                    size="md"
                    variant={isPermitVerified ? 'success' : 'secondary'}
                    disabled={!isPermitVerified}
                  >
                    {currentLanguage === 'ar' ? 'تصريح فتح الأبواب للمرحلة 11' : 'Authorize Stage 11 Doors Open'}
                  </Button>
                </div>
              </div>
            )}

            {/* STAGE 13: Financial Reconciliation & 90k QAR EAC Invariant */}
            {activeStage === 13 && (
              <div>
                <AlertBanner type="success" title="Zero Double-Counting EAC Invariant (AT-066)">
                  Shift from accrual to posted invoice keeps EAC exactly constant at 90,000 QAR.
                </AlertBanner>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                  <MetricCard title="Budget" value="110,000 QAR" />
                  <MetricCard title="EAC" value="90,000 QAR" badge={{ label: 'Deterministic', variant: 'success' }} />
                  <MetricCard title="Variance" value="20,000 QAR" delta={{ text: 'Under Budget', isPositive: true }} />
                  <MetricCard title="Net Margin" value="43.75%" />
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>Canonical Event Closeout Report</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Deterministic SHA-256 Digest: 9a7b...4c21 (Immutable)</div>
                  </div>
                  <Button size="sm" variant="secondary">
                    {currentLanguage === 'ar' ? 'تنزيل الحزمة المعتمدة' : 'Download Signed PDF'}
                  </Button>
                </div>
              </div>
            )}

            {/* Fallback for other stages */}
            {![1, 4, 5, 8, 10, 13].includes(activeStage) && (
              <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📋</div>
                <h4 style={{ margin: '0 0 4px 0', color: '#1e293b' }}>
                  {getStageTitleInLocale(activeStage, currentLanguage)}
                </h4>
                <p style={{ margin: 0, fontSize: '13px' }}>
                  Stage specifications and deliverables active. Governed by E3 standard operational procedures.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    )}
  </ViewStateRenderer>
</div>
);
};

