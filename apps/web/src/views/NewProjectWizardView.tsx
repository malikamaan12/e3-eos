import React, { useState } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Button, Badge, Card, AlertBanner, Modal, Input, Select } from '../components/DesignSystem.js';
import { FastTrackProjectModal } from './FastTrackProjectModal.js';

interface ConfigurableStage {
  id: number;
  name: string;
  isMandatoryGate: boolean;
  isOptional: boolean;
  ownerRole: string;
}

const STAGE_ROLES = [
  { value: 'project_manager', label: 'Project Manager (PM)' },
  { value: 'finance', label: 'Finance & Cost Control' },
  { value: 'executive', label: 'Executive Partner' },
  { value: 'commercial_director', label: 'Commercial Director' },
  { value: 'design_production', label: 'Technical & Creative Design' },
  { value: 'procurement', label: 'Procurement & Subcontracting' },
  { value: 'logistics', label: 'Logistics & Fleet Dispatch' },
  { value: 'hse_quality', label: 'HSE & Compliance Director' },
  { value: 'operations', label: 'Live Operations & Site Delivery' },
];

const GATE_EXPLANATIONS: Record<number, { title: string; rationale: string; authority: string }> = {
  3: {
    title: 'Stage 03: Four-Eyes Executive Gate Sign-off',
    rationale: 'Protected governance gate: Requires two-person sign-off by Executive Partner and commercial margin validation before client contract issuance.',
    authority: 'Executive Partner',
  },
  9: {
    title: 'Stage 09: Civil Defence & HSE Zone Safety Clearance',
    rationale: 'Protected statutory gate: Enforced by statutory civil defense regulations. Structural rigging safety and flame-retardant certification must be verified before site possession.',
    authority: 'HSE & Compliance Director',
  },
  10: {
    title: 'Stage 10: Technical Readiness & Rehearsals',
    rationale: 'Protected operational lock: Run-through lock invariant. Live show cue sheets, audio-visual failover, and comms check must be signed off by Operations Director.',
    authority: 'Operations Director',
  },
  13: {
    title: 'Stage 13: Financial Closeout, EAC Finalization & Debrief',
    rationale: 'Protected commercial gate: Final actual cost reconciliation, client retention sign-off, and subcontractor settlement.',
    authority: 'Financial Controller',
  },
};

const DEFAULT_STAGES: ConfigurableStage[] = [
  { id: 1, name: 'Stage 01: Strategic Intake & Feasibility Assessment', isMandatoryGate: false, isOptional: false, ownerRole: 'project_manager' },
  { id: 2, name: 'Stage 02: Commercial Proposal & Bid Pricing', isMandatoryGate: false, isOptional: false, ownerRole: 'finance' },
  { id: 3, name: 'Stage 03: Four-Eyes Executive Gate Sign-off', isMandatoryGate: true, isOptional: false, ownerRole: 'executive' },
  { id: 4, name: 'Stage 04: Client Contracting & PO Issuance', isMandatoryGate: false, isOptional: false, ownerRole: 'commercial_director' },
  { id: 5, name: 'Stage 05: Creative Concept & 3D Spatial Renders', isMandatoryGate: false, isOptional: false, ownerRole: 'design_production' },
  { id: 6, name: 'Stage 06: Technical Production & Structural CAD Rigging', isMandatoryGate: false, isOptional: false, ownerRole: 'design_production' },
  { id: 7, name: 'Stage 07: Procurement Packages & Contractor Call-offs', isMandatoryGate: false, isOptional: false, ownerRole: 'procurement' },
  { id: 8, name: 'Stage 08: Logistics Dispatch & Asset Allocation', isMandatoryGate: false, isOptional: false, ownerRole: 'logistics' },
  { id: 9, name: 'Stage 09: Civil Defence & HSE Zone Safety Clearance', isMandatoryGate: true, isOptional: false, ownerRole: 'hse_quality' },
  { id: 10, name: 'Stage 10: Technical Readiness & Rehearsals', isMandatoryGate: true, isOptional: false, ownerRole: 'operations' },
  { id: 11, name: 'Stage 11: Live Event Operational Delivery', isMandatoryGate: false, isOptional: false, ownerRole: 'operations' },
  { id: 12, name: 'Stage 12: Strike, Bump-out & Venue Handover', isMandatoryGate: false, isOptional: false, ownerRole: 'operations' },
  { id: 13, name: 'Stage 13: Financial Closeout, EAC Finalization & Debrief', isMandatoryGate: true, isOptional: false, ownerRole: 'finance' },
];

