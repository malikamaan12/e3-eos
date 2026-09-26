import React, { useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, Input, MetricCard, Modal, Select, Textarea } from '../components/DesignSystem.js';
import { useEosContext } from '../context/EosContext.js';
import { ApiError } from '../services/api-client.js';
import type { IntakeRequirement } from '../services/project-control.js';
import type { AllocationRecord, DesignBrief, DesignBriefInput, DesignBriefRevision } from '../services/project-planning.js';
import './ProjectRecords.css';

type Form = { title: string; brief: string; discipline: string; materials: string; dimensions: string; locationZone: string;
  owner: '' | 'self' | 'keep'; requirements: string[]; allocations: string[]; reason: string };
type Decision = { type: 'create' } | { type: 'revise'; row: DesignBrief };
const empty = (): Form => ({ title: '', brief: '', discipline: '', materials: '', dimensions: '', locationZone: '', owner: '', requirements: [], allocations: [], reason: '' });
const optional = (value: string) => value.trim() || null;

export const DesignBriefRegister: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { apiClient, currentOrg, currentUser, currentLanguage, refreshTrigger } = useEosContext();
  const ar = currentLanguage === 'ar', t = (en: string, arabic: string) => ar ? arabic : en;
  const scope = `${currentOrg.id}:${currentUser?.id || ''}:${projectId}`, scopeRef = useRef(scope); scopeRef.current = scope;
  const mounted = useRef(true), busy = useRef(false), attempts = useRef(new Map<string, string>()), historySequence = useRef(0);
  const [rows, setRows] = useState<DesignBrief[]>([]), [requirements, setRequirements] = useState<IntakeRequirement[]>([]), [allocations, setAllocations] = useState<AllocationRecord[]>([]);
  const [caps, setCaps] = useState<Record<string, any>>({}), [loading, setLoading] = useState(true), [error, setError] = useState<string | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null), [truncated, setTruncated] = useState(false), [sourceTruncated, setSourceTruncated] = useState(false);
  const [reload, setReload] = useState(0), [search, setSearch] = useState(''), [notice, setNotice] = useState<string | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null), [form, setForm] = useState<Form>(empty);
  const [submitting, setSubmitting] = useState(false), [decisionError, setDecisionError] = useState<string | null>(null), [conflict, setConflict] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<DesignBrief | null>(null), [history, setHistory] = useState<DesignBriefRevision[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false), [historyError, setHistoryError] = useState<string | null>(null), [historyTruncated, setHistoryTruncated] = useState(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; historySequence.current += 1; }; }, []);
  useEffect(() => { setDecision(null); setForm(empty()); setNotice(null); setDecisionError(null); setConflict(false); setSubmitting(false); busy.current = false; attempts.current.clear(); setSearch(''); }, [scope]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(null); setSourceError(null); setRows([]); setRequirements([]); setAllocations([]); setCaps({});
    setHistoryTarget(null); setHistory([]); setHistoryError(null); setHistoryLoading(false); historySequence.current += 1;
    const load = async () => {
      const [designResult, requirementResult, allocationResult] = await Promise.allSettled([
        apiClient.getDesignBriefs(projectId), apiClient.getIntakeRequirements(projectId), apiClient.getAllocations(projectId),
      ]);
      if (!active) return;
      if (designResult.status === 'fulfilled') {
        setRows(designResult.value.data); setCaps(designResult.value.meta?.capabilities || {}); setTruncated(designResult.value.meta?.truncated === true);
      } else setError(designResult.reason instanceof Error ? designResult.reason.message : t('Design briefs could not be loaded.', 'تعذر تحميل موجزات التصميم.'));
      if (requirementResult.status === 'fulfilled' && allocationResult.status === 'fulfilled') {
        setRequirements(requirementResult.value.data); setAllocations(allocationResult.value.data);
        setSourceTruncated(requirementResult.value.meta?.truncated === true || allocationResult.value.meta?.truncated === true);
      } else setSourceError(t('Source selections could not be loaded. Refresh before recording a brief.', 'تعذر تحميل مصادر الاختيار. حدّث قبل تسجيل موجز.'));
      setLoading(false);
    };
    void load(); return () => { active = false; };
  }, [apiClient, scope, projectId, refreshTrigger, reload]);
  const availableRequirements = requirements.filter(row => row.provenanceState === 'manually_recorded' && row.status === 'draft' && !row.isApproved);
  const availableAllocations = allocations.filter(row => row.provenanceState === 'manually_recorded' && row.status === 'draft' && !row.staleSource && form.requirements.includes(row.requirementId));
  const canDecide = (next: Decision) => caps.canCreateDraft === true && (next.type === 'create' || (caps.canReviseDraft === true && next.row.canRevise));
  const update = <K extends keyof Form>(key: K, value: Form[K]) => setForm(previous => ({ ...previous, [key]: value }));
  const open = (next: Decision) => {
    if (busy.current || loading || sourceError || !canDecide(next)) return;
    setDecision(next); setDecisionError(null); setConflict(false);
    if (next.type === 'create') setForm(empty());
    else {
      const row = next.row;
      setForm({ title: row.title, brief: row.brief, discipline: row.discipline || '', materials: row.materials || '', dimensions: row.dimensions || '',
        locationZone: row.locationZone || '', owner: row.ownerId ? row.ownerId === currentUser?.id ? 'self' : 'keep' : '',
        requirements: row.requirementRefs.map(ref => ref.requirementId), allocations: (row.allocationRefs || []).map(ref => ref.allocationId), reason: '' });
    }
  };
  const close = () => { if (!busy.current) setDecision(null); };
  const refresh = () => { if (!busy.current) { setDecision(null); setReload(value => value + 1); } };
  const toggleRequirement = (requirementId: string, checked: boolean) => setForm(previous => ({ ...previous,
    requirements: checked ? [...previous.requirements, requirementId] : previous.requirements.filter(value => value !== requirementId),
    allocations: checked ? previous.allocations : previous.allocations.filter(value => allocations.find(row => row.id === value)?.requirementId !== requirementId),
  }));
  const missingRequirements = form.requirements.filter(value => !availableRequirements.some(row => row.id === value));
  const missingAllocations = form.allocations.filter(value => !availableAllocations.some(row => row.id === value));
  const valid = !!form.title.trim() && !!form.brief.trim() && !!form.reason.trim() && form.requirements.length > 0 && form.requirements.length <= 100
    && form.allocations.length <= 100 && !missingRequirements.length && !missingAllocations.length && !sourceError;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!decision || !currentUser || !valid || loading || conflict || busy.current || !canDecide(decision)) return;
    const action = decision, requestScope = scope;
    const input: DesignBriefInput = { title: form.title.trim(), brief: form.brief.trim(), discipline: optional(form.discipline), materials: optional(form.materials),
      dimensions: optional(form.dimensions), locationZone: optional(form.locationZone), ownerId: form.owner === 'self' ? currentUser.id : form.owner === 'keep' && action.type === 'revise' ? action.row.ownerId || null : null,
      requirementRefs: form.requirements.map(requirementId => ({ requirementId, expectedVersion: requirements.find(row => row.id === requirementId)!.rowVersion })).sort((a,b) => a.requirementId.localeCompare(b.requirementId)),
      allocationRefs: form.allocations.map(allocationId => ({ allocationId, expectedVersion: allocations.find(row => row.id === allocationId)!.rowVersion })).sort((a,b) => a.allocationId.localeCompare(b.allocationId)), reason: form.reason.trim() };
    const payload = action.type === 'revise' ? { ...input, expectedVersion: action.row.rowVersion } : input;
    const fingerprint = JSON.stringify({ scope: requestScope, action: action.type, target: action.type === 'revise' ? action.row.id : null, payload });
    let key = attempts.current.get(fingerprint); if (!key) { key = crypto.randomUUID(); attempts.current.set(fingerprint, key); }
    busy.current = true; setSubmitting(true); setDecisionError(null);
    try {
      if (action.type === 'create') await apiClient.createDesignBrief(projectId, input, key);
      else await apiClient.reviseDesignBrief(projectId, action.row.id, { ...input, expectedVersion: action.row.rowVersion }, key);
      if (!mounted.current || scopeRef.current !== requestScope) return;
      attempts.current.delete(fingerprint); setDecision(null); setForm(empty()); setReload(value => value + 1);
      setNotice(t('The brief and exact source versions were recorded. Earlier revisions remain available; no approval or production release was created.', 'تم تسجيل الموجز وإصدارات مصادره المحددة. تبقى المراجعات السابقة متاحة؛ ولم يُنشأ اعتماد أو إصدار للإنتاج.'));
    } catch (cause) {
      if (!mounted.current || scopeRef.current !== requestScope) return;
      setDecisionError(cause instanceof Error ? cause.message : t('The result could not be confirmed. Retry the same request.', 'تعذر تأكيد النتيجة. أعد محاولة الطلب نفسه.'));
      setConflict(cause instanceof ApiError && [409, 412, 428].includes(cause.status));
    } finally { if (mounted.current && scopeRef.current === requestScope) { busy.current = false; setSubmitting(false); } }
  };
  const viewHistory = async (row: DesignBrief) => {
    const requestScope = scope, sequence = ++historySequence.current;
    setHistoryTarget(row); setHistory([]); setHistoryLoading(true); setHistoryError(null); setHistoryTruncated(false);
    try {
      const result = await apiClient.getDesignBriefRevisions(projectId, row.id);
      if (mounted.current && scopeRef.current === requestScope && sequence === historySequence.current) { setHistory(result.data); setHistoryTruncated(result.meta?.truncated === true); }
    } catch (cause) { if (mounted.current && scopeRef.current === requestScope && sequence === historySequence.current) setHistoryError(cause instanceof Error ? cause.message : t('History could not be loaded.', 'تعذر تحميل التاريخ.')); }
    finally { if (mounted.current && scopeRef.current === requestScope && sequence === historySequence.current) setHistoryLoading(false); }
  };
  const displayDate = (value: string) => new Date(value).toLocaleString(ar ? 'ar-QA' : 'en-GB');
  const visible = rows.filter(row => `${row.title} ${row.discipline || ''} ${row.brief || ''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <section className="records-page" dir={ar ? 'rtl' : 'ltr'} aria-label={t('Design brief register', 'سجل موجزات التصميم')}>
    <div className="records-heading"><div><span className="records-eyebrow">{t('DESIGN DEVELOPMENT', 'تطوير التصميم')}</span><h2>{t('Design briefs & revisions', 'موجزات التصميم ومراجعاتها')}</h2><p>{t('Connect the creative brief to exact requirement and allocation versions.', 'اربط الموجز الإبداعي بإصدارات محددة للمتطلبات والتوزيعات.')}</p></div><div className="records-actions"><Button variant="secondary" disabled={loading || submitting} onClick={refresh}>{t('Refresh', 'تحديث')}</Button><Button disabled={loading || !!sourceError || !caps.canCreateDraft} onClick={() => open({ type: 'create' })}>{t('New design brief', 'موجز تصميم جديد')}</Button></div></div>
    <div className="records-notice">{t('This register records draft metadata. Design files are still missing. Dimensions and materials are unverified notes; a saved brief is not technical acceptance, client approval or permission to fabricate.', 'يسجل هذا السجل بيانات وصفية لمسودات. ملفات التصميم لا تزال مفقودة. الأبعاد والمواد ملاحظات غير متحقق منها؛ وحفظ الموجز ليس قبولاً تقنياً أو اعتماد عميل أو إذناً بالتصنيع.')}</div>
    {notice && <div className="records-notice" role="status">{notice}</div>}
    {loading ? <Card><p role="status">{t('Loading design briefs and source versions...', 'جارٍ تحميل موجزات التصميم وإصدارات المصادر...')}</p></Card>
      : error ? <Card><div role="alert"><h3>{t('Design briefs could not be loaded', 'تعذر تحميل موجزات التصميم')}</h3><p>{error}</p><Button variant="secondary" onClick={refresh}>{t('Retry', 'إعادة المحاولة')}</Button></div></Card>
        : <>{sourceError && <div className="records-notice" role="alert">{sourceError}</div>}<div className="records-metrics"><MetricCard title={t('Visible briefs', 'الموجزات المتاحة')} value={rows.length}/><MetricCard title={t('Sources changed', 'تغيرت المصادر')} value={rows.filter(row => row.provenanceState === 'manually_recorded' && row.sourceStale).length}/><MetricCard title={t('Files missing', 'الملفات المفقودة')} value={rows.filter(row => row.fileStatus === 'missing').length}/></div>
          {truncated && <p className="records-notice">{t('Showing the latest 200 briefs. Counts describe this set.', 'تظهر أحدث 200 موجز. تصف الأعداد هذه المجموعة.')}</p>}
          <Input id="design-brief-search" label={t('Find a brief or discipline', 'البحث عن موجز أو تخصص')} value={search} onChange={event => setSearch(event.target.value)}/>
          <Card title={t('Design register', 'سجل التصميم')}>{visible.length ? visible.map(row => <article key={row.id} className="records-row"><div><h3>{row.title}</h3><p>{row.discipline || t('Discipline unknown', 'التخصص غير معروف')} · {t('Revision', 'المراجعة')} {row.currentRevision} · {t('Record version', 'إصدار السجل')} {row.rowVersion}</p><Badge variant={row.provenanceState === 'legacy_unverified' ? 'warning' : 'info'}>{row.provenanceState === 'legacy_unverified' ? t('Legacy · unverified', 'سابق · غير متحقق') : t('Unapproved draft', 'مسودة غير معتمدة')}</Badge> <Badge variant="warning">{t('File missing', 'الملف مفقود')}</Badge>{row.sourceStale && row.provenanceState === 'manually_recorded' && <> <Badge variant="warning">{t('Source review needed', 'تلزم مراجعة المصدر')}</Badge></>}<p>{row.requirements.length} {t('requirements', 'متطلبات')} · {row.allocations.length} {t('allocations', 'توزيعات')}</p><p>{t('Owner', 'المالك')}: {row.ownerId === currentUser?.id ? currentUser?.name : row.ownerId || t('Unknown', 'غير معروف')}</p></div><div className="records-actions"><Button size="sm" variant="secondary" onClick={() => void viewHistory(row)}>{t('Brief & history', 'الموجز والتاريخ')}</Button>{row.canRevise && caps.canReviseDraft && <Button size="sm" disabled={!!sourceError} onClick={() => open({ type: 'revise', row })}>{t('New revision', 'مراجعة جديدة')}</Button>}</div></article>) : <div className="records-empty"><div className="records-orb" aria-hidden="true">◇</div><h3>{search ? t('No matching briefs', 'لا توجد موجزات مطابقة') : t('No design briefs recorded', 'لم تُسجّل موجزات تصميم')}</h3><p>{t('Select requirement versions to start a design brief.', 'اختر إصدارات المتطلبات لبدء موجز تصميم.')}</p></div>}</Card></>}
    {historyTarget && <Card title={historyTarget.title} action={<Button size="sm" variant="ghost" onClick={() => { historySequence.current += 1; setHistoryTarget(null); }}>{t('Close history', 'إغلاق التاريخ')}</Button>}>
      <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{historyTarget.brief || t('No brief recorded', 'لم يُسجّل موجز')}</p>
      {historyLoading ? <p role="status">{t('Loading retained revisions...', 'جارٍ تحميل المراجعات المحفوظة...')}</p> : historyError ? <div role="alert"><p>{historyError}</p><Button variant="secondary" onClick={() => void viewHistory(historyTarget)}>{t('Retry', 'إعادة المحاولة')}</Button></div> : <>
        {historyTruncated && <p>{t('Showing the latest 500 revisions.', 'تظهر أحدث 500 مراجعة.')}</p>}{!history.length && <p>{t('No controlled snapshot exists for this legacy record.', 'لا توجد لقطة مضبوطة لهذا السجل السابق.')}</p>}
        {history.map(revision => <details className="records-row" style={{ display: 'block' }} key={revision.id}><summary>{t('Revision', 'المراجعة')} {revision.revisionNumber} · {displayDate(revision.createdAt)}</summary><p>{t('Reason', 'السبب')}: {revision.reason}</p><p className="records-code">{t('Recorded by', 'سجّله')}: <bdi>{revision.authorId}</bdi></p><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{revision.snapshot?.brief}</p><div className="records-form-pair"><p>{t('Materials', 'المواد')}: {revision.snapshot?.materials || t('Unknown', 'غير معروفة')}</p><p>{t('Dimensions', 'الأبعاد')}: {revision.snapshot?.dimensions || t('Unknown', 'غير معروفة')}</p></div><h4>{t('Pinned source versions', 'إصدارات المصادر المرتبطة')}</h4>{(revision.snapshot?.requirements || []).map((pin: any) => <p className="records-code" key={pin.requirementId}>{t('Requirement', 'المتطلب')} <bdi>{pin.requirementId}</bdi> · v{pin.requirementVersion} · <bdi>{pin.requirementRevisionId}</bdi></p>)}{(revision.snapshot?.allocations || []).map((pin: any) => <p className="records-code" key={pin.allocationId}>{t('Allocation', 'التوزيع')} <bdi>{pin.allocationId}</bdi> · v{pin.allocationVersion} · <bdi>{pin.allocationRevisionId}</bdi></p>)}<p className="records-code">SHA-256: <bdi>{revision.snapshotHash}</bdi></p><p className="records-muted">{revision.snapshotIntegrityVerified ? t('Metadata snapshot integrity verified. This is not a file checksum or source verification.', 'تم التحقق من سلامة لقطة البيانات الوصفية. ليست بصمة ملف أو تحققاً من المصدر.') : t('Snapshot integrity is not confirmed.', 'لم تُؤكد سلامة اللقطة.')} {t('File missing · Not approved · Not released for production', 'الملف مفقود · غير معتمد · غير صادر للإنتاج')}</p></details>)}</>}
    </Card>}
    <Modal isOpen={decision !== null} onClose={close} title={decision?.type === 'revise' ? t('Review a new brief revision', 'مراجعة إصدار جديد للموجز') : t('Record a design brief', 'تسجيل موجز تصميم')} size="lg" footer={<><Button variant="secondary" disabled={submitting} onClick={close}>{t('Close', 'إغلاق')}</Button>{conflict ? <Button onClick={refresh}>{t('Close and refresh', 'إغلاق وتحديث')}</Button> : <Button type="submit" form="design-brief-form" isLoading={submitting} disabled={!valid || loading || !decision || !canDecide(decision)}>{decisionError ? t('Retry same request', 'إعادة محاولة الطلب نفسه') : t('Record draft revision', 'تسجيل مراجعة مسودة')}</Button>}</>}>
      <form id="design-brief-form" className="records-form" onSubmit={event => void submit(event)}>
        {decisionError && <div className="records-notice" role="alert">{decisionError}</div>}
        {decision?.type === 'revise' && <div className="records-notice">{t('Review the full brief and every selected source. Saving pins the current versions shown below. Earlier pins and wording remain in history. Blank optional fields become unknown.', 'راجع الموجز كاملاً وكل مصدر مختار. يربط الحفظ الإصدارات الحالية المعروضة أدناه. تبقى الروابط والنصوص السابقة في التاريخ. تصبح الحقول الاختيارية الفارغة غير معروفة.')} <strong>{t('Current brief version', 'إصدار الموجز الحالي')}: {decision.row.rowVersion}</strong></div>}
        <fieldset disabled={submitting || conflict} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: 'grid', gap: 14 }}>
          <Input id="design-title" label={t('Design brief title', 'عنوان موجز التصميم')} required maxLength={300} value={form.title} onChange={event => update('title', event.target.value)}/>
          <Textarea id="design-brief" label={t('Brief', 'الموجز')} required rows={5} maxLength={16000} value={form.brief} onChange={event => update('brief', event.target.value)}/>
          <div className="records-form-pair"><Input id="design-discipline" label={t('Discipline (optional)', 'التخصص (اختياري)')} maxLength={120} value={form.discipline} onChange={event => update('discipline', event.target.value)}/><Input id="design-zone" label={t('Location or zone (optional)', 'الموقع أو المنطقة (اختياري)')} maxLength={250} value={form.locationZone} onChange={event => update('locationZone', event.target.value)}/></div>
          <div className="records-grid"><Textarea id="design-materials" label={t('Materials notes (optional)', 'ملاحظات المواد (اختياري)')} maxLength={8000} value={form.materials} onChange={event => update('materials', event.target.value)}/><Textarea id="design-dimensions" label={t('Dimensions notes (optional)', 'ملاحظات الأبعاد (اختياري)')} maxLength={2000} value={form.dimensions} onChange={event => update('dimensions', event.target.value)}/></div>
          <Select id="design-owner" label={t('Owner (optional)', 'المالك (اختياري)')} value={form.owner} onChange={event => update('owner', event.target.value as Form['owner'])} options={[{ value: '', label: t('Unknown / not assigned', 'غير معروف / غير مسند') }, { value: 'self', label: t('Assign to me', 'إسناد إليّ') }, ...(decision?.type === 'revise' && decision.row.ownerId && decision.row.ownerId !== currentUser?.id ? [{ value: 'keep', label: t('Keep current owner', 'الاحتفاظ بالمالك الحالي') }] : [])]}/>
          <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 12, padding: 12 }}><legend>{t('Requirements · select current versions', 'المتطلبات · اختر الإصدارات الحالية')}</legend>{!availableRequirements.length && <p>{t('Record an unapproved requirement draft first.', 'سجّل أولاً مسودة متطلب غير معتمدة.')}</p>}{availableRequirements.map(row => <label key={row.id} className="records-row" style={{ justifyContent: 'flex-start', gap: 10 }}><input type="checkbox" checked={form.requirements.includes(row.id)} onChange={event => toggleRequirement(row.id, event.target.checked)}/><span>{row.title} · v{row.rowVersion}{decision?.type === 'revise' && decision.row.requirementRefs.find(ref => ref.requirementId === row.id)?.expectedVersion !== undefined && <small> · {t('Previously pinned', 'ارتبط سابقاً')} v{decision.row.requirementRefs.find(ref => ref.requirementId === row.id)?.expectedVersion}</small>}</span></label>)}{missingRequirements.map(value => <div key={value} className="records-notice"><p>{t('Previously linked requirement is unavailable for selection.', 'المتطلب المرتبط سابقاً غير متاح للاختيار.')} <bdi>{value}</bdi></p><Button size="sm" variant="secondary" onClick={() => toggleRequirement(value, false)}>{t('Remove from this revision', 'إزالة من هذه المراجعة')}</Button></div>)}</fieldset>
          <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 12, padding: 12 }}><legend>{t('Allocations (optional) · current planning versions', 'التوزيعات (اختياري) · إصدارات التخطيط الحالية')}</legend>{!availableAllocations.length && <p>{t('No current allocations for the selected requirements.', 'لا توجد توزيعات حالية للمتطلبات المحددة.')}</p>}{availableAllocations.map(row => <label key={row.id} className="records-row" style={{ justifyContent: 'flex-start', gap: 10 }}><input type="checkbox" checked={form.allocations.includes(row.id)} onChange={event => update('allocations', event.target.checked ? [...form.allocations, row.id] : form.allocations.filter(value => value !== row.id))}/><span>{row.requirementTitle} · {row.location || t('Location unknown', 'الموقع غير معروف')} · {row.zone || t('Zone unknown', 'المنطقة غير معروفة')} · v{row.rowVersion}</span></label>)}{missingAllocations.map(value => <div key={value} className="records-notice"><p>{t('Previously linked allocation is stale or unavailable. Review its sources, or explicitly remove it from this revision.', 'التوزيع المرتبط سابقاً قديم أو غير متاح. راجع مصادره أو أزله صراحة من هذه المراجعة.')} <bdi>{value}</bdi></p><Button size="sm" variant="secondary" onClick={() => update('allocations', form.allocations.filter(item => item !== value))}>{t('Remove from this revision', 'إزالة من هذه المراجعة')}</Button></div>)}</fieldset>
          {sourceTruncated && <p className="records-notice">{t('The source register is truncated. Only loaded sources can be selected; unseen prior links are not silently removed.', 'سجل المصادر محدود. يمكن اختيار المصادر المحملة فقط؛ ولا تُحذف الروابط السابقة غير المعروضة تلقائياً.')}</p>}
          <Textarea id="design-reason" label={t('Reason for this draft revision', 'سبب مراجعة المسودة')} required maxLength={2000} value={form.reason} onChange={event => update('reason', event.target.value)}/>
        </fieldset>
      </form>
    </Modal>
  </section>;
};
