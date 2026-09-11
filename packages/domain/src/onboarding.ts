export type BusinessRoute =
  | 'tender_rfp'
  | 'direct_award'
  | 'internal_idea'
  | 'recurring_operations'
  | 'framework_calloff';

export interface ProjectRequirementDefinition {
  id: string;
  key: string;
  label: string;
  description: string;
  isCompleted: boolean;
  applicableRoutes: BusinessRoute[];
}

export interface OnboardingCompletenessResult {
  businessRoute: BusinessRoute;
  completionPct: number;
  isOnboardingComplete: boolean;
  totalApplicableRequirements: number;
  completedApplicableRequirements: number;
  completedRequirements: string[];
  missingRequirements: string[];
  missingSections: string[];
  formula: string;
}

export interface ProjectOnboardingInput {
  title?: string;
  code?: string;
  businessRoute?: string;
  clientName?: string;
  clientOrganisationId?: string;
  tenderDeadline?: string | Date;
  submissionDate?: string | Date;
  eventStartDate?: string | Date;
  eventEndDate?: string | Date;
  targetTimeline?: string;
  estimatedBudget?: number;
  commercialModel?: string;
  projectLead?: string;
  ownerId?: string;
  executiveSponsor?: string;
  venueName?: string;
  venueContext?: any;
  workflowConfirmed?: boolean;
  stagesCount?: number;
  isDraft?: boolean;
}

/**
 * Standard registry of project requirements mapped to applicable business routes.
 */
export const ALL_PROJECT_REQUIREMENTS: Array<{
  id: string;
  key: string;
  label: string;
  description: string;
  applicableRoutes: BusinessRoute[];
  checkFn: (input: ProjectOnboardingInput) => boolean;
}> = [
  {
    id: 'req_identity',
    key: 'identity',
    label: 'Project Identity & Title',
    description: 'Basic project title, classification, and tracking code.',
    applicableRoutes: ['tender_rfp', 'direct_award', 'internal_idea', 'recurring_operations', 'framework_calloff'],
    checkFn: (p) => Boolean(p.title && p.title.trim().length > 0),
  },
  {
    id: 'req_client',
    key: 'client',
    label: 'Client Organisation & Stakeholder',
    description: 'External client entity and commercial billing party.',
    // NOTE: 'internal_idea' strictly does NOT require an external client!
    applicableRoutes: ['tender_rfp', 'direct_award', 'recurring_operations', 'framework_calloff'],
    checkFn: (p) => Boolean((p.clientName && p.clientName.trim().length > 0) || p.clientOrganisationId),
  },
  {
    id: 'req_tender_deadline',
    key: 'submission_details',
    label: 'Tender Submission & RFP Deadlines',
    description: 'Binding client proposal submission deadline.',
    // Strictly applicable to tenders/RFPs
    applicableRoutes: ['tender_rfp'],
    checkFn: (p) => Boolean(p.tenderDeadline || p.submissionDate),
  },
  {
    id: 'req_event_dates',
    key: 'event_dates',
    label: 'Scheduled Event & Move-in Dates',
    description: 'Fixed operational venue bump-in and live show schedule.',
    applicableRoutes: ['direct_award', 'recurring_operations', 'framework_calloff'],
    checkFn: (p) => Boolean(p.eventStartDate || p.targetTimeline),
  },
  {
    id: 'req_target_timeline',
    key: 'target_timeline',
    label: 'Target Feasibility Window',
    description: 'Concept evaluation and target window for feasibility evaluation.',
    // Strictly for internal ideas
    applicableRoutes: ['internal_idea'],
    checkFn: (p) => Boolean(p.targetTimeline || p.eventStartDate),
  },
  {
    id: 'req_commercial',
    key: 'commercial_estimate',
    label: 'Commercial Estimate & Budget Envelope',
    description: 'Contract value, estimated revenue, or internal investment allocation.',
    applicableRoutes: ['tender_rfp', 'direct_award', 'internal_idea', 'recurring_operations', 'framework_calloff'],
    checkFn: (p) => Boolean((p.estimatedBudget && p.estimatedBudget > 0) || p.commercialModel),
  },
  {
    id: 'req_ownership',
    key: 'ownership',
    label: 'Project Lead & Governance Ownership',
    description: 'Assigned Lead PM, Concept Sponsor, or Director.',
    applicableRoutes: ['tender_rfp', 'direct_award', 'internal_idea', 'recurring_operations', 'framework_calloff'],
    checkFn: (p) => Boolean((p.projectLead && p.projectLead.trim().length > 0) || p.ownerId || p.executiveSponsor),
  },
  {
    id: 'req_venue',
    key: 'venue',
    label: 'Venue & Spatial Parameters',
    description: 'Venue location, spatial boundaries, and site access constraints.',
    // Internal ideas and recurring ops may not know or require specific venue at intake
    applicableRoutes: ['tender_rfp', 'direct_award'],
    checkFn: (p) => Boolean(p.venueName || p.venueContext?.name || (p.venueContext && Object.keys(p.venueContext).length > 0)),
  },
  {
    id: 'req_workflow',
    key: 'workflow_confirmation',
    label: 'Workflow Confirmation & Mandatory Gates',
    description: '13-stage lifecycle stages and mandatory governance gate baseline.',
    applicableRoutes: ['tender_rfp', 'direct_award', 'internal_idea', 'recurring_operations', 'framework_calloff'],
    checkFn: (p) => Boolean(p.workflowConfirmed === true || (p.stagesCount && p.stagesCount >= 13)),
  },
];

