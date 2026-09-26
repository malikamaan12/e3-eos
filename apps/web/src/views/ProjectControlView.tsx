import React, { useEffect, useState } from 'react';
import { Badge, Button, Card, Select } from '../components/DesignSystem.js';
import { useEosContext } from '../context/EosContext.js';
import type { ControlKind } from '../services/project-control.js';
import { RequirementIntakeRegister } from './RequirementIntakeRegister.js';
import { ClarificationRegister } from './ClarificationRegister.js';
import { FieldNotesRegister } from './FieldNotesRegister.js';
import './ProjectRecords.css';

export const ProjectControlView: React.FC<{kind:ControlKind;projectId?:string}> = ({kind,projectId}) => {
  const { projects, projectsLoading, projectsError, currentOrg, currentUser, currentLanguage, selectedProjectId, triggerRefresh, isCheckingSession, navigate } = useEosContext();
  const ar = currentLanguage === 'ar';
  const t = (en:string, arabic:string) => ar ? arabic : en;
  const [selected,setSelected] = useState(projectId || selectedProjectId || '');
  useEffect(() => {setSelected(projectId || selectedProjectId || '');}, [projectId,currentOrg.id,currentUser?.id]);
  const project = projects.find(item => item.id === selected);
  const heading = kind === 'requirements' ? t('Requirement intake','تسجيل المتطلبات') : kind === 'clarifications' ? t('Clarification register','سجل الاستيضاحات') : t('Field notes','ملاحظات الموقع');
  const description = kind === 'requirements' ? t('Keep original wording, interpretations and every draft revision together.','احتفظ بالنص الأصلي والتفسير وجميع مراجعات المسودة معاً.') : kind === 'clarifications' ? t('Record questions, attributed answers and the history behind each response.','سجّل الأسئلة والإجابات المنسوبة إلى مصادرها وتاريخ كل استجابة.') : t('Capture observations on this device and track their server receipts.','سجّل الملاحظات على هذا الجهاز وتابع إيصالات استلام الخادم.');
  const route = (next:ControlKind) => project ? `/projects/${project.id}/${next === 'observations' ? 'field-notes' : next}` : next === 'observations' ? '/field/notes' : `/${next}/register`;
  return <div className="records-page" dir={ar ? 'rtl' : 'ltr'}>
    <header className="records-heading"><div><span className="records-eyebrow">{t('PROJECT WORKSPACE','مساحة المشروع')}</span><h1>{heading}</h1><p>{description}</p></div><Badge variant="purple">{currentOrg.name}</Badge></header>
    <nav className="records-actions" aria-label={t('Project registers','سجلات المشروع')}>
      <Button variant={kind === 'requirements' ? 'primary' : 'secondary'} onClick={() => navigate(route('requirements'))}>{t('Requirements','المتطلبات')}</Button>
      <Button variant={kind === 'clarifications' ? 'primary' : 'secondary'} onClick={() => navigate(route('clarifications'))}>{t('Clarifications','الاستيضاحات')}</Button>
      <Button variant={kind === 'observations' ? 'primary' : 'secondary'} onClick={() => navigate(route('observations'))}>{t('Field notes','ملاحظات الموقع')}</Button>
      <Button variant="ghost" onClick={()=>navigate(project?`/projects/${project.id}/allocations`:'/allocations/register')}>{t('Allocation & design planning ↗','تخطيط التوزيعات والتصميم ↗')}</Button>
    </nav>
    <div className="records-scope"><Select id="control-project" label={t('Project in your access scope','المشروع المتاح لك')} value={project ? selected : ''} disabled={projectsLoading || isCheckingSession}
      onChange={event => setSelected(event.target.value)} options={[{value:'',label:t('Choose a project','اختر مشروعاً')},...projects.map(item => ({value:item.id,label:`${item.projectCode || item.code || ''} · ${item.title || item.name}`}))]} /></div>
    {projectsLoading || isCheckingSession ? <Card><p role="status">{t('Loading projects in your access scope…','جارٍ تحميل المشاريع المتاحة…')}</p></Card>
      : projectsError ? <Card><div role="alert"><h2>{t('Projects could not be loaded','تعذر تحميل المشاريع')}</h2><p>{projectsError}</p><Button variant="secondary" onClick={triggerRefresh}>{t('Retry','إعادة المحاولة')}</Button></div></Card>
      : !project ? <Card><div className="records-empty"><div className="records-orb" aria-hidden="true">◇</div><h2>{t('No project available in this scope','لا يوجد مشروع متاح في هذا النطاق')}</h2><p>{t('Choose a project you have been granted access to. An active membership and an explicit project grant are required.','اختر مشروعاً لديك منحة وصول إليه. يتطلب الوصول منحة مشروع صريحة مع عضوية فعّالة.')}</p><Button variant="secondary" onClick={triggerRefresh}>{t('Refresh projects','تحديث المشاريع')}</Button></div></Card>
      : <section key={`${currentOrg.id}:${currentUser?.id}:${project.id}:${kind}`}>
        {kind === 'requirements' ? <RequirementIntakeRegister projectId={project.id} /> : kind === 'clarifications' ? <ClarificationRegister projectId={project.id} /> : <FieldNotesRegister projectId={project.id} />}
      </section>}
    {kind === 'observations' && <div className="records-notice"><p>{t('Earlier photo captures remain separate from text notes and cannot receive a verified upload receipt yet.','تبقى الصور الملتقطة سابقاً منفصلة عن الملاحظات النصية ولا يمكنها الحصول على إيصال تحميل موثق بعد.')}</p><Button variant="ghost" onClick={() => navigate('/field/legacy-captures')}>{t('View earlier captures','عرض الالتقاطات السابقة')}</Button></div>}
  </div>;
};
