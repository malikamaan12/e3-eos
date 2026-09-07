import React, { useState } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { MetricCard, Badge, Button, Tabs } from '../components/DesignSystem.js';
import { ViewStateRenderer } from '../components/ViewStateRenderer.js';
import { ViewStateFactory } from '../view-states.js';
import { formatCurrencyInLocale } from '../localization.js';

export const LeadershipView: React.FC = () => {
  const { currentLanguage, currentOrg, projects, setActiveWorkspace, setSelectedProjectId } = useEosContext();
  const [activeTab, setActiveTab] = useState('portfolio');

  // Worked 90,000 QAR EAC Financial Invariant Data
  const portfolioMetrics = {
    totalBudget: 110000,
    postedActuals: 35000,
    acceptedAccruals: 12000,
    remainingCommitments: 30000,
    uncommittedForecast: 13000,
    estimateAtCompletion: 90000,
    budgetVariance: 20000, // 110k - 90k
    forecastMarginPercent: '43.75%',
    approvedRevenue: 160000,
  };

  const tabs = [
    { id: 'portfolio', label: currentLanguage === 'ar' ? 'نظرة عامة على المحفظة' : 'Portfolio Overview' },
    { id: 'resources', label: currentLanguage === 'ar' ? 'استخدام الموارد' : 'Resource Allocation' },
    { id: 'exceptions', label: currentLanguage === 'ar' ? 'سجل الاستثناءات والحوكمة' : 'Governance & Exceptions', badge: '1 Active' },
  ];

  const viewState = ViewStateFactory.ready(portfolioMetrics);

  return (
    <div data-testid="leadership-workspace">
      {/* View Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
              {currentLanguage === 'ar' ? 'محفظة القيادة التنفيذية' : 'Executive Leadership Portfolio'}
            </h1>
            <Badge variant="purple">{currentOrg.code}</Badge>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
            {currentLanguage === 'ar'
              ? 'مقارنة خطوط الأنابيب، صحة التسليم، التعرض النقدي والقرارات المفتوحة عبر الكيانات المصرح بها'
              : 'Compare pipeline, delivery health, cash exposure and open decisions across authorized entities'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button size="sm" variant="secondary">
            {currentLanguage === 'ar' ? 'تصدير التقرير التنفيذي' : 'Export Executive Brief'}
          </Button>
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <ViewStateRenderer viewState={viewState}>
        {(metrics) => (
          <div>
            {activeTab === 'portfolio' && (
              <>
                {/* Top Financial KPI Strip */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '16px',
                    marginBottom: '28px',
                  }}
                >
                  <MetricCard
                    title={currentLanguage === 'ar' ? 'الميزانية المعتمدة' : 'Approved Budget'}
                    value={formatCurrencyInLocale('QAR', metrics.totalBudget, currentLanguage)}
                    subtitle={currentLanguage === 'ar' ? 'الأساس المتفق عليه' : 'Contracted Baseline'}
                    accentColor="#3b82f6"
                  />
                  <MetricCard
                    title={currentLanguage === 'ar' ? 'التكلفة المقدرة عند الاكتمال (EAC)' : 'Estimate at Completion (EAC)'}
                    value={formatCurrencyInLocale('QAR', metrics.estimateAtCompletion, currentLanguage)}
                    subtitle={currentLanguage === 'ar' ? 'معادلة معيارية خالية من الازدواج' : 'Standard 90k QAR Invariant'}
                    badge={{ label: 'EAC Verified', variant: 'success' }}
                    accentColor="#10b981"
                  />
                  <MetricCard
                    title={currentLanguage === 'ar' ? 'وفر الميزانية الإيجابي' : 'Favorable Variance'}
                    value={formatCurrencyInLocale('QAR', metrics.budgetVariance, currentLanguage)}
                    delta={{ text: '20,000 QAR under budget', isPositive: true }}
                    accentColor="#059669"
                  />
                  <MetricCard
                    title={currentLanguage === 'ar' ? 'هامش المساهمة المتوقع' : 'Forecast Margin %'}
                    value={metrics.forecastMarginPercent}
                    subtitle={currentLanguage === 'ar' ? 'على أساس الإيراد 160 ألف ر.ق' : 'Revenue Basis: 160k QAR'}
                    badge={{ label: 'Target: >35%', variant: 'info' }}
                    accentColor="#8b5cf6"
                  />
                </div>

                {/* Active Projects Table */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '16px 20px',
                      borderBottom: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                      {currentLanguage === 'ar' ? 'المشاريع النشطة تحت الإدارة' : 'Active Projects Under Governance'}
                    </h3>
                    <Badge variant="neutral">{projects.length} Projects</Badge>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: currentLanguage === 'ar' ? 'right' : 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
                        <th style={{ padding: '12px 20px' }}>{currentLanguage === 'ar' ? 'كود المشروع' : 'Code'}</th>
                        <th style={{ padding: '12px 20px' }}>{currentLanguage === 'ar' ? 'عنوان الفعالية' : 'Title'}</th>
                        <th style={{ padding: '12px 20px' }}>{currentLanguage === 'ar' ? 'الأصل / الكيان' : 'Origin'}</th>
                        <th style={{ padding: '12px 20px' }}>{currentLanguage === 'ar' ? 'المرحلة الحالية' : 'Current Stage'}</th>
                        <th style={{ padding: '12px 20px' }}>{currentLanguage === 'ar' ? 'الصحة' : 'Health'}</th>
                        <th style={{ padding: '12px 20px' }}>{currentLanguage === 'ar' ? 'إجراءات' : 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((p) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                          <td style={{ padding: '14px 20px', fontWeight: 700, color: '#2563eb' }}>{p.projectCode}</td>
                          <td style={{ padding: '14px 20px', fontWeight: 600 }}>{p.title}</td>
                          <td style={{ padding: '14px 20px' }}>
                            <Badge variant="neutral">{p.originCode}</Badge>
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <Badge variant="info">Stage 10: Readiness</Badge>
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <Badge variant="success">On Track</Badge>
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedProjectId(p.id);
                                setActiveWorkspace('project');
                              }}
                            >
                              {currentLanguage === 'ar' ? 'فتح المشروع' : 'Open Cockpit'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeTab === 'resources' && (
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>
                  {currentLanguage === 'ar' ? 'توزيع الأصول والمعدات الحساسة' : 'Serialized Equipment Utilization'}
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
                  {currentLanguage === 'ar'
                    ? 'ضمان الحتمية: منع تضارب الحجوزات المتزامنة لمولدات الطاقة والمعدات السمعية والبصرية'
                    : 'Invariant enforced: Zero overlapping reservations for serialized power generators and AV assets.'}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px' }}>
                    <div style={{ fontWeight: 700, marginBottom: '6px' }}>GEN-200KVA-01 (Primary Generator)</div>
                    <Badge variant="success">Reserved: 12-16 Oct 2026</Badge>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>Project: PRJ-2026-SYNTH-01</div>
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px' }}>
                    <div style={{ fontWeight: 700, marginBottom: '6px' }}>LINE-ARRAY-K2 (Audio Rig)</div>
                    <Badge variant="neutral">Available from: 18 Oct 2026</Badge>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>Warehouse: Doha Central Depot</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'exceptions' && (
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>
                  {currentLanguage === 'ar' ? 'سجل الاستثناءات المعتمدة' : 'Active Scoped Exceptions'}
                </h3>
                <div style={{ border: '1px solid #fde68a', backgroundColor: '#fffbeb', borderRadius: '6px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, color: '#92400e' }}>EXC-2026-088: Procurement Ceiling Override</span>
                    <Badge variant="warning">Expires in 48h</Badge>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#78350f' }}>
                    Authorized by Super Admin. Permits temporary single-source PO release pending board ratifications.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </ViewStateRenderer>
    </div>
  );
};
