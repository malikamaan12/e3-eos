import { describe, it, expect } from 'vitest';
import { Decimal } from 'decimal.js';
import {
  ProcurementEngine,
  Vendor,
  FrameworkContract,
  PurchaseOrder,
  POLine,
  InventoryReservationEngine,
  Resource,
  Reservation,
  ProductionOrder,
} from './index.js';
import { Money } from './money.js';

describe('AT-043: Concurrent Release Requests for One PO (Durable Idempotency)', () => {
  it('returns same commitment on retry without creating duplicate release', () => {
    const po: PurchaseOrder = {
      id: 'po-101',
      poNumber: 'PO-2026-001',
      vendorId: 'ven-01',
      currency: 'QAR',
      totalAmount: new Money('50000', 'QAR'),
      status: 'approved',
      lines: [],
      externalDeliveryStatus: 'not_sent',
      isSoleSource: false,
    };

    // First release with idempotency key
    const release1 = ProcurementEngine.releasePurchaseOrder(po, 'idem-key-release-1');
    expect(release1.isDuplicateRelease).toBe(false);
    expect(release1.po.status).toBe('released');
    expect(release1.po.externalDeliveryStatus).toBe('sent_pending_confirmation');

    // Concurrent/replayed release with the same idempotency key
    const release2 = ProcurementEngine.releasePurchaseOrder(release1.po, 'idem-key-release-1');
    expect(release2.isDuplicateRelease).toBe(true);
    expect(release2.po.id).toBe(po.id);

    // Release with different key throws conflict
    expect(() => {
      ProcurementEngine.releasePurchaseOrder(release1.po, 'different-idem-key');
    }).toThrow(/PO_ALREADY_RELEASED/);
  });
});

describe('AT-044: Framework Agreement Ceiling Consumption', () => {
  it('atomically reduces ceiling and prevents unapproved ceiling overruns', () => {
    const contract: FrameworkContract = {
      id: 'fc-av-2026',
      contractCode: 'FC-AV-01',
      vendorId: 'ven-av-pro',
      currency: 'QAR',
      ceilingAmount: new Money('300000', 'QAR'), // 300,000 QAR Ceiling
      consumedAmount: new Money('250000', 'QAR'), // 250,000 QAR Already Consumed
      validUntil: new Date('2026-12-31'),
    };

    // Remaining is 50,000 QAR. Call-off for 40,000 QAR succeeds
    const callOff1 = new Money('40000', 'QAR');
    const res1 = ProcurementEngine.consumeFrameworkCeiling(contract, callOff1);
    expect(res1.updatedContract.consumedAmount.toString()).toBe('290000.000000');
    expect(res1.remainingCeiling.toString()).toBe('10000.000000');

    // Subsequent call-off of 15,000 QAR exceeds remaining 10,000 QAR and is rejected
    const callOff2 = new Money('15000', 'QAR');
    expect(() => {
      ProcurementEngine.consumeFrameworkCeiling(res1.updatedContract, callOff2);
    }).toThrow(/FRAMEWORK_CEILING_EXCEEDED/);
  });
});

describe('AT-045: Remote Supplier Timeout Reconciliation', () => {
  it('marks timed-out order as reconciliation_needed and blocks duplicate order until reconciled', () => {
    const po: PurchaseOrder = {
      id: 'po-remote-1',
      poNumber: 'PO-REMOTE-01',
      vendorId: 'ven-ext',
      currency: 'QAR',
      totalAmount: new Money('75000', 'QAR'),
      status: 'released',
      lines: [],
      externalDeliveryStatus: 'sent_pending_confirmation',
      isSoleSource: false,
    };

    // Timeout occurred during remote supplier dispatch
    const timedOutPo = ProcurementEngine.handleRemoteSupplierTimeout(po);
    expect(timedOutPo.status).toBe('reconciliation_needed');

    // Supplier confirms receipt externally: reconciled to acknowledged
    const reconciledPo = ProcurementEngine.reconcileRemoteOrder(timedOutPo, 'confirmed_externally');
    expect(reconciledPo.status).toBe('acknowledged');
    expect(reconciledPo.externalDeliveryStatus).toBe('confirmed');
  });
});

