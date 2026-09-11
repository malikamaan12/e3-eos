import { TimeUtil, TimeWindow } from './time.js';
import { Money } from './money.js';

export type ResourceType = 'serialized' | 'bulk';
export type ResourceStatus = 'serviceable' | 'in_maintenance' | 'quarantined' | 'retired';

export interface Resource {
  id: string;
  resourceCode: string;
  name: string;
  type: ResourceType;
  totalQuantity: number; // 1 for serialized, N for bulk
  usableQuantity: number; // totalQuantity minus quarantined/damaged
  warehouseLocation: string;
  status: ResourceStatus;
  authoritativeSystem: 'EOS' | 'LEGACY_LOCKED'; // Cutover invariant (AT-052)
}

export interface Reservation {
  id: string;
  resourceId: string;
  projectId: string;
  window: TimeWindow;
  quantity: number; // 1 for serialized, N for bulk
  status: 'tentative' | 'confirmed' | 'released' | 'cancelled';
  confirmedAt?: Date;
}

export interface MaintenanceHold {
  id: string;
  resourceId: string;
  reason: string;
  damageReport?: string;
  quarantinedAt: Date;
  status: 'active' | 'cleared';
  releasedAt?: Date;
  inspectorId?: string;
}

export interface SubrentalRequest {
  id: string;
  projectId: string;
  resourceId: string;
  requestedQuantity: number;
  shortageQuantity: number;
  window: TimeWindow;
  estimatedSubrentalCost: Money;
  status: 'open_exposure' | 'rfq_issued' | 'po_created' | 'cancelled';
}

export interface ProductionOrder {
  id: string;
  projectId: string;
  designId: string;
  designVersionNumber: number;
  title: string;
  orderedUnits: number;
  completedUnits: number;
  status: 'queued' | 'in_progress' | 'flagged_for_revision_review' | 'completed' | 'cancelled';
  builtItemsActualVersion: number;
}

export class InventoryReservationEngine {
  /**
   * Evaluates whether two reservations collide on serialized asset (AT-049).
   * Two projects cannot confirm the same exclusive asset for overlapping intervals [start, end).
   */
  static validateSerializedReservation(
    resource: Resource,
    existingReservations: Reservation[],
    newReservation: { projectId: string; window: TimeWindow }
  ): void {
    if (resource.type !== 'serialized') {
      throw new Error(`RESOURCE_TYPE_MISMATCH: Resource ${resource.resourceCode} is not serialized.`);
    }

    // Check serviceability (AT-051)
    if (resource.status !== 'serviceable' || resource.usableQuantity < 1) {
      throw new Error(
        `RESOURCE_NOT_SERVICEABLE: Resource ${resource.resourceCode} is currently in '${resource.status}' status and cannot be reserved.`
      );
    }

    // Check authoritative writer (AT-052)
    if (resource.authoritativeSystem !== 'EOS') {
      throw new Error(
        `WRITER_NOT_AUTHORITATIVE: Resource pool ${resource.resourceCode} is controlled by '${resource.authoritativeSystem}'. Cutover has not designated EOS as writer.`
      );
    }

    // Check for overlapping confirmed reservations (AT-049)
    for (const existing of existingReservations) {
      if (existing.status !== 'confirmed') continue;

      if (TimeUtil.overlaps(existing.window, newReservation.window)) {
        throw new Error(
          `RESERVATION_COLLISION: Resource ${resource.resourceCode} is already confirmed for project ${existing.projectId} during window [${existing.window.start.toISOString()} to ${existing.window.end.toISOString()}). Cannot confirm overlapping reservation for project ${newReservation.projectId}.`
        );
      }
    }
  }

