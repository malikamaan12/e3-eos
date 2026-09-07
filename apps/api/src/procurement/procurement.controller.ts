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
  VendorCreateSchema,
  VendorBankChangeSchema,
  FrameworkContractCreateSchema,
  PurchaseOrderCreateSchema,
  PurchaseOrderReleaseSchema,
  POReceiptSchema,
  CommandResult,
} from '@e3-eos/contracts';
import {
  ProcurementEngine,
  Vendor,
  BankChangeRequest,
  FrameworkContract,
  PurchaseOrder,
  POLine,
  Money,
  CurrencyCode,
  Decimal,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { IdempotencyGuard } from '../common/idempotency.guard.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { projectRepository } from '../projects/projects.controller.js';

export interface StoredVendor extends Vendor {
  organisationId: string;
}

export interface StoredBankChangeRequest extends BankChangeRequest {
  organisationId: string;
}

export interface StoredFrameworkContract extends FrameworkContract {
  organisationId: string;
}

export interface StoredPurchaseOrder extends PurchaseOrder {
  organisationId: string;
  projectId: string;
}

export const vendorRepository = new Map<string, StoredVendor>();
export const bankChangeRepository = new Map<string, StoredBankChangeRequest>();
export const frameworkContractRepository = new Map<string, StoredFrameworkContract>();
export const poRepository = new Map<string, StoredPurchaseOrder>();

@Controller()
@UseFilters(ProblemDetailsFilter)
export class ProcurementController {
  // --- Vendor Endpoints ---

  @Post('vendors')
  @UseGuards(TenantIsolationGuard, IdempotencyGuard)
  createVendor(@Body() body: unknown, @Req() req: Request): CommandResult<StoredVendor> {
    const parseResult = VendorCreateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const vendorId = `ven-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const vendor: StoredVendor = {
      id: vendorId,
      organisationId: orgId,
      vendorCode: parseResult.data.vendorCode,
      name: parseResult.data.name,
      category: parseResult.data.category,
      status: 'active',
      bankDetails: parseResult.data.bankDetails,
      complianceVerified: parseResult.data.complianceVerified,
      soleSourceAuthorised: parseResult.data.soleSourceAuthorised,
      freelanceGracePeriodUntil: parseResult.data.freelanceGracePeriodUntil
        ? new Date(parseResult.data.freelanceGracePeriodUntil)
        : undefined,
    };

    vendorRepository.set(vendorId, vendor);

    return {
      data: {
        id: vendorId,
        status: vendor.status,
        recordVersion: 1,
        payload: vendor,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-ven',
      },
    };
  }

  @Post('vendors/:id/bank-changes')
  @UseGuards(TenantIsolationGuard)
  requestBankChange(
    @Param('id') vendorId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredBankChangeRequest> {
    const parseResult = VendorBankChangeSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const vendor = vendorRepository.get(vendorId);
    if (!vendor || vendor.organisationId !== orgId) {
      throw new HttpException({ message: 'VENDOR_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const requesterId = (req as any).userId || (req.headers['x-user-id'] as string) || 'usr-requester';
    const request = ProcurementEngine.requestBankDetailsChange(
      vendor,
      parseResult.data.proposedBankDetails,
      requesterId
    );

    const storedRequest: StoredBankChangeRequest = {
      ...request,
      organisationId: orgId,
    };

    bankChangeRepository.set(request.requestId, storedRequest);

    return {
      data: {
        id: request.requestId,
        status: request.status,
        recordVersion: 1,
        payload: storedRequest,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-bcr',
      },
    };
  }

  @Post('vendors/:id/bank-changes/:reqId/verify')
  @UseGuards(TenantIsolationGuard)
  verifyBankChange(
    @Param('id') vendorId: string,
    @Param('reqId') requestId: string,
    @Req() req: Request
  ): CommandResult<StoredVendor> {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const vendor = vendorRepository.get(vendorId);
    if (!vendor || vendor.organisationId !== orgId) {
      throw new HttpException({ message: 'VENDOR_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const changeRequest = bankChangeRepository.get(requestId);
    if (!changeRequest || changeRequest.organisationId !== orgId || changeRequest.vendorId !== vendorId) {
      throw new HttpException({ message: 'BANK_CHANGE_REQUEST_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const verifierId = (req as any).userId || (req.headers['x-user-id'] as string) || 'usr-verifier';

    try {
      // Invariant AT-046: Protected bank changes; independent verification (two-person rule)
      const { updatedVendor, updatedRequest } = ProcurementEngine.verifyBankChange(
        vendor,
        changeRequest,
        verifierId
      );

      const storedUpdatedVendor: StoredVendor = { ...updatedVendor, organisationId: orgId };
      const storedUpdatedRequest: StoredBankChangeRequest = { ...updatedRequest, organisationId: orgId };

      vendorRepository.set(vendorId, storedUpdatedVendor);
      bankChangeRepository.set(requestId, storedUpdatedRequest);

      return {
        data: {
          id: vendorId,
          status: 'verified',
          recordVersion: 2,
          payload: storedUpdatedVendor,
        },
        meta: {
          requestId: (req.headers['x-request-id'] as string) || 'req-bcr-verify',
        },
      };
    } catch (err: any) {
      throw new HttpException(
        { message: 'BANK_CHANGE_VERIFICATION_FAILED', detail: err.message },
        HttpStatus.FORBIDDEN
      );
    }
  }

  // --- Framework Contracts ---

  @Post('framework-contracts')
  @UseGuards(TenantIsolationGuard)
  createFrameworkContract(@Body() body: unknown, @Req() req: Request): CommandResult<StoredFrameworkContract> {
    const parseResult = FrameworkContractCreateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const fcId = `fc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const contract: StoredFrameworkContract = {
      id: fcId,
      organisationId: orgId,
      vendorId: parseResult.data.vendorId,
      contractCode: parseResult.data.contractCode,
      currency: parseResult.data.currency as CurrencyCode,
      ceilingAmount: new Money(parseResult.data.ceilingAmount, parseResult.data.currency as CurrencyCode),
      consumedAmount: Money.zero(parseResult.data.currency as CurrencyCode),
      validUntil: new Date(parseResult.data.validUntil),
    };

    frameworkContractRepository.set(fcId, contract);

    return {
      data: {
        id: fcId,
        status: 'active',
        recordVersion: 1,
        payload: contract,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-fc',
      },
    };
  }

  // --- Purchase Orders ---

  @Post('projects/:projectId/purchase-orders')
  @UseGuards(TenantIsolationGuard, IdempotencyGuard)
  createPurchaseOrder(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredPurchaseOrder> {
    const parseResult = PurchaseOrderCreateSchema.safeParse(body);
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

    const vendor = vendorRepository.get(parseResult.data.vendorId);
    if (!vendor || vendor.organisationId !== orgId) {
      throw new HttpException({ message: 'VENDOR_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // Invariant AT-047: Validate sole-source rationale / freelance route
    try {
      ProcurementEngine.validateSupplierRoute(vendor, {
        isSoleSource: parseResult.data.isSoleSource,
        soleSourceRationale: parseResult.data.soleSourceRationale,
      });
    } catch (err: any) {
      throw new HttpException(
        { message: 'SUPPLIER_ROUTE_INVALID', detail: err.message },
        HttpStatus.BAD_REQUEST
      );
    }

    const currency = parseResult.data.currency as CurrencyCode;
    const totalAmount = new Money(parseResult.data.totalAmount, currency);

    // Invariant AT-044: If this PO is a call-off against a framework contract, check and consume ceiling atomically
    if (parseResult.data.frameworkContractId) {
      const contract = frameworkContractRepository.get(parseResult.data.frameworkContractId);
      if (!contract || contract.organisationId !== orgId) {
        throw new HttpException({ message: 'FRAMEWORK_CONTRACT_NOT_FOUND' }, HttpStatus.NOT_FOUND);
      }

      try {
        const { updatedContract } = ProcurementEngine.consumeFrameworkCeiling(contract, totalAmount);
        frameworkContractRepository.set(contract.id, {
          ...updatedContract,
          organisationId: orgId,
        });
      } catch (err: any) {
        throw new HttpException(
          { message: 'FRAMEWORK_CEILING_EXCEEDED', detail: err.message },
          HttpStatus.CONFLICT
        );
      }
    }

    const poId = `po-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const poLines: POLine[] = parseResult.data.lines.map((l, index) => {
      const qty = new Decimal(l.quantity);
      const unit = new Money(l.unitCost, currency);
      return {
        id: `poline-${poId}-${index + 1}`,
        poId,
        packageId: l.packageId,
        description: l.description,
        quantity: qty,
        unitCost: unit,
        totalCost: unit.times(qty),
        receivedQuantity: new Decimal(0),
        rejectedQuantity: new Decimal(0),
      };
    });

    const po: StoredPurchaseOrder = {
      id: poId,
      organisationId: orgId,
      projectId,
      poNumber: parseResult.data.poNumber,
      vendorId: parseResult.data.vendorId,
      frameworkContractId: parseResult.data.frameworkContractId,
      currency,
      totalAmount,
      status: 'approved', // Created as approved, ready for release
      lines: poLines,
      externalDeliveryStatus: 'not_sent',
      isSoleSource: parseResult.data.isSoleSource,
      soleSourceRationale: parseResult.data.soleSourceRationale,
    };

    poRepository.set(poId, po);

    return {
      data: {
        id: poId,
        status: po.status,
        recordVersion: 1,
        payload: po,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-po',
      },
    };
  }

  @Post('projects/:projectId/purchase-orders/:poId/release')
  releasePurchaseOrder(
    @Param('projectId') projectId: string,
    @Param('poId') poId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredPurchaseOrder> {
    const parseResult = PurchaseOrderReleaseSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const po = poRepository.get(poId);
    if (!po || po.organisationId !== orgId || po.projectId !== projectId) {
      throw new HttpException({ message: 'PO_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    try {
      // Invariant AT-043: Idempotent commitment release
      const { po: releasedPO, isDuplicateRelease } = ProcurementEngine.releasePurchaseOrder(
        po,
        parseResult.data.idempotencyKey
      );

      const storedPO: StoredPurchaseOrder = { ...releasedPO, organisationId: orgId, projectId };
      poRepository.set(poId, storedPO);

      return {
        data: {
          id: poId,
          status: storedPO.status,
          recordVersion: isDuplicateRelease ? 1 : 2,
          externalDeliveryStatus: storedPO.externalDeliveryStatus as any,
          payload: storedPO,
        },
        meta: {
          requestId: (req.headers['x-request-id'] as string) || 'req-po-release',
        },
      };
    } catch (err: any) {
      throw new HttpException(
        { message: 'PO_RELEASE_FAILED', detail: err.message },
        HttpStatus.CONFLICT
      );
    }
  }

  @Post('projects/:projectId/purchase-orders/:poId/receipts')
  @UseGuards(TenantIsolationGuard)
  recordReceipt(
    @Param('projectId') projectId: string,
    @Param('poId') poId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredPurchaseOrder> {
    const parseResult = POReceiptSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const po = poRepository.get(poId);
    if (!po || po.organisationId !== orgId || po.projectId !== projectId) {
      throw new HttpException({ message: 'PO_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    try {
      // Invariant AT-053: Process partial receipt and damage rejection
      for (const item of parseResult.data.items) {
        const line = po.lines.find((l) => l.id === item.lineId);
        if (!line) {
          throw new Error(`Line ${item.lineId} not found on PO.`);
        }

        const { updatedLine } = ProcurementEngine.receivePOLine(
          line,
          item.receivedQuantity,
          item.rejectedQuantity
        );

        // Replace line
        const index = po.lines.findIndex((l) => l.id === item.lineId);
        po.lines[index] = updatedLine;
      }

      // Check if all lines are fully processed
      const allDone = po.lines.every((l) =>
        l.receivedQuantity.plus(l.rejectedQuantity).eq(l.quantity)
      );

      po.status = allDone ? 'fully_received' : 'partially_received';
      poRepository.set(poId, po);

      return {
        data: {
          id: poId,
          status: po.status,
          recordVersion: 3,
          payload: po,
        },
        meta: {
          requestId: (req.headers['x-request-id'] as string) || 'req-receipt',
        },
      };
    } catch (err: any) {
      throw new HttpException(
        { message: 'RECEIPT_FAILED', detail: err.message },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post('projects/:projectId/purchase-orders/:poId/timeout')
  simulateTimeout(
    @Param('projectId') projectId: string,
    @Param('poId') poId: string,
    @Req() req: Request
  ): CommandResult<StoredPurchaseOrder> {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const po = poRepository.get(poId);
    if (!po || po.organisationId !== orgId || po.projectId !== projectId) {
      throw new HttpException({ message: 'PO_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // Invariant AT-045: Ambiguous remote timeout marks status reconciliation_needed
    const timedOut = ProcurementEngine.handleRemoteSupplierTimeout(po);
    const stored: StoredPurchaseOrder = { ...timedOut, organisationId: orgId, projectId };
    poRepository.set(poId, stored);

    return {
      data: {
        id: poId,
        status: stored.status,
        recordVersion: 2,
        payload: stored,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-timeout',
      },
    };
  }

  @Post('projects/:projectId/purchase-orders/:poId/reconcile')
  reconcileRemoteOrder(
    @Param('projectId') projectId: string,
    @Param('poId') poId: string,
    @Body() body: { externalConfirmationStatus: 'confirmed_externally' | 'not_received_externally' },
    @Req() req: Request
  ): CommandResult<StoredPurchaseOrder> {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const po = poRepository.get(poId);
    if (!po || po.organisationId !== orgId || po.projectId !== projectId) {
      throw new HttpException({ message: 'PO_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // Invariant AT-045: Reconcile before resend
    const reconciled = ProcurementEngine.reconcileRemoteOrder(
      po,
      body.externalConfirmationStatus
    );
    const stored: StoredPurchaseOrder = { ...reconciled, organisationId: orgId, projectId };
    poRepository.set(poId, stored);

    return {
      data: {
        id: poId,
        status: stored.status,
        recordVersion: 3,
        payload: stored,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-reconcile',
      },
    };
  }
}
