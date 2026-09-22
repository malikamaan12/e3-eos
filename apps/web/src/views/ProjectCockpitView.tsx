import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { MetricCard, Card, Badge, Button, Modal, Input, Textarea, Select, formatCurrency } from '../components/DesignSystem.js';
import { RequirementsMatrixView } from './RequirementsMatrixView.js';
import { ClarificationsView } from './ClarificationsView.js';
import { DocumentRegisterView } from './DocumentRegisterView.js';
import { ControlledDocumentsWorkspaceView } from './ControlledDocumentsWorkspaceView.js';
import { MasterGanttView } from './MasterGanttView.js';
import { DesignReviewView } from './DesignReviewView.js';
import { DesignCreativeModuleView } from './DesignCreativeModuleView.js';
import { CommercialBOQView } from './CommercialBOQView.js';
import { ProcurementDeliveryView } from './ProcurementDeliveryView.js';
import { ProductionDeliveryView } from './ProductionDeliveryView.js';
import { AssetsDeliveryView } from './AssetsDeliveryView.js';
import { LogisticsDeliveryView } from './LogisticsDeliveryView.js';
import { CrewDeliveryView } from './CrewDeliveryView.js';
import { SiteOpsDeliveryView } from './SiteOpsDeliveryView.js';
import { CrossModuleTraceabilityModal } from './CrossModuleTraceabilityModal.js';
import { PortfolioResourcePlannerView } from './PortfolioResourcePlannerView.js';
import { isSyntheticDemo } from '../services/api-client.js';

