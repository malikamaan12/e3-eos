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
  CostImportSchema,
  CostAllocationSchema,
  InvoiceLedgerStatusSchema,
  BillingRequestSchema,
  CreditNoteSchema,
  CommandResult,
} from '@e3-eos/contracts';
import {
  FinancialCalculator,
  FinancialPositionInput,
  FinancialPositionResult,
  CostAllocationEngine,
  MultiCurrencyValidator,
  SourceImportDeduplicator,
  CostImportBatch,
  CreditNoteAdjustmentEngine,
  CreditNoteAdjustment,
  Money,
  CurrencyCode,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { IdempotencyGuard } from '../common/idempotency.guard.js';
import { projectRepository } from '../projects/projects.controller.js';

export interface StoredCostImportBatch extends CostImportBatch {
  id: string;
  organisationId: string;
  projectId: string;
  records: Array<{
    externalTxId: string;
    description: string;
    amount: string;
    currency: string;
  }>;
}

export interface StoredInvoice {
  id: string;
  organisationId: string;
  projectId: string;
  poId?: string;
  invoiceNumber: string;
  amount: string;
  currency: CurrencyCode;
  ledgerStatus: 'pending_sync' | 'synced' | 'quarantined_by_ledger' | 'rejected_by_ledger';
  quarantineReason?: string;
  isPaid: boolean;
}

export interface StoredCreditNote extends CreditNoteAdjustment {
  id: string;
  organisationId: string;
  projectId: string;
}

export interface StoredBillingRequest {
  id: string;
  organisationId: string;
  projectId: string;
  milestoneId: string;
  amount: string;
  currency: string;
  description: string;
  status: 'draft' | 'submitted' | 'approved' | 'settled';
}

export const costImportRepository = new Map<string, StoredCostImportBatch>();
export const invoiceRepository = new Map<string, StoredInvoice>();
export const creditNoteRepository = new Map<string, StoredCreditNote>();
export const billingRequestRepository = new Map<string, StoredBillingRequest>();
export const financialPositionRepository = new Map<string, FinancialPositionInput>();

@Controller('projects/:projectId')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class FinanceController {
  // --- Cost Imports & Source Deduplication (AT-067, AT-071) ---

  @Post('cost-imports')
  @UseGuards(IdempotencyGuard)
  importCostFile(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredCostImportBatch> {
    const parseResult = CostImportSchema.safeParse(body);
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

    const baseCurrency = (project.financialAssumptions?.currency || 'QAR') as CurrencyCode;

    // Invariant AT-071: Disallow silent mixing of currencies without FX rate
    try {
      MultiCurrencyValidator.assertConsistentCurrency(
        baseCurrency,
        parseResult.data.records.map((r) => ({
          amount: new Money(r.amount, r.currency as CurrencyCode),
          description: r.description,
        }))
      );
    } catch (err: any) {
      throw new HttpException({ message: 'CURRENCY_MISMATCH', detail: err.message }, HttpStatus.BAD_REQUEST);
    }

    // Invariant AT-067: Deduplicate financial source file
    const existingBatches = Array.from(costImportRepository.values()).filter(
      (b) => b.projectId === projectId && b.organisationId === orgId
    );

    try {
      SourceImportDeduplicator.validateImportUniqueness(
        {
          sourceSystem: parseResult.data.sourceSystem,
          batchId: parseResult.data.batchId,
          fileHash: parseResult.data.fileHash,
        },
        existingBatches
      );
    } catch (err: any) {
      throw new HttpException(
        { message: 'DUPLICATE_SOURCE_IMPORT', detail: err.message },
        HttpStatus.CONFLICT
      );
    }

    let totalMoney = new Money('0', baseCurrency);
    for (const rec of parseResult.data.records) {
      totalMoney = totalMoney.plus(new Money(rec.amount, baseCurrency));
    }

    const importId = `cimp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const batch: StoredCostImportBatch = {
      id: importId,
      organisationId: orgId,
      projectId,
      batchId: parseResult.data.batchId,
      sourceSystem: parseResult.data.sourceSystem,
      fileHash: parseResult.data.fileHash,
      importedAt: new Date(),
      recordCount: parseResult.data.records.length,
      totalAmount: totalMoney,
      records: parseResult.data.records,
    };

    costImportRepository.set(importId, batch);

    return {
      data: {
        id: importId,
        status: 'imported',
        recordVersion: 1,
        payload: batch,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-cimp',
      },
    };
  }

  // --- Cost Allocations (AT-070) ---

  @Post('cost-allocations')
  allocateInvoiceCost(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<{ totalAllocated: string; remainingUnallocated: string }> {
    const parseResult = CostAllocationSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const invoice = invoiceRepository.get(parseResult.data.invoiceId);
    if (!invoice || invoice.organisationId !== orgId || invoice.projectId !== projectId) {
      throw new HttpException({ message: 'INVOICE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const invoiceLineMoney = new Money(invoice.amount, invoice.currency);

    // Invariant AT-070: Allocation sum cannot exceed invoice line total
    let validationResult;
    try {
      validationResult = CostAllocationEngine.validateAllocations(
        invoiceLineMoney,
        parseResult.data.allocations
      );
    } catch (err: any) {
      throw new HttpException(
        { message: 'ALLOCATION_EXCEEDS_INVOICE', detail: err.message },
        HttpStatus.BAD_REQUEST
      );
    }

    return {
      data: {
        id: parseResult.data.invoiceId,
        status: 'allocated',
        recordVersion: 1,
        payload: {
          totalAllocated: validationResult.totalAllocated.amount.toString(),
          remainingUnallocated: validationResult.remainingUnallocated.amount.toString(),
        },
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-alloc',
      },
    };
  }

  // --- Invoices & Accounting Ledger Quarantine (AT-068) ---

  @Post('invoices')
  createInvoice(
    @Param('projectId') projectId: string,
    @Body()
    body: {
      invoiceNumber: string;
      poId?: string;
      amount: string;
      currency?: string;
    },
    @Req() req: Request
  ): CommandResult<StoredInvoice> {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const invId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const inv: StoredInvoice = {
      id: invId,
      organisationId: orgId,
      projectId,
      poId: body.poId,
      invoiceNumber: body.invoiceNumber,
      amount: body.amount,
      currency: (body.currency || 'QAR') as CurrencyCode,
      ledgerStatus: 'pending_sync',
      isPaid: false,
    };

    invoiceRepository.set(invId, inv);

    return {
      data: {
        id: invId,
        status: inv.ledgerStatus,
        recordVersion: 1,
        payload: inv,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-inv-create',
      },
    };
  }

  @Post('invoices/:id/ledger-status')
  updateLedgerStatus(
    @Param('projectId') projectId: string,
    @Param('id') invoiceId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredInvoice> {
    const parseResult = InvoiceLedgerStatusSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const invoice = invoiceRepository.get(invoiceId);
    if (!invoice || invoice.organisationId !== orgId || invoice.projectId !== projectId) {
      throw new HttpException({ message: 'INVOICE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // Invariant AT-068: Invoices quarantined or rejected by ledger never display as posted or paid
    invoice.ledgerStatus = parseResult.data.ledgerStatus;
    invoice.quarantineReason = parseResult.data.quarantineReason;
    if (
      parseResult.data.ledgerStatus === 'quarantined_by_ledger' ||
      parseResult.data.ledgerStatus === 'rejected_by_ledger'
    ) {
      invoice.isPaid = false;
    }

    invoiceRepository.set(invoiceId, invoice);

    return {
      data: {
        id: invoiceId,
        status: invoice.ledgerStatus,
        recordVersion: 2,
        payload: invoice,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-inv-ledger',
      },
    };
  }

  // --- Financial Position & Worked 90,000 EAC Invariant (AT-066) ---

  @Get('financial-position')
  getFinancialPosition(
    @Param('projectId') projectId: string,
    @Req() req: Request
  ): CommandResult<FinancialPositionResult> {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const project = projectRepository.get(projectId);
    if (!project || project.organisationId !== orgId) {
      throw new HttpException({ message: 'PROJECT_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const storedInput = financialPositionRepository.get(projectId);
    if (!storedInput) {
      throw new HttpException({ message: 'FINANCIAL_POSITION_NOT_INITIALIZED' }, HttpStatus.NOT_FOUND);
    }

    const result = FinancialCalculator.calculatePosition(storedInput);

    return {
      data: {
        id: projectId,
        status: 'calculated',
        recordVersion: 1,
        payload: result,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-pos',
      },
    };
  }

  @Post('financial-position/initialize')
  setFinancialPosition(
    @Param('projectId') projectId: string,
    @Body() body: FinancialPositionInput,
    @Req() req: Request
  ): CommandResult<FinancialPositionResult> {
    financialPositionRepository.set(projectId, body);
    const result = FinancialCalculator.calculatePosition(body);

    return {
      data: {
        id: projectId,
        status: 'initialized',
        recordVersion: 1,
        payload: result,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-pos-init',
      },
    };
  }

  @Post('transition-accrual-to-invoice')
  transitionAccrual(
    @Param('projectId') projectId: string,
    @Body() body: { invoicedAmount: string },
    @Req() req: Request
  ): CommandResult<FinancialPositionResult> {
    const stored = financialPositionRepository.get(projectId);
    if (!stored) {
      throw new HttpException({ message: 'FINANCIAL_POSITION_NOT_INITIALIZED' }, HttpStatus.NOT_FOUND);
    }

    // Invariant AT-066: Moving accrual to actual keeps EAC unchanged
    const transitioned = FinancialCalculator.transitionAccrualToInvoice(stored, body.invoicedAmount);
    financialPositionRepository.set(projectId, transitioned);
    const result = FinancialCalculator.calculatePosition(transitioned);

    return {
      data: {
        id: projectId,
        status: 'transitioned',
        recordVersion: 2,
        payload: result,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-trans-accrual',
      },
    };
  }

  // --- Credit Notes & Post-Report Adjustments (AT-069) ---

  @Post('credit-notes')
  applyCreditNote(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredCreditNote> {
    const parseResult = CreditNoteSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const cnId = `cn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const creditAdjustment: CreditNoteAdjustment = {
      creditNoteId: cnId,
      invoiceId: parseResult.data.invoiceId,
      creditAmount: new Money(parseResult.data.creditAmount, parseResult.data.currency as CurrencyCode),
      reason: parseResult.data.reason,
      effectiveDate: new Date(),
    };

    const storedPos = financialPositionRepository.get(projectId);
    if (storedPos) {
      // Invariant AT-069: Applies credit note to reduce posted actuals
      const updatedPos = CreditNoteAdjustmentEngine.applyCreditAdjustment(storedPos, creditAdjustment);
      financialPositionRepository.set(projectId, updatedPos);
    }

    const storedCreditNote: StoredCreditNote = {
      id: cnId,
      organisationId: orgId,
      projectId,
      ...creditAdjustment,
    };

    creditNoteRepository.set(cnId, storedCreditNote);

    return {
      data: {
        id: cnId,
        status: 'applied',
        recordVersion: 1,
        payload: storedCreditNote,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-cn-apply',
      },
    };
  }

  // --- Billing Requests ---

  @Post('billing-requests')
  createBillingRequest(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredBillingRequest> {
    const parseResult = BillingRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const billId = `bill-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const billingReq: StoredBillingRequest = {
      id: billId,
      organisationId: orgId,
      projectId,
      milestoneId: parseResult.data.milestoneId,
      amount: parseResult.data.amount,
      currency: parseResult.data.currency,
      description: parseResult.data.description,
      status: 'draft',
    };

    billingRequestRepository.set(billId, billingReq);

    return {
      data: {
        id: billId,
        status: billingReq.status,
        recordVersion: 1,
        payload: billingReq,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-bill',
      },
    };
  }
}
