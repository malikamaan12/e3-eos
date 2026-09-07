import { describe, it, expect } from 'vitest';
import { StageGraphEngine, DependencyEdge, StageInstance } from './stage-graph.js';
import {
  CanonicalMetricCalculator,
  DomainMetricEvent,
} from './templates.js';
import { ProjectCloningEngine } from './cloning.js';
import { TimeUtil } from './time.js';

describe('AT-013: Canonical Metric Invariance across 5-Stage and 13-Stage Templates', () => {
  it('calculates identical procurement lead times from canonical domain events regardless of stage template', () => {
    // 13-stage project events
    const events13Stage: DomainMetricEvent[] = [
      {
        eventType: 'purchase_request.approved',
        occurredAt: '2026-09-07T08:00:00.000Z',
        projectId: 'prj-13-stage',
      },
      {
        eventType: 'purchase_order.issued',
        occurredAt: '2026-09-07T14:00:00.000Z', // 6 hours later
        projectId: 'prj-13-stage',
      },
    ];

    // 5-stage compressed project events
    const events5Stage: DomainMetricEvent[] = [
      {
        eventType: 'purchase_request.approved',
        occurredAt: '2026-09-07T08:00:00.000Z',
        projectId: 'prj-5-stage',
      },
      {
        eventType: 'purchase_order.issued',
        occurredAt: '2026-09-07T14:00:00.000Z', // 6 hours later
        projectId: 'prj-5-stage',
      },
    ];

    const leadTime13 = CanonicalMetricCalculator.calculateProcurementLeadTimeHours(events13Stage);
    const leadTime5 = CanonicalMetricCalculator.calculateProcurementLeadTimeHours(events5Stage);

    expect(leadTime13).toBe(6);
    expect(leadTime5).toBe(6);
    expect(leadTime13).toBe(leadTime5); // Strictly invariant!
  });
});

describe('AT-018: Acyclic Dependency DAG & Stage Repetition / Reopening', () => {
  it('rejects cyclic task dependencies in the schedule graph', () => {
    const edges: DependencyEdge[] = [
      { id: 'e1', predecessorId: 'task-1', successorId: 'task-2', type: 'FS' },
      { id: 'e2', predecessorId: 'task-2', successorId: 'task-3', type: 'FS' },
    ];

    // Attempt to add edge task-3 -> task-1, which would create a cycle (1 -> 2 -> 3 -> 1)
    const cyclicEdge: DependencyEdge = {
      id: 'e3',
      predecessorId: 'task-3',
      successorId: 'task-1',
      type: 'FS',
    };

    expect(() => StageGraphEngine.assertAcyclic(edges, cyclicEdge)).toThrowError(/Cycle detected/);
  });

  it('reopens/repeats a stage by generating a new cycle instance with stable lineage instead of a graph cycle', () => {
    const initialStages: StageInstance[] = [
      {
        id: 'inst-design-01',
        templateStageId: 'STAGE-04',
        name: 'Design Development',
        order: 4,
        isArchived: false,
        cycleNumber: 1,
      },
    ];

    const { newInstance, updatedInstances } = StageGraphEngine.repeatStage(initialStages, 'inst-design-01');

    expect(newInstance.cycleNumber).toBe(2);
    expect(newInstance.previousCycleInstanceId).toBe('inst-design-01');
    expect(newInstance.name).toContain('Cycle 2');
    expect(updatedInstances).toHaveLength(2);
  });
});

describe('AT-017: Requirement Preservation during Stage Archiving', () => {
  it('preserves attached requirements when a stage is removed/archived and flags them for remapping', () => {
    const stages: StageInstance[] = [
      {
        id: 'inst-inspect-10',
        templateStageId: 'STAGE-10',
        name: 'Finishing & Testing Readiness',
        order: 10,
        isArchived: false,
        cycleNumber: 1,
      },
    ];

    const attachedRequirements = ['req-fire-safety-cert', 'req-structural-load-test'];

    const result = StageGraphEngine.archiveStage(stages, 'inst-inspect-10', attachedRequirements);

    expect(result.updatedInstances[0].isArchived).toBe(true);
    // Requirements are NEVER deleted; they are preserved and flagged for remap
    expect(result.preservedRequirementsNeedingRemap).toEqual(attachedRequirements);
  });
});

describe('AT-030: Project Cloning with Reset of Consequential Data', () => {
  it('clones project structure while strictly resetting costs, approvals, signatures, and personal details', () => {
    const sourceProject = {
      id: 'prj-source-999',
      projectCode: 'PRJ-LIVE-2026',
      title: 'Original Grand Gala',
      description: 'Annual corporate event with existing signatures and costs',
      templateId: 'tmpl-standard-13-stage',
      stages: [{ id: 's1', name: 'Onboarding', order: 1 }],
      workPackages: [{ id: 'wp1', name: 'AV & Rigging' }],
      requirements: [{ id: 'r1', title: 'Main Stage Spec', description: 'Rigging specs' }],
      // Consequential data that must be wiped
      historicalApprovals: [{ decisionId: 'dec-1', outcome: 'approved' }],
      signatures: [{ signer: 'Client CEO', signedAt: '2026-05-01' }],
      actualCosts: [{ amount: '250000.00' }],
      committedPurchaseOrders: [{ poId: 'po-99' }],
      resourceReservations: [{ resourceId: 'led-wall-1' }],
      actualDates: { startedAt: '2026-06-01' },
      personalContactDetails: [{ email: 'ceo@client.com', phone: '+974 5555 1234' }],
    };

    const cloned = ProjectCloningEngine.cloneProject(sourceProject, 'PRJ-CLONE-2027', 'Grand Gala 2027');

    expect(cloned.projectCode).toBe('PRJ-CLONE-2027');
    expect(cloned.title).toBe('Grand Gala 2027');
    expect(cloned.maturity).toBe('idea');
    expect(cloned.outcome).toBe('undetermined');

    // Structural elements preserved
    expect(cloned.stages).toHaveLength(1);
    expect(cloned.workPackages).toHaveLength(1);
    expect(cloned.requirements).toHaveLength(1);

    // Consequential data strictly reset
    expect(cloned.historicalApprovals).toHaveLength(0);
    expect(cloned.signatures).toHaveLength(0);
    expect(cloned.actualCosts).toHaveLength(0);
    expect(cloned.committedPurchaseOrders).toHaveLength(0);
    expect(cloned.resourceReservations).toHaveLength(0);
    expect(Object.keys(cloned.actualDates)).toHaveLength(0);
    expect(cloned.personalContactDetails).toHaveLength(0);
  });
});

describe('AT-031: Tender Deadline across Timezone & DST Boundary', () => {
  it('preserves IANA timezone and UTC instant, enabling exact local view and duration calculation', () => {
    // Deadline in London during British Summer Time (BST, UTC+1)
    const londonDeadline = TimeUtil.createZonedInstant('2026-07-01T12:00:00.000Z', 'Europe/London');

    expect(londonDeadline.ianaTimezone).toBe('Europe/London');
    expect(londonDeadline.utcInstant).toBe('2026-07-01T12:00:00.000Z');

    // Submission time in Qatar (AST, UTC+3)
    const qatarSubmission = TimeUtil.createZonedInstant('2026-07-01T10:00:00.000Z', 'Asia/Qatar');

    const durationHours =
      (new Date(londonDeadline.utcInstant).getTime() - new Date(qatarSubmission.utcInstant).getTime()) /
      (1000 * 60 * 60);

    expect(durationHours).toBe(2); // Exactly 2 hours before deadline
  });
});
