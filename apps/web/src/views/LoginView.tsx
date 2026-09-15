import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Button, AlertBanner } from '../components/DesignSystem.js';

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
        backgroundColor: '#090d16',
        backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(217, 119, 6, 0.12) 0%, rgba(15, 23, 42, 0.95) 70%, #090d16 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        fontFamily: isAr ? 'Tahoma, Arial, sans-serif' : 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Top Bar: Restrained Staging Indicator & Bilingual Selector */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          left: isAr ? 'auto' : 28,
          right: isAr ? 28 : 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
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

      <div
        style={{
          position: 'absolute',
          top: 24,
          right: isAr ? 'auto' : 28,
          left: isAr ? 28 : 'auto',
        }}
      >
        <button
          id="btn-login-toggle-lang"
          onClick={toggleLanguage}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(30, 41, 59, 0.7)',
            color: '#cbd5e1',
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

      <div style={{ width: '100%', maxWidth: '460px', zIndex: 10 }}>
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
            {/* E3 Gold Monogram Shield */}
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                border: '1.5px solid rgba(217, 119, 6, 0.7)',
                boxShadow: '0 4px 20px rgba(217, 119, 6, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b',
                fontWeight: 900,
                fontSize: '22px',
                letterSpacing: '1px',
              }}
            >
              E3
            </div>

            <div style={{ textAlign: isAr ? 'right' : 'left' }}>
              <div
                style={{
                  color: '#ffffff',
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
                  color: '#94a3b8',
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

          <h2 style={{ color: '#f8fafc', margin: '0 0 6px', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em' }}>
            {isAr ? 'تسجيل الدخول إلى النظام المؤسسي' : 'Sign in to Enterprise EOS'}
          </h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '13px', lineHeight: 1.5 }}>
            {isAr
              ? 'المنصة القيادية لإدارة وإنتاج الفعاليات الكبرى والحوكمة الصارمة'
              : 'Mission-critical delivery, four-eyes governance & live financial control'}
          </p>
        </div>

        {/* Executive Login Card with Bronze/Gold Border Accent */}
        <div
          style={{
            backgroundColor: '#111827',
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
                  <h3 style={{ color: '#f8fafc', margin: '0 0 6px', fontSize: '16px', fontWeight: 700 }}>
                    {isAr ? 'المصادقة الثنائية (2FA)' : 'Two-Factor Authentication'}
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>
                    {isAr
                      ? `أدخل رمز التحقق المكون من 6 أرقام من تطبيق المصادقة الخاص بـ ${email}`
                      : `Enter the 6-digit time-based code from your authenticator app for ${email}.`}
                  </p>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <input
                    id="mfa-code-input"
                    type="text"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    autoFocus
                    required
                    style={{
                      width: '100%',
                      padding: '14px',
                      fontSize: '24px',
                      textAlign: 'center',
                      letterSpacing: '8px',
                      fontFamily: 'monospace',
                      borderRadius: '8px',
                      border: '1px solid rgba(217, 119, 6, 0.4)',
                      backgroundColor: '#090d16',
                      color: '#f8fafc',
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
                    color: '#ffffff',
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
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                    {isAr ? 'البريد الإلكتروني المؤسسي' : 'Corporate Email Address'}
                  </label>
                  <input
                    id="login-email-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={isAr ? 'name@e3.qa' : 'name@e3.qa'}
                    required
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      fontSize: '14px',
                      borderRadius: '6px',
                      border: '1px solid #334155',
                      backgroundColor: '#090d16',
                      color: '#f8fafc',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.15s ease',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>
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
                        border: '1px solid #334155',
                        backgroundColor: '#090d16',
                        color: '#f8fafc',
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
                        color: '#94a3b8',
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
                  <label htmlFor="remember-me-checkbox" style={{ fontSize: '12px', color: '#94a3b8', cursor: 'pointer' }}>
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
                    color: '#ffffff',
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
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      ⚡ {isAr ? 'الدخول السريع بحسابات الاختبار' : '1-Click UAT Persona Access'}
                    </span>
                    <span style={{ fontSize: '10px', color: '#64748b' }}>
                      {isAr ? 'اختر دورك للدخول فوراً' : 'Select role to enter instantly'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                      { name: isAr ? '👑 المدير العام' : '👑 Super Admin', email: 'superadmin@e3.qa' },
                      { name: isAr ? '📋 مدير المشروع' : '📋 Lead PM', email: 'pm@e3.qa' },
                      { name: isAr ? '💰 المدير المالي' : '💰 Finance Lead', email: 'finance@e3.qa' },
                      { name: isAr ? '🏗️ مدير العمليات' : '🏗️ Live Ops', email: 'ops@e3.qa' },
                      { name: isAr ? '📱 مشرف الموقع' : '📱 Field PWA', email: 'field@e3.qa' },
                      { name: isAr ? '🤝 بوابة العميل' : '🤝 Client Portal', email: 'client@qatartourism.qa' },
                    ].map((p) => (
                      <button
                        key={p.email}
                        type="button"
                        onClick={() => handleQuickLogin(p.email)}
                        disabled={loading}
                        style={{
                          padding: '8px 10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          textAlign: isAr ? 'right' : 'left',
                          backgroundColor: '#0f172a',
                          color: '#e2e8f0',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#d97706';
                          e.currentTarget.style.backgroundColor = '#1e293b';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#334155';
                          e.currentTarget.style.backgroundColor = '#0f172a';
                        }}
                      >
                        <span>{p.name}</span>
                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>{isAr ? '←' : '→'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            )}

            {/* Corporate RBAC Security Banner */}
            <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid rgba(51, 65, 85, 0.5)', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {isAr
                  ? 'محمي بنظام الصلاحيات والأدوار الصارمة • منصة E3 لتشغيل الفعاليات الكبرى'
                  : 'Corporate SSO & RBAC Enforced • Enterprise Event Operating System'}
              </span>
            </div>
          </div>
        </div>

        {/* Security Footer Note */}
        <div style={{ textAlign: 'center', marginTop: '22px', fontSize: '11px', color: '#475569' }}>
          {isAr
            ? 'تشفير آمن للمفاتيح والشهادات وحوكمة البيانات لفعاليات دولة قطر'
            : 'Protected by Scrypt key derivation, RFC 6238 TOTP, and Row-Level Security.'}
        </div>
      </div>
    </div>
  );
};

