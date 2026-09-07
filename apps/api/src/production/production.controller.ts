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
  ProductionOrderCreateSchema,
  ProductionCheckpointSchema,
  CommandResult,
} from '@e3-eos/contracts';
import {
  InventoryReservationEngine,
  ProductionOrder,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { IdempotencyGuard } from '../common/idempotency.guard.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { projectRepository } from '../projects/projects.controller.js';

export interface StoredProductionOrder extends ProductionOrder {
  organisationId: string;
}

export interface StoredProductionCheckpoint {
  id: string;
  orderId: string;
  organisationId: string;
  checkpointName: string;
  passed: boolean;
  notes?: string;
  inspectorId: string;
  recordedAt: Date;
}

export const productionOrderRepository = new Map<string, StoredProductionOrder>();
export const productionCheckpointRepository = new Map<string, StoredProductionCheckpoint>();

@Controller('projects/:projectId/production-orders')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class ProductionController {
  @Post()
  @UseGuards(IdempotencyGuard)
  createProductionOrder(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredProductionOrder> {
    const parseResult = ProductionOrderCreateSchema.safeParse(body);
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

    const orderId = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const order: StoredProductionOrder = {
      id: orderId,
      organisationId: orgId,
      projectId,
      designId: parseResult.data.designId,
      designVersionNumber: parseResult.data.designVersionNumber,
      title: parseResult.data.title,
      orderedUnits: parseResult.data.orderedUnits,
      completedUnits: 0,
      status: 'in_progress',
      builtItemsActualVersion: parseResult.data.designVersionNumber,
    };

    productionOrderRepository.set(orderId, order);

    return {
      data: {
        id: orderId,
        status: order.status,
        recordVersion: 1,
        payload: order,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-prod',
      },
    };
  }

  @Post(':id/notify-revision')
  notifyDrawingRevision(
    @Param('projectId') projectId: string,
    @Param('id') orderId: string,
    @Body() body: { designId: string; newVersionNumber: number },
    @Req() req: Request
  ): CommandResult<StoredProductionOrder> {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const order = productionOrderRepository.get(orderId);
    if (!order || order.organisationId !== orgId || order.projectId !== projectId) {
      throw new HttpException({ message: 'PRODUCTION_ORDER_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // Invariant AT-048: Revision flags in-progress orders, preserves completed units
    const updatedList = InventoryReservationEngine.handleDrawingRevisionOnProduction(
      [order],
      body.designId,
      body.newVersionNumber
    );

    const updated = { ...updatedList[0], organisationId: orgId };
    productionOrderRepository.set(orderId, updated);

    return {
      data: {
        id: orderId,
        status: updated.status,
        recordVersion: 2,
        payload: updated,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-notify-rev',
      },
    };
  }

  @Post(':id/checkpoints')
  recordCheckpoint(
    @Param('projectId') projectId: string,
    @Param('id') orderId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredProductionCheckpoint> {
    const parseResult = ProductionCheckpointSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const order = productionOrderRepository.get(orderId);
    if (!order || order.organisationId !== orgId || order.projectId !== projectId) {
      throw new HttpException({ message: 'PRODUCTION_ORDER_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const chkId = `chk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const checkpoint: StoredProductionCheckpoint = {
      id: chkId,
      orderId,
      organisationId: orgId,
      checkpointName: parseResult.data.checkpointName,
      passed: parseResult.data.passed,
      notes: parseResult.data.notes,
      inspectorId: parseResult.data.inspectorId,
      recordedAt: new Date(),
    };

    productionCheckpointRepository.set(chkId, checkpoint);

    return {
      data: {
        id: chkId,
        status: checkpoint.passed ? 'passed' : 'failed',
        recordVersion: 1,
        payload: checkpoint,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-chk',
      },
    };
  }
}
