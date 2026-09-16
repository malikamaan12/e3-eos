import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, Badge, Button, Modal, Input, Textarea, Select } from '../components/DesignSystem.js';
import {
  ClarificationItem,
  ClarificationStatus,
  ClarificationCategory,
  getClarificationCountdownHours,
  evaluateClarificationCrossModuleImpact,
} from '@e3-eos/domain';

interface ClarificationsViewProps {
  projectId: string;
}

export const ClarificationsView: React.FC<ClarificationsViewProps> = ({ projectId }) => {
  const { apiClient, refreshTrigger, triggerRefresh, currentProject, currentUser } = useEosContext();

  const [clarifications, setClarifications] = useState<ClarificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // New Clarification Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [newCode, setNewCode] = useState<string>('');
  const [newTitle, setNewTitle] = useState<string>('');
  const [newQuestion, setNewQuestion] = useState<string>('');
  const [newCategory, setNewCategory] = useState<ClarificationCategory>('technical');
  const [newDiscipline, setNewDiscipline] = useState<string>('staging');
  const [newTargetHours, setNewTargetHours] = useState<number>(48);
  const [newReqId, setNewReqId] = useState<string>('');
  const [newDesignId, setNewDesignId] = useState<string>('');
  const [newBoqCode, setNewBoqCode] = useState<string>('');
  const [newTaskCode, setNewTaskCode] = useState<string>('');
  const [newDocNum, setNewDocNum] = useState<string>('');
  const [hasCostImpact, setHasCostImpact] = useState<boolean>(false);
  const [hasSchedImpact, setHasSchedImpact] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Cross Module Impact Modal
  const [inspectingItem, setInspectingItem] = useState<ClarificationItem | null>(null);

  // Seed baseline state
  const baselineState = {
    approvedBudgetQar: 985000,
    approvedDurationDays: 14,
  };

  useEffect(() => {
    let isMounted = true;
    async function loadClarifications() {
      setLoading(true);
      try {
        const res = await apiClient.getClarifications(projectId).catch(() => ({ data: [] }));
        if (isMounted) {
          const isSyntheticDemo = projectId === 'f1111111-1111-4111-8111-111111111111' || projectId === '00000000-0000-4000-8000-000000000001';
          const items: ClarificationItem[] = res?.data?.length > 0 ? res.data : (isSyntheticDemo ? getSeedClarifications(projectId) : []);
          setClarifications(items);
        }
      } catch (err) {
        console.error('Failed to load clarifications:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadClarifications();
    return () => { isMounted = false; };
  }, [apiClient, projectId, refreshTrigger]);

  function getSeedClarifications(pId: string): ClarificationItem[] {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();
    const in96h = new Date(now.getTime() + 96 * 3600 * 1000).toISOString();

    return [
      {
        id: 'rfi-001',
        projectId: pId,
        clarificationCode: 'RFI-QND-001',
        title: 'Central Kinetic LED Arch Maximum Weight Rating & Wind Curtailment',
        question: 'Confirm whether structural towers require supplemental ballast under 38 km/h wind gusts.',
        category: 'technical',
        discipline: 'staging',
        source: 'bidder_inquiry',
        author: 'Karim Haddad (Technical Director)',
        assignedResponder: 'Lusail Civil Defence Structural Board',
        dateRaised: '2026-09-09T10:00:00Z',
        targetResponseDate: in24h, // < 72h -> URGENT!
        dueAt: in24h,
        hasCommercialImpact: true,
        hasScheduleImpact: false,
        status: 'awaiting_response',
        impact: {
          hasScopeImpact: false,
          hasCostImpact: true,
          hasScheduleImpact: false,
          estimatedCostImpactQar: 45000,
          estimatedScheduleImpactDays: 0,
          requiresVariationOrder: true,
          notes: 'May require 8x additional concrete 2-ton deadweight ballasts.',
        },
        linkedRequirementIds: ['REQ-QND-001'],
        linkedDesignIds: ['DES-QND-001'],
        linkedBoqLineCodes: ['BOQ-AV-001'],
        linkedScheduleTaskIds: ['TSK-002'],
        linkedDocumentNumbers: ['E3-QND26-AV-DWG-0001'],
        createdAt: '2026-09-09T10:00:00Z',
      },
      {
        id: 'rfi-002',
        projectId: pId,
        clarificationCode: 'RFI-QND-002',
        title: 'VIP Royal Protocol Portico Carpet Flame Resistance Certification',
        question: 'Clarify testing standards required for flame-retardant carpet under Civil Defence Law No. 13.',
        category: 'protocol',
        discipline: 'health_safety',
        source: 'client_query',
        author: 'Zaid Mansour (Lead PM)',
        assignedResponder: 'Amiri Diwan Protocol Lead',
        dateRaised: '2026-09-08T14:00:00Z',
        targetResponseDate: in96h,
        dueAt: in96h,
        hasCommercialImpact: false,
        hasScheduleImpact: false,
        status: 'internal_review',
        impact: {
          hasScopeImpact: false,
          hasCostImpact: false,
          hasScheduleImpact: false,
          requiresVariationOrder: false,
        },
        linkedRequirementIds: ['REQ-QND-004'],
        linkedDesignIds: [],
        linkedBoqLineCodes: [],
        linkedScheduleTaskIds: [],
        linkedDocumentNumbers: ['E3-QND26-HSE-SPC-0003'],
        createdAt: '2026-09-08T14:00:00Z',
      },
      {
        id: 'rfi-003',
        projectId: pId,
        clarificationCode: 'RFI-QND-000',
        title: 'Boulevard Power Feeder Substation Interconnection Point',
        question: 'Confirm primary transformer tap settings and secondary breaker capacity.',
        category: 'venue_operations',
        discipline: 'power_hvac',
        source: 'bidder_inquiry',
        author: 'Lead Electrical Engineer',
        assignedResponder: 'Kahramaa Technical Inspector',
        dateRaised: '2026-09-05T09:00:00Z',
        targetResponseDate: '2026-09-07T12:00:00Z',
        dueAt: '2026-09-07T12:00:00Z',
        closedDate: '2026-09-07T11:30:00Z',
        response: 'Approved: 400A 3-phase connection point verified at Feeder Pillar 14-B.',
        respondedBy: 'Eng. Khalid Al-Marri (Kahramaa)',
        respondedAt: '2026-09-07T11:30:00Z',
        hasCommercialImpact: false,
        hasScheduleImpact: false,
        status: 'closed',
        impact: {
          hasScopeImpact: false,
          hasCostImpact: false,
          hasScheduleImpact: false,
          requiresVariationOrder: false,
        },
        linkedRequirementIds: ['REQ-QND-002'],
        linkedDesignIds: [],
        linkedBoqLineCodes: [],
        linkedScheduleTaskIds: ['TSK-001'],
        linkedDocumentNumbers: [],
        createdAt: '2026-09-05T09:00:00Z',
      },
    ];
  }

  const handleCreateClarification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const now = new Date();
      const targetDate = new Date(now.getTime() + newTargetHours * 3600 * 1000).toISOString();

      const item: ClarificationItem = {
        id: `rfi-${Date.now()}`,
        projectId,
        clarificationCode: newCode,
        title: newTitle,
        question: newQuestion,
        category: newCategory,
        discipline: newDiscipline,
        source: 'bidder_inquiry',
        author: currentUser?.name ? `${currentUser.name} (${currentUser.role || 'PM'})` : 'Project Manager',
        assignedResponder: currentProject?.clientName ? `${currentProject.clientName} Technical Committee` : 'Client Technical Committee',
        dateRaised: now.toISOString(),
        targetResponseDate: targetDate,
        dueAt: targetDate,
        hasCommercialImpact: hasCostImpact,
        hasScheduleImpact: hasSchedImpact,
        status: 'draft',
        impact: {
          hasScopeImpact: false,
          hasCostImpact: hasCostImpact,
          hasScheduleImpact: hasSchedImpact,
          estimatedCostImpactQar: hasCostImpact ? 35000 : 0,
          estimatedScheduleImpactDays: hasSchedImpact ? 1 : 0,
          requiresVariationOrder: hasCostImpact || hasSchedImpact,
        },
        linkedRequirementIds: newReqId ? [newReqId] : [],
        linkedDesignIds: newDesignId ? [newDesignId] : [],
        linkedBoqLineCodes: newBoqCode ? [newBoqCode] : [],
        linkedScheduleTaskIds: newTaskCode ? [newTaskCode] : [],
        linkedDocumentNumbers: newDocNum ? [newDocNum] : [],
        createdAt: now.toISOString(),
      };

      setClarifications([item, ...clarifications]);
      setIsNewModalOpen(false);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to create clarification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransitionStatus = (item: ClarificationItem, newStatus: ClarificationStatus) => {
    const updated = clarifications.map((c) => {
      if (c.id === item.id) {
        return {
          ...c,
          status: newStatus,
          closedDate: newStatus === 'closed' ? new Date().toISOString() : c.closedDate,
        };
      }
      return c;
    });
    setClarifications(updated);
  };

  const filteredItems = clarifications.filter((item) => {
    if (selectedStatusFilter !== 'all' && item.status !== selectedStatusFilter) return false;
    if (selectedCategoryFilter !== 'all' && item.category !== selectedCategoryFilter) return false;
    return true;
  });

  const totalCount = clarifications.length;
  const openCount = clarifications.filter(
    (c) => c.status !== 'closed' && c.status !== 'answered' && c.status !== 'superseded' && c.status !== 'withdrawn'
  ).length;
  const urgentCount = clarifications.filter((c) => getClarificationCountdownHours(c).isUrgent).length;
  const answeredCount = clarifications.filter((c) => c.status === 'answered' || c.status === 'closed').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Workspace Header */}
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
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Project Clarifications & RFI Workspace
            </span>
            <Badge variant="info">Stage 04: Clarification & Design Development</Badge>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
            Formal Inquiry, Tender Addenda & Cross-Module Impact Matrix
          </div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            Tracks 8 lifecycle stages with &lt; 72h countdown timers, explicit 5-module link pickers, and strict approved baseline protection.
          </div>
        </div>

        <Button
          id="btn-new-clarification"
          variant="primary"
          size="md"
          onClick={() => setIsNewModalOpen(true)}
        >
          + Raise Clarification / RFI
        </Button>
      </div>

      {/* KPI Ribbon */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '12px',
        }}
      >
        <Card style={{ padding: '16px', borderLeft: '4px solid #38bdf8' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total RFIs Logged</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>{totalCount}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Formal queries across all disciplines</div>
        </Card>

        <Card style={{ padding: '16px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Active / Pending Action</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', margin: '4px 0' }}>{openCount}</div>
          <div style={{ fontSize: '11px', color: '#b45309' }}>Draft, Internal Review & Awaiting Response</div>
        </Card>

        <Card style={{ padding: '16px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Urgent (&lt; 72h Deadline)</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444', margin: '4px 0' }}>{urgentCount}</div>
          <div style={{ fontSize: '11px', color: '#b91c1c' }}>Countdown expiring imminently</div>
        </Card>

        <Card style={{ padding: '16px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Answered / Closed</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', margin: '4px 0' }}>{answeredCount}</div>
          <div style={{ fontSize: '11px', color: '#047857' }}>Resolved and formally archived</div>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: 'All Statuses' },
              { key: 'draft', label: 'Draft' },
              { key: 'internal_review', label: 'Internal Review' },
              { key: 'submitted', label: 'Submitted' },
              { key: 'awaiting_response', label: 'Awaiting Response' },
              { key: 'answered', label: 'Answered' },
              { key: 'closed', label: 'Closed' },
              { key: 'superseded', label: 'Superseded' },
              { key: 'withdrawn', label: 'Withdrawn' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedStatusFilter(tab.key)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: selectedStatusFilter === tab.key ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  backgroundColor: selectedStatusFilter === tab.key ? '#eff6ff' : '#ffffff',
                  color: selectedStatusFilter === tab.key ? '#1d4ed8' : '#475569',
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Category Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Category:</span>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                backgroundColor: '#ffffff',
              }}
            >
              <option value="all">All Categories</option>
              <option value="technical">Technical</option>
              <option value="commercial">Commercial</option>
              <option value="venue">Venue</option>
              <option value="operations">Operations</option>
              <option value="protocol">Protocol</option>
              <option value="safety">Safety</option>
              <option value="design">Design</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Clarification Register Table */}
      <Card style={{ padding: '20px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>RFI Code</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Title & Discipline</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Author / Responder</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Target Response</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Cross-Module Links</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const countdown = getClarificationCountdownHours(item);
                const statusBadgeVariant =
                  item.status === 'closed'
                    ? 'success'
                    : item.status === 'answered'
                    ? 'info'
                    : item.status === 'awaiting_response'
                    ? 'warning'
                    : item.status === 'internal_review'
                    ? 'neutral'
                    : 'secondary';

                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      backgroundColor: countdown.isUrgent ? '#fffbeb' : '#ffffff',
                    }}
                  >
                    {/* Code */}
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                      {item.clarificationCode}
                    </td>

                    {/* Title & Discipline */}
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '3px' }}>{item.title}</div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <Badge variant="neutral" size="sm">
                          {item.discipline?.toUpperCase()}
                        </Badge>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>{item.category}</span>
                        {item.hasCommercialImpact && (
                          <span style={{ fontSize: '10px', color: '#b91c1c', backgroundColor: '#fee2e2', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            💰 Cost Impact
                          </span>
                        )}
                        {item.hasScheduleImpact && (
                          <span style={{ fontSize: '10px', color: '#d97706', backgroundColor: '#fef3c7', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            ⏱️ Schedule Impact
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px' }}>
                      <Badge variant={statusBadgeVariant as any} size="sm">
                        {item.status.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                    </td>

                    {/* Author / Responder */}
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontSize: '11px', color: '#0f172a', fontWeight: 600 }}>{item.author}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Resp: {item.assignedResponder}</div>
                    </td>

                    {/* Target Response & Countdown */}
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontSize: '11px', color: '#475569' }}>
                        {new Date(item.targetResponseDate || item.dueAt).toLocaleDateString()}
                      </div>
                      {countdown.isUrgent ? (
                        <div style={{ display: 'inline-block', backgroundColor: '#ef4444', color: '#ffffff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, marginTop: '2px' }}>
                          ⚠️ {countdown.hoursRemaining}h remaining!
                        </div>
                      ) : countdown.isOverdue ? (
                        <div style={{ display: 'inline-block', backgroundColor: '#b91c1c', color: '#ffffff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, marginTop: '2px' }}>
                          🔴 Overdue ({Math.abs(countdown.hoursRemaining)}h)
                        </div>
                      ) : (
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                          ⏳ {countdown.hoursRemaining > 0 ? `${countdown.hoursRemaining}h remaining` : 'Resolved'}
                        </div>
                      )}
                    </td>

                    {/* Cross-Module Links */}
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {(item.linkedRequirementIds || []).map((r) => (
                          <span key={r} style={{ fontSize: '10px', backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '1px 5px', borderRadius: '3px' }}>
                            Req: {r}
                          </span>
                        ))}
                        {(item.linkedDesignIds || []).map((d) => (
                          <span key={d} style={{ fontSize: '10px', backgroundColor: '#fdf4ff', color: '#c026d3', padding: '1px 5px', borderRadius: '3px' }}>
                            Des: {d}
                          </span>
                        ))}
                        {(item.linkedBoqLineCodes || []).map((b) => (
                          <span key={b} style={{ fontSize: '10px', backgroundColor: '#ecfdf5', color: '#059669', padding: '1px 5px', borderRadius: '3px' }}>
                            BOQ: {b}
                          </span>
                        ))}
                        {(item.linkedScheduleTaskIds || []).map((t) => (
                          <span key={t} style={{ fontSize: '10px', backgroundColor: '#fff7ed', color: '#ea580c', padding: '1px 5px', borderRadius: '3px' }}>
                            Task: {t}
                          </span>
                        ))}
                        {(item.linkedDocumentNumbers || []).map((doc) => (
                          <span key={doc} style={{ fontSize: '10px', backgroundColor: '#f1f5f9', color: '#475569', padding: '1px 5px', borderRadius: '3px' }}>
                            Doc: {doc}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setInspectingItem(item)}
                        >
                          🔍 Impact
                        </Button>
                        {item.status !== 'closed' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const nextStatus: Record<string, ClarificationStatus> = {
                                draft: 'internal_review',
                                internal_review: 'submitted',
                                submitted: 'awaiting_response',
                                awaiting_response: 'answered',
                                answered: 'closed',
                              };
                              handleTransitionStatus(item, nextStatus[item.status] || 'closed');
                            }}
                          >
                            Advance ➔
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</div>
                    <div style={{ fontWeight: 700, color: '#334155', fontSize: '14px' }}>No clarifications found matching active filter</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>Try switching the status or category filter, or raise a new clarification.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cross-Module Impact Assessment Modal */}
      {inspectingItem && (
        <Modal
          isOpen={Boolean(inspectingItem)}
          onClose={() => setInspectingItem(null)}
          title={`Cross-Module Impact Assessment: ${inspectingItem.clarificationCode}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Approved Baseline Protection Banner */}
            <div
              style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '6px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '20px' }}>🛡️</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '12px', color: '#166534' }}>
                  Approved Commercial & Schedule Baseline Protected
                </div>
                <div style={{ fontSize: '11px', color: '#15803d' }}>
                  Impact analysis indicates potential downstream variations, but approved contract baseline ({baselineState.approvedBudgetQar.toLocaleString()} QAR) remains strictly unchanged until a formal Variation Order is authorized.
                </div>
              </div>
            </div>

            {/* Impact Details */}
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                Affected Functional Modules
              </h4>
              {(() => {
                const evalImpact = evaluateClarificationCrossModuleImpact(inspectingItem, baselineState);
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {evalImpact.impactDetails.map((detail, idx) => (
                      <div
                        key={idx}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '10px 12px',
                          backgroundColor: '#f8fafc',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 700, fontSize: '12px', color: '#2563eb' }}>
                            {detail.module}
                          </span>
                          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748b' }}>
                            {detail.reference}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#334155' }}>{detail.summary}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <Button variant="secondary" onClick={() => setInspectingItem(null)}>
                Close Inspector
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* New Clarification Modal */}
      {isNewModalOpen && (
        <Modal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          title="Raise New Clarification / RFI"
        >
          <form onSubmit={handleCreateClarification} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label="RFI Code"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                required
              />
              <Select
                label="Discipline"
                value={newDiscipline}
                onChange={(e) => setNewDiscipline(e.target.value)}
                options={[
                  { value: 'staging', label: 'Staging & Structures' },
                  { value: 'audio_visual', label: 'Audio / Visual' },
                  { value: 'lighting', label: 'Lighting' },
                  { value: 'health_safety', label: 'Health & Safety' },
                  { value: 'power_hvac', label: 'Power & HVAC' },
                  { value: 'commercial', label: 'Commercial' },
                ]}
              />
            </div>

            <Input
              label="Clarification Subject"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Structural Tie-in Anchor Capacity"
              required
            />

            <Textarea
              label="Detailed Technical Question"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Enter detailed clarification inquiry for client / technical authority..."
              rows={3}
              required
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Select
                label="Category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as ClarificationCategory)}
                options={[
                  { value: 'technical', label: 'Technical' },
                  { value: 'commercial', label: 'Commercial' },
                  { value: 'venue', label: 'Venue' },
                  { value: 'operations', label: 'Operations' },
                  { value: 'protocol', label: 'Protocol' },
                  { value: 'safety', label: 'Safety' },
                  { value: 'design', label: 'Design' },
                ]}
              />
              <Input
                label="Response Deadline Window (Hours)"
                type="number"
                value={newTargetHours}
                onChange={(e) => setNewTargetHours(Number(e.target.value))}
                hint="≤ 72h will be automatically flagged as urgent"
              />
            </div>

            {/* Link Picker Section */}
            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                🔗 Cross-Module Link Picker (5-Way Traceability)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <Input
                  label="Linked Scope Requirement"
                  value={newReqId}
                  onChange={(e) => setNewReqId(e.target.value)}
                  placeholder="e.g. REQ-001"
                />
                <Input
                  label="Linked Design Package"
                  value={newDesignId}
                  onChange={(e) => setNewDesignId(e.target.value)}
                  placeholder="e.g. DES-001"
                />
                <Input
                  label="Linked BOQ Line"
                  value={newBoqCode}
                  onChange={(e) => setNewBoqCode(e.target.value)}
                  placeholder="e.g. BOQ-001"
                />
                <Input
                  label="Linked Schedule Task"
                  value={newTaskCode}
                  onChange={(e) => setNewTaskCode(e.target.value)}
                  placeholder="e.g. TSK-001"
                />
              </div>
              <div style={{ marginTop: '8px' }}>
                <Input
                  label="Linked Controlled Document"
                  value={newDocNum}
                  onChange={(e) => setNewDocNum(e.target.value)}
                  placeholder="e.g. DOC-DWG-0001"
                />
              </div>
            </div>

            {/* Impact Checkboxes */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={hasCostImpact}
                  onChange={(e) => setHasCostImpact(e.target.checked)}
                />
                Potential Commercial Cost Impact
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={hasSchedImpact}
                  onChange={(e) => setHasSchedImpact(e.target.checked)}
                />
                Potential Schedule Delivery Impact
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <Button variant="ghost" onClick={() => setIsNewModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={isSubmitting}>
                Submit Clarification
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
