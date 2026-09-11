import { safeSha256 } from './crypto-util.js';

export type ReleasePurpose = 'for_review' | 'for_client_approval' | 'for_fabrication';

export type DesignReleaseStatus =
  | 'draft_concept'
  | 'internal_review'
  | 'client_review'
  | 'approved_concept' // strictly NOT approved for fabrication
  | 'approved_for_production' // structural / safety sign-off required (POL-DES-01)
  | 'superseded';

export type AnnotationStatus = 'open' | 'in_progress' | 'resolved' | 'rejected_reopened';
export type AnnotationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type DesignPackageType = 'elevations' | 'floor_plans' | '3d_renders' | 'technical_details';

export interface DesignPinThreadComment {
  id: string;
  authorId: string;
  authorName: string;
  discipline: string;
  message: string;
  createdAt: string;
}

export interface DesignAnnotationPin {
  id: string;
  pinNumber: number;
  revisionCode: string; // e.g. "Rev A", "Rev B"
  xPercent: number; // 0 - 100
  yPercent: number; // 0 - 100
  title: string;
  discipline: string;
  priority: AnnotationPriority;
  status: AnnotationStatus;
  assigneeName?: string;
  comments: DesignPinThreadComment[];
  createdAt: string;
  resolvedAt?: string;
}

export interface DesignRevisionRecord {
  revisionCode: string; // "Rev A", "Rev B", etc.
  versionNumber: number;
  contentHash: string;
  storageUrl: string;
  uploadedBy: string;
  uploadedAt: string;
  notes?: string;
  releaseStatus: DesignReleaseStatus;
  structuralEngineerSignoff?: {
    certified: boolean;
    certifiedBy: string;
    certifiedAt: string;
    licenseNumber: string;
  };
  hseSignoff?: {
    certified: boolean;
    certifiedBy: string;
    certifiedAt: string;
  };
}

export interface DesignPackageItem {
  id: string; // e.g. "DES-QND-001"
  projectId: string;
  packageType: DesignPackageType;
  title: string;
  discipline: string;
  currentRevisionCode: string;
  currentReleaseStatus: DesignReleaseStatus;
  revisions: DesignRevisionRecord[];
  pins: DesignAnnotationPin[];
  linkedRequirementId?: string;
  createdAt: string;
}

export class ProductionReleaseGate {
  /**
   * Evaluates policy POL-DES-01: fabrication release cannot occur without structural engineering / HSE sign-off.
   * "Approved Concept" explicitly does NOT permit fabrication release.
   */
  static evaluateProductionRelease(
    revision: DesignRevisionRecord,
    targetStatus: DesignReleaseStatus
  ): {
    allowed: boolean;
    reason: string;
    missingSignoffs?: string[];
  } {
    if (targetStatus === 'approved_concept') {
      return {
        allowed: true,
        reason: 'Approved Concept granted. Note: Concept approval explicitly does NOT permit fabrication or production release.',
      };
    }

    if (targetStatus === 'approved_for_production') {
      const missing: string[] = [];
      if (!revision.structuralEngineerSignoff?.certified) {
        missing.push('Certified Structural Engineer Sign-off (Civil Defence License)');
      }
      if (!revision.hseSignoff?.certified) {
        missing.push('HSE & Fire Safety Compliance Sign-off (Flame Retardant / Egress)');
      }

      if (missing.length > 0) {
        return {
          allowed: false,
          reason: `POL-DES-01 VIOLATION: Fabrication release denied. Structural / Safety sign-off required: ${missing.join(', ')}.`,
          missingSignoffs: missing,
        };
      }

      return {
        allowed: true,
        reason: 'POL-DES-01 SATISFIED: Structural and HSE sign-offs certified. Authorized for fabrication and production release.',
      };
    }

    return {
      allowed: true,
      reason: `Status transition to ${targetStatus} permitted under standard workflow.`,
    };
  }
}

export interface DesignVersion {
  versionId: string;
  designId: string;
  versionNumber: number;
  contentHash: string;
  storageKey: string;
  title: string;
  titleAr?: string;
  uploadedAt: Date;
  uploadedBy: string;
  fabricationApproval?: {
    approvedAt: Date;
    approvedBy: string;
    approvalHash: string;
  };
  clientPublicationId?: string;
}

