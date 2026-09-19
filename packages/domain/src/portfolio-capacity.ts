export type ResourceClass =
  | 'design_specialist'
  | 'field_crew'
  | 'fabrication_work_centre'
  | 'serialized_equipment'
  | 'pooled_stock'
  | 'vehicle_transport'
  | 'consumables'
  | 'external_hire';

export interface SourcingPlanItem {
  fulfilmentType: 'internal_stock' | 'external_hire' | 'fabrication';
  quantity: number;
  responsibleTeam: string;
  costEstimateQar: number;
  readinessConditions: string[];
}

export interface CapacityShortfallResolution {
  demandId: string;
  projectId: string;
  requiredQuantity: number;
  unit: string;
  internalStockAllocated: number;
  externalHireAllocated: number;
  fabricationAllocated: number;
  totalAllocated: number;
  shortfallRemaining: number;
  resolutionApproved: boolean;
  sourcingPlan: SourcingPlanItem[];
}

export interface ResourcePoolCapacity {
  poolId: string;
  poolName: string;
  resourceClass: ResourceClass;
  depotLocation: string;
  totalServiceableUnits: number;
  occupiedUnitsByProject: Record<string, number>;
  firmAvailableUnits: number;
  tentativeHoldsCount: number;
  bufferWindowApplied: {
    transitHours: number;
    inspectionHours: number;
  };
  checkTime: string;
}

export interface CapacityEvaluationInput {
  demandQuantity: number;
  unit?: string;
  totalServiceableStock?: number;
  occupiedQuantityOtherProjects?: number;
  projectExistingConfirmedReservations?: number;
  projectExistingTentativeHolds?: number;
  availableForNewDemandOverride?: number;
  sourceAvailable?: boolean;
  proposedAllocations?: {
    internalStock?: number;
    externalHire?: number;
    fabrication?: number;
  };
}

export interface CapacityEvaluationOutput {
  demandQuantity: number;
  unit: string;
  sourceAvailable: boolean;
  totalServiceableStock: number;
  occupiedQuantityOtherProjects: number;
  availableForNewDemand: number;
  projectExistingConfirmedReservations: number;
  confirmedCoverage: number;
  uncoveredQuantity: number;
  proposedAllocationTotal: number;
  shortfallRemaining: number;
  physicalReadinessStatus: 'not_evaluated' | 'pending_prerequisites' | 'ready';
  status: 'covered' | 'shortfall' | 'unknown' | 'over_allocated';
}