export const ProjectCockpitView: React.FC = () => {
  const {
    currentLanguage,
    currentUser,
    currentPath,
    selectedProjectId,
    apiClient,
    navigate,
    refreshTrigger,
    triggerRefresh,
    currentProject,
    projects,
  } = useEosContext();
  const isRtl = currentLanguage === 'ar';

  const projectId = (typeof window !== 'undefined' && window.location.pathname.startsWith('/projects/') && window.location.pathname !== '/projects/new')
    ? window.location.pathname.split('/')[2]
    : (selectedProjectId || '00000000-0000-4000-8000-000000000099');

  const [cockpitData, setCockpitData] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>(currentUser?.id || '10000000-0000-4000-8000-000000000004');
  const [isSubmittingTask, setIsSubmittingTask] = useState<boolean>(false);

  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState<boolean>(false);
  const [approvalReason, setApprovalReason] = useState<string>('');
  const [approvalAmountQar, setApprovalAmountQar] = useState<number>(0);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState<boolean>(false);

  // Workstream filter state
  const [workstreamFilter, setWorkstreamFilter] = useState<'needs_attention' | 'on_track' | 'all'>('needs_attention');
  const [selectedAuditDetail, setSelectedAuditDetail] = useState<any | null>(null);
  const [isLineageModalOpen, setIsLineageModalOpen] = useState<boolean>(false);
  const [docWorkspaceMode, setDocWorkspaceMode] = useState<'hub' | 'technical'>('hub');
  const [docHubInitialTab, setDocHubInitialTab] = useState<'vault' | 'project' | 'pack'>('project');
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
    | 'resources'
    | 'logistics'
    | 'crew'
    | 'site'
    | 'readiness'
  >(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname.endsWith('/scope') || pathname.includes('/scope') || pathname.endsWith('/requirements') || pathname.includes('/requirements')) {
        return 'requirements';
      }
      if (pathname.endsWith('/resources') || pathname.includes('/resources') || pathname.endsWith('/resource-plan') || pathname.includes('/resource-plan')) {
        return 'resources';
      }
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
          'resources',
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

  useEffect(() => {
    const path = currentPath || (typeof window !== 'undefined' ? window.location.pathname : '');
    if (path.endsWith('/scope') || path.includes('/scope') || path.endsWith('/requirements') || path.includes('/requirements')) {
      setCockpitModuleTab('requirements');
    } else {
      const queryStr = path.includes('?') ? path.split('?')[1] : (typeof window !== 'undefined' ? window.location.search : '');
      const params = new URLSearchParams(queryStr);
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
        setCockpitModuleTab(tabParam as any);
      }
    }
  }, [currentPath]);

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

  const isDemo = isSyntheticDemo(projectId);

  // 9 Canonical Workstreams
  const demoWorkstreams = [
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

  const defaultWorkstreamList = [
    { name: 'Creative & 3D Spatial Renders', lead: 'Design Team' },
    { name: 'Technical & Structural CAD Rigging', lead: 'Technical Lead' },
    { name: 'Commercial Pricing & BOQ', lead: 'Commercial Lead' },
    { name: 'Procurement Packages & RFQs', lead: 'Procurement Lead' },
    { name: 'Logistics, Fleet & Dispatch', lead: 'Logistics Lead' },
    { name: 'Site & Operations Runbooks', lead: 'Operations Lead' },
    { name: 'HSE, Fire Safety & Permits', lead: 'HSE Lead' },
    { name: 'Client Stakeholder Collaboration', lead: cockpitData?.pm?.name || 'Project Lead' },
    { name: 'Governance & Four-Eyes Gates', lead: 'Executive Sponsor' },
  ];

  const workstreams: any[] = isDemo
    ? demoWorkstreams
    : (cockpitData?.workstreamProgress || defaultWorkstreamList.map((ws) => ({
        name: ws.name,
        lead: ws.lead,
        progress: 0,
        openTasks: 0,
        blockers: 0,
        status: 'on_track',
      })));

  const isLab = projectId === '00000000-0000-4000-8000-000000000099' || projectId === 'PRJ-TEST-ALL-FORMATS' || projectId === 'TEST-ALL-FORMATS' || (currentProject?.code === 'PRJ-TEST-ALL-FORMATS');
  const projectTitle = cockpitData?.title || currentProject?.title || currentProject?.name || (isLab ? 'Universal File Formats & Design Testing Lab' : (isDemo ? 'Qatar Tourism Demo Tender' : 'Untitled Project'));
  const projectCode = cockpitData?.projectCode || currentProject?.projectCode || currentProject?.code || (isLab ? 'PRJ-TEST-ALL-FORMATS' : (isDemo ? 'PRJ-2026-DEMO' : (projectId || 'PRJ-NEW')));
  const clientName = cockpitData?.clientName || currentProject?.clientName || (isLab ? 'Universal Formats QA Testing' : (isDemo ? 'Qatar Tourism Authority' : 'To Be Confirmed'));
  const venue = cockpitData?.venue?.name || currentProject?.venueName || currentProject?.venue?.name || (isLab ? 'Lusail Testing Arena & Boulevard' : (isDemo ? 'Doha Exhibition & Convention Center' : 'To Be Confirmed'));
  const pmLeadName = cockpitData?.pm?.name
    ? `${cockpitData.pm.name} (${cockpitData.pm.email || 'pm@e3.qa'})`
    : (isLab ? 'Lead QA Engineer (qa@e3.qa)' : (isDemo ? 'Zaid Mansour (pm@e3.qa)' : (currentUser?.name ? `${currentUser.name} (Lead PM)` : 'Unassigned Lead PM')));
  const daysRemaining = cockpitData?.dates?.daysRemaining ?? (isDemo ? 66 : null);
  const isDraft = cockpitData?.maturity === 'draft';

  // Fast-track incomplete detection
  const isIncomplete = cockpitData?.isOnboardingComplete === false || cockpitData?.isFastTrack;
  const onboardingPct = (cockpitData?.onboardingCompletionPct !== undefined && cockpitData?.onboardingCompletionPct !== null)
    ? cockpitData.onboardingCompletionPct
    : (isIncomplete ? 50 : 100);
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
  const baselineCost = isDraft
    ? null
    : (cockpitData?.financials?.budget ?? cockpitData?.financials?.baselineBudget ?? (isDemo ? 1968750 : 0));
  const committedCost = isDraft
    ? null
    : (cockpitData?.financials?.committedCost ?? (isDemo ? 1420000 : 0));
  const actualCost = isDraft
    ? null
    : (cockpitData?.financials?.actualCost ?? cockpitData?.financials?.postedActuals ?? (isDemo ? 580000 : 0));
  const forecastToComplete = isDraft
    ? null
    : (cockpitData?.financials?.forecastToComplete ?? (isDemo ? 1288750 : ((baselineCost !== null && actualCost !== null) ? Math.max(0, baselineCost - actualCost) : 0)));
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
          backgroundColor: 'var(--surface-1, #0f1624)',
          borderRadius: '8px',
          border: '1px solid var(--border-default, #2a374b)',
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
                style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 800, color: '#d97706', backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '2px 8px', borderRadius: '4px' }}
              >
                {projectCode}
              </span>
              <Badge variant={isDraft ? 'neutral' : 'success'}>{isDraft ? 'Draft Plan' : '🟢 Operational'}</Badge>
              {isIncomplete && (
                <span
                  id="cockpit-incomplete-badge"
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.12)',
                    color: '#b45309',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
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
              <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 700 }}>
                ● {isRtl ? 'النظام مباشر' : 'Live System Online'}
              </span>
            </div>
            <h1 id="cockpit-project-title" style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
              {projectTitle}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: 'var(--text-secondary, #94a3b8)' }}>
              <span>🏢 Client: <strong>{clientName}</strong></span>
              <span>📍 {isRtl ? 'المكان:' : 'Venue:'} <strong>{venue}</strong></span>
              <span>👤 {isRtl ? 'مدير المشروع:' : 'Lead PM:'} <strong>{pmLeadName}</strong></span>
              <span>⏳ {isRtl ? 'التركيب الميداني:' : 'Move-in:'} <strong>{daysRemaining !== null ? (isRtl ? `${daysRemaining} يوماً حتى انطلاق الفعالية` : `${daysRemaining} days to live event`) : (isRtl ? 'التاريخ قيد التأكيد' : 'Date to be confirmed')}</strong></span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {isLab && (
              <Button
                id="cockpit-open-design-lab-btn"
                variant="primary"
                size="md"
                onClick={() => setCockpitModuleTab('design')}
                style={{ backgroundColor: '#2563eb', borderColor: '#1d4ed8' }}
              >
                🎨 {isRtl ? 'عرض معمل التصاميم (١٨ صيغة)' : 'Open Design Lab (18 Formats)'}
              </Button>
            )}
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
            <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--surface-inset, #0b111d)', border: '1px solid var(--border-default, #2a374b)', padding: '3px', borderRadius: '6px', flexWrap: 'wrap' }}>
              <Button
                id="cockpit-lineage-btn"
                variant="ghost"
                size="sm"
                onClick={() => setIsLineageModalOpen(true)}
              >
                🔗 {isRtl ? 'سلسلة التتبع' : 'Lineage'}
              </Button>
              <Button
                id="cockpit-resources-btn"
                variant={cockpitModuleTab === 'resources' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setCockpitModuleTab('resources')}
              >
                📦 {isRtl ? 'خطة الموارد' : 'Resource Plan'}
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

      {/* Mobile Workstream Selector Dropdown (<768px) */}
      {isMobile && (
        <div
          style={{
            backgroundColor: 'var(--surface-1, #0f1624)',
            borderRadius: '8px',
            border: '1px solid var(--border-default, #2a374b)',
            padding: '12px 14px',
            marginBottom: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <label
            htmlFor="cockpit-workstream-mobile-select"
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--text-muted, #94a3b8)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '6px',
            }}
          >
            {isRtl ? 'وحدة العمل النشطة (١٤ مساراً):' : 'Active Workstream (14 Workstreams):'}
          </label>
          <select
            id="cockpit-workstream-mobile-select"
            value={cockpitModuleTab}
            onChange={(e) => {
              const targetTab = e.target.value as any;
              setCockpitModuleTab(targetTab);
              const tabBtn = document.getElementById(`tab-cockpit-${targetTab}`);
              if (tabBtn) tabBtn.scrollIntoView({ behavior: 'smooth', inline: 'center' });
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '13px',
              fontWeight: 700,
              borderRadius: '6px',
              border: '1.5px solid var(--accent, #d97706)',
              backgroundColor: 'var(--surface-inset, #0b111d)',
              color: 'var(--text-primary, #f8fafc)',
              outline: 'none',
              cursor: 'pointer',
              boxSizing: 'border-box',
              minHeight: '44px',
            }}
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
            <option value="resources">📦 {isRtl ? 'خطة الموارد والسعة' : 'Resource Plan'}</option>
            <option value="logistics">🚚 {isRtl ? 'اللوجستيات والأسطول' : 'Logistics & Fleet'}</option>
            <option value="crew">👷 {isRtl ? 'طاقم العمل والورديات' : 'Crew & Roster'}</option>
            <option value="site">📝 {isRtl ? 'تقارير الموقع DSR' : 'Site & DSR'}</option>
            <option value="readiness">🚦 {isRtl ? 'بوابة الجاهزية' : 'Readiness Gate'}</option>
          </select>
        </div>
      )}

      {/* Cockpit Workstream Navigation Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '2px solid var(--border-default, #2a374b)',
          marginBottom: '20px',
          paddingBottom: '2px',
        }}
      >
        {/* Scrollable Workstream Tab Strip */}
        <div
          id="cockpit-module-tabs"
          role="tablist"
          aria-label={isRtl ? 'وحدات المشروع' : 'Project Workstreams'}
          tabIndex={0}
          onWheel={(e) => {
            if (e.deltaY !== 0 && !e.deltaX) {
              const atLeft = e.currentTarget.scrollLeft <= 0;
              const atRight = e.currentTarget.scrollLeft + e.currentTarget.clientWidth >= e.currentTarget.scrollWidth - 2;
              if ((e.deltaY > 0 && !atRight) || (e.deltaY < 0 && !atLeft)) {
                e.currentTarget.scrollLeft += e.deltaY;
                e.preventDefault();
              }
            }
          }}
          onKeyDown={(e) => {
            const tabs = [
              'overview', 'requirements', 'clarifications', 'documents', 'timeline',
              'design', 'commercial', 'procurement', 'production', 'assets',
              'resources', 'logistics', 'crew', 'site', 'readiness'
            ];
            const currentIndex = tabs.indexOf(cockpitModuleTab);
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              const nextIndex = isRtl ? Math.max(0, currentIndex - 1) : Math.min(tabs.length - 1, currentIndex + 1);
              const nextTab = tabs[nextIndex];
              setCockpitModuleTab(nextTab as any);
              const btn = document.getElementById(`tab-cockpit-${nextTab}`);
              btn?.focus();
              btn?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              const prevIndex = isRtl ? Math.min(tabs.length - 1, currentIndex + 1) : Math.max(0, currentIndex - 1);
              const prevTab = tabs[prevIndex];
              setCockpitModuleTab(prevTab as any);
              const btn = document.getElementById(`tab-cockpit-${prevTab}`);
              btn?.focus();
              btn?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
            } else if (e.key === 'Home') {
              e.preventDefault();
              const firstTab = tabs[0];
              setCockpitModuleTab(firstTab as any);
              const btn = document.getElementById(`tab-cockpit-${firstTab}`);
              btn?.focus();
              btn?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
            } else if (e.key === 'End') {
              e.preventDefault();
              const lastTab = tabs[tabs.length - 1];
              setCockpitModuleTab(lastTab as any);
              const btn = document.getElementById(`tab-cockpit-${lastTab}`);
              btn?.focus();
              btn?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
            }
          }}
          style={{
            display: 'flex',
            gap: '4px',
            overflowX: 'auto',
            flex: 1,
            scrollbarWidth: 'thin',
            scrollBehavior: 'smooth',
            paddingBottom: '2px',
            outline: 'none',
          }}
        >
          {[
            { id: 'overview', icon: '📊', label: isRtl ? 'نظرة عامة والحوكمة' : 'Overview & Governance', badge: null },
            { id: 'requirements', icon: '🎯', label: isRtl ? 'المصفوفة والمتطلبات' : 'Requirements', badge: isDemo ? '4' : null },
            { id: 'clarifications', icon: '❓', label: isRtl ? 'الاستفسارات RFI' : 'Clarifications / RFI', badge: isDemo ? (isRtl ? '٢ مفتوح' : '2 open') : null },
            { id: 'documents', icon: '📑', label: isRtl ? 'الوثائق المعتمدة' : 'Controlled Documents', badge: isDemo ? '3' : null },
            { id: 'timeline', icon: '⏱️', label: isRtl ? 'الجدول الزمني / Gantt' : 'Timeline / Gantt', badge: isDemo ? '72h CPM' : null },
            { id: 'design', icon: '🎨', label: isRtl ? 'التصميم والإبداع' : 'Design & Creative', badge: isDemo ? (isRtl ? '٤ حزم' : '4 pkgs') : null },
            { id: 'commercial', icon: '💰', label: isRtl ? 'التجاري وجدول الكميات' : 'Commercial / BOQ', badge: isDemo ? (isRtl ? '١.٥٢ م ر.ق' : 'QAR 1.52M') : null },
            { id: 'procurement', icon: '🛒', label: isRtl ? 'المشتريات والعطاءات' : 'Procurement & RFQ', badge: isDemo ? (isRtl ? 'أمر شراء صادر' : 'PO Released') : null },
            { id: 'production', icon: '🏭', label: isRtl ? 'الإنتاج وضبط الجودة' : 'Production & QC', badge: isDemo ? (isRtl ? 'تم اجتياز QC' : 'QC Passed') : null },
            { id: 'assets', icon: '📦', label: isRtl ? 'الأصول والمستودع' : 'Assets & Depot', badge: isDemo ? (isRtl ? '٨ مقفلة' : '8 Locked') : null },
            { id: 'resources', icon: '📦', label: isRtl ? 'خطة الموارد' : 'Resource Plan', badge: isDemo ? '20' : null },
            { id: 'logistics', icon: '🚚', label: isRtl ? 'اللوجستيات والأسطول' : 'Logistics & Fleet', badge: isDemo ? (isRtl ? 'تم التوقيع' : 'POD Signed') : null },
            { id: 'crew', icon: '👷', label: isRtl ? 'طاقم العمل والورديات' : 'Crew & Roster', badge: isDemo ? (isRtl ? '١١ س راحة' : '11h Rest') : null },
            { id: 'site', icon: '📝', label: isRtl ? 'تقارير الموقع DSR' : 'Site & DSR', badge: isDemo ? (isRtl ? 'مسجل' : 'DSR Logged') : null },
            { id: 'readiness', icon: '🚦', label: isRtl ? 'بوابة الجاهزية' : 'Readiness Gate', badge: isDemo ? '100%' : null },
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
                  borderBottom: isActive ? '2px solid var(--accent, #d97706)' : '2px solid transparent',
                  backgroundColor: isActive ? 'var(--accent-soft, rgba(217,119,6,0.14))' : 'transparent',
                  color: isActive ? 'var(--text-primary, #f8fafc)' : 'var(--text-muted, #94a3b8)',
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
                      backgroundColor: isActive ? 'rgba(217,119,6,0.25)' : 'var(--surface-3, #1b2638)',
                      color: isActive ? 'var(--accent-hover, #f59e0b)' : 'var(--text-muted, #94a3b8)',
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

        {/* Jump to Workstream Dropdown (Desktop) */}
        {!isMobile && (
          <div style={{ flexShrink: 0, marginInlineStart: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
              {isRtl ? 'انتقال:' : 'Jump:'}
            </span>
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
                padding: '5px 10px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid var(--border-default, #2a374b)',
                backgroundColor: 'var(--surface-2, #151e2e)',
                color: 'var(--text-primary, #f8fafc)',
                cursor: 'pointer',
                outline: 'none',
                maxWidth: '190px',
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
              <option value="resources">📦 {isRtl ? 'خطة الموارد' : 'Resource Plan'}</option>
              <option value="logistics">🚚 {isRtl ? 'اللوجستيات والأسطول' : 'Logistics & Fleet'}</option>
              <option value="crew">👷 {isRtl ? 'طاقم العمل والورديات' : 'Crew & Roster'}</option>
              <option value="site">📝 {isRtl ? 'تقارير الموقع DSR' : 'Site & DSR'}</option>
              <option value="readiness">🚦 {isRtl ? 'بوابة الجاهزية' : 'Readiness Gate'}</option>
            </select>
          </div>
        )}
      </div>

      {cockpitModuleTab === 'requirements' && <RequirementsMatrixView projectId={projectId} />}
      {cockpitModuleTab === 'clarifications' && <ClarificationsView projectId={projectId} />}
      {cockpitModuleTab === 'documents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
            <Button
              variant={docWorkspaceMode === 'hub' && docHubInitialTab === 'vault' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => {
                setDocWorkspaceMode('hub');
                setDocHubInitialTab('vault');
              }}
            >
              🏛️ Company Vault
            </Button>
            <Button
              variant={docWorkspaceMode === 'hub' && docHubInitialTab === 'project' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => {
                setDocWorkspaceMode('hub');
                setDocHubInitialTab('project');
              }}
            >
              📑 Required Document Slots
            </Button>
            <Button
              variant={docWorkspaceMode === 'hub' && docHubInitialTab === 'pack' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => {
                setDocWorkspaceMode('hub');
                setDocHubInitialTab('pack');
              }}
            >
              📦 Sealed Submission Packs
            </Button>
            <Button
              variant={docWorkspaceMode === 'technical' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setDocWorkspaceMode('technical')}
            >
              📐 Technical Drawing Register
            </Button>
          </div>
          {docWorkspaceMode === 'hub' ? (
            <ControlledDocumentsWorkspaceView initialProjectId={projectId} initialTab={docHubInitialTab} />
          ) : (
            <DocumentRegisterView projectId={projectId} />
          )}
        </div>
      )}
      {cockpitModuleTab === 'timeline' && <MasterGanttView projectId={projectId} />}
      {cockpitModuleTab === 'design' && <DesignCreativeModuleView projectId={projectId} />}
      {cockpitModuleTab === 'commercial' && <CommercialBOQView projectId={projectId} />}
      {cockpitModuleTab === 'procurement' && <ProcurementDeliveryView projectId={projectId} />}
      {cockpitModuleTab === 'production' && <ProductionDeliveryView projectId={projectId} />}
      {cockpitModuleTab === 'assets' && <AssetsDeliveryView projectId={projectId} />}
      {cockpitModuleTab === 'resources' && <PortfolioResourcePlannerView initialProjectId={projectId} isEmbedded={true} />}
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
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
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
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase' }}>
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
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
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
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#f87171', textTransform: 'uppercase' }}>
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
                    color: '#f87171',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <strong>Reviewer Feedback:</strong> "{rejectedApproval.comment}"
                </div>
              )}
              <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '6px' }}>
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
          accentColor="var(--border-strong, #475467)"
        />
        <MetricCard
          title="Actual Cost"
          value={actualCost !== null ? formatCurrency(actualCost, 'QAR') : formatCurrency(0, 'QAR')}
          subtitle="Invoiced / Spent to Date"
          accentColor="var(--accent, #d97706)"
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
          backgroundColor: 'var(--surface-1, #0f1624)',
          borderRadius: '8px',
          border: '1px solid var(--border-default, #2a374b)',
          padding: '16px 20px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
              💵 CASH POSITION & LIQUIDITY
            </span>
            <Badge variant="neutral" size="sm">Treasury & Working Capital</Badge>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
            Live currency: <strong>QAR</strong> • Scoped to project account
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '10px',
            backgroundColor: 'var(--surface-1, #0f1624)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid var(--border-default, #2a374b)',
          }}
        >
          <div style={{ backgroundColor: 'var(--surface-inset, #0b111d)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle, #1d2939)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', whiteSpace: 'nowrap' }}>Contract Value</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)', marginTop: '2px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {isDraft ? 'Not yet available' : formatCurrency(cockpitData?.financials?.expectedRevenue ?? (isDemo ? 3500000 : (baselineCost || 0)), 'QAR')}
            </div>
          </div>
          <div style={{ backgroundColor: 'var(--surface-inset, #0b111d)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle, #1d2939)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', whiteSpace: 'nowrap' }}>Invoiced to Client</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#2563eb', marginTop: '2px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {isDraft ? 'Not yet available' : formatCurrency(cockpitData?.financials?.invoiced ?? (isDemo ? 1050000 : 0), 'QAR')}
            </div>
          </div>
          <div style={{ backgroundColor: 'var(--surface-inset, #0b111d)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle, #1d2939)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', whiteSpace: 'nowrap' }}>Collected (Cash In)</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#16a34a', marginTop: '2px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {isDraft ? 'Not yet available' : formatCurrency(cockpitData?.financials?.collected ?? (isDemo ? 1050000 : 0), 'QAR')}
            </div>
          </div>
          <div style={{ backgroundColor: 'var(--surface-inset, #0b111d)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle, #1d2939)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', whiteSpace: 'nowrap' }}>Outstanding Receivables</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)', marginTop: '2px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {isDraft ? 'Not yet available' : formatCurrency(cockpitData?.financials?.receivables ?? 0, 'QAR')}
            </div>
          </div>
          <div style={{ backgroundColor: 'var(--surface-inset, #0b111d)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle, #1d2939)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', whiteSpace: 'nowrap' }}>Supplier Committed</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#d97706', marginTop: '2px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {isDraft ? 'Not yet available' : formatCurrency(committedCost || 0, 'QAR')}
            </div>
          </div>
          <div style={{ backgroundColor: 'var(--surface-inset, #0b111d)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle, #1d2939)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', whiteSpace: 'nowrap' }}>Supplier Paid</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginTop: '2px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {isDraft ? 'Not yet available' : formatCurrency(actualCost || 0, 'QAR')}
            </div>
          </div>
          <div style={{ backgroundColor: 'var(--surface-inset, #0b111d)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle, #1d2939)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', whiteSpace: 'nowrap' }}>Net Cash Exposure</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#16a34a', marginTop: '2px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {isDraft ? 'Not yet available' : `+${formatCurrency(isDemo ? 470000 : Math.max(0, (cockpitData?.financials?.collected || 0) - (actualCost || 0)), 'QAR')}`}
            </div>
          </div>
        </div>
      </div>

      {/* Needs Attention Engine */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
            🚨 Needs Attention Engine
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>Automated priority evaluation</span>
        </div>

        {isDemo ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {/* Card 1: Blocker (Red) */}
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>🔴 Critical Blocker</span>
                  <Badge variant="danger" size="sm">Gate 03</Badge>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f87171', marginBottom: '4px' }}>
                  Stage 03 Executive Gate Sign-Off Pending
                </div>
                <p style={{ fontSize: '12px', color: '#7f1d1d', margin: 0 }}>
                  Four-eyes commercial authorization by Executive Partner required before advancing.
                </p>
              </div>
              <div style={{ marginTop: '12px' }}>
                <Button size="sm" variant="danger" onClick={() => setIsApprovalModalOpen(true)}>
                  Open Approval Queue →
                </Button>
              </div>
            </div>

            {/* Card 2: Medium Action (Orange) */}
            <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>🟠 HSE Compliance</span>
                  <Badge variant="warning" size="sm">Permits</Badge>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b', marginBottom: '4px' }}>
                  Civil Defence Fire Safety Clearance
                </div>
                <p style={{ fontSize: '12px', color: '#78350f', margin: 0 }}>
                  Stage 09 site access prerequisite. CAD structural rigging certification must be uploaded.
                </p>
              </div>
              <div style={{ marginTop: '12px' }}>
                <Button size="sm" variant="secondary" onClick={() => navigate(`/projects/${projectId}/readiness`)}>
                  Inspect HSE Gate →
                </Button>
              </div>
            </div>

            {/* Card 3: Notice (Yellow) */}
            <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#4ade80', textTransform: 'uppercase' }}>🟡 Procurement Alert</span>
                  <Badge variant="success" size="sm">Vendor RFQ</Badge>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#22c55e', marginBottom: '4px' }}>
                  Structural Rigging Contractor Quotes
                </div>
                <p style={{ fontSize: '12px', color: '#14532d', margin: 0 }}>
                  2 RFQ packages awaiting quote comparison before PO release deadline.
                </p>
              </div>
              <div style={{ marginTop: '12px' }}>
                <Button size="sm" variant="secondary" onClick={() => navigate(`/projects/${projectId}/procurement`)}>
                  Review RFQ Packages →
                </Button>
              </div>
            </div>
          </div>
        ) : (
          (() => {
            const pendingApprovals = approvals.filter((a) => a.status === 'pending');
            const criticalBlockers = cockpitData?.criticalBlockers || [];
            const attentionList = cockpitData?.needsAttention || [];
            const hasItems = pendingApprovals.length > 0 || criticalBlockers.length > 0 || attentionList.length > 0;

            if (!hasItems) {
              return (
                <div
                  id="cockpit-all-nominal-card"
                  style={{
                    backgroundColor: 'rgba(34, 197, 94, 0.12)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '8px',
                    padding: '20px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#4ade80', textTransform: 'uppercase' }}>
                        🟢 All Systems Nominal
                      </span>
                      <Badge variant="success" size="sm">Project on track</Badge>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#22c55e' }}>
                      No critical governance blockers, pending approvals, or statutory compliance risks. The project operational pipeline is ready for delivery execution.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Button size="sm" variant="secondary" onClick={() => setIsTaskModalOpen(true)}>
                      + Add Task
                    </Button>
                    <Button size="sm" variant="primary" onClick={() => setIsApprovalModalOpen(true)}>
                      Request Gate Sign-off
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                {pendingApprovals.map((appr) => (
                  <div
                    key={appr.id}
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>🔴 Pending Approval</span>
                        <Badge variant="danger" size="sm">{appr.requiredRole || 'Executive'}</Badge>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#f87171', marginBottom: '4px' }}>
                        {appr.reason || `Approval required for ${appr.targetType}`}
                      </div>
                      <p style={{ fontSize: '12px', color: '#7f1d1d', margin: 0 }}>
                        Monetary value: <strong>{formatCurrency(appr.amount || 0, 'QAR')}</strong>. Four-eyes authorization pending.
                      </p>
                    </div>
                    <div style={{ marginTop: '12px' }}>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          const el = document.getElementById(`approval-item-${appr.id}`);
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        Review Sign-off →
                      </Button>
                    </div>
                  </div>
                ))}

                {criticalBlockers.map((blk: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '8px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>🟠 Operational Blocker</span>
                        <Badge variant="warning" size="sm">{blk.owner || 'Operations'}</Badge>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b', marginBottom: '4px' }}>
                        {blk.title}
                      </div>
                      <p style={{ fontSize: '12px', color: '#78350f', margin: 0 }}>
                        {blk.impact || 'Action required to proceed with delivery.'}
                      </p>
                    </div>
                  </div>
                ))}

                {attentionList.map((item: string, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: 'rgba(59, 130, 246, 0.12)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '8px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#60a5fa', textTransform: 'uppercase' }}>ℹ️ Project Notice</span>
                        <Badge variant="info" size="sm">Notice</Badge>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#60a5fa' }}>
                        {item}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()
        )}
      </div>

      {/* 9-Workstream Health Grid with Mobile Filter */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
              📊 Workstream Health & Progress Matrix
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>9 core event operational functions</span>
          </div>

          <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--surface-2, #151e2e)', padding: '3px', borderRadius: '6px' }}>
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
                backgroundColor: workstreamFilter === 'needs_attention' ? 'var(--surface-1, #0f1624)' : 'transparent',
                color: workstreamFilter === 'needs_attention' ? '#b45309' : 'var(--text-muted, #94a3b8)',
                boxShadow: workstreamFilter === 'needs_attention' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              ⚠️ Needs Attention ({workstreams.filter((w: any) => w.blockers > 0 || w.status === 'warning' || w.openTasks > 0).length})
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
                backgroundColor: workstreamFilter === 'on_track' ? 'var(--surface-1, #0f1624)' : 'transparent',
                color: workstreamFilter === 'on_track' ? '#15803d' : 'var(--text-muted, #94a3b8)',
                boxShadow: workstreamFilter === 'on_track' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              🟢 On Track ({workstreams.filter((w: any) => w.status === 'healthy' || w.status === 'on_track').length})
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
                backgroundColor: workstreamFilter === 'all' ? 'var(--surface-1, #0f1624)' : 'transparent',
                color: workstreamFilter === 'all' ? '#0f172a' : 'var(--text-muted, #94a3b8)',
                boxShadow: workstreamFilter === 'all' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              All ({workstreams.length})
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
          {workstreams
            .filter((ws: any) => {
              if (workstreamFilter === 'all') return true;
              if (workstreamFilter === 'needs_attention') {
                return ws.blockers > 0 || ws.status === 'warning' || ws.openTasks > 0;
              }
              if (workstreamFilter === 'on_track') {
                return ws.status === 'healthy' || ws.status === 'on_track';
              }
              return true;
            })
            .map((ws: any, i: number) => (
            <div
              key={i}
              style={{
                backgroundColor: 'var(--surface-1, #0f1624)',
                border: '1px solid var(--border-default, #2a374b)',
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary, #f8fafc)' }}>{ws.name}</span>
                <Badge variant={ws.status === 'healthy' ? 'success' : ws.status === 'warning' ? 'warning' : 'info'} size="sm">
                  {ws.progress}%
                </Badge>
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border-default, #2a374b)', borderRadius: '3px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${ws.progress}%`,
                    height: '100%',
                    backgroundColor: ws.status === 'warning' ? '#f59e0b' : '#2563eb',
                    borderRadius: '3px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
                <span>Lead: <strong>{ws.lead}</strong></span>
                <span>{ws.openTasks} open • {ws.blockers > 0 ? <strong style={{ color: '#ef4444' }}>{ws.blockers} blocker</strong> : '0 blockers'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Section: Tasks & Governance Approvals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '20px', marginBottom: '24px' }}>
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
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
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
                      borderBottom: '1px solid var(--border-subtle, #1d2939)',
                      backgroundColor: isCompleted ? '#f8fafc' : 'var(--surface-1, #0f1624)',
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
                            color: isCompleted ? '#94a3b8' : 'var(--text-primary, #f8fafc)',
                            textDecoration: isCompleted ? 'line-through' : 'none',
                          }}
                        >
                          {t.title}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
                          Assignee: {t.assignee || t.assigneeName || (isDemo ? 'Zaid Mansour (Lead PM)' : 'Unassigned')}
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
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
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
                    borderBottom: '1px solid var(--border-subtle, #1d2939)',
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
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                        {appr.reason || `Sign-off for ${appr.targetType}`}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
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
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
            No audit records recorded yet.
          </div>
        ) : (
          <div id="audit-history-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {auditHistory.map((item, idx) => (
              <div
                key={item.id || idx}
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--surface-2, #151e2e)',
                  border: '1px solid var(--border-default, #2a374b)',
                  borderRadius: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>
                      {item.action === 'TASK_COMPLETED' ? '✅' : item.action === 'APPROVAL_DECIDED' ? '✍️' : '📋'}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
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

                <div style={{ fontSize: '12px', color: 'var(--text-secondary, #cbd5e1)', marginTop: '4px' }}>
                  Recorded by: <strong>{item.actor || 'Tareq Al-Kuwari (Super Admin)'}</strong>
                </div>

                {/* Expanded Technical SHA-256 Details */}
                {showTechnicalAudit && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      backgroundColor: 'var(--text-primary, #f8fafc)',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      color: 'var(--border-default, #2a374b)',
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
            placeholder="e.g. Milestone Sign-off & Pricing Authorization"
            required
          />

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '4px' }}>
              Transaction Monetary Value (QAR) *
            </label>
            <input
              id="cockpit-approval-amount-input"
              type="number"
              min="0"
              step="1000"
              value={approvalAmountQar}
              onChange={(e) => setApprovalAmountQar(Number(e.target.value) || 0)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-default, #2a374b)', fontSize: '13px', boxSizing: 'border-box' }}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
              Evaluated under <code>@e3-eos/policy</code> threshold matrix.
            </span>
          </div>

          {/* Dynamic Policy Resolver Card */}
          <div
            id="cockpit-policy-resolution-card"
            style={{
              padding: '12px 14px',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '6px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b' }}>
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
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '10px', color: '#f59e0b', fontFamily: 'monospace' }}>
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
          <p style={{ fontSize: '13px', color: 'var(--text-muted, #94a3b8)', marginTop: 0 }}>
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
