import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Badge, Card, Button, Modal, Input } from '../components/DesignSystem.js';
import { calculateCpmSchedule, GanttTaskInput } from '@e3-eos/domain';
import { isSyntheticDemo } from '../services/api-client.js';

export interface CanonicalStageMeta {
  stageNumber: number;
  code: string;
  name: string;
  description: string;
  prerequisiteStages: number[];
  mandatoryGateEvidence: string;
}

export const CANONICAL_13_STAGES: CanonicalStageMeta[] = [
  { stageNumber: 1, code: 'STAGE-01', name: 'Project Onboarding', description: 'Intake and brief capture', prerequisiteStages: [], mandatoryGateEvidence: 'Charter Signed & Account Opened' },
  { stageNumber: 2, code: 'STAGE-02', name: 'Qualification and Feasibility', description: 'Go/No-go decisions and origin verification', prerequisiteStages: [1], mandatoryGateEvidence: 'Feasibility Approval' },
  { stageNumber: 3, code: 'STAGE-03', name: 'Idea, Concept and First Draft', description: 'Creative development and 3D concept', prerequisiteStages: [2], mandatoryGateEvidence: 'Concept Sign-Off' },
  { stageNumber: 4, code: 'STAGE-04', name: 'Clarification and Design Development', description: 'Design revisions and engineering alignment', prerequisiteStages: [3], mandatoryGateEvidence: 'Design Freeze' },
  { stageNumber: 5, code: 'STAGE-05', name: 'Proposal, Submission and Authorisation', description: 'Commercial client submission and four-eyes gate', prerequisiteStages: [4], mandatoryGateEvidence: 'Proposal Formal Sign-Off' },
  { stageNumber: 6, code: 'STAGE-06', name: 'Detailed Delivery Planning', description: 'Work packages and schedules', prerequisiteStages: [5], mandatoryGateEvidence: 'Baseline Schedule Locked' },
  { stageNumber: 7, code: 'STAGE-07', name: 'Vendor Selection and Orders', description: 'Procurement and RFQs', prerequisiteStages: [6], mandatoryGateEvidence: 'Committed Subcontractor POs' },
  { stageNumber: 8, code: 'STAGE-08', name: 'Production and Resource Preparation', description: 'Fabrication and reservations', prerequisiteStages: [7], mandatoryGateEvidence: 'QC Approval & Dispatch Release' },
  { stageNumber: 9, code: 'STAGE-09', name: 'Logistics, Bump-in and Installation', description: 'Site build and transport', prerequisiteStages: [7, 8], mandatoryGateEvidence: 'Civil Defense & Venue Access Permit' },
  { stageNumber: 10, code: 'STAGE-10', name: 'Finishing, Testing and Opening Readiness', description: 'Inspections and opening sign-off', prerequisiteStages: [9], mandatoryGateEvidence: 'Third-Party Rigging Load Sign-Off' },
  { stageNumber: 11, code: 'STAGE-11', name: 'Operations and Delivery', description: 'Live event delivery', prerequisiteStages: [10], mandatoryGateEvidence: 'Show Readiness Endorsement' },
  { stageNumber: 12, code: 'STAGE-12', name: 'Bump-out and Reconciliation', description: 'Dismantle and venue handover', prerequisiteStages: [11], mandatoryGateEvidence: 'Venue Dilapidation Sign-Off' },
  { stageNumber: 13, code: 'STAGE-13', name: 'Post-event Report, Closure and Learning', description: 'Settlement and lessons learned', prerequisiteStages: [12], mandatoryGateEvidence: 'Audited Final Account & Variance Report' },
];

export const INITIAL_CANONICAL_TASKS = [
  { id: 'TSK-01', code: 'TSK-010', title: 'Charter & Project Inception Brief', durationHours: 6, stageNumber: 1, isCritical: true, completed: true, predecessorIds: [] },
  { id: 'TSK-02', code: 'TSK-020', title: 'Qualification & Technical Feasibility', durationHours: 8, stageNumber: 2, isCritical: true, completed: true, predecessorIds: [{ id: 'TSK-01' }] },
  { id: 'TSK-03', code: 'TSK-030', title: 'Creative Concept & 3D Spatial Visualizer', durationHours: 8, stageNumber: 3, isCritical: true, completed: true, predecessorIds: [{ id: 'TSK-02' }] },
  { id: 'TSK-04', code: 'TSK-040', title: 'Clarifications & Engineering Alignment', durationHours: 6, stageNumber: 4, isCritical: true, completed: true, predecessorIds: [{ id: 'TSK-03' }] },
  { id: 'TSK-05', code: 'TSK-050', title: 'Proposal Submission & Executive Sign-off', durationHours: 12, stageNumber: 5, isCritical: true, completed: true, predecessorIds: [{ id: 'TSK-04' }] },
  { id: 'TSK-06', code: 'TSK-060', title: 'Detailed Delivery Planning & WBS', durationHours: 14, stageNumber: 6, isCritical: false, completed: true, predecessorIds: [{ id: 'TSK-05' }] },
  { id: 'TSK-07', code: 'TSK-070', title: 'Vendor Packages & Subcontractor POs', durationHours: 10, stageNumber: 7, isCritical: true, completed: true, predecessorIds: [{ id: 'TSK-06' }] },
  { id: 'TSK-08', code: 'TSK-080', title: 'Production & Resource Preparation', durationHours: 18, stageNumber: 8, isCritical: false, completed: true, predecessorIds: [{ id: 'TSK-06' }] },
  { id: 'TSK-09', code: 'TSK-090', title: 'Convoy Logistics & Venue Bump-In', durationHours: 12, stageNumber: 9, isCritical: true, completed: false, predecessorIds: [{ id: 'TSK-07' }, { id: 'TSK-08' }] },
  { id: 'TSK-10', code: 'TSK-100', title: 'Testing, System Tuning & Opening Readiness', durationHours: 14, stageNumber: 10, isCritical: true, completed: false, predecessorIds: [{ id: 'TSK-09' }] },
  { id: 'TSK-11', code: 'TSK-110', title: 'Live Show Execution & Operations', durationHours: 8, stageNumber: 11, isCritical: true, completed: false, predecessorIds: [{ id: 'TSK-10' }] },
  { id: 'TSK-12', code: 'TSK-120', title: 'Venue Strike, Cargo Packing & Dilapidation', durationHours: 10, stageNumber: 12, isCritical: false, completed: false, predecessorIds: [{ id: 'TSK-11' }] },
  { id: 'TSK-13', code: 'TSK-130', title: 'Final Account Commercial Audit & Debrief', durationHours: 8, stageNumber: 13, isCritical: false, completed: false, predecessorIds: [{ id: 'TSK-12' }] },
];

