import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { MetricCard, Card, Badge, Button, Modal, Input, Textarea, Select } from '../components/DesignSystem.js';

export const ProjectCockpitView: React.FC = () => {
  const {
    currentLanguage,
    currentUser,
    selectedProjectId,
    apiClient,
    navigate,
    refreshTrigger,
    triggerRefresh,
  } = useEosContext();

  const projectId = (typeof window !== 'undefined' && window.location.pathname.startsWith('/projects/') && window.location.pathname !== '/projects/new')
    ? window.location.pathname.split('/')[2]
    : selectedProjectId;

  const [cockpitData, setCockpitData] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('Prepare clarification questions');
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>('10000000-0000-4000-8000-000000000004'); // Zaid Mansour
  const [isSubmittingTask, setIsSubmittingTask] = useState<boolean>(false);

  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState<boolean>(false);
  const [approvalReason, setApprovalReason] = useState<string>('Qatar Tourism Tender Clarifications & Pricing Sign-off');
  const [approvalRole, setApprovalRole] = useState<string>('executive');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState<boolean>(false);

  // Decision Modal
  const [decidingApproval, setDecidingApproval] = useState<any | null>(null);
  const [decisionOutcome, setDecisionOutcome] = useState<'approved' | 'rejected'>('approved');
  const [decisionComment, setDecisionComment] = useState<string>('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadCockpit() {
      setLoading(true);
      try {
        const [cData, taskList, apprList, audits] = await Promise.all([
          apiClient.getCockpit(projectId).catch(() => null),
          apiClient.getTasks(projectId).catch(() => []),
          apiClient.getApprovalRequests(projectId).catch(() => []),
          apiClient.getAuditHistory(projectId).catch(() => []),
        ]);

        if (isMounted) {
          setCockpitData(cData);
          setTasks(taskList && taskList.length > 0 ? taskList : (cData?.tasks || []));
          setApprovals(apprList || []);
          setAuditHistory(audits || []);
        }
      } catch (err) {
        console.error('Failed to load cockpit:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadCockpit();
    return () => { isMounted = false; };
  }, [apiClient, projectId, refreshTrigger]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) return;
    setIsSubmittingTask(true);
    try {
      await apiClient.createTask(projectId, {
        packageId: 'e1111111-1111-4111-8111-111111111111',
        title: newTaskTitle,
        assigneeId: newTaskAssignee,
      });
      setIsTaskModalOpen(false);
      setNewTaskTitle('');
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to create task');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await apiClient.completeTask(projectId, taskId, 'Clarification questions compiled and verified by PM');
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to complete task');
    }
  };

  const handleRequestApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingApproval(true);
    try {
      await apiClient.requestApproval(projectId, {
        targetType: 'task',
        targetId: tasks[0]?.id || 'clarification-01',
        reason: approvalReason,
        requiredRole: approvalRole,
      });
      setIsApprovalModalOpen(false);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to submit approval request');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleDecideApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decidingApproval) return;
    setIsSubmittingDecision(true);
    try {
      await apiClient.decideApproval(projectId, decidingApproval.id, {
        outcome: decisionOutcome,
        comment: decisionComment,
        targetHash: decidingApproval.targetHash,
        targetVersionId: decidingApproval.targetVersionId,
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

  const projectTitle = cockpitData?.title || 'Qatar Tourism Demo Tender';
  const projectCode = cockpitData?.projectCode || 'PRJ-2026-DEMO';
  const clientName = cockpitData?.clientName || 'Qatar Tourism Authority';
  const venue = cockpitData?.venue?.name || 'Doha Exhibition & Convention Center';
  const daysRemaining = cockpitData?.daysRemaining ?? 67;

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Cockpit Top Header */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span
                id="cockpit-project-code"
                style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 800, color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '4px' }}
              >
                {projectCode}
              </span>
              <Badge variant="success">Active</Badge>
              <Badge variant="info">{cockpitData?.maturity || 'delivery'}</Badge>
            </div>
            <h1 id="cockpit-project-title" style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
              {projectTitle}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: '#64748b' }}>
              <span>🏢 Client: <strong>{clientName}</strong></span>
              <span>📍 Venue: <strong>{venue}</strong></span>
              <span>👤 PM: <strong>Zaid Mansour (pm@e3.qa)</strong></span>
              <span>⏳ Move-in: <strong>{daysRemaining} days remaining</strong></span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              id="cockpit-add-task-btn"
              variant="secondary"
              size="md"
              onClick={() => setIsTaskModalOpen(true)}
            >
              + Task
            </Button>
            <Button
              id="cockpit-request-approval-btn"
              variant="primary"
              size="md"
              onClick={() => setIsApprovalModalOpen(true)}
            >
              ✍️ Request Approval
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <MetricCard title="Revenue" value="3,500,000 QAR" subtitle="Approved Quote" accentColor="#2563eb" />
        <MetricCard title="Baseline Budget" value="1,968,750 QAR" subtitle="Internal Cost Plan" accentColor="#64748b" />
        <MetricCard title="Committed Cost" value="840,000 QAR" subtitle="Issued POs" accentColor="#059669" />
        <MetricCard title="Forecast Margin" value="43.75%" subtitle="Baseline Target" badge={{ label: 'Healthy', variant: 'success' }} accentColor="#059669" />
        <MetricCard title="Pending Approvals" value={approvals.filter(a => a.status === 'pending').length} subtitle="Executive Queue" accentColor="#f59e0b" />
      </div>

      {/* Two Column Section: Tasks & Governance Approvals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Project Tasks */}
        <Card
          title="Project Operational Tasks"
          subtitle="Workstream execution and completion tracking"
          action={
            <Button size="sm" variant="secondary" onClick={() => setIsTaskModalOpen(true)}>
              + Add Task
            </Button>
          }
          noPadding
        >
          {tasks.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
              No tasks created yet for this project. Click "+ Add Task" to begin.
            </div>
          ) : (
            <div>
              {tasks.map((t) => {
                const isCompleted = t.isCompleted || t.status === 'completed' || t.state === 'completed';
                return (
                  <div
                    key={t.id}
                    id={`task-item-${t.id}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 18px',
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: isCompleted ? '#f8fafc' : '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={isCompleted}
                        onChange={() => !isCompleted && handleCompleteTask(t.id)}
                        disabled={isCompleted}
                        style={{ cursor: isCompleted ? 'default' : 'pointer' }}
                      />
                      <div>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: isCompleted ? '#94a3b8' : '#0f172a',
                            textDecoration: isCompleted ? 'line-through' : 'none',
                          }}
                        >
                          {t.title}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          Assignee: {t.assignee || t.assigneeName || 'Zaid Mansour (Lead PM)'}
                        </div>
                      </div>
                    </div>

                    <div>
                      {!isCompleted ? (
                        <Button
                          id={`complete-task-${t.id}`}
                          variant="success"
                          size="sm"
                          onClick={() => handleCompleteTask(t.id)}
                        >
                          ✓ Complete
                        </Button>
                      ) : (
                        <Badge variant="success">Completed</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Governance Approvals Queue */}
        <Card
          title="Four-Eyes Governance Approvals"
          subtitle="Executive and Director sign-off authorizations"
          action={
            <Button size="sm" variant="primary" onClick={() => setIsApprovalModalOpen(true)}>
              + Request
            </Button>
          }
          noPadding
        >
          {approvals.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
              No approvals requested yet.
            </div>
          ) : (
            <div>
              {approvals.map((appr) => (
                <div
                  key={appr.id}
                  id={`approval-item-${appr.id}`}
                  style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'monospace', color: '#2563eb' }}>
                          {appr.id}
                        </span>
                        <Badge variant={appr.status === 'approved' ? 'success' : appr.status === 'rejected' ? 'danger' : 'warning'}>
                          {appr.status?.toUpperCase()}
                        </Badge>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                        {appr.reason || `Sign-off for ${appr.targetType}`}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        Role: <strong>{appr.requiredRole || 'Executive'}</strong>
                      </div>
                      {appr.comment && (
                        <div
                          id={`approval-comment-${appr.id}`}
                          style={{
                            marginTop: '8px',
                            padding: '6px 10px',
                            backgroundColor: appr.status === 'rejected' ? '#fef2f2' : '#f0fdf4',
                            border: appr.status === 'rejected' ? '1px solid #fecaca' : '1px solid #bbf7d0',
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: appr.status === 'rejected' ? '#991b1b' : '#166534',
                          }}
                        >
                          <strong>Reviewer Comment:</strong> "{appr.comment}"
                        </div>
                      )}
                    </div>

                    {appr.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Button
                          id={`reject-approval-btn-${appr.id}`}
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            setDecidingApproval(appr);
                            setDecisionOutcome('rejected');
                            setDecisionComment('Please refine AV lighting specification.');
                          }}
                        >
                          Reject
                        </Button>
                        <Button
                          id={`approve-approval-btn-${appr.id}`}
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
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Activity Audit Stream (Cryptographic Hash History) */}
      <Card
        title="Immutable Audit Stream & Event History"
        subtitle="Cryptographically verified SHA-256 state transitions stored in Doha Cloud SQL"
      >
        {auditHistory.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
            No audit records recorded yet.
          </div>
        ) : (
          <div id="audit-history-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {auditHistory.map((item, idx) => (
              <div
                key={item.id || idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      {item.action || 'STAGE_TRANSITION'}
                    </span>
                    <Badge variant="neutral" size="sm">{item.role || 'system'}</Badge>
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                    Actor: {item.actor || 'Tareq Al-Kuwari (Super Admin)'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>
                    Hash: {item.entryHash ? item.entryHash.slice(0, 16) + '...' : 'e3b0c44298fc1c14...'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'Just now'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal: + Task */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title="Create New Project Task"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsTaskModalOpen(false)}>Cancel</Button>
            <Button id="submit-create-task-btn" variant="primary" isLoading={isSubmittingTask} onClick={handleCreateTask}>
              Create Task
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateTask}>
          <Input
            id="new-task-title-input"
            label="Task Title *"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="e.g. Prepare clarification questions"
            required
          />
          <Select
            id="new-task-assignee-select"
            label="Assignee"
            value={newTaskAssignee}
            onChange={(e) => setNewTaskAssignee(e.target.value)}
            options={[
              { value: '10000000-0000-4000-8000-000000000004', label: 'Zaid Mansour (Lead PM)' },
              { value: '10000000-0000-4000-8000-000000000007', label: 'Karim Haddad (Technical Director)' },
              { value: '10000000-0000-4000-8000-000000000008', label: 'Salem Al-Marri (Head of Live Ops)' },
            ]}
          />
        </form>
      </Modal>

      {/* Modal: Request Approval */}
      <Modal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        title="Submit Governance Approval Request"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsApprovalModalOpen(false)}>Cancel</Button>
            <Button id="submit-approval-request-btn" variant="primary" isLoading={isSubmittingApproval} onClick={handleRequestApproval}>
              Submit Request
            </Button>
          </>
        }
      >
        <form onSubmit={handleRequestApproval}>
          <Input
            id="approval-reason-input"
            label="Reason / Subject *"
            value={approvalReason}
            onChange={(e) => setApprovalReason(e.target.value)}
            required
          />
          <Select
            id="approval-role-select"
            label="Required Decider Role"
            value={approvalRole}
            onChange={(e) => setApprovalRole(e.target.value)}
            options={[
              { value: 'executive', label: 'Executive Partner (Nasser Al-Attiyah)' },
              { value: 'project_director', label: 'Project Director (Fatima Al-Sulaiti)' },
              { value: 'finance', label: 'Financial Controller (Rashid Al-Hajri)' },
            ]}
          />
        </form>
      </Modal>

      {/* Modal: Decide Approval */}
      <Modal
        isOpen={decidingApproval !== null}
        onClose={() => setDecidingApproval(null)}
        title={decisionOutcome === 'approved' ? 'Confirm Approval' : 'Reject Approval with Feedback'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDecidingApproval(null)}>Cancel</Button>
            <Button
              id="submit-decision-btn"
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
            Request ID: <strong>{decidingApproval?.id}</strong>
          </p>
          <Textarea
            id="decision-comment-input"
            label="Governance Decision Comment"
            value={decisionComment}
            onChange={(e) => setDecisionComment(e.target.value)}
            placeholder="Provide rationale or required changes..."
            required
          />
        </form>
      </Modal>
    </div>
  );
};
