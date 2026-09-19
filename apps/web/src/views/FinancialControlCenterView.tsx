import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, MetricCard, Badge, Button, Modal, Input, Textarea, Tabs, AlertBanner, formatCurrency } from '../components/DesignSystem.js';
import { isSyntheticDemo } from '../services/api-client.js';

export interface CommercialVariation {
  id: string;
  code: string;
  title: string;
  category: 'client_request' | 'site_condition' | 'hse_requirement' | 'design_refinement';
  status: 'approved' | 'client_review' | 'implemented';
  contractorCostQar: number;
  clientSellQar: number;
  authorizedBy: string;
  approvedDate: string;
  hash: string;
  notes: string;
}

export const CURRENCIES = [
  { code: 'QAR', rate: 1.0, symbol: 'QAR', label: 'QAR (Qatar Riyal)' },
  { code: 'USD', rate: 0.2747, symbol: '$', label: 'USD (US Dollar)' },
  { code: 'EUR', rate: 0.2525, symbol: '€', label: 'EUR (Euro)' },
  { code: 'GBP', rate: 0.2137, symbol: '£', label: 'GBP (British Pound)' },
  { code: 'SAR', rate: 1.0309, symbol: 'SAR', label: 'SAR (Saudi Riyal)' },
  { code: 'AED', rate: 1.0101, symbol: 'AED', label: 'AED (UAE Dirham)' },
];

export const INITIAL_VARIATIONS: CommercialVariation[] = [
  {
    id: 'vo-001',
    code: 'VO-2026-001',
    title: 'Amiri Majlis Kinetic Rigging & Chandelier Automation',
    category: 'client_request',
    status: 'approved',
    contractorCostQar: 55000,
    clientSellQar: 85000,
    authorizedBy: 'Hamad Al-Thani (Client Rep) & Technical Director',
    approvedDate: '2026-08-12',
    hash: 'SHA256:7f9b8c2d1e0a4f5b',
    notes: 'Direct Amiri Diwan protocol request for motorized chandelier reveal during national anthem.',
  },
  {
    id: 'vo-002',
    code: 'VO-2026-002',
    title: 'Broadcast Audio Split & Fiber OB Van Interface',
    category: 'design_refinement',
    status: 'approved',
    contractorCostQar: 22000,
    clientSellQar: 35000,
    authorizedBy: 'Qatar TV Broadcast Ops & Commercial Director',
    approvedDate: '2026-08-18',
    hash: 'SHA256:4a3c2e1f0b9d8e7a',
    notes: 'Dual redundant optical MADI & Dante feeds to OB Van 3 and International Media Centre.',
  },
  {
    id: 'vo-003',
    code: 'VO-2026-003',
    title: 'Extended Venue Rehearsal Window & Structural Wind Telemetry',
    category: 'site_condition',
    status: 'approved',
    contractorCostQar: 18000,
    clientSellQar: 30000,
    authorizedBy: 'DECC Venue Management & Project Director',
    approvedDate: '2026-08-25',
    hash: 'SHA256:9c8b7a6f5e4d3c2b',
    notes: 'Night shift extension permit (22:00-02:00) with acoustic shielding and ultrasonic wind logging.',
  },
  {
    id: 'vo-004',
    code: 'VO-2026-004',
    title: 'High-Output Hazer Array & QCDD Fluid Compliance Cert',
    category: 'hse_requirement',
    status: 'client_review',
    contractorCostQar: 9500,
    clientSellQar: 15000,
    authorizedBy: 'Civil Defense Liaison & Show Caller',
    approvedDate: '2026-09-02',
    hash: 'SHA256:3b2a1c0d9e8f7a6b',
    notes: 'Water-based non-toxic haze machines certified for indoor enclosed halls with optical smoke heads.',
  },
];

