import { HttpException } from '@nestjs/common';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { hasRolePermission, normalizeRole } from '@e3-eos/domain';
import { DbService } from '../common/db.service.js';
import { ProjectAccessService, type ProjectAccessContext, type ProjectAccessTransaction } from '../projects/project-access.service.js';
import { DurableProjectCommand } from '../projects/durable-project-command.js';
import { ScheduleService, scheduleHash } from './schedule.service.js';

const permissions=['projects.manage','tasks.manage','operations.manage','design.version'];
const read={level:'viewer' as const,audiences:['internal' as const]},write={...read,level:'editor' as const,permissions};
const reason=z.string().trim().min(1).max(2000),title=z.string().trim().min(1).max(200),version=z.number().int().positive();
const fail=(code:string,detail:string,status=400):never=>{throw new HttpException({code,title:detail,detail},status);};
const zone=z.string().trim().min(1).max(100).refine(value=>{try{new Intl.DateTimeFormat('en',{timeZone:value}).format();return true;}catch{return false;}},'Use an IANA timezone.');
const minutes=z.number().int().min(0).max(1440);
const interval=z.object({startMinute:minutes,endMinute:minutes}).strict().refine(v=>v.startMinute<v.endMinute,'Finish must follow start within the same day.');
const day=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>v>='1970-01-01'&&v<='2100-12-31'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v);
const calendarPayload=z.object({timezone:zone,week:z.array(z.object({day:z.number().int().min(0).max(6),intervals:z.array(interval).max(4)}).strict()).length(7),
  exceptions:z.array(z.object({date:day,intervals:z.array(interval).max(4),note:z.string().trim().max(500)}).strict()).max(100)}).strict();
const instant=z.string().datetime({offset:true}).transform(value=>new Date(value).toISOString()).refine(v=>v>='1970-01-01T00:00:00.000Z'&&v<='2100-12-31T23:59:59.999Z');
const milestonePayload=z.object({targetAt:instant.nullable(),timezone:zone.nullable(),notes:z.string().trim().max(2000)}).strict()
  .refine(v=>(v.targetAt===null)===(v.timezone===null),'Supply both the target instant and timezone, or neither.');
const candidateSchema=z.object({title,expectedFingerprint:z.string().regex(/^[a-f0-9]{64}$/),reason}).strict();
const createSchema=z.discriminatedUnion('kind',[
  z.object({kind:z.literal('calendar'),title,payload:calendarPayload,reason}).strict(),
  z.object({kind:z.literal('milestone'),title,payload:milestonePayload,reason}).strict(),
]);
const reviseSchema=z.object({expectedVersion:version,title,payload:z.unknown(),reason}).strict();
const select=`SELECT r.*,v.snapshot,v.snapshot_hash FROM schedule_plan_records r LEFT JOIN schedule_plan_revisions v
  ON v.id=r.current_revision_id AND v.organisation_id=r.organisation_id AND v.project_id=r.project_id AND v.record_id=r.id`;
