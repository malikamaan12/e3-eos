export interface WorkerQualification {
  id: string;
  workerId: string;
  qualificationType: string;
  certificateNumber: string;
  validUntil: Date;
  status: 'active' | 'revoked';
  revokedAt?: Date;
  revocationReason?: string;
}

export interface QueuedFieldOperation {
  clientOperationId: string;
  entityType: 'attendance' | 'task_completion' | 'inspection' | 'incident';
  action: string;
  clientTimestamp: Date;
  workerId: string;
  payload: Record<string, unknown>;
}

export interface OperationSyncResult {
  clientOperationId: string;
  status: 'applied' | 'duplicate_ignored' | 'observation_flagged_for_review' | 'rejected';
  reason?: string;
  serverTimestamp: Date;
}

export interface MediaUploadState {
  uploadId: string;
  storageKey: string;
  expectedBytes: number;
  receivedBytes: number;
  isBinaryComplete: boolean;
  linkedTaskOrInspectionId: string;
}

export interface RegulatoryPermit {
  id: string;
  projectId: string;
  authorityName: string;
  permitType: string;
  permitNumber?: string;
  status: 'obtained' | 'absent' | 'alternative_verified';
  hasDigitalUpload: boolean;
  alternativeVerification?: {
    verifiedBy: string;
    verifiedAt: Date;
    method: string;
    physicalDocReference: string;
  };
}

export class FieldSyncEngine {
  /**
   * Evaluates offline action when worker qualification has been revoked on server (AT-055).
   * Invariant: Attendance observation is retained for supervisor review, but authoritative release is denied.
   */
  static processWorkerActionWithQualification(
    op: QueuedFieldOperation,
    qualification?: WorkerQualification
  ): OperationSyncResult {
    if (!qualification || qualification.status === 'revoked') {
      // Invariant AT-055: Retain observation for review, but deny authoritative qualified release
      return {
        clientOperationId: op.clientOperationId,
        status: 'observation_flagged_for_review',
        reason: `Worker qualification is revoked or missing. Action retained as observation for supervisor review, but cannot be accepted as authoritative qualified release.`,
        serverTimestamp: new Date(),
      };
    }

    return {
      clientOperationId: op.clientOperationId,
      status: 'applied',
      serverTimestamp: new Date(),
    };
  }

  /**
   * Processes a queued operation with per-operation deduplication (AT-056).
   * Out-of-order repeats do not overwrite accepted facts.
   */
  static processOperationWithDeduplication(
    op: QueuedFieldOperation,
    processedIds: Set<string>
  ): OperationSyncResult {
    if (processedIds.has(op.clientOperationId)) {
      return {
        clientOperationId: op.clientOperationId,
        status: 'duplicate_ignored',
        reason: 'Operation was already processed previously. Replay ignored.',
        serverTimestamp: new Date(),
      };
    }

    processedIds.add(op.clientOperationId);
    return {
      clientOperationId: op.clientOperationId,
      status: 'applied',
      serverTimestamp: new Date(),
    };
  }

  /**
   * Verifies media completion for task/evidence sign-off (AT-057).
   * Invariant: If binary upload is incomplete, evidence is marked pending and cannot be accepted as verified completion.
   */
  static verifyMediaCompletion(media: MediaUploadState): {
    isFullyVerified: boolean;
    evidenceState: 'pending_binary_upload' | 'verified_complete';
  } {
    if (!media.isBinaryComplete || media.receivedBytes < media.expectedBytes) {
      return {
        isFullyVerified: false,
        evidenceState: 'pending_binary_upload',
      };
    }

    return {
      isFullyVerified: true,
      evidenceState: 'verified_complete',
    };
  }

  /**
   * Asserts alternative verification vs absent regulatory permit (AT-060, AT-061).
   * Invariant AT-060: Missing digital upload != absent approval if alternative verification exists.
   * Invariant AT-061: Absent external regulatory approval blocks activity; no administrative grace period allows it.
   */
  static validatePermitReadiness(permit: RegulatoryPermit): {
    isAuthorised: boolean;
    reason?: string;
  } {
    if (permit.status === 'absent') {
      // Invariant AT-061: No administrative grace period can authorise absent external approval
      throw new Error(
        `REGULATORY_APPROVAL_ABSENT: Mandatory external permit from ${permit.authorityName} (${permit.permitType}) is absent. Administrative grace periods cannot authorise prohibited regulatory activities.`
      );
    }

    if (permit.status === 'alternative_verified') {
      // Invariant AT-060: Physical permit verified by authorised HSE inspector without digital upload
      return {
        isAuthorised: true,
        reason: `Authorised via verified alternative method: ${permit.alternativeVerification?.method} (${permit.alternativeVerification?.physicalDocReference}). Digital upload not required.`,
      };
    }

    if (permit.status === 'obtained') {
      return { isAuthorised: true };
    }

    return { isAuthorised: false, reason: 'Unknown permit status' };
  }

  /**
   * Returns storage eviction & session revocation contingency disclosure (AT-058).
   */
  static getStorageContingencyDisclosure(): string {
    return 'E3-EOS discloses that offline PWA device storage cannot guarantee background sync or remote offline wipe without an active authenticated network session. When storage is cleared or a session revoked, local drafts must follow manual supervisor contingency protocols.';
  }
}
