import {
  Controller,
  Post,
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
  ResourceCreateSchema,
  ReservationCreateSchema,
  ReservationConfirmSchema,
  MaintenanceHoldSchema,
  MaintenanceReleaseSchema,
  SubrentalRequestSchema,
  CommandResult,
} from '@e3-eos/contracts';
import {
  InventoryReservationEngine,
  Resource,
  Reservation,
  MaintenanceHold,
  SubrentalRequest,
  Money,
  CurrencyCode,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { IdempotencyGuard } from '../common/idempotency.guard.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { projectRepository } from '../projects/projects.controller.js';

export interface StoredResource extends Resource {
  organisationId: string;
}

export interface StoredReservation extends Reservation {
  organisationId: string;
}

export interface StoredMaintenanceHold extends MaintenanceHold {
  organisationId: string;
}

export interface StoredSubrentalRequest extends SubrentalRequest {
  organisationId: string;
}

export const resourceRepository = new Map<string, StoredResource>();
export const reservationRepository = new Map<string, StoredReservation>();
export const maintenanceHoldRepository = new Map<string, StoredMaintenanceHold>();
export const subrentalRepository = new Map<string, StoredSubrentalRequest>();

@Controller()
@UseFilters(ProblemDetailsFilter)
export class InventoryController {
  // --- Resources ---

  @Post('resources')
  @UseGuards(TenantIsolationGuard, IdempotencyGuard)
  createResource(@Body() body: unknown, @Req() req: Request): CommandResult<StoredResource> {
    const parseResult = ResourceCreateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const resId = `res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const resource: StoredResource = {
      id: resId,
      organisationId: orgId,
      resourceCode: parseResult.data.resourceCode,
      name: parseResult.data.name,
      type: parseResult.data.type,
      totalQuantity: parseResult.data.totalQuantity,
      usableQuantity: parseResult.data.totalQuantity,
      warehouseLocation: parseResult.data.warehouseLocation,
      status: 'serviceable',
      authoritativeSystem: parseResult.data.authoritativeSystem,
    };

    resourceRepository.set(resId, resource);

    return {
      data: {
        id: resId,
        status: resource.status,
        recordVersion: 1,
        payload: resource,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-res',
      },
    };
  }

  // --- Reservations ---

  @Post('projects/:projectId/reservations')
  @UseGuards(TenantIsolationGuard, IdempotencyGuard)
  createReservation(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredReservation> {
    const parseResult = ReservationCreateSchema.safeParse(body);
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

    const resource = resourceRepository.get(parseResult.data.resourceId);
    if (!resource || resource.organisationId !== orgId) {
      throw new HttpException({ message: 'RESOURCE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const window = {
      start: new Date(parseResult.data.windowStart),
      end: new Date(parseResult.data.windowEnd),
    };

    const existing = Array.from(reservationRepository.values()).filter(
      (r) => r.resourceId === resource.id
    );

    try {
      if (resource.type === 'serialized') {
        // Invariant AT-049 (overlap), AT-051 (serviceability), AT-052 (cutover)
        InventoryReservationEngine.validateSerializedReservation(resource, existing, {
          projectId,
          window,
        });
      } else {
        // Invariant AT-050 (bulk capacity), AT-051 (serviceability)
        InventoryReservationEngine.validateBulkReservation(
          resource,
          existing,
          parseResult.data.quantity,
          window
        );
      }
    } catch (err: any) {
      throw new HttpException(
        { message: 'RESERVATION_REJECTED', detail: err.message },
        HttpStatus.CONFLICT
      );
    }

    const resId = `rsv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const reservation: StoredReservation = {
      id: resId,
      resourceId: resource.id,
      organisationId: orgId,
      projectId,
      window,
      quantity: parseResult.data.quantity,
      status: 'confirmed',
      confirmedAt: new Date(),
    };

    reservationRepository.set(resId, reservation);

    return {
      data: {
        id: resId,
        status: reservation.status,
        recordVersion: 1,
        payload: reservation,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-rsv',
      },
    };
  }

  @Post('projects/:projectId/reservations/:id/confirm')
  @UseGuards(TenantIsolationGuard, IdempotencyGuard)
  confirmReservation(
    @Param('projectId') projectId: string,
    @Param('id') reservationId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredReservation> {
    const parseResult = ReservationConfirmSchema.safeParse(body);
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

    let reservation = reservationRepository.get(reservationId);
    if (!reservation || reservation.projectId !== projectId || reservation.organisationId !== orgId) {
      throw new HttpException({ message: 'RESERVATION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    reservation = {
      ...reservation,
      status: 'confirmed',
      confirmedAt: new Date(),
      window: {
        start: new Date(parseResult.data.planningStart),
        end: new Date(parseResult.data.planningEnd),
      },
      quantity: parseResult.data.quantity,
    };
    reservationRepository.set(reservationId, reservation);

    return {
      data: {
        id: reservation.id,
        status: reservation.status,
        recordVersion: 2,
        payload: reservation,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-rsv-confirm',
      },
    };
  }

  // --- Maintenance & Damage Quarantine ---

  @Post('resources/:id/maintenance-holds')
  @UseGuards(TenantIsolationGuard)
  placeOnMaintenanceHold(
    @Param('id') resourceId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredMaintenanceHold> {
    const parseResult = MaintenanceHoldSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const resource = resourceRepository.get(resourceId);
    if (!resource || resource.organisationId !== orgId) {
      throw new HttpException({ message: 'RESOURCE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // Invariant AT-051: Damage quarantine decouples physical custody from usable availability
    const { updatedResource, hold } = InventoryReservationEngine.placeOnMaintenanceHold(
      resource,
      parseResult.data.reason,
      parseResult.data.damageReport
    );

    const storedResource: StoredResource = { ...updatedResource, organisationId: orgId };
    const storedHold: StoredMaintenanceHold = { ...hold, organisationId: orgId };

    resourceRepository.set(resourceId, storedResource);
    maintenanceHoldRepository.set(hold.id, storedHold);

    return {
      data: {
        id: hold.id,
        status: hold.status,
        recordVersion: 1,
        payload: storedHold,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-hold',
      },
    };
  }

  @Post('resources/:id/maintenance-holds/:holdId/release')
  @UseGuards(TenantIsolationGuard)
  releaseMaintenanceHold(
    @Param('id') resourceId: string,
    @Param('holdId') holdId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredResource> {
    const parseResult = MaintenanceReleaseSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const resource = resourceRepository.get(resourceId);
    if (!resource || resource.organisationId !== orgId) {
      throw new HttpException({ message: 'RESOURCE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const hold = maintenanceHoldRepository.get(holdId);
    if (!hold || hold.organisationId !== orgId || hold.resourceId !== resourceId) {
      throw new HttpException({ message: 'HOLD_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // Invariant AT-051: Certified inspection restores serviceability
    const { updatedResource, updatedHold } = InventoryReservationEngine.releaseFromMaintenanceHold(
      resource,
      hold,
      parseResult.data.inspectorId
    );

    const storedResource: StoredResource = { ...updatedResource, organisationId: orgId };
    const storedHold: StoredMaintenanceHold = { ...updatedHold, organisationId: orgId };

    resourceRepository.set(resourceId, storedResource);
    maintenanceHoldRepository.set(holdId, storedHold);

    return {
      data: {
        id: resourceId,
        status: storedResource.status,
        recordVersion: 2,
        payload: storedResource,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-hold-release',
      },
    };
  }

  // --- Subrental Requests ---

  @Post('projects/:projectId/subrental-requests')
  @UseGuards(TenantIsolationGuard)
  createSubrentalRequest(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredSubrentalRequest> {
    const parseResult = SubrentalRequestSchema.safeParse(body);
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

    const resource = resourceRepository.get(parseResult.data.resourceId);
    if (!resource || resource.organisationId !== orgId) {
      throw new HttpException({ message: 'RESOURCE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const currency = (project.financialAssumptions?.currency as CurrencyCode) || 'QAR';
    const unitRate = new Money(parseResult.data.estimatedUnitRate, currency);

    // Invariant AT-054: Shortage creates subrental request and forecast exposure, NOT automatic unauthorized PO
    const subrental = InventoryReservationEngine.createSubrentalShortageExposure({
      projectId,
      resource,
      shortageQuantity: parseResult.data.shortageQuantity,
      window: {
        start: new Date(parseResult.data.windowStart),
        end: new Date(parseResult.data.windowEnd),
      },
      estimatedUnitRate: unitRate,
    });

    const storedSubrental: StoredSubrentalRequest = {
      ...subrental,
      organisationId: orgId,
    };

    subrentalRepository.set(subrental.id, storedSubrental);

    return {
      data: {
        id: subrental.id,
        status: subrental.status,
        recordVersion: 1,
        payload: storedSubrental,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-subrental',
      },
    };
  }
}
