import React, { useState, useEffect, useMemo } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Tabs, Card, Badge, Button, EmptyState, Modal, Textarea } from '../components/DesignSystem.js';
import { RequestApprovalModal } from '../components/RequestApprovalModal.js';

export const MyWorkView: React.FC = () => {
  const { currentUser, currentLanguage, apiClient, selectedProjectId, navigate, refreshTrigger, triggerRefresh, currentPath } = useEosContext();
  const isApprovalsRoute = currentPath === '/approvals' || (typeof window !== 'undefined' && window.location.pathname === '/approvals');
  const [activeTab, setActiveTab] = useState<string>(() => (isApprovalsRoute ? 'approvals' : 'action'));
  const [tasks, setTasks] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [taskFilter, setTaskFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    if (isApprovalsRoute) {
      setActiveTab('approvals');
    }
  }, [isApprovalsRoute]);

  // Decision Modal State
  const [decidingApproval, setDecidingApproval] = useState<any | null>(null);
  const [decisionOutcome, setDecisionOutcome] = useState<'approved' | 'rejected'>('approved');
  const [decisionComment, setDecisionComment] = useState<string>('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState<boolean>(false);

  // Rejection Detail & Resubmit Modals
  const [selectedDetailApproval, setSelectedDetailApproval] = useState<any | null>(null);
  const [isResubmitOpen, setIsResubmitOpen] = useState<boolean>(false);
  const [resubmitApproval, setResubmitApproval] = useState<any | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadWork() {
      setLoading(true);
      try {
        const [taskList, apprList] = await Promise.all([
          apiClient.getTasks(selectedProjectId).catch(() => []),
          apiClient.getApprovalRequests(selectedProjectId).catch(() => []),
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

  const handleDecideApproval = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!decidingApproval) return;
    setIsSubmittingDecision(true);
    try {
      await apiClient.decideApproval(selectedProjectId, decidingApproval.id, {
        outcome: decisionOutcome,
        comment: decisionComment || (decisionOutcome === 'approved' ? 'Approved in My Work' : 'Rework requested'),
      });
      setDecidingApproval(null);
      setDecisionComment('');
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to record decision');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // Filtered lists
  const pendingApprovals = useMemo(() => approvals.filter(a => a.status === 'pending'), [approvals]);
  const rejectedApprovals = useMemo(() => approvals.filter(a => a.status === 'rejected'), [approvals]);
  const activeTasks = useMemo(() => tasks.filter(t => !(t.isCompleted || t.state === 'completed' || t.status === 'completed')), [tasks]);
  const completedTasks = useMemo(() => tasks.filter(t => t.isCompleted || t.state === 'completed' || t.status === 'completed'), [tasks]);

  const filteredTasks = useMemo(() => {
    if (taskFilter === 'active') return activeTasks;
    if (taskFilter === 'completed') return completedTasks;
    return tasks;
  }, [tasks, taskFilter, activeTasks, completedTasks]);

  const filteredApprovals = useMemo(() => {
    if (approvalFilter === 'all') return approvals;
    return approvals.filter(a => a.status === approvalFilter);
  }, [approvals, approvalFilter]);

  const tabs = [
    {
      id: 'action',
      label: currentLanguage === 'ar' ? 'يتطلب إجراءً' : 'Needs Action',
      badge: pendingApprovals.length + (activeTasks.length > 0 ? activeTasks.length : 0) + rejectedApprovals.length,
    },
    {
      id: 'assigned',
      label: currentLanguage === 'ar' ? 'مسندة إليّ' : 'Assigned to Me',
      badge: activeTasks.length,
    },
    {
      id: 'approvals',
      label: currentLanguage === 'ar' ? 'الموافقات' : 'Approvals',
      badge: approvals.length,
    },
    {
      id: 'blocked',
      label: currentLanguage === 'ar' ? 'معطّلة / معلقة' : 'Blocked',
      badge: rejectedApprovals.length,
    },
    {
      id: 'upcoming',
      label: currentLanguage === 'ar' ? 'المواعيد القادمة' : 'Upcoming',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
              {isApprovalsRoute
                ? (currentLanguage === 'ar' ? 'قائمة موافقات الحوكمة والاعتماد' : 'Governance Approvals Queue')
                : (currentLanguage === 'ar' ? 'مهامي ومسؤولياتي' : 'My Work')}
            </h1>
            <Badge variant={isApprovalsRoute ? 'purple' : 'neutral'}>
              {isApprovalsRoute
                ? (currentLanguage === 'ar' ? 'حوكمة رباعية' : 'Four-Eyes Governance')
                : 'Qatar Live Operations'}
            </Badge>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
            {isApprovalsRoute
              ? (currentLanguage === 'ar'
                ? 'قائمة مراجعة وتوقيع قرارات الحوكمة، اعتمادات بوابات المراحل، وأوامر الشراء المرفوعة للصلاحيات.'
                : 'Four-Eyes governance approvals, stage-gate signoffs, and commercial decision queue.')
              : (currentLanguage === 'ar'
                ? `المهام والموافقات والقرارات المسندة إلى: ${currentUser.name}`
                : `Tasks, governance approvals, and milestone deliverables assigned to ${currentUser.name}`)}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" size="sm" onClick={triggerRefresh}>
            {currentLanguage === 'ar' ? '🔄 تحديث' : '🔄 Refresh'}
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate(`/projects/${selectedProjectId}`)}>
            {currentLanguage === 'ar' ? 'فتح لوحة التحكم للمشروع' : 'Open Cockpit'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab === 'tasks' ? 'assigned' : activeTab} onChange={setActiveTab} />

      {/* Tab 1: Needs Action */}
      {activeTab === 'action' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Prominent Rejected Approvals Section */}
          {rejectedApprovals.length > 0 && (
            <div
              id="mywork-rejection-alert"
              style={{
                padding: '16px 20px',
                backgroundColor: '#fff1f2',
                border: '2px solid #fda4af',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(225, 29, 72, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>⛔</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#9f1239' }}>
                      {currentLanguage === 'ar'
                        ? `إجراء مطلوب: ${rejectedApprovals.length} موافقة مرفوضة بحاجة إلى مراجعة وتعديل`
                        : `Action Required: ${rejectedApprovals.length} Approval(s) Rejected — Revision Needed`}
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#be123c' }}>
                      {currentLanguage === 'ar'
                        ? 'قام صاحب الصلاحية برفض هذه الطلبات. يرجى الاطلاع على الملاحظات وإعادة الإرسال.'
                        : 'Governance controllers or executives rejected these submissions. Review the rejection comments and resubmit with corrections.'}
                    </p>
                  </div>
                </div>
                <Badge variant="danger">{rejectedApprovals.length} REWORK REQUIRED</Badge>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {rejectedApprovals.map((appr) => (
                  <div
                    key={appr.id}
                    id={`mywork-rejected-card-${appr.id}`}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #fecdd3',
                      borderRadius: '6px',
                      padding: '14px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '260px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <Badge variant="danger">REJECTED</Badge>
                        <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#64748b' }}>{appr.id}</span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          • Decider: <strong>{appr.decider || appr.decidedBy || appr.requiredRole || 'Executive Approver'}</strong>
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                        {appr.reason || `Approval Request for ${appr.targetType}`}
                      </div>
                      <div
                        style={{
                          marginTop: '6px',
                          padding: '8px 12px',
                          backgroundColor: '#fff1f2',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: '#9f1239',
                          borderLeft: '3px solid #e11d48',
                        }}
                      >
                        <strong>Governance Reason:</strong> "{appr.comment || 'Revision requested prior to sign-off.'}"
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Button
                        id={`open-details-btn-${appr.id}`}
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedDetailApproval(appr)}
                      >
                        Open Approval Details
                      </Button>
                      <Button
                        id={`resubmit-revisions-btn-${appr.id}`}
                        size="sm"
                        variant="primary"
                        style={{ backgroundColor: '#e11d48', borderColor: '#be123c' }}
                        onClick={() => {
                          setResubmitApproval(appr);
                          setIsResubmitOpen(true);
                        }}
                      >
                        Resubmit with Revisions
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pendingApprovals.length === 0 && activeTasks.length === 0 && rejectedApprovals.length === 0 ? (
            <EmptyState
              icon="✅"
              title="All caught up!"
              description="No immediate approvals, active tasks, or rejected decisions waiting for your action."
            />
          ) : (
            <>
              {/* Approvals requiring signature */}
              {pendingApprovals.length > 0 && (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400e', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    ⚠️ Approvals Awaiting Review ({pendingApprovals.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {pendingApprovals.map((appr) => (
                      <Card key={appr.id} style={{ borderLeft: '4px solid #f59e0b', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                          <div style={{ flex: 1, minWidth: '240px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                              <Badge variant="warning">Awaiting Sign-off</Badge>
                              <span style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>{appr.id}</span>
                              <Badge variant="neutral">{appr.requiredRole || 'Executive'}</Badge>
                            </div>
                            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                              {appr.reason || `Approval Request for ${appr.targetType}`}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                              Target: <strong>{appr.targetType}</strong> • Project: <strong>Qatar Tourism</strong> • Hash: <span style={{ fontFamily: 'monospace' }}>{appr.targetHash ? appr.targetHash.slice(0, 16) + '...' : 'Verified SHA-256'}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <Button
                              id={`quick-reject-btn-${appr.id}`}
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                setDecidingApproval(appr);
                                setDecisionOutcome('rejected');
                                setDecisionComment('Clarification required on deliverables.');
                              }}
                            >
                              Reject
                            </Button>
                            <Button
                              id={`quick-approve-btn-${appr.id}`}
                              size="sm"
                              variant="success"
                              onClick={() => {
                                setDecidingApproval(appr);
                                setDecisionOutcome('approved');
                                setDecisionComment('Approved as submitted.');
                              }}
                            >
                              ✓ Sign & Authorize
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => navigate(`/projects/${selectedProjectId}`)}
                            >
                              Cockpit
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Active tasks requiring execution */}
              {activeTasks.length > 0 && (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e40af', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    📋 Active Action Items ({activeTasks.length})
                  </div>
                  <Card noPadding>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {activeTasks.map((task) => (
                        <div
                          key={task.id}
                          id={`action-task-${task.id}`}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 18px',
                            borderBottom: '1px solid #f1f5f9',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input
                              type="checkbox"
                              checked={false}
                              onChange={() => handleToggleComplete(task.id, false)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                                {task.title}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                Assignee: {task.assignee || task.assigneeName || currentUser.name} • Stage: Concept Architecture
                              </div>
                            </div>
                          </div>
                          <Button
                            id={`action-complete-btn-${task.id}`}
                            variant="success"
                            size="sm"
                            onClick={() => handleToggleComplete(task.id, false)}
                          >
                            ✓ Mark Done
                          </Button>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab 2: Assigned to Me */}
      {(activeTab === 'assigned' || activeTab === 'tasks') && (
        <div>
          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            {(['all', 'active', 'completed'] as const).map((filter) => (
              <button
                key={filter}
                id={`task-filter-${filter}`}
                onClick={() => setTaskFilter(filter)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: taskFilter === filter ? '#2563eb' : '#cbd5e1',
                  backgroundColor: taskFilter === filter ? '#eff6ff' : '#ffffff',
                  color: taskFilter === filter ? '#1d4ed8' : '#64748b',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {filter === 'all' ? `All Tasks (${tasks.length})` : filter === 'active' ? `Active (${activeTasks.length})` : `Completed (${completedTasks.length})`}
              </button>
            ))}
          </div>

          <Card noPadding>
            {filteredTasks.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                No {taskFilter !== 'all' ? taskFilter : ''} tasks found for your profile.
              </div>
            ) : (
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 1fr 160px 110px 130px',
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
                {filteredTasks.map((task) => {
                  const completed = task.isCompleted || task.state === 'completed' || task.status === 'completed';
                  return (
                    <div
                      key={task.id}
                      id={`task-row-${task.id}`}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '40px 1fr 160px 110px 130px',
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
        </div>
      )}

      {/* Tab 3: Approvals */}
      {activeTab === 'approvals' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            {(['all', 'pending', 'approved', 'rejected'] as const).map((filter) => {
              const label = {
                all: currentLanguage === 'ar' ? `الكل (${approvals.length})` : `All (${approvals.length})`,
                pending: currentLanguage === 'ar' ? 'معلق' : 'Pending',
                approved: currentLanguage === 'ar' ? 'معتمد' : 'Approved',
                rejected: currentLanguage === 'ar' ? 'مرفوض' : 'Rejected',
              }[filter];
              return (
                <button
                  key={filter}
                  id={`approval-filter-${filter}`}
                  onClick={() => setApprovalFilter(filter)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: approvalFilter === filter ? '#2563eb' : '#cbd5e1',
                    backgroundColor: approvalFilter === filter ? '#eff6ff' : '#ffffff',
                    color: approvalFilter === filter ? '#1d4ed8' : '#64748b',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {filteredApprovals.length === 0 ? (
            <EmptyState icon="✍️" title="No Approvals Found" description="No formal governance requests match your filter." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredApprovals.map((appr) => (
                <Card key={appr.id} style={{ borderLeft: `4px solid ${appr.status === 'approved' ? '#10b981' : appr.status === 'rejected' ? '#ef4444' : '#f59e0b'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', fontFamily: 'monospace', color: '#2563eb' }}>{appr.id}</span>
                        <Badge variant={appr.status === 'approved' ? 'success' : appr.status === 'rejected' ? 'danger' : 'warning'}>
                          {appr.status?.toUpperCase()}
                        </Badge>
                        <Badge variant="neutral">{appr.requiredRole || 'Executive'}</Badge>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                        {appr.reason || `Sign-off for ${appr.targetType}`}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        Target: {appr.targetType} ({appr.targetId}) • Role: {appr.requiredRole}
                      </div>
                      {appr.comment && (
                        <div
                          style={{
                            fontSize: '12px',
                            color: appr.status === 'rejected' ? '#b91c1c' : '#15803d',
                            backgroundColor: appr.status === 'rejected' ? '#fef2f2' : '#f0fdf4',
                            border: `1px solid ${appr.status === 'rejected' ? '#fecaca' : '#bbf7d0'}`,
                            padding: '6px 12px',
                            borderRadius: '4px',
                            marginTop: '8px',
                          }}
                        >
                          <strong>Reviewer Feedback:</strong> "{appr.comment}"
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {appr.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setDecidingApproval(appr);
                              setDecisionOutcome('rejected');
                              setDecisionComment('Clarification required on scope.');
                            }}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => {
                              setDecidingApproval(appr);
                              setDecisionOutcome('approved');
                              setDecisionComment('Approved as submitted.');
                            }}
                          >
                            Approve
                          </Button>
                        </>
                      )}
                      <Button variant="secondary" size="sm" onClick={() => navigate(`/projects/${selectedProjectId}`)}>
                        Cockpit
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Blocked */}
      {activeTab === 'blocked' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {rejectedApprovals.length === 0 ? (
            <EmptyState
              icon="🎉"
              title="No Blocked Items"
              description="No rejected approvals, pending blockers, or gated issues currently impediment your workflow."
            />
          ) : (
            <>
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#991b1b',
                  fontSize: '13px',
                }}
              >
                <strong>Attention Required:</strong> You have {rejectedApprovals.length} item(s) flagged as rejected or blocked by governance controllers. Review comments below and take corrective action.
              </div>

              {rejectedApprovals.map((item) => (
                <Card key={item.id} style={{ borderLeft: '4px solid #ef4444' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: '260px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <Badge variant="danger">REJECTED / BLOCKED</Badge>
                        <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#64748b' }}>{item.id}</span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          • Decider: <strong>{item.decider || item.decidedBy || item.requiredRole || 'Executive Approver'}</strong>
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                        {item.reason}
                      </div>
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '8px 12px',
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: '#991b1b',
                        }}
                      >
                        <strong>Governance Reason:</strong> "{item.comment || 'Revision requested prior to sign-off.'}"
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedDetailApproval(item)}
                      >
                        Open Approval Details
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        style={{ backgroundColor: '#e11d48', borderColor: '#be123c' }}
                        onClick={() => {
                          setResubmitApproval(item);
                          setIsResubmitOpen(true);
                        }}
                      >
                        Resubmit with Revisions
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      )}

      {/* Tab 5: Upcoming */}
      {activeTab === 'upcoming' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Card title="Upcoming Deliverable Deadlines & Milestones" subtitle="Project roadmap dates and operational venue commitments">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 16px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Badge variant="info">Stage Gate 04</Badge>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                      Concept Design & Master Architectural Package
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Client: <strong>Qatar Tourism Authority</strong> • Venue: Doha Exhibition & Convention Center
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Badge variant="warning">Due Oct 15, 2026</Badge>
                  <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600, marginTop: '2px' }}>
                    35 Days Remaining
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 16px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Badge variant="neutral">Milestone 09</Badge>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                      On-site Bump-in & Technical Rehearsal
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Location: <strong>DECC Hall 1 & 2</strong> • Workstream: Live Ops & AV Production
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Badge variant="info">Due Nov 10, 2026</Badge>
                  <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600, marginTop: '2px' }}>
                    61 Days Remaining
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Decision Modal */}
      <Modal
        isOpen={decidingApproval !== null}
        onClose={() => setDecidingApproval(null)}
        title={decisionOutcome === 'approved' ? 'Confirm Governance Approval' : 'Reject Approval with Feedback'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDecidingApproval(null)}>Cancel</Button>
            <Button
              id="submit-mywork-decision-btn"
              variant={decisionOutcome === 'approved' ? 'success' : 'danger'}
              isLoading={isSubmittingDecision}
              onClick={handleDecideApproval}
            >
              {decisionOutcome === 'approved' ? 'Sign & Authorize' : 'Confirm Rejection'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleDecideApproval}>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: 0 }}>
            Request: <strong>{decidingApproval?.id}</strong> ({decidingApproval?.reason})
          </p>
          <Textarea
            id="mywork-decision-comment-input"
            label="Decision Comment / Feedback *"
            value={decisionComment}
            onChange={(e) => setDecisionComment(e.target.value)}
            placeholder="Provide governance rationale..."
            required
          />
        </form>
      </Modal>

      {/* Approval Details Modal */}
      <Modal
        isOpen={selectedDetailApproval !== null}
        onClose={() => setSelectedDetailApproval(null)}
        title="Approval Request Governance Details"
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setSelectedDetailApproval(null)}>
              Close
            </Button>
            {selectedDetailApproval?.status === 'rejected' && (
              <Button
                variant="primary"
                style={{ backgroundColor: '#e11d48', borderColor: '#be123c' }}
                onClick={() => {
                  const target = selectedDetailApproval;
                  setSelectedDetailApproval(null);
                  setResubmitApproval(target);
                  setIsResubmitOpen(true);
                }}
              >
                Resubmit with Revisions
              </Button>
            )}
          </div>
        }
      >
        {selectedDetailApproval && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div><strong style={{ color: '#64748b' }}>Request ID:</strong> <span style={{ fontFamily: 'monospace' }}>{selectedDetailApproval.id}</span></div>
              <div><strong style={{ color: '#64748b' }}>Status:</strong> <Badge variant={selectedDetailApproval.status === 'rejected' ? 'danger' : selectedDetailApproval.status === 'approved' ? 'success' : 'warning'}>{selectedDetailApproval.status?.toUpperCase()}</Badge></div>
              <div><strong style={{ color: '#64748b' }}>Target Type:</strong> {selectedDetailApproval.targetType}</div>
              <div><strong style={{ color: '#64748b' }}>Target ID:</strong> <span style={{ fontFamily: 'monospace' }}>{selectedDetailApproval.targetId}</span></div>
              <div><strong style={{ color: '#64748b' }}>Required Authority:</strong> <Badge variant="neutral">{selectedDetailApproval.requiredRole || 'Executive'}</Badge></div>
              <div><strong style={{ color: '#64748b' }}>Decider:</strong> {selectedDetailApproval.decider || selectedDetailApproval.decidedBy || selectedDetailApproval.requiredRole || 'Executive'}</div>
            </div>

            <div>
              <strong style={{ color: '#0f172a' }}>Description / Reason:</strong>
              <div style={{ marginTop: '4px', padding: '8px 12px', backgroundColor: '#f1f5f9', borderRadius: '4px', color: '#1e293b' }}>
                {selectedDetailApproval.reason || 'No description provided'}
              </div>
            </div>

            {selectedDetailApproval.comment && (
              <div>
                <strong style={{ color: selectedDetailApproval.status === 'rejected' ? '#991b1b' : '#15803d' }}>
                  {selectedDetailApproval.status === 'rejected' ? 'Rejection Feedback & Rework Instructions:' : 'Decision Comments:'}
                </strong>
                <div style={{
                  marginTop: '4px',
                  padding: '10px 12px',
                  backgroundColor: selectedDetailApproval.status === 'rejected' ? '#fff1f2' : '#f0fdf4',
                  border: `1px solid ${selectedDetailApproval.status === 'rejected' ? '#fecdd3' : '#bbf7d0'}`,
                  borderRadius: '4px',
                  color: selectedDetailApproval.status === 'rejected' ? '#9f1239' : '#166534',
                  fontWeight: 500,
                }}>
                  "{selectedDetailApproval.comment}"
                </div>
              </div>
            )}

            <div style={{ padding: '10px 12px', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe', fontSize: '12px', color: '#1e40af' }}>
              <strong>Governance Rule:</strong> Approvals are recorded on the immutable audit log with cryptographic hash verification and timestamping.
            </div>
          </div>
        )}
      </Modal>

      {/* Request / Resubmit Approval Modal */}
      {isResubmitOpen && (
        <RequestApprovalModal
          isOpen={isResubmitOpen}
          onClose={() => {
            setIsResubmitOpen(false);
            setResubmitApproval(null);
          }}
          onApprovalRequested={() => {
            triggerRefresh();
          }}
          projectId={selectedProjectId}
        />
      )}
    </div>
  );
};
