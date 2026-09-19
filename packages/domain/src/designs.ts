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

// =========================================================================
// ENTERPRISE DESIGN & CREATIVE MANAGEMENT DOMAIN TYPES & ENGINES
// =========================================================================

export type AssetDesignType =
  | '2d_design'
  | '3d_design'
  | 'illustration'
  | 'moodboard'
  | 'storyboard'
  | 'pdf_document'
  | 'venue_layout'
  | 'floor_plan'
  | 'technical_drawing'
  | 'fabrication_drawing'
  | 'branding_artwork'
  | 'signage'
  | 'presentation'
  | 'image'
  | 'video_motion'
  | 'external_figma'
  | 'external_canva'
  | 'external_drive'
  | 'external_autodesk'
  | 'source_file_archive';

export type CanonicalDesignWorkflowStatus =
  | 'draft'
  | 'ready_for_internal_review'
  | 'internal_review'
  | 'internal_changes_required'
  | 'internally_approved'
  | 'ready_for_client_review'
  | 'client_review'
  | 'client_changes_required'
  | 'approved_with_conditions'
  | 'client_approved'
  | 'approved_for_production'
  | 'superseded'
  | 'as_built'
  | 'archived';

export type FormalApprovalPurpose =
  | 'approved_as_concept'
  | 'approved_for_detailed_development'
  | 'approved_for_costing'
  | 'approved_for_client_presentation'
  | 'approved_for_authority_submission'
  | 'approved_for_fabrication'
  | 'approved_for_production'
  | 'approved_for_installation'
  | 'approved_as_built';

export type ApprovalDecisionOutcome =
  | 'approve'
  | 'approve_with_conditions'
  | 'request_changes'
  | 'reject'
  | 'acknowledge_only';

export type ChangeClassification =
  | 'within_agreed_scope'
  | 'normal_design_development'
  | 'correction'
  | 'client_preference'
  | 'new_scope'
  | 'potential_variation'
  | 'confirmed_variation'
  | 'programme_impact'
  | 'cost_impact'
  | 'safety_impact'
  | 'procurement_impact'
  | 'no_impact';

export type MarkupGeometryType =
  | 'point'
  | 'arrow'
  | 'rectangle'
  | 'circle'
  | 'freehand'
  | 'highlight'
  | 'text_box'
  | 'strikeout'
  | 'measurement'
  | 'area';

export type CommentType =
  | 'general_comment'
  | 'change_request'
  | 'design_query'
  | 'technical_concern'
  | 'safety_concern'
  | 'client_instruction'
  | 'production_clarification'
  | 'approval_condition'
  | 'information_only';

export type CommentVisibility =
  | 'internal_only'
  | 'client_visible'
  | 'supplier_visible'
  | 'selected_participants'
  | 'approval_committee_only';

export type AdoptionStatus =
  | 'adopted'
  | 'clarification_required'
  | 'cannot_manufacture_as_designed'
  | 'alternative_proposed'
  | 'production_started'
  | 'superseded_version_received';

export type FileRole =
  | 'original_source'
  | 'review_preview'
  | 'production_export'
  | 'supporting_attachment';

