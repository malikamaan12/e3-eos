import React, { useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, Input, MetricCard, Modal, Select, Textarea } from '../components/DesignSystem.js';
import { useEosContext } from '../context/EosContext.js';
import { ApiError } from '../services/api-client.js';
import type { IntakeRequirement, IntakeRevision, RequirementInput } from '../services/project-control.js';
import './ProjectRecords.css';

type Decision = { type: 'create' } | { type: 'revise'; requirement: IntakeRequirement };
type RevisionView = Omit<IntakeRevision, 'snapshot' | 'snapshotHash'> & {
  snapshot: Omit<RequirementInput, 'reason'> | null; snapshotHash: string | null;
};
type DraftForm = { title: string; originalWording: string; interpretation: string; sourceType: string; sourceReference: string;
  category: string; quantity: string; unit: string; locationZone: string; acceptanceCriteria: string; owner: '' | 'self' | 'keep'; reason: string };
const emptyForm = (): DraftForm => ({ title: '', originalWording: '', interpretation: '', sourceType: '', sourceReference: '',
  category: '', quantity: '', unit: '', locationZone: '', acceptanceCriteria: '', owner: '', reason: '' });
const optional = (value: string) => value.trim() || null;

export const RequirementIntakeRegister: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { apiClient, currentOrg, currentUser, currentLanguage, refreshTrigger } = useEosContext();
  const ar = currentLanguage === 'ar';
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const scope = `${currentOrg.id}:${currentUser?.id || ''}:${projectId}`;
  const scopeRef = useRef(scope); scopeRef.current = scope;
  const mounted = useRef(true);
  const attempts = useRef(new Map<string, string>());
  const busy = useRef(false);
  const historySequence = useRef(0);
  const [rows, setRows] = useState<IntakeRequirement[]>([]);
  const [caps, setCaps] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [form, setForm] = useState<DraftForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<IntakeRequirement | null>(null);
  const [history, setHistory] = useState<RevisionView[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyTruncated, setHistoryTruncated] = useState(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; historySequence.current += 1; }; }, []);
  useEffect(() => {
    setDecision(null); setForm(emptyForm()); setNotice(null); setDecisionError(null); setConflict(false);
    setSubmitting(false); busy.current = false; attempts.current.clear(); setSearch('');
  }, [scope]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(null); setRows([]); setCaps({}); setHistoryTarget(null); setHistory([]);
    setHistoryLoading(false); setHistoryError(null); historySequence.current += 1;
    apiClient.getIntakeRequirements(projectId).then(result => {
      if (!Array.isArray(result.data)) throw new Error(t('The requirement response is incomplete.', 'استجابة المتطلبات غير مكتملة.'));
      if (active) { setRows(result.data); setCaps(result.meta?.capabilities || {}); setTruncated(result.meta?.truncated === true); }
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : t('Requirements could not be loaded.', 'تعذر تحميل المتطلبات.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [apiClient, scope, projectId, refreshTrigger, reload]);

  const sourceLabel = (value?: string | null) => value === 'manual' ? t('Manual note', 'ملاحظة يدوية')
    : value === 'client_note' ? t('Client note', 'ملاحظة عميل') : value === 'source_reference' ? t('Source reference', 'مرجع مصدر') : value || t('Source unknown', 'المصدر غير معروف');
  const sourceTypes: string[] = Array.isArray(caps.sourceTypes) ? caps.sourceTypes.filter((value: unknown): value is string => typeof value === 'string') : [];
  const canDecide = (next: Decision) => next.type === 'create' ? caps.canCreateDraft === true : caps.canReviseDraft === true && next.requirement.canRevise === true;
  const date = (value: string) => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString(ar ? 'ar-QA' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : t('Not recorded', 'غير مسجل');
  const open = (next: Decision) => {
    if (busy.current || loading || !canDecide(next)) return;
    setDecision(next); setDecisionError(null); setConflict(false);
    if (next.type === 'create') setForm({ ...emptyForm(), sourceType: sourceTypes[0] || '' });
    else {
      const row = next.requirement;
      setForm({ title: row.title, originalWording: row.originalWording || '', interpretation: row.interpretation || '', sourceType: row.sourceType,
        sourceReference: row.sourceReference || '', category: row.category || '', quantity: row.quantity ?? '', unit: row.unit || '',
        locationZone: row.locationZone || '', acceptanceCriteria: row.acceptanceCriteria || '',
        owner: row.ownerId ? row.ownerId === currentUser?.id ? 'self' : 'keep' : '', reason: '' });
    }
  };
  const close = () => { if (!busy.current) setDecision(null); };
  const refresh = () => { if (!busy.current) { setDecision(null); setReload(value => value + 1); } };
  const update = <K extends keyof DraftForm>(key: K, value: DraftForm[K]) => setForm(previous => ({ ...previous, [key]: value }));
  const viewHistory = async (row: IntakeRequirement) => {
    const requestScope = scope, sequence = ++historySequence.current;
    setHistoryTarget(row); setHistory([]); setHistoryLoading(true); setHistoryError(null); setHistoryTruncated(false);
    try {
      const result = await apiClient.getIntakeRevisions(projectId, row.id);
      if (!Array.isArray(result.data)) throw new Error(t('Revision history response is incomplete.', 'استجابة تاريخ المراجعات غير مكتملة.'));
      if (mounted.current && scopeRef.current === requestScope && sequence === historySequence.current) { setHistory(result.data); setHistoryTruncated(result.meta?.truncated === true); }
    } catch (cause) {
      if (mounted.current && scopeRef.current === requestScope && sequence === historySequence.current) setHistoryError(cause instanceof Error ? cause.message : t('Revision history could not be loaded.', 'تعذر تحميل تاريخ المراجعات.'));
    } finally { if (mounted.current && scopeRef.current === requestScope && sequence === historySequence.current) setHistoryLoading(false); }
  };

  const validQuantity = form.quantity.trim() === '' || /^(?:0|[1-9][0-9]{0,17})(?:\.[0-9]{1,6})?$/.test(form.quantity.trim());
  const valid = !!form.title.trim() && !!form.originalWording.trim() && !!form.reason.trim()
    && sourceTypes.includes(form.sourceType) && validQuantity && form.reason.length <= 2000;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!decision || !currentUser || !valid || !canDecide(decision) || loading || conflict || busy.current) return;
    const action = decision, requestScope = scope;
    const input: RequirementInput = { title: form.title.trim(), originalWording: form.originalWording,
      interpretation: optional(form.interpretation), sourceType: form.sourceType as RequirementInput['sourceType'], sourceReference: optional(form.sourceReference),
      category: optional(form.category), quantity: optional(form.quantity), unit: optional(form.unit), locationZone: optional(form.locationZone),
      acceptanceCriteria: optional(form.acceptanceCriteria), ownerId: form.owner === 'self' ? currentUser.id
        : form.owner === 'keep' && action.type === 'revise' ? action.requirement.ownerId || null : null, reason: form.reason.trim() };
    const payload = action.type === 'revise' ? { ...input, expectedVersion: action.requirement.rowVersion } : input;
    const fingerprint = JSON.stringify({ scope: requestScope, action: action.type, id: action.type === 'revise' ? action.requirement.id : null, payload });
    let key = attempts.current.get(fingerprint);
    if (!key) { key = crypto.randomUUID(); attempts.current.set(fingerprint, key); }
    busy.current = true; setSubmitting(true); setDecisionError(null);
    try {
      if (action.type === 'create') await apiClient.createIntakeRequirement(projectId, input, key);
      else await apiClient.reviseIntakeRequirement(projectId, action.requirement.id, { ...input, expectedVersion: action.requirement.rowVersion }, key);
      if (!mounted.current || scopeRef.current !== requestScope) return;
      attempts.current.delete(fingerprint); setDecision(null); setForm(emptyForm());
      setNotice(action.type === 'create' ? t('The unapproved requirement draft and its first revision were recorded.', 'تم تسجيل مسودة المتطلب غير المعتمدة ومراجعتها الأولى.')
        : t('A new draft revision was recorded. Earlier wording and revisions are retained.', 'تم تسجيل مراجعة جديدة للمسودة مع الاحتفاظ بالنص والمراجعات السابقة.'));
      setReload(value => value + 1);
    } catch (cause) {
      if (!mounted.current || scopeRef.current !== requestScope) return;
      setDecisionError(cause instanceof Error ? cause.message : t('The result could not be confirmed. Retry the same request.', 'تعذر تأكيد النتيجة. أعد محاولة الطلب نفسه.'));
      setConflict(cause instanceof ApiError && [409, 412, 428].includes(cause.status));
    } finally { if (mounted.current && scopeRef.current === requestScope) { busy.current = false; setSubmitting(false); } }
  };
  const visible = rows.filter(row => `${row.title} ${row.code || ''} ${row.originalWording || ''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const title = decision?.type === 'revise' ? t('Record a reviewed draft revision', 'تسجيل مراجعة مسودة بعد المراجعة') : t('Record a requirement draft', 'تسجيل مسودة متطلب');

  return <section className="records-page" dir={ar ? 'rtl' : 'ltr'} aria-label={t('Requirement intake register', 'سجل استلام المتطلبات')}>
    <div className="records-heading"><div><span className="records-eyebrow">{t('SCOPE INTAKE', 'استلام النطاق')}</span><h2>{t('Requirements & source wording', 'المتطلبات والنص الأصلي')}</h2><p>{t('Keep original wording, interpretation and unknown values visible as scope develops.', 'احتفظ بالنص الأصلي والتفسير والقيم غير المعروفة ظاهرة أثناء تطوير النطاق.')}</p></div><div className="records-actions"><Button variant="secondary" disabled={loading || submitting} onClick={refresh}>{t('Refresh', 'تحديث')}</Button><Button disabled={loading || caps.canCreateDraft !== true} onClick={() => open({ type: 'create' })}>{t('New requirement draft', 'مسودة متطلب جديدة')}</Button></div></div>
    <div className="records-notice">{t('Manual intake is an unapproved draft. Source notes and references are unverified claims, not proof of a file, approval or published operational scope. Unknown quantity, dates and owners remain unknown.', 'الاستلام اليدوي مسودة غير معتمدة. ملاحظات المصدر ومراجعه إفادات غير متحقق منها وليست إثباتاً لملف أو اعتماد أو نطاق تشغيلي منشور. تبقى الكميات والتواريخ والمالكون غير المعروفين دون افتراضات.')}</div>
    {notice && <div className="records-notice" role="status">{notice}</div>}
    {loading ? <Card><p role="status">{t('Loading requirements in this project...', 'جارٍ تحميل متطلبات هذا المشروع...')}</p></Card>
      : error ? <Card><div role="alert"><h3>{t('Requirements could not be loaded', 'تعذر تحميل المتطلبات')}</h3><p>{error}</p><Button variant="secondary" onClick={refresh}>{t('Retry', 'إعادة المحاولة')}</Button></div></Card>
        : <><div className="records-metrics"><MetricCard title={t('Visible requirements', 'المتطلبات المتاحة')} value={rows.length}/><MetricCard title={t('Recorded intake drafts', 'مسودات الاستلام المسجلة')} value={rows.filter(row => row.provenanceState === 'manually_recorded' && row.status === 'draft').length}/><MetricCard title={t('Quantity unknown', 'الكمية غير معروفة')} value={rows.filter(row => row.quantity == null).length} subtitle={t('Explicit zero is retained', 'يُحفظ الصفر المُدخل صراحة')}/></div>
          {truncated && <div className="records-notice">{t('This register shows the first 500 records. Totals describe this visible set.', 'يعرض هذا السجل أول 500 سجل. تصف الإجماليات هذه المجموعة المعروضة.')}</div>}
          <Input id="intake-search" label={t('Find requirement or source wording', 'البحث عن متطلب أو نص أصلي')} value={search} onChange={event => setSearch(event.target.value)}/>
          <Card title={t('Requirement register', 'سجل المتطلبات')}>{visible.length ? visible.map(row => <article className="records-row" key={row.id}><div><h3>{row.code ? `${row.code} · ` : ''}{row.title}</h3><p>{sourceLabel(row.sourceType)} · {t('Revision', 'المراجعة')} {row.currentRevision} · {t('Record version', 'إصدار السجل')} {row.rowVersion}</p><p>{t('Quantity', 'الكمية')}: {row.quantity == null ? t('Unknown', 'غير معروفة') : <bdi>{row.quantity}</bdi>} {row.unit || t('· Unit unknown', '· الوحدة غير معروفة')}{row.locationZone ? ` · ${row.locationZone}` : ''}</p>
            <Badge variant={row.provenanceState === 'legacy_unverified' ? 'warning' : 'info'}>{row.provenanceState === 'legacy_unverified' ? t('Legacy · unverified', 'سجل سابق · غير متحقق') : row.isApproved || row.status !== 'draft' ? t('Controlled change required', 'يتطلب تغييراً خاضعاً للضبط') : t('Unapproved draft', 'مسودة غير معتمدة')}</Badge> <Badge variant="warning">{t('Source unverified', 'المصدر غير متحقق')}</Badge>
            <p>{t('Owner', 'المالك')}: {row.ownerId === currentUser?.id ? currentUser?.name : row.ownerId || t('Unknown', 'غير معروف')}</p></div><div className="records-actions"><Button size="sm" variant="secondary" onClick={() => void viewHistory(row)}>{t('Wording & history', 'النص والتاريخ')}</Button>{row.canRevise === true && caps.canReviseDraft === true && <Button size="sm" onClick={() => open({ type: 'revise', requirement: row })}>{t('New draft revision', 'مراجعة مسودة جديدة')}</Button>}</div></article>)
            : <div className="records-empty" role="status"><div className="records-orb" aria-hidden="true">◇</div><h3>{search ? t('No matching requirements', 'لا توجد متطلبات مطابقة') : t('No requirements recorded', 'لم تُسجّل متطلبات')}</h3><p>{t('Record a source note as a draft without inventing missing scope details.', 'سجّل ملاحظة مصدر كمسودة دون افتراض تفاصيل نطاق مفقودة.')}</p></div>}</Card></>}

    {historyTarget && <Card title={historyTarget.title} action={<Button variant="ghost" size="sm" onClick={() => { historySequence.current += 1; setHistoryTarget(null); }}>{t('Close history', 'إغلاق التاريخ')}</Button>}>
      <div className="records-grid"><div><h3>{t('Current original wording', 'النص الأصلي الحالي')}</h3><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{historyTarget.originalWording || t('Not recorded', 'غير مسجل')}</p></div><div><h3>{t('Current interpretation', 'التفسير الحالي')}</h3><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{historyTarget.interpretation || t('Unknown · no interpretation recorded', 'غير معروف · لم يُسجّل تفسير')}</p></div></div>
      {historyTarget.sourceReference && <p className="records-muted">{t('Claimed source reference', 'مرجع المصدر المصرح به')}: {historyTarget.sourceReference}</p>}
      {historyTarget.acceptanceCriteria && <p style={{ whiteSpace: 'pre-wrap' }}>{t('Draft acceptance criteria', 'معايير القبول المقترحة')}: {historyTarget.acceptanceCriteria}</p>}
      {historyLoading ? <p role="status">{t('Loading revision history...', 'جارٍ تحميل تاريخ المراجعات...')}</p>
        : historyError ? <div role="alert"><p>{historyError}</p><Button variant="secondary" onClick={() => void viewHistory(historyTarget)}>{t('Retry history', 'إعادة تحميل التاريخ')}</Button></div>
          : <><h3>{t('Retained revisions', 'المراجعات المحفوظة')}</h3>{historyTruncated && <p className="records-notice">{t('Showing the latest 500 revisions.', 'تظهر أحدث 500 مراجعة.')}</p>}
            {!history.length && <p className="records-muted">{t('No controlled revision snapshot is available for this record. Legacy data is not proof of approved scope.', 'لا تتوفر لقطة مراجعة مضبوطة لهذا السجل. البيانات السابقة ليست دليلاً على نطاق معتمد.')}</p>}
            {history.map(revision => <details key={revision.id} className="records-row" style={{ display: 'block' }}><summary style={{ cursor: 'pointer', lineHeight: 1.8 }}><strong>{t('Revision', 'المراجعة')} {revision.revisionNumber}</strong> · {date(revision.createdAt)} · {revision.provenanceState === 'manually_recorded' ? t('Recorded draft', 'مسودة مسجلة') : t('Legacy · unverified', 'سجل سابق · غير متحقق')}</summary>
              <p className="records-code">{t('Recorded by', 'سجّله')}: <bdi>{revision.authorId || t('Not recorded', 'غير مسجل')}</bdi></p>
              <p>{t('Reason', 'السبب')}: {revision.reason}</p>{revision.snapshot ? <><div className="records-grid"><div><h4>{t('Original wording at this revision', 'النص الأصلي في هذه المراجعة')}</h4><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{revision.snapshot.originalWording}</p></div><div><h4>{t('Interpretation at this revision', 'التفسير في هذه المراجعة')}</h4><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{revision.snapshot.interpretation || t('Not recorded', 'غير مسجل')}</p></div></div><p>{t('Quantity', 'الكمية')}: {revision.snapshot.quantity ?? t('Unknown', 'غير معروفة')} · {revision.snapshot.unit || t('Unit unknown', 'الوحدة غير معروفة')}</p>{revision.snapshot.sourceReference && <p>{t('Claimed reference', 'المرجع المصرح به')}: {revision.snapshot.sourceReference}</p>}</> : <p className="records-muted">{t('No immutable snapshot was captured by the legacy workflow.', 'لم يحفظ المسار السابق لقطة مراجعة ثابتة.')}</p>}
              {revision.snapshotHash && <p className="records-code">SHA-256: <bdi>{revision.snapshotHash}</bdi></p>}<p className="records-muted">{t('A revision hash identifies stored content; it does not verify the source claim.', 'تحدد بصمة المراجعة المحتوى المحفوظ؛ ولا تتحقق من صحة إفادة المصدر.')}</p></details>)}</>}
    </Card>}

    <Modal isOpen={decision !== null} onClose={close} title={title} size="lg" footer={<><Button variant="secondary" disabled={submitting} onClick={close}>{t('Close', 'إغلاق')}</Button>{conflict ? <Button onClick={refresh}>{t('Close and refresh', 'إغلاق وتحديث')}</Button> : <Button form="requirement-intake-form" type="submit" isLoading={submitting} disabled={!valid || loading || !decision || !canDecide(decision)}>{decisionError ? t('Retry same request', 'إعادة محاولة الطلب نفسه') : t('Save draft revision', 'حفظ مراجعة المسودة')}</Button>}</>}>
      <form id="requirement-intake-form" className="records-form" onSubmit={event => void submit(event)}>
        {decisionError && <div className="records-notice" role="alert">{decisionError}{conflict && <p>{t('Close and refresh the record before reviewing another revision.', 'أغلق السجل وحدّثه قبل مراجعة إصدار آخر.')}</p>}</div>}
        {decision?.type === 'revise' && <div className="records-notice">{t('Review the complete draft. Blank optional values are saved as unknown in this new revision. Previous wording remains in history.', 'راجع المسودة كاملة. تُحفظ القيم الاختيارية الفارغة كقيم غير معروفة في المراجعة الجديدة، ويبقى النص السابق في التاريخ.')} <strong>{t('Current record version', 'إصدار السجل الحالي')}: {decision.requirement.rowVersion}</strong></div>}
        <fieldset disabled={submitting || conflict} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: 'grid', gap: 14 }}>
          <Input id="intake-title" label={t('Requirement title', 'عنوان المتطلب')} required maxLength={300} value={form.title} onChange={event => update('title', event.target.value)}/>
          <div className="records-grid"><Textarea id="intake-original" label={t('Original wording · preserved exactly', 'النص الأصلي · يُحفظ كما هو')} required rows={6} maxLength={16000} value={form.originalWording} onChange={event => update('originalWording', event.target.value)}/><Textarea id="intake-interpretation" label={t('Interpretation (optional)', 'التفسير (اختياري)')} rows={6} maxLength={16000} value={form.interpretation} onChange={event => update('interpretation', event.target.value)}/></div>
          <div className="records-form-pair"><Select id="intake-source-type" label={t('Claimed source type', 'نوع المصدر المصرح به')} required value={form.sourceType} onChange={event => update('sourceType', event.target.value)} options={sourceTypes.map(value => ({ value, label: sourceLabel(value) }))}/><Input id="intake-category" label={t('Category (optional)', 'الفئة (اختياري)')} maxLength={120} value={form.category} onChange={event => update('category', event.target.value)}/></div>
          <Textarea id="intake-source-reference" label={t('Source reference or attribution (optional)', 'مرجع المصدر أو نسبته (اختياري)')} maxLength={2000} value={form.sourceReference} onChange={event => update('sourceReference', event.target.value)}/>
          <div className="records-form-pair"><Input id="intake-quantity" label={t('Quantity (optional)', 'الكمية (اختياري)')} inputMode="decimal" maxLength={25} value={form.quantity} onChange={event => update('quantity', event.target.value)} hint={t('Blank means unknown. Enter 0 only when zero is known.', 'الفارغ يعني غير معروف. أدخل 0 فقط عندما يكون الصفر معلوماً.')} error={!validQuantity ? t('Use a nonnegative decimal, up to 6 decimal places.', 'استخدم عدداً عشرياً غير سالب حتى 6 منازل عشرية.') : undefined}/><Input id="intake-unit" label={t('Unit (optional)', 'الوحدة (اختياري)')} maxLength={80} value={form.unit} onChange={event => update('unit', event.target.value)}/></div>
          <div className="records-form-pair"><Input id="intake-zone" label={t('Location or zone (optional)', 'الموقع أو المنطقة (اختياري)')} maxLength={250} value={form.locationZone} onChange={event => update('locationZone', event.target.value)}/><Select id="intake-owner" label={t('Responsible owner (optional)', 'المالك المسؤول (اختياري)')} value={form.owner} onChange={event => update('owner', event.target.value as DraftForm['owner'])} options={[{ value: '', label: t('Unknown / not assigned', 'غير معروف / غير مسند') }, { value: 'self', label: t('Assign to me', 'إسناد إليّ') }, ...(decision?.type === 'revise' && decision.requirement.ownerId && decision.requirement.ownerId !== currentUser?.id ? [{ value: 'keep', label: t('Keep current recorded owner', 'الاحتفاظ بالمالك المسجل الحالي') }] : [])]}/></div>
          <Textarea id="intake-acceptance" label={t('Draft acceptance criteria (optional)', 'معايير القبول المقترحة (اختياري)')} maxLength={8000} value={form.acceptanceCriteria} onChange={event => update('acceptanceCriteria', event.target.value)}/>
          <Textarea id="intake-reason" label={t('Reason for this draft revision', 'سبب مراجعة المسودة')} required maxLength={2000} value={form.reason} onChange={event => update('reason', event.target.value)}/>
          <p className="records-muted">{t('Saving records a draft and its source claims. It does not approve a requirement, assign a deadline or verify a source file.', 'يسجل الحفظ مسودة وإفادات مصدرها. ولا يعتمد متطلباً أو يحدد موعداً نهائياً أو يتحقق من ملف مصدر.')}</p>
        </fieldset>
      </form>
    </Modal>
  </section>;
};
