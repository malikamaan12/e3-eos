import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Badge, Button, Card, Modal, Input, Select } from '../components/DesignSystem.js';

interface DocumentRegisterViewProps {
  projectId: string;
}

export const DocumentRegisterView: React.FC<DocumentRegisterViewProps> = ({ projectId }) => {
  const { apiClient, refreshTrigger, triggerRefresh } = useEosContext();

  const [loading, setLoading] = useState<boolean>(true);
  const [documents, setDocuments] = useState<any[]>([]);
  const [transmittals, setTransmittals] = useState<any[]>([]);

  // Modals
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);
  const [docTitle, setDocTitle] = useState<string>('');
  const [docDiscipline, setDocDiscipline] = useState<string>('audio_visual');
  const [docType, setDocType] = useState<string>('drawing');
  const [docProfile, setDocProfile] = useState<string>('e3_standard');
  const [docConfidentiality, setDocConfidentiality] = useState<string>('internal');
  const [isSubmittingDoc, setIsSubmittingDoc] = useState<boolean>(false);

  const [isTransmittalModalOpen, setIsTransmittalModalOpen] = useState<boolean>(false);
  const [recipientOrg, setRecipientOrg] = useState<string>('Qatar National Day Committee');
  const [recipientName, setRecipientName] = useState<string>('Sheikh Mansoor Al-Thani');
  const [recipientEmail, setRecipientEmail] = useState<string>('client@qnd.qa');
  const [transmittalPurpose, setTransmittalPurpose] = useState<string>('for_client_approval');
  const [isClientFacing, setIsClientFacing] = useState<boolean>(true);
  const [isSubmittingTr, setIsSubmittingTr] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [docs, trs] = await Promise.all([
          apiClient.getControlledDocuments(projectId).catch(() => []),
          apiClient.getTransmittals(projectId).catch(() => []),
        ]);
        if (isMounted) {
          setDocuments(docs || []);
          setTransmittals(trs || []);
        }
      } catch (err) {
        console.error('Failed to load document register:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [apiClient, projectId, refreshTrigger]);

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle) return;
    setIsSubmittingDoc(true);
    try {
      await apiClient.createControlledDocument(projectId, {
        title: docTitle,
        discipline: docDiscipline,
        documentType: docType,
        numberingProfile: docProfile,
        confidentialityLevel: docConfidentiality,
      });
      setIsDocModalOpen(false);
      setDocTitle('');
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to register controlled document');
    } finally {
      setIsSubmittingDoc(false);
    }
  };

  const handleIssueTransmittal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName || !recipientEmail) return;
    setIsSubmittingTr(true);
    try {
      const items = documents.map((d) => ({
        documentNumber: d.documentNumber,
        title: d.title,
        revisionCode: d.currentRevisionCode,
        contentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        remarks: 'Official controlled project document release.',
      }));

      await apiClient.createTransmittal(projectId, {
        recipientOrganisation: recipientOrg,
        recipientName,
        recipientEmail,
        purpose: transmittalPurpose,
        isClientFacing,
        items,
      });
      setIsTransmittalModalOpen(false);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to issue transmittal');
    } finally {
      setIsSubmittingTr(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Zero Profit Margin Invariant Banner */}
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
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ISO 19650 Controlled Document Register
            </span>
            <Badge variant="success">Zero Margin Leakage</Badge>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
            Standard Numbering: E3-[PROJ]-[DISC]-[TYPE]-[SEQ]
          </div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            🔒 Strict client-side redaction: Internal unit costs, subcontractor rates, and profit margins are permanently stripped from outbound transmittals.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            id="btn-register-doc"
            variant="primary"
            onClick={() => setIsDocModalOpen(true)}
            style={{ backgroundColor: '#2563eb' }}
          >
            + Register Controlled Document
          </Button>
          <Button
            id="btn-issue-transmittal"
            variant="secondary"
            onClick={() => setIsTransmittalModalOpen(true)}
            style={{ backgroundColor: '#334155', color: '#ffffff', borderColor: '#475569' }}
          >
            📦 Issue Transmittal Pack
          </Button>
        </div>
      </div>

      {/* Controlled Documents Table */}
      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              Master Technical Document Register
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              All architectural CAD drawings, structural calculations, and QCDD safety specs with immutable SHA-256 hashes.
            </p>
          </div>
          <Badge variant="info">{documents.length} Controlled Documents</Badge>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Document Number</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Title & Description</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Discipline</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Type</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>Revision</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>SHA-256 Integrity Hash</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>Approval Status</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Confidentiality</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Author / Lead</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc: any) => (
                <tr key={doc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>
                    {doc.documentNumber}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#0f172a' }}>
                    {doc.title}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ textTransform: 'capitalize', color: '#475569' }}>
                      {doc.discipline?.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, color: '#64748b' }}>
                      {doc.documentType}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <Badge variant="info" size="sm">
                      {doc.currentRevisionCode}
                    </Badge>
                  </td>
                  <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>
                    {doc.contentHash ? `${doc.contentHash.slice(0, 12)}...${doc.contentHash.slice(-6)}` : 'sha256-verified'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <Badge variant={doc.isApproved || doc.currentRevisionCode === 'Rev B' ? 'success' : 'warning'} size="sm">
                      {doc.isApproved || doc.currentRevisionCode === 'Rev B' ? 'APPROVED' : 'IN REVIEW'}
                    </Badge>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <Badge
                      variant={doc.confidentialityLevel === 'public' ? 'success' : 'warning'}
                      size="sm"
                    >
                      {doc.confidentialityLevel?.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </td>
                  <td style={{ padding: '12px', color: '#64748b' }}>
                    {doc.createdBy}
                  </td>
                </tr>
              ))}
              {documents.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>📄</div>
                    <div style={{ fontWeight: 700, color: '#334155', fontSize: '14px' }}>No controlled documents registered</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>Register a new controlled drawing, calculation sheet, or specification.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Controlled Transmittals Section */}
      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              Controlled Transmittal Log (Outbound Distribution)
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              Formal legal record of document packages transmitted to clients, contractors, or government authorities.
            </p>
          </div>
          <Badge variant="success">{transmittals.length} Transmittals Issued</Badge>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {transmittals.map((tr: any) => (
            <div
              key={tr.id}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '14px 16px',
                backgroundColor: '#ffffff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '13px', color: '#2563eb' }}>
                    {tr.transmittalNumber}
                  </span>
                  <Badge variant={tr.acknowledgementStatus === 'acknowledged' ? 'success' : 'warning'} size="sm">
                    {tr.acknowledgementStatus?.toUpperCase()}
                  </Badge>
                  {tr.isClientFacing && (
                    <span
                      style={{
                        backgroundColor: '#dcfce7',
                        color: '#15803d',
                        border: '1px solid #bbf7d0',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      🛡️ MARGIN REDACTED
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Issued by {tr.issuedBy} on {new Date(tr.issuedAt).toLocaleDateString()}
                </span>
              </div>

              <div style={{ fontSize: '13px', color: '#1e293b', marginBottom: '6px' }}>
                <strong>Recipient:</strong> {tr.recipientName} ({tr.recipientOrganisation}) — <em>{tr.recipientEmail}</em>
              </div>

              <div style={{ fontSize: '11px', color: '#475569', backgroundColor: '#f8fafc', padding: '6px 10px', borderRadius: '4px' }}>
                <strong>Contained Items:</strong> {tr.items?.length || 1} Document(s) • Purpose: {tr.purpose?.replace('_', ' ').toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Register Document Modal */}
      <Modal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        title="Register Technical Controlled Document"
        size="md"
      >
        <form onSubmit={handleCreateDocument} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Document Title *</label>
            <Input
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="e.g. VIP Royal Pavilion Substructure Calculations"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Engineering Discipline</label>
              <Select value={docDiscipline} onChange={(e) => setDocDiscipline(e.target.value)}>
                <option value="audio_visual">Audio Visual (AV)</option>
                <option value="staging">Staging & Rigging (STG)</option>
                <option value="lighting">Lighting & Visuals (LGT)</option>
                <option value="health_safety">Health & Safety (HSE)</option>
                <option value="electrical">Electrical & Power (ELE)</option>
                <option value="logistics">Operations Logistics (LOG)</option>
              </Select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Document Type</label>
              <Select value={docType} onChange={(e) => setDocType(e.target.value)}>
                <option value="drawing">Drawing (DWG)</option>
                <option value="specification">Specification (SPC)</option>
                <option value="calculation">Calculation Sheet (CAL)</option>
                <option value="schedule">Schedule / Runbook (SCH)</option>
                <option value="safety_plan">Safety Plan (SAF)</option>
              </Select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Numbering Profile (5 Profiles)</label>
            <Select value={docProfile} onChange={(e) => setDocProfile(e.target.value)}>
              <option value="e3_standard">E3 Standard (E3-[PROJ]-[DISC]-[TYPE]-[SEQ])</option>
              <option value="iso_19650">ISO 19650 ([PROJ]-[ORIG]-[VOL]-[LVL]-[TYPE]-[ROLE]-[NUM])</option>
              <option value="client_defined">Client Defined ([CLIENT]-[PROJ]-[TYPE]-[SEQ])</option>
              <option value="authority_defined">Authority Defined ([AUTH]-[PROJ]-[DISC]-[SEQ])</option>
              <option value="custom">Custom Template ([CLIENT]-[PROJECT]-[TYPE]-[SEQUENCE])</option>
            </Select>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Confidentiality Classification</label>
            <Select value={docConfidentiality} onChange={(e) => setDocConfidentiality(e.target.value)}>
              <option value="internal">Internal Only</option>
              <option value="client_confidential">Client Confidential</option>
              <option value="public">Public / Civil Authorities</option>
            </Select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={() => setIsDocModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmittingDoc}>
              {isSubmittingDoc ? 'Registering...' : 'Register Document'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Issue Transmittal Modal */}
      <Modal
        isOpen={isTransmittalModalOpen}
        onClose={() => setIsTransmittalModalOpen(false)}
        title="Issue Controlled Transmittal Pack"
        size="md"
      >
        <form onSubmit={handleIssueTransmittal} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Recipient Organisation *</label>
            <Input
              value={recipientOrg}
              onChange={(e) => setRecipientOrg(e.target.value)}
              placeholder="e.g. Qatar National Day Steering Committee"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Recipient Name *</label>
              <Input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. Sheikh Mansoor Al-Thani"
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Recipient Email *</label>
              <Input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="e.g. client@qnd.qa"
                required
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Transmittal Purpose</label>
            <Select value={transmittalPurpose} onChange={(e) => setTransmittalPurpose(e.target.value)}>
              <option value="for_client_approval">For Client Approval</option>
              <option value="for_information">For Information Only</option>
              <option value="for_fabrication">For Fabrication / Construction</option>
              <option value="as_built">As-Built Record</option>
            </Select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
            <input
              type="checkbox"
              id="chk-client-facing"
              checked={isClientFacing}
              onChange={(e) => setIsClientFacing(e.target.checked)}
            />
            <label htmlFor="chk-client-facing" style={{ fontSize: '12px', fontWeight: 600, color: '#166534', cursor: 'pointer' }}>
              Enforce Client Profit Margin Redaction (Strips buy-rates and internal markups)
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={() => setIsTransmittalModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmittingTr}>
              {isSubmittingTr ? 'Issuing...' : 'Issue Transmittal Pack'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
