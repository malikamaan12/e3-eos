import {
  Controller,
  Get,
  UseFilters,
  Optional,
} from '@nestjs/common';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { DbService } from '../common/db.service.js';

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
}
