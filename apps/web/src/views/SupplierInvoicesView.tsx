import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, Badge, Button, Modal, Input, Textarea } from '../components/DesignSystem.js';

export const SupplierInvoicesView: React.FC = () => {
  const { currentLanguage, apiClient, selectedProjectId } = useEosContext();
  const projectId = selectedProjectId || 'PRJ-QND-2026';

  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 3-Way Match Modal
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [isApproving, setIsApproving] = useState<boolean>(false);

  // OCR Drawer/Modal
  const [isOcrModalOpen, setIsOcrModalOpen] = useState<boolean>(false);
  const [ocrDraft, setOcrDraft] = useState<any>(null);
  const [confirmedVendor, setConfirmedVendor] = useState<string>('Qatar Lighting Tech Systems');
  const [confirmedInvNo, setConfirmedInvNo] = useState<string>('INV-QL-5519');
  const [confirmedAmount, setConfirmedAmount] = useState<number>(65000);
  const [isConfirmingOcr, setIsConfirmingOcr] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const invs = await apiClient.getSupplierInvoices(projectId);
      setInvoices(invs);
    } catch (err) {
      console.error('Failed to load supplier invoices', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleOpenMatch = async (inv: any) => {
    setSelectedInvoice(inv);
    setIsMatchModalOpen(true);
    try {
      const res = await apiClient.evaluateThreeWayMatch(inv.id);
      setMatchResult(res.matchResult);
    } catch (err) {
      console.error('Failed to evaluate match', err);
    }
  };

  const handleApproveInvoice = async () => {
    if (!selectedInvoice) return;
    setIsApproving(true);
    try {
      await apiClient.approveSupplierInvoice(selectedInvoice.id, {
        invoiceId: selectedInvoice.id,
        approvedAmount: parseFloat(selectedInvoice.totalAmount),
        authorizedBy: 'Hamad Al-Kuwari (Finance Director)',
        approverRole: 'commercial_director',
        justification: overrideReason || 'Standard 3-way match verified against PO and delivery inspection notes',
      });
      setIsMatchModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    } finally {
      setIsApproving(false);
    }
  };

  const handleOpenOcr = async () => {
    try {
      const res = await apiClient.ocrExtractSupplierInvoice({ fileName: 'INV-QL-5519_Scan.pdf' });
      setOcrDraft(res.ocrDraft);
      setConfirmedVendor(res.ocrDraft?.extractedData?.vendorName || 'Qatar Lighting Tech Systems');
      setConfirmedInvNo(res.ocrDraft?.extractedData?.invoiceNumber || 'INV-QL-5519');
      setConfirmedAmount(res.ocrDraft?.extractedData?.totalAmount || 65000);
      setIsOcrModalOpen(true);
    } catch (err) {
      console.error('OCR extract failed', err);
    }
  };

  const handleConfirmOcr = async () => {
    setIsConfirmingOcr(true);
    try {
      await apiClient.confirmOcrExtraction({
        projectId,
        vendorId: 'VND-QATAR-LIGHT',
        fileHash: 'sha256-ocr-draft-ql-5519-verified',
        extractedInvoiceNumber: confirmedInvNo,
        extractedDate: '2026-08-25',
        extractedCurrency: 'QAR',
        extractedSubtotal: confirmedAmount,
        extractedTax: 0,
        extractedTotal: confirmedAmount,
        confirmedBy: 'Tariq Al-Mansoor (Cost Controller)',
        confidenceScore: 0.96,
        poNumber: 'PO-QND-004',
      });
      setIsOcrModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('OCR confirmation failed', err);
    } finally {
      setIsConfirmingOcr(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-wide">
              {currentLanguage === 'ar' ? 'سجل فواتير الموردين والمطابقة الثلاثية' : 'Supplier Invoices & Three-Way Match Register'}
            </h1>
            <Badge variant="info">COMMERCIAL CONTROL LAYER</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Reconciliation of Purchase Orders, Goods/Service Receipts, and Supplier Invoices with zero double-counting.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleOpenOcr}>
            📄 Process New Invoice (AI OCR)
          </Button>
          <Button variant="primary" onClick={() => loadData()}>
            ↻ Refresh Register
          </Button>
        </div>
      </div>

      {/* Invoices Table */}
      <Card title={`Supplier Invoices Registered (${invoices.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 font-medium">
              <tr>
                <th className="p-3">Invoice #</th>
                <th className="p-3">Vendor</th>
                <th className="p-3">PO Reference</th>
                <th className="p-3">Total Amount</th>
                <th className="p-3">3-Way Match</th>
                <th className="p-3">Ledger Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-800/40">
                  <td className="p-3 font-mono font-medium text-white">{inv.invoiceNumber}</td>
                  <td className="p-3">{inv.vendorName}</td>
                  <td className="p-3 font-mono text-slate-400">{inv.poId || 'N/A'}</td>
                  <td className="p-3 font-mono font-semibold text-white">
                    {parseInt(inv.totalAmount).toLocaleString()} {inv.currency}
                  </td>
                  <td className="p-3">
                    {inv.threeWayMatchStatus === 'matched' ? (
                      <Badge variant="success">✓ Matched</Badge>
                    ) : inv.threeWayMatchStatus === 'exception_detected' ? (
                      <Badge variant="danger">⚠ Exception Detected</Badge>
                    ) : (
                      <Badge variant="warning">⏳ Pending Match</Badge>
                    )}
                  </td>
                  <td className="p-3">
                    <Badge variant={inv.status === 'approved' ? 'success' : inv.status === 'match_exception' ? 'danger' : 'default'}>
                      {inv.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <Button variant="secondary" size="sm" onClick={() => handleOpenMatch(inv)}>
                      Inspect 3-Way Match
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 3-Way Match Inspector Modal */}
      <Modal
        isOpen={isMatchModalOpen}
        onClose={() => setIsMatchModalOpen(false)}
        title={`Three-Way Match Inspector — ${selectedInvoice?.invoiceNumber}`}
      >
        <div className="space-y-4">
          <div className="bg-slate-900/90 p-4 rounded-lg border border-slate-700/60 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Vendor:</span>
              <span className="text-white font-medium">{selectedInvoice?.vendorName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Purchase Order:</span>
              <span className="font-mono text-amber-400">{selectedInvoice?.poId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Invoiced Amount:</span>
              <span className="font-mono text-white font-bold">{selectedInvoice?.totalAmount} QAR</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Overall Match State:</span>
              <span>
                {matchResult?.overallMatch ? (
                  <span className="text-emerald-400 font-semibold">✓ Fully Matched (PO vs Receipts vs Invoice)</span>
                ) : (
                  <span className="text-red-400 font-semibold">⚠ Discrepancies Found — Review Required</span>
                )}
              </span>
            </div>
          </div>

          {/* Discrepancies Alert */}
          {matchResult?.discrepancyDetails && matchResult.discrepancyDetails.length > 0 && (
            <div className="bg-red-950/40 border border-red-500/50 rounded-lg p-4 space-y-2">
              <h4 className="text-red-300 font-semibold text-sm flex items-center gap-2">
                <span>⚠ Match Exceptions Detected</span>
              </h4>
              {matchResult.discrepancyDetails.map((disc: any, i: number) => (
                <div key={i} className="text-xs text-red-200 border-t border-red-800/40 pt-2">
                  <p className="font-semibold">{disc.code}: {disc.field}</p>
                  <p className="text-red-300">{disc.message}</p>
                  <p className="text-slate-400">Expected: {disc.expected} | Invoiced: {disc.actual}</p>
                </div>
              ))}
            </div>
          )}

          {/* Override Justification if exception */}
          {!matchResult?.overallMatch && (
            <Textarea
              label="Managerial Override Justification (Mandatory to approve with exception)"
              placeholder="Explain commercial rationale, delivery verification, or approved variation..."
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
            />
          )}

          <div className="bg-slate-800/60 p-3 rounded text-xs text-slate-400">
            <span className="font-semibold text-amber-400">Ledger Transition Rule:</span> Approving this invoice will reduce PO remaining commitments by {selectedInvoice?.totalAmount} QAR and increase posted actual cost by {selectedInvoice?.totalAmount} QAR. Estimate at Completion (EAC) will remain strictly invariant.
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" onClick={() => setIsMatchModalOpen(false)}>
              Close
            </Button>
            <Button
              variant={matchResult?.overallMatch ? 'primary' : 'danger'}
              onClick={handleApproveInvoice}
              disabled={isApproving || (!matchResult?.overallMatch && !overrideReason)}
            >
              {isApproving ? 'Processing...' : matchResult?.overallMatch ? 'Approve & Commit to Actuals' : 'Authorize Override & Approve'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* AI OCR Confirmation Modal */}
      <Modal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        title="Human-in-the-Loop OCR Draft Verification"
      >
        <div className="space-y-4">
          <div className="bg-amber-950/20 border border-amber-500/40 rounded p-3 text-xs text-amber-300">
            ⚠ <strong>AI Boundary Rule:</strong> Extracted fields are suggestions with {Math.round((ocrDraft?.confidenceScore || 0.96) * 100)}% confidence. Human accountant confirmation is strictly required before any ledger mutation.
          </div>

          <Input
            label="Vendor Name"
            value={confirmedVendor}
            onChange={(e) => setConfirmedVendor(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Invoice Number"
              value={confirmedInvNo}
              onChange={(e) => setConfirmedInvNo(e.target.value)}
            />
            <Input
              label="Total Amount (QAR)"
              type="number"
              value={confirmedAmount.toString()}
              onChange={(e) => setConfirmedAmount(parseFloat(e.target.value))}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" onClick={() => setIsOcrModalOpen(false)}>
              Reject Draft
            </Button>
            <Button variant="primary" onClick={handleConfirmOcr} disabled={isConfirmingOcr}>
              {isConfirmingOcr ? 'Confirming...' : 'Confirm & Generate Supplier Invoice'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
