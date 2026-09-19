import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Badge, Button, Card, Modal, Input, Select, Textarea } from '../components/DesignSystem.js';

interface Props {
  initialProjectId?: string;
  initialTab?: 'vault' | 'project' | 'pack';
}

export const ControlledDocumentsWorkspaceView: React.FC<Props> = ({
  initialProjectId,
  initialTab = 'vault',
}) => {
  const { apiClient, selectedProjectId, currentLanguage, currentUser } = useEosContext();
  const isRtl = currentLanguage === 'ar';

  const projectId = initialProjectId || selectedProjectId || 'f1111111-1111-4111-8111-111111111111';

  const [activeTab, setActiveTab] = useState<'vault' | 'project' | 'pack'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const docTab = params.get('docTab');
      if (docTab === 'vault' || docTab === 'project' || docTab === 'pack') return docTab;
    }
    return initialTab;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const docTab = params.get('docTab');
      if (docTab === 'vault' || docTab === 'project' || docTab === 'pack') {
        setActiveTab(docTab);
        return;
      }
    }
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [loading, setLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // =========================================================================
  // TAB 1: EVIDENCE VAULT STATE
  // =========================================================================
  const [vaultItems, setVaultItems] = useState<any[]>([]);
  const [renewals, setRenewals] = useState<any[]>([]);
  const [searchVault, setSearchVault] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedVaultItem, setSelectedVaultItem] = useState<any | null>(null);

  // Vault Modals
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState<boolean>(false);
  const [intakeTitle, setIntakeTitle] = useState<string>('');
  const [intakeCategory, setIntakeCategory] = useState<string>('CORP');
  const [intakeLegalEntity, setIntakeLegalEntity] = useState<string>('E3 Event Operations W.L.L.');
  const [intakeClass, setIntakeClass] = useState<string>('certified_copy');
  const [intakeIssuer, setIntakeIssuer] = useState<string>('Ministry of Commerce & Industry (MOCI)');
  const [intakeExpiry, setIntakeExpiry] = useState<string>('2027-12-31');
  const [intakeRetention, setIntakeRetention] = useState<boolean>(false);
  const [isSubmittingIntake, setIsSubmittingIntake] = useState<boolean>(false);

  // Verification Drawer / Modal
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState<boolean>(false);
  const [verifyStatus, setVerifyStatus] = useState<string>('approved');
  const [verifyNotes, setVerifyNotes] = useState<string>('Verified against official MOCI register.');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // =========================================================================
  // TAB 2: PROJECT WORKSPACE STATE
  // =========================================================================
  const [slots, setSlots] = useState<any[]>([]);
  const [workingCopies, setWorkingCopies] = useState<any[]>([]);
  const [projectSubTab, setProjectSubTab] = useState<'slots' | 'working'>('slots');

  // Slot Modals
  const [isSlotModalOpen, setIsSlotModalOpen] = useState<boolean>(false);
  const [slotTitle, setSlotTitle] = useState<string>('');
  const [slotEnvelope, setSlotEnvelope] = useState<string>('technical');
  const [slotEntity, setSlotEntity] = useState<string>('E3 Event Operations W.L.L.');
  const [slotMandatory, setSlotMandatory] = useState<boolean>(true);
  const [isSubmittingSlot, setIsSubmittingSlot] = useState<boolean>(false);

  // Link Evidence Modal
  const [isLinkModalOpen, setIsLinkModalOpen] = useState<boolean>(false);
  const [selectedSlotForLink, setSelectedSlotForLink] = useState<any | null>(null);
  const [selectedEvidenceIdToLink, setSelectedEvidenceIdToLink] = useState<string>('');
  const [isLinking, setIsLinking] = useState<boolean>(false);

  // Working Copy Modals
  const [isWorkingModalOpen, setIsWorkingModalOpen] = useState<boolean>(false);
  const [wcTitle, setWcTitle] = useState<string>('');
  const [wcDiscipline, setWcDiscipline] = useState<string>('general');
  const [wcEnvelope, setWcEnvelope] = useState<string>('technical');
  const [wcContent, setWcContent] = useState<string>('Official project executive commitment and statement of work.');
  const [isSubmittingWc, setIsSubmittingWc] = useState<boolean>(false);

  // Comments Drawer
  const [selectedWcForComments, setSelectedWcForComments] = useState<any | null>(null);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [newCommentVisibility, setNewCommentVisibility] = useState<string>('internal');

  // =========================================================================
  // TAB 3: SUBMISSION PACK BUILDER STATE
  // =========================================================================
  const [packs, setPacks] = useState<any[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string>('');
  const [activePack, setActivePack] = useState<any | null>(null);
  const [packReadiness, setPackReadiness] = useState<any | null>(null);
  const [pdfPreview, setPdfPreview] = useState<any | null>(null);

  // Pack Modals
  const [isNewPackModalOpen, setIsNewPackModalOpen] = useState<boolean>(false);
  const [newPackTitle, setNewPackTitle] = useState<string>('');
  const [newPackEnvelope, setNewPackEnvelope] = useState<string>('technical');
  const [newPackTenderRef, setNewPackTenderRef] = useState<string>('TND-QND-2026-009');
  const [isSubmittingPack, setIsSubmittingPack] = useState<boolean>(false);

  // Authorized Mark Placement Modal
  const [isStampModalOpen, setIsStampModalOpen] = useState<boolean>(false);
  const [selectedMarkAsset, setSelectedMarkAsset] = useState<string>('TEST_STAMP_AUTHORIZED');
  const [signatoryName, setSignatoryName] = useState<string>('Zaid Mansour');
  const [signatoryAuthority, setSignatoryAuthority] = useState<string>('Managing Director & Authorised Signatory');
  const [stampPage, setStampPage] = useState<number>(1);
  const [isApplyingMark, setIsApplyingMark] = useState<boolean>(false);

  // Transmittal Issue Modal
  const [isIssueModalOpen, setIsIssueModalOpen] = useState<boolean>(false);
  const [issueRecipientOrg, setIssueRecipientOrg] = useState<string>('Ministry of Culture / Steering Committee');
  const [issueRecipientName, setIssueRecipientName] = useState<string>('Eng. Hisham Al-Kuwari');
  const [issueRecipientEmail, setIssueRecipientEmail] = useState<string>('hisham.kuwari@moc.gov.qa');
  const [issueChannel, setIssueChannel] = useState<string>('formal_portal_upload');
  const [isSubmittingIssue, setIsSubmittingIssue] = useState<boolean>(false);

  // Receipt Modal
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [receiptRef, setReceiptRef] = useState<string>('MOC-TND-RCV-2026-9921');
  const [receiptNotes, setReceiptNotes] = useState<string>('Formal tender submission acknowledged with physical timestamp.');
  const [receiptOfficer, setReceiptOfficer] = useState<string>('Tender Board Secretary');
  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState<boolean>(false);

  // Client Review Share Modal
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [shareEmail, setShareEmail] = useState<string>('client.lead@moc.gov.qa');
  const [shareWatermark, setShareWatermark] = useState<string>('CONFIDENTIAL CLIENT REVIEW COPY');
  const [generatedShareLink, setGeneratedShareLink] = useState<string | null>(null);
  const [isGeneratingShare, setIsGeneratingShare] = useState<boolean>(false);

  // =========================================================================
  // DATA LOADERS
  // =========================================================================
  const notify = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 6000);
  };

  const loadVaultData = async () => {
    try {
      const [itemsRes, renewalsRes] = await Promise.all([
        apiClient.searchVaultEvidence({}),
        apiClient.getVaultRenewals(),
      ]);
      setVaultItems(itemsRes.data || []);
      setRenewals(renewalsRes.data || []);
    } catch (err: any) {
      console.error('Failed to load vault data:', err);
    }
  };

  const loadProjectData = async () => {
    try {
      const [slotsData, wcData] = await Promise.all([
        apiClient.getRequiredDocumentSlots(projectId),
        apiClient.getProjectWorkingCopies(projectId),
      ]);
      setSlots(slotsData || []);
      setWorkingCopies(wcData || []);
    } catch (err: any) {
      console.error('Failed to load project data:', err);
    }
  };

  const loadPackData = async (targetPackId?: string) => {
    try {
      const packsList = await apiClient.getSubmissionPacks(projectId);
      setPacks(packsList || []);
      const packIdToLoad = targetPackId || selectedPackId || (packsList[0]?.id ?? '');
      if (packIdToLoad) {
        setSelectedPackId(packIdToLoad);
        const [packDetails, readiness] = await Promise.all([
          apiClient.getSubmissionPack(projectId, packIdToLoad),
          apiClient.checkSubmissionPackReadiness(projectId, packIdToLoad),
        ]);
        setActivePack(packDetails.data);
        setPackReadiness(readiness.data);
      }
    } catch (err: any) {
      console.error('Failed to load pack data:', err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadVaultData(), loadProjectData(), loadPackData()]).finally(() => {
      setLoading(false);
    });
  }, [projectId]);

  // =========================================================================
  // TAB 1: VAULT HANDLERS
  // =========================================================================
  const handleIntakeEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intakeTitle) return;
    setIsSubmittingIntake(true);
    try {
      await apiClient.intakeVaultEvidence({
        title: intakeTitle,
        category: intakeCategory,
        legalEntity: intakeLegalEntity,
        documentClass: intakeClass,
        confidentiality: 'confidential',
        issuer: intakeIssuer,
        expiryDate: intakeExpiry,
        expiryState: intakeExpiry ? 'active_current' : 'no_stated_expiry',
        retentionHold: intakeRetention,
        fileName: `${intakeTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`,
        fileSizeBytes: 180500,
        contentHash: 'f0e4c2f76c58916ec258f246851bea091d14d4247a2fc3e18694461b1816e13b',
      });
      notify('success', `Evidence "${intakeTitle}" registered into Company Vault.`);
      setIsIntakeModalOpen(false);
      setIntakeTitle('');
      await loadVaultData();
    } catch (err: any) {
      notify('error', err.message || 'Failed to intake evidence');
    } finally {
      setIsSubmittingIntake(false);
    }
  };

  const handleVerifyRevision = async () => {
    if (!selectedVaultItem) return;
    setIsVerifying(true);
    try {
      await apiClient.verifyVaultRevision(selectedVaultItem.id, 'Rev 01', {
        status: verifyStatus,
        verificationNotes: verifyNotes,
      });
      notify('success', `Evidence revision marked as ${verifyStatus.toUpperCase()}.`);
      setIsVerifyModalOpen(false);
      setSelectedVaultItem(null);
      await loadVaultData();
    } catch (err: any) {
      notify('error', err.message || 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDeleteEvidence = async (item: any) => {
    if (item.retentionHold) {
      notify('error', 'Action blocked: This document is under an active legal Retention Hold.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete ${item.title}?`)) return;
    try {
      await apiClient.deleteVaultEvidence(item.id);
      notify('success', `Evidence master ${item.evidenceCode} removed.`);
      await loadVaultData();
    } catch (err: any) {
      notify('error', err.message || 'Failed to delete evidence');
    }
  };

  // Filtered Vault Items
  const filteredVaultItems = vaultItems.filter((item) => {
    if (searchVault && !item.title?.toLowerCase().includes(searchVault.toLowerCase()) && !item.evidenceCode?.toLowerCase().includes(searchVault.toLowerCase())) {
      return false;
    }
    if (filterCategory !== 'all' && item.category !== filterCategory) return false;
    if (filterEntity !== 'all' && item.legalEntity !== filterEntity) return false;
    if (filterStatus !== 'all' && item.verificationStatus !== filterStatus) return false;
    return true;
  });

  // =========================================================================
  // TAB 2: PROJECT WORKSPACE HANDLERS
  // =========================================================================
  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotTitle) return;
    setIsSubmittingSlot(true);
    try {
      await apiClient.createRequiredDocumentSlot(projectId, {
        title: slotTitle,
        envelope: slotEnvelope,
        requestedEntity: slotEntity,
        mandatory: slotMandatory,
      });
      notify('success', `Required slot "${slotTitle}" added.`);
      setIsSlotModalOpen(false);
      setSlotTitle('');
      await loadProjectData();
    } catch (err: any) {
      notify('error', err.message || 'Failed to create slot');
    } finally {
      setIsSubmittingSlot(false);
    }
  };

  const handleLinkEvidenceToSlot = async () => {
    if (!selectedSlotForLink || !selectedEvidenceIdToLink) return;
    setIsLinking(true);
    try {
      await apiClient.linkEvidenceToSlot(projectId, selectedSlotForLink.id, {
        evidenceVaultId: selectedEvidenceIdToLink,
      });
      notify('success', 'Evidence linked to slot successfully.');
      setIsLinkModalOpen(false);
      setSelectedSlotForLink(null);
      setSelectedEvidenceIdToLink('');
      await loadProjectData();
    } catch (err: any) {
      notify('error', err.message || 'Failed to link evidence');
    } finally {
      setIsLinking(false);
    }
  };

  const handleCreateWorkingCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wcTitle) return;
    setIsSubmittingWc(true);
    try {
      await apiClient.createProjectWorkingCopy(projectId, {
        title: wcTitle,
        discipline: wcDiscipline,
        envelope: wcEnvelope,
        content: wcContent,
      });
      notify('success', `Project working document "${wcTitle}" initialized.`);
      setIsWorkingModalOpen(false);
      setWcTitle('');
      await loadProjectData();
    } catch (err: any) {
      notify('error', err.message || 'Failed to create working copy');
    } finally {
      setIsSubmittingWc(false);
    }
  };

  const handleFreezeWorkingCopy = async (wc: any) => {
    try {
      await apiClient.freezeProjectWorkingCopy(projectId, wc.id);
      notify('success', `Working document "${wc.title}" frozen for submission.`);
      await loadProjectData();
    } catch (err: any) {
      notify('error', err.message || 'Failed to freeze working document');
    }
  };

  // =========================================================================
  // TAB 3: PACK BUILDER HANDLERS
  // =========================================================================
  const handleCreatePack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPackTitle) return;
    setIsSubmittingPack(true);
    try {
      const res = await apiClient.createSubmissionPack(projectId, {
        title: newPackTitle,
        envelope: newPackEnvelope,
        tenderReference: newPackTenderRef,
      });
      notify('success', `Submission pack ${res.data.packCode} initialized.`);
      setIsNewPackModalOpen(false);
      setNewPackTitle('');
      await loadPackData(res.data.id);
    } catch (err: any) {
      notify('error', err.message || 'Failed to create pack');
    } finally {
      setIsSubmittingPack(false);
    }
  };

  const handleMoveItem = async (itemId: string, direction: 'up' | 'down') => {
    if (!activePack || !activePack.items) return;
    const items = [...activePack.items];
    const index = items.findIndex((i) => i.id === itemId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    // Swap
    const temp = items[index];
    items[index] = items[targetIndex];
    items[targetIndex] = temp;

    const orderedIds = items.map((i) => i.id);
    try {
      await apiClient.reorderSubmissionPackItems(projectId, activePack.id, orderedIds);
      await loadPackData(activePack.id);
    } catch (err: any) {
      notify('error', 'Failed to update item order');
    }
  };

  const handleToggleItemIncluded = async (item: any) => {
    try {
      await apiClient.updateSubmissionPackItem(projectId, activePack.id, item.id, {
        isIncluded: !item.isIncluded,
      });
      await loadPackData(activePack.id);
    } catch (err: any) {
      notify('error', 'Failed to toggle item inclusion');
    }
  };

  const handleAssemblePreview = async () => {
    if (!activePack) return;
    try {
      const res = await apiClient.assembleSubmissionPackPreview(projectId, activePack.id, {
        enableContinuousPageNumbers: true,
        headerText: `${activePack.packCode} • OFFICIAL TENDER RECORD`,
      });
      setPdfPreview(res.data);
      notify('info', `Pure-JS Candidate PDF assembled: ${res.data.pageCount} pages, SHA-256 verified.`);
    } catch (err: any) {
      notify('error', err.message || 'Failed to assemble candidate PDF');
    }
  };

  const handleApplyMarks = async () => {
    if (!activePack) return;
    setIsApplyingMark(true);
    try {
      await apiClient.applyTestMarks(projectId, activePack.id, {
        assetCode: selectedMarkAsset,
        signatoryName,
        signatoryAuthority,
        purpose: 'Tender Executive Commitment',
        placements: [{ pageNumber: stampPage, x: 72, y: 72 }],
      });
      notify('success', `Authorized synthetic mark applied to Page ${stampPage}.`);
      setIsStampModalOpen(false);
      await handleAssemblePreview();
    } catch (err: any) {
      notify('error', err.message || 'Failed to apply test marks');
    } finally {
      setIsApplyingMark(false);
    }
  };

  const handleFinalizePack = async () => {
    if (!activePack) return;
    try {
      const res = await apiClient.finalizeSubmissionPack(projectId, activePack.id, {
        applyAuthorizedMarks: true,
      });
      notify('success', `Submission pack finalized & sealed! Hash: ${res.data.artifactHash.slice(0, 16)}...`);
      await loadPackData(activePack.id);
    } catch (err: any) {
      notify('error', err.message || 'Failed to finalize pack');
    }
  };

  const handleIssuePack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePack) return;
    setIsSubmittingIssue(true);
    try {
      const res = await apiClient.issueSubmissionPack(projectId, activePack.id, {
        recipientOrganisation: issueRecipientOrg,
        recipientName: issueRecipientName,
        recipientEmail: issueRecipientEmail,
        channel: issueChannel,
        purpose: 'Formal Tender Bid Submission',
      });
      notify('success', `Transmittal ${res.data.transmittalNumber} issued! Status set to Submitted.`);
      setIsIssueModalOpen(false);
      await loadPackData(activePack.id);
    } catch (err: any) {
      notify('error', err.message || 'Failed to issue pack');
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  const handleRecordReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePack) return;
    setIsSubmittingReceipt(true);
    try {
      await apiClient.recordSubmissionReceipt(projectId, activePack.id, {
        receiptReference: receiptRef,
        acknowledgedBy: receiptOfficer,
        acknowledgementDate: new Date().toISOString(),
        receiptNotes,
      });
      notify('success', `Submission receipt ${receiptRef} recorded and bound to sealed artifact.`);
      setIsReceiptModalOpen(false);
      await loadPackData(activePack.id);
    } catch (err: any) {
      notify('error', err.message || 'Failed to record receipt');
    } finally {
      setIsSubmittingReceipt(false);
    }
  };

  const handleCreateShare = async () => {
    if (!activePack) return;
    setIsGeneratingShare(true);
    try {
      const res = await apiClient.shareClientReview(projectId, activePack.id, {
        recipientName: 'Client Review Committee',
        recipientEmail: shareEmail,
        watermarkText: shareWatermark,
        allowDownload: false,
        expiresInHours: 72,
      });
      setGeneratedShareLink(res.data.reviewUrl);
      notify('success', 'Secure Client Review link generated with ZERO commercial margin leakage.');
    } catch (err: any) {
      notify('error', err.message || 'Failed to create review share');
    } finally {
      setIsGeneratingShare(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            padding: '12px 20px',
            borderRadius: '6px',
            backgroundColor: notification.type === 'success' ? '#065f46' : notification.type === 'error' ? '#991b1b' : '#1e40af',
            color: 'var(--surface-1, #0f1624)',
            fontWeight: 600,
            fontSize: '13px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            style={{ background: 'none', border: 'none', color: 'var(--surface-1, #0f1624)', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Workspace Header & Tab Selector */}
      <div
        style={{
          backgroundColor: 'var(--surface-1, #0f1624)',
          color: 'var(--text-primary, #f8fafc)',
          borderRadius: '8px',
          padding: '24px',
          border: '1px solid var(--border-default, #2a374b)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent, #d97706)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Controlled Documents & Submission Hub
              </span>
              <Badge variant="success">ISO 19650 Compliant</Badge>
              <Badge variant="info">Zero Margin Leakage</Badge>
            </div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
              {isRtl ? 'إدارة الوثائق المعتمدة وخزينة الأدلة وحزم التقديم' : 'Controlled Documents, Company Vault & Submission Packs'}
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-secondary, #94a3b8)' }}>
              Distinct separation between enterprise evidence masters, project working derivatives, and immutable sealed submission packs.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {activeTab === 'vault' && (
              <Button variant="primary" onClick={() => setIsIntakeModalOpen(true)}>
                + Intake Evidence Master
              </Button>
            )}
            {activeTab === 'project' && (
              <>
                <Button variant="primary" onClick={() => setIsSlotModalOpen(true)}>
                  + Add Required Slot
                </Button>
                <Button variant="secondary" onClick={() => setIsWorkingModalOpen(true)}>
                  + New Working Document
                </Button>
              </>
            )}
            {activeTab === 'pack' && (
              <>
                <Button variant="primary" onClick={() => setIsNewPackModalOpen(true)}>
                  + Initialize Submission Pack
                </Button>
                <Button variant="secondary" onClick={() => setIsShareModalOpen(true)}>
                  🔗 Client Review Share
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 3 Workstation Tabs */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-default, #2a374b)', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('vault')}
            style={{
              padding: '12px 20px',
              backgroundColor: activeTab === 'vault' ? 'var(--accent-soft, rgba(217,119,6,0.14))' : 'transparent',
              color: activeTab === 'vault' ? 'var(--text-primary, #f8fafc)' : 'var(--text-muted, #94a3b8)',
              border: 'none',
              borderBottom: activeTab === 'vault' ? '2px solid var(--accent, #d97706)' : '2px solid transparent',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            🏛️ Company Evidence Vault
            <span style={{ backgroundColor: activeTab === 'vault' ? 'rgba(217,119,6,0.25)' : 'var(--surface-3, #1b2638)', color: activeTab === 'vault' ? 'var(--accent-hover, #f59e0b)' : 'var(--text-muted, #94a3b8)', padding: '2px 6px', borderRadius: '10px', fontSize: '11px' }}>
              {vaultItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('project')}
            style={{
              padding: '12px 20px',
              backgroundColor: activeTab === 'project' ? 'var(--accent-soft, rgba(217,119,6,0.14))' : 'transparent',
              color: activeTab === 'project' ? 'var(--text-primary, #f8fafc)' : 'var(--text-muted, #94a3b8)',
              border: 'none',
              borderBottom: activeTab === 'project' ? '2px solid var(--accent, #d97706)' : '2px solid transparent',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            📋 Project Document Workspace
            <span style={{ backgroundColor: activeTab === 'project' ? 'rgba(217,119,6,0.25)' : 'var(--surface-3, #1b2638)', color: activeTab === 'project' ? 'var(--accent-hover, #f59e0b)' : 'var(--text-muted, #94a3b8)', padding: '2px 6px', borderRadius: '10px', fontSize: '11px' }}>
              {slots.length} Slots
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pack')}
            style={{
              padding: '12px 20px',
              backgroundColor: activeTab === 'pack' ? 'var(--accent-soft, rgba(217,119,6,0.14))' : 'transparent',
              color: activeTab === 'pack' ? 'var(--text-primary, #f8fafc)' : 'var(--text-muted, #94a3b8)',
              border: 'none',
              borderBottom: activeTab === 'pack' ? '2px solid var(--accent, #d97706)' : '2px solid transparent',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            📦 Submission Pack Factory
            <span style={{ backgroundColor: activeTab === 'pack' ? 'rgba(217,119,6,0.25)' : 'var(--surface-3, #1b2638)', color: activeTab === 'pack' ? 'var(--accent-hover, #f59e0b)' : 'var(--text-muted, #94a3b8)', padding: '2px 6px', borderRadius: '10px', fontSize: '11px' }}>
              {activePack ? 'Active' : 'Unsealed'}
            </span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: COMPANY EVIDENCE VAULT                                         */}
      {/* ===================================================================== */}
      {activeTab === 'vault' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Renewal / Expiry Alert Bar */}
          {renewals.length > 0 && (
            <div
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid #fef3c7',
                borderRadius: '6px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '18px' }}>⚠️</span>
              <div style={{ fontSize: '12px', color: '#f59e0b' }}>
                <strong>Renewal Watchlist:</strong> {renewals.length} company evidence item(s) are expiring soon or currently under renewal.
              </div>
            </div>
          )}

          {/* Filters and Search */}
          <Card style={{ padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Search Evidence</label>
                <Input
                  value={searchVault}
                  onChange={(e) => setSearchVault(e.target.value)}
                  placeholder="Code, title, issuer..."
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Category</label>
                <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                  <option value="all">All Categories</option>
                  <option value="CORP">Corporate & Legal (CORP)</option>
                  <option value="LIC">Licences & Municipal (LIC)</option>
                  <option value="TAX">Tax & Cards (TAX)</option>
                  <option value="FIN">Audited Financials (FIN)</option>
                  <option value="INS">Insurance Policies (INS)</option>
                  <option value="HSE">Health & Safety (HSE)</option>
                  <option value="QUAL">ISO / Quality (QUAL)</option>
                </Select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Legal Entity</label>
                <Select value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)}>
                  <option value="all">All Legal Entities</option>
                  <option value="E3 Event Operations W.L.L.">E3 Event Operations W.L.L. (Qatar)</option>
                  <option value="E3 Creative Qatar W.L.L.">E3 Creative Qatar W.L.L.</option>
                  <option value="E3 Global Productions Ltd">E3 Global Productions Ltd</option>
                </Select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Verification</label>
                <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="all">All Verification Statuses</option>
                  <option value="approved">Approved</option>
                  <option value="pending_verification">Pending Verification</option>
                  <option value="in_review">In Review</option>
                  <option value="expired">Expired</option>
                </Select>
              </div>
            </div>
          </Card>

          {/* Evidence Masters Table */}
          <Card style={{ padding: '0px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default, #2a374b)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
                  Enterprise Evidence Register
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                  Immutable company masters with SHA-256 integrity checks and renewal tracking.
                </span>
              </div>
              <Badge variant="info">{filteredVaultItems.length} Registered Masters</Badge>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--surface-2, #151e2e)', borderBottom: '1px solid var(--border-default, #2a374b)', color: 'var(--text-secondary, #cbd5e1)' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Code</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Document Title & Issuer</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Legal Entity</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Category</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Expiry / Renewal</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Verification</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Retention</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVaultItems.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle, #1d2939)' }}>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                        {item.evidenceCode}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>{item.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
                          Issuer: {item.issuer || 'Official Authority'} • {item.documentClass?.replace('_', ' ')}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary, #cbd5e1)' }}>
                        {item.legalEntity}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <Badge variant="secondary" size="sm">{item.category}</Badge>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {item.expiryDate ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-primary, #f8fafc)' }}>{item.expiryDate}</span>
                            {item.expiryState === 'expired' && <Badge variant="danger" size="sm">EXPIRED</Badge>}
                            {item.expiryState === 'renewal_in_progress' && <Badge variant="warning" size="sm">RENEWING</Badge>}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '11px' }}>No stated expiry</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <Badge
                          variant={item.verificationStatus === 'approved' ? 'success' : item.verificationStatus === 'expired' ? 'danger' : 'warning'}
                          size="sm"
                        >
                          {item.verificationStatus?.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {item.retentionHold ? (
                          <Badge variant="danger" size="sm">🔒 HOLD</Badge>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '11px' }}>Normal</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedVaultItem(item);
                              setIsVerifyModalOpen(true);
                            }}
                          >
                            Verify
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteEvidence(item)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredVaultItems.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
                        No evidence masters found matching the current search or filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: PROJECT DOCUMENT WORKSPACE                                     */}
      {/* ===================================================================== */}
      {activeTab === 'project' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Subtabs for Project Register */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button
              variant={projectSubTab === 'slots' ? 'primary' : 'secondary'}
              onClick={() => setProjectSubTab('slots')}
            >
              Required Document Slots ({slots.length})
            </Button>
            <Button
              variant={projectSubTab === 'working' ? 'primary' : 'secondary'}
              onClick={() => setProjectSubTab('working')}
            >
              Project Working Copies ({workingCopies.length})
            </Button>
          </div>

          {/* Subtab 1: Required Document Slots */}
          {projectSubTab === 'slots' && (
            <Card style={{ padding: '0px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default, #2a374b)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
                    Tender Requirement Slots
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                    Identified document requirements for Project {projectId}. Link verified vault evidence to satisfy.
                  </span>
                </div>
                <Badge variant="info">{slots.filter((s) => s.status === 'linked_verified').length} / {slots.length} Satisfied</Badge>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--surface-2, #151e2e)', borderBottom: '1px solid var(--border-default, #2a374b)', color: 'var(--text-secondary, #cbd5e1)' }}>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>Requirement Title</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>Envelope</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>Mandatory</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>Target Entity</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>Status</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>Linked Evidence</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((slot) => (
                      <tr key={slot.id} style={{ borderBottom: '1px solid var(--border-subtle, #1d2939)' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                          {slot.title}
                          {slot.requestedYears && (
                            <div style={{ fontSize: '11px', color: '#0284c7' }}>
                              Years required: {slot.requestedYears.join(', ')}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <Badge variant="secondary" size="sm">{slot.envelope?.replace('_', ' ')}</Badge>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {slot.mandatory ? <Badge variant="danger" size="sm">MANDATORY</Badge> : <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Optional</span>}
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-secondary, #cbd5e1)' }}>
                          {slot.requestedEntity || 'Any'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <Badge
                            variant={slot.status === 'linked_verified' ? 'success' : slot.status === 'missing' ? 'danger' : 'warning'}
                            size="sm"
                          >
                            {slot.status?.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#2563eb' }}>
                          {slot.linkedEvidenceVaultId || <span style={{ color: '#94a3b8' }}>Unlinked</span>}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedSlotForLink(slot);
                              setIsLinkModalOpen(true);
                            }}
                          >
                            🔗 Link Evidence
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Subtab 2: Project Working Copies */}
          {projectSubTab === 'working' && (
            <Card style={{ padding: '0px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default, #2a374b)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
                    Project Working Copies & Derivatives
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                    Project-specific working documents with optimistic locking and comment threads.
                  </span>
                </div>
                <Badge variant="info">{workingCopies.length} Active Documents</Badge>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--surface-2, #151e2e)', borderBottom: '1px solid var(--border-default, #2a374b)', color: 'var(--text-secondary, #cbd5e1)' }}>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>Doc Number</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>Title</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>Envelope</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>Revision</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>Lock State</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workingCopies.map((wc) => (
                      <tr key={wc.id} style={{ borderBottom: '1px solid var(--border-subtle, #1d2939)' }}>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                          {wc.documentNumber}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                          {wc.title}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <Badge variant="secondary" size="sm">{wc.envelope}</Badge>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <Badge variant="info" size="sm">{wc.currentRevisionCode}</Badge>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {wc.isFrozen ? (
                            <Badge variant="danger" size="sm">FROZEN FOR PACK</Badge>
                          ) : (
                            <Badge variant="success" size="sm">EDITABLE (v{wc.recordVersion})</Badge>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setSelectedWcForComments(wc)}
                            >
                              💬 Comments
                            </Button>
                            {!wc.isFrozen && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleFreezeWorkingCopy(wc)}
                              >
                                ❄️ Freeze
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: SUBMISSION PACK BUILDER                                       */}
      {/* ===================================================================== */}
      {activeTab === 'pack' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Pack Selector & Status Bar */}
          <Card style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Active Submission Pack</label>
                  <Select
                    value={selectedPackId}
                    onChange={(e) => {
                      setSelectedPackId(e.target.value);
                      loadPackData(e.target.value);
                    }}
                    style={{ minWidth: '320px', fontWeight: 700 }}
                  >
                    {packs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.packCode} — {p.title} ({p.currentRevisionCode})
                      </option>
                    ))}
                  </Select>
                </div>

                {activePack && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
                    <Badge variant={activePack.status === 'ready_to_submit' ? 'success' : activePack.status === 'submitted' ? 'info' : 'warning'}>
                      {activePack.status?.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Badge variant="secondary">Envelope: {activePack.envelope?.toUpperCase()}</Badge>
                  </div>
                )}
              </div>

              {activePack && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button variant="secondary" onClick={handleAssemblePreview}>
                    ⚙️ Assemble Candidate PDF
                  </Button>
                  <Button variant="secondary" onClick={() => setIsStampModalOpen(true)}>
                    ✍️ Apply Authorized Mark
                  </Button>
                  {activePack.status === 'working' && (
                    <Button variant="primary" onClick={handleFinalizePack} style={{ backgroundColor: '#059669' }}>
                      🔒 Finalize & Seal
                    </Button>
                  )}
                  {activePack.status === 'ready_to_submit' && (
                    <Button variant="primary" onClick={() => setIsIssueModalOpen(true)} style={{ backgroundColor: '#2563eb' }}>
                      📦 Issue Transmittal
                    </Button>
                  )}
                  {activePack.status === 'submitted' && (
                    <Button variant="primary" onClick={() => setIsReceiptModalOpen(true)} style={{ backgroundColor: '#0284c7' }}>
                      📝 Record Receipt
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Readiness & Blocker Banner */}
          {packReadiness && (
            <div
              style={{
                backgroundColor: packReadiness.readyToSubmit ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${packReadiness.readyToSubmit ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: '8px',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>{packReadiness.readyToSubmit ? '✅' : '🛑'}</span>
                  <span style={{ fontWeight: 800, fontSize: '14px', color: packReadiness.readyToSubmit ? '#166534' : '#991b1b' }}>
                    {packReadiness.readyToSubmit ? 'Pack is Ready for Finalization & Sealing' : 'Pack Readiness Failed (Blockers Detected)'}
                  </span>
                </div>
                <Badge variant={packReadiness.readyToSubmit ? 'success' : 'danger'}>
                  {packReadiness.blockers?.length || 0} Blockers
                </Badge>
              </div>

              {packReadiness.blockers?.length > 0 && (
                <ul style={{ margin: '4px 0 0', paddingLeft: '24px', fontSize: '12px', color: '#ef4444' }}>
                  {packReadiness.blockers.map((b: string, idx: number) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Drag & Drop Sequence Table */}
          {activePack && (
            <Card style={{ padding: '0px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default, #2a374b)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
                    Pack Structure & Sequential Order
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                    Section dividers, inclusion toggles, and pure-JS page sequence.
                  </span>
                </div>
                <Badge variant="info">{activePack.items?.filter((i: any) => i.isIncluded).length} / {activePack.items?.length || 0} Included</Badge>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--surface-2, #151e2e)', borderBottom: '1px solid var(--border-default, #2a374b)', color: 'var(--text-secondary, #cbd5e1)' }}>
                      <th style={{ padding: '10px 14px', fontWeight: 700, width: '40px' }}>Inc</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, width: '50px' }}>Seq</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>Section</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>Submission Title</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>Source Entity</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>Page Range</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>Reorder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePack.items?.map((item: any, idx: number) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle, #1d2939)', opacity: item.isIncluded ? 1 : 0.5 }}>
                        <td style={{ padding: '12px 14px' }}>
                          <input
                            type="checkbox"
                            checked={item.isIncluded}
                            onChange={() => handleToggleItemIncluded(item)}
                          />
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--text-muted, #94a3b8)' }}>
                          #{item.sequenceIndex || idx + 1}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)' }}>
                          {item.sectionName}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
                          {item.submissionTitle}
                          {item.stampRequired && <Badge variant="warning" size="sm" style={{ marginLeft: '6px' }}>STAMP REQ</Badge>}
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#2563eb' }}>
                          {item.sourceEntityId} ({item.sourceRevisionId})
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-muted, #94a3b8)' }}>
                          {item.selectedPageRange || 'All Pages'}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={idx === 0}
                              onClick={() => handleMoveItem(item.id, 'up')}
                            >
                              ▲
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={idx === (activePack.items?.length || 1) - 1}
                              onClick={() => handleMoveItem(item.id, 'down')}
                            >
                              ▼
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Candidate PDF Assembler Output & Page Map */}
          {pdfPreview && (
            <Card style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
                    Candidate PDF Assembly Stream & Page Map
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                    Generated in-engine via pure JS. Continuous running headers, Bates pagination, and SHA-256 integrity hash.
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Badge variant="success">{pdfPreview.pageCount} Pages Generated</Badge>
                  <Badge variant="info">{(pdfPreview.fileSizeBytes / 1024).toFixed(1)} KB</Badge>
                </div>
              </div>

              <div style={{ padding: '12px', backgroundColor: 'var(--surface-2, #151e2e)', borderRadius: '6px', border: '1px solid var(--border-default, #2a374b)', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary, #cbd5e1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong>Artifact SHA-256:</strong>
                  <code style={{ fontFamily: 'monospace', color: '#0284c7' }}>{pdfPreview.sha256}</code>
                </div>
              </div>

              {/* Page Map Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                {pdfPreview.pageMap?.map((page: any) => (
                  <div
                    key={page.outputPage}
                    style={{
                      border: '1px solid var(--border-default, #2a374b)',
                      borderRadius: '6px',
                      padding: '10px',
                      backgroundColor: 'var(--surface-1, #0f1624)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb' }}>
                      Page {page.outputPage}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', margin: '4px 0' }}>
                      {page.sectionName}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {page.sourceDocId}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODALS & DRAWERS                                                     */}
      {/* ===================================================================== */}

      {/* 1. Intake Evidence Modal */}
      <Modal
        isOpen={isIntakeModalOpen}
        onClose={() => setIsIntakeModalOpen(false)}
        title="Intake Company Evidence Master"
        size="md"
      >
        <form onSubmit={handleIntakeEvidence} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Document Title *</label>
            <Input
              value={intakeTitle}
              onChange={(e) => setIntakeTitle(e.target.value)}
              placeholder="e.g. Commercial Registration (CR) 2026-2027"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Category</label>
              <Select value={intakeCategory} onChange={(e) => setIntakeCategory(e.target.value)}>
                <option value="CORP">CORP (Corporate / Legal)</option>
                <option value="LIC">LIC (Trade / Baladiya)</option>
                <option value="TAX">TAX (Tax Cards / Certs)</option>
                <option value="FIN">FIN (Audited Financials)</option>
                <option value="INS">INS (Insurance Coverage)</option>
                <option value="HSE">HSE (Safety / Environmental)</option>
              </Select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Document Class</label>
              <Select value={intakeClass} onChange={(e) => setIntakeClass(e.target.value)}>
                <option value="certified_copy">Certified Copy</option>
                <option value="original_record">Original Record</option>
                <option value="attested_translation">Attested Translation</option>
                <option value="completed_record">Completed Record</option>
              </Select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Legal Entity</label>
            <Select value={intakeLegalEntity} onChange={(e) => setIntakeLegalEntity(e.target.value)}>
              <option value="E3 Event Operations W.L.L.">E3 Event Operations W.L.L.</option>
              <option value="E3 Creative Qatar W.L.L.">E3 Creative Qatar W.L.L.</option>
              <option value="E3 Global Productions Ltd">E3 Global Productions Ltd</option>
            </Select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Issuing Authority</label>
              <Input
                value={intakeIssuer}
                onChange={(e) => setIntakeIssuer(e.target.value)}
                placeholder="e.g. MOCI Qatar"
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Expiry Date</label>
              <Input
                type="date"
                value={intakeExpiry}
                onChange={(e) => setIntakeExpiry(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', backgroundColor: 'var(--surface-2, #151e2e)', borderRadius: '6px' }}>
            <input
              type="checkbox"
              id="chk-retention"
              checked={intakeRetention}
              onChange={(e) => setIntakeRetention(e.target.checked)}
            />
            <label htmlFor="chk-retention" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)' }}>
              Apply Legal Retention Hold (Prevents accidental or unauthorized deletion)
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={() => setIsIntakeModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={isSubmittingIntake}>
              {isSubmittingIntake ? 'Registering...' : 'Intake Evidence Master'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Verify Evidence Modal */}
      <Modal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        title="Verify Company Evidence Revision"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Verification Decision</label>
            <Select value={verifyStatus} onChange={(e) => setVerifyStatus(e.target.value)}>
              <option value="approved">Approve Revision</option>
              <option value="rejected">Reject (Deficient / Expired)</option>
              <option value="in_review">Request Secondary Review</option>
            </Select>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Audit Verification Notes</label>
            <Textarea
              value={verifyNotes}
              onChange={(e) => setVerifyNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={() => setIsVerifyModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleVerifyRevision} disabled={isVerifying}>
              {isVerifying ? 'Saving...' : 'Commit Verification'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 3. Add Required Slot Modal */}
      <Modal
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
        title="Add Tender Required Document Slot"
        size="md"
      >
        <form onSubmit={handleCreateSlot} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Requirement Name *</label>
            <Input
              value={slotTitle}
              onChange={(e) => setSlotTitle(e.target.value)}
              placeholder="e.g. Valid Municipality Trade Licence"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Submission Envelope</label>
              <Select value={slotEnvelope} onChange={(e) => setSlotEnvelope(e.target.value)}>
                <option value="technical">Technical</option>
                <option value="commercial">Commercial</option>
                <option value="administrative_eligibility">Administrative / Eligibility</option>
              </Select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Required Legal Entity</label>
              <Select value={slotEntity} onChange={(e) => setSlotEntity(e.target.value)}>
                <option value="E3 Event Operations W.L.L.">E3 Event Operations W.L.L.</option>
                <option value="E3 Creative Qatar W.L.L.">E3 Creative Qatar W.L.L.</option>
                <option value="E3 Global Productions Ltd">E3 Global Productions Ltd</option>
              </Select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="chk-slot-mandatory"
              checked={slotMandatory}
              onChange={(e) => setSlotMandatory(e.target.checked)}
            />
            <label htmlFor="chk-slot-mandatory" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)' }}>
              Mandatory Tender Requirement (Blocks pack finalization if unfulfilled)
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={() => setIsSlotModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={isSubmittingSlot}>
              {isSubmittingSlot ? 'Adding...' : 'Create Slot'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Link Evidence to Slot Modal */}
      <Modal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        title={`Link Evidence to: ${selectedSlotForLink?.title || ''}`}
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Select Matching Vault Evidence</label>
            <Select
              value={selectedEvidenceIdToLink}
              onChange={(e) => setSelectedEvidenceIdToLink(e.target.value)}
            >
              <option value="">-- Choose Vault Master --</option>
              {vaultItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.evidenceCode} — {item.title} ({item.legalEntity}) [{item.verificationStatus}]
                </option>
              ))}
            </Select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={() => setIsLinkModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleLinkEvidenceToSlot} disabled={isLinking || !selectedEvidenceIdToLink}>
              {isLinking ? 'Linking...' : 'Confirm Link'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 5. Create Working Copy Modal */}
      <Modal
        isOpen={isWorkingModalOpen}
        onClose={() => setIsWorkingModalOpen(false)}
        title="Initialize Project Working Document"
        size="md"
      >
        <form onSubmit={handleCreateWorkingCopy} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Document Title *</label>
            <Input
              value={wcTitle}
              onChange={(e) => setWcTitle(e.target.value)}
              placeholder="e.g. Technical Delivery Methodology & Site Logistics Plan"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Discipline</label>
              <Select value={wcDiscipline} onChange={(e) => setWcDiscipline(e.target.value)}>
                <option value="general">General</option>
                <option value="technical">Technical</option>
                <option value="commercial">Commercial</option>
                <option value="health_safety">Health & Safety</option>
              </Select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Submission Envelope</label>
              <Select value={wcEnvelope} onChange={(e) => setWcEnvelope(e.target.value)}>
                <option value="technical">Technical</option>
                <option value="commercial">Commercial</option>
                <option value="administrative_eligibility">Administrative</option>
              </Select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Initial Document Text</label>
            <Textarea
              value={wcContent}
              onChange={(e) => setWcContent(e.target.value)}
              rows={4}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={() => setIsWorkingModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={isSubmittingWc}>
              {isSubmittingWc ? 'Creating...' : 'Create Working Copy'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. Comments Drawer / Modal */}
      {selectedWcForComments && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedWcForComments(null)}
          title={`Comments & Feedback: ${selectedWcForComments.title}`}
          size="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ padding: '10px', backgroundColor: 'var(--surface-2, #151e2e)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-secondary, #cbd5e1)' }}>
              <strong>Status:</strong> {selectedWcForComments.isFrozen ? '❄️ Frozen' : '✏️ Active Working'} • Version: {selectedWcForComments.recordVersion}
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Add Review Comment</label>
              <Textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Type internal or client review note..."
                rows={3}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Select
                value={newCommentVisibility}
                onChange={(e) => setNewCommentVisibility(e.target.value)}
                style={{ width: '180px' }}
              >
                <option value="internal">🔒 Internal Only</option>
                <option value="client_visible">👁️ Client Visible</option>
              </Select>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="secondary" onClick={() => setSelectedWcForComments(null)}>Close</Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    notify('success', 'Comment added.');
                    setNewCommentText('');
                  }}
                  disabled={!newCommentText}
                >
                  Post Comment
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 7. New Submission Pack Modal */}
      <Modal
        isOpen={isNewPackModalOpen}
        onClose={() => setIsNewPackModalOpen(false)}
        title="Initialize Submission Pack"
        size="md"
      >
        <form onSubmit={handleCreatePack} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Pack Title *</label>
            <Input
              value={newPackTitle}
              onChange={(e) => setNewPackTitle(e.target.value)}
              placeholder="e.g. Qatar National Day 2026 - Main Technical Submission Pack"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Envelope Type</label>
              <Select value={newPackEnvelope} onChange={(e) => setNewPackEnvelope(e.target.value)}>
                <option value="technical">Technical Envelope</option>
                <option value="commercial">Commercial Envelope</option>
                <option value="administrative_eligibility">Administrative / Eligibility Envelope</option>
              </Select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Tender Reference</label>
              <Input
                value={newPackTenderRef}
                onChange={(e) => setNewPackTenderRef(e.target.value)}
                placeholder="e.g. TND-QND-2026-009"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={() => setIsNewPackModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={isSubmittingPack}>
              {isSubmittingPack ? 'Creating...' : 'Initialize Pack'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 8. Authorized Test Mark Modal */}
      <Modal
        isOpen={isStampModalOpen}
        onClose={() => setIsStampModalOpen(false)}
        title="Apply Authorized Test Stamp / Signature"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ padding: '10px', backgroundColor: '#fef3c7', borderRadius: '6px', fontSize: '12px', color: '#f59e0b' }}>
            ⚠️ <strong>Synthetic Mark Policy:</strong> In-engine marks apply clearly synthetic test stamps (`TEST_STAMP_AUTHORIZED`). No real executive signatures are ever generated without live key authorization.
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Select Authorized Asset</label>
            <Select value={selectedMarkAsset} onChange={(e) => setSelectedMarkAsset(e.target.value)}>
              <option value="TEST_STAMP_AUTHORIZED">TEST_STAMP_AUTHORIZED (E3 Operations Seal)</option>
              <option value="TEST_SIGNATURE_MOCK">TEST_SIGNATURE_MOCK (Authorized Signatory Mock)</option>
            </Select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Signatory Name</label>
              <Input value={signatoryName} onChange={(e) => setSignatoryName(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Authority Role</label>
              <Input value={signatoryAuthority} onChange={(e) => setSignatoryAuthority(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Apply to Output Page</label>
            <Input
              type="number"
              min={1}
              value={stampPage}
              onChange={(e) => setStampPage(parseInt(e.target.value, 10) || 1)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={() => setIsStampModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleApplyMarks} disabled={isApplyingMark}>
              {isApplyingMark ? 'Applying...' : 'Apply Test Mark'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 9. Issue Transmittal Modal */}
      <Modal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        title="Issue Sealed Submission Pack Transmittal"
        size="md"
      >
        <form onSubmit={handleIssuePack} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Recipient Organisation *</label>
            <Input
              value={issueRecipientOrg}
              onChange={(e) => setIssueRecipientOrg(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Recipient Name</label>
              <Input value={issueRecipientName} onChange={(e) => setIssueRecipientName(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Recipient Email</label>
              <Input type="email" value={issueRecipientEmail} onChange={(e) => setIssueRecipientEmail(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Delivery Channel</label>
            <Select value={issueChannel} onChange={(e) => setIssueChannel(e.target.value)}>
              <option value="formal_portal_upload">Formal Client Portal Upload</option>
              <option value="secure_email">Encrypted Email Transmittal</option>
              <option value="physical_courier">Hand Delivered Physical Courier</option>
            </Select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={() => setIsIssueModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={isSubmittingIssue}>
              {isSubmittingIssue ? 'Issuing...' : 'Issue Formal Transmittal'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 10. Record Receipt Modal */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title="Record Official Client Submission Receipt"
        size="md"
      >
        <form onSubmit={handleRecordReceipt} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Receipt / Acknowledgement Reference *</label>
            <Input
              value={receiptRef}
              onChange={(e) => setReceiptRef(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Acknowledging Officer / Committee</label>
            <Input
              value={receiptOfficer}
              onChange={(e) => setReceiptOfficer(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Official Receipt Notes</label>
            <Textarea
              value={receiptNotes}
              onChange={(e) => setReceiptNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={() => setIsReceiptModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={isSubmittingReceipt}>
              {isSubmittingReceipt ? 'Recording...' : 'Bind Receipt to Hash'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 11. Client Review Share Modal */}
      <Modal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setGeneratedShareLink(null);
        }}
        title="Create Secure Client Review Share Link"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ padding: '12px', backgroundColor: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '6px', fontSize: '12px', color: '#22c55e' }}>
            🛡️ <strong>Zero Margin Leakage Guaranteed:</strong> All internal buy-rates, unit costs, profit margins, and internal comments are permanently redacted from client-shared snapshots.
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Recipient Client Email</label>
            <Input
              type="email"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>Watermark Text</label>
            <Input
              value={shareWatermark}
              onChange={(e) => setShareWatermark(e.target.value)}
            />
          </div>

          {generatedShareLink ? (
            <div style={{ padding: '12px', backgroundColor: 'var(--surface-2, #151e2e)', borderRadius: '6px', border: '1px solid var(--border-default, #2a374b)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7', marginBottom: '4px' }}>
                Secure Review Link (Expires in 72h):
              </div>
              <code style={{ fontSize: '12px', wordBreak: 'break-all', color: 'var(--text-primary, #f8fafc)' }}>
                {window.location.origin}{generatedShareLink}
              </code>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <Button variant="secondary" onClick={() => setIsShareModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleCreateShare} disabled={isGeneratingShare}>
                {isGeneratingShare ? 'Generating...' : 'Generate Review Link'}
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
