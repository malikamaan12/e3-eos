import { safeSha256 } from './crypto-util.js';

export type IncidentCategory =
  | 'safety'
  | 'crowd'
  | 'technical'
  | 'structural'
  | 'medical'
  | 'weather'
  | 'security';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export type IncidentStatus = 'open' | 'contained' | 'resolved' | 'closed';

export type ProtectiveActionType =
  | 'stop_show'
  | 'evacuate_zone'
  | 'isolate_equipment'
  | 'dispatch_medical'
  | 'crowd_metering'
  | 'structural_lockout';

export interface ProtectiveAction {
  id: string;
  actionType: ProtectiveActionType;
  zone: string;
  initiatedBy: string;
  initiatedAt: string;
  reason: string;
  immediateExecution: boolean; // Must be true: bypasses commercial approvals
  status: 'executing' | 'completed' | 'cancelled';
  auditHash: string;
}

export interface LiveIncidentRecord {
  id: string;
  projectId: string;
  incidentNumber: string;
  title: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  zone: string;
  operationalImpact: string;
  status: IncidentStatus;
  protectiveActions: ProtectiveAction[];
  injuriesCount: number;
  hospitalTransportRequired: boolean;
  venueEvacuationInitiated: boolean;
  requiresRegulatoryReporting: boolean;
  reportedBy: string;
  reportedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  rootCause?: string;
}

export interface AudienceDensityProjection {
  venueCapacity: number;
  currentInside: number;
  occupancyPercentage: number;
  ingressRatePerHour: number;
  egressRatePerHour: number;
  peakProjectedHeadcount: number;
  densityLevel: 'normal' | 'elevated' | 'critical' | 'over_capacity';
  meteringRequired: boolean;
}

export interface CommandCenterDashboardState {
  projectId: string;
  generatedAt: string;
  panels: {
    incidentLog: {
      openIncidentsCount: number;
      criticalIncidentsCount: number;
      activeProtectiveActions: ProtectiveAction[];
    };
    crewDuty: {
      rosteredWorkers: number;
      checkedInWorkers: number;
      attendancePercentage: number;
      fatigueWarningsActive: number;
    };
    compliance: {
      totalObligations: number;
      activeObligations: number;
      criticalBlockersCount: number;
      canOperate: boolean;
    };
    runSheet: {
      totalCues: number;
      completedCues: number;
      delayedCues: number;
      currentCueTitle?: string;
      cumulativeDelayMinutes: number;
    };
    zoneReadiness: {
      totalZones: number;
      readyZones: number;
      blockedZones: number;
      readinessPercentage: number;
    };
    maintenance: {
      openFaultsCount: number;
      criticalFaultsCount: number;
    };
    clientRequests: {
      pendingRequestsCount: number;
      approvedVariationsCount: number;
    };
    shiftHandover: {
      lastHandoverTime?: string;
      pendingHandoverIssuesCount: number;
      incomingLeadAcknowledged: boolean;
    };
  };
  audienceProjection: AudienceDensityProjection;
}

export class LiveCommandCenterEngine {
  /**
   * Authorizes and executes an immediate protective safety action (AT-063).
   * Invariant AT-063: Protective actions (stop show, evacuate zone, dispatch medical, isolate equipment)
   * execute IMMEDIATELY and record in audit log without waiting for financial/administrative approval.
   */
  static executeProtectiveAction(
    incident: LiveIncidentRecord,
    actionType: ProtectiveActionType,
    initiatedBy: string,
    reason: string
  ): {
    updatedIncident: LiveIncidentRecord;
    action: ProtectiveAction;
  } {
    const actionId = `prot-act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const initiatedAt = new Date().toISOString();

    const auditPayload = {
      actionId,
      incidentId: incident.id,
      actionType,
      zone: incident.zone,
      initiatedBy,
      initiatedAt,
      reason,
      bypassFinancialApproval: true,
    };

    const auditHash = safeSha256(auditPayload);

    const action: ProtectiveAction = {
      id: actionId,
      actionType,
      zone: incident.zone,
      initiatedBy,
      initiatedAt,
      reason,
      immediateExecution: true,
      status: 'executing',
      auditHash,
    };

    const isEvac = actionType === 'evacuate_zone';
    const isMedical = actionType === 'dispatch_medical';

    const updatedIncident: LiveIncidentRecord = {
      ...incident,
      status: incident.status === 'open' ? 'contained' : incident.status,
      protectiveActions: [...(incident.protectiveActions || []), action],
      venueEvacuationInitiated: incident.venueEvacuationInitiated || isEvac,
      hospitalTransportRequired: incident.hospitalTransportRequired || isMedical,
      requiresRegulatoryReporting:
        incident.requiresRegulatoryReporting || incident.severity === 'critical' || isEvac,
    };

    return {
      updatedIncident,
      action,
    };
  }

  /**
   * Computes audience density and projection server-side.
   */
  static computeAudienceProjection(
    venueCapacity: number,
    currentInside: number,
    ingressRatePerHour: number,
    egressRatePerHour: number,
    hoursUntilPeak: number = 2
  ): AudienceDensityProjection {
    const occupancyPercentage = Math.round((currentInside / Math.max(1, venueCapacity)) * 100);
    const netFlowPerHour = ingressRatePerHour - egressRatePerHour;
    const projectedPeak = Math.max(0, currentInside + Math.round(netFlowPerHour * hoursUntilPeak));

    let densityLevel: AudienceDensityProjection['densityLevel'] = 'normal';
    let meteringRequired = false;

    if (occupancyPercentage >= 100) {
      densityLevel = 'over_capacity';
      meteringRequired = true;
    } else if (occupancyPercentage >= 90) {
      densityLevel = 'critical';
      meteringRequired = true;
    } else if (occupancyPercentage >= 75) {
      densityLevel = 'elevated';
      meteringRequired = projectedPeak >= venueCapacity * 0.95;
    }

    return {
      venueCapacity,
      currentInside,
      occupancyPercentage,
      ingressRatePerHour,
      egressRatePerHour,
      peakProjectedHeadcount: projectedPeak,
      densityLevel,
      meteringRequired,
    };
  }
}
