/**
 * Requirements & Scope Traceability Engine
 * Core domain logic for E3 Event Operating System (EOS)
 *
 * Enforces the 7-Point Traceability Invariant:
 * Requirement = Owner + Date + Document + Design + Cost/BOQ + Approval + Delivery Evidence
 */

export type RequirementCategory =
  | 'staging_technical'
  | 'creative_visual'
  | 'protocol_ceremony'
  | 'health_safety'
  | 'commercial_contract'
  | 'operational_logistics';

export type ScopeRequirementDisposition =
  | 'applicable'
  | 'negotiated_out'
  | 'client_clarified'
  | 'transferred_to_subcontractor'
  | 'applicability_unknown'
  | 'applicable_open'
  | 'satisfied'
  | 'exception_authorised'
  | 'not_applicable'
  | 'formally_amended'
  | 'superseded';

export type FulfillmentStatus =
  | 'unassigned'
  | 'in_design'
  | 'costed'
  | 'scheduled'
  | 'approved'
  | 'delivered';

export interface ScopeRequirement {
  id: string;
  projectId: string;
  code?: string; // e.g. "REQ-QND-001"
  title: string;
  description: string;
  category?: RequirementCategory;
  sourceReference?: string; // e.g. "RFP Section 4.2.1 - Main Stage LED Arch"
  ownerId?: string;
  ownerName?: string;
  dueDate?: string; // ISO 8601 Date
  disposition: ScopeRequirementDisposition;
  deliverablePackageId?: string;
  linkedDocumentId?: string;
  linkedDocumentNumber?: string;
  linkedDesignId?: string;
  linkedDesignVersion?: string;
  linkedBoqLineCode?: string;
  linkedTaskId?: string;
  approvalRequestId?: string;
  isApproved?: boolean;
  deliveryEvidenceHash?: string;
  targetCostQar?: number;
  fulfillmentStatus?: FulfillmentStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface TraceabilityEvaluation {
  requirementId: string;
  code: string;
  hasOwner: boolean;
  hasTargetDate: boolean;
  hasControlledDocument: boolean;
  hasDesignVersion: boolean;
  hasBoqCost: boolean;
  hasApprovalSignoff: boolean;
  hasDeliveryEvidence: boolean;
  completedPoints: number;
  totalPoints: number;
  traceabilityScorePct: number;
  isFullyTraceable: boolean;
  missingAttributes: string[];
  riskRating: 'low' | 'medium' | 'high' | 'critical';
}

export interface TraceabilityMatrixReport {
  projectId: string;
  totalRequirements: number;
  applicableRequirements: number;
  negotiatedOutRequirements: number;
  fullyTraceableRequirements: number;
  unassignedRequirements: number;
  uncostedRequirements: number;
  unscheduledRequirements: number;
  overallTraceabilityPct: number;
  evaluations: TraceabilityEvaluation[];
  summaryByDiscipline: Record<string, { total: number; traceable: number }>;
}

/**
 * Evaluates a single requirement against the mandatory 7-point traceability invariant.
 */
export function evaluateRequirementTraceability(
  req: ScopeRequirement,
  context?: {
    isDeliveryStage?: boolean;
  }
): TraceabilityEvaluation {
  const missing: string[] = [];

  const hasOwner = Boolean(req.ownerId && req.ownerId.trim().length > 0);
  if (!hasOwner) missing.push('Assigned Owner (Lead PM / Discipline Lead)');

  const hasTargetDate = Boolean(req.dueDate && req.dueDate.trim().length > 0);
  if (!hasTargetDate) missing.push('Target Milestone Date');

  const hasControlledDocument = Boolean(req.linkedDocumentNumber || req.linkedDocumentId);
  if (!hasControlledDocument) missing.push('Controlled Document Reference');

  const hasDesignVersion = Boolean(req.linkedDesignVersion || req.linkedDesignId);
  if (!hasDesignVersion) missing.push('Technical CAD / Design Revision');

  const hasBoqCost = Boolean(req.linkedBoqLineCode || (req.targetCostQar !== undefined && req.targetCostQar > 0));
  if (!hasBoqCost) missing.push('Priced BOQ Line / Budget Allocation');

  const hasApprovalSignoff = Boolean(req.isApproved || req.approvalRequestId);
  if (!hasApprovalSignoff) missing.push('Governance Approval Sign-off');

  const hasDeliveryEvidence = Boolean(req.deliveryEvidenceHash && req.deliveryEvidenceHash.trim().length > 0);
  if (context?.isDeliveryStage && !hasDeliveryEvidence) {
    missing.push('Delivery Verification Evidence (Site Sign-off / Photo)');
  }

  const checkList = [
    hasOwner,
    hasTargetDate,
    hasControlledDocument,
    hasDesignVersion,
    hasBoqCost,
    hasApprovalSignoff,
    hasDeliveryEvidence,
  ];

  const totalPoints = checkList.length;
  const completedPoints = checkList.filter(Boolean).length;
  const traceabilityScorePct = Math.round((completedPoints / totalPoints) * 100);
  const isFullyTraceable = completedPoints === totalPoints;

  let riskRating: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (completedPoints <= 2) riskRating = 'critical';
  else if (completedPoints <= 4) riskRating = 'high';
  else if (completedPoints <= 6) riskRating = 'medium';

  return {
    requirementId: req.id,
    code: req.code || req.id,
    hasOwner,
    hasTargetDate,
    hasControlledDocument,
    hasDesignVersion,
    hasBoqCost,
    hasApprovalSignoff,
    hasDeliveryEvidence,
    completedPoints,
    totalPoints,
    traceabilityScorePct,
    isFullyTraceable,
    missingAttributes: missing,
    riskRating,
  };
}

/**
 * Builds the complete Traceability Matrix Report across all project requirements.
 */
export function generateRequirementsMatrix(
  projectId: string,
  requirements: ScopeRequirement[],
  options?: { isDeliveryStage?: boolean }
): TraceabilityMatrixReport {
  const evaluations = requirements.map((r) =>
    evaluateRequirementTraceability(r, { isDeliveryStage: options?.isDeliveryStage })
  );

  const applicableList = requirements.filter((r) => r.disposition === 'applicable');
  const negotiatedOut = requirements.filter((r) => r.disposition === 'negotiated_out');

  const fullyTraceableCount = evaluations.filter((e) => e.isFullyTraceable).length;
  const unassignedCount = evaluations.filter((e) => !e.hasOwner).length;
  const uncostedCount = evaluations.filter((e) => !e.hasBoqCost).length;
  const unscheduledCount = evaluations.filter((e) => !e.hasTargetDate).length;

  const totalScoreSum = evaluations.reduce((sum, e) => sum + e.traceabilityScorePct, 0);
  const overallTraceabilityPct = evaluations.length > 0 ? Math.round(totalScoreSum / evaluations.length) : 0;

  const summaryByDiscipline: Record<string, { total: number; traceable: number }> = {};
  for (let i = 0; i < requirements.length; i++) {
    const cat = requirements[i].category || 'staging_technical';
    if (!summaryByDiscipline[cat]) {
      summaryByDiscipline[cat] = { total: 0, traceable: 0 };
    }
    summaryByDiscipline[cat].total++;
    if (evaluations[i].isFullyTraceable) {
      summaryByDiscipline[cat].traceable++;
    }
  }

  return {
    projectId,
    totalRequirements: requirements.length,
    applicableRequirements: applicableList.length,
    negotiatedOutRequirements: negotiatedOut.length,
    fullyTraceableRequirements: fullyTraceableCount,
    unassignedRequirements: unassignedCount,
    uncostedRequirements: uncostedCount,
    unscheduledRequirements: unscheduledCount,
    overallTraceabilityPct,
    evaluations,
    summaryByDiscipline,
  };
}
