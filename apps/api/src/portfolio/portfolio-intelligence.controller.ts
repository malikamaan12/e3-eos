import {
  Controller,
  Get,
  Req,
  UseGuards,
  UseFilters,
} from '@nestjs/common';
import { Request } from 'express';
import {
  EnterpriseRiskSummaryDto,
  VendorPerformanceRankingDto,
  CommandResult,
} from '@e3-eos/contracts';
import {
  PortfolioIntelligenceEngine,
  ProjectHealthMetric,
  VendorPerformanceItem,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';

const SAMPLE_PROJECT_HEALTH: ProjectHealthMetric[] = [
  {
    projectId: 'prj-p06-summit-01',
    projectCode: 'P06-SUMMIT-01',
    title: 'Doha Global Economic Summit',
    cpi: '1.05',
    spi: '1.02',
    marginErosionRisk: '2.50%',
    criticalSnagCount: 0,
    openIncidentCount: 0,
    riskScore: 5,
    riskLevel: 'low',
    dominantRiskFactor: 'Healthy Operations',
  },
  {
    projectId: 'prj-p06-festival-02',
    projectCode: 'P06-FESTIVAL-02',
    title: 'Lusail Marina Outdoor Light Festival',
    cpi: '0.88',
    spi: '0.92',
    marginErosionRisk: '6.80%',
    criticalSnagCount: 2,
    openIncidentCount: 1,
    riskScore: 55,
    riskLevel: 'high',
    dominantRiskFactor: '2 Unresolved Critical Snags',
  },
  {
    projectId: 'prj-p06-gala-03',
    projectCode: 'P06-GALA-03',
    title: 'National Innovation Awards Dinner',
    cpi: '0.94',
    spi: '0.98',
    marginErosionRisk: '3.40%',
    criticalSnagCount: 0,
    openIncidentCount: 0,
    riskScore: 20,
    riskLevel: 'low',
    dominantRiskFactor: 'Healthy Operations',
  },
];

const SAMPLE_VENDOR_EVALUATIONS: VendorPerformanceItem[] = [
  {
    vendorId: 'vend-audio-01',
    vendorName: 'Creative Technology Middle East',
    discipline: 'Audio & PA Systems',
    priceScore: 4,
    qualityScore: 5,
    deliveryScore: 5,
    responsivenessScore: 4,
    hseScore: 5,
    recommendForFutureProjects: true,
  },
  {
    vendorId: 'vend-scenic-02',
    vendorName: 'Gulf Scenic Fabrication LLC',
    discipline: 'Custom Scenic Carpentry',
    priceScore: 3,
    qualityScore: 4,
    deliveryScore: 4,
    responsivenessScore: 4,
    hseScore: 4,
    recommendForFutureProjects: true,
  },
  {
    vendorId: 'vend-power-03',
    vendorName: 'Al-Jaber Heavy Power Solutions',
    discipline: 'Generators & Power Distribution',
    priceScore: 4,
    qualityScore: 4,
    deliveryScore: 3,
    responsivenessScore: 3,
    hseScore: 4,
    recommendForFutureProjects: true,
  },
];

@Controller('portfolio/intelligence')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class PortfolioIntelligenceController {
  @Get('risk-matrix')
  getRiskMatrix(@Req() req: Request): CommandResult<EnterpriseRiskSummaryDto> {
    const summary = PortfolioIntelligenceEngine.evaluatePortfolioRisk(SAMPLE_PROJECT_HEALTH);

    return {
      data: {
        id: 'portfolio-risk-matrix',
        status: 'evaluated',
        recordVersion: 1,
        payload: summary,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-risk-matrix',
      },
    };
  }

  @Get('vendor-rankings')
  getVendorRankings(@Req() req: Request): CommandResult<VendorPerformanceRankingDto[]> {
    const rankings = PortfolioIntelligenceEngine.rankVendors(SAMPLE_VENDOR_EVALUATIONS);

    return {
      data: {
        id: 'vendor-rankings-leaderboard',
        status: 'ranked',
        recordVersion: 1,
        payload: rankings as any,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-vendor-rankings',
      },
    };
  }
}
