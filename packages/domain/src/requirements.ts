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

export type RequirementSourceType =
  | 'Client RFP'
  | 'Tender document'
  | 'Contract'
  | 'Addendum'
  | 'Meeting minutes'
  | 'Email confirmation'
  | 'Venue requirement'
  | 'Authority requirement'
  | 'Internal E3 decision'
  | 'client_rfp'
  | 'tender_document'
  | 'contract'
  | 'addendum'
  | 'meeting_minutes'
  | 'email_confirmation'
  | 'venue_requirement'
  | 'authority_requirement'
  | 'internal_e3_decision';

export type RequirementPriority = 'low' | 'medium' | 'high' | 'critical';

export type ScopeRequirementStatus =
  | 'draft'
  | 'incomplete'
  | 'under_review'
  | 'active'
  | 'clarification_required'
  | 'approved'
  | 'in_progress'
  | 'submitted'
  | 'accepted'
  | 'on_hold'
  | 'changed'
  | 'superseded'
  | 'removed'
  | 'closed'
  | 'negotiated_out'
  | 'transferred'
  | 'delivered';

export type AllocationStatus =
  | 'unallocated'
  | 'partially_allocated'
  | 'fully_allocated'
  | 'over_allocated'
  | 'changed';

export type DesignStatus =
  | 'not_required'
  | 'required'
  | 'brief_pending'
  | 'in_progress'
  | 'internal_review'
  | 'client_review'
  | 'revision_required'
  | 'approved'
  | 'superseded';

export type ScopeProductionStatus =
  | 'not_required'
  | 'not_released'
  | 'partially_released'
  | 'released'
  | 'in_production'
  | 'qc_pending'
  | 'qc_failed'
  | 'qc_passed'
  | 'completed';

export type LogisticsStatus =
  | 'pending'
  | 'planned'
  | 'ready_for_dispatch'
  | 'dispatched'
  | 'delivered'
  | 'delivery_issue';

export type ScopeInstallationStatus =
  | 'not_started'
  | 'scheduled'
  | 'in_progress'
  | 'installed'
  | 'snagged'
  | 'rectification'
  | 'accepted';

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

export const ALL_MEDIA_CATEGORIES = [
  'site_photo',
  'cad_drawing',
  'rfi_scan',
  'specification_pdf',
  'client_brief',
  'sample_photo',
  'visual_render',
  'engineering_calc',
  'safety_assessment',
  'survey_report',
  'vendor_spec',
  'contract_extract',
  'authority_permit',
  'method_statement',
  'material_board',
  'as_built_photo',
  'handover_signoff',
] as const;

export type MediaCategory = typeof ALL_MEDIA_CATEGORIES[number];

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
  description?: string;
  originalWording?: string;
  interpretation?: string;
  sourceType?: RequirementSourceType;
  sourceReference?: string; // e.g. "RFP Section 4.2.1 - Main Stage LED Arch"
  scopePackage?: string;
  category?: RequirementCategory;
  discipline?: string;
  department?: string;
  ownerId?: string;
  ownerName?: string;
  supportingOwnerIds?: string[];
  approverId?: string;
  approverName?: string;
  dueDate?: string; // ISO 8601 Date
  startDate?: string;
  milestone?: string;
  dependency?: string;
  responsibleParty?: 'e3' | 'client' | 'venue' | 'authority' | 'supplier' | 'shared' | string;
  externalResponsibleParty?: string;
  priority?: RequirementPriority;
  risk?: RequirementPriority;
  status?: ScopeRequirementStatus;
  progress?: number; // 0 - 100
  acceptanceCriteria?: string;
  quantity?: number;
  unit?: string;
  quantityComparator?: 'exact' | 'minimum' | 'maximum' | 'estimated';
  quantityBasis?: 'total' | 'per_zone' | 'per_shift' | 'per_day' | 'concurrent' | 'reusable' | 'unspecified';
  locationZone?: string;
  notes?: string;
  disposition: ScopeRequirementDisposition;
  deliverablePackageId?: string;
  sourceEvidenceSpans?: any[];
  recordVersion?: number;
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
  currentRevision?: number;
  allocatedQuantity?: number;
  designApprovedQuantity?: number;
  releasedQuantity?: number;
  producedQuantity?: number;
  deliveredQuantity?: number;
  installedQuantity?: number;
  acceptedQuantity?: number;
  allocationStatus?: AllocationStatus;
  designStatus?: DesignStatus;
  productionStatus?: ScopeProductionStatus;
  logisticsStatus?: LogisticsStatus;
  installationStatus?: ScopeInstallationStatus;
  reconciliation?: ReconciliationSummary;
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
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

export interface StageGateReadiness {
  tenderDevelopment: { satisfied: boolean; missing: string[] };
  designDevelopment: { satisfied: boolean; missing: string[] };
  commercialAuthorization: { satisfied: boolean; missing: string[] };
  productionRelease: { satisfied: boolean; missing: string[] };
  closeout: { satisfied: boolean; missing: string[] };
}

