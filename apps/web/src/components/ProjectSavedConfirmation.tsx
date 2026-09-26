import React from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Badge, Button, Card } from './DesignSystem.js';

export interface SavedProjectReference { id: string; projectCode?: string; title?: string }

export const ProjectSavedConfirmation: React.FC<{ project: SavedProjectReference; onBeforeNavigate?: () => void }> = ({ project, onBeforeNavigate }) => {
  const { currentLanguage, currentUser, navigate } = useEosContext();
  const ar = currentLanguage === 'ar';
  const canAdministerAccess = currentUser?.isSuperAdmin === true || currentUser?.role === 'super_admin';
  const go = (path: string) => { onBeforeNavigate?.(); navigate(path); };
  return <Card>
    <div role="status" style={{ padding: '12px 4px', lineHeight: 1.7 }}>
      <Badge variant="success">{ar ? 'تم حفظ المسودة' : 'Draft saved'}</Badge>
      <h2 style={{ margin: '16px 0 8px', fontSize: 22 }}>{project.title || (ar ? 'تم تسجيل المشروع' : 'Project recorded')}</h2>
      {project.projectCode && <p style={{ color: 'var(--text-secondary)', margin: '0 0 12px' }}><bdi>{project.projectCode}</bdi></p>}
      <p style={{ color: 'var(--text-secondary)' }}>{ar ? 'تم حفظ المشروع دون منح الوصول تلقائياً. يجب على مسؤول الجهة منح عضويتك صلاحية المشروع قبل فتحه أو متابعة إعداد محتواه.' : 'The project was saved without automatically granting access. An organization administrator must grant your membership access before you can open it or continue setting up its content.'}</p>
      <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{ar ? 'مرجع المشروع:' : 'Project reference:'} <bdi style={{ overflowWrap: 'anywhere' }}>{project.id}</bdi></p>
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      {canAdministerAccess && <Button onClick={() => go(`/admin/access?projectId=${encodeURIComponent(project.id)}`)}>{ar ? 'مراجعة ومنح الوصول' : 'Review and grant access'}</Button>}
      <Button variant="secondary" onClick={() => go('/projects')}>{ar ? 'العودة إلى دليل المشاريع' : 'Return to project directory'}</Button>
    </div>
  </Card>;
};
