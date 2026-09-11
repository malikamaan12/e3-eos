import { describe, it, expect } from 'vitest';
import {
  ScopeRequirement,
  evaluateRequirementTraceability,
  generateRequirementsMatrix,
} from './requirements.js';

describe('Requirements & Scope Traceability Engine', () => {
  const sampleRequirement: ScopeRequirement = {
    id: 'req-001',
    projectId: 'proj-qnd-2026',
    code: 'REQ-QND-001',
    title: 'Main Ceremony 360-Degree LED Arch',
    description: '360-degree curved LED arch structure over Corniche ceremonial parade route.',
    category: 'staging_technical',
    sourceReference: 'RFP Section 4.2.1 - Technical Specifications',
    ownerId: 'usr-pm-01',
    ownerName: 'Zaid Mansour (Lead PM)',
    dueDate: '2026-11-15',
    disposition: 'applicable',
    linkedDocumentNumber: 'E3-QND26-AV-DWG-0001',
    linkedDesignVersion: 'Rev 01',
    linkedBoqLineCode: 'BOQ-STR-010',
    approvalRequestId: 'appr-req-truss-001',
    isApproved: true,
    deliveryEvidenceHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    targetCostQar: 850000,
    createdAt: '2026-09-10T10:00:00Z',
  };

  it('verifies a fully traceable requirement satisfying all 7 points', () => {
    const evaluation = evaluateRequirementTraceability(sampleRequirement, { isDeliveryStage: true });

    expect(evaluation.hasOwner).toBe(true);
    expect(evaluation.hasTargetDate).toBe(true);
    expect(evaluation.hasControlledDocument).toBe(true);
    expect(evaluation.hasDesignVersion).toBe(true);
    expect(evaluation.hasBoqCost).toBe(true);
    expect(evaluation.hasApprovalSignoff).toBe(true);
    expect(evaluation.hasDeliveryEvidence).toBe(true);

    expect(evaluation.completedPoints).toBe(7);
    expect(evaluation.totalPoints).toBe(7);
    expect(evaluation.traceabilityScorePct).toBe(100);
    expect(evaluation.isFullyTraceable).toBe(true);
    expect(evaluation.missingAttributes.length).toBe(0);
    expect(evaluation.riskRating).toBe('low');
  });

  it('identifies gaps when a requirement lacks owner, BOQ cost, and approval', () => {
    const incompleteReq: ScopeRequirement = {
      ...sampleRequirement,
      id: 'req-incomplete-002',
      code: 'REQ-QND-002',
      ownerId: undefined,
      ownerName: undefined,
      linkedBoqLineCode: undefined,
      targetCostQar: undefined,
      approvalRequestId: undefined,
      isApproved: false,
      deliveryEvidenceHash: undefined,
    };

    const evaluation = evaluateRequirementTraceability(incompleteReq);

    expect(evaluation.hasOwner).toBe(false);
    expect(evaluation.hasTargetDate).toBe(true);
    expect(evaluation.hasControlledDocument).toBe(true);
    expect(evaluation.hasDesignVersion).toBe(true);
    expect(evaluation.hasBoqCost).toBe(false);
    expect(evaluation.hasApprovalSignoff).toBe(false);

    expect(evaluation.isFullyTraceable).toBe(false);
    expect(evaluation.missingAttributes).toContain('Assigned Owner (Lead PM / Discipline Lead)');
    expect(evaluation.missingAttributes).toContain('Priced BOQ Line / Budget Allocation');
    expect(evaluation.missingAttributes).toContain('Governance Approval Sign-off');
    expect(evaluation.riskRating).toBe('high');
  });

  it('generates a comprehensive Traceability Matrix Report with gap metrics', () => {
    const reqList: ScopeRequirement[] = [
      sampleRequirement,
      {
        ...sampleRequirement,
        id: 'req-002',
        code: 'REQ-QND-002',
        ownerId: undefined, // Unassigned
        linkedBoqLineCode: undefined,
        targetCostQar: 0, // Uncosted
        dueDate: undefined, // Unscheduled
        disposition: 'applicable',
      },
      {
        ...sampleRequirement,
        id: 'req-003',
        code: 'REQ-QND-003',
        disposition: 'negotiated_out',
        linkedDocumentNumber: undefined, // Incomplete
      },
    ];

    const report = generateRequirementsMatrix('proj-qnd-2026', reqList);

    expect(report.totalRequirements).toBe(3);
    expect(report.applicableRequirements).toBe(2);
    expect(report.negotiatedOutRequirements).toBe(1);
    expect(report.fullyTraceableRequirements).toBe(1);
    expect(report.unassignedRequirements).toBe(1);
    expect(report.uncostedRequirements).toBe(1);
    expect(report.unscheduledRequirements).toBe(1);
    expect(report.overallTraceabilityPct).toBeGreaterThan(0);
    expect(report.evaluations.length).toBe(3);
  });
});