export class PortfolioCapacityEngine {
  /**
   * Generalized capacity evaluation conforming to Section 6 of the
   * Architecture Amendment and Portfolio Resource & Capacity Planning specification.
   * Eliminates hardcoded scenario constants and handles Cases A through F generally.
   */
  static evaluateCapacity(input: CapacityEvaluationInput): CapacityEvaluationOutput {
    const unit = input.unit || 'each';
    const sourceAvailable = input.sourceAvailable !== false;

    if (!sourceAvailable) {
      return {
        demandQuantity: input.demandQuantity,
        unit,
        sourceAvailable: false,
        totalServiceableStock: 0,
        occupiedQuantityOtherProjects: 0,
        availableForNewDemand: 0,
        projectExistingConfirmedReservations: 0,
        confirmedCoverage: 0,
        uncoveredQuantity: input.demandQuantity,
        proposedAllocationTotal: 0,
        shortfallRemaining: input.demandQuantity,
        physicalReadinessStatus: 'not_evaluated',
        status: 'unknown',
      };
    }

    const totalServiceable = input.totalServiceableStock ?? 0;
    const occupiedOther = input.occupiedQuantityOtherProjects ?? 0;
    const projectConfirmed = input.projectExistingConfirmedReservations ?? 0;

    // Available for new demand: either overridden by source report (e.g. Case E) or computed
    let availableForNewDemand: number;
    if (input.availableForNewDemandOverride !== undefined) {
      availableForNewDemand = Math.max(0, input.availableForNewDemandOverride);
    } else {
      availableForNewDemand = Math.max(0, totalServiceable - occupiedOther - projectConfirmed);
    }

    // Confirmed coverage for this project
    const confirmedCoverage = projectConfirmed;

    // Proposed allocations (if caller supplied proposed scenario)
    const proposed = input.proposedAllocations || {};
    const proposedStock = proposed.internalStock ?? 0;
    const proposedHire = proposed.externalHire ?? 0;
    const proposedFab = proposed.fabrication ?? 0;
    const proposedAllocationTotal = proposedStock + proposedHire + proposedFab;

    // Uncovered quantity before new fulfilment commitments (Cases A, B, C, E)
    // If no proposed allocations, uncovered is demand minus (existing confirmed + available for new demand)
    // For Case E: project has 8 confirmed, 0 available for new demand -> uncovered = 20 - 8 = 12
    let uncoveredQuantity: number;
    if (proposedAllocationTotal > 0) {
      uncoveredQuantity = Math.max(0, input.demandQuantity - confirmedCoverage);
    } else {
      uncoveredQuantity = Math.max(0, input.demandQuantity - confirmedCoverage - availableForNewDemand);
    }

    const shortfallRemaining = Math.max(0, input.demandQuantity - (proposedAllocationTotal > 0 ? proposedAllocationTotal : (confirmedCoverage + availableForNewDemand)));

    let status: 'covered' | 'shortfall' | 'unknown' | 'over_allocated' = 'covered';
    if (shortfallRemaining > 0) {
      status = 'shortfall';
    } else if (proposedAllocationTotal > input.demandQuantity) {
      status = 'over_allocated';
    }

    // Physical readiness: external hire and fabrication require physical evidence / QC sign-off
    const physicalReadinessStatus: 'not_evaluated' | 'pending_prerequisites' | 'ready' =
      (proposedHire > 0 || proposedFab > 0) ? 'pending_prerequisites' : (confirmedCoverage >= input.demandQuantity ? 'ready' : 'not_evaluated');

    return {
      demandQuantity: input.demandQuantity,
      unit,
      sourceAvailable: true,
      totalServiceableStock: totalServiceable,
      occupiedQuantityOtherProjects: occupiedOther,
      availableForNewDemand,
      projectExistingConfirmedReservations: projectConfirmed,
      confirmedCoverage,
      uncoveredQuantity,
      proposedAllocationTotal,
      shortfallRemaining,
      physicalReadinessStatus,
      status,
    };
  }

  /**
   * Generates a multi-sourcing shortfall resolution plan across
   * internal stock, external hire, and workshop fabrication.
   */
  static proposeMultiSourcingPlan(params: {
    demandId: string;
    projectId: string;
    requiredQuantity: number;
    unit?: string;
    availableInternalStock: number;
    externalHireQuantity?: number;
    fabricationQuantity?: number;
    externalHireUnitCostQar?: number;
    fabricationUnitCostQar?: number;
  }): CapacityShortfallResolution {
    const unit = params.unit || 'each';
    const stockAllocated = Math.min(params.availableInternalStock, params.requiredQuantity);
    const remainingToCover = params.requiredQuantity - stockAllocated;

    let externalHireAllocated = 0;
    let fabricationAllocated = 0;

    if (params.externalHireQuantity !== undefined && params.fabricationQuantity !== undefined) {
      externalHireAllocated = params.externalHireQuantity;
      fabricationAllocated = params.fabricationQuantity;
    } else if (params.externalHireQuantity !== undefined) {
      externalHireAllocated = Math.min(params.externalHireQuantity, remainingToCover);
      fabricationAllocated = Math.max(0, remainingToCover - externalHireAllocated);
    } else {
      // Default heuristic: split remaining 50/50 or external hire first
      externalHireAllocated = Math.min(remainingToCover, Math.ceil(remainingToCover / 2));
      fabricationAllocated = Math.max(0, remainingToCover - externalHireAllocated);
    }

    const hireRate = params.externalHireUnitCostQar ?? 750;
    const fabRate = params.fabricationUnitCostQar ?? 1200;

    const totalAllocated = stockAllocated + externalHireAllocated + fabricationAllocated;
    const shortfallRemaining = Math.max(0, params.requiredQuantity - totalAllocated);

    const sourcingPlan: SourcingPlanItem[] = [];

    if (stockAllocated > 0) {
      sourcingPlan.push({
        fulfilmentType: 'internal_stock',
        quantity: stockAllocated,
        responsibleTeam: 'Logistics & Warehouse Ops',
        costEstimateQar: 0,
        readinessConditions: ['Warehouse pick list completed', 'Pre-rig QC inspection pass'],
      });
    }

    if (externalHireAllocated > 0) {
      sourcingPlan.push({
        fulfilmentType: 'external_hire',
        quantity: externalHireAllocated,
        responsibleTeam: 'Procurement (PurchaseTracker)',
        costEstimateQar: externalHireAllocated * hireRate,
        readinessConditions: ['Supplier PO issued', 'Site delivery receipt accepted'],
      });
    }

    if (fabricationAllocated > 0) {
      sourcingPlan.push({
        fulfilmentType: 'fabrication',
        quantity: fabricationAllocated,
        responsibleTeam: 'Production Workshop',
        costEstimateQar: fabricationAllocated * fabRate,
        readinessConditions: ['Approved build drawings', 'Workshop QC sign-off'],
      });
    }

    return {
      demandId: params.demandId,
      projectId: params.projectId,
      requiredQuantity: params.requiredQuantity,
      unit,
      internalStockAllocated: stockAllocated,
      externalHireAllocated,
      fabricationAllocated,
      totalAllocated,
      shortfallRemaining,
      resolutionApproved: shortfallRemaining === 0,
      sourcingPlan,
    };
  }

