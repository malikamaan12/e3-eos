/**
 * Enterprise Role-Based Access Control (RBAC) & Authority Framework
 * Single Source of Truth for E3-EOS Canonical Roles, Capabilities, and Governance Ceilings.
 */

export type CanonicalRole =
  | 'super_admin'
  | 'executive'
  | 'project_director'
  | 'project_manager'
  | 'finance'
  | 'procurement'
  | 'design_production'
  | 'operations'
  | 'logistics'
  | 'hse_quality'
  | 'marketing_commercial'
  | 'field_supervisor'
  | 'client_user';

export const CANONICAL_ROLES: CanonicalRole[] = [
  'super_admin',
  'executive',
  'project_director',
  'project_manager',
  'finance',
  'procurement',
  'design_production',
  'operations',
  'logistics',
  'hse_quality',
  'marketing_commercial',
  'field_supervisor',
  'client_user',
];

// Fine-grained Permission Constants
export const PERM_ADMIN_MANAGE = 'admin.manage';
export const PERM_USERS_PROVISION = 'users.provision';
export const PERM_ROLES_ASSIGN = 'roles.assign';
export const PERM_PROJECTS_MANAGE = 'projects.manage';
export const PERM_PROJECTS_CREATE = 'projects.create';
export const PERM_STAGES_PROGRESS = 'stages.progress';
export const PERM_COMMERCIAL_APPROVE = 'commercial.approve';
export const PERM_PO_CREATE = 'po.create';
export const PERM_PO_APPROVE = 'po.approve';
export const PERM_INVOICES_APPROVE = 'invoices.approve';
export const PERM_BANK_DETAILS_READ = 'bank_details.read';
export const PERM_CONSTRAINTS_VERIFY = 'constraints.verify';
export const PERM_SAFETY_PERMIT = 'safety.permit';
export const PERM_ZONES_CLEAR = 'zones.clear';
export const PERM_INVENTORY_MANAGE = 'inventory.manage';
export const PERM_DESIGN_APPROVE = 'design.approve';
export const PERM_PORTAL_READ = 'portal.read';

export interface RoleDefinition {
  role: CanonicalRole;
  title: string;
  description: string;
  category: 'executive' | 'management' | 'specialist' | 'external';
  authorityCeilingQar: number;
  permissions: string[];
  can: string[];
  cannot: string[];
}

