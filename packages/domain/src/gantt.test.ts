import { describe, it, expect } from 'vitest';
import { calculateCpmSchedule, generateBumpInShifts, GanttTaskInput } from './gantt.js';
import { DOHA_DECC_PROFILE, QATAR_CIVIL_DEFENCE_PERMIT_PROFILE } from './constraints.js';

describe('Master Timeline & Operational Gantt Engine', () => {
  it('calculates early/late dates and identifies the critical path correctly', () => {
    // 3 tasks in sequence: T1 (10h) -> T2 (20h) -> T3 (15h)
    // T4 parallel with float: T4 (5h, predecessor T1)
    const tasks: GanttTaskInput[] = [
      { id: 't1', code: 'TSK-01', title: 'Site Possession & Grid Marking', durationHours: 10 },
      { id: 't2', code: 'TSK-02', title: 'Primary Truss Hoisting', durationHours: 20, predecessorIds: [{ id: 't1', type: 'FS' }] },
      { id: 't3', code: 'TSK-03', title: 'LED Screen Hanging & Patching', durationHours: 15, predecessorIds: [{ id: 't2', type: 'FS' }] },
      { id: 't4', code: 'TSK-04', title: 'FOH Control Tent Erection', durationHours: 5, predecessorIds: [{ id: 't1', type: 'FS' }] },
    ];

    const cpm = calculateCpmSchedule(tasks);

    // Total duration: 10 + 20 + 15 = 45 hours
    expect(cpm.projectDurationHours).toBe(45);
    expect(cpm.criticalPathTaskIds).toContain('t1');
    expect(cpm.criticalPathTaskIds).toContain('t2');
    expect(cpm.criticalPathTaskIds).toContain('t3');

    // T4 should NOT be critical because it has float (duration 5h, early finish 15h, late finish 45h -> float 30h)
    expect(cpm.criticalPathTaskIds).not.toContain('t4');

    const t4 = cpm.tasks.find((t) => t.id === 't4');
    expect(t4?.isCritical).toBe(false);
    expect(t4?.totalFloatHours).toBeGreaterThan(0);
  });

  it('generates site bump-in operational shifts driven by configurable Operational Constraint Profiles', () => {
    // 1. Using DECC Doha Venue Profile:
    // - Environmental noise: 65 dB Day / 55 dB Night (Qatar Law No. 30 of 2002 & Cabinet Decision No. 4 of 2005)
    // - Occupational worker safety: 85 dB(A) 8h TWA (Qatar Labour Law No. 14 of 2004 & Ministerial Decision No. 16 of 2005)
    // - Slab live load: 2,500 kg/m² (2.5 T/m² per DOC-DECC-VTR-2024 Section 3.2)
    const deccShifts = generateBumpInShifts(72, DOHA_DECC_PROFILE);
    expect(deccShifts.length).toBe(9); // 72 / 8 = 9 shifts

    const nightShifts = deccShifts.filter((s) => s.isCurfewActive);
    expect(nightShifts.length).toBeGreaterThan(0);
    for (const ns of nightShifts) {
      expect(ns.allowedNoiseDb).toBe(55); // Statutory environmental night limit
      expect(ns.occupationalNoiseLimitDb).toBe(85); // Statutory occupational exposure threshold
      expect(ns.shiftType).toBe('overnight_heavy_lift');
      expect(ns.maxFloorLoadKgM2).toBe(2500); // Official DECC 2.5 T/m² (2,500 kg/m²), NOT 2,000!
      expect(ns.appliedConstraintProfileId).toBe('PROF-VENUE-DECC-001');
    }

    const dayShifts = deccShifts.filter((s) => !s.isCurfewActive);
    for (const ds of dayShifts) {
      expect(ds.allowedNoiseDb).toBe(65); // Statutory environmental daytime boundary limit
      expect(ds.occupationalNoiseLimitDb).toBe(85); // Statutory occupational exposure threshold
      expect(ds.maxFloorLoadKgM2).toBe(2500); // Official DECC 2.5 T/m²
    }

    // 2. Using Qatar Civil Defence Outdoor Permit Profile (Unverified until formal audit)
    const qcdShifts = generateBumpInShifts(48, QATAR_CIVIL_DEFENCE_PERMIT_PROFILE);
    expect(qcdShifts.length).toBe(6);
    expect(qcdShifts[0].appliedConstraintProfileId).toBe('PROF-PERMIT-QCD-2026');
  });

  it('enforces only verified constraints according to policy, rejecting unverified/draft constraints', async () => {
    const {
      UNVERIFIED_DRAFT_VENUE_PROFILE,
      filterEnforceableConstraints,
      validateConstraintVerification,
    } = await import('./constraints.js');

    // Check all 14 mandatory fields and cryptographic evidence on DECC constraints
    for (const c of DOHA_DECC_PROFILE.constraints) {
      expect(c.id).toBeDefined();
      expect(c.constraintType).toBeDefined();
      expect(c.sourceType).toBeDefined();
      expect(c.sourceOrganization).toBeDefined();
      expect(c.sourceDocument).toBeDefined();
      expect(c.sourceRevisionDate).toBeDefined();
      expect(c.locationZone).toBeDefined();
      expect(c.effectivePeriod).toBeDefined();
      expect(c.timeWindow).toBeDefined();
      expect(c.limitValue).toBeDefined();
      expect(c.unit).toBeDefined();
      expect(typeof c.applicability).toBe('boolean');
      expect(c.priority).toBeDefined();
      expect(c.overrideAuthority).toBeDefined();
      expect(['Draft', 'Unverified', 'Verified', 'Superseded']).toContain(c.verificationStatus);

      // Strict evidence check: verified constraints MUST have real hash, reviewer, and date
      if (c.verificationStatus === 'Verified') {
        const check = validateConstraintVerification(c);
        expect(check.isValid).toBe(true);
        expect(check.errors).toHaveLength(0);
        expect(c.sourceDocumentHash).toMatch(/^sha256:[a-f0-9]{64}$/);
        expect(c.verifiedBy).toBeTruthy();
        expect(c.verifiedAt).toBeTruthy();
      }
    }

    // Attempting to claim Verified status without evidence must be rejected by validator
    const invalidVerifiedConstraint = {
      ...DOHA_DECC_PROFILE.constraints[0],
      sourceDocumentHash: undefined,
      verifiedBy: undefined,
    };
    const invalidCheck = validateConstraintVerification(invalidVerifiedConstraint);
    expect(invalidCheck.isValid).toBe(false);
    expect(invalidCheck.errors.length).toBeGreaterThan(0);

    // Filter enforceable constraints for DECC: all verified constraints returned
    const verifiedDecc = filterEnforceableConstraints(DOHA_DECC_PROFILE, { allowedVerificationStatuses: ['Verified'] });
    expect(verifiedDecc.length).toBeGreaterThan(0);
    expect(verifiedDecc.every((c) => c.verificationStatus === 'Verified')).toBe(true);

    // Filter enforceable constraints for draft profile: unverified/draft constraints excluded
    const enforceableDraft = filterEnforceableConstraints(UNVERIFIED_DRAFT_VENUE_PROFILE, { allowedVerificationStatuses: ['Verified'] });
    expect(enforceableDraft).toHaveLength(0);

    // Scheduling engine safety policy: When given UNVERIFIED_DRAFT_VENUE_PROFILE (unverified 99 dB / draft 5000 kg/m2),
    // the scheduling engine REFUSES to enforce unverified limits. For environmental noise it falls back to statutory limits (65 dB / 55 dB).
    // For structural floor load, IT DOES NOT INVENT A 1500 kg/m² FALLBACK (Item 7); instead it returns UNKNOWN_VERIFICATION_REQUIRED and blocks safety-critical rigging.
    const fallbackShifts = generateBumpInShifts(24, UNVERIFIED_DRAFT_VENUE_PROFILE);
    expect(fallbackShifts[0].verificationStatus).toBe('Unverified');
    const dayShift = fallbackShifts.find((s) => !s.isCurfewActive);
    const nightShift = fallbackShifts.find((s) => s.isCurfewActive);
    expect(dayShift?.allowedNoiseDb).toBe(65); // Day fallback: 65 dB, NOT 99 dB unverified!
    expect(nightShift?.allowedNoiseDb).toBe(55); // Night fallback: 55 dB, NOT 70 dB unverified!
    expect(fallbackShifts[0].maxFloorLoadKgM2).toBeNull(); // No invented 1500 kg/m² fallback!
    expect(fallbackShifts[0].floorLoadStatus).toBe('UNKNOWN_VERIFICATION_REQUIRED');
    expect(fallbackShifts[0].structuralSafetyBlocked).toBe(true);
  });
});

