export interface ExternalReference {
  connectionId: string;
  entityType: 'product' | 'asset' | 'warehouse' | 'vendor' | 'purchase_request' | 'purchase_order' | 'receipt';
  externalId: string;
  sourceVersion?: string;
}

export interface OccupiedWindow {
  start: string;
  end: string;
  timeZone?: string;
  basis?: 'occupied_including_buffers' | 'event_dates_only';
}

export interface EquipmentAvailabilityQuery {
  connectionId?: string;
  productPoolId: string;
  quantity: number;
  unit?: string;
  window: OccupiedWindow;
  locationRef?: string;
  bufferPolicy?: {
    prepHours?: number;
    returnHours?: number;
  };
  projectScopeId?: string;
}

export interface EquipmentAvailabilityResult {
  productPoolId: string;
  totalServiceableQuantity: number;
  occupiedQuantity: number;
  availableQuantity: number;
  projectExistingReservations: number;
  shortfall: number;
  bufferApplied: {
    prepHours: number;
    returnHours: number;
    policyProvenance?: string;
  };
  effectiveWindow?: {
    start: string;
    end: string;
    basis: string;
  };
  sourceCheckTime: string;
  connectionStatus: 'connected' | 'disconnected_snapshot' | 'not_connected' | 'unreachable';
  warehouseRef: string;
}

export interface OccupiedIntervalCalculation {
  start: string;
  end: string;
  prepHoursApplied: number;
  returnHoursApplied: number;
  policyProvenance: 'already_buffered_input' | 'configured_policy' | 'absent_policy_unspecified';
  effectiveWindowBasis: 'occupied_including_buffers' | 'event_dates_only';
}

export interface EquipmentReservationRequest {
  demandId: string;
  expectedDemandVersion: number;
  sourceProduct: ExternalReference;
  warehouseRef: string;
  quantity: number;
  unit?: string;
  purpose?: 'internal_project_use' | 'client_hire' | 'subrental';
  requestedState?: 'tentative_hold' | 'confirmed';
  window: OccupiedWindow;
  availabilityCheckRef?: string;
  approvalRef?: string;
}

export interface IntegrationOperation {
  operationId: string;
  connectionId: string;
  action: string;
  idempotencyKey: string;
  tenantId: string;
  projectId: string;
  payloadHash: string;
  operationState: 'queued' | 'sending' | 'awaiting_confirmation' | 'completed' | 'failed' | 'outcome_unknown' | 'cancelled_before_send' | 'reconciliation_required';
  businessState: 'pending_source_confirmation' | 'confirmed' | 'rejected' | 'draft_created' | 'blocked';
  sourceRecord: Record<string, unknown> | null;
  statusUrl: string;
  createdAt: string;
  updatedAt: string;
  errorDetail?: string;
}

export interface RentalsProductPool {
  poolId: string;
  name: string;
  sku: string;
  category: string;
  depotLocation: string;
  totalServiceableUnits: number;
  quarantinedUnits: number;
}

export interface ExistingRentalsBooking {
  bookingId: string;
  projectId: string;
  poolId: string;
  quantity: number;
  windowStart: string;
  windowEnd: string;
  status: 'confirmed' | 'tentative_hold' | 'in_use';
}

/**
 * Deterministic Contract Test Simulator for E3 Rentals.
 * Explicitly named and segregated from production adapter bindings.
 * Used exclusively for contract verification and isolated sandbox testing.
 */
export class RentalsContractSimulator {
  private static productPools = new Map<string, RentalsProductPool>([
    [
      'prod-counter-reg-01',
      {
        poolId: 'prod-counter-reg-01',
        name: 'Registration Counter - Standard White Oak',
        sku: 'RNT-CTR-001',
        category: 'Counters & Furniture',
        depotLocation: 'Doha Main Depot',
        totalServiceableUnits: 12,
        quarantinedUnits: 0,
      },
    ],
  ]);

  private static bookings: ExistingRentalsBooking[] = [
    {
      bookingId: 'rnt-bkg-proj-b-01',
      projectId: 'EOS-UAT-ISOLATION-RUN01',
      poolId: 'prod-counter-reg-01',
      quantity: 4,
      windowStart: '2026-11-10T00:00:00+03:00',
      windowEnd: '2026-11-20T23:59:59+03:00',
      status: 'confirmed',
    },
  ];

  private static operations = new Map<string, IntegrationOperation>();

  static computePayloadHash(payload: unknown): string {
    const str = JSON.stringify(payload);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `hash_${str.length}_${hash}`;
  }

