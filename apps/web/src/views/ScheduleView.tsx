import React,{useEffect,useRef,useState} from 'react';
import {Badge,Button,Card,Input,MetricCard,Modal,Select,Textarea} from '../components/DesignSystem.js';
import {useEosContext} from '../context/EosContext.js';
import {ApiError} from '../services/api-client.js';
import type {ScheduledTask,PlannedDependency,TimelineResult,ScheduleHistoryResult,ForecastInput,DependencyInput} from '../services/schedule.js';
import './ProjectRecords.css';
import './ScheduleView.css';
import {SchedulePlanningView} from './SchedulePlanningView.js';
import type {PlanKind} from '../services/schedule-planning.js';

export const ScheduleView:React.FC<{projectId?:string}>=({projectId})=>{
  const {projects,projectsLoading,projectsError,currentOrg,currentUser,currentLanguage,selectedProjectId,triggerRefresh,navigate}=useEosContext();
  const ar=currentLanguage==='ar',t=(en:string,arabic:string)=>ar?arabic:en;
  const [selected,setSelected]=useState(projectId||selectedProjectId||'');
  const [section,setSection]=useState<'tasks'|PlanKind>('tasks');
  useEffect(()=>{setSelected(projectId||selectedProjectId||'');},[projectId,currentOrg.id,currentUser?.id]);
  const project=projects.find(p=>p.id===selected);
  return <div className="records-page" dir={ar?'rtl':'ltr'}>
    <header className="records-heading"><div><span className="records-eyebrow">{t('WORK PLANNING','تخطيط العمل')}</span><h1>{t('Schedule & dependencies','الجدول والاعتماديات')}</h1><p>{t('Forecast the work. Keep every change in view.','خطط لمواعيد العمل واحتفظ بسجل كل تغيير.')}</p></div><Badge variant="purple">{currentOrg.name}</Badge></header>
    <nav className="records-actions" aria-label={t('Work planning','تخطيط العمل')}><Button variant="secondary" onClick={()=>navigate('/calendar')}>{t('Forecast calendar','تقويم التوقعات')}</Button><Button variant="secondary" onClick={()=>navigate(project?`/projects/${project.id}/work`:'/work-register')}>{t('Work packages & tasks','حزم العمل والمهام')}</Button></nav>
    <div className="records-scope"><Select id="schedule-project" label={t('Project in your access scope','المشروع المتاح لك')} value={project?selected:''} disabled={projectsLoading} onChange={e=>setSelected(e.target.value)} options={[{value:'',label:t('Choose a project','اختر مشروعاً')},...projects.map(p=>({value:p.id,label:`${p.projectCode||p.code||''} · ${p.title||p.name}`}))]}/></div>
    {projectsLoading?<Card><p role="status">{t('Loading projects…','جارٍ تحميل المشاريع…')}</p></Card>:projectsError?<Card><p role="alert">{projectsError}</p><Button onClick={triggerRefresh}>{t('Retry','إعادة المحاولة')}</Button></Card>:!project?<Card><div className="records-empty"><div className="records-orb" aria-hidden="true">◷</div><h2>{t('Choose an accessible project','اختر مشروعاً متاحاً')}</h2><p>{t('Save task forecasts and connect dependencies in a project assigned to you.','احفظ توقعات المهام واربط اعتمادياتها ضمن مشروع متاح لك.')}</p><Button variant="secondary" onClick={triggerRefresh}>{t('Refresh projects','تحديث المشاريع')}</Button>{currentUser?.role==='super_admin'&&<Button variant="ghost" onClick={()=>navigate('/admin/access')}>{t('Access administration','إدارة الوصول')}</Button>}</div></Card>
    :<><nav className="records-actions" aria-label={t('Schedule sections','أقسام الجدول')}>
      <Button variant={section==='tasks'?'primary':'secondary'} onClick={()=>setSection('tasks')}>{t('Forecasts & dependencies','التوقعات والاعتماديات')}</Button>
      {currentUser?.role!=='field_supervisor'&&<><Button variant={section==='calendar'?'primary':'secondary'} onClick={()=>setSection('calendar')}>{t('Working calendars','تقاويم العمل')}</Button><Button variant={section==='milestone'?'primary':'secondary'} onClick={()=>setSection('milestone')}>{t('Milestones','المعالم')}</Button><Button variant={section==='baseline_candidate'?'primary':'secondary'} onClick={()=>setSection('baseline_candidate')}>{t('Baseline candidates','مرشحات الخطة الأساسية')}</Button></>}
    </nav>{section==='tasks'?<ScheduleRegister key={`${currentOrg.id}:${currentUser?.id}:${project.id}`} projectId={project.id}/>:<SchedulePlanningView key={`${currentOrg.id}:${currentUser?.id}:${project.id}:${section}`} projectId={project.id} kind={section}/>}</>}
  </div>;
};

