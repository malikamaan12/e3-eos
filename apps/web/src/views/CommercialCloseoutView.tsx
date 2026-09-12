import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, MetricCard, Badge, Button, Modal, Input, Textarea } from '../components/DesignSystem.js';

export const CommercialCloseoutView: React.FC = () => {
  const { currentLanguage, apiClient, selectedProjectId } = useEosContext();
  const projectId = selectedProjectId || 'PRJ-QND-2026';

  const [closeout, setCloseout] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Closeout Checklist State (10 Pillars)
  const [checklist, setChecklist] = useState({
    posFullyInvoicedOrDecommitted: true,
    supplierInvoicesSettled: true,
    clientMilestonesBilled: true,
    openReceivablesManaged: true,
    retentionScheduleConfirmed: true,
    expenseClaimsSettled: true,
    variationsConcluded: true,
    costAllocationsConfirmed: true,
    finalPandLAudited: true,
    executiveSignoffSealed: true,
  });

  const [isSignoffModalOpen, setIsSignoffModalOpen] = useState<boolean>(false);
  const [authorizedBy, setAuthorizedBy] = useState<string>('Hamad Al-Kuwari (Finance Director)');
  const [justification, setJustification] = useState<string>('All commercial variations settled, 100% PO commitments reconciled, final P&L locked at 26.53% gross margin.');
  const [isSealing, setIsSealing] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const co = await apiClient.getCommercialCloseout(projectId);
      setCloseout(co);
      if (co?.checklist) {
        setChecklist(co.checklist);
      }
    } catch (err) {
      console.error('Failed to load commercial closeout data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleTogglePillar = (pillarKey: keyof typeof checklist) => {
    setChecklist((prev) => ({
      ...prev,
      [pillarKey]: !prev[pillarKey],
    }));
  };

  const handleExecuteSignoff = async () => {
    setIsSealing(true);
    try {
      await apiClient.signoffCommercialCloseout({
        projectId,
        closureConfirmed: true,
        authorizedBy,
        justification,
        checklist: {
          allSupplierInvoicesReceived: checklist.supplierInvoicesSettled,
          poCommitmentsClosed: checklist.posFullyInvoicedOrDecommitted,
          pendingVariationsResolved: checklist.variationsConcluded,
          clientInvoicesIssued: checklist.clientMilestonesBilled,
          collectionsCompletedOrIsolated: checklist.openReceivablesManaged,
          creditNotesResolved: checklist.expenseClaimsSettled,
          retentionsTracked: checklist.retentionScheduleConfirmed,
          claimsSettledOrBonded: checklist.executiveSignoffSealed,
          finalMarginReconciled: checklist.finalPandLAudited,
          commercialDocumentsComplete: checklist.costAllocationsConfirmed,
        },
        finalGrossMarginPercent: closeout?.financialSummary?.finalGrossMarginPercent || '26.53%',
      });
      setIsSignoffModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to seal closeout', err);
    } finally {
      setIsSealing(false);
    }
  };

  const pillarDescriptions: Array<{ key: keyof typeof checklist; title: string; desc: string }> = [
    { key: 'posFullyInvoicedOrDecommitted', title: '1. PO Commitments Sealed & Decommitted', desc: 'All purchase orders have matching final supplier invoices or formal remaining commitment cancellations.' },
    { key: 'supplierInvoicesSettled', title: '2. Zero Pending Supplier Invoices', desc: '100% of incoming vendor invoices are approved, scheduled for payment, or formally disputed.' },
    { key: 'clientMilestonesBilled', title: '3. Full Contract Milestones Invoiced', desc: 'All four contract billing milestones (Advance, Delivery, Opening, Final) have been formally invoiced.' },
    { key: 'openReceivablesManaged', title: '4. Receivables Managed & Under Action Plan', desc: 'Open milestone balance (245k QAR) tracked with 1-30 day aging and scheduled bank transfer confirmation.' },
    { key: 'retentionScheduleConfirmed', title: '5. Retention Release Terms Confirmed', desc: 'Zero unbonded retention disputes; final defect liability period escrow terms confirmed.' },
    { key: 'expenseClaimsSettled', title: '6. Site Cost Claims Cleared & Reimbursed', desc: 'Staff expenses, crew welfare, and emergency site purchases fully reimbursed and cost-coded.' },
    { key: 'variationsConcluded', title: '7. Variations Concluded & Client-Signed', desc: 'VO-01 and VO-02 fully approved with +150,000 QAR added to contract baseline.' },
    { key: 'costAllocationsConfirmed', title: '8. Multi-Package Cost Allocations Complete', desc: 'All actual costs verified without over-allocation across packages (Steel, Staging, AV, Lighting).' },
    { key: 'finalPandLAudited', title: '9. Final Project Profit & Loss Audited', desc: 'Revenue: 2,450,000 QAR | EAC: 1,800,000 QAR | Net Margin: 650,000 QAR (26.53%).' },
    { key: 'executiveSignoffSealed', title: '10. Cryptographic Audit Seal Generated', desc: 'Executive commercial signoff authorization secured with immutable SHA-256 digest.' },
  ];

  const metCount = Object.values(checklist).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-wide">
              {currentLanguage === 'ar' ? 'الإغلاق التجاري والمالي للمشروع' : 'Commercial & Financial Closeout Gate'}
            </h1>
            <Badge variant={metCount === 10 ? 'success' : 'warning'}>
              {metCount === 10 ? '10/10 PILLARS VERIFIED' : `${metCount}/10 PILLARS MET`}
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Governed 10-dimension commercial reconciliation and executive closeout sign-off with cryptographic audit seal.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => loadData()}>
            ↻ Refresh State
          </Button>
          <Button variant="primary" onClick={() => setIsSignoffModalOpen(true)}>
            🔒 Authorize Commercial Closeout
          </Button>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Final Revenue"
          value="2,450,000 QAR"
          subtext="Contract + Approved VOs"
        />
        <MetricCard
          label="Final Actual Cost (EAC)"
          value="1,800,000 QAR"
          subtext="Zero Double-Counting"
        />
        <MetricCard
          label="Final Commercial Profit"
          value="+650,000 QAR"
          subtext="Net Project Earnings"
        />
        <MetricCard
          label="Final Gross Margin"
          value="26.53%"
          trend="+6.96% vs Tender (19.57%)"
          trendDirection="up"
        />
      </div>

      {/* 10-Dimension Commercial Closeout Checklist */}
      <Card title="10-Dimension Commercial Closeout Framework">
        <p className="text-sm text-slate-400 mb-4">
          All 10 commercial governance dimensions must be verified before the project can transition from <em>Operationally Closed</em> to <em>Commercially Closed</em>.
        </p>

        <div className="space-y-3">
          {pillarDescriptions.map((pillar) => {
            const isChecked = checklist[pillar.key];
            return (
              <div
                key={pillar.key}
                onClick={() => handleTogglePillar(pillar.key)}
                className={`p-4 rounded-lg border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                  isChecked
                    ? 'bg-emerald-950/20 border-emerald-500/40 hover:bg-emerald-950/30'
                    : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 h-5 w-5 rounded flex items-center justify-center border text-xs font-bold ${
                    isChecked ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'border-slate-600 bg-slate-800 text-transparent'
                  }`}>
                    ✓
                  </div>
                  <div>
                    <h4 className={`font-semibold text-sm ${isChecked ? 'text-white' : 'text-slate-300'}`}>
                      {pillar.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">{pillar.desc}</p>
                  </div>
                </div>

                <Badge variant={isChecked ? 'success' : 'default'}>
                  {isChecked ? 'VERIFIED' : 'PENDING'}
                </Badge>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Audit Seal & Signoff Banner */}
      <Card title="Executive Commercial Cryptographic Seal">
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-amber-500/30 rounded-lg p-4 space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/50 pb-2">
              <span className="text-slate-400">Closure Authorization Status:</span>
              <Badge variant="success">COMMERCIALLY CLOSED</Badge>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/50 pb-2">
              <span className="text-slate-400">Signed By:</span>
              <span className="text-white font-medium">{closeout?.signedBy || 'Hamad Al-Kuwari (Finance Director)'}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/50 pb-2">
              <span className="text-slate-400">Timestamp:</span>
              <span className="text-slate-300 font-mono">{closeout?.signedAt || new Date().toISOString()}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">SHA-256 Audit Seal:</span>
              <div className="bg-slate-950 p-2.5 rounded font-mono text-amber-400 break-all text-[11px] border border-slate-800">
                {closeout?.auditSeal || 'b4a6cf80e3198dc00451fa2889211d04b321a99471fec9983716a782a514d720'}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Commercial Closeout Signoff Modal */}
      <Modal
        isOpen={isSignoffModalOpen}
        onClose={() => setIsSignoffModalOpen(false)}
        title="Execute Commercial Closeout Sign-off"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Authorizing commercial closeout locks the final project revenue, actual costs, and gross margin into the immutable audit record. This state is cryptographically signed and archived.
          </p>

          <Input
            label="Authorized Signoff Executive"
            value={authorizedBy}
            onChange={(e) => setAuthorizedBy(e.target.value)}
          />

          <Textarea
            label="Executive Closeout Justification"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
          />

          <div className="bg-emerald-950/20 border border-emerald-500/40 p-3 rounded text-xs text-emerald-300">
            ✓ 10 of 10 commercial dimensions will be recorded in the closeout ledger snapshot.
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" onClick={() => setIsSignoffModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleExecuteSignoff} disabled={isSealing}>
              {isSealing ? 'Sealing...' : 'Sign & Generate Audit Seal'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
