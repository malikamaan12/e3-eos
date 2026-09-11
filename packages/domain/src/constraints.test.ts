import { describe, it, expect } from 'vitest';
import {
  createConstraint,
  attachSourceToConstraint,
  submitConstraintForReview,
  verifyConstraint,
  supersedeConstraint,
  validateConstraintVerification,
  isConstraintVerifiedWithEvidence,
  filterEnforceableConstraints,
  AUTHORIZED_VERIFIER_ROLES,
  DOHA_DECC_PROFILE,
  DECC_VENUE_CONSTRAINTS,
  DECC_FLOORPLAN_SHA256,
  QATAR_ENV_LAW_SHA256,
  UNVERIFIED_DRAFT_VENUE_PROFILE,
} from './constraints.js';
import { generateBumpInShifts } from './gantt.js';
import { calculateFileSha256 } from './documents.js';

describe('Operational Constraint Verification Engine & Provenance Integrity', () => {
  it('strictly starts constraints in Draft and prohibits direct manual assignment of Verified status', () => {
    const item = createConstraint({
      id: 'cst-test-001',
      constraintType: 'venue_operational_noise',
      sourceType: 'venue',
      sourceOrganization: 'Lusail Operations',
      sourceDocument: 'Pending upload',
      sourceRevisionDate: '2026-09-11',
      locationZone: 'Main Arena',
      effectivePeriod: 'Operational Window',
      timeWindow: '08:00 - 20:00',
      limitValue: 80,
      unit: 'dB(A)',
      applicability: true,
      priority: 'high',
      overrideAuthority: 'Technical Director',
    });

    expect(item.verificationStatus).toBe('Draft');
    expect(item.verificationRecord).toBeUndefined();
    expect(item.sourceDocumentHash).toBeUndefined();
    expect(item.verifiedBy).toBeUndefined();
    expect(item.verifiedAt).toBeUndefined();
    expect(isConstraintVerifiedWithEvidence(item)).toBe(false); expect(validateConstraintVerification(item).isValid).toBe(true); expect(AUTHORIZED_VERIFIER_ROLES).toContain('technical_director');
  });

  it('executes the 5-state lifecycle: Draft -> Source Attached -> Under Review -> Verified -> Superseded', () => {
    // 1. Create constraint in Draft
    let constraint = createConstraint({
      id: 'cst-live-01',
      constraintType: 'floor_load',
      sourceType: 'venue',
      sourceOrganization: 'DECC Engineering',
      sourceDocument: 'Technical Guide',
      sourceRevisionDate: 'Rev 1',
      locationZone: 'Hall 1',
      effectivePeriod: 'Show Horizon',
      timeWindow: '24 Hours',
      limitValue: 2500,
      unit: 'kg/m²',
      applicability: true,
      priority: 'statutory_mandatory',
      overrideAuthority: 'DECC Structural Directorate',
    });
    expect(constraint.verificationStatus).toBe('Draft');

    // 2. Attach controlled source document with system-calculated SHA-256 hash
    const fakeDocBytes = 'DECC Official Structural Slab Test Report 2026';
    const computedHash = calculateFileSha256(fakeDocBytes);
    constraint = attachSourceToConstraint(constraint, {
      controlledDocumentId: 'doc-decc-001',
      documentRevisionId: 'rev-001',
      calculatedSha256: computedHash,
      documentNumber: 'DOC-DECC-FP-2024',
      title: 'Official Technical Floorplan',
      revisionCode: 'Rev 2024.1',
      pageClauseSection: 'Section 3.2',
    });
    expect(constraint.verificationStatus).toBe('Source Attached');
    expect(constraint.controlledDocumentId).toBe('doc-decc-001');
    expect(constraint.sourceDocumentHash).toBe(`sha256:${computedHash}`);

    // Cannot attach source without a valid system-calculated hash
    expect(() =>
      attachSourceToConstraint(constraint, {
        controlledDocumentId: 'doc-bad',
        documentRevisionId: 'rev-bad',
        calculatedSha256: '',
        documentNumber: 'DOC-BAD',
        title: 'Bad Doc',
        revisionCode: 'Rev 0',
      })
    ).toThrow('Cannot attach source document without a valid system-calculated SHA-256 hash.');

    // 3. Submit for formal review
    constraint = submitConstraintForReview(constraint);
    expect(constraint.verificationStatus).toBe('Under Review');

    // 4. Verification review: Unauthorized roles are strictly rejected
    expect(() =>
      verifyConstraint(constraint, {
        reviewerIdentity: 'Joe Developer',
        reviewerRole: 'software_engineer', // NOT an authorized role
        pageClauseSection: 'Section 3.2',
        extractedRuleValue: '2500 kg/m²',
        applicabilityStatement: 'Hall 1 Slab',
        reviewerComment: 'Self-approved',
      })
    ).toThrow(/is not authorized to verify operational constraints/);

    // 4b. Verification review by authorized role (structural_engineer)
    constraint = verifyConstraint(constraint, {
      reviewerIdentity: 'Eng. Tariq Al-Mansoor',
      reviewerRole: 'structural_engineer',
      pageClauseSection: 'Section 3.2 (Ground Slab Uniform Live Load)',
      extractedRuleValue: '2.5 T/m² (2,500 kg/m² / 25 kN/m²)',
      applicabilityStatement: 'DECC Exhibition Halls 1 to 5 Ground Slab',
      reviewerComment: 'Authoritative structural slab live load capacity confirmed.',
      auditEventId: 'audit-test-decc-001',
      verifiedAt: '2026-09-11T12:00:00Z',
    });

    expect(constraint.verificationStatus).toBe('Verified');
    expect(constraint.verificationRecord).toBeDefined();
    expect(constraint.verificationRecord?.reviewerIdentity).toBe('Eng. Tariq Al-Mansoor');
    expect(constraint.verificationRecord?.reviewerRole).toBe('structural_engineer');
    expect(constraint.verificationRecord?.pageClauseSection).toBe('Section 3.2 (Ground Slab Uniform Live Load)');
    expect(constraint.verificationRecord?.extractedRuleValue).toBe('2.5 T/m² (2,500 kg/m² / 25 kN/m²)');
    expect(constraint.verificationRecord?.auditEventId).toBe('audit-test-decc-001');
    expect(constraint.verifiedBy).toBe('Eng. Tariq Al-Mansoor (structural_engineer)');
    expect(isConstraintVerifiedWithEvidence(constraint)).toBe(true);

    // Cannot modify source on an already Verified constraint without superseding it
    expect(() =>
      attachSourceToConstraint(constraint, {
        controlledDocumentId: 'doc-new',
        documentRevisionId: 'rev-new',
        calculatedSha256: computedHash,
        documentNumber: 'DOC-NEW',
        title: 'New',
        revisionCode: 'Rev 2',
      })
    ).toThrow('Cannot modify source on an already Verified constraint without superseding it.');

    // 5. Supersede constraint
    constraint = supersedeConstraint(constraint, 'Superseded by 2027 revised venue pack');
    expect(constraint.verificationStatus).toBe('Superseded');
    expect(constraint.notes).toContain('Superseded: Superseded by 2027 revised venue pack');
    expect(isConstraintVerifiedWithEvidence(constraint)).toBe(false);
  });

  it('validates authentic DECC controlled specifications and Qatar statutory baseline', () => {
    // Floor Loading is 2.5 T/m² (2,500 kg/m²)
    const floorLoad = DECC_VENUE_CONSTRAINTS.find((c) => c.constraintType === 'floor_load');
    expect(floorLoad).toBeDefined();
    expect(floorLoad?.limitValue).toBe(2500);
    expect(floorLoad?.verificationStatus).toBe('Verified');
    expect(floorLoad?.sourceDocument).toContain('DOC-DECC-FP-2024');
    expect(floorLoad?.sourceDocumentHash).toBe(DECC_FLOORPLAN_SHA256);
    expect(floorLoad?.verificationRecord?.reviewerRole).toBe('structural_engineer');

    // Hall Clear Height is 18 m
    const height = DECC_VENUE_CONSTRAINTS.find((c) => c.constraintType === 'clear_height');
    expect(height).toBeDefined();
    expect(height?.limitValue).toBe(18);
    expect(height?.verificationStatus).toBe('Verified');
    expect(height?.sourceDocument).toContain('DOC-DECC-FP-2024');
    expect(height?.sourceDocumentHash).toBe(DECC_FLOORPLAN_SHA256);

    // Environmental Boundary Daytime Noise: 65 dB
    const dayNoise = DECC_VENUE_CONSTRAINTS.find((c) => c.id === 'CST-QA-ENV-NOISE-DAY-001');
    expect(dayNoise).toBeDefined();
    expect(dayNoise?.limitValue).toBe(65);
    expect(dayNoise?.timeWindow).toBe('04:00 - 22:00');
    expect(dayNoise?.verificationStatus).toBe('Verified');
    expect(dayNoise?.sourceDocument).toContain('Qatar Environmental Protection Law No. 30 of 2002');
    expect(dayNoise?.sourceRevisionDate).toBe('Official Gazette 2005');
    expect(dayNoise?.sourceDocumentHash).toBe(QATAR_ENV_LAW_SHA256);

    // Environmental Boundary Night Noise Curfew: 55 dB, strictly 22:00 to 04:00
    const nightNoise = DECC_VENUE_CONSTRAINTS.find((c) => c.id === 'CST-QA-ENV-NOISE-NIGHT-002');
    expect(nightNoise).toBeDefined();
    expect(nightNoise?.limitValue).toBe(55);
    expect(nightNoise?.timeWindow).toBe('22:00 - 04:00');
    expect(nightNoise?.verificationStatus).toBe('Verified');
    expect(nightNoise?.sourceDocument).toContain('Qatar Environmental Protection Law No. 30 of 2002');
    expect(nightNoise?.sourceRevisionDate).toBe('Official Gazette 2005');
    expect(nightNoise?.sourceDocumentHash).toBe(QATAR_ENV_LAW_SHA256);

    // Occupational worker noise: 85 dB(A) for continuous 8h shift under Res 4 of 2005 Annex 3/6
    const occNoise = DECC_VENUE_CONSTRAINTS.find((c) => c.id === 'CST-QA-NOISE-OCC-003');
    expect(occNoise).toBeDefined();
    expect(occNoise?.limitValue).toBe(85);
    expect(occNoise?.verificationStatus).toBe('Verified');
    expect(occNoise?.sourceDocument).toContain('DOC-MECC-ENV-2005'); expect(occNoise?.verificationRecord?.pageClauseSection).toBe('Annex 3/6');
    expect(occNoise?.sourceDocument).not.toContain('Ministerial Decision No. 16 of 2005');
    expect(occNoise?.sourceDocumentHash).toBe(QATAR_ENV_LAW_SHA256);

    // Unsupported dimensions remain strictly Unverified
    const rigging = DECC_VENUE_CONSTRAINTS.find((c) => c.constraintType === 'rigging_point');
    expect(rigging?.verificationStatus).toBe('Unverified');
    expect(rigging?.sourceDocumentHash).toBeUndefined();

    const logistics = DECC_VENUE_CONSTRAINTS.find((c) => c.constraintType === 'logistics_dock');
    expect(logistics?.verificationStatus).toBe('Unverified');
    expect(logistics?.sourceDocumentHash).toBeUndefined();

    const labour = DECC_VENUE_CONSTRAINTS.find((c) => c.constraintType === 'working_hours');
    expect(labour?.verificationStatus).toBe('Unverified');
  });

  it('proves that unverified constraints are rejected by the deterministic scheduling engine', () => {
    // 1. Filter enforceable constraints only returns verified items backed by authentic evidence
    const enforceableDecc = filterEnforceableConstraints(DOHA_DECC_PROFILE, { allowedVerificationStatuses: ['Verified'] });
    expect(enforceableDecc.length).toBe(5); // 5 verified: day noise, night noise, occ noise, floor load, clear height
    expect(enforceableDecc.every((c) => c.verificationStatus === 'Verified')).toBe(true);

    // Unverified items (rigging, logistics, labour) are completely excluded from enforcement
    const excludedIds = enforceableDecc.map((c) => c.id);
    expect(excludedIds).not.toContain('CST-DECC-RIG-POINT-006');
    expect(excludedIds).not.toContain('CST-QA-LABOUR-HOURS-007');
    expect(excludedIds).not.toContain('CST-DECC-LOGISTICS-008');

    // 2. Draft profile with unverified 99 dB / 5000 kg/m² is rejected by scheduling engine
    const draftProfileEnforceable = filterEnforceableConstraints(UNVERIFIED_DRAFT_VENUE_PROFILE, { allowedVerificationStatuses: ['Verified'] });
    expect(draftProfileEnforceable).toHaveLength(0);

    const shifts = generateBumpInShifts(24, UNVERIFIED_DRAFT_VENUE_PROFILE);
    expect(shifts[0].verificationStatus).toBe('Unverified');
    expect(shifts[0].maxFloorLoadKgM2).toBe(1500); // Does NOT enforce unverified 5000 kg/m²! Falls back to 1500!
    const dayShift = shifts.find((s) => !s.isCurfewActive);
    const nightShift = shifts.find((s) => s.isCurfewActive);
    expect(dayShift?.allowedNoiseDb).toBe(65); // Does NOT enforce unverified 99 dB! Falls back to statutory 65!
    expect(nightShift?.allowedNoiseDb).toBe(55); // Does NOT enforce unverified 70 dB! Falls back to statutory 55!
  });
});
