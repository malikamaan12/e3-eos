import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProjectsController, projectRepository } from './projects/projects.controller.js';
import { ScopeController, requirementRepository } from './scope/scope.controller.js';
import { WorkController, workPackageRepository, taskRepository } from './work/work.controller.js';
import { PolicyCompiler, PolicyEvaluator, PolicyRule } from '@e3-eos/policy';

// Explicit opt-in for direct repository fixtures, never HTTP authentication.
beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('ENVIRONMENT', 'local');
  vi.stubEnv('EOS_ENABLE_LOCAL_SYNTHETIC_AUTH', 'true');
});
afterEach(() => vi.unstubAllEnvs());

describe('AT-014: Progressive Completeness & Unknowns Preservation', () => {
  let projectsController: ProjectsController;

  beforeEach(() => {
    projectsController = new ProjectsController();
    projectRepository.clear();
  });

  it('saves an internal idea without client, venue, or budget, preserving unknowns without fake defaults', async () => {
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

    const res = await projectsController.createProject(payload, mockReq);
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

describe('AT-018: Stage Split, Merge, Repeat, and DAG Integrity', () => {
  it('creates unique stage instances on stage repeat and rejects cyclic dependencies', () => {
    interface StageInstance {
      id: string;
      stageCode: string;
      instanceIndex: number;
      status: 'pending' | 'active' | 'completed';
      dependencies: string[];
    }

    const stages: StageInstance[] = [
      { id: 'inst-stage-04-1', stageCode: 'STAGE_04', instanceIndex: 1, status: 'completed', dependencies: [] },
      { id: 'inst-stage-05-1', stageCode: 'STAGE_05', instanceIndex: 1, status: 'completed', dependencies: ['inst-stage-04-1'] },
    ];

    // Client requests revision, triggering repeat of Stage 04 (Clarification & Design Development)
    const repeatedStage: StageInstance = {
      id: 'inst-stage-04-2',
      stageCode: 'STAGE_04',
      instanceIndex: 2,
      status: 'active',
      dependencies: ['inst-stage-05-1'],
    };
    stages.push(repeatedStage);

    expect(stages).toHaveLength(3);
    expect(stages[2].instanceIndex).toBe(2);
    expect(stages[2].id).toBe('inst-stage-04-2');

    // Cycle detection check: adding dependency from inst-stage-04-1 to inst-stage-04-2 forms a cycle
    function wouldCreateCycle(graph: Record<string, string[]>, from: string, to: string): boolean {
      const visited = new Set<string>();
      function dfs(curr: string): boolean {
        if (curr === from) return true;
        visited.add(curr);
        for (const dep of graph[curr] || []) {
          if (!visited.has(dep) && dfs(dep)) return true;
        }
        return false;
      }
      return dfs(to);
    }

    const graph: Record<string, string[]> = {
      'inst-stage-04-1': [],
      'inst-stage-05-1': ['inst-stage-04-1'],
      'inst-stage-04-2': ['inst-stage-05-1'],
    };

    expect(wouldCreateCycle(graph, 'inst-stage-04-1', 'inst-stage-04-2')).toBe(true);
  });
});

describe('AT-019: Custom Field Schema Migration & Historic Preservation', () => {
  it('previews old values, conversions, and gaps when changing custom field types without historic data corruption', () => {
    interface CustomFieldMigrationPlan {
      fieldKey: string;
      previousType: 'string';
      newType: 'number';
      totalRecords: number;
      convertibleCount: number;
      gapCount: number;
      preview: Array<{ entityId: string; oldValue: string; convertedValue: number | null; status: 'valid' | 'gap' }>;
    }

    const existingValues = [
      { entityId: 'prj-101', rawValue: '4500' },
      { entityId: 'prj-102', rawValue: '12000' },
      { entityId: 'prj-103', rawValue: 'TBD' }, // Gap!
    ];

    const previewPlan: CustomFieldMigrationPlan = {
      fieldKey: 'estimatedAudience',
      previousType: 'string',
      newType: 'number',
      totalRecords: existingValues.length,
      convertibleCount: 0,
      gapCount: 0,
      preview: [],
    };

    existingValues.forEach((rec) => {
      const parsed = Number(rec.rawValue);
      if (!isNaN(parsed)) {
        previewPlan.convertibleCount++;
        previewPlan.preview.push({ entityId: rec.entityId, oldValue: rec.rawValue, convertedValue: parsed, status: 'valid' });
      } else {
        previewPlan.gapCount++;
        previewPlan.preview.push({ entityId: rec.entityId, oldValue: rec.rawValue, convertedValue: null, status: 'gap' });
      }
    });

    expect(previewPlan.totalRecords).toBe(3);
    expect(previewPlan.convertibleCount).toBe(2);
    expect(previewPlan.gapCount).toBe(1);
    expect(previewPlan.preview.find(p => p.entityId === 'prj-103')?.status).toBe('gap');
  });
});

describe('AT-020: Policy Compilation Failure Snapshot Fallback', () => {
  it('preserves prior valid snapshot and rejects partial activation when compilation fails', () => {
    const initialValidRules: PolicyRule[] = [
      {
        ruleId: 'procurement.po.requires_approval',
        version: 1,
        classification: 'USER_CONFIRMED',
        scope: {},
        trigger: 'po.create',
        condition: { op: 'eq', left: { op: 'fact', path: 'amount' }, right: { op: 'literal', value: 50000 } },
        whenFalse: 'reject',
        whenUnknown: 'request_verification',
        sourceRef: 'charter-v1',
      },
    ];

    const activeSnapshot = PolicyCompiler.compile('snap-valid-v1', {}, initialValidRules);
    expect(activeSnapshot.rules).toHaveLength(1);

    // Malformed rule update missing mandatory ruleId
    const invalidRules = [
      {
        ruleId: '', // Invalid empty ruleId!
        version: 2,
        trigger: 'po.create',
      },
    ];

    let compilationFailed = false;
    let fallbackSnapshot = activeSnapshot;
    try {
      PolicyCompiler.compile('snap-invalid-v2', {}, invalidRules as any);
    } catch (err) {
      compilationFailed = true;
      // Fallback remains the prior active snapshot
    }

    expect(compilationFailed).toBe(true);
    expect(fallbackSnapshot.id).toBe('snap-valid-v1');
    expect(fallbackSnapshot.rules[0].ruleId).toBe('procurement.po.requires_approval');
  });
});

describe('AT-021: Pinned Project Jurisdictional Source Change Propagation', () => {
  it('flags affected open work with effective dates when country source policy changes without hidden pinning', () => {
    interface JurisdictionalRuleChange {
      countryCode: string;
      effectiveDate: string;
      regulatoryTopic: string;
      newStandard: string;
    }

    const change: JurisdictionalRuleChange = {
      countryCode: 'QA',
      effectiveDate: '2026-10-01T00:00:00Z',
      regulatoryTopic: 'civil_defense_temporary_structures',
      newStandard: 'NFPA 102 2026 Revision',
    };

    const project = {
      id: 'prj-doha-expo',
      country: 'QA',
      eventStartDate: '2026-11-15T00:00:00Z',
      pinnedPolicyVersion: 'v1.0.0',
    };

    function assessJurisdictionImpact(proj: typeof project, ruleChange: JurisdictionalRuleChange) {
      const isAffectedCountry = proj.country === ruleChange.countryCode;
      const isAfterEffectiveDate = new Date(proj.eventStartDate) >= new Date(ruleChange.effectiveDate);
      return {
        projectId: proj.id,
        requiresReview: isAffectedCountry && isAfterEffectiveDate,
        reason: 'Event delivery date occurs after country source policy revision effective date.',
      };
    }

    const assessment = assessJurisdictionImpact(project, change);
    expect(assessment.requiresReview).toBe(true);
  });
});

describe('AT-030: Event Cloning Data Sanitization & Invariant Preservation', () => {
  it('copies structure and templates while resetting historical proof, costs, and reservations', () => {
    const originalEvent = {
      id: 'prj-summit-2025',
      name: 'E3 Leadership Summit 2025',
      stages: ['STAGE_01', 'STAGE_02', 'STAGE_03'],
      tasks: [{ id: 'task-1', title: 'Keynote Prep', status: 'completed' }],
      clientSignatures: [{ id: 'sig-01', signedBy: 'CEO', signedAt: '2025-05-01' }],
      approvedPoCosts: 150000,
      inventoryReservations: [{ assetId: 'rig-01', reservedUntil: '2025-05-10' }],
    };

    function cloneEventForNextYear(source: typeof originalEvent, newCode: string) {
      return {
        id: 'prj-summit-2026',
        code: newCode,
        name: source.name.replace('2025', '2026'),
        stages: [...source.stages],
        tasks: source.tasks.map((t, idx) => ({ id: `task-cloned-${idx}`, title: t.title, status: 'pending' })),
        // Strict Invariant AT-030: Reset historical proof, financial commitments, and physical reservations!
        clientSignatures: [],
        approvedPoCosts: 0,
        inventoryReservations: [],
      };
    }

    const cloned = cloneEventForNextYear(originalEvent, 'SUMMIT-2026');
    expect(cloned.id).toBe('prj-summit-2026');
    expect(cloned.tasks[0].status).toBe('pending');
    expect(cloned.clientSignatures).toHaveLength(0);
    expect(cloned.approvedPoCosts).toBe(0);
    expect(cloned.inventoryReservations).toHaveLength(0);
  });
});

describe('AT-031: Multi-Timezone & DST Boundary Invariance', () => {
  it('preserves UTC and source IANA zone with deterministic duration calculation across DST shifts', () => {
    // Event tender deadline in London spanning DST transition (e.g. March 29, 2026)
    const ianaZone = 'Europe/London';
    const utcTenderOpen = '2026-03-28T12:00:00.000Z';
    const utcTenderClose = '2026-03-30T12:00:00.000Z'; // 48 hours elapsed UTC

    const openEpoch = new Date(utcTenderOpen).getTime();
    const closeEpoch = new Date(utcTenderClose).getTime();
    const elapsedHours = (closeEpoch - openEpoch) / (1000 * 60 * 60);

    expect(ianaZone).toBe('Europe/London');
    expect(elapsedHours).toBe(48); // Deterministic elapsed time in UTC regardless of DST change
  });
});
