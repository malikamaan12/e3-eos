import React, {useEffect,useRef,useState} from 'react';
import {useEosContext} from '../context/EosContext.js';
import {Badge,Button,Card,Input,MetricCard,Select,Textarea} from '../components/DesignSystem.js';
import type {FieldNoteReceipt} from '../services/project-control.js';
import type {TaskRecord} from '../services/project-records.js';
import {clearReceivedFieldNotes,confirmsFieldNote,fieldDeviceId,readFieldNotes,saveFieldNote,type QueuedFieldNote} from '../services/field-note-queue.js';
import './ProjectRecords.css';

export const FieldNotesRegister:React.FC<{projectId:string}> = ({projectId}) => {
  const {apiClient,currentUser,currentOrg,currentLanguage,isOffline,refreshTrigger} = useEosContext();
  const ar=currentLanguage==='ar', t=(en:string,arabic:string)=>ar?arabic:en;
  const [records,setRecords]=useState<FieldNoteReceipt[]>([]),[tasks,setTasks]=useState<TaskRecord[]>([]);
  const [queue,setQueue]=useState<QueuedFieldNote[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[storageError,setStorageError]=useState('');
  const [reload,setReload]=useState(0),[note,setNote]=useState(''),[reason,setReason]=useState(''),[taskId,setTaskId]=useState('');
  const [canSync,setCanSync]=useState(false),[syncing,setSyncing]=useState(false),[notice,setNotice]=useState(''),[truncated,setTruncated]=useState(false);
  const [connected,setConnected]=useState(()=>navigator.onLine), mounted=useRef(true),busy=useRef(false);
  const offline=isOffline || !connected;
  useEffect(()=>{mounted.current=true;const online=()=>setConnected(navigator.onLine);window.addEventListener('online',online);window.addEventListener('offline',online);return()=>{mounted.current=false;window.removeEventListener('online',online);window.removeEventListener('offline',online);};},[]);
  const loadQueue=()=>{try {setQueue(readFieldNotes(localStorage,currentOrg.id,currentUser!.id).filter(item=>item.projectId===projectId));setStorageError('');} catch(cause){setStorageError(cause instanceof Error?cause.message:String(cause));}};
  useEffect(()=>{loadQueue();const listener=()=>loadQueue();window.addEventListener('storage',listener);return()=>window.removeEventListener('storage',listener);},[currentOrg.id,currentUser?.id,projectId]);
  useEffect(()=>{
    let active=true;
    if(offline){setLoading(false);return;}
    setLoading(true);setError('');setCanSync(false);
    Promise.all([apiClient.getFieldObservations(projectId),apiClient.getRecordedTasks(projectId)]).then(([response,taskList])=>{
      if(active){setRecords(response.data);setTasks(taskList.data);setCanSync(response.meta?.capabilities?.canCapture===true);setTruncated(response.meta?.truncated===true);}
    }).catch(cause=>{if(active){setError(cause.message);setRecords([]);setTasks([]);}}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[apiClient,projectId,offline,refreshTrigger,reload]);
  const date=(value:string)=>new Date(value).toLocaleString(ar?'ar-QA':'en-GB');
  const pending=queue.filter(item=>!item.receipt),received=queue.filter(item=>item.receipt);
  const save=(event:React.FormEvent)=>{
    event.preventDefault();if(!currentUser || busy.current || !note.trim() || !reason.trim() || storageError)return;
    const task=tasks.find(item=>item.id===taskId);if(taskId&&!task)return;
    try {
      const item:QueuedFieldNote={organisationId:currentOrg.id,actorId:currentUser.id,projectId,input:{clientOperationId:crypto.randomUUID(),deviceId:fieldDeviceId(localStorage),capturedAt:new Date().toISOString(),note:note.trim(),reason:reason.trim(),...(task?{taskId:task.id,baseVersion:task.rowVersion}:{})}};
      saveFieldNote(localStorage,item);loadQueue();setNote('');setReason('');setTaskId('');setNotice(t('Saved on this device. Use Sync notes to obtain a server receipt.','تم الحفظ على هذا الجهاز. استخدم مزامنة الملاحظات للحصول على إيصال الخادم.'));
    }catch(cause){setStorageError(t('The note was not saved. Keep or copy the text below. ','لم تُحفظ الملاحظة. احتفظ بالنص أدناه أو انسخه. ')+(cause instanceof Error?cause.message:String(cause)));}
  };
  const sync=async()=>{
    if(busy.current || offline || !canSync || storageError || !currentUser)return;
    busy.current=true;setSyncing(true);setNotice('');let accepted=0,failed=0;
    try {
      const captures=readFieldNotes(localStorage,currentOrg.id,currentUser.id).filter(item=>item.projectId===projectId&&!item.receipt);
      for(const item of captures){
        if(!mounted.current || !apiClient.isCurrentScope(item.organisationId,item.actorId))break;
        try {
          const receipt=await apiClient.captureFieldObservation(projectId,item.input,item.input.clientOperationId);
          if(!confirmsFieldNote(item,receipt))throw new Error(t('Receipt does not match this note. Retained for retry.','الإيصال لا يطابق هذه الملاحظة. تم الاحتفاظ بها لإعادة المحاولة.'));
          saveFieldNote(localStorage,{...item,receipt,lastError:undefined});accepted++;
        }catch(cause){failed++;saveFieldNote(localStorage,{...item,lastError:cause instanceof Error?cause.message:String(cause)});}
        if(mounted.current)loadQueue();
      }
      if(mounted.current){setNotice(`${accepted} ${t('received by server','استلمها الخادم')} · ${failed} ${t('retained for retry','محفوظة لإعادة المحاولة')}`);setReload(value=>value+1);}
    }catch(cause){if(mounted.current)setStorageError(cause instanceof Error?cause.message:String(cause));}
    finally {busy.current=false;if(mounted.current)setSyncing(false);}
  };
  const clearReceived=()=>{try{clearReceivedFieldNotes(localStorage,currentOrg.id,currentUser!.id,projectId);loadQueue();}catch(cause){setStorageError(String(cause));}};
  return <section className="records-page" aria-label={t('Field observations','الملاحظات الميدانية')}>
    <div className="records-notice">{t('Text observations record what you saw. They do not complete tasks, approve work or confirm safety. Capture only routine project notes; files and sensitive incident details belong in their controlled workflows.','تسجل الملاحظات النصية ما شاهدته. لا تُنجز المهام أو تعتمد الأعمال أو تؤكد السلامة. سجّل ملاحظات المشروع العادية فقط؛ للملفات وتفاصيل الحوادث الحساسة مساراتها المخصصة.')}</div>
    <div className="records-metrics"><MetricCard label={t('On this device','على هذا الجهاز')} value={pending.length} subtitle={t('Awaiting a confirmed receipt','بانتظار إيصال مؤكد')}/><MetricCard label={t('Server observations','ملاحظات الخادم')} value={offline?'—':records.length} subtitle={truncated?t('Latest 200 records','أحدث ٢٠٠ سجل'):t('Current project scope','نطاق المشروع الحالي')}/><MetricCard label={t('Connection','الاتصال')} value={offline?t('Offline','غير متصل'):t('Online','متصل')} subtitle={t('Explicit sync, durable receipts','مزامنة يدوية وإيصالات محفوظة')}/></div>
    <div className="records-grid"><Card title={t('Capture a field note','تسجيل ملاحظة ميدانية')}><form className="records-form" onSubmit={save}>
      <Textarea id="field-note" label={t('Observation','الملاحظة')} value={note} onChange={event=>setNote(event.target.value)} required maxLength={2000}/>
      <Select id="field-note-task" label={t('Task reference (optional)','مرجع المهمة (اختياري)')} value={taskId} onChange={event=>setTaskId(event.target.value)} options={[{value:'',label:t('Project note — no task','ملاحظة مشروع دون مهمة')},...tasks.map(task=>({value:task.id,label:`${task.title} · v${task.rowVersion}`}))]}/>
      <Input id="field-note-reason" label={t('Reason for recording','سبب التسجيل')} value={reason} onChange={event=>setReason(event.target.value)} required maxLength={2000}/>
      {storageError&&<div role="alert" className="records-notice">{storageError}<Button type="button" variant="secondary" size="sm" onClick={loadQueue}>{t('Check storage again','إعادة فحص التخزين')}</Button></div>}
      <Button type="submit" disabled={!note.trim()||!reason.trim()||syncing||!!storageError}>{t('Save on this device','حفظ على هذا الجهاز')}</Button>
      <p className="records-muted">{t('Device storage can be lost. A local note is not a server record until its receipt appears. Reconnecting and signing in may be needed after reload.','يمكن فقدان بيانات الجهاز. لا تصبح الملاحظة سجلاً على الخادم حتى يظهر إيصالها. قد يلزم الاتصال وتسجيل الدخول بعد إعادة التحميل.')}</p>
    </form></Card>
    <Card title={t('Device queue','قائمة الجهاز')} action={<Button size="sm" disabled={!pending.length||offline||!canSync||!!storageError||loading} isLoading={syncing} onClick={()=>void sync()}>{t('Sync notes','مزامنة الملاحظات')}</Button>}>
      {notice&&<p role="status" className="records-notice">{notice}</p>}
      {queue.length?queue.map(item=><article className="records-row" key={item.input.clientOperationId}><div><Badge variant={item.receipt?'success':item.lastError?'warning':'neutral'}>{item.receipt?t('Server received','استلمها الخادم'):item.lastError?t('Needs retry','تحتاج إعادة محاولة'):t('On device only','على الجهاز فقط')}</Badge><p>{item.input.note}</p><p>{t('Device capture time','وقت التسجيل على الجهاز')}: {date(item.input.capturedAt)}</p>{item.receipt?.status==='accepted_as_observation_with_conflict'&&<p>{t('Saved as an observation with a task-version conflict. Task unchanged.','حُفظت كملاحظة مع تعارض في إصدار المهمة. لم تتغير المهمة.')}</p>}{item.lastError&&<p role="alert">{item.lastError}</p>}{item.receipt&&<p className="records-code">{t('Receipt','الإيصال')}: {item.receipt.id}</p>}</div></article>):<div className="records-empty"><h3>{t('No notes queued','لا توجد ملاحظات في القائمة')}</h3><p>{t('Your saved captures will appear here.','ستظهر الملاحظات المحفوظة هنا.')}</p></div>}
      {!!received.length&&<Button variant="secondary" size="sm" disabled={syncing} onClick={clearReceived}>{t('Clear received copies from device','إزالة النسخ المستلمة من الجهاز')}</Button>}
    </Card></div>
    <Card title={t('Recorded observations','الملاحظات المسجلة')} action={<Button variant="secondary" size="sm" disabled={offline||loading||syncing} onClick={()=>setReload(value=>value+1)}>{t('Refresh','تحديث')}</Button>}>
      {loading?<p role="status">{t('Loading observations…','جارٍ تحميل الملاحظات…')}</p>:error?<p role="alert">{error}</p>:offline?<p>{t('Server records will refresh when connected.','ستتحدث سجلات الخادم عند الاتصال.')}</p>:records.length?records.map(record=><article key={record.id} className="records-row"><div><Badge variant={record.status==='accepted'?'info':'warning'}>{record.status==='accepted'?t('Recorded observation','ملاحظة مسجلة'):t('Task-version conflict','تعارض إصدار المهمة')}</Badge><h3 style={{marginTop:12,whiteSpace:'pre-wrap'}}>{record.note}</h3><p>{record.reason}</p><p>{t('Received','استُلمت')}: {date(record.receivedAt)}</p><p>{t('Claimed capture time','وقت التسجيل المصرح به')}: {date(record.capturedAt)}</p><p className="records-code">{t('Receipt','الإيصال')}: {record.id}</p></div></article>):<div className="records-empty"><h3>{t('No server observations yet','لا توجد ملاحظات مسجلة بعد')}</h3></div>}
    </Card>
  </section>;
};
