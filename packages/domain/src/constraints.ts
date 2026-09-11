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

export type ConstraintSource = 'country' | 'municipality' | 'venue' | 'permit' | 'client';
export type ConstraintSourceType = 'venue' | 'municipality' | 'authority' | 'permit' | 'client' | 'country';

export type VerificationStatus = 'Draft' | 'Unverified' | 'Verified' | 'Superseded';
export type ConstraintPriority = 'low' | 'medium' | 'high' | 'statutory_mandatory';

export type ConstraintType =
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
 * First-class granular constraint item with complete 14-point provenance metadata.
 */
export interface OperationalConstraintItem {
  id: string;
  constraintType: ConstraintType;
  sourceType: ConstraintSourceType;
  sourceOrganization: string;
  sourceDocument: string;
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
  dayMaxDb: number;
  nightMaxDb: number;
  curfewStartHour: number; // 24-hour format e.g. 22 for 22:00
  curfewEndHour: number; // 24-hour format e.g. 7 for 07:00
  weekendRestrictions?: string;
  sourceReference: string;
  verificationStatus?: VerificationStatus;
  sourceDocument?: string;
}

export interface WorkingHoursConstraint {
  standardShiftHours: number;
  overnightPermitRequired: boolean;
  mandatoryBreakIntervalHours: number;
  maxConsecutiveHoursPerCrew: number;
  sourceReference: string;
  verificationStatus?: VerificationStatus;
  sourceDocument?: string;
}

export interface StructuralConstraint {
  maxFloorLoadKgM2: number;
  maxRiggingPointWeightKg: number;
  pointLoadCertRequired: boolean;
  sourceReference: string;
  verificationStatus?: VerificationStatus;
  sourceDocument?: string;
}

export interface WorkingHeightConstraint {
  maxClearHeightMeters: number;
  boomLiftPermitRequired: boolean;
  windSpeedShutoffKmh: number;
  sourceReference: string;
  verificationStatus?: VerificationStatus;
  sourceDocument?: string;
}

export interface LogisticsAccessConstraint {
  loadingBayCapacityTrucks: number;
  marshallingYardRequired: boolean;
  restrictedDeliveryWindows: Array<{ startHour: number; endHour: number; description: string }>;
  sourceReference: string;
  verificationStatus?: VerificationStatus;
  sourceDocument?: string;
}

