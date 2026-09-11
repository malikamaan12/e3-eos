import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, Badge, Button, Modal, Input, Select } from '../components/DesignSystem.js';

export const AdminUsersView: React.FC = () => {
  const { currentLanguage, apiClient, navigate, refreshTrigger, triggerRefresh, switchPersona, currentUser } = useEosContext();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
            {currentLanguage === 'ar' ? 'إدارة المستخدمين والصلاحيات' : 'User Administration'}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
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
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
            Querying users directly from Cloud SQL PostgreSQL...
          </div>
        ) : (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 1.6fr 120px 100px 110px 120px',
                padding: '12px 18px',
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                fontSize: '11px',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
              }}
            >
              <span>User Name</span>
              <span>Email</span>
              <span>Role</span>
              <span>Audience</span>
              <span>Organization</span>
              <span>Actions</span>
            </div>

            {users.map((u) => (
              <div
                key={u.id}
                id={`user-row-${u.email}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 1.6fr 120px 100px 110px 120px',
                  alignItems: 'center',
                  padding: '12px 18px',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{u.name}</div>
                  {u.isSuperAdmin && <span style={{ fontSize: '10px', color: '#7c3aed', fontWeight: 700 }}>Root Governance</span>}
                </div>
                <div style={{ fontSize: '13px', color: '#475569', fontFamily: 'monospace' }}>
                  {u.email}
                </div>
                <div>
                  <Badge variant={u.role === 'super_admin' ? 'purple' : u.role === 'client_user' ? 'warning' : 'info'}>
                    {u.role}
                  </Badge>
                </div>
                <div>
                  <Badge variant={u.audience === 'internal' ? 'neutral' : 'warning'}>
                    {u.audience || 'internal'}
                  </Badge>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  {u.organisationName || 'E3 Events'}
                </div>
                <div>
                  {currentUser?.isSuperAdmin && u.email !== currentUser.email && (
                    <button
                      id={`btn-impersonate-${u.id}`}
                      type="button"
                      onClick={() => switchPersona(u.email)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        color: '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      Audit as Role
                    </button>
                  )}
                </div>
              </div>
            ))}
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
              { value: 'design_production', label: 'Design / Technical Director' },
              { value: 'operations', label: 'Head of Live Ops' },
              { value: 'hse_quality', label: 'HSE / Safety Inspector' },
              { value: 'client_user', label: 'Client Stakeholder' },
            ]}
          />
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
    </div>
  );
};
