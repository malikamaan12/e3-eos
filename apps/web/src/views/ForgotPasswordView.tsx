import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Button, AlertBanner } from '../components/DesignSystem.js';

export const ForgotPasswordView: React.FC = () => {
  const { navigate, currentLanguage, apiClient } = useEosContext();
  const [email, setEmail] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [resetToken, setResetToken] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check URL parameters for token
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (token) {
        setResetToken(token);
        setSubmitted(true);
      }
    }
  }, []);

  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide your work email address.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.forgotPassword(email);
      setSubmitted(true);
      if (res.resetToken) {
        setResetToken(res.resetToken);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to process reset request.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.resetPassword(resetToken, newPassword);
      setSuccessMessage(res.message || 'Password successfully updated.');
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--text-primary, #f8fafc)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ color: 'var(--text-primary, #f8fafc)', margin: '0 0 6px', fontSize: '20px', fontWeight: 700 }}>
            {currentLanguage === 'ar' ? 'استعادة كلمة المرور' : 'Password Recovery'}
          </h2>
          <p style={{ color: 'var(--text-muted, #94a3b8)', margin: 0, fontSize: '13px' }}>
            {resetToken ? 'Enter and confirm your new secure password.' : 'Enter your registered work email to receive password reset instructions.'}
          </p>
        </div>

        <div
          style={{
            backgroundColor: 'var(--surface-2, #151e2e)',
            borderRadius: '10px',
            border: '1px solid var(--border-default, #2a374b)',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          }}
        >
          {error && (
            <div style={{ marginBottom: '16px' }}>
              <AlertBanner type="error" title="Action Failed">
                {error}
              </AlertBanner>
            </div>
          )}

          {successMessage ? (
            <div>
              <AlertBanner type="success" title="Password Reset Complete">
                {successMessage}
              </AlertBanner>
              <Button
                id="back-to-login-btn"
                variant="primary"
                size="md"
                onClick={() => navigate('/login')}
                style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}
              >
                Sign In With New Password
              </Button>
            </div>
          ) : resetToken ? (
            /* Step 2: Set New Password */
            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: '12px', padding: '10px', backgroundColor: 'var(--text-primary, #f8fafc)', borderRadius: '6px', border: '1px solid var(--border-default, #2a374b)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', display: 'block' }}>Verified Reset Token:</span>
                <code style={{ fontSize: '11px', color: '#38bdf8' }}>{resetToken.slice(0, 16)}...</code>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '6px' }}>
                  New Password (min. 8 characters)
                </label>
                <input
                  id="new-password-input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '14px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default, #2a374b)',
                    backgroundColor: 'var(--text-primary, #f8fafc)',
                    color: 'var(--text-primary, #f8fafc)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '6px' }}>
                  Confirm New Password
                </label>
                <input
                  id="confirm-password-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '14px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default, #2a374b)',
                    backgroundColor: 'var(--text-primary, #f8fafc)',
                    color: 'var(--text-primary, #f8fafc)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <Button
                id="reset-password-submit-btn"
                type="submit"
                variant="primary"
                size="lg"
                isLoading={loading}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Save New Password
              </Button>
            </form>
          ) : (
            /* Step 1: Request Reset Link */
            <form onSubmit={handleRequestLink}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '6px' }}>
                  Corporate Work Email
                </label>
                <input
                  id="forgot-email-input"
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
                    border: '1px solid var(--border-default, #2a374b)',
                    backgroundColor: 'var(--text-primary, #f8fafc)',
                    color: 'var(--text-primary, #f8fafc)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <Button
                id="forgot-submit-btn"
                type="submit"
                variant="primary"
                size="lg"
                isLoading={loading}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Send Password Reset Link
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

