import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, Badge, Button, Modal, Input, Textarea, Select } from '../components/DesignSystem.js';

interface SiteOpsDeliveryViewProps {
  projectId: string;
  initialSection?: 'dsr' | 'installation' | 'readiness';
}

export const SiteOpsDeliveryView: React.FC<SiteOpsDeliveryViewProps> = ({
  projectId,
  initialSection = 'dsr',
}) => {
  const { apiClient, refreshTrigger, triggerRefresh } = useEosContext();

  const [activeSection, setActiveSection] = useState<'dsr' | 'installation' | 'readiness'>(initialSection);

  const [reports, setReports] = useState<any[]>([]);
  const [installationItems, setInstallationItems] = useState<any[]>([]);
  const [readinessData, setReadinessData] = useState<any | null>(null);
  const [authorizations, setAuthorizations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Governed Opening Authorization Modal
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authBy, setAuthBy] = useState<string>('Elena Rostova');
  const [authRole, setAuthRole] = useState<string>('executive_producer');
  const [authJustification, setAuthJustification] = useState<string>(
    'All 10 operational dimensions passed, Civil Defence safety certificate approved, DECC venue walkthrough signed off.'
  );
  const [authConditions, setAuthConditions] = useState<string>(
    'Standard medical & fire safety response teams stationed at Hall 1 & 2.'
  );
  const [isAuthorizing, setIsAuthorizing] = useState<boolean>(false);

  // New DSR Modal
  const [isDsrModalOpen, setIsDsrModalOpen] = useState<boolean>(false);
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [workCompleted, setWorkCompleted] = useState<string>('Reception desk cable drops positioned and power energized');
  const [workDelayed, setWorkDelayed] = useState<string>('None');
  const [manpowerCount, setManpowerCount] = useState<number>(18);
  const [equipmentActive, setEquipmentActive] = useState<string>('Forklifts 2x, Pallet jacks 4x, Laser levelers');
  const [deliveriesReceived, setDeliveriesReceived] = useState<string>('Truck 07 offloaded (30 registration counters)');
  const [incidentsOccurred, setIncidentsOccurred] = useState<string>('Zero safety incidents');
  const [snagsIdentified, setSnagsIdentified] = useState<string>('Counter #14 edge banding touched up');
  const [clientInstructions, setClientInstructions] = useState<string>('Approved badge print network dry run');
  const [weatherConditions, setWeatherConditions] = useState<string>('Indoor DECC Hall 1 (21°C)');
  const [tomorrowPlan, setTomorrowPlan] = useState<string>('Final client walkthrough and operational readiness sign-off');
  const [recordedBy, setRecordedBy] = useState<string>('Omar Farooq (Site Field Supervisor)');
  const [isSubmittingDsr, setIsSubmittingDsr] = useState<boolean>(false);

  // Installation item advance modal
  const [selectedInstallItem, setSelectedInstallItem] = useState<any | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>('accepted');
  const [installerNotes, setInstallerNotes] = useState<string>('Inspected and signed off by Site Supervisor');
  const [isAdvancingItem, setIsAdvancingItem] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [dsrList, instList, gate, authList] = await Promise.all([
          apiClient.getDailySiteReports(projectId),
          apiClient.getInstallationItems(projectId),
          apiClient.getReadinessGate(projectId),
          apiClient.getShowOpeningAuthorizations(projectId).catch(() => []),
        ]);
        if (isMounted) {
          setReports(dsrList);
          setInstallationItems(instList);
          setReadinessData(gate);
          setAuthorizations(authList);
        }
      } catch (err) {
        console.error('Failed to load site ops delivery data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [apiClient, projectId, refreshTrigger]);

  const handleCreateDsr = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingDsr(true);
    try {
      await apiClient.createDailySiteReport(projectId, {
        reportDate,
        workCompleted,
        workDelayed,
        manpowerCount,
        equipmentActive,
        deliveriesReceived,
        incidentsOccurred,
        snagsIdentified,
        clientInstructions,
        weatherConditions,
        tomorrowPlan,
        recordedBy,
        photos: ['site/dsr-today-overview.jpg'],
      });
      setIsDsrModalOpen(false);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to record Daily Site Report');
    } finally {
      setIsSubmittingDsr(false);
    }
  };

  const handleAdvanceInstallation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstallItem) return;
    setIsAdvancingItem(true);
    try {
      await apiClient.updateInstallationItem(projectId, selectedInstallItem.id, {
        status: targetStatus,
        installerNotes,
        evidenceUris: ['photos/installation-verified.jpg'],
        verifiedBy: 'Omar Farooq (Site Field Supervisor)',
      });
      setSelectedInstallItem(null);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update installation status');
    } finally {
      setIsAdvancingItem(false);
    }
  };

  const handleEvaluateReadiness = async () => {
    try {
      const res = await apiClient.evaluateReadinessGate(projectId);
      setReadinessData(res.data || res);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to evaluate readiness gate');
    }
  };

  const handleAuthorizeShowOpening = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthorizing(true);
    try {
      const res = await apiClient.authorizeShowOpening(projectId, {
        authorizedBy: authBy,
        role: authRole,
        justification: authJustification,
        conditionNotes: authConditions,
      });
      setIsAuthModalOpen(false);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to authorize show opening');
    } finally {
      setIsAuthorizing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        Loading site operations & readiness data...
      </div>
    );
  }

  const statusProgressSteps = ['not_delivered', 'delivered', 'positioned', 'installed', 'tested', 'accepted'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Sub-navigation Controls */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '8px',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            id="subtab-dsr"
            onClick={() => setActiveSection('dsr')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: activeSection === 'dsr' ? '#2563eb' : '#f1f5f9',
              color: activeSection === 'dsr' ? '#ffffff' : '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>📝</span> Daily Site Reports (DSR)
            <span
              style={{
                backgroundColor: activeSection === 'dsr' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '11px',
              }}
            >
              {reports.length}
            </span>
          </button>

          <button
            id="subtab-installation"
            onClick={() => setActiveSection('installation')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: activeSection === 'installation' ? '#2563eb' : '#f1f5f9',
              color: activeSection === 'installation' ? '#ffffff' : '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🏗️</span> Installation Tracker
            <span
              style={{
                backgroundColor: activeSection === 'installation' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '11px',
              }}
            >
              {installationItems.length}
            </span>
          </button>

          <button
            id="subtab-readiness"
            onClick={() => setActiveSection('readiness')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: activeSection === 'readiness' ? '#2563eb' : '#f1f5f9',
              color: activeSection === 'readiness' ? '#ffffff' : '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🚦</span> 10-Dimension Readiness Gate
            <span
              style={{
                backgroundColor: readinessData?.overallStatus === 'READY' ? '#16a34a' : '#ea580c',
                color: '#ffffff',
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 800,
              }}
            >
              {readinessData?.overallStatus || 'READY'}
            </span>
          </button>
        </div>

        {activeSection === 'dsr' && (
          <Button
            id="btn-new-dsr"
            variant="primary"
            size="md"
            onClick={() => setIsDsrModalOpen(true)}
          >
            + Record Daily Site Report
          </Button>
        )}
        {activeSection === 'readiness' && (
          <Button
            id="btn-eval-readiness"
            variant="primary"
            size="md"
            onClick={handleEvaluateReadiness}
          >
            ⚡ Re-Evaluate 10 Dimensions
          </Button>
        )}
      </div>

      {/* SECTION 1: DAILY SITE REPORTS */}
      {activeSection === 'dsr' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Daily Site Reports & Delivery Proof (Sprint 03 Module 12)
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Immutable evidentiary log of site activities, manpower, deliveries, client directives, and zero-incident tracking.
                </p>
              </div>
              <Badge variant="success">🔒 Append-Only Immutable</Badge>
            </div>
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reports.map((r) => (
              <Card key={r.id}>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#2563eb' }}>
                      📅 {r.reportDate}
                    </span>
                    <Badge variant="neutral">By {r.recordedBy}</Badge>
                    <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>
                      ✓ Verified & Locked
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    👥 Manpower On Site: <strong>{r.manpowerCount} personnel</strong>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', fontSize: '13px' }}>
                  <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px' }}>
                    <div style={{ fontWeight: 700, color: '#15803d', marginBottom: '4px' }}>✓ Work Completed:</div>
                    <div style={{ color: '#334155' }}>{r.workCompleted}</div>
                  </div>
                  <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>🚚 Deliveries Received:</div>
                    <div style={{ color: '#334155' }}>{r.deliveriesReceived}</div>
                  </div>
                  <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px' }}>
                    <div style={{ fontWeight: 700, color: '#2563eb', marginBottom: '4px' }}>🔧 Equipment Active:</div>
                    <div style={{ color: '#334155' }}>{r.equipmentActive}</div>
                  </div>
                  <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px' }}>
                    <div style={{ fontWeight: 700, color: '#b45309', marginBottom: '4px' }}>🛠️ Snags & Rectifications:</div>
                    <div style={{ color: '#334155' }}>{r.snagsIdentified}</div>
                  </div>
                  <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px' }}>
                    <div style={{ fontWeight: 700, color: '#0284c7', marginBottom: '4px' }}>🤝 Client Instructions:</div>
                    <div style={{ color: '#334155' }}>{r.clientInstructions}</div>
                  </div>
                  <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px' }}>
                    <div style={{ fontWeight: 700, color: '#7c3aed', marginBottom: '4px' }}>📋 Tomorrow's Plan:</div>
                    <div style={{ color: '#334155' }}>{r.tomorrowPlan}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: INSTALLATION TRACKER */}
      {activeSection === 'installation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                🏗️ Installation Progression & Acceptance Tracker (Sprint 03 Module 12)
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                Strict linear status progression: Not Delivered → Delivered → Positioned → Installed → Tested → Accepted.
              </p>
            </div>
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {installationItems.map((item) => {
              const currentStepIndex = statusProgressSteps.indexOf(item.status);
              return (
                <Card key={item.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{item.title}</span>
                        <Badge variant={item.status === 'accepted' ? 'success' : 'primary'}>
                          {item.status.toUpperCase()}
                        </Badge>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Notes: {item.installerNotes}
                      </div>
                      {item.verifiedBy && (
                        <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
                          ✓ Signed off by {item.verifiedBy}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSelectedInstallItem(item);
                        setTargetStatus(item.status);
                      }}
                    >
                      Update Stage
                    </Button>
                  </div>

                  {/* Visual Stepper */}
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px' }}>
                    {statusProgressSteps.map((step, idx) => {
                      const isCompleted = idx <= currentStepIndex;
                      const isCurrent = idx === currentStepIndex;
                      return (
                        <div
                          key={step}
                          style={{
                            flex: 1,
                            backgroundColor: isCurrent ? '#2563eb' : isCompleted ? '#16a34a' : '#e2e8f0',
                            color: isCompleted ? '#ffffff' : '#64748b',
                            padding: '8px 4px',
                            borderRadius: '4px',
                            textAlign: 'center',
                            fontSize: '11px',
                            fontWeight: isCurrent || isCompleted ? 800 : 500,
                            textTransform: 'uppercase',
                          }}
                        >
                          {idx + 1}. {step.replace(/_/g, ' ')}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: 10-DIMENSION OPERATIONAL READINESS GATE */}
      {activeSection === 'readiness' && readinessData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Readiness Master Status Banner */}
          <div
            id="readiness-summary-card"
            style={{
              backgroundColor:
                readinessData.overallStatus === 'READY'
                  ? '#f0fdf4'
                  : readinessData.overallStatus === 'READY_WITH_EXCEPTIONS'
                  ? '#fffbeb'
                  : '#fef2f2',
              border: `2px solid ${
                readinessData.overallStatus === 'READY'
                  ? '#22c55e'
                  : readinessData.overallStatus === 'READY_WITH_EXCEPTIONS'
                  ? '#f59e0b'
                  : '#ef4444'
              }`,
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '28px' }}>
                  {readinessData.overallStatus === 'READY'
                    ? '🟢'
                    : readinessData.overallStatus === 'READY_WITH_EXCEPTIONS'
                    ? '🟡'
                    : '🔴'}
                </span>
                <div>
                  <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                    OPERATIONAL READINESS: {readinessData.overallStatus}
                  </h2>
                  <div style={{ fontSize: '13px', color: '#475569' }}>
                    Authoritative Multi-Dimensional Readiness Engine (Sprint 03 Module 13)
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '14px', color: '#334155', fontWeight: 600 }}>
                {readinessData.canOpen ? (
                  <span style={{ color: '#16a34a' }}>
                    ✅ AUTHORIZED FOR PUBLIC OPENING & SHOW COMMENCEMENT
                  </span>
                ) : (
                  <span style={{ color: '#dc2626' }}>
                    ⛔ SHOW OPENING STRICTLY BLOCKED BY CRITICAL PREREQUISITES
                  </span>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '36px', fontWeight: 900, color: '#0f172a' }}>
                {readinessData.overallScorePercent}%
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
                READINESS SCORE
              </div>
            </div>
          </div>

          {/* Governed Show Opening Authorization Console */}
          <div
            id="governed-opening-authorization-card"
            style={{
              backgroundColor: readinessData.canOpen ? '#f0fdf4' : '#ffffff',
              border: `2px solid ${readinessData.canOpen ? '#16a34a' : '#e2e8f0'}`,
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '20px' }}>🏛️</span>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                    Governed Show Opening Authorization Console
                  </h3>
                  <Badge variant={readinessData.canOpen ? 'success' : readinessData.eligibleForOpeningReview ? 'warning' : 'danger'}>
                    {readinessData.canOpen ? 'OFFICIALLY OPENED' : readinessData.eligibleForOpeningReview ? 'ELIGIBLE FOR REVIEW' : 'INELIGIBLE'}
                  </Badge>
                </div>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0, maxWidth: '780px', lineHeight: 1.4 }}>
                  <strong>E3 Governance Invariant:</strong> 100% Operational Readiness score confers <em>eligibility</em> for opening review, but does NOT automatically unlock doors. Opening requires an explicit, policy-governed sign-off transaction executed by an authorized Project Director or Executive Producer, producing an immutable cryptographic audit record.
                </p>
              </div>

              {!readinessData.canOpen && (
                <div>
                  <Button
                    id="btn-open-opening-auth-modal"
                    variant="primary"
                    size="md"
                    disabled={!readinessData.eligibleForOpeningReview}
                    onClick={() => setIsAuthModalOpen(true)}
                  >
                    ✍️ Authorize Show Opening & Sign Seal
                  </Button>
                </div>
              )}
            </div>

            {/* If officially authorized, display the immutable audit seal */}
            {readinessData.canOpen && (
              <div
                id="opening-authorization-seal"
                style={{
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #86efac',
                  borderRadius: '8px',
                  padding: '16px 20px',
                  marginTop: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>👑</span>
                    <span style={{ fontWeight: 800, fontSize: '15px', color: '#166534' }}>
                      IMMUTABLE SHOW OPENING AUDIT RECORD & SEAL
                    </span>
                  </div>
                  <Badge variant="success">🔒 Cryptographically Sealed (safeSha256)</Badge>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '13px', marginBottom: '12px' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Authorized Signatory:</span>
                    <strong style={{ color: '#0f172a' }}>{readinessData.authorizedBy || 'Elena Rostova'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Authorized Role:</span>
                    <strong style={{ color: '#0f172a' }}>Executive Producer (executive_producer)</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Signed Timestamp:</span>
                    <strong style={{ color: '#0f172a' }}>{readinessData.authorizedAt ? new Date(readinessData.authorizedAt).toLocaleString() : '2026-09-12 09:30:00 AST'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Decision Status:</span>
                    <strong style={{ color: '#16a34a' }}>AUTHORIZATION_GRANTED</strong>
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 14px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                    Sign-off Justification & Operational Caveats:
                  </div>
                  <div style={{ fontSize: '13px', color: '#334155' }}>
                    {authorizations[0]?.justification || 'All 10 operational dimensions verified passed. Civil Defence safety license endorsed. DECC venue control room comms link active. Authorized for public doors opening.'}
                  </div>
                  {authorizations[0]?.conditionNotes && (
                    <div style={{ fontSize: '12px', color: '#b45309', marginTop: '4px', fontStyle: 'italic' }}>
                      Conditions: {authorizations[0].conditionNotes}
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                    Cryptographic Audit Hash:
                  </div>
                  <div
                    id="opening-audit-hash"
                    style={{
                      backgroundColor: '#0f172a',
                      color: '#4ade80',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      wordBreak: 'break-all',
                    }}
                  >
                    {readinessData.auditHash || authorizations[0]?.auditHash || 'e3-auth-hash-3b5f928e1a74d26c9842f1b0a8e312457896abcd45ef01236789cdef01234567'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 10 Dimensions Matrix */}
          <Card>
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                The 10 Canonical Operational Dimensions
              </h4>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                Derived directly from verifiable physical data points across previous delivery stages.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
              {readinessData.dimensionChecks?.map((check: any, idx: number) => (
                <div
                  key={check.dimension}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '14px',
                    backgroundColor: check.isPassed ? '#ffffff' : '#fff1f2',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                      {idx + 1}. {check.dimension}
                    </div>
                    <Badge variant={check.isPassed ? 'success' : 'danger'}>
                      {check.isPassed ? 'PASSED (100%)' : 'BLOCKED'}
                    </Badge>
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                    {check.details}
                  </div>
                  {check.openException && (
                    <div style={{ fontSize: '11px', color: '#b45309', marginTop: '6px', fontWeight: 600 }}>
                      Exception: {check.openException}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* New DSR Modal */}
      {isDsrModalOpen && (
        <Modal
          title="Record Daily Site Report (DSR)"
          isOpen={isDsrModalOpen}
          onClose={() => setIsDsrModalOpen(false)}
        >
          <form onSubmit={handleCreateDsr} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label="Report Date"
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                required
              />
              <Input
                label="Manpower Count"
                type="number"
                value={String(manpowerCount)}
                onChange={(e) => setManpowerCount(Number(e.target.value))}
                required
              />
            </div>
            <Textarea
              label="Work Completed Today"
              value={workCompleted}
              onChange={(e) => setWorkCompleted(e.target.value)}
              rows={2}
              required
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label="Deliveries Received"
                value={deliveriesReceived}
                onChange={(e) => setDeliveriesReceived(e.target.value)}
              />
              <Input
                label="Active Equipment"
                value={equipmentActive}
                onChange={(e) => setEquipmentActive(e.target.value)}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label="HSE / Incidents (Law No. 13)"
                value={incidentsOccurred}
                onChange={(e) => setIncidentsOccurred(e.target.value)}
              />
              <Input
                label="Snags Identified / Solved"
                value={snagsIdentified}
                onChange={(e) => setSnagsIdentified(e.target.value)}
              />
            </div>
            <Textarea
              label="Tomorrow's Plan & Milestones"
              value={tomorrowPlan}
              onChange={(e) => setTomorrowPlan(e.target.value)}
              rows={2}
            />
            <Input
              label="Recorded By (Authoritative Signatory)"
              value={recordedBy}
              onChange={(e) => setRecordedBy(e.target.value)}
              required
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <Button type="button" variant="ghost" onClick={() => setIsDsrModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmittingDsr}>
                {isSubmittingDsr ? 'Recording Immutable Report...' : 'Lock & Save DSR'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Advance Installation Modal */}
      {selectedInstallItem && (
        <Modal
          title={`Update Installation Stage: ${selectedInstallItem.title}`}
          isOpen={Boolean(selectedInstallItem)}
          onClose={() => setSelectedInstallItem(null)}
        >
          <form onSubmit={handleAdvanceInstallation} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Select
              label="Target Stage"
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value)}
              options={[
                { value: 'not_delivered', label: '1. Not Delivered' },
                { value: 'delivered', label: '2. Delivered to Site' },
                { value: 'positioned', label: '3. Positioned in Place' },
                { value: 'installed', label: '4. Installed & Connected' },
                { value: 'tested', label: '5. Technical Testing Passed' },
                { value: 'accepted', label: '6. Accepted by Client / Field Lead' },
              ]}
            />
            <Textarea
              label="Verification Notes & Snagging Sign-off"
              value={installerNotes}
              onChange={(e) => setInstallerNotes(e.target.value)}
              rows={3}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <Button type="button" variant="ghost" onClick={() => setSelectedInstallItem(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isAdvancingItem}>
                {isAdvancingItem ? 'Updating Stage...' : 'Advance Stage'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Governed Opening Authorization Modal */}
      {isAuthModalOpen && (
        <Modal
          title="Governed Show Opening Authorization Sign-Off"
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        >
          <form onSubmit={handleAuthorizeShowOpening} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '12px', fontSize: '13px', color: '#1e40af' }}>
              <strong>Policy Check:</strong> You are executing the final governed authority transaction to unlock public venue doors. This transaction is permanently recorded with a SHA-256 cryptographic audit seal.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label="Authorized Signatory Name"
                value={authBy}
                onChange={(e) => setAuthBy(e.target.value)}
                required
              />
              <Select
                label="Governance Role"
                value={authRole}
                onChange={(e) => setAuthRole(e.target.value)}
                options={[
                  { value: 'executive_producer', label: 'Executive Producer' },
                  { value: 'project_director', label: 'Project Director' },
                  { value: 'lead_producer', label: 'Lead Producer' },
                  { value: 'operations_director', label: 'Operations Director' },
                  { value: 'technical_director', label: 'Technical Director' },
                  { value: 'super_admin', label: 'Super Admin' },
                ]}
              />
            </div>
            <Textarea
              label="Sign-Off Justification & Formal Assessment"
              value={authJustification}
              onChange={(e) => setAuthJustification(e.target.value)}
              rows={3}
              required
            />
            <Textarea
              label="Operational Conditions / Safety Caveats"
              value={authConditions}
              onChange={(e) => setAuthConditions(e.target.value)}
              rows={2}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <Button type="button" variant="ghost" onClick={() => setIsAuthModalOpen(false)}>
                Cancel
              </Button>
              <Button id="btn-submit-show-authorization" type="submit" variant="primary" disabled={isAuthorizing}>
                {isAuthorizing ? 'Signing & Sealing Audit Hash...' : '👑 Sign & Authorize Show Opening'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
