import React, { useRef, useState } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Button, Modal, Textarea } from './DesignSystem.js';
import type { AdminMembership } from '../services/api-client.js';

export function MembershipChangeModal({ member, mode, allowedRoles, onClose, onComplete }: {
  member: AdminMembership; mode: 'role' | 'restore'; allowedRoles: string[];
  onClose: () => void; onComplete: (message: string) => void;
}) {
  const { apiClient, currentLanguage } = useEosContext();
  const ar = currentLanguage === 'ar';
  const [role, setRole] = useState(member.role);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const attempt = useRef<{ signature: string; key: string } | null>(null);
  const roles = allowedRoles.filter((value) => (value === 'client_user' ? 'client' : 'internal') === member.audience);
  const valid = reason.trim().length > 0 && (mode === 'restore' || (role !== member.role && roles.includes(role))) && Number.isSafeInteger(member.rowVersion);
  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!valid || busy || stale) return;
    const input = { reason: reason.trim(), expectedVersion: member.rowVersion };
    const signature = JSON.stringify({ id: member.membershipId, mode, ...input, role });
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: crypto.randomUUID() };
    setBusy(true); setError(null);
    try {
      if (mode === 'role') await apiClient.changeMembershipRole(member.membershipId, { ...input, role }, attempt.current.key);
      else await apiClient.restoreMembership(member.membershipId, input, attempt.current.key);
      onComplete(mode === 'role'
        ? (ar ? `تم تحديث دور ${member.name}. يلزم تسجيل الدخول مجدداً.` : `${member.name}'s role was updated. A fresh sign-in is required.`)
        : (ar ? `تمت استعادة عضوية ${member.name}. يلزم تسجيل الدخول ومنح صلاحيات المشاريع مجدداً.` : `${member.name}'s membership was restored. Fresh sign-in and new project grants are required.`));
    } catch (e: any) {
      setError(e.message || (ar ? 'تعذر تأكيد القرار.' : 'The decision could not be confirmed.'));
      setStale(e.status === 409);
    } finally { setBusy(false); }
  };
  return <Modal isOpen onClose={() => { if (!busy) onClose(); }}
    title={mode === 'role' ? (ar ? 'تغيير دور العضوية' : 'Change membership role') : (ar ? 'استعادة عضوية الجهة' : 'Restore organization membership')}
    footer={<><Button variant="secondary" disabled={busy} onClick={onClose}>{stale ? (ar ? 'إغلاق وتحديث' : 'Close and refresh') : (ar ? 'إلغاء' : 'Cancel')}</Button>
      <Button disabled={!valid || stale} isLoading={busy} onClick={() => submit()}>{mode === 'role' ? (ar ? 'تأكيد تغيير الدور' : 'Confirm role change') : (ar ? 'تأكيد الاستعادة' : 'Confirm restoration')}</Button></>}>
    <form onSubmit={submit} style={{ display: 'grid', gap: 14, lineHeight: 1.6 }}>
      <p><strong>{member.name}</strong><br />{member.email}</p>
      <p style={{ color: 'var(--text-secondary)' }}>{member.organisationName} · {member.role} · {ar ? 'الإصدار' : 'Version'} {member.rowVersion}</p>
      {mode === 'role' && <label style={{ display: 'grid', gap: 8, marginBottom: 16 }}>{ar ? 'الدور الجديد' : 'New role'}
        <select value={role} onChange={(e) => setRole(e.target.value)} disabled={busy} style={{ width: '100%', padding: 12, borderRadius: 10, background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>
          {!roles.includes(member.role) && <option value={member.role}>{member.role}</option>}
          {roles.map((value) => <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>)}
        </select>
      </label>}
      <p>{ar ? 'سيتم تسجيل الخروج من جميع الجلسات الحالية لهذا المستخدم في جميع الأجهزة والجهات. يجب تسجيل الدخول مجدداً.' : 'All current sessions for this user will be signed out across every device and organization. They must sign in again.'}</p>
      <p style={{ color: 'var(--text-secondary)' }}>{mode === 'restore'
        ? (ar ? 'لا تعيد الاستعادة أي صلاحيات سابقة للمشاريع. يجب منح صلاحيات جديدة من سجل صلاحيات المشاريع.' : 'Restoration does not restore previous project access. Assign new grants from the project access register.')
        : (ar ? 'يبقى نطاق المشاريع المسجل كما هو، وتخضع الإجراءات لصلاحيات الدور الجديد. لا يغيّر هذا الإجراء نطاق الجمهور.' : 'Recorded project scope stays in place; actions are limited by the new role. This action keeps the existing audience.')}</p>
      <Textarea id="membership-change-reason" label={ar ? 'سبب القرار' : 'Reason for decision'} value={reason} onChange={(e) => setReason(e.target.value)} required maxLength={2000} disabled={busy} />
      {error && <p role="alert" style={{ color: 'var(--status-critical-fg)' }}>{error}</p>}
      {stale && <p role="status">{ar ? 'أغلق النافذة وحدّث القائمة ثم راجع العضوية الحالية قبل المحاولة مجدداً.' : 'Close this dialog, refresh the list and review the current membership before trying again.'}</p>}
    </form>
  </Modal>;
}
