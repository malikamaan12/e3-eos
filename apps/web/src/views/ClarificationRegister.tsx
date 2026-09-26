import React, { useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, Input, Modal, Select, Textarea } from '../components/DesignSystem.js';
import { useEosContext } from '../context/EosContext.js';
import { ApiError } from '../services/api-client.js';
import type { ClarificationInput, ClarificationRecord, IntakeRequirement } from '../services/project-control.js';
import './ProjectRecords.css';

type Decision = { kind: 'create'; scope: string } | { kind: 'respond' | 'reopen'; scope: string; record: ClarificationRecord };
type Form = { question: string; sourceAttribution: string; reason: string; respondentSelf: boolean; requirementId: string; dueAt: string;
  response: string; respondentAttribution: string };
type ClarificationDetail = ClarificationRecord & { historyTruncated?: boolean; responsesTruncated?: boolean };
const emptyForm = (): Form => ({ question: '', sourceAttribution: '', reason: '', respondentSelf: false, requirementId: '', dueAt: '', response: '', respondentAttribution: '' });

/** datetime-local is explicitly interpreted in the user's displayed device time zone. */
export function clarificationDueAt(value: string): string | null {
  if (!value) return null;
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(value);
  if (!parts) throw new Error('Invalid due date');
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.getFullYear() !== Number(parts[1]) || parsed.getMonth() + 1 !== Number(parts[2])
    || parsed.getDate() !== Number(parts[3]) || parsed.getHours() !== Number(parts[4]) || parsed.getMinutes() !== Number(parts[5])
    || parsed.getSeconds() !== Number(parts[6] || 0)) throw new Error('Invalid due date');
  return parsed.toISOString();
}