type Action={kind:'forecast';task:ScheduledTask}|{kind:'dependency'}|{kind:'archive';edge:PlannedDependency};
const emptyForm=()=>({start:'',finish:'',timezone:'',predecessor:'',successor:'',type:'FS' as 'FS'|'SS'|'FF',reason:''});
export const ScheduleRegister:React.FC<{projectId:string}>=({projectId})=>{
  const {apiClient,currentLanguage,currentOrg,currentUser,refreshTrigger}=useEosContext();
  const ar=currentLanguage==='ar',t=(en:string,arabic:string)=>ar?arabic:en;
  const scope=`${currentOrg.id}:${currentUser?.id}:${projectId}`,scopeRef=useRef(scope);scopeRef.current=scope;
  const mounted=useRef(true),busy=useRef(false),attempts=useRef(new Map<string,string>()),historySequence=useRef(0);
  const [result,setResult]=useState<TimelineResult|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[reload,setReload]=useState(0);
  const [tab,setTab]=useState<'forecast'|'dependencies'>('forecast'),[search,setSearch]=useState(''),[notice,setNotice]=useState('');
  const [action,setAction]=useState<Action|null>(null),[form,setForm]=useState(emptyForm),[saving,setSaving]=useState(false),[commandError,setCommandError]=useState(''),[conflict,setConflict]=useState(false);
  const [historyTitle,setHistoryTitle]=useState(''),[history,setHistory]=useState<ScheduleHistoryResult|null>(null),[historyError,setHistoryError]=useState(''),[historyLoading,setHistoryLoading]=useState(false);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;historySequence.current++;};},[]);
  useEffect(()=>{let active=true;setLoading(true);setError('');setResult(null);
    apiClient.getTimeline(projectId).then(value=>{if(active)setResult(value);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[apiClient,scope,projectId,reload,refreshTrigger]);
  const tasks=result?.data.tasks||[],edges=result?.data.dependencies||[],byId=new Map(tasks.map(task=>[task.id,task]));
  const fmt=(value:string|null,zone?:string|null)=>{if(!value)return t('Not scheduled','غير مجدول');try{return new Intl.DateTimeFormat(ar?'ar':'en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:zone||'UTC'}).format(new Date(value));}catch{return t('Date needs review','التاريخ يحتاج إلى مراجعة');}};
  const scheduled=tasks.filter(task=>task.startAt&&task.finishAt&&task.snapshotIntegrityVerified);
  const min=scheduled.length?Math.min(...scheduled.map(task=>Date.parse(task.startAt!))):0,max=scheduled.length?Math.max(...scheduled.map(task=>Date.parse(task.finishAt!))):1,span=Math.max(1,max-min);
  const open=(next:Action)=>{if(busy.current||loading)return;setAction(next);setCommandError('');setConflict(false);setForm(next.kind==='forecast'?{...emptyForm(),start:next.task.startAt||'',finish:next.task.finishAt||'',timezone:next.task.timezone||''}:emptyForm());};
  const close=()=>{if(!busy.current)setAction(null);};
  const refresh=()=>{if(!busy.current){setAction(null);setReload(n=>n+1);}};
  const openHistory=async(kind:'forecast'|'dependency',id:string,title:string)=>{
    const ticket=++historySequence.current,requestScope=scope;setHistoryTitle(title);setHistory(null);setHistoryError('');setHistoryLoading(true);
    try{const value=await(kind==='forecast'?apiClient.getForecastHistory(projectId,id):apiClient.getDependencyHistory(projectId,id));if(mounted.current&&scopeRef.current===requestScope&&ticket===historySequence.current)setHistory(value);}
    catch(e){if(mounted.current&&scopeRef.current===requestScope&&ticket===historySequence.current)setHistoryError(e instanceof Error?e.message:t('History unavailable','السجل غير متاح'));}
    finally{if(mounted.current&&scopeRef.current===requestScope&&ticket===historySequence.current)setHistoryLoading(false);}
  };
  const valid=!!form.reason.trim()&&(action?.kind!=='forecast'||(!form.start&&!form.finish&&!form.timezone)||!!(form.start&&form.finish&&form.timezone))
    &&(action?.kind!=='dependency'||!!(form.predecessor&&form.successor&&form.predecessor!==form.successor));
  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();if(!action||!valid||busy.current||conflict||loading)return;
    const requestScope=scope,chosen=action;let input:ForecastInput|DependencyInput|{expectedVersion:number;reason:string};
    if(chosen.kind==='forecast')input={expectedTaskVersion:chosen.task.taskVersion,expectedForecastVersion:chosen.task.forecastVersion,startAt:form.start.trim()||null,finishAt:form.finish.trim()||null,timezone:form.timezone.trim()||null,reason:form.reason.trim()};
    else if(chosen.kind==='dependency'){
      const before=byId.get(form.predecessor),after=byId.get(form.successor);if(!before||!after)return;
      input={predecessorId:before.id,successorId:after.id,expectedPredecessorVersion:before.taskVersion,expectedSuccessorVersion:after.taskVersion,dependencyType:form.type,reason:form.reason.trim()};
    }else input={expectedVersion:chosen.edge.rowVersion,reason:form.reason.trim()};
    const signature=JSON.stringify({scope,kind:chosen.kind,id:chosen.kind==='forecast'?chosen.task.id:chosen.kind==='archive'?chosen.edge.id:null,input}),key=attempts.current.get(signature)||crypto.randomUUID();attempts.current.set(signature,key);
    busy.current=true;setSaving(true);setCommandError('');
    try{
      if(chosen.kind==='forecast')await apiClient.changeForecast(projectId,chosen.task.id,input as ForecastInput,key);
      else if(chosen.kind==='dependency')await apiClient.addScheduleDependency(projectId,input as DependencyInput,key);
      else await apiClient.archiveScheduleDependency(projectId,chosen.edge.id,input as {expectedVersion:number;reason:string},key);
      if(mounted.current&&scopeRef.current===requestScope){setAction(null);setNotice(t('Saved with a retained change record.','تم الحفظ مع سجل تغيير محفوظ.'));setReload(n=>n+1);}
    }catch(e){if(mounted.current&&scopeRef.current===requestScope){setCommandError(e instanceof Error?e.message:t('Could not save. Retry the same request.','تعذر الحفظ. أعد محاولة الطلب نفسه.'));setConflict(e instanceof ApiError&&[409,412].includes(e.status));}}
    finally{if(mounted.current&&scopeRef.current===requestScope){busy.current=false;setSaving(false);}}
  };
  if(loading)return <Card><p role="status">{t('Loading saved schedule…','جارٍ تحميل الجدول المحفوظ…')}</p></Card>;
  if(error||!result)return <Card><p role="alert">{error||t('Schedule unavailable','الجدول غير متاح')}</p><Button onClick={refresh}>{t('Retry','إعادة المحاولة')}</Button></Card>;
  return <>
    <div className="records-metrics"><MetricCard title={t('Tasks in view','المهام المعروضة')} value={tasks.length}/><MetricCard title={t('With recorded forecasts','بتوقعات مسجلة')} value={scheduled.length}/><MetricCard title={t('Timing conflicts','تعارضات التوقيت')} value={edges.filter(edge=>edge.timingState==='conflict').length}/></div>
    <p className="records-notice">{t('Forecasts guide planning. They do not amend contractual baselines, confirm resource availability or accept completed work.','التوقعات لتخطيط العمل؛ لا تعدّل الخطط التعاقدية ولا تؤكد توافر الموارد أو قبول العمل المنجز.')}</p>
    {notice&&<p role="status">{notice}</p>}
    {result.meta.truncated&&<p role="status">{t('This view is limited to 500 tasks and 1,000 visible dependencies. Counts cover the displayed records.','يقتصر العرض على 500 مهمة و1,000 اعتمادية ظاهرة. الأعداد تخص السجلات المعروضة.')}</p>}
    {!!result.meta.legacyDependencyCount&&<p role="status">{t(`${result.meta.legacyDependencyCount} legacy dependencies need review before adding new connections.`,`${result.meta.legacyDependencyCount} اعتماديات سابقة تحتاج إلى مراجعة قبل إضافة روابط جديدة.`)}</p>}
    {result.meta.assignmentScope==='assigned_tasks_only'&&<p>{t('Only your assigned tasks and connections within that scope are shown.','تُعرض مهامك المسندة والروابط ضمن هذا النطاق فقط.')}</p>}
    <div className="records-actions"><Button variant={tab==='forecast'?'primary':'secondary'} onClick={()=>setTab('forecast')}>{t('Task forecasts','توقعات المهام')}</Button><Button variant={tab==='dependencies'?'primary':'secondary'} onClick={()=>setTab('dependencies')}>{t('Dependencies','الاعتماديات')}</Button><Button variant="ghost" onClick={refresh}>{t('Refresh','تحديث')}</Button></div>
    {tab==='forecast'?<Card><div className="records-heading"><h2>{t('Recorded timeline','الجدول المسجل')}</h2><Input aria-label={t('Search tasks','البحث في المهام')} placeholder={t('Search tasks…','ابحث عن مهمة…')} value={search} onChange={e=>setSearch(e.target.value)}/></div>
      {!tasks.length&&<div className="records-empty"><h3>{t('Start with a work package and task','ابدأ بحزمة عمل ومهمة')}</h3><p>{t('Their forecasts will appear here when recorded.','ستظهر توقعاتها هنا عند تسجيلها.')}</p></div>}
      {tasks.filter(task=>`${task.title} ${task.packageName}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(task=><article className="schedule-task" key={task.id}>
        <div className="records-row"><div><h3>{task.title}</h3><p>{task.packageName} · {task.assigneeName||t('Unassigned','غير مسندة')}</p><p>{fmt(task.startAt,task.timezone)} {task.finishAt&&` → ${fmt(task.finishAt,task.timezone)}`} {task.timezone&&` · ${task.timezone}`}</p>
          <p>{t('Actual completion: ','الإكمال الفعلي: ')}{task.completedAt?fmt(task.completedAt,task.timezone):t('Not recorded','غير مسجل')} · {t('Baseline: unavailable','الخطة الأساسية: غير متاحة')}</p>
          {!task.snapshotIntegrityVerified&&<p role="alert">{t('Forecast history needs reconciliation.','يحتاج سجل التوقعات إلى تسوية.')}</p>}</div>
          <div className="records-actions"><Badge variant={task.isCompleted?'success':'purple'}>{task.isCompleted?t('Completed','مكتملة'):t('Open','مفتوحة')}</Badge>{task.canEditForecast&&<Button variant="secondary" onClick={()=>open({kind:'forecast',task})}>{t('Edit forecast','تعديل التوقع')}</Button>}<Button variant="ghost" onClick={()=>void openHistory('forecast',task.id,task.title)}>{t('History','السجل')}</Button></div></div>
        {task.startAt&&task.finishAt&&task.snapshotIntegrityVerified&&<div className="schedule-track" aria-label={t('Forecast within the displayed time span','التوقع ضمن المدى الزمني المعروض')}><span style={{marginInlineStart:`${Math.min(98,(Date.parse(task.startAt)-min)/span*100)}%`,width:`${Math.max(1,(Date.parse(task.finishAt)-Date.parse(task.startAt))/span*100)}%`}}/></div>}
      </article>)}
    </Card>:<Card><div className="records-heading"><div><h2>{t('Work sequence','تسلسل العمل')}</h2><p>{t('Connections show planning order. Missing dates remain unknown.','تعرض الروابط ترتيب التخطيط. تبقى المواعيد المفقودة غير معروفة.')}</p></div>{result.meta.capabilities.canEditDependencies&&<Button onClick={()=>open({kind:'dependency'})}>{t('Add dependency','إضافة اعتمادية')}</Button>}</div>
      {!edges.length&&<p className="records-empty">{t('No controlled dependencies in this view.','لا توجد اعتماديات مسجلة في هذا العرض.')}</p>}
      {edges.map(edge=><div key={edge.id} className="records-row"><div><h3>{byId.get(edge.predecessorId)?.title} → {byId.get(edge.successorId)?.title}</h3><p>{edge.dependencyType==='FS'?t('Finish → start','النهاية ← البداية'):edge.dependencyType==='SS'?t('Start → start','البداية ← البداية'):t('Finish → finish','النهاية ← النهاية')}</p><Badge variant={edge.timingState==='conflict'?'warning':'neutral'}>{edge.timingState==='conflict'?t('Forecast conflict','تعارض في التوقع'):edge.timingState==='consistent'?t('Forecast order consistent','ترتيب التوقعات متسق'):t('Timing unknown','التوقيت غير معروف')}</Badge></div><div className="records-actions"><Button variant="ghost" onClick={()=>void openHistory('dependency',edge.id,t('Dependency history','سجل الاعتمادية'))}>{t('History','السجل')}</Button>{result.meta.capabilities.canEditDependencies&&<Button variant="secondary" onClick={()=>open({kind:'archive',edge})}>{t('Archive','أرشفة')}</Button>}</div></div>)}
    </Card>}
    {tab==='dependencies'&&!!result.data.archivedDependencies?.length&&<Card><h2>{t('Archived connections','الروابط المؤرشفة')}</h2>{result.meta.archivedTruncated&&<p>{t('Showing the latest 200 archived connections.','عرض أحدث 200 رابط مؤرشف.')}</p>}{result.data.archivedDependencies.map(edge=><div className="records-row" key={edge.id}><div><h3>{byId.get(edge.predecessorId)?.title} → {byId.get(edge.successorId)?.title}</h3><Badge variant="neutral">{t('Archived','مؤرشف')}</Badge></div><Button variant="ghost" onClick={()=>void openHistory('dependency',edge.id,t('Dependency history','سجل الاعتمادية'))}>{t('History','السجل')}</Button></div>)}</Card>}
    <Modal isOpen={!!action} onClose={close} title={action?.kind==='forecast'?t('Change task forecast','تغيير توقع المهمة'):action?.kind==='archive'?t('Archive dependency','أرشفة الاعتمادية'):t('Connect tasks','ربط المهام')}>
      <form className="records-form" onSubmit={submit}>
        {action?.kind==='forecast'?<><p>{action.task.title}</p><p className="records-muted">{t('Enter exact dates with an offset (for example 2026-09-30T09:00:00+03:00). Leave all three fields empty to remove the forecast. History is retained.','أدخل المواعيد مع فرق التوقيت مثل 2026-09-30T09:00:00+03:00. امسح الحقول الثلاثة لإزالة التوقع مع الاحتفاظ بالسجل.')}</p>
          <Input label={t('Forecast start','بداية التوقع')} value={form.start} maxLength={40} disabled={saving} onChange={e=>setForm({...form,start:e.target.value})}/><Input label={t('Forecast finish','نهاية التوقع')} value={form.finish} maxLength={40} disabled={saving} onChange={e=>setForm({...form,finish:e.target.value})}/><Input label={t('Source timezone (IANA)','المنطقة الزمنية للمصدر (IANA)')} placeholder="Asia/Qatar" value={form.timezone} maxLength={100} disabled={saving} onChange={e=>setForm({...form,timezone:e.target.value})}/></>
        :action?.kind==='dependency'?<><Select label={t('Predecessor task','المهمة السابقة')} value={form.predecessor} disabled={saving} options={[{value:'',label:t('Choose a task','اختر مهمة')},...tasks.map(task=>({value:task.id,label:task.title}))]} onChange={e=>setForm({...form,predecessor:e.target.value})}/><Select label={t('Successor task','المهمة اللاحقة')} value={form.successor} disabled={saving} options={[{value:'',label:t('Choose an open task','اختر مهمة مفتوحة')},...tasks.filter(task=>!task.isCompleted&&task.id!==form.predecessor).map(task=>({value:task.id,label:task.title}))]} onChange={e=>setForm({...form,successor:e.target.value})}/><Select label={t('Connection','نوع الربط')} value={form.type} disabled={saving} options={[{value:'FS',label:t('Finish to start','نهاية إلى بداية')},{value:'SS',label:t('Start to start','بداية إلى بداية')},{value:'FF',label:t('Finish to finish','نهاية إلى نهاية')}]} onChange={e=>setForm({...form,type:e.target.value as typeof form.type})}/></>:<p>{t('The connection leaves the active plan. Its history remains available.','يخرج الرابط من الخطة النشطة مع الاحتفاظ بسجله.')}</p>}
        <Textarea label={t('Reason for this change','سبب التغيير')} value={form.reason} maxLength={2000} required disabled={saving} onChange={e=>setForm({...form,reason:e.target.value})}/>
        {commandError&&<p role="alert">{commandError}</p>}{conflict&&<Button type="button" variant="secondary" onClick={refresh}>{t('Refresh and review','تحديث ومراجعة')}</Button>}
        <div className="records-actions"><Button type="submit" disabled={!valid||saving||conflict}>{saving?t('Saving…','جارٍ الحفظ…'):t('Save change','حفظ التغيير')}</Button><Button type="button" variant="ghost" disabled={saving} onClick={close}>{t('Cancel','إلغاء')}</Button></div>
      </form>
    </Modal>
    <Modal isOpen={!!historyTitle} onClose={()=>{historySequence.current++;setHistoryTitle('');}} title={historyTitle}>
      {historyLoading?<p role="status">{t('Loading history…','جارٍ تحميل السجل…')}</p>:historyError?<p role="alert">{historyError}</p>:<>{!history?.data.length&&<p>{t('No forecast changes recorded yet.','لم تُسجل تغييرات توقعات بعد.')}</p>}{history?.meta.truncated&&<p>{t('Showing the latest 500 changes.','عرض أحدث 500 تغيير.')}</p>}{history?.data.map(item=><article className="records-row" key={item.id}><div><h3>{t('Version','الإصدار')} {item.revisionNumber} · {fmt(item.createdAt)}</h3><p>{item.reason}</p>{'startAt' in item.snapshot&&<p>{fmt(item.snapshot.startAt as string|null)} → {fmt(item.snapshot.finishAt as string|null)} · {String(item.snapshot.timezone||'—')}</p>}<p>{item.action==='archived'?t('Archived','مؤرشف'):item.action==='created'?t('Connection recorded','تم تسجيل الرابط'):t('Forecast changed','تم تغيير التوقع')}</p>{!item.snapshotIntegrityVerified&&<p role="alert">{t('History integrity could not be confirmed.','تعذر تأكيد سلامة السجل.')}</p>}</div></article>)}</>}
    </Modal>
  </>;
};
