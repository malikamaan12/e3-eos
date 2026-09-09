import React, { useState } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Button, Badge, Card, AlertBanner } from '../components/DesignSystem.js';

interface ConfigurableStage {
  id: number;
  name: string;
  isMandatoryGate: boolean;
  isOptional: boolean;
  ownerRole: string;
}

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
  const { currentLanguage, apiClient, navigate, triggerRefresh, setSelectedProjectId } = useEosContext();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [originRoute, setOriginRoute] = useState<string>('TENDER');
  const [code, setCode] = useState<string>(`PRJ-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`);
  const [title, setTitle] = useState<string>('Qatar Tourism Demo Tender');
  const [description, setDescription] = useState<string>('Comprehensive turnkey event management for international tourism showcase in Doha.');
  const [format, setFormat] = useState<string>('Exhibition & Gala Dinner');
  const [currency, setCurrency] = useState<string>('QAR');

  // Conditional Fields by Origin Route
  const [rfpDeadline, setRfpDeadline] = useState<string>('2026-10-15');
  const [tenderBondRequired, setTenderBondRequired] = useState<boolean>(true);
  const [soleSourceJustification, setSoleSourceJustification] = useState<string>('E3 has exclusive regional IP agreements for the immersive stage system.');
  const [frameworkContractId, setFrameworkContractId] = useState<string>('MSA-E3-QTA-2025-09');
  const [frameworkCeilingValue, setFrameworkCeilingValue] = useState<string>('12,000,000 QAR');
  const [priorEditionCode, setPriorEditionCode] = useState<string>('PRJ-2025-QTA-ANNUAL');

  // TBC Toggles & Values
  const [clientTbc, setClientTbc] = useState<boolean>(false);
  const [clientName, setClientName] = useState<string>('Qatar Tourism Authority');
  const [clientContact, setClientContact] = useState<string>('Hessa Al-Nuaimi (Events Director)');
  const [clientEmail, setClientEmail] = useState<string>('client@qatartourism.qa');

  const [datesTbc, setDatesTbc] = useState<boolean>(false);
  const [submissionDeadline, setSubmissionDeadline] = useState<string>('2026-10-15');
  const [eventDate, setEventDate] = useState<string>('2026-11-15');
  const [bumpInDate, setBumpInDate] = useState<string>('2026-11-10');
  const [bumpOutDate, setBumpOutDate] = useState<string>('2026-11-18');

  const [venueTbc, setVenueTbc] = useState<boolean>(false);
  const [venueStatus, setVenueStatus] = useState<string>('confirmed');
  const [venueName, setVenueName] = useState<string>('Doha Exhibition & Convention Center');
  const [hallZone, setHallZone] = useState<string>('Halls 1, 2 & Main Al Mayassa Theater');

  const [commercialTbc, setCommercialTbc] = useState<boolean>(false);
  const [commercialTag, setCommercialTag] = useState<string>('Quoted');
  const [estimatedValue, setEstimatedValue] = useState<string>('3,500,000');
  const [targetMargin, setTargetMargin] = useState<string>('43.75%');

  // Team
  const [pmName, setPmName] = useState<string>('Zaid Mansour (Lead PM)');

  // Step 8 Workflow Configuration
  const [stages, setStages] = useState<ConfigurableStage[]>(DEFAULT_STAGES);

  const steps = [
    { num: 1, title: 'Origin Route' },
    { num: 2, title: 'Project Identity' },
    { num: 3, title: 'Client & Stakeholders' },
    { num: 4, title: 'Dates & Deadlines' },
    { num: 5, title: 'Venue Context' },
    { num: 6, title: 'Commercials' },
    { num: 7, title: 'Team Assignment' },
    { num: 8, title: 'Stage Workflow' },
    { num: 9, title: 'Review & Create' },
  ];

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
          originMetadata: {
            rfpDeadline,
            tenderBondRequired,
            soleSourceJustification,
            frameworkContractId,
            frameworkCeilingValue,
            priorEditionCode,
          },
        },
        clientStakeholders: {
          clientOrganisationId: clientTbc ? null : '22222222-2222-4222-8222-222222222222',
          clientName: clientTbc ? 'To Be Confirmed' : clientName,
          mainContact: clientTbc ? 'TBC' : clientContact,
          clientEmail: clientTbc ? '' : clientEmail,
          isTbc: clientTbc,
        },
        dates: {
          submissionDeadline: datesTbc ? null : submissionDeadline,
          eventDate: datesTbc ? null : eventDate,
          bumpInDate: datesTbc ? null : bumpInDate,
          bumpOutDate: datesTbc ? null : bumpOutDate,
          isConfirmed: !datesTbc,
          isTbc: datesTbc,
        },
        venue: {
          status: venueTbc ? 'tbc' : venueStatus,
          venueName: venueTbc ? 'To Be Confirmed' : venueName,
          hallZone: venueTbc ? 'TBC' : hallZone,
          isTbc: venueTbc,
        },
        commercialStartingPoint: {
          classificationTag: commercialTbc ? 'TBC' : commercialTag,
          revenueValue: commercialTbc ? 'To Be Confirmed' : estimatedValue,
          targetMargin: commercialTbc ? 'TBC' : targetMargin,
          currency,
          isTbc: commercialTbc,
        },
        team: {
          projectManagerId: '10000000-0000-4000-8000-000000000004',
          projectManagerName: pmName,
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

      {/* Step Indicator Bar with Completed / Active / Pending state */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '24px',
          backgroundColor: '#ffffff',
          padding: '10px 14px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          overflowX: 'auto',
        }}
      >
        {steps.map((s) => {
          const isCurrent = s.num === currentStep;
          const isDone = s.num < currentStep;
          return (
            <button
              key={s.num}
              onClick={() => setCurrentStep(s.num)}
              style={{
                flex: 1,
                minWidth: '85px',
                padding: '6px 4px',
                borderRadius: '4px',
                border: isCurrent ? '1px solid #3b82f6' : '1px solid transparent',
                backgroundColor: isCurrent ? '#eff6ff' : isDone ? '#f0fdf4' : '#f8fafc',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: isCurrent ? '#2563eb' : isDone ? '#16a34a' : '#94a3b8',
                }}
              >
                {isDone ? `✓ ${s.num}` : `${s.num}`}
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: isCurrent ? '#1e40af' : isDone ? '#15803d' : '#64748b',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {s.title}
              </div>
            </button>
          );
        })}
      </div>

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
                  placeholder="e.g. Qatar Tourism Demo Tender"
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
                placeholder="e.g. Qatar Tourism Authority"
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
                placeholder="e.g. Doha Exhibition & Convention Center"
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
                  placeholder="3,500,000"
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
              <span style={{ fontSize: '11px', color: '#64748b' }}>Default: Zaid Mansour (pm@e3.qa)</span>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Step 8: Visual Lifecycle Configuration Editor
              </h3>
              <Badge variant="purple">Governance Protected</Badge>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>
              Customize and review project stages. Note: <strong>Mandatory Governance Gates</strong> (Executive Gate, Civil Defence HSE, Readiness Gate) are enforced by system policy and cannot be bypassed.
            </p>

            <div style={{ maxHeight: '340px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              {stages.map((stage, idx) => (
                <div
                  key={stage.id}
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid #f1f5f9',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: stage.isMandatoryGate ? '#fffbeb' : stage.isOptional ? '#f8fafc' : '#ffffff',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <button
                        type="button"
                        onClick={() => handleStageMove(idx, 'up')}
                        disabled={idx === 0}
                        style={{ border: 'none', background: 'none', cursor: idx === 0 ? 'default' : 'pointer', fontSize: '9px', color: '#94a3b8' }}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStageMove(idx, 'down')}
                        disabled={idx === stages.length - 1}
                        style={{ border: 'none', background: 'none', cursor: idx === stages.length - 1 ? 'default' : 'pointer', fontSize: '9px', color: '#94a3b8' }}
                      >
                        ▼
                      </button>
                    </div>
                    <span style={{ fontWeight: 600, color: stage.isOptional ? '#94a3b8' : '#1e293b' }}>
                      {stage.name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {stage.isMandatoryGate ? (
                      <Badge variant="warning" size="sm">🔒 Mandatory Gate</Badge>
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
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Role: {stage.ownerRole}</span>
                  </div>
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
          }}
        >
          {currentStep > 1 ? (
            <Button
              id="wizard-prev-btn"
              variant="secondary"
              size="md"
              onClick={() => setCurrentStep(currentStep - 1)}
            >
              ← Previous Step
            </Button>
          ) : (
            <div />
          )}

          {currentStep < 9 ? (
            <Button
              id="wizard-next-btn"
              variant="primary"
              size="md"
              onClick={() => setCurrentStep(currentStep + 1)}
            >
              Next Step →
            </Button>
          ) : (
            <Button
              id="wizard-create-btn"
              variant="success"
              size="lg"
              isLoading={isSubmitting}
              onClick={() => handleSaveProject(false)}
            >
              🚀 Create & Launch Project Cockpit
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

