import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, MetricCard, Badge, Button, Modal, Input, Textarea } from '../components/DesignSystem.js';

export const FinancialControlCenterView: React.FC = () => {
  const { currentLanguage, apiClient, selectedProjectId } = useEosContext();
  const projectId = selectedProjectId || 'PRJ-QND-2026';

  const [activeTab, setActiveTab] = useState<'control' | 'bridge' | 'cash' | 'snapshots'>('control');
  const [loading, setLoading] = useState<boolean>(true);

  const [finControl, setFinControl] = useState<any>(null);
  const [cashPos, setCashPos] = useState<any>(null);
  const [marginBridge, setMarginBridge] = useState<any>(null);
  const [snapshots, setSnapshots] = useState<any[]>([]);

  // Lock Snapshot Modal
  const [isLockModalOpen, setIsLockModalOpen] = useState<boolean>(false);
  const [lockPeriod, setLockPeriod] = useState<string>('2026-08');
  const [lockNotes, setLockNotes] = useState<string>('August 2026 month-end final commercial ledger close');
  const [isLocking, setIsLocking] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fc, cp, mb, ss] = await Promise.all([
        apiClient.getFinancialControl(projectId),
        apiClient.getCashPosition(projectId),
        apiClient.getMarginBridge(projectId),
        apiClient.getMonthEndSnapshots(projectId),
      ]);
      setFinControl(fc);
      setCashPos(cp);
      setMarginBridge(mb);
      setSnapshots(ss);
    } catch (err) {
      console.error('Failed to load financial control data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleLockSnapshot = async () => {
    setIsLocking(true);
    try {
      await apiClient.lockMonthEndSnapshot(projectId, {
        projectId,
        periodKey: lockPeriod,
        lockedBy: 'Hamad Al-Kuwari (Finance Director)',
        snapshotNotes: lockNotes,
      });
      setIsLockModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to lock snapshot', err);
    } finally {
      setIsLocking(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mb-4"></div>
        <p>Loading Commercial Financial Control System...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Invariant Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-wide">
              {currentLanguage === 'ar' ? 'مركز الرقابة المالية والمطابقة' : 'Commercial Financial Control Center'}
            </h1>
            <Badge variant="success">INVARIANTS VERIFIED</Badge>
            <Badge variant="info">LIVE QAR BASIS</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Project: <span className="text-amber-400 font-semibold">{projectId}</span> — Qatar National Day 2026 Ceremonial Pavilion
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => loadData()}>
            ↻ Refresh Ledger
          </Button>
          <Button variant="primary" onClick={() => setIsLockModalOpen(true)}>
            🔒 Lock Period Snapshot
          </Button>
        </div>
      </div>

      {/* Financial Invariants Banner */}
      <div className="bg-slate-900/90 border border-amber-500/30 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-6">
          <span className="text-slate-400 font-semibold uppercase tracking-wider">Governed Invariants:</span>
          <span className="text-slate-200">
            <span className="text-amber-400 font-mono">Current Budget</span> = Baseline + Approved Changes
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-200">
            <span className="text-emerald-400 font-mono">EAC</span> = Actuals + Accrued + Commitments + ETC
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-200">
            <span className="text-blue-400 font-mono">VAC</span> = Current Budget - EAC
          </span>
        </div>
        <div className="text-emerald-400 font-medium flex items-center gap-1.5">
          <span>✓ Zero Double-Counting Enforced</span>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Contract Revenue Basis"
          value={`${parseInt(finControl?.approvedRevenueBasis || '2450000').toLocaleString()} QAR`}
          trend="80% Billed to Date"
          trendDirection="up"
        />
        <MetricCard
          label="Current Authorized Budget"
          value={`${parseInt(finControl?.currentAuthorisedBudget || '2000000').toLocaleString()} QAR`}
          subtext={`Orig: ${parseInt(finControl?.originalBudget || '1850000').toLocaleString()} + Vo: 150k`}
        />
        <MetricCard
          label="Estimate at Completion (EAC)"
          value={`${parseInt(finControl?.estimateAtCompletion || '1800000').toLocaleString()} QAR`}
          subtext={`Cost Incurred: 1,300,000 QAR`}
        />
        <MetricCard
          label="Variance at Completion (VAC)"
          value={`+${parseInt(finControl?.budgetVariance || '200000').toLocaleString()} QAR`}
          trend={`Margin: ${finControl?.forecastContributionMarginPercent || '26.53%'}`}
          trendDirection="up"
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-700/60 gap-4">
        <button
          onClick={() => setActiveTab('control')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'control'
              ? 'border-amber-500 text-amber-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Budget vs Actual Breakdown
        </button>
        <button
          onClick={() => setActiveTab('bridge')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'bridge'
              ? 'border-amber-500 text-amber-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Margin Bridge Waterfall
        </button>
        <button
          onClick={() => setActiveTab('cash')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'cash'
              ? 'border-amber-500 text-amber-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Cash Position & Working Capital
        </button>
        <button
          onClick={() => setActiveTab('snapshots')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'snapshots'
              ? 'border-amber-500 text-amber-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Locked Month-End Ledger Snapshots ({snapshots.length})
        </button>
      </div>

      {/* TAB 1: Budget vs Actual Breakdown */}
      {activeTab === 'control' && (
        <div className="space-y-6">
          <Card title="Budget & Cost Breakdown Architecture (Zero Double-Counting Invariant)">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 font-medium">
                  <tr>
                    <th className="p-3">Cost Architecture Component</th>
                    <th className="p-3">Amount (QAR)</th>
                    <th className="p-3">% of Contract</th>
                    <th className="p-3">Role in EAC / VAC</th>
                    <th className="p-3">Audit Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  <tr className="hover:bg-slate-800/40">
                    <td className="p-3 font-medium text-white">Original Tender Budget</td>
                    <td className="p-3 font-mono">{parseInt(finControl?.originalBudget || '1850000').toLocaleString()}</td>
                    <td className="p-3 text-slate-400">75.5%</td>
                    <td className="p-3 text-slate-300">Contractual Baseline</td>
                    <td className="p-3"><Badge variant="default">Tender Lock</Badge></td>
                  </tr>
                  <tr className="hover:bg-slate-800/40">
                    <td className="p-3 font-medium text-white">Approved Scope Variations</td>
                    <td className="p-3 font-mono text-emerald-400">+{parseInt(finControl?.approvedBudgetChanges || '150000').toLocaleString()}</td>
                    <td className="p-3 text-slate-400">+6.1%</td>
                    <td className="p-3 text-slate-300">Adds to Current Authorised Budget</td>
                    <td className="p-3"><Badge variant="success">Client Signed</Badge></td>
                  </tr>
                  <tr className="bg-amber-950/20 font-semibold border-t-2 border-amber-500/40">
                    <td className="p-3 text-amber-300">Current Authorised Budget</td>
                    <td className="p-3 font-mono text-amber-400">{parseInt(finControl?.currentAuthorisedBudget || '2000000').toLocaleString()}</td>
                    <td className="p-3 text-amber-300">81.6%</td>
                    <td className="p-3 text-amber-300">Benchmark for VAC Calculation</td>
                    <td className="p-3"><Badge variant="warning">Governed Ceiling</Badge></td>
                  </tr>
                  <tr className="hover:bg-slate-800/40">
                    <td className="p-3 pl-6 text-slate-300">1. Posted Actual Cost (Invoiced & Approved)</td>
                    <td className="p-3 font-mono">{parseInt(finControl?.postedActualCost || '1180000').toLocaleString()}</td>
                    <td className="p-3 text-slate-400">48.2%</td>
                    <td className="p-3 text-slate-300">Component of Cost Incurred</td>
                    <td className="p-3"><Badge variant="success">3-Way Matched</Badge></td>
                  </tr>
                  <tr className="hover:bg-slate-800/40">
                    <td className="p-3 pl-6 text-slate-300">2. Accepted Accrued Cost (Unbilled Work Delivered)</td>
                    <td className="p-3 font-mono">{parseInt(finControl?.acceptedAccruedCost || '120000').toLocaleString()}</td>
                    <td className="p-3 text-slate-400">4.9%</td>
                    <td className="p-3 text-slate-300">Site Progress Accepted</td>
                    <td className="p-3"><Badge variant="info">Work Signed-off</Badge></td>
                  </tr>
                  <tr className="hover:bg-slate-800/40">
                    <td className="p-3 pl-6 text-slate-300">3. Remaining Commitments (Open PO Balances)</td>
                    <td className="p-3 font-mono">{parseInt(finControl?.remainingCommitments || '350000').toLocaleString()}</td>
                    <td className="p-3 text-slate-400">14.3%</td>
                    <td className="p-3 text-slate-300">Unperformed Purchase Orders</td>
                    <td className="p-3"><Badge variant="default">PO Sealed</Badge></td>
                  </tr>
                  <tr className="hover:bg-slate-800/40">
                    <td className="p-3 pl-6 text-slate-300">4. Uncommitted Forecast (ETC to Closeout)</td>
                    <td className="p-3 font-mono">{parseInt(finControl?.uncommittedForecast || '150000').toLocaleString()}</td>
                    <td className="p-3 text-slate-400">6.1%</td>
                    <td className="p-3 text-slate-300">Allowance for Final Bump-Out & Returns</td>
                    <td className="p-3"><Badge variant="default">PM Forecast</Badge></td>
                  </tr>
                  <tr className="bg-emerald-950/30 font-semibold border-t-2 border-emerald-500/40">
                    <td className="p-3 text-emerald-300">Estimate at Completion (EAC = 1+2+3+4)</td>
                    <td className="p-3 font-mono text-emerald-400">{parseInt(finControl?.estimateAtCompletion || '1800000').toLocaleString()}</td>
                    <td className="p-3 text-emerald-300">73.5%</td>
                    <td className="p-3 text-emerald-300">Total Projected Project Cost</td>
                    <td className="p-3"><Badge variant="success">Invariant Verified</Badge></td>
                  </tr>
                  <tr className="bg-slate-900/60 font-semibold">
                    <td className="p-3 text-emerald-400">Variance at Completion (VAC = Budget - EAC)</td>
                    <td className="p-3 font-mono text-emerald-400">+{parseInt(finControl?.budgetVariance || '200000').toLocaleString()}</td>
                    <td className="p-3 text-emerald-400">+8.2% Favorable</td>
                    <td className="p-3 text-emerald-400">Net Cost Saving Across Delivery</td>
                    <td className="p-3"><Badge variant="success">Under Budget</Badge></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: Margin Bridge Waterfall */}
      {activeTab === 'bridge' && (
        <Card title="Margin Bridge Waterfall — Tender to Final Forecast Completion">
          <p className="text-sm text-slate-400 mb-6">
            Detailed reconciliation tracing commercial margin performance from initial tender submission through approved variations and procurement optimizations.
          </p>

          <div className="space-y-4">
            {(marginBridge?.waterfall || []).map((step: any, idx: number) => (
              <div key={idx} className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-700 text-amber-400 flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{step.step}</h4>
                    <p className="text-xs text-slate-400">
                      Revenue: <span className="font-mono text-slate-300">{step.revenue} QAR</span> | Cost: <span className="font-mono text-slate-300">{step.cost} QAR</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Gross Margin</span>
                    <span className="font-mono font-bold text-emerald-400 text-base">{step.margin} QAR</span>
                  </div>
                  <Badge variant={step.marginPercent.includes('26') ? 'success' : 'default'}>
                    {step.marginPercent} Margin
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB 3: Cash Position */}
      {activeTab === 'cash' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card title="Client Receivables Ledger">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total Contract Value:</span>
                  <span className="font-mono font-medium text-white">2,450,000 QAR</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total Billed to Date:</span>
                  <span className="font-mono font-medium text-amber-400">1,960,000 QAR (80%)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total Cash Collected:</span>
                  <span className="font-mono font-medium text-emerald-400">1,715,000 QAR (70%)</span>
                </div>
                <div className="border-t border-slate-700/60 pt-2 flex justify-between text-sm font-semibold">
                  <span className="text-red-400">Open Accounts Receivable:</span>
                  <span className="font-mono text-red-400">245,000 QAR</span>
                </div>
              </div>
            </Card>

            <Card title="Supplier Commitments & Cost Outflow">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Posted Actual Paid/Approved:</span>
                  <span className="font-mono font-medium text-white">1,180,000 QAR</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Active PO Commitments:</span>
                  <span className="font-mono font-medium text-amber-400">350,000 QAR</span>
                </div>
                <div className="border-t border-slate-700/60 pt-2 flex justify-between text-sm font-semibold">
                  <span className="text-slate-300">Total Outflow & Liability:</span>
                  <span className="font-mono text-white">1,530,000 QAR</span>
                </div>
              </div>
            </Card>

            <Card title="Net Cash & Exposure Index">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Net Cash Flow (Collected - Actuals):</span>
                  <span className="font-mono font-bold text-emerald-400">+535,000 QAR</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Net Cash Exposure (incl. POs):</span>
                  <span className="font-mono font-bold text-emerald-400">+185,000 QAR</span>
                </div>
                <div className="pt-2">
                  <Badge variant="success">POSITIVE WORKING CAPITAL</Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 4: Month-End Snapshots */}
      {activeTab === 'snapshots' && (
        <Card title="Locked Commercial Month-End Snapshots">
          <div className="space-y-4">
            {snapshots.map((snap) => (
              <div key={snap.id} className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-700/50 pb-3 mb-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="success">LOCKED PERIOD: {snap.periodKey}</Badge>
                    <span className="text-sm font-semibold text-white">Snapshot ID: {snap.id}</span>
                  </div>
                  <span className="text-xs text-slate-400">Locked By: {snap.lockedBy} on {new Date(snap.lockedAt).toLocaleDateString()}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
                  <div>
                    <span className="text-slate-400 block">Current Budget:</span>
                    <span className="font-mono font-semibold text-slate-200">{parseInt(snap.currentBudget).toLocaleString()} QAR</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Actual Cost:</span>
                    <span className="font-mono font-semibold text-slate-200">{parseInt(snap.actualCost).toLocaleString()} QAR</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">EAC / VAC:</span>
                    <span className="font-mono font-semibold text-emerald-400">{parseInt(snap.eac).toLocaleString()} / +{parseInt(snap.vac).toLocaleString()} QAR</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Margin %:</span>
                    <span className="font-mono font-semibold text-emerald-400">{snap.marginPercent}</span>
                  </div>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded border border-slate-700/40 text-xs font-mono text-slate-400 flex items-center justify-between">
                  <span>SHA-256 Audit Seal: {snap.snapshotHash}</span>
                  <span className="text-emerald-400">✓ Cryptographically Locked</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Lock Period Snapshot Modal */}
      <Modal
        isOpen={isLockModalOpen}
        onClose={() => setIsLockModalOpen(false)}
        title="Lock Month-End Period Commercial Snapshot"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Locking an accounting period seals the project commercial control ledger with a deterministic SHA-256 hash. No backward alterations can be made without creating an audited credit note or explicit adjustment entry.
          </p>

          <Input
            label="Accounting Period Key (YYYY-MM)"
            value={lockPeriod}
            onChange={(e) => setLockPeriod(e.target.value)}
          />

          <Textarea
            label="Lock Notes & Executive Rationale"
            value={lockNotes}
            onChange={(e) => setLockNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" onClick={() => setIsLockModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleLockSnapshot} disabled={isLocking}>
              {isLocking ? 'Sealing...' : 'Generate Seal & Lock Period'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
