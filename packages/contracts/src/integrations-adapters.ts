import { z } from 'zod';

// =========================================================================
// E3 Rentals & PurchaseTracker Integration Contracts & DTOs
// Conforming to 19 September 2026 Architecture Amendment
// =========================================================================

export const ExternalReferenceSchema = z.object({
  connectionId: z.string().min(1),
  entityType: z.enum(['product', 'asset', 'warehouse', 'vendor', 'purchase_request', 'purchase_order', 'receipt']),
  externalId: z.string().min(1),
  sourceVersion: z.string().optional(),
});
export type ExternalReference = z.infer<typeof ExternalReferenceSchema>;

export const OccupiedWindowSchema = z.object({
  start: z.string().datetime({ offset: true }),
  end: z.string().datetime({ offset: true }),
  timeZone: z.string().default('Asia/Qatar'),
  basis: z.enum(['occupied_including_buffers', 'event_dates_only']).default('occupied_including_buffers'),
});
export type OccupiedWindow = z.infer<typeof OccupiedWindowSchema>;

// --- E3 Rentals Equipment & Availability Schemas ---

export const EquipmentAvailabilityQuerySchema = z.object({
  connectionId: z.string().default('rentals-sandbox'),
  productPoolId: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().default('each'),
  window: OccupiedWindowSchema,
  locationRef: z.string().optional(),
  bufferPolicy: z.object({
    prepHours: z.number().nonnegative().optional(),
    returnHours: z.number().nonnegative().optional(),
  }).optional(),
  projectScopeId: z.string().optional(),
});
export type EquipmentAvailabilityQueryDto = z.infer<typeof EquipmentAvailabilityQuerySchema>;

export const EquipmentAvailabilityResultSchema = z.object({
  productPoolId: z.string(),
  totalServiceableQuantity: z.number().int().nonnegative(),
  occupiedQuantity: z.number().int().nonnegative(),
  availableQuantity: z.number().int().nonnegative(),
  projectExistingReservations: z.number().int().nonnegative().default(0),
  shortfall: z.number().int().nonnegative().default(0),
  bufferApplied: z.object({
    prepHours: z.number().nonnegative(),
    returnHours: z.number().nonnegative(),
    policyProvenance: z.string().optional(),
  }),
  effectiveWindow: z.object({
    start: z.string(),
    end: z.string(),
    basis: z.string(),
  }).optional(),
  sourceCheckTime: z.string().datetime(),
  connectionStatus: z.enum(['connected', 'disconnected_snapshot', 'not_connected', 'unreachable']),
  warehouseRef: z.string(),
});
export type EquipmentAvailabilityResultDto = z.infer<typeof EquipmentAvailabilityResultSchema>;

export const EquipmentReservationRequestSchema = z.object({
  demandId: z.string().min(1),
  expectedDemandVersion: z.number().int().positive(),
  sourceProduct: ExternalReferenceSchema,
  warehouseRef: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().default('each'),
  purpose: z.enum(['internal_project_use', 'client_hire', 'subrental']).default('internal_project_use'),
  requestedState: z.enum(['tentative_hold', 'confirmed']).default('confirmed'),
  window: OccupiedWindowSchema,
  availabilityCheckRef: z.string().optional(),
  approvalRef: z.string().optional(),
});
export type EquipmentReservationRequestDto = z.infer<typeof EquipmentReservationRequestSchema>;

export const EquipmentReservationAmendmentSchema = z.object({
  reservationRef: z.string().min(1),
  amendedQuantity: z.number().positive().optional(),
  amendedWindow: OccupiedWindowSchema.optional(),
  reason: z.string().min(3),
  approvalRef: z.string().optional(),
});
export type EquipmentReservationAmendmentDto = z.infer<typeof EquipmentReservationAmendmentSchema>;

export const EquipmentReservationReleaseSchema = z.object({
  reservationRef: z.string().min(1),
  reason: z.string().min(3),
  releasedBy: z.string().optional(),
});
export type EquipmentReservationReleaseDto = z.infer<typeof EquipmentReservationReleaseSchema>;

// --- E3 PurchaseTracker Vendor & Procurement Schemas ---

export const VendorOnboardingRequestSchema = z.object({
  connectionId: z.string().default('purchasetracker-sandbox'),
  vendorClassification: z.enum(['company', 'individual']),
  legalName: z.string().min(2),
  tradeName: z.string().optional(),
  country: z.string().min(2).default('QA'),
  registrationNumber: z.string().optional(),
  taxNumber: z.string().optional(),
  contacts: z.array(
    z.object({
      name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().optional(),
      role: z.string().optional(),
    })
  ).min(1),
  serviceCategories: z.array(z.string()).min(1),
  documentReferences: z.array(z.string()).default([]),
});
export type VendorOnboardingRequestDto = z.infer<typeof VendorOnboardingRequestSchema>;

