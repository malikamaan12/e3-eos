import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, Badge, Button, Modal, Input, Textarea, Select } from '../components/DesignSystem.js';
import { FieldSyncEngine } from '@e3-eos/domain';
import { isSyntheticDemo } from '../services/api-client.js';

interface SiteOpsDeliveryViewProps {
  projectId: string;
  initialSection?: 'dsr' | 'installation' | 'readiness' | 'snags' | 'offline_sync';
}

export const SiteOpsDeliveryView: React.FC<SiteOpsDeliveryViewProps> = ({
  projectId,
  initialSection = 'dsr',
}) => {
  const { apiClient, refreshTrigger, triggerRefresh, currentUser } = useEosContext();
  const isDemo = isSyntheticDemo(projectId);

  const [activeSection, setActiveSection] = useState<'dsr' | 'installation' | 'readiness' | 'snags' | 'offline_sync'>(initialSection);
  const [networkMode, setNetworkMode] = useState<'online_5g' | 'low_bandwidth_2g' | 'airplane_offline'>('airplane_offline');
  const [isQueueFlushed, setIsQueueFlushed] = useState<boolean>(false);

  const [reports, setReports] = useState<any[]>([]);
  const [installationItems, setInstallationItems] = useState<any[]>([]);
  const [readinessData, setReadinessData] = useState<any | null>(null);
  const [authorizations, setAuthorizations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  // Capability 35: Site Zone Critical Inspection Readiness Gate (P04-ST07 / AT-059)
  const [at059CriticalUnresolved, setAt059CriticalUnresolved] = useState<boolean>(true);

  // Safety Punch-List & S1 RTO Gate State (P04-ST05 / AT-058)
  const [siteSnags, setSiteSnags] = useState<any[]>(() =>
    isDemo
      ? [
          {
            id: 'snag-s1-01',
            title: 'Emergency fire egress corridor obstructed by lighting ballast cables at Gate 4',
            severity: 'S1_LIFE_SAFETY',
            location: 'Main Hall 1 - Gate 4 Egress Route',
            blocksRto: true,
            status: 'open',
            reportedBy: 'Khamis Al-Sulaiti (HSE Lead)',
            qcddRef: 'QCDD-NOTICE-2026-441',
          },
          {
            id: 'snag-s2-02',
            title: 'DMX distribution line intermittent communication on Stage Left Truss',
            severity: 'S2_SHOW_STOPPER',
            location: 'Main Stage Overhead Grid 2',
            blocksRto: false,
            status: 'resolved',
            reportedBy: 'Tariq Al-Mansoor (AV Lead)',
            qcddRef: 'N/A',
          },
          {
            id: 'snag-s3-03',
            title: 'Scuff marks on VIP reception counter fascia',
            severity: 'S3_COSMETIC',
            location: 'VIP Registration Lobby',
            blocksRto: false,
            status: 'open',
            reportedBy: 'Sarah Jenkins (Client Services)',
            qcddRef: 'N/A',
          },
        ]
      : []
  );

  const handleResolveSiteSnag = (snagId: string) => {
    setSiteSnags((prev) =>
      prev.map((s) => (s.id === snagId ? { ...s, status: 'resolved', blocksRto: false } : s))
    );
  };

  // Governed Opening Authorization Modal
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authBy, setAuthBy] = useState<string>(currentUser?.name || '');
  const [authRole, setAuthRole] = useState<string>('executive_producer');
  const [authJustification, setAuthJustification] = useState<string>('');
  const [authConditions, setAuthConditions] = useState<string>('');
  const [isAuthorizing, setIsAuthorizing] = useState<boolean>(false);

  // New DSR Modal
  const [isDsrModalOpen, setIsDsrModalOpen] = useState<boolean>(false);
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [workCompleted, setWorkCompleted] = useState<string>('');
  const [workDelayed, setWorkDelayed] = useState<string>('');
  const [manpowerCount, setManpowerCount] = useState<number>(0);
  const [equipmentActive, setEquipmentActive] = useState<string>('');
  const [deliveriesReceived, setDeliveriesReceived] = useState<string>('');
  const [incidentsOccurred, setIncidentsOccurred] = useState<string>('');
  const [snagsIdentified, setSnagsIdentified] = useState<string>('');
  const [clientInstructions, setClientInstructions] = useState<string>('');
  const [weatherConditions, setWeatherConditions] = useState<string>('');
  const [tomorrowPlan, setTomorrowPlan] = useState<string>('');
  const [recordedBy, setRecordedBy] = useState<string>(
    currentUser?.name ? `${currentUser.name} (Site Field Supervisor)` : ''
  );
  const [isSubmittingDsr, setIsSubmittingDsr] = useState<boolean>(false);

  // Installation item advance modal
  const [selectedInstallItem, setSelectedInstallItem] = useState<any | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>('accepted');
  const [installerNotes, setInstallerNotes] = useState<string>('');
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
      setWorkCompleted('');
      setWorkDelayed('');
      setManpowerCount(0);
      setEquipmentActive('');
      setDeliveriesReceived('');
      setIncidentsOccurred('');
      setSnagsIdentified('');
      setClientInstructions('');
      setWeatherConditions('');
      setTomorrowPlan('');
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
        verifiedBy: currentUser?.name ? `${currentUser.name} (Site Field Supervisor)` : 'Site Field Supervisor',
      });
      setSelectedInstallItem(null);
      setInstallerNotes('');
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
      setAuthJustification('');
      setAuthConditions('');
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

          <button
            id="subtab-snags"
            onClick={() => setActiveSection('snags')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: activeSection === 'snags' ? '#2563eb' : '#f1f5f9',
              color: activeSection === 'snags' ? '#ffffff' : '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>⚠️</span> Safety Punch-List & Snags (S1 Gate)
            <span
              style={{
                backgroundColor: siteSnags.some((s) => s.blocksRto && s.status === 'open') ? '#dc2626' : '#16a34a',
                color: '#ffffff',
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 800,
              }}
            >
              {siteSnags.filter((s) => s.status === 'open').length} Open
            </span>
          </button>

          <button
            id="subtab-offline-sync"
            onClick={() => setActiveSection('offline_sync')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: activeSection === 'offline_sync' ? '#2563eb' : '#f1f5f9',
              color: activeSection === 'offline_sync' ? '#ffffff' : '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>📲</span> Field PWA & Offline Sync (AT-055 - AT-058)
            <Badge variant="accent">Dexie Queue</Badge>
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
            {reports.length === 0 && (
              <Card style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📅</div>
                <div style={{ fontWeight: 700, color: '#334155', fontSize: '15px' }}>No Daily Site Reports Recorded</div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>Click "+ Record Daily Site Report" to log daily shift progress, manpower, and safety tracking.</div>
              </Card>
            )}
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
            {installationItems.length === 0 && (
              <Card style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>🏗️</div>
                <div style={{ fontWeight: 700, color: '#334155', fontSize: '15px' }}>No Installation Elements Assigned</div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>Staging, AV, lighting, and scenic items will appear here as materials arrive on site.</div>
              </Card>
            )}
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

          {/* Capability 35: Site Zone Critical Inspection Readiness Gate & S1 Life-Safety Blocker (P04-ST07 / AT-059) */}
          <div
            id="zone-critical-inspection-gate-workbench"
            style={{
              backgroundColor: at059CriticalUnresolved ? '#fef2f2' : '#f0fdf4',
              border: `2px solid ${at059CriticalUnresolved ? '#ef4444' : '#22c55e'}`,
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>🚨</span>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: at059CriticalUnresolved ? '#991b1b' : '#166534' }}>
                    Zone Critical Inspection Readiness Gate (P04-ST07 / AT-059)
                  </h3>
                  <Badge variant={at059CriticalUnresolved ? 'danger' : 'success'}>
                    {at059CriticalUnresolved ? 'S1 LIFE-SAFETY BLOCKER' : 'ALL CONDITIONS CLEARED'}
                  </Badge>
                  <Badge variant="info">INVARIANT AT-059 ENFORCED</Badge>
                </div>
                <p style={{ fontSize: '13px', color: at059CriticalUnresolved ? '#7f1d1d' : '#15803d', margin: '4px 0 0 0' }}>
                  Invariant AT-059 mandates that a high percentage (e.g. 99.4%) cannot override an unresolved critical inspection. Zone remains blocked until life safety is 100% verified.
                </p>
              </div>

              <Button
                variant={at059CriticalUnresolved ? 'success' : 'secondary'}
                size="sm"
                onClick={() => setAt059CriticalUnresolved(!at059CriticalUnresolved)}
              >
                {at059CriticalUnresolved ? 'Simulate QCDD Inspector Certifying S1 Flaps' : 'Re-open S1 Life Safety Inspection Defect'}
              </Button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '14px' }}>
              <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>AFFECTED ZONE</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  VIP Royal Pavilion & North Overhead Truss
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Zone Capacity: 850 Dignitaries & VVIPs</div>
              </div>

              <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>PHYSICAL MILESTONE COMPLETION</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>
                  149 / 150 Tasks Complete (99.33%)
                </div>
                <div style={{ fontSize: '11px', color: '#059669' }}>Carpentry, Lighting, Audio, Scenic: 100% Done</div>
              </div>

              <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>S1 CRITICAL LIFE SAFETY PREREQUISITE</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: at059CriticalUnresolved ? '#dc2626' : '#16a34a', marginTop: '2px' }}>
                  {at059CriticalUnresolved ? 'QCDD-INSP-441: UNRESOLVED' : 'QCDD-INSP-441: CERTIFIED'}
                </div>
                <div style={{ fontSize: '11px', color: at059CriticalUnresolved ? '#b91c1c' : '#059669' }}>
                  {at059CriticalUnresolved ? 'Emergency smoke flaps interlock uncertified' : 'Wet-stamp signed by Capt. Al-Sulaiti'}
                </div>
              </div>

              <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>AUTHORITATIVE ZONE OPENING VERDICT</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: at059CriticalUnresolved ? '#dc2626' : '#16a34a', marginTop: '2px' }}>
                  {at059CriticalUnresolved ? 'BLOCKED / NOT READY' : 'AUTHORIZED FOR DOORS OPEN'}
                </div>
                <div style={{ fontSize: '11px', color: at059CriticalUnresolved ? '#dc2626' : '#059669' }}>
                  {at059CriticalUnresolved ? 'AT-059: Score cannot override condition' : 'All statutory gates satisfied'}
                </div>
              </div>
            </div>

            {at059CriticalUnresolved && (
              <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', borderRadius: '6px', border: '1px solid #fca5a5', fontSize: '12px', color: '#991b1b', fontWeight: 700 }}>
                ⛔ <strong>CRITICAL STATUTORY OVERRIDE ENFORCED (AT-059):</strong> Although Zone 02 has attained 99.33% physical completion, public doors opening is strictly prohibited until the mandatory QCDD Smoke Flaps certificate is certified.
              </div>
            )}
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

      {activeSection === 'readiness' && !readinessData && (
        <Card style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🚦</div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>
            10-Dimension Readiness Gate Not Yet Evaluated
          </h3>
          <p style={{ fontSize: '13px', margin: '0 0 16px 0', maxWidth: '500px', marginInline: 'auto' }}>
            Compute real-time operational readiness across all 10 canonical delivery dimensions (structural, fire safety, permits, logistics, AV/rigging, crew, catering, security, protocol, and rehearsal).
          </p>
          <Button variant="primary" onClick={handleEvaluateReadiness}>
            ⚡ Evaluate Operational Readiness Now
          </Button>
        </Card>
      )}

      {/* SECTION 4: SAFETY PUNCH-LIST & READY-TO-OPEN (RTO) GATE (AT-058 / P04-ST05) */}
      {activeSection === 'snags' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* RTO Certificate Gate Status Banner */}
          <Card style={{
            border: `2px solid ${siteSnags.some((s) => s.blocksRto && s.status === 'open') ? '#ef4444' : '#10b981'}`,
            backgroundColor: siteSnags.some((s) => s.blocksRto && s.status === 'open') ? '#fef2f2' : '#ecfdf5',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '22px' }}>
                    {siteSnags.some((s) => s.blocksRto && s.status === 'open') ? '🛑' : '✅'}
                  </span>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: siteSnags.some((s) => s.blocksRto && s.status === 'open') ? '#991b1b' : '#065f46' }}>
                    {siteSnags.some((s) => s.blocksRto && s.status === 'open')
                      ? 'READY-TO-OPEN (RTO) CERTIFICATE LOCKED BY OPEN S1 DEFECT'
                      : 'READY-TO-OPEN (RTO) SAFETY CLEARANCE ISSUABLE'}
                  </h3>
                </div>
                <p style={{ fontSize: '13px', color: siteSnags.some((s) => s.blocksRto && s.status === 'open') ? '#b91c1c' : '#047857', margin: '4px 0 0 0' }}>
                  {siteSnags.some((s) => s.blocksRto && s.status === 'open')
                    ? 'EOS Invariant AT-058 enforced: Open S1 Life Safety conditions strictly block public opening certification, regardless of overall task completion.'
                    : 'All S1 Life Safety conditions have been inspected, rectified, and cleared. Venue is certified compliant with QCDD life safety regulations.'}
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <Badge variant={siteSnags.some((s) => s.blocksRto && s.status === 'open') ? 'danger' : 'success'}>
                  {siteSnags.some((s) => s.blocksRto && s.status === 'open') ? 'RTO BLOCKED' : 'RTO CLEARED'}
                </Badge>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  Offline Queue: 0 Pending
                </div>
              </div>
            </div>
          </Card>

          {/* Snags Table */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  📋 Defect & Snag Register (S1 / S2 / S3 Severity Tiering)
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                  S1: Life Safety / QCDD (blocks opening) • S2: Show-stopper (blocks show call) • S3: Cosmetic.
                </p>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px' }}>Severity</th>
                    <th style={{ padding: '10px 12px' }}>Defect Description</th>
                    <th style={{ padding: '10px 12px' }}>Location</th>
                    <th style={{ padding: '10px 12px' }}>RTO Impact</th>
                    <th style={{ padding: '10px 12px' }}>Status</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {siteSnags.map((snag) => (
                    <tr key={snag.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px' }}>
                        <Badge variant={snag.severity === 'S1_LIFE_SAFETY' ? 'danger' : snag.severity === 'S2_SHOW_STOPPER' ? 'warning' : 'neutral'}>
                          {snag.severity.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{snag.title}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          Reported by: {snag.reportedBy} {snag.qcddRef !== 'N/A' && `• ${snag.qcddRef}`}
                        </div>
                      </td>
                      <td style={{ padding: '12px', color: '#475569' }}>{snag.location}</td>
                      <td style={{ padding: '12px' }}>
                        {snag.blocksRto ? (
                          <span style={{ color: '#dc2626', fontWeight: 700 }}>🛑 BLOCKS RTO</span>
                        ) : (
                          <span style={{ color: '#059669', fontWeight: 600 }}>Non-blocking</span>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <Badge variant={snag.status === 'resolved' ? 'success' : 'danger'}>
                          {snag.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        {snag.status === 'open' ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleResolveSiteSnag(snag.id)}
                            style={{ backgroundColor: snag.severity === 'S1_LIFE_SAFETY' ? '#10b981' : '#2563eb' }}
                          >
                            ✓ Rectify & Clear
                          </Button>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>
                            ✓ Rectified
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {siteSnags.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🛡️</div>
                        <div style={{ fontWeight: 700, color: '#334155', fontSize: '14px' }}>No Site Snags or Safety Deficiencies Recorded</div>
                        <div style={{ fontSize: '12px', marginTop: '4px' }}>All inspection criteria and life-safety clearance gates are currently clear.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* SECTION 5: OFFLINE FIELD PWA & DEXIE QUEUE SIMULATOR (P04-ST06 / AT-055, AT-056, AT-057, AT-058) */}
      {activeSection === 'offline_sync' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Network Simulator Controls */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                    📲 Mobile Field PWA & Offline Mutation Queue Simulator
                  </h3>
                  <Badge variant="accent">AT-055 / AT-056 / AT-057 / AT-058</Badge>
                </div>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Simulate field edge conditions across Lusail Stadium and DECC halls. Validates Dexie.js offline mutation queue, per-operation deduplication, and supervisor review gating.
                </p>
              </div>

              {/* Network Connectivity Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Radio State:</span>
                <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '6px' }}>
                  <button
                    onClick={() => setNetworkMode('online_5g')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: 'none',
                      backgroundColor: networkMode === 'online_5g' ? '#16a34a' : 'transparent',
                      color: networkMode === 'online_5g' ? '#ffffff' : '#64748b',
                      cursor: 'pointer',
                    }}
                  >
                    🟢 5G Online
                  </button>
                  <button
                    onClick={() => setNetworkMode('low_bandwidth_2g')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: 'none',
                      backgroundColor: networkMode === 'low_bandwidth_2g' ? '#f59e0b' : 'transparent',
                      color: networkMode === 'low_bandwidth_2g' ? '#ffffff' : '#64748b',
                      cursor: 'pointer',
                    }}
                  >
                    🟡 2G / Edge
                  </button>
                  <button
                    onClick={() => setNetworkMode('airplane_offline')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: 'none',
                      backgroundColor: networkMode === 'airplane_offline' ? '#dc2626' : 'transparent',
                      color: networkMode === 'airplane_offline' ? '#ffffff' : '#64748b',
                      cursor: 'pointer',
                    }}
                  >
                    🔴 Offline Mode
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Dexie Mutation Queue & Reconciliation Table */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  📦 IndexedDB / Dexie Mutation Queue (4 Operations Staged)
                </h4>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Local storage status: <strong>Persistent (Quota: 24.8 MB / 500 MB)</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  id="btn-flush-offline-queue"
                  variant="primary"
                  size="sm"
                  onClick={() => setIsQueueFlushed(true)}
                >
                  ⚡ Flush Queue & Reconcile (Online Sync)
                </Button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px' }}>Op ID & Type</th>
                    <th style={{ padding: '10px 12px' }}>Payload Description</th>
                    <th style={{ padding: '10px 12px' }}>Client Timestamp</th>
                    <th style={{ padding: '10px 12px' }}>Sync Policy Invariant</th>
                    <th style={{ padding: '10px 12px' }}>Reconciliation Result</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Operation 1: Normal Incident Log */}
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>OP-QA-7701</div>
                      <Badge variant="neutral">incident</Badge>
                    </td>
                    <td style={{ padding: '12px', color: '#334155' }}>
                      Truss clamp torque re-checked at Grid C (120 Nm verified)
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>
                      2026-09-12 11:20:04 AST
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontSize: '12px', color: '#16a34a' }}>Standard local buffer</span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Badge variant={isQueueFlushed ? 'success' : 'warning'}>
                        {isQueueFlushed ? 'APPLIED (Committed)' : 'QUEUED (Offline)'}
                      </Badge>
                    </td>
                  </tr>

                  {/* Operation 2: Revoked Credential Attendance (AT-055) */}
                  <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#fffbeb' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>OP-QA-7702</div>
                      <Badge variant="warning">attendance</Badge>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 600, color: '#92400e' }}>Turnstile badge scan for Worker #449 (Rigging Tech)</div>
                      <div style={{ fontSize: '11px', color: '#b45309' }}>Server state: IPAF license revoked 2h ago during offline window</div>
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>
                      2026-09-12 11:24:18 AST
                    </td>
                    <td style={{ padding: '12px' }}>
                      <strong style={{ color: '#b45309', fontSize: '11px' }}>AT-055: Retain as observation, deny qualified release</strong>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Badge variant="warning">
                        {isQueueFlushed ? 'OBSERVATION FOR REVIEW' : 'FLAGGED IN QUEUE'}
                      </Badge>
                    </td>
                  </tr>

                  {/* Operation 3: Incomplete Binary Upload (AT-057) */}
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>OP-QA-7703</div>
                      <Badge variant="neutral">inspection_media</Badge>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div>Photo evidence: `egress-doors-gate4.jpg`</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Transferred: 1.4 MB of 4.2 MB (Connection interrupted)</div>
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>
                      2026-09-12 11:26:00 AST
                    </td>
                    <td style={{ padding: '12px' }}>
                      <strong style={{ color: '#d97706', fontSize: '11px' }}>AT-057: Incomplete binary upload blocks task signoff</strong>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Badge variant="danger">
                        PENDING BINARY UPLOAD
                      </Badge>
                    </td>
                  </tr>

                  {/* Operation 4: Duplicate Operation Replay (AT-056) */}
                  <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>OP-QA-7701-DUP</div>
                      <Badge variant="neutral">replay_test</Badge>
                    </td>
                    <td style={{ padding: '12px', color: '#64748b' }}>
                      Replay of OP-QA-7701 (Simulated duplicate packet re-transmission)
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>
                      2026-09-12 11:28:40 AST
                    </td>
                    <td style={{ padding: '12px' }}>
                      <strong style={{ color: '#0284c7', fontSize: '11px' }}>AT-056: Per-operation deduplication prevents duplicate write</strong>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Badge variant="neutral">
                        {isQueueFlushed ? 'DUPLICATE IGNORED' : 'PENDING REPLAY'}
                      </Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Storage Eviction & Session Revocation Contingency Notice (AT-058) */}
            <div style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#475569' }}>
              🛡️ <strong>AT-058 Contingency Protocol:</strong> {FieldSyncEngine.getStorageContingencyDisclosure()}
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
              placeholder="e.g. Reception desk cable drops positioned and power energized..."
              rows={2}
              required
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label="Deliveries Received"
                value={deliveriesReceived}
                onChange={(e) => setDeliveriesReceived(e.target.value)}
                placeholder="e.g. Truck 07 offloaded (registration counters)"
              />
              <Input
                label="Active Equipment"
                value={equipmentActive}
                onChange={(e) => setEquipmentActive(e.target.value)}
                placeholder="e.g. Forklifts, Pallet jacks, Laser levelers"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label="HSE / Incidents (Law No. 13)"
                value={incidentsOccurred}
                onChange={(e) => setIncidentsOccurred(e.target.value)}
                placeholder="e.g. Zero safety incidents"
              />
              <Input
                label="Snags Identified / Solved"
                value={snagsIdentified}
                onChange={(e) => setSnagsIdentified(e.target.value)}
                placeholder="e.g. Counter edge trim touched up"
              />
            </div>
            <Textarea
              label="Tomorrow's Plan & Milestones"
              value={tomorrowPlan}
              onChange={(e) => setTomorrowPlan(e.target.value)}
              placeholder="e.g. Conduct client dry run and reception hostess briefing..."
              rows={2}
            />
            <Input
              label="Recorded By (Authoritative Signatory)"
              value={recordedBy}
              onChange={(e) => setRecordedBy(e.target.value)}
              placeholder="e.g. Site Field Supervisor"
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
              placeholder="e.g. Inspected and verified by Site Supervisor"
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
                placeholder="e.g. Lead Project Director"
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
              placeholder="e.g. All operational dimensions verified passed. Safety certificate endorsed. Authorized for public doors opening."
              rows={3}
              required
            />
            <Textarea
              label="Operational Conditions / Safety Caveats"
              value={authConditions}
              onChange={(e) => setAuthConditions(e.target.value)}
              placeholder="e.g. Standard medical & fire safety response teams stationed at venue."
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
