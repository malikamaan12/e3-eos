/**
 * Client Portal UI Projection Adapter
 * Guarantees that no internal margins, supplier buy rates, or confidential
 * HSE narratives leak into client-rendered UI models.
 */

export interface ClientPortalProjectView {
  projectId: string;
  projectCode: string;
  title: string;
  clientName: string;
  currentMilestone: string;
  approvedProposal?: {
    proposalId: string;
    version: number;
    sellPrice: string;
    currency: string;
    approvedAt: string;
  };
  publishedDeliverables: Array<{
    name: string;
    category: string;
    status: string;
    completionPercentage: number;
    evidencePhotos: string[];
  }>;
  pendingDecisions: Array<{
    decisionId: string;
    title: string;
    description: string;
    financialExposure?: string;
    currency?: string;
    requiresClientApproval: boolean;
  }>;
  clientIncidents: Array<{
    referenceId: string;
    timestamp: string;
    operationalImpact: string;
    status: string;
  }>;
}

export class ClientProjectionAdapter {
  /**
   * Transforms raw project domain data into a client-safe portal model.
   * Enforces server-side redactions and client-friendly status terminology.
   */
  static projectForClient(rawProject: any): ClientPortalProjectView {
    // Assert and verify that internal cost data is strictly not exposed
    if (rawProject.internalCost || rawProject.profitMargin || rawProject.vendorBuyRates) {
      throw new Error('SECURITY_VIOLATION: Raw cost data passed to client projection');
    }

    const pendingDecisions = (rawProject.changeRequests || [])
      .filter((cr: any) => cr.status === 'pending_client_approval')
      .map((cr: any) => ({
        decisionId: cr.id,
        title: cr.title || `Change Request #${cr.id.substring(0, 8)}`,
        description: cr.description || '',
        financialExposure: cr.clientAdditionalAmount?.toString() || cr.amount?.toString(),
        currency: cr.currency || 'QAR',
        requiresClientApproval: true,
      }));

    const clientIncidents = (rawProject.incidents || [])
      .filter((inc: any) => inc.audience !== 'internal_only')
      .map((inc: any) => ({
        referenceId: inc.id,
        timestamp: inc.timestamp || new Date().toISOString(),
        operationalImpact: inc.operationalImpact || 'Minor operational delay',
        status: inc.status || 'resolved',
      }));

    const publishedDeliverables = (rawProject.deliverables || [])
      .filter((d: any) => d.isPublishedToClient)
      .map((d: any) => ({
        name: d.name,
        category: d.category,
        status: d.isAccepted ? 'Accepted' : d.isComplete ? 'Under Client Review' : 'In Progress',
        completionPercentage: d.progressPercentage || (d.isAccepted ? 100 : d.isComplete ? 90 : 0),
        evidencePhotos: d.verifiedMediaUrls || [],
      }));

    return {
      projectId: rawProject.id,
      projectCode: rawProject.code,
      title: rawProject.title,
      clientName: rawProject.clientName || 'Valued Client',
      currentMilestone: rawProject.currentStageName || 'Delivery Planning',
      approvedProposal: rawProject.approvedProposal
        ? {
            proposalId: rawProject.approvedProposal.id,
            version: rawProject.approvedProposal.version || 1,
            sellPrice: rawProject.approvedProposal.sellPrice?.toString() || '0.00',
            currency: rawProject.approvedProposal.currency || 'QAR',
            approvedAt: rawProject.approvedProposal.approvedAt || new Date().toISOString(),
          }
        : undefined,
      publishedDeliverables,
      pendingDecisions,
      clientIncidents,
    };
  }
}
