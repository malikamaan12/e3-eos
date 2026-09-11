import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Badge, Button, Card, Modal, Input } from '../components/DesignSystem.js';

interface CommercialBOQViewProps {
  projectId: string;
}

export const CommercialBOQView: React.FC<CommercialBOQViewProps> = ({ projectId }) => {
  const { apiClient, refreshTrigger, triggerRefresh } = useEosContext();

  const [loading, setLoading] = useState<boolean>(true);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [selectedEstimateId, setSelectedEstimateId] = useState<string>('');
  const [lines, setLines] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any | null>(null);

  // Add line modal
  const [isAddLineModalOpen, setIsAddLineModalOpen] = useState<boolean>(false);
  const [lineCode, setLineCode] = useState<string>('');
  const [lineDesc, setLineDesc] = useState<string>('');
  const [lineQuantity, setLineQuantity] = useState<string>('1');
  const [lineUom, setLineUom] = useState<string>('lot');
  const [lineCost, setLineCost] = useState<string>('100000');
  const [lineSell, setLineSell] = useState<string>('145000');
  const [linkedReqCode, setLinkedReqCode] = useState<string>('REQ-QND-001');
  const [isSubmittingLine, setIsSubmittingLine] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [estList, finRes] = await Promise.all([
          apiClient.getEstimates(projectId).catch(() => []),
          fetch(`/api/v1/projects/${projectId}/financials`, {
            headers: {
              'x-organization-id': '11111111-1111-4111-8111-111111111111',
              'x-user-id': '10000000-0000-4000-8000-000000000004',
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
          'x-organization-id': '11111111-1111-4111-8111-111111111111',
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
      setLineDesc('');
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to add BOQ line');
    } finally {
      setIsSubmittingLine(false);
    }
  };

  if (loading && estimates.length === 0) {
    return <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Loading commercial estimates & BOQ ledger...</div>;
  }

  const activeEstimate = estimates.find((e) => e.id === selectedEstimateId) || estimates[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Commercial Baseline Top Banner */}
      <div
        style={{
          backgroundColor: '#0f172a',
          color: '#ffffff',
          borderRadius: '8px',
          padding: '20px 24px',
          border: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Commercial & BOQ Traceability Engine
            </span>
            <Badge variant="success">EAC Variance Control</Badge>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
            Every Priced Item Strictly Links to a Scope Requirement
          </div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            Zero orphan costing: Contractor buy-rate, target internal margin, and client sell-rate reconciled continuously.
          </div>
        </div>

        <Button
          id="btn-add-boq-line"
          variant="primary"
          onClick={() => setIsAddLineModalOpen(true)}
          style={{ backgroundColor: '#2563eb' }}
        >
          + Add Priced BOQ Line
        </Button>
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
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Baseline Budget</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
            {Number(financials?.baselineBudget || activeEstimate?.totalCost || 985000).toLocaleString()} QAR
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Original authorised baseline</div>
        </Card>

        <Card style={{ padding: '14px', borderLeft: '4px solid #6366f1' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Approved Changes</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#4338ca', margin: '4px 0' }}>
            {Number(financials?.approvedChanges || 0).toLocaleString()} QAR
          </div>
          <div style={{ fontSize: '11px', color: '#6366f1' }}>Net authorised variations</div>
        </Card>

        <Card style={{ padding: '14px', borderLeft: '4px solid #2563eb' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Current Budget</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#1d4ed8', margin: '4px 0' }}>
            {Number(financials?.currentBudget || financials?.approvedCostBudget || 985000).toLocaleString()} QAR
          </div>
          <div style={{ fontSize: '11px', color: '#1e40af' }}>Baseline + Approved Changes</div>
        </Card>

        <Card style={{ padding: '14px', borderLeft: '4px solid #0891b2' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Committed Cost</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0e7490', margin: '4px 0' }}>
            {Number(financials?.committedCost || 0).toLocaleString()} QAR
          </div>
          <div style={{ fontSize: '11px', color: '#0891b2' }}>POs & subcontracts placed</div>
        </Card>

        <Card style={{ padding: '14px', borderLeft: '4px solid #0d9488' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Actual Cost</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f766e', margin: '4px 0' }}>
            {Number(financials?.actualCost || 0).toLocaleString()} QAR
          </div>
          <div style={{ fontSize: '11px', color: '#0d9488' }}>Incurred / posted costs</div>
        </Card>

        <Card style={{ padding: '14px', borderLeft: '4px solid #d97706' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Forecast to Complete (ETC)</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#b45309', margin: '4px 0' }}>
            {Number(financials?.forecastToComplete || financials?.currentBudget || 985000).toLocaleString()} QAR
          </div>
          <div style={{ fontSize: '11px', color: '#d97706' }}>Expected remaining cost</div>
        </Card>

        <Card style={{ padding: '14px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>EAC (Estimate at Completion)</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#b45309', margin: '4px 0' }}>
            {Number(financials?.estimateAtCompletion || 985000).toLocaleString()} QAR
          </div>
          <div style={{ fontSize: '11px', color: '#b45309' }}>Actual + Forecast to Complete</div>
        </Card>

        <Card style={{ padding: '14px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>VAC (Variance at Completion)</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: Number(financials?.varianceAtCompletion || 0) >= 0 ? '#047857' : '#b91c1c', margin: '4px 0' }}>
            {Number(financials?.varianceAtCompletion || 0).toLocaleString()} QAR
          </div>
          <div style={{ fontSize: '11px', color: '#059669' }}>Current Budget - EAC</div>
        </Card>

        <Card style={{ padding: '14px', borderLeft: '4px solid #ef4444', backgroundColor: '#fff5f5' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase' }}>Pending Exposure (Isolated)</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#b91c1c', margin: '4px 0' }}>
            {Number(financials?.pendingExposureCost || 0).toLocaleString()} QAR
          </div>
          <div style={{ fontSize: '11px', color: '#991b1b' }}>⚠️ Strictly isolated risk</div>
        </Card>
      </div>

      {/* BOQ Lines Table */}
      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              Master Bill of Quantities (BOQ Lines)
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              Internal costing view showing linked scope requirements and contractor buy-rates vs client sell-rates.
            </p>
          </div>
          <Badge variant="info">{lines.length} Priced Lines</Badge>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Line Code</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Hierarchy (Section &gt; Discipline)</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Description</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Linked Scope</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Linked Design</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Qty</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Unit</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Supplier Cost (QAR)</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Sell Price (QAR)</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>Margin %</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l: any) => {
                const cost = Number(l.unitCost);
                const sell = Number(l.unitSell);
                const margin = sell > 0 ? (((sell - cost) / sell) * 100).toFixed(1) : '0.0';

                return (
                  <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>
                      {l.lineCode}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontSize: '11px', color: '#475569', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        {l.section || 'Main Stage'} &gt; {l.discipline || 'AV & Staging'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 600, color: '#0f172a' }}>
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
                        {l.linkedDesignId || 'DES-QND-001 (Rev B)'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>{l.quantity}</td>
                    <td style={{ padding: '12px', textTransform: 'uppercase', color: '#64748b' }}>{l.uom}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', color: '#64748b' }}>
                      {cost.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#10b981' }}>
                      {sell.toLocaleString()}
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
                  <td colSpan={10} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
                    <div style={{ fontWeight: 700, color: '#334155', fontSize: '14px' }}>No BOQ lines found for this estimate</div>
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
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Line Code</label>
            <Input
              value={lineCode}
              onChange={(e) => setLineCode(e.target.value)}
              placeholder="e.g. BOQ-AV-004"
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Linked Scope Requirement Code *</label>
            <Input
              value={linkedReqCode}
              onChange={(e) => setLinkedReqCode(e.target.value)}
              placeholder="e.g. REQ-QND-001"
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Line Description *</label>
            <Input
              value={lineDesc}
              onChange={(e) => setLineDesc(e.target.value)}
              placeholder="e.g. Substructure ballast concrete footings"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Quantity</label>
              <Input
                value={lineQuantity}
                onChange={(e) => setLineQuantity(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Unit of Measure (UOM)</label>
              <Input
                value={lineUom}
                onChange={(e) => setLineUom(e.target.value)}
                placeholder="e.g. lot, shift, sqm"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Contractor Buy Cost (QAR)</label>
              <Input
                type="number"
                value={lineCost}
                onChange={(e) => setLineCost(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Client Sell Price (QAR)</label>
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
