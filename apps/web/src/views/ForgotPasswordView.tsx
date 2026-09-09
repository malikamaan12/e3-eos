import React, { useState } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Button, AlertBanner } from '../components/DesignSystem.js';

export const ForgotPasswordView: React.FC = () => {
  const { navigate, currentLanguage } = useEosContext();
  const [email, setEmail] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
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
      }}
    >
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ color: '#f8fafc', margin: '0 0 6px', fontSize: '20px', fontWeight: 700 }}>
            {currentLanguage === 'ar' ? 'استعادة كلمة المرور' : 'Reset Password'}
          </h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '13px' }}>
            {currentLanguage === 'ar' ? 'أدخل بريدك الإلكتروني المؤسسي لتلقي رابط إعادة التعيين' : 'Enter your registered work email to receive password reset instructions'}
          </p>
        </div>

        <div
          style={{
            backgroundColor: '#1e293b',
            borderRadius: '10px',
            border: '1px solid #334155',
            padding: '28px',
          }}
        >
          {submitted ? (
            <div>
              <AlertBanner type="success" title="Recovery Email Dispatched">
                If an account exists for {email}, a secure reset token has been transmitted with 15-minute validity.
              </AlertBanner>
              <Button
                variant="secondary"
                size="md"
                onClick={() => navigate('/login')}
                style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}
              >
                Back to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Work Email Address
                </label>
                <input
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

              <Button
                type="submit"
                variant="primary"
                size="lg"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Send Reset Link
              </Button>

              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <a
                  href="#login"
                  onClick={(e) => { e.preventDefault(); navigate('/login'); }}
                  style={{ fontSize: '12px', color: '#60a5fa', textDecoration: 'none' }}
                >
                  Return to Sign In
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
