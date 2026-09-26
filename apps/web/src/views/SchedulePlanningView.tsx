import React,{useEffect,useRef,useState} from 'react';
import {Badge,Button,Card,Input,Modal,Textarea} from '../components/DesignSystem.js';
import {useEosContext} from '../context/EosContext.js';
import {ApiError} from '../services/api-client.js';
import type {CalendarDefinition,MilestoneDefinition,CandidatePayload,PlanKind,PlanList,PlanRecord,PlanHistory,CandidatePreview,CandidateComparison,WorkInterval} from '../services/schedule-planning.js';
import './SchedulePlanningView.css';

const blankCalendar=():CalendarDefinition=>({timezone:'Asia/Qatar',week:Array.from({length:7},(_,day)=>({day,intervals:[]})),exceptions:[]});
const clock=(n:number)=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
const minute=(v:string)=>{const [h,m]=v.split(':').map(Number);return h*60+m;};
const labels=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],arabicLabels=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const clone=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));
type Editor={kind:PlanKind;record?:PlanRecord};

export const SchedulePlanningView:React.FC<{projectId:string;kind:PlanKind}>=({projectId,kind})=>{
  const {apiClient,currentOrg,currentUser,currentLanguage,refreshTrigger}=useEosContext();
  const ar=currentLanguage==='ar',t=(en:string,arabic:string)=>ar?arabic:en;
  const [list,setList]=useState<PlanList|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[reload,setReload]=useState(0),[notice,setNotice]=useState('');
  const [editor,setEditor]=useState<Editor|null>(null),[title,setTitle]=useState(''),[reason,setReason]=useState(''),[calendar,setCalendar]=useState(blankCalendar),[milestone,setMilestone]=useState<MilestoneDefinition>({targetAt:null,timezone:null,notes:''});
  const [preview,setPreview]=useState<CandidatePreview|null>(null),[previewLoading,setPreviewLoading]=useState(false),[previewError,setPreviewError]=useState('');
  const [saving,setSaving]=useState(false),[commandError,setCommandError]=useState(''),[conflict,setConflict]=useState(false);
  const [detailTitle,setDetailTitle]=useState(''),[history,setHistory]=useState<PlanHistory|null>(null),[comparison,setComparison]=useState<CandidateComparison|null>(null),[detailLoading,setDetailLoading]=useState(false),[detailError,setDetailError]=useState('');
  const [reviewed,setReviewed]=useState(false);
  const scope=`${currentOrg.id}:${currentUser?.id}:${projectId}`,scopeRef=useRef(scope);scopeRef.current=scope;
  const mounted=useRef(true),busy=useRef(false),attempts=useRef(new Map<string,string>()),sequence=useRef(0),previewSequence=useRef(0);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;sequence.current++;previewSequence.current++;};},[]);
  useEffect(()=>{let active=true;setLoading(true);setError('');setList(null);
    apiClient.getSchedulePlanning(projectId).then(r=>{if(active)setList(r);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[apiClient,scope,projectId,refreshTrigger,reload]);
  const date=(value:string|null,zone='UTC')=>{if(!value)return t('Not set','غير محدد');try{return new Intl.DateTimeFormat(ar?'ar':'en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:zone}).format(new Date(value));}catch{return t('Date needs review','التاريخ يحتاج إلى مراجعة');}};
  const workingHours=(value:CalendarDefinition)=>value.week.reduce((sum,d)=>sum+d.intervals.reduce((s,i)=>s+i.endMinute-i.startMinute,0),0)/60;
  const loadPreview=async()=>{
    const request=++previewSequence.current,requestScope=scope;setPreviewLoading(true);setPreviewError('');setPreview(null);setReviewed(false);
    try{const result=await apiClient.previewBaselineCandidate(projectId);if(mounted.current&&scopeRef.current===requestScope&&request===previewSequence.current)setPreview(result);}
    catch(e){if(mounted.current&&scopeRef.current===requestScope&&request===previewSequence.current)setPreviewError(e instanceof Error?e.message:t('Preview unavailable','المعاينة غير متاحة'));}
    finally{if(mounted.current&&scopeRef.current===requestScope&&request===previewSequence.current)setPreviewLoading(false);}
  };
  const open=(record?:PlanRecord)=>{
    if(busy.current)return;setEditor({kind,record});setTitle(record?.title||'');setReason('');setCommandError('');setConflict(false);setReviewed(false);
    if(kind==='calendar')setCalendar(record?clone(record.payload as CalendarDefinition):blankCalendar());
    if(kind==='milestone')setMilestone(record?clone(record.payload as MilestoneDefinition):{targetAt:null,timezone:null,notes:''});
    if(kind==='baseline_candidate')void loadPreview();
  };
  const close=()=>{if(busy.current)return;previewSequence.current++;setEditor(null);};
  const openDetail=async(record:PlanRecord)=>{
    const seq=++sequence.current,requestScope=scope;setDetailTitle(record.title);setHistory(null);setComparison(null);setDetailError('');setDetailLoading(true);
    try{if(record.kind==='baseline_candidate'){const result=await apiClient.compareBaselineCandidate(projectId,record.id);if(mounted.current&&scopeRef.current===requestScope&&seq===sequence.current)setComparison(result);}
      else{const result=await apiClient.getSchedulePlanHistory(projectId,record.id);if(mounted.current&&scopeRef.current===requestScope&&seq===sequence.current)setHistory(result);}}
    catch(e){if(mounted.current&&scopeRef.current===requestScope&&seq===sequence.current)setDetailError(e instanceof Error?e.message:t('Details unavailable','التفاصيل غير متاحة'));}
    finally{if(mounted.current&&scopeRef.current===requestScope&&seq===sequence.current)setDetailLoading(false);}
  };
  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();if(busy.current||!editor||!title.trim()||!reason.trim()||conflict)return;
    if(editor.kind==='baseline_candidate'&&(!preview||!reviewed||!preview.data.counts.tasks))return;
    const chosen=editor,requestScope=scope;
    const payload=chosen.kind==='calendar'?calendar:{...milestone,targetAt:milestone.targetAt?.trim()||null,timezone:milestone.timezone?.trim()||null};
    const input=chosen.kind==='baseline_candidate'?{title:title.trim(),reason:reason.trim(),expectedFingerprint:preview!.data.sourceFingerprint}
      :chosen.record?{title:title.trim(),reason:reason.trim(),payload,expectedVersion:chosen.record.version}:{kind:chosen.kind,title:title.trim(),reason:reason.trim(),payload};
    const signature=JSON.stringify({scope,kind:chosen.kind,id:chosen.record?.id,input}),key=attempts.current.get(signature)||crypto.randomUUID();attempts.current.set(signature,key);
    busy.current=true;setSaving(true);setCommandError('');
    try{
      if(chosen.kind==='baseline_candidate')await apiClient.captureBaselineCandidate(projectId,input as {title:string;reason:string;expectedFingerprint:string},key);
      else if(chosen.record)await apiClient.reviseSchedulePlan(projectId,chosen.record.id,input as {title:string;reason:string;payload:CalendarDefinition|MilestoneDefinition;expectedVersion:number},key);
      else await apiClient.createSchedulePlan(projectId,{kind:chosen.kind,title:title.trim(),reason:reason.trim(),payload} as Parameters<typeof apiClient.createSchedulePlan>[1],key);
      if(mounted.current&&scopeRef.current===requestScope){setEditor(null);setNotice(t('Saved. Earlier versions remain available.','تم الحفظ مع الاحتفاظ بالإصدارات السابقة.'));setReload(n=>n+1);}
    }catch(e){if(mounted.current&&scopeRef.current===requestScope){setCommandError(e instanceof Error?e.message:t('Save failed. Retry the same request.','تعذر الحفظ. أعد محاولة الطلب نفسه.'));setConflict(e instanceof ApiError&&[409,412].includes(e.status));}}
    finally{if(mounted.current&&scopeRef.current===requestScope){busy.current=false;setSaving(false);}}
  };
  const intervalEditor=(intervals:WorkInterval[],change:(next:WorkInterval[])=>void)=> <div className="plan-intervals">
    {!intervals.length&&<span className="records-muted">{t('Non-working','غير عامل')}</span>}
    {intervals.map((interval,index)=><div key={index} className="plan-interval">
      <Input type="time" label={t('From','من')} value={clock(interval.startMinute)} required disabled={saving} onChange={e=>{if(e.target.value)change(intervals.map((item,i)=>i===index?{...item,startMinute:minute(e.target.value)}:item));}}/>
      <Input type="time" label={t('Until','إلى')} value={clock(interval.endMinute===1440?1439:interval.endMinute)} required disabled={saving||interval.endMinute===1440} onChange={e=>{if(e.target.value)change(intervals.map((item,i)=>i===index?{...item,endMinute:minute(e.target.value)}:item));}}/>
      <label className="plan-check"><input type="checkbox" checked={interval.endMinute===1440} disabled={saving} onChange={e=>change(intervals.map((item,i)=>i===index?{...item,endMinute:e.target.checked?1440:1020}:item))}/>{t('End of day','نهاية اليوم')}</label>
      <Button type="button" variant="ghost" disabled={saving} onClick={()=>change(intervals.filter((_,i)=>i!==index))}>{t('Remove interval','إزالة الفترة')}</Button>
    </div>)}
    {intervals.length<4&&<Button type="button" variant="secondary" disabled={saving} onClick={()=>change([...intervals,{startMinute:540,endMinute:1020}])}>{t('Add working interval','إضافة فترة عمل')}</Button>}
  </div>;
  const describe=(record:{kind:PlanKind;payload:PlanRecord['payload']})=>{
    if(record.kind==='calendar'){const value=record.payload as CalendarDefinition;return <><p>{value.timezone} · {workingHours(value)} {t('nominal hours / week','ساعة اسمية / أسبوع')}</p><div className="plan-week-summary">{value.week.map(day=><div key={day.day}><strong>{(ar?arabicLabels:labels)[day.day]}</strong><span>{day.intervals.map(i=>`${clock(i.startMinute)}–${clock(i.endMinute)}`).join(', ')||t('Non-working','غير عامل')}</span></div>)}</div>{!!value.exceptions.length&&<details><summary>{value.exceptions.length} {t('date overrides','استثناءات تاريخية')}</summary>{value.exceptions.map(d=><p key={d.date}>{d.date}: {d.intervals.map(i=>`${clock(i.startMinute)}–${clock(i.endMinute)}`).join(', ')||t('Non-working','غير عامل')} {d.note&&` · ${d.note}`}</p>)}</details>}</>;}
    if(record.kind==='milestone'){const value=record.payload as MilestoneDefinition;return <><p>{date(value.targetAt,value.timezone||'UTC')} {value.timezone&&` · ${value.timezone}`}</p><p className="plan-notes">{value.notes}</p></>;}
    const value=record.payload as CandidatePayload;return <p>{value.counts.tasks} {t('tasks','مهام')} · {value.counts.scheduledTasks} {t('with forecasts','بتوقعات')} · {value.counts.dependencies} {t('connections','روابط')} · {value.counts.calendars} {t('calendars','تقاويم')} · {value.counts.milestones} {t('milestones','معالم')}</p>;
  };
  if(loading)return <Card><p role="status">{t('Loading project planning…','جارٍ تحميل تخطيط المشروع…')}</p></Card>;
  if(error||!list)return <Card><p role="alert">{error||t('Planning is unavailable','التخطيط غير متاح')}</p><Button onClick={()=>setReload(n=>n+1)}>{t('Retry','إعادة المحاولة')}</Button></Card>;
  const rows=list.data.filter(row=>row.kind===kind);
  const heading=kind==='calendar'?t('Working calendars','تقاويم العمل'):kind==='milestone'?t('Planning milestones','معالم التخطيط'):t('Baseline candidates','مرشحات الخطة الأساسية');
  return <>
    <Card><div className="records-heading"><div><span className="records-eyebrow">{t('PROJECT PLANNING','تخطيط المشروع')}</span><h2>{heading}</h2></div>{list.meta.canEdit&&<Button onClick={()=>open()}>{kind==='baseline_candidate'?t('Review & capture','مراجعة وحفظ'):t('Create new','إنشاء جديد')}</Button>}</div>
      <p className="records-muted">{kind==='calendar'?t('Define local working hours and date overrides. These definitions do not move forecasts or confirm crew availability.','حدد ساعات العمل المحلية واستثناءات التواريخ. لا تغيّر هذه التعريفات التوقعات ولا تؤكد توافر الفرق.'):kind==='milestone'?t('Keep planning targets separate from contractual commitments and actual acceptance. An unknown date stays unset.','احتفظ بأهداف التخطيط منفصلة عن الالتزامات التعاقدية والقبول الفعلي. يظل التاريخ غير المعروف غير محدد.'):t('Freeze the exact schedule reviewed by your team. Candidates are not approved baselines; publication requires the approval workflow.','احفظ نسخة ثابتة من الجدول الذي راجعه فريقك. المرشحات ليست خططاً أساسية معتمدة؛ يتطلب النشر مسار الموافقة.')}</p>
      {notice&&<p role="status">{notice}</p>}{list.meta.truncated&&<p role="status">{t('Showing up to 300 planning records and the latest 25 candidates.','عرض حتى 300 سجل تخطيط وأحدث 25 مرشحاً.')}</p>}
      {!rows.length&&<div className="records-empty"><div className="records-orb" aria-hidden="true">{kind==='calendar'?'◷':kind==='milestone'?'◇':'▤'}</div><h3>{t('No records yet','لا توجد سجلات بعد')}</h3><p>{t('Create a record to start this part of the project plan.','أنشئ سجلاً لبدء هذا الجزء من خطة المشروع.')}</p></div>}
    </Card>
    <div className="plan-cards">{rows.map(record=><Card key={record.id}><div className="records-heading"><h3>{record.title}</h3><Badge variant={record.kind==='baseline_candidate'?'purple':'neutral'}>{record.kind==='baseline_candidate'?t('Frozen · not approved','محفوظ · غير معتمد'):`${t('Version','الإصدار')} ${record.version}`}</Badge></div>
      {describe(record)}<p className="records-muted">{t('Updated','تم التحديث')} {date(record.updatedAt)}</p>
      {!record.snapshotIntegrityVerified&&<p role="alert">{t('Retained history needs reconciliation.','يحتاج السجل المحفوظ إلى تسوية.')}</p>}
      <div className="records-actions">{record.kind!=='baseline_candidate'&&list.meta.canEdit&&record.snapshotIntegrityVerified&&<Button variant="secondary" onClick={()=>open(record)}>{t('Revise','تعديل')}</Button>}<Button variant="ghost" onClick={()=>void openDetail(record)}>{record.kind==='baseline_candidate'?t('Compare with current plan','مقارنة بالخطة الحالية'):t('Version history','سجل الإصدارات')}</Button></div>
    </Card>)}</div>
    <Modal isOpen={!!editor} onClose={close} title={editor?.record?t('Revise planning record','تعديل سجل التخطيط'):heading}>
      <form onSubmit={submit} className="records-form"><Input label={t('Name','الاسم')} value={title} required maxLength={200} disabled={saving} onChange={e=>setTitle(e.target.value)}/>
        {editor?.kind==='calendar'&&<>
          <Input label={t('Local timezone (IANA)','المنطقة الزمنية المحلية (IANA)')} value={calendar.timezone} required maxLength={100} disabled={saving} onChange={e=>setCalendar({...calendar,timezone:e.target.value})}/>
          <p>{t('Intervals use local wall time within one day. Split overnight work across two days. Date overrides replace that day’s usual intervals.','الفترات بالتوقيت المحلي ضمن يوم واحد. قسّم العمل الليلي على يومين. تحل استثناءات التاريخ محل فترات ذلك اليوم.')}</p>
          {calendar.week.map((day,index)=><fieldset className="plan-day" key={day.day}><legend>{(ar?arabicLabels:labels)[day.day]}</legend>{intervalEditor(day.intervals,intervals=>setCalendar({...calendar,week:calendar.week.map((d,i)=>i===index?{...d,intervals}:d)}))}</fieldset>)}
          <h3>{t('Date overrides','استثناءات التواريخ')}</h3>{calendar.exceptions.map((exception,index)=><fieldset className="plan-day" key={index}><legend>{t('Override','استثناء')} {index+1}</legend>
            <Input type="date" min="1970-01-01" max="2100-12-31" label={t('Local date','التاريخ المحلي')} required value={exception.date} disabled={saving} onChange={e=>setCalendar({...calendar,exceptions:calendar.exceptions.map((d,i)=>i===index?{...d,date:e.target.value}:d)})}/>
            {intervalEditor(exception.intervals,intervals=>setCalendar({...calendar,exceptions:calendar.exceptions.map((d,i)=>i===index?{...d,intervals}:d)}))}
            <Input label={t('Note','ملاحظة')} value={exception.note} maxLength={500} disabled={saving} onChange={e=>setCalendar({...calendar,exceptions:calendar.exceptions.map((d,i)=>i===index?{...d,note:e.target.value}:d)})}/>
            <Button type="button" variant="ghost" disabled={saving} onClick={()=>setCalendar({...calendar,exceptions:calendar.exceptions.filter((_,i)=>i!==index)})}>{t('Remove override','إزالة الاستثناء')}</Button>
          </fieldset>)}{calendar.exceptions.length<100&&<Button type="button" variant="secondary" disabled={saving} onClick={()=>setCalendar({...calendar,exceptions:[...calendar.exceptions,{date:'',intervals:[],note:''}]})}>{t('Add date override','إضافة استثناء تاريخ')}</Button>}
        </>}
        {editor?.kind==='milestone'&&<><p>{t('Supply an exact timestamp with offset and its timezone, or leave both empty for an unknown target.','أدخل توقيتاً دقيقاً مع فرق التوقيت والمنطقة الزمنية، أو اترك كليهما فارغاً إذا كان الهدف غير معروف.')}</p>
          <Input label={t('Target instant','موعد الهدف')} placeholder="2026-10-15T09:00:00+03:00" value={milestone.targetAt||''} maxLength={40} disabled={saving} onChange={e=>setMilestone({...milestone,targetAt:e.target.value||null})}/>
          <Input label={t('Source timezone (IANA)','المنطقة الزمنية للمصدر (IANA)')} placeholder="Asia/Qatar" value={milestone.timezone||''} maxLength={100} disabled={saving} onChange={e=>setMilestone({...milestone,timezone:e.target.value||null})}/>
          <Textarea label={t('Planning notes','ملاحظات التخطيط')} value={milestone.notes} maxLength={2000} disabled={saving} onChange={e=>setMilestone({...milestone,notes:e.target.value})}/>
        </>}
        {editor?.kind==='baseline_candidate'&&<>{previewLoading?<p role="status">{t('Preparing current schedule…','جارٍ إعداد الجدول الحالي…')}</p>:previewError?<p role="alert">{previewError}</p>:preview&&<>
          {describe({kind:'baseline_candidate',payload:preview.data})}<p>{t('Missing forecasts remain unknown in the snapshot. Calendars are retained definitions, not resource reservations.','تبقى التوقعات المفقودة غير معروفة في النسخة. التقاويم تعريفات محفوظة وليست حجوزات موارد.')}</p>
          <div className="plan-preview">{preview.data.source.tasks.map(task=><article className="plan-preview-row" key={task.id}><strong>{task.title}</strong><span>{date(task.startAt,task.timezone||'UTC')} → {date(task.finishAt,task.timezone||'UTC')}</span><small>{task.packageName} · {task.timezone||'—'} · {t('Task version','إصدار المهمة')} {task.taskVersion}</small></article>)}</div>
          {!!preview.data.source.dependencies.length&&<details><summary>{t('Dependency connections','روابط الاعتماديات')}</summary>{preview.data.source.dependencies.map(edge=><p key={edge.id}>{preview.data.source.tasks.find(task=>task.id===edge.predecessorId)?.title} → {preview.data.source.tasks.find(task=>task.id===edge.successorId)?.title} · {edge.dependencyType}</p>)}</details>}
          {preview.data.source.planning.map(record=><details key={record.recordId}><summary>{record.title} · {t('Version','الإصدار')} {record.version}</summary>{describe(record)}</details>)}
          <label className="plan-check"><input type="checkbox" checked={reviewed} disabled={saving} onChange={e=>setReviewed(e.target.checked)}/>{t('I reviewed this schedule for an unapproved candidate.','راجعت هذا الجدول لحفظه كمرشح غير معتمد.')}</label>
        </>}<Button type="button" variant="secondary" disabled={saving||previewLoading} onClick={()=>{setConflict(false);setCommandError('');void loadPreview();}}>{t('Reload preview','إعادة تحميل المعاينة')}</Button></>}
        <Textarea label={t('Reason','السبب')} required maxLength={2000} value={reason} disabled={saving} onChange={e=>setReason(e.target.value)}/>
        {commandError&&<p role="alert">{commandError}</p>}{conflict&&editor?.kind!=='baseline_candidate'&&<Button type="button" variant="secondary" onClick={()=>{close();setReload(n=>n+1);}}>{t('Refresh and review','تحديث ومراجعة')}</Button>}
        <div className="records-actions"><Button type="submit" disabled={saving||conflict||!title.trim()||!reason.trim()||(editor?.kind==='baseline_candidate'&&(!reviewed||!preview?.data.counts.tasks||previewLoading))}>{saving?t('Saving…','جارٍ الحفظ…'):editor?.kind==='baseline_candidate'?t('Capture candidate','حفظ المرشح'):t('Save version','حفظ الإصدار')}</Button><Button type="button" variant="ghost" disabled={saving} onClick={close}>{t('Cancel','إلغاء')}</Button></div>
      </form>
    </Modal>
    <Modal isOpen={!!detailTitle} onClose={()=>{sequence.current++;setDetailTitle('');}} title={detailTitle}>
      {detailLoading?<p role="status">{t('Loading retained records…','جارٍ تحميل السجلات المحفوظة…')}</p>:detailError?<p role="alert">{detailError}</p>:<>
        {history?.meta.truncated&&<p>{t('Showing the latest 100 versions.','عرض أحدث 100 إصدار.')}</p>}{history?.data.map(item=><article key={item.id} className="plan-history"><h3>{t('Version','الإصدار')} {item.version} · {date(item.createdAt)}</h3><p>{item.reason}</p><details><summary>{t('Retained definition','التعريف المحفوظ')}</summary>{describe(item.snapshot)}</details>{!item.snapshotIntegrityVerified&&<p role="alert">{t('History integrity could not be confirmed.','تعذر تأكيد سلامة السجل.')}</p>}</article>)}
        {comparison&&<><Badge variant={comparison.data.sourceChanged?'warning':'success'}>{comparison.data.sourceChanged?t('Current plan has changed','تغيرت الخطة الحالية'):t('Matches current plan','تطابق الخطة الحالية')}</Badge><p>{t('This candidate remains unapproved. Forecast changes do not rewrite it.','يظل هذا المرشح غير معتمد. لا تعيد تغييرات التوقعات كتابته.')}</p>
          <p>{t('Calendars / milestones: ','التقاويم / المعالم: ')}{comparison.data.planningChanged?t('Changed','تغيرت'):t('Unchanged','لم تتغير')} · {t('Dependencies: ','الاعتماديات: ')}{comparison.data.dependenciesChanged?t('Changed','تغيرت'):t('Unchanged','لم تتغير')}</p>
          <p className="records-muted">{t('Comparison captured at ','وقت المقارنة: ')}{date(comparison.meta.dataAsOf)}</p>
          {comparison.data.changes.map(change=><article className="plan-history" key={change.taskId}><h3>{change.title}</h3><Badge variant={change.status==='unchanged'?'neutral':'warning'}>{change.status==='added'?t('Added','أضيفت'):change.status==='removed'?t('Removed','أزيلت'):change.status==='changed'?t('Changed','تغيرت'):t('Unchanged','لم تتغير')}</Badge><p>{t('Candidate (UTC): ','المرشح (UTC): ')}{date(change.beforeStart)} → {date(change.beforeFinish)}</p><p>{t('Current (UTC): ','الحالي (UTC): ')}{date(change.currentStart)} → {date(change.currentFinish)}</p>{change.finishShiftMinutes!==null&&<p>{t('Finish shift: ','تغير النهاية: ')}{change.finishShiftMinutes} {t('minutes','دقيقة')}</p>}</article>)}
          <details><summary>{t('Retained calendars & milestones','التقاويم والمعالم المحفوظة')}</summary>{(comparison.data.candidate.payload as CandidatePayload).source?.planning.map(record=><article className="plan-history" key={record.recordId}><h3>{record.title}</h3>{describe(record)}</article>)}</details>
        </>}
      </>}
    </Modal>
  </>;
};
