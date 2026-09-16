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
  WorkflowDefinitionSchema,
  WorkflowTransitionEvaluateSchema,
  WorkflowTransitionResultDto,
  CommandResult,
} from '@e3-eos/contracts';
import {
  WorkflowBuilderEngine,
  WorkflowDefinition,
  STANDARD_THIRTEEN_STAGE_TEMPLATE,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';

export const workflowRepository = new Map<string, WorkflowDefinition>([
  [
    'WF-STANDARD-13-STAGE',
    {
      workflowCode: 'WF-STANDARD-13-STAGE',
      name: 'Canonical 13-Stage Event Lifecycle',
      description: 'Standard versioned 13-stage gated event lifecycle conforming to Qatar National Celebrations and ISO 20121 governance.',
      isDefault: true,
      stages: STANDARD_THIRTEEN_STAGE_TEMPLATE.stages.map((s, idx) => ({
        stageCode: s.templateStageId.toLowerCase(),
        name: s.name,
        order: idx + 1,
        requiredActivities: [`act_${s.templateStageId.toLowerCase()}_init`],
        requiredGateApprovals: (idx + 1 === 5 || idx + 1 === 9 || idx + 1 === 10 || idx + 1 === 13)
          ? ['executive_director', 'operations_lead']
          : [],
      })),
    },
  ],
  [
    'WF-STANDARD-COMMERCIAL',
    {
      workflowCode: 'WF-STANDARD-COMMERCIAL',
      name: 'Standard Commercial Event Delivery',
      description: 'Default 10-stage gated delivery workflow for turnkey public and corporate events.',
      isDefault: false,
      stages: [
        {
          stageCode: 'opportunity',
          name: 'Opportunity & Intake',
          order: 1,
          requiredActivities: ['intake_brief', 'initial_client_meeting'],
          requiredGateApprovals: ['client_commercial_lead'],
        },
        {
          stageCode: 'requirements',
          name: 'Requirements & Scope',
          order: 2,
          requiredActivities: ['tender_document_extraction', 'scope_matrix_finalized'],
          requiredGateApprovals: ['head_of_production'],
        },
        {
          stageCode: 'design',
          name: 'Design & Spatial CAD',
          order: 3,
          requiredActivities: ['technical_drawings', 'spatial_rigging_approval'],
          requiredGateApprovals: ['lead_architect', 'client_creative_director'],
        },
        {
          stageCode: 'commercial',
          name: 'Commercial BOQ & Baseline',
          order: 4,
          requiredActivities: ['boq_rate_verification', 'supplier_quotes_locked'],
          requiredGateApprovals: ['commercial_director'],
        },
        {
          stageCode: 'procurement',
          name: 'Procurement & Purchase Orders',
          order: 5,
          requiredActivities: ['rfq_bid_matrix', 'po_issuance_under_budget'],
          requiredGateApprovals: ['procurement_manager'],
        },
        {
          stageCode: 'production',
          name: 'Workshop & Scenic Fabrication',
          order: 6,
          requiredActivities: ['material_sample_signoff', 'factory_qc_inspection'],
          requiredGateApprovals: ['workshop_manager'],
        },
        {
          stageCode: 'site_ops',
          name: 'Site Delivery & Build',
          order: 7,
          requiredActivities: ['site_permit_cleared', 'safety_induction_complete', 'rigging_snag_cleared'],
          requiredGateApprovals: ['hse_director', 'venue_manager'],
        },
        {
          stageCode: 'live_event',
          name: 'Live Show Execution',
          order: 8,
          requiredActivities: ['opening_authorization_gate', 'master_run_sheet_locked'],
          requiredGateApprovals: ['show_caller', 'event_director'],
        },
        {
          stageCode: 'bump_out',
          name: 'Bump-Out & Operational Closeout',
          order: 9,
          requiredActivities: ['venue_handover_inspection', 'asset_return_to_warehouse'],
          requiredGateApprovals: ['logistics_lead', 'venue_manager'],
        },
        {
          stageCode: 'financial_closeout',
          name: 'Commercial Closeout & Settlement',
          order: 10,
          requiredActivities: ['supplier_invoices_reconciled', 'client_final_billing_issued', 'lessons_learned_logged'],
          requiredGateApprovals: ['commercial_director', 'managing_director'],
        },
      ],
    },
  ],
  [
    'WF-FAST-TRACK-VIP',
    {
      workflowCode: 'WF-FAST-TRACK-VIP',
      name: 'Fast-Track Turnkey VIP Activation',
      description: 'Accelerated 5-stage parallel delivery workflow for high-urgency ministerial/VIP activations.',
      isDefault: false,
      stages: [
        {
          stageCode: 'rapid_intake',
          name: 'Rapid Intake & Scope',
          order: 1,
          requiredActivities: ['executive_brief'],
          requiredGateApprovals: ['managing_director'],
        },
        {
          stageCode: 'combined_design_commercial',
          name: 'Integrated Concept & Commercial',
          order: 2,
          requiredActivities: ['rapid_boq', 'venue_clearance'],
          requiredGateApprovals: ['commercial_director'],
        },
        {
          stageCode: 'parallel_delivery',
          name: 'Accelerated Procurement & Site Ops',
          order: 3,
          requiredActivities: ['emergency_po_authorizations', 'hot_site_setup'],
          requiredGateApprovals: ['event_director'],
        },
        {
          stageCode: 'live_execution',
          name: 'Live VIP Activation',
          order: 4,
          requiredActivities: ['vip_protocol_signoff'],
          requiredGateApprovals: ['protocol_lead'],
        },
        {
          stageCode: 'commercial_settlement',
          name: 'Final Commercial Settlement',
          order: 5,
          requiredActivities: ['three_way_match_completion', 'final_pnl_reconciliation'],
          requiredGateApprovals: ['managing_director'],
        },
      ],
    },
  ],
]);

@Controller('workflows')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class WorkflowBuilderController {
  @Get()
  listWorkflows(@Req() req: Request): CommandResult<WorkflowDefinition[]> {
    return {
      data: {
        id: 'workflow-list',
        status: 'active',
        recordVersion: 1,
        payload: Array.from(workflowRepository.values()),
      },
      meta: {
        requestId: (req?.headers?.['x-request-id'] as string) || 'req-wf-list',
      },
    };
  }

  @Post()
  createWorkflow(
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<WorkflowDefinition> {
    const parseResult = WorkflowDefinitionSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const wf = parseResult.data as WorkflowDefinition;
    workflowRepository.set(wf.workflowCode, wf);

    return {
      data: {
        id: wf.workflowCode,
        status: 'created',
        recordVersion: 1,
        payload: wf,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-wf-create',
      },
    };
  }

  @Post('evaluate-transition')
  evaluateTransition(
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<WorkflowTransitionResultDto> {
    const parseResult = WorkflowTransitionEvaluateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const defaultWf = workflowRepository.get('WF-STANDARD-COMMERCIAL')!;
    const evaluation = WorkflowBuilderEngine.evaluateTransition(
      defaultWf,
      parseResult.data.currentStage,
      parseResult.data.targetStage,
      parseResult.data.completedActivities,
      parseResult.data.completedSignoffs
    );

    return {
      data: {
        id: `eval-${Date.now()}`,
        status: evaluation.status,
        recordVersion: 1,
        payload: evaluation,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-eval-trans',
      },
    };
  }
}
