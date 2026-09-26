import { HttpException } from '@nestjs/common';
import type { Request } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { hasRolePermission, normalizeRole } from '@e3-eos/domain';
import { DbService } from '../common/db.service.js';
import { ProjectAccessService, type ProjectAccessContext, type ProjectAccessTransaction } from '../projects/project-access.service.js';
import { DurableProjectCommand } from '../projects/durable-project-command.js';

const permissions = ['projects.manage','tasks.manage','operations.manage','design.version'];
const read = {level:'viewer' as const,audiences:['internal' as const]};
const write = {...read,level:'editor' as const,permissions};
const reason = z.string().trim().min(1).max(2000), version = z.number().int().positive();
const instant = z.string().datetime({offset:true}).transform(value=>new Date(value).toISOString());
const forecastSchema = z.object({expectedTaskVersion:version,expectedForecastVersion:z.number().int().nonnegative(),
  startAt:instant.nullable(),finishAt:instant.nullable(),timezone:z.string().trim().min(1).max(100).nullable(),reason}).strict();
const dependencySchema = z.object({predecessorId:z.string().uuid(),successorId:z.string().uuid(),
  expectedPredecessorVersion:version,expectedSuccessorVersion:version,dependencyType:z.enum(['FS','SS','FF']),reason}).strict();
const archiveSchema=z.object({expectedVersion:version,reason}).strict();
const rangeSchema=z.object({from:instant,until:instant}).strict();
const fail=(code:string,detail:string,status=400):never=>{throw new HttpException({code,title:detail,detail},status);};
const date=(value:any):string|null=>value?new Date(value).toISOString():null;
const stable=(v:any):any=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
export const scheduleHash=(v:unknown)=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
function parse<T>(schema:z.ZodType<T>,body:unknown):T{const result=schema.safeParse(body);if(!result.success)return fail('SCHEDULE_VALIDATION_ERROR','Check identifiers, reviewed versions, dates and reason.');return result.data;}
function identifier(value:string){if(!z.string().uuid().safeParse(value).success)fail('SCHEDULE_VALIDATION_ERROR','A valid record identifier is required.');}
export function validateForecast(body:unknown){
  const input=parse(forecastSchema,body);
  if(input.startAt===null||input.finishAt===null||input.timezone===null){
    if(input.startAt!==null||input.finishAt!==null||input.timezone!==null)fail('SCHEDULE_WINDOW_INVALID','Provide both forecast instants and the source timezone, or clear all three.');
  }else{
    if(input.finishAt<input.startAt)fail('SCHEDULE_WINDOW_INVALID','Forecast finish must be on or after start.');
    try{new Intl.DateTimeFormat('en',{timeZone:input.timezone}).format();}catch{fail('SCHEDULE_TIMEZONE_INVALID','Use an IANA timezone such as Asia/Qatar or UTC.');}
    if(input.startAt<'1970-01-01T00:00:00.000Z'||input.finishAt>'2100-12-31T23:59:59.999Z')fail('SCHEDULE_WINDOW_INVALID','Forecast instants must be between 1970 and 2100.');
  }
  return input;
}
export interface ScheduleEdge {predecessorId:string;successorId:string;dependencyType:string}
/** Iterative traversal keeps maliciously deep graphs out of the call stack. */
export function wouldCreateScheduleCycle(edges:ScheduleEdge[],predecessorId:string,successorId:string){
  const next=new Map<string,string[]>();for(const e of edges)next.set(e.predecessorId,[...(next.get(e.predecessorId)||[]),e.successorId]);
  const queue=[successorId],seen=new Set<string>();while(queue.length){const item=queue.pop()!;if(item===predecessorId)return true;if(seen.has(item))continue;seen.add(item);queue.push(...(next.get(item)||[]));}return false;
}
function forecastSnapshot(row:any){return {contractVersion:'task-forecast.v1',projectId:row.project_id,taskId:row.id,forecastVersion:row.forecast_version,
  startAt:date(row.forecast_start),finishAt:date(row.forecast_finish),timezone:row.forecast_timezone,authorityEffect:'forecast_only'};}