export interface DesignWorkspace {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  responsibleDepartment?: string;
  ownerId?: string;
  ownerName?: string;
  defaultReviewers: string[];
  defaultClientReviewers: string[];
  defaultWorkflow: string;
  linkedZones: string[];
  linkedLocations: string[];
  visibility: 'all_members' | 'internal_only' | 'client_shared' | 'restricted';
  color?: string;
  icon?: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface DesignItem {
  id: string; // e.g. "DES-DHA26-001"
  projectId: string;
  workspaceId?: string;
  title: string;
  description?: string;
  assetType: AssetDesignType;
  projectPhase?: string;
  discipline: string;
  department?: string;
  ownerId?: string;
  ownerName?: string;
  internalReviewerId?: string;
  internalReviewerName?: string;
  clientReviewerId?: string;
  clientReviewerName?: string;
  dueDate?: string;
  priority: AnnotationPriority;
  currentVersionNumber: number;
  currentRevisionCode: string; // e.g. "Rev A", "Rev B", "V01"
  currentStatus: CanonicalDesignWorkflowStatus;
  approvalPurpose: FormalApprovalPurpose;
  confidentiality: 'internal' | 'client_confidential' | 'public' | 'restricted';
  clientVisibility: boolean;
  tags: string[];
  zones: string[];
  locations: string[];
  scopePackageIds: string[];
  requirementIds: string[];
  boqItemIds: string[];
  taskIds: string[];
  productionPackageIds: string[];
  supplierIds: string[];
  relatedDesignItemIds: string[];
  externalUrl?: string;
  revisions: DesignRevisionRecord[];
  pins: DesignAnnotationPin[];
  createdAt: string;
  updatedAt: string;
}

export interface DesignReviewRound {
  id: string;
  designItemId: string;
  versionId: string;
  purpose: string;
  reviewers: Array<{
    userId: string;
    userName: string;
    role: string;
    isMandatory: boolean;
    responded: boolean;
    response?: string;
    respondedAt?: string;
  }>;
  startDate: string;
  dueDate: string;
  instructions?: string;
  status: 'draft' | 'scheduled' | 'open' | 'awaiting_reviewers' | 'completed' | 'cancelled' | 'superseded';
  decision?: ApprovalDecisionOutcome;
  completionDate?: string;
  isLate: boolean;
  summary?: string;
  createdAt: string;
}

export interface DesignApprovalRecord {
  id: string;
  designItemId: string;
  versionId: string;
  versionNumber: number;
  revisionCode: string;
  approverId: string;
  approverName: string;
  organization: string;
  role: string;
  decision: ApprovalDecisionOutcome;
  approvalPurpose: FormalApprovalPurpose;
  comments?: string;
  conditions: string[];
  digitalAcknowledgement: boolean;
  contentHash: string;
  locked: boolean;
  createdAt: string;
}

export interface DesignChangeRequest {
  id: string;
  designItemId: string;
  designVersionId: string;
  commentThreadId?: string;
  title: string;
  description: string;
  classification: ChangeClassification;
  estimatedCostDeltaQar: number;
  estimatedScheduleDeltaDays: number;
  affectedRequirementIds: string[];
  affectedScopePackageIds: string[];
  affectedBoqItemIds: string[];
  affectedTaskIds: string[];
  escalateToVariation: boolean;
  linkedVariationId?: string;
  status: 'submitted' | 'under_pm_review' | 'variation_created' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface DesignReleaseRecord {
  id: string;
  releaseNumber: string; // e.g. "REL-DHA26-001"
  designItemId: string;
  designVersionId: string;
  versionNumber: number;
  revisionCode: string;
  releasePurpose: string;
  issuedBy: string;
  issuedAt: string;
  requiredAcknowledgementDate: string;
  notes?: string;
  materialsAndFinishesNotes?: string;
  fabricationNotes?: string;
  installationNotes?: string;
  status: 'active' | 'superseded' | 'recalled';
  supersededByReleaseId?: string;
  recipients: Array<{
    recipientId: string;
    recipientName: string;
    organization: string;
    role: string;
    adoptionStatus: AdoptionStatus;
    acknowledgedAt?: string;
    notes?: string;
    productionStarted?: boolean;
    productionStartDate?: string;
  }>;
  includedFileIds: string[];
}

export interface DesignExternalShare {
  id: string;
  shareToken: string;
  designItemId: string;
  designVersionId?: string;
  recipientName: string;
  recipientEmail: string;
  expiresAt: string;
  requireOtp: boolean;
  otpHash?: string;
  canView: boolean;
  canComment: boolean;
  canApprove: boolean;
  canDownload: boolean;
  watermarkText?: string;
  accessCount: number;
  lastAccessedAt?: string;
  isRevoked: boolean;
  createdAt: string;
}

export class DesignWorkflowEngine {
  public static readonly WORKFLOW_STAGES: CanonicalDesignWorkflowStatus[] = [
    'draft',
    'ready_for_internal_review',
    'internal_review',
    'internal_changes_required',
    'internally_approved',
    'ready_for_client_review',
    'client_review',
    'client_changes_required',
    'approved_with_conditions',
    'client_approved',
    'approved_for_production',
    'superseded',
    'as_built',
    'archived',
  ];

