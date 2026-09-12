export interface WorkflowStageConfig {
  stageCode: string;
  name: string;
  order: number;
  requiredActivities: string[];
  requiredGateApprovals: string[];
}

export interface WorkflowDefinition {
  workflowCode: string;
  name: string;
  description?: string;
  stages: WorkflowStageConfig[];
  isDefault: boolean;
}

export interface StageTransitionEvaluation {
  isPermitted: boolean;
  currentStage: string;
  targetStage: string;
  missingActivities: string[];
  missingSignoffs: string[];
  status: 'permitted' | 'blocked' | 'exception_required';
  reason: string;
}

export class WorkflowBuilderEngine {
  /**
   * Evaluates dynamic stage-gate transition according to configured workflow rules.
   * Invariant: Stage cannot advance if mandatory activities or gate approvals are missing.
   */
  static evaluateTransition(
    workflow: WorkflowDefinition,
    currentStageCode: string,
    targetStageCode: string,
    completedActivities: string[],
    completedSignoffs: string[]
  ): StageTransitionEvaluation {
    const currentStage = workflow.stages.find((s) => s.stageCode === currentStageCode);
    const targetStage = workflow.stages.find((s) => s.stageCode === targetStageCode);

    if (!currentStage || !targetStage) {
      return {
        isPermitted: false,
        currentStage: currentStageCode,
        targetStage: targetStageCode,
        missingActivities: [],
        missingSignoffs: [],
        status: 'blocked',
        reason: `Invalid stage transition: '${currentStageCode}' -> '${targetStageCode}' not defined in workflow '${workflow.workflowCode}'.`,
      };
    }

    if (targetStage.order <= currentStage.order) {
      // Reverting or staying on same stage is permitted
      return {
        isPermitted: true,
        currentStage: currentStageCode,
        targetStage: targetStageCode,
        missingActivities: [],
        missingSignoffs: [],
        status: 'permitted',
        reason: 'Backwards transition or stage adjustment authorized.',
      };
    }

    // Check missing activities
    const missingActivities = currentStage.requiredActivities.filter(
      (act) => !completedActivities.includes(act)
    );

    // Check missing approvals
    const missingSignoffs = currentStage.requiredGateApprovals.filter(
      (appr) => !completedSignoffs.includes(appr)
    );

    if (missingActivities.length > 0 || missingSignoffs.length > 0) {
      return {
        isPermitted: false,
        currentStage: currentStageCode,
        targetStage: targetStageCode,
        missingActivities,
        missingSignoffs,
        status: 'blocked',
        reason: `Cannot advance to '${targetStage.name}': ${missingActivities.length} mandatory activities and ${missingSignoffs.length} required approvals are unresolved.`,
      };
    }

    return {
      isPermitted: true,
      currentStage: currentStageCode,
      targetStage: targetStageCode,
      missingActivities: [],
      missingSignoffs: [],
      status: 'permitted',
      reason: `All gate conditions cleared. Transition to '${targetStage.name}' approved.`,
    };
  }
}
