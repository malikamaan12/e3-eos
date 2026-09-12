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
  originalWording: z.string().optional(),
  interpretation: z.string().optional(),
  sourceType: z.string().optional(),
  sourceReference: z.string().optional(),
  ownerId: z.string().optional(),
  ownerName: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.string().optional(),
  deliverablePackageId: z.string().optional(),
  code: z.string().optional(),
  category: z.string().optional(),
  dueDate: z.string().optional(),
  linkedDocumentId: z.string().optional(),
  linkedDocumentNumber: z.string().optional(),
  linkedDesignId: z.string().optional(),
  linkedDesignVersion: z.string().optional(),
  linkedBoqLineCode: z.string().optional(),
  linkedTaskId: z.string().optional(),
  targetCostQar: z.number().optional(),
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
  category: z.string().optional(),
  rfpSectionRef: z.string().optional(),
  costDeltaQar: z.number().optional(),
  scheduleDeltaDays: z.number().optional(),
  scopeAltered: z.boolean().optional(),
  linkedRequirementIds: z.array(z.string()).optional(),
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

export const ExceptionScopeSchema = z.object({
  projectId: z.string().uuid(),
  targetRecordId: z.string().uuid(),
  targetVersionId: z.string().uuid(),
  ruleIds: z.array(z.string()).min(1),
  allowedActions: z.array(z.string()).min(1),
  conditions: z.array(z.string()).optional(),
});

export type ExceptionScopeDto = z.infer<typeof ExceptionScopeSchema>;

export const ExceptionReviewPolicySchema = z.object({
  mode: z.enum(['required', 'not_required_with_basis']),
  ownerId: z.string().uuid(),
  reviewDueAt: z.string(),
  templateId: z.string().uuid().optional(),
  basis: z.string().optional(),
});

export type ExceptionReviewPolicyDto = z.infer<typeof ExceptionReviewPolicySchema>;

export const ExceptionRequestSchema = z.object({
  scope: ExceptionScopeSchema,
  reason: z.string().min(1),
  authorityBasisId: z.string().uuid(),
  validFrom: z.string(),
  validUntil: z.string(),
  maxUses: z.number().int().min(1).default(1),
  reviewPolicy: ExceptionReviewPolicySchema,
  evidenceVersionIds: z.array(z.string().uuid()).default([]),
});

export type ExceptionRequestDto = z.infer<typeof ExceptionRequestSchema>;

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

export const ExceptionReviewSchema = z.object({
  outcome: z.enum(['in_review', 'remediation_required', 'closed']),
  disposition: z.string().min(1),
  evidenceVersionIds: z.array(z.string().uuid()).default([]),
  remainingActionIds: z.array(z.string().uuid()).default([]),
});

export type ExceptionReviewDto = z.infer<typeof ExceptionReviewSchema>;

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
  linkedRequirementCode: z.string().optional(),
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
  vendorCode: z.string().min(2).max(50).optional(),
  name: z.string().min(2).max(200),
  vendorType: z
    .enum([
      'company',
      'freelancer',
      'individual_supplier',
      'subcontractor',
      'rental_supplier',
      'fabricator',
      'technical_supplier',
      'logistics_supplier',
      'talent_supplier',
      'international_supplier',
    ])
    .default('company'),
  category: z.enum(['corporate', 'freelance', 'cash_supplier']).optional(),
  status: z
    .enum([
      'prospect',
      'registration_pending',
      'under_review',
      'approved',
      'conditionally_approved',
      'suspended',
      'blacklisted',
      'archived',
      'active',
    ])
    .default('prospect'),
  crNumber: z.string().optional(),
  taxOrVatNumber: z.string().optional(),
  country: z.string().default('Qatar'),
  contactPerson: z
    .object({
      name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().min(5),
    })
    .optional(),
  insurancePolicy: z
    .object({
      provider: z.string(),
      policyNumber: z.string(),
      validUntil: z.string(),
      coverageAmount: z.number().optional(),
    })
    .optional(),
  certifications: z.array(z.string()).default([]),
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
  riskFlags: z.array(z.string()).default([]),
  notes: z.string().optional(),
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

export const ReservationConfirmSchema = z.object({
  expectedResourceVersion: z.number().int().min(1).default(1),
  planningStart: z.string(),
  planningEnd: z.string(),
  quantity: z.number().int().positive().default(1),
  authorityBasisId: z.string().uuid().optional(),
});

export type ReservationConfirmDto = z.infer<typeof ReservationConfirmSchema>;

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
    'db_api_outage',
    'queue_redis_outage',
    'remote_provider_timeout',
    'credential_compromise',
    'duplicate_webhook',
    'lost_field_device',
    'wrong_policy_published',
    'missing_safety_evidence',
    'financial_import_mismatch',
    'malicious_file_or_prompt_injection',
    'leaked_publication_link',
    'failed_deployment_migration',
    'offline_attendance_conflict',
    'duplicate_invoice_attempt',
  ]),
  details: z.string().min(5),
});

// --- SPRINT 03: PHYSICAL DELIVERY CONTROL CONTRACTS ---

export const SourceDecisionEnum = z.enum([
  'buy',
  'rent',
  'use_e3_asset',
  'client_supplied',
  'vendor_package',
  'subcontract',
]);
export type SourceDecision = z.infer<typeof SourceDecisionEnum>;

export const ProcurementStatusEnum = z.enum([
  'draft',
  'internal_review',
  'approved_to_source',
  'rfq_active',
  'quotes_received',
  'evaluation',
  'approval_required',
  'awarded',
  'po_issued',
  'in_progress',
  'delivered',
  'closed',
  'cancelled',
]);
export type ProcurementStatus = z.infer<typeof ProcurementStatusEnum>;

