import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Badge, Button, Card, Modal, Input, Textarea, Select } from '../components/DesignSystem.js';
import { RequirementDetailDrawer } from './RequirementDetailDrawer.js';
import { BulkScopeEntryModal } from './BulkScopeEntryModal.js';
import { DocumentParsingModal } from './DocumentParsingModal.js';
import { ALL_LOCAL_TEAM_USERS } from '../context/canonical-users.js';

interface RequirementsMatrixViewProps {
  projectId: string;
}

type FilterKey =
  | 'all'
  | 'missing_owner'
  | 'missing_boq'
  | 'missing_design'
  | 'high_risk'
  | 'unapproved'
  | 'tender_ready'
  | 'design_ready'
  | 'commercial_ready'
  | 'production_ready'
  | 'closeout_ready';

export type GroupDimension =
  | 'none'
  | 'category'
  | 'locationZone'
  | 'department'
  | 'designStatus'
  | 'productionStatus'
  | 'stageReadiness'
  | 'ownerName';

export type PresetViewKey =
  | 'custom'
  | 'executive'
  | 'zones'
  | 'departments'
  | 'release_gate'
  | 'disciplines';

export const RequirementsMatrixView: React.FC<RequirementsMatrixViewProps> = ({ projectId }) => {
  const { apiClient, refreshTrigger, triggerRefresh, currentLanguage } = useEosContext();
  const isRtl = currentLanguage === 'ar';

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [matrixData, setMatrixData] = useState<any>(null);
  const [clarificationsData, setClarificationsData] = useState<{ data: any[]; meta?: any }>({ data: [], meta: {} });

  // Filter and view state
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 768);

  // Multi-dimensional Grouping & Presets
  const [groupBy, setGroupBy] = useState<GroupDimension>('none');
  const [thenBy, setThenBy] = useState<GroupDimension>('none');
  const [activePresetView, setActivePresetView] = useState<PresetViewKey>('custom');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Modals & Drawers
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);
  const [isParseModalOpen, setIsParseModalOpen] = useState<boolean>(false);
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState<boolean>(false);

  // Multi-selection & Bulk Toolbar
  const [selectedReqIds, setSelectedReqIds] = useState<string[]>([]);
  const [bulkOwnerName, setBulkOwnerName] = useState<string>('');
  const [bulkDueDate, setBulkDueDate] = useState<string>('');
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [isApplyingBulk, setIsApplyingBulk] = useState<boolean>(false);
  const [isExportingCsv, setIsExportingCsv] = useState<boolean>(false);

  // Quick Add State
  const [quickTitle, setQuickTitle] = useState<string>('');
  const [quickCategory, setQuickCategory] = useState<string>('staging_technical');
  const [quickOwnerName, setQuickOwnerName] = useState<string>('');
  const [quickDueDate, setQuickDueDate] = useState<string>('');
  const [quickPriority, setQuickPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [isSubmittingQuick, setIsSubmittingQuick] = useState<boolean>(false);

  // Detailed Modal State
  const [isAddReqModalOpen, setIsAddReqModalOpen] = useState<boolean>(false);
  const [reqCode, setReqCode] = useState<string>('');
  const [reqTitle, setReqTitle] = useState<string>('');
  const [reqDesc, setReqDesc] = useState<string>('');
  const [reqOriginalWording, setReqOriginalWording] = useState<string>('');
  const [reqInterpretation, setReqInterpretation] = useState<string>('');
  const [reqSourceType, setReqSourceType] = useState<string>('Client RFP');
  const [reqSourceRef, setReqSourceRef] = useState<string>('');
  const [reqPriority, setReqPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [reqCategory, setReqCategory] = useState<string>('staging_technical');
  const [reqOwnerName, setReqOwnerName] = useState<string>('');
  const [reqDueDate, setReqDueDate] = useState<string>('');
  const [reqTargetCost, setReqTargetCost] = useState<number>(0);
  const [isSubmittingReq, setIsSubmittingReq] = useState<boolean>(false);

  // RFI Modal State
  const [isRfiModalOpen, setIsRfiModalOpen] = useState<boolean>(false);
  const [rfiQuestion, setRfiQuestion] = useState<string>('');
  const [rfiCategory, setRfiCategory] = useState<string>('technical');
  const [rfiSection, setRfiSection] = useState<string>('');
  const [rfiDueAt, setRfiDueAt] = useState<string>('');
  const [isSubmittingRfi, setIsSubmittingRfi] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check URL query parameters on mount to auto-open bulk or parse modal
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      if (action === 'bulk') setIsBulkModalOpen(true);
      else if (action === 'parse') setIsParseModalOpen(true);
      else if (action === 'quick') setIsQuickAddModalOpen(true);
    }
  }, []);

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

  const handleQuickAddRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    setIsSubmittingQuick(true);
    try {
      const res = await apiClient.createRequirement(projectId, {
        title: quickTitle.trim(),
        category: quickCategory,
        ownerName: quickOwnerName || undefined,
        dueDate: quickDueDate || undefined,
        priority: quickPriority,
      });
      setQuickTitle('');
      setQuickOwnerName('');
      setQuickDueDate('');
      setIsQuickAddModalOpen(false);
      triggerRefresh();
      // If created with an id, open detail drawer for progressive enrichment
      if (res?.data?.id) {
        setSelectedReqId(res.data.id);
        setIsDrawerOpen(true);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to register quick scope requirement');
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  const handleCreateRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTitle.trim()) return;
    setIsSubmittingReq(true);
    try {
      await apiClient.createRequirement(projectId, {
        code: reqCode || undefined,
        title: reqTitle,
        description: reqDesc || undefined,
        originalWording: reqOriginalWording || undefined,
        interpretation: reqInterpretation || undefined,
        sourceType: reqSourceType,
        sourceReference: reqSourceRef || undefined,
        priority: reqPriority,
        category: reqCategory,
        ownerName: reqOwnerName || undefined,
        dueDate: reqDueDate || undefined,
        targetCostQar: reqTargetCost ? Number(reqTargetCost) : undefined,
      });
      setIsAddReqModalOpen(false);
      setReqTitle('');
      setReqDesc('');
      setReqOriginalWording('');
      setReqInterpretation('');
      setReqCode('');
      setReqSourceRef('');
      setReqOwnerName('');
      setReqDueDate('');
      setReqTargetCost(0);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to register requirement');
    } finally {
      setIsSubmittingReq(false);
    }
  };

  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    try {
      const csvData = await apiClient.exportRequirements(projectId, 'csv');
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `scope-requirements-${projectId}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to export requirements CSV');
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleBulkAssignOwner = async () => {
    if (!bulkOwnerName || selectedReqIds.length === 0) return;
    setIsApplyingBulk(true);
    try {
      await apiClient.bulkUpdateRequirements(projectId, {
        requirementIds: selectedReqIds,
        updates: { ownerName: bulkOwnerName },
      });
      setSelectedReqIds([]);
      setBulkOwnerName('');
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to bulk assign owner');
    } finally {
      setIsApplyingBulk(false);
    }
  };

  const handleBulkSetDueDate = async () => {
    if (!bulkDueDate || selectedReqIds.length === 0) return;
    setIsApplyingBulk(true);
    try {
      await apiClient.bulkUpdateRequirements(projectId, {
        requirementIds: selectedReqIds,
        updates: { dueDate: bulkDueDate },
      });
      setSelectedReqIds([]);
      setBulkDueDate('');
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to bulk update due date');
    } finally {
      setIsApplyingBulk(false);
    }
  };

  const handleBulkSetStatus = async () => {
    if (!bulkStatus || selectedReqIds.length === 0) return;
    setIsApplyingBulk(true);
    try {
      await apiClient.bulkUpdateRequirements(projectId, {
        requirementIds: selectedReqIds,
        updates: { status: bulkStatus as any },
      });
      setSelectedReqIds([]);
      setBulkStatus('');
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to bulk update status');
    } finally {
      setIsApplyingBulk(false);
    }
  };

  const handleBulkArchive = async () => {
    if (selectedReqIds.length === 0) return;
    if (!confirm(`Are you sure you want to archive ${selectedReqIds.length} selected requirement(s)?`)) return;
    setIsApplyingBulk(true);
    try {
      for (const id of selectedReqIds) {
        await apiClient.archiveRequirement(projectId, id);
      }
      setSelectedReqIds([]);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to archive requirements');
    } finally {
      setIsApplyingBulk(false);
    }
  };

  const toggleSelectReq = (id: string) => {
    setSelectedReqIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
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
      setRfiSection('');
      setRfiDueAt('');
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to submit RFI');
    } finally {
      setIsSubmittingRfi(false);
    }
  };

  const evaluations = matrixData?.evaluations || [];

  const filteredEvaluations = evaluations.filter((ev: any) => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchTitle = ev.title?.toLowerCase().includes(term);
      const matchCode = (ev.code || ev.requirementId)?.toLowerCase().includes(term);
      const matchOwner = ev.ownerName?.toLowerCase().includes(term);
      const matchCite = (ev.sourceReference || ev.sourceType)?.toLowerCase().includes(term);
      const matchDesc = ev.description?.toLowerCase().includes(term);
      if (!matchTitle && !matchCode && !matchOwner && !matchCite && !matchDesc) return false;
    }

    if (activeFilter === 'all') return true;
    if (activeFilter === 'missing_owner') return !ev.hasOwner;
    if (activeFilter === 'missing_boq') return !ev.hasBoqCost;
    if (activeFilter === 'missing_design') return !ev.hasDesignVersion;
    if (activeFilter === 'high_risk') return ev.riskRating === 'high' || ev.riskRating === 'critical';
    if (activeFilter === 'unapproved') return !ev.hasApprovalSignoff && !ev.isApproved;
    if (activeFilter === 'tender_ready') return ev.stageReadiness?.tenderDevelopment?.satisfied;
    if (activeFilter === 'design_ready') return ev.stageReadiness?.designDevelopment?.satisfied;
    if (activeFilter === 'commercial_ready') return ev.stageReadiness?.commercialAuthorization?.satisfied;
    if (activeFilter === 'production_ready') return ev.stageReadiness?.productionRelease?.satisfied;
    if (activeFilter === 'closeout_ready') return ev.stageReadiness?.closeout?.satisfied;
    return true;
  });

  const missingOwnerCount = evaluations.filter((ev: any) => !ev.hasOwner).length;
  const missingBoqCount = evaluations.filter((ev: any) => !ev.hasBoqCost).length;
  const missingDesignCount = evaluations.filter((ev: any) => !ev.hasDesignVersion).length;
  const highRiskCount = evaluations.filter((ev: any) => ev.riskRating === 'high' || ev.riskRating === 'critical').length;
  const unapprovedCount = evaluations.filter((ev: any) => !ev.hasApprovalSignoff && !ev.isApproved).length;
  const tenderReadyCount = evaluations.filter((ev: any) => ev.stageReadiness?.tenderDevelopment?.satisfied).length;
  const designReadyCount = evaluations.filter((ev: any) => ev.stageReadiness?.designDevelopment?.satisfied).length;
  const commercialReadyCount = evaluations.filter((ev: any) => ev.stageReadiness?.commercialAuthorization?.satisfied).length;
  const productionReadyCount = evaluations.filter((ev: any) => ev.stageReadiness?.productionRelease?.satisfied).length;
  const closeoutReadyCount = evaluations.filter((ev: any) => ev.stageReadiness?.closeout?.satisfied).length;

  const handlePresetSelect = (preset: PresetViewKey) => {
    setActivePresetView(preset);
    switch (preset) {
      case 'executive':
        setGroupBy('stageReadiness');
        setThenBy('category');
        break;
      case 'zones':
        setGroupBy('locationZone');
        setThenBy('category');
        break;
      case 'departments':
        setGroupBy('department');
        setThenBy('productionStatus');
        break;
      case 'release_gate':
        setGroupBy('designStatus');
        setThenBy('category');
        break;
      case 'disciplines':
        setGroupBy('category');
        setThenBy('ownerName');
        break;
      case 'custom':
      default:
        break;
    }
  };

  const getDimensionValue = (ev: any, dim: GroupDimension): string => {
    switch (dim) {
      case 'category':
        return ev.category ? String(ev.category).toUpperCase() : 'UNCATEGORIZED';
      case 'locationZone':
        return ev.locationZone || 'Unassigned Zone';
      case 'department':
        return ev.department ? String(ev.department).replace('_', ' ').toUpperCase() : 'NO DEPARTMENT';
      case 'ownerName':
        return ev.ownerName || 'Unassigned Lead';
      case 'designStatus':
        return ev.designStatus ? String(ev.designStatus).replace('_', ' ').toUpperCase() : 'PENDING';
      case 'productionStatus':
        return ev.productionStatus ? String(ev.productionStatus).replace('_', ' ').toUpperCase() : 'NOT STARTED';
      case 'stageReadiness': {
        if (ev.stageReadiness?.closeout?.satisfied) return 'STAGE 5: CLOSEOUT READY';
        if (ev.stageReadiness?.productionRelease?.satisfied) return 'STAGE 4: PRODUCTION READY';
        if (ev.stageReadiness?.commercialAuthorization?.satisfied) return 'STAGE 3: COMMERCIAL READY';
        if (ev.stageReadiness?.designDevelopment?.satisfied) return 'STAGE 2: DESIGN READY';
        if (ev.stageReadiness?.tenderDevelopment?.satisfied) return 'STAGE 1: TENDER READY';
        return 'STAGE 0: DRAFT / INCOMPLETE';
      }
      default:
        return 'All';
    }
  };

  const calculateRollup = (items: any[]) => {
    return items.reduce(
      (acc, item) => ({
        totalQty: acc.totalQty + (Number(item.quantity) || 1),
        allocatedQty: acc.allocatedQty + (Number(item.allocatedQuantity) || 0),
        designApprovedQty: acc.designApprovedQty + (Number(item.designApprovedQuantity) || 0),
        releasedQty: acc.releasedQty + (Number(item.releasedQuantity) || 0),
        producedQty: acc.producedQty + (Number(item.producedQuantity) || 0),
        deliveredQty: acc.deliveredQty + (Number(item.deliveredQuantity) || 0),
        installedQty: acc.installedQty + (Number(item.installedQuantity) || 0),
        acceptedQty: acc.acceptedQty + (Number(item.acceptedQuantity) || 0),
      }),
      {
        totalQty: 0,
        allocatedQty: 0,
        designApprovedQty: 0,
        releasedQty: 0,
        producedQty: 0,
        deliveredQty: 0,
        installedQty: 0,
        acceptedQty: 0,
      }
    );
  };

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const groupedSections = React.useMemo(() => {
    if (groupBy === 'none') {
      return [
        {
          key: 'all',
          label: 'All Requirements',
          dimension: 'none' as GroupDimension,
          items: filteredEvaluations,
          rollup: calculateRollup(filteredEvaluations),
          subGroups: undefined,
        },
      ];
    }

    const groupsMap = new Map<string, any[]>();
    for (const item of filteredEvaluations) {
      const key = getDimensionValue(item, groupBy);
      if (!groupsMap.has(key)) {
        groupsMap.set(key, []);
      }
      groupsMap.get(key)!.push(item);
    }

    const sections: {
      key: string;
      label: string;
      dimension: GroupDimension;
      items: any[];
      rollup: ReturnType<typeof calculateRollup>;
      subGroups?: {
        key: string;
        label: string;
        dimension: GroupDimension;
        items: any[];
        rollup: ReturnType<typeof calculateRollup>;
      }[];
    }[] = [];

    for (const [key, items] of groupsMap.entries()) {
      const rollup = calculateRollup(items);
      let subGroups: any[] | undefined = undefined;

      if (thenBy !== 'none' && thenBy !== groupBy) {
        const subMap = new Map<string, any[]>();
        for (const it of items) {
          const subKey = getDimensionValue(it, thenBy);
          if (!subMap.has(subKey)) {
            subMap.set(subKey, []);
          }
          subMap.get(subKey)!.push(it);
        }
        subGroups = [];
        for (const [subKey, subItems] of subMap.entries()) {
          subGroups.push({
            key: `${key}__${subKey}`,
            label: subKey,
            dimension: thenBy,
            items: subItems,
            rollup: calculateRollup(subItems),
          });
        }
      }

      sections.push({
        key,
        label: key,
        dimension: groupBy,
        items,
        rollup,
        subGroups,
      });
    }

    return sections;
  }, [filteredEvaluations, groupBy, thenBy]);

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
            Zero orphan scope policy: Progressive intake with baseline revision governance.
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            id="btn-quick-add-req"
            variant="primary"
            onClick={() => setIsQuickAddModalOpen(true)}
            style={{ backgroundColor: '#10b981', borderColor: '#059669' }}
          >
            ⚡ {isRtl ? 'إضافة سريعة' : '+ Quick Add'}
          </Button>
          <Button
            id="btn-register-scope-req"
            variant="primary"
            onClick={() => setIsAddReqModalOpen(true)}
            style={{ backgroundColor: '#2563eb' }}
          >
            + {isRtl ? 'تسجيل مفصل' : 'Detailed Requirement'}
          </Button>
          <Button
            id="btn-bulk-scope-entry"
            variant="secondary"
            onClick={() => setIsBulkModalOpen(true)}
            style={{ backgroundColor: '#475569', color: '#ffffff', borderColor: '#334155' }}
          >
            📋 {isRtl ? 'لصق مجمع' : 'Bulk Entry / Paste'}
          </Button>
          <Button
            id="btn-parse-document"
            variant="secondary"
            onClick={() => setIsParseModalOpen(true)}
            style={{ backgroundColor: '#6366f1', color: '#ffffff', borderColor: '#4f46e5' }}
          >
            📄 {isRtl ? 'استخراج من الكراسة' : 'Parse RFP / Tender'}
          </Button>
          <Button
            id="btn-export-csv"
            variant="secondary"
            onClick={handleExportCsv}
            disabled={isExportingCsv}
            style={{ backgroundColor: '#0f766e', color: '#ffffff', borderColor: '#115e59' }}
          >
            💾 {isExportingCsv ? (isRtl ? 'جاري التصدير...' : 'Exporting...') : (isRtl ? 'تصدير CSV' : 'Export CSV')}
          </Button>
          <Button
            id="btn-submit-rfi"
            variant="secondary"
            onClick={() => setIsRfiModalOpen(true)}
            style={{ backgroundColor: '#334155', color: '#ffffff', borderColor: '#475569' }}
          >
            ❓ {isRtl ? 'استفسار RFI' : 'Submit RFI'}
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
            {matrixData?.stageMaturitySatisfiedCount || matrixData?.totalRequirements || evaluations.length} / {matrixData?.totalRequirements || evaluations.length}
          </div>
          <div style={{ fontSize: '11px', color: '#6366f1' }}>Stage on-track deliverables</div>
        </Card>

        <Card style={{ padding: '16px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Unassigned / Gaps</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', margin: '4px 0' }}>
            {matrixData?.unassignedRequirements ?? missingOwnerCount}
          </div>
          <div style={{ fontSize: '11px', color: '#d97706' }}>Actionable gaps required now</div>
        </Card>
      </div>

      {/* Filter and Table Toolbar */}
      <Card style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          {/* Search Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 280px', maxWidth: '380px' }}>
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isRtl ? 'بحث في المتطلبات بالرمز، العنوان، المالك...' : 'Search by code, title, owner, citation...'}
              style={{ fontSize: '12px', padding: '6px 12px' }}
            />
            {searchTerm && (
              <Button size="sm" variant="outline" onClick={() => setSearchTerm('')}>✕</Button>
            )}
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

        {/* Saved View Presets & Multi-Dimensional Grouping Control Bar */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: '14px',
            padding: '10px 14px',
            backgroundColor: '#f8fafc',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>
              👁️ {isRtl ? 'طريقة العرض المسبقة:' : 'Saved View Preset:'}
            </span>
            <select
              id="select-view-preset"
              value={activePresetView}
              onChange={(e) => handlePresetSelect(e.target.value as PresetViewKey)}
              style={{
                fontSize: '12px',
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontWeight: 600,
                color: '#0f172a',
                cursor: 'pointer',
              }}
            >
              <option value="custom">Standard / Custom</option>
              <option value="executive">📊 Executive Overview (Stage Readiness)</option>
              <option value="zones">📍 Zone & Location Deployment</option>
              <option value="departments">🏭 Department Fulfilment & Production</option>
              <option value="release_gate">🚪 Design-to-Production Release Gate</option>
              <option value="disciplines">🏷️ Discipline & Deliverables</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
              {isRtl ? 'تجميع حسب:' : 'Group By:'}
            </span>
            <select
              id="select-group-by"
              value={groupBy}
              onChange={(e) => {
                setGroupBy(e.target.value as GroupDimension);
                setActivePresetView('custom');
              }}
              style={{
                fontSize: '12px',
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <option value="none">None (Flat Matrix)</option>
              <option value="category">Category / Discipline</option>
              <option value="locationZone">Zone & Location</option>
              <option value="department">Department</option>
              <option value="designStatus">Design Status</option>
              <option value="productionStatus">Production Status</option>
              <option value="stageReadiness">Stage Gate Readiness</option>
              <option value="ownerName">Assigned Lead / Owner</option>
            </select>
          </div>

          {groupBy !== 'none' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                {isRtl ? 'ثم حسب:' : 'Then By:'}
              </span>
              <select
                id="select-then-by"
                value={thenBy}
                onChange={(e) => {
                  setThenBy(e.target.value as GroupDimension);
                  setActivePresetView('custom');
                }}
                style={{
                  fontSize: '12px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <option value="none">None</option>
                <option value="category">Category / Discipline</option>
                <option value="locationZone">Zone & Location</option>
                <option value="department">Department</option>
                <option value="designStatus">Design Status</option>
                <option value="productionStatus">Production Status</option>
                <option value="stageReadiness">Stage Gate Readiness</option>
                <option value="ownerName">Assigned Lead / Owner</option>
              </select>
            </div>
          )}

          {groupBy !== 'none' && (
            <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
              <button
                type="button"
                onClick={() => setCollapsedGroups({})}
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={() => {
                  const allCollapsed: Record<string, boolean> = {};
                  groupedSections.forEach((s) => {
                    allCollapsed[s.key] = true;
                    s.subGroups?.forEach((sub) => {
                      allCollapsed[sub.key] = true;
                    });
                  });
                  setCollapsedGroups(allCollapsed);
                }}
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                Collapse All
              </button>
            </div>
          )}
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginRight: '4px' }}>
            {isRtl ? 'تصفية المتطلبات:' : 'Filters:'}
          </span>
          <button
            id="btn-filter-all"
            onClick={() => setActiveFilter('all')}
            style={{
              padding: '5px 10px',
              borderRadius: '4px',
              fontSize: '11px',
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
              padding: '5px 10px',
              borderRadius: '4px',
              fontSize: '11px',
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
              padding: '5px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: activeFilter === 'missing_boq' ? '#f59e0b' : '#f1f5f9',
              color: activeFilter === 'missing_boq' ? '#ffffff' : '#334155',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {isRtl ? 'دون تسعير' : 'Missing BOQ'} ({missingBoqCount})
          </button>
          <button
            id="btn-filter-missing-design"
            onClick={() => setActiveFilter('missing_design')}
            style={{
              padding: '5px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: activeFilter === 'missing_design' ? '#8b5cf6' : '#f1f5f9',
              color: activeFilter === 'missing_design' ? '#ffffff' : '#334155',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {isRtl ? 'دون CAD' : 'Missing Design'} ({missingDesignCount})
          </button>
          <button
            id="btn-filter-high-risk"
            onClick={() => setActiveFilter('high_risk')}
            style={{
              padding: '5px 10px',
              borderRadius: '4px',
              fontSize: '11px',
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
              padding: '5px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: activeFilter === 'unapproved' ? '#d97706' : '#f1f5f9',
              color: activeFilter === 'unapproved' ? '#ffffff' : '#334155',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {isRtl ? 'غير معتمد' : 'Unapproved'} ({unapprovedCount})
          </button>

          {/* Stage-Gate Readiness Pills */}
          <span style={{ fontSize: '11px', color: '#94a3b8', margin: '0 4px' }}>|</span>
          <button
            id="btn-filter-tender-ready"
            onClick={() => setActiveFilter('tender_ready')}
            style={{
              padding: '5px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: activeFilter === 'tender_ready' ? '#0284c7' : '#f8fafc',
              color: activeFilter === 'tender_ready' ? '#ffffff' : '#0369a1',
              border: '1px solid #bae6fd',
              cursor: 'pointer',
            }}
          >
            🎯 Tender Ready ({tenderReadyCount})
          </button>
          <button
            id="btn-filter-design-ready"
            onClick={() => setActiveFilter('design_ready')}
            style={{
              padding: '5px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: activeFilter === 'design_ready' ? '#7c3aed' : '#f8fafc',
              color: activeFilter === 'design_ready' ? '#ffffff' : '#6d28d9',
              border: '1px solid #ddd6fe',
              cursor: 'pointer',
            }}
          >
            🎨 Design Ready ({designReadyCount})
          </button>
          <button
            id="btn-filter-commercial-ready"
            onClick={() => setActiveFilter('commercial_ready')}
            style={{
              padding: '5px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: activeFilter === 'commercial_ready' ? '#059669' : '#f8fafc',
              color: activeFilter === 'commercial_ready' ? '#ffffff' : '#047857',
              border: '1px solid #a7f3d0',
              cursor: 'pointer',
            }}
          >
            💰 Commercial Ready ({commercialReadyCount})
          </button>
          <button
            id="btn-filter-production-ready"
            onClick={() => setActiveFilter('production_ready')}
            style={{
              padding: '5px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: activeFilter === 'production_ready' ? '#d97706' : '#f8fafc',
              color: activeFilter === 'production_ready' ? '#ffffff' : '#b45309',
              border: '1px solid #fde68a',
              cursor: 'pointer',
            }}
          >
            ⚙️ Production Ready ({productionReadyCount})
          </button>
          <button
            id="btn-filter-closeout-ready"
            onClick={() => setActiveFilter('closeout_ready')}
            style={{
              padding: '5px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: activeFilter === 'closeout_ready' ? '#475569' : '#f8fafc',
              color: activeFilter === 'closeout_ready' ? '#ffffff' : '#334155',
              border: '1px solid #cbd5e1',
              cursor: 'pointer',
            }}
          >
            🏁 Closeout Ready ({closeoutReadyCount})
          </button>
        </div>

        {/* 7-Point Matrix Table / Responsive Cards */}
        {filteredEvaluations.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>
              {isRtl ? 'لا توجد متطلبات مطابقة لمعيار التصفية الحالي' : 'No requirements match the active filter or search'}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              {isRtl ? 'انتقل إلى "الكل" أو سجّل مطلباً جديداً في نطاق العمل.' : 'Switch to "All" or register a new progressive scope requirement.'}
            </div>
            <Button variant="secondary" size="sm" onClick={() => { setActiveFilter('all'); setSearchTerm(''); }} style={{ marginTop: '12px' }}>
              {isRtl ? 'عرض جميع المتطلبات' : 'Reset Filters'}
            </Button>
          </div>
        ) : (() => {
          const renderRequirementCard = (ev: any) => {
            const coveragePct = ev.currentStageMaturityPct ?? ev.overallTraceabilityPct ?? ev.traceabilityScorePct ?? 0;
            const reqStatus = ev.status || (ev.isApproved ? 'approved' : 'active');
            const isSelected = selectedReqIds.includes(ev.requirementId);

            const alloc = ev.allocationStatus || 'unallocated';
            const design = ev.designStatus || 'pending';
            const prod = ev.productionStatus || 'not_started';
            const inst = ev.installationStatus || 'not_started';

            return (
              <div
                key={ev.requirementId}
                onClick={() => {
                  setSelectedReqId(ev.requirementId);
                  setIsDrawerOpen(true);
                }}
                style={{
                  backgroundColor: isSelected ? '#eff6ff' : ev.isFullyTraceable ? '#f0fdf4' : '#ffffff',
                  border: isSelected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelectReq(ev.requirementId);
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563eb', fontSize: '13px' }}>
                      <span dir="ltr">{ev.code || ev.requirementId}</span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <Badge variant={reqStatus === 'approved' ? 'success' : 'info'} size="sm">
                      {String(reqStatus).toUpperCase().replace('_', ' ')}
                    </Badge>
                    <Badge variant={ev.riskRating === 'critical' || ev.riskRating === 'high' ? 'danger' : 'warning'} size="sm">
                      {ev.riskRating?.toUpperCase() || 'LOW'}
                    </Badge>
                  </div>
                </div>

                {/* 6-Dimension Status Pills */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: alloc === 'fully_allocated' ? '#dcfce7' : alloc === 'partially_allocated' ? '#fef3c7' : alloc === 'over_allocated' ? '#fee2e2' : '#f1f5f9', color: alloc === 'fully_allocated' ? '#15803d' : alloc === 'partially_allocated' ? '#b45309' : alloc === 'over_allocated' ? '#b91c1c' : '#64748b', fontWeight: 700 }}>
                    Alloc: {alloc.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: design === 'approved' ? '#dcfce7' : design.includes('review') ? '#fef3c7' : design === 'in_progress' ? '#e0e7ff' : '#f1f5f9', color: design === 'approved' ? '#15803d' : design.includes('review') ? '#b45309' : design === 'in_progress' ? '#4338ca' : '#64748b', fontWeight: 700 }}>
                    Design: {design.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: prod === 'completed' || prod === 'qc_passed' ? '#dcfce7' : prod === 'in_production' || prod === 'released' ? '#dbeafe' : '#f1f5f9', color: prod === 'completed' || prod === 'qc_passed' ? '#15803d' : prod === 'in_production' || prod === 'released' ? '#1d4ed8' : '#64748b', fontWeight: 700 }}>
                    Prod: {prod.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: inst === 'accepted' || inst === 'installed' ? '#dcfce7' : '#f1f5f9', color: inst === 'accepted' || inst === 'installed' ? '#15803d' : '#64748b', fontWeight: 700 }}>
                    Inst: {inst.replace('_', ' ')}
                  </span>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                    {ev.title || 'Scope Deliverable'}
                  </h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.4, wordBreak: 'normal', overflowWrap: 'break-word' }}>
                    {ev.description || '(No technical description provided yet)'}
                  </p>
                  {/* Quantity Tracking */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap', fontSize: '11px' }}>
                    <span style={{ backgroundColor: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, color: '#0f172a' }}>
                      Req: {ev.quantity ?? 1} {ev.unit || 'units'}
                    </span>
                    <span style={{ backgroundColor: (ev.allocatedQuantity || 0) >= (ev.quantity || 1) ? '#dcfce7' : '#fef3c7', color: (ev.allocatedQuantity || 0) >= (ev.quantity || 1) ? '#15803d' : '#b45309', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      Alloc: {ev.allocatedQuantity ?? 0}
                    </span>
                    <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      Released: {ev.releasedQuantity ?? 0}
                    </span>
                    <span style={{ backgroundColor: '#fffbeb', color: '#b45309', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      Prod: {ev.producedQuantity ?? 0}
                    </span>
                    <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      Inst: {ev.installedQuantity ?? 0}
                    </span>
                  </div>
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
          };

          const renderRequirementRow = (ev: any) => {
            const coveragePct = ev.currentStageMaturityPct ?? ev.overallTraceabilityPct ?? ev.traceabilityScorePct ?? 0;
            const reqStatus = ev.status || (ev.isApproved ? 'approved' : 'active');
            const isSelected = selectedReqIds.includes(ev.requirementId);

            const alloc = ev.allocationStatus || 'unallocated';
            const prod = ev.productionStatus || 'not_started';

            return (
              <tr
                key={ev.requirementId}
                onClick={() => {
                  setSelectedReqId(ev.requirementId);
                  setIsDrawerOpen(true);
                }}
                style={{
                  borderBottom: '1px solid #f1f5f9',
                  backgroundColor: isSelected ? '#eff6ff' : ev.isFullyTraceable ? '#f0fdf4' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected && !ev.isFullyTraceable) e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected && !ev.isFullyTraceable) e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                {/* Checkbox */}
                <td style={{ padding: '12px 10px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectReq(ev.requirementId)}
                    style={{ cursor: 'pointer' }}
                  />
                </td>

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
                    backgroundColor: isSelected ? '#eff6ff' : ev.isFullyTraceable ? '#f0fdf4' : '#ffffff',
                    zIndex: 1,
                    boxShadow: isRtl ? '-2px 0 4px rgba(0,0,0,0.06)' : '2px 0 4px rgba(0,0,0,0.06)',
                  }}
                >
                  <span dir="ltr">{ev.code || ev.requirementId}</span>
                </td>

                {/* Column 2: Description & Scope + Quantities */}
                <td style={{ padding: '12px 14px', minWidth: '320px', maxWidth: '440px', wordBreak: 'normal', overflowWrap: 'break-word' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px', fontSize: '13px' }}>
                    {ev.title || 'Scope Deliverable'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5, wordBreak: 'normal', overflowWrap: 'break-word' }}>
                    {ev.description || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Pending technical description (Progressive)</span>}
                  </div>
                  {ev.originalWording && (
                    <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', marginTop: '4px', backgroundColor: '#f8fafc', padding: '4px 8px', borderRadius: '4px' }}>
                      {isRtl ? 'النص الأصلي:' : 'Original:'} "{ev.originalWording}"
                    </div>
                  )}
                  {/* Phase 2 Quantity Breakdown Pill */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap', fontSize: '11px' }}>
                    <span style={{ backgroundColor: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, color: '#0f172a' }}>
                      Req: {ev.quantity ?? 1} {ev.unit || 'units'}
                    </span>
                    <span style={{ backgroundColor: (ev.allocatedQuantity || 0) >= (ev.quantity || 1) ? '#dcfce7' : '#fef3c7', color: (ev.allocatedQuantity || 0) >= (ev.quantity || 1) ? '#15803d' : '#b45309', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      Alloc: {ev.allocatedQuantity ?? 0}
                    </span>
                    <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      Released: {ev.releasedQuantity ?? 0}
                    </span>
                    <span style={{ backgroundColor: '#fffbeb', color: '#b45309', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      Prod: {ev.producedQuantity ?? 0}
                    </span>
                    <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      Inst: {ev.installedQuantity ?? 0}
                    </span>
                  </div>
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

                {/* Column 6: Status & Fulfilment Dimensions */}
                <td style={{ padding: '12px 10px', width: '140px', minWidth: '140px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
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
                    <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <span style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '3px', backgroundColor: alloc === 'fully_allocated' ? '#dcfce7' : alloc === 'partially_allocated' ? '#fef3c7' : '#f1f5f9', color: alloc === 'fully_allocated' ? '#15803d' : alloc === 'partially_allocated' ? '#b45309' : '#64748b', fontWeight: 700 }}>
                        {alloc.replace('_', ' ')}
                      </span>
                      <span style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '3px', backgroundColor: prod === 'completed' || prod === 'qc_passed' ? '#dcfce7' : prod === 'in_production' || prod === 'released' ? '#dbeafe' : '#f1f5f9', color: prod === 'completed' || prod === 'qc_passed' ? '#15803d' : prod === 'in_production' || prod === 'released' ? '#1d4ed8' : '#64748b', fontWeight: 700 }}>
                        {prod.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
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
          };

          if (isMobile || viewMode === 'cards') {
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {groupedSections.map((section) => {
                  const isCollapsed = Boolean(collapsedGroups[section.key]);
                  return (
                    <div key={section.key} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {groupBy !== 'none' && (
                        <div
                          onClick={() => toggleGroupCollapse(section.key)}
                          style={{
                            padding: '10px 14px',
                            backgroundColor: '#f1f5f9',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            flexWrap: 'wrap',
                            gap: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                              {isCollapsed ? '▶' : '▼'} {section.label}
                            </span>
                            <Badge variant="neutral" size="sm">{section.items.length} reqs</Badge>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', fontSize: '11px', flexWrap: 'wrap' }}>
                            <span style={{ backgroundColor: '#ffffff', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              Req: {section.rollup.totalQty}
                            </span>
                            <span style={{ backgroundColor: '#ecfdf5', color: '#047857', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              Alloc: {section.rollup.allocatedQty}
                            </span>
                            <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              Rel: {section.rollup.releasedQty}
                            </span>
                            <span style={{ backgroundColor: '#fffbeb', color: '#b45309', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              Prod: {section.rollup.producedQty}
                            </span>
                            <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              Inst: {section.rollup.installedQty}
                            </span>
                          </div>
                        </div>
                      )}

                      {!isCollapsed && (
                        section.subGroups ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingLeft: groupBy !== 'none' ? '12px' : '0' }}>
                            {section.subGroups.map((sub) => {
                              const isSubCollapsed = Boolean(collapsedGroups[sub.key]);
                              return (
                                <div key={sub.key} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <div
                                    onClick={() => toggleGroupCollapse(sub.key)}
                                    style={{
                                      padding: '6px 10px',
                                      backgroundColor: '#f8fafc',
                                      borderRadius: '4px',
                                      border: '1px solid #e2e8f0',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                                      {isSubCollapsed ? '▶' : '▼'} ↳ {sub.label} ({sub.items.length})
                                    </span>
                                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                                      Req: {sub.rollup.totalQty} | Alloc: {sub.rollup.allocatedQty} | Prod: {sub.rollup.producedQty}
                                    </span>
                                  </div>
                                  {!isSubCollapsed && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                                      {sub.items.map(renderRequirementCard)}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                            {section.items.map(renderRequirementCard)}
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            );
          }

          return (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <table style={{ width: '100%', minWidth: '1460px', borderCollapse: 'collapse', fontSize: '12px', textAlign: isRtl ? 'right' : 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ width: '40px', padding: '12px 10px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedReqIds.length > 0 && selectedReqIds.length === filteredEvaluations.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedReqIds(filteredEvaluations.map((ev: any) => ev.requirementId));
                          } else {
                            setSelectedReqIds([]);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
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
                    <th style={{ padding: '12px 14px', fontWeight: 700, width: '140px', minWidth: '140px', textAlign: 'center' }}>
                      {isRtl ? 'الحالة' : 'Status & Fulfilment'}
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
                  {groupedSections.map((section) => {
                    const isCollapsed = Boolean(collapsedGroups[section.key]);
                    return (
                      <React.Fragment key={section.key}>
                        {groupBy !== 'none' && (
                          <tr
                            onClick={() => toggleGroupCollapse(section.key)}
                            style={{ backgroundColor: '#f1f5f9', borderTop: '2px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', cursor: 'pointer' }}
                          >
                            <td colSpan={12} style={{ padding: '10px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>
                                    {isCollapsed ? '▶' : '▼'} {section.label}
                                  </span>
                                  <Badge variant="neutral" size="sm">{section.items.length} reqs</Badge>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', fontSize: '11px' }}>
                                  <span style={{ backgroundColor: '#ffffff', padding: '3px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#0f172a' }}>
                                    Required Qty: <strong>{section.rollup.totalQty}</strong>
                                  </span>
                                  <span style={{ backgroundColor: '#ecfdf5', padding: '3px 8px', borderRadius: '4px', border: '1px solid #a7f3d0', fontWeight: 700, color: '#047857' }}>
                                    Allocated: <strong>{section.rollup.allocatedQty}</strong> / {section.rollup.totalQty}
                                  </span>
                                  <span style={{ backgroundColor: '#eff6ff', padding: '3px 8px', borderRadius: '4px', border: '1px solid #bfdbfe', fontWeight: 700, color: '#1d4ed8' }}>
                                    Design Appr: <strong>{section.rollup.designApprovedQty}</strong>
                                  </span>
                                  <span style={{ backgroundColor: '#f5f3ff', padding: '3px 8px', borderRadius: '4px', border: '1px solid #ddd6fe', fontWeight: 700, color: '#6d28d9' }}>
                                    Released: <strong>{section.rollup.releasedQty}</strong>
                                  </span>
                                  <span style={{ backgroundColor: '#fffbeb', padding: '3px 8px', borderRadius: '4px', border: '1px solid #fde68a', fontWeight: 700, color: '#b45309' }}>
                                    Produced: <strong>{section.rollup.producedQty}</strong>
                                  </span>
                                  <span style={{ backgroundColor: '#f0fdf4', padding: '3px 8px', borderRadius: '4px', border: '1px solid #bbf7d0', fontWeight: 700, color: '#15803d' }}>
                                    Delivered: <strong>{section.rollup.deliveredQty}</strong>
                                  </span>
                                  <span style={{ backgroundColor: '#f0fdf4', padding: '3px 8px', borderRadius: '4px', border: '1px solid #bbf7d0', fontWeight: 700, color: '#15803d' }}>
                                    Installed: <strong>{section.rollup.installedQty}</strong>
                                  </span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}

                        {!isCollapsed && (
                          section.subGroups ? (
                            section.subGroups.map((sub) => {
                              const isSubCollapsed = Boolean(collapsedGroups[sub.key]);
                              return (
                                <React.Fragment key={sub.key}>
                                  <tr
                                    onClick={() => toggleGroupCollapse(sub.key)}
                                    style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}
                                  >
                                    <td colSpan={12} style={{ padding: '8px 14px 8px 32px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                                            {isSubCollapsed ? '▶' : '▼'} ↳ {sub.label}
                                          </span>
                                          <Badge variant="neutral" size="sm">{sub.items.length} items</Badge>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#64748b' }}>
                                          <span>Total Qty: <strong>{sub.rollup.totalQty}</strong></span>
                                          <span>•</span>
                                          <span>Allocated: <strong>{sub.rollup.allocatedQty}</strong></span>
                                          <span>•</span>
                                          <span>Released: <strong>{sub.rollup.releasedQty}</strong></span>
                                          <span>•</span>
                                          <span>Produced: <strong>{sub.rollup.producedQty}</strong></span>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                  {!isSubCollapsed && sub.items.map(renderRequirementRow)}
                                </React.Fragment>
                              );
                            })
                          ) : (
                            section.items.map(renderRequirementRow)
                          )
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
      </Card>

      {/* Floating Multi-Select Bulk Actions Toolbar */}
      {selectedReqIds.length > 0 && (
        <div
          style={{
            position: 'sticky',
            bottom: '16px',
            zIndex: 100,
            backgroundColor: '#0f172a',
            color: '#ffffff',
            borderRadius: '8px',
            padding: '12px 18px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            border: '1px solid #334155',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Badge variant="info">{selectedReqIds.length} Selected</Badge>
            <span style={{ fontSize: '13px', color: '#cbd5e1' }}>
              Perform bulk operations on selected scope items:
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Quick Bulk Owner Assign */}
            <select
              value={bulkOwnerName}
              onChange={(e) => setBulkOwnerName(e.target.value)}
              style={{
                fontSize: '12px',
                padding: '6px 10px',
                borderRadius: '4px',
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #475569',
              }}
            >
              <option value="">Assign Lead / Owner...</option>
              {ALL_LOCAL_TEAM_USERS.map((u) => (
                <option key={u.id} value={u.name}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleBulkAssignOwner}
              disabled={!bulkOwnerName || isApplyingBulk}
            >
              Apply Owner
            </Button>

            {/* Quick Bulk Due Date */}
            <input
              type="date"
              value={bulkDueDate}
              onChange={(e) => setBulkDueDate(e.target.value)}
              style={{
                fontSize: '12px',
                padding: '5px 8px',
                borderRadius: '4px',
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #475569',
              }}
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={handleBulkSetDueDate}
              disabled={!bulkDueDate || isApplyingBulk}
            >
              Apply Date
            </Button>

            {/* Quick Bulk Status */}
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              style={{
                fontSize: '12px',
                padding: '6px 10px',
                borderRadius: '4px',
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #475569',
              }}
            >
              <option value="">Set Status...</option>
              <option value="draft">Draft</option>
              <option value="in_design">In Design</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="active">Active</option>
            </select>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleBulkSetStatus}
              disabled={!bulkStatus || isApplyingBulk}
            >
              Apply Status
            </Button>

            {/* Bulk Archive */}
            <Button
              size="sm"
              variant="danger"
              onClick={handleBulkArchive}
              disabled={isApplyingBulk}
            >
              Archive
            </Button>

            {/* Deselect */}
            <button
              onClick={() => setSelectedReqIds([])}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '12px',
                cursor: 'pointer',
                textDecoration: 'underline',
                marginLeft: '8px',
              }}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

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

      {/* Quick Add Modal */}
      <Modal
        isOpen={isQuickAddModalOpen}
        onClose={() => setIsQuickAddModalOpen(false)}
        title={isRtl ? 'إضافة سريعة لمطلب نطاق عمل' : 'Quick Capture Scope Requirement'}
        size="md"
      >
        <form onSubmit={handleQuickAddRequirement} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ backgroundColor: '#eff6ff', padding: '10px 14px', borderRadius: '6px', fontSize: '12px', color: '#1e40af', border: '1px solid #bfdbfe' }}>
            ⚡ <strong>Progressive Invariant:</strong> Only <em>Title</em> is mandatory. Missing attributes remain unassigned until progressively refined. Never manufactured.
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
              Requirement Title *
            </label>
            <Input
              autoFocus
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="e.g. VIP Holding Canopy Structure & Weatherproofing"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Discipline</label>
              <Select value={quickCategory} onChange={(e) => setQuickCategory(e.target.value)}>
                <option value="staging_technical">Staging Technical & Rigging</option>
                <option value="creative_visual">Creative Visual & LED</option>
                <option value="health_safety">Health, Safety & QCDD</option>
                <option value="protocol_ceremony">Protocol & Ceremonial</option>
                <option value="operational_logistics">Site Operational Logistics</option>
                <option value="commercial_contract">Commercial & Contract</option>
              </Select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Priority</label>
              <Select value={quickPriority} onChange={(e) => setQuickPriority(e.target.value as any)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Initial Lead Owner (Optional)</label>
              <Select value={quickOwnerName} onChange={(e) => setQuickOwnerName(e.target.value)}>
                <option value="">Unassigned (Progressive)</option>
                {ALL_LOCAL_TEAM_USERS.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Target Due Date (Optional)</label>
              <Input
                type="date"
                value={quickDueDate}
                onChange={(e) => setQuickDueDate(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={() => setIsQuickAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmittingQuick || !quickTitle.trim()}>
              {isSubmittingQuick ? 'Saving...' : '⚡ Quick Save Scope'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detailed Register Requirement Modal */}
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
                placeholder="e.g. REQ-001 (auto if blank)"
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Requirement Title *</label>
              <Input
                value={reqTitle}
                onChange={(e) => setReqTitle(e.target.value)}
                placeholder="e.g. VIP Protocol Holding Majlis & Staging Canopy"
                required
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Technical Scope Description</label>
            <Textarea
              value={reqDesc}
              onChange={(e) => setReqDesc(e.target.value)}
              placeholder="Detailed technical deliverables, dimensions, materials, wind ratings..."
              rows={2}
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
              <Select value={reqOwnerName} onChange={(e) => setReqOwnerName(e.target.value)}>
                <option value="">Unassigned (Progressive)</option>
                {ALL_LOCAL_TEAM_USERS.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </Select>
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

      {/* 7-Tab Requirement Detail Drawer */}
      <RequirementDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedReqId(null);
        }}
        requirementId={selectedReqId}
        projectId={projectId}
        onRequirementUpdated={triggerRefresh}
      />

      {/* Bulk Scope Entry Modal */}
      <BulkScopeEntryModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        projectId={projectId}
        onSaved={triggerRefresh}
      />

      {/* Document Parsing Modal */}
      <DocumentParsingModal
        isOpen={isParseModalOpen}
        onClose={() => setIsParseModalOpen(false)}
        projectId={projectId}
        onCandidatesApproved={triggerRefresh}
      />
    </div>
  );
};
