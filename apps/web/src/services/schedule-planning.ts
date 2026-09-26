import type { ScheduledTask, PlannedDependency } from './schedule.js';
export type PlanKind='calendar'|'milestone'|'baseline_candidate';
export interface WorkInterval {startMinute:number;endMinute:number}
export interface CalendarDefinition {timezone:string;week:{day:number;intervals:WorkInterval[]}[];exceptions:{date:string;intervals:WorkInterval[];note:string}[]}
export interface MilestoneDefinition {targetAt:string|null;timezone:string|null;notes:string}
export interface CandidateCounts {tasks:number;scheduledTasks:number;dependencies:number;calendars:number;milestones:number}
export interface CandidateSource {contractVersion:string;projectId:string;tasks:ScheduledTask[];dependencies:PlannedDependency[];planning:PlanSnapshot[]}
export interface CandidatePayload {sourceFingerprint:string;counts:CandidateCounts;source?:CandidateSource}
export interface PlanSnapshot {recordId:string;projectId:string;kind:PlanKind;title:string;version:number;payload:CalendarDefinition|MilestoneDefinition|CandidatePayload;authorityEffect:string}
export interface PlanRecord {id:string;projectId:string;kind:PlanKind;title:string;version:number;payload:CalendarDefinition|MilestoneDefinition|CandidatePayload;snapshotIntegrityVerified:boolean;createdAt:string;updatedAt:string;approvalStatus:'not_approved'}
export interface PlanList {data:PlanRecord[];meta:{canEdit:boolean;limit:number;candidateLimit:number;truncated:boolean;dataAsOf:string}}
export interface PlanHistory {data:{id:string;version:number;snapshot:PlanSnapshot;snapshotIntegrityVerified:boolean;reason:string;actorId:string;createdAt:string}[];meta:{limit:number;truncated:boolean}}
export interface CandidatePreview {data:CandidatePayload&{source:CandidateSource};meta:{dataAsOf:string}}
export interface CandidateComparison {data:{candidate:PlanRecord;currentFingerprint:string;sourceChanged:boolean;planningChanged:boolean;dependenciesChanged:boolean;changes:{taskId:string;title:string;status:string;beforeStart:string|null;beforeFinish:string|null;currentStart:string|null;currentFinish:string|null;finishShiftMinutes:number|null}[]};meta:{dataAsOf:string}}
export type CreatePlanInput={kind:'calendar';title:string;payload:CalendarDefinition;reason:string}|{kind:'milestone';title:string;payload:MilestoneDefinition;reason:string};
