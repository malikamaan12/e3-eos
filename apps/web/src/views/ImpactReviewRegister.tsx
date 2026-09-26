import React, { useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, Modal, Textarea } from '../components/DesignSystem.js';
import { useEosContext } from '../context/EosContext.js';
import { ApiError } from '../services/api-client.js';
import type { ImpactAssessment, ImpactAssessmentInput, ImpactChange, ImpactItem, ImpactList } from '../services/project-planning.js';
import './ProjectRecords.css';

export const ImpactReviewRegister: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { apiClient, currentOrg, currentUser, currentLanguage, refreshTrigger } = useEosContext();
  const ar = currentLanguage === 'ar', t = (en: string, arabic: string) => ar ? arabic : en;
  const scope = `${currentOrg.id}:${currentUser?.id || ''}:${projectId}`;
  const scopeRef = useRef(scope); scopeRef.current = scope;
  const mounted = useRef(true), busy = useRef(false), attempts = useRef(new Map<string, string>());
  const [result, setResult] = useState<ImpactList>({ data: [] });
  const [history, setHistory] = useState<ImpactAssessment[]>([]), [historyTruncated, setHistoryTruncated] = useState(false);
  const [loadedScope, setLoadedScope] = useState(''), [loading, setLoading] = useState(true), [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0), [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ item: ImpactItem; scope: string } | null>(null);
  const [assessment, setAssessment] = useState(''), [proposedAction, setProposedAction] = useState(''), [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false), [commandError, setCommandError] = useState<string | null>(null), [conflict, setConflict] = useState(false);
  const [detail, setDetail] = useState<{ record: ImpactAssessment; scope: string } | null>(null);
  const current = (captured: string) => mounted.current && scopeRef.current === captured;
  const ready = !loading && loadedScope === scope, canAssess = ready && !error && result.meta?.capabilities?.canAssess === true;
  const decision = selected?.scope === scope ? selected : null;
  const valid = assessment.trim().length > 0 && assessment.trim().length <= 4000 && proposedAction.trim().length > 0
    && proposedAction.trim().length <= 2000 && reason.trim().length > 0 && reason.trim().length <= 2000;
  const date = (value: string) => new Date(value).toLocaleString(ar ? 'ar-QA' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  const targetLabel = (type: string) => type === 'allocation' ? t('Allocation', 'توزيع') : t('Design brief', 'موجز تصميم');
  const sourceLabel = (type: string) => type === 'requirement' ? t('Requirement', 'متطلب') : t('Allocation', 'توزيع');

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setSelected(null); setDetail(null); setNotice(null); setSubmitting(false); busy.current = false; }, [scope]);
  useEffect(() => {
    const captured = scope; let active = true;
    setLoading(true); setError(null); setResult({ data: [] }); setHistory([]); setLoadedScope('');
    Promise.all([apiClient.getImpactRegister(projectId), apiClient.getImpactAssessments(projectId)]).then(([impacts, assessments]) => {
      if (active && current(captured)) { setResult(impacts); setHistory(assessments.data); setHistoryTruncated(assessments.meta?.truncated === true); setLoadedScope(captured); }
    }).catch(cause => { if (active && current(captured)) { setError(cause instanceof Error ? cause.message : t('Impact review could not be loaded.', 'تعذر تحميل مراجعة الأثر.')); setLoadedScope(captured); } })
      .finally(() => { if (active && current(captured)) setLoading(false); });
    return () => { active = false; };
  }, [apiClient, scope, projectId, refreshTrigger, reload]);

  const refresh = () => { if (!busy.current) { setSelected(null); setReload(value => value + 1); } };
  const open = (item: ImpactItem) => {
    if (!canAssess || busy.current) return;
    setSelected({ item, scope }); setAssessment(''); setProposedAction(''); setReason(''); setCommandError(null); setConflict(false); setNotice(null);
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!decision || busy.current || !canAssess || !valid || conflict) return;
    const captured = scope, item = decision.item;
    const input: ImpactAssessmentInput = { targetType: item.targetType, targetId: item.targetId, expectedTargetVersion: item.targetVersion,
      impactFingerprint: item.impactFingerprint, assessment: assessment.trim(), proposedAction: proposedAction.trim(), reason: reason.trim() };
    const fingerprint = JSON.stringify({ scope: captured, input });
    let key = attempts.current.get(fingerprint); if (!key) { key = crypto.randomUUID(); attempts.current.set(fingerprint, key); }
    busy.current = true; setSubmitting(true); setCommandError(null);
    try {
      await apiClient.createImpactAssessment(projectId, input, key);
      attempts.current.delete(fingerprint);
      if (current(captured)) { setSelected(null); setNotice(t('Assessment recorded against the reviewed versions. Source changes remain open until the draft is explicitly revised.', 'سُجّل التقييم مقابل الإصدارات التي راجعتها. تبقى تغييرات المصادر ظاهرة حتى تُراجع المسودة صراحةً.')); setReload(value => value + 1); }
    } catch (cause) {
      if (current(captured)) { setCommandError(cause instanceof Error ? cause.message : t('Assessment could not be saved. Retry with the same inputs.', 'تعذر حفظ التقييم. أعد المحاولة بالمدخلات نفسها.')); setConflict(cause instanceof ApiError && [409, 412].includes(cause.status)); }
    } finally { if (current(captured)) { busy.current = false; setSubmitting(false); } }
  };

  const snapshot = (value: Record<string, any> | null, label: string) => <details className="records-notice"><summary>{label}</summary>
    <pre className="records-code" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 260, overflowY: 'auto' }}>{JSON.stringify(value, null, 2)}</pre></details>;
  const changes = (rows: ImpactChange[]) => rows.map(change => <article className="records-notice" key={`${change.sourceType}:${change.sourceId}:${change.pinnedRevisionId}`}>
    <strong>{sourceLabel(change.sourceType)} · {change.title}</strong>
    <p>{t('Pinned version', 'الإصدار المرتبط')}: {change.pinnedVersion} → {t('Current version', 'الإصدار الحالي')}: {change.currentVersion ?? t('Unavailable', 'غير متاح')}</p>
    <div className="records-form-pair">{snapshot(change.pinnedSnapshot, t('Earlier source snapshot', 'لقطة المصدر السابقة'))}{snapshot(change.currentSnapshot, t('Current source snapshot', 'لقطة المصدر الحالية'))}</div>
    <p className="records-code">{t('Earlier fingerprint', 'بصمة المصدر السابقة')}: {change.pinnedSnapshotHash}</p>
    <p className="records-code">{t('Current fingerprint', 'بصمة المصدر الحالية')}: {change.currentSnapshotHash}</p>
  </article>);

  return <section className="records-page" dir={ar ? 'rtl' : 'ltr'} aria-label={t('Impact review', 'مراجعة الأثر')}>
    <div className="records-heading"><div><h2>{t('Impact review', 'مراجعة الأثر')}</h2><p className="records-muted">{t('See which draft allocations and design briefs refer to earlier source versions.', 'اطّلع على التوزيعات ومسودات التصميم المرتبطة بإصدارات سابقة من المصادر.')}</p></div>
      <Button variant="secondary" onClick={refresh} disabled={loading || submitting}>{t('Refresh', 'تحديث')}</Button></div>
    <div className="records-notice">{t('Assessments are advisory. They preserve the reviewed source versions and your proposed action. Approval, release and changing the draft are separate actions.', 'التقييمات استشارية. تحتفظ بإصدارات المصادر التي راجعتها والإجراء المقترح. الاعتماد والإصدار وتعديل المسودة إجراءات مستقلة.')}</div>
    {notice && <div className="records-notice" role="status">{notice}</div>}
    {!ready ? <Card><p role="status">{t('Comparing the project’s source versions…', 'جارٍ مقارنة إصدارات مصادر المشروع…')}</p></Card>
      : error ? <Card><div role="alert"><h3>{t('Impact review is unavailable', 'مراجعة الأثر غير متاحة')}</h3><p>{error}</p><Button variant="secondary" onClick={refresh}>{t('Retry', 'إعادة المحاولة')}</Button></div></Card>
        : <>
          <div className="records-actions"><Badge variant="purple">{result.meta?.counts?.allocations || 0} {t('affected allocations', 'توزيعات متأثرة')}</Badge>
            <Badge variant="info">{result.meta?.counts?.designs || 0} {t('affected design briefs', 'مسودات تصميم متأثرة')}</Badge>
            <span className="records-muted">{t('Inspected drafts', 'المسودات المفحوصة')}: {result.meta?.scannedTargets ?? 0} / {result.meta?.totalDraftTargets ?? 0}</span></div>
          {result.meta?.truncated && <div className="records-notice">{t('Only the latest 200 accessible draft records were inspected. The counts and any empty result apply to this window; other drafts may need review.', 'فُحصت أحدث ٢٠٠ مسودة متاحة فقط. تنطبق الأعداد والنتيجة الفارغة على هذه المجموعة؛ وقد تحتاج مسودات أخرى إلى مراجعة.')}</div>}
          <Card title={t('Source changes to review', 'تغييرات المصادر للمراجعة')} action={<Badge variant="warning">{result.data.length}</Badge>}>
            {result.data.length === 0 ? <div className="records-empty"><div className="records-orb" aria-hidden="true">↗</div><h3>{t('No source changes in the inspected drafts', 'لا توجد تغييرات مصادر في المسودات المفحوصة')}</h3><p>{t('This comparison covers recorded draft links. It does not certify that the project scope is complete or approved.', 'تشمل المقارنة روابط المسودات المسجلة. ولا تثبت اكتمال نطاق المشروع أو اعتماده.')}</p></div>
              : result.data.map(item => <article className="records-row" key={`${item.targetType}:${item.targetId}`}><div style={{ minWidth: 0, flex: 1 }}>
                <h3>{item.title}</h3><div className="records-actions"><Badge variant="purple">{targetLabel(item.targetType)}</Badge><span>{t('Target version', 'إصدار السجل')}: {item.targetVersion}</span><Badge variant="warning">{item.changes.length} {t('changed sources', 'مصادر متغيرة')}</Badge></div>
                <details><summary>{t('Compare source versions', 'مقارنة إصدارات المصادر')}</summary><div className="records-form">{changes(item.changes)}</div></details>
              </div>{canAssess && <Button size="sm" disabled={submitting} onClick={() => open(item)}>{t('Record assessment', 'تسجيل تقييم')}</Button>}</article>)}
          </Card>
          <Card title={t('Recorded assessments', 'التقييمات المسجلة')} action={<Badge variant="purple">{history.length}</Badge>}>
            {history.length === 0 ? <p className="records-muted">{t('No advisory assessments have been recorded yet.', 'لم تُسجّل تقييمات استشارية بعد.')}</p>
              : history.map(row => <article className="records-row" key={row.id}><div style={{ minWidth: 0 }}><h3>{targetLabel(row.targetType)} · {t('Version', 'الإصدار')} {row.targetVersion}</h3><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{row.assessment}</p><p className="records-muted">{date(row.createdAt)}</p><p className="records-code">{t('Recorded by', 'سجّله')}: {row.actorId}</p></div><Button variant="secondary" size="sm" onClick={() => setDetail({ record: row, scope })}>{t('Reviewed snapshot', 'اللقطة التي روجعت')}</Button></article>)}
            {historyTruncated && <p className="records-notice">{t('Showing the latest 200 assessments. Earlier assessments remain saved.', 'تظهر أحدث ٢٠٠ تقييم. تبقى التقييمات الأقدم محفوظة.')}</p>}
          </Card>
        </>}

    <Modal isOpen={Boolean(decision)} onClose={() => { if (!busy.current) setSelected(null); }} size="lg" title={t('Record an advisory assessment', 'تسجيل تقييم استشاري')}
      footer={<><Button variant="secondary" disabled={submitting} onClick={() => setSelected(null)}>{t('Cancel', 'إلغاء')}</Button>{conflict ? <Button variant="secondary" onClick={refresh}>{t('Refresh and review changes', 'تحديث ومراجعة التغييرات')}</Button>
        : <Button type="submit" form="impact-assessment-form" disabled={submitting || !canAssess || !valid}>{submitting ? t('Saving…', 'جارٍ الحفظ…') : t('Record assessment', 'تسجيل تقييم')}</Button>}</>}>
      <form id="impact-assessment-form" className="records-form" onSubmit={submit}>
        {decision && <><div className="records-notice"><strong>{decision.item.title}</strong><p>{t('Reviewed target version', 'إصدار السجل الذي تراجعه')}: {decision.item.targetVersion}</p><p className="records-code">{decision.item.impactFingerprint}</p></div>{changes(decision.item.changes)}</>}
        <Textarea id="impact-assessment" label={t('Assessment of the source changes', 'تقييم تغييرات المصادر')} required maxLength={4000} rows={4} value={assessment} onChange={event => setAssessment(event.target.value)} disabled={submitting} />
        <Textarea id="impact-action" label={t('Proposed follow-up action', 'إجراء المتابعة المقترح')} required maxLength={2000} rows={3} value={proposedAction} onChange={event => setProposedAction(event.target.value)} disabled={submitting} />
        <Textarea id="impact-reason" label={t('Reason for recording this assessment', 'سبب تسجيل هذا التقييم')} required maxLength={2000} rows={3} value={reason} onChange={event => setReason(event.target.value)} disabled={submitting} />
        <p className="records-muted">{t('Saving retains the exact sources shown above. It does not update the draft or mark the issue resolved.', 'يحفظ هذا الإجراء المصادر الدقيقة المعروضة أعلاه. ولا يعدّل المسودة أو يحدد أن المسألة حُلّت.')}</p>
        {commandError && <div className="records-notice" role="alert">{commandError}</div>}
      </form>
    </Modal>
    <Modal isOpen={detail?.scope === scope} onClose={() => setDetail(null)} size="lg" title={t('Immutable assessment record', 'سجل التقييم المحفوظ')}
      footer={<Button variant="secondary" onClick={() => setDetail(null)}>{t('Close', 'إغلاق')}</Button>}>
      {detail?.scope === scope && <div className="records-form"><Badge variant="warning">{t('Advisory only', 'استشاري فقط')}</Badge><h3>{targetLabel(detail.record.targetType)} · {t('Version', 'الإصدار')} {detail.record.targetVersion}</h3>
        <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{detail.record.assessment}</p><h4>{t('Proposed action', 'الإجراء المقترح')}</h4><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{detail.record.proposedAction}</p>
        <h4>{t('Reason', 'السبب')}</h4><p>{detail.record.reason}</p><p>{date(detail.record.createdAt)}</p><p className="records-code">{t('Recorded by', 'سجّله')}: {detail.record.actorId}</p><p className="records-code">{t('Reviewed fingerprint', 'البصمة التي روجعت')}: {detail.record.impactFingerprint}</p>
        {snapshot(detail.record.sourceSnapshot, t('Exact target and source snapshots at assessment time', 'لقطات السجل والمصادر الدقيقة وقت التقييم'))}
      </div>}
    </Modal>
  </section>;
};
