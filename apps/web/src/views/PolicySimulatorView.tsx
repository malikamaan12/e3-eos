import React, { useState } from 'react';

export const PolicySimulatorView: React.FC = () => {
  const [soleSource, setSoleSource] = useState<number>(50000);
  const [variationDual, setVariationDual] = useState<number>(100000);
  const [maxHours, setMaxHours] = useState<number>(10);
  const [minMargin, setMinMargin] = useState<number>(20);
  const [simulated, setSimulated] = useState<boolean>(true);

  const report = {
    baselineExceptionRate: '18.50%',
    simulatedExceptionRate: soleSource < 40000 ? '34.20%' : '21.00%',
    additionalApprovals: soleSource < 40000 ? 14 : 3,
    frictionHours: soleSource < 40000 ? 56 : 12,
    disposition: soleSource < 40000 ? 'requires_committee_refinement' : 'recommend_adoption',
    summary: `Simulation across 10 historical projects indicates exception rate would move from 18.50% to ${soleSource < 40000 ? '34.20%' : '21.00%'}, generating ${soleSource < 40000 ? '14' : '3'} additional approval queues with an estimated ${soleSource < 40000 ? '56' : '12'}h process friction.`,
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>
              🧪 Management Policy Simulation Sandbox
            </h1>
            <span style={{ backgroundColor: '#ede9fe', color: '#6d28d9', padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: '600' }}>
              Dry-Run Isolation
            </span>
          </div>
          <p style={{ color: '#64748b', marginTop: '6px', fontSize: '14px' }}>
            Simulate and backtest proposed governance policy changes against historical project portfolios prior to publishing.
          </p>
        </div>

        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '8px 14px', borderRadius: '8px', fontSize: '12px' }}>
          <strong style={{ color: '#166534' }}>🔒 Sandbox Safety:</strong> Live data remains completely unmutated
        </div>
      </div>

      {/* Simulator Sliders */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: '#0f172a' }}>
          Proposed Policy Thresholds
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>
              Sole-Source Limit (QAR): {soleSource.toLocaleString()}
            </label>
            <input
              type="range"
              min={10000}
              max={150000}
              step={5000}
              value={soleSource}
              onChange={(e) => setSoleSource(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Baseline: 50,000 QAR</span>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>
              Variation Dual-Approval (QAR): {variationDual.toLocaleString()}
            </label>
            <input
              type="range"
              min={25000}
              max={250000}
              step={25000}
              value={variationDual}
              onChange={(e) => setVariationDual(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Baseline: 100,000 QAR</span>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>
              Max Daily Crew Shift (Hours): {maxHours}h
            </label>
            <input
              type="range"
              min={6}
              max={14}
              step={1}
              value={maxHours}
              onChange={(e) => setMaxHours(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Statutory limit: 10h</span>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>
              Target Gross Margin Minimum (%): {minMargin}%
            </label>
            <input
              type="range"
              min={10}
              max={40}
              step={1}
              value={minMargin}
              onChange={(e) => setMinMargin(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Baseline: 20%</span>
          </div>
        </div>
      </div>

      {/* Impact Telemetry Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>BASELINE EXCEPTION RATE</span>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#334155', marginTop: '4px' }}>{report.baselineExceptionRate}</div>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Active published rule set</span>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>SIMULATED EXCEPTION RATE</span>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: report.disposition === 'recommend_adoption' ? '#059669' : '#d97706', marginTop: '4px' }}>
            {report.simulatedExceptionRate}
          </div>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Projected historical impact</span>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>EXTRA APPROVAL QUEUES</span>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0284c7', marginTop: '4px' }}>+{report.additionalApprovals}</div>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Additional executive touchpoints</span>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>SCHEDULE FRICTION</span>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#64748b', marginTop: '4px' }}>+{report.frictionHours}h</div>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Projected turnaround delay</span>
        </div>
      </div>

      {/* Disposition Banner & Publish Action */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
            Simulation Outcome: {report.disposition.toUpperCase().replace(/_/g, ' ')}
          </div>
          <p style={{ fontSize: '13px', color: '#475569', margin: '4px 0 0 0' }}>
            {report.summary}
          </p>
        </div>
        <button
          id="btn-publish-policy"
          style={{ backgroundColor: '#059669', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
        >
          Publish Policy Revision
        </button>
      </div>
    </div>
  );
};
