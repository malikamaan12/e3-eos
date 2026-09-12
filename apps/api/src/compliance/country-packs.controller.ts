import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpException,
  HttpStatus,
  UseGuards,
  UseFilters,
} from '@nestjs/common';
import { Request } from 'express';
import {
  CountryComplianceCheckSchema,
  CountryComplianceResultDto,
  CommandResult,
} from '@e3-eos/contracts';
import {
  CountryPackEngine,
  CANONICAL_COUNTRY_PACKS,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';

@Controller('compliance/country-packs')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class CountryPacksController {
  @Get()
  listPacks(@Req() req: Request): CommandResult<any> {
    return {
      data: {
        id: 'country-packs-directory',
        status: 'active',
        recordVersion: 1,
        payload: Object.values(CANONICAL_COUNTRY_PACKS),
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-country-packs',
      },
    };
  }

  @Post('check')
  checkCompliance(
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<CountryComplianceResultDto> {
    const parseResult = CountryComplianceCheckSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const check = CountryPackEngine.validateCompliance(parseResult.data);

    return {
      data: {
        id: `check-${Date.now()}`,
        status: check.isCompliant ? 'compliant' : 'violations_detected',
        recordVersion: 1,
        payload: check,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-country-check',
      },
    };
  }
}
