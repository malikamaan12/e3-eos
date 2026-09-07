import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  HttpException,
  HttpStatus,
  UseGuards,
  UseFilters,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ShiftCreateSchema,
  AttendanceCaptureSchema,
  TripCreateSchema,
  PermitRecordSchema,
  PermitAlternativeVerifySchema,
  ReadinessCheckpointSchema,
  OpeningReleaseSchema,
  IncidentCaptureSchema,
  VenueHandoverSchema,
  CommandResult,
} from '@e3-eos/contracts';
import {
  ReadinessEngine,
  ReadinessCheckpoint,
  LogisticsWindowEvaluator,
  LogisticsTrip,
  CrewShiftEvaluator,
  Shift,
  IncidentProjectionEngine,
  IncidentRecord,
  VenueHandoverRecord,
  FieldSyncEngine,
  RegulatoryPermit,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { IdempotencyGuard } from '../common/idempotency.guard.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { projectRepository } from '../projects/projects.controller.js';

export interface StoredShift extends Shift {
  organisationId: string;
  projectId: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  restViolationWarning?: string;
}

export interface StoredAttendance {
  id: string;
  organisationId: string;
  projectId: string;
  shiftId?: string;
  workerId: string;
  checkInAt: string;
  checkOutAt?: string;
  verificationMethod: string;
  status: 'confirmed' | 'observation_flagged_for_review';
}

export interface StoredTrip extends LogisticsTrip {
  organisationId: string;
}

export interface StoredPermit extends RegulatoryPermit {
  organisationId: string;
}

export interface StoredCheckpoint extends ReadinessCheckpoint {
  organisationId: string;
  projectId: string;
}

export interface StoredOpeningRelease {
  id: string;
  organisationId: string;
  projectId: string;
  zone: string;
  releasedBy: string;
  releasedAt: Date;
  decision: 'released' | 'blocked';
}

export interface StoredIncident extends IncidentRecord {
  organisationId: string;
}

export interface StoredHandover extends VenueHandoverRecord {
  organisationId: string;
}

export const shiftRepository = new Map<string, StoredShift>();
export const attendanceRepository = new Map<string, StoredAttendance>();
export const tripRepository = new Map<string, StoredTrip>();
export const permitRepository = new Map<string, StoredPermit>();
export const checkpointRepository = new Map<string, StoredCheckpoint>();
export const openingReleaseRepository = new Map<string, StoredOpeningRelease>();
export const incidentRepository = new Map<string, StoredIncident>();
export const handoverRepository = new Map<string, StoredHandover>();

@Controller('projects/:projectId')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class OperationsController {
  // --- Crew Shifts & Attendance ---

  @Post('shifts')
  @UseGuards(IdempotencyGuard)
  createShift(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredShift> {
    const parseResult = ShiftCreateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const project = projectRepository.get(projectId);
    if (!project || project.organisationId !== orgId) {
      throw new HttpException({ message: 'PROJECT_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const shiftId = `shift-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newShift: Shift = {
      id: shiftId,
      workerId: parseResult.data.workerId,
      role: parseResult.data.role,
      windowStart: new Date(parseResult.data.windowStart),
      windowEnd: new Date(parseResult.data.windowEnd),
    };

    const existingShifts = Array.from(shiftRepository.values());

    // Invariant AT-063: Validate rest period interval (e.g. 11h between shifts)
    let warning: string | undefined;
    try {
      const restEval = CrewShiftEvaluator.validateShiftRestInterval(newShift, existingShifts, 11);
      if (restEval.hasRestViolation) {
        warning = `REST_PERIOD_VIOLATION_EXCEPTION: Worker receives only ${restEval.restHoursProvided} hours rest before/after shift ${restEval.violatingShiftId} (minimum 11 hours required). Flagged for supervisor review.`;
      }
    } catch (err: any) {
      throw new HttpException({ message: 'SHIFT_CONFLICT', detail: err.message }, HttpStatus.CONFLICT);
    }

    const storedShift: StoredShift = {
      ...newShift,
      organisationId: orgId,
      projectId,
      status: 'scheduled',
      restViolationWarning: warning,
    };

    shiftRepository.set(shiftId, storedShift);

    return {
      data: {
        id: shiftId,
        status: storedShift.status,
        recordVersion: 1,
        payload: storedShift,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-shift',
      },
    };
  }

  @Post('attendance')
  @UseGuards(IdempotencyGuard)
  recordAttendance(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredAttendance> {
    const parseResult = AttendanceCaptureSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const attId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const attendance: StoredAttendance = {
      id: attId,
      organisationId: orgId,
      projectId,
      shiftId: parseResult.data.shiftId,
      workerId: parseResult.data.workerId,
      checkInAt: parseResult.data.checkInAt,
      checkOutAt: parseResult.data.checkOutAt,
      verificationMethod: parseResult.data.verificationMethod,
      status: 'confirmed',
    };

    attendanceRepository.set(attId, attendance);

    return {
      data: {
        id: attId,
        status: attendance.status,
        recordVersion: 1,
        payload: attendance,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-att',
      },
    };
  }

  // --- Logistics Trips ---

  @Post('trips')
  @UseGuards(IdempotencyGuard)
  createTrip(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredTrip> {
    const parseResult = TripCreateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const tripId = `trip-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newTrip: LogisticsTrip = {
      id: tripId,
      projectId,
      vehicleId: parseResult.data.vehicleId,
      driverId: parseResult.data.driverId,
      loadingStart: new Date(parseResult.data.loadingStart),
      travelStart: new Date(parseResult.data.travelStart),
      venueArrival: new Date(parseResult.data.venueArrival),
      eventStart: new Date(parseResult.data.eventStart),
      eventEnd: new Date(parseResult.data.eventEnd),
      bumpOutEnd: new Date(parseResult.data.bumpOutEnd),
      returnInspectionEnd: new Date(parseResult.data.returnInspectionEnd),
    };

    const existingTrips = Array.from(tripRepository.values());

    // Invariant AT-062: Conflict checks full operational lifecycle window (loading to return)
    try {
      LogisticsWindowEvaluator.checkOperationalConflict(newTrip, existingTrips);
    } catch (err: any) {
      throw new HttpException({ message: 'LOGISTICS_CONFLICT', detail: err.message }, HttpStatus.CONFLICT);
    }

    const storedTrip: StoredTrip = { ...newTrip, organisationId: orgId };
    tripRepository.set(tripId, storedTrip);

    return {
      data: {
        id: tripId,
        status: 'planned',
        recordVersion: 1,
        payload: storedTrip,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-trip',
      },
    };
  }

  // --- Permits & Regulatory Gates ---

  @Post('permits')
  recordPermit(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredPermit> {
    const parseResult = PermitRecordSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const permitId = `pmt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const permit: StoredPermit = {
      id: permitId,
      organisationId: orgId,
      projectId,
      authorityName: parseResult.data.authorityName,
      permitType: parseResult.data.permitType,
      permitNumber: parseResult.data.permitNumber,
      status: parseResult.data.status,
      hasDigitalUpload: parseResult.data.hasDigitalUpload,
    };

    permitRepository.set(permitId, permit);

    return {
      data: {
        id: permitId,
        status: permit.status,
        recordVersion: 1,
        payload: permit,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-pmt',
      },
    };
  }

  @Post('permits/:id/verify-alternative')
  verifyAlternativePermit(
    @Param('projectId') projectId: string,
    @Param('id') permitId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredPermit> {
    const parseResult = PermitAlternativeVerifySchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const permit = permitRepository.get(permitId);
    if (!permit || permit.organisationId !== orgId || permit.projectId !== projectId) {
      throw new HttpException({ message: 'PERMIT_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // Invariant AT-060: Alternative verification allows authorization without digital upload
    permit.status = 'alternative_verified';
    permit.alternativeVerification = {
      verifiedBy: parseResult.data.verifiedBy,
      verifiedAt: new Date(),
      method: parseResult.data.method,
      physicalDocReference: parseResult.data.physicalDocReference,
    };

    permitRepository.set(permitId, permit);

    return {
      data: {
        id: permitId,
        status: permit.status,
        recordVersion: 2,
        payload: permit,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-pmt-alt',
      },
    };
  }

  // --- Readiness Checkpoints & Opening Release ---

  @Post('readiness-checkpoints')
  addReadinessCheckpoint(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredCheckpoint> {
    const parseResult = ReadinessCheckpointSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const chkId = `chk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const checkpoint: StoredCheckpoint = {
      id: chkId,
      organisationId: orgId,
      projectId,
      zone: parseResult.data.zone,
      title: parseResult.data.title,
      isCritical: parseResult.data.isCritical,
      status: parseResult.data.status,
      notes: parseResult.data.notes,
      inspectorId: parseResult.data.inspectorId,
      inspectedAt: parseResult.data.status === 'passed' ? new Date() : undefined,
    };

    checkpointRepository.set(chkId, checkpoint);

    return {
      data: {
        id: chkId,
        status: checkpoint.status,
        recordVersion: 1,
        payload: checkpoint,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-chk',
      },
    };
  }

  @Get('readiness')
  getReadiness(
    @Param('projectId') projectId: string,
    @Req() req: Request
  ): CommandResult<any> {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const checkpoints = Array.from(checkpointRepository.values()).filter(
      (c) => c.projectId === projectId && c.organisationId === orgId
    );

    const evaluation = ReadinessEngine.evaluateReadiness('All-Zones', checkpoints);

    return {
      data: {
        id: projectId,
        status: evaluation.canReleaseToOpen ? 'ready_to_open' : 'not_ready',
        recordVersion: 1,
        payload: evaluation,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-readiness',
      },
    };
  }

  @Post('opening-releases')
  releaseToOpen(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredOpeningRelease> {
    const parseResult = OpeningReleaseSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const zone = parseResult.data.zone;
    const checkpoints = Array.from(checkpointRepository.values()).filter(
      (c) => c.projectId === projectId && c.organisationId === orgId && (c.zone === zone || zone === 'All-Zones')
    );

    // Also check any regulatory permits required for this project
    const permits = Array.from(permitRepository.values()).filter(
      (p) => p.projectId === projectId && p.organisationId === orgId
    );

    for (const p of permits) {
      // Invariant AT-061: absent external approval blocks activity
      try {
        FieldSyncEngine.validatePermitReadiness(p);
      } catch (err: any) {
        throw new HttpException(
          { message: 'OPENING_BLOCKED_REGULATORY_PERMIT_ABSENT', detail: err.message },
          HttpStatus.FORBIDDEN
        );
      }
    }

    // Invariant AT-059: Critical condition trumps completion percentage!
    try {
      ReadinessEngine.assertOpeningRelease(zone, checkpoints);
    } catch (err: any) {
      throw new HttpException(
        { message: 'OPENING_RELEASE_BLOCKED', detail: err.message },
        HttpStatus.FORBIDDEN
      );
    }

    const relId = `rel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const releaseRecord: StoredOpeningRelease = {
      id: relId,
      organisationId: orgId,
      projectId,
      zone,
      releasedBy: parseResult.data.releasedBy,
      releasedAt: new Date(),
      decision: 'released',
    };

    openingReleaseRepository.set(relId, releaseRecord);

    return {
      data: {
        id: relId,
        status: 'released',
        recordVersion: 1,
        payload: releaseRecord,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-rel-open',
      },
    };
  }

  // --- Incidents & Audience Projection ---

  @Post('incidents')
  captureIncident(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredIncident> {
    const parseResult = IncidentCaptureSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const incId = `inc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const incident: StoredIncident = {
      id: incId,
      organisationId: orgId,
      projectId,
      title: parseResult.data.title,
      severity: parseResult.data.severity,
      operationalImpact: parseResult.data.operationalImpact,
      restrictedPersonalNarrative: parseResult.data.restrictedPersonalNarrative,
      reportedBy: parseResult.data.reportedBy,
      reportedAt: new Date(),
    };

    incidentRepository.set(incId, incident);

    return {
      data: {
        id: incId,
        status: 'recorded',
        recordVersion: 1,
        payload: incident,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-inc',
      },
    };
  }

  @Get('incidents')
  getIncidents(
    @Param('projectId') projectId: string,
    @Req() req: Request
  ): CommandResult<any[]> {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const audience = ((req.headers['x-audience'] as string) || 'internal_command') as
      | 'internal_command'
      | 'client_portal'
      | 'public_report';

    const incidents = Array.from(incidentRepository.values()).filter(
      (i) => i.projectId === projectId && i.organisationId === orgId
    );

    // Invariant AT-064: Strip sensitive personal narrative for client portal/public view
    const projected = incidents.map((i) => IncidentProjectionEngine.projectIncident(i, audience));

    return {
      data: {
        id: projectId,
        status: 'active',
        recordVersion: 1,
        payload: projected,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-inc-list',
      },
    };
  }

  // --- Venue Handover & Damage Claims ---

  @Post('handover-records')
  recordVenueHandover(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredHandover> {
    const parseResult = VenueHandoverSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const vhrId = `vhr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const handover: StoredHandover = {
      id: vhrId,
      organisationId: orgId,
      projectId,
      deliveryCompleted: parseResult.data.deliveryCompleted,
      venueReinstatementStatus: parseResult.data.venueReinstatementStatus,
      openDamageClaims: parseResult.data.openDamageClaims,
      depositStatus: parseResult.data.depositStatus,
    };

    handoverRepository.set(vhrId, handover);

    return {
      data: {
        id: vhrId,
        status: handover.venueReinstatementStatus,
        recordVersion: 1,
        payload: handover,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-vhr',
      },
    };
  }
}
