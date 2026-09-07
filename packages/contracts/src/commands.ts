import { z } from 'zod';

export const ProjectCreateSchema = z.object({
  intakeMode: z.enum(['draft', 'complete']).default('draft'),
  projectCode: z.string().min(2).max(50).optional(),
  title: z.string().min(3).max(250),
  description: z.string().min(5),
  originCode: z.string().min(2).max(50),
  ownerId: z.string().uuid(),
  clientOrganisationId: z.string().uuid().optional(),
  programmeId: z.string().uuid().optional(),
  templateId: z.string().optional(),
  classification: z
    .object({
      route: z.enum(['tender', 'direct_award', 'call_off', 'internal_idea']).default('internal_idea'),
      format: z.string().optional(),
      commercialModel: z.string().optional(),
    })
    .optional(),
  financialAssumptions: z
    .object({
      currency: z.string().default('QAR'),
      expectedRevenueMin: z.string().optional(),
      expectedRevenueMax: z.string().optional(),
      estimatedCost: z.string().optional(),
    })
    .optional(),
  dateRegister: z
    .object({
      submissionDeadline: z.string().optional(),
      eventStart: z.string().optional(),
      eventEnd: z.string().optional(),
    })
    .optional(),
});

export type ProjectCreateDto = z.infer<typeof ProjectCreateSchema>;

export const ProjectCloneSchema = z.object({
  newProjectCode: z.string().min(2).max(50),
  newTitle: z.string().min(3).max(250).optional(),
});

export type ProjectCloneDto = z.infer<typeof ProjectCloneSchema>;

export const RequirementCreateSchema = z.object({
  title: z.string().min(3).max(250),
  description: z.string().min(5),
  sourceReference: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  deliverablePackageId: z.string().uuid().optional(),
});

export type RequirementCreateDto = z.infer<typeof RequirementCreateSchema>;

export const RequirementDispositionSchema = z.object({
  disposition: z.enum([
    'applicability_unknown',
    'applicable_open',
    'satisfied',
    'exception_authorised',
    'not_applicable',
    'formally_amended',
    'superseded',
  ]),
  rationale: z.string().min(3),
  authorityDecisionId: z.string().uuid().optional(),
});

export type RequirementDispositionDto = z.infer<typeof RequirementDispositionSchema>;

export const ClarificationCreateSchema = z.object({
  question: z.string().min(5),
  source: z.string().min(2),
  dueAt: z.string(),
});

export type ClarificationCreateDto = z.infer<typeof ClarificationCreateSchema>;

export const ClarificationRespondSchema = z.object({
  response: z.string().min(3),
});

export type ClarificationRespondDto = z.infer<typeof ClarificationRespondSchema>;

export const RiskCreateSchema = z.object({
  description: z.string().min(5),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  likelihood: z.enum(['low', 'medium', 'high']),
  mitigation: z.string().optional(),
  ownerId: z.string().uuid().optional(),
});

export type RiskCreateDto = z.infer<typeof RiskCreateSchema>;

export const QualificationDecisionSchema = z.object({
  decision: z.enum(['pursue', 'pause', 'no_go']),
  rationale: z.string().min(5),
});

export type QualificationDecisionDto = z.infer<typeof QualificationDecisionSchema>;

export const WorkPackageCreateSchema = z.object({
  name: z.string().min(3).max(200),
  stageInstanceId: z.string().optional(),
  ownerId: z.string().uuid(),
});

export type WorkPackageCreateDto = z.infer<typeof WorkPackageCreateSchema>;

export const TaskCreateSchema = z.object({
  packageId: z.string(),
  title: z.string().min(3).max(250),
  assigneeId: z.string().uuid().optional(),
});

export type TaskCreateDto = z.infer<typeof TaskCreateSchema>;

export const TaskCompleteSchema = z.object({
  completionEvidence: z.string().optional(),
});

export type TaskCompleteDto = z.infer<typeof TaskCompleteSchema>;

export const PackageAcceptanceSchema = z.object({
  outcome: z.enum(['accepted', 'rejected', 'conditional']),
  conditions: z.array(z.string()).optional(),
  comment: z.string().optional(),
});

