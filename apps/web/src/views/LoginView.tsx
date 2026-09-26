import { BrandLogo } from '../components/BrandLogo.js';
import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Button, AlertBanner } from '../components/DesignSystem.js';
import {
  CANONICAL_E3_USERS,
  ALL_LOCAL_TEAM_USERS,
  CANONICAL_LEAD_USERS,
  DEFAULT_DUMMY_PASSWORD,
} from '../context/canonical-users.js';

const ROLE_META: Record<string, { icon: string; tag: string; tagAr: string; ceiling: string; ceilingAr: string }> = {
  super_admin: { icon: '👑', tag: 'Super Admin', tagAr: 'المدير العام', ceiling: 'Unlimited', ceilingAr: 'غير محدود' },
  executive: { icon: '🏛️', tag: 'Executive', tagAr: 'تنفيذي', ceiling: '> 250k QAR', ceilingAr: '> 250 ألف ر.ق' },
  project_director: { icon: '🎯', tag: 'Director', tagAr: 'مدير إدارة', ceiling: '≤ 250k QAR', ceilingAr: '≤ 250 ألف ر.ق' },
  project_manager: { icon: '📋', tag: 'Lead PM', tagAr: 'مدير مشروع', ceiling: '≤ 50k QAR', ceilingAr: '≤ 50 ألف ر.ق' },
  finance: { icon: '💰', tag: 'Finance', tagAr: 'مالية', ceiling: '≤ 250k QAR', ceilingAr: '≤ 250 ألف ر.ق' },
  procurement: { icon: '📦', tag: 'Procurement', tagAr: 'مشتريات', ceiling: 'PO Creation', ceilingAr: 'أوامر الشراء' },
  design_production: { icon: '🎨', tag: 'Design', tagAr: 'تصميم وإنتاج', ceiling: 'Creative', ceilingAr: 'فني واعتماد' },
  operations: { icon: '🏗️', tag: 'Live Ops', tagAr: 'عمليات', ceiling: 'Run-sheets', ceilingAr: 'تشغيل ميداني' },
  logistics: { icon: '🚚', tag: 'Logistics', tagAr: 'لوجستيات', ceiling: 'Fleet & Dispatch', ceilingAr: 'أسطول ومستودع' },
  hse_quality: { icon: '🛡️', tag: 'HSE & Safety', tagAr: 'سلامة وجودة', ceiling: 'Permits & Audits', ceilingAr: 'تصاريح وتفتيش' },
  marketing_commercial: { icon: '📈', tag: 'Commercial', tagAr: 'تجاري', ceiling: 'Sponsorships', ceilingAr: 'عقود ورعايات' },
  field_supervisor: { icon: '📱', tag: 'Field PWA', tagAr: 'مشرف موقع', ceiling: 'Offline Checks', ceilingAr: 'تفتيش ميداني' },
  client_user: { icon: '🤝', tag: 'Client Portal', tagAr: 'بوابة العميل', ceiling: 'Read & Signoff', ceilingAr: 'مراجعة وتقارير' },
};

