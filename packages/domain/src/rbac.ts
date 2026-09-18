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

/**
 * Standard default password for all canonical development and staging dummy accounts.
 * NOTE: These accounts and credentials are for temporary testing and UAT verification only.
 */
export const DEFAULT_DUMMY_PASSWORD = 'E3#Doha2026!';

/**
 * Metadata definition for a canonical dummy account with credentials.
 */
export interface CanonicalDummyAccount {
  id: string;
  name: string;
  email: string;
  role: CanonicalRole;
  isSuperAdmin: boolean;
  organisationId: string;
  organisationName: string;
  audience: 'internal' | 'client' | 'supplier';
  title: string;
  titleAr: string;
  password: string;
  authorityCeilingQar: number;
  description: string;
  phone?: string;
  department?: string;
  position?: string;
}

/**
 * All 33 local team member accounts configured for temporary testing and role verification.
 */
export const LOCAL_TEAM_ACCOUNTS: CanonicalDummyAccount[] = [
  // 1. Superadmin - Super Admin
  {
    id: '30000000-0000-4000-8000-000000000001',
    name: 'Superadmin',
    email: 'superadmin@eeeqa.com',
    phone: '+974 0000 0000',
    position: 'Super Admin',
    department: 'Executive Administration',
    role: 'super_admin',
    isSuperAdmin: true,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Super Admin / Platform Governance',
    titleAr: 'المدير العام للنظام وحوكمة المنصة',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: Infinity,
    description: 'Unrestricted system-wide configuration, tenant management, bypass permissions, and root governance.',
  },
  // 2. Adil Ahmed - CEO Office — Admin
  {
    id: '30000000-0000-4000-8000-000000000002',
    name: 'Adil Ahmed',
    email: 'adil@eeeqa.com',
    phone: '+974 3325 5817',
    position: 'CEO Office — Admin',
    department: 'CEO Office',
    role: 'executive',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'CEO Office Director / Executive Partner',
    titleAr: 'مدير مكتب الرئيس التنفيذي والشريك التنفيذي',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: Infinity,
    description: 'Executive authority, commercial approvals > 250k QAR, corporate governance, and four-eyes review.',
  },
  // 3. Mohammad Ali - Management — Admin
  {
    id: '30000000-0000-4000-8000-000000000003',
    name: 'Mohammad Ali',
    email: 'm.ali@eeeqa.com',
    phone: '+974 3048 9955',
    position: 'Management — Admin',
    department: 'General Management',
    role: 'project_director',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'General Management & Project Director',
    titleAr: 'المدير التنفيذي وإدارة المشاريع العامة',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 250000,
    description: 'Multi-project direction, stage gate authorisation, major budget variations up to 250,000 QAR.',
  },
  // 4. Ebrahim - Events — Approver
  {
    id: '30000000-0000-4000-8000-000000000004',
    name: 'Ebrahim',
    email: 'pm.events@eeeqa.com',
    phone: '+974 5119 5657',
    position: 'Events — Approver',
    department: 'Event Project Management',
    role: 'project_manager',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Events Lead Project Manager',
    titleAr: 'مدير إدارة المشاريع والفعاليات',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 50000,
    description: 'Full 13-stage lifecycle delivery, task assignment, daily blockers, and commitments up to 50,000 QAR.',
  },
  // 5. Indika Manamendra - Finance — Admin
  {
    id: '30000000-0000-4000-8000-000000000005',
    name: 'Indika Manamendra',
    email: 'finance@eeeqa.com',
    phone: '+974 5041 1263',
    position: 'Finance — Admin',
    department: 'Finance & Control',
    role: 'finance',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Financial Controller',
    titleAr: 'المراقب المالي الرئيسي',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 250000,
    description: 'BOQ pricing, PO commitment validation, 3-way matching, invoice reconciliations up to 250,000 QAR.',
  },
  // 6. Amal - Production — User
  {
    id: '30000000-0000-4000-8000-000000000006',
    name: 'Amal',
    email: 'amal@eeeqa.com',
    phone: '+974 6000 4722',
    position: 'Production — User',
    department: 'Production & Procurement',
    role: 'procurement',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Production & Procurement Specialist',
    titleAr: 'أخصائي الإنتاج والمشتريات والعقود',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'RFQ packages, vendor quote comparisons, framework call-offs, PO generation, supplier rating.',
  },
  // 7. Mohasin - Design — User
  {
    id: '30000000-0000-4000-8000-000000000007',
    name: 'Mohasin',
    email: '3d@eeeqa.com',
    phone: '+974 6686 6939',
    position: 'Design — User',
    department: 'Creative & Technical Design',
    role: 'design_production',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: '3D Design & Technical Specialist',
    titleAr: 'مسؤول التصميم ثلاثي الأبعاد والإنتاج الفني',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'CAD drawings, 3D renders, moodboards, fabrication orders, technical safety specifications.',
  },
  // 8. Lucain - Site Operations — Approver
  {
    id: '30000000-0000-4000-8000-000000000008',
    name: 'Lucain',
    email: 'lucian@eeeqa.com',
    phone: '+974 6640 6725',
    position: 'Site Operations — Approver',
    department: 'Live Site Operations',
    role: 'operations',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Head of Live Site Operations',
    titleAr: 'مدير العمليات الميدانية والتشغيل المباشر',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'Venue logistics, bump-in / bump-out coordination, master run sheet, site zone safety clearances.',
  },
  // 9. Quasain - Logistics — Approver
  {
    id: '30000000-0000-4000-8000-000000000009',
    name: 'Quasain',
    email: 'quasain@eeeqa.com',
    phone: '+974 7730 0039',
    position: 'Logistics — Approver',
    department: 'Logistics & Fleet',
    role: 'logistics',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Logistics & Fleet Director',
    titleAr: 'مدير الخدمات اللوجستية والأسطول',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'Fleet transport coordination, warehouse dispatching, equipment customs clearance, asset staging.',
  },
  // 10. Waqar Bhatti - Site Operations — Supervisor (HSE & Quality)
  {
    id: '30000000-0000-4000-8000-000000000010',
    name: 'Waqar Bhatti',
    email: 'waqar@eeeqa.com',
    phone: '+974 5000 1004',
    position: 'Site Operations — Supervisor',
    department: 'Site Safety & Quality',
    role: 'hse_quality',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Site Safety & Quality Inspector',
    titleAr: 'مشرف السلامة الميدانية وتفتيش الجودة',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'Civil Defence compliance, structural safety checks, fire retardancy certs, incident logging.',
  },
  // 11. Ahmad Faraz - Marketing — Admin
  {
    id: '30000000-0000-4000-8000-000000000011',
    name: 'Ahmad Faraz',
    email: 'ahmad@eeeqa.com',
    phone: '+974 5030 9247',
    position: 'Marketing — Admin',
    department: 'Marketing & Commercial',
    role: 'marketing_commercial',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Commercial & Marketing Lead',
    titleAr: 'مدير التسويق والعقود التجارية',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'Client proposals, contract negotiation, brand sponsorship packages, milestone delivery tracking.',
  },
  // 12. Louie - Planner — Supervisor
  {
    id: '30000000-0000-4000-8000-000000000012',
    name: 'Louie',
    email: 'louie@eeeqa.com',
    phone: '+974 5000 1008',
    position: 'Planner — Supervisor',
    department: 'Site Operations Planning',
    role: 'field_supervisor',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Lead Site Planner & Field Supervisor',
    titleAr: 'رئيس تخطيط المواقع والمشرف الميداني',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'On-site mobile PWA task execution, photo snag uploads, workforce attendance (bank details masked).',
  },
  // 13. Anton - Client Approval (ATW)
  {
    id: '30000000-0000-4000-8000-000000000013',
    name: 'Anton',
    email: 'anton@atw.com',
    phone: '+974 (Client Portal)',
    position: 'Client Approval',
    department: 'Around The World (ATW Client)',
    role: 'client_user',
    isSuperAdmin: false,
    organisationId: '22222222-2222-4222-8222-222222222222',
    organisationName: 'Around The World (ATW Client)',
    audience: 'client',
    title: 'Client Project Approver',
    titleAr: 'مسؤول اعتمادات العميل (ATW)',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'Client collaboration portal, creative package approvals, milestone sign-offs (supplier costs redacted).',
  },
  // 14. Luke - Client Finance (ATW)
  {
    id: '30000000-0000-4000-8000-000000000014',
    name: 'Luke',
    email: 'luke@atw.com',
    phone: '+974 (Client Portal)',
    position: 'Client Finance',
    department: 'Around The World (ATW Client)',
    role: 'client_user',
    isSuperAdmin: false,
    organisationId: '22222222-2222-4222-8222-222222222222',
    organisationName: 'Around The World (ATW Client)',
    audience: 'client',
    title: 'Client Finance Director',
    titleAr: 'المدير المالي لممثل العميل (ATW)',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'Client billing review, payment schedules, milestones sign-off, budget transparency portal.',
  },
  // 15. Rosebelt - Site Operations — Supervisor
  {
    id: '30000000-0000-4000-8000-000000000015',
    name: 'Rosebelt',
    email: 'rosebelt@eeeqa.com',
    phone: '+974 5000 1007',
    position: 'Site Operations — Supervisor',
    department: 'Site Operations',
    role: 'field_supervisor',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Site Operations Supervisor',
    titleAr: 'مشرف العمليات الميدانية',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'Live field checklist completion, build supervision, contractor briefing, safety verification.',
  },
  // 16. Pawu - Site Operations — Supervisor
  {
    id: '30000000-0000-4000-8000-000000000016',
    name: 'Pawu',
    email: 'pawu@eeeqa.com',
    phone: '+974 5000 1006',
    position: 'Site Operations — Supervisor',
    department: 'Site Operations',
    role: 'field_supervisor',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Site Operations Supervisor',
    titleAr: 'مشرف العمليات الميدانية',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'Site safety, material handling, equipment verification, mobile PWA snag resolution.',
  },
  // 17. Zaryab - Site Operations — Supervisor
  {
    id: '30000000-0000-4000-8000-000000000017',
    name: 'Zaryab',
    email: 'zaryab@eeeqa.com',
    phone: '+974 5000 1005',
    position: 'Site Operations — Supervisor',
    department: 'Site Operations',
    role: 'field_supervisor',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Site Operations Supervisor',
    titleAr: 'مشرف العمليات الميدانية',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'Stage build coordination, live operational monitoring, access control verification.',
  },
  // 18. Ashfaq - Site Operations — Supervisor
  {
    id: '30000000-0000-4000-8000-000000000018',
    name: 'Ashfaq',
    email: 'ashfaq@eeeqa.com',
    phone: '+974 5000 1003',
    position: 'Site Operations — Supervisor',
    department: 'Site Operations',
    role: 'field_supervisor',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Site Operations Supervisor',
    titleAr: 'مشرف العمليات الميدانية',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'Field execution, rigging safety inspection, live event shift coordination.',
  },
  // 19. Ashgar Bhatti - Site Operations — Supervisor
  {
    id: '30000000-0000-4000-8000-000000000019',
    name: 'Ashgar Bhatti',
    email: 'ashgarbhatti@eeeqa.com',
    phone: '+974 5000 1002',
    position: 'Site Operations — Supervisor',
    department: 'Site Operations',
    role: 'field_supervisor',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Site Operations Supervisor',
    titleAr: 'مشرف العمليات الميدانية',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'Site logistics dispatch, vendor unloading inspection, crowd management compliance.',
  },
  // 20. Mary - Site Operations — Supervisor
  {
    id: '30000000-0000-4000-8000-000000000020',
    name: 'Mary',
    email: 'mary@eeeqa.com',
    phone: '+974 5000 1001',
    position: 'Site Operations — Supervisor',
    department: 'Site Operations',
    role: 'field_supervisor',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Site Operations Supervisor',
    titleAr: 'مشرفة العمليات الميدانية',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'Hospitality area setup, front-of-house coordination, operational readiness verification.',
  },
  // 21. Waqar - Site Operations — User
  {
    id: '30000000-0000-4000-8000-000000000021',
    name: 'Waqar',
    email: 'supervisor@eeeqa.com',
    phone: '+974 5123 4705',
    position: 'Site Operations — User',
    department: 'Site Operations',
    role: 'field_supervisor',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Live Site Field Supervisor',
    titleAr: 'مشرف الموقع الميداني المباشر',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'PWA task progress logging, instant issue escalation, on-ground contractor supervision.',
  },
  // 22. Abdullah - Finance — Admin
  {
    id: '30000000-0000-4000-8000-000000000022',
    name: 'Abdullah',
    email: 'accounts@eeeqa.com',
    phone: '+974 6678 2786',
    position: 'Finance — Admin',
    department: 'Accounts & Finance',
    role: 'finance',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Senior Accountant & Finance Admin',
    titleAr: 'محاسب أول وإدارة الحسابات والمالية',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 50000,
    description: 'Invoice verification, vendor payment matching, operational cash tracking, financial auditing.',
  },
  // 23. Souhayel - Sales — User
  {
    id: '30000000-0000-4000-8000-000000000023',
    name: 'Souhayel',
    email: 'sales@eeeqa.com',
    phone: '+974 7211 0304',
    position: 'Sales — User',
    department: 'Commercial & Sales',
    role: 'marketing_commercial',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Sales & Client Relations Executive',
    titleAr: 'مسؤول المبيعات وعلاقات العملاء',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'Client proposals, corporate sponsor packages, event commercial agreements, RFQ responses.',
  },
  // 24. Nicole - Marketing — User
  {
    id: '30000000-0000-4000-8000-000000000024',
    name: 'Nicole',
    email: 'nicole@eeeqa.com',
    phone: '+974 5093 9334',
    position: 'Marketing — User',
    department: 'Marketing & PR',
    role: 'marketing_commercial',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Marketing Specialist',
    titleAr: 'أخصائية التسويق والاتصال المؤسسي',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'Public relations, media campaigns, event promotion, audience engagement strategies.',
  },
  // 25. Basil Ahmed - Marketing — User
  {
    id: '30000000-0000-4000-8000-000000000025',
    name: 'Basil Ahmed',
    email: 'basil@eeeqa.com',
    phone: '+974 6655 0842',
    position: 'Marketing — User',
    department: 'Marketing & Digital',
    role: 'marketing_commercial',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Digital Marketing Specialist',
    titleAr: 'أخصائي التسويق الرقمي',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'Digital channels, event microsites, analytics, social media broadcasting.',
  },
  // 26. Sufiyan - Marketing — User (Media & Video)
  {
    id: '30000000-0000-4000-8000-000000000026',
    name: 'Sufiyan',
    email: 'video@eeeqa.com',
    phone: '+974 3390 7736',
    position: 'Marketing — User',
    department: 'Media & Production',
    role: 'design_production',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Media & Video Producer',
    titleAr: 'منتج الوسائط والمحتوى المرئي',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'Live broadcast capture, highlight reels, screen content management, AV technical assets.',
  },
  // 27. Amaan Malik - Branding — User
  {
    id: '30000000-0000-4000-8000-000000000027',
    name: 'Amaan Malik',
    email: 'amaan@eeeqa.com',
    phone: '+974 5587 5904',
    position: 'Branding — User',
    department: 'Brand Design',
    role: 'design_production',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Creative Branding Lead',
    titleAr: 'مسؤول التصميم والهوية البصرية',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'Brand identity guidelines, scenic signage layout, environmental graphics, visual QA.',
  },
  // 28. Rajan - IT — Approver
  {
    id: '30000000-0000-4000-8000-000000000028',
    name: 'Rajan',
    email: 'rajan@eeeqa.com',
    phone: '+974 3007 7074',
    position: 'IT — Approver',
    department: 'IT Infrastructure',
    role: 'super_admin',
    isSuperAdmin: true,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'IT Infrastructure & Systems Approver',
    titleAr: 'مدير البنية التحتية وتكنولوجيا المعلومات',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: Infinity,
    description: 'Network infrastructure, enterprise integrations, server uptime, security credentials governance.',
  },
  // 29. Izan Sahid - IT — User
  {
    id: '30000000-0000-4000-8000-000000000029',
    name: 'Izan Sahid',
    email: 'izaan@eeeqa.com',
    phone: '+974 3303 4427',
    position: 'IT — User',
    department: 'IT Support',
    role: 'operations',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'IT Systems & Technical Support Specialist',
    titleAr: 'أخصائي الدعم الفني وتكنولوجيا المعلومات',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'On-site connectivity, PWA field hardware support, scanners, credentials issuance.',
  },
  // 30. Arslan - Logistics — User
  {
    id: '30000000-0000-4000-8000-000000000030',
    name: 'Arslan',
    email: 'arslan@eeeqa.com',
    phone: '+974 3111 7772',
    position: 'Logistics — User',
    department: 'Logistics & Warehouse',
    role: 'logistics',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Warehouse & Logistics Coordinator',
    titleAr: 'منسق المستودعات والخدمات اللوجستية',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'Inventory movement tracking, packing slips, manifest reconciliation, venue gate intake.',
  },
  // 31. Ruben - Food & Beverage — Approver
  {
    id: '30000000-0000-4000-8000-000000000031',
    name: 'Ruben',
    email: 'fnb@eeeqa.com',
    phone: '+974 3355 3057',
    position: 'Food & Beverage — Approver',
    department: 'F&B Operations',
    role: 'operations',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Food & Beverage Operations Approver',
    titleAr: 'مسؤول تشغيل الأغذية والمشروبات والضيافة',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'VIP catering specifications, health permits, catering logistics, dining zone approvals.',
  },
  // 32. Reycie Mia - Human Resources — Approver
  {
    id: '30000000-0000-4000-8000-000000000032',
    name: 'Reycie Mia',
    email: 'hr@eeeqa.com',
    phone: '+974 6656 4176',
    position: 'Human Resources — Approver',
    department: 'Human Resources',
    role: 'executive',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'HR Director & Workforce Approver',
    titleAr: 'مديرة الموارد البشرية وشؤون الموظفين',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: Infinity,
    description: 'Crew staffing accreditation, workforce compliance, labor law governance, site shifts.',
  },
  // 33. Hussein Abbass - Business Growth — User
  {
    id: '30000000-0000-4000-8000-000000000033',
    name: 'Hussein Abbass',
    email: 'abbas@eeeqa.com',
    phone: '+974 7401 0776',
    position: 'Business Growth — User',
    department: 'Commercial Growth',
    role: 'marketing_commercial',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Business Development & Growth Specialist',
    titleAr: 'أخصائي تطوير ونمو الأعمال',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'Strategic partnerships, government relations, institutional bids, growth portfolio tracking.',
  },
];

