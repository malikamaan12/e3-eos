import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  resolveOperationalConstraints,
  generateBumpInShifts,
  OperationalConstraintItem,
} from '@e3-eos/domain';
import { ConstraintsController } from '../apps/api/src/operations/constraints.controller.js';
import { WorkController } from '../apps/api/src/work/work.controller.js';
import { DbService } from '../apps/api/src/common/db.service.js';

describe('No Invented Structural Fallbacks & Safety Blocking Suite (Directive 7 & 10)', () => {
  let dbService: DbService;
  let constraintsController: ConstraintsController;
  let workController: WorkController;
  const projectId = '00000000-0000-4000-8000-000000000001';
  const orgId = '11111111-1111-4111-8111-111111111111';
  let createdConstraintId: string;

  const structuralEngineer = {
    userId: '10000000-0000-4000-8000-000000000015',
    email: 'structural@e3.qa',
    name: 'Eng. Bilal Qasim (Structural Engineer)',
    role: 'structural_engineer',
    organisationId: orgId,
    isSuperAdmin: false,
  };

  beforeAll(() => {
    dbService = new DbService();
    constraintsController = new ConstraintsController(dbService);
    workController = new WorkController(dbService);
  });

  afterAll(async () => {
    if (createdConstraintId) {
      const pool = dbService.getPool();
      try {
        await pool.query('DELETE FROM audit_events WHERE target_id = $1', [createdConstraintId]);
        await pool.query('DELETE FROM constraint_verifications WHERE constraint_id = $1', [createdConstraintId]);
        await pool.query('DELETE FROM constraint_source_links WHERE constraint_id = $1', [createdConstraintId]);
        await pool.query('DELETE FROM operational_constraints WHERE id = $1', [createdConstraintId]);
      } catch {}
    }
  });

  it('SAFE-01: Prohibits invented fallback (1500 kg/m²) — returns UNKNOWN_VERIFICATION_REQUIRED and blocks safety', () => {
    const baseProfile = resolveOperationalConstraints({
      venueName: 'DECC',
      countryCode: 'QA',
    });

    // Unverified profile: floor load constraint has verificationStatus = 'Unverified'
    const unverifiedConstraint: OperationalConstraintItem = {
      id: 'cst-test-unverified-floor',
      constraintType: 'floor_load',
      sourceType: 'venue',
      sourceOrganization: 'DECC Venue Engineering',
      locationZone: 'Exhibition Halls 1 to 5',
      effectivePeriod: 'Operational Horizon',
      timeWindow: '24 Hours',
      limitValue: 2500,
      unit: 'kg/m²',
      applicability: true,
      priority: 'statutory_mandatory',
      overrideAuthority: 'DECC Civil Directorate',
      verificationStatus: 'Unverified',
    };

    const profile = {
      ...baseProfile,
      constraints: [unverifiedConstraint],
    };

    const shifts = generateBumpInShifts(24, profile);
    expect(shifts.length).toBeGreaterThan(0);

    for (const shift of shifts) {
      // 1. MUST NOT substitute invented 1500 kg/m² fallback
      expect(shift.maxFloorLoadKgM2).toBeNull();
      expect(shift.maxFloorLoadKgM2).not.toBe(1500);

      // 2. Status must be explicitly UNKNOWN_VERIFICATION_REQUIRED
      expect(shift.floorLoadStatus).toBe('UNKNOWN_VERIFICATION_REQUIRED');

      // 3. Safety policy must flag structural operations as blocked
      expect(shift.structuralSafetyBlocked).toBe(true);
      expect(shift.sourceDocument).toBe('Verification Required');
    }
  });

  it('SAFE-02: Authoritative verification against DECC Floorplan unblocks structural operations and yields 2500 kg/m²', () => {
    const baseProfile = resolveOperationalConstraints({
      venueName: 'DECC',
      countryCode: 'QA',
    });

    // Verified constraint with authentic provenance
    const verifiedFloorLoad: OperationalConstraintItem = {
      id: 'cst-test-verified-floor',
      constraintType: 'floor_load',
      sourceType: 'venue',
      sourceOrganization: 'Doha Exhibition and Convention Center (DECC)',
      locationZone: 'Exhibition Halls 1 to 5 Ground Slab',
      effectivePeriod: 'Operational Horizon',
      timeWindow: '24 Hours',
      limitValue: 2500,
      unit: 'kg/m²',
      applicability: true,
      priority: 'statutory_mandatory',
      overrideAuthority: 'DECC Civil Directorate',
      verificationStatus: 'Verified',
      sourceDocument: 'DOC-DECC-FP-2024',
      controlledDocumentId: 'doc-decc-fp-01-def',
      documentRevisionId: 'rev-decc-fp-01-def',
      sourceDocumentHash: '9aaedaecbd3adaf9fb2547cca03643a4ac70c8697d8a695d94c71b0078798ffa',
      verifiedBy: 'Eng. Bilal Qasim (Structural Engineer)',
      verifiedAt: new Date().toISOString(),
      verificationRecord: {
        controlledDocumentId: 'doc-decc-fp-01-def',
        documentRevisionId: 'rev-decc-fp-01-def',
        calculatedSha256: '9aaedaecbd3adaf9fb2547cca03643a4ac70c8697d8a695d94c71b0078798ffa',
        sourceDocumentNumber: 'DOC-DECC-FP-2024',
        sourceDocumentTitle: 'DECC Official Floorplan Manual',
        revisionCode: 'Rev 2024.1',
        pageClauseSection: 'Section 3.2',
        extractedRuleValue: '2.5 T/m² (2,500 kg/m²)',
        applicabilityStatement: 'Ground Slab Live Load',
        reviewerIdentity: 'Eng. Bilal Qasim',
        reviewerRole: 'structural_engineer',
        verifiedAt: new Date().toISOString(),
        reviewerComment: 'Complies with Civil Defence and DECC engineering regulations.',
      },
    };

    const verifiedNoiseDay: OperationalConstraintItem = {
      id: 'cst-test-verified-noise-day',
      constraintType: 'environmental_boundary_noise',
      sourceType: 'statutory',
      sourceOrganization: 'Ministry of Environment and Climate Change (MECC)',
      locationZone: 'Building Boundary',
      effectivePeriod: 'Operational Horizon',
      timeWindow: '04:00 - 22:00',
      limitValue: 65,
      unit: 'dB(A)',
      applicability: true,
      priority: 'statutory_mandatory',
      overrideAuthority: 'MECC Inspectorate',
      verificationStatus: 'Verified',
      sourceDocument: 'DOC-MECC-ENV-2005',
      controlledDocumentId: 'doc-mecc-env-01-def',
      documentRevisionId: 'rev-mecc-env-01-def',
      sourceDocumentHash: '884136ab8abb69eea2b6adf2e73a986846c97b5781c2eb19f0910fb119521827',
      verifiedBy: 'Dr. Mariam Al-Sulaiti (HSE Director)',
      verifiedAt: new Date().toISOString(),
      verificationRecord: {
        controlledDocumentId: 'doc-mecc-env-01-def',
        documentRevisionId: 'rev-mecc-env-01-def',
        calculatedSha256: '884136ab8abb69eea2b6adf2e73a986846c97b5781c2eb19f0910fb119521827',
        sourceDocumentNumber: 'DOC-MECC-ENV-2005',
        sourceDocumentTitle: 'Qatar Environmental Protection Law',
        revisionCode: 'Official Gazette 2005',
        pageClauseSection: 'Annex 3/5 Day Limit',
        extractedRuleValue: '65 dB(A)',
        applicabilityStatement: 'Boundary',
        reviewerIdentity: 'Dr. Mariam Al-Sulaiti',
        reviewerRole: 'hse_director',
        verifiedAt: new Date().toISOString(),
        reviewerComment: 'Complies with statutory day limit.',
      },
    };

    const verifiedNoiseNight: OperationalConstraintItem = {
      id: 'cst-test-verified-noise-night',
      constraintType: 'environmental_boundary_noise',
      sourceType: 'statutory',
      sourceOrganization: 'Ministry of Environment and Climate Change (MECC)',
      locationZone: 'Building Boundary',
      effectivePeriod: 'Operational Horizon',
      timeWindow: '22:00 - 04:00',
      limitValue: 55,
      unit: 'dB(A)',
      applicability: true,
      priority: 'statutory_mandatory',
      overrideAuthority: 'MECC Inspectorate',
      verificationStatus: 'Verified',
      sourceDocument: 'DOC-MECC-ENV-2005',
      controlledDocumentId: 'doc-mecc-env-01-def',
      documentRevisionId: 'rev-mecc-env-01-def',
      sourceDocumentHash: '884136ab8abb69eea2b6adf2e73a986846c97b5781c2eb19f0910fb119521827',
      verifiedBy: 'Dr. Mariam Al-Sulaiti (HSE Director)',
      verifiedAt: new Date().toISOString(),
      verificationRecord: {
        controlledDocumentId: 'doc-mecc-env-01-def',
        documentRevisionId: 'rev-mecc-env-01-def',
        calculatedSha256: '884136ab8abb69eea2b6adf2e73a986846c97b5781c2eb19f0910fb119521827',
        sourceDocumentNumber: 'DOC-MECC-ENV-2005',
        sourceDocumentTitle: 'Qatar Environmental Protection Law',
        revisionCode: 'Official Gazette 2005',
        pageClauseSection: 'Annex 3/5 Night Limit',
        extractedRuleValue: '55 dB(A)',
        applicabilityStatement: 'Boundary',
        reviewerIdentity: 'Dr. Mariam Al-Sulaiti',
        reviewerRole: 'hse_director',
        verifiedAt: new Date().toISOString(),
        reviewerComment: 'Complies with statutory night limit.',
      },
    };

    const profile = {
      ...baseProfile,
      constraints: [verifiedFloorLoad, verifiedNoiseDay, verifiedNoiseNight],
    };

    const shifts = generateBumpInShifts(24, profile);
    expect(shifts.length).toBeGreaterThan(0);

    for (const shift of shifts) {
      expect(shift.maxFloorLoadKgM2).toBe(2500);
      expect(shift.floorLoadStatus).toBe('VERIFIED');
      expect(shift.structuralSafetyBlocked).toBe(false);
      expect(shift.verificationStatus).toBe('Verified');
    }
  });

  it('SAFE-03: End-to-end API lifecycle: creates unverified floor load, verifies it, and confirms Gantt schedule unblocks', async () => {
    const req = { sessionUser: structuralEngineer, organisationId: orgId } as any;

    // 1. Create fresh floor load constraint
    const createRes = await constraintsController.createConstraint(projectId, {
      constraintType: 'floor_load',
      sourceType: 'venue',
      sourceOrganization: 'DECC Civil Directorate',
      locationZone: 'Exhibition Hall 4 Ground Slab',
      timeWindow: '24 Hours',
      limitValue: 2500,
      unit: 'kg/m²',
      priority: 'statutory_mandatory',
    }, req);

    createdConstraintId = createRes.data.id;
    expect(createRes.data.verificationStatus).toBe('Draft');

    // 2. Attach controlled source document with system-calculated SHA-256
    await constraintsController.attachSource(projectId, createdConstraintId, {
      controlledDocumentId: 'doc-decc-fp-01-def',
      documentRevisionId: 'rev-decc-fp-01-def',
      pageClauseSection: 'Section 3.2 Ground Slab Live Load Uniform Capacity',
    }, req);

    await constraintsController.submitForReview(projectId, createdConstraintId, req);

    // 3. Verify constraint by Structural Engineer
    const verifyRes = await constraintsController.verifyConstraint(projectId, createdConstraintId, {
      pageClauseSection: 'Section 3.2',
      extractedRuleValue: '2.5 T/m² (2,500 kg/m²)',
      applicabilityStatement: 'Exhibition Hall 4 Ground Slab',
      reviewerComment: 'Audited and verified against controlled venue specifications.',
    }, req);

    expect(verifyRes.data.verificationStatus).toBe('Verified');
    expect(verifyRes.data.verifiedBy).toBe('Eng. Bilal Qasim (Structural Engineer)');

    // 4. Query Gantt schedule endpoint to ensure live schedule reflects verified state
    const ganttRes = await workController.getGanttSchedule(projectId);
    expect(ganttRes.data.operationalConstraints).toBeDefined();

    const verifiedConstraintInDb = ganttRes.data.operationalConstraints.constraints.find(
      (c: any) => c.id === createdConstraintId
    );
    expect(verifiedConstraintInDb).toBeDefined();
    expect(verifiedConstraintInDb.verificationStatus).toBe('Verified');
    expect(verifiedConstraintInDb.limitValue).toBe(2500);
  });
});
