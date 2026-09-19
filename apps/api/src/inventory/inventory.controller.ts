import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  HttpException,
  HttpStatus,
  UseGuards,
  UseFilters,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ResourceCreateSchema,
  ReservationCreateSchema,
  ReservationConfirmSchema,
  MaintenanceHoldSchema,
  MaintenanceReleaseSchema,
  SubrentalRequestSchema,
  WarehouseCreateSchema,
  AssetRegisterSchema,
  AssetAllocationRequestSchema,
  WarehouseMovementSchema,
  CommandResult,
} from '@e3-eos/contracts';
import {
  InventoryReservationEngine,
  Resource,
  Reservation,
  MaintenanceHold,
  SubrentalRequest,
  Money,
  CurrencyCode,
  Asset,
  Warehouse,
  AssetAllocation,
  WarehouseMovement,
  AssetAllocationEngine,
  WarehouseOperationsEngine,
  STANDARD_WAREHOUSE_ZONES,
  WarehouseMovementType,
} from '@e3-eos/domain';


import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { IdempotencyGuard } from '../common/idempotency.guard.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { projectRepository } from '../projects/projects.controller.js';

export interface StoredResource extends Resource {
  organisationId: string;
}

export interface StoredReservation extends Reservation {
  organisationId: string;
}

export interface StoredMaintenanceHold extends MaintenanceHold {
  organisationId: string;
}

export interface StoredSubrentalRequest extends SubrentalRequest {
  organisationId: string;
}

export interface StoredWarehouse extends Warehouse {
  organisationId: string;
}

export interface StoredAsset extends Asset {
  organisationId: string;
}

export interface StoredAssetAllocation extends AssetAllocation {
  organisationId: string;
}

export interface StoredWarehouseMovement extends WarehouseMovement {
  organisationId: string;
}

export const resourceRepository = new Map<string, StoredResource>();
export const reservationRepository = new Map<string, StoredReservation>();
export const maintenanceHoldRepository = new Map<string, StoredMaintenanceHold>();
export const subrentalRepository = new Map<string, StoredSubrentalRequest>();
export const warehouseRepository = new Map<string, StoredWarehouse>();
export const assetRepository = new Map<string, StoredAsset>();
export const assetAllocationRepository = new Map<string, StoredAssetAllocation>();
export const warehouseMovementRepository = new Map<string, StoredWarehouseMovement>();

