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
  AiCopilotQuerySchema,
  AiCopilotResponseDto,
  CommandResult,
} from '@e3-eos/contracts';
import {
  AiCopilotEngine,
  ProjectDomainContext,
  DataClassification,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { projectRepository } from '../projects/projects.controller.js';

@Controller('projects/:projectId/copilot')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class AiCopilotController {
  private buildMockDomainContext(projectId: string): ProjectDomainContext {
    const prj = projectRepository.get(projectId);
    return {
      projectId,
      projectCode: prj?.projectCode || 'PRJ-DEMO-01',
      title: prj?.title || 'Doha Cultural Festival',
      currentStage: prj?.maturity || 'in_planning',
      requirementsCount: 24,
      unverifiedRequirementsCount: 2,
      documentsCount: 18,
      rfisCount: 5,
      unresolvedRfisCount: 1,
      designsApproved: true,
      boqItemCount: 142,
      committedPoCount: 8,
      activeVendorCount: 6,
      scheduleMilestonesCount: 32,
      productionDeliverablesCount: 15,
      inventoryAssetsAllocated: 84,
      crewCheckedInCount: 45,
      activeSitePermitsCount: 4,
      openIncidentsCount: 1,
      criticalIncidentsCount: 0,
      currentBudget: '1500000',
      postedActualCost: '620000',
      eac: '1420000',
      vac: '80000',
      marginPercent: '26.5',
      operationalClosed: false,
      commerciallyClosed: false,
      lessonsLearnedCount: 4,
    };
  }

  @Post('query')
  queryCopilot(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<AiCopilotResponseDto> {
    const parseResult = AiCopilotQuerySchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const classification = parseResult.data.classification as DataClassification;
    const context = this.buildMockDomainContext(projectId);

    try {
      const evaluation = AiCopilotEngine.evaluateCopilotQuery(
        parseResult.data.query,
        context,
        classification
      );

      return {
        data: {
          id: `copilot-${Date.now()}`,
          status: 'advisory_emitted',
          recordVersion: 1,
          payload: evaluation,
        },
        meta: {
          requestId: (req.headers['x-request-id'] as string) || 'req-copilot',
        },
      };
    } catch (err: any) {
      if (err.message.includes('AI_REQUEST_DISALLOWED_BY_CLASSIFICATION')) {
        throw new HttpException(
          { message: 'AI_REQUEST_DISALLOWED_BY_CLASSIFICATION', detail: err.message },
          HttpStatus.FORBIDDEN
        );
      }
      throw new HttpException({ message: 'COPILOT_EVALUATION_FAILED', detail: err.message }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('next-actions')
  getNextActions(
    @Param('projectId') projectId: string,
    @Req() req: Request
  ): CommandResult<AiCopilotResponseDto> {
    const context = this.buildMockDomainContext(projectId);
    const evaluation = AiCopilotEngine.evaluateCopilotQuery(
      'What are the mandatory next actions and open blockers for this project stage?',
      context,
      'internal'
    );

    return {
      data: {
        id: `next-actions-${Date.now()}`,
        status: 'next_actions_ready',
        recordVersion: 1,
        payload: evaluation,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-next-actions',
      },
    };
  }
}
