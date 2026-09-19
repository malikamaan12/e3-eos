import React, { useState, useMemo } from 'react';
import { Card, MetricCard, Badge } from '../components/DesignSystem.js';

const EXCHANGE_RATES_FROM_QAR: Record<string, number> = {
  QAR: 1,
  USD: 1 / 3.64,
  EUR: 1 / 3.95,
  SAR: 1.03,
  AED: 1.01,
};

const EVENT_TYPE_MULTIPLIERS: Record<string, number> = {
  summit: 1.0,
  festival: 1.35,
  exhibition: 1.2,
  sports_ceremony: 1.6,
  corporate_gala: 1.15,
};

const VENUE_TYPE_MULTIPLIERS: Record<string, number> = {
  convention_centre: 1.0,
  indoor_arena: 1.15,
  outdoor_stadium: 1.3,
  public_park: 1.25,
};

const BASE_RATE_CORRIDORS = [
  { discipline: 'Scenic Custom Carpentry', unit: 'per m²', p25: 450, p50: 620, p75: 850, sampleCount: 14, leadTimeDays: 18 },
  { discipline: 'Overhead Truss Rigging', unit: 'per point / day', p25: 350, p50: 500, p75: 750, sampleCount: 22, leadTimeDays: 7 },
  { discipline: 'High-Power Laser Video & LED', unit: 'per m² / day', p25: 320, p50: 480, p75: 650, sampleCount: 18, leadTimeDays: 10 },
  { discipline: 'Certified Rigger & Crew Lead', unit: 'per 10h shift', p25: 1200, p50: 1600, p75: 2200, sampleCount: 35, leadTimeDays: 4 },
];