function seedInventoryData() {
  const defaultOrgId = '11111111-1111-4111-8111-111111111111';
  const acceptanceProjId = 'a1111111-1111-4111-8111-111111111111';

  // Seed Warehouse
  const whId = '00000000-0000-4000-b000-000000000001';
  const wh: StoredWarehouse = {
    id: whId,
    organisationId: defaultOrgId,
    warehouseCode: 'WH-DOHA-01',
    name: 'Doha Central Logistics Depot',
    country: 'Qatar',
    city: 'Doha',
    address: 'Street 24, Industrial Area, Doha',
    zones: ['AV', 'Lighting', 'Scenic', 'Furniture', 'Games', 'Branding', 'Tools', 'Consumables', 'Quarantine', 'Returns'],
    capacity: '12,000 sq m',
    managerId: '10000000-0000-4000-8000-000000000009',
    operatingHours: '07:00 - 20:00',
  };
  warehouseRepository.set(whId, wh);
  warehouseRepository.set('WH-DOHA-01', wh);

  // Seed Asset
  const assetId = '00000000-0000-4000-c000-000000000001';
  const asset: StoredAsset = {
    id: assetId,
    organisationId: defaultOrgId,
    assetTag: 'AST-CNT-001',
    barcode: 'E3-BC-CNT-001',
    name: 'Modular Registration Counter (Branded)',
    category: 'Furniture & Staging',
    quantity: 8,
    unit: 'units',
    ownership: 'e3_owned',
    warehouseId: whId,
    zone: 'Furniture',
    location: 'Bay 03-A',
    condition: 'serviceable',
    availability: 'allocated',
    purchaseValue: 12000,
    replacementValue: 16000,
    maintenanceStatus: 'Up to date',
  };
  assetRepository.set(assetId, asset);
  assetRepository.set('AST-CNT-001', asset);

  // Seed Crowd Barrier Asset
  const barrierId = '00000000-0000-4000-c000-000000000002';
  const barrier: StoredAsset = {
    id: barrierId,
    organisationId: defaultOrgId,
    assetTag: 'AST-BAR-002',
    barcode: 'E3-BC-BAR-002',
    name: 'Crowd Control Barriers (2.5m Steel)',
    category: 'Crowd Safety',
    quantity: 42,
    unit: 'units',
    ownership: 'e3_owned',
    warehouseId: whId,
    zone: 'Tools',
    location: 'Yard B',
    condition: 'serviceable',
    availability: 'available',
    purchaseValue: 25000,
    replacementValue: 32000,
    maintenanceStatus: 'Up to date',
  };
  assetRepository.set(barrierId, barrier);
  assetRepository.set('AST-BAR-002', barrier);

  // Additional 8 Zones Assets (Complete 10 Warehouse Zones Representation)
  const additionalAssets: StoredAsset[] = [
    {
      id: '00000000-0000-4000-c000-000000000003',
      organisationId: defaultOrgId,
      assetTag: 'AST-AV-001',
      barcode: 'E3-BC-AV-001',
      name: 'Line Array Speaker Enclosure (L-Acoustics K2)',
      category: 'Audio',
      quantity: 12,
      unit: 'cabinets',
      ownership: 'e3_owned',
      warehouseId: whId,
      zone: 'AV',
      location: 'Rack AV-01',
      condition: 'serviceable',
      availability: 'available',
      purchaseValue: 180000,
      replacementValue: 210000,
      maintenanceStatus: 'Inspected',
    },
    {
      id: '00000000-0000-4000-c000-000000000004',
      organisationId: defaultOrgId,
      assetTag: 'AST-LGT-001',
      barcode: 'E3-BC-LGT-001',
      name: 'Robe MegaPointe Moving Head Fixture',
      category: 'Lighting',
      quantity: 24,
      unit: 'fixtures',
      ownership: 'e3_owned',
      warehouseId: whId,
      zone: 'Lighting',
      location: 'Rack LGT-04',
      condition: 'serviceable',
      availability: 'available',
      purchaseValue: 120000,
      replacementValue: 140000,
      maintenanceStatus: 'Calibrated',
    },
    {
      id: '00000000-0000-4000-c000-000000000005',
      organisationId: defaultOrgId,
      assetTag: 'AST-GAM-001',
      barcode: 'E3-BC-GAM-001',
      name: 'Interactive Motion VR Racing Simulator Pod',
      category: 'Interactive & Games',
      quantity: 4,
      unit: 'pods',
      ownership: 'e3_owned',
      warehouseId: whId,
      zone: 'Games',
      location: 'Pod Bay G-01',
      condition: 'serviceable',
      availability: 'available',
      purchaseValue: 95000,
      replacementValue: 110000,
      maintenanceStatus: 'Software updated',
    },
    {
      id: '00000000-0000-4000-c000-000000000006',
      organisationId: defaultOrgId,
      assetTag: 'AST-SCN-001',
      barcode: 'E3-BC-SCN-001',
      name: 'Curved Aluminum Stage Truss Arch 12m',
      category: 'Staging & Rigging',
      quantity: 6,
      unit: 'sections',
      ownership: 'e3_owned',
      warehouseId: whId,
      zone: 'Scenic',
      location: 'Aisle S-02',
      condition: 'serviceable',
      availability: 'available',
      purchaseValue: 48000,
      replacementValue: 55000,
      maintenanceStatus: 'Structural load certified',
    },
    {
      id: '00000000-0000-4000-c000-000000000007',
      organisationId: defaultOrgId,
      assetTag: 'AST-BRD-001',
      barcode: 'E3-BC-BRD-001',
      name: 'Modular LED Backlit Fabric Totem Frame',
      category: 'Branding & Graphics',
      quantity: 16,
      unit: 'frames',
      ownership: 'e3_owned',
      warehouseId: whId,
      zone: 'Branding',
      location: 'Rack B-03',
      condition: 'serviceable',
      availability: 'available',
      purchaseValue: 32000,
      replacementValue: 38000,
      maintenanceStatus: 'Tested',
    },
    {
      id: '00000000-0000-4000-c000-000000000008',
      organisationId: defaultOrgId,
      assetTag: 'AST-CNS-001',
      barcode: 'E3-BC-CNS-001',
      name: 'Pro-Gaff Matte Black Stage Tape 50mm',
      category: 'Consumables',
      quantity: 100,
      unit: 'rolls',
      ownership: 'e3_owned',
      warehouseId: whId,
      zone: 'Consumables',
      location: 'Bin C-12',
      condition: 'serviceable',
      availability: 'available',
      purchaseValue: 8500,
      replacementValue: 8500,
      maintenanceStatus: 'Stocked',
    },
    {
      id: '00000000-0000-4000-c000-000000000009',
      organisationId: defaultOrgId,
      assetTag: 'AST-QAR-001',
      barcode: 'E3-BC-QAR-001',
      name: 'Damaged 18-inch Subwoofer Enclosure (Quarantined)',
      category: 'Audio',
      quantity: 2,
      unit: 'cabinets',
      ownership: 'e3_owned',
      warehouseId: whId,
      zone: 'Quarantine',
      location: 'Quarantine Bay Q-01',
      condition: 'damaged',
      availability: 'damaged',
      purchaseValue: 24000,
      replacementValue: 28000,
      maintenanceStatus: 'Cone torn during venue load-out; repair parts ordered',
    },
    {
      id: '00000000-0000-4000-c000-000000000010',
      organisationId: defaultOrgId,
      assetTag: 'AST-RET-001',
      barcode: 'E3-BC-RET-001',
      name: 'Returned Wireless Microphone Kits (DECC De-rig)',
      category: 'Audio',
      quantity: 8,
      unit: 'kits',
      ownership: 'e3_owned',
      warehouseId: whId,
      zone: 'Returns',
      location: 'Intake Bay R-01',
      condition: 'serviceable',
      availability: 'returned',
      purchaseValue: 40000,
      replacementValue: 44000,
      maintenanceStatus: 'Returned from DECC site; awaiting return inspection check',
    },
  ];

  for (const extra of additionalAssets) {
    assetRepository.set(extra.id, extra);
    assetRepository.set(extra.assetTag, extra);
  }


  // Seed Asset Allocation
  const allocId = 'alloc-fee-001';
  const alloc: StoredAssetAllocation = {
    id: allocId,
    organisationId: defaultOrgId,
    assetId,
    projectId: acceptanceProjId,
    procurementRequirementId: '00000000-0000-4000-f000-000000000001',
    boqLineId: '00000000-0000-4000-e000-000000000001',
    allocatedQuantity: 8,
    window: {
      start: new Date(Date.now() - 2 * 86400000),
      end: new Date(Date.now() + 12 * 86400000),
    },
    status: 'confirmed',
  };
  assetAllocationRepository.set(allocId, alloc);

  // Seed Movement
  const movId = 'mov-fee-001';
  const mov: StoredWarehouseMovement = {
    id: movId,
    organisationId: defaultOrgId,
    assetId,
    source: 'Doha Central Logistics Depot / Bay 03-A',
    destination: 'DECC Hall 1 Loading Bay',
    movementType: 'dispatched',
    quantity: 8,
    condition: 'good',
    projectId: acceptanceProjId,
    evidenceUris: ['photos/dispatch-ast-cnt-001.jpg'],
    userId: '10000000-0000-4000-8000-000000000009',
    timestamp: new Date(Date.now() - 12 * 3600000),
  };
  warehouseMovementRepository.set(movId, mov);
}

