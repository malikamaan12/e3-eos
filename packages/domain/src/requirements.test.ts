import { describe, it, expect } from 'vitest';
import {
  ScopeRequirement,
  evaluateRequirementTraceability,
  generateRequirementsMatrix,
  normalizeEngineeringUnit,
  inferPhysicalUnitAndQuantity,
  formatQuantityAndUnit,
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

  it('evaluates Stage 04 requirement as 100% current-stage maturity even when overall lifecycle coverage is 57%', () => {
    // Stage 04 requirement: Owner + Target Date + Controlled Document + Design Version complete
    // BOQ cost, approval, and delivery evidence are downstream (Required Later)
    const stage04Req: ScopeRequirement = {
      id: 'req-s04-001',
      projectId: 'proj-qnd-2026',
      code: 'REQ-STAGE-04',
      title: 'Grandstand Canopy Fabric Membrane Specification',
      description: 'Architectural fabric membrane engineering',
      category: 'staging_technical',
      ownerId: 'usr-pm-01',
      ownerName: 'Zaid Mansour (Lead PM)',
      dueDate: '2026-11-15',
      linkedDocumentNumber: 'E3-QND26-STG-DWG-0002',
      linkedDesignVersion: 'Rev 01',
      disposition: 'applicable',
      createdAt: '2026-09-10T10:00:00Z',
    };

    const evalResult = evaluateRequirementTraceability(stage04Req, { currentStageNumber: 4 });

    // Current-stage points: 4 required now (Owner, Target Date, Document, Design) -> 4 completed = 100%
    expect(evalResult.currentStageRequiredPoints).toBe(4);
    expect(evalResult.currentStageCompletedPoints).toBe(4);
    expect(evalResult.currentStageMaturityPct).toBe(100);
    expect(evalResult.isStageMaturitySatisfied).toBe(true);
    expect(evalResult.riskRating).toBe('low'); // NOT false critical!

    // Overall points: 4 / 7 = 57%
    expect(evalResult.completedPoints).toBe(4);
    expect(evalResult.totalPoints).toBe(7);
    expect(evalResult.overallTraceabilityPct).toBe(57);
    expect(evalResult.isFullyTraceable).toBe(false);

    // Downstream dimensions report 'Required Later'
    const boqDim = evalResult.dimensions.find((d) => d.key === 'boqCost');
    expect(boqDim?.status).toBe('Required Later');
    const apprDim = evalResult.dimensions.find((d) => d.key === 'approvalSignoff');
    expect(apprDim?.status).toBe('Required Later');
    const delivDim = evalResult.dimensions.find((d) => d.key === 'deliveryEvidence');
    expect(delivDim?.status).toBe('Required Later');
  });

  describe('Physical Engineering Units & Normalization Engine', () => {
    it('normalizes various area and linear unit strings to engineering standards', () => {
      expect(normalizeEngineeringUnit('m2')).toBe('sqm');
      expect(normalizeEngineeringUnit('m²')).toBe('sqm');
      expect(normalizeEngineeringUnit('sqm')).toBe('sqm');
      expect(normalizeEngineeringUnit('square meters')).toBe('sqm');
      expect(normalizeEngineeringUnit('lm')).toBe('lm');
      expect(normalizeEngineeringUnit('linear meters')).toBe('lm');
      expect(normalizeEngineeringUnit('meters')).toBe('meter');
      expect(normalizeEngineeringUnit('kg')).toBe('kg');
      expect(normalizeEngineeringUnit('tonnes')).toBe('tonnes');
      expect(normalizeEngineeringUnit('tons')).toBe('tonnes');
      expect(normalizeEngineeringUnit('set')).toBe('set');
      expect(normalizeEngineeringUnit('towers')).toBe('towers');
      expect(normalizeEngineeringUnit('panels')).toBe('panels');
    });

    it('intelligently infers physical units and realistic baseline quantities from deliverable keywords', () => {
      // Area deliverables
      const fabric = inferPhysicalUnitAndQuantity('QCDD Flame-Retardant Fabric Drapes', 'Fire-resistant scenic textiles');
      expect(fabric.unit).toBe('sqm');
      expect(fabric.quantity).toBe(3500);

      const carpet = inferPhysicalUnitAndQuantity('VIP Royal Protocol Red Carpet & Shaded Majlis', 'Ceremonial arrival portico');
      expect(carpet.unit).toBe('sqm');
      expect(carpet.quantity).toBe(850);

      const pavilion = inferPhysicalUnitAndQuantity('Lusail Royal Pavilion Footings & Flooring', 'Engineered flooring');
      expect(pavilion.unit).toBe('sqm');
      expect(pavilion.quantity).toBe(1200);

      // Linear deliverables
      const arch = inferPhysicalUnitAndQuantity('Main Ceremony 360-Degree Kinetic LED Arch', 'Central boulevard span');
      expect(arch.unit).toBe('meter');
      expect(arch.quantity).toBe(45);

      const cable = inferPhysicalUnitAndQuantity('Perimeter Cable Trenching & Protection', 'Boulevard cable trenching');
      expect(cable.unit).toBe('lm');
      expect(cable.quantity).toBe(450);

      // Mass / ballast
      const ballast = inferPhysicalUnitAndQuantity('Emergency Ballast & Wind Restraint Systems', 'Counterweight deadweight blocks');
      expect(ballast.unit).toBe('tonnes');
      expect(ballast.quantity).toBe(24);

      // Towers
      const towers = inferPhysicalUnitAndQuantity('Boulevard Audio Delay Towers', 'Weatherproof line array towers');
      expect(towers.unit).toBe('towers');
      expect(towers.quantity).toBe(12);
    });

    it('preserves explicitly defined physical units and non-generic quantities', () => {
      const explicit = inferPhysicalUnitAndQuantity('Custom Lighting Rig', 'Lighting fixtures', 80, 'fixtures');
      expect(explicit.quantity).toBe(80);
      expect(explicit.unit).toBe('fixtures');
    });

    it('formats quantity and physical unit cleanly without defaulting to generic "1 units"', () => {
      expect(formatQuantityAndUnit(45, 'meter')).toBe('45 meter');
      expect(formatQuantityAndUnit(1200, 'sqm')).toBe('1,200 sqm');
      expect(formatQuantityAndUnit(3500, 'sqm')).toBe('3,500 sqm');
      expect(formatQuantityAndUnit(850, 'sqm')).toBe('850 sqm');
      expect(formatQuantityAndUnit(24, 'tonnes')).toBe('24 tonnes');
      expect(formatQuantityAndUnit(12, 'towers')).toBe('12 towers');

      // Inferred format when unit is missing or generic 'units'
      expect(formatQuantityAndUnit(undefined, 'units', 'Kinetic LED Arch', 'Boulevard central span')).toBe('45 meter');
      expect(formatQuantityAndUnit(undefined, undefined, 'Red Carpet Majlis', 'VIP protocol')).toBe('850 sqm');
    });
  });
});