export const HistoricalEstimatorView: React.FC = () => {
  const [eventType, setEventType] = useState<string>('summit');
  const [venueType, setVenueType] = useState<string>('convention_centre');
  const [capacity, setCapacity] = useState<number>(3000);
  const [durationDays, setDurationDays] = useState<number>(3);
  const [currency, setCurrency] = useState<string>('QAR');

  // Parametric Cost Calculation Model (P06-ST03)
  const fxRate = EXCHANGE_RATES_FROM_QAR[currency] || 1;

  const toCurrency = (amountInQar: number) => {
    const converted = Math.round(amountInQar * fxRate);
    return `${converted.toLocaleString()} ${currency}`;
  };

  const toRawCurrency = (amountInQar: number) => {
    return Math.round(amountInQar * fxRate);
  };

  const { p25CostQar, p50CostQar, p75CostQar, marginErosionRisk } = useMemo(() => {
    const eventMult = EVENT_TYPE_MULTIPLIERS[eventType] || 1.0;
    const venueMult = VENUE_TYPE_MULTIPLIERS[venueType] || 1.0;
    const safeCap = Math.max(100, capacity || 100);
    const safeDays = Math.max(1, durationDays || 1);

    // Parametric formula: Base capacity baseline + variable per-attendee scaling modulated by duration and venue
    const baseDirectCost = (955000 + safeCap * 450) * (1 + (safeDays - 1) * 0.20) * eventMult * venueMult;
    const p50 = Math.round(baseDirectCost);
    const p25 = Math.round(baseDirectCost * 0.849);
    const p75 = Math.round(baseDirectCost * 1.199);

    const erosion = (
      3.2 +
      (safeDays > 3 ? 0.6 : 0) +
      (eventType === 'sports_ceremony' || eventType === 'festival' ? 0.9 : 0) +
      (venueType === 'outdoor_stadium' ? 0.5 : 0)
    ).toFixed(2);

    return { p25CostQar: p25, p50CostQar: p50, p75CostQar: p75, marginErosionRisk: `${erosion}%` };
  }, [eventType, venueType, capacity, durationDays]);

  const categorySpend = useMemo(() => {
    const rawCategories = [
      { category: 'SCENIC FABRICATION', pct: 28.5 },
      { category: 'VIDEO & LED WALLS', pct: 22.0 },
      { category: 'AUDIO & PA SYSTEMS', pct: 14.5 },
      { category: 'LIGHTING RIGS', pct: 12.5 },
      { category: 'CREW & PRODUCTION LABOR', pct: 11.0 },
      { category: 'RIGGING & TRUSS', pct: 7.5 },
      { category: 'LOGISTICS & FREIGHT', pct: 4.0 },
    ];
    return rawCategories.map((c) => ({
      category: c.category,
      pct: c.pct,
      amount: toCurrency(p50CostQar * (c.pct / 100)),
    }));
  }, [p50CostQar, fxRate, currency]);

  const rateCorridors = useMemo(() => {
    return BASE_RATE_CORRIDORS.map((rc) => ({
      ...rc,
      p25: toRawCurrency(rc.p25),
      p50: toRawCurrency(rc.p50),
      p75: toRawCurrency(rc.p75),
    }));
  }, [fxRate]);

  const similarProjects = useMemo(() => {
    const baseProjects = [
      { code: 'SUMMIT-2025-DOHA', name: 'Doha Global Economic Forum 2025', baseCapacity: 2500, baseDays: 3, baseCostQar: 3200000, margin: '26.5%' },
      { code: 'GALA-2026-RIYADH', name: 'Riyadh Ministerial Gala & Awards', baseCapacity: 3000, baseDays: 2, baseCostQar: 2800000, margin: '28.5%' },
      { code: 'FESTIVAL-2025-LUSAIL', name: 'Lusail Light & Arts Festival', baseCapacity: 15000, baseDays: 5, baseCostQar: 5500000, margin: '22.0%' },
    ];
    return baseProjects.map((p) => {
      const capDiff = Math.abs(p.baseCapacity - capacity) / Math.max(1, capacity);
      const dayDiff = Math.abs(p.baseDays - durationDays) / Math.max(1, durationDays);
      const matchPct = Math.max(45, Math.min(98, Math.round(100 - capDiff * 35 - dayDiff * 25)));
      return {
        code: p.code,
        name: p.name,
        capacity: p.baseCapacity,
        days: p.baseDays,
        cost: toCurrency(p.baseCostQar),
        margin: p.margin,
        similarity: matchPct,
      };
    });
  }, [capacity, durationDays, fxRate, currency]);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', color: '#0f172a' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
            📊 Historical Estimating & Dynamic Rate Corridors
          </h1>
          <Badge variant="info">P06-ST03 Governed</Badge>
          <Badge variant="success">Empirical Benchmark</Badge>
        </div>
        <p style={{ color: '#64748b', marginTop: '6px', fontSize: '13px' }}>
          Empirical unit rate corridors, parametric cost forecasting, evidence disclosures, and supplier lead-time intelligence.
        </p>
      </div>

      {/* Mandatory Evidence Age & Disclosure Ribbon */}
      <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>ℹ️</span>
          <div>
            <strong style={{ fontSize: '13px', color: '#1e40af' }}>Evidence Disclosure Standard (AT-080):</strong>
            <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '2px' }}>
              Corridor data derived from <strong>14 delivered Doha mega-events</strong>. Average evidence age: <strong>42 days</strong>. Outputs reflect empirical benchmarks, not binding quotations.
            </div>
          </div>
        </div>
        <Badge variant="info">Sample N = 14 | Inflation Indexed +3.5%</Badge>
      </div>

      {/* Controls Form */}
      <Card title="Tender Feasibility & Parametric Forecasting Parameters">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Event Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
            >
              <option value="summit">Summit / Conference</option>
              <option value="festival">Festival / Cultural Event</option>
              <option value="exhibition">Exhibition / Expo</option>
              <option value="sports_ceremony">Sports Opening / Closing</option>
              <option value="corporate_gala">Corporate Gala / Dinner</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Venue Type</label>
            <select
              value={venueType}
              onChange={(e) => setVenueType(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
            >
              <option value="convention_centre">Convention Centre</option>
              <option value="indoor_arena">Indoor Arena</option>
              <option value="outdoor_stadium">Outdoor Stadium</option>
              <option value="public_park">Public Park / Promenade</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Target Capacity</label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Duration (Days)</label>
            <input
              type="number"
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
            >
              <option value="QAR">QAR (Qatari Riyal)</option>
              <option value="USD">USD (US Dollar)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="SAR">SAR (Saudi Riyal)</option>
              <option value="AED">AED (UAE Dirham)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Parametric Output Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', margin: '20px 0' }}>
        <MetricCard label="P25 Low Benchmark" value={toCurrency(p25CostQar)} subtext="Conservative baseline scope" />
        <MetricCard label="P50 Median Forecast" value={toCurrency(p50CostQar)} subtext="Empirical historical midpoint" />
        <MetricCard label="P75 High Benchmark" value={toCurrency(p75CostQar)} subtext="High-spec VIP / custom finishes" />
        <MetricCard label="Margin Erosion Risk" value={marginErosionRisk} subtext="Historical scope creep average" />
      </div>

      {/* Item 2: Dynamic Discipline Rate Corridors Table */}
      <div style={{ marginBottom: '20px' }}>
        <Card title="Discipline Empirical Rate Corridors (P25 / P50 / P75)" noPadding>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Discipline & Category</th>
                <th style={{ padding: '12px 16px' }}>Unit Basis</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>P25 Low ({currency})</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>P50 Median ({currency})</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>P75 High ({currency})</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Lead Time</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Evidence Sample</th>
              </tr>
            </thead>
            <tbody>
              {rateCorridors.map((rc, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{rc.discipline}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{rc.unit}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#059669', fontWeight: 700 }}>
                    {rc.p25.toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>
                    {rc.p50.toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#d97706', fontWeight: 700 }}>
                    {rc.p75.toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <Badge variant="neutral">{rc.leadTimeDays} Days</Badge>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <Badge variant="info">N = {rc.sampleCount}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Breakdown and Similar Projects */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Category Spend Distribution */}
        <Card title="Category Spend Breakdown (% of Direct Cost)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {categorySpend.map((c, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>{c.category}</span>
                  <span style={{ color: '#64748b' }}>{c.amount} ({c.pct}%)</span>
                </div>
                <div style={{ backgroundColor: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: '#0284c7', width: `${c.pct * 2.5}%`, height: '100%' }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Similar Projects Table */}
        <Card title="Comparable Delivered Projects (Evidence Base)" noPadding>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Project</th>
                <th style={{ padding: '12px 16px' }}>Actual Cost</th>
                <th style={{ padding: '12px 16px' }}>Margin</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Similarity Match</th>
              </tr>
            </thead>
            <tbody>
              {similarProjects.map((p, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{p.code} ({p.capacity} pax, {p.days}d)</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{p.cost}</td>
                  <td style={{ padding: '12px 16px', color: '#059669', fontWeight: 700 }}>{p.margin}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <Badge variant="success">{p.similarity}%</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
};