export type PackageAcceptanceDto = z.infer<typeof PackageAcceptanceSchema>;

export const DependencyCreateSchema = z.object({
  predecessorId: z.string(),
  successorId: z.string(),
  dependencyType: z.enum(['FS', 'SS', 'FF']).default('FS'),
});

export type DependencyCreateDto = z.infer<typeof DependencyCreateSchema>;

export const ProtectiveActionSchema = z.object({
  actionType: z.enum(['stop_work', 'evacuate', 'isolate', 'hazard_quarantine']),
  location: z.string().min(2),
  immediateReason: z.string().min(5),
  affectedScopeIds: z.array(z.string()).default([]),
});

export type ProtectiveActionDto = z.infer<typeof ProtectiveActionSchema>;

export const CloseDimensionSchema = z.object({
  dimension: z.enum(['operational', 'client_acceptance', 'reporting', 'financial_review', 'settlement']),
  evidenceManifestId: z.string().uuid(),
  disclosedOpenItems: z.array(z.string()).default([]),
});

export type CloseDimensionDto = z.infer<typeof CloseDimensionSchema>;

export const PolicyPublishSchema = z.object({
  expectedActiveSnapshotId: z.string().uuid().nullable().optional(),
  draftVersionId: z.string().uuid(),
  impactReportId: z.string().uuid(),
  authorityDecisionIds: z.array(z.string().uuid()).min(1),
});

export type PolicyPublishDto = z.infer<typeof PolicyPublishSchema>;

export const ApprovalDecisionSchema = z.object({
  targetVersionId: z.string().uuid(),
  targetHash: z.string().regex(/^[a-f0-9]{64}$/i, 'Must be valid 64-character hex SHA-256'),
  outcome: z.enum(['approved', 'rejected', 'changes_requested']),
  acknowledgedConditions: z.array(z.string()).default([]),
  comment: z.string().max(2000).optional(),
});

export type ApprovalDecisionDto = z.infer<typeof ApprovalDecisionSchema>;

export const ExceptionAuthoriseSchema = z.object({
  targetVersionId: z.string().uuid(),
  targetHash: z.string().regex(/^[a-f0-9]{64}$/i, 'Must be valid 64-character hex SHA-256'),
  authorityDecisionIds: z.array(z.string().uuid()).min(1),
  approvedScope: z.object({
    targetRuleId: z.string(),
    maxUses: z.number().int().positive().default(1),
    validFrom: z.string(),
    validUntil: z.string(),
  }),
  reviewPolicy: z.object({
    reviewOwnerId: z.string().uuid(),
    reviewDueAt: z.string(),
  }),
});

export type ExceptionAuthoriseDto = z.infer<typeof ExceptionAuthoriseSchema>;

export const EstimateCreateSchema = z.object({
  name: z.string().min(2).max(200),
  currency: z.string().default('QAR'),
});

export type EstimateCreateDto = z.infer<typeof EstimateCreateSchema>;

export const BOQLineCreateSchema = z.object({
  lineCode: z.string().min(1).max(50),
  description: z.string().min(2).max(500),
  descriptionAr: z.string().max(500).optional(),
  quantity: z.string().min(1),
  uom: z.string().min(1).max(50),
  unitCost: z.string().min(1),
  unitSell: z.string().min(1),
  durationMultiplier: z.string().default('1'),
  isLumpSum: z.boolean().default(false),
  parentLineId: z.string().optional(),
  allocatedLumpSumPortion: z.string().optional(),
  discountPercent: z.string().default('0'),
  taxRate: z.string().default('0'),
});

export type BOQLineCreateDto = z.infer<typeof BOQLineCreateSchema>;

export const EstimateCalculateSchema = z.object({
  overallDiscountPercent: z.string().optional(),
  overallFeePercent: z.string().optional(),
  defaultTaxRate: z.string().optional(),
});

export type EstimateCalculateDto = z.infer<typeof EstimateCalculateSchema>;

export const ProposalCreateSchema = z.object({
  estimateId: z.string(),
  proposalCode: z.string().min(2).max(50),
  title: z.string().min(2).max(200),
  clientOrganisationId: z.string(),
  validUntil: z.string().optional(),
});