export const ProcurementRequirementCreateSchema = z.object({
  projectId: z.string(),
  source: z.enum([
    'boq_line',
    'design_package',
    'requirement',
    'timeline_activity',
    'site_request',
    'variation',
    'operational_call_off',
  ]).default('boq_line'),
  boqLineId: z.string().optional(),
  requirementId: z.string().optional(),
  designPackageId: z.string().optional(),
  description: z.string().min(2),
  category: z.string().min(2),
  quantity: z.number().positive(),
  unit: z.string().min(1).default('units'),
  requiredOnSiteDate: z.string(),
  procurementLeadTimeDays: z.number().int().nonnegative().default(14),
  requiredDeliveryLocation: z.string().min(2),
  technicalSpecification: z.string().optional(),
  preferredVendorId: z.string().optional(),
  procurementOwnerId: z.string().optional(),
  estimatedCost: z.number().nonnegative().default(0),
  approvedBudget: z.number().nonnegative().default(0),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  sourceDecision: SourceDecisionEnum.default('buy'),
  internalAssetQuantity: z.number().int().nonnegative().default(0),
  externalSourcingQuantity: z.number().int().nonnegative().default(0),
});
export type ProcurementRequirementCreateDto = z.infer<typeof ProcurementRequirementCreateSchema>;

export const SourceDecisionUpdateSchema = z.object({
  sourceDecision: SourceDecisionEnum,
  internalAssetQuantity: z.number().int().nonnegative().default(0),
  externalSourcingQuantity: z.number().int().nonnegative().default(0),
  rationale: z.string().optional(),
});
export type SourceDecisionUpdateDto = z.infer<typeof SourceDecisionUpdateSchema>;

export const VendorExtendedCreateSchema = z.object({
  vendorCode: z.string().min(2).max(50),
  legalName: z.string().min(2).max(200),
  tradingName: z.string().optional(),
  vendorType: z.enum([
    'company',
    'freelancer',
    'individual_supplier',
    'subcontractor',
    'international_supplier',
    'rental_supplier',
    'fabricator',
    'talent_supplier',
    'technical_supplier',
    'logistics_supplier',
  ]).default('company'),
  country: z.string().default('Qatar'),
  contactPersons: z.array(
    z.object({
      name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().min(5),
      role: z.string().optional(),
    })
  ).default([]),
  email: z.string().email(),
  phone: z.string().min(5),
  categories: z.array(z.string()).default([]),
  services: z.array(z.string()).default([]),
  brands: z.array(z.string()).default([]),
  commercialRegistration: z.string().optional(),
  taxVatNumber: z.string().optional(),
  bankDetails: z.object({
    bankName: z.string(),
    accountName: z.string(),
    accountNumber: z.string(),
    iban: z.string(),
    swift: z.string(),
  }).optional(),
  insurance: z.string().optional(),
  licences: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  rating: z.number().min(1).max(5).default(4),
  qualificationStatus: z.enum([
    'prospect',
    'registration_pending',
    'under_review',
    'approved',
    'conditionally_approved',
    'suspended',
    'blacklisted',
    'archived',
  ]).default('approved'),
});
export type VendorExtendedCreateDto = z.infer<typeof VendorExtendedCreateSchema>;

export const RfqCreateSchema = z.object({
  rfqNumber: z.string().min(2).max(50),
  projectId: z.string(),
  procurementRequirementId: z.string(),
  issueDate: z.string(),
  closingDate: z.string(),
  invitedVendorIds: z.array(z.string()).min(1),
  technicalSpecification: z.string().min(5),
  quantity: z.number().positive(),
  deliveryRequirement: z.string().min(2),
  commercialTerms: z.string().optional(),
  attachments: z.array(z.string()).default([]),
});
export type RfqCreateDto = z.infer<typeof RfqCreateSchema>;

export const VendorQuoteSubmitSchema = z.object({
  rfqId: z.string(),
  vendorId: z.string(),
  quoteReference: z.string().min(2),
  unitRate: z.number().positive(),
  totalPrice: z.number().positive(),
  currency: z.string().default('QAR'),
  deliveryTimeDays: z.number().int().positive(),
  paymentTerms: z.string().default('30 Days Net'),
  warranty: z.string().default('12 Months Standard'),
  technicalCompliance: z.string().default('100% Compliant with specs'),
  exclusions: z.string().optional(),
  validityDays: z.number().int().default(30),
  attachments: z.array(z.string()).default([]),
  clarifications: z.string().optional(),
});
export type VendorQuoteSubmitDto = z.infer<typeof VendorQuoteSubmitSchema>;

export const BidEvaluationSchema = z.object({
  technicalScore: z.number().min(0).max(100),
  commercialScore: z.number().min(0).max(100),
  riskScore: z.number().min(0).max(100),
  recommendedVendorId: z.string(),
  awardRationale: z.string().min(5),
});
export type BidEvaluationDto = z.infer<typeof BidEvaluationSchema>;

export const ProductionPackageCreateSchema = z.object({
  packageCode: z.string().min(2).max(50),
  projectId: z.string(),
  vendorId: z.string(),
  linkedRequirementId: z.string().optional(),
  approvedDesignRevisionId: z.string().optional(),
  boqLineIds: z.array(z.string()).default([]),
  title: z.string().min(2),
  quantity: z.number().int().positive(),
  material: z.string().min(2),
  finish: z.string().optional(),
  productionOwnerId: z.string(),
  startDate: z.string(),
  requiredCompletionDate: z.string(),
  deliveryDate: z.string(),
  status: z.enum([
    'not_released',
    'approved_for_production',
    'material_procurement',
    'fabrication',
    'assembly',
    'finishing',
    'qc_inspection',
    'rework_required',
    'ready_for_dispatch',
    'dispatched',
    'installed',
    'closed',
  ]).default('not_released'),
});
export type ProductionPackageCreateDto = z.infer<typeof ProductionPackageCreateSchema>;

export const FabricationReleaseSchema = z.object({
  designApproved: z.boolean(),
  commercialApproved: z.boolean(),
  safetyApproved: z.boolean(),
  vendorAwarded: z.boolean(),
  approvedBy: z.string(),
});
export type FabricationReleaseDto = z.infer<typeof FabricationReleaseSchema>;

