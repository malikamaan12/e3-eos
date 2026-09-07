import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  HttpException,
  HttpStatus,
  UseGuards,
  UseFilters,
} from '@nestjs/common';
import { Request } from 'express';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { IdempotencyGuard } from '../common/idempotency.guard.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';

interface InvitationBody {
  email: string;
  role: string;
  organisationId: string;
}

@Controller()
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class IdentityController {
  private auditLog: any[] = [];
  private memberships = new Map<string, { id: string; userId: string; role: string; isRevoked: boolean }>();

  @Get('me')
  getMe(@Req() req: Request) {
    const userId = (req as any).actorId || 'user-default';
    const orgId = (req as any).organisationId || 'org-default';
    const audience = (req as any).audience || 'internal';

    return {
      data: {
        userId,
        organisationId: orgId,
        audience,
        roles: ['pm_lead', 'configuration_author'],
        permissions: ['identity.read', 'work.read', 'project.create'],
      },
    };
  }

  @Get('my-work')
  getMyWork(@Req() req: Request) {
    const userId = (req as any).actorId || 'user-default';
    return {
      data: {
        userId,
        assignedTasks: [],
        pendingApprovals: [],
        notifications: [],
      },
    };
  }

  @Post('invitations')
  @UseGuards(IdempotencyGuard)
  createInvitation(@Body() body: InvitationBody, @Req() req: Request) {
    if (!body.email || !body.role) {
      throw new HttpException(
        {
          code: 'VALIDATION_ERROR',
          title: 'Invalid invitation payload',
          detail: 'Both email and role are required for user invitations.',
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const invitationId = `inv-${Date.now()}`;
    const auditRecord = {
      action: 'membership.invite',
      email: body.email,
      role: body.role,
      organisationId: body.organisationId || (req as any).organisationId,
      invitedBy: (req as any).actorId,
      createdAt: new Date().toISOString(),
    };
    this.auditLog.push(auditRecord);

    return {
      data: {
        id: invitationId,
        status: 'pending_acceptance',
        email: body.email,
        role: body.role,
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      },
    };
  }

  @Post('memberships/:id/revoke')
  @UseGuards(IdempotencyGuard)
  revokeMembership(@Param('id') membershipId: string, @Req() req: Request) {
    const existing = this.memberships.get(membershipId) || {
      id: membershipId,
      userId: 'user-sample',
      role: 'approver',
      isRevoked: false,
    };

    existing.isRevoked = true;
    this.memberships.set(membershipId, existing);

    this.auditLog.push({
      action: 'membership.revoke',
      membershipId,
      revokedBy: (req as any).actorId,
      revokedAt: new Date().toISOString(),
    });

    return {
      data: {
        id: membershipId,
        status: 'revoked',
        isRevoked: true,
      },
    };
  }

  @Get('audit-events')
  getAuditEvents(@Req() req: Request) {
    const orgId = (req as any).organisationId;
    return {
      data: this.auditLog.filter((e) => !orgId || e.organisationId === orgId),
    };
  }

  @Get('jobs/:id')
  getJob(@Param('id') jobId: string) {
    return {
      data: {
        id: jobId,
        status: 'completed',
        progress: 100,
        result: { summary: 'Background job completed successfully' },
      },
    };
  }
}
