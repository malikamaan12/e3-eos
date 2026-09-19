import React, { useState } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, Badge, Button } from '../components/DesignSystem.js';

export const WorkflowBuilderView: React.FC = () => {
  const { currentLanguage } = useEosContext();
  const isRtl = currentLanguage === 'ar';

  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('WF-CANONICAL-13-STAGE');
  const [layoutMode, setLayoutMode] = useState<'pipeline' | 'linear'>('pipeline');
  const [testCurrentStage, setTestCurrentStage] = useState<string>('site_ops');
  const [testTargetStage, setTestTargetStage] = useState<string>('live_event');
  const [completedActivities, setCompletedActivities] = useState<string[]>(['site_permit_cleared', 'safety_induction_complete']);
  const [completedApprovals, setCompletedApprovals] = useState<string[]>(['hse_director']);
  const [transitionVerdict, setTransitionVerdict] = useState<any>(null);

  const workflows: Record<string, { name: string; stages: any[] }> = {
    'WF-CANONICAL-13-STAGE': {
      name: isRtl ? 'دورة حياة الفعاليات المؤسسية المعيارية (١٣ مرحلة قياسية)' : 'Canonical Enterprise 13-Stage Lifecycle (Standard Template)',
      stages: [
        { code: 'onboarding', num: 1, phase: 'Phase 1: Initiation', name: isRtl ? 'المرحلة 01: التهيئة وبدء المشروع' : 'Stage 01: Project Onboarding', isGate: false, activities: ['client_brief_intake', 'account_opening', 'stakeholder_matrix'], approvals: ['project_manager'] },
        { code: 'feasibility', num: 2, phase: 'Phase 1: Initiation', name: isRtl ? 'المرحلة 02: التأهيل ودراسة الجدوى' : 'Stage 02: Qualification and Feasibility', isGate: true, activities: ['feasibility_assessment', 'technical_site_qualification', 'origin_verification'], approvals: ['project_director'] },
        { code: 'concept', num: 3, phase: 'Phase 1: Initiation', name: isRtl ? 'المرحلة 03: الفكرة والمفهوم الإبداعي والمسودة الأولى' : 'Stage 03: Idea, Concept and First Draft', isGate: false, activities: ['creative_concept', '3d_spatial_visualization', 'first_draft_brief'], approvals: ['design_production'] },
        { code: 'design_dev', num: 4, phase: 'Phase 1: Initiation', name: isRtl ? 'المرحلة 04: الاستيضاح والتطوير التصميمي' : 'Stage 04: Clarification and Design Development', isGate: false, activities: ['engineering_clarification', 'design_development_freeze', 'technical_drawings'], approvals: ['design_production'] },
        { code: 'proposal_auth', num: 5, phase: 'Phase 1: Initiation', name: isRtl ? 'المرحلة 05: العرض التجاري، التقديم والاعتماد' : 'Stage 05: Proposal, Submission and Authorisation', isGate: true, activities: ['commercial_pricing_boq', 'four_eyes_risk_review', 'proposal_formal_signoff'], approvals: ['executive', 'finance'] },
        { code: 'delivery_planning', num: 6, phase: 'Phase 2: Technical Production', name: isRtl ? 'المرحلة 06: تخطيط التنفيذ التفصيلي' : 'Stage 06: Detailed Delivery Planning', isGate: false, activities: ['wbs_schedule_baseline', 'work_package_definition', 'resource_leveling'], approvals: ['project_manager'] },
        { code: 'vendor_orders', num: 7, phase: 'Phase 2: Technical Production', name: isRtl ? 'المرحلة 07: اختيار الموردين وإصدار الأوامر' : 'Stage 07: Vendor Selection and Orders', isGate: false, activities: ['rfq_tender_evaluation', 'subcontractor_pos', 'vendor_due_diligence'], approvals: ['procurement', 'finance'] },
        { code: 'production_prep', num: 8, phase: 'Phase 2: Technical Production', name: isRtl ? 'المرحلة 08: الإنتاج وتجهيز الموارد' : 'Stage 08: Production and Resource Preparation', isGate: false, activities: ['workshop_fabrication', 'inventory_depot_lock', 'quality_control_release'], approvals: ['design_production', 'hse_quality'] },
        { code: 'logistics_bumpin', num: 9, phase: 'Phase 3: Live Delivery', name: isRtl ? 'المرحلة 09: اللوجستيات، الدخول والتركيب في الموقع' : 'Stage 09: Logistics, Bump-in and Installation', isGate: true, activities: ['fleet_convoy_dispatch', 'site_bump_in', 'civil_defense_permit_clearance'], approvals: ['operations', 'hse_quality'] },
        { code: 'readiness_testing', num: 10, phase: 'Phase 3: Live Delivery', name: isRtl ? 'المرحلة 10: اللمسات النهائية، الاختبار وجاهزية الافتتاح' : 'Stage 10: Finishing, Testing and Opening Readiness', isGate: true, activities: ['snagging_finishing', 'av_tuning_rehearsal', 'third_party_rigging_load_signoff'], approvals: ['hse_quality', 'operations'] },
        { code: 'operations_delivery', num: 11, phase: 'Phase 3: Live Delivery', name: isRtl ? 'المرحلة 11: التشغيل والتنفيذ المباشر' : 'Stage 11: Operations and Delivery', isGate: false, activities: ['live_show_execution', 'dsr_daily_site_reports', 'vip_protocol_run'], approvals: ['operations'] },
        { code: 'bumpout_reconcile', num: 12, phase: 'Phase 3: Live Delivery', name: isRtl ? 'المرحلة 12: التفكيك والمطابقة وتسليم الموقع' : 'Stage 12: Bump-out and Reconciliation', isGate: false, activities: ['site_strike_derig', 'asset_return_inspection', 'venue_handover_dilapidation'], approvals: ['operations', 'logistics'] },
        { code: 'closure_learning', num: 13, phase: 'Phase 4: Closeout', name: isRtl ? 'المرحلة 13: تقرير ما بعد الفعالية، الإغلاق والتعلم' : 'Stage 13: Post-event Report, Closure and Learning', isGate: true, activities: ['final_account_audit', 'commercial_settlement_seal', 'lessons_learned_debrief'], approvals: ['finance', 'executive'] },
      ],
    },
    'WF-STANDARD-COMMERCIAL': {
      name: isRtl ? 'تسليم الفعاليات التجارية المعياري (١٠ مراحل)' : 'Standard Commercial Event Delivery (10 Stages)',
      stages: [
        { code: 'opportunity', num: 1, name: isRtl ? 'الفرصة والتسجيل' : 'Opportunity & Intake', activities: ['intake_brief'], approvals: ['commercial_lead'] },
        { code: 'requirements', num: 2, name: isRtl ? 'المتطلبات ونطاق العمل' : 'Requirements & Scope', activities: ['tender_document_extraction'], approvals: ['head_of_production'] },
        { code: 'design', num: 3, name: isRtl ? 'التصميم ورسومات CAD' : 'Design & Spatial CAD', activities: ['technical_drawings'], approvals: ['lead_architect'] },
        { code: 'commercial', num: 4, name: isRtl ? 'التسعير وجدول الكميات' : 'Commercial BOQ & Baseline', activities: ['boq_rate_verification'], approvals: ['commercial_director'] },
        { code: 'procurement', num: 5, name: isRtl ? 'المشتريات وأوامر الشراء' : 'Procurement & POs', activities: ['rfq_bid_matrix'], approvals: ['procurement_manager'] },
        { code: 'production', num: 6, name: isRtl ? 'تصنيع الورشة والنجارة' : 'Workshop Fabrication', activities: ['material_sample_signoff'], approvals: ['workshop_manager'] },
        { code: 'site_ops', num: 7, name: isRtl ? 'البناء وعمليات الموقع' : 'Site Delivery & Build', activities: ['site_permit_cleared', 'safety_induction_complete', 'rigging_snag_cleared'], approvals: ['hse_director', 'venue_manager'] },
        { code: 'live_event', num: 8, name: isRtl ? 'تنفيذ العرض المباشر' : 'Live Show Execution', activities: ['opening_authorization_gate'], approvals: ['show_caller', 'event_director'] },
        { code: 'bump_out', num: 9, name: isRtl ? 'إغلاق التفكيك والإرجاع' : 'Bump-Out Closeout', activities: ['venue_handover_inspection'], approvals: ['logistics_lead'] },
        { code: 'financial_closeout', num: 10, name: isRtl ? 'الإغلاق التجاري المالي' : 'Commercial Closeout', activities: ['supplier_invoices_reconciled'], approvals: ['managing_director'] },
      ],
    },
    'WF-FAST-TRACK-VIP': {
      name: isRtl ? 'المسار السريع لكبار الشخصيات (٥ مراحل)' : 'Fast-Track Turnkey VIP Activation (5 Stages)',
      stages: [
        { code: 'rapid_intake', num: 1, name: isRtl ? 'التسجيل السريع' : 'Rapid Intake', activities: ['executive_brief'], approvals: ['managing_director'] },
        { code: 'combined_design_commercial', num: 2, name: isRtl ? 'التصميم والتسعير الفوري' : 'Concept & Commercial', activities: ['rapid_boq'], approvals: ['commercial_director'] },
        { code: 'parallel_delivery', num: 3, name: isRtl ? 'التنفيذ المتوازي' : 'Parallel Delivery', activities: ['emergency_po_authorizations'], approvals: ['event_director'] },
        { code: 'live_execution', num: 4, name: isRtl ? 'تنفيذ بروتوكول VIP' : 'Live VIP Activation', activities: ['vip_protocol_signoff'], approvals: ['protocol_lead'] },
        { code: 'commercial_settlement', num: 5, name: isRtl ? 'التسوية التجارية' : 'Commercial Settlement', activities: ['three_way_match_completion'], approvals: ['managing_director'] },
      ],
    },
  };

  const handleTestTransition = () => {
    const missingActs = ['rigging_snag_cleared'].filter((a) => !completedActivities.includes(a));
    const missingApps = ['venue_manager'].filter((a) => !completedApprovals.includes(a));

    if (missingActs.length > 0 || missingApps.length > 0) {
      setTransitionVerdict({
        isPermitted: false,
        status: 'blocked',
        reason: isRtl
          ? `لا يمكن التقدم إلى 'تنفيذ العرض المباشر': يوجد ${missingActs.length} نشاط إلزامي (${missingActs.join(', ')}) و ${missingApps.length} اعتماد حوكمة (${missingApps.join(', ')}) لم تكتمل بعد.`
          : `Cannot advance to 'Live Show Execution': ${missingActs.length} mandatory activity (${missingActs.join(', ')}) and ${missingApps.length} required approval (${missingApps.join(', ')}) are unresolved.`,
      });
    } else {
      setTransitionVerdict({
        isPermitted: true,
        status: 'permitted',
        reason: isRtl
          ? 'تم استيفاء جميع متطلبات بوابة المرحلة. الانتقال إلى المرحلة التالية مسموح به نظاماً.'
          : 'All stage-gate requirements cleared. Stage progression permitted.',
      });
    }
  };

  const currentWf = (workflows as any)[selectedWorkflow];

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              🛠️ {isRtl ? 'مصمم تدفق العمل وسياسات بوابات المراحل' : 'Visual Workflow & Declarative Policy Builder'}
            </h1>
            <Badge variant="success">v2.4.0 Canonical</Badge>
            <Badge variant="warning">{isRtl ? 'منطق تشغيل خالي من البرمجة' : 'No-Code Operating Logic'}</Badge>
            <Badge variant="info">13-Role RBAC Aligned</Badge>
          </div>
          <p style={{ color: '#64748b', marginTop: '6px', fontSize: '13px' }}>
            <em>"{isRtl ? 'الكود يحدد ما يستطيع نظام EOS فعله، والتهيئة تحدد كيف تختار شركة E3 إدارة عملياتها.' : 'Code defines what EOS is capable of. Configuration defines how E3 chooses to operate.'}"</em>
          </p>
        </div>

        {/* Workflow Switcher and Layout Mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <select
            value={selectedWorkflow}
            onChange={(e) => setSelectedWorkflow(e.target.value)}
            style={{
              padding: '8px 14px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: '#ffffff',
              color: '#0f172a',
            }}
          >
            <option value="WF-CANONICAL-13-STAGE">{isRtl ? 'دورة حياة الفعاليات المؤسسية الكاملة (١٣ مرحلة)' : 'Canonical Enterprise Lifecycle (13 Stages)'}</option>
            <option value="WF-STANDARD-COMMERCIAL">{isRtl ? 'تسليم الفعاليات المعياري (١٠ مراحل)' : 'Standard Commercial Delivery (10 Stages)'}</option>
            <option value="WF-FAST-TRACK-VIP">{isRtl ? 'المسار السريع VIP (٥ مراحل)' : 'Fast-Track Turnkey VIP (5 Stages)'}</option>
          </select>

          {/* Layout View Toggle */}
          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '6px' }}>
            <button
              onClick={() => setLayoutMode('pipeline')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: layoutMode === 'pipeline' ? 700 : 500,
                backgroundColor: layoutMode === 'pipeline' ? '#ffffff' : 'transparent',
                color: layoutMode === 'pipeline' ? '#0f172a' : '#64748b',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              ⊞ {isRtl ? 'عرض شامل لكافة المراحل' : 'Pipeline Overview (All Stages)'}
            </button>
            <button
              onClick={() => setLayoutMode('linear')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: layoutMode === 'linear' ? 700 : 500,
                backgroundColor: layoutMode === 'linear' ? '#ffffff' : 'transparent',
                color: layoutMode === 'linear' ? '#0f172a' : '#64748b',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              ➔ {isRtl ? 'تدفق تسلسلي أفقي' : 'Linear Flow'}
            </button>
          </div>
        </div>
      </div>

      {/* Visual Stage Topology: Full Visibility */}
      <Card
        title={`${isRtl ? 'هيكلية بوابات المراحل المهيأة:' : 'Configured Stage-Gate Topology:'} ${currentWf.name}`}
        subtitle={isRtl ? `عرض جميع المراحل (${currentWf.stages.length}) بوضوح مع الأنشطة والبوابات الملزمة` : `Complete visibility across all ${currentWf.stages.length} lifecycle stages with required gates`}
      >
        {layoutMode === 'pipeline' ? (
          /* Wrapped Responsive Grid: All stages visible simultaneously */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
            }}
          >
            {currentWf.stages.map((st: any, idx: number) => {
              const isCurrent = st.code === testCurrentStage;
              const isTarget = st.code === testTargetStage;
              return (
                <div
                  key={idx}
                  style={{
                    border: `1.5px solid ${isCurrent ? '#3b82f6' : isTarget ? '#d97706' : st.isGate ? '#f59e0b' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    padding: '14px',
                    backgroundColor: isCurrent ? '#eff6ff' : isTarget ? '#fffbeb' : '#f8fafc',
                    boxShadow: isCurrent ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: isCurrent ? '#2563eb' : '#64748b' }}>
                        {isRtl ? `المرحلة ${(st.num || idx + 1).toString().padStart(2, '0')}` : `STAGE ${(st.num || idx + 1).toString().padStart(2, '0')}`}
                      </span>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {st.isGate && <Badge variant="accent" size="sm">{isRtl ? 'بوابة ملزمة' : 'Gate'}</Badge>}
                        {isCurrent && <Badge variant="primary" size="sm">{isRtl ? 'الحالية' : 'Current'}</Badge>}
                        {isTarget && <Badge variant="warning" size="sm">{isRtl ? 'المستهدفة' : 'Target'}</Badge>}
                      </div>
                    </div>
                    {st.phase && (
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                        {st.phase}
                      </div>
                    )}
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                      {st.name}
                    </div>

                    <div style={{ fontSize: '11px', color: '#475569', marginBottom: '6px' }}>
                      <strong>{isRtl ? 'الأنشطة الإلزامية:' : 'Activities:'}</strong> ({st.activities.length})
                      <ul style={{ margin: '4px 0 6px 14px', padding: 0 }}>
                        {st.activities.map((a: string, i: number) => (
                          <li key={i} style={{ color: '#334155' }}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', color: '#475569', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '6px', marginTop: '6px' }}>
                    <strong>{isRtl ? 'بوابات الاعتماد:' : 'Approval Gates:'}</strong> ({st.approvals.length})
                    <ul style={{ margin: '4px 0 0 14px', padding: 0 }}>
                      {st.approvals.map((appr: string, i: number) => (
                        <li key={i} style={{ color: '#0f172a', fontWeight: 600 }}>{appr}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Linear Flow Strip with Scroll chevrons and counter */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '12px', color: '#64748b' }}>
              <span>{isRtl ? `عرض ${currentWf.stages.length} مراحل تسلسلياً` : `Displaying ${currentWf.stages.length} sequential stages`}</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => {
                    const el = document.getElementById('workflow-stages-strip');
                    if (el) el.scrollBy({ left: isRtl ? 240 : -240, behavior: 'smooth' });
                  }}
                  style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
                >
                  ‹
                </button>
                <button
                  onClick={() => {
                    const el = document.getElementById('workflow-stages-strip');
                    if (el) el.scrollBy({ left: isRtl ? -240 : 240, behavior: 'smooth' });
                  }}
                  style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
                >
                  ›
                </button>
              </div>
            </div>
            <div
              id="workflow-stages-strip"
              style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '12px', scrollBehavior: 'smooth' }}
            >
              {currentWf.stages.map((st: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    minWidth: '220px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '14px',
                    backgroundColor: st.code === testCurrentStage ? '#eff6ff' : '#f8fafc',
                    borderColor: st.code === testCurrentStage ? '#3b82f6' : '#e2e8f0',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>
                    {isRtl ? `المرحلة ${(idx + 1).toString().padStart(2, '0')}` : `STAGE ${(idx + 1).toString().padStart(2, '0')}`}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '4px 0 10px 0' }}>{st.name}</div>
                  <div style={{ fontSize: '11px', color: '#475569', marginBottom: '4px' }}>
                    <strong>{isRtl ? 'الأنشطة:' : 'Activities:'}</strong> ({st.activities.length})
                    <ul style={{ margin: '4px 0 8px 16px', padding: 0 }}>
                      {st.activities.map((a: string, i: number) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>
                    <strong>{isRtl ? 'بوابات الاعتماد:' : 'Gates:'}</strong> ({st.approvals.length})
                    <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                      {st.approvals.map((appr: string, i: number) => <li key={i}>{appr}</li>)}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Dynamic Transition Simulator */}
      <Card
        title={isRtl ? 'محاكي تقييم بوابات الانتقال بين المراحل' : 'Dynamic Stage-Gate Evaluation Simulator'}
        subtitle={isRtl ? 'اختبار قواعد السياسة الصارمة للتحقق من الأنشطة الإلزامية وتوقيعات الحوكمة' : 'Verify transition invariants and mandatory Four-Eyes approval enforcement'}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
              {isRtl ? 'المرحلة الحالية' : 'Current Stage'}
            </label>
            <input
              type="text"
              value={testCurrentStage}
              disabled
              style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#f1f5f9', fontFamily: 'monospace' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
              {isRtl ? 'المرحلة التالية المستهدفة' : 'Target Next Stage'}
            </label>
            <input
              type="text"
              value={testTargetStage}
              disabled
              style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#f1f5f9', fontFamily: 'monospace' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button
              id="btn-evaluate-transition"
              variant="primary"
              onClick={handleTestTransition}
              style={{ width: '100%' }}
            >
              ⚡ {isRtl ? 'تقييم بوابة الانتقال' : 'Evaluate Stage Gate Transition'}
            </Button>
          </div>
        </div>

        {/* Verdict Box */}
        {transitionVerdict && (
          <div
            id="transition-verdict-box"
            style={{
              padding: '14px 18px',
              borderRadius: '8px',
              backgroundColor: transitionVerdict.isPermitted ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${transitionVerdict.isPermitted ? '#bbf7d0' : '#fecaca'}`,
              color: transitionVerdict.isPermitted ? '#166534' : '#991b1b',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {transitionVerdict.isPermitted ? '✅' : '🛑'} {transitionVerdict.reason}
          </div>
        )}
      </Card>
    </div>
  );
};

