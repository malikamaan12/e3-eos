/**
 * Canonical Project Maturity Lifecycle
 */
export type ProjectMaturity =
  | 'idea'
  | 'developing'
  | 'submitted'
  | 'negotiating'
  | 'authorised'
  | 'delivering'
  | 'closing'
  | 'closed';

/**
 * Distinct Project Outcome Dimension (never inferred from maturity alone)
 */
export type ProjectOutcome =
  | 'undetermined'
  | 'delivered'
  | 'lost'
  | 'withdrawn'
  | 'cancelled';

/**
 * Task / Work State
 */
export type WorkState =
  | 'planned'
  | 'active'
  | 'waiting'
  | 'blocked'
  | 'review'
  | 'completed'
  | 'cancelled'
  | 'reopened';

/**
 * Acceptance State (strictly decoupled from WorkState.completed)
 */
export type AcceptanceState =
  | 'not_required_with_basis'
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'conditional';

/**
 * Requirement Disposition
 */
export type RequirementDisposition =
  | 'applicability_unknown'
  | 'applicable_open'
  | 'satisfied'
  | 'exception_authorised'
  | 'not_applicable'
  | 'formally_amended'
  | 'superseded';

/**
 * Exception Validity (Temporal / Usage status)
 */
export type ExceptionValidity =
  | 'draft'
  | 'requested'
  | 'authorised'
  | 'rejected'
  | 'consumed'
  | 'expired'
  | 'revoked';

/**
 * Exception Review Lifecycle (Independent of validity)
 */
export type ExceptionReviewState =
  | 'not_required_with_basis'
  | 'open'
  | 'in_review'
  | 'remediation_required'
  | 'closed';

/**
 * Resource Reservation Lifecycle
 */
export type ReservationState =
  | 'tentative'
  | 'held'
  | 'confirmed'
  | 'in_use'
  | 'return_pending'
  | 'released'
  | 'cancelled';

/**
 * Consequential Release Lifecycle
 */
export type ReleaseState =
  | 'draft'
  | 'awaiting_authority'
  | 'authorised_for_scope'
  | 'execution_pending'
  | 'executed'
  | 'superseded'
  | 'revoked_for_future_use';

/**
 * Accounting Ledger Mirror State
 */
export type AccountingMirrorState =
  | 'unverified'
  | 'submitted'
  | 'accepted_by_ledger'
  | 'posted'
  | 'rejected'
  | 'disputed'
  | 'reversed';

/**
 * Progressive Completeness / Knowledge Status
 */
export type KnowledgeStatus =
  | 'unknown'
  | 'assumed'
  | 'requested'
  | 'confirmed'
  | 'not_applicable';