export const QualityInspectionCreateSchema = z.object({
  packageId: z.string(),
  itemId: z.string().optional(),
  inspectorId: z.string(),
  inspectionDate: z.string(),
  inspectionType: z.enum(['factory_acceptance', 'site_receipt', 'pre_dispatch', 'installation', 'final_handover']),
  checklist: z.array(
    z.object({
      item: z.string(),
      passed: z.boolean(),
      notes: z.string().optional(),
    })
  ).default([]),
  result: z.enum(['passed', 'failed', 'conditional']),
  photos: z.array(z.string()).default([]),
});
export type QualityInspectionCreateDto = z.infer<typeof QualityInspectionCreateSchema>;

export const SnagRecordSchema = z.object({
  inspectionId: z.string().optional(),
  packageId: z.string().optional(),
  projectId: z.string(),
  title: z.string().min(2),
  severity: z.enum(['critical', 'major', 'minor', 'observation']).default('minor'),
  status: z.enum([
    'open',
    'assigned',
    'in_progress',
    'ready_for_reinspection',
    'resolved',
    'accepted',
    'reopened',
  ]).default('open'),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
  resolutionNotes: z.string().optional(),
  blocksDispatch: z.boolean().default(false),
  blocksReadiness: z.boolean().default(false),
});
export type SnagRecordDto = z.infer<typeof SnagRecordSchema>;

export const AssetRegisterSchema = z.object({
  assetTag: z.string().min(2).max(50),
  barcode: z.string().min(2).max(50),
  name: z.string().min(2).max(200),
  category: z.string().min(2),
  subcategory: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  quantity: z.number().int().positive().default(1),
  unit: z.string().default('units'),
  ownership: z.enum(['e3_owned', 'vendor_rental', 'client_owned', 'project_purchased', 'consignment']).default('e3_owned'),
  warehouseId: z.string(),
  zone: z.string().default('General'),
  location: z.string().default('Bay 01'),
  condition: z.enum(['new', 'good', 'serviceable', 'needs_maintenance', 'damaged', 'quarantined', 'retired']).default('serviceable'),
  availability: z.enum(['available', 'reserved', 'allocated', 'dispatched', 'on_site', 'returned', 'damaged', 'unavailable']).default('available'),
  purchaseValue: z.number().nonnegative().default(0),
  replacementValue: z.number().nonnegative().default(0),
  maintenanceStatus: z.string().default('Up to date'),
  lastInspectionDate: z.string().optional(),
  nextInspectionDate: z.string().optional(),
});
export type AssetRegisterDto = z.infer<typeof AssetRegisterSchema>;

export const AssetAllocationRequestSchema = z.object({
  assetId: z.string(),
  projectId: z.string(),
  procurementRequirementId: z.string().optional(),
  quantity: z.number().int().positive().default(1),
  windowStart: z.string(),
  windowEnd: z.string(),
});
export type AssetAllocationRequestDto = z.infer<typeof AssetAllocationRequestSchema>;

export const WarehouseCreateSchema = z.object({
  warehouseCode: z.string().min(2).max(50),
  name: z.string().min(2).max(200),
  country: z.string().default('Qatar'),
  city: z.string().default('Doha'),
  address: z.string().min(2),
  zones: z.array(z.string()).default(['AV', 'Lighting', 'Scenic', 'Furniture', 'Games', 'Branding', 'Tools', 'Consumables', 'Quarantine', 'Returns']),
  capacity: z.string().default('10,000 sq m'),
  managerId: z.string(),
  operatingHours: z.string().default('07:00 - 19:00'),
});
export type WarehouseCreateDto = z.infer<typeof WarehouseCreateSchema>;

export const WarehouseMovementSchema = z.object({
  assetId: z.string(),
  source: z.string().min(2),
  destination: z.string().min(2),
  movementType: z.enum([
    'received',
    'stored',
    'reserved',
    'allocated',
    'picked',
    'packed',
    'dispatched',
    'on_site',
    'returned',
    'inspected',
    'restocked',
  ]),
  quantity: z.number().int().positive().default(1),
  condition: z.string().default('good'),
  projectId: z.string().optional(),
  evidenceUris: z.array(z.string()).default([]),
  userId: z.string(),
  notes: z.string().optional(),
});
export type WarehouseMovementDto = z.infer<typeof WarehouseMovementSchema>;


export const PackingListCreateSchema = z.object({
  packingListNumber: z.string().min(2).max(50),
  projectId: z.string(),
  warehouseId: z.string(),
  destination: z.string().min(2),
  vehicleId: z.string().optional(),
  driverId: z.string().optional(),
  dispatchDate: z.string(),
  requiredArrival: z.string(),
  items: z.array(
    z.object({
      assetId: z.string().optional(),
      assetTag: z.string().optional(),
      description: z.string().min(2),
      quantity: z.number().int().positive(),
      casesPallets: z.string().default('1 pallet'),
      weightKg: z.number().nonnegative().default(0),
      volumeM3: z.number().nonnegative().default(0),
    })
  ).min(1),
});
export type PackingListCreateDto = z.infer<typeof PackingListCreateSchema>;

export const DeliveryProofSchema = z.object({
  packingListId: z.string(),
  receiverName: z.string().min(2),
  receiverSignature: z.string().optional(),
  timestamp: z.string(),
  photos: z.array(z.string()).default([]),
  discrepancies: z.array(
    z.object({
      item: z.string(),
      expectedQty: z.number(),
      receivedQty: z.number(),
      condition: z.string(),
      notes: z.string().optional(),
    })
  ).default([]),
});
export type DeliveryProofDto = z.infer<typeof DeliveryProofSchema>;

