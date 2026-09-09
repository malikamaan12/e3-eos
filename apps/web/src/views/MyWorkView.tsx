import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Tabs, Card, Badge, Button, EmptyState } from '../components/DesignSystem.js';

export const MyWorkView: React.FC = () => {
  const { currentUser, currentLanguage, apiClient, selectedProjectId, navigate, refreshTrigger, triggerRefresh } = useEosContext();
  const [activeTab, setActiveTab] = useState<string>('tasks');
  const [tasks, setTasks] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadWork() {
      setLoading(true);
      try {
        const [taskList, apprList] = await Promise.all([
          apiClient.getTasks(selectedProjectId),
          apiClient.getApprovalRequests(selectedProjectId),
        ]);
        if (isMounted) {
          setTasks(taskList || []);
          setApprovals(apprList || []);
        }
      } catch {
        // Fallback
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadWork();
    return () => { isMounted = false; };
  }, [apiClient, selectedProjectId, refreshTrigger]);

  const handleToggleComplete = async (taskId: string, isCompleted: boolean) => {
    if (isCompleted) return;
    try {
      await apiClient.completeTask(selectedProjectId, taskId, 'Completed via My Work dashboard');
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to complete task');
    }
  };

  const tabs = [
    { id: 'action', label: currentLanguage === 'ar' ? 'يتطلب إجراءً' : 'Needs Action', badge: approvals.filter(a => a.status === 'pending').length },
    { id: 'tasks', label: currentLanguage === 'ar' ? 'مهامي' : 'My Tasks', badge: tasks.length },
    { id: 'approvals', label: currentLanguage === 'ar' ? 'الموافقات' : 'Approvals', badge: approvals.length },
    { id: 'upcoming', label: currentLanguage === 'ar' ? 'المواعيد القادمة' : 'Upcoming Milestones' },
    { id: 'activity', label: currentLanguage === 'ar' ? 'آخر التحديثات' : 'Recently Updated' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
            {currentLanguage === 'ar' ? 'مهامي ومسؤولياتي' : 'My Work'}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
            {currentLanguage === 'ar'
              ? `المهام والموافقات والقرارات المسندة إلى: ${currentUser.name}`
              : `Tasks, governance approvals, and milestone deliverables assigned to ${currentUser.name}`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" size="sm" onClick={triggerRefresh}>
            🔄 Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/projects')}>
            Browse Projects
          </Button>
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab 1: Needs Action */}
      {activeTab === 'action' && (
        <div>
          {approvals.filter(a => a.status === 'pending').length === 0 ? (
            <EmptyState
              icon="✅"
              title="All caught up!"
              description="No immediate approvals or blocked decisions waiting for your signature."
            />
          ) : (
            approvals.filter(a => a.status === 'pending').map((appr) => (
              <Card key={appr.id} style={{ borderLeft: '4px solid #f59e0b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <Badge variant="warning">Approval Pending</Badge>
                      <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>{appr.id}</span>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                      {appr.reason || `Approval Request for ${appr.targetType}`}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      Target Hash: <span style={{ fontFamily: 'monospace' }}>{appr.targetHash?.slice(0, 16)}...</span> • Required Role: {appr.requiredRole || 'Executive'}
                    </div>
                  </div>
                  <Button variant="primary" size="sm" onClick={() => navigate(`/projects/${selectedProjectId}`)}>
                    Review in Cockpit
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab 2: My Tasks */}
      {activeTab === 'tasks' && (
        <Card noPadding>
          {tasks.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
              No tasks currently assigned to you in the selected project.
            </div>
          ) : (
            <div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 140px 120px 140px',
                  padding: '10px 18px',
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                }}
              >
                <span>Done</span>
                <span>Task Description</span>
                <span>Assignee</span>
                <span>Status</span>
                <span style={{ textAlign: 'right' }}>Action</span>
              </div>
              {tasks.map((task) => {
                const completed = task.isCompleted || task.state === 'completed' || task.status === 'completed';
                return (
                  <div
                    key={task.id}
                    id={`task-row-${task.id}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 1fr 140px 120px 140px',
                      alignItems: 'center',
                      padding: '12px 18px',
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: completed ? '#f8fafc' : '#ffffff',
                    }}
                  >
                    <div>
                      <input
                        type="checkbox"
                        checked={completed}
                        onChange={() => handleToggleComplete(task.id, completed)}
                        disabled={completed}
                        style={{ cursor: completed ? 'default' : 'pointer', width: '16px', height: '16px' }}
                      />
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: completed ? '#94a3b8' : '#0f172a',
                          textDecoration: completed ? 'line-through' : 'none',
                        }}
                      >
                        {task.title}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {task.assignee || task.assigneeName || currentUser.name}
                    </div>
                    <div>
                      <Badge variant={completed ? 'success' : 'info'}>
                        {completed ? 'Completed' : 'Active'}
                      </Badge>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {!completed ? (
                        <Button
                          id={`complete-task-btn-${task.id}`}
                          variant="success"
                          size="sm"
                          onClick={() => handleToggleComplete(task.id, false)}
                        >
                          ✓ Mark Done
                        </Button>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>Verified</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Tab 3: Approvals */}
      {activeTab === 'approvals' && (
        <div>
          {approvals.length === 0 ? (
            <EmptyState icon="✍️" title="No Approvals Logged" description="No formal gate sign-off requests registered." />
          ) : (
            approvals.map((appr) => (
              <Card key={appr.id} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{appr.id}</span>
                      <Badge variant={appr.status === 'approved' ? 'success' : appr.status === 'rejected' ? 'danger' : 'warning'}>
                        {appr.status?.toUpperCase()}
                      </Badge>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      Target: {appr.targetType} ({appr.targetId}) • Decider Role: {appr.requiredRole}
                    </div>
                    {appr.comment && (
                      <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', backgroundColor: '#fef2f2', padding: '6px 10px', borderRadius: '4px' }}>
                        Decision Comment: "{appr.comment}"
                      </div>
                    )}
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => navigate(`/projects/${selectedProjectId}`)}>
                    View Cockpit
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Upcoming */}
      {activeTab === 'upcoming' && (
        <Card title="Upcoming Deliverable Deadlines">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>Stage 04: Concept Design Sign-off</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Client: Qatar Tourism Authority</div>
              </div>
              <Badge variant="warning">Due Oct 15, 2026</Badge>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>Stage 09: Site Logistics & DECC Bump-in</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Venue: Doha Exhibition & Conv. Center</div>
              </div>
              <Badge variant="info">Due Nov 10, 2026</Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 5: Recently Updated */}
      {activeTab === 'activity' && (
        <Card title="Audit Stream Summary">
          <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>
            All operations, task completions, and governance signatures are immutably signed with SHA-256 hashes and stored in Cloud SQL PostgreSQL.
          </div>
        </Card>
      )}
    </div>
  );
};
