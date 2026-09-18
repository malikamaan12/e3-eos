import { describe, it, expect, beforeEach } from 'vitest';
import {
  ScopeController,
  requirementRepository,
  revisionRepository,
  attachmentRepository,
  clarificationRepository,
  parsingJobRepository,
  allocationRepository,
  designPackageRepository,
  designVariantRepository,
  fulfilmentItemRepository,
  workPackageRepository,
  productionBatchRepository,
} from '../apps/api/src/scope/scope.controller.js';
import {
  calculateRequirementReconciliation,
  generateSuggestedWorkPackages,
  generateDraftFulfilmentItems,
  DEFAULT_WORK_PACKAGE_TEMPLATES,
} from '@e3-eos/domain';

describe('Phase 2: Requirement Grouping, Location Allocation, Design-to-Production & Department Fulfilment', () => {
  let controller: ScopeController;
  const mockOrgId = '11111111-1111-4111-8111-111111111111';
  const mockProjectId = 'prj-qatar-fifa-2026';
  const mockReq = {
    user: { id: 'usr-lead-01', name: 'Tariq Mansoor', role: 'technical_director' },
    organisationId: mockOrgId,
  } as any;

  const mockAdminReq = {
    user: { id: 'usr-admin-01', name: 'Amine Benali', role: 'super_admin' },
    organisationId: mockOrgId,
  } as any;

  beforeEach(() => {
    controller = new ScopeController();
    requirementRepository.clear();
    revisionRepository.clear();
    attachmentRepository.clear();
    clarificationRepository.clear();
    parsingJobRepository.clear();
    allocationRepository.clear();
    designPackageRepository.clear();
    designVariantRepository.clear();
    fulfilmentItemRepository.clear();
    workPackageRepository.clear();
    productionBatchRepository.clear();
  });

  // =========================================================================
  // 1. MASTER REQUIREMENT CREATION & BASELINE INTEGRITY
  // =========================================================================
  describe('1. Master Requirement Creation & Initial Baseline', () => {
    it('creates a single traceable master requirement with quantity and unit', async () => {
      const res = await controller.createRequirement(
        mockProjectId,
        {
          code: 'REQ-QND-005',
          title: 'Themed Service Counters & Media Podiums',
          category: 'staging_technical',
          department: 'fabrication',
          quantity: 20,
          unit: 'units',
          scopePackage: 'VIP Pavilion',
          ownerName: 'Tariq Mansoor',
          ownerId: 'usr-lead-01',
          dueDate: '2026-11-20',
        },
        mockReq
      );

      expect(res.data.id).toBeDefined();
      const req = res.data.payload;
      expect(req.code).toBe('REQ-QND-005');
      expect(req.quantity).toBe(20);
      expect(req.unit).toBe('units');
      expect(req.allocationStatus).toBe('unallocated');
      expect(req.allocatedQuantity).toBe(0);
      expect(req.designStatus).toBe('required');
      expect(req.productionStatus).toBe('not_released');
      expect(req.logisticsStatus).toBe('pending');
      expect(req.installationStatus).toBe('not_started');
    });
  });

  // =========================================================================
  // 2. MULTI-LOCATION ALLOCATION ENGINE (SPLIT, MERGE, MOVE QUANTITY)
  // =========================================================================
  describe('2. Multi-Location Allocation Engine (20 Counters across Zone A, B, C)', () => {
    let reqId: string;

    beforeEach(async () => {
      const res = await controller.createRequirement(
        mockProjectId,
        {
          code: 'REQ-QND-005',
          title: 'Themed Service Counters',
          quantity: 20,
          unit: 'units',
        },
        mockReq
      );
      reqId = res.data.id;
    });

    it('allocates 20 counters across Zone A (6), Zone B (8), and Zone C (6)', async () => {
      // Allocate Zone A: 6
      const allocA = await controller.createAllocation(
        mockProjectId,
        reqId,
        {
          zoneId: 'zone-a',
          zoneName: 'Zone A - Ceremonial Stage',
          allocatedQuantity: 6,
          targetDeliveryDate: '2026-11-10',
          responsibleParty: 'e3',
        },
        mockReq
      );
      expect(allocA.data.allocatedQuantity).toBe(6);

      // Check partial allocation
      let stored = requirementRepository.get(reqId)!;
      expect(stored.allocatedQuantity).toBe(6);
      expect(stored.allocationStatus).toBe('partially_allocated');

      // Allocate Zone B: 8
      const allocB = await controller.createAllocation(
        mockProjectId,
        reqId,
        {
          zoneId: 'zone-b',
          zoneName: 'Zone B - VIP Lounge',
          allocatedQuantity: 8,
          targetDeliveryDate: '2026-11-12',
          responsibleParty: 'e3',
        },
        mockReq
      );
      expect(allocB.data.allocatedQuantity).toBe(8);

      // Allocate Zone C: 6
      const allocC = await controller.createAllocation(
        mockProjectId,
        reqId,
        {
          zoneId: 'zone-c',
          zoneName: 'Zone C - Media Village',
          allocatedQuantity: 6,
          targetDeliveryDate: '2026-11-14',
          responsibleParty: 'e3',
        },
        mockReq
      );
      expect(allocC.data.allocatedQuantity).toBe(6);

      // Requirement is now fully allocated (6 + 8 + 6 = 20)
      stored = requirementRepository.get(reqId)!;
      expect(stored.allocatedQuantity).toBe(20);
      expect(stored.allocationStatus).toBe('fully_allocated');

      // Query allocations endpoint
      const listRes = await controller.listAllocations(mockProjectId, reqId);
      expect(listRes.data).toHaveLength(3);
    });

    it('supports moving quantity between allocations while preserving total sum', async () => {
      const a1 = (await controller.createAllocation(mockProjectId, reqId, { zoneId: 'za', zoneName: 'Zone A', allocatedQuantity: 6 }, mockReq)).data;
      const a2 = (await controller.createAllocation(mockProjectId, reqId, { zoneId: 'zb', zoneName: 'Zone B', allocatedQuantity: 8 }, mockReq)).data;
      await controller.createAllocation(mockProjectId, reqId, { zoneId: 'zc', zoneName: 'Zone C', allocatedQuantity: 6 }, mockReq);

      // Move 2 units from Zone B to Zone A
      const moveRes = await controller.moveAllocationQuantity(
        mockProjectId,
        reqId,
        {
          sourceAllocationId: a2.id,
          targetAllocationId: a1.id,
          quantity: 2,
          reason: 'VIP layout expansion requiring 2 additional units on Stage',
        },
        mockReq
      );

      expect(moveRes.data.sourceAllocation.allocatedQuantity).toBe(6); // 8 - 2
      expect(moveRes.data.targetAllocation.allocatedQuantity).toBe(8); // 6 + 2

      const stored = requirementRepository.get(reqId)!;
      expect(stored.allocatedQuantity).toBe(20);
      expect(stored.allocationStatus).toBe('fully_allocated');
    });

    it('supports splitting an allocation into multiple destination locations', async () => {
      const a = (await controller.createAllocation(mockProjectId, reqId, { zoneId: 'za', zoneName: 'Zone A', allocatedQuantity: 8 }, mockReq)).data;

      const splitRes = await controller.splitAllocation(
        mockProjectId,
        reqId,
        a.id,
        {
          splits: [
            { zoneId: 'za-north', zoneName: 'Zone A North Podium', allocatedQuantity: 5 },
            { zoneId: 'za-south', zoneName: 'Zone A South Podium', allocatedQuantity: 3 },
          ],
        },
        mockReq
      );

      expect(splitRes.data.createdAllocations).toHaveLength(2);
      expect(splitRes.data.createdAllocations[0].allocatedQuantity).toBe(5);
      expect(splitRes.data.createdAllocations[1].allocatedQuantity).toBe(3);

      // Original allocation is archived/removed
      expect(allocationRepository.get(a.id)).toBeUndefined();
    });

    it('supports merging multiple allocations into a single combined allocation', async () => {
      const a1 = (await controller.createAllocation(mockProjectId, reqId, { zoneId: 'za-north', zoneName: 'Zone A North', allocatedQuantity: 5 }, mockReq)).data;
      const a2 = (await controller.createAllocation(mockProjectId, reqId, { zoneId: 'za-south', zoneName: 'Zone A South', allocatedQuantity: 3 }, mockReq)).data;

      const mergeRes = await controller.mergeAllocations(
        mockProjectId,
        reqId,
        {
          allocationIds: [a1.id, a2.id],
          targetZoneId: 'za-combined',
          targetZoneName: 'Zone A Consolidated',
        },
        mockReq
      );

      expect(mergeRes.data.mergedAllocation.allocatedQuantity).toBe(8);
      expect(mergeRes.data.mergedAllocation.zoneName).toBe('Zone A Consolidated');
      expect(allocationRepository.get(a1.id)).toBeUndefined();
      expect(allocationRepository.get(a2.id)).toBeUndefined();
    });
  });

  // =========================================================================
  // 3. DESIGN-TO-PRODUCTION GATING SCENARIO (THE 20-COUNTER ACCEPTANCE CASE)
  // =========================================================================
  describe('3. End-to-End 20-Counter Acceptance Scenario', () => {
    let reqId: string;
    let allocAId: string;
    let allocBId: string;
    let allocCId: string;
    let pkgId: string;
    let v1Id: string;
    let v2Id: string;

    it('executes the full acceptance journey with hard gating and delta preservation', async () => {
      // -----------------------------------------------------------------------
      // Step A: Create Requirement & 3 Allocations
      // -----------------------------------------------------------------------
      const reqRes = await controller.createRequirement(
        mockProjectId,
        {
          code: 'REQ-QND-005',
          title: 'Themed Service Counters',
          category: 'staging_technical',
          department: 'fabrication',
          quantity: 20,
          unit: 'units',
        },
        mockReq
      );
      reqId = reqRes.data.id;

      const aRes = await controller.createAllocation(mockProjectId, reqId, { zoneId: 'zone-a', zoneName: 'Zone A - Ceremonial Stage', allocatedQuantity: 6 }, mockReq);
      const bRes = await controller.createAllocation(mockProjectId, reqId, { zoneId: 'zone-b', zoneName: 'Zone B - VIP Lounge', allocatedQuantity: 8 }, mockReq);
      const cRes = await controller.createAllocation(mockProjectId, reqId, { zoneId: 'zone-c', zoneName: 'Zone C - Media Village', allocatedQuantity: 6 }, mockReq);
      allocAId = aRes.data.id;
      allocBId = bRes.data.id;
      allocCId = cRes.data.id;

      // -----------------------------------------------------------------------
      // Step B: Create Design Package & 2 Variants (Standard V1: 14, Premium V2: 6)
      // -----------------------------------------------------------------------
      const pkgRes = await controller.createDesignPackage(
        mockProjectId,
        reqId,
        {
          packageCode: 'DP-005',
          title: 'Themed Service Counters Technical Drawing Set',
          drawingNumber: 'DWG-TSC-2026-001',
          cadRevision: 'REV-B',
        },
        mockReq
      );
      pkgId = pkgRes.data.id;

      // Variant 1: Standard V1 (14 units)
      const v1Res = await controller.createDesignVariant(
        mockProjectId,
        reqId,
        pkgId,
        {
          variantCode: 'V1-STD',
          name: 'Standard Oak Veneer & Brushed Brass',
          targetQuantity: 14,
          specificationNotes: '18mm Marine Plywood with Formica veneer',
        },
        mockReq
      );
      v1Id = v1Res.data.id;

      // Variant 2: Premium V2 (6 units)
      const v2Res = await controller.createDesignVariant(
        mockProjectId,
        reqId,
        pkgId,
        {
          variantCode: 'V2-PREM',
          name: 'Premium Carrara Marble & Backlit Onyx',
          targetQuantity: 6,
          specificationNotes: 'Solid 20mm Italian Carrara Marble with integrated dimmable LED',
        },
        mockReq
      );
      v2Id = v2Res.data.id;

      // -----------------------------------------------------------------------
      // Step C: Approve Standard V1 for 14 units; Premium V2 remains in Review
      // -----------------------------------------------------------------------
      await controller.approveDesignVariant(
        mockProjectId,
        reqId,
        pkgId,
        v1Id,
        {
          approvedQuantity: 14,
          approvalNotes: 'Approved by Technical Director and Client PM for Zones A & B',
        },
        mockReq
      );

      // Verify requirement design metrics
      let storedReq = requirementRepository.get(reqId)!;
      expect(storedReq.designApprovedQuantity).toBe(14);

      // -----------------------------------------------------------------------
      // Step D: Reconciliation Engine Check
      // -----------------------------------------------------------------------
      const reconRes = await controller.getRequirementReconciliation(mockProjectId, reqId);
      const recon = reconRes.data;
      expect(recon.requiredQuantity).toBe(20);
      expect(recon.allocatedQuantity).toBe(20);
      expect(recon.designApprovedQuantity).toBe(14);
      expect(recon.blockedByDesignQuantity).toBe(6);
      expect(recon.releasedQuantity).toBe(0);
      expect(recon.allocationStatus).toBe('fully_allocated');
      expect(recon.designStatus).toBe('client_review');

      // -----------------------------------------------------------------------
      // Step E: Hard Gating - Attempting to release 20 units without override FAILS
      // -----------------------------------------------------------------------
      let gateError: any = null;
      try {
        await controller.releaseDesignToProduction(
          mockProjectId,
          reqId,
          pkgId,
          v1Id,
          {
            releasedQuantity: 20, // Exceeds 14 approved!
            department: 'fabrication',
            targetCompletionDate: '2026-11-05',
          },
          mockReq // Not super_admin
        );
      } catch (err: any) {
        gateError = err;
      }
      expect(gateError).not.toBeNull();
      const resp = gateError.getResponse ? gateError.getResponse() : gateError.response || gateError;
      const msg = typeof resp === 'string' ? resp : `${resp.title || ''} ${resp.detail || ''} ${gateError.message || ''}`;
      expect(msg).toMatch(/exceeds approved (design )?quantity/i);

      // -----------------------------------------------------------------------
      // Step F: Release approved 14 units into Production Batch PB-001
      // -----------------------------------------------------------------------
      const releaseRes = await controller.releaseDesignToProduction(
        mockProjectId,
        reqId,
        pkgId,
        v1Id,
        {
          releasedQuantity: 14,
          batchCode: 'PB-001',
          department: 'fabrication',
          targetCompletionDate: '2026-11-05',
          allocationDestinations: [
            { allocationId: allocAId, zoneName: 'Zone A - Ceremonial Stage', quantity: 6 },
            { allocationId: allocBId, zoneName: 'Zone B - VIP Lounge', quantity: 8 },
          ],
        },
        mockReq
      );

      expect(releaseRes.data.batch).toBeDefined();
      const batch1 = releaseRes.data.batch;
      expect(batch1.batchNumber).toBe('PB-001');
      expect(batch1.quantity).toBe(14);
      expect(batch1.items).toHaveLength(2);
      expect(batch1.items[0].zoneName).toBe('Zone A - Ceremonial Stage');
      expect(batch1.items[0].quantity).toBe(6);
      expect(batch1.items[1].zoneName).toBe('Zone B - VIP Lounge');
      expect(batch1.items[1].quantity).toBe(8);

      storedReq = requirementRepository.get(reqId)!;
      expect(storedReq.releasedQuantity).toBe(14);

      // -----------------------------------------------------------------------
      // Step G: Approve Premium V2 for 6 units & Release PB-002
      // -----------------------------------------------------------------------
      await controller.approveDesignVariant(
        mockProjectId,
        reqId,
        pkgId,
        v2Id,
        {
          approvedQuantity: 6,
          approvalNotes: 'Amiri Diwan formal sample sign-off received',
        },
        mockReq
      );

      storedReq = requirementRepository.get(reqId)!;
      expect(storedReq.designApprovedQuantity).toBe(20);

      const release2Res = await controller.releaseDesignToProduction(
        mockProjectId,
        reqId,
        pkgId,
        v2Id,
        {
          releasedQuantity: 6,
          batchCode: 'PB-002',
          department: 'fabrication',
          targetCompletionDate: '2026-11-08',
          allocationDestinations: [
            { allocationId: allocCId, zoneName: 'Zone C - Media Village', quantity: 6 },
          ],
        },
        mockReq
      );
      expect(release2Res.data.batch.batchNumber).toBe('PB-002');
      expect(release2Res.data.batch.quantity).toBe(6);

      storedReq = requirementRepository.get(reqId)!;
      expect(storedReq.releasedQuantity).toBe(20);

      // -----------------------------------------------------------------------
      // Step H: Production Progression on PB-001
      // -----------------------------------------------------------------------
      await controller.progressProductionBatch(
        mockProjectId,
        reqId,
        batch1.id,
        { status: 'in_production' },
        mockReq
      );
      await controller.progressProductionBatch(
        mockProjectId,
        reqId,
        batch1.id,
        { status: 'completed', producedQuantity: 14 },
        mockReq
      );

      storedReq = requirementRepository.get(reqId)!;
      expect(storedReq.producedQuantity).toBe(14);

      // -----------------------------------------------------------------------
      // Step I: Baseline Protection & Quantity Change (20 -> 24)
      // -----------------------------------------------------------------------
      const changeRes = await controller.changeRequirementQuantity(
        mockProjectId,
        reqId,
        {
          newQuantity: 24,
          reason: 'Client requested 4 additional counters for East Grandstand',
          sourceDocumentRef: 'VO-QND-003',
        },
        mockReq
      );

      expect(changeRes.data.previousQuantity).toBe(20);
      expect(changeRes.data.newQuantity).toBe(24);
      expect(changeRes.data.delta).toBe(4);
      expect(changeRes.data.revision).toBeDefined();

      storedReq = requirementRepository.get(reqId)!;
      expect(storedReq.quantity).toBe(24);
      // Existing production batches remain unchanged!
      expect(productionBatchRepository.get(batch1.id)?.quantity).toBe(14);
      expect(productionBatchRepository.get(release2Res.data.batch.id)?.quantity).toBe(6);
      expect(storedReq.releasedQuantity).toBe(20);
      expect(storedReq.producedQuantity).toBe(14);

      // Because 20 are allocated but 24 are now required, allocationStatus becomes partially_allocated!
      expect(storedReq.allocationStatus).toBe('partially_allocated');
      expect(storedReq.allocatedQuantity).toBe(20);

      // Add 4th allocation for remaining 4 units: Zone D
      await controller.createAllocation(
        mockProjectId,
        reqId,
        {
          zoneId: 'zone-d',
          zoneName: 'Zone D - East Grandstand',
          allocatedQuantity: 4,
          targetDeliveryDate: '2026-11-18',
        },
        mockReq
      );

      storedReq = requirementRepository.get(reqId)!;
      expect(storedReq.allocatedQuantity).toBe(24);
      expect(storedReq.allocationStatus).toBe('fully_allocated');
    });
  });

  // =========================================================================
  // 4. FULFILMENT ITEMS / BILL OF MATERIALS (BOM) ENGINE
  // =========================================================================
  describe('4. Fulfilment Items (BOM) Generation & Review', () => {
    let reqId: string;

    beforeEach(async () => {
      const res = await controller.createRequirement(
        mockProjectId,
        {
          title: 'Main Entrance Arch Structure',
          category: 'staging_technical',
          department: 'fabrication',
          quantity: 2,
          unit: 'arches',
        },
        mockReq
      );
      reqId = res.data.id;
    });

    it('generates draft fulfilment items from discipline template', async () => {
      const genRes = await controller.generateDraftFulfilmentItems(mockProjectId, reqId, mockReq);
      expect(genRes.data.items.length).toBeGreaterThan(0);

      const items = (await controller.listFulfilmentItems(mockProjectId, reqId)).data;
      expect(items.length).toBeGreaterThan(0);
      expect(items.every((i: any) => i.reviewStatus === 'draft')).toBe(true);

      // Batch review commit
      const reviewRes = await controller.batchReviewFulfilmentItems(
        mockProjectId,
        reqId,
        {
          itemIds: items.map((i: any) => i.id),
          reviewStatus: 'approved',
          fulfilmentStage: 'procurement_ready',
        },
        mockReq
      );

      expect(reviewRes.data.reviewedCount).toBe(items.length);
      const updatedItems = (await controller.listFulfilmentItems(mockProjectId, reqId)).data;
      expect(updatedItems.every((i: any) => i.reviewStatus === 'approved')).toBe(true);
      expect(updatedItems.every((i: any) => i.fulfilmentStage === 'procurement_ready')).toBe(true);
    });
  });

  // =========================================================================
  // 5. DEPARTMENT WORK PACKAGES TEMPLATES
  // =========================================================================
  describe('5. Department Work Package Templates', () => {
    let reqId: string;

    beforeEach(async () => {
      const res = await controller.createRequirement(
        mockProjectId,
        {
          title: 'Immersive LED Cube',
          category: 'creative_visual',
          quantity: 1,
        },
        mockReq
      );
      reqId = res.data.id;
    });

    it('instantiates reusable department work packages from template', async () => {
      const instRes = await controller.instantiateWorkPackagesFromTemplate(
        mockProjectId,
        reqId,
        'creative_visual',
        mockReq
      );

      expect(instRes.data.workPackages.length).toBeGreaterThan(0);
      const departments = instRes.data.workPackages.map((wp: any) => wp.department);
      expect(departments).toContain('video_engineering');

      const listRes = await controller.listWorkPackages(mockProjectId, reqId);
      expect(listRes.data.length).toBe(instRes.data.workPackages.length);
    });
  });

  // =========================================================================
  // 6. MULTI-DIMENSIONAL GROUPING & GROUP ROLLUPS
  // =========================================================================
  describe('6. Multi-Dimensional Grouping and Saved View Presets', () => {
    beforeEach(async () => {
      // Create 3 requirements in different categories and locations
      const r1 = (await controller.createRequirement(mockProjectId, { title: 'Stage Truss', category: 'staging_technical', department: 'rigging', quantity: 10 }, mockReq)).data;
      const r2 = (await controller.createRequirement(mockProjectId, { title: 'VIP Wall Coverings', category: 'creative_visual', department: 'scenic', quantity: 50 }, mockReq)).data;
      const r3 = (await controller.createRequirement(mockProjectId, { title: 'QCDD Fire Curtains', category: 'health_safety', department: 'safety', quantity: 4 }, mockReq)).data;

      // Allocate r1 to Zone A (10)
      await controller.createAllocation(mockProjectId, r1.id, { zoneId: 'za', zoneName: 'Zone A', allocatedQuantity: 10 }, mockReq);
      // Allocate r2 to Zone B (50)
      await controller.createAllocation(mockProjectId, r2.id, { zoneId: 'zb', zoneName: 'Zone B', allocatedQuantity: 50 }, mockReq);
    });

    it('groups requirements by category with aggregated rollups', async () => {
      const groupedRes = await controller.getGroupedRequirementsMatrix(mockProjectId, 'category');
      const groups = groupedRes.data.groups;
      expect(groups.length).toBeGreaterThanOrEqual(3);

      const stagingGroup = groups.find((g: any) => g.groupKey.toLowerCase().includes('staging'));
      expect(stagingGroup).toBeDefined();
      expect(stagingGroup.totalRequirements).toBe(1);
      expect(stagingGroup.rollup.totalQuantity).toBe(10);
      expect(stagingGroup.rollup.allocatedQuantity).toBe(10);
    });

    it('groups requirements with nested secondary dimension (category then department)', async () => {
      const groupedRes = await controller.getGroupedRequirementsMatrix(mockProjectId, 'category', 'department');
      const groups = groupedRes.data.groups;
      expect(groups.length).toBeGreaterThan(0);
      const staging = groups.find((g: any) => g.groupKey.toLowerCase().includes('staging'));
      expect(staging.subGroups).toBeDefined();
      expect(staging.subGroups.length).toBeGreaterThan(0);
    });
  });
});
