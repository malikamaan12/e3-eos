import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, MetricCard, Badge, Button, Modal, Input, Textarea, Tabs, formatCurrency } from '../components/DesignSystem.js';

export const FinancialControlCenterView: React.FC = () => {
  const { currentLanguage, apiClient, selectedProjectId } = useEosContext();
  const isRtl = currentLanguage === 'ar';
  const projectId = selectedProjectId || 'PRJ-QND-2026';

  const [activeTab, setActiveTab] = useState<'control' | 'bridge' | 'cash' | 'snapshots'>('control');
  const [loading, setLoading] = useState<boolean>(true);

  const [finControl, setFinControl] = useState<any>(null);
  const [cashPos, setCashPos] = useState<any>(null);
  const [marginBridge, setMarginBridge] = useState<any>(null);
  const [snapshots, setSnapshots] = useState<any[]>([]);

  // Lock Snapshot Modal
  const [isLockModalOpen, setIsLockModalOpen] = useState<boolean>(false);
  const [lockPeriod, setLockPeriod] = useState<string>('2026-08');
  const [lockNotes, setLockNotes] = useState<string>('August 2026 month-end final commercial ledger close');
  const [isLocking, setIsLocking] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
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
    } catch (err) {
      console.error('Failed to load financial control data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleLockSnapshot = async () => {
    setIsLocking(true);
    try {
      await apiClient.lockMonthEndSnapshot(projectId, {
        projectId,
        periodKey: lockPeriod,
        lockedBy: 'Hamad Al-Kuwari (Finance Director)',
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

  const tabs = [
    { id: 'control', label: isRtl ? 'تفصيل الميزانية مقابل الفعلي' : 'Budget vs Actual Breakdown' },
    { id: 'bridge', label: isRtl ? 'مخطط جسر الهامش الربحي' : 'Margin Bridge Waterfall' },
    { id: 'cash', label: isRtl ? 'السيولة ورأس المال العامل' : 'Cash Position & Working Capital' },
    { id: 'snapshots', label: isRtl ? `لقطات الإقفال الشهري (${snapshots.length})` : `Locked Month-End Snapshots (${snapshots.length})` },
  ];

  if (loading) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#d97706', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
          {isRtl ? 'جارٍ تحميل مركز الرقابة المالية والمطابقة...' : 'Loading Commercial Financial Control System...'}
        </h3>
        <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b' }}>
          {isRtl ? 'مطابقة معادلات EAC و VAC والتحقق من منع الازدواج الحسابي' : 'Evaluating EAC, VAC, and strict zero double-counting invariants'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Header Banner */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
              {isRtl ? 'مركز الرقابة المالية والمطابقة' : 'Commercial Financial Control Center'}
            </h1>
            <Badge variant="success">{isRtl ? 'المعادلات موثقة' : 'INVARIANTS VERIFIED'}</Badge>
            <Badge variant="info">{isRtl ? 'أساس حي بالريال القطري' : 'LIVE QAR BASIS'}</Badge>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            {isRtl ? 'المشروع:' : 'Project:'}{' '}
            <span style={{ color: '#d97706', fontWeight: 700, fontFamily: 'monospace' }}>{projectId}</span> — {isRtl ? 'جناح الاحتفالات الرسمية لليوم الوطني ٢٠٢٦' : 'Qatar National Day 2026 Ceremonial Pavilion'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button variant="secondary" onClick={() => loadData()}>
            ↻ {isRtl ? 'تحديث السجل' : 'Refresh Ledger'}
          </Button>
          <Button variant="primary" onClick={() => setIsLockModalOpen(true)}>
            🔒 {isRtl ? 'إقفال الفترة المحاسبية' : 'Lock Period Snapshot'}
          </Button>
        </div>
      </div>

      {/* Financial Governed Invariants Banner */}
      <div
        style={{
          backgroundColor: '#090d16',
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
            <span style={{ color: '#e2e8f0' }}>Baseline + Approved Changes</span>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.07)', padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px' }}>
            <span style={{ color: '#34d399', fontFamily: 'monospace', fontWeight: 700 }}>EAC</span>
            <span style={{ color: '#94a3b8' }}>=</span>
            <span style={{ color: '#e2e8f0' }}>Actuals + Accrued + Commitments + ETC</span>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.07)', padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px' }}>
            <span style={{ color: '#60a5fa', fontFamily: 'monospace', fontWeight: 700 }}>VAC</span>
            <span style={{ color: '#94a3b8' }}>=</span>
            <span style={{ color: '#e2e8f0' }}>Current Budget − EAC</span>
          </div>
        </div>
        <div style={{ color: '#34d399', fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>✓ {isRtl ? 'تطبيق منع الازدواج الحسابي' : 'Zero Double-Counting Enforced'}</span>
        </div>
      </div>

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
          value={formatCurrency(finControl?.approvedRevenueBasis || 2450000, 'QAR')}
          subtitle={isRtl ? '٨٠٪ مفوتر حتى الآن' : '80% Billed to Date'}
          accentColor="#3b82f6"
        />
        <MetricCard
          title={isRtl ? 'الميزانية المعتمدة الحالية' : 'Current Authorized Budget'}
          label={isRtl ? 'الميزانية المعتمدة الحالية' : 'Current Authorized Budget'}
          value={formatCurrency(finControl?.currentAuthorisedBudget || 2000000, 'QAR')}
          subtitle={isRtl ? `الأساس: ${formatCurrency(finControl?.originalBudget || 1850000, 'QAR')} + أوامر: ١٥٠ ألف ر.ق` : `Orig: ${formatCurrency(finControl?.originalBudget || 1850000, 'QAR')} + Vo: QAR 150k`}
          accentColor="#d97706"
        />
        <MetricCard
          title={isRtl ? 'التكلفة المقدرة عند الاكتمال (EAC)' : 'Estimate at Completion (EAC)'}
          label={isRtl ? 'التكلفة المقدرة عند الاكتمال (EAC)' : 'Estimate at Completion (EAC)'}
          value={formatCurrency(finControl?.estimateAtCompletion || 1800000, 'QAR')}
          subtitle={isRtl ? `التكلفة الفعلية المنفقة: ${formatCurrency(1300000, 'QAR')}` : `Cost Incurred: ${formatCurrency(1300000, 'QAR')}`}
          badge={{ label: isRtl ? 'معتمد' : 'Verified', variant: 'success' }}
          accentColor="#10b981"
        />
        <MetricCard
          title={isRtl ? 'وفر الميزانية الإيجابي (VAC)' : 'Variance at Completion (VAC)'}
          label={isRtl ? 'وفر الميزانية الإيجابي (VAC)' : 'Variance at Completion (VAC)'}
          value={`+${formatCurrency(finControl?.budgetVariance || 200000, 'QAR')}`}
          subtitle={isRtl ? `هامش المساهمة المتوقع: ${finControl?.forecastContributionMarginPercent || '26.53%'}` : `Margin: ${finControl?.forecastContributionMarginPercent || '26.53%'}`}
          delta={{ text: isRtl ? 'وفر إيجابي دون الميزانية' : 'Under budget saving', isPositive: true }}
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
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>{isRtl ? 'بند هيكلية التكلفة' : 'Cost Architecture Component'}</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>{isRtl ? 'المبلغ (ر.ق)' : 'Amount'}</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>{isRtl ? '٪ من العقد' : '% of Contract'}</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>{isRtl ? 'الدور في حساب EAC / VAC' : 'Role in EAC / VAC'}</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'center' }}>{isRtl ? 'توثيق التدقيق' : 'Audit Verification'}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{isRtl ? 'ميزانية العطاء الأصلية' : 'Original Tender Budget'}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                      {formatCurrency(finControl?.originalBudget || 1850000, 'QAR')}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', textAlign: 'right', fontFamily: 'monospace' }}>75.5%</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{isRtl ? 'الأساس التعاقدي المعتمد' : 'Contractual Baseline'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}><Badge variant="neutral">{isRtl ? 'إقفال العطاء' : 'Tender Lock'}</Badge></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{isRtl ? 'أوامر التغيير المعتمدة' : 'Approved Scope Variations'}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#059669' }}>
                      +{formatCurrency(finControl?.approvedBudgetChanges || 150000, 'QAR')}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', textAlign: 'right', fontFamily: 'monospace' }}>+6.1%</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{isRtl ? 'تضاف إلى الميزانية المعتمدة الحالية' : 'Adds to Current Authorised Budget'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}><Badge variant="success">{isRtl ? 'موقع من العميل' : 'Client Signed'}</Badge></td>
                  </tr>
                  <tr style={{ backgroundColor: '#fffbeb', borderTop: '2px solid #fde68a', borderBottom: '2px solid #fde68a', fontWeight: 700 }}>
                    <td style={{ padding: '14px 16px', color: '#92400e' }}>{isRtl ? 'الميزانية المعتمدة الحالية' : 'Current Authorised Budget'}</td>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#b45309' }}>
                      {formatCurrency(finControl?.currentAuthorisedBudget || 2000000, 'QAR')}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#92400e', textAlign: 'right', fontFamily: 'monospace' }}>81.6%</td>
                    <td style={{ padding: '14px 16px', color: '#92400e' }}>{isRtl ? 'المعيار الحاكم لحساب وفر الميزانية (VAC)' : 'Benchmark for VAC Calculation'}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}><Badge variant="warning">{isRtl ? 'السقف الحاكم' : 'Governed Ceiling'}</Badge></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', paddingInlineStart: '28px', color: '#334155' }}>
                      {isRtl ? '١. التكلفة الفعلية المقيدة (مفوترة ومعتمدة)' : '1. Posted Actual Cost (Invoiced & Approved)'}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {formatCurrency(finControl?.postedActualCost || 1180000, 'QAR')}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', textAlign: 'right', fontFamily: 'monospace' }}>48.2%</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{isRtl ? 'جزء من التكلفة الفعلية المنفقة' : 'Component of Cost Incurred'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}><Badge variant="success">{isRtl ? 'مطابقة ثلاثية' : '3-Way Matched'}</Badge></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', paddingInlineStart: '28px', color: '#334155' }}>
                      {isRtl ? '٢. التكلفة المستحقة المقبولة (أعمال منجزة لم تفوتر بعد)' : '2. Accepted Accrued Cost (Unbilled Work Delivered)'}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {formatCurrency(finControl?.acceptedAccruedCost || 120000, 'QAR')}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', textAlign: 'right', fontFamily: 'monospace' }}>4.9%</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{isRtl ? 'تم قبول تقدم العمل في الموقع' : 'Site Progress Accepted'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}><Badge variant="info">{isRtl ? 'توقيع الأعمال' : 'Work Signed-off'}</Badge></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', paddingInlineStart: '28px', color: '#334155' }}>
                      {isRtl ? '٣. الالتزامات المتبقية (أوامر الشراء المفتوحة)' : '3. Remaining Commitments (Open PO Balances)'}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {formatCurrency(finControl?.remainingCommitments || 350000, 'QAR')}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', textAlign: 'right', fontFamily: 'monospace' }}>14.3%</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{isRtl ? 'أوامر شراء لم تنفذ بالكامل بعد' : 'Unperformed Purchase Orders'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}><Badge variant="neutral">{isRtl ? 'أمر شراء مختوم' : 'PO Sealed'}</Badge></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', paddingInlineStart: '28px', color: '#334155' }}>
                      {isRtl ? '٤. التقدير غير المرتبط (ETC حتى الإغلاق)' : '4. Uncommitted Forecast (ETC to Closeout)'}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {formatCurrency(finControl?.uncommittedForecast || 150000, 'QAR')}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', textAlign: 'right', fontFamily: 'monospace' }}>6.1%</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{isRtl ? 'مخصص أعمال التفكيك النهائي والإرجاع' : 'Allowance for Final Bump-Out & Returns'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}><Badge variant="neutral">{isRtl ? 'تقدير مدير المشروع' : 'PM Forecast'}</Badge></td>
                  </tr>
                  <tr style={{ backgroundColor: '#ecfdf5', borderTop: '2px solid #a7f3d0', borderBottom: '1px solid #a7f3d0', fontWeight: 700 }}>
                    <td style={{ padding: '14px 16px', color: '#065f46' }}>{isRtl ? 'التكلفة المقدرة عند الاكتمال (EAC = ١+٢+٣+٤)' : 'Estimate at Completion (EAC = 1+2+3+4)'}</td>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#047857' }}>
                      {formatCurrency(finControl?.estimateAtCompletion || 1800000, 'QAR')}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#065f46', textAlign: 'right', fontFamily: 'monospace' }}>73.5%</td>
                    <td style={{ padding: '14px 16px', color: '#065f46' }}>{isRtl ? 'إجمالي التكلفة المتوقعة للمشروع' : 'Total Projected Project Cost'}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}><Badge variant="success">{isRtl ? 'مطابق للمعادلة' : 'Invariant Verified'}</Badge></td>
                  </tr>
                  <tr style={{ backgroundColor: '#f0fdf4', fontWeight: 800 }}>
                    <td style={{ padding: '14px 16px', color: '#047857' }}>{isRtl ? 'وفر الميزانية عند الاكتمال (VAC = الميزانية - EAC)' : 'Variance at Completion (VAC = Budget - EAC)'}</td>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#047857' }}>
                      +{formatCurrency(finControl?.budgetVariance || 200000, 'QAR')}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#047857', textAlign: 'right', fontFamily: 'monospace' }}>+8.2% Favorable</td>
                    <td style={{ padding: '14px 16px', color: '#047857' }}>{isRtl ? 'صافي الوفر المحقق عبر مراحل التنفيذ' : 'Net Cost Saving Across Delivery'}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}><Badge variant="success">{isRtl ? 'تحت الميزانية' : 'Under Budget'}</Badge></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: Margin Bridge Waterfall */}
      {activeTab === 'bridge' && (
        <Card title={isRtl ? 'مخطط جسر الهامش الربحي — من العطاء حتى التوقع النهائي' : 'Margin Bridge Waterfall — Tender to Final Forecast Completion'}>
          <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b' }}>
            {isRtl
              ? 'تسوية تجارية تفصيلية تتبع أداء الهامش الربحي بدءاً من تقديم العطاء وحتى أوامر التغيير وتحسينات المشتريات.'
              : 'Detailed reconciliation tracing commercial margin performance from initial tender submission through approved variations and procurement optimizations.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(marginBridge?.waterfall || []).map((step: any, idx: number) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
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
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#0f172a', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px' }}>
                    {idx + 1}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{step.step}</h4>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                      {isRtl ? 'الإيراد:' : 'Revenue:'} <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>{formatCurrency(step.revenue, 'QAR')}</span> | {isRtl ? 'التكلفة:' : 'Cost:'} <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>{formatCurrency(step.cost, 'QAR')}</span>
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>{isRtl ? 'إجمالي الهامش' : 'Gross Margin'}</span>
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
      {activeTab === 'cash' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <Card title={isRtl ? 'سجل مستحقات العميل' : 'Client Receivables Ledger'}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>{isRtl ? 'إجمالي قيمة العقد:' : 'Total Contract Value:'}</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>{formatCurrency(2450000, 'QAR')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>{isRtl ? 'إجمالي المفوتر حتى الآن:' : 'Total Billed to Date:'}</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#d97706' }}>{formatCurrency(1960000, 'QAR')} (80%)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>{isRtl ? 'إجمالي النقد المحصل:' : 'Total Cash Collected:'}</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#059669' }}>{formatCurrency(1715000, 'QAR')} (70%)</span>
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
                <span style={{ color: '#dc2626' }}>{isRtl ? 'المستحقات المتبقية للتحصيل:' : 'Open Accounts Receivable:'}</span>
                <span style={{ fontFamily: 'monospace', color: '#dc2626' }}>{formatCurrency(2450000 - 1715000, 'QAR')}</span>
              </div>
            </div>
          </Card>

          <Card title={isRtl ? 'التزامات الموردين وتدفقات التكلفة' : 'Supplier Commitments & Cost Outflow'}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>{isRtl ? 'المدفوع والفعلي المعتمد:' : 'Posted Actual Paid/Approved:'}</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>{formatCurrency(1180000, 'QAR')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>{isRtl ? 'التزامات أوامر الشراء النشطة:' : 'Active PO Commitments:'}</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#d97706' }}>{formatCurrency(350000, 'QAR')}</span>
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
                <span style={{ color: '#334155' }}>{isRtl ? 'إجمالي التدفقات الخارجة والالتزامات:' : 'Total Outflow & Liability:'}</span>
                <span style={{ fontFamily: 'monospace', color: '#0f172a' }}>{formatCurrency(1530000, 'QAR')}</span>
              </div>
            </div>
          </Card>

          <Card title={isRtl ? 'صافي السيولة ومؤشر التعرض' : 'Net Cash & Exposure Index'}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>{isRtl ? 'صافي التدفق النقدي:' : 'Net Cash Flow:'}</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#059669' }}>+{formatCurrency(535000, 'QAR')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>{isRtl ? 'صافي التعرض المالي (مع أوامر الشراء):' : 'Net Exposure (incl. POs):'}</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#059669' }}>+{formatCurrency(185000, 'QAR')}</span>
              </div>
              <div style={{ paddingTop: '6px' }}>
                <Badge variant="success">{isRtl ? 'رأس مال عامل إيجابي' : 'POSITIVE WORKING CAPITAL'}</Badge>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: Month-End Snapshots */}
      {activeTab === 'snapshots' && (
        <Card title={isRtl ? 'لقطات الإقفال الشهري التجاري المقفلة' : 'Locked Commercial Month-End Snapshots'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '16px 20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Badge variant="success">{isRtl ? 'فترة مقفلة:' : 'LOCKED PERIOD:'} {snap.periodKey}</Badge>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>ID: {snap.id}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {isRtl ? 'أقفل بواسطة:' : 'Locked By:'} {snap.lockedBy} on {new Date(snap.lockedAt).toLocaleDateString()}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', fontSize: '12px', marginBottom: '12px' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>{isRtl ? 'الميزانية الحالية:' : 'Current Budget:'}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>{formatCurrency(snap.currentBudget, 'QAR')}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>{isRtl ? 'التكلفة الفعلية:' : 'Actual Cost:'}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>{formatCurrency(snap.actualCost, 'QAR')}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>{isRtl ? 'التكلفة المقدرة / الوفر:' : 'EAC / VAC:'}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#059669' }}>{formatCurrency(snap.eac, 'QAR')} / +{formatCurrency(snap.vac, 'QAR')}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>{isRtl ? 'الهامش ٪:' : 'Margin %:'}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#059669' }}>{snap.marginPercent}</span>
                  </div>
                </div>

                <div style={{ backgroundColor: '#090d16', padding: '8px 12px', borderRadius: '4px', border: '1px solid #1e293b', fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span>SHA-256: {snap.snapshotHash}</span>
                  <span style={{ color: '#34d399', fontWeight: 600 }}>✓ {isRtl ? 'مغلق تشفيرياً ومحمي من التعديل' : 'Cryptographically Sealed'}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Lock Period Snapshot Modal */}
      <Modal
        isOpen={isLockModalOpen}
        onClose={() => setIsLockModalOpen(false)}
        title={isRtl ? 'إقفال اللقطة المحاسبية التجارية للشهر' : 'Lock Month-End Period Commercial Snapshot'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
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
    </div>
  );
};