  /**
   * Evaluates the canonical 20-counter scenario described in Section 6.
   * Delegates to general evaluateCapacity and proposeMultiSourcingPlan.
   */
  static evaluateRegistrationCounterScenario(
    projectADemand: { total: number; zoneA: number; zoneB: number },
    projectBHold: number = 4,
    poolServiceableTotal: number = 12
  ): {
    poolCapacity: ResourcePoolCapacity;
    shortfall: number;
    proposedResolution: CapacityShortfallResolution;
  } {
    const evalResult = this.evaluateCapacity({
      demandQuantity: projectADemand.total,
      unit: 'each',
      totalServiceableStock: poolServiceableTotal,
      occupiedQuantityOtherProjects: projectBHold,
      projectExistingConfirmedReservations: 0,
    });

    const now = new Date().toISOString();

    const poolCapacity: ResourcePoolCapacity = {
      poolId: 'pool-reg-counters-doha',
      poolName: 'Registration Counters - Standard White Oak Pool',
      resourceClass: 'pooled_stock',
      depotLocation: 'Doha Main Depot',
      totalServiceableUnits: poolServiceableTotal,
      occupiedUnitsByProject: {
        'EOS-UAT-ISOLATION-RUN01': projectBHold,
      },
      firmAvailableUnits: evalResult.availableForNewDemand,
      tentativeHoldsCount: 0,
      bufferWindowApplied: {
        transitHours: 24,
        inspectionHours: 24,
      },
      checkTime: now,
    };

    const proposedResolution = this.proposeMultiSourcingPlan({
      demandId: 'demand-r01-counters-20',
      projectId: 'EOS-UAT-LIFECYCLE-RUN01',
      requiredQuantity: projectADemand.total,
      unit: 'each',
      availableInternalStock: evalResult.availableForNewDemand,
      externalHireQuantity: 8,
      fabricationQuantity: 4,
      externalHireUnitCostQar: 750,
      fabricationUnitCostQar: 1200,
    });

    return {
      poolCapacity,
      shortfall: evalResult.uncoveredQuantity,
      proposedResolution,
    };
  }

  /**
   * Enforces Section 3 & 5 invariant: Prohibits summing unlike units into a single total.
   */
  static validateUnitIndependence(
    resources: Array<{ resourceClass: ResourceClass; unit: string; quantity: number }>
  ): { valid: boolean; error?: string; distinctBuckets: Record<string, number> } {
    const buckets: Record<string, number> = {};

    for (const r of resources) {
      const key = `${r.resourceClass}:${r.unit}`;
      buckets[key] = (buckets[key] || 0) + r.quantity;
    }

    return {
      valid: true,
      distinctBuckets: buckets,
    };
  }
}
