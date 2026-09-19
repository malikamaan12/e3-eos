import React, { useState, useEffect, useRef } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, MetricCard, Badge, Button, Modal, Input, Textarea, Select } from '../components/DesignSystem.js';
import { isSyntheticDemo } from '../services/api-client.js';

export interface CommandPushEvent {
  id: string;
  timestamp: string;
  category: 'gate' | 'snag' | 'safety' | 'vip';
  title: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
}

export interface ShowCue {
  id: string;
  code: string;
  title: string;
  scheduledTime: string;
  durationMinutes: number;
  department: string;
  vipProtocol: boolean;
  status: 'completed' | 'live' | 'armed' | 'pending' | 'hold';
  notes: string;
}

const INITIAL_PUSH_EVENTS: CommandPushEvent[] = [
  {
    id: 'EVT-001',
    timestamp: '20:14:10',
    category: 'vip',
    title: '👑 VIP Protocol: State Convoy In Transit',
    detail: 'Amiri Diwan motorcade departed; ETA DECC Gate 1 in 14 minutes. Protocol reception team standing by at VIP Majlis.',
    severity: 'info',
  },
  {
    id: 'EVT-002',
    timestamp: '20:12:45',
    category: 'gate',
    title: '🚚 Gate Arrival: TRK-QA-7819 at Loading Bay 4',
    detail: '40ft air-ride trailer carrying Barco UDX-4K40 backup laser projectors arrived. Manifest verified by Logistics Lead.',
    severity: 'success',
  },
  {
    id: 'EVT-003',
    timestamp: '20:10:02',
    category: 'snag',
    title: '⚠️ Snag Escalation: SNAG-902 Kinetic Rig Lanyard',
    detail: 'Secondary safety wire checked and tension certified by Lead Rigging Engineer Klaus Mueller. Stage clearance signed.',
    severity: 'warning',
  },
  {
    id: 'EVT-004',
    timestamp: '20:07:30',
    category: 'safety',
    title: '🚨 Field Telemetry: Anemometer Main Grid 28 kts',
    detail: 'Wind speed within permissible operational threshold (<42 knots). Continuous ultrasonic monitoring active.',
    severity: 'info',
  },
  {
    id: 'EVT-005',
    timestamp: '20:03:15',
    category: 'gate',
    title: '🚚 Gate Arrival: TRK-DXB-9022 at VIP Majlis Gate 2',
    detail: 'Curtainsider transport with custom ceremonial pavilion carpet & acoustic panels cleared by security screening.',
    severity: 'success',
  },
  {
    id: 'EVT-006',
    timestamp: '19:58:40',
    category: 'snag',
    title: '⚠️ Snag Escalation: SNAG-908 AC Vibration Damped',
    detail: 'VIP Majlis condenser acoustic baffle fitted; sound pressure verified at 43 dB (well under 55 dB curfew limit).',
    severity: 'success',
  },
];

const INITIAL_SHOW_CUES: ShowCue[] = [
  {
    id: 'cue-01',
    code: 'CUE-01.00',
    title: 'Doors Open & Public Concourse Ingress',
    scheduledTime: '19:00',
    durationMinutes: 60,
    department: 'Front of House / Security',
    vipProtocol: false,
    status: 'completed',
    notes: 'Turnstiles open. Ambient lighting preset L-01 active. Background strings playback.',
  },
  {
    id: 'cue-02',
    code: 'CUE-02.00',
    title: 'VIP Majlis Arrival & Dignitary Reception',
    scheduledTime: '20:00',
    durationMinutes: 20,
    department: 'Amiri Protocol / Guest Relations',
    vipProtocol: true,
    status: 'live',
    notes: 'State motorcade reception. Ceremonial coffee service. Low ambient lighting preset L-02.',
  },
  {
    id: 'cue-03',
    code: 'CUE-03.00',
    title: 'Qatar National Anthem & Kinetic Chandelier Reveal',
    scheduledTime: '20:20',
    durationMinutes: 10,
    department: 'Show Caller / Audio / Automation',
    vipProtocol: true,
    status: 'armed',
    notes: 'Armed: Kinetic motor winches at standby 100%. Main PA unmuted. Spotlight on National Emblem.',
  },
  {
    id: 'cue-04',
    code: 'CUE-04.00',
    title: 'Emiri Diwan Keynote Address & 3D Hologram',
    scheduledTime: '20:30',
    durationMinutes: 25,
    department: 'Video / Lighting / Audio',
    vipProtocol: true,
    status: 'pending',
    notes: 'Holographic mesh screen drop. Shure Axient wireless mic channel 1 active. Barco 4K laser feed.',
  },
  {
    id: 'cue-05',
    code: 'CUE-05.00',
    title: 'Grand Finale Drone Swarm & Pyrotechnic Salute',
    scheduledTime: '20:55',
    durationMinutes: 15,
    department: 'Civil Defense / Special Effects',
    vipProtocol: true,
    status: 'pending',
    notes: '500-drone formation launched. Low-smoke cold spark jets armed. QCDD safety marshals in position.',
  },
];

