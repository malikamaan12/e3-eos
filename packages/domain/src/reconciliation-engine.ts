export interface ExternalReconciliationItem {
  id: string;
  connectorType: string;
  entityType: string;
  externalId: string;
  externalAmount?: number;
  externalReference?: string;
  externalTimestamp: string;
  rawPayload: Record<string, unknown>;
}

export interface EosReconciliationItem {
  id: string;
  entityType: string;
  eosId: string;
  eosAmount?: number;
  eosReference?: string;
  status: string;
}

export interface ReconciliationResult {
  isMatched: boolean;
  mismatchType?: 'duplicate_record' | 'amount_mismatch' | 'missing_reference' | 'orphaned_document';
  exceptionMessage?: string;
  suggestedAction: 'override_with_eos' | 'accept_external' | 'quarantine' | 'manual_adjustment';
  varianceAmount?: number;
}

export class IntegrationReconciliationEngine {
  /**
   * Evaluates external data record against internal EOS entity state.
   * Protects EOS as authoritative System of Record while flagging discrepancies.
   */
  static reconcileRecord(
    external: ExternalReconciliationItem,
    eos?: EosReconciliationItem
  ): ReconciliationResult {
    // 1. Missing reference in EOS
    if (!eos) {
      return {
        isMatched: false,
        mismatchType: 'missing_reference',
        exceptionMessage: `External entity ${external.externalId} of type ${external.entityType} has no corresponding record in EOS.`,
        suggestedAction: 'quarantine',
      };
    }

    // 2. Amount Mismatch
    if (
      external.externalAmount !== undefined &&
      eos.eosAmount !== undefined &&
      Math.abs(external.externalAmount - eos.eosAmount) > 0.001
    ) {
      const variance = Math.abs(external.externalAmount - eos.eosAmount);
      return {
        isMatched: false,
        mismatchType: 'amount_mismatch',
        exceptionMessage: `Amount discrepancy detected between external system (${external.externalAmount}) and EOS (${eos.eosAmount}). Variance: ${variance}.`,
        suggestedAction: 'override_with_eos',
        varianceAmount: variance,
      };
    }

    // 3. Matched
    return {
      isMatched: true,
      suggestedAction: 'accept_external',
    };
  }

  /**
   * Applies resolution decision to a reconciliation exception.
   */
  static resolveException(
    exceptionId: string,
    action: 'override_with_eos' | 'accept_external' | 'quarantine' | 'manual_adjustment',
    justification: string,
    resolvedBy: string
  ): {
    exceptionId: string;
    action: string;
    resolvedAt: string;
    resolvedBy: string;
    status: 'resolved' | 'quarantined';
  } {
    if (!justification || justification.trim().length < 5) {
      throw new Error('RECONCILIATION_JUSTIFICATION_REQUIRED: A valid rationale of at least 5 characters is required to resolve an integration exception.');
    }

    return {
      exceptionId,
      action,
      resolvedAt: new Date().toISOString(),
      resolvedBy,
      status: action === 'quarantine' ? 'quarantined' : 'resolved',
    };
  }
}
