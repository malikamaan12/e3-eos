export interface RoleExplanation {
  role: string;
  title: string;
  description: string;
  permissions: string[];
  can: string[];
  cannot: string[];
}

export const CANONICAL_ROLE_EXPLANATIONS: Record<string, RoleExplanation> = {
  super_admin: {
    role: 'super_admin',
    title: 'Super Admin',
    description: 'Unrestricted system-wide configuration, tenant management, and root governance.',
    permissions: ['*'],
    can: [
      'Configure tenant settings, authentication policies, and security controls',
      'Provision users, assign roles, and audit access permissions',
      'Manage database migrations and system-level integrations',
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
    permissions: ['portfolio.read', 'approvals.decide', 'commercial.approve', 'governance.override'],
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
    permissions: ['project.create', 'project.manage', 'stage.progress', 'approvals.decide'],
    can: [
      'Direct multi-project stage progression across all 13 lifecycle stages',
      'Approve project-level variation orders and lead project managers',
      'Allocate high-level budget envelopes across project workstreams',
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
    permissions: ['project.manage', 'tasks.manage', 'approvals.request', 'procurement.request'],
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
    permissions: ['finance.manage', 'boq.manage', 'po.approve', 'eac.recalculate'],
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
    permissions: ['procurement.manage', 'vendor.manage', 'po.create'],
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
    permissions: ['design.upload', 'design.version', 'production.order', 'specifications.edit'],
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
    permissions: ['operations.manage', 'safety.permit', 'zones.clear', 'runbooks.execute'],
    can: [
      'Plan venue layouts, bump-in schedules, and crowd management plans',
      'Coordinate security, emergency services, and venue authority clearances',
      'Clear operational zones for live event activation',
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
    permissions: ['inventory.manage', 'dispatch.create', 'returns.inspect'],
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
    permissions: ['hse.inspect', 'incident.log', 'permit.validate'],
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
    permissions: ['commercial.edit', 'proposals.create', 'sponsorship.track'],
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
    permissions: ['field.inspect', 'snags.create', 'attendance.log'],
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
    permissions: ['portal.read', 'design.approve', 'client.signoff'],
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

export function getRoleExplanation(roleKey: string): RoleExplanation | undefined {
  return CANONICAL_ROLE_EXPLANATIONS[roleKey];
}