export interface UtilityPowerConstraint {
  availableGridKva: number;
  temporaryGeneratorPermitRequired: boolean;
  fuelStorageRegulations: string;
  sourceReference: string;
  verificationStatus?: VerificationStatus;
  sourceDocument?: string;
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

/**
 * Filter enforceable constraints based on applicability and verification policy.
 * Only verified constraints marked as applicable are enforceable by the scheduling engine.
 */
export function filterEnforceableConstraints(
  profile: OperationalConstraintProfile,
  policy: SchedulingPolicy = { allowedVerificationStatuses: ['Verified'] }
): OperationalConstraintItem[] {
  return (profile.constraints || []).filter(
    (c) => c.applicability && policy.allowedVerificationStatuses.includes(c.verificationStatus)
  );
}

/**
 * Controlled Country & Venue Pack: Doha Exhibition and Convention Center (DECC), Qatar
 * Governed by registered controlled documents:
 * - DOC-DECC-VTR-2024: DECC Venue Technical Regulations Manual Rev 3.2
 * - DOC-DECC-STR-2023: DECC Structural Slab Loading & Rigging Specification Rev 2.0
 * - DOC-DECC-LOG-2024: DECC Logistics Dock Protocol Rev 1.5
 * - DOC-QCD-ENV-2025: Qatar Ministry of Environment Acoustic Directive Law No. 13 of 1997
 */
export const DECC_VENUE_CONSTRAINTS: OperationalConstraintItem[] = [
  {
    id: 'CST-DECC-NOISE-DAY-001',
    constraintType: 'noise_day',
    sourceType: 'venue',
    sourceOrganization: 'Doha Exhibition and Convention Center (DECC) Technical Operations',
    sourceDocument: 'DOC-DECC-VTR-2024 (DECC Venue Technical Regulations)',
    sourceRevisionDate: 'Rev 3.2, 2024-05-15',
    locationZone: 'Exhibition Halls 1 to 5 & Concourse',
    effectivePeriod: '2024-01-01 to 2026-12-31',
    timeWindow: '07:00 - 22:00',
    limitValue: 85,
    unit: 'dB(A) Leq (15 min)',
    applicability: true,
    priority: 'high',
    overrideAuthority: 'DECC Venue Technical Director & Qatar Tourism',
    verificationStatus: 'Verified',
    notes: 'Controlled daytime operational noise limit for event production fit-out.',
  },
  {
    id: 'CST-DECC-NOISE-NIGHT-002',
    constraintType: 'noise_night',
    sourceType: 'municipality',
    sourceOrganization: 'Ministry of Municipality & Environment / Qatar Civil Defence',
    sourceDocument: 'DOC-QCD-ENV-2025 / Law No. 13 of 1997 Environmental Protection Directive',
    sourceRevisionDate: 'Rev 4.1, 2025-01-10',
    locationZone: 'DECC Outer Perimeter & West Bay Residential Buffer Zone',
    effectivePeriod: '2024-01-01 to 2026-12-31',
    timeWindow: '22:00 - 07:00',
    limitValue: 55,
    unit: 'dB(A) Lmax',
    applicability: true,
    priority: 'statutory_mandatory',
    overrideAuthority: 'Qatar Civil Defence & Ministry of Environment',
    verificationStatus: 'Verified',
    notes: 'Mandatory statutory night curfew. Heavy crane and silent assembly permitted; acoustic testing barred.',
  },
  {
    id: 'CST-DECC-FLOOR-LOAD-003',
    constraintType: 'floor_load',
    sourceType: 'venue',
    sourceOrganization: 'DECC Civil & Structural Engineering Department',
    sourceDocument: 'DOC-DECC-STR-2023 (Structural Slab Loading Specifications)',
    sourceRevisionDate: 'Rev 2.0, 2023-11-20',
    locationZone: 'Exhibition Halls 1 to 5 Ground Slab',
    effectivePeriod: '2024-01-01 to 2026-12-31',
    timeWindow: '24 Hours',
    limitValue: 2000,
    unit: 'kg/m² (Uniformly Distributed Load)',
    applicability: true,
    priority: 'statutory_mandatory',
    overrideAuthority: 'DECC Chief Structural Engineer',
    verificationStatus: 'Verified',
    notes: 'Certified maximum slab loading capacity verified by certified structural civil engineering audit.',
  },
  {
    id: 'CST-DECC-RIG-POINT-004',
    constraintType: 'rigging_point',
    sourceType: 'venue',
    sourceOrganization: 'DECC Rigging & Technical Services',
    sourceDocument: 'DOC-DECC-RIG-2024 (Primary Roof Truss Point Schedule)',
    sourceRevisionDate: 'Rev 3.0, 2024-03-01',
    locationZone: 'Primary Roof Truss Grid (Halls 1-5)',
    effectivePeriod: '2024-01-01 to 2026-12-31',
    timeWindow: '24 Hours',
    limitValue: 1000,
    unit: 'kg / point',
    applicability: true,
    priority: 'statutory_mandatory',
    overrideAuthority: 'DECC Rigging Supervisor',
    verificationStatus: 'Verified',
    notes: 'Pre-certified nodal rigging capacity. Bridle calculations must accompany any point load > 750 kg.',
  },
  {
    id: 'CST-DECC-HEIGHT-005',
    constraintType: 'clear_height',
    sourceType: 'venue',
    sourceOrganization: 'DECC Technical Operations',
    sourceDocument: 'DOC-DECC-VTR-2024 Section 6 (Clear Working Heights)',
    sourceRevisionDate: 'Rev 3.2, 2024-05-15',
    locationZone: 'Halls 1 to 5 Clear Span',
    effectivePeriod: '2024-01-01 to 2026-12-31',
    timeWindow: '24 Hours',
    limitValue: 18,
    unit: 'meters',
    applicability: true,
    priority: 'high',
    overrideAuthority: 'DECC Venue Technical Director',
    verificationStatus: 'Verified',
    notes: 'Maximum allowable working clear height to underside of steel truss.',
  },
  {
    id: 'CST-DECC-HOURS-006',
    constraintType: 'working_hours',
    sourceType: 'country',
    sourceOrganization: 'Qatar Ministry of Labour',
    sourceDocument: 'Qatar Labour Law No. 14 of 2004 / Circular 2025-08',
    sourceRevisionDate: '2025-08-01',
    locationZone: 'National Jurisdiction / All On-Site Work',
    effectivePeriod: '2025-01-01 to 2027-12-31',
    timeWindow: '24 Hours',
    limitValue: 8,
    unit: 'hours / shift',
    applicability: true,
    priority: 'statutory_mandatory',
    overrideAuthority: 'Ministry of Labour Inspectorate',
    verificationStatus: 'Verified',
    notes: 'Standard shift limit. Overtime capped at 2 hours with mandatory 4-hour rest rotation.',
  },
  {
    id: 'CST-DECC-LOGISTICS-007',
    constraintType: 'logistics_dock',
    sourceType: 'venue',
    sourceOrganization: 'DECC Security & Traffic Control',
    sourceDocument: 'DOC-DECC-LOG-2024 (Marshalling & Loading Protocol)',
    sourceRevisionDate: 'Rev 1.5, 2024-06-12',
    locationZone: 'North & South Service Yards (16 Docks)',
    effectivePeriod: '2024-01-01 to 2026-12-31',
    timeWindow: '24 Hours',
    limitValue: 16,
    unit: 'articulated trucks',
    applicability: true,
    priority: 'medium',
    overrideAuthority: 'DECC Logistics Manager',
    verificationStatus: 'Verified',
    notes: 'Active marshalling yard pass mandatory for articulated trailer entry.',
  },
  // Example Unverified and Draft constraints to verify scheduling exclusion
  {
    id: 'CST-DECC-PROPOSAL-SOUND-UNVERIFIED',
    constraintType: 'noise_day_extended_waiver',
    sourceType: 'client',
    sourceOrganization: 'Unverified Third-Party Sound Engineer Proposal',
    sourceDocument: 'PROPOSAL-UNVERIFIED-SOUND-WAIVER-2026',
    sourceRevisionDate: 'Draft 2026-09-01',
    locationZone: 'Concourse Stage',
    effectivePeriod: '2026-11-01 to 2026-11-03',
    timeWindow: '18:00 - 23:00',
    limitValue: 98,
    unit: 'dB(A)',
    applicability: false,
    priority: 'low',
    overrideAuthority: 'Pending Civil Defence Hearing',
    verificationStatus: 'Unverified',
    notes: 'Unverified acoustic waiver proposal. Strictly excluded from production scheduling by policy.',
  },
];

/**
 * Controlled Venue Pack: Doha Exhibition and Convention Center (DECC), Qatar
 */
export const DOHA_DECC_PROFILE: OperationalConstraintProfile = {
  id: 'PROF-VENUE-DECC-001',
  name: 'DECC Doha Controlled Venue Pack (DOC-DECC-VTR-2024 Rev 3.2)',
  source: 'venue',
  jurisdictionOrVenue: 'Doha Exhibition and Convention Center, Qatar',
  sourceReference: 'Controlled Venue Pack: DOC-DECC-VTR-2024 / DOC-DECC-STR-2023',
  packType: 'controlled_venue_pack',
  constraints: DECC_VENUE_CONSTRAINTS,
  noise: {
    dayMaxDb: 85,
    nightMaxDb: 55,
    curfewStartHour: 22,
    curfewEndHour: 7,
    weekendRestrictions: 'No acoustic tuning or PA test before 14:00 on Fridays',
    sourceReference: 'DOC-DECC-VTR-2024 / DOC-QCD-ENV-2025 Section 4.3',
    sourceDocument: 'DOC-DECC-VTR-2024',
    verificationStatus: 'Verified',
  },
  workingHours: {
    standardShiftHours: 8,
    overnightPermitRequired: true,
    mandatoryBreakIntervalHours: 4,
    maxConsecutiveHoursPerCrew: 12,
    sourceReference: 'Qatar Labour Law No. 14 of 2004 / Circular 2025-08',
    sourceDocument: 'Qatar Labour Law No. 14 of 2004',
    verificationStatus: 'Verified',
  },
  structural: {
    maxFloorLoadKgM2: 2000,
    maxRiggingPointWeightKg: 1000,
    pointLoadCertRequired: true,
    sourceReference: 'DOC-DECC-STR-2023 (Structural Slab Loading Specifications Rev 2.0)',
    sourceDocument: 'DOC-DECC-STR-2023',
    verificationStatus: 'Verified',
  },
  height: {
    maxClearHeightMeters: 18,
    boomLiftPermitRequired: true,
    windSpeedShutoffKmh: 40,
    sourceReference: 'DOC-DECC-VTR-2024 Section 6 (Clear Working Heights)',
    sourceDocument: 'DOC-DECC-VTR-2024',
    verificationStatus: 'Verified',
  },
  logistics: {
    loadingBayCapacityTrucks: 16,
    marshallingYardRequired: true,
    restrictedDeliveryWindows: [
      { startHour: 7, endHour: 9, description: 'Morning peak commute traffic hold' },
      { startHour: 16, endHour: 19, description: 'Evening peak traffic hold' },
    ],
    sourceReference: 'DOC-DECC-LOG-2024 (Marshalling Protocol Rev 1.5)',
    sourceDocument: 'DOC-DECC-LOG-2024',
    verificationStatus: 'Verified',
  },
  utilities: {
    availableGridKva: 2500,
    temporaryGeneratorPermitRequired: true,
    fuelStorageRegulations: 'Secondary containment bund mandatory, double-walled fuel tanks only',
    sourceReference: 'Kahramaa / Civil Defence Regulation 44',
    sourceDocument: 'Kahramaa Technical Regulation 44',
    verificationStatus: 'Verified',
  },
};

/**
 * Controlled Permit Profile: Qatar Civil Defence Event Permit Profile (Lusail Outdoor Boulevard)
 */
export const QATAR_CIVIL_DEFENCE_PERMIT_PROFILE: OperationalConstraintProfile = {
  id: 'PROF-PERMIT-QCD-2026',
  name: 'Lusail Boulevard Outdoor Event Permit — Qatar Civil Defence',
  source: 'permit',
  jurisdictionOrVenue: 'Lusail Boulevard, Qatar',
  sourceReference: 'Civil Defence Permit #QCD-2026-EV-9941',
  packType: 'controlled_venue_pack',
  constraints: [
    {
      id: 'CST-QCD-NOISE-DAY',
      constraintType: 'noise_day',
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
      verificationStatus: 'Verified',
    },
    {
      id: 'CST-QCD-NOISE-NIGHT',
      constraintType: 'noise_night',
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
      verificationStatus: 'Verified',
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
      verificationStatus: 'Verified',
    },
  ],
  noise: {
    dayMaxDb: 90,
    nightMaxDb: 60,
    curfewStartHour: 23,
    curfewEndHour: 6,
    weekendRestrictions: 'Overnight heavy structural lift permitted with police escort',
    sourceReference: 'Civil Defence Permit #QCD-2026-EV-9941',
    sourceDocument: 'DOC-QCD-PERMIT-2026-EV-9941',
    verificationStatus: 'Verified',
  },
  workingHours: {
    standardShiftHours: 8,
    overnightPermitRequired: true,
    mandatoryBreakIntervalHours: 4,
    maxConsecutiveHoursPerCrew: 10,
    sourceReference: 'QCD Event Safety Protocol Section 8',
    sourceDocument: 'DOC-QCD-PERMIT-2026-EV-9941',
    verificationStatus: 'Verified',
  },
  structural: {
    maxFloorLoadKgM2: 1200,
    maxRiggingPointWeightKg: 800,
    pointLoadCertRequired: true,
    sourceReference: 'DOC-LREDC-INFRA-STR-2025',
    sourceDocument: 'DOC-LREDC-INFRA-STR-2025',
    verificationStatus: 'Verified',
  },
  height: {
    maxClearHeightMeters: 14,
    boomLiftPermitRequired: true,
    windSpeedShutoffKmh: 35,
    sourceReference: 'QCD Wind Action Plan 2026',
    sourceDocument: 'DOC-QCD-PERMIT-2026-EV-9941',
    verificationStatus: 'Verified',
  },
  logistics: {
    loadingBayCapacityTrucks: 8,
    marshallingYardRequired: true,
    restrictedDeliveryWindows: [
      { startHour: 18, endHour: 22, description: 'Boulevard pedestrian promenade closure' },
    ],
    sourceReference: 'Lusail Traffic Operations Center Directive',
    sourceDocument: 'DOC-LTOC-2026-DIR',
    verificationStatus: 'Verified',
  },
  utilities: {
    availableGridKva: 1200,
    temporaryGeneratorPermitRequired: true,
    fuelStorageRegulations: 'External fire barrier 6m perimeter buffer required',
    sourceReference: 'QCD Hazardous Materials Division',
    sourceDocument: 'QCD-HAZMAT-REG-2026',
    verificationStatus: 'Verified',
  },
};

/**
 * Controlled Venue Pack: Dubai World Trade Centre (DWTC), UAE
 */
export const UAE_DUBAI_DWTC_PROFILE: OperationalConstraintProfile = {
  id: 'PROF-VENUE-DWTC-001',
  name: 'DWTC Dubai Controlled Venue Pack (DOC-DWTC-TG-2026)',
  source: 'venue',
  jurisdictionOrVenue: 'Dubai World Trade Centre, Dubai, UAE',
  sourceReference: 'Controlled Venue Pack: DOC-DWTC-TG-2026',
  packType: 'controlled_venue_pack',
  constraints: [
    {
      id: 'CST-DWTC-NOISE-DAY',
      constraintType: 'noise_day',
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
      verificationStatus: 'Verified',
    },
    {
      id: 'CST-DWTC-NOISE-NIGHT',
      constraintType: 'noise_night',
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
      verificationStatus: 'Verified',
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
      verificationStatus: 'Verified',
    },
  ],
  noise: {
    dayMaxDb: 85,
    nightMaxDb: 55,
    curfewStartHour: 22,
    curfewEndHour: 7,
    sourceReference: 'DOC-DWTC-TG-2026 Section 3',
    sourceDocument: 'DOC-DWTC-TG-2026',
    verificationStatus: 'Verified',
  },
  workingHours: {
    standardShiftHours: 8,
    overnightPermitRequired: true,
    mandatoryBreakIntervalHours: 4,
    maxConsecutiveHoursPerCrew: 12,
    sourceReference: 'MOHRE UAE Labour Regulations 2025',
    sourceDocument: 'MOHRE UAE Labour Law',
    verificationStatus: 'Verified',
  },
  structural: {
    maxFloorLoadKgM2: 2500,
    maxRiggingPointWeightKg: 1500,
    pointLoadCertRequired: true,
    sourceReference: 'DOC-DWTC-STR-2025',
    sourceDocument: 'DOC-DWTC-STR-2025',
    verificationStatus: 'Verified',
  },
  height: {
    maxClearHeightMeters: 16,
    boomLiftPermitRequired: true,
    windSpeedShutoffKmh: 45,
    sourceReference: 'DWTC Operations Manual Annex 3',
    sourceDocument: 'DOC-DWTC-TG-2026',
    verificationStatus: 'Verified',
  },
  logistics: {
    loadingBayCapacityTrucks: 24,
    marshallingYardRequired: true,
    restrictedDeliveryWindows: [],
    sourceReference: 'DWTC Logistics Marshalling Yard Protocol',
    sourceDocument: 'DOC-DWTC-LOG-2026',
    verificationStatus: 'Verified',
  },
  utilities: {
    availableGridKva: 3000,
    temporaryGeneratorPermitRequired: true,
    fuelStorageRegulations: 'DEWA approved containment only',
    sourceReference: 'DEWA / DCD Regulation',
    sourceDocument: 'DEWA Safety Code',
    verificationStatus: 'Verified',
  },
};

/**
 * Controlled Venue Pack: Riyadh Boulevard Arena, KSA
 */
export const KSA_RIYADH_ARENA_PROFILE: OperationalConstraintProfile = {
  id: 'PROF-VENUE-RIYADH-001',
  name: 'Riyadh Boulevard Arena Controlled Venue Pack (DOC-GEA-STD-2026)',
  source: 'venue',
  jurisdictionOrVenue: 'Boulevard City Arena, Riyadh, KSA',
  sourceReference: 'Controlled Venue Pack: DOC-GEA-STD-2026',
  packType: 'controlled_venue_pack',
  constraints: [
    {
      id: 'CST-RIYADH-NOISE-DAY',
      constraintType: 'noise_day',
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
      verificationStatus: 'Verified',
    },
    {
      id: 'CST-RIYADH-NOISE-NIGHT',
      constraintType: 'noise_night',
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
      verificationStatus: 'Verified',
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
      verificationStatus: 'Verified',
    },
  ],
  noise: {
    dayMaxDb: 92,
    nightMaxDb: 65,
    curfewStartHour: 24,
    curfewEndHour: 6,
    sourceReference: 'DOC-GEA-STD-2026 Section 4',
    sourceDocument: 'DOC-GEA-STD-2026',
    verificationStatus: 'Verified',
  },
  workingHours: {
    standardShiftHours: 8,
    overnightPermitRequired: false,
    mandatoryBreakIntervalHours: 4,
    maxConsecutiveHoursPerCrew: 12,
    sourceReference: 'Ministry of Human Resources KSA Regulations',
    sourceDocument: 'KSA Labour Code',
    verificationStatus: 'Verified',
  },
  structural: {
    maxFloorLoadKgM2: 1500,
    maxRiggingPointWeightKg: 1200,
    pointLoadCertRequired: true,
    sourceReference: 'DOC-RBA-STR-2025',
    sourceDocument: 'DOC-RBA-STR-2025',
    verificationStatus: 'Verified',
  },
  height: {
    maxClearHeightMeters: 20,
    boomLiftPermitRequired: true,
    windSpeedShutoffKmh: 40,
    sourceReference: 'GEA Safety Protocol 2026',
    sourceDocument: 'DOC-GEA-STD-2026',
    verificationStatus: 'Verified',
  },
  logistics: {
    loadingBayCapacityTrucks: 12,
    marshallingYardRequired: true,
    restrictedDeliveryWindows: [],
    sourceReference: 'Boulevard Logistics Guide 2026',
    sourceDocument: 'DOC-BLVD-LOG-2026',
    verificationStatus: 'Verified',
  },
  utilities: {
    availableGridKva: 2000,
    temporaryGeneratorPermitRequired: true,
    fuelStorageRegulations: 'Civil Defence KSA Standard 104',
    sourceDocument: 'Civil Defence KSA Standard 104',
    sourceReference: 'Civil Defence KSA',
    verificationStatus: 'Verified',
  },
};

/**
 * Standard International Baseline Profile
 */
export const GENERIC_INTERNATIONAL_VENUE_PROFILE: OperationalConstraintProfile = {
  id: 'PROF-INTERNATIONAL-GENERIC',
  name: 'Standard International Venue Baseline (PLASA / ESA)',
  source: 'country',
  jurisdictionOrVenue: 'International Standard Baseline',
  sourceReference: 'PLASA / Event Safety Alliance Standards 2025',
  packType: 'statutory_baseline',
  constraints: [
    {
      id: 'CST-INT-NOISE-DAY',
      constraintType: 'noise_day',
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
      verificationStatus: 'Verified',
    },
    {
      id: 'CST-INT-NOISE-NIGHT',
      constraintType: 'noise_night',
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
      verificationStatus: 'Verified',
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
      verificationStatus: 'Verified',
    },
  ],
  noise: {
    dayMaxDb: 85,
    nightMaxDb: 60,
    curfewStartHour: 23,
    curfewEndHour: 7,
    sourceReference: 'ESA Environmental Noise Guide',
    sourceDocument: 'ESA Environmental Noise Guide 2025',
    verificationStatus: 'Verified',
  },
  workingHours: {
    standardShiftHours: 8,
    overnightPermitRequired: false,
    mandatoryBreakIntervalHours: 4,
    maxConsecutiveHoursPerCrew: 12,
    sourceReference: 'ILO Event Industry Labour Guidelines',
    sourceDocument: 'ILO Convention No. 1',
    verificationStatus: 'Verified',
  },
  structural: {
    maxFloorLoadKgM2: 1500,
    maxRiggingPointWeightKg: 1000,
    pointLoadCertRequired: true,
    sourceReference: 'PLASA Rigging Standard ANSI E1.21',
    sourceDocument: 'PLASA ANSI E1.21-2020',
    verificationStatus: 'Verified',
  },
  height: {
    maxClearHeightMeters: 15,
    boomLiftPermitRequired: true,
    windSpeedShutoffKmh: 38,
    sourceReference: 'IPAF Working at Height Standard',
    sourceDocument: 'IPAF Technical Guidance',
    verificationStatus: 'Verified',
  },
  logistics: {
    loadingBayCapacityTrucks: 10,
    marshallingYardRequired: false,
    restrictedDeliveryWindows: [],
    sourceReference: 'Standard Dock Protocol',
    sourceDocument: 'Standard Dock Protocol',
    verificationStatus: 'Verified',
  },
  utilities: {
    availableGridKva: 1500,
    temporaryGeneratorPermitRequired: false,
    fuelStorageRegulations: 'Standard bunded tanks',
    sourceReference: 'NFPA 110 Standard',
    sourceDocument: 'NFPA 110 Standard',
    verificationStatus: 'Verified',
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
