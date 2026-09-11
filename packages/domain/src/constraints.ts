/**
 * Operational Constraint Profile Engine
 * Core domain logic for E3 Event Operating System (EOS)
 *
 * Replaces hardcoded statutory assumptions with configurable operational constraint profiles
 * derived from Country, Municipality, Venue, Permit, and Client regulations.
 */

export type ConstraintSource = 'country' | 'municipality' | 'venue' | 'permit' | 'client';

export interface NoiseConstraint {
  dayMaxDb: number;
  nightMaxDb: number;
  curfewStartHour: number; // 24-hour format e.g. 23 for 23:00
  curfewEndHour: number; // 24-hour format e.g. 6 for 06:00
  weekendRestrictions?: string;
  sourceReference: string;
}

export interface WorkingHoursConstraint {
  standardShiftHours: number;
  overnightPermitRequired: boolean;
  mandatoryBreakIntervalHours: number;
  maxConsecutiveHoursPerCrew: number;
  sourceReference: string;
}

export interface StructuralConstraint {
  maxFloorLoadKgM2: number;
  maxRiggingPointWeightKg: number;
  pointLoadCertRequired: boolean;
  sourceReference: string;
}

export interface WorkingHeightConstraint {
  maxClearHeightMeters: number;
  boomLiftPermitRequired: boolean;
  windSpeedShutoffKmh: number;
  sourceReference: string;
}

export interface LogisticsAccessConstraint {
  loadingBayCapacityTrucks: number;
  marshallingYardRequired: boolean;
  restrictedDeliveryWindows: Array<{ startHour: number; endHour: number; description: string }>;
  sourceReference: string;
}

export interface UtilityPowerConstraint {
  availableGridKva: number;
  temporaryGeneratorPermitRequired: boolean;
  fuelStorageRegulations: string;
  sourceReference: string;
}

export interface OperationalConstraintProfile {
  id: string;
  name: string;
  source: ConstraintSource;
  jurisdictionOrVenue: string;
  sourceReference: string;
  noise: NoiseConstraint;
  workingHours: WorkingHoursConstraint;
  structural: StructuralConstraint;
  height: WorkingHeightConstraint;
  logistics: LogisticsAccessConstraint;
  utilities: UtilityPowerConstraint;
}

/**
 * Seed Profile: Doha Exhibition and Convention Center (DECC), Qatar
 * Venue regulations governed by Qatar Tourism & Civil Defence.
 */
export const DOHA_DECC_PROFILE: OperationalConstraintProfile = {
  id: 'PROF-VENUE-DECC-001',
  name: 'DECC Doha Venue Technical Regulations 2026',
  source: 'venue',
  jurisdictionOrVenue: 'Doha Exhibition and Convention Center, Qatar',
  sourceReference: 'DECC Exhibitor Manual Rev 4.2 / Law No. 13 of 1997',
  noise: {
    dayMaxDb: 85,
    nightMaxDb: 55,
    curfewStartHour: 22,
    curfewEndHour: 7,
    weekendRestrictions: 'No acoustic tuning or PA test before 14:00 on Fridays',
    sourceReference: 'DECC Acoustic & Environmental Code 2026',
  },
  workingHours: {
    standardShiftHours: 8,
    overnightPermitRequired: true,
    mandatoryBreakIntervalHours: 4,
    maxConsecutiveHoursPerCrew: 12,
    sourceReference: 'Qatar Ministry of Labour Event Operations Circular 2025',
  },
  structural: {
    maxFloorLoadKgM2: 2000,
    maxRiggingPointWeightKg: 1000,
    pointLoadCertRequired: true,
    sourceReference: 'DECC Hall Engineering Rigging Schedule 2026',
  },
  height: {
    maxClearHeightMeters: 18,
    boomLiftPermitRequired: true,
    windSpeedShutoffKmh: 40,
    sourceReference: 'DECC Safety & Rigging Annex C',
  },
  logistics: {
    loadingBayCapacityTrucks: 16,
    marshallingYardRequired: true,
    restrictedDeliveryWindows: [
      { startHour: 7, endHour: 9, description: 'Morning peak commute traffic hold' },
      { startHour: 16, endHour: 19, description: 'Evening peak traffic hold' },
    ],
    sourceReference: 'DECC Logistics Dock Protocol 2026',
  },
  utilities: {
    availableGridKva: 2500,
    temporaryGeneratorPermitRequired: true,
    fuelStorageRegulations: 'Secondary containment bund mandatory, double-walled fuel tanks only',
    sourceReference: 'Kahramaa / Civil Defence Regulation 44',
  },
};

