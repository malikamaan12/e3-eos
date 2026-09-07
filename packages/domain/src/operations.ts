import { TimeWindow, TimeUtil } from './time.js';

export interface ReadinessCheckpoint {
  id: string;
  zone: string;
  title: string;
  isCritical: boolean; // Critical life-safety, structural, or regulatory gate
  status: 'pending' | 'passed' | 'failed';
  inspectorId?: string;
  inspectedAt?: Date;
  notes?: string;
}

export interface ReadinessEvaluation {
  zone: string;
  totalCheckpoints: number;
  passedCheckpoints: number;
  completionPercentage: number;
  unresolvedCriticalCheckpoints: ReadinessCheckpoint[];
  canReleaseToOpen: boolean;
}

export class ReadinessEngine {
  /**
   * Evaluates readiness for a zone or package (AT-059).
   * Invariant: Even if completion is 99%, if a single critical inspection is unresolved,
   * canReleaseToOpen is false and release is blocked.
   */
  static evaluateReadiness(zone: string, checkpoints: ReadinessCheckpoint[]): ReadinessEvaluation {
    if (checkpoints.length === 0) {
      return {
        zone,
        totalCheckpoints: 0,
        passedCheckpoints: 0,
        completionPercentage: 0,
        unresolvedCriticalCheckpoints: [],
        canReleaseToOpen: false,
      };
    }

    const passed = checkpoints.filter((c) => c.status === 'passed').length;
    const completionPercentage = Math.round((passed / checkpoints.length) * 100);

    const unresolvedCritical = checkpoints.filter(
      (c) => c.isCritical && c.status !== 'passed'
    );

    const canReleaseToOpen = unresolvedCritical.length === 0;

    return {
      zone,
      totalCheckpoints: checkpoints.length,
      passedCheckpoints: passed,
      completionPercentage,
      unresolvedCriticalCheckpoints: unresolvedCritical,
      canReleaseToOpen,
    };
  }

  /**
   * Asserts ready-to-open release authority (AT-059).
   */
  static assertOpeningRelease(zone: string, checkpoints: ReadinessCheckpoint[]): void {
    const evalResult = this.evaluateReadiness(zone, checkpoints);
    if (!evalResult.canReleaseToOpen) {
      const titles = evalResult.unresolvedCriticalCheckpoints.map((c) => c.title).join(', ');
      throw new Error(
        `OPENING_RELEASE_BLOCKED_CRITICAL_UNRESOLVED: Zone ${zone} has ${evalResult.completionPercentage}% task completion, but cannot be opened because ${evalResult.unresolvedCriticalCheckpoints.length} critical condition(s) remain unresolved: [${titles}]. Critical condition trumps completion percentage.`
      );
    }
  }
}

export interface LogisticsTrip {
  id: string;
  projectId: string;
  vehicleId: string;
  driverId: string;
  loadingStart: Date;
  travelStart: Date;
  venueArrival: Date;
  eventStart: Date;
  eventEnd: Date;
  bumpOutEnd: Date;
  returnInspectionEnd: Date;
}

export class LogisticsWindowEvaluator {
  /**
   * Computes full operational lifecycle window for a trip (AT-062).
   * Spans from loadingStart to returnInspectionEnd, not merely event hours.
   */
  static getFullOperationalWindow(trip: LogisticsTrip): TimeWindow {
    return {
      start: trip.loadingStart,
      end: trip.returnInspectionEnd,
    };
  }

  /**
   * Validates conflict against another trip or booking over the full window (AT-062).
   */
  static checkOperationalConflict(
    newTrip: LogisticsTrip,
    existingTrips: LogisticsTrip[]
  ): void {
    const newWindow = this.getFullOperationalWindow(newTrip);

    for (const existing of existingTrips) {
      const existingWindow = this.getFullOperationalWindow(existing);

      if (TimeUtil.overlaps(newWindow, existingWindow)) {
        if (newTrip.vehicleId === existing.vehicleId) {
          throw new Error(
            `VEHICLE_WINDOW_CONFLICT: Vehicle ${newTrip.vehicleId} is already committed to trip ${existing.id} across full operational window [${existingWindow.start.toISOString()} to ${existingWindow.end.toISOString()}). Public event hours alone do not determine availability.`
          );
        }
        if (newTrip.driverId === existing.driverId) {
          throw new Error(
            `DRIVER_WINDOW_CONFLICT: Driver ${newTrip.driverId} is already assigned to trip ${existing.id} during full operational window [${existingWindow.start.toISOString()} to ${existingWindow.end.toISOString()}).`
          );
        }
      }
    }
  }
}

