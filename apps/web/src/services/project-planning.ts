import type { ControlList } from './project-control.js';

export type PlanningKind = 'allocations' | 'designs' | 'impacts';
export interface AllocationInput {
  requirementId: string; expectedRequirementVersion: number;
  quantity?: string | null; unit?: string | null; location?: string | null;
  zone?: string | null; subLocation?: string | null; department?: string | null;
  ownerId?: string | null; notes?: string | null; reason: string;
}
export interface AllocationRecord {
  id: string; projectId: string; requirementId: string; requirementVersion: number | null; currentRequirementVersion?:number;
  requirementRevisionId: string | null; requirementTitle: string;
  quantity: string | null; unit: string | null; location: string | null; zone: string | null;
  subLocation: string | null; department: string | null; ownerId: string | null; notes: string | null;
  status: string; rowVersion: number; currentRevisionId: string | null; revision: number;
  provenanceState: string; staleSource: boolean; canRevise: boolean; createdAt: string; updatedAt: string;
}
export interface AllocationRevision {
  id: string; allocationId: string; revisionNumber: number; snapshot: Record<string, any> | null;
  snapshotHash: string | null; reason: string; authorId: string | null; createdAt: string;
  snapshotIntegrityVerified: boolean;
}
export interface QuantityComparison {
  requirementId: string; requirementVersion: number; requirementQuantity: string | null;
  unit: string | null; knownAllocationQuantity: string | null; unknownQuantityCount: number;
  unitMismatchCount: number; arithmeticDifference: string | null; quantityBasis: string | null;
  applicability: 'unknown'; staleAllocationCount: number;
}
export interface AllocationList extends ControlList<AllocationRecord> {
  meta?: NonNullable<ControlList<AllocationRecord>['meta']> & {quantityComparisons?: QuantityComparison[];quantityComparisonsTruncated?:boolean};
}

export interface DesignBriefInput {
  title: string; brief: string; discipline?: string | null; materials?: string | null;
  dimensions?: string | null; locationZone?: string | null; ownerId?: string | null;
  requirementRefs: {requirementId:string;expectedVersion:number}[];
  allocationRefs?: {allocationId:string;expectedVersion:number}[]; reason: string;
}
export interface DesignBrief extends Omit<DesignBriefInput,'reason'> {
  id:string; projectId:string; code:string|null; rowVersion:number; currentRevision:number;
  currentRevisionId:string|null; provenanceState:string; status:string; canRevise:boolean;
  fileStatus:'missing'; approvalState:'not_approved'|'legacy_unverified'; productionReleased:false;
  requirements:Record<string,any>[]; allocations:Record<string,any>[]; sourceStale:boolean;
}
export interface DesignBriefRevision {
  id:string; revisionNumber:number; snapshot:Record<string,any>|null; snapshotHash:string|null;
  reason:string; authorId:string|null; createdAt:string; snapshotIntegrityVerified:boolean; sourceStale?:boolean;
}
export interface ImpactChange {
  sourceType:string; sourceId:string; title:string; pinnedVersion:number; currentVersion:number|null;
  pinnedRevisionId:string; currentRevisionId:string|null; pinnedSnapshotHash:string;
  currentSnapshotHash:string|null; pinnedSnapshot:Record<string,any>; currentSnapshot:Record<string,any>|null;
}
export interface ImpactItem {
  targetType:'allocation'|'design'; targetId:string; title:string; targetVersion:number;
  targetRevisionId:string; impactFingerprint:string; changes:ImpactChange[]; authorityEffect:'advisory_only';
}
export interface ImpactList extends ControlList<ImpactItem> {
  meta?: NonNullable<ControlList<ImpactItem>['meta']> & {
    counts?:{allocations:number;designs:number;affected:number}; scannedTargets?:number; totalDraftTargets?:number; disclosure?:string;
  };
}
export interface ImpactAssessmentInput {
  targetType:'allocation'|'design'; targetId:string; expectedTargetVersion:number;
  impactFingerprint:string; assessment:string; proposedAction:string; reason:string;
}
export interface ImpactAssessment {
  id:string; projectId:string; targetType:'allocation'|'design'; targetId:string; targetVersion:number;
  targetRevisionId:string; impactFingerprint:string; sourceSnapshot:Record<string,any>;
  assessment:string; proposedAction:string; reason:string; actorId:string; createdAt:string; authorityEffect:'advisory_only';
}
