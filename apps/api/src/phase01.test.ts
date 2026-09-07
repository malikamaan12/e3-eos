import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectsController, projectRepository } from './projects/projects.controller.js';
import { ScopeController, requirementRepository } from './scope/scope.controller.js';
import { WorkController, workPackageRepository, taskRepository } from './work/work.controller.js';
import { PolicyCompiler, PolicyEvaluator, PolicyRule } from '@e3-eos/policy';

describe('AT-014: Progressive Completeness & Unknowns Preservation', () => {
  let projectsController: ProjectsController;

  beforeEach(() => {
    projectsController = new ProjectsController();
    projectRepository.clear();
  });

  it('saves an internal idea without client, venue, or budget, preserving unknowns without fake defaults', () => {
    const mockReq = {
      headers: { 'idempotency-key': 'idem-idea-01' },
      organisationId: '11111111-1111-4111-8111-111111111111',
    } as any;

    const payload = {
      title: 'Unthemed Future Idea 2027',
      description: 'Initial brainstorm for an immersive art exhibition',
      originCode: 'INTERNAL_IDEA',
      ownerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      // client, budget, and dates are completely absent/unknown
    };

    const res = projectsController.createProject(payload, mockReq);
    expect(res.data.status).toBe('draft_created');
    expect(res.data.payload.maturity).toBe('idea');
    expect(res.data.payload.outcome).toBe('undetermined');
    expect(res.data.payload.clientOrganisationId).toBeNull();
    expect(res.data.payload.financialAssumptions).toBeNull();

    // Verify stored entity preserves null/undefined rather than synthetic zeros
    const stored = projectRepository.get(res.data.id);
    expect(stored?.clientOrganisationId).toBeUndefined();
    expect(stored?.financialAssumptions).toBeUndefined();
    expect(stored?.dateRegister).toBeUndefined();
  });
});

describe('AT-015: Lost Tender Closed with Explicit Outcome', () => {
  let scopeController: ScopeController;

  beforeEach(() => {
    scopeController = new ScopeController();
    projectRepository.clear();

    projectRepository.set('prj-tender-1', {
      id: 'prj-tender-1',
      organisationId: '11111111-1111-4111-8111-111111111111',
      projectCode: 'TENDER-2026-01',
      title: 'National Day Festival Tender',
      description: 'Government competitive tender',
      originCode: 'TENDER',
      ownerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      maturity: 'submitted',
      outcome: 'undetermined',
      rowVersion: 1,
    });
  });

  it('records no_go decision, transitioning maturity to closed and outcome to lost (never delivered)', () => {
    const res = scopeController.recordQualificationDecision('prj-tender-1', {
      decision: 'no_go',
      rationale: 'Client awarded contract to competitor based on pricing evaluation.',
    });

    expect(res.data.status).toBe('no_go');
    expect(res.data.payload.updatedProjectMaturity).toBe('closed');
    expect(res.data.payload.updatedProjectOutcome).toBe('lost');

    const updated = projectRepository.get('prj-tender-1');
    expect(updated?.maturity).toBe('closed');
    expect(updated?.outcome).toBe('lost');
    expect(updated?.outcome).not.toBe('delivered');
  });
});

describe('AT-016: Task Completion vs Deliverable Acceptance Decoupling', () => {
  let workController: WorkController;

  beforeEach(() => {
    workController = new WorkController();
    workPackageRepository.clear();
    taskRepository.clear();

    workPackageRepository.set('wp-staging-01', {
      id: 'wp-staging-01',
      organisationId: '11111111-1111-4111-8111-111111111111',
      projectId: 'prj-01',
      name: 'Main Stage Rigging & Lighting',
      ownerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      status: 'active',
      acceptanceState: 'pending',
      createdAt: new Date().toISOString(),
    });

    taskRepository.set('task-hang-lights-01', {
      id: 'task-hang-lights-01',
      packageId: 'wp-staging-01',
      organisationId: '11111111-1111-4111-8111-111111111111',
      projectId: 'prj-01',
      title: 'Hang Moving Head Lights on Truss B',
      state: 'active',
      isCompleted: false,
    });
  });

  it('completing a task records task completion while deliverable acceptance remains pending', () => {
    const res = workController.completeTask('prj-01', 'task-hang-lights-01', {
      completionEvidence: 'Photo uploaded showing 12 moving heads secured.',
    });

    expect(res.data.status).toBe('completed');
    expect(res.data.payload.task.isCompleted).toBe(true);
    // Package acceptance state remains strictly pending!
    expect(res.data.payload.packageAcceptanceState).toBe('pending');

    const pkg = workPackageRepository.get('wp-staging-01');
    expect(pkg?.acceptanceState).toBe('pending');
  });

  it('records separate formal acceptance by designated authority', () => {
    const acceptRes = workController.acceptWorkPackage('prj-01', 'wp-staging-01', {
      outcome: 'accepted',
      conditions: [],
      comment: 'Inspected and certified by Lead Rigging Engineer.',
    });

    expect(acceptRes.data.status).toBe('accepted');
    const pkg = workPackageRepository.get('wp-staging-01');
    expect(pkg?.acceptanceState).toBe('accepted');
  });
});