export type ProposalCreateDto = z.infer<typeof ProposalCreateSchema>;

export const VariationCreateSchema = z.object({
  variationCode: z.string().min(2).max(50),
  title: z.string().min(2).max(200),
  titleAr: z.string().max(200).optional(),
  scopeDescription: z.string().min(5),
  costImpact: z.string(),
  sellImpact: z.string(),
  timeImpactDays: z.number().int().default(0),
});

export type VariationCreateDto = z.infer<typeof VariationCreateSchema>;

export const VariationApplySchema = z.object({
  clientDecisionId: z.string(),
  clientAuthorisedAt: z.string(),
  targetHash: z.string().min(10),
});

export type VariationApplyDto = z.infer<typeof VariationApplySchema>;

export const DesignCreateSchema = z.object({
  title: z.string().min(2).max(200),
  titleAr: z.string().max(200).optional(),
  category: z.enum(['moodboard', 'technical_drawing', 'floorplan', '3d_render']),
});

export type DesignCreateDto = z.infer<typeof DesignCreateSchema>;

export const DesignVersionCreateSchema = z.object({
  versionNumber: z.number().int().positive(),
  storageKey: z.string().min(1),
  title: z.string().min(2).max(200),
  titleAr: z.string().max(200).optional(),
  purpose: z.enum(['for_review', 'for_client_approval', 'for_fabrication']).default('for_review'),
  contentData: z.string().min(1), // Base64 or content representation for hashing
});

export type DesignVersionCreateDto = z.infer<typeof DesignVersionCreateSchema>;

export const DesignReleaseSchema = z.object({
  versionId: z.string(),
  purpose: z.enum(['for_review', 'for_client_approval', 'for_fabrication']),
  approvalHash: z.string().min(10),
  approverId: z.string().uuid(),
});

export type DesignReleaseDto = z.infer<typeof DesignReleaseSchema>;

export const DesignAnnotationSchema = z.object({
  versionId: z.string(),
  pageNumber: z.number().int().positive().default(1),
  coordinates: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number().optional(),
    height: z.number().optional(),
  }),
  comment: z.string().min(1).max(2000),
});

export type DesignAnnotationDto = z.infer<typeof DesignAnnotationSchema>;

export const PublicationCreateSchema = z.object({
  clientOrganisationId: z.string().uuid(),
  roomType: z.enum(['concept', 'milestones', 'commercial', 'results']),
  title: z.string().min(2).max(200),
  titleAr: z.string().max(200).optional(),
  targetVersionId: z.string().min(1),
  projectionPayload: z.record(z.unknown()), // strictly sell-side
});

export type PublicationCreateDto = z.infer<typeof PublicationCreateSchema>;

export const PublicationWithdrawSchema = z.object({
  reason: z.string().min(3).max(1000),
});

export type PublicationWithdrawDto = z.infer<typeof PublicationWithdrawSchema>;

export const ClientPortalDecisionSchema = z.object({
  publicationId: z.string(),
  decision: z.enum(['accepted', 'rejected', 'revision_requested']),
  targetHash: z.string().min(10),
  comment: z.string().max(2000).optional(),
});

export type ClientPortalDecisionDto = z.infer<typeof ClientPortalDecisionSchema>;

export const VendorCreateSchema = z.object({
  vendorCode: z.string().min(2).max(50),
  name: z.string().min(2).max(200),
  category: z.enum(['corporate', 'freelance', 'cash_supplier']).default('corporate'),
  bankDetails: z
    .object({
      bankName: z.string(),
      accountName: z.string(),
      accountNumber: z.string(),
      iban: z.string(),
      swift: z.string(),
    })
    .optional(),
  complianceVerified: z.boolean().default(false),
  soleSourceAuthorised: z.boolean().default(false),
  freelanceGracePeriodUntil: z.string().optional(),
});

export type VendorCreateDto = z.infer<typeof VendorCreateSchema>;

export const VendorBankChangeSchema = z.object({
  proposedBankDetails: z.object({
    bankName: z.string().min(2),
    accountName: z.string().min(2),
    accountNumber: z.string().min(4),
    iban: z.string().min(10),
    swift: z.string().min(4),
  }),
});

