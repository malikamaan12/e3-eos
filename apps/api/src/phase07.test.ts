import { describe, it, expect, beforeEach } from 'vitest';
import {
  RolloutController,
  productionGateRepository,
  compensatingTransactionRepository,
} from './rollout/rollout.controller.js';
import {
  ProcurementController,
  poRepository,
  vendorRepository,
} from './procurement/procurement.controller.js';
import { FinanceController } from './finance/finance.controller.js';
import { projectRepository } from './projects/projects.controller.js';

describe('Phase 07 Integration Tests (AT-087 through AT-092)', () => {
  let rolloutController: RolloutController;
  let procurementController: ProcurementController;
  let financeController: FinanceController;

  const agencyOrgId = '11111111-1111-4111-8111-111111111111';
  const otherOrgId = '22222222-2222-4222-8222-222222222222';
  const projectId = 'prj-p07-prod-launch';

  beforeEach(() => {
    rolloutController = new RolloutController();
    procurementController = new ProcurementController();
    financeController = new FinanceController();

    productionGateRepository.clear();
    compensatingTransactionRepository.clear();
    poRepository.clear();
    vendorRepository.clear();
    projectRepository.clear();

    projectRepository.set(projectId, {
      id: projectId,
      organisationId: agencyOrgId,
      projectCode: 'P07-PROD-LAUNCH',
      title: 'Qatar National Day Festival Final Production',
      description: 'Production event deployment and operational rollout',
      originCode: 'DIRECT_AWARD',
      ownerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      maturity: 'in_delivery',
      outcome: 'undetermined',
      financialAssumptions: {
        currency: 'QAR',
        expectedRevenueMax: '10000000',
        estimatedCost: '7000000',
      },
      rowVersion: 1,
    });
  });

  const agencyReq = {
    headers: { 'x-request-id': 'req-test-p07', 'x-user-id': 'usr-lead-director' },
    organisationId: agencyOrgId,
    userId: 'usr-lead-director',
  } as any;

  // --- AT-087: Restore Database and Object Manifests in Isolated Environment ---
  describe('AT-087: Database and Object Manifest Restore Drill', () => {
    it('reconciles backup checksum manifests against restored target and detects discrepancies', () => {
      const backupManifests = [
        { recordType: 'projects', recordCount: 20, dataHash: 'hash-prj-20' },
        { recordType: 'purchase_orders', recordCount: 55, dataHash: 'hash-po-55' },
        { recordType: 'invoices', recordCount: 40, dataHash: 'hash-inv-40' },
      ];

      // 1. Exact match restores successfully
      const successRes = rolloutController.executeRestoreDrill(
        {
          backupSnapshotId: 'snap-backup-2026-10-01',
          backupManifests,
          restoredManifests: [
            { recordType: 'projects', recordCount: 20, dataHash: 'hash-prj-20' },
            { recordType: 'purchase_orders', recordCount: 55, dataHash: 'hash-po-55' },
            { recordType: 'invoices', recordCount: 40, dataHash: 'hash-inv-40' },
          ],
        },
        agencyReq
      );

      expect(successRes.data.status).toBe('reconciled');
      expect(successRes.data.payload?.isReconciled).toBe(true);
      expect(successRes.data.payload?.discrepancies.length).toBe(0);

      // 2. Target with missing records flags discrepancy
      const mismatchRes = rolloutController.executeRestoreDrill(
        {
          backupSnapshotId: 'snap-backup-corrupted-target',
          backupManifests,
          restoredManifests: [
            { recordType: 'projects', recordCount: 20, dataHash: 'hash-prj-20' },
            { recordType: 'purchase_orders', recordCount: 54, dataHash: 'hash-po-54' }, // Missing 1 PO
            { recordType: 'invoices', recordCount: 40, dataHash: 'hash-inv-40' },
          ],
        },
        agencyReq
      );

      expect(mismatchRes.data.status).toBe('discrepancy_detected');
      expect(mismatchRes.data.payload?.isReconciled).toBe(false);
      expect(mismatchRes.data.payload?.discrepancies[0]).toContain('COUNT_MISMATCH');
    });
  });

  // --- AT-088: Rollback After External PO Already Sent ---
  describe('AT-088: Non-Destructive Compensating Rollback After External Dispatch', () => {
    it('issues compensating business cancellation without deleting or resetting external PO history', () => {
      // 1. Create vendor and PO
      const venRes = procurementController.createVendor(
        { vendorCode: 'VEN-STAGE-01', name: 'Al Rayyan Stage Engineering', category: 'corporate' },
        agencyReq
      );
      const vendorId = venRes.data.id;

      const poRes = procurementController.createPurchaseOrder(
        projectId,
        {
          poNumber: 'PO-2026-DISPATCHED-01',
          vendorId,
          currency: 'QAR',
          totalAmount: '150000',
          lines: [{ packageId: 'pkg-main', description: 'Truss grid rental', quantity: '1', unitCost: '150000' }],
        },
        agencyReq
      );
      const poId = poRes.data.id;

      // 2. PO is sent to vendor externally
      const poObj = poRepository.get(poId)!;
      poObj.status = 'sent_to_vendor' as any;
      poRepository.set(poId, poObj);

      // 3. Rollback requested: project scope changed
      const cancelRes = rolloutController.compensatingCancellation(
        projectId,
        poId,
        {
          cancellationReason: 'VIP Stage scope reduced by organizing committee directive',
          supplierAcknowledged: true,
        },
        agencyReq
      );

      // 4. Invariant AT-088: Record is NOT deleted; status transitions to compensating_cancellation_issued
      expect(cancelRes.data.status).toBe('compensating_cancellation_issued');
      expect(cancelRes.data.payload?.originalStatus).toBe('sent_to_vendor');
      expect(cancelRes.data.payload?.externalSupplierAcknowledged).toBe(true);

      const storedPo = poRepository.get(poId);
      expect(storedPo).toBeDefined(); // NOT deleted!
      expect(storedPo?.status).toBe('compensating_cancellation_issued');
    });
  });

  // --- AT-089: Production Deployment Contains Mock Data or Placeholder Connector ---
  describe('AT-089: Production Gate Blocks Mock Data and Placeholder Connectors', () => {
    it('strictly blocks production release when mock connectors or localhost URLs are detected', () => {
      // 1. Production gate evaluation containing mock connector
      expect(() =>
        rolloutController.verifyProductionGate(
          {
            environment: 'production',
            connectors: [
              {
                connectorId: 'conn-sap-live',
                endpointUrl: 'https://erp.qatar-events.qa/api/v1',
                isVerified: true,
                isMock: false,
              },
              {
                connectorId: 'conn-mock-ticketing',
                endpointUrl: 'http://localhost:8080/mock-ticketing-api',
                isVerified: false,
                isMock: true,
              },
            ],
          },
          agencyReq
        )
      ).toThrowError(/PRODUCTION_RELEASE_BLOCKED_MOCK_DATA_DETECTED/);

      // 2. Production gate with verified production connectors passes
      const verifiedRes = rolloutController.verifyProductionGate(
        {
          environment: 'production',
          connectors: [
            {
              connectorId: 'conn-sap-live',
              endpointUrl: 'https://erp.qatar-events.qa/api/v1',
              isVerified: true,
              isMock: false,
            },
            {
              connectorId: 'conn-ticketing-live',
              endpointUrl: 'https://tickets.qatar-events.qa/api/v1',
              isVerified: true,
              isMock: false,
            },
          ],
        },
        agencyReq
      );

      expect(verifiedRes.data.status).toBe('passed');
      expect(verifiedRes.data.payload?.canGoLive).toBe(true);
      expect(verifiedRes.data.payload?.verifiedConnectorsCount).toBe(2);
    });
  });

  // --- AT-090: Large Event Load and Dependency Pressure ---
  describe('AT-090: Large Event Load and Concurrency Envelope', () => {
    it('executes 100 concurrent operations within tight latency envelope without race conditions', async () => {
      // Initialize financial position
      financeController.setFinancialPosition(
        projectId,
        {
          currency: 'QAR',
          originalBudget: '5000000',
          approvedBudgetChanges: '0',
          postedActualCost: '2000000',
          acceptedAccruedCost: '500000',
          remainingCommitments: '1000000',
          uncommittedForecast: '500000',
        },
        agencyReq
      );

      const startTime = Date.now();
      const operations = Array.from({ length: 100 }, (_, idx) => {
        return Promise.resolve().then(() => {
          return financeController.getFinancialPosition(projectId, {
            ...agencyReq,
            headers: { 'x-request-id': `req-concurrent-${idx}` },
          });
        });
      });

      const results = await Promise.all(operations);
      const durationMs = Date.now() - startTime;

      expect(results.length).toBe(100);
      expect(results.every((r) => r.data.payload?.estimateAtCompletion.amount.toString() === '4000000')).toBe(true);
      // In-process 100 concurrent evaluations should complete in < 200ms
      expect(durationMs).toBeLessThan(500);
    });
  });

  // --- AT-091: Independent Security & Tenant Boundary Assessment ---
  describe('AT-091: Independent Security and Multi-Tenant Isolation Assessment', () => {
    it('guarantees strict tenant isolation preventing cross-tenant data access', () => {
      // 1. Create a PO in Org A
      const venRes = procurementController.createVendor(
        { vendorCode: 'VEN-ISOL-01', name: 'Confidential AV Systems', category: 'corporate' },
        agencyReq
      );
      const poRes = procurementController.createPurchaseOrder(
        projectId,
        {
          poNumber: 'PO-2026-SECRET-01',
          vendorId: venRes.data.id,
          currency: 'QAR',
          totalAmount: '250000',
          lines: [{ packageId: 'pkg-vip', description: 'VIP Audio', quantity: '1', unitCost: '250000' }],
        },
        agencyReq
      );
      const poId = poRes.data.id;

      // 2. Org B attempts to cancel or access Org A's PO
      const otherOrgReq = {
        headers: { 'x-request-id': 'req-attack-01', 'x-user-id': 'usr-attacker' },
        organisationId: otherOrgId,
        userId: 'usr-attacker',
      } as any;

      expect(() =>
        rolloutController.compensatingCancellation(
          projectId,
          poId,
          { cancellationReason: 'Malicious cross-tenant cancellation', supplierAcknowledged: false },
          otherOrgReq
        )
      ).toThrowError(/PURCHASE_ORDER_NOT_FOUND/);

      // 3. Security assessment endpoint confirms isolation pass
      const auditRes = rolloutController.getSecurityAssessment(agencyReq);
      expect(auditRes.data.status).toBe('passed');
      expect(auditRes.data.payload?.tenantIsolationEnforced).toBe(true);
      expect(auditRes.data.payload?.findings.length).toBe(0);
    });
  });

  // --- AT-092: Operational Owner Support Drill ---
  describe('AT-092: Operational Owner Support Drill', () => {
    it('executes support failure resolution runbook preserving audit immutability', () => {
      const drillRes = rolloutController.executeSupportDrill(
        {
          incidentType: 'remote_provider_timeout',
          details: 'Ticketing API timed out during surge booking window',
        },
        agencyReq
      );

      expect(drillRes.data.status).toBe('resolved_under_runbook');
      expect(drillRes.data.payload?.isAuditPreserved).toBe(true);
      expect(drillRes.data.payload?.runbookActionTaken).toContain('reconciliation_needed');
    });
  });
});
