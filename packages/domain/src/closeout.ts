export type CloseoutDimension =
  | 'operational'
  | 'client_acceptance'
  | 'reporting'
  | 'financial_review'
  | 'settlement';

export interface ProjectCloseoutState {
  projectId: string;
  operationalStatus: 'active' | 'operational_closed';
  operationalClosedAt?: Date;
  operationalClosedBy?: string;
  acceptanceStatus: 'pending' | 'accepted';
  reportingStatus: 'draft' | 'published';
  financialReviewStatus: 'pending' | 'completed';
  settlementStatus: 'open_receivables' | 'fully_settled';
  openReceivablesCount: number;
}

export interface LessonLearned {
  id: string;
  projectId: string;
  title: string;
  category: 'procurement' | 'logistics' | 'safety' | 'commercial';
  narrative: string;
  policyRevisionProposed: boolean;
  masterPolicyModified: boolean; // Must remain false on capture
}

import { safeSha256 } from './crypto-util.js';

export class ProjectCloseoutEngine {
  /**
   * Evaluates operational closure against financial settlement (AT-065, AT-078).
   * Invariant: An event project can achieve operational closure while settlement remains open
   * (e.g. pending client final milestone payment or supplier retention release).
   */
  static closeOperationally(
    state: ProjectCloseoutState,
    closedBy: string
  ): ProjectCloseoutState {
    return {
      ...state,
      operationalStatus: 'operational_closed',
      operationalClosedAt: new Date(),
      operationalClosedBy: closedBy,
      // settlementStatus remains untouched (e.g. open_receivables)
    };
  }

  /**
   * Evaluates operational closure eligibility across 7 operational pillars (AT-065).
   * Invariant AT-065: Multi-dimensional operational closure. Event delivery can be operationally closed
   * with venue returned and assets accounted for, while commercial retention and open receivables
   * remain tracked separately until final financial settlement.
   */
  static evaluateOperationalClosure(params: {
    projectId: string;
    checklist: {
      eventOperationComplete: boolean;
      bumpOutComplete: boolean;
      venueHandoverComplete: boolean;
      assetsReturned: boolean;
      majorClaimsIdentified: boolean;
      criticalIncidentsClosed: boolean;
      siteEvidenceComplete: boolean;
    };
    openReceivablesAcknowledged: boolean;
    signoffBy: string;
    signoffRole: string;
  }): {
    eligible: boolean;
    decision: 'operationally_closed' | 'conditional_closure' | 'rejected';
    unmetPillars: string[];
    closureRecord?: {
      id: string;
      projectId: string;
      decision: 'operationally_closed' | 'conditional_closure' | 'rejected';
      checklist: typeof params.checklist;
      openReceivablesAcknowledged: boolean;
      signoffBy: string;
      signoffRole: string;
      auditHash: string;
      signedAt: string;
    };
  } {
    const unmet: string[] = [];
    if (!params.checklist.eventOperationComplete) unmet.push('Event Delivery Incomplete');
    if (!params.checklist.bumpOutComplete) unmet.push('Bump-Out Activities Incomplete');
    if (!params.checklist.venueHandoverComplete) unmet.push('Venue Reinstatement / Handover Incomplete');
    if (!params.checklist.assetsReturned) unmet.push('Asset Returns and Inspections Incomplete');
    if (!params.checklist.majorClaimsIdentified) unmet.push('Major Claims Exposure Not Assessed');
    if (!params.checklist.criticalIncidentsClosed) unmet.push('Critical Safety Incidents Remain Open');
    if (!params.checklist.siteEvidenceComplete) unmet.push('Immutable Daily Site Evidence Incomplete');

    if (unmet.length > 0) {
      return {
        eligible: false,
        decision: 'rejected',
        unmetPillars: unmet,
      };
    }

    const id = `op-close-${params.projectId}-${Date.now()}`;
    const signedAt = new Date().toISOString();

    const auditPayload = {
      id,
      projectId: params.projectId,
      decision: 'operationally_closed',
      checklist: params.checklist,
      openReceivablesAcknowledged: params.openReceivablesAcknowledged,
      signoffBy: params.signoffBy,
      signoffRole: params.signoffRole,
      signedAt,
    };

    const auditHash = safeSha256(auditPayload);

    return {
      eligible: true,
      decision: 'operationally_closed',
      unmetPillars: [],
      closureRecord: {
        id,
        projectId: params.projectId,
        decision: 'operationally_closed',
        checklist: params.checklist,
        openReceivablesAcknowledged: params.openReceivablesAcknowledged,
        signoffBy: params.signoffBy,
        signoffRole: params.signoffRole,
        auditHash,
        signedAt,
      },
    };
  }

  /**
   * Captures a lesson learned (AT-078 / P05-ST08).
   * Invariant: A lesson learned does not automatically mutate a master company governance policy.
   */
  static captureLesson(
    projectId: string,
    lessonInput: Omit<LessonLearned, 'id' | 'projectId' | 'masterPolicyModified'>
  ): LessonLearned {
    return {
      id: `lsn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      projectId,
      title: lessonInput.title,
      category: lessonInput.category,
      narrative: lessonInput.narrative,
      policyRevisionProposed: lessonInput.policyRevisionProposed,
      masterPolicyModified: false, // Invariant: policy modification requires explicit governance approval
    };
  }
}

