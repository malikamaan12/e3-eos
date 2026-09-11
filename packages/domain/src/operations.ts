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

// --- SPRINT 03: LOGISTICS, CREW CONFLICTS, SITE & READINESS GATES ---

export type PackingListStatus =
  | 'draft'
  | 'picking'
  | 'packed'
  | 'ready'
  | 'dispatched'
  | 'in_transit'
  | 'delivered'
  | 'acknowledged'
  | 'returned'
  | 'closed';

export interface PackingListItem {
  assetId?: string;
  assetTag?: string;
  description: string;
  quantity: number;
  casesPallets: string;
  weightKg: number;
  volumeM3: number;
}

export interface DeliveryDiscrepancy {
  item: string;
  expectedQty: number;
  receivedQty: number;
  condition: string;
  notes?: string;
}

export interface DeliveryProof {
  packingListId: string;
  receiverName: string;
  receiverSignature?: string;
  timestamp: Date;
  photos: string[];
  discrepancies: DeliveryDiscrepancy[];
}

export interface PackingList {
  id: string;
  packingListNumber: string;
  projectId: string;
  warehouseId: string;
  destination: string;
  vehicleId?: string;
  driverId?: string;
  dispatchDate: Date;
  requiredArrival: Date;
  items: PackingListItem[];
  status: PackingListStatus;
  deliveryProof?: DeliveryProof;
  dispatchedAt?: Date;
  deliveredAt?: Date;
}

export class LogisticsEngine {
  /**
   * Dispatches a packing list from warehouse into transit (Sprint 03 Module 9).
   */
  static dispatchPackingList(list: PackingList): PackingList {
    if (list.status !== 'ready' && list.status !== 'packed') {
      throw new Error(`DISPATCH_NOT_READY: Packing list ${list.packingListNumber} is in '${list.status}' status. Must be 'packed' or 'ready'.`);
    }

    return {
      ...list,
      status: 'dispatched',
      dispatchedAt: new Date(),
    };
  }

  /**
   * Records verified proof of delivery with receiver signature and condition inspection.
   */
  static deliverPackingList(list: PackingList, proof: DeliveryProof): PackingList {
    if (list.status !== 'dispatched' && list.status !== 'in_transit') {
      throw new Error(`DELIVERY_INVALID_STATE: Cannot record delivery for packing list in status '${list.status}'.`);
    }

    return {
      ...list,
      status: proof.discrepancies.length > 0 ? 'acknowledged' : 'delivered',
      deliveryProof: proof,
      deliveredAt: new Date(),
    };
  }
}

export type PersonnelType =
  | 'e3_employee'
  | 'freelancer'
  | 'vendor_crew'
  | 'temporary_staff'
  | 'security'
  | 'ushers'
  | 'technical_crew'
  | 'performers'
  | 'drivers';

export interface CrewAssignment {
  id: string;
  personName: string;
  employer: string;
  role: string;
  department: string;
  projectId: string;
  shiftId?: string;
  location: string;
  supervisorName?: string;
  window: TimeWindow;
  accreditation: string;
  permit?: string;
  certification?: string;
  personnelType: PersonnelType;
  status: 'scheduled' | 'confirmed' | 'checked_in' | 'checked_out' | 'conflict_flagged';
}

export class CrewConflictDetector {
  /**
   * Detects and flags crew allocations across overlapping projects (Sprint 03 Module 11).
   * Invariant: A person cannot be assigned to Project A and Project B at overlapping times.
   */
  static detectMultiProjectConflict(
    newAssignment: CrewAssignment,
    existingAssignments: CrewAssignment[]
  ): {
    hasConflict: boolean;
    conflictingAssignment?: CrewAssignment;
    conflictMessage?: string;
  } {
    for (const existing of existingAssignments) {
      if (existing.id === newAssignment.id) continue;
      if (existing.personName.toLowerCase() !== newAssignment.personName.toLowerCase()) continue;
      if (existing.status === 'checked_out') continue;

      // Check overlapping shift intervals
      if (TimeUtil.overlaps(newAssignment.window, existing.window)) {
        if (newAssignment.projectId !== existing.projectId) {
          return {
            hasConflict: true,
            conflictingAssignment: existing,
            conflictMessage: `CREW_PROJECT_CONFLICT: ${newAssignment.personName} is already assigned to Project ${existing.projectId} (${existing.role}) during window [${existing.window.start.toISOString()} to ${existing.window.end.toISOString()}). Cannot assign to Project ${newAssignment.projectId} concurrently.`,
          };
        }
      }
    }

    return { hasConflict: false };
  }
}