export type VendorBankChangeDto = z.infer<typeof VendorBankChangeSchema>;

export const VendorVerifyBankSchema = z.object({
  requestId: z.string(),
});

export type VendorVerifyBankDto = z.infer<typeof VendorVerifyBankSchema>;

export const FrameworkContractCreateSchema = z.object({
  vendorId: z.string(),
  contractCode: z.string().min(2).max(50),
  ceilingAmount: z.string(),
  currency: z.string().default('QAR'),
  validUntil: z.string(),
});

export type FrameworkContractCreateDto = z.infer<typeof FrameworkContractCreateSchema>;

export const PurchaseOrderCreateSchema = z.object({
  poNumber: z.string().min(2).max(50),
  vendorId: z.string(),
  frameworkContractId: z.string().optional(),
  currency: z.string().default('QAR'),
  totalAmount: z.string(),
  isSoleSource: z.boolean().default(false),
  soleSourceRationale: z.string().optional(),
  lines: z
    .array(
      z.object({
        packageId: z.string(),
        description: z.string().min(2),
        quantity: z.string(),
        unitCost: z.string(),
      })
    )
    .min(1),
});

export type PurchaseOrderCreateDto = z.infer<typeof PurchaseOrderCreateSchema>;

export const PurchaseOrderReleaseSchema = z.object({
  idempotencyKey: z.string().min(5),
});

export type PurchaseOrderReleaseDto = z.infer<typeof PurchaseOrderReleaseSchema>;

export const POReceiptSchema = z.object({
  deliveryNoteNumber: z.string().min(2),
  items: z
    .array(
      z.object({
        lineId: z.string(),
        receivedQuantity: z.string().default('0'),
        rejectedQuantity: z.string().default('0'),
      })
    )
    .min(1),
});

export type POReceiptDto = z.infer<typeof POReceiptSchema>;

export const ResourceCreateSchema = z.object({
  resourceCode: z.string().min(2).max(50),
  name: z.string().min(2).max(200),
  type: z.enum(['serialized', 'bulk']),
  totalQuantity: z.number().int().positive(),
  warehouseLocation: z.string().min(1),
  authoritativeSystem: z.enum(['EOS', 'LEGACY_LOCKED']).default('EOS'),
});

export type ResourceCreateDto = z.infer<typeof ResourceCreateSchema>;

export const ReservationCreateSchema = z.object({
  resourceId: z.string(),
  windowStart: z.string(),
  windowEnd: z.string(),
  quantity: z.number().int().positive().default(1),
});

export type ReservationCreateDto = z.infer<typeof ReservationCreateSchema>;

export const MaintenanceHoldSchema = z.object({
  reason: z.string().min(3),
  damageReport: z.string().optional(),
});

export type MaintenanceHoldDto = z.infer<typeof MaintenanceHoldSchema>;

export const MaintenanceReleaseSchema = z.object({
  inspectorId: z.string(),
});

export type MaintenanceReleaseDto = z.infer<typeof MaintenanceReleaseSchema>;

export const SubrentalRequestSchema = z.object({
  resourceId: z.string(),
  shortageQuantity: z.number().int().positive(),
  windowStart: z.string(),
  windowEnd: z.string(),
  estimatedUnitRate: z.string(),
});

export type SubrentalRequestDto = z.infer<typeof SubrentalRequestSchema>;

export const ProductionOrderCreateSchema = z.object({
  designId: z.string(),
  designVersionNumber: z.number().int().positive(),
  title: z.string().min(2).max(200),
  orderedUnits: z.number().int().positive(),
});

export type ProductionOrderCreateDto = z.infer<typeof ProductionOrderCreateSchema>;

export const ProductionCheckpointSchema = z.object({
  checkpointName: z.string().min(2),
  passed: z.boolean(),
  notes: z.string().optional(),
  inspectorId: z.string(),
});

export type ProductionCheckpointDto = z.infer<typeof ProductionCheckpointSchema>;

export const ShiftCreateSchema = z.object({
  workerId: z.string(),
  role: z.string().min(2),
  windowStart: z.string(),
  windowEnd: z.string(),
});

