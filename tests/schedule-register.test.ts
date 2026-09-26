import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {getDbPool} from '../packages/db/src/client.js';
import {ScheduleService,validateForecast,wouldCreateScheduleCycle} from '../apps/api/src/work/schedule.service.js';
import {WorkService} from '../apps/api/src/work/work.service.js';

const pool=getDbPool(),db={getPool:()=>pool} as any,reason='Review the delivery forecast';
type Actor={id:string;membership:string;token:string;org:string};
let org:string,otherOrg:string,project:string,otherProject:string,pkg:string,otherTask:string,manager:Actor,viewer:Actor,field:Actor,client:Actor,outsider:Actor,service:ScheduleService;
let tasks:string[]=[];const orgs:string[]=[],users:string[]=[];
const request=(who=manager,key=randomUUID())=>({method:'POST',organisationId:who.org,headers:{authorization:`Bearer ${who.token}`,'idempotency-key':key}}) as any;
const input=(extra={})=>({expectedTaskVersion:1,expectedForecastVersion:0,startAt:'2026-10-01T09:00:00+03:00',finishAt:'2026-10-01T12:00:00+03:00',timezone:'Asia/Qatar',reason,...extra});
const edge=(a=tasks[0],b=tasks[1],extra={})=>({predecessorId:a,successorId:b,expectedPredecessorVersion:1,expectedSuccessorVersion:1,dependencyType:'FS',reason,...extra});
const range={from:'2026-10-01T00:00:00Z',until:'2026-11-01T00:00:00Z'};
async function makeOrg(){const id=randomUUID();orgs.push(id);await pool.query('INSERT INTO organisations(id,name,code)VALUES($1,$2,$3)',[id,'Isolated schedule fixture',`SCH-${id}`]);return id;}
async function actor(role:string,audience='internal'){const value={id:randomUUID(),membership:randomUUID(),token:randomUUID(),org};users.push(value.id);
  await pool.query('INSERT INTO users(id,email,name)VALUES($1,$2,$3)',[value.id,`${value.id}@example.test`,'Schedule fixture']);
  await pool.query('INSERT INTO memberships(id,organisation_id,user_id,role,audience)VALUES($1,$2,$3,$4,$5)',[value.membership,org,value.id,role,audience]);
  await pool.query("INSERT INTO sessions(user_id,token,expires_at)VALUES($1,$2,NOW()+INTERVAL '1 hour')",[value.id,value.token]);return value;}
async function makeProject(){const id=randomUUID();await pool.query(`INSERT INTO projects(id,organisation_id,project_code,title,description,origin_code,owner_id,created_by,updated_by)
  VALUES($1,$2,$3,'Schedule fixture','Isolated','INTERNAL_IDEA',$4,$4,$4)`,[id,org,`SCH-${id}`,manager.id]);return id;}
async function grant(who:Actor,level='editor',projectId=project){await pool.query(`INSERT INTO project_access_grants(organisation_id,project_id,membership_id,access_level,granted_by,reason)VALUES($1,$2,$3,$4,$5,$6)`,[org,projectId,who.membership,level,manager.id,reason]);}
async function makeTask(packageId=pkg,projectId=project,assigned:string|null=manager.id){const id=randomUUID();await pool.query(`INSERT INTO task_instances(id,package_id,organisation_id,project_id,title,assignee_id)VALUES($1,$2,$3,$4,'Planned delivery task',$5)`,[id,packageId,org,projectId,assigned]);return id;}
async function counts(){return (await pool.query(`SELECT (SELECT count(*)::int FROM task_forecast_revisions WHERE organisation_id=$1) forecasts,
  (SELECT count(*)::int FROM dependency_edges WHERE organisation_id=$1) edges,(SELECT count(*)::int FROM dependency_changes WHERE organisation_id=$1) changes,
  (SELECT count(*)::int FROM audit_events WHERE organisation_id=$1) audits,(SELECT count(*)::int FROM outbox WHERE organisation_id=$1) events,(SELECT count(*)::int FROM idempotency_records WHERE organisation_id=$1) receipts`,[org])).rows[0];}