  static calculateOccupiedInterval(
    window: { start: string; end: string; basis?: 'occupied_including_buffers' | 'event_dates_only'; timeZone?: string },
    bufferPolicy?: { prepHours?: number; returnHours?: number }
  ): OccupiedIntervalCalculation {
    const basis = window.basis || 'occupied_including_buffers';
    let prepHoursApplied = 0;
    let returnHoursApplied = 0;
    let policyProvenance: OccupiedIntervalCalculation['policyProvenance'] = 'configured_policy';

    if (basis === 'occupied_including_buffers') {
      prepHoursApplied = 0;
      returnHoursApplied = 0;
      policyProvenance = 'already_buffered_input';
    } else if (basis === 'event_dates_only') {
      if (bufferPolicy && (bufferPolicy.prepHours !== undefined || bufferPolicy.returnHours !== undefined)) {
        prepHoursApplied = bufferPolicy.prepHours ?? 0;
        returnHoursApplied = bufferPolicy.returnHours ?? 0;
        policyProvenance = 'configured_policy';
      } else {
        prepHoursApplied = 0;
        returnHoursApplied = 0;
        policyProvenance = 'absent_policy_unspecified';
      }
    }

    const startMs = new Date(window.start).getTime() - (prepHoursApplied * 3600000);
    const endMs = new Date(window.end).getTime() + (returnHoursApplied * 3600000);

    const formatWithOffset = (ms: number, origIso: string): string => {
      const match = origIso.match(/([+-]\d{2}:\d{2})$/);
      if (match) {
        const offsetStr = match[1];
        const sign = offsetStr[0] === '+' ? 1 : -1;
        const [h, m] = offsetStr.slice(1).split(':').map(Number);
        const offsetMinutes = sign * (h * 60 + m);
        const localMs = ms + offsetMinutes * 60000;
        const d = new Date(localMs);
        const iso = d.toISOString().replace('Z', '');
        return `${iso}${offsetStr}`;
      }
      return new Date(ms).toISOString();
    };

    return {
      start: formatWithOffset(startMs, window.start),
      end: formatWithOffset(endMs, window.end),
      prepHoursApplied,
      returnHoursApplied,
      policyProvenance,
      effectiveWindowBasis: basis,
    };
  }

  static queryAvailability(query: EquipmentAvailabilityQuery): EquipmentAvailabilityResult {
    const pool = this.productPools.get(query.productPoolId);
    const now = new Date().toISOString();

    if (!pool) {
      return {
        productPoolId: query.productPoolId,
        totalServiceableQuantity: 0,
        occupiedQuantity: 0,
        availableQuantity: 0,
        projectExistingReservations: 0,
        shortfall: query.quantity,
        bufferApplied: { prepHours: 0, returnHours: 0, policyProvenance: 'absent_policy_unspecified' },
        effectiveWindow: {
          start: query.window.start,
          end: query.window.end,
          basis: query.window.basis || 'occupied_including_buffers',
        },
        sourceCheckTime: now,
        connectionStatus: 'unreachable',
        warehouseRef: 'Unknown',
      };
    }

    // Determine buffer application based on caller basis
    // Invariant Section 5 & 8: If window already includes buffers, do not apply buffers twice!
    // No unapproved 24h operational constant: when policy is absent or basis is occupied, apply 0h.
    const interval = this.calculateOccupiedInterval(query.window, query.bufferPolicy);
    const prepHours = interval.prepHoursApplied;
    const returnHours = interval.returnHoursApplied;
    const queryStart = new Date(interval.start).getTime();
    const queryEnd = new Date(interval.end).getTime();

    let occupiedOtherProjects = 0;
    let projectExistingReservations = 0;

    for (const bkg of this.bookings) {
      if (bkg.poolId === query.productPoolId && bkg.status === 'confirmed') {
        const bkgStart = new Date(bkg.windowStart).getTime();
        const bkgEnd = new Date(bkg.windowEnd).getTime();
        // Check temporal overlap
        if (queryStart <= bkgEnd && queryEnd >= bkgStart) {
          if (query.projectScopeId && bkg.projectId === query.projectScopeId) {
            projectExistingReservations += bkg.quantity;
          } else {
            occupiedOtherProjects += bkg.quantity;
          }
        }
      }
    }

    // Invariant Section 5 & 6:
    // availableQuantity = available capacity for *new* demand
    // projectExistingReservations = units already held by this project
    const available = Math.max(0, pool.totalServiceableUnits - occupiedOtherProjects - projectExistingReservations);
    const totalCoveredOrAvailable = available + projectExistingReservations;
    const shortfall = Math.max(0, query.quantity - totalCoveredOrAvailable);

    return {
      productPoolId: pool.poolId,
      totalServiceableQuantity: pool.totalServiceableUnits,
      occupiedQuantity: occupiedOtherProjects,
      availableQuantity: available,
      projectExistingReservations,
      shortfall,
      bufferApplied: { prepHours, returnHours, policyProvenance: interval.policyProvenance },
      effectiveWindow: {
        start: interval.start,
        end: interval.end,
        basis: interval.effectiveWindowBasis,
      },
      sourceCheckTime: now,
      connectionStatus: 'connected',
      warehouseRef: pool.depotLocation,
    };
  }