export interface Shift {
  id: string;
  workerId: string;
  role: string;
  windowStart: Date;
  windowEnd: Date;
}

export class CrewShiftEvaluator {
  /**
   * Validates minimum rest interval between shifts (AT-063).
   * E.g. minimum 11 hours rest required between consecutive shifts.
   */
  static validateShiftRestInterval(
    newShift: Shift,
    existingShifts: Shift[],
    minimumRestHours: number = 11
  ): {
    hasRestViolation: boolean;
    violatingShiftId?: string;
    restHoursProvided?: number;
  } {
    const newStart = newShift.windowStart.getTime();
    const newEnd = newShift.windowEnd.getTime();
    const minRestMs = minimumRestHours * 60 * 60 * 1000;

    for (const s of existingShifts) {
      if (s.workerId !== newShift.workerId || s.id === newShift.id) continue;

      const sStart = s.windowStart.getTime();
      const sEnd = s.windowEnd.getTime();

      // Overlapping shifts
      if (newStart < sEnd && sStart < newEnd) {
        throw new Error(
          `CREW_SHIFT_OVERLAP: Worker ${newShift.workerId} has an overlapping shift ${s.id}.`
        );
      }

      // If new shift is after existing shift s
      if (newStart >= sEnd && newStart - sEnd < minRestMs) {
        const hours = (newStart - sEnd) / (60 * 60 * 1000);
        return {
          hasRestViolation: true,
          violatingShiftId: s.id,
          restHoursProvided: Math.round(hours * 10) / 10,
        };
      }

      // If new shift is before existing shift s
      if (sStart >= newEnd && sStart - newEnd < minRestMs) {
        const hours = (sStart - newEnd) / (60 * 60 * 1000);
        return {
          hasRestViolation: true,
          violatingShiftId: s.id,
          restHoursProvided: Math.round(hours * 10) / 10,
        };
      }
    }

    return { hasRestViolation: false };
  }
}

export interface IncidentRecord {
  id: string;
  projectId: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  operationalImpact: string;
  restrictedPersonalNarrative?: string; // Sensitive personal/medical details
  reportedAt: Date;
  reportedBy: string;
}

export class IncidentProjectionEngine {
  /**
   * Projects incident record filtering sensitive personal narratives for external/client audiences (AT-064).
   */
  static projectIncident(
    incident: IncidentRecord,
    audience: 'internal_command' | 'client_portal' | 'public_report'
  ): {
    id: string;
    projectId: string;
    title: string;
    severity: string;
    operationalImpact: string;
    reportedAt: Date;
    restrictedPersonalNarrative?: string;
  } {
    if (audience === 'internal_command') {
      return { ...incident };
    }

    // Invariant AT-064: Client and public projections strictly strip personal/medical narratives
    return {
      id: incident.id,
      projectId: incident.projectId,
      title: incident.title,
      severity: incident.severity,
      operationalImpact: incident.operationalImpact,
      reportedAt: incident.reportedAt,
      restrictedPersonalNarrative: undefined,
    };
  }
}

export interface VenueHandoverRecord {
  id: string;
  projectId: string;
  deliveryCompleted: boolean;
  venueReinstatementStatus: 'pending' | 'inspected' | 'accepted' | 'remedial_required';
  openDamageClaims: {
    claimId: string;
    description: string;
    estimatedCost: number;
    resolved: boolean;
  }[];
  depositStatus: 'held' | 'partially_retained' | 'released';
}

export class HandoverEvaluator {
  /**
   * Maintains separation between delivery completion and venue handover/damage claims (AT-065).
   */
  static isFinanciallySettled(record: VenueHandoverRecord): boolean {
    const hasUnresolvedClaims = record.openDamageClaims.some((c) => !c.resolved);
    return record.deliveryCompleted && record.venueReinstatementStatus === 'accepted' && !hasUnresolvedClaims && record.depositStatus === 'released';
  }
}