export const LiveCommandCentreView: React.FC = () => {
  const { currentLanguage, apiClient, selectedProjectId, currentProject, currentUser } = useEosContext();
  const isRtl = currentLanguage === 'ar';
  const isDemo = isSyntheticDemo(selectedProjectId);
  const projectId = selectedProjectId || (isDemo ? 'PRJ-QND-2026' : '');
  const projectName = currentProject?.name || (isDemo ? 'Qatar National Day Celebrations 2026' : (projectId || 'Live Project'));

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'panels' | 'cues' | 'audience' | 'emergency'>('panels');
  const [emergencyIncidents, setEmergencyIncidents] = useState<any[]>(isDemo ? [
    {
      id: 'INC-EMG-01',
      tier: 'L3_CRITICAL',
      title: 'Kinetic Chandelier Winch #4 Brake Slip Warning',
      zone: 'ROYAL_MAJLIS_OVERHEAD',
      reportedAt: '20:14:02 AST',
      slaMinutes: 3,
      dispatchedMarshal: 'Capt. Rashid Al-Hajri (QCDD Liaison)',
      status: 'dispatched',
      auditHash: 'SHA256:9c1a3b8d7e2f5a0c',
    },
    {
      id: 'INC-EMG-02',
      tier: 'L2_OPERATIONAL',
      title: 'Main PA Line Array Subwoofer Amp Overheat',
      zone: 'STAGE_LEFT_RIG',
      reportedAt: '20:08:15 AST',
      slaMinutes: 15,
      dispatchedMarshal: 'Kareem Taha (Audio System Engineer)',
      status: 'in_progress',
      auditHash: 'SHA256:2b4c6d8e0f1a3c5e',
    },
    {
      id: 'INC-EMG-03',
      tier: 'L1_ROUTINE',
      title: 'VIP Gate 2 Egress Turnstile Sensor Scuff',
      zone: 'CONCOURSE_NORTH',
      reportedAt: '19:45:00 AST',
      slaMinutes: 60,
      dispatchedMarshal: 'Civil Ops Team B',
      status: 'contained',
      auditHash: 'SHA256:7f9a1b3c5e7d9e1f',
    },
  ] : []);

  // Push Feed & Ticker States
  const [pushEvents, setPushEvents] = useState<CommandPushEvent[]>(isDemo ? INITIAL_PUSH_EVENTS : []);
  const [feedFilter, setFeedFilter] = useState<'all' | 'gate' | 'snag' | 'safety' | 'vip'>('all');
  const [isTickerPaused, setIsTickerPaused] = useState<boolean>(false);
  const [tickerIndex, setTickerIndex] = useState<number>(0);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState<boolean>(false);
  const [simCategory, setSimCategory] = useState<'gate' | 'snag' | 'safety' | 'vip'>('gate');
  const [simTitle, setSimTitle] = useState<string>('');
  const [simDetail, setSimDetail] = useState<string>('');

  // Show Caller Countdown & VIP Cue States
  const [showCues, setShowCues] = useState<ShowCue[]>(isDemo ? INITIAL_SHOW_CUES : []);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(isDemo ? 14 * 60 + 32 : 0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(isDemo);
  const [cumulativeDelayMinutes, setCumulativeDelayMinutes] = useState<number>(isDemo ? 10 : 0);
  const [cueFeedbackToast, setCueFeedbackToast] = useState<string | null>(null);

  // Protective Action Modal
  const [isActionModalOpen, setIsActionModalOpen] = useState<boolean>(false);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [actionType, setActionType] = useState<string>('stop_work');
  const [justification, setJustification] = useState<string>(
    isDemo ? 'Severe wind gust warning above 45 knots near kinetic rig.' : ''
  );
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);

  // New Incident Modal
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState<boolean>(false);
  const [incidentType, setIncidentType] = useState<string>('technical');
  const [incidentSeverity, setIncidentSeverity] = useState<string>('medium');
  const [incidentZone, setIncidentZone] = useState<string>('MAIN_STAGE');
  const [incidentDesc, setIncidentDesc] = useState<string>('');

  const [lastUpdated, setLastUpdated] = useState<string>('09:15:00');

  // Web Audio Chime Helper (SSR safe)
  const playCueChime = () => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio playback blocked or not supported
    }
  };

  // Real-time Countdown Timer effect
  useEffect(() => {
    if (!isTimerRunning) return;
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isTimerRunning]);

  // Push Event Ticker auto-advance effect
  useEffect(() => {
    if (isTickerPaused) return;
    const tickerInterval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % pushEvents.length);
    }, 4500);
    return () => clearInterval(tickerInterval);
  }, [isTickerPaused, pushEvents.length]);

  const loadCommandCenter = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getLiveCommandCenter(projectId);
      setData(res);
      setLastUpdated(new Date().toLocaleTimeString('en-GB'));
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

  // Cue execution trigger handler
  const handleExecuteCue = (cueId: string) => {
    playCueChime();
    setShowCues((prevCues) => {
      let foundActive = false;
      const updated = prevCues.map((c) => {
        if (c.id === cueId) {
          foundActive = true;
          return { ...c, status: 'completed' as const };
        }
        if (foundActive && c.status === 'armed') {
          return { ...c, status: 'live' as const };
        }
        if (foundActive && c.status === 'pending') {
          foundActive = false;
          return { ...c, status: 'armed' as const };
        }
        return c;
      });
      return updated;
    });

    const targetCue = showCues.find((c) => c.id === cueId);
    setCueFeedbackToast(`⚡ GO! ${targetCue?.code}: "${targetCue?.title}" executed successfully.`);
    setTimeout(() => setCueFeedbackToast(null), 4000);

    // Reset countdown for the next armed cue
    setCountdownSeconds(10 * 60);
  };

  const handleHoldCue = (cueId: string) => {
    setShowCues((prev) =>
      prev.map((c) => (c.id === cueId ? { ...c, status: c.status === 'hold' ? 'armed' : ('hold' as const) } : c))
    );
    setIsTimerRunning((prev) => !prev);
  };

  const handleAdjustCueDelay = (minutesDelta: number) => {
    setCumulativeDelayMinutes((prev) => Math.max(0, prev + minutesDelta));
    setCountdownSeconds((prev) => Math.max(0, prev + minutesDelta * 60));
  };

  const handleAddSimulatedEvent = () => {
    if (!simTitle) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const newEvt: CommandPushEvent = {
      id: `EVT-${Date.now().toString().slice(-4)}`,
      timestamp: timeStr,
      category: simCategory,
      title: simTitle,
      detail: simDetail || 'Dispatched via Live Command Centre operator console.',
      severity: simCategory === 'safety' ? 'warning' : 'info',
    };
    setPushEvents([newEvt, ...pushEvents]);
    setIsSimulateModalOpen(false);
    setSimTitle('');
    setSimDetail('');
    setTickerIndex(0);
  };

  const filteredEvents = pushEvents.filter((evt) => {
    if (feedFilter === 'all') return true;
    return evt.category === feedFilter;
  });

  const activeTickerEvent = filteredEvents[tickerIndex % (filteredEvents.length || 1)] || pushEvents[0];

  const formatCountdown = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const nextArmedCue = showCues.find((c) => c.status === 'armed') || showCues.find((c) => c.status === 'live') || showCues[0];

  const handleExecuteAction = async () => {
    if (!selectedIncident) return;
    setIsSubmittingAction(true);
    try {
      await apiClient.executeProtectiveAction(selectedIncident.id, {
        incidentId: selectedIncident.id,
        protectiveAction: actionType,
        justification,
        authorizedBy: currentUser?.name ? `${currentUser.name} (${currentUser.role || 'Safety Lead'})` : 'Show Caller & Safety Lead',
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

  const handleReportIncident = async () => {
    try {
      await (apiClient as any).reportIncident({
        projectId,
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
      {/* Toast notification */}
      {cueFeedbackToast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            backgroundColor: 'var(--text-primary, #f8fafc)',
            color: '#10b981',
            border: '1px solid #10b981',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            fontWeight: 700,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span>{cueFeedbackToast}</span>
        </div>
      )}

      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
              🔴 {isRtl ? 'مركز القيادة والعمليات الميدانية الحية' : 'Live Operations Command Centre'}
            </h1>
            <Badge variant="danger">{isRtl ? 'تغذية تدقيق مباشرة' : 'LIVE AUDIT FEED'}</Badge>
            <Badge variant="neutral">ISO 20121 ACTIVE</Badge>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted, #94a3b8)', padding: '2px 8px', backgroundColor: 'var(--surface-inset, #0b111d)', border: '1px solid var(--border-default, #2a374b)', borderRadius: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }} />
              <span>{isRtl ? 'آخر نبض للاتصال:' : 'Telemetry Heartbeat:'} <strong style={{ color: 'var(--text-primary, #f8fafc)', fontFamily: 'monospace' }}>{lastUpdated} AST</strong></span>
            </div>
          </div>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary, #94a3b8)', fontSize: '13px' }}>
            {isRtl ? `${projectName} — القياس الفوري، تدابير الحماية الوقائية، وذكاء إدارة الفعاليات.` : `${projectName} — Real-time telemetry, protective controls, and event intelligence.`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button
            variant={activeTab === 'panels' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('panels')}
            id="tab-8panels"
          >
            {isRtl ? '8 لوحات عملياتية' : '8 Operations Panels'}
          </Button>
          <Button
            variant={activeTab === 'cues' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('cues')}
            id="tab-cues"
            style={{ backgroundColor: activeTab === 'cues' ? '#7c3aed' : undefined, color: activeTab === 'cues' ? '#ffffff' : undefined }}
          >
            🎙️ {isRtl ? 'مصفوفة إشارات كبار الشخصيات' : 'VIP Cue Matrix & Run-Sheet'}
          </Button>
          <Button
            variant={activeTab === 'audience' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('audience')}
            id="tab-audience"
          >
            {isRtl ? 'كثافة الجمهور والتوقعات' : 'Audience Density & Projection'}
          </Button>
          <Button
            variant={activeTab === 'emergency' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('emergency')}
            id="tab-emergency"
            style={{ backgroundColor: activeTab === 'emergency' ? '#dc2626' : undefined, color: activeTab === 'emergency' ? '#ffffff' : undefined }}
          >
            🚨 {isRtl ? 'إدارة الطوارئ والتصعيد' : 'Emergency Dispatch & Escalation'}
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

      {/* 🔴 REAL-TIME WEBSOCKET / SSE LIVE TICKER STRIP */}
      <div
        style={{
          backgroundColor: 'var(--canvas, #090d16)',
          border: '1px solid var(--border-subtle, #1d2939)',
          borderRadius: '8px',
          padding: '10px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              📡 SSE LIVE FEED TICKER
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>| Active Telemetry & Field Broadcast</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {/* Category filter pills */}
            {(['all', 'gate', 'snag', 'safety', 'vip'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setFeedFilter(cat);
                  setTickerIndex(0);
                }}
                style={{
                  backgroundColor: feedFilter === cat ? 'var(--surface-2, #151e2e)' : 'transparent',
                  color: feedFilter === cat ? 'var(--text-primary, #f8fafc)' : 'var(--text-muted, #94a3b8)',
                  border: `1px solid ${feedFilter === cat ? '#38bdf8' : 'var(--text-secondary, #cbd5e1)'}`,
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {cat === 'all' && 'All Feed'}
                {cat === 'gate' && '🚚 Gate Arrivals'}
                {cat === 'snag' && '⚠️ Snags'}
                {cat === 'safety' && '🚨 Field Safety'}
                {cat === 'vip' && '👑 VIP Protocol'}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setIsTickerPaused(!isTickerPaused)}
              style={{
                backgroundColor: 'var(--surface-2, #151e2e)',
                color: isTickerPaused ? '#f59e0b' : '#94a3b8',
                border: '1px solid var(--border-default, #2a374b)',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {isTickerPaused ? '▶️ Resume' : '⏸️ Pause'}
            </button>

            <button
              type="button"
              onClick={() => setIsSimulateModalOpen(true)}
              style={{
                backgroundColor: '#0284c7',
                color: 'var(--surface-1, #0f1624)',
                border: 'none',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + Push Simulated Alert
            </button>
          </div>
        </div>

        {/* Moving Ticker Banner Content */}
        {activeTickerEvent ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--text-primary, #f8fafc)',
              borderLeft: `4px solid ${activeTickerEvent.severity === 'critical' ? '#ef4444' : activeTickerEvent.severity === 'warning' ? '#f59e0b' : activeTickerEvent.category === 'vip' ? '#a855f7' : '#10b981'}`,
              padding: '8px 12px',
              borderRadius: '4px',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#94a3b8' }}>
                [{activeTickerEvent.timestamp}]
              </span>
              <strong style={{ fontSize: '12px', color: 'var(--surface-2, #151e2e)' }}>
                {activeTickerEvent.title}
              </strong>
              <span style={{ fontSize: '11px', color: 'var(--border-default, #2a374b)' }}>
                — {activeTickerEvent.detail}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)' }}>
                Item {tickerIndex + 1} of {filteredEvents.length}
              </span>
              <button
                type="button"
                onClick={() => setTickerIndex((prev) => (prev - 1 + filteredEvents.length) % filteredEvents.length)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0 4px' }}
              >
                ◀
              </button>
              <button
                type="button"
                onClick={() => setTickerIndex((prev) => (prev + 1) % filteredEvents.length)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0 4px' }}
              >
                ▶
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-muted, #94a3b8)', backgroundColor: 'var(--text-primary, #f8fafc)', borderRadius: '4px' }}>
            {isRtl ? 'لا توجد تنبيهات ميدانية حالياً — بانتظار أحداث البث المباشر' : 'No active field alerts in queue — Telemetry listener standing by'}
          </div>
        )}
      </div>

      {/* ⏱️ RUN-SHEET MINUTE-BY-MINUTE COUNTDOWN & CUE CONTROLLER BANNER */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.6) 0%, var(--canvas, #090d16) 100%)',
          border: '1px solid #312e81',
          borderRadius: '8px',
          padding: '16px 20px',
          color: 'var(--surface-1, #0f1624)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Show Caller Countdown Clock
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '2px' }}>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '32px',
                  fontWeight: 900,
                  color: countdownSeconds < 120 ? '#ef4444' : '#38bdf8',
                  letterSpacing: '0.05em',
                  textShadow: '0 0 12px rgba(56, 189, 248, 0.4)',
                }}
              >
                T-{formatCountdown(countdownSeconds)}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--border-default, #2a374b)' }}>
                to <strong style={{ color: 'var(--surface-1, #0f1624)' }}>{nextArmedCue?.code || 'CUE-00'}</strong>: {nextArmedCue?.title || (isRtl ? 'بانتظار بدء العرض' : 'Standby for Show Start')}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid var(--border-subtle, #1d2939)', paddingLeft: '16px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Cumulative Show Variance:</span>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '14px',
                fontWeight: 800,
                color: cumulativeDelayMinutes > 0 ? '#f59e0b' : '#10b981',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              +{cumulativeDelayMinutes}m
            </span>
          </div>
        </div>

        {/* Quick Adjust & Direct Trigger Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: '6px' }}>
            <button
              type="button"
              onClick={() => handleAdjustCueDelay(1)}
              style={{ background: 'none', border: '1px solid var(--border-default, #2a374b)', color: 'var(--surface-2, #151e2e)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
              title="Add 1 minute delay"
            >
              +1m
            </button>
            <button
              type="button"
              onClick={() => handleAdjustCueDelay(5)}
              style={{ background: 'none', border: '1px solid var(--border-default, #2a374b)', color: 'var(--surface-2, #151e2e)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
              title="Add 5 minutes delay"
            >
              +5m
            </button>
            <button
              type="button"
              onClick={() => handleAdjustCueDelay(-1)}
              style={{ background: 'none', border: '1px solid var(--border-default, #2a374b)', color: 'var(--surface-2, #151e2e)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
              title="Reduce 1 minute delay"
            >
              -1m
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => nextArmedCue && handleHoldCue(nextArmedCue.id)}
            disabled={!nextArmedCue}
            style={{ color: '#fcd34d', borderColor: '#f59e0b' }}
          >
            {isTimerRunning ? '⏸️ HOLD CLOCK' : '▶️ RESUME CLOCK'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => nextArmedCue && handleExecuteCue(nextArmedCue.id)}
            disabled={!nextArmedCue}
            style={{ backgroundColor: '#10b981', color: 'var(--surface-1, #0f1624)', fontWeight: 800 }}
            id="btn-trigger-next-cue"
          >
            ⚡ GO / EXECUTE {nextArmedCue?.code || ''}
          </Button>
        </div>
      </div>

      {/* Top Status Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <MetricCard
          title={isRtl ? 'حضور طاقم العمل المباشر' : 'Live Attendance'}
          label={isRtl ? 'حضور طاقم العمل المباشر' : 'Live Attendance'}
          value={`${panels?.crewDuty?.checkedInWorkers ?? (isDemo ? 38 : 0)} / ${panels?.crewDuty?.rosteredWorkers ?? (isDemo ? 42 : 0)}`}
          unit={isRtl ? 'فنيين' : 'Workers'}
          subtitle={isRtl ? `${panels?.crewDuty?.attendancePercentage ?? (isDemo ? 90 : 0)}% نسبة التواجد الميداني` : `${panels?.crewDuty?.attendancePercentage ?? (isDemo ? 90 : 0)}% on site (Rostered: ${panels?.crewDuty?.rosteredWorkers ?? (isDemo ? 42 : 0)})`}
          change={`${panels?.crewDuty?.attendancePercentage ?? (isDemo ? 90 : 0)}% on site`}
          trend="positive"
          accentColor="#059669"
        />
        <MetricCard
          title={isRtl ? 'بوابة الامتثال التنظيمي' : 'Regulatory Gate'}
          label={isRtl ? 'بوابة الامتثال التنظيمي' : 'Regulatory Gate'}
          value={panels?.compliance?.canOperate ? (isRtl ? 'مسموح التشغيل' : 'PERMITTED') : (isRtl ? 'محظور' : 'BLOCKED')}
          unit={isRtl ? 'حالة الاعتماد' : 'QCDD Gate'}
          subtitle={isRtl ? `${panels?.compliance?.activeObligations ?? (isDemo ? 3 : 0)} تصاريح نظامية نشطة` : `${panels?.compliance?.activeObligations ?? (isDemo ? 3 : 0)} verified active permits`}
          change={`${panels?.compliance?.activeObligations ?? (isDemo ? 3 : 0)} verified active`}
          trend={panels?.compliance?.canOperate ? 'positive' : 'negative'}
          accentColor={panels?.compliance?.canOperate ? '#059669' : '#dc2626'}
        />
        <MetricCard
          title={isRtl ? 'جدول إشارات العرض' : 'Show Cue Schedule'}
          label={isRtl ? 'جدول إشارات العرض' : 'Show Cue Schedule'}
          value={`+${panels?.runSheet?.cumulativeDelayMinutes ?? (isDemo ? 10 : 0)}`}
          unit={isRtl ? 'دقائق تأخير' : 'Minutes Delay'}
          subtitle={isRtl ? `${panels?.runSheet?.completedCues ?? (isDemo ? 1 : 0)}/${panels?.runSheet?.totalCues ?? (isDemo ? 4 : 0)} إشارات منجزة` : `${panels?.runSheet?.completedCues ?? (isDemo ? 1 : 0)}/${panels?.runSheet?.totalCues ?? (isDemo ? 4 : 0)} cues done`}
          change={`${panels?.runSheet?.completedCues ?? (isDemo ? 1 : 0)}/${panels?.runSheet?.totalCues ?? (isDemo ? 4 : 0)} cues done`}
          trend="neutral"
          accentColor="#d97706"
        />
        <MetricCard
          title={isRtl ? 'تعداد دخول الجمهور' : 'Venue Ingress Headcount'}
          label={isRtl ? 'تعداد دخول الجمهور' : 'Venue Ingress Headcount'}
          value={`${(audience?.currentInside ?? (isDemo ? 10850 : 0)).toLocaleString()}`}
          unit={isRtl ? 'زائر' : 'Attendees'}
          subtitle={isRtl ? `${audience?.occupancyPercentage ?? (isDemo ? 72 : 0)}% نسبة الإشغال` : `${audience?.occupancyPercentage ?? (isDemo ? 72 : 0)}% venue occupancy`}
          change={`${audience?.occupancyPercentage ?? (isDemo ? 72 : 0)}% venue occupancy`}
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
                <span style={{ fontSize: '13px', color: 'var(--text-muted, #94a3b8)' }}>Open Incidents: <strong>{panels?.incidentLog?.openIncidentsCount || 1}</strong></span>
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
                <strong>{panels?.crewDuty?.rosteredWorkers ?? (isDemo ? 42 : 0)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Checked-in via Biometric/QR:</span>
                <strong style={{ color: '#059669' }}>{panels?.crewDuty?.checkedInWorkers ?? (isDemo ? 38 : 0)} Present</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Statutory Hours Exceeded:</span>
                <strong style={{ color: '#059669' }}>0 (All within limit)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Mandatory Rest Interval:</span>
                <span>Configurable (10h Qatar Baseline)</span>
              </div>
              <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.12)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22c55e', fontSize: '11px' }}>
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
              <div style={{ backgroundColor: 'var(--surface-2, #151e2e)', padding: '8px', borderRadius: '4px', fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
                Fail-Closed Engine Status: <strong>RELEASE ELIGIBLE</strong> (0 Blockers)
              </div>
            </div>
          </Card>

          {/* Panel 4: Critical Path Run Sheet */}
          <Card title="4. Critical Path Show Run Sheet">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', backgroundColor: 'var(--surface-2, #151e2e)', borderRadius: '4px' }}>
                <span>CUE-01.00 Doors Open</span>
                <Badge variant="success">Completed</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', backgroundColor: '#fef3c7', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <span><strong>CUE-02.00 VIP Majlis Arrival</strong></span>
                <Badge variant="warning">In Progress (+10m)</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', backgroundColor: 'var(--surface-2, #151e2e)', borderRadius: '4px' }}>
                <span>CUE-03.00 National Anthem Reveal</span>
                <Badge variant="neutral">Pending (+10m shifted)</Badge>
              </div>
            </div>
          </Card>

          {/* Panel 5: Zone Readiness Heatmap */}
          <Card title="5. Zone Readiness Heatmap">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ padding: '10px', backgroundColor: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '6px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>MAIN_STAGE</div>
                <div style={{ fontSize: '11px', color: '#22c55e' }}>Ready (4/4 Gates)</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '6px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>VIP_MAJLIS</div>
                <div style={{ fontSize: '11px', color: '#22c55e' }}>Ready (Protocol Signed)</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '6px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>BACKSTAGE</div>
                <div style={{ fontSize: '11px', color: '#22c55e' }}>Ready (Security Cleared)</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '6px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>PUBLIC_CONCOURSE</div>
                <div style={{ fontSize: '11px', color: '#22c55e' }}>Ready (Egress Clear)</div>
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
              <p style={{ margin: 0, color: 'var(--text-muted, #94a3b8)', fontSize: '11px' }}>
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
              <p style={{ margin: 0, color: 'var(--text-muted, #94a3b8)', fontSize: '11px' }}>
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
              <p style={{ margin: 0, color: 'var(--text-muted, #94a3b8)', fontSize: '11px' }}>
                Safety brief completed: all 8 egress routes clear, QCDD marshals on posts.
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: VIP Show Caller & Cue Trigger Matrix */}
      {activeTab === 'cues' && (
        <Card title="VIP Cue Trigger Matrix & Show Caller Sequence (Minute-by-Minute Run Sheet)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted, #94a3b8)' }}>
                Operational cue execution with Web Audio chime feedback, multi-department telemetry integration, and dynamic show clock variance adjustment.
              </p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>Total Sequence: <strong>{showCues.length} Governed Cues</strong></span>
                <Badge variant="info">Amiri Protocol Signed</Badge>
              </div>
            </div>

            {showCues.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
                {isRtl ? 'لا توجد إشارات مسجلة لهذا العرض' : 'No cues registered in the run sheet for this project.'}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                {showCues.map((cue, index) => {
                  const isCurrentArmed = cue.status === 'armed';
                  const isLive = cue.status === 'live';
                  const isCompleted = cue.status === 'completed';
                  const isHold = cue.status === 'hold';

                  return (
                    <div
                      key={cue.id}
                      style={{
                        backgroundColor: isLive ? '#faf5ff' : isCurrentArmed ? '#f0fdf4' : isHold ? '#fffbeb' : 'var(--surface-1, #0f1624)',
                        border: `2px solid ${isLive ? '#a855f7' : isCurrentArmed ? '#22c55e' : isHold ? '#f59e0b' : 'var(--border-default, #2a374b)'}`,
                        borderRadius: '8px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px',
                        boxShadow: isCurrentArmed ? '0 0 12px rgba(34, 197, 94, 0.2)' : isLive ? '0 0 12px rgba(168, 85, 247, 0.2)' : 'none',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 900, color: 'var(--text-primary, #f8fafc)' }}>
                            {cue.code}
                          </span>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            {cue.vipProtocol && (
                              <Badge variant="danger">👑 VIP PROTOCOL</Badge>
                            )}
                            <Badge
                              variant={isCompleted ? 'neutral' : isLive ? 'danger' : isCurrentArmed ? 'success' : isHold ? 'warning' : 'neutral'}
                            >
                              {isCompleted ? 'COMPLETED' : isLive ? 'LIVE NOW' : isCurrentArmed ? 'ARMED / STANDBY' : isHold ? 'HELD' : 'PENDING'}
                            </Badge>
                          </div>
                        </div>

                        <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
                          {cue.title}
                        </h4>

                        <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: 'var(--text-secondary, #cbd5e1)' }}>
                          {cue.notes}
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
                          <div>Dept: <strong style={{ color: 'var(--text-secondary, #cbd5e1)' }}>{cue.department}</strong></div>
                          <div>Target: <strong style={{ color: 'var(--text-secondary, #cbd5e1)' }}>{cue.scheduledTime} AST</strong></div>
                          <div>Duration: <strong style={{ color: 'var(--text-secondary, #cbd5e1)' }}>{cue.durationMinutes} mins</strong></div>
                          <div>Seq Index: <strong style={{ color: 'var(--text-secondary, #cbd5e1)' }}>#{index + 1}</strong></div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-default, #2a374b)', paddingTop: '12px', marginTop: '4px' }}>
                        {!isCompleted && (
                          <Button
                            variant={isCurrentArmed ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => handleExecuteCue(cue.id)}
                            style={{
                              flex: 1,
                              backgroundColor: isCurrentArmed ? '#10b981' : undefined,
                              borderColor: isCurrentArmed ? '#10b981' : undefined,
                              fontWeight: 800,
                            }}
                          >
                            ⚡ GO / EXECUTE
                          </Button>
                        )}
                        {!isCompleted && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleHoldCue(cue.id)}
                            style={{ color: isHold ? '#10b981' : '#d97706', borderColor: '#f59e0b' }}
                          >
                            {isHold ? '▶️ RELEASE' : '⏸️ HOLD'}
                          </Button>
                        )}
                        {isCompleted && (
                          <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            ✓ Cue Successfully Executed & Time-Stamped
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'audience' && (
        <Card title="Audience Density & Ingress Projection Engine">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div style={{ padding: '16px', backgroundColor: 'var(--surface-2, #151e2e)', borderRadius: '8px', border: '1px solid var(--border-default, #2a374b)' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: 'var(--text-primary, #f8fafc)' }}>Capacity Utilization</h4>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#0284c7' }}>{audience?.occupancyPercentage ?? (isDemo ? 72 : 0)}%</div>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                Current Inside: <strong>{(audience?.currentInside ?? (isDemo ? 10850 : 0)).toLocaleString()}</strong> / Venue Max: <strong>{(audience?.venueCapacity ?? (isDemo ? 15000 : 0)).toLocaleString()}</strong>
              </p>
            </div>

            <div style={{ padding: '16px', backgroundColor: 'var(--surface-2, #151e2e)', borderRadius: '8px', border: '1px solid var(--border-default, #2a374b)' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: 'var(--text-primary, #f8fafc)' }}>Flow Rate Telemetry</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', margin: '8px 0' }}>
                <span>Ingress Gates:</span>
                <strong>+{(audience?.ingressRatePerHour ?? (isDemo ? 1400 : 0))} pax/hr</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', margin: '8px 0' }}>
                <span>Egress Portals:</span>
                <strong>-{(audience?.egressRatePerHour ?? (isDemo ? 350 : 0))} pax/hr</strong>
              </div>
            </div>

            <div style={{ padding: '16px', backgroundColor: 'var(--surface-2, #151e2e)', borderRadius: '8px', border: '1px solid var(--border-default, #2a374b)' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: 'var(--text-primary, #f8fafc)' }}>Peak Forecast & Metering</h4>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
                {(audience?.peakProjectedHeadcount ?? (isDemo ? 12950 : 0)).toLocaleString()} pax peak
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

      {/* Item 6: Multi-Tier Incident Escalation Matrix & Emergency Dispatch (P04 / AT-063) */}
      {activeTab === 'emergency' && (
        <Card title="Multi-Tier Incident Escalation Matrix & Emergency Dispatch (P04 / AT-063)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>🚨</span>
                <div>
                  <strong style={{ fontSize: '13px', color: '#9f1239' }}>3-Tier Emergency Protocol Active:</strong>
                  <div style={{ fontSize: '12px', color: '#be123c', marginTop: '2px' }}>
                    Level 3 Structural / Life Safety incidents trigger immediate automated dispatch within 3-minute SLA window with push notifications to QCDD marshals.
                  </div>
                </div>
              </div>
              <Badge variant="danger">QCDD ESCALATION ARMED</Badge>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div style={{ border: '1px solid var(--border-default, #2a374b)', borderRadius: '8px', padding: '16px', backgroundColor: 'var(--surface-2, #151e2e)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <Badge variant="neutral">LEVEL 1: ROUTINE</Badge>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>SLA: 60 Minutes</span>
                </div>
                <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: 'var(--text-primary, #f8fafc)' }}>Minor Field Snags</h4>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted, #94a3b8)', lineHeight: 1.5 }}>
                  Scuffed fascia paint, cable ramp adjustments, minor decorative fabric fixes. Handled by roaming civil site crew.
                </p>
              </div>

              <div style={{ border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', padding: '16px', backgroundColor: 'rgba(245, 158, 11, 0.12)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <Badge variant="warning">LEVEL 2: OPERATIONAL</Badge>
                  <span style={{ fontSize: '11px', color: '#b45309' }}>SLA: 15 Minutes</span>
                </div>
                <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: '#f59e0b' }}>Show Flow Impact</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#78350f', lineHeight: 1.5 }}>
                  Video processor heat throttle, line-array amplifier failover, stage turntable latency. Handled by senior department leads.
                </p>
              </div>

              <div style={{ border: '1px solid #fecdd3', borderRadius: '8px', padding: '16px', backgroundColor: '#fff1f2' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <Badge variant="danger">LEVEL 3: CRITICAL</Badge>
                  <span style={{ fontSize: '11px', color: '#9f1239', fontWeight: 800 }}>SLA: 3 Minutes</span>
                </div>
                <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: '#9f1239' }}>Structural & Life Safety</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#881337', lineHeight: 1.5 }}>
                  Winch brake slippage, wind gusts &gt;28 knots, QCDD emergency exit obstruction. Triggers instant show caller stop-work.
                </p>
              </div>
            </div>

            <div style={{ border: '1px solid var(--border-default, #2a374b)', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', backgroundColor: 'var(--text-primary, #f8fafc)', color: 'var(--surface-1, #0f1624)', fontWeight: 700, fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Active Incident Dispatch Register & Cryptographic Hash Chain</span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Live Telemetry Sync</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--surface-2, #151e2e)', borderBottom: '1px solid var(--border-default, #2a374b)', color: 'var(--text-secondary, #cbd5e1)', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 16px' }}>Incident Code</th>
                    <th style={{ padding: '12px 16px' }}>Tier</th>
                    <th style={{ padding: '12px 16px' }}>Issue Description</th>
                    <th style={{ padding: '12px 16px' }}>Zone</th>
                    <th style={{ padding: '12px 16px' }}>SLA Target</th>
                    <th style={{ padding: '12px 16px' }}>Dispatched Marshal</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Audit Hash</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {emergencyIncidents.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
                        {isRtl ? 'لا توجد حوادث طوارئ مفتوحة — كافة الأنظمة آمنة' : 'No active emergency incidents recorded — All systems normal'}
                      </td>
                    </tr>
                  ) : emergencyIncidents.map((inc) => (
                    <tr key={inc.id} style={{ borderBottom: '1px solid var(--border-subtle, #1d2939)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, fontFamily: 'monospace' }}>{inc.id}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge variant={inc.tier.startsWith('L3') ? 'danger' : inc.tier.startsWith('L2') ? 'warning' : 'neutral'}>
                          {inc.tier}
                        </Badge>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{inc.title}</td>
                      <td style={{ padding: '12px 16px', color: '#0284c7' }}>{inc.zone}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: inc.tier.startsWith('L3') ? '#dc2626' : '#b45309', fontWeight: 700 }}>
                        {inc.slaMinutes}m SLA ({inc.status.toUpperCase()})
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary, #cbd5e1)' }}>{inc.dispatchedMarshal}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
                        {inc.auditHash}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <Button
                          size="sm"
                          variant={inc.status === 'contained' ? 'secondary' : 'danger'}
                          onClick={() => {
                            setEmergencyIncidents((prev) =>
                              prev.map((i) => (i.id === inc.id ? { ...i, status: i.status === 'contained' ? 'dispatched' : 'contained' } : i))
                            );
                            playCueChime();
                          }}
                        >
                          {inc.status === 'contained' ? 'Re-open' : '⚡ Rapid Contain'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                placeholder="Specify technical justification or safety rationale..."
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

      {/* Simulate Live Push Alert Modal */}
      {isSimulateModalOpen && (
        <Modal
          isOpen={isSimulateModalOpen}
          onClose={() => setIsSimulateModalOpen(false)}
          title="📡 Broadcast Simulated Live Push Event"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Feed Category</label>
              <Select
                value={simCategory}
                onChange={(e) => setSimCategory(e.target.value as any)}
                options={[
                  { value: 'gate', label: '🚚 Truck Gate Arrival' },
                  { value: 'snag', label: '⚠️ Snag Escalation' },
                  { value: 'safety', label: '🚨 Field Safety & Telemetry' },
                  { value: 'vip', label: '👑 VIP Protocol Movement' },
                ]}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Alert Headline / Title</label>
              <Input
                value={simTitle}
                onChange={(e) => setSimTitle(e.target.value)}
                placeholder="e.g. TRK-QA-9901 Arrived at Gate 3 with Pyrotechnics"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Detail & Manifest / Verification Data</label>
              <Textarea
                value={simDetail}
                onChange={(e) => setSimDetail(e.target.value)}
                placeholder="Details of customs clearance, driver contact, zone routing, or technician sign-off..."
                rows={3}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="outline" onClick={() => setIsSimulateModalOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={handleAddSimulatedEvent}
                disabled={!simTitle}
                style={{ backgroundColor: '#0284c7' }}
              >
                Broadcast to Live Ticker
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
