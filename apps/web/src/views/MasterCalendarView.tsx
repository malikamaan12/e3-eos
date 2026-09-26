import React,{useEffect,useState} from 'react';
import {Badge,Button,Card,MetricCard,Select} from '../components/DesignSystem.js';
import {useEosContext} from '../context/EosContext.js';
import type {CalendarResult,ScheduledTask} from '../services/schedule.js';
import './ProjectRecords.css';
import './ScheduleView.css';

export const MasterCalendarView:React.FC=()=>{
  const {apiClient,currentOrg,currentUser,currentLanguage,navigate,refreshTrigger}=useEosContext();
  const ar=currentLanguage==='ar',t=(en:string,arabic:string)=>ar?arabic:en;
  const [month,setMonth]=useState(()=>new Date().toISOString().slice(0,7)),[mode,setMode]=useState<'month'|'agenda'>('month'),[project,setProject]=useState('all');
  const [result,setResult]=useState<CalendarResult|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[reload,setReload]=useState(0);
  const scope=`${currentOrg.id}:${currentUser?.id}`;
  useEffect(()=>{setProject('all');},[scope]);
  const year=Number(month.slice(0,4)),monthIndex=Number(month.slice(5,7))-1;
  const from=new Date(Date.UTC(year,monthIndex,1)).toISOString(),until=new Date(Date.UTC(year,monthIndex+1,1)).toISOString();
  useEffect(()=>{let active=true;setLoading(true);setError('');setResult(null);
    apiClient.getForecastCalendar(from,until).then(value=>{if(active){setResult(value);setProject(selected=>selected==='all'||value.data.some(row=>row.projectId===selected)?selected:'all');}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[apiClient,scope,from,until,reload,refreshTrigger]);
  const projects=[...new Map((result?.data||[]).map(row=>[row.projectId,{value:row.projectId,label:row.projectTitle||row.projectCode||row.projectId}])).values()];
  const rows=(result?.data||[]).filter(row=>project==='all'||row.projectId===project);
  const days=new Date(Date.UTC(year,monthIndex+1,0)).getUTCDate(),offset=new Date(from).getUTCDay(),today=new Date().toISOString().slice(0,10);
  const displayDate=(value:string|null)=>value?new Intl.DateTimeFormat(ar?'ar':'en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(new Date(value)):'—';
  const title=new Intl.DateTimeFormat(ar?'ar':'en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(from));
  const shift=(amount:number)=>{setProject('all');setMonth(new Date(Date.UTC(year,monthIndex+amount,1)).toISOString().slice(0,7));};
  const open=(row:ScheduledTask)=>navigate(`/projects/${row.projectId}/schedule`);
  return <div className="records-page" dir={ar?'rtl':'ltr'}>
    <header className="records-heading"><div><span className="records-eyebrow">{t('PROJECT CALENDAR','تقويم المشاريع')}</span><h1>{t('Forecast calendar','تقويم التوقعات')}</h1><p>{t('Saved task forecasts across the projects available to you.','توقعات المهام المحفوظة عبر المشاريع المتاحة لك.')}</p></div><Badge variant="purple">{t('UTC display','العرض بتوقيت UTC')}</Badge></header>
    <div className="records-actions"><Button variant="secondary" onClick={()=>navigate('/schedule')}>{t('Plan a project','تخطيط مشروع')}</Button><Button variant="ghost" onClick={()=>setReload(n=>n+1)}>{t('Refresh','تحديث')}</Button></div>
    <div className="records-metrics"><MetricCard title={t('Projects in your access scope','المشاريع المتاحة لك')} value={loading?null:result?.meta.accessibleProjectCount??null}/><MetricCard title={t('Forecasts in this view','التوقعات المعروضة')} value={loading||!result?null:rows.length}/><MetricCard title={t('Completed tasks in view','المهام المكتملة المعروضة')} value={loading||!result?null:rows.filter(row=>row.isCompleted).length}/></div>
    <p className="records-notice">{t('Dates are forecasts, not confirmed venue bookings or resource reservations. Unscheduled tasks are available in the project schedule. Calendar days use UTC; each task retains its source timezone.','المواعيد توقعات وليست حجوزات مؤكدة للمواقع أو الموارد. المهام غير المجدولة متاحة في جدول المشروع. أيام التقويم بتوقيت UTC مع حفظ المنطقة الزمنية لمصدر كل مهمة.')}</p>
    <Card><div className="records-heading"><div className="records-actions"><Button variant="secondary" aria-label={t('Previous month','الشهر السابق')} onClick={()=>shift(-1)}>‹</Button><h2>{title}</h2><Button variant="secondary" aria-label={t('Next month','الشهر التالي')} onClick={()=>shift(1)}>›</Button><Button variant="ghost" onClick={()=>{setProject('all');setMonth(new Date().toISOString().slice(0,7));}}>{t('This month','هذا الشهر')}</Button></div><div className="records-actions"><Button variant={mode==='month'?'primary':'secondary'} onClick={()=>setMode('month')}>{t('Month','شهر')}</Button><Button variant={mode==='agenda'?'primary':'secondary'} onClick={()=>setMode('agenda')}>{t('Agenda','الأجندة')}</Button></div></div>
      <div className="records-scope"><Select label={t('Project filter','تصفية المشروع')} value={project} disabled={loading} onChange={e=>setProject(e.target.value)} options={[{value:'all',label:t('All projects in this window','كل المشاريع في هذه الفترة')},...projects]}/></div>
      {loading?<p role="status">{t('Loading forecasts…','جارٍ تحميل التوقعات…')}</p>:error?<div role="alert"><p>{error}</p><Button onClick={()=>setReload(n=>n+1)}>{t('Retry','إعادة المحاولة')}</Button></div>:<>
        {result?.meta.truncated&&<p role="status">{t('Showing the first 1,000 forecasts in this month. Results are partial.','عرض أول 1,000 توقع في هذه الفترة. هذه النتائج جزئية.')}</p>}
        {result?.meta.assignmentScope==='assigned_tasks_only'&&<p>{t('Only tasks assigned to you are shown.','تُعرض المهام المسندة إليك فقط.')}</p>}
        {!rows.length&&<div className="records-empty"><div className="records-orb" aria-hidden="true">◷</div><h3>{t('No saved forecasts in this month','لا توجد توقعات محفوظة لهذا الشهر')}</h3><p>{result?.meta.accessibleProjectCount?t('Record a task forecast from a project schedule to add it here.','سجّل توقعاً لمهمة في جدول المشروع لإظهاره هنا.'):t('A project access assignment is needed to see its work here.','يلزم تعيين وصول للمشروع لرؤية أعماله هنا.')}</p></div>}
        {mode==='month'&&!!rows.length&&<div className="schedule-calendar-grid" aria-label={t('UTC month calendar','تقويم الشهر بتوقيت UTC')}>
          {Array.from({length:7},(_,i)=><div className="schedule-weekday" key={i}>{new Intl.DateTimeFormat(ar?'ar':'en-GB',{weekday:'short',timeZone:'UTC'}).format(new Date(Date.UTC(2026,8,6+i)))}</div>)}
          {Array.from({length:offset},(_,i)=><div key={`blank-${i}`} aria-hidden="true"/>)}
          {Array.from({length:days},(_,i)=>{const start=new Date(Date.UTC(year,monthIndex,i+1)).toISOString(),end=new Date(Date.UTC(year,monthIndex,i+2)).toISOString();
            const items=rows.filter(row=>row.startAt!<end&&row.finishAt!>=start);return <div className="schedule-day" data-today={start.slice(0,10)===today} key={i}><strong>{i+1}</strong>{items.slice(0,3).map(row=><button key={row.id} onClick={()=>open(row)} title={`${row.projectTitle}: ${row.title}`}>{row.title}</button>)}{items.length>3&&<button onClick={()=>setMode('agenda')}>{t(`+${items.length-3} more`,`+${items.length-3} أخرى`)}</button>}</div>;})}
        </div>}
        {!!rows.length&&<section aria-label={t('Forecast agenda','أجندة التوقعات')}><h3>{t('Forecast agenda','أجندة التوقعات')}</h3>{rows.map(row=><article className="records-row" key={row.id}><div><h3>{row.title}</h3><p>{row.projectTitle} · {row.packageName}</p><p>{displayDate(row.startAt)} → {displayDate(row.finishAt)} UTC</p><p>{t('Source timezone: ','المنطقة الزمنية للمصدر: ')}{row.timezone||'—'} · {row.assigneeName||t('Unassigned','غير مسندة')}</p>{!row.snapshotIntegrityVerified&&<p role="alert">{t('Forecast history needs reconciliation.','يحتاج سجل التوقع إلى تسوية.')}</p>}</div><div className="records-actions"><Badge variant={row.isCompleted?'success':'purple'}>{row.isCompleted?t('Completed','مكتملة'):t('Forecast','توقع')}</Badge><Button variant="secondary" onClick={()=>open(row)}>{t('Open schedule','فتح الجدول')}</Button></div></article>)}</section>}
      </>}
    </Card>
  </div>;
};