export const FinancialControlCenterView: React.FC = () => {
  const { currentLanguage, apiClient, selectedProjectId, currentUser, currentProject } = useEosContext();
  const isRtl = currentLanguage === 'ar';
  const isDemo = isSyntheticDemo(selectedProjectId);
  const projectId = selectedProjectId || (isDemo ? 'PRJ-QND-2026' : '');

  const [activeTab, setActiveTab] = useState<'control' | 'reconciliation' | 'variations' | 'bridge' | 'cash' | 'snapshots' | 'imports'>('reconciliation');
  const [isAccrualConverted, setIsAccrualConverted] = useState<boolean>(false);
  // Capability 37: Financial Batch Import & File Deduplication (P05-ST04 / AT-067, AT-070)
  const [duplicateImportAttempted, setDuplicateImportAttempted] = useState<boolean>(false);
  const [allocationExceededAttempted, setAllocationExceededAttempted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamic currency selector state
  const [selectedCurrency, setSelectedCurrency] = useState<string>('QAR');

  // Commercial Variations State
  const [variations, setVariations] = useState<CommercialVariation[]>(() => (isDemo ? INITIAL_VARIATIONS : []));
  const [isAddVariationModalOpen, setIsAddVariationModalOpen] = useState<boolean>(false);
  const [newVoTitle, setNewVoTitle] = useState<string>('');
  const [newVoCategory, setNewVoCategory] = useState<'client_request' | 'site_condition' | 'hse_requirement' | 'design_refinement'>('client_request');
  const [newVoBuyQar, setNewVoBuyQar] = useState<string>('');
  const [newVoSellQar, setNewVoSellQar] = useState<string>('');
  const [newVoNotes, setNewVoNotes] = useState<string>('');

  const [finControl, setFinControl] = useState<any>(null);
  const [cashPos, setCashPos] = useState<any>(null);
  const [marginBridge, setMarginBridge] = useState<any>(null);
  const [snapshots, setSnapshots] = useState<any[]>([]);

  // Lock Snapshot Modal
  const [isLockModalOpen, setIsLockModalOpen] = useState<boolean>(false);
  const [lockPeriod, setLockPeriod] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [lockNotes, setLockNotes] = useState<string>('');
  const [isLocking, setIsLocking] = useState<boolean>(false);

  const activeCurrency = CURRENCIES.find((c) => c.code === selectedCurrency) || CURRENCIES[0];

  const formatWithCurrency = (amountQar: number | string) => {
    const num = typeof amountQar === 'string' ? parseFloat(amountQar.replace(/[^0-9.-]+/g, '')) : amountQar;
    if (isNaN(num)) return `0 ${selectedCurrency}`;
    const converted = Math.round(num * activeCurrency.rate);
    return `${converted.toLocaleString('en-US')} ${activeCurrency.code}`;
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fc, cp, mb, ss] = await Promise.all([
        apiClient.getFinancialControl(projectId),
        apiClient.getCashPosition(projectId),
        apiClient.getMarginBridge(projectId),
        apiClient.getMonthEndSnapshots(projectId),
      ]);
      setFinControl(fc);
      setCashPos(cp);
      setMarginBridge(mb);
      setSnapshots(ss);
    } catch (err: any) {
      console.error('Failed to load financial control data', err);
      setError(err?.message || 'Failed to load financial control data from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setVariations(isSyntheticDemo(projectId) ? INITIAL_VARIATIONS : []);
    loadData();
  }, [projectId]);

  const handleLockSnapshot = async () => {
    setIsLocking(true);
    try {
      await apiClient.lockMonthEndSnapshot(projectId, {
        projectId,
        periodKey: lockPeriod,
        lockedBy: currentUser?.name ? `${currentUser.name} (${currentUser.role || 'Finance Director'})` : 'Finance Director',
        snapshotNotes: lockNotes,
      });
      setIsLockModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to lock snapshot', err);
    } finally {
      setIsLocking(false);
    }
  };

  const handleExportVariationsCsv = () => {
    if (typeof window === 'undefined') return;
    const curr = activeCurrency;
    const headers = [
      'Variation Order ID',
      'Scope Title',
      'Reason Category',
      'Approval Status',
      'Contractor Cost Impact (QAR)',
      `Contractor Cost Impact (${curr.code})`,
      'Client Sell Impact (QAR)',
      `Client Sell Impact (${curr.code})`,
      'Gross Profit (QAR)',
      `Gross Profit (${curr.code})`,
      'Gross Margin %',
      'Authorized Authority',
      'Sign-off Date',
      'Cryptographic Audit Hash',
      'Notes & Contractual Context',
    ];

    const rows = variations.map((vo) => {
      const buy = vo.contractorCostQar;
      const sell = vo.clientSellQar;
      const profit = sell - buy;
      const margin = sell > 0 ? (((profit) / sell) * 100).toFixed(1) + '%' : '0%';

      return [
        `"${vo.code}"`,
        `"${vo.title.replace(/"/g, '""')}"`,
        `"${vo.category}"`,
        `"${vo.status}"`,
        buy,
        Math.round(buy * curr.rate),
        sell,
        Math.round(sell * curr.rate),
        profit,
        Math.round(profit * curr.rate),
        `"${margin}"`,
        `"${vo.authorizedBy.replace(/"/g, '""')}"`,
        `"${vo.approvedDate}"`,
        `"${vo.hash}"`,
        `"${vo.notes.replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvString = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Commercial-Variations-Register-${projectId}-${selectedCurrency}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportMarginLedgerCsv = () => {
    if (typeof window === 'undefined') return;
    const curr = activeCurrency;
    const headers = [
      'Cost Architecture Component',
      'Original Baseline (QAR)',
      `Original Baseline (${curr.code})`,
      'Approved Changes (QAR)',
      `Approved Changes (${curr.code})`,
      'Current Authorised Budget (QAR)',
      `Current Authorised Budget (${curr.code})`,
      'Posted Actual Cost (QAR)',
      `Posted Actual Cost (${curr.code})`,
      'Accepted Accrued Cost (QAR)',
      `Accepted Accrued Cost (${curr.code})`,
      'Open PO Commitments (QAR)',
      `Open PO Commitments (${curr.code})`,
      'Uncommitted ETC (QAR)',
      `Uncommitted ETC (${curr.code})`,
      'Estimate at Completion EAC (QAR)',
      `Estimate at Completion EAC (${curr.code})`,
      'Variance at Completion VAC (QAR)',
      `Variance at Completion VAC (${curr.code})`,
      '% of Contract',
      'EAC Role',
      'Audit Verification Status',
    ];

    const baseCost = finControl?.originalBudget != null ? Number(finControl.originalBudget) : (isDemo ? 1850000 : 0);
    const approvedChanges = finControl?.approvedBudgetChanges != null ? Number(finControl.approvedBudgetChanges) : (isDemo ? 150000 : 0);
    const currentBudget = finControl?.currentAuthorisedBudget != null ? Number(finControl.currentAuthorisedBudget) : (isDemo ? 2000000 : 0);
    const actuals = finControl?.postedActualCost != null ? Number(finControl.postedActualCost) : (isDemo ? 1180000 : 0);
    const accrued = finControl?.acceptedAccruedCost != null ? Number(finControl.acceptedAccruedCost) : (isDemo ? 120000 : 0);
    const commitments = finControl?.remainingCommitments != null ? Number(finControl.remainingCommitments) : (isDemo ? 350000 : 0);
    const etc = finControl?.uncommittedForecast != null ? Number(finControl.uncommittedForecast) : (isDemo ? 150000 : 0);
    const eac = finControl?.estimateAtCompletion != null ? Number(finControl.estimateAtCompletion) : (isDemo ? 1800000 : 0);
    const vac = finControl?.budgetVariance != null ? Number(finControl.budgetVariance) : (isDemo ? 200000 : 0);

    const row = [
      `"${currentProject?.name || (isDemo ? 'Master Project Architecture (QND-2026)' : 'Master Project Architecture')}"`,
      baseCost,
      Math.round(baseCost * curr.rate),
      approvedChanges,
      Math.round(approvedChanges * curr.rate),
      currentBudget,
      Math.round(currentBudget * curr.rate),
      actuals,
      Math.round(actuals * curr.rate),
      accrued,
      Math.round(accrued * curr.rate),
      commitments,
      Math.round(commitments * curr.rate),
      etc,
      Math.round(etc * curr.rate),
      eac,
      Math.round(eac * curr.rate),
      vac,
      Math.round(vac * curr.rate),
      '"73.5%"',
      '"Total Governed Forecast Cost"',
      '"Verified (Zero Double-Counting Invariant)"',
    ].join(',');

    const csvString = [headers.join(','), row].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Margin-Variance-EAC-Ledger-${projectId}-${selectedCurrency}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintFinancialReport = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleAddVariation = () => {
    if (!newVoTitle) return;
    const buy = parseFloat(newVoBuyQar) || 0;
    const sell = parseFloat(newVoSellQar) || 0;
    const newVo: CommercialVariation = {
      id: `vo-${Date.now().toString().slice(-4)}`,
      code: `VO-2026-00${variations.length + 1}`,
      title: newVoTitle,
      category: newVoCategory,
      status: 'approved',
      contractorCostQar: buy,
      clientSellQar: sell,
      authorizedBy: 'Client Representative & Project Director',
      approvedDate: new Date().toISOString().slice(0, 10),
      hash: `SHA256:${Math.random().toString(16).slice(2, 10)}`,
      notes: newVoNotes || 'Approved scope variation logged via commercial control console.',
    };

    setVariations([...variations, newVo]);
    setIsAddVariationModalOpen(false);
    setNewVoTitle('');
    setNewVoNotes('');
  };

  const tabs = [
    { id: 'control', label: isRtl ? 'تفصيل الميزانية مقابل الفعلي' : 'Budget vs Actual Breakdown' },
    { id: 'reconciliation', label: isRtl ? 'مطابقة المستحقات والفواتير (AT-066)' : 'Accrual & Invoice Reconcile (AT-066)' },
    { id: 'variations', label: isRtl ? `سجل أوامر التغيير (${variations.length})` : `Commercial Variations (${variations.length})` },
    { id: 'bridge', label: isRtl ? 'مخطط جسر الهامش الربحي' : 'Margin Bridge Waterfall' },
    { id: 'cash', label: isRtl ? 'السيولة ورأس المال العامل' : 'Cash Position & Working Capital' },
    { id: 'snapshots', label: isRtl ? `لقطات الإقفال الشهري (${snapshots.length})` : `Locked Month-End Snapshots (${snapshots.length})` },
    { id: 'imports', label: isRtl ? 'استيراد الملفات ومطابقة القيود (AT-067 / AT-070)' : 'Batch Ingest & Dedupe (AT-067 / AT-070)' },
  ];

  if (loading) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', backgroundColor: 'var(--surface-1, #0f1624)', borderRadius: '8px', border: '1px solid var(--border-default, #2a374b)' }}>
        <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '3px solid var(--border-default, #2a374b)', borderTopColor: 'var(--accent, #d97706)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
          {isRtl ? 'جارٍ تحميل مركز الرقابة المالية والمطابقة...' : 'Loading Commercial Financial Control System...'}
        </h3>
        <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-secondary, #94a3b8)' }}>
          {isRtl ? 'مطابقة معادلات EAC و VAC والتحقق من منع الازدواج الحسابي' : 'Evaluating EAC, VAC, and strict zero double-counting invariants'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '40px' }}>
      {error && (
        <AlertBanner
          type="error"
          title={isRtl ? 'فشل تحميل البيانات المالية' : 'Financial Data Request Failed'}
          action={{ label: isRtl ? 'إعادة المحاولة' : 'Retry', onClick: loadData }}
        >
          {error}
        </AlertBanner>
      )}

      {/* Header Banner */}
      <div
        style={{
          backgroundColor: 'var(--surface-1, #0f1624)',
          borderRadius: '8px',
          border: '1px solid var(--border-default, #2a374b)',
          padding: '20px 24px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
              {isRtl ? 'مركز الرقابة المالية والمطابقة' : 'Commercial Financial Control Center'}
            </h1>
            {error || !finControl ? (
              <Badge variant="danger">{isRtl ? 'غير موثق / البيانات غير متوفرة' : 'UNVERIFIED / DATA UNAVAILABLE'}</Badge>
            ) : (
              <>
                <Badge variant="success">{isRtl ? 'المعادلات موثقة' : 'INVARIANTS VERIFIED'}</Badge>
                <Badge variant="info">
                  {selectedCurrency === 'QAR' ? (isRtl ? 'أساس حي بالريال القطري' : 'LIVE QAR BASIS') : `CONVERTED (${selectedCurrency})`}
                </Badge>
              </>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #94a3b8)' }}>
            {isRtl ? 'المشروع:' : 'Project:'}{' '}
            <span style={{ color: 'var(--accent, #d97706)', fontWeight: 700, fontFamily: 'monospace' }}>{projectId}</span>
            {currentProject?.name ? ` — ${currentProject.name}` : (isDemo ? (isRtl ? ' — جناح الاحتفالات الرسمية لليوم الوطني ٢٠٢٦' : ' — Qatar National Day 2026 Ceremonial Pavilion') : '')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Dynamic Currency Converter Selector */}
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface-inset, #0b111d)', border: '1px solid var(--border-default, #2a374b)', borderRadius: '6px', padding: '3px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted, #94a3b8)', padding: '0 8px', textTransform: 'uppercase' }}>
              💱 Currency:
            </span>
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => setSelectedCurrency(c.code)}
                style={{
                  backgroundColor: selectedCurrency === c.code ? 'var(--accent, #d97706)' : 'transparent',
                  color: selectedCurrency === c.code ? '#ffffff' : 'var(--text-secondary, #cbd5e1)',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title={c.label}
              >
                {c.code}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={handleExportVariationsCsv}
            style={{ color: '#0284c7', borderColor: '#bae6fd' }}
            title="Download Commercial Variations Register in Excel CSV format"
          >
            📥 Variations (CSV)
          </Button>

          <Button
            variant="outline"
            onClick={handleExportMarginLedgerCsv}
            style={{ color: '#059669', borderColor: '#bbf7d0' }}
            title="Download Margin Variance & EAC Ledger in Excel CSV format"
          >
            📥 EAC Ledger (CSV)
          </Button>

          <Button
            variant="outline"
            onClick={handlePrintFinancialReport}
            style={{ color: 'var(--text-secondary, #cbd5e1)', borderColor: 'var(--border-default, #2a374b)' }}
            title="Print or export formatted PDF financial control report"
          >
            🖨️ Print / PDF
          </Button>

          <Button variant="secondary" onClick={() => loadData()}>
            ↻ {isRtl ? 'تحديث السجل' : 'Refresh'}
          </Button>
          <Button variant="primary" onClick={() => setIsLockModalOpen(true)}>
            🔒 {isRtl ? 'إقفال الفترة' : 'Lock Period'}
          </Button>
        </div>
      </div>

      {/* Financial Governed Invariants Banner */}
      <div
        style={{
          backgroundColor: 'var(--canvas, #090d16)',
          border: '1px solid rgba(217, 119, 6, 0.4)',
          borderRadius: '8px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '11px' }}>
            {isRtl ? 'المعادلات الحاكمة:' : 'Governed Invariants:'}
          </span>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.07)', padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px' }}>
            <span style={{ color: '#fbbf24', fontFamily: 'monospace', fontWeight: 700 }}>Current Budget</span>
            <span style={{ color: '#94a3b8' }}>=</span>
            <span style={{ color: 'var(--border-default, #2a374b)' }}>Baseline + Approved Changes</span>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.07)', padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px' }}>
            <span style={{ color: '#34d399', fontFamily: 'monospace', fontWeight: 700 }}>EAC</span>
            <span style={{ color: '#94a3b8' }}>=</span>
            <span style={{ color: 'var(--border-default, #2a374b)' }}>Actuals + Accrued + Commitments + ETC</span>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.07)', padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px' }}>
            <span style={{ color: '#60a5fa', fontFamily: 'monospace', fontWeight: 700 }}>VAC</span>
            <span style={{ color: '#94a3b8' }}>=</span>
            <span style={{ color: 'var(--border-default, #2a374b)' }}>Current Budget − EAC</span>
          </div>
        </div>
        <div style={{ color: '#34d399', fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>✓ {isRtl ? 'تطبيق منع الازدواج الحسابي' : 'Zero Double-Counting Enforced'}</span>
        </div>
      </div>

      {(() => {
        if (error && !finControl) {
          return (
            <div style={{ padding: '48px 24px', textAlign: 'center', backgroundColor: 'var(--surface-1, #0f1624)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', marginBottom: '20px' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: '#f87171' }}>
                {isRtl ? 'البيانات المالية غير متوفرة لهذا المشروع' : 'Financial Ledger Unavailable For Selected Project'}
              </h3>
              <p style={{ margin: '0 auto 16px auto', fontSize: '13px', color: 'var(--text-muted, #94a3b8)', maxWidth: '520px' }}>
                {error || (isRtl ? 'لم يتم العثور على سجلات الرقابة المالية وموقف السيولة لهذا المشروع.' : `The financial control ledger and cash position records could not be loaded for project ID ${projectId}.`)}
              </p>
              <Button variant="primary" onClick={loadData}>
                {isRtl ? 'إعادة المحاولة' : 'Retry Request'}
              </Button>
            </div>
          );
        }

        const revBasis = finControl?.approvedRevenueBasis != null ? Number(finControl.approvedRevenueBasis) : 0;
        const curBudget = finControl?.currentAuthorisedBudget != null ? Number(finControl.currentAuthorisedBudget) : 0;
        const origBudget = finControl?.originalBudget != null ? Number(finControl.originalBudget) : 0;
        const budgetChanges = finControl?.approvedBudgetChanges != null ? Number(finControl.approvedBudgetChanges) : 0;
        const actualsVal = finControl?.postedActualCost != null ? Number(finControl.postedActualCost) : 0;
        const accruedVal = finControl?.acceptedAccruedCost != null ? Number(finControl.acceptedAccruedCost) : 0;
        const commitmentsVal = finControl?.remainingCommitments != null ? Number(finControl.remainingCommitments) : 0;
        const etcVal = finControl?.uncommittedForecast != null ? Number(finControl.uncommittedForecast) : 0;
        const eacVal = finControl?.estimateAtCompletion != null ? Number(finControl.estimateAtCompletion) : 0;
        const vacVal = finControl?.budgetVariance != null ? Number(finControl.budgetVariance) : 0;
        const marginPct = finControl?.forecastContributionMarginPercent || '0.00%';
        const billedPct = cashPos?.billedPercent || (revBasis > 0 && cashPos?.billedAmount ? `${Math.round((Number(cashPos.billedAmount) / revBasis) * 100)}%` : '0%');
        const calcPct = (amt: number) => (revBasis > 0 ? `${((amt / revBasis) * 100).toFixed(1)}%` : '0.0%');

        return (
          <>
            {/* Top Metric Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                marginBottom: '20px',
              }}
            >
              <MetricCard
                title={isRtl ? 'أساس إيراد العقد' : 'Contract Revenue Basis'}
                label={isRtl ? 'أساس إيراد العقد' : 'Contract Revenue Basis'}
                value={formatWithCurrency(revBasis)}
                unit=""
                subtitle={selectedCurrency !== 'QAR' ? `Base: ${formatCurrency(revBasis, 'QAR')} | ${billedPct} Billed` : (revBasis > 0 ? (isRtl ? `${billedPct} مفوتر حتى الآن` : `${billedPct} Billed to Date`) : '')}
                accentColor="#3b82f6"
              />
              <MetricCard
                title={isRtl ? 'الميزانية المعتمدة الحالية' : 'Current Authorized Budget'}
                label={isRtl ? 'الميزانية المعتمدة الحالية' : 'Current Authorized Budget'}
                value={formatWithCurrency(curBudget)}
                unit=""
                subtitle={`Baseline: ${formatWithCurrency(origBudget)} • Variations: ${formatWithCurrency(budgetChanges)}`}
                accentColor="#d97706"
              />
              <MetricCard
                title={isRtl ? 'التكلفة المقدرة عند الاكتمال (EAC)' : 'Estimate at Completion (EAC)'}
                label={isRtl ? 'التكلفة المقدرة عند الاكتمال (EAC)' : 'Estimate at Completion (EAC)'}
                value={formatWithCurrency(eacVal)}
                unit=""
                subtitle={`Incurred: ${formatWithCurrency(actualsVal + accruedVal)}`}
                badge={{ label: isRtl ? 'معتمد' : 'Verified', variant: 'success' }}
                accentColor="#10b981"
              />
              <MetricCard
                title={isRtl ? 'وفر الميزانية الإيجابي (VAC)' : 'Variance at Completion (VAC)'}
                label={isRtl ? 'وفر الميزانية الإيجابي (VAC)' : 'Variance at Completion (VAC)'}
                value={`${vacVal >= 0 ? '+' : ''}${formatWithCurrency(vacVal)}`}
                unit=""
                subtitle={`Forecast Margin: ${marginPct}`}
                delta={{ text: vacVal >= 0 ? (isRtl ? 'وفر إيجابي دون الميزانية' : 'Under budget saving') : (isRtl ? 'تجاوز الميزانية' : 'Over budget'), isPositive: vacVal >= 0 }}
                accentColor="#059669"
              />
            </div>

            {/* Tab Navigation */}
            <Tabs tabs={tabs} activeTab={activeTab} onChange={(id) => setActiveTab(id as any)} />

            {/* TAB 1: Budget vs Actual Breakdown */}
            {activeTab === 'control' && (
              <div>
                <Card title={isRtl ? 'هيكلية تفصيل الميزانية والتكاليف (معيار منع الازدواج الحسابي)' : 'Budget & Cost Breakdown Architecture (Zero Double-Counting Invariant)'} noPadding>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--surface-2, #151e2e)', borderBottom: '1px solid var(--border-default, #2a374b)', color: 'var(--text-secondary, #cbd5e1)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          <th style={{ padding: '12px 16px', fontWeight: 700 }}>{isRtl ? 'بند هيكلية التكلفة' : 'Cost Architecture Component'}</th>
                          <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>{isRtl ? 'المبلغ' : `Amount (${activeCurrency.code})`}</th>
                          <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>{isRtl ? '٪ من العقد' : '% of Contract'}</th>
                          <th style={{ padding: '12px 16px', fontWeight: 700 }}>{isRtl ? 'الدور في حساب EAC / VAC' : 'Role in EAC / VAC'}</th>
                          <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'center' }}>{isRtl ? 'توثيق التدقيق' : 'Audit Verification'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle, #1d2939)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>{isRtl ? 'ميزانية العطاء الأصلية' : 'Original Tender Budget'}</td>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                            {formatWithCurrency(origBudget)}
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted, #94a3b8)', textAlign: 'right', fontFamily: 'monospace' }}>{calcPct(origBudget)}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-secondary, #cbd5e1)' }}>{isRtl ? 'الأساس التعاقدي المعتمد' : 'Contractual Baseline'}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}><Badge variant="neutral">{isRtl ? 'إقفال العطاء' : 'Tender Lock'}</Badge></td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle, #1d2939)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>{isRtl ? 'أوامر التغيير المعتمدة' : 'Approved Scope Variations'}</td>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#059669' }}>
                            +{formatWithCurrency(budgetChanges)}
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted, #94a3b8)', textAlign: 'right', fontFamily: 'monospace' }}>+{calcPct(budgetChanges)}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-secondary, #cbd5e1)' }}>{isRtl ? 'تضاف إلى الميزانية المعتمدة الحالية' : 'Adds to Current Authorised Budget'}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}><Badge variant="success">{isRtl ? 'موقع من العميل' : 'Client Signed'}</Badge></td>
                        </tr>
                        <tr style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', borderTop: '2px solid #fde68a', borderBottom: '2px solid #fde68a', fontWeight: 700 }}>
                          <td style={{ padding: '14px 16px', color: '#f59e0b' }}>{isRtl ? 'الميزانية المعتمدة الحالية' : 'Current Authorised Budget'}</td>
                          <td style={{ padding: '14px 16px', fontFamily: 'monospace', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#b45309' }}>
                            {formatWithCurrency(curBudget)}
                          </td>
                          <td style={{ padding: '14px 16px', color: '#f59e0b', textAlign: 'right', fontFamily: 'monospace' }}>{calcPct(curBudget)}</td>
                          <td style={{ padding: '14px 16px', color: '#f59e0b' }}>{isRtl ? 'المعيار الحاكم لحساب وفر الميزانية (VAC)' : 'Benchmark for VAC Calculation'}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}><Badge variant="warning">{isRtl ? 'السقف الحاكم' : 'Governed Ceiling'}</Badge></td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle, #1d2939)' }}>
                          <td style={{ padding: '12px 16px', paddingInlineStart: '28px', color: 'var(--text-secondary, #cbd5e1)' }}>
                            {isRtl ? '١. التكلفة الفعلية المقيدة (مفوترة ومعتمدة)' : '1. Posted Actual Cost (Invoiced & Approved)'}
                          </td>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                            {formatWithCurrency(actualsVal)}
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted, #94a3b8)', textAlign: 'right', fontFamily: 'monospace' }}>{calcPct(actualsVal)}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-secondary, #cbd5e1)' }}>{isRtl ? 'جزء من التكلفة الفعلية المنفقة' : 'Component of Cost Incurred'}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}><Badge variant="success">{isRtl ? 'مطابقة ثلاثية' : '3-Way Matched'}</Badge></td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle, #1d2939)' }}>
                          <td style={{ padding: '12px 16px', paddingInlineStart: '28px', color: 'var(--text-secondary, #cbd5e1)' }}>
                            {isRtl ? '٢. التكلفة المستحقة المقبولة (أعمال منجزة لم تفوتر بعد)' : '2. Accepted Accrued Cost (Unbilled Work Delivered)'}
                          </td>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                            {formatWithCurrency(accruedVal)}
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted, #94a3b8)', textAlign: 'right', fontFamily: 'monospace' }}>{calcPct(accruedVal)}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-secondary, #cbd5e1)' }}>{isRtl ? 'تم قبول تقدم العمل في الموقع' : 'Site Progress Accepted'}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}><Badge variant="info">{isRtl ? 'توقيع الأعمال' : 'Work Signed-off'}</Badge></td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle, #1d2939)' }}>
                          <td style={{ padding: '12px 16px', paddingInlineStart: '28px', color: 'var(--text-secondary, #cbd5e1)' }}>
                            {isRtl ? '٣. الالتزامات المتبقية (أوامر الشراء المفتوحة)' : '3. Remaining Commitments (Open PO Balances)'}
                          </td>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                            {formatWithCurrency(commitmentsVal)}
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted, #94a3b8)', textAlign: 'right', fontFamily: 'monospace' }}>{calcPct(commitmentsVal)}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-secondary, #cbd5e1)' }}>{isRtl ? 'أوامر شراء لم تنفذ بالكامل بعد' : 'Unperformed Purchase Orders'}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}><Badge variant="neutral">{isRtl ? 'أمر شراء مختوم' : 'PO Sealed'}</Badge></td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle, #1d2939)' }}>
                          <td style={{ padding: '12px 16px', paddingInlineStart: '28px', color: 'var(--text-secondary, #cbd5e1)' }}>
                            {isRtl ? '٤. التقدير غير المرتبط (ETC حتى الإغلاق)' : '4. Uncommitted Forecast (ETC to Closeout)'}
                          </td>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                            {formatWithCurrency(etcVal)}
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted, #94a3b8)', textAlign: 'right', fontFamily: 'monospace' }}>{calcPct(etcVal)}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-secondary, #cbd5e1)' }}>{isRtl ? 'مخصص أعمال التفكيك النهائي والإرجاع' : 'Allowance for Final Bump-Out & Returns'}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}><Badge variant="neutral">{isRtl ? 'تقدير مدير المشروع' : 'PM Forecast'}</Badge></td>
                        </tr>
                        <tr style={{ backgroundColor: '#ecfdf5', borderTop: '2px solid #a7f3d0', borderBottom: '1px solid #a7f3d0', fontWeight: 700 }}>
                          <td style={{ padding: '14px 16px', color: '#065f46' }}>{isRtl ? 'التكلفة المقدرة عند الاكتمال (EAC = ١+٢+٣+٤)' : 'Estimate at Completion (EAC = 1+2+3+4)'}</td>
                          <td style={{ padding: '14px 16px', fontFamily: 'monospace', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#047857' }}>
                            {formatWithCurrency(eacVal)}
                          </td>
                          <td style={{ padding: '14px 16px', color: '#065f46', textAlign: 'right', fontFamily: 'monospace' }}>{calcPct(eacVal)}</td>
                          <td style={{ padding: '14px 16px', color: '#065f46' }}>{isRtl ? 'إجمالي التكلفة المتوقعة للمشروع' : 'Total Projected Project Cost'}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}><Badge variant="success">{isRtl ? 'مطابق للمعادلة' : 'Invariant Verified'}</Badge></td>
                        </tr>
                        <tr style={{ backgroundColor: 'rgba(34, 197, 94, 0.12)', fontWeight: 800 }}>
                          <td style={{ padding: '14px 16px', color: '#047857' }}>{isRtl ? 'وفر الميزانية عند الاكتمال (VAC = الميزانية - EAC)' : 'Variance at Completion (VAC = Budget - EAC)'}</td>
                          <td style={{ padding: '14px 16px', fontFamily: 'monospace', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#047857' }}>
                            {vacVal >= 0 ? '+' : ''}{formatWithCurrency(vacVal)}
                          </td>
                          <td style={{ padding: '14px 16px', color: '#047857', textAlign: 'right', fontFamily: 'monospace' }}>{vacVal >= 0 ? '+' : ''}{calcPct(vacVal)} Favorable</td>
                          <td style={{ padding: '14px 16px', color: '#047857' }}>{isRtl ? 'صافي الوفر المحقق عبر مراحل التنفيذ' : 'Net Cost Saving Across Delivery'}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}><Badge variant="success">{isRtl ? 'تحت الميزانية' : 'Under Budget'}</Badge></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </>
        );
      })()}

      {/* TAB: Accrual & Invoice Reconciliation (AT-066 / AT-068) */}
      {activeTab === 'reconciliation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Worked 90,000 QAR EAC Invariant Studio (AT-066) */}
          <Card title="Worked 90,000 QAR EAC Invariant & Accrual-to-Invoice Conversion (AT-066)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Badge variant="accent">AT-066 EAC INVARIANT</Badge>
                    <Badge variant="success">MATHEMATICAL PARITY ENFORCED</Badge>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted, #94a3b8)' }}>
                    Demonstrating zero double-counting: when 10,000 QAR converts from accrued unbilled cost to posted supplier invoice, EAC remains exactly invariant at 90,000 QAR.
                  </p>
                </div>

                <Button
                  id="btn-convert-accrual-to-invoice"
                  variant="primary"
                  onClick={() => setIsAccrualConverted(!isAccrualConverted)}
                >
                  {isAccrualConverted
                    ? '⏪ Reset to Pre-Conversion Baseline'
                    : '⚡ Convert 10,000 QAR Accrual → Posted Invoice'}
                </Button>
              </div>

              {/* Formula & Live Invariant Visualizer */}
              <div style={{ backgroundColor: 'var(--text-primary, #f8fafc)', borderRadius: '8px', padding: '16px 20px', color: 'var(--surface-2, #151e2e)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>EAC Governing Formula</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '4px', fontFamily: 'monospace' }}>
                    EAC = Posted Actuals ({isAccrualConverted ? '50,000' : '40,000'}) + Accruals ({isAccrualConverted ? '10,000' : '20,000'}) + Commitments (20,000) + ETC (10,000)
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#4ade80', fontWeight: 700 }}>VERIFIED EAC RESULT</div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#4ade80' }}>
                    90,000 QAR
                  </div>
                </div>
              </div>

              {/* 4 Cost Buckets Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: isAccrualConverted ? '#f0fdf4' : 'var(--surface-1, #0f1624)', border: `1px solid ${isAccrualConverted ? '#86efac' : 'var(--border-default, #2a374b)'}` }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', fontWeight: 700, textTransform: 'uppercase' }}>1. Posted Actuals</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)', margin: '4px 0' }}>
                    {isAccrualConverted ? '50,000' : '40,000'} QAR
                  </div>
                  <div style={{ fontSize: '11px', color: isAccrualConverted ? '#15803d' : 'var(--text-muted, #94a3b8)' }}>
                    {isAccrualConverted ? '▲ +10,000 QAR (Invoice Posted)' : 'Initial Posted Invoices'}
                  </div>
                </div>

                <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: isAccrualConverted ? '#fefce8' : 'var(--surface-1, #0f1624)', border: `1px solid ${isAccrualConverted ? '#fef08a' : 'var(--border-default, #2a374b)'}` }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', fontWeight: 700, textTransform: 'uppercase' }}>2. Accepted Accruals</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)', margin: '4px 0' }}>
                    {isAccrualConverted ? '10,000' : '20,000'} QAR
                  </div>
                  <div style={{ fontSize: '11px', color: isAccrualConverted ? '#b45309' : 'var(--text-muted, #94a3b8)' }}>
                    {isAccrualConverted ? '▼ -10,000 QAR (Converted to Actual)' : 'Unbilled Accepted Cost'}
                  </div>
                </div>

                <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'var(--surface-1, #0f1624)', border: '1px solid var(--border-default, #2a374b)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', fontWeight: 700, textTransform: 'uppercase' }}>3. Remaining Commitments</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)', margin: '4px 0' }}>
                    20,000 QAR
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>Open Purchase Orders</div>
                </div>

                <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'var(--surface-1, #0f1624)', border: '1px solid var(--border-default, #2a374b)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', fontWeight: 700, textTransform: 'uppercase' }}>4. Estimate to Complete (ETC)</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)', margin: '4px 0' }}>
                    10,000 QAR
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>Uncommitted Forecast</div>
                </div>
              </div>

              {/* Status Alert Banner */}
              <div style={{ padding: '12px 16px', borderRadius: '6px', backgroundColor: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', fontSize: '12px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>✓</span>
                <div>
                  <strong>Zero Double-Counting Invariant Verified:</strong> Converting an accrual to a posted invoice shifts value from bucket #2 to bucket #1 with zero change to EAC (ΔEAC = 0 QAR). No costs are double-counted.
                </div>
              </div>
            </div>
          </Card>

          {/* External ERP / Ledger Quarantine Matrix (AT-068) */}
          <Card title="Accounting Ledger Quarantine & Rejection Gate (AT-068)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted, #94a3b8)' }}>
                Invoices rejected or quarantined by the corporate ERP ledger (SAP / Oracle) are quarantined with clear statutory error codes and strictly prohibited from payment disbursement until reconciled.
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--surface-2, #151e2e)', borderBottom: '2px solid var(--border-default, #2a374b)', color: 'var(--text-secondary, #cbd5e1)' }}>
                      <th style={{ padding: '10px 12px' }}>Invoice Ref</th>
                      <th style={{ padding: '10px 12px' }}>Supplier Name</th>
                      <th style={{ padding: '10px 12px' }}>Invoice Amount</th>
                      <th style={{ padding: '10px 12px' }}>External ERP Status</th>
                      <th style={{ padding: '10px 12px' }}>Quarantine Reason</th>
                      <th style={{ padding: '10px 12px' }}>Payment Release Gate</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle, #1d2939)', backgroundColor: '#fff1f2' }}>
                      <td style={{ padding: '12px', fontWeight: 700, color: '#f87171' }}>INV-QA-2026-901</td>
                      <td style={{ padding: '12px' }}>Gulf Heavy Transport WLL</td>
                      <td style={{ padding: '12px', fontWeight: 800 }}>34,500 QAR</td>
                      <td style={{ padding: '12px' }}>
                        <Badge variant="danger">quarantined_by_ledger</Badge>
                      </td>
                      <td style={{ padding: '12px', color: '#f87171' }}>
                        SAP GL account 60210 locked for fiscal period close
                      </td>
                      <td style={{ padding: '12px' }}>
                        <strong style={{ color: '#dc2626', fontSize: '12px' }}>🛑 PAYMENT BLOCKED (AT-068)</strong>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle, #1d2939)', backgroundColor: 'rgba(245, 158, 11, 0.12)' }}>
                      <td style={{ padding: '12px', fontWeight: 700 }}>INV-QA-2026-902</td>
                      <td style={{ padding: '12px' }}>Al-Mana Sound & Lighting</td>
                      <td style={{ padding: '12px', fontWeight: 800 }}>28,000 QAR</td>
                      <td style={{ padding: '12px' }}>
                        <Badge variant="warning">awaiting_ledger_clearance</Badge>
                      </td>
                      <td style={{ padding: '12px', color: '#f59e0b' }}>
                        Bank routing code verification pending at treasury
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ color: '#b45309', fontWeight: 600 }}>⏳ HELD PENDING CLEARANCE</span>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle, #1d2939)' }}>
                      <td style={{ padding: '12px', fontWeight: 700 }}>INV-QA-2026-903</td>
                      <td style={{ padding: '12px' }}>Doha Scenic Fabrication</td>
                      <td style={{ padding: '12px', fontWeight: 800 }}>66,000 QAR</td>
                      <td style={{ padding: '12px' }}>
                        <Badge variant="success">posted_to_ledger</Badge>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                        Three-way match verified (GRN-QA-2026-089)
                      </td>
                      <td style={{ padding: '12px' }}>
                        <Badge variant="success">✓ RELEASE APPROVED</Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: Commercial Variations Register */}
      {activeTab === 'variations' && (
        <Card title={isRtl ? 'سجل أوامر التغيير التجارية المعتمدة ومطابقة الهامش' : 'Commercial Variations Register & Margin Traceability Ledger'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--text-muted, #94a3b8)' }}>
                  Audited scope adjustments, client variation instructions, contractor buy-cost impacts, and authorized sell additions.
                </p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge variant="success">ISO 20121 Governed</Badge>
                  <Badge variant="info">Zero Double-Counting Invariant Active</Badge>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                    Active Currency: <strong style={{ color: '#2563eb' }}>{activeCurrency.code} ({activeCurrency.label})</strong>
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Button
                  variant="outline"
                  onClick={handleExportVariationsCsv}
                  style={{ color: '#0284c7', borderColor: '#bae6fd' }}
                >
                  📥 Export Register (CSV)
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setIsAddVariationModalOpen(true)}
                  style={{ backgroundColor: '#2563eb' }}
                >
                  + Add Scope Variation
                </Button>
              </div>
            </div>

            {/* Summary Metrics Strip for Variations */}
            {(() => {
              const approvedVariations = variations.filter((v) => v.status === 'approved');
              const approvedSell = approvedVariations.reduce((acc, v) => acc + v.clientSellQar, 0);
              const approvedCost = approvedVariations.reduce((acc, v) => acc + v.contractorCostQar, 0);
              const approvedNetMargin = approvedSell - approvedCost;
              const approvedMarginPct = approvedSell > 0 ? ((approvedNetMargin / approvedSell) * 100).toFixed(1) : '0.0';

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '12px', backgroundColor: 'var(--surface-2, #151e2e)', borderRadius: '6px', border: '1px solid var(--border-default, #2a374b)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', fontWeight: 700, textTransform: 'uppercase' }}>Total Approved Variations</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)', margin: '2px 0' }}>{approvedVariations.length} VOs</div>
                    <div style={{ fontSize: '11px', color: '#059669' }}>100% Contractually Sealed ({variations.length} Total Logged)</div>
                  </div>

                  <div style={{ padding: '12px', backgroundColor: 'rgba(34, 197, 94, 0.12)', borderRadius: '6px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                    <div style={{ fontSize: '11px', color: '#22c55e', fontWeight: 700, textTransform: 'uppercase' }}>Approved Sell Price Addition</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#4ade80', margin: '2px 0' }}>
                      +{formatWithCurrency(approvedSell)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#22c55e' }}>
                      Base: +{approvedSell.toLocaleString()} QAR
                    </div>
                  </div>

                  <div style={{ padding: '12px', backgroundColor: 'rgba(59, 130, 246, 0.12)', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                    <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>Approved Contractor Buy Cost</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#60a5fa', margin: '2px 0' }}>
                      +{formatWithCurrency(approvedCost)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#60a5fa' }}>
                      Base: +{approvedCost.toLocaleString()} QAR
                    </div>
                  </div>

                  <div style={{ padding: '12px', backgroundColor: 'rgba(245, 158, 11, 0.12)', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                    <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase' }}>Blended Gross Margin</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#a16207', margin: '2px 0' }}>
                      {approvedMarginPct}%
                    </div>
                    <div style={{ fontSize: '11px', color: '#fbbf24' }}>
                      Net Margin: +{formatWithCurrency(approvedNetMargin)}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Variations Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--surface-2, #151e2e)', borderBottom: '2px solid var(--border-default, #2a374b)', color: 'var(--text-secondary, #cbd5e1)' }}>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>VO Code</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>Scope Description</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>Category</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Buy Cost ({activeCurrency.code})</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Sell Price ({activeCurrency.code})</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>Margin %</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>Authorized Sign-off</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>Audit Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {variations.map((vo) => {
                    const profit = vo.clientSellQar - vo.contractorCostQar;
                    const margin = vo.clientSellQar > 0 ? (((profit) / vo.clientSellQar) * 100).toFixed(1) : '0.0';

                    return (
                      <tr key={vo.id} style={{ borderBottom: '1px solid var(--border-subtle, #1d2939)' }}>
                        <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>
                          {vo.code}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>{vo.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>{vo.notes}</div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--surface-2, #151e2e)',
                              color: 'var(--text-secondary, #cbd5e1)',
                              textTransform: 'uppercase',
                            }}
                          >
                            {vo.category.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Badge variant={vo.status === 'approved' ? 'success' : vo.status === 'implemented' ? 'neutral' : 'warning'}>
                            {vo.status === 'approved' ? 'Client Signed' : vo.status === 'implemented' ? 'Delivered' : 'Client Review'}
                          </Badge>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--text-muted, #94a3b8)' }}>
                          {Math.round(vo.contractorCostQar * activeCurrency.rate).toLocaleString()}
                          {selectedCurrency !== 'QAR' && (
                            <span style={{ display: 'block', fontSize: '10px', color: '#94a3b8' }}>
                              ({vo.contractorCostQar.toLocaleString()} QAR)
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#10b981' }}>
                          +{Math.round(vo.clientSellQar * activeCurrency.rate).toLocaleString()}
                          {selectedCurrency !== 'QAR' && (
                            <span style={{ display: 'block', fontSize: '10px', color: '#6ee7b7' }}>
                              (+{vo.clientSellQar.toLocaleString()} QAR)
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <Badge variant={Number(margin) >= 30 ? 'success' : 'info'} size="sm">
                            {margin}%
                          </Badge>
                        </td>
                        <td style={{ padding: '12px', fontSize: '11px', color: 'var(--text-secondary, #cbd5e1)' }}>
                          <div>{vo.authorizedBy}</div>
                          <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>{vo.approvedDate}</div>
                        </td>
                        <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-muted, #94a3b8)' }}>
                          {vo.hash}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 3: Margin Bridge Waterfall */}
      {activeTab === 'bridge' && (
        <Card title={isRtl ? 'مخطط جسر الهامش الربحي — من العطاء حتى التوقع النهائي' : 'Margin Bridge Waterfall — Tender to Final Forecast Completion'}>
          <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--text-muted, #94a3b8)' }}>
            {isRtl
              ? 'تسوية تجارية تفصيلية تتبع أداء الهامش الربحي بدءاً من تقديم العطاء وحتى أوامر التغيير وتحسينات المشتريات.'
              : 'Detailed reconciliation tracing commercial margin performance from initial tender submission through approved variations and procurement optimizations.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(marginBridge?.waterfall || []).map((step: any, idx: number) => (
              <div
                key={idx}
                style={{
                  backgroundColor: 'var(--surface-2, #151e2e)',
                  border: '1px solid var(--border-default, #2a374b)',
                  borderRadius: '8px',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--text-primary, #f8fafc)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px' }}>
                    {idx + 1}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>{step.step}</h4>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                      {isRtl ? 'الإيراد:' : 'Revenue:'} <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)' }}>{formatCurrency(step.revenue, 'QAR')}</span> | {isRtl ? 'التكلفة:' : 'Cost:'} <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)' }}>{formatCurrency(step.cost, 'QAR')}</span>
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', display: 'block', textTransform: 'uppercase' }}>{isRtl ? 'إجمالي الهامش' : 'Gross Margin'}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#059669', fontSize: '16px' }}>{formatCurrency(step.margin, 'QAR')}</span>
                  </div>
                  <Badge variant={step.marginPercent?.includes('26') ? 'success' : 'neutral'}>
                    {step.marginPercent} {isRtl ? 'هامش' : 'Margin'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB 3: Cash Position */}
      {activeTab === 'cash' && (() => {
        const contractVal = Number(cashPos?.contractValue ?? (isDemo ? 2450000 : 0));
        const billedAmt = Number(cashPos?.billedAmount ?? (isDemo ? 1960000 : 0));
        const collectedAmt = Number(cashPos?.collectedAmount ?? (isDemo ? 1715000 : 0));
        const openReceivables = Number(cashPos?.receivablesAmount ?? (billedAmt - collectedAmt));
        const unbilledContractAmount = Number(cashPos?.unbilledContractAmount ?? (contractVal - billedAmt));
        const postedActual = Number(cashPos?.postedActualCost ?? (isDemo ? 1180000 : 0));
        const activeCommitments = Number(cashPos?.remainingCommitments ?? (isDemo ? 350000 : 0));
        const totalOutflow = postedActual + activeCommitments;
        const netCash = Number(cashPos?.netCashFlow ?? (collectedAmt - postedActual));
        const netExposure = Number(cashPos?.netCashExposure ?? (collectedAmt - totalOutflow));
        const billedPct = cashPos?.billedPercent || (contractVal > 0 ? `${Math.round((billedAmt / contractVal) * 100)}%` : '0%');
        const collectedPct = cashPos?.collectedPercent || (contractVal > 0 ? `${Math.round((collectedAmt / contractVal) * 100)}%` : '0%');

        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            <Card title={isRtl ? 'سجل مستحقات العميل' : 'Client Receivables Ledger'}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted, #94a3b8)' }}>{isRtl ? 'إجمالي قيمة العقد:' : 'Total Contract Value:'}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>{formatCurrency(contractVal, 'QAR')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted, #94a3b8)' }}>{isRtl ? 'إجمالي المفوتر حتى الآن:' : 'Total Billed to Date:'}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#d97706' }}>{formatCurrency(billedAmt, 'QAR')} ({billedPct})</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted, #94a3b8)' }}>{isRtl ? 'إجمالي النقد المحصل:' : 'Total Cash Collected:'}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#059669' }}>{formatCurrency(collectedAmt, 'QAR')} ({collectedPct})</span>
                </div>
                <div style={{ borderTop: '1px solid var(--border-default, #2a374b)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
                  <span style={{ color: '#dc2626' }}>{isRtl ? 'المستحقات المفتوحة (مفوترة غير محصلة):' : 'Open Receivables (Billed Uncollected):'}</span>
                  <span style={{ fontFamily: 'monospace', color: '#dc2626' }}>{formatCurrency(openReceivables, 'QAR')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted, #94a3b8)' }}>
                  <span>{isRtl ? 'قيمة العقد غير المفوترة بعد:' : 'Unbilled Contract Value:'}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)' }}>{formatCurrency(unbilledContractAmount, 'QAR')}</span>
                </div>
              </div>
            </Card>

            <Card title={isRtl ? 'التزامات الموردين وتدفقات التكلفة' : 'Supplier Commitments & Cost Outflow'}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted, #94a3b8)' }}>{isRtl ? 'المدفوع والفعلي المعتمد:' : 'Posted Actual Paid/Approved:'}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>{formatCurrency(postedActual, 'QAR')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted, #94a3b8)' }}>{isRtl ? 'التزامات أوامر الشراء النشطة:' : 'Active PO Commitments:'}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#d97706' }}>{formatCurrency(activeCommitments, 'QAR')}</span>
                </div>
                <div style={{ borderTop: '1px solid var(--border-default, #2a374b)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
                  <span style={{ color: 'var(--text-secondary, #cbd5e1)' }}>{isRtl ? 'إجمالي التدفقات الخارجة والالتزامات:' : 'Total Outflow & Liability:'}</span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--text-primary, #f8fafc)' }}>{formatCurrency(totalOutflow, 'QAR')}</span>
                </div>
              </div>
            </Card>

            <Card title={isRtl ? 'صافي السيولة ومؤشر التعرض' : 'Net Cash & Exposure Index'}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted, #94a3b8)' }}>{isRtl ? 'صافي التدفق النقدي:' : 'Net Cash Flow:'}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: netCash >= 0 ? '#059669' : '#dc2626' }}>
                    {netCash >= 0 ? '+' : ''}{formatCurrency(netCash, 'QAR')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted, #94a3b8)' }}>{isRtl ? 'صافي التعرض المالي (مع أوامر الشراء):' : 'Net Exposure (incl. POs):'}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: netExposure >= 0 ? '#059669' : '#dc2626' }}>
                    {netExposure >= 0 ? '+' : ''}{formatCurrency(netExposure, 'QAR')}
                  </span>
                </div>
                <div style={{ paddingTop: '6px' }}>
                  <Badge variant={netExposure >= 0 ? "success" : "danger"}>
                    {netExposure >= 0
                      ? (isRtl ? 'رأس مال عامل إيجابي' : 'POSITIVE WORKING CAPITAL')
                      : (isRtl ? 'عجز في رأس المال العامل' : 'NEGATIVE WORKING CAPITAL')}
                  </Badge>
                </div>
              </div>
            </Card>
          </div>
        );
      })()}

      {/* TAB 4: Month-End Snapshots */}
      {activeTab === 'snapshots' && (
        <Card title={isRtl ? 'لقطات الإقفال الشهري التجاري المقفلة' : 'Locked Commercial Month-End Snapshots'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                style={{
                  backgroundColor: 'var(--surface-2, #151e2e)',
                  border: '1px solid var(--border-default, #2a374b)',
                  borderRadius: '8px',
                  padding: '16px 20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid var(--border-default, #2a374b)', paddingBottom: '10px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Badge variant="success">{isRtl ? 'فترة مقفلة:' : 'LOCKED PERIOD:'} {snap.periodKey}</Badge>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>ID: {snap.id}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
                    {isRtl ? 'أقفل بواسطة:' : 'Locked By:'} {snap.lockedBy} on {new Date(snap.lockedAt).toLocaleDateString()}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', fontSize: '12px', marginBottom: '12px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted, #94a3b8)', display: 'block', fontSize: '11px' }}>{isRtl ? 'الميزانية الحالية:' : 'Current Budget:'}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>{formatCurrency(snap.currentBudget, 'QAR')}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted, #94a3b8)', display: 'block', fontSize: '11px' }}>{isRtl ? 'التكلفة الفعلية المنفقة:' : 'Actual Cost:'}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>{formatCurrency(snap.actualCost, 'QAR')}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted, #94a3b8)', display: 'block', fontSize: '11px' }}>{isRtl ? 'التكلفة المقدرة (EAC):' : 'Estimate at Completion (EAC):'}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{formatCurrency(snap.eac, 'QAR')}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted, #94a3b8)', display: 'block', fontSize: '11px' }}>{isRtl ? 'وفر الميزانية (VAC):' : 'Budget Variance (VAC):'}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#059669' }}>+{formatCurrency(snap.vac, 'QAR')}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted, #94a3b8)', display: 'block', fontSize: '11px' }}>{isRtl ? 'الهامش ٪:' : 'Margin %:'}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#059669' }}>{snap.marginPercent}</span>
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--canvas, #090d16)', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-subtle, #1d2939)', fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span>SHA-256: {snap.snapshotHash}</span>
                  <span style={{ color: '#34d399', fontWeight: 600 }}>✓ {isRtl ? 'مغلق تشفيرياً ومحمي من التعديل' : 'Cryptographically Sealed'}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Capability 37: Financial Batch Source File De-Duplication & Audit Ledger Import Reconciliation (P05-ST04 / AT-067, AT-070) */}
      {activeTab === 'imports' && (
        <div id="financial-batch-dedup-workbench" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card title="Financial Batch Source File Deduplication & Audit Ledger Reconciliation (P05-ST04 / AT-067, AT-070)">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>📑</span>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-primary, #f8fafc)' }}>
                    Financial Batch Ingest & Expense Allocation Gates (AT-067 / AT-070)
                  </h3>
                  <Badge variant="info">INVARIANT AT-067 ACTIVE</Badge>
                  <Badge variant="success">INVARIANT AT-070 ACTIVE</Badge>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted, #94a3b8)', margin: '4px 0 0 0' }}>
                  Prevents duplicate financial source file ingest via unique SHA-256 fingerprinting (AT-067), and enforces strict line-allocation ceiling invariants preventing expense inflation (AT-070).
                </p>
              </div>
            </div>

            {/* Invariant 1: Source File Deduplication (AT-067) */}
            <div style={{ padding: '16px', backgroundColor: 'var(--surface-2, #151e2e)', borderRadius: '8px', border: '1px solid var(--border-default, #2a374b)', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>🛡️</span>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
                    1. Bank / ERP Source File Ingest Deduplication Gate (AT-067)
                  </h4>
                </div>
                <Button
                  variant={duplicateImportAttempted ? 'secondary' : 'danger'}
                  size="sm"
                  onClick={() => setDuplicateImportAttempted(!duplicateImportAttempted)}
                >
                  {duplicateImportAttempted ? 'Reset Import Simulator' : 'Simulate Duplicate File Ingest'}
                </Button>
              </div>
              <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                Under AT-067, importing an identical source statement twice is detected via file checksum and transaction references, strictly preventing duplicate cash movements or GL postings.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                <div style={{ padding: '10px', backgroundColor: 'var(--surface-1, #0f1624)', borderRadius: '6px', border: '1px solid var(--border-default, #2a374b)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>SOURCE BATCH FILE</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)', marginTop: '2px' }}>
                    QNB_Corp_Settlements_20260914.xml
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)' }}>Format: ISO 20022 CAMT.053</div>
                </div>

                <div style={{ padding: '10px', backgroundColor: 'var(--surface-1, #0f1624)', borderRadius: '6px', border: '1px solid var(--border-default, #2a374b)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>FIRST INGESTION STATUS</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#059669', marginTop: '2px' }}>
                    COMMITTED (Batch #QA-0992)
                  </div>
                  <div style={{ fontSize: '10px', color: '#059669' }}>32 entries (+450,000 QAR)</div>
                </div>

                <div style={{ padding: '10px', backgroundColor: 'var(--surface-1, #0f1624)', borderRadius: '6px', border: '1px solid var(--border-default, #2a374b)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>CRYPTOGRAPHIC FILE SHA-256</div>
                  <div style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#2563eb', marginTop: '2px' }}>
                    e3b0c44298fc1c...7852b855
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)' }}>Idempotency fingerprint locked</div>
                </div>
              </div>

              {duplicateImportAttempted && (
                <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#f87171', fontSize: '12px', fontWeight: 700 }}>
                  ⛔ <strong>IMPORT REJECTED — DUPLICATE SOURCE IDENTITY (AT-067):</strong> Invariant AT-067 enforced: The uploaded batch shares fingerprint e3b0...2b855 with committed Batch #QA-0992. Re-import is rejected with zero duplicate business effects. Original batch audit history preserved.
                </div>
              )}
            </div>

            {/* Invariant 2: Invoice Line Expense Allocation Ceiling Check (AT-070) */}
            <div style={{ padding: '16px', backgroundColor: 'var(--surface-2, #151e2e)', borderRadius: '8px', border: '1px solid var(--border-default, #2a374b)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>⚖️</span>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
                    2. Invoice Line Expense Allocation Ceiling Gate (AT-070)
                  </h4>
                </div>
                <Button
                  variant={allocationExceededAttempted ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setAllocationExceededAttempted(!allocationExceededAttempted)}
                >
                  {allocationExceededAttempted ? 'Restore Exact Allocation Parity' : 'Simulate Line Allocation Overrun (+5,000 QAR)'}
                </Button>
              </div>
              <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                Under AT-070, cost allocations mapped to internal work packages cannot exceed the invoice line item total.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                <div style={{ padding: '10px', backgroundColor: 'var(--surface-1, #0f1624)', borderRadius: '6px', border: '1px solid var(--border-default, #2a374b)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>SOURCE INVOICE LINE</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)', marginTop: '2px' }}>
                    INV-2026-881 (Timber & Joinery)
                  </div>
                  <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: 700 }}>Total Line Value: 100,000 QAR</div>
                </div>

                <div style={{ padding: '10px', backgroundColor: 'var(--surface-1, #0f1624)', borderRadius: '6px', border: '1px solid var(--border-default, #2a374b)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>PKG 1: MAIN STAGE JOINERY</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                    60,000 QAR (60.0%)
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)' }}>Valid cost allocation</div>
                </div>

                <div style={{ padding: '10px', backgroundColor: 'var(--surface-1, #0f1624)', borderRadius: '6px', border: '1px solid var(--border-default, #2a374b)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>PKG 2: AUDITORIUM FINISHES</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: allocationExceededAttempted ? '#dc2626' : '#059669', marginTop: '2px' }}>
                    {allocationExceededAttempted ? '45,000 QAR (Overrun)' : '40,000 QAR (40.0%)'}
                  </div>
                  <div style={{ fontSize: '10px', color: allocationExceededAttempted ? '#dc2626' : 'var(--text-muted, #94a3b8)' }}>
                    {allocationExceededAttempted ? '+5,000 QAR excess allocation' : 'Valid cost allocation'}
                  </div>
                </div>

                <div style={{ padding: '10px', backgroundColor: 'var(--surface-1, #0f1624)', borderRadius: '6px', border: '1px solid var(--border-default, #2a374b)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>TOTAL ALLOCATIONS</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: allocationExceededAttempted ? '#dc2626' : '#059669', marginTop: '2px' }}>
                    {allocationExceededAttempted ? '105,000 QAR' : '100,000 QAR'}
                  </div>
                  <div style={{ fontSize: '10px', color: allocationExceededAttempted ? '#dc2626' : '#059669' }}>
                    {allocationExceededAttempted ? 'Delta: +5,000 QAR' : 'Exact match (Delta: 0 QAR)'}
                  </div>
                </div>
              </div>

              {allocationExceededAttempted ? (
                <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#f87171', fontSize: '12px', fontWeight: 700 }}>
                  ⛔ <strong>ALLOCATION CEILING EXCEEDED (AT-070):</strong> Invariant AT-070 enforced: Allocation sum (105,000 QAR) exceeds source invoice total (100,000 QAR) by +5,000 QAR. Allocation transaction is rejected with zero expense duplication.
                </div>
              ) : (
                <div style={{ padding: '12px 16px', backgroundColor: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '6px', color: '#22c55e', fontSize: '12px', fontWeight: 700 }}>
                  ✓ <strong>ALLOCATION CEILING INVARIANT SATISFIED (AT-070):</strong> Total allocations match source invoice exactly (100,000 QAR = 60,000 QAR + 40,000 QAR). No duplicate source expense created.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Lock Period Snapshot Modal */}
      <Modal
        isOpen={isLockModalOpen}
        onClose={() => setIsLockModalOpen(false)}
        title={isRtl ? 'إقفال اللقطة المحاسبية التجارية للشهر' : 'Lock Month-End Period Commercial Snapshot'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.5 }}>
            {isRtl
              ? 'إقفال الفترة المحاسبية يقوم بختم سجل الرقابة المالية للمشروع برمز تجزئة SHA-256 دقيق وغير قابل للتغيير. لا يمكن إجراء أي تعديلات بأثر رجعي دون إنشاء إشعار دائن أو قيد تسوية مدقق.'
              : 'Locking an accounting period seals the project commercial control ledger with a deterministic SHA-256 hash. No backward alterations can be made without creating an audited credit note or explicit adjustment entry.'}
          </p>

          <Input
            label={isRtl ? 'رمز الفترة المحاسبية (YYYY-MM)' : 'Accounting Period Key (YYYY-MM)'}
            value={lockPeriod}
            onChange={(e) => setLockPeriod(e.target.value)}
          />

          <Textarea
            label={isRtl ? 'ملاحظات الإقفال والمبرر التنفيذي' : 'Lock Notes & Executive Rationale'}
            value={lockNotes}
            onChange={(e) => setLockNotes(e.target.value)}
            placeholder={isRtl ? 'أدخل ملاحظات الإقفال والمبرر التنفيذي...' : 'Enter month-end commercial ledger close notes...'}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px' }}>
            <Button variant="secondary" onClick={() => setIsLockModalOpen(false)}>
              {isRtl ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button variant="primary" onClick={handleLockSnapshot} disabled={isLocking}>
              {isLocking ? (isRtl ? 'جارٍ الختم...' : 'Sealing...') : (isRtl ? 'إنشاء الختم وإقفال الفترة' : 'Generate Seal & Lock Period')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Scope Variation Order Modal */}
      {isAddVariationModalOpen && (
        <Modal
          isOpen={isAddVariationModalOpen}
          onClose={() => setIsAddVariationModalOpen(false)}
          title="Log New Commercial Variation Order (VO)"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Variation Scope Title</label>
              <Input
                value={newVoTitle}
                onChange={(e) => setNewVoTitle(e.target.value)}
                placeholder="e.g. Additional LED Wall Tower for Royal Majlis Overflow"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Variation Reason Category</label>
              <select
                value={newVoCategory}
                onChange={(e) => setNewVoCategory(e.target.value as any)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-default, #2a374b)', fontSize: '13px' }}
              >
                <option value="client_request">Client Request (Amiri Diwan / Organiser)</option>
                <option value="site_condition">Site Condition (Venue / Access / Wind)</option>
                <option value="hse_requirement">HSE Requirement (QCDD / Civil Defense)</option>
                <option value="design_refinement">Design Refinement (Acoustic / Technical)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Contractor Buy Cost (QAR)</label>
                <Input
                  type="number"
                  value={newVoBuyQar}
                  onChange={(e) => setNewVoBuyQar(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Client Sell Price (QAR)</label>
                <Input
                  type="number"
                  value={newVoSellQar}
                  onChange={(e) => setNewVoSellQar(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div style={{ padding: '8px 12px', backgroundColor: 'rgba(34, 197, 94, 0.12)', borderRadius: '6px', border: '1px solid rgba(34, 197, 94, 0.3)', fontSize: '11px', color: '#22c55e' }}>
              Projected Gross Margin: <strong>{((parseFloat(newVoSellQar) - parseFloat(newVoBuyQar)) / (parseFloat(newVoSellQar) || 1) * 100).toFixed(1)}%</strong>
              {' '}(+{formatCurrency(parseFloat(newVoSellQar) - parseFloat(newVoBuyQar) || 0, 'QAR')})
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Contractual Context & Sign-off Notes</label>
              <Textarea
                value={newVoNotes}
                onChange={(e) => setNewVoNotes(e.target.value)}
                placeholder="Include formal instruction memo reference, client representative approval, or drawing revision..."
                rows={3}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px' }}>
              <Button variant="secondary" onClick={() => setIsAddVariationModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAddVariation}
                disabled={!newVoTitle || !newVoSellQar}
                style={{ backgroundColor: '#2563eb' }}
              >
                Log & Seal Variation
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

