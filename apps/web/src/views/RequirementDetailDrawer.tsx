import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { ALL_LOCAL_TEAM_USERS } from '../context/canonical-users.js';
import { Badge, Button, Card, Modal, Input, Textarea, Select } from '../components/DesignSystem.js';

interface RequirementDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  requirementId: string | null;
  onRequirementUpdated?: () => void;
}

const MEDIA_CATEGORIES = [
  { id: 'site_photo', label: 'Site Photo / Survey', icon: '📷' },
  { id: 'cad_drawing', label: 'CAD Drawing / Elevation', icon: '📐' },
  { id: 'rfi_scan', label: 'RFI / Clarification Scan', icon: '📝' },
  { id: 'specification_pdf', label: 'Specification Document (PDF)', icon: '📄' },
  { id: 'client_brief', label: 'Client Brief / Tender Extract', icon: '📋' },
  { id: 'sample_photo', label: 'Material Sample Photo', icon: '🧱' },
  { id: 'visual_render', label: '3D Visual Render', icon: '🎨' },
  { id: 'engineering_calc', label: 'Structural / Engineering Calc', icon: '🧮' },
  { id: 'safety_assessment', label: 'Health & Safety Assessment', icon: '🛡️' },
  { id: 'survey_report', label: 'Acoustic / Technical Survey', icon: '📊' },
  { id: 'vendor_spec', label: 'Vendor Technical Spec', icon: '📦' },
  { id: 'contract_extract', label: 'Contract Excerpt / Addendum', icon: '📜' },
  { id: 'authority_permit', label: 'Civil Defense / CAA Permit', icon: '🏛️' },
  { id: 'method_statement', label: 'Method Statement', icon: '📑' },
  { id: 'material_board', label: 'Sample Board / Palette', icon: '🎨' },
  { id: 'as_built_photo', label: 'As-Built Installation Photo', icon: '🏗️' },
  { id: 'handover_signoff', label: 'Client Handover Sign-off', icon: '✍️' },
];

type DrawerTab =
  | 'scope'
  | 'locations'
  | 'design'
  | 'departments'
  | 'fulfilment'
  | 'production'
  | 'logistics'
  | 'clarifications'
  | 'media'
  | 'audit';

