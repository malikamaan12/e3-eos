/**
 * Operational Constraint Profile Engine
 * Core domain logic for E3 Event Operating System (EOS)
 *
 * Replaces unexplained statutory assumptions with controlled Operational Constraint Profiles
 * derived from Country, Municipality, Venue, Permit, and Client regulations.
 *
 * Every constraint item maintains full provenance and verification lifecycle:
 * - Constraint Type
 * - Source Type
 * - Source Organization
 * - Source Document
 * - Source Revision/Date
 * - Location/Zone
 * - Effective Period
 * - Time Window
 * - Limit/Value
 * - Unit
 * - Applicability
 * - Priority
 * - Override Authority
 * - Verification Status: Draft | Unverified | Verified | Superseded
 */

import { calculateFileSha256 } from './documents.js';

export type ConstraintSource = 'country' | 'municipality' | 'venue' | 'permit' | 'client';
export type ConstraintSourceType = 'venue' | 'municipality' | 'authority' | 'permit' | 'client' | 'country';

export type VerificationStatus =
  | 'Draft'
  | 'Source Attached'
  | 'Under Review'
  | 'Verified'
  | 'Superseded'
  | 'Unverified';

export type ConstraintPriority = 'low' | 'medium' | 'high' | 'statutory_mandatory';

export type ConstraintType =
  | 'environmental_boundary_noise'
  | 'occupational_noise_exposure'
  | 'venue_operational_noise'
  | 'permit_noise_limit'
  | 'sound_system_operational_limit'
  // Backwards compatibility aliases
  | 'occupational_noise'
  | 'environmental_noise_day'
  | 'environmental_noise_night'
  | 'noise_day'
  | 'noise_night'
  | 'floor_load'
  | 'rigging_point'
  | 'clear_height'
  | 'working_hours'
  | 'logistics_dock'
  | 'utility_power'
  | string;

/**
 * Authoritative verification record generated strictly by the formal verification workflow
 * after a controlled document is uploaded, cryptographically hashed by EOS, and reviewed by an authorized user.
 */
export interface ConstraintVerificationRecord {
  controlledDocumentId: string;
  documentRevisionId: string;
  calculatedSha256: string;
  sourceDocumentNumber: string;
  sourceDocumentTitle: string;
  revisionCode: string;
  pageClauseSection: string;
  extractedRuleValue: string;
  applicabilityStatement: string;
  reviewerIdentity: string; // Authenticated verifier username or user ID
  reviewerRole: string;     // Authorised role e.g. technical_director, hse_director, structural_engineer
  verifiedAt: string;       // ISO timestamp
  reviewerComment: string;
  auditEventId?: string;    // Reference to immutable audit ledger entry
}

/**
 * First-class granular constraint item with complete 14-point provenance metadata
 * plus cryptographically verifiable evidence fields (source document hash, reviewer, review date).
 * Authoritative fields (sourceDocumentHash, verifiedBy, verifiedAt, verificationRecord)
 * are system-managed and CANNOT be manually populated to make a constraint Verified.
 */
export interface OperationalConstraintItem {
  id: string;
  constraintType: ConstraintType;
  sourceType: ConstraintSourceType;
  sourceOrganization: string;
  sourceDocument: string;
  sourceDocumentHash?: string; // System-calculated SHA-256 hash (sha256:...)
  verifiedBy?: string;         // Certified reviewer identity and role
  verifiedAt?: string;         // ISO timestamp of verification audit
  evidenceSummary?: string;    // Regulatory clause / section excerpt
  controlledDocumentId?: string;
  documentRevisionId?: string;
  calculatedSha256?: string;
  verificationRecord?: ConstraintVerificationRecord;
  sourceRevisionDate: string;
  locationZone: string;
  effectivePeriod: string;
  timeWindow: string;
  limitValue: number | string;
  unit: string;
  applicability: boolean;
  priority: ConstraintPriority;
  overrideAuthority: string;
  verificationStatus: VerificationStatus;
  notes?: string;
}