export const CANONICAL_ROLE_DEFINITIONS: Record<CanonicalRole, RoleDefinition> = {
  super_admin: {
    role: 'super_admin',
    title: 'Super Admin',
    description: 'Unrestricted system-wide configuration, tenant management, and root governance.',
    category: 'executive',
    authorityCeilingQar: Infinity,
    permissions: ['*'],
    can: [
      'Configure tenant settings, authentication policies, and security controls',
      'Provision users, assign roles, and audit access permissions',
      'Manage database migrations, feature flags, and system-level integrations',
    ],
    cannot: [
      'Bypass project stage gate approval policies without generating an immutable audit trail',
      'Act as sole approver on commercial transactions where four-eyes principle is enforced',
    ],
  },
  executive: {
    role: 'executive',
    title: 'Executive Partner',
    description: 'Executive oversight, commercial portfolio sign-offs, four-eyes gate approvals.',
    category: 'executive',
    authorityCeilingQar: Infinity, // POL-COMM-03: Major commitments > 250,000 QAR
    permissions: [
      PERM_PROJECTS_CREATE,
      PERM_PROJECTS_MANAGE,
      PERM_STAGES_PROGRESS,
      PERM_COMMERCIAL_APPROVE,
      PERM_PO_APPROVE,
      PERM_INVOICES_APPROVE,
      PERM_BANK_DETAILS_READ,
      PERM_CONSTRAINTS_VERIFY,
      'portfolio.read',
      'approvals.decide',
      'governance.override',
    ],
    can: [
      'Authorize commercial commitments and purchase orders ≥ 250,000 QAR (POL-COMM-03)',
      'Review cross-portfolio executive dashboards and strategic margin reports',
      'Approve final handover stage gates and commercial settlements',
    ],
    cannot: [
      'Directly alter engineering site tasks or field supervisor assignments',
      'Modify database schema or tenant authentication settings',
    ],
  },
  project_director: {
    role: 'project_director',
    title: 'Project Director',
    description: 'Multi-project direction, stage progression authorisation, major budget variations.',
    category: 'management',
    authorityCeilingQar: 250000, // POL-COMM-02: Up to 250,000 QAR
    permissions: [
      PERM_PROJECTS_CREATE,
      PERM_PROJECTS_MANAGE,
      PERM_STAGES_PROGRESS,
      PERM_COMMERCIAL_APPROVE,
      PERM_PO_CREATE,
      PERM_PO_APPROVE,
      PERM_CONSTRAINTS_VERIFY,
      'approvals.decide',
    ],
    can: [
      'Direct multi-project stage progression across all 13 lifecycle stages',
      'Approve project-level variation orders and lead project managers',
      'Approve commercial commitments up to 250,000 QAR',
    ],
    cannot: [
      'Approve single commitments exceeding 250,000 QAR without Executive co-signature',
      'Modify system security or tenant configuration',
    ],
  },
  project_manager: {
    role: 'project_manager',
    title: 'Project Manager (Lead PM)',
    description: 'Full 13-stage lifecycle delivery, task assignment, daily blockers, and vendor call-offs.',
    category: 'management',
    authorityCeilingQar: 50000, // POL-COMM-01: Up to 50,000 QAR
    permissions: [
      PERM_PROJECTS_CREATE,
      PERM_PROJECTS_MANAGE,
      PERM_STAGES_PROGRESS,
      PERM_PO_CREATE,
      PERM_PO_APPROVE,
      'tasks.manage',
      'approvals.request',
      'procurement.request',
    ],
    can: [
      'Manage day-to-day 13-stage project delivery, milestones, and workstreams',
      'Assign and complete project tasks, coordinate vendor call-offs',
      'Submit approval requests and approve commitments up to 50,000 QAR (POL-COMM-01)',
    ],
    cannot: [
      'Approve own commitment requests or self-authorize stage progression',
      'Approve commercial commitments exceeding 50,000 QAR without Finance / Exec escalation',
    ],
  },
  finance: {
    role: 'finance',
    title: 'Financial Controller',
    description: 'BOQ pricing, PO commitment validation, contractor rates, invoice reconciliation.',
    category: 'specialist',
    authorityCeilingQar: 250000, // POL-COMM-02: Up to 250,000 QAR
    permissions: [
      PERM_COMMERCIAL_APPROVE,
      PERM_PO_APPROVE,
      PERM_INVOICES_APPROVE,
      PERM_BANK_DETAILS_READ,
      'finance.manage',
      'boq.manage',
      'eac.recalculate',
    ],
    can: [
      'Approve commercial commitments between 50,000 QAR and 250,000 QAR (POL-COMM-02)',
      'Validate BOQ pricing, baseline costs, and EAC calculations',
      'Authorize supplier payment releases and financial invoice reconciliations',
    ],
    cannot: [
      'Approve commitments ≥ 250,000 QAR without Executive sign-off',
      'Direct site operations or sign off on safety / structural clearance permits',
    ],
  },
  procurement: {
    role: 'procurement',
    title: 'Procurement Manager',
    description: 'RFQ packages, vendor quote comparisons, framework call-offs, PO generation.',
    category: 'specialist',
    authorityCeilingQar: 0, // Procurement drafts and negotiates, but does not self-approve financial release
    permissions: [
      PERM_PO_CREATE,
      PERM_BANK_DETAILS_READ,
      'procurement.manage',
      'vendor.manage',
      'rfq.create',
    ],
    can: [
      'Issue RFQ packages, compare vendor bids, and negotiate supplier framework terms',
      'Create purchase orders and submit for policy-based authorization',
      'Manage vendor ratings, supplier catalog, and performance records',
    ],
    cannot: [
      'Self-authorize purchase orders (requires PM, Finance, or Exec per policy)',
      'Advance project stage gates or modify project scope',
    ],
  },
  design_production: {
    role: 'design_production',
    title: 'Design / Production Director',
    description: 'CAD drawings, moodboards, fabrication orders, technical safety specifications.',
    category: 'specialist',
    authorityCeilingQar: 0,
    permissions: [
      PERM_CONSTRAINTS_VERIFY,
      PERM_DESIGN_APPROVE,
      'design.upload',
      'design.version',
      'production.order',
      'specifications.edit',
    ],
    can: [
      'Upload, version, and manage CAD drawings, 3D renders, and master technical packs',
      'Create workshop fabrication orders and scenic construction specifications',
      'Oversee structural engineering documentation and staging elevations',
    ],
    cannot: [
      'Approve financial budgets or issue external supplier purchase orders',
      'Progress commercial or financial stage gates',
    ],
  },
  operations: {
    role: 'operations',
    title: 'Head of Event Operations',
    description: 'Site layout, venue clearance, zone safety permits, operational runbooks.',
    category: 'specialist',
    authorityCeilingQar: 0,
    permissions: [
      PERM_ZONES_CLEAR,
      'operations.manage',
      'runbooks.execute',
      'runs-sheet.edit',
    ],
    can: [
      'Plan venue layouts, bump-in schedules, and crowd management plans',
      'Coordinate security, emergency services, and venue authority clearances',
      'Clear operational zones for live event activation (Stage 10 Technical Gate)',
    ],
    cannot: [
      'Authorize commercial budget increases or sign off on procurement contracts',
      'Delete audit logs or override financial controls',
    ],
  },
  logistics: {
    role: 'logistics',
    title: 'Logistics & Fleet Manager',
    description: 'Asset dispatch, serialized warehouse tracking, inventory collision resolution.',
    category: 'specialist',
    authorityCeilingQar: 0,
    permissions: [
      PERM_INVENTORY_MANAGE,
      'dispatch.create',
      'returns.inspect',
    ],
    can: [
      'Dispatch serialized warehouse inventory and manage fleet transportation',
      'Scan assets in/out, log asset maintenance, and inspect return conditions',
      'Flag inventory collisions across overlapping project dates',
    ],
    cannot: [
      'Alter project contractual milestones or commercial terms',
      'Authorize procurement purchase orders or approve vendor invoices',
    ],
  },
  hse_quality: {
    role: 'hse_quality',
    title: 'HSE / Quality Inspector',
    description: 'Civil Defence approvals, risk assessments, structural checks, snag lists.',
    category: 'specialist',
    authorityCeilingQar: 0,
    permissions: [
      PERM_SAFETY_PERMIT,
      PERM_CONSTRAINTS_VERIFY,
      'hse.inspect',
      'incident.log',
      'permit.validate',
    ],
    can: [
      'Issue safety permits, Civil Defence compliance certificates, and stop-work orders',
      'Conduct site snag inspections, structural audits, and risk assessments',
      'Enforce mandatory Stage Gate 09 (HSE & Civil Defence Clearance)',
    ],
    cannot: [
      'Waive mandatory government safety requirements',
      'Authorize financial disbursements or modify commercial contracts',
    ],
  },
  marketing_commercial: {
    role: 'marketing_commercial',
    title: 'Marketing & Commercial Lead',
    description: 'Sponsorship tiers, client proposals, public event briefings, turnstile footfall.',
    category: 'specialist',
    authorityCeilingQar: 0,
    permissions: [
      'commercial.edit',
      'proposals.create',
      'sponsorship.track',
    ],
    can: [
      'Manage sponsorship packages, brand activations, and commercial proposals',
      'Track client sponsor ROI, hospitality allocations, and public ticketing data',
      'Update commercial lead pipelines and proposal presentations',
    ],
    cannot: [
      'Issue binding site operational permits or alter engineering runbooks',
      'Access confidential internal supplier cost margins without authorization',
    ],
  },
  field_supervisor: {
    role: 'field_supervisor',
    title: 'Field Supervisor',
    description: 'On-site mobile PWA task execution, photo snag uploads, offline sync queue.',
    category: 'specialist',
    authorityCeilingQar: 0,
    permissions: [
      'field.inspect',
      'snags.create',
      'attendance.log',
    ],
    can: [
      'Execute assigned daily tasks via mobile PWA on-site',
      'Upload photo snag records, incident reports, and log workforce attendance',
      'Sync updates offline/online during active bump-in and live run',
    ],
    cannot: [
      'Approve financial variations, procurement orders, or contractual deliverables',
      'Access executive portfolio financials or sensitive vendor pricing',
    ],
  },
  client_user: {
    role: 'client_user',
    title: 'Client Stakeholder',
    description: 'Client collaboration portal, design sign-offs, milestone tracking (margins redacted).',
    category: 'external',
    authorityCeilingQar: 0,
    permissions: [
      PERM_PORTAL_READ,
      PERM_DESIGN_APPROVE,
      'client.signoff',
    ],
    can: [
      'Access restricted Client Stakeholder Portal to view milestones and deliverables',
      'Review and approve submitted design concepts and creative packages',
      'Sign off on formal stage gate completions (with internal margins redacted)',
    ],
    cannot: [
      'View internal supplier costs, profit margins, or internal team discussions',
      'Access administrative settings, user management, or internal procurement details',
    ],
  },
};

