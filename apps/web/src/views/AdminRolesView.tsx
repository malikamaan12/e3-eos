import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, Badge, Button } from '../components/DesignSystem.js';

export const AdminRolesView: React.FC = () => {
  const { apiClient, navigate } = useEosContext();
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadRoles() {
      try {
        const list = await apiClient.getAdminRoles();
        if (isMounted) setRoles(list);
      } catch {
        // Handled
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadRoles();
    return () => { isMounted = false; };
  }, [apiClient]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
            Canonical RBAC Roles & Permissions Matrix
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
            Strict capability enforcement: all 13 canonical E3 enterprise event operational roles
          </p>
        </div>

        <Button variant="secondary" size="md" onClick={() => navigate('/admin/users')}>
          ← Back to Users
        </Button>
      </div>

      <Card noPadding>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Loading roles catalog...</div>
        ) : (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '200px 1.5fr 2fr',
                padding: '10px 18px',
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                fontSize: '11px',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
              }}
            >
              <span>Role Title</span>
              <span>Operational Purpose</span>
              <span>Enforced Permissions</span>
            </div>

            {roles.map((r) => (
              <div
                key={r.role}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '200px 1.5fr 2fr',
                  padding: '14px 18px',
                  borderBottom: '1px solid #f1f5f9',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{r.title}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    {r.role}
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4, paddingRight: '12px' }}>
                  {r.description}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {r.permissions.map((p: string) => (
                    <span
                      key={p}
                      style={{
                        fontSize: '11px',
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
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
