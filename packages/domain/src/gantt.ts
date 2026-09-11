/**
 * Master Timeline & Operational Gantt Engine
 * Core domain logic for E3 Event Operating System (EOS)
 *
 * Implements Critical Path Method (CPM), dependency calculation, operational 24/7 site shifts,
 * and baseline schedule variance tracking.
 */

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export interface GanttTaskInput {
  id: string;
  code: string; // e.g. "TSK-010"
  title: string;
  durationHours: number;
  stageNumber?: number; // 1 to 13
  startDate?: string; // ISO string
  endDate?: string;
  predecessorIds?: Array<{ id: string; type?: DependencyType; lagHours?: number }>;
  assignedRole?: string;
  isMilestone?: boolean;
  isVenueAccessRestricted?: boolean;
}

export interface CpmTaskOutput {
  id: string;
  code: string;
  title: string;
  durationHours: number;
  earlyStartHours: number;
  earlyFinishHours: number;
  lateStartHours: number;
  lateFinishHours: number;
  totalFloatHours: number;
  freeFloatHours: number;
  isCritical: boolean;
  stageNumber?: number;
}

export interface CpmScheduleResult {
  projectDurationHours: number;
  criticalPathTaskIds: string[];
  tasks: CpmTaskOutput[];
  totalTasks: number;
  criticalTasksCount: number;
}

import {
  isConstraintVerifiedWithEvidence,
  OperationalConstraintItem,
  OperationalConstraintProfile,
  resolveOperationalConstraints,
  SchedulingPolicy,
  VerificationStatus,
} from './constraints.js';

export interface OperationalShiftSlot {
  shiftNumber: number;
  label: string;
  startHour: number;
  endHour: number;
  shiftType: 'day_rigging' | 'overnight_heavy_lift' | 'rehearsal_run' | 'live_show';
  allowedNoiseDb: number;              // Environmental boundary acoustic limit (e.g. 65 dB day / 55 dB night)
  occupationalNoiseLimitDb?: number;   // Occupational worker safety limit (85 dB(A) 8h TWA)
  isCurfewActive: boolean;
  maxFloorLoadKgM2?: number;          // Certified floor load capacity (e.g. 2500 kg/m² = 2.5 T/m² for DECC)
  appliedConstraintProfileId?: string;
  appliedConstraintSource?: string;
  verificationStatus?: VerificationStatus;
  sourceDocument?: string;
  sourceOrganization?: string;
}

/**
 * Calculates Critical Path Method (CPM) network for a set of tasks and dependencies.
 */
