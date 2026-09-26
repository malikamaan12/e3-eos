import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, Badge, Button, Modal, Input, Textarea } from '../components/DesignSystem.js';
import type { AdminAccessCapabilities, AdminMembership } from '../services/api-client.js';
import { MembershipChangeModal } from '../components/MembershipChangeModal.js';
import { InvitationsPanel } from '../components/InvitationsPanel.js';

export const AdminUsersView: React.FC = () => {
  const { currentLanguage, apiClient, navigate, refreshTrigger, triggerRefresh, switchPersona, currentUser, currentOrg } = useEosContext();
  const ar = currentLanguage === 'ar';
  const [users, setUsers] = useState<AdminMembership[]>([]);
  const [capabilities, setCapabilities] = useState<AdminAccessCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'revoked'>('all');
  const [membershipChange, setMembershipChange] = useState<{ member: AdminMembership; mode: 'role' | 'restore' } | null>(null);
  const [target, setTarget] = useState<AdminMembership | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const attempt = useRef<{ membershipId: string; reason: string; key: string } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setUsers([]);
    setCapabilities(null);
    Promise.all([apiClient.getAdminUsers(), apiClient.getAdminAccessCapabilities()])
      .then(([memberships, access]) => { if (active) { setUsers(memberships); setCapabilities(access); } })
      .catch((e: Error) => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [apiClient, refreshTrigger, currentOrg.id, currentUser?.id]);

  useEffect(() => {
    setTarget(null);
    setMembershipChange(null);
    setInviteOpen(false);
    setReason('');
    setNotice(null);
    attempt.current = null;
  }, [currentOrg.id, currentUser?.id]);

  const visibleUsers = useMemo(() => users.filter((u) => {
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'revoked' ? u.isRevoked : !u.isRevoked);
    return matchesStatus && `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(search.toLowerCase());
  }), [users, statusFilter, search]);

  const openRevocation = (membership: AdminMembership) => {
    setTarget(membership);
    setReason('');
    setDecisionError(null);
    attempt.current = null;
  };

  const revoke = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!target || !reason.trim() || submitting) return;
    const reviewed = target;
    const normalizedReason = reason.trim();
    if (!attempt.current || attempt.current.membershipId !== reviewed.membershipId || attempt.current.reason !== normalizedReason) {
      attempt.current = { membershipId: reviewed.membershipId, reason: normalizedReason, key: crypto.randomUUID() };
    }
    setSubmitting(true);
    setDecisionError(null);
    try {
      await apiClient.revokeMembership(reviewed.membershipId, normalizedReason, attempt.current.key);
      setTarget(null);
      setReason('');
      setNotice(ar ? `تم إلغاء عضوية ${reviewed.name} وتسجيل القرار.` : `${reviewed.name}'s membership was revoked and the decision recorded.`);
      triggerRefresh();
    } catch (e: any) {
      setDecisionError(e.message || (ar ? 'تعذر تأكيد إلغاء العضوية.' : 'Membership revocation could not be confirmed.'));
    } finally {
      setSubmitting(false);
    }
  };

  const previewRole = async (user: AdminMembership) => {
    setPreviewing(user.id);
    setError(null);
    try { await switchPersona(user.email); }
    catch (e: any) { setError(e.message || (ar ? 'معاينة الدور غير متاحة.' : 'Role preview is unavailable.')); }
    finally { setPreviewing(null); }
  };

  const columns = 'minmax(180px,1.3fr) minmax(205px,1.5fr) 175px 90px 100px 140px';
  const unavailable = ar
    ? 'عضوية الجهة وصلاحيات المشاريع ضوابط منفصلة. تغيير الدور أو استعادة العضوية يتطلب سبباً مسجلاً وتسجيل الدخول مجدداً. الأدوار المميزة تحتاج مسار حوكمة منفصلاً.'
    : 'Organization membership and project access are separate controls. Role changes and restoration require a recorded reason and fresh sign-in. Privileged roles require a separate governance process.';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{ar ? 'إدارة المستخدمين والصلاحيات' : 'User Administration'}</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '6px 0' }}>{ar ? 'عضويات الجهة الحالية وحالة الوصول المسجلة.' : 'Recorded memberships and access status for your current organization.'}</p>
          <Badge variant="purple">{currentOrg.name}</Badge>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={() => navigate('/admin/access')}>{ar ? 'صلاحيات المشاريع' : 'Project access'}</Button>
          <Button variant="secondary" onClick={() => navigate('/admin/roles')}>{ar ? 'دليل الأدوار' : 'Role reference'}</Button>
          <Button variant="secondary" onClick={triggerRefresh} disabled={loading}>{ar ? 'تحديث' : 'Refresh'}</Button>
          <Button id="admin-invite-user-btn" disabled={!capabilities?.canInvite || loading} title={capabilities?.disabledReasons.invite} onClick={() => setInviteOpen(true)}>{ar ? 'دعوة مستخدم' : 'Invite user'}</Button>
        </div>
      </div>

      <p style={{ padding: 14, border: '1px solid var(--border-default)', borderRadius: 12, color: 'var(--text-secondary)', fontSize: 13 }}>{unavailable}</p>
      {notice && <p role="status" style={{ color: 'var(--text-primary)' }}>{notice}</p>}
      {error && <div role="alert" style={{ padding: 16, marginBottom: 16, border: '1px solid var(--status-critical-fg)', borderRadius: 12 }}>
        <strong>{ar ? 'تعذر التحقق من صلاحيات المستخدمين.' : 'User access could not be verified.'}</strong>
        <p>{error}</p>
        <Button variant="secondary" onClick={triggerRefresh}>{ar ? 'إعادة المحاولة' : 'Retry'}</Button>
      </div>}

      {capabilities?.canManageMemberships && <InvitationsPanel capabilities={capabilities} isOpen={inviteOpen} onClose={() => setInviteOpen(false)} />}

      <Card noPadding>
        <div style={{ padding: 18, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border-default)' }}>
          <Input id="admin-user-search" label={ar ? 'البحث عن مستخدم' : 'Find a user'} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={ar ? 'الاسم أو البريد أو الدور' : 'Name, email or role'} containerStyle={{ flex: '1 1 220px', marginBottom: 0 }} />
          <div role="group" aria-label={ar ? 'حالة العضوية' : 'Membership status'} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['all', 'active', 'revoked'] as const).map((filter) => <Button key={filter} size="sm" variant={statusFilter === filter ? 'primary' : 'secondary'} aria-pressed={statusFilter === filter} onClick={() => setStatusFilter(filter)}>
              {filter === 'all' ? (ar ? 'الكل' : 'All') : filter === 'active' ? (ar ? 'نشطة' : 'Active') : (ar ? 'ملغاة' : 'Revoked')}
              {!loading && !error ? ` (${users.filter((u) => filter === 'all' || (filter === 'revoked' ? u.isRevoked : !u.isRevoked)).length})` : ''}
            </Button>)}
          </div>
        </div>

        {loading ? <p role="status" style={{ padding: 24 }}>{ar ? 'جارٍ تحميل العضويات المسجلة...' : 'Loading recorded memberships...'}</p>
          : error ? null
          : visibleUsers.length === 0 ? <p role="status" style={{ padding: 24, color: 'var(--text-secondary)' }}>{ar ? 'لا توجد عضويات تطابق هذا العرض.' : 'No recorded memberships match this view.'}</p>
          : <div role="region" aria-label={ar ? 'دليل العضويات' : 'Membership directory'} tabIndex={0} style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div role="table" aria-label={ar ? 'عضويات الجهة' : 'Organization memberships'} style={{ minWidth: 1050 }}>
              <div role="row" style={{ display: 'grid', gridTemplateColumns: columns, columnGap: 12, padding: '12px 18px', background: 'var(--surface-2)', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>
                {(ar ? ['المستخدم', 'البريد الإلكتروني', 'الدور المسجل', 'النطاق', 'الحالة', 'الإجراءات'] : ['USER', 'EMAIL', 'RECORDED ROLE', 'AUDIENCE', 'STATUS', 'ACTIONS']).map((label) => <span role="columnheader" key={label}>{label}</span>)}
              </div>
              {visibleUsers.map((user) => <div role="row" key={user.membershipId} style={{ display: 'grid', gridTemplateColumns: columns, columnGap: 12, alignItems: 'center', padding: '16px 18px', borderTop: '1px solid var(--border-subtle)', fontSize: 13, overflowWrap: 'anywhere' }}>
                <div role="cell"><strong>{user.name}</strong>{user.id === currentUser?.id && <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>{ar ? 'الجلسة الحالية' : 'Current session'}</div>}</div>
                <div role="cell" style={{ color: 'var(--text-secondary)' }}>{user.email}</div>
                <div role="cell"><Badge variant={user.role === 'super_admin' ? 'purple' : 'info'}>{user.role || (ar ? 'غير مسجل' : 'Not recorded')}</Badge></div>
                <div role="cell">{user.audience || (ar ? 'غير مسجل' : 'Not recorded')}</div>
                <div role="cell"><Badge variant={user.isRevoked ? 'warning' : 'success'}>{user.isRevoked ? (ar ? 'ملغاة' : 'Revoked') : (ar ? 'نشطة' : 'Active')}</Badge></div>
                <div role="cell" style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                  {capabilities?.canManageMemberships && !user.isRevoked && user.id !== currentUser?.id && <Button size="sm" variant="danger" onClick={() => openRevocation(user)}>{ar ? 'إلغاء العضوية' : 'Revoke access'}</Button>}
                  {user.id !== currentUser?.id && !user.isSuperAdmin && !['super_admin', 'executive'].includes(user.role) && ['internal', 'client'].includes(user.audience) && <>
                    {!user.isRevoked && capabilities?.canChangeRoles && <Button size="sm" variant="secondary" onClick={() => setMembershipChange({ member: user, mode: 'role' })}>{ar ? 'تغيير الدور' : 'Change role'}</Button>}
                    {user.isRevoked && capabilities?.canRestoreMemberships && <Button size="sm" variant="secondary" onClick={() => setMembershipChange({ member: user, mode: 'restore' })}>{ar ? 'استعادة العضوية' : 'Restore membership'}</Button>}
                  </>}
                  {capabilities?.canImpersonate && !user.isRevoked && user.id !== currentUser?.id && <Button size="sm" variant="secondary" isLoading={previewing === user.id} disabled={previewing !== null} onClick={() => previewRole(user)}>{ar ? 'معاينة محلية للدور' : 'Local role preview'}</Button>}
                  {(!capabilities?.canManageMemberships || user.isRevoked || user.id === currentUser?.id) && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{user.isRevoked ? (ar ? 'الوصول موقوف' : 'Access disabled') : (ar ? 'للقراءة فقط' : 'Read only')}</span>}
                </div>
              </div>)}
            </div>
          </div>}
      </Card>

      {membershipChange && <MembershipChangeModal key={membershipChange.member.membershipId + membershipChange.mode}
        member={membershipChange.member} mode={membershipChange.mode} allowedRoles={capabilities?.allowedMembershipRoles || []}
        onClose={() => { setMembershipChange(null); triggerRefresh(); }}
        onComplete={(message) => { setMembershipChange(null); setNotice(message); triggerRefresh(); }} />}

      <Modal isOpen={target !== null} onClose={() => { if (!submitting) setTarget(null); }} title={ar ? 'إلغاء عضوية الجهة' : 'Revoke organization membership'} footer={<>
        <Button variant="secondary" disabled={submitting} onClick={() => setTarget(null)}>{ar ? 'إلغاء' : 'Cancel'}</Button>
        <Button variant="danger" disabled={!reason.trim() || !capabilities?.canManageMemberships} isLoading={submitting} onClick={() => revoke()}>{ar ? 'تأكيد إلغاء العضوية' : 'Confirm revocation'}</Button>
      </>}>
        {target && <form onSubmit={revoke}>
          <p><strong>{target.name}</strong><br />{target.email}</p>
          <p style={{ color: 'var(--text-secondary)' }}>{target.organisationName} · {target.role}</p>
          <p>{ar ? 'ستتوقف صلاحية الوصول لهذه الجهة عند الطلب التالي. تبقى العضوية والقرارات السابقة محفوظة في السجل.' : 'Access to this organization will be denied on the next request. The membership and past decisions remain in the record.'}</p>
          <Textarea id="membership-revocation-reason" label={ar ? 'سبب إلغاء العضوية' : 'Reason for revocation'} value={reason} onChange={(e) => setReason(e.target.value)} required maxLength={2000} disabled={submitting} />
          {decisionError && <div role="alert" style={{ color: 'var(--status-critical-fg)' }}>{decisionError}</div>}
        </form>}
      </Modal>
    </div>
  );
};
