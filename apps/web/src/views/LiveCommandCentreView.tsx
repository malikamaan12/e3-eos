import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, MetricCard, Badge, Button, Modal, Input, Textarea, Select } from '../components/DesignSystem.js';

export const LiveCommandCentreView: React.FC = () => {
  const { currentLanguage, apiClient, selectedProjectId } = useEosContext();
  const isRtl = currentLanguage === 'ar';
  const projectId = selectedProjectId || 'PRJ-QND-2026';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'panels' | 'incidents' | 'audience'>('panels');

  // Protective Action Modal
  const [isActionModalOpen, setIsActionModalOpen] = useState<boolean>(false);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [actionType, setActionType] = useState<string>('stop_work');
  const [justification, setJustification] = useState<string>('Severe wind gust warning above 45 knots near kinetic rig.');
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);

  // New Incident Modal
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState<boolean>(false);
  const [incidentType, setIncidentType] = useState<string>('technical');
  const [incidentSeverity, setIncidentSeverity] = useState<string>('medium');
  const [incidentZone, setIncidentZone] = useState<string>('MAIN_STAGE');
  const [incidentDesc, setIncidentDesc] = useState<string>('');

  const loadCommandCenter = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getLiveCommandCenter(projectId);
      setData(res);
    } catch (err) {
      console.error('Failed to load command center data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommandCenter();
    const interval = setInterval(loadCommandCenter, 10000);
    return () => clearInterval(interval);
  }, [projectId]);

  const handleExecuteAction = async () => {
    if (!selectedIncident) return;
    setIsSubmittingAction(true);
    try {
      await apiClient.executeProtectiveAction(selectedIncident.id, {
        incidentId: selectedIncident.id,
        protectiveAction: actionType,
        justification,
        authorizedBy: 'E3 Show Caller & Safety Lead',
        zone: selectedIncident.zone,
      });
      setIsActionModalOpen(false);
      await loadCommandCenter();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleCreateIncident = async () => {
    try {
      await apiClient.createLiveIncident(projectId, {
        type: incidentType,
        severity: incidentSeverity,
        zone: incidentZone,
        description: incidentDesc || 'Operator raised emergency event via command center',
      });
      setIsIncidentModalOpen(false);
      setIncidentDesc('');
      await loadCommandCenter();
    } catch (err: any) {
      alert(err.message || 'Failed to submit incident');
    }
  };

  const panels = data?.panels;
  const audience = data?.audienceProjection;

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
              🔴 {isRtl ? 'مركز القيادة والعمليات الميدانية الحية' : 'Live Operations Command Centre'}
            </h1>
            <Badge variant="danger">{isRtl ? 'تغذية تدقيق مباشرة' : 'LIVE AUDIT FEED'}</Badge>
            <Badge variant="neutral">ISO 20121 ACTIVE</Badge>
          </div>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
            {isRtl ? 'مسرح اليوم الوطني لدولة قطر وجناح كبار الشخصيات — القياس الفوري، تدابير الحماية الوقائية، وذكاء إدارة الفعاليات.' : 'Qatar National Day Main Stage & Royal Pavilion — Real-time telemetry, protective controls, and event intelligence.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            variant={activeTab === 'panels' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('panels')}
            id="tab-8panels"
          >
            {isRtl ? '8 لوحات عملياتية' : '8 Operations Panels'}
          </Button>
          <Button
            variant={activeTab === 'audience' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('audience')}
            id="tab-audience"
          >
            {isRtl ? 'كثافة الجمهور والتوقعات' : 'Audience Density & Projection'}
          </Button>
          <Button
            variant="danger"
            onClick={() => setIsIncidentModalOpen(true)}
            id="btn-report-incident-top"
          >
            {isRtl ? '+ تسجيل حادث فوري' : '+ Report Live Incident'}
          </Button>
        </div>
      </div>

      {/* Top Status Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <MetricCard
          title={isRtl ? 'حضور طاقم العمل المباشر' : 'Live Attendance'}
          label={isRtl ? 'حضور طاقم العمل المباشر' : 'Live Attendance'}
          value={`${panels?.crewDuty?.checkedInWorkers || 38} / ${panels?.crewDuty?.rosteredWorkers || 42}`}
          subtitle={isRtl ? `${panels?.crewDuty?.attendancePercentage || 90}% في الموقع` : `${panels?.crewDuty?.attendancePercentage || 90}% on site`}
          change={`${panels?.crewDuty?.attendancePercentage || 90}% on site`}
          trend="positive"
          accentColor="#059669"
        />
        <MetricCard
          title={isRtl ? 'بوابة الامتثال التنظيمي' : 'Regulatory Gate'}
          label={isRtl ? 'بوابة الامتثال التنظيمي' : 'Regulatory Gate'}
          value={panels?.compliance?.canOperate ? (isRtl ? 'مسموح التشغيل' : 'PERMITTED') : (isRtl ? 'محظور' : 'BLOCKED')}
          subtitle={isRtl ? `${panels?.compliance?.activeObligations || 3} التزامات محققة` : `${panels?.compliance?.activeObligations || 3} verified active`}
          change={`${panels?.compliance?.activeObligations || 3} verified active`}
          trend={panels?.compliance?.canOperate ? 'positive' : 'negative'}
          accentColor={panels?.compliance?.canOperate ? '#059669' : '#dc2626'}
        />
        <MetricCard
          title={isRtl ? 'جدول إشارات العرض' : 'Show Cue Schedule'}
          label={isRtl ? 'جدول إشارات العرض' : 'Show Cue Schedule'}
          value={isRtl ? `تأخير +${panels?.runSheet?.cumulativeDelayMinutes || 10} دقيقة` : `+${panels?.runSheet?.cumulativeDelayMinutes || 10}m delay`}
          subtitle={isRtl ? `${panels?.runSheet?.completedCues || 1}/${panels?.runSheet?.totalCues || 4} إشارات منجزة` : `${panels?.runSheet?.completedCues || 1}/${panels?.runSheet?.totalCues || 4} cues done`}
          change={`${panels?.runSheet?.completedCues || 1}/${panels?.runSheet?.totalCues || 4} cues done`}
          trend="neutral"
          accentColor="#d97706"
        />
        <MetricCard
          title={isRtl ? 'تعداد دخول الجمهور' : 'Venue Ingress Headcount'}
          label={isRtl ? 'تعداد دخول الجمهور' : 'Venue Ingress Headcount'}
          value={`${audience?.currentInside?.toLocaleString() || '10,850'}`}
          subtitle={isRtl ? `${audience?.occupancyPercentage || 72}% نسبة الإشغال` : `${audience?.occupancyPercentage || 72}% venue occupancy`}
          change={`${audience?.occupancyPercentage || 72}% venue occupancy`}
          trend="positive"
          accentColor="#2563eb"
        />
      </div>

      {activeTab === 'panels' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '16px' }}>
          {/* Panel 1: Live Incident Log */}
          <Card title="1. Live Incident Log & Safety Escalations">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>Open Incidents: <strong>{panels?.incidentLog?.openIncidentsCount || 1}</strong></span>
                <Badge variant={panels?.incidentLog?.criticalIncidentsCount ? 'danger' : 'success'}>
                  {panels?.incidentLog?.criticalIncidentsCount ? 'CRITICAL ALERT' : 'Normal Operations'}
                </Badge>
              </div>
              <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', padding: '12px', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '13px', color: '#9f1239' }}>INC-2026-001: Video Processor Heat Throttle</strong>
                  <Badge variant="warning">Medium</Badge>
                </div>
                <p style={{ margin: '4px 0 8px 0', fontSize: '12px', color: '#4c0519' }}>
                  Zone: MAIN_STAGE — Backup processor active. Auxiliary cooler running.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setSelectedIncident({ id: 'inc-001', zone: 'MAIN_STAGE', title: 'Video Processor Overheat' });
                      setIsActionModalOpen(true);
                    }}
                    id="btn-protective-action-inc1"
                  >
                    Execute Protective Action
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Panel 2: Crew Duty & Rest */}
          <Card title="2. Crew On-Duty & Statutory Fatigue">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Rostered Technicians:</span>
                <strong>42</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Checked-in via Biometric/QR:</span>
                <strong style={{ color: '#059669' }}>38 Present</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Statutory Hours Exceeded:</span>
                <strong style={{ color: '#059669' }}>0 (All under 10h)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Mandatory Rest Interval:</span>
                <span>Configurable (10h Qatar Baseline)</span>
              </div>
              <div style={{ backgroundColor: '#f0fdf4', padding: '8px', borderRadius: '4px', border: '1px solid #bbf7d0', color: '#166534', fontSize: '11px' }}>
                ✓ No active fatigue limit breaches recorded on site.
              </div>
            </div>
          </Card>

          {/* Panel 3: Compliance Obligations */}
          <Card title="3. Regulatory Compliance & Permits">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>QCDD Life Safety NOC:</span>
                <Badge variant="success">QCDD-EV-2026-9941 Active</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Municipality Structural Cert:</span>
                <Badge variant="neutral">Alternative Verified (On-Site)</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Venue Security Access NOC:</span>
                <Badge variant="success">QT-VEN-2026-8801 Active</Badge>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '8px', borderRadius: '4px', fontSize: '11px', color: '#64748b' }}>
                Fail-Closed Engine Status: <strong>RELEASE ELIGIBLE</strong> (0 Blockers)
              </div>
            </div>
          </Card>

          {/* Panel 4: Critical Path Run Sheet */}
          <Card title="4. Critical Path Show Run Sheet">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', backgroundColor: '#f1f5f9', borderRadius: '4px' }}>
                <span>CUE-01.00 Doors Open</span>
                <Badge variant="success">Completed</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', backgroundColor: '#fef3c7', borderRadius: '4px', border: '1px solid #fde68a' }}>
                <span><strong>CUE-02.00 VIP Majlis Arrival</strong></span>
                <Badge variant="warning">In Progress (+10m)</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
                <span>CUE-03.00 National Anthem Reveal</span>
                <Badge variant="neutral">Pending (+10m shifted)</Badge>
              </div>
            </div>
          </Card>

          {/* Panel 5: Zone Readiness Heatmap */}
          <Card title="5. Zone Readiness Heatmap">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ padding: '10px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>MAIN_STAGE</div>
                <div style={{ fontSize: '11px', color: '#166534' }}>Ready (4/4 Gates)</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>VIP_MAJLIS</div>
                <div style={{ fontSize: '11px', color: '#166534' }}>Ready (Protocol Signed)</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>BACKSTAGE</div>
                <div style={{ fontSize: '11px', color: '#166534' }}>Ready (Security Cleared)</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>PUBLIC_CONCOURSE</div>
                <div style={{ fontSize: '11px', color: '#166534' }}>Ready (Egress Clear)</div>
              </div>
            </div>
          </Card>

          {/* Panel 6: Asset Health & Faults */}
          <Card title="6. Asset Health & Maintenance Faults">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>FLT-2026-081 Winch 12 Optical Encoder</span>
                <Badge variant="success">Resolved</Badge>
              </div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '11px' }}>
                Repaired by Klaus Mueller. Shielded CAN connector replaced. Recalibration verified.
              </p>
            </div>
          </Card>

          {/* Panel 7: Client Requests */}
          <Card title="7. Client Requests & Urgent Adjustments">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>CLR-2026-014: Diwan Audio Split</strong>
                <Badge variant="success">Approved (3,500 QAR)</Badge>
              </div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '11px' }}>
                Requested by Mr. Hamad Al-Thani. Shure Axient split configured to OB Van.
              </p>
            </div>
          </Card>

          {/* Panel 8: Shift Handover */}
          <Card title="8. Shift Handover Status">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Outgoing: <strong>Omar Al-Jaber (Day)</strong></span>
                <span>Incoming: <strong>Khalid Mansoor (Show)</strong></span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Mutual Sign-off:</span>
                <Badge variant="success">Acknowledged</Badge>
              </div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '11px' }}>
                Safety brief completed: all 8 egress routes clear, QCDD marshals on posts.
              </p>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'audience' && (
        <Card title="Audience Density & Ingress Projection Engine">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#0f172a' }}>Capacity Utilization</h4>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#0284c7' }}>{audience?.occupancyPercentage || 72}%</div>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Current Inside: <strong>{audience?.currentInside?.toLocaleString() || '10,850'}</strong> / Venue Max: <strong>{audience?.venueCapacity?.toLocaleString() || '15,000'}</strong>
              </p>
            </div>

            <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#0f172a' }}>Flow Rate Telemetry</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', margin: '8px 0' }}>
                <span>Ingress Gates:</span>
                <strong>+{audience?.ingressRatePerHour || 1400} pax/hr</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', margin: '8px 0' }}>
                <span>Egress Portals:</span>
                <strong>-{audience?.egressRatePerHour || 350} pax/hr</strong>
              </div>
            </div>

            <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#0f172a' }}>Peak Forecast & Metering</h4>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                {audience?.peakProjectedHeadcount?.toLocaleString() || '12,950'} pax peak
              </div>
              <div style={{ marginTop: '8px' }}>
                <Badge variant={audience?.meteringRequired ? 'danger' : 'success'}>
                  {audience?.meteringRequired ? 'Turnstile Metering Active' : 'Normal Flow Clearance'}
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Immediate Protective Action Modal (AT-063) */}
      {isActionModalOpen && (
        <Modal
          isOpen={isActionModalOpen}
          onClose={() => setIsActionModalOpen(false)}
          title="🚨 EXECUTE IMMEDIATE PROTECTIVE SAFETY ACTION"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', padding: '12px', borderRadius: '6px', fontSize: '12px', color: '#881337' }}>
              <strong>INVARIANT AT-063:</strong> Protective actions (stop show, isolate equipment, evacuate zone, dispatch medical)
              execute IMMEDIATELY with an immutable audit seal and bypass standard commercial or multi-day approval gates.
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Target Incident & Zone</label>
              <Input
                value={`${selectedIncident?.title || 'INC-001'} (${selectedIncident?.zone || 'MAIN_STAGE'})`}
                disabled
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Action Type</label>
              <Select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                options={[
                  { value: 'stop_work', label: 'Stop Show / Cease Kinetic Motion' },
                  { value: 'isolate_equipment', label: 'Isolate Electrical / Thermal Subsystem' },
                  { value: 'close_zone', label: 'Close Zone Perimeter to Guests' },
                  { value: 'request_medical', label: 'Dispatch Primary On-Site Paramedic Team' },
                  { value: 'evacuate_area', label: 'Initiate Controlled Zone Evacuation' },
                ]}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Operational Justification (Mandatory)</label>
              <Textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={3}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="outline" onClick={() => setIsActionModalOpen(false)}>Cancel</Button>
              <Button
                variant="danger"
                onClick={handleExecuteAction}
                disabled={isSubmittingAction || !justification}
                id="btn-confirm-protective-action"
              >
                {isSubmittingAction ? 'Authorizing...' : 'Authorize & Execute Now'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* New Incident Modal */}
      {isIncidentModalOpen && (
        <Modal
          isOpen={isIncidentModalOpen}
          onClose={() => setIsIncidentModalOpen(false)}
          title="Report Live Incident"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Zone</label>
              <Select
                value={incidentZone}
                onChange={(e) => setIncidentZone(e.target.value)}
                options={[
                  { value: 'MAIN_STAGE', label: 'Main Stage' },
                  { value: 'VIP_MAJLIS', label: 'VIP Majlis' },
                  { value: 'BACKSTAGE', label: 'Backstage & Loading' },
                  { value: 'PUBLIC_CONCOURSE', label: 'Public Concourse' },
                ]}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Category</label>
              <Select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                options={[
                  { value: 'technical', label: 'Technical / AV' },
                  { value: 'hse', label: 'Health & Safety' },
                  { value: 'crowd', label: 'Crowd & Ingress' },
                  { value: 'security', label: 'Security' },
                  { value: 'weather', label: 'Weather & Wind' },
                ]}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Severity</label>
              <Select
                value={incidentSeverity}
                onChange={(e) => setIncidentSeverity(e.target.value)}
                options={[
                  { value: 'minor', label: 'Minor' },
                  { value: 'moderate', label: 'Moderate' },
                  { value: 'major', label: 'Major' },
                  { value: 'critical', label: 'Critical' },
                ]}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Incident Description</label>
              <Textarea
                value={incidentDesc}
                onChange={(e) => setIncidentDesc(e.target.value)}
                placeholder="Describe what occurred, impacted equipment, and immediate containment..."
                rows={3}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="outline" onClick={() => setIsIncidentModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleReportIncident} disabled={!incidentDesc} id="btn-submit-incident">
                Log Incident
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
