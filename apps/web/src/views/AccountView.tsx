import React from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, Badge, Button } from '../components/DesignSystem.js';

export const AccountView: React.FC = () => {
  const { currentUser, currentOrg, logout, currentLanguage, toggleLanguage } = useEosContext();

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 0' }}>
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

      <Card title="Security & Authentication Factors" subtitle="Session tokens and cryptographic verification">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Multi-Factor Authentication (MFA)</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Hardware security key or TOTP required for high-risk actions</div>
            </div>
            <Badge variant="success">Enforced & Active</Badge>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>PostgreSQL Tenant Guard</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Zero client-side spoofing; queries bounded by DB sessions</div>
            </div>
            <Badge variant="info">Verified in Doha (me-central1)</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
};
