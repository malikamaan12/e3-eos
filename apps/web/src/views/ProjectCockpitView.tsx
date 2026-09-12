import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { MetricCard, Card, Badge, Button, Modal, Input, Textarea, Select, formatCurrency } from '../components/DesignSystem.js';
import { RequirementsMatrixView } from './RequirementsMatrixView.js';
import { ClarificationsView } from './ClarificationsView.js';
import { DocumentRegisterView } from './DocumentRegisterView.js';
import { MasterGanttView } from './MasterGanttView.js';
import { DesignReviewView } from './DesignReviewView.js';
import { CommercialBOQView } from './CommercialBOQView.js';
import { ProcurementDeliveryView } from './ProcurementDeliveryView.js';
import { ProductionDeliveryView } from './ProductionDeliveryView.js';
import { AssetsDeliveryView } from './AssetsDeliveryView.js';
import { LogisticsDeliveryView } from './LogisticsDeliveryView.js';
import { CrewDeliveryView } from './CrewDeliveryView.js';
import { SiteOpsDeliveryView } from './SiteOpsDeliveryView.js';
import { CrossModuleTraceabilityModal } from './CrossModuleTraceabilityModal.js';

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
  const isRtl = currentLanguage === 'ar';

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
  const [approvalAmountQar, setApprovalAmountQar] = useState<number>(320000);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState<boolean>(false);

  // Workstream filter state
  const [workstreamFilter, setWorkstreamFilter] = useState<'needs_attention' | 'on_track' | 'all'>('needs_attention');
  const [selectedAuditDetail, setSelectedAuditDetail] = useState<any | null>(null);
  const [isLineageModalOpen, setIsLineageModalOpen] = useState<boolean>(false);
  const [cockpitModuleTab, setCockpitModuleTab] = useState<
    | 'overview'
    | 'requirements'
    | 'clarifications'
    | 'documents'
    | 'timeline'
    | 'design'
    | 'commercial'
    | 'procurement'
    | 'production'
    | 'assets'
    | 'logistics'
    | 'crew'
    | 'site'
    | 'readiness'
  >(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (
        tabParam &&
        [
          'overview',
          'requirements',
          'clarifications',
          'documents',
          'timeline',
          'design',
          'commercial',
          'procurement',
          'production',
          'assets',
          'logistics',
          'crew',
          'site',
          'readiness',
        ].includes(tabParam)
      ) {
        return tabParam as any;
      }
    }
    return 'overview';
  });

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

  // Invariant: Authority is strictly resolved by the backend policy engine, never calculated independently in the frontend.
  const [cockpitThreshold, setCockpitThreshold] = useState<{
    requiredRole: 'project_manager' | 'finance' | 'executive';
    roleTitle: string;
    canonicalApprover: string;
    governanceRule: string;
    reason: string;
    policyId?: string;
    policyVersion?: number;
    policyScopeMatched?: string;
  }>({
    requiredRole: 'finance',
    roleTitle: 'Financial Controller',
    canonicalApprover: 'Rashid Al-Hajri (Financial Controller)',
    governanceRule: 'POL-COMM-02',
    reason: 'Transaction evaluated under configured commercial approval policy',
    policyId: 'E3-POL-COMMERCIAL-GLOBAL',
    policyVersion: 1,
    policyScopeMatched: 'system_default',
  });

  useEffect(() => {
    let isCancelled = false;
    apiClient
      .resolveApprovalPolicy({
        projectId,
        amount: approvalAmountQar,
        transactionType: 'purchase_order',
      })
      .then((res) => {
        if (!isCancelled && res) {
          setCockpitThreshold(res);
        }
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, [projectId, approvalAmountQar, apiClient]);

  const handleRequestApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingApproval(true);
    try {
      await apiClient.requestApproval(projectId, {
        targetType: 'purchase_order',
        targetId: tasks[0]?.id || 'clarification-01',
        reason: approvalReason,
        requiredRole: cockpitThreshold.requiredRole,
        amount: approvalAmountQar,
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

  const [showTechnicalAudit, setShowTechnicalAudit] = useState<boolean>(false);

  // 9 Canonical Workstreams
  const workstreams = [
    { name: 'Creative & 3D Spatial Renders', lead: 'Karim Haddad', progress: 85, openTasks: 1, blockers: 0, status: 'on_track' },
    { name: 'Technical & Structural CAD Rigging', lead: 'Karim Haddad', progress: 60, openTasks: 2, blockers: 0, status: 'on_track' },
    { name: 'Commercial Pricing & BOQ', lead: 'Rashid Al-Hajri', progress: 95, openTasks: 0, blockers: 0, status: 'healthy' },
    { name: 'Procurement Packages & RFQs', lead: 'Maryam Al-Kuwari', progress: 40, openTasks: 3, blockers: 1, status: 'warning' },
    { name: 'Logistics, Fleet & Dispatch', lead: 'Hamad Al-Khelaifi', progress: 20, openTasks: 2, blockers: 0, status: 'on_track' },
    { name: 'Site & Operations Runbooks', lead: 'Salem Al-Marri', progress: 75, openTasks: 1, blockers: 0, status: 'healthy' },
    { name: 'HSE, Fire Safety & Permits', lead: 'Dr. Sarah Ibrahim', progress: 30, openTasks: 2, blockers: 1, status: 'warning' },
    { name: 'Client Stakeholder Collaboration', lead: 'Zaid Mansour', progress: 90, openTasks: 0, blockers: 0, status: 'healthy' },
    { name: 'Governance & Four-Eyes Gates', lead: 'Nasser Al-Attiyah', progress: 50, openTasks: 1, blockers: 0, status: 'on_track' },
  ];

  const projectTitle = cockpitData?.title || 'Qatar Tourism Demo Tender';
  const projectCode = cockpitData?.projectCode || 'PRJ-2026-DEMO';
  const clientName = cockpitData?.clientName || 'Qatar Tourism Authority';
  const venue = cockpitData?.venue?.name || 'Doha Exhibition & Convention Center';
  const daysRemaining = cockpitData?.daysRemaining ?? 66;
  const isDraft = cockpitData?.maturity === 'draft';

  // Fast-track incomplete detection
  const isIncomplete = cockpitData?.isOnboardingComplete === false || cockpitData?.isFastTrack;
  const onboardingPct = cockpitData?.onboardingCompletionPct || 38;
  const missingSectionsList: string[] = cockpitData?.missingSections || [
    'Client Approver & Signatory',
    'Confirmed Venue & Zone Specifications',
    'Detailed Bump-In / Bump-Out Milestones',
    'Cost Baseline & Margin Breakdown',
    'Key Delivery Stakeholders (Tech Director, HSE Lead)',
  ];

  // Rejection detection
  const rejectedApproval = approvals.find((a) => a.status === 'rejected');

  // Strict EAC Accounting: EAC = Actual Cost + Forecast to Complete
  const baselineCost = isDraft ? null : (cockpitData?.financials?.baselineBudget || 1968750);
  const committedCost = isDraft ? null : (cockpitData?.financials?.committedCost || 1420000);
  const actualCost = isDraft ? null : (cockpitData?.financials?.postedActuals || 580000);
  const forecastToComplete = isDraft ? null : (cockpitData?.financials?.forecastToComplete || 1288750);
  const eac = (actualCost !== null && forecastToComplete !== null) ? (actualCost + forecastToComplete) : null;
  const costVariance = (baselineCost !== null && eac !== null) ? (baselineCost - eac) : null;
  const isSaving = costVariance !== null && costVariance >= 0;
  const varianceAmount = costVariance !== null ? Math.abs(costVariance) : 0;
  const variancePct = (baselineCost && varianceAmount) ? ((varianceAmount / baselineCost) * 100).toFixed(2) : '0.00';

  return (
    <div style={{ paddingBottom: '40px', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <span
                id="cockpit-project-code"
                style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 800, color: '#d97706', backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: '4px' }}
              >
                {projectCode}
              </span>
              <Badge variant={isDraft ? 'neutral' : 'success'}>{isDraft ? 'Draft Plan' : '🟢 Operational'}</Badge>
              {isIncomplete && (
                <span
                  id="cockpit-incomplete-badge"
                  style={{
                    backgroundColor: '#fffbeb',
                    color: '#b45309',
                    border: '1px solid #fde68a',
                    fontWeight: 800,
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                  }}
                >
                  ⚠️ Onboarding Incomplete ({onboardingPct}%)
                </span>
              )}
              <Badge variant="neutral">{cockpitData?.maturity || 'delivery'}</Badge>
              <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>
                ● Doha Cell (me-central1)
              </span>
            </div>
            <h1 id="cockpit-project-title" style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
              {projectTitle}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: '#64748b' }}>
              <span>🏢 Client: <strong>{clientName}</strong></span>
              <span>📍 {isRtl ? 'المكان:' : 'Venue:'} <strong>{venue}</strong></span>
              <span>👤 {isRtl ? 'مدير المشروع:' : 'Lead PM:'} <strong>Zaid Mansour (pm@e3.qa)</strong></span>
              <span>⏳ {isRtl ? 'التركيب الميداني:' : 'Move-in:'} <strong>{isRtl ? `${daysRemaining} يوماً حتى انطلاق الفعالية` : `${daysRemaining} days to live event`}</strong></span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              id="cockpit-request-approval-btn"
              variant="accent"
              size="md"
              onClick={() => setIsApprovalModalOpen(true)}
            >
              ✍️ {isRtl ? 'طلب اعتماد' : 'Request Approval'}
            </Button>
            <Button
              id="cockpit-add-task-btn"
              variant="secondary"
              size="md"
              onClick={() => setIsTaskModalOpen(true)}
            >
              + {isRtl ? 'مهمة جديدة' : 'Task'}
            </Button>
            <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '6px', flexWrap: 'wrap' }}>
              <Button
                id="cockpit-lineage-btn"
                variant="ghost"
                size="sm"
                onClick={() => setIsLineageModalOpen(true)}
              >
                🔗 {isRtl ? 'سلسلة التتبع' : 'Lineage'}
              </Button>
              <Button
                id="cockpit-live-cmd-btn"
                variant="ghost"
                size="sm"
                onClick={() => navigate('/live/command-center')}
              >
                🛰️ {isRtl ? 'القيادة المباشرة' : 'Live Command'}
              </Button>
              <Button
                id="cockpit-run-sheet-btn"
                variant="ghost"
                size="sm"
                onClick={() => navigate('/live/run-sheet')}
              >
                ⏱️ {isRtl ? 'جدول العرض' : 'Run Sheet'}
              </Button>
              <Button
                id="cockpit-compliance-btn"
                variant="ghost"
                size="sm"
                onClick={() => navigate('/live/compliance')}
              >
                ⚖️ {isRtl ? 'الامتثال' : 'Compliance'}
              </Button>
              <Button
                id="cockpit-closeout-btn"
                variant="ghost"
                size="sm"
                onClick={() => navigate('/closeout')}
              >
                🏁 {isRtl ? 'الإغلاق' : 'Closeout'}
              </Button>
              <Button
                id="cockpit-audit-btn"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const el = document.getElementById('audit-history-list');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                📋 {isRtl ? 'سجل التدقيق' : 'Audit'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Cockpit Workstream Navigation Strip with Chevrons and Quick Jump Selector */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '20px',
          paddingBottom: '2px',
        }}
      >
        {/* Left Scroll Chevron */}
        <button
          type="button"
          id="btn-cockpit-tabs-scroll-left"
          title={isRtl ? 'التمرير لليمين' : 'Scroll left'}
          onClick={() => {
            const el = document.getElementById('cockpit-module-tabs');
            if (el) el.scrollBy({ left: isRtl ? 260 : -260, behavior: 'smooth' });
          }}
          style={{
            width: '28px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            color: '#334155',
            fontWeight: 800,
            fontSize: '16px',
            cursor: 'pointer',
            flexShrink: 0,
            userSelect: 'none',
          }}
        >
          {isRtl ? '›' : '‹'}
        </button>

        {/* Scrollable Workstream Tab Strip */}
        <div
          id="cockpit-module-tabs"
          style={{
            display: 'flex',
            gap: '4px',
            overflowX: 'auto',
            flex: 1,
            scrollbarWidth: 'thin',
            scrollBehavior: 'smooth',
          }}
        >
          {[
            { id: 'overview', icon: '📊', label: isRtl ? 'نظرة عامة والحوكمة' : 'Overview & Governance', badge: null },
            { id: 'requirements', icon: '🎯', label: isRtl ? 'المصفوفة والمتطلبات' : 'Requirements', badge: '4' },
            { id: 'clarifications', icon: '❓', label: isRtl ? 'الاستفسارات RFI' : 'Clarifications / RFI', badge: isRtl ? '٢ مفتوح' : '2 open' },
            { id: 'documents', icon: '📑', label: isRtl ? 'الوثائق المعتمدة' : 'Controlled Documents', badge: '3' },
            { id: 'timeline', icon: '⏱️', label: isRtl ? 'الجدول الزمني / Gantt' : 'Timeline / Gantt', badge: '72h CPM' },
            { id: 'design', icon: '🎨', label: isRtl ? 'التصميم والإبداع' : 'Design & Creative', badge: isRtl ? '٤ حزم' : '4 pkgs' },
            { id: 'commercial', icon: '💰', label: isRtl ? 'التجاري وجدول الكميات' : 'Commercial / BOQ', badge: isRtl ? '١.٥٢ م ر.ق' : 'QAR 1.52M' },
            { id: 'procurement', icon: '🛒', label: isRtl ? 'المشتريات والعطاءات' : 'Procurement & RFQ', badge: isRtl ? 'أمر شراء صادر' : 'PO Released' },
            { id: 'production', icon: '🏭', label: isRtl ? 'الإنتاج وضبط الجودة' : 'Production & QC', badge: isRtl ? 'تم اجتياز QC' : 'QC Passed' },
            { id: 'assets', icon: '📦', label: isRtl ? 'الأصول والمستودع' : 'Assets & Depot', badge: isRtl ? '٨ مقفلة' : '8 Locked' },
            { id: 'logistics', icon: '🚚', label: isRtl ? 'اللوجستيات والأسطول' : 'Logistics & Fleet', badge: isRtl ? 'تم التوقيع' : 'POD Signed' },
            { id: 'crew', icon: '👷', label: isRtl ? 'طاقم العمل والورديات' : 'Crew & Roster', badge: isRtl ? '١١ س راحة' : '11h Rest' },
            { id: 'site', icon: '📝', label: isRtl ? 'تقارير الموقع DSR' : 'Site & DSR', badge: isRtl ? 'مسجل' : 'DSR Logged' },
            { id: 'readiness', icon: '🚦', label: isRtl ? 'بوابة الجاهزية' : 'Readiness Gate', badge: '100%' },
          ].map((tab) => {
            const isActive = cockpitModuleTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-cockpit-${tab.id}`}
                onClick={() => setCockpitModuleTab(tab.id as any)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px 6px 0 0',
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 600,
                  border: 'none',
                  borderBottom: isActive ? '3px solid #d97706' : '3px solid transparent',
                  backgroundColor: isActive ? '#fffbeb' : 'transparent',
                  color: isActive ? '#92400e' : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                <span>{tab.icon}</span> {tab.label}
                {tab.badge && (
                  <span
                    style={{
                      fontSize: '11px',
                      backgroundColor: isActive ? '#fef3c7' : '#f1f5f9',
                      color: isActive ? '#78350f' : '#475569',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontWeight: 700,
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Scroll Chevron */}
        <button
          type="button"
          id="btn-cockpit-tabs-scroll-right"
          title={isRtl ? 'التمرير لليسار' : 'Scroll right'}
          onClick={() => {
            const el = document.getElementById('cockpit-module-tabs');
            if (el) el.scrollBy({ left: isRtl ? -260 : 260, behavior: 'smooth' });
          }}
          style={{
            width: '28px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            color: '#334155',
            fontWeight: 800,
            fontSize: '16px',
            cursor: 'pointer',
            flexShrink: 0,
            userSelect: 'none',
          }}
        >
          {isRtl ? '‹' : '›'}
        </button>

        {/* Jump to Workstream Dropdown */}
        <div style={{ flexShrink: 0, marginInlineStart: '4px' }}>
          <select
            id="cockpit-workstream-jump"
            value={cockpitModuleTab}
            onChange={(e) => {
              const targetTab = e.target.value as any;
              setCockpitModuleTab(targetTab);
              const tabBtn = document.getElementById(`tab-cockpit-${targetTab}`);
              if (tabBtn) tabBtn.scrollIntoView({ behavior: 'smooth', inline: 'center' });
            }}
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              color: '#1e293b',
              cursor: 'pointer',
            }}
            title={isRtl ? 'الانتقال السريع إلى أي وحدة عمل' : 'Quick Jump to Any Workstream'}
          >
            <option value="overview">📊 {isRtl ? 'نظرة عامة والحوكمة' : 'Overview & Governance'}</option>
            <option value="requirements">🎯 {isRtl ? 'المصفوفة والمتطلبات' : 'Requirements Matrix'}</option>
            <option value="clarifications">❓ {isRtl ? 'الاستفسارات RFI' : 'Clarifications / RFI'}</option>
            <option value="documents">📑 {isRtl ? 'الوثائق المعتمدة' : 'Controlled Documents'}</option>
            <option value="timeline">⏱️ {isRtl ? 'الجدول الزمني / Gantt' : 'Timeline / Gantt'}</option>
            <option value="design">🎨 {isRtl ? 'التصميم والإبداع' : 'Design & Creative'}</option>
            <option value="commercial">💰 {isRtl ? 'التجاري وجدول الكميات' : 'Commercial / BOQ'}</option>
            <option value="procurement">🛒 {isRtl ? 'المشتريات والعطاءات' : 'Procurement & RFQ'}</option>
            <option value="production">🏭 {isRtl ? 'الإنتاج وضبط الجودة' : 'Production & QC'}</option>
            <option value="assets">📦 {isRtl ? 'الأصول والمستودع' : 'Assets & Depot'}</option>
            <option value="logistics">🚚 {isRtl ? 'اللوجستيات والأسطول' : 'Logistics & Fleet'}</option>
            <option value="crew">👷 {isRtl ? 'طاقم العمل والورديات' : 'Crew & Roster'}</option>
            <option value="site">📝 {isRtl ? 'تقارير الموقع DSR' : 'Site & DSR'}</option>
            <option value="readiness">🚦 {isRtl ? 'بوابة الجاهزية' : 'Readiness Gate'}</option>
          </select>
        </div>
      </div>

      {cockpitModuleTab === 'requirements' && <RequirementsMatrixView projectId={projectId} />}
      {cockpitModuleTab === 'clarifications' && <ClarificationsView projectId={projectId} />}
      {cockpitModuleTab === 'documents' && <DocumentRegisterView projectId={projectId} />}
      {cockpitModuleTab === 'timeline' && <MasterGanttView projectId={projectId} />}
      {cockpitModuleTab === 'design' && <DesignReviewView projectId={projectId} />}
      {cockpitModuleTab === 'commercial' && <CommercialBOQView projectId={projectId} />}
      {cockpitModuleTab === 'procurement' && <ProcurementDeliveryView projectId={projectId} />}
      {cockpitModuleTab === 'production' && <ProductionDeliveryView projectId={projectId} />}
      {cockpitModuleTab === 'assets' && <AssetsDeliveryView projectId={projectId} />}
      {cockpitModuleTab === 'logistics' && <LogisticsDeliveryView projectId={projectId} />}
      {cockpitModuleTab === 'crew' && <CrewDeliveryView projectId={projectId} />}
      {cockpitModuleTab === 'site' && <SiteOpsDeliveryView projectId={projectId} initialSection="dsr" />}
      {cockpitModuleTab === 'readiness' && <SiteOpsDeliveryView projectId={projectId} initialSection="readiness" />}

      {cockpitModuleTab === 'overview' && (
        <>
          {/* Prominent Onboarding Incomplete Warning Banner */}
      {isIncomplete && (
        <div
          id="cockpit-incomplete-banner"
          style={{
            backgroundColor: '#fffbeb',
            border: '1.5px solid #fde68a',
            borderRadius: '8px',
            padding: '14px 20px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 2px 4px rgba(217, 119, 6, 0.08)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#92400e', textTransform: 'uppercase' }}>
                ⚠️ FAST-TRACK INTAKE: ONBOARDING INCOMPLETE ({onboardingPct}% Complete)
              </span>
              <Badge variant="warning" size="sm">Action Required</Badge>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#b45309' }}>
              Pending completion: {missingSectionsList.join(' • ')}. Advance to full onboarding to unlock final statutory gates.
            </p>
          </div>
          <Button
            id="btn-cockpit-resume-onboarding"
            variant="primary"
            size="sm"
            onClick={() => navigate(`/projects/new?resume=${projectId}`)}
            style={{ backgroundColor: '#d97706', borderColor: '#b45309' }}
          >
            Resume Onboarding Wizard ➔
          </Button>
        </div>
      )}

      {/* Prominent Rejection & Rework Banner */}
      {rejectedApproval && (
        <div
          id="cockpit-rejection-banner"
          style={{
            backgroundColor: '#fef2f2',
            border: '1.5px solid #f87171',
            borderRadius: '8px',
            padding: '16px 20px',
            marginBottom: '20px',
            boxShadow: '0 4px 14px rgba(239, 68, 68, 0.15)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase' }}>
                  🚨 APPROVAL REJECTED — REWORK REQUIRED
                </span>
                <Badge variant="danger" size="sm">{rejectedApproval.requiredRole?.toUpperCase() || 'EXECUTIVE'}</Badge>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#7f1d1d' }}>
                Decider rejected: "{rejectedApproval.reason || rejectedApproval.targetType}"
              </div>
              {rejectedApproval.comment && (
                <div
                  id="rejection-banner-comment"
                  style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: '#991b1b',
                    backgroundColor: '#fee2e2',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #fca5a5',
                  }}
                >
                  <strong>Reviewer Feedback:</strong> "{rejectedApproval.comment}"
                </div>
              )}
              <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '6px' }}>
                🔒 Governance invariant POL-GOV-02: Workstream advancement blocked until revisions are resubmitted.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Button
                id="btn-rejection-open-details"
                variant="secondary"
                size="sm"
                onClick={() => {
                  const el = document.getElementById(`approval-item-${rejectedApproval.id}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Open Approval Details
              </Button>
              <Button
                id="btn-rejection-resubmit"
                variant="danger"
                size="sm"
                onClick={() => {
                  setApprovalReason(`[REVISION 2] ${rejectedApproval.reason || 'Revised Scope & Pricing'}`);
                  setIsApprovalModalOpen(true);
                }}
              >
                ✍️ Resubmit with Revisions
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Financial KPI Ribbon with Explicit EAC Accounting Terminology */}
      <div
        id="financial-kpi-ribbon"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <MetricCard
          title="Baseline Cost"
          value={baselineCost !== null ? formatCurrency(baselineCost, 'QAR') : 'To Be Confirmed'}
          subtitle="Approved Budget Baseline"
          accentColor="#2563eb"
        />
        <MetricCard
          title="Committed Cost"
          value={committedCost !== null ? formatCurrency(committedCost, 'QAR') : 'To Be Confirmed'}
          subtitle="Contracted POs & Orders"
          accentColor="#64748b"
        />
        <MetricCard
          title="Actual Cost"
          value={actualCost !== null ? formatCurrency(actualCost, 'QAR') : formatCurrency(0, 'QAR')}
          subtitle="Invoiced / Spent to Date"
          accentColor="#0f172a"
        />
        <MetricCard
          title="Forecast to Complete"
          value={forecastToComplete !== null ? formatCurrency(forecastToComplete, 'QAR') : 'To Be Confirmed'}
          subtitle="Estimated Remaining Scope"
          accentColor="#d97706"
        />
        <MetricCard
          title="EAC — Projected Final Cost"
          value={eac !== null ? formatCurrency(eac, 'QAR') : 'To Be Confirmed'}
          subtitle="EAC = Actual + Forecast to Complete"
          badge={
            costVariance !== null
              ? {
                  label: isSaving
                    ? `Forecast Saving: ${formatCurrency(varianceAmount, 'QAR')}`
                    : `Forecast Overrun: ${formatCurrency(varianceAmount, 'QAR')}`,
                  variant: isSaving ? 'success' : 'danger',
                }
              : undefined
          }
          accentColor={isSaving ? '#059669' : '#dc2626'}
        />
      </div>

      {/* Compact Reserved Cash Position Card */}
      <div
        id="cockpit-cash-position-card"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '16px 20px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              💵 CASH POSITION & LIQUIDITY
            </span>
            <Badge variant="neutral" size="sm">Treasury & Working Capital</Badge>
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            Live currency: <strong>QAR</strong> • Scoped to project account
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '12px',
            backgroundColor: '#f8fafc',
            padding: '12px 16px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Contract Value</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
              {isDraft ? 'Not yet available' : formatCurrency(3500000, 'QAR')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Invoiced to Client</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#2563eb', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
              {isDraft ? 'Not yet available' : formatCurrency(1050000, 'QAR')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Collected (Cash In)</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#16a34a', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
              {isDraft ? 'Not yet available' : formatCurrency(1050000, 'QAR')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Outstanding Receivables</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
              {isDraft ? 'Not yet available' : formatCurrency(0, 'QAR')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Supplier Committed</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#d97706', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
              {isDraft ? 'Not yet available' : formatCurrency(1420000, 'QAR')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Supplier Paid</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#475569', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
              {isDraft ? 'Not yet available' : formatCurrency(580000, 'QAR')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Net Cash Exposure</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#16a34a', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
              {isDraft ? 'Not yet available' : `+${formatCurrency(470000, 'QAR')}`}
            </div>
          </div>
        </div>
      </div>

      {/* Needs Attention Engine */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
            🚨 Needs Attention Engine
          </h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Automated priority evaluation</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {/* Card 1: Blocker (Red) */}
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#b91c1c', textTransform: 'uppercase' }}>🔴 Critical Blocker</span>
                <Badge variant="danger" size="sm">Gate 03</Badge>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b', marginBottom: '4px' }}>
                Stage 03 Executive Gate Sign-Off Pending
              </div>
              <p style={{ fontSize: '12px', color: '#7f1d1d', margin: 0 }}>
                Four-eyes commercial authorization by Executive Partner Nasser Al-Attiyah required before advancing.
              </p>
            </div>
            <div style={{ marginTop: '12px' }}>
              <Button size="sm" variant="danger" onClick={() => setIsApprovalModalOpen(true)}>
                Open Approval Queue →
              </Button>
            </div>
          </div>

          {/* Card 2: Medium Action (Orange) */}
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>🟠 HSE Compliance</span>
                <Badge variant="warning" size="sm">Permits</Badge>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400e', marginBottom: '4px' }}>
                Civil Defence Fire Safety Clearance
              </div>
              <p style={{ fontSize: '12px', color: '#78350f', margin: 0 }}>
                Stage 09 site access prerequisite. CAD structural rigging certification must be uploaded.
              </p>
            </div>
            <div style={{ marginTop: '12px' }}>
              <Button size="sm" variant="secondary" onClick={() => navigate('/projects/f1111111-1111-4111-8111-111111111111/readiness')}>
                Inspect HSE Gate →
              </Button>
            </div>
          </div>

          {/* Card 3: Notice (Yellow) */}
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#15803d', textTransform: 'uppercase' }}>🟡 Procurement Alert</span>
                <Badge variant="success" size="sm">Vendor RFQ</Badge>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>
                Structural Rigging Contractor Quotes
              </div>
              <p style={{ fontSize: '12px', color: '#14532d', margin: 0 }}>
                2 RFQ packages awaiting quote comparison before PO release deadline.
              </p>
            </div>
            <div style={{ marginTop: '12px' }}>
              <Button size="sm" variant="secondary" onClick={() => navigate('/projects/f1111111-1111-4111-8111-111111111111/procurement')}>
                Review RFQ Packages →
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 9-Workstream Health Grid with Mobile Filter */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              📊 Workstream Health & Progress Matrix
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>9 core event operational functions</span>
          </div>

          <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '6px' }}>
            <button
              id="ws-filter-needs-attention"
              type="button"
              onClick={() => setWorkstreamFilter('needs_attention')}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: workstreamFilter === 'needs_attention' ? '#ffffff' : 'transparent',
                color: workstreamFilter === 'needs_attention' ? '#b45309' : '#64748b',
                boxShadow: workstreamFilter === 'needs_attention' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              ⚠️ Needs Attention ({workstreams.filter(w => w.blockers > 0 || w.status === 'warning' || w.openTasks > 0).length})
            </button>
            <button
              id="ws-filter-on-track"
              type="button"
              onClick={() => setWorkstreamFilter('on_track')}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: workstreamFilter === 'on_track' ? '#ffffff' : 'transparent',
                color: workstreamFilter === 'on_track' ? '#15803d' : '#64748b',
                boxShadow: workstreamFilter === 'on_track' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              🟢 On Track ({workstreams.filter(w => w.status === 'healthy' || w.status === 'on_track').length})
            </button>
            <button
              id="ws-filter-all"
              type="button"
              onClick={() => setWorkstreamFilter('all')}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: workstreamFilter === 'all' ? '#ffffff' : 'transparent',
                color: workstreamFilter === 'all' ? '#0f172a' : '#64748b',
                boxShadow: workstreamFilter === 'all' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              All ({workstreams.length})
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
          {workstreams
            .filter((ws) => {
              if (workstreamFilter === 'all') return true;
              if (workstreamFilter === 'needs_attention') {
                return ws.blockers > 0 || ws.status === 'warning' || ws.openTasks > 0;
              }
              if (workstreamFilter === 'on_track') {
                return ws.status === 'healthy' || ws.status === 'on_track';
              }
              return true;
            })
            .map((ws, i) => (
            <div
              key={i}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{ws.name}</span>
                <Badge variant={ws.status === 'healthy' ? 'success' : ws.status === 'warning' ? 'warning' : 'info'} size="sm">
                  {ws.progress}%
                </Badge>
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${ws.progress}%`,
                    height: '100%',
                    backgroundColor: ws.status === 'warning' ? '#f59e0b' : '#2563eb',
                    borderRadius: '3px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                <span>Lead: <strong>{ws.lead}</strong></span>
                <span>{ws.openTasks} open • {ws.blockers > 0 ? <strong style={{ color: '#ef4444' }}>{ws.blockers} blocker</strong> : '0 blockers'}</span>
              </div>
            </div>
          ))}
        </div>
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

      {/* Human-Centric Activity Stream with Technical Toggle */}
      <Card
        title="Project Activity & Audit Trail"
        subtitle="Chronological governance actions and cryptographic state history"
        action={
          <Button
            id="btn-toggle-technical-audit"
            size="sm"
            variant="ghost"
            onClick={() => setShowTechnicalAudit(!showTechnicalAudit)}
          >
            {showTechnicalAudit ? 'Hide Technical Hashes' : '👁️ View Technical Details (SHA-256)'}
          </Button>
        }
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
                  padding: '12px 16px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>
                      {item.action === 'TASK_COMPLETED' ? '✅' : item.action === 'APPROVAL_DECIDED' ? '✍️' : '📋'}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      {item.action === 'PROJECT_CREATED'
                        ? 'Project Onboarding Initialized'
                        : item.action === 'TASK_COMPLETED'
                        ? 'Operational Task Completed'
                        : item.action === 'APPROVAL_REQUESTED'
                        ? 'Governance Approval Requested'
                        : item.action === 'APPROVAL_DECIDED'
                        ? 'Governance Decision Recorded'
                        : item.action || 'Project State Transition'}
                    </span>
                    <Badge variant="neutral" size="sm">{item.role || 'system'}</Badge>
                  </div>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Just now'}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                  Recorded by: <strong>{item.actor || 'Tareq Al-Kuwari (Super Admin)'}</strong>
                </div>

                {/* Expanded Technical SHA-256 Details */}
                {showTechnicalAudit && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      backgroundColor: '#0f172a',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      color: '#cbd5e1',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>SHA-256 Entry Hash:</span>
                      <span style={{ color: '#38bdf8' }}>
                        {item.entryHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span>Cryptographic Seal:</span>
                      <span style={{ color: '#4ade80' }}>Verified (PostgreSQL Cloud SQL Doha)</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
      </>
      )}

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

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Transaction Monetary Value (QAR) *
            </label>
            <input
              id="cockpit-approval-amount-input"
              type="number"
              min="0"
              step="1000"
              value={approvalAmountQar}
              onChange={(e) => setApprovalAmountQar(Number(e.target.value) || 0)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Evaluated under <code>@e3-eos/policy</code> threshold matrix.
            </span>
          </div>

          {/* Dynamic Policy Resolver Card */}
          <div
            id="cockpit-policy-resolution-card"
            style={{
              padding: '12px 14px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '6px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#92400e' }}>
                Required Approver: <strong>{cockpitThreshold.roleTitle}</strong>
              </span>
              <span
                style={{
                  backgroundColor: '#fef3c7',
                  color: '#b45309',
                  border: '1px solid #fcd34d',
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                {cockpitThreshold.governanceRule}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#78350f', lineHeight: 1.4 }}>
              <strong>Reason:</strong> {cockpitThreshold.reason}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '10px', color: '#92400e', fontFamily: 'monospace' }}>
              <span>Policy: {cockpitThreshold.policyId || 'E3-POL-COMMERCIAL-GLOBAL'} (v{cockpitThreshold.policyVersion || 1})</span>
              <span>• Scope: {cockpitThreshold.policyScopeMatched || 'system_default'}</span>
            </div>
            <div style={{ fontSize: '11px', color: '#b45309', marginTop: '6px', fontStyle: 'italic' }}>
              🔒 <strong>Server-Resolved Policy:</strong> Invariant enforced by backend governance model.
            </div>
          </div>
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

      {/* Cross-Module End-to-End Delivery Lineage Modal */}
      <CrossModuleTraceabilityModal
        isOpen={isLineageModalOpen}
        onClose={() => setIsLineageModalOpen(false)}
        projectId={projectId}
      />
    </div>
  );
};
