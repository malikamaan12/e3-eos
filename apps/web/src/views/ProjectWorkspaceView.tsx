import React, { useState } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { StageGraphVisualizer } from '../components/StageGraphVisualizer.js';
import { Badge, Button, MetricCard, AlertBanner } from '../components/DesignSystem.js';
import { ViewStateRenderer } from '../components/ViewStateRenderer.js';
import { ViewStateFactory } from '../view-states.js';
import { getStageTitleInLocale, formatCurrencyInLocale } from '../localization.js';

export const ProjectWorkspaceView: React.FC = () => {
  const { currentLanguage, projects, selectedProjectId } = useEosContext();
  const [activeStage, setActiveStage] = useState<number>(10); // Default to Stage 10 (Readiness)
  const [isDrawingFrozen, setIsDrawingFrozen] = useState<boolean>(true);
  const [isPermitVerified, setIsPermitVerified] = useState<boolean>(true);

  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  const viewState = ViewStateFactory.ready(currentProject);

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
                marginBottom: '20px',
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                  Stage {String(activeStage).padStart(2, '0')}: {getStageTitleInLocale(activeStage, currentLanguage)}
                </h2>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  {currentLanguage === 'ar' ? 'التحكم الإجرائي والحوكمة غير القابلة للالتفاف' : 'Strict procedural workflow invariant'}
                </div>
              </div>
              <Badge variant={activeStage === 10 ? 'warning' : 'success'}>
                {activeStage === 10 ? (currentLanguage === 'ar' ? 'قيد التدقيق' : 'Gated Review') : (currentLanguage === 'ar' ? 'معتمد' : 'Approved')}
              </Badge>
            </div>

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
      </ViewStateRenderer>
    </div>
  );
};
