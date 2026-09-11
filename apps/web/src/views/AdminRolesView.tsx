import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, Badge, Button, Input } from '../components/DesignSystem.js';
import { CANONICAL_ROLE_EXPLANATIONS } from '../utils/role-explanations.js';

export const AdminRolesView: React.FC = () => {
  const { apiClient, navigate } = useEosContext();
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
              Canonical RBAC Roles & Capabilities Matrix
            </h1>
            <Badge variant="neutral">13 Canonical Roles</Badge>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
            Strict role boundaries with plain-English "Can" and "Cannot by default" governance rules for E3 operations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" size="md" onClick={() => navigate('/admin/users')}>
            ← Back to Users
          </Button>
        </div>
      </div>

      <div style={{ marginBottom: '16px', maxWidth: '360px' }}>
        <Input
          placeholder="Filter roles by title, key, or duty..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

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
    </div>
  );
};
