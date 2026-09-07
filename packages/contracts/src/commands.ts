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
