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

export class ProjectCloseoutEngine {
  /**
   * Evaluates operational closure against financial settlement (AT-078).
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
