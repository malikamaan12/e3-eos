import {
  Controller,
  Post,
  Body,
  Req,
  HttpException,
  HttpStatus,
  UseGuards,
  UseFilters,
} from '@nestjs/common';
import { Request } from 'express';
import {
  PolicySimulationRequestSchema,
  PolicySimulationResultDto,
  CommandResult,
} from '@e3-eos/contracts';
import {
  PolicySimulatorEngine,
  HistoricalTransactionRecord,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';

const SAMPLE_HISTORICAL_TRANSACTIONS: HistoricalTransactionRecord[] = [
  { projectId: 'prj-01', spendAmount: 45000, isSoleSource: true, variationAmount: 25000, crewDailyHoursLogged: 9, grossMarginPercent: 28 },
  { projectId: 'prj-02', spendAmount: 75000, isSoleSource: true, variationAmount: 120000, crewDailyHoursLogged: 11, grossMarginPercent: 22 },
  { projectId: 'prj-03', spendAmount: 180000, isSoleSource: false, variationAmount: 40000, crewDailyHoursLogged: 10, grossMarginPercent: 31 },
  { projectId: 'prj-04', spendAmount: 32000, isSoleSource: true, variationAmount: 15000, crewDailyHoursLogged: 8, grossMarginPercent: 26 },
  { projectId: 'prj-05', spendAmount: 95000, isSoleSource: true, variationAmount: 185000, crewDailyHoursLogged: 12, grossMarginPercent: 19 },
  { projectId: 'prj-06', spendAmount: 12000, isSoleSource: false, variationAmount: 0, crewDailyHoursLogged: 7, grossMarginPercent: 35 },
  { projectId: 'prj-07', spendAmount: 64000, isSoleSource: true, variationAmount: 50000, crewDailyHoursLogged: 10, grossMarginPercent: 27 },
  { projectId: 'prj-08', spendAmount: 210000, isSoleSource: false, variationAmount: 90000, crewDailyHoursLogged: 10, grossMarginPercent: 29 },
  { projectId: 'prj-09', spendAmount: 88000, isSoleSource: true, variationAmount: 110000, crewDailyHoursLogged: 13, grossMarginPercent: 18 },
  { projectId: 'prj-10', spendAmount: 150000, isSoleSource: false, variationAmount: 60000, crewDailyHoursLogged: 9, grossMarginPercent: 25 },
];

@Controller('governance/simulator')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class PolicySimulatorController {
  @Post('simulate')
  runSimulation(
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<PolicySimulationResultDto> {
    const parseResult = PolicySimulationRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const report = PolicySimulatorEngine.simulatePolicy(
      parseResult.data.policyName,
      parseResult.data.proposedThresholds,
      SAMPLE_HISTORICAL_TRANSACTIONS
    );

    return {
      data: {
        id: report.simulationId,
        status: 'simulation_completed',
        recordVersion: 1,
        payload: report,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-sim-run',
      },
    };
  }
}
