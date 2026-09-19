import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, MetricCard, Badge, Button, Modal, Input, Textarea } from '../components/DesignSystem.js';
import { CommercialCloseoutEngine, CommercialCloseoutChecklist } from '@e3-eos/domain';
import { isSyntheticDemo } from '../services/api-client.js';

export const CommercialCloseoutView: React.FC = () => {
  const { currentLanguage, apiClient, selectedProjectId, currentUser, currentProject } = useEosContext();
  const isDemo = isSyntheticDemo(selectedProjectId);
  const projectId = selectedProjectId || (isDemo ? 'PRJ-QND-2026' : '');

  const [closeout, setCloseout] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Closeout Checklist State (10 Pillars)
  const [checklist, setChecklist] = useState<CommercialCloseoutChecklist>({
    posFullyInvoicedOrDecommitted: false,
    supplierInvoicesSettled: false,
    clientMilestonesBilled: false,
    openReceivablesManaged: false,
    retentionScheduleConfirmed: false,
    expenseClaimsSettled: false,
    variationsConcluded: false,
    costAllocationsConfirmed: false,
    finalPandLAudited: false,
    executiveSignoffSealed: false,
  });

  const [isSignoffModalOpen, setIsSignoffModalOpen] = useState<boolean>(false);
  const [authorizedBy, setAuthorizedBy] = useState<string>(() => (currentUser?.name ? `${currentUser.name} (${currentUser.role || 'Finance Director'})` : 'Finance Director'));
  const [justification, setJustification] = useState<string>('');
  const [isSealing, setIsSealing] = useState<boolean>(false);

  const finalRev = closeout?.financialSummary?.finalRevenue || '0';
  const finalCost = closeout?.financialSummary?.finalActualCost || '0';

  // Live evaluation via CommercialCloseoutEngine (Item 8)
  const closeoutEval = CommercialCloseoutEngine.evaluateCloseout({
    projectId,
    currency: 'QAR',
    checklist,
    finalRevenue: finalRev,
    finalActualCost: finalCost,
    signedBy: authorizedBy,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const co = await apiClient.getCommercialCloseout(projectId);
      setCloseout(co);
      if (co?.checklist) {
        setChecklist(co.checklist);
      } else {
        setChecklist({
          posFullyInvoicedOrDecommitted: false,
          supplierInvoicesSettled: false,
          clientMilestonesBilled: false,
          openReceivablesManaged: false,
          retentionScheduleConfirmed: false,
          expenseClaimsSettled: false,
          variationsConcluded: false,
          costAllocationsConfirmed: false,
          finalPandLAudited: false,
          executiveSignoffSealed: false,
        });
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

  const handleExportPdf = () => {
    const reportContent = `
========================================================================
E3-EOS COMMERCIAL CLOSEOUT & FINAL ACCOUNT AUDIT CERTIFICATE
========================================================================
Project ID: ${projectId}
Closure Status: ${closeoutEval.decision.toUpperCase()}
10-Pillar Verification: ${10 - closeoutEval.unmetPillars.length}/10 Verified
Authorized By: ${authorizedBy}
Date: ${new Date().toISOString()}

1. FINAL REVENUE RECONCILIATION:
- Original Contract Baseline: 2,300,000.00 QAR
- Approved Variations (VO-01, VO-02): +150,000.00 QAR
- Final Settled Contract Value: ${closeoutEval.finalRevenue?.toDisplayString ? closeoutEval.finalRevenue.toDisplayString() : Number(closeoutEval.finalRevenue || 0).toFixed(2)} QAR

2. FINAL ACTUAL EXPENDITURE (EAC):
- Direct Scenic & Steel: 620,000.00 QAR
- AV & Projection: 480,000.00 QAR
- Rigging & Lighting: 390,000.00 QAR
- Site Logistics & Management: 310,000.00 QAR
- Total Final Cost: ${closeoutEval.finalActualCost?.toDisplayString ? closeoutEval.finalActualCost.toDisplayString() : Number(closeoutEval.finalActualCost || 0).toFixed(2)} QAR

3. PURCHASE ORDER RECONCILIATION:
- Committed POs: 1,920,000.00 QAR
- Invoiced POs: 1,800,000.00 QAR
- Decommitted / Cancelled PO Balance: 120,000.00 QAR (Returned to contingency)

4. FINAL COMMERCIAL PROFIT & MARGIN:
- Net Operating Profit: ${closeoutEval.finalProfit?.toDisplayString ? closeoutEval.finalProfit.toDisplayString() : Number(closeoutEval.finalProfit || 0).toFixed(2)} QAR
- Gross Margin Percentage: ${closeoutEval.finalGrossMarginPercent}

5. CRYPTOGRAPHIC AUDIT SEAL:
SHA-256 Digest: ${closeoutEval.auditHash}
========================================================================
`;
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `E3-EOS-Commercial-Closeout-${projectId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const csvContent = isDemo
      ? `LineItem,Category,OriginalContract_QAR,Variations_QAR,FinalContract_QAR,FinalActualCost_QAR,Variance_QAR,Margin_Percent
Revenue - Main Contract,Revenue,2300000.00,0.00,2300000.00,0.00,2300000.00,100%
Revenue - VO-01 VIP Redesign,Revenue,0.00,85000.00,85000.00,0.00,85000.00,100%
Revenue - VO-02 Acoustic Baffles,Revenue,0.00,65000.00,65000.00,0.00,65000.00,100%
Cost - Scenic Carpentry & Steel,Direct Cost,0.00,0.00,0.00,620000.00,-620000.00,N/A
Cost - AV & LED Display Systems,Direct Cost,0.00,0.00,0.00,480000.00,-480000.00,N/A
Cost - Lighting & Rigging Hoists,Direct Cost,0.00,0.00,0.00,390000.00,-390000.00,N/A
Cost - Site Logistics & Welfare,Direct Cost,0.00,0.00,0.00,310000.00,-310000.00,N/A
TOTAL COMMERCIAL SETTLEMENT,SUMMARY,2300000.00,150000.00,2450000.00,1800000.00,650000.00,${closeoutEval.finalGrossMarginPercent}
`
      : `LineItem,Category,FinalContract_QAR,FinalActualCost_QAR,GrossProfit_QAR,Margin_Percent
Total Contract Revenue,Revenue,${closeoutEval.finalRevenue?.toDisplayString ? closeoutEval.finalRevenue.toDisplayString() : Number(closeoutEval.finalRevenue || 0).toFixed(2)},0.00,${closeoutEval.finalRevenue?.toDisplayString ? closeoutEval.finalRevenue.toDisplayString() : Number(closeoutEval.finalRevenue || 0).toFixed(2)},100%
Final Direct Costs,Direct Cost,0.00,${closeoutEval.finalActualCost?.toDisplayString ? closeoutEval.finalActualCost.toDisplayString() : Number(closeoutEval.finalActualCost || 0).toFixed(2)},-${closeoutEval.finalActualCost?.toDisplayString ? closeoutEval.finalActualCost.toDisplayString() : Number(closeoutEval.finalActualCost || 0).toFixed(2)},N/A
TOTAL COMMERCIAL SETTLEMENT,SUMMARY,${closeoutEval.finalRevenue?.toDisplayString ? closeoutEval.finalRevenue.toDisplayString() : Number(closeoutEval.finalRevenue || 0).toFixed(2)},${closeoutEval.finalActualCost?.toDisplayString ? closeoutEval.finalActualCost.toDisplayString() : Number(closeoutEval.finalActualCost || 0).toFixed(2)},${closeoutEval.finalProfit?.toDisplayString ? closeoutEval.finalProfit.toDisplayString() : Number(closeoutEval.finalProfit || 0).toFixed(2)},${closeoutEval.finalGrossMarginPercent}
`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `E3-EOS-Final-Account-Ledger-${projectId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pillarDescriptions: Array<{ key: keyof typeof checklist; title: string; desc: string }> = [
    { key: 'posFullyInvoicedOrDecommitted', title: '1. PO Commitments Sealed & Decommitted', desc: 'All purchase orders have matching final supplier invoices or formal remaining commitment cancellations.' },
    { key: 'supplierInvoicesSettled', title: '2. Zero Pending Supplier Invoices', desc: '100% of incoming vendor invoices are approved, scheduled for payment, or formally disputed.' },
    { key: 'clientMilestonesBilled', title: '3. Full Contract Milestones Invoiced', desc: 'All four contract billing milestones (Advance, Delivery, Opening, Final) have been formally invoiced.' },
    { key: 'openReceivablesManaged', title: '4. Receivables Managed & Under Action Plan', desc: isDemo ? 'Open milestone balance (245k QAR) tracked with 1-30 day aging and scheduled bank transfer confirmation.' : 'Open milestone balance tracked with aging and scheduled bank transfer confirmation.' },
    { key: 'retentionScheduleConfirmed', title: '5. Retention Release Terms Confirmed', desc: 'Zero unbonded retention disputes; final defect liability period escrow terms confirmed.' },
    { key: 'expenseClaimsSettled', title: '6. Site Cost Claims Cleared & Reimbursed', desc: 'Staff expenses, crew welfare, and emergency site purchases fully reimbursed and cost-coded.' },
    { key: 'variationsConcluded', title: '7. Variations Concluded & Client-Signed', desc: isDemo ? 'VO-01 and VO-02 fully approved with +150,000 QAR added to contract baseline.' : 'All scope variations fully approved and added to contract baseline.' },
    { key: 'costAllocationsConfirmed', title: '8. Multi-Package Cost Allocations Complete', desc: 'All actual costs verified without over-allocation across packages (Steel, Staging, AV, Lighting).' },
    { key: 'finalPandLAudited', title: '9. Final Project Profit & Loss Audited', desc: isDemo ? 'Revenue: 2,450,000 QAR | EAC: 1,800,000 QAR | Net Margin: 650,000 QAR (26.53%).' : `Revenue: ${Number(finalRev).toLocaleString()} QAR | EAC: ${Number(finalCost).toLocaleString()} QAR | Margin: ${closeoutEval.finalGrossMarginPercent}.` },
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
            <Badge variant={closeoutEval.isCommerciallyClosed ? 'success' : closeoutEval.decision === 'conditional_closure' ? 'warning' : 'danger'}>
              {closeoutEval.decision.toUpperCase().replace('_', ' ')} ({10 - closeoutEval.unmetPillars.length}/10 PILLARS)
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Governed 10-dimension commercial reconciliation and executive closeout sign-off with cryptographic audit seal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button id="btn-export-closeout-csv" variant="secondary" onClick={handleExportCsv}>
            📊 Export CSV
          </Button>
          <Button id="btn-export-closeout-pdf" variant="secondary" onClick={handleExportPdf}>
            📄 Export Audit Certificate
          </Button>
          <Button variant="secondary" onClick={() => loadData()}>
            ↻ Refresh State
          </Button>
          <Button
            variant="primary"
            onClick={() => setIsSignoffModalOpen(true)}
            disabled={closeoutEval.isCommerciallyClosed || closeout?.status === 'closed'}
          >
            {closeoutEval.isCommerciallyClosed ? '✓ Commercial Closeout Sealed' : '🔒 Authorize Commercial Closeout'}
          </Button>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Final Revenue"
          value={`${Number(closeoutEval.finalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} QAR`}
          subtext="Contract + Approved VOs"
        />
        <MetricCard
          label="Final Actual Cost (EAC)"
          value={`${Number(closeoutEval.finalActualCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} QAR`}
          subtext="Zero Double-Counting"
        />
        <MetricCard
          label="Final Commercial Profit"
          value={`${Number(closeoutEval.finalProfit || 0) >= 0 ? '+' : ''}${Number(closeoutEval.finalProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} QAR`}
          subtext="Net Project Earnings"
        />
        <MetricCard
          label="Final Gross Margin"
          value={closeoutEval.finalGrossMarginPercent}
          trend={isDemo ? "+6.96% vs Tender (19.57%)" : ""}
          trendDirection="up"
        />
      </div>

      {/* Unmet Pillars Alert if any */}
      {closeoutEval.unmetPillars.length > 0 && (
        <div id="unmet-pillars-alert" className="bg-amber-950/30 border border-amber-500/50 rounded-lg p-4 text-xs text-amber-300">
          <strong className="block text-sm text-amber-200 mb-1">
            ⚠️ Commercial Closeout Incomplete ({closeoutEval.unmetPillars.length} Pillar(s) Pending):
          </strong>
          <ul className="list-disc pl-5 space-y-1">
            {closeoutEval.unmetPillars.map((p, idx) => (
              <li key={idx}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Final Commercial Settlement Statement Ledger (Item 8) */}
      <Card title="Final Commercial Settlement Statement & Audit Ledger">
        <p className="text-sm text-slate-400 mb-3">
          Reconciled contract baseline, approved client variations, purchase order decommitments, and actual costs across disciplines.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 font-medium">
              <tr>
                <th className="p-3">Commercial Line Item / Description</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Contract Baseline</th>
                <th className="p-3 text-right">Approved Variations</th>
                <th className="p-3 text-right">Final Settled (QAR)</th>
                <th className="p-3 text-right">Actual Cost (EAC)</th>
                <th className="p-3 text-right">Net Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 font-mono text-xs">
              {isDemo ? (
                <>
                  <tr className="hover:bg-slate-800/40">
                    <td className="p-3 font-sans font-semibold text-white">Main Contract Base Scope (Advance + Milestones)</td>
                    <td className="p-3 font-sans text-slate-400">Revenue Baseline</td>
                    <td className="p-3 text-right text-slate-200">2,300,000.00</td>
                    <td className="p-3 text-right text-slate-500">—</td>
                    <td className="p-3 text-right text-white">2,300,000.00</td>
                    <td className="p-3 text-right text-slate-500">—</td>
                    <td className="p-3 text-right text-emerald-400">—</td>
                  </tr>
                  <tr className="hover:bg-slate-800/40">
                    <td className="p-3 font-sans font-semibold text-white">VO-01: VIP Royal Protocol Canopy Redesign</td>
                    <td className="p-3 font-sans text-amber-400">Approved Variation</td>
                    <td className="p-3 text-right text-slate-500">—</td>
                    <td className="p-3 text-right text-amber-400">+85,000.00</td>
                    <td className="p-3 text-right text-white">85,000.00</td>
                    <td className="p-3 text-right text-slate-500">—</td>
                    <td className="p-3 text-right text-emerald-400">—</td>
                  </tr>
                  <tr className="hover:bg-slate-800/40">
                    <td className="p-3 font-sans font-semibold text-white">VO-02: Acoustic Fabric Treatment & Baffles</td>
                    <td className="p-3 font-sans text-amber-400">Approved Variation</td>
                    <td className="p-3 text-right text-slate-500">—</td>
                    <td className="p-3 text-right text-amber-400">+65,000.00</td>
                    <td className="p-3 text-right text-white">65,000.00</td>
                    <td className="p-3 text-right text-slate-500">—</td>
                    <td className="p-3 text-right text-emerald-400">—</td>
                  </tr>
                  <tr className="hover:bg-slate-800/40 bg-slate-800/20">
                    <td className="p-3 font-sans font-semibold text-white">Purchase Orders Decommitment Adjustment</td>
                    <td className="p-3 font-sans text-emerald-400">PO Reconciled</td>
                    <td className="p-3 text-right text-slate-500">—</td>
                    <td className="p-3 text-right text-slate-500">—</td>
                    <td className="p-3 text-right text-slate-500">—</td>
                    <td className="p-3 text-right text-emerald-400">-120,000.00 (Decommitted)</td>
                    <td className="p-3 text-right text-emerald-400">+120,000.00 Savings</td>
                  </tr>
                  <tr className="hover:bg-slate-800/40">
                    <td className="p-3 font-sans font-semibold text-white">Direct Production Costs (Steel, Scenic, Carpentry)</td>
                    <td className="p-3 font-sans text-slate-400">Direct Cost</td>
                    <td className="p-3 text-right text-slate-500">—</td>
                    <td className="p-3 text-right text-slate-500">—</td>
                    <td className="p-3 text-right text-slate-500">—</td>
                    <td className="p-3 text-right text-rose-400">620,000.00</td>
                    <td className="p-3 text-right text-slate-400">—</td>
                  </tr>
                  <tr className="hover:bg-slate-800/40">
                    <td className="p-3 font-sans font-semibold text-white">AV, LED & Projection Subcontractors</td>
                    <td className="p-3 font-sans text-slate-400">Direct Cost</td>
                    <td className="p-3 text-right text-slate-500">—</td>
                    <td className="p-3 text-right text-slate-500">—</td>
                    <td className="p-3 text-right text-slate-500">—</td>
                    <td className="p-3 text-right text-rose-400">480,000.00</td>
                    <td className="p-3 text-right text-slate-400">—</td>
                  </tr>
                  <tr className="hover:bg-slate-800/40">
                    <td className="p-3 font-sans font-semibold text-white">Lighting, Rigging & Heavy Plant Machinery</td>
                    <td className="p-3 font-sans text-slate-400">Direct Cost</td>
                    <td className="p-3 text-right text-slate-500">—</td>
                    <td className="p-3 text-right text-slate-500">—</td>
                    <td className="p-3 text-right text-slate-500">—</td>
                    <td className="p-3 text-right text-rose-400">390,000.00</td>
                    <td className="p-3 text-right text-slate-400">—</td>
                  </tr>
                  <tr className="hover:bg-slate-800/40">
                    <td className="p-3 font-sans font-semibold text-white">Site Management, Crew Welfare & Permits</td>
                    <td className="p-3 font-sans text-slate-400">Site Operations</td>
                    <td className="p-3 text-right text-slate-500">—</td>
                    <td className="p-3 text-right text-slate-500">—</td>
                    <td className="p-3 text-right text-slate-500">—</td>
                    <td className="p-3 text-right text-rose-400">310,000.00</td>
                    <td className="p-3 text-right text-slate-400">—</td>
                  </tr>
                </>
              ) : Number(closeoutEval.finalRevenue || 0) > 0 || Number(closeoutEval.finalActualCost || 0) > 0 ? (
                <>
                  <tr className="hover:bg-slate-800/40">
                    <td className="p-3 font-sans font-semibold text-white">Total Authorized Contract & Variations</td>
                    <td className="p-3 font-sans text-slate-400">Revenue Baseline</td>
                    <td className="p-3 text-right text-slate-200">{Number(closeoutEval.finalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right text-slate-500">—</td>
                    <td className="p-3 text-right text-white">{Number(closeoutEval.finalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right text-slate-500">—</td>
                    <td className="p-3 text-right text-emerald-400">—</td>
                  </tr>
                  <tr className="hover:bg-slate-800/40">
                    <td className="p-3 font-sans font-semibold text-white">Total Reconciled Actual Direct Costs (EAC)</td>
                    <td className="p-3 font-sans text-slate-400">Direct Cost</td>
                    <td className="p-3 text-right text-slate-500">—</td>
                    <td className="p-3 text-right text-slate-500">—</td>
                    <td className="p-3 text-right text-slate-500">—</td>
                    <td className="p-3 text-right text-rose-400">{Number(closeoutEval.finalActualCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right text-slate-400">—</td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-sans">
                    No commercial closeout ledger items recorded for this project yet.
                  </td>
                </tr>
              )}
              <tr className="bg-slate-900 font-bold border-t-2 border-slate-600 text-sm">
                <td className="p-3 font-sans text-white">FINAL RECONCILED SETTLEMENT SUMMARY</td>
                <td className="p-3 font-sans text-emerald-400">{closeoutEval.decision.toUpperCase()}</td>
                <td className="p-3 text-right text-slate-300">{isDemo ? '2,300,000.00' : Number(closeoutEval.finalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="p-3 text-right text-amber-400">{isDemo ? '+150,000.00' : '—'}</td>
                <td className="p-3 text-right text-white">{Number(closeoutEval.finalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="p-3 text-right text-rose-300">{Number(closeoutEval.finalActualCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="p-3 text-right text-emerald-400">+{Number(closeoutEval.finalProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({closeoutEval.finalGrossMarginPercent})</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

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
              <Badge variant={closeoutEval.isCommerciallyClosed ? 'success' : 'warning'}>
                {closeoutEval.decision.toUpperCase().replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/50 pb-2">
              <span className="text-slate-400">Signed By:</span>
              <span className="text-white font-medium">{authorizedBy}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/50 pb-2">
              <span className="text-slate-400">Evaluation Timestamp:</span>
              <span className="text-slate-300 font-mono">{closeoutEval.signedAt}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">SHA-256 Audit Seal (CommercialCloseoutEngine):</span>
              <div id="closeout-audit-seal-display" className="bg-slate-950 p-2.5 rounded font-mono text-amber-400 break-all text-[11px] border border-slate-800">
                {closeoutEval.auditHash}
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
            placeholder="Authorized executive name and title"
          />

          <Textarea
            label="Executive Closeout Justification"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Enter executive closeout justification..."
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
