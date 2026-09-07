import { ExpressionNode, PolicyRule, PolicySnapshot, PolicyEvaluationReport, RuleEvaluationResult, TriState } from './types.js';

export interface EvaluationContext {
  facts: Record<string, any>;
  currentActor?: {
    userId: string;
    organisationId: string;
    roles: string[];
    isRevoked?: boolean;
  };
  approvalSignoffs?: Array<{
    userId: string;
    role: string;
    approvedAt: string;
  }>;
}

export class PolicyEvaluator {
  /**
   * Resolves a dotted fact path (e.g. 'procurement.comparisonAccepted')
   */
  private static resolvePath(obj: any, path: string): any {
    if (!obj || typeof obj !== 'object') return undefined;
    const parts = path.split('.');
    let curr = obj;
    for (const p of parts) {
      if (curr === undefined || curr === null) return undefined;
      curr = curr[p];
    }
    return curr;
  }

  /**
   * Evaluates an ExpressionNode into TriState ('true' | 'false' | 'unknown')
   */
  static evaluateExpression(node: ExpressionNode, ctx: EvaluationContext): TriState {
    switch (node.op) {
      case 'literal':
        return node.value ? 'true' : 'false';

      case 'fact': {
        const val = this.resolvePath(ctx.facts, node.path);
        if (val === undefined || val === null) {
          return 'unknown'; // Unknown fact is NEVER false or true
        }
        return val ? 'true' : 'false';
      }

      case 'exists': {
        const val = this.resolvePath(ctx.facts, node.path);
        return val !== undefined && val !== null ? 'true' : 'false';
      }

      case 'has_evidence': {
        const evidences = ctx.facts['evidences'] as Array<{ type: string; verified: boolean }> | undefined;
        if (!evidences) return 'unknown';
        const found = evidences.some((e) => e.type === node.evidenceType && e.verified);
        return found ? 'true' : 'false';
      }

      case 'has_authority': {
        // Check current actor validity (AT-003)
        if (ctx.currentActor?.isRevoked) {
          return 'false';
        }

        // Two-person rule (AT-004): Must have distinct user IDs
        if (node.requireDistinctActors) {
          const signoffs = ctx.approvalSignoffs || [];
          const distinctUserIds = new Set(signoffs.map((s) => s.userId));
          if (distinctUserIds.size < 2) {
            // One person with 2 roles cannot satisfy independent two-person decision!
            return 'false';
          }
          return 'true';
        }

        const roles = ctx.currentActor?.roles || [];
        return roles.includes(node.requiredRole) ? 'true' : 'false';
      }

      case 'eq': {
        const leftVal = node.left.op === 'fact'
          ? this.resolvePath(ctx.facts, (node.left as any).path)
          : (node.left as any).value;
        const rightVal = node.right.op === 'fact'
          ? this.resolvePath(ctx.facts, (node.right as any).path)
          : (node.right as any).value;

        if (leftVal === undefined || rightVal === undefined) return 'unknown';
        return leftVal === rightVal ? 'true' : 'false';
      }

      case 'ne': {
        const eqRes = this.evaluateExpression({ ...node, op: 'eq' }, ctx);
        if (eqRes === 'unknown') return 'unknown';
        return eqRes === 'true' ? 'false' : 'true';
      }

      case 'gt':
      case 'gte':
      case 'lt':
      case 'lte': {
        const leftVal = node.left.op === 'fact'
          ? this.resolvePath(ctx.facts, (node.left as any).path)
          : (node.left as any).value;
        const rightVal = node.right.op === 'fact'
          ? this.resolvePath(ctx.facts, (node.right as any).path)
          : (node.right as any).value;

        if (leftVal === undefined || rightVal === undefined) return 'unknown';
        if (node.op === 'gt') return leftVal > rightVal ? 'true' : 'false';
        if (node.op === 'gte') return leftVal >= rightVal ? 'true' : 'false';
        if (node.op === 'lt') return leftVal < rightVal ? 'true' : 'false';
        if (node.op === 'lte') return leftVal <= rightVal ? 'true' : 'false';
        return 'unknown';
      }

      case 'all': {
        let hasUnknown = false;
        for (const cond of node.conditions) {
          const res = this.evaluateExpression(cond, ctx);
          if (res === 'false') return 'false'; // Short-circuit false
          if (res === 'unknown') hasUnknown = true;
        }
        return hasUnknown ? 'unknown' : 'true';
      }

      case 'any': {
        let hasUnknown = false;
        for (const cond of node.conditions) {
          const res = this.evaluateExpression(cond, ctx);
          if (res === 'true') return 'true'; // Short-circuit true
          if (res === 'unknown') hasUnknown = true;
        }
        return hasUnknown ? 'unknown' : 'false';
      }

      case 'not': {
        const res = this.evaluateExpression(node.condition, ctx);
        if (res === 'unknown') return 'unknown';
        return res === 'true' ? 'false' : 'true';
      }

      default:
        return 'unknown';
    }
  }

  /**
   * Evaluates a single rule in context.
   */
  static evaluateRule(rule: PolicyRule, ctx: EvaluationContext): RuleEvaluationResult {
    const conditionResult = this.evaluateExpression(rule.condition, ctx);

    if (conditionResult === 'true') {
      return {
        ruleId: rule.ruleId,
        result: 'true',
        requiredNextAction: 'proceed',
      };
    }

    if (conditionResult === 'unknown') {
      return {
        ruleId: rule.ruleId,
        result: 'unknown',
        reason: `Rule condition requires missing/unverified facts: ${rule.whenUnknown}`,
        requiredNextAction: rule.whenUnknown === 'request_verification' ? 'request_verification' : 'rejected',
      };
    }

    // conditionResult === 'false'
    return {
      ruleId: rule.ruleId,
      result: 'false',
      reason: `Rule condition evaluated to false: ${rule.whenFalse}`,
      requiredNextAction: rule.whenFalse === 'require_authorised_exception' ? 'request_exception' : 'rejected',
    };
  }

  /**
   * Evaluates all applicable rules in a snapshot against a trigger.
   */
  static evaluateSnapshot(
    snapshot: PolicySnapshot,
    trigger: string,
    ctx: EvaluationContext
  ): PolicyEvaluationReport {
    const applicableRules = snapshot.rules.filter((r) => r.trigger === trigger);
    const evaluations: RuleEvaluationResult[] = [];

    let hasFailure = false;
    let hasExceptionRequired = false;
    let hasVerificationRequired = false;

    for (const rule of applicableRules) {
      const evalRes = this.evaluateRule(rule, ctx);
      evaluations.push(evalRes);

      if (evalRes.result === 'false') {
        if (evalRes.requiredNextAction === 'request_exception') {
          hasExceptionRequired = true;
        } else {
          hasFailure = true;
        }
      } else if (evalRes.result === 'unknown') {
        hasVerificationRequired = true;
      }
    }

    let overallOutcome: PolicyEvaluationReport['overallOutcome'] = 'passed';
    if (hasFailure) {
      overallOutcome = 'failed';
    } else if (hasExceptionRequired) {
      overallOutcome = 'requires_exception';
    } else if (hasVerificationRequired) {
      overallOutcome = 'requires_verification';
    }

    return {
      snapshotId: snapshot.id,
      snapshotHash: snapshot.contentHash,
      overallOutcome,
      evaluations,
    };
  }
}
