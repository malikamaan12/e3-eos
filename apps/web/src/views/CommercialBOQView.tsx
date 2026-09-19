import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Badge, Button, Card, Modal, Input } from '../components/DesignSystem.js';
import { isSyntheticDemo } from '../services/api-client.js';

interface CommercialBOQViewProps {
  projectId: string;
}

export const CURRENCIES = [
  { code: 'QAR', rate: 1.0, symbol: 'QAR', label: 'QAR (Qatar Riyal)' },
  { code: 'USD', rate: 0.2747, symbol: '$', label: 'USD (US Dollar)' },
  { code: 'EUR', rate: 0.2525, symbol: '€', label: 'EUR (Euro)' },
  { code: 'GBP', rate: 0.2137, symbol: '£', label: 'GBP (British Pound)' },
  { code: 'SAR', rate: 1.0309, symbol: 'SAR', label: 'SAR (Saudi Riyal)' },
  { code: 'AED', rate: 1.0101, symbol: 'AED', label: 'AED (UAE Dirham)' },
];

export const CommercialBOQView: React.FC<CommercialBOQViewProps> = ({ projectId }) => {
  const { apiClient, refreshTrigger, triggerRefresh, currentUser, currentOrg } = useEosContext();
  const isDemo = isSyntheticDemo(projectId);

  const [loading, setLoading] = useState<boolean>(true);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [selectedEstimateId, setSelectedEstimateId] = useState<string>('');
  const [lines, setLines] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any | null>(null);

  // Dynamic currency selector state
  const [selectedCurrency, setSelectedCurrency] = useState<string>('QAR');

  // Add line modal
  const [isAddLineModalOpen, setIsAddLineModalOpen] = useState<boolean>(false);
  const [lineCode, setLineCode] = useState<string>('');
  const [lineDesc, setLineDesc] = useState<string>('');
  const [lineQuantity, setLineQuantity] = useState<string>('1');
  const [lineUom, setLineUom] = useState<string>('lot');
  const [lineCost, setLineCost] = useState<string>('');
  const [lineSell, setLineSell] = useState<string>('');
  const [linkedReqCode, setLinkedReqCode] = useState<string>('');
  const [isSubmittingLine, setIsSubmittingLine] = useState<boolean>(false);

  const activeCurrency = CURRENCIES.find((c) => c.code === selectedCurrency) || CURRENCIES[0];

  const formatWithCurrency = (amountQar: number | string) => {
    const num = typeof amountQar === 'string' ? parseFloat(amountQar.replace(/[^0-9.-]+/g, '')) : amountQar;
    if (isNaN(num)) return `0 ${selectedCurrency}`;
    const converted = Math.round(num * activeCurrency.rate);
    return `${converted.toLocaleString('en-US')} ${activeCurrency.code}`;
  };

  const handleExportBOQCsv = () => {
    if (typeof window === 'undefined') return;
    const curr = activeCurrency;
    
    const headers = [
      'Line Code',
      'Hierarchy (Section > Discipline)',
      'Description',
      'Linked Scope Requirement',
      'Linked Design Reference',
      'Quantity',
      'UOM',
      'Unit Supplier Cost (QAR)',
      `Unit Supplier Cost (${curr.code})`,
      'Unit Sell Price (QAR)',
      `Unit Sell Price (${curr.code})`,
      'Total Supplier Cost (QAR)',
      `Total Supplier Cost (${curr.code})`,
      'Total Sell Price (QAR)',
      `Total Sell Price (${curr.code})`,
      'Gross Margin %',
    ];

    const rows = lines.map((l) => {
      const qty = Number(l.quantity || 1);
      const unitCost = Number(l.unitCost || 0);
      const unitSell = Number(l.unitSell || 0);
      const totCost = qty * unitCost;
      const totSell = qty * unitSell;
      const margin = totSell > 0 ? (((totSell - totCost) / totSell) * 100).toFixed(1) + '%' : '0%';

      return [
        `"${l.lineCode || ''}"`,
        `"${(l.section ? `${l.section} > ${l.discipline}` : 'Direct Delivery').replace(/"/g, '""')}"`,
        `"${(l.description || '').replace(/"/g, '""')}"`,
        `"${l.linkedRequirementCode || ''}"`,
        `"${l.linkedDesignId || 'Approved DWG'}"`,
        qty,
        `"${l.uom || 'lot'}"`,
        unitCost,
        Math.round(unitCost * curr.rate),
        unitSell,
        Math.round(unitSell * curr.rate),
        totCost,
        Math.round(totCost * curr.rate),
        totSell,
        Math.round(totSell * curr.rate),
        `"${margin}"`,
      ].join(',');
    });

    const csvString = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BOQ-Master-Ledger-${projectId}-${selectedCurrency}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintBOQ = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [estList, finRes] = await Promise.all([
          apiClient.getEstimates(projectId).catch(() => []),
          fetch(`/api/v1/projects/${projectId}/financials`, {
            headers: {
              'x-organization-id': currentOrg?.id || '11111111-1111-4111-8111-111111111111',
              'x-user-id': currentUser?.id || '10000000-0000-4000-8000-000000000004',
            },
          }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);

        if (isMounted) {
          setEstimates(estList || []);
          if (finRes?.data?.payload) {
            setFinancials(finRes.data.payload);
          }
          const activeEst = estList[0];
          if (activeEst) {
            setSelectedEstimateId(activeEst.id);
            const lineList = await apiClient.getEstimateLines(projectId, activeEst.id).catch(() => []);
            if (isMounted) setLines(lineList || []);
          }
        }
      } catch (err) {
        console.error('Failed to load commercial estimates:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [apiClient, projectId, refreshTrigger]);

  const handleAddLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineDesc || !selectedEstimateId) return;
    setIsSubmittingLine(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/estimates/${selectedEstimateId}/lines`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': currentOrg?.id || '11111111-1111-4111-8111-111111111111',
          'x-user-id': currentUser?.id || '10000000-0000-4000-8000-000000000004',
          'Idempotency-Key': `line-${Date.now()}`,
        },
        body: JSON.stringify({
          lineCode: lineCode || `BOQ-${Date.now().toString().slice(-4)}`,
          description: lineDesc,
          quantity: lineQuantity,
          uom: lineUom,
          unitCost: lineCost,
          unitSell: lineSell,
          durationMultiplier: '1',
          isLumpSum: true,
          linkedRequirementCode: linkedReqCode,
        }),
      });
      if (!res.ok) {
        throw new Error('Failed to add BOQ line');
      }
      setIsAddLineModalOpen(false);
      setLineCode('');
      setLineDesc('');
      setLineQuantity('1');
      setLineUom('lot');
      setLineCost('');
      setLineSell('');
      setLinkedReqCode('');
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to add BOQ line');
    } finally {
      setIsSubmittingLine(false);
    }
  };

  if (loading && estimates.length === 0) {
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>Loading commercial estimates & BOQ ledger...</div>;
  }

  const activeEstimate = estimates.find((e) => e.id === selectedEstimateId) || estimates[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Commercial Baseline Top Banner */}
      <div
        style={{
          backgroundColor: 'var(--surface-1, #0f1624)',
          color: 'var(--text-primary, #f8fafc)',
          borderRadius: '8px',
          padding: '20px 24px',
          border: '1px solid var(--border-default, #2a374b)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent, #d97706)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Commercial & BOQ Traceability Engine
            </span>
            <Badge variant="success">EAC Variance Control</Badge>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
            Every Priced Item Strictly Links to a Scope Requirement
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted, #94a3b8)', marginTop: '4px' }}>
            Zero orphan costing: Contractor buy-rate, target internal margin, and client sell-rate reconciled continuously.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Dynamic Currency Converter Selector */}
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface-inset, #0b111d)', border: '1px solid var(--border-default, #2a374b)', borderRadius: '6px', padding: '3px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted, #94a3b8)', padding: '0 8px', textTransform: 'uppercase' }}>
              💱 Currency:
            </span>
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => setSelectedCurrency(c.code)}
                style={{
                  backgroundColor: selectedCurrency === c.code ? 'var(--accent, #d97706)' : 'transparent',
                  color: selectedCurrency === c.code ? '#ffffff' : 'var(--text-secondary, #cbd5e1)',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title={c.label}
              >
                {c.code}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={handleExportBOQCsv}
            style={{ color: 'var(--accent-hover, #f59e0b)', borderColor: 'var(--border-default, #2a374b)' }}
            title="Download Master BOQ Ledger with multi-currency rates in Excel CSV format"
          >
            📥 Export to Excel (CSV)
          </Button>

          <Button
            variant="outline"
            onClick={handlePrintBOQ}
            style={{ color: 'var(--text-secondary, #cbd5e1)', borderColor: 'var(--border-default, #2a374b)' }}
            title="Print or export formatted PDF"
          >
            🖨️ Print / PDF
          </Button>

          <Button
            id="btn-add-boq-line"
            variant="primary"
            onClick={() => setIsAddLineModalOpen(true)}
          >
            + Add Priced BOQ Line
          </Button>
        </div>
      </div>

      {/* Financial Measures Breakdown */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        <Card style={{ padding: '14px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase' }}>Baseline Budget</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)', margin: '4px 0' }}>
            {formatWithCurrency(financials?.baselineBudget || activeEstimate?.totalCost || (isDemo ? 985000 : 0))}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
            {selectedCurrency !== 'QAR' && (financials?.baselineBudget || activeEstimate?.totalCost || isDemo) && `Base: ${Number(financials?.baselineBudget || activeEstimate?.totalCost || (isDemo ? 985000 : 0)).toLocaleString()} QAR | `}
            Original authorised baseline
          </div>
        </Card>

        <Card style={{ padding: '14px', borderLeft: '4px solid #6366f1' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase' }}>Approved Changes</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#4338ca', margin: '4px 0' }}>
            {formatWithCurrency(financials?.approvedChanges || 0)}
          </div>
          <div style={{ fontSize: '11px', color: '#6366f1' }}>
            {selectedCurrency !== 'QAR' && `Base: ${Number(financials?.approvedChanges || 0).toLocaleString()} QAR | `}
            Net authorised variations
          </div>
        </Card>

        <Card style={{ padding: '14px', borderLeft: '4px solid #2563eb' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase' }}>Current Budget</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#60a5fa', margin: '4px 0' }}>
            {formatWithCurrency(financials?.currentBudget || financials?.approvedCostBudget || (isDemo ? 985000 : 0))}
          </div>
          <div style={{ fontSize: '11px', color: '#60a5fa' }}>
            {selectedCurrency !== 'QAR' && (financials?.currentBudget || financials?.approvedCostBudget || isDemo) && `Base: ${Number(financials?.currentBudget || financials?.approvedCostBudget || (isDemo ? 985000 : 0)).toLocaleString()} QAR | `}
            Baseline + Approved Changes
          </div>
        </Card>

        <Card style={{ padding: '14px', borderLeft: '4px solid #0891b2' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase' }}>Committed Cost</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0e7490', margin: '4px 0' }}>
            {formatWithCurrency(financials?.committedCost || 0)}
          </div>
          <div style={{ fontSize: '11px', color: '#0891b2' }}>
            {selectedCurrency !== 'QAR' && `Base: ${Number(financials?.committedCost || 0).toLocaleString()} QAR | `}
            POs & subcontracts placed
          </div>
        </Card>

        <Card style={{ padding: '14px', borderLeft: '4px solid #0d9488' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase' }}>Actual Cost</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f766e', margin: '4px 0' }}>
            {formatWithCurrency(financials?.actualCost || 0)}
          </div>
          <div style={{ fontSize: '11px', color: '#0d9488' }}>
            {selectedCurrency !== 'QAR' && `Base: ${Number(financials?.actualCost || 0).toLocaleString()} QAR | `}
            Incurred / posted costs
          </div>
        </Card>

        <Card style={{ padding: '14px', borderLeft: '4px solid #d97706' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase' }}>Forecast to Complete (ETC)</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#b45309', margin: '4px 0' }}>
            {formatWithCurrency(financials?.forecastToComplete ?? financials?.currentBudget ?? 0)}
          </div>
          <div style={{ fontSize: '11px', color: '#d97706' }}>
            {selectedCurrency !== 'QAR' && `Base: ${Number(financials?.forecastToComplete ?? financials?.currentBudget ?? 0).toLocaleString()} QAR | `}
            Expected remaining cost
          </div>
        </Card>

        <Card style={{ padding: '14px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase' }}>EAC (Estimate at Completion)</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#b45309', margin: '4px 0' }}>
            {formatWithCurrency(financials?.estimateAtCompletion ?? financials?.currentBudget ?? 0)}
          </div>
          <div style={{ fontSize: '11px', color: '#b45309' }}>
            {selectedCurrency !== 'QAR' && `Base: ${Number(financials?.estimateAtCompletion ?? financials?.currentBudget ?? 0).toLocaleString()} QAR | `}
            Actual + Forecast to Complete
          </div>
        </Card>

        <Card style={{ padding: '14px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase' }}>VAC (Variance at Completion)</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: Number(financials?.varianceAtCompletion || 0) >= 0 ? '#047857' : '#b91c1c', margin: '4px 0' }}>
            {formatWithCurrency(financials?.varianceAtCompletion || 0)}
          </div>
          <div style={{ fontSize: '11px', color: '#059669' }}>
            {selectedCurrency !== 'QAR' && `Base: ${Number(financials?.varianceAtCompletion || 0).toLocaleString()} QAR | `}
            Current Budget - EAC
          </div>
        </Card>

        <Card style={{ padding: '14px', borderLeft: '4px solid #ef4444', backgroundColor: '#fff5f5' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>Pending Exposure (Isolated)</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#ef4444', margin: '4px 0' }}>
            {formatWithCurrency(financials?.pendingExposureCost || 0)}
          </div>
          <div style={{ fontSize: '11px', color: '#f87171' }}>⚠️ Strictly isolated risk</div>
        </Card>
      </div>

      {/* BOQ Lines Table */}
      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
              Master Bill of Quantities (BOQ Lines)
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
              Internal costing view showing linked scope requirements and contractor buy-rates vs client sell-rates.
            </p>
          </div>
          <Badge variant="info">{lines.length} Priced Lines</Badge>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-2, #151e2e)', borderBottom: '2px solid var(--border-default, #2a374b)', color: 'var(--text-secondary, #cbd5e1)' }}>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Line Code</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Hierarchy (Section &gt; Discipline)</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Description</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Linked Scope</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Linked Design</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Qty</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Unit</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Supplier Cost ({activeCurrency.code})</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Sell Price ({activeCurrency.code})</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>Margin %</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l: any) => {
                const cost = Number(l.unitCost);
                const sell = Number(l.unitSell);
                const convCost = Math.round(cost * activeCurrency.rate);
                const convSell = Math.round(sell * activeCurrency.rate);
                const margin = sell > 0 ? (((sell - cost) / sell) * 100).toFixed(1) : '0.0';

                return (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--border-subtle, #1d2939)' }}>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>
                      {l.lineCode}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary, #cbd5e1)', backgroundColor: 'var(--surface-2, #151e2e)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        {l.section || (isDemo ? 'Main Stage' : 'General')} &gt; {l.discipline || (isDemo ? 'AV & Staging' : 'General')}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                      {l.description}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {l.linkedRequirementCode ? (
                        <Badge variant="success" size="sm">
                          {l.linkedRequirementCode}
                        </Badge>
                      ) : (
                        <span style={{ color: '#dc2626', fontSize: '11px', fontWeight: 700 }}>⚠️ Unlinked</span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600 }}>
                        {l.linkedDesignId || (isDemo ? 'DES-QND-001 (Rev B)' : '—')}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>{l.quantity}</td>
                    <td style={{ padding: '12px', textTransform: 'uppercase', color: 'var(--text-muted, #94a3b8)' }}>{l.uom}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--text-muted, #94a3b8)' }}>
                      {convCost.toLocaleString()}
                      {selectedCurrency !== 'QAR' && (
                        <span style={{ display: 'block', fontSize: '10px', color: '#94a3b8' }}>
                          ({cost.toLocaleString()} QAR)
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#10b981' }}>
                      {convSell.toLocaleString()}
                      {selectedCurrency !== 'QAR' && (
                        <span style={{ display: 'block', fontSize: '10px', color: '#059669' }}>
                          ({sell.toLocaleString()} QAR)
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <Badge variant={Number(margin) >= 25 ? 'success' : 'warning'} size="sm">
                        {margin}%
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', fontSize: '14px' }}>No BOQ lines found for this estimate</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>Click "+ Add Priced BOQ Line" to add line items connected to scope requirements.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add BOQ Line Modal */}
      <Modal
        isOpen={isAddLineModalOpen}
        onClose={() => setIsAddLineModalOpen(false)}
        title="Add Priced BOQ Line"
        size="md"
      >
        <form onSubmit={handleAddLine} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Line Code</label>
            <Input
              value={lineCode}
              onChange={(e) => setLineCode(e.target.value)}
              placeholder="e.g. BOQ-AV-004"
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Linked Scope Requirement Code *</label>
            <Input
              value={linkedReqCode}
              onChange={(e) => setLinkedReqCode(e.target.value)}
              placeholder="e.g. REQ-001"
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Line Description *</label>
            <Input
              value={lineDesc}
              onChange={(e) => setLineDesc(e.target.value)}
              placeholder="e.g. Substructure ballast concrete footings"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Quantity</label>
              <Input
                value={lineQuantity}
                onChange={(e) => setLineQuantity(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Unit of Measure (UOM)</label>
              <Input
                value={lineUom}
                onChange={(e) => setLineUom(e.target.value)}
                placeholder="e.g. lot, shift, sqm"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Contractor Buy Cost (QAR)</label>
              <Input
                type="number"
                value={lineCost}
                onChange={(e) => setLineCost(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Client Sell Price (QAR)</label>
              <Input
                type="number"
                value={lineSell}
                onChange={(e) => setLineSell(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={() => setIsAddLineModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmittingLine}>
              {isSubmittingLine ? 'Adding...' : 'Add Line'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
