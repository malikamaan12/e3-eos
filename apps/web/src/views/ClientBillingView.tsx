import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, MetricCard, Badge, Button, Modal, Input, Select } from '../components/DesignSystem.js';

export const ClientBillingView: React.FC = () => {
  const { currentLanguage, apiClient, selectedProjectId } = useEosContext();
  const projectId = selectedProjectId || 'PRJ-QND-2026';

  const [milestones, setMilestones] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [aging, setAging] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Record Collection Modal
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState<boolean>(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('INV-CLI-003');
  const [collectionAmount, setCollectionAmount] = useState<number>(245000);
  const [paymentRef, setPaymentRef] = useState<string>('QNB-TRF-919283');
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
    setIsRecording(true);
    try {
      await apiClient.recordCollection({
        projectId,
        clientInvoiceId: selectedInvoiceId,
        amountReceived: collectionAmount,
        paymentDate: new Date().toISOString(),
        paymentReference: paymentRef,
        paymentMethod: 'bank_transfer',
        recordedBy: 'Hamad Al-Kuwari (Finance Director)',
      });
      setIsCollectionModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to record collection', err);
    } finally {
      setIsRecording(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-wide">
              {currentLanguage === 'ar' ? 'فوترة العميل والتحصيل والذمم المدينة' : 'Client Billing, Milestones & Receivables'}
            </h1>
            <Badge variant="success">CONTRACT VALUE: 2,450,000 QAR</Badge>
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

      {/* Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Contract Value"
          value="2,450,000 QAR"
          subtext="100% Fixed Lump Sum"
        />
        <MetricCard
          label="Total Billed"
          value="1,960,000 QAR"
          trend="80.0% of Contract"
          trendDirection="up"
        />
        <MetricCard
          label="Cash Collected"
          value="1,715,000 QAR"
          trend="70.0% Collected"
          trendDirection="up"
        />
        <MetricCard
          label="Open Receivables"
          value="245,000 QAR"
          subtext="Invoice #003 Due (1-30 Days)"
        />
      </div>

      {/* Payment Milestones Schedule */}
      <Card title="Contract Payment Milestones Schedule">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 font-medium">
              <tr>
                <th className="p-3">Milestone Code</th>
                <th className="p-3">Milestone Name</th>
                <th className="p-3">% Contract</th>
                <th className="p-3">Amount (QAR)</th>
                <th className="p-3">Collection State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {milestones.map((ms) => (
                <tr key={ms.id} className="hover:bg-slate-800/40">
                  <td className="p-3 font-mono font-medium text-white">{ms.milestoneCode}</td>
                  <td className="p-3">{ms.milestoneName}</td>
                  <td className="p-3 font-semibold text-amber-400">{ms.percentageOfContract}%</td>
                  <td className="p-3 font-mono font-bold text-white">{parseInt(ms.contractualAmount).toLocaleString()} QAR</td>
                  <td className="p-3">
                    <Badge variant={ms.collectionStatus === 'fully_collected' ? 'success' : ms.collectionStatus === 'partially_collected' ? 'warning' : 'default'}>
                      {ms.collectionStatus.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Client Invoices & Receivables Aging */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title="Issued & Pending Client Invoices">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 font-medium">
                  <tr>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Gross Due</th>
                    <th className="p-3">Collected</th>
                    <th className="p-3">Outstanding</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-medium text-white">{inv.invoiceNumber}</td>
                      <td className="p-3 capitalize">{inv.billingType}</td>
                      <td className="p-3 font-mono font-bold text-white">{parseInt(inv.netDueAmount).toLocaleString()}</td>
                      <td className="p-3 font-mono text-emerald-400">{parseInt(inv.collectedAmount).toLocaleString()}</td>
                      <td className="p-3 font-mono text-red-400">{parseInt(inv.outstandingAmount).toLocaleString()}</td>
                      <td className="p-3">
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
                <span className="font-mono text-white">0 QAR</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-amber-950/20 border border-amber-500/30">
                <span className="text-amber-300 font-medium">1 - 30 Days:</span>
                <span className="font-mono font-bold text-amber-400">245,000 QAR</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-800/60">
                <span className="text-slate-400">31 - 60 Days:</span>
                <span className="font-mono text-white">0 QAR</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-800/60">
                <span className="text-slate-400">60+ Days:</span>
                <span className="font-mono text-white">0 QAR</span>
              </div>
              <div className="border-t border-slate-700/60 pt-3 flex justify-between font-semibold text-sm">
                <span className="text-white">Total Outstanding:</span>
                <span className="font-mono text-amber-400">245,000 QAR</span>
              </div>
              <div className="pt-2">
                <Badge variant="success">PAYMENT RELIABILITY SCORE: 98%</Badge>
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
                  <td className="p-3 font-mono font-bold text-emerald-400">{parseInt(col.amountReceived).toLocaleString()} QAR</td>
                  <td className="p-3 font-mono text-slate-300">{col.paymentReference}</td>
                  <td className="p-3 capitalize">{col.paymentMethod.replace('_', ' ')}</td>
                  <td className="p-3 text-slate-400">{new Date(col.paymentDate).toLocaleDateString()}</td>
                </tr>
              ))}
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
              label: `${inv.invoiceNumber} — ${inv.billingType.toUpperCase()} (Net Due: ${parseInt(inv.netDueAmount).toLocaleString()} QAR, Outstanding: ${parseInt(inv.outstandingAmount).toLocaleString()} QAR)`,
            }))}
          />

          <Input
            label="Amount Received (QAR)"
            type="number"
            value={collectionAmount.toString()}
            onChange={(e) => setCollectionAmount(parseFloat(e.target.value))}
          />

          <Input
            label="Bank Transfer / Remittance Reference"
            value={paymentRef}
            onChange={(e) => setPaymentRef(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" onClick={() => setIsCollectionModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRecordCollection} disabled={isRecording}>
              {isRecording ? 'Recording...' : 'Confirm & Post Collection'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
