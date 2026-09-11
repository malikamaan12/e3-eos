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

export type DimensionMaturityStatus =
  | 'Complete'
  | 'Missing'
  | 'Required Later'
  | 'Not Applicable'
  | 'Exception Authorized';

export interface TraceabilityDimensionDetail {
  name: string;
  key:
    | 'owner'
    | 'targetDate'
    | 'controlledDocument'
    | 'designVersion'
    | 'boqCost'
    | 'approvalSignoff'
    | 'deliveryEvidence';
  status: DimensionMaturityStatus;
  evidenceRef?: string;
  reason?: string;
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
  traceabilityScorePct: number; // Alias for overallTraceabilityPct
  overallTraceabilityPct: number;
  currentStageRequiredPoints: number;
  currentStageCompletedPoints: number;
  currentStageMaturityPct: number;
  isFullyTraceable: boolean;
  isStageMaturitySatisfied: boolean;
  dimensions: TraceabilityDimensionDetail[];
  missingAttributes: string[];
  riskRating: 'low' | 'medium' | 'high' | 'critical';
}

export interface TraceabilityMatrixReport {
  projectId: string;
  currentStageNumber: number;
  totalRequirements: number;
  applicableRequirements: number;
  negotiatedOutRequirements: number;
  fullyTraceableRequirements: number;
  stageMaturitySatisfiedCount: number;
  unassignedRequirements: number;
  uncostedRequirements: number;
  unscheduledRequirements: number;
  overallTraceabilityPct: number;
  currentStageMaturityPct: number;
  evaluations: TraceabilityEvaluation[];
  summaryByDiscipline: Record<string, { total: number; traceable: number }>;
}

/**
 * Evaluates a single requirement against the stage-aware 7-point traceability maturity model.
 */
