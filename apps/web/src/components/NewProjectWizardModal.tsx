import React, { useState } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { CANONICAL_E3_USERS } from '../context/EosContext.js';
import { useEosApi } from '../hooks/useEosApi.js';
import { Button, Badge } from './DesignSystem.js';
import { STANDARD_THIRTEEN_STAGE_TEMPLATE } from '@e3-eos/domain';

interface NewProjectWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: any) => void;
}

export const NewProjectWizardModal: React.FC<NewProjectWizardModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated,
}) => {
  const { currentLanguage, setSelectedProjectId, setActiveWorkspace, currentUser } = useEosContext();
  const { client } = useEosApi();

  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form state across 9 steps
  const [formData, setFormData] = useState({
    // Step 1: Client & Commercial Basis
    clientOrgId: '',
    clientName: '',
    route: 'tender' as 'tender' | 'direct_award' | 'call_off' | 'internal_idea',
    originCode: '',

    // Step 2: Project Identity & Scope
    title: '',
    projectCode: `PRJ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    description: '',
    venue: '',

    // Step 3: Financial Baseline
    currency: 'QAR',
    estimatedCost: '',
    expectedRevenue: '',

    // Step 4: Commercial Value States
    commercialState: 'estimate',
    marginFloorPercent: 20,

    // Step 5: Lifecycle Dates
    moveInDate: '',
    eventStartDate: '',
    eventEndDate: '',
    moveOutDate: '',

    // Step 6: Team & Roles
    leadPmId: currentUser?.id || '10000000-0000-4000-8000-000000000004',
    projectDirectorId: '',
    technicalDirectorId: '',
    financialControllerId: '',

    // Step 7: Governance & Gating Rules
    enforceDrawingFreeze: true,
    dualSignatureThreshold: '100000',
    requireCivilDefenceClearance: true,

    // Step 8: Work Breakdown Structure
    initialPackages: [
      'Scenography, Stage & Structural Rigging',
      'Audio, Visual, Lighting & Laser FX',
      'Health, Safety, Venue Licensing & Compliance',
      'VIP Hospitality, Protocol & Guest Journey',
    ],
  });

  if (!isOpen) return null;

  const costNum = parseFloat(formData.estimatedCost) || 0;
  const revNum = parseFloat(formData.expectedRevenue) || 0;
  const marginAmt = revNum - costNum;
  const marginPct = revNum > 0 ? ((marginAmt / revNum) * 100).toFixed(2) : '0.00';

  const stepTitles = [
    currentLanguage === 'ar' ? 'العميل والمسار التجاري' : 'Client & Origin Route',
    currentLanguage === 'ar' ? 'هوية ونطاق المشروع' : 'Project Identity & Scope',
    currentLanguage === 'ar' ? 'الهيكل المالي والعملة' : 'Financial Baseline & Currency',
    currentLanguage === 'ar' ? 'حالات القيمة التجارية' : 'Commercial Value States',
    currentLanguage === 'ar' ? 'تواريخ ومراحل دورة الحياة' : '13-Stage Lifecycle Dates',
    currentLanguage === 'ar' ? 'فريق التنفيذ والأدوار' : 'Delivery Team & Key Roles',
    currentLanguage === 'ar' ? 'قواعد الحوكمة والبوابات' : 'Governance & Gating Rules',
    currentLanguage === 'ar' ? 'هيكل تجزئة العمل (WBS)' : 'Work Breakdown Structure (WBS)',
    currentLanguage === 'ar' ? 'المراجعة والتفعيل في قاعدة البيانات' : 'Review & PostgreSQL Activation',
  ];

  const handleNext = () => {
    if (step < 9) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        projectCode: formData.projectCode,
        originCode: formData.originCode,
        ownerId: formData.leadPmId,
        clientOrganisationId: formData.clientOrgId,
        intakeMode: 'complete',
        classification: {
          route: formData.route,
          format: 'exhibition_gala',
          commercialModel: 'fixed_price',
        },
        financialAssumptions: {
          currency: formData.currency,
          estimatedCost: formData.estimatedCost,
          expectedRevenueMax: formData.expectedRevenue,
        },
        dateRegister: {
          eventStart: formData.eventStartDate,
          eventEnd: formData.eventEndDate,
        },
        workflowConfig: {
          stages: STANDARD_THIRTEEN_STAGE_TEMPLATE.stages.map((s, idx) => ({
            id: idx + 1,
            sequenceNumber: idx + 1,
            name: s.name,
            isMandatoryGate: idx + 1 === 5 || idx + 1 === 9 || idx + 1 === 10 || idx + 1 === 13,
            isOptional: false,
            ownerRole: idx + 1 === 5 ? 'executive' : idx + 1 === 9 ? 'hse_quality' : idx + 1 === 13 ? 'finance' : 'operations',
          })),
        },
      };

      const result = await client.createProject(payload);
      const createdId = result.data?.id || formData.projectCode;

      onProjectCreated(result.data || { id: createdId, ...formData });
      setSelectedProjectId(createdId);
      setActiveWorkspace('project');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to onboard project in PostgreSQL');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '840px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #334155',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ backgroundColor: '#2563eb', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800 }}>
                E3-EOS V1 ONBOARDING
              </span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                {currentLanguage === 'ar' ? `الخطوة ${step} من 9` : `Step ${step} of 9`}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
              {stepTitles[step - 1]}
            </h2>
          </div>

          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* 9-Step Progress Bar */}
        <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '10px 24px', gap: '6px', borderBottom: '1px solid #e2e8f0' }}>
          {Array.from({ length: 9 }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              onClick={() => s < step && setStep(s)}
              style={{
                flex: 1,
                height: '6px',
                borderRadius: '3px',
                backgroundColor: s === step ? '#2563eb' : s < step ? '#10b981' : '#cbd5e1',
                cursor: s < step ? 'pointer' : 'default',
                transition: 'all 0.2s',
              }}
              title={`Step ${s}: ${stepTitles[s - 1]}`}
            />
          ))}
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #f87171', borderRadius: '6px', color: '#991b1b', marginBottom: '16px', fontSize: '13px' }}>
              ⚠️ {error}
            </div>
          )}

          {/* STEP 1: Client & Origin */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  {currentLanguage === 'ar' ? 'جهة العميل المؤسسية' : 'Client Organisation'}
                </label>
                <select
                  value={formData.clientOrgId}
                  onChange={(e) => {
                    const sel = e.target;
                    const optText = sel.options[sel.selectedIndex]?.text || '';
                    setFormData({
                      ...formData,
                      clientOrgId: e.target.value,
                      clientName: e.target.value ? optText.replace(/^[^\s]+\s*/, '') : '',
                    });
                  }}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                >
                  <option value="">-- {currentLanguage === 'ar' ? 'اختر جهة العميل' : 'Select Client Organisation'} --</option>
                  <option value="22222222-2222-4222-8222-222222222222">🏛️ Qatar Tourism Authority (QTA) — Doha, Qatar</option>
                  <option value="33333333-3333-4333-8333-333333333333">🏢 Supreme Committee for Delivery & Legacy</option>
                  <option value="44444444-4444-4444-8444-444444444444">🇶🇦 Ministry of Culture & Youth</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  {currentLanguage === 'ar' ? 'مسار استقطاب الفعالية' : 'Commercial Origin Route'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {[
                    { id: 'tender', label: 'Competitive Government Tender (مناقصة حكومية)', desc: 'Full RFP submission, technical scoring, commercial envelope' },
                    { id: 'direct_award', label: 'Direct Award (تكليف مباشر)', desc: 'Sole-source government or strategic partner award' },
                    { id: 'call_off', label: 'Framework Call-Off (أمر شراء إطاري)', desc: 'Pre-approved rate card drawdown under existing MSA' },
                    { id: 'internal_idea', label: 'Internal Initiative (مبادرة داخلية)', desc: 'Self-produced proprietary event or festival concept' },
                  ].map((r) => (
                    <div
                      key={r.id}
                      onClick={() => setFormData({ ...formData, route: r.id as any })}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: `2px solid ${formData.route === r.id ? '#2563eb' : '#e2e8f0'}`,
                        backgroundColor: formData.route === r.id ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '13px', color: formData.route === r.id ? '#1e40af' : '#1e293b' }}>
                        {r.label}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{r.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  {currentLanguage === 'ar' ? 'رمز أو مرجع المناقصة' : 'Origin / RFP Reference Code'}
                </label>
                <input
                  type="text"
                  value={formData.originCode}
                  placeholder="e.g. TENDER-2026-01"
                  onChange={(e) => setFormData({ ...formData, originCode: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>
            </div>
          )}

          {/* STEP 2: Project Identity & Scope */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    {currentLanguage === 'ar' ? 'اسم الفعالية / المشروع' : 'Official Project Title'}
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    placeholder="e.g. Global Tech Expo & Summit 2026"
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: 600 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    {currentLanguage === 'ar' ? 'رمز المشروع' : 'Project Code'}
                  </label>
                  <input
                    type="text"
                    value={formData.projectCode}
                    onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  {currentLanguage === 'ar' ? 'موقع الفعالية والمركز' : 'Venue & Location'}
                </label>
                <input
                  type="text"
                  value={formData.venue}
                  placeholder="e.g. National Convention Center, Hall 1 & 2"
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  {currentLanguage === 'ar' ? 'وصف النطاق والمخرجات الرئيسية' : 'Scope Description & High-Level Deliverables'}
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  placeholder="Enter project description, scope and key deliverables..."
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', lineHeight: '1.5' }}
                />
              </div>
            </div>
          )}

          {/* STEP 3: Financial Baseline & Currency */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    {currentLanguage === 'ar' ? 'العملة' : 'Currency'}
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  >
                    <option value="QAR">QAR (ريال قطري)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    {currentLanguage === 'ar' ? 'الميزانية التقديرية (التكلفة)' : 'Estimated Cost Budget'}
                  </label>
                  <input
                    type="number"
                    value={formData.estimatedCost}
                    placeholder="e.g. 1200000"
                    onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    {currentLanguage === 'ar' ? 'الإيراد المتوقع (سعر البيع)' : 'Target Sell Revenue'}
                  </label>
                  <input
                    type="number"
                    value={formData.expectedRevenue}
                    placeholder="e.g. 1800000"
                    onChange={(e) => setFormData({ ...formData, expectedRevenue: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
              </div>

              {/* Live Margin Calculation Card */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Forecast Gross Margin Baseline</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: marginAmt >= 0 ? '#15803d' : '#b91c1c' }}>
                    {marginAmt.toLocaleString()} {formData.currency} ({marginPct}%)
                  </div>
                </div>
                <Badge variant={parseFloat(marginPct) >= 25 ? 'success' : 'danger'}>
                  {parseFloat(marginPct) >= 25 ? '✓ Compliant with E3 Margin Floor (>25%)' : '⚠️ Below 25% Margin Policy'}
                </Badge>
              </div>
            </div>
          )}

          {/* STEP 4: Commercial Value States */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
                {currentLanguage === 'ar'
                  ? 'يفرض E3-EOS دورة حياة دقيقة لقيم التكلفة والإيراد لمنع الخلط بين التقديرات الأولية والالتزامات التعاقدية الفعلية:'
                  : 'E3-EOS strictly isolates commercial value maturity states to prevent committing before executive & client sign-offs:'}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { state: '1. Assumption (افتراض أولي)', desc: 'Initial ballpark figures entered at stage 1 tender qualification' },
                  { state: '2. Estimate (تقدير مفصل)', desc: 'Engineering & procurement BOQ line items costed with supplier quotes' },
                  { state: '3. Quoted (عرض سعر رسمي)', desc: 'Official client commercial envelope submitted under frozen drawings' },
                  { state: '4. Approved (موافقة العميل)', desc: 'Formal client award or purchase authorization signed off' },
                  { state: '5. Contracted (عقد ملزم)', desc: 'Executed bilateral legal agreement with locked payment milestones' },
                  { state: '6. Actual (تكاليف فعلية)', desc: 'Invoiced, verified, and settled deliveries in Cloud SQL ledger' },
                ].map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '10px 14px',
                      backgroundColor: idx === 1 ? '#eff6ff' : '#ffffff',
                      border: `1px solid ${idx === 1 ? '#3b82f6' : '#e2e8f0'}`,
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{s.state}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{s.desc}</div>
                    </div>
                    {idx === 1 && <Badge variant="info">Active Onboarding State</Badge>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: 13-Stage Dates & Milestones */}
          {step === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    {currentLanguage === 'ar' ? 'تاريخ بدء التركيب الميداني (Bump-in)' : 'Move-in / Bump-in Date'}
                  </label>
                  <input
                    type="date"
                    value={formData.moveInDate}
                    onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    {currentLanguage === 'ar' ? 'تاريخ افتتاح الفعالية' : 'Event Opening Date'}
                  </label>
                  <input
                    type="date"
                    value={formData.eventStartDate}
                    onChange={(e) => setFormData({ ...formData, eventStartDate: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    {currentLanguage === 'ar' ? 'تاريخ ختام الفعالية' : 'Event Closing Date'}
                  </label>
                  <input
                    type="date"
                    value={formData.eventEndDate}
                    onChange={(e) => setFormData({ ...formData, eventEndDate: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    {currentLanguage === 'ar' ? 'تاريخ إخلاء الموقع (Bump-out)' : 'Move-out / Handover Date'}
                  </label>
                  <input
                    type="date"
                    value={formData.moveOutDate}
                    onChange={(e) => setFormData({ ...formData, moveOutDate: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '6px', fontSize: '12px', color: '#166534' }}>
                ✓ Initializing all 13 canonical stages (S01: Onboarding through S13: Post-Event Report) with automated dependency gating.
              </div>
            </div>
          )}

          {/* STEP 6: Team & Roles */}
          {step === 6 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  {currentLanguage === 'ar' ? 'مدير المشروع الرئيسي (Lead PM)' : 'Lead Event Project Manager'}
                </label>
                <select
                  value={formData.leadPmId}
                  onChange={(e) => setFormData({ ...formData, leadPmId: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                >
                  {CANONICAL_E3_USERS.filter((u) => u.role === 'project_manager' || u.role === 'super_admin').map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  {currentLanguage === 'ar' ? 'مدير المشروع التنفيذي (Project Director)' : 'Project Director'}
                </label>
                <select
                  value={formData.projectDirectorId}
                  onChange={(e) => setFormData({ ...formData, projectDirectorId: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                >
                  {CANONICAL_E3_USERS.filter((u) => u.role === 'project_director' || u.role === 'executive').map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  {currentLanguage === 'ar' ? 'المدير الفني والإبداعي (Technical Director)' : 'Technical & Creative Director'}
                </label>
                <select
                  value={formData.technicalDirectorId}
                  onChange={(e) => setFormData({ ...formData, technicalDirectorId: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                >
                  {CANONICAL_E3_USERS.filter((u) => u.role === 'design_production' || u.role === 'operations').map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* STEP 7: Governance & Gating Rules */}
          {step === 7 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <input
                  type="checkbox"
                  checked={formData.enforceDrawingFreeze}
                  onChange={(e) => setFormData({ ...formData, enforceDrawingFreeze: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>Enforce Drawing Freeze Gate (Stage 04 ➔ Stage 06)</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Prevents ordering structural steel, trussing, or custom decor until technical CAD drawings are frozen.</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <input
                  type="checkbox"
                  checked={formData.requireCivilDefenceClearance}
                  onChange={(e) => setFormData({ ...formData, requireCivilDefenceClearance: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>Mandatory Civil Defence & Fire Safety Gate (Stage 10)</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Stage 11 live opening locked until Qatar Civil Defence sign-off certificate is verified.</div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Dual Executive Signature Threshold (QAR)
                </label>
                <input
                  type="number"
                  value={formData.dualSignatureThreshold}
                  onChange={(e) => setFormData({ ...formData, dualSignatureThreshold: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>
            </div>
          )}

          {/* STEP 8: Work Breakdown Structure (Initial Packages) */}
          {step === 8 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '13px', color: '#475569' }}>
                Initial canonical work packages created in PostgreSQL for immediate task allocation:
              </div>
              {formData.initialPackages.map((pkg, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ backgroundColor: '#2563eb', color: '#ffffff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>
                      {idx + 1}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{pkg}</span>
                  </div>
                  <Badge variant="info">Stage 06 WBS</Badge>
                </div>
              ))}
            </div>
          )}

          {/* STEP 9: Review & Activation */}
          {step === 9 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  {formData.projectCode} • {formData.originCode}
                </div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#0f172a' }}>{formData.title}</h3>
                <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748b' }}>{formData.description}</p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Target Budget</div>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>{parseFloat(formData.estimatedCost).toLocaleString()} QAR</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Expected Revenue</div>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>{parseFloat(formData.expectedRevenue).toLocaleString()} QAR</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Target Margin</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#15803d' }}>{marginPct}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Stages Configured</div>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>13 Stages (Active)</div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '14px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', fontSize: '13px', color: '#065f46' }}>
                🔒 <strong>PostgreSQL Persistence Notice:</strong> Submitting will commit this project into Cloud SQL PostgreSQL 17, instantiate all 13 canonical stages, seed the initial WBS work packages, and set up Row Level Security (RLS) policies.
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Button variant="outline" onClick={handleBack} disabled={step === 1 || isSubmitting}>
            {currentLanguage === 'ar' ? 'السابق' : 'Back'}
          </Button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              {currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              id={step === 9 ? 'wizard-submit-btn' : 'wizard-next-btn'}
              variant="primary"
              onClick={handleNext}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? (currentLanguage === 'ar' ? 'جارِ التفعيل في قاعدة البيانات...' : 'Persisting to PostgreSQL...')
                : step === 9
                ? (currentLanguage === 'ar' ? '🚀 تفعيل المشروع في PostgreSQL' : '🚀 Activate Project in PostgreSQL')
                : (currentLanguage === 'ar' ? 'التالي ➔' : 'Next Step ➔')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
