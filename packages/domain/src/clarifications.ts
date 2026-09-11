/**
 * Clarifications & RFI Management Engine
 * Core domain logic for E3 Event Operating System (EOS)
 *
 * Tracks formal inquiries, client addenda, and contractual scope/cost/timeline impacts.
 */

export type ClarificationCategory =
  | 'commercial'
  | 'technical'
  | 'venue_operations'
  | 'protocol'
  | 'schedule';

export type ClarificationSource =
  | 'bidder_inquiry'
  | 'client_query'
  | 'subcontractor_query';

export type ClarificationStatus =
  | 'draft'
  | 'submitted_to_client'
  | 'answered'
  | 'closed'
  | 'superseded';

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
  question: string;
  category: ClarificationCategory;
  source: ClarificationSource;
  rfpSectionRef?: string;
  submittedAt: string;
  dueAt: string;
  response?: string;
  respondedBy?: string;
  respondedAt?: string;
  status: ClarificationStatus;
  impact: ClarificationImpact;
  linkedRequirementIds: string[];
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
 * Identifies urgent open clarifications approaching tender submission deadlines.
 */
export function getUrgentClarifications(
  items: ClarificationItem[],
  deadlineThresholdMs: number = 72 * 3600 * 1000 // 72 hours default
): ClarificationItem[] {
  const now = Date.now();
  return items.filter((item) => {
    if (item.status === 'closed' || item.status === 'answered' || item.status === 'superseded') {
      return false;
    }
    const dueTime = new Date(item.dueAt).getTime();
    return dueTime - now <= deadlineThresholdMs;
  });
}