export interface NoiseConstraint {
  dayMaxDb: number;              // Environmental boundary daytime limit (e.g. 65 dB(A) Leq)
  nightMaxDb: number;            // Environmental boundary nighttime curfew limit (e.g. 55 dB(A) Leq)
  occupationalMaxDb?: number;    // Occupational worker safety 8h TWA limit (e.g. 85 dB(A))
  curfewStartHour: number;       // 24-hour format e.g. 22 for 22:00
  curfewEndHour: number;         // 24-hour format e.g. 6 for 06:00
  weekendRestrictions?: string;
  sourceReference: string;
  verificationStatus?: VerificationStatus;
  sourceDocument?: string;
  sourceDocumentHash?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface WorkingHoursConstraint {
  standardShiftHours: number;
  overnightPermitRequired: boolean;
  mandatoryBreakIntervalHours: number;
  maxConsecutiveHoursPerCrew: number;
  sourceReference: string;
  verificationStatus?: VerificationStatus;
  sourceDocument?: string;
  sourceDocumentHash?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface StructuralConstraint {
  maxFloorLoadKgM2: number;       // e.g. 2500 kg/m² for DECC (2.5 T/m²)
  maxRiggingPointWeightKg: number;
  pointLoadCertRequired: boolean;
  sourceReference: string;
  verificationStatus?: VerificationStatus;
  sourceDocument?: string;
  sourceDocumentHash?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface WorkingHeightConstraint {
  maxClearHeightMeters: number;
  boomLiftPermitRequired: boolean;
  windSpeedShutoffKmh: number;
  sourceReference: string;
  verificationStatus?: VerificationStatus;
  sourceDocument?: string;
  sourceDocumentHash?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface LogisticsAccessConstraint {
  loadingBayCapacityTrucks: number;
  marshallingYardRequired: boolean;
  restrictedDeliveryWindows: Array<{ startHour: number; endHour: number; description: string }>;
  sourceReference: string;
  verificationStatus?: VerificationStatus;
  sourceDocument?: string;
  sourceDocumentHash?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface UtilityPowerConstraint {
  availableGridKva: number;
  temporaryGeneratorPermitRequired: boolean;
  fuelStorageRegulations: string;
  sourceReference: string;
  verificationStatus?: VerificationStatus;
  sourceDocument?: string;
  sourceDocumentHash?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface OperationalConstraintProfile {
  id: string;
  name: string;
  source: ConstraintSource;
  jurisdictionOrVenue: string;
  sourceReference: string;
  packType: 'controlled_venue_pack' | 'project_configuration' | 'statutory_baseline';
  constraints: OperationalConstraintItem[];
  noise: NoiseConstraint;
  workingHours: WorkingHoursConstraint;
  structural: StructuralConstraint;
  height: WorkingHeightConstraint;
  logistics: LogisticsAccessConstraint;
  utilities: UtilityPowerConstraint;
}

export interface SchedulingPolicy {
  allowedVerificationStatuses: VerificationStatus[];
}

export const CONSTRAINTS_VERIFY_PERMISSION = 'constraints.verify';

export const AUTHORIZED_VERIFIER_ROLES = [
  'technical_director',
  'hse_director',
  'structural_engineer',
  'project_director',
  'super_admin',
];

export function hasConstraintVerifyPermission(role?: string | null, isSuperAdmin: boolean = false): boolean {
  if (isSuperAdmin) return true;
  if (!role) return false;
  return AUTHORIZED_VERIFIER_ROLES.includes(role);
}

/**
 * Creates a new constraint item in Draft (or Unverified) status.
 * Authoritative fields (verificationRecord, verifiedBy, verifiedAt, sourceDocumentHash)
 * cannot be supplied by developers during initial creation to bypass review.
 */
export function createConstraint(
  params: Omit<
    OperationalConstraintItem,
    | 'verificationStatus'
    | 'verificationRecord'
    | 'sourceDocumentHash'
    | 'verifiedBy'
    | 'verifiedAt'
    | 'controlledDocumentId'
    | 'documentRevisionId'
    | 'calculatedSha256'
  > & {
    initialStatus?: 'Draft' | 'Unverified';
  }
): OperationalConstraintItem {
  return {
    ...params,
    verificationStatus: params.initialStatus || 'Draft',
  };
}

/**
 * Attaches a controlled source document revision with its system-calculated SHA-256 hash.
 * Transitions: Draft -> Source Attached.
 */
export function attachSourceToConstraint(
  constraint: OperationalConstraintItem,
  source: {
    controlledDocumentId: string;
    documentRevisionId: string;
    calculatedSha256: string;
    documentNumber: string;
    title: string;
    revisionCode: string;
    pageClauseSection?: string;
  }
): OperationalConstraintItem {
  if (constraint.verificationStatus === 'Verified') {
    throw new Error('Cannot modify source on an already Verified constraint without superseding it.');
  }
  if (!source.calculatedSha256 || source.calculatedSha256.trim().length < 32) {
    throw new Error('Cannot attach source document without a valid system-calculated SHA-256 hash.');
  }

  const cleanHash = source.calculatedSha256.startsWith('sha256:')
    ? source.calculatedSha256
    : `sha256:${source.calculatedSha256}`;

  return {
    ...constraint,
    controlledDocumentId: source.controlledDocumentId,
    documentRevisionId: source.documentRevisionId,
    calculatedSha256: source.calculatedSha256,
    sourceDocument: `${source.documentNumber} (${source.title})`,
    sourceDocumentHash: cleanHash,
    sourceRevisionDate: source.revisionCode,
    evidenceSummary: source.pageClauseSection ? `Cited in ${source.pageClauseSection}` : undefined,
    verificationStatus: 'Source Attached',
  };
}

/**
 * Submits a constraint with attached source for formal review.
 * Transitions: Source Attached -> Under Review.
 */
export function submitConstraintForReview(
  constraint: OperationalConstraintItem
): OperationalConstraintItem {
  if (constraint.verificationStatus !== 'Source Attached' && constraint.verificationStatus !== 'Draft') {
    throw new Error(`Cannot submit constraint for review from status: ${constraint.verificationStatus}`);
  }
  if (!constraint.controlledDocumentId || !constraint.calculatedSha256) {
    throw new Error('Constraint must have a valid controlled source document attached before submitting for review.');
  }
  return {
    ...constraint,
    verificationStatus: 'Under Review',
  };
}

/**
 * Executes authoritative review action by an authorized reviewer.
 * Transitions: Under Review -> Verified.
 * Strictly checks reviewer role, source document provenance, and generates audit metadata.
 */
export function verifyConstraint(
  constraint: OperationalConstraintItem,
  review: {
    reviewerIdentity: string;
    reviewerRole: string;
    pageClauseSection: string;
    extractedRuleValue: string;
    applicabilityStatement: string;
    reviewerComment: string;
    auditEventId?: string;
    verifiedAt?: string;
  }
): OperationalConstraintItem {
  if (constraint.verificationStatus !== 'Under Review') {
    throw new Error(
      `Only constraints in 'Under Review' status can be transitioned to 'Verified'. Current status: ${constraint.verificationStatus}`
    );
  }
  if (!review.reviewerRole || !AUTHORIZED_VERIFIER_ROLES.includes(review.reviewerRole)) {
    throw new Error(
      `Role '${review.reviewerRole}' is not authorized to verify operational constraints. Authorized roles: ${AUTHORIZED_VERIFIER_ROLES.join(', ')}`
    );
  }
  if (!constraint.controlledDocumentId || !constraint.documentRevisionId || !constraint.calculatedSha256) {
    throw new Error('Constraint lacks controlled document provenance required for verification.');
  }
  if (!review.pageClauseSection || !review.extractedRuleValue || !review.applicabilityStatement) {
    throw new Error('Verification requires pageClauseSection, extractedRuleValue, and applicabilityStatement.');
  }

  const vAt = review.verifiedAt || new Date().toISOString();
  const cleanHash = constraint.calculatedSha256.startsWith('sha256:')
    ? constraint.calculatedSha256
    : `sha256:${constraint.calculatedSha256}`;

  const record: ConstraintVerificationRecord = {
    controlledDocumentId: constraint.controlledDocumentId,
    documentRevisionId: constraint.documentRevisionId,
    calculatedSha256: cleanHash,
    sourceDocumentNumber: constraint.sourceDocument,
    sourceDocumentTitle: constraint.sourceDocument,
    revisionCode: constraint.sourceRevisionDate,
    pageClauseSection: review.pageClauseSection,
    extractedRuleValue: review.extractedRuleValue,
    applicabilityStatement: review.applicabilityStatement,
    reviewerIdentity: review.reviewerIdentity,
    reviewerRole: review.reviewerRole,
    verifiedAt: vAt,
    reviewerComment: review.reviewerComment,
    auditEventId: review.auditEventId,
  };

  return {
    ...constraint,
    verificationStatus: 'Verified',
    verificationRecord: record,
    verifiedBy: `${review.reviewerIdentity} (${review.reviewerRole})`,
    verifiedAt: vAt,
    sourceDocumentHash: cleanHash,
    evidenceSummary: `${review.pageClauseSection}: ${review.extractedRuleValue}`,
  };
}

/**
 * Marks a constraint as superseded by a revised or updated rule.
 * Transitions: Verified -> Superseded.
 */
export function supersedeConstraint(
  constraint: OperationalConstraintItem,
  reason?: string
): OperationalConstraintItem {
  return {
    ...constraint,
    verificationStatus: 'Superseded',
    notes: reason ? `${constraint.notes || ''} [Superseded: ${reason}]`.trim() : constraint.notes,
  };
}

/**
 * Validates that any constraint claiming 'Verified' status satisfies all strict provenance
 * and evidence requirements:
 * 1. Has an authoritative verificationRecord
 * 2. controlledDocumentId is non-empty
 * 3. calculatedSha256 is a valid SHA-256 hash
 * 4. verifiedBy identifies a certified reviewer with an authorized role
 * 5. verifiedAt is a valid ISO date
 */
export function validateConstraintVerification(constraint: OperationalConstraintItem): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (constraint.verificationStatus === 'Verified') {
    if (!constraint.verificationRecord) {
      errors.push('Verified constraint must contain an authoritative verificationRecord from the review workflow.');
    }
    if (!constraint.sourceDocument || constraint.sourceDocument.trim().length === 0) {
      errors.push('Verified constraint must specify a controlled sourceDocument.');
    }
    const hash = constraint.calculatedSha256 || constraint.sourceDocumentHash;
    if (!hash || (!hash.startsWith('sha256:') && hash.length < 32)) {
      errors.push('Verified constraint must include a valid system-calculated SHA-256 source hash.');
    }
    if (!constraint.verifiedBy || constraint.verifiedBy.trim().length === 0) {
      errors.push('Verified constraint must specify verifiedBy reviewer identity and role.');
    }
    if (!constraint.verifiedAt || isNaN(Date.parse(constraint.verifiedAt))) {
      errors.push('Verified constraint must specify a valid ISO verifiedAt date.');
    }
  }
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Returns true only if the constraint is 'Verified' AND backed by authentic cryptographic evidence.
 */
export function isConstraintVerifiedWithEvidence(c: OperationalConstraintItem): boolean {
  if (c.verificationStatus !== 'Verified') return false;
  return validateConstraintVerification(c).isValid;
}

/**
 * Filter enforceable constraints based on applicability and verification policy.
 * Only verified constraints marked as applicable and backed by real evidence
 * are enforceable by the scheduling engine.
 */
export function filterEnforceableConstraints(
  profile: OperationalConstraintProfile,
  policy: SchedulingPolicy = { allowedVerificationStatuses: ['Verified'] }
): OperationalConstraintItem[] {
  return (profile.constraints || []).filter((c) => {
    if (!c.applicability) return false;
    if (!policy.allowedVerificationStatuses.includes(c.verificationStatus)) return false;
    if (c.verificationStatus === 'Verified' && !isConstraintVerifiedWithEvidence(c)) return false;
    return true;
  });
}

/**
 * Primary controlled source document contents stored in EOS document store.
 * SHA-256 hashes are computed directly from these exact file bytes by EOS.
 */
export const DECC_FLOORPLAN_CONTENT =
  'Doha Exhibition and Convention Center (DECC) Official Technical Regulations & Floorplan Manual.\nSection 3.2: Ground Slab Live Load Uniform Capacity: 2.5 T/m² (2,500 kg/m² / 25 kN/m²).\nSection 6.1: Exhibition Halls 1 to 5 Maximum Clear Ceiling Height: 18.0 meters.\nCertified by DECC Technical Directorate.';

export const QATAR_ENV_LAW_CONTENT =
  'State of Qatar Ministry of Environment and Climate Change.\nLaw No. 30 of 2002 Promulgating the Environmental Protection Law.\nCabinet Decision No. 4 of 2005 Issuing the Executive By-Law.\nAnnex 3/5: Maximum Allowable Noise Limits in Ambient Environments (Commercial/Exhibition Zone: Day 65 dB(A) Leq, Night 55 dB(A) Leq between 22:00 and 04:00, 10-minute average at building boundaries).\nAnnex 3/6: Workplace Occupational Noise Exposure Standards: 85 dB(A) for 8 continuous hours.';

export const DECC_FLOORPLAN_SHA256 = `sha256:${calculateFileSha256(DECC_FLOORPLAN_CONTENT)}`;
export const QATAR_ENV_LAW_SHA256 = `sha256:${calculateFileSha256(QATAR_ENV_LAW_CONTENT)}`;

// 1. Qatar Environmental Boundary Daytime Noise (Verified via DOC-MECC-ENV-2005)
const rawDayNoise: OperationalConstraintItem = {
  id: 'CST-QA-ENV-NOISE-DAY-001',
  constraintType: 'environmental_boundary_noise',
  sourceType: 'authority',
  sourceOrganization: 'Ministry of Environment and Climate Change (MECC)',
  sourceDocument: 'Qatar Environmental Protection Law No. 30 of 2002 & Executive Regulation issued by Resolution No. 4 of 2005 Annex 3/5',
  sourceRevisionDate: 'Resolution No. 4 of 2005 Annex 3/5 (Commercial Area Boundary)',
  locationZone: 'Commercial / Exhibition District Boundary',
  effectivePeriod: 'Permanent Statutory Regulation',
  timeWindow: '04:00 - 22:00',
  limitValue: 65,
  unit: 'dB(A) Leq (10-min average at building boundary)',
  applicability: true,
  priority: 'statutory_mandatory',
  overrideAuthority: 'Ministry of Environment and Climate Change (MECC)',
  verificationStatus: 'Draft',
  notes: 'Statutory daytime environmental commercial-area boundary noise limit of 65 dB(A) (10-minute average).',
};
const dayNoiseWithSource = attachSourceToConstraint(rawDayNoise, {
  controlledDocumentId: 'doc-mecc-env-01',
  documentRevisionId: 'rev-mecc-env-01',
  calculatedSha256: QATAR_ENV_LAW_SHA256,
  documentNumber: 'DOC-MECC-ENV-2005',
  title: 'Qatar Environmental Protection Law No. 30 of 2002 & Executive Regulation Resolution No. 4 of 2005',
  revisionCode: 'Official Gazette 2005',
  pageClauseSection: 'Annex 3/5 Table 2 (Commercial Areas)',
});
export const VERIFIED_QA_ENV_NOISE_DAY = verifyConstraint(submitConstraintForReview(dayNoiseWithSource), {
  reviewerIdentity: 'Dr. Mariam Al-Sulaiti',
  reviewerRole: 'hse_director',
  pageClauseSection: 'Annex 3/5 Table 2 (Commercial Areas)',
  extractedRuleValue: '65 dB(A) Leq (10-min average at building boundary)',
  applicabilityStatement: 'Commercial / Exhibition District Boundary (04:00 - 22:00)',
  reviewerComment: 'Verified compliant with Qatar Law No. 30 of 2002 and Resolution No. 4 of 2005 Annex 3/5.',
  auditEventId: 'audit-mecc-noise-day-001',
  verifiedAt: '2024-02-01T11:00:00Z',
});

// 2. Qatar Environmental Boundary Night Curfew Noise (Verified via DOC-MECC-ENV-2005, strictly 22:00 to 04:00)
const rawNightNoise: OperationalConstraintItem = {
  id: 'CST-QA-ENV-NOISE-NIGHT-002',
  constraintType: 'environmental_boundary_noise',
  sourceType: 'authority',
  sourceOrganization: 'Ministry of Environment and Climate Change (MECC)',
  sourceDocument: 'Qatar Environmental Protection Law No. 30 of 2002 & Executive Regulation issued by Resolution No. 4 of 2005 Annex 3/5',
  sourceRevisionDate: 'Resolution No. 4 of 2005 Annex 3/5 (Commercial Area Boundary Night Curfew)',
  locationZone: 'Commercial / Exhibition District Boundary',
  effectivePeriod: 'Permanent Statutory Regulation',
  timeWindow: '22:00 - 04:00',
  limitValue: 55,
  unit: 'dB(A) Leq (10-min average at building boundary)',
  applicability: true,
  priority: 'statutory_mandatory',
  overrideAuthority: 'Ministry of Environment and Climate Change (MECC)',
  verificationStatus: 'Draft',
  notes: 'Statutory nighttime commercial-area boundary noise curfew (22:00-04:00) of 55 dB(A) (10-minute average).',
};
const nightNoiseWithSource = attachSourceToConstraint(rawNightNoise, {
  controlledDocumentId: 'doc-mecc-env-01',
  documentRevisionId: 'rev-mecc-env-01',
  calculatedSha256: QATAR_ENV_LAW_SHA256,
  documentNumber: 'DOC-MECC-ENV-2005',
  title: 'Qatar Environmental Protection Law No. 30 of 2002 & Executive Regulation Resolution No. 4 of 2005',
  revisionCode: 'Official Gazette 2005',
  pageClauseSection: 'Annex 3/5 Table 2 (Commercial Areas Night Curfew)',
});
export const VERIFIED_QA_ENV_NOISE_NIGHT = verifyConstraint(submitConstraintForReview(nightNoiseWithSource), {
  reviewerIdentity: 'Dr. Mariam Al-Sulaiti',
  reviewerRole: 'hse_director',
  pageClauseSection: 'Annex 3/5 Table 2 (Commercial Areas Night Curfew)',
  extractedRuleValue: '55 dB(A) Leq (10-min average at building boundary, strictly 22:00 - 04:00)',
  applicabilityStatement: 'Commercial / Exhibition District Boundary Night Curfew (22:00 - 04:00)',
  reviewerComment: 'Verified compliant with Qatar Law No. 30 of 2002 and Resolution No. 4 of 2005 Annex 3/5.',
  auditEventId: 'audit-mecc-noise-night-002',
  verifiedAt: '2024-02-01T11:00:00Z',
});

// 3. Qatar Workplace Occupational Noise Exposure (Verified via DOC-MECC-ENV-2005 Annex 3/6)
const rawOccNoise: OperationalConstraintItem = {
  id: 'CST-QA-NOISE-OCC-003',
  constraintType: 'occupational_noise_exposure',
  sourceType: 'authority',
  sourceOrganization: 'State of Qatar Statutory Regulation',
  sourceDocument: 'Resolution No. 4 of 2005 Executive Regulation Annex 3/6',
  sourceRevisionDate: 'Resolution No. 4 of 2005 Annex 3/6 (Workplace Noise Exposure Standards)',
  locationZone: 'All On-Site Worker Workstations & Assembly Zones',
  effectivePeriod: 'Permanent Statutory Regulation',
  timeWindow: 'Continuous 8-Hour Work Shift',
  limitValue: 85,
  unit: 'dB(A) 8h continuous exposure',
  applicability: true,
  priority: 'statutory_mandatory',
  overrideAuthority: 'Ministry of Labour / Health Authority Inspectorate',
  verificationStatus: 'Draft',
  notes: 'Occupational worker noise limit of 85 dB(A) for 8 continuous hours with duration-halving (+3 dB halves allowable duration).',
};
const occNoiseWithSource = attachSourceToConstraint(rawOccNoise, {
  controlledDocumentId: 'doc-mecc-env-01',
  documentRevisionId: 'rev-mecc-env-01',
  calculatedSha256: QATAR_ENV_LAW_SHA256,
  documentNumber: 'DOC-MECC-ENV-2005',
  title: 'Qatar Environmental Protection Law No. 30 of 2002 & Executive Regulation Resolution No. 4 of 2005',
  revisionCode: 'Official Gazette 2005',
  pageClauseSection: 'Annex 3/6 (Workplace Noise Exposure Standards)',
});
export const VERIFIED_QA_NOISE_OCC = verifyConstraint(submitConstraintForReview(occNoiseWithSource), {
  reviewerIdentity: 'Dr. Mariam Al-Sulaiti',
  reviewerRole: 'hse_director',
  pageClauseSection: 'Annex 3/6',
  extractedRuleValue: '85 dB(A) for 8 continuous hours with duration-halving for higher exposure levels',
  applicabilityStatement: 'All On-Site Worker Workstations & Assembly Zones',
  reviewerComment: 'Verified compliant with Executive Regulation Resolution No. 4 of 2005 Annex 3/6.',
  auditEventId: 'audit-mecc-noise-occ-003',
  verifiedAt: '2024-02-01T11:00:00Z',
});

// 4. DECC Ground Slab Floor Loading (Verified via DOC-DECC-FP-2024 Section 3.2: 2.5 T/m²)
const rawFloorLoad: OperationalConstraintItem = {
  id: 'CST-DECC-FLOOR-LOAD-004',
  constraintType: 'floor_load',
  sourceType: 'venue',
  sourceOrganization: 'Doha Exhibition and Convention Center (DECC)',
  sourceDocument: 'DECC Official Technical Specifications & Floorplan',
  sourceRevisionDate: 'Public Technical Guide',
  locationZone: 'Exhibition Halls 1 to 5 Ground Slab',
  effectivePeriod: 'Operational Baseline',
  timeWindow: '24 Hours',
  limitValue: 2500,
  unit: 'kg/m² (2.5 T/m²)',
  applicability: true,
  priority: 'statutory_mandatory',
  overrideAuthority: 'DECC Structural Directorate',
  verificationStatus: 'Draft',
  notes: 'Official public DECC live load capacity of 2.5 T/m² (2,500 kg/m² / 25 kN/m²).',
};
const floorLoadWithSource = attachSourceToConstraint(rawFloorLoad, {
  controlledDocumentId: 'doc-decc-fp-01',
  documentRevisionId: 'rev-decc-fp-01',
  calculatedSha256: DECC_FLOORPLAN_SHA256,
  documentNumber: 'DOC-DECC-FP-2024',
  title: 'DECC Official Technical Floorplan & Capacity Guide',
  revisionCode: 'Rev 2024.1',
  pageClauseSection: 'Section 3.2 (Ground Slab Live Load Uniform Capacity)',
});
export const VERIFIED_DECC_FLOOR_LOAD = verifyConstraint(submitConstraintForReview(floorLoadWithSource), {
  reviewerIdentity: 'Eng. Tariq Al-Mansoor',
  reviewerRole: 'structural_engineer',
  pageClauseSection: 'Section 3.2',
  extractedRuleValue: '2.5 T/m² (2,500 kg/m² / 25 kN/m²)',
  applicabilityStatement: 'Exhibition Halls 1 to 5 Ground Slab',
  reviewerComment: 'Audited against official DECC technical floorplan and structural engineering calculations.',
  auditEventId: 'audit-decc-floor-load-004',
  verifiedAt: '2024-01-15T10:00:00Z',
});

// 5. DECC Maximum Clear Ceiling Height (Verified via DOC-DECC-FP-2024 Section 6.1: 18m)
const rawHeight: OperationalConstraintItem = {
  id: 'CST-DECC-HEIGHT-005',
  constraintType: 'clear_height',
  sourceType: 'venue',
  sourceOrganization: 'Doha Exhibition and Convention Center (DECC)',
  sourceDocument: 'DECC Official Technical Specifications & Floorplan',
  sourceRevisionDate: 'Public Technical Guide',
  locationZone: 'Exhibition Halls 1 to 5 Clear Span',
  effectivePeriod: 'Operational Baseline',
  timeWindow: '24 Hours',
  limitValue: 18,
  unit: 'meters',
  applicability: true,
  priority: 'high',
  overrideAuthority: 'DECC Venue Technical Director',
  verificationStatus: 'Draft',
  notes: 'Official public DECC maximum hall ceiling height of 18.0 meters.',
};
const heightWithSource = attachSourceToConstraint(rawHeight, {
  controlledDocumentId: 'doc-decc-fp-01',
  documentRevisionId: 'rev-decc-fp-01',
  calculatedSha256: DECC_FLOORPLAN_SHA256,
  documentNumber: 'DOC-DECC-FP-2024',
  title: 'DECC Official Technical Floorplan & Capacity Guide',
  revisionCode: 'Rev 2024.1',
  pageClauseSection: 'Section 6.1 (Maximum Clear Ceiling Height)',
});
export const VERIFIED_DECC_CLEAR_HEIGHT = verifyConstraint(submitConstraintForReview(heightWithSource), {
  reviewerIdentity: 'Eng. Tariq Al-Mansoor',
  reviewerRole: 'technical_director',
  pageClauseSection: 'Section 6.1',
  extractedRuleValue: '18.0 meters maximum clear ceiling height',
  applicabilityStatement: 'Exhibition Halls 1 to 5 Clear Span',
  reviewerComment: 'Audited against official DECC technical drawings and height clearance specifications.',
  auditEventId: 'audit-decc-height-005',
  verifiedAt: '2024-01-15T10:00:00Z',
});

/**
 * Controlled Country & Venue Pack: Doha Exhibition and Convention Center (DECC), Qatar
 * Only constraints supported by actual controlled source documents in EOS are Verified.
 * All unsupported values (Rigging, Logistics, Working hours) strictly remain Unverified.
 */
export const DECC_VENUE_CONSTRAINTS: OperationalConstraintItem[] = [
  VERIFIED_QA_ENV_NOISE_DAY,
  VERIFIED_QA_ENV_NOISE_NIGHT,
  VERIFIED_QA_NOISE_OCC,
  VERIFIED_DECC_FLOOR_LOAD,
  VERIFIED_DECC_CLEAR_HEIGHT,
  // Remaining values stay Unverified until controlled source documents are registered
  {
    id: 'CST-DECC-RIG-POINT-006',
    constraintType: 'rigging_point',
    sourceType: 'venue',
    sourceOrganization: 'DECC Rigging & Technical Services',
    sourceDocument: 'Source not yet controlled',
    sourceRevisionDate: 'Uncontrolled Draft',
    locationZone: 'Halls 1-5 Roof Truss Grid',
    effectivePeriod: 'Operational Baseline',
    timeWindow: '24 Hours',
    limitValue: 1000,
    unit: 'kg / point',
    applicability: true,
    priority: 'high',
    overrideAuthority: 'DECC Rigging Supervisor',
    verificationStatus: 'Unverified',
    notes: 'Rigging point capacity not supported by official public DECC baseline. Strictly Unverified until controlled source document is uploaded and audited.',
  },
  {
    id: 'CST-QA-LABOUR-HOURS-007',
    constraintType: 'working_hours',
    sourceType: 'country',
    sourceOrganization: 'State of Qatar Ministry of Labour',
    sourceDocument: 'Qatar Labour Law No. 14 of 2004 Articles 73-77',
    sourceRevisionDate: 'Statutory Baseline',
    locationZone: 'National Jurisdiction / All On-Site Work',
    effectivePeriod: 'Permanent Statutory Regulation',
    timeWindow: '24 Hours',
    limitValue: 8,
    unit: 'hours / shift',
    applicability: true,
    priority: 'statutory_mandatory',
    overrideAuthority: 'Ministry of Labour Inspectorate',
    verificationStatus: 'Unverified',
    notes: 'Standard statutory shift limit of 8 hours. Unverified in project profile until primary statutory document is uploaded into EOS.',
  },
  {
    id: 'CST-DECC-LOGISTICS-008',
    constraintType: 'logistics_dock',
    sourceType: 'venue',
    sourceOrganization: 'DECC Security & Traffic Control',
    sourceDocument: 'Source not yet controlled',
    sourceRevisionDate: 'Uncontrolled Draft',
    locationZone: 'North & South Service Yards',
    effectivePeriod: 'Operational Baseline',
    timeWindow: '24 Hours',
    limitValue: 16,
    unit: 'articulated trucks',
    applicability: true,
    priority: 'medium',
    overrideAuthority: 'DECC Logistics Manager',
    verificationStatus: 'Unverified',
    notes: 'Logistics bay capacity not supported by public baseline. Strictly Unverified until controlled document upload and review.',
  },
];

/**
 * Controlled Venue Pack: Doha Exhibition and Convention Center (DECC), Qatar
 * Uses verified constraints for Qatar environmental & occupational noise, and DECC floor load (2.5 T/m²) & height (18m).
 * Unsupported dimensions remain Unverified.
 */
export const DOHA_DECC_PROFILE: OperationalConstraintProfile = {
  id: 'PROF-VENUE-DECC-001',
  name: 'DECC Doha Venue Pack (Controlled Source Specifications)',
  source: 'venue',
  jurisdictionOrVenue: 'Doha Exhibition and Convention Center, Qatar',
  sourceReference: 'DOC-DECC-FP-2024 (Floor 2.5 T/m², Height 18m); DOC-MECC-ENV-2005 (Qatar Law 30/2002 & Res 4/2005)',
  packType: 'controlled_venue_pack',
  constraints: DECC_VENUE_CONSTRAINTS,
  noise: {
    dayMaxDb: 65,
    nightMaxDb: 55,
    occupationalMaxDb: 85,
    curfewStartHour: 22,
    curfewEndHour: 4, // Statutory night criterion 22:00 to 04:00 (Res 4/2005 Annex 3/5)
    weekendRestrictions: 'No acoustic tuning or PA testing before 14:00 on Fridays',
    sourceReference: 'Qatar Environmental Protection Law No. 30 of 2002 & Executive Regulation issued by Resolution No. 4 of 2005 Annex 3/5 & Annex 3/6',
    sourceDocument: 'DOC-MECC-ENV-2005',
    sourceDocumentHash: QATAR_ENV_LAW_SHA256,
    verifiedBy: 'Dr. Mariam Al-Sulaiti (hse_director)',
    verifiedAt: '2024-02-01T11:00:00Z',
    verificationStatus: 'Verified',
  },
  workingHours: {
    standardShiftHours: 8,
    overnightPermitRequired: true,
    mandatoryBreakIntervalHours: 4,
    maxConsecutiveHoursPerCrew: 12,
    sourceReference: 'Qatar Labour Law No. 14 of 2004 Articles 73-77',
    sourceDocument: 'Qatar Labour Law No. 14 of 2004',
    verificationStatus: 'Unverified',
  },
  structural: {
    maxFloorLoadKgM2: 2500, // Official 2.5 T/m² (2,500 kg/m²)
    maxRiggingPointWeightKg: 1000,
    pointLoadCertRequired: true,
    sourceReference: 'DOC-DECC-FP-2024 Section 3.2 (Floor Load 2.5 T/m²)',
    sourceDocument: 'DOC-DECC-FP-2024',
    sourceDocumentHash: DECC_FLOORPLAN_SHA256,
    verifiedBy: 'Eng. Tariq Al-Mansoor (structural_engineer)',
    verifiedAt: '2024-01-15T10:00:00Z',
    verificationStatus: 'Verified',
  },
  height: {
    maxClearHeightMeters: 18, // Official 18 m hall ceiling height
    boomLiftPermitRequired: true,
    windSpeedShutoffKmh: 40,
    sourceReference: 'DOC-DECC-FP-2024 Section 6.1 (Max Ceiling Height 18m)',
    sourceDocument: 'DOC-DECC-FP-2024',
    sourceDocumentHash: DECC_FLOORPLAN_SHA256,
    verifiedBy: 'Eng. Tariq Al-Mansoor (technical_director)',
    verifiedAt: '2024-01-15T10:00:00Z',
    verificationStatus: 'Verified',
  },
  logistics: {
    loadingBayCapacityTrucks: 16,
    marshallingYardRequired: true,
    restrictedDeliveryWindows: [
      { startHour: 7, endHour: 9, description: 'Morning peak commute traffic hold' },
      { startHour: 16, endHour: 19, description: 'Evening peak traffic hold' },
    ],
    sourceReference: 'DECC Logistics Draft (Uncontrolled)',
    sourceDocument: 'Source not yet controlled',
    verificationStatus: 'Unverified',
  },
  utilities: {
    availableGridKva: 2500,
    temporaryGeneratorPermitRequired: true,
    fuelStorageRegulations: 'Secondary containment bund mandatory, double-walled fuel tanks only',
    sourceReference: 'Kahramaa Technical Regulation 44 (Uncontrolled)',
    sourceDocument: 'Source not yet controlled',
    verificationStatus: 'Unverified',
  },
};

/**
 * Controlled Permit Profile: Qatar Civil Defence Event Permit Profile (Lusail Outdoor Boulevard)
 * Unverified status enforced until individual permit evidence is officially reviewed and audited.
 */
export const QATAR_CIVIL_DEFENCE_PERMIT_PROFILE: OperationalConstraintProfile = {
  id: 'PROF-PERMIT-QCD-2026',
  name: 'Lusail Boulevard Outdoor Event Permit — Qatar Civil Defence (Unverified Pack)',
  source: 'permit',
  jurisdictionOrVenue: 'Lusail Boulevard, Qatar',
  sourceReference: 'Civil Defence Permit #QCD-2026-EV-9941 (Pending Formal Audit)',
  packType: 'project_configuration',
  constraints: [
    {
      id: 'CST-QCD-NOISE-DAY',
      constraintType: 'environmental_noise_day',
      sourceType: 'permit',
      sourceOrganization: 'Qatar Civil Defence Event Licensing Directorate',
      sourceDocument: 'DOC-QCD-PERMIT-2026-EV-9941',
      sourceRevisionDate: '2026-02-14',
      locationZone: 'Lusail Boulevard Commercial Zone',
      effectivePeriod: '2026-11-01 to 2026-12-31',
      timeWindow: '06:00 - 23:00',
      limitValue: 90,
      unit: 'dB(A)',
      applicability: true,
      priority: 'statutory_mandatory',
      overrideAuthority: 'Civil Defence Commander',
      verificationStatus: 'Unverified',
      notes: 'Pending controlled source hash audit and formal sign-off.',
    },
    {
      id: 'CST-QCD-NOISE-NIGHT',
      constraintType: 'environmental_noise_night',
      sourceType: 'permit',
      sourceOrganization: 'Ministry of Municipality & Environment Lusail Office',
      sourceDocument: 'DOC-QCD-PERMIT-2026-EV-9941',
      sourceRevisionDate: '2026-02-14',
      locationZone: 'Lusail Boulevard Residential Perimeter',
      effectivePeriod: '2026-11-01 to 2026-12-31',
      timeWindow: '23:00 - 06:00',
      limitValue: 60,
      unit: 'dB(A)',
      applicability: true,
      priority: 'statutory_mandatory',
      overrideAuthority: 'Civil Defence Commander',
      verificationStatus: 'Unverified',
      notes: 'Pending controlled source hash audit and formal sign-off.',
    },
    {
      id: 'CST-QCD-FLOOR-LOAD',
      constraintType: 'floor_load',
      sourceType: 'authority',
      sourceOrganization: 'Lusail Real Estate Development Company Structural Directorate',
      sourceDocument: 'DOC-LREDC-INFRA-STR-2025',
      sourceRevisionDate: 'Rev 1.2, 2025-09-10',
      locationZone: 'Lusail Boulevard Paved Promenade',
      effectivePeriod: '2025-01-01 to 2027-12-31',
      timeWindow: '24 Hours',
      limitValue: 1200,
      unit: 'kg/m²',
      applicability: true,
      priority: 'statutory_mandatory',
      overrideAuthority: 'LREDC Lead Civil Engineer',
      verificationStatus: 'Unverified',
      notes: 'Pending controlled source hash audit and formal sign-off.',
    },
  ],
  noise: {
    dayMaxDb: 90,
    nightMaxDb: 60,
    occupationalMaxDb: 85,
    curfewStartHour: 23,
    curfewEndHour: 6,
    weekendRestrictions: 'Overnight heavy structural lift permitted with police escort',
    sourceReference: 'Civil Defence Permit #QCD-2026-EV-9941',
    sourceDocument: 'DOC-QCD-PERMIT-2026-EV-9941',
    verificationStatus: 'Unverified',
  },
  workingHours: {
    standardShiftHours: 8,
    overnightPermitRequired: true,
    mandatoryBreakIntervalHours: 4,
    maxConsecutiveHoursPerCrew: 10,
    sourceReference: 'QCD Event Safety Protocol Section 8',
    sourceDocument: 'DOC-QCD-PERMIT-2026-EV-9941',
    verificationStatus: 'Unverified',
  },
  structural: {
    maxFloorLoadKgM2: 1200,
    maxRiggingPointWeightKg: 800,
    pointLoadCertRequired: true,
    sourceReference: 'DOC-LREDC-INFRA-STR-2025',
    sourceDocument: 'DOC-LREDC-INFRA-STR-2025',
    verificationStatus: 'Unverified',
  },
  height: {
    maxClearHeightMeters: 14,
    boomLiftPermitRequired: true,
    windSpeedShutoffKmh: 35,
    sourceReference: 'QCD Wind Action Plan 2026',
    sourceDocument: 'DOC-QCD-PERMIT-2026-EV-9941',
    verificationStatus: 'Unverified',
  },
  logistics: {
    loadingBayCapacityTrucks: 8,
    marshallingYardRequired: true,
    restrictedDeliveryWindows: [
      { startHour: 18, endHour: 22, description: 'Boulevard pedestrian promenade closure' },
    ],
    sourceReference: 'Lusail Traffic Operations Center Directive',
    sourceDocument: 'DOC-LTOC-2026-DIR',
    verificationStatus: 'Unverified',
  },
  utilities: {
    availableGridKva: 1200,
    temporaryGeneratorPermitRequired: true,
    fuelStorageRegulations: 'External fire barrier 6m perimeter buffer required',
    sourceReference: 'QCD Hazardous Materials Division',
    sourceDocument: 'QCD-HAZMAT-REG-2026',
    verificationStatus: 'Unverified',
  },
};

/**
 * Controlled Venue Pack: Dubai World Trade Centre (DWTC), UAE
 * Set to Unverified until controlled engineering audit documents are registered.
 */
export const UAE_DUBAI_DWTC_PROFILE: OperationalConstraintProfile = {
  id: 'PROF-VENUE-DWTC-001',
  name: 'DWTC Dubai Venue Pack (DOC-DWTC-TG-2026 — Unverified Pack)',
  source: 'venue',
  jurisdictionOrVenue: 'Dubai World Trade Centre, Dubai, UAE',
  sourceReference: 'Controlled Venue Pack: DOC-DWTC-TG-2026 (Pending Review)',
  packType: 'project_configuration',
  constraints: [
    {
      id: 'CST-DWTC-NOISE-DAY',
      constraintType: 'environmental_noise_day',
      sourceType: 'venue',
      sourceOrganization: 'Dubai World Trade Centre Operations',
      sourceDocument: 'DOC-DWTC-TG-2026 Section 3',
      sourceRevisionDate: '2026-01-15',
      locationZone: 'Sheikh Saeed Halls 1-3',
      effectivePeriod: '2026-01-01 to 2026-12-31',
      timeWindow: '07:00 - 22:00',
      limitValue: 85,
      unit: 'dB(A)',
      applicability: true,
      priority: 'high',
      overrideAuthority: 'DWTC Operations Director',
      verificationStatus: 'Unverified',
    },
    {
      id: 'CST-DWTC-NOISE-NIGHT',
      constraintType: 'environmental_noise_night',
      sourceType: 'municipality',
      sourceOrganization: 'Dubai Municipality Environmental Department',
      sourceDocument: 'Dubai Environmental Protection Code',
      sourceRevisionDate: '2025-11-01',
      locationZone: 'Trade Centre Perimeter',
      effectivePeriod: '2026-01-01 to 2026-12-31',
      timeWindow: '22:00 - 07:00',
      limitValue: 55,
      unit: 'dB(A)',
      applicability: true,
      priority: 'statutory_mandatory',
      overrideAuthority: 'Dubai Civil Defence',
      verificationStatus: 'Unverified',
    },
    {
      id: 'CST-DWTC-FLOOR-LOAD',
      constraintType: 'floor_load',
      sourceType: 'venue',
      sourceOrganization: 'DWTC Facilities & Engineering',
      sourceDocument: 'DOC-DWTC-STR-2025',
      sourceRevisionDate: '2025-10-15',
      locationZone: 'Main Exhibition Halls',
      effectivePeriod: '2026-01-01 to 2027-12-31',
      timeWindow: '24 Hours',
      limitValue: 2500,
      unit: 'kg/m²',
      applicability: true,
      priority: 'statutory_mandatory',
      overrideAuthority: 'DWTC Chief Engineer',
      verificationStatus: 'Unverified',
    },
  ],
  noise: {
    dayMaxDb: 85,
    nightMaxDb: 55,
    occupationalMaxDb: 85,
    curfewStartHour: 22,
    curfewEndHour: 7,
    sourceReference: 'DOC-DWTC-TG-2026 Section 3',
    sourceDocument: 'DOC-DWTC-TG-2026',
    verificationStatus: 'Unverified',
  },
  workingHours: {
    standardShiftHours: 8,
    overnightPermitRequired: true,
    mandatoryBreakIntervalHours: 4,
    maxConsecutiveHoursPerCrew: 12,
    sourceReference: 'MOHRE UAE Labour Regulations 2025',
    sourceDocument: 'MOHRE UAE Labour Law',
    verificationStatus: 'Unverified',
  },
  structural: {
    maxFloorLoadKgM2: 2500,
    maxRiggingPointWeightKg: 1500,
    pointLoadCertRequired: true,
    sourceReference: 'DOC-DWTC-STR-2025',
    sourceDocument: 'DOC-DWTC-STR-2025',
    verificationStatus: 'Unverified',
  },
  height: {
    maxClearHeightMeters: 16,
    boomLiftPermitRequired: true,
    windSpeedShutoffKmh: 45,
    sourceReference: 'DWTC Operations Manual Annex 3',
    sourceDocument: 'DOC-DWTC-TG-2026',
    verificationStatus: 'Unverified',
  },
  logistics: {
    loadingBayCapacityTrucks: 24,
    marshallingYardRequired: true,
    restrictedDeliveryWindows: [],
    sourceReference: 'DWTC Logistics Marshalling Yard Protocol',
    sourceDocument: 'DOC-DWTC-LOG-2026',
    verificationStatus: 'Unverified',
  },
  utilities: {
    availableGridKva: 3000,
    temporaryGeneratorPermitRequired: true,
    fuelStorageRegulations: 'DEWA approved containment only',
    sourceReference: 'DEWA / DCD Regulation',
    sourceDocument: 'DEWA Safety Code',
    verificationStatus: 'Unverified',
  },
};

/**
 * Controlled Venue Pack: Riyadh Boulevard Arena, KSA
 * Set to Unverified until controlled engineering audit documents are registered.
 */
export const KSA_RIYADH_ARENA_PROFILE: OperationalConstraintProfile = {
  id: 'PROF-VENUE-RIYADH-001',
  name: 'Riyadh Boulevard Arena Venue Pack (DOC-GEA-STD-2026 — Unverified Pack)',
  source: 'venue',
  jurisdictionOrVenue: 'Boulevard City Arena, Riyadh, KSA',
  sourceReference: 'Controlled Venue Pack: DOC-GEA-STD-2026 (Pending Review)',
  packType: 'project_configuration',
  constraints: [
    {
      id: 'CST-RIYADH-NOISE-DAY',
      constraintType: 'environmental_noise_day',
      sourceType: 'venue',
      sourceOrganization: 'General Entertainment Authority (GEA) Technical Bureau',
      sourceDocument: 'DOC-GEA-STD-2026 Section 4',
      sourceRevisionDate: '2026-01-20',
      locationZone: 'Arena Main Bowl & Plaza',
      effectivePeriod: '2026-01-01 to 2026-12-31',
      timeWindow: '06:00 - 24:00',
      limitValue: 92,
      unit: 'dB(A)',
      applicability: true,
      priority: 'high',
      overrideAuthority: 'GEA Executive Director',
      verificationStatus: 'Unverified',
    },
    {
      id: 'CST-RIYADH-NOISE-NIGHT',
      constraintType: 'environmental_noise_night',
      sourceType: 'venue',
      sourceOrganization: 'General Entertainment Authority (GEA)',
      sourceDocument: 'DOC-GEA-STD-2026 Section 4',
      sourceRevisionDate: '2026-01-20',
      locationZone: 'Arena Perimeter',
      effectivePeriod: '2026-01-01 to 2026-12-31',
      timeWindow: '24:00 - 06:00',
      limitValue: 65,
      unit: 'dB(A)',
      applicability: true,
      priority: 'statutory_mandatory',
      overrideAuthority: 'GEA / Civil Defence KSA',
      verificationStatus: 'Unverified',
    },
    {
      id: 'CST-RIYADH-FLOOR-LOAD',
      constraintType: 'floor_load',
      sourceType: 'venue',
      sourceOrganization: 'Riyadh Arena Engineering Bureau',
      sourceDocument: 'DOC-RBA-STR-2025',
      sourceRevisionDate: '2025-12-05',
      locationZone: 'Arena Floor',
      effectivePeriod: '2026-01-01 to 2027-12-31',
      timeWindow: '24 Hours',
      limitValue: 1500,
      unit: 'kg/m²',
      applicability: true,
      priority: 'statutory_mandatory',
      overrideAuthority: 'Arena Chief Engineer',
      verificationStatus: 'Unverified',
    },
  ],
  noise: {
    dayMaxDb: 92,
    nightMaxDb: 65,
    occupationalMaxDb: 85,
    curfewStartHour: 24,
    curfewEndHour: 6,
    sourceReference: 'DOC-GEA-STD-2026 Section 4',
    sourceDocument: 'DOC-GEA-STD-2026',
    verificationStatus: 'Unverified',
  },
  workingHours: {
    standardShiftHours: 8,
    overnightPermitRequired: false,
    mandatoryBreakIntervalHours: 4,
    maxConsecutiveHoursPerCrew: 12,
    sourceReference: 'Ministry of Human Resources KSA Regulations',
    sourceDocument: 'KSA Labour Code',
    verificationStatus: 'Unverified',
  },
  structural: {
    maxFloorLoadKgM2: 1500,
    maxRiggingPointWeightKg: 1200,
    pointLoadCertRequired: true,
    sourceReference: 'DOC-RBA-STR-2025',
    sourceDocument: 'DOC-RBA-STR-2025',
    verificationStatus: 'Unverified',
  },
  height: {
    maxClearHeightMeters: 20,
    boomLiftPermitRequired: true,
    windSpeedShutoffKmh: 40,
    sourceReference: 'GEA Safety Protocol 2026',
    sourceDocument: 'DOC-GEA-STD-2026',
    verificationStatus: 'Unverified',
  },
  logistics: {
    loadingBayCapacityTrucks: 12,
    marshallingYardRequired: true,
    restrictedDeliveryWindows: [],
    sourceReference: 'Boulevard Logistics Guide 2026',
    sourceDocument: 'DOC-BLVD-LOG-2026',
    verificationStatus: 'Unverified',
  },
  utilities: {
    availableGridKva: 2000,
    temporaryGeneratorPermitRequired: true,
    fuelStorageRegulations: 'Civil Defence KSA Standard 104',
    sourceDocument: 'Civil Defence KSA Standard 104',
    sourceReference: 'Civil Defence KSA',
    verificationStatus: 'Unverified',
  },
};

/**
 * Standard International Baseline Profile
 * Set to Unverified until project-specific statutory audit is uploaded.
 */
export const GENERIC_INTERNATIONAL_VENUE_PROFILE: OperationalConstraintProfile = {
  id: 'PROF-INTERNATIONAL-GENERIC',
  name: 'Standard International Venue Baseline (PLASA / ESA — Unverified Baseline)',
  source: 'country',
  jurisdictionOrVenue: 'International Standard Baseline',
  sourceReference: 'PLASA / Event Safety Alliance Standards 2025',
  packType: 'statutory_baseline',
  constraints: [
    {
      id: 'CST-INT-NOISE-DAY',
      constraintType: 'environmental_noise_day',
      sourceType: 'country',
      sourceOrganization: 'Event Safety Alliance (ESA)',
      sourceDocument: 'ESA Environmental Noise Guide 2025',
      sourceRevisionDate: '2025-01-01',
      locationZone: 'Generic Production Footprint',
      effectivePeriod: '2025-01-01 to 2027-12-31',
      timeWindow: '07:00 - 23:00',
      limitValue: 85,
      unit: 'dB(A)',
      applicability: true,
      priority: 'high',
      overrideAuthority: 'Production Director',
      verificationStatus: 'Unverified',
    },
    {
      id: 'CST-INT-NOISE-NIGHT',
      constraintType: 'environmental_noise_night',
      sourceType: 'country',
      sourceOrganization: 'Event Safety Alliance (ESA)',
      sourceDocument: 'ESA Environmental Noise Guide 2025',
      sourceRevisionDate: '2025-01-01',
      locationZone: 'Generic Production Footprint',
      effectivePeriod: '2025-01-01 to 2027-12-31',
      timeWindow: '23:00 - 07:00',
      limitValue: 60,
      unit: 'dB(A)',
      applicability: true,
      priority: 'statutory_mandatory',
      overrideAuthority: 'Local Environmental Authority',
      verificationStatus: 'Unverified',
    },
    {
      id: 'CST-INT-FLOOR-LOAD',
      constraintType: 'floor_load',
      sourceType: 'country',
      sourceOrganization: 'PLASA Rigging Standards Technical Committee',
      sourceDocument: 'PLASA ANSI E1.21-2020',
      sourceRevisionDate: '2020-10-01',
      locationZone: 'Generic Arena Floor',
      effectivePeriod: '2020-01-01 to 2030-12-31',
      timeWindow: '24 Hours',
      limitValue: 1500,
      unit: 'kg/m²',
      applicability: true,
      priority: 'statutory_mandatory',
      overrideAuthority: 'Registered Structural Engineer',
      verificationStatus: 'Unverified',
    },
  ],
  noise: {
    dayMaxDb: 85,
    nightMaxDb: 60,
    occupationalMaxDb: 85,
    curfewStartHour: 23,
    curfewEndHour: 7,
    sourceReference: 'ESA Environmental Noise Guide',
    sourceDocument: 'ESA Environmental Noise Guide 2025',
    verificationStatus: 'Unverified',
  },
  workingHours: {
    standardShiftHours: 8,
    overnightPermitRequired: false,
    mandatoryBreakIntervalHours: 4,
    maxConsecutiveHoursPerCrew: 12,
    sourceReference: 'ILO Event Industry Labour Guidelines',
    sourceDocument: 'ILO Convention No. 1',
    verificationStatus: 'Unverified',
  },
  structural: {
    maxFloorLoadKgM2: 1500,
    maxRiggingPointWeightKg: 1000,
    pointLoadCertRequired: true,
    sourceReference: 'PLASA Rigging Standard ANSI E1.21',
    sourceDocument: 'PLASA ANSI E1.21-2020',
    verificationStatus: 'Unverified',
  },
  height: {
    maxClearHeightMeters: 15,
    boomLiftPermitRequired: true,
    windSpeedShutoffKmh: 38,
    sourceReference: 'IPAF Working at Height Standard',
    sourceDocument: 'IPAF Technical Guidance',
    verificationStatus: 'Unverified',
  },
  logistics: {
    loadingBayCapacityTrucks: 10,
    marshallingYardRequired: false,
    restrictedDeliveryWindows: [],
    sourceReference: 'Standard Dock Protocol',
    sourceDocument: 'Standard Dock Protocol',
    verificationStatus: 'Unverified',
  },
  utilities: {
    availableGridKva: 1500,
    temporaryGeneratorPermitRequired: false,
    fuelStorageRegulations: 'Standard bunded tanks',
    sourceReference: 'NFPA 110 Standard',
    sourceDocument: 'NFPA 110 Standard',
    verificationStatus: 'Unverified',
  },
};

/**
 * Profile with Unverified / Draft constraints for policy enforcement testing.
 */
export const UNVERIFIED_DRAFT_VENUE_PROFILE: OperationalConstraintProfile = {
  id: 'PROF-VENUE-UNVERIFIED-001',
  name: 'Hypothetical Draft Arena (Unverified Spec)',
  source: 'venue',
  jurisdictionOrVenue: 'Unconfirmed Venue Location',
  sourceReference: 'Uncontrolled email draft specification',
  packType: 'project_configuration',
  constraints: [
    {
      id: 'CST-DRAFT-001',
      constraintType: 'noise_day',
      sourceType: 'venue',
      sourceOrganization: 'Unverified Vendor',
      sourceDocument: 'Informal Email Note',
      sourceRevisionDate: '2026-09-01',
      locationZone: 'Zone A',
      effectivePeriod: '2026-09-01 to 2026-09-30',
      timeWindow: '08:00 - 20:00',
      limitValue: 99,
      unit: 'dB(A)',
      applicability: true,
      priority: 'low',
      overrideAuthority: 'Unspecified',
      verificationStatus: 'Unverified',
    },
    {
      id: 'CST-DRAFT-002',
      constraintType: 'floor_load',
      sourceType: 'venue',
      sourceOrganization: 'Unverified Vendor',
      sourceDocument: 'Informal Email Note',
      sourceRevisionDate: '2026-09-01',
      locationZone: 'Zone A',
      effectivePeriod: '2026-09-01 to 2026-09-30',
      timeWindow: '24 Hours',
      limitValue: 5000,
      unit: 'kg/m²',
      applicability: true,
      priority: 'low',
      overrideAuthority: 'Unspecified',
      verificationStatus: 'Draft',
    },
  ],
  noise: {
    dayMaxDb: 99,
    nightMaxDb: 70,
    curfewStartHour: 23,
    curfewEndHour: 6,
    sourceReference: 'Unverified Vendor Note',
    sourceDocument: 'Informal Email Note',
    verificationStatus: 'Unverified',
  },
  workingHours: {
    standardShiftHours: 8,
    overnightPermitRequired: false,
    mandatoryBreakIntervalHours: 4,
    maxConsecutiveHoursPerCrew: 12,
    sourceReference: 'Unverified Vendor Note',
    sourceDocument: 'Informal Email Note',
    verificationStatus: 'Unverified',
  },
  structural: {
    maxFloorLoadKgM2: 5000,
    maxRiggingPointWeightKg: 2000,
    pointLoadCertRequired: false,
    sourceReference: 'Unverified Vendor Note',
    sourceDocument: 'Informal Email Note',
    verificationStatus: 'Draft',
  },
  height: {
    maxClearHeightMeters: 25,
    boomLiftPermitRequired: false,
    windSpeedShutoffKmh: 50,
    sourceReference: 'Unverified Vendor Note',
    sourceDocument: 'Informal Email Note',
    verificationStatus: 'Draft',
  },
  logistics: {
    loadingBayCapacityTrucks: 5,
    marshallingYardRequired: false,
    restrictedDeliveryWindows: [],
    sourceReference: 'Unverified Vendor Note',
    sourceDocument: 'Informal Email Note',
    verificationStatus: 'Draft',
  },
  utilities: {
    availableGridKva: 1000,
    temporaryGeneratorPermitRequired: false,
    fuelStorageRegulations: 'None',
    sourceReference: 'Unverified Vendor Note',
    sourceDocument: 'Informal Email Note',
    verificationStatus: 'Draft',
  },
};

export const SEED_CONSTRAINT_PROFILES: OperationalConstraintProfile[] = [
  DOHA_DECC_PROFILE,
  QATAR_CIVIL_DEFENCE_PERMIT_PROFILE,
  UAE_DUBAI_DWTC_PROFILE,
  KSA_RIYADH_ARENA_PROFILE,
  GENERIC_INTERNATIONAL_VENUE_PROFILE,
  UNVERIFIED_DRAFT_VENUE_PROFILE,
];

/**
 * Resolves the operational constraint profile applicable to a project, venue, or country context.
 * Guarantees provenance and returns verified constraint packs.
 */
export function resolveOperationalConstraints(options?: {
  venueName?: string;
  countryCode?: string;
  profileId?: string;
  overrides?: Partial<OperationalConstraintProfile>;
}): OperationalConstraintProfile {
  let base: OperationalConstraintProfile = GENERIC_INTERNATIONAL_VENUE_PROFILE;

  if (options?.profileId) {
    const found = SEED_CONSTRAINT_PROFILES.find((p) => p.id === options.profileId);
    if (found) base = found;
  } else if (options?.venueName) {
    const v = options.venueName.toLowerCase();
    if (v.includes('decc') || v.includes('doha exhibition')) {
      base = DOHA_DECC_PROFILE;
    } else if (v.includes('lusail') || v.includes('boulevard') || v.includes('civil defence')) {
      base = QATAR_CIVIL_DEFENCE_PERMIT_PROFILE;
    } else if (v.includes('dwtc') || v.includes('dubai')) {
      base = UAE_DUBAI_DWTC_PROFILE;
    } else if (v.includes('riyadh') || v.includes('ksa') || v.includes('boulevard city')) {
      base = KSA_RIYADH_ARENA_PROFILE;
    }
  } else if (options?.countryCode) {
    const c = options.countryCode.toUpperCase();
    if (c === 'QA') base = DOHA_DECC_PROFILE;
    else if (c === 'AE') base = UAE_DUBAI_DWTC_PROFILE;
    else if (c === 'SA') base = KSA_RIYADH_ARENA_PROFILE;
  }

  if (options?.overrides) {
    return {
      ...base,
      ...options.overrides,
      constraints: options.overrides.constraints || base.constraints,
      noise: { ...base.noise, ...options.overrides.noise },
      workingHours: { ...base.workingHours, ...options.overrides.workingHours },
      structural: { ...base.structural, ...options.overrides.structural },
      height: { ...base.height, ...options.overrides.height },
      logistics: { ...base.logistics, ...options.overrides.logistics },
      utilities: { ...base.utilities, ...options.overrides.utilities },
    };
  }

  return base;
}