export interface DailySiteReport {
  id: string;
  projectId: string;
  reportDate: string; // YYYY-MM-DD
  workCompleted: string;
  workDelayed: string;
  manpowerCount: number;
  equipmentActive: string;
  deliveriesReceived: string;
  incidentsOccurred: string;
  snagsIdentified: string;
  clientInstructions: string;
  weatherConditions: string;
  photos: string[];
  tomorrowPlan: string;
  recordedBy: string;
  recordedAt: Date;
  isImmutable: boolean;
}

export class DailySiteReportEngine {
  /**
   * Generates immutable daily site reports ensuring historical delivery integrity (Sprint 03 Module 12).
   */
  static recordReport(params: Omit<DailySiteReport, 'id' | 'recordedAt' | 'isImmutable'>): DailySiteReport {
    return {
      ...params,
      id: `dsr-${params.projectId}-${params.reportDate}-${Date.now()}`,
      recordedAt: new Date(),
      isImmutable: true,
    };
  }
}

export type InstallationStatus =
  | 'not_delivered'
  | 'delivered'
  | 'positioned'
  | 'installed'
  | 'tested'
  | 'accepted';

export interface InstallationItem {
  id: string;
  projectId: string;
  packageId?: string;
  assetId?: string;
  title: string;
  status: InstallationStatus;
  evidenceUris: string[];
  installerNotes?: string;
  verifiedBy?: string;
  verifiedAt?: Date;
}

export class InstallationTracker {
  /**
   * Transitions installation status capturing progressive physical evidence.
   */
  static advanceStatus(
    item: InstallationItem,
    targetStatus: InstallationStatus,
    evidenceUris: string[] = [],
    notes?: string,
    verifier?: string
  ): InstallationItem {
    return {
      ...item,
      status: targetStatus,
      evidenceUris: [...item.evidenceUris, ...evidenceUris],
      installerNotes: notes || item.installerNotes,
      verifiedBy: verifier || item.verifiedBy,
      verifiedAt: ['installed', 'tested', 'accepted'].includes(targetStatus) ? new Date() : item.verifiedAt,
    };
  }
}

export type ReadinessGateStatus = 'READY' | 'READY_WITH_EXCEPTIONS' | 'NOT_READY';

export interface DimensionReadinessCheck {
  dimension:
    | 'Scope'
    | 'Design'
    | 'Production'
    | 'Assets'
    | 'Logistics'
    | 'Installation'
    | 'HSE'
    | 'Permits'
    | 'Staffing'
    | 'Technical Testing';
  isPassed: boolean;
  isCritical: boolean;
  scorePercent: number;
  details: string;
  openException?: string;
}

export interface OperationalReadinessReport {
  projectId: string;
  overallStatus: ReadinessGateStatus;
  overallScorePercent: number;
  evaluatedAt: Date;
  dimensionChecks: DimensionReadinessCheck[];
  criticalBlockers: string[];
  exceptions: string[];
  canOpen: boolean;
}

export class ComprehensiveReadinessEvaluator {
  /**
   * Evaluates all 10 operational readiness dimensions before opening (Sprint 03 Module 13).
   * Invariant: Status derives from underlying facts, NOT a manual toggle. Any unresolved critical condition forces NOT_READY.
   */
  static evaluate(projectId: string, checks: DimensionReadinessCheck[]): OperationalReadinessReport {
    const criticalBlockers: string[] = [];
    const exceptions: string[] = [];
    let totalScore = 0;

    for (const c of checks) {
      totalScore += c.scorePercent;
      if (!c.isPassed) {
        if (c.isCritical) {
          criticalBlockers.push(`[CRITICAL] ${c.dimension}: ${c.details}`);
        } else if (c.openException) {
          exceptions.push(`${c.dimension}: ${c.openException}`);
        } else {
          exceptions.push(`${c.dimension}: ${c.details}`);
        }
      }
    }

    const overallScorePercent = checks.length > 0 ? Math.round(totalScore / checks.length) : 0;

    let overallStatus: ReadinessGateStatus = 'READY';
    let canOpen = true;

    if (criticalBlockers.length > 0) {
      overallStatus = 'NOT_READY';
      canOpen = false;
    } else if (exceptions.length > 0 || overallScorePercent < 95) {
      overallStatus = 'READY_WITH_EXCEPTIONS';
      canOpen = true;
    }

    return {
      projectId,
      overallStatus,
      overallScorePercent,
      evaluatedAt: new Date(),
      dimensionChecks: checks,
      criticalBlockers,
      exceptions,
      canOpen,
    };
  }
}

