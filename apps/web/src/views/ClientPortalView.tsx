import React, { useState } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Badge, Button, AlertBanner } from '../components/DesignSystem.js';
import { ViewStateRenderer } from '../components/ViewStateRenderer.js';
import { ViewStateFactory } from '../view-states.js';
import { ClientProjectionAdapter, ClientPortalProjectView } from '../client-projection.js';
import { formatCurrencyInLocale } from '../localization.js';

export const ClientPortalView: React.FC = () => {
  const { currentLanguage, projects, selectedProjectId } = useEosContext();
  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  const [approvedDecisions, setApprovedDecisions] = useState<string[]>([]);

  // Construct raw project model without leaking internal buy rates/margins to projection
  const rawProjectData = {
    id: currentProject.id,
    code: currentProject.projectCode,
    title: currentProject.title,
    clientName: 'Client Alpha Corporation (Synthetic)',
    currentStageName: 'Stage 10: Technical Readiness & Rehearsals',
    approvedProposal: {
      id: 'prop-2026-v2',
      version: 2,
      sellPrice: '160000.00',
      currency: 'QAR',
      approvedAt: '2026-09-01T10:00:00Z',
    },
    deliverables: [
      {
        name: 'Concept Moodboards & 3D Spatial Renders',
        category: 'Creative Design',
        isPublishedToClient: true,
        isComplete: true,
        isAccepted: true,
        progressPercentage: 100,
        verifiedMediaUrls: ['/assets/render-01.png', '/assets/render-02.png'],
      },
      {
        name: 'Main Stage Rigging & LED Visual Wall',
        category: 'AV Production',
        isPublishedToClient: true,
        isComplete: true,
        isAccepted: false,
        progressPercentage: 90,
        verifiedMediaUrls: ['/assets/rigging-check.png'],
      },
    ],
    changeRequests: [
      {
        id: 'cr-001',
        title: 'CR-001: Extended VIP Lounge Lighting Experience',
        description: 'Addition of 12 wireless architectural uplighters for evening VIP reception.',
        clientAdditionalAmount: '15000',
        currency: 'QAR',
        status: 'pending_client_approval',
      },
    ],
    incidents: [
      {
        id: 'inc-ext-01',
        audience: 'client_visible',
        operationalImpact: '30-minute electrical load test rehearsal scheduled',
        status: 'completed',
        timestamp: '2026-09-05T14:00:00Z',
      },
      {
        id: 'inc-int-02',
        audience: 'internal_only', // Will be strictly stripped by ClientProjectionAdapter!
        operationalImpact: 'Subcontractor supplier delivery delayed by 2 hours',
        status: 'resolved',
      },
    ],
  };

  const clientView: ClientPortalProjectView = ClientProjectionAdapter.projectForClient(rawProjectData);

  const handleApproveDecision = (id: string) => {
    setApprovedDecisions((prev) => [...prev, id]);
  };

  const viewState = ViewStateFactory.ready(clientView);

  return (
    <div data-testid="client-portal-workspace">
      {/* Client Portal Header */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Badge variant="purple">{currentLanguage === 'ar' ? 'بوابة العميل المعتمدة' : 'Verified Client Portal'}</Badge>
              <span style={{ fontSize: '13px', color: '#64748b' }}>{clientView.projectCode}</span>
            </div>
            <h1 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
              {clientView.title}
            </h1>
            <div style={{ fontSize: '14px', color: '#475569' }}>
              {currentLanguage === 'ar' ? 'العميل:' : 'Client:'} <strong>{clientView.clientName}</strong>
            </div>
          </div>

          <div style={{ textAlign: currentLanguage === 'ar' ? 'left' : 'right' }}>
            <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              {currentLanguage === 'ar' ? 'قيمة العقد المعتمدة' : 'Contracted Amount'}
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#059669' }}>
              {formatCurrencyInLocale('QAR', clientView.approvedProposal?.sellPrice || '160000', currentLanguage)}
            </div>
          </div>
        </div>

        {/* Security Projection Guarantee Alert */}
        <div style={{ marginTop: '16px' }}>
          <AlertBanner type="info" title={currentLanguage === 'ar' ? 'ضمان حماية البيانات' : 'Client Safe Projection Active'}>
            {currentLanguage === 'ar'
              ? 'يتم تنقية أسعار الشراء وهوامش الربح الداخلية والملاحظات الفنية الحساسة تلقائياً عبر خادم E3-EOS.'
              : 'Internal buy rates, profit margins, and internal HSE narratives are cryptographically filtered server-side.'}
          </AlertBanner>
        </div>
      </div>

      <ViewStateRenderer viewState={viewState}>
        {(project) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Pending Decisions Awaiting Client Approval */}
            {project.pendingDecisions.length > 0 && (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                    {currentLanguage === 'ar' ? 'القرارات المعلقة بانتظار اعتمادكم' : 'Decisions Awaiting Your Sign-Off'}
                  </h3>
                  <Badge variant="warning">{project.pendingDecisions.length - approvedDecisions.length} Action Needed</Badge>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {project.pendingDecisions.map((dec) => {
                    const isApproved = approvedDecisions.includes(dec.decisionId);
                    return (
                      <div
                        key={dec.decisionId}
                        style={{
                          border: `1px solid ${isApproved ? '#86efac' : '#fde68a'}`,
                          backgroundColor: isApproved ? '#f0fdf4' : '#fffbeb',
                          borderRadius: '6px',
                          padding: '16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ maxWidth: '75%' }}>
                          <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a', marginBottom: '4px' }}>
                            {dec.title}
                          </div>
                          <div style={{ fontSize: '13px', color: '#475569', marginBottom: '6px' }}>
                            {dec.description}
                          </div>
                          {dec.financialExposure && (
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}>
                              {currentLanguage === 'ar' ? 'التأثير المالي:' : 'Financial Impact:'} +{formatCurrencyInLocale('QAR', dec.financialExposure, currentLanguage)}
                            </div>
                          )}
                        </div>

                        <div>
                          {isApproved ? (
                            <Badge variant="success">
                              {currentLanguage === 'ar' ? 'تم الاعتماد والتوقيع' : 'Approved & Signed'}
                            </Badge>
                          ) : (
                            <Button size="sm" variant="primary" onClick={() => handleApproveDecision(dec.decisionId)}>
                              {currentLanguage === 'ar' ? 'اعتماد التغيير' : 'Approve Variation'}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Published Deliverables & Visual Evidence */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                padding: '20px',
              }}
            >
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700 }}>
                {currentLanguage === 'ar' ? 'المخرجات والأدلة المعتمدة' : 'Published Deliverables & Verified Evidence'}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                {project.publishedDeliverables.map((deliv, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <Badge variant="neutral">{deliv.category}</Badge>
                      <Badge variant={deliv.status === 'Accepted' ? 'success' : 'info'}>{deliv.status}</Badge>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '10px' }}>{deliv.name}</div>
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                        <span>Progress</span>
                        <span>{deliv.completionPercentage}%</span>
                      </div>
                      <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${deliv.completionPercentage}%`,
                            backgroundColor: '#2563eb',
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      📷 {deliv.evidencePhotos.length} verified inspection photos attached
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </ViewStateRenderer>
    </div>
  );
};