export type ShiftCreateDto = z.infer<typeof ShiftCreateSchema>;

export const AttendanceCaptureSchema = z.object({
  shiftId: z.string().optional(),
  workerId: z.string(),
  checkInAt: z.string(),
  checkOutAt: z.string().optional(),
  verificationMethod: z.string().default('field_app'),
});

export type AttendanceCaptureDto = z.infer<typeof AttendanceCaptureSchema>;

export const TripCreateSchema = z.object({
  vehicleId: z.string().min(2),
  driverId: z.string(),
  loadingStart: z.string(),
  travelStart: z.string(),
  venueArrival: z.string(),
  eventStart: z.string(),
  eventEnd: z.string(),
  bumpOutEnd: z.string(),
  returnInspectionEnd: z.string(),
});

export type TripCreateDto = z.infer<typeof TripCreateSchema>;

export const PermitRecordSchema = z.object({
  authorityName: z.string().min(2),
  permitType: z.string().min(2),
  permitNumber: z.string().optional(),
  status: z.enum(['obtained', 'absent', 'alternative_verified']).default('absent'),
  hasDigitalUpload: z.boolean().default(false),
});

export type PermitRecordDto = z.infer<typeof PermitRecordSchema>;

export const PermitAlternativeVerifySchema = z.object({
  verifiedBy: z.string(),
  method: z.string().min(2),
  physicalDocReference: z.string().min(2),
});

export type PermitAlternativeVerifyDto = z.infer<typeof PermitAlternativeVerifySchema>;

export const ReadinessCheckpointSchema = z.object({
  zone: z.string().min(1),
  title: z.string().min(2),
  isCritical: z.boolean().default(false),
  status: z.enum(['pending', 'passed', 'failed']).default('pending'),
  notes: z.string().optional(),
  inspectorId: z.string().optional(),
});

export type ReadinessCheckpointDto = z.infer<typeof ReadinessCheckpointSchema>;

export const OpeningReleaseSchema = z.object({
  zone: z.string().min(1),
  releasedBy: z.string(),
});

export type OpeningReleaseDto = z.infer<typeof OpeningReleaseSchema>;

export const IncidentCaptureSchema = z.object({
  title: z.string().min(2),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  operationalImpact: z.string().min(2),
  restrictedPersonalNarrative: z.string().optional(),
  reportedBy: z.string(),
});

export type IncidentCaptureDto = z.infer<typeof IncidentCaptureSchema>;

export const VenueHandoverSchema = z.object({
  deliveryCompleted: z.boolean().default(true),
  venueReinstatementStatus: z.enum(['pending', 'inspected', 'accepted', 'remedial_required']).default('pending'),
  openDamageClaims: z
    .array(
      z.object({
        claimId: z.string(),
        description: z.string(),
        estimatedCost: z.number(),
        resolved: z.boolean(),
      })
    )
    .default([]),
  depositStatus: z.enum(['held', 'partially_retained', 'released']).default('held'),
});

export type VenueHandoverDto = z.infer<typeof VenueHandoverSchema>;

export const FieldSyncBatchSchema = z.object({
  deviceId: z.string().min(2),
  operations: z
    .array(
      z.object({
        clientOperationId: z.string(),
        entityType: z.enum(['attendance', 'task_completion', 'inspection', 'incident']),
        action: z.string(),
        clientTimestamp: z.string(),
        workerId: z.string(),
        payload: z.record(z.unknown()),
      })
    )
    .min(1),
});

export type FieldSyncBatchDto = z.infer<typeof FieldSyncBatchSchema>;

export const MediaUploadIntentSchema = z.object({
  storageKey: z.string(),
  expectedBytes: z.number().int().positive(),
  linkedTaskOrInspectionId: z.string(),
});

export type MediaUploadIntentDto = z.infer<typeof MediaUploadIntentSchema>;

export const MediaUploadCompleteSchema = z.object({
  receivedBytes: z.number().int().positive(),
  isBinaryComplete: z.boolean(),
});

export type MediaUploadCompleteDto = z.infer<typeof MediaUploadCompleteSchema>;