export const TransportPlanSchema = z.object({
  vehicleId: z.string().min(2),
  vehicleType: z.string().default('7 Ton'), // open enum
  supplier: z.string().min(2),
  driverName: z.string().min(2),
  driverPhone: z.string().min(5),
  loadDescription: z.string().min(2),
  origin: z.string().min(2),
  destination: z.string().min(2),
  departureTime: z.string(),
  arrivalTime: z.string(),
  accessSlot: z.string().default('Slot A - 08:00 to 10:00'),
  permitNumber: z.string().optional(),
  loadingDock: z.string().default('Dock 03'),
  contactPerson: z.string().optional(),
  status: z.enum(['planned', 'loading', 'in_transit', 'arrived', 'offloaded', 'departed']).default('planned'),
});
export type TransportPlanDto = z.infer<typeof TransportPlanSchema>;

export const CrewAssignmentCreateSchema = z.object({
  personName: z.string().min(2),
  employer: z.string().default('E3 Live Operations'),
  role: z.string().min(2),
  department: z.string().default('Staging & Rigging'),
  projectId: z.string(),
  shiftId: z.string().optional(),
  location: z.string().min(2),
  supervisorName: z.string().optional(),
  start: z.string(),
  end: z.string(),
  accreditation: z.string().default('Verified Site Pass'),
  permit: z.string().optional(),
  certification: z.string().optional(),
  personnelType: z.enum([
    'e3_employee',
    'freelancer',
    'vendor_crew',
    'temporary_staff',
    'security',
    'ushers',
    'technical_crew',
    'performers',
    'drivers',
  ]).default('e3_employee'),
  status: z.enum(['scheduled', 'confirmed', 'checked_in', 'checked_out', 'conflict_flagged']).default('scheduled'),
});
export type CrewAssignmentCreateDto = z.infer<typeof CrewAssignmentCreateSchema>;

export const DailySiteReportSchema = z.object({
  projectId: z.string(),
  reportDate: z.string(),
  workCompleted: z.string().min(5),
  workDelayed: z.string().default('None'),
  manpowerCount: z.number().int().nonnegative().default(0),
  equipmentActive: z.string().default('All operational'),
  deliveriesReceived: z.string().default('All scheduled trucks cleared'),
  incidentsOccurred: z.string().default('Zero incidents reported'),
  snagsIdentified: z.string().default('None'),
  clientInstructions: z.string().default('None'),
  weatherConditions: z.string().default('Clear, 28°C'),
  photos: z.array(z.string()).default([]),
  tomorrowPlan: z.string().min(5),
  recordedBy: z.string().min(2),
});
export type DailySiteReportDto = z.infer<typeof DailySiteReportSchema>;

export const InstallationItemUpdateSchema = z.object({
  status: z.enum([
    'not_delivered',
    'delivered',
    'positioned',
    'installed',
    'tested',
    'accepted',
  ]),
  installerNotes: z.string().optional(),
  evidenceUris: z.array(z.string()).default([]),
  inspectorId: z.string().optional(),
});
export type InstallationItemUpdateDto = z.infer<typeof InstallationItemUpdateSchema>;

export const OperationalReadinessGateEvaluateSchema = z.object({
  projectId: z.string(),
  notes: z.string().optional(),
});
export type OperationalReadinessGateEvaluateDto = z.infer<typeof OperationalReadinessGateEvaluateSchema>;

export const VendorStatusTransitionSchema = z.object({

  status: z.enum([
    'prospect',
    'registration_pending',
    'under_review',
    'approved',
    'conditionally_approved',
    'suspended',
    'blacklisted',
    'archived',
    'active',
  ]),
  rationale: z.string().optional(),
  riskFlags: z.array(z.string()).optional(),
});
export type VendorStatusTransitionDto = z.infer<typeof VendorStatusTransitionSchema>;

export const OpeningAuthorizationSchema = z.object({
  projectId: z.string(),
  authorizedBy: z.string().min(2),
  authorizedRole: z.string().min(2),
  exceptionsAcknowledged: z.array(z.string()).default([]),
  justification: z.string().optional(),
  dualSignoffBy: z.string().optional(),
});
export type OpeningAuthorizationDto = z.infer<typeof OpeningAuthorizationSchema>;

export const CrewFatigueEvaluationSchema = z.object({
  shiftHours: z.number().positive(),
  isRamadan: z.boolean().default(false),
  previousShiftEnd: z.string().optional(),
  nextShiftStart: z.string().optional(),
});
export type CrewFatigueEvaluationDto = z.infer<typeof CrewFatigueEvaluationSchema>;

// --- SPRINT 04 LIVE EVENT COMMAND SYSTEM SCHEMAS ---

export const WorkerQualificationCreateSchema = z.object({
  workerId: z.string(),
  workerName: z.string().optional(),
  qualificationType: z.string().min(2),
  certificateNumber: z.string().min(1),
  issuer: z.string().min(2),
  issueDate: z.string().optional(),
  validUntil: z.string(),
  status: z.enum(['valid', 'expiring_soon', 'expired', 'suspended', 'pending_verification', 'not_applicable']).default('valid'),
  projectApplicability: z.array(z.string()).default([]),
  restrictedDuties: z.array(z.string()).default([]),
  supportingDocumentUri: z.string().optional(),
});
export type WorkerQualificationCreateDto = z.infer<typeof WorkerQualificationCreateSchema>;

export const CrewAttendanceCheckInSchema = z.object({
  projectId: z.string(),
  workerId: z.string(),
  personName: z.string().optional(),
  shiftId: z.string().optional(),
  role: z.string(),
  actualCheckIn: z.string(),
  source: z.enum(['supervisor_manual', 'qr_barcode', 'employee_checkin', 'imported_timesheet', 'vendor_confirmation', 'offline_capture']).default('supervisor_manual'),
});
export type CrewAttendanceCheckInDto = z.infer<typeof CrewAttendanceCheckInSchema>;

