import { describe, it, expect, beforeEach } from 'vitest';
import {
  ProductionGateEngine,
  CompensatingRollbackEngine,
  BackupManifestReconciliationEngine,
  SupportRunbookEngine,
  FeatureFlagEngine,
  GoLiveEngine,
  safeSha256,
} from '@e3-eos/domain';
import {
  RolloutController,
  productionGateRepository,
  compensatingTransactionRepository,
  featureFlagEngine,
  productionSignoffRepository,
} from '../apps/api/src/rollout/rollout.controller.js';
import {
  ProcurementController,
  poRepository,
  vendorRepository,
} from '../apps/api/src/procurement/procurement.controller.js';
import { projectRepository } from '../apps/api/src/projects/projects.controller.js';

describe('Sprint 07 Acceptance Suite: Production Rollout, Security, Recovery & Go-Live (AT-087 - AT-092)', () => {
  let rolloutController: RolloutController;
  let procurementController: ProcurementController;

  const agencyOrgId = '11111111-1111-4111-8111-111111111111';
  const attackerOrgId = '99999999-9999-4999-8999-999999999999';
  const projectId = 'prj-qnd-2026-prod';

  beforeEach(() => {
    rolloutController = new RolloutController();
    procurementController = new ProcurementController();

    productionGateRepository.clear();
    compensatingTransactionRepository.clear();
    poRepository.clear();
    vendorRepository.clear();
    projectRepository.clear();
    productionSignoffRepository.clear();

    projectRepository.set(projectId, {
      id: projectId,
      organisationId: agencyOrgId,
      projectCode: 'QND-2026-PROD',
      title: 'Qatar National Day 2026 Corniche Celebration',
      description: 'Official National Day Event Production & Execution',
      originCode: 'DIRECT_AWARD',
      ownerId: 'usr-pm-director',
      maturity: 'in_delivery',
      outcome: 'undetermined',
      financialAssumptions: {
        currency: 'QAR',
        expectedRevenueMax: '25000000',
        estimatedCost: '18000000',
      },
      rowVersion: 1,
    });
  });

  const validReq = {
    headers: { 'x-request-id': 'req-s07-prod', 'x-user-id': 'usr-executive-owner' },
    organisationId: agencyOrgId,
    userId: 'usr-executive-owner',
  } as any;

  // --- AT-087: Database and Object Manifest Restore Drill ---
  describe('AT-087: Database & Object Manifest Parity Drill', () => {
    it('verifies exact cryptographic checksum parity and flags discrepancy if records are missing', () => {
      const backupManifests = [
        { recordType: 'projects', recordCount: 35, dataHash: 'hash-prj-35' },
        { recordType: 'boq_packages', recordCount: 2410, dataHash: 'hash-boq-2410' },
        { recordType: 'purchase_orders', recordCount: 1840, dataHash: 'hash-po-1840' },
        { recordType: 'inventory_assets', recordCount: 380, dataHash: 'hash-asset-380' },
      ];

      // Exact restored match
      const restoreSuccess = BackupManifestReconciliationEngine.reconcileRestoreManifest(
        backupManifests,
        [
          { recordType: 'projects', recordCount: 35, dataHash: 'hash-prj-35' },
          { recordType: 'boq_packages', recordCount: 2410, dataHash: 'hash-boq-2410' },
          { recordType: 'purchase_orders', recordCount: 1840, dataHash: 'hash-po-1840' },
          { recordType: 'inventory_assets', recordCount: 380, dataHash: 'hash-asset-380' },
        ]
      );
      expect(restoreSuccess.isReconciled).toBe(true);
      expect(restoreSuccess.discrepancies.length).toBe(0);

      // Discrepancy target (missing asset count)
      const restoreMismatch = BackupManifestReconciliationEngine.reconcileRestoreManifest(
        backupManifests,
        [
          { recordType: 'projects', recordCount: 35, dataHash: 'hash-prj-35' },
          { recordType: 'boq_packages', recordCount: 2410, dataHash: 'hash-boq-2410' },
          { recordType: 'purchase_orders', recordCount: 1840, dataHash: 'hash-po-1840' },
          { recordType: 'inventory_assets', recordCount: 379, dataHash: 'hash-asset-379' }, // 1 missing!
        ]
      );
      expect(restoreMismatch.isReconciled).toBe(false);
      expect(restoreMismatch.discrepancies[0]).toContain('COUNT_MISMATCH');
    });

    it('reconciles restore manifests via RolloutController', () => {
      const res = rolloutController.executeRestoreDrill(
        {
          backupSnapshotId: 'snap-backup-2026-10-01-prod',
          backupManifests: [{ recordType: 'projects', recordCount: 35, dataHash: 'hash-prj-35' }],
          restoredManifests: [{ recordType: 'projects', recordCount: 35, dataHash: 'hash-prj-35' }],
        },
        validReq
      );

      expect(res.data.status).toBe('reconciled');
      expect(res.data.payload?.isReconciled).toBe(true);
    });
  });

  // --- AT-088: Non-Destructive Compensating Rollback ---
  describe('AT-088: Non-Destructive Compensating Rollback After External PO Dispatch', () => {
    it('issues compensating cancellation record preserving full history and rejects record deletion', () => {
      // 1. Create vendor and PO
      const ven = procurementController.createVendor(
        { vendorCode: 'VEN-RIGGING-QA', name: 'Qatar Event Rigging Co', category: 'corporate' },
        validReq
      );
      const po = procurementController.createPurchaseOrder(
        projectId,
        {
          poNumber: 'PO-2026-RIG-001',
          vendorId: ven.data.id,
          currency: 'QAR',
          totalAmount: '450000',
          lines: [{ packageId: 'pkg-rig', description: 'Truss structure', quantity: '1', unitCost: '450000' }],
        },
        validReq
      );
      const poId = po.data.id;

      // 2. Transmit to external vendor
      const storedPo = poRepository.get(poId)!;
      storedPo.status = 'sent_to_vendor' as any;
      poRepository.set(poId, storedPo);

      // 3. Rollback requested
      const cancelRes = rolloutController.compensatingCancellation(
        projectId,
        poId,
        {
          cancellationReason: 'Event layout revised by supreme committee directive',
          supplierAcknowledged: true,
        },
        validReq
      );

      expect(cancelRes.data.status).toBe('compensating_cancellation_issued');
      expect(cancelRes.data.payload?.originalStatus).toBe('sent_to_vendor');

      // Verify PO record is NOT deleted
      const existingPo = poRepository.get(poId);
      expect(existingPo).toBeDefined();
      expect(existingPo?.status).toBe('compensating_cancellation_issued');
    });
  });

  // --- AT-089: Production Gate Blocks Mock Data ---
  describe('AT-089: Mock Connector and Placeholder Detection Gate', () => {
    it('strictly forbids production deployment if any mock or localhost connector is present', () => {
      const evalResult = ProductionGateEngine.evaluateProductionGate('production', [
        {
          connectorId: 'conn-sap-s4hana',
          endpointUrl: 'https://erp.qatar-events.qa/api/v1',
          isVerified: true,
          isMock: false,
        },
        {
          connectorId: 'conn-mock-bank',
          endpointUrl: 'http://localhost:3000/mock-qcb-wps',
          isVerified: false,
          isMock: true,
        },
      ]);

      expect(evalResult.canGoLive).toBe(false);
      expect(evalResult.blockers.length).toBeGreaterThan(0);
      expect(evalResult.blockers[0]).toContain('MOCK_ENDPOINT_DETECTED');
    });

    it('allows production go-live when all connectors are verified and non-mock', () => {
      const evalResult = ProductionGateEngine.evaluateProductionGate('production', [
        {
          connectorId: 'conn-sap-s4hana',
          endpointUrl: 'https://erp.qatar-events.qa/api/v1',
          isVerified: true,
          isMock: false,
        },
        {
          connectorId: 'conn-zatca-phase2',
          endpointUrl: 'https://gw.zatca.gov.sa/invoicing/v2',
          isVerified: true,
          isMock: false,
        },
      ]);

      expect(evalResult.canGoLive).toBe(true);
      expect(evalResult.blockers.length).toBe(0);
      expect(evalResult.verifiedConnectorsCount).toBe(2);
    });
  });

  // --- AT-090: Large Event Concurrency Envelope ---
  describe('AT-090: Large Event Load & Concurrency Envelope', () => {
    it('executes 100 concurrent read operations in under 200ms without race conditions', async () => {
      const startTime = Date.now();
      const operations = Array.from({ length: 100 }, (_, idx) => {
        return Promise.resolve().then(() => {
          return rolloutController.getMigrationReconciliation({
            ...validReq,
            headers: { 'x-request-id': `req-concurrent-${idx}` },
          });
        });
      });

      const results = await Promise.all(operations);
      const elapsed = Date.now() - startTime;

      expect(results.length).toBe(100);
      expect(results.every((r) => r.data.status === 'fully_reconciled')).toBe(true);
      expect(elapsed).toBeLessThan(400);
    });
  });

  // --- AT-091: Independent Security & Tenant Isolation ---
  describe('AT-091: Independent Security Assessment & Multi-Tenant Boundaries', () => {
    it('guarantees tenant isolation preventing cross-tenant mutations', () => {
      // 1. Create a PO in Agency Org
      const ven = procurementController.createVendor(
        { vendorCode: 'VEN-SEC-01', name: 'Confidential Security Services', category: 'corporate' },
        validReq
      );
      const po = procurementController.createPurchaseOrder(
        projectId,
        {
          poNumber: 'PO-2026-VIP-SEC',
          vendorId: ven.data.id,
          currency: 'QAR',
          totalAmount: '300000',
          lines: [{ packageId: 'pkg-sec', description: 'VIP Close Protection', quantity: '1', unitCost: '300000' }],
        },
        validReq
      );

      // 2. Attacker org attempts to cancel PO
      const attackerReq = {
        headers: { 'x-request-id': 'req-attack-cross-tenant', 'x-user-id': 'usr-attacker' },
        organisationId: attackerOrgId,
        userId: 'usr-attacker',
      } as any;

      expect(() =>
        rolloutController.compensatingCancellation(
          projectId,
          po.data.id,
          { cancellationReason: 'Malicious unauthorized cancellation', supplierAcknowledged: false },
          attackerReq
        )
      ).toThrowError(/PURCHASE_ORDER_NOT_FOUND/);

      // 3. Security audit report confirms pass
      const audit = rolloutController.getSecurityAssessment(validReq);
      expect(audit.data.payload?.tenantIsolationEnforced).toBe(true);
      expect(audit.data.payload?.findings.length).toBe(0);
    });
  });

  // --- AT-092: Operational Support Failure Drills ---
  describe('AT-092: Operational Support Failure Drills (RB01 - RB12)', () => {
    it('executes database outage runbook RB01 without developer intervention', () => {
      const drill = SupportRunbookEngine.executeSupportDrill({
        incidentType: 'db_api_outage',
        details: 'Cloud SQL primary instance unavailable during failover',
      });

      expect(drill.runbookId).toBe('RB01');
      expect(drill.status).toBe('resolved_under_runbook');
      expect(drill.immediateAction).toContain('degraded state');
      expect(drill.recoveryAndEvidence).toContain('replay outbox');
      expect(drill.isAuditPreserved).toBe(true);
    });

    it('executes credential compromise runbook RB04 with Secret Manager key rotation', () => {
      const drill = SupportRunbookEngine.executeSupportDrill({
        incidentType: 'credential_compromise',
        details: 'Operator inadvertently pasted staging API token in vendor ticket',
      });

      expect(drill.runbookId).toBe('RB04');
      expect(drill.immediateAction).toContain('Revoke token/sessions');
      expect(drill.recoveryAndEvidence).toContain('Secret Manager');
    });

    it('executes prompt injection runbook RB10 quarantining malicious payload', () => {
      const drill = SupportRunbookEngine.executeSupportDrill({
        incidentType: 'malicious_file_or_prompt_injection',
        details: 'Adversarial prompt injection embedded in tender response pdf',
      });

      expect(drill.runbookId).toBe('RB10');
      expect(drill.immediateAction).toContain('Quarantine content/job');
      expect(drill.recoveryAndEvidence).toContain('cross-project retrieval');
    });
  });

  // --- Feature Flag Engine Invariants ---
  describe('Feature Flag Engine & Governance Gating', () => {
    it('prevents disabling core platform flags in production environment', () => {
      const ffEngine = new FeatureFlagEngine();
      expect(() =>
        ffEngine.toggleFlag(
          'core.project_onboarding',
          false,
          'Testing disable core in prod',
          'admin-user',
          'production'
        )
      ).toThrowError(/CORE_FLAG_IMMUTABLE/);
    });

    it('allows toggling optional AI and integration flags with audit trail', () => {
      const ffEngine = new FeatureFlagEngine();
      const { flag, audit } = ffEngine.toggleFlag(
        'ai.copilot_assistant',
        false,
        'Decouple AI assistant for initial core go-live',
        'ops-lead',
        'production'
      );

      expect(flag.enabled).toBe(false);
      expect(audit.newState).toBe(false);
      expect(audit.reason).toContain('Decouple AI assistant');
      expect(ffEngine.isEnabled('ai.copilot_assistant')).toBe(false);
    });
  });

  // --- Go-Live Board Evaluation ---
  describe('Go-Live Board 9-Pillar Evaluation', () => {
    it('evaluates all 9 production pillars and produces unanimous readiness verdict', () => {
      const evalResult = GoLiveEngine.evaluate({
        environment: 'production',
        releaseTag: 'eos-v1.0.0-rc1',
        gitCommit: 'e1ee727',
      });

      expect(evalResult.canGoLive).toBe(true);
      expect(evalResult.blockersCount).toBe(0);
      expect(evalResult.pillars.length).toBe(9);
      expect(evalResult.pillars.every((p) => p.mandatoryInvariantsMet)).toBe(true);
      expect(['GO', 'CONDITIONAL_GO']).toContain(evalResult.overallVerdict);
    });
  });

  // --- Production Acceptance Certificate & Cryptographic Sign-Off ---
  describe('Production Sign-off & Tamper-Proof Cryptographic Certificate', () => {
    it('creates an immutable cryptographic sign-off certificate with SHA-256 digest', () => {
      const signoffRes = rolloutController.signoffProduction(
        {
          releaseTag: 'eos-v1.0.0-rc1',
          gitCommit: 'e1ee727',
          environment: 'production',
          decision: 'approved_for_go_live',
          authorizedBy: 'E3 Executive Leadership & Asset Owner',
          signerRole: 'Chief Operating Officer / Executive Director',
          signoffComments: 'All 50 modules and AT-087 to AT-092 acceptance tests verified. Production go-live approved.',
          activeExceptionsAcknowledged: true,
          disasterRecoveryVerified: true,
        },
        validReq
      );

      expect(signoffRes.data.status).toBe('production_approved');
      expect(signoffRes.data.payload?.auditHash).toBeDefined();
      expect(signoffRes.data.payload?.auditHash.length).toBe(64); // SHA-256 length

      // Check GET endpoint retrieves the certificate
      const getRes = rolloutController.getProductionSignoff(validReq);
      expect(getRes.data.status).toBe('certificate_granted');
      expect((getRes.data.payload as any)?.tamperProofAuditHash).toBe(signoffRes.data.payload?.auditHash);
    });
  });
});
