import { AiAssistantEngine, DataClassification } from './ai-assistant.js';

export interface ProjectDomainContext {
  projectId: string;
  projectCode: string;
  title: string;
  currentStage: string;
  requirementsCount: number;
  unverifiedRequirementsCount: number;
  documentsCount: number;
  rfisCount: number;
  unresolvedRfisCount: number;
  designsApproved: boolean;
  boqItemCount: number;
  committedPoCount: number;
  activeVendorCount: number;
  scheduleMilestonesCount: number;
  productionDeliverablesCount: number;
  inventoryAssetsAllocated: number;
  crewCheckedInCount: number;
  activeSitePermitsCount: number;
  openIncidentsCount: number;
  criticalIncidentsCount: number;
  currentBudget: string;
  postedActualCost: string;
  eac: string;
  vac: string;
  marginPercent: string;
  operationalClosed: boolean;
  commerciallyClosed: boolean;
  lessonsLearnedCount: number;
}

export interface CopilotRecommendation {
  domain: string;
  recommendation: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  confidenceScore: number;
  sourceReference?: string;
  actionType: 'advisory' | 'checklist' | 'prerequisite_check' | 'risk_warning';
}

export interface CopilotEvaluationResult {
  query: string;
  classification: DataClassification;
  sanitized: boolean;
  neutralizedPromptInjectionsFound: number;
  answeringDomains: string[];
  recommendations: CopilotRecommendation[];
  nextActions: string[];
  disclaimer: string;
}

export class AiCopilotEngine {
  /**
   * Aggregates multi-domain project context and generates context-aware recommendations.
   * Invariant: Strictly read-only advisory. Zero execution authority.
   */
  static evaluateCopilotQuery(
    query: string,
    context: ProjectDomainContext,
    classification: DataClassification = 'internal'
  ): CopilotEvaluationResult {
    // 1. Security & Classification Firewall (AT-084)
    AiAssistantEngine.assertClassificationAllowed(classification);

    // 2. Prompt Injection Neutralization (AT-083)
    const sanitized = AiAssistantEngine.sanitizeTenderInput(query);

    const answeringDomains: string[] = [];
    const recommendations: CopilotRecommendation[] = [];
    const nextActions: string[] = [];

    // Evaluate Stage & Progression
    if (context.currentStage === 'requirements' || context.unverifiedRequirementsCount > 0) {
      answeringDomains.push('requirements');
      if (context.unverifiedRequirementsCount > 0) {
        recommendations.push({
          domain: 'requirements',
          recommendation: `There are ${context.unverifiedRequirementsCount} unverified AI requirements pending human source citation verification before they can be baselined.`,
          urgency: 'high',
          confidenceScore: 0.95,
          sourceReference: 'AT-085 Source Citation Gate',
          actionType: 'prerequisite_check',
        });
        nextActions.push('Review and cite unverified requirements in Requirements Matrix.');
      }
    }

    // Evaluate Commercial & Budget
    answeringDomains.push('commercial');
    const vacNum = parseFloat(context.vac || '0');
    if (vacNum < 0) {
      recommendations.push({
        domain: 'commercial',
        recommendation: `Project forecast shows a cost overrun (VAC: ${context.vac} QAR). Variance at Completion requires commercial review.`,
        urgency: 'critical',
        confidenceScore: 0.98,
        actionType: 'risk_warning',
      });
      nextActions.push('Convene commercial variation review to reconcile unapproved scope changes.');
    } else {
      recommendations.push({
        domain: 'commercial',
        recommendation: `Current margin is healthy at ${context.marginPercent}% with positive VAC of ${context.vac} QAR.`,
        urgency: 'low',
        confidenceScore: 0.92,
        actionType: 'advisory',
      });
    }

    // Evaluate Live Operations & Safety
    if (context.criticalIncidentsCount > 0) {
      answeringDomains.push('site_operations');
      recommendations.push({
        domain: 'site_operations',
        recommendation: `${context.criticalIncidentsCount} critical site incident(s) open. Immediate safety remediation required before next stage authorization.`,
        urgency: 'critical',
        confidenceScore: 1.0,
        actionType: 'risk_warning',
      });
      nextActions.push('Resolve and file HSE remediation actions in Live Command Centre.');
    }

    // Evaluate Closeout & Lessons
    if (context.operationalClosed && !context.commerciallyClosed) {
      answeringDomains.push('closeout');
      recommendations.push({
        domain: 'closeout',
        recommendation: 'Operational closure complete. Proceed with 10-dimension Commercial Closeout checklist and lessons learned registration.',
        urgency: 'medium',
        confidenceScore: 0.9,
        actionType: 'checklist',
      });
      nextActions.push('Execute commercial closeout audit and log post-event lessons learned.');
    }

    if (nextActions.length === 0) {
      nextActions.push('Continue execution according to approved Master Gantt timeline.');
    }

    return {
      query: sanitized.sanitizedText,
      classification,
      sanitized: sanitized.injectionsDetected > 0,
      neutralizedPromptInjectionsFound: sanitized.injectionsDetected,
      answeringDomains,
      recommendations,
      nextActions,
      disclaimer: 'EOS AI Copilot is strictly advisory. Final decisions must be authorized by designated human authorities under company policy.',
    };
  }
}
