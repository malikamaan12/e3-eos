export type ProductionStatus =
  | 'not_released'
  | 'approved_for_production'
  | 'material_procurement'
  | 'fabrication'
  | 'assembly'
  | 'finishing'
  | 'qc_inspection'
  | 'rework_required'
  | 'ready_for_dispatch'
  | 'dispatched'
  | 'delivered'
  | 'installed'
  | 'closed';

export type SnagSeverity = 'critical' | 'major' | 'minor' | 'observation';

export type SnagStatus =
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'ready_for_reinspection'
  | 'resolved'
  | 'accepted'
  | 'reopened';

export interface ProductionPackage {
  id: string;
  packageCode: string;
  projectId: string;
  vendorId: string;
  linkedRequirementId?: string;
  approvedDesignRevisionId?: string;
  boqLineIds: string[];
  title: string;
  quantity: number;
  completedQuantity: number;
  material: string;
  finish?: string;
  productionOwnerId: string;
  startDate: Date;
  requiredCompletionDate: Date;
  deliveryDate: Date;
  status: ProductionStatus;
  fabricationReleasedAt?: Date;
  fabricationReleasedBy?: string;
  images: string[];
  documents: string[];
}

export interface FabricationReleaseGate {
  designApproved: boolean;
  commercialApproved: boolean;
  safetyApproved: boolean;
  vendorAwarded: boolean;
  approvedBy: string;
  canRelease: boolean;
  unmetConditions: string[];
}

export interface InspectionChecklistItem {
  item: string;
  passed: boolean;
  notes?: string;
}

export interface QualityInspection {
  id: string;
  packageId: string;
  itemId?: string;
  inspectorId: string;
  inspectionDate: Date;
  inspectionType: 'factory_acceptance' | 'site_receipt' | 'pre_dispatch' | 'installation' | 'final_handover';
  checklist: InspectionChecklistItem[];
  result: 'passed' | 'failed' | 'conditional';
  photos: string[];
}

export interface SnagRecord {
  id: string;
  inspectionId?: string;
  packageId?: string;
  projectId: string;
  title: string;
  description?: string;
  severity: SnagSeverity;
  status: SnagStatus;
  assignedTo?: string;
  dueDate?: Date;
  resolutionNotes?: string;
  blocksDispatch: boolean;
  blocksReadiness: boolean;
  createdAt: Date;
  resolvedAt?: Date;
}

export class ProductionEngine {
  /**
   * Evaluates fabrication release gates based on policy configuration (Sprint 03 Module 5).
   * Invariant: Production cannot begin unless design, commercial, structural/HSE, and vendor award are satisfied.
   */
  static evaluateFabricationRelease(params: {
    designApproved: boolean;
    commercialApproved: boolean;
    safetyApproved: boolean;
    vendorAwarded: boolean;
    approvedBy: string;
  }): FabricationReleaseGate {
    const unmet: string[] = [];
    if (!params.designApproved) unmet.push('Design package not approved for fabrication');
    if (!params.commercialApproved) unmet.push('Commercial budget commitment not approved');
    if (!params.safetyApproved) unmet.push('Structural and HSE approval not verified');
    if (!params.vendorAwarded) unmet.push('Vendor award not confirmed');

    return {
      ...params,
      canRelease: unmet.length === 0,
      unmetConditions: unmet,
    };
  }

  /**
   * Asserts and releases a production package for fabrication.
   */
  static releaseForFabrication(
    pkg: ProductionPackage,
    gate: {
      designApproved: boolean;
      commercialApproved: boolean;
      safetyApproved: boolean;
      vendorAwarded: boolean;
      approvedBy: string;
    }
  ): ProductionPackage {
    const evalResult = this.evaluateFabricationRelease(gate);
    if (!evalResult.canRelease) {
      throw new Error(
        `FABRICATION_RELEASE_BLOCKED: Package ${pkg.packageCode} cannot be released for fabrication. Unmet conditions: [${evalResult.unmetConditions.join('; ')}]`
      );
    }

    return {
      ...pkg,
      status: 'approved_for_production',
      fabricationReleasedAt: new Date(),
      fabricationReleasedBy: gate.approvedBy,
    };
  }

  /**
   * Checks whether open snags block package dispatch (Sprint 03 Module 6).
   * Invariant: Critical snags unconditionally block 'ready_for_dispatch'.
   */
  static validateDispatchReadiness(_pkg: ProductionPackage, snags: SnagRecord[]): {
    canDispatch: boolean;
    blockingSnags: SnagRecord[];
  } {
    const blockingSnags = snags.filter(
      (s) =>
        (s.severity === 'critical' || s.blocksDispatch) &&
        ['open', 'assigned', 'in_progress', 'ready_for_reinspection', 'reopened'].includes(s.status)
    );

    return {
      canDispatch: blockingSnags.length === 0,
      blockingSnags,
    };
  }

  /**
   * Advances package status enforcing quality and snagging invariants.
   */
  static transitionPackageStatus(
    pkg: ProductionPackage,
    targetStatus: ProductionStatus,
    packageSnags: SnagRecord[] = []
  ): ProductionPackage {
    if (targetStatus === 'ready_for_dispatch' || targetStatus === 'dispatched') {
      const { canDispatch, blockingSnags } = this.validateDispatchReadiness(pkg, packageSnags);
      if (!canDispatch) {
        const titles = blockingSnags.map((s) => `[${s.severity.toUpperCase()}] ${s.title}`).join(', ');
        throw new Error(
          `DISPATCH_BLOCKED_BY_CRITICAL_SNAGS: Cannot advance package ${pkg.packageCode} to '${targetStatus}'. Unresolved blocking snags: ${titles}`
        );
      }
    }

    return {
      ...pkg,
      status: targetStatus,
    };
  }

  /**
   * Transitions snag state machine with resolution audit.
   */
  static transitionSnagStatus(
    snag: SnagRecord,
    newStatus: SnagStatus,
    notes?: string
  ): SnagRecord {
    const isResolving = newStatus === 'resolved' || newStatus === 'accepted';
    return {
      ...snag,
      status: newStatus,
      resolutionNotes: notes || snag.resolutionNotes,
      resolvedAt: isResolving ? new Date() : undefined,
    };
  }
}