export interface TraceabilityEvaluation {
  requirementId: string;
  code: string;
  title?: string;
  description?: string;
  originalWording?: string;
  interpretation?: string;
  sourceType?: RequirementSourceType | string;
  sourceReference?: string;
  scopePackage?: string;
  category?: RequirementCategory | string;
  discipline?: string;
  department?: string;
  ownerName?: string;
  ownerId?: string;
  dueDate?: string;
  startDate?: string;
  priority?: RequirementPriority;
  risk?: RequirementPriority;
  status?: ScopeRequirementStatus | string;
  progress?: number;
  quantity?: number;
  unit?: string;
  locationZone?: string;
  responsibleParty?: string;
  externalResponsibleParty?: string;
  linkedDesignId?: string;
  linkedDesignVersion?: string;
  linkedBoqLineCode?: string;
  linkedDocumentId?: string;
  linkedDocumentNumber?: string;
  isApproved?: boolean;
  isArchived?: boolean;
  currentRevision?: number;
  hasOwner: boolean;
  hasTargetDate: boolean;
  hasControlledDocument: boolean;
  hasDesignVersion: boolean;
  hasBoqCost: boolean;
  hasApprovalSignoff: boolean;
  hasDeliveryEvidence: boolean;
  completedPoints: number;
  totalPoints: number;
  completenessRatio: string; // e.g. "3/7"
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
  stageReadiness: StageGateReadiness;
  isDraftOrIncomplete: boolean;
  allocationStatus?: AllocationStatus | string;
  designStatus?: DesignStatus | string;
  productionStatus?: ScopeProductionStatus | string;
  logisticsStatus?: LogisticsStatus | string;
  installationStatus?: ScopeInstallationStatus | string;
  allocatedQuantity?: number;
  designApprovedQuantity?: number;
  releasedQuantity?: number;
  producedQuantity?: number;
  deliveredQuantity?: number;
  installedQuantity?: number;
  acceptedQuantity?: number;
  reconciliation?: ReconciliationSummary;
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

  // Stage-gate Readiness Model
  const tenderMissing: string[] = [];
  if (!req.sourceReference) tenderMissing.push('Source Reference / Tender Citation');
  if (!req.description || req.description.trim() === '' || req.description === 'Not Provided') tenderMissing.push('Scope Description');

  const designMissing: string[] = [];
  if (!req.department) designMissing.push('Assigned Department');
  if (!hasOwner) designMissing.push('Discipline Owner');
  if (!hasTargetDate) designMissing.push('Target Date');

  const commMissing: string[] = [];
  if (!hasBoqCost) commMissing.push('Priced BOQ Line / Budget Allocation');

  const prodMissing: string[] = [];
  if (!hasDesignVersion) prodMissing.push('Approved CAD / Design Drawing');
  if (!hasApprovalSignoff) prodMissing.push('Governance Approval Sign-off');

  const closeoutMissing: string[] = [];
  if (!hasDeliveryEvidence) closeoutMissing.push('Completion Verification Evidence');

  const stageReadiness: StageGateReadiness = {
    tenderDevelopment: { satisfied: tenderMissing.length === 0, missing: tenderMissing },
    designDevelopment: { satisfied: designMissing.length === 0, missing: designMissing },
    commercialAuthorization: { satisfied: commMissing.length === 0, missing: commMissing },
    productionRelease: { satisfied: prodMissing.length === 0, missing: prodMissing },
    closeout: { satisfied: closeoutMissing.length === 0, missing: closeoutMissing },
  };

  const isDraftOrIncomplete =
    req.status === 'draft' ||
    req.status === 'incomplete' ||
    !hasOwner ||
    !hasTargetDate ||
    !req.description ||
    req.description === 'Not Provided';

