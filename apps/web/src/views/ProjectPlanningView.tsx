import React, { useEffect, useState } from 'react';
import { Badge, Button, Card, Select } from '../components/DesignSystem.js';
import { useEosContext } from '../context/EosContext.js';
import type { PlanningKind } from '../services/project-planning.js';
import { AllocationRegister } from './AllocationRegister.js';
import { DesignBriefRegister } from './DesignBriefRegister.js';
import { ImpactReviewRegister } from './ImpactReviewRegister.js';
import './ProjectRecords.css';

export const ProjectPlanningView: React.FC<{kind:PlanningKind;projectId?:string}> = ({kind,projectId}) => {
  const { projects, projectsLoading, projectsError, currentOrg, currentUser, currentLanguage, selectedProjectId, triggerRefresh, isCheckingSession, navigate } = useEosContext();
  const ar=currentLanguage==='ar', t=(en:string,arabic:string)=>ar?arabic:en;
  const [selected,setSelected]=useState(projectId || selectedProjectId || '');
  useEffect(()=>{setSelected(projectId || selectedProjectId || '');},[projectId,currentOrg.id,currentUser?.id]);
  const project=projects.find(item=>item.id===selected);
  const heading=kind==='allocations'?t('Allocation planning','تخطيط التوزيعات'):kind==='designs'?t('Design briefs','موجزات التصميم'):t('Change impact','أثر التغييرات');
  const description=kind==='allocations'?t('Plan quantities and locations against the requirement version you reviewed.','خطط للكميات والمواقع وفق إصدار المتطلب الذي راجعته.'):kind==='designs'?t('Develop versioned design briefs with explicit requirement and allocation references.','طوّر موجزات تصميم ذات إصدارات مع مراجع صريحة للمتطلبات والتوزيعات.'):t('See changed source versions and record the follow-up each draft needs.','راجع إصدارات المصادر المتغيرة وسجّل المتابعة اللازمة لكل مسودة.');
  const route=(next:PlanningKind)=>project?`/projects/${project.id}/${next==='designs'?'design-briefs':next==='impacts'?'impact-review':'allocations'}`:next==='impacts'?'/impact-review':`/${next}/register`;
  return <div className="records-page" dir={ar?'rtl':'ltr'}>
    <header className="records-heading"><div><span className="records-eyebrow">{t('SCOPE & DESIGN','النطاق والتصميم')}</span><h1>{heading}</h1><p>{description}</p></div><Badge variant="purple">{currentOrg.name}</Badge></header>
    <nav className="records-actions" aria-label={t('Planning registers','سجلات التخطيط')}>
      <Button variant={kind==='allocations'?'primary':'secondary'} onClick={()=>navigate(route('allocations'))}>{t('Allocations','التوزيعات')}</Button>
      <Button variant={kind==='designs'?'primary':'secondary'} onClick={()=>navigate(route('designs'))}>{t('Design briefs','موجزات التصميم')}</Button>
      <Button variant={kind==='impacts'?'primary':'secondary'} onClick={()=>navigate(route('impacts'))}>{t('Change impact','أثر التغييرات')}</Button>
      <Button variant="ghost" onClick={()=>navigate(project?`/projects/${project.id}/requirements`:'/requirements/register')}>{t('Source requirements ↗','المتطلبات المصدرية ↗')}</Button>
    </nav>
    <div className="records-scope"><Select id="planning-project" label={t('Project in your access scope','المشروع المتاح لك')} value={project?selected:''} disabled={projectsLoading||isCheckingSession} onChange={event=>setSelected(event.target.value)} options={[{value:'',label:t('Choose a project','اختر مشروعاً')},...projects.map(item=>({value:item.id,label:`${item.projectCode||item.code||''} · ${item.title||item.name}`}))]}/></div>
    {projectsLoading||isCheckingSession?<Card><p role="status">{t('Loading projects…','جارٍ تحميل المشاريع…')}</p></Card>
      :projectsError?<Card><div role="alert"><h2>{t('Projects could not be loaded','تعذر تحميل المشاريع')}</h2><p>{projectsError}</p><Button variant="secondary" onClick={triggerRefresh}>{t('Retry','إعادة المحاولة')}</Button></div></Card>
      :!project?<Card><div className="records-empty"><div className="records-orb" aria-hidden="true">◇</div><h2>{t('Choose an accessible project','اختر مشروعاً متاحاً')}</h2><p>{t('These registers use an active membership and an explicit project grant. Your access administrator can assign a project in Access administration.','تتطلب هذه السجلات عضوية فعّالة ومنحة وصول صريحة للمشروع. يستطيع مسؤول الوصول تعيين المشروع في إدارة الوصول.')}</p><div className="records-actions" style={{justifyContent:'center'}}><Button variant="secondary" onClick={triggerRefresh}>{t('Refresh projects','تحديث المشاريع')}</Button>{currentUser?.role==='super_admin'&&<Button variant="secondary" onClick={()=>navigate('/admin/access')}>{t('Access administration','إدارة الوصول')}</Button>}</div></div></Card>
      :<section key={`${currentOrg.id}:${currentUser?.id}:${project.id}:${kind}`}>{kind==='allocations'?<AllocationRegister projectId={project.id}/>:kind==='designs'?<DesignBriefRegister projectId={project.id}/>:<ImpactReviewRegister projectId={project.id}/>}</section>}
  </div>;
};
