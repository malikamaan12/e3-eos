import React, { useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, Input, MetricCard, Modal, Select, Textarea } from '../components/DesignSystem.js';
import { useEosContext } from '../context/EosContext.js';
import { ApiError } from '../services/api-client.js';
import type { DocumentRecord, DocumentRevision, RecordsKind, ReportDetail, ReportRecord, TaskRecord, WorkPackageRecord } from '../services/project-records.js';
import './ProjectRecords.css';

type Decision = { type: 'package' } | { type: 'task' } | { type: 'document' } | { type: 'report' }
  | { type: 'complete'; task: TaskRecord }
  | { type: 'revision'; document: DocumentRecord }
  | { type: 'reportRevision'; report: ReportRecord };
type Form = { title: string; packageId: string; assignSelf: boolean; reason: string; evidence: string; discipline: string;
  documentType: string; classification: string; revisionCode: string; filename: string; summary: string;
  reportCode: string; periodStart: string; periodEnd: string };
const blankForm = (): Form => ({ title: '', packageId: '', assignSelf: false, reason: '', evidence: '', discipline: '',
  documentType: '', classification: '', revisionCode: '', filename: '', summary: '', reportCode: '', periodStart: '', periodEnd: '' });

export const ProjectRecordsView: React.FC<{ kind: RecordsKind; projectId?: string }> = ({ kind, projectId }) => {
  const { projects, projectsLoading, projectsError, currentOrg, currentUser, currentLanguage, selectedProjectId, triggerRefresh, isCheckingSession } = useEosContext();
  const ar = currentLanguage === 'ar';
  const [selected, setSelected] = useState(projectId || selectedProjectId || '');
  useEffect(() => { setSelected(projectId || selectedProjectId || ''); }, [projectId, currentOrg.id, currentUser?.id]);
  const selection = selected;
  const project = projects.find(item => item.id === selection);
  const heading = kind === 'work' ? (ar ? 'حزم العمل والمهام' : 'Work packages & tasks')
    : kind === 'documents' ? (ar ? 'سجل المستندات' : 'Document register') : (ar ? 'لقطات تقارير المشروع' : 'Project report snapshots');
  const description = kind === 'work' ? (ar ? 'خطّط لحزم العمل وسجّل إنجاز المهام ضمن صلاحيات مشروعك.' : 'Plan delivery packages and record task completion within your project access.')
    : kind === 'documents' ? (ar ? 'سجّل بيانات المستندات ومسودات المراجعات وتتبّع حالة الملفات.' : 'Register document metadata and draft revisions with an explicit file status.')
    : (ar ? 'احفظ نسخاً مؤرخة من سجلات المشروع مع مصادرها وتاريخ إصداراتها.' : 'Capture dated project records with their sources and retained version history.');
  return <div className="records-page" dir={ar ? 'rtl' : 'ltr'}>
    <header className="records-heading"><div><span className="records-eyebrow">{ar ? 'مساحة المشروع' : 'PROJECT WORKSPACE'}</span><h1>{heading}</h1><p>{description}</p></div><Badge variant="purple">{currentOrg.name}</Badge></header>
    <div className="records-scope"><Select id="records-project" label={ar ? 'المشروع المتاح لك' : 'Project in your access scope'}
      disabled={projectsLoading || isCheckingSession} value={project ? selection : ''} onChange={event => setSelected(event.target.value)}
      options={[{ value: '', label: ar ? 'اختر مشروعاً' : 'Choose a project' }, ...projects.map(item => ({ value: item.id, label: `${item.projectCode || item.code || ''} · ${item.title || item.name}` }))]} /></div>
    {projectsLoading || isCheckingSession ? <Card><p role="status">{ar ? 'جارٍ تحميل المشاريع المتاحة...' : 'Loading projects in your access scope...'}</p></Card>
      : projectsError ? <Card><div role="alert"><h2>{ar ? 'تعذر تحميل المشاريع' : 'Projects could not be loaded'}</h2><p>{projectsError}</p><Button variant="secondary" onClick={triggerRefresh}>{ar ? 'إعادة المحاولة' : 'Retry'}</Button></div></Card>
      : !project ? <Card><div className="records-empty"><div className="records-orb" aria-hidden="true">◇</div><h2>{ar ? 'لا يوجد مشروع متاح في هذا النطاق' : 'No project available in this scope'}</h2><p>{ar ? 'اختر مشروعاً لديك منحة وصول إليه. يتطلب الوصول منحة مشروع صريحة مع عضوية فعّالة.' : 'Choose a project you have been granted access to. An active membership and an explicit project grant are required.'}</p><Button variant="secondary" onClick={triggerRefresh}>{ar ? 'تحديث المشاريع' : 'Refresh projects'}</Button></div></Card>
      : <RecordsScope key={`${currentOrg.id}:${currentUser?.id}:${project.id}:${kind}`} kind={kind} projectId={project.id} />}
  </div>;
};