const snapshot=(row:any)=>({contractVersion:'schedule-plan.v1',recordId:row.id,projectId:row.project_id,kind:row.kind,title:row.title,version:row.row_version,payload:row.payload,authorityEffect:'planning_only'});
const intact=(row:any)=>!!row.snapshot&&scheduleHash(row.snapshot)===row.snapshot_hash&&scheduleHash(snapshot(row))===row.snapshot_hash;
const iso=(value:any)=>new Date(value).toISOString();
function parse<T>(schema:z.ZodType<T,any,any>,input:unknown):T{const result=schema.safeParse(input);if(!result.success)fail('SCHEDULE_PLAN_VALIDATION','Check the title, timezone, dates, working intervals, reviewed version and reason.');return result.data!;}
function planner(access:ProjectAccessContext){if(normalizeRole(access.role)==='field_supervisor')fail('SCHEDULE_PLANNING_SCOPE_REQUIRED','Project-wide planning is unavailable to assignment-only roles.',403);}
export function validateWorkingCalendar(value:unknown){
  const payload=parse(calendarPayload,value);
  if(new Set(payload.week.map(d=>d.day)).size!==7)fail('SCHEDULE_CALENDAR_DAYS','Include each weekday exactly once.');
  if(new Set(payload.exceptions.map(d=>d.date)).size!==payload.exceptions.length)fail('SCHEDULE_CALENDAR_EXCEPTIONS','Use one override per local date.');
  for(const item of [...payload.week,...payload.exceptions]){
    item.intervals.sort((a,b)=>a.startMinute-b.startMinute);
    for(let i=1;i<item.intervals.length;i++)if(item.intervals[i].startMinute<item.intervals[i-1].endMinute)fail('SCHEDULE_CALENDAR_OVERLAP','Working intervals cannot overlap.');
  }
  payload.week.sort((a,b)=>a.day-b.day);payload.exceptions.sort((a,b)=>a.date.localeCompare(b.date));return payload;
}
function summary(row:any,full=false){return {id:row.id,projectId:row.project_id,kind:row.kind,title:row.title,version:row.row_version,
  payload:row.kind==='baseline_candidate'&&!full?{sourceFingerprint:row.payload.sourceFingerprint,counts:row.payload.counts}:row.payload,
  snapshotIntegrityVerified:intact(row),createdAt:iso(row.created_at),updatedAt:iso(row.updated_at),approvalStatus:'not_approved' as const};}

