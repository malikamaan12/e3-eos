export interface CloneableProjectSource {
  id: string;
  projectCode: string;
  title: string;
  description: string;
  templateId?: string;
  stages: Array<{ id: string; name: string; order: number }>;
  workPackages: Array<{ id: string; name: string }>;
  requirements: Array<{ id: string; title: string; description: string }>;
  // Consequential historical data that MUST be reset on clone (AT-030)
  historicalApprovals?: any[];
  signatures?: any[];
  actualCosts?: any[];
  committedPurchaseOrders?: any[];
  resourceReservations?: any[];
  actualDates?: Record<string, string>;
  personalContactDetails?: any[];
}

export interface ClonedProjectOutput {
  id: string;
  projectCode: string;
  title: string;
  description: string;
  templateId?: string;
  stages: Array<{ id: string; name: string; order: number }>;
  workPackages: Array<{ id: string; name: string }>;
  requirements: Array<{ id: string; title: string; description: string }>;
  maturity: 'idea';
  outcome: 'undetermined';
  // Proof of historical reset (AT-030)
  historicalApprovals: [];
  signatures: [];
  actualCosts: [];
  committedPurchaseOrders: [];
  resourceReservations: [];
  actualDates: {};
  personalContactDetails: [];
}

export class ProjectCloningEngine {
  /**
   * Clones an existing project structure while strictly resetting all historical evidence,
   * costs, signatures, approvals, reservations, actual dates, and personal data (AT-030).
   */
  static cloneProject(
    source: CloneableProjectSource,
    newProjectCode: string,
    newTitle?: string
  ): ClonedProjectOutput {
    const newId = `prj-clone-${Date.now()}`;

    return {
      id: newId,
      projectCode: newProjectCode,
      title: newTitle || `Clone of ${source.title}`,
      description: source.description,
      templateId: source.templateId,
      // Retain workflow structure and scope templates
      stages: source.stages.map((s, idx) => ({
        id: `stage-clone-${idx + 1}-${Date.now()}`,
        name: s.name,
        order: s.order,
      })),
      workPackages: source.workPackages.map((wp, idx) => ({
        id: `wp-clone-${idx + 1}-${Date.now()}`,
        name: wp.name,
      })),
      requirements: source.requirements.map((r, idx) => ({
        id: `req-clone-${idx + 1}-${Date.now()}`,
        title: r.title,
        description: r.description,
      })),
      maturity: 'idea',
      outcome: 'undetermined',
      // Strict reset guarantees (AT-030)
      historicalApprovals: [],
      signatures: [],
      actualCosts: [],
      committedPurchaseOrders: [],
      resourceReservations: [],
      actualDates: {},
      personalContactDetails: [],
    };
  }
}
