/**
 * Shared In-Memory Repositories for Controlled Documents, Evidence Vault & Submission Packs
 * Enables high-performance testing and persistent fallback across controllers.
 */

import {
  ControlledTransmittalPack,
  EvidenceVaultItem,
  EvidenceVaultRevision,
  RequiredDocumentSlot,
  ProjectDocumentWorkingCopy,
  DocumentCommentRecord,
  SubmissionPack,
  SubmissionPackRevisionRecord,
  SubmissionPackItem,
  SubmissionPackArtifact,
} from '@e3-eos/domain';

export const transmittalRepository = new Map<string, ControlledTransmittalPack>();
export const evidenceVaultRepository = new Map<string, EvidenceVaultItem>();
export const evidenceVaultRevisionsRepository = new Map<string, EvidenceVaultRevision[]>();
export const requiredDocumentSlotsRepository = new Map<string, RequiredDocumentSlot>();
export const projectWorkingCopiesRepository = new Map<string, ProjectDocumentWorkingCopy>();
export const submissionPacksRepository = new Map<string, SubmissionPack>();
export const submissionPackRevisionsRepository = new Map<string, SubmissionPackRevisionRecord>();
export const submissionPackItemsRepository = new Map<string, SubmissionPackItem[]>();
export const submissionPackArtifactsRepository = new Map<string, SubmissionPackArtifact>();
export const documentCommentsRepository = new Map<string, DocumentCommentRecord[]>();
export const authorizedStampSignatureAssetsRepository = new Map<string, any>();
export const transmittalIssueRecordsRepository = new Map<string, any>();
export const clientReviewSharesRepository = new Map<string, any>();

// Seed standard authorized test stamp & signature assets
export function seedAuthorizedStampAssets() {
  authorizedStampSignatureAssetsRepository.set('asset-stamp-corp-01', {
    id: 'asset-stamp-corp-01',
    assetType: 'stamp',
    assetCode: 'TEST_STAMP_AUTHORIZED',
    label: 'E3 Corporate Official Governance Stamp',
    signatoryName: 'Lead Project Director',
    signatoryAuthority: 'General Operations Authority',
    confidentiality: 'restricted',
    storageKey: 'assets/stamps/e3-corp-stamp.png',
    contentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    allowedActors: ['all_authorized_pms', 'lead_contributor', 'admin'],
    isActive: true,
  });

  authorizedStampSignatureAssetsRepository.set('asset-sig-md-01', {
    id: 'asset-sig-md-01',
    assetType: 'signature',
    assetCode: 'TEST_SIGNATURE_MOCK',
    label: 'Managing Director Test Signature Mark',
    signatoryName: 'Zaid Mansour',
    signatoryAuthority: 'Managing Director & Legal Signatory',
    confidentiality: 'restricted',
    storageKey: 'assets/signatures/md-sig.png',
    contentHash: 'f4b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b866',
    allowedActors: ['managing_director', 'admin'],
    isActive: true,
  });

  authorizedStampSignatureAssetsRepository.set('asset-sig-restricted-01', {
    id: 'asset-sig-restricted-01',
    assetType: 'signature',
    assetCode: 'SIG_RESTRICTED_BOARD',
    label: 'Board Chairman Signature Asset',
    signatoryName: 'Board Chairman',
    signatoryAuthority: 'Board of Governors',
    confidentiality: 'restricted',
    storageKey: 'assets/signatures/board-sig.png',
    contentHash: 'c2b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b877',
    allowedActors: ['board_chair_only'],
    isActive: true,
  });
}

// Initial seed
seedAuthorizedStampAssets();
