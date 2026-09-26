import React from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Badge, Button, Card, MetricCard, Skeleton } from '../components/DesignSystem.js';
import './HomeView.css';

type Project = { id: string; title?: string; name?: string; projectCode?: string; code?: string; maturity?: string; clientName?: string };
const stages = [
  { key: 'idea', en: 'Idea', ar: 'فكرة', color: 'var(--chart-1)' },
  { key: 'developing', en: 'Developing', ar: 'قيد التطوير', color: 'var(--chart-1)' },
  { key: 'submitted', en: 'Submitted', ar: 'تم التقديم', color: 'var(--chart-2)' },
  { key: 'negotiating', en: 'Negotiating', ar: 'قيد التفاوض', color: 'var(--chart-2)' },
  { key: 'authorised', en: 'Authorised', ar: 'معتمد', color: 'var(--chart-3)' },
  { key: 'delivering', en: 'Delivering', ar: 'قيد التنفيذ', color: 'var(--chart-3)' },
  { key: 'closing', en: 'Closing', ar: 'قيد الإغلاق', color: 'var(--chart-4)' },
  { key: 'closed', en: 'Closed', ar: 'مغلق', color: 'var(--chart-4)' },
  { key: 'unknown', en: 'Not recorded', ar: 'غير مسجل', color: 'var(--text-muted)' },
];
const stageOf = (p: Project) => p.maturity === 'delivery' ? 'delivering' : stages.some(s => s.key === p.maturity) ? p.maturity! : 'unknown';

