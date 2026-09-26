import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpException,
  HttpStatus,
  UseFilters,
  UseGuards,
  Optional,
  Req,
  Header,
} from '@nestjs/common';
import type { Request } from 'express';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { DbService } from '../common/db.service.js';
import { TenantIsolationGuard, RequireRoles, Public, AllowedAudiences } from '../common/tenant.guard.js';
import { localSyntheticAuthEnabled, readSessionToken } from '../auth/local-synthetic-auth.js';
import { CommercialApprovalPolicyRegistry } from '@e3-eos/policy';
import { normalizeRole, CANONICAL_ROLES, CANONICAL_ROLE_DEFINITIONS } from '@e3-eos/domain';
import { ALLOWED_MEMBERSHIP_ROLES } from '../identity/membership-admin.service.js';
import { ALLOWED_INVITATION_ROLES, invitationDeliveryConfigured } from '../identity/invitation.service.js';

// Reference the permissions used by the domain; this is not a grant or an approval policy.
export const CANONICAL_ROLES_CATALOG = CANONICAL_ROLES.map((role) => ({
  role,
  title: CANONICAL_ROLE_DEFINITIONS[role].title,
  description: role === 'super_admin'
    ? 'Organization administration. Project access, audience restrictions and business approvals remain separate controls.'
    : role === 'project_manager'
      ? 'Project delivery, task coordination and approval requests within assigned scope.'
      : CANONICAL_ROLE_DEFINITIONS[role].description,
  permissions: [...CANONICAL_ROLE_DEFINITIONS[role].permissions],
}));

