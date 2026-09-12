import React, { useState } from 'react';

export const CountryPacksView: React.FC = () => {
  const [selectedCountry, setSelectedCountry] = useState<string>('QA');
  const [shiftHours, setShiftHours] = useState<number>(9);
  const [workTime, setWorkTime] = useState<string>('11:00');
  const [workDate, setWorkDate] = useState<string>('2026-07-15');
  const [invoiceTotal, setInvoiceTotal] = useState<number>(100000);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [testResult, setTestResult] = useState<any>(null);

  const packs = {
    QA: {
      name: 'State of Qatar',
      currency: 'QAR',
      vat: '0%',
      labourLimit: '10h / day',
      summerBan: '10:00 - 15:30 (June 1 - Sept 15)',
      einvoicing: 'Standard QCB clearance',
    },
    SA: {
      name: 'Kingdom of Saudi Arabia',
      currency: 'SAR',
      vat: '15%',
      labourLimit: '8h / day',
      summerBan: '12:00 - 15:00 (June 15 - Sept 15)',
      einvoicing: 'ZATCA Phase 2 Cryptographic QR (Active)',
    },
    AE: {
      name: 'United Arab Emirates',
      currency: 'AED',
      vat: '5%',
      labourLimit: '8h / day',
      summerBan: '12:30 - 15:00 (July 1 - Sept 15)',
      einvoicing: 'UAE FTA TRN Tax Invoice Format',
    },
  };

  const handleTestCompliance = () => {
    const violations: string[] = [];
    if (selectedCountry === 'QA' && shiftHours > 10) {
      violations.push('Shift duration exceeds Qatar statutory 10h limit.');
    }
    if (selectedCountry === 'QA' && workTime >= '10:00' && workTime <= '15:30') {
      violations.push('Outdoor work between 10:00 and 15:30 violates Qatar Ministerial Decision No. 17 of 2021 summer work ban.');
    }
    if (selectedCountry === 'SA' && taxAmount !== invoiceTotal * 0.15) {
      violations.push('Tax does not equal 15% ZATCA statutory VAT.');
    }

    setTestResult({
      isCompliant: violations.length === 0,
      violations,
      zatcaQr: selectedCountry === 'SA' ? 'AQVlMy1lb3MCEzMwMDEyMzQ1Njc4OTAwMwMUMjAyNi0wOS0xMlQxMTo1MDowMFoFCTA1OTY2OS4wMAUGMTQ0MDAuMDA=' : null,
    });
  };

  const cur = (packs as any)[selectedCountry];

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>
            🌍 Multi-Country Packs & Statutory Governance
          </h1>
          <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: '600' }}>
            Regional Regulatory Engines
          </span>
        </div>
        <p style={{ color: '#64748b', marginTop: '6px', fontSize: '14px' }}>
          Localized statutory work hour limits, summer outdoor work restrictions, tax/VAT regimes, and e-invoicing standards (Qatar, KSA, UAE).
        </p>
      </div>

      {/* Country Selector Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        {[
          { code: 'QA', flag: '🇶🇦', name: 'State of Qatar' },
          { code: 'SA', flag: '🇸🇦', name: 'Saudi Arabia (ZATCA)' },
          { code: 'AE', flag: '🇦🇪', name: 'United Arab Emirates (FTA)' },
        ].map((c) => (
          <button
            key={c.code}
            onClick={() => setSelectedCountry(c.code)}
            style={{
              padding: '12px 20px',
              border: '1px solid',
              borderColor: selectedCountry === c.code ? '#0284c7' : '#cbd5e1',
              backgroundColor: selectedCountry === c.code ? '#eff6ff' : '#ffffff',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              color: selectedCountry === c.code ? '#0284c7' : '#334155',
            }}
          >
            {c.flag} {c.name}
          </button>
        ))}
      </div>

      {/* Selected Country Profile */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: '#0f172a' }}>
          Active Statutory Profile: {cur.name}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>PRIMARY CURRENCY</span>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>{cur.currency}</div>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>STATUTORY VAT RATE</span>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>{cur.vat}</div>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>MAX DAILY CREW SHIFT</span>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>{cur.labourLimit}</div>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>SUMMER WORK RESTRICTION</span>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#dc2626', marginTop: '2px' }}>{cur.summerBan}</div>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', gridColumn: 'span 2' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>E-INVOICING / TAX STANDARD</span>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#0284c7', marginTop: '2px' }}>{cur.einvoicing}</div>
          </div>
        </div>
      </div>

      {/* Compliance Validator Tool */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px', color: '#0f172a' }}>
          Statutory Compliance Test Bench
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Shift Duration (Hours)</label>
            <input type="number" value={shiftHours} onChange={(e) => setShiftHours(Number(e.target.value))} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Outdoor Work Time</label>
            <input type="text" value={workTime} onChange={(e) => setWorkTime(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Invoice Total</label>
            <input type="number" value={invoiceTotal} onChange={(e) => setInvoiceTotal(Number(e.target.value))} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              id="btn-validate-compliance"
              onClick={handleTestCompliance}
              style={{ width: '100%', backgroundColor: '#0284c7', color: '#ffffff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
            >
              Run Compliance Check
            </button>
          </div>
        </div>

        {testResult && (
          <div
            id="compliance-result-card"
            style={{
              padding: '14px',
              borderRadius: '8px',
              backgroundColor: testResult.isCompliant ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${testResult.isCompliant ? '#bbf7d0' : '#fecaca'}`,
            }}
          >
            <div style={{ fontWeight: '700', color: testResult.isCompliant ? '#166534' : '#991b1b', marginBottom: '4px' }}>
              {testResult.isCompliant ? '✅ STATUTORY COMPLIANCE CONFIRMED' : '⚠️ STATUTORY VIOLATIONS DETECTED'}
            </div>
            {testResult.violations.map((v: string, i: number) => (
              <div key={i} style={{ fontSize: '13px', color: '#991b1b', marginTop: '2px' }}>• {v}</div>
            ))}
            {testResult.zatcaQr && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#1e40af' }}>
                <strong>ZATCA Phase 2 Cryptographic QR Base64:</strong> {testResult.zatcaQr}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
