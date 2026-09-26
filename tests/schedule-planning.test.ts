import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {getDbPool} from '../packages/db/src/client.js';
import {SchedulePlanningService,validateWorkingCalendar} from '../apps/api/src/work/schedule-planning.service.js';
import {ScheduleService} from '../apps/api/src/work/schedule.service.js';

const pool=getDbPool(),db={getPool:()=>pool} as any;
let org:string,project:string,task:string,manager:string,viewer:string,field:string,service:SchedulePlanningService;
const users:string[]=[],tokens=new Map<string,string>();
const reason='Review project planning';
const req=(user=manager,key=randomUUID())=>({organisationId:org,headers:{authorization:`Bearer ${tokens.get(user)}`,'idempotency-key':key}} as any);
const calendar=()=>({timezone:'Asia/Qatar',week:Array.from({length:7},(_,day)=>({day,intervals:day===5?[]:[{startMinute:540,endMinute:1020}]})),exceptions:[{date:'2026-12-18',intervals:[],note:'No planned work'}]});
const create=()=>({kind:'calendar',title:'Delivery working week',payload:calendar(),reason});
const milestone=()=>({kind:'milestone',title:'Opening target',payload:{targetAt:null,timezone:null,notes:'Awaiting planning date'},reason});
async function actor(role:string,level:string){const id=randomUUID(),membership=randomUUID(),token=randomUUID();users.push(id);tokens.set(id,token);
  await pool.query('INSERT INTO users(id,email,name)VALUES($1,$2,$3)',[id,`${id}@example.test`,'Planning fixture']);
  await pool.query('INSERT INTO memberships(id,organisation_id,user_id,role,audience)VALUES($1,$2,$3,$4,\'internal\')',[membership,org,id,role]);
  await pool.query("INSERT INTO sessions(user_id,token,expires_at)VALUES($1,$2,NOW()+INTERVAL '1 hour')",[id,token]);
  if(project)await pool.query('INSERT INTO project_access_grants(organisation_id,project_id,membership_id,access_level,granted_by,reason)VALUES($1,$2,$3,$4,$5,$6)',[org,project,membership,level,manager,reason]);return id;
}
beforeEach(async()=>{vi.stubEnv('EOS_ENABLE_LOCAL_SYNTHETIC_AUTH','false');org=randomUUID();project='';await pool.query('INSERT INTO organisations(id,name,code)VALUES($1,$2,$3)',[org,'Isolated planning fixture',`PLAN-${org}`]);
  manager=await actor('project_manager','editor');project=randomUUID();await pool.query(`INSERT INTO projects(id,organisation_id,project_code,title,description,origin_code,owner_id,created_by,updated_by)VALUES($1,$2,$3,'Planning fixture','Isolated','INTERNAL_IDEA',$4,$4,$4)`,[project,org,`PLAN-${project}`,manager]);
  await pool.query(`INSERT INTO project_access_grants(organisation_id,project_id,membership_id,access_level,granted_by,reason)SELECT $1,$2,id,'editor',$3,$4 FROM memberships WHERE organisation_id=$1 AND user_id=$3`,[org,project,manager,reason]);
  viewer=await actor('project_manager','viewer');field=await actor('field_supervisor','editor');const pkg=randomUUID();task=randomUUID();
  await pool.query("INSERT INTO work_packages(id,organisation_id,project_id,name,owner_id)VALUES($1,$2,$3,'Delivery preparation',$4)",[pkg,org,project,manager]);
  await pool.query("INSERT INTO task_instances(id,package_id,organisation_id,project_id,title,assignee_id)VALUES($1,$2,$3,$4,'Prepare delivery',$5)",[task,pkg,org,project,manager]);service=new SchedulePlanningService(db);
});
afterEach(async()=>{const tx=await pool.connect();try{await tx.query('BEGIN');await tx.query('UPDATE task_instances SET current_forecast_revision_id=NULL WHERE organisation_id=$1',[org]);
  for(const table of ['schedule_plan_revisions','schedule_plan_records','task_forecast_revisions','task_instances','work_packages','idempotency_records','outbox','audit_events','project_access_grants','projects','memberships'])await tx.query(`DELETE FROM ${table} WHERE organisation_id=$1`,[org]);
  await tx.query('DELETE FROM sessions WHERE user_id=ANY($1::uuid[])',[users]);await tx.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[users]);await tx.query('DELETE FROM organisations WHERE id=$1',[org]);await tx.query('COMMIT');
}catch(e){await tx.query('ROLLBACK');throw e;}finally{tx.release();users.length=0;tokens.clear();vi.unstubAllEnvs();}});

