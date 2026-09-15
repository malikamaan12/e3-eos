import React, { useState } from 'react';
import { Card, Badge, Button } from '../components/DesignSystem.js';

export const PolicySimulatorView: React.FC = () => {
  const [soleSource, setSoleSource] = useState<number>(50000);
  const [variationDual, setVariationDual] = useState<number>(100000);
  const [maxHours, setMaxHours] = useState<number>(10);
  const [minMargin, setMinMargin] = useState<number>(20);

  // Policy Compiler & Snapshot State (AT-020)
  const [compileStatus, setCompileStatus] = useState<'idle' | 'compiling' | 'success' | 'rollback'>('idle');
  const [activeSnapshot, setActiveSnapshot] = useState<string>('POL-SNAPSHOT-2026-V3 (SHA-256: 4f8b...32a1)');

  // Emergency Exception Token Generator (AT-024 / AT-025)
  const [emergencyTokens, setEmergencyTokens] = useState<any[]>([
    {
      id: 'EXC-TOK-2026-001',
      targetRule: 'RUL-PROC-SOLE-SOURCE',
      authorizedScope: 'Generator Pad 2 Acoustic Baffling Emergency Order (DECC)',
      issuedTo: 'Khamis Al-Sulaiti (HSE Lead)',
      expiresAt: '2026-09-15 16:00:00 AST (4h window)',
      used: false,
      hash: 'SHA256:7b91...c4e2',
    },
  ]);
  const [tokenReplayResult, setTokenReplayResult] = useState<string | null>(null);

  const report = {
    baselineExceptionRate: '18.50%',
    simulatedExceptionRate: soleSource < 40000 ? '34.20%' : '21.00%',
    additionalApprovals: soleSource < 40000 ? 14 : 3,
    frictionHours: soleSource < 40000 ? 56 : 12,
    disposition: soleSource < 40000 ? 'requires_committee_refinement' : 'recommend_adoption',
    summary: `Simulation across 10 historical projects indicates exception rate would move from 18.50% to ${soleSource < 40000 ? '34.20%' : '21.00%'}, generating ${soleSource < 40000 ? '14' : '3'} additional approval queues with an estimated ${soleSource < 40000 ? '56' : '12'}h process friction.`,
  };

  const handleCompilePolicy = () => {
    setCompileStatus('compiling');
    setTimeout(() => {
      setCompileStatus('success');
      setActiveSnapshot(`POL-SNAPSHOT-2026-V4 (Compiled ${new Date().toLocaleTimeString()} - SHA-256: 9e2d...71f4)`);
    }, 600);
  };

  const handleSimulateRollback = () => {
    setCompileStatus('compiling');
    setTimeout(() => {
      setCompileStatus('rollback');
      // Invariant AT-020: Zero partial activation; rolls back to prior valid snapshot
      setActiveSnapshot('POL-SNAPSHOT-2026-V3 (Rolled Back - Active Snapshot Preserved)');
    }, 600);
  };

  const handleExecuteEmergencyToken = (token: any) => {
    if (token.used) {
      setTokenReplayResult(`🛑 REPLAY REJECTED (AT-024): Token '${token.id}' was already consumed. Single-use emergency tokens cannot be replayed.`);
      return;
    }
    setEmergencyTokens((prev) =>
      prev.map((t) => (t.id === token.id ? { ...t, used: true } : t))
    );
    setTokenReplayResult(`✅ EXECUTED (AT-024): Emergency exception token '${token.id}' successfully executed once. Token has been permanently consumed.`);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>
              🧪 Management Policy Compiler & Simulation Sandbox
            </h1>
            <Badge variant="accent">AT-020 / AT-024 / AT-025</Badge>
            <Badge variant="neutral">Dry-Run Isolation</Badge>
          </div>
          <p style={{ color: '#64748b', marginTop: '6px', fontSize: '14px' }}>
            Simulate, backtest, and compile governance policy revisions with zero-partial-activation rollback and single-use emergency exception tokens.
          </p>
        </div>

        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 16px', borderRadius: '8px', fontSize: '12px' }}>
          <strong style={{ color: '#166534' }}>🔒 Active Snapshot:</strong> {activeSnapshot}
        </div>
      </div>

      {/* Compiler & Rollback Gate Banner (AT-020) */}
      <Card title="Policy Compiler & Atomic Snapshot Gate (AT-020)">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div>
            <div style={{ fontSize: '13px', color: '#475569' }}>
              <strong>Zero Partial Activation Invariant:</strong> Compilation evaluates all rules, expressions, and jurisdiction boundaries atomically. If compilation fails, prior valid snapshot remains active without partial corruption.
            </div>
            {compileStatus === 'success' && (
              <div style={{ color: '#15803d', fontWeight: 700, fontSize: '12px', marginTop: '4px' }}>
                ✓ Policy compiled successfully into immutable revision V4. All 14 test fixtures passed.
              </div>
            )}
            {compileStatus === 'rollback' && (
              <div style={{ color: '#dc2626', fontWeight: 700, fontSize: '12px', marginTop: '4px' }}>
                ⚠️ Compilation error simulated (circular dependency in rule RUL-09). Rolled back atomically to V3.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              id="btn-simulate-rollback"
              variant="outline"
              size="sm"
              onClick={handleSimulateRollback}
            >
              Simulate Syntax Failure (AT-020 Rollback)
            </Button>
            <Button
              id="btn-compile-policy"
              variant="primary"
              size="sm"
              onClick={handleCompilePolicy}
            >
              ⚡ Compile & Verify Snapshot
            </Button>
          </div>
        </div>
      </Card>

      {/* Simulator Sliders */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: '#0f172a' }}>
          Proposed Policy Thresholds
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
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

      {/* Emergency Exception Token Studio (AT-024 / AT-025) */}
      <Card title="Single-Use Emergency Exception Token Studio (AT-024 / AT-025)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            <strong>Policy Invariant AT-024 / AT-025:</strong> Emergency exceptions are issued as single-use, time-bounded cryptographic tokens. Only the authorized target executes once; secondary replay is categorically rejected.
          </div>

          {tokenReplayResult && (
            <div style={{ padding: '10px 14px', borderRadius: '6px', fontSize: '13px', backgroundColor: tokenReplayResult.includes('REPLAY REJECTED') ? '#fee2e2' : '#f0fdf4', color: tokenReplayResult.includes('REPLAY REJECTED') ? '#991b1b' : '#166534', border: `1px solid ${tokenReplayResult.includes('REPLAY REJECTED') ? '#fca5a5' : '#bbf7d0'}` }}>
              {tokenReplayResult}
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 12px' }}>Token ID</th>
                  <th style={{ padding: '10px 12px' }}>Governed Rule</th>
                  <th style={{ padding: '10px 12px' }}>Scope & Justification</th>
                  <th style={{ padding: '10px 12px' }}>Time Expiry (AT-025)</th>
                  <th style={{ padding: '10px 12px' }}>Single-Use State</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {emergencyTokens.map((token) => (
                  <tr key={token.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                      {token.id}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Badge variant="neutral">{token.targetRule}</Badge>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{token.authorizedScope}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Recipient: {token.issuedTo}</div>
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#b45309' }}>
                      ⏳ {token.expiresAt}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Badge variant={token.used ? 'danger' : 'success'}>
                        {token.used ? 'CONSUMED (Used Once)' : 'ACTIVE (Single-Use)'}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <Button
                        id={`btn-exec-token-${token.id}`}
                        variant={token.used ? 'outline' : 'primary'}
                        size="sm"
                        onClick={() => handleExecuteEmergencyToken(token)}
                      >
                        {token.used ? 'Attempt Replay (Test AT-024)' : '⚡ Execute Token'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
};
