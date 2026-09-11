import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Badge, Button, Card, Modal, Input, Textarea, Select } from '../components/DesignSystem.js';

interface RequirementsMatrixViewProps {
  projectId: string;
}

export const RequirementsMatrixView: React.FC<RequirementsMatrixViewProps> = ({ projectId }) => {
  const { apiClient, refreshTrigger, triggerRefresh } = useEosContext();

  const [loading, setLoading] = useState<boolean>(true);
  const [matrixData, setMatrixData] = useState<any>(null);
  const [clarificationsData, setClarificationsData] = useState<{ data: any[]; meta: any }>({ data: [], meta: {} });
  
  // Filters
  const [gapFilter, setGapFilter] = useState<'all' | 'gaps_only' | 'traceable_only'>('all');

  // Modals
  const [isAddReqModalOpen, setIsAddReqModalOpen] = useState<boolean>(false);
  const [reqCode, setReqCode] = useState<string>('');
  const [reqTitle, setReqTitle] = useState<string>('');
  const [reqDesc, setReqDesc] = useState<string>('');
  const [reqCategory, setReqCategory] = useState<string>('staging_technical');
  const [reqSource, setReqSource] = useState<string>('RFP Section 5.1');
  const [reqDueDate, setReqDueDate] = useState<string>('2026-11-25');
  const [reqTargetCost, setReqTargetCost] = useState<number>(150000);
  const [isSubmittingReq, setIsSubmittingReq] = useState<boolean>(false);

  const [isRfiModalOpen, setIsRfiModalOpen] = useState<boolean>(false);
  const [rfiQuestion, setRfiQuestion] = useState<string>('');
  const [rfiCategory, setRfiCategory] = useState<string>('technical');
  const [rfiSection, setRfiSection] = useState<string>('RFP Section 4.2');
  const [rfiDueAt, setRfiDueAt] = useState<string>('2026-11-10T18:00:00Z');
  const [isSubmittingRfi, setIsSubmittingRfi] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [matrix, clars] = await Promise.all([
          apiClient.getRequirementsTraceability(projectId).catch(() => null),
          apiClient.getClarifications(projectId).catch(() => ({ data: [], meta: {} })),
        ]);
        if (isMounted) {
          setMatrixData(matrix);
          setClarificationsData(clars);
        }
      } catch (err) {
        console.error('Failed to load requirements matrix:', err);
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
        category: reqCategory,
        sourceReference: reqSource,
        dueDate: reqDueDate,
        targetCostQar: Number(reqTargetCost),
      });
      setIsAddReqModalOpen(false);
      setReqTitle('');
      setReqDesc('');
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to create requirement');
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
    return <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Loading 7-point traceability matrix...</div>;
  }

  const evaluations = matrixData?.evaluations || [];
  const filteredEvaluations = evaluations.filter((ev: any) => {
    if (gapFilter === 'gaps_only' && ev.isFullyTraceable) return false;
    if (gapFilter === 'traceable_only' && !ev.isFullyTraceable) return false;
    return true;
  });

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
            {matrixData?.unassignedRequirements || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#d97706' }}>Actionable gaps required now</div>
        </Card>
      </div>

      {/* Filter and Table Toolbar */}
      <Card style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Filter Gaps:</span>
            <button
              id="btn-filter-all"
              onClick={() => setGapFilter('all')}
              style={{
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: gapFilter === 'all' ? '#2563eb' : '#f1f5f9',
                color: gapFilter === 'all' ? '#ffffff' : '#334155',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              All ({evaluations.length})
            </button>
            <button
              id="btn-filter-gaps"
              onClick={() => setGapFilter('gaps_only')}
              style={{
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: gapFilter === 'gaps_only' ? '#ef4444' : '#f1f5f9',
                color: gapFilter === 'gaps_only' ? '#ffffff' : '#334155',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Has Missing Links
            </button>
            <button
              id="btn-filter-traceable"
              onClick={() => setGapFilter('traceable_only')}
              style={{
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: gapFilter === 'traceable_only' ? '#16a34a' : '#f1f5f9',
                color: gapFilter === 'traceable_only' ? '#ffffff' : '#334155',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Fully Traceable (7/7)
            </button>
          </div>

          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Showing <strong>{filteredEvaluations.length}</strong> requirements
          </div>
        </div>

        {/* 7-Point Matrix Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Code</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Owner (1)</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Date (2)</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Controlled Doc (3)</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>CAD / Design (4)</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>BOQ Line (5)</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Approval (6)</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Site Evidence (7)</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>Score</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>Risk</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvaluations.map((ev: any) => (
                <tr key={ev.requirementId} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: ev.isFullyTraceable ? '#f0fdf4' : '#ffffff' }}>
                  <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>
                    {ev.code}
                  </td>
                  
                  {/* Point 1: Owner */}
                  <td style={{ padding: '12px' }}>
                    {ev.hasOwner ? (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Assigned</span>
                    ) : (
                      <span style={{ color: '#dc2626', fontWeight: 700, backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                        ⚠️ Missing
                      </span>
                    )}
                  </td>

                  {/* Point 2: Date */}
                  <td style={{ padding: '12px' }}>
                    {ev.hasTargetDate ? (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Set</span>
                    ) : (
                      <span style={{ color: '#dc2626', fontWeight: 700, backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                        ⚠️ Missing
                      </span>
                    )}
                  </td>

                  {/* Point 3: Controlled Document */}
                  <td style={{ padding: '12px' }}>
                    {ev.hasControlledDocument ? (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Controlled</span>
                    ) : (
                      <span style={{ color: '#dc2626', fontWeight: 700, backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                        ⚠️ Unlinked
                      </span>
                    )}
                  </td>

                  {/* Point 4: Design Version */}
                  <td style={{ padding: '12px' }}>
                    {ev.hasDesignVersion ? (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ CAD Linked</span>
                    ) : (
                      <span style={{ color: '#dc2626', fontWeight: 700, backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                        ⚠️ No CAD
                      </span>
                    )}
                  </td>

                  {/* Point 5: BOQ Cost */}
                  <td style={{ padding: '12px' }}>
                    {ev.hasBoqCost ? (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Priced</span>
                    ) : (ev.dimensions?.find((d: any) => d.key === 'boqCost')?.status === 'Required Later') ? (
                      <span style={{ color: '#0284c7', fontSize: '11px', backgroundColor: '#e0f2fe', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        ⏳ Req Later (Stg 5)
                      </span>
                    ) : (
                      <span style={{ color: '#dc2626', fontWeight: 700, backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                        ⚠️ Uncosted
                      </span>
                    )}
                  </td>

                  {/* Point 6: Approval */}
                  <td style={{ padding: '12px' }}>
                    {ev.hasApprovalSignoff ? (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Approved</span>
                    ) : (ev.dimensions?.find((d: any) => d.key === 'approvalSignoff')?.status === 'Required Later') ? (
                      <span style={{ color: '#0284c7', fontSize: '11px', backgroundColor: '#e0f2fe', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        ⏳ Req Later (Stg 6)
                      </span>
                    ) : (
                      <span style={{ color: '#d97706', fontWeight: 700, backgroundColor: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>
                        ⏳ Pending
                      </span>
                    )}
                  </td>

                  {/* Point 7: Delivery Evidence */}
                  <td style={{ padding: '12px' }}>
                    {ev.hasDeliveryEvidence ? (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Verified</span>
                    ) : (ev.dimensions?.find((d: any) => d.key === 'deliveryEvidence')?.status === 'Required Later') ? (
                      <span style={{ color: '#64748b', fontSize: '11px', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        ⏳ Req Later (Stg 9)
                      </span>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '11px' }}>
                        Pending Site Build
                      </span>
                    )}
                  </td>

                  {/* Score */}
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <div style={{ fontWeight: 800, color: ev.isStageMaturitySatisfied ? '#059669' : '#2563eb', fontSize: '12px' }}>
                        Stage: {ev.currentStageMaturityPct ?? 100}%
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>
                        Overall: {ev.completedPoints}/7 ({ev.overallTraceabilityPct || ev.traceabilityScorePct}%)
                      </div>
                    </div>
                  </td>

                  {/* Risk Badge */}
                  <td style={{ padding: '12px', textAlign: 'center' }}>
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
                      {ev.riskRating.toUpperCase()}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
          {clarificationsData.meta?.urgentCount > 0 && (
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
          {clarificationsData.data?.map((clar: any) => (
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
        size="md"
      >
        <form onSubmit={handleCreateRequirement} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Requirement Code (Optional)</label>
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

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Technical Scope Description *</label>
            <Textarea
              value={reqDesc}
              onChange={(e) => setReqDesc(e.target.value)}
              placeholder="Detailed technical deliverables, wind ratings, safety standards..."
              rows={3}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Engineering Trade / Category</label>
              <Select value={reqCategory} onChange={(e) => setReqCategory(e.target.value)}>
                <option value="staging_technical">Staging Technical & Rigging</option>
                <option value="creative_visual">Creative Visual & LED</option>
                <option value="health_safety">Health, Safety & QCDD</option>
                <option value="protocol_ceremony">Protocol & Ceremonial</option>
                <option value="operational_logistics">Site Operational Logistics</option>
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={() => setIsAddReqModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmittingReq}>
              {isSubmittingReq ? 'Registering...' : 'Register Requirement'}
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
                <option value="schedule">Timeline / Access</option>
                <option value="protocol">Protocol / Amiri Diwan</option>
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