function edgeSummary(row:any){return {id:row.id,projectId:row.project_id,predecessorId:row.predecessor_task_id,successorId:row.successor_task_id,
  dependencyType:row.dependency_type,rowVersion:row.row_version,isArchived:row.is_archived,provenanceState:row.provenance_state,createdAt:date(row.created_at)};}
const edgeSnapshot=(row:any)=>({...edgeSummary(row),dependencyId:row.id,authorityEffect:'planning_only'});
const edgeIntact=(row:any)=>!!row.change_snapshot&&scheduleHash(row.change_snapshot)===row.change_hash&&scheduleHash(edgeSnapshot(row))===row.change_hash;
const selectEdges=`SELECT d.*,c.snapshot AS change_snapshot,c.snapshot_hash AS change_hash FROM dependency_edges d
  LEFT JOIN dependency_changes c ON c.dependency_id=d.id AND c.organisation_id=d.organisation_id AND c.project_id=d.project_id AND c.revision_number=d.row_version`;
const selectTasks=`SELECT t.*,p.name AS package_name,p.status AS package_status,p.acceptance_state,u.name AS assignee_name,
  f.snapshot AS forecast_snapshot,f.snapshot_hash AS forecast_snapshot_hash
  FROM task_instances t JOIN work_packages p ON p.id=t.package_id AND p.organisation_id=t.organisation_id AND p.project_id=t.project_id
  LEFT JOIN users u ON u.id=t.assignee_id LEFT JOIN task_forecast_revisions f ON f.id=t.current_forecast_revision_id
    AND f.organisation_id=t.organisation_id AND f.project_id=t.project_id AND f.task_id=t.id`;

