export type ReportAudience = 'internal_command' | 'client_portal' | 'public_report';

export interface FinancialSummaryData {
  revenue: string;
  currentBudget: string;
  actualCost: string;
  internalMarginPercent?: string;
  vendorCostBreakdown?: Record<string, string>;
}

export interface IncidentSummaryData {
  title: string;
  severity: string;
  operationalImpact: string;
  restrictedPersonalNarrative?: string;
}

export interface ReportSnapshot {
  projectId: string;
  reportCode: string;
  periodStart: Date;
  periodEnd: Date;
  financials: FinancialSummaryData;
  incidents: IncidentSummaryData[];
  metrics: {
    totalTurnstileEntries: number;
    uniqueAttendees: number;
    daysCount: number;
  };
  milestonesCompleted: string[];
}

export interface ProjectedReport {
  id: string;
  version: number;
  projectId: string;
  reportCode: string;
  targetAudience: ReportAudience;
  publishedAt: Date;
  deterministicContentHash: string;
  revisionReason?: string;
  content: {
    financials: {
      revenue: string;
      currentBudget: string;
      actualCost: string;
      internalMarginPercent?: string;
      vendorCostBreakdown?: Record<string, string>;
    };
    incidents: Array<{
      title: string;
      severity: string;
      operationalImpact: string;
      restrictedPersonalNarrative?: string;
    }>;
    metrics: {
      totalTurnstileEntries: number;
      uniqueAttendees: number;
      daysCount: number;
    };
    milestonesCompleted: string[];
  };
}

export class ReportingEngine {
  /**
   * Generates a deterministic content hash for a frozen data snapshot (AT-079).
   */
  static generateSnapshotHash(snapshot: ReportSnapshot): string {
    const raw = JSON.stringify({
      p: snapshot.projectId,
      c: snapshot.reportCode,
      f: snapshot.financials.actualCost,
      r: snapshot.financials.revenue,
      m: snapshot.metrics,
      s: snapshot.milestonesCompleted,
    });
    // Simple deterministic hash
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    return `hash-${Math.abs(hash).toString(16)}`;
  }

  /**
   * Projects report data according to audience view (AT-077).
   * Invariant: Client and public reports strip internal profit margins, vendor buy-rates,
   * and sensitive personal HSE narratives.
   */
  static projectForAudience(snapshot: ReportSnapshot, audience: ReportAudience): ProjectedReport['content'] {
    const isInternal = audience === 'internal_command';

    const projectedFinancials: ProjectedReport['content']['financials'] = {
      revenue: snapshot.financials.revenue,
      currentBudget: snapshot.financials.currentBudget,
      actualCost: snapshot.financials.actualCost,
    };

    if (isInternal) {
      projectedFinancials.internalMarginPercent = snapshot.financials.internalMarginPercent;
      projectedFinancials.vendorCostBreakdown = snapshot.financials.vendorCostBreakdown;
    }

    const projectedIncidents = snapshot.incidents.map((inc) => ({
      title: inc.title,
      severity: inc.severity,
      operationalImpact: inc.operationalImpact,
      ...(isInternal && inc.restrictedPersonalNarrative
        ? { restrictedPersonalNarrative: inc.restrictedPersonalNarrative }
        : {}),
    }));

    return {
      financials: projectedFinancials,
      incidents: projectedIncidents,
      metrics: snapshot.metrics,
      milestonesCompleted: snapshot.milestonesCompleted,
    };
  }

  /**
   * Creates a post-publication report revision (e.g. V1 -> V2) when credit notes or reversals arrive (AT-069).
   * Preserves V1 historical record and manifests revision.
   */
  static createReportRevision(
    previousReport: ProjectedReport,
    revisedSnapshot: ReportSnapshot,
    revisionReason: string
  ): ProjectedReport {
    const newVersion = previousReport.version + 1;
    const content = this.projectForAudience(revisedSnapshot, previousReport.targetAudience);
    const hash = this.generateSnapshotHash(revisedSnapshot);

    return {
      id: `${previousReport.id}-v${newVersion}`,
      version: newVersion,
      projectId: previousReport.projectId,
      reportCode: previousReport.reportCode,
      targetAudience: previousReport.targetAudience,
      publishedAt: new Date(),
      deterministicContentHash: hash,
      revisionReason,
      content,
    };
  }
}
