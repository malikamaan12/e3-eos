import { describe, it, expect, beforeEach } from 'vitest';
import {
  ProcurementController,
  vendorRepository,
  bankChangeRepository,
  frameworkContractRepository,
  poRepository,
} from './procurement/procurement.controller.js';
import {
  InventoryController,
  resourceRepository,
  reservationRepository,
  maintenanceHoldRepository,
  subrentalRepository,
} from './inventory/inventory.controller.js';
import {
  ProductionController,
  productionOrderRepository,
} from './production/production.controller.js';
import { projectRepository } from './projects/projects.controller.js';

describe('Phase 03 Integration Tests (AT-043 through AT-054)', () => {
  let procurementController: ProcurementController;
  let inventoryController: InventoryController;
  let productionController: ProductionController;

  const agencyOrgId = '11111111-1111-4111-8111-111111111111';
  const projectId1 = 'prj-p03-001';
  const projectId2 = 'prj-p03-002';

  beforeEach(() => {
    procurementController = new ProcurementController();
    inventoryController = new InventoryController();
    productionController = new ProductionController();

    vendorRepository.clear();
    bankChangeRepository.clear();
    frameworkContractRepository.clear();
    poRepository.clear();
    resourceRepository.clear();
    reservationRepository.clear();
    maintenanceHoldRepository.clear();
    subrentalRepository.clear();
    productionOrderRepository.clear();
    projectRepository.clear();

    projectRepository.set(projectId1, {
      id: projectId1,
      organisationId: agencyOrgId,
      projectCode: 'P03-PROJECT-1',
      title: 'Doha Corniche Main Stage',
      description: 'Major waterfront festival production',
      originCode: 'DIRECT_AWARD',
      ownerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      maturity: 'in_planning',
      outcome: 'undetermined',
      financialAssumptions: {
        currency: 'QAR',
        expectedRevenueMax: '2000000',
        estimatedCost: '1400000',
      },
      rowVersion: 1,
    });

    projectRepository.set(projectId2, {
      id: projectId2,
      organisationId: agencyOrgId,
      projectCode: 'P03-PROJECT-2',
      title: 'Katara Amphitheater Concert',
      description: 'Acoustic symphony concert',
      originCode: 'DIRECT_AWARD',
      ownerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      maturity: 'in_planning',
      outcome: 'undetermined',
      financialAssumptions: {
        currency: 'QAR',
        expectedRevenueMax: '1500000',
        estimatedCost: '900000',
      },
      rowVersion: 1,
    });
  });

  const agencyReq = {
    headers: { 'x-request-id': 'req-test-p03', 'x-user-id': 'usr-lead-buyer' },
    organisationId: agencyOrgId,
    userId: 'usr-lead-buyer',
  } as any;

  describe('AT-043: Concurrent Release Requests for One PO (Durable Idempotency)', () => {
    it('ensures duplicate release calls return the same commitment without creating duplicate external orders', () => {
      // 1. Create vendor
      const venRes = procurementController.createVendor(
        {
          vendorCode: 'VEN-LIGHTS-01',
          name: 'Apex Lighting Systems WLL',
          category: 'corporate',
        },
        agencyReq
      );
      const vendorId = venRes.data.id;

      // 2. Create PO
      const poRes = procurementController.createPurchaseOrder(
        projectId1,
        {
          poNumber: 'PO-2026-LIGHTS-01',
          vendorId,
          currency: 'QAR',
          totalAmount: '80000',
          lines: [
            {
              packageId: 'wp-lighting-01',
              description: 'Profile Moving Heads',
              quantity: '20',
              unitCost: '4000',
            },
          ],
        },
        agencyReq
      );
      const poId = poRes.data.id;

      // 3. First release request
      const rel1 = procurementController.releasePurchaseOrder(
        projectId1,
        poId,
        { idempotencyKey: 'release-idem-token-001' },
        agencyReq
      );

      expect(rel1.data.status).toBe('released');
      expect(rel1.data.externalDeliveryStatus).toBe('sent_pending_confirmation');

      // 4. Concurrent duplicate release request with the same idempotency key
      const rel2 = procurementController.releasePurchaseOrder(
        projectId1,
        poId,
        { idempotencyKey: 'release-idem-token-001' },
        agencyReq
      );

      // Same commitment returned, no second release
      expect(rel2.data.status).toBe('released');
      expect(rel2.data.payload!.id).toBe(poId);

      // Attempting release with different key triggers conflict
      try {
        procurementController.releasePurchaseOrder(
          projectId1,
          poId,
          { idempotencyKey: 'different-release-token' },
          agencyReq
        );
        expect.unreachable('Should have thrown 409 Conflict');
      } catch (err: any) {
        expect(err.getStatus()).toBe(409);
        expect((err.getResponse() as any).detail).toContain('PO_ALREADY_RELEASED');
      }
    });
  });

  describe('AT-044: Framework Agreement Ceiling Consumption', () => {
    it('atomically allocates call-offs and rejects attempts that breach the parent ceiling', () => {
      // 1. Create vendor
      const venRes = procurementController.createVendor(
        {
          vendorCode: 'VEN-TRUSS-01',
          name: 'Eurotruss Gulf FZE',
          category: 'corporate',
        },
        agencyReq
      );
      const vendorId = venRes.data.id;

      // 2. Create Framework Contract with 200,000 QAR ceiling
      const fcRes = procurementController.createFrameworkContract(
        {
          vendorId,
          contractCode: 'FC-TRUSS-2026',
          ceilingAmount: '200000',
          currency: 'QAR',
          validUntil: '2026-12-31T23:59:59Z',
        },
        agencyReq
      );
      const fcId = fcRes.data.id;

      // 3. First call-off: 140,000 QAR
      const po1Res = procurementController.createPurchaseOrder(
        projectId1,
        {
          poNumber: 'CALLOFF-01',
          vendorId,
          frameworkContractId: fcId,
          currency: 'QAR',
          totalAmount: '140000',
          lines: [
            {
              packageId: 'wp-truss-01',
              description: 'Roof Grid Trussing',
              quantity: '1',
              unitCost: '140000',
            },
          ],
        },
        agencyReq
      );

      expect(po1Res.data.status).toBe('approved');
      const fcAfter1 = frameworkContractRepository.get(fcId)!;
      expect(fcAfter1.consumedAmount.toString()).toBe('140000.000000'); // 60,000 QAR remaining

      // 4. Second call-off for 70,000 QAR exceeds remaining 60,000 QAR and is atomically rejected
      try {
        procurementController.createPurchaseOrder(
          projectId2,
          {
            poNumber: 'CALLOFF-02',
            vendorId,
            frameworkContractId: fcId,
            currency: 'QAR',
            totalAmount: '70000',
            lines: [
              {
                packageId: 'wp-truss-02',
                description: 'Amphitheater Towers',
                quantity: '1',
                unitCost: '70000',
              },
            ],
          },
          agencyReq
        );
        expect.unreachable('Should have thrown 409 Conflict');
      } catch (err: any) {
        expect(err.getStatus()).toBe(409);
        expect((err.getResponse() as any).detail).toContain('FRAMEWORK_CEILING_EXCEEDED');
      }

      // 5. Valid call-off within remaining 60,000 QAR (e.g. 50,000 QAR) succeeds
      const po3Res = procurementController.createPurchaseOrder(
        projectId2,
        {
          poNumber: 'CALLOFF-03',
          vendorId,
          frameworkContractId: fcId,
          currency: 'QAR',
          totalAmount: '50000',
          lines: [
            {
              packageId: 'wp-truss-02',
              description: 'Amphitheater Towers - Scaled',
              quantity: '1',
              unitCost: '50000',
            },
          ],
        },
        agencyReq
      );

      expect(po3Res.data.status).toBe('approved');
      const fcAfter3 = frameworkContractRepository.get(fcId)!;
      expect(fcAfter3.consumedAmount.toString()).toBe('190000.000000');
    });
  });

  describe('AT-045: Supplier Remote Order Timeout & Ambiguity Reconciliation', () => {
    it('sets timed out order to reconciliation_needed and requires explicit resolution before resend', () => {
      const venRes = procurementController.createVendor(
        {
          vendorCode: 'VEN-SPECIAL-01',
          name: 'Direct Pyrotechnics Global',
          category: 'corporate',
        },
        agencyReq
      );
      const vendorId = venRes.data.id;

      const poRes = procurementController.createPurchaseOrder(
        projectId1,
        {
          poNumber: 'PO-PYRO-001',
          vendorId,
          currency: 'QAR',
          totalAmount: '60000',
          lines: [
            {
              packageId: 'wp-pyro-01',
              description: 'Cold Spark Generators',
              quantity: '6',
              unitCost: '10000',
            },
          ],
        },
        agencyReq
      );
      const poId = poRes.data.id;

      // Release order
      procurementController.releasePurchaseOrder(
        projectId1,
        poId,
        { idempotencyKey: 'release-pyro-01' },
        agencyReq
      );

      // Simulate remote network timeout during supplier integration dispatch
      const timeoutRes = procurementController.simulateTimeout(projectId1, poId, agencyReq);
      expect(timeoutRes.data.status).toBe('reconciliation_needed');

      // Reconcile: supplier confirmed receipt via phone/manual check
      const reconcileRes = procurementController.reconcileRemoteOrder(
        projectId1,
        poId,
        { externalConfirmationStatus: 'confirmed_externally' },
        agencyReq
      );

      expect(reconcileRes.data.status).toBe('acknowledged');
      expect(reconcileRes.data.payload!.externalDeliveryStatus).toBe('confirmed');
    });
  });

  describe('AT-046: Protected Supplier Bank Details Changes', () => {
    it('enforces two-person independent review and blocks silent redirection of payment details', () => {
      const venRes = procurementController.createVendor(
        {
          vendorCode: 'VEN-CATER-01',
          name: 'VIP Catering Services WLL',
          category: 'corporate',
          bankDetails: {
            bankName: 'Qatar National Bank',
            accountName: 'VIP Catering Services WLL',
            accountNumber: '111122223333',
            iban: 'QA11QNBA00000000111122223333',
            swift: 'QNBAQAQA',
          },
        },
        agencyReq
      );
      const vendorId = venRes.data.id;

      // Procurement officer requests bank detail update
      const bcrRes = procurementController.requestBankChange(
        vendorId,
        {
          proposedBankDetails: {
            bankName: 'Doha Bank',
            accountName: 'VIP Catering Services WLL',
            accountNumber: '999988887777',
            iban: 'QA99DHBK00000000999988887777',
            swift: 'DHBKQAQA',
          },
        },
        agencyReq
      );
      const reqId = bcrRes.data.id;

      // Requester attempts self-verification (two-person rule check)
      try {
        procurementController.verifyBankChange(vendorId, reqId, agencyReq);
        expect.unreachable('Should have thrown 403 Forbidden');
      } catch (err: any) {
        expect(err.getStatus()).toBe(403);
        expect((err.getResponse() as any).detail).toContain('TWO_PERSON_RULE_VIOLATION');
      }

      // Independent finance director verifies change
      const financeReq = {
        ...agencyReq,
        headers: { ...agencyReq.headers, 'x-user-id': 'usr-finance-director' },
        userId: 'usr-finance-director',
      };

      const verifyRes = procurementController.verifyBankChange(vendorId, reqId, financeReq);
      expect(verifyRes.data.status).toBe('verified');
      expect(verifyRes.data.payload!.bankDetails?.accountNumber).toBe('999988887777');
    });
  });

  describe('AT-047: Sole-Source & Freelance Supplier Validation', () => {
    it('requires explicit rationale for sole-source awards without fabricating competitive bids', () => {
      const venRes = procurementController.createVendor(
        {
          vendorCode: 'VEN-LASER-01',
          name: 'Hans Laser Specialists',
          category: 'freelance',
          complianceVerified: false,
          freelanceGracePeriodUntil: '2026-11-30T00:00:00Z',
        },
        agencyReq
      );
      const vendorId = venRes.data.id;

      // Sole-source attempt without rationale is rejected
      try {
        procurementController.createPurchaseOrder(
          projectId1,
          {
            poNumber: 'PO-SOLE-01',
            vendorId,
            currency: 'QAR',
            totalAmount: '35000',
            isSoleSource: true,
            soleSourceRationale: '  ', // blank
            lines: [
              {
                packageId: 'wp-fx',
                description: 'Laser Operator',
                quantity: '1',
                unitCost: '35000',
              },
            ],
          },
          agencyReq
        );
        expect.unreachable('Should have thrown 400 Bad Request');
      } catch (err: any) {
        expect(err.getStatus()).toBe(400);
        expect((err.getResponse() as any).detail).toContain('SOLE_SOURCE_RATIONALE_REQUIRED');
      }

      // Sole-source with valid technical rationale succeeds
      const poRes = procurementController.createPurchaseOrder(
        projectId1,
        {
          poNumber: 'PO-SOLE-01',
          vendorId,
          currency: 'QAR',
          totalAmount: '35000',
          isSoleSource: true,
          soleSourceRationale: 'Sole certified operator for high-powered 40W outdoor RGB laser installation.',
          lines: [
            {
              packageId: 'wp-fx',
              description: 'Laser Operator',
              quantity: '1',
              unitCost: '35000',
            },
          ],
        },
        agencyReq
      );

      expect(poRes.data.status).toBe('approved');
      expect(poRes.data.payload!.isSoleSource).toBe(true);
    });
  });

  describe('AT-048: Drawing Revision Impact on Active Fabrication Orders', () => {
    it('flags in-progress workshop orders for review while completed units retain actual build version', () => {
      // 1. Create in-progress workshop order
      const orderRes = productionController.createProductionOrder(
        projectId1,
        {
          designId: '11111111-2222-3333-4444-555555555555',
          designVersionNumber: 1,
          title: 'Main Dome Arch Cladding Panels',
          orderedUnits: 10,
        },
        agencyReq
      );
      const orderId = orderRes.data.id;
      expect(orderRes.data.payload!.status).toBe('in_progress');

      // 2. Notify drawing revision v2
      const updatedRes = productionController.notifyDrawingRevision(
        projectId1,
        orderId,
        {
          designId: '11111111-2222-3333-4444-555555555555',
          newVersionNumber: 2,
        },
        agencyReq
      );

      expect(updatedRes.data.status).toBe('flagged_for_revision_review');
    });
  });

  describe('AT-049 & AT-050: Resource Reservations (Exclusive Serialized & Bulk Capacity)', () => {
    it('rejects overlapping reservations on exclusive serialized assets between projects (AT-049)', () => {
      // 1. Create exclusive serialized generator
      const resRes = inventoryController.createResource(
        {
          resourceCode: 'GEN-800KVA-01',
          name: '800kVA Heavy Mobile Generator #1',
          type: 'serialized',
          totalQuantity: 1,
          warehouseLocation: 'Logistics Bay 1',
          authoritativeSystem: 'EOS',
        },
        agencyReq
      );
      const resourceId = resRes.data.id;

      // 2. Project 1 books for Nov 10 to Nov 15
      const rsv1 = inventoryController.createReservation(
        projectId1,
        {
          resourceId,
          windowStart: '2026-11-10T00:00:00Z',
          windowEnd: '2026-11-15T00:00:00Z',
          quantity: 1,
        },
        agencyReq
      );
      expect(rsv1.data.status).toBe('confirmed');

      // 3. Project 2 attempts overlapping booking for Nov 12 to Nov 17: rejected
      try {
        inventoryController.createReservation(
          projectId2,
          {
            resourceId,
            windowStart: '2026-11-12T00:00:00Z',
            windowEnd: '2026-11-17T00:00:00Z',
            quantity: 1,
          },
          agencyReq
        );
        expect.unreachable('Should have thrown 409 Conflict');
      } catch (err: any) {
        expect(err.getStatus()).toBe(409);
        expect((err.getResponse() as any).detail).toContain('RESERVATION_COLLISION');
      }

      // 4. Project 2 books non-overlapping window Nov 16 to Nov 20: succeeds
      const rsv2 = inventoryController.createReservation(
        projectId2,
        {
          resourceId,
          windowStart: '2026-11-16T00:00:00Z',
          windowEnd: '2026-11-20T00:00:00Z',
          quantity: 1,
        },
        agencyReq
      );
      expect(rsv2.data.status).toBe('confirmed');
    });

    it('enforces bulk stock capacity locks and prevents oversell across projects (AT-050)', () => {
      // 1. Create bulk crowd barrier pool of 100 units
      const resRes = inventoryController.createResource(
        {
          resourceCode: 'BARRIER-MOJO-2M',
          name: 'Mojo Stage Barrier 2m',
          type: 'bulk',
          totalQuantity: 100,
          warehouseLocation: 'Fencing Rack',
          authoritativeSystem: 'EOS',
        },
        agencyReq
      );
      const resourceId = resRes.data.id;

      // 2. Project 1 books 70 units
      inventoryController.createReservation(
        projectId1,
        {
          resourceId,
          windowStart: '2026-12-01T00:00:00Z',
          windowEnd: '2026-12-05T00:00:00Z',
          quantity: 70,
        },
        agencyReq
      );

      // 3. Project 2 requests 40 units during same dates: exceeds remaining 30 -> rejected
      try {
        inventoryController.createReservation(
          projectId2,
          {
            resourceId,
            windowStart: '2026-12-02T00:00:00Z',
            windowEnd: '2026-12-04T00:00:00Z',
            quantity: 40,
          },
          agencyReq
        );
        expect.unreachable('Should have thrown 409 Conflict');
      } catch (err: any) {
        expect(err.getStatus()).toBe(409);
        expect((err.getResponse() as any).detail).toContain('BULK_CAPACITY_EXCEEDED');
      }
    });
  });

  describe('AT-051 & AT-052: Maintenance Quarantine & Cutover Authority', () => {
    it('quarantines damaged asset and blocks reservation until inspected and released (AT-051)', () => {
      const resRes = inventoryController.createResource(
        {
          resourceCode: 'SPEAKER-SUB-01',
          name: 'd&b SL-GSUB Subwoofer #1',
          type: 'serialized',
          totalQuantity: 1,
          warehouseLocation: 'Audio Vault',
          authoritativeSystem: 'EOS',
        },
        agencyReq
      );
      const resourceId = resRes.data.id;

      // Asset returned damaged: placed on hold
      const holdRes = inventoryController.placeOnMaintenanceHold(
        resourceId,
        {
          reason: 'Blown voice coil during bass-heavy set',
          damageReport: 'IR-2026-AUDIO-44',
        },
        agencyReq
      );
      const holdId = holdRes.data.id;

      // Attempting booking while on hold is rejected
      try {
        inventoryController.createReservation(
          projectId1,
          {
            resourceId,
            windowStart: '2026-11-20T00:00:00Z',
            windowEnd: '2026-11-22T00:00:00Z',
            quantity: 1,
          },
          agencyReq
        );
        expect.unreachable('Should have thrown 409 Conflict');
      } catch (err: any) {
        expect(err.getStatus()).toBe(409);
        expect((err.getResponse() as any).detail).toContain('RESOURCE_NOT_SERVICEABLE');
      }

      // Certified audio technician tests and clears maintenance hold
      const releaseRes = inventoryController.releaseMaintenanceHold(
        resourceId,
        holdId,
        { inspectorId: 'usr-audio-tech-lead' },
        agencyReq
      );

      expect(releaseRes.data.status).toBe('serviceable');
      expect(releaseRes.data.payload!.usableQuantity).toBe(1);

      // Subsequent booking succeeds
      const rsvRes = inventoryController.createReservation(
        projectId1,
        {
          resourceId,
          windowStart: '2026-11-20T00:00:00Z',
          windowEnd: '2026-11-22T00:00:00Z',
          quantity: 1,
        },
        agencyReq
      );
      expect(rsvRes.data.status).toBe('confirmed');
    });

    it('rejects reservation if resource writer authority is not yet cut over to EOS (AT-052)', () => {
      const resRes = inventoryController.createResource(
        {
          resourceCode: 'LEGACY-STAGE-DECK',
          name: 'Old Steel Decking Pool',
          type: 'serialized',
          totalQuantity: 1,
          warehouseLocation: 'Warehouse Old',
          authoritativeSystem: 'LEGACY_LOCKED', // Non-EOS authority
        },
        agencyReq
      );
      const resourceId = resRes.data.id;

      try {
        inventoryController.createReservation(
          projectId1,
          {
            resourceId,
            windowStart: '2026-11-01T00:00:00Z',
            windowEnd: '2026-11-05T00:00:00Z',
            quantity: 1,
          },
          agencyReq
        );
        expect.unreachable('Should have thrown 409 Conflict');
      } catch (err: any) {
        expect(err.getStatus()).toBe(409);
        expect((err.getResponse() as any).detail).toContain('WRITER_NOT_AUTHORITATIVE');
      }
    });
  });

  describe('AT-053: PO Multi-Package Allocation & Partial Receipts', () => {
    it('allocates PO lines across packages and tracks partial receipts and damage rejections', () => {
      const venRes = procurementController.createVendor(
        {
          vendorCode: 'VEN-CABLE-01',
          name: 'Power Distribution WLL',
          category: 'corporate',
        },
        agencyReq
      );
      const vendorId = venRes.data.id;

      const poRes = procurementController.createPurchaseOrder(
        projectId1,
        {
          poNumber: 'PO-POWER-001',
          vendorId,
          currency: 'QAR',
          totalAmount: '40000',
          lines: [
            {
              packageId: 'wp-stage-power',
              description: '63A 3-Phase Power Cables',
              quantity: '40',
              unitCost: '1000',
            },
          ],
        },
        agencyReq
      );
      const poId = poRes.data.id;
      const lineId = poRes.data.payload!.lines[0].id;

      // Partial receipt: 25 received, 5 damaged/rejected (30 processed of 40)
      const recRes = procurementController.recordReceipt(
        projectId1,
        poId,
        {
          deliveryNoteNumber: 'DN-99881',
          items: [
            {
              lineId,
              receivedQuantity: '25',
              rejectedQuantity: '5',
            },
          ],
        },
        agencyReq
      );

      expect(recRes.data.status).toBe('partially_received');
      const updatedLine = recRes.data.payload!.lines[0];
      expect(updatedLine.receivedQuantity.toString()).toBe('25');
      expect(updatedLine.rejectedQuantity.toString()).toBe('5');
    });
  });

  describe('AT-054: Subrental Shortage Creates Forecast Exposure', () => {
    it('creates subrental request as forecast exposure without generating unauthorized purchase orders', () => {
      const resRes = inventoryController.createResource(
        {
          resourceCode: 'LIGHT-BEAM-01',
          name: 'Robe MegaPointe Moving Head',
          type: 'bulk',
          totalQuantity: 30,
          warehouseLocation: 'Lighting Cage',
          authoritativeSystem: 'EOS',
        },
        agencyReq
      );
      const resourceId = resRes.data.id;

      // Event needs 50 units (shortage of 20 units)
      const subRes = inventoryController.createSubrentalRequest(
        projectId1,
        {
          resourceId,
          shortageQuantity: 20,
          windowStart: '2026-11-25T00:00:00Z',
          windowEnd: '2026-11-28T00:00:00Z',
          estimatedUnitRate: '350', // 350 QAR/day
        },
        agencyReq
      );

      // Invariant AT-054: Open exposure, NOT an unauthorized supplier PO!
      expect(subRes.data.status).toBe('open_exposure');
      expect(subRes.data.payload!.shortageQuantity).toBe(20);
      expect(subRes.data.payload!.estimatedSubrentalCost.toString()).toBe('7000.000000'); // 20 * 350 QAR

      // Confirm no PO was silently created in PO repository
      const createdPOs = Array.from(poRepository.values()).filter(
        (po) => po.projectId === projectId1 && po.totalAmount.amount.eq(7000)
      );
      expect(createdPOs.length).toBe(0);
    });
  });
});