/**
 * Seed Profile: Qatar Civil Defence Event Permit Profile (Lusail Outdoor Boulevard)
 */
export const QATAR_CIVIL_DEFENCE_PERMIT_PROFILE: OperationalConstraintProfile = {
  id: 'PROF-PERMIT-QCD-2026',
  name: 'Lusail Boulevard Outdoor Event Permit — Qatar Civil Defence',
  source: 'permit',
  jurisdictionOrVenue: 'Lusail Boulevard, Qatar',
  sourceReference: 'Civil Defence Permit #QCD-2026-EV-9941',
  noise: {
    dayMaxDb: 90,
    nightMaxDb: 60,
    curfewStartHour: 23,
    curfewEndHour: 6,
    weekendRestrictions: 'Overnight heavy structural lift permitted with police escort',
    sourceReference: 'Ministry of Municipality & Environment Lusail Zone Directive',
  },
  workingHours: {
    standardShiftHours: 8,
    overnightPermitRequired: true,
    mandatoryBreakIntervalHours: 4,
    maxConsecutiveHoursPerCrew: 10,
    sourceReference: 'QCD Event Safety Protocol Section 8',
  },
  structural: {
    maxFloorLoadKgM2: 1200,
    maxRiggingPointWeightKg: 800,
    pointLoadCertRequired: true,
    sourceReference: 'Lusail Infrastructure Roadway Weight Rating',
  },
  height: {
    maxClearHeightMeters: 14,
    boomLiftPermitRequired: true,
    windSpeedShutoffKmh: 35,
    sourceReference: 'QCD Wind Action Plan 2026',
  },
  logistics: {
    loadingBayCapacityTrucks: 8,
    marshallingYardRequired: true,
    restrictedDeliveryWindows: [
      { startHour: 18, endHour: 22, description: 'Boulevard pedestrian promenade closure' },
    ],
    sourceReference: 'Lusail Traffic Operations Center',
  },
  utilities: {
    availableGridKva: 1200,
    temporaryGeneratorPermitRequired: true,
    fuelStorageRegulations: 'External fire barrier 6m perimeter buffer required',
    sourceReference: 'QCD Hazardous Materials Division',
  },
};

/**
 * Seed Profile: Dubai World Trade Centre (DWTC), UAE
 */
export const UAE_DUBAI_DWTC_PROFILE: OperationalConstraintProfile = {
  id: 'PROF-VENUE-DWTC-001',
  name: 'DWTC Dubai Venue Technical Guidelines 2026',
  source: 'venue',
  jurisdictionOrVenue: 'Dubai World Trade Centre, Dubai, UAE',
  sourceReference: 'DWTC Technical Manual 2026 / Dubai Civil Defence',
  noise: {
    dayMaxDb: 85,
    nightMaxDb: 55,
    curfewStartHour: 22,
    curfewEndHour: 7,
    sourceReference: 'Dubai Municipality Environmental Protection Code',
  },
  workingHours: {
    standardShiftHours: 8,
    overnightPermitRequired: true,
    mandatoryBreakIntervalHours: 4,
    maxConsecutiveHoursPerCrew: 12,
    sourceReference: 'MOHRE UAE Labour Regulations',
  },
  structural: {
    maxFloorLoadKgM2: 2500,
    maxRiggingPointWeightKg: 1500,
    pointLoadCertRequired: true,
    sourceReference: 'DWTC Structural Engineering Specifications',
  },
  height: {
    maxClearHeightMeters: 16,
    boomLiftPermitRequired: true,
    windSpeedShutoffKmh: 45,
    sourceReference: 'DWTC Operations Manual Annex 3',
  },
  logistics: {
    loadingBayCapacityTrucks: 24,
    marshallingYardRequired: true,
    restrictedDeliveryWindows: [],
    sourceReference: 'DWTC Logistics Marshalling Yard Protocol',
  },
  utilities: {
    availableGridKva: 3000,
    temporaryGeneratorPermitRequired: true,
    fuelStorageRegulations: 'DEWA approved containment only',
    sourceReference: 'DEWA / DCD Regulation',
  },
};