export function calculateCpmSchedule(tasks: GanttTaskInput[]): CpmScheduleResult {
  if (tasks.length === 0) {
    return {
      projectDurationHours: 0,
      criticalPathTaskIds: [],
      tasks: [],
      totalTasks: 0,
      criticalTasksCount: 0,
    };
  }

  const earlyStart = new Map<string, number>();
  const earlyFinish = new Map<string, number>();

  // Forward Pass: Calculate Early Start (ES) and Early Finish (EF)
  for (const task of tasks) {
    const preds = task.predecessorIds || [];
    let maxEf = 0;

    for (const p of preds) {
      const predEf = earlyFinish.get(p.id) || 0;
      const lag = p.lagHours || 0;
      if (predEf + lag > maxEf) {
        maxEf = predEf + lag;
      }
    }

    const es = maxEf;
    const ef = es + (task.isMilestone ? 0 : Math.max(0, task.durationHours));
    earlyStart.set(task.id, es);
    earlyFinish.set(task.id, ef);
  }

  // Project total duration = max(earlyFinish)
  const projectDurationHours = Math.max(...Array.from(earlyFinish.values()), 0);

  // Backward Pass: Calculate Late Start (LS) and Late Finish (LF)
  const lateStart = new Map<string, number>();
  const lateFinish = new Map<string, number>();

  // Initialize successors map
  const successors = new Map<string, Array<{ id: string; lagHours?: number }>>();
  for (const task of tasks) {
    successors.set(task.id, []);
  }
  for (const task of tasks) {
    for (const p of task.predecessorIds || []) {
      const list = successors.get(p.id);
      if (list) {
        list.push({ id: task.id, lagHours: p.lagHours });
      }
    }
  }

  // Traverse in reverse topological order
  const reversedTasks = [...tasks].reverse();
  for (const task of reversedTasks) {
    const succs = successors.get(task.id) || [];
    let minLs = projectDurationHours;

    if (succs.length > 0) {
      for (const s of succs) {
        const sLs = lateStart.get(s.id) !== undefined ? lateStart.get(s.id)! : projectDurationHours;
        const lag = s.lagHours || 0;
        if (sLs - lag < minLs) {
          minLs = sLs - lag;
        }
      }
    } else {
      minLs = projectDurationHours;
    }

    const lf = minLs;
    const dur = task.isMilestone ? 0 : Math.max(0, task.durationHours);
    const ls = lf - dur;

    lateFinish.set(task.id, lf);
    lateStart.set(task.id, ls);
  }

  const criticalPathTaskIds: string[] = [];
  const cpmTasks: CpmTaskOutput[] = [];

  for (const task of tasks) {
    const es = earlyStart.get(task.id) || 0;
    const ef = earlyFinish.get(task.id) || 0;
    const ls = lateStart.get(task.id) || 0;
    const lf = lateFinish.get(task.id) || 0;

    const totalFloatHours = Math.max(0, ls - es);
    const isCritical = totalFloatHours <= 0;

    if (isCritical) {
      criticalPathTaskIds.push(task.id);
    }

    cpmTasks.push({
      id: task.id,
      code: task.code,
      title: task.title,
      durationHours: task.durationHours,
      earlyStartHours: es,
      earlyFinishHours: ef,
      lateStartHours: ls,
      lateFinishHours: lf,
      totalFloatHours,
      freeFloatHours: totalFloatHours, // simplified
      isCritical,
      stageNumber: task.stageNumber,
    });
  }

  return {
    projectDurationHours,
    criticalPathTaskIds,
    tasks: cpmTasks,
    totalTasks: tasks.length,
    criticalTasksCount: criticalPathTaskIds.length,
  };
}

/**
 * Builds operational shift breakdown for venue bump-in windows,
 * governed by configurable Operational Constraint Profiles (Venue, Municipality, Permit, Country, Client).
 */