  /**
   * Validates bulk stock reservation capacity preventing oversell (AT-050).
   */
  static validateBulkReservation(
    resource: Resource,
    existingReservations: Reservation[],
    requestedQuantity: number,
    window: TimeWindow
  ): {
    availableQuantity: number;
    canFulfill: boolean;
    shortage: number;
  } {
    if (resource.type !== 'bulk') {
      throw new Error(`RESOURCE_TYPE_MISMATCH: Resource ${resource.resourceCode} is not bulk.`);
    }

    // Serviceable usable quantity (AT-051)
    const effectivePool = resource.usableQuantity;

    // Calculate peak concurrency in the requested window
    let peakReserved = 0;
    const activeReservations = existingReservations.filter(
      (r) => r.status === 'confirmed' && TimeUtil.overlaps(r.window, window)
    );

    for (const r of activeReservations) {
      peakReserved += r.quantity;
    }

    const availableQuantity = Math.max(0, effectivePool - peakReserved);
    const canFulfill = availableQuantity >= requestedQuantity;
    const shortage = canFulfill ? 0 : requestedQuantity - availableQuantity;

    if (!canFulfill) {
      throw new Error(
        `BULK_CAPACITY_EXCEEDED: Requested ${requestedQuantity} units of ${resource.resourceCode} for window, but only ${availableQuantity} units are available (Pool: ${effectivePool}, Already Reserved: ${peakReserved}).`
      );
    }

    return {
      availableQuantity,
      canFulfill,
      shortage,
    };
  }

  /**
   * Applies damage quarantine / maintenance hold (AT-051).
   * Decouples physical warehouse custody from usable operational availability.
   */
  static placeOnMaintenanceHold(
    resource: Resource,
    reason: string,
    damageReport?: string
  ): {
    updatedResource: Resource;
    hold: MaintenanceHold;
  } {
    const hold: MaintenanceHold = {
      id: `hold-${resource.id}-${Date.now()}`,
      resourceId: resource.id,
      reason,
      damageReport,
      quarantinedAt: new Date(),
      status: 'active',
    };

    const updatedResource: Resource = {
      ...resource,
      usableQuantity: resource.type === 'serialized' ? 0 : Math.max(0, resource.usableQuantity - 1),
      status: 'in_maintenance',
    };

    return { updatedResource, hold };
  }

  /**
   * Releases asset from maintenance hold upon certified inspection (AT-051).
   */
  static releaseFromMaintenanceHold(
    resource: Resource,
    hold: MaintenanceHold,
    inspectorId: string
  ): {
    updatedResource: Resource;
    updatedHold: MaintenanceHold;
  } {
    if (hold.status !== 'active') {
      throw new Error('HOLD_NOT_ACTIVE: Maintenance hold is already cleared.');
    }

    const updatedHold: MaintenanceHold = {
      ...hold,
      status: 'cleared',
      releasedAt: new Date(),
      inspectorId,
    };

    const updatedResource: Resource = {
      ...resource,
      usableQuantity: resource.type === 'serialized' ? resource.totalQuantity : resource.usableQuantity + 1,
      status: 'serviceable',
    };

    return { updatedResource, updatedHold };
  }

  /**
   * Shortage detection creates a subrental request and forecast exposure (AT-054).
   * Invariant: Does NOT automatically generate an unauthorized supplier commitment or purchase order.
   */
  static createSubrentalShortageExposure(params: {
    projectId: string;
    resource: Resource;
    shortageQuantity: number;
    window: TimeWindow;
    estimatedUnitRate: Money;
  }): SubrentalRequest {
    const totalExposure = params.estimatedUnitRate.multiply(params.shortageQuantity);

    return {
      id: `sub-${params.projectId}-${Date.now()}`,
      projectId: params.projectId,
      resourceId: params.resource.id,
      requestedQuantity: params.shortageQuantity,
      shortageQuantity: params.shortageQuantity,
      window: params.window,
      estimatedSubrentalCost: totalExposure,
      status: 'open_exposure', // Invariant AT-054: open exposure only, not an unauthorized PO
    };
  }

  /**
   * Flags in-progress fabrication orders when a new drawing revision is released (AT-048).
   * Completed units retain their historical build version (no retroactive alteration).
   */
  static handleDrawingRevisionOnProduction(
    orders: ProductionOrder[],
    designId: string,
    _newVersionNumber: number
  ): ProductionOrder[] {
    return orders.map((order) => {
      if (order.designId !== designId) return order;

      // Invariant AT-048: If order is completed, already built items retain actual source version
      if (order.status === 'completed') {
        return order; // Historical fidelity preserved
      }

      // In-progress or queued orders are flagged for engineering review
      if (order.status === 'in_progress' || order.status === 'queued') {
        return {
          ...order,
          status: 'flagged_for_revision_review',
        };
      }

      return order;
    });
  }
}

