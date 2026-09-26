import React, { useEffect, useRef, useState } from 'react';
import { useEosContext } from '../context/EosContext.js';
import type { AdminAccessCapabilities, CreateInvitationInput, InvitationSummary } from '../services/api-client.js';
import { Badge, Button, Card, Input, Modal, Select, Textarea } from './DesignSystem.js';

const roleLabels: Record<string, [string, string]> = {
  project_director: ['Project director', 'مدير إدارة المشاريع'], project_manager: ['Project manager', 'مدير مشروع'],
  finance: ['Finance', 'المالية'], procurement: ['Procurement', 'المشتريات'], design_production: ['Design & production', 'التصميم والإنتاج'],
  operations: ['Operations', 'العمليات'], logistics: ['Logistics', 'الخدمات اللوجستية'], hse_quality: ['HSE & quality', 'السلامة والجودة'],
  marketing_commercial: ['Marketing & commercial', 'التسويق والشؤون التجارية'], field_supervisor: ['Field supervisor', 'مشرف ميداني'], client_user: ['Client user', 'مستخدم عميل'],
};
export const invitationRoleLabel = (role: string, ar: boolean) => roleLabels[role]?.[ar ? 1 : 0] || role;

export function InvitationsPanel({ capabilities, isOpen, onClose }: { capabilities: AdminAccessCapabilities; isOpen: boolean; onClose: () => void }) {
  const { apiClient, currentOrg, currentLanguage, refreshTrigger, triggerRefresh } = useEosContext();
  const ar = currentLanguage === 'ar';
  const [invitations, setInvitations] = useState<InvitationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [listFilter, setListFilter] = useState<'pending' | 'all'>('pending');
  const [busy, setBusy] = useState(false);
  const [commandError, setCommandError] = useState('');
  const [draft, setDraft] = useState<CreateInvitationInput>({ email: '', name: '', role: '', reason: '' });
  const [cancelTarget, setCancelTarget] = useState<InvitationSummary | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const attempt = useRef<{ payload: string; key: string } | null>(null);
  const cancelAttempt = useRef<{ payload: string; key: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setInvitations([]);
    apiClient.getInvitations().then((data) => { if (active) setInvitations(data); })
      .catch((e: Error) => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [apiClient, currentOrg.id, refreshTrigger]);

  useEffect(() => {
    if (isOpen) { setDraft({ email: '', name: '', role: '', reason: '' }); setCommandError(''); attempt.current = null; }
  }, [isOpen]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !capabilities.canInvite) return;
    const input = { email: draft.email.trim().toLowerCase(), name: draft.name.trim(), role: draft.role, reason: draft.reason.trim() };
    if (!input.name || !input.email || !input.role || !input.reason) return;
    const payload = JSON.stringify(input);
    if (attempt.current?.payload !== payload) attempt.current = { payload, key: crypto.randomUUID() };
    setBusy(true); setCommandError('');
    try {
      await apiClient.createInvitation(input, attempt.current.key);
      setNotice(ar ? 'تم تسجيل الدعوة وإضافتها إلى قائمة انتظار التسليم. لم يتم تأكيد إرسال بريد أو منح عضوية.' : 'Invitation recorded and queued for delivery. No email delivery or membership has been confirmed.');
      onClose(); triggerRefresh();
    } catch (e: any) { setCommandError(e.message); }
    finally { setBusy(false); }
  };

  const cancel = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!cancelTarget || !cancelReason.trim() || busy || !capabilities.canCancelInvitations) return;
    const reason = cancelReason.trim(); const payload = JSON.stringify({ id: cancelTarget.id, reason });
    if (cancelAttempt.current?.payload !== payload) cancelAttempt.current = { payload, key: crypto.randomUUID() };
    setBusy(true); setCommandError('');
    try {
      await apiClient.cancelInvitation(cancelTarget.id, reason, cancelAttempt.current.key);
      setCancelTarget(null);
      setNotice(ar ? 'تم إلغاء الدعوة وتسجيل القرار. لم تعد الدعوة قابلة للقبول.' : 'Invitation cancelled and decision recorded. It can no longer be accepted.');
      triggerRefresh();
    } catch (e: any) { setCommandError(e.message); }
    finally { setBusy(false); }
  };

  const statusLabel = (status: InvitationSummary['status']) => ({ pending: ar ? 'بانتظار القبول' : 'Awaiting acceptance', expired: ar ? 'منتهية الصلاحية' : 'Expired', accepted: ar ? 'مقبولة' : 'Accepted', cancelled: ar ? 'ملغاة' : 'Cancelled', legacy_unverified: ar ? 'دعوة قديمة غير موثقة' : 'Legacy · unverified' })[status] || (ar ? 'غير معروف' : 'Unknown');
  const date = (value: string) => new Date(value).toLocaleString(ar ? 'ar-QA' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  const visibleInvitations = invitations.filter((invitation) => listFilter === 'all' || invitation.status === 'pending');

  return <>
    <Card title={ar ? 'دعوات الجهة' : 'Organization invitations'} subtitle={ar ? 'آخر 100 دعوة مسجلة · التسليم منفصل عن القبول' : 'Latest 100 recorded invitations · delivery and acceptance are separate'} style={{ marginBottom: 24 }}>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
        {ar ? 'تُحفظ الدعوات في قائمة انتظار مشفرة. خدمة إرسال البريد لم تُفعّل بعد؛ الحالة «في الانتظار» لا تعني وصول الدعوة. لن تُمنح أي عضوية قبل القبول.' : 'Invitations are stored in an encrypted queue. Email delivery is not activated yet; queued does not mean delivered. No membership is granted before acceptance.'}
      </p>
      {!capabilities.canInvite && <p style={{ marginBottom: 12, color: 'var(--text-muted)', fontSize: 13 }}>{ar ? 'إنشاء الدعوات غير متاح لهذه الجلسة أو لم تكتمل إعدادات التسليم الآمن.' : capabilities.disabledReasons.invite || 'Invitation creation is unavailable for this session.'}</p>}
      {!loading && !error && <div role="group" aria-label={ar ? 'عرض الدعوات' : 'Invitation view'} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <Button size="sm" variant={listFilter === 'pending' ? 'primary' : 'secondary'} aria-pressed={listFilter === 'pending'} onClick={() => setListFilter('pending')}>{ar ? 'بانتظار القبول' : 'Awaiting acceptance'} ({invitations.filter((invitation) => invitation.status === 'pending').length})</Button>
        <Button size="sm" variant={listFilter === 'all' ? 'primary' : 'secondary'} aria-pressed={listFilter === 'all'} onClick={() => setListFilter('all')}>{ar ? 'كل الدعوات' : 'All invitations'} ({invitations.length})</Button>
      </div>}
      {notice && <p role="status" style={{ marginBottom: 12 }}>{notice}</p>}
      {loading ? <p role="status">{ar ? 'جارٍ تحميل الدعوات...' : 'Loading invitations...'}</p>
        : error ? <div role="alert"><p style={{ marginBottom: 10 }}>{error}</p><Button variant="secondary" onClick={triggerRefresh}>{ar ? 'إعادة المحاولة' : 'Retry invitations'}</Button></div>
        : visibleInvitations.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{ar ? 'لا توجد دعوات تطابق هذا العرض.' : 'No invitations match this view.'}</p>
        : <div className="invitation-list" role="region" aria-label={ar ? 'سجل الدعوات' : 'Invitation records'} tabIndex={0} style={{ maxHeight: 480, overflowY: 'auto', padding: 3 }}>{visibleInvitations.map((invitation) => <article key={invitation.id} className="invitation-row">
          <div style={{ minWidth: 0, flex: '1 1 220px', overflowWrap: 'anywhere' }}><strong>{invitation.name}</strong><p dir="ltr" style={{ color: 'var(--text-secondary)', marginBlock: 5, textAlign: ar ? 'right' : 'left' }}>{invitation.email}</p><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{invitationRoleLabel(invitation.role, ar)} · {invitation.audience === 'client' ? (ar ? 'عميل' : 'Client') : invitation.audience === 'internal' ? (ar ? 'داخلي' : 'Internal') : '—'}</span></div>
          <div style={{ flex: '1 1 190px' }}><Badge variant={invitation.status === 'accepted' ? 'success' : invitation.status === 'pending' ? 'purple' : 'warning'}>{statusLabel(invitation.status)}</Badge><p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBlock: 7 }}>{ar ? 'الصلاحية: ' : 'Expires: '}{date(invitation.expiresAt)}</p><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{invitation.deliveryStatus === 'queued' ? (ar ? 'التسليم في الانتظار · غير مؤكد' : 'Delivery queued · unconfirmed') : invitation.deliveryStatus === 'cancelled' ? (ar ? 'تم إلغاء التسليم' : 'Delivery cancelled') : (ar ? 'لا يوجد تسليم مسجل' : 'No delivery queued')}</span></div>
          {capabilities.canCancelInvitations && ['pending', 'expired'].includes(invitation.status) && <Button variant="secondary" size="sm" onClick={() => { setCancelTarget(invitation); setCancelReason(''); setCommandError(''); cancelAttempt.current = null; }}>{ar ? 'إلغاء الدعوة' : 'Cancel invitation'}</Button>}
        </article>)}</div>}
    </Card>

    <Modal isOpen={isOpen} onClose={() => { if (!busy) onClose(); }} title={ar ? 'دعوة مستخدم إلى الجهة' : 'Invite a user to this organization'} footer={<><Button variant="secondary" disabled={busy} onClick={onClose}>{ar ? 'إلغاء' : 'Cancel'}</Button><Button isLoading={busy} disabled={!capabilities.canInvite || !draft.email.trim() || !draft.name.trim() || !draft.role || !draft.reason.trim()} onClick={() => formRef.current?.requestSubmit()}>{ar ? 'إنشاء دعوة في الانتظار' : 'Queue invitation'}</Button></>}>
      <form ref={formRef} onSubmit={create}>
        <p style={{ marginBottom: 18, color: 'var(--text-secondary)' }}>{currentOrg.name}</p>
        <Input id="invitation-name" label={ar ? 'اسم المستلم' : 'Recipient name'} required maxLength={200} autoComplete="off" value={draft.name} disabled={busy} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <Input id="invitation-email" label={ar ? 'البريد الإلكتروني' : 'Email address'} type="email" required maxLength={254} dir="ltr" autoComplete="off" value={draft.email} disabled={busy} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
        <Select id="invitation-role" label={ar ? 'دور العضوية' : 'Membership role'} required value={draft.role} disabled={busy} onChange={(e) => setDraft({ ...draft, role: e.target.value })} options={[{ value: '', label: ar ? 'اختر دوراً' : 'Choose a role' }, ...capabilities.allowedInvitationRoles.map((role) => ({ value: role, label: invitationRoleLabel(role, ar) }))]} />
        <Textarea id="invitation-reason" label={ar ? 'سبب الدعوة' : 'Reason for invitation'} required maxLength={2000} value={draft.reason} disabled={busy} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} />
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{ar ? 'لن تُمنح صلاحيات المشاريع. الأدوار الإدارية العليا تتطلب إجراءً منفصلاً ولا تتوفر في هذه الدعوة. تُسجل الدعوة في انتظار التسليم؛ لم تُفعّل خدمة إرسال البريد.' : 'Project access is separate. Privileged administrator roles require a separate controlled process. This queues an invitation; email delivery is not activated.'}</p>
        {commandError && <p role="alert" style={{ marginTop: 12, color: 'var(--status-critical-fg)' }}>{commandError}</p>}
      </form>
    </Modal>

    <Modal isOpen={cancelTarget !== null} onClose={() => { if (!busy) setCancelTarget(null); }} title={ar ? 'إلغاء الدعوة' : 'Cancel invitation'} footer={<><Button variant="secondary" disabled={busy} onClick={() => setCancelTarget(null)}>{ar ? 'رجوع' : 'Keep invitation'}</Button><Button variant="danger" isLoading={busy} disabled={!cancelReason.trim()} onClick={() => cancel()}>{ar ? 'تأكيد الإلغاء' : 'Confirm cancellation'}</Button></>}>
      <form onSubmit={cancel}><p style={{ marginBottom: 16, overflowWrap: 'anywhere' }}>{cancelTarget?.name}<br />{cancelTarget?.email}</p><Textarea id="cancel-invitation-reason" label={ar ? 'سبب الإلغاء' : 'Reason for cancellation'} required maxLength={2000} disabled={busy} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />{commandError && <p role="alert" style={{ color: 'var(--status-critical-fg)' }}>{commandError}</p>}</form>
    </Modal>
  </>;
}