export const LoginView: React.FC = () => {
  const { login, navigate, currentLanguage, toggleLanguage, direction } = useEosContext();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // MFA Challenge State
  const [mfaRequired, setMfaRequired] = useState<boolean>(false);
  const [mfaCode, setMfaCode] = useState<string>('');
  const [showAllPersonas, setShowAllPersonas] = useState<boolean>(false);
  const [showDirectoryModal, setShowDirectoryModal] = useState<boolean>(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('eos_remembered_email');
      if (savedEmail) {
        setEmail(savedEmail);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Corporate email is required.');
      return;
    }
    if (!mfaRequired && !password) {
      setError('Password is required.');
      return;
    }
    if (mfaRequired && !mfaCode) {
      setError('Please enter the 6-digit authenticator code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (rememberMe && typeof window !== 'undefined') {
        localStorage.setItem('eos_remembered_email', email);
      } else if (typeof window !== 'undefined') {
        localStorage.removeItem('eos_remembered_email');
      }

      const res = await login(email, password, mfaRequired ? mfaCode : undefined);
      if (res.mfaRequired) {
        setMfaRequired(true);
        setLoading(false);
        return;
      }

      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials or security code.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (targetEmail: string) => {
    setLoading(true);
    setError(null);
    try {
      await login(targetEmail, 'E3#Doha2026!');
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const isAr = currentLanguage === 'ar';

  return (
    <div
      dir={direction}
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--canvas, #090d16)',
        backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(217, 119, 6, 0.12) 0%, rgba(15, 23, 42, 0.95) 70%, #090d16 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '0 16px 32px 16px',
        position: 'relative',
        fontFamily: isAr ? 'Tahoma, Arial, sans-serif' : 'Inter, system-ui, -apple-system, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Bar: Restrained Staging Indicator & Bilingual Selector */}
      <header
        style={{
          width: '100%',
          maxWidth: '1200px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 0',
          zIndex: 20,
          boxSizing: 'border-box',
        }}
      >
        <div>
          <span
            id="staging-badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(217, 119, 6, 0.15)',
              color: '#f59e0b',
              border: '1px solid rgba(217, 119, 6, 0.4)',
              fontWeight: 700,
              fontSize: '11px',
              padding: '3px 10px',
              borderRadius: '12px',
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
            STAGING
          </span>
        </div>

        <div>
          <button
            id="btn-login-toggle-lang"
            onClick={toggleLanguage}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(30, 41, 59, 0.7)',
              color: 'var(--text-secondary, #cbd5e1)',
              border: '1px solid rgba(217, 119, 6, 0.3)',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🌐</span>
            <span>{isAr ? 'English' : 'العربية (RTL)'}</span>
          </button>
        </div>
      </header>

      <div style={{ width: '100%', maxWidth: '460px', zIndex: 10, margin: '24px 0 auto 0' }}>
        {/* Brand Monogram & Product Identity */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <BrandLogo />
            <div style={{ textAlign: isAr ? 'right' : 'left' }}>
              <div
                style={{
                  color: 'var(--text-primary, #f8fafc)',
                  fontWeight: 800,
                  fontSize: '24px',
                  letterSpacing: '0.8px',
                  lineHeight: 1.1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>EOS</span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '1.5px',
                    color: '#d97706',
                    textTransform: 'uppercase',
                    padding: '1px 5px',
                    backgroundColor: 'rgba(217, 119, 6, 0.15)',
                    borderRadius: '4px',
                  }}
                >
                  v1.0
                </span>
              </div>
              <div
                style={{
                  color: 'var(--text-secondary, #cbd5e1)',
                  fontSize: '11px',
                  fontWeight: 500,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}
              >
                {isAr ? 'نظام تشغيل الفعاليات المؤسسي' : 'Enterprise Event Operating System'}
              </div>
            </div>
          </div>

          <h2 style={{ color: 'var(--text-primary, #f8fafc)', margin: '0 0 6px', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em' }}>
            {isAr ? 'تسجيل الدخول إلى النظام المؤسسي' : 'Sign in to Enterprise EOS'}
          </h2>
          <p style={{ color: 'var(--text-secondary, #cbd5e1)', margin: 0, fontSize: '13px', lineHeight: 1.5 }}>
            {isAr
              ? 'المنصة القيادية لإدارة وإنتاج الفعاليات الكبرى والحوكمة الصارمة'
              : 'Mission-critical delivery, four-eyes governance & live financial control'}
          </p>
        </div>

        {/* Executive Login Card with Bronze/Gold Border Accent */}
        <div
          style={{
            backgroundColor: 'var(--surface-inset, #0b111d)',
            borderRadius: '12px',
            border: '1px solid rgba(217, 119, 6, 0.25)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 25px rgba(217, 119, 6, 0.08)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Top Gold Foil Accent Line */}
          <div
            style={{
              height: '3px',
              width: '100%',
              background: 'linear-gradient(90deg, transparent, #d97706 30%, #f59e0b 50%, #d97706 70%, transparent)',
            }}
          />

          <div style={{ padding: '32px' }}>
            {error && (
              <div style={{ marginBottom: '20px' }}>
                <AlertBanner type="error" title={isAr ? 'خطأ في التحقق من الهوية' : 'Authentication Error'}>
                  {error}
                </AlertBanner>
              </div>
            )}

            {mfaRequired ? (
              /* MFA Verification Step */
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(217, 119, 6, 0.15)',
                      border: '1px solid rgba(217, 119, 6, 0.4)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      marginBottom: '12px',
                      color: '#f59e0b',
                    }}
                  >
                    🔐
                  </div>
                  <h3 style={{ color: 'var(--text-primary, #f8fafc)', margin: '0 0 6px', fontSize: '16px', fontWeight: 700 }}>
                    {isAr ? 'المصادقة الثنائية (2FA)' : 'Two-Factor Authentication'}
                  </h3>
                  <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>
                    {isAr
                      ? `أدخل رمز التحقق المكون من 6 أرقام من تطبيق المصادقة الخاص بـ ${email}`
                      : `Enter the 6-digit time-based code from your authenticator app for ${email}.`}
                  </p>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label htmlFor="mfa-code-input" style={{ display: 'none' }}>
                    {isAr ? 'رمز المصادقة الثنائية' : 'Two-Factor Authentication Code'}
                  </label>
                  <input
                    id="mfa-code-input"
                    type="text"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    autoFocus
                    required
                    aria-label={isAr ? 'رمز المصادقة الثنائية' : 'Two-Factor Authentication Code'}
                    style={{
                      width: '100%',
                      padding: '14px',
                      fontSize: '24px',
                      textAlign: 'center',
                      letterSpacing: '8px',
                      fontFamily: 'monospace',
                      borderRadius: '8px',
                      border: '1px solid rgba(217, 119, 6, 0.4)',
                      backgroundColor: 'var(--canvas, #090d16)',
                      color: 'var(--text-primary, #f8fafc)',
                      outline: 'none',
                      boxSizing: 'border-box',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
                    }}
                  />
                </div>

                <button
                  id="mfa-submit-btn"
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 18px',
                    background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                    color: 'var(--surface-1, #0f1624)',
                    border: '1px solid #d97706',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(217, 119, 6, 0.35)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {loading
                    ? (isAr ? 'جارِ التحقق...' : 'Verifying...')
                    : (isAr ? 'تأكيد الرمز والدخول' : 'Verify & Enter EOS')}
                </button>

                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <button
                    type="button"
                    onClick={() => { setMfaRequired(false); setMfaCode(''); }}
                    style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: '12px', cursor: 'pointer' }}
                  >
                    {isAr ? '← العودة لتسجيل الدخول بكلمة المرور' : '← Back to password sign in'}
                  </button>
                </div>
              </form>
            ) : (
              /* Standard Password Form */
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '18px' }}>
                  <label htmlFor="login-email-input" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '6px' }}>
                    {isAr ? 'البريد الإلكتروني المؤسسي' : 'Corporate Email Address'}
                  </label>
                  <input
                    id="login-email-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={isAr ? 'superadmin@eeeqa.com' : 'superadmin@eeeqa.com'}
                    required
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      fontSize: '14px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default, #2a374b)',
                      backgroundColor: 'var(--canvas, #090d16)',
                      color: 'var(--text-primary, #f8fafc)',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.15s ease',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label htmlFor="login-password-input" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)' }}>
                      {isAr ? 'كلمة المرور' : 'Password'}
                    </label>
                    <a
                      href="#forgot-password"
                      onClick={(e) => { e.preventDefault(); navigate('/forgot-password'); }}
                      style={{ fontSize: '12px', color: '#f59e0b', textDecoration: 'none', fontWeight: 500 }}
                    >
                      {isAr ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                    </a>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="login-password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isAr ? 'أدخل كلمة المرور المؤسسية' : 'Enter account password'}
                      required
                      style={{
                        width: '100%',
                        padding: isAr ? '11px 14px 11px 42px' : '11px 42px 11px 14px',
                        fontSize: '14px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default, #2a374b)',
                        backgroundColor: 'var(--canvas, #090d16)',
                        color: 'var(--text-primary, #f8fafc)',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.15s ease',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: isAr ? 'auto' : 10,
                        left: isAr ? 10 : 'auto',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted, #94a3b8)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        padding: '4px',
                      }}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? '👁️' : '🙈'}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '8px' }}>
                  <input
                    id="remember-me-checkbox"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ accentColor: '#d97706', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="remember-me-checkbox" style={{ fontSize: '12px', color: 'var(--text-secondary, #cbd5e1)', cursor: 'pointer' }}>
                    {isAr ? 'تذكر بريدي المؤسسي على هذا الجهاز' : 'Remember my corporate email on this device'}
                  </label>
                </div>

                {/* Submit Button with Executive Bronze/Gold Styling */}
                <button
                  id="login-submit-btn"
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 18px',
                    background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                    color: 'var(--surface-1, #0f1624)',
                    border: '1px solid #d97706',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(217, 119, 6, 0.35)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {loading
                    ? (isAr ? 'جارِ التحقق والمصادقة...' : 'Authenticating...')
                    : (isAr ? 'المصادقة والدخول إلى النظام' : 'Authenticate & Enter EOS')}
                </button>

                {/* 1-Click Fast Persona Sign-In for UAT */}
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed rgba(217, 119, 6, 0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                        ⚡ {isAr ? 'فريق العمل المحلي (حسابات اختبار)' : 'Local Team Accounts (UAT)'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAllPersonas(!showAllPersonas)}
                        style={{
                          fontSize: '10px',
                          color: '#38bdf8',
                          background: 'rgba(56, 189, 248, 0.1)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          cursor: 'pointer',
                        }}
                      >
                        {showAllPersonas ? (isAr ? 'عرض 13 قيادة' : 'Show 13 Leads') : (isAr ? 'عرض الكل (33)' : 'Show All (33)')}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDirectoryModal(true)}
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#fbbf24',
                        background: 'rgba(245, 158, 11, 0.12)',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        borderRadius: '4px',
                        padding: '3px 8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>📋</span>
                      <span>{isAr ? 'دليل الفريق (33)' : 'Team Directory (33)'}</span>
                    </button>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      maxHeight: '340px',
                      overflowY: 'auto',
                      paddingRight: '4px',
                    }}
                  >
                    {(showAllPersonas ? ALL_LOCAL_TEAM_USERS : CANONICAL_LEAD_USERS).map((u) => {
                      const meta = ROLE_META[u.role] || { icon: '👤', tag: u.role, tagAr: u.role, ceiling: 'Standard', ceilingAr: 'قياسي' };
                      return (
                        <div
                          key={u.email}
                          style={{
                            padding: '8px 10px',
                            backgroundColor: 'var(--surface-1, #0f1624)',
                            border: '1px solid var(--border-default, #2a374b)',
                            borderRadius: '6px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {meta.icon} {u.name}
                            </span>
                            <span style={{ fontSize: '9px', color: 'var(--text-muted, #94a3b8)', backgroundColor: 'var(--surface-2, #151e2e)', padding: '1px 5px', borderRadius: '4px' }}>
                              {isAr ? meta.tagAr : meta.tag}
                            </span>
                          </div>
                          <div style={{ fontSize: '10px', color: '#f59e0b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {u.position || u.title}
                          </div>
                          <div style={{ fontSize: '9px', color: 'var(--text-muted, #94a3b8)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{u.email}</span>
                            {u.phone && <span style={{ color: 'var(--text-muted, #94a3b8)' }}>{u.phone}</span>}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setEmail(u.email);
                                setPassword(DEFAULT_DUMMY_PASSWORD);
                              }}
                              disabled={loading}
                              title={isAr ? 'تعبئة النموذج' : 'Auto-fill login fields'}
                              style={{
                                flex: 1,
                                padding: '4px 6px',
                                fontSize: '10px',
                                fontWeight: 500,
                                backgroundColor: 'var(--surface-2, #151e2e)',
                                color: 'var(--text-muted, #94a3b8)',
                                border: '1px solid var(--border-default, #2a374b)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              {isAr ? 'تعبئة' : 'Fill'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickLogin(u.email)}
                              disabled={loading}
                              title={isAr ? 'دخول فوري بنقرة واحدة' : '1-Click instant login'}
                              style={{
                                flex: 1.4,
                                padding: '4px 6px',
                                fontSize: '10px',
                                fontWeight: 600,
                                backgroundColor: 'rgba(217, 119, 6, 0.2)',
                                color: '#f59e0b',
                                border: '1px solid rgba(217, 119, 6, 0.4)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              {isAr ? 'دخول ←' : '1-Click →'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </form>
            )}

            {/* Corporate RBAC Security Banner */}
            <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid rgba(51, 65, 85, 0.5)', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
                {isAr
                  ? 'محمي بنظام الصلاحيات والأدوار الصارمة • منصة E3 لتشغيل الفعاليات الكبرى'
                  : 'Corporate SSO & RBAC Enforced • Enterprise Event Operating System'}
              </span>
            </div>
          </div>
        </div>

        {/* Security Footer Note */}
        <div style={{ textAlign: 'center', marginTop: '22px', fontSize: '11px', color: 'var(--text-secondary, #cbd5e1)' }}>
          {isAr
            ? 'تشفير آمن للمفاتيح والشهادات وحوكمة البيانات لفعاليات دولة قطر'
            : 'Protected by Scrypt key derivation, RFC 6238 TOTP, and Row-Level Security.'}
        </div>

        {/* Modal: Full Canonical Dummy Accounts & Credentials Directory */}
        {showDirectoryModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
            onClick={() => setShowDirectoryModal(false)}
          >
            <div
              style={{
                backgroundColor: '#0b1120',
                border: '1px solid var(--border-default, #2a374b)',
                borderRadius: '12px',
                maxWidth: '920px',
                width: '100%',
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--border-subtle, #1d2939)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--surface-1, #0f1624)',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🔐</span>
                    <span>{isAr ? 'دليل فريق العمل المحلي وبيانات الاعتماد (33 حساب - تجريبي مؤقت)' : 'Local Team Directory & Credentials (33 Accounts - Temporary UAT)'}</span>
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                    {isAr
                      ? 'حسابات اختبارية مؤقتة لفريق العمل المحلي مفعلة ومربوطة بالأدوار والصلاحيات'
                      : 'Temporary local team testing accounts configured with real designations and seeded into PostgreSQL.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDirectoryModal(false)}
                  style={{
                    backgroundColor: 'var(--surface-2, #151e2e)',
                    color: 'var(--text-muted, #94a3b8)',
                    border: '1px solid var(--border-default, #2a374b)',
                    borderRadius: '6px',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Password Banner */}
              <div
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'rgba(217, 119, 6, 0.12)',
                  borderBottom: '1px solid rgba(217, 119, 6, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b' }}>
                    🔑 {isAr ? 'كلمة المرور الموحدة لجميع حسابات الفريق:' : 'Universal Password for all accounts:'}
                  </span>
                  <code
                    style={{
                      backgroundColor: 'var(--surface-1, #0f1624)',
                      color: '#fbbf24',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontWeight: 700,
                      border: '1px solid #d97706',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {DEFAULT_DUMMY_PASSWORD}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(DEFAULT_DUMMY_PASSWORD);
                    setCopiedEmail('password');
                    setTimeout(() => setCopiedEmail(null), 2000);
                  }}
                  style={{
                    backgroundColor: copiedEmail === 'password' ? '#166534' : 'var(--surface-2, #151e2e)',
                    color: copiedEmail === 'password' ? '#86efac' : 'var(--surface-2, #151e2e)',
                    border: '1px solid var(--border-default, #2a374b)',
                    borderRadius: '5px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {copiedEmail === 'password' ? (isAr ? '✓ تم النسخ' : '✓ Copied') : (isAr ? 'نسخ كلمة المرور' : 'Copy Password')}
                </button>
              </div>

              {/* Search and Department Filter Toolbar */}
              <div
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#0b1329',
                  borderBottom: '1px solid var(--border-subtle, #1d2939)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {/* Search input */}
                <input
                  type="text"
                  placeholder={isAr ? 'البحث بالاسم، البريد، الهاتف، أو القسم...' : 'Search by name, email, phone, or department...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '12px',
                    backgroundColor: 'var(--surface-1, #0f1624)',
                    color: 'var(--text-primary, #f8fafc)',
                    border: '1px solid var(--border-default, #2a374b)',
                    borderRadius: '6px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />

                {/* Department filter chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {[
                    { key: 'ALL', label: isAr ? 'الكل (33)' : 'All (33)' },
                    { key: 'Operations', label: isAr ? 'العمليات والموقع (11)' : 'Operations & Site (11)' },
                    { key: 'Management', label: isAr ? 'الإدارة والرئيس التنفيذي (3)' : 'Management & Exec (3)' },
                    { key: 'Events', label: isAr ? 'المشاريع والفعاليات (1)' : 'Events Lead PM (1)' },
                    { key: 'Finance', label: isAr ? 'المالية والحسابات (2)' : 'Finance & Accounts (2)' },
                    { key: 'Design', label: isAr ? 'التصميم والإنتاج (4)' : 'Design & Branding (4)' },
                    { key: 'Marketing', label: isAr ? 'التسويق والمبيعات (4)' : 'Marketing & Sales (4)' },
                    { key: 'Logistics', label: isAr ? 'اللوجستيات والأسطول (2)' : 'Logistics & Fleet (2)' },
                    { key: 'Support', label: isAr ? 'تكنولوجيا الموارد والضيافة (4)' : 'IT, HR & F&B (4)' },
                    { key: 'Client', label: isAr ? 'العميل حول العالم (2)' : 'Client ATW (2)' },
                  ].map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => setDepartmentFilter(chip.key)}
                      style={{
                        padding: '3px 8px',
                        fontSize: '10px',
                        fontWeight: 600,
                        backgroundColor: departmentFilter === chip.key ? '#d97706' : 'var(--surface-2, #151e2e)',
                        color: departmentFilter === chip.key ? '#ffffff' : '#94a3b8',
                        border: '1px solid',
                        borderColor: departmentFilter === chip.key ? '#f59e0b' : 'var(--text-secondary, #cbd5e1)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accounts Directory Grid */}
              <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {ALL_LOCAL_TEAM_USERS.filter((u) => {
                  // Department filtering
                  if (departmentFilter !== 'ALL') {
                    const dept = (u.department || '').toLowerCase();
                    const pos = (u.position || '').toLowerCase();
                    const role = u.role.toLowerCase();
                    if (departmentFilter === 'Operations' && !(dept.includes('operation') || dept.includes('safety') || pos.includes('supervisor') || role === 'operations' || role === 'field_supervisor' || role === 'hse_quality')) return false;
                    if (departmentFilter === 'Management' && !(dept.includes('ceo') || dept.includes('management') || dept.includes('administration') || role === 'super_admin' || role === 'executive' || role === 'project_director')) return false;
                    if (departmentFilter === 'Events' && !(dept.includes('event') || role === 'project_manager')) return false;
                    if (departmentFilter === 'Finance' && !(dept.includes('finance') || dept.includes('account') || role === 'finance')) return false;
                    if (departmentFilter === 'Design' && !(dept.includes('design') || dept.includes('brand') || dept.includes('creative') || dept.includes('media') || dept.includes('production') || role === 'design_production' || role === 'procurement')) return false;
                    if (departmentFilter === 'Marketing' && !(dept.includes('market') || dept.includes('sales') || dept.includes('growth') || role === 'marketing_commercial')) return false;
                    if (departmentFilter === 'Logistics' && !(dept.includes('logistic') || dept.includes('fleet') || dept.includes('warehouse') || role === 'logistics')) return false;
                    if (departmentFilter === 'Support' && !(dept.includes('it') || dept.includes('human') || dept.includes('f&b') || dept.includes('food'))) return false;
                    if (departmentFilter === 'Client' && !(u.organisationId === '22222222-2222-4222-8222-222222222222' || role === 'client_user' || u.email.includes('@atw.com'))) return false;
                  }

                  // Search query filtering
                  if (searchQuery.trim()) {
                    const q = searchQuery.trim().toLowerCase();
                    return (
                      u.name.toLowerCase().includes(q) ||
                      u.email.toLowerCase().includes(q) ||
                      (u.phone || '').toLowerCase().includes(q) ||
                      (u.department || '').toLowerCase().includes(q) ||
                      (u.position || '').toLowerCase().includes(q) ||
                      u.role.toLowerCase().includes(q)
                    );
                  }

                  return true;
                }).map((u) => {
                  const meta = ROLE_META[u.role] || { icon: '👤', tag: u.role, tagAr: u.role, ceiling: 'Standard', ceilingAr: 'قياسي' };
                  return (
                    <div
                      key={u.id}
                      style={{
                        padding: '12px 14px',
                        backgroundColor: 'var(--surface-1, #0f1624)',
                        border: '1px solid var(--border-subtle, #1d2939)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px' }}>
                        <span style={{ fontSize: '22px' }}>{meta.icon}</span>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{u.name}</span>
                            <span style={{ fontSize: '9px', color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.15)', padding: '1px 5px', borderRadius: '4px' }}>
                              {u.position}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
                            {u.department} • {isAr ? u.titleAr : u.title}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '180px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{isAr ? 'البريد المؤسسي:' : 'Email:'}</span>
                          {u.phone && <span style={{ color: '#38bdf8' }}>📞 {u.phone}</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <code style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600 }}>{u.email}</code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(u.email);
                              setCopiedEmail(u.email);
                              setTimeout(() => setCopiedEmail(null), 2000);
                            }}
                            title="Copy email"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: copiedEmail === u.email ? '#22c55e' : 'var(--text-muted, #94a3b8)',
                              cursor: 'pointer',
                              fontSize: '11px',
                              padding: '2px 4px',
                            }}
                          >
                            {copiedEmail === u.email ? '✓' : '📋'}
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '130px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
                          {isAr ? 'الدور والسقف المالي:' : 'Role & Authority:'}
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', backgroundColor: 'var(--surface-2, #151e2e)', padding: '2px 8px', borderRadius: '4px', display: 'inline-block', width: 'fit-content' }}>
                          {isAr ? meta.tagAr : meta.tag} ({isAr ? meta.ceilingAr : meta.ceiling})
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEmail(u.email);
                            setPassword(DEFAULT_DUMMY_PASSWORD);
                            setShowDirectoryModal(false);
                          }}
                          style={{
                            padding: '6px 12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: 'var(--surface-2, #151e2e)',
                            color: 'var(--text-secondary, #cbd5e1)',
                            border: '1px solid var(--border-default, #2a374b)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          {isAr ? 'تعبئة النموذج' : 'Auto-Fill'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowDirectoryModal(false);
                            handleQuickLogin(u.email);
                          }}
                          disabled={loading}
                          style={{
                            padding: '6px 12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: '#d97706',
                            color: 'var(--surface-1, #0f1624)',
                            border: '1px solid #f59e0b',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          {isAr ? 'دخول فوري ←' : '1-Click Sign In →'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: '12px 20px',
                  borderTop: '1px solid var(--border-subtle, #1d2939)',
                  backgroundColor: 'var(--surface-1, #0f1624)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
                  {isAr ? '💡 حسابات تجريبية مؤقتة لفحص صلاحيات وأدوار منظومة E3' : '💡 Temporary UAT test accounts for E3 Event Operating System evaluation'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowDirectoryModal(false)}
                  style={{
                    padding: '6px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: 'var(--surface-2, #151e2e)',
                    color: 'var(--text-secondary, #cbd5e1)',
                    border: '1px solid var(--border-default, #2a374b)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
