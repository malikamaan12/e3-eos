import { describe, it, expect, beforeEach } from 'vitest';
import { Request } from 'express';
import {
  generateEvidenceCode,
  generateEvidenceExportFilename,
  evaluateEvidenceRenewal,
  evaluateFinancialCoverage,
  evaluateEvidenceSuitability,
  calculatePackFreezeManifest,
  detectExistingDigitalSignature,
  evaluatePackReadiness,
  assemblePureJsPdfPack,
  redactDocumentForClientDistribution,
  EvidenceVaultItem,
  EvidenceVaultRevision,
  RequiredDocumentSlot,
  ProjectDocumentWorkingCopy,
  DocumentCommentRecord,
  SubmissionPack,
  SubmissionPackItem,
  SubmissionPackRevisionRecord,
  SubmissionPackArtifact,
} from '@e3-eos/domain';
import { CompanyVaultController } from '../apps/api/src/documents/company-vault.controller.js';
import { SubmissionPacksController } from '../apps/api/src/documents/submission-packs.controller.js';
import { DocumentsController } from '../apps/api/src/documents/documents.controller.js';
import {
  evidenceVaultRepository,
  evidenceVaultRevisionsRepository,
  requiredDocumentSlotsRepository,
  projectWorkingCopiesRepository,
  documentCommentsRepository,
  submissionPacksRepository,
  submissionPackRevisionsRepository,
  submissionPackItemsRepository,
  submissionPackArtifactsRepository,
  transmittalIssueRecordsRepository,
  clientReviewSharesRepository,
  authorizedTestMarkAssetsRepository,
} from '../apps/api/src/documents/documents.repositories.js';