export const CrewAttendanceAdjustmentSchema = z.object({
  attendanceId: z.string(),
  actualCheckIn: z.string().optional(),
  actualCheckOut: z.string().optional(),
  breaks: z.array(z.object({ start: z.string(), end: z.string(), durationMinutes: z.number() })).optional(),
  adjustmentReason: z.string().min(5),
  supervisorId: z.string(),
});
export type CrewAttendanceAdjustmentDto = z.infer<typeof CrewAttendanceAdjustmentSchema>;

export const ComplianceObligationCreateSchema = z.object({
  projectId: z.string(),
  type: z.enum(['permit', 'licence', 'certificate', 'rams', 'method_statement', 'insurance', 'authority_approval', 'venue_approval', 'hse_requirement', 'equipment_certificate', 'staff_accreditation', 'temporary_operating_permit']),
  requirement: z.string().min(3),
  authorityName: z.string().min(2),
  applicableScope: z.string(),
  zone: z.string(),
  responsibleOwnerId: z.string(),
  dueDate: z.string(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  status: z.enum(['required', 'in_preparation', 'submitted', 'awaiting_approval', 'approved', 'verified_alternative', 'rejected', 'expired', 'not_applicable', 'superseded']).default('required'),
  evidenceRef: z.string().optional(),
  verificationMethod: z.string().optional(),
  isBlocking: z.boolean().default(true),
});
export type ComplianceObligationCreateDto = z.infer<typeof ComplianceObligationCreateSchema>;

export const ComplianceObligationVerifySchema = z.object({
  obligationId: z.string(),
  verifiedBy: z.string(),
  verificationMethod: z.string().min(3),
  physicalDocReference: z.string().min(2),
  notes: z.string().optional(),
});
export type ComplianceObligationVerifyDto = z.infer<typeof ComplianceObligationVerifySchema>;

export const LiveRunSheetItemCreateSchema = z.object({
  projectId: z.string(),
  time: z.string(),
  activity: z.string().min(3),
  zone: z.string(),
  ownerId: z.string(),
  department: z.string(),
  cue: z.string().optional(),
  dependencies: z.array(z.string()).default([]),
  baselineTime: z.string().optional(),
});
export type LiveRunSheetItemCreateDto = z.infer<typeof LiveRunSheetItemCreateSchema>;

export const LiveRunSheetItemUpdateSchema = z.object({
  status: z.enum(['upcoming', 'ready', 'active', 'delayed', 'complete', 'skipped', 'cancelled', 'blocked']),
  actualTime: z.string().optional(),
  delayMinutes: z.number().default(0),
  delayReason: z.string().optional(),
  notes: z.string().optional(),
  evidence: z.string().optional(),
});
export type LiveRunSheetItemUpdateDto = z.infer<typeof LiveRunSheetItemUpdateSchema>;

export const IncidentReportSchema = z.object({
  projectId: z.string(),
  timestamp: z.string().optional(),
  location: z.string().min(2),
  zone: z.string(),
  reporterId: z.string(),
  reporterName: z.string().optional(),
  incidentType: z.enum(['hse', 'medical', 'security', 'technical', 'operational', 'guest', 'asset_damage', 'property_damage', 'crowd', 'vendor', 'transport', 'weather']),
  severity: z.enum(['critical', 'major', 'moderate', 'minor', 'observation']),
  description: z.string().min(5),
  peopleInvolved: z.array(z.string()).default([]),
  assetsInvolved: z.array(z.string()).default([]),
  immediateAction: z.string().optional(),
  protectiveAction: z.enum(['none', 'stop_work', 'isolate_equipment', 'close_zone', 'evacuate_area', 'suspend_activity', 'request_medical']).default('none'),
  restrictedPersonalNarrative: z.string().optional(),
  clientSafeSummary: z.string().optional(),
  assignedOwnerId: z.string().optional(),
});
export type IncidentReportDto = z.infer<typeof IncidentReportSchema>;

export const IncidentProtectiveActionSchema = z.object({
  incidentId: z.string(),
  protectiveAction: z.enum(['stop_work', 'isolate_equipment', 'close_zone', 'evacuate_area', 'suspend_activity', 'request_medical']),
  justification: z.string().min(5),
  authorizedBy: z.string(),
  zone: z.string().optional(),
});
export type IncidentProtectiveActionDto = z.infer<typeof IncidentProtectiveActionSchema>;

export const MaintenanceFaultCreateSchema = z.object({
  projectId: z.string(),
  assetId: z.string(),
  assetName: z.string().optional(),
  fault: z.string().min(3),
  severity: z.enum(['critical', 'major', 'moderate', 'minor']),
  operationalImpact: z.string(),
  technicianId: z.string().optional(),
});
export type MaintenanceFaultCreateDto = z.infer<typeof MaintenanceFaultCreateSchema>;

export const MaintenanceFaultResolveSchema = z.object({
  faultId: z.string(),
  actionTaken: z.string().min(5),
  downtimeMinutes: z.number().default(0),
  resolutionNotes: z.string().optional(),
  resolvedBy: z.string(),
});
export type MaintenanceFaultResolveDto = z.infer<typeof MaintenanceFaultResolveSchema>;

export const ClientRequestLogSchema = z.object({
  projectId: z.string(),
  clientRep: z.string().min(2),
  requestText: z.string().min(5),
  urgency: z.enum(['low', 'medium', 'high', 'urgent']),
  zone: z.string(),
  impactNotes: z.string().optional(),
  costImpactEstimate: z.string().optional(),
  scheduleImpactEstimate: z.string().optional(),
});
export type ClientRequestLogDto = z.infer<typeof ClientRequestLogSchema>;

export const ShiftHandoverCreateSchema = z.object({
  projectId: z.string(),
  shiftName: z.string(),
  outgoingSupervisorId: z.string(),
  outgoingSupervisorName: z.string(),
  incomingSupervisorId: z.string(),
  incomingSupervisorName: z.string(),
  statusSummary: z.string().min(10),
  openIncidentIds: z.array(z.string()).default([]),
  openSnagIds: z.array(z.string()).default([]),
  delayedItemIds: z.array(z.string()).default([]),
  permitsExpiringIds: z.array(z.string()).default([]),
  nextCriticalActions: z.string().optional(),
  notes: z.string().optional(),
  mutualAcknowledgment: z.boolean().default(true),
});
export type ShiftHandoverCreateDto = z.infer<typeof ShiftHandoverCreateSchema>;

export const ZoneReadinessEvaluateSchema = z.object({
  projectId: z.string(),
  zone: z.string(),
  level: z.enum(['event', 'hall', 'zone', 'activation', 'stage', 'package']).default('zone'),
  readinessStatus: z.enum(['READY', 'READY_WITH_EXCEPTIONS', 'NOT_READY']),
  scorePercent: z.number().min(0).max(100),
  unresolvedCriticalItems: z.array(z.string()).default([]),
  exceptions: z.array(z.string()).default([]),
});
export type ZoneReadinessEvaluateDto = z.infer<typeof ZoneReadinessEvaluateSchema>;

export const OpeningReleaseDecisionSchema = z.object({
  projectId: z.string(),
  snapshotId: z.string(),
  decision: z.enum(['authorized', 'authorized_with_exceptions', 'not_authorized', 'suspended', 'revoked']),
  approver: z.string().min(2),
  authoritySource: z.string().min(2),
  comments: z.string().min(5),
  exceptionsAcknowledged: z.array(z.string()).default([]),
});
export type OpeningReleaseDecisionDto = z.infer<typeof OpeningReleaseDecisionSchema>;

export const BumpOutActivityUpdateSchema = z.object({
  projectId: z.string(),
  area: z.string(),
  status: z.enum(['planned', 'active', 'delayed', 'awaiting_inspection', 'complete', 'exception_open']),
  dismantleProgressPercent: z.number().min(0).max(100),
  assetRemovalProgressPercent: z.number().min(0).max(100),
  wasteCleared: z.boolean().default(false),
  reinstatementStatus: z.string(),
  notes: z.string().optional(),
});
export type BumpOutActivityUpdateDto = z.infer<typeof BumpOutActivityUpdateSchema>;

export const AssetReturnInspectionSchema = z.object({
  projectId: z.string(),
  assetId: z.string(),
  assetTag: z.string().optional(),
  assetName: z.string().optional(),
  outboundCondition: z.string().default('good'),
  returnCondition: z.enum(['good', 'maintenance_required', 'damaged', 'missing', 'quarantined', 'consumable', 'vendor_return_pending']),
  quantity: z.number().positive(),
  damageDescription: z.string().optional(),
  photoEvidenceUris: z.array(z.string()).default([]),
  claimPotential: z.boolean().default(false),
  claimValueEstimate: z.string().optional(),
  maintenanceRequirement: z.string().optional(),
  inspector: z.string(),
});
export type AssetReturnInspectionDto = z.infer<typeof AssetReturnInspectionSchema>;

export const ClaimsExposureLogSchema = z.object({
  projectId: z.string(),
  itemId: z.string(),
  itemDescription: z.string(),
  ownerType: z.enum(['e3_asset', 'rental_supplier', 'client_property', 'venue_infrastructure']),
  claimValueEstimate: z.string(),
  damageType: z.string(),
  responsibleParty: z.string(),
  vendorOrClientInvolved: z.string().optional(),
  evidenceUris: z.array(z.string()).default([]),
  status: z.enum(['identified', 'under_investigation', 'claimed', 'disputed', 'settled', 'written_off']).default('identified'),
});
export type ClaimsExposureLogDto = z.infer<typeof ClaimsExposureLogSchema>;

export const VenueHandoverSignoffSchema = z.object({
  projectId: z.string(),
  area: z.string(),
  clientVenueRep: z.string().min(2),
  reinstatementStatus: z.enum(['pending', 'inspected', 'accepted', 'remedial_required']),
  damageNotes: z.string().optional(),
  cleanlinessPassed: z.boolean().default(true),
  keysHandedBack: z.boolean().default(true),
  utilitiesChecked: z.boolean().default(true),
  signedBy: z.string().min(2),
  signedAt: z.string().optional(),
});
export type VenueHandoverSignoffDto = z.infer<typeof VenueHandoverSignoffSchema>;

export const OperationalClosureDecisionSchema = z.object({
  projectId: z.string(),
  closureConfirmed: z.boolean(),
  authorizedBy: z.string().min(2),
  justification: z.string().min(10),
  dimensionsChecked: z.object({
    eventOperationComplete: z.boolean(),
    bumpOutComplete: z.boolean(),
    venueHandoverComplete: z.boolean(),
    assetsReturned: z.boolean(),
    majorClaimsIdentified: z.boolean(),
    criticalIncidentsClosed: z.boolean(),
    siteEvidenceComplete: z.boolean(),
  }),
  openReceivablesAcknowledged: z.boolean().default(true),
});
export type OperationalClosureDecisionDto = z.infer<typeof OperationalClosureDecisionSchema>;

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
  mediaUploads: z.array(z.any()).default([]),
});
export type FieldSyncBatchDto = z.infer<typeof FieldSyncBatchSchema>;

