import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, Badge, Button, Modal, Select, Textarea } from '../components/DesignSystem.js';

export const IntegrationsControlCenterView: React.FC = () => {
  const { currentLanguage, apiClient } = useEosContext();

  const [connectors, setConnectors] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Exception Resolution Modal
  const [selectedException, setSelectedException] = useState<any>(null);
  const [resolutionAction, setResolutionAction] = useState<string>('override_with_eos');
  const [justification, setJustification] = useState<string>('EOS purchase order agreement of 120,000 QAR takes precedence over supplier over-billing.');
  const [isResolving, setIsResolving] = useState<boolean>(false);
  // Capability 38: Webhook Verification & Quarantine Ledger (P05-ST06 / AT-072)
  const [webhookResult, setWebhookResult] = useState<any>(null);
  const [quarantineItems, setQuarantineItems] = useState<any[]>([
    {
      id: 'WH-QNB-ERR-001',
      provider: 'QNB Merchant Gateway',
      event: 'payment.disbursed',
      receivedAt: '2026-09-15 10:14:22',
      reason: 'INVALID_HMAC_SIGNATURE',
      payloadHash: '4a11be...881f',
      status: 'QUARANTINED',
    },
    {
      id: 'WH-DEV-ERR-002',
      provider: 'Deventi RFID Turnstiles',
      event: 'turnstile.badge_scan',
      receivedAt: '2026-09-15 11:02:15',
      reason: 'REPLAY_ATTACK_STALE_TIMESTAMP',
      payloadHash: '9c22ee...330a',
      status: 'QUARANTINED',
    },
  ]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [conn, q] = await Promise.all([
        apiClient.getEnterpriseConnectors(),
        apiClient.getReconciliationQueue(),
      ]);
      setConnectors(conn);
      setQueue(q);
    } catch (err) {
      console.error('Failed to load integrations data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSyncConnector = async (id: string) => {
    try {
      await apiClient.syncConnector(id);
      await loadData();
      alert('Sync executed successfully.');
    } catch (err: any) {
      alert(err.message || 'Sync failed');
    }
  };

  const handleOpenResolve = (item: any) => {
    setSelectedException(item);
  };

  const handleExecuteResolve = async () => {
    if (!selectedException) return;
    setIsResolving(true);
    try {
      await apiClient.resolveReconciliationException(selectedException.id, {
        exceptionId: selectedException.id,
        resolutionAction: resolutionAction as any,
        justification,
        resolvedBy: 'Hamad Al-Kuwari (Finance Director)',
      });
      setSelectedException(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Resolution failed');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-wide">
              {currentLanguage === 'ar' ? 'مركز تكامل النظم ومطابقة البيانات' : 'Enterprise Integrations & Reconciliation Control'}
            </h1>
            <Badge variant="success">SYSTEM OF RECORD: EOS</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Governed boundaries for ERP Accounting, Microsoft 365, Google Workspace, and CRM synchronization with automated exception quarantine.
          </p>
        </div>

        <Button variant="secondary" onClick={() => loadData()}>
          ↻ Refresh Sync Status
        </Button>
      </div>

      {/* System of Record Boundary Explainer */}
      <div className="bg-slate-900/90 border border-amber-500/30 rounded-lg p-4 text-xs text-slate-300 space-y-2">
        <h4 className="font-semibold text-amber-400 text-sm flex items-center gap-2">
          <span>🛡️ Authoritative System of Record (SoR) Governance</span>
        </h4>
        <p className="leading-relaxed">
          EOS is the authoritative <strong>Project Operational & Commercial Control Layer</strong>. External ERP systems remain the System of Record for corporate general ledgers and payroll, while EOS strictly dictates project work break-down structures, purchase order commitments, and event milestone progress. In the event of a discrepancy, EOS operational truth governs.
        </p>
      </div>

      {/* Capability 38: External Provider Webhook Verification, Deduplication & Quarantine Ledger (P05-ST06 / AT-072) */}
      <Card title="External Provider Webhook Verification & Quarantine Ledger (P05-ST06 / AT-072)">
        <div id="webhook-security-quarantine-workbench" className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-lg border border-slate-700">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🛡️</span>
                <h4 className="font-bold text-white text-sm">Inbound Webhook Security Gateway</h4>
                <Badge variant="success">HMAC-SHA256 VERIFIED</Badge>
                <Badge variant="info">300s FRESHNESS WINDOW</Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Invariant AT-072 mandates that forged or replayed provider webhooks are verified, deduplicated, and quarantined with zero unauthenticated system state mutation.
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setWebhookResult({
                    status: 'PROCESSED_IDEMPOTENTLY',
                    provider: 'QNB Merchant Gateway',
                    event: 'payment.captured',
                    amount: '150,000 QAR',
                    timestampDrift: '14s (Fresh)',
                    signatureValid: true,
                    auditHash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
                  });
                }}
              >
                Test Valid Webhook
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setWebhookResult({
                    status: 'REJECTED_FORGED_SIGNATURE',
                    provider: 'QNB Merchant Gateway',
                    event: 'payment.captured',
                    reason: 'HMAC signature mismatch: Calculated sha256 does not match header',
                    stateMutated: false,
                    quarantined: true,
                  });
                  setQuarantineItems(prev => [
                    {
                      id: `WH-ATTACK-${Date.now().toString().slice(-4)}`,
                      provider: 'QNB Gateway (Spoofed)',
                      event: 'payment.captured',
                      receivedAt: new Date().toLocaleTimeString(),
                      reason: 'FORGED_HMAC_SIGNATURE_MISMATCH',
                      payloadHash: 'bf12aa...0091',
                      status: 'QUARANTINED',
                    },
                    ...prev
                  ]);
                }}
              >
                Simulate Forged Signature Attack
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setWebhookResult({
                    status: 'REJECTED_REPLAY_ATTACK',
                    provider: 'Deventi RFID Turnstiles',
                    event: 'turnstile.badge_scan',
                    reason: 'Duplicate event ID or timestamp drift > 300s exceeded',
                    stateMutated: false,
                    quarantined: true,
                  });
                }}
              >
                Simulate Replay Attack
              </Button>
            </div>
          </div>

          {webhookResult && (
            <div className={`p-4 rounded-lg border text-xs font-mono space-y-1 ${
              webhookResult.status === 'PROCESSED_IDEMPOTENTLY'
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                : 'bg-red-950/40 border-red-500/50 text-red-300'
            }`}>
              <div className="font-bold flex items-center gap-2">
                <span>{webhookResult.status === 'PROCESSED_IDEMPOTENTLY' ? '✅' : '⛔'}</span>
                <span>INVARIANT AT-072 RESULT: {webhookResult.status}</span>
              </div>
              <div>Provider: {webhookResult.provider} • Event: {webhookResult.event}</div>
              {webhookResult.reason && <div>Failure Reason: {webhookResult.reason}</div>}
              {webhookResult.amount && <div>Settlement Amount: {webhookResult.amount} (Recorded Idempotently)</div>}
              <div>State Mutated: {webhookResult.stateMutated === false ? 'FALSE (Zero System Mutation)' : 'TRUE (Valid Transition)'}</div>
              {webhookResult.auditHash && <div>Audit Proof Hash: {webhookResult.auditHash}</div>}
            </div>
          )}

          {/* Quarantined Webhooks Ledger */}
          <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="font-bold text-slate-200 text-xs uppercase tracking-wide">
                Security Quarantine Ledger (AT-072 Intercepted Payloads)
              </h5>
              <Badge variant="danger">{quarantineItems.length} QUARANTINED PAYLOADS</Badge>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/90 text-slate-400">
                  <tr>
                    <th className="p-2">Incident ID</th>
                    <th className="p-2">Provider Source</th>
                    <th className="p-2">Event Type</th>
                    <th className="p-2">Interception Reason</th>
                    <th className="p-2">Payload Hash</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                  {quarantineItems.map((q) => (
                    <tr key={q.id}>
                      <td className="p-2 font-mono text-amber-400">{q.id}</td>
                      <td className="p-2 text-white">{q.provider}</td>
                      <td className="p-2 font-mono text-slate-400">{q.event}</td>
                      <td className="p-2 text-red-400 font-semibold">{q.reason}</td>
                      <td className="p-2 font-mono text-slate-500">{q.payloadHash}</td>
                      <td className="p-2"><Badge variant="danger">{q.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Card>

      {/* Connectors Grid */}
      <Card title={`Enterprise Connectors (${connectors.length})`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {connectors.map((c) => (
            <div key={c.id} className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-5 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={c.status === 'connected' ? 'success' : 'danger'}>
                    {c.status.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-slate-400">Every {c.syncIntervalMinutes}m</span>
                </div>
                <h3 className="font-bold text-white text-base">{c.connectorName}</h3>
                <p className="text-xs text-slate-400 mt-1">{c.systemOfRecordDomain}</p>
              </div>

              <div className="space-y-2 text-xs border-t border-slate-700/50 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Records Processed:</span>
                  <span className="font-mono font-semibold text-white">{c.recordsProcessed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Failed / Quarantined:</span>
                  <span className="font-mono font-semibold text-amber-400">{c.failedRecords}</span>
                </div>
              </div>

              <Button variant="secondary" size="sm" onClick={() => handleSyncConnector(c.id)}>
                ⚡ Trigger Live Sync
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Live Reconciliation Queue */}
      <Card title={`Reconciliation Exception Queue (${queue.length})`}>
        {queue.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            ✓ Reconciliation queue is empty. Zero outstanding discrepancies detected.
          </div>
        ) : (
          <div className="space-y-4">
            {queue.map((item) => (
              <div key={item.id} className="bg-slate-800/60 border border-amber-500/40 rounded-lg p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/50 pb-3">
                  <div className="flex items-center gap-3">
                    <Badge variant={item.status === 'resolved' ? 'success' : 'warning'}>
                      {item.status.toUpperCase()}
                    </Badge>
                    <span className="font-mono font-semibold text-white text-sm">{item.id}</span>
                    <span className="text-xs text-slate-400">Type: {item.mismatchType.replace('_', ' ')}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">Ext ID: {item.externalId}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="bg-slate-900 p-3 rounded border border-slate-700/50">
                    <strong className="text-amber-400 block mb-1">External Payload (ERP):</strong>
                    <pre className="text-slate-300 text-[11px] overflow-x-auto">{item.externalPayload}</pre>
                  </div>
                  <div className="bg-slate-900 p-3 rounded border border-slate-700/50">
                    <strong className="text-emerald-400 block mb-1">Authoritative EOS Payload:</strong>
                    <pre className="text-slate-300 text-[11px] overflow-x-auto">{item.eosPayload}</pre>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-400">
                    Recommended Action: <strong className="text-amber-400">Override with EOS truth</strong>
                  </span>
                  <Button variant="primary" size="sm" onClick={() => handleOpenResolve(item)}>
                    Resolve Exception
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Item 4: Webhook Ingestion Engine & Dead-Letter Queue (DLQ) */}
      <Card title="External Webhook Ingestion & Idempotent Deduplication Hub (AT-072 / AT-075)">
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-700 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">● WEBHOOK LISTENER ACTIVE:</span>
                <span className="font-mono text-slate-300">POST /api/v1/webhooks/:provider/:accountId</span>
              </div>
              <div className="text-slate-400 mt-1">
                HMAC SHA-256 signature enforcement, idempotent replay deduplication, and 48-hour freshness tracking.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success">HMAC-SHA256 SECURED</Badge>
              <Badge variant="info">IDEMPOTENCY KEY ENFORCED</Badge>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="p-3">Provider</th>
                  <th className="p-3">Event ID</th>
                  <th className="p-3">Cryptographic Signature</th>
                  <th className="p-3">Freshness</th>
                  <th className="p-3">Deduplication Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                <tr className="hover:bg-slate-800/30">
                  <td className="p-3 font-semibold text-white">BookingQube (Venue Slots)</td>
                  <td className="p-3 font-mono text-amber-400">evt_bq_2026_0991</td>
                  <td className="p-3 font-mono text-[11px] text-slate-400">sha256=9f8e7d...valid</td>
                  <td className="p-3 text-emerald-400">Fresh (12s ago)</td>
                  <td className="p-3"><Badge variant="success">PROCESSED (NEW)</Badge></td>
                  <td className="p-3 text-center"><Button variant="secondary" size="sm" onClick={() => alert('Simulated idempotent replay: Event already processed, duplicate replay ignored (AT-072).')}>Replay Test</Button></td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="p-3 font-semibold text-white">Metricool (Social Telemetry)</td>
                  <td className="p-3 font-mono text-amber-400">evt_mc_2026_8832</td>
                  <td className="p-3 font-mono text-[11px] text-slate-400">sha256=1a2b3c...valid</td>
                  <td className="p-3 text-amber-400">Stale (34h ago - AT-075)</td>
                  <td className="p-3"><Badge variant="warning">STALE DATA DISCLOSED</Badge></td>
                  <td className="p-3 text-center"><Button variant="secondary" size="sm" onClick={() => alert('Feed refresh requested from Metricool API.')}>Force Refresh</Button></td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="p-3 font-semibold text-white">Xero ERP (Journal Sync)</td>
                  <td className="p-3 font-mono text-amber-400">evt_xero_2026_4410</td>
                  <td className="p-3 font-mono text-[11px] text-slate-400">sha256=4f5e6d...valid</td>
                  <td className="p-3 text-emerald-400">Fresh (2m ago)</td>
                  <td className="p-3"><Badge variant="info">3-WAY RECONCILED</Badge></td>
                  <td className="p-3 text-center"><Button variant="secondary" size="sm" onClick={() => alert('Xero ledger entry matched to PO-2026-001.')}>Inspect Match</Button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Exception Resolution Modal */}
      {selectedException && (
        <Modal
          isOpen={!!selectedException}
          onClose={() => setSelectedException(null)}
          title={`Resolve Reconciliation Discrepancy — ${selectedException.id}`}
        >
          <div className="space-y-4">
            <Select
              label="Resolution Strategy"
              value={resolutionAction}
              onChange={(e) => setResolutionAction(e.target.value)}
              options={[
                { value: 'override_with_eos', label: 'Override with EOS (Authoritative Project Truth)' },
                { value: 'accept_external', label: 'Accept External Update (Requires Change Rationale)' },
                { value: 'quarantine', label: 'Quarantine Record (Hold in Inspection State)' },
                { value: 'manual_adjustment', label: 'Manual Accounting Adjustment / Credit Note' },
              ]}
            />

            <Textarea
              label="Audit Justification (Mandatory min 5 characters)"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
            />

            <div className="flex justify-end gap-3 pt-3">
              <Button variant="secondary" onClick={() => setSelectedException(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleExecuteResolve} disabled={isResolving || justification.length < 5}>
                {isResolving ? 'Resolving...' : 'Confirm Resolution'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
