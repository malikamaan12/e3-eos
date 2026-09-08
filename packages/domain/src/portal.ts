import { safeSha256 } from './crypto-util.js';

export type ClientRoomType = 'concept' | 'milestones' | 'commercial' | 'results';

export interface PublicationData {
  id: string;
  projectId: string;
  clientOrganisationId: string;
  roomType: ClientRoomType;
  title: string;
  titleAr?: string;
  targetVersionId: string;
  targetHash: string; // SHA-256 of projection payload
  projectionPayload: Record<string, unknown>; // Guaranteed sell-side only, no internal cost
  status: 'published' | 'withdrawn';
  publishedAt: Date;
  withdrawnAt?: Date;
  withdrawalReason?: string;
}

export type ClientDecisionOutcome = 'accepted' | 'rejected' | 'revision_requested';

export interface ClientNativeDecision {
  id: string;
  publicationId: string;
  projectId: string;
  clientUserId: string;
  clientUserName: string;
  clientUserEmail: string;
  clientOrganisationId: string;
  decision: ClientDecisionOutcome;
  targetHash: string;
  comment?: string;
  decidedAt: Date;
  // AT-041: Native acceptance tracking without false legal claims
  acceptanceClassification: 'native_portal_decision';
  legalNotice: string;
}

export interface ClientRoomAccessibilityMetadata {
  direction: 'rtl' | 'ltr';
  locale: 'en' | 'ar';
  textWrappingEnabled: boolean;
  keyboardFocusable: boolean;
  statusIndicator: {
    code: string;
    label: string;
    icon: string;
    ariaLabel: string;
    usesColorOnly: false; // Invariant AT-042: Never rely on color alone
  };
}

export class ClientPortalManager {
  /**
   * Computes SHA-256 hash of published projection payload.
   */
  static computePayloadHash(payload: Record<string, unknown>): string {
    return safeSha256(payload);
  }

  /**
   * Validates client access to publication (AT-036).
   * Denies access immediately if withdrawn.
   */
  static validatePublicationAccess(
    publication: PublicationData,
    clientOrgId: string
  ): void {
    if (publication.clientOrganisationId !== clientOrgId) {
      // Cross-client isolation (AT-001)
      throw new Error('ACCESS_DENIED_ORGANISATION_MISMATCH: Publication does not belong to this organisation.');
    }

    if (publication.status === 'withdrawn') {
      // AT-036: Future access strictly denied
      throw new Error(
        'PUBLICATION_WITHDRAWN: This publication has been withdrawn and is no longer available. Note: E3-EOS does not promise recall of previously downloaded external copies, but all portal access is terminated.'
      );
    }
  }

  /**
   * Validates and records client decision (AT-035, AT-041).
   * Enforces hash and version match without leaking internal draft contents.
   */
  static recordClientDecision(params: {
    publication: PublicationData;
    clientOrgId: string;
    clientUserId: string;
    clientUserName: string;
    clientUserEmail: string;
    decision: ClientDecisionOutcome;
    suppliedTargetHash: string;
    comment?: string;
  }): ClientNativeDecision {
    // 1. Verify access (AT-036)
    this.validatePublicationAccess(params.publication, params.clientOrgId);

    // 2. Invariant AT-035: Check target hash match
    if (params.suppliedTargetHash !== params.publication.targetHash) {
      throw new Error(
        'TARGET_HASH_MISMATCH: Client decision was submitted for an altered or mismatched version hash. Decision rejected to prevent stale sign-off.'
      );
    }

    // 3. Invariant AT-041: Truthful native acceptance tracking
    return {
      id: `cdec-${params.publication.id}-${Date.now()}`,
      publicationId: params.publication.id,
      projectId: params.publication.projectId,
      clientUserId: params.clientUserId,
      clientUserName: params.clientUserName,
      clientUserEmail: params.clientUserEmail,
      clientOrganisationId: params.clientOrgId,
      decision: params.decision,
      targetHash: params.suppliedTargetHash,
      comment: params.comment,
      decidedAt: new Date(),
      acceptanceClassification: 'native_portal_decision',
      legalNotice:
        'This approval is recorded as an internal native portal confirmation. E3-EOS does not claim this constitutes a government-qualified electronic signature under statutory digital signature legislation.',
    };
  }

  /**
   * Generates accessibility and bilingual view metadata for client portal (AT-042).
   */
  static getAccessibilityMetadata(
    locale: 'en' | 'ar',
    status: 'draft' | 'pending' | 'accepted' | 'rejected' | 'withdrawn'
  ): ClientRoomAccessibilityMetadata {
    const isArabic = locale === 'ar';
    const statusLabels: Record<string, { en: string; ar: string; icon: string }> = {
      draft: { en: 'Draft', ar: 'مسودة', icon: 'edit-icon' },
      pending: { en: 'Pending Review', ar: 'قيد المراجعة', icon: 'clock-icon' },
      accepted: { en: 'Accepted', ar: 'تمت الموافقة', icon: 'check-circle-icon' },
      rejected: { en: 'Rejected', ar: 'مرفوض', icon: 'x-circle-icon' },
      withdrawn: { en: 'Withdrawn', ar: 'مسحوب', icon: 'ban-icon' },
    };

    const s = statusLabels[status] || statusLabels.pending;

    return {
      direction: isArabic ? 'rtl' : 'ltr',
      locale,
      textWrappingEnabled: true,
      keyboardFocusable: true,
      statusIndicator: {
        code: status,
        label: isArabic ? s.ar : s.en,
        icon: s.icon,
        ariaLabel: `Status: ${isArabic ? s.ar : s.en}`,
        usesColorOnly: false,
      },
    };
  }
}