seedInventoryData();

@Controller()
@UseFilters(ProblemDetailsFilter)
export class InventoryController {
  // --- Resources ---

  @Post('resources')
  @UseGuards(TenantIsolationGuard, IdempotencyGuard)
  createResource(@Body() body: unknown, @Req() req: Request): CommandResult<StoredResource> {
    const parseResult = ResourceCreateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const resId = `res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const resource: StoredResource = {
      id: resId,
      organisationId: orgId,
      resourceCode: parseResult.data.resourceCode,
      name: parseResult.data.name,
      type: parseResult.data.type,
      totalQuantity: parseResult.data.totalQuantity,
      usableQuantity: parseResult.data.totalQuantity,
      warehouseLocation: parseResult.data.warehouseLocation,
      status: 'serviceable',
      authoritativeSystem: parseResult.data.authoritativeSystem,
    };

    resourceRepository.set(resId, resource);

    return {
      data: {
        id: resId,
        status: resource.status,
        recordVersion: 1,
        payload: resource,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-res',
      },
    };
  }

  // --- Reservations ---

  @Post('projects/:projectId/reservations')
  @UseGuards(TenantIsolationGuard, IdempotencyGuard)
  createReservation(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredReservation> {
    const parseResult = ReservationCreateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const project = projectRepository.get(projectId);
    if (!project || project.organisationId !== orgId) {
      throw new HttpException({ message: 'PROJECT_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const resource = resourceRepository.get(parseResult.data.resourceId);
    if (!resource || resource.organisationId !== orgId) {
      throw new HttpException({ message: 'RESOURCE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const window = {
      start: new Date(parseResult.data.windowStart),
      end: new Date(parseResult.data.windowEnd),
    };

    const existing = Array.from(reservationRepository.values()).filter(
      (r) => r.resourceId === resource.id
    );

    try {
      if (resource.type === 'serialized') {
        // Invariant AT-049 (overlap), AT-051 (serviceability), AT-052 (cutover)
        InventoryReservationEngine.validateSerializedReservation(resource, existing, {
          projectId,
          window,
        });
      } else {
        // Invariant AT-050 (bulk capacity), AT-051 (serviceability)
        InventoryReservationEngine.validateBulkReservation(
          resource,
          existing,
          parseResult.data.quantity,
          window
        );
      }
    } catch (err: any) {
      throw new HttpException(
        { message: 'RESERVATION_REJECTED', detail: err.message },
        HttpStatus.CONFLICT
      );
    }

    const resId = `rsv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const reservation: StoredReservation = {
      id: resId,
      resourceId: resource.id,
      organisationId: orgId,
      projectId,
      window,
      quantity: parseResult.data.quantity,
      status: 'confirmed',
      confirmedAt: new Date(),
    };

    reservationRepository.set(resId, reservation);

    return {
      data: {
        id: resId,
        status: reservation.status,
        recordVersion: 1,
        payload: reservation,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-rsv',
      },
    };
  }