export class SchedulePlanningService {
  private readonly access:ProjectAccessService;private readonly commands:DurableProjectCommand;private readonly schedule:ScheduleService;
  constructor(db:DbService){this.access=new ProjectAccessService(db);this.commands=new DurableProjectCommand(db);this.schedule=new ScheduleService(db);}
  private canEdit(access:ProjectAccessContext){return access.accessLevel==='editor'&&permissions.some(p=>hasRolePermission(access.role,p,access.isSuperAdmin));}
  private async record(tx:ProjectAccessTransaction,access:ProjectAccessContext,id:string){
    if(!z.string().uuid().safeParse(id).success)fail('SCHEDULE_PLAN_VALIDATION','A valid record identifier is required.');
    const row=(await tx.query(`${select} WHERE r.id=$1 AND r.organisation_id=$2 AND r.project_id=$3 FOR UPDATE OF r`,[id,access.organisationId,access.project.id])).rows[0];
    if(!row)fail('SCHEDULE_PLAN_NOT_FOUND','Planning record is not available in this project.',404);return row;
  }
  async list(project:string,req:Request){return this.access.withAccess(req,project,read,async(tx,access)=>{
    planner(access);const rows=(await tx.query(`${select} WHERE r.organisation_id=$1 AND r.project_id=$2 AND r.kind<>'baseline_candidate' ORDER BY r.kind,r.id LIMIT 301`,[access.organisationId,access.project.id])).rows;
    const candidates=(await tx.query(`${select} WHERE r.organisation_id=$1 AND r.project_id=$2 AND r.kind='baseline_candidate' ORDER BY r.created_at DESC,r.id DESC LIMIT 26`,[access.organisationId,access.project.id])).rows;
    return {data:[...rows.slice(0,300),...candidates.slice(0,25)].map(row=>summary(row)),meta:{canEdit:this.canEdit(access),limit:300,candidateLimit:25,truncated:rows.length>300||candidates.length>25,dataAsOf:new Date().toISOString()}};
  });}
  private async append(tx:ProjectAccessTransaction,access:ProjectAccessContext,row:any,reason:string){
    const id=randomUUID(),saved=snapshot(row),hash=scheduleHash(saved);
    await tx.query(`INSERT INTO schedule_plan_revisions(id,organisation_id,project_id,record_id,revision_number,snapshot,snapshot_hash,reason,actor_id)
      VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)`,[id,access.organisationId,access.project.id,row.id,row.row_version,JSON.stringify(saved),hash,reason,access.userId]);
    await tx.query('UPDATE schedule_plan_records SET current_revision_id=$4 WHERE id=$1 AND organisation_id=$2 AND project_id=$3',[row.id,access.organisationId,access.project.id,id]);
    return {revisionId:id,snapshotHash:hash};
  }
  private async insert(tx:ProjectAccessTransaction,access:ProjectAccessContext,kind:string,title:string,payload:unknown,reason:string){
    const id=randomUUID();const row=(await tx.query(`INSERT INTO schedule_plan_records(id,organisation_id,project_id,kind,title,payload,created_by)
      VALUES($1,$2,$3,$4,$5,$6::jsonb,$7) RETURNING *`,[id,access.organisationId,access.project.id,kind,title,JSON.stringify(payload),access.userId])).rows[0];
    const history=await this.append(tx,access,row,reason);
    return {id,version:1,data:summary(await this.record(tx,access,id)),event:{...history,kind,reason,authorityEffect:'planning_only'}};
  }
  async create(project:string,body:unknown,req:Request){const input=parse(createSchema,body);
    const payload=input.kind==='calendar'?validateWorkingCalendar(input.payload):input.payload;
    return this.commands.run(req,project,{...write,operation:'schedule.plan.create',action:'schedule.plan.created',targetType:'schedule_plan',input:{...input,payload},authorize:async(_tx,a)=>planner(a)},async(tx,access)=>{
      const count=(await tx.query('SELECT count(*)::int AS count FROM schedule_plan_records WHERE organisation_id=$1 AND project_id=$2 AND kind=$3',[access.organisationId,access.project.id,input.kind])).rows[0].count;
      if(count>=(input.kind==='calendar'?100:200))fail('SCHEDULE_PLAN_LIMIT','This project has reached its planning register limit.',409);
      return this.insert(tx,access,input.kind,input.title,payload,input.reason);
    });
  }
  async revise(project:string,id:string,body:unknown,req:Request){const input=parse(reviseSchema,body);
    return this.commands.run(req,project,{...write,operation:`schedule.plan.${id}.revise`,action:'schedule.plan.revised',targetType:'schedule_plan',input,
      authorize:async(tx,a)=>{planner(a);await this.record(tx,a,id);}},async(tx,access)=>{
      const row=await this.record(tx,access,id);
      if(row.kind==='baseline_candidate')fail('BASELINE_CANDIDATE_IMMUTABLE','Capture a new candidate; frozen review candidates cannot be changed.',409);
      if(row.row_version!==input.expectedVersion)fail('SCHEDULE_PLAN_VERSION_CONFLICT','This record changed. Refresh and review the current version.',409);
      if(!intact(row))fail('SCHEDULE_PLAN_HISTORY_CONFLICT','Reconcile retained history before changing this record.',409);
      const payload=row.kind==='calendar'?validateWorkingCalendar(input.payload):parse(milestonePayload,input.payload);
      const updated=(await tx.query(`UPDATE schedule_plan_records SET title=$4,payload=$5::jsonb,row_version=row_version+1,updated_at=clock_timestamp()
        WHERE id=$1 AND organisation_id=$2 AND project_id=$3 RETURNING *`,[id,access.organisationId,access.project.id,input.title,JSON.stringify(payload)])).rows[0];
      const history=await this.append(tx,access,updated,input.reason);
      return {id,version:updated.row_version,data:summary(await this.record(tx,access,id)),event:{...history,kind:row.kind,reason:input.reason,authorityEffect:'planning_only'}};
    });
  }
  async history(project:string,id:string,req:Request){return this.access.withAccess(req,project,read,async(tx,access)=>{
    planner(access);await this.record(tx,access,id);
    const rows=(await tx.query('SELECT * FROM schedule_plan_revisions WHERE organisation_id=$1 AND project_id=$2 AND record_id=$3 ORDER BY revision_number DESC LIMIT 101',[access.organisationId,access.project.id,id])).rows;
    return {data:rows.slice(0,100).map(r=>({id:r.id,version:r.revision_number,snapshot:r.snapshot,snapshotIntegrityVerified:scheduleHash(r.snapshot)===r.snapshot_hash,reason:r.reason,actorId:r.actor_id,createdAt:iso(r.created_at)})),meta:{limit:100,truncated:rows.length>100}};
  });}
  private async source(tx:ProjectAccessTransaction,access:ProjectAccessContext){
    const work=await this.schedule.captureSource(tx,access);
    const records=(await tx.query(`${select} WHERE r.organisation_id=$1 AND r.project_id=$2 AND r.kind<>'baseline_candidate' ORDER BY r.kind,r.id LIMIT 301`,[access.organisationId,access.project.id])).rows;
    if(records.length>300)fail('SCHEDULE_CAPTURE_LIMIT','A complete candidate supports at most 300 calendar/milestone records.',409);
    if(records.some(row=>!intact(row)))fail('SCHEDULE_PLAN_HISTORY_CONFLICT','Reconcile planning records before capturing a candidate.',409);
    const source={contractVersion:'baseline-candidate.v1',projectId:access.project.id,...work,planning:records.map(snapshot)};
    return {source,sourceFingerprint:scheduleHash(source),counts:{tasks:work.tasks.length,scheduledTasks:work.tasks.filter(t=>t.startAt&&t.finishAt).length,dependencies:work.dependencies.length,calendars:records.filter(r=>r.kind==='calendar').length,milestones:records.filter(r=>r.kind==='milestone').length}};
  }
  async preview(project:string,req:Request){return this.access.withAccess(req,project,read,async(tx,access)=>{planner(access);return {data:await this.source(tx,access),meta:{dataAsOf:new Date().toISOString()}};});}
  async capture(project:string,body:unknown,req:Request){const input=parse(candidateSchema,body);
    return this.commands.run(req,project,{...write,operation:'schedule.baseline.candidate',action:'schedule.baseline.candidate.created',targetType:'baseline_candidate',input,authorize:async(_tx,a)=>planner(a)},async(tx,access)=>{
      const payload=await this.source(tx,access);
      if(payload.sourceFingerprint!==input.expectedFingerprint)fail('SCHEDULE_CAPTURE_CONFLICT','The reviewed schedule changed. Load and review a new preview.',409);
      if(!payload.counts.tasks)fail('SCHEDULE_CAPTURE_EMPTY','Create project work before capturing a baseline candidate.',409);
      return this.insert(tx,access,'baseline_candidate',input.title,payload,input.reason);
    });
  }
  async compare(project:string,id:string,req:Request){return this.access.withAccess(req,project,read,async(tx,access)=>{
    planner(access);const row=await this.record(tx,access,id);
    if(row.kind!=='baseline_candidate')fail('BASELINE_CANDIDATE_REQUIRED','Choose a frozen baseline candidate.');
    if(!intact(row)||scheduleHash(row.payload.source)!==row.payload.sourceFingerprint)fail('SCHEDULE_PLAN_HISTORY_CONFLICT','Candidate integrity could not be confirmed.',409);
    const current=await this.source(tx,access),before=row.payload.source.tasks as Array<{id:string;title:string;startAt:string|null;finishAt:string|null;taskVersion:number}>;
    const previous=new Map(before.map(t=>[t.id,t])),latest=new Map(current.source.tasks.map(t=>[t.id,t]));
    const changes=[...new Set([...previous.keys(),...latest.keys()])].map(id=>{
      const a=previous.get(id),b=latest.get(id);return {taskId:id,title:b?.title||a!.title,status:!a?'added':!b?'removed':scheduleHash(a)===scheduleHash(b)?'unchanged':'changed',
        beforeStart:a?.startAt??null,beforeFinish:a?.finishAt??null,currentStart:b?.startAt??null,currentFinish:b?.finishAt??null,
        finishShiftMinutes:a?.finishAt&&b?.finishAt?(Date.parse(b.finishAt)-Date.parse(a.finishAt))/60000:null};
    });
    return {data:{candidate:summary(row,true),currentFingerprint:current.sourceFingerprint,sourceChanged:current.sourceFingerprint!==row.payload.sourceFingerprint,
      planningChanged:scheduleHash(row.payload.source.planning)!==scheduleHash(current.source.planning),dependenciesChanged:scheduleHash(row.payload.source.dependencies)!==scheduleHash(current.source.dependencies),changes},meta:{dataAsOf:new Date().toISOString()}};
  });}
}
