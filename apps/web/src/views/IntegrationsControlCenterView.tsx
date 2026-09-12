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
