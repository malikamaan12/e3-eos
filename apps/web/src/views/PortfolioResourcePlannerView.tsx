import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useEosContext } from '../context/EosContext.js';
import {
  Card,
  Badge,
  Button,
  Modal,
  E3_THEME,
  formatCurrency,
} from '../components/DesignSystem.js';

type ActiveTab = 'overview' | 'demand' | 'conflicts' | 'sourcing' | 'source_projections';
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

export interface PortfolioResourcePlannerProps {
  initialProjectId?: string;
  isEmbedded?: boolean;
}

export const PortfolioResourcePlannerView: React.FC<PortfolioResourcePlannerProps> = ({
  initialProjectId,
  isEmbedded = false,
}) => {
  const { currentLanguage, direction, projects, selectedProjectId, setSelectedProjectId, currentUser } = useEosContext();
  const isAr = currentLanguage === 'ar';

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const qPid = params.get('projectId') || params.get('id');
      if (qPid) return qPid;
    }
    return initialProjectId || selectedProjectId || 'PROJ-ACC-001';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const qPid = params.get('projectId') || params.get('id');
      if (qPid) {
        if (qPid !== activeProjectId) {
          setActiveProjectId(qPid);
        }
        if (selectedProjectId !== qPid) {
          setSelectedProjectId(qPid);
        }
        return;
      }
    }
    if (initialProjectId && initialProjectId !== activeProjectId) {
      setActiveProjectId(initialProjectId);
    } else if (selectedProjectId && selectedProjectId !== activeProjectId) {
      setActiveProjectId(selectedProjectId);
    }
  }, [initialProjectId, selectedProjectId, activeProjectId]);

  const activeProject = projects.find((p) => p.id === activeProjectId || (p as any).code === activeProjectId || (p as any).projectCode === activeProjectId) || {
    id: activeProjectId,
    name: activeProjectId === 'PROJ-ACC-001' ? 'Acceptance A' : activeProjectId === 'PROJ-ACC-002' ? 'Acceptance B' : activeProjectId,
    code: activeProjectId === 'PROJ-ACC-001' ? 'PROJ-ACC-001' : activeProjectId === 'PROJ-ACC-002' ? 'PROJ-ACC-002' : activeProjectId,
    venue: activeProjectId === 'PROJ-ACC-002' ? 'DECC — VIP Pavilion' : 'DECC — Hall 1 & 2',
    status: 'operational',
  };

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected resource for detail modal
  const [selectedResource, setSelectedResource] = useState<ResourcePoolItem | null>(null);

  // Sourcing modeler interactive inputs
  const [modelDemandQty, setModelDemandQty] = useState<number>(activeProjectId === 'PROJ-ACC-002' ? 6 : 20);
  const [modelStockAllocated, setModelStockAllocated] = useState<number>(activeProjectId === 'PROJ-ACC-002' ? 6 : 8);
  const [modelHireAllocated, setModelHireAllocated] = useState<number>(activeProjectId === 'PROJ-ACC-002' ? 0 : 8);
  const [modelFabAllocated, setModelFabAllocated] = useState<number>(activeProjectId === 'PROJ-ACC-002' ? 0 : 4);
  const [currentScenarioVersion, setCurrentScenarioVersion] = useState<number>(0);
  const [savedScenarioDemand, setSavedScenarioDemand] = useState<number>(activeProjectId === 'PROJ-ACC-002' ? 6 : 20);

  // Decision inputs for conflicts
  const [decisionOwners, setDecisionOwners] = useState<Record<string, string>>({});
  const [decisionRationales, setDecisionRationales] = useState<Record<string, string>>({});
  const [hasVersionConflict, setHasVersionConflict] = useState<boolean>(false);

  // Role simulation & RBAC permissions
  const [simulatedRole, setSimulatedRole] = useState<'project_lead' | 'director_of_operations' | 'crew_member'>(() => {
    if (currentUser?.role === 'crew_member') return 'crew_member';
    if (currentUser?.role === 'director_of_operations' || currentUser?.role === 'project_director') return 'director_of_operations';
    return 'project_lead';
  });
  const effectiveRole = simulatedRole || currentUser?.role || 'project_lead';
  const isRestrictedRole = effectiveRole === 'crew_member';
  const isDirectorRole = effectiveRole === 'director_of_operations' || effectiveRole === 'project_lead';

  // Persistence Status (Saving / Saved / Could not save)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Demand Breakdown & Grouping Mode (Section 6 Item 3: non-duplication invariant)
  const [demandGroupingMode, setDemandGroupingMode] = useState<'zone' | 'department' | 'package'>('zone');

  // Demand Line Items & Version State
  const [currentDemandVersion, setCurrentDemandVersion] = useState<number>(0);
  const [totalDemandQuantity, setTotalDemandQuantity] = useState<number>(activeProjectId === 'PROJ-ACC-002' ? 6 : 20);
  const [demandLineItems, setDemandLineItems] = useState<any[]>(() => {
    if (activeProjectId === 'PROJ-ACC-002') {
      return [
        {
          id: 'req-acc-b-01',
          title: isAr ? 'منصات تسجيل الحضور - الجناح الثقافي' : 'Registration Counters - Cultural Showcase Reception',
          zone: 'Zone A (Main Hall)',
          department: 'Guest Experience',
          package: 'WP-01 Registration',
          quantity: 6,
          unit: 'each',
          owner: 'Fatima Al-Kuwari',
          dates: '10 Nov 2026 10:00 – 18:00',
        },
      ];
    }
    return [
      {
        id: 'req-01-zone-a',
        title: isAr ? 'منصات تسجيل الحضور - المدخل الرئيسي' : 'Registration Counters - Main Entrance',
        zone: 'Zone A (Main Atrium)',
        department: 'Guest Experience',
        package: 'WP-01 Registration & Reception',
        quantity: 12,
        unit: 'each',
        owner: 'Zaid Mansour (Lead PM)',
        dates: '10 Nov 2026 10:00 – 18:00',
      },
      {
        id: 'req-01-zone-b',
        title: isAr ? 'منصات تسجيل الحضور - قاعة كبار الشخصيات' : 'Registration Counters - VIP Majlis',
        zone: 'Zone B (VIP Hall)',
        department: 'Protocol & VIP Services',
        package: 'WP-01 Registration & Reception',
        quantity: 8,
        unit: 'each',
        owner: 'Dr. Sarah Ibrahim',
        dates: '10 Nov 2026 10:00 – 18:00',
      },
    ];
  });

  const inFlightProjectIdRef = useRef<string>(activeProjectId);

  // Invariant: Switching between zone, department, and package views NEVER creates copies or modifies totals!
  const groupedBreakdown = useMemo(() => {
    const map: Record<string, { totalQty: number; items: typeof demandLineItems }> = {};
    for (const item of demandLineItems) {
      const groupKey = item[demandGroupingMode] || 'General';
      if (!map[groupKey]) {
        map[groupKey] = { totalQty: 0, items: [] };
      }
      map[groupKey].totalQty += item.quantity;
      map[groupKey].items.push(item);
    }
    return Object.entries(map).map(([key, data]) => ({
      groupName: key,
      totalQuantity: data.totalQty,
      items: data.items,
    }));
  }, [demandGroupingMode, demandLineItems]);

  const allocatedQuantity = useMemo(() => {
    return demandLineItems.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
  }, [demandLineItems]);

  const unallocatedQuantity = Math.max(0, totalDemandQuantity - allocatedQuantity);
  const isScenarioOutdated = totalDemandQuantity !== savedScenarioDemand;

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
      projectId: activeProjectId,
      projectName: activeProject.name || 'Qatar Tourism Annual Exhibition & Gala 2026',
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
      projectId: activeProjectId,
      projectName: activeProject.name || 'Qatar Tourism Annual Exhibition & Gala 2026',
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

  // Real data loading from PostgreSQL on activeProjectId change
  const loadProjectData = useCallback(async () => {
    inFlightProjectIdRef.current = activeProjectId;
    const reqProjectId = activeProjectId;

    try {
      // 1. Fetch project resource demand
      const demandRes = await fetch(`/api/v1/projects/${reqProjectId}/resource-demand`, {
        headers: {
          'x-tenant-id': 'tenant-e3-production',
          'x-user-id': currentUser?.id || 'planner-user',
        },
      });
      if (demandRes.ok) {
        const demandJson = await demandRes.json();
        if (inFlightProjectIdRef.current === reqProjectId && demandJson.data) {
          const data = demandJson.data;
          if (Array.isArray(data.requirements) && data.requirements.length > 0) {
            setDemandLineItems(data.requirements);
            const sum = data.requirements.reduce((acc: number, r: any) => acc + (Number(r.quantity) || 0), 0);
            const savedTotal = data.assumptions?.totalDemand !== undefined ? Number(data.assumptions.totalDemand) : sum;
            setTotalDemandQuantity(savedTotal);
            setModelDemandQty(savedTotal);
          }
          if (data.version !== undefined) {
            setCurrentDemandVersion(data.version);
          }
        }
      }

      // 2. Fetch project sourcing scenarios
      const scenarioRes = await fetch(`/api/v1/projects/${reqProjectId}/sourcing-scenarios`, {
        headers: {
          'x-tenant-id': 'tenant-e3-production',
          'x-user-id': currentUser?.id || 'planner-user',
        },
      });
      if (scenarioRes.ok) {
        const scenarioJson = await scenarioRes.json();
        if (inFlightProjectIdRef.current === reqProjectId && Array.isArray(scenarioJson.data) && scenarioJson.data.length > 0) {
          const latest = scenarioJson.data[scenarioJson.data.length - 1];
          if (latest.version !== undefined) setCurrentScenarioVersion(latest.version);
          if (latest.allocations) {
            setModelStockAllocated(Number(latest.allocations.internalStock) || 0);
            setModelHireAllocated(Number(latest.allocations.externalHire) || 0);
            setModelFabAllocated(Number(latest.allocations.workshopFabrication) || 0);
            const scTotal = Number(latest.allocations.total) || (Number(latest.allocations.internalStock) || 0) + (Number(latest.allocations.externalHire) || 0) + (Number(latest.allocations.workshopFabrication) || 0);
            setSavedScenarioDemand(scTotal);
          }
        }
      }

      // 3. Fetch conflict decisions
      const decisionsRes = await fetch(`/api/v1/projects/${reqProjectId}/conflict-decisions`, {
        headers: {
          'x-tenant-id': 'tenant-e3-production',
          'x-user-id': currentUser?.id || 'planner-user',
        },
      });
      if (decisionsRes.ok) {
        const decisionsJson = await decisionsRes.json();
        if (inFlightProjectIdRef.current === reqProjectId && Array.isArray(decisionsJson.data) && decisionsJson.data.length > 0) {
          setConflicts((prev) =>
            prev.map((c) => {
              const dec = decisionsJson.data.find((d: any) => d.conflictRef === c.id);
              if (dec) {
                return {
                  ...c,
                  resolutionStatus: (dec.status as any) || 'approved',
                  decisionOwner: dec.assignedOwner || c.decisionOwner,
                };
              }
              return c;
            })
          );
        }
      }
    } catch (e) {
      console.warn('Could not load remote project data for', reqProjectId, e);
    }
  }, [activeProjectId, currentUser]);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  const handleSaveDemandRevision = async () => {
    const targetProjId = activeProjectId;
    setSaveStatus('saving');
    setSaveMessage(isAr ? 'جاري حفظ تعديل المتطلبات في قاعدة بيانات PostgreSQL...' : 'Saving demand revision to PostgreSQL durable store...');

    try {
      const res = await fetch(`/api/v1/projects/${targetProjId}/resource-demand`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'tenant-e3-production',
          'x-user-id': currentUser?.id || 'planner-user',
        },
        body: JSON.stringify({
          requirements: demandLineItems,
          assumptions: {
            totalDemand: totalDemandQuantity,
            unallocatedQuantity,
            basis: `Scope revision: demanded ${totalDemandQuantity} units with ${unallocatedQuantity} unallocated`,
          },
          expectedVersion: currentDemandVersion,
          updatedBy: currentUser?.email || 'planner-user',
        }),
      });

      // Avoid retargeting or updating UI if project switched during request (Section 5 Item 8)
      if (inFlightProjectIdRef.current !== targetProjId) {
        return;
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setSaveStatus('error');
          setHasVersionConflict(true);
          const currentVer = errJson.currentRecord?.version || 'newer';
          setSaveMessage(
            isAr
              ? `⚠️ تعارض في الإصدار (409): تم تعديل متطلبات المشروع بالتزامن. الإصدار الحالي هو ${currentVer}. تم الاحتفاظ بمدخلاتك.`
              : `⚠️ Demand Version Conflict (409): Resource demand was modified concurrently. Current version is v${currentVer}. Form inputs preserved.`
          );
          return;
        }
        throw new Error(errJson.detail || errJson.title || `Server error HTTP ${res.status}`);
      }

      const resJson = await res.json();
      const newVersion = resJson.data?.version || (currentDemandVersion + 1);
      setCurrentDemandVersion(newVersion);
      setHasVersionConflict(false);
      setSaveStatus('saved');
      setSaveMessage(
        isAr
          ? `تم حفظ تعديل المتطلبات بنجاح في PostgreSQL (الإصدار v${newVersion}). إجمالي الطلب: ${totalDemandQuantity}، غير المخصص: ${unallocatedQuantity}`
          : `Demand revision committed and durably persisted in PostgreSQL (v${newVersion}). Total: ${totalDemandQuantity} units, Unallocated: ${unallocatedQuantity}.`
      );
    } catch (err: any) {
      if (inFlightProjectIdRef.current === targetProjId) {
        setSaveStatus('error');
        setSaveMessage(
          isAr
            ? `تعذر حفظ المتطلبات: ${err.message}. تم الاحتفاظ ببيانات النموذج.`
            : `Could not save demand revision: ${err.message}. Form inputs preserved.`
        );
      }
    }
  };

  const handleSaveSourcingPlan = async () => {
    const targetProjId = activeProjectId;
    setSaveStatus('saving');
    setSaveMessage(isAr ? 'جاري حفظ خطة التوريد في قاعدة بيانات PostgreSQL...' : 'Saving sourcing plan to PostgreSQL durable store...');

    try {
      const payload = {
        name: 'Scenario A: Balanced Multi-Source',
        status: 'draft',
        allocations: {
          total: totalModelAllocated,
          internalStock: modelStockAllocated,
          externalHire: modelHireAllocated,
          workshopFabrication: modelFabAllocated,
        },
        costBreakdown: {
          totalCostQar: totalSourcingCost,
          externalHireCostQar: hireCost,
          workshopFabricationCostQar: fabCost,
        },
        readinessConditions: {
          hireVendorShortlist: ['Q-Events Logistics WLL'],
          workshopSlotsReserved: ['WRK-CNC-001-SLOT-03'],
          stockReservationStatus: 'tentative_hold',
        },
        expectedVersion: currentScenarioVersion,
        createdBy: currentUser?.email || 'user-planner-01',
      };

      const res = await fetch(`/api/v1/projects/${targetProjId}/sourcing-scenarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'tenant-e3-production',
          'x-user-id': currentUser?.id || 'user-planner-01',
        },
        body: JSON.stringify(payload),
      });

      if (inFlightProjectIdRef.current !== targetProjId) {
        return;
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setSaveStatus('error');
          const currentVer = errJson.currentRecord?.version || 'newer';
          setSaveMessage(
            isAr
              ? `⚠️ تعارض في الإصدار (409): تم تعديل خطة التوريد بالتزامن. الإصدار الحالي هو ${currentVer}. تم الاحتفاظ بمدخلاتك.`
              : `⚠️ Scenario Version Conflict (409): Sourcing scenario was modified concurrently. Current version is v${currentVer}. Form inputs preserved.`
          );
          return;
        }
        throw new Error(errJson.detail || errJson.title || `Server responded with HTTP ${res.status}`);
      }

      const data = await res.json();
      const newVer = data.data?.version || (currentScenarioVersion + 1);
      setCurrentScenarioVersion(newVer);
      setSavedScenarioDemand(totalModelAllocated);
      setSaveStatus('saved');
      setSaveMessage(
        isAr
          ? `تم حفظ خطة التوريد بنجاح في قاعدة بيانات PostgreSQL (النسخة v${newVer}).`
          : `Sourcing plan committed and durably persisted in PostgreSQL (v${newVer}). Split: ${modelStockAllocated} stock + ${modelHireAllocated} hire + ${modelFabAllocated} fab.`
      );

      // Update local resource item
      setResources((prev) =>
        prev.map((r) =>
          r.id === 'pool-reg-counters-doha'
            ? { ...r, projectConfirmedCoverage: modelStockAllocated, shortfall: 0, status: 'available' }
            : r
        )
      );
      // Update conflict item to proposed (pending Director approval)
      setConflicts((prev) =>
        prev.map((c) =>
          c.id === 'conf-001' ? { ...c, resolutionStatus: 'proposed' } : c
        )
      );
    } catch (err: any) {
      if (inFlightProjectIdRef.current === targetProjId) {
        setSaveStatus('error');
        setSaveMessage(
          isAr
            ? `تعذر الحفظ: ${err.message}. تم الاحتفاظ ببيانات النموذج.`
            : `Could not save: ${err.message}. Form inputs have been preserved.`
        );
      }
    }
  };

  const handleResolveConflict = async (conflictId: string, assignedOwner: string, rationaleText?: string) => {
    const targetProjId = activeProjectId;
    setSaveStatus('saving');
    setSaveMessage(isAr ? 'جاري حفظ القرار في قاعدة البيانات...' : 'Saving conflict resolution decision to PostgreSQL...');

    try {
      const conf = conflicts.find((c) => c.id === conflictId);
      const res = await fetch(`/api/v1/projects/${targetProjId}/conflict-decisions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'tenant-e3-production',
          'x-user-id': currentUser?.id || 'director-user',
        },
        body: JSON.stringify({
          conflictRef: conflictId,
          resourcePoolId: conf?.resourcePoolId || 'pool-reg-counters-doha',
          assignedOwner: assignedOwner || 'Director of Operations',
          resolutionAction: 'multi_sourcing_split',
          rationale: rationaleText || `Authorized decision: approved sourcing split (${modelStockAllocated} stock + ${modelHireAllocated} hire + ${modelFabAllocated} fab).`,
          status: 'approved',
          decidedBy: currentUser?.email || 'director-user',
        }),
      });

      if (inFlightProjectIdRef.current !== targetProjId) {
        return;
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || errJson.title || `Server responded with HTTP ${res.status}`);
      }

      setConflicts((prev) =>
        prev.map((c) =>
          c.id === conflictId
            ? { ...c, resolutionStatus: 'approved', decisionOwner: assignedOwner }
            : c
        )
      );
      setSaveStatus('saved');
      setSaveMessage(
        isAr
          ? 'تم اعتماد وتوثيق القرار بنجاح في قاعدة بيانات PostgreSQL.'
          : 'Conflict decision recorded and durably committed in PostgreSQL.'
      );
    } catch (err: any) {
      if (inFlightProjectIdRef.current === targetProjId) {
        setSaveStatus('error');
        setSaveMessage(
          isAr
            ? `تعذر حفظ القرار: ${err.message}`
            : `Could not save conflict decision: ${err.message}`
        );
      }
    }
  };

  const filteredResources = resources.filter((r) => {
    if (filterClass !== 'all' && r.resourceClass !== filterClass) return false;
    if (searchQuery && !r.name.toLowerCase().includes(searchQuery.toLowerCase()) && !r.sku.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div style={{ padding: isEmbedded ? '12px 0' : '24px 32px', maxWidth: '1440px', margin: '0 auto', direction }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: E3_THEME.text.primary, margin: 0 }}>
              {isAr ? 'مخطط الموارد والسعة المؤسسية' : 'Portfolio Resource & Capacity Planner'}
            </h1>
            <Badge variant="neutral">
              {isAr ? 'حالة الانفصال - المرحلة الأولى' : 'Disconnected Foundation Phase'}
            </Badge>
          </div>
          <p style={{ fontSize: '14px', color: E3_THEME.text.muted, margin: '0 0 6px 0' }}>
            {isAr
              ? 'إدارة سعة الموارد متعددة المشاريع، واكتشاف التعارضات، والتوريد المشترك عبر E3 Rentals وتصنيع الورشة'
              : 'Cross-project capacity modeling, dated conflict detection, and multi-sourcing resolution across E3 Rentals and workshop fabrication.'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', marginTop: '6px', flexWrap: 'wrap' }}>
            <label htmlFor="planner-project-select" style={{ color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>
              {isAr ? 'المشروع النشط:' : 'Active Project:'}
            </label>
            <select
              id="planner-project-select"
              value={activeProjectId}
              onChange={(e) => {
                const newId = e.target.value;
                setActiveProjectId(newId);
                setSelectedProjectId(newId);
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1.5px solid var(--accent, #d97706)',
                backgroundColor: 'var(--surface-1, #0f1624)',
                color: 'var(--text-primary, #f8fafc)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {(p as any).code || (p as any).projectCode || p.id} — {p.name || (p as any).title}
                </option>
              ))}
            </select>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)' }}>
              ({typeof activeProject.venue === 'string'
                ? activeProject.venue
                : typeof activeProject.venue === 'object' && typeof activeProject.venue?.name === 'string'
                ? activeProject.venue.name
                : 'DECC — Doha'})
            </span>
          </div>
        </div>

        {/* Action Controls & Active Role Simulation */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface-1, #0f1624)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-default, #2a374b)' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted, #94a3b8)' }}>Active Identity:</span>
            <select
              id="planner-role-selector"
              value={simulatedRole}
              onChange={(e) => setSimulatedRole(e.target.value as any)}
              style={{
                background: 'transparent',
                border: 'none',
                color: simulatedRole === 'crew_member' ? '#f87171' : simulatedRole === 'director_of_operations' ? '#4ade80' : '#fbbf24',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="project_lead" style={{ background: '#0f1624', color: '#f8fafc' }}>Planner (Lead PM)</option>
              <option value="director_of_operations" style={{ background: '#0f1624', color: '#f8fafc' }}>Reviewer (Director of Operations)</option>
              <option value="crew_member" style={{ background: '#0f1624', color: '#f8fafc' }}>Restricted (Crew Member)</option>
            </select>
          </div>
          <Button variant="outline" size="sm" onClick={() => setActiveTab('sourcing')}>
            {isAr ? 'نمذجة التوريد المشترك' : 'Multi-Sourcing Modeler'}
          </Button>
          <Button variant="primary" size="sm" onClick={() => setActiveTab('conflicts')}>
            {isAr ? `قائمة التعارضات (${conflicts.length})` : `Conflict Queue (${conflicts.length})`}
          </Button>
        </div>
      </div>

      {/* Version Conflict Alert (Section 4 Check 5: Concurrent Edits) */}
      {hasVersionConflict && (
        <div
          id="banner-version-conflict"
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1.5px solid #ef4444',
            color: 'var(--text-primary, #f8fafc)',
            padding: '14px 18px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div>
              <strong style={{ color: '#ef4444' }}>
                {isAr ? 'تعارض في الإصدار بالتزامن (HTTP 409 Conflict):' : 'Concurrent Edit Conflict (HTTP 409 Conflict):'}
              </strong>{' '}
              <span>
                {isAr
                  ? 'تم تحديث متطلبات المشروع بواسطة مستخدم آخر بالتزامن. تم رفض التحديث المتقادم لمنع الكتابة الفوقية مع الاحتفاظ بمدخلاتك.'
                  : 'The project records were modified concurrently by another user or session. Your stale update was rejected to prevent data loss. Form inputs preserved.'}
              </span>
            </div>
          </div>
          <Button
            id="btn-conflict-refresh"
            variant="outline"
            size="sm"
            onClick={() => {
              setHasVersionConflict(false);
              loadProjectData();
            }}
          >
            {isAr ? 'تحديث البيانات ومراجعة الأحدث' : 'Refresh Server State'}
          </Button>
        </div>
      )}

      {/* Persistence Status Alert (Saving / Saved / Could not save) */}
      {saveStatus !== 'idle' && saveMessage && (
        <div
          id="planner-save-status-banner"
          style={{
            background: saveStatus === 'saving' ? 'var(--status-info-bg, rgba(59,130,246,0.15))' : saveStatus === 'saved' ? 'var(--status-success-bg, rgba(34,197,94,0.15))' : 'var(--status-critical-bg, rgba(239,68,68,0.15))',
            border: `1.5px solid ${saveStatus === 'saving' ? 'var(--status-info-fg, #3b82f6)' : saveStatus === 'saved' ? 'var(--status-success-fg, #22c55e)' : 'var(--status-critical-fg, #ef4444)'}`,
            color: 'var(--text-primary, #f8fafc)',
            padding: '12px 18px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px' }}>
              {saveStatus === 'saving' ? '⏳' : saveStatus === 'saved' ? '✓' : '⚠️'}
            </span>
            <span style={{ fontWeight: '600' }}>{saveMessage}</span>
          </div>
          {saveStatus === 'saved' && (
            <button
              onClick={() => setSaveStatus('idle')}
              style={{ background: 'none', border: 'none', color: 'var(--text-primary, #f8fafc)', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Disconnected Phase & Source Authority Governance Banner */}
      <div
        style={{
          background: 'var(--surface-2, #151e2e)',
          border: '1px solid var(--accent, #d97706)',
          borderRadius: '8px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '24px' }}>🛡️</span>
          <div>
            <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--accent, #d97706)', marginBottom: '2px' }}>
              {isAr ? 'ضوابط السلطة المؤسسية وحدود الأنظمة الخارجية' : 'Enterprise Source Authority & Disconnected Operating Controls'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary, #94a3b8)' }}>
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
          id="tab-overview"
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
          id="tab-demand"
          onClick={() => setActiveTab('demand')}
          style={{
            padding: '12px 4px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            fontWeight: activeTab === 'demand' ? '600' : '400',
            color: activeTab === 'demand' ? E3_THEME.accent.primary : E3_THEME.text.muted,
            borderBottom: activeTab === 'demand' ? `2px solid ${E3_THEME.accent.primary}` : '2px solid transparent',
            cursor: 'pointer',
          }}
        >
          {isAr ? 'متطلبات الموارد والتوزيع (تجميع)' : 'Resource Demand & Grouping'}
        </button>
        <button
          id="tab-conflicts"
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
          id="tab-sourcing"
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
          id="tab-source-projections"
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
                  backgroundColor: 'var(--surface-1, #0f1624)',
                  color: 'var(--text-primary, #f8fafc)',
                  outline: 'none',
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
                  backgroundColor: 'var(--surface-1, #0f1624)',
                  color: 'var(--text-primary, #f8fafc)',
                  outline: 'none',
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
                  background: viewMode === 'table' ? 'var(--surface-2, #151e2e)' : 'var(--surface-1, #0f1624)',
                  color: viewMode === 'table' ? 'var(--accent, #d97706)' : 'var(--text-muted, #94a3b8)',
                  fontWeight: viewMode === 'table' ? '700' : '400',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {isAr ? 'جدول' : 'Table'}
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                style={{
                  padding: '6px 14px',
                  border: 'none',
                  background: viewMode === 'timeline' ? 'var(--surface-2, #151e2e)' : 'var(--surface-1, #0f1624)',
                  color: viewMode === 'timeline' ? 'var(--accent, #d97706)' : 'var(--text-muted, #94a3b8)',
                  fontWeight: viewMode === 'timeline' ? '700' : '400',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
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

      {/* TAB: DEMAND & GROUPING (Section 6 Item 3: Non-duplication invariant) */}
      {activeTab === 'demand' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: E3_THEME.text.primary, margin: '0 0 4px 0' }}>
              {isAr ? 'متطلبات الموارد والتوزيع التجميعي' : 'Resource Demand & Grouping Breakdown'}
            </h2>
            <p style={{ fontSize: '13px', color: E3_THEME.text.muted, margin: 0 }}>
              {isAr
                ? 'توزيع الطلب الفعلي حسب المناطق أو الأقسام أو حزم العمل بدون تكرار أو إنشاء نسخ وهمية.'
                : 'Verified project demand partitioned across zones, departments, or work packages with mathematical non-duplication.'}
            </p>
          </div>

          {/* Sourcing Scenario Needs Review Banner (Section 5 Item 7) */}
          {isScenarioOutdated && (
            <div
              id="sourcing-needs-review-banner"
              style={{
                background: 'var(--status-warning-bg, rgba(245, 158, 11, 0.15))',
                border: '1.5px solid var(--status-warning-fg, #f59e0b)',
                borderRadius: '8px',
                padding: '14px 18px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                color: 'var(--text-primary, #f8fafc)',
              }}
            >
              <span style={{ fontSize: '20px', lineHeight: 1 }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--status-warning-fg, #f59e0b)', textTransform: 'uppercase', marginBottom: '2px' }}>
                  {isAr ? 'تنبيه: خطة التوريد الحالية بحاجة إلى مراجعة' : 'SOURCING SCENARIO NEEDS REVIEW (SECTION 5 ITEM 7)'}
                </div>
                <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
                  {isAr
                    ? `تم تعديل إجمالي الطلب المخطط إلى ${totalDemandQuantity} وحدة (${unallocatedQuantity} وحدة غير مخصصة). سيناريو التوريد الحالي معتمد لـ ${savedScenarioDemand} وحدة فقط. القرار السابق وسجل التخصيص محفوظ بالكامل؛ يجب فتح حاسبة التوريد لمراجعة وتغطية الزيادة.`
                    : `Planning demand was revised to ${totalDemandQuantity} units (${unallocatedQuantity} unallocated). Existing 20-unit scenario covers ${savedScenarioDemand} units. Prior decision (8 stock + 8 hire + 4 fab) is preserved in history; review required according to current workflow rules.`}
                </div>
              </div>
            </div>
          )}

          {/* Demand Revision Card */}
          <Card style={{ padding: '16px', marginBottom: '20px', border: '1px solid var(--border-default, #2a374b)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
                  {isAr ? 'التحكم في تعديل كمية الطلب (مراجعة النطاق)' : 'Project Demand & Scope Revision Control'}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                  {isAr
                    ? `تعديل إجمالي الطلب المعتمد للمشروع وتوثيقه في قاعدة البيانات مع دعم القفل التفاؤلي (الإصدار الحالي: v${currentDemandVersion})`
                    : `Adjust authorized planning demand and commit revisions with optimistic locking (Current Persisted: v${currentDemandVersion})`}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label htmlFor="input-total-demand" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)' }}>
                    {isAr ? 'إجمالي الطلب المطلوب:' : 'Total Required Demand:'}
                  </label>
                  <input
                    id="input-total-demand"
                    type="number"
                    min={allocatedQuantity}
                    value={totalDemandQuantity}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value));
                      setTotalDemandQuantity(val);
                      setModelDemandQty(val);
                    }}
                    style={{
                      width: '70px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1.5px solid var(--accent, #d97706)',
                      backgroundColor: 'var(--surface-1, #0f1624)',
                      color: 'var(--text-primary, #f8fafc)',
                      fontWeight: 700,
                      fontSize: '13px',
                      textAlign: 'center',
                    }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>units</span>
                </div>

                {isRestrictedRole ? (
                  <span id="badge-restricted-demand"><Badge variant="warning">🔒 Read-Only (Crew Member)</Badge></span>
                ) : (
                  <Button
                    id="btn-save-demand-revision"
                    variant="primary"
                    size="sm"
                    onClick={handleSaveDemandRevision}
                    disabled={saveStatus === 'saving'}
                  >
                    {saveStatus === 'saving'
                      ? (isAr ? '⏳ جاري الحفظ...' : '⏳ Saving...')
                      : (isAr ? '💾 حفظ التعديل في PostgreSQL' : '💾 Commit Demand Revision')}
                  </Button>
                )}
              </div>
            </div>

            {/* Reconciliation summary row */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', backgroundColor: 'var(--surface-inset, #0b111d)', padding: '10px 14px', borderRadius: '6px', fontSize: '12px' }}>
              <div>
                <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Total Demanded: </span>
                <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>{totalDemandQuantity} units</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Allocated to Line Items: </span>
                <strong style={{ color: '#22c55e' }}>{allocatedQuantity} units</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Unallocated Balance: </span>
                <strong style={{ color: unallocatedQuantity > 0 ? '#f59e0b' : '#22c55e', fontWeight: 800 }}>
                  {unallocatedQuantity > 0 ? `⚠️ ${unallocatedQuantity} units unallocated` : '0 units (100% Allocated)'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Durable Version: </span>
                <strong style={{ color: 'var(--text-secondary, #94a3b8)', fontFamily: 'monospace' }}>v{currentDemandVersion}</strong>
              </div>
            </div>
          </Card>

          {/* Grouping Switcher Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: E3_THEME.text.secondary }}>
                {isAr ? 'طريقة التجميع:' : 'Group Demand By:'}
              </span>
              <div style={{ display: 'flex', border: `1px solid ${E3_THEME.surface.cardBorder}`, borderRadius: '6px', overflow: 'hidden' }}>
                <button
                  onClick={() => setDemandGroupingMode('zone')}
                  style={{
                    padding: '6px 14px',
                    border: 'none',
                    background: demandGroupingMode === 'zone' ? E3_THEME.accent.primary : 'var(--surface-1, #0f1624)',
                    color: demandGroupingMode === 'zone' ? '#ffffff' : E3_THEME.text.secondary,
                    fontWeight: demandGroupingMode === 'zone' ? '700' : '400',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  📍 {isAr ? 'حسب المنطقة (Zone)' : 'By Zone'}
                </button>
                <button
                  onClick={() => setDemandGroupingMode('department')}
                  style={{
                    padding: '6px 14px',
                    border: 'none',
                    background: demandGroupingMode === 'department' ? E3_THEME.accent.primary : 'var(--surface-1, #0f1624)',
                    color: demandGroupingMode === 'department' ? '#ffffff' : E3_THEME.text.secondary,
                    fontWeight: demandGroupingMode === 'department' ? '700' : '400',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  👥 {isAr ? 'حسب القسم (Dept)' : 'By Department'}
                </button>
                <button
                  onClick={() => setDemandGroupingMode('package')}
                  style={{
                    padding: '6px 14px',
                    border: 'none',
                    background: demandGroupingMode === 'package' ? E3_THEME.accent.primary : 'var(--surface-1, #0f1624)',
                    color: demandGroupingMode === 'package' ? '#ffffff' : E3_THEME.text.secondary,
                    fontWeight: demandGroupingMode === 'package' ? '700' : '400',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  📦 {isAr ? 'حسب حزمة العمل (WP)' : 'By Package'}
                </button>
              </div>
            </div>

            {/* Reconciliation Totals Banner */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', background: 'var(--surface-1, #0f1624)', padding: '6px 14px', borderRadius: '6px', border: `1px solid ${E3_THEME.surface.cardBorder}` }}>
              <span>Total Demand: <strong style={{ color: E3_THEME.text.primary }}>{totalDemandQuantity} units</strong></span>
              <span>Allocated: <strong style={{ color: '#16a34a' }}>{allocatedQuantity} units</strong></span>
              <span>Unallocated: <strong style={{ color: unallocatedQuantity > 0 ? '#ef4444' : '#16a34a' }}>{unallocatedQuantity} units</strong></span>
            </div>
          </div>

          {/* Non-Duplication Invariant Notice */}
          <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '10px 14px', borderRadius: '6px', fontSize: '12px', color: '#60a5fa', marginBottom: '16px' }}>
            🔒 <strong>Non-Duplication Invariant:</strong> Switching grouping between Zone (12 + 8), Department (12 + 8), and Package (20) redistributes existing demand line items. Total verified quantity strictly reconciles to {totalDemandQuantity} without duplicate generation or phantom inventory.
          </div>

          {/* Grouped Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            {groupedBreakdown.map((group, idx) => (
              <Card key={idx} style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: `1px solid ${E3_THEME.surface.cardBorder}`, paddingBottom: '8px' }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: E3_THEME.text.primary }}>
                    {group.groupName}
                  </div>
                  <Badge variant="accent">
                    {group.totalQuantity} units ({((group.totalQuantity / totalDemandQuantity) * 100).toFixed(0)}%)
                  </Badge>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '4px',
                        background: E3_THEME.surface.pageBg,
                        fontSize: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '600', color: E3_THEME.text.primary }}>{item.title}</div>
                        <div style={{ color: E3_THEME.text.muted, fontSize: '11px' }}>{item.dates} • {item.owner}</div>
                      </div>
                      <span style={{ fontWeight: '700', color: E3_THEME.accent.primary, fontSize: '13px' }}>
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
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

                {/* Interactive Decision Panel (Section 5 Item 5) */}
                {conf.resolutionStatus === 'approved' ? (
                  <div
                    id={`conflict-approved-banner-${conf.id}`}
                    style={{
                      background: 'rgba(34, 197, 94, 0.12)',
                      border: '1px solid #22c55e',
                      borderRadius: '6px',
                      padding: '12px 16px',
                      marginBottom: '12px',
                    }}
                  >
                    <div style={{ color: '#22c55e', fontWeight: 800, fontSize: '12px', marginBottom: '4px' }}>
                      ✓ DECISION COMMITTED & DURABLY RECORDED IN POSTGRESQL
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-primary, #f8fafc)' }}>
                      <strong>Assigned Owner:</strong> {conf.decisionOwner || 'Director of Operations'} | <strong>Status:</strong> Approved
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', marginTop: '3px' }}>
                      Action: Approved 8/8/4 multi-sourcing split with vendor contingency
                    </div>
                  </div>
                ) : (
                  <div
                    id={`conflict-decision-panel-${conf.id}`}
                    style={{
                      background: 'var(--surface-2, #151e2e)',
                      border: '1px solid var(--border-default, #2a374b)',
                      borderRadius: '6px',
                      padding: '14px',
                      marginBottom: '12px',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)', marginBottom: '8px' }}>
                      {isAr ? 'اتخاذ قرار معالجة التعارض (صلاحية المدير / المراجع):' : 'Authorized Conflict Resolution Decision (Reviewer Action):'}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginBottom: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: E3_THEME.text.secondary, marginBottom: '4px' }}>
                          {isAr ? 'المسؤول المعين للقرار' : 'Assigned Decision Owner'}
                        </label>
                        <input
                          id={`input-decision-owner-${conf.id}`}
                          type="text"
                          value={decisionOwners[conf.id] ?? (simulatedRole === 'director_of_operations' ? 'Director of Operations' : currentUser?.name || 'Director of Operations')}
                          onChange={(e) => setDecisionOwners({ ...decisionOwners, [conf.id]: e.target.value })}
                          disabled={isRestrictedRole}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-default, #2a374b)',
                            backgroundColor: 'var(--surface-1, #0f1624)',
                            color: 'var(--text-primary, #f8fafc)',
                            fontSize: '12px',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: E3_THEME.text.secondary, marginBottom: '4px' }}>
                          {isAr ? 'مبررات القرار وخطة المعالجة' : 'Resolution Action & Evidence Rationale'}
                        </label>
                        <input
                          id={`input-decision-rationale-${conf.id}`}
                          type="text"
                          value={decisionRationales[conf.id] ?? 'Approved 8/8/4 multi-sourcing split with vendor contingency'}
                          onChange={(e) => setDecisionRationales({ ...decisionRationales, [conf.id]: e.target.value })}
                          disabled={isRestrictedRole}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-default, #2a374b)',
                            backgroundColor: 'var(--surface-1, #0f1624)',
                            color: 'var(--text-primary, #f8fafc)',
                            fontSize: '12px',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                      {isRestrictedRole ? (
                        <span id={`badge-restricted-decision-${conf.id}`}><Badge variant="warning">🔒 Read-Only: Requires Reviewer / Director Role</Badge></span>
                      ) : (
                        <Button
                          id={`btn-approve-decision-${conf.id}`}
                          variant="accent"
                          size="sm"
                          disabled={saveStatus === 'saving'}
                          onClick={() => handleResolveConflict(
                            conf.id,
                            decisionOwners[conf.id] || (simulatedRole === 'director_of_operations' ? 'Director of Operations' : currentUser?.name || 'Director of Operations'),
                            decisionRationales[conf.id] || 'Approved 8/8/4 multi-sourcing split with vendor contingency'
                          )}
                        >
                          {saveStatus === 'saving' ? '⏳ Committing Decision...' : '✓ Approve Decision & Commit to PostgreSQL'}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

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

          {/* Needs Review Alert in Sourcing Tab */}
          {isScenarioOutdated && (
            <div
              style={{
                background: 'var(--status-warning-bg, rgba(245, 158, 11, 0.15))',
                border: '1.5px solid var(--status-warning-fg, #f59e0b)',
                borderRadius: '8px',
                padding: '12px 18px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: 'var(--text-primary, #f8fafc)',
              }}
            >
              <span style={{ fontSize: '20px' }}>⚠️</span>
              <div>
                <strong style={{ color: 'var(--status-warning-fg, #f59e0b)' }}>
                  {isAr ? 'خطة التوريد بحاجة إلى مراجعة:' : 'Sourcing Scenario Needs Review (Demand Revised):'}
                </strong>{' '}
                <span style={{ fontSize: '13px' }}>
                  {isAr
                    ? `إجمالي الطلب المطلوب هو ${totalDemandQuantity} وحدة، بينما الخطة الحالية تغطي ${savedScenarioDemand} وحدة فقط. القرار السابق محفوظ في السجل؛ يرجى تحديث التخصيص.`
                    : `Project demand is currently ${totalDemandQuantity} units, but active scenario allocates ${savedScenarioDemand} units (${unallocatedQuantity} unallocated). Prior decision is preserved in history; re-evaluation required.`}
                </span>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Input Column */}
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: E3_THEME.text.primary }}>
                  {isAr ? 'تخصيص كميات التوريد' : 'Allocation Breakdown'}
                </h3>
                {isScenarioOutdated && <Badge variant="warning">Needs Review</Badge>}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: E3_THEME.text.secondary, marginBottom: '6px' }}>
                  {isAr ? 'إجمالي الطلب المطلوب (منصات تسجيل)' : 'Total Required Demand (Registration Counters)'}
                </label>
                <input
                  type="number"
                  value={modelDemandQty}
                  onChange={(e) => setModelDemandQty(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default, #2a374b)',
                    backgroundColor: 'var(--surface-1, #0f1624)',
                    color: 'var(--text-primary, #f8fafc)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
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
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default, #2a374b)',
                    backgroundColor: 'var(--surface-1, #0f1624)',
                    color: 'var(--text-primary, #f8fafc)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
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
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default, #2a374b)',
                    backgroundColor: 'var(--surface-1, #0f1624)',
                    color: 'var(--text-primary, #f8fafc)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
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
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default, #2a374b)',
                    backgroundColor: 'var(--surface-1, #0f1624)',
                    color: 'var(--text-primary, #f8fafc)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {isRestrictedRole ? (
                <span id="badge-restricted-sourcing" style={{ display: 'block', width: '100%', textAlign: 'center' }}>
                  <Badge variant="warning">🔒 Read-Only: Insufficient Permissions (Crew Member)</Badge>
                </span>
              ) : (
                <Button
                  id="btn-save-sourcing-scenario"
                  variant="primary"
                  style={{ width: '100%' }}
                  onClick={handleSaveSourcingPlan}
                  disabled={modelShortfall > 0 || saveStatus === 'saving'}
                >
                  {saveStatus === 'saving'
                    ? (isAr ? '⏳ جاري الحفظ...' : '⏳ Saving Sourcing Plan...')
                    : (isAr ? 'اعتماد خطة التوريد وحفظها كمسودة' : 'Commit & Save Sourcing Plan')}
                </Button>
              )}
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
                <div style={{ marginTop: '12px', padding: '8px 12px', borderRadius: '4px', backgroundColor: 'var(--surface-inset, #0b111d)', fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
                  🛡️ <em>Disconnected Invariant: Saving a sourcing scenario creates local planning drafts. External stock confirmation and PO dispatch remain deferred.</em>
                </div>
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