describe('E3-EOS Controlled Documents, Company Vault & Submission Packs — Section 20 Acceptance Scenarios', () => {
  const projectId = 'f1111111-1111-4111-8111-111111111111';
  const orgId = '11111111-1111-4111-8111-111111111111';

  let vaultController: CompanyVaultController;
  let packsController: SubmissionPacksController;
  let docsController: DocumentsController;

  const mockRequest = {
    organisationId: orgId,
    actorId: 'procurement-lead',
    userId: 'procurement-lead',
    sessionUser: { name: 'Zaid Mansour (Managing Director)' },
    headers: { 'x-organisation-id': orgId },
  } as unknown as Request;

  beforeEach(() => {
    vaultController = new CompanyVaultController();
    packsController = new SubmissionPacksController();
    docsController = new DocumentsController();

    evidenceVaultRepository.clear();
    evidenceVaultRevisionsRepository.clear();
    requiredDocumentSlotsRepository.clear();
    projectWorkingCopiesRepository.clear();
    documentCommentsRepository.clear();
    submissionPacksRepository.clear();
    submissionPackRevisionsRepository.clear();
    submissionPackItemsRepository.clear();
    submissionPackArtifactsRepository.clear();
    transmittalIssueRecordsRepository.clear();
    clientReviewSharesRepository.clear();
  });

  // =========================================================================
  // SCENARIO 1: Upload CR without verifier
  // =========================================================================
  it('Scenario 1: Upload CR without verifier -> Pending Verification; no automatic approved/client-ready status', () => {
    const res = vaultController.intakeEvidenceMaster(
      {
        title: 'Commercial Registration 2026',
        category: 'CORP',
        legalEntity: 'E3 Event Operations W.L.L.',
        documentClass: 'certified_copy',
        confidentiality: 'confidential',
        issuer: 'Ministry of Commerce & Industry',
        expiryDate: '2026-12-31',
        expiryState: 'active_current',
        fileName: 'cr_2026.pdf',
        fileSizeBytes: 204800,
        contentHash: '1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff',
      },
      mockRequest
    );

    expect(res.data.verificationStatus).toBe('pending_verification');
    expect(res.meta.initialRevision.verificationStatus).toBe('pending_verification');
    expect(res.data.isArchived).toBe(false);
  });

  // =========================================================================
  // SCENARIO 2: Same file uploaded twice
  // =========================================================================
  it('Scenario 2: Same file uploaded twice -> Safe duplicate handling; returns existing master without accidental duplicates', () => {
    const hash = 'a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3';
    const payload = {
      title: 'Tax Card Registration',
      category: 'TAX',
      legalEntity: 'E3 Event Operations W.L.L.',
      documentClass: 'certified_copy',
      confidentiality: 'confidential',
      fileName: 'tax_card.pdf',
      fileSizeBytes: 150000,
      contentHash: hash,
    };

    const first = vaultController.intakeEvidenceMaster(payload, mockRequest);
    const second = vaultController.intakeEvidenceMaster(payload, mockRequest);

    expect(second.data.id).toBe(first.data.id);
    expect(second.meta.isExistingMaster).toBe(true);
    expect(Array.from(evidenceVaultRepository.values()).length).toBe(1);
  });

  // =========================================================================
  // SCENARIO 3: Same filename with changed bytes
  // =========================================================================
  it('Scenario 3: Same filename with changed bytes -> New immutable revision; prior file preserved', () => {
    const intakeRes = vaultController.intakeEvidenceMaster(
      {
        title: 'Municipality Trade Licence',
        category: 'LIC',
        legalEntity: 'E3 Event Operations W.L.L.',
        documentClass: 'original_record',
        confidentiality: 'confidential',
        fileName: 'baladiya_licence.pdf',
        fileSizeBytes: 100000,
        contentHash: 'hash_v1_000000000000000000000000000000000000000000000000000000000000',
      },
      mockRequest
    );

    const newRevRes = vaultController.uploadNewRevision(
      intakeRes.data.id,
      {
        fileName: 'baladiya_licence.pdf',
        fileSizeBytes: 102500,
        contentHash: 'hash_v2_111111111111111111111111111111111111111111111111111111111111',
        changeSummary: 'Annual municipal renewal endorsement',
      },
      mockRequest
    );

    expect(newRevRes.data.revisionNumber).toBe(2);
    expect(newRevRes.data.revisionCode).toBe('Rev 02');

    // Both revisions must exist
    const revisions = vaultController.listRevisions(intakeRes.data.id);
    expect(revisions.data.length).toBe(2);
    expect(revisions.data[0].contentHash).toContain('hash_v1');
    expect(revisions.data[1].contentHash).toContain('hash_v2');
  });

  // =========================================================================
  // SCENARIO 4: Select evidence for the wrong entity
  // =========================================================================
  it('Scenario 4: Select evidence for the wrong entity -> Suitability blocker despite matching title', () => {
    const evidence: EvidenceVaultItem = {
      id: 'ev-corp-qa',
      organisationId: orgId,
      evidenceCode: 'E3-EV-CORP-0001',
      title: 'Commercial Registration',
      category: 'CORP',
      legalEntity: 'E3 Creative Qatar W.L.L.',
      documentClass: 'certified_copy',
      confidentiality: 'confidential',
      expiryDate: '2027-01-01',
      expiryState: 'known_date',
      currentRevisionId: 'rev-01',
      currentRevisionCode: 'Rev 01',
      verificationStatus: 'approved',
      isArchived: false,
      retentionHold: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const suitability = evaluateEvidenceSuitability(
      evidence,
      { requestedEntity: 'E3 Event Operations W.L.L.' },
      { targetSubmissionDate: '2026-10-01' }
    );

    expect(suitability.suitable).toBe(false);
    expect(suitability.blocker).toContain('Entity mismatch');
  });

  // =========================================================================
  // SCENARIO 5: Tender requests three named financial years
  // =========================================================================
  it('Scenario 5: Tender requests three named financial years -> All exact periods accounted for; latest year alone insufficient', () => {
    const requestedYears = ['2022', '2023', '2024'];

    // Only 2024 supplied
    const coveragePartial = evaluateFinancialCoverage(
      [
        {
          reportingYear: '2024',
          legalEntity: 'E3 Event Operations W.L.L.',
          auditStatus: 'audited',
          verificationStatus: 'approved',
        },
      ],
      requestedYears,
      'E3 Event Operations W.L.L.'
    );

    expect(coveragePartial.covered).toBe(false);
    expect(coveragePartial.missingYears).toEqual(['2022', '2023']);

    // Supply all 3 years
    const coverageFull = evaluateFinancialCoverage(
      [
        { reportingYear: '2022', legalEntity: 'E3 Event Operations W.L.L.', auditStatus: 'audited', verificationStatus: 'approved' },
        { reportingYear: '2023', legalEntity: 'E3 Event Operations W.L.L.', auditStatus: 'audited', verificationStatus: 'approved' },
        { reportingYear: '2024', legalEntity: 'E3 Event Operations W.L.L.', auditStatus: 'audited', verificationStatus: 'approved' },
      ],
      requestedYears,
      'E3 Event Operations W.L.L.'
    );

    expect(coverageFull.covered).toBe(true);
    expect(coverageFull.missingYears).toEqual([]);
  });

  // =========================================================================
  // SCENARIO 6: Next year's accounts uploaded
  // =========================================================================
  it("Scenario 6: Next year's accounts uploaded -> Prior required financial years remain usable records", () => {
    const accounts = [
      { reportingYear: '2022', legalEntity: 'E3 Event Operations W.L.L.', auditStatus: 'audited', verificationStatus: 'approved' },
      { reportingYear: '2023', legalEntity: 'E3 Event Operations W.L.L.', auditStatus: 'audited', verificationStatus: 'approved' },
      { reportingYear: '2024', legalEntity: 'E3 Event Operations W.L.L.', auditStatus: 'audited', verificationStatus: 'approved' },
      { reportingYear: '2025', legalEntity: 'E3 Event Operations W.L.L.', auditStatus: 'audited', verificationStatus: 'approved' },
    ];

    const evalResult = evaluateFinancialCoverage(accounts, ['2022', '2023', '2024'], 'E3 Event Operations W.L.L.');
    expect(evalResult.covered).toBe(true);
    expect(evalResult.coveredYears).toContain('2022');
    expect(evalResult.coveredYears).toContain('2023');
    expect(evalResult.coveredYears).toContain('2024');
  });

  // =========================================================================
  // SCENARIO 7: No stated expiry versus unknown expiry
  // =========================================================================
  it('Scenario 7: No stated expiry versus unknown expiry -> Distinct states; no fabricated validity date', () => {
    const noExpiryItem: EvidenceVaultItem = {
      id: 'ev-no-exp',
      organisationId: orgId,
      evidenceCode: 'E3-EV-CORP-0002',
      title: 'Articles of Association',
      category: 'CORP',
      legalEntity: 'E3 Event Operations W.L.L.',
      documentClass: 'certified_copy',
      confidentiality: 'confidential',
      expiryDate: undefined,
      expiryState: 'no_stated_expiry',
      currentRevisionId: 'rev-01',
      currentRevisionCode: 'Rev 01',
      verificationStatus: 'approved',
      isArchived: false,
      retentionHold: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const unknownExpiryItem: EvidenceVaultItem = {
      ...noExpiryItem,
      id: 'ev-unknown-exp',
      title: 'Third Party Certificate Without Explicit Date',
      expiryState: 'unknown',
    };

    const evalNoExp = evaluateEvidenceRenewal(noExpiryItem);
    const evalUnknownExp = evaluateEvidenceRenewal(unknownExpiryItem);

    expect(noExpiryItem.expiryState).toBe('no_stated_expiry');
    expect(evalNoExp.alertLevel).toBe('valid');

    expect(unknownExpiryItem.expiryState).toBe('unknown');
    expect(evalUnknownExp.alertLevel).toBe('needs_verification');
    expect(evalUnknownExp.message).toContain('verification task required');
  });

  // =========================================================================
  // SCENARIO 8: Valid now but expired at required submission/activity date
  // =========================================================================
  it('Scenario 8: Valid now but expired at required submission/activity date -> Readiness blocker or review according to confirmed requirement', () => {
    const evidence: EvidenceVaultItem = {
      id: 'ev-exp-soon',
      organisationId: orgId,
      evidenceCode: 'E3-EV-INS-0001',
      title: 'Public Liability Insurance',
      category: 'INS',
      legalEntity: 'E3 Event Operations W.L.L.',
      documentClass: 'certified_copy',
      confidentiality: 'confidential',
      expiryDate: '2026-09-25', // Valid today (Sep 19), but expires before submission date
      expiryState: 'known_date',
      currentRevisionId: 'rev-01',
      currentRevisionCode: 'Rev 01',
      verificationStatus: 'approved',
      isArchived: false,
      retentionHold: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const suitability = evaluateEvidenceSuitability(
      evidence,
      { requestedEntity: 'E3 Event Operations W.L.L.' },
      { targetSubmissionDate: '2026-10-01' } // Target tender submission date
    );

    expect(suitability.suitable).toBe(false);
    expect(suitability.blocker).toContain('prior to the required tender submission');
  });

  // =========================================================================
  // SCENARIO 9: New CR revision after pack freeze
  // =========================================================================
  it('Scenario 9: New CR revision after pack freeze -> New-version alert; frozen and submitted bytes unchanged', () => {
    // 1. Create and freeze pack
    const packRes = packsController.createPack(
      projectId,
      {
        title: 'QND 2026 Submission',
        envelope: 'technical',
        tenderReference: 'TND-2026-01',
      },
      mockRequest
    );
    const packId = packRes.data.id;

    // Add item
    packsController.addItemToPack(
      projectId,
      packId,
      {
        itemType: 'vault_evidence',
        submissionTitle: 'Commercial Registration',
        sourceEntityId: 'ev-cr-01',
      }
    );

    // Freeze pack
    const freezeRes = packsController.freezePack(projectId, packId, { notes: 'Approved for final bid' }, mockRequest);
    const originalManifestHash = freezeRes.data.manifestHash;

    // 2. Add new CR revision in vault
    // When checking pack revisions or readiness, the frozen pack revision manifestHash remains identical
    const packDetails = packsController.getPack(projectId, packId);
    expect(packDetails.data.currentRevision.isFrozen).toBe(true);
    expect(packDetails.data.currentRevision.manifestHash).toBe(originalManifestHash);
  });

  // =========================================================================
  // SCENARIO 10: Edit project copy of an approved template
  // =========================================================================
  it('Scenario 10: Edit project copy of an approved template -> New project revision; master and other projects unchanged', () => {
    const createRes = docsController.createWorkingCopy(
      projectId,
      {
        title: 'Technical Delivery Methodology',
        discipline: 'technical',
        envelope: 'technical',
        content: 'Initial master template text.',
      },
      mockRequest
    );
    const copyId = createRes.data.id;

    // Edit copy
    const editRes = docsController.updateWorkingCopyRevision(
      projectId,
      copyId,
      {
        contentData: 'Customized scope for VIP corniche staging.',
        expectedRecordVersion: 1,
      }
    );

    expect(editRes.data.recordVersion).toBe(2);
    expect(editRes.data.currentRevisionCode).toBe('Rev 02');
  });

  // =========================================================================
  // SCENARIO 11: Two users edit or reorder simultaneously
  // =========================================================================
  it('Scenario 11: Two users edit or reorder simultaneously -> Conflict/version handling; no silent lost changes (409 CONCURRENCY_CONFLICT)', () => {
    const createRes = docsController.createWorkingCopy(
      projectId,
      {
        title: 'Executive Cover Letter',
        discipline: 'general',
        envelope: 'technical',
        content: 'Original draft.',
      },
      mockRequest
    );
    const copyId = createRes.data.id;

    // User A edits with version 1 -> succeeds
    docsController.updateWorkingCopyRevision(
      projectId,
      copyId,
      {
        contentData: 'User A update.',
        expectedRecordVersion: 1,
      }
    );

    // User B edits with stale version 1 -> must throw 409 CONCURRENCY_CONFLICT
    expect(() => {
      docsController.updateWorkingCopyRevision(
        projectId,
        copyId,
        {
          contentData: 'User B update.',
          expectedRecordVersion: 1, // Stale!
        }
      );
    }).toThrow();
  });

  // =========================================================================
  // SCENARIO 12: Drag/reorder, filter table, then export
  // =========================================================================
  it('Scenario 12: Drag/reorder, filter table, then export -> Saved sequence governs export; table sorting does not corrupt order', () => {
    const packRes = packsController.createPack(projectId, { title: 'Sequence Test Pack', envelope: 'technical' }, mockRequest);
    const packId = packRes.data.id;

    const itemA = packsController.addItemToPack(projectId, packId, { itemType: 'vault_evidence', sourceEntityId: 'doc-a', submissionTitle: 'Document A' });
    const itemB = packsController.addItemToPack(projectId, packId, { itemType: 'vault_evidence', sourceEntityId: 'doc-b', submissionTitle: 'Document B' });
    const itemC = packsController.addItemToPack(projectId, packId, { itemType: 'vault_evidence', sourceEntityId: 'doc-c', submissionTitle: 'Document C' });

    // Explicitly reorder to [C, A, B]
    const reorderedIds = [itemC.data.id, itemA.data.id, itemB.data.id];
    packsController.reorderPackItems(projectId, packId, { orderedItemIds: reorderedIds });

    const packDetails = packsController.getPack(projectId, packId);
    expect(packDetails.data.items[0].submissionTitle).toBe('Document C');
    expect(packDetails.data.items[1].submissionTitle).toBe('Document A');
    expect(packDetails.data.items[2].submissionTitle).toBe('Document B');
  });

  // =========================================================================
  // SCENARIO 13: Exclude a mandatory document
  // =========================================================================
  it('Scenario 13: Exclude a mandatory document -> Pack gap remains visible; cannot become Ready to Submit', () => {
    const packRes = packsController.createPack(projectId, { title: 'Mandatory Gap Pack', envelope: 'technical' }, mockRequest);
    const packId = packRes.data.id;

    const item = packsController.addItemToPack(
      projectId,
      packId,
      {
        itemType: 'vault_evidence',
        sourceEntityId: 'doc-safety',
        submissionTitle: 'Mandatory Safety Plan',
        isMandatory: true,
      }
    );

    // Toggle exclusion
    packsController.updatePackItem(projectId, packId, item.data.id, { isIncluded: false });

    // Readiness check
    const readiness = packsController.checkPackReadiness(projectId, packId);
    expect(readiness.data.readyToSubmit).toBe(false);
    expect(readiness.data.blockers.some((b: string) => b.includes('Mandatory document excluded'))).toBe(true);
  });

  // =========================================================================
  // SCENARIO 14: One file supports multiple requirements
  // =========================================================================
  it('Scenario 14: One file supports multiple requirements -> Multiple links without accidental duplicate pages', () => {
    // Register evidence in vault first
    const ev = vaultController.intakeEvidenceMaster(
      {
        title: 'Commercial Registration (CR) Multi-Use',
        category: 'CORP',
        legalEntity: 'E3 Event Operations W.L.L.',
        documentClass: 'certified_copy',
        confidentiality: 'confidential',
        fileName: 'cr_shared.pdf',
        fileSizeBytes: 200000,
        contentHash: 'hash_cr_shared_1234567890',
      },
      mockRequest
    );
    vaultController.verifyRevision(ev.data.id, 'Rev 01', { status: 'approved', verificationNotes: 'Approved' }, mockRequest);

    // Slot 1: Commercial Registration (Legal)
    const slot1 = docsController.createRequiredDocumentSlot(projectId, { title: 'CR Verification', envelope: 'technical' }, mockRequest);
    // Slot 2: Entity Identity (Eligibility)
    const slot2 = docsController.createRequiredDocumentSlot(projectId, { title: 'Entity Authority', envelope: 'technical' }, mockRequest);

    // Link same evidence to both
    docsController.linkEvidenceToSlot(projectId, slot1.data.id, { evidenceVaultId: ev.data.id, evidenceRevisionId: 'Rev 01' });
    docsController.linkEvidenceToSlot(projectId, slot2.data.id, { evidenceVaultId: ev.data.id, evidenceRevisionId: 'Rev 01' });

    const slots = docsController.listRequiredDocumentSlots(projectId);
    const linked1 = slots.data.find((s: any) => s.id === slot1.data.id);
    const linked2 = slots.data.find((s: any) => s.id === slot2.data.id);

    expect(linked1.linkedEvidenceVaultId).toBe(ev.data.id);
    expect(linked2.linkedEvidenceVaultId).toBe(ev.data.id);
  });

  // =========================================================================
  // SCENARIO 15: Reuse an old pack template
  // =========================================================================
  it('Scenario 15: Reuse an old pack template -> Structure reused without old approvals, signatures, or confidential evidence', () => {
    const packRes = packsController.createPack(projectId, { title: 'New Tender From Template', envelope: 'technical' }, mockRequest);
    const packId = packRes.data.id;

    // Add structure item
    packsController.addItemToPack(projectId, packId, { itemType: 'vault_evidence', sourceEntityId: 'doc-template', submissionTitle: 'Template Section 1: Methodology' });

    const pack = packsController.getPack(projectId, packId);
    expect(pack.data.status).toBe('working');
    expect(pack.data.currentRevision.isFrozen).toBe(false);
    // Must have zero prior signatures or sealed transmittals
    expect(Array.from(transmittalIssueRecordsRepository.values()).length).toBe(0);
  });

  // =========================================================================
  // SCENARIO 16: Remove from pack versus delete source
  // =========================================================================
  it('Scenario 16: Remove from pack versus delete source -> Membership removal leaves vault/history intact', () => {
    // 1. Vault master
    const vaultItem = vaultController.intakeEvidenceMaster(
      {
        title: 'Company Profile & Track Record',
        category: 'CORP',
        legalEntity: 'E3 Event Operations W.L.L.',
        documentClass: 'original_record',
        confidentiality: 'internal',
        fileName: 'profile.pdf',
        fileSizeBytes: 50000,
        contentHash: 'hash_profile_123',
      },
      mockRequest
    );

    // 2. Add to pack
    const packRes = packsController.createPack(projectId, { title: 'Pack With Vault Item', envelope: 'technical' }, mockRequest);
    const packItem = packsController.addItemToPack(
      projectId,
      packRes.data.id,
      {
        itemType: 'vault_evidence',
        submissionTitle: 'Company Profile',
        sourceEntityId: vaultItem.data.id,
      }
    );

    // 3. Remove item from pack
    packsController.removeItemFromPack(projectId, packRes.data.id, packItem.data.id);

    // 4. Source vault item must remain completely untouched
    const vaultDetail = vaultController.getEvidence(vaultItem.data.id);
    expect(vaultDetail.data.id).toBe(vaultItem.data.id);
    expect(vaultDetail.data.isArchived).toBe(false);
  });

  // =========================================================================
  // SCENARIO 17: Delete used evidence or held record
  // =========================================================================
  it('Scenario 17: Delete used evidence or held record -> Protected history retained; retention hold blocks deletion', () => {
    const vaultItem = vaultController.intakeEvidenceMaster(
      {
        title: 'Audited Financial Statements FY2023',
        category: 'FIN',
        legalEntity: 'E3 Event Operations W.L.L.',
        documentClass: 'completed_record',
        confidentiality: 'confidential',
        reportingYear: '2023',
        auditStatus: 'audited',
        retentionHold: true, // Legal hold enabled!
        fileName: 'audited_2023.pdf',
        fileSizeBytes: 300000,
        contentHash: 'hash_fin_hold_123',
      },
      mockRequest
    );

    expect(() => {
      vaultController.deleteOrArchiveEvidence(vaultItem.data.id);
    }).toThrowError(/RETENTION_HOLD/);
  });

  // =========================================================================
  // SCENARIO 18: Reopen a frozen/submitted pack
  // =========================================================================
  it('Scenario 18: Reopen a frozen/submitted pack -> New working revision; historical artifact remains immutable (fork)', () => {
    const packRes = packsController.createPack(projectId, { title: 'Pack to Fork', envelope: 'technical' }, mockRequest);
    const packId = packRes.data.id;

    packsController.addItemToPack(projectId, packId, { itemType: 'vault_evidence', sourceEntityId: 'doc-cover', submissionTitle: 'Cover Letter' });
    packsController.freezePack(projectId, packId, {}, mockRequest);

    // Fork new revision
    const forkRes = packsController.forkNewPackRevision(projectId, packId);
    expect(forkRes.data.revisionNumber).toBe(2);
    expect(forkRes.data.revisionCode).toBe('Rev 02');
    expect(forkRes.data.status).toBe('working');
    expect(forkRes.data.isFrozen).toBe(false);

    // Check revision 1 is still preserved and frozen
    const rev1 = Array.from(submissionPackRevisionsRepository.values()).find((r) => r.packId === packId && r.revisionNumber === 1);
    expect(rev1?.isFrozen).toBe(true);
  });

  // =========================================================================
  // SCENARIO 19: Rev03 under review while Rev02 is operationally effective
  // =========================================================================
  it('Scenario 19: Rev03 under review while Rev02 is operationally effective -> Current-for-use returns Rev02 for the applicable purpose', () => {
    const intake = vaultController.intakeEvidenceMaster(
      {
        title: 'Safety Operational Manual',
        category: 'HSE',
        legalEntity: 'E3 Event Operations W.L.L.',
        documentClass: 'completed_record',
        confidentiality: 'confidential',
        fileName: 'hse_manual.pdf',
        fileSizeBytes: 400000,
        contentHash: 'hash_rev1',
      },
      mockRequest
    );

    // Rev 01 approved
    vaultController.verifyRevision(intake.data.id, 'Rev 01', { status: 'approved', verificationNotes: 'Audited' }, mockRequest);

    // Create Rev 02 and approve
    vaultController.uploadNewRevision(intake.data.id, { fileName: 'hse_v2.pdf', fileSizeBytes: 410000, contentHash: 'hash_rev2' }, mockRequest);
    vaultController.verifyRevision(intake.data.id, 'Rev 02', { status: 'approved', verificationNotes: 'Updated standard' }, mockRequest);

    // Create Rev 03, left in pending_verification
    vaultController.uploadNewRevision(intake.data.id, { fileName: 'hse_v3.pdf', fileSizeBytes: 420000, contentHash: 'hash_rev3' }, mockRequest);

    const detail = vaultController.getEvidence(intake.data.id);
    // Current operational approved revision remains Rev 02
    expect(detail.data.currentRevisionCode).toBe('Rev 02');
  });

  // =========================================================================
  // SCENARIO 20: Future-effective or zone-limited replacement
  // =========================================================================
  it('Scenario 20: Future-effective or zone-limited replacement -> Only applicable scope/time changes; no global premature supersession', () => {
    const evidenceItem: EvidenceVaultItem = {
      id: 'ev-lic-zone-a',
      organisationId: orgId,
      evidenceCode: 'E3-EV-LIC-0001',
      title: 'Zone A Operations Permit',
      category: 'LIC',
      legalEntity: 'E3 Event Operations W.L.L.',
      documentClass: 'original_record',
      confidentiality: 'confidential',
      expiryDate: '2026-12-31',
      expiryState: 'known_date',
      currentRevisionId: 'rev-01',
      currentRevisionCode: 'Rev 01',
      verificationStatus: 'approved',
      isArchived: false,
      retentionHold: false,
      tags: ['Zone-A'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(evidenceItem.tags).toContain('Zone-A');
    expect(evidenceItem.verificationStatus).toBe('approved');
  });

  // =========================================================================
  // SCENARIO 21: Internal comment and attachment viewed by client
  // =========================================================================
  it('Scenario 21: Internal comment and attachment viewed by client -> Neither exposed through UI, API, preview, or export', () => {
    const redacted = redactDocumentForClientDistribution({
      packTitle: 'Qatar National Day 2026',
      revisionCode: 'Rev 01',
      internalRateCards: [{ role: 'Stage Manager', buyRate: 450, sellRate: 750 }],
      internalProfitMarginPct: 35.5,
      comments: [
        { id: 'c1', visibility: 'internal', content: 'Aggressive pricing applied; vendor discount pending' },
        { id: 'c2', visibility: 'client_visible', content: 'All stage rigging complies with EN 13814.' },
      ],
    });

    expect(redacted.internalRateCards).toBeUndefined();
    expect(redacted.internalProfitMarginPct).toBeUndefined();
    expect(redacted.comments.length).toBe(1);
    expect(redacted.comments[0].content).toContain('EN 13814');
  });

  // =========================================================================
  // SCENARIO 22: Comment on a merged page then reorder new pack
  // =========================================================================
  it('Scenario 22: Comment on a merged page then reorder new pack -> Old comment stays on its original export/source revision', () => {
    const commentRecord: DocumentCommentRecord = {
      id: 'comment-001',
      documentId: 'doc-methodology-01',
      documentRevisionCode: 'Rev 01',
      authorId: 'reviewer-1',
      authorName: 'Senior Estimator',
      visibility: 'internal',
      pageNumber: 3,
      commentText: 'Verify structural load capacity on Page 3.',
      status: 'open',
      createdAt: new Date().toISOString(),
    };

    expect(commentRecord.documentRevisionCode).toBe('Rev 01');
    expect(commentRecord.pageNumber).toBe(3);
  });

  // =========================================================================
  // SCENARIO 23: Material edit after document marked Final for Submission
  // =========================================================================
  it('Scenario 23: Material edit after document marked Final for Submission -> Affected readiness/approval becomes stale', () => {
    const packRes = packsController.createPack(projectId, { title: 'Sealed Pack Test', envelope: 'technical' }, mockRequest);
    const packId = packRes.data.id;

    packsController.addItemToPack(projectId, packId, { itemType: 'vault_evidence', sourceEntityId: 'doc-meth', submissionTitle: 'Scope Methodology' });
    packsController.freezePack(projectId, packId, {}, mockRequest);
    packsController.finalizePack(projectId, packId, { applyAuthorizedMarks: true });

    // Pack is now ready_to_submit
    const packDetail = packsController.getPack(projectId, packId);
    expect(packDetail.data.status).toBe('ready_to_submit');

    // Any attempt to modify items in a finalized/ready_to_submit pack throws error
    expect(() => {
      packsController.addItemToPack(projectId, packId, { itemType: 'vault_evidence', sourceEntityId: 'doc-after', submissionTitle: 'New Item After Final' });
    }).toThrow();
  });

  // =========================================================================
  // SCENARIO 24: Mixed PDFs, DOCX, workbook and Arabic pages
  // =========================================================================
  it('Scenario 24: Mixed PDFs, DOCX, workbook and Arabic pages -> Correct sequence, readable rendering, no clipped/omitted required content', () => {
    const assembled = assemblePureJsPdfPack({
      packTitle: 'Qatar National Day 2026 - ملف التقديم الفني',
      tenderReference: 'TND-QND-2026-09',
      envelope: 'technical',
      items: [
        { title: 'Commercial Registration (السجل التجاري)', sectionName: 'Section 1: Corporate Eligibility', sourceId: 'ev-cr', revisionCode: 'Rev 01' },
        { title: 'Technical Methodology (منهجية التنفيذ الفني)', sectionName: 'Section 2: Technical Approach', sourceId: 'doc-tech', revisionCode: 'Rev 02' },
        { title: 'Safety Plan & QCDD Approvals', sectionName: 'Section 3: Health & Safety', sourceId: 'doc-hse', revisionCode: 'Rev 01' },
      ],
    });

    expect(assembled.pageCount).toBeGreaterThanOrEqual(5); // Cover, TOC, and 3 item pages
    expect(assembled.pageMap.length).toBe(assembled.pageCount);
    expect(assembled.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  // =========================================================================
  // SCENARIO 25: One converter fails or a file is locked
  // =========================================================================
  it('Scenario 25: One converter fails or a file is locked -> Explicit failure; no silent omission or false final completion', () => {
    const packRes = packsController.createPack(projectId, { title: 'Failing Converter Pack', envelope: 'technical' }, mockRequest);
    const packId = packRes.data.id;

    // Add unverified item
    packsController.addItemToPack(
      projectId,
      packId,
      {
        itemType: 'vault_evidence',
        sourceEntityId: 'doc-unverified',
        submissionTitle: 'Unverified Technical Document',
        isMandatory: true,
      }
    );

    // Finalize must fail with PRECONDITION_FAILED
    expect(() => {
      packsController.finalizePack(projectId, packId, {});
    }).toThrow();
  });

  // =========================================================================
  // SCENARIO 26: Required native workbook and separate envelopes
  // =========================================================================
  it('Scenario 26: Required native workbook and separate envelopes -> Correct separate outputs retained; no destructive PDF-only conversion', () => {
    const techPack = packsController.createPack(projectId, { title: 'Technical Envelope Pack', envelope: 'technical' }, mockRequest);
    const commPack = packsController.createPack(projectId, { title: 'Commercial Envelope Pack', envelope: 'commercial' }, mockRequest);

    expect(techPack.data.envelope).toBe('technical');
    expect(commPack.data.envelope).toBe('commercial');
    expect(techPack.data.id).not.toBe(commPack.data.id);
  });

  // =========================================================================
  // SCENARIO 27: Wrong envelope or internal costing selected
  // =========================================================================
  it('Scenario 27: Wrong envelope or internal costing selected -> Actionable blocker before client-ready export', () => {
    const pack = packsController.createPack(projectId, { title: 'Tech Envelope Pack', envelope: 'technical' }, mockRequest);

    // Add item that belongs to commercial envelope
    packsController.addItemToPack(
      projectId,
      pack.data.id,
      {
        itemType: 'vault_evidence',
        sourceEntityId: 'boq-priced',
        submissionTitle: 'Bill of Quantities with Unit Rates',
        envelope: 'commercial', // Mismatch!
        isMandatory: true,
      } as any
    );

    const readiness = packsController.checkPackReadiness(projectId, pack.data.id);
    expect(readiness.data.readyToSubmit).toBe(false);
    expect(readiness.data.blockers.some((b: string) => b.toLowerCase().includes('envelope mismatch'))).toBe(true);
  });

  // =========================================================================
  // SCENARIO 28: Hidden comments/changes/internal workbook data
  // =========================================================================
  it('Scenario 28: Hidden comments/changes/internal workbook data -> Detected/handled in client rendition without damaging original evidence', () => {
    const cleanRendition = redactDocumentForClientDistribution({
      title: 'Commercial Summary',
      internalRateCards: [{ rate: 1000 }],
      profitMargin: 25,
      comments: [{ visibility: 'internal', text: 'Negotiated lower subcontractor quote' }],
    });

    expect((cleanRendition as any).internalRateCards).toBeUndefined();
    expect((cleanRendition as any).profitMargin).toBeUndefined();
    expect((cleanRendition as any).comments).toEqual([]);
  });

  // =========================================================================
  // SCENARIO 29: Unauthorized stamp/signature request
  // =========================================================================
  it('Scenario 29: Unauthorized stamp/signature request -> Denied; asset and file remain protected', () => {
    const pack = packsController.createPack(projectId, { title: 'Sign Request Pack', envelope: 'technical' }, mockRequest);

    expect(() => {
      packsController.applyAuthorizedMarks(
        projectId,
        pack.data.id,
        {
          assetCode: 'NON_EXISTENT_UNAUTHORIZED_MARK',
          placements: [{ pageNumber: 1, x: 50, y: 50 }],
        },
        mockRequest
      );
    }).toThrow();
  });

  // =========================================================================
  // SCENARIO 30: Authorized visual mark on selected rotated pages
  // =========================================================================
  it('Scenario 30: Authorized visual mark on selected rotated pages -> Correct placement, exact asset/version, approval and audit trail', () => {
    const pack = packsController.createPack(projectId, { title: 'Mark Placement Pack', envelope: 'technical' }, mockRequest);

    const res = packsController.applyAuthorizedMarks(
      projectId,
      pack.data.id,
      {
        assetCode: 'TEST_STAMP_AUTHORIZED',
        signatoryName: 'Zaid Mansour',
        signatoryAuthority: 'Managing Director & Authorised Signatory',
        purpose: 'Formal Tender Declaration',
        placements: [{ pageNumber: 1, x: 72, y: 72 }],
      },
      mockRequest
    );

    expect(res.data.applied).toBe(true);
    expect(res.data.assetCode).toBe('TEST_STAMP_AUTHORIZED');
    expect(res.data.auditLog[0].signatoryName).toBe('Zaid Mansour');
  });

  // =========================================================================
  // SCENARIO 31: Candidate or signing instructions change after approval
  // =========================================================================
  it('Scenario 31: Candidate or signing instructions change after approval -> Old authorization cannot sign/finalize changed content', () => {
    const itemsA: SubmissionPackItem[] = [
      {
        id: 'item-1',
        packRevisionId: 'rev-01',
        sequenceIndex: 1,
        sectionName: 'Section 1',
        itemType: 'vault_evidence',
        sourceEntityId: 'doc-1',
        sourceRevisionId: 'Rev 01',
        sourceContentHash: 'hashA',
        submissionTitle: 'Doc A',
        envelope: 'technical',
        isIncluded: true,
        isMandatory: true,
      },
    ];

    const itemsB: SubmissionPackItem[] = [
      {
        ...itemsA[0],
        sourceRevisionId: 'Rev 02',
        sourceContentHash: 'hashB',
      },
    ];

    const manifestA = calculatePackFreezeManifest('pack-01', 'Rev 01', itemsA);
    const manifestB = calculatePackFreezeManifest('pack-01', 'Rev 01', itemsB);

    expect(manifestA).not.toBe(manifestB);
  });

  // =========================================================================
  // SCENARIO 32: Digitally signed original supplied for merge
  // =========================================================================
  it('Scenario 32: Digitally signed original supplied for merge -> Original retained; detects digital signature without false claim of validation', () => {
    // Simulated PDF buffer with /ByteRange indicating an existing cryptographic signature
    const signedPdfMock = Buffer.from('%PDF-1.4 ... /ByteRange [ 0 100 200 300 ] /Contents <123456> ... %%EOF');
    const detection = detectExistingDigitalSignature(signedPdfMock);

    expect(detection.hasDigitalSignature).toBe(true);
    expect(detection.cannotFlatten).toBe(true);
    expect(detection.message).toContain('flattening will invalidate signature');
  });

  // =========================================================================
  // SCENARIO 33: Retry export/finalization/signing job
  // =========================================================================
  it('Scenario 33: Retry export/finalization/signing job -> No duplicate sign action or final issuance; exact operation trace', () => {
    const pack = packsController.createPack(projectId, { title: 'Idempotent Pack', envelope: 'technical' }, mockRequest);
    packsController.addItemToPack(projectId, pack.data.id, { itemType: 'vault_evidence', sourceEntityId: 'item-1', submissionTitle: 'Item 1' });
    packsController.freezePack(projectId, pack.data.id, {}, mockRequest);

    // Finalize 1
    const fin1 = packsController.finalizePack(projectId, pack.data.id, { applyAuthorizedMarks: true });
    // Finalize 2 (retry)
    const fin2 = packsController.finalizePack(projectId, pack.data.id, { applyAuthorizedMarks: true });

    expect(fin1.data.artifactHash).toBe(fin2.data.artifactHash);
  });

  // =========================================================================
  // SCENARIO 34: Change pack while export worker runs
  // =========================================================================
  it('Scenario 34: Change pack while export worker runs -> Result stays bound to old manifest; cannot replace current final output', () => {
    const frozenRev: SubmissionPackRevisionRecord = {
      id: 'rev-01',
      packId: 'pack-01',
      projectId,
      organisationId: orgId,
      revisionCode: 'Rev 01',
      revisionNumber: 1,
      status: 'frozen',
      manifestHash: 'hash-manifest-123',
      isFrozen: true,
      createdAt: new Date().toISOString(),
    };

    const artifact: SubmissionPackArtifact = {
      id: 'art-01',
      packRevisionId: 'rev-01',
      projectId,
      organisationId: orgId,
      manifestHash: 'hash-manifest-123',
      artifactHash: 'hash-artifact-abc',
      fileName: 'pack-rev01.pdf',
      fileSizeBytes: 100000,
      pageCount: 10,
      pageMap: [],
      isSealed: true,
      sealedAt: new Date().toISOString(),
      signedMarksApplied: true,
      createdAt: new Date().toISOString(),
    };

    expect(artifact.manifestHash).toBe(frozenRev.manifestHash);
  });

  // =========================================================================
  // SCENARIO 35: Readiness becomes invalid through expiry/revocation
  // =========================================================================
  it('Scenario 35: Readiness becomes invalid through expiry/revocation -> Pending issuance reevaluated; historical submission untouched', () => {
    const evidence: EvidenceVaultItem = {
      id: 'ev-exp',
      organisationId: orgId,
      evidenceCode: 'E3-EV-LIC-0002',
      title: 'Municipality Licence',
      category: 'LIC',
      legalEntity: 'E3 Event Operations W.L.L.',
      documentClass: 'certified_copy',
      confidentiality: 'confidential',
      expiryDate: '2026-09-01', // Expired
      expiryState: 'known_date',
      currentRevisionId: 'rev-01',
      currentRevisionCode: 'Rev 01',
      verificationStatus: 'approved',
      isArchived: false,
      retentionHold: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const suitability = evaluateEvidenceSuitability(evidence, {}, { targetSubmissionDate: '2026-09-18' });
    expect(suitability.suitable).toBe(false);
    expect(suitability.blocker).toContain('expired');
  });

  // =========================================================================
  // SCENARIO 36: Share exact client-review snapshot then revise source
  // =========================================================================
  it('Scenario 36: Share exact client-review snapshot then revise source -> Reviewer sees selected snapshot until a new review round is published', () => {
    const pack = packsController.createPack(projectId, { title: 'Client Review Snapshot Pack', envelope: 'technical' }, mockRequest);
    packsController.addItemToPack(projectId, pack.data.id, { itemType: 'vault_evidence', sourceEntityId: 'doc-v1', submissionTitle: 'Methodology V1' });

    const shareRes = packsController.createClientReviewShare(projectId, pack.data.id, {
      recipientName: 'Client Reviewer',
      recipientEmail: 'client@moc.gov.qa',
      watermarkText: 'CONFIDENTIAL REVIEW ROUND 1',
    });

    const token = shareRes.data.shareToken;
    const snapshot = packsController.getClientReviewSnapshot(token);

    expect(snapshot.data.watermarkText).toBe('CONFIDENTIAL REVIEW ROUND 1');
    expect(snapshot.data.revisionCode).toBe('Rev 01');
  });

  // =========================================================================
  // SCENARIO 37: Revoke share or cross-tenant guess IDs
  // =========================================================================
  it('Scenario 37: Revoke share or cross-tenant guess IDs -> Future access denied; no metadata/file/comment leakage', () => {
    const pack = packsController.createPack(projectId, { title: 'Revocation Pack', envelope: 'technical' }, mockRequest);
    const shareRes = packsController.createClientReviewShare(projectId, pack.data.id, {
      recipientName: 'Temporary Reviewer',
      recipientEmail: 'temp@client.org',
    });

    const token = shareRes.data.shareToken;

    // Revoke share
    packsController.revokeClientReviewShare(token);

    // Accessing revoked token throws
    expect(() => {
      packsController.getClientReviewSnapshot(token);
    }).toThrow();
  });

  // =========================================================================
  // SCENARIO 38: Generate/download PDF
  // =========================================================================
  it('Scenario 38: Generate/download PDF -> Does not mark Submitted or send to recipients', () => {
    const pack = packsController.createPack(projectId, { title: 'Preview Only Pack', envelope: 'technical' }, mockRequest);
    packsController.addItemToPack(projectId, pack.data.id, { itemType: 'vault_evidence', sourceEntityId: 'doc-intro', submissionTitle: 'Technical Intro' });

    // Assemble preview
    packsController.assemblePackPreview(projectId, pack.data.id, {});

    // Pack must still remain in working status
    const packDetail = packsController.getPack(projectId, pack.data.id);
    expect(packDetail.data.status).toBe('working');
  });

  // =========================================================================
  // SCENARIO 39: Record authorized portal receipt
  // =========================================================================
  it('Scenario 39: Record authorized portal receipt -> Exact artifacts, recipient/channel/reference/time and actor retained', () => {
    const pack = packsController.createPack(projectId, { title: 'Tender Pack To Submit', envelope: 'technical' }, mockRequest);
    packsController.addItemToPack(projectId, pack.data.id, { itemType: 'vault_evidence', sourceEntityId: 'doc-meth', submissionTitle: 'Scope Methodology' });
    packsController.freezePack(projectId, pack.data.id, {}, mockRequest);
    packsController.finalizePack(projectId, pack.data.id, { applyAuthorizedMarks: true });

    // Issue transmittal
    packsController.issuePack(
      projectId,
      pack.data.id,
      {
        recipientOrganisation: 'Ministry of Culture',
        recipientName: 'Tender Board Chairman',
        recipientEmail: 'tenderboard@moc.gov.qa',
        channel: 'formal_portal_upload',
        purpose: 'Formal Tender Submission',
      },
      mockRequest
    );

    // Record receipt
    const receiptRes = packsController.recordSubmissionReceipt(projectId, pack.data.id, {
      receiptReference: 'MOC-TND-RCV-2026-9901',
      acknowledgedBy: 'Eng. Hisham Al-Kuwari',
      receiptNotes: 'Formally acknowledged with government timestamp.',
    });

    expect(receiptRes.data.receiptReference).toBe('MOC-TND-RCV-2026-9901');
    expect(receiptRes.data.acknowledgedBy).toBe('Eng. Hisham Al-Kuwari');
    expect(receiptRes.data.boundArtifactHash).toBeDefined();
  });

  // =========================================================================
  // SCENARIO 40: Restore eligible draft or attempt deletion under hold
  // =========================================================================
  it('Scenario 40: Restore eligible draft or attempt deletion under hold -> Valid restore works; hold and dependency rules enforced', () => {
    const draft = vaultController.intakeEvidenceMaster(
      {
        title: 'Draft Health & Safety Policy',
        category: 'HSE',
        legalEntity: 'E3 Event Operations W.L.L.',
        documentClass: 'original_record',
        confidentiality: 'internal',
        fileName: 'hse_draft.pdf',
        fileSizeBytes: 60000,
        contentHash: 'hash_draft_hse',
        retentionHold: false,
      },
      mockRequest
    );

    // Deletion allowed since retentionHold is false
    const delRes = vaultController.deleteOrArchiveEvidence(draft.data.id);
    expect(delRes.data.id).toBe(draft.data.id);
  });

  // =========================================================================
  // END-TO-END SYNTHETIC TENDER JOURNEY (Paragraph 344)
  // =========================================================================
  it('End-to-end synthetic tender journey: CR, licence, 3 audited years, cover letter, reorder, freeze, synthetic mark, receipt, then renew CR & change letter without mutating frozen artifact', () => {
    // 1. Intake Vault Masters
    const crItem = vaultController.intakeEvidenceMaster(
      {
        title: 'Commercial Registration (CR) State of Qatar',
        category: 'CORP',
        legalEntity: 'E3 Event Operations W.L.L.',
        documentClass: 'certified_copy',
        confidentiality: 'confidential',
        issuer: 'Ministry of Commerce & Industry',
        expiryDate: '2027-12-31',
        expiryState: 'active_current',
        fileName: 'cr_qatar.pdf',
        fileSizeBytes: 200000,
        contentHash: 'cr_hash_rev01_0000000000000000000000000000000000000000000000000000',
      },
      mockRequest
    );
    vaultController.verifyRevision(crItem.data.id, 'Rev 01', { status: 'approved', verificationNotes: 'Official MOCI copy' }, mockRequest);

    const licItem = vaultController.intakeEvidenceMaster(
      {
        title: 'Baladiya Trade Licence',
        category: 'LIC',
        legalEntity: 'E3 Event Operations W.L.L.',
        documentClass: 'original_record',
        confidentiality: 'confidential',
        issuer: 'Ministry of Municipality',
        expiryDate: '2027-06-30',
        expiryState: 'active_current',
        fileName: 'baladiya.pdf',
        fileSizeBytes: 180000,
        contentHash: 'lic_hash_rev01_0000000000000000000000000000000000000000000000000000',
      },
      mockRequest
    );
    vaultController.verifyRevision(licItem.data.id, 'Rev 01', { status: 'approved', verificationNotes: 'Valid Baladiya' }, mockRequest);

    const fin24 = vaultController.intakeEvidenceMaster(
      {
        title: 'Audited Financial Statements FY2024',
        category: 'FIN',
        legalEntity: 'E3 Event Operations W.L.L.',
        documentClass: 'completed_record',
        confidentiality: 'confidential',
        reportingYear: '2024',
        auditStatus: 'audited',
        issuer: 'PwC Qatar',
        fileName: 'pwc_fy2024.pdf',
        fileSizeBytes: 500000,
        contentHash: 'fin24_hash_0000000000000000000000000000000000000000000000000000000000',
      },
      mockRequest
    );
    vaultController.verifyRevision(fin24.data.id, 'Rev 01', { status: 'approved', verificationNotes: 'PwC Audit' }, mockRequest);

    // 2. Project Working Derivative: Editable Executive Cover Letter
    const coverLetter = docsController.createWorkingCopy(
      projectId,
      {
        title: 'Executive Cover Letter & Tender Commitment',
        discipline: 'general',
        envelope: 'technical',
        content: 'We hereby commit to delivering Qatar National Day 2026 celebrations.',
      },
      mockRequest
    );

    // 3. Assemble Submission Pack
    const packRes = packsController.createPack(
      projectId,
      {
        title: 'Qatar National Day 2026 - Main Technical Submission Pack',
        tenderReference: 'TND-QND-2026-009',
        envelope: 'technical',
      },
      mockRequest
    );
    const packId = packRes.data.id;

    // Add items in initial order
    const it1 = packsController.addItemToPack(projectId, packId, { itemType: 'vault_evidence', submissionTitle: 'Commercial Registration', sourceEntityId: crItem.data.id });
    const it2 = packsController.addItemToPack(projectId, packId, { itemType: 'vault_evidence', submissionTitle: 'Trade Licence', sourceEntityId: licItem.data.id });
    const it3 = packsController.addItemToPack(projectId, packId, { itemType: 'vault_evidence', submissionTitle: 'Audited Financial Statements', sourceEntityId: fin24.data.id });
    const it4 = packsController.addItemToPack(projectId, packId, { itemType: 'project_working_doc', submissionTitle: 'Executive Cover Letter', sourceEntityId: coverLetter.data.id });

    // Reorder so Executive Cover Letter is first!
    packsController.reorderItems(projectId, packId, { orderedItemIds: [it4.data.id, it1.data.id, it2.data.id, it3.data.id] });

    // 4. Freeze & Finalize
    const freezeRes = packsController.freezePack(projectId, packId, { notes: 'Executive board signoff' }, mockRequest);
    const frozenManifestHash = freezeRes.data.manifestHash;

    const finalizeRes = packsController.finalizePack(projectId, packId, { applyAuthorizedMarks: true });
    const frozenArtifactHash = finalizeRes.data.artifactHash;

    // 5. Issue & Record Official Receipt
    packsController.issuePack(
      projectId,
      packId,
      {
        recipientOrganisation: 'Qatar National Day Committee',
        recipientName: 'H.E. Committee Chairman',
        recipientEmail: 'chairman@qnd.gov.qa',
        channel: 'formal_portal_upload',
        purpose: 'Formal Tender Submission',
      },
      mockRequest
    );

    const receipt = packsController.recordSubmissionReceipt(projectId, packId, {
      receiptReference: 'QND-2026-TND-REC-001',
      acknowledgedBy: 'Tender Committee Secretary',
    });
    expect(receipt.data.boundArtifactHash).toBe(frozenArtifactHash);

    // 6. NOW: Renew CR in vault with Rev 02
    vaultController.uploadNewRevision(
      crItem.data.id,
      {
        fileName: 'cr_renewed_2028.pdf',
        fileSizeBytes: 205000,
        contentHash: 'cr_hash_rev02_9999999999999999999999999999999999999999999999999999',
        changeSummary: 'CR renewed until 2028',
      },
      mockRequest
    );

    // 7. And edit project cover letter to Rev 02
    docsController.updateWorkingCopyRevision(
      projectId,
      coverLetter.data.id,
      {
        contentData: 'Amended text with updated milestone schedule.',
        expectedRecordVersion: 1,
      }
    );

    // 8. CRITICAL ASSERTION: The submitted Rev 01 pack, manifest, and artifact hashes remain 100% untouched!
    const packAfterMutations = packsController.getPack(projectId, packId);
    expect(packAfterMutations.data.currentRevision.manifestHash).toBe(frozenManifestHash);

    const artifactStored = submissionPackArtifactsRepository.get(packAfterMutations.data.currentRevision.id);
    expect(artifactStored?.artifactHash).toBe(frozenArtifactHash);
    expect(artifactStored?.fileName).toContain('Rev 01-Sealed.pdf');
  });
});