describe('Working calendars, milestones and frozen candidates',()=>{
  it('validates unique weekdays, real exception dates, local timezone and non-overlapping intervals',()=>{
    expect(validateWorkingCalendar(calendar()).exceptions[0].intervals).toEqual([]);
    for(const mutate of [(p:any)=>p.week[6].day=0,(p:any)=>p.timezone='Mars/Olympus',(p:any)=>p.exceptions[0].date='2026-02-30',(p:any)=>p.week[0].intervals.push({startMinute:600,endMinute:900}),(p:any)=>p.week[0].intervals[0].endMinute=500]){const p=calendar();mutate(p);expect(()=>validateWorkingCalendar(p)).toThrow();}
    const p=calendar();p.week[0].intervals=[{startMinute:0,endMinute:1440}];expect(validateWorkingCalendar(p).week[0].intervals[0].endMinute).toBe(1440);
  });
  it('retains calendar revisions and unknown milestone dates with atomic receipts',async()=>{
    const request=req(),record=await service.create(project,create(),request);expect(await service.create(project,create(),request)).toEqual(record);
    await service.revise(project,record.data.id,{expectedVersion:1,title:'Revised working week',payload:{...calendar(),exceptions:[]},reason},req());
    const history=await service.history(project,record.data.id,req());expect(history.data.map(r=>r.version)).toEqual([2,1]);expect(history.data[1].snapshot.payload.exceptions).toHaveLength(1);expect(history.data.every(r=>r.snapshotIntegrityVerified)).toBe(true);
    const saved=await service.create(project,milestone(),req());expect(saved.data.payload).toMatchObject({targetAt:null,timezone:null});
    expect((await pool.query('SELECT count(*)::int n FROM audit_events WHERE organisation_id=$1',[org])).rows[0].n).toBe(3);
    expect((await pool.query('SELECT count(*)::int n FROM outbox WHERE organisation_id=$1',[org])).rows[0].n).toBe(3);
    await expect(pool.query("UPDATE schedule_plan_revisions SET reason='Mutated' WHERE record_id=$1",[record.data.id])).rejects.toThrow(/immutable/);
  });
  it('rejects stale competing revisions and invented approval or actual fields',async()=>{
    const record=await service.create(project,milestone(),req()),input={expectedVersion:1,title:'Opening',payload:{targetAt:'2026-10-01T09:00:00+03:00',timezone:'Asia/Qatar',notes:''},reason};
    const result=await Promise.allSettled([service.revise(project,record.data.id,input,req()),service.revise(project,record.data.id,input,req())]);expect(result.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect((await service.list(project,req())).data[0].payload.targetAt).toBe('2026-10-01T06:00:00.000Z');
    await expect(service.create(project,{...milestone(),isApproved:true},req())).rejects.toMatchObject({status:400});
    await expect(service.create(project,{...milestone(),payload:{targetAt:null,timezone:'UTC',notes:''}},req())).rejects.toMatchObject({status:400});
  });
  it('rejects a stale capture preview then freezes all reviewed sources without changing forecasts',async()=>{
    const preview=await service.preview(project,req());await service.create(project,create(),req());
    await expect(service.capture(project,{title:'Review 1',expectedFingerprint:preview.data.sourceFingerprint,reason},req())).rejects.toMatchObject({status:409});
    const next=await service.preview(project,req()),request=req(),input={title:'Review 2',expectedFingerprint:next.data.sourceFingerprint,reason};
    const captured=await service.capture(project,input,request);expect(await service.capture(project,input,request)).toEqual(captured);
    expect(captured.data.approvalStatus).toBe('not_approved');expect((await service.compare(project,captured.data.id,req())).data.sourceChanged).toBe(false);
    await expect(service.revise(project,captured.data.id,{expectedVersion:1,title:'Overwrite',payload:{},reason},req())).rejects.toMatchObject({status:409});
    await expect(pool.query("UPDATE schedule_plan_records SET title='Overwrite' WHERE id=$1",[captured.data.id])).rejects.toThrow(/immutable/);
    const forecast=new ScheduleService(db);await forecast.forecast(project,task,{expectedTaskVersion:1,expectedForecastVersion:0,startAt:'2026-10-01T09:00:00+03:00',finishAt:'2026-10-01T10:00:00+03:00',timezone:'Asia/Qatar',reason},req());
    const comparison=await service.compare(project,captured.data.id,req());expect(comparison.data).toMatchObject({sourceChanged:true,planningChanged:false});expect(comparison.data.changes[0]).toMatchObject({beforeStart:null,currentStart:'2026-10-01T06:00:00.000Z',status:'changed',finishShiftMinutes:null});
    expect(await service.capture(project,input,request)).toEqual(captured);
  });
  it('enforces viewer/editor and assignment boundaries and current access before replay',async()=>{
    const record=await service.create(project,create(),req());expect((await service.list(project,req(viewer))).meta.canEdit).toBe(false);
    await expect(service.create(project,create(),req(viewer))).rejects.toMatchObject({status:403});await expect(service.list(project,req(field))).rejects.toMatchObject({status:403});await expect(service.preview(project,req(field))).rejects.toMatchObject({status:403});
    await expect(service.history(randomUUID(),record.data.id,req())).rejects.toMatchObject({status:404});
    const request=req(),saved=await service.create(project,milestone(),request);
    await pool.query('UPDATE project_access_grants SET is_revoked=true,revoked_by=$2,revoked_at=NOW() WHERE organisation_id=$1',[org,manager]);
    await expect(service.create(project,milestone(),request)).rejects.toMatchObject({status:404});expect(saved.data.id).toBeTruthy();
  });
  it('refuses capture of inconsistent definitions and retains history rather than silently repairing',async()=>{
    const record=await service.create(project,create(),req());await pool.query("UPDATE schedule_plan_records SET title='Unrecorded change' WHERE id=$1",[record.data.id]);
    expect((await service.list(project,req())).data[0].snapshotIntegrityVerified).toBe(false);
    await expect(service.preview(project,req())).rejects.toMatchObject({status:409});await expect(service.revise(project,record.data.id,{expectedVersion:1,title:'Repair',payload:calendar(),reason},req())).rejects.toMatchObject({status:409});
    expect((await service.history(project,record.data.id,req())).data[0].snapshot.title).toBe('Delivery working week');
  });
});