/**
 * 13 Canonical Role Leads mapped directly to the local team for testing and UAT.
 */
export const CANONICAL_DUMMY_ACCOUNTS: CanonicalDummyAccount[] = [
  LOCAL_TEAM_ACCOUNTS[0],  // super_admin -> Superadmin (superadmin@eeeqa.com)
  LOCAL_TEAM_ACCOUNTS[1],  // executive -> Adil Ahmed (adil@eeeqa.com)
  LOCAL_TEAM_ACCOUNTS[2],  // project_director -> Mohammad Ali (m.ali@eeeqa.com)
  LOCAL_TEAM_ACCOUNTS[3],  // project_manager -> Ebrahim (pm.events@eeeqa.com)
  LOCAL_TEAM_ACCOUNTS[4],  // finance -> Indika Manamendra (finance@eeeqa.com)
  LOCAL_TEAM_ACCOUNTS[5],  // procurement -> Amal (amal@eeeqa.com)
  LOCAL_TEAM_ACCOUNTS[6],  // design_production -> Mohasin (3d@eeeqa.com)
  LOCAL_TEAM_ACCOUNTS[7],  // operations -> Lucain (lucian@eeeqa.com)
  LOCAL_TEAM_ACCOUNTS[8],  // logistics -> Quasain (quasain@eeeqa.com)
  LOCAL_TEAM_ACCOUNTS[9],  // hse_quality -> Waqar Bhatti (waqar@eeeqa.com)
  LOCAL_TEAM_ACCOUNTS[10], // marketing_commercial -> Ahmad Faraz (ahmad@eeeqa.com)
  LOCAL_TEAM_ACCOUNTS[11], // field_supervisor -> Louie (louie@eeeqa.com)
  LOCAL_TEAM_ACCOUNTS[12], // client_user -> Anton (anton@atw.com)
];

