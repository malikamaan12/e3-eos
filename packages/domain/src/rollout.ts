export interface ConnectorEndpointVerification {
  connectorId: string;
  endpointUrl: string;
  isVerified: boolean;
  isMock: boolean;
}

export interface ProductionGateResult {
  environment: 'production' | 'staging' | 'development';
  canGoLive: boolean;
  blockers: string[];
  warnings: string[];
  verifiedConnectorsCount: number;
}

export class ProductionGateEngine {
  /**
   * Asserts production readiness and blocks deployments containing mock data or placeholder stubs (AT-089).
   * Invariant: In production, mock endpoints, localhost fake servers, or unverified connectors strictly block go-live.
   */
  static evaluateProductionGate(
    environment: 'production' | 'staging' | 'development',
    connectors: ConnectorEndpointVerification[]
  ): ProductionGateResult {
    const blockers: string[] = [];
    const warnings: string[] = [];
    let verifiedCount = 0;

    for (const c of connectors) {
      if (environment === 'production') {
        if (c.isMock || c.endpointUrl.includes('mock') || c.endpointUrl.includes('localhost') || c.endpointUrl.includes('fake')) {
          blockers.push(
            `MOCK_ENDPOINT_DETECTED: Connector ${c.connectorId} uses mock URL '${c.endpointUrl}'. Production deployments strictly forbid mock connectors.`
          );
        } else if (!c.isVerified) {
          blockers.push(
            `UNVERIFIED_CONNECTOR: Connector ${c.connectorId} has not completed production credential verification.`
          );
        } else {
          verifiedCount++;
        }
      } else {
        if (c.isMock) {
          warnings.push(`Connector ${c.connectorId} is running in mock mode for non-production.`);
        } else if (c.isVerified) {
          verifiedCount++;
        }
      }
    }

    const canGoLive = blockers.length === 0;

    return {
      environment,
      canGoLive,
      blockers,
      warnings,
      verifiedConnectorsCount: verifiedCount,
    };
  }
}

export interface CompensatingCancellationRecord {
  cancellationId: string;
  poId: string;
  originalStatus: string;
  compensatingActionType: 'compensating_cancellation_issued' | 'credit_memo_requested';
  cancellationReason: string;
  externalSupplierAcknowledged: boolean;
  cancelledAt: Date;
}

export class CompensatingRollbackEngine {
  /**
   * Performs non-destructive rollback on externally dispatched purchase orders (AT-088).
   * Invariant: Once an order has been sent to a remote supplier, database records are never deleted or reset.
   * A compensating cancellation or credit memo action is issued, preserving full historical audit trails.
   */
  static issueCompensatingCancellation(
    po: { id: string; status: string; totalAmount: string },
    reason: string,
    supplierAcknowledged: boolean
  ): CompensatingCancellationRecord {
    if (po.status === 'draft') {
      // Drafts can be marked cancelled directly
      return {
        cancellationId: `canc-${Date.now()}`,
        poId: po.id,
        originalStatus: po.status,
        compensatingActionType: 'compensating_cancellation_issued',
        cancellationReason: reason,
        externalSupplierAcknowledged: true,
        cancelledAt: new Date(),
      };
    }

    // Invariant AT-088: If PO was sent to vendor, record remains intact and compensating business action is issued
    return {
      cancellationId: `comp-canc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      poId: po.id,
      originalStatus: po.status,
      compensatingActionType: 'compensating_cancellation_issued',
      cancellationReason: reason,
      externalSupplierAcknowledged: supplierAcknowledged,
      cancelledAt: new Date(),
    };
  }
}

export interface ManifestChecksum {
  recordType: string;
  recordCount: number;
  dataHash: string;
}

export class BackupManifestReconciliationEngine {
  /**
   * Reconciles backup source manifests against restored environment (AT-087).
   * Verifies cryptographic parity across domain tables and references.
   */
  static reconcileRestoreManifest(
    backupManifests: ManifestChecksum[],
    restoredManifests: ManifestChecksum[]
  ): { isReconciled: boolean; discrepancies: string[] } {
    const discrepancies: string[] = [];

    for (const b of backupManifests) {
      const restored = restoredManifests.find((r) => r.recordType === b.recordType);
      if (!restored) {
        discrepancies.push(`MISSING_RECORD_TYPE: ${b.recordType} missing in restored target.`);
      } else if (restored.recordCount !== b.recordCount) {
        discrepancies.push(
          `COUNT_MISMATCH: ${b.recordType} backup count ${b.recordCount} != restored count ${restored.recordCount}.`
        );
      } else if (restored.dataHash !== b.dataHash) {
        discrepancies.push(
          `HASH_MISMATCH: ${b.recordType} checksum mismatch (backup: ${b.dataHash}, restored: ${restored.dataHash}).`
        );
      }
    }

    return {
      isReconciled: discrepancies.length === 0,
      discrepancies,
    };
  }
}

export interface SupportFailureDrillInput {
  incidentType: 'remote_provider_timeout' | 'offline_attendance_conflict' | 'duplicate_invoice_attempt';
  details: string;
}

export interface SupportFailureResolutionResult {
  incidentType: string;
  runbookActionTaken: string;
  isAuditPreserved: boolean;
  status: 'resolved_under_runbook';
}

export class SupportRunbookEngine {
  /**
   * Simulates support failure resolution according to operational runbooks (AT-092).
   */
  static executeSupportDrill(input: SupportFailureDrillInput): SupportFailureResolutionResult {
    let action = '';
    switch (input.incidentType) {
      case 'remote_provider_timeout':
        action = 'Quarantine order in reconciliation_needed; await verified manual supplier callback; resend unlocked without duplicate creation.';
        break;
      case 'offline_attendance_conflict':
        action = 'Retain offline attendance as observation_flagged_for_review; notify HSE lead; block automatic site release.';
        break;
      case 'duplicate_invoice_attempt':
        action = 'Reject duplicate invoice by unique source transaction ID; retain batch history and notify finance controller.';
        break;
    }

    return {
      incidentType: input.incidentType,
      runbookActionTaken: action,
      isAuditPreserved: true,
      status: 'resolved_under_runbook',
    };
  }
}
