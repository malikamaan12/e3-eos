/**
 * Clarifications & RFI Management Engine
 * Core domain logic for E3 Event Operating System (EOS)
 *
 * Tracks formal inquiries, client addenda, and contractual scope/cost/timeline impacts.
 */

export type ClarificationCategory =
  | 'technical'
  | 'commercial'
  | 'venue'
  | 'operations'
  | 'protocol'
  | 'safety'
  | 'design'
  | 'venue_operations'
  | 'schedule';

export type ClarificationSource =
  | 'bidder_inquiry'
  | 'client_query'
  | 'subcontractor_query';

export type ClarificationStatus =
  | 'draft'
  | 'internal_review'
  | 'submitted'
  | 'submitted_to_client' // compatibility alias for submitted
  | 'awaiting_response'
  | 'answered'
  | 'superseded'
  | 'withdrawn'
  | 'closed';

export interface ClarificationImpact {
  hasScopeImpact: boolean;
  hasCostImpact: boolean;
  hasScheduleImpact: boolean;
  estimatedCostImpactQar?: number;
  estimatedScheduleImpactDays?: number;
  requiresVariationOrder: boolean;
  notes?: string;
}

export interface ClarificationItem {
  id: string;
  projectId: string;
  clarificationCode: string; // e.g. "RFI-QND-001"
  title: string;
  question: string;
  category: ClarificationCategory;
  discipline: string; // e.g. "staging", "audio_visual", "lighting", "health_safety", "commercial"
  source: ClarificationSource;
  author: string;
  assignedResponder: string;
  dateRaised: string; // ISO 8601
  targetResponseDate: string; // ISO 8601
  dueAt: string; // alias for targetResponseDate
  closedDate?: string;
  hasCommercialImpact: boolean;
  hasScheduleImpact: boolean;
  rfpSectionRef?: string;
  submittedAt?: string;
  response?: string;
  respondedBy?: string;
  respondedAt?: string;
  status: ClarificationStatus;
  impact: ClarificationImpact;
  // Explicit 5-module link pickers
  linkedRequirementIds: string[];
  linkedDesignIds: string[];
  linkedBoqLineCodes: string[];
  linkedScheduleTaskIds: string[];
  linkedDocumentNumbers: string[];
  createdAt: string;
}

/**
 * Assesses contractual and commercial impact of an answered clarification or addendum.
 */
export function assessClarificationImpact(item: {
  response?: string;
  costDeltaQar?: number;
  scheduleDeltaDays?: number;
  scopeAltered?: boolean;
}): ClarificationImpact {
  const hasCost = Boolean(item.costDeltaQar && Math.abs(item.costDeltaQar) > 0);
  const hasSchedule = Boolean(item.scheduleDeltaDays && Math.abs(item.scheduleDeltaDays) > 0);
  const hasScope = Boolean(item.scopeAltered);

  const requiresVo = (hasCost && (item.costDeltaQar || 0) > 0) || hasSchedule || hasScope;

  return {
    hasScopeImpact: hasScope,
    hasCostImpact: hasCost,
    hasScheduleImpact: hasSchedule,
    estimatedCostImpactQar: item.costDeltaQar || 0,
    estimatedScheduleImpactDays: item.scheduleDeltaDays || 0,
    requiresVariationOrder: requiresVo,
  };
}

/**
 * Calculates countdown hours to target response deadline (< 72h highlighted as urgent).
 */
export function getClarificationCountdownHours(
  item: ClarificationItem,
  referenceNowMs: number = Date.now()
): { hoursRemaining: number; isUrgent: boolean; isOverdue: boolean } {
  if (
    item.status === 'closed' ||
    item.status === 'answered' ||
    item.status === 'superseded' ||
    item.status === 'withdrawn'
  ) {
    return { hoursRemaining: 0, isUrgent: false, isOverdue: false };
  }

  const targetDateStr = item.targetResponseDate || item.dueAt;
  const targetMs = new Date(targetDateStr).getTime();
  const diffHours = (targetMs - referenceNowMs) / (3600 * 1000);

  const isOverdue = diffHours <= 0;
  const isUrgent = diffHours > 0 && diffHours <= 72;

  return {
    hoursRemaining: Math.round(diffHours * 10) / 10,
    isUrgent,
    isOverdue,
  };
}