/**
 * Seed Profile: Riyadh Boulevard Arena, KSA
 */
export const KSA_RIYADH_ARENA_PROFILE: OperationalConstraintProfile = {
  id: 'PROF-VENUE-RIYADH-001',
  name: 'Riyadh Boulevard Arena Technical Standards 2026',
  source: 'venue',
  jurisdictionOrVenue: 'Boulevard City Arena, Riyadh, KSA',
  sourceReference: 'GEA / General Entertainment Authority Technical Manual 2026',
  noise: {
    dayMaxDb: 92,
    nightMaxDb: 65,
    curfewStartHour: 24,
    curfewEndHour: 6,
    sourceReference: 'GEA Acoustic Regulation 2026',
  },
  workingHours: {
    standardShiftHours: 8,
    overnightPermitRequired: false, // 24h entertainment zone
    mandatoryBreakIntervalHours: 4,
    maxConsecutiveHoursPerCrew: 12,
    sourceReference: 'Ministry of Human Resources KSA',
  },
  structural: {
    maxFloorLoadKgM2: 1500,
    maxRiggingPointWeightKg: 1200,
    pointLoadCertRequired: true,
    sourceReference: 'Riyadh Arena Structural Load Chart',
  },
  height: {
    maxClearHeightMeters: 20,
    boomLiftPermitRequired: true,
    windSpeedShutoffKmh: 40,
    sourceReference: 'GEA Safety Protocol 2026',
  },
  logistics: {
    loadingBayCapacityTrucks: 12,
    marshallingYardRequired: true,
    restrictedDeliveryWindows: [],
    sourceReference: 'Boulevard Logistics Guide',
  },
  utilities: {
    availableGridKva: 2000,
    temporaryGeneratorPermitRequired: true,
    fuelStorageRegulations: 'Civil Defence KSA Standard 104',
    sourceReference: 'Civil Defence KSA',
  },
};

/**
 * Seed Profile: International Standard Venue Profile
 */
export const GENERIC_INTERNATIONAL_VENUE_PROFILE: OperationalConstraintProfile = {
  id: 'PROF-INTERNATIONAL-GENERIC',
  name: 'Standard International Venue & Festival Guidelines',
  source: 'country',
  jurisdictionOrVenue: 'International Standard Baseline',
  sourceReference: 'PLASA / Event Safety Alliance Standards',
  noise: {
    dayMaxDb: 85,
    nightMaxDb: 60,
    curfewStartHour: 23,
    curfewEndHour: 7,
    sourceReference: 'ESA Environmental Noise Guide',
  },
  workingHours: {
    standardShiftHours: 8,
    overnightPermitRequired: false,
    mandatoryBreakIntervalHours: 4,
    maxConsecutiveHoursPerCrew: 12,
    sourceReference: 'ILO Event Industry Labour Guidelines',
  },
  structural: {
    maxFloorLoadKgM2: 1500,
    maxRiggingPointWeightKg: 1000,
    pointLoadCertRequired: true,
    sourceReference: 'PLASA Rigging Standard',
  },
  height: {
    maxClearHeightMeters: 15,
    boomLiftPermitRequired: true,
    windSpeedShutoffKmh: 38,
    sourceReference: 'IPAF Working at Height Standard',
  },
  logistics: {
    loadingBayCapacityTrucks: 10,
    marshallingYardRequired: false,
    restrictedDeliveryWindows: [],
    sourceReference: 'Standard Dock Protocol',
  },
  utilities: {
    availableGridKva: 1500,
    temporaryGeneratorPermitRequired: false,
    fuelStorageRegulations: 'Standard bunded tanks',
    sourceReference: 'NFPA 110 Standard',
  },
};

export const SEED_CONSTRAINT_PROFILES: OperationalConstraintProfile[] = [
  DOHA_DECC_PROFILE,
  QATAR_CIVIL_DEFENCE_PERMIT_PROFILE,
  UAE_DUBAI_DWTC_PROFILE,
  KSA_RIYADH_ARENA_PROFILE,
  GENERIC_INTERNATIONAL_VENUE_PROFILE,
];

/**
 * Resolves the operational constraint profile applicable to a project, venue, or country context.
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