export function generateBumpInShifts(
  totalWindowHours: number = 72,
  constraintProfileOrCurfewStart?: OperationalConstraintProfile | number,
  curfewEndHour?: number,
  policy: SchedulingPolicy = { allowedVerificationStatuses: ['Verified'] }
): OperationalShiftSlot[] {
  let profile: OperationalConstraintProfile;

  if (typeof constraintProfileOrCurfewStart === 'object' && constraintProfileOrCurfewStart !== null) {
    profile = constraintProfileOrCurfewStart;
  } else {
    // Compatibility if called with numeric (totalWindowHours, curfewStart, curfewEnd)
    const cStart = typeof constraintProfileOrCurfewStart === 'number' ? constraintProfileOrCurfewStart : 22;
    const cEnd = typeof curfewEndHour === 'number' ? curfewEndHour : 4;
    profile = resolveOperationalConstraints({
      overrides: {
        noise: {
          dayMaxDb: 65,
          nightMaxDb: 55,
          occupationalMaxDb: 85,
          curfewStartHour: cStart,
          curfewEndHour: cEnd,
          sourceReference: 'Qatar Environmental Law No. 30 of 2002 & Res No. 4 of 2005 Annex 3/5',
          verificationStatus: 'Unverified',
        },
      },
    });
  }

  const isNightNoiseConstraint = (c: OperationalConstraintItem) =>
    c.constraintType === 'environmental_noise_night' ||
    c.constraintType === 'noise_night' ||
    c.id.toLowerCase().includes('night') ||
    (c.timeWindow && (c.timeWindow.startsWith('22:00') || c.timeWindow.startsWith('23:00') || c.timeWindow.startsWith('24:00')));

  const isDayNoiseConstraint = (c: OperationalConstraintItem) =>
    (c.constraintType === 'environmental_noise_day' ||
     c.constraintType === 'noise_day' ||
     c.id.toLowerCase().includes('day') ||
     (c.timeWindow && (c.timeWindow.startsWith('04:00') || c.timeWindow.startsWith('06:00') || c.timeWindow.startsWith('07:00') || c.timeWindow.startsWith('08:00')))) &&
    !isNightNoiseConstraint(c);

  const verifiedEnvNoiseDay = profile.constraints?.find(
    (c) =>
      (c.constraintType === 'environmental_boundary_noise' ||
       c.constraintType === 'environmental_noise_day' ||
       c.constraintType === 'noise_day') &&
      c.applicability &&
      isDayNoiseConstraint(c) &&
      policy.allowedVerificationStatuses.includes(c.verificationStatus) &&
      isConstraintVerifiedWithEvidence(c)
  );
  const verifiedEnvNoiseNight = profile.constraints?.find(
    (c) =>
      (c.constraintType === 'environmental_boundary_noise' ||
       c.constraintType === 'environmental_noise_night' ||
       c.constraintType === 'noise_night') &&
      c.applicability &&
      isNightNoiseConstraint(c) &&
      policy.allowedVerificationStatuses.includes(c.verificationStatus) &&
      isConstraintVerifiedWithEvidence(c)
  );
  const verifiedOccupationalNoise = profile.constraints?.find(
    (c) =>
      (c.constraintType === 'occupational_noise_exposure' || c.constraintType === 'occupational_noise') &&
      c.applicability &&
      policy.allowedVerificationStatuses.includes(c.verificationStatus) &&
      isConstraintVerifiedWithEvidence(c)
  );
  const verifiedFloorLoad = profile.constraints?.find(
    (c) =>
      c.constraintType === 'floor_load' &&
      c.applicability &&
      policy.allowedVerificationStatuses.includes(c.verificationStatus) &&
      isConstraintVerifiedWithEvidence(c)
  );

  const isProfileNoiseVerified = verifiedEnvNoiseDay !== undefined && verifiedEnvNoiseNight !== undefined;
  const isProfileStructuralVerified = verifiedFloorLoad !== undefined;

  const dayNoiseLimit = verifiedEnvNoiseDay
    ? Number(verifiedEnvNoiseDay.limitValue)
    : 65; // Safe statutory fallback (Law No. 30 of 2002)

  const nightNoiseLimit = verifiedEnvNoiseNight
    ? Number(verifiedEnvNoiseNight.limitValue)
    : 55; // Safe statutory fallback (Res No. 4 of 2005 Annex 3/5)

  const occupationalNoiseLimit = verifiedOccupationalNoise
    ? Number(verifiedOccupationalNoise.limitValue)
    : (profile.noise.occupationalMaxDb || 85); // Res No. 4 of 2005 Annex 3/6

  // Unverified floor load limits (e.g. unverified 2500 kg/m² or draft 5000 kg/m²) MUST NOT dictate scheduling
  const floorLoadLimit = isProfileStructuralVerified
    ? Number(verifiedFloorLoad.limitValue)
    : 1500; // Safe statutory fallback for unverified floor load

  const activeVerificationStatus: VerificationStatus =
    (isProfileNoiseVerified && isProfileStructuralVerified) ? 'Verified' : 'Unverified';

  const shifts: OperationalShiftSlot[] = [];
  const shiftLength = profile.workingHours.standardShiftHours || 8;
  const totalShifts = Math.ceil(totalWindowHours / shiftLength);
  const curfewStart = profile.noise.curfewStartHour;
  const curfewEnd = profile.noise.curfewEndHour;

  for (let i = 0; i < totalShifts; i++) {
    const startH = i * shiftLength;
    const endH = startH + shiftLength;
    const dayHour = startH % 24;

    const isNight = curfewStart > curfewEnd
      ? (dayHour >= curfewStart || dayHour < curfewEnd)
      : (dayHour >= curfewStart && dayHour < curfewEnd);

    const shiftType = isNight ? 'overnight_heavy_lift' : 'day_rigging';
    const maxDb = isNight ? nightNoiseLimit : dayNoiseLimit;

    shifts.push({
      shiftNumber: i + 1,
      label: `Shift ${i + 1} (${startH}:00 - ${endH}:00)`,
      startHour: startH,
      endHour: endH,
      shiftType,
      allowedNoiseDb: maxDb,
      occupationalNoiseLimitDb: occupationalNoiseLimit,
      isCurfewActive: isNight,
      maxFloorLoadKgM2: floorLoadLimit,
      appliedConstraintProfileId: profile.id,
      appliedConstraintSource: profile.source,
      verificationStatus: activeVerificationStatus,
      sourceDocument: profile.noise.sourceDocument || profile.sourceReference,
      sourceOrganization: profile.jurisdictionOrVenue,
    });
  }

  return shifts;
}
