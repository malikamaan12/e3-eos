import React, { useState, useEffect, useMemo } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Tabs, Card, Badge, Button, EmptyState, Modal, Textarea } from '../components/DesignSystem.js';
import { RequestApprovalModal } from '../components/RequestApprovalModal.js';

export const MyWorkView: React.FC = () => {
  const { currentUser, currentLanguage, apiClient, selectedProjectId, currentProject, navigate, refreshTrigger, triggerRefresh, currentPath } = useEosContext();
  const isRtl = currentLanguage === 'ar';
  const isApprovalsRoute = currentPath === '/approvals' || (typeof window !== 'undefined' && window.location.pathname === '/approvals');
  const [activeTab, setActiveTab] = useState<string>(() => (isApprovalsRoute ? 'pending' : 'action'));
  const [tasks, setTasks] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [taskFilter, setTaskFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    if (isApprovalsRoute) {
      if (!['pending', 'approved', 'rejected', 'returned'].includes(activeTab)) {
        setActiveTab('pending');
      }
    } else {
      if (!['action', 'assigned', 'approvals', 'blocked', 'upcoming'].includes(activeTab)) {
        setActiveTab('action');
      }
    }
  }, [isApprovalsRoute, currentPath]);

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
  const approvedApprovals = useMemo(() => approvals.filter(a => a.status === 'approved'), [approvals]);
  const rejectedApprovals = useMemo(() => approvals.filter(a => a.status === 'rejected'), [approvals]);
  const returnedApprovals = useMemo(() => approvals.filter(a => a.status === 'returned' || a.status === 'rework' || a.status === 'revision_requested'), [approvals]);
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

  const standardTabs = [
    {
      id: 'action',
      label: isRtl ? 'يتطلب إجراءً' : 'Needs Action',
      badge: pendingApprovals.length + (activeTasks.length > 0 ? activeTasks.length : 0) + rejectedApprovals.length,
    },
    {
      id: 'assigned',
      label: isRtl ? 'مسندة إليّ' : 'Assigned to Me',
      badge: activeTasks.length,
    },
    {
      id: 'approvals',
      label: isRtl ? 'الموافقات' : 'Approvals',
      badge: approvals.length,
    },
    {
      id: 'blocked',
      label: isRtl ? 'معطّلة / معلقة' : 'Blocked',
      badge: rejectedApprovals.length,
    },
    {
      id: 'upcoming',
      label: isRtl ? 'المواعيد القادمة' : 'Upcoming',
    },
  ];

  const approvalsTabs = [
    {
      id: 'pending',
      label: isRtl ? 'بانتظار التوقيع' : 'Pending Sign-offs',
      badge: pendingApprovals.length,
    },
    {
      id: 'approved',
      label: isRtl ? 'السجلات المعتمدة' : 'Approved Records',
      badge: approvedApprovals.length,
    },
    {
      id: 'rejected',
      label: isRtl ? 'مرفوضة / إجراء مطلوب' : 'Rejected / Action Required',
      badge: rejectedApprovals.length,
    },
    {
      id: 'returned',
      label: isRtl ? 'قرارات معادة للتعديل' : 'Returned Decisions',
      badge: returnedApprovals.length,
    },
  ];

  const renderApprovalCard = (appr: any) => (
    <Card key={appr.id} style={{ borderLeft: `4px solid ${appr.status === 'approved' ? '#10b981' : appr.status === 'rejected' ? '#ef4444' : 'var(--accent, #d97706)'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '13px', fontFamily: 'monospace', color: 'var(--accent, #d97706)' }}>
              <span dir="ltr">{appr.id}</span>
            </span>
            <Badge variant={appr.status === 'approved' ? 'success' : appr.status === 'rejected' ? 'danger' : 'warning'}>
              {appr.status?.toUpperCase()}
            </Badge>
            <Badge variant="neutral">{appr.requiredRole || 'Executive'}</Badge>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)', marginTop: '4px' }}>
            {appr.reason || `Sign-off for ${appr.targetType}`}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', marginTop: '4px' }}>
            Target: {appr.targetType} ({appr.targetId}) • Role: {appr.requiredRole}
          </div>
          {appr.comment && (
            <div
              style={{
                fontSize: '12px',
                color: appr.status === 'rejected' ? '#ef4444' : '#22c55e',
                backgroundColor: appr.status === 'rejected' ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                border: `1px solid ${appr.status === 'rejected' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
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
                {isRtl ? 'رفض' : 'Reject'}
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
                {isRtl ? 'اعتماد' : 'Approve'}
              </Button>
            </>
          )}
          <Button variant="secondary" size="sm" onClick={() => navigate(`/projects/${selectedProjectId}`)}>
            {isRtl ? 'لوحة القيادة' : 'Cockpit'}
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
              {isApprovalsRoute
                ? (isRtl ? 'موافقات الحوكمة والاعتماد' : 'Governance Approvals')
                : (isRtl ? 'مهامي ومسؤولياتي' : 'My Work')}
            </h1>
            <Badge variant={isApprovalsRoute ? 'purple' : 'neutral'}>
              {isApprovalsRoute
                ? (isRtl ? 'حوكمة رباعية' : 'Four-Eyes Governance')
                : (isRtl ? 'العمليات المباشرة' : 'Qatar Live Operations')}
            </Badge>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary, #94a3b8)' }}>
            {isApprovalsRoute
              ? (isRtl
                ? 'قائمة مراجعة وتوقيع قرارات الحوكمة، اعتمادات بوابات المراحل، وأوامر الشراء المرفوعة للصلاحيات.'
                : 'Four-Eyes governance approvals, stage-gate signoffs, and commercial decision queue.')
              : (isRtl
                ? `المهام والموافقات والقرارات المسندة إلى: ${currentUser?.name || ''}`
                : `Tasks, governance approvals, and milestone deliverables assigned to ${currentUser?.name || 'User'}`)}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" size="sm" onClick={triggerRefresh}>
            {isRtl ? '🔄 تحديث' : '🔄 Refresh'}
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate(`/projects/${selectedProjectId}`)}>
            {isRtl ? 'فتح لوحة التحكم للمشروع' : 'Open Cockpit'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={isApprovalsRoute ? approvalsTabs : standardTabs}
        activeTab={activeTab === 'tasks' ? 'assigned' : activeTab}
        onChange={setActiveTab}
      />

      {/* Dedicated Governance Route Tabs */}
      {isApprovalsRoute && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
          {activeTab === 'pending' && (
            pendingApprovals.length === 0 ? (
              <EmptyState
                icon="✅"
                title={isRtl ? 'لا توجد توقيعات معلقة' : 'No Pending Sign-offs'}
                description={isRtl ? 'تمت مراجعة وتوقيع كافة الطلبات المعلقة.' : 'All stage gates and commercial requests are up to date.'}
              />
            ) : (
              pendingApprovals.map(renderApprovalCard)
            )
          )}

          {activeTab === 'approved' && (
            approvedApprovals.length === 0 ? (
              <EmptyState
                icon="📑"
                title={isRtl ? 'لا توجد سجلات معتمدة بعد' : 'No Approved Records'}
                description={isRtl ? 'لم يتم تسجيل قرارات اعتماد مكتملة حتى الآن.' : 'No historical approvals recorded yet.'}
              />
            ) : (
              approvedApprovals.map(renderApprovalCard)
            )
          )}

          {activeTab === 'rejected' && (
            rejectedApprovals.length === 0 ? (
              <EmptyState
                icon="🎉"
                title={isRtl ? 'لا توجد طلبات مرفوضة' : 'No Rejected Requests'}
                description={isRtl ? 'جميع قرارات الحوكمة سليمة ولا تتطلب تعديلاً.' : 'No items currently rejected or requiring revision.'}
              />
            ) : (
              rejectedApprovals.map(renderApprovalCard)
            )
          )}

          {activeTab === 'returned' && (
            returnedApprovals.length === 0 ? (
              <EmptyState
                icon="↩️"
                title={isRtl ? 'لا توجد قرارات معادة' : 'No Returned Decisions'}
                description={isRtl ? 'لا توجد طلبات معادة لإعادة الصياغة حالياً.' : 'No decisions returned for rework.'}
              />
            ) : (
              returnedApprovals.map(renderApprovalCard)
            )
          )}
        </div>
      )}

      {/* Tab 1: Needs Action */}
      {activeTab === 'action' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Prominent Rejected Approvals Section */}
          {rejectedApprovals.length > 0 && (
            <div
              id="mywork-rejection-alert"
              style={{
                padding: '16px 20px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>⛔</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#ef4444' }}>
                      {currentLanguage === 'ar'
                        ? `إجراء مطلوب: ${rejectedApprovals.length} موافقة مرفوضة بحاجة إلى مراجعة وتعديل`
                        : `Action Required: ${rejectedApprovals.length} Approval(s) Rejected — Revision Needed`}
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary, #cbd5e1)' }}>
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
                      backgroundColor: 'var(--surface-1, #0f1624)',
                      border: '1px solid var(--border-default, #2a374b)',
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
                        <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-muted, #94a3b8)' }}>{appr.id}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                          • Decider: <strong>{appr.decider || appr.decidedBy || appr.requiredRole || 'Executive Approver'}</strong>
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
                        {appr.reason || `Approval Request for ${appr.targetType}`}
                      </div>
                      <div
                        style={{
                          marginTop: '6px',
                          padding: '8px 12px',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: '#f87171',
                          borderLeft: '3px solid #ef4444',
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
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    ⚠️ Approvals Awaiting Review ({pendingApprovals.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {pendingApprovals.map((appr) => (
                      <Card key={appr.id} style={{ borderLeft: '4px solid #f59e0b', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                          <div style={{ flex: 1, minWidth: '240px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                              <Badge variant="warning">Awaiting Sign-off</Badge>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', fontFamily: 'monospace' }}>{appr.id}</span>
                              <Badge variant="neutral">{appr.requiredRole || 'Executive'}</Badge>
                            </div>
                            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
                              {appr.reason || `Approval Request for ${appr.targetType}`}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', marginTop: '6px' }}>
                              Target: <strong>{appr.targetType}</strong> • Project: <strong>{currentProject?.title || currentProject?.clientName || 'Active Project'}</strong> • Hash: <span style={{ fontFamily: 'monospace' }}>{appr.targetHash ? appr.targetHash.slice(0, 16) + '...' : 'Verified SHA-256'}</span>
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
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#60a5fa', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                            borderBottom: '1px solid var(--border-subtle, #1d2939)',
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
                              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                                {task.title}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
                                Assignee: {task.assignee || task.assigneeName || currentUser?.name || 'Assigned'} • Stage: Concept Architecture
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
                  borderColor: taskFilter === filter ? '#2563eb' : 'var(--border-default, #2a374b)',
                  backgroundColor: taskFilter === filter ? '#eff6ff' : 'var(--surface-1, #0f1624)',
                  color: taskFilter === filter ? '#1d4ed8' : 'var(--text-muted, #94a3b8)',
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
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
                No {taskFilter !== 'all' ? taskFilter : ''} tasks found for your profile.
              </div>
            ) : (
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 1fr 160px 110px 130px',
                    padding: '10px 18px',
                    backgroundColor: 'var(--surface-2, #151e2e)',
                    borderBottom: '1px solid var(--border-default, #2a374b)',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text-muted, #94a3b8)',
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
                        borderBottom: '1px solid var(--border-subtle, #1d2939)',
                        backgroundColor: completed ? '#f8fafc' : 'var(--surface-1, #0f1624)',
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
                            color: completed ? '#94a3b8' : 'var(--text-primary, #f8fafc)',
                            textDecoration: completed ? 'line-through' : 'none',
                          }}
                        >
                          {task.title}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                        {task.assignee || task.assigneeName || currentUser?.name || 'Assigned'}
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
                    borderColor: approvalFilter === filter ? '#2563eb' : 'var(--border-default, #2a374b)',
                    backgroundColor: approvalFilter === filter ? '#eff6ff' : 'var(--surface-1, #0f1624)',
                    color: approvalFilter === filter ? '#1d4ed8' : 'var(--text-muted, #94a3b8)',
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
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)', marginTop: '4px' }}>
                        {appr.reason || `Sign-off for ${appr.targetType}`}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', marginTop: '4px' }}>
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
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  color: '#f87171',
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
                        <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-muted, #94a3b8)' }}>{item.id}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                          • Decider: <strong>{item.decider || item.decidedBy || item.requiredRole || 'Executive Approver'}</strong>
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
                        {item.reason}
                      </div>
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '8px 12px',
                          backgroundColor: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: '#f87171',
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
                  backgroundColor: 'var(--surface-2, #151e2e)',
                  border: '1px solid var(--border-default, #2a374b)',
                  borderRadius: '6px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Badge variant="info">Stage Gate 04</Badge>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary, #f8fafc)' }}>
                      Concept Design & Master Architectural Package
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', marginTop: '4px' }}>
                    Client: <strong>{currentProject?.clientName || (isRtl ? 'قيد التأكيد' : 'To Be Confirmed')}</strong> • Venue: {currentProject?.venue || (isRtl ? 'الموقع الرئيسي' : 'Main Venue')}
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
                  backgroundColor: 'var(--surface-2, #151e2e)',
                  border: '1px solid var(--border-default, #2a374b)',
                  borderRadius: '6px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Badge variant="neutral">Milestone 09</Badge>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary, #f8fafc)' }}>
                      On-site Bump-in & Technical Rehearsal
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', marginTop: '4px' }}>
                    Location: <strong>{currentProject?.venue || (isRtl ? 'الموقع الميداني' : 'Main Site')}</strong> • Workstream: Live Ops & AV Production
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
          <p style={{ fontSize: '13px', color: 'var(--text-muted, #94a3b8)', marginTop: 0 }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: 'var(--surface-2, #151e2e)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-default, #2a374b)' }}>
              <div><strong style={{ color: 'var(--text-muted, #94a3b8)' }}>Request ID:</strong> <span style={{ fontFamily: 'monospace' }}>{selectedDetailApproval.id}</span></div>
              <div><strong style={{ color: 'var(--text-muted, #94a3b8)' }}>Status:</strong> <Badge variant={selectedDetailApproval.status === 'rejected' ? 'danger' : selectedDetailApproval.status === 'approved' ? 'success' : 'warning'}>{selectedDetailApproval.status?.toUpperCase()}</Badge></div>
              <div><strong style={{ color: 'var(--text-muted, #94a3b8)' }}>Target Type:</strong> {selectedDetailApproval.targetType}</div>
              <div><strong style={{ color: 'var(--text-muted, #94a3b8)' }}>Target ID:</strong> <span style={{ fontFamily: 'monospace' }}>{selectedDetailApproval.targetId}</span></div>
              <div><strong style={{ color: 'var(--text-muted, #94a3b8)' }}>Required Authority:</strong> <Badge variant="neutral">{selectedDetailApproval.requiredRole || 'Executive'}</Badge></div>
              <div><strong style={{ color: 'var(--text-muted, #94a3b8)' }}>Decider:</strong> {selectedDetailApproval.decider || selectedDetailApproval.decidedBy || selectedDetailApproval.requiredRole || 'Executive'}</div>
            </div>

            <div>
              <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>Description / Reason:</strong>
              <div style={{ marginTop: '4px', padding: '8px 12px', backgroundColor: 'var(--surface-2, #151e2e)', borderRadius: '4px', color: 'var(--text-primary, #f8fafc)' }}>
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

            <div style={{ padding: '10px 12px', backgroundColor: 'rgba(59, 130, 246, 0.12)', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.3)', fontSize: '12px', color: '#60a5fa' }}>
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
