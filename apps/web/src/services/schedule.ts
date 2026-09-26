export interface ScheduledTask {
  id:string;projectId:string;packageId:string;packageName:string;title:string;assigneeId:string|null;assigneeName:string|null;
  state:string;isCompleted:boolean;completedAt:string|null;acceptanceState:string;taskVersion:number;forecastVersion:number;
  startAt:string|null;finishAt:string|null;timezone:string|null;currentRevisionId:string|null;snapshotIntegrityVerified:boolean;
  baselineStatus:'unavailable';canEditForecast:boolean;projectCode?:string;projectTitle?:string;
}
export interface PlannedDependency {
  id:string;projectId:string;predecessorId:string;successorId:string;dependencyType:'FS'|'SS'|'FF';rowVersion:number;
  isArchived:boolean;provenanceState:string;createdAt:string;timingState?:'unknown'|'conflict'|'consistent';snapshotIntegrityVerified?:boolean;
}
export interface ScheduleHistory {
  id:string;revisionNumber:number;action:string;snapshot:Record<string,unknown>;snapshotHash:string;snapshotIntegrityVerified:boolean;
  reason:string;actorId:string;createdAt:string;
}
export interface ForecastInput {expectedTaskVersion:number;expectedForecastVersion:number;startAt:string|null;finishAt:string|null;timezone:string|null;reason:string}
export interface DependencyInput {predecessorId:string;successorId:string;expectedPredecessorVersion:number;expectedSuccessorVersion:number;dependencyType:'FS'|'SS'|'FF';reason:string}
export interface TimelineResult {data:{tasks:ScheduledTask[];dependencies:PlannedDependency[];archivedDependencies:PlannedDependency[]};meta:{dataAsOf:string;taskLimit:number;dependencyLimit:number;truncated:boolean;archivedLimit:number;archivedTruncated:boolean;legacyDependencyCount:number|null;assignmentScope:string;capabilities:{canEditForecast:boolean;canEditDependencies:boolean};disclosure:string}}
export interface CalendarResult {data:ScheduledTask[];meta:{from:string;until:string;dataAsOf:string;limit:number;truncated:boolean;accessibleProjectCount:number;assignmentScope:string;disclosure:string}}
export interface ScheduleHistoryResult {data:ScheduleHistory[];meta:{limit:number;truncated:boolean}}
