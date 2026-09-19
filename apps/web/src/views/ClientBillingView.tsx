import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, MetricCard, Badge, Button, Modal, Input, Select } from '../components/DesignSystem.js';
import { isSyntheticDemo } from '../services/api-client.js';

export const ClientBillingView: React.FC = () => {
  const { currentLanguage, apiClient, selectedProjectId, currentUser, currentProject } = useEosContext();
  const isDemo = isSyntheticDemo(selectedProjectId);
  const projectId = selectedProjectId || (isDemo ? 'PRJ-QND-2026' : '');

  const [milestones, setMilestones] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [aging, setAging] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Record Collection Modal
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState<boolean>(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [collectionAmount, setCollectionAmount] = useState<number | string>('');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ms, inv, col, ag] = await Promise.all([
        apiClient.getPaymentMilestones(projectId),
        apiClient.getClientInvoices(projectId),
        apiClient.getCollections(projectId),
        apiClient.getReceivablesAging(projectId),
      ]);
      setMilestones(ms);
      setInvoices(inv);
      setCollections(col);
      setAging(ag);
      if (inv && inv.length > 0 && !selectedInvoiceId) {
        const firstPending = inv.find((i: any) => Number(i.outstandingAmount) > 0) || inv[0];
        if (firstPending) {
          setSelectedInvoiceId(firstPending.id);
        }
      }
    } catch (err) {
      console.error('Failed to load client billing data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleIssueInvoice = async (invoiceId: string) => {
    try {
      await apiClient.issueClientInvoice(invoiceId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to issue invoice');
    }
  };

  const handleRecordCollection = async () => {
    const amt = typeof collectionAmount === 'string' ? parseFloat(collectionAmount) : collectionAmount;
    if (!amt || isNaN(amt) || !selectedInvoiceId) return;
    setIsRecording(true);
    try {
      await apiClient.recordCollection({
        projectId,
        clientInvoiceId: selectedInvoiceId,
        amountReceived: amt,
        paymentDate: new Date().toISOString(),
        paymentReference: paymentRef || `TRF-${Date.now().toString().slice(-6)}`,
        paymentMethod: 'bank_transfer',
        recordedBy: currentUser?.name ? `${currentUser.name} (${currentUser.role || 'Finance Director'})` : 'Finance Director',
      });
      setIsCollectionModalOpen(false);
      setCollectionAmount('');
      setPaymentRef('');
      await loadData();
    } catch (err) {
      console.error('Failed to record collection', err);
    } finally {
      setIsRecording(false);
    }
  };

  const totalContractVal = milestones.reduce((sum, m) => sum + (Number(m.contractualAmount) || 0), 0);
  const totalBilledVal = invoices.reduce((sum, inv) => sum + (Number(inv.netDueAmount) || 0), 0);
  const totalCollectedVal = collections.reduce((sum, col) => sum + (Number(col.amountReceived) || 0), 0);
  const openReceivablesVal = invoices.reduce((sum, inv) => sum + (Number(inv.outstandingAmount) || 0), 0);
  const billedPctStr = totalContractVal > 0 ? `${((totalBilledVal / totalContractVal) * 100).toFixed(1)}% of Contract` : '0.0% of Contract';
  const collectedPctStr = totalBilledVal > 0 ? `${((totalCollectedVal / totalBilledVal) * 100).toFixed(1)}% Collected` : '0.0% Collected';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-wide">
              {currentLanguage === 'ar' ? 'فوترة العميل والتحصيل والذمم المدينة' : 'Client Billing, Milestones & Receivables'}
            </h1>
            <Badge variant="success">CONTRACT VALUE: {totalContractVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} QAR</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Contract payment milestone schedule, formal client invoices, payment collections and receivables aging analysis.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={() => setIsCollectionModalOpen(true)}>
            + Record Client Collection
          </Button>
          <Button variant="secondary" onClick={() => loadData()}>
            ↻ Refresh
          </Button>
        </div>
      </div>

      {/* Decoupled Operational vs Settlement Closeout Invariant (AT-078) */}
      <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>⚖️</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ color: '#1e40af', fontSize: '13px' }}>
                INVARIANT AT-078: Decoupled Operational Closeout & Commercial Receivables
              </strong>
              <Badge variant="accent">AT-078 ENFORCED</Badge>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#3b82f6' }}>
              The event operations can be 100% closed, de-rigged, and handed over to {currentProject?.clientName || (isDemo ? 'Qatar Tourism' : 'the client')} while remaining milestone receivables ({openReceivablesVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} QAR) stay active in this commercial ledger until final payment collection.
            </p>
          </div>
        </div>
        <Badge variant="success">Operational Gate Independent</Badge>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Contract Value"
          value={`${totalContractVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} QAR`}
          subtext="100% Fixed Lump Sum"
        />
        <MetricCard
          label="Total Billed"
          value={`${totalBilledVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} QAR`}
          trend={billedPctStr}
          trendDirection="up"
        />
        <MetricCard
          label="Cash Collected"
          value={`${totalCollectedVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} QAR`}
          trend={collectedPctStr}
          trendDirection="up"
        />
        <MetricCard
          label="Open Receivables"
          value={`${openReceivablesVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} QAR`}
          subtext={openReceivablesVal > 0 ? 'Pending Collection' : 'All Invoices Cleared'}
        />
      </div>

      {/* Payment Milestones Schedule */}
      <Card title="Contract Payment Milestones Schedule">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300" style={{ borderCollapse: 'collapse' }}>
            <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 font-medium">
              <tr>
                <th className="p-3 whitespace-nowrap">Milestone Code</th>
                <th className="p-3">Milestone Name</th>
                <th className="p-3 whitespace-nowrap">% Contract</th>
                <th className="p-3 whitespace-nowrap">Amount (QAR)</th>
                <th className="p-3 whitespace-nowrap">Collection State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {milestones.map((ms) => (
                <tr key={ms.id} className="hover:bg-slate-800/40">
                  <td className="p-3 font-mono font-medium text-white whitespace-nowrap">{ms.milestoneCode}</td>
                  <td className="p-3">{ms.milestoneName}</td>
                  <td className="p-3 font-semibold text-amber-400 whitespace-nowrap">{ms.percentageOfContract}%</td>
                  <td className="p-3 font-mono font-bold text-white whitespace-nowrap">{Number(ms.contractualAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} QAR</td>
                  <td className="p-3 whitespace-nowrap">
                    <Badge variant={ms.collectionStatus === 'fully_collected' ? 'success' : ms.collectionStatus === 'partially_collected' ? 'warning' : 'default'}>
                      {ms.collectionStatus.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </td>
                </tr>
              ))}
              {milestones.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No payment milestones defined for this project.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Client Invoices & Receivables Aging */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title="Issued & Pending Client Invoices">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300" style={{ borderCollapse: 'collapse' }}>
                <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 font-medium">
                  <tr>
                    <th className="p-3 whitespace-nowrap">Invoice #</th>
                    <th className="p-3 whitespace-nowrap">Type</th>
                    <th className="p-3 whitespace-nowrap">Gross Due</th>
                    <th className="p-3 whitespace-nowrap">Collected</th>
                    <th className="p-3 whitespace-nowrap">Outstanding</th>
                    <th className="p-3 whitespace-nowrap">Status</th>
                    <th className="p-3 text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-medium text-white whitespace-nowrap">{inv.invoiceNumber}</td>
                      <td className="p-3 capitalize whitespace-nowrap">{inv.billingType}</td>
                      <td className="p-3 font-mono font-bold text-white whitespace-nowrap">{Number(inv.netDueAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="p-3 font-mono text-emerald-400 whitespace-nowrap">{Number(inv.collectedAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="p-3 font-mono text-red-400 whitespace-nowrap">{Number(inv.outstandingAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="p-3 whitespace-nowrap">
                        <Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'partially_paid' ? 'warning' : inv.status === 'ready_to_issue' ? 'info' : 'default'}>
                          {inv.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        {inv.status === 'ready_to_issue' ? (
                          <Button size="sm" variant="primary" onClick={() => handleIssueInvoice(inv.id)}>
                            Issue to Client
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-500">Issued</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No client invoices issued for this project.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div>
          <Card title="Receivables Aging Profile">
            <div className="space-y-3 text-xs">
              <div className="flex justify-between p-2 rounded bg-slate-800/60">
                <span className="text-slate-400">Current (Not Due):</span>
                <span className="font-mono text-white">{Number(aging?.agingBuckets?.current || 0).toLocaleString()} QAR</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-amber-950/20 border border-amber-500/30">
                <span className="text-amber-300 font-medium">1 - 30 Days:</span>
                <span className="font-mono font-bold text-amber-400">{Number(aging?.agingBuckets?.days1to30 || (isDemo ? 245000 : 0)).toLocaleString()} QAR</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-800/60">
                <span className="text-slate-400">31 - 60 Days:</span>
                <span className="font-mono text-white">{Number(aging?.agingBuckets?.days31to60 || 0).toLocaleString()} QAR</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-800/60">
                <span className="text-slate-400">60+ Days:</span>
                <span className="font-mono text-white">{Number(aging?.agingBuckets?.daysOver90 || 0).toLocaleString()} QAR</span>
              </div>
              <div className="border-t border-slate-700/60 pt-3 flex justify-between font-semibold text-sm">
                <span className="text-white">Total Outstanding:</span>
                <span className="font-mono text-amber-400">
                  {Number(aging?.agingBuckets?.totalOutstanding ?? openReceivablesVal).toLocaleString()} QAR
                </span>
              </div>
              <div className="pt-2">
                <Badge variant={aging?.paymentReliabilityScore && aging?.paymentReliabilityScore !== '—' ? "success" : "neutral"}>
                  PAYMENT RELIABILITY SCORE: {aging?.paymentReliabilityScore ?? (isDemo ? '98%' : 'N/A')}
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Collections Register */}
      <Card title={`Collections & Bank Transfer Receipts (${collections.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 font-medium">
              <tr>
                <th className="p-3">Collection ID</th>
                <th className="p-3">Invoice Ref</th>
                <th className="p-3">Amount Received</th>
                <th className="p-3">Payment Reference</th>
                <th className="p-3">Method</th>
                <th className="p-3">Payment Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {collections.map((col) => (
                <tr key={col.id} className="hover:bg-slate-800/40">
                  <td className="p-3 font-mono font-medium text-white">{col.id}</td>
                  <td className="p-3 font-mono text-slate-400">{col.clientInvoiceId}</td>
                  <td className="p-3 font-mono font-bold text-emerald-400">{Number(col.amountReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} QAR</td>
                  <td className="p-3 font-mono text-slate-300">{col.paymentReference}</td>
                  <td className="p-3 capitalize">{col.paymentMethod.replace('_', ' ')}</td>
                  <td className="p-3 text-slate-400">{new Date(col.paymentDate).toLocaleDateString()}</td>
                </tr>
              ))}
              {collections.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No client collections recorded for this project.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Record Collection Modal */}
      <Modal
        isOpen={isCollectionModalOpen}
        onClose={() => setIsCollectionModalOpen(false)}
        title="Record Client Inflow / Collection"
      >
        <div className="space-y-4">
          <Select
            label="Client Invoice"
            value={selectedInvoiceId}
            onChange={(e) => setSelectedInvoiceId(e.target.value)}
            options={invoices.map((inv) => ({
              value: inv.id,
              label: `${inv.invoiceNumber} — ${inv.billingType.toUpperCase()} (Net Due: ${Number(inv.netDueAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} QAR, Outstanding: ${Number(inv.outstandingAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} QAR)`,
            }))}
          />

          <Input
            label="Amount Received (QAR)"
            type="number"
            value={collectionAmount.toString()}
            onChange={(e) => setCollectionAmount(e.target.value)}
            placeholder="0"
          />

          <Input
            label="Bank Transfer / Remittance Reference"
            value={paymentRef}
            onChange={(e) => setPaymentRef(e.target.value)}
            placeholder="e.g. QNB-TRF-919283"
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" onClick={() => setIsCollectionModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRecordCollection} disabled={isRecording || !selectedInvoiceId || !collectionAmount}>
              {isRecording ? 'Recording...' : 'Confirm & Post Collection'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
