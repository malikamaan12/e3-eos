import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Button, AlertBanner } from '../components/DesignSystem.js';

export const LoginView: React.FC = () => {
  const { login, navigate, currentLanguage, toggleLanguage } = useEosContext();
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

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Top Bar: Staging Indicator & Language Toggle */}
      <div style={{ position: 'absolute', top: 20, left: 24, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            backgroundColor: '#d97706',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '11px',
            padding: '3px 8px',
            borderRadius: '4px',
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            boxShadow: '0 0 10px rgba(217, 119, 6, 0.4)',
          }}
        >
          STAGING
        </span>
        <span style={{ fontSize: '12px', color: '#64748b' }}>Google Cloud Doha (me-central1)</span>
      </div>

      <div style={{ position: 'absolute', top: 20, right: 24 }}>
        <Button variant="ghost" size="sm" onClick={toggleLanguage} style={{ color: '#94a3b8', border: '1px solid #334155' }}>
          🌐 {currentLanguage === 'ar' ? 'English' : 'العربية (RTL)'}
        </Button>
      </div>

      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '18px',
                padding: '6px 12px',
                borderRadius: '6px',
                letterSpacing: '1.5px',
              }}
            >
              E3
            </span>
            <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '24px', letterSpacing: '0.5px' }}>
              EOS
            </span>
          </div>
          <h2 style={{ color: '#f8fafc', margin: '0 0 6px', fontSize: '20px', fontWeight: 700 }}>
            {currentLanguage === 'ar' ? 'تسجيل الدخول إلى النظام المؤسسي' : 'Sign in to Enterprise EOS'}
          </h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '13px' }}>
            {currentLanguage === 'ar' ? 'منصة العمليات الحية والحوكمة لفعاليات E3' : 'Event Operations & Governance Platform'}
          </p>
        </div>

        {/* Login Card */}
        <div
          style={{
            backgroundColor: '#1e293b',
            borderRadius: '10px',
            border: '1px solid #334155',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          }}
        >
          {error && (
            <div style={{ marginBottom: '16px' }}>
              <AlertBanner type="error" title="Authentication Error">
                {error}
              </AlertBanner>
            </div>
          )}

          {mfaRequired ? (
            /* MFA Verification Step */
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔐</div>
                <h3 style={{ color: '#f8fafc', margin: '0 0 4px', fontSize: '16px', fontWeight: 600 }}>
                  Two-Factor Authentication
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>
                  Enter the 6-digit time-based code from your authenticator app for <strong>{email}</strong>.
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
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
                    padding: '12px',
                    fontSize: '22px',
                    textAlign: 'center',
                    letterSpacing: '8px',
                    fontFamily: 'monospace',
                    borderRadius: '6px',
                    border: '1px solid #3b82f6',
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <Button
                id="mfa-submit-btn"
                type="submit"
                variant="primary"
                size="lg"
                isLoading={loading}
                style={{ width: '100%', justifyContent: 'center', backgroundColor: '#2563eb', borderColor: '#1d4ed8' }}
              >
                Verify & Sign In
              </Button>

              <div style={{ textAlign: 'center', marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => { setMfaRequired(false); setMfaCode(''); }}
                  style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '12px', cursor: 'pointer' }}
                >
                  ← Back to password sign in
                </button>
              </div>
            </form>
          ) : (
            /* Standard Password Form */
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  {currentLanguage === 'ar' ? 'البريد الإلكتروني المؤسسي' : 'Corporate Email Address'}
                </label>
                <input
                  id="login-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@e3.qa"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '14px',
                    borderRadius: '6px',
                    border: '1px solid #475569',
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>
                    {currentLanguage === 'ar' ? 'كلمة المرور' : 'Password'}
                  </label>
                  <a
                    href="#forgot-password"
                    onClick={(e) => { e.preventDefault(); navigate('/forgot-password'); }}
                    style={{ fontSize: '12px', color: '#60a5fa', textDecoration: 'none' }}
                  >
                    {currentLanguage === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                  </a>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    id="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 42px 10px 14px',
                      fontSize: '14px',
                      borderRadius: '6px',
                      border: '1px solid #475569',
                      backgroundColor: '#0f172a',
                      color: '#f8fafc',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '13px',
                      padding: '4px',
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '👁️' : '🙈'}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '8px' }}>
                <input
                  id="remember-me-checkbox"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: '#2563eb', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="remember-me-checkbox" style={{ fontSize: '12px', color: '#94a3b8', cursor: 'pointer' }}>
                  Remember my work email on this device
                </label>
              </div>

              <Button
                id="login-submit-btn"
                type="submit"
                variant="primary"
                size="lg"
                isLoading={loading}
                style={{ width: '100%', justifyContent: 'center', backgroundColor: '#2563eb', borderColor: '#1d4ed8' }}
              >
                {currentLanguage === 'ar' ? 'تسجيل الدخول الآمن' : 'Authenticate & Enter EOS'}
              </Button>
            </form>
          )}

          {/* Corporate RBAC Security Enforcement */}
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #334155', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Corporate SSO & RBAC Enforced • Enterprise Event Operating System
            </span>
          </div>
        </div>

        {/* Security Footer Note */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: '#64748b' }}>
          Protected by Scrypt salt key derivation, RFC 6238 TOTP, and PostgreSQL Row-Level Security.
        </div>
      </div>
    </div>
  );
};