  /**
   * Evaluates whether a workflow transition is permitted.
   */
  static canTransition(
    current: CanonicalDesignWorkflowStatus,
    target: CanonicalDesignWorkflowStatus,
    userRole: string
  ): { allowed: boolean; reason: string } {
    if (current === target) {
      return { allowed: true, reason: 'Already in target status.' };
    }

    if (current === 'approved_for_production' && target !== 'superseded' && target !== 'as_built' && target !== 'archived') {
      return {
        allowed: false,
        reason: 'LOCKED_PRODUCTION_VERSION: Versions approved for production are immutable. Create a new sequential version for rework.',
      };
    }

    // Role gate for client approval
    if (target === 'client_approved' || target === 'ready_for_client_review') {
      const allowedClientRoles = ['client', 'client_user', 'super_admin', 'project_manager', 'executive'];
      if (!allowedClientRoles.includes(userRole)) {
        return {
          allowed: false,
          reason: `PERMISSION_DENIED: Role ${userRole} is not authorized for client workflow transition.`,
        };
      }
    }

    // Role gate for production release
    if (target === 'approved_for_production') {
      const allowedProductionRoles = ['super_admin', 'project_director', 'technical_director', 'project_manager', 'executive'];
      if (!allowedProductionRoles.includes(userRole)) {
        return {
          allowed: false,
          reason: `PERMISSION_DENIED: Production release authorization requires Executive or Technical Director authority.`,
        };
      }
    }

    return { allowed: true, reason: 'Transition valid under standard 14-stage workflow.' };
  }
}

export class ChangeControlClassifier {
  /**
   * Classifies a design comment / change request and determines commercial escalation.
   */
  static classifyChange(params: {
    classification: ChangeClassification;
    estimatedCostDeltaQar: number;
    estimatedScheduleDeltaDays: number;
    isClientRequest: boolean;
  }): {
    requiresVariation: boolean;
    escalateToProjectManager: boolean;
    commercialNoticeRequired: boolean;
    disclaimer: string;
  } {
    const COST_VARIATION_THRESHOLD_QAR = 25000;
    const SCHEDULE_VARIATION_THRESHOLD_DAYS = 2;

    const hasSignificantFinancialImpact = params.estimatedCostDeltaQar >= COST_VARIATION_THRESHOLD_QAR;
    const hasSignificantScheduleImpact = params.estimatedScheduleDeltaDays > SCHEDULE_VARIATION_THRESHOLD_DAYS;
    const isExplicitVariationType = ['new_scope', 'potential_variation', 'confirmed_variation'].includes(params.classification);
    const isImpactType = ['cost_impact', 'programme_impact'].includes(params.classification) && (hasSignificantFinancialImpact || hasSignificantScheduleImpact);

    const requiresVariation = isExplicitVariationType || isImpactType || hasSignificantFinancialImpact || hasSignificantScheduleImpact;
    const escalateToProjectManager = requiresVariation || (params.isClientRequest && params.classification === 'client_preference');

    return {
      requiresVariation,
      escalateToProjectManager,
      commercialNoticeRequired: requiresVariation,
      disclaimer: 'Comments and requested changes are subject to technical, programme, scope, and commercial review. Submission of a comment does not automatically authorize additional work or expenditure.',
    };
  }
}

export class AdoptionTrackingEngine {
  /**
   * Evaluates superseded release risks when a new design revision is issued.
   */
  static evaluateSupersededAlerts(
    currentRelease: DesignReleaseRecord,
    newVersionNumber: number
  ): {
    supersededRecipientsCount: number;
    productionStartedAlerts: string[];
    requiresImpactConfirmation: boolean;
  } {
    const alerts: string[] = [];
    let count = 0;

    for (const recipient of currentRelease.recipients) {
      count++;
      if (recipient.adoptionStatus === 'production_started' || recipient.productionStarted) {
        alerts.push(
          `CRITICAL_ADOPTION_ALERT: Supplier/Department "${recipient.organization} (${recipient.recipientName})" has already started production on ${currentRelease.revisionCode} (v${currentRelease.versionNumber}). Immediate work pause / impact assessment required before deploying v${newVersionNumber}.`
        );
      }
    }

    return {
      supersededRecipientsCount: count,
      productionStartedAlerts: alerts,
      requiresImpactConfirmation: alerts.length > 0,
    };
  }
}

export class ClientPortalSanitizer {
  /**
   * Strictly filters out internal-only comments, confidential pricing, and unpublished drafts for client consumption.
   */
  static sanitizeDesignItemForClient(item: DesignItem): Partial<DesignItem> {
    const sanitizedPins = item.pins.map((pin) => {
      const publicComments = pin.comments.filter((c: any) => {
        // If visibility is specified, strictly exclude internal_only
        if (c.visibility === 'internal_only') return false;
        return true;
      });
      return {
        ...pin,
        comments: publicComments,
      };
    });

    return {
      id: item.id,
      projectId: item.projectId,
      title: item.title,
      description: item.description,
      assetType: item.assetType,
      discipline: item.discipline,
      currentRevisionCode: item.currentRevisionCode,
      currentStatus: item.currentStatus,
      clientVisibility: item.clientVisibility,
      revisions: item.revisions.filter((r) => r.releaseStatus === 'client_review' || r.releaseStatus === 'approved_concept' || r.releaseStatus === 'approved_for_production'),
      pins: sanitizedPins,
      zones: item.zones,
      locations: item.locations,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}

export interface Mesh3D {
  name: string;
  vertices: [number, number, number][]; // [x, y, z]
  faces: number[][]; // polygon indices
  wireframeEdges?: [number, number][];
  bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
}

export interface StoredAssetRecord {
  id: string;
  fileName: string;
  mimeType: string;
  data: any;
  sizeBytes: number;
  hash: string;
  uploadedAt: string;
}

export function parseWavefrontObj(objText: string, modelName: string = 'Uploaded 3D Model'): Mesh3D {
  const lines = objText.split(/\r?\n/);
  const rawVertices: [number, number, number][] = [];
  const faces: number[][] = [];
  const edgeSet = new Set<string>();
  const wireframeEdges: [number, number][] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('v ')) {
      const parts = trimmed.split(/\s+/).slice(1).map(Number);
      if (parts.length >= 3 && parts.every((n) => !isNaN(n))) {
        rawVertices.push([parts[0], parts[1], parts[2]]);
      }
    } else if (trimmed.startsWith('f ')) {
      const parts = trimmed.split(/\s+/).slice(1);
      const faceIndices: number[] = [];
      for (const p of parts) {
        const vIdx = parseInt(p.split('/')[0], 10);
        if (!isNaN(vIdx)) {
          const index = vIdx > 0 ? vIdx - 1 : rawVertices.length + vIdx;
          faceIndices.push(index);
        }
      }
      if (faceIndices.length >= 3) {
        faces.push(faceIndices);
        for (let i = 0; i < faceIndices.length; i++) {
          const a = faceIndices[i];
          const b = faceIndices[(i + 1) % faceIndices.length];
          const key = a < b ? `${a}-${b}` : `${b}-${a}`;
          if (!edgeSet.has(key)) {
            edgeSet.add(key);
            wireframeEdges.push([a, b]);
          }
        }
      }
    }
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (const [x, y, z] of rawVertices) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }

