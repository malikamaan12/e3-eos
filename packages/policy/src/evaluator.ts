import {
  ExpressionNode,
  PolicyRule,
  PolicySnapshot,
  PolicyEvaluationReport,
  RuleEvaluationResult,
  TriState,
  ApprovalThresholdResolution,
  CommercialApprovalPolicyConfig,
  PolicyResolutionContext,
} from './types.js';

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

export const DEFAULT_E3_APPROVAL_POLICY: CommercialApprovalPolicyConfig = {
  policyId: 'POL-COMM-QATAR-DEFAULT',
  policyVersion: 1,
  organisationId: '11111111-1111-4111-8111-111111111111',
  countryCode: 'QA',
  businessUnit: 'live_operations',
  projectId: '*',
  transactionType: '*',
  currency: 'QAR',
  effectiveFrom: '2026-01-01T00:00:00Z',
  status: 'active',
  thresholds: [
    {
      tierId: 'operational_pm',
      requiredRole: 'project_manager',
      roleTitle: 'Lead Project Manager',
      canonicalApprover: 'Zaid Mansour (Lead PM)',
      minAmount: 0,
      maxAmount: 50000,
      ruleId: 'POL-COMM-01',
      governanceRule: 'POL-COMM-01',
      description: 'Standard operational expenditure and deliverable sign-offs up to QAR 50,000.',
    },
    {
      tierId: 'commercial_finance',
      requiredRole: 'finance',
      roleTitle: 'Financial Controller',
      canonicalApprover: 'Rashid Al-Hajri (Financial Controller)',
      minAmount: 50000,
      maxAmount: 250000,
      ruleId: 'POL-COMM-02',
      governanceRule: 'POL-COMM-02',
      description: 'Commercial PO commitments and contract variations between QAR 50,000 and QAR 250,000.',
    },
    {
      tierId: 'executive_partner',
      requiredRole: 'executive',
      roleTitle: 'Executive Partner',
      canonicalApprover: 'Nasser Al-Attiyah (Executive Partner)',
      minAmount: 250000,
      maxAmount: undefined,
      ruleId: 'POL-COMM-03',
      governanceRule: 'POL-COMM-03',
      description: 'Major enterprise commitments and four-eyes executive gates exceeding QAR 250,000.',
    },
  ],
  metadata: {
    approvedBy: 'E3 Governance Board',
    approvedAt: '2026-01-01T00:00:00Z',
    governanceReference: 'E3-GOV-2026-COMM-01',
  },
};

/**
 * Backward-compatible export of default threshold configurations.
 */
export const E3_APPROVAL_THRESHOLDS = DEFAULT_E3_APPROVAL_POLICY.thresholds;

/**
 * Versionable in-memory registry for Commercial Approval Policies.
 * In production/staging, backed by PostgreSQL `policy_snapshots` and `active_policy_pointers`.
 */
export class CommercialApprovalPolicyRegistry {
  private static policies: Map<string, CommercialApprovalPolicyConfig> = new Map([
    [`${DEFAULT_E3_APPROVAL_POLICY.policyId}:v${DEFAULT_E3_APPROVAL_POLICY.policyVersion}`, DEFAULT_E3_APPROVAL_POLICY],
  ]);

  /**
   * Registers or updates a policy configuration with explicit scope and versioning.
   */
  static registerPolicy(policy: CommercialApprovalPolicyConfig): void {
    const key = `${policy.policyId}:v${policy.policyVersion}`;
    this.policies.set(key, policy);
  }

  /**
   * Lists all registered approval policy configurations.
   */
  static listPolicies(): CommercialApprovalPolicyConfig[] {
    return Array.from(this.policies.values());
  }

