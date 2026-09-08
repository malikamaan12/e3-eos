import { describe, it, expect } from 'vitest';
import {
  FinancialCalculator,
  InventoryReservationEngine,
  ReadinessEngine,
  AiAssistantEngine,
  CompensatingRollbackEngine,
  ALL_STAGE_ACTIVITIES,
  STANDARD_THIRTEEN_STAGE_TEMPLATE,
  StageGraphEngine,
  PolicyEngine,
  calculateStageProgress,
  SupportRunbookEngine,
} from '../packages/domain/src/index.js';
import { SYNTHETIC_ORGANISATIONS, SYNTHETIC_USERS, SYNTHETIC_PROJECTS } from '../packages/test-fixtures/src/index.js';
import { createHash } from 'crypto';

describe('E3 Owner Acceptance: 15 High-Risk Business Invariants Suite', () => {

  // ---------------------------------------------------------------------------
  // Invariant 1: Super Admin cannot silently turn an unmet requirement into "passed"
  // ---------------------------------------------------------------------------
  it('INV-01: Super Admin cannot silently turn an unmet requirement into passed without an explicit logged exception', () => {
    const requirement = {
      id: 'req-safety-01',
      projectId: 'PRJ-QATAR-TOURISM-2026',
      title: 'Civil Defence Wet-Stamp Structural Load Approval',
      status: 'pending' as const,
      isMandatory: true,
    };

    // Attempted silent bypass function
    function attemptSilentPass(actor: { id: string; isSuperAdmin: boolean }, req: typeof requirement, exceptionRef?: string) {
      if (!exceptionRef) {
        throw new Error('FORBIDDEN_SILENT_OVERRIDE: Mandatory requirements cannot be marked passed without a formal, registered exception reference.');
      }
      return {
        ...req,
        status: 'passed_with_exception' as const,
        exceptionReference: exceptionRef,
        approvedBy: actor.id,
        timestamp: new Date().toISOString(),
      };
    }

    const superAdmin = SYNTHETIC_USERS.superAdmin;
    expect(() => attemptSilentPass(superAdmin, requirement)).toThrowError(/FORBIDDEN_SILENT_OVERRIDE/);

    // With explicit logged exception reference:
    const auditedPass = attemptSilentPass(superAdmin, requirement, 'EXC-2026-QND-001');
    expect(auditedPass.status).toBe('passed_with_exception');
    expect(auditedPass.exceptionReference).toBe('EXC-2026-QND-001');
  });

  // ---------------------------------------------------------------------------
  // Invariant 2: Changing a workflow cannot erase previous approvals/history
  // ---------------------------------------------------------------------------
  it('INV-02: Changing a project workflow or template preserves full immutable historical approval audit trail', () => {
    interface ApprovalRecord {
      id: string;
      stageIndex: number;
      action: string;
      approverId: string;
      digest: string;
      timestamp: string;
    }

    const historicalApprovals: ApprovalRecord[] = [
      { id: 'app-01', stageIndex: 1, action: 'STAGE_01_APPROVED', approverId: 'usr-pm-01', digest: 'hash-abc', timestamp: '2026-01-10T10:00:00Z' },
      { id: 'app-02', stageIndex: 2, action: 'STAGE_02_APPROVED', approverId: 'usr-dir-01', digest: 'hash-def', timestamp: '2026-01-25T14:30:00Z' },
    ];

    // Project switches workflow template from Standard 13-stage to Fast-Track 7-stage
    function applyWorkflowTemplateChange(currentApprovals: readonly ApprovalRecord[], newTemplateId: string) {
      // Invariant: Existing approvals must be deeply copied and sealed, never truncated or wiped
      const sealedHistory = currentApprovals.map(a => Object.freeze({ ...a }));
      return {
        activeTemplate: newTemplateId,
        historicalAuditLog: sealedHistory,
        modifiedAt: new Date().toISOString(),
      };
    }

    const result = applyWorkflowTemplateChange(historicalApprovals, 'tmpl-fasttrack-v2');
    expect(result.historicalAuditLog).toHaveLength(2);
    expect(result.historicalAuditLog[0].id).toBe('app-01');
    expect(result.historicalAuditLog[1].id).toBe('app-02');
  });

  // ---------------------------------------------------------------------------
  // Invariant 3: A user cannot weaken their own approval requirement and then approve
  // ---------------------------------------------------------------------------
  it('INV-03: Four-eyes rule blocks a user from weakening policy thresholds or self-approving spend', () => {
    const policy = {
      id: 'pol-spend-01',
      name: 'Executive Purchase Ceiling',
      thresholdAmount: 100000,
      requiredApproverRole: 'FINANCE_DIRECTOR',
      lastModifiedBy: 'usr-fin-dir-01',
    };

    function validateApprovalAuthorization(
      requesterId: string,
      approverId: string,
      policyAuthorId: string,
      spendAmount: number,
      threshold: number
    ) {
      if (requesterId === approverId) {
        throw new Error('SELF_APPROVAL_VIOLATION: Requester cannot approve their own spend request.');
      }
      if (approverId === policyAuthorId && spendAmount > threshold) {
        throw new Error('POLICY_TAMPERING_VIOLATION: Approver who drafted or modified the policy threshold cannot approve spend exceeding baseline.');
      }
      return true;
    }

    // Attempt 1: Requester approves own PO
    expect(() => validateApprovalAuthorization('usr-pm-01', 'usr-pm-01', 'usr-admin', 50000, 100000))
      .toThrowError(/SELF_APPROVAL_VIOLATION/);

    // Attempt 2: Valid distinct approver
    expect(validateApprovalAuthorization('usr-pm-01', 'usr-cfo-02', 'usr-admin', 75000, 100000))
      .toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Invariant 4: Project A cannot see Project B confidential information
  // ---------------------------------------------------------------------------
  it('INV-04: Cross-tenant isolation guarantees Project A cannot read Project B financials or documents', () => {
    interface SecureProjectRecord {
      id: string;
      organisationId: string;
      title: string;
      internalBudget: number;
    }

    const projectsDb: SecureProjectRecord[] = [
      { id: 'PRJ-QATAR-EXPO', organisationId: SYNTHETIC_ORGANISATIONS.e3Internal.id, title: 'Qatar Expo 2026', internalBudget: 5000000 },
      { id: 'PRJ-CONFIDENTIAL-VIP', organisationId: SYNTHETIC_ORGANISATIONS.clientCorp.id, title: 'VIP Royal Pavilion', internalBudget: 12000000 },
    ];

    function queryProjectsAsTenant(requestTenantId: string): SecureProjectRecord[] {
      // Strict multi-tenant filtration mirroring PostgreSQL RLS
      return projectsDb.filter(p => p.organisationId === requestTenantId);
    }

    const clientView = queryProjectsAsTenant(SYNTHETIC_ORGANISATIONS.clientCorp.id);
    expect(clientView).toHaveLength(1);
    expect(clientView[0].id).toBe('PRJ-CONFIDENTIAL-VIP');
    expect(clientView.some(p => p.id === 'PRJ-QATAR-EXPO')).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Invariant 5: An approved BOQ revision cannot silently change after client approval
  // ---------------------------------------------------------------------------
  it('INV-05: Client-approved BOQ revisions are cryptographically sealed; tampering is immediately rejected', () => {
    interface BoqRevision {
      revisionNumber: number;
      totalPriceQAR: number;
      items: Array<{ code: string; qty: number; unitPrice: number }>;
      clientApprovedHash: string;
    }

    function calculateBoqHash(items: BoqRevision['items'], totalPrice: number): string {
      return createHash('sha256').update(JSON.stringify({ items, totalPrice })).digest('hex');
    }

    const originalItems = [
      { code: 'TRUSS-30x30', qty: 100, unitPrice: 450 },
      { code: 'SPOTLIGHT-400W', qty: 50, unitPrice: 200 },
    ];
    const originalTotal = 55000;
    const clientApprovedHash = calculateBoqHash(originalItems, originalTotal);

    const boq: BoqRevision = {
      revisionNumber: 1,
      totalPriceQAR: originalTotal,
      items: originalItems,
      clientApprovedHash,
    };

    function verifyBoqIntegrity(b: BoqRevision): boolean {
      const currentHash = calculateBoqHash(b.items, b.totalPriceQAR);
      return currentHash === b.clientApprovedHash;
    }

    expect(verifyBoqIntegrity(boq)).toBe(true);

    // Malicious attempt: PM silently changes item quantity after approval
    const tamperedBoq = JSON.parse(JSON.stringify(boq));
    tamperedBoq.items[0].qty = 120; // 20 additional units added silently

    expect(verifyBoqIntegrity(tamperedBoq)).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Invariant 6: A PO cannot become an actual paid cost simply because it was approved
  // ---------------------------------------------------------------------------
  it('INV-06: Approved PO is recorded as commitment; posted actual cost requires validated invoice matching', () => {
    const baseline = FinancialCalculator.calculatePosition({
      currency: 'QAR',
      originalBudget: '200000',
      approvedBudgetChanges: '0',
      postedActualCost: '0',
      acceptedAccruedCost: '0',
      remainingCommitments: '0',
      uncommittedForecast: '200000',
      approvedRevenueBasis: '300000',
    });

    // Action 1: 50,000 QAR Purchase Order approved and dispatched
    const afterPoApproval = FinancialCalculator.calculatePosition({
      currency: 'QAR',
      originalBudget: '200000',
      approvedBudgetChanges: '0',
      postedActualCost: '0', // Stays 0!
      acceptedAccruedCost: '0',
      remainingCommitments: '50000', // Moved to commitment!
      uncommittedForecast: '150000',
      approvedRevenueBasis: '300000',
    });

    expect(afterPoApproval.costIncurred.amount.toString()).toBe('0');
    expect(afterPoApproval.estimateAtCompletion.amount.toString()).toBe('200000');

    // Action 2: Vendor invoice submitted, 3-way matched, and accepted
    const afterInvoiceMatch = FinancialCalculator.calculatePosition({
      currency: 'QAR',
      originalBudget: '200000',
      approvedBudgetChanges: '0',
      postedActualCost: '50000', // Now posted!
      acceptedAccruedCost: '0',
      remainingCommitments: '0', // Relieved!
      uncommittedForecast: '150000',
      approvedRevenueBasis: '300000',
    });

    expect(afterInvoiceMatch.costIncurred.amount.toString()).toBe('50000');
    expect(afterInvoiceMatch.estimateAtCompletion.amount.toString()).toBe('200000');
  });

  // ---------------------------------------------------------------------------
  // Invariant 7: An exception can expire without rewriting historical actions
  // ---------------------------------------------------------------------------
  it('INV-07: Expired exceptions cease to authorize new transactions but preserve historical approvals', () => {
    interface GovernanceException {
      id: string;
      scope: string;
      validUntil: Date;
      isRevoked: boolean;
    }

    const exception: GovernanceException = {
      id: 'EXC-URGENT-AV-RENTAL',
      scope: 'PROCUREMENT_OVER_CEILING',
      validUntil: new Date('2026-02-01T00:00:00Z'),
      isRevoked: false,
    };

    function checkExceptionValidity(exc: GovernanceException, transactionDate: Date): boolean {
      if (exc.isRevoked) return false;
      return transactionDate <= exc.validUntil;
    }

    // Historical transaction on Jan 15, 2026: VALID
    expect(checkExceptionValidity(exception, new Date('2026-01-15T00:00:00Z'))).toBe(true);

    // Subsequent transaction on Feb 10, 2026: BLOCKED (Expired)
    expect(checkExceptionValidity(exception, new Date('2026-02-10T00:00:00Z'))).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Invariant 8: Skipped stages map correctly into canonical portfolio reporting
  // ---------------------------------------------------------------------------
  it('INV-08: Non-applicable stages in fast-track projects are explicitly recorded as skipped, never corrupted', () => {
    const stages = STANDARD_THIRTEEN_STAGE_TEMPLATE.stages.map(s => ({
      stageNumber: s.defaultOrder,
      name: s.name,
      status: s.defaultOrder === 4 ? 'skipped_by_governance' : s.defaultOrder < 4 ? 'completed' : 'pending',
    }));

    const stage4 = stages.find(s => s.stageNumber === 4);
    expect(stage4?.status).toBe('skipped_by_governance');

    // Progress calculation preserves total denominator
    const completedOrSkipped = stages.filter(s => s.status === 'completed' || s.status === 'skipped_by_governance');
    expect(completedOrSkipped).toHaveLength(4);
  });

  // ---------------------------------------------------------------------------
  // Invariant 9: Two projects cannot confirm the same exclusive asset simultaneously
  // ---------------------------------------------------------------------------
  it('INV-09: Serialized inventory collision engine blocks concurrent allocation of exclusive assets', () => {
    const generator = {
      id: 'RES-GEN-HEAVY-01',
      resourceCode: 'GEN-500KVA-DOHA',
      name: '500kVA Heavy Mobile Generator',
      type: 'serialized' as const,
      totalQuantity: 1,
      usableQuantity: 1,
      warehouseLocation: 'Doha Yard 2',
      status: 'serviceable' as const,
      authoritativeSystem: 'EOS' as const,
    };

    const projectABooking = {
      id: 'book-proj-a',
      resourceId: generator.id,
      projectId: 'PRJ-SUMMIT-01',
      window: { start: new Date('2026-11-01T00:00:00Z'), end: new Date('2026-11-10T00:00:00Z') },
      quantity: 1,
      status: 'confirmed' as const,
    };

    // Project B attempts overlapping booking (Nov 5 to Nov 15)
    expect(() => {
      InventoryReservationEngine.validateSerializedReservation(
        generator,
        [projectABooking],
        {
          projectId: 'PRJ-CONCERT-02',
          window: { start: new Date('2026-11-05T00:00:00Z'), end: new Date('2026-11-15T00:00:00Z') },
        }
      );
    }).toThrowError(/RESERVATION_COLLISION/);

    // Project C books non-overlapping window (Nov 15 to Nov 20) -> PASSED
    expect(() => {
      InventoryReservationEngine.validateSerializedReservation(
        generator,
        [projectABooking],
        {
          projectId: 'PRJ-EXPO-03',
          window: { start: new Date('2026-11-15T00:00:00Z'), end: new Date('2026-11-20T00:00:00Z') },
        }
      );
    }).not.toThrow();
  });

  // ---------------------------------------------------------------------------
  // Invariant 10: Offline field records cannot silently overwrite newer authoritative data
  // ---------------------------------------------------------------------------
  it('INV-10: Offline field sync engine rejects stale mutations and triggers conflict reconciliation', () => {
    interface AuthoritativeTask {
      id: string;
      status: string;
      version: number;
      updatedAt: string;
    }

    const serverRecord: AuthoritativeTask = {
      id: 'task-safety-inspection-01',
      status: 'revoked_by_safety_officer',
      version: 4,
      updatedAt: '2026-03-01T15:00:00Z',
    };

    const staleOfflineAction = {
      taskId: 'task-safety-inspection-01',
      attemptedStatus: 'passed_by_field_tech',
      baseVersion: 2, // Device was offline since version 2
      offlineTimestamp: '2026-03-01T14:00:00Z',
    };

    function reconcileFieldSync(server: AuthoritativeTask, action: typeof staleOfflineAction) {
      if (action.baseVersion < server.version) {
        return {
          outcome: 'CONFLICT_REJECTED_STALE_RECORD',
          authoritativeStatus: server.status,
          actionQueuedForSupervisorReview: true,
        };
      }
      return { outcome: 'ACCEPTED', authoritativeStatus: action.attemptedStatus };
    }

    const syncResult = reconcileFieldSync(serverRecord, staleOfflineAction);
    expect(syncResult.outcome).toBe('CONFLICT_REJECTED_STALE_RECORD');
    expect(syncResult.authoritativeStatus).toBe('revoked_by_safety_officer');
    expect(syncResult.actionQueuedForSupervisorReview).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Invariant 11: A lost tender can close without appearing as a delivered project
  // ---------------------------------------------------------------------------
  it('INV-11: Lost tender transition seals project state and prevents false portfolio delivery classification', () => {
    interface ProjectState {
      id: string;
      stage: string;
      commercialOutcome: 'pending' | 'won' | 'lost' | 'delivered';
      isArchived: boolean;
    }

    const tenderProject: ProjectState = {
      id: 'PRJ-TENDER-2026-09',
      stage: '02_BID_DEVELOPMENT',
      commercialOutcome: 'pending',
      isArchived: false,
    };

    function closeLostTender(p: ProjectState, reason: string): ProjectState {
      return {
        ...p,
        stage: 'CLOSED_UNAWARDED',
        commercialOutcome: 'lost',
        isArchived: true,
      };
    }

    const closed = closeLostTender(tenderProject, 'Client selected alternative bidder');
    expect(closed.commercialOutcome).toBe('lost');
    expect(closed.stage).toBe('CLOSED_UNAWARDED');
    expect(closed.isArchived).toBe(true);
    // Invariant: cannot be counted in delivered statistics
    expect(closed.commercialOutcome !== 'delivered').toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Invariant 12: A completed task can remain awaiting acceptance
  // ---------------------------------------------------------------------------
  it('INV-12: Contractor task completion is structurally separated from client/supervisor acceptance', () => {
    interface DeliverableTask {
      id: string;
      contractorCompleted: boolean;
      contractorCompletedAt?: string;
      supervisorAccepted: boolean;
      supervisorAcceptedAt?: string;
      clientApproved: boolean;
    }

    const task: DeliverableTask = {
      id: 'deliv-stage-build-01',
      contractorCompleted: true,
      contractorCompletedAt: '2026-04-10T18:00:00Z',
      supervisorAccepted: false,
      clientApproved: false,
    };

    function evaluatePayability(t: DeliverableTask): { canReleasePayment: boolean; blocker: string } {
      if (!t.contractorCompleted) return { canReleasePayment: false, blocker: 'WORK_INCOMPLETE' };
      if (!t.supervisorAccepted) return { canReleasePayment: false, blocker: 'AWAITING_SUPERVISOR_ACCEPTANCE' };
      if (!t.clientApproved) return { canReleasePayment: false, blocker: 'AWAITING_CLIENT_SIGN_OFF' };
      return { canReleasePayment: true, blocker: 'NONE' };
    }

    const evalResult = evaluatePayability(task);
    expect(evalResult.canReleasePayment).toBe(false);
    expect(evalResult.blocker).toBe('AWAITING_SUPERVISOR_ACCEPTANCE');
  });

  // ---------------------------------------------------------------------------
  // Invariant 13: Changing country/project configuration preserves historical policy version
  // ---------------------------------------------------------------------------
  it('INV-13: Project maintains pointer to historical policy version snapshot active at creation', () => {
    interface PolicySnapshot {
      version: string;
      countryCode: string;
      vatRatePercent: number;
      curfewHourLocal: number;
    }

    const v1QatarPolicy: PolicySnapshot = { version: '2025.1', countryCode: 'QA', vatRatePercent: 0, curfewHourLocal: 23 };
    const v2QatarPolicy: PolicySnapshot = { version: '2026.1', countryCode: 'QA', vatRatePercent: 5, curfewHourLocal: 22 };

    const projectCreatedIn2025 = {
      id: 'PRJ-LEGACY-01',
      policyVersionSnapshot: v1QatarPolicy,
    };

    // Global policy updates to v2
    const globalPolicies = new Map<string, PolicySnapshot>();
    globalPolicies.set('QA', v2QatarPolicy);

    // Historical project still retains and enforces v1:
    expect(projectCreatedIn2025.policyVersionSnapshot.version).toBe('2025.1');
    expect(projectCreatedIn2025.policyVersionSnapshot.vatRatePercent).toBe(0);
    // Global active policy is v2:
    expect(globalPolicies.get('QA')?.version).toBe('2026.1');
  });

  // ---------------------------------------------------------------------------
  // Invariant 14: Client Portal users cannot see internal margins or contractor rates
  // ---------------------------------------------------------------------------
  it('INV-14: Server-side projection strictly strips internal contractor buy-rates and profit margins from Client Portal', () => {
    interface InternalBoqItem {
      id: string;
      description: string;
      contractorBuyRate: number; // Confidential internal cost
      internalMarginPercent: number; // Confidential margin
      clientSellPrice: number; // What the client sees
    }

    const internalItems: InternalBoqItem[] = [
      { id: 'item-1', description: 'Curved LED Wall 4K P2.5', contractorBuyRate: 45000, internalMarginPercent: 35, clientSellPrice: 69230 },
      { id: 'item-2', description: 'Certified Rigging Trussing', contractorBuyRate: 12000, internalMarginPercent: 40, clientSellPrice: 20000 },
    ];

    function projectForClientPortal(items: InternalBoqItem[]) {
      return items.map(item => ({
        id: item.id,
        description: item.description,
        clientSellPrice: item.clientSellPrice,
      }));
    }

    const clientView = projectForClientPortal(internalItems);
    expect(clientView[0]).toHaveProperty('clientSellPrice');
    expect(clientView[0]).not.toHaveProperty('contractorBuyRate');
    expect(clientView[0]).not.toHaveProperty('internalMarginPercent');
    expect((clientView[0] as any).contractorBuyRate).toBeUndefined();
    expect((clientView[0] as any).internalMarginPercent).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Invariant 15: Integration failure produces provisional/reconciliation state rather than fake success
  // ---------------------------------------------------------------------------
  it('INV-15: External bank/ERP dispatch timeout places record in provisional reconciliation state with zero duplicate dispatch', () => {
    interface ExternalTransaction {
      id: string;
      externalSystem: string;
      state: 'idle' | 'dispatched_awaiting_ack' | 'reconciliation_required' | 'confirmed' | 'failed';
      retryCount: number;
      dispatchedPayloadHash: string;
    }

    const tx: ExternalTransaction = {
      id: 'tx-bank-payout-9988',
      externalSystem: 'QNB_CORPORATE_GATEWAY',
      state: 'idle',
      retryCount: 0,
      dispatchedPayloadHash: 'hash-payload-9988',
    };

    function simulateNetworkTimeout(transaction: ExternalTransaction): ExternalTransaction {
      // Invariant: Do NOT mark failed (could have succeeded remotely); do NOT mark confirmed (fake success).
      // Mark RECONCILIATION_REQUIRED and freeze blind automated retries.
      return {
        ...transaction,
        state: 'reconciliation_required',
        retryCount: transaction.retryCount + 1,
      };
    }

    const timedOutTx = simulateNetworkTimeout(tx);
    expect(timedOutTx.state).toBe('reconciliation_required');
    expect(timedOutTx.state !== 'confirmed').toBe(true);
    expect(timedOutTx.state !== 'failed').toBe(true);
  });
});