// ============================================================================
// SPRINT 05: FINANCE RECONCILIATION, BILLING, REPORTING & CLOSEOUT SCHEMAS
// ============================================================================

export const SupplierInvoiceStatusEnum = z.enum([
  'received',
  'under_review',
  'match_exception',
  'approved',
  'partially_approved',
  'rejected',
  'payment_scheduled',
  'partially_paid',
  'paid',
  'disputed',
  'cancelled',
]);
export type SupplierInvoiceStatus = z.infer<typeof SupplierInvoiceStatusEnum>;

export const SupplierInvoiceCreateSchema = z.object({
  projectId: z.string(),
  vendorId: z.string(),
  poId: z.string().optional(),
  invoiceNumber: z.string().min(2),
  invoiceDate: z.string(),
  receivedDate: z.string().optional(),
  currency: z.string().default('QAR'),
  amountExcludingTax: z.number().nonnegative(),
  taxAmount: z.number().nonnegative().default(0),
  totalAmount: z.number().positive(),
  paymentTerms: z.string().default('30_days_net'),
  dueDate: z.string().optional(),
  supportingDocUri: z.string().optional(),
  lineItems: z.array(
    z.object({
      poLineId: z.string().optional(),
      description: z.string(),
      quantity: z.number().positive(),
      unitCost: z.number().nonnegative(),
      totalCost: z.number().nonnegative(),
    })
  ).default([]),
});
export type SupplierInvoiceCreateDto = z.infer<typeof SupplierInvoiceCreateSchema>;

