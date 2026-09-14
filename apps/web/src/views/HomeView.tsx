import React, { useEffect, useState } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { MetricCard, Card, Badge, Button, AlertBanner, Skeleton, formatCurrency } from '../components/DesignSystem.js';

export const HomeView: React.FC = () => {
  const { currentUser, currentLanguage, navigate, apiClient, refreshTrigger, projects: contextProjects } = useEosContext();
  const [projects, setProjects] = useState<any[]>(() => contextProjects || []);
  const [loading, setLoading] = useState<boolean>(!contextProjects || contextProjects.length === 0);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const res = await apiClient.getProjects();
        if (isMounted) {
          const projectList = (res as any).data || (Array.isArray(res) ? res : []);
          if (projectList && projectList.length > 0) {
            setProjects(projectList);
          }
        }
      } catch {
        // Handled
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [apiClient, refreshTrigger]);

  const isRtl = currentLanguage === 'ar';

  return (
    <div style={{ paddingBottom: '32px' }}>
      {/* Welcome Banner */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
              {isRtl ? (
                <>مرحباً، <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>{currentUser.name}</span></>
              ) : (
                `Good morning, ${currentUser.name}`
              )}
            </h1>
            <Badge variant="accent">{currentUser.role || 'Super Admin'}</Badge>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            {isRtl
              ? 'إليك ملخص العمليات الحرجة والموافقات المطلوبة اليوم عبر محفظة فعاليات E3.'
              : 'Here is your operational situational awareness and urgent items across the E3 event portfolio today.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button variant="secondary" size="md" onClick={() => navigate('/my-work')}>
            📋 {isRtl ? 'مهامي' : 'My Work'}
          </Button>
          <Button id="home-create-project-btn" variant="primary" size="md" onClick={() => navigate('/projects/new')}>
            + {isRtl ? 'مشروع جديد' : 'New Project'}
          </Button>
        </div>
      </div>

      {/* Urgent Operational Alerts */}
      <AlertBanner
        type="warning"
        title={isRtl ? 'تنبيه حرج يتطلب تدخلاً فورياً' : 'Urgent Operational Action Required'}
        action={{
          label: isRtl ? 'مراجعة الآن' : 'Review Cockpit',
          onClick: () => navigate(projects[0] ? `/projects/${projects[0].id}` : '/projects'),
        }}
      >
        {isRtl
          ? 'الموافقة على المواصفات الفنية ومحركات الرفع (Rigging Motors) لفعالية اليوم الوطني معلقة بانتظار توقيع المدير التنفيذي.'
          : 'Qatar National Day 2026 kinetic truss motor approval is pending Four-Eyes executive sign-off before vendor PO release.'}
      </AlertBanner>

      {/* KPI Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <MetricCard
          title={isRtl ? 'المشاريع النشطة' : 'Active Projects'}
          isLoading={loading}
          value={projects.length}
          subtitle={isRtl ? 'مشاريع خاضعة للتنفيذ والمراقبة' : 'Live staging projects'}
          accentColor="#2563eb"
        />
        <MetricCard
          title={isRtl ? 'الموافقات المعلقة' : 'Pending Approvals'}
          value="2"
          subtitle={isRtl ? 'تتطلب توقيع الشريك التنفيذي' : 'Waiting on governance sign-off'}
          badge={{ label: isRtl ? 'إجراء مطلوب' : 'Action Needed', variant: 'danger' }}
          accentColor="#dc2626"
        />
        <MetricCard
          title={isRtl ? 'المهام الحرجة اليوم' : 'Critical Tasks Today'}
          value="4"
          subtitle={isRtl ? 'مهام على المسار الحرج' : 'On critical path timeline'}
          delta={{ text: isRtl ? '٢ مستحقة اليوم' : '2 due today', isPositive: false }}
          accentColor="#d97706"
        />
        <MetricCard
          title={isRtl ? 'العد التنازلي للفعالية' : 'Next Event Move-in'}
          value="67d"
          subtitle={isRtl ? 'مركز الدوحة للمعارض والمؤتمرات' : 'Doha Exhibition & Conv. Center'}
          accentColor="#059669"
        />
      </div>

      {/* Responsive Grid: Projects & What Needs My Attention Today */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Active Projects Summary */}
        <Card
          title={isRtl ? 'دليل المشاريع النشطة' : 'Active Projects Directory'}
          subtitle={isRtl ? 'أحدث المشاريع وحالتها التشغيلية' : 'Latest event deliveries and governance maturity'}
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
              {loading
                ? (isRtl ? 'عرض الكل ←' : 'View All →')
                : (isRtl ? `عرض الكل (${projects.length}) ←` : `View All (${projects.length}) →`)}
            </Button>
          }
          noPadding
        >
          {loading && projects.length === 0 ? (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '60%' }}>
                    <Skeleton width="180px" height="16px" />
                    <Skeleton width="120px" height="12px" />
                  </div>
                  <Skeleton width="70px" height="22px" style={{ borderRadius: '12px' }} />
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
              {isRtl ? 'لا توجد مشاريع حالياً. انقر على "+ مشروع جديد" لإضافة أول فعالية.' : 'No projects found. Click "+ New Project" to onboard your first event.'}
            </div>
          ) : (
            <div>
              {projects.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#2563eb', fontWeight: 700 }}>
                        {p.projectCode || p.code}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                        {p.title}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      {p.clientName || 'Qatar Tourism Authority'} • {isRtl ? 'المصدر:' : 'Origin:'} {p.originCode || 'Tender'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Badge variant={p.maturity === 'delivery' ? 'success' : 'info'}>
                      {p.maturity || 'Onboarding'}
                    </Badge>
                    <span style={{ color: '#94a3b8', fontSize: '14px' }}>{isRtl ? '←' : '→'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* What Needs Attention Today */}
        <div>
          <Card
            title={isRtl ? 'ما يتطلب انتباهك اليوم' : 'What Needs My Attention Today?'}
            subtitle={isRtl ? 'قرارات واختناقات تتطلب إجراءً عاجلاً' : 'Blocked items, decisions & milestone deadlines'}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  padding: '14px',
                  borderRadius: '6px',
                  border: '1px solid #fde68a',
                  backgroundColor: '#fffbeb',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#92400e' }}>
                    {isRtl ? 'بوابة الموافقة الثنائية' : 'Dual Sign-Off Gate'}
                  </span>
                  <Badge variant="warning" size="sm">
                    {isRtl ? 'موافقة تنفيذية' : 'Executive'}
                  </Badge>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginTop: '4px' }}>
                  {isRtl ? 'اعتماد حزمة تقديم مناقصة قطر للسياحة' : 'Approval of Qatar Tourism Tender Submission Package'}
                </div>
                <div style={{ fontSize: '12px', color: '#78350f', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
                  {isRtl
                    ? `مطلوبة من: زيد منصور (مدير المشروع) • القيمة المستهدفة: ${formatCurrency(3500000, 'QAR')}`
                    : `Requested by Zaid Mansour (PM) • Target Value: ${formatCurrency(3500000, 'QAR')}`}
                </div>
                <div style={{ marginTop: '10px' }}>
                  <Button size="sm" variant="primary" onClick={() => navigate(projects[0] ? `/projects/${projects[0].id}` : '/approvals')}>
                    {isRtl ? 'مراجعة طلب الموافقة' : 'Open Approval Review'}
                  </Button>
                </div>
              </div>

              <div
                style={{
                  padding: '14px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                    {isRtl ? 'معلم تسليم قادم' : 'Upcoming Milestone'}
                  </span>
                  <Badge variant="neutral" size="sm">
                    {isRtl ? 'خلال ٣ أيام' : 'In 3 Days'}
                  </Badge>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginTop: '4px' }}>
                  {isRtl
                    ? 'الجولة الفنية الميدانية وتصريح تعليق الهياكل في مركز الدوحة للمعارض'
                    : 'DECC Venue Technical Walkthrough & Rigging Access Check'}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  {isRtl
                    ? 'مُسندة إلى: سالم المري (رئيس العمليات الميدانية)'
                    : 'Assigned to Salem Al-Marri (Head of Live Ops)'}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
