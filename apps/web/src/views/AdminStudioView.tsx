import React, { useState } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Badge, Button, Tabs } from '../components/DesignSystem.js';
import { ViewStateRenderer } from '../components/ViewStateRenderer.js';
import { ViewStateFactory } from '../view-states.js';

export const AdminStudioView: React.FC = () => {
  const { currentLanguage } = useEosContext();
  const [activeTab, setActiveTab] = useState('audit');

  const tabs = [
    { id: 'audit', label: currentLanguage === 'ar' ? 'سجل التدقيق المشفر' : 'Cryptographic Audit Manifest' },
    { id: 'policies', label: currentLanguage === 'ar' ? 'استوديو السياسات ومصفوفة الصلاحيات' : 'Policy Matrix Studio' },
    { id: 'templates', label: currentLanguage === 'ar' ? 'قوالب دورات الحياة (13 مرحلة)' : 'Stage Graph Templates' },
  ];

  const auditEvents = [
    {
      id: 'evt-001',
      action: 'DRAWING_BASELINE_FROZEN',
      entity: 'CAD_RIGGING_V2.4',
      actor: 'Elena Rostova',
      timestamp: '2026-09-06T11:24:00Z',
      sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      tamperStatus: 'VALID',
    },
    {
      id: 'evt-002',
      action: 'PO_FRAMEWORK_RELEASED',
      entity: 'PO-2026-089',
      actor: 'Tariq Al-Mansoor',
      timestamp: '2026-09-06T14:15:30Z',
      sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      tamperStatus: 'VALID',
    },
    {
      id: 'evt-003',
      action: 'SAFETY_PERMIT_CERTIFIED',
      entity: 'QCDD_PERMIT_DOC',
      actor: 'Sarah Jenkins',
      timestamp: '2026-09-07T08:00:12Z',
      sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
      tamperStatus: 'VALID',
    },
  ];

  const viewState = ViewStateFactory.ready(auditEvents);

  return (
    <div data-testid="admin-workspace">
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
            {currentLanguage === 'ar' ? 'استوديو الإدارة والحوكمة المركزية' : 'Admin & Governance Configuration Studio'}
          </h1>
          <Badge variant="danger">Restricted Authority</Badge>
        </div>
        <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
          {currentLanguage === 'ar'
            ? 'تكوين مصفوفة السياسات، قوالب المراحل، ومراقبة سجلات التدقيق غير القابلة للتغيير.'
            : 'Configure stage graphs, policy matrices, and inspect immutable audit manifests.'}
        </p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <ViewStateRenderer viewState={viewState}>
        {() => (
          <div>
            {activeTab === 'audit' && (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                    {currentLanguage === 'ar' ? 'سجلات التدقيق المشفرة وتواقيع SHA-256' : 'Cryptographic Audit Log'}
                  </h3>
                  <Badge variant="success">Tamper Verification: 100% Intact</Badge>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: currentLanguage === 'ar' ? 'right' : 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
                      <th style={{ padding: '12px 20px' }}>Event Action</th>
                      <th style={{ padding: '12px 20px' }}>Target Entity</th>
                      <th style={{ padding: '12px 20px' }}>Actor</th>
                      <th style={{ padding: '12px 20px' }}>Timestamp</th>
                      <th style={{ padding: '12px 20px' }}>SHA-256 Hash Digest</th>
                      <th style={{ padding: '12px 20px' }}>Verification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditEvents.map((evt) => (
                      <tr key={evt.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                        <td style={{ padding: '12px 20px', fontWeight: 600 }}>{evt.action}</td>
                        <td style={{ padding: '12px 20px' }}>
                          <Badge variant="neutral">{evt.entity}</Badge>
                        </td>
                        <td style={{ padding: '12px 20px' }}>{evt.actor}</td>
                        <td style={{ padding: '12px 20px', color: '#64748b', fontSize: '12px' }}>
                          {new Date(evt.timestamp).toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 20px', fontFamily: 'monospace', fontSize: '11px', color: '#475569' }}>
                          {evt.sha256.substring(0, 16)}...
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <Badge variant="success">✓ INTACT</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'policies' && (
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Policy Matrix & Authority Limits</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px' }}>
                    <div style={{ fontWeight: 700, marginBottom: '4px' }}>POL-FIN-01: Commercial Margin Floor</div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>Minimum 35% gross contribution margin required.</div>
                    <Badge variant="success" style={{ marginTop: '8px' }}>Active Enforcement</Badge>
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px' }}>
                    <div style={{ fontWeight: 700, marginBottom: '4px' }}>POL-SAFE-01: Critical Readiness Gate</div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>Stage 11 opening strictly blocked by missing safety permits.</div>
                    <Badge variant="success" style={{ marginTop: '8px' }}>Active Enforcement</Badge>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'templates' && (
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>13-Stage Master Lifecycle Graph</h3>
                <p style={{ fontSize: '13px', color: '#64748b' }}>
                  Acyclic Directed Graph (DAG) prevents cyclic loops while allowing parallel workstreams.
                </p>
                <Button size="sm" variant="outline">
                  Clone Template For Regional Entity
                </Button>
              </div>
            )}
          </div>
        )}
      </ViewStateRenderer>
    </div>
  );
};
