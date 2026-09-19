import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, MetricCard, Badge, Button, Modal, Input, Textarea, Select } from '../components/DesignSystem.js';
import { isSyntheticDemo } from '../services/api-client.js';

export const BumpOutCloseoutView: React.FC = () => {
  const { currentLanguage, apiClient, selectedProjectId, currentUser, currentProject } = useEosContext();
  const isDemo = isSyntheticDemo(selectedProjectId);
  const projectId = selectedProjectId || (isDemo ? 'PRJ-QND-2026' : '');

  const [activeTab, setActiveTab] = useState<'bumpout' | 'returns' | 'claims' | 'venue' | 'closure'>('bumpout');
  const [loading, setLoading] = useState<boolean>(true);

  // Bump-Out & Returns State
  const [bumpOutActivities, setBumpOutActivities] = useState<any[]>([]);
  const [assetReturns, setAssetReturns] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [venueHandover, setVenueHandover] = useState<any>(null);
  const [operationalClosure, setOperationalClosure] = useState<any>(null);

  // Return Inspection Modal (AT-064)
  const [isReturnModalOpen, setIsReturnModalOpen] = useState<boolean>(false);
  const [returnAssetId, setReturnAssetId] = useState<string>('');
  const [returnCondition, setReturnCondition] = useState<string>('pristine');
  const [repairEstimate, setRepairEstimate] = useState<number>(0);
  const [responsibility, setResponsibility] = useState<string>('venue');
  const [inspectionNotes, setInspectionNotes] = useState<string>('');

  // Operational Closure 7-Pillars Checklist (AT-065)
  const [checklist, setChecklist] = useState({
    eventOperationComplete: false,
    bumpOutComplete: false,
    venueHandoverComplete: false,
    assetsReturned: false,
    majorClaimsIdentified: false,
    criticalIncidentsClosed: false,
    siteEvidenceComplete: false,
  });
  const [openReceivablesAck, setOpenReceivablesAck] = useState<boolean>(false);
  const [isSubmittingClosure, setIsSubmittingClosure] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bmp, ret, clm, vh, opc] = await Promise.all([
        apiClient.getBumpOutActivities(projectId),
        apiClient.getAssetReturns(projectId),
        apiClient.getClaimsExposures(projectId),
        apiClient.getVenueHandover(projectId),
        apiClient.getOperationalClosure(projectId),
      ]);
      setBumpOutActivities(bmp);
      setAssetReturns(ret);
      setClaims(clm);
      setVenueHandover(vh);
      setOperationalClosure(opc);

      const isBmpDone = bmp && bmp.length > 0 && bmp.every((b: any) => b.status === 'completed');
      const isVhDone = !!vh && (vh.status === 'completed' || vh.status === 'signed');
      const isRetDone = ret && ret.length > 0 && ret.every((a: any) => a.status === 'returned' || a.status === 'inspected');
      const isClaimsDone = clm && clm.length > 0;
      const isOpcDone = !!opc && (opc.status === 'closed' || !!opc.decision);

      setChecklist({
        eventOperationComplete: isOpcDone,
        bumpOutComplete: isBmpDone,
        venueHandoverComplete: isVhDone,
        assetsReturned: isRetDone,
        majorClaimsIdentified: isClaimsDone,
        criticalIncidentsClosed: isOpcDone,
        siteEvidenceComplete: isOpcDone,
      });
      setOpenReceivablesAck(isOpcDone);
    } catch (err) {
      console.error('Failed to load closeout data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleInspectReturn = async () => {
    if (!returnAssetId) return;
    try {
      await apiClient.inspectAssetReturn({
        projectId,
        assetId: returnAssetId,
        manifestId: 'MNF-OUT-2026-044',
        quantity: 1,
        returnCondition: returnCondition as any,
        damageDescription: returnCondition !== 'pristine' ? inspectionNotes : undefined,
        claimPotential: returnCondition === 'damaged',
        claimValueEstimate: String(repairEstimate),
        inspector: currentUser?.name ? `${currentUser.name} (Warehouse Inspector)` : 'Warehouse Inspector',
      });
      setIsReturnModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Inspection failed');
    }
  };

  const handleAuthorizeClosure = async () => {
    setIsSubmittingClosure(true);
    try {
      const clientDisplayName = currentProject?.clientName || (isDemo ? 'Qatar Tourism' : 'the client');
      const res = await apiClient.decideOperationalClosure({
        projectId,
        closureConfirmed: true,
        authorizedBy: currentUser?.name ? `${currentUser.name} (Operations Director)` : 'E3 Event Operations Director',
        justification: `All 7 operational pillars verified. Venue reinstatement accepted by ${clientDisplayName}. Retention receivables tracked separately.`,
        dimensionsChecked: checklist,
        openReceivablesAcknowledged: openReceivablesAck,
      });
      setOperationalClosure(res);
      alert('Operational Closure Authorized Successfully with Cryptographic Audit Seal!');
    } catch (err: any) {
      alert(err.message || 'Closure authorization failed');
    } finally {
      setIsSubmittingClosure(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
              🏁 {currentLanguage === 'ar' ? 'إجراءات التفكيك، تسليم الموقع والإغلاق التشغيلي' : 'Bump-Out, Returns, Venue Handover & Operational Closeout'}
            </h1>
            <Badge variant="neutral">DECOUPLED CLOSURE MODEL</Badge>
          </div>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
            Multi-dimensional closeout: Event delivery, de-rig, asset reconciliation, and venue handover decoupled from financial retention (AT-064, AT-065).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            variant={activeTab === 'bumpout' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('bumpout')}
            id="tab-bumpout"
          >
            Bump-Out Schedule
          </Button>
          <Button
            variant={activeTab === 'returns' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('returns')}
            id="tab-returns"
          >
            Asset Returns (AT-064)
          </Button>
          <Button
            variant={activeTab === 'claims' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('claims')}
            id="tab-claims"
          >
            Claims & Exposures
          </Button>
          <Button
            variant={activeTab === 'venue' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('venue')}
            id="tab-venue"
          >
            Venue Handover
          </Button>
          <Button
            variant={activeTab === 'closure' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('closure')}
            id="tab-closure"
          >
            7-Pillar Closure (AT-065)
          </Button>
        </div>
      </div>

      {/* Decoupling Disclosure Banner */}
      <div
        style={{
          padding: '14px 18px',
          borderRadius: '8px',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
        id="banner-decoupled-closure"
      >
        <span style={{ fontSize: '24px' }}>ℹ️</span>
        <div style={{ fontSize: '12px', color: '#1e40af' }}>
          <strong>INVARIANT AT-065 (DECOUPLED CLOSEOUT):</strong> Operational closure confirms that physical event delivery,
          dismantling, venue handover, and asset returns are complete. Commercial retention and client receivables remain
          tracked separately in the commercial ledger until financial settlement.
        </div>
      </div>

      {/* Tab 1: Bump-Out Schedule */}
      {activeTab === 'bumpout' && (
        <Card title="Bump-Out Activities & De-Rig Safety">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '12px' }}>Zone</th>
                  <th style={{ padding: '12px' }}>Activity & Work Package</th>
                  <th style={{ padding: '12px' }}>Planned Completion</th>
                  <th style={{ padding: '12px' }}>Hazard Identification</th>
                  <th style={{ padding: '12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {bumpOutActivities.map((b: any) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', fontWeight: 600 }}>{b.zoneName}</td>
                    <td style={{ padding: '12px' }}>{b.activityType}</td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#64748b' }}>
                      {new Date(b.plannedCompletion).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#b45309' }}>
                      ⚠️ {b.hazardsIdentified}
                    </td>
                    <td style={{ padding: '12px' }}><Badge variant="neutral">{b.status.toUpperCase()}</Badge></td>
                  </tr>
                ))}
                {bumpOutActivities.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                      No bump-out activities scheduled for this project.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 2: Asset Returns Inspection (AT-064) */}
      {activeTab === 'returns' && (
        <Card title="Asset Return Inspections & Condition Assessment (AT-064)">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
            <Button variant="primary" onClick={() => setIsReturnModalOpen(true)} id="btn-inspect-return">
              + Inspect Returned Asset
            </Button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '12px' }}>Asset ID & Description</th>
                  <th style={{ padding: '12px' }}>Manifest Reference</th>
                  <th style={{ padding: '12px' }}>Condition Received</th>
                  <th style={{ padding: '12px' }}>Repair Cost Est.</th>
                  <th style={{ padding: '12px' }}>Responsibility</th>
                  <th style={{ padding: '12px' }}>Inspector & Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {assetReturns.map((a: any) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 600 }}>{a.assetName || a.assetId}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Tag: {a.assetId}</div>
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>{a.manifestId}</td>
                    <td style={{ padding: '12px' }}>
                      <Badge
                        variant={
                          a.conditionReceived === 'pristine' || a.returnCondition === 'good'
                            ? 'success'
                            : 'warning'
                        }
                      >
                        {(a.conditionReceived || a.returnCondition).toUpperCase()}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 600 }}>
                      {a.repairCostEstimate ? `${a.repairCostEstimate.toLocaleString()} QAR` : '0 QAR'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Badge variant="neutral">{a.responsibility || 'Venue'}</Badge>
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#64748b' }}>
                      {a.inspectedBy || a.inspector} ({new Date(a.inspectedAt || Date.now()).toLocaleDateString()})
                    </td>
                  </tr>
                ))}
                {assetReturns.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                      No asset return inspections recorded for this project.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3: Claims & Exposures */}
      {activeTab === 'claims' && (
        <Card title="Claims Exposure Register">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '12px' }}>Claim Type</th>
                  <th style={{ padding: '12px' }}>Description & Scope</th>
                  <th style={{ padding: '12px' }}>Claimed Amount</th>
                  <th style={{ padding: '12px' }}>Assessed Exposure</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px' }}>Settlement Notes</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((c: any) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', fontWeight: 600 }}>{c.claimType}</td>
                    <td style={{ padding: '12px' }}>{c.description}</td>
                    <td style={{ padding: '12px', fontWeight: 600 }}>{c.claimedAmount.toLocaleString()} QAR</td>
                    <td style={{ padding: '12px', color: '#dc2626', fontWeight: 700 }}>
                      {c.assessedExposure.toLocaleString()} QAR
                    </td>
                    <td style={{ padding: '12px' }}><Badge variant="warning">{c.status.toUpperCase()}</Badge></td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#64748b' }}>{c.settlementNotes}</td>
                  </tr>
                ))}
                {claims.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                      No claims or loss exposures registered for this project.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 4: Venue Handover */}
      {activeTab === 'venue' && (
        <Card title="Venue Reinstatement & Handover Sign-Off">
          {!venueHandover && !isDemo ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
              Venue reinstatement inspection has not been recorded yet for this project.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '13px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>Delivery Completed: <Badge variant="success">CONFIRMED</Badge></div>
                <div>Venue Reinstatement: <Badge variant="warning">{venueHandover?.venueReinstatementStatus?.toUpperCase() || 'INSPECTED'}</Badge></div>
                <div>Keys Returned to Venue Authority: <strong>{venueHandover?.keysReturned ? 'YES' : 'NO'}</strong></div>
                <div>Deposit Status: <Badge variant="neutral">{venueHandover?.depositStatus?.toUpperCase() || 'HELD'}</Badge></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>Venue Rep: <strong>{venueHandover?.clientRepresentativeName || (isDemo ? 'Jassim Al-Sulaiti (Venue Authority)' : '—')}</strong></div>
                <div>Sign-off Authority: <strong>{venueHandover?.signoffBy || (isDemo ? 'Operations Director E3' : '—')}</strong></div>
                <div>Cryptographic Seal: <code style={{ fontSize: '11px', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{venueHandover?.auditHash || (isDemo ? 'audit-seal-vh-99824' : '—')}</code></div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Tab 5: 7-Pillar Operational Closure (AT-065) */}
      {activeTab === 'closure' && (
        <Card title="Operational Closure 7-Pillars Decision Gate (AT-065)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
              {[
                { key: 'eventOperationComplete', label: '1. Event Delivery & Showtime Concluded' },
                { key: 'bumpOutComplete', label: '2. Bump-Out & De-Rig Signed Off' },
                { key: 'venueHandoverComplete', label: '3. Venue Handover & Reinstatement Cleared' },
                { key: 'assetsReturned', label: '4. Physical Assets Reconciled & Inspected' },
                { key: 'majorClaimsIdentified', label: '5. Claims & Liabilities Recorded' },
                { key: 'criticalIncidentsClosed', label: '6. All Critical HSE Incidents Closed' },
                { key: 'siteEvidenceComplete', label: '7. Immutable Daily Site Reports Complete' },
              ].map((pillar) => (
                <label
                  key={pillar.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={(checklist as any)[pillar.key]}
                    onChange={(e) => setChecklist({ ...checklist, [pillar.key]: e.target.checked })}
                    id={`chk-pillar-${pillar.key}`}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{pillar.label}</span>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
              <input
                type="checkbox"
                id="chk-open-receivables"
                checked={openReceivablesAck}
                onChange={(e) => setOpenReceivablesAck(e.target.checked)}
              />
              <label htmlFor="chk-open-receivables" style={{ fontSize: '13px', fontWeight: 600 }}>
                Acknowledge commercial retention and open receivables remain tracked until financial review
              </label>
            </div>

            {operationalClosure && (
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', padding: '14px', borderRadius: '6px' }}>
                <h4 style={{ margin: '0 0 6px 0', color: '#166534' }}>✓ Operational Closure Executed & Sealed</h4>
                <div style={{ fontSize: '12px', color: '#15803d' }}>
                  Decision: <strong>{operationalClosure.decision.toUpperCase()}</strong> | Signoff: <strong>{operationalClosure.signoffBy}</strong>
                </div>
                <div style={{ fontSize: '11px', color: '#166534', marginTop: '4px' }}>
                  Audit Seal: <code>{operationalClosure.auditHash}</code>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button
                variant="primary"
                size="lg"
                onClick={handleAuthorizeClosure}
                disabled={isSubmittingClosure || !!operationalClosure || Object.values(checklist).some((v) => !v) || !openReceivablesAck}
                id="btn-authorize-operational-closure"
              >
                {operationalClosure ? 'Operational Closure Sealed' : isSubmittingClosure ? 'Sealing...' : 'Authorize Operational Closure'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Return Inspection Modal (AT-064) */}
      {isReturnModalOpen && (
        <Modal
          isOpen={isReturnModalOpen}
          onClose={() => setIsReturnModalOpen(false)}
          title="Asset Return Condition Inspection (AT-064)"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Asset ID</label>
              <Input
                value={returnAssetId}
                onChange={(e) => setReturnAssetId(e.target.value)}
                placeholder="e.g. AST-AUDIO-DIGICO-SD7"
                id="input-return-asset-id"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Condition Categorization</label>
              <Select
                value={returnCondition}
                onChange={(e) => setReturnCondition(e.target.value)}
                options={[
                  { value: 'pristine', label: 'Pristine / Good Condition' },
                  { value: 'operational_wear', label: 'Operational Wear & Tear' },
                  { value: 'damaged', label: 'Damaged (Requires Repair / Claim)' },
                  { value: 'missing', label: 'Missing / Not Returned' },
                ]}
                id="select-return-condition"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Repair Cost Estimate (QAR)</label>
              <Input
                type="number"
                value={String(repairEstimate)}
                onChange={(e) => setRepairEstimate(Number(e.target.value))}
                id="input-repair-estimate"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Liability / Responsibility</label>
              <Select
                value={responsibility}
                onChange={(e) => setResponsibility(e.target.value)}
                options={[
                  { value: 'venue', label: 'Venue Responsibility' },
                  { value: 'client', label: 'Client / Guest Damage' },
                  { value: 'contractor', label: 'Subcontractor Liability' },
                  { value: 'vendor', label: 'Vendor Equipment Failure' },
                ]}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Inspection Notes</label>
              <Textarea
                value={inspectionNotes}
                onChange={(e) => setInspectionNotes(e.target.value)}
                placeholder="Enter inspection notes, physical damage or return condition..."
                rows={2}
                id="input-inspection-notes"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="outline" onClick={() => setIsReturnModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleInspectReturn} id="btn-confirm-return-inspection">
                Record Inspection
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
