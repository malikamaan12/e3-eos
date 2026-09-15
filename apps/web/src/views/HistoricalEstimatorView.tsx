import React, { useState } from 'react';
import { Card, MetricCard, Badge } from '../components/DesignSystem.js';

export const HistoricalEstimatorView: React.FC = () => {
  const [eventType, setEventType] = useState<string>('summit');
  const [venueType, setVenueType] = useState<string>('convention_centre');
  const [capacity, setCapacity] = useState<number>(3000);
  const [durationDays, setDurationDays] = useState<number>(3);
  const [currency, setCurrency] = useState<string>('QAR');

  const similarProjects = [
    { code: 'SUMMIT-2025-DOHA', name: 'Doha Global Economic Forum 2025', capacity: 2500, days: 3, cost: '3,200,000 QAR', margin: '26.5%', similarity: 92 },
    { code: 'GALA-2026-RIYADH', name: 'Riyadh Ministerial Gala & Awards', capacity: 3000, days: 2, cost: '2,800,000 SAR', margin: '28.5%', similarity: 85 },
    { code: 'FESTIVAL-2025-LUSAIL', name: 'Lusail Light & Arts Festival', capacity: 15000, days: 5, cost: '5,500,000 QAR', margin: '22.0%', similarity: 55 },
  ];

  const categorySpend = [
    { category: 'SCENIC FABRICATION', pct: 28.5, amount: '920,000 QAR' },
    { category: 'VIDEO & LED WALLS', pct: 22.0, amount: '710,000 QAR' },
    { category: 'AUDIO & PA SYSTEMS', pct: 14.5, amount: '468,000 QAR' },
    { category: 'LIGHTING RIGS', pct: 12.5, amount: '403,000 QAR' },
    { category: 'CREW & PRODUCTION LABOR', pct: 11.0, amount: '355,000 QAR' },
    { category: 'RIGGING & TRUSS', pct: 7.5, amount: '242,000 QAR' },
    { category: 'LOGISTICS & FREIGHT', pct: 4.0, amount: '129,000 QAR' },
  ];

  // Item 2: Discipline Unit Rate Corridors (P06-ST03)
  const rateCorridors = [
    { discipline: 'Scenic Custom Carpentry', unit: 'per m²', p25: 450, p50: 620, p75: 850, sampleCount: 14, leadTimeDays: 18 },
    { discipline: 'Overhead Truss Rigging', unit: 'per point / day', p25: 350, p50: 500, p75: 750, sampleCount: 22, leadTimeDays: 7 },
    { discipline: 'High-Power Laser Video & LED', unit: 'per m² / day', p25: 320, p50: 480, p75: 650, sampleCount: 18, leadTimeDays: 10 },
    { discipline: 'Certified Rigger & Crew Lead', unit: 'per 10h shift', p25: 1200, p50: 1600, p75: 2200, sampleCount: 35, leadTimeDays: 4 },
  ];

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
        <MetricCard label="P25 Low Benchmark" value={`2,740,000 ${currency}`} subtext="Conservative baseline scope" />
        <MetricCard label="P50 Median Forecast" value={`3,227,000 ${currency}`} subtext="Empirical historical midpoint" />
        <MetricCard label="P75 High Benchmark" value={`3,870,000 ${currency}`} subtext="High-spec VIP / custom finishes" />
        <MetricCard label="Margin Erosion Risk" value="3.20%" subtext="Historical scope creep average" />
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
