import { safeSha256 } from './crypto-util.js';

export type AuthorityType =
  | 'civil_defense'
  | 'municipality'
  | 'venue_noc'
  | 'engineering_third_party'
  | 'food_safety'
  | 'environmental';

export type ComplianceStatus = 'active' | 'expired' | 'alternative_verified' | 'revoked' | 'pending';

export type VerificationMode = 'digital_upload' | 'physical_verified';

export interface PhysicalVerificationDetails {
  inspectorName: string;
  inspectionDate: string;
  badgeOrId: string;
  siteOfficeReference: string;
  physicalStampSighted: boolean;
  notes?: string;
}

export interface ComplianceObligation {
  id: string;
  projectId: string;
  authorityType: AuthorityType;
  title: string;
  permitReference: string;
  issueDate?: string;
  validFrom: string;
  validUntil: string;
  applicableZone: string;
  criticalForOpening: boolean;
  status: ComplianceStatus;
  verificationMode: VerificationMode;
  physicalVerification?: PhysicalVerificationDetails;
  auditHistory: Array<{
    timestamp: string;
    action: string;
    performedBy: string;
    notes?: string;
  }>;
  notes?: string;
}

export interface ZoneComplianceEvaluation {
  zone: string;
  isCompliant: boolean;
  totalObligations: number;
  activeObligations: number;
  alternativeVerifiedObligations: number;
  expiredObligations: number;
  missingOrPendingObligations: number;
  criticalBlockers: ComplianceObligation[];
  canOpenZone: boolean;
  summaryReason: string;
}

export class ComplianceObligationEngine {
  /**
   * Asserts whether a single obligation is valid at the target point in time.
   * Invariant AT-061: Fail-closed compliance. An absent or expired permit strictly blocks operations;
   * no administrative grace period allows it.
   */
  static isObligationValidAtTime(
    obligation: ComplianceObligation,
    targetTime: Date = new Date()
  ): { valid: boolean; reason?: string } {
    if (obligation.status === 'revoked') {
      return { valid: false, reason: `Obligation '${obligation.title}' has been REVOKED by authority.` };
    }

    if (obligation.status === 'pending') {
      return { valid: false, reason: `Obligation '${obligation.title}' is PENDING and not yet granted.` };
    }

    const from = new Date(obligation.validFrom).getTime();
    const until = new Date(obligation.validUntil).getTime();
    const target = targetTime.getTime();

    if (target < from) {
      return { valid: false, reason: `Obligation '${obligation.title}' is not yet active (valid from ${obligation.validFrom}).` };
    }

    if (target > until) {
      return { valid: false, reason: `Obligation '${obligation.title}' EXPIRED on ${obligation.validUntil}. Fail-closed: No grace period permitted.` };
    }

    // Invariant AT-060: Missing digital upload != absent approval if alternative verification exists.
    if (obligation.verificationMode === 'physical_verified') {
      if (
        !obligation.physicalVerification ||
        !obligation.physicalVerification.physicalStampSighted ||
        !obligation.physicalVerification.badgeOrId
      ) {
        return {
          valid: false,
          reason: `Obligation '${obligation.title}' physical verification is incomplete or lacks sighted stamp/badge.`,
        };
      }
      return { valid: true };
    }

    if (obligation.status === 'active' || obligation.status === 'alternative_verified') {
      return { valid: true };
    }

    return { valid: false, reason: `Obligation '${obligation.title}' status is '${obligation.status}'.` };
  }

  /**
   * Evaluates zone compliance for opening release (AT-060, AT-061).
   */
  static evaluateZoneCompliance(
    zone: string,
    obligations: ComplianceObligation[],
    targetTime: Date = new Date()
  ): ZoneComplianceEvaluation {
    const relevant = obligations.filter(
      (o) => o.applicableZone === zone || o.applicableZone === 'all' || o.applicableZone === 'VENUE'
    );

    let activeCount = 0;
    let alternativeCount = 0;
    let expiredCount = 0;
    let missingOrPendingCount = 0;
    const criticalBlockers: ComplianceObligation[] = [];

    for (const obl of relevant) {
      const check = this.isObligationValidAtTime(obl, targetTime);
      if (check.valid) {
        if (obl.verificationMode === 'physical_verified') {
          alternativeCount++;
        } else {
          activeCount++;
        }
      } else {
        if (obl.status === 'expired' || new Date(obl.validUntil).getTime() < targetTime.getTime()) {
          expiredCount++;
        } else {
          missingOrPendingCount++;
        }

        if (obl.criticalForOpening) {
          criticalBlockers.push(obl);
        }
      }
    }

    const canOpenZone = criticalBlockers.length === 0;
    const isCompliant = canOpenZone && expiredCount === 0 && missingOrPendingCount === 0;

    const summaryReason = canOpenZone
      ? `Zone '${zone}' has passed all critical regulatory compliance obligations (${activeCount} active, ${alternativeCount} alternative physical verified).`
      : `Zone '${zone}' is BLOCKED from opening due to ${criticalBlockers.length} critical compliance blocker(s): [${criticalBlockers.map((b) => `${b.authorityType}: ${b.title}`).join('; ')}]. No administrative grace period allowed.`;

    return {
      zone,
      isCompliant,
      totalObligations: relevant.length,
      activeObligations: activeCount,
      alternativeVerifiedObligations: alternativeCount,
      expiredObligations: expiredCount,
      missingOrPendingObligations: missingOrPendingCount,
      criticalBlockers,
      canOpenZone,
      summaryReason,
    };
  }

  /**
   * Asserts ready-to-open compliance gate (AT-061).
   * Throws strict error if any critical obligation is missing or expired.
   */
  static assertComplianceGate(
    zone: string,
    obligations: ComplianceObligation[],
    targetTime: Date = new Date()
  ): void {
    const evalResult = this.evaluateZoneCompliance(zone, obligations, targetTime);
    if (!evalResult.canOpenZone) {
      throw new Error(
        `COMPLIANCE_GATE_FAIL_CLOSED: Zone ${zone} release denied. ${evalResult.summaryReason}`
      );
    }
  }

  /**
   * Records alternative verification with immutable audit seal (AT-060).
   */
  static verifyAlternativePhysical(
    obligation: ComplianceObligation,
    details: PhysicalVerificationDetails,
    verifiedBy: string
  ): ComplianceObligation {
    if (!details.physicalStampSighted) {
      throw new Error('ALTERNATIVE_VERIFICATION_REJECTED: Physical regulatory stamp must be sighted by authorized inspector.');
    }

    const auditPayload = {
      timestamp: new Date().toISOString(),
      action: 'ALTERNATIVE_PHYSICAL_VERIFICATION',
      performedBy: verifiedBy,
      details,
    };
    const auditHash = safeSha256(auditPayload);

    const auditEntry = {
      timestamp: auditPayload.timestamp,
      action: 'ALTERNATIVE_PHYSICAL_VERIFICATION',
      performedBy: verifiedBy,
      notes: `Verified physical permit on-site: ref ${details.siteOfficeReference}, inspector badge ${details.badgeOrId} [seal: ${auditHash.substring(0, 12)}]`,
    };

    return {
      ...obligation,
      status: 'alternative_verified',
      verificationMode: 'physical_verified',
      physicalVerification: details,
      auditHistory: [...obligation.auditHistory, auditEntry],
    };
  }
}