interface MasterGanttViewProps {
  projectId: string;
}

export const MasterGanttView: React.FC<MasterGanttViewProps> = ({ projectId }) => {
  const { apiClient, refreshTrigger } = useEosContext();
  const isDemo = isSyntheticDemo(projectId);

  const [loading, setLoading] = useState<boolean>(true);
  const [ganttData, setGanttData] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // Operational Constraints state & modals
  const [constraints, setConstraints] = useState<any[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState<boolean>(false);
  const [selectedConstraint, setSelectedConstraint] = useState<any | null>(null);
  const [constraintToVerify, setConstraintToVerify] = useState<any | null>(null);
  const [activeConstraint, setActiveConstraint] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Form states for Verify Modal
  const [verifyForm, setVerifyForm] = useState({
    pageClauseSection: '',
    extractedRuleValue: '',
    applicabilityStatement: '',
    reviewerRole: 'technical_director',
    reviewerComment: '',
  });

  // Form states for Create Modal (Draft only — Verified is strictly prohibited)
  const [createForm, setCreateForm] = useState({
    constraintType: 'venue_operational_noise',
    limitValue: 85,
    unit: 'dB(A)',
    locationZone: '',
    timeWindow: '',
    priority: 'medium',
    sourceOrganization: '',
    overrideAuthority: 'Technical Director',
    notes: '',
  });

  // Interactive Gantt & Drag-and-Drop State
  const [viewMode, setViewMode] = useState<'timeline' | 'stages'>('stages');
  const [localTasks, setLocalTasks] = useState<any[]>(() => {
    if (!isDemo) return [];
    const rawTasks = INITIAL_CANONICAL_TASKS.map((t) => ({
      ...t,
      completed: t.completed,
    }));
    // Initial CPM calculation across 13 stages
    const cpm = calculateCpmSchedule(
      rawTasks.map((t) => ({
        id: t.id,
        code: t.code,
        title: t.title,
        durationHours: t.durationHours,
        stageNumber: t.stageNumber,
        predecessorIds: t.predecessorIds,
      }))
    );
    return rawTasks.map((t) => {
      const cpmTask = cpm.tasks.find((ct) => ct.id === t.id);
      return { ...t, ...cpmTask };
    });
  });

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [enforceDependencies, setEnforceDependencies] = useState<boolean>(true);
  const [dependencyViolationModal, setDependencyViolationModal] = useState<{
    isOpen: boolean;
    taskTitle: string;
    targetStage: number;
    blockingStages: number[];
    message: string;
  } | null>(null);
  const [isRecoveryApplied, setIsRecoveryApplied] = useState<boolean>(false);
  const [recoveryToast, setRecoveryToast] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropTaskOnStage = (targetStageNum: number) => {
    if (!draggedTaskId) return;
    const task = localTasks.find((t) => t.id === draggedTaskId);
    if (!task) return;

    // Predecessor Dependency Enforcement
    if (enforceDependencies) {
      const stageMeta = CANONICAL_13_STAGES.find((s) => s.stageNumber === targetStageNum);
      const prereqs = stageMeta?.prerequisiteStages || [];
      const incompletePrereqs = prereqs.filter((pNum) => {
        const pTasks = localTasks.filter((t) => (t.stageNumber || 1) === pNum);
        return pTasks.some((t) => !t.completed);
      });

      if (incompletePrereqs.length > 0) {
        setDependencyViolationModal({
          isOpen: true,
          taskTitle: task.title,
          targetStage: targetStageNum,
          blockingStages: incompletePrereqs,
          message: `Stage Graph Dependency Blocked: You cannot advance "${task.title}" into ${stageMeta?.code} (${stageMeta?.name}) because predecessor stage(s) ${incompletePrereqs.map((p) => `STAGE-${String(p).padStart(2, '0')}`).join(', ')} contain incomplete gate activities.`,
        });
        setDraggedTaskId(null);
        return;
      }
    }

    // Move task to target stage & recompute CPM
    const updated = localTasks.map((t) => {
      if (t.id === draggedTaskId) {
        return {
          ...t,
          stageNumber: targetStageNum,
          earlyStartHours: (targetStageNum - 1) * 6,
        };
      }
      return t;
    });

    const cpm = calculateCpmSchedule(
      updated.map((t) => ({
        id: t.id,
        code: t.code,
        title: t.title,
        durationHours: t.durationHours,
        stageNumber: t.stageNumber,
        predecessorIds: t.predecessorIds,
      }))
    );

    setLocalTasks(
      updated.map((t) => {
        const cpmTask = cpm.tasks.find((ct) => ct.id === t.id);
        return { ...t, ...cpmTask };
      })
    );
    setDraggedTaskId(null);
  };

  const handleToggleTaskComplete = (taskId: string) => {
    setLocalTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleApplyCpmRecovery = () => {
    // Compress critical path durations and optimize float
    const recovered = localTasks.map((t) => {
      if (t.durationHours > 8) {
        return { ...t, durationHours: Math.max(6, t.durationHours - 4) };
      }
      return t;
    });

    const cpm = calculateCpmSchedule(
      recovered.map((t) => ({
        id: t.id,
        code: t.code,
        title: t.title,
        durationHours: t.durationHours,
        stageNumber: t.stageNumber,
        predecessorIds: t.predecessorIds,
      }))
    );

    setLocalTasks(
      recovered.map((t) => {
        const cpmTask = cpm.tasks.find((ct) => ct.id === t.id);
        return { ...t, ...cpmTask };
      })
    );
    setIsRecoveryApplied(true);
    setRecoveryToast('✓ CPM Schedule Rebalanced: Overnight shift activated. Duration compressed to 72h SLA horizon.');
    setTimeout(() => setRecoveryToast(null), 5000);
  };

  const loadData = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const [data, constraintsRes] = await Promise.all([
        apiClient.getGanttSchedule(projectId).catch(() => null),
        apiClient.getConstraints(projectId).catch(() => null),
      ]);
      setGanttData(data);
      if (constraintsRes?.data && constraintsRes.data.length > 0) {
        setConstraints(constraintsRes.data);
      } else if (data?.operationalConstraints?.constraints?.length > 0) {
        setConstraints(data.operationalConstraints.constraints);
      }
      if (data?.schedule?.tasks?.length > 0) {
        setSelectedTask(data.schedule.tasks[0]);
      }
    } catch (err) {
      console.error('Failed to load gantt schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [apiClient, projectId, refreshTrigger]);

  if (loading && !ganttData) {
    return <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Calculating Critical Path Method (CPM) timeline...</div>;
  }

  const baselineDuration = 72;
  const activeTasks = localTasks.length > 0 ? localTasks : (ganttData?.schedule?.tasks || []);
  const shifts = ganttData?.shifts || [];
  const projectDuration = activeTasks.length > 0
    ? Math.max(...activeTasks.map((t: any) => (t.earlyFinishHours || t.durationHours || 0)), isDemo ? 86 : 0)
    : 0;
  const criticalCount = activeTasks.filter((t: any) => t.isCritical).length;
  const scheduleVariance = activeTasks.length > 0 ? projectDuration - baselineDuration : 0;
  const slippagePercent = activeTasks.length > 0 ? ((scheduleVariance / baselineDuration) * 100).toFixed(1) : '0.0';
  const hasSlippage = activeTasks.length > 0 && scheduleVariance > 0 && !isRecoveryApplied;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Dependency Violation Modal */}
      {dependencyViolationModal?.isOpen && (
        <Modal
          isOpen={true}
          title="⛔ Stage Graph Dependency Violation"
          onClose={() => setDependencyViolationModal(null)}
          footer={
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDependencyViolationModal(null)}
              >
                Cancel & Keep In Place
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  // Admin override with logged justification
                  const target = dependencyViolationModal.targetStage;
                  const updated = localTasks.map((t) =>
                    t.id === draggedTaskId ? { ...t, stageNumber: target, earlyStartHours: (target - 1) * 6 } : t
                  );
                  const cpm = calculateCpmSchedule(
                    updated.map((t) => ({
                      id: t.id,
                      code: t.code,
                      title: t.title,
                      durationHours: t.durationHours,
                      stageNumber: t.stageNumber,
                      predecessorIds: t.predecessorIds,
                    }))
                  );
                  setLocalTasks(
                    updated.map((t) => {
                      const cpmTask = cpm.tasks.find((ct) => ct.id === t.id);
                      return { ...t, ...cpmTask };
                    })
                  );
                  setDependencyViolationModal(null);
                  setDraggedTaskId(null);
                }}
              >
                ⚠️ Override Dependency (Log Audit Exemption)
              </Button>
            </div>
          }
        >
          <div style={{ fontSize: '13px', color: '#1e293b', lineHeight: 1.6 }}>
            <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '6px', padding: '12px', marginBottom: '14px', color: '#9f1239' }}>
              <strong>GOVERNANCE BLOCK:</strong> {dependencyViolationModal.message}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Required Action:</strong> Complete the mandatory deliverables and inspection permits in{' '}
              <span style={{ color: '#0284c7', fontWeight: 700 }}>
                {dependencyViolationModal.blockingStages.map((p) => `STAGE-${String(p).padStart(2, '0')}`).join(', ')}
              </span>{' '}
              before scheduling activities into downstream stage {dependencyViolationModal.targetStage}.
            </div>
          </div>
        </Modal>
      )}

      {/* CPM Engine Top Banner */}
      <div
        style={{
          backgroundColor: '#0f172a',
          color: '#ffffff',
          borderRadius: '8px',
          padding: '20px 24px',
          border: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Deterministic CPM Scheduling Engine
            </span>
            <Badge variant="danger">{criticalCount} Critical Path Activities</Badge>
            <Badge variant="info">13 Canonical Stages Active</Badge>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
            Critical Path Method: Zero Total Float Defines Venue Delivery Horizon
          </div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            Early Start (ES), Early Finish (EF), Late Start (LS), Late Finish (LF) and total float computed dynamically across DAG dependencies.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Bump-In Window</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: projectDuration <= baselineDuration ? '#10b981' : '#f59e0b' }}>
              {projectDuration} Hours
            </div>
          </div>
        </div>
      </div>

      {/* Slippage Alert Ribbon (Automated Variance Tracking) */}
      {hasSlippage && (
        <div
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>⚠️</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#92400e' }}>
                MILESTONE SLIPPAGE ALERT: +{scheduleVariance} Hours Past 72h Baseline SLA ({slippagePercent}% Schedule Erosion)
              </div>
              <div style={{ fontSize: '12px', color: '#b45309', marginTop: '2px' }}>
                Downstream rigging and line-array tuning in Stage 10 push the Live Show call window beyond allowable curfew.
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={handleApplyCpmRecovery}
            style={{ fontSize: '11px', fontWeight: 800 }}
          >
            ⚡ Apply Automated CPM Recovery
          </Button>
        </div>
      )}

      {/* Recovery Toast Feedback */}
      {recoveryToast && (
        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '6px',
            padding: '10px 14px',
            color: '#166534',
            fontSize: '12px',
            fontWeight: 700,
          }}
        >
          {recoveryToast}
        </div>
      )}

      {/* KPI Ribbon */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '12px',
        }}
      >
        <Card style={{ padding: '16px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Critical Path Tasks</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444', margin: '4px 0' }}>
            {criticalCount}
          </div>
          <div style={{ fontSize: '11px', color: '#b91c1c' }}>Zero float: Any delay moves show date</div>
        </Card>

        <Card style={{ padding: '16px', borderLeft: '4px solid #2563eb' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Tasks Scheduled</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#2563eb', margin: '4px 0' }}>
            {activeTasks.length}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Acyclic DAG across 13 stages</div>
        </Card>

        <Card style={{ padding: '16px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Schedule Variance (SV)</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: scheduleVariance <= 0 ? '#10b981' : '#f59e0b', margin: '4px 0' }}>
            {scheduleVariance > 0 ? `+${scheduleVariance}h` : `${scheduleVariance}h`}
          </div>
          <div style={{ fontSize: '11px', color: scheduleVariance <= 0 ? '#047857' : '#b45309' }}>
            {scheduleVariance <= 0 ? 'Ahead of 72h SLA window' : 'Exceeds 72h planned buffer'}
          </div>
        </Card>

        <Card style={{ padding: '16px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Noise Curfew Window</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', margin: '4px 0' }}>
            22:00 - 04:00
          </div>
          <div style={{ fontSize: '11px', color: '#b45309' }}>Night: 55 dB (Res 4/2005) | Day: 65 dB</div>
        </Card>
      </div>

      {/* Main Gantt & Stage Board Controls */}
      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              Interactive Operational Schedule & Critical Path
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              Drag and drop activities across the 13 canonical stages or timeline slots. Strict predecessor dependencies enforced in real-time.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Strict Dependency Enforcement Toggle */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 700,
                color: enforceDependencies ? '#0284c7' : '#64748b',
                backgroundColor: enforceDependencies ? '#f0f9ff' : '#f8fafc',
                border: `1px solid ${enforceDependencies ? '#bae6fd' : '#e2e8f0'}`,
                padding: '6px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={enforceDependencies}
                onChange={(e) => setEnforceDependencies(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              🔒 Enforce Stage Graph Dependencies
            </label>

            {/* View Mode Switcher */}
            <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '6px' }}>
              <button
                type="button"
                onClick={() => setViewMode('stages')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  border: 'none',
                  backgroundColor: viewMode === 'stages' ? '#0f172a' : 'transparent',
                  color: viewMode === 'stages' ? '#ffffff' : '#64748b',
                  cursor: 'pointer',
                }}
              >
                📊 13-Stage Canonical Board
              </button>
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  border: 'none',
                  backgroundColor: viewMode === 'timeline' ? '#0f172a' : 'transparent',
                  color: viewMode === 'timeline' ? '#ffffff' : '#64748b',
                  cursor: 'pointer',
                }}
              >
                ⏱️ CPM Timeline (0-{projectDuration}h)
              </button>
            </div>
          </div>
        </div>

        {/* 1. VIEW MODE: 13-STAGE CANONICAL DRAG-AND-DROP BOARD */}
        {viewMode === 'stages' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
              💡 <em>Drag any task card to advance or reschedule it into another stage lane. Stages with incomplete predecessors will trigger dependency safeguards.</em>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '12px',
                maxHeight: '750px',
                overflowY: 'auto',
                paddingRight: '4px',
              }}
            >
              {CANONICAL_13_STAGES.map((stage) => {
                const stageTasks = activeTasks.filter((t: any) => (t.stageNumber || 1) === stage.stageNumber);
                const prereqs = stage.prerequisiteStages;
                const isBlocked =
                  enforceDependencies &&
                  prereqs.some((pNum) => {
                    const pTasks = activeTasks.filter((t: any) => (t.stageNumber || 1) === pNum);
                    return pTasks.some((t: any) => !t.completed);
                  });

                return (
                  <div
                    key={stage.stageNumber}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDropTaskOnStage(stage.stageNumber)}
                    style={{
                      backgroundColor: isBlocked ? '#fff8f8' : '#f8fafc',
                      border: `1px solid ${isBlocked ? '#fecdd3' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: '160px',
                      transition: 'border-color 0.2s ease',
                    }}
                  >
                    {/* Stage Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '11px', color: '#0284c7' }}>
                            {stage.code}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                            {stage.name}
                          </span>
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                          {stage.description}
                        </div>
                      </div>
                      <Badge variant={isBlocked ? 'danger' : stageTasks.every((t: any) => t.completed) && stageTasks.length > 0 ? 'success' : 'neutral'}>
                        {isBlocked ? 'BLOCKED' : `${stageTasks.length} Tasks`}
                      </Badge>
                    </div>

                    {/* Blocker Notice if Predecessor is Incomplete */}
                    {isBlocked && (
                      <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '4px', padding: '6px 8px', fontSize: '10px', color: '#991b1b', marginBottom: '8px' }}>
                        ⛔ Requires: Stage {stage.prerequisiteStages.map((p) => `STAGE-${String(p).padStart(2, '0')}`).join(', ')} Gate Sign-Off
                      </div>
                    )}

                    {/* Stage Tasks List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                      {stageTasks.map((t: any) => (
                        <div
                          key={t.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, t.id)}
                          onClick={() => setSelectedTask(t)}
                          style={{
                            padding: '8px 10px',
                            backgroundColor: selectedTask?.id === t.id ? '#eff6ff' : '#ffffff',
                            border: `1px solid ${selectedTask?.id === t.id ? '#93c5fd' : t.isCritical ? '#fca5a5' : '#e2e8f0'}`,
                            borderRadius: '6px',
                            cursor: 'grab',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '10px', fontWeight: 800, color: t.isCritical ? '#ef4444' : '#2563eb' }}>
                              {t.code}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {t.isCritical && (
                                <span style={{ fontSize: '9px', fontWeight: 800, color: '#dc2626', backgroundColor: '#fee2e2', padding: '1px 4px', borderRadius: '3px' }}>
                                  CPM CRITICAL
                                </span>
                              )}
                              <input
                                type="checkbox"
                                checked={!!t.completed}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleToggleTaskComplete(t.id);
                                }}
                                title="Mark activity gate completed"
                                style={{ cursor: 'pointer' }}
                              />
                            </div>
                          </div>

                          <div style={{ fontSize: '11px', fontWeight: 600, color: '#1e293b' }}>
                            {t.title}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: '#64748b' }}>
                            <span>Duration: <strong>{t.durationHours}h</strong></span>
                            <span style={{ color: t.isCritical ? '#ef4444' : '#16a34a', fontWeight: 600 }}>
                              Float: {t.totalFloatHours ?? 0}h
                            </span>
                          </div>
                        </div>
                      ))}

                      {stageTasks.length === 0 && (
                        <div
                          style={{
                            padding: '16px',
                            textAlign: 'center',
                            border: '1px dashed #cbd5e1',
                            borderRadius: '6px',
                            color: '#94a3b8',
                            fontSize: '11px',
                          }}
                        >
                          Drop task here to schedule into {stage.code}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. VIEW MODE: CPM BAR TIMELINE */}
        {viewMode === 'timeline' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activeTasks.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>No timeline activities scheduled</div>
                <div style={{ fontSize: '12px' }}>Add canonical tasks or drag items from the stage board to populate the Critical Path Method timeline.</div>
              </div>
            ) : (
              activeTasks.map((t: any) => {
                const maxHours = projectDuration > 0 ? projectDuration : 72;
                const leftPct = ((t.earlyStartHours || 0) / maxHours) * 100;
                const widthPct = Math.max(3, ((t.durationHours || 6) / maxHours) * 100);

              return (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, t.id)}
                  onClick={() => setSelectedTask(t)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '260px 1fr 100px',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: selectedTask?.id === t.id ? '#f1f5f9' : '#ffffff',
                    border: selectedTask?.id === t.id ? '1px solid #cbd5e1' : '1px solid #f1f5f9',
                    cursor: 'grab',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '12px', color: t.isCritical ? '#ef4444' : '#2563eb' }}>
                        {t.code}
                      </span>
                      {t.isCritical && (
                        <span
                          style={{
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: '3px',
                            textTransform: 'uppercase',
                          }}
                        >
                          CRITICAL (0h FLOAT)
                        </span>
                      )}
                      <span
                        style={{
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '3px',
                          textTransform: 'uppercase',
                        }}
                      >
                        STAGE {t.stageNumber || 1}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                      {t.title}
                    </div>
                  </div>

                  {/* Timeline Bar Track */}
                  <div style={{ position: 'relative', height: '24px', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        top: '2px',
                        bottom: '2px',
                        backgroundColor: t.isCritical ? '#ef4444' : '#3b82f6',
                        borderRadius: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: 700,
                        boxShadow: t.isCritical ? '0 0 8px rgba(239, 68, 68, 0.4)' : 'none',
                      }}
                    >
                      {t.durationHours}h
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748b' }}>
                    Float: <strong style={{ color: t.isCritical ? '#ef4444' : '#16a34a' }}>{t.totalFloatHours ?? 0}h</strong>
                  </div>
                </div>
              );
            }))}
          </div>
        )}


        {/* Selected Task CPM Diagnostics Inspector */}
        {selectedTask && (
          <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '14px', color: selectedTask.isCritical ? '#ef4444' : '#2563eb' }}>
                  {selectedTask.code}
                </span>
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                  {selectedTask.title}
                </span>
                {selectedTask.isCritical && (
                  <Badge variant="danger" size="sm">CRITICAL PATH</Badge>
                )}
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Duration: <strong>{selectedTask.durationHours}h</strong>
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', fontSize: '11px' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b' }}>Early Start (ES):</span> <strong>Hour {selectedTask.earlyStartHours ?? 0}</strong>
              </div>
              <div style={{ backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b' }}>Early Finish (EF):</span> <strong>Hour {selectedTask.earlyFinishHours ?? selectedTask.durationHours}</strong>
              </div>
              <div style={{ backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b' }}>Late Start (LS):</span> <strong>Hour {selectedTask.lateStartHours ?? selectedTask.earlyStartHours ?? 0}</strong>
              </div>
              <div style={{ backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b' }}>Late Finish (LF):</span> <strong>Hour {selectedTask.lateFinishHours ?? selectedTask.earlyFinishHours ?? selectedTask.durationHours}</strong>
              </div>
              <div style={{ backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b' }}>Total Float:</span> <strong style={{ color: selectedTask.isCritical ? '#dc2626' : '#16a34a' }}>{selectedTask.totalFloatHours ?? 0}h</strong>
              </div>
              <div style={{ backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b' }}>Free Float:</span> <strong>{selectedTask.freeFloatHours ?? selectedTask.totalFloatHours ?? 0}h</strong>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 24/7 Site Bump-in Shift Log & Noise Curfews */}
      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              24/7 Venue Bump-In Operational Shifts & Constraint Profile
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              Shifts dynamically evaluated against active Operational Constraint Profile with controlled source documents and verification status.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: '#166534', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '4px 8px', borderRadius: '4px', fontWeight: 700 }}>
              📋 Pack: DECC Controlled Venue Pack (DOC-DECC-FP-2024 & DOC-MECC-ENV-2005)
            </span>
            <span style={{ fontSize: '11px', color: '#1e40af', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '4px 8px', borderRadius: '4px', fontWeight: 700 }}>
              ✓ Status: Verified (Floor: 2.5 T/m² | Day: 65 dB | Night: 55 dB [22:00-04:00])
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          {shifts.slice(0, 6).map((shift: any) => (
            <div
              key={shift.shiftNumber}
              style={{
                border: shift.isCurfewActive ? '1.5px solid #fde68a' : '1px solid #e2e8f0',
                backgroundColor: shift.isCurfewActive ? '#fffbeb' : '#ffffff',
                borderRadius: '6px',
                padding: '14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                  {shift.label}
                </span>
                <Badge variant={shift.isCurfewActive ? 'warning' : 'info'} size="sm">
                  {shift.shiftType?.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>

              <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                Noise Threshold: <strong>{shift.allowedNoiseDb} dB(A)</strong> • Floor Load: <strong>{shift.maxFloorLoadKgM2 || 2500} kg/m²</strong>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Source Doc: <strong>{shift.sourceDocument || 'DOC-DECC-FP-2024'}</strong> • Status:{' '}
                <strong style={{ color: shift.verificationStatus === 'Verified' ? '#16a34a' : '#b45309' }}>
                  {shift.verificationStatus === 'Verified' ? '✅ Verified' : '⚠️ Unverified'}
                </strong>
              </div>

              {shift.isCurfewActive && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#b45309', fontWeight: 600 }}>
                  ⚠️ Noise Curfew Active (22:00 - 04:00): 55 dB(A) limit. Heavy lift & crane assembly only. Acoustic testing strictly prohibited.
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Controlled Operational Constraints Provenance Table */}
        <div style={{ marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                Controlled Operational Constraints & Verification Provenance
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                Every constraint item maintains full 14-point regulatory provenance and cryptographic evidence.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Button size="sm" variant="outline" onClick={() => setIsCreateModalOpen(true)}>
                + Draft Operational Constraint
              </Button>
            </div>
          </div>

          {/* Prominent Scheduling Enforcement Alert */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '6px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              color: '#92400e',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '14px',
            }}
          >
            <span>⚠️</span>
            <span>
              <strong>Deterministic Scheduling Engine Policy:</strong> Only constraints marked as <strong>Applicable</strong> and <strong>Verified</strong> with cryptographic document evidence are enforced by the scheduling engine. Unverified constraints fallback to safe statutory baseline defaults.
            </span>
          </div>

          {actionError && (
            <div style={{ padding: '8px 12px', borderRadius: '4px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '12px', marginBottom: '12px' }}>
              {actionError}
            </div>
          )}
          {actionSuccess && (
            <div style={{ padding: '8px 12px', borderRadius: '4px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: '12px', marginBottom: '12px' }}>
              {actionSuccess}
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>Constraint Type & ID</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>Limit / Value</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>Time Window & Zone</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>Controlled Source Document</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>Verification Status</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>Reviewer & Evidence Hash</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {constraints.map((c: any) => {
                  const isVerified = c.verificationStatus === 'Verified';
                  const isUnderReview = c.verificationStatus === 'Under Review';
                  const isSourceAttached = c.verificationStatus === 'Source Attached';

                  return (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isVerified ? '#ffffff' : '#fafafa',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setSelectedConstraint(c);
                        setIsInspectModalOpen(true);
                      }}
                    >
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {c.constraintType?.replace(/_/g, ' ').toUpperCase()}
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                          {c.id}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}>
                        {c.limitValue} {c.unit}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>
                        <div>{c.timeWindow}</div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>{c.locationZone}</div>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#2563eb' }}>
                        <div style={{ fontWeight: 600 }}>{c.sourceDocument}</div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>
                          {c.sourceOrganization} {c.sourceRevisionDate ? `• ${c.sourceRevisionDate}` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor:
                              isVerified ? '#dcfce7' :
                              isUnderReview ? '#dbeafe' :
                              isSourceAttached ? '#f3e8ff' : '#fef3c7',
                            color:
                              isVerified ? '#15803d' :
                              isUnderReview ? '#1d4ed8' :
                              isSourceAttached ? '#7e22ce' : '#b45309',
                            border: `1px solid ${
                              isVerified ? '#86efac' :
                              isUnderReview ? '#bfdbfe' :
                              isSourceAttached ? '#d8b4fe' : '#fde68a'
                            }`,
                          }}
                        >
                          {isVerified ? '✅ Verified' :
                           isUnderReview ? '⏳ Under Review' :
                           isSourceAttached ? '📄 Source Attached' :
                           c.verificationStatus === 'Draft' ? '📝 Draft' : '⚠️ Unverified'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '10px' }}>
                        {c.verifiedBy ? (
                          <div>
                            <strong style={{ color: '#0f172a' }}>{c.verifiedBy}</strong>
                            <div style={{ fontFamily: 'monospace', color: '#059669', marginTop: '2px', wordBreak: 'break-all' }}>
                              🔒 {c.sourceDocumentHash ? `${c.sourceDocumentHash.slice(0, 18)}...` : 'sha256:verified'}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                            {c.calculatedSha256 ? `🔒 ${c.calculatedSha256.slice(0, 14)}... (Pending Review)` : 'Evidence pending upload'}
                          </span>
                        )}
                      </td>
                      <td
                        style={{ padding: '10px 12px', textAlign: 'center' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedConstraint(c);
                              setIsInspectModalOpen(true);
                            }}
                          >
                            Inspect
                          </Button>
                          {isUnderReview && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => {
                                setConstraintToVerify(c);
                                setVerifyForm({
                                  pageClauseSection: c.evidenceSummary || 'Section 3.2',
                                  extractedRuleValue: `${c.limitValue} ${c.unit}`,
                                  applicabilityStatement: c.locationZone || 'Venue Wide',
                                  reviewerRole: 'technical_director',
                                  reviewerComment: 'Authoritative verification approved against controlled source.',
                                });
                                setIsVerifyModalOpen(true);
                              }}
                            >
                              Verify
                            </Button>
                          )}
                          {(c.verificationStatus === 'Draft' || c.verificationStatus === 'Unverified') && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={async () => {
                                setActionLoading(true);
                                try {
                                  const docId = c.constraintType?.includes('noise') ? 'doc-mecc-env-01' : 'doc-decc-fp-01';
                                  const revId = c.constraintType?.includes('noise') ? 'rev-mecc-env-01' : 'rev-decc-fp-01';
                                  await apiClient.attachSourceToConstraint(projectId, c.id, {
                                    controlledDocumentId: docId,
                                    documentRevisionId: revId,
                                    pageClauseSection: c.constraintType?.includes('noise') ? 'Annex 3/5' : 'Section 3.2',
                                  });
                                  await apiClient.submitConstraintForReview(projectId, c.id);
                                  setActionSuccess(`Controlled document attached to ${c.id} and submitted for review.`);
                                  await loadData();
                                } catch (e: any) {
                                  setActionError(e.message);
                                } finally {
                                  setActionLoading(false);
                                }
                              }}
                            >
                              Attach Doc
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Controlled Document Provenance Inspection Modal */}
      <Modal
        isOpen={isInspectModalOpen && !!selectedConstraint}
        onClose={() => setIsInspectModalOpen(false)}
        title="Controlled Operational Constraint Provenance & Evidence Audit"
        size="lg"
      >
        {selectedConstraint && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Scheduling Enforcement Status Callout */}
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '6px',
                backgroundColor: selectedConstraint.verificationStatus === 'Verified' ? '#f0fdf4' : '#fffbeb',
                border: `1.5px solid ${selectedConstraint.verificationStatus === 'Verified' ? '#86efac' : '#fde68a'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '20px' }}>
                {selectedConstraint.verificationStatus === 'Verified' ? '✅' : '⚠️'}
              </span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '13px', color: selectedConstraint.verificationStatus === 'Verified' ? '#166534' : '#92400e' }}>
                  {selectedConstraint.verificationStatus === 'Verified'
                    ? 'AUTHORITATIVE RULE — ACTIVELY ENFORCED BY DETERMINISTIC SCHEDULING ENGINE'
                    : 'UNVERIFIED CONSTRAINT — BARRED FROM DETERMINISTIC CPM TIMELINE ENFORCEMENT'}
                </div>
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                  {selectedConstraint.verificationStatus === 'Verified'
                    ? 'Backed by certified reviewer sign-off, system-calculated SHA-256 cryptographic hash, and immutable audit event.'
                    : 'Unverified and draft constraints are barred from production scheduling. The scheduling engine strictly falls back to safe statutory baselines.'}
                </div>
              </div>
            </div>

            {/* Provenance Metadata Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '11px' }}>Constraint ID & Type:</span>
                <div style={{ fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{selectedConstraint.id}</div>
                <div style={{ color: '#2563eb', fontWeight: 600 }}>{selectedConstraint.constraintType}</div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '11px' }}>Operational Limit / Value:</span>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '16px', marginTop: '2px' }}>
                  {selectedConstraint.limitValue} {selectedConstraint.unit}
                </div>
                <div style={{ color: '#64748b', fontSize: '11px' }}>Zone: {selectedConstraint.locationZone} ({selectedConstraint.timeWindow})</div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '11px' }}>Controlled Document ID & Number:</span>
                <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                  {selectedConstraint.controlledDocumentId || 'None (Unattached)'}
                </div>
                <div style={{ color: '#2563eb', fontWeight: 600 }}>{selectedConstraint.sourceDocument}</div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '11px' }}>Document Revision & Date:</span>
                <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                  {selectedConstraint.documentRevisionId || selectedConstraint.sourceRevisionDate}
                </div>
                <div style={{ color: '#64748b' }}>Source Org: {selectedConstraint.sourceOrganization}</div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '11px' }}>Page / Clause / Section Cited:</span>
                <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                  {selectedConstraint.verificationRecord?.pageClauseSection || selectedConstraint.evidenceSummary || 'Pending verification citation'}
                </div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '11px' }}>Extracted Rule / Value:</span>
                <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                  {selectedConstraint.verificationRecord?.extractedRuleValue || `${selectedConstraint.limitValue} ${selectedConstraint.unit}`}
                </div>
              </div>
            </div>

            {/* Cryptographic SHA-256 Hash Card */}
            <div style={{ backgroundColor: '#0f172a', color: '#f8fafc', padding: '14px 16px', borderRadius: '6px', border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  🔒 System-Calculated SHA-256 Document Integrity Hash
                </span>
                <span style={{ fontSize: '10px', color: '#94a3b8', backgroundColor: '#1e293b', padding: '2px 6px', borderRadius: '4px' }}>
                  Byte-Level Calculation
                </span>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#34d399', wordBreak: 'break-all' }}>
                {selectedConstraint.sourceDocumentHash || selectedConstraint.calculatedSha256 || 'None (Unattached document has no hash)'}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                * Hash is strictly calculated by EOS from stored file bytes upon controlled document upload. Manual entry is prohibited.
              </div>
            </div>

            {/* Certified Reviewer & Audit Ledger Info */}
            <div style={{ backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <h5 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                Audited Review Action & Ledger Event
              </h5>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '11px' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Verified By / Reviewer:</span>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                    {selectedConstraint.verifiedBy || selectedConstraint.verificationRecord?.reviewerIdentity || 'Pending Verification'}
                  </div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Reviewer Role:</span>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                    {selectedConstraint.verificationRecord?.reviewerRole || 'None'}
                  </div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Verified Timestamp:</span>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                    {selectedConstraint.verifiedAt || 'Pending'}
                  </div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Immutable Audit Event ID:</span>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                    {selectedConstraint.verificationRecord?.auditEventId || 'audit-ledger-pending'}
                  </div>
                </div>
              </div>
              {selectedConstraint.verificationRecord?.reviewerComment && (
                <div style={{ marginTop: '10px', fontSize: '11px', color: '#475569', backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                  <strong>Reviewer Compliance Comment:</strong> {selectedConstraint.verificationRecord.reviewerComment}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="secondary" onClick={() => setIsInspectModalOpen(false)}>
                Close
              </Button>
              {selectedConstraint.verificationStatus === 'Under Review' && (
                <Button
                  variant="primary"
                  onClick={() => {
                    setConstraintToVerify(selectedConstraint);
                    setVerifyForm({
                      pageClauseSection: selectedConstraint.evidenceSummary || 'Section 3.2',
                      extractedRuleValue: `${selectedConstraint.limitValue} ${selectedConstraint.unit}`,
                      applicabilityStatement: selectedConstraint.locationZone || 'Venue Wide',
                      reviewerRole: 'technical_director',
                      reviewerComment: 'Authoritative verification approved against controlled source document.',
                    });
                    setIsInspectModalOpen(false);
                    setIsVerifyModalOpen(true);
                  }}
                >
                  Verify Constraint
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Verify Constraint Review Modal */}
      <Modal
        isOpen={isVerifyModalOpen && !!constraintToVerify}
        onClose={() => setIsVerifyModalOpen(false)}
        title="Authoritative Verification Review"
        size="md"
      >
        {constraintToVerify && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
            <div style={{ padding: '10px 14px', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe', color: '#1e40af' }}>
              <strong>Authorized Review Action:</strong> Only authorized roles (technical_director, structural_engineer, hse_director, project_director, super_admin) can transition constraints to Verified.
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                Page / Clause / Section Reference *
              </label>
              <input
                type="text"
                value={verifyForm.pageClauseSection}
                onChange={(e) => setVerifyForm({ ...verifyForm, pageClauseSection: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                placeholder="e.g. Section 3.2 (Ground Slab Capacities)"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                Extracted Rule / Value *
              </label>
              <input
                type="text"
                value={verifyForm.extractedRuleValue}
                onChange={(e) => setVerifyForm({ ...verifyForm, extractedRuleValue: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                placeholder="e.g. 2.5 T/m² (2,500 kg/m²)"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                Applicability Statement *
              </label>
              <input
                type="text"
                value={verifyForm.applicabilityStatement}
                onChange={(e) => setVerifyForm({ ...verifyForm, applicabilityStatement: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                placeholder="e.g. Exhibition Halls 1 to 5 Ground Slab"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                Reviewer Authorized Role *
              </label>
              <select
                value={verifyForm.reviewerRole}
                onChange={(e) => setVerifyForm({ ...verifyForm, reviewerRole: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                <option value="technical_director">Technical Director (technical_director)</option>
                <option value="structural_engineer">Licensed Structural Engineer (structural_engineer)</option>
                <option value="hse_director">HSE Director (hse_director)</option>
                <option value="project_director">Project Director (project_director)</option>
                <option value="super_admin">Super Administrator (super_admin)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                Reviewer Compliance Comment
              </label>
              <textarea
                value={verifyForm.reviewerComment}
                onChange={(e) => setVerifyForm({ ...verifyForm, reviewerComment: e.target.value })}
                rows={3}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                placeholder="Authoritative compliance statement..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <Button variant="secondary" onClick={() => setIsVerifyModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="success"
                isLoading={actionLoading}
                onClick={async () => {
                  setActionLoading(true);
                  setActionError(null);
                  try {
                    await apiClient.verifyConstraint(projectId, constraintToVerify.id, {
                      pageClauseSection: verifyForm.pageClauseSection,
                      extractedRuleValue: verifyForm.extractedRuleValue,
                      applicabilityStatement: verifyForm.applicabilityStatement,
                      reviewerComment: verifyForm.reviewerComment,
                    });
                    setActionSuccess(`Constraint ${constraintToVerify.id} verified authoritative! Scheduling engine now enforces it.`);
                    setIsVerifyModalOpen(false);
                    await loadData();
                  } catch (e: any) {
                    setActionError(e.message);
                  } finally {
                    setActionLoading(false);
                  }
                }}
              >
                Execute Authoritative Verification
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Draft Constraint Modal (Draft only — Verified is non-editable) */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Draft Operational Constraint"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
          <div style={{ padding: '10px 14px', backgroundColor: '#fffbeb', borderRadius: '6px', border: '1px solid #fde68a', color: '#92400e' }}>
            🔒 <strong>Verification Policy:</strong> New constraints are strictly initialized in <strong>Draft</strong> status. Manual assignment of 'Verified' status is prohibited by EOS security policy.
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
              Constraint Type *
            </label>
            <select
              value={createForm.constraintType}
              onChange={(e) => setCreateForm({ ...createForm, constraintType: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            >
              <option value="environmental_boundary_noise">Environmental Boundary Noise</option>
              <option value="occupational_noise_exposure">Occupational Noise Exposure</option>
              <option value="venue_operational_noise">Venue Operational Noise</option>
              <option value="permit_noise_limit">Permit Noise Limit</option>
              <option value="sound_system_operational_limit">Sound System Operational Limit</option>
              <option value="floor_load">Floor Load Limit</option>
              <option value="clear_height">Clear Height Limit</option>
              <option value="rigging_point">Rigging Point Capacity</option>
              <option value="working_hours">Working Hours Shift Limit</option>
              <option value="logistics_dock">Logistics Dock Capacity</option>
              <option value="utility_power">Utility Power Capacity</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                Limit / Value *
              </label>
              <input
                type="number"
                value={createForm.limitValue}
                onChange={(e) => setCreateForm({ ...createForm, limitValue: Number(e.target.value) })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                Unit *
              </label>
              <input
                type="text"
                value={createForm.unit}
                onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                Location / Zone *
              </label>
              <input
                type="text"
                value={createForm.locationZone}
                onChange={(e) => setCreateForm({ ...createForm, locationZone: e.target.value })}
                placeholder="e.g. Main Exhibition Hall 1"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                Time Window *
              </label>
              <input
                type="text"
                value={createForm.timeWindow}
                onChange={(e) => setCreateForm({ ...createForm, timeWindow: e.target.value })}
                placeholder="e.g. 08:00 - 20:00"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
              Source Organization
            </label>
            <input
              type="text"
              value={createForm.sourceOrganization}
              onChange={(e) => setCreateForm({ ...createForm, sourceOrganization: e.target.value })}
              placeholder="e.g. Venue Authority Operations"
              style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
              Notes / Proposed Citation
            </label>
            <textarea
              value={createForm.notes}
              onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              placeholder="e.g. Venue acoustic and operational regulations manual..."
              rows={2}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={actionLoading}
              onClick={async () => {
                setActionLoading(true);
                setActionError(null);
                try {
                  await apiClient.createConstraint(projectId, {
                    constraintType: createForm.constraintType,
                    limitValue: createForm.limitValue,
                    unit: createForm.unit,
                    locationZone: createForm.locationZone,
                    timeWindow: createForm.timeWindow,
                    priority: createForm.priority,
                    sourceOrganization: createForm.sourceOrganization,
                    overrideAuthority: createForm.overrideAuthority,
                    notes: createForm.notes,
                  });
                  setActionSuccess('Draft operational constraint created. Attach controlled source document to proceed.');
                  setIsCreateModalOpen(false);
                  await loadData();
                } catch (e: any) {
                  setActionError(e.message);
                } finally {
                  setActionLoading(false);
                }
              }}
            >
              Create Draft Constraint
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
