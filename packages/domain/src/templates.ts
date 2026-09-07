export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  stages: Array<{
    templateStageId: string;
    name: string;
    defaultOrder: number;
    description: string;
  }>;
}

export const STANDARD_THIRTEEN_STAGE_TEMPLATE: TemplateDefinition = {
  id: 'tmpl-standard-13-stage',
  name: 'Standard 13-Stage Event Lifecycle',
  description: 'Comprehensive lifecycle from onboarding to post-event report and learning.',
  stages: [
    { templateStageId: 'STAGE-01', name: 'Project Onboarding', defaultOrder: 1, description: 'Intake and brief capture' },
    { templateStageId: 'STAGE-02', name: 'Qualification and Feasibility', defaultOrder: 2, description: 'Go/No-go decisions' },
    { templateStageId: 'STAGE-03', name: 'Idea, Concept and First Draft', defaultOrder: 3, description: 'Creative development' },
    { templateStageId: 'STAGE-04', name: 'Clarification and Design Development', defaultOrder: 4, description: 'Design revisions' },
    { templateStageId: 'STAGE-05', name: 'Proposal, Submission and Authorisation', defaultOrder: 5, description: 'Commercial client submission' },
    { templateStageId: 'STAGE-06', name: 'Detailed Delivery Planning', defaultOrder: 6, description: 'Work packages and schedules' },
    { templateStageId: 'STAGE-07', name: 'Vendor Selection and Orders', defaultOrder: 7, description: 'Procurement and RFQs' },
    { templateStageId: 'STAGE-08', name: 'Production and Resource Preparation', defaultOrder: 8, description: 'Fabrication and reservations' },
    { templateStageId: 'STAGE-09', name: 'Logistics, Bump-in and Installation', defaultOrder: 9, description: 'Site build and transport' },
    { templateStageId: 'STAGE-10', name: 'Finishing, Testing and Opening Readiness', defaultOrder: 10, description: 'Inspections and opening sign-off' },
    { templateStageId: 'STAGE-11', name: 'Operations and Delivery', defaultOrder: 11, description: 'Live event delivery' },
    { templateStageId: 'STAGE-12', name: 'Bump-out and Reconciliation', defaultOrder: 12, description: 'Dismantle and venue handover' },
    { templateStageId: 'STAGE-13', name: 'Post-event Report, Closure and Learning', defaultOrder: 13, description: 'Settlement and lessons learned' },
  ],
};

export const COMPRESSED_FIVE_STAGE_TEMPLATE: TemplateDefinition = {
  id: 'tmpl-compressed-5-stage',
  name: 'Compressed 5-Stage Fast-Track Lifecycle',
  description: 'Streamlined workflow for rapid turnarounds and direct awards.',
  stages: [
    { templateStageId: 'FAST-01', name: 'Intake & Qualification', defaultOrder: 1, description: 'Onboarding and feasibility combined' },
    { templateStageId: 'FAST-02', name: 'Design & Commercial Approval', defaultOrder: 2, description: 'Creative concept, BOQ, and contract' },
    { templateStageId: 'FAST-03', name: 'Procurement, Production & Logistics', defaultOrder: 3, description: 'All pre-event build and orders' },
    { templateStageId: 'FAST-04', name: 'Readiness & Live Operations', defaultOrder: 4, description: 'Bump-in, inspection, and live delivery' },
    { templateStageId: 'FAST-05', name: 'Bump-out, Reporting & Closeout', defaultOrder: 5, description: 'Handover, reporting, and learning' },
  ],
};

export interface DomainMetricEvent {
  eventType: string; // e.g. "purchase_request.approved", "purchase_order.issued", "baseline.published", "deliverable.accepted"
  occurredAt: string; // UTC ISO 8601
  projectId: string;
  payload?: any;
}

export class CanonicalMetricCalculator {
  /**
   * Calculates Procurement Lead Time in elapsed hours from canonical domain events,
   * regardless of whether the project is 5-stage, 13-stage, or custom-named (AT-013).
   */
  static calculateProcurementLeadTimeHours(events: DomainMetricEvent[]): number | null {
    const approvedEvent = events.find((e) => e.eventType === 'purchase_request.approved');
    const issuedEvent = events.find((e) => e.eventType === 'purchase_order.issued');

    if (!approvedEvent || !issuedEvent) {
      return null;
    }

    const t1 = new Date(approvedEvent.occurredAt).getTime();
    const t2 = new Date(issuedEvent.occurredAt).getTime();

    if (t2 < t1) {
      throw new Error('Order issued event occurred before request approval');
    }

    return (t2 - t1) / (1000 * 60 * 60);
  }

  /**
   * Calculates Milestone Delivery Variance in elapsed hours against approved baseline.
   */
  static calculateMilestoneVarianceHours(
    baselineDateIso: string,
    actualAcceptedDateIso: string
  ): number {
    const base = new Date(baselineDateIso).getTime();
    const actual = new Date(actualAcceptedDateIso).getTime();
    return (actual - base) / (1000 * 60 * 60);
  }
}