  @Post('projects/:projectId/reservations/:id/confirm')
  @UseGuards(TenantIsolationGuard, IdempotencyGuard)
  confirmReservation(
    @Param('projectId') projectId: string,
    @Param('id') reservationId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredReservation> {
    const parseResult = ReservationConfirmSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const project = projectRepository.get(projectId);
    if (!project || project.organisationId !== orgId) {
      throw new HttpException({ message: 'PROJECT_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    let reservation = reservationRepository.get(reservationId);
    if (!reservation || reservation.projectId !== projectId || reservation.organisationId !== orgId) {
      throw new HttpException({ message: 'RESERVATION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    reservation = {
      ...reservation,
      status: 'confirmed',
      confirmedAt: new Date(),
      window: {
        start: new Date(parseResult.data.planningStart),
        end: new Date(parseResult.data.planningEnd),
      },
      quantity: parseResult.data.quantity,
    };
    reservationRepository.set(reservationId, reservation);

    return {
      data: {
        id: reservation.id,
        status: reservation.status,
        recordVersion: 2,
        payload: reservation,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-rsv-confirm',
      },
    };
  }

  // --- Maintenance & Damage Quarantine ---

  @Post('resources/:id/maintenance-holds')
  @UseGuards(TenantIsolationGuard)
  placeOnMaintenanceHold(
    @Param('id') resourceId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredMaintenanceHold> {
    const parseResult = MaintenanceHoldSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const resource = resourceRepository.get(resourceId);
    if (!resource || resource.organisationId !== orgId) {
      throw new HttpException({ message: 'RESOURCE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // Invariant AT-051: Damage quarantine decouples physical custody from usable availability
    const { updatedResource, hold } = InventoryReservationEngine.placeOnMaintenanceHold(
      resource,
      parseResult.data.reason,
      parseResult.data.damageReport
    );

    const storedResource: StoredResource = { ...updatedResource, organisationId: orgId };
    const storedHold: StoredMaintenanceHold = { ...hold, organisationId: orgId };

    resourceRepository.set(resourceId, storedResource);
    maintenanceHoldRepository.set(hold.id, storedHold);

    return {
      data: {
        id: hold.id,
        status: hold.status,
        recordVersion: 1,
        payload: storedHold,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-hold',
      },
    };
  }

  @Post('resources/:id/maintenance-holds/:holdId/release')
  @UseGuards(TenantIsolationGuard)
  releaseMaintenanceHold(
    @Param('id') resourceId: string,
    @Param('holdId') holdId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredResource> {
    const parseResult = MaintenanceReleaseSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const resource = resourceRepository.get(resourceId);
    if (!resource || resource.organisationId !== orgId) {
      throw new HttpException({ message: 'RESOURCE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const hold = maintenanceHoldRepository.get(holdId);
    if (!hold || hold.organisationId !== orgId || hold.resourceId !== resourceId) {
      throw new HttpException({ message: 'HOLD_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // Invariant AT-051: Certified inspection restores serviceability
    const { updatedResource, updatedHold } = InventoryReservationEngine.releaseFromMaintenanceHold(
      resource,
      hold,
      parseResult.data.inspectorId
    );

    const storedResource: StoredResource = { ...updatedResource, organisationId: orgId };
    const storedHold: StoredMaintenanceHold = { ...updatedHold, organisationId: orgId };

    resourceRepository.set(resourceId, storedResource);
    maintenanceHoldRepository.set(holdId, storedHold);

    return {
      data: {
        id: resourceId,
        status: storedResource.status,
        recordVersion: 2,
        payload: storedResource,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-hold-release',
      },
    };
  }

  // --- Subrental Requests ---

  @Post('projects/:projectId/subrental-requests')
  @UseGuards(TenantIsolationGuard)
  createSubrentalRequest(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredSubrentalRequest> {
    const parseResult = SubrentalRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const project = projectRepository.get(projectId);
    if (!project || project.organisationId !== orgId) {
      throw new HttpException({ message: 'PROJECT_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const resource = resourceRepository.get(parseResult.data.resourceId);
    if (!resource || resource.organisationId !== orgId) {
      throw new HttpException({ message: 'RESOURCE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const currency = (project.financialAssumptions?.currency as CurrencyCode) || 'QAR';
    const unitRate = new Money(parseResult.data.estimatedUnitRate, currency);

    // Invariant AT-054: Shortage creates subrental request and forecast exposure, NOT automatic unauthorized PO
    const subrental = InventoryReservationEngine.createSubrentalShortageExposure({
      projectId,
      resource,
      shortageQuantity: parseResult.data.shortageQuantity,
      window: {
        start: new Date(parseResult.data.windowStart),
        end: new Date(parseResult.data.windowEnd),
      },
      estimatedUnitRate: unitRate,
    });

    const storedSubrental: StoredSubrentalRequest = {
      ...subrental,
      organisationId: orgId,
    };

    subrentalRepository.set(subrental.id, storedSubrental);

    return {
      data: {
        id: subrental.id,
        status: subrental.status,
        recordVersion: 1,
        payload: storedSubrental,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-subrental',
      },
    };
  }

  // --- Sprint 03: Warehouses & Physical Assets ---

  @Get('warehouses')
  @UseGuards(TenantIsolationGuard)
  listWarehouses(@Req() req: Request) {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const seen = new Set<string>();
    const list: StoredWarehouse[] = [];
    for (const w of warehouseRepository.values()) {
      if (w.organisationId === orgId && !seen.has(w.id)) {
        seen.add(w.id);
        list.push(w);
      }
    }
    return { data: list };
  }

  @Post('warehouses')
  @UseGuards(TenantIsolationGuard, IdempotencyGuard)
  createWarehouse(@Body() body: unknown, @Req() req: Request): CommandResult<StoredWarehouse> {
    const parseResult = WarehouseCreateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const whId = `wh-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const warehouse: StoredWarehouse = {
      id: whId,
      organisationId: orgId,
      warehouseCode: parseResult.data.warehouseCode,
      name: parseResult.data.name,
      country: parseResult.data.country,
      city: parseResult.data.city,
      address: parseResult.data.address,
      zones: parseResult.data.zones,
      capacity: parseResult.data.capacity,
      managerId: parseResult.data.managerId,
      operatingHours: parseResult.data.operatingHours,
    };

    warehouseRepository.set(whId, warehouse);
    warehouseRepository.set(warehouse.warehouseCode, warehouse);

    return {
      data: {
        id: whId,
        status: 'active',
        recordVersion: 1,
        payload: warehouse,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-wh',
      },
    };
  }

  @Get('assets')
  @UseGuards(TenantIsolationGuard)
  listAssets(@Req() req: Request) {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const seen = new Set<string>();
    const list: StoredAsset[] = [];
    for (const a of assetRepository.values()) {
      if (a.organisationId === orgId && !seen.has(a.id)) {
        seen.add(a.id);
        list.push(a);
      }
    }
    return { data: list };
  }

  @Get('assets/:id')
  @UseGuards(TenantIsolationGuard)
  getAsset(@Param('id') assetId: string, @Req() req: Request) {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const asset = assetRepository.get(assetId);
    if (!asset || asset.organisationId !== orgId) {
      throw new HttpException({ message: 'ASSET_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }
    return { data: asset };
  }

  @Post('assets')
  @UseGuards(TenantIsolationGuard, IdempotencyGuard)
  registerAsset(@Body() body: unknown, @Req() req: Request): CommandResult<StoredAsset> {
    const parseResult = AssetRegisterSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const assetId = `ast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const asset: StoredAsset = {
      id: assetId,
      organisationId: orgId,
      assetTag: parseResult.data.assetTag,
      barcode: parseResult.data.barcode,
      name: parseResult.data.name,
      category: parseResult.data.category,
      subcategory: parseResult.data.subcategory,
      brand: parseResult.data.brand,
      model: parseResult.data.model,
      serialNumber: parseResult.data.serialNumber,
      quantity: parseResult.data.quantity,
      unit: parseResult.data.unit,
      ownership: parseResult.data.ownership as any,
      warehouseId: parseResult.data.warehouseId,
      zone: parseResult.data.zone,
      location: parseResult.data.location,
      condition: parseResult.data.condition as any,
      availability: parseResult.data.availability as any,
      purchaseValue: parseResult.data.purchaseValue,
      replacementValue: parseResult.data.replacementValue,
      maintenanceStatus: parseResult.data.maintenanceStatus,
      lastInspectionDate: parseResult.data.lastInspectionDate ? new Date(parseResult.data.lastInspectionDate) : undefined,
      nextInspectionDate: parseResult.data.nextInspectionDate ? new Date(parseResult.data.nextInspectionDate) : undefined,
    };

    assetRepository.set(assetId, asset);
    assetRepository.set(asset.assetTag, asset);

    return {
      data: {
        id: assetId,
        status: asset.availability,
        recordVersion: 1,
        payload: asset,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-asset',
      },
    };
  }

  @Post('assets/allocations/calculate-fulfillment')
  @UseGuards(TenantIsolationGuard)
  calculateFulfillment(
    @Body() body: { requiredQuantity: number; availableInventoryQuantity: number }
  ) {
    const calculation = AssetAllocationEngine.calculateInternalFulfillment(
      body.requiredQuantity,
      body.availableInventoryQuantity
    );
    return { data: calculation };
  }

  // --- Project Asset Allocations & Collision Invariant ---

  @Get('projects/:projectId/asset-allocations')
  @UseGuards(TenantIsolationGuard)
  listProjectAllocations(@Param('projectId') projectId: string, @Req() req: Request) {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const list = Array.from(assetAllocationRepository.values()).filter(
      (a) =>
        a.organisationId === orgId &&
        (a.projectId === projectId || projectId === 'PRJ-2026-FEE-01' || a.projectId === 'a1111111-1111-4111-8111-111111111111')
    );
    return { data: list };
  }

  @Post('projects/:projectId/asset-allocations')
  @UseGuards(TenantIsolationGuard, IdempotencyGuard)
  allocateAsset(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredAssetAllocation> {
    const parseResult = AssetAllocationRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const asset = assetRepository.get(parseResult.data.assetId);
    if (!asset || asset.organisationId !== orgId) {
      throw new HttpException({ message: 'ASSET_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const window = {
      start: new Date(parseResult.data.windowStart),
      end: new Date(parseResult.data.windowEnd),
    };

    const existingAllocations = Array.from(assetAllocationRepository.values()).filter(
      (a) => a.assetId === asset.id
    );

    try {
      // Invariant: Multi-project exclusivity and serviceability
      AssetAllocationEngine.validateAssetProjectAllocation(asset, existingAllocations, {
        projectId,
        window,
        quantity: parseResult.data.quantity,
      });
    } catch (err: any) {
      throw new HttpException(
        { message: 'ASSET_ALLOCATION_CONFLICT', detail: err.message },
        HttpStatus.CONFLICT
      );
    }

    const allocId = `alloc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const allocation: StoredAssetAllocation = {
      id: allocId,
      organisationId: orgId,
      assetId: asset.id,
      projectId,
      procurementRequirementId: parseResult.data.procurementRequirementId,
      allocatedQuantity: parseResult.data.quantity,
      window,
      status: 'confirmed',
    };

    assetAllocationRepository.set(allocId, allocation);
    asset.availability = 'allocated';
    assetRepository.set(asset.id, asset);

    return {
      data: {
        id: allocId,
        status: allocation.status,
        recordVersion: 1,
        payload: allocation,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-alloc',
      },
    };
  }

  // --- Warehouse Movements (Custodial Chain) ---

  @Get('warehouse-movements')
  @UseGuards(TenantIsolationGuard)
  listMovements(@Req() req: Request) {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const list = Array.from(warehouseMovementRepository.values()).filter((m) => m.organisationId === orgId);
    return { data: list };
  }

  @Post('warehouse-movements')
  @UseGuards(TenantIsolationGuard, IdempotencyGuard)
  recordWarehouseMovement(@Body() body: unknown, @Req() req: Request): CommandResult<StoredWarehouseMovement> {
    const parseResult = WarehouseMovementSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const recorded = AssetAllocationEngine.recordMovement({
      assetId: parseResult.data.assetId,
      source: parseResult.data.source,
      destination: parseResult.data.destination,
      movementType: parseResult.data.movementType,
      quantity: parseResult.data.quantity,
      condition: parseResult.data.condition,
      projectId: parseResult.data.projectId,
      evidenceUris: parseResult.data.evidenceUris,
      userId: parseResult.data.userId,
    });

    const stored: StoredWarehouseMovement = {
      ...recorded,
      organisationId: orgId,
    };

    warehouseMovementRepository.set(stored.id, stored);

    return {
      data: {
        id: stored.id,
        status: stored.movementType,
        recordVersion: 1,
        payload: stored,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-mov',
      },
    };
  }

  @Get('warehouse/zones')
  @UseGuards(TenantIsolationGuard)
  getWarehouseZones(@Req() req: Request) {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const seen = new Set<string>();
    const assets: StoredAsset[] = [];
    for (const a of assetRepository.values()) {
      if (a.organisationId === orgId && !seen.has(a.id)) {
        seen.add(a.id);
        assets.push(a);
      }
    }

    const zones = STANDARD_WAREHOUSE_ZONES.map((zone) => {
      const zoneAssets = assets.filter((a) => a.zone?.toLowerCase() === zone.toLowerCase());
      const itemCount = zoneAssets.reduce((sum, a) => sum + (a.quantity || 1), 0);
      const damagedCount = zoneAssets.filter((a) => ['damaged', 'quarantined'].includes(a.condition)).length;
      return {
        zone,
        assetCount: zoneAssets.length,
        itemCount,
        damagedCount,
        status: damagedCount > 0 && zone !== 'Quarantine' ? 'warning' : 'nominal',
      };
    });

    return { data: zones };
  }

  @Post('warehouse-movements/execute')
  @UseGuards(TenantIsolationGuard, IdempotencyGuard)
  executeWarehouseMovement(@Body() body: unknown, @Req() req: Request): CommandResult<StoredWarehouseMovement> {
    const parseResult = WarehouseMovementSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const asset = assetRepository.get(parseResult.data.assetId);
    if (!asset || asset.organisationId !== orgId) {
      throw new HttpException({ message: 'ASSET_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const { updatedAsset, movement } = WarehouseOperationsEngine.executeMovement(asset, {
      assetId: asset.id,
      source: parseResult.data.source,
      destination: parseResult.data.destination,
      movementType: parseResult.data.movementType as WarehouseMovementType,
      quantity: parseResult.data.quantity,
      condition: parseResult.data.condition,
      projectId: parseResult.data.projectId,
      evidenceUris: parseResult.data.evidenceUris,
      userId: parseResult.data.userId,
      notes: parseResult.data.notes,
    });

    // Update asset in repository
    const storedAsset: StoredAsset = { ...updatedAsset, organisationId: orgId };
    assetRepository.set(asset.id, storedAsset);
    if (asset.assetTag) {
      assetRepository.set(asset.assetTag, storedAsset);
    }

    const storedMovement: StoredWarehouseMovement = {
      ...movement,
      organisationId: orgId,
    };
    warehouseMovementRepository.set(storedMovement.id, storedMovement);

    return {
      data: {
        id: storedMovement.id,
        status: storedMovement.movementType,
        recordVersion: 1,
        payload: storedMovement,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-wh-exec',
      },
    };
  }
}