function RecordsScope({ kind, projectId }: { kind: RecordsKind; projectId: string }) {
  const { apiClient, currentLanguage, currentUser, currentOrg, refreshTrigger } = useEosContext();
  const ar = currentLanguage === 'ar';
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const [packages, setPackages] = useState<WorkPackageRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [caps, setCaps] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [form, setForm] = useState<Form>(blankForm);
  const [submitting, setSubmitting] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecord | null>(null);
  const [revisions, setRevisions] = useState<DocumentRevision[]>([]);
  const [reportDetail, setReportDetail] = useState<ReportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailTarget, setDetailTarget] = useState<{ type: 'document' | 'report'; id: string } | null>(null);
  const attempts = useRef(new Map<string, string>());
  const busy = useRef(false);
  const mounted = useRef(true);
  const detailSequence = useRef(0);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; detailSequence.current += 1; }; }, []);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(null); setCaps({}); setPackages([]); setTasks([]); setDocuments([]); setReports([]);
    setSelectedDocument(null); setRevisions([]); setReportDetail(null); setDetailTarget(null); setDetailError(null); setDetailLoading(false); detailSequence.current += 1;
    const load = async () => {
      if (kind === 'work') {
        const [p, tasksResponse] = await Promise.all([apiClient.getRecordedPackages(projectId), apiClient.getRecordedTasks(projectId)]);
        if (active) { setPackages(p.data); setTasks(tasksResponse.data); setCaps({ ...p.meta?.capabilities, ...tasksResponse.meta?.capabilities }); }
      } else if (kind === 'documents') {
        const result = await apiClient.getDocumentRegister(projectId);
        if (active) { setDocuments(result.data); setCaps(result.meta?.capabilities || {}); }
      } else {
        const result = await apiClient.getReportSnapshots(projectId);
        if (active) { setReports(result.data); setCaps(result.meta?.capabilities || {}); }
      }
    };
    load().catch(cause => { if (active) setError(cause instanceof Error ? cause.message : t('Records could not be loaded.', 'تعذر تحميل السجلات.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [apiClient, projectId, kind, refreshTrigger, reload]);

  const date = (value?: string) => value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString(ar ? 'ar-QA' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : t('Not recorded', 'غير مسجل');
  const label = (value: string) => {
    const labels: Record<string, [string, string]> = {
      active: ['Active', 'نشط'], planned: ['Planned', 'مخطط'], completed: ['Completed', 'مكتمل'], cancelled: ['Cancelled', 'ملغى'],
      pending: ['Pending acceptance', 'بانتظار القبول'], accepted: ['Accepted', 'مقبول'], rejected: ['Rejected', 'مرفوض'], conditional: ['Conditional', 'مشروط'],
      draft: ['Draft', 'مسودة'], legacy_unverified: ['Legacy · unverified', 'سجل سابق · غير متحقق'], internal: ['Internal', 'داخلي'],
      client_confidential: ['Client confidential', 'سري للعميل'], commercial_sensitive: ['Commercial sensitive', 'حساس تجارياً'],
      missing: ['File missing', 'الملف غير مرفق'], unverified: ['File unverified', 'الملف غير متحقق'],
      staging: ['Staging', 'المسرح'], lighting: ['Lighting', 'الإضاءة'], audio_visual: ['Audio visual', 'الصوت والصورة'], scenic: ['Scenic', 'الديكور'],
      power_hvac: ['Power & HVAC', 'الكهرباء والتكييف'], rigging: ['Rigging', 'التعليق'], health_safety: ['Health & safety', 'الصحة والسلامة'], operations: ['Operations', 'العمليات'],
      drawing: ['Drawing', 'رسم'], specification: ['Specification', 'مواصفة'], method_statement: ['Method statement', 'منهجية العمل'], schedule: ['Schedule', 'جدول'], calculation: ['Calculation', 'حساب'], report: ['Report', 'تقرير'],
      total: ['Total', 'الإجمالي'], inProgress: ['In progress', 'قيد التنفيذ'], notStarted: ['Not started', 'لم يبدأ'], other: ['Other recorded states', 'حالات مسجلة أخرى'],
      in_progress: ['In progress', 'قيد التنفيذ'], not_started: ['Not started', 'لم يبدأ'], blocked: ['Blocked', 'متعثر'],
    };
    return labels[value] ? labels[value][ar ? 1 : 0] : value;
  };
  const options = (values: unknown) => Array.isArray(values) ? values.filter((value): value is string => typeof value === 'string').map(value => ({ value, label: label(value) })) : [];
  const editablePackages = packages.filter(pkg => pkg.status === 'active');
  const allowed = (next: Decision) => {
    if (next.type === 'package') return caps.canCreatePackage === true;
    if (next.type === 'task') return caps.canCreateTask === true;
    if (next.type === 'complete') return caps.canCompleteTask === true && next.task.canComplete === true;
    if (next.type === 'document' || next.type === 'revision') return caps.canRegisterDraft === true;
    if (next.type === 'report') return caps.canCreateSnapshot === true;
    return caps.canReviseSnapshot === true && next.report.canRevise === true;
  };
  const open = (next: Decision) => {
    if (!allowed(next) || loading || busy.current) return;
    setDecision(next); setDecisionError(null); setConflict(false);
    setForm({ ...blankForm(), packageId: editablePackages[0]?.id || '', discipline: options(caps.disciplines)[0]?.value || '',
      documentType: options(caps.documentTypes)[0]?.value || '', classification: options(caps.classifications)[0]?.value || '' });
  };
  const close = () => { if (!busy.current) setDecision(null); };
  const refresh = () => { if (!busy.current) { setDecision(null); setReload(value => value + 1); } };
  const update = <K extends keyof Form>(key: K, value: Form[K]) => setForm(previous => ({ ...previous, [key]: value }));
  const actionLabel = decision?.type === 'package' ? t('Create work package', 'إنشاء حزمة عمل')
    : decision?.type === 'task' ? t('Create task', 'إنشاء مهمة') : decision?.type === 'complete' ? t('Record task completion', 'تسجيل إنجاز المهمة')
      : decision?.type === 'document' ? t('Register document draft', 'تسجيل مسودة مستند') : decision?.type === 'revision' ? t('Register revision metadata', 'تسجيل بيانات مراجعة')
        : decision?.type === 'reportRevision' ? t('Capture new report version', 'حفظ إصدار جديد للتقرير') : t('Create report snapshot', 'إنشاء لقطة تقرير');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!decision || !allowed(decision) || busy.current || loading || conflict || !currentUser) return;
    const reason = form.reason.trim();
    if (!reason || reason.length > 2000) return;
    const action = decision;
    let input: Record<string, any>, target: string | null = null;
    if (action.type === 'package') input = { name: form.title.trim(), ownerId: currentUser.id, reason };
    else if (action.type === 'task') input = { packageId: form.packageId, title: form.title.trim(), ...(form.assignSelf ? { assigneeId: currentUser.id } : {}), reason };
    else if (action.type === 'complete') { target = action.task.id; input = { expectedVersion: action.task.rowVersion, reason, ...(form.evidence.trim() ? { completionEvidence: form.evidence.trim() } : {}) }; }
    else if (action.type === 'document') input = { title: form.title.trim(), discipline: form.discipline, documentType: form.documentType, confidentialityLevel: form.classification, reason };
    else if (action.type === 'revision') { target = action.document.id; input = { revisionCode: form.revisionCode.trim(), ...(form.filename.trim() ? { originalFilename: form.filename.trim() } : {}), changeSummary: form.summary.trim(), expectedVersion: action.document.rowVersion, reason }; }
    else if (action.type === 'report') input = { reportCode: form.reportCode.trim(), periodStart: form.periodStart, periodEnd: form.periodEnd, reason };
    else { target = action.report.id; input = { expectedVersion: action.report.version, reason }; }
    const fingerprint = JSON.stringify({ org: currentOrg.id, user: currentUser.id, projectId, action: action.type, target, input });
    let key = attempts.current.get(fingerprint);
    if (!key) { key = crypto.randomUUID(); attempts.current.set(fingerprint, key); }
    busy.current = true; setSubmitting(true); setDecisionError(null);
    try {
      if (action.type === 'package') await apiClient.createRecordedPackage(projectId, input as any, key);
      else if (action.type === 'task') await apiClient.createRecordedTask(projectId, input as any, key);
      else if (action.type === 'complete') await apiClient.completeRecordedTask(projectId, action.task.id, input as any, key);
      else if (action.type === 'document') await apiClient.registerDocumentDraft(projectId, input as any, key);
      else if (action.type === 'revision') await apiClient.registerDocumentRevision(projectId, action.document.id, input as any, key);
      else if (action.type === 'report') await apiClient.createReportSnapshot(projectId, input as any, key);
      else await apiClient.reviseReportSnapshot(projectId, action.report.id, input as any, key);
      if (!mounted.current) return;
      attempts.current.delete(fingerprint); setDecision(null); setForm(blankForm());
      setNotice(action.type === 'complete' ? t('Task completion was recorded. Package acceptance has not changed.', 'تم تسجيل إنجاز المهمة. لم تتغير حالة قبول الحزمة.')
        : action.type === 'document' || action.type === 'revision' ? t('Draft metadata was saved. No file has been uploaded or approved.', 'تم حفظ بيانات المسودة. لم يتم رفع ملف أو اعتماده.')
          : action.type === 'report' || action.type === 'reportRevision' ? t('The internal draft snapshot and its source references were saved.', 'تم حفظ لقطة المسودة الداخلية ومراجع مصادرها.')
            : t('The work record was saved.', 'تم حفظ سجل العمل.'));
      setReload(value => value + 1);
    } catch (cause) {
      if (!mounted.current) return;
      setDecisionError(cause instanceof Error ? cause.message : t('The result could not be confirmed. Retry the same request.', 'تعذر تأكيد النتيجة. أعد محاولة الطلب نفسه.'));
      setConflict(cause instanceof ApiError && [409, 412, 428].includes(cause.status));
    } finally { if (mounted.current) { busy.current = false; setSubmitting(false); } }
  };

  const loadDetail = async (type: 'document' | 'report', id: string) => {
    const sequence = ++detailSequence.current;
    setDetailTarget({ type, id }); setDetailLoading(true); setDetailError(null); setReportDetail(null); setRevisions([]);
    setSelectedDocument(type === 'document' ? documents.find(document => document.id === id) || null : null);
    try {
      if (type === 'document') {
        const result = await apiClient.getDocumentRevisions(projectId, id);
        if (mounted.current && sequence === detailSequence.current) setRevisions(result.data);
      } else {
        const result = await apiClient.getReportSnapshot(projectId, id);
        if (result.projectId !== projectId) throw new Error(t('Report scope could not be confirmed.', 'تعذر تأكيد نطاق التقرير.'));
        if (mounted.current && sequence === detailSequence.current) setReportDetail(result);
      }
    } catch (cause) { if (mounted.current && sequence === detailSequence.current) setDetailError(cause instanceof Error ? cause.message : t('Record detail could not be loaded.', 'تعذر تحميل تفاصيل السجل.')); }
    finally { if (mounted.current && sequence === detailSequence.current) setDetailLoading(false); }
  };

  const validForm = !!decision && !!form.reason.trim() && form.reason.trim().length <= 2000
    && (decision.type !== 'package' || form.title.trim().length >= 3)
    && (decision.type !== 'task' || (form.title.trim().length >= 3 && editablePackages.some(pkg => pkg.id === form.packageId)))
    && (decision.type !== 'document' || (!!form.title.trim() && !!form.discipline && !!form.documentType && !!form.classification))
    && (decision.type !== 'revision' || (!!form.revisionCode.trim() && !!form.summary.trim() && !/[\\/\u0000-\u001f]/.test(form.filename)))
    && (decision.type !== 'report' || (!!form.reportCode.trim() && !!form.periodStart && !!form.periodEnd && form.periodStart <= form.periodEnd));

  return <>
    <div className="records-actions"><Button variant="secondary" disabled={loading || submitting} onClick={refresh}>{t('Refresh records', 'تحديث السجلات')}</Button>
      {kind === 'work' && <><Button disabled={caps.canCreatePackage !== true || loading} onClick={() => open({ type: 'package' })}>{t('New package', 'حزمة جديدة')}</Button><Button variant="secondary" disabled={caps.canCreateTask !== true || loading || !editablePackages.length} onClick={() => open({ type: 'task' })}>{t('New task', 'مهمة جديدة')}</Button></>}
      {kind === 'documents' && <Button disabled={caps.canRegisterDraft !== true || loading} onClick={() => open({ type: 'document' })}>{t('Register draft', 'تسجيل مسودة')}</Button>}
      {kind === 'reports' && <Button disabled={caps.canCreateSnapshot !== true || loading} onClick={() => open({ type: 'report' })}>{t('Create snapshot', 'إنشاء لقطة')}</Button>}
    </div>
    {notice && <div className="records-notice" role="status">{notice}</div>}
    <div className="records-notice">{kind === 'work' ? t('Task completion is separate from output acceptance. Formal acceptance and schedule authoring are not yet available here.', 'إنجاز المهمة منفصل عن قبول المخرجات. القبول الرسمي وإنشاء الجداول الزمنية غير متاحين هنا بعد.')
      : kind === 'documents' ? t('Metadata register only. File upload, scanning, approval, download and publication are not available. Existing file references remain unverified.', 'سجل بيانات وصفية فقط. رفع الملفات وفحصها واعتمادها وتنزيلها ونشرها غير متاح. تبقى مراجع الملفات السابقة غير متحقق منها.')
        : t('Internal draft snapshots. Dates label the report period; captured project states describe the snapshot time, not period-filtered performance. No client publication or approval is implied.', 'لقطات مسودات داخلية. تحدد التواريخ فترة التقرير؛ وتصف حالات المشروع وقت اللقطة ولا تمثل أداءً مقاساً خلال الفترة. لا تعني نشر التقرير للعميل أو اعتماده.')}</div>
    {loading ? <Card><p role="status">{t('Loading recorded project data...', 'جارٍ تحميل سجلات المشروع...')}</p></Card>
      : error ? <Card><div role="alert"><h2>{t('Records could not be loaded', 'تعذر تحميل السجلات')}</h2><p>{error}</p><Button variant="secondary" onClick={refresh}>{t('Retry', 'إعادة المحاولة')}</Button></div></Card>
        : <>
          {kind === 'work' && <><div className="records-metrics"><MetricCard title={t('Visible packages', 'الحزم المتاحة')} value={packages.length}/><MetricCard title={t('Visible tasks', 'المهام المتاحة')} value={tasks.length}/><MetricCard title={t('Tasks completed', 'المهام المكتملة')} value={tasks.filter(task => task.isCompleted).length} subtitle={t('Acceptance is recorded separately', 'يُسجّل القبول بصورة مستقلة')}/></div>
            <div className="records-grid"><Card title={t('Work packages', 'حزم العمل')}>{packages.length ? packages.map(pkg => <article key={pkg.id} className="records-row"><div><h3>{pkg.name}</h3><p>{t('Owner', 'المالك')}: {pkg.ownerName || (pkg.ownerId === currentUser?.id ? currentUser?.name : pkg.ownerId)}</p><p>{t('Version', 'الإصدار')} {pkg.rowVersion}</p><Badge variant="info">{label(pkg.status)}</Badge> <Badge>{label(pkg.acceptanceState)}</Badge></div></article>) : <Empty ar={ar} title={t('No work packages recorded', 'لم تُسجّل حزم عمل')} text={t('Create a package before adding tasks.', 'أنشئ حزمة قبل إضافة المهام.')} />}</Card>
              <Card title={t('Task execution', 'تنفيذ المهام')}>{tasks.length ? tasks.map(task => <article key={task.id} className="records-row"><div><h3>{task.title}</h3><p>{packages.find(pkg => pkg.id === task.packageId)?.name || task.packageId}</p><p>{t('Assignee', 'المكلّف')}: {task.assigneeName || (task.assigneeId === currentUser?.id ? currentUser?.name : task.assigneeId || t('Unassigned', 'غير مكلّف'))} · {t('Version', 'الإصدار')} {task.rowVersion}</p><Badge variant={task.isCompleted ? 'success' : 'neutral'}>{label(task.state)}</Badge>{task.completionEvidence && <p>{t('Completion evidence', 'دليل الإنجاز')}: {task.completionEvidence}</p>}</div>{task.canComplete === true && caps.canCompleteTask === true && <Button size="sm" onClick={() => open({ type: 'complete', task })}>{t('Complete', 'تسجيل الإنجاز')}</Button>}</article>) : <Empty ar={ar} title={t('No tasks in your scope', 'لا توجد مهام في نطاقك')} text={t('Tasks are shown only within your current project and assignment access.', 'تظهر المهام ضمن صلاحيات مشروعك وتكليفاتك الحالية فقط.')} />}</Card></div></>}
          {kind === 'documents' && <><div className="records-metrics"><MetricCard title={t('Visible documents', 'المستندات المتاحة')} value={documents.length}/><MetricCard title={t('Recorded revisions', 'المراجعات المسجلة')} value={documents.reduce((sum, document) => sum + document.revisionsCount, 0)}/><MetricCard title={t('Files missing or unverified', 'ملفات غير مرفقة أو غير متحققة')} value={documents.filter(document => ['missing', 'unverified'].includes(document.fileState)).length}/></div>
            <Card title={t('Document register', 'سجل المستندات')}>{documents.length ? documents.map(document => <article key={document.id} className="records-row"><div><h3>{document.title}</h3><p>{label(document.discipline)} · {label(document.documentType)} · {label(document.confidentialityLevel)}</p><p>{document.revisionsCount} {t('revisions', 'مراجعات')} · {t('Record version', 'إصدار السجل')} {document.rowVersion}</p><Badge variant="warning">{label(document.fileState)}</Badge> <Badge>{label(document.status)}</Badge></div><div className="records-actions"><Button variant="secondary" size="sm" onClick={() => void loadDetail('document', document.id)}>{t('View revisions', 'عرض المراجعات')}</Button>{caps.canRegisterDraft === true && <Button size="sm" onClick={() => open({ type: 'revision', document })}>{t('Add revision metadata', 'إضافة بيانات مراجعة')}</Button>}</div></article>) : <Empty ar={ar} title={t('No documents recorded', 'لم تُسجّل مستندات')} text={t('Register a draft to start its metadata history.', 'سجّل مسودة لبدء تاريخ بياناتها.')} />}</Card></>}
          {kind === 'reports' && <><div className="records-metrics"><MetricCard title={t('Recorded reports', 'التقارير المسجلة')} value={reports.length}/><MetricCard title={t('Retained versions', 'الإصدارات المحفوظة')} value={reports.reduce((sum, report) => sum + report.version, 0)}/><MetricCard title={t('Publication', 'النشر')} value={t('Internal drafts', 'مسودات داخلية')} subtitle={t('Client publication unavailable', 'النشر للعميل غير متاح')}/></div>
            <Card title={t('Latest report versions', 'أحدث إصدارات التقارير')}>{reports.length ? reports.map(report => <article key={report.id} className="records-row"><div><h3>{report.reportCode} · {t('Version', 'الإصدار')} {report.version}</h3><p><bdi>{report.periodStart}</bdi> — <bdi>{report.periodEnd}</bdi></p><p>{t('Snapshot time', 'وقت اللقطة')}: {date(report.asOf)}</p><Badge>{t('Internal draft', 'مسودة داخلية')}</Badge></div><div className="records-actions"><Button variant="secondary" size="sm" onClick={() => void loadDetail('report', report.id)}>{t('Open snapshot', 'فتح اللقطة')}</Button>{caps.canReviseSnapshot === true && report.canRevise === true && <Button size="sm" onClick={() => open({ type: 'reportRevision', report })}>{t('New version', 'إصدار جديد')}</Button>}</div></article>) : <Empty ar={ar} title={t('No snapshots recorded', 'لم تُسجّل لقطات')} text={t('Capture a report to preserve current project, stage and activity records.', 'احفظ لقطة تقرير للاحتفاظ بسجلات المشروع والمراحل والأنشطة الحالية.')} />}</Card></>}
        </>}

    {detailTarget && <Card title={selectedDocument?.title || reportDetail?.reportCode || t('Record details', 'تفاصيل السجل')} action={<Button variant="ghost" size="sm" onClick={() => { detailSequence.current += 1; setDetailTarget(null); setSelectedDocument(null); setReportDetail(null); }}>{t('Close details', 'إغلاق التفاصيل')}</Button>}>
      {detailLoading ? <p role="status">{t('Loading details...', 'جارٍ تحميل التفاصيل...')}</p> : detailError ? <div role="alert"><p>{detailError}</p><Button variant="secondary" onClick={() => void loadDetail(detailTarget.type, detailTarget.id)}>{t('Retry', 'إعادة المحاولة')}</Button></div>
        : detailTarget.type === 'document' ? revisions.length ? revisions.map(revision => <article className="records-row" key={revision.id}><div><h3>{t('Revision', 'المراجعة')} {revision.revisionCode}</h3><p>{revision.changeSummary}</p><p>{t('Declared filename', 'اسم الملف المصرح به')}: {revision.originalFilename || t('Not provided', 'غير محدد')}</p><Badge variant="warning">{label(revision.fileState)}</Badge><p>{t('Metadata only; file possession and approval are not verified.', 'بيانات وصفية فقط؛ لم يتم التحقق من حيازة الملف أو اعتماده.')}</p></div></article>) : <p className="records-muted">{t('No revision metadata has been recorded.', 'لم تُسجّل بيانات مراجعات بعد.')}</p>
          : reportDetail && <div className="records-form"><div><Badge>{t('Internal draft', 'مسودة داخلية')}</Badge><p>{t('Snapshot time', 'وقت اللقطة')}: {date(reportDetail.asOf)}</p><p>{t('Reason', 'السبب')}: {reportDetail.revisionReason}</p><p className="records-code">SHA-256: <bdi>{reportDetail.contentHash}</bdi></p></div>
            <div className="records-grid"><div><h3>{reportDetail.snapshot.project.title}</h3><p>{t('Recorded maturity', 'مرحلة النضج المسجلة')}: {reportDetail.snapshot.project.maturity}</p><p>{t('Recorded outcome', 'النتيجة المسجلة')}: {reportDetail.snapshot.project.outcome}</p><p>{t('Project version', 'إصدار المشروع')}: {reportDetail.snapshot.project.rowVersion}</p></div><div><h3>{t('Recorded activities', 'الأنشطة المسجلة')}</h3>{Object.entries(reportDetail.snapshot.activityCounts).map(([key, value]) => <p key={key}>{label(key)}: <bdi>{value}</bdi></p>)}</div></div>
            <div><h3>{t('Stage records', 'سجلات المراحل')}</h3>{reportDetail.snapshot.stages.length ? reportDetail.snapshot.stages.map(stage => <article className="records-row" key={stage.id}><div style={{ width: '100%' }}><h3>{stage.stageNumber}. {stage.stageName}</h3><p>{label(stage.status)} · {stage.progressPercent}% {t('recorded progress', 'تقدم مسجل')}</p><div className="records-meter" aria-label={`${stage.stageName}: ${stage.progressPercent}%`}><span style={{ width: `${Math.max(0, Math.min(100, stage.progressPercent))}%` }}/></div></div></article>) : <p>{t('No stage records in this snapshot.', 'لا توجد سجلات مراحل في هذه اللقطة.')}</p>}</div>
            <div><h3>{t('Version history', 'تاريخ الإصدارات')}</h3>{reportDetail.history.map(version => <article className="records-row" key={version.id}><div><h3>{t('Version', 'الإصدار')} {version.version}</h3><p>{date(version.asOf)} · {version.revisionReason}</p></div><Button variant="secondary" size="sm" disabled={version.id === reportDetail.id} onClick={() => void loadDetail('report', version.id)}>{version.id === reportDetail.id ? t('Viewing', 'معروض') : t('View version', 'عرض الإصدار')}</Button></article>)}</div>
            <details><summary>{t('Source references', 'مراجع المصادر')} ({reportDetail.snapshot.sourceManifest.length})</summary>{reportDetail.snapshot.sourceManifest.map(source => <p className="records-code" key={`${source.type}:${source.id}`}>{source.type} · <bdi>{source.id}</bdi>{source.version != null ? ` · v${source.version}` : ''} · {date(source.updatedAt)}</p>)}</details>
            <div className="records-notice"><strong>{t('Snapshot limitations', 'حدود اللقطة')}</strong><ul>{reportDetail.snapshot.limitations.map(limit => <li key={limit}>{limit}</li>)}</ul></div>
          </div>}
    </Card>}

    <Modal isOpen={decision !== null} onClose={close} title={actionLabel} footer={<><Button variant="secondary" disabled={submitting} onClick={close}>{t('Close', 'إغلاق')}</Button>{conflict ? <Button onClick={refresh}>{t('Close and refresh', 'إغلاق وتحديث')}</Button> : <Button form="records-command-form" type="submit" isLoading={submitting} disabled={!validForm || loading || !decision || !allowed(decision)}>{decisionError ? t('Retry request', 'إعادة محاولة الطلب') : actionLabel}</Button>}</>}>
      <form id="records-command-form" className="records-form" onSubmit={event => void submit(event)}>
        {decisionError && <div className="records-notice" role="alert">{decisionError}{conflict && <p>{t('Close this decision and refresh the current record before deciding again.', 'أغلق هذا القرار وحدّث السجل الحالي قبل اتخاذ قرار جديد.')}</p>}</div>}
        <fieldset disabled={submitting || conflict} style={{ border: 0, margin: 0, padding: 0, minWidth: 0, display: 'grid', gap: 12 }}>
          {(decision?.type === 'package' || decision?.type === 'task' || decision?.type === 'document') && <Input id="records-title" label={t('Title', 'العنوان')} required minLength={decision.type === 'document' ? 1 : 3} maxLength={decision.type === 'document' ? 300 : decision.type === 'package' ? 200 : 250} value={form.title} onChange={event => update('title', event.target.value)} />}
          {decision?.type === 'package' && <p className="records-muted">{t('Package owner', 'مالك الحزمة')}: {currentUser?.name}. {t('Your current project access is checked when saved.', 'تُراجع صلاحية وصولك الحالية للمشروع عند الحفظ.')}</p>}
          {decision?.type === 'task' && <><Select id="records-package" label={t('Work package', 'حزمة العمل')} required value={form.packageId} onChange={event => update('packageId', event.target.value)} options={editablePackages.map(pkg => ({ value: pkg.id, label: pkg.name }))}/><label><input type="checkbox" checked={form.assignSelf} onChange={event => update('assignSelf', event.target.checked)}/> {t('Assign this task to me', 'إسناد المهمة إليّ')}</label><p className="records-muted">{t('Leave unchecked to record the task as unassigned.', 'اترك الخيار غير محدد لتسجيل المهمة دون مكلّف.')}</p></>}
          {decision?.type === 'complete' && <><p><strong>{decision.task.title}</strong> · {t('Record version', 'إصدار السجل')} {decision.task.rowVersion}</p><Textarea id="records-evidence" label={t('Completion evidence or reference (optional)', 'دليل الإنجاز أو مرجعه (اختياري)')} maxLength={4000} value={form.evidence} onChange={event => update('evidence', event.target.value)}/><p className="records-muted">{t('Completion will not accept the package or authorize its output for use.', 'لن يؤدي الإنجاز إلى قبول الحزمة أو التصريح باستخدام مخرجاتها.')}</p></>}
          {decision?.type === 'document' && <><div className="records-form-pair"><Select id="records-discipline" label={t('Discipline', 'التخصص')} value={form.discipline} onChange={event => update('discipline', event.target.value)} options={options(caps.disciplines)} required/><Select id="records-document-type" label={t('Document type', 'نوع المستند')} value={form.documentType} onChange={event => update('documentType', event.target.value)} options={options(caps.documentTypes)} required/></div><Select id="records-classification" label={t('Classification', 'التصنيف')} value={form.classification} onChange={event => update('classification', event.target.value)} options={options(caps.classifications)} required/></>}
          {decision?.type === 'revision' && <><p><strong>{decision.document.title}</strong> · {t('Record version', 'إصدار السجل')} {decision.document.rowVersion}</p><Input id="records-revision-code" label={t('Revision code', 'رمز المراجعة')} required maxLength={60} value={form.revisionCode} onChange={event => update('revisionCode', event.target.value)}/><Input id="records-filename" label={t('Declared filename (optional)', 'اسم الملف المصرح به (اختياري)')} maxLength={255} hint={t('A filename only. This does not upload a file.', 'اسم ملف فقط. لا يؤدي ذلك إلى رفع الملف.')} value={form.filename} onChange={event => update('filename', event.target.value)}/><Textarea id="records-change-summary" label={t('Change summary', 'ملخص التغيير')} required maxLength={2000} value={form.summary} onChange={event => update('summary', event.target.value)}/></>}
          {(decision?.type === 'document' || decision?.type === 'revision') && <p className="records-muted">{t('The record will remain a metadata draft with no verified file, scan, approval or publication.', 'سيبقى السجل مسودة بيانات وصفية دون ملف متحقق أو فحص أو اعتماد أو نشر.')}</p>}
          {decision?.type === 'report' && <><Input id="records-report-code" label={t('Report code', 'رمز التقرير')} required maxLength={80} value={form.reportCode} onChange={event => update('reportCode', event.target.value)}/><div className="records-form-pair"><Input id="records-period-start" type="date" min="1900-01-01" label={t('Period start', 'بداية الفترة')} required value={form.periodStart} onChange={event => update('periodStart', event.target.value)}/><Input id="records-period-end" type="date" min={form.periodStart || '1900-01-01'} label={t('Period end', 'نهاية الفترة')} required value={form.periodEnd} onChange={event => update('periodEnd', event.target.value)}/></div></>}
          {decision?.type === 'reportRevision' && <p><strong>{decision.report.reportCode}</strong> · {t('Current version', 'الإصدار الحالي')} {decision.report.version}. {t('A new snapshot will preserve this version and capture the current project records.', 'ستحفظ اللقطة الجديدة هذا الإصدار وتلتقط سجلات المشروع الحالية.')}</p>}
          {(decision?.type === 'report' || decision?.type === 'reportRevision') && <p className="records-muted">{t('The server captures current project, stage and activity records. Financial or performance figures are not inferred.', 'يلتقط الخادم سجلات المشروع والمراحل والأنشطة الحالية. لا يتم استنتاج أرقام مالية أو مؤشرات أداء.')}</p>}
          <Textarea id="records-command-reason" label={t('Reason for this record', 'سبب تسجيل هذا الإجراء')} required maxLength={2000} value={form.reason} onChange={event => update('reason', event.target.value)}/>
        </fieldset>
      </form>
    </Modal>
  </>;
}

function Empty({ title, text, ar }: { title: string; text: string; ar: boolean }) {
  return <div className="records-empty" role="status" dir={ar ? 'rtl' : 'ltr'}><div className="records-orb" aria-hidden="true">◇</div><h2>{title}</h2><p>{text}</p></div>;
}

