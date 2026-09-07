import { describe, it, expect } from 'vitest';
import {
  ProductionGateEngine,
  CompensatingRollbackEngine,
  BackupManifestReconciliationEngine,
  SupportRunbookEngine,
} from './index.js';

describe('Phase 07 Domain Logic: Production Rollout, Security, and Recovery Drills', () => {
  // AT-089: Production gate blocks mock data
  describe('AT-089: Production Gate Engine', () => {
    it('blocks production go-live when mock connectors or unverified endpoints are detected', () => {
      const prodCheck = ProductionGateEngine.evaluateProductionGate('production', [
        {
          connectorId: 'conn-sap-finance',
          endpointUrl: 'https://api.sap.corp/v1',
          isVerified: true,
          isMock: false,
        },
        {
          connectorId: 'conn-fake-ticketing',
          endpointUrl: 'http://localhost:8080/mock-ticketing',
          isVerified: false,
          isMock: true,
        },
      ]);

      expect(prodCheck.canGoLive).toBe(false);
      expect(prodCheck.blockers.length).toBe(1);
      expect(prodCheck.blockers[0]).toContain('MOCK_ENDPOINT_DETECTED');
    });

    it('allows production go-live when all endpoints are verified and non-mock', () => {
      const prodCheck = ProductionGateEngine.evaluateProductionGate('production', [
        {
          connectorId: 'conn-sap-finance',
          endpointUrl: 'https://api.sap.corp/v1',
          isVerified: true,
          isMock: false,
        },
      ]);

      expect(prodCheck.canGoLive).toBe(true);
      expect(prodCheck.blockers.length).toBe(0);
      expect(prodCheck.verifiedConnectorsCount).toBe(1);
    });
  });

  // AT-088: Compensating rollback after external PO sent
  describe('AT-088: Compensating Rollback Engine', () => {
    it('issues compensating business cancellation without deleting or resetting external PO history', () => {
      const sentPO = {
        id: 'po-rigging-401',
        status: 'sent_to_vendor',
        totalAmount: '120000',
      };

      const record = CompensatingRollbackEngine.issueCompensatingCancellation(
        sentPO,
        'Event scope reduced; VIP stage cancelled by organizing committee',
        true
      );

      expect(record.poId).toBe('po-rigging-401');
      expect(record.originalStatus).toBe('sent_to_vendor');
      expect(record.compensatingActionType).toBe('compensating_cancellation_issued');
      expect(record.externalSupplierAcknowledged).toBe(true);
    });
  });

  // AT-087: Backup manifest reconciliation
  describe('AT-087: Backup Manifest Reconciliation Engine', () => {
    it('verifies manifest parity and identifies count or hash discrepancies in restore drill', () => {
      const backup = [
        { recordType: 'projects', recordCount: 15, dataHash: 'hash-prj-15' },
        { recordType: 'purchase_orders', recordCount: 42, dataHash: 'hash-po-42' },
      ];

      const restoredSuccess = [
        { recordType: 'projects', recordCount: 15, dataHash: 'hash-prj-15' },
        { recordType: 'purchase_orders', recordCount: 42, dataHash: 'hash-po-42' },
      ];

      const checkSuccess = BackupManifestReconciliationEngine.reconcileRestoreManifest(backup, restoredSuccess);
      expect(checkSuccess.isReconciled).toBe(true);
      expect(checkSuccess.discrepancies.length).toBe(0);

      // Discrepant target
      const restoredMismatch = [
        { recordType: 'projects', recordCount: 14, dataHash: 'hash-prj-14' }, // missing 1
        { recordType: 'purchase_orders', recordCount: 42, dataHash: 'hash-po-42' },
      ];

      const checkMismatch = BackupManifestReconciliationEngine.reconcileRestoreManifest(backup, restoredMismatch);
      expect(checkMismatch.isReconciled).toBe(false);
      expect(checkMismatch.discrepancies[0]).toContain('COUNT_MISMATCH');
    });
  });

  // AT-092: Support operational runbook drill
  describe('AT-092: Support Runbook Engine', () => {
    it('executes operational failure resolution preserving audit immutability', () => {
      const res = SupportRunbookEngine.executeSupportDrill({
        incidentType: 'remote_provider_timeout',
        details: 'Vendor ERP timed out during bulk PO submission',
      });

      expect(res.status).toBe('resolved_under_runbook');
      expect(res.isAuditPreserved).toBe(true);
      expect(res.runbookActionTaken).toContain('reconciliation_needed');
    });
  });
});