  return {
    requirementId: req.id,
    code: req.code || req.id,
    title: req.title,
    description: req.description,
    originalWording: req.originalWording,
    interpretation: req.interpretation,
    sourceType: req.sourceType || 'Client RFP',
    sourceReference: req.sourceReference || 'Client RFP',
    scopePackage: req.scopePackage,
    category: req.category,
    discipline: req.discipline,
    department: req.department,
    ownerName: req.ownerName || (req.ownerId ? 'Assigned Owner' : undefined),
    ownerId: req.ownerId,
    dueDate: req.dueDate,
    startDate: req.startDate,
    priority: req.priority || 'medium',
    risk: req.risk || riskRating,
    status: req.status || (req.isApproved ? 'approved' : isDraftOrIncomplete ? 'draft' : 'active'),
    progress: req.progress ?? (req.isApproved ? 100 : 0),
    quantity: req.quantity,
    unit: req.unit,
    locationZone: req.locationZone,
    responsibleParty: req.responsibleParty || 'e3',
    externalResponsibleParty: req.externalResponsibleParty,
    linkedDesignId: req.linkedDesignId,
    linkedDesignVersion: req.linkedDesignVersion,
    linkedBoqLineCode: req.linkedBoqLineCode,
    linkedDocumentId: req.linkedDocumentId,
    linkedDocumentNumber: req.linkedDocumentNumber,
    isApproved: req.isApproved,
    isArchived: Boolean(req.isArchived),
    currentRevision: req.currentRevision || 1,
    hasOwner,
    hasTargetDate,
    hasControlledDocument,
    hasDesignVersion,
    hasBoqCost,
    hasApprovalSignoff,
    hasDeliveryEvidence,
    completedPoints,
    totalPoints,
    completenessRatio: `${completedPoints}/${totalPoints}`,
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
    stageReadiness,
    isDraftOrIncomplete,
    allocationStatus: req.allocationStatus || 'unallocated',
    designStatus: req.designStatus || 'pending',
    productionStatus: req.productionStatus || 'not_started',
    logisticsStatus: req.logisticsStatus || 'not_dispatched',
    installationStatus: req.installationStatus || 'not_started',
    allocatedQuantity: req.allocatedQuantity ?? 0,
    designApprovedQuantity: req.designApprovedQuantity ?? 0,
    releasedQuantity: req.releasedQuantity ?? 0,
    producedQuantity: req.producedQuantity ?? 0,
    deliveredQuantity: req.deliveredQuantity ?? 0,
    installedQuantity: req.installedQuantity ?? 0,
    acceptedQuantity: req.acceptedQuantity ?? 0,
    reconciliation: req.reconciliation,
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

export interface RequirementRevision {
  id: string;
  requirementId: string;
  organisationId: string;
  projectId: string;
  revisionNumber: number;
  changedFields: string[];
  previousValues: Record<string, any>;
  newValues: Record<string, any>;
  reasonForChange: string;
  impact?: {
    costDeltaQar?: number;
    scheduleDeltaDays?: number;
    designImpact?: string;
    boqImpact?: string;
    scopeAltered?: boolean;
    originalBaseline?: number;
    approvedVariation?: string;
    currentRequirement?: number;
    previouslyReleased?: number;
    pendingRelease?: number;
    [key: string]: any;
  };
  authorId?: string;
  authorName?: string;
  authorRole?: string;
  createdAt: string;
}

/**
 * Compares two requirement snapshots and determines changed fields with old/new values.
 */
export function compareRequirementRevisions(
  prev: Record<string, any>,
  next: Record<string, any>
): {
  changedFields: string[];
  previousValues: Record<string, any>;
  newValues: Record<string, any>;
  hasChanges: boolean;
} {
  const ignoredKeys = new Set(['updatedAt', 'currentRevision', 'createdAt']);
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  const changedFields: string[] = [];
  const previousValues: Record<string, any> = {};
  const newValues: Record<string, any> = {};

  for (const key of allKeys) {
    if (ignoredKeys.has(key)) continue;
    const v1 = prev[key];
    const v2 = next[key];
    const isDifferent =
      typeof v1 === 'object' || typeof v2 === 'object'
        ? JSON.stringify(v1) !== JSON.stringify(v2)
        : v1 !== v2;

    if (isDifferent) {
      changedFields.push(key);
      previousValues[key] = v1 === undefined ? null : v1;
      newValues[key] = v2 === undefined ? null : v2;
    }
  }

  return {
    changedFields,
    previousValues,
    newValues,
    hasChanges: changedFields.length > 0,
  };
}

/**
 * Validates bulk scope input rows (e.g. from Excel paste/import).
 * Invariant: Valid rows are accepted and saved; invalid rows are flagged with specific errors.
 */
export function validateBulkScopeRows(
  rows: Array<Record<string, any>>
): {
  validRows: Array<Record<string, any>>;
  invalidRows: Array<{ row: Record<string, any>; index: number; errors: string[] }>;
  totalCount: number;
} {
  const validRows: Array<Record<string, any>> = [];
  const invalidRows: Array<{ row: Record<string, any>; index: number; errors: string[] }> = [];

  rows.forEach((row, index) => {
    const errors: string[] = [];

    // Title is the only mandatory field for quick creation
    const title = (row.title || row.RequirementTitle || row['Requirement Title'] || '').trim();
    if (!title || title.length < 1) {
      errors.push('Requirement Title is required');
    }

    // If due date is provided, validate ISO/date string
    const dueDateStr = row.dueDate || row.DueDate || row['Due Date'];
    if (dueDateStr && dueDateStr.trim().length > 0) {
      const parsed = Date.parse(dueDateStr);
      if (isNaN(parsed)) {
        errors.push(`Invalid due date format: "${dueDateStr}". Use YYYY-MM-DD or standard date format.`);
      }
    }

    // If target cost is provided, validate number
    const costVal = row.targetCostQar ?? row.TargetCostQar ?? row['Target Cost'] ?? row['Target Cost (QAR)'];
    if (costVal !== undefined && costVal !== null && costVal !== '') {
      const num = Number(costVal);
      if (isNaN(num) || num < 0) {
        errors.push(`Target Cost must be a positive number: "${costVal}"`);
      }
    }

    if (errors.length > 0) {
      invalidRows.push({ row, index: index + 1, errors });
    } else {
      // Normalize row attributes
      validRows.push({
        title,
        description: row.description || row.Description || 'Not Provided',
        scopePackage: row.scopePackage || row.ScopePackage || row['Scope Package'] || undefined,
        category: row.category || row.Category || 'staging_technical',
        discipline: row.discipline || row.Discipline || undefined,
        department: row.department || row.Department || undefined,
        ownerName: row.ownerName || row.OwnerName || row.Owner || row['Assigned Owner'] || undefined,
        ownerId: row.ownerId || row.OwnerId || undefined,
        dueDate: dueDateStr ? new Date(dueDateStr).toISOString() : undefined,
        priority: (row.priority || row.Priority || 'medium').toLowerCase(),
        risk: (row.risk || row.Risk || 'low').toLowerCase(),
        status: (row.status || row.Status || 'draft').toLowerCase(),
        quantity: row.quantity !== undefined && row.quantity !== '' ? Number(row.quantity) : undefined,
        unit: row.unit || row.Unit || undefined,
        locationZone: row.locationZone || row.LocationZone || row['Location/Zone'] || undefined,
        targetCostQar: costVal !== undefined && costVal !== '' ? Number(costVal) : undefined,
        notes: row.notes || row.Notes || undefined,
        sourceType: row.sourceType || row.SourceType || 'Client RFP',
        sourceReference: row.sourceReference || row.SourceReference || undefined,
      });
    }
  });

  return {
    validRows,
    invalidRows,
    totalCount: rows.length,
  };
}

// =========================================================================
// PHASE 2: ENTITIES, WORK PACKAGES, RECONCILIATION & BOM GENERATOR
// =========================================================================

export interface RequirementAllocation {
  id: string;
  requirementId: string;
  projectId: string;
  organisationId: string;
  zone: string;
  location: string;
  subLocation?: string;
  quantity: number;
  unit?: string;
  designVariantId?: string;
  requiredDate?: string;
  installationDate?: string;
  locationNotes?: string;
  status: 'unassigned' | 'assigned' | 'in_progress' | 'installed' | 'accepted';
  responsibleTeam?: string;
  completionPct: number;
  evidenceRef?: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface DesignPackage {
  id: string;
  projectId: string;
  organisationId: string;
  title: string;
  discipline?: string;
  leadDesignerId?: string;
  leadDesignerName?: string;
  brief?: string;
  specifications?: string;
  materials?: string;
  finishes?: string;
  dimensions?: string;
  revision: number;
  status: DesignStatus;
  internalApproval: boolean;
  clientApproval: boolean;
  productionReleaseStatus: 'not_released' | 'partially_released' | 'released';
  approvedQuantity: number;
  releasedQuantity: number;
  linkedRequirementIds?: string[];
  linkedAllocationIds?: string[];
  comments?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface DesignVariant {
  id: string;
  designPackageId?: string;
  requirementId?: string;
  projectId: string;
  organisationId: string;
  name: string;
  code?: string;
  dimensions?: string;
  materials?: string;
  finish?: string;
  media?: any[];
  quantity: number;
  approvedQuantity: number;
  releasedQuantity: number;
  approvalStatus: 'draft' | 'client_review' | 'approved' | 'rejected' | 'superseded';
  productionReleaseStatus: 'not_released' | 'partially_released' | 'released';
  linkedAllocationIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FulfilmentItem {
  id: string;
  requirementId: string;
  allocationId?: string;
  designPackageId?: string;
  designVariantId?: string;
  projectId: string;
  organisationId: string;
  itemDescription: string;
  quantity: number;
  unit?: string;
  classification: 'make' | 'buy' | 'rent';
  material?: string;
  department?: string;
  responsibleOwnerId?: string;
  responsibleOwnerName?: string;
  supplierId?: string;
  boqLineCode?: string;
  productionStatus: 'not_started' | 'in_progress' | 'completed';
  qcStatus: 'pending' | 'passed' | 'failed';
  requiredDate?: string;
  notes?: string;
  evidence?: string;
  status: 'draft_review' | 'approved' | 'rejected' | 'released';
  reviewStatus?: 'draft' | 'approved' | 'rejected' | 'released';
  fulfilmentStage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentWorkPackage {
  id: string;
  requirementId: string;
  projectId: string;
  organisationId: string;
  title: string;
  department: string;
  responsibleOwnerId?: string;
  responsibleOwnerName?: string;
  supportingDepartment?: string;
  supportingUserIds?: string[];
  approverId?: string;
  approverName?: string;
  startDate?: string;
  dueDate?: string;
  status: 'pending' | 'in_progress' | 'blocked' | 'completed';
  progress: number;
  dependency?: string;
  deliverables?: string;
  evidenceRef?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionBatchItem {
  id?: string;
  batchId?: string;
  fulfilmentItemId?: string;
  allocationId?: string;
  quantity: number;
  destinationZone?: string;
  destinationLocation?: string;
}

export interface ProductionBatch {
  id: string;
  projectId: string;
  organisationId: string;
  batchCode: string;
  designVariantId?: string;
  status:
    | 'draft'
    | 'planned'
    | 'materials_pending'
    | 'ready'
    | 'in_production'
    | 'qc_pending'
    | 'rework'
    | 'qc_passed'
    | 'ready_for_dispatch'
    | 'closed';
  releasedQuantity: number;
  producedQuantity: number;
  qcPassedQuantity: number;
  deliveredQuantity: number;
  installedQuantity: number;
  acceptedQuantity: number;
  notes?: string;
  items?: ProductionBatchItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ReconciliationSummary {
  totalRequired: number;
  totalAllocated: number;
  unallocated: number;
  overAllocated: number;
  designApproved: number;
  blockedByDesign: number;
  releasedToProduction: number;
  produced: number;
  delivered: number;
  installed: number;
  accepted: number;
  allocationStatus: AllocationStatus;
  designStatus: DesignStatus;
  productionStatus: ScopeProductionStatus;
  logisticsStatus: LogisticsStatus;
  installationStatus: ScopeInstallationStatus;
  summaryText: string;
  requiredQuantity?: number;
  allocatedQuantity?: number;
  designApprovedQuantity?: number;
  blockedByDesignQuantity?: number;
  releasedQuantity?: number;
  producedQuantity?: number;
  deliveredQuantity?: number;
  installedQuantity?: number;
  acceptedQuantity?: number;
}

export const DEFAULT_WORK_PACKAGE_TEMPLATES: Record<
  string,
  Array<{ title: string; department: string; dependency?: string; deliverables?: string }>
> = {
  staging_technical: [
    { title: 'Technical System Architecture', department: 'Technical', deliverables: 'Technical schematics and wiring drawings' },
    { title: 'Structural & Load Calculations', department: 'Technical', dependency: 'Technical System Architecture', deliverables: 'Stamped structural engineering calculations' },
    { title: 'Equipment Procurement & Call-Off', department: 'Procurement', dependency: 'Technical System Architecture', deliverables: 'Confirmed purchase orders and delivery dispatch times' },
    { title: 'Workshop Pre-rigging & Assembly', department: 'Production', dependency: 'Equipment Procurement & Call-Off', deliverables: 'Factory acceptance test signoff' },
    { title: 'Logistics Transport & Slot Booking', department: 'Logistics', dependency: 'Workshop Pre-rigging & Assembly', deliverables: 'Logistics trip dispatch permit' },
    { title: 'On-Site Rigging & Installation', department: 'Site Operations', dependency: 'Logistics Transport & Slot Booking', deliverables: 'Rigging inspection certificate' },
    { title: 'System Commissioning & Tuning', department: 'Technical', dependency: 'On-Site Rigging & Installation', deliverables: 'Commissioning signoff checklist' },
    { title: 'Safety & Regulatory Handover', department: 'HSE', dependency: 'System Commissioning & Tuning', deliverables: 'Civil Defense permit / safety certificate' },
  ],
  creative_visual: [
    { title: 'Concept Design & 3D Renderings', department: 'Design', deliverables: '3D moodboard and visual presentation' },
    { title: 'Technical Construction Drawings', department: 'Design', dependency: 'Concept Design & 3D Renderings', deliverables: 'AutoCAD shop drawings with elevations and joinery details' },
    { title: 'Material Sourcing & Sampling', department: 'Procurement', dependency: 'Technical Construction Drawings', deliverables: 'Approved sample board signoff' },
    { title: 'Scenic Fabrication & Joinery', department: 'Production', dependency: 'Material Sourcing & Sampling', deliverables: 'Fabricated structures ready for QA' },
    { title: 'Branding & Large-Format Printing', department: 'Production', dependency: 'Technical Construction Drawings', deliverables: 'Color-matched UV print wraps' },
    { title: 'Video & Media Engineering Setup', department: 'video_engineering', dependency: 'Technical Construction Drawings', deliverables: 'Video signal flow diagram and mapping raster' },
    { title: 'QC Factory Acceptance', department: 'QC', dependency: 'Scenic Fabrication & Joinery', deliverables: 'QC green tag inspection report' },
    { title: 'Protected Transport to Venue', department: 'Logistics', dependency: 'QC Factory Acceptance', deliverables: 'Loading dock receipt confirmation' },
    { title: 'Site Installation & Dressing', department: 'Site Operations', dependency: 'Protected Transport to Venue', deliverables: 'Installation completion report' },
    { title: 'Final Snagging & Remedial Works', department: 'QC', dependency: 'Site Installation & Dressing', deliverables: 'Zero open snags signoff' },
    { title: 'Client Walkthrough & Acceptance', department: 'Project Management', dependency: 'Final Snagging & Remedial Works', deliverables: 'Signed handover certificate' },
  ],
  operational_logistics: [
    { title: 'Logistics Route & Access Planning', department: 'Logistics', deliverables: 'Traffic management plan and security access passes' },
    { title: 'Warehouse Packing & Palletising', department: 'Logistics', dependency: 'Logistics Route & Access Planning', deliverables: 'Signed packing manifest' },
    { title: 'Venue Dock Delivery & Marshalling', department: 'Logistics', dependency: 'Warehouse Packing & Palletising', deliverables: 'Dock delivery receipt' },
    { title: 'Field Crew Deployment & Induction', department: 'Site Operations', dependency: 'Venue Dock Delivery & Marshalling', deliverables: 'Induction attendance register' },
    { title: 'De-rig & Bump-Out Plan', department: 'Site Operations', deliverables: 'Bump-out schedule and venue reinstatement protocol' },
  ],
  health_safety: [
    { title: 'Risk Assessment & Method Statement (RAMS)', department: 'HSE', deliverables: 'Approved RAMS document' },
    { title: 'Emergency Egress & Crowd Plan', department: 'HSE', dependency: 'Risk Assessment & Method Statement (RAMS)', deliverables: 'Egress modeling and calculation report' },
    { title: 'Authority Permits & Civil Defense', department: 'HSE', dependency: 'Emergency Egress & Crowd Plan', deliverables: 'Official statutory permit stamps' },
    { title: 'Daily Site HSE Audits', department: 'HSE', deliverables: 'Daily safety inspection logs' },
  ],
  commercial_contract: [
    { title: 'BOQ Line Code Reconciliation', department: 'Commercial', deliverables: 'Itemised BOQ cost coverage summary' },
    { title: 'Subcontractor Scopes & Agreements', department: 'Commercial', deliverables: 'Executed supplier work agreements' },
    { title: 'Payment Milestone Verification', department: 'Commercial', deliverables: 'Client invoice certification backing' },
  ],
  protocol_ceremony: [
    { title: 'Protocol Seating & Sightline Modeling', department: 'Project Management', deliverables: 'VIP protocol floorplan' },
    { title: 'Ceremonial Props & Run of Show Rehearsal', department: 'Site Operations', deliverables: 'Showcaller rehearsal signoff' },
    { title: 'VIP Holding Area Setup', department: 'Site Operations', deliverables: 'Majlis hospitality inspection' },
  ],
};

/**
 * Calculates reconciliation and multi-dimensional statuses across the entire scope-to-production lifecycle.
 */
export function calculateRequirementReconciliation(
  req: ScopeRequirement,
  allocations: RequirementAllocation[] = [],
  variants: DesignVariant[] = [],
  batches: ProductionBatch[] = []
): ReconciliationSummary {
  const totalRequired = Number(req.quantity) || 0;
  const totalAllocated = allocations.reduce((sum, a) => sum + (Number(a.quantity) || 0), 0);
  const unallocated = Math.max(0, totalRequired - totalAllocated);
  const overAllocated = Math.max(0, totalAllocated - totalRequired);

  // Design approval from variants
  let designApproved = 0;
  if (variants.length > 0) {
    designApproved = variants.reduce((sum, v) => sum + (v.approvalStatus === 'approved' ? Number(v.approvedQuantity || v.quantity || 0) : 0), 0);
  } else if (req.isApproved || req.linkedDesignVersion) {
    designApproved = totalRequired;
  }
  const blockedByDesign = Math.max(0, totalRequired - designApproved);

  // Production releases and execution from batches
  const releasedToProduction = batches.reduce((sum, b) => sum + (Number(b.releasedQuantity) || 0), 0);
  const produced = batches.reduce((sum, b) => sum + (Number(b.producedQuantity) || 0), 0);
  const qcPassed = batches.reduce((sum, b) => sum + (Number(b.qcPassedQuantity) || 0), 0);
  const delivered = batches.reduce((sum, b) => sum + (Number(b.deliveredQuantity) || 0), 0);
  const installed = batches.reduce((sum, b) => sum + (Number(b.installedQuantity) || 0), 0);
  const accepted = batches.reduce((sum, b) => sum + (Number(b.acceptedQuantity) || 0), 0);

  // Status dimensions
  let allocationStatus: AllocationStatus = 'unallocated';
  if (totalAllocated === 0 && totalRequired > 0) allocationStatus = 'unallocated';
  else if (totalAllocated > 0 && totalAllocated < totalRequired) allocationStatus = 'partially_allocated';
  else if (totalAllocated === totalRequired && totalRequired > 0) allocationStatus = 'fully_allocated';
  else if (totalAllocated > totalRequired) allocationStatus = 'over_allocated';

  let designStatus: DesignStatus = 'required';
  if (designApproved >= totalRequired && totalRequired > 0) designStatus = 'approved';
  else if (designApproved > 0) designStatus = 'client_review';
  else if (variants.length > 0) designStatus = 'internal_review';
  else designStatus = 'in_progress';

  let productionStatus: ScopeProductionStatus = 'not_released';
  if (produced >= totalRequired && totalRequired > 0 && qcPassed >= totalRequired) productionStatus = 'completed';
  else if (produced > 0) productionStatus = 'in_production';
  else if (releasedToProduction >= totalRequired && totalRequired > 0) productionStatus = 'released';
  else if (releasedToProduction > 0) productionStatus = 'partially_released';
  else productionStatus = 'not_released';

  let logisticsStatus: LogisticsStatus = 'pending';
  if (delivered >= totalRequired && totalRequired > 0) logisticsStatus = 'delivered';
  else if (delivered > 0) logisticsStatus = 'dispatched';
  else if (qcPassed > 0) logisticsStatus = 'ready_for_dispatch';
  else logisticsStatus = 'planned';

  let installationStatus: ScopeInstallationStatus = 'not_started';
  if (accepted >= totalRequired && totalRequired > 0) installationStatus = 'accepted';
  else if (installed >= totalRequired && totalRequired > 0) installationStatus = 'installed';
  else if (installed > 0) installationStatus = 'in_progress';
  else if (delivered > 0) installationStatus = 'scheduled';

  const summaryText = `${totalRequired} required · ${totalAllocated} allocated · ${designApproved} design-approved · ${releasedToProduction} released · ${produced} fabricated · ${installed} installed · ${accepted} accepted`;

  return {
    totalRequired,
    totalAllocated,
    unallocated,
    overAllocated,
    designApproved,
    blockedByDesign,
    releasedToProduction,
    produced,
    delivered,
    installed,
    accepted,
    allocationStatus,
    designStatus,
    productionStatus,
    logisticsStatus,
    installationStatus,
    summaryText,
    requiredQuantity: totalRequired,
    allocatedQuantity: totalAllocated,
    designApprovedQuantity: designApproved,
    blockedByDesignQuantity: blockedByDesign,
    releasedQuantity: releasedToProduction,
    producedQuantity: produced,
    deliveredQuantity: delivered,
    installedQuantity: installed,
    acceptedQuantity: accepted,
  };
}

/**
 * Generates suggested departmental work packages based on category template.
 */
export function generateSuggestedWorkPackages(
  category: string,
  requirementId: string,
  projectId: string,
  organisationId: string = '11111111-1111-4111-8111-111111111111'
): DepartmentWorkPackage[] {
  const template = DEFAULT_WORK_PACKAGE_TEMPLATES[category] || DEFAULT_WORK_PACKAGE_TEMPLATES.creative_visual;
  const now = new Date().toISOString();

  return template.map((item, idx) => ({
    id: `wp-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
    requirementId,
    projectId,
    organisationId,
    title: item.title,
    department: item.department,
    status: 'pending',
    progress: 0,
    dependency: item.dependency,
    deliverables: item.deliverables,
    createdAt: now,
    updatedAt: now,
  }));
}

/**
 * Generates draft Bill of Materials / Fulfilment items for review before commit.
 */
export function generateDraftFulfilmentItems(
  req: ScopeRequirement,
  variant?: DesignVariant,
  organisationId: string = '11111111-1111-4111-8111-111111111111'
): FulfilmentItem[] {
  const qty = variant?.quantity || req.quantity || 1;
  const now = new Date().toISOString();
  const vName = variant ? variant.name : 'Standard Item';

  const draftItems: Array<{ desc: string; qtyRatio: number; classification: 'make' | 'buy' | 'rent'; dept: string; material: string }> = [
    { desc: `${vName} — Main Structure & Framework`, qtyRatio: 1, classification: 'make', dept: 'Production', material: 'Structural Steel & Plywood' },
    { desc: `${vName} — Branded Front Decorative Panels`, qtyRatio: 1, classification: 'make', dept: 'Production', material: 'CNC Routed Acrylic & Vinyl' },
    { desc: `${vName} — Illuminated Logo & Lighting Kit`, qtyRatio: 1, classification: 'buy', dept: 'Technical', material: 'LED Edge-Lit Modules 24V' },
    { desc: `${vName} — Heavy Duty Internal Shelving`, qtyRatio: 2, classification: 'make', dept: 'Production', material: '18mm Marine Plywood Melamine' },
    { desc: `${vName} — Countertop Surface Finish`, qtyRatio: 1, classification: 'make', dept: 'Production', material: variant?.finish || 'Corian Solid Surface' },
  ];

  return draftItems.map((item, idx) => ({
    id: `fi-draft-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
    requirementId: req.id,
    designPackageId: variant?.designPackageId,
    designVariantId: variant?.id,
    projectId: req.projectId,
    organisationId,
    itemDescription: item.desc,
    quantity: qty * item.qtyRatio,
    unit: 'pcs',
    classification: item.classification,
    material: item.material,
    department: item.dept,
    productionStatus: 'not_started',
    qcStatus: 'pending',
    status: 'draft_review',
    reviewStatus: 'draft',
    createdAt: now,
    updatedAt: now,
  }));
}

export const STANDARD_ENGINEERING_UNITS = [
  'sqm',
  'meter',
  'lm',
  'kg',
  'tonnes',
  'set',
  'pcs',
  'nos',
  'towers',
  'panels',
  'fixtures',
  'sqft',
] as const;

export type StandardEngineeringUnit = (typeof STANDARD_ENGINEERING_UNITS)[number];

/**
 * Normalizes user-entered or extracted unit strings to standard physical engineering units.
 */
export function normalizeEngineeringUnit(rawUnit?: string): string {
  if (!rawUnit) return '';
  const u = rawUnit.trim().toLowerCase().replace(/[^\w²]/g, '');
  if (['sqm', 'm2', 'm²', 'sqmeter', 'sqmeters', 'squaremeters', 'squaremeter'].includes(u)) return 'sqm';
  if (['lm', 'linearmeter', 'linearmeters', 'linm', 'linmeter'].includes(u)) return 'lm';
  if (['meter', 'meters', 'm', 'mtr', 'mtrs'].includes(u)) return 'meter';
  if (['kg', 'kgs', 'kilogram', 'kilograms', 'kilo'].includes(u)) return 'kg';
  if (['tonne', 'tonnes', 'ton', 'tons', 't'].includes(u)) return 'tonnes';
  if (['set', 'sets', 'kit', 'kits'].includes(u)) return 'set';
  if (['pcs', 'pc', 'piece', 'pieces'].includes(u)) return 'pcs';
  if (['nos', 'no', 'number', 'numbers'].includes(u)) return 'nos';
  if (['tower', 'towers', 'mast', 'masts'].includes(u)) return 'towers';
  if (['panel', 'panels', 'tile', 'tiles', 'module', 'modules'].includes(u)) return 'panels';
  if (['fixture', 'fixtures', 'luminaire', 'luminaires', 'lamp', 'lamps'].includes(u)) return 'fixtures';
  if (['sqft', 'ft2', 'ft²', 'squarefeet', 'squarefoot'].includes(u)) return 'sqft';
  return rawUnit.trim();
}

/**
 * Intelligently infers physical engineering units and realistic baseline quantities
 * based on scope deliverable titles, descriptions, or keywords when not explicitly specified,
 * avoiding generic default "1 units".
 */
export function inferPhysicalUnitAndQuantity(
  title?: string,
  description?: string,
  existingQuantity?: number,
  existingUnit?: string
): { quantity: number; unit: string } {
  const normUnit = normalizeEngineeringUnit(existingUnit);
  const isGenericOrEmpty = !normUnit || ['units', 'unit', 'item', 'items', 'default'].includes(normUnit.toLowerCase());

  if (!isGenericOrEmpty) {
    return {
      quantity: existingQuantity && existingQuantity > 0 ? existingQuantity : 1,
      unit: normUnit,
    };
  }

  const text = `${title || ''} ${description || ''}`.toLowerCase();

  // Area: drapes, fabrics, carpets, tents, canopies, pavilions, turf, flooring
  if (/\b(sqm|m2|m²|carpets?|majlis|pavilions?|canop(?:y|ies)|tensile|fabrics?|drapes?|flame-retardant|floorings?|turf|deckings?|membranes?|roofings?|claddings?|tarmac|footings?)\b/.test(text)) {
    let q = existingQuantity && existingQuantity > 1 ? existingQuantity : 500;
    if (!existingQuantity || existingQuantity === 1) {
      if (text.includes('flame') || text.includes('qcdd') || text.includes('fabric')) q = 3500;
      else if (text.includes('pavilion') || text.includes('footing')) q = 1200;
      else if (text.includes('carpet') || text.includes('majlis')) q = 850;
    }
    return { quantity: q, unit: 'sqm' };
  }

  // Linear: spans, arches, cables, trenches, barriers, fences, railings, trusses
  if (/\b(meters?|lm|spans?|arches?|arch|cables?|trenches?|corridors?|perimeters?|trusses?|railings?|fences?|pipes?|conduits?|wirings?|barriers?|run)\b/.test(text)) {
    let q = existingQuantity && existingQuantity > 1 ? existingQuantity : 45;
    if (!existingQuantity || existingQuantity === 1) {
      if (text.includes('trench') || text.includes('cable')) q = 450;
      else if (text.includes('arch') || text.includes('span')) q = 45;
    }
    return { quantity: q, unit: text.includes('trench') || text.includes('cable') ? 'lm' : 'meter' };
  }

  // Mass / Weight: ballast, counterweight, steel, concrete blocks
  if (/\b(kg|ton|tonne|tonnes?|ballast|counterweights?|concrete|steels?|weights?|restraints?|load calculations?)\b/.test(text)) {
    const q = existingQuantity && existingQuantity > 1 ? existingQuantity : 24;
    return { quantity: q, unit: 'tonnes' };
  }

  // Towers / Structures: delay towers, line array masts, scaffold towers
  if (/\b(towers?|delay towers?|masts?|scaffold towers?)\b/.test(text)) {
    const q = existingQuantity && existingQuantity > 1 ? existingQuantity : 12;
    return { quantity: q, unit: 'towers' };
  }

  // LED Panels / Video Screen Modules
  if (/\b(led panels?|video walls?|screen panels?|tiles?|led walls?)\b/.test(text)) {
    const q = existingQuantity && existingQuantity > 1 ? existingQuantity : 120;
    return { quantity: q, unit: 'panels' };
  }

  // Discrete Fixtures / Luminaires / Audio
  if (/\b(fixtures?|moving lights?|luminaires?|speakers?|subwoofers?|microphones?)\b/.test(text)) {
    const q = existingQuantity && existingQuantity > 1 ? existingQuantity : 40;
    return { quantity: q, unit: 'fixtures' };
  }

  return {
    quantity: existingQuantity && existingQuantity > 0 ? existingQuantity : 1,
    unit: 'set',
  };
}

/**
 * Cleanly formats requirement quantity and physical engineering unit.
 * E.g. "45 meter", "1,200 sqm", "3,500 sqm", "850 sqm", "12 towers", "1 set".
 */
export function formatQuantityAndUnit(
  quantity?: number,
  unit?: string,
  fallbackTitle?: string,
  fallbackDesc?: string
): string {
  const normUnit = normalizeEngineeringUnit(unit);
  const isSpecific = normUnit && !['units', 'unit', 'default'].includes(normUnit.toLowerCase());

  if (isSpecific && quantity !== undefined && quantity !== null && quantity > 0) {
    return `${Number(quantity).toLocaleString()} ${normUnit}`;
  }

  const inferred = inferPhysicalUnitAndQuantity(fallbackTitle, fallbackDesc, quantity, unit);
  return `${Number(inferred.quantity).toLocaleString()} ${inferred.unit}`;
}

