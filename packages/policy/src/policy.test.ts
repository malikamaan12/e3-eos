import { describe, it, expect } from 'vitest';
import { PolicyCompiler } from './compiler.js';
import { PolicyEvaluator } from './evaluator.js';
import { PolicyRule, ExpressionNode } from './types.js';

describe('Policy Engine - AST & Three-Valued Logic', () => {
  const sampleRule: PolicyRule = {
    ruleId: 'vendor.comparison.required',
    version: 1,
    classification: 'PROPOSED_DEFAULT',
    scope: { projectId: 'proj-123' },
    trigger: 'purchase_order.release',
    condition: {
      op: 'eq',
      left: { op: 'fact', path: 'procurement.comparisonAccepted' },
      right: { op: 'literal', value: true },
    },
    whenFalse: 'require_authorised_exception',
    whenUnknown: 'request_verification',
    sourceRef: 'policy-procurement-v1',
  };

  it('evaluates true when fact is true', () => {
    const res = PolicyEvaluator.evaluateRule(sampleRule, {
      facts: { procurement: { comparisonAccepted: true } },
    });
    expect(res.result).toBe('true');
    expect(res.requiredNextAction).toBe('proceed');
  });

  it('evaluates false and requires exception when fact is explicitly false', () => {
    const res = PolicyEvaluator.evaluateRule(sampleRule, {
      facts: { procurement: { comparisonAccepted: false } },
    });
    expect(res.result).toBe('false');
    expect(res.requiredNextAction).toBe('request_exception');
  });

  it('evaluates UNKNOWN and requests verification when fact is missing (AT-022)', () => {
    const res = PolicyEvaluator.evaluateRule(sampleRule, {
      facts: {}, // Missing procurement facts
    });
    expect(res.result).toBe('unknown');
    expect(res.requiredNextAction).toBe('request_verification');
  });
});

describe('AT-003: Dynamic Authority Revocation', () => {
  it('denies decision when approver role is revoked despite snapshot referencing the role', () => {
    const rule: PolicyRule = {
      ruleId: 'commercial.release.authority',
      version: 1,
      classification: 'USER_CONFIRMED',
      scope: {},
      trigger: 'commercial.release',
      condition: {
        op: 'has_authority',
        requiredRole: 'commercial_director',
      },
      whenFalse: 'reject',
      whenUnknown: 'reject',
      sourceRef: 'gov-01',
    };

    // User has role but is revoked
    const res = PolicyEvaluator.evaluateRule(rule, {
      facts: {},
      currentActor: {
        userId: 'user-01',
        organisationId: 'org-01',
        roles: ['commercial_director'],
        isRevoked: true,
      },
    });

    expect(res.result).toBe('false');
    expect(res.requiredNextAction).toBe('rejected');
  });
});

describe('AT-004: Separation of Duties (Two-Person Rule)', () => {
  it('blocks one identity assigned two roles from satisfying independent two-person decision', () => {
    const twoPersonCondition: ExpressionNode = {
      op: 'has_authority',
      requiredRole: 'approver',
      requireDistinctActors: true,
    };

    // Case 1: One user ('user-1') provided two sign-offs with different roles
    const singleUserSignoffs = [
      { userId: 'user-1', role: 'pm_lead', approvedAt: '2026-09-07T10:00:00Z' },
      { userId: 'user-1', role: 'finance_controller', approvedAt: '2026-09-07T10:05:00Z' },
    ];

    const resultSingle = PolicyEvaluator.evaluateExpression(twoPersonCondition, {
      facts: {},
      approvalSignoffs: singleUserSignoffs,
    });
    expect(resultSingle).toBe('false');

    // Case 2: Two distinct users ('user-1' and 'user-2') provided sign-offs
    const distinctSignoffs = [
      { userId: 'user-1', role: 'pm_lead', approvedAt: '2026-09-07T10:00:00Z' },
      { userId: 'user-2', role: 'finance_controller', approvedAt: '2026-09-07T10:05:00Z' },
    ];

    const resultDistinct = PolicyEvaluator.evaluateExpression(twoPersonCondition, {
      facts: {},
      approvalSignoffs: distinctSignoffs,
    });
    expect(resultDistinct).toBe('true');
  });
});

describe('AT-005: Anti-Self-Downgrade Protection', () => {
  it('blocks policy publication if author attempts to weaken rule governing their own pending transaction', () => {
    const activeRule: PolicyRule = {
      ruleId: 'po.budget.strict_check',
      version: 1,
      classification: 'USER_CONFIRMED',
      scope: {},
      trigger: 'po.release',
      condition: { op: 'literal', value: true },
      whenFalse: 'reject',
      whenUnknown: 'reject',
      sourceRef: 'gov-01',
    };

    const weakenedRule: PolicyRule = {
      ...activeRule,
      version: 2,
      whenFalse: 'warn', // Weakened from 'reject' to 'warn'!
    };

    const activeSnapshot = PolicyCompiler.compile('snap-01', {}, [activeRule]);
    const candidateSnapshot = PolicyCompiler.compile('snap-02', {}, [weakenedRule]);

    const actorId = 'user-requester';
    const pendingTransactions = [
      {
        id: 'po-999',
        ownerId: actorId, // Owned by the same user attempting to publish the weakened rule
        trigger: 'po.release',
        ruleId: 'po.budget.strict_check',
      },
    ];

    const downgradeCheck = PolicyCompiler.detectSelfDowngrade(
      activeSnapshot,
      candidateSnapshot,
      actorId,
      pendingTransactions
    );

    expect(downgradeCheck.isBlocked).toBe(true);
    expect(downgradeCheck.reason).toContain('Self-downgrade detected');
  });
});