export const RequirementDetailDrawer: React.FC<RequirementDetailDrawerProps> = ({
  isOpen,
  onClose,
  projectId,
  requirementId,
  onRequirementUpdated,
}) => {
  const { apiClient, currentLanguage, currentUser } = useEosContext();
  const isRtl = currentLanguage === 'ar';

  const [activeTab, setActiveTab] = useState<DrawerTab>('scope');

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [requirement, setRequirement] = useState<any>(null);
  const [reconciliation, setReconciliation] = useState<any>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState<any>({});
  const [ownerSearch, setOwnerSearch] = useState<string>('');

  // Tab 2: Allocations State
  const [allocations, setAllocations] = useState<any[]>([]);
  const [newAllocZone, setNewAllocZone] = useState<string>('Zone A');
  const [newAllocLocation, setNewAllocLocation] = useState<string>('Main Entrance');
  const [newAllocSubLocation, setNewAllocSubLocation] = useState<string>('');
  const [newAllocQty, setNewAllocQty] = useState<number>(6);
  const [newAllocVariant, setNewAllocVariant] = useState<string>('Standard V1');
  const [isAddingAlloc, setIsAddingAlloc] = useState<boolean>(false);

  // Split / Move modals
  const [isSplitModalOpen, setIsSplitModalOpen] = useState<boolean>(false);
  const [targetSplitAlloc, setTargetSplitAlloc] = useState<any>(null);
  const [split1Qty, setSplit1Qty] = useState<number>(1);
  const [split2Qty, setSplit2Qty] = useState<number>(1);
  const [split1Loc, setSplit1Loc] = useState<string>('');
  const [split2Loc, setSplit2Loc] = useState<string>('');

  const [isMoveQtyModalOpen, setIsMoveQtyModalOpen] = useState<boolean>(false);
  const [moveSourceAllocId, setMoveSourceAllocId] = useState<string>('');
  const [moveTargetAllocId, setMoveTargetAllocId] = useState<string>('');
  const [moveQtyVal, setMoveQtyVal] = useState<number>(1);

  // Tab 3: Design & Variants State
  const [designVariants, setDesignVariants] = useState<any[]>([]);
  const [newVariantName, setNewVariantName] = useState<string>('');
  const [newVariantCode, setNewVariantCode] = useState<string>('V1');
  const [newVariantQty, setNewVariantQty] = useState<number>(14);
  const [selectedVariantForAction, setSelectedVariantForAction] = useState<any>(null);
  const [isApproveVariantModalOpen, setIsApproveVariantModalOpen] = useState<boolean>(false);
  const [variantApproveQty, setVariantApproveQty] = useState<number>(14);
  const [isReleaseVariantModalOpen, setIsReleaseVariantModalOpen] = useState<boolean>(false);
  const [variantReleaseQty, setVariantReleaseQty] = useState<number>(14);
  const [isSuperAdminOverride, setIsSuperAdminOverride] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>('');

  // Tab 4: Departments & Work Packages
  const [workPackages, setWorkPackages] = useState<any[]>([]);
  const [isInstantiatingTemplate, setIsInstantiatingTemplate] = useState<boolean>(false);
  const [templateCategory, setTemplateCategory] = useState<string>('creative_visual');
  const [newWpTitle, setNewWpTitle] = useState<string>('');
  const [newWpDept, setNewWpDept] = useState<string>('Production');

  // Tab 5: Fulfilment BOM State
  const [fulfilmentItems, setFulfilmentItems] = useState<any[]>([]);
  const [selectedBomIds, setSelectedBomIds] = useState<string[]>([]);
  const [bomBoqCode, setBomBoqCode] = useState<string>('');

  // Tab 6: Production Batches State
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchForProgress, setSelectedBatchForProgress] = useState<any>(null);
  const [isBatchProgressModalOpen, setIsBatchProgressModalOpen] = useState<boolean>(false);
  const [batchProducedInput, setBatchProducedInput] = useState<number>(0);
  const [batchQcInput, setBatchQcInput] = useState<number>(0);

  // Tab 10: Quantity Delta / Baseline Revision State
  const [isQtyChangeModalOpen, setIsQtyChangeModalOpen] = useState<boolean>(false);
  const [newTargetQuantity, setNewTargetQuantity] = useState<number>(24);
  const [qtyChangeReason, setQtyChangeReason] = useState<string>('Client VIP venue scope expansion');
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState<boolean>(false);
  const [revisionReason, setRevisionReason] = useState<string>('');

  // Media upload modal
  const [isMediaModalOpen, setIsMediaModalOpen] = useState<boolean>(false);
  const [mediaFileName, setMediaFileName] = useState<string>('');
  const [mediaCategory, setMediaCategory] = useState<string>('site_photo');
  const [mediaDesc, setMediaDesc] = useState<string>('');
  const [isUploadingMedia, setIsUploadingMedia] = useState<boolean>(false);

  // Quick Clarification Modal
  const [isRfiModalOpen, setIsRfiModalOpen] = useState<boolean>(false);
  const [rfiQuestion, setRfiQuestion] = useState<string>('');
  const [rfiCategory, setRfiCategory] = useState<string>('technical');
  const [isSubmittingRfi, setIsSubmittingRfi] = useState<boolean>(false);

  const loadAllData = async () => {
    if (!requirementId) return;
    setLoading(true);
    setError(null);
    try {
      const [reqData, reconData, allocData, _dpData, dvData, fiData, wpData, bData] = await Promise.all([
        apiClient.getRequirement(projectId, requirementId),
        apiClient.getRequirementReconciliation(projectId, requirementId).catch(() => ({ data: null })),
        apiClient.getRequirementAllocations(projectId, requirementId).catch(() => ({ data: [] })),
        apiClient.getRequirementDesignPackages(projectId, requirementId).catch(() => ({ data: [] })),
        apiClient.getRequirementDesignVariants(projectId, requirementId).catch(() => ({ data: [] })),
        apiClient.getRequirementFulfilmentItems(projectId, requirementId).catch(() => ({ data: [] })),
        apiClient.getRequirementWorkPackages(projectId, requirementId).catch(() => ({ data: [] })),
        apiClient.getRequirementBatches(projectId, requirementId).catch(() => ({ data: [] })),
      ]);

      setRequirement(reqData);
      setReconciliation(reconData?.data || null);
      setAllocations(allocData?.data || []);
      setDesignVariants(dvData?.data || []);
      setFulfilmentItems(fiData?.data || []);
      setWorkPackages(wpData?.data || []);
      setBatches(bData?.data || []);

      setFormData({
        title: reqData.title || '',
        code: reqData.code || '',
        description: reqData.description || '',
        originalWording: reqData.originalWording || '',
        interpretation: reqData.interpretation || '',
        sourceType: reqData.sourceType || 'Client RFP',
        sourceReference: reqData.sourceReference || '',
        scopePackage: reqData.scopePackage || '',
        category: reqData.category || 'staging_technical',
        discipline: reqData.discipline || 'staging',
        department: reqData.department || '',
        ownerId: reqData.ownerId || '',
        ownerName: reqData.ownerName || '',
        supportingOwnerIds: reqData.supportingOwnerIds || [],
        approverId: reqData.approverId || '',
        approverName: reqData.approverName || '',
        dueDate: reqData.dueDate ? reqData.dueDate.split('T')[0] : '',
        startDate: reqData.startDate ? reqData.startDate.split('T')[0] : '',
        milestone: reqData.milestone || '',
        dependency: reqData.dependency || '',
        responsibleParty: reqData.responsibleParty || 'e3',
        externalResponsibleParty: reqData.externalResponsibleParty || '',
        priority: reqData.priority || 'medium',
        risk: reqData.risk || 'medium',
        status: reqData.status || 'draft',
        progress: reqData.progress ?? 0,
        acceptanceCriteria: reqData.acceptanceCriteria || '',
        quantity: reqData.quantity ?? '',
        unit: reqData.unit || '',
        locationZone: reqData.locationZone || '',
        notes: reqData.notes || '',
        disposition: reqData.disposition || 'applicable',
        deliverablePackageId: reqData.deliverablePackageId || '',
        linkedDocumentNumber: reqData.linkedDocumentNumber || '',
        linkedDesignId: reqData.linkedDesignId || '',
        linkedBoqLineCode: reqData.linkedBoqLineCode || '',
        linkedTaskId: reqData.linkedTaskId || '',
        targetCostQar: reqData.targetCostQar ?? '',
      });
      setNewTargetQuantity(Number(reqData.quantity) || 20);
    } catch (err: any) {
      setError(err.message || 'Failed to load requirement details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && requirementId) {
      loadAllData();
    }
  }, [isOpen, requirementId, projectId]);

  if (!isOpen) return null;

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSaveClick = () => {
    if (requirement?.status === 'approved') {
      setIsRevisionModalOpen(true);
    } else {
      executeSave({});
    }
  };

  const executeSave = async (extraParams: any) => {
    setIsSaving(true);
    try {
      const payload: any = {
        ...formData,
        targetCostQar: formData.targetCostQar ? Number(formData.targetCostQar) : undefined,
        quantity: formData.quantity ? Number(formData.quantity) : undefined,
        progress: Number(formData.progress || 0),
        ...extraParams,
      };

      await apiClient.updateRequirement(projectId, requirement.id, payload);
      setIsRevisionModalOpen(false);
      await loadAllData();
      if (onRequirementUpdated) onRequirementUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to save requirement');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmRevision = () => {
    if (!isSuperAdminOverride && (!revisionReason || revisionReason.trim().length < 3)) {
      alert('Please provide a reason for the baseline change');
      return;
    }
    executeSave({
      changeReason: revisionReason,
      superAdminOverride: isSuperAdminOverride,
      overrideReason: isSuperAdminOverride ? overrideReason : undefined,
    });
  };

  // Tab 2: Allocations
  const handleAddAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.createRequirementAllocation(projectId, requirement.id, {
        zone: newAllocZone,
        location: newAllocLocation,
        subLocation: newAllocSubLocation || undefined,
        quantity: Number(newAllocQty),
        unit: requirement.unit || 'pcs',
        designVariantId: newAllocVariant || undefined,
      });
      setIsAddingAlloc(false);
      await loadAllData();
      if (onRequirementUpdated) onRequirementUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to add allocation');
    }
  };

  const handleDeleteAllocation = async (allocId: string) => {
    if (!confirm('Delete this location allocation?')) return;
    try {
      await apiClient.deleteRequirementAllocation(projectId, requirement.id, allocId);
      await loadAllData();
      if (onRequirementUpdated) onRequirementUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to delete allocation');
    }
  };

  const handleExecuteSplit = async () => {
    if (!targetSplitAlloc) return;
    try {
      await apiClient.splitRequirementAllocation(projectId, requirement.id, {
        allocationId: targetSplitAlloc.id,
        splits: [
          { zone: targetSplitAlloc.zone, location: split1Loc || targetSplitAlloc.location, quantity: Number(split1Qty) },
          { zone: targetSplitAlloc.zone, location: split2Loc || `${targetSplitAlloc.location} (Sub-unit)`, quantity: Number(split2Qty) },
        ],
      });
      setIsSplitModalOpen(false);
      setTargetSplitAlloc(null);
      await loadAllData();
      if (onRequirementUpdated) onRequirementUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to split allocation');
    }
  };

  const handleExecuteMoveQty = async () => {
    try {
      await apiClient.moveRequirementAllocationQuantity(projectId, requirement.id, {
        sourceAllocationId: moveSourceAllocId,
        targetAllocationId: moveTargetAllocId,
        quantity: Number(moveQtyVal),
      });
      setIsMoveQtyModalOpen(false);
      await loadAllData();
      if (onRequirementUpdated) onRequirementUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to move quantity');
    }
  };

  // Tab 3: Design & Variants
  const handleCreateVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVariantName) return;
    try {
      await apiClient.createRequirementDesignVariant(projectId, requirement.id, {
        name: newVariantName,
        code: newVariantCode,
        quantity: Number(newVariantQty),
      });
      setNewVariantName('');
      await loadAllData();
      if (onRequirementUpdated) onRequirementUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to create variant');
    }
  };

  const handleApproveVariant = async () => {
    if (!selectedVariantForAction) return;
    try {
      await apiClient.approveRequirementDesignVariant(projectId, requirement.id, selectedVariantForAction.id, {
        approvedQuantity: Number(variantApproveQty),
        clientApproval: true,
      });
      setIsApproveVariantModalOpen(false);
      setSelectedVariantForAction(null);
      await loadAllData();
      if (onRequirementUpdated) onRequirementUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to approve variant');
    }
  };

  const handleReleaseVariant = async () => {
    if (!selectedVariantForAction) return;
    try {
      await apiClient.releaseRequirementDesignVariant(projectId, requirement.id, selectedVariantForAction.id, {
        releasedQuantity: Number(variantReleaseQty),
        superAdminOverride: isSuperAdminOverride,
        overrideReason: isSuperAdminOverride ? overrideReason : undefined,
      });
      setIsReleaseVariantModalOpen(false);
      setSelectedVariantForAction(null);
      await loadAllData();
      if (onRequirementUpdated) onRequirementUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to release variant to production');
    }
  };

  // Tab 4: Work Packages
  const handleInstantiateTemplate = async () => {
    setIsInstantiatingTemplate(true);
    try {
      await apiClient.instantiateWorkPackageTemplate(projectId, requirement.id, templateCategory);
      await loadAllData();
      if (onRequirementUpdated) onRequirementUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to instantiate template');
    } finally {
      setIsInstantiatingTemplate(false);
    }
  };

  // Tab 5: Fulfilment BOM
  const handleGenerateDraftBOM = async () => {
    try {
      await apiClient.generateDraftFulfilmentItems(projectId, requirement.id);
      await loadAllData();
      if (onRequirementUpdated) onRequirementUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to generate draft BOM');
    }
  };

  const handleBatchBOMAction = async (action: 'approve' | 'reject' | 'release_to_production' | 'link_boq') => {
    if (selectedBomIds.length === 0) {
      alert('Please select at least one fulfilment item');
      return;
    }
    try {
      await apiClient.reviewFulfilmentBatch(projectId, requirement.id, {
        itemIds: selectedBomIds,
        action,
        boqLineCode: action === 'link_boq' ? bomBoqCode : undefined,
      });
      setSelectedBomIds([]);
      await loadAllData();
      if (onRequirementUpdated) onRequirementUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to process fulfilment items');
    }
  };

  // Tab 6: Production Progress
  const handleUpdateBatchProgress = async () => {
    if (!selectedBatchForProgress) return;
    try {
      await apiClient.recordBatchProgress(projectId, requirement.id, selectedBatchForProgress.id, {
        producedQuantity: Number(batchProducedInput),
        qcPassedQuantity: Number(batchQcInput),
      });
      setIsBatchProgressModalOpen(false);
      setSelectedBatchForProgress(null);
      await loadAllData();
      if (onRequirementUpdated) onRequirementUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to record batch progress');
    }
  };

  // Tab 10: Quantity Delta / Baseline Revision
  const handleExecuteQuantityChange = async () => {
    try {
      await apiClient.changeRequirementQuantity(projectId, requirement.id, {
        newQuantity: Number(newTargetQuantity),
        reasonForChange: qtyChangeReason,
      });
      setIsQtyChangeModalOpen(false);
      await loadAllData();
      if (onRequirementUpdated) onRequirementUpdated();
      alert(`Requirement baseline quantity updated to ${newTargetQuantity}. Delta recorded.`);
    } catch (err: any) {
      alert(err.message || 'Failed to update requirement quantity baseline');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm flex justify-end transition-opacity duration-300"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="w-full max-w-5xl bg-slate-900 border-s border-slate-800 h-full flex flex-col shadow-2xl text-slate-100 animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded font-semibold">
              {requirement?.code || 'REQ-NEW'}
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-100 truncate max-w-md">
                {requirement?.title || 'Scope Requirement Details'}
              </h2>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                <span>Rev {requirement?.currentRevision || 1}</span>
                <span>•</span>
                <span className="capitalize">Scope: {requirement?.status || 'draft'}</span>
                <span>•</span>
                <span className="text-amber-400 font-semibold">
                  Maturity: {requirement?.traceability?.completenessRatio || '0/7'}
                </span>
                <span>•</span>
                <span className="text-emerald-400">
                  Alloc: {reconciliation?.totalAllocated || requirement?.allocatedQuantity || 0}/{requirement?.quantity || 0}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsQtyChangeModalOpen(true)}
              className="text-xs border-amber-500/40 text-amber-400 hover:bg-amber-950/30"
            >
              ⚡ Change Baseline Qty
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveClick}
              disabled={isSaving}
              className="bg-amber-500 hover:bg-amber-450 text-slate-950 font-semibold text-xs"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Dynamic Lineage Meter Bar */}
        {reconciliation && (
          <div className="px-6 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs overflow-x-auto gap-4">
            <div className="flex items-center gap-2 text-slate-300 font-medium whitespace-nowrap">
              <span className="text-amber-400 font-bold">{reconciliation.totalRequired}</span> req ·{' '}
              <span className="text-blue-400 font-bold">{reconciliation.totalAllocated}</span> alloc ·{' '}
              <span className="text-purple-400 font-bold">{reconciliation.designApproved}</span> design-app ·{' '}
              <span className="text-indigo-400 font-bold">{reconciliation.releasedToProduction}</span> released ·{' '}
              <span className="text-amber-300 font-bold">{reconciliation.produced}</span> produced ·{' '}
              <span className="text-emerald-400 font-bold">{reconciliation.installed}</span> installed ·{' '}
              <span className="text-teal-300 font-bold">{reconciliation.accepted}</span> accepted
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <Badge variant={reconciliation.allocationStatus === 'fully_allocated' ? 'success' : 'warning'}>
                {reconciliation.allocationStatus?.replace('_', ' ') || 'unallocated'}
              </Badge>
              <Badge variant={reconciliation.designStatus === 'approved' ? 'success' : 'info'}>
                Design: {reconciliation.designStatus?.replace('_', ' ') || 'in progress'}
              </Badge>
              <Badge variant={reconciliation.productionStatus === 'released' ? 'success' : 'default'}>
                Prod: {reconciliation.productionStatus?.replace('_', ' ') || 'not released'}
              </Badge>
            </div>
          </div>
        )}

        {/* 10 Controlled Tabs Bar */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 gap-1 overflow-x-auto">
          {[
            { id: 'scope', label: '1. Scope' },
            { id: 'locations', label: `2. Locations & Quantities (${allocations.length})` },
            { id: 'design', label: `3. Design & Variants (${designVariants.length})` },
            { id: 'departments', label: `4. Departments & Owners (${workPackages.length})` },
            { id: 'fulfilment', label: `5. Fulfilment BOM (${fulfilmentItems.length})` },
            { id: 'production', label: `6. Production & Batches (${batches.length})` },
            { id: 'logistics', label: '7. Logistics & Site Ops' },
            { id: 'clarifications', label: `8. RFIs (${requirement?.linkedClarifications?.length || 0})` },
            { id: 'media', label: `9. Documents & Media (${requirement?.attachments?.length || 0})` },
            { id: 'audit', label: `10. Changes & Audit (${requirement?.revisions?.length || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-3.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-amber-400 text-amber-400 bg-amber-400/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="text-center py-20 text-slate-400">Loading requirement lineage & work packages...</div>
          ) : error ? (
            <div className="p-4 rounded bg-rose-950/40 border border-rose-800 text-rose-300">{error}</div>
          ) : (
            <>
              {/* TAB 1: SCOPE */}
              {activeTab === 'scope' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Requirement Title"
                      value={formData.title}
                      onChange={(e) => handleFieldChange('title', e.target.value)}
                    />
                    <Input
                      label="Requirement Code"
                      value={formData.code}
                      onChange={(e) => handleFieldChange('code', e.target.value)}
                    />
                  </div>

                  <Textarea
                    label="Description & Deliverable Scope"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                  />

                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-3">
                    <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      Immutable Source Wording & Technical Interpretation
                    </div>
                    <Textarea
                      label="Original RFP / Tender Specification Quote"
                      rows={2}
                      value={formData.originalWording}
                      onChange={(e) => handleFieldChange('originalWording', e.target.value)}
                    />
                    <Textarea
                      label="E3 Engineering Interpretation & Assumptions"
                      rows={2}
                      value={formData.interpretation}
                      onChange={(e) => handleFieldChange('interpretation', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="Total Master Required Quantity"
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => handleFieldChange('quantity', e.target.value)}
                    />
                    <Input
                      label="Unit (e.g. pcs, sets, m2)"
                      value={formData.unit}
                      onChange={(e) => handleFieldChange('unit', e.target.value)}
                    />
                    <Select
                      label="Priority"
                      value={formData.priority}
                      onChange={(e) => handleFieldChange('priority', e.target.value)}
                      options={[
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' },
                        { value: 'critical', label: 'Critical' },
                      ]}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select
                      label="Scope Disposition"
                      value={formData.disposition}
                      onChange={(e) => handleFieldChange('disposition', e.target.value)}
                      options={[
                        { value: 'applicable', label: 'Applicable' },
                        { value: 'satisfied', label: 'Satisfied' },
                        { value: 'not_applicable', label: 'Not Applicable' },
                        { value: 'negotiated_out', label: 'Negotiated Out' },
                        { value: 'formally_amended', label: 'Formally Amended' },
                      ]}
                    />
                    <Select
                      label="Scope Status"
                      value={formData.status}
                      onChange={(e) => handleFieldChange('status', e.target.value)}
                      options={[
                        { value: 'draft', label: 'Draft' },
                        { value: 'incomplete', label: 'Incomplete' },
                        { value: 'confirmed', label: 'Confirmed' },
                        { value: 'approved', label: 'Approved' },
                        { value: 'changed', label: 'Changed' },
                        { value: 'closed', label: 'Closed' },
                      ]}
                    />
                    <Input
                      label="Overall Progress %"
                      type="number"
                      value={formData.progress}
                      onChange={(e) => handleFieldChange('progress', e.target.value)}
                    />
                  </div>

                  <Textarea
                    label="Acceptance Criteria & Inspection Standards"
                    rows={2}
                    value={formData.acceptanceCriteria}
                    onChange={(e) => handleFieldChange('acceptanceCriteria', e.target.value)}
                  />
                </div>
              )}

              {/* TAB 2: LOCATIONS & QUANTITIES */}
              {activeTab === 'locations' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">Location Allocations Breakdown</h3>
                      <p className="text-xs text-slate-400">
                        Divide master quantity ({requirement.quantity} {requirement.unit || 'units'}) across venues, zones, and locations without duplicating records.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setIsMoveQtyModalOpen(true)}
                        disabled={allocations.length < 2}
                        className="text-xs"
                      >
                        ⇄ Move Qty
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => setIsAddingAlloc(!isAddingAlloc)}
                        className="text-xs bg-amber-500 text-slate-950 font-bold"
                      >
                        + Add Allocation
                      </Button>
                    </div>
                  </div>

                  {/* Add Allocation Inline Form */}
                  {isAddingAlloc && (
                    <form onSubmit={handleAddAllocation} className="p-4 bg-slate-950/70 border border-amber-500/30 rounded-lg space-y-4">
                      <div className="text-xs font-bold text-amber-400">Register New Zone / Location Allocation</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Input label="Zone" value={newAllocZone} onChange={(e) => setNewAllocZone(e.target.value)} required />
                        <Input label="Location" value={newAllocLocation} onChange={(e) => setNewAllocLocation(e.target.value)} required />
                        <Input label="Sub-Location (Opt)" value={newAllocSubLocation} onChange={(e) => setNewAllocSubLocation(e.target.value)} />
                        <Input label="Quantity" type="number" value={newAllocQty} onChange={(e) => setNewAllocQty(Number(e.target.value))} required />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setIsAddingAlloc(false)}>Cancel</Button>
                        <Button size="sm" variant="primary" type="submit" className="bg-amber-500 text-slate-950 font-bold">Confirm Allocation</Button>
                      </div>
                    </form>
                  )}

                  {/* Allocations Table */}
                  <div className="overflow-x-auto border border-slate-800 rounded-lg bg-slate-950/40">
                    <table className="w-full text-xs text-start">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                        <tr>
                          <th className="p-2.5">Zone</th>
                          <th className="p-2.5">Location</th>
                          <th className="p-2.5">Quantity</th>
                          <th className="p-2.5">Design Variant</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5 text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-200">
                        {allocations.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-slate-500">
                              No allocations created yet. Master quantity ({requirement.quantity}) is unallocated.
                            </td>
                          </tr>
                        ) : (
                          allocations.map((a) => (
                            <tr key={a.id} className="hover:bg-slate-800/30">
                              <td className="p-2.5 font-semibold text-amber-300">{a.zone}</td>
                              <td className="p-2.5">
                                <span className="text-slate-100 font-medium">{a.location}</span>
                                {a.subLocation && <span className="text-slate-400 text-[11px] block">{a.subLocation}</span>}
                              </td>
                              <td className="p-2.5 font-bold text-slate-100">{a.quantity} {a.unit || 'pcs'}</td>
                              <td className="p-2.5">
                                <Badge variant="info">{a.designVariantId || 'Standard V1'}</Badge>
                              </td>
                              <td className="p-2.5">
                                <Badge variant={a.status === 'accepted' ? 'success' : 'default'}>{a.status}</Badge>
                              </td>
                              <td className="p-2.5 text-end space-x-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setTargetSplitAlloc(a);
                                    setSplit1Qty(Math.floor(a.quantity / 2) || 1);
                                    setSplit2Qty(Math.ceil(a.quantity / 2) || 1);
                                    setIsSplitModalOpen(true);
                                  }}
                                  className="text-[11px] py-0.5 px-1.5"
                                >
                                  Split
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteAllocation(a.id)}
                                  className="text-[11px] py-0.5 px-1.5 text-rose-400 hover:text-rose-300"
                                >
                                  Delete
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: DESIGN & VARIANTS */}
              {activeTab === 'design' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">Design Packages & Variants</h3>
                      <p className="text-xs text-slate-400">
                        Manage design development, variant solutions, client approvals, and partial production releases.
                      </p>
                    </div>
                  </div>

                  {/* Variants List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {designVariants.length === 0 ? (
                      <div className="col-span-2 p-8 text-center border border-dashed border-slate-800 rounded-lg text-slate-500 text-xs">
                        No design variants configured. Create Standard or Premium variants below.
                      </div>
                    ) : (
                      designVariants.map((v) => (
                        <div key={v.id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-100 text-sm">{v.name} ({v.code})</span>
                            <Badge variant={v.approvalStatus === 'approved' ? 'success' : 'warning'}>
                              {v.approvalStatus}
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-400 space-y-1">
                            <div>Allocated Units: <strong className="text-slate-200">{v.quantity}</strong></div>
                            <div>Approved for Production: <strong className="text-emerald-400">{v.approvedQuantity}</strong></div>
                            <div>Released to Workshop: <strong className="text-amber-400">{v.releasedQuantity}</strong></div>
                          </div>
                          <div className="flex gap-2 pt-2 border-t border-slate-800/80">
                            {v.approvalStatus !== 'approved' ? (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => {
                                  setSelectedVariantForAction(v);
                                  setVariantApproveQty(v.quantity || 14);
                                  setIsApproveVariantModalOpen(true);
                                }}
                                className="text-xs bg-emerald-600 hover:bg-emerald-500 font-semibold"
                              >
                                Approve Design
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => {
                                  setSelectedVariantForAction(v);
                                  setVariantReleaseQty(v.approvedQuantity - v.releasedQuantity);
                                  setIsReleaseVariantModalOpen(true);
                                }}
                                className="text-xs bg-indigo-600 hover:bg-indigo-500 font-semibold"
                              >
                                Release to Production
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Create New Variant Form */}
                  <form onSubmit={handleCreateVariant} className="p-4 bg-slate-950/40 border border-slate-800 rounded-lg space-y-3">
                    <div className="text-xs font-bold text-slate-300">Add Solution Variant</div>
                    <div className="grid grid-cols-3 gap-3">
                      <Input label="Variant Name" placeholder="e.g. Standard Variant V1" value={newVariantName} onChange={(e) => setNewVariantName(e.target.value)} required />
                      <Input label="Code" placeholder="V1" value={newVariantCode} onChange={(e) => setNewVariantCode(e.target.value)} required />
                      <Input label="Target Quantity" type="number" value={newVariantQty} onChange={(e) => setNewVariantQty(Number(e.target.value))} required />
                    </div>
                    <div className="flex justify-end">
                      <Button size="sm" variant="secondary" type="submit" className="text-xs">+ Add Variant</Button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 4: DEPARTMENTS & OWNERS */}
              {activeTab === 'departments' && (
                <div className="space-y-6">
                  {/* Accountability Header */}
                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg space-y-4">
                    <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">Overall Master Accountability</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Accountable Department</label>
                        <Select
                          value={formData.department}
                          onChange={(e) => handleFieldChange('department', e.target.value)}
                          options={[
                            { value: 'Technical', label: 'Technical' },
                            { value: 'Design', label: 'Design & Creative' },
                            { value: 'Production', label: 'Production' },
                            { value: 'Site Operations', label: 'Site Operations' },
                            { value: 'Logistics', label: 'Logistics' },
                            { value: 'Commercial', label: 'Commercial / BOQ' },
                            { value: 'HSE', label: 'HSE / Safety' },
                            { value: 'Project Management', label: 'Project Management' },
                          ]}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Primary Accountable Owner (Directory)</label>
                        <Select
                          value={formData.ownerName}
                          onChange={(e) => {
                            const u = ALL_LOCAL_TEAM_USERS.find((x) => x.name === e.target.value);
                            handleFieldChange('ownerName', e.target.value);
                            handleFieldChange('ownerId', u?.id || '');
                          }}
                          options={ALL_LOCAL_TEAM_USERS.map((u) => ({
                            value: u.name,
                            label: `${u.name} (${u.role || u.department})`,
                          }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Work Packages Section */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">Departmental Work Packages</h3>
                      <p className="text-xs text-slate-400">
                        Multi-department fulfillment breakdown linked to this requirement.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleInstantiateTemplate}
                      disabled={isInstantiatingTemplate}
                      className="text-xs bg-indigo-600/30 border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/50"
                    >
                      {isInstantiatingTemplate ? 'Generating...' : '⚡ Apply Workflow Template'}
                    </Button>
                  </div>

                  {/* Work Packages Table */}
                  <div className="overflow-x-auto border border-slate-800 rounded-lg bg-slate-950/40">
                    <table className="w-full text-xs text-start">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                        <tr>
                          <th className="p-2.5">Work Package</th>
                          <th className="p-2.5">Department</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Progress</th>
                          <th className="p-2.5">Deliverable</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-200">
                        {workPackages.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-500">
                              No work packages generated yet. Click "Apply Workflow Template" above.
                            </td>
                          </tr>
                        ) : (
                          workPackages.map((w) => (
                            <tr key={w.id} className="hover:bg-slate-800/30">
                              <td className="p-2.5 font-medium text-slate-100">{w.title}</td>
                              <td className="p-2.5"><Badge variant="info">{w.department}</Badge></td>
                              <td className="p-2.5"><Badge variant={w.status === 'completed' ? 'success' : 'default'}>{w.status}</Badge></td>
                              <td className="p-2.5 font-bold">{w.progress}%</td>
                              <td className="p-2.5 text-slate-400 text-[11px]">{w.deliverables || '—'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: FULFILMENT BOM */}
              {activeTab === 'fulfilment' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">Approved Fulfilment Item List / BOM</h3>
                      <p className="text-xs text-slate-400">
                        Component parts and bill of materials requiring fabrication, procurement or rental.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleGenerateDraftBOM}
                      className="text-xs bg-amber-500 text-slate-950 font-bold"
                    >
                      Generate Draft BOM from Design
                    </Button>
                  </div>

                  {/* Batch Action Toolbar */}
                  {selectedBomIds.length > 0 && (
                    <div className="p-2.5 bg-indigo-950/40 border border-indigo-500/30 rounded-lg flex items-center justify-between text-xs">
                      <span className="font-bold text-indigo-300">{selectedBomIds.length} items selected</span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => handleBatchBOMAction('approve')} className="text-[11px]">Approve</Button>
                        <Button size="sm" variant="secondary" onClick={() => handleBatchBOMAction('release_to_production')} className="text-[11px] bg-emerald-600/30 text-emerald-300">Release to Workshop</Button>
                        <Button size="sm" variant="secondary" onClick={() => handleBatchBOMAction('reject')} className="text-[11px] text-rose-400">Reject</Button>
                      </div>
                    </div>
                  )}

                  {/* BOM Table */}
                  <div className="overflow-x-auto border border-slate-800 rounded-lg bg-slate-950/40">
                    <table className="w-full text-xs text-start">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                        <tr>
                          <th className="p-2.5 w-8">
                            <input
                              type="checkbox"
                              checked={selectedBomIds.length === fulfilmentItems.length && fulfilmentItems.length > 0}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedBomIds(fulfilmentItems.map((f) => f.id));
                                else setSelectedBomIds([]);
                              }}
                            />
                          </th>
                          <th className="p-2.5">Item Description</th>
                          <th className="p-2.5">Qty</th>
                          <th className="p-2.5">Make/Buy</th>
                          <th className="p-2.5">Department</th>
                          <th className="p-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-200">
                        {fulfilmentItems.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-slate-500">
                              No BOM items generated yet. Click "Generate Draft BOM from Design" above.
                            </td>
                          </tr>
                        ) : (
                          fulfilmentItems.map((f) => (
                            <tr key={f.id} className="hover:bg-slate-800/30">
                              <td className="p-2.5">
                                <input
                                  type="checkbox"
                                  checked={selectedBomIds.includes(f.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedBomIds([...selectedBomIds, f.id]);
                                    else setSelectedBomIds(selectedBomIds.filter((x) => x !== f.id));
                                  }}
                                />
                              </td>
                              <td className="p-2.5 font-medium text-slate-100">{f.itemDescription}</td>
                              <td className="p-2.5 font-bold">{f.quantity} {f.unit}</td>
                              <td className="p-2.5"><Badge variant="default">{f.classification?.toUpperCase() || 'MAKE'}</Badge></td>
                              <td className="p-2.5"><Badge variant="info">{f.department}</Badge></td>
                              <td className="p-2.5">
                                <Badge variant={f.status === 'released' ? 'success' : f.status === 'approved' ? 'info' : 'warning'}>
                                  {f.status}
                                </Badge>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 6: PRODUCTION BATCHES */}
              {activeTab === 'production' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">Production Batches & Destination Lineage</h3>
                      <p className="text-xs text-slate-400">
                        Track fabricated batches with precise allocation destinations (Zones & Locations).
                      </p>
                    </div>
                  </div>

                  {/* Batches Table */}
                  <div className="space-y-4">
                    {batches.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-slate-800 rounded-lg text-slate-500 text-xs">
                        No production batches released yet. Release an approved design variant from Tab 3.
                      </div>
                    ) : (
                      batches.map((b) => (
                        <div key={b.id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-amber-400 text-sm">{b.batchCode}</span>
                              <Badge variant={b.status === 'qc_passed' ? 'success' : 'default'}>{b.status}</Badge>
                            </div>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setSelectedBatchForProgress(b);
                                setBatchProducedInput(b.producedQuantity || b.releasedQuantity);
                                setBatchQcInput(b.qcPassedQuantity || b.releasedQuantity);
                                setIsBatchProgressModalOpen(true);
                              }}
                              className="text-xs"
                            >
                              Update Progress & QC
                            </Button>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="p-2 bg-slate-900 border border-slate-800 rounded">
                              <span className="text-slate-400 block text-[11px]">Released Units</span>
                              <span className="text-base font-bold text-slate-100">{b.releasedQuantity}</span>
                            </div>
                            <div className="p-2 bg-slate-900 border border-slate-800 rounded">
                              <span className="text-slate-400 block text-[11px]">Fabricated Units</span>
                              <span className="text-base font-bold text-amber-400">{b.producedQuantity}</span>
                            </div>
                            <div className="p-2 bg-slate-900 border border-slate-800 rounded">
                              <span className="text-slate-400 block text-[11px]">QC Passed Units</span>
                              <span className="text-base font-bold text-emerald-400">{b.qcPassedQuantity}</span>
                            </div>
                          </div>

                          {/* Destination Lineage Breakdown */}
                          {b.items && b.items.length > 0 && (
                            <div className="p-2.5 bg-slate-900/80 border border-slate-800/80 rounded space-y-1">
                              <div className="text-[11px] font-bold text-slate-400 uppercase">Allocation Destinations:</div>
                              <div className="flex flex-wrap gap-2">
                                {b.items.map((item: any, idx: number) => (
                                  <span key={idx} className="text-xs px-2 py-0.5 bg-slate-800 text-slate-200 rounded font-mono">
                                    {item.quantity} units → {item.destinationZone} ({item.destinationLocation})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 7: LOGISTICS & INSTALLATION */}
              {activeTab === 'logistics' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">Logistics Dispatch & On-Site Installation</h3>
                    <p className="text-xs text-slate-400">
                      Coordinate transport loads, site delivery receipts, installation progress, and final signoff.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg space-y-3">
                      <div className="text-xs font-bold text-slate-300">Dispatch & Delivery Status</div>
                      <div className="text-xs text-slate-400 space-y-1">
                        <div>Logistics Trip Status: <Badge variant="info">{reconciliation?.logisticsStatus || 'pending'}</Badge></div>
                        <div>Delivered to Venue: <strong className="text-slate-200">{reconciliation?.delivered || 0} units</strong></div>
                        <div>Dock Access Slot: <strong className="text-slate-200">Slot A (Lusail North Dock)</strong></div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg space-y-3">
                      <div className="text-xs font-bold text-slate-300">Site Installation & Handover</div>
                      <div className="text-xs text-slate-400 space-y-1">
                        <div>Installation Status: <Badge variant="success">{reconciliation?.installationStatus || 'not_started'}</Badge></div>
                        <div>Erected & Installed: <strong className="text-emerald-400">{reconciliation?.installed || 0} units</strong></div>
                        <div>Accepted by Client: <strong className="text-teal-300">{reconciliation?.accepted || 0} units</strong></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 8: CLARIFICATIONS / RFI */}
              {activeTab === 'clarifications' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">Linked Clarifications (RFIs)</h3>
                      <p className="text-xs text-slate-400">Questions submitted to client or consultants regarding this requirement.</p>
                    </div>
                    <Button size="sm" variant="primary" onClick={() => setIsRfiModalOpen(true)} className="text-xs bg-amber-500 text-slate-950 font-bold">
                      + Raise Clarification / RFI
                    </Button>
                  </div>
                  <div className="text-xs text-slate-400 p-4 border border-slate-800 rounded-lg bg-slate-950/40">
                    RFIs linked directly to this scope record will alert when answered and prompt controlled revisions.
                  </div>
                </div>
              )}

              {/* TAB 9: DOCUMENTS & MEDIA */}
              {activeTab === 'media' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">Evidence & Media Repository</h3>
                      <p className="text-xs text-slate-400">Upload and inspect controlled CAD drawings, calculations, and photos.</p>
                    </div>
                    <Button size="sm" variant="primary" onClick={() => setIsMediaModalOpen(true)} className="text-xs bg-amber-500 text-slate-950 font-bold">
                      + Upload Attachment
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {requirement.attachments?.map((att: any) => (
                      <div key={att.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-200">{att.fileName}</div>
                          <div className="text-[11px] text-slate-400">{att.mediaCategory} • {att.version || 'Rev 01'}</div>
                        </div>
                        <Badge variant="info">{att.approvalStatus}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 10: CHANGES & AUDIT */}
              {activeTab === 'audit' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">Immutable Revision & Quantity Delta History</h3>
                      <p className="text-xs text-slate-400">
                        Formal audit log of every baseline change, quantity delta (+4), approval, and override.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsQtyChangeModalOpen(true)}
                      className="text-xs border-amber-500/40 text-amber-400"
                    >
                      ⚡ Record Baseline Quantity Change
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {requirement.revisions?.map((rev: any, idx: number) => (
                      <div key={idx} className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-400 font-mono">Revision {rev.revisionNumber}</span>
                          <span className="text-slate-500 text-[11px]">{new Date(rev.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="text-slate-300"><strong>Reason:</strong> {rev.reasonForChange}</div>
                        {rev.impact && (
                          <div className="p-2 bg-slate-900 border border-slate-800 rounded text-slate-400 text-[11px] space-y-0.5">
                            {rev.impact.approvedVariation && <div><strong>Variation:</strong> {rev.impact.approvedVariation} units</div>}
                            {rev.impact.originalBaseline && <div><strong>Original Baseline:</strong> {rev.impact.originalBaseline} units</div>}
                            {rev.impact.currentRequirement && <div><strong>New Baseline:</strong> {rev.impact.currentRequirement} units</div>}
                            {rev.impact.designImpact && <div><strong>Design Impact:</strong> {rev.impact.designImpact}</div>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Quantity Change Delta Modal */}
        {isQtyChangeModalOpen && (
          <Modal isOpen={isQtyChangeModalOpen} onClose={() => setIsQtyChangeModalOpen(false)} title="Modify Baseline Quantity & Record Delta">
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-amber-300">
                Baseline Protection Rule: Modifying quantity creates a formal revision. Existing production batches and allocations will be preserved intact.
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Current Baseline Quantity: <strong>{requirement.quantity}</strong></label>
                <Input
                  label="New Target Required Quantity"
                  type="number"
                  value={newTargetQuantity}
                  onChange={(e) => setNewTargetQuantity(Number(e.target.value))}
                  required
                />
                <div className="mt-1 text-slate-400 font-bold">
                  Calculated Delta: <span className={newTargetQuantity - requirement.quantity >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {newTargetQuantity - requirement.quantity >= 0 ? `+${newTargetQuantity - requirement.quantity}` : `${newTargetQuantity - requirement.quantity}`}
                  </span>
                </div>
              </div>
              <Textarea
                label="Reason for Scope Variation"
                rows={3}
                value={qtyChangeReason}
                onChange={(e) => setQtyChangeReason(e.target.value)}
                required
              />
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button variant="ghost" onClick={() => setIsQtyChangeModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleExecuteQuantityChange} className="bg-amber-500 text-slate-950 font-bold">
                  Apply Baseline Delta
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Approve Variant Modal */}
        {isApproveVariantModalOpen && selectedVariantForAction && (
          <Modal isOpen={isApproveVariantModalOpen} onClose={() => setIsApproveVariantModalOpen(false)} title={`Approve Design Solution: ${selectedVariantForAction.name}`}>
            <div className="space-y-4 text-xs">
              <p className="text-slate-300">
                Approving this variant authorizes downstream BOM generation and partial production release.
              </p>
              <Input
                label="Quantity Approved for Production"
                type="number"
                value={variantApproveQty}
                onChange={(e) => setVariantApproveQty(Number(e.target.value))}
                required
              />
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button variant="ghost" onClick={() => setIsApproveVariantModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleApproveVariant} className="bg-emerald-600 font-bold">
                  Confirm Client / Technical Approval
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Release Variant Modal */}
        {isReleaseVariantModalOpen && selectedVariantForAction && (
          <Modal isOpen={isReleaseVariantModalOpen} onClose={() => setIsReleaseVariantModalOpen(false)} title={`Release to Production: ${selectedVariantForAction.name}`}>
            <div className="space-y-4 text-xs">
              <div className="p-2.5 bg-indigo-950/40 border border-indigo-500/30 rounded text-indigo-300">
                Approved Quantity: <strong>{selectedVariantForAction.approvedQuantity}</strong> · Already Released: <strong>{selectedVariantForAction.releasedQuantity || 0}</strong>
              </div>
              <Input
                label="Quantity to Release to Workshop"
                type="number"
                value={variantReleaseQty}
                onChange={(e) => setVariantReleaseQty(Number(e.target.value))}
                required
              />
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button variant="ghost" onClick={() => setIsReleaseVariantModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleReleaseVariant} className="bg-indigo-600 font-bold">
                  Confirm Production Release
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Split Allocation Modal */}
        {isSplitModalOpen && targetSplitAlloc && (
          <Modal isOpen={isSplitModalOpen} onClose={() => setIsSplitModalOpen(false)} title="Split Allocation into Multiple Locations">
            <div className="space-y-4 text-xs">
              <p className="text-slate-300">Total quantity to split: <strong>{targetSplitAlloc.quantity}</strong></p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Sub-Allocation 1 Qty" type="number" value={split1Qty} onChange={(e) => setSplit1Qty(Number(e.target.value))} />
                <Input label="Sub-Allocation 2 Qty" type="number" value={split2Qty} onChange={(e) => setSplit2Qty(Number(e.target.value))} />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button variant="ghost" onClick={() => setIsSplitModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleExecuteSplit}>Confirm Split</Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Batch Progress Modal */}
        {isBatchProgressModalOpen && selectedBatchForProgress && (
          <Modal isOpen={isBatchProgressModalOpen} onClose={() => setIsBatchProgressModalOpen(false)} title={`Update Progress: ${selectedBatchForProgress.batchCode}`}>
            <div className="space-y-4 text-xs">
              <Input label="Produced Units" type="number" value={batchProducedInput} onChange={(e) => setBatchProducedInput(Number(e.target.value))} />
              <Input label="QC Passed Units" type="number" value={batchQcInput} onChange={(e) => setBatchQcInput(Number(e.target.value))} />
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button variant="ghost" onClick={() => setIsBatchProgressModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleUpdateBatchProgress}>Record Execution</Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};
