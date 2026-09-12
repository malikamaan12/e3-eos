export interface ProposedPolicyThresholds {
  soleSourceSpendThreshold?: number;
  variationDualApprovalThreshold?: number;
  maxDailyCrewHours?: number;
  minimumGrossMarginPercent?: number;
}

export interface HistoricalTransactionRecord {
  projectId: string;
  spendAmount: number;
  isSoleSource: boolean;
  variationAmount?: number;
  crewDailyHoursLogged?: number;
  grossMarginPercent?: number;
}

export interface PolicySimulationReport {
  simulationId: string;
  policyName: string;
  sampleProjectsEvaluated: number;
  baselineExceptionRatePercent: string;
  simulatedExceptionRatePercent: string;
  projectedAdditionalApprovalsRequired: number;
  projectedAverageScheduleDelayHours: number;
  recommendedDisposition: 'recommend_adoption' | 'requires_committee_refinement' | 'reject_severe_bottleneck';
  summary: string;
}

export class PolicySimulatorEngine {
  /**
   * Backtests proposed policy changes in an isolated sandbox against project history.
   * Invariant: Sandbox does not alter active policy, project data, or live reservations.
   */
  static simulatePolicy(
    policyName: string,
    proposed: ProposedPolicyThresholds,
    transactions: HistoricalTransactionRecord[]
  ): PolicySimulationReport {
    const simulationId = `sim-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    if (transactions.length === 0) {
      return {
        simulationId,
        policyName,
        sampleProjectsEvaluated: 0,
        baselineExceptionRatePercent: '0.00%',
        simulatedExceptionRatePercent: '0.00%',
        projectedAdditionalApprovalsRequired: 0,
        projectedAverageScheduleDelayHours: 0,
        recommendedDisposition: 'requires_committee_refinement',
        summary: 'Insufficient historical sample data to execute simulation.',
      };
    }

    let baselineExceptions = 0;
    let simulatedExceptions = 0;
    let extraApprovals = 0;

    for (const tx of transactions) {
      // Baseline defaults: sole source > 50,000, variation dual > 100,000, hours > 10
      const baselineSole = tx.isSoleSource && tx.spendAmount > 50000;
      const baselineVar = (tx.variationAmount || 0) > 100000;
      const baselineHours = (tx.crewDailyHoursLogged || 0) > 10;
      if (baselineSole || baselineVar || baselineHours) baselineExceptions++;

      // Simulated rules
      let isSimException = false;
      if (proposed.soleSourceSpendThreshold !== undefined) {
        if (tx.isSoleSource && tx.spendAmount > proposed.soleSourceSpendThreshold) {
          isSimException = true;
          extraApprovals++;
        }
      }
      if (proposed.variationDualApprovalThreshold !== undefined) {
        if ((tx.variationAmount || 0) > proposed.variationDualApprovalThreshold) {
          isSimException = true;
          extraApprovals++;
        }
      }
      if (proposed.maxDailyCrewHours !== undefined) {
        if ((tx.crewDailyHoursLogged || 0) > proposed.maxDailyCrewHours) {
          isSimException = true;
        }
      }
      if (proposed.minimumGrossMarginPercent !== undefined) {
        if ((tx.grossMarginPercent || 0) < proposed.minimumGrossMarginPercent) {
          isSimException = true;
          extraApprovals++;
        }
      }

      if (isSimException) simulatedExceptions++;
    }

    const baselineRate = ((baselineExceptions / transactions.length) * 100).toFixed(2) + '%';
    const simulatedRate = ((simulatedExceptions / transactions.length) * 100).toFixed(2) + '%';
    const delayHours = extraApprovals * 4; // average 4 hours turnaround per extra approval tier

    let disposition: 'recommend_adoption' | 'requires_committee_refinement' | 'reject_severe_bottleneck' = 'recommend_adoption';
    if (extraApprovals > transactions.length * 0.5) {
      disposition = 'reject_severe_bottleneck';
    } else if (extraApprovals > transactions.length * 0.25) {
      disposition = 'requires_committee_refinement';
    }

    return {
      simulationId,
      policyName,
      sampleProjectsEvaluated: transactions.length,
      baselineExceptionRatePercent: baselineRate,
      simulatedExceptionRatePercent: simulatedRate,
      projectedAdditionalApprovalsRequired: extraApprovals,
      projectedAverageScheduleDelayHours: delayHours,
      recommendedDisposition: disposition,
      summary: `Simulation across ${transactions.length} historical transactions indicates exception rate would move from ${baselineRate} to ${simulatedRate}, generating ${extraApprovals} additional approval queues with an estimated ${delayHours}h process friction.`,
    };
  }
}