export type AssetOwnership = 'e3_owned' | 'vendor_rental' | 'client_owned' | 'project_purchased' | 'consignment';
export type AssetCondition = 'new' | 'good' | 'serviceable' | 'needs_maintenance' | 'damaged' | 'quarantined' | 'retired';
export type AssetAvailability = 'available' | 'reserved' | 'allocated' | 'dispatched' | 'on_site' | 'returned' | 'damaged' | 'unavailable';

export interface Asset {
  id: string;
  assetTag: string;
  barcode: string;
  name: string;
  category: string;
  subcategory?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  quantity: number;
  unit: string;
  ownership: AssetOwnership;
  warehouseId: string;
  zone: string;
  location: string;
  condition: AssetCondition;
  availability: AssetAvailability;
  purchaseValue: number;
  replacementValue: number;
  maintenanceStatus: string;
  lastInspectionDate?: Date;
  nextInspectionDate?: Date;
}

export interface Warehouse {
  id: string;
  warehouseCode: string;
  name: string;
  country: string;
  city: string;
  address: string;
  zones: string[];
  capacity: string;
  managerId: string;
  operatingHours: string;
}

export interface AssetAllocation {
  id: string;
  assetId: string;
  projectId: string;
  procurementRequirementId?: string;
  boqLineId?: string;
  allocatedQuantity: number;
  window: TimeWindow;
  status: 'tentative' | 'confirmed' | 'released' | 'returned';
}

export interface WarehouseMovement {
  id: string;
  assetId: string;
  source: string;
  destination: string;
  movementType:
    | 'received'
    | 'stored'
    | 'allocated'
    | 'picked'
    | 'packed'
    | 'dispatched'
    | 'on_site'
    | 'returned'
    | 'inspected'
    | 'restocked';
  quantity: number;
  condition: string;
  projectId?: string;
  evidenceUris: string[];
  userId: string;
  timestamp: Date;
}

export class AssetAllocationEngine {
  /**
   * Evaluates split between existing E3 internal asset inventory and external procurement (Sprint 03 Module 7).
   * Example: 30 required, 8 available -> 8 internally allocated, 22 external procurement required.
   */
  static calculateInternalFulfillment(
    requiredQuantity: number,
    availableInventoryQuantity: number
  ): {
    allocatedInternally: number;
    externalProcurementRequired: number;
    fulfillmentRatePercent: number;
  } {
    if (requiredQuantity <= 0) {
      return { allocatedInternally: 0, externalProcurementRequired: 0, fulfillmentRatePercent: 100 };
    }

    const allocatedInternally = Math.min(requiredQuantity, Math.max(0, availableInventoryQuantity));
    const externalProcurementRequired = Math.max(0, requiredQuantity - allocatedInternally);
    const fulfillmentRatePercent = Math.round((allocatedInternally / requiredQuantity) * 100);

    return {
      allocatedInternally,
      externalProcurementRequired,
      fulfillmentRatePercent,
    };
  }

  /**
   * Enforces multi-project asset allocation exclusivity (Sprint 03 Module 7).
   * Invariant: An asset cannot be allocated to two overlapping projects unless explicitly allowed.
   */
  static validateAssetProjectAllocation(
    asset: Asset,
    existingAllocations: AssetAllocation[],
    newAllocation: { projectId: string; window: TimeWindow; quantity: number }
  ): void {
    if (asset.condition === 'quarantined' || asset.condition === 'damaged' || asset.condition === 'retired') {
      throw new Error(
        `ASSET_NOT_SERVICEABLE: Asset ${asset.assetTag} (${asset.name}) is in '${asset.condition}' condition and cannot be allocated.`
      );
    }

    // Check for active overlapping allocations for a different project
    for (const alloc of existingAllocations) {
      if (alloc.status !== 'confirmed') continue;
      if (alloc.projectId === newAllocation.projectId) continue;

      if (TimeUtil.overlaps(alloc.window, newAllocation.window)) {
        throw new Error(
          `ASSET_PROJECT_COLLISION: Asset ${asset.assetTag} (${asset.name}) is already confirmed for project ${alloc.projectId} from ${alloc.window.start.toISOString()} to ${alloc.window.end.toISOString()}. Cannot allocate to project ${newAllocation.projectId} during overlapping window.`
        );
      }
    }
  }

  /**
   * Records a custodial warehouse movement step through the complete operational lifecycle.
   */
  static recordMovement(movement: Omit<WarehouseMovement, 'id' | 'timestamp'>): WarehouseMovement {
    return {
      ...movement,
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date(),
    };
  }
}

