import React, { useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, Input, MetricCard, Modal, Select, Textarea } from '../components/DesignSystem.js';
import { useEosContext } from '../context/EosContext.js';
import { ApiError } from '../services/api-client.js';
import type { IntakeRequirement } from '../services/project-control.js';
import type { AllocationInput, AllocationRecord, AllocationRevision, QuantityComparison } from '../services/project-planning.js';
import './ProjectRecords.css';

type Decision = { type: 'create' } | { type: 'revise'; row: AllocationRecord };
type Form = { requirementId: string; quantity: string; unit: string; location: string; zone: string; subLocation: string; department: string; owner: '' | 'self' | 'keep'; notes: string; reason: string; reviewedSource: boolean };
const empty = (): Form => ({ requirementId: '', quantity: '', unit: '', location: '', zone: '', subLocation: '', department: '', owner: '', notes: '', reason: '', reviewedSource: false });
const optional = (value: string) => value.trim() || null;

export const AllocationRegister: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { apiClient, currentOrg, currentUser, currentLanguage, refreshTrigger } = useEosContext();
  const ar = currentLanguage === 'ar', t = (en: string, arabic: string) => ar ? arabic : en;
  const scope = `${currentOrg.id}:${currentUser?.id || ''}:${projectId}`, scopeRef = useRef(scope); scopeRef.current = scope;
  const mounted = useRef(true), busy = useRef(false), attempts = useRef(new Map<string, string>()), historySequence = useRef(0);
  const [rows, setRows] = useState<AllocationRecord[]>([]), [requirements, setRequirements] = useState<IntakeRequirement[]>([]);
  const [totals, setTotals] = useState<QuantityComparison[]>([]), [caps, setCaps] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true), [error, setError] = useState<string | null>(null), [reload, setReload] = useState(0);
  const [truncated, setTruncated] = useState(false), [sourceTruncated, setSourceTruncated] = useState(false);
  const [notice, setNotice] = useState<string | null>(null), [groupBy, setGroupBy] = useState('location'), [search, setSearch] = useState('');
  const [decision, setDecision] = useState<Decision | null>(null), [form, setForm] = useState<Form>(empty);
  const [submitting, setSubmitting] = useState(false), [decisionError, setDecisionError] = useState<string | null>(null), [conflict, setConflict] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<AllocationRecord | null>(null), [history, setHistory] = useState<AllocationRevision[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false), [historyError, setHistoryError] = useState<string | null>(null), [historyTruncated, setHistoryTruncated] = useState(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; historySequence.current += 1; }; }, []);
  useEffect(() => { setDecision(null); setForm(empty()); setNotice(null); setDecisionError(null); setConflict(false); setSubmitting(false); busy.current = false; attempts.current.clear(); setSearch(''); }, [scope]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(null); setRows([]); setRequirements([]); setTotals([]); setCaps({}); setHistoryTarget(null); historySequence.current += 1;
    Promise.all([apiClient.getAllocations(projectId), apiClient.getIntakeRequirements(projectId)]).then(([allocations, sources]) => {
      if (active) { setRows(allocations.data); setRequirements(sources.data); setTotals(allocations.meta?.quantityComparisons || []); setCaps(allocations.meta?.capabilities || {});
        setTruncated(allocations.meta?.truncated === true); setSourceTruncated(sources.meta?.truncated === true); }
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : t('Planning records could not be loaded.', 'تعذر تحميل سجلات التخطيط.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [apiClient, scope, projectId, refreshTrigger, reload]);
  const current = () => mounted.current && scopeRef.current === scope && !!currentUser && apiClient.isCurrentScope(currentOrg.id, currentUser.id);
  const sources = requirements.filter(row => row.provenanceState === 'manually_recorded' && row.status === 'draft' && !row.isApproved && row.canRevise);
  const source = sources.find(row => row.id === form.requirementId);
  const sourceChanged = decision?.type === 'revise' && source && source.rowVersion !== decision.row.requirementVersion;
  const canDecide = (action: Decision) => action.type === 'create' ? caps.canCreateDraft === true : caps.canReviseDraft === true && action.row.canRevise;
  const validQuantity = form.quantity.trim() === '' || /^(?:0|[1-9][0-9]{0,17})(?:\.[0-9]{1,6})?$/.test(form.quantity.trim());
  const valid = !!source && !!form.reason.trim() && validQuantity && (!sourceChanged || form.reviewedSource);
  const update = <K extends keyof Form>(key: K, value: Form[K]) => setForm(previous => ({ ...previous, [key]: value }));
  const open = (next: Decision) => {
    if (busy.current || loading || !canDecide(next)) return;
    setDecision(next); setDecisionError(null); setConflict(false);
    if (next.type === 'create') setForm(empty());
    else { const row = next.row; setForm({ requirementId: row.requirementId, quantity: row.quantity ?? '', unit: row.unit || '', location: row.location || '', zone: row.zone || '',
      subLocation: row.subLocation || '', department: row.department || '', owner: row.ownerId ? row.ownerId === currentUser?.id ? 'self' : 'keep' : '', notes: row.notes || '', reason: '', reviewedSource: false }); }
  };
  const close = () => { if (!busy.current) setDecision(null); };
  const refresh = () => { if (!busy.current) { setDecision(null); setReload(value => value + 1); } };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!decision || !source || !currentUser || !valid || !canDecide(decision) || loading || conflict || busy.current || !current()) return;
    const action = decision, requestScope = scope;
    const input: AllocationInput = { requirementId: source.id, expectedRequirementVersion: source.rowVersion,
      quantity: optional(form.quantity), unit: optional(form.unit), location: optional(form.location), zone: optional(form.zone), subLocation: optional(form.subLocation),
      department: optional(form.department), ownerId: form.owner === 'self' ? currentUser.id : form.owner === 'keep' && action.type === 'revise' ? action.row.ownerId : null,
      notes: optional(form.notes), reason: form.reason.trim() };
    const payload = action.type === 'revise' ? { ...input, expectedVersion: action.row.rowVersion } : input;
    const fingerprint = JSON.stringify({ scope: requestScope, action: action.type, id: action.type === 'revise' ? action.row.id : null, payload });
    let key = attempts.current.get(fingerprint); if (!key) { key = crypto.randomUUID(); attempts.current.set(fingerprint, key); }
    busy.current = true; setSubmitting(true); setDecisionError(null);
    try {
      if (action.type === 'create') await apiClient.createAllocation(projectId, input, key);
      else await apiClient.reviseAllocation(projectId, action.row.id, { ...input, expectedVersion: action.row.rowVersion }, key);
      if (!current() || scopeRef.current !== requestScope) return;
      attempts.current.delete(fingerprint); setDecision(null); setForm(empty()); setNotice(t('Planning revision recorded with its exact requirement revision. Earlier allocations remain in history.', 'تم تسجيل مراجعة التخطيط مع مراجعة المتطلب المحددة. تبقى التخصيصات السابقة في التاريخ.')); setReload(value => value + 1);
    } catch (cause) {
      if (!current() || scopeRef.current !== requestScope) return;
      setDecisionError(cause instanceof Error ? cause.message : t('The result could not be confirmed. Retry the same request.', 'تعذر تأكيد النتيجة. أعد محاولة الطلب نفسه.'));
      setConflict(cause instanceof ApiError && [409, 412, 428].includes(cause.status));
    } finally { if (current() && scopeRef.current === requestScope) { busy.current = false; setSubmitting(false); } }
  };
  const viewHistory = async (row: AllocationRecord) => {
    const requestScope = scope, sequence = ++historySequence.current;
    setHistoryTarget(row); setHistory([]); setHistoryLoading(true); setHistoryError(null); setHistoryTruncated(false);
    try { const result = await apiClient.getAllocationRevisions(projectId, row.id);
      if (current() && scopeRef.current === requestScope && sequence === historySequence.current) { setHistory(result.data); setHistoryTruncated(result.meta?.truncated === true); }
    } catch (cause) { if (current() && scopeRef.current === requestScope && sequence === historySequence.current) setHistoryError(cause instanceof Error ? cause.message : t('History could not be loaded.', 'تعذر تحميل التاريخ.'));
    } finally { if (current() && scopeRef.current === requestScope && sequence === historySequence.current) setHistoryLoading(false); }
  };
  const unknown = t('Unknown', 'غير معروف');
  const visible = rows.filter(row => [row.requirementTitle, row.location, row.zone, row.department].join(' ').toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const groups = new Map<string, AllocationRecord[]>();
  visible.forEach(row => { const label = (groupBy === 'department' ? row.department : row.location) || unknown; groups.set(label, [...(groups.get(label) || []), row]); });
  const date = (value: string) => new Date(value).toLocaleString(ar ? 'ar-QA' : 'en-GB');

  return <section className="records-page" dir={ar ? 'rtl' : 'ltr'} aria-label={t('Allocation planning register', 'سجل تخطيط التخصيصات')}>
    <div className="records-heading"><div><span className="records-eyebrow">{t('SCOPE PLANNING', 'تخطيط النطاق')}</span><h2>{t('Allocations across locations', 'تخصيصات المواقع')}</h2><p>{t('Plan repeated delivery against one requirement while keeping physical location and department ownership separate.', 'خطط للتسليم المتكرر بناءً على متطلب واحد مع الفصل بين الموقع الفعلي والقسم المسؤول.')}</p></div><div className="records-actions"><Button variant="secondary" onClick={refresh} disabled={loading || submitting}>{t('Refresh', 'تحديث')}</Button><Button disabled={loading || caps.canCreateDraft !== true} onClick={() => open({ type: 'create' })}>{t('New allocation draft', 'مسودة تخصيص جديدة')}</Button></div></div>
    <div className="records-notice">{t('These are unapproved planning records. Requirement changes flag an earlier source revision for review; they do not silently change allocations. No quantity compliance, acceptance or production release is inferred.', 'هذه سجلات تخطيط غير معتمدة. تحدد تغييرات المتطلب مراجعة المصدر السابقة للمراجعة؛ ولا تغير التخصيصات تلقائياً. لا يُفترض تطابق كميات أو قبول أو تصريح إنتاج.')}</div>
    {notice && <div role="status" className="records-notice">{notice}</div>}
    {loading ? <Card><p role="status">{t('Loading project allocations…', 'جارٍ تحميل تخصيصات المشروع…')}</p></Card> : error ? <Card><div role="alert"><h3>{t('Allocation register unavailable', 'سجل التخصيصات غير متاح')}</h3><p>{error}</p><Button variant="secondary" onClick={refresh}>{t('Retry', 'إعادة المحاولة')}</Button></div></Card> : <>
      <div className="records-metrics"><MetricCard title={t('Visible allocations', 'التخصيصات الظاهرة')} value={rows.length}/><MetricCard title={t('Source changed', 'تغير المصدر')} value={rows.filter(row => row.staleSource && row.provenanceState === 'manually_recorded').length}/><MetricCard title={t('Quantity unknown', 'الكمية غير معروفة')} value={rows.filter(row => row.quantity == null).length}/></div>
      {truncated && <p className="records-notice">{t('Showing the latest 500 allocations. Arithmetic comparisons use all controlled allocations for each listed requirement.', 'تظهر أحدث 500 تخصيص. تستخدم المقارنات الحسابية جميع التخصيصات المضبوطة لكل متطلب معروض.')}</p>}
      <div className="records-form-pair"><Input id="allocation-search" label={t('Find requirement, location or department', 'البحث عن متطلب أو موقع أو قسم')} value={search} onChange={event => setSearch(event.target.value)}/><Select id="allocation-group" label={t('Group the same records by', 'تجميع السجلات نفسها حسب')} value={groupBy} onChange={event => setGroupBy(event.target.value)} options={[{ value: 'location', label: t('Physical location', 'الموقع الفعلي') }, { value: 'department', label: t('Department ownership', 'القسم المسؤول') }]}/></div>
      {!visible.length ? <Card><div className="records-empty"><div className="records-orb" aria-hidden="true">◇</div><h3>{t('No allocation drafts here yet', 'لا توجد مسودات تخصيص هنا بعد')}</h3><p>{t('Choose a recorded requirement to plan a location, zone or department without inventing missing quantities.', 'اختر متطلباً مسجلاً لتخطيط موقع أو منطقة أو قسم دون افتراض كميات مفقودة.')}</p></div></Card>
        : [...groups].map(([label, items]) => <Card key={label} title={label}>{items.map(row => <article key={row.id} className="records-row"><div><h3>{row.requirementTitle}</h3><p>{t('Quantity', 'الكمية')}: <bdi>{row.quantity ?? unknown}</bdi> · {row.unit || t('Unit unknown', 'الوحدة غير معروفة')}</p><p>{t('Location', 'الموقع')}: {row.location || unknown} · {t('Zone', 'المنطقة')}: {row.zone || unknown} · {t('Department', 'القسم')}: {row.department || unknown}</p><p>{t('Allocation revision', 'مراجعة التخصيص')} {row.revision} · {t('Requirement version', 'إصدار المتطلب')} {row.requirementVersion ?? unknown}</p><Badge variant={row.provenanceState === 'manually_recorded' ? 'info' : 'warning'}>{row.provenanceState === 'manually_recorded' ? t('Planning draft', 'مسودة تخطيط') : t('Legacy · unverified', 'سابق · غير متحقق')}</Badge> {row.staleSource && row.provenanceState === 'manually_recorded' && <Badge variant="warning">{t('Source changed · review needed', 'تغير المصدر · يلزم المراجعة')}</Badge>}</div><div className="records-actions"><Button size="sm" variant="secondary" onClick={() => void viewHistory(row)}>{t('Revision history', 'تاريخ المراجعات')}</Button>{row.canRevise && caps.canReviseDraft && <Button size="sm" onClick={() => open({ type: 'revise', row })}>{t('Review & revise', 'مراجعة وتعديل')}</Button>}</div></article>)}</Card>)}
      {totals.length > 0 && <Card title={t('Quantity arithmetic · applicability unknown', 'حساب الكميات · قابلية التطبيق غير معروفة')}><p className="records-muted">{t('Matching unit labels are added with exact decimal arithmetic. No unit conversion or rule that allocations must sum to the requirement has been approved.', 'تُجمع تسميات الوحدات المتطابقة بحساب عشري دقيق. لم تُعتمد تحويلات وحدات أو قاعدة تلزم تساوي مجموع التخصيصات مع المتطلب.')}</p>{totals.map(total => <article className="records-row" key={total.requirementId}><div><h3>{requirements.find(row => row.id === total.requirementId)?.title || total.requirementId}</h3><p>{t('Requirement quantity', 'كمية المتطلب')}: <bdi>{total.requirementQuantity ?? unknown}</bdi> · {t('Known allocated, matching unit', 'المخصص المعروف بنفس الوحدة')}: <bdi>{total.knownAllocationQuantity ?? unknown}</bdi> {total.unit || t('Unit unknown', 'الوحدة غير معروفة')}</p><p>{t('Source minus allocations (arithmetic only)', 'المصدر ناقص التخصيصات (حساب فقط)')}: <bdi>{total.arithmeticDifference ?? t('Not comparable', 'غير قابل للمقارنة')}</bdi></p><p>{t('Unknown quantities', 'كميات مجهولة')}: {total.unknownQuantityCount} · {t('Unknown/different units', 'وحدات مجهولة أو مختلفة')}: {total.unitMismatchCount} · {t('Earlier requirement versions', 'إصدارات متطلب سابقة')}: {total.staleAllocationCount}</p></div></article>)}</Card>}
    </>}
    <Modal isOpen={historyTarget !== null} title={t('Allocation revision history', 'تاريخ مراجعات التخصيص')} size="lg" onClose={() => { historySequence.current += 1; setHistoryTarget(null); }}>
      {historyLoading ? <p role="status">{t('Loading retained revisions…', 'جارٍ تحميل المراجعات المحفوظة…')}</p> : historyError ? <div role="alert"><p>{historyError}</p><Button onClick={() => historyTarget && void viewHistory(historyTarget)}>{t('Retry', 'إعادة المحاولة')}</Button></div> : <>{historyTruncated && <p>{t('Latest 500 revisions shown.', 'تظهر أحدث 500 مراجعة.')}</p>}{!history.length && <p>{t('No controlled history is available for this legacy record.', 'لا يتوفر تاريخ مضبوط لهذا السجل السابق.')}</p>}{history.map(revision => <details className="records-row" style={{ display: 'block' }} key={revision.id}><summary>{t('Revision', 'المراجعة')} {revision.revisionNumber} · {date(revision.createdAt)}</summary><p>{revision.reason}</p><p>{t('Recorded by', 'سجله')}: <bdi>{revision.authorId || unknown}</bdi></p><p>{t('Requirement version', 'إصدار المتطلب')}: {revision.snapshot?.requirementVersion} · {t('Quantity', 'الكمية')}: <bdi>{revision.snapshot?.quantity ?? unknown}</bdi> {revision.snapshot?.unit || ''}</p><p>{t('Location / zone', 'الموقع / المنطقة')}: {revision.snapshot?.location || unknown} / {revision.snapshot?.zone || unknown}</p><p>{t('Department', 'القسم')}: {revision.snapshot?.department || unknown}</p><p style={{ whiteSpace: 'pre-wrap' }}>{revision.snapshot?.notes}</p><p className="records-code">SHA-256: <bdi>{revision.snapshotHash}</bdi></p><Badge variant={revision.snapshotIntegrityVerified ? 'info' : 'warning'}>{revision.snapshotIntegrityVerified ? t('Stored snapshot matches its hash', 'اللقطة المحفوظة تطابق البصمة') : t('Snapshot integrity requires review', 'تتطلب سلامة اللقطة مراجعة')}</Badge></details>)}</>}
    </Modal>
    <Modal isOpen={decision !== null} onClose={close} title={decision?.type === 'revise' ? t('Review allocation revision', 'مراجعة إصدار التخصيص') : t('Record an allocation draft', 'تسجيل مسودة تخصيص')} size="lg" footer={<><Button variant="secondary" disabled={submitting} onClick={close}>{t('Close', 'إغلاق')}</Button>{conflict ? <Button onClick={refresh}>{t('Close and refresh', 'إغلاق وتحديث')}</Button> : <Button form="allocation-form" type="submit" isLoading={submitting} disabled={!valid || loading || !decision || !canDecide(decision)}>{decisionError ? t('Retry same request', 'إعادة محاولة الطلب نفسه') : t('Save planning revision', 'حفظ مراجعة التخطيط')}</Button>}</>}>
      <form id="allocation-form" className="records-form" onSubmit={event => void submit(event)}>
        {decisionError && <div className="records-notice" role="alert">{decisionError}</div>}
        <fieldset disabled={submitting || conflict} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: 'grid', gap: 14 }}>
          <Select id="allocation-requirement" label={t('Requirement draft', 'مسودة المتطلب')} required disabled={decision?.type === 'revise'} value={form.requirementId} onChange={event => { update('requirementId', event.target.value); update('reviewedSource', false); }} options={[{ value: '', label: t('Choose a requirement', 'اختر متطلباً') }, ...sources.map(row => ({ value: row.id, label: `${row.title} · ${t('version', 'إصدار')} ${row.rowVersion}` }))]}/>
          {sourceTruncated && <p className="records-notice">{t('Only the latest 500 requirement records are available to choose here.', 'تتوفر هنا أحدث 500 سجل متطلب للاختيار.')}</p>}
          {!source && <p className="records-notice">{t('A current editable requirement draft is required. Record it in Requirement intake first.', 'تلزم مسودة متطلب حالية قابلة للتعديل. سجلها أولاً في استلام المتطلبات.')}</p>}
          {source && <div className="records-notice"><strong>{t('Source wording at selected version', 'نص المصدر في الإصدار المحدد')} {source.rowVersion}</strong><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{source.originalWording}</p>{sourceChanged && <label style={{ display: 'flex', gap: 8, alignItems: 'start' }}><input type="checkbox" checked={form.reviewedSource} onChange={event => update('reviewedSource', event.target.checked)}/><span>{t('I reviewed this changed requirement and intend to pin this allocation to its current version. Earlier pins remain in history.', 'راجعت المتطلب المتغير وأقصد ربط هذا التخصيص بإصداره الحالي. تبقى الروابط السابقة في التاريخ.')}</span></label>}</div>}
          <div className="records-form-pair"><Input id="allocation-quantity" label={t('Quantity (optional)', 'الكمية (اختياري)')} inputMode="decimal" maxLength={25} value={form.quantity} onChange={event => update('quantity', event.target.value)} hint={t('Blank is unknown; explicit 0 is retained.', 'الفارغ غير معروف؛ يُحفظ الصفر المُدخل صراحة.')} error={!validQuantity ? t('Use a nonnegative decimal with up to 6 decimal places.', 'استخدم عدداً غير سالب حتى 6 منازل عشرية.') : undefined}/><Input id="allocation-unit" label={t('Unit (optional)', 'الوحدة (اختياري)')} maxLength={80} value={form.unit} onChange={event => update('unit', event.target.value)}/></div>
          <div className="records-form-pair"><Input id="allocation-location" label={t('Physical location (optional)', 'الموقع الفعلي (اختياري)')} maxLength={250} value={form.location} onChange={event => update('location', event.target.value)}/><Input id="allocation-zone" label={t('Zone (optional)', 'المنطقة (اختياري)')} maxLength={250} value={form.zone} onChange={event => update('zone', event.target.value)}/></div>
          <div className="records-form-pair"><Input id="allocation-sub-location" label={t('Sub-location (optional)', 'الموقع الفرعي (اختياري)')} maxLength={250} value={form.subLocation} onChange={event => update('subLocation', event.target.value)}/><Input id="allocation-department" label={t('Owning department (optional)', 'القسم المسؤول (اختياري)')} maxLength={250} value={form.department} onChange={event => update('department', event.target.value)}/></div>
          <Select id="allocation-owner" label={t('Responsible owner (optional)', 'المالك المسؤول (اختياري)')} value={form.owner} onChange={event => update('owner', event.target.value as Form['owner'])} options={[{ value: '', label: t('Unknown / unassigned', 'غير معروف / غير مسند') }, { value: 'self', label: t('Assign to me', 'إسناد إليّ') }, ...(decision?.type === 'revise' && decision.row.ownerId && decision.row.ownerId !== currentUser?.id ? [{ value: 'keep', label: t('Keep recorded owner', 'الاحتفاظ بالمالك المسجل') }] : [])]}/>
          <Textarea id="allocation-notes" label={t('Planning notes (optional)', 'ملاحظات التخطيط (اختياري)')} maxLength={4000} value={form.notes} onChange={event => update('notes', event.target.value)}/>
          <Textarea id="allocation-reason" label={t('Reason for this revision', 'سبب هذه المراجعة')} required maxLength={2000} value={form.reason} onChange={event => update('reason', event.target.value)}/>
          <p className="records-muted">{t('Blank optional values replace the current value with unknown in the new revision. Saving does not release production or update delivery progress.', 'تحل القيم الاختيارية الفارغة محل القيمة الحالية كغير معروفة في المراجعة الجديدة. لا يمنح الحفظ تصريح إنتاج ولا يحدّث تقدم التسليم.')}</p>
        </fieldset>
      </form>
    </Modal>
  </section>;
};
