import React, { useState } from 'react';

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

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>
            📊 Historical Estimating & Parametric Cost Forecasting
          </h1>
          <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: '600' }}>
            Empirical Benchmark Engine
          </span>
        </div>
        <p style={{ color: '#64748b', marginTop: '6px', fontSize: '14px' }}>
          Empirical parametric cost ranges, similar project clustering, category spend distributions, and margin erosion risk indices.
        </p>
      </div>

      {/* Controls Form */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Event Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            >
              <option value="summit">Summit / Conference</option>
              <option value="festival">Festival / Cultural Event</option>
              <option value="exhibition">Exhibition / Expo</option>
              <option value="sports_ceremony">Sports Opening / Closing</option>
              <option value="corporate_gala">Corporate Gala / Dinner</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Venue Type</label>
            <select
              value={venueType}
              onChange={(e) => setVenueType(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            >
              <option value="convention_centre">Convention Centre</option>
              <option value="indoor_arena">Indoor Arena</option>
              <option value="outdoor_stadium">Outdoor Stadium</option>
              <option value="public_park">Public Park / Promenade</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Target Capacity</label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Duration (Days)</label>
            <input
              type="number"
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            >
              <option value="QAR">QAR (Qatari Riyal)</option>
              <option value="SAR">SAR (Saudi Riyal)</option>
              <option value="AED">AED (UAE Dirham)</option>
              <option value="USD">USD (US Dollar)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Parametric Output Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>P25 LOW BENCHMARK</span>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669', marginTop: '4px' }}>2,740,000 {currency}</div>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Conservative baseline scope</span>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '2px solid #0284c7', borderRadius: '10px', padding: '16px' }}>
          <span style={{ fontSize: '12px', color: '#0284c7', fontWeight: '700' }}>P50 MEDIAN FORECAST</span>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>3,227,000 {currency}</div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Empirical historical midpoint</span>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>P75 HIGH BENCHMARK</span>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#d97706', marginTop: '4px' }}>3,870,000 {currency}</div>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>High-spec VIP / custom finishes</span>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>MARGIN EROSION RISK</span>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', marginTop: '4px' }}>3.20%</div>
          <span style={{ fontSize: '11px', color: '#dc2626' }}>Historical scope creep average</span>
        </div>
      </div>

      {/* Breakdown and Similar Projects */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Category Spend Distribution */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: '#0f172a' }}>
            Category Spend Breakdown (% of Direct Cost)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {categorySpend.map((c, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '600', color: '#334155' }}>{c.category}</span>
                  <span style={{ color: '#64748b' }}>{c.amount} ({c.pct}%)</span>
                </div>
                <div style={{ backgroundColor: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: '#0284c7', width: `${c.pct * 2.5}%`, height: '100%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Similar Projects Table */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: '#0f172a' }}>
            Comparable Delivered Projects (Evidence Base)
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: '8px' }}>Project</th>
                <th style={{ padding: '8px' }}>Actual Cost</th>
                <th style={{ padding: '8px' }}>Margin</th>
                <th style={{ padding: '8px' }}>Match</th>
              </tr>
            </thead>
            <tbody>
              {similarProjects.map((p, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ fontWeight: '600', color: '#0f172a' }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{p.code} ({p.capacity} pax, {p.days}d)</div>
                  </td>
                  <td style={{ padding: '10px 8px', fontWeight: '500' }}>{p.cost}</td>
                  <td style={{ padding: '10px 8px', color: '#059669', fontWeight: '600' }}>{p.margin}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
                      {p.similarity}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