describe('AT-046: Protected Supplier Bank Details Changes', () => {
  it('requires independent verification and prevents self-verification by requester', () => {
    const vendor: Vendor = {
      id: 'ven-stage-builders',
      vendorCode: 'VEN-SB-01',
      name: 'Qatar Stage Builders WLL',
      category: 'corporate',
      status: 'active',
      complianceVerified: true,
      bankDetails: {
        bankName: 'QNB',
        accountName: 'Qatar Stage Builders WLL',
        accountNumber: '123456789',
        iban: 'QA12QNBA00000000123456789',
        swift: 'QNBAQAQA',
      },
    };

    const newBankDetails = {
      bankName: 'Commercial Bank of Qatar',
      accountName: 'Qatar Stage Builders WLL',
      accountNumber: '987654321',
      iban: 'QA99CBQA00000000987654321',
      swift: 'CBQAQAQA',
    };

    // User A requests bank change
    const request = ProcurementEngine.requestBankDetailsChange(vendor, newBankDetails, 'usr-procurement-officer');
    expect(request.status).toBe('pending_verification');
    // Vendor's active bank details are NOT modified yet!
    expect(vendor.bankDetails?.accountNumber).toBe('123456789');

    // User A attempts self-verification (two-person rule check)
    expect(() => {
      ProcurementEngine.verifyBankChange(vendor, request, 'usr-procurement-officer');
    }).toThrow(/TWO_PERSON_RULE_VIOLATION/);

    // User B (Finance Director) verifies and applies bank change
    const verified = ProcurementEngine.verifyBankChange(vendor, request, 'usr-finance-director');
    expect(verified.updatedRequest.status).toBe('verified');
    expect(verified.updatedVendor.bankDetails?.accountNumber).toBe('987654321');
  });
});

describe('AT-047: Sole-Source and Freelance Supplier Route', () => {
  it('validates sole-source with explicit rationale and tracks freelance grace period', () => {
    const freelanceVendor: Vendor = {
      id: 'ven-freelancer-1',
      vendorCode: 'VEN-FL-01',
      name: 'Ahmed Special Effects Rigging',
      category: 'freelance',
      status: 'active',
      complianceVerified: false,
      freelanceGracePeriodUntil: new Date('2026-10-01'),
    };

    // Sole-source without rationale is rejected
    expect(() => {
      ProcurementEngine.validateSupplierRoute(freelanceVendor, {
        isSoleSource: true,
        soleSourceRationale: '   ', // empty
      });
    }).toThrow(/SOLE_SOURCE_RATIONALE_REQUIRED/);

    // Sole-source with substantive rationale is valid
    expect(() => {
      ProcurementEngine.validateSupplierRoute(freelanceVendor, {
        isSoleSource: true,
        soleSourceRationale: 'Sole certified technician in region for Kinesys motion control system.',
      });
    }).not.toThrow();
  });
});

describe('AT-048: Drawing Revision Impact on Fabrication Work Orders', () => {
  it('flags in-progress fabrication orders while preserving actual built version on completed items', () => {
    const orders: ProductionOrder[] = [
      {
        id: 'po-workshop-01',
        projectId: 'prj-dome',
        designId: 'des-arch-01',
        designVersionNumber: 1,
        title: 'Entrance Truss Arch - Batch 1',
        orderedUnits: 2,
        completedUnits: 2,
        status: 'completed', // Already built under v1
        builtItemsActualVersion: 1,
      },
      {
        id: 'po-workshop-02',
        projectId: 'prj-dome',
        designId: 'des-arch-01',
        designVersionNumber: 1,
        title: 'Entrance Truss Arch - Batch 2',
        orderedUnits: 4,
        completedUnits: 1,
        status: 'in_progress', // Active in workshop
        builtItemsActualVersion: 1,
      },
    ];

    // Engineering releases drawing revision v2
    const updatedOrders = InventoryReservationEngine.handleDrawingRevisionOnProduction(orders, 'des-arch-01', 2);

    // Batch 1 (completed) remains completed with actual source version 1
    const batch1 = updatedOrders.find((o) => o.id === 'po-workshop-01')!;
    expect(batch1.status).toBe('completed');
    expect(batch1.builtItemsActualVersion).toBe(1);

    // Batch 2 (in_progress) is flagged for revision review
    const batch2 = updatedOrders.find((o) => o.id === 'po-workshop-02')!;
    expect(batch2.status).toBe('flagged_for_revision_review');
  });
});