  static submitReservationCommand(
    projectId: string,
    tenantId: string,
    idempotencyKey: string,
    request: EquipmentReservationRequest
  ): { status: 'accepted' | 'conflict'; operation: IntegrationOperation } {
    const payloadHash = this.computePayloadHash(request);

    // Check existing idempotency key
    for (const existingOp of this.operations.values()) {
      if (existingOp.idempotencyKey === idempotencyKey) {
        if (existingOp.payloadHash !== payloadHash) {
          return {
            status: 'conflict',
            operation: existingOp,
          };
        }
        return {
          status: 'accepted',
          operation: existingOp,
        };
      }
    }

    const operationId = `op-rnt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const avail = this.queryAvailability({
      connectionId: request.sourceProduct.connectionId,
      productPoolId: request.sourceProduct.externalId,
      quantity: request.quantity,
      unit: request.unit || 'each',
      window: request.window,
      projectScopeId: projectId,
    });

    if (avail.availableQuantity < request.quantity) {
      const op: IntegrationOperation = {
        operationId,
        connectionId: request.sourceProduct.connectionId,
        action: 'equipment_reservation',
        idempotencyKey,
        tenantId,
        projectId,
        payloadHash,
        operationState: 'completed',
        businessState: 'rejected',
        sourceRecord: {
          requested: request.quantity,
          available: avail.availableQuantity,
          shortfall: request.quantity - avail.availableQuantity,
        },
        statusUrl: `/api/v1/integration-operations/${operationId}`,
        createdAt: now,
        updatedAt: now,
        errorDetail: `CAPACITY_EXCEEDED: Requested ${request.quantity} units but only ${avail.availableQuantity} available for new booking.`,
      };
      this.operations.set(operationId, op);
      return { status: 'accepted', operation: op };
    }

    // Create reservation in simulator
    const newBookingId = `bkg-rnt-${Date.now()}`;
    this.bookings.push({
      bookingId: newBookingId,
      projectId,
      poolId: request.sourceProduct.externalId,
      quantity: request.quantity,
      windowStart: request.window.start,
      windowEnd: request.window.end,
      status: request.requestedState === 'confirmed' ? 'confirmed' : 'tentative_hold',
    });

    const op: IntegrationOperation = {
      operationId,
      connectionId: request.sourceProduct.connectionId,
      action: 'equipment_reservation',
      idempotencyKey,
      tenantId,
      projectId,
      payloadHash,
      operationState: 'completed',
      businessState: 'confirmed',
      sourceRecord: {
        bookingId: newBookingId,
        quantity: request.quantity,
        purpose: request.purpose || 'internal_project_use',
        confirmedAt: now,
        invoiceSuppressed: request.purpose === 'internal_project_use',
      },
      statusUrl: `/api/v1/integration-operations/${operationId}`,
      createdAt: now,
      updatedAt: now,
    };
    this.operations.set(operationId, op);
    return { status: 'accepted', operation: op };
  }

  static getOperation(operationId: string): IntegrationOperation | undefined {
    return this.operations.get(operationId);
  }

  static resetForTesting(): void {
    this.bookings = [
      {
        bookingId: 'rnt-bkg-proj-b-01',
        projectId: 'EOS-UAT-ISOLATION-RUN01',
        poolId: 'prod-counter-reg-01',
        quantity: 4,
        windowStart: '2026-11-10T00:00:00+03:00',
        windowEnd: '2026-11-20T23:59:59+03:00',
        status: 'confirmed',
      },
    ];
    this.operations.clear();
  }
}

/**
 * Production EOS Adapter for E3 Rentals.
 * Enforces authoritative source-system boundaries, explicit disconnected/snapshot states,
 * and delegates to RentalsContractSimulator only when connection mode is explicitly 'sandbox'.
 */
export class RentalsAdapterEngine {
  static calculateOccupiedInterval(
    window: { start: string; end: string; basis?: 'occupied_including_buffers' | 'event_dates_only'; timeZone?: string },
    bufferPolicy?: { prepHours?: number; returnHours?: number }
  ): OccupiedIntervalCalculation {
    return RentalsContractSimulator.calculateOccupiedInterval(window, bufferPolicy);
  }

  /**
   * Queries equipment availability.
   * Conforms to Section 3 & 4: In disconnected mode, returns honest not_connected or snapshot state.
   */
  static queryAvailability(
    query: EquipmentAvailabilityQuery,
    connectionMode: 'disabled' | 'sandbox' | 'production_read_only' | 'production_full' = 'disabled'
  ): EquipmentAvailabilityResult {
    const now = new Date().toISOString();

    if (connectionMode === 'disabled') {
      return {
        productPoolId: query.productPoolId,
        totalServiceableQuantity: 0,
        occupiedQuantity: 0,
        availableQuantity: 0,
        projectExistingReservations: 0,
        shortfall: query.quantity,
        bufferApplied: { prepHours: 0, returnHours: 0, policyProvenance: 'disconnected_mode' },
        effectiveWindow: {
          start: query.window.start,
          end: query.window.end,
          basis: query.window.basis || 'occupied_including_buffers',
        },
        sourceCheckTime: now,
        connectionStatus: 'not_connected',
        warehouseRef: 'Unknown (Rentals Disconnected)',
      };
    }

    if (connectionMode === 'sandbox') {
      return RentalsContractSimulator.queryAvailability(query);
    }

    // Production live mode (deferred in this phase)
    return {
      productPoolId: query.productPoolId,
      totalServiceableQuantity: 0,
      occupiedQuantity: 0,
      availableQuantity: 0,
      projectExistingReservations: 0,
      shortfall: query.quantity,
      bufferApplied: { prepHours: 0, returnHours: 0 },
      sourceCheckTime: now,
      connectionStatus: 'unreachable',
      warehouseRef: 'Live Connection Deferred',
    };
  }

  /**
   * Submits an equipment reservation command.
   * Enforces Section 3 & 4: Rejects firm mutations when connector is disabled or read-only.
   */
  static submitReservationCommand(
    projectId: string,
    tenantId: string,
    idempotencyKey: string,
    request: EquipmentReservationRequest,
    connectionMode: 'disabled' | 'sandbox' | 'production_read_only' | 'production_full' = 'disabled'
  ): { status: 'accepted' | 'conflict'; operation: IntegrationOperation } {
    const now = new Date().toISOString();
    const payloadHash = RentalsContractSimulator.computePayloadHash(request);

    if (connectionMode === 'disabled') {
      const operationId = `op-rnt-rejected-${Date.now()}`;
      return {
        status: 'accepted',
        operation: {
          operationId,
          connectionId: request.sourceProduct.connectionId,
          action: 'equipment_reservation',
          idempotencyKey,
          tenantId,
          projectId,
          payloadHash,
          operationState: 'failed',
          businessState: 'rejected',
          sourceRecord: null,
          statusUrl: `/api/v1/integration-operations/${operationId}`,
          createdAt: now,
          updatedAt: now,
          errorDetail: 'CONNECTOR_DISABLED: E3 Rentals connector is disabled in Central Settings. Live stock mutations and firm external reservations are prohibited during the disconnected phase.',
        },
      };
    }

    if (connectionMode === 'production_read_only') {
      const operationId = `op-rnt-ro-${Date.now()}`;
      return {
        status: 'accepted',
        operation: {
          operationId,
          connectionId: request.sourceProduct.connectionId,
          action: 'equipment_reservation',
          idempotencyKey,
          tenantId,
          projectId,
          payloadHash,
          operationState: 'failed',
          businessState: 'rejected',
          sourceRecord: null,
          statusUrl: `/api/v1/integration-operations/${operationId}`,
          createdAt: now,
          updatedAt: now,
          errorDetail: 'READ_ONLY_MODE: E3 Rentals connector is configured in production read-only mode. Live reservation mutations are blocked.',
        },
      };
    }

    if (connectionMode === 'sandbox') {
      return RentalsContractSimulator.submitReservationCommand(
        projectId,
        tenantId,
        idempotencyKey,
        request
      );
    }

    // Production live mode deferred
    const operationId = `op-rnt-deferred-${Date.now()}`;
    return {
      status: 'accepted',
      operation: {
        operationId,
        connectionId: request.sourceProduct.connectionId,
        action: 'equipment_reservation',
        idempotencyKey,
        tenantId,
        projectId,
        payloadHash,
        operationState: 'failed',
        businessState: 'rejected',
        sourceRecord: null,
        statusUrl: `/api/v1/integration-operations/${operationId}`,
        createdAt: now,
        updatedAt: now,
        errorDetail: 'PRODUCTION_CONNECTION_DEFERRED: Live E3 Rentals machine integration is deferred until EOS core validation is complete.',
      },
    };
  }

  static computePayloadHash(payload: unknown): string {
    return RentalsContractSimulator.computePayloadHash(payload);
  }

  static getOperation(operationId: string): IntegrationOperation | undefined {
    return RentalsContractSimulator.getOperation(operationId);
  }

  static resetForTesting(): void {
    RentalsContractSimulator.resetForTesting();
  }
}
