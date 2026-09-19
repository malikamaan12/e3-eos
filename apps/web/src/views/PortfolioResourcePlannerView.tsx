import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import {
  Card,
  Badge,
  Button,
  Modal,
  E3_THEME,
  formatCurrency,
} from '../components/DesignSystem.js';

type ActiveTab = 'overview' | 'conflicts' | 'sourcing' | 'source_projections';
type ViewMode = 'table' | 'timeline';

interface ResourcePoolItem {
  id: string;
  name: string;
  sku: string;
  resourceClass: 'pooled_stock' | 'serialized_equipment' | 'fabrication_work_centre' | 'field_crew' | 'vehicle_transport';
  depotLocation: string;
  totalServiceable: number;
  occupiedByOthers: number;
  availableForNewDemand: number;
  projectConfirmedCoverage: number;
  shortfall: number;
  unit: string;
  sourceCheckTime: string;
  sourceSystem: 'E3 Rentals' | 'E3 Workshop' | 'Internal HR';
  status: 'available' | 'shortfall' | 'fully_booked';
}

interface ConflictItem {
  id: string;
  projectId: string;
  projectName: string;
  resourcePoolId: string;
  resourceName: string;
  requiredQuantity: number;
  availableStock: number;
  shortfall: number;
  unit: string;
  windowStart: string;
  windowEnd: string;
  conflictingProject: string;
  conflictingHold: number;
  decisionOwner?: string;
  resolutionStatus: 'unresolved' | 'proposed' | 'approved';
}

