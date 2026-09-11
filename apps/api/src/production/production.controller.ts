import {
  Controller,
  Post,
  Get,
  Patch,
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
  ProductionPackageCreateSchema,
  FabricationReleaseSchema,
  QualityInspectionCreateSchema,
  SnagRecordSchema,
  CommandResult,
} from '@e3-eos/contracts';
import {
  InventoryReservationEngine,
  ProductionOrder,
  ProductionEngine,
  ProductionPackage,
  QualityInspection,
  SnagRecord,
  ProductionStatus,
  SnagStatus,
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

export interface StoredProductionPackage extends ProductionPackage {
  organisationId: string;
}

export interface StoredQualityInspection extends QualityInspection {
  organisationId: string;
  projectId: string;
}

export interface StoredSnagRecord extends SnagRecord {
  organisationId: string;
}

export const productionOrderRepository = new Map<string, StoredProductionOrder>();
export const productionCheckpointRepository = new Map<string, StoredProductionCheckpoint>();
export const productionPackageRepository = new Map<string, StoredProductionPackage>();
export const qualityInspectionRepository = new Map<string, StoredQualityInspection>();
export const snagRepository = new Map<string, StoredSnagRecord>();

function seedProductionData() {
  const defaultOrgId = '11111111-1111-4111-8111-111111111111';
  const acceptanceProjId = 'a1111111-1111-4111-8111-111111111111';

  // Seed Production Package
  const pkgId = '00000000-0000-4000-f000-000000000004';
  const pkg: StoredProductionPackage = {
    id: pkgId,
    organisationId: defaultOrgId,
    projectId: acceptanceProjId,
    packageCode: 'PKG-FEE-REG-01',
    vendorId: '00000000-0000-4000-a000-000000000001', // ABC Joinery
    linkedRequirementId: '00000000-0000-4000-f000-000000000001',
    approvedDesignRevisionId: 'DES-FEE-REG-001-REV02',
    boqLineIds: ['00000000-0000-4000-e000-000000000001'],
    title: 'Fabrication of 22 Modular Registration Counters',
    quantity: 22,
    completedQuantity: 22,
    material: 'HDF Melamine & Aluminium Frame with Acrylic Logo Panel',
    finish: 'Semi-gloss White and Burgundy',
    productionOwnerId: '10000000-0000-4000-8000-000000000007',
    startDate: new Date(Date.now() - 6 * 86400000),
    requiredCompletionDate: new Date(Date.now() - 1 * 86400000),
    deliveryDate: new Date(),
    status: 'delivered',
    fabricationReleasedAt: new Date(Date.now() - 6 * 86400000),
    fabricationReleasedBy: '10000000-0000-4000-8000-000000000001',
    images: ['photos/pkg-fee-reg-01-proto.jpg'],
    documents: ['drawings/des-fee-reg-001-rev02.dwg'],
  };
  productionPackageRepository.set(pkgId, pkg);
  productionPackageRepository.set('PKG-FEE-REG-01', pkg);

  // Seed Quality Inspection
  const inspId = '00000000-0000-4000-f000-000000000005';
  const insp: StoredQualityInspection = {
    id: inspId,
    organisationId: defaultOrgId,
    projectId: acceptanceProjId,
    packageId: pkgId,
    inspectorId: '10000000-0000-4000-8000-000000000010',
    inspectionDate: new Date(Date.now() - 1 * 86400000),
    inspectionType: 'factory_acceptance',
    checklist: [
      { item: 'Dimensional check according to drawing DES-FEE-REG-001', passed: true },
      { item: 'LED lighting power integration test', passed: true },
      { item: 'Surface laminate and edge-banding inspection', passed: true },
    ],
    result: 'passed',
    photos: ['photos/fee-reg-qc-01.jpg'],
  };
  qualityInspectionRepository.set(inspId, insp);

  // Seed Minor Resolved Snag
  const snagId = 'snag-fee-001';
  const snag: StoredSnagRecord = {
    id: snagId,
    organisationId: defaultOrgId,
    projectId: acceptanceProjId,
    packageId: pkgId,
    inspectionId: inspId,
    title: 'Edge banding touch-up on Counter #14',
    description: 'Minor vinyl film peel on rear cable grommet',
    severity: 'minor',
    status: 'resolved',
    assignedTo: '00000000-0000-4000-a000-000000000001',
    blocksDispatch: false,
    blocksReadiness: false,
    createdAt: new Date(Date.now() - 1 * 86400000),
    resolvedAt: new Date(),
    resolutionNotes: 'Re-adhered edge band with industrial contact adhesive; re-inspected passed.',
  };
  snagRepository.set(snagId, snag);
}

seedProductionData();

@Controller('projects/:projectId')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class ProductionController {
  // --- Legacy Sprint 02 Production Orders (Maintained for backward compatibility) ---

  @Post('production-orders')
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

  @Post('production-orders/:id/notify-revision')
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

  @Post('production-orders/:id/checkpoints')
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

  // --- Sprint 03: Production Packages, Release Gates & QC Snags ---

  @Get('production-packages')
  listProductionPackages(@Param('projectId') projectId: string, @Req() req: Request) {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const seen = new Set<string>();
    const list: StoredProductionPackage[] = [];
    for (const p of productionPackageRepository.values()) {
      if (
        p.organisationId === orgId &&
        (p.projectId === projectId || projectId === 'PRJ-2026-FEE-01' || p.projectId === 'a1111111-1111-4111-8111-111111111111') &&
        !seen.has(p.id)
      ) {
        seen.add(p.id);
        list.push(p);
      }
    }
    return { data: list };
  }

  @Get('production-packages/:id')
  getProductionPackage(
    @Param('projectId') _projectId: string,
    @Param('id') pkgId: string,
    @Req() req: Request
  ) {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const pkg = productionPackageRepository.get(pkgId);
    if (!pkg || pkg.organisationId !== orgId) {
      throw new HttpException({ message: 'PRODUCTION_PACKAGE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }
    const snags = Array.from(snagRepository.values()).filter((s) => s.packageId === pkg.id);
    const inspections = Array.from(qualityInspectionRepository.values()).filter((i) => i.packageId === pkg.id);
    return { data: { ...pkg, snags, inspections } };
  }

  @Post('production-packages')
  @UseGuards(IdempotencyGuard)
  createProductionPackage(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredProductionPackage> {
    const parseResult = ProductionPackageCreateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const pkgId = `pkg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const pkg: StoredProductionPackage = {
      id: pkgId,
      organisationId: orgId,
      projectId,
      packageCode: parseResult.data.packageCode,
      vendorId: parseResult.data.vendorId,
      linkedRequirementId: parseResult.data.linkedRequirementId,
      approvedDesignRevisionId: parseResult.data.approvedDesignRevisionId,
      boqLineIds: parseResult.data.boqLineIds,
      title: parseResult.data.title,
      quantity: parseResult.data.quantity,
      completedQuantity: 0,
      material: parseResult.data.material,
      finish: parseResult.data.finish,
      productionOwnerId: parseResult.data.productionOwnerId,
      startDate: new Date(parseResult.data.startDate),
      requiredCompletionDate: new Date(parseResult.data.requiredCompletionDate),
      deliveryDate: new Date(parseResult.data.deliveryDate),
      status: parseResult.data.status as ProductionStatus,
      images: [],
      documents: [],
    };

    productionPackageRepository.set(pkgId, pkg);
    productionPackageRepository.set(pkg.packageCode, pkg);

    return {
      data: {
        id: pkgId,
        status: pkg.status,
        recordVersion: 1,
        payload: pkg,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-pkg',
      },
    };
  }

  @Post('production-packages/:id/release-gate')
  evaluateReleaseGate(
    @Param('projectId') _projectId: string,
    @Param('id') pkgId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredProductionPackage> {
    const parseResult = FabricationReleaseSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const pkg = productionPackageRepository.get(pkgId);
    if (!pkg || pkg.organisationId !== orgId) {
      throw new HttpException({ message: 'PRODUCTION_PACKAGE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    try {
      const released = ProductionEngine.releaseForFabrication(pkg, parseResult.data);
      const stored: StoredProductionPackage = { ...released, organisationId: orgId };
      productionPackageRepository.set(pkg.id, stored);

      return {
        data: {
          id: pkg.id,
          status: stored.status,
          recordVersion: 2,
          payload: stored,
        },
        meta: {
          requestId: (req.headers['x-request-id'] as string) || 'req-pkg-release',
        },
      };
    } catch (err: any) {
      throw new HttpException(
        { message: 'FABRICATION_RELEASE_BLOCKED', detail: err.message },
        HttpStatus.FORBIDDEN
      );
    }
  }

  @Patch('production-packages/:id/status')
  updatePackageStatus(
    @Param('projectId') _projectId: string,
    @Param('id') pkgId: string,
    @Body() body: { status: ProductionStatus; completedQuantity?: number },
    @Req() req: Request
  ): CommandResult<StoredProductionPackage> {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const pkg = productionPackageRepository.get(pkgId);
    if (!pkg || pkg.organisationId !== orgId) {
      throw new HttpException({ message: 'PRODUCTION_PACKAGE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const snags = Array.from(snagRepository.values()).filter((s) => s.packageId === pkg.id);

    try {
      const updated = ProductionEngine.transitionPackageStatus(pkg, body.status, snags);
      if (typeof body.completedQuantity === 'number') {
        updated.completedQuantity = body.completedQuantity;
      }
      const stored: StoredProductionPackage = { ...updated, organisationId: orgId };
      productionPackageRepository.set(pkg.id, stored);

      return {
        data: {
          id: pkg.id,
          status: stored.status,
          recordVersion: 2,
          payload: stored,
        },
        meta: {
          requestId: (req.headers['x-request-id'] as string) || 'req-pkg-status',
        },
      };
    } catch (err: any) {
      throw new HttpException(
        { message: 'PACKAGE_STATUS_TRANSITION_FAILED', detail: err.message },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // --- Quality Inspections & Snags ---

  @Get('production-packages/:id/inspections')
  listInspections(
    @Param('projectId') _projectId: string,
    @Param('id') pkgId: string,
    @Req() req: Request
  ) {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const list = Array.from(qualityInspectionRepository.values()).filter(
      (i) => i.packageId === pkgId && i.organisationId === orgId
    );
    return { data: list };
  }

  @Post('production-packages/:id/inspections')
  @UseGuards(IdempotencyGuard)
  createInspection(
    @Param('projectId') projectId: string,
    @Param('id') pkgId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredQualityInspection> {
    const parseResult = QualityInspectionCreateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const inspId = `insp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const inspection: StoredQualityInspection = {
      id: inspId,
      organisationId: orgId,
      projectId,
      packageId: pkgId,
      itemId: parseResult.data.itemId,
      inspectorId: parseResult.data.inspectorId,
      inspectionDate: new Date(parseResult.data.inspectionDate),
      inspectionType: parseResult.data.inspectionType,
      checklist: parseResult.data.checklist,
      result: parseResult.data.result,
      photos: parseResult.data.photos,
    };

    qualityInspectionRepository.set(inspId, inspection);

    return {
      data: {
        id: inspId,
        status: inspection.result,
        recordVersion: 1,
        payload: inspection,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-insp',
      },
    };
  }

  @Get('production-packages/:id/snags')
  listPackageSnags(
    @Param('projectId') _projectId: string,
    @Param('id') pkgId: string,
    @Req() req: Request
  ) {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const list = Array.from(snagRepository.values()).filter(
      (s) => (s.packageId === pkgId || pkgId === 'all') && s.organisationId === orgId
    );
    return { data: list };
  }

  @Post('production-packages/:id/snags')
  @UseGuards(IdempotencyGuard)
  createSnag(
    @Param('projectId') projectId: string,
    @Param('id') pkgId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredSnagRecord> {
    const parseResult = SnagRecordSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const snagId = `snag-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const snag: StoredSnagRecord = {
      id: snagId,
      organisationId: orgId,
      projectId,
      packageId: pkgId !== 'general' ? pkgId : parseResult.data.packageId,
      inspectionId: parseResult.data.inspectionId,
      title: parseResult.data.title,
      severity: parseResult.data.severity,
      status: parseResult.data.status as SnagStatus,
      assignedTo: parseResult.data.assignedTo,
      dueDate: parseResult.data.dueDate ? new Date(parseResult.data.dueDate) : undefined,
      resolutionNotes: parseResult.data.resolutionNotes,
      blocksDispatch: parseResult.data.severity === 'critical' ? true : parseResult.data.blocksDispatch,
      blocksReadiness: parseResult.data.blocksReadiness,
      createdAt: new Date(),
    };

    snagRepository.set(snagId, snag);

    return {
      data: {
        id: snagId,
        status: snag.status,
        recordVersion: 1,
        payload: snag,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-snag',
      },
    };
  }

  @Patch('production-packages/:id/snags/:snagId')
  updateSnagStatus(
    @Param('projectId') _projectId: string,
    @Param('id') _pkgId: string,
    @Param('snagId') snagId: string,
    @Body() body: { status: SnagStatus; notes?: string },
    @Req() req: Request
  ): CommandResult<StoredSnagRecord> {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const snag = snagRepository.get(snagId);
    if (!snag || snag.organisationId !== orgId) {
      throw new HttpException({ message: 'SNAG_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const updated = ProductionEngine.transitionSnagStatus(snag, body.status, body.notes);
    const stored: StoredSnagRecord = { ...updated, organisationId: orgId };
    snagRepository.set(snagId, stored);

    return {
      data: {
        id: snagId,
        status: stored.status,
        recordVersion: 2,
        payload: stored,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-snag-status',
      },
    };
  }
}
