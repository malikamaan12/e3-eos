import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, MetricCard, Badge, Button, Modal, Input, Textarea, Select } from '../components/DesignSystem.js';
import { isSyntheticDemo } from '../services/api-client.js';

export const ComplianceRegisterView: React.FC = () => {
  const { currentLanguage, apiClient, selectedProjectId } = useEosContext();
  const isDemo = isSyntheticDemo(selectedProjectId);
  const projectId = selectedProjectId || (isDemo ? 'PRJ-QND-2026' : '');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedObligation, setSelectedObligation] = useState<any>(null);

  // Alternative Physical Verification Modal (AT-060)
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState<boolean>(false);
  const [inspectorName, setInspectorName] = useState<string>(() => (isDemo ? 'Eng. Tareq Mansoor' : ''));
  const [badgeId, setBadgeId] = useState<string>(() => (isDemo ? 'MMUP-ENG-8472' : ''));
  const [siteOfficeRef, setSiteOfficeRef] = useState<string>(() => (isDemo ? 'DOHA-MUNI-ONST-2026/04' : ''));
  const [stampSighted, setStampSighted] = useState<boolean>(isDemo);
  const [verificationNotes, setVerificationNotes] = useState<string>(() => (isDemo ? 'Physical wet stamp sighted on A0 structural drawings in site trailer.' : ''));
  const [isSubmittingVerify, setIsSubmittingVerify] = useState<boolean>(false);

  // Detail Drawer / Modal
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  const loadCompliance = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getComplianceObligations(projectId);
      setData(res);
    } catch (err) {
      console.error('Failed to load compliance obligations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const demo = isSyntheticDemo(projectId);
    setInspectorName(demo ? 'Eng. Tareq Mansoor' : '');
    setBadgeId(demo ? 'MMUP-ENG-8472' : '');
    setSiteOfficeRef(demo ? 'DOHA-MUNI-ONST-2026/04' : '');
    setStampSighted(demo);
    setVerificationNotes(demo ? 'Physical wet stamp sighted on A0 structural drawings in site trailer.' : '');
    loadCompliance();
  }, [projectId]);

  const handleVerifyAlternative = async () => {
    if (!selectedObligation) return;
    setIsSubmittingVerify(true);
    try {
      await apiClient.verifyComplianceObligation({
        obligationId: selectedObligation.id,
        verifiedBy: inspectorName,
        verificationMethod: 'physical_inspection_stamp',
        physicalDocReference: siteOfficeRef,
        notes: verificationNotes,
      });
      setIsVerifyModalOpen(false);
      await loadCompliance();
    } catch (err: any) {
      alert(err.message || 'Verification failed');
    } finally {
      setIsSubmittingVerify(false);
    }
  };

  const obligations = data?.obligations || [];
  const evaluation = data?.evaluation;
  const canOpen = evaluation?.canOpenZone ?? false;

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
              🛡️ {currentLanguage === 'ar' ? 'سجل الالتزام التنظيمي وتصاريح الجهات الحكومية' : 'Regulatory Compliance & Statutory Obligations Register'}
            </h1>
            <Badge variant="neutral">ISO 20121 AUDITED</Badge>
            <Badge variant={canOpen ? 'success' : 'danger'}>
              {canOpen ? 'FAIL-CLOSED: GATE PERMITTED' : 'FAIL-CLOSED: GATE BLOCKED'}
            </Badge>
          </div>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
            Authoritative permits from Qatar Civil Defence, Doha Municipality, and Venue Authorities with strict fail-closed enforcement (AT-060, AT-061).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="outline" onClick={loadCompliance} id="btn-refresh-compliance">
            🔄 Refresh Register
          </Button>
        </div>
      </div>

      {/* Fail-Closed Gate Banner */}
      <div
        style={{
          padding: '16px',
          borderRadius: '8px',
          border: canOpen ? '1px solid #86efac' : '1px solid #fecdd3',
          backgroundColor: canOpen ? '#f0fdf4' : '#fff1f2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
        id="banner-compliance-gate"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px' }}>{canOpen ? '✅' : '⛔'}</span>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', color: canOpen ? '#166534' : '#9f1239' }}>
              {canOpen
                ? 'Statutory Opening Gate Permitted'
                : 'FAIL-CLOSED COMPLIANCE BLOCKER: Opening Strictly Denied'}
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: canOpen ? '#15803d' : '#881337' }}>
              {evaluation?.summaryReason ||
                'All critical statutory obligations active or physical alternative verified on site.'}
            </p>
          </div>
        </div>
        <div>
          <Badge variant={canOpen ? 'success' : 'danger'} size="lg">
            {canOpen ? 'RELEASE AUTHORIZED' : 'ADMINISTRATIVE GRACE PERIOD PROHIBITED'}
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <MetricCard
          label="Total Obligations"
          value={`${obligations.length}`}
          change="Regulated touchpoints"
          trend="neutral"
        />
        <MetricCard
          label="Active Digital Permits"
          value={`${obligations.filter((o: any) => o.status === 'active').length}`}
          change="Uploaded & verified"
          trend="positive"
        />
        <MetricCard
          label="Alternative Physical Verified"
          value={`${obligations.filter((o: any) => o.status === 'alternative_verified').length}`}
          change="Inspector badge & seal (AT-060)"
          trend="positive"
        />
        <MetricCard
          label="Critical Blockers"
          value={`${evaluation?.criticalBlockers?.length || 0}`}
          change={evaluation?.criticalBlockers?.length ? 'Must be cleared' : 'Zero blockers'}
          trend={evaluation?.criticalBlockers?.length ? 'negative' : 'positive'}
        />
      </div>

      {/* Obligations Register Table */}
      <Card title="Statutory Permits & Licenses Register">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '12px' }}>Authority & Category</th>
                <th style={{ padding: '12px' }}>Obligation Title & Scope</th>
                <th style={{ padding: '12px' }}>Permit Reference</th>
                <th style={{ padding: '12px' }}>Applicable Zone</th>
                <th style={{ padding: '12px' }}>Validity Window</th>
                <th style={{ padding: '12px' }}>Verification Mode</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {obligations.map((obl: any) => (
                <tr key={obl.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>
                      {obl.authorityType === 'civil_defense'
                        ? 'Qatar Civil Defence (QCDD)'
                        : obl.authorityType === 'municipality'
                        ? 'Doha Municipality (MMUP)'
                        : obl.authorityType === 'venue_noc'
                        ? 'Venue Authority & QT'
                        : obl.authorityType}
                    </div>
                    {obl.criticalForOpening && (
                      <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: 800 }}>
                        CRITICAL FOR OPENING
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{obl.title}</div>
                    {obl.notes && <div style={{ fontSize: '11px', color: '#64748b' }}>{obl.notes}</div>}
                  </td>
                  <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 600 }}>
                    {obl.permitReference}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <Badge variant="neutral">{obl.applicableZone}</Badge>
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#64748b' }}>
                    {new Date(obl.validFrom).toLocaleDateString()} -{' '}
                    {new Date(obl.validUntil).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {obl.verificationMode === 'physical_verified' ? (
                      <Badge variant="warning">Physical Wet Stamp</Badge>
                    ) : (
                      <Badge variant="success">Digital Upload</Badge>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <Badge
                      variant={
                        obl.status === 'active'
                          ? 'success'
                          : obl.status === 'alternative_verified'
                          ? 'neutral'
                          : 'danger'
                      }
                    >
                      {obl.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedObligation(obl);
                          setIsDetailModalOpen(true);
                        }}
                        id={`btn-detail-${obl.id}`}
                      >
                        Details
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setSelectedObligation(obl);
                          setIsVerifyModalOpen(true);
                        }}
                        id={`btn-alt-verify-${obl.id}`}
                      >
                        Verify Physical
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Alternative Physical Verification Modal (AT-060) */}
      {isVerifyModalOpen && (
        <Modal
          isOpen={isVerifyModalOpen}
          onClose={() => setIsVerifyModalOpen(false)}
          title="Alternative Physical Verification (AT-060)"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '6px', fontSize: '12px', color: '#166534' }}>
              <strong>INVARIANT AT-060:</strong> Missing digital upload does NOT constitute an absent approval
              if an authorized physical verification exists. An inspector can verify a physical permit on-site.
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Target Obligation</label>
              <Input value={`${selectedObligation?.permitReference}: ${selectedObligation?.title}`} disabled />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Inspector Name</label>
              <Input
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                placeholder="e.g. Eng. Tareq Mansoor"
                id="input-inspector-name"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Inspector Badge / Ministry ID</label>
              <Input
                value={badgeId}
                onChange={(e) => setBadgeId(e.target.value)}
                placeholder="e.g. MMUP-ENG-8472"
                id="input-inspector-badge"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Site Office Document Reference</label>
              <Input
                value={siteOfficeRef}
                onChange={(e) => setSiteOfficeRef(e.target.value)}
                placeholder="e.g. DOHA-MUNI-ONST-2026/04"
                id="input-office-ref"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="checkbox-stamp-sighted"
                checked={stampSighted}
                onChange={(e) => setStampSighted(e.target.checked)}
              />
              <label htmlFor="checkbox-stamp-sighted" style={{ fontSize: '13px', fontWeight: 600 }}>
                Physical official ministry stamp / seal sighted on site
              </label>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Verification Notes</label>
              <Textarea
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="Physical wet stamp sighted on A0 structural drawings in site trailer..."
                rows={2}
                id="input-verify-notes"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="outline" onClick={() => setIsVerifyModalOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={handleVerifyAlternative}
                disabled={isSubmittingVerify || !stampSighted || !inspectorName || !siteOfficeRef}
                id="btn-confirm-alt-verify"
              >
                {isSubmittingVerify ? 'Recording Seal...' : 'Confirm Physical Verification'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Permit Detail Drawer / Modal */}
      {isDetailModalOpen && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Permit Audit Record: ${selectedObligation?.permitReference}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>{selectedObligation?.title}</h4>
              <div>Authority: <strong>{selectedObligation?.authorityType}</strong></div>
              <div>Zone: <strong>{selectedObligation?.applicableZone}</strong></div>
              <div>Validity: <strong>{new Date(selectedObligation?.validFrom).toLocaleDateString()} to {new Date(selectedObligation?.validUntil).toLocaleDateString()}</strong></div>
              <div>Status: <strong>{selectedObligation?.status}</strong></div>
            </div>

            {selectedObligation?.physicalVerification && (
              <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '6px', border: '1px solid #fde68a' }}>
                <h5 style={{ margin: '0 0 6px 0', color: '#92400e' }}>Alternative Physical Verification Record</h5>
                <div>Inspector: <strong>{selectedObligation.physicalVerification.inspectorName}</strong></div>
                <div>Badge / ID: <strong>{selectedObligation.physicalVerification.badgeOrId}</strong></div>
                <div>Site Reference: <strong>{selectedObligation.physicalVerification.siteOfficeReference}</strong></div>
                <div>Stamp Sighted: <strong>{selectedObligation.physicalVerification.physicalStampSighted ? 'YES' : 'NO'}</strong></div>
                <div>Notes: <em>{selectedObligation.physicalVerification.notes}</em></div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
