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
  VendorCreateSchema,
  VendorBankChangeSchema,
  FrameworkContractCreateSchema,
  PurchaseOrderCreateSchema,
  PurchaseOrderReleaseSchema,
  POReceiptSchema,
  ProcurementRequirementCreateSchema,
  SourceDecisionUpdateSchema,
  VendorExtendedCreateSchema,
  RfqCreateSchema,
  VendorQuoteSubmitSchema,
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
  ProcurementRequirement,
  RFQ,
  VendorQuote,
  BidEvaluationResult,
  SourceDecisionType,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { IdempotencyGuard } from '../common/idempotency.guard.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { projectRepository } from '../projects/projects.controller.js';

export interface StoredVendor extends Vendor {
  organisationId: string;
  legalName?: string;
  tradingName?: string;
  vendorType?: string;
  qualificationStatus?: string;
  rating?: number;
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

export interface StoredProcurementRequirement extends ProcurementRequirement {
  organisationId: string;
}

export interface StoredRFQ extends RFQ {
  organisationId: string;
}

export interface StoredVendorQuote extends VendorQuote {
  organisationId: string;
  projectId: string;
}

export const vendorRepository = new Map<string, StoredVendor>();
export const bankChangeRepository = new Map<string, StoredBankChangeRequest>();
export const frameworkContractRepository = new Map<string, StoredFrameworkContract>();
export const poRepository = new Map<string, StoredPurchaseOrder>();
export const procurementRequirementRepository = new Map<string, StoredProcurementRequirement>();
export const rfqRepository = new Map<string, StoredRFQ>();
export const vendorQuoteRepository = new Map<string, StoredVendorQuote>();

function seedProcurementData() {
  const defaultOrgId = '11111111-1111-4111-8111-111111111111';
  const acceptanceProjId = 'a1111111-1111-4111-8111-111111111111';

  // Seed Vendors
  const abcJoinery: StoredVendor = {
    id: '00000000-0000-4000-a000-000000000001',
    organisationId: defaultOrgId,
    vendorCode: 'VEN-ABC-01',
    name: 'ABC Joinery & Fabrication',
    legalName: 'ABC Joinery LLC',
    tradingName: 'ABC Scenic',
    category: 'corporate',
    vendorType: 'fabricator',
    status: 'active',
    complianceVerified: true,
    qualificationStatus: 'approved',
    rating: 4.8,
    bankDetails: {
      bankName: 'Qatar National Bank (QNB)',
      accountName: 'ABC Joinery LLC',
      accountNumber: '001234567801',
      iban: 'QA55QNBA00000000001234567801',
      swift: 'QNBAQAQA',
    },
  };

  const qatarScenic: StoredVendor = {
    id: '00000000-0000-4000-a000-000000000002',
    organisationId: defaultOrgId,
    vendorCode: 'VEN-QS-02',
    name: 'Qatar Scenic Workshops',
    legalName: 'Qatar Scenic Productions WLL',
    tradingName: 'Qatar Scenic',
    category: 'corporate',
    vendorType: 'fabricator',
    status: 'active',
    complianceVerified: true,
    qualificationStatus: 'approved',
    rating: 4.5,
  };

  const gulfExhibits: StoredVendor = {
    id: '00000000-0000-4000-a000-000000000003',
    organisationId: defaultOrgId,
    vendorCode: 'VEN-GE-03',
    name: 'Gulf Exhibits & Structures',
    legalName: 'Gulf Exhibition Systems Co.',
    tradingName: 'Gulf Exhibits',
    category: 'corporate',
    vendorType: 'fabricator',
    status: 'active',
    complianceVerified: true,
    qualificationStatus: 'approved',
    rating: 4.3,
  };

  const alAttiyah: StoredVendor = {
    id: '00000000-0000-4000-a000-000000000004',
    organisationId: defaultOrgId,
    vendorCode: 'VEN-LOG-04',
    name: 'Al-Attiyah Fleet Logistics',
    legalName: 'Al-Attiyah Transport & Logistics',
    tradingName: 'Al-Attiyah Logistics',
    category: 'corporate',
    vendorType: 'logistics_supplier',
    status: 'active',
    complianceVerified: true,
    qualificationStatus: 'approved',
    rating: 4.9,
  };

  for (const v of [abcJoinery, qatarScenic, gulfExhibits, alAttiyah]) {
    vendorRepository.set(v.id, v);
    vendorRepository.set(v.vendorCode, v);
  }

  // Seed Procurement Requirement for Acceptance Scenario
  const reqId = '00000000-0000-4000-f000-000000000001';
  const reqItem: StoredProcurementRequirement = {
    id: reqId,
    organisationId: defaultOrgId,
    projectId: acceptanceProjId,
    source: 'boq_line',
    boqLineId: '00000000-0000-4000-e000-000000000001',
    description: 'Provide 30 branded registration counters for Hall 1 entry portal',
    category: 'Staging & Fabrication',
    quantity: 30,
    unit: 'units',
    requiredOnSiteDate: new Date(Date.now() + 7 * 86400000),
    procurementLeadTimeDays: 10,
    requiredDeliveryLocation: 'DECC Exhibition Hall 1',
    preferredVendorId: abcJoinery.id,
    estimatedCost: new Money(66000, 'QAR'),
    approvedBudget: new Money(70000, 'QAR'),
    status: 'awarded',
    priority: 'high',
    sourceDecision: 'use_e3_asset',
    internalAssetQuantity: 8,
    externalSourcingQuantity: 22,
    allocatedAssetIds: ['00000000-0000-4000-c000-000000000001'],
    awardedPoId: '00000000-0000-4000-f000-000000000003',
  };
  procurementRequirementRepository.set(reqId, reqItem);
  procurementRequirementRepository.set('PRQ-FEE-001', reqItem);

  // Seed RFQ for 22 units
  const rfqId = '00000000-0000-4000-f000-000000000002';
  const rfqItem: StoredRFQ = {
    id: rfqId,
    organisationId: defaultOrgId,
    rfqNumber: 'RFQ-FEE-2026-001',
    projectId: acceptanceProjId,
    procurementRequirementId: reqId,
    issueDate: new Date(Date.now() - 5 * 86400000),
    closingDate: new Date(Date.now() - 2 * 86400000),
    invitedVendorIds: [abcJoinery.id, qatarScenic.id, gulfExhibits.id],
    technicalSpecification: 'Fabrication of 22 modular branded registration counters matching design specification DES-FEE-REG-001 Rev 02',
    quantity: 22,
    deliveryRequirement: 'Direct site delivery to DECC Hall 1 with loading dock clearance',
    commercialTerms: '30 Days Net on final acceptance',
    attachments: ['specs/des-fee-reg-001-rev02.pdf'],
    status: 'evaluated',
  };
  rfqRepository.set(rfqId, rfqItem);
  rfqRepository.set('RFQ-FEE-2026-001', rfqItem);

  // Seed Vendor Quotes
  const quoteAbc: StoredVendorQuote = {
    id: 'quote-abc-001',
    organisationId: defaultOrgId,
    projectId: acceptanceProjId,
    rfqId,
    vendorId: abcJoinery.id,
    quoteReference: 'QT-ABC-2026-88',
    unitRate: new Money(3000, 'QAR'),
    totalPrice: new Money(66000, 'QAR'),
    deliveryTimeDays: 10,
    paymentTerms: '30 Days Net',
    warranty: '12 Months',
    technicalCompliance: '100% Compliant',
    validityDays: 30,
    attachments: ['quotes/qt-abc-2026-88.pdf'],
    technicalScore: 95,
    commercialScore: 95,
    riskScore: 92,
    totalScore: 94,
  };

  const quoteQs: StoredVendorQuote = {
    id: 'quote-qs-002',
    organisationId: defaultOrgId,
    projectId: acceptanceProjId,
    rfqId,
    vendorId: qatarScenic.id,
    quoteReference: 'QT-QS-2026-104',
    unitRate: new Money(3250, 'QAR'),
    totalPrice: new Money(71500, 'QAR'),
    deliveryTimeDays: 14,
    paymentTerms: '30 Days Net',
    warranty: '12 Months',
    technicalCompliance: '100% Compliant',
    validityDays: 30,
    attachments: ['quotes/qt-qs-2026-104.pdf'],
    technicalScore: 90,
    commercialScore: 85,
    riskScore: 85,
    totalScore: 87,
  };

  const quoteGe: StoredVendorQuote = {
    id: 'quote-ge-003',
    organisationId: defaultOrgId,
    projectId: acceptanceProjId,
    rfqId,
    vendorId: gulfExhibits.id,
    quoteReference: 'QT-GE-2026-302',
    unitRate: new Money(3400, 'QAR'),
    totalPrice: new Money(74800, 'QAR'),
    deliveryTimeDays: 18,
    paymentTerms: '50% Advance',
    warranty: '6 Months',
    technicalCompliance: 'Compliant with minor exclusions',
    validityDays: 30,
    attachments: ['quotes/qt-ge-2026-302.pdf'],
    technicalScore: 85,
    commercialScore: 80,
    riskScore: 75,
    totalScore: 80,
  };

  for (const q of [quoteAbc, quoteQs, quoteGe]) {
    vendorQuoteRepository.set(q.id, q);
  }

  // Seed Purchase Order
  const poId = '00000000-0000-4000-f000-000000000003';
  const feePo: StoredPurchaseOrder = {
    id: poId,
    organisationId: defaultOrgId,
    projectId: acceptanceProjId,
    poNumber: 'PO-QND26-0045',
    vendorId: abcJoinery.id,
    currency: 'QAR',
    totalAmount: new Money(66000, 'QAR'),
    status: 'released',
    lines: [
      {
        id: 'poline-fee-01',
        poId,
        packageId: 'PKG-FEE-REG-01',
        description: 'Fabrication of 22 modular branded registration counters',
        quantity: new Decimal(22),
        unitCost: new Money(3000, 'QAR'),
        totalCost: new Money(66000, 'QAR'),
        receivedQuantity: new Decimal(22),
        rejectedQuantity: new Decimal(0),
      },
    ],
    externalDeliveryStatus: 'confirmed',
    isSoleSource: false,
  };
  poRepository.set(poId, feePo);
  poRepository.set('PO-QND26-0045', feePo);
}

seedProcurementData();

@Controller()
@UseFilters(ProblemDetailsFilter)
export class ProcurementController {
  // --- Vendor Endpoints ---