beforeEach(async()=>{vi.stubEnv('EOS_ENABLE_LOCAL_SYNTHETIC_AUTH','false');org=await makeOrg();otherOrg=await makeOrg();manager=await actor('project_manager');viewer=await actor('project_manager');field=await actor('field_supervisor');client=await actor('client_user','client');outsider=await actor('super_admin');
  project=await makeProject();otherProject=await makeProject();await grant(manager);await grant(manager,'editor',otherProject);await grant(viewer,'viewer');await grant(field);await grant(client,'viewer');
  pkg=randomUUID();const otherPkg=randomUUID();for(const [id,p]of[[pkg,project],[otherPkg,otherProject]])await pool.query(`INSERT INTO work_packages(id,organisation_id,project_id,name,owner_id)VALUES($1,$2,$3,'Delivery preparation',$4)`,[id,org,p,manager.id]);
  tasks=[await makeTask(),await makeTask(),await makeTask(pkg,project,field.id)];otherTask=await makeTask(otherPkg,otherProject);service=new ScheduleService(db);
});
afterEach(async()=>{try{await pool.query('UPDATE task_instances SET current_forecast_revision_id=NULL WHERE organisation_id=ANY($1::uuid[])',[orgs]);
  for(const table of ['dependency_changes','dependency_edges','task_forecast_revisions','task_instances','work_packages','idempotency_records','outbox','audit_events','project_access_grants','projects','memberships'])await pool.query(`DELETE FROM ${table} WHERE organisation_id=ANY($1::uuid[])`,[orgs]);
  await pool.query('DELETE FROM sessions WHERE user_id=ANY($1::uuid[])',[users]);await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[users]);await pool.query('DELETE FROM organisations WHERE id=ANY($1::uuid[])',[orgs]);
}finally{orgs.length=0;users.length=0;vi.unstubAllEnvs();}});