export const ClarificationRegister: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { apiClient, currentOrg, currentUser, currentLanguage, refreshTrigger } = useEosContext();
  const ar = currentLanguage === 'ar';
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const scope = `${currentOrg.id}:${currentUser?.id || ''}:${projectId}`;
  const scopeRef = useRef(scope); scopeRef.current = scope;
  const mounted = useRef(true), busy = useRef(false), detailSequence = useRef(0), requirementSequence = useRef(0);
  const attempts = useRef(new Map<string, string>());
  const [rows, setRows] = useState<ClarificationRecord[]>([]);
  const [capabilities, setCapabilities] = useState<Record<string, any>>({});
  const [loadedScope, setLoadedScope] = useState('');
  const [loading, setLoading] = useState(true), [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0), [notice, setNotice] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [decision, setDecision] = useState<Decision | null>(null), [form, setForm] = useState<Form>(emptyForm);
  const [submitting, setSubmitting] = useState(false), [decisionError, setDecisionError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [requirements, setRequirements] = useState<IntakeRequirement[]>([]);
  const [requirementsLoading, setRequirementsLoading] = useState(false), [requirementsError, setRequirementsError] = useState<string | null>(null);
  const [detailTarget, setDetailTarget] = useState<{ id: string; scope: string } | null>(null);
  const [detail, setDetail] = useState<ClarificationDetail | null>(null), [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const current = (captured: string) => mounted.current && scopeRef.current === captured;
  const visibleDecision = decision?.scope === scope ? decision : null;
  const ready = loadedScope === scope && !loading;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; detailSequence.current += 1; requirementSequence.current += 1; }; }, []);
  useEffect(() => {
    setDecision(null); setDetailTarget(null); setDetail(null); setNotice(null); setForm(emptyForm());
    setSubmitting(false); busy.current = false; setRequirements([]); setRequirementsError(null);
    detailSequence.current += 1; requirementSequence.current += 1;
  }, [scope]);
  useEffect(() => {
    let active = true; const captured = scope;
    setLoading(true); setError(null); setRows([]); setCapabilities({}); setLoadedScope('');
    apiClient.getRecordedClarifications(projectId).then(result => {
      if (active && current(captured)) {
        setRows(result.data); setCapabilities(result.meta?.capabilities || {}); setTruncated(result.meta?.truncated === true); setLoadedScope(captured);
      }
    }).catch(cause => { if (active && current(captured)) { setError(cause instanceof Error ? cause.message : t('Clarifications could not be loaded.', 'تعذر تحميل الاستفسارات.')); setLoadedScope(captured); } })
      .finally(() => { if (active && current(captured)) setLoading(false); });
    return () => { active = false; };
  }, [apiClient, projectId, scope, refreshTrigger, reload]);

  const date = (value?: string | null) => value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString(ar ? 'ar-QA' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : t('Not set', 'غير محدد');
  const label = (value: string) => {
    const labels: Record<string, string> = { open: t('Open question', 'استفسار مفتوح'), answered: t('Response recorded', 'تم تسجيل الرد'),
      created: t('Question recorded', 'تم تسجيل الاستفسار'), responded: t('Response recorded', 'تم تسجيل الرد'), reopened: t('Question reopened', 'أعيد فتح الاستفسار') };
    return labels[value] || value;
  };
  const allowed = (next: Decision) => next.scope === scope && (next.kind === 'create'
    ? capabilities.canCreate === true && Boolean(currentUser?.id)
    : next.kind === 'respond' ? capabilities.canRespond === true && next.record.canRespond === true
      : capabilities.canReopen === true && next.record.canReopen === true);
  const refresh = () => { if (!busy.current) { setDecision(null); setReload(value => value + 1); } };
  const open = (next: Decision) => {
    if (!ready || busy.current || !allowed(next)) return;
    setDecision(next); setForm(emptyForm()); setDecisionError(null); setConflict(false); setNotice(null);
    if (next.kind === 'create') {
      setRequirements([]); setRequirementsError(null); setRequirementsLoading(true);
      const captured = scope, sequence = ++requirementSequence.current;
      apiClient.getIntakeRequirements(projectId).then(result => {
        if (current(captured) && sequence === requirementSequence.current) setRequirements(result.data.filter(row => row.provenanceState === 'manually_recorded' && !row.isApproved));
      }).catch(cause => {
        if (current(captured) && sequence === requirementSequence.current) setRequirementsError(cause instanceof Error ? cause.message : t('Requirement links are unavailable.', 'روابط المتطلبات غير متاحة.'));
      }).finally(() => { if (current(captured) && sequence === requirementSequence.current) setRequirementsLoading(false); });
    }
  };
  const showDetail = async (id: string) => {
    const captured = scope, sequence = ++detailSequence.current;
    setDetailTarget({ id, scope: captured }); setDetail(null); setDetailError(null); setDetailLoading(true);
    try {
      const result = await apiClient.getRecordedClarification(projectId, id);
      if (current(captured) && sequence === detailSequence.current) setDetail(result);
    } catch (cause) {
      if (current(captured) && sequence === detailSequence.current) setDetailError(cause instanceof Error ? cause.message : t('History could not be loaded.', 'تعذر تحميل السجل.'));
    } finally { if (current(captured) && sequence === detailSequence.current) setDetailLoading(false); }
  };
  const closeDetail = () => { detailSequence.current += 1; setDetailTarget(null); setDetail(null); setDetailError(null); setDetailLoading(false); };
  const update = <K extends keyof Form>(key: K, value: Form[K]) => setForm(previous => ({ ...previous, [key]: value }));
  const actionLabel = visibleDecision?.kind === 'respond' ? t('Record response', 'تسجيل الرد')
    : visibleDecision?.kind === 'reopen' ? t('Reopen question', 'إعادة فتح الاستفسار') : t('Create question', 'إنشاء استفسار');
  const validText = (value: string, min: number, max: number) => value.trim().length >= min && value.trim().length <= max;
  const valid = Boolean(visibleDecision) && validText(form.reason, 1, 2000) && (visibleDecision?.kind === 'reopen'
    || validText(form.sourceAttribution, 1, 2000) && (visibleDecision?.kind === 'create'
      ? validText(form.question, 3, 4000) : validText(form.response, 1, 8000) && validText(form.respondentAttribution, 1, 300)));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const selected = visibleDecision;
    if (!selected || busy.current || conflict || !ready || !allowed(selected) || !valid) return;
    const captured = scope;
    let payload: ClarificationInput | { expectedVersion: number; response?: string; respondentAttribution?: string; sourceAttribution?: string; reason: string };
    try {
      payload = selected.kind === 'create' ? { question: form.question.trim(), sourceAttribution: form.sourceAttribution.trim(), ownerId: currentUser!.id,
        respondentId: form.respondentSelf ? currentUser!.id : null, requirementId: form.requirementId || null, dueAt: clarificationDueAt(form.dueAt), reason: form.reason.trim() }
        : selected.kind === 'respond' ? { expectedVersion: selected.record.rowVersion, response: form.response.trim(),
          respondentAttribution: form.respondentAttribution.trim(), sourceAttribution: form.sourceAttribution.trim(), reason: form.reason.trim() }
          : { expectedVersion: selected.record.rowVersion, reason: form.reason.trim() };
    } catch { setDecisionError(t('Enter a valid date and time, or leave the deadline blank.', 'أدخل تاريخاً ووقتاً صالحين أو اترك الموعد فارغاً.')); return; }
    const attempt = JSON.stringify({ scope: captured, kind: selected.kind, id: selected.kind === 'create' ? null : selected.record.id, payload });
    let key = attempts.current.get(attempt); if (!key) { key = crypto.randomUUID(); attempts.current.set(attempt, key); }
    busy.current = true; setSubmitting(true); setDecisionError(null);
    try {
      if (selected.kind === 'create') await apiClient.createRecordedClarification(projectId, payload as ClarificationInput, key);
      else if (selected.kind === 'respond') await apiClient.respondRecordedClarification(projectId, selected.record.id, payload as { expectedVersion: number; response: string; respondentAttribution: string; sourceAttribution: string; reason: string }, key);
      else await apiClient.reopenRecordedClarification(projectId, selected.record.id, payload as { expectedVersion: number; reason: string }, key);
      attempts.current.delete(attempt);
      if (current(captured)) {
        setDecision(null); setNotice(selected.kind === 'create' ? t('Internal question saved. It has not been sent externally.', 'حُفظ الاستفسار الداخلي ولم يُرسل إلى أي جهة خارجية.')
          : selected.kind === 'respond' ? t('Attributed response recorded. Scope approval remains separate.', 'تم تسجيل الرد المنسوب إلى مصدره. اعتماد النطاق إجراء مستقل.')
            : t('Question reopened. Previous responses remain in its history.', 'أعيد فتح الاستفسار مع الاحتفاظ بالردود السابقة في السجل.'));
        setReload(value => value + 1);
      }
    } catch (cause) {
      if (current(captured)) {
        setDecisionError(cause instanceof Error ? cause.message : t('The command could not be saved. Retry with the same inputs.', 'تعذر حفظ الإجراء. أعد المحاولة بالمدخلات نفسها.'));
        setConflict(cause instanceof ApiError && [409, 412].includes(cause.status));
      }
    } finally { if (current(captured)) { busy.current = false; setSubmitting(false); } }
  };

  return <section className="records-page" dir={ar ? 'rtl' : 'ltr'} aria-label={t('Clarification register', 'سجل الاستفسارات')}>
    <div className="records-heading"><div><h2>{t('Clarification register', 'سجل الاستفسارات')}</h2><p className="records-muted">{t('Keep open questions, source responses and their history together.', 'اجمع الأسئلة المفتوحة والردود المنسوبة إلى مصادرها وسجلها في مكان واحد.')}</p></div>
      <div className="records-actions"><Button variant="secondary" onClick={refresh} disabled={loading || submitting}>{t('Refresh', 'تحديث')}</Button>
        {ready && capabilities.canCreate === true && <Button onClick={() => open({ kind: 'create', scope })} disabled={submitting}>{t('New question', 'استفسار جديد')}</Button>}</div></div>
    <div className="records-notice">{t('Questions stay internal. A recorded answer does not approve a requirement or verify external authority. Earlier unverified records require a reviewed import.', 'تبقى الاستفسارات داخلية. تسجيل الرد لا يعتمد متطلباً ولا يثبت صلاحية جهة خارجية. تتطلب السجلات السابقة غير المتحقق منها استيراداً يخضع للمراجعة.')}</div>
    {notice && <div className="records-notice" role="status">{notice}</div>}
    {!ready ? <Card><p role="status">{t('Loading questions in this project…', 'جارٍ تحميل استفسارات هذا المشروع…')}</p></Card>
      : error ? <Card><div role="alert"><h3>{t('Questions could not be loaded', 'تعذر تحميل الاستفسارات')}</h3><p>{error}</p><Button variant="secondary" onClick={refresh}>{t('Retry', 'إعادة المحاولة')}</Button></div></Card>
        : <Card title={t('Recorded questions', 'الاستفسارات المسجلة')} action={<Badge variant="purple">{rows.length}</Badge>}>
          {rows.length === 0 ? <div className="records-empty"><div className="records-orb" aria-hidden="true">?</div><h3>{t('No recorded questions yet', 'لا توجد استفسارات مسجلة بعد')}</h3><p>{t('Record an ambiguity with its source and owner. A deadline can stay unknown.', 'سجّل نقطة الغموض ومصدرها والمسؤول عنها. يمكن ترك الموعد غير محدد.')}</p></div>
            : rows.map(row => <article className="records-row" key={row.id}><div><h3>{row.question}</h3><div className="records-actions"><Badge variant={row.status === 'answered' ? 'info' : 'warning'}>{label(row.status)}</Badge><span className="records-muted">{t('Version', 'الإصدار')} {row.rowVersion}</span></div>
              <p>{t('Question source', 'مصدر الاستفسار')}: {row.sourceAttribution}</p><p>{t('Due', 'الموعد')}: {date(row.dueAt)}</p>
              {row.latestResponse && <p>{t('Latest source attribution', 'أحدث مصدر منسوب إليه الرد')}: {row.latestResponse.respondentAttribution}</p>}</div>
              <div className="records-actions"><Button variant="secondary" size="sm" onClick={() => void showDetail(row.id)}>{t('History', 'السجل')}</Button>
                {row.canRespond && <Button size="sm" onClick={() => open({ kind: 'respond', record: row, scope })} disabled={submitting}>{t('Record response', 'تسجيل الرد')}</Button>}
                {row.canReopen && <Button size="sm" variant="secondary" onClick={() => open({ kind: 'reopen', record: row, scope })} disabled={submitting}>{t('Reopen', 'إعادة الفتح')}</Button>}</div></article>)}
          {truncated && <p className="records-muted">{t('Showing the latest 200 questions. Older records remain saved.', 'تظهر أحدث ٢٠٠ استفسار. تبقى السجلات الأقدم محفوظة.')}</p>}
        </Card>}

    <Modal isOpen={Boolean(visibleDecision)} onClose={() => { if (!busy.current) setDecision(null); }} title={actionLabel} size="lg"
      footer={<><Button variant="secondary" disabled={submitting} onClick={() => setDecision(null)}>{t('Cancel', 'إلغاء')}</Button>{conflict
        ? <Button variant="secondary" onClick={refresh}>{t('Refresh and review current version', 'تحديث ومراجعة الإصدار الحالي')}</Button>
        : <Button type="submit" form="clarification-command-form" disabled={submitting || !valid || !visibleDecision || !allowed(visibleDecision)}>{submitting ? t('Saving…', 'جارٍ الحفظ…') : actionLabel}</Button>}</>}>
      <form id="clarification-command-form" className="records-form" onSubmit={submit}>
        {visibleDecision?.kind === 'create' ? <>
          <Textarea id="clarification-question" label={t('Question', 'الاستفسار')} required minLength={3} maxLength={4000} value={form.question} onChange={event => update('question', event.target.value)} disabled={submitting} rows={4} />
          <Textarea id="clarification-question-source" label={t('Question source / reference', 'مصدر الاستفسار / المرجع')} required maxLength={2000} value={form.sourceAttribution} onChange={event => update('sourceAttribution', event.target.value)} disabled={submitting} rows={3} />
          <p className="records-muted">{t('You will be the recorded owner.', 'ستُسجّل بصفتك المسؤول عن الاستفسار.')} {currentUser?.name}</p>
          <label className="records-actions"><input type="checkbox" checked={form.respondentSelf} onChange={event => update('respondentSelf', event.target.checked)} disabled={submitting} />{t('Assign me as the expected respondent', 'تعييني مسؤولاً عن تقديم الرد')}</label>
          <Select id="clarification-requirement" label={t('Linked draft requirement (optional)', 'متطلب مسودة مرتبط (اختياري)')} value={form.requirementId} disabled={submitting || requirementsLoading || Boolean(requirementsError)}
            onChange={event => update('requirementId', event.target.value)} options={[{ value: '', label: t('No linked requirement', 'بدون متطلب مرتبط') }, ...requirements.map(row => ({ value: row.id, label: `${row.code || ''} ${row.title}`.trim() }))]} />
          {requirementsLoading && <p role="status" className="records-muted">{t('Loading available requirement drafts…', 'جارٍ تحميل مسودات المتطلبات المتاحة…')}</p>}
          {requirementsError && <p role="alert" className="records-muted">{t('Requirement links are unavailable; you can still record an unlinked question.', 'روابط المتطلبات غير متاحة؛ يمكنك تسجيل استفسار غير مرتبط.')} {requirementsError}</p>}
          <Input id="clarification-due" type="datetime-local" label={t('Response due (optional)', 'موعد الرد (اختياري)')} hint={`${t('Uses your device time zone', 'يستخدم المنطقة الزمنية لجهازك')}: ${timeZone}`} value={form.dueAt} onChange={event => update('dueAt', event.target.value)} disabled={submitting} />
        </> : visibleDecision && <><div className="records-notice"><strong>{visibleDecision.record.question}</strong><p>{t('Reviewed version', 'الإصدار الذي تراجعه')}: {visibleDecision.record.rowVersion}</p></div>
          {visibleDecision.kind === 'respond' ? <>
            <Textarea id="clarification-response" label={t('Response as recorded from the source', 'الرد كما سُجّل من المصدر')} required maxLength={8000} value={form.response} onChange={event => update('response', event.target.value)} disabled={submitting} rows={5} />
            <Input id="clarification-author" label={t('Attributed source author / organisation', 'كاتب الرد / الجهة المنسوب إليها')} required maxLength={300} value={form.respondentAttribution} onChange={event => update('respondentAttribution', event.target.value)} disabled={submitting} />
            <Textarea id="clarification-response-source" label={t('Source reference and limitations', 'مرجع المصدر وحدوده')} required maxLength={2000} value={form.sourceAttribution} onChange={event => update('sourceAttribution', event.target.value)} disabled={submitting} rows={3} />
            <p className="records-muted">{t('Your account is recorded as the recorder. The attributed source remains unverified; no requirement is approved by this action.', 'يُسجّل حسابك بوصفه مدوّن الرد. يبقى المصدر المنسوب إليه غير متحقق منه ولا يُعتمد أي متطلب بهذا الإجراء.')}</p>
          </> : <p className="records-muted">{t('Reopening clears the current answer and keeps every earlier response in the history.', 'تؤدي إعادة الفتح إلى إزالة الرد الحالي مع الاحتفاظ بجميع الردود السابقة في السجل.')}</p>}</>}
        <Textarea id="clarification-reason" label={t('Reason for this record', 'سبب هذا الإجراء')} required maxLength={2000} value={form.reason} onChange={event => update('reason', event.target.value)} disabled={submitting} rows={3} />
        {decisionError && <div className="records-notice" role="alert">{decisionError}</div>}
      </form>
    </Modal>

    <Modal isOpen={detailTarget?.scope === scope} onClose={closeDetail} title={t('Question history and attributed responses', 'سجل الاستفسار والردود المنسوبة إلى مصادرها')} size="lg"
      footer={<Button variant="secondary" onClick={closeDetail}>{t('Close', 'إغلاق')}</Button>}>
      {detailLoading ? <p role="status">{t('Loading history…', 'جارٍ تحميل السجل…')}</p> : detailError ? <div role="alert"><p>{detailError}</p><Button variant="secondary" onClick={() => detailTarget && void showDetail(detailTarget.id)}>{t('Retry', 'إعادة المحاولة')}</Button></div>
        : detail && <div className="records-form"><h3>{detail.question}</h3><p className="records-muted">{t('Question source', 'مصدر الاستفسار')}: {detail.sourceAttribution}</p>
          <div className="records-actions"><Badge variant="purple">{label(detail.status)}</Badge><span>{t('Version', 'الإصدار')} {detail.rowVersion}</span></div>
          <h3>{t('Recorded responses', 'الردود المسجلة')}</h3>
          {detail.responsesTruncated && <p className="records-notice">{t('Showing the latest 500 responses. Earlier responses remain saved.', 'تظهر أحدث ٥٠٠ رد. تبقى الردود الأقدم محفوظة.')}</p>}
          {(detail.responses || []).length === 0 ? <p className="records-muted">{t('No response has been recorded.', 'لم يُسجّل أي رد. ')}</p> : detail.responses!.map(response => <article className="records-notice" key={response.id}>
            <strong>{t('Response version', 'إصدار الرد')} {response.rowVersion}</strong><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{response.response}</p>
            <p>{t('Attributed to', 'منسوب إلى')}: {response.respondentAttribution}</p><p>{t('Source', 'المصدر')}: {response.sourceAttribution}</p>
            <p className="records-muted">{date(response.recordedAt)} · {t('Source authority unverified', 'صلاحية المصدر غير متحقق منها')}</p>
            <p className="records-code">{t('Recorded by', 'سجّله')}: {response.recordedBy}</p></article>)}
          <h3>{t('Action history', 'سجل الإجراءات')}</h3>
          {detail.historyTruncated && <p className="records-notice">{t('Showing the latest 500 actions. Earlier actions remain saved.', 'تظهر أحدث ٥٠٠ إجراء. تبقى الإجراءات الأقدم محفوظة.')}</p>}
          {(detail.history || []).map(event => <article className="records-row" key={event.id}><div><h3>{label(event.action)} · {t('Version', 'الإصدار')} {event.rowVersion}</h3><p>{event.reason}</p><p>{date(event.createdAt)}</p><p className="records-code">{t('Actor', 'المنفذ')}: {event.actorId}</p></div></article>)}
        </div>}
    </Modal>
  </section>;
};