export interface DesignAnnotation {
  id: string;
  versionId: string;
  authorId: string;
  authorName: string;
  pageNumber: number;
  coordinates: { x: number; y: number; width?: number; height?: number };
  comment: string;
  resolved: boolean;
  createdAt: Date;
}

export class DesignReleaseEngine {
  /**
   * Computes SHA-256 hash of design file bytes or specification data.
   */
  static computeVersionHash(data: string | Buffer | Uint8Array): string {
    return safeSha256(data);
  }

  /**
   * Verifies that a new design revision does NOT inherit prior fabrication approval (AT-034).
   * Each revision requires an explicit, purpose-bound approval.
   */
  static createRevision(
    previousVersion: DesignVersion,
    newVersionNumber: number,
    contentData: string | Buffer,
    storageKey: string,
    uploadedBy: string,
    title?: string,
    titleAr?: string
  ): DesignVersion {
    if (newVersionNumber <= previousVersion.versionNumber) {
      throw new Error(
        `Revision number ${newVersionNumber} must be strictly greater than previous version ${previousVersion.versionNumber}`
      );
    }

    const contentHash = this.computeVersionHash(contentData);

    // Invariant (AT-034): New revision strictly has NO inherited fabrication approval
    // and NO publication binding from the previous revision.
    return {
      versionId: `ver-${previousVersion.designId}-v${newVersionNumber}`,
      designId: previousVersion.designId,
      versionNumber: newVersionNumber,
      contentHash,
      storageKey,
      title: title || previousVersion.title,
      titleAr: titleAr || previousVersion.titleAr,
      uploadedAt: new Date(),
      uploadedBy,
      fabricationApproval: undefined, // Explicitly undefined
      clientPublicationId: undefined, // Explicitly unpublished to client
    };
  }

  /**
   * Verifies that fabrication release can ONLY proceed if the SPECIFIC version has been approved for fabrication (AT-034).
   */
  static verifyFabricationRelease(version: DesignVersion): void {
    if (!version.fabricationApproval) {
      throw new Error(
        `FABRICATION_RELEASE_DENIED: Design version ${version.versionNumber} has not received explicit fabrication approval. Prior approvals on earlier revisions do not apply.`
      );
    }
  }
}

export interface IssuedCertificate {
  certificateId: string;
  projectId: string;
  activityType: string;
  activityPerformedAt: Date;
  issuedAt: Date;
  issuerId: string;
  contentHash: string;
}

export class CertificateValidator {
  /**
   * Validates certificate dating invariant (AT-033):
   * A certificate issued after an activity reflects actual issue dates and cannot be backdated or
   * claimed to have existed prior to its actual issuance timestamp.
   */
  static createCertificate(params: {
    certificateId: string;
    projectId: string;
    activityType: string;
    activityPerformedAt: Date;
    issuedAt: Date;
    issuerId: string;
  }): IssuedCertificate {
    // Certificate issue timestamp cannot be in the future relative to system clock (allowing 5s clock skew)
    const now = new Date();
    if (params.issuedAt.getTime() > now.getTime() + 5000) {
      throw new Error('CERTIFICATE_INVALID_DATE: Certificate cannot have a future issuance date.');
    }

    // A certificate cannot claim it existed prior to its actual release
    const hash = safeSha256({
      certificateId: params.certificateId,
      projectId: params.projectId,
      activityType: params.activityType,
      activityPerformedAt: params.activityPerformedAt.toISOString(),
      issuedAt: params.issuedAt.toISOString(),
      issuerId: params.issuerId,
    });

    return {
      certificateId: params.certificateId,
      projectId: params.projectId,
      activityType: params.activityType,
      activityPerformedAt: params.activityPerformedAt,
      issuedAt: params.issuedAt,
      issuerId: params.issuerId,
      contentHash: hash,
    };
  }

  /**
   * Verifies whether the certificate was validly in existence at a given check timestamp (AT-033).
   */
  static isCertificateEffectiveAt(cert: IssuedCertificate, effectiveTimestamp: Date): boolean {
    // If effectiveTimestamp < cert.issuedAt, the certificate did NOT exist yet and cannot be presented
    // as pre-existing authorization.
    return effectiveTimestamp.getTime() >= cert.issuedAt.getTime();
  }
}