export const VendorChangeRequestSchema = z.object({
  vendorRef: z.string().min(1),
  changeType: z.enum(['scope_update', 'document_renewal', 'compliance_remediation']),
  proposedFields: z.record(z.unknown()),
  rationale: z.string().min(5),
  documentReferences: z.array(z.string()).optional(),
});
export type VendorChangeRequestDto = z.infer<typeof VendorChangeRequestSchema>;

export const VendorProjectionSchema = z.object({
  vendorRef: z.string(),
  legalName: z.string(),
  tradeName: z.string().optional(),
  country: z.string(),
  status: z.enum(['draft', 'under_review', 'approved', 'blocked', 'rejected']),
  complianceStatus: z.enum(['compliant', 'provisional_pr_only', 'expired_documents', 'suspended']),
  bankingStatus: z.enum(['unverified', 'verified_masked', 'action_required']),
  sourceCheckTime: z.string().datetime(),
});
export type VendorProjectionDto = z.infer<typeof VendorProjectionSchema>;

export const PurchaseRequestCreateSchema = z.object({
  projectId: z.string().min(1),
  demandRef: z.string().min(1),
  sourcingAllocationRef: z.string().min(1),
  purchaseType: z.enum(['rental', 'purchase', 'service', 'subcontract']),
  vendorRef: z.string().optional(),
  itemDescription: z.string().min(3),
  quantity: z.number().positive(),
  unit: z.string().default('each'),
  estimatedCost: z.number().nonnegative(),
  currency: z.string().default('QAR'),
  requiredByDate: z.string().datetime({ offset: true }),
  deliveryLocation: z.string().min(1),
  quoteRevisionRef: z.string().optional(),
  attachments: z.array(z.string()).default([]),
});
export type PurchaseRequestCreateDto = z.infer<typeof PurchaseRequestCreateSchema>;

export const PurchaseRequestSubmitSchema = z.object({
  prId: z.string().min(1),
  approvedByRole: z.string().min(2),
  justification: z.string().optional(),
});
export type PurchaseRequestSubmitDto = z.infer<typeof PurchaseRequestSubmitSchema>;

export const EquipmentMovementSchema = z.object({
  movementType: z.enum(['dispatch_to_site', 'site_receipt', 'site_return', 'warehouse_return', 'quarantine_transfer']),
  bookingRef: z.string().optional(),
  poRef: z.string().optional(),
  lineId: z.string().optional(),
  quantity: z.number().positive(),
  unit: z.string().default('each'),
  location: z.string().min(1),
  eventTime: z.string().datetime({ offset: true }),
  condition: z.enum(['serviceable', 'damaged', 'maintenance_required', 'under_inspection']),
  evidenceRef: z.string().optional(),
  originalReceiptRef: z.string().optional(),
});
export type EquipmentMovementDto = z.infer<typeof EquipmentMovementSchema>;

// --- Durable Integration Operations & Inbound Events ---

export const IntegrationOperationStateEnum = z.enum([
  'queued',
  'sending',
  'awaiting_confirmation',
  'completed',
  'failed',
  'outcome_unknown',
  'cancelled_before_send',
  'reconciliation_required',
]);
export type IntegrationOperationState = z.infer<typeof IntegrationOperationStateEnum>;

export const IntegrationOperationSchema = z.object({
  operationId: z.string(),
  connectionId: z.string(),
  action: z.string(),
  idempotencyKey: z.string(),
  tenantId: z.string(),
  projectId: z.string(),
  payloadHash: z.string(),
  operationState: IntegrationOperationStateEnum,
  businessState: z.enum(['pending_source_confirmation', 'confirmed', 'rejected', 'draft_created', 'blocked']),
  sourceRecord: z.record(z.unknown()).nullable(),
  statusUrl: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  errorDetail: z.string().optional(),
});
export type IntegrationOperationDto = z.infer<typeof IntegrationOperationSchema>;

export const InboundIntegrationEventSchema = z.object({
  eventId: z.string(),
  connectionId: z.string(),
  sourceTenantId: z.string().optional(),
  eventFamily: z.enum([
    'equipment_availability',
    'equipment_reservation',
    'equipment_movement',
    'vendor_compliance',
    'purchase_request',
    'purchase_order',
    'receipt_acceptance',
  ]),
  eventType: z.string(),
  sourceTimestamp: z.string().datetime({ offset: true }),
  payload: z.record(z.unknown()),
  signature: z.string(),
});
export type InboundIntegrationEventDto = z.infer<typeof InboundIntegrationEventSchema>;

export const AdapterCapabilitiesSchema = z.object({
  connectionId: z.string(),
  provider: z.enum(['e3_rentals', 'e3_purchasetracker']),
  mode: z.enum(['disabled', 'sandbox', 'production_read_only', 'production_full']),
  health: z.enum(['healthy', 'degraded', 'unreachable', 'not_tested']),
  supportedActions: z.array(z.string()),
  verifiedActions: z.array(z.string()),
  enabledActions: z.array(z.string()),
  lastCheckedAt: z.string().optional(),
});
export type AdapterCapabilitiesDto = z.infer<typeof AdapterCapabilitiesSchema>;