/**
 * Fallback synthetic accounts preserving @e3.qa email addresses for test suite backward compatibility.
 */
export const FALLBACK_TEST_ACCOUNTS: CanonicalDummyAccount[] = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'Tareq Al-Kuwari (Fallback Test)',
    email: 'superadmin@e3.qa',
    role: 'super_admin',
    isSuperAdmin: true,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Super Admin (Test)',
    titleAr: 'المدير العام للنظام (اختبار)',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: Infinity,
    description: 'Fallback test account for CI test suites.',
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    name: 'Nasser Al-Attiyah (Fallback Test)',
    email: 'executive@e3.qa',
    role: 'executive',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Executive Partner (Test)',
    titleAr: 'الشريك التنفيذي (اختبار)',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: Infinity,
    description: 'Fallback test account for CI test suites.',
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    name: 'Fatima Al-Sulaiti (Fallback Test)',
    email: 'director@e3.qa',
    role: 'project_director',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Project Director (Test)',
    titleAr: 'مدير إدارة المشاريع (اختبار)',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 250000,
    description: 'Fallback test account for CI test suites.',
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    name: 'Zaid Mansour (Fallback Test)',
    email: 'pm@e3.qa',
    role: 'project_manager',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Project Manager (Test)',
    titleAr: 'مدير المشروع (اختبار)',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 50000,
    description: 'Fallback test account for CI test suites.',
  },
  {
    id: '10000000-0000-4000-8000-000000000005',
    name: 'Rashid Al-Hajri (Fallback Test)',
    email: 'finance@e3.qa',
    role: 'finance',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Financial Controller (Test)',
    titleAr: 'المراقب المالي (اختبار)',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 250000,
    description: 'Fallback test account for CI test suites.',
  },
  {
    id: '10000000-0000-4000-8000-000000000006',
    name: 'Maryam Al-Kuwari (Fallback Test)',
    email: 'procurement@e3.qa',
    role: 'procurement',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Procurement Manager (Test)',
    titleAr: 'مسؤول المشتريات (اختبار)',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'Fallback test account for CI test suites.',
  },
  {
    id: '10000000-0000-4000-8000-000000000007',
    name: 'Karim Haddad (Fallback Test)',
    email: 'designer@e3.qa',
    role: 'design_production',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Design Director (Test)',
    titleAr: 'مدير التصميم (اختبار)',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'Fallback test account for CI test suites.',
  },
  {
    id: '10000000-0000-4000-8000-000000000008',
    name: 'Salem Al-Marri (Fallback Test)',
    email: 'ops@e3.qa',
    role: 'operations',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Operations Director (Test)',
    titleAr: 'مدير العمليات (اختبار)',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'Fallback test account for CI test suites.',
  },
  {
    id: '10000000-0000-4000-8000-000000000009',
    name: 'Hamad Al-Khelaifi (Fallback Test)',
    email: 'logistics@e3.qa',
    role: 'logistics',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Logistics Manager (Test)',
    titleAr: 'مدير اللوجستيات (اختبار)',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'Fallback test account for CI test suites.',
  },
  {
    id: '10000000-0000-4000-8000-000000000010',
    name: 'Dr. Sarah Ibrahim (Fallback Test)',
    email: 'hse@e3.qa',
    role: 'hse_quality',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'HSE Inspector (Test)',
    titleAr: 'مفتش السلامة والجودة (اختبار)',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'Fallback test account for CI test suites.',
  },
  {
    id: '10000000-0000-4000-8000-000000000011',
    name: 'Khalid Al-Thani (Fallback Test)',
    email: 'commercial@e3.qa',
    role: 'marketing_commercial',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Commercial Lead (Test)',
    titleAr: 'المسؤول التجاري (اختبار)',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'Fallback test account for CI test suites.',
  },
  {
    id: '10000000-0000-4000-8000-000000000012',
    name: 'Omar Farooq (Fallback Test)',
    email: 'field@e3.qa',
    role: 'field_supervisor',
    isSuperAdmin: false,
    organisationId: '11111111-1111-4111-8111-111111111111',
    organisationName: 'E3 Events Master Tenant',
    audience: 'internal',
    title: 'Field Supervisor (Test)',
    titleAr: 'مشرف الموقع (اختبار)',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'Fallback test account for CI test suites.',
  },
  {
    id: '20000000-0000-4000-8000-000000000013',
    name: 'Hessa Al-Nuaimi (Fallback Test)',
    email: 'client@qatartourism.qa',
    role: 'client_user',
    isSuperAdmin: false,
    organisationId: '22222222-2222-4222-8222-222222222222',
    organisationName: 'Qatar Tourism Authority',
    audience: 'client',
    title: 'Client Stakeholder (Test)',
    titleAr: 'ممثل العميل (اختبار)',
    password: DEFAULT_DUMMY_PASSWORD,
    authorityCeilingQar: 0,
    description: 'Fallback test account for CI test suites.',
  },
];