describe('Forecast, dependency and calendar batch',()=>{
  it('retains unknown schedules and exact offset instants without invented baselines or completion',async()=>{
    expect((await service.timeline(project,request())).data.tasks[0]).toMatchObject({startAt:null,finishAt:null,forecastVersion:0,completedAt:null,baselineStatus:'unavailable'});
    const saved=await service.forecast(project,tasks[0],input(),request());expect(saved.data).toMatchObject({startAt:'2026-10-01T06:00:00.000Z',finishAt:'2026-10-01T09:00:00.000Z',timezone:'Asia/Qatar',taskVersion:2,forecastVersion:1,isCompleted:false,acceptanceState:'pending',snapshotIntegrityVerified:true});
    expect(await counts()).toMatchObject({forecasts:1,audits:1,events:1,receipts:1});
  });
  it('rejects invented actual/baseline values, missing offsets, partial windows, invalid zones and reversed dates',()=>{
    for(const extra of [{baselineStart:'2026-01-01'}, {completedAt:'2026-10-01T00:00:00Z'}, {startAt:'2026-10-01T09:00:00'}, {finishAt:null},{timezone:'Mars/Olympus'}, {finishAt:'2026-09-01T00:00:00Z'}])expect(()=>validateForecast(input(extra))).toThrow();
    expect(validateForecast(input({startAt:null,finishAt:null,timezone:null})).startAt).toBeNull();
    expect(validateForecast(input({startAt:'2026-11-01T01:30:00-04:00',finishAt:'2026-11-01T01:30:00-05:00',timezone:'America/New_York'}))).toMatchObject({startAt:'2026-11-01T05:30:00.000Z',finishAt:'2026-11-01T06:30:00.000Z'});
  });
  it('enforces real sessions, project grants, audience, editor permission and field assignment',async()=>{
    await expect(service.timeline(project,{organisationId:org,headers:{'x-user-role':'super_admin'}} as any)).rejects.toMatchObject({status:401});
    await expect(service.timeline(project,request(outsider))).rejects.toMatchObject({status:404});await expect(service.timeline(project,request(client))).rejects.toMatchObject({status:403});
    await expect(service.forecast(project,tasks[0],input(),request(viewer))).rejects.toMatchObject({status:403});await expect(service.forecast(project,tasks[2],input(),request(field))).rejects.toMatchObject({status:403});
    const list=await service.timeline(project,request(field));expect(list.data.tasks.map(row=>row.id)).toEqual([tasks[2]]);expect(list.meta.legacyDependencyCount).toBeNull();
    await expect(service.forecastHistory(project,tasks[0],request(field))).rejects.toMatchObject({status:404});
  });
  it('scopes nested task references and history to the selected project',async()=>{
    await expect(service.forecast(otherProject,tasks[0],input(),request())).rejects.toMatchObject({status:404});
    await expect(service.addDependency(project,edge(tasks[0],otherTask),request())).rejects.toMatchObject({status:404});
    const req=request();req.organisationId=otherOrg;await expect(service.timeline(project,req)).rejects.toMatchObject({status:401});
  });
  it('deduplicates simultaneous retries and rejects changed command input',async()=>{
    const req=request();const [a,b]=await Promise.all([service.forecast(project,tasks[0],input(),req),new ScheduleService(db).forecast(project,tasks[0],input(),req)]);expect(b).toEqual(a);
    expect(await counts()).toMatchObject({forecasts:1,audits:1,events:1,receipts:1});
    await expect(service.forecast(project,tasks[0],input({reason:'Different'}),req)).rejects.toMatchObject({status:409});
  });
  it('allows one competing forecast revision and preserves old history after explicit clearing',async()=>{
    const results=await Promise.allSettled([service.forecast(project,tasks[0],input(),request()),service.forecast(project,tasks[0],input({finishAt:'2026-10-01T15:00:00+03:00'}),request())]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    const previous=(await service.forecastHistory(project,tasks[0],request())).data[0];
    await service.forecast(project,tasks[0],input({expectedTaskVersion:2,expectedForecastVersion:1,startAt:null,finishAt:null,timezone:null}),request());
    const history=await service.forecastHistory(project,tasks[0],request());expect(history.data).toHaveLength(2);expect(history.data[1]).toEqual(previous);expect(history.data.every(row=>row.snapshotIntegrityVerified)).toBe(true);
    expect((await service.calendar(range,request())).data).toHaveLength(0);
  });
  it('protects immutable forecast history and rejects tampered current dates',async()=>{
    await service.forecast(project,tasks[0],input(),request());
    await expect(pool.query("UPDATE task_forecast_revisions SET reason='Changed' WHERE task_id=$1",[tasks[0]])).rejects.toThrow(/immutable/);
    await pool.query("UPDATE task_instances SET forecast_finish=forecast_finish+INTERVAL '1 hour' WHERE id=$1",[tasks[0]]);
    expect((await service.timeline(project,request())).data.tasks.find(row=>row.id===tasks[0])?.snapshotIntegrityVerified).toBe(false);
    await expect(service.forecast(project,tasks[0],input({expectedTaskVersion:2,expectedForecastVersion:1}),request())).rejects.toMatchObject({status:409});
  });
  it('keeps actual completion separate and prevents editing completed-task forecasts',async()=>{
    await service.forecast(project,tasks[0],input(),request());const work=new WorkService(db);
    await work.completeTask(project,tasks[0],{expectedVersion:2,reason},request());const row=(await service.timeline(project,request())).data.tasks.find(t=>t.id===tasks[0]);
    expect(row).toMatchObject({isCompleted:true,forecastVersion:1,startAt:'2026-10-01T06:00:00.000Z',canEditForecast:false,acceptanceState:'pending'});expect(row?.completedAt).toBeTruthy();
    await expect(service.forecast(project,tasks[0],input({expectedTaskVersion:3,expectedForecastVersion:1}),request())).rejects.toMatchObject({status:409});
  });
  it('rejects duplicate links, self edges and cycles across all dependency types',async()=>{
    await service.addDependency(project,edge(),request());await service.addDependency(project,edge(tasks[1],tasks[2],{dependencyType:'SS'}),request());
    await expect(service.addDependency(project,edge(tasks[2],tasks[0],{dependencyType:'FF'}),request())).rejects.toMatchObject({status:409});
    await expect(service.addDependency(project,edge(),request())).rejects.toMatchObject({status:409});await expect(service.addDependency(project,edge(tasks[0],tasks[0]),request())).rejects.toMatchObject({status:400});
    expect(wouldCreateScheduleCycle([{predecessorId:'a',successorId:'b',dependencyType:'FS'}],'b','a')).toBe(true);
    expect(await counts()).toMatchObject({edges:2,changes:2,events:2});
  });
  it('serializes opposing dependency commands so only one can commit',async()=>{
    const results=await Promise.allSettled([service.addDependency(project,edge(),request()),new ScheduleService(db).addDependency(project,edge(tasks[1],tasks[0]),request())]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(await counts()).toMatchObject({edges:1,changes:1,audits:1,events:1,receipts:1});
  });
  it('discloses unknown/conflicting timing without moving either task',async()=>{
    await service.addDependency(project,edge(),request());expect((await service.timeline(project,request())).data.dependencies[0].timingState).toBe('unknown');
    await service.forecast(project,tasks[0],input(),request());await service.forecast(project,tasks[1],input(),request());
    expect((await service.timeline(project,request())).data.dependencies[0]).toMatchObject({timingState:'conflict',snapshotIntegrityVerified:true});
    expect((await service.timeline(project,request())).data.tasks.filter(row=>row.forecastVersion===1)).toHaveLength(2);
  });
  it('archives with a reason and exact version, retaining history and retry identity',async()=>{
    const saved=await service.addDependency(project,edge(),request()),req=request(),body={expectedVersion:1,reason:'Sequence superseded'};
    const result=await service.archiveDependency(project,saved.data.id,body,req);expect(await service.archiveDependency(project,saved.data.id,body,req)).toEqual(result);
    const list=await service.timeline(project,request());expect(list.data.dependencies).toHaveLength(0);expect(list.data.archivedDependencies).toHaveLength(1);
    const history=await service.dependencyHistory(project,saved.data.id,request());expect(history.data.map(h=>h.action)).toEqual(['archived','created']);expect(history.data.every(h=>h.snapshotIntegrityVerified)).toBe(true);
    await expect(pool.query("UPDATE dependency_changes SET reason='Changed' WHERE dependency_id=$1",[saved.data.id])).rejects.toThrow(/immutable/);
    await expect(service.dependencyHistory(otherProject,saved.data.id,request())).rejects.toMatchObject({status:404});
  });
  it('blocks expansion of legacy or history-inconsistent graphs',async()=>{
    const id=randomUUID();await pool.query(`INSERT INTO dependency_edges(id,organisation_id,project_id,predecessor_id,successor_id)VALUES($1,$2,$3,'legacy-a','legacy-b')`,[id,org,project]);
    await expect(service.addDependency(project,edge(),request())).rejects.toMatchObject({status:409});expect((await service.timeline(project,request())).meta.legacyDependencyCount).toBe(1);
    await pool.query('DELETE FROM dependency_edges WHERE id=$1',[id]);const created=await service.addDependency(project,edge(),request());await pool.query("UPDATE dependency_edges SET dependency_type='SS' WHERE id=$1",[created.data.id]);
    await expect(service.addDependency(project,edge(tasks[1],tasks[2]),request())).rejects.toMatchObject({status:409});
  });
  it('filters calendar by current project and assignment scope and exact overlapping instants',async()=>{
    await service.forecast(project,tasks[0],input({startAt:'2026-09-30T22:00:00Z',finishAt:'2026-10-01T02:00:00Z'}),request());await service.forecast(project,tasks[2],input(),request());await service.forecast(otherProject,otherTask,input(),request());
    expect((await service.calendar(range,request(viewer))).data.map(t=>t.id).sort()).toEqual([tasks[0],tasks[2]].sort());expect((await service.calendar(range,request(field))).data.map(t=>t.id)).toEqual([tasks[2]]);
    expect((await service.calendar(range,request(outsider))).data).toHaveLength(0);await expect(service.calendar(range,request(client))).rejects.toMatchObject({status:403});
    await expect(service.calendar({...range,until:'2028-01-01T00:00:00Z'},request())).rejects.toMatchObject({status:400});
    await expect(service.calendar({...range,from:'2026-10-01'},request())).rejects.toMatchObject({status:400});
  });
  it('rechecks grant and field assignment before history or receipt replay',async()=>{
    const req=request();await service.forecast(project,tasks[0],input(),req);
    await pool.query('UPDATE project_access_grants SET is_revoked=true,revoked_by=$3,revoked_at=clock_timestamp() WHERE membership_id=$1 AND project_id=$2',[manager.membership,project,manager.id]);
    await expect(service.forecast(project,tasks[0],input(),req)).rejects.toMatchObject({status:404});expect((await service.calendar(range,request())).data).toHaveLength(0);
    await pool.query('UPDATE task_instances SET assignee_id=$2 WHERE id=$1',[tasks[2],manager.id]);await expect(service.forecastHistory(project,tasks[2],request(field))).rejects.toMatchObject({status:404});
  });
  it('rolls back forecasts, pointers, audit and receipt when the outbox fails',async()=>{
    const broken={getPool:()=>({connect:async()=>{const tx=await pool.connect();return {release:()=>tx.release(),query:(sql:string,params:any[])=>{if(sql.startsWith('INSERT INTO outbox'))throw new Error('Injected outbox failure');return tx.query(sql,params);}};}})} as any;
    await expect(new ScheduleService(broken).forecast(project,tasks[0],input(),request())).rejects.toMatchObject({status:503});
    expect(await counts()).toEqual({forecasts:0,edges:0,changes:0,audits:0,events:0,receipts:0});expect((await service.timeline(project,request())).data.tasks.find(t=>t.id===tasks[0])).toMatchObject({taskVersion:1,forecastVersion:0,currentRevisionId:null});
  });
});