  /**
   * Resolves the most specific active policy for a given context.
   * Specificity hierarchy: Project > TransactionType > BusinessUnit > Country > Organisation > System Default.
   */
  static resolvePolicy(ctx?: PolicyResolutionContext): { policy: CommercialApprovalPolicyConfig; matchScope: string } {
    if (!ctx) {
      return { policy: DEFAULT_E3_APPROVAL_POLICY, matchScope: 'system_default' };
    }

    const activeList = Array.from(this.policies.values()).filter((p) => p.status === 'active');

    // 1. Exact project-level override
    if (ctx.projectId && ctx.projectId !== '*') {
      const match = activeList.find((p) => p.projectId === ctx.projectId);
      if (match) return { policy: match, matchScope: `project:${ctx.projectId}` };
    }

    // 2. Transaction-type specific override
    if (ctx.transactionType && ctx.transactionType !== '*') {
      const match = activeList.find((p) => p.transactionType === ctx.transactionType);
      if (match) return { policy: match, matchScope: `transactionType:${ctx.transactionType}` };
    }

    // 3. Business unit override
    if (ctx.businessUnit && ctx.businessUnit !== '*') {
      const match = activeList.find((p) => p.businessUnit === ctx.businessUnit);
      if (match) return { policy: match, matchScope: `businessUnit:${ctx.businessUnit}` };
    }

    // 4. Country code override
    if (ctx.countryCode && ctx.countryCode !== '*') {
      const match = activeList.find((p) => p.countryCode === ctx.countryCode);
      if (match) return { policy: match, matchScope: `country:${ctx.countryCode}` };
    }

    // 5. Organisation default
    if (ctx.organisationId) {
      const match = activeList.find((p) => p.organisationId === ctx.organisationId);
      if (match) return { policy: match, matchScope: `organisation:${ctx.organisationId}` };
    }

    return { policy: DEFAULT_E3_APPROVAL_POLICY, matchScope: 'system_default' };
  }
}

/**
 * Dynamically resolves the required approver role and non-bypassable policy rule
 * by evaluating the active configured policy model for the given scope context.
 */
export function resolveRequiredApprover(
  amountQar: number,
  context?: PolicyResolutionContext
): ApprovalThresholdResolution {
  const numericAmount = Math.max(0, Number(amountQar) || 0);
  const { policy, matchScope } = CommercialApprovalPolicyRegistry.resolvePolicy(context);

  // Find matching threshold tier from active policy configuration
  // Ordered from highest minimum threshold descending
  const sortedTiers = [...policy.thresholds].sort((a, b) => b.minAmount - a.minAmount);

  for (const tier of sortedTiers) {
    if (numericAmount >= tier.minAmount) {
      const rangeDesc = tier.maxAmount
        ? `in QAR ${tier.minAmount.toLocaleString()}–${tier.maxAmount.toLocaleString()} range`
        : `exceeds QAR ${tier.minAmount.toLocaleString()} threshold`;

      return {
        requiredRole: tier.requiredRole,
        roleTitle: tier.roleTitle,
        canonicalApprover: tier.canonicalApprover,
        minimumAmount: tier.minAmount,
        maximumAmount: tier.maxAmount,
        reason: `Transaction of QAR ${numericAmount.toLocaleString()} ${rangeDesc} requiring ${tier.roleTitle} sign-off (Policy ${policy.policyId} v${policy.policyVersion} - Rule ${tier.ruleId})`,
        governanceRule: tier.governanceRule,
        ruleId: tier.ruleId,
        isDowngradeAllowed: false,
        policyId: policy.policyId,
        policyVersion: policy.policyVersion,
        policyScopeMatched: matchScope,
        currency: policy.currency,
      };
    }
  }

  // Fallback to lowest tier if configured
  const lowestTier = sortedTiers[sortedTiers.length - 1] || DEFAULT_E3_APPROVAL_POLICY.thresholds[0];
  return {
    requiredRole: lowestTier.requiredRole,
    roleTitle: lowestTier.roleTitle,
    canonicalApprover: lowestTier.canonicalApprover,
    minimumAmount: lowestTier.minAmount,
    maximumAmount: lowestTier.maxAmount,
    reason: `Transaction of QAR ${numericAmount.toLocaleString()} is within ${lowestTier.roleTitle} operational delegation limit (< QAR ${(lowestTier.maxAmount || 50000).toLocaleString()}) (Rule ${lowestTier.ruleId})`,
    governanceRule: lowestTier.governanceRule,
    ruleId: lowestTier.ruleId,
    isDowngradeAllowed: false,
    policyId: policy.policyId,
    policyVersion: policy.policyVersion,
    policyScopeMatched: matchScope,
    currency: policy.currency,
  };
}
