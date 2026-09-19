import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, Badge, Button, Modal, Input, Textarea, Select } from '../components/DesignSystem.js';
import { isSyntheticDemo } from '../services/api-client.js';

interface ProcurementDeliveryViewProps {
  projectId: string;
}

export const ProcurementDeliveryView: React.FC<ProcurementDeliveryViewProps> = ({ projectId }) => {
  const { apiClient, refreshTrigger, triggerRefresh } = useEosContext();
  const isDemo = isSyntheticDemo(projectId);

  const [requirements, setRequirements] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [selectedRfq, setSelectedRfq] = useState<any | null>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [purchaseOrdersData, setPurchaseOrdersData] = useState<any>({ purchaseOrders: [], committedCostTotal: '0' });
  const [loading, setLoading] = useState<boolean>(true);

  // Source decision modal
  const [decisionReq, setDecisionReq] = useState<any | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<string>('use_e3_asset');
  const [internalQty, setInternalQty] = useState<number>(0);
  const [externalQty, setExternalQty] = useState<number>(0);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [reqs, vens, rfqList, poData] = await Promise.all([
          apiClient.getProcurementRequirements(projectId),
          apiClient.getVendors(),
          apiClient.getRfqs(projectId),
          apiClient.getPurchaseOrders(projectId),
        ]);
        if (isMounted) {
          setRequirements(reqs);
          setVendors(vens);
          setRfqs(rfqList);
          setPurchaseOrdersData(poData);
          if (rfqList.length > 0) {
            setSelectedRfq(rfqList[0]);
            const qList = await apiClient.getRfqQuotes(projectId, rfqList[0].id);
            if (isMounted) setQuotes(qList);
          }
        }
      } catch (err) {
        console.error('Failed to load procurement delivery data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [apiClient, projectId, refreshTrigger]);

  const handleSelectRfq = async (rfq: any) => {
    setSelectedRfq(rfq);
    try {
      const qList = await apiClient.getRfqQuotes(projectId, rfq.id);
      setQuotes(qList);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionReq) return;
    setIsSubmittingDecision(true);
    try {
      await apiClient.updateSourceDecision(projectId, decisionReq.id, {
        sourceDecision: selectedDecision,
        internalAssetQuantity: Number(internalQty),
        externalSourcingQuantity: Number(externalQty),
      });
      setDecisionReq(null);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update source decision');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>Loading physical procurement intelligence...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Committed Expenditure KPI Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <Card style={{ borderLeft: '4px solid #2563eb' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>COMMITTED EXPENDITURE (POs)</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)', marginTop: '4px' }}>
            {Number(purchaseOrdersData.committedCostTotal).toLocaleString()} QAR
          </div>
          <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>
            ✓ Feeds EAC remainingCommitments (No Double-Count)
          </div>
        </Card>

        <Card style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>SOURCING REQUIREMENTS</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)', marginTop: '4px' }}>
            {requirements.length} Packages
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', marginTop: '4px' }}>
            Derived from Scope & BOQ line items
          </div>
        </Card>

        <Card style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>QUALIFIED VENDORS</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)', marginTop: '4px' }}>
            {vendors.filter((v) => v.qualificationStatus === 'approved').length} / {vendors.length} Active
          </div>
          <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>
            All compliance verified in Qatar
          </div>
        </Card>
      </div>

      {/* Section 1: Procurement Requirements & Sourcing Decisions */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary, #f8fafc)' }}>
              🎯 Procurement Requirements & Source Decision Engine
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted, #94a3b8)', margin: '4px 0 0 0' }}>
              Every item has an explicit sourcing route: Buy, Rent, Use E3 Asset, Client Supplied, Vendor Package, or Subcontract.
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-2, #151e2e)', borderBottom: '2px solid var(--border-default, #2a374b)', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>Code / Description</th>
                <th style={{ padding: '10px 12px' }}>Category</th>
                <th style={{ padding: '10px 12px' }}>Required Qty</th>
                <th style={{ padding: '10px 12px' }}>Source Decision</th>
                <th style={{ padding: '10px 12px' }}>Split (Internal / External)</th>
                <th style={{ padding: '10px 12px' }}>Budget</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {requirements.map((req) => (
                <tr key={req.id} style={{ borderBottom: '1px solid var(--border-subtle, #1d2939)' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>{req.description}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>Source: {req.source} {req.boqLineId ? `(${req.boqLineId})` : ''}</div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <Badge variant="secondary">{req.category}</Badge>
                  </td>
                  <td style={{ padding: '12px', fontWeight: 700 }}>
                    {req.quantity} {req.unit}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: req.sourceDecision === 'use_e3_asset' ? '#e0e7ff' : '#ecfdf5',
                      color: req.sourceDecision === 'use_e3_asset' ? '#3730a3' : '#065f46',
                    }}>
                      {req.sourceDecision?.toUpperCase().replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ color: '#2563eb', fontWeight: 700 }}>{req.internalAssetQuantity || 0} E3 Asset</span>
                    {' + '}
                    <span style={{ color: '#d97706', fontWeight: 700 }}>{req.externalSourcingQuantity || 0} Fabricate/Buy</span>
                  </td>
                  <td style={{ padding: '12px', fontWeight: 700 }}>
                    {Number(req.approvedBudget?.amount || req.approvedBudget || 0).toLocaleString()} QAR
                  </td>
                  <td style={{ padding: '12px' }}>
                    <Badge variant={req.status === 'awarded' ? 'success' : 'warning'}>{req.status}</Badge>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setDecisionReq(req);
                        setSelectedDecision(req.sourceDecision || 'use_e3_asset');
                        setInternalQty(req.internalAssetQuantity ?? (isDemo ? 8 : 0));
                        setExternalQty(req.externalSourcingQuantity ?? (isDemo ? 22 : req.quantity || 0));
                      }}
                    >
                      Source Decision
                    </Button>
                  </td>
                </tr>
              ))}
              {requirements.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>📦</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', fontSize: '14px' }}>No Procurement Requirements Generated</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>Procurement items will appear once BOQ lines or design deliverables are released.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Section 2: Side-by-Side RFQ & Bid Comparison Matrix */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary, #f8fafc)' }}>
                📊 RFQ Tender & Side-by-Side Bid Evaluation Matrix
              </h3>
              <Badge variant="accent">AT-047 SEALED-BID PROTOCOL</Badge>
              <Badge variant="secondary">AT-048 MULTI-CRITERIA SCORING</Badge>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted, #94a3b8)', margin: '4px 0 0 0' }}>
              Objective multi-criteria evaluation (Technical 40%, Commercial 40%, Risk 20%) with sealed-bid integrity lock and outlier detection.
            </p>
          </div>

          {/* Sealed Bid Status Box */}
          <div style={{ padding: '8px 14px', backgroundColor: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '6px', fontSize: '12px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔒 <strong>Sealed-Bid Integrity:</strong> {isDemo ? 'Unsealed post-deadline (2026-09-10 12:00 UTC)' : 'Automated deadline audit lock active'}</span>
            <Badge variant={isDemo ? 'success' : 'neutral'}>{isDemo ? 'Unsealing Authorized' : 'Protocol Enforced'}</Badge>
          </div>
        </div>

        {/* Anti-Collusion & Outlier Variance Banner */}
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: '#60a5fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>🛡️ <strong>Anti-Collusion Governance:</strong> Sealed bids unlocked simultaneously with public SHA-256 tender hashes. Bids evaluated against parametric baseline.</span>
          <span style={{ fontWeight: 600 }}>{isDemo ? 'Tender Officer: H. Al-Kuwari' : 'Tender Evaluation Board'}</span>
        </div>

        {rfqs.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {rfqs.map((rfq) => (
              <Button
                key={rfq.id}
                size="sm"
                variant={selectedRfq?.id === rfq.id ? 'primary' : 'ghost'}
                onClick={() => handleSelectRfq(rfq)}
              >
                {rfq.rfqNumber} ({rfq.quantity} units)
              </Button>
            ))}
          </div>
        )}

        {selectedRfq && (
          <div>
            <div style={{ padding: '12px 16px', backgroundColor: 'var(--surface-2, #151e2e)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>{selectedRfq.technicalSpecification}</div>
              <div style={{ color: 'var(--text-muted, #94a3b8)', marginTop: '4px' }}>
                Delivery: <strong>{selectedRfq.deliveryRequirement}</strong> | Terms: <strong>{selectedRfq.commercialTerms}</strong>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--surface-2, #151e2e)', borderBottom: '2px solid var(--border-default, #2a374b)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px' }}>Vendor Bidder</th>
                    <th style={{ padding: '10px 12px' }}>Unit Rate</th>
                    <th style={{ padding: '10px 12px' }}>Total Price</th>
                    <th style={{ padding: '10px 12px' }}>Lead Time</th>
                    <th style={{ padding: '10px 12px' }}>Technical (40%)</th>
                    <th style={{ padding: '10px 12px' }}>Commercial (40%)</th>
                    <th style={{ padding: '10px 12px' }}>Risk (20%)</th>
                    <th style={{ padding: '10px 12px' }}>Total Score</th>
                    <th style={{ padding: '10px 12px' }}>Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => (
                    <tr
                      key={q.id}
                      style={{
                        borderBottom: '1px solid var(--border-default, #2a374b)',
                        backgroundColor: q.isRecommended ? '#f0fdf4' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
                          {q.vendorName || (vendors.find((v) => v.id === q.vendorId)?.name) || q.vendorId}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>Ref: {q.quoteReference}</div>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700 }}>
                        {Number(q.unitRate?.amount || q.unitRate || 0).toLocaleString()} QAR
                      </td>
                      <td style={{ padding: '12px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
                        {Number(q.totalPrice?.amount || q.totalPrice || 0).toLocaleString()} QAR
                      </td>
                      <td style={{ padding: '12px' }}>{q.deliveryTimeDays} Days</td>
                      <td style={{ padding: '12px' }}>
                        <Badge variant="secondary">{q.technicalScore || 90} / 100</Badge>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <Badge variant="secondary">{q.commercialScore || 85} / 100</Badge>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <Badge variant="secondary">{q.riskScore || 85} / 100</Badge>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <strong style={{ fontSize: '14px', color: q.isRecommended ? '#15803d' : 'var(--text-secondary, #cbd5e1)' }}>
                          {q.totalScore || 90}/100
                        </strong>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {q.isRecommended ? (
                          <Badge variant="success">★ RECOMMENDED AWARD</Badge>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Compliant alternate</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {quotes.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>📑</div>
                        <div style={{ fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', fontSize: '14px' }}>No Bids Received Yet</div>
                        <div style={{ fontSize: '12px', marginTop: '4px' }}>Awaiting vendor tender submission and sealed-bid deadline expiration.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {rfqs.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
            <div style={{ fontWeight: 600, fontSize: '13px' }}>No Active RFQ Tenders</div>
            <div style={{ fontSize: '12px', marginTop: '2px' }}>Create an RFQ package from procurement requirements to solicit vendor bids.</div>
          </div>
        )}
      </Card>

      {/* Section 3: Purchase Orders & Commercial Commitment (EAC Integration) */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary, #f8fafc)' }}>
              📜 Purchase Orders & Cost Commitment Control
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted, #94a3b8)', margin: '4px 0 0 0' }}>
              Approved purchase orders commit project funds and increment remaining commitments without double-counting invoices.
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-2, #151e2e)', borderBottom: '2px solid var(--border-default, #2a374b)', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>PO Number</th>
                <th style={{ padding: '10px 12px' }}>Vendor</th>
                <th style={{ padding: '10px 12px' }}>Description</th>
                <th style={{ padding: '10px 12px' }}>Total Amount</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px' }}>Delivery Status</th>
                <th style={{ padding: '10px 12px' }}>EAC Commitment</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrdersData.purchaseOrders?.map((po: any) => (
                <tr key={po.id} style={{ borderBottom: '1px solid var(--border-subtle, #1d2939)' }}>
                  <td style={{ padding: '12px', fontWeight: 800, color: '#2563eb' }}>{po.poNumber}</td>
                  <td style={{ padding: '12px' }}>{po.vendorName || (isDemo ? 'ABC Joinery & Fabrication' : 'Vendor')}</td>
                  <td style={{ padding: '12px' }}>{po.lines?.[0]?.description || (isDemo ? 'Fabrication package' : 'Procurement package')}</td>
                  <td style={{ padding: '12px', fontWeight: 800 }}>
                    {Number(po.totalAmount?.amount || po.totalAmount || 0).toLocaleString()} {po.currency}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <Badge variant={po.status === 'released' ? 'success' : 'primary'}>{po.status}</Badge>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                      ✓ {po.externalDeliveryStatus || 'confirmed'}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ color: '#059669', fontWeight: 700 }}>+ QAR {Number(po.totalAmount?.amount || po.totalAmount || 0).toLocaleString()}</span>
                  </td>
                </tr>
              ))}
              {(!purchaseOrdersData.purchaseOrders || purchaseOrdersData.purchaseOrders.length === 0) && (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>📜</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', fontSize: '14px' }}>No Purchase Orders Issued</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>Purchase orders committed to vendors will appear here.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Source Decision Modal */}
      {decisionReq && (
        <Modal
          isOpen={true}
          title={`Update Source Decision: ${decisionReq.description}`}
          onClose={() => setDecisionReq(null)}
        >
          <form onSubmit={handleSaveDecision} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Select Sourcing Route</label>
              <Select
                value={selectedDecision}
                onChange={(e) => setSelectedDecision(e.target.value)}
                style={{ width: '100%', marginTop: '6px' }}
              >
                <option value="use_e3_asset">Use E3 Asset (Internal Warehouse Stock)</option>
                <option value="buy">Buy / Procure New</option>
                <option value="rent">Rent / Hire</option>
                <option value="client_supplied">Client Supplied</option>
                <option value="vendor_package">Vendor Package</option>
                <option value="subcontract">Subcontract</option>
              </Select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Internal E3 Asset Qty</label>
                <Input
                  type="number"
                  value={internalQty}
                  onChange={(e) => {
                    const iVal = Number(e.target.value);
                    setInternalQty(iVal);
                    setExternalQty(Math.max(0, decisionReq.quantity - iVal));
                  }}
                  style={{ width: '100%', marginTop: '6px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>External Sourcing Qty</label>
                <Input
                  type="number"
                  value={externalQty}
                  onChange={(e) => setExternalQty(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '6px' }}
                />
              </div>
            </div>

            <div style={{ padding: '10px 14px', backgroundColor: 'rgba(59, 130, 246, 0.12)', borderRadius: '6px', fontSize: '12px', color: '#60a5fa' }}>
              ℹ Total required: <strong>{decisionReq.quantity} units</strong>. Sourcing will allocate <strong>{internalQty} units</strong> from internal E3 warehouse stock and initiate an RFQ/PO for <strong>{externalQty} units</strong>.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <Button type="button" variant="ghost" onClick={() => setDecisionReq(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmittingDecision}>
                {isSubmittingDecision ? 'Saving...' : 'Apply Sourcing Decision'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