describe('AT-049 & AT-050: Resource Reservations (Exclusive Serialized & Bulk Capacity)', () => {
  it('rejects overlapping reservations on exclusive serialized assets (AT-049)', () => {
    const asset: Resource = {
      id: 'res-gen-01',
      resourceCode: 'GEN-500KVA-01',
      name: '500kVA Whisper Generator #1',
      type: 'serialized',
      totalQuantity: 1,
      usableQuantity: 1,
      warehouseLocation: 'Yard B',
      status: 'serviceable',
      authoritativeSystem: 'EOS',
    };

    const existingConfirmed: Reservation[] = [
      {
        id: 'res-1',
        resourceId: 'res-gen-01',
        projectId: 'prj-festival-a',
        window: {
          start: new Date('2026-11-01T00:00:00Z'),
          end: new Date('2026-11-05T00:00:00Z'),
        },
        quantity: 1,
        status: 'confirmed',
      },
    ];

    // Non-overlapping window [Nov 05, Nov 10) is accepted
    expect(() => {
      InventoryReservationEngine.validateSerializedReservation(asset, existingConfirmed, {
        projectId: 'prj-festival-b',
        window: {
          start: new Date('2026-11-05T00:00:00Z'),
          end: new Date('2026-11-10T00:00:00Z'),
        },
      });
    }).not.toThrow();

    // Overlapping window [Nov 03, Nov 07) is rejected
    expect(() => {
      InventoryReservationEngine.validateSerializedReservation(asset, existingConfirmed, {
        projectId: 'prj-festival-c',
        window: {
          start: new Date('2026-11-03T00:00:00Z'),
          end: new Date('2026-11-07T00:00:00Z'),
        },
      });
    }).toThrow(/RESERVATION_COLLISION/);
  });

  it('enforces bulk capacity locks and prevents oversell (AT-050)', () => {
    const bulkStock: Resource = {
      id: 'res-cable-01',
      resourceCode: 'CABLE-SOCAPEX-25M',
      name: '25m Socapex Multi-Cable',
      type: 'bulk',
      totalQuantity: 50,
      usableQuantity: 50, // 50 in pool
      warehouseLocation: 'Rack 4A',
      status: 'serviceable',
      authoritativeSystem: 'EOS',
    };

    const existing: Reservation[] = [
      {
        id: 'res-cable-p1',
        resourceId: 'res-cable-01',
        projectId: 'prj-concert',
        window: {
          start: new Date('2026-11-10T00:00:00Z'),
          end: new Date('2026-11-15T00:00:00Z'),
        },
        quantity: 35, // 35 confirmed
        status: 'confirmed',
      },
    ];

    const window = {
      start: new Date('2026-11-12T00:00:00Z'),
      end: new Date('2026-11-14T00:00:00Z'),
    };

    // 15 remaining. Request for 10 succeeds
    const check1 = InventoryReservationEngine.validateBulkReservation(bulkStock, existing, 10, window);
    expect(check1.canFulfill).toBe(true);
    expect(check1.availableQuantity).toBe(15);

    // Request for 20 exceeds remaining 15 and is rejected
    expect(() => {
      InventoryReservationEngine.validateBulkReservation(bulkStock, existing, 20, window);
    }).toThrow(/BULK_CAPACITY_EXCEEDED/);
  });
});

