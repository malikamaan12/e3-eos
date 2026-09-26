import React, { useEffect, useState } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Badge, Button, Card, MetricCard } from '../components/DesignSystem.js';
import type { PortfolioSummary } from '../services/project-records.js';
import './ProjectRecords.css';

export const PortfolioSummaryView: React.FC = () => {
  const { apiClient, currentOrg, currentUser, currentLanguage, navigate, refreshTrigger } = useEosContext();
  const ar = currentLanguage === 'ar';
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true; setSummary(null); setError(''); setLoading(true);
    apiClient.getPortfolioSummary().then(value => { if (active) setSummary(value); })
      .catch(cause => { if (active) setError(cause.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [apiClient, currentOrg.id, currentUser?.id, refreshTrigger, reload]);
  return <div className="records-page" dir={ar ? 'rtl' : 'ltr'}>
    <header className="records-heading"><div><span className="records-eyebrow">E3 / {ar ? 'نظرة عامة' : 'PROJECT INTELLIGENCE'}</span><h1>{ar ? 'محفظة المشاريع' : 'Your project portfolio'}</h1><p>{ar ? 'المشاريع والتقارير المسجلة ضمن صلاحيات وصولك الحالية.' : 'Recorded projects and reports within your current access.'}</p></div><div className="records-actions"><Button variant="secondary" disabled={loading} onClick={() => setReload(v => v + 1)}>{ar ? 'تحديث' : 'Refresh'}</Button><Button onClick={() => navigate('/projects')}>{ar ? 'استعراض المشاريع' : 'Browse projects'} ↗</Button></div></header>
    <nav className="records-actions" aria-label={ar ? 'سجلات المشاريع' : 'Project registers'}><Button variant="secondary" onClick={() => navigate('/requirements/register')}>{ar ? 'المتطلبات' : 'Requirements'}</Button><Button variant="secondary" onClick={() => navigate('/allocations/register')}>{ar ? 'التوزيعات والتصميم' : 'Allocations & design'}</Button><Button variant="secondary" onClick={() => navigate('/impact-review')}>{ar ? 'أثر التغييرات' : 'Change impact'}</Button><Button variant="secondary" onClick={() => navigate('/clarifications/register')}>{ar ? 'الاستيضاحات' : 'Clarifications'}</Button><Button variant="secondary" onClick={() => navigate('/field/notes')}>{ar ? 'ملاحظات الموقع' : 'Field notes'}</Button><Button variant="secondary" onClick={() => navigate('/work-register')}>{ar ? 'حزم العمل والمهام' : 'Work & tasks'}</Button><Button variant="secondary" onClick={() => navigate('/documents/register')}>{ar ? 'سجل الوثائق' : 'Document register'}</Button><Button variant="secondary" onClick={() => navigate('/reports')}>{ar ? 'لقطات التقارير' : 'Report snapshots'}</Button></nav>
    {loading && <Card><p role="status">{ar ? 'جارٍ تحميل المحفظة...' : 'Loading your portfolio…'}</p></Card>}
    {error && <Card><p role="alert">{error}</p><Button onClick={() => setReload(v => v + 1)}>{ar ? 'إعادة المحاولة' : 'Retry'}</Button></Card>}
    {summary && <>
      <div className="records-metrics"><MetricCard label={ar ? 'المشاريع المتاحة' : 'Accessible projects'} value={summary.projectCount} subtitle={ar ? 'منح وصول نشطة' : 'Active access grants'} /><MetricCard label={ar ? 'مشاريع بصلاحية تحرير' : 'Projects with editor access'} value={summary.editorProjectCount} subtitle={ar ? 'تخضع الإجراءات لصلاحيات دورك' : 'Actions also depend on your role'} /><MetricCard label={ar ? 'لقطات التقارير' : 'Report snapshots'} value={summary.reportCount} subtitle={`${summary.reportVersionCount} ${ar ? 'إصدار محفوظ' : 'saved versions'}`} /></div>
      {!summary.projectCount ? <Card><div className="records-empty"><div className="records-orb" aria-hidden="true">◈</div><h2>{ar ? 'مساحتك جاهزة للمشاريع' : 'Your workspace is ready for projects'}</h2><p>{ar ? 'ستظهر المشاريع هنا بعد منحك صلاحية وصول محددة. يمكن لمسؤول الوصول إضافة المنح من إدارة الوصول.' : 'Projects appear here once you receive an explicit access grant. Your access administrator can assign grants in Access administration.'}</p><Button variant="secondary" onClick={() => navigate('/projects')}>{ar ? 'فتح دليل المشاريع' : 'Open project directory'}</Button></div></Card> : <>
        <div className="records-grid"><Card title={ar ? 'مراحل النضج' : 'Project maturity'}>{summary.maturityDistribution.map(item => <div className="records-row" key={item.key}><div style={{width:'100%'}}><div className="records-actions" style={{justifyContent:'space-between'}}><span>{item.key.replaceAll('_',' ')}</span><strong>{item.count}</strong></div><div className="records-meter"><span style={{width:`${item.count / summary.projectCount * 100}%`}} /></div></div></div>)}</Card><Card title={ar ? 'نتائج المشاريع' : 'Recorded outcomes'}>{summary.outcomeDistribution.map(item => <div className="records-row" key={item.key}><span>{item.key.replaceAll('_',' ')}</span><Badge>{item.count}</Badge></div>)}</Card></div>
        <Card title={ar ? 'المشاريع' : 'Projects'}>{summary.projects.map(project => <div className="records-row" key={project.id}><div><p>{project.projectCode}</p><h3>{project.title}</h3><div className="records-actions"><Badge>{project.maturity}</Badge><Badge variant={project.accessLevel === 'editor' ? 'purple' : 'neutral'}>{project.accessLevel}</Badge><span className="records-muted">{project.reportCount} {ar ? 'تقرير' : 'reports'}</span></div></div><div className="records-actions"><Button size="sm" variant="secondary" onClick={() => navigate(`/projects/${project.id}/work`)}>{ar ? 'العمل' : 'Work'}</Button><Button size="sm" variant="secondary" onClick={() => navigate(`/projects/${project.id}/document-register`)}>{ar ? 'الوثائق' : 'Documents'}</Button><Button size="sm" onClick={() => navigate(`/projects/${project.id}/reports`)}>{ar ? 'التقارير' : 'Reports'} ↗</Button></div></div>)}</Card>
      </>}
      <p className="records-muted">{ar ? 'آخر قراءة' : 'As of'} {new Date(summary.asOf).toLocaleString(ar ? 'ar-QA' : 'en-GB')}. {ar ? 'تعكس الأعداد المشاريع المتاحة لك فقط، وليست إجمالي المؤسسة.' : 'Counts cover projects available to you, not organization-wide totals.'}</p>
    </>}
  </div>;
};