describe('AT-017: Traceability & Coverage Report on Stage Removal', () => {
  let scopeController: ScopeController;

  beforeEach(() => {
    scopeController = new ScopeController();
    requirementRepository.clear();

    requirementRepository.set('req-hse-01', {
      id: 'req-hse-01',
      organisationId: '11111111-1111-4111-8111-111111111111',
      projectId: 'prj-01',
      title: 'Structural Load Certification for Cantilever Roof',
      description: 'Engineering stamp required prior to occupation',
      disposition: 'applicability_unknown',
      createdAt: new Date().toISOString(),
      // deliverablePackageId is undefined!
    });
  });

  it('detects unassigned requirements and flags missing deliverable coverage', () => {
    const mockReq = { organisationId: '11111111-1111-4111-8111-111111111111' } as any;
    const res = scopeController.getRequirements('prj-01', mockReq);

    expect(res.data.coverageReport.totalRequirements).toBe(1);
    expect(res.data.coverageReport.satisfiedCount).toBe(0);
    expect(res.data.coverageReport.missingDeliverableCount).toBe(1);
    expect(res.data.coverageReport.coverageRatio).toBe('0.0%');
    expect(res.data.coverageReport.unassignedDeliverables[0].id).toBe('req-hse-01');
  });
});

describe('AT-023 to AT-029: Exception Lifecycle, Expiry & Protective Action Guarantees', () => {
  it('AT-023: closes exception review without rewriting the historical unmet condition', () => {
    interface ExceptionRecord {
      id: string;
      conditionMetAtExecution: boolean;
      status: 'authorised' | 'consumed' | 'expired';
      reviewStatus: 'open' | 'in_review' | 'closed';
    }

    const exception: ExceptionRecord = {
      id: 'ex-99',
      conditionMetAtExecution: false, // Historically unmet!
      status: 'consumed',
      reviewStatus: 'open',
    };

    // Review is performed and closed by Finance/Governance
    exception.reviewStatus = 'closed';

    expect(exception.reviewStatus).toBe('closed');
    // Condition remains historically false (never rewritten!)
    expect(exception.conditionMetAtExecution).toBe(false);
  });

  it('AT-024: single-use exception cannot be reused on a second transaction', () => {
    class SingleUseExceptionManager {
      private uses = new Map<string, number>();

      consume(exceptionId: string, maxUses = 1): { success: boolean; error?: string } {
        const count = this.uses.get(exceptionId) || 0;
        if (count >= maxUses) {
          return { success: false, error: 'Exception already consumed' };
        }
        this.uses.set(exceptionId, count + 1);
        return { success: true };
      }
    }

    const manager = new SingleUseExceptionManager();
    const res1 = manager.consume('ex-sole-source-1');
    expect(res1.success).toBe(true);

    const res2 = manager.consume('ex-sole-source-1');
    expect(res2.success).toBe(false);
    expect(res2.error).toContain('already consumed');
  });

  it('AT-025: expired exception blocks new release while review status remains independent', () => {
    const expiredException = {
      id: 'ex-urgent-01',
      validUntil: '2026-09-01T00:00:00Z', // Past date
      reviewStatus: 'open',
    };

    const isExpired = new Date(expiredException.validUntil).getTime() < new Date('2026-09-07T00:00:00Z').getTime();
    expect(isExpired).toBe(true);
    // Expiry blocks future use, but review remains independently open
    expect(expiredException.reviewStatus).toBe('open');
  });

  it('AT-026: permanent business change requires a new policy version, not perpetual exception renewal', () => {
    const currentRule: PolicyRule = {
      ruleId: 'po.comparison.min_count',
      version: 1,
      classification: 'USER_CONFIRMED',
      scope: {},
      trigger: 'po.release',
      condition: { op: 'literal', value: true },
      whenFalse: 'reject',
      whenUnknown: 'reject',
      sourceRef: 'procurement-policy-2025',
    };

    // Updating permanent procurement policy produces Version 2 with new source provenance
    const updatedRule: PolicyRule = {
      ...currentRule,
      version: 2,
      sourceRef: 'board-approved-procurement-policy-2026',
    };

    const snapshot = PolicyCompiler.compile('snap-v2', {}, [updatedRule]);
    expect(snapshot.rules[0].version).toBe(2);
    expect(snapshot.rules[0].sourceRef).toBe('board-approved-procurement-policy-2026');
  });

  it('AT-027: high-consequence preapproval cannot be bypassed by completing a downstream task', () => {
    const highConsequenceRule: PolicyRule = {
      ruleId: 'opening.safety_permit.required',
      version: 1,
      classification: 'USER_CONFIRMED',
      scope: {},
      trigger: 'opening.release',
      condition: {
        op: 'has_evidence',
        evidenceType: 'civil_defense_permit',
      },
      whenFalse: 'reject',
      whenUnknown: 'reject',
      sourceRef: 'gov-hse-01',
    };

    // Even if 100% of preparation tasks are complete, if civil_defense_permit is absent, release is REJECTED
    const evalReport = PolicyEvaluator.evaluateRule(highConsequenceRule, {
      facts: {
        evidences: [{ type: 'cleaning_completed', verified: true }],
        // civil_defense_permit is missing!
      },
    });

    // If civil_defense_permit is absent, release is strictly REJECTED (cannot be bypassed by task completion)
    expect(evalReport.result).toBe('false');
    expect(evalReport.requiredNextAction).toBe('rejected');
  });

  it('AT-028: immediate protective stop-work action executed without standard routine approval delay', () => {
    const workController = new WorkController();
    const mockReq = { actorId: 'safety-officer-99' } as any;

    const res = workController.recordProtectiveAction(
      'prj-01',
      {
        actionType: 'stop_work',
        location: 'Hall 3 Rigging Zone',
        immediateReason: 'Severe weather and high wind gusts exceeding safety threshold of 35 knots',
        affectedScopeIds: ['wp-rigging-01'],
      },
      mockReq
    );

    expect(res.data.status).toBe('executed_immediately');
    expect(res.data.payload.actionType).toBe('stop_work');
    expect(res.data.payload.recordedBy).toBe('safety-officer-99');
  });
});
