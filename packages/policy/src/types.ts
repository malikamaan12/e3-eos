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

export interface CommercialApprovalTier {
  tierId: string;
  minAmount: number;
  maxAmount?: number;
  requiredRole: 'project_manager' | 'finance' | 'executive';
  roleTitle: string;
  canonicalApprover: string;
  ruleId: string;
  governanceRule: string;
  description: string;
}

export interface CommercialApprovalPolicyConfig {
  policyId: string;
  policyVersion: number;
  organisationId?: string; // Scope: Organisation
  countryCode?: string;     // Scope: Country ('QA', '*')
  businessUnit?: string;    // Scope: Business Unit ('live_operations', '*')
  projectId?: string;       // Scope: Project ('*', or specific project UUID)
  transactionType: string;  // Scope: Transaction Type ('purchase_order', 'contract_commitment', '*')
  currency: string;         // 'QAR'
  effectiveFrom: string;
  status: 'active' | 'draft' | 'archived';
  thresholds: CommercialApprovalTier[];
  metadata?: {
    approvedBy?: string;
    approvedAt?: string;
    governanceReference?: string;
  };
}

export interface PolicyResolutionContext {
  organisationId?: string;
  countryCode?: string;
  businessUnit?: string;
  projectId?: string;
  transactionType?: string;
  policyVersion?: number;
}

export interface ApprovalThresholdResolution {
  requiredRole: 'project_manager' | 'finance' | 'executive';
  roleTitle: string;
  canonicalApprover: string;
  minimumAmount: number;
  maximumAmount?: number;
  reason: string;
  governanceRule: string;
  ruleId: string;
  isDowngradeAllowed: boolean;
  policyId?: string;
  policyVersion?: number;
  policyScopeMatched?: string;
  currency?: string;
}