/**
 * Normalizes role string to canonical format, handling legacy aliases.
 */
export function normalizeRole(role: string): string {
  const r = (role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (r === 'financial_controller' || r === 'finance_controller' || r === 'cfo') return 'finance';
  if (r === 'commercial_director' || r === 'managing_director' || r === 'executive_partner') return 'executive';
  if (r === 'director') return 'project_director';
  if (r === 'lead_pm') return 'project_manager';
  return r;
}

/**
 * Checks whether a given role holds a specific fine-grained permission.
 */
export function hasRolePermission(
  role: string,
  permission: string,
  isSuperAdmin: boolean = false
): boolean {
  if (isSuperAdmin) {
    return true;
  }
  const normRole = normalizeRole(role);
  if (normRole === 'super_admin') {
    return true;
  }
  const def = CANONICAL_ROLE_DEFINITIONS[normRole as CanonicalRole];
  if (!def) {
    return false;
  }
  if (def.permissions.includes('*')) {
    return true;
  }
  return def.permissions.includes(permission);
}

/**
 * Returns the maximum commercial financial commitment authority for a role in QAR.
 */
export function getRoleAuthorityCeiling(role: string): number {
  const normRole = normalizeRole(role);
  if (normRole === 'super_admin' || normRole === 'executive') {
    return Infinity;
  }
  const def = CANONICAL_ROLE_DEFINITIONS[normRole as CanonicalRole];
  return def ? def.authorityCeilingQar : 0;
}

/**
 * Evaluates whether an actor can approve a commercial amount according to POL-COMM thresholds.
 */
export function canApproveCommercialAmount(
  role: string,
  amountQar: number,
  isSuperAdmin: boolean = false
): boolean {
  if (isSuperAdmin) {
    return true;
  }
  const normRole = normalizeRole(role);
  if (normRole === 'super_admin') {
    return true;
  }
  const ceiling = getRoleAuthorityCeiling(normRole);
  return amountQar <= ceiling && ceiling > 0;
}

/**
 * Checks Separation of Duties (SoD) between two roles assigned to the same individual.
 * Conflicting role pairings violate governance policies (AT-003, AT-004).
 */
export function isSeparationOfDutiesCompliant(
  primaryRole: string,
  proposedRole: string
): { compliant: boolean; conflictReason?: string } {
  const pNorm = normalizeRole(primaryRole);
  const prNorm = normalizeRole(proposedRole);

  // Same role is not a conflict
  if (pNorm === prNorm) {
    return { compliant: true };
  }

  // Conflict 1: Procurement + Finance (Purchaser cannot approve payment)
  if (
    (pNorm === 'procurement' && prNorm === 'finance') ||
    (pNorm === 'finance' && prNorm === 'procurement')
  ) {
    return {
      compliant: false,
      conflictReason:
        'Separation of Duties Conflict: An individual cannot hold both Procurement and Finance roles simultaneously to prevent unverified financial disbursements (POL-SOD-01).',
    };
  }

  // Conflict 2: Operations / Site + HSE / Quality (Installer cannot sign own safety permit)
  if (
    (pNorm === 'operations' && prNorm === 'hse_quality') ||
    (pNorm === 'hse_quality' && prNorm === 'operations')
  ) {
    return {
      compliant: false,
      conflictReason:
        'Separation of Duties Conflict: Operations Lead cannot hold HSE Inspector authority to ensure independent civil defense and safety auditing (POL-SOD-02).',
    };
  }

  // Conflict 3: Client User + Any Internal Role
  if (pNorm === 'client_user' || prNorm === 'client_user') {
    return {
      compliant: false,
      conflictReason:
        'Tenant Isolation Conflict: External client accounts cannot hold internal operational roles (POL-SOD-03).',
    };
  }

  return { compliant: true };
}

/**
 * Validates whether a role is authorized to view sensitive vendor bank details.
 */
export function canAccessRestrictedBankDetails(
  role: string,
  isSuperAdmin: boolean = false
): boolean {
  if (isSuperAdmin) {
    return true;
  }
  const normRole = normalizeRole(role);
  if (normRole === 'super_admin') {
    return true;
  }
  return ['executive', 'finance', 'procurement'].includes(normRole);
}