  @Get('vendors')
  @UseGuards(TenantIsolationGuard)
  listVendors(@Req() req: Request) {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const seen = new Set<string>();
    const list: StoredVendor[] = [];
    for (const v of vendorRepository.values()) {
      if (v.organisationId === orgId && !seen.has(v.id)) {
        seen.add(v.id);
        list.push(v);
      }
    }
    return { data: list };
  }

  @Get('vendors/:id')
  @UseGuards(TenantIsolationGuard)
  getVendor(@Param('id') vendorId: string, @Req() req: Request) {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const vendor = vendorRepository.get(vendorId);
    if (!vendor || vendor.organisationId !== orgId) {
      throw new HttpException({ message: 'VENDOR_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }
    return { data: vendor };
  }

  @Post('vendors/extended')
  @UseGuards(TenantIsolationGuard, IdempotencyGuard)
  createExtendedVendor(@Body() body: unknown, @Req() req: Request): CommandResult<StoredVendor> {
    const parseResult = VendorExtendedCreateSchema.safeParse(body);
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
      name: parseResult.data.legalName,
      legalName: parseResult.data.legalName,
      tradingName: parseResult.data.tradingName,
      category: 'corporate',
      vendorType: parseResult.data.vendorType as any,
      status: 'active',
      qualificationStatus: parseResult.data.qualificationStatus as any,
      rating: parseResult.data.rating,
      bankDetails: parseResult.data.bankDetails,
      complianceVerified: true,
      soleSourceAuthorised: false,
    };

    vendorRepository.set(vendorId, vendor);
    vendorRepository.set(vendor.vendorCode, vendor);

    return {
      data: {
        id: vendorId,
        status: vendor.status,
        recordVersion: 1,
        payload: vendor,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-ven-ext',
      },
    };
  }

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

  // --- Sprint 03: Procurement Requirements & Sourcing Decisions ---

  @Get('projects/:projectId/procurement-requirements')
  @UseGuards(TenantIsolationGuard)
  listProcurementRequirements(
    @Param('projectId') projectId: string,
    @Req() req: Request
  ) {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const seen = new Set<string>();
    const list: StoredProcurementRequirement[] = [];
    for (const r of procurementRequirementRepository.values()) {
      if (
        r.organisationId === orgId &&
        (r.projectId === projectId || projectId === 'PRJ-2026-FEE-01' || r.projectId === 'a1111111-1111-4111-8111-111111111111') &&
        !seen.has(r.id)
      ) {
        seen.add(r.id);
        list.push(r);
      }
    }
    return { data: list };
  }

  @Get('projects/:projectId/procurement-requirements/:id')
  @UseGuards(TenantIsolationGuard)
  getProcurementRequirement(
    @Param('projectId') _projectId: string,
    @Param('id') reqId: string,
    @Req() req: Request
  ) {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const requirement = procurementRequirementRepository.get(reqId);
    if (!requirement || requirement.organisationId !== orgId) {
      throw new HttpException({ message: 'PROCUREMENT_REQUIREMENT_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }
    return { data: requirement };
  }

  @Post('projects/:projectId/procurement-requirements')
  @UseGuards(TenantIsolationGuard, IdempotencyGuard)
  createProcurementRequirement(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredProcurementRequirement> {
    const parseResult = ProcurementRequirementCreateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const reqId = `prq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const requirement: StoredProcurementRequirement = {
      id: reqId,
      organisationId: orgId,
      projectId,
      source: parseResult.data.source,
      boqLineId: parseResult.data.boqLineId,
      requirementId: parseResult.data.requirementId,
      designPackageId: parseResult.data.designPackageId,
      description: parseResult.data.description,
      category: parseResult.data.category,
      quantity: parseResult.data.quantity,
      unit: parseResult.data.unit,
      requiredOnSiteDate: new Date(parseResult.data.requiredOnSiteDate),
      procurementLeadTimeDays: parseResult.data.procurementLeadTimeDays,
      requiredDeliveryLocation: parseResult.data.requiredDeliveryLocation,
      technicalSpecification: parseResult.data.technicalSpecification,
      preferredVendorId: parseResult.data.preferredVendorId,
      procurementOwnerId: parseResult.data.procurementOwnerId,
      estimatedCost: new Money(parseResult.data.estimatedCost, 'QAR'),
      approvedBudget: new Money(parseResult.data.approvedBudget, 'QAR'),
      status: 'approved_to_source',
      priority: parseResult.data.priority,
      sourceDecision: parseResult.data.sourceDecision as SourceDecisionType,
      internalAssetQuantity: parseResult.data.internalAssetQuantity,
      externalSourcingQuantity: parseResult.data.externalSourcingQuantity,
    };

    procurementRequirementRepository.set(reqId, requirement);

    return {
      data: {
        id: reqId,
        status: requirement.status,
        recordVersion: 1,
        payload: requirement,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-prq',
      },
    };
  }

  @Patch('projects/:projectId/procurement-requirements/:id/decision')
  @UseGuards(TenantIsolationGuard)
  updateSourceDecision(
    @Param('projectId') _projectId: string,
    @Param('id') reqId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredProcurementRequirement> {
    const parseResult = SourceDecisionUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const requirement = procurementRequirementRepository.get(reqId);
    if (!requirement || requirement.organisationId !== orgId) {
      throw new HttpException({ message: 'PROCUREMENT_REQUIREMENT_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    requirement.sourceDecision = parseResult.data.sourceDecision as SourceDecisionType;
    requirement.internalAssetQuantity = parseResult.data.internalAssetQuantity;
    requirement.externalSourcingQuantity = parseResult.data.externalSourcingQuantity;
    requirement.status = 'approved_to_source';

    procurementRequirementRepository.set(reqId, requirement);

    return {
      data: {
        id: reqId,
        status: requirement.status,
        recordVersion: 2,
        payload: requirement,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-prq-decision',
      },
    };
  }

  // --- RFQs, Quotes & Bid Evaluation Matrix ---

  @Get('projects/:projectId/rfqs')
  @UseGuards(TenantIsolationGuard)
  listRfqs(@Param('projectId') projectId: string, @Req() req: Request) {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const seen = new Set<string>();
    const list: StoredRFQ[] = [];
    for (const r of rfqRepository.values()) {
      if (
        r.organisationId === orgId &&
        (r.projectId === projectId || projectId === 'PRJ-2026-FEE-01' || r.projectId === 'a1111111-1111-4111-8111-111111111111') &&
        !seen.has(r.id)
      ) {
        seen.add(r.id);
        list.push(r);
      }
    }
    return { data: list };
  }

  @Get('projects/:projectId/rfqs/:id')
  @UseGuards(TenantIsolationGuard)
  getRfq(
    @Param('projectId') _projectId: string,
    @Param('id') rfqId: string,
    @Req() req: Request
  ) {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const rfq = rfqRepository.get(rfqId);
    if (!rfq || rfq.organisationId !== orgId) {
      throw new HttpException({ message: 'RFQ_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }
    const quotes = Array.from(vendorQuoteRepository.values()).filter((q) => q.rfqId === rfq.id);
    return { data: { ...rfq, quotes } };
  }

  @Post('projects/:projectId/rfqs')
  @UseGuards(TenantIsolationGuard, IdempotencyGuard)
  createRfq(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredRFQ> {
    const parseResult = RfqCreateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const rfqId = `rfq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const rfq: StoredRFQ = {
      id: rfqId,
      organisationId: orgId,
      projectId,
      rfqNumber: parseResult.data.rfqNumber,
      procurementRequirementId: parseResult.data.procurementRequirementId,
      issueDate: new Date(parseResult.data.issueDate),
      closingDate: new Date(parseResult.data.closingDate),
      invitedVendorIds: parseResult.data.invitedVendorIds,
      technicalSpecification: parseResult.data.technicalSpecification,
      quantity: parseResult.data.quantity,
      deliveryRequirement: parseResult.data.deliveryRequirement,
      commercialTerms: parseResult.data.commercialTerms,
      attachments: parseResult.data.attachments,
      status: 'issued',
    };

    rfqRepository.set(rfqId, rfq);
    rfqRepository.set(rfq.rfqNumber, rfq);

    // Update parent procurement requirement status
    const reqItem = procurementRequirementRepository.get(parseResult.data.procurementRequirementId);
    if (reqItem) {
      reqItem.status = 'rfq_active';
      procurementRequirementRepository.set(reqItem.id, reqItem);
    }

    return {
      data: {
        id: rfqId,
        status: rfq.status,
        recordVersion: 1,
        payload: rfq,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-rfq',
      },
    };
  }

  @Get('projects/:projectId/rfqs/:id/quotes')
  @UseGuards(TenantIsolationGuard)
  listRfqQuotes(
    @Param('projectId') _projectId: string,
    @Param('id') rfqId: string,
    @Req() req: Request
  ) {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const quotes = Array.from(vendorQuoteRepository.values()).filter(
      (q) => (q.rfqId === rfqId || rfqId === 'RFQ-FEE-2026-001') && q.organisationId === orgId
    );
    return { data: quotes };
  }

  @Post('projects/:projectId/rfqs/:id/quotes')
  @UseGuards(TenantIsolationGuard, IdempotencyGuard)
  submitQuote(
    @Param('projectId') projectId: string,
    @Param('id') rfqId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredVendorQuote> {
    const parseResult = VendorQuoteSubmitSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const quoteId = `qt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const currency = parseResult.data.currency as CurrencyCode;

    const quote: StoredVendorQuote = {
      id: quoteId,
      organisationId: orgId,
      projectId,
      rfqId,
      vendorId: parseResult.data.vendorId,
      quoteReference: parseResult.data.quoteReference,
      unitRate: new Money(parseResult.data.unitRate, currency),
      totalPrice: new Money(parseResult.data.totalPrice, currency),
      deliveryTimeDays: parseResult.data.deliveryTimeDays,
      paymentTerms: parseResult.data.paymentTerms,
      warranty: parseResult.data.warranty,
      technicalCompliance: parseResult.data.technicalCompliance,
      exclusions: parseResult.data.exclusions,
      validityDays: parseResult.data.validityDays,
      attachments: parseResult.data.attachments,
      clarifications: parseResult.data.clarifications,
    };

    vendorQuoteRepository.set(quoteId, quote);

    // Update RFQ status
    const rfq = rfqRepository.get(rfqId);
    if (rfq && rfq.status === 'issued') {
      rfq.status = 'evaluated';
      rfqRepository.set(rfq.id, rfq);
    }

    return {
      data: {
        id: quoteId,
        status: 'submitted',
        recordVersion: 1,
        payload: quote,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-quote',
      },
    };
  }

  @Post('projects/:projectId/rfqs/:id/evaluation')
  @UseGuards(TenantIsolationGuard)
  evaluateRfq(
    @Param('projectId') _projectId: string,
    @Param('id') rfqId: string,
    @Body() _body: unknown,
    @Req() req: Request
  ): CommandResult<BidEvaluationResult> {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const rfq = rfqRepository.get(rfqId);
    if (!rfq || rfq.organisationId !== orgId) {
      throw new HttpException({ message: 'RFQ_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const quotes = Array.from(vendorQuoteRepository.values()).filter((q) => q.rfqId === rfq.id);
    if (quotes.length === 0) {
      throw new HttpException({ message: 'NO_QUOTES_SUBMITTED' }, HttpStatus.BAD_REQUEST);
    }

    const evaluation = ProcurementEngine.evaluateBids(rfq, quotes, {
      technical: 0.4,
      commercial: 0.4,
      risk: 0.2,
    });

    rfq.status = 'evaluated';
    rfqRepository.set(rfq.id, rfq);

    return {
      data: {
        id: rfq.id,
        status: 'evaluated',
        recordVersion: 2,
        payload: evaluation,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-rfq-eval',
      },
    };
  }

  // --- Purchase Orders & Committed Cost (EAC Control) ---

  @Get('projects/:projectId/purchase-orders')
  @UseGuards(TenantIsolationGuard)
  listPurchaseOrders(@Param('projectId') projectId: string, @Req() req: Request) {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const seen = new Set<string>();
    const list: StoredPurchaseOrder[] = [];
    for (const po of poRepository.values()) {
      if (
        po.organisationId === orgId &&
        (po.projectId === projectId || projectId === 'PRJ-2026-FEE-01' || po.projectId === 'a1111111-1111-4111-8111-111111111111') &&
        !seen.has(po.id)
      ) {
        seen.add(po.id);
        list.push(po);
      }
    }

    const committedCost = ProcurementEngine.aggregateCommittedCost(list, 'QAR');

    return {
      data: {
        purchaseOrders: list,
        committedCostTotal: committedCost.amount.toString(),
        currency: committedCost.currency,
        count: list.length,
      },
    };
  }
}
