import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Button, Badge, Card, EmptyState, Input, Skeleton } from '../components/DesignSystem.js';
import { FastTrackProjectModal } from './FastTrackProjectModal.js';

export const ProjectListView: React.FC = () => {
  const { currentLanguage, apiClient, navigate, refreshTrigger, setSelectedProjectId } = useEosContext();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filter, setFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [isFastTrackOpen, setIsFastTrackOpen] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 768);

  const isRtl = currentLanguage === 'ar';

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function fetchProjects() {
      setLoading(true);
      try {
        const res = await apiClient.getProjects();
        if (isMounted) {
          const list = (res as any).data || (Array.isArray(res) ? res : []);
          setProjects(list);
        }
      } catch {
        // Handled
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchProjects();
    return () => { isMounted = false; };
  }, [apiClient, refreshTrigger]);

  const filteredProjects = projects.filter((p) => {
    const code = (p.projectCode || p.code || '').toLowerCase();
    const title = (p.title || '').toLowerCase();
    const client = (p.clientName || '').toLowerCase();
    const q = search.toLowerCase();
    const matchesSearch = !q || code.includes(q) || title.includes(q) || client.includes(q);

    if (!matchesSearch) return false;
    if (filter === 'all') return true;
    if (filter === 'tender') return (p.originCode || '').toLowerCase().includes('tender');
    if (filter === 'delivery') return (p.maturity || '').toLowerCase().includes('delivery');
    return true;
  });

  const handleOpenProject = (id: string) => {
    setSelectedProjectId(id);
    navigate(`/projects/${id}`);
  };

  const effectiveViewMode = isMobile ? 'cards' : viewMode;

  return (
    <div style={{ paddingBottom: '32px' }}>
      {/* Directory Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
            {isRtl ? 'دليل مشاريع الفعاليات' : 'Project Directory'}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted, #94a3b8)' }}>
            {isRtl
              ? 'إدارة محفظة الفعاليات النشطة والفرص والمناقصات عبر المراحل الـ 13'
              : 'Enterprise portfolio of live event deliveries, tenders, and framework awards'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button
            id="fast-track-intake-btn"
            variant="primary"
            size="md"
            onClick={() => setIsFastTrackOpen(true)}
            style={{ backgroundColor: '#d97706', borderColor: '#b45309' }}
          >
            ⚡ {isRtl ? 'تسجيل فرصة سريعة' : '+ Fast-Track Intake'}
          </Button>
          <Button
            id="new-project-btn"
            variant="secondary"
            size="md"
            onClick={() => navigate('/projects/new')}
          >
            + {isRtl ? 'مشروع جديد (9 خطوات)' : 'New Project (9 Steps)'}
          </Button>
        </div>
      </div>

      <FastTrackProjectModal
        isOpen={isFastTrackOpen}
        onClose={() => setIsFastTrackOpen(false)}
      />

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--surface-1, #0f1624)',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid var(--border-default, #2a374b)',
          marginBottom: '16px',
        }}
      >
        <div style={{ flex: 1, minWidth: '240px', maxWidth: '360px' }}>
          <Input
            id="project-search-input"
            type="text"
            placeholder={isRtl ? 'بحث بالاسم أو الكود أو العميل...' : 'Filter by code, title, client...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ height: '36px', fontSize: '13px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { id: 'all', en: 'All Projects', ar: 'جميع المشاريع' },
            { id: 'tender', en: 'Tenders / RFPs', ar: 'المناقصات والعطاءات' },
            { id: 'delivery', en: 'In Delivery', ar: 'قيد التنفيذ' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: filter === item.id ? 700 : 500,
                backgroundColor: filter === item.id ? '#eff6ff' : 'var(--surface-1, #0f1624)',
                color: filter === item.id ? '#2563eb' : 'var(--text-muted, #94a3b8)',
                border: filter === item.id ? '1px solid #bfdbfe' : '1px solid var(--border-default, #2a374b)',
                borderRadius: '6px',
                cursor: 'pointer',
                minHeight: '36px',
              }}
            >
              {isRtl ? item.ar : item.en}
            </button>
          ))}

          {!isMobile && (
            <>
              <div style={{ borderLeft: '1px solid var(--border-default, #2a374b)', height: '20px', margin: '0 6px' }} />
              <button
                onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  backgroundColor: 'var(--surface-2, #151e2e)',
                  border: '1px solid var(--border-default, #2a374b)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary, #cbd5e1)',
                  fontWeight: 600,
                  minHeight: '36px',
                }}
              >
                {viewMode === 'table'
                  ? (isRtl ? '⊞ عرض البطاقات' : '⊞ Cards View')
                  : (isRtl ? '☰ عرض الجدول' : '☰ Table View')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Projects Table / Card Rendering */}
      {loading ? (
        <Card noPadding>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '12px',
                  borderBottom: i < 4 ? '1px solid var(--border-subtle, #1d2939)' : 'none',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '40%' }}>
                  <Skeleton width="120px" height="14px" />
                  <Skeleton width="220px" height="18px" />
                </div>
                <Skeleton width="140px" height="14px" />
                <Skeleton width="90px" height="24px" style={{ borderRadius: '12px' }} />
                <Skeleton width="70px" height="32px" style={{ borderRadius: '6px' }} />
              </div>
            ))}
          </div>
        </Card>
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon="🎪"
          title={isRtl ? 'لا توجد مشاريع مطابقة' : 'No Projects Found'}
          description={
            isRtl
              ? 'لا توجد مشاريع تطابق معايير البحث المحددة أو تتبع جهتك المؤسسية.'
              : 'There are no projects matching your search criteria or assigned to your organization tenant.'
          }
          action={
            <Button variant="primary" size="md" onClick={() => navigate('/projects/new')}>
              {isRtl ? 'إنشاء أول مشروع' : 'Create Your First Project'}
            </Button>
          }
        />
      ) : effectiveViewMode === 'table' ? (
        <Card noPadding>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ minWidth: '780px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1.5fr 1.2fr 120px 110px 100px',
                  padding: '12px 18px',
                  backgroundColor: 'var(--surface-2, #151e2e)',
                  borderBottom: '1px solid var(--border-default, #2a374b)',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-muted, #94a3b8)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <span>{isRtl ? 'كود المشروع' : 'Project Code'}</span>
                <span>{isRtl ? 'اسم المشروع' : 'Title'}</span>
                <span>{isRtl ? 'الجهة / العميل' : 'Client'}</span>
                <span>{isRtl ? 'المصدر' : 'Origin'}</span>
                <span>{isRtl ? 'مستوى النضج' : 'Maturity'}</span>
                <span style={{ textAlign: isRtl ? 'left' : 'right' }}>{isRtl ? 'لوحة القيادة' : 'Cockpit'}</span>
              </div>

              <div>
                {filteredProjects.map((p) => {
                  const code = p.projectCode || p.code || 'PRJ-2026';
                  return (
                    <div
                      key={p.id}
                      id={`project-item-${p.id}`}
                      onClick={() => handleOpenProject(p.id)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '140px 1.5fr 1.2fr 120px 110px 100px',
                        alignItems: 'center',
                        padding: '14px 18px',
                        borderBottom: '1px solid var(--border-subtle, #1d2939)',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-2, #151e2e)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: '#2563eb' }}>
                        <span dir="ltr">{code}</span>
                      </span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>{p.title}</div>
                        {p.description && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                            {p.description}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary, #cbd5e1)' }}>
                        {p.clientName || (isRtl ? 'قيد التأكيد' : 'To Be Confirmed')}
                      </div>
                      <div>
                        <Badge variant="neutral">{p.originCode || 'DIRECT_AWARD'}</Badge>
                      </div>
                      <div>
                        {p.isOnboardingComplete === false || p.isFastTrack ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span
                              id={`incomplete-badge-${p.id}`}
                              style={{
                                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                                color: '#b45309',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                fontWeight: 800,
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {(() => {
                                const pct = (p.onboardingCompletionPct !== undefined && p.onboardingCompletionPct !== null)
                                  ? p.onboardingCompletionPct
                                  : (p.isOnboardingComplete ? 100 : 50);
                                return isRtl ? `⚠️ غير مكتمل (${pct}%)` : `⚠️ INCOMPLETE (${pct}%)`;
                              })()}
                            </span>
                            <button
                              id={`resume-onboarding-btn-${p.id}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/projects/new?resume=${p.id}`);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#d97706',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                padding: 0,
                                textAlign: isRtl ? 'right' : 'left',
                                textDecoration: 'underline',
                              }}
                            >
                              {isRtl ? 'متابعة إعداد المشروع' : 'Resume Onboarding'}
                            </button>
                          </div>
                        ) : (
                          <Badge variant={p.maturity === 'delivery' ? 'success' : 'info'}>
                            {p.maturity || 'onboarding'}
                          </Badge>
                        )}
                      </div>
                      <div style={{ textAlign: isRtl ? 'left' : 'right' }}>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenProject(p.id); }}>
                          {isRtl ? 'فتح ←' : 'Open ➔'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {filteredProjects.map((p) => {
            const isIncomplete = p.isOnboardingComplete === false || p.isFastTrack;
            const code = p.projectCode || p.code || 'PRJ-2026';
            return (
              <Card
                key={p.id}
                style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
              >
                <div onClick={() => handleOpenProject(p.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#2563eb', fontWeight: 700 }}>
                      <span dir="ltr">{code}</span>
                    </span>
                    {isIncomplete ? (
                      <span
                        id={`incomplete-badge-${p.id}`}
                        style={{
                          backgroundColor: 'rgba(245, 158, 11, 0.12)',
                          color: '#b45309',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          fontWeight: 800,
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        {(() => {
                          const pct = (p.onboardingCompletionPct !== undefined && p.onboardingCompletionPct !== null)
                            ? p.onboardingCompletionPct
                            : (p.isOnboardingComplete ? 100 : 50);
                          return isRtl ? `⚠️ غير مكتمل (${pct}%)` : `⚠️ INCOMPLETE (${pct}%)`;
                        })()}
                      </span>
                    ) : (
                      <Badge variant={p.maturity === 'delivery' ? 'success' : 'info'}>
                        {p.maturity || 'onboarding'}
                      </Badge>
                    )}
                  </div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>{p.title}</h4>
                  <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--text-muted, #94a3b8)', lineHeight: 1.4 }}>
                    {p.description || (isRtl ? 'مشروع فعالية مؤسسي خاضع للإدارة النشطة.' : 'Enterprise event project under active management.')}
                  </p>
                  <div style={{ borderTop: '1px solid var(--border-subtle, #1d2939)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                    <span>{p.clientName || (isRtl ? 'قيد التأكيد' : 'To Be Confirmed')}</span>
                    <span style={{ color: '#2563eb', fontWeight: 600 }}>
                      {isRtl ? 'فتح لوحة القيادة ←' : 'Open Cockpit ➔'}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
