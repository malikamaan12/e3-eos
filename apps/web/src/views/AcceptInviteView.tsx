import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Button, AlertBanner } from '../components/DesignSystem.js';

export const AcceptInviteView: React.FC = () => {
  const { navigate, apiClient } = useEosContext();
  const [token, setToken] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      if (urlToken) {
        setToken(urlToken);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Invitation token is missing or invalid.');
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.acceptInvite(token, password, name || undefined);
      setSuccess(res.message || 'Account activated successfully.');
    } catch (err: any) {
      setError(err.message || 'Invitation activation failed.');
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
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ backgroundColor: '#2563eb', color: 'var(--surface-1, #0f1624)', fontWeight: 900, fontSize: '16px', padding: '4px 10px', borderRadius: '4px' }}>
              E3
            </span>
            <span style={{ color: 'var(--surface-1, #0f1624)', fontWeight: 800, fontSize: '20px' }}>EOS</span>
          </div>
          <h2 style={{ color: 'var(--text-primary, #f8fafc)', margin: '0 0 6px', fontSize: '20px', fontWeight: 700 }}>
            Activate Your E3 Account
          </h2>
          <p style={{ color: 'var(--text-muted, #94a3b8)', margin: 0, fontSize: '13px' }}>
            You have been invited to collaborate on the E3 Event Operations Platform.
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
              <AlertBanner type="error" title="Activation Error">
                {error}
              </AlertBanner>
            </div>
          )}

          {success ? (
            <div>
              <AlertBanner type="success" title="Account Activated!">
                {success}
              </AlertBanner>
              <Button
                id="activate-login-redirect-btn"
                variant="primary"
                size="lg"
                onClick={() => navigate('/login')}
                style={{ width: '100%', marginTop: '20px', justifyContent: 'center' }}
              >
                Proceed to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '6px' }}>
                  Invitation Token
                </label>
                <input
                  id="invite-token-input"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste invite token"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default, #2a374b)',
                    backgroundColor: 'var(--text-primary, #f8fafc)',
                    color: 'var(--text-primary, #f8fafc)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '6px' }}>
                  Your Full Name
                </label>
                <input
                  id="invite-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dana Al-Ali"
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

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '6px' }}>
                  Create Password (min. 8 characters)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="invite-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 42px 10px 14px',
                      fontSize: '14px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default, #2a374b)',
                      backgroundColor: 'var(--text-primary, #f8fafc)',
                      color: 'var(--text-primary, #f8fafc)',
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
                      color: 'var(--text-muted, #94a3b8)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      padding: '4px',
                    }}
                  >
                    {showPassword ? '👁️' : '🙈'}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '6px' }}>
                  Confirm Password
                </label>
                <input
                  id="invite-confirm-password-input"
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
                id="invite-submit-btn"
                type="submit"
                variant="primary"
                size="lg"
                isLoading={loading}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Activate Account & Join E3
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
