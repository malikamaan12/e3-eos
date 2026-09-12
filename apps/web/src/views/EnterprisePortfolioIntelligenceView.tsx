import React from 'react';

export const EnterprisePortfolioIntelligenceView: React.FC = () => {
  const projects = [
    { code: 'P06-SUMMIT-01', title: 'Doha Global Economic Summit', cpi: '1.05', spi: '1.02', erosion: '2.50%', level: 'low', factor: 'Healthy Operations' },
    { code: 'P06-FESTIVAL-02', title: 'Lusail Marina Light Festival', cpi: '0.88', spi: '0.92', erosion: '6.80%', level: 'high', factor: '2 Unresolved Critical Snags' },
    { code: 'P06-GALA-03', title: 'National Innovation Awards', cpi: '0.94', spi: '0.98', erosion: '3.40%', level: 'low', factor: 'Healthy Operations' },
  ];

  const vendors = [
    { name: 'Creative Technology Middle East', disc: 'Audio & PA Systems', score: 95, projects: 8, recRate: '100%', tier: 'preferred_partner' },
    { name: 'Gulf Scenic Fabrication LLC', disc: 'Custom Scenic Carpentry', score: 82, projects: 6, recRate: '88%', tier: 'standard' },
    { name: 'Al-Jaber Heavy Power Solutions', disc: 'Generators & Power', score: 74, projects: 5, recRate: '75%', tier: 'conditional_review' },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>
            🌐 Enterprise Scale & Portfolio Intelligence
          </h1>
          <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: '600' }}>
            Executive Command Suite
          </span>
        </div>
        <p style={{ color: '#64748b', marginTop: '6px', fontSize: '14px' }}>
          Multi-project risk heatmaps, EVM deliverable progress, and cross-project Vendor Performance Index (VPI) leaderboards.
        </p>
      </div>

      {/* Top Level Portfolio Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>TOTAL PROJECTS TRACKED</span>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>3 Active</div>
          <span style={{ fontSize: '11px', color: '#059669' }}>100% stage-gate governed</span>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>PORTFOLIO GROSS MARGIN</span>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669', marginTop: '4px' }}>24.50%</div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Baseline forecast target: 22.0%</span>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>HIGH-RISK PROJECTS</span>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', marginTop: '4px' }}>1 Flagged</div>
          <span style={{ fontSize: '11px', color: '#dc2626' }}>Requires director intervention</span>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>CRITICAL CROSS-PROJECT SNAGS</span>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#d97706', marginTop: '4px' }}>2 Open</div>
          <span style={{ fontSize: '11px', color: '#d97706' }}>In rigging / structural safety</span>
        </div>
      </div>

      {/* Portfolio Risk Heatmap Table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: '#0f172a' }}>
          Portfolio Operational Risk Matrix
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
              <th style={{ padding: '8px' }}>Project Code</th>
              <th style={{ padding: '8px' }}>Title</th>
              <th style={{ padding: '8px' }}>CPI (Cost)</th>
              <th style={{ padding: '8px' }}>SPI (Schedule)</th>
              <th style={{ padding: '8px' }}>Margin Erosion</th>
              <th style={{ padding: '8px' }}>Dominant Risk Factor</th>
              <th style={{ padding: '8px' }}>Status Level</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 8px', fontWeight: '700', color: '#0f172a' }}>{p.code}</td>
                <td style={{ padding: '10px 8px' }}>{p.title}</td>
                <td style={{ padding: '10px 8px', fontWeight: '600', color: parseFloat(p.cpi) >= 1.0 ? '#059669' : '#dc2626' }}>{p.cpi}</td>
                <td style={{ padding: '10px 8px', fontWeight: '600', color: parseFloat(p.spi) >= 1.0 ? '#059669' : '#d97706' }}>{p.spi}</td>
                <td style={{ padding: '10px 8px' }}>{p.erosion}</td>
                <td style={{ padding: '10px 8px', color: '#475569' }}>{p.factor}</td>
                <td style={{ padding: '10px 8px' }}>
                  <span style={{
                    backgroundColor: p.level === 'high' ? '#fee2e2' : '#dcfce7',
                    color: p.level === 'high' ? '#991b1b' : '#166534',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '700',
                  }}>
                    {p.level.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vendor Performance Index (VPI) Leaderboard */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: '#0f172a' }}>
          Cross-Project Vendor Performance Index (VPI)
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
              <th style={{ padding: '8px' }}>Vendor Partner</th>
              <th style={{ padding: '8px' }}>Core Discipline</th>
              <th style={{ padding: '8px' }}>VPI Composite Score</th>
              <th style={{ padding: '8px' }}>Delivered Projects</th>
              <th style={{ padding: '8px' }}>Recommendation Rate</th>
              <th style={{ padding: '8px' }}>Status Tier</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 8px', fontWeight: '600', color: '#0f172a' }}>{v.name}</td>
                <td style={{ padding: '10px 8px', color: '#475569' }}>{v.disc}</td>
                <td style={{ padding: '10px 8px', fontWeight: '700', color: '#0284c7' }}>{v.score} / 100</td>
                <td style={{ padding: '10px 8px' }}>{v.projects}</td>
                <td style={{ padding: '10px 8px', fontWeight: '600', color: '#059669' }}>{v.recRate}</td>
                <td style={{ padding: '10px 8px' }}>
                  <span style={{
                    backgroundColor: v.tier === 'preferred_partner' ? '#dbeafe' : v.tier === 'standard' ? '#f1f5f9' : '#fef3c7',
                    color: v.tier === 'preferred_partner' ? '#1e40af' : v.tier === 'standard' ? '#334155' : '#92400e',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '700',
                  }}>
                    {v.tier.toUpperCase().replace(/_/g, ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