export class ScheduleService {
  private readonly access:ProjectAccessService; private readonly commands:DurableProjectCommand;
  constructor(db:DbService){this.access=new ProjectAccessService(db);this.commands=new DurableProjectCommand(db);}
  private canEdit(access:ProjectAccessContext){return access.accessLevel==='editor'&&permissions.some(p=>hasRolePermission(access.role,p,access.isSuperAdmin));}
  private integrity(row:any){return row.forecast_version===0
    ?!row.current_forecast_revision_id&&!row.forecast_start&&!row.forecast_finish&&!row.forecast_timezone
    :!!row.forecast_snapshot&&scheduleHash(row.forecast_snapshot)===row.forecast_snapshot_hash&&scheduleHash(forecastSnapshot(row))===row.forecast_snapshot_hash;}
  private summary(row:any,access?:ProjectAccessContext){return {id:row.id,projectId:row.project_id,packageId:row.package_id,packageName:row.package_name,
    title:row.title,assigneeId:row.assignee_id,assigneeName:row.assignee_name,state:row.state,isCompleted:row.is_completed,completedAt:date(row.completed_at),
    acceptanceState:row.acceptance_state,taskVersion:row.row_version,forecastVersion:row.forecast_version,startAt:date(row.forecast_start),finishAt:date(row.forecast_finish),
    timezone:row.forecast_timezone,currentRevisionId:row.current_forecast_revision_id,snapshotIntegrityVerified:this.integrity(row),
    baselineStatus:'unavailable' as const,canEditForecast:!!access&&this.canEdit(access)&&row.package_status==='active'&&!row.is_completed&&['planned','active'].includes(row.state)&&this.integrity(row)};}
  private async task(tx:ProjectAccessTransaction,access:ProjectAccessContext,id:string){
    const row=(await tx.query(`${selectTasks} WHERE t.id=$1 AND t.organisation_id=$2 AND t.project_id=$3 FOR UPDATE OF t,p`,[id,access.organisationId,access.project.id])).rows[0];
    if(!row||(normalizeRole(access.role)==='field_supervisor'&&row.assignee_id!==access.userId))return fail('SCHEDULE_TASK_NOT_FOUND','Task is not available in this project and assignment scope.',404);
    return row;
  }
  private async dependency(tx:ProjectAccessTransaction,access:ProjectAccessContext,id:string){
    const row=(await tx.query('SELECT * FROM dependency_edges WHERE id=$1 AND organisation_id=$2 AND project_id=$3 FOR UPDATE',[id,access.organisationId,access.project.id])).rows[0];
    if(!row||row.provenance_state!=='manually_recorded')return fail('SCHEDULE_DEPENDENCY_NOT_FOUND','Controlled dependency is not available in this project.',404);
    await this.task(tx,access,row.predecessor_task_id);await this.task(tx,access,row.successor_task_id);return row;
  }
  async timeline(project:string,req:Request){return this.access.withAccess(req,project,read,async(tx,access)=>{
    const field=normalizeRole(access.role)==='field_supervisor';
    const tasks=(await tx.query(`${selectTasks} WHERE t.organisation_id=$1 AND t.project_id=$2 AND (NOT $3::boolean OR t.assignee_id=$4)
      ORDER BY t.forecast_start NULLS LAST,t.id LIMIT 501`,[access.organisationId,access.project.id,field,access.userId])).rows;
    const ids=tasks.slice(0,500).map(t=>t.id);
    const edges=(await tx.query(`${selectEdges} WHERE d.organisation_id=$1 AND d.project_id=$2 AND d.provenance_state='manually_recorded'
      AND NOT d.is_archived AND d.predecessor_task_id=ANY($3::uuid[]) AND d.successor_task_id=ANY($3::uuid[]) ORDER BY d.created_at,d.id LIMIT 1001`,[access.organisationId,access.project.id,ids])).rows;
    const archived=(await tx.query(`${selectEdges} WHERE d.organisation_id=$1 AND d.project_id=$2 AND d.provenance_state='manually_recorded'
      AND d.is_archived AND d.predecessor_task_id=ANY($3::uuid[]) AND d.successor_task_id=ANY($3::uuid[]) ORDER BY d.created_at DESC,d.id LIMIT 201`,[access.organisationId,access.project.id,ids])).rows;
    const legacy=field?null:(await tx.query(`SELECT count(*)::int AS count FROM dependency_edges WHERE organisation_id=$1 AND project_id=$2 AND provenance_state='legacy_unverified' AND NOT is_archived`,[access.organisationId,access.project.id])).rows[0].count;
    const summary=tasks.slice(0,500).map(t=>this.summary(t,access)),byId=new Map(summary.map(t=>[t.id,t]));
    const dependencies=edges.slice(0,1000).map(row=>{
      const edge=edgeSummary(row),a=byId.get(edge.predecessorId),b=byId.get(edge.successorId);
      const left=edge.dependencyType==='SS'?a?.startAt:a?.finishAt,right=edge.dependencyType==='FF'?b?.finishAt:b?.startAt;
      return {...edge,snapshotIntegrityVerified:edgeIntact(row),timingState:!left||!right||!a?.snapshotIntegrityVerified||!b?.snapshotIntegrityVerified||!edgeIntact(row)?'unknown':left>right?'conflict':'consistent'};
    });
    return {data:{tasks:summary,dependencies,archivedDependencies:archived.slice(0,200).map(row=>({...edgeSummary(row),snapshotIntegrityVerified:edgeIntact(row)}))},meta:{dataAsOf:new Date().toISOString(),taskLimit:500,dependencyLimit:1000,truncated:tasks.length>500||edges.length>1000,archivedLimit:200,archivedTruncated:archived.length>200,
      legacyDependencyCount:legacy,assignmentScope:field?'assigned_tasks_only':'project',capabilities:{canEditForecast:this.canEdit(access),canEditDependencies:this.canEdit(access)&&!legacy&&tasks.length<=500&&edges.length<=1000},
      disclosure:'Forecasts are planning only. Timing checks cover displayed controlled dependencies; missing dates are unknown. No contractual baseline, resource availability or automatic rescheduling is inferred.'}};
  });}
  async forecast(project:string,taskId:string,body:unknown,req:Request){identifier(taskId);const input=validateForecast(body);
    return this.commands.run(req,project,{...write,operation:`schedule.${taskId}.forecast`,action:'schedule.forecast.changed',targetType:'task',input,
      authorize:async(tx,access)=>{await this.task(tx,access,taskId);}},async(tx,access)=>{
      const row=await this.task(tx,access,taskId);
      if(row.row_version!==input.expectedTaskVersion||row.forecast_version!==input.expectedForecastVersion)fail('SCHEDULE_VERSION_CONFLICT','The task or forecast changed. Refresh and review the new versions.',409);
      if(!this.integrity(row))fail('SCHEDULE_HISTORY_CONFLICT','Forecast differs from its retained revision. Reconciliation is required.',409);
      if(row.is_completed||!['planned','active'].includes(row.state)||row.package_status!=='active')fail('SCHEDULE_TASK_CLOSED','Only open tasks in active packages can be forecast.',409);
      const revisionId=randomUUID(),next=row.forecast_version+1;
      const snapshot=forecastSnapshot({...row,forecast_version:next,forecast_start:input.startAt,forecast_finish:input.finishAt,forecast_timezone:input.timezone});
      await tx.query(`INSERT INTO task_forecast_revisions(id,organisation_id,project_id,task_id,revision_number,snapshot,snapshot_hash,reason,actor_id)
        VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)`,[revisionId,access.organisationId,access.project.id,taskId,next,JSON.stringify(snapshot),scheduleHash(snapshot),input.reason,access.userId]);
      await tx.query(`UPDATE task_instances SET forecast_start=$4,forecast_finish=$5,forecast_timezone=$6,forecast_version=$7,current_forecast_revision_id=$8,
        row_version=row_version+1,updated_at=clock_timestamp() WHERE id=$1 AND organisation_id=$2 AND project_id=$3`,[taskId,access.organisationId,access.project.id,input.startAt,input.finishAt,input.timezone,next,revisionId]);
      return {id:taskId,version:row.row_version+1,data:this.summary(await this.task(tx,access,taskId),access),event:{revisionId,forecastVersion:next,snapshotHash:scheduleHash(snapshot),reason:input.reason,authorityEffect:'forecast_only'}};
    });
  }
  /** Complete, transaction-scoped source for review candidates; never a truncated baseline. */
  async captureSource(tx:ProjectAccessTransaction,access:ProjectAccessContext){
    if(normalizeRole(access.role)==='field_supervisor')fail('SCHEDULE_PLANNING_SCOPE_REQUIRED','Project-wide planning is unavailable to assignment-only roles.',403);
    const tasks=(await tx.query(`${selectTasks} WHERE t.organisation_id=$1 AND t.project_id=$2 ORDER BY t.id LIMIT 501`,[access.organisationId,access.project.id])).rows;
    const edges=(await tx.query(`${selectEdges} WHERE d.organisation_id=$1 AND d.project_id=$2 AND NOT d.is_archived ORDER BY d.id LIMIT 1001`,[access.organisationId,access.project.id])).rows;
    if(tasks.length>500||edges.length>1000)fail('SCHEDULE_CAPTURE_LIMIT','A complete candidate supports at most 500 tasks and 1,000 active dependencies.',409);
    if(tasks.some(row=>!this.integrity(row))||edges.some(row=>row.provenance_state!=='manually_recorded'||!edgeIntact(row)))fail('SCHEDULE_HISTORY_CONFLICT','Reconcile legacy or inconsistent schedule history before capturing a candidate.',409);
    return {tasks:tasks.map(row=>({...this.summary(row),packageStatus:row.package_status})),dependencies:edges.map(edgeSummary)};
  }
  async forecastHistory(project:string,taskId:string,req:Request){identifier(taskId);return this.access.withAccess(req,project,read,async(tx,access)=>{
    await this.task(tx,access,taskId);const rows=(await tx.query(`SELECT * FROM task_forecast_revisions WHERE organisation_id=$1 AND project_id=$2 AND task_id=$3 ORDER BY revision_number DESC LIMIT 501`,[access.organisationId,access.project.id,taskId])).rows;
    return this.history(rows);
  });}
  private history(rows:any[]){return {data:rows.slice(0,500).map(row=>({id:row.id,revisionNumber:row.revision_number,action:row.action||'forecast_changed',snapshot:row.snapshot,
    snapshotHash:row.snapshot_hash,snapshotIntegrityVerified:scheduleHash(row.snapshot)===row.snapshot_hash,reason:row.reason,actorId:row.actor_id,createdAt:date(row.created_at)})),meta:{limit:500,truncated:rows.length>500}};}
  private async appendDependency(tx:ProjectAccessTransaction,access:ProjectAccessContext,row:any,action:string,reason:string){
    const snapshot=edgeSnapshot(row),hash=scheduleHash(snapshot),revisionId=randomUUID();
    await tx.query(`INSERT INTO dependency_changes(id,organisation_id,project_id,dependency_id,revision_number,action,snapshot,snapshot_hash,reason,actor_id)
      VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10)`,[revisionId,access.organisationId,access.project.id,row.id,row.row_version,action,JSON.stringify(snapshot),hash,reason,access.userId]);
    return {revisionId,snapshotHash:hash};
  }
  async addDependency(project:string,body:unknown,req:Request){const input=parse(dependencySchema,body);
    if(input.predecessorId===input.successorId)fail('SCHEDULE_CYCLE','A task cannot depend on itself.');
    return this.commands.run(req,project,{...write,operation:'schedule.dependency.create',action:'schedule.dependency.created',targetType:'dependency',input,
      authorize:async(tx,access)=>{await this.task(tx,access,input.predecessorId);await this.task(tx,access,input.successorId);}},async(tx,access)=>{
      const a=await this.task(tx,access,input.predecessorId),b=await this.task(tx,access,input.successorId);
      if(a.row_version!==input.expectedPredecessorVersion||b.row_version!==input.expectedSuccessorVersion)fail('SCHEDULE_VERSION_CONFLICT','A linked task changed. Refresh before adding a dependency.',409);
      if(b.is_completed||!['planned','active'].includes(b.state)||a.package_status!=='active'||b.package_status!=='active'||!['planned','active','completed'].includes(a.state))fail('SCHEDULE_TASK_CLOSED','The successor must be open and both packages active.',409);
      const rows=(await tx.query(`${selectEdges} WHERE d.organisation_id=$1 AND d.project_id=$2 AND NOT d.is_archived ORDER BY d.id LIMIT 1001`,[access.organisationId,access.project.id])).rows;
      if(rows.some(e=>e.provenance_state!=='manually_recorded'))fail('SCHEDULE_LEGACY_REVIEW_REQUIRED','Review legacy dependencies before extending this project graph.',409);
      if(rows.length>=1000)fail('SCHEDULE_GRAPH_LIMIT','This graph has reached the supported 1,000 active dependency limit.',409);
      if(rows.some(row=>!edgeIntact(row)))fail('SCHEDULE_HISTORY_CONFLICT','A dependency differs from its retained history. Reconcile before extending this graph.',409);
      const edges=rows.map(edgeSummary);
      if(edges.some(e=>e.predecessorId===input.predecessorId&&e.successorId===input.successorId))fail('SCHEDULE_DUPLICATE_DEPENDENCY','An active dependency already connects these tasks.',409);
      if(wouldCreateScheduleCycle(edges,input.predecessorId,input.successorId))fail('SCHEDULE_CYCLE','This dependency would create a cycle.',409);
      const id=randomUUID(),row=(await tx.query(`INSERT INTO dependency_edges(id,organisation_id,project_id,predecessor_id,successor_id,predecessor_task_id,successor_task_id,dependency_type,provenance_state,created_by)
        VALUES($1,$2,$3,$4::uuid::text,$5::uuid::text,$4::uuid,$5::uuid,$6,'manually_recorded',$7) RETURNING *`,[id,access.organisationId,access.project.id,input.predecessorId,input.successorId,input.dependencyType,access.userId])).rows[0];
      const history=await this.appendDependency(tx,access,row,'created',input.reason);
      return {id,version:1,data:edgeSummary(row),event:{...history,reason:input.reason,authorityEffect:'planning_only'}};
    });
  }
  async archiveDependency(project:string,dependencyId:string,body:unknown,req:Request){identifier(dependencyId);const input=parse(archiveSchema,body);
    return this.commands.run(req,project,{...write,operation:`schedule.dependency.${dependencyId}.archive`,action:'schedule.dependency.archived',targetType:'dependency',input,
      authorize:async(tx,access)=>{await this.dependency(tx,access,dependencyId);}},async(tx,access)=>{
      const row=await this.dependency(tx,access,dependencyId);
      if(row.row_version!==input.expectedVersion||row.is_archived)fail('SCHEDULE_VERSION_CONFLICT','Dependency changed. Refresh before archiving.',409);
      const prior=(await tx.query(`SELECT * FROM dependency_changes WHERE dependency_id=$1 AND organisation_id=$2 AND project_id=$3 AND revision_number=$4`,[dependencyId,access.organisationId,access.project.id,row.row_version])).rows[0];
      if(!prior||scheduleHash(prior.snapshot)!==prior.snapshot_hash||scheduleHash({...edgeSummary(row),dependencyId:row.id,authorityEffect:'planning_only'})!==prior.snapshot_hash)fail('SCHEDULE_HISTORY_CONFLICT','Dependency differs from its retained history.',409);
      const updated=(await tx.query(`UPDATE dependency_edges SET is_archived=true,row_version=row_version+1 WHERE id=$1 AND organisation_id=$2 AND project_id=$3 RETURNING *`,[dependencyId,access.organisationId,access.project.id])).rows[0];
      const history=await this.appendDependency(tx,access,updated,'archived',input.reason);
      return {id:dependencyId,version:updated.row_version,data:edgeSummary(updated),event:{...history,reason:input.reason,authorityEffect:'planning_only'}};
    });
  }
  async dependencyHistory(project:string,dependencyId:string,req:Request){identifier(dependencyId);return this.access.withAccess(req,project,read,async(tx,access)=>{
    await this.dependency(tx,access,dependencyId);return this.history((await tx.query(`SELECT * FROM dependency_changes WHERE organisation_id=$1 AND project_id=$2 AND dependency_id=$3 ORDER BY revision_number DESC LIMIT 501`,[access.organisationId,access.project.id,dependencyId])).rows);
  });}
  async calendar(query:unknown,req:Request){const input=parse(rangeSchema,query);
    if(input.until<=input.from||Date.parse(input.until)-Date.parse(input.from)>366*86400000)fail('SCHEDULE_RANGE_INVALID','Choose a positive calendar window no longer than 366 days.');
    return this.access.withVisibleProjects(req,{audiences:['internal']},async(tx,access,projects)=>{
      const field=normalizeRole(access.role)==='field_supervisor';
      const rows=(await tx.query(`${selectTasks} WHERE t.organisation_id=$1 AND t.project_id=ANY($2::uuid[]) AND (NOT $3::boolean OR t.assignee_id=$4)
        AND t.forecast_start<$6::timestamptz AND t.forecast_finish>=$5::timestamptz AND t.forecast_version>0
        ORDER BY t.forecast_start,t.id LIMIT 1001`,[access.organisationId,projects.map(p=>p.id),field,access.userId,input.from,input.until])).rows;
      const projectMap=new Map(projects.map(p=>[p.id,p]));
      return {data:rows.slice(0,1000).map(row=>({...this.summary(row),projectCode:projectMap.get(row.project_id)?.project_code,projectTitle:projectMap.get(row.project_id)?.title})),
        meta:{from:input.from,until:input.until,dataAsOf:new Date().toISOString(),limit:1000,truncated:rows.length>1000,accessibleProjectCount:projects.length,
          assignmentScope:field?'assigned_tasks_only':'project',disclosure:'Saved task forecasts overlapping this UTC window. Unscheduled work, contractual baselines, venue bookings, crew capacity and external calendars are not inferred.'}};
    });
  }
}
