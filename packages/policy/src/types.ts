export type TriState = 'true' | 'false' | 'unknown';

export type RuleClassification =
  | 'USER_CONFIRMED'
  | 'PROPOSED_DEFAULT'
  | 'REQUIRES_LOCAL_REVIEW'
  | 'VERIFIED_FOR_SCOPE';

export type AuthorityClass =
  | 'standard_pm'
  | 'commercial_head'
  | 'two_person_independent'
  | 'board_governance';

export type ExpressionNode =
  | { op: 'literal'; value: any }
  | { op: 'fact'; path: string }
  | { op: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in'; left: ExpressionNode; right: ExpressionNode }
  | { op: 'all' | 'any'; conditions: ExpressionNode[] }
  | { op: 'not'; condition: ExpressionNode }
  | { op: 'exists'; path: string }
  | { op: 'has_evidence'; evidenceType: string }
  | { op: 'has_authority'; requiredRole: string; requireDistinctActors?: boolean };

export interface PolicyRule {
  ruleId: string;
  version: number;
  classification: RuleClassification;
  scope: {
    organisationId?: string;
    projectId?: string;
    countryCode?: string;
  };
  trigger: string; // e.g. "purchase_order.release", "design.publish"
  condition: ExpressionNode;
  whenFalse: 'require_authorised_exception' | 'reject' | 'warn';
  whenUnknown: 'request_verification' | 'reject' | 'warn';
  authorityClass?: AuthorityClass;
  exceptionPolicyId?: string;
  sourceRef: string;
}

export interface PolicySnapshot {
  id: string;
  scope: Record<string, any>;
  rules: PolicyRule[];
  compilerVersion: string;
  contentHash: string; // Canonical SHA-256
  compiledAt: string;
}

export interface RuleEvaluationResult {
  ruleId: string;
  result: TriState;
  reason?: string;
  unmetConditions?: string[];
  requiredNextAction?: 'request_exception' | 'request_verification' | 'rejected' | 'proceed';
}

export interface PolicyEvaluationReport {
  snapshotId: string;
  snapshotHash: string;
  overallOutcome: 'passed' | 'failed' | 'requires_exception' | 'requires_verification';
  evaluations: RuleEvaluationResult[];
}