  return {
    name: modelName,
    vertices: rawVertices,
    faces,
    wireframeEdges,
    bounds: { minX, maxX, minY, maxY, minZ, maxZ },
  };
}

export function getBundledStageMesh(): Mesh3D {
  // Real 3D geometry vertices for Qatar National Day Main Stage (10m x 8m with 4.5m structural truss gantry)
  const v: [number, number, number][] = [
    // Stage Deck Platform (8 vertices)
    [-100, 40, -80], [100, 40, -80], [100, 40, 80], [-100, 40, 80],
    [-100, 10, -80], [100, 10, -80], [100, 10, 80], [-100, 10, 80],
    // Tower 1 (Front Left)
    [-90, -70, -70], [-70, -70, -70], [-70, -70, -50], [-90, -70, -50],
    // Tower 2 (Front Right)
    [70, -70, -70], [90, -70, -70], [90, -70, -50], [70, -70, -50],
    // Tower 3 (Back Right)
    [70, -70, 50], [90, -70, 50], [90, -70, 70], [70, -70, 70],
    // Tower 4 (Back Left)
    [-90, -70, 50], [-70, -70, 50], [-70, -70, 70], [-90, -70, 70],
    // Kinetic Circular Crown Center Arch (8 vertices)
    [0, -90, 0], [45, -85, -20], [60, -80, 0], [45, -85, 20],
    [0, -90, 30], [-45, -85, 20], [-60, -80, 0], [-45, -85, -20],
  ];

  const f: number[][] = [
    // Deck Top & Bottom
    [0, 1, 2, 3], [7, 6, 5, 4],
    // Deck Sides
    [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0],
    // Tower 1 Top
    [8, 9, 10, 11],
    // Tower 2 Top
    [12, 13, 14, 15],
    // Tower 3 Top
    [16, 17, 18, 19],
    // Tower 4 Top
    [20, 21, 22, 23],
    // Overhead Roof Beam Trusses
    [8, 12, 13, 9], [13, 17, 18, 14], [18, 22, 23, 19], [23, 9, 8, 20],
  ];

  const edges: [number, number][] = [
    // Deck wireframe
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
    // Towers vertical legs
    [0, 8], [1, 13], [2, 18], [3, 23],
    // Roof truss perimeter
    [8, 12], [13, 17], [18, 22], [23, 9],
    // Kinetic crown ring
    [24, 25], [25, 26], [26, 27], [27, 28], [28, 29], [29, 30], [30, 31], [31, 24],
  ];

  return {
    name: 'Ceremonial_Main_Stage_10x8m.obj',
    vertices: v,
    faces: f,
    wireframeEdges: edges,
    bounds: { minX: -100, maxX: 100, minY: -90, maxY: 40, minZ: -80, maxZ: 80 },
  };
}