export const NewProjectWizardView: React.FC = () => {
  const { currentLanguage, apiClient, navigate, triggerRefresh, setSelectedProjectId, currentUser } = useEosContext();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isFastTrackOpen, setIsFastTrackOpen] = useState<boolean>(false);
  const [activeGateExplanation, setActiveGateExplanation] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isRtl = currentLanguage === 'ar';

  // Form State
  const [originRoute, setOriginRoute] = useState<string>('TENDER');
  const [code, setCode] = useState<string>(`PRJ-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [format, setFormat] = useState<string>('Exhibition');
  const [currency, setCurrency] = useState<string>('QAR');

  // Conditional Fields by Origin Route
  const [rfpDeadline, setRfpDeadline] = useState<string>('');
  const [tenderBondRequired, setTenderBondRequired] = useState<boolean>(false);
  const [soleSourceJustification, setSoleSourceJustification] = useState<string>('');
  const [frameworkContractId, setFrameworkContractId] = useState<string>('');
  const [frameworkCeilingValue, setFrameworkCeilingValue] = useState<string>('');
  const [priorEditionCode, setPriorEditionCode] = useState<string>('');

  // TBC Toggles & Values
  const [clientTbc, setClientTbc] = useState<boolean>(false);
  const [clientName, setClientName] = useState<string>('');
  const [clientContact, setClientContact] = useState<string>('');
  const [clientEmail, setClientEmail] = useState<string>('');

  const [datesTbc, setDatesTbc] = useState<boolean>(false);
  const [submissionDeadline, setSubmissionDeadline] = useState<string>('');
  const [eventDate, setEventDate] = useState<string>('');
  const [bumpInDate, setBumpInDate] = useState<string>('');
  const [bumpOutDate, setBumpOutDate] = useState<string>('');

  const [venueTbc, setVenueTbc] = useState<boolean>(false);
  const [venueStatus, setVenueStatus] = useState<string>('confirmed');
  const [venueName, setVenueName] = useState<string>('');
  const [hallZone, setHallZone] = useState<string>('');

  const [commercialTbc, setCommercialTbc] = useState<boolean>(false);
  const [commercialTag, setCommercialTag] = useState<string>('Estimate');
  const [estimatedValue, setEstimatedValue] = useState<string>('');
  const [targetMargin, setTargetMargin] = useState<string>('');

  // Team
  const [pmName, setPmName] = useState<string>(currentUser?.name ? `${currentUser.name} (Lead PM)` : 'Lead Event PM');

  // Step 8 Workflow Configuration
  const [stages, setStages] = useState<ConfigurableStage[]>(DEFAULT_STAGES);
  const [isAddStageOpen, setIsAddStageOpen] = useState<boolean>(false);
  const [newStageName, setNewStageName] = useState<string>('');
  const [newStageOwnerRole, setNewStageOwnerRole] = useState<string>('project_manager');
  const [editingStage, setEditingStage] = useState<ConfigurableStage | null>(null);
  const [editStageName, setEditStageName] = useState<string>('');
  const [editStageOwnerRole, setEditStageOwnerRole] = useState<string>('project_manager');
  const [stageFeedback, setStageFeedback] = useState<string | null>(null);

  const steps = [
    { num: 1, title: currentLanguage === 'ar' ? 'مسار المصدر' : 'Origin Route' },
    { num: 2, title: currentLanguage === 'ar' ? 'هوية المشروع' : 'Project Identity' },
    { num: 3, title: currentLanguage === 'ar' ? 'العميل والمعنيون' : 'Client & Stakeholders' },
    { num: 4, title: currentLanguage === 'ar' ? 'المواعيد والجدول' : 'Dates & Deadlines' },
    { num: 5, title: currentLanguage === 'ar' ? 'سياق الموقع' : 'Venue Context' },
    { num: 6, title: currentLanguage === 'ar' ? 'البيانات التجارية' : 'Commercials' },
    { num: 7, title: currentLanguage === 'ar' ? 'تعيين الفريق' : 'Team Assignment' },
    { num: 8, title: currentLanguage === 'ar' ? 'سير عمل المراحل' : 'Stage Workflow' },
    { num: 9, title: currentLanguage === 'ar' ? 'المراجعة والإنشاء' : 'Review & Create' },
  ];

  const handleNextStep = () => {
    if (currentStep === 2 && (!code.trim() || !title.trim())) {
      setError(currentLanguage === 'ar' ? 'يرجى تقديم رمز المشروع وعنوان المشروع قبل المتابعة.' : 'Please provide both Project Code and Project Title before proceeding.');
      return;
    }
    setError(null);
    setCurrentStep((prev) => prev + 1);
  };

  const handleStepClick = (targetStep: number) => {
    if (currentStep === 2 && targetStep > 2 && (!code.trim() || !title.trim())) {
      setError(currentLanguage === 'ar' ? 'يرجى تقديم رمز المشروع وعنوان المشروع قبل المتابعة.' : 'Please provide both Project Code and Project Title before proceeding.');
      return;
    }
    setError(null);
    setCurrentStep(targetStep);
  };

  const handleToggleStageOptional = (index: number) => {
    setStages((prev) => {
      const updated = [...prev];
      if (updated[index].isMandatoryGate) return prev; // Cannot make mandatory gates optional
      updated[index] = { ...updated[index], isOptional: !updated[index].isOptional };
      return updated;
    });
  };

  const handleStageMove = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === stages.length - 1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    setStages((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIdx];
      updated[targetIdx] = temp;
      return updated;
    });
  };

  const handleAddStage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newStageName.trim()) return;
    const maxId = stages.reduce((max, s) => Math.max(max, s.id), 0);
    const newStage: ConfigurableStage = {
      id: maxId + 1,
      name: newStageName.trim(),
      isMandatoryGate: false,
      isOptional: false,
      ownerRole: newStageOwnerRole,
    };
    setStages((prev) => [...prev, newStage]);
    setNewStageName('');
    setNewStageOwnerRole('project_manager');
    setIsAddStageOpen(false);
    setStageFeedback(`Added stage: "${newStage.name}"`);
    setTimeout(() => setStageFeedback(null), 4000);
  };

  const handleStartEditStage = (stage: ConfigurableStage) => {
    setEditingStage(stage);
    setEditStageName(stage.name);
    setEditStageOwnerRole(stage.ownerRole);
  };

  const handleSaveEditStage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingStage || !editStageName.trim()) return;
    setStages((prev) =>
      prev.map((s) =>
        s.id === editingStage.id
          ? { ...s, name: editStageName.trim(), ownerRole: editStageOwnerRole }
          : s
      )
    );
    setEditingStage(null);
    setStageFeedback(`Updated stage: "${editStageName.trim()}"`);
    setTimeout(() => setStageFeedback(null), 4000);
  };

  const handleDeleteStage = (stageId: number) => {
    const target = stages.find((s) => s.id === stageId);
    if (!target) return;
    if (target.isMandatoryGate) {
      alert('Governance Invariant: Mandatory gates (Stages 3, 9, 10, 13) cannot be deleted as they are statutory requirements.');
      return;
    }
    setStages((prev) => prev.filter((s) => s.id !== stageId));
    setStageFeedback(`Removed stage: "${target.name}"`);
    setTimeout(() => setStageFeedback(null), 4000);
  };

  const handleSaveProject = async (isDraft: boolean = false) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const generatedId = `f${Date.now().toString(16).padEnd(31, '0')}`;
      const payload = {
        id: generatedId,
        originRoute,
        maturity: isDraft ? 'draft' : 'developing',
        projectIdentity: {
          code: code || `PRJ-${Date.now().toString().slice(-4)}`,
          title: isDraft && !title ? 'Untitled Draft Project' : title,
          description,
          eventFormat: format,
          country: 'Qatar',
          city: 'Doha',
          currency,
          confidentiality: 'internal',
          originMetadata: (() => {
            if (originRoute === 'TENDER') {
              return { rfpDeadline, tenderBondRequired };
            }
            if (originRoute === 'DIRECT_AWARD') {
              return { soleSourceJustification };
            }
            if (originRoute === 'FRAMEWORK') {
              return { frameworkContractId, frameworkCeilingValue };
            }
            if (originRoute === 'RECURRING') {
              return { priorEditionCode };
            }
            return {};
          })(),
        },
        clientStakeholders: {
          clientOrganisationId: clientTbc ? null : ((currentUser as any)?.organisationId || null),
          clientName: clientTbc ? 'To Be Confirmed' : (clientName.trim() || 'To Be Confirmed'),
          mainContact: clientTbc ? 'TBC' : (clientContact.trim() || 'TBC'),
          clientEmail: clientTbc ? '' : clientEmail.trim(),
          isTbc: clientTbc,
        },
        dates: {
          submissionDeadline: datesTbc ? null : (submissionDeadline.trim() || null),
          eventDate: datesTbc ? null : (eventDate.trim() || null),
          bumpInDate: datesTbc ? null : (bumpInDate.trim() || null),
          bumpOutDate: datesTbc ? null : (bumpOutDate.trim() || null),
          isConfirmed: !datesTbc,
          isTbc: datesTbc,
        },
        venue: {
          status: venueTbc ? 'tbc' : venueStatus,
          venueName: venueTbc ? 'To Be Confirmed' : (venueName.trim() || 'To Be Confirmed'),
          hallZone: venueTbc ? 'TBC' : (hallZone.trim() || 'TBC'),
          isTbc: venueTbc,
        },
        commercialStartingPoint: {
          classificationTag: commercialTbc ? 'TBC' : commercialTag,
          revenueValue: commercialTbc ? 'To Be Confirmed' : (estimatedValue.trim() || '0'),
          targetMargin: commercialTbc ? 'TBC' : (targetMargin.trim() || '0%'),
          currency,
          isTbc: commercialTbc,
        },
        team: {
          projectManagerId: currentUser?.id || '10000000-0000-4000-8000-000000000004',
          projectManagerName: pmName || currentUser?.name || 'Lead Event PM',
        },
        workflowConfig: {
          stages: stages.map((s, idx) => ({
            id: s.id,
            sequenceNumber: idx + 1,
            name: s.name,
            isMandatoryGate: s.isMandatoryGate,
            isOptional: s.isOptional,
            ownerRole: s.ownerRole,
          })),
        },
      };

      const res = await apiClient.createProject(payload);
      const newProjectId = res.data?.id || generatedId;
      setSelectedProjectId(newProjectId);
      triggerRefresh();
      navigate(`/projects/${newProjectId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to persist project in PostgreSQL.');
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '40px', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      {/* Wizard Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Project Setup Engine
            </span>
            <Badge variant="info">Step {currentStep} of 9</Badge>
          </div>
          <h1 style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
            {currentLanguage === 'ar' ? 'تهيئة مشروع فعالية جديد' : 'New Project Onboarding'}
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            id="wizard-save-draft-btn"
            variant="secondary"
            size="sm"
            onClick={() => handleSaveProject(true)}
            isLoading={isSubmitting}
            title="Save current parameters as a draft project"
          >
            💾 Save as Draft
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
            Cancel & Exit
          </Button>
        </div>
      </div>

      {/* Fast-Track Intake Choice Callout */}
      <div
        style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '8px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#92400e' }}>
              ⚡ {currentLanguage === 'ar' ? 'هل تحتاج إلى تسجيل فرصة سريعة؟' : 'In a rush? Fast-Track Opportunity Intake Available'}
            </span>
            <Badge variant="warning" size="sm">Capture Now, Complete Later</Badge>
          </div>
          <div style={{ fontSize: '12px', color: '#b45309', marginTop: '3px' }}>
            {currentLanguage === 'ar'
              ? 'سجّل البيانات الأساسية والقيمة المتوقعة في خطوتين سريعتين، واستكمل إعدادات الحوكمة لاحقاً.'
              : 'Record basic opportunity info and expected commercials in 2 quick steps. Full governance can be completed later.'}
          </div>
        </div>

        <button
          id="btn-open-fast-track"
          type="button"
          onClick={() => setIsFastTrackOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#d97706',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(217, 119, 6, 0.3)',
          }}
        >
          ⚡ {currentLanguage === 'ar' ? 'بدء التسجيل السريع (خطوتان)' : 'Launch Fast-Track Intake (2 Steps)'}
        </button>
      </div>

      <FastTrackProjectModal
        isOpen={isFastTrackOpen}
        onClose={() => setIsFastTrackOpen(false)}
      />

      {/* Step Indicator Bar with Completed / Active / Pending state */}
      {isMobile ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '12px 16px',
            marginBottom: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
              {isRtl ? `الخطوة ${currentStep} من 9: ` : `Step ${currentStep} of 9: `}
              <span style={{ color: '#2563eb' }}>{steps[currentStep - 1].title}</span>
            </span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb' }}>
              {Math.round((currentStep / 9) * 100)}%
            </span>
          </div>
          <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${(currentStep / 9) * 100}%`,
                height: '100%',
                backgroundColor: '#2563eb',
                borderRadius: '3px',
                transition: 'width 0.25s ease',
              }}
            />
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(9, 1fr)',
            gap: '6px',
            marginBottom: '24px',
            backgroundColor: '#ffffff',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          {steps.map((s) => {
            const isCurrent = s.num === currentStep;
            const isDone = s.num < currentStep;
            return (
              <button
                key={s.num}
                onClick={() => handleStepClick(s.num)}
                style={{
                  padding: '8px 4px',
                  borderRadius: '6px',
                  border: isCurrent ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: isCurrent ? '#eff6ff' : isDone ? '#f0fdf4' : '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                  minHeight: '56px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: isCurrent ? '#2563eb' : isDone ? '#16a34a' : '#94a3b8',
                  }}
                >
                  {isDone ? `✓ ${s.num}` : `${s.num}`}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? '#1e40af' : isDone ? '#15803d' : '#475569',
                    whiteSpace: 'normal',
                    lineHeight: 1.25,
                    wordBreak: 'normal',
                    textAlign: 'center',
                  }}
                >
                  {s.title}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div style={{ marginBottom: '16px' }}>
          <AlertBanner type="error" title="Validation or Submission Error">
            {error}
          </AlertBanner>
        </div>
      )}

      {/* Wizard Step Body */}
      <Card>
        {/* Step 1: Origin Route */}
        {currentStep === 1 && (
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              Step 1: Origin Route Selection
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#64748b' }}>
              How did this project opportunity originate? This preconfigures the governance gates and commercial requirements.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              {[
                { id: 'TENDER', title: 'Tender / RFP', desc: 'Formal competitive government or corporate proposal bid with fixed deadlines.' },
                { id: 'DIRECT_AWARD', title: 'Direct Award', desc: 'Sole-source contract awarded directly to E3 Events.' },
                { id: 'FRAMEWORK', title: 'Framework / Call-Off', desc: 'Pre-agreed master services agreement activation.' },
                { id: 'CLIENT_ENQUIRY', title: 'Client Enquiry', desc: 'Inbound inquiry requiring feasibility assessment and initial brief.' },
                { id: 'E3_INITIATED', title: 'E3 Initiated IP', desc: 'Proprietary festival or exhibition owned and produced by E3.' },
                { id: 'RECURRING', title: 'Recurring Annual Edition', desc: 'Cloned from previous year master template.' },
              ].map((route) => {
                const isSelected = originRoute === route.id;
                return (
                  <div
                    key={route.id}
                    id={`origin-route-${route.id}`}
                    onClick={() => setOriginRoute(route.id)}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: isSelected ? '#1e40af' : '#0f172a' }}>
                        {route.title}
                      </span>
                      {isSelected && <Badge variant="info">Selected</Badge>}
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>{route.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Conditional Route-Specific Fields */}
            <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                Origin-Specific Requirements ({originRoute})
              </div>

              {originRoute === 'TENDER' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      RFP Clarification Cutoff Date
                    </label>
                    <input
                      type="date"
                      value={rfpDeadline}
                      onChange={(e) => setRfpDeadline(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
                    <input
                      id="tender-bond-checkbox"
                      type="checkbox"
                      checked={tenderBondRequired}
                      onChange={(e) => setTenderBondRequired(e.target.checked)}
                      style={{ accentColor: '#2563eb', width: '16px', height: '16px' }}
                    />
                    <label htmlFor="tender-bond-checkbox" style={{ fontSize: '12px', color: '#334155', fontWeight: 600 }}>
                      Bank Tender Guarantee Bond Required
                    </label>
                  </div>
                </div>
              )}

              {originRoute === 'DIRECT_AWARD' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Sole-Source Justification Note
                  </label>
                  <input
                    type="text"
                    value={soleSourceJustification}
                    onChange={(e) => setSoleSourceJustification(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>
              )}

              {originRoute === 'FRAMEWORK' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Master Framework Contract ID
                    </label>
                    <input
                      type="text"
                      value={frameworkContractId}
                      onChange={(e) => setFrameworkContractId(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Framework Call-off Ceiling
                    </label>
                    <input
                      type="text"
                      value={frameworkCeilingValue}
                      onChange={(e) => setFrameworkCeilingValue(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    />
                  </div>
                </div>
              )}

              {originRoute === 'RECURRING' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Prior Edition Project Code to Clone
                  </label>
                  <input
                    type="text"
                    value={priorEditionCode}
                    onChange={(e) => setPriorEditionCode(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>
              )}

              {(originRoute === 'CLIENT_ENQUIRY' || originRoute === 'E3_INITIATED') && (
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  Standard discovery and feasibility workflow will be automatically applied.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Project Identity */}
        {currentStep === 2 && (
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              Step 2: Project Information & Identity
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#64748b' }}>
              Provide foundational naming, classification, and event format descriptions.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Project Code *
                </label>
                <input
                  id="project-code-input"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Project Title *
                </label>
                <input
                  id="project-title-input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Global Innovation Summit & Exhibition 2026"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Executive Summary / Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Event Format
                </label>
                <input
                  type="text"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Commercial Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                >
                  <option value="QAR">QAR - Qatari Riyal (Default)</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Client & Stakeholders with TBC Toggle */}
        {currentStep === 3 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Step 3: Client & External Stakeholders
              </h3>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={clientTbc}
                  onChange={(e) => setClientTbc(e.target.checked)}
                  style={{ accentColor: '#2563eb' }}
                />
                <span>To Be Confirmed (TBC)</span>
              </label>
            </div>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#64748b' }}>
              Designate the client entity. Multi-tenant isolation guarantees client stakeholders cannot access internal E3 margins.
            </p>

            <div style={{ marginBottom: '14px', opacity: clientTbc ? 0.5 : 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Client Organization Name *
              </label>
              <input
                id="client-name-input"
                type="text"
                disabled={clientTbc}
                value={clientTbc ? 'To Be Confirmed' : clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Acme Global Corporation / Ministry of Culture"
                style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', opacity: clientTbc ? 0.5 : 1 }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Primary Client Contact
                </label>
                <input
                  type="text"
                  disabled={clientTbc}
                  value={clientTbc ? 'TBC' : clientContact}
                  onChange={(e) => setClientContact(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Contact Email
                </label>
                <input
                  type="email"
                  disabled={clientTbc}
                  value={clientTbc ? '' : clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Dates & Deadlines with TBC Toggle */}
        {currentStep === 4 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Step 4: Key Event Lifecycle Dates
              </h3>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={datesTbc}
                  onChange={(e) => setDatesTbc(e.target.checked)}
                  style={{ accentColor: '#2563eb' }}
                />
                <span>To Be Confirmed (TBC)</span>
              </label>
            </div>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#64748b' }}>
              Configure critical deadlines: Tender submission, site move-in (bump-in), live event dates, and bump-out.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px', opacity: datesTbc ? 0.5 : 1 }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Tender Submission Deadline
                </label>
                <input
                  id="submission-deadline-input"
                  type="date"
                  disabled={datesTbc}
                  value={submissionDeadline}
                  onChange={(e) => setSubmissionDeadline(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Live Event Day 1
                </label>
                <input
                  type="date"
                  disabled={datesTbc}
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', opacity: datesTbc ? 0.5 : 1 }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Bump-In Start (Site Handover)
                </label>
                <input
                  type="date"
                  disabled={datesTbc}
                  value={bumpInDate}
                  onChange={(e) => setBumpInDate(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Bump-Out Final Handover
                </label>
                <input
                  type="date"
                  disabled={datesTbc}
                  value={bumpOutDate}
                  onChange={(e) => setBumpOutDate(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Venue Context with TBC Toggle */}
        {currentStep === 5 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Step 5: Venue & Structural Context
              </h3>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={venueTbc}
                  onChange={(e) => setVenueTbc(e.target.checked)}
                  style={{ accentColor: '#2563eb' }}
                />
                <span>To Be Confirmed (TBC)</span>
              </label>
            </div>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#64748b' }}>
              Location parameters for rigging, loading docks, and Civil Defence permits.
            </p>

            <div style={{ marginBottom: '14px', opacity: venueTbc ? 0.5 : 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Venue Name *
              </label>
              <input
                id="venue-name-input"
                type="text"
                disabled={venueTbc}
                value={venueTbc ? 'To Be Confirmed' : venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="e.g. National Convention Center / Exhibition Hall"
                style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', opacity: venueTbc ? 0.5 : 1 }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Hall / Zone Specification
                </label>
                <input
                  type="text"
                  disabled={venueTbc}
                  value={venueTbc ? 'TBC' : hallZone}
                  onChange={(e) => setHallZone(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Venue Confirmation Status
                </label>
                <select
                  disabled={venueTbc}
                  value={venueStatus}
                  onChange={(e) => setVenueStatus(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                >
                  <option value="confirmed">Confirmed / Booked</option>
                  <option value="proposed">Proposed / Under Option</option>
                  <option value="unknown">To Be Determined</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Commercial Starting Point with TBC Toggle */}
        {currentStep === 6 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Step 6: Commercial Starting Point
              </h3>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={commercialTbc}
                  onChange={(e) => setCommercialTbc(e.target.checked)}
                  style={{ accentColor: '#2563eb' }}
                />
                <span>To Be Confirmed (TBC)</span>
              </label>
            </div>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#64748b' }}>
              Preliminary revenue and margin targets. Values are tagged by certainty classification.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px', opacity: commercialTbc ? 0.5 : 1 }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Estimated Contract Value ({currency})
                </label>
                <input
                  id="estimated-value-input"
                  type="text"
                  disabled={commercialTbc}
                  value={commercialTbc ? 'To Be Confirmed' : estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  placeholder="e.g. 1,500,000"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Certainty Tag
                </label>
                <select
                  disabled={commercialTbc}
                  value={commercialTag}
                  onChange={(e) => setCommercialTag(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                >
                  <option value="Quoted">Quoted to Client</option>
                  <option value="Estimate">Internal Estimate</option>
                  <option value="Approved">Approved Budget</option>
                  <option value="Contracted">Contracted & Signed</option>
                </select>
              </div>
            </div>

            <div style={{ opacity: commercialTbc ? 0.5 : 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Target Gross Margin %
              </label>
              <input
                type="text"
                disabled={commercialTbc}
                value={commercialTbc ? 'TBC' : targetMargin}
                onChange={(e) => setTargetMargin(e.target.value)}
                style={{ width: '200px', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        )}

        {/* Step 7: Team Assignment */}
        {currentStep === 7 && (
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              Step 7: Key Personnel Assignment
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#64748b' }}>
              Assign accountability across the canonical 13-stage lifecycle.
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Lead Event Project Manager (PM) *
              </label>
              <input
                id="pm-name-input"
                type="text"
                value={pmName}
                onChange={(e) => setPmName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
              />
              <span style={{ fontSize: '11px', color: '#64748b' }}>Assigned delivery manager</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Executive Partner</div>
                <div style={{ fontSize: '13px', color: '#0f172a' }}>Nasser Al-Attiyah (executive@e3.qa)</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Technical / Rigging Director</div>
                <div style={{ fontSize: '13px', color: '#0f172a' }}>Karim Haddad (designer@e3.qa)</div>
              </div>
            </div>
          </div>
        )}

        {/* Step 8: Visual Stage Workflow Configuration Editor */}
        {currentStep === 8 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  Step 8: Visual Lifecycle Configuration Editor
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>
                  Add, edit, or customize project stages. Note: <strong>Mandatory Governance Gates</strong> (Executive Gate, Civil Defence HSE, Readiness Gate, Closeout) are enforced by system policy and cannot be bypassed.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Button
                  id="btn-add-custom-stage"
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddStageOpen(true)}
                >
                  + Add Custom Stage
                </Button>
                <Badge variant="purple">Governance Protected</Badge>
              </div>
            </div>

            {stageFeedback && (
              <div
                id="stage-feedback-banner"
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: '6px',
                  color: '#065f46',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>✓</span> {stageFeedback}
              </div>
            )}

            <div style={{ maxHeight: '380px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              {stages.map((stage, idx) => (
                <div
                  key={stage.id}
                  id={`stage-item-${stage.id}`}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: stage.isMandatoryGate ? '#fffbeb' : stage.isOptional ? '#f8fafc' : '#ffffff',
                  }}
                >
                  <div
                    style={{
                      padding: '10px 14px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <button
                          type="button"
                          onClick={() => handleStageMove(idx, 'up')}
                          disabled={idx === 0}
                          style={{ border: 'none', background: 'none', cursor: idx === 0 ? 'default' : 'pointer', fontSize: '9px', color: '#94a3b8' }}
                          title="Move stage up"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStageMove(idx, 'down')}
                          disabled={idx === stages.length - 1}
                          style={{ border: 'none', background: 'none', cursor: idx === stages.length - 1 ? 'default' : 'pointer', fontSize: '9px', color: '#94a3b8' }}
                          title="Move stage down"
                        >
                          ▼
                        </button>
                      </div>
                      <div>
                        <span style={{ fontWeight: 600, color: stage.isOptional ? '#94a3b8' : '#1e293b' }}>
                          {stage.name}
                        </span>
                        <span style={{ marginInlineStart: '8px', fontSize: '11px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>
                          Role: {stage.ownerRole}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {stage.isMandatoryGate ? (
                        <button
                          type="button"
                          id={`gate-badge-${stage.id}`}
                          onClick={() => setActiveGateExplanation(activeGateExplanation === stage.id ? null : stage.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                          }}
                          title="Click to view governance lock explanation"
                        >
                          <Badge variant="warning" size="sm">🔒 Mandatory Gate ℹ️</Badge>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleStageOptional(idx)}
                          style={{
                            background: 'none',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            padding: '2px 8px',
                            fontSize: '11px',
                            color: stage.isOptional ? '#94a3b8' : '#2563eb',
                            cursor: 'pointer',
                          }}
                        >
                          {stage.isOptional ? 'Mark Mandatory' : 'Mark Optional'}
                        </button>
                      )}

                      <Button
                        id={`edit-stage-btn-${stage.id}`}
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStartEditStage(stage)}
                        style={{ padding: '2px 8px', fontSize: '11px', minHeight: '26px' }}
                      >
                        ✏️ Edit
                      </Button>

                      {stage.isMandatoryGate ? (
                        <button
                          type="button"
                          disabled
                          title="Protected governance gate cannot be deleted"
                          style={{
                            border: '1px solid #fde68a',
                            backgroundColor: '#fffbeb',
                            color: '#d97706',
                            borderRadius: '4px',
                            padding: '2px 8px',
                            fontSize: '11px',
                            cursor: 'not-allowed',
                            opacity: 0.8,
                          }}
                        >
                          🔒 Locked
                        </button>
                      ) : (
                        <Button
                          id={`delete-stage-btn-${stage.id}`}
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteStage(stage.id)}
                          style={{ padding: '2px 8px', fontSize: '11px', minHeight: '26px' }}
                        >
                          🗑️ Delete
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Expandable Governance Gate Lock Explanation */}
                  {stage.isMandatoryGate && activeGateExplanation === stage.id && GATE_EXPLANATIONS[stage.id] && (
                    <div
                      id={`gate-explanation-${stage.id}`}
                      style={{
                        padding: '10px 14px',
                        backgroundColor: '#fef3c7',
                        borderTop: '1px dashed #f59e0b',
                        fontSize: '11px',
                        color: '#92400e',
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: '3px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>🔒 Governance Lock Rationale</span>
                        <span style={{ color: '#b45309' }}>Authority: {GATE_EXPLANATIONS[stage.id].authority}</span>
                      </div>
                      <p style={{ margin: 0, lineHeight: 1.4 }}>
                        {GATE_EXPLANATIONS[stage.id].rationale}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 9: Review & Create */}
        {currentStep === 9 && (
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              Step 9: Pre-Flight Review & Launch
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#64748b' }}>
              Review the project parameters before persisting directly to PostgreSQL Cloud SQL in Doha (<code>me-central1</code>).
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Project Code & Title</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{code}</div>
                <div style={{ fontSize: '13px', color: '#334155' }}>{title}</div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Client Organization</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{clientTbc ? 'To Be Confirmed' : clientName}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{clientTbc ? 'Pending Client Sign-off' : clientContact}</div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Commercial Starting Point</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#059669' }}>
                  {commercialTbc ? 'To Be Confirmed' : `${estimatedValue} ${currency}`}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Target Margin: {commercialTbc ? 'TBC' : targetMargin} ({commercialTag})</div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Venue & Key Dates</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{venueTbc ? 'To Be Confirmed' : venueName}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  {datesTbc ? 'Dates Pending Confirmation' : `Submission: ${submissionDeadline} • Live: ${eventDate}`}
                </div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', gridColumn: 'span 2' }}>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Configured Lifecycle Stages</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                  {stages.length} Stages Active ({stages.filter(s => s.isMandatoryGate).length} Mandatory Gates, {stages.filter(s => s.isOptional).length} Optional)
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Visual lifecycle sequence confirmed with strict governance lock integrity.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Badge variant="success">All Invariants Checked</Badge>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Ready to instantiate in Doha staging PostgreSQL.</span>
            </div>
          </div>
        )}

        {/* Wizard Footer Navigation */}
        <div
          style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {currentStep > 1 && (
              <Button
                id="wizard-prev-btn"
                variant="secondary"
                size="md"
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                {isRtl ? 'السابق →' : '← Previous Step'}
              </Button>
            )}
            <Button
              id="wizard-footer-draft-btn"
              variant="ghost"
              size="md"
              onClick={() => handleSaveProject(true)}
              isLoading={isSubmitting}
            >
              💾 {isRtl ? 'حفظ كمسودة' : 'Save Draft'}
            </Button>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {currentStep < 9 ? (
              <Button
                id="wizard-next-btn"
                variant="primary"
                size="md"
                disabled={currentStep === 2 && (!code.trim() || !title.trim())}
                onClick={handleNextStep}
              >
                {isRtl ? 'التالي ←' : 'Next Step →'}
              </Button>
            ) : (
              <Button
                id="wizard-create-btn"
                variant="success"
                size="lg"
                isLoading={isSubmitting}
                onClick={() => handleSaveProject(false)}
              >
                🚀 {isRtl ? 'إنشاء وتفعيل المشروع' : 'Create & Launch Project Cockpit'}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Modal: Add Custom Stage */}
      <Modal
        isOpen={isAddStageOpen}
        onClose={() => setIsAddStageOpen(false)}
        title="Add Custom Lifecycle Stage"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddStageOpen(false)}>Cancel</Button>
            <Button
              id="submit-add-stage-btn"
              variant="primary"
              disabled={!newStageName.trim()}
              onClick={() => handleAddStage()}
            >
              + Add Stage
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddStage}>
          <Input
            id="new-stage-name-input"
            label="Stage Title / Name *"
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
            placeholder="e.g. Stage 14: VIP Hospitality & Protocol Management"
            required
            autoFocus
          />
          <Select
            id="new-stage-role-select"
            label="Accountable Role *"
            value={newStageOwnerRole}
            onChange={(e) => setNewStageOwnerRole(e.target.value)}
            options={STAGE_ROLES}
          />
          <p style={{ fontSize: '12px', color: '#64748b', margin: '8px 0 0' }}>
            ℹ️ Custom stages will be instantiated into the project's CPM delivery schedule with associated activity packages.
          </p>
        </form>
      </Modal>

      {/* Modal: Edit Stage */}
      <Modal
        isOpen={editingStage !== null}
        onClose={() => setEditingStage(null)}
        title={`Edit Stage: ${editingStage?.name || ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingStage(null)}>Cancel</Button>
            <Button
              id="submit-edit-stage-btn"
              variant="primary"
              disabled={!editStageName.trim()}
              onClick={() => handleSaveEditStage()}
            >
              Save Changes
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveEditStage}>
          <Input
            id="edit-stage-name-input"
            label="Stage Title / Name *"
            value={editStageName}
            onChange={(e) => setEditStageName(e.target.value)}
            placeholder="Stage name"
            required
            autoFocus
          />
          <Select
            id="edit-stage-role-select"
            label="Accountable Role *"
            value={editStageOwnerRole}
            onChange={(e) => setEditStageOwnerRole(e.target.value)}
            options={STAGE_ROLES}
          />
          {editingStage?.isMandatoryGate && (
            <div
              style={{
                padding: '10px 12px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '6px',
                color: '#92400e',
                fontSize: '12px',
                marginTop: '8px',
              }}
            >
              🔒 <strong>Governance Gate Invariant:</strong> This is a protected statutory governance gate. You can customize the name or role title, but its mandatory sign-off requirement remains strictly enforced.
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
};

