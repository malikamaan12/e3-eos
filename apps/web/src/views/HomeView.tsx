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
          backgroundColor: 'var(--surface-1, #0f1624)',
          borderRadius: '8px',
          border: '1px solid var(--border-default, #2a374b)',
          padding: '20px 24px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
              {isRtl ? (
                <>مرحباً، <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>{currentUser?.name || ''}</span></>
              ) : (
                `Good morning, ${currentUser?.name || 'User'}`
              )}
            </h1>
            <Badge variant="accent">{currentUser?.role || 'Super Admin'}</Badge>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #94a3b8)' }}>
            {isRtl
              ? 'إليك ملخص العمليات الحرجة والموافقات المطلوبة اليوم عبر محفظة فعاليات E3.'
              : 'Here is your operational situational awareness and urgent items across the E3 event portfolio today.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button variant="secondary" size="md" onClick={() => navigate('/my-work')}>
            📋 {isRtl ? 'مهامي' : 'My Work'}
          </Button>
          {currentUser?.role !== 'client' && !currentUser?.email?.includes('client') && (
            <Button id="home-create-project-btn" variant="primary" size="md" onClick={() => navigate('/projects/new')}>
              + {isRtl ? 'مشروع جديد' : 'New Project'}
            </Button>
          )}
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
          ? (projects[0] ? `الموافقة الفنية لمشروع ${projects[0].title} معلقة بانتظار توقيع الإدارة التنفيذية.` : 'لا توجد تنبيهات حرجة في الوقت الحالي.')
          : (projects[0] ? `Technical approval for project ${projects[0].title} is pending executive sign-off before vendor PO release.` : 'No urgent alerts requiring intervention.')}
      </AlertBanner>

      {/* Universal Formats Test Lab Quick Access Banner */}
      <div
        id="home-test-lab-banner"
        style={{
          backgroundColor: '#0f172a',
          border: '1.5px solid #d97706',
          borderRadius: '8px',
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 2px 8px rgba(217, 119, 6, 0.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🧪</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#f59e0b', fontSize: '13px' }}>
                PRJ-TEST-ALL-FORMATS
              </span>
              <span style={{ fontSize: '11px', backgroundColor: '#d97706', color: '#ffffff', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                18 FILE FORMATS
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
              {isRtl
                ? 'مشروع الاختبار الشامل جاهز بجميع ملفات CAD و BIM و 3D والفيديو والمستندات الهندسية.'
                : 'Universal test lab project loaded with complete datasets across all 18 CAD, BIM, 3D, Video, and Calc formats.'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            id="home-open-design-lab-btn"
            variant="primary"
            size="sm"
            onClick={() => navigate('/projects/PRJ-TEST-ALL-FORMATS/designs')}
            style={{ backgroundColor: '#2563eb', borderColor: '#1d4ed8' }}
          >
            🎨 {isRtl ? 'فتح معمل التصاميم' : 'Open Design Lab'}
          </Button>
          <Button
            id="home-open-cockpit-btn"
            variant="secondary"
            size="sm"
            onClick={() => navigate('/projects/PRJ-TEST-ALL-FORMATS')}
          >
            🎯 {isRtl ? 'قمرة القيادة' : 'Project Cockpit'}
          </Button>
        </div>
      </div>

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
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
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
                    borderBottom: '1px solid var(--border-subtle, #1e293b)',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-2, #151e2e)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--accent, #d97706)', fontWeight: 700 }}>
                        {p.projectCode || p.code}
                      </span>
                      {((p.projectCode || p.code || '').includes('ALL-FORMATS') || p.id === '00000000-0000-4000-8000-000000000099') && (
                        <span style={{ fontSize: '10px', backgroundColor: '#d97706', color: '#ffffff', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                          🧪 18 FORMATS
                        </span>
                      )}
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                        {p.title || p.name}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
                      {p.clientName || (isRtl ? 'قيد التأكيد' : 'To Be Confirmed')} • {isRtl ? 'المصدر:' : 'Origin:'} {p.originCode || 'Tender'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Badge variant={p.maturity === 'delivery' ? 'success' : 'info'}>
                      {p.maturity || 'Onboarding'}
                    </Badge>
                    <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '14px' }}>{isRtl ? '←' : '→'}</span>
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
                  border: '1px solid var(--accent, #d97706)',
                  backgroundColor: 'var(--accent-soft, rgba(217,119,6,0.14))',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-hover, #f59e0b)' }}>
                    {isRtl ? 'بوابة الموافقة الثنائية' : 'Dual Sign-Off Gate'}
                  </span>
                  <Badge variant="warning" size="sm">
                    {isRtl ? 'موافقة تنفيذية' : 'Executive'}
                  </Badge>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', marginTop: '4px' }}>
                  {projects[0]
                    ? (isRtl ? `اعتماد حزمة التقديم لمشروع: ${projects[0].title}` : `Approval of Submission Package: ${projects[0].title}`)
                    : (isRtl ? 'لا توجد موافقات معلقة' : 'No pending approval packages')}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary, #cbd5e1)', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
                  {projects[0]
                    ? (isRtl
                      ? `مدير المشروع: ${projects[0].pmName || 'المعين'} • القيمة التقديرية: ${formatCurrency(projects[0].contractValue || projects[0].estimatedCost || 0, 'QAR')}`
                      : `Lead PM: ${projects[0].pmName || 'Assigned Lead'} • Estimated Value: ${formatCurrency(projects[0].contractValue || projects[0].estimatedCost || 0, 'QAR')}`)
                    : (isRtl ? 'النظام في حالة تشغيل اعتيادية' : 'System operational and up to date')}
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
                  border: '1px solid var(--border-default, #2a374b)',
                  backgroundColor: 'var(--surface-2, #151e2e)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>
                    {isRtl ? 'معلم تسليم قادم' : 'Upcoming Milestone'}
                  </span>
                  <Badge variant="neutral" size="sm">
                    {isRtl ? 'خلال ٣ أيام' : 'In 3 Days'}
                  </Badge>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', marginTop: '4px' }}>
                  {projects[0]?.venue
                    ? (isRtl
                      ? `الجولة الفنية الميدانية وتصريح تعليق الهياكل في ${projects[0].venue}`
                      : `${projects[0].venue} Venue Technical Walkthrough & Rigging Access Check`)
                    : (isRtl
                      ? 'الجولة الفنية الميدانية وتصريح تعليق الهياكل للموقع'
                      : 'Venue Technical Walkthrough & Rigging Access Check')}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', marginTop: '4px' }}>
                  {projects[0]?.pmName
                    ? (isRtl
                      ? `مُسندة إلى: ${projects[0].pmName}`
                      : `Assigned to ${projects[0].pmName}`)
                    : (isRtl
                      ? 'مُسندة إلى: مدير العمليات الميدانية'
                      : 'Assigned to Site Operations Lead')}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
