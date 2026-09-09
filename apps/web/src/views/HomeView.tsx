import React, { useEffect, useState } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { MetricCard, Card, Badge, Button, AlertBanner } from '../components/DesignSystem.js';

export const HomeView: React.FC = () => {
  const { currentUser, currentLanguage, navigate, apiClient, refreshTrigger } = useEosContext();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const res = await apiClient.getProjects();
        if (isMounted) {
          const projectList = (res as any).data || (Array.isArray(res) ? res : []);
          setProjects(projectList);
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
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
              {currentLanguage === 'ar'
                ? `مرحباً، ${currentUser.name}`
                : `Good morning, ${currentUser.name}`}
            </h1>
            <Badge variant="purple">{currentUser.role || 'Super Admin'}</Badge>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            {currentLanguage === 'ar'
              ? 'إليك ملخص العمليات الحرجة والموافقات المطلوبة اليوم عبر محفظة فعاليات E3.'
              : 'Here is your operational situational awareness and urgent items across the E3 event portfolio today.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="secondary" size="md" onClick={() => navigate('/my-work')}>
            📋 {currentLanguage === 'ar' ? 'مهامي' : 'My Work'}
          </Button>
          <Button id="home-create-project-btn" variant="primary" size="md" onClick={() => navigate('/projects/new')}>
            + {currentLanguage === 'ar' ? 'مشروع جديد' : 'New Project'}
          </Button>
        </div>
      </div>

      {/* Urgent Operational Alerts */}
      <AlertBanner
        type="warning"
        title={currentLanguage === 'ar' ? 'تنبيه حرج يتطلب تدخلاً فورياً' : 'Urgent Operational Action Required'}
        action={{
          label: currentLanguage === 'ar' ? 'مراجعة الآن' : 'Review Cockpit',
          onClick: () => navigate(projects[0] ? `/projects/${projects[0].id}` : '/projects'),
        }}
      >
        {currentLanguage === 'ar'
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
          title={currentLanguage === 'ar' ? 'المشاريع النشطة' : 'Active Projects'}
          value={loading ? '...' : projects.length}
          subtitle={currentLanguage === 'ar' ? 'مشاريع خاضعة للتنفيذ والمراقبة' : 'Live staging projects'}
          accentColor="#2563eb"
        />
        <MetricCard
          title={currentLanguage === 'ar' ? 'الموافقات المعلقة' : 'Pending Approvals'}
          value="2"
          subtitle={currentLanguage === 'ar' ? 'تتطلب توقيع الشريك التنفيذي' : 'Waiting on governance sign-off'}
          badge={{ label: 'Action Needed', variant: 'danger' }}
          accentColor="#dc2626"
        />
        <MetricCard
          title={currentLanguage === 'ar' ? 'المهام الحرجة اليوم' : 'Critical Tasks Today'}
          value="4"
          subtitle={currentLanguage === 'ar' ? 'مهام على المسار الحرج' : 'On critical path timeline'}
          delta={{ text: '2 due today', isPositive: false }}
          accentColor="#d97706"
        />
        <MetricCard
          title={currentLanguage === 'ar' ? 'العد التنازلي للفعالية' : 'Next Event Move-in'}
          value="67d"
          subtitle="Doha Exhibition & Conv. Center"
          accentColor="#059669"
        />
      </div>

      {/* Two Column Grid: Projects & What Needs My Attention Today */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
        {/* Active Projects Summary */}
        <Card
          title={currentLanguage === 'ar' ? 'دليل المشاريع النشطة' : 'Active Projects Directory'}
          subtitle={currentLanguage === 'ar' ? 'أحدث المشاريع وحالتها التشغيلية' : 'Latest event deliveries and governance maturity'}
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
              View All ({projects.length}) →
            </Button>
          }
          noPadding
        >
          {projects.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
              No projects found. Click "+ New Project" to onboard your first event.
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
                      {p.clientName || 'Qatar Tourism Authority'} • Origin: {p.originCode || 'Tender'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Badge variant={p.maturity === 'delivery' ? 'success' : 'info'}>
                      {p.maturity || 'Onboarding'}
                    </Badge>
                    <span style={{ color: '#94a3b8', fontSize: '14px' }}>➔</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* What Needs Attention Today */}
        <div>
          <Card
            title={currentLanguage === 'ar' ? 'ما يتطلب انتباهك اليوم' : 'What Needs My Attention Today?'}
            subtitle={currentLanguage === 'ar' ? 'قرارات واختناقات تتطلب إجراءً' : 'Blocked items, decisions & milestone deadlines'}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #fde68a',
                  backgroundColor: '#fffbeb',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#92400e' }}>Dual Sign-Off Gate</span>
                  <Badge variant="warning" size="sm">Executive</Badge>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginTop: '4px' }}>
                  Approval of Qatar Tourism Tender Submission Package
                </div>
                <div style={{ fontSize: '11px', color: '#78350f', marginTop: '4px' }}>
                  Requested by Zaid Mansour (PM) • Target Value: 3,500,000 QAR
                </div>
                <div style={{ marginTop: '8px' }}>
                  <Button size="sm" variant="primary" onClick={() => navigate(projects[0] ? `/projects/${projects[0].id}` : '/approvals')}>
                    Open Approval Review
                  </Button>
                </div>
              </div>

              <div
                style={{
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Upcoming Milestone</span>
                  <Badge variant="neutral" size="sm">In 3 Days</Badge>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginTop: '4px' }}>
                  DECC Venue Technical Walkthrough & Rigging Access Check
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  Assigned to Salem Al-Marri (Head of Live Ops)
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
