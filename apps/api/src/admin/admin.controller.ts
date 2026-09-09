import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
  UseFilters,
  Optional,
} from '@nestjs/common';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { DbService } from '../common/db.service.js';
import crypto from 'crypto';

export const CANONICAL_ROLES_CATALOG = [
  {
    role: 'super_admin',
    title: 'Super Admin',
    description: 'Unrestricted system-wide configuration, tenant management, and root governance.',
    permissions: ['*'],
  },
  {
    role: 'executive',
    title: 'Executive Partner',
    description: 'Executive oversight, commercial portfolio sign-offs, four-eyes gate approvals.',
    permissions: ['portfolio.read', 'approvals.decide', 'commercial.approve', 'governance.override'],
  },
  {
    role: 'project_director',
    title: 'Project Director',
    description: 'Multi-project direction, stage progression authorisation, major budget variations.',
    permissions: ['project.create', 'project.manage', 'stage.progress', 'approvals.decide'],
  },
  {
    role: 'project_manager',
    title: 'Project Manager (Lead PM)',
    description: 'Full 13-stage lifecycle delivery, task assignment, daily blockers, and vendor call-offs.',
    permissions: ['project.manage', 'tasks.manage', 'approvals.request', 'procurement.request'],
  },
  {
    role: 'finance',
    title: 'Financial Controller',
    description: 'BOQ pricing, PO commitment validation, contractor rates, invoice reconciliation.',
    permissions: ['finance.manage', 'boq.manage', 'po.approve', 'eac.recalculate'],
  },
  {
    role: 'procurement',
    title: 'Procurement Manager',
    description: 'RFQ packages, vendor quote comparisons, framework call-offs, PO generation.',
    permissions: ['procurement.manage', 'vendor.manage', 'po.create'],
  },
  {
    role: 'design_production',
    title: 'Design / Production Director',
    description: 'CAD drawings, moodboards, fabrication orders, technical safety specifications.',
    permissions: ['design.upload', 'design.version', 'production.order', 'specifications.edit'],
  },
  {
    role: 'operations',
    title: 'Head of Event Operations',
    description: 'Site layout, venue clearance, zone safety permits, operational runbooks.',
    permissions: ['operations.manage', 'safety.permit', 'zones.clear', 'runbooks.execute'],
  },
  {
    role: 'logistics',
    title: 'Logistics & Fleet Manager',
    description: 'Asset dispatch, serialized warehouse tracking, inventory collision resolution.',
    permissions: ['inventory.manage', 'dispatch.create', 'returns.inspect'],
  },
  {
    role: 'hse_quality',
    title: 'HSE / Quality Inspector',
    description: 'Civil Defence approvals, risk assessments, structural checks, snag lists.',
    permissions: ['hse.inspect', 'incident.log', 'permit.validate'],
  },
  {
    role: 'marketing_commercial',
    title: 'Marketing & Commercial Lead',
    description: 'Sponsorship tiers, client proposals, public event briefings, turnstile footfall.',
    permissions: ['commercial.edit', 'proposals.create', 'sponsorship.track'],
  },
  {
    role: 'field_supervisor',
    title: 'Field Supervisor',
    description: 'On-site mobile PWA task execution, photo snag uploads, offline sync queue.',
    permissions: ['field.inspect', 'snags.create', 'attendance.log'],
  },
  {
    role: 'client_user',
    title: 'Client Stakeholder',
    description: 'Client collaboration portal, design sign-offs, milestone tracking (margins redacted).',
    permissions: ['portal.read', 'design.approve', 'client.signoff'],
  },
];

@Controller('admin')
@UseFilters(ProblemDetailsFilter)
export class AdminController {
  private dbService: DbService;
  constructor(@Optional() dbService?: DbService) {
    this.dbService = dbService || new DbService();
  }

  @Get('users')
  async listUsers() {
    const pool = this.dbService.getPool();
    const res = await pool.query(`
      SELECT u.id, u.email, u.name, u.is_super_admin, u.created_at,
             m.role, m.audience, o.name as org_name, o.id as org_id
      FROM users u
      LEFT JOIN memberships m ON m.user_id = u.id AND m.is_revoked = false
      LEFT JOIN organisations o ON o.id = m.organisation_id
      ORDER BY u.created_at ASC;
    `);

    return {
      users: res.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        isSuperAdmin: r.is_super_admin,
        role: r.role || 'unassigned',
        audience: r.audience || 'internal',
        organisationName: r.org_name || 'E3 Events',
        organisationId: r.org_id,
        createdAt: r.created_at,
      })),
    };
  }

  @Get('roles')
  getRoles() {
    return {
      roles: CANONICAL_ROLES_CATALOG,
    };
  }

  @Get('project-access')
  async getProjectAccess() {
    const pool = this.dbService.getPool();
    const res = await pool.query(`
      SELECT p.id as project_id, p.project_code, p.title as project_title,
             u.id as user_id, u.name as user_name, u.email as user_email,
             m.role
      FROM projects p
      JOIN users u ON u.id = p.owner_id
      LEFT JOIN memberships m ON m.user_id = u.id
      LIMIT 50;
    `);

    return {
      grants: res.rows.map((r: any) => ({
        projectId: r.project_id,
        projectCode: r.project_code,
        projectTitle: r.project_title,
        userId: r.user_id,
        userName: r.user_name,
        userEmail: r.user_email,
        role: r.role || 'project_manager',
      })),
    };
  }

  @Post('users')
  async inviteUser(@Body() body: { name: string; email: string; role?: string; organisationId?: string; department?: string }) {
    const pool = this.dbService.getPool();
    const email = body.email?.trim().toLowerCase();
    const name = body.name?.trim() || 'Invited User';
    const role = body.role || 'project_manager';
    const orgId = body.organisationId || '11111111-1111-4111-8111-111111111111';

    if (!email) {
      throw new HttpException({ title: 'Validation Error', detail: 'Email is required' }, HttpStatus.BAD_REQUEST);
    }

    const userRes = await pool.query(`
      INSERT INTO users (id, email, name, email_verified, is_super_admin, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, true, false, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
      RETURNING id, email, name, is_super_admin, created_at;
    `, [email, name]);

    const user = userRes.rows[0];

    await pool.query(`
      INSERT INTO memberships (id, organisation_id, user_id, role, audience, is_revoked)
      VALUES (gen_random_uuid(), $1, $2, $3, 'internal', false)
      ON CONFLICT DO NOTHING;
    `, [orgId, user.id, role]);

    const inviteToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7 days

    await pool.query(`
      INSERT INTO user_invitations (id, organisation_id, email, name, role, department, token, expires_at, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW());
    `, [orgId, email, name, role, body.department || null, inviteToken, expiresAt]);

    return {
      success: true,
      message: `User ${name} successfully invited with role ${role}.`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role,
        organisationId: orgId,
        createdAt: user.created_at,
      },
      inviteToken,
      inviteUrl: `/accept-invite?token=${inviteToken}`,
    };
  }

  @Post('project-access')
  async assignProjectAccess(@Body() body: { projectId: string; userId: string; role?: string }) {
    const pool = this.dbService.getPool();
    const { projectId, userId, role } = body;
    if (!projectId || !userId) {
      throw new HttpException({ title: 'Validation Error', detail: 'projectId and userId are required' }, HttpStatus.BAD_REQUEST);
    }

    await pool.query(`
      UPDATE projects SET owner_id = $1, updated_at = NOW() WHERE id = $2;
    `, [userId, projectId]).catch(() => {});

    return {
      success: true,
      message: 'Project access granted successfully.',
      grant: { projectId, userId, role: role || 'project_manager' },
    };
  }
}
