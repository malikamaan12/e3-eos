import React, { useEffect, useRef, useState } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Badge, Button, Card, Input } from '../components/DesignSystem.js';
import { BrandLogo } from '../components/BrandLogo.js';
import { invitationRoleLabel } from '../components/InvitationsPanel.js';
import type { InvitationPreview } from '../services/api-client.js';

export const AcceptInviteView: React.FC = () => {
  const { apiClient, login, navigate, currentLanguage, toggleLanguage, theme, toggleTheme } = useEosContext();
  const ar = currentLanguage === 'ar';
  const [token, setToken] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') || new URLSearchParams(window.location.search).get('token') || '');
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [checking, setChecking] = useState(true);
  const [retry, setRetry] = useState(0);
  const [checkError, setCheckError] = useState('');
  const [checkErrorStatus, setCheckErrorStatus] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState('');
  const attempt = useRef<{ payload: string; key: string } | null>(null);

  useEffect(() => {
    // Keep the bearer invitation only in memory. Reopening the delivered link is
    // required after reload; no token is copied into storage or a login redirect.
    const readLink = () => {
      const url = new URL(window.location.href);
      const incoming = new URLSearchParams(url.hash.slice(1)).get('token') || url.searchParams.get('token');
      if (incoming) {
        setToken(incoming); setPreview(null); setSuccess(false); setChecking(true); setCheckError(''); setError('');
        setPassword(''); setConfirmPassword(''); setSignInPassword(''); setMfaCode(''); setMfaRequired(false); setSignedInEmail(''); attempt.current = null;
      }
      url.searchParams.delete('token'); url.hash = '';
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
    };
    readLink();
    window.addEventListener('hashchange', readLink);
    window.addEventListener('popstate', readLink);
    return () => { window.removeEventListener('hashchange', readLink); window.removeEventListener('popstate', readLink); };
  }, []);

  useEffect(() => {
    let active = true;
    if (!token) { setChecking(false); return; }
    setChecking(true); setCheckError(''); setCheckErrorStatus(null);
    apiClient.inspectInvitation(token).then(async (data) => {
      if (!active) return;
      setPreview(data); setName(data.name);
      if (data.requiresExistingSignIn) {
        try {
          const session = await apiClient.authMe();
          if (active && session.authenticated && session.user?.email?.toLowerCase() === data.email.toLowerCase()) setSignedInEmail(session.user.email);
        } catch { /* Recipient can sign in below. */ }
      }
    }).catch((e: any) => { if (active) { setCheckError(e.message); setCheckErrorStatus(e.status); } })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [apiClient, token, retry]);

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!preview || busy) return;
    setBusy(true); setError('');
    try {
      const result = await login(preview.email, signInPassword, mfaRequired ? mfaCode : undefined);
      if (result.mfaRequired) { setMfaRequired(true); return; }
      if (result.user?.email?.toLowerCase() !== preview.email.toLowerCase()) throw new Error(ar ? 'يجب تسجيل الدخول بالبريد المدعو.' : 'Sign in with the invited email address.');
      setSignedInEmail(result.user.email); setSignInPassword(''); setMfaCode('');
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  const displayedCheckError = checkErrorStatus === 410
    ? (ar ? 'الدعوة غير متاحة؛ قد تكون منتهية الصلاحية أو ملغاة أو مستخدمة، أو لم تعد صلاحية مُصدرها سارية.' : checkError)
    : checkErrorStatus === 503
      ? (ar ? 'تعذر التحقق من الدعوة الآن. حاول مرة أخرى.' : checkError)
      : checkError;

  const accept = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!preview || !token || busy) return;
    setError('');
    const existing = preview.requiresExistingSignIn;
    if (existing && !signedInEmail) return;
    if (!existing && (password.length < 8 || new TextEncoder().encode(password).length > 72)) { setError(ar ? 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل وألا تتجاوز 72 بايت.' : 'Use at least 8 characters and no more than 72 bytes for your password.'); return; }
    if (!existing && password !== confirmPassword) { setError(ar ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.'); return; }
    const payload = JSON.stringify({ token, name: existing ? undefined : name.trim(), existing });
    if (attempt.current?.payload !== payload) attempt.current = { payload, key: crypto.randomUUID() };
    setBusy(true);
    try {
      await apiClient.acceptInvite(token, existing ? undefined : password, existing ? undefined : name.trim(), attempt.current.key);
      setSuccess(true); setToken(''); setPassword(''); setConfirmPassword('');
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  return <main className="eos-invitation-page" dir={ar ? 'rtl' : 'ltr'}>
    <div className="invitation-page-top"><BrandLogo /><div style={{ display: 'flex', gap: 8 }}><Button variant="secondary" onClick={toggleLanguage}>{ar ? 'English' : 'العربية'}</Button><Button variant="secondary" onClick={toggleTheme}>{theme === 'light' ? (ar ? 'الوضع الداكن' : 'Dark mode') : (ar ? 'الوضع الفاتح' : 'Light mode')}</Button></div></div>
    <div className="invitation-layout">
      <section className="invitation-welcome"><span className="invitation-emblem" aria-hidden="true"><img src="/brand/e3-mark.svg" alt="" /></span><p className="invitation-eyebrow">E3 · EVENT OPERATING SYSTEM</p><h1>{ar ? 'مساحة واحدة. فريق متصل.' : 'One workspace. A connected team.'}</h1><p>{ar ? 'راجع الجهة والدور قبل قبول دعوتك. تبدأ عضويتك بعد تسجيل قبولك بنجاح.' : 'Review your organization and role before accepting your invitation. Your membership begins after acceptance is recorded.'}</p><div className="invitation-note">{ar ? 'عضوية الجهة وصلاحيات المشاريع إجراءان منفصلان.' : 'Organization membership and project access are separate.'}</div></section>
      <Card style={{ width: '100%', maxWidth: 510, justifySelf: 'center' }}>
        <h2 style={{ fontSize: 24, marginBottom: 12 }}>{success ? (ar ? 'تم قبول الدعوة' : 'Invitation accepted') : (ar ? 'دعوتك إلى E3' : 'Your E3 invitation')}</h2>
        {success ? <div role="status"><p style={{ lineHeight: 1.7, color: 'var(--text-secondary)' }}>{ar ? 'تم تسجيل العضوية بنجاح. سجّل الدخول للمتابعة. صلاحيات المشاريع تحتاج إلى منح منفصل.' : 'Your membership was recorded successfully. Sign in to continue. Project permissions require a separate grant.'}</p><Button onClick={() => navigate('/login')} style={{ marginTop: 20, width: '100%' }}>{ar ? 'المتابعة إلى تسجيل الدخول' : 'Continue to sign in'}</Button></div>
          : checking ? <p role="status">{ar ? 'جارٍ التحقق من دعوتك...' : 'Verifying your invitation...'}</p>
          : !token || checkError ? <div><p role={checkError ? 'alert' : 'status'} style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{!token ? (ar ? 'افتح رابط الدعوة الذي تلقيته. إذا أعدت تحميل هذه الصفحة، افتح الرابط مرة أخرى.' : 'Open the invitation link you received. If you reloaded this page, reopen the original link.') : displayedCheckError}</p><p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6, marginBlock: 16 }}>{ar ? 'إذا انتهت صلاحية الدعوة أو أُلغيت، اطلب دعوة جديدة من مسؤول الجهة.' : 'If the invitation has expired or was cancelled, ask your organization administrator for a new invitation.'}</p><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{token && <Button variant="secondary" onClick={() => setRetry(retry + 1)}>{ar ? 'إعادة التحقق' : 'Check again'}</Button>}<Button variant="secondary" onClick={() => navigate('/login')}>{ar ? 'تسجيل الدخول' : 'Sign in'}</Button></div></div>
          : preview && <>
            <div className="invitation-summary"><strong style={{ fontSize: 18 }}>{preview.organisationName}</strong><p dir="ltr" style={{ marginBlock: 9, overflowWrap: 'anywhere', textAlign: ar ? 'right' : 'left' }}>{preview.email}</p><Badge variant="purple">{invitationRoleLabel(preview.role, ar)}</Badge><p style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>{ar ? 'تنتهي في: ' : 'Expires: '}{new Date(preview.expiresAt).toLocaleString(ar ? 'ar-QA' : 'en-GB')}</p></div>
            {error && <p role="alert" style={{ color: 'var(--status-critical-fg)', marginBlock: 16 }}>{error}</p>}
            {preview.requiresExistingSignIn && !signedInEmail ? <form onSubmit={signIn}><p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>{ar ? 'يوجد حساب لهذا البريد. سجّل الدخول بحسابك الحالي لقبول الدعوة. لن تغيّر الدعوة كلمة المرور أو الاسم.' : 'This email already has an account. Sign in to accept the invitation. Your existing password and name will stay unchanged.'}</p><Input id="invite-existing-password" label={ar ? 'كلمة المرور الحالية' : 'Current password'} type="password" autoComplete="current-password" required value={signInPassword} disabled={busy || mfaRequired} onChange={(e) => setSignInPassword(e.target.value)} />{mfaRequired && <Input id="invite-mfa-code" label={ar ? 'رمز المصادقة' : 'Authenticator code'} inputMode="numeric" autoComplete="one-time-code" required value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} />}<Button type="submit" isLoading={busy} style={{ width: '100%' }}>{ar ? 'تسجيل الدخول للمتابعة' : 'Sign in to continue'}</Button></form>
              : <form onSubmit={accept}>{preview.requiresExistingSignIn ? <p style={{ fontSize: 13, marginBottom: 18, overflowWrap: 'anywhere' }}>{ar ? 'تم تسجيل الدخول: ' : 'Signed in as '}{signedInEmail}</p> : <><Input id="invite-name-input" label={ar ? 'الاسم الكامل' : 'Full name'} required maxLength={200} autoComplete="name" disabled={busy} value={name} onChange={(e) => setName(e.target.value)} /><Input id="invite-password-input" label={ar ? 'إنشاء كلمة مرور' : 'Create password'} hint={ar ? '8 أحرف على الأقل، بحد أقصى 72 بايت.' : 'At least 8 characters, maximum 72 bytes.'} type="password" autoComplete="new-password" required minLength={8} maxLength={72} disabled={busy} value={password} onChange={(e) => setPassword(e.target.value)} /><Input id="invite-confirm-password-input" label={ar ? 'تأكيد كلمة المرور' : 'Confirm password'} type="password" autoComplete="new-password" required disabled={busy} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></>}<Button id="invite-submit-btn" type="submit" isLoading={busy} style={{ width: '100%', whiteSpace: 'normal', height: 'auto', minHeight: 46 }}>{ar ? 'قبول الدعوة والانضمام إلى الجهة' : 'Accept invitation & join organization'}</Button></form>}
          </>}
      </Card>
    </div>
  </main>;
};