export const HomeView: React.FC = () => {
  const { currentUser, currentLanguage, navigate, projects, projectsLoading: loading, projectsError: error, triggerRefresh } = useEosContext();
  const canAdministerAccess = currentUser?.isSuperAdmin === true || currentUser?.role === 'super_admin';
  const ar = currentLanguage === 'ar';
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const distribution = stages.map(s => ({ ...s, count: projects.filter(p => stageOf(p) === s.key).length })).filter(s => s.count > 0);
  const count = (keys: string[]) => projects.filter(p => keys.includes(stageOf(p))).length;
  const number = (n: number) => n.toLocaleString(ar ? 'ar-QA' : 'en-GB');
  const lab = projects.find(p => (p.projectCode || p.code || '').includes('ALL-FORMATS'));
  let offset = 0;
  const segments = distribution.map(s => { const start = offset; offset += s.count / projects.length * 100; return `${s.color} ${start}% ${offset}%`; }).join(', ');
  return <div className="eos-dashboard">
    <header className="dashboard-heading">
      <div><div className="dashboard-eyebrow">{t('YOUR WORKSPACE, AT A GLANCE', 'مساحة عملك في لمحة')}</div>
        <h1>{t('Welcome back, ', 'مرحباً بعودتك، ')}<bdi>{currentUser?.name || t('User', 'مستخدم')}</bdi></h1>
        <p>{t('A clear view of your projects. A focused start to your day.', 'نظرة واضحة على مشاريعك. بداية يوم أكثر تركيزاً.')}</p>
      </div>
      <div className="dashboard-actions"><Button variant="secondary" onClick={() => navigate('/my-work')}>{t('My Work', 'مهامي')}</Button>
        {currentUser?.role !== 'client' && !currentUser?.email?.includes('client') && <Button id="home-create-project-btn" onClick={() => navigate('/projects/new')}>+ {t('New Project', 'مشروع جديد')}</Button>}
      </div>
    </header>
    {error && <div role="alert" className="dashboard-notice">{t('Projects could not be loaded.', 'تعذر تحميل المشاريع.')} <Button variant="secondary" onClick={triggerRefresh}>{t('Try again', 'إعادة المحاولة')}</Button></div>}
    <section className="dashboard-metrics" aria-label={t('Project overview', 'ملخص المشاريع')}>
      <MetricCard title={t('All Projects', 'كل المشاريع')} value={error ? '—' : number(projects.length)} isLoading={loading} subtitle={t('In your project directory', 'في دليل مشاريعك')} accentColor="var(--chart-1)" />
      <MetricCard title={t('In Development', 'قيد التطوير')} value={error ? '—' : number(count(['idea', 'developing', 'submitted', 'negotiating']))} isLoading={loading} subtitle={t('Idea through negotiation', 'من الفكرة إلى التفاوض')} accentColor="var(--chart-2)" />
      <MetricCard title={t('Delivery', 'التنفيذ')} value={error ? '—' : number(count(['authorised', 'delivering']))} isLoading={loading} subtitle={t('Authorised or delivering', 'معتمد أو قيد التنفيذ')} accentColor="var(--chart-3)" />
      <MetricCard title={t('Closing & Closed', 'الإغلاق والمغلق')} value={error ? '—' : number(count(['closing', 'closed']))} isLoading={loading} subtitle={t('Final lifecycle stages', 'مراحل دورة الحياة النهائية')} accentColor="var(--chart-4)" />
    </section>
    <div className="dashboard-overview">
      <Card title={t('Portfolio overview', 'نظرة عامة على المحفظة')} subtitle={t('Projects by lifecycle maturity · current snapshot', 'المشاريع حسب مرحلة دورة الحياة · الوضع الحالي')} action={<Badge variant="neutral">{t('All projects', 'كل المشاريع')}</Badge>}>
        {loading ? <Skeleton height="212px" /> : error ? <p className="dashboard-empty">{t('Portfolio data is unavailable.', 'بيانات المحفظة غير متاحة.')}</p> : projects.length === 0 ? <div className="dashboard-empty"><p>{t('No projects are granted to your current membership. An organization administrator can assign access; creating a project does not grant it automatically.', 'لا توجد مشاريع ممنوحة لعضويتك الحالية. يمكن لمسؤول الجهة منح الوصول؛ إنشاء مشروع لا يمنح الوصول تلقائياً.')}</p>{canAdministerAccess && <Button variant="secondary" onClick={() => navigate('/admin/access')}>{t('Manage project access', 'إدارة صلاحيات المشاريع')}</Button>}</div> : <div className="portfolio-chart">
          <div className="portfolio-ring" style={{ background: `conic-gradient(${segments})` }} role="img" aria-label={t(`${projects.length} projects. Breakdown follows.`, `${number(projects.length)} مشاريع. التفاصيل التالية.`)}><div><strong>{number(projects.length)}</strong><span>{t('Total projects', 'إجمالي المشاريع')}</span></div></div>
          <ul className="portfolio-legend">{distribution.map(s => <li key={s.key}><span className="legend-label"><i style={{ background: s.color }} />{ar ? s.ar : s.en}</span><strong>{number(s.count)}</strong><span>{number(Math.round(s.count / projects.length * 100))}%</span></li>)}</ul>
        </div>}
        <p className="dashboard-source">{t('Based on projects available to your current membership. Unrecorded maturity is shown separately.', 'استناداً إلى المشاريع المتاحة لعضويتك الحالية. المراحل غير المسجلة موضحة بشكل منفصل.')}</p>
      </Card>
      <section className="workspace-focus"><div className="focus-topline"><span className="focus-icon" aria-hidden="true">✦</span>{t('MAKE ROOM FOR WHAT MATTERS', 'ركّز على ما يهم')}</div>
        <h2>{t('Your next move,\nin one place.', 'خطوتك التالية،\nفي مكان واحد.')}</h2>
        <p>{t('Review your assigned work, follow decisions, and keep delivery moving.', 'راجع المهام المسندة إليك وتابع القرارات واستمر في التنفيذ.')}</p>
        <Button variant="secondary" onClick={() => navigate('/my-work')}>{t('Open My Work', 'فتح مهامي')} <span aria-hidden="true">{ar ? '←' : '→'}</span></Button>
        <div className="focus-footer">{t('Plan clearly. Deliver confidently.', 'خطط بوضوح. نفّذ بثقة.')}</div>
      </section>
    </div>
    <div className="dashboard-detail">
      <Card title={t('Project directory', 'دليل المشاريع')} subtitle={t('Continue where your team is working', 'تابع العمل مع فريقك')} action={<Button variant="ghost" onClick={() => navigate('/projects')}>{t('View all', 'عرض الكل')} {ar ? '←' : '→'}</Button>} noPadding>
        {loading ? <div className="dashboard-empty"><Skeleton height="180px" /></div> : <div>{projects.slice(0, 5).map(p => { const s = stages.find(s => s.key === stageOf(p))!; return <button className="dashboard-project" key={p.id} onClick={() => navigate(`/projects/${p.id}`)}>
          <span className="project-symbol" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 6h7l2 3h9v11H3Zm0 0V4h7l2 2h8v3" /></svg></span>
          <span className="project-copy"><bdi className="project-code">{p.projectCode || p.code || t('Project', 'مشروع')}</bdi><strong>{p.title || p.name}</strong><small>{p.clientName || t('Client not recorded', 'العميل غير مسجل')}</small></span>
          <Badge variant={stageOf(p) === 'delivering' ? 'success' : 'neutral'}>{ar ? s.ar : s.en}</Badge><span className="project-arrow" aria-hidden="true">{ar ? '←' : '→'}</span>
        </button>; })}{projects.length === 0 && <p className="dashboard-empty">{error ? t('Projects are unavailable.', 'المشاريع غير متاحة.') : t('No projects are granted to your current membership.', 'لا توجد مشاريع ممنوحة لعضويتك الحالية.')}</p>}</div>}
      </Card>
      <Card title={t('Workspace shortcuts', 'اختصارات مساحة العمل')} subtitle={t('Everything you need to move forward', 'كل ما تحتاجه للمضي قدماً')}>
        <div className="workspace-shortcuts">{[
          { path: '/approvals', en: 'Approvals', ar: 'الموافقات', detail: 'Review decisions and sign-offs', detailAr: 'مراجعة القرارات والاعتمادات' },
          { path: '/calendar', en: 'Calendar', ar: 'التقويم', detail: 'Plan around delivery dates', detailAr: 'التخطيط حول مواعيد التسليم' },
          { path: '/reports/post-event', en: 'Reports', ar: 'التقارير', detail: 'Explore operational reporting', detailAr: 'استعراض التقارير التشغيلية' },
        ].map((item, i) => <button key={item.path} onClick={() => navigate(item.path)}><span className="shortcut-icon" aria-hidden="true">{['✓', '▦', '▥'][i]}</span><span><strong>{ar ? item.ar : item.en}</strong><small>{ar ? item.detailAr : item.detail}</small></span><span aria-hidden="true">{ar ? '←' : '→'}</span></button>)}</div>
        {lab && <div id="home-test-lab-banner" className="dashboard-lab"><Badge variant="info">{t('Design sandbox', 'بيئة التصميم التجريبية')}</Badge><p>{t('Explore the file formats workspace.', 'استكشف مساحة عمل تنسيقات الملفات.')}</p><div className="dashboard-actions"><Button id="home-open-design-lab-btn" variant="secondary" onClick={() => navigate(`/projects/${lab.id}/designs`)}>{t('Open Design Lab', 'فتح معمل التصاميم')}</Button><Button id="home-open-cockpit-btn" variant="ghost" onClick={() => navigate(`/projects/${lab.id}`)}>{t('Project Cockpit', 'قمرة المشروع')}</Button></div></div>}
      </Card>
    </div>
  </div>;
};
