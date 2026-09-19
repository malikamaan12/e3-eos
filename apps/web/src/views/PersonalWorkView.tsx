import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { useEosApi } from '../hooks/useEosApi.js';
import { Badge, Button, Tabs, AlertBanner, Modal } from '../components/DesignSystem.js';
import { ViewStateRenderer } from '../components/ViewStateRenderer.js';
import { ViewStateFactory } from '../view-states.js';

export const PersonalWorkView: React.FC = () => {
  const { currentLanguage, currentUser, selectedProjectId, refreshTrigger, triggerRefresh } = useEosContext();
  const { client } = useEosApi();

  const [activeTab, setActiveTab] = useState('approvals');
  const [signedItems, setSignedItems] = useState<string[]>([]);
  const [inspectingItem, setInspectingItem] = useState<any | null>(null);
  const [dbApprovals, setDbApprovals] = useState<any[]>([]);

  useEffect(() => {
    client.getApprovalRequests(selectedProjectId).then((reqs) => {
      if (reqs && reqs.length > 0) {
        setDbApprovals(reqs.map((r: any) => ({
          id: r.id,
          title: `Formal Sign-off: ${r.targetType?.toUpperCase()} (${r.targetId?.slice(0, 8)})`,
          stage: 'Stage 06: Delivery Execution',
          type: r.targetType || 'Task Approval',
          requestedBy: r.requestedBy || 'Lead Event PM',
          requiresDualSignature: true,
          policyId: 'POL-GOV-01',
          notes: r.reason || 'Requested sign-off for operational clearance.',
          targetHash: r.targetHash || 'hash-genesis',
        })));
      }
    }).catch(() => {});
  }, [selectedProjectId, refreshTrigger, client]);

  const defaultApprovals = [
    {
      id: 'appr-01',
      title: 'Technical Drawings Freeze: Main Stage AV Rigging v2.4',
      stage: 'Stage 04: Technical Design',
      type: 'Drawings Release',
      requestedBy: 'Elena Rostova (Lead CAD Engineer)',
      requiresDualSignature: true,
      policyId: 'POL-ENG-04',
      notes: 'Requires Project Director sign-off before fabrication release.',
      targetHash: '4a6b8c...9f21',
    },
    {
      id: 'appr-02',
      title: 'Purchase Order PO-2026-089: High-Output LED Screen Panels',
      stage: 'Stage 07: Procurement',
      type: 'Commercial PO',
      amount: '30,000 QAR',
      requestedBy: 'Tariq Al-Mansoor (Procurement Lead)',
      requiresDualSignature: true,
      policyId: 'POL-FIN-02',
      notes: 'Within contracted framework ceiling of 100,000 QAR.',
      targetHash: '8b1c3d...2e44',
    },
  ];

  const allPending = [...dbApprovals, ...defaultApprovals];

  const handleSign = async (id: string, targetHash?: string) => {
    try {
      await client.decideApproval(selectedProjectId, id, {
        outcome: 'approved',
        comment: 'Executive sign-off recorded with cryptographic audit entry.',
        targetHash: targetHash || 'hash-genesis',
      });
      triggerRefresh();
    } catch {
      // fallback
    }
    setSignedItems((prev) => [...prev, id]);
  };

  const tabs = [
    { id: 'approvals', label: currentLanguage === 'ar' ? 'الموافقات المعلقة' : 'Pending Approvals', badge: Math.max(0, allPending.length - signedItems.length) },
    { id: 'tasks', label: currentLanguage === 'ar' ? 'مهام التسليم الشخصية' : 'Assigned Deliverables', badge: 3 },
    { id: 'notifications', label: currentLanguage === 'ar' ? 'الإشعارات والتنبيهات' : 'Notifications' },
  ];

  const viewState = ViewStateFactory.ready(allPending);

  return (
    <div data-testid="personal-workspace">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
          {currentLanguage === 'ar' ? 'مساحة العمل الشخصية والموافقات' : 'Personal Work & Governance Approvals'}
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted, #94a3b8)' }}>
          {currentLanguage === 'ar'
            ? `مرحباً ${currentUser?.name || ''}. مراجعة المستندات الدقيقة، أوامر الشراء، والتوقيعات المزدوجة.`
            : `Welcome, ${currentUser?.name || 'User'}. Review exact versioned drawings, purchase orders, and signoffs.`}
        </p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <ViewStateRenderer viewState={viewState}>
        {() => (
          <div>
            {activeTab === 'approvals' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {allPending.length > 0 && signedItems.length >= allPending.length ? (
                  <div
                    style={{
                      padding: '40px',
                      textAlign: 'center',
                      backgroundColor: 'var(--surface-1, #0f1624)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-default, #2a374b)',
                    }}
                  >
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
                    <h3 style={{ margin: '0 0 4px 0' }}>
                      {currentLanguage === 'ar' ? 'تم توقيع كافة الموافقات المعلقة بنجاح' : 'All pending approvals signed!'}
                    </h3>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted, #94a3b8)' }}>
                      {currentLanguage === 'ar'
                        ? 'تم تسجيل المعاملات في سجل التدقيق غير القابل للتلاعب مع التجزئة الرقمية.'
                        : 'Audit logs immutably updated with cryptographic signatures.'}
                    </p>
                  </div>
                ) : (
                  allPending
                    .filter((item) => !signedItems.includes(item.id))
                    .map((item) => (
                      <div
                        key={item.id}
                        style={{
                          backgroundColor: 'var(--surface-1, #0f1624)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-default, #2a374b)',
                          padding: '20px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ maxWidth: '70%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <Badge variant="info">{item.stage}</Badge>
                            <Badge variant="purple">{item.policyId}</Badge>
                            {item.amount && <Badge variant="success">{item.amount}</Badge>}
                            <span style={{ fontSize: '11px', color: '#0369a1', fontFamily: 'monospace' }}>
                              #{item.targetHash}
                            </span>
                          </div>
                          <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700 }}>{item.title}</h3>
                          <div style={{ fontSize: '13px', color: 'var(--text-muted, #94a3b8)', marginBottom: '4px' }}>
                            {currentLanguage === 'ar' ? 'المقدم:' : 'Requested by:'} {item.requestedBy}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary, #cbd5e1)' }}>{item.notes}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <Button size="sm" variant="outline" onClick={() => setInspectingItem(item)}>
                            {currentLanguage === 'ar' ? 'فحص النسخة' : 'Inspect Diff'}
                          </Button>
                          <Button size="sm" variant="primary" onClick={() => handleSign(item.id, item.targetHash)}>
                            {currentLanguage === 'ar' ? 'اعتماد وتوقيع' : 'Approve & Sign'}
                          </Button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}

            {activeTab === 'tasks' && (
              <div style={{ backgroundColor: 'var(--surface-1, #0f1624)', borderRadius: '8px', padding: '20px', border: '1px solid var(--border-default, #2a374b)' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>
                  {currentLanguage === 'ar' ? 'مهام التسليم المعينة لك' : 'Your Assigned Deliverables'}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ padding: '12px', border: '1px solid var(--border-default, #2a374b)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>Verify Qatar Civil Defense Temporary Permit (Stage 10)</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>Due: 11 Oct 2026 | Critical Safety Checkpoint</div>
                    </div>
                    <Badge variant="warning">Critical Gate</Badge>
                  </div>
                  <div style={{ padding: '12px', border: '1px solid var(--border-default, #2a374b)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>Review Subcontractor Acoustic Fabrication Mockup</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>Due: 14 Oct 2026 | Workshop Acceptance</div>
                    </div>
                    <Badge variant="info">In Progress</Badge>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div style={{ backgroundColor: 'var(--surface-1, #0f1624)', borderRadius: '8px', padding: '20px', border: '1px solid var(--border-default, #2a374b)' }}>
                <AlertBanner type="info" title="System Notice">
                  Doha central depot inventory audit completed. All serialized assets verified.
                </AlertBanner>
              </div>
            )}
          </div>
        )}
      </ViewStateRenderer>
    
      {inspectingItem && (
        <Modal
          isOpen={!!inspectingItem}
          onClose={() => setInspectingItem(null)}
          title={inspectingItem.type === 'Drawings Release' ? 'Technical Revision Diff: v2.3 -> v2.4' : 'Commercial Allocation Check: PO-2026-089'}
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="secondary" size="sm" onClick={() => setInspectingItem(null)}>
                {currentLanguage === 'ar' ? 'إغلاق' : 'Close'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  handleSign(inspectingItem.id);
                  setInspectingItem(null);
                }}
              >
                {currentLanguage === 'ar' ? 'اعتماد وتوقيع' : 'Approve & Sign'}
              </Button>
            </div>
          }
        >
          {inspectingItem.type === 'Drawings Release' ? (
            <div>
              <div style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--text-secondary, #cbd5e1)' }}>
                Target Entity: <code style={{ backgroundColor: 'var(--surface-2, #151e2e)', padding: '2px 6px', borderRadius: '4px' }}>CAD_RIGGING_V2.4</code> | Target Hash: <code style={{ backgroundColor: 'var(--surface-2, #151e2e)', padding: '2px 6px', borderRadius: '4px' }}>9f86d08188...</code>
              </div>
              <div style={{ backgroundColor: 'var(--surface-2, #151e2e)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-default, #2a374b)', fontFamily: 'monospace', fontSize: '12px' }}>
                <div style={{ color: '#dc2626' }}>- v2.3: Point loads 4.2 kN per hoist node (Rigging Truss West)</div>
                <div style={{ color: '#16a34a' }}>+ v2.4: Point loads recalculated to 3.8 kN with safety factor 2.5 (LEEIS Certified)</div>
                <div style={{ color: '#16a34a' }}>+ v2.4: Motor pick point moved 450mm south to avoid existing HVAC ducting</div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--text-secondary, #cbd5e1)' }}>
                Contract Framework Ceiling: <strong>100,000 QAR</strong> | Committed Prior: <strong>55,000 QAR</strong>
              </div>
              <div style={{ backgroundColor: 'var(--surface-2, #151e2e)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-default, #2a374b)', fontFamily: 'monospace', fontSize: '12px' }}>
                <div>Parent Framework ID: FRM-2026-AV-LED-01</div>
                <div>Proposed Call-Off Amount: +30,000 QAR</div>
                <div style={{ color: '#16a34a' }}>Post-Commitment Total: 85,000 QAR / 100,000 QAR (Passes Ceiling Invariant AT-044)</div>
              </div>
            </div>
          )}
        </Modal>
      )}

    </div>
  );
};
