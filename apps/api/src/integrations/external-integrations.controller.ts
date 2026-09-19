import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  Res,
  HttpException,
  HttpStatus,
  UseGuards,
  UseFilters,
  Query,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  EquipmentAvailabilityQuerySchema,
  EquipmentReservationRequestSchema,
  VendorOnboardingRequestSchema,
  PurchaseRequestCreateSchema,
  PurchaseRequestSubmitSchema,
  InboundIntegrationEventSchema,
  EquipmentMovementSchema,
} from '@e3-eos/contracts';
import {
  RentalsAdapterEngine,
  PurchaseTrackerAdapterEngine,
  PortfolioCapacityEngine,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { activeConfigurationStore } from '../settings/settings.repositories.js';
import { globalIntegrationOperationsStore } from './integration-operations.store.js';

@Controller()
@UseFilters(ProblemDetailsFilter)
export class ExternalIntegrationsController {
  private getRentalsMode(): 'disabled' | 'sandbox' | 'production_read_only' | 'production_full' {
    const conn = activeConfigurationStore.connections.find((c) => c.provider === 'e3_rentals');
    return (conn?.mode as any) || 'disabled';
  }

  private getPurchaseTrackerMode(): 'disabled' | 'sandbox' | 'production_read_only' | 'production_full' {
    const conn = activeConfigurationStore.connections.find((c) => c.provider === 'e3_purchasetracker');
    return (conn?.mode as any) || 'disabled';
  }

  // --- E3 Rentals Equipment Catalog & Availability ---

  @Get('equipment')
  listEquipmentCatalog(@Query('search') search?: string) {
    const mode = this.getRentalsMode();
    const now = new Date().toISOString();
    return {
      data: [
        {
          equipmentRef: 'prod-counter-reg-01',
          name: 'Registration Counter - Standard White Oak',
          sku: 'RNT-CTR-001',
          category: 'Counters & Furniture',
          warehouseLocation: 'Doha Main Depot',
          totalServiceableUnits: 12,
          connectionStatus: mode === 'disabled' ? 'disconnected_snapshot' : 'connected',
          sourceCheckTime: now,
          isRentalsAuthoritative: true,
        },
      ].filter((item) => !search || item.name.toLowerCase().includes(search.toLowerCase())),
      meta: {
        mode,
        authoritativeSource: 'E3 Rentals',
      },
    };
  }

  @Get('equipment/:equipmentRef')
  getEquipmentDetail(@Param('equipmentRef') equipmentRef: string) {
    const mode = this.getRentalsMode();
    const now = new Date().toISOString();
    if (equipmentRef !== 'prod-counter-reg-01') {
      throw new HttpException(
        {
          type: 'https://errors.e3.qa/equipment-not-found',
          title: 'Equipment Not Found',
          status: HttpStatus.NOT_FOUND,
          detail: `Equipment ref ${equipmentRef} not found in Rentals catalog projection.`,
        },
        HttpStatus.NOT_FOUND
      );
    }
    return {
      data: {
        equipmentRef: 'prod-counter-reg-01',
        name: 'Registration Counter - Standard White Oak',
        sku: 'RNT-CTR-001',
        category: 'Counters & Furniture',
        warehouseLocation: 'Doha Main Depot',
        totalServiceableUnits: 12,
        connectionStatus: mode === 'disabled' ? 'disconnected_snapshot' : 'connected',
        sourceCheckTime: now,
      },
    };
  }

  @Post('equipment/availability-queries')
  queryEquipmentAvailability(@Body() body: unknown) {
    const parse = EquipmentAvailabilityQuerySchema.safeParse(body);
    if (!parse.success) {
      throw new HttpException(
        {
          type: 'https://errors.e3.qa/validation-error',
          title: 'Invalid Availability Query',
          status: HttpStatus.BAD_REQUEST,
          detail: parse.error.message,
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const mode = this.getRentalsMode();
    const result = RentalsAdapterEngine.queryAvailability(parse.data, mode);
    return { data: result };
  }

  // --- Project Resource Demand & Reservations ---

  // --- Project Resource Demand & Multi-Sourcing Scenarios ---

  @Get('projects/:projectId/resource-demand')
  @UseGuards(TenantIsolationGuard)
  async getProjectResourceDemand(@Param('projectId') projectId: string) {
    const demand = await globalIntegrationOperationsStore.getProjectDemand(projectId);
    if (demand) {
      return { data: demand };
    }

    // Default project-linked demand in EOS
    return {
      data: {
        projectId,
        requirements: [
          {
            requirementId: 'R01',
            title: 'Registration counters',
            quantity: 4,
            unit: 'each',
            allocations: [
              { zone: 'Zone A', quantity: 2 },
              { zone: 'Zone B', quantity: 2 },
            ],
            sourcingDecision: 'split_stock_and_fabrication',
            sourceProductRef: 'prod-counter-reg-01',
          },
        ],
        version: 0,
      },
    };
  }

  @Post('projects/:projectId/resource-demand')
  @UseGuards(TenantIsolationGuard)
  async saveProjectResourceDemand(
    @Param('projectId') projectId: string,
    @Body() body: any,
    @Req() req: Request
  ) {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'tenant-e3-default';
    const userId = (req.headers['x-user-id'] as string) || (body as any)?.updatedBy || 'planner-user';
    const expectedVersion = body?.expectedVersion !== undefined ? Number(body.expectedVersion) : undefined;

    const result = await globalIntegrationOperationsStore.saveProjectDemand({
      projectId,
      organisationId: tenantId,
      requirements: body.requirements || [],
      assumptions: body.assumptions,
      expectedVersion,
      updatedBy: userId,
    });

    if (result.isConflict) {
      throw new HttpException(
        {
          type: 'https://errors.e3.qa/optimistic-lock-conflict',
          title: 'Demand Version Conflict',
          status: HttpStatus.CONFLICT,
          detail: `The resource demand for project ${projectId} has been modified concurrently. Current version is ${result.record.version}.`,
          currentRecord: result.record,
        },
        HttpStatus.CONFLICT
      );
    }

    return { data: result.record, message: 'Resource demand saved to PostgreSQL durable store.' };
  }

  @Get('projects/:projectId/sourcing-scenarios')
  @UseGuards(TenantIsolationGuard)
  async listProjectSourcingScenarios(@Param('projectId') projectId: string) {
    const scenarios = await globalIntegrationOperationsStore.listSourcingScenarios(projectId);
    return { data: scenarios };
  }

  @Post('projects/:projectId/sourcing-scenarios')
  @UseGuards(TenantIsolationGuard)
  async saveProjectSourcingScenario(
    @Param('projectId') projectId: string,
    @Body() body: any,
    @Req() req: Request
  ) {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'tenant-e3-default';
    const userId = (req.headers['x-user-id'] as string) || (body as any)?.createdBy || 'planner-user';
    const expectedVersion = body?.expectedVersion !== undefined ? Number(body.expectedVersion) : undefined;

    const result = await globalIntegrationOperationsStore.saveSourcingScenario({
      projectId,
      organisationId: tenantId,
      name: body.name || 'Default Multi-Sourcing Scenario',
      status: body.status || 'draft',
      demandId: body.demandId,
      allocations: body.allocations || {},
      costBreakdown: body.costBreakdown || {},
      readinessConditions: body.readinessConditions || {},
      expectedVersion,
      createdBy: userId,
    });

    if (result.isConflict) {
      throw new HttpException(
        {
          type: 'https://errors.e3.qa/optimistic-lock-conflict',
          title: 'Scenario Version Conflict',
          status: HttpStatus.CONFLICT,
          detail: `Sourcing scenario '${body.name}' for project ${projectId} has been modified concurrently. Current version is ${result.record.version}.`,
          currentRecord: result.record,
        },
        HttpStatus.CONFLICT
      );
    }

    return { data: result.record, message: 'Sourcing scenario saved to PostgreSQL durable store.' };
  }

  @Get('projects/:projectId/conflict-decisions')
  @UseGuards(TenantIsolationGuard)
  async listProjectConflictDecisions(@Param('projectId') projectId: string) {
    const decisions = await globalIntegrationOperationsStore.listConflictDecisions(projectId);
    return { data: decisions };
  }

  @Post('projects/:projectId/conflict-decisions')
  @UseGuards(TenantIsolationGuard)
  async saveProjectConflictDecision(
    @Param('projectId') projectId: string,
    @Body() body: any,
    @Req() req: Request
  ) {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'tenant-e3-default';
    const userId = (req.headers['x-user-id'] as string) || (body as any)?.decidedBy || 'director-user';

    const decision = await globalIntegrationOperationsStore.saveConflictDecision({
      projectId,
      organisationId: tenantId,
      conflictRef: body.conflictRef,
      resourcePoolId: body.resourcePoolId,
      assignedOwner: body.assignedOwner,
      resolutionAction: body.resolutionAction,
      rationale: body.rationale,
      status: body.status || 'unresolved',
      decidedBy: userId,
    });

    return { data: decision, message: 'Capacity conflict decision saved to PostgreSQL durable store.' };
  }

  @Get('projects/:projectId/equipment-reservations')
  @UseGuards(TenantIsolationGuard)
  async getProjectEquipmentReservations(@Param('projectId') projectId: string) {
    const ops = (await globalIntegrationOperationsStore.listOperations(projectId)).filter(
      (op) => op.projectId === projectId && op.action === 'equipment_reservation'
    );

    return {
      data: {
        projectId,
        reservations: ops,
      },
    };
  }

  @Post('projects/:projectId/equipment-reservations')
  @UseGuards(TenantIsolationGuard)
  async submitEquipmentReservation(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const parse = EquipmentReservationRequestSchema.safeParse(body);
    if (!parse.success) {
      throw new HttpException(
        {
          type: 'https://errors.e3.qa/validation-error',
          title: 'Invalid Equipment Reservation Request',
          status: HttpStatus.BAD_REQUEST,
          detail: parse.error.message,
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const tenantId = (req.headers['x-tenant-id'] as string) || 'tenant-e3-default';
    const idempotencyKey = (req.headers['idempotency-key'] as string) || (body as any).idempotencyKey || `reserve-auto-${Date.now()}`;
    const mode = this.getRentalsMode();

    // Check shared PostgreSQL store for existing operation with this idempotencyKey
    const existingOp = await globalIntegrationOperationsStore.getOperationByIdempotencyKey(idempotencyKey);
    const payloadHash = RentalsAdapterEngine.computePayloadHash(parse.data);

    if (existingOp) {
      if (existingOp.payloadHash === payloadHash) {
        // Replay of existing operation
        return res.status(HttpStatus.ACCEPTED).json({
          operationId: existingOp.operationId,
          operationState: existingOp.operationState,
          businessState: existingOp.businessState,
          sourceRecord: existingOp.sourceRecord,
          statusUrl: existingOp.statusUrl,
        });
      } else {
        // Idempotency conflict: key reuse with different payload
        return res.status(HttpStatus.CONFLICT).json({
          type: 'https://errors.e3.qa/idempotency-conflict',
          title: 'Idempotency Conflict',
          status: HttpStatus.CONFLICT,
          detail: 'An operation with the same Idempotency-Key already exists with a different payload hash.',
        });
      }
    }

    const submission = RentalsAdapterEngine.submitReservationCommand(
      projectId,
      tenantId,
      idempotencyKey,
      parse.data,
      mode
    );

    if (submission.status === 'conflict') {
      return res.status(HttpStatus.CONFLICT).json({
        type: 'https://errors.e3.qa/idempotency-conflict',
        title: 'Idempotency Conflict',
        status: HttpStatus.CONFLICT,
        detail: 'An operation with the same Idempotency-Key already exists with a different payload hash.',
      });
    }

    // Persist operation record to PostgreSQL durable storage
    await globalIntegrationOperationsStore.saveOperation(submission.operation, tenantId);

    return res.status(HttpStatus.ACCEPTED).json({
      operationId: submission.operation.operationId,
      operationState: submission.operation.operationState,
      businessState: submission.operation.businessState,
      sourceRecord: submission.operation.sourceRecord,
      statusUrl: submission.operation.statusUrl,
    });
  }

  @Post('equipment-reservations/:ref/amendments')
  amendEquipmentReservation(@Param('ref') ref: string, @Body() _body: unknown) {
    return {
      data: {
        reservationRef: ref,
        status: 'amendment_under_review',
        amendmentRequestedAt: new Date().toISOString(),
      },
    };
  }

  @Post('equipment-reservations/:ref/releases')
  releaseEquipmentReservation(@Param('ref') ref: string, @Body() _body: unknown) {
    return {
      data: {
        reservationRef: ref,
        status: 'released',
        releasedAt: new Date().toISOString(),
      },
    };
  }

  // --- E3 PurchaseTracker Vendors & Onboarding ---

  @Get('vendors')
  listVendors(@Query('query') query?: string, @Query('compliantOnly') compliantOnly?: string) {
    const mode = this.getPurchaseTrackerMode();
    const results = PurchaseTrackerAdapterEngine.searchVendors(query, compliantOnly === 'true', mode);
    return {
      data: results,
      meta: {
        mode,
        authoritativeSource: 'E3 PurchaseTracker',
      },
    };
  }

  @Get('vendors/:vendorRef')
  getVendorDetail(@Param('vendorRef') vendorRef: string) {
    const mode = this.getPurchaseTrackerMode();
    const results = PurchaseTrackerAdapterEngine.searchVendors(undefined, false, mode);
    const match = results.find((v) => v.vendorRef === vendorRef);
    if (!match) {
      throw new HttpException(
        {
          type: 'https://errors.e3.qa/vendor-not-found',
          title: 'Vendor Not Found',
          status: HttpStatus.NOT_FOUND,
          detail: `Vendor ref ${vendorRef} not found in PurchaseTracker master or connector is disconnected.`,
        },
        HttpStatus.NOT_FOUND
      );
    }
    return { data: match };
  }

  @Post('vendor-onboarding-requests')
  submitVendorOnboarding(@Body() body: unknown) {
    const parse = VendorOnboardingRequestSchema.safeParse(body);
    if (!parse.success) {
      throw new HttpException(
        {
          type: 'https://errors.e3.qa/validation-error',
          title: 'Invalid Vendor Onboarding Request',
          status: HttpStatus.BAD_REQUEST,
          detail: parse.error.message,
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const mode = this.getPurchaseTrackerMode();
    const result = PurchaseTrackerAdapterEngine.submitVendorOnboarding(parse.data, mode);
    if (result.status === 'blocked') {
      throw new HttpException(
        {
          type: 'https://errors.e3.qa/connector-disabled',
          title: 'Connector Disabled',
          status: HttpStatus.FORBIDDEN,
          detail: result.message,
        },
        HttpStatus.FORBIDDEN
      );
    }
    return { data: result };
  }

  @Post('vendors/:vendorRef/change-requests')
  submitVendorChangeRequest(@Param('vendorRef') vendorRef: string, @Body() _body: unknown) {
    return {
      data: {
        vendorRef,
        changeRequestId: `vcr-${Date.now()}`,
        status: 'under_review',
        submittedAt: new Date().toISOString(),
      },
    };
  }

  // --- Purchase Requests (PR) & Purchase Orders (PO) ---

  @Get('projects/:projectId/purchase-requests')
  @UseGuards(TenantIsolationGuard)
  listProjectPurchaseRequests(@Param('projectId') projectId: string) {
    const mode = this.getPurchaseTrackerMode();
    const prs = PurchaseTrackerAdapterEngine.getPurchaseRequestsForProject(projectId, mode);
    const localDrafts = globalIntegrationOperationsStore
      .listLocalDrafts<any>('pr:')
      .filter((p) => p.projectId === projectId);

    const merged = [...prs];
    for (const d of localDrafts) {
      if (!merged.some((m) => m.prId === d.prId)) {
        merged.push(d);
      }
    }

    return { data: merged };
  }

  @Post('projects/:projectId/purchase-requests')
  @UseGuards(TenantIsolationGuard)
  createPurchaseRequest(@Param('projectId') projectId: string, @Body() body: unknown) {
    const parse = PurchaseRequestCreateSchema.safeParse({
      ...(body as any),
      projectId,
    });
    if (!parse.success) {
      throw new HttpException(
        {
          type: 'https://errors.e3.qa/validation-error',
          title: 'Invalid Purchase Request',
          status: HttpStatus.BAD_REQUEST,
          detail: parse.error.message,
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const mode = this.getPurchaseTrackerMode();
    const result = PurchaseTrackerAdapterEngine.createPurchaseRequest(parse.data, mode);
    if (result.status === 'blocked') {
      throw new HttpException(
        {
          type: 'https://errors.e3.qa/vendor-compliance-blocked',
          title: 'Vendor Compliance Blocked',
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          detail: result.message,
        },
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }

    if (result.pr) {
      globalIntegrationOperationsStore.saveLocalDraft(`pr:${result.pr.prId}`, result.pr);
    }

    return { data: result.pr, message: result.message };
  }

  @Post('purchase-requests/:ref/submissions')
  submitPurchaseRequest(@Param('ref') prId: string, @Body() body: unknown) {
    const parse = PurchaseRequestSubmitSchema.safeParse({
      ...(body as any),
      prId,
    });
    if (!parse.success) {
      throw new HttpException(
        {
          type: 'https://errors.e3.qa/validation-error',
          title: 'Invalid PR Submission',
          status: HttpStatus.BAD_REQUEST,
          detail: parse.error.message,
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const mode = this.getPurchaseTrackerMode();
    const result = PurchaseTrackerAdapterEngine.submitPurchaseRequest(parse.data, mode);
    if (result.status === 'blocked') {
      throw new HttpException(
        {
          type: 'https://errors.e3.qa/connector-disabled',
          title: 'PR Submission Disabled',
          status: HttpStatus.FORBIDDEN,
          detail: result.message,
        },
        HttpStatus.FORBIDDEN
      );
    }

    return { data: result.pr, message: result.message };
  }

  @Get('projects/:projectId/purchase-orders')
  @UseGuards(TenantIsolationGuard)
  listProjectPurchaseOrders(@Param('projectId') projectId: string) {
    return {
      data: {
        projectId,
        orders: [],
        notice: 'Purchase orders are read from PurchaseTracker projections when enabled.',
      },
    };
  }

  @Post('purchase-orders')
  attemptCreatePurchaseOrder() {
    // Invariant Section 10 & 15: Direct PO creation capability is deferred and unverified in this phase!
    throw new HttpException(
      {
        type: 'https://errors.e3.qa/capability-deferred',
        title: 'PO Creation Capability Deferred',
        status: HttpStatus.NOT_IMPLEMENTED,
        detail: 'Direct PO creation through EOS adapter is deferred and unverified. Orders must be processed through PurchaseTracker source workflows.',
        errorCode: 'PO_CREATION_DEFERRED',
      },
      HttpStatus.NOT_IMPLEMENTED
    );
  }

  // --- Movements & Operations ---

  @Post('equipment-movements')
  recordEquipmentMovement(@Body() body: unknown) {
    const parse = EquipmentMovementSchema.safeParse(body);
    if (!parse.success) {
      throw new HttpException(
        {
          type: 'https://errors.e3.qa/validation-error',
          title: 'Invalid Equipment Movement',
          status: HttpStatus.BAD_REQUEST,
          detail: parse.error.message,
        },
        HttpStatus.BAD_REQUEST
      );
    }

    return {
      data: {
        movementId: `mov-${Date.now()}`,
        movementType: parse.data.movementType,
        status: 'recorded',
        recordedAt: new Date().toISOString(),
      },
    };
  }

  @Get('integration-operations/:operationId')
  async getIntegrationOperation(@Param('operationId') operationId: string) {
    const op = (await globalIntegrationOperationsStore.getOperation(operationId)) || RentalsAdapterEngine.getOperation(operationId);
    if (!op) {
      throw new HttpException(
        {
          type: 'https://errors.e3.qa/operation-not-found',
          title: 'Operation Not Found',
          status: HttpStatus.NOT_FOUND,
          detail: `Integration operation ${operationId} not found.`,
        },
        HttpStatus.NOT_FOUND
      );
    }
    return { data: op };
  }

  @Post('integrations/:connectionId/events')
  receiveInboundEvent(@Param('connectionId') connectionId: string, @Body() body: unknown) {
    const parse = InboundIntegrationEventSchema.safeParse({
      ...(body as any),
      connectionId,
    });
    if (!parse.success) {
      throw new HttpException(
        {
          type: 'https://errors.e3.qa/validation-error',
          title: 'Invalid Inbound Event',
          status: HttpStatus.BAD_REQUEST,
          detail: parse.error.message,
        },
        HttpStatus.BAD_REQUEST
      );
    }

    return {
      status: 'accepted',
      eventId: parse.data.eventId,
      processedAt: new Date().toISOString(),
    };
  }

  @Get('settings/integrations/:connectionId/capabilities')
  getConnectionCapabilities(@Param('connectionId') connectionId: string) {
    const conn = activeConfigurationStore.connections.find((c) => c.id === connectionId || c.provider === connectionId);
    if (!conn) {
      throw new HttpException(
        {
          type: 'https://errors.e3.qa/connection-not-found',
          title: 'Connection Not Found',
          status: HttpStatus.NOT_FOUND,
          detail: `Connection ${connectionId} not registered in Central Settings.`,
        },
        HttpStatus.NOT_FOUND
      );
    }

    return {
      data: {
        connectionId: conn.id,
        provider: conn.provider,
        mode: (conn as any).mode || 'disabled',
        health: conn.health,
        capabilities: (conn as any).capabilities || [],
        approvedEndpoint: conn.approvedEndpoint,
        lastTestedAt: conn.lastTestedAt,
      },
    };
  }

  // --- Portfolio Capacity Planning Endpoints ---

  @Get('capacity/registration-counters-scenario')
  getRegistrationCounterScenario() {
    return {
      data: PortfolioCapacityEngine.evaluateRegistrationCounterScenario({
        total: 20,
        zoneA: 12,
        zoneB: 8,
      }, 4, 12),
    };
  }

  @Post('capacity/evaluate')
  evaluateCapacity(@Body() body: any) {
    return {
      data: PortfolioCapacityEngine.evaluateCapacity(body),
    };
  }
}