export const SupplierInvoiceApproveSchema = z.object({
  invoiceId: z.string(),
  approvedAmount: z.number().positive(),
  authorizedBy: z.string().min(2),
  approverRole: z.string().default('commercial_director'),
  justification: z.string().min(5),
  poRemainingCommitmentAdjustment: z.number().nonnegative().optional(),
});
export type SupplierInvoiceApproveDto = z.infer<typeof SupplierInvoiceApproveSchema>;

export const ThreeWayMatchEvaluationSchema = z.object({
  invoiceId: z.string(),
  poId: z.string(),
  deliveryReceiptId: z.string().optional(),
  tolerancePercentage: z.number().default(0),
});
export type ThreeWayMatchEvaluationDto = z.infer<typeof ThreeWayMatchEvaluationSchema>;

export const InvoiceOcrConfirmSchema = z.object({
  fileHash: z.string(),
  extractedVendor: z.string().optional(),
  extractedInvoiceNumber: z.string(),
  extractedDate: z.string(),
  extractedCurrency: z.string().default('QAR'),
  extractedSubtotal: z.number().nonnegative(),
  extractedTax: z.number().nonnegative().default(0),
  extractedTotal: z.number().positive(),
  confirmedBy: z.string().min(2),
  confidenceScore: z.number().min(0).max(1),
  poNumber: z.string().optional(),
  projectId: z.string(),
  vendorId: z.string(),
});
export type InvoiceOcrConfirmDto = z.infer<typeof InvoiceOcrConfirmSchema>;

export const ClientInvoiceStatusEnum = z.enum([
  'draft',
  'internal_review',
  'ready_to_issue',
  'issued',
  'client_acknowledged',
  'partially_paid',
  'paid',
  'overdue',
  'disputed',
  'cancelled',
  'credited',
]);
export type ClientInvoiceStatus = z.infer<typeof ClientInvoiceStatusEnum>;

export const ClientInvoiceCreateSchema = z.object({
  projectId: z.string(),
  clientOrganisationId: z.string(),
  milestoneId: z.string().optional(),
  contractReference: z.string(),
  invoiceNumber: z.string().min(2),
  billingType: z.enum([
    'advance',
    'milestone',
    'progress',
    'final',
    'variation',
    'retention_release',
    'credit_note',
    'debit_adjustment',
  ]),
  currency: z.string().default('QAR'),
  invoiceDate: z.string(),
  dueDate: z.string(),
  grossAmount: z.number().positive(),
  taxAmount: z.number().nonnegative().default(0),
  retentionDeduction: z.number().nonnegative().default(0),
  netDueAmount: z.number().positive(),
  supportingDeliverablesJson: z.array(z.string()).default([]),
});
export type ClientInvoiceCreateDto = z.infer<typeof ClientInvoiceCreateSchema>;

export const PaymentMilestoneCreateSchema = z.object({
  projectId: z.string(),
  milestoneName: z.string().min(2),
  milestoneCode: z.string(),
  percentageOfContract: z.number().min(0).max(100),
  contractualAmount: z.number().positive(),
  plannedBillingDate: z.string(),
  evidenceRequirements: z.array(z.string()).default([]),
});
export type PaymentMilestoneCreateDto = z.infer<typeof PaymentMilestoneCreateSchema>;

export const CollectionRecordCreateSchema = z.object({
  clientInvoiceId: z.string(),
  projectId: z.string(),
  amountReceived: z.number().positive(),
  paymentDate: z.string(),
  paymentReference: z.string().min(2),
  paymentMethod: z.enum(['bank_transfer', 'cheque', 'credit_card', 'letter_of_credit']),
  withholdingTax: z.number().nonnegative().default(0),
  deductions: z.number().nonnegative().default(0),
  disputedBalance: z.number().nonnegative().default(0),
  bankAccountId: z.string().optional(),
  recordedBy: z.string().min(2),
});
export type CollectionRecordCreateDto = z.infer<typeof CollectionRecordCreateSchema>;

export const CommercialVariationCreateSchema = z.object({
  projectId: z.string(),
  variationCode: z.string(),
  title: z.string().min(2),
  source: z.enum([
    'client_request',
    'addendum',
    'site_instruction',
    'design_change',
    'quantity_change',
    'delay',
    'authority_requirement',
    'venue_requirement',
    'internal_error',
    'force_majeure',
    'other',
  ]),
  scopeDescription: z.string().min(10),
  costImpact: z.number(),
  sellImpact: z.number(),
  timeImpactDays: z.number().default(0),
  approvedCost: z.number().optional(),
  approvedSell: z.number().optional(),
  supportingEvidenceUri: z.string().optional(),
});
export type CommercialVariationCreateDto = z.infer<typeof CommercialVariationCreateSchema>;

export const ProjectExpenseClaimCreateSchema = z.object({
  projectId: z.string(),
  claimantId: z.string(),
  claimantName: z.string().min(2),
  date: z.string(),
  category: z.enum([
    'staff_expense',
    'project_cash_expense',
    'site_purchase',
    'transport',
    'crew_welfare',
    'emergency_purchase',
    'other',
  ]),
  supplierName: z.string().min(2),
  amount: z.number().positive(),
  currency: z.string().default('QAR'),
  receiptUri: z.string().optional(),
  reason: z.string().min(5),
  costCode: z.string().default('COST-OPS-MISC'),
});
export type ProjectExpenseClaimCreateDto = z.infer<typeof ProjectExpenseClaimCreateSchema>;

