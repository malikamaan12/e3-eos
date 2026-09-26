import React, { useEffect, useMemo, useState } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Badge, Button, Card, Input } from '../components/DesignSystem.js';
import './AccessAdministration.css';

interface ServerRole {
  role: string;
  title: string;
  description: string;
  permissions: string[];
  titleAr?: string;
  descriptionAr?: string;
}

export const AdminRolesView: React.FC = () => {
  const { apiClient, navigate, currentLanguage, currentOrg, currentUser, refreshTrigger } = useEosContext();
  const ar = currentLanguage === 'ar';
  const [roles, setRoles] = useState<ServerRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setRoles([]);
    apiClient.getAdminRoles().then((catalog) => {
      if (!Array.isArray(catalog) || catalog.some((role) => !role.role || !role.title || !Array.isArray(role.permissions))) {
        throw new Error(ar ? 'دليل الأدوار الذي أعاده الخادم غير مكتمل.' : 'The server role catalog is incomplete.');
      }
      if (active) setRoles(catalog);
    }).catch((cause: Error) => {
      if (active) setError(cause.message);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [apiClient, currentOrg.id, currentUser?.id, refreshTrigger, reload, ar]);

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return roles.filter((role) => [role.role, role.title, role.titleAr, role.description, role.descriptionAr, ...role.permissions]
      .filter(Boolean).join(' ').toLocaleLowerCase().includes(query));
  }, [roles, search]);
  const permissionCount = new Set(roles.flatMap((role) => role.permissions)).size;

  return <div className="access-administration" dir={ar ? 'rtl' : 'ltr'}>
    <header className="access-heading">
      <div>
        <span className="access-eyebrow">{ar ? 'إدارة الوصول' : 'ACCESS ADMINISTRATION'}</span>
        <h1>{ar ? 'دليل الأدوار' : 'Role reference'}</h1>
        <p>{ar ? 'تعريفات الأدوار والصلاحيات التي يعيدها الخادم للجهة الحالية.' : 'Role definitions and permission keys returned by the server for your current organization.'}</p>
      </div>
      <div className="access-actions">
        <Button variant="secondary" onClick={() => navigate('/admin/users')}>{ar ? 'المستخدمون' : 'Users'}</Button>
        <Button variant="secondary" onClick={() => navigate('/admin/access')}>{ar ? 'صلاحيات المشاريع' : 'Project access'}</Button>
        <Button variant="secondary" disabled={loading} onClick={() => setReload((value) => value + 1)}>{ar ? 'تحديث' : 'Refresh'}</Button>
      </div>
    </header>

    <section className="access-context-panel" aria-label={ar ? 'نطاق دليل الأدوار' : 'Role reference scope'}>
      <div className="access-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/><path d="m8 12 3 3 5-6"/></svg></div>
      <div><Badge variant="purple">{currentOrg.name}</Badge><h2>{ar ? 'الدور جزء من قرار الوصول' : 'A role is one part of access'}</h2>
        <p>{ar ? 'الوصول الفعلي يتطلب عضوية سارية ومنحة للمشروع والصلاحية المناسبة. قرارات الموافقة تخضع للسياسة السارية؛ هذا الدليل لا يحدد حدوداً مالية ولا يمنح صلاحيات.' : 'Effective access depends on current membership, an explicit project grant and the relevant permission. Approval decisions depend on current policy; this reference sets no financial thresholds and grants no access.'}</p>
      </div>
    </section>

    <Card noPadding>
      <div className="access-toolbar">
        <Input id="role-reference-search" label={ar ? 'البحث في الدليل' : 'Search the reference'} placeholder={ar ? 'الدور أو الوصف أو مفتاح الصلاحية' : 'Role, description or permission key'} value={search} onChange={(event) => setSearch(event.target.value)} containerStyle={{ flex: '1 1 280px', marginBottom: 0 }} />
        {!loading && !error && <p className="access-muted" role="status">{ar ? `${roles.length} أدوار · ${permissionCount} مفاتيح صلاحيات` : `${roles.length} roles · ${permissionCount} permission keys`}</p>}
      </div>
      {ar && <p className="access-muted" style={{ margin: '14px 20px 0' }}>تُعرض التعريفات بنص الخادم؛ قد تكون بعض الأوصاف باللغة الإنجليزية.</p>}
      {loading ? <p className="access-empty" role="status">{ar ? 'جارٍ تحميل تعريفات الخادم...' : 'Loading server definitions...'}</p>
        : error ? <div className="access-error" role="alert"><strong>{ar ? 'تعذر تحميل دليل الأدوار.' : 'The role reference could not be loaded.'}</strong><p>{error}</p><Button variant="secondary" onClick={() => setReload((value) => value + 1)}>{ar ? 'إعادة المحاولة' : 'Retry'}</Button></div>
        : visible.length === 0 ? <p className="access-empty" role="status">{roles.length === 0 ? (ar ? 'لم يُرجع الخادم أي تعريفات للأدوار.' : 'The server returned no role definitions.') : (ar ? 'لا توجد أدوار تطابق هذا البحث.' : 'No roles match this search.')}</p>
        : <div className="role-reference-grid">{visible.map((role) => <article className="role-reference-card" key={role.role}>
          <div className="role-reference-title"><div><h2>{ar && role.titleAr ? role.titleAr : role.title}</h2><code dir="ltr">{role.role}</code></div><Badge variant="neutral">{ar ? `${role.permissions.length} صلاحيات` : `${role.permissions.length} permissions`}</Badge></div>
          <p className="access-muted">{ar && role.descriptionAr ? role.descriptionAr : role.description}</p>
          <h3>{ar ? 'مفاتيح الصلاحيات المسجلة' : 'Recorded permission keys'}</h3>
          {role.permissions.length ? <ul className="role-permission-list">{role.permissions.map((permission, index) => <li key={`${permission}-${index}`}><code dir="ltr">{permission}</code></li>)}</ul> : <p className="access-muted">{ar ? 'لا توجد مفاتيح صلاحيات مسجلة.' : 'No permission keys are recorded.'}</p>}
          {role.permissions.includes('*') && <p className="role-reference-note">{ar ? 'علامة الصلاحيات العامة في تعريف الدور لا تتجاوز فحوص النطاق والسياسة الخاصة بكل عملية.' : 'The catalog wildcard does not replace command-specific scope and policy checks.'}</p>}
        </article>)}</div>}
    </Card>
  </div>;
};