export const CostImportSchema = z.object({
  sourceSystem: z.string().min(2),
  batchId: z.string().min(2),
  fileHash: z.string().min(6),
  currency: z.string().default('QAR'),
  records: z
    .array(
      z.object({
        externalTxId: z.string(),
        description: z.string(),
        amount: z.string(),
        currency: z.string().default('QAR'),
      })
    )
    .min(1),
});

export type CostImportDto = z.infer<typeof CostImportSchema>;

export const CostAllocationSchema = z.object({
  invoiceId: z.string().min(1),
  lineId: z.string().min(1),
  allocations: z
    .array(
      z.object({
        packageId: z.string().min(1),
        amount: z.string(),
        notes: z.string().optional(),
      })
    )
    .min(1),
});

export type CostAllocationDto = z.infer<typeof CostAllocationSchema>;

export const InvoiceLedgerStatusSchema = z.object({
  ledgerStatus: z.enum(['pending_sync', 'synced', 'quarantined_by_ledger', 'rejected_by_ledger']),
  quarantineReason: z.string().optional(),
  ledgerReference: z.string().optional(),
});

export type InvoiceLedgerStatusDto = z.infer<typeof InvoiceLedgerStatusSchema>;

export const BillingRequestSchema = z.object({
  milestoneId: z.string().min(1),
  amount: z.string(),
  currency: z.string().default('QAR'),
  description: z.string().min(2),
});

export type BillingRequestDto = z.infer<typeof BillingRequestSchema>;

export const CreditNoteSchema = z.object({
  invoiceId: z.string().min(1),
  creditAmount: z.string(),
  currency: z.string().default('QAR'),
  reason: z.string().min(3),
});

export type CreditNoteDto = z.infer<typeof CreditNoteSchema>;

export const ReportCreateSchema = z.object({
  reportCode: z.string().min(2),
  periodStart: z.string(),
  periodEnd: z.string(),
  targetAudience: z.enum(['internal_command', 'client_portal', 'public_report']).default('client_portal'),
});

export type ReportCreateDto = z.infer<typeof ReportCreateSchema>;

export const ReportPublishSchema = z.object({
  idempotencyKey: z.string().min(5),
});

export type ReportPublishDto = z.infer<typeof ReportPublishSchema>;

export const CloseoutDecisionSchema = z.object({
  dimension: z.enum(['operational', 'client_acceptance', 'reporting', 'financial_review', 'settlement']),
  decision: z.enum(['closed', 'reopened', 'pending']),
  notes: z.string().optional(),
});

export type CloseoutDecisionDto = z.infer<typeof CloseoutDecisionSchema>;

export const LessonCaptureSchema = z.object({
  title: z.string().min(3),
  category: z.enum(['procurement', 'logistics', 'safety', 'commercial']),
  narrative: z.string().min(10),
  policyRevisionProposed: z.boolean().default(false),
});

export type LessonCaptureDto = z.infer<typeof LessonCaptureSchema>;

export const WebhookEventSchema = z.object({
  provider: z.string().min(2),
  eventId: z.string().min(2),
  signature: z.string().min(5),
  payload: z.record(z.unknown()),
});

export type WebhookEventDto = z.infer<typeof WebhookEventSchema>;

export const MetricObservationSchema = z.object({
  metricType: z.enum(['turnstile_entries', 'daily_unique_attendees', 'overall_unique_attendees']),
  scans: z
    .array(
      z.object({
        ticketId: z.string(),
        attendeeId: z.string(),
        day: z.string(),
        gate: z.string(),
        timestamp: z.string(),
      })
    )
    .min(1),
});

export type MetricObservationDto = z.infer<typeof MetricObservationSchema>;

export const CalendarProposalSchema = z.object({
  externalEventId: z.string().min(2),
  baselineStart: z.string(),
  baselineEnd: z.string(),
  externalStart: z.string(),
  externalEnd: z.string(),
});

export type CalendarProposalDto = z.infer<typeof CalendarProposalSchema>;