/**
 * Normalizes input business route string to canonical enum.
 */
export function normalizeBusinessRoute(route?: string): BusinessRoute {
  if (!route) return 'direct_award';
  const lower = route.toLowerCase().replace(/[\s-]/g, '_');
  if (lower.includes('tender') || lower.includes('rfp')) return 'tender_rfp';
  if (lower.includes('internal') || lower.includes('idea')) return 'internal_idea';
  if (lower.includes('recurring') || lower.includes('annual')) return 'recurring_operations';
  if (lower.includes('framework') || lower.includes('calloff')) return 'framework_calloff';
  return 'direct_award';
}

/**
 * Dynamically calculates project onboarding completeness based on the applicable
 * requirements for the specific project classification.
 *
 * Formula:
 * Onboarding Completion % = completed applicable requirements / total applicable requirements
 */
export function calculateOnboardingCompleteness(
  projectData: ProjectOnboardingInput
): OnboardingCompletenessResult {
  const route = normalizeBusinessRoute(projectData.businessRoute);

  // Filter requirements that strictly apply to this project route
  const applicableRequirements = ALL_PROJECT_REQUIREMENTS.filter((req) =>
    req.applicableRoutes.includes(route)
  );

  const completedList: string[] = [];
  const missingList: string[] = [];
  const missingSections: string[] = [];

  for (const req of applicableRequirements) {
    const isDone = req.checkFn(projectData);
    if (isDone) {
      completedList.push(req.label);
    } else {
      missingList.push(req.key);
      missingSections.push(req.label);
    }
  }

  const totalApplicable = applicableRequirements.length;
  const completedApplicable = completedList.length;

  const completionPct = totalApplicable > 0
    ? Math.round((completedApplicable / totalApplicable) * 100)
    : 100;

  const isOnboardingComplete = completedApplicable === totalApplicable && totalApplicable > 0;

  return {
    businessRoute: route,
    completionPct,
    isOnboardingComplete,
    totalApplicableRequirements: totalApplicable,
    completedApplicableRequirements: completedApplicable,
    completedRequirements: completedList,
    missingRequirements: missingList,
    missingSections,
    formula: `${completedApplicable} / ${totalApplicable} (${completionPct}%)`,
  };
}
