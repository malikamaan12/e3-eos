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

export type RunbookIncidentType =
  | 'db_api_outage'
  | 'queue_redis_outage'
  | 'remote_provider_timeout'
  | 'credential_compromise'
  | 'duplicate_webhook'
  | 'lost_field_device'
  | 'wrong_policy_published'
  | 'missing_safety_evidence'
  | 'financial_import_mismatch'
  | 'malicious_file_or_prompt_injection'
  | 'leaked_publication_link'
  | 'failed_deployment_migration'
  | 'offline_attendance_conflict'
  | 'duplicate_invoice_attempt';

export interface SupportFailureDrillInput {
  incidentType: RunbookIncidentType;
  details: string;
}

export interface SupportFailureResolutionResult {
  incidentType: string;
  runbookId: string;
  runbookActionTaken: string;
  immediateAction: string;
  recoveryAndEvidence: string;
  isAuditPreserved: boolean;
  status: 'resolved_under_runbook';
}

export class SupportRunbookEngine {
  /**
   * Simulates support failure resolution according to operational runbooks RB01 through RB12 (AT-092).
   */
  static executeSupportDrill(input: SupportFailureDrillInput): SupportFailureResolutionResult {
    const runbooks: Record<
      RunbookIncidentType,
      { runbookId: string; immediateAction: string; recoveryAndEvidence: string }
    > = {
      db_api_outage: {
        runbookId: 'RB01',
        immediateAction: 'Show degraded state; stop unsafe consequential writes; keep permitted local capture.',
        recoveryAndEvidence: 'Restore/fail over under approved process; replay outbox; reconcile intents and totals; document RPO/RTO.',
      },
      queue_redis_outage: {
        runbookId: 'RB02',
        immediateAction: 'Persist domain intents to durable PostgreSQL outbox; display delayed notification/integration.',
        recoveryAndEvidence: 'Recover queue; re-enqueue incomplete durable intents; deduplicate consumer effects; compare dispatch log.',
      },
      remote_provider_timeout: {
        runbookId: 'RB03',
        immediateAction: 'Quarantine order in reconciliation_needed; await verified manual supplier callback; resend unlocked without duplicate creation.',
        recoveryAndEvidence: 'Query provider or obtain supplier confirmation; bind external ID; only approved replay/compensation.',
      },
      credential_compromise: {
        runbookId: 'RB04',
        immediateAction: 'Revoke token/sessions immediately and pause affected connector.',
        recoveryAndEvidence: 'Rotate secret in Secret Manager, reauthorise least scopes, inspect access/exfiltration, reconcile changes and notify owners.',
      },
      duplicate_webhook: {
        runbookId: 'RB05',
        immediateAction: 'Persist and deduplicate via unique idempotency key without repeating business effects.',
        recoveryAndEvidence: 'Fetch authoritative record, validate version, record reversal/conflict and test replay.',
      },
      lost_field_device: {
        runbookId: 'RB06',
        immediateAction: 'Revoke future device sessions; identify cached data exposure.',
        recoveryAndEvidence: 'Purge on reconnect where possible, assess local storage loss, recover queued facts through supervisor review.',
      },
      offline_attendance_conflict: {
        runbookId: 'RB06',
        immediateAction: 'Retain offline attendance as observation_flagged_for_review; notify HSE lead; block automatic site release.',
        recoveryAndEvidence: 'Supervisor review against signed badge manifest; reconcile attendance records.',
      },
      wrong_policy_published: {
        runbookId: 'RB07',
        immediateAction: 'Identify affected scope; suspend relevant future releases.',
        recoveryAndEvidence: 'Restore reviewed snapshot/compile fix; assess executed actions separately; do not erase decisions.',
      },
      missing_safety_evidence: {
        runbookId: 'RB08',
        immediateAction: 'Keep affected activity unreleased; allow protective stop-work action and incident capture.',
        recoveryAndEvidence: 'Obtain actual verification, resolve scope/dependency and record authorised reopening.',
      },
      financial_import_mismatch: {
        runbookId: 'RB09',
        immediateAction: 'Quarantine batch; keep last reconciled position.',
        recoveryAndEvidence: 'Validate source mapping, duplicates, tax/currency and allocations; reverse erroneous postings visibly.',
      },
      duplicate_invoice_attempt: {
        runbookId: 'RB09',
        immediateAction: 'Reject duplicate invoice by unique source transaction ID; retain batch history and notify finance controller.',
        recoveryAndEvidence: 'Verify ledger uniqueness constraints; log forensic rejection event.',
      },
      malicious_file_or_prompt_injection: {
        runbookId: 'RB10',
        immediateAction: 'Quarantine content/job and block external execution.',
        recoveryAndEvidence: 'Preserve safe forensic metadata, verify no cross-project retrieval, purge unauthorised outputs and retest.',
      },
      leaked_publication_link: {
        runbookId: 'RB11',
        immediateAction: 'Withdraw grant/publication and invalidate future URL issue.',
        recoveryAndEvidence: 'Record exposure, identify access, communicate under approved process; do not claim downloaded copies recalled.',
      },
      failed_deployment_migration: {
        runbookId: 'RB12',
        immediateAction: 'Halt rollout and keep prior compatible application.',
        recoveryAndEvidence: 'Follow expand/contract rollback, restore only under data-owner authority, reconcile domain/external effects.',
      },
    };

    const runbook = runbooks[input.incidentType] || {
      runbookId: 'RB-GENERIC',
      immediateAction: input.details,
      recoveryAndEvidence: 'Execute incident response and log forensic audit trail.',
    };

    return {
      incidentType: input.incidentType,
      runbookId: runbook.runbookId,
      runbookActionTaken: `${runbook.immediateAction} ${runbook.recoveryAndEvidence}`,
      immediateAction: runbook.immediateAction,
      recoveryAndEvidence: runbook.recoveryAndEvidence,
      isAuditPreserved: true,
      status: 'resolved_under_runbook',
    };
  }
}