export const MultiCurrencyExchangeRateSchema = z.object({
  baseCurrency: z.string().length(3),
  transactionCurrency: z.string().length(3),
  exchangeRate: z.number().positive(),
  rateSource: z.string().default('Qatar Central Bank'),
  rateDate: z.string(),
});
export type MultiCurrencyExchangeRateDto = z.infer<typeof MultiCurrencyExchangeRateSchema>;

export const TaxConfigurationSchema = z.object({
  jurisdictionCode: z.string().min(2),
  taxName: z.string().min(2),
  taxType: z.enum(['vat', 'gst', 'sales_tax', 'zero_rated', 'exempt', 'withholding', 'reverse_charge']),
  standardRatePercent: z.number().min(0).max(100),
  reverseChargeApplicable: z.boolean().default(false),
});
export type TaxConfigurationDto = z.infer<typeof TaxConfigurationSchema>;

export const CommercialCloseoutDecisionSchema = z.object({
  projectId: z.string(),
  closureConfirmed: z.boolean(),
  authorizedBy: z.string().min(2),
  justification: z.string().min(10),
  checklist: z.object({
    allSupplierInvoicesReceived: z.boolean(),
    poCommitmentsClosed: z.boolean(),
    pendingVariationsResolved: z.boolean(),
    clientInvoicesIssued: z.boolean(),
    collectionsCompletedOrIsolated: z.boolean(),
    creditNotesResolved: z.boolean(),
    retentionsTracked: z.boolean(),
    claimsSettledOrBonded: z.boolean(),
    finalMarginReconciled: z.boolean(),
    commercialDocumentsComplete: z.boolean(),
  }),
  finalGrossMarginPercent: z.string(),
});
export type CommercialCloseoutDecisionDto = z.infer<typeof CommercialCloseoutDecisionSchema>;

export const PostEventReportCreateSchema = z.object({
  projectId: z.string(),
  reportTitle: z.string().min(5),
  executiveSummary: z.string().min(20),
  deliveredScopeOverview: z.string().min(20),
  attendanceHighlights: z.string(),
  safetyAchievements: z.string(),
  kpiPerformanceSummary: z.string(),
  clientRecommendations: z.string(),
  curatedPhotoUris: z.array(z.string()).default([]),
});
export type PostEventReportCreateDto = z.infer<typeof PostEventReportCreateSchema>;

export const ProjectKpiEvaluationSchema = z.object({
  projectId: z.string(),
  kpiCode: z.string(),
  name: z.string().min(2),
  targetValue: z.string(),
  actualValue: z.string(),
  status: z.enum(['not_started', 'measuring', 'met', 'partially_met', 'missed', 'exception_accepted']),
  evidenceReference: z.string().optional(),
});
export type ProjectKpiEvaluationDto = z.infer<typeof ProjectKpiEvaluationSchema>;

export const ClientFeedbackSubmissionSchema = z.object({
  projectId: z.string(),
  clientRepresentative: z.string().min(2),
  surveyMethod: z.enum(['portal_survey', 'structured_meeting', 'client_signoff', 'free_text']),
  overallRating: z.number().min(1).max(5),
  npsScore: z.number().min(0).max(10).optional(),
  feedbackComments: z.string().min(5),
});
export type ClientFeedbackSubmissionDto = z.infer<typeof ClientFeedbackSubmissionSchema>;

export const LessonsLearnedCreateSchema = z.object({
  projectId: z.string(),
  category: z.enum([
    'commercial',
    'procurement',
    'production',
    'logistics',
    'design',
    'venue',
    'client',
    'hse',
    'staffing',
    'technical',
    'marketing',
  ]),
  observation: z.string().min(10),
  rootCause: z.string().min(10),
  impact: z.string().min(10),
  recommendation: z.string().min(10),
  reusableAcrossProjects: z.boolean().default(true),
  applicableProjectTypes: z.array(z.string()).default([]),
});
export type LessonsLearnedCreateDto = z.infer<typeof LessonsLearnedCreateSchema>;

export const VendorPerformanceEvaluationSchema = z.object({
  vendorId: z.string(),
  projectId: z.string(),
  priceScore: z.number().min(1).max(5),
  qualityScore: z.number().min(1).max(5),
  deliveryScore: z.number().min(1).max(5),
  responsivenessScore: z.number().min(1).max(5),
  hseScore: z.number().min(1).max(5),
  evaluatorName: z.string().min(2),
  recommendForFutureProjects: z.boolean().default(true),
  narrativeComments: z.string().optional(),
});
export type VendorPerformanceEvaluationDto = z.infer<typeof VendorPerformanceEvaluationSchema>;

export const ConnectorConfigSchema = z.object({
  connectorType: z.enum(['erp_accounting', 'm365', 'google_workspace', 'crm', 'ticketing', 'marketing']),
  connectorName: z.string().min(2),
  systemOfRecordDomain: z.string(),
  endpointUrl: z.string().optional(),
  syncIntervalMinutes: z.number().default(60),
});
export type ConnectorConfigDto = z.infer<typeof ConnectorConfigSchema>;

export const ReconciliationExceptionResolveSchema = z.object({
  exceptionId: z.string(),
  resolutionAction: z.enum(['override_with_eos', 'accept_external', 'quarantine', 'manual_adjustment']),
  justification: z.string().min(5),
  resolvedBy: z.string().min(2),
});
export type ReconciliationExceptionResolveDto = z.infer<typeof ReconciliationExceptionResolveSchema>;

export const PeriodLockCreateSchema = z.object({
  projectId: z.string(),
  periodKey: z.string(), // e.g. '2026-08'
  lockedBy: z.string().min(2),
  snapshotNotes: z.string().optional(),
});
export type PeriodLockCreateDto = z.infer<typeof PeriodLockCreateSchema>;


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
