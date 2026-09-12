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
  SimilarProjectSearchSchema,
  ParametricEstimateRequestSchema,
  ParametricEstimateResultDto,
  CommandResult,
} from '@e3-eos/contracts';
import {
  HistoricalEstimatingEngine,
  HistoricalProjectRecord,
  CurrencyCode,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';

export const HISTORICAL_PROJECT_FIXTURES: HistoricalProjectRecord[] = [
  {
    id: 'hist-prj-01',
    projectCode: 'SUMMIT-2025-DOHA',
    title: 'Doha Global Economic Forum 2025',
    eventType: 'summit',
    venueType: 'convention_centre',
    scaleCapacity: 2500,
    durationDays: 3,
    countryCode: 'QA',
    totalDirectCost: 3200000,
    currency: 'QAR',
    baselineGrossMarginPercent: 28.0,
    actualGrossMarginPercent: 26.5,
    completionDate: new Date('2025-05-15'),
    categorySpend: {
      audio: 450000,
      scenic: 900000,
      lighting: 400000,
      video: 700000,
      rigging: 250000,
      labor: 350000,
      logistics: 150000,
    },
  },
  {
    id: 'hist-prj-02',
    projectCode: 'FESTIVAL-2025-LUSAIL',
    title: 'Lusail Light & Arts Festival',
    eventType: 'festival',
    venueType: 'public_park',
    scaleCapacity: 15000,
    durationDays: 5,
    countryCode: 'QA',
    totalDirectCost: 5500000,
    currency: 'QAR',
    baselineGrossMarginPercent: 25.0,
    actualGrossMarginPercent: 22.0,
    completionDate: new Date('2025-11-20'),
    categorySpend: {
      audio: 600000,
      scenic: 1200000,
      lighting: 1400000,
      video: 1000000,
      rigging: 400000,
      labor: 600000,
      logistics: 300000,
    },
  },
  {
    id: 'hist-prj-03',
    projectCode: 'GALA-2026-RIYADH',
    title: 'Riyadh Ministerial Gala & Awards',
    eventType: 'summit',
    venueType: 'indoor_arena',
    scaleCapacity: 3000,
    durationDays: 2,
    countryCode: 'SA',
    totalDirectCost: 2800000,
    currency: 'SAR',
    baselineGrossMarginPercent: 30.0,
    actualGrossMarginPercent: 28.5,
    completionDate: new Date('2026-02-10'),
    categorySpend: {
      audio: 400000,
      scenic: 800000,
      lighting: 350000,
      video: 650000,
      rigging: 200000,
      labor: 280000,
      logistics: 120000,
    },
  },
];

@Controller('estimating')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class HistoricalEstimatingController {
  @Post('similar-projects')
  findSimilarProjects(
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<any> {
    const parseResult = SimilarProjectSearchSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const matches = HistoricalEstimatingEngine.findSimilarProjects(
      parseResult.data,
      HISTORICAL_PROJECT_FIXTURES
    );

    return {
      data: {
        id: `similar-${Date.now()}`,
        status: 'matches_found',
        recordVersion: 1,
        payload: {
          criteria: parseResult.data,
          matchesCount: matches.length,
          matches,
        },
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-similar',
      },
    };
  }

  @Post('parametric-forecast')
  generateParametricForecast(
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<ParametricEstimateResultDto> {
    const parseResult = ParametricEstimateRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const matches = HistoricalEstimatingEngine.findSimilarProjects(
      {
        eventType: parseResult.data.eventType,
        venueType: parseResult.data.venueType,
        targetCapacity: parseResult.data.targetCapacity,
        durationDays: parseResult.data.durationDays,
      },
      HISTORICAL_PROJECT_FIXTURES
    );

    const forecast = HistoricalEstimatingEngine.calculateParametricForecast(
      matches,
      parseResult.data.targetCapacity,
      parseResult.data.durationDays,
      parseResult.data.currency as CurrencyCode
    );

    return {
      data: {
        id: `forecast-${Date.now()}`,
        status: 'forecast_generated',
        recordVersion: 1,
        payload: forecast,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-forecast',
      },
    };
  }

  @Get('projects/:projectId/margin-erosion-risk')
  getMarginErosionRisk(
    @Param('projectId') projectId: string,
    @Req() req: Request
  ): CommandResult<any> {
    const matches = HistoricalEstimatingEngine.findSimilarProjects(
      {
        eventType: 'summit',
        venueType: 'convention_centre',
        targetCapacity: 3000,
        durationDays: 2,
      },
      HISTORICAL_PROJECT_FIXTURES
    );

    const forecast = HistoricalEstimatingEngine.calculateParametricForecast(
      matches,
      3000,
      2,
      'QAR'
    );

    return {
      data: {
        id: projectId,
        status: 'risk_assessed',
        recordVersion: 1,
        payload: {
          marginErosionRiskIndexPercent: forecast.marginErosionRiskIndexPercent,
          riskDrivers: forecast.riskDrivers,
          historicalSampleSize: forecast.sampleSize,
        },
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-erosion-risk',
      },
    };
  }
}
