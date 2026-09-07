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
  WebhookEventSchema,
  MetricObservationSchema,
  CalendarProposalSchema,
  CommandResult,
} from '@e3-eos/contracts';
import {
  WebhookSecurityEngine,
  MetricsAggregationEngine,
  ConnectorAdapterEngine,
  CalendarConflictEngine,
  AttendanceMetricsResult,
  ExternalConnectorHealth,
  CalendarReconciliationProposal,
  TicketScanRecord,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';

export const processedWebhookIds = new Set<string>();
export const metricObservationRepository = new Map<string, AttendanceMetricsResult & { projectId: string }>();
export const calendarProposalRepository = new Map<string, CalendarReconciliationProposal>();

@Controller()
@UseFilters(ProblemDetailsFilter)
export class IntegrationsController {
  // --- Webhooks & Replay Protection (AT-072) ---

  @Post('webhooks/:provider')
  handleWebhook(
    @Param('provider') _provider: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<{ eventId: string; status: string }> {
    const parseResult = WebhookEventSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const expectedSecret = 'whsec_prod_key_2026';

    // Invariant AT-072: Verify signature
    const isValidSignature = WebhookSecurityEngine.verifySignature(
      expectedSecret,
      parseResult.data.signature,
      JSON.stringify(parseResult.data.payload)
    );

    if (!isValidSignature) {
      throw new HttpException(
        { message: 'FORGED_OR_INVALID_WEBHOOK_SIGNATURE' },
        HttpStatus.UNAUTHORIZED
      );
    }

    // Invariant AT-072: Replay deduplication
    const deduplication = WebhookSecurityEngine.processWebhookIdempotently(
      parseResult.data.eventId,
      processedWebhookIds
    );

    return {
      data: {
        id: parseResult.data.eventId,
        status: deduplication.status,
        recordVersion: 1,
        payload: {
          eventId: parseResult.data.eventId,
          status: deduplication.status,
        },
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-webhook',
      },
    };
  }

  // --- Ticketing & Metrics Aggregation (AT-074) ---

  @Post('projects/:projectId/metric-observations')
  @UseGuards(TenantIsolationGuard)
  recordMetricObservation(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<AttendanceMetricsResult> {
    const parseResult = MetricObservationSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    const scanRecords: TicketScanRecord[] = parseResult.data.scans.map((s) => ({
      ticketId: s.ticketId,
      attendeeId: s.attendeeId,
      day: s.day,
      gate: s.gate,
      timestamp: new Date(s.timestamp),
    }));

    // Invariant AT-074: Prevent summing daily uniques into false unique festival attendees
    const metrics = MetricsAggregationEngine.aggregateAttendance(scanRecords);
    const obsId = `obs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    metricObservationRepository.set(obsId, { ...metrics, projectId });

    return {
      data: {
        id: obsId,
        status: 'calculated',
        recordVersion: 1,
        payload: metrics,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-metrics',
      },
    };
  }

  // --- External Connector Health & Fallback (AT-073, AT-075) ---

  @Get('connectors/:id/health')
  getConnectorHealth(
    @Param('id') connectorId: string,
    @Req() req: Request
  ): CommandResult<ExternalConnectorHealth> {
    let health: ExternalConnectorHealth;

    if (connectorId.toLowerCase().includes('bookingqube')) {
      // Invariant AT-073: BookingQube unverified -> provisional manual import without fake live metric
      const isApiVerified = req.headers['x-api-verified'] === 'true';
      health = ConnectorAdapterEngine.evaluateBookingQubeHealth(isApiVerified, true);
    } else if (connectorId.toLowerCase().includes('metricool')) {
      // Invariant AT-075: Metricool tier lacks API or is stale -> provisional disclosure
      const hasApiPlan = req.headers['x-has-api-plan'] === 'true';
      const ageHours = parseInt((req.headers['x-sync-age-hours'] as string) || '48', 10);
      health = ConnectorAdapterEngine.evaluateMetricoolHealth(hasApiPlan, ageHours);
    } else {
      health = {
        connectorType: 'GoogleCalendar',
        status: 'active',
        hasApiAccess: true,
        lastSyncedAt: new Date(),
      };
    }

    return {
      data: {
        id: connectorId,
        status: health.status,
        recordVersion: 1,
        payload: health,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-conn-health',
      },
    };
  }

  // --- Google Calendar Reconciliation Proposals (AT-076) ---

  @Post('projects/:projectId/calendar/proposals')
  @UseGuards(TenantIsolationGuard)
  createCalendarProposal(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Req() req: Request
  ): CommandResult<CalendarReconciliationProposal> {
    const parseResult = CalendarProposalSchema.safeParse(body);
    if (!parseResult.success) {
      throw new HttpException(
        { message: 'VALIDATION_FAILED', errors: parseResult.error.errors },
        HttpStatus.BAD_REQUEST
      );
    }

    // Invariant AT-076: External calendar changes create a proposal for review, not silent baseline overwrite
    const proposal = CalendarConflictEngine.generateReconciliationProposal(
      projectId,
      parseResult.data.externalEventId,
      {
        start: new Date(parseResult.data.baselineStart),
        end: new Date(parseResult.data.baselineEnd),
      },
      {
        start: new Date(parseResult.data.externalStart),
        end: new Date(parseResult.data.externalEnd),
      }
    );

    calendarProposalRepository.set(proposal.proposalId, proposal);

    return {
      data: {
        id: proposal.proposalId,
        status: proposal.status,
        recordVersion: 1,
        payload: proposal,
      },
      meta: {
        requestId: (req.headers['x-request-id'] as string) || 'req-cal-prop',
      },
    };
  }
}