export const ScenarioCreateSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  proposedAllocations: z
    .array(
      z.object({
        projectId: z.string().min(1),
        resourceId: z.string().min(1),
        windowStart: z.string(),
        windowEnd: z.string(),
      })
    )
    .min(1),
});

export type ScenarioCreateDto = z.infer<typeof ScenarioCreateSchema>;

export const ScenarioApplySchema = z.object({
  idempotencyKey: z.string().min(5),
});

export type ScenarioApplyDto = z.infer<typeof ScenarioApplySchema>;

export const RuleAnalyticsQuerySchema = z.object({
  ruleId: z.string().min(2),
  thresholdPercent: z.number().min(0).max(100).default(15),
});

export type RuleAnalyticsQueryDto = z.infer<typeof RuleAnalyticsQuerySchema>;

export const EvmEvaluationSchema = z.object({
  packageId: z.string().min(1),
  plannedValue: z.string(),
  actualCost: z.string(),
  physicalCompletionPercent: z.number().min(0).max(100),
  hoursLogged: z.number().int().nonnegative(),
  hoursBudgeted: z.number().int().positive(),
  currency: z.string().default('QAR'),
});

export type EvmEvaluationDto = z.infer<typeof EvmEvaluationSchema>;

export const AiDraftRequestSchema = z.object({
  documentType: z.string().min(2),
  rawContent: z.string().min(5),
  classification: z.enum(['public', 'internal', 'confidential', 'restricted']).default('internal'),
});

export type AiDraftRequestDto = z.infer<typeof AiDraftRequestSchema>;

export const AiDraftAcceptSchema = z.object({
  draftId: z.string().min(1),
  requirementId: z.string().min(1),
  sourcePageNumber: z.number().int().positive(),
  sourceSectionReference: z.string().min(2),
  reviewerId: z.string().min(1),
});

export type AiDraftAcceptDto = z.infer<typeof AiDraftAcceptSchema>;

export const CountryCellCreateSchema = z.object({
  cellCode: z.string().min(2),
  countryCode: z.string().min(2).max(3),
  jurisdiction: z.string().min(2),
  primaryCurrency: z.string().default('QAR'),
  dataProcessingRegion: z.string().min(2),
});

export type CountryCellCreateDto = z.infer<typeof CountryCellCreateSchema>;

export const ProductionGateCheckSchema = z.object({
  environment: z.enum(['production', 'staging', 'development']).default('production'),
  connectors: z
    .array(
      z.object({
        connectorId: z.string().min(1),
        endpointUrl: z.string().min(5),
        isVerified: z.boolean(),
        isMock: z.boolean().default(false),
      })
    )
    .min(1),
});

export type ProductionGateCheckDto = z.infer<typeof ProductionGateCheckSchema>;

export const CompensatingCancellationSchema = z.object({
  cancellationReason: z.string().min(5),
  supplierAcknowledged: z.boolean().default(true),
});

export type CompensatingCancellationDto = z.infer<typeof CompensatingCancellationSchema>;

export const RestoreDrillSchema = z.object({
  backupSnapshotId: z.string().min(2),
  backupManifests: z
    .array(
      z.object({
        recordType: z.string(),
        recordCount: z.number().int().nonnegative(),
        dataHash: z.string(),
      })
    )
    .min(1),
  restoredManifests: z
    .array(
      z.object({
        recordType: z.string(),
        recordCount: z.number().int().nonnegative(),
        dataHash: z.string(),
      })
    )
    .min(1),
});

export type RestoreDrillDto = z.infer<typeof RestoreDrillSchema>;

export const SupportFailureDrillSchema = z.object({
  incidentType: z.enum([
    'remote_provider_timeout',
    'offline_attendance_conflict',
    'duplicate_invoice_attempt',
  ]),
  details: z.string().min(5),
});

export type SupportFailureDrillDto = z.infer<typeof SupportFailureDrillSchema>;




export interface CommandResult<T = any> {
  data: {
    id: string;
    status: string;
    recordVersion: number;
    externalDeliveryStatus?: 'queued' | 'not_applicable' | 'delivered';
    payload?: T;
  };
  meta: {
    requestId: string;
    recordVersion?: number;
    policySnapshotId?: string;
    dataAsOf?: string;
  };
}
