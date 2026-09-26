import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Badge, Button, Card, Input, Modal, Select, Textarea } from '../components/DesignSystem.js';
import { ApiError, type AdminAccessCapabilities, type AdminMembership, type ProjectAccessGrant, type ProjectAccessProject } from '../services/api-client.js';
import './AccessAdministration.css';

type AccessLevel = 'viewer' | 'editor';
type Decision = { kind: 'create' } | { kind: 'change' | 'revoke'; grant: ProjectAccessGrant };

export const ProjectAccessView: React.FC = () => {
  const { apiClient, currentLanguage, currentOrg, currentUser, navigate, refreshTrigger, triggerRefresh } = useEosContext();
  const ar = currentLanguage === 'ar';
  const [projects, setProjects] = useState<ProjectAccessProject[]>([]);
  const [memberships, setMemberships] = useState<AdminMembership[]>([]);
  const [grants, setGrants] = useState<ProjectAccessGrant[]>([]);
  const [capabilities, setCapabilities] = useState<AdminAccessCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [projectFilter, setProjectFilter] = useState(() => typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('projectId') || '');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'revoked'>('all');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [projectId, setProjectId] = useState('');
  const [membershipId, setMembershipId] = useState('');
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('viewer');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const attempts = useRef(new Map<string, string>());
  const busy = useRef(false);
  const scope = `${currentOrg.id}:${currentUser?.id || ''}`;
  const currentScope = useRef(scope);
  currentScope.current = scope;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setGrants([]);
    setProjects([]);
    setMemberships([]);
    setCapabilities(null);
    Promise.all([apiClient.getProjectAccessProjects(), apiClient.getProjectAccessGrants(), apiClient.getAdminUsers(), apiClient.getAdminAccessCapabilities()])
      .then(([projectList, grantList, memberList, access]) => {
        if (!active) return;
        setProjects(projectList);
        setGrants(grantList);
        setMemberships(memberList);
        setCapabilities(access);
        setProjectFilter((value) => projectList.some((project) => project.id === value) ? value : '');
      })
      .catch((cause: Error) => { if (active) setError(cause.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [apiClient, scope, refreshTrigger, reload]);

  useEffect(() => {
    setDecision(null);
    setNotice(null);
    setReason('');
    setProjectId('');
    setMembershipId('');
    setDecisionError(null);
    setConflict(false);
    setSubmitting(false);
    busy.current = false;
    attempts.current.clear();
  }, [scope]);

  const canManage = capabilities?.canAssignProjectAccess === true;
  const activeMembers = memberships.filter((member) => member.organisationId === currentOrg.id && !member.isRevoked && ['internal', 'client'].includes(member.audience));
  const reviewedMember = decision?.kind === 'create'
    ? activeMembers.find((member) => member.membershipId === membershipId)
    : decision ? memberships.find((member) => member.membershipId === decision.grant.membershipId) : undefined;
  const isClient = reviewedMember?.audience === 'client';
  const visible = useMemo(() => grants.filter((grant) => {
    const matchesProject = !projectFilter || grant.projectId === projectFilter;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'revoked' ? grant.isRevoked : !grant.isRevoked);
    return matchesProject && matchesStatus && `${grant.userName} ${grant.email} ${grant.projectCode} ${grant.projectTitle}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
  }), [grants, projectFilter, statusFilter, search]);

  const openDecision = (next: Decision) => {
    setDecision(next);
    setReason('');
    setDecisionError(null);
    setConflict(false);
    setProjectId(next.kind === 'create' ? projectFilter : next.grant.projectId);
    setMembershipId(next.kind === 'create' ? '' : next.grant.membershipId);
    setAccessLevel(next.kind === 'create' ? 'viewer' : next.grant.accessLevel);
  };
  const closeDecision = () => { if (!busy.current) setDecision(null); };
  const dateLabel = (value: string | null) => {
    if (!value || Number.isNaN(new Date(value).getTime())) return ar ? 'غير مسجل' : 'Not recorded';
    return new Date(value).toLocaleString(ar ? 'ar-QA' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!decision || !canManage || loading || busy.current || !reason.trim()) return;
    const reviewed = decision;
    const normalizedReason = reason.trim();
    if (reviewed.kind === 'create' && (!projects.some((project) => project.id === projectId) || !reviewedMember)) return;
    if (reviewed.kind !== 'revoke' && isClient && accessLevel !== 'viewer') return;
    const payload = reviewed.kind === 'create'
      ? { projectId, membershipId, accessLevel, reason: normalizedReason }
      : { accessLevel: reviewed.kind === 'change' ? accessLevel : undefined, expectedVersion: reviewed.grant.rowVersion, reason: normalizedReason };
    const requestScope = scope;
    const fingerprint = JSON.stringify({ scope: requestScope, kind: reviewed.kind, id: reviewed.kind === 'create' ? null : reviewed.grant.id, payload });
    let key = attempts.current.get(fingerprint);
    if (!key) { key = crypto.randomUUID(); attempts.current.set(fingerprint, key); }
    busy.current = true;
    setSubmitting(true);
    setDecisionError(null);
    setConflict(false);
    try {
      if (reviewed.kind === 'create') await apiClient.createProjectAccess({ projectId, membershipId, accessLevel, reason: normalizedReason }, key);
      else if (reviewed.kind === 'change') await apiClient.changeProjectAccess(reviewed.grant.id, { accessLevel, expectedVersion: reviewed.grant.rowVersion, reason: normalizedReason }, key);
      else await apiClient.revokeProjectAccess(reviewed.grant.id, { expectedVersion: reviewed.grant.rowVersion, reason: normalizedReason }, key);
      if (currentScope.current !== requestScope) return;
      attempts.current.delete(fingerprint);
      setDecision(null);
      setReason('');
      setNotice(reviewed.kind === 'create' ? (ar ? 'تم تسجيل منحة الوصول للمشروع.' : 'The project access grant was recorded.')
        : reviewed.kind === 'change' ? (ar ? 'تم تحديث مستوى الوصول وتسجيل القرار.' : 'The access level was updated and the decision recorded.')
        : (ar ? 'تم إلغاء منحة الوصول للمشروع وتسجيل القرار.' : 'The project access grant was revoked and the decision recorded.'));
      triggerRefresh();
    } catch (cause) {
      if (currentScope.current !== requestScope) return;
      setDecisionError(cause instanceof Error ? cause.message : (ar ? 'تعذر تأكيد القرار. أعد محاولة الطلب نفسه.' : 'The decision could not be confirmed. Retry the same request.'));
      setConflict(cause instanceof ApiError && cause.status === 409);
    } finally {
      if (currentScope.current === requestScope) { busy.current = false; setSubmitting(false); }
    }
  };

  const invalidForm = !reason.trim() || reason.trim().length > 2000 || !canManage || loading
    || (decision?.kind === 'create' && (!projectId || !reviewedMember))
    || (decision?.kind !== 'revoke' && isClient && accessLevel !== 'viewer')
    || (decision?.kind === 'change' && accessLevel === decision.grant.accessLevel);
  const title = decision?.kind === 'create' ? (ar ? 'منح صلاحية مشروع' : 'Grant project access')
    : decision?.kind === 'change' ? (ar ? 'تغيير مستوى الوصول' : 'Change access level')
    : (ar ? 'إلغاء صلاحية المشروع' : 'Revoke project access');

  return <div className="access-administration" dir={ar ? 'rtl' : 'ltr'}>
    <header className="access-heading">
      <div><span className="access-eyebrow">{ar ? 'إدارة الوصول' : 'ACCESS ADMINISTRATION'}</span><h1>{ar ? 'صلاحيات المشاريع' : 'Project access'}</h1><p>{ar ? 'منح وصول محددة تربط أعضاء الجهة بالمشاريع.' : 'Explicit access grants connecting organization members to projects.'}</p></div>
      <div className="access-actions">
        <Button variant="secondary" onClick={() => navigate('/admin/users')}>{ar ? 'المستخدمون' : 'Users'}</Button>
        <Button variant="secondary" onClick={() => navigate('/admin/roles')}>{ar ? 'دليل الأدوار' : 'Role reference'}</Button>
        <Button variant="secondary" disabled={loading || submitting} onClick={() => setReload((value) => value + 1)}>{ar ? 'تحديث' : 'Refresh'}</Button>
        <Button id="project-access-create" disabled={!canManage || loading || projects.length === 0 || activeMembers.length === 0} title={capabilities?.disabledReasons.projectAccess} onClick={() => openDecision({ kind: 'create' })}>{ar ? 'منح الوصول' : 'Grant access'}</Button>
      </div>
    </header>

    <section className="access-context-panel" aria-label={ar ? 'نطاق الوصول' : 'Access scope'}>
      <div className="access-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg></div>
      <div><Badge variant="purple">{currentOrg.name}</Badge><h2>{ar ? 'وصول محدد لكل مشروع' : 'Access is specific to each project'}</h2><p>{ar ? 'ملكية المشروع أو إدارة الجهة لا تمنح الوصول إلى محتوى المشروع تلقائياً. تُطبّق صلاحيات الدور ونطاق الجمهور على كل منحة؛ المحرر لا يصبح معتمداً تلقائياً.' : 'Project ownership or organization administration does not automatically grant access to project content. Role permissions and audience restrictions still apply; editor access does not confer approval authority.'}</p></div>
    </section>

    {notice && <div className="access-notice" role="status">{notice}</div>}
    {!loading && !error && <div className="access-summary" aria-label={ar ? 'ملخص المنح المسجلة' : 'Recorded grant summary'}>
      <span><strong>{grants.filter((grant) => !grant.isRevoked).length}</strong>{ar ? 'منح غير ملغاة' : 'Unrevoked grants'}</span>
      <span><strong>{grants.filter((grant) => grant.effectiveAccess).length}</strong>{ar ? 'وصول فعّال' : 'Effective access'}</span>
      <span><strong>{grants.filter((grant) => grant.isRevoked).length}</strong>{ar ? 'منح ملغاة' : 'Revoked grants'}</span>
    </div>}
    {!loading && !error && !canManage && <p className="access-muted">{capabilities?.disabledReasons.projectAccess || (ar ? 'إدارة منح المشاريع تتطلب مسؤولاً أعلى داخلياً حالياً.' : 'Managing project grants requires current internal Super Admin authority.')}</p>}

    <Card noPadding>
      <div className="access-toolbar">
        <div className="access-project-filter"><Select id="project-access-filter" label={ar ? 'المشروع' : 'Project'} value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} disabled={loading} options={[{ value: '', label: ar ? 'كل المشاريع' : 'All projects' }, ...projects.map((project) => ({ value: project.id, label: `${project.projectCode} · ${project.title}` }))]} /></div>
        <Input id="project-access-search" label={ar ? 'البحث في المنح' : 'Find a grant'} placeholder={ar ? 'الاسم أو البريد أو المشروع' : 'Name, email or project'} value={search} onChange={(event) => setSearch(event.target.value)} containerStyle={{ flex: '1 1 220px', marginBottom: 0 }} />
        <div className="access-filters" role="group" aria-label={ar ? 'حالة المنحة' : 'Grant status'}>{(['all', 'active', 'revoked'] as const).map((status) => <Button key={status} size="sm" variant={statusFilter === status ? 'primary' : 'secondary'} aria-pressed={statusFilter === status} onClick={() => setStatusFilter(status)}>{status === 'all' ? (ar ? 'الكل' : 'All') : status === 'active' ? (ar ? 'غير ملغاة' : 'Unrevoked') : (ar ? 'ملغاة' : 'Revoked')}</Button>)}</div>
      </div>
      {loading ? <p className="access-empty" role="status">{ar ? 'جارٍ التحقق من منح المشاريع والعضويات الحالية...' : 'Loading project grants and current memberships...'}</p>
        : error ? <div className="access-error" role="alert"><strong>{ar ? 'تعذر التحقق من صلاحيات المشاريع.' : 'Project access could not be verified.'}</strong><p>{error}</p><Button variant="secondary" onClick={() => setReload((value) => value + 1)}>{ar ? 'إعادة المحاولة' : 'Retry'}</Button></div>
        : visible.length === 0 ? <div className="access-empty" role="status"><strong>{ar ? 'لا توجد منح تطابق هذا العرض.' : 'No recorded grants match this view.'}</strong><p>{projects.length === 0 ? (ar ? 'لم يُرجع الخادم مشاريع متاحة للإدارة في هذه الجهة.' : 'The server returned no projects available for administration in this organization.') : activeMembers.length === 0 ? (ar ? 'لا توجد عضويات حالية مؤهلة لمنح الوصول.' : 'There are no current eligible memberships to grant access.') : (ar ? 'اختر مشروعاً آخر أو امسح البحث، أو أنشئ منحة جديدة لعضوية حالية.' : 'Choose another project, clear the search, or grant access to a current member.')}</p></div>
        : <div className="access-grant-list" role="list" aria-label={ar ? 'منح المشاريع' : 'Project grants'}>{visible.map((grant) => <article className="access-grant-row" key={grant.id} role="listitem">
          <div><code dir="ltr">{grant.projectCode}</code><h3>{grant.projectTitle}</h3><p>{ar ? 'إصدار السجل' : 'Record version'} <bdi>{grant.rowVersion}</bdi> · {dateLabel(grant.updatedAt)}</p></div>
          <div><h3>{grant.userName}</h3><p dir="ltr" style={{ textAlign: 'start' }}>{grant.email}</p><p>{grant.accessLevel === 'editor' ? (ar ? 'محرر' : 'Editor') : (ar ? 'مشاهد' : 'Viewer')}</p></div>
          <div className="access-grant-state"><Badge variant={grant.isRevoked ? 'warning' : grant.effectiveAccess ? 'success' : 'neutral'}>{grant.isRevoked ? (ar ? 'ملغاة' : 'Revoked') : grant.effectiveAccess ? (ar ? 'وصول فعّال' : 'Effective access') : (ar ? 'الوصول غير فعّال' : 'Access inactive')}</Badge>{grant.membershipRevoked && <p>{ar ? 'عضوية الجهة ملغاة' : 'Organization membership revoked'}</p>}{grant.isRevoked && <p>{dateLabel(grant.revokedAt)}</p>}</div>
          <div className="access-grant-actions">{canManage && !grant.isRevoked ? <><Button size="sm" variant="secondary" disabled={grant.membershipRevoked} onClick={() => openDecision({ kind: 'change', grant })}>{ar ? 'تغيير المستوى' : 'Change level'}</Button><Button size="sm" variant="danger" onClick={() => openDecision({ kind: 'revoke', grant })}>{ar ? 'إلغاء الوصول' : 'Revoke'}</Button></> : <span className="access-muted">{ar ? 'سجل محفوظ' : 'Retained record'}</span>}</div>
        </article>)}</div>}
    </Card>

    <Modal isOpen={decision !== null} onClose={closeDecision} title={title} footer={<>
      <Button variant="secondary" disabled={submitting} onClick={closeDecision}>{ar ? 'إغلاق' : 'Close'}</Button>
      <Button form="project-access-decision-form" type="submit" variant={decision?.kind === 'revoke' ? 'danger' : 'primary'} disabled={invalidForm} isLoading={submitting}>{decisionError && !conflict ? (ar ? 'إعادة محاولة الطلب' : 'Retry request') : title}</Button>
    </>}>
      {decision && <form id="project-access-decision-form" className="access-form" onSubmit={submit}>
        {decision.kind === 'create' ? <>
          <Select id="project-access-project" label={ar ? 'المشروع' : 'Project'} value={projectId} onChange={(event) => setProjectId(event.target.value)} disabled={submitting} required options={[{ value: '', label: ar ? 'اختر مشروعاً' : 'Choose a project' }, ...projects.map((project) => ({ value: project.id, label: `${project.projectCode} · ${project.title}` }))]} />
          <Select id="project-access-membership" label={ar ? 'العضوية الحالية' : 'Current membership'} value={membershipId} onChange={(event) => { setMembershipId(event.target.value); if (activeMembers.find((member) => member.membershipId === event.target.value)?.audience === 'client') setAccessLevel('viewer'); }} disabled={submitting} required options={[{ value: '', label: ar ? 'اختر عضواً حالياً' : 'Choose a current member' }, ...activeMembers.map((member) => ({ value: member.membershipId, label: `${member.name} · ${member.email} · ${member.role}` }))]} />
        </> : <div className="access-form-context"><strong>{decision.grant.projectCode} · {decision.grant.projectTitle}</strong><p>{decision.grant.userName} · {decision.grant.email}</p><p>{ar ? 'الإصدار الذي تتم مراجعته:' : 'Reviewed record version:'} <bdi>{decision.grant.rowVersion}</bdi></p></div>}
        {decision.kind !== 'revoke' && <fieldset disabled={submitting}><legend>{ar ? 'مستوى الوصول' : 'Access level'}</legend><div className="access-level-options">{(['viewer', 'editor'] as const).map((level) => <label className="access-level-option" key={level}><input type="radio" name="project-access-level" value={level} checked={accessLevel === level} disabled={level === 'editor' && isClient} onChange={() => setAccessLevel(level)} /><span><strong>{level === 'viewer' ? (ar ? 'مشاهد' : 'Viewer') : (ar ? 'محرر' : 'Editor')}</strong><small>{level === 'viewer' ? (ar ? 'قراءة المحتوى المسموح به للدور والنطاق.' : 'Read content permitted by role and audience.') : (ar ? 'تعديل ما تسمح به صلاحيات الدور؛ دون صلاحية اعتماد إضافية.' : 'Edit where role permissions allow; no additional approval authority.')}</small></span></label>)}</div>{isClient && <p>{ar ? 'عضويات العملاء تدعم مستوى المشاهد فقط.' : 'Client memberships support viewer access only.'}</p>}</fieldset>}
        {decision.kind === 'revoke' && <p>{ar ? 'ستُلغى هذه المنحة للمشروع مع الاحتفاظ بالعضوية وسجل القرارات. سيُتحقق من الإصدار الحالي قبل الحفظ.' : 'This project grant will be revoked while the membership and decision history remain. The current record version is checked before saving.'}</p>}
        <Textarea id="project-access-reason" label={ar ? 'سبب القرار' : 'Reason for this decision'} value={reason} onChange={(event) => setReason(event.target.value)} disabled={submitting} required maxLength={2000} rows={3} />
        {decisionError && <div className="access-form-error" role="alert">{decisionError}<p>{conflict ? (ar ? 'راجع السجل الحالي قبل إنشاء قرار جديد.' : 'Review the current record before making a new decision.') : (ar ? 'أعد الطلب دون تغيير للاحتفاظ بمفتاح المحاولة نفسه.' : 'Retry without changing the request to reuse its command key.')}</p>{conflict && <Button variant="secondary" disabled={submitting} onClick={() => { setDecision(null); setReload((value) => value + 1); }}>{ar ? 'إعادة تحميل السجل للمراجعة' : 'Reload for review'}</Button>}</div>}
      </form>}
    </Modal>
  </div>;
};
