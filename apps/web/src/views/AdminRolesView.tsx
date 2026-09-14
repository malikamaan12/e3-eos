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
  const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('matrix');

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
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
              {isRtl ? 'مصفوفة صلاحيات وأدوار RBAC القياسية' : 'Canonical RBAC Roles & Capabilities Matrix'}
            </h1>
            <Badge variant="neutral">{isRtl ? '١٣ دوراً قياسياً' : '13 Canonical Roles'}</Badge>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
            {isRtl
              ? 'مقارنة حدود الصلاحيات وقواعد الحوكمة الصارمة عبر جميع أدوار تشغيل فعاليات E3.'
              : 'Strict role boundaries with plain-English "Can" and "Cannot by default" governance rules for E3 operations.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '6px' }}>
            <button
              id="btn-roles-view-matrix"
              onClick={() => setViewMode('matrix')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: viewMode === 'matrix' ? 700 : 500,
                backgroundColor: viewMode === 'matrix' ? '#ffffff' : 'transparent',
                color: viewMode === 'matrix' ? '#0f172a' : '#64748b',
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
                backgroundColor: viewMode === 'cards' ? '#ffffff' : 'transparent',
                color: viewMode === 'cards' ? '#0f172a' : '#64748b',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              📑 {isRtl ? 'ملفات الأدوار' : 'Role Profiles'}
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
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {isRtl ? 'مصفوفة مقارنة الصلاحيات عبر الـ 13 دوراً قياسياً' : 'Cross-Role Capability Comparison Matrix (13 Roles)'}
            </span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              {isRtl ? 'سياسة حوكمة العمليات المباشرة لدولة قطر' : 'Governed by Qatar Live Operations Policy Engine'}
            </span>
          </div>

          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: '1380px', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th
                    style={{
                      padding: '12px 14px',
                      fontWeight: 800,
                      color: '#0f172a',
                      textAlign: isRtl ? 'right' : 'left',
                      position: 'sticky',
                      left: isRtl ? undefined : 0,
                      right: isRtl ? 0 : undefined,
                      backgroundColor: '#f1f5f9',
                      zIndex: 2,
                      width: '220px',
                      minWidth: '220px',
                      boxShadow: isRtl ? '-2px 0 4px rgba(0,0,0,0.06)' : '2px 0 4px rgba(0,0,0,0.06)',
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
                        color: '#334155',
                        borderLeft: '1px solid #e2e8f0',
                        minWidth: '88px',
                      }}
                      title={r.title}
                    >
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '88px' }}>
                        {r.title.split(' ')[0]}
                      </div>
                      <code style={{ fontSize: '9px', color: '#64748b' }}>{r.role}</code>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {capabilitiesMatrix.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: rowIdx % 2 === 0 ? '#ffffff' : '#f8fafc',
                    }}
                  >
                    <td
                      style={{
                        padding: '10px 14px',
                        fontWeight: 700,
                        color: '#0f172a',
                        position: 'sticky',
                        left: isRtl ? undefined : 0,
                        right: isRtl ? 0 : undefined,
                        backgroundColor: rowIdx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        zIndex: 1,
                        width: '220px',
                        minWidth: '220px',
                        boxShadow: isRtl ? '-2px 0 4px rgba(0,0,0,0.06)' : '2px 0 4px rgba(0,0,0,0.06)',
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
                            borderLeft: '1px solid #f1f5f9',
                            fontSize: '11px',
                            fontWeight: isFull ? 700 : 500,
                            color: isFull ? '#15803d' : isLock ? '#dc2626' : isRestricted ? '#94a3b8' : '#b45309',
                            backgroundColor: isFull ? '#f0fdf4' : 'transparent',
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
      ) : (
        <Card noPadding>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Loading roles catalog...</div>
        ) : (
          <div>
            <div
              style={{
                padding: '12px 20px',
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Role Profile & Scope ({filteredRoles.length})
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
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
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>{r.title}</span>
                        <code style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: '#f1f5f9', borderRadius: '4px', color: '#475569', fontWeight: 600 }}>
                          {r.role}
                        </code>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#475569' }}>{r.description}</p>
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
                            backgroundColor: p === '*' ? '#faf5ff' : '#eff6ff',
                            color: p === '*' ? '#6b21a8' : '#1d4ed8',
                            border: p === '*' ? '1px solid #e9d5ff' : '1px solid #bfdbfe',
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
                    <div style={{ padding: '10px 14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                        ✓ Can (Authorized Capabilities)
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#15803d', lineHeight: 1.5 }}>
                        {canList.map((item: string, idx: number) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Cannot by default */}
                    <div style={{ padding: '10px 14px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '6px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                        ✕ Cannot by Default (Governance Boundaries)
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#c2410c', lineHeight: 1.5 }}>
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
      )}
    </div>
  );
};
