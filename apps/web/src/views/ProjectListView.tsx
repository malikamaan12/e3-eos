import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Button, Badge, Card, EmptyState, Input } from '../components/DesignSystem.js';
import { FastTrackProjectModal } from './FastTrackProjectModal.js';

export const ProjectListView: React.FC = () => {
  const { currentLanguage, apiClient, navigate, refreshTrigger, setSelectedProjectId } = useEosContext();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filter, setFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [isFastTrackOpen, setIsFastTrackOpen] = useState<boolean>(false);

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

  return (
    <div>
      {/* Directory Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
            {currentLanguage === 'ar' ? 'دليل مشاريع الفعاليات' : 'Project Directory'}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
            {currentLanguage === 'ar'
              ? 'إدارة محفظة الفعاليات النشطة والفرص والمناقصات عبر المراحل الـ 13'
              : 'Enterprise portfolio of live event deliveries, tenders, and framework awards'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            id="fast-track-intake-btn"
            variant="primary"
            size="md"
            onClick={() => setIsFastTrackOpen(true)}
            style={{ backgroundColor: '#d97706', borderColor: '#b45309' }}
          >
            ⚡ {currentLanguage === 'ar' ? 'تسجيل فرصة سريعة' : '+ Fast-Track Intake'}
          </Button>
          <Button
            id="new-project-btn"
            variant="secondary"
            size="md"
            onClick={() => navigate('/projects/new')}
          >
            + {currentLanguage === 'ar' ? 'مشروع جديد (9 خطوات)' : 'New Project (9 Steps)'}
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
          backgroundColor: '#ffffff',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginBottom: '16px',
        }}
      >
        <div style={{ flex: 1, minWidth: '240px', maxWidth: '360px' }}>
          <input
            id="project-search-input"
            type="text"
            placeholder={currentLanguage === 'ar' ? 'بحث بالاسم أو الكود أو العميل...' : 'Filter by code, title, client...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 12px',
              fontSize: '13px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {['all', 'tender', 'delivery'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: filter === f ? 700 : 500,
                backgroundColor: filter === f ? '#eff6ff' : '#ffffff',
                color: filter === f ? '#2563eb' : '#64748b',
                border: filter === f ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {f === 'all' ? 'All Projects' : f === 'tender' ? 'Tenders / RFPs' : 'In Delivery'}
            </button>
          ))}

          <div style={{ borderLeft: '1px solid #e2e8f0', height: '20px', margin: '0 6px' }} />

          <button
            onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#475569',
            }}
          >
            {viewMode === 'table' ? '⊞ Cards View' : '☰ Table View'}
          </button>
        </div>
      </div>

      {/* Projects Table / Card Rendering */}
      {loading ? (
        <Card>
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
            Loading persistent projects from PostgreSQL in Doha (me-central1)...
          </div>
        </Card>
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon="🎪"
          title="No Projects Found"
          description="There are no projects matching your search criteria or assigned to your organization tenant."
          action={
            <Button variant="primary" size="md" onClick={() => navigate('/projects/new')}>
              Create Your First Project
            </Button>
          }
        />
      ) : viewMode === 'table' ? (
        <Card noPadding>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '140px 1.5fr 1.2fr 120px 100px 100px',
              padding: '10px 18px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              fontSize: '11px',
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
            }}
          >
            <span>Project Code</span>
            <span>Title</span>
            <span>Client</span>
            <span>Origin</span>
            <span>Maturity</span>
            <span style={{ textAlign: 'right' }}>Cockpit</span>
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
                    gridTemplateColumns: '140px 1.5fr 1.2fr 120px 100px 100px',
                    alignItems: 'center',
                    padding: '14px 18px',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: '#2563eb' }}>
                    {code}
                  </span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{p.title}</div>
                    {p.description && (
                      <div style={{ fontSize: '11px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                        {p.description}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#334155' }}>
                    {p.clientName || 'Qatar Tourism Authority'}
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
                            backgroundColor: '#fffbeb',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            fontWeight: 800,
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ⚠️ INCOMPLETE ({p.onboardingCompletionPct || 38}%)
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
                            textAlign: 'left',
                            textDecoration: 'underline',
                          }}
                        >
                          Resume Onboarding
                        </button>
                      </div>
                    ) : (
                      <Badge variant={p.maturity === 'delivery' ? 'success' : 'info'}>
                        {p.maturity || 'onboarding'}
                      </Badge>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenProject(p.id); }}>
                      Open ➔
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {filteredProjects.map((p) => {
            const isIncomplete = p.isOnboardingComplete === false || p.isFastTrack;
            return (
              <Card
                key={p.id}
                style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
              >
                <div onClick={() => handleOpenProject(p.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#2563eb', fontWeight: 700 }}>
                      {p.projectCode || p.code}
                    </span>
                    {isIncomplete ? (
                      <span
                        style={{
                          backgroundColor: '#fffbeb',
                          color: '#b45309',
                          border: '1px solid #fde68a',
                          fontWeight: 800,
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        ⚠️ INCOMPLETE ({p.onboardingCompletionPct || 38}%)
                      </span>
                    ) : (
                      <Badge variant={p.maturity === 'delivery' ? 'success' : 'info'}>
                        {p.maturity || 'onboarding'}
                      </Badge>
                    )}
                  </div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{p.title}</h4>
                  <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                    {p.description || 'Enterprise event project under active management.'}
                  </p>
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                    <span>{p.clientName || 'Qatar Tourism Authority'}</span>
                    <span style={{ color: '#2563eb', fontWeight: 600 }}>Open Cockpit ➔</span>
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
