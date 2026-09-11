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
  EstimateCreateSchema,
  BOQLineCreateSchema,
  EstimateCalculateSchema,
  ProposalCreateSchema,
  VariationCreateSchema,
  VariationApplySchema,
  CommandResult,
} from '@e3-eos/contracts';
import {
  BOQCalculator,
  BOQLineInput,
  VariationLedger,
  VariationData,
  Money,
  CurrencyCode,
  ClientProposalSummary,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { IdempotencyGuard } from '../common/idempotency.guard.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { projectRepository } from '../projects/projects.controller.js';

export interface StoredEstimate {
  id: string;
  organisationId: string;
  projectId: string;
  name: string;
  currency: CurrencyCode;
  status: 'draft' | 'approved' | 'superseded';
  versionNumber: number;
  totalCost?: string;
  totalSell?: string;
  marginPercent?: string;
  markupPercent?: string;
  createdAt: string;
}

export interface StoredBOQLine extends BOQLineInput {
  estimateId: string;
  organisationId: string;
  projectId: string;
}

export interface StoredProposal {
  id: string;
  organisationId: string;
  projectId: string;
  estimateId: string;
  proposalCode: string;
  title: string;
  clientOrganisationId: string;
  totalSell: string;
  currency: CurrencyCode;
  status: 'draft' | 'submitted' | 'accepted' | 'rejected' | 'superseded';
  contentHash: string;
  projection: ClientProposalSummary;
  createdAt: string;
}

export interface StoredVariation extends VariationData {
  organisationId: string;
}

export const estimateRepository = new Map<string, StoredEstimate>();
export const boqLineRepository = new Map<string, StoredBOQLine>();
export const proposalRepository = new Map<string, StoredProposal>();
export const variationRepository = new Map<string, StoredVariation>();

function seedInitialCommercial() {
  const projectIds = [
    '00000000-0000-4000-8000-000000000001',
    'f1111111-1111-4111-8111-111111111111',
  ];
  const orgId = '11111111-1111-4111-8111-111111111111';

  for (const projectId of projectIds) {
    const estId = `est-qnd-${projectId.slice(0, 8)}`;
    const estimate: StoredEstimate = {
      id: estId,
      organisationId: orgId,
      projectId,
      name: 'QND 2026 Master Delivery Commercial Baseline (Rev 01)',
      currency: 'QAR',
      status: 'approved',
      versionNumber: 1,
      totalCost: '985000',
      totalSell: '1355000',
      marginPercent: '27.3',
      markupPercent: '37.6',
      createdAt: '2026-09-08T08:00:00Z',
    };
    estimateRepository.set(estId, estimate);

    const l1: StoredBOQLine = {
      id: `line-1-${projectId.slice(0, 8)}`,
      estimateId: estId,
      organisationId: orgId,
      projectId,
      lineCode: 'BOQ-AV-001',
      description: '360-Degree Kinetic LED Arch Installation & Operation',
      quantity: '1',
      uom: 'lot',
      unitCost: '320000',
      unitSell: '450000',
      durationMultiplier: '1',
      isLumpSum: true,
      discountPercent: '0',
      taxRate: '0',
      linkedRequirementCode: 'REQ-QND-001',
    };

    const l2: StoredBOQLine = {
      id: `line-2-${projectId.slice(0, 8)}`,
      estimateId: estId,
      organisationId: orgId,
      projectId,
      lineCode: 'BOQ-STG-002',
      description: 'Lusail Boulevard Royal Pavilion Substructure & Engineered Footings',
      quantity: '1',
      uom: 'lot',
      unitCost: '580000',
      unitSell: '780000',
      durationMultiplier: '1',
      isLumpSum: true,
      discountPercent: '0',
      taxRate: '0',
      linkedRequirementCode: 'REQ-QND-002',
    };

    const l3: StoredBOQLine = {
      id: `line-3-${projectId.slice(0, 8)}`,
      estimateId: estId,
      organisationId: orgId,
      projectId,
      lineCode: 'BOQ-HSE-003',
      description: 'Civil Defence Certified Fire Retardant Coating & Fire Suppression Rig',
      quantity: '1',
      uom: 'lot',
      unitCost: '85000',
      unitSell: '125000',
      durationMultiplier: '1',
      isLumpSum: false,
      discountPercent: '0',
      taxRate: '0',
      linkedRequirementCode: 'REQ-QND-003',
    };

    boqLineRepository.set(l1.id, l1);
    boqLineRepository.set(l2.id, l2);
    boqLineRepository.set(l3.id, l3);
  }
}

seedInitialCommercial();

@Controller('projects/:projectId')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class CommercialController {
  @Get('estimates')
  listEstimates(@Param('projectId') projectId: string) {
    const list = Array.from(estimateRepository.values()).filter((e) => e.projectId === projectId);
    return { data: list };
  }

  @Get('estimates/:estimateId/lines')
  listEstimateLines(
    @Param('projectId') projectId: string,
    @Param('estimateId') estimateId: string
  ) {
    const list = Array.from(boqLineRepository.values()).filter(
      (l) => l.projectId === projectId && l.estimateId === estimateId
    );
    return { data: list };
  }

  @Post('estimates')
  @UseGuards(IdempotencyGuard)
  createEstimate(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredEstimate> {
    const parseResult = EstimateCreateSchema.safeParse(body);
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

    const estimateId = `est-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const estimate: StoredEstimate = {
      id: estimateId,
      organisationId: orgId,
      projectId,
      name: parseResult.data.name,
      currency: parseResult.data.currency as CurrencyCode,
      status: 'draft',
      versionNumber: 1,
      createdAt: new Date().toISOString(),
    };

    estimateRepository.set(estimateId, estimate);

    return {
      data: {
        id: estimateId,
        status: 'draft',
        recordVersion: 1,
        payload: estimate,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-est',
        recordVersion: 1,
      },
    };
  }

  @Post('estimates/:estimateId/lines')
  @UseGuards(IdempotencyGuard)
  addLine(
    @Param('projectId') projectId: string,
    @Param('estimateId') estimateId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredBOQLine> {
    const parseResult = BOQLineCreateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const estimate = estimateRepository.get(estimateId);
    if (!estimate || estimate.organisationId !== orgId || estimate.projectId !== projectId) {
      throw new HttpException({ message: 'ESTIMATE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const lineId = `line-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const line: StoredBOQLine = {
      id: lineId,
      estimateId,
      organisationId: orgId,
      projectId,
      lineCode: parseResult.data.lineCode,
      description: parseResult.data.description,
      descriptionAr: parseResult.data.descriptionAr,
      quantity: parseResult.data.quantity,
      uom: parseResult.data.uom,
      unitCost: parseResult.data.unitCost,
      unitSell: parseResult.data.unitSell,
      durationMultiplier: parseResult.data.durationMultiplier,
      isLumpSum: parseResult.data.isLumpSum,
      parentLineId: parseResult.data.parentLineId,
      allocatedLumpSumPortion: parseResult.data.allocatedLumpSumPortion,
      discountPercent: parseResult.data.discountPercent,
      taxRate: parseResult.data.taxRate,
      linkedRequirementCode: parseResult.data.linkedRequirementCode,
    };

    boqLineRepository.set(lineId, line);

    return {
      data: {
        id: lineId,
        status: 'created',
        recordVersion: 1,
        payload: line,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-line',
      },
    };
  }

  @Post('estimates/:estimateId/calculate')
  calculateEstimate(
    @Param('projectId') projectId: string,
    @Param('estimateId') estimateId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<any> {
    const parseResult = EstimateCalculateSchema.safeParse(body || {});
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const estimate = estimateRepository.get(estimateId);
    if (!estimate || estimate.organisationId !== orgId || estimate.projectId !== projectId) {
      throw new HttpException({ message: 'ESTIMATE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const lines = Array.from(boqLineRepository.values()).filter(
      (l) => l.estimateId === estimateId
    );

    try {
      const summary = BOQCalculator.calculateEstimate(lines, estimate.currency, {
        overallDiscountPercent: parseResult.data.overallDiscountPercent,
        overallFeePercent: parseResult.data.overallFeePercent,
        defaultTaxRate: parseResult.data.defaultTaxRate,
      });

      estimate.totalCost = summary.totalCost.toString();
      estimate.totalSell = summary.totalSell.toString();
      estimate.marginPercent =
        summary.marginPercent === 'not_applicable' ? 'not_applicable' : summary.marginPercent.toString();
      estimate.markupPercent =
        summary.markupPercent === 'not_applicable' ? 'not_applicable' : summary.markupPercent.toString();
      estimateRepository.set(estimateId, estimate);

      return {
        data: {
          id: estimateId,
          status: 'calculated',
          recordVersion: estimate.versionNumber,
          payload: {
            subtotalCost: summary.subtotalCost.toString(),
            subtotalSell: summary.subtotalSell.toString(),
            discountAmount: summary.discountAmount.toString(),
            feeAmount: summary.feeAmount.toString(),
            taxAmount: summary.taxAmount.toString(),
            totalCost: summary.totalCost.toString(),
            totalSell: summary.totalSell.toString(),
            grossProfit: summary.grossProfit.toString(),
            marginPercent: estimate.marginPercent,
            markupPercent: estimate.markupPercent,
            lineCount: lines.length,
          },
        },
        meta: {
          requestId: (req.headers['x-request-id'] as string) || 'req-calc',
        },
      };
    } catch (err: any) {
      throw new HttpException(
        { message: 'CALCULATION_ERROR', detail: err.message },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post('proposals')
  @UseGuards(IdempotencyGuard)
  createProposal(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredProposal> {
    const parseResult = ProposalCreateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const estimate = estimateRepository.get(parseResult.data.estimateId);
    if (!estimate || estimate.organisationId !== orgId || estimate.projectId !== projectId) {
      throw new HttpException({ message: 'ESTIMATE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const lines = Array.from(boqLineRepository.values()).filter(
      (l) => l.estimateId === estimate.id
    );

    const summary = BOQCalculator.calculateEstimate(lines, estimate.currency);
    const proposalId = `prop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Invariant (AT-002, AT-035): Client sell-side projection strictly strips buy rates and internal margins
    const clientProjection = BOQCalculator.projectClientProposal(proposalId, projectId, summary);
    const contentHash = VariationLedger.computeContentHash(clientProjection);

    const proposal: StoredProposal = {
      id: proposalId,
      organisationId: orgId,
      projectId,
      estimateId: estimate.id,
      proposalCode: parseResult.data.proposalCode,
      title: parseResult.data.title,
      clientOrganisationId: parseResult.data.clientOrganisationId,
      totalSell: summary.totalSell.toString(),
      currency: estimate.currency,
      status: 'submitted',
      contentHash,
      projection: clientProjection,
      createdAt: new Date().toISOString(),
    };

    proposalRepository.set(proposalId, proposal);

    return {
      data: {
        id: proposalId,
        status: 'submitted',
        recordVersion: 1,
        payload: proposal,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-prop',
      },
    };
  }

  @Post('variations')
  @UseGuards(IdempotencyGuard)
  createVariation(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredVariation> {
    const parseResult = VariationCreateSchema.safeParse(body);
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

    const currency = (project.financialAssumptions?.currency as CurrencyCode) || 'QAR';
    const costImpact = new Money(parseResult.data.costImpact, currency);
    const sellImpact = new Money(parseResult.data.sellImpact, currency);

    const varId = `var-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const variationData: VariationData = {
      id: varId,
      projectId,
      variationCode: parseResult.data.variationCode,
      title: parseResult.data.title,
      titleAr: parseResult.data.titleAr,
      scopeDescription: parseResult.data.scopeDescription,
      costImpact,
      sellImpact,
      timeImpactDays: parseResult.data.timeImpactDays,
      status: 'submitted_to_client', // Pending client authorization (AT-040)
    };

    const contentHash = VariationLedger.computeContentHash({
      projectId,
      variationCode: variationData.variationCode,
      costImpact: costImpact.toString(),
      sellImpact: sellImpact.toString(),
      timeImpactDays: variationData.timeImpactDays,
    });

    const storedVariation: StoredVariation = {
      ...variationData,
      organisationId: orgId,
    };

    variationRepository.set(varId, storedVariation);

    return {
      data: {
        id: varId,
        status: storedVariation.status,
        recordVersion: 1,
        payload: storedVariation,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-var',
        policySnapshotId: contentHash,
      },
    };
  }

  @Post('variations/:variationId/apply')
  applyVariation(
    @Param('projectId') projectId: string,
    @Param('variationId') variationId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<StoredVariation> {
    const parseResult = VariationApplySchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const variation = variationRepository.get(variationId);
    if (!variation || variation.organisationId !== orgId || variation.projectId !== projectId) {
      throw new HttpException({ message: 'VARIATION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // Invariant AT-040: Apply variation transitions from pending exposure to approved baseline
    variation.status = 'client_approved';
    variation.clientDecisionId = parseResult.data.clientDecisionId;
    variation.clientDecidedAt = new Date(parseResult.data.clientAuthorisedAt);
    variationRepository.set(variationId, variation);

    return {
      data: {
        id: variationId,
        status: 'client_approved',
        recordVersion: 2,
        payload: variation,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-apply-var',
      },
    };
  }

  @Get('financials')
  getFinancials(
    @Param('projectId') projectId: string,
    @Req() req: Request
  ): CommandResult<any> {
    const orgId = (req as any).organisationId || '11111111-1111-4111-8111-111111111111';
    const project = projectRepository.get(projectId);
    if (!project || project.organisationId !== orgId) {
      throw new HttpException({ message: 'PROJECT_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const currency = (project.financialAssumptions?.currency as CurrencyCode) || 'QAR';
    const baseRevenue = new Money(project.financialAssumptions?.expectedRevenueMax || '0', currency);
    const baseCost = new Money(project.financialAssumptions?.estimatedCost || '0', currency);

    const projectVars = Array.from(variationRepository.values()).filter(
      (v) => v.projectId === projectId
    );

    // Invariant AT-040: pending changes separate from approved contract
    const financials = VariationLedger.calculateFinancials(
      currency,
      baseRevenue,
      baseCost,
      projectVars
    );

    return {
      data: {
        id: projectId,
        status: 'active',
        recordVersion: 1,
        payload: {
          currency,
          approvedContractValue: financials.approvedContractValue.toString(),
          approvedCostBudget: financials.approvedCostBudget.toString(),
          pendingExposureSell: financials.pendingExposureSell.toString(),
          pendingExposureCost: financials.pendingExposureCost.toString(),
          totalForecastSell: financials.totalForecastSell.toString(),
          totalForecastCost: financials.totalForecastCost.toString(),
          estimateAtCompletion: financials.totalForecastCost.toString(),
          varianceAtCompletion: financials.approvedCostBudget.minus(financials.totalForecastCost).toString(),
        },
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-fin',
      },
    };
  }
}