/**
 * Evaluates cross-module impact of a clarification across Requirements, Designs, BOQ, Timeline, and Documents.
 * Guarantees that baseline data is strictly preserved unless an approved change order is authorized.
 */
export function evaluateClarificationCrossModuleImpact(
  clarification: ClarificationItem,
  baselineState: {
    approvedBudgetQar: number;
    approvedDurationDays: number;
  }
): {
  affectedModules: string[];
  preservesBaseline: boolean;
  requiresVariationOrder: boolean;
  impactDetails: Array<{ module: string; reference: string; summary: string }>;
} {
  const affectedModules: string[] = [];
  const impactDetails: Array<{ module: string; reference: string; summary: string }> = [];

  if (clarification.linkedRequirementIds && clarification.linkedRequirementIds.length > 0) {
    affectedModules.push('Requirements');
    for (const reqId of clarification.linkedRequirementIds) {
      impactDetails.push({
        module: 'Requirements',
        reference: reqId,
        summary: `Scope clarification pending resolution against requirement ${reqId}.`,
      });
    }
  }

  if (clarification.linkedDesignIds && clarification.linkedDesignIds.length > 0) {
    affectedModules.push('Design & Creative');
    for (const desId of clarification.linkedDesignIds) {
      impactDetails.push({
        module: 'Design & Creative',
        reference: desId,
        summary: `CAD drawings / elevations for package ${desId} may require revision upon response.`,
      });
    }
  }

  if (clarification.linkedBoqLineCodes && clarification.linkedBoqLineCodes.length > 0) {
    affectedModules.push('Commercial / BOQ');
    for (const boqCode of clarification.linkedBoqLineCodes) {
      impactDetails.push({
        module: 'Commercial / BOQ',
        reference: boqCode,
        summary: `Cost rate for BOQ line ${boqCode} tagged for potential variation (Current baseline ${baselineState.approvedBudgetQar.toLocaleString()} QAR remains protected).`,
      });
    }
  }

  if (clarification.linkedScheduleTaskIds && clarification.linkedScheduleTaskIds.length > 0) {
    affectedModules.push('Timeline / Gantt');
    for (const taskId of clarification.linkedScheduleTaskIds) {
      impactDetails.push({
        module: 'Timeline / Gantt',
        reference: taskId,
        summary: `Task ${taskId} delivery window potentially impacted (Current project baseline ${baselineState.approvedDurationDays} days remains unchanged).`,
      });
    }
  }

  if (clarification.linkedDocumentNumbers && clarification.linkedDocumentNumbers.length > 0) {
    affectedModules.push('Controlled Documents');
    for (const docNum of clarification.linkedDocumentNumbers) {
      impactDetails.push({
        module: 'Controlled Documents',
        reference: docNum,
        summary: `Controlled document ${docNum} flagged for revision pack upon clarification closure.`,
      });
    }
  }

  const requiresVo = clarification.impact.requiresVariationOrder || clarification.hasCommercialImpact || clarification.hasScheduleImpact;

  return {
    affectedModules,
    preservesBaseline: true, // Baseline is immutable without client-approved variation order
    requiresVariationOrder: requiresVo,
    impactDetails,
  };
}

/**
 * Identifies urgent open clarifications approaching tender submission deadlines.
 */
export function getUrgentClarifications(
  items: ClarificationItem[],
  deadlineThresholdMs: number = 72 * 3600 * 1000 // 72 hours default
): ClarificationItem[] {
  const now = Date.now();
  return items.filter((item) => {
    if (
      item.status === 'closed' ||
      item.status === 'answered' ||
      item.status === 'superseded' ||
      item.status === 'withdrawn'
    ) {
      return false;
    }
    const dueTime = new Date(item.targetResponseDate || item.dueAt).getTime();
    return dueTime - now <= deadlineThresholdMs;
  });
}
