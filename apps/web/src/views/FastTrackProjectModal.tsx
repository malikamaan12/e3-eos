import React, { useState } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Button, Badge } from '../components/DesignSystem.js';
import { calculateOnboardingCompleteness } from '@e3-eos/domain';

interface FastTrackProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: (project: any) => void;
}

export const FastTrackProjectModal: React.FC<FastTrackProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated,
}) => {
  const { currentLanguage, apiClient, navigate, triggerRefresh, setSelectedProjectId, direction, currentUser } = useEosContext();

  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Basic Info
  const [title, setTitle] = useState<string>('');
  const [originRoute, setOriginRoute] = useState<string>('TENDER');
  const [format, setFormat] = useState<string>('Exhibition & Conference');
  const [clientTbc, setClientTbc] = useState<boolean>(false);
  const [clientName, setClientName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [country, setCountry] = useState<string>('Qatar');
  const [submissionDeadline, setSubmissionDeadline] = useState<string>('');
  const [eventDateTbc, setEventDateTbc] = useState<boolean>(false);
  const [eventDate, setEventDate] = useState<string>('');
  const [venueTbc, setVenueTbc] = useState<boolean>(false);
  const [venueName, setVenueName] = useState<string>('');

  // Step 2: Commercials & Ownership
  const [expectedValue, setExpectedValue] = useState<string>('');
  const [expectedCost, setExpectedCost] = useState<string>('');
  const [valueClassification, setValueClassification] = useState<string>('Estimate');
  const [leadPm, setLeadPm] = useState<string>(currentUser?.name || 'Zaid Mansour');
  const [priority, setPriority] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('Medium');

  const resetForm = () => {
    setStep(1);
    setTitle('');
    setOriginRoute('TENDER');
    setFormat('Exhibition & Conference');
    setClientTbc(false);
    setClientName('');
    setDescription('');
    setCountry('Qatar');
    setSubmissionDeadline('');
    setEventDateTbc(false);
    setEventDate('');
    setVenueTbc(false);
    setVenueName('');
    setExpectedValue('');
    setExpectedCost('');
    setValueClassification('Estimate');
    setLeadPm(currentUser?.name || 'Zaid Mansour');
    setPriority('Medium');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const isAr = currentLanguage === 'ar';

  // Invariant: Onboarding completeness is dynamically calculated based on route-specific applicable requirements.
  // Formula: completed applicable requirements / total applicable requirements
  const completeness = calculateOnboardingCompleteness({
    title,
    businessRoute: originRoute,
    clientName: clientTbc ? '' : clientName,
    tenderDeadline: submissionDeadline,
    submissionDate: submissionDeadline,
    eventStartDate: eventDateTbc ? '' : eventDate,
    targetTimeline: eventDateTbc ? 'Target Q4 2026' : eventDate,
    estimatedBudget: parseFloat(expectedValue.replace(/,/g, '')) || 0,
    projectLead: leadPm,
    venueName: venueTbc ? '' : venueName,
    workflowConfirmed: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!title.trim()) {
        setError(isAr ? 'يرجى إدخال اسم المشروع.' : 'Project title is required.');
        return;
      }
      setError(null);
      setStep(2);
      return;
    }

    // Step 2 Submit
    setIsSubmitting(true);
    setError(null);

    const generatedId = `f${Date.now().toString(16).padEnd(31, '0')}`;
    const code = `OPP-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    const payload = {
      id: generatedId,
      originRoute,
      maturity: 'draft',
      isFastTrack: true,
      isOnboardingComplete: completeness.isOnboardingComplete,
      onboardingCompletionPct: completeness.completionPct,
      missingSections: completeness.missingSections,
      projectIdentity: {
        code,
        title,
        description,
        eventFormat: format,
        country,
        city: country === 'Qatar' ? 'Doha' : '',
        currency: 'QAR',
        priority,
      },
      clientStakeholders: {
        clientName: clientTbc ? 'To Be Confirmed' : clientName,
        isTbc: clientTbc,
      },
      dates: {
        submissionDeadline,
        eventDate: eventDateTbc ? null : eventDate,
        isTbc: eventDateTbc,
      },
      venue: {
        venueName: venueTbc ? 'To Be Confirmed' : venueName,
        isTbc: venueTbc,
      },
      commercialStartingPoint: {
        classificationTag: valueClassification,
        revenueValue: expectedValue,
        costValue: expectedCost || null,
        currency: 'QAR',
      },
      team: {
        projectManagerName: leadPm,
      },
    };

    try {
      const res = await apiClient.createProject(payload);
      const newProjectId = res?.data?.id || generatedId;
      setSelectedProjectId(newProjectId);
      if (onProjectCreated) onProjectCreated(payload);
      triggerRefresh();
      resetForm();
      onClose();
      navigate(`/projects/${newProjectId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to save fast-track intake project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      dir={direction}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(9, 13, 22, 0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '20px',
        fontFamily: isAr ? 'Tahoma, Arial, sans-serif' : 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '620px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Modal Header with Bronze/Gold Trim */}
        <div
          style={{
            padding: '18px 24px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '2px solid #d97706',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  backgroundColor: '#d97706',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                }}
              >
                Fast-Track Intake
              </span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                {isAr ? `الخطوة ${step} من 2` : `Step ${step} of 2`} • {isAr ? 'التقاط سريع وإكمال لاحق' : 'Capture Now, Complete Later'}
              </span>
            </div>
            <h2 style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
              {step === 1
                ? (isAr ? 'البيانات الأساسية للفرصة / المناقصة' : 'Step 1: Basic Opportunity Details')
                : (isAr ? 'القيمة التجارية ومسؤولية التنفيذ' : 'Step 2: Commercials & Ownership')}
            </h2>
          </div>

          <button
            id="close-fast-track-modal"
            onClick={handleClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                color: '#991b1b',
                fontSize: '13px',
                marginBottom: '18px',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {step === 1 ? (
            /* STEP 1: Basic Info */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  {isAr ? 'اسم المشروع أو الفعالية *' : 'Project Title / RFP Name *'}
                </label>
                <input
                  id="ft-title-input"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Global Tech Expo & Summit 2026"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    {isAr ? 'مسار الورود (Origin Route)' : 'Origin Route'}
                  </label>
                  <select
                    id="ft-origin-select"
                    value={originRoute}
                    onChange={(e) => setOriginRoute(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    <option value="TENDER">Public RFP Tender</option>
                    <option value="DIRECT_AWARD">Direct Commercial Award</option>
                    <option value="CALL_OFF">Framework Agreement Call-Off</option>
                    <option value="INTERNAL_PITCH">Internal Idea / Pitch</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    {isAr ? 'نوع وشكل الفعالية (Format)' : 'Event Format'}
                  </label>
                  <select
                    id="ft-format-select"
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    <option value="State Ceremony & Protocol">State Ceremony & Protocol</option>
                    <option value="Exhibition & Conference">Exhibition & Conference</option>
                    <option value="Sports Tournament Ceremonies">Sports Tournament Ceremonies</option>
                    <option value="VIP Gala & Banquet">VIP Gala & Banquet</option>
                    <option value="Immersive Brand Activation">Immersive Brand Activation</option>
                  </select>
                </div>
              </div>

              {/* Client Name with TBC */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                    {isAr ? 'الجهة المالكة / العميل' : 'Client / Contracting Entity'}
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', cursor: 'pointer' }}>
                    <input
                      id="ft-client-tbc-checkbox"
                      type="checkbox"
                      checked={clientTbc}
                      onChange={(e) => setClientTbc(e.target.checked)}
                      style={{ accentColor: '#d97706' }}
                    />
                    <span>{isAr ? 'قيد التحديد (TBC)' : 'To Be Confirmed (TBC)'}</span>
                  </label>
                </div>
                <input
                  id="ft-client-input"
                  type="text"
                  disabled={clientTbc}
                  value={clientTbc ? (isAr ? 'قيد التحديد' : 'To Be Confirmed') : clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Acme Corporation / Government Ministry"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    backgroundColor: clientTbc ? '#f1f5f9' : '#ffffff',
                    color: clientTbc ? '#94a3b8' : '#0f172a',
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  {isAr ? 'نطاق العمل وموجز الفرصة' : 'Scope Brief & Initial Notes'}
                </label>
                <textarea
                  id="ft-description-input"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Outline key deliverables, technical requirements, or client preferences..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Country & Deadline */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    {isAr ? 'الدولة' : 'Country'}
                  </label>
                  <select
                    id="ft-country-select"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    <option value="Qatar">Qatar (Doha)</option>
                    <option value="UAE">United Arab Emirates</option>
                    <option value="Saudi Arabia">Saudi Arabia (KSA)</option>
                    <option value="International">International</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    {isAr ? 'موعد تقديم العرض / المناقصة' : 'Proposal Submission Deadline'}
                  </label>
                  <input
                    id="ft-deadline-input"
                    type="date"
                    value={submissionDeadline}
                    onChange={(e) => setSubmissionDeadline(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Event Date & Venue with TBC */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                      {isAr ? 'تاريخ الفعالية' : 'Event Date'}
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b', cursor: 'pointer' }}>
                      <input
                        id="ft-date-tbc-checkbox"
                        type="checkbox"
                        checked={eventDateTbc}
                        onChange={(e) => setEventDateTbc(e.target.checked)}
                        style={{ accentColor: '#d97706' }}
                      />
                      <span>TBC</span>
                    </label>
                  </div>
                  <input
                    id="ft-event-date-input"
                    type="date"
                    disabled={eventDateTbc}
                    value={eventDateTbc ? '' : eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      backgroundColor: eventDateTbc ? '#f1f5f9' : '#ffffff',
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                      {isAr ? 'الموقع / الصالة' : 'Venue'}
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b', cursor: 'pointer' }}>
                      <input
                        id="ft-venue-tbc-checkbox"
                        type="checkbox"
                        checked={venueTbc}
                        onChange={(e) => setVenueTbc(e.target.checked)}
                        style={{ accentColor: '#d97706' }}
                      />
                      <span>TBC</span>
                    </label>
                  </div>
                  <input
                    id="ft-venue-input"
                    type="text"
                    disabled={venueTbc}
                    value={venueTbc ? (isAr ? 'قيد التحديد' : 'To Be Confirmed') : venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder="e.g. National Convention Center / Arena"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      backgroundColor: venueTbc ? '#f1f5f9' : '#ffffff',
                      color: venueTbc ? '#94a3b8' : '#0f172a',
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* STEP 2: Commercials & Ownership */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '12px 14px', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', fontSize: '12px', color: '#92400e' }}>
                💡 <strong>{isAr ? 'إشعار الاكتمال المرحلي:' : 'Capture Now, Complete Later Policy:'}</strong>{' '}
                {isAr
                  ? 'سيتم إنشاء المشروع فوراً بعلامة "ONBOARDING INCOMPLETE (38%)" ويمكن لفريق المشروع استكمال بقية الخطوات التسع في أي وقت.'
                  : 'This opportunity will be created immediately with an ONBOARDING INCOMPLETE (38%) badge. Your team can resume the full 9-step wizard at any point.'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    {isAr ? 'القيمة المتوقعة للمشروع (QAR) *' : 'Expected Contract Value (QAR) *'}
                  </label>
                  <input
                    id="ft-value-input"
                    type="text"
                    required
                    value={expectedValue}
                    onChange={(e) => setExpectedValue(e.target.value)}
                    placeholder="e.g. 1,500,000"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    {isAr ? 'التكلفة المقدرة (QAR) [اختياري]' : 'Expected Cost (QAR) [Optional]'}
                  </label>
                  <input
                    id="ft-cost-input"
                    type="text"
                    value={expectedCost}
                    onChange={(e) => setExpectedCost(e.target.value)}
                    placeholder="e.g. 950,000"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    {isAr ? 'تصنيف درجة التأكد المالي' : 'Value Classification Tag'}
                  </label>
                  <select
                    id="ft-classification-select"
                    value={valueClassification}
                    onChange={(e) => setValueClassification(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    <option value="Assumption">Assumption (Early stage)</option>
                    <option value="Estimate">Internal Estimate</option>
                    <option value="Quoted">Quoted to Client</option>
                    <option value="Approved">Approved Budget</option>
                    <option value="Contracted">Contracted & Signed</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    {isAr ? 'الأولوية الاستراتيجية' : 'Opportunity Priority'}
                  </label>
                  <select
                    id="ft-priority-select"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    <option value="Critical">🔴 Critical (Immediate Attention)</option>
                    <option value="High">🟠 High Priority</option>
                    <option value="Medium">🟡 Medium Priority</option>
                    <option value="Low">🟢 Low Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  {isAr ? 'مدير المشروع المسؤول (Lead PM) *' : 'Assigned Lead PM *'}
                </label>
                <select
                  id="ft-pm-select"
                  value={leadPm}
                  onChange={(e) => setLeadPm(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                >
                  {currentUser?.name && (
                    <option value={currentUser.name}>{currentUser.name} (Current User)</option>
                  )}
                  <option value="Zaid Mansour">Zaid Mansour (pm@e3.qa)</option>
                  <option value="Fatima Al-Sulaiti">Fatima Al-Sulaiti (Project Director)</option>
                  <option value="Karim Haddad">Karim Haddad (Technical Director)</option>
                  <option value="Salem Al-Marri">Salem Al-Marri (Head of Live Ops)</option>
                </select>
              </div>

              {/* Dynamic Onboarding Completeness Checklist */}
              <div
                id="ft-onboarding-completeness-card"
                style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  padding: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                    {isAr
                      ? `اكتمال متطلبات الإعداد (${completeness.completionPct}% مكتمل):`
                      : `Onboarding Completeness (${completeness.completionPct}% Complete):`}
                  </span>
                  <Badge variant={completeness.isOnboardingComplete ? 'success' : 'warning'}>
                    {completeness.completedApplicableRequirements} / {completeness.totalApplicableRequirements} Requirements ({completeness.completionPct}%)
                  </Badge>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
                  Route: <strong>{completeness.businessRoute.toUpperCase()}</strong> • Formula: <code>{completeness.completedApplicableRequirements} completed / {completeness.totalApplicableRequirements} applicable</code>
                </div>
                {completeness.missingSections.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {completeness.missingSections.map((sec, idx) => (
                      <div key={idx} style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#d97706' }}>⚠️</span>
                        <span>{sec} (Required for {completeness.businessRoute.replace('_', ' ')})</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>✅</span>
                    <span>All applicable route requirements satisfied.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid #e2e8f0',
            }}
          >
            {step === 2 ? (
              <Button
                variant="secondary"
                size="md"
                type="button"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
              >
                ← {isAr ? 'السابق' : 'Back to Step 1'}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="md"
                type="button"
                onClick={handleClose}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
            )}

            <Button
              id="ft-submit-btn"
              variant="primary"
              size="md"
              type="submit"
              isLoading={isSubmitting}
              style={{
                background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                borderColor: '#d97706',
              }}
            >
              {step === 1
                ? (isAr ? 'المتابعة للخطوة 2 ←' : 'Next: Commercials & Ownership →')
                : (isAr ? 'إنشاء الفرصة وبدء التتبع' : '🚀 Create Fast-Track Opportunity')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
