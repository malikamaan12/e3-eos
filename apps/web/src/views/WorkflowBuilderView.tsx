import React, { useState } from 'react';

export const WorkflowBuilderView: React.FC = () => {
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('WF-STANDARD-COMMERCIAL');
  const [testCurrentStage, setTestCurrentStage] = useState<string>('site_ops');
  const [testTargetStage, setTestTargetStage] = useState<string>('live_event');
  const [completedActivities, setCompletedActivities] = useState<string[]>(['site_permit_cleared', 'safety_induction_complete']);
  const [completedApprovals, setCompletedApprovals] = useState<string[]>(['hse_director']);
  const [transitionVerdict, setTransitionVerdict] = useState<any>(null);

  const workflows = {
    'WF-STANDARD-COMMERCIAL': {
      name: 'Standard Commercial Event Delivery',
      stages: [
        { code: 'opportunity', name: 'Opportunity & Intake', activities: ['intake_brief'], approvals: ['commercial_lead'] },
        { code: 'requirements', name: 'Requirements & Scope', activities: ['tender_document_extraction'], approvals: ['head_of_production'] },
        { code: 'design', name: 'Design & Spatial CAD', activities: ['technical_drawings'], approvals: ['lead_architect'] },
        { code: 'commercial', name: 'Commercial BOQ & Baseline', activities: ['boq_rate_verification'], approvals: ['commercial_director'] },
        { code: 'procurement', name: 'Procurement & POs', activities: ['rfq_bid_matrix'], approvals: ['procurement_manager'] },
        { code: 'production', name: 'Workshop Fabrication', activities: ['material_sample_signoff'], approvals: ['workshop_manager'] },
        { code: 'site_ops', name: 'Site Delivery & Build', activities: ['site_permit_cleared', 'safety_induction_complete', 'rigging_snag_cleared'], approvals: ['hse_director', 'venue_manager'] },
        { code: 'live_event', name: 'Live Show Execution', activities: ['opening_authorization_gate'], approvals: ['show_caller', 'event_director'] },
        { code: 'bump_out', name: 'Bump-Out Closeout', activities: ['venue_handover_inspection'], approvals: ['logistics_lead'] },
        { code: 'financial_closeout', name: 'Commercial Closeout', activities: ['supplier_invoices_reconciled'], approvals: ['managing_director'] },
      ],
    },
    'WF-FAST-TRACK-VIP': {
      name: 'Fast-Track Turnkey VIP Activation',
      stages: [
        { code: 'rapid_intake', name: 'Rapid Intake', activities: ['executive_brief'], approvals: ['managing_director'] },
        { code: 'combined_design_commercial', name: 'Concept & Commercial', activities: ['rapid_boq'], approvals: ['commercial_director'] },
        { code: 'parallel_delivery', name: 'Parallel Delivery', activities: ['emergency_po_authorizations'], approvals: ['event_director'] },
        { code: 'live_execution', name: 'Live VIP Activation', activities: ['vip_protocol_signoff'], approvals: ['protocol_lead'] },
        { code: 'commercial_settlement', name: 'Commercial Settlement', activities: ['three_way_match_completion'], approvals: ['managing_director'] },
      ],
    },
  };

  const handleTestTransition = () => {
    // Invariant: Missing rigging_snag_cleared or venue_manager blocks transition to live_event
    const missingActs = ['rigging_snag_cleared'].filter((a) => !completedActivities.includes(a));
    const missingApps = ['venue_manager'].filter((a) => !completedApprovals.includes(a));

    if (missingActs.length > 0 || missingApps.length > 0) {
      setTransitionVerdict({
        isPermitted: false,
        status: 'blocked',
        reason: `Cannot advance to 'Live Show Execution': ${missingActs.length} mandatory activity (${missingActs.join(', ')}) and ${missingApps.length} required approval (${missingApps.join(', ')}) are unresolved.`,
      });
    } else {
      setTransitionVerdict({
        isPermitted: true,
        status: 'permitted',
        reason: 'All stage-gate requirements cleared. Stage progression permitted.',
      });
    }
  };

  const currentWf = (workflows as any)[selectedWorkflow];

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>
              🛠️ Visual Workflow & Declarative Policy Builder
            </h1>
            <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: '600' }}>
              No-Code Operating Logic
            </span>
          </div>
          <p style={{ color: '#64748b', marginTop: '6px', fontSize: '14px' }}>
            <em>"Code defines what EOS is capable of. Configuration defines how E3 chooses to operate."</em>
          </p>
        </div>

        {/* Workflow Switcher */}
        <div>
          <select
            value={selectedWorkflow}
            onChange={(e) => setSelectedWorkflow(e.target.value)}
            style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', fontWeight: '600' }}
          >
            <option value="WF-STANDARD-COMMERCIAL">Standard Commercial Delivery (10 Stages)</option>
            <option value="WF-FAST-TRACK-VIP">Fast-Track Turnkey VIP (5 Stages)</option>
          </select>
        </div>
      </div>

      {/* Visual Stage Topology */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: '#0f172a' }}>
          Configured Stage-Gate Topology: {currentWf.name}
        </h2>
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '12px' }}>
          {currentWf.stages.map((st: any, idx: number) => (
            <div
              key={idx}
              style={{
                minWidth: '200px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '14px',
                backgroundColor: st.code === testCurrentStage ? '#eff6ff' : '#f8fafc',
                borderColor: st.code === testCurrentStage ? '#3b82f6' : '#e2e8f0',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>STAGE {idx + 1}</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: '4px 0 10px 0' }}>{st.name}</div>
              <div style={{ fontSize: '11px', color: '#475569', marginBottom: '4px' }}>
                <strong>Activities ({st.activities.length}):</strong>
                <ul style={{ margin: '4px 0 8px 16px', padding: 0 }}>
                  {st.activities.map((a: string, i: number) => <li key={i}>{a}</li>)}
                </ul>
              </div>
              <div style={{ fontSize: '11px', color: '#475569' }}>
                <strong>Gates ({st.approvals.length}):</strong>
                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                  {st.approvals.map((appr: string, i: number) => <li key={i}>{appr}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Transition Simulator */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px', color: '#0f172a' }}>
          Dynamic Stage-Gate Evaluation Simulator
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Current Stage</label>
            <input type="text" value={testCurrentStage} disabled style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#f1f5f9' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Target Next Stage</label>
            <input type="text" value={testTargetStage} disabled style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#f1f5f9' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              id="btn-evaluate-transition"
              onClick={handleTestTransition}
              style={{ width: '100%', backgroundColor: '#0284c7', color: '#ffffff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
            >
              Evaluate Stage Gate Transition
            </button>
          </div>
        </div>

        {/* Verdict Box */}
        {transitionVerdict && (
          <div
            id="transition-verdict-box"
            style={{
              padding: '14px',
              borderRadius: '8px',
              backgroundColor: transitionVerdict.isPermitted ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${transitionVerdict.isPermitted ? '#bbf7d0' : '#fecaca'}`,
              color: transitionVerdict.isPermitted ? '#166534' : '#991b1b',
              fontSize: '13px',
              fontWeight: '500',
            }}
          >
            {transitionVerdict.isPermitted ? '✅' : '🛑'} {transitionVerdict.reason}
          </div>
        )}
      </div>
    </div>
  );
};
