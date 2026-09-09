import React, { useState } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, Badge, Button, AlertBanner } from '../components/DesignSystem.js';

export const AccountView: React.FC = () => {
  const { currentUser, currentOrg, logout, currentLanguage, toggleLanguage, apiClient } = useEosContext();
  const [mfaSetupData, setMfaSetupData] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [mfaCode, setMfaCode] = useState<string>('');
  const [mfaEnabled, setMfaEnabled] = useState<boolean>(currentUser.mfaEnabled || false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const startMfaSetup = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const data = await apiClient.mfaSetup();
      setMfaSetupData(data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to initiate MFA setup' });
    } finally {
      setLoading(false);
    }
  };

  const verifyAndEnableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await apiClient.mfaVerify(mfaCode);
      setMfaEnabled(true);
      setRecoveryCodes(res.recoveryCodes || []);
      setMfaSetupData(null);
      setMfaCode('');
      setFeedback({ type: 'success', message: 'Two-factor authentication successfully enabled on your account.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Verification failed. Please check the code.' });
    } finally {
      setLoading(false);
    }
  };

  const disableMfa = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      await apiClient.mfaDisable();
      setMfaEnabled(false);
      setRecoveryCodes([]);
      setFeedback({ type: 'success', message: 'Two-factor authentication disabled.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to disable MFA' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 0', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
            {currentLanguage === 'ar' ? 'الملف الشخصي والحساب' : 'User Account & Security'}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
            {currentLanguage === 'ar' ? 'إدارة بيانات المصادقة والجلسة النشطة وصلاحيات النظام' : 'Manage your enterprise credentials, active session context, and RBAC profile'}
          </p>
        </div>
        <Button variant="danger" size="sm" onClick={logout}>
          Sign Out of EOS
        </Button>
      </div>

      {feedback && (
        <div style={{ marginBottom: '16px' }}>
          <AlertBanner type={feedback.type} title={feedback.type === 'success' ? 'Security Notice' : 'Security Alert'}>
            {feedback.message}
          </AlertBanner>
        </div>
      )}

      <Card title="Identity & Membership" subtitle="Server-authenticated tenant credentials">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Full Name</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>{currentUser.name}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Work Email</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>{currentUser.email}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Active Role</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Badge variant={currentUser.isSuperAdmin ? 'purple' : 'info'}>
                {currentUser.role || 'Super Admin'}
              </Badge>
              {currentUser.isSuperAdmin && (
                <span style={{ fontSize: '11px', color: '#7c3aed', fontWeight: 600 }}>Root Governance</span>
              )}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Organization Context</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{currentOrg.name}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>{currentOrg.id}</div>
          </div>
        </div>
      </Card>

      <div style={{ height: '16px' }} />

      <Card title="Multi-Factor Authentication (RFC 6238 TOTP)" subtitle="Hardware authenticator and Google Authenticator protection">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Two-Factor Security</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              {mfaEnabled ? 'Account protected by time-based one-time password verification.' : 'Enhance account protection with standard 2FA (Google Authenticator, 1Password, etc.)'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Badge variant={mfaEnabled ? 'success' : 'neutral'}>
              {mfaEnabled ? 'Active & Enforced' : 'Not Configured'}
            </Badge>
            {mfaEnabled ? (
              <Button variant="secondary" size="sm" onClick={disableMfa} isLoading={loading}>
                Disable 2FA
              </Button>
            ) : (
              !mfaSetupData && (
                <Button id="enable-mfa-btn" variant="primary" size="sm" onClick={startMfaSetup} isLoading={loading}>
                  Set Up 2FA
                </Button>
              )
            )}
          </div>
        </div>

        {mfaSetupData && (
          <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '12px' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: '#0f172a' }}>Step 1: Scan QR or Enter Key</h4>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px' }}>
              Add this security key to Google Authenticator or your preferred password manager:
            </p>
            <div style={{ padding: '8px 12px', backgroundColor: '#0f172a', color: '#38bdf8', fontFamily: 'monospace', borderRadius: '4px', fontSize: '13px', display: 'inline-block', marginBottom: '16px' }}>
              {mfaSetupData.secret}
            </div>

            <form onSubmit={verifyAndEnableMfa}>
              <h4 style={{ margin: '0 0 6px', fontSize: '13px', color: '#0f172a' }}>Step 2: Enter 6-Digit Code to Confirm</h4>
              <div style={{ display: 'flex', gap: '8px', maxWidth: '300px' }}>
                <input
                  id="mfa-verify-input"
                  type="text"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  required
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: '16px',
                    textAlign: 'center',
                    letterSpacing: '4px',
                    fontFamily: 'monospace',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                  }}
                />
                <Button id="mfa-confirm-btn" type="submit" variant="primary" size="md" isLoading={loading}>
                  Verify & Activate
                </Button>
              </div>
            </form>
          </div>
        )}

        {recoveryCodes.length > 0 && (
          <div style={{ padding: '16px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', marginTop: '16px' }}>
            <h4 style={{ margin: '0 0 6px', fontSize: '13px', color: '#1e3a8a' }}>🔒 Backup Recovery Codes</h4>
            <p style={{ fontSize: '12px', color: '#3b82f6', margin: '0 0 10px' }}>
              Store these single-use recovery codes in a secure location. They allow access if you lose your phone:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {recoveryCodes.map((code, idx) => (
                <code key={idx} style={{ padding: '4px 8px', backgroundColor: '#fff', border: '1px solid #93c5fd', borderRadius: '4px', fontSize: '12px', textAlign: 'center', fontWeight: 600 }}>
                  {code}
                </code>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div style={{ height: '16px' }} />

      <Card title="Localization & Environment Preferences" subtitle="Interface language and bidirectional layout">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>Language Preference</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Currently set to: <strong>{currentLanguage === 'ar' ? 'Arabic (RTL)' : 'English (LTR)'}</strong>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={toggleLanguage}>
            Switch to {currentLanguage === 'ar' ? 'English' : 'العربية'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

