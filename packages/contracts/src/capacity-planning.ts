import { z } from 'zod';

// =========================================================================
// Portfolio Resource & Capacity Planning Contracts & DTOs
// Conforming to E3 EOS Portfolio Resource and Capacity Planning Brief
// =========================================================================

export const ResourcePlanningStateEnum = z.enum([
  'forecast_demand',
  'tentative_hold',
  'pending_decision',
  'confirmed_reservation',
  'in_use',
  'return_inspection_pending',
  'released_cancelled',
]);
export type ResourcePlanningState = z.infer<typeof ResourcePlanningStateEnum>;

export const ResourceClassEnum = z.enum([
  'design_specialist',
  'field_crew',
  'fabrication_work_centre',
  'serialized_equipment',
  'pooled_stock',
  'vehicle_transport',
  'consumables',
  'external_hire',
]);
export type ResourceClass = z.infer<typeof ResourceClassEnum>;

export const CapacityBasisEnum = z.enum([
  'hours_per_person',
  'dated_shifts_and_hours',
  'work_hours_by_routing_step',
  'individual_units_over_time',
  'quantity_in_unit_over_time',
  'vehicle_windows_and_payload',
  'stock_quantity_replenishment',
  'confirmed_quantity_lead_time',
]);
export type CapacityBasis = z.infer<typeof CapacityBasisEnum>;

export const PortfolioCapacityQuerySchema = z.object({
  resourceClass: ResourceClassEnum,
  resourcePoolId: z.string().min(1),
  window: z.object({
    start: z.string().datetime({ offset: true }),
    end: z.string().datetime({ offset: true }),
    timeZone: z.string().default('Asia/Qatar'),
  }),
  includeTentative: z.boolean().default(false),
  projectScopeId: z.string().optional(),
});
export type PortfolioCapacityQueryDto = z.infer<typeof PortfolioCapacityQuerySchema>;

export const CapacityShortfallResolutionSchema = z.object({
  demandId: z.string().min(1),
  projectId: z.string().min(1),
  requiredQuantity: z.number().positive(),
  unit: z.string().default('each'),
  internalStockAllocated: z.number().nonnegative(),
  externalHireAllocated: z.number().nonnegative(),
  fabricationAllocated: z.number().nonnegative(),
  totalAllocated: z.number().positive(),
  shortfallRemaining: z.number().nonnegative(),
  resolutionApproved: z.boolean(),
  sourcingPlan: z.array(
    z.object({
      fulfilmentType: z.enum(['internal_stock', 'external_hire', 'fabrication']),
      quantity: z.number().positive(),
      responsibleTeam: z.string(),
      costEstimateQar: z.number().nonnegative(),
      readinessConditions: z.array(z.string()),
    })
  ),
});
export type CapacityShortfallResolutionDto = z.infer<typeof CapacityShortfallResolutionSchema>;

export const ResourcePoolCapacitySchema = z.object({
  poolId: z.string(),
  poolName: z.string(),
  resourceClass: ResourceClassEnum,
  depotLocation: z.string(),
  totalServiceableUnits: z.number().int().nonnegative(),
  occupiedUnitsByProject: z.record(z.number().int().nonnegative()),
  firmAvailableUnits: z.number().int().nonnegative(),
  tentativeHoldsCount: z.number().int().nonnegative().default(0),
  bufferWindowApplied: z.object({
    transitHours: z.number().nonnegative(),
    inspectionHours: z.number().nonnegative(),
  }),
  checkTime: z.string().datetime(),
});
export type ResourcePoolCapacityDto = z.infer<typeof ResourcePoolCapacitySchema>;
