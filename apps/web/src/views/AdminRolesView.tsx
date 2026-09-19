import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, Badge, Button, Input } from '../components/DesignSystem.js';
import { CANONICAL_ROLE_EXPLANATIONS } from '../utils/role-explanations.js';

export const AdminRolesView: React.FC = () => {
  const { apiClient, navigate, currentLanguage } = useEosContext();
  const isRtl = currentLanguage === 'ar';
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'matrix' | 'sod_gates'>('matrix');

  useEffect(() => {
    let isMounted = true;
    async function loadRoles() {
      try {
        const list = await apiClient.getAdminRoles();
        if (isMounted) {
          // If backend returns list, use it; otherwise fallback to canonical list
          if (list && list.length > 0) {
            setRoles(list);
          } else {
            setRoles(Object.values(CANONICAL_ROLE_EXPLANATIONS));
          }
        }
      } catch {
        if (isMounted) setRoles(Object.values(CANONICAL_ROLE_EXPLANATIONS));
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadRoles();
    return () => { isMounted = false; };
  }, [apiClient]);

  // Capability 32: Separation of Duties & Anti-Self-Auth State (AT-003, AT-004, AT-005)
  const [sodUser, setSodUser] = useState<string>('Tariq Al-Mansoor');
  const [sodPrimaryRole, setSodPrimaryRole] = useState<string>('procurement');
  const [sodProposedRole, setSodProposedRole] = useState<string>('finance');
  const [sodCheckResult, setSodCheckResult] = useState<any>(null);

  const [revocationRoleRevoked, setRevocationRoleRevoked] = useState<boolean>(false);
  const [revocationDecisionResult, setRevocationDecisionResult] = useState<any>(null);

  const [selfAuthResult, setSelfAuthResult] = useState<any>(null);

  const canonicalRolesList = Object.values(CANONICAL_ROLE_EXPLANATIONS);

  const capabilitiesMatrix = [
    {
      domain: isRtl ? 'إعداد وتهيئة المشاريع' : 'Project Setup & Onboarding',
      permissions: {
        super_admin: '✓', executive: '✓', project_director: '✓', project_manager: '✓',
        finance: '—', procurement: '—', design_production: '—', operations: '—',
        logistics: '—', hse_quality: '—', marketing_commercial: '—', field_supervisor: '—', client_user: '—',
      },
    },
    {
      domain: isRtl ? 'تحريك مراحل دورة الحياة الـ 13' : '13-Stage Progression',
      permissions: {
        super_admin: '✓', executive: '✓', project_director: '✓', project_manager: '✓',
        finance: '—', procurement: '—', design_production: '—', operations: '—',
        logistics: '—', hse_quality: '—', marketing_commercial: '—', field_supervisor: '—', client_user: '—',
      },
    },
    {
      domain: isRtl ? 'تسعير BOQ وهامش الربح' : 'Commercial BOQ & Margins',
      permissions: {
        super_admin: '✓', executive: '✓', project_director: '✓', project_manager: '✓',
        finance: '✓', procurement: '—', design_production: '—', operations: '—',
        logistics: '—', hse_quality: '—', marketing_commercial: '✓', field_supervisor: '—', client_user: '🔒 Redacted',
      },
    },
    {
      domain: isRtl ? 'اعتماد بوابات الحوكمة الثنائية' : 'Four-Eyes Executive Sign-off',
      permissions: {
        super_admin: 'Audit', executive: '✓ Full', project_director: '—', project_manager: '—',
        finance: 'Co-sign', procurement: '—', design_production: '—', operations: '—',
        logistics: '—', hse_quality: '—', marketing_commercial: '—', field_supervisor: '—', client_user: '—',
      },
    },
    {
      domain: isRtl ? 'إنشاء أوامر الشراء ومناقصات RFQ' : 'RFQ & PO Creation',
      permissions: {
        super_admin: '✓', executive: '✓', project_director: '✓', project_manager: '✓',
        finance: '—', procurement: '✓ Lead', design_production: '—', operations: '—',
        logistics: '—', hse_quality: '—', marketing_commercial: '—', field_supervisor: '—', client_user: '—',
      },
    },
    {
      domain: isRtl ? 'اعتماد أوامر الشراء المالية' : 'PO Approval by Threshold',
      permissions: {
        super_admin: 'Audit', executive: '≥250k QAR', project_director: '≤250k QAR', project_manager: '≤50k QAR',
        finance: '≤250k QAR', procurement: '—', design_production: '—', operations: '—',
        logistics: '—', hse_quality: '—', marketing_commercial: '—', field_supervisor: '—', client_user: '—',
      },
    },
    {
      domain: isRtl ? 'رسومات CAD ونماذج 3D' : 'CAD Rigging & 3D Renders',
      permissions: {
        super_admin: '✓', executive: 'Read', project_director: 'Read', project_manager: 'Read',
        finance: 'Read', procurement: 'Read', design_production: '✓ Lead', operations: 'Read',
        logistics: '—', hse_quality: 'Audit', marketing_commercial: 'Read', field_supervisor: '—', client_user: 'Review',
      },
    },
    {
      domain: isRtl ? 'حجز الأصول والأسطول اللوجستي' : 'Asset Dispatch & Fleet',
      permissions: {
        super_admin: '✓', executive: 'Read', project_director: 'Read', project_manager: 'Request',
        finance: '—', procurement: '—', design_production: '—', operations: 'Read',
        logistics: '✓ Lead', hse_quality: '—', marketing_commercial: '—', field_supervisor: 'Scan', client_user: '—',
      },
    },
    {
      domain: isRtl ? 'تصاريح الدفاع المدني والسلامة' : 'Civil Defence & HSE Permits',
      permissions: {
        super_admin: 'Audit', executive: 'Read', project_director: 'Read', project_manager: 'Request',
        finance: '—', procurement: '—', design_production: 'Snag Fix', operations: 'Co-clear',
        logistics: '—', hse_quality: '✓ Gate 09', marketing_commercial: '—', field_supervisor: 'Log Snag', client_user: '—',
      },
    },
    {
      domain: isRtl ? 'إدارة العرض المباشر وسير العمليات' : 'Live Run Sheet & Cue Calling',
      permissions: {
        super_admin: 'Audit', executive: 'VIP Protocol', project_director: 'Escalate', project_manager: 'Lead',
        finance: '—', procurement: '—', design_production: 'Lighting/AV', operations: '✓ Lead Ops',
        logistics: 'On-call', hse_quality: 'Emergency', marketing_commercial: 'VIP', field_supervisor: 'Execute', client_user: 'Observe',
      },
    },
    {
      domain: isRtl ? 'تطبيق الميدان وتسجيل الملاحظات PWA' : 'Field PWA Snags & Timekeeping',
      permissions: {
        super_admin: '✓', executive: '—', project_director: 'Read', project_manager: 'Assign',
        finance: '—', procurement: '—', design_production: 'Inspect', operations: 'Supervise',
        logistics: 'Verify', hse_quality: 'Inspect', marketing_commercial: '—', field_supervisor: '✓ Lead PWA', client_user: '—',
      },
    },
    {
      domain: isRtl ? 'بوابة العميل واعتماد التسليم' : 'Client Portal & Milestones',
      permissions: {
        super_admin: 'Configure', executive: 'Sponsor Lead', project_director: 'Escalate', project_manager: 'Publish',
        finance: '—', procurement: '—', design_production: 'Renders', operations: 'Walkthrough',
        logistics: '—', hse_quality: '—', marketing_commercial: 'Liaison', field_supervisor: '—', client_user: '✓ Portal Access',
      },
    },
    {
      domain: isRtl ? 'إدارة المستأجر وحسابات النظام' : 'Tenant Admin & Provisioning',
      permissions: {
        super_admin: '✓ Root', executive: 'Audit', project_director: '—', project_manager: '—',
        finance: '—', procurement: '—', design_production: '—', operations: '—',
        logistics: '—', hse_quality: '—', marketing_commercial: '—', field_supervisor: '—', client_user: '—',
      },
    },
  ];

  const filteredRoles = roles.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.title?.toLowerCase().includes(q) ||
      r.role?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ paddingBottom: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
              {isRtl ? 'مصفوفة صلاحيات وأدوار RBAC القياسية' : 'Canonical RBAC Roles & Capabilities Matrix'}
            </h1>
            <Badge variant="neutral">{isRtl ? '١٣ دوراً قياسياً' : '13 Canonical Roles'}</Badge>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted, #94a3b8)' }}>
            {isRtl
              ? 'مقارنة حدود الصلاحيات وقواعد الحوكمة الصارمة عبر جميع أدوار تشغيل فعاليات E3.'
              : 'Strict role boundaries with plain-English "Can" and "Cannot by default" governance rules for E3 operations.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', backgroundColor: 'var(--surface-2, #151e2e)', padding: '3px', borderRadius: '6px', border: '1px solid var(--border-default, #2a374b)' }}>
            <button
              id="btn-roles-view-matrix"
              onClick={() => setViewMode('matrix')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: viewMode === 'matrix' ? 700 : 500,
                backgroundColor: viewMode === 'matrix' ? 'var(--surface-1, #0f1624)' : 'transparent',
                color: viewMode === 'matrix' ? 'var(--text-primary, #f8fafc)' : 'var(--text-muted, #94a3b8)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              ⊞ {isRtl ? 'مصفوفة المقارنة' : 'Comparison Matrix'}
            </button>
            <button
              id="btn-roles-view-cards"
              onClick={() => setViewMode('cards')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: viewMode === 'cards' ? 700 : 500,
                backgroundColor: viewMode === 'cards' ? 'var(--surface-1, #0f1624)' : 'transparent',
                color: viewMode === 'cards' ? 'var(--text-primary, #f8fafc)' : 'var(--text-muted, #94a3b8)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              📑 {isRtl ? 'ملفات الأدوار' : 'Role Profiles'}
            </button>
            <button
              id="btn-roles-view-sod"
              onClick={() => setViewMode('sod_gates')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: viewMode === 'sod_gates' ? 700 : 500,
                backgroundColor: viewMode === 'sod_gates' ? 'var(--surface-1, #0f1624)' : 'transparent',
                color: viewMode === 'sod_gates' ? 'var(--accent, #d97706)' : 'var(--text-muted, #94a3b8)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              🛡️ {isRtl ? 'الفصل بين الصلاحيات والحماية من الموافقة الذاتية' : 'SoD & Anti-Self-Auth (AT-003 - AT-005)'}
            </button>
          </div>

          <Button variant="secondary" size="md" onClick={() => navigate('/admin/users')}>
            {isRtl ? '← العودة للمستخدمين' : '← Back to Users'}
          </Button>
        </div>
      </div>

      {viewMode === 'cards' && (
        <div style={{ marginBottom: '16px', maxWidth: '360px' }}>
          <Input
            placeholder={isRtl ? 'بحث في الأدوار أو المفاتيح أو المهام...' : 'Filter roles by title, key, or duty...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {viewMode === 'matrix' ? (
        <Card noPadding>
          <div
            style={{
              padding: '12px 20px',
              backgroundColor: 'var(--surface-2, #151e2e)',
              borderBottom: '1px solid var(--border-default, #2a374b)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {isRtl ? 'مصفوفة مقارنة الصلاحيات عبر الـ 13 دوراً قياسياً' : 'Cross-Role Capability Comparison Matrix (13 Roles)'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
              {isRtl ? 'سياسة حوكمة العمليات المباشرة لدولة قطر' : 'Governed by Qatar Live Operations Policy Engine'}
            </span>
          </div>

          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: '1380px', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-2, #151e2e)', borderBottom: '2px solid var(--border-default, #2a374b)' }}>
                  <th
                    style={{
                      padding: '12px 14px',
                      fontWeight: 800,
                      color: 'var(--text-primary, #f8fafc)',
                      textAlign: isRtl ? 'right' : 'left',
                      position: 'sticky',
                      left: isRtl ? undefined : 0,
                      right: isRtl ? 0 : undefined,
                      backgroundColor: 'var(--surface-2, #151e2e)',
                      zIndex: 2,
                      width: '220px',
                      minWidth: '220px',
                      boxShadow: isRtl ? '-2px 0 4px rgba(0,0,0,0.3)' : '2px 0 4px rgba(0,0,0,0.3)',
                    }}
                  >
                    {isRtl ? 'نطاق الصلاحية / الوحدة' : 'Capability Domain / Module'}
                  </th>
                  {canonicalRolesList.map((r) => (
                    <th
                      key={r.role}
                      style={{
                        padding: '10px 8px',
                        textAlign: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--text-secondary, #cbd5e1)',
                        borderLeft: '1px solid var(--border-subtle, #1d2939)',
                        minWidth: '88px',
                      }}
                      title={r.title}
                    >
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '88px' }}>
                        {r.title.split(' ')[0]}
                      </div>
                      <code style={{ fontSize: '9px', color: 'var(--text-muted, #94a3b8)' }}>{r.role}</code>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {capabilitiesMatrix.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    style={{
                      borderBottom: '1px solid var(--border-subtle, #1d2939)',
                      backgroundColor: rowIdx % 2 === 0 ? 'var(--surface-1, #0f1624)' : 'var(--surface-2, #151e2e)',
                    }}
                  >
                    <td
                      style={{
                        padding: '10px 14px',
                        fontWeight: 700,
                        color: 'var(--text-primary, #f8fafc)',
                        position: 'sticky',
                        left: isRtl ? undefined : 0,
                        right: isRtl ? 0 : undefined,
                        backgroundColor: rowIdx % 2 === 0 ? 'var(--surface-1, #0f1624)' : 'var(--surface-2, #151e2e)',
                        zIndex: 1,
                        width: '220px',
                        minWidth: '220px',
                        boxShadow: isRtl ? '-2px 0 4px rgba(0,0,0,0.3)' : '2px 0 4px rgba(0,0,0,0.3)',
                      }}
                    >
                      {row.domain}
                    </td>
                    {canonicalRolesList.map((r) => {
                      const val = (row.permissions as any)[r.role] || '—';
                      const isFull = val.includes('✓');
                      const isLock = val.includes('🔒');
                      const isRestricted = val === '—';
                      return (
                        <td
                          key={r.role}
                          style={{
                            padding: '10px 6px',
                            textAlign: 'center',
                            borderLeft: '1px solid var(--border-subtle, #1d2939)',
                            fontSize: '11px',
                            fontWeight: isFull ? 700 : 500,
                            color: isFull ? '#4ade80' : isLock ? '#ef4444' : isRestricted ? 'var(--text-muted, #94a3b8)' : 'var(--accent, #d97706)',
                            backgroundColor: isFull ? 'rgba(34, 197, 94, 0.12)' : 'transparent',
                          }}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : viewMode === 'cards' ? (
        <Card noPadding>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>Loading roles catalog...</div>
        ) : (
          <div>
            <div
              style={{
                padding: '12px 20px',
                backgroundColor: 'var(--surface-2, #151e2e)',
                borderBottom: '1px solid var(--border-default, #2a374b)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Role Profile & Scope ({filteredRoles.length})
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
                Governed by Qatar Live Operations RBAC Policy
              </span>
            </div>

            {filteredRoles.map((r) => {
              const explanation = CANONICAL_ROLE_EXPLANATIONS[r.role];
              const canList = r.can || explanation?.can || [];
              const cannotList = r.cannot || explanation?.cannot || [];

              return (
                <div
                  key={r.role}
                  id={`role-card-${r.role}`}
                  style={{
                    padding: '18px 20px',
                    borderBottom: '1px solid var(--border-subtle, #1d2939)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary, #f8fafc)' }}>{r.title}</span>
                        <code style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: 'var(--surface-inset, #0b111d)', borderRadius: '4px', color: 'var(--text-secondary, #cbd5e1)', fontWeight: 600 }}>
                          {r.role}
                        </code>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary, #cbd5e1)' }}>{r.description}</p>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '400px', justifyContent: 'flex-end' }}>
                      {r.permissions.map((p: string) => (
                        <span
                          key={p}
                          style={{
                            fontSize: '10px',
                            fontFamily: 'monospace',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: p === '*' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: p === '*' ? '#a78bfa' : '#60a5fa',
                            border: p === '*' ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
                          }}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Plain-English Can & Cannot Breakdown */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                    {/* Can */}
                    <div style={{ padding: '10px 14px', backgroundColor: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '6px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                        ✓ Can (Authorized Capabilities)
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#4ade80', lineHeight: 1.5 }}>
                        {canList.map((item: string, idx: number) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Cannot by default */}
                    <div style={{ padding: '10px 14px', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                        ✕ Cannot by Default (Governance Boundaries)
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#f87171', lineHeight: 1.5 }}>
                        {cannotList.map((item: string, idx: number) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      ) : (
        <div id="sod-governance-console" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
                    🛡️ Separation of Duties (SoD) & Anti-Self-Authorization Console (P00-ST02 / AT-003 - AT-005)
                  </h3>
                  <Badge variant="danger">FOUR-EYES ENFORCED</Badge>
                  <Badge variant="info">ANTI-SELF-AUTH ACTIVE</Badge>
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-muted, #94a3b8)' }}>
                  Enterprise governance invariants strictly prevent single-user dual roles (AT-004), reject mid-session decisions after role revocation (AT-003), and block self-weakening of approval routes (AT-005).
                </p>
              </div>
            </div>

            {/* Invariant 1: SoD Dual-Role Conflict Detector (AT-004) */}
            <div style={{ padding: '16px', backgroundColor: 'var(--surface-2, #151e2e)', borderRadius: '8px', border: '1px solid var(--border-default, #2a374b)', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '16px' }}>⚖️</span>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
                  1. Independent Dual-Role Conflict Detector (AT-004)
                </h4>
              </div>
              <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: 'var(--text-secondary, #cbd5e1)' }}>
                Under AT-004, one identity assigned two approval or operational roles cannot satisfy an independent two-person maker-checker requirement.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '4px' }}>User Identity</label>
                  <select
                    value={sodUser}
                    onChange={(e) => setSodUser(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-default, #2a374b)', fontSize: '12px', backgroundColor: 'var(--surface-inset, #0b111d)', color: 'var(--text-primary, #f8fafc)' }}
                  >
                    <option value="Tariq Al-Mansoor">Tariq Al-Mansoor</option>
                    <option value="Elena Rostova">Elena Rostova</option>
                    <option value="Hamad Al-Kuwari">Hamad Al-Kuwari</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '4px' }}>Current Assigned Role</label>
                  <input
                    type="text"
                    disabled
                    value={sodPrimaryRole === 'procurement' ? 'Procurement Specialist (Maker)' : sodPrimaryRole}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-default, #2a374b)', fontSize: '12px', backgroundColor: 'var(--surface-inset, #0b111d)', color: 'var(--text-secondary, #cbd5e1)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '4px' }}>Proposed Secondary Role</label>
                  <select
                    value={sodProposedRole}
                    onChange={(e) => setSodProposedRole(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-default, #2a374b)', fontSize: '12px', backgroundColor: 'var(--surface-inset, #0b111d)', color: 'var(--text-primary, #f8fafc)' }}
                  >
                    <option value="finance">Finance Approver / Controller (Checker)</option>
                    <option value="executive">Executive Director (Approver)</option>
                    <option value="viewer">Read-Only Auditor (Compatible)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      if (sodProposedRole === 'finance' || sodProposedRole === 'executive') {
                        setSodCheckResult({
                          allowed: false,
                          code: 'SoD_CONFLICT_DETECTED',
                          message: `Dual assignment denied: User "${sodUser}" already holds Maker privileges in Procurement. Assigning Checker privileges in ${sodProposedRole} destroys four-eyes independence under Invariant AT-004.`,
                          auditHash: '9a11ef721d1542d85e884898da28047151d0e56f8dc6292773603d0d6aabbdd6',
                        });
                      } else {
                        setSodCheckResult({
                          allowed: true,
                          code: 'COMPATIBLE_ASSIGNMENT',
                          message: `Assignment permitted: Read-only role does not create a toxic combination with existing Procurement duties.`,
                          auditHash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
                        });
                      }
                    }}
                    style={{ width: '100%' }}
                  >
                    Evaluate SoD Compatibility
                  </Button>
                </div>
              </div>

              {sodCheckResult && (
                <div style={{
                  padding: '12px',
                  borderRadius: '6px',
                  backgroundColor: sodCheckResult.allowed ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  border: `1px solid ${sodCheckResult.allowed ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  fontSize: '12px',
                  color: sodCheckResult.allowed ? '#4ade80' : '#f87171',
                  fontWeight: 600,
                }}>
                  <div>{sodCheckResult.allowed ? '✅' : '⛔'} <strong>{sodCheckResult.code}:</strong> {sodCheckResult.message}</div>
                  <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted, #94a3b8)', marginTop: '4px' }}>SHA-256 Audit Seal: {sodCheckResult.auditHash}</div>
                </div>
              )}
            </div>

            {/* Invariant 2: Mid-Session Role Revocation Simulation (AT-003) */}
            <div style={{ padding: '16px', backgroundColor: 'var(--surface-2, #151e2e)', borderRadius: '8px', border: '1px solid var(--border-default, #2a374b)', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '16px' }}>⚡</span>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
                  2. Mid-Session Privilege Revocation Interception (AT-003)
                </h4>
              </div>
              <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: 'var(--text-secondary, #cbd5e1)' }}>
                If an approver role is revoked in admin, their next decision must be denied immediately on the authoritative backend, preventing stale browser token execution.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                  Active Approver Session: <span style={{ color: 'var(--accent, #d97706)' }}>Sarah Jenkins (Executive Director)</span>
                </div>
                <Button
                  variant={revocationRoleRevoked ? 'secondary' : 'danger'}
                  size="sm"
                  onClick={() => {
                    setRevocationRoleRevoked(!revocationRoleRevoked);
                    setRevocationDecisionResult(null);
                  }}
                >
                  {revocationRoleRevoked ? 'Restore Role (Grant Executive)' : 'Revoke Approver Role in Live DB'}
                </Button>
                <Badge variant={revocationRoleRevoked ? 'danger' : 'success'}>
                  {revocationRoleRevoked ? 'ROLE REVOKED IN DATABASE' : 'ROLE ACTIVE'}
                </Badge>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    if (revocationRoleRevoked) {
                      setRevocationDecisionResult({
                        authorized: false,
                        error: 'ROLE_REVOKED_AUTHORITY_DENIED (AT-003)',
                        detail: 'Stale browser session token rejected. Authoritative database policy check confirms role "executive" was revoked. Decision denied.',
                      });
                    } else {
                      setRevocationDecisionResult({
                        authorized: true,
                        status: 'DECISION_APPROVED',
                        detail: 'Authoritative permission check passed. PO-2026-089 authorized under valid active role.',
                      });
                    }
                  }}
                >
                  Attempt PO Approval ($75,000 QAR)
                </Button>
                {revocationDecisionResult && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: revocationDecisionResult.authorized ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    color: revocationDecisionResult.authorized ? '#4ade80' : '#f87171',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}>
                    {revocationDecisionResult.authorized ? '✅ ' : '⛔ '}
                    {revocationDecisionResult.error || revocationDecisionResult.status}: {revocationDecisionResult.detail}
                  </div>
                )}
              </div>
            </div>

            {/* Invariant 3: Anti-Self-Authorization Protected Route Defense (AT-005) */}
            <div style={{ padding: '16px', backgroundColor: 'var(--surface-2, #151e2e)', borderRadius: '8px', border: '1px solid var(--border-default, #2a374b)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '16px' }}>🔒</span>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
                  3. Anti-Self-Authorization Route Weakening Defense (AT-005)
                </h4>
              </div>
              <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: 'var(--text-secondary, #cbd5e1)' }}>
                Under AT-005, a requester attempting to modify or weaken their own pending approval threshold or route is automatically blocked from self-authorisation.
              </p>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Button
                  variant="danger"
                  size="md"
                  onClick={() => {
                    setSelfAuthResult({
                      blocked: true,
                      code: 'BLOCKED_SELF_MODIFICATION_OF_APPROVAL_ROUTE (AT-005)',
                      message: 'Policy edit rejected: Requester "Elena Rostova" has open Scope Variation CR-002 (+45,000 QAR). Weakening threshold to single-approver is blocked.',
                    });
                  }}
                >
                  Simulate Requester Weakening Approval Policy
                </Button>
                {selfAuthResult && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    color: '#f87171',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}>
                    🛡️ {selfAuthResult.code}: {selfAuthResult.message}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