@Controller('admin')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class AdminController {
  private dbService: DbService;
  constructor(@Optional() dbService?: DbService) {
    this.dbService = dbService || new DbService();
  }

  private async requireCurrentAdmin(req: Request) {
    const organisationId = (req as any)?.organisationId;
    const token = req && readSessionToken(req);
    if (!organisationId || !token) {
      throw new HttpException({ code: 'UNAUTHENTICATED', detail: 'A current authenticated organisation session is required.' }, HttpStatus.UNAUTHORIZED);
    }

    let result;
    try {
      result = await this.dbService.getPool().query(`
        SELECT u.id, u.is_super_admin, m.role, m.audience, m.organisation_id
        FROM sessions s
        INNER JOIN users u ON u.id = s.user_id
        INNER JOIN memberships m ON m.user_id = u.id
        WHERE s.token = $1 AND s.expires_at > NOW()
          AND m.organisation_id = $2 AND m.is_revoked = false
        ORDER BY m.created_at, m.id
        LIMIT 1;
      `, [token, organisationId]);
    } catch {
      throw new HttpException({ code: 'ADMIN_DIRECTORY_UNAVAILABLE', detail: 'Current access could not be verified. Please retry later.' }, HttpStatus.SERVICE_UNAVAILABLE);
    }

    const actor = result.rows[0];
    const role = normalizeRole(actor?.role || '');
    if (!actor || actor.audience !== 'internal' || (!actor.is_super_admin && !['super_admin', 'executive'].includes(role))) {
      throw new HttpException({ code: 'FORBIDDEN_ADMIN_ACCESS', detail: 'Current internal administrative membership is required.' }, HttpStatus.FORBIDDEN);
    }
    return { organisationId, isSuperAdmin: actor.is_super_admin === true, role };
  }

  private unavailable(operation: string, detail: string): never {
    throw new HttpException({ code: 'ADMIN_CAPABILITY_UNAVAILABLE', operation, detail }, HttpStatus.SERVICE_UNAVAILABLE);
  }

  @Get('users')
  @Header('Cache-Control', 'no-store')
  @RequireRoles('super_admin', 'executive')
  @AllowedAudiences('internal')
  async listUsers(@Req() req: Request) {
    const { organisationId } = await this.requireCurrentAdmin(req);
    const pool = this.dbService.getPool();
    let res;
    try {
      res = await pool.query(`
      SELECT u.id, u.email, u.name, u.is_super_admin, u.created_at,
             m.id as membership_id, m.role, m.audience, m.is_revoked, m.row_version,
             m.organisation_id as org_id, o.name as org_name
      FROM users u
      INNER JOIN memberships m ON m.user_id = u.id
      INNER JOIN organisations o ON o.id = m.organisation_id
      WHERE m.organisation_id = $1
      ORDER BY u.created_at ASC, m.id;
    `, [organisationId]);
    } catch {
      throw new HttpException({ code: 'ADMIN_DIRECTORY_UNAVAILABLE', detail: 'The organisation member directory is unavailable. Please retry later.' }, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      users: res.rows.map((r: any) => ({
          id: r.id,
          membershipId: r.membership_id,
          rowVersion: r.row_version,
          name: r.name,
          email: r.email,
          isSuperAdmin: r.is_super_admin,
          role: r.role,
          audience: r.audience,
          isRevoked: r.is_revoked,
          organisationName: r.org_name,
          organisationId: r.org_id,
          createdAt: r.created_at,
        })),
    };
  }

  @Get('access-capabilities')
  @Header('Cache-Control', 'no-store')
  @RequireRoles('super_admin', 'executive')
  @AllowedAudiences('internal')
  async getAccessCapabilities(@Req() req: Request) {
    const actor = await this.requireCurrentAdmin(req);
    const canManageMemberships = actor.isSuperAdmin || actor.role === 'super_admin';
    const canImpersonate = localSyntheticAuthEnabled() && actor.isSuperAdmin;
    const canInvite = canManageMemberships && invitationDeliveryConfigured();
    return {
      canManageMemberships,
      canInvite,
      canCancelInvitations: canManageMemberships,
      allowedInvitationRoles: [...ALLOWED_INVITATION_ROLES],
      canAssignProjectAccess: canManageMemberships,
      canChangeRoles: canManageMemberships,
      canRestoreMemberships: canManageMemberships,
      allowedMembershipRoles: [...ALLOWED_MEMBERSHIP_ROLES],
      canImpersonate,
      disabledReasons: {
        ...(!canInvite ? { invite: canManageMemberships ? 'Encrypted invitation delivery storage is not configured. Invitations cannot be queued.' : 'Only a current internal super administrator can create invitations.' } : {}),
        ...(!canManageMemberships ? { projectAccess: 'Only a current internal super administrator can manage project grants.', roleChange: 'Only a current internal super administrator can change ordinary membership roles.', statusChange: 'Only a current internal super administrator can restore ordinary memberships.' } : {}),
        ...(!canManageMemberships ? { memberships: 'Only a current internal super administrator can revoke memberships.' } : {}),
        ...(!canImpersonate ? { impersonation: 'Identity switching requires a verified super administrator and explicitly enabled local synthetic authentication.' } : {}),
      },
    };
  }

  @Get('roles')
  @Public()
  getRoles() {
    return {
      roles: CANONICAL_ROLES_CATALOG,
    };
  }

  @Get('project-access')
  @RequireRoles('super_admin', 'executive')
  @AllowedAudiences('internal')
  async getProjectAccess() {
    return this.unavailable('project_access.read', 'Project ownership is not an access grant. Use GET /project-access for the scoped access register.');
  }

  @Post('users')
  @RequireRoles('super_admin')
  @AllowedAudiences('internal')
  async inviteUser(@Body() _body: { name: string; email: string; role?: string; organisationId?: string; department?: string }) {
    return this.unavailable('membership.invite', 'This legacy invitation endpoint is unavailable. Use POST /invitations for controlled, audited invitations. This request created no user, membership, or invitation.');
  }

  @Post('project-access')
  @RequireRoles('super_admin', 'executive')
  @AllowedAudiences('internal')
  async assignProjectAccess(@Body() _body: { projectId: string; userId: string; role?: string }) {
    return this.unavailable('project_access.assign', 'This legacy user-based endpoint is unavailable. Use POST /project-access with a membershipId and reason. Project ownership has not been changed.');
  }

  @Post('users/:id/role')
  @RequireRoles('super_admin')
  @AllowedAudiences('internal')
  async updateUserRole(@Param('id') _userId: string, @Body() _body: { role: string }) {
    return this.unavailable('membership.role_change', 'This legacy user-wide endpoint is unavailable. Use POST /memberships/:id/role with reason and expectedVersion. No roles have been changed.');
  }

  @Post('users/:id/status')
  @RequireRoles('super_admin')
  @AllowedAudiences('internal')
  async updateUserStatus(@Param('id') _userId: string, @Body() _body: { isRevoked: boolean }) {
    return this.unavailable('membership.status_change', 'User-wide status changes are unavailable. Use /memberships/:id/revoke or /memberships/:id/restore with the required reason and version.');
  }
  @Get('approval-policies')
  @RequireRoles('super_admin', 'executive', 'finance')
  async listApprovalPolicies() {
    const policies = CommercialApprovalPolicyRegistry.listPolicies();
    return {
      policies,
      total: policies.length,
      defaultPolicyId: 'POL-COMM-QATAR-DEFAULT',
    };
  }

  @Post('approval-policies')
  @RequireRoles('super_admin')
  async registerApprovalPolicy(@Body() body: any) {
    if (!body || !body.policyId || !body.thresholds || !Array.isArray(body.thresholds)) {
      throw new HttpException(
        { title: 'Validation Error', detail: 'policyId and thresholds array are required' },
        HttpStatus.BAD_REQUEST
      );
    }
    const policy = {
      policyId: body.policyId,
      policyVersion: Number(body.policyVersion) || 1,
      organisationId: body.organisationId || undefined,
      countryCode: body.countryCode || undefined,
      businessUnit: body.businessUnit || undefined,
      projectId: body.projectId || undefined,
      transactionType: body.transactionType || '*',
      currency: body.currency || 'QAR',
      effectiveFrom: body.effectiveFrom || new Date().toISOString(),
      status: body.status || 'active',
      thresholds: body.thresholds,
      metadata: body.metadata || {
        approvedBy: 'E3 Governance Board',
        approvedAt: new Date().toISOString(),
        governanceReference: body.governanceReference || `E3-GOV-${Date.now()}`,
      },
    };
    CommercialApprovalPolicyRegistry.registerPolicy(policy);
    return {
      success: true,
      message: `Commercial approval policy ${policy.policyId} v${policy.policyVersion} registered successfully.`,
      policy,
    };
  }
}
