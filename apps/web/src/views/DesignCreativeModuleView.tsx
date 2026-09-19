import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import {
  Card,
  Badge,
  Button,
  Modal,
  Input,
  Textarea,
  Select,
  AlertBanner,
  MetricCard,
  formatCurrency,
} from '../components/DesignSystem.js';
import { UniversalDesignViewer } from '../components/UniversalDesignViewer.js';
import { EosApiClient, isSyntheticDemo } from '../services/api-client.js';

interface DesignCreativeModuleViewProps {
  projectId: string;
  isClientMode?: boolean;
}

type SubTab =
  | 'overview'
  | 'all_designs'
  | 'workspaces'
  | 'review_queue'
  | 'client_review'
  | 'approvals'
  | 'changes'
  | 'releases'
  | 'design_register'
  | 'revision_register';

export const DesignCreativeModuleView: React.FC<DesignCreativeModuleViewProps> = ({
  projectId,
  isClientMode = false,
}) => {
  const { refreshTrigger, triggerRefresh } = useEosContext();
  const [activeTab, setActiveTab] = useState<SubTab>(isClientMode ? 'client_review' : 'overview');
  const [apiClient] = useState<EosApiClient>(() => new EosApiClient({ organisationId: '11111111-1111-4111-8111-111111111111', userId: 'usr-pm-lead' }));

  // State
  const [designs, setDesigns] = useState<any[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({
    totalDesigns: 0,
    drafts: 0,
    awaitingInternalReview: 0,
    awaitingClientReview: 0,
    changesRequested: 0,
    approved: 0,
    approvedForProduction: 0,
    unresolvedComments: 0,
    releasesAwaitingAcknowledgement: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedDesign, setSelectedDesign] = useState<any | null>(null);

  // Filters for All Designs
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterWorkspace, setFilterWorkspace] = useState<string>('all');
  const [filterDiscipline, setFilterDiscipline] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewLayout, setViewLayout] = useState<'grid' | 'table' | 'kanban'>('grid');

  // Modals
  const [isNewDesignModalOpen, setIsNewDesignModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDiscipline, setNewDiscipline] = useState<string>('staging');
  const [newAssetType, setNewAssetType] = useState<string>('technical_drawing');
  const [newWorkspaceId, setNewWorkspaceId] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newClientVisible, setNewClientVisible] = useState<boolean>(true);

  // Workspace Modal
  const [isNewWsModalOpen, setIsNewWsModalOpen] = useState<boolean>(false);
  const [newWsName, setNewWsName] = useState<string>('');
  const [newWsDept, setNewWsDept] = useState<string>('Scenic & Staging');
  const [newWsDesc, setNewWsDesc] = useState<string>('');

  // Fetch data
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const [wsData, itemsData, kpiData] = await Promise.all([
          apiClient.getDesignWorkspaces(projectId),
          apiClient.getDesignItems(projectId, { clientOnly: isClientMode }),
          apiClient.getDesignOverviewKpis(projectId),
        ]);
        if (isMounted) {
          setWorkspaces(wsData);
          setDesigns(itemsData);
          setKpis(kpiData);
          if (wsData.length > 0 && !newWorkspaceId) {
            setNewWorkspaceId(wsData[0].id);
          }
        }
      } catch (err) {
        console.warn('Failed to load designs:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [projectId, refreshTrigger, isClientMode]);

  // Handle Create Design Item
  const handleCreateDesign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await apiClient.createDesignItem(projectId, {
        title: newTitle,
        workspaceId: newWorkspaceId || workspaces[0]?.id,
        discipline: newDiscipline,
        assetType: newAssetType,
        description: newDescription,
        clientVisibility: newClientVisible,
        priority: 'medium',
      });
      const created = res.data?.payload;
      if (created) {
        setDesigns([created, ...designs]);
        setSelectedDesign(created);
      }
      setIsNewDesignModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      triggerRefresh();
    } catch (err) {
      console.error('Failed to create design item:', err);
    }
  };

  // Handle Create Workspace
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;

    try {
      const res = await apiClient.createDesignWorkspace(projectId, {
        name: newWsName,
        responsibleDepartment: newWsDept,
        description: newWsDesc,
        status: 'active',
        visibility: 'confidential',
      });
      const created = res.data?.payload;
      if (created) {
        setWorkspaces([...workspaces, created]);
      }
      setIsNewWsModalOpen(false);
      setNewWsName('');
      setNewWsDesc('');
      triggerRefresh();
    } catch (err) {
      console.error('Failed to create workspace:', err);
    }
  };

  // Filtered designs
  const filteredDesigns = designs.filter((d) => {
    if (filterWorkspace !== 'all' && d.workspaceId !== filterWorkspace) return false;
    if (filterDiscipline !== 'all' && d.discipline !== filterDiscipline) return false;
    if (filterStatus !== 'all' && d.currentStatus !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        d.title?.toLowerCase().includes(q) ||
        d.id?.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // If a design is selected for full viewing, render the UniversalDesignViewer
  if (selectedDesign) {
    return (
      <UniversalDesignViewer
        projectId={projectId}
        design={selectedDesign}
        apiClient={apiClient}
        isClientMode={isClientMode}
        onClose={() => setSelectedDesign(null)}
        onRefresh={() => triggerRefresh()}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '4px 0' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '16px 20px',
          backgroundColor: '#090d16',
          borderRadius: '8px',
          border: '1px solid #1e293b',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🎨</span>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>
              Design & Creative Management
            </h2>
            <Badge variant="primary" size="sm">
              POL-DES-01 Gated
            </Badge>
            {isClientMode && (
              <Badge variant="purple" size="sm">
                🛡️ Client Portal Safe
              </Badge>
            )}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
            Unified drawing control, coordinate markups, 3D viewpoints, POL-DES-01 safety gates & production release adoption.
          </p>
        </div>

        {!isClientMode && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNewWsModalOpen(true)}
              style={{ color: '#cbd5e1', borderColor: '#334155' }}
            >
              + New Workspace
            </Button>
            <Button
              variant="accent"
              size="sm"
              onClick={() => setIsNewDesignModalOpen(true)}
            >
              + Register Design Package
            </Button>
          </div>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          borderBottom: '1px solid #1e293b',
          paddingBottom: '2px',
          overflowX: 'auto',
        }}
      >
        {[
          { id: 'overview', label: '📊 Overview & KPIs', hideClient: true },
          { id: 'all_designs', label: '📁 All Designs' },
          { id: 'workspaces', label: '🏢 Workspaces', hideClient: true },
          { id: 'review_queue', label: '⏳ Review Queue', hideClient: true },
          { id: 'client_review', label: '🛡️ Client Review Room' },
          { id: 'approvals', label: '⚖️ Governance Approvals' },
          { id: 'changes', label: '⚡ Change Control (DCR)', hideClient: true },
          { id: 'releases', label: '🚀 Production Releases', hideClient: true },
          { id: 'design_register', label: '📑 Design Register' },
          { id: 'revision_register', label: '📜 Revision Register' },
        ]
          .filter((t) => !(isClientMode && t.hideClient))
          .map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SubTab)}
              style={{
                padding: '8px 14px',
                background: activeTab === tab.id ? '#1e293b' : 'transparent',
                color: activeTab === tab.id ? '#f59e0b' : '#94a3b8',
                border: 'none',
                borderRadius: '6px 6px 0 0',
                borderBottom: activeTab === tab.id ? '2px solid #f59e0b' : '2px solid transparent',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
      </div>

      {/* ========================================================================= */}
      {/* 1. OVERVIEW & KPIS                                                        */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* KPI Metrics Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
            }}
          >
            <MetricCard
              label="Total Designs"
              value={kpis.totalDesigns || designs.length}
              subtext="Across active workspaces"
              accentColor="#2563eb"
            />
            <MetricCard
              label="Under Review"
              value={(kpis.awaitingInternalReview || 0) + (kpis.awaitingClientReview || 0)}
              subtext={`${kpis.awaitingClientReview || 0} in client review`}
              accentColor="#d97706"
            />
            <MetricCard
              label="Approved for Prod"
              value={kpis.approvedForProduction || 0}
              subtext="POL-DES-01 Sealed & Locked"
              accentColor="#059669"
            />
            <MetricCard
              label="Open Review Pins"
              value={kpis.unresolvedComments || 4}
              subtext="Coordinate annotations"
              accentColor="#dc2626"
            />
            <MetricCard
              label="Awaiting Adoption"
              value={kpis.releasesAwaitingAcknowledgement || 1}
              subtext="Fabrication workshop holds"
              accentColor="#eab308"
            />
          </div>

          {/* Quick Guidance Alert */}
          <AlertBanner type="info" title="POL-DES-01 Production Gating Compliance">
            All fabrication drawing packages require verified structural engineer certification and Civil Defence safety
            sign-offs prior to release. New drawing revisions strictly reset production approvals under rule AT-034.
          </AlertBanner>

          {/* Workspaces Summary Grid */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                Active Design Workspaces
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('workspaces')}
                style={{ fontSize: '11px' }}
              >
                Manage Workspaces →
              </Button>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '12px',
              }}
            >
              {workspaces.map((ws) => (
                <Card key={ws.id} style={{ padding: '16px', backgroundColor: '#0d1322', borderColor: '#1e293b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '24px' }}>{ws.icon || '📁'}</span>
                    <div>
                      <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '14px' }}>{ws.name}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{ws.responsibleDepartment}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: '12px', color: '#cbd5e1', margin: '0 0 12px', lineHeight: '1.4' }}>
                    {ws.description}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8' }}>
                    <span>Lead: <strong>{ws.ownerName}</strong></span>
                    <Badge variant="neutral" size="sm">
                      {designs.filter((d) => d.workspaceId === ws.id).length} items
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ALL DESIGNS (GALLERY, TABLE & KANBAN)                                   */}
      {/* ========================================================================= */}
      {activeTab === 'all_designs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Controls Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              backgroundColor: '#0d1322',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #1e293b',
            }}
          >
            {/* Search and Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '320px' }}>
              <Input
                placeholder="Search drawings, tags, packages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1 }}
              />
              <Select
                value={filterWorkspace}
                onChange={(e) => setFilterWorkspace(e.target.value)}
                style={{ width: '160px' }}
              >
                <option value="all">All Workspaces</option>
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
              <Select
                value={filterDiscipline}
                onChange={(e) => setFilterDiscipline(e.target.value)}
                style={{ width: '140px' }}
              >
                <option value="all">All Disciplines</option>
                <option value="staging">Staging</option>
                <option value="audio_visual">AV</option>
                <option value="lighting">Lighting</option>
                <option value="health_safety">HSE</option>
                <option value="architecture">Architecture</option>
              </Select>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ width: '150px' }}
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="internal_review">Internal Review</option>
                <option value="client_review">Client Review</option>
                <option value="approved_for_production">Approved for Production</option>
              </Select>
            </div>

            {/* Layout Toggles */}
            <div style={{ display: 'flex', gap: '4px', backgroundColor: '#1e293b', padding: '2px', borderRadius: '4px' }}>
              <button
                onClick={() => setViewLayout('grid')}
                style={{
                  padding: '4px 8px',
                  background: viewLayout === 'grid' ? '#2563eb' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                🎛️ Grid
              </button>
              <button
                onClick={() => setViewLayout('table')}
                style={{
                  padding: '4px 8px',
                  background: viewLayout === 'table' ? '#2563eb' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                📑 Table
              </button>
              <button
                onClick={() => setViewLayout('kanban')}
                style={{
                  padding: '4px 8px',
                  background: viewLayout === 'kanban' ? '#2563eb' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                📋 Workflow Board
              </button>
            </div>
          </div>

          {/* Grid Layout */}
          {viewLayout === 'grid' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '16px',
              }}
            >
              {filteredDesigns.map((item) => (
                <Card
                  key={item.id}
                  style={{
                    backgroundColor: '#0d1322',
                    borderColor: '#1e293b',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease',
                  }}
                  onClick={() => setSelectedDesign(item)}
                >
                  <div>
                    {/* Visual Drawing Thumbnail Preview */}
                    <div
                      style={{
                        height: '140px',
                        backgroundColor: '#09152b',
                        borderRadius: '6px',
                        border: '1px solid #1e3a8a',
                        marginBottom: '12px',
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg viewBox="0 0 400 200" width="100%" height="100%">
                        <circle cx="200" cy="100" r="60" fill="none" stroke="#38bdf8" strokeWidth="4" />
                        <line x1="40" y1="160" x2="360" y2="160" stroke="#64748b" strokeWidth="4" />
                        <line x1="60" y1="160" x2="200" y2="30" stroke="#f59e0b" strokeWidth="3" />
                        <line x1="340" y1="160" x2="200" y2="30" stroke="#f59e0b" strokeWidth="3" />
                      </svg>
                      <div
                        style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          backgroundColor: 'rgba(9, 13, 22, 0.85)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#38bdf8',
                        }}
                      >
                        {item.currentRevisionCode || 'Rev A'}
                      </div>
                      <div
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          backgroundColor: 'rgba(9, 13, 22, 0.85)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          color: '#94a3b8',
                        }}
                      >
                        📍 {item.pins?.length || 0} Pins
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                        {item.id}
                      </span>
                      <Badge
                        variant={
                          item.currentStatus === 'approved_for_production'
                            ? 'success'
                            : item.currentStatus === 'client_review'
                            ? 'warning'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {item.currentStatus?.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                    </div>

                    <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 700, color: '#f8fafc', lineHeight: '1.3' }}>
                      {item.title}
                    </h4>
                    <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>
                      {item.description?.slice(0, 100)}...
                    </p>
                  </div>

                  <div style={{ borderTop: '1px solid #1e293b', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Discipline: <strong style={{ color: '#cbd5e1' }}>{item.discipline}</strong>
                    </div>
                    <Button variant="primary" size="sm">
                      Open Viewer 📐
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Table Layout */}
          {viewLayout === 'table' && (
            <div style={{ backgroundColor: '#0d1322', borderRadius: '6px', border: '1px solid #1e293b', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#090d16', borderBottom: '1px solid #1e293b', color: '#94a3b8' }}>
                    <th style={{ padding: '10px 14px' }}>DWG ID</th>
                    <th style={{ padding: '10px 14px' }}>Title</th>
                    <th style={{ padding: '10px 14px' }}>Discipline</th>
                    <th style={{ padding: '10px 14px' }}>Rev</th>
                    <th style={{ padding: '10px 14px' }}>Status</th>
                    <th style={{ padding: '10px 14px' }}>Owner</th>
                    <th style={{ padding: '10px 14px' }}>Pins</th>
                    <th style={{ padding: '10px 14px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDesigns.map((d) => (
                    <tr
                      key={d.id}
                      style={{ borderBottom: '1px solid #1e293b', cursor: 'pointer' }}
                      onClick={() => setSelectedDesign(d)}
                    >
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#38bdf8' }}>{d.id}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#f8fafc' }}>{d.title}</td>
                      <td style={{ padding: '10px 14px', color: '#cbd5e1' }}>{d.discipline}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <Badge variant="neutral" size="sm">
                          {d.currentRevisionCode}
                        </Badge>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <Badge
                          variant={
                            d.currentStatus === 'approved_for_production'
                              ? 'success'
                              : d.currentStatus === 'client_review'
                              ? 'warning'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {d.currentStatus}
                        </Badge>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{d.ownerName}</td>
                      <td style={{ padding: '10px 14px', color: '#f59e0b', fontWeight: 700 }}>
                        {d.pins?.length || 0}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <Button variant="outline" size="sm" style={{ fontSize: '11px' }}>
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Kanban Workflow Board Layout */}
          {viewLayout === 'kanban' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', minHeight: '480px' }}>
              {[
                { id: 'draft', label: '1. Drafts & Intake', statuses: ['draft'] },
                { id: 'internal_review', label: '2. Internal Multidisciplinary', statuses: ['internal_review', 'ready_for_internal_review'] },
                { id: 'client_review', label: '3. Client Review Room', statuses: ['client_review', 'ready_for_client_review'] },
                { id: 'approved_for_production', label: '4. POL-DES-01 Production Sealed', statuses: ['approved_for_production', 'client_approved'] },
              ].map((col) => {
                const colItems = filteredDesigns.filter((d) => col.statuses.includes(d.currentStatus));
                return (
                  <div
                    key={col.id}
                    style={{
                      backgroundColor: '#0d1322',
                      borderRadius: '6px',
                      border: '1px solid #1e293b',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: '#f8fafc' }}>{col.label}</span>
                      <Badge variant="neutral" size="sm">
                        {colItems.length}
                      </Badge>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      {colItems.map((item) => (
                        <Card
                          key={item.id}
                          style={{
                            backgroundColor: '#111827',
                            borderColor: '#1e293b',
                            padding: '10px',
                            cursor: 'pointer',
                          }}
                          onClick={() => setSelectedDesign(item)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                            <span>{item.id}</span>
                            <strong style={{ color: '#f59e0b' }}>{item.currentRevisionCode}</strong>
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>
                            {item.title}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b' }}>
                            <span>{item.discipline}</span>
                            <span>📍 {item.pins?.length || 0} pins</span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. WORKSPACES DIRECTORY                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'workspaces' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                Departmental Design Workspaces
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Workspaces provide domain isolation, default approval workflows, and spatial zone alignment.
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setIsNewWsModalOpen(true)}>
              + Create Workspace
            </Button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {workspaces.map((ws) => (
              <Card key={ws.id} style={{ padding: '16px', backgroundColor: '#0d1322', borderColor: '#1e293b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: ws.color || '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                    }}
                  >
                    {ws.icon || '🏛️'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '14px' }}>{ws.name}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{ws.responsibleDepartment}</div>
                  </div>
                </div>

                <p style={{ fontSize: '12px', color: '#cbd5e1', margin: '0 0 12px' }}>{ws.description}</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: '#94a3b8', borderTop: '1px solid #1e293b', paddingTop: '10px' }}>
                  <div>Workflow: <strong style={{ color: '#cbd5e1' }}>{ws.defaultWorkflow}</strong></div>
                  <div>Lead: <strong style={{ color: '#cbd5e1' }}>{ws.ownerName}</strong></div>
                  <div>Visibility: <strong style={{ color: '#cbd5e1' }}>{ws.visibility}</strong></div>
                </div>

                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFilterWorkspace(ws.id);
                      setActiveTab('all_designs');
                    }}
                  >
                    Filter Drawings →
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. REVIEW QUEUE & ROUNDS                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'review_queue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
              Multidisciplinary Review Rounds
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Coordinated technical review cycles with assigned discipline leads, due dates, and response trackers.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {designs.map((d) => (
              <Card key={d.id} style={{ padding: '16px', backgroundColor: '#0d1322', borderColor: '#1e293b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#38bdf8', fontFamily: 'monospace' }}>{d.id}</span>
                    <h4 style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                      {d.title} ({d.currentRevisionCode})
                    </h4>
                  </div>
                  <Badge variant={d.currentStatus === 'client_review' ? 'warning' : 'primary'} size="sm">
                    {d.currentStatus}
                  </Badge>
                </div>

                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#94a3b8', margin: '8px 0' }}>
                  <span>Review Purpose: <strong style={{ color: '#cbd5e1' }}>Multidisciplinary Clearance</strong></span>
                  <span>Due Date: <strong style={{ color: '#f59e0b' }}>In 5 Days (2026-09-24)</strong></span>
                  <span>Unresolved Pins: <strong style={{ color: '#ef4444' }}>{d.pins?.filter((p: any) => p.status !== 'resolved').length || 0}</strong></span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <Button variant="primary" size="sm" onClick={() => setSelectedDesign(d)}>
                    Open Review Workspace →
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. CLIENT REVIEW ROOM (ZERO-LEAK PROJECTION)                              */}
      {/* ========================================================================= */}
      {activeTab === 'client_review' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <AlertBanner type="success" title="Client Review Room — Zero Data Leakage Protection Active">
            This projection is restricted to client-approved drawings. Internal cost markups, sub-contractor margins,
            and confidential engineering internal notes are strictly filtered at both API and UI levels.
          </AlertBanner>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {designs
              .filter((d) => d.clientVisibility)
              .map((d) => (
                <Card
                  key={d.id}
                  style={{
                    backgroundColor: '#0d1322',
                    borderColor: '#1e293b',
                    padding: '16px',
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedDesign(d)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#38bdf8' }}>{d.id}</span>
                    <Badge variant="purple" size="sm">
                      {d.currentRevisionCode}
                    </Badge>
                  </div>
                  <h4 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                    {d.title}
                  </h4>
                  <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#94a3b8' }}>
                    {d.description?.slice(0, 90)}...
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1e293b', paddingTop: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      Client Visible Pins: {d.pins?.filter((p: any) => p.visibility !== 'internal_only').length || 0}
                    </span>
                    <Button variant="primary" size="sm">
                      Review & Markup
                    </Button>
                  </div>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. GOVERNANCE & POL-DES-01 APPROVALS                                      */}
      {/* ========================================================================= */}
      {activeTab === 'approvals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
              POL-DES-01 Production Governance & Sign-off Register
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Mandatory dual-engineering sign-offs (Structural Engineer & Civil Defence HSE) before fabrication release.
            </p>
          </div>

          <div style={{ backgroundColor: '#0d1322', borderRadius: '6px', border: '1px solid #1e293b', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#090d16', borderBottom: '1px solid #1e293b', color: '#94a3b8' }}>
                  <th style={{ padding: '10px 14px' }}>Drawing ID</th>
                  <th style={{ padding: '10px 14px' }}>Revision</th>
                  <th style={{ padding: '10px 14px' }}>Approval Purpose</th>
                  <th style={{ padding: '10px 14px' }}>Structural PE Sign-off</th>
                  <th style={{ padding: '10px 14px' }}>Civil Defence HSE Sign-off</th>
                  <th style={{ padding: '10px 14px' }}>Lock Status</th>
                  <th style={{ padding: '10px 14px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {designs.map((d) => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#38bdf8' }}>{d.id}</td>
                    <td style={{ padding: '10px 14px' }}>{d.currentRevisionCode}</td>
                    <td style={{ padding: '10px 14px', color: '#cbd5e1' }}>{d.approvalPurpose}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {d.currentStatus === 'approved_for_production' ? (
                        <span style={{ color: '#10b981', fontWeight: 600 }}>✅ Certified (QCDD-STR-9921)</span>
                      ) : (
                        <span style={{ color: '#f87171' }}>❌ Pending Verification</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {d.currentStatus === 'approved_for_production' ? (
                        <span style={{ color: '#10b981', fontWeight: 600 }}>✅ Certified (Capt. Tariq)</span>
                      ) : (
                        <span style={{ color: '#f87171' }}>❌ Pending Sign-off</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {d.currentStatus === 'approved_for_production' ? (
                        <Badge variant="success" size="sm">🔒 Locked</Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">Editable</Badge>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <Button
                        variant="accent"
                        size="sm"
                        onClick={() => setSelectedDesign(d)}
                        style={{ fontSize: '11px' }}
                      >
                        Review Sign-off
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. CHANGE CONTROL (DCR & VARIATIONS)                                      */}
      {/* ========================================================================= */}
      {activeTab === 'changes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
              Design Change Requests (DCR) & Commercial Impact
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Changes exceeding 25,000 QAR or 2 days schedule impact trigger mandatory Project Manager variation escalation.
            </p>
          </div>

          <AlertBanner type="warning" title="Commercial Protection Policy Active">
            Client comments and technical clarifications do NOT commit additional fabrication scope without an approved
            EOS Variation Order linked to the project BOQ.
          </AlertBanner>

          <Card style={{ padding: '16px', backgroundColor: '#0d1322', borderColor: '#1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700 }}>DCR-001 • MAJOR SCOPE CHANGE</span>
                <h4 style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                  Increase kinetic arch dynamic torque rating to 150% (DES-QND-001)
                </h4>
              </div>
              <Badge variant="warning" size="sm">Under PM Review</Badge>
            </div>

            <p style={{ fontSize: '12px', color: '#cbd5e1', margin: '0 0 10px' }}>
              Client modification requested during Boulevard rehearsal simulation. Dual failsafe electromagnetic brakes required.
            </p>

            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#94a3b8' }}>
              <span>Cost Delta: <strong style={{ color: '#ef4444' }}>+45,000 QAR</strong></span>
              <span>Schedule Delta: <strong style={{ color: '#ef4444' }}>+3 Days</strong></span>
              <span>Linked Variation: <strong style={{ color: '#38bdf8' }}>VAR-QND-004</strong></span>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. PRODUCTION RELEASES & RECIPIENT ADOPTION                               */}
      {/* ========================================================================= */}
      {activeTab === 'releases' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
              Production Releases & Workshop Adoption Tracking
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Track adoption across external fabricators, workshops, and rigging contractors. Superseded alerts prevent fabrication of obsolete revisions.
            </p>
          </div>

          <Card style={{ padding: '16px', backgroundColor: '#0d1322', borderColor: '#1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>REL-QND-001 • ACTIVE PRODUCTION RELEASE</span>
                <h4 style={{ margin: '2px 0 0', fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                  DES-QND-001 (Rev B) — Main Ceremony Kinetic Truss Package
                </h4>
              </div>
              <Badge variant="success" size="sm">Active Release</Badge>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #1e293b', paddingTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#cbd5e1' }}>Al Rayyan Scenic Workshop (Main Fabrication)</span>
                <Badge variant="success" size="sm">Production Started (2026-09-12)</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#cbd5e1' }}>Gulf Rigging & Automation Services</span>
                <Badge variant="warning" size="sm">Clarification Required</Badge>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. TABULAR ENGINEERING DESIGN REGISTER                                    */}
      {/* ========================================================================= */}
      {activeTab === 'design_register' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                Master Engineering Design Register
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Formal project document register with revision numbers, zones, linked requirements, and commercial ties.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => alert('Exporting Design Register to CSV / PDF...')}
            >
              📥 Export Register
            </Button>
          </div>

          <div style={{ backgroundColor: '#0d1322', borderRadius: '6px', border: '1px solid #1e293b', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#090d16', borderBottom: '1px solid #1e293b', color: '#94a3b8' }}>
                  <th style={{ padding: '10px 12px' }}>Package ID</th>
                  <th style={{ padding: '10px 12px' }}>Drawing Title</th>
                  <th style={{ padding: '10px 12px' }}>Discipline</th>
                  <th style={{ padding: '10px 12px' }}>Department</th>
                  <th style={{ padding: '10px 12px' }}>Rev</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px' }}>Zones</th>
                  <th style={{ padding: '10px 12px' }}>Requirements</th>
                  <th style={{ padding: '10px 12px' }}>BOQ Items</th>
                </tr>
              </thead>
              <tbody>
                {designs.map((d) => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#38bdf8' }}>{d.id}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#f8fafc' }}>{d.title}</td>
                    <td style={{ padding: '10px 12px', color: '#cbd5e1' }}>{d.discipline}</td>
                    <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{d.department}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{d.currentRevisionCode}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <Badge variant="neutral" size="sm">{d.currentStatus}</Badge>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{d.zones?.join(', ') || 'Site'}</td>
                    <td style={{ padding: '10px 12px', color: '#38bdf8' }}>{d.requirementIds?.join(', ') || 'None'}</td>
                    <td style={{ padding: '10px 12px', color: '#10b981' }}>{d.boqItemIds?.join(', ') || 'None'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. REVISION REGISTER (IMMUTABLE AUDIT TRAIL)                             */}
      {/* ========================================================================= */}
      {activeTab === 'revision_register' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
              Immutable Revision Register & Cryptographic Audit Trail
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Complete history of every drawing version uploaded, with SHA-256 content hashes, upload timestamps, and release flags.
            </p>
          </div>

          <div style={{ backgroundColor: '#0d1322', borderRadius: '6px', border: '1px solid #1e293b', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#090d16', borderBottom: '1px solid #1e293b', color: '#94a3b8' }}>
                  <th style={{ padding: '10px 12px' }}>Design ID</th>
                  <th style={{ padding: '10px 12px' }}>Revision</th>
                  <th style={{ padding: '10px 12px' }}>Version</th>
                  <th style={{ padding: '10px 12px' }}>SHA-256 Hash</th>
                  <th style={{ padding: '10px 12px' }}>Uploaded By</th>
                  <th style={{ padding: '10px 12px' }}>Date</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {designs.flatMap((d) =>
                  (d.revisions || []).map((r: any) => (
                    <tr key={`${d.id}-${r.revisionCode}`} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#38bdf8' }}>{d.id}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#f8fafc' }}>{r.revisionCode}</td>
                      <td style={{ padding: '10px 12px' }}>v{r.versionNumber}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#94a3b8', fontSize: '11px' }}>
                        {r.contentHash?.slice(0, 28)}...
                      </td>
                      <td style={{ padding: '10px 12px', color: '#cbd5e1' }}>{r.uploadedBy}</td>
                      <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{r.uploadedAt?.slice(0, 10)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <Badge variant="neutral" size="sm">{r.releaseStatus}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTER NEW DESIGN PACKAGE                                        */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isNewDesignModalOpen}
        onClose={() => setIsNewDesignModalOpen(false)}
        title="Register New Engineering Design Package"
      >
        <form onSubmit={handleCreateDesign} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Drawing Title *</label>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. VIP Protocol Entrance Arch Structural Elevations"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Workspace</label>
              <Select value={newWorkspaceId} onChange={(e) => setNewWorkspaceId(e.target.value)}>
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Discipline</label>
              <Select value={newDiscipline} onChange={(e) => setNewDiscipline(e.target.value)}>
                <option value="staging">Scenic & Staging</option>
                <option value="audio_visual">Audio-Visual</option>
                <option value="lighting">Lighting & Pyro</option>
                <option value="health_safety">HSE & Civil Defence</option>
                <option value="architecture">Architecture</option>
              </Select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Asset Type</label>
              <Select value={newAssetType} onChange={(e) => setNewAssetType(e.target.value)}>
                <option value="technical_drawing">2D Technical Drawing (PDF/DWG)</option>
                <option value="3d_model">3D Spatial Mesh (GLB/GLTF/IFC)</option>
                <option value="render">Photorealistic Render</option>
                <option value="video_simulation">Video Motion Simulation</option>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Client Portal Visibility</label>
              <Select
                value={newClientVisible ? 'yes' : 'no'}
                onChange={(e) => setNewClientVisible(e.target.value === 'yes')}
              >
                <option value="yes">Visible in Client Portal</option>
                <option value="no">Internal Only (Quarantined)</option>
              </Select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Description & Scope</label>
            <Textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Outline engineering scope, material specifications, and design criteria..."
              rows={3}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="outline" type="button" onClick={() => setIsNewDesignModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Register Package
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: CREATE DESIGN WORKSPACE                                            */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isNewWsModalOpen}
        onClose={() => setIsNewWsModalOpen(false)}
        title="Create Departmental Design Workspace"
      >
        <form onSubmit={handleCreateWorkspace} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Workspace Name *</label>
            <Input
              value={newWsName}
              onChange={(e) => setNewWsName(e.target.value)}
              placeholder="e.g. Broadcast Facilities & Gantry Infrastructure"
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Responsible Department</label>
            <Select value={newWsDept} onChange={(e) => setNewWsDept(e.target.value)}>
              <option value="Scenic & Staging">Scenic & Staging</option>
              <option value="Audio-Visual & Broadcast">Audio-Visual & Broadcast</option>
              <option value="Lighting & Pyro">Lighting & Pyro</option>
              <option value="Overlay & Site Infrastructure">Overlay & Site Infrastructure</option>
              <option value="Interior & Architectural Finishes">Interior & Architectural Finishes</option>
            </Select>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Scope Description</label>
            <Textarea
              value={newWsDesc}
              onChange={(e) => setNewWsDesc(e.target.value)}
              placeholder="Define spatial boundaries, primary lead roles, and delivery responsibilities..."
              rows={3}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="outline" type="button" onClick={() => setIsNewWsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Workspace
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
