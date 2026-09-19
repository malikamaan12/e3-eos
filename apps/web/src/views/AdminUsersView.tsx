import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, Badge, Button, Modal, Input, Select } from '../components/DesignSystem.js';
import { CANONICAL_ROLE_EXPLANATIONS, getRoleExplanation } from '../utils/role-explanations.js';

export const AdminUsersView: React.FC = () => {
  const { currentLanguage, apiClient, navigate, refreshTrigger, triggerRefresh, switchPersona, currentUser } = useEosContext();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Role Inspector Modal
  const [inspectingRole, setInspectingRole] = useState<string | null>(null);

  // Invite Modal
  const [isInviteOpen, setIsInviteOpen] = useState<boolean>(false);
  const [inviteName, setInviteName] = useState<string>('Sultan Al-Kuwari');
  const [inviteEmail, setInviteEmail] = useState<string>('sultan.pm@e3.qa');
  const [inviteRole, setInviteRole] = useState<string>('project_manager');
  const [isInviting, setIsInviting] = useState<boolean>(false);

  // Project Access Modal
  const [isAccessOpen, setIsAccessOpen] = useState<boolean>(false);
  const [accessProjectId, setAccessProjectId] = useState<string>('f1111111-1111-4111-8111-111111111111');
  const [accessUserId, setAccessUserId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadUsers() {
      setLoading(true);
      try {
        const list = await apiClient.getAdminUsers();
        if (isMounted) {
          setUsers(list);
          if (list.length > 0 && !accessUserId) {
            setAccessUserId(list[0].id);
          }
        }
      } catch {
        // Fallback
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadUsers();
    return () => { isMounted = false; };
  }, [apiClient, refreshTrigger]);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setIsInviting(true);
    try {
      await apiClient.inviteUser({
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
      });
      setIsInviteOpen(false);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to invite user');
    } finally {
      setIsInviting(false);
    }
  };

  const handleAssignAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAssigning(true);
    try {
      await apiClient.assignProjectAccess({
        projectId: accessProjectId,
        userId: accessUserId,
        role: 'project_manager',
      });
      setIsAccessOpen(false);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to assign project access');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
            {currentLanguage === 'ar' ? 'إدارة المستخدمين والصلاحيات' : 'User Administration'}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted, #94a3b8)' }}>
            {currentLanguage === 'ar'
              ? 'إدارة حسابات الفريق وتعيين الأدوار الصارمة ومنح صلاحيات المشاريع'
              : 'Enterprise user provisioning, RBAC role assignments, and project access delegation'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" size="md" onClick={() => navigate('/admin/roles')}>
            Permission Matrix
          </Button>
          <Button id="admin-assign-access-btn" variant="secondary" size="md" onClick={() => setIsAccessOpen(true)}>
            Assign Project Access
          </Button>
          <Button id="admin-invite-user-btn" variant="primary" size="md" onClick={() => setIsInviteOpen(true)}>
            + Invite User
          </Button>
        </div>
      </div>

      <Card noPadding>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
            Querying users directly from Cloud SQL PostgreSQL...
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ minWidth: '760px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 1.6fr 120px 100px 110px 120px',
                  padding: '12px 18px',
                  backgroundColor: 'var(--surface-2, #151e2e)',
                  borderBottom: '1px solid var(--border-default, #2a374b)',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-muted, #94a3b8)',
                  textTransform: 'uppercase',
                }}
              >
                <span>{currentLanguage === 'ar' ? 'المستخدم' : 'User Name'}</span>
                <span>{currentLanguage === 'ar' ? 'البريد الإلكتروني' : 'Email'}</span>
                <span>{currentLanguage === 'ar' ? 'الدور' : 'Role'}</span>
                <span>{currentLanguage === 'ar' ? 'النطاق' : 'Audience'}</span>
                <span>{currentLanguage === 'ar' ? 'الجهة' : 'Organization'}</span>
                <span>{currentLanguage === 'ar' ? 'الإجراءات' : 'Actions'}</span>
              </div>

              {users.map((u) => {
                const effectiveRole = u.isSuperAdmin && (!u.role || u.role === 'unassigned') ? 'super_admin' : (u.role || 'project_manager');
                const effectiveAudience = (!u.audience || u.audience === 'unassigned') ? 'internal' : u.audience;

                return (
                  <div
                    key={u.id}
                    id={`user-row-${u.email}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.4fr 1.6fr 120px 100px 110px 120px',
                      alignItems: 'center',
                      padding: '12px 18px',
                      borderBottom: '1px solid var(--border-subtle, #1d2939)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>{u.name}</div>
                      {u.isSuperAdmin && <span style={{ fontSize: '10px', color: '#a78bfa', fontWeight: 700 }}>Root Governance</span>}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary, #cbd5e1)', fontFamily: 'monospace' }}>
                      {u.email}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Badge variant={(effectiveRole === 'super_admin' || u.isSuperAdmin) ? 'purple' : effectiveRole === 'client_user' ? 'warning' : 'info'}>
                        {effectiveRole}
                      </Badge>
                      {CANONICAL_ROLE_EXPLANATIONS[effectiveRole] && (
                        <button
                          type="button"
                          id={`inspect-role-btn-${u.id}`}
                          title="View plain-English capabilities and governance boundaries"
                          onClick={() => setInspectingRole(effectiveRole)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '13px',
                            color: 'var(--text-muted, #94a3b8)',
                            padding: '2px',
                          }}
                        >
                          ℹ️
                        </button>
                      )}
                    </div>
                    <div>
                      <Badge variant={effectiveAudience === 'internal' ? 'neutral' : 'warning'}>
                        {effectiveAudience}
                      </Badge>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                      {u.organisationName || 'E3 Events'}
                    </div>
                    <div>
                      {currentUser?.isSuperAdmin && u.email !== currentUser.email ? (
                        <button
                          id={`btn-impersonate-${u.id}`}
                          type="button"
                          onClick={() => switchPersona(u.email)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: 'var(--surface-2, #151e2e)',
                            border: '1px solid var(--border-default, #2a374b)',
                            borderRadius: '4px',
                            color: 'var(--text-secondary, #cbd5e1)',
                            cursor: 'pointer',
                          }}
                        >
                          {currentLanguage === 'ar' ? 'معاينة كـ دور' : 'Audit as Role'}
                        </button>
                      ) : currentUser && u.email === currentUser.email ? (
                        <Badge variant="neutral">
                          {currentLanguage === 'ar' ? 'الجلسة الحالية' : 'Active Session'}
                        </Badge>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setAccessUserId(u.id);
                            setIsAccessOpen(true);
                          }}
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: 'var(--surface-2, #151e2e)',
                            border: '1px solid var(--border-default, #2a374b)',
                            borderRadius: '4px',
                            color: 'var(--accent, #d97706)',
                            cursor: 'pointer',
                          }}
                        >
                          {currentLanguage === 'ar' ? 'إدارة الوصول' : 'Manage Access'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Modal: Invite User */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite New Enterprise User"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
            <Button id="submit-invite-user-btn" variant="primary" isLoading={isInviting} onClick={handleInviteUser}>
              Send Invitation
            </Button>
          </>
        }
      >
        <form onSubmit={handleInviteUser}>
          <Input
            id="invite-user-name"
            label="Full Name *"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            required
          />
          <Input
            id="invite-user-email"
            label="Work Email Address *"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />
          <Select
            id="invite-user-role"
            label="Canonical Role *"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            options={[
              { value: 'project_manager', label: 'Project Manager (Lead PM)' },
              { value: 'project_director', label: 'Project Director' },
              { value: 'executive', label: 'Executive Partner' },
              { value: 'finance', label: 'Financial Controller' },
              { value: 'procurement', label: 'Procurement Manager' },
              { value: 'design_production', label: 'Design / Production Director' },
              { value: 'operations', label: 'Head of Event Operations' },
              { value: 'logistics', label: 'Logistics & Fleet Manager' },
              { value: 'hse_quality', label: 'HSE / Quality Inspector' },
              { value: 'marketing_commercial', label: 'Marketing & Commercial Lead' },
              { value: 'field_supervisor', label: 'Field Supervisor' },
              { value: 'client_user', label: 'Client Stakeholder' },
              { value: 'super_admin', label: 'Super Admin (Tenant Root)' },
            ]}
          />

          {/* Live Role Explanation Preview Card */}
          {(() => {
            const exp = getRoleExplanation(inviteRole);
            if (!exp) return null;
            return (
              <div
                id="invite-role-explanation"
                style={{
                  marginTop: '12px',
                  padding: '12px',
                  backgroundColor: 'var(--surface-2, #151e2e)',
                  border: '1px solid var(--border-default, #2a374b)',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--text-primary, #f8fafc)', marginBottom: '4px' }}>
                  {exp.title} — Scope & Boundaries
                </div>
                <div style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: '8px' }}>{exp.description}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ padding: '8px', backgroundColor: 'rgba(34, 197, 94, 0.12)', borderRadius: '4px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                    <div style={{ fontWeight: 700, color: '#22c55e', fontSize: '11px', marginBottom: '4px' }}>✓ CAN:</div>
                    <ul style={{ margin: 0, paddingLeft: '14px', color: '#4ade80', lineHeight: 1.4 }}>
                      {exp.can.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                  <div style={{ padding: '8px', backgroundColor: 'rgba(239, 68, 68, 0.12)', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <div style={{ fontWeight: 700, color: '#ef4444', fontSize: '11px', marginBottom: '4px' }}>✕ CANNOT BY DEFAULT:</div>
                    <ul style={{ margin: 0, paddingLeft: '14px', color: '#f87171', lineHeight: 1.4 }}>
                      {exp.cannot.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })()}
        </form>
      </Modal>

      {/* Modal: Assign Project Access */}
      <Modal
        isOpen={isAccessOpen}
        onClose={() => setIsAccessOpen(false)}
        title="Assign User to Project"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAccessOpen(false)}>Cancel</Button>
            <Button id="submit-project-access-btn" variant="primary" isLoading={isAssigning} onClick={handleAssignAccess}>
              Grant Access
            </Button>
          </>
        }
      >
        <form onSubmit={handleAssignAccess}>
          <Input
            id="assign-project-id"
            label="Project ID *"
            value={accessProjectId}
            onChange={(e) => setAccessProjectId(e.target.value)}
            required
          />
          <Select
            id="assign-user-id"
            label="Select User *"
            value={accessUserId}
            onChange={(e) => setAccessUserId(e.target.value)}
            options={users.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }))}
          />
        </form>
      </Modal>

      {/* Modal: Role Governance Details */}
      <Modal
        isOpen={inspectingRole !== null}
        onClose={() => setInspectingRole(null)}
        title={inspectingRole ? `${getRoleExplanation(inspectingRole)?.title || inspectingRole} — Capabilities & Governance` : 'Role Details'}
        footer={
          <Button variant="secondary" onClick={() => setInspectingRole(null)}>
            Close
          </Button>
        }
      >
        {inspectingRole && (() => {
          const exp = getRoleExplanation(inspectingRole);
          if (!exp) return <div>No details available for role: {inspectingRole}</div>;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>{exp.title}</span>
                  <code style={{ fontSize: '12px', padding: '2px 8px', backgroundColor: 'var(--surface-inset, #0b111d)', borderRadius: '4px', color: 'var(--text-secondary, #cbd5e1)' }}>{exp.role}</code>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #cbd5e1)' }}>{exp.description}</p>
              </div>

              <div style={{ padding: '12px', backgroundColor: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#22c55e', textTransform: 'uppercase', marginBottom: '6px' }}>
                  ✓ Can (Authorized Capabilities)
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#4ade80', lineHeight: 1.5 }}>
                  {exp.can.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', marginBottom: '6px' }}>
                  ✕ Cannot by Default (Governance Boundaries)
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#f87171', lineHeight: 1.5 }}>
                  {exp.cannot.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', fontStyle: 'italic' }}>
                * Role boundaries are enforced server-side by NestJS guards and PostgreSQL Row-Level Security policies.
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};
