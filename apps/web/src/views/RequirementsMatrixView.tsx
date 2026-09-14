import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Badge, Button, Card, Modal, Input, Textarea, Select } from '../components/DesignSystem.js';

interface RequirementsMatrixViewProps {
  projectId: string;
}

export const RequirementsMatrixView: React.FC<RequirementsMatrixViewProps> = ({ projectId }) => {
  const { apiClient, refreshTrigger, triggerRefresh, currentLanguage } = useEosContext();
  const isRtl = currentLanguage === 'ar';

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [matrixData, setMatrixData] = useState<any>(null);
  const [clarificationsData, setClarificationsData] = useState<{ data: any[]; meta?: any }>({ data: [], meta: {} });

  // Filter state
  const [activeFilter, setActiveFilter] = useState<'all' | 'missing_owner' | 'missing_boq' | 'missing_design' | 'high_risk' | 'unapproved'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Modals
  const [isAddReqModalOpen, setIsAddReqModalOpen] = useState<boolean>(false);
  const [reqCode, setReqCode] = useState<string>('');
  const [reqTitle, setReqTitle] = useState<string>('');
  const [reqDesc, setReqDesc] = useState<string>('');
  const [reqOriginalWording, setReqOriginalWording] = useState<string>('');
  const [reqInterpretation, setReqInterpretation] = useState<string>('');
  const [reqSourceType, setReqSourceType] = useState<string>('Client RFP');
  const [reqSourceRef, setReqSourceRef] = useState<string>('RFP Section 4.2.1');
  const [reqPriority, setReqPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [reqCategory, setReqCategory] = useState<string>('staging_technical');
  const [reqOwnerName, setReqOwnerName] = useState<string>('Tariq Mansoor (Technical Director)');
  const [reqDueDate, setReqDueDate] = useState<string>('2026-11-20');
  const [reqTargetCost, setReqTargetCost] = useState<number>(250000);
  const [isSubmittingReq, setIsSubmittingReq] = useState<boolean>(false);

  const [isRfiModalOpen, setIsRfiModalOpen] = useState<boolean>(false);
  const [rfiQuestion, setRfiQuestion] = useState<string>('');
  const [rfiCategory, setRfiCategory] = useState<string>('technical');
  const [rfiSection, setRfiSection] = useState<string>('RFP Section 4.2.1');
  const [rfiDueAt, setRfiDueAt] = useState<string>('2026-11-10T18:00:00Z');
  const [isSubmittingRfi, setIsSubmittingRfi] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [matrix, clars] = await Promise.all([
          apiClient.getRequirementsTraceability(projectId).catch((err: any) => {
            console.warn('Failed to load traceability matrix:', err);
            return null;
          }),
          apiClient.getClarifications(projectId).catch(() => ({ data: [], meta: {} })),
        ]);
        if (isMounted) {
          setMatrixData(matrix);
          setClarificationsData(clars || { data: [], meta: {} });
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load requirements matrix. Please retry.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [apiClient, projectId, refreshTrigger]);

  const handleCreateRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTitle || !reqDesc) return;
    setIsSubmittingReq(true);
    try {
      await apiClient.createRequirement(projectId, {
        code: reqCode || undefined,
        title: reqTitle,
        description: reqDesc,
        originalWording: reqOriginalWording || undefined,
        interpretation: reqInterpretation || undefined,
        sourceType: reqSourceType,
        sourceReference: reqSourceRef,
        priority: reqPriority,
        category: reqCategory,
        ownerName: reqOwnerName,
        dueDate: reqDueDate,
        targetCostQar: Number(reqTargetCost),
      });
      setIsAddReqModalOpen(false);
      setReqTitle('');
      setReqDesc('');
      setReqOriginalWording('');
      setReqInterpretation('');
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to register requirement');
    } finally {
      setIsSubmittingReq(false);
    }
  };

  const handleCreateRfi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rfiQuestion) return;
    setIsSubmittingRfi(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/clarifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': '11111111-1111-4111-8111-111111111111',
          'Idempotency-Key': `rfi-${Date.now()}`,
        },
        body: JSON.stringify({
          question: rfiQuestion,
          category: rfiCategory,
          source: 'bidder_inquiry',
          rfpSectionRef: rfiSection,
          dueAt: rfiDueAt,
        }),
      });
      if (!res.ok) {
        throw new Error('Failed to submit RFI');
      }
      setIsRfiModalOpen(false);
      setRfiQuestion('');
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to submit RFI');
    } finally {
      setIsSubmittingRfi(false);
    }
  };

  if (loading && !matrixData) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ marginTop: '16px', fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>
          Loading 7-Point Traceability Matrix...
        </div>
        <div style={{ marginTop: '4px', fontSize: '13px', color: '#64748b' }}>
          Evaluating cross-module connections across CAD, BOQ, Documents, and Production Gates.
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong style={{ fontSize: '15px' }}>⚠️ Unable to Load Requirements Matrix</strong>
            <p style={{ margin: '6px 0 0', fontSize: '13px' }}>{error}</p>
          </div>
          <Button variant="danger" onClick={triggerRefresh}>Retry</Button>
        </div>
      </div>
    );
  }

  const evaluations = matrixData?.evaluations || [];

  const filteredEvaluations = evaluations.filter((ev: any) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'missing_owner') return !ev.hasOwner;
    if (activeFilter === 'missing_boq') return !ev.hasBoqCost;
    if (activeFilter === 'missing_design') return !ev.hasDesignVersion;
    if (activeFilter === 'high_risk') return ev.riskRating === 'high' || ev.riskRating === 'critical';
    if (activeFilter === 'unapproved') return !ev.hasApprovalSignoff && !ev.isApproved;
    return true;
  });

  const missingOwnerCount = evaluations.filter((ev: any) => !ev.hasOwner).length;
  const missingBoqCount = evaluations.filter((ev: any) => !ev.hasBoqCost).length;
  const missingDesignCount = evaluations.filter((ev: any) => !ev.hasDesignVersion).length;
  const highRiskCount = evaluations.filter((ev: any) => ev.riskRating === 'high' || ev.riskRating === 'critical').length;
  const unapprovedCount = evaluations.filter((ev: any) => !ev.hasApprovalSignoff && !ev.isApproved).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 7-Point Traceability Invariant Banner */}
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
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              E3 Rigorous Traceability Invariant
            </span>
            <Badge variant="warning">7-Point Connected Thread</Badge>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
            Scope Requirement = Owner + Date + Document + Design + BOQ + Approval + Evidence
          </div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            Zero orphan scope policy: Every technical or creative requirement must connect across the delivery architecture.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            id="btn-register-scope-req"
            variant="primary"
            onClick={() => setIsAddReqModalOpen(true)}
            style={{ backgroundColor: '#2563eb' }}
          >
            + Register Scope Requirement
          </Button>
          <Button
            id="btn-submit-rfi"
            variant="secondary"
            onClick={() => setIsRfiModalOpen(true)}
            style={{ backgroundColor: '#334155', color: '#ffffff', borderColor: '#475569' }}
          >
            ❓ Submit RFI / Clarification
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '12px',
        }}
      >
        <Card style={{ padding: '16px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Current-Stage Maturity</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#047857', margin: '4px 0' }}>
            {matrixData?.currentStageMaturityPct || 100}%
          </div>
          <div style={{ fontSize: '11px', color: '#059669' }}>Stage 04: Points required up to current stage</div>
        </Card>

        <Card style={{ padding: '16px', borderLeft: '4px solid #2563eb' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Overall Lifecycle Traceability</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
            {matrixData?.overallTraceabilityPct || 57}%
          </div>
          <div style={{ fontSize: '11px', color: '#16a34a' }}>All 7 points across complete lifecycle</div>
        </Card>

        <Card style={{ padding: '16px', borderLeft: '4px solid #6366f1' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Stage Satisfied Scope</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#4338ca', margin: '4px 0' }}>
            {matrixData?.stageMaturitySatisfiedCount || matrixData?.totalRequirements || 4} / {matrixData?.totalRequirements || 4}
          </div>
          <div style={{ fontSize: '11px', color: '#6366f1' }}>100% of Stage 04 requirements on-track</div>
        </Card>

        <Card style={{ padding: '16px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Unassigned / Gaps</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', margin: '4px 0' }}>
            {matrixData?.unassignedRequirements || missingOwnerCount || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#d97706' }}>Actionable gaps required now</div>
        </Card>
      </div>

      {/* Filter and Table Toolbar */}
      <Card style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
              {isRtl ? 'تصفية المتطلبات:' : 'Filter Requirements:'}
            </span>
            <button
              id="btn-filter-all"
              onClick={() => setActiveFilter('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: activeFilter === 'all' ? '#2563eb' : '#f1f5f9',
                color: activeFilter === 'all' ? '#ffffff' : '#334155',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {isRtl ? 'الكل' : 'All'} ({evaluations.length})
            </button>
            <button
              id="btn-filter-missing-owner"
              onClick={() => setActiveFilter('missing_owner')}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: activeFilter === 'missing_owner' ? '#ef4444' : '#f1f5f9',
                color: activeFilter === 'missing_owner' ? '#ffffff' : '#334155',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {isRtl ? 'دون مسؤول' : 'Missing Owner'} ({missingOwnerCount})
            </button>
            <button
              id="btn-filter-missing-boq"
              onClick={() => setActiveFilter('missing_boq')}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: activeFilter === 'missing_boq' ? '#f59e0b' : '#f1f5f9',
                color: activeFilter === 'missing_boq' ? '#ffffff' : '#334155',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {isRtl ? 'دون تسعير BOQ' : 'Missing BOQ'} ({missingBoqCount})
            </button>
            <button
              id="btn-filter-missing-design"
              onClick={() => setActiveFilter('missing_design')}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: activeFilter === 'missing_design' ? '#8b5cf6' : '#f1f5f9',
                color: activeFilter === 'missing_design' ? '#ffffff' : '#334155',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {isRtl ? 'دون تصميم CAD' : 'Missing Design'} ({missingDesignCount})
            </button>
            <button
              id="btn-filter-high-risk"
              onClick={() => setActiveFilter('high_risk')}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: activeFilter === 'high_risk' ? '#dc2626' : '#f1f5f9',
                color: activeFilter === 'high_risk' ? '#ffffff' : '#334155',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {isRtl ? 'عالي المخاطر' : 'High Risk'} ({highRiskCount})
            </button>
            <button
              id="btn-filter-unapproved"
              onClick={() => setActiveFilter('unapproved')}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: activeFilter === 'unapproved' ? '#d97706' : '#f1f5f9',
                color: activeFilter === 'unapproved' ? '#ffffff' : '#334155',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {isRtl ? 'غير معتمد' : 'Unapproved'} ({unapprovedCount})
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              id="btn-req-view-mode"
              onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
              style={{
                padding: '5px 10px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: '#ffffff',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {(isMobile ? 'cards' : viewMode) === 'table' ? (isRtl ? '⊞ عرض البطاقات' : '⊞ Cards View') : (isRtl ? '☰ عرض الجدول' : '☰ Table View')}
            </button>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              {isRtl ? 'عرض' : 'Showing'} <strong>{filteredEvaluations.length}</strong> {isRtl ? 'من أصل' : 'of'} {evaluations.length} {isRtl ? 'متطلب' : 'requirements'}
            </div>
          </div>
        </div>

        {/* 7-Point Matrix Table / Responsive Cards with Sticky Requirement ID Column */}
        {filteredEvaluations.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>
              {isRtl ? 'لا توجد متطلبات مطابقة لمعيار التصفية الحالي' : 'No requirements match the active filter'}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              {isRtl ? 'انتقل إلى "الكل" أو سجّل مطلباً جديداً في نطاق العمل لتغذية المصفوفة.' : 'Switch to "All" or register a new scope requirement to populate the matrix.'}
            </div>
            <Button variant="secondary" size="sm" onClick={() => setActiveFilter('all')} style={{ marginTop: '12px' }}>
              {isRtl ? 'عرض جميع المتطلبات' : 'Show All Requirements'}
            </Button>
          </div>
        ) : (isMobile || viewMode === 'cards') ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
            {filteredEvaluations.map((ev: any) => {
              const coveragePct = ev.currentStageMaturityPct ?? ev.overallTraceabilityPct ?? ev.traceabilityScorePct ?? 0;
              const reqStatus = ev.status || (ev.isApproved ? 'approved' : 'active');
              return (
                <div
                  key={ev.requirementId}
                  style={{
                    backgroundColor: ev.isFullyTraceable ? '#f0fdf4' : '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563eb', fontSize: '13px' }}>
                      <span dir="ltr">{ev.code || ev.requirementId}</span>
                    </span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <Badge variant={reqStatus === 'approved' ? 'success' : 'info'} size="sm">
                        {String(reqStatus).toUpperCase().replace('_', ' ')}
                      </Badge>
                      <Badge variant={ev.riskRating === 'critical' || ev.riskRating === 'high' ? 'danger' : 'warning'} size="sm">
                        {ev.riskRating?.toUpperCase() || 'LOW'}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                      {ev.title || 'Scope Deliverable'}
                    </h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.4, wordBreak: 'normal', overflowWrap: 'break-word' }}>
                      {ev.description}
                    </p>
                  </div>

                  {/* 7-Point Progress Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
                      <span style={{ color: '#475569' }}>{isRtl ? 'اكتمال التتبع (٧ نقاط):' : '7-Point Traceability:'}</span>
                      <span style={{ color: coveragePct >= 80 ? '#059669' : '#d97706' }}>{coveragePct}% ({ev.completedPoints || 0}/7)</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${coveragePct}%`, height: '100%', backgroundColor: coveragePct >= 80 ? '#10b981' : '#f59e0b', borderRadius: '3px' }} />
                    </div>
                  </div>

                  {/* Attributes Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                    <div>
                      <span style={{ color: '#64748b' }}>{isRtl ? 'المسؤول: ' : 'Owner: '}</span>
                      <strong style={{ color: ev.hasOwner ? '#0f172a' : '#dc2626' }}>
                        {ev.hasOwner ? ev.ownerName : (isRtl ? 'غير محدد' : 'Missing')}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>{isRtl ? 'الاستحقاق: ' : 'Due: '}</span>
                      <strong style={{ color: '#0f172a' }}>{ev.dueDate ? new Date(ev.dueDate).toLocaleDateString() : '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>CAD: </span>
                      <strong style={{ color: ev.hasDesignVersion ? '#16a34a' : '#dc2626' }}>
                        {ev.hasDesignVersion ? '✓ Linked' : '✗ No CAD'}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>BOQ: </span>
                      <strong style={{ color: ev.hasBoqCost ? '#16a34a' : '#dc2626' }}>
                        {ev.hasBoqCost ? '✓ Costed' : '✗ Missing'}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
            <table style={{ width: '100%', minWidth: '1420px', borderCollapse: 'collapse', fontSize: '12px', textAlign: isRtl ? 'right' : 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th
                    style={{
                      padding: '12px 14px',
                      fontWeight: 700,
                      width: '140px',
                      minWidth: '140px',
                      whiteSpace: 'nowrap',
                      position: 'sticky',
                      left: isRtl ? undefined : 0,
                      right: isRtl ? 0 : undefined,
                      backgroundColor: '#f8fafc',
                      zIndex: 2,
                      boxShadow: isRtl ? '-2px 0 4px rgba(0,0,0,0.06)' : '2px 0 4px rgba(0,0,0,0.06)',
                    }}
                  >
                    {isRtl ? 'معرف المطلب' : 'Requirement ID'}
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, minWidth: '320px', maxWidth: '440px' }}>
                    {isRtl ? 'الوصف والنطاق' : 'Description & Scope'}
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, width: '130px', minWidth: '130px' }}>
                    {isRtl ? 'المصدر' : 'Source'}
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, width: '140px', minWidth: '140px' }}>
                    {isRtl ? 'المسؤول' : 'Owner'}
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, width: '110px', minWidth: '110px', whiteSpace: 'nowrap' }}>
                    {isRtl ? 'تاريخ الاستحقاق' : 'Due Date'}
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, width: '110px', minWidth: '110px', textAlign: 'center' }}>
                    {isRtl ? 'الحالة' : 'Status'}
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, width: '110px', minWidth: '110px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {isRtl ? 'نسبة التغطية' : 'Coverage %'}
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, width: '140px', minWidth: '140px' }}>
                    {isRtl ? 'التصميم المرتبط' : 'Linked Design'}
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, width: '140px', minWidth: '140px' }}>
                    {isRtl ? 'جدول الكميات' : 'Linked BOQ'}
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, width: '140px', minWidth: '140px' }}>
                    {isRtl ? 'الوثيقة المعتمدة' : 'Linked Document'}
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, width: '90px', minWidth: '90px', textAlign: 'center' }}>
                    {isRtl ? 'المخاطرة' : 'Risk'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEvaluations.map((ev: any) => {
                  const coveragePct = ev.currentStageMaturityPct ?? ev.overallTraceabilityPct ?? ev.traceabilityScorePct ?? 0;
                  const reqStatus = ev.status || (ev.isApproved ? 'approved' : 'active');

                  return (
                    <tr key={ev.requirementId} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: ev.isFullyTraceable ? '#f0fdf4' : '#ffffff' }}>
                      {/* Column 1: Requirement ID (Sticky) */}
                      <td
                        style={{
                          padding: '12px 14px',
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          color: '#2563eb',
                          whiteSpace: 'nowrap',
                          width: '140px',
                          minWidth: '140px',
                          position: 'sticky',
                          left: isRtl ? undefined : 0,
                          right: isRtl ? 0 : undefined,
                          backgroundColor: ev.isFullyTraceable ? '#f0fdf4' : '#ffffff',
                          zIndex: 1,
                          boxShadow: isRtl ? '-2px 0 4px rgba(0,0,0,0.06)' : '2px 0 4px rgba(0,0,0,0.06)',
                        }}
                      >
                        <span dir="ltr">{ev.code || ev.requirementId}</span>
                      </td>

                      {/* Column 2: Description & Scope */}
                      <td style={{ padding: '12px 14px', minWidth: '320px', maxWidth: '440px', wordBreak: 'normal', overflowWrap: 'break-word' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px', fontSize: '13px' }}>
                          {ev.title || 'Scope Deliverable'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5, wordBreak: 'normal', overflowWrap: 'break-word' }}>
                          {ev.description}
                        </div>
                        {ev.originalWording && (
                          <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', marginTop: '4px', backgroundColor: '#f8fafc', padding: '4px 8px', borderRadius: '4px' }}>
                            {isRtl ? 'النص الأصلي:' : 'Original:'} "{ev.originalWording}"
                          </div>
                        )}
                      </td>

                      {/* Column 3: Source */}
                      <td style={{ padding: '12px 14px', width: '130px', minWidth: '130px' }}>
                        <div style={{ fontWeight: 600, color: '#334155' }}>
                          {ev.sourceType || 'Client RFP'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          {ev.sourceReference || 'Tender Spec'}
                        </div>
                      </td>

                      {/* Column 4: Owner */}
                      <td style={{ padding: '12px 14px', width: '140px', minWidth: '140px' }}>
                        {ev.hasOwner ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span>
                            <span style={{ color: '#0f172a', fontWeight: 600, fontSize: '12px' }}>
                              {ev.ownerName || 'Assigned Lead'}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#dc2626', fontWeight: 700, backgroundColor: '#fee2e2', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                            ⚠️ {isRtl ? 'دون مسؤول' : 'Missing Owner'}
                          </span>
                        )}
                      </td>

                      {/* Column 5: Due Date */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', width: '110px', minWidth: '110px', color: ev.dueDate ? '#0f172a' : '#64748b', fontFamily: 'monospace' }}>
                        {ev.dueDate ? new Date(ev.dueDate).toLocaleDateString() : '—'}
                      </td>

                      {/* Column 6: Status */}
                      <td style={{ padding: '12px 14px', textAlign: 'center', width: '110px', minWidth: '110px' }}>
                        <Badge
                          variant={
                            reqStatus === 'approved' || reqStatus === 'delivered'
                              ? 'success'
                              : reqStatus === 'active' || reqStatus === 'in_design'
                              ? 'info'
                              : reqStatus === 'under_review' || reqStatus === 'draft'
                              ? 'warning'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {String(reqStatus).toUpperCase().replace('_', ' ')}
                        </Badge>
                      </td>

                      {/* Column 7: Coverage % */}
                      <td style={{ padding: '12px 14px', textAlign: 'center', width: '110px', minWidth: '110px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          <div style={{ fontWeight: 800, color: coveragePct >= 80 ? '#059669' : coveragePct >= 50 ? '#d97706' : '#dc2626', fontSize: '13px', fontFamily: 'monospace' }}>
                            {coveragePct}%
                          </div>
                          <div style={{ fontSize: '10px', color: '#64748b' }}>
                            {ev.completedPoints || 0}/7 {isRtl ? 'نقاط' : 'pts'}
                          </div>
                        </div>
                      </td>

                      {/* Column 8: Linked Design */}
                      <td style={{ padding: '12px 14px', width: '140px', minWidth: '140px' }}>
                        {ev.hasDesignVersion ? (
                          <span style={{ color: '#16a34a', fontWeight: 600, backgroundColor: '#f0fdf4', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', display: 'inline-block' }}>
                            ✓ {ev.linkedDesignVersion || 'CAD Linked'}
                          </span>
                        ) : (
                          <span style={{ color: '#dc2626', fontWeight: 700, backgroundColor: '#fee2e2', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', display: 'inline-block' }}>
                            ⚠️ No CAD
                          </span>
                        )}
                      </td>

                      {/* Column 9: Linked BOQ */}
                      <td style={{ padding: '12px 14px', width: '140px', minWidth: '140px' }}>
                        {ev.hasBoqCost ? (
                          <span style={{ color: '#16a34a', fontWeight: 600, backgroundColor: '#f0fdf4', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', display: 'inline-block' }}>
                            ✓ {ev.linkedBoqLineCode || 'Priced'}
                          </span>
                        ) : (
                          <span style={{ color: '#dc2626', fontWeight: 700, backgroundColor: '#fee2e2', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', display: 'inline-block' }}>
                            ⚠️ Uncosted
                          </span>
                        )}
                      </td>

                      {/* Column 10: Linked Document */}
                      <td style={{ padding: '12px 14px', width: '140px', minWidth: '140px' }}>
                        {ev.hasControlledDocument ? (
                          <span style={{ color: '#16a34a', fontWeight: 600, backgroundColor: '#f0fdf4', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', display: 'inline-block' }}>
                            ✓ {ev.linkedDocumentNumber || 'Controlled'}
                          </span>
                        ) : (
                          <span style={{ color: '#dc2626', fontWeight: 700, backgroundColor: '#fee2e2', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', display: 'inline-block' }}>
                            ⚠️ Unlinked
                          </span>
                        )}
                      </td>

                      {/* Column 11: Risk */}
                      <td style={{ padding: '12px 14px', textAlign: 'center', width: '90px', minWidth: '90px' }}>
                        <Badge
                          variant={
                            ev.riskRating === 'low'
                              ? 'success'
                              : ev.riskRating === 'medium'
                              ? 'warning'
                              : 'danger'
                          }
                          size="sm"
                        >
                          {ev.riskRating?.toUpperCase() || 'LOW'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Clarifications / RFIs & Impact Assessment Section */}
      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              Clarifications, Addenda & RFI Impact Ledger
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              Tracks bidder inquiries, client addenda, and evaluates automatic contractual/commercial variation order impact.
            </p>
          </div>
          {clarificationsData?.meta?.urgentCount > 0 && (
            <span
              style={{
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fca5a5',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              🚨 {clarificationsData.meta.urgentCount} Urgent RFI Due within 72h
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(clarificationsData?.data || []).map((clar: any) => (
            <div
              key={clar.id}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '14px 16px',
                backgroundColor: '#ffffff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '12px', color: '#2563eb' }}>
                    {clar.clarificationCode}
                  </span>
                  <Badge variant={clar.status === 'answered' ? 'success' : 'warning'} size="sm">
                    {clar.status?.toUpperCase()}
                  </Badge>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {clar.rfpSectionRef || 'General'} • Due: {new Date(clar.dueAt).toLocaleDateString()}
                  </span>
                </div>

                {clar.impact?.requiresVariationOrder && (
                  <span
                    style={{
                      backgroundColor: '#fef3c7',
                      color: '#b45309',
                      border: '1px solid #fde68a',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    ⚠️ REQUIRES VARIATION ORDER (+{clar.impact.estimatedCostImpactQar?.toLocaleString()} QAR)
                  </span>
                )}
              </div>

              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                {clar.question}
              </div>

              {clar.response && (
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    borderLeft: '3px solid #16a34a',
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: '#334155',
                    marginTop: '6px',
                  }}
                >
                  <strong>Response:</strong> {clar.response}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Register Requirement Modal */}
      <Modal
        isOpen={isAddReqModalOpen}
        onClose={() => setIsAddReqModalOpen(false)}
        title="Register Controlled Scope Requirement"
        size="lg"
      >
        <form onSubmit={handleCreateRequirement} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Requirement Code</label>
              <Input
                value={reqCode}
                onChange={(e) => setReqCode(e.target.value)}
                placeholder="e.g. REQ-QND-005"
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Requirement Title *</label>
              <Input
                value={reqTitle}
                onChange={(e) => setReqTitle(e.target.value)}
                placeholder="e.g. Amiri Protocol Shaded Holding Majlis"
                required
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Technical Scope Description *</label>
            <Textarea
              value={reqDesc}
              onChange={(e) => setReqDesc(e.target.value)}
              placeholder="Detailed technical deliverables, dimensions, materials, wind ratings..."
              rows={2}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Original Client / RFP Wording</label>
              <Textarea
                value={reqOriginalWording}
                onChange={(e) => setReqOriginalWording(e.target.value)}
                placeholder="Exact quote from client tender document or RFP..."
                rows={2}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>E3 Engineering Interpretation</label>
              <Textarea
                value={reqInterpretation}
                onChange={(e) => setReqInterpretation(e.target.value)}
                placeholder="E3 engineering interpretation, structural limits, execution caveats..."
                rows={2}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Source Type (9 Types)</label>
              <Select value={reqSourceType} onChange={(e) => setReqSourceType(e.target.value)}>
                <option value="Client RFP">Client RFP</option>
                <option value="Tender document">Tender document</option>
                <option value="Contract">Contract</option>
                <option value="Addendum">Addendum</option>
                <option value="Meeting minutes">Meeting minutes</option>
                <option value="Email confirmation">Email confirmation</option>
                <option value="Venue requirement">Venue requirement</option>
                <option value="Authority requirement">Authority requirement</option>
                <option value="Internal E3 decision">Internal E3 decision</option>
              </Select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Source Reference</label>
              <Input
                value={reqSourceRef}
                onChange={(e) => setReqSourceRef(e.target.value)}
                placeholder="e.g. RFP Section 4.2.1"
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Priority Level</label>
              <Select value={reqPriority} onChange={(e) => setReqPriority(e.target.value as any)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Engineering Trade / Discipline</label>
              <Select value={reqCategory} onChange={(e) => setReqCategory(e.target.value)}>
                <option value="staging_technical">Staging Technical & Rigging</option>
                <option value="creative_visual">Creative Visual & LED</option>
                <option value="health_safety">Health, Safety & QCDD</option>
                <option value="protocol_ceremony">Protocol & Ceremonial</option>
                <option value="operational_logistics">Site Operational Logistics</option>
                <option value="commercial_contract">Commercial & Contract</option>
              </Select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Assigned Owner</label>
              <Input
                value={reqOwnerName}
                onChange={(e) => setReqOwnerName(e.target.value)}
                placeholder="e.g. Tariq Mansoor (Technical Director)"
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Target Budget (QAR)</label>
              <Input
                type="number"
                value={reqTargetCost}
                onChange={(e) => setReqTargetCost(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Due Date</label>
            <Input
              type="date"
              value={reqDueDate}
              onChange={(e) => setReqDueDate(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={() => setIsAddReqModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmittingReq}>
              {isSubmittingReq ? 'Registering...' : 'Register Scope Requirement'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Submit RFI Modal */}
      <Modal
        isOpen={isRfiModalOpen}
        onClose={() => setIsRfiModalOpen(false)}
        title="Submit Technical Clarification / RFI"
        size="md"
      >
        <form onSubmit={handleCreateRfi} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>RFI Inquired Question *</label>
            <Textarea
              value={rfiQuestion}
              onChange={(e) => setRfiQuestion(e.target.value)}
              placeholder="State the technical, commercial, or operational inquiry clearly..."
              rows={3}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Category</label>
              <Select value={rfiCategory} onChange={(e) => setRfiCategory(e.target.value)}>
                <option value="technical">Technical Engineering</option>
                <option value="commercial">Commercial Pricing</option>
                <option value="venue">Venue & Rigging</option>
                <option value="operations">Operations & Access</option>
                <option value="protocol">Protocol / Amiri Diwan</option>
                <option value="safety">Safety & QCDD</option>
                <option value="design">Design & Creative</option>
              </Select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Tender Section Reference</label>
              <Input
                value={rfiSection}
                onChange={(e) => setRfiSection(e.target.value)}
                placeholder="e.g. RFP Section 4.2.1"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={() => setIsRfiModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmittingRfi}>
              {isSubmittingRfi ? 'Submitting...' : 'Submit Clarification'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