export const PortfolioResourcePlannerView: React.FC = () => {
  const { currentLanguage, direction, projects, selectedProjectId, setSelectedProjectId } = useEosContext();
  const isAr = currentLanguage === 'ar';

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected resource for detail modal
  const [selectedResource, setSelectedResource] = useState<ResourcePoolItem | null>(null);

  // Sourcing modeler interactive inputs
  const [modelDemandQty, setModelDemandQty] = useState<number>(20);
  const [modelStockAllocated, setModelStockAllocated] = useState<number>(8);
  const [modelHireAllocated, setModelHireAllocated] = useState<number>(8);
  const [modelFabAllocated, setModelFabAllocated] = useState<number>(4);
  const [sourcingSavedMessage, setSourcingSavedMessage] = useState<string | null>(null);

  // Default resource pools adhering to Section 6 canonical scenario + expanded classes
  const [resources, setResources] = useState<ResourcePoolItem[]>([
    {
      id: 'pool-reg-counters-doha',
      name: isAr ? 'منصات التسجيل - بلوط أبيض قياسي' : 'Registration Counters - Standard White Oak',
      sku: 'RNT-CTR-001',
      resourceClass: 'pooled_stock',
      depotLocation: 'Doha Main Depot',
      totalServiceable: 12,
      occupiedByOthers: 4, // Project B holds 4
      availableForNewDemand: 8, // 12 - 4 = 8
      projectConfirmedCoverage: 0,
      shortfall: 12, // 20 demanded - 8 available = 12 shortfall
      unit: 'each',
      sourceCheckTime: new Date().toISOString(),
      sourceSystem: 'E3 Rentals',
      status: 'shortfall',
    },
    {
      id: 'pool-led-screen-p3',
      name: isAr ? 'شاشة عرض LED داخلية 3.9 مم' : 'Indoor LED Screen Panels 3.9mm High-Res',
      sku: 'RNT-LED-003',
      resourceClass: 'serialized_equipment',
      depotLocation: 'Doha Main Depot',
      totalServiceable: 60,
      occupiedByOthers: 24,
      availableForNewDemand: 36,
      projectConfirmedCoverage: 0,
      shortfall: 0,
      unit: 'sqm',
      sourceCheckTime: new Date().toISOString(),
      sourceSystem: 'E3 Rentals',
      status: 'available',
    },
    {
      id: 'pool-fab-woodwork-01',
      name: isAr ? 'مركز أعمال النجارة والتشطيبات' : 'CNC Woodworking & Joinery Work Centre',
      sku: 'WRK-CNC-001',
      resourceClass: 'fabrication_work_centre',
      depotLocation: 'Al Wakrah Production Facility',
      totalServiceable: 160,
      occupiedByOthers: 80,
      availableForNewDemand: 80,
      projectConfirmedCoverage: 0,
      shortfall: 0,
      unit: 'hours',
      sourceCheckTime: new Date().toISOString(),
      sourceSystem: 'E3 Workshop',
      status: 'available',
    },
    {
      id: 'pool-crew-riggers',
      name: isAr ? 'فريق فنيي التركيب والمسارح المعتمد' : 'Certified Rigging & Stage Crew',
      sku: 'HR-RIG-002',
      resourceClass: 'field_crew',
      depotLocation: 'Qatar Regional Roster',
      totalServiceable: 20,
      occupiedByOthers: 16,
      availableForNewDemand: 4,
      projectConfirmedCoverage: 0,
      shortfall: 2,
      unit: 'shifts',
      sourceCheckTime: new Date().toISOString(),
      sourceSystem: 'Internal HR',
      status: 'shortfall',
    },
  ]);

  // Conflict queue items
  const [conflicts, setConflicts] = useState<ConflictItem[]>([
    {
      id: 'conf-001',
      projectId: 'EOS-UAT-LIFECYCLE-RUN01',
      projectName: 'Qatar Tech Summit 2026',
      resourcePoolId: 'pool-reg-counters-doha',
      resourceName: isAr ? 'منصات التسجيل - بلوط أبيض قياسي' : 'Registration Counters - Standard White Oak',
      requiredQuantity: 20,
      availableStock: 8,
      shortfall: 12,
      unit: 'each',
      windowStart: '2026-11-15T08:00:00+03:00',
      windowEnd: '2026-11-18T18:00:00+03:00',
      conflictingProject: 'EOS-UAT-ISOLATION-RUN01 (Project B)',
      conflictingHold: 4,
      decisionOwner: 'Head of Production Logistics',
      resolutionStatus: 'proposed',
    },
    {
      id: 'conf-002',
      projectId: 'EOS-UAT-LIFECYCLE-RUN01',
      projectName: 'Qatar Tech Summit 2026',
      resourcePoolId: 'pool-crew-riggers',
      resourceName: isAr ? 'فريق فنيي التركيب المعتمد' : 'Certified Rigging & Stage Crew',
      requiredQuantity: 6,
      availableStock: 4,
      shortfall: 2,
      unit: 'shifts',
      windowStart: '2026-11-14T06:00:00+03:00',
      windowEnd: '2026-11-15T18:00:00+03:00',
      conflictingProject: 'Doha Cultural Days Festival',
      conflictingHold: 16,
      decisionOwner: 'Crew Logistics Coordinator',
      resolutionStatus: 'unresolved',
    },
  ]);

  // Sourcing Math
  const totalModelAllocated = modelStockAllocated + modelHireAllocated + modelFabAllocated;
  const modelShortfall = Math.max(0, modelDemandQty - totalModelAllocated);
  const hireCost = modelHireAllocated * 750;
  const fabCost = modelFabAllocated * 1200;
  const totalSourcingCost = hireCost + fabCost;

  const handleSaveSourcingPlan = () => {
    setSourcingSavedMessage(
      isAr
        ? 'تم حفظ خطة التوريد بنجاح (8 مخزون داخلي + 8 تأجير خارجي + 4 تصنيع = 20)'
        : 'Sourcing plan committed: 8 Internal Stock + 8 External Hire + 4 Fabrication = 20 Total. Shortfall resolved.'
    );
    // Update local resource item
    setResources((prev) =>
      prev.map((r) =>
        r.id === 'pool-reg-counters-doha'
          ? { ...r, projectConfirmedCoverage: 8, shortfall: 0, status: 'available' }
          : r
      )
    );
    // Update conflict item
    setConflicts((prev) =>
      prev.map((c) =>
        c.id === 'conf-001' ? { ...c, resolutionStatus: 'approved' } : c
      )
    );
    setTimeout(() => setSourcingSavedMessage(null), 5000);
  };

  const filteredResources = resources.filter((r) => {
    if (filterClass !== 'all' && r.resourceClass !== filterClass) return false;
    if (searchQuery && !r.name.toLowerCase().includes(searchQuery.toLowerCase()) && !r.sku.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', direction }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: E3_THEME.text.primary, margin: 0 }}>
              {isAr ? 'مخطط الموارد والسعة المؤسسية' : 'Portfolio Resource & Capacity Planner'}
            </h1>
            <Badge variant="neutral">
              {isAr ? 'حالة الانفصال - المرحلة الأولى' : 'Disconnected Foundation Phase'}
            </Badge>
          </div>
          <p style={{ fontSize: '14px', color: E3_THEME.text.muted, margin: 0 }}>
            {isAr
              ? 'إدارة سعة الموارد متعددة المشاريع، واكتشاف التعارضات، والتوريد المشترك عبر E3 Rentals وتصنيع الورشة'
              : 'Cross-project capacity modeling, dated conflict detection, and multi-sourcing resolution across E3 Rentals and workshop fabrication.'}
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="outline" size="sm" onClick={() => setActiveTab('sourcing')}>
            {isAr ? 'نمذجة التوريد المشترك' : 'Multi-Sourcing Modeler'}
          </Button>
          <Button variant="primary" size="sm" onClick={() => setActiveTab('conflicts')}>
            {isAr ? `قائمة التعارضات (${conflicts.length})` : `Conflict Queue (${conflicts.length})`}
          </Button>
        </div>
      </div>

      {/* Disconnected Phase & Source Authority Governance Banner */}
      <div
        style={{
          background: '#fffbeb',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '8px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '24px' }}>🛡️</span>
          <div>
            <div style={{ fontWeight: '600', fontSize: '14px', color: '#f59e0b', marginBottom: '2px' }}>
              {isAr ? 'ضوابط السلطة المؤسسية وحدود الأنظمة الخارجية' : 'Enterprise Source Authority & Disconnected Operating Controls'}
            </div>
            <div style={{ fontSize: '13px', color: '#78350f' }}>
              {isAr
                ? 'E3 Rentals هي المرجع لمخزون المعدات والأصول. E3 PurchaseTracker هي المرجع للموردين وأوامر الشراء. الاتصال المباشر معلق حالياً.'
                : 'E3 Rentals is authoritative for equipment stock and reservations. E3 PurchaseTracker is authoritative for vendor compliance and POs. Live production connections remain deferred.'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Badge variant="neutral">E3 Rentals: Disconnected Snapshot</Badge>
          <Badge variant="neutral">PurchaseTracker: PO Deferred</Badge>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ borderBottom: `1px solid ${E3_THEME.surface.cardBorder}`, display: 'flex', gap: '24px', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '12px 4px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            fontWeight: activeTab === 'overview' ? '600' : '400',
            color: activeTab === 'overview' ? E3_THEME.accent.primary : E3_THEME.text.muted,
            borderBottom: activeTab === 'overview' ? `2px solid ${E3_THEME.accent.primary}` : '2px solid transparent',
            cursor: 'pointer',
          }}
        >
          {isAr ? 'نظرة عامة على السعة والموارد' : 'Resource Capacity Overview'}
        </button>
        <button
          onClick={() => setActiveTab('conflicts')}
          style={{
            padding: '12px 4px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            fontWeight: activeTab === 'conflicts' ? '600' : '400',
            color: activeTab === 'conflicts' ? E3_THEME.accent.primary : E3_THEME.text.muted,
            borderBottom: activeTab === 'conflicts' ? `2px solid ${E3_THEME.accent.primary}` : '2px solid transparent',
            cursor: 'pointer',
          }}
        >
          {isAr ? `قائمة التعارضات والقرارات (${conflicts.length})` : `Conflict & Decision Queue (${conflicts.length})`}
        </button>
        <button
          onClick={() => setActiveTab('sourcing')}
          style={{
            padding: '12px 4px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            fontWeight: activeTab === 'sourcing' ? '600' : '400',
            color: activeTab === 'sourcing' ? E3_THEME.accent.primary : E3_THEME.text.muted,
            borderBottom: activeTab === 'sourcing' ? `2px solid ${E3_THEME.accent.primary}` : '2px solid transparent',
            cursor: 'pointer',
          }}
        >
          {isAr ? 'نمذجة التوريد المشترك (المخزون / الإيجار / الورشة)' : 'Multi-Sourcing Modeler'}
        </button>
        <button
          onClick={() => setActiveTab('source_projections')}
          style={{
            padding: '12px 4px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            fontWeight: activeTab === 'source_projections' ? '600' : '400',
            color: activeTab === 'source_projections' ? E3_THEME.accent.primary : E3_THEME.text.muted,
            borderBottom: activeTab === 'source_projections' ? `2px solid ${E3_THEME.accent.primary}` : '2px solid transparent',
            cursor: 'pointer',
          }}
        >
          {isAr ? 'بيانات الأنظمة المرجعية (عرض للقراءة فقط)' : 'Source System Projections'}
        </button>
      </div>

      {/* TAB 1: RESOURCE CAPACITY OVERVIEW */}
      {activeTab === 'overview' && (
        <div>
          {/* Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder={isAr ? 'بحث عن المورد أو الرمز...' : 'Search resource or SKU...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${E3_THEME.surface.cardBorder}`,
                  fontSize: '13px',
                  minWidth: '240px',
                }}
              />
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${E3_THEME.surface.cardBorder}`,
                  fontSize: '13px',
                  background: 'var(--surface-1, #0f1624)',
                }}
              >
                <option value="all">{isAr ? 'جميع الفئات' : 'All Resource Classes'}</option>
                <option value="pooled_stock">{isAr ? 'مخزون مشترك (Pooled Stock)' : 'Pooled Stock'}</option>
                <option value="serialized_equipment">{isAr ? 'معدات مسلسلة (Serialized)' : 'Serialized Equipment'}</option>
                <option value="fabrication_work_centre">{isAr ? 'مراكز تصنيع ورشة' : 'Fabrication Work Centre'}</option>
                <option value="field_crew">{isAr ? 'فريق العمل الميداني' : 'Field Crew'}</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div style={{ display: 'flex', border: `1px solid ${E3_THEME.surface.cardBorder}`, borderRadius: '6px', overflow: 'hidden' }}>
              <button
                onClick={() => setViewMode('table')}
                style={{
                  padding: '6px 14px',
                  border: 'none',
                  background: viewMode === 'table' ? E3_THEME.surface.pageBg : 'var(--surface-1, #0f1624)',
                  fontWeight: viewMode === 'table' ? '600' : '400',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {isAr ? 'جدول' : 'Table'}
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                style={{
                  padding: '6px 14px',
                  border: 'none',
                  background: viewMode === 'timeline' ? E3_THEME.surface.pageBg : 'var(--surface-1, #0f1624)',
                  fontWeight: viewMode === 'timeline' ? '600' : '400',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {isAr ? 'المخطط الزمني' : 'Timeline'}
              </button>
            </div>
          </div>

          {/* Table View */}
          {viewMode === 'table' ? (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: direction === 'rtl' ? 'right' : 'left', fontSize: '13px' }}>
                <thead style={{ background: E3_THEME.surface.pageBg, borderBottom: `1px solid ${E3_THEME.surface.tableBorder}` }}>
                  <tr>
                    <th style={{ padding: '12px 16px', fontWeight: '600', color: E3_THEME.text.secondary }}>
                      {isAr ? 'المورد / الرمز' : 'Resource / SKU'}
                    </th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', color: E3_THEME.text.secondary }}>
                      {isAr ? 'الفئة والمستودع' : 'Class & Depot'}
                    </th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', color: E3_THEME.text.secondary }}>
                      {isAr ? 'إجمالي السعة الصالحة' : 'Total Serviceable'}
                    </th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', color: E3_THEME.text.secondary }}>
                      {isAr ? 'محجوز لمشاريع أخرى' : 'Occupied by Others'}
                    </th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', color: E3_THEME.text.secondary }}>
                      {isAr ? 'المتاح للطلب الجديد' : 'Available for Demand'}
                    </th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', color: E3_THEME.text.secondary }}>
                      {isAr ? 'تغطية هذا المشروع' : 'Project Coverage'}
                    </th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', color: E3_THEME.text.secondary }}>
                      {isAr ? 'العجز / النقص' : 'Shortfall'}
                    </th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', color: E3_THEME.text.secondary }}>
                      {isAr ? 'الإجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResources.map((item) => (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${E3_THEME.surface.tableBorder}` }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '600', color: E3_THEME.text.primary }}>{item.name}</div>
                        <div style={{ fontSize: '11px', color: E3_THEME.text.muted }}>SKU: {item.sku}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div>{item.resourceClass.replace(/_/g, ' ')}</div>
                        <div style={{ fontSize: '11px', color: E3_THEME.text.muted }}>{item.depotLocation}</div>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '500' }}>
                        {item.totalServiceable} {item.unit}
                      </td>
                      <td style={{ padding: '14px 16px', color: item.occupiedByOthers > 0 ? '#b45309' : E3_THEME.text.secondary }}>
                        {item.occupiedByOthers} {item.unit}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '600', color: item.availableForNewDemand > 0 ? '#15803d' : '#b91c1c' }}>
                        {item.availableForNewDemand} {item.unit}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {item.projectConfirmedCoverage > 0 ? (
                          <span style={{ color: '#4ade80', fontWeight: '600' }}>{item.projectConfirmedCoverage} {item.unit}</span>
                        ) : (
                          <span style={{ color: E3_THEME.text.muted }}>0 {item.unit}</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {item.shortfall > 0 ? (
                          <Badge variant="danger">{item.shortfall} {item.unit} shortage</Badge>
                        ) : (
                          <Badge variant="success">Fully Covered</Badge>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Button variant="outline" size="sm" onClick={() => setSelectedResource(item)}>
                            {isAr ? 'تفاصيل' : 'Details'}
                          </Button>
                          {item.shortfall > 0 && (
                            <Button variant="accent" size="sm" onClick={() => setActiveTab('sourcing')}>
                              {isAr ? 'نمذجة الحل' : 'Resolve'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : (
            /* Timeline View */
            <Card style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', fontSize: '14px', color: E3_THEME.text.primary }}>
                  {isAr ? 'مخطط الانشغال الزمني (نوفمبر 2026)' : 'Temporal Occupancy Schedule (10 Nov – 20 Nov 2026)'}
                </span>
                <span style={{ fontSize: '12px', color: E3_THEME.text.muted }}>
                  {isAr ? 'تشمل الفترات المؤقتة فترات التحضير والفحص (24 ساعة)' : 'Includes 24h prep and 24h return inspection buffer windows'}
                </span>
              </div>

              {/* Timeline Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filteredResources.map((res) => (
                  <div key={res.id} style={{ border: `1px solid ${E3_THEME.surface.cardBorder}`, borderRadius: '6px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '600', fontSize: '13px' }}>{res.name} ({res.depotLocation})</span>
                      <span style={{ fontSize: '12px', color: E3_THEME.text.secondary }}>
                        {res.availableForNewDemand} of {res.totalServiceable} {res.unit} free
                      </span>
                    </div>

                    {/* Graphic bar representing occupancy */}
                    <div style={{ height: '24px', background: 'var(--surface-2, #151e2e)', borderRadius: '4px', position: 'relative', overflow: 'hidden', display: 'flex' }}>
                      {/* Project B Hold (4 units) */}
                      {res.occupiedByOthers > 0 && (
                        <div
                          style={{
                            width: `${(res.occupiedByOthers / res.totalServiceable) * 100}%`,
                            background: '#fbbf24',
                            color: '#78350f',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: '600',
                          }}
                          title={`Project B Hold: ${res.occupiedByOthers} units (10-20 Nov)`}
                        >
                          Project B: {res.occupiedByOthers}
                        </div>
                      )}
                      {/* Free available capacity */}
                      <div
                        style={{
                          width: `${(res.availableForNewDemand / res.totalServiceable) * 100}%`,
                          background: '#86efac',
                          color: '#14532d',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: '600',
                        }}
                        title={`Available for New Demand: ${res.availableForNewDemand} units`}
                      >
                        Free: {res.availableForNewDemand}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TAB 2: CONFLICT & DECISION QUEUE */}
      {activeTab === 'conflicts' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: E3_THEME.text.primary, margin: '0 0 4px 0' }}>
              {isAr ? 'طابور التعارضات والقرارات النشطة' : 'Active Conflict & Decision Queue'}
            </h2>
            <p style={{ fontSize: '13px', color: E3_THEME.text.muted, margin: 0 }}>
              {isAr
                ? 'الحالات التي يتجاوز فيها الطلب السعة المتاحة في المستودعات مع تعيين المسؤولين وقرارات التوريد'
                : 'Over-capacity demands requiring multi-sourcing decisions, assigned resolution owners, and governance approvals.'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {conflicts.map((conf) => (
              <Card key={conf.id} style={{ borderLeft: conf.resolutionStatus === 'approved' ? '4px solid #16a34a' : '4px solid #dc2626' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '600', fontSize: '15px', color: E3_THEME.text.primary }}>
                        {conf.resourceName}
                      </span>
                      <Badge variant={conf.resolutionStatus === 'approved' ? 'success' : 'danger'}>
                        {conf.resolutionStatus === 'approved' ? 'Resolved & Approved' : 'Action Required: Shortfall'}
                      </Badge>
                    </div>
                    <div style={{ fontSize: '12px', color: E3_THEME.text.secondary }}>
                      {isAr ? 'المشروع:' : 'Project:'} <strong>{conf.projectName}</strong> ({conf.projectId})
                    </div>
                  </div>

                  <div style={{ textAlign: direction === 'rtl' ? 'left' : 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#ef4444' }}>
                      {conf.shortfall} {conf.unit} shortfall
                    </div>
                    <div style={{ fontSize: '11px', color: E3_THEME.text.muted }}>
                      Demanded: {conf.requiredQuantity} | Available: {conf.availableStock}
                    </div>
                  </div>
                </div>

                <div style={{ background: E3_THEME.surface.pageBg, padding: '12px', borderRadius: '6px', fontSize: '12px', marginBottom: '12px' }}>
                  <div style={{ marginBottom: '4px' }}>
                    <strong>{isAr ? 'السبب الميداني للتعارض:' : 'Conflict Cause:'}</strong> {conf.conflictingProject} already holds {conf.conflictingHold} {conf.unit} during 10–20 Nov 2026.
                  </div>
                  <div>
                    <strong>{isAr ? 'المسؤول المعين:' : 'Assigned Owner:'}</strong> {conf.decisionOwner || 'Unassigned'}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <Button variant="outline" size="sm" onClick={() => setSelectedResource(resources.find(r => r.id === conf.resourcePoolId) || null)}>
                    {isAr ? 'فحص السجل المرجعي' : 'Inspect Source Record'}
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => setActiveTab('sourcing')}>
                    {isAr ? 'فتح حاسبة التوريد' : 'Open Sourcing Calculator'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MULTI-SOURCING SCENARIO MODELER */}
      {activeTab === 'sourcing' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: E3_THEME.text.primary, margin: '0 0 4px 0' }}>
              {isAr ? 'نمذجة التوريد متعدد القنوات (السيناريو المعياري لـ 20 منصة)' : 'Multi-Sourcing Modeler (20-Counter Canonical Scenario)'}
            </h2>
            <p style={{ fontSize: '13px', color: E3_THEME.text.muted, margin: 0 }}>
              {isAr
                ? 'توزيع الطلب بين المخزون الداخلي المتاح، والتأجير الخارجي عبر PurchaseTracker، وتصنيع ورشة الإنتاج.'
                : 'Resolve demand shortfalls across internal stock, external rental (via PurchaseTracker), and workshop custom fabrication.'}
            </p>
          </div>

          {sourcingSavedMessage && (
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '12px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
              ✓ {sourcingSavedMessage}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Input Column */}
            <Card>
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: E3_THEME.text.primary }}>
                {isAr ? 'تخصيص كميات التوريد' : 'Allocation Breakdown'}
              </h3>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: E3_THEME.text.secondary, marginBottom: '6px' }}>
                  {isAr ? 'إجمالي الطلب المطلوب (منصات تسجيل)' : 'Total Required Demand (Registration Counters)'}
                </label>
                <input
                  type="number"
                  value={modelDemandQty}
                  onChange={(e) => setModelDemandQty(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: `1px solid ${E3_THEME.surface.cardBorder}` }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ fontWeight: '600', color: '#4ade80' }}>
                    1. {isAr ? 'المخزون الداخلي المتاح (E3 Rentals)' : 'Internal Stock (E3 Rentals)'}
                  </span>
                  <span style={{ color: E3_THEME.text.muted }}>Available: 8 | Cost: 0 QAR</span>
                </div>
                <input
                  type="number"
                  max={8}
                  min={0}
                  value={modelStockAllocated}
                  onChange={(e) => setModelStockAllocated(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: `1px solid ${E3_THEME.surface.cardBorder}` }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ fontWeight: '600', color: '#b45309' }}>
                    2. {isAr ? 'تأجير خارجي (E3 PurchaseTracker)' : 'External Hire (PurchaseTracker)'}
                  </span>
                  <span style={{ color: E3_THEME.text.muted }}>Rate: 750 QAR / unit</span>
                </div>
                <input
                  type="number"
                  min={0}
                  value={modelHireAllocated}
                  onChange={(e) => setModelHireAllocated(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: `1px solid ${E3_THEME.surface.cardBorder}` }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ fontWeight: '600', color: '#a78bfa' }}>
                    3. {isAr ? 'تصنيع ورشة الإنتاج (E3 Workshop)' : 'Workshop Fabrication (E3 Workshop)'}
                  </span>
                  <span style={{ color: E3_THEME.text.muted }}>Rate: 1,200 QAR / unit</span>
                </div>
                <input
                  type="number"
                  min={0}
                  value={modelFabAllocated}
                  onChange={(e) => setModelFabAllocated(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: `1px solid ${E3_THEME.surface.cardBorder}` }}
                />
              </div>

              <Button variant="primary" style={{ width: '100%' }} onClick={handleSaveSourcingPlan} disabled={modelShortfall > 0}>
                {isAr ? 'اعتماد خطة التوريد وحفظها كمسودة' : 'Commit & Save Sourcing Plan'}
              </Button>
            </Card>

            {/* Evaluation & Summary Column */}
            <Card>
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: E3_THEME.text.primary }}>
                {isAr ? 'مراجعة الموازنة وشروط الجاهزية' : 'Coverage Balance & Readiness Evaluation'}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: E3_THEME.surface.pageBg, padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: E3_THEME.text.muted }}>Total Allocated</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: totalModelAllocated === modelDemandQty ? '#15803d' : '#b45309' }}>
                    {totalModelAllocated} / {modelDemandQty}
                  </div>
                </div>

                <div style={{ background: E3_THEME.surface.pageBg, padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: E3_THEME.text.muted }}>Remaining Shortfall</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: modelShortfall === 0 ? '#15803d' : '#b91c1c' }}>
                    {modelShortfall}
                  </div>
                </div>
              </div>

              {/* Financial Impact */}
              <div style={{ border: `1px solid ${E3_THEME.surface.cardBorder}`, borderRadius: '6px', padding: '14px', marginBottom: '20px' }}>
                <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '8px' }}>
                  {isAr ? 'التكلفة الإضافية المقدرة' : 'Incremental Procurement & Build Cost'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: E3_THEME.text.secondary, marginBottom: '4px' }}>
                  <span>External Hire ({modelHireAllocated} × 750 QAR):</span>
                  <span>{formatCurrency(hireCost)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: E3_THEME.text.secondary, marginBottom: '8px' }}>
                  <span>Workshop Fabrication ({modelFabAllocated} × 1,200 QAR):</span>
                  <span>{formatCurrency(fabCost)}</span>
                </div>
                <div style={{ borderTop: `1px solid ${E3_THEME.surface.cardBorder}`, paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '14px', color: E3_THEME.text.primary }}>
                  <span>{isAr ? 'الإجمالي:' : 'Total Cost Impact:'}</span>
                  <span>{formatCurrency(totalSourcingCost)}</span>
                </div>
              </div>

              {/* Readiness Conditions Checklist */}
              <div>
                <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '8px' }}>
                  {isAr ? 'شروط الجاهزية المادية المسبقة' : 'Mandatory Physical Readiness Conditions'}
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: E3_THEME.text.secondary, lineHeight: '1.6' }}>
                  <li>Internal Stock: Warehouse pick list completed & Pre-rig QC pass</li>
                  <li>External Hire: Supplier PO issued & Site delivery inspection accepted</li>
                  <li>Fabrication: Approved build drawings & Workshop QC sign-off</li>
                </ul>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 4: SOURCE SYSTEM PROJECTIONS */}
      {activeTab === 'source_projections' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: E3_THEME.text.primary, margin: '0 0 4px 0' }}>
              {isAr ? 'إسقاطات الأنظمة المرجعية (بيانات للقراءة فقط)' : 'Source System Projections (Read-Only Projections)'}
            </h2>
            <p style={{ fontSize: '13px', color: E3_THEME.text.muted, margin: 0 }}>
              {isAr
                ? 'عرض الإسقاطات المسموحة من E3 Rentals وE3 PurchaseTracker مع توضيح حالة الانفصال والحدود المصرح بها.'
                : 'Inspect authorized read projections from E3 Rentals and E3 PurchaseTracker under disconnected foundation rules.'}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Rentals Card */}
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontWeight: '700', fontSize: '14px', color: E3_THEME.text.primary }}>
                  E3 Rentals Projection
                </span>
                <Badge variant="neutral">Status: Disconnected Snapshot</Badge>
              </div>
              <p style={{ fontSize: '12px', color: E3_THEME.text.muted, marginBottom: '12px' }}>
                Catalog snapshot projected from Doha Main Depot. Live reservations remain deferred.
              </p>
              <div style={{ background: E3_THEME.surface.pageBg, padding: '12px', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace' }}>
                <div>Pool: prod-counter-reg-01</div>
                <div>Name: Registration Counter - Standard White Oak</div>
                <div>Total Serviceable: 12 units</div>
                <div>Active Confirmed Holds: 4 units (Project B)</div>
                <div>Net Available for New Demand: 8 units</div>
                <div>Buffer Policy: 24h prep + 24h return inspection</div>
              </div>
            </Card>

            {/* PurchaseTracker Card */}
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontWeight: '700', fontSize: '14px', color: E3_THEME.text.primary }}>
                  E3 PurchaseTracker Projection
                </span>
                <Badge variant="neutral">Status: PR Only / PO Deferred</Badge>
              </div>
              <p style={{ fontSize: '12px', color: E3_THEME.text.muted, marginBottom: '12px' }}>
                Vendor Master projections with compliance statuses. Direct PO creation is blocked.
              </p>
              <div style={{ background: E3_THEME.surface.pageBg, padding: '12px', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace' }}>
                <div>vnd-pt-001: Gulf Rigging (Compliant / Approved)</div>
                <div>vnd-pt-002: Qatar Custom Fab (Compliant / Approved)</div>
                <div style={{ color: '#ef4444' }}>vnd-pt-003: Al-Rayyan Event Hire (Suspended / Blocked)</div>
                <div style={{ marginTop: '6px', color: E3_THEME.text.muted }}>Direct PO Creation: Disabled (PO_CREATION_DEFERRED)</div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedResource && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedResource(null)}
          title={isAr ? 'تفاصيل المورد والسعة المرجعية' : 'Authoritative Resource & Capacity Detail'}
        >
          <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
            <div style={{ marginBottom: '12px' }}>
              <strong>{selectedResource.name}</strong> ({selectedResource.sku})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              <div>Class: {selectedResource.resourceClass}</div>
              <div>Depot: {selectedResource.depotLocation}</div>
              <div>Total Serviceable: {selectedResource.totalServiceable} {selectedResource.unit}</div>
              <div>Occupied by Others: {selectedResource.occupiedByOthers} {selectedResource.unit}</div>
              <div>Available for New Demand: {selectedResource.availableForNewDemand} {selectedResource.unit}</div>
              <div>Authoritative Source: {selectedResource.sourceSystem}</div>
            </div>

            <div style={{ background: '#fffbeb', padding: '10px 14px', borderRadius: '6px', fontSize: '12px', color: '#f59e0b', marginBottom: '16px' }}>
              Notice: Direct reservations require live connection activation. In this phase, allocations are recorded locally as EOS planning drafts.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="outline" size="sm" onClick={() => setSelectedResource(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
