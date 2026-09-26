export type AppRouteAudience = 'internal' | 'client' | 'supplier' | 'admin';

export type WorkspaceType =
  | 'leadership'
  | 'personal'
  | 'project'
  | 'field'
  | 'client'
  | 'supplier'
  | 'admin'
  | 'auth';

export interface AppRoute {
  path: string;
  pattern: RegExp;
  audience: AppRouteAudience;
  workspace: WorkspaceType;
  title: string;
  description: string;
  supportsRtl: boolean;
  requiresParams?: string[];
}

function compilePath(path: string): RegExp {
  const regexStr = '^' + path.replace(/:([a-zA-Z0-9_]+)/g, '(?<$1>[^/]+)') + '$';
  return new RegExp(regexStr);
}

export const EOS_ROUTES: AppRoute[] = [
  ...[
    ['/allocations/register', 'Allocation planning', 'Versioned draft quantities and locations'],
    ['/designs/register', 'Design briefs', 'Internal design briefs and source revision pins'],
    ['/impact-review', 'Change impact', 'Changed source versions and advisory assessments'],
    ['/projects/:projectId/allocations', 'Allocation planning', 'Scoped draft allocation revisions'],
    ['/projects/:projectId/design-briefs', 'Design briefs', 'Scoped design brief revisions'],
    ['/projects/:projectId/impact-review', 'Change impact', 'Scoped change impact assessments'],
    ['/requirements/register', 'Requirement intake', 'Manual drafts and retained source revisions'],
    ['/clarifications/register', 'Clarification register', 'Questions, attributed responses and history'],
    ['/field/notes', 'Field notes', 'Device capture queue and durable server receipts'],
    ['/field', 'Field notes', 'Device capture queue and durable server receipts'],
    ['/field/legacy-captures', 'Earlier field captures', 'Provisional media awaiting a supported upload workflow'],
    ['/projects/:projectId/requirements', 'Requirement intake', 'Scoped requirement drafts and revisions'],
    ['/projects/:projectId/clarifications', 'Clarification register', 'Scoped clarification questions and responses'],
    ['/projects/:projectId/field-notes', 'Field notes', 'Scoped field observations and receipts'],
    ['/work-register', 'Work packages & tasks', 'Create packages and track recorded tasks'],
    ['/schedule', 'Schedule & dependencies', 'Record task forecasts and preserve dependency history'],
    ['/projects/:projectId/schedule', 'Project schedule', 'Scoped task forecasts and dependencies'],
    ['/projects/:projectId/timeline', 'Project timeline', 'Scoped task forecasts and dependencies'],
    ['/projects/:projectId/work', 'Project work register', 'Versioned project tasks and completion'],
    ['/documents/register', 'Document register', 'Draft document and revision metadata'],
    ['/projects/:projectId/document-register', 'Project documents', 'Scoped document register'],
    ['/projects/:projectId/reports', 'Project reports', 'Immutable internal project snapshots'],
  ].map(([path, title, description]) => ({path, pattern: compilePath(path), audience: 'internal' as const, workspace: 'project' as const, title, description, supportsRtl: true})),
  // --- Auth & Identity ---
  {
    path: '/login',
    pattern: compilePath('/login'),
    audience: 'internal',
    workspace: 'auth',
    title: 'E3-EOS Identity Sign In',
    description: 'Invitation-only secure local or OAuth authentication',
    supportsRtl: true,
  },
  {
    path: '/forbidden',
    pattern: compilePath('/forbidden'),
    audience: 'internal',
    workspace: 'auth',
    title: 'Access Denied',
    description: '403 Forbidden audience or scope restriction',
    supportsRtl: true,
  },

  // --- 1. Leadership Workspace ---
  {
    path: '/portfolio',
    pattern: compilePath('/portfolio'),
    audience: 'internal',
    workspace: 'leadership',
    title: 'Executive Portfolio Overview',
    description: 'View recorded project maturity, outcomes and internal report counts within current access',
    supportsRtl: true,
  },
  {
    path: '/portfolio/resources',
    pattern: compilePath('/portfolio/resources'),
    audience: 'internal',
    workspace: 'leadership',
    title: 'Portfolio Resource Utilization',
    description: 'Shared resource demand, capacity forecasting, and asset bottlenecks',
    supportsRtl: true,
  },
  {
    path: '/portfolio/exceptions',
    pattern: compilePath('/portfolio/exceptions'),
    audience: 'internal',
    workspace: 'leadership',
    title: 'Portfolio Governance & Exceptions',
    description: 'Track exception rates, sample sizes, and policy override analytics',
    supportsRtl: true,
  },
  {
    path: '/calendar',
    pattern: compilePath('/calendar'),
    audience: 'internal',
    workspace: 'leadership',
    title: 'Forecast calendar',
    description: 'Saved task forecasts across explicitly accessible projects',
    supportsRtl: true,
  },

  // --- 2. Personal Work Workspace ---
  {
    path: '/my-work',
    pattern: compilePath('/my-work'),
    audience: 'internal',
    workspace: 'personal',
    title: 'Personal Work Queue',
    description: 'Assigned tasks, deadlines, and personal deliverable commitments',
    supportsRtl: true,
  },
  {
    path: '/approvals',
    pattern: compilePath('/approvals'),
    audience: 'internal',
    workspace: 'personal',
    title: 'Pending Approvals Queue',
    description: 'Review exact versioned documents, BOQs, and POs awaiting signature',
    supportsRtl: true,
  },
  {
    path: '/notifications',
    pattern: compilePath('/notifications'),
    audience: 'internal',
    workspace: 'personal',
    title: 'Notifications & Alerts',
    description: 'System alerts, calendar change proposals, and field sync notices',
    supportsRtl: true,
  },

  // --- 3. Project Workspace ---
  {
    path: '/projects',
    pattern: compilePath('/projects'),
    audience: 'internal',
    workspace: 'project',
    title: 'Projects Directory',
    description: 'Project onboarding intake, active assignments, and lifecycle filters',
    supportsRtl: true,
  },
  {
    path: '/projects/:id/overview',
    pattern: compilePath('/projects/:id/overview'),
    audience: 'internal',
    workspace: 'project',
    title: 'Project Overview & Identity',
    description: 'Single linked project record, classification, lead roles, and key dates',
    supportsRtl: true,
    requiresParams: ['id'],
  },
  {
    path: '/projects/:id/scope',
    pattern: compilePath('/projects/:id/scope'),
    audience: 'internal',
    workspace: 'project',
    title: 'Scope, WBS & Requirements',
    description: 'Source-to-deliverable traceability, work packages, and acceptance criteria',
    supportsRtl: true,
    requiresParams: ['id'],
  },
  {
    path: '/projects/:id/timeline',
    pattern: compilePath('/projects/:id/timeline'),
    audience: 'internal',
    workspace: 'project',
    title: 'Stage Graph & Timeline',
    description: 'Configurable stage milestones, dependencies, and critical path scheduling',
    supportsRtl: true,
    requiresParams: ['id'],
  },
  {
    path: '/projects/:id/design',
    pattern: compilePath('/projects/:id/design'),
    audience: 'internal',
    workspace: 'project',
    title: 'Design & Document Control',
    description: 'Moodboards, drawings, revision trees, annotations, and release registers',
    supportsRtl: true,
    requiresParams: ['id'],
  },
  {
    path: '/projects/:id/commercial',
    pattern: compilePath('/projects/:id/commercial'),
    audience: 'internal',
    workspace: 'project',
    title: 'BOQ & Commercial Management',
    description: 'Unit costing, client quote scenarios, margin floors, and payment terms',
    supportsRtl: true,
    requiresParams: ['id'],
  },
  {
    path: '/projects/:id/procurement',
    pattern: compilePath('/projects/:id/procurement'),
    audience: 'internal',
    workspace: 'project',
    title: 'Procurement & Orders',
    description: 'Vendor RFQs, sole-source justifications, PO releases, and framework ceilings',
    supportsRtl: true,
    requiresParams: ['id'],
  },
  {
    path: '/projects/:id/production',
    pattern: compilePath('/projects/:id/production'),
    audience: 'internal',
    workspace: 'project',
    title: 'Fabrication & Workshop',
    description: 'Material takeoffs, workshop jobs, and drawing revision impact tracking',
    supportsRtl: true,
    requiresParams: ['id'],
  },
  {
    path: '/projects/:id/resources',
    pattern: compilePath('/projects/:id/resources'),
    audience: 'internal',
    workspace: 'project',
    title: 'Inventory & Equipment Reservations',
    description: 'Serialized non-overlapping bookings, bulk capacity locks, and maintenance holds',
    supportsRtl: true,
    requiresParams: ['id'],
  },
  {
    path: '/projects/:id/crew-logistics',
    pattern: compilePath('/projects/:id/crew-logistics'),
    audience: 'internal',
    workspace: 'project',
    title: 'Crew Scheduling & Logistics',
    description: 'Shift qualifications, rest period monitoring, transport, and delivery slots',
    supportsRtl: true,
    requiresParams: ['id'],
  },
  {
    path: '/projects/:id/readiness',
    pattern: compilePath('/projects/:id/readiness'),
    audience: 'internal',
    workspace: 'project',
    title: 'Compliance & Readiness Gates',
    description: 'Mandatory external permits, inspection snags, and ready-to-open gating',
    supportsRtl: true,
    requiresParams: ['id'],
  },
  {
    path: '/projects/:id/live',
    pattern: compilePath('/projects/:id/live'),
    audience: 'internal',
    workspace: 'project',
    title: 'Live Event Operations',
    description: 'Real-time run sheets, incident command logs, and ticketing visitor scans',
    supportsRtl: true,
    requiresParams: ['id'],
  },
  {
    path: '/projects/:id/finance',
    pattern: compilePath('/projects/:id/finance'),
    audience: 'internal',
    workspace: 'project',
    title: 'Financial Control & EAC',
    description: '90k EAC invariant tracking, accrual transitions, invoices, and ledger states',
    supportsRtl: true,
    requiresParams: ['id'],
  },
  {
    path: '/projects/:id/reports',
    pattern: compilePath('/projects/:id/reports'),
    audience: 'internal',
    workspace: 'project',
    title: 'Reporting, Closeout & Lessons',
    description: 'Audience-projected client reports, operational close, and knowledge reuse',
    supportsRtl: true,
    requiresParams: ['id'],
  },
  {
    path: '/projects/:id/history',
    pattern: compilePath('/projects/:id/history'),
    audience: 'internal',
    workspace: 'project',
    title: 'Audit Trail & Lineage',
    description: 'Tamper-evident transition logs, baseline snapshots, and decision records',
    supportsRtl: true,
    requiresParams: ['id'],
  },
  {
    path: '/projects/:id/settings',
    pattern: compilePath('/projects/:id/settings'),
    audience: 'internal',
    workspace: 'project',
    title: 'Project Configuration',
    description: 'Stage graph overrides, custom fields, country cell binding, and governance',
    supportsRtl: true,
    requiresParams: ['id'],
  },

  // --- 4. Field Operations Workspace ---
  {
    path: '/field/projects/:id',
    pattern: compilePath('/field/projects/:id'),
    audience: 'internal',
    workspace: 'field',
    title: 'Field Mobile Operations',
    description: 'Offline-first run sheets, checklists, and incident submission',
    supportsRtl: true,
    requiresParams: ['id'],
  },
  {
    path: '/field/sync',
    pattern: compilePath('/field/sync'),
    audience: 'internal',
    workspace: 'field',
    title: 'Offline Sync Queue',
    description: 'Pending mutations, deduplicated client operations, and photo uploads',
    supportsRtl: true,
  },
  {
    path: '/field/assignments/:id',
    pattern: compilePath('/field/assignments/:id'),
    audience: 'internal',
    workspace: 'field',
    title: 'Task Execution & Evidence',
    description: 'Record work sign-off, attach photo evidence, and supervisor reviews',
    supportsRtl: true,
    requiresParams: ['id'],
  },

  // --- 5. Client Collaboration Portal ---
  {
    path: '/portal/projects/:id',
    pattern: compilePath('/portal/projects/:id'),
    audience: 'client',
    workspace: 'client',
    title: 'Client Project Room',
    description: 'Authorized overview, current phase, and pending client decisions',
    supportsRtl: true,
    requiresParams: ['id'],
  },
  {
    path: '/portal/projects/:id/concept',
    pattern: compilePath('/portal/projects/:id/concept'),
    audience: 'client',
    workspace: 'client',
    title: 'Concept & Moodboards',
    description: 'Review published design visualisations and provide pinned feedback',
    supportsRtl: true,
    requiresParams: ['id'],
  },
  {
    path: '/portal/projects/:id/milestones',
    pattern: compilePath('/portal/projects/:id/milestones'),
    audience: 'client',
    workspace: 'client',
    title: 'Delivery Milestones & Evidence',
    description: 'Track accepted progress with verified photographic evidence',
    supportsRtl: true,
    requiresParams: ['id'],
  },
  {
    path: '/portal/projects/:id/commercial',
    pattern: compilePath('/portal/projects/:id/commercial'),
    audience: 'client',
    workspace: 'client',
    title: 'Commercial Proposals & RFCs',
    description: 'Review published quotes, approve variations, and view billing status',
    supportsRtl: true,
    requiresParams: ['id'],
  },
  {
    path: '/portal/projects/:id/results',
    pattern: compilePath('/portal/projects/:id/results'),
    audience: 'client',
    workspace: 'client',
    title: 'Final Results & Debrief',
    description: 'Published client report with audited metrics and approved photo gallery',
    supportsRtl: true,
    requiresParams: ['id'],
  },

  // --- 6. Supplier Contribution Workspace ---
  {
    path: '/contribute/:token',
    pattern: compilePath('/contribute/:token'),
    audience: 'supplier',
    workspace: 'supplier',
    title: 'Supplier Contribution Portal',
    description: 'Restricted upload portal for RFQ bids and delivery evidence',
    supportsRtl: true,
    requiresParams: ['token'],
  },

  // --- 7. Platform Administration & Governance ---
  {
    path: '/admin/templates',
    pattern: compilePath('/admin/templates'),
    audience: 'admin',
    workspace: 'admin',
    title: 'Lifecycle Templates Studio',
    description: 'Design, version, and publish 13-stage lifecycle graphs',
    supportsRtl: true,
  },
  {
    path: '/admin/policies',
    pattern: compilePath('/admin/policies'),
    audience: 'admin',
    workspace: 'admin',
    title: 'Policy Compiler & Rules',
    description: 'Draft, preview, and activate governance rules and approval matrices',
    supportsRtl: true,
  },
  {
    path: '/admin/authority',
    pattern: compilePath('/admin/authority'),
    audience: 'admin',
    workspace: 'admin',
    title: 'Authority Matrices & Delegations',
    description: 'Configure financial spend limits, four-eyes rules, and delegation chains',
    supportsRtl: true,
  },
  {
    path: '/admin/access',
    pattern: compilePath('/admin/access'),
    audience: 'admin',
    workspace: 'admin',
    title: 'Project Access',
    description: 'Grant and revoke explicit project access for organization memberships',
    supportsRtl: true,
  },
  {
    path: '/admin/roles',
    pattern: compilePath('/admin/roles'),
    audience: 'admin',
    workspace: 'admin',
    title: 'Role & RBAC Management',
    description: 'Server-defined role and permission reference',
    supportsRtl: true,
  },
  {
    path: '/admin/countries',
    pattern: compilePath('/admin/countries'),
    audience: 'admin',
    workspace: 'admin',
    title: 'Regional Cells & Jurisdictions',
    description: 'Configure Qatar and UAE regional cells, calendars, and legal compliance',
    supportsRtl: true,
  },
  {
    path: '/admin/fields',
    pattern: compilePath('/admin/fields'),
    audience: 'admin',
    workspace: 'admin',
    title: 'Custom Field Definitions',
    description: 'Define extensible typed fields without schema migrations',
    supportsRtl: true,
  },
  {
    path: '/admin/integrations',
    pattern: compilePath('/admin/integrations'),
    audience: 'admin',
    workspace: 'admin',
    title: 'Integrations & Webhooks',
    description: 'Manage HMAC signing keys, outbox workers, and dead-letter queues',
    supportsRtl: true,
  },
  {
    path: '/admin/audit',
    pattern: compilePath('/admin/audit'),
    audience: 'admin',
    workspace: 'admin',
    title: 'Audit Store & Manifests',
    description: 'Verify cryptographic manifests and review privileged access events',
    supportsRtl: true,
  },
  {
    path: '/admin/migrations',
    pattern: compilePath('/admin/migrations'),
    audience: 'admin',
    workspace: 'admin',
    title: 'Data Migration & Cutover',
    description: 'Rehearse expand/backfill steps and enforce authoritative writer boundaries',
    supportsRtl: true,
  },
];

/**
 * Resolves a given URL pathname to an EOS route and extracts parameters.
 */
export function matchRoute(pathname: string): { route: AppRoute; params: Record<string, string> } | null {
  for (const route of EOS_ROUTES) {
    const match = pathname.match(route.pattern);
    if (match) {
      return {
        route,
        params: match.groups || {},
      };
    }
  }
  return null;
}

/**
 * Checks if a given route is accessible by the user's role audience.
 */
export function isAudiencePermitted(routeAudience: AppRouteAudience, userAudience: AppRouteAudience): boolean {
  if (userAudience === 'admin') return true;
  return routeAudience === userAudience;
}
