import React from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Badge, Button, Card, Select } from '../components/DesignSystem.js';

export const ClientPortalView: React.FC = () => {
  const { currentLanguage, currentOrg, projects, projectsLoading, projectsError, selectedProjectId, setSelectedProjectId, triggerRefresh, navigate } = useEosContext();
  const ar = currentLanguage === 'ar';
  const currentProject = projects.find((project) => project.id === selectedProjectId);

  return <div data-testid="client-portal-workspace" dir={ar ? 'rtl' : 'ltr'}>
    <Card>
      <Badge variant="accent">{ar ? 'بوابة العميل' : 'Client portal'}</Badge>
      <h1 style={{ fontSize: 24, margin: '14px 0 8px' }}>{ar ? 'مشاريعك المتاحة' : 'Your available projects'}</h1>
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{currentOrg.name} · {ar ? 'يعرض هذا القسم المشاريع المتاحة لعضويتك الحالية.' : 'This section shows projects available to your current membership.'}</p>
      <Button variant="secondary" onClick={() => navigate('/projects')}>{ar ? 'دليل المشاريع' : 'Project directory'}</Button>
    </Card>

    {projectsLoading ? <Card><p role="status">{ar ? 'جارٍ التحقق من المشاريع المتاحة...' : 'Loading available projects...'}</p></Card>
      : projectsError ? <Card><div role="alert"><h2 style={{ fontSize: 18 }}>{ar ? 'تعذر التحقق من وصول المشروع.' : 'Project access could not be verified.'}</h2><p style={{ color: 'var(--text-secondary)' }}>{projectsError}</p><Button variant="secondary" onClick={triggerRefresh}>{ar ? 'إعادة المحاولة' : 'Retry'}</Button></div></Card>
      : projects.length === 0 ? <Card><div role="status"><h2 style={{ fontSize: 18 }}>{ar ? 'لا يوجد وصول إلى مشاريع حالياً' : 'No project access yet'}</h2><p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{ar ? 'تحتاج عضويتك الحالية إلى منحة صريحة للمشروع. تواصل مع مسؤول الجهة لمنح الوصول ثم حدّث هذا العرض.' : 'Your current membership needs an explicit project grant. Contact an organization administrator for access, then refresh this view.'}</p><Button variant="secondary" onClick={triggerRefresh}>{ar ? 'تحديث الوصول' : 'Refresh access'}</Button></div></Card>
      : <>
        <Card>
          <Select id="client-portal-project" label={ar ? 'المشروع' : 'Project'} value={currentProject?.id || ''} onChange={(event) => setSelectedProjectId(event.target.value)} options={[{ value: '', label: ar ? 'اختر مشروعاً متاحاً' : 'Choose an available project' }, ...projects.map((project) => ({ value: project.id, label: `${project.projectCode} · ${project.title}` }))]} />
          {currentProject ? <div><h2 style={{ fontSize: 20 }}>{currentProject.title}</h2><p style={{ color: 'var(--text-secondary)' }}><bdi>{currentProject.projectCode}</bdi></p></div> : <p role="status" style={{ color: 'var(--text-secondary)' }}>{ar ? 'اختر مشروعاً من القائمة الحالية. المشروع المحدد سابقاً قد لا يكون متاحاً لعضويتك.' : 'Choose a project from the current list. A previously selected project may no longer be available to your membership.'}</p>}
        </Card>
        {currentProject && <Card title={ar ? 'محتوى العميل المنشور' : 'Published client content'}><Badge variant="neutral">{ar ? 'غير متاح' : 'Unavailable'}</Badge><p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{ar ? 'لم تتوفر بعد خدمة المحتوى المنشور للعميل في هذا العرض. لا تتوفر هنا مبالغ عقود أو أدلة أو قرارات للموافقة. تواصل مع فريق المشروع للحصول على المعلومات المعتمدة.' : 'The published client-content service is not available in this view yet. Contract amounts, evidence and approval decisions are unavailable here. Contact your project team for approved information.'}</p></Card>}
      </>}
  </div>;
};