describe('AT-051, AT-052 & AT-054: Maintenance Quarantine, Cutover & Subrental Shortage', () => {
  it('quarantines damaged asset and excludes from availability until released (AT-051)', () => {
    const asset: Resource = {
      id: 'res-projector-01',
      resourceCode: 'PROJ-30K-01',
      name: 'Barco 30K Laser Projector #1',
      type: 'serialized',
      totalQuantity: 1,
      usableQuantity: 1,
      warehouseLocation: 'AV Vault',
      status: 'serviceable',
      authoritativeSystem: 'EOS',
    };

    // Returned with cracked lens after festival
    const holdRes = InventoryReservationEngine.placeOnMaintenanceHold(
      asset,
      'Cracked outer lens optical element',
      'Incident report INC-2026-88'
    );

    expect(holdRes.updatedResource.status).toBe('in_maintenance');
    expect(holdRes.updatedResource.usableQuantity).toBe(0);

    // Attempting reservation while in maintenance is rejected
    expect(() => {
      InventoryReservationEngine.validateSerializedReservation(holdRes.updatedResource, [], {
        projectId: 'prj-new',
        window: { start: new Date(), end: new Date() },
      });
    }).toThrow(/RESOURCE_NOT_SERVICEABLE/);

    // Certified optical technician inspects and clears hold
    const releaseRes = InventoryReservationEngine.releaseFromMaintenanceHold(
      holdRes.updatedResource,
      holdRes.hold,
      'usr-certified-technician'
    );

    expect(releaseRes.updatedResource.status).toBe('serviceable');
    expect(releaseRes.updatedResource.usableQuantity).toBe(1);
    expect(releaseRes.updatedHold.status).toBe('cleared');
  });

  it('rejects booking on resource when writer is not authoritative (AT-052 cutover)', () => {
    const lockedAsset: Resource = {
      id: 'res-legacy-01',
      resourceCode: 'LEGACY-TRUSS-01',
      name: 'Heavy Duty Ground Support',
      type: 'serialized',
      totalQuantity: 1,
      usableQuantity: 1,
      warehouseLocation: 'Legacy Yard',
      status: 'serviceable',
      authoritativeSystem: 'LEGACY_LOCKED', // Not cutover yet
    };

    expect(() => {
      InventoryReservationEngine.validateSerializedReservation(lockedAsset, [], {
        projectId: 'prj-test',
        window: { start: new Date(), end: new Date() },
      });
    }).toThrow(/WRITER_NOT_AUTHORITATIVE/);
  });

  it('creates subrental shortage request as forecast exposure without unauthorized spend (AT-054)', () => {
    const asset: Resource = {
      id: 'res-led-panels',
      resourceCode: 'LED-P2-PANELS',
      name: 'Unilumin 2.6mm LED Panels',
      type: 'bulk',
      totalQuantity: 200,
      usableQuantity: 200,
      warehouseLocation: 'LED Bay',
      status: 'serviceable',
      authoritativeSystem: 'EOS',
    };

    const subrental = InventoryReservationEngine.createSubrentalShortageExposure({
      projectId: 'prj-world-cup',
      resource: asset,
      shortageQuantity: 80,
      window: {
        start: new Date('2026-12-01T00:00:00Z'),
        end: new Date('2026-12-10T00:00:00Z'),
      },
      estimatedUnitRate: new Money('120', 'QAR'),
    });

    // Invariant (AT-054): Status is open exposure, NOT an unauthorized PO
    expect(subrental.status).toBe('open_exposure');
    expect(subrental.shortageQuantity).toBe(80);
    expect(subrental.estimatedSubrentalCost.toString()).toBe('9600.000000'); // 80 * 120 QAR
  });
});

describe('AT-053: PO Line Multi-Package Allocation and Partial Receipts', () => {
  it('processes partial receipts and item rejections while maintaining explicit balances', () => {
    const line: POLine = {
      id: 'po-line-01',
      poId: 'po-99',
      packageId: 'wp-staging',
      description: 'Stage Safety Railings (3m)',
      quantity: new Decimal(50),
      unitCost: new Money('200', 'QAR'),
      totalCost: new Money('10000', 'QAR'),
      receivedQuantity: new Decimal(0),
      rejectedQuantity: new Decimal(0),
    };

    // First shipment: 30 received, 5 damaged/rejected (35 processed out of 50)
    const rec1 = ProcurementEngine.receivePOLine(line, 30, 5);
    expect(rec1.isLineComplete).toBe(false);
    expect(rec1.remainingQuantity.toString()).toBe('15');
    expect(rec1.updatedLine.receivedQuantity.toString()).toBe('30');
    expect(rec1.updatedLine.rejectedQuantity.toString()).toBe('5');

    // Second shipment: remaining 15 received
    const rec2 = ProcurementEngine.receivePOLine(rec1.updatedLine, 15, 0);
    expect(rec2.isLineComplete).toBe(true);
    expect(rec2.remainingQuantity.toString()).toBe('0');
    expect(rec2.updatedLine.receivedQuantity.toString()).toBe('45');
    expect(rec2.updatedLine.rejectedQuantity.toString()).toBe('5');

    // Third shipment attempt: over-receipt is rejected
    expect(() => {
      ProcurementEngine.receivePOLine(rec2.updatedLine, 1, 0);
    }).toThrow(/RECEIPT_EXCEEDS_ORDERED_QUANTITY/);
  });
});
