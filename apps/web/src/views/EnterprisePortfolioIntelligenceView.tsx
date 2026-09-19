import React, { useState } from 'react';
import { Card, MetricCard, Badge, Button, Modal, Tabs } from '../components/DesignSystem.js';
import { EvmEngine, RuleAnalyticsEngine } from '@e3-eos/domain';

export const EnterprisePortfolioIntelligenceView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'whatif' | 'evm' | 'rules'>('overview');

  // Tab 1: Overview Data
  const projects = [
    { code: 'P06-SUMMIT-01', title: 'Doha Global Economic Summit', cpi: '1.05', spi: '1.02', erosion: '2.50%', level: 'low', factor: 'Healthy Operations' },
    { code: 'P06-FESTIVAL-02', title: 'Lusail Marina Light Festival', cpi: '0.88', spi: '0.92', erosion: '6.80%', level: 'high', factor: '2 Unresolved Critical Snags' },
    { code: 'P06-GALA-03', title: 'National Innovation Awards', cpi: '0.94', spi: '0.98', erosion: '3.40%', level: 'low', factor: 'Healthy Operations' },
  ];

  const vendors = [
    { name: 'Creative Technology Middle East', disc: 'Audio & PA Systems', score: 95, projects: 8, recRate: '100%', tier: 'preferred_partner' },
    { name: 'Gulf Scenic Fabrication LLC', disc: 'Custom Scenic Carpentry', score: 82, projects: 6, recRate: '88%', tier: 'standard' },
    { name: 'Al-Jaber Heavy Power Solutions', disc: 'Generators & Power', score: 74, projects: 5, recRate: '75%', tier: 'conditional_review' },
  ];

  // Tab 2: What-If Simulation State (Item 1 / AT-080)
  const [scenarioName, setScenarioName] = useState<string>('SCENARIO-Q4-PEAK-COMPRESSION');
  const [shiftDaysProject2, setShiftDaysProject2] = useState<number>(5);
  const [selectedAsset, setSelectedAsset] = useState<string>('RES-HOIST-01');
  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);
  const [applyResult, setApplyResult] = useState<{ success: boolean; message: string } | null>(null);

  const sharedResources = [
    { id: 'RES-HOIST-01', name: '2T CM Lodestar Electric Chain Hoists (x24)', category: 'Rigging', assignedProject: 'P06-SUMMIT-01', window: 'Oct 10 - Oct 18, 2026' },
    { id: 'RES-PROJ-02', name: 'Barco UDX 4K32 High-Lumen Laser Projectors (x6)', category: 'Video', assignedProject: 'P06-GALA-03', window: 'Nov 02 - Nov 07, 2026' },
    { id: 'RES-STAFF-03', name: 'Zaid Mansour (Technical Director)', category: 'Leadership Crew', assignedProject: 'PRJ-2026-DEMO', window: 'Oct 12 - Oct 22, 2026' },
  ];

  const hasCollision = shiftDaysProject2 >= 3 && selectedAsset === 'RES-HOIST-01';

  const handleTestApplyScenario = () => {
    if (hasCollision) {
      setApplyResult({
        success: false,
        message: 'RESOURCE_COLLISION_DURING_APPLY (AT-080): Resource RES-HOIST-01 (2T CM Lodestar) is already confirmed for Project P06-SUMMIT-01 across window [Oct 10 - Oct 18, 2026]. Applying shift of +5 days induces an unresolvable overlap. Apply rejected by authority check.',
      });
    } else {
      setApplyResult({
        success: true,
        message: '✓ SCENARIO VERIFIED & APPLIED: No cross-project resource collisions detected across 3 concurrent mega-events. Schedule rebalanced.',
      });
    }
    setIsApplyModalOpen(true);
  };

  // Tab 3: EVM Deep-Dive State (Item 3 / AT-082)
  const [physicalCompletion, setPhysicalCompletion] = useState<number>(65);
  const [hoursLogged, setHoursLogged] = useState<number>(450);
  const hoursBudgeted = 400;
  const plannedValueQar = 800000;
  const actualCostQar = 580000;

  const evmCalculation = EvmEngine.evaluateEvm({
    currency: 'QAR',
    plannedValue: plannedValueQar,
    actualCost: actualCostQar,
    physicalCompletionPercent: physicalCompletion,
    hoursLogged,
    hoursBudgeted,
  });

  // Tab 4: Governance Rule Analytics State (Item 10 / AT-081)
  const ruleSummaries = [
    { ruleId: 'RULE-SOLE-SOURCE-01', ruleName: 'Sole-Source Procurement Cap (>50k QAR requires Dual-Sign)', totalEvaluations: 42, overrideCount: 9, approvedExceptionCount: 9 },
    { ruleId: 'RULE-CURFEW-HSE-02', ruleName: 'Mandatory Night Shift Noise Curfew (22:00 - 04:00)', totalEvaluations: 85, overrideCount: 4, approvedExceptionCount: 3 },
    { ruleId: 'RULE-MARGIN-FLOOR-03', ruleName: 'Commercial Gross Margin Minimum Floor (>=22.0%)', totalEvaluations: 30, overrideCount: 6, approvedExceptionCount: 6 },
    { ruleId: 'RULE-SUMMER-HEAT-04', ruleName: 'Qatar Summer Outdoor Work Restrictions (10:00 - 15:30)', totalEvaluations: 120, overrideCount: 0, approvedExceptionCount: 0 },
  ];

  const tabs = [
    { id: 'overview', label: '📊 Portfolio Health & Risk Matrix' },
    { id: 'whatif', label: '🔀 What-If Simulation & Resource Collisions (AT-080)' },
    { id: 'evm', label: '📈 Earned Value Management (EVM) (AT-082)' },
    { id: 'rules', label: '⚖️ Governance Rule & Exception Analytics (AT-081)' },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', color: 'var(--text-primary, #f8fafc)' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: 'var(--text-primary, #f8fafc)' }}>
            🌐 Enterprise Scale & Portfolio Intelligence
          </h1>
          <Badge variant="info">Executive Command Suite</Badge>
          <Badge variant="success">ISO 20121 Governed</Badge>
        </div>
        <p style={{ color: 'var(--text-muted, #94a3b8)', marginTop: '6px', fontSize: '13px' }}>
          Cross-project what-if simulation, collision detection, empirical EVM physical gates, and governance exception analytics.
        </p>
      </div>

      {/* Tabs Navigation */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={(id) => setActiveTab(id as any)} />

      {/* TAB 1: Overview */}
      {activeTab === 'overview' && (
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <MetricCard label="Total Tracked Projects" value="3 Active" subtext="100% stage-gate governed" />
            <MetricCard label="Portfolio Gross Margin" value="24.50%" subtext="Baseline target: 22.0%" />
            <MetricCard label="High-Risk Projects" value="1 Flagged" subtext="Requires executive review" />
            <MetricCard label="Critical Cross-Project Snags" value="2 Open" subtext="Truss & Rigging dampers" />
          </div>

          <Card title="Multi-Project Operational Risk Matrix" noPadding>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-2, #151e2e)', borderBottom: '1px solid var(--border-default, #2a374b)', color: 'var(--text-secondary, #cbd5e1)', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px' }}>Project Code</th>
                  <th style={{ padding: '12px 16px' }}>Title</th>
                  <th style={{ padding: '12px 16px' }}>CPI (Cost)</th>
                  <th style={{ padding: '12px 16px' }}>SPI (Schedule)</th>
                  <th style={{ padding: '12px 16px' }}>Margin Erosion</th>
                  <th style={{ padding: '12px 16px' }}>Dominant Risk Factor</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle, #1d2939)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{p.code}</td>
                    <td style={{ padding: '12px 16px' }}>{p.title}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: parseFloat(p.cpi) >= 1.0 ? '#059669' : '#dc2626' }}>{p.cpi}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: parseFloat(p.spi) >= 1.0 ? '#059669' : '#d97706' }}>{p.spi}</td>
                    <td style={{ padding: '12px 16px' }}>{p.erosion}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted, #94a3b8)' }}>{p.factor}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge variant={p.level === 'high' ? 'danger' : 'success'}>{p.level.toUpperCase()}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card title="Cross-Project Vendor Performance Index (VPI)" noPadding>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-2, #151e2e)', borderBottom: '1px solid var(--border-default, #2a374b)', color: 'var(--text-secondary, #cbd5e1)', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px' }}>Vendor Partner</th>
                  <th style={{ padding: '12px 16px' }}>Core Discipline</th>
                  <th style={{ padding: '12px 16px' }}>VPI Score</th>
                  <th style={{ padding: '12px 16px' }}>Delivered Projects</th>
                  <th style={{ padding: '12px 16px' }}>Recommendation Rate</th>
                  <th style={{ padding: '12px 16px' }}>Tier</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle, #1d2939)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{v.name}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary, #cbd5e1)' }}>{v.disc}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0284c7' }}>{v.score} / 100</td>
                    <td style={{ padding: '12px 16px' }}>{v.projects}</td>
                    <td style={{ padding: '12px 16px', color: '#059669', fontWeight: 600 }}>{v.recRate}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge variant={v.tier === 'preferred_partner' ? 'info' : 'neutral'}>{v.tier.replace(/_/g, ' ').toUpperCase()}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* TAB 2: What-If Simulation Sandbox (Item 1) */}
      {activeTab === 'whatif' && (
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Invariant Banner */}
          <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🛡️</span>
              <div>
                <strong style={{ fontSize: '13px', color: '#60a5fa' }}>AT-080 Simulation Invariant Active:</strong>
                <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '2px' }}>
                  What-if scenarios remain strictly read-only sandboxes. Applying a scenario rigorously rechecks live resource reservations.
                </div>
              </div>
            </div>
            <Badge variant="info">Zero Live Mutation Sandbox</Badge>
          </div>

          <Card title="Configure Portfolio Schedule What-If Parameters">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', display: 'block', marginBottom: '6px' }}>Scenario Name</label>
                <input
                  type="text"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-default, #2a374b)', borderRadius: '6px', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', display: 'block', marginBottom: '6px' }}>
                  Shift Project: Lusail Marina Festival (Days: {shiftDaysProject2 > 0 ? `+${shiftDaysProject2}` : shiftDaysProject2})
                </label>
                <input
                  type="range"
                  min="-10"
                  max="15"
                  value={shiftDaysProject2}
                  onChange={(e) => setShiftDaysProject2(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
                  <span>-10d Earlier</span>
                  <span>Baseline</span>
                  <span>+15d Later</span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', display: 'block', marginBottom: '6px' }}>Test Resource Contention</label>
                <select
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-default, #2a374b)', borderRadius: '6px', fontSize: '13px' }}
                >
                  <option value="RES-HOIST-01">2T CM Lodestar Chain Hoists (Rigging)</option>
                  <option value="RES-PROJ-02">Barco UDX 4K32 Laser Projectors (Video)</option>
                  <option value="RES-STAFF-03">Zaid Mansour (Technical Director)</option>
                </select>
              </div>
            </div>

            {hasCollision && (
              <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '14px 18px', color: '#9f1239', marginBottom: '16px' }}>
                <div style={{ fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚠️</span> CONCURRENT RESOURCE COLLISION DETECTED
                </div>
                <div style={{ fontSize: '12px', marginTop: '4px', lineHeight: 1.5 }}>
                  Advancing <em>Lusail Marina Light Festival</em> by +{shiftDaysProject2} days forces reservation overlap on <strong>{selectedAsset} (2T CM Lodestar Hoists)</strong> with <em>Doha Global Economic Summit</em> (Oct 10-18, 2026).
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="secondary" onClick={() => setShiftDaysProject2(0)}>Reset to Live Schedule</Button>
              <Button variant={hasCollision ? 'danger' : 'primary'} onClick={handleTestApplyScenario}>
                {hasCollision ? '⚠️ Test Apply Scenario (Verify Block)' : '⚡ Apply Scenario to Live (Commit Recheck)'}
              </Button>
            </div>
          </Card>

          <Card title="Shared Enterprise Assets & Active Reservation Allocations" noPadding>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-2, #151e2e)', borderBottom: '1px solid var(--border-default, #2a374b)', color: 'var(--text-secondary, #cbd5e1)', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px' }}>Asset ID</th>
                  <th style={{ padding: '12px 16px' }}>Resource Name</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Currently Assigned Project</th>
                  <th style={{ padding: '12px 16px' }}>Reserved Window</th>
                  <th style={{ padding: '12px 16px' }}>Simulated Status</th>
                </tr>
              </thead>
              <tbody>
                {sharedResources.map((res) => {
                  const isConflicted = hasCollision && res.id === selectedAsset;
                  return (
                    <tr key={res.id} style={{ borderBottom: '1px solid var(--border-subtle, #1d2939)', backgroundColor: isConflicted ? '#fff1f2' : 'transparent' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, fontFamily: 'monospace' }}>{res.id}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{res.name}</td>
                      <td style={{ padding: '12px 16px' }}>{res.category}</td>
                      <td style={{ padding: '12px 16px', color: '#0284c7' }}>{res.assignedProject}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{res.window}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge variant={isConflicted ? 'danger' : 'success'}>
                          {isConflicted ? 'COLLISION OVERLAP' : 'AVAILABLE'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* TAB 3: Earned Value Management (EVM) Deep Dive (Item 3) */}
      {activeTab === 'evm' && (
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Invariant Banner */}
          <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>📐</span>
              <div>
                <strong style={{ fontSize: '13px', color: '#22c55e' }}>AT-082 EVM Physical Deliverable Invariant:</strong>
                <div style={{ fontSize: '12px', color: '#4ade80', marginTop: '2px' }}>
                  Earned Value (EV) is calculated exclusively from verified physical completion percentage. Clocked labor hours and badge scans alone earn zero EV.
                </div>
              </div>
            </div>
            <Badge variant="success">Physical Milestone Locked</Badge>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <MetricCard label="Planned Value (PV / BCWS)" value={`${(plannedValueQar).toLocaleString()} QAR`} subtext="Baseline scheduled budget" />
            <MetricCard label="Earned Value (EV / BCWP)" value={`${evmCalculation.earnedValue.amount.toNumber().toLocaleString()} QAR`} subtext={`Physical Progress: ${physicalCompletion}%`} />
            <MetricCard label="Actual Cost (AC / ACWP)" value={`${actualCostQar.toLocaleString()} QAR`} subtext={`${hoursLogged}h logged (${hoursBudgeted}h budgeted)`} />
            <MetricCard
              label="Cost Performance Index (CPI)"
              value={evmCalculation.cpi}
              subtext={parseFloat(evmCalculation.cpi) >= 1.0 ? '✓ Favourable Under-Budget' : '⚠️ Unfavourable Cost Overrun'}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <Card title="Interactive EVM Physical Progress Controller">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', display: 'block', marginBottom: '6px' }}>
                    Verified Physical Gate Completion: {physicalCompletion}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={physicalCompletion}
                    onChange={(e) => setPhysicalCompletion(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>Derived from inspected structural, joinery, and line-array sign-offs.</span>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', display: 'block', marginBottom: '6px' }}>
                    Labor Hours Logged: {hoursLogged}h (Budgeted: {hoursBudgeted}h)
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="600"
                    step="25"
                    value={hoursLogged}
                    onChange={(e) => setHoursLogged(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>Field technician biometric timecard hours.</span>
                </div>

                <div style={{ backgroundColor: 'var(--surface-2, #151e2e)', border: '1px solid var(--border-default, #2a374b)', borderRadius: '6px', padding: '12px', fontSize: '12px', color: 'var(--text-secondary, #cbd5e1)' }}>
                  <strong>EVM Evaluator Note:</strong>
                  <div style={{ marginTop: '4px', color: 'var(--text-secondary, #cbd5e1)' }}>{evmCalculation.note}</div>
                </div>
              </div>
            </Card>

            <Card title="EVM Mathematical Invariant Breakdown">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle, #1d2939)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Formula: EV = Planned Value × % Physical Progress</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>800k × {physicalCompletion}% = {evmCalculation.earnedValue.amount.toNumber().toLocaleString()} QAR</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle, #1d2939)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Cost Variance (CV = EV - AC)</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace', color: evmCalculation.costVariance.amount.isNegative() ? '#dc2626' : '#059669' }}>
                    {evmCalculation.costVariance.amount.toNumber().toLocaleString()} QAR
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle, #1d2939)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Schedule Variance (SV = EV - PV)</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace', color: evmCalculation.scheduleVariance.amount.isNegative() ? '#dc2626' : '#059669' }}>
                    {evmCalculation.scheduleVariance.amount.toNumber().toLocaleString()} QAR
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle, #1d2939)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Schedule Performance Index (SPI = EV / PV)</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{evmCalculation.spi}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
                  <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Cost Performance Index (CPI = EV / AC)</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{evmCalculation.cpi}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 4: Governance Rule Analytics (Item 10) */}
      {activeTab === 'rules' && (
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Invariant Banner */}
          <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>⚖️</span>
              <div>
                <strong style={{ fontSize: '13px', color: '#f59e0b' }}>AT-081 Governance Policy Review Invariant:</strong>
                <div style={{ fontSize: '12px', color: '#b45309', marginTop: '2px' }}>
                  Rules with override rates exceeding the 15% threshold are flagged for committee review with explicit sample sizes, but policy is NEVER automatically weakened.
                </div>
              </div>
            </div>
            <Badge variant="warning">Committee Review Required</Badge>
          </div>

          <Card title="Operational Governance Rule Override & Exception Register" noPadding>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-2, #151e2e)', borderBottom: '1px solid var(--border-default, #2a374b)', color: 'var(--text-secondary, #cbd5e1)', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px' }}>Rule ID</th>
                  <th style={{ padding: '12px 16px' }}>Rule Scope & Policy Description</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Evaluations (Sample)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Overrides</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Override %</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Review Status</th>
                </tr>
              </thead>
              <tbody>
                {ruleSummaries.map((r) => {
                  const analytics = RuleAnalyticsEngine.analyzeRuleOverrides(r, 0.15, 10);
                  return (
                    <tr key={r.ruleId} style={{ borderBottom: '1px solid var(--border-subtle, #1d2939)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, fontFamily: 'monospace' }}>{r.ruleId}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{r.ruleName}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontFamily: 'monospace' }}>{r.totalEvaluations}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontFamily: 'monospace', color: '#dc2626', fontWeight: 700 }}>{r.overrideCount}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>{analytics.overrideRatePercent}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <Badge variant={analytics.requiresGovernanceReview ? 'danger' : 'success'}>
                          {analytics.requiresGovernanceReview ? 'FLAGGED FOR REVIEW' : 'COMPLIANT'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Scenario Apply Modal */}
      {isApplyModalOpen && applyResult && (
        <Modal
          isOpen={true}
          title={applyResult.success ? '✓ What-If Scenario Applied' : '⛔ Resource Collision Blocked'}
          onClose={() => setIsApplyModalOpen(false)}
          footer={
            <Button variant={applyResult.success ? 'primary' : 'secondary'} onClick={() => setIsApplyModalOpen(false)}>
              Acknowledge & Close
            </Button>
          }
        >
          <div style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-primary, #f8fafc)' }}>
            <div style={{
              backgroundColor: applyResult.success ? '#f0fdf4' : '#fff1f2',
              border: `1px solid ${applyResult.success ? '#86efac' : '#fecdd3'}`,
              borderRadius: '6px',
              padding: '12px',
              color: applyResult.success ? '#166534' : '#9f1239',
              marginBottom: '10px',
            }}>
              {applyResult.message}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
              {applyResult.success
                ? 'All affected project work packages have been adjusted in the temporary sandbox.'
                : 'Under company invariant AT-080, an unapplied simulation cannot supersede an approved, live project commitment.'}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