export function evaluateRequirementTraceability(
  req: ScopeRequirement,
  context?: {
    currentStageNumber?: number;
    isDeliveryStage?: boolean;
  }
): TraceabilityEvaluation {
  const missing: string[] = [];
  const currentStage = context?.currentStageNumber ?? (context?.isDeliveryStage ? 10 : 4);

  const hasOwner = Boolean(req.ownerId && req.ownerId.trim().length > 0);
  const hasTargetDate = Boolean(req.dueDate && req.dueDate.trim().length > 0);
  const hasControlledDocument = Boolean(req.linkedDocumentNumber || req.linkedDocumentId);
  const hasDesignVersion = Boolean(req.linkedDesignVersion || req.linkedDesignId);
  const hasBoqCost = Boolean(req.linkedBoqLineCode || (req.targetCostQar !== undefined && req.targetCostQar > 0));
  const hasApprovalSignoff = Boolean(req.isApproved || req.approvalRequestId);
  const hasDeliveryEvidence = Boolean(req.deliveryEvidenceHash && req.deliveryEvidenceHash.trim().length > 0);

  const isNotApplicable = req.disposition === 'not_applicable' || req.disposition === 'negotiated_out';
  const isException = req.disposition === 'exception_authorised';

  function resolveDimension(
    name: string,
    key: TraceabilityDimensionDetail['key'],
    fulfilled: boolean,
    requiredAtStage: number,
    evidenceRef?: string,
    missingLabel?: string
  ): TraceabilityDimensionDetail {
    if (isNotApplicable) {
      return { name, key, status: 'Not Applicable', reason: `Requirement disposition is ${req.disposition}` };
    }
    if (isException) {
      return { name, key, status: 'Exception Authorized', reason: 'Formal governance exception waiver active' };
    }
    if (fulfilled) {
      return { name, key, status: 'Complete', evidenceRef };
    }
    if (missingLabel) {
      missing.push(missingLabel);
    }
    if (currentStage < requiredAtStage) {
      return { name, key, status: 'Required Later', reason: `Scheduled for fulfillment in Stage ${String(requiredAtStage).padStart(2, '0')}` };
    }
    return { name, key, status: 'Missing', reason: `Mandatory attribute missing for Stage ${String(currentStage).padStart(2, '0')}` };
  }

  const dimensions: TraceabilityDimensionDetail[] = [
    resolveDimension('Assigned Owner', 'owner', hasOwner, 2, req.ownerName || req.ownerId, 'Assigned Owner (Lead PM / Discipline Lead)'),
    resolveDimension('Target Date', 'targetDate', hasTargetDate, 2, req.dueDate, 'Target Milestone Date'),
    resolveDimension('Controlled Document', 'controlledDocument', hasControlledDocument, 3, req.linkedDocumentNumber || req.linkedDocumentId, 'Controlled Document Reference'),
    resolveDimension('Design Revision', 'designVersion', hasDesignVersion, 4, req.linkedDesignVersion || req.linkedDesignId, 'Technical CAD / Design Revision'),
    resolveDimension('BOQ Line Cost', 'boqCost', hasBoqCost, 5, req.linkedBoqLineCode || (req.targetCostQar ? `${req.targetCostQar} QAR` : undefined), 'Priced BOQ Line / Budget Allocation'),
    resolveDimension('Governance Approval', 'approvalSignoff', hasApprovalSignoff, 6, req.approvalRequestId || (req.isApproved ? 'Approved' : undefined), 'Governance Approval Sign-off'),
    resolveDimension('Delivery Evidence', 'deliveryEvidence', hasDeliveryEvidence, 9, req.deliveryEvidenceHash, 'Delivery Verification Evidence (Site Sign-off / Photo)'),
  ];

  // Overall points (all 7)
  const checkList = [hasOwner, hasTargetDate, hasControlledDocument, hasDesignVersion, hasBoqCost, hasApprovalSignoff, hasDeliveryEvidence];
  const totalPoints = 7;
  const completedPoints = checkList.filter(Boolean).length;
  const overallTraceabilityPct = Math.round((completedPoints / totalPoints) * 100);
  const isFullyTraceable = completedPoints === totalPoints;

  // Stage-aware points
  const stageRequiredDims = dimensions.filter((d) => d.status === 'Complete' || d.status === 'Missing');
  const currentStageRequiredPoints = Math.max(stageRequiredDims.length, 1);
  const currentStageCompletedPoints = stageRequiredDims.filter((d) => d.status === 'Complete').length;
  const currentStageMaturityPct = Math.round((currentStageCompletedPoints / currentStageRequiredPoints) * 100);
  const isStageMaturitySatisfied = currentStageCompletedPoints === currentStageRequiredPoints;

  let riskRating: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (!isStageMaturitySatisfied) {
    if (completedPoints <= 2) riskRating = 'critical';
    else if (completedPoints <= 4) riskRating = 'high';
    else riskRating = 'medium';
  } else {
    // All current stage requirements are satisfied: low risk for current stage
    riskRating = 'low';
  }

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
    traceabilityScorePct: overallTraceabilityPct,
    overallTraceabilityPct,
    currentStageRequiredPoints,
    currentStageCompletedPoints,
    currentStageMaturityPct,
    isFullyTraceable,
    isStageMaturitySatisfied,
    dimensions,
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
  options?: { currentStageNumber?: number; isDeliveryStage?: boolean }
): TraceabilityMatrixReport {
  const currentStageNumber = options?.currentStageNumber ?? (options?.isDeliveryStage ? 10 : 4);
  const evaluations = requirements.map((r) =>
    evaluateRequirementTraceability(r, { currentStageNumber, isDeliveryStage: options?.isDeliveryStage })
  );

  const applicableList = requirements.filter((r) => r.disposition === 'applicable');
  const negotiatedOut = requirements.filter((r) => r.disposition === 'negotiated_out');

  const fullyTraceableCount = evaluations.filter((e) => e.isFullyTraceable).length;
  const stageMaturitySatisfiedCount = evaluations.filter((e) => e.isStageMaturitySatisfied).length;
  const unassignedCount = evaluations.filter((e) => !e.hasOwner).length;
  const uncostedCount = evaluations.filter((e) => !e.hasBoqCost).length;
  const unscheduledCount = evaluations.filter((e) => !e.hasTargetDate).length;

  const totalOverallScoreSum = evaluations.reduce((sum, e) => sum + e.overallTraceabilityPct, 0);
  const overallTraceabilityPct = evaluations.length > 0 ? Math.round(totalOverallScoreSum / evaluations.length) : 0;

  const totalStageScoreSum = evaluations.reduce((sum, e) => sum + e.currentStageMaturityPct, 0);
  const currentStageMaturityPct = evaluations.length > 0 ? Math.round(totalStageScoreSum / evaluations.length) : 0;

  const summaryByDiscipline: Record<string, { total: number; traceable: number }> = {};
  for (let i = 0; i < requirements.length; i++) {
    const cat = requirements[i].category || 'staging_technical';
    if (!summaryByDiscipline[cat]) {
      summaryByDiscipline[cat] = { total: 0, traceable: 0 };
    }
    summaryByDiscipline[cat].total++;
    if (evaluations[i].isStageMaturitySatisfied) {
      summaryByDiscipline[cat].traceable++;
    }
  }

  return {
    projectId,
    currentStageNumber,
    totalRequirements: requirements.length,
    applicableRequirements: applicableList.length,
    negotiatedOutRequirements: negotiatedOut.length,
    fullyTraceableRequirements: fullyTraceableCount,
    stageMaturitySatisfiedCount,
    unassignedRequirements: unassignedCount,
    uncostedRequirements: uncostedCount,
    unscheduledRequirements: unscheduledCount,
    overallTraceabilityPct,
    currentStageMaturityPct,
    evaluations,
    summaryByDiscipline,
  };
}
