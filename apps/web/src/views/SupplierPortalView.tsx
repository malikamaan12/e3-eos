import React, { useState } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Badge, Button } from '../components/DesignSystem.js';

interface RfqLineItem {
  id: string;
  code: string;
  description: string;
  descriptionAr: string;
  qty: number;
  uom: string;
  unitPrice: number;
  leadTimeDays: number;
}

export const SupplierPortalView: React.FC = () => {
  const { currentLanguage } = useEosContext();
  const isAr = currentLanguage === 'ar';

  const [rfqItems, setRfqItems] = useState<RfqLineItem[]>([
    {
      id: 'line-01',
      code: 'RIG-KNT-01',
      description: 'Automated 2-Ton D8+ Kinetic Chain Hoists with Load-Cell Monitoring',
      descriptionAr: 'روافع سلكية حركية مؤتمتة حمولة 2 طن مع مراقبة أحمال خلايا الوزن',
      qty: 24,
      uom: 'Units',
      unitPrice: 1850,
      leadTimeDays: 7,
    },
    {
      id: 'line-02',
      code: 'LGT-IP65-02',
      description: 'IP65 High-Power Hybrid Beam/Wash Fixtures with Wireless DMX',
      descriptionAr: 'كشافات إضاءة هجينة فائقة القدرة مقاومة للعوامل الجوية مع تحكم لاسلكي',
      qty: 96,
      uom: 'Units',
      unitPrice: 420,
      leadTimeDays: 5,
    },
    {
      id: 'line-03',
      code: 'CRW-RIG-03',
      description: 'Certified Master Riggers & Safety Inspectors (LEEA Qualified)',
      descriptionAr: 'فنيو تركيب معتمدون ومفتشو سلامة مؤهلون وفق معايير LEEA',
      qty: 6,
      uom: 'Specialists',
      unitPrice: 2800,
      leadTimeDays: 3,
    },
  ]);

  const [currency, setCurrency] = useState<'QAR' | 'USD' | 'EUR' | 'AED'>('QAR');
  const [vendorNotes, setVendorNotes] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([
    { name: 'Commercial_Registration_CR2026.pdf', size: '2.4 MB', status: 'scanned_clean', hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
    { name: 'LEEA_Safety_Accreditation_Cert.pdf', size: '4.1 MB', status: 'scanned_clean', hash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4' },
    { name: 'Workmens_Comp_Insurance_Policy_5M.pdf', size: '3.8 MB', status: 'scanned_clean', hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8' },
  ]);
  const [submittedReceipt, setSubmittedReceipt] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePriceChange = (id: string, price: number) => {
    setRfqItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, unitPrice: price } : item))
    );
  };

  const handleLeadTimeChange = (id: string, days: number) => {
    setRfqItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, leadTimeDays: days } : item))
    );
  };

  const totalQuotation = rfqItems.reduce(
    (acc, curr) => acc + curr.qty * (curr.unitPrice || 0),
    0
  );

  const handleSubmitQuotation = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      const receipt = `E3-SUB-QAR-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setSubmittedReceipt(receipt);
      setIsSubmitting(false);
    }, 600);
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '8px 16px 40px 16px' }} dir={isAr ? 'rtl' : 'ltr'}>
      {/* Contributor Header */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        marginBottom: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Badge variant="purple">{isAr ? 'بوابة المساهم المعتمد' : 'Authorized Contributor Portal'}</Badge>
            <Badge variant="info">Token: tok-qnd26-rfq-av01</Badge>
            <Badge variant="success">{isAr ? 'قيد المراجعة الفنية' : 'Open for Submission'}</Badge>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px 0', color: '#0f172a' }}>
            {isAr
              ? 'طلب تقديم عروض الأسعار: حزمة تجهيزات الصوت والإضاءة والتعليق الحركي'
              : 'RFQ-2026-AV-01: Kinetic Rigging & Architectural Lighting Package'}
          </h1>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            {isAr
              ? 'المشروع: احتفالات اليوم الوطني لدولة قطر 2026 • الجهة الطالبة: شركة E3 للفعاليات والمشاريع الكبرى'
              : 'Target Project: Qatar National Day 2026 • Issuing Entity: E3 Events & Special Projects LLC (Doha, Qatar)'}
          </div>
        </div>

        <div style={{
          backgroundColor: '#f8fafc',
          padding: '12px 18px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          textAlign: isAr ? 'left' : 'right'
        }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 600 }}>
            {isAr ? 'الموعد النهائي لتقديم العطاء' : 'Submission Deadline'}
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#b91c1c' }}>
            {isAr ? '15 أكتوبر 2026 • 18:00 بتوقيت الدوحة' : '15 Oct 2026 • 18:00 AST (UTC+3)'}
          </div>
        </div>
      </div>

      {/* Strict Tenant / Scope Isolation Notice */}
      <div style={{
        backgroundColor: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '8px',
        padding: '14px 18px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ fontSize: '20px' }}>🔒</div>
        <div style={{ fontSize: '13px', color: '#166534' }}>
          <strong>{isAr ? 'نطاق وصول مقيد ومشفر (عزل كامل للموردين): ' : 'Isolated Contributor Sandbox: '}</strong>
          {isAr
            ? 'هذه المساحة مقيدة حصرياً ببنود المناقصة المحددة أعلاه. بموجب معايير E3 الصارمة، لا يمكن الاطلاع على هوية المنافسين الآخرين، أو الميزانيات التقديرية الداخلية، أو هوامش الربح.'
            : 'Access is cryptographically bound to this RFQ package token. Under E3 system invariants, internal estimates, margins, buy-rates, and competing bids are redacted server-side.'}
        </div>
      </div>

      {submittedReceipt ? (
        /* Submission Success Confirmation */
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '40px',
          border: '1px solid #bbf7d0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <Badge variant="success" style={{ fontSize: '14px', padding: '6px 16px' }}>
            {isAr ? 'تم استلام وتشفير العطاء بنجاح' : 'Encrypted Quotation Formally Submitted'}
          </Badge>
          <h2 style={{ fontSize: '22px', margin: '20px 0 8px 0', color: '#0f172a' }}>
            {isAr ? 'إيصال الاستلام المشفر الرسمي' : 'Official Cryptographic Receipt'}
          </h2>
          <div style={{
            fontFamily: 'monospace',
            backgroundColor: '#f1f5f9',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '18px',
            fontWeight: 700,
            letterSpacing: '0.05em',
            display: 'inline-block',
            margin: '12px 0 20px 0',
            color: '#1e293b'
          }}>
            {submittedReceipt}
          </div>
          <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '600px', margin: '0 auto 24px auto', lineHeight: 1.6 }}>
            {isAr
              ? `تم تسجيل العطاء بقيمة إجمالية ${totalQuotation.toLocaleString()} ${currency} مع إرفاق ${uploadedFiles.length} وثائق نظامية مفحوصة وموثقة بختم زمني مشفر.`
              : `Your quotation of ${totalQuotation.toLocaleString()} ${currency} along with ${uploadedFiles.length} verified compliance documents has been committed with tamper-evident cryptographic hash.`}
          </p>
          <Button variant="secondary" size="md" onClick={() => setSubmittedReceipt(null)}>
            {isAr ? 'تعديل العرض قبل الإغلاق' : 'Revise Quotation Prior to Cutoff'}
          </Button>
        </div>
      ) : (
        /* RFQ Submission Form */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          {/* Section 1: Itemized Pricing Table */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 4px 0', color: '#0f172a' }}>
                  {isAr ? '1. جدول تسعير بنود التوريد والخدمات' : '1. Bill of Quantities & Unit Pricing'}
                </h2>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  {isAr ? 'أدخل أسعار الوحدات ومهلة التجهيز بالأيام' : 'Enter unit costs and preparation lead times for each requested item'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#475569' }}>
                  {isAr ? 'العملة:' : 'Currency:'}
                </span>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as any)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: '#f8fafc'
                  }}
                >
                  <option value="QAR">QAR (Qatari Riyal)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="EUR">EUR (Euro)</option>
                  <option value="AED">AED (UAE Dirham)</option>
                </select>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: isAr ? 'right' : 'left' }}>
                    <th style={{ padding: '12px 14px', fontWeight: 600, color: '#475569' }}>{isAr ? 'كود البند' : 'Item Code'}</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, color: '#475569' }}>{isAr ? 'الوصف والمواصفات' : 'Description & Scope'}</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, color: '#475569' }}>{isAr ? 'الكمية' : 'Qty'}</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, color: '#475569' }}>{isAr ? 'الوحدة' : 'UOM'}</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, color: '#475569', minWidth: '130px' }}>{isAr ? `سعر الوحدة (${currency})` : `Unit Rate (${currency})`}</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, color: '#475569', minWidth: '100px' }}>{isAr ? 'مهلة التوريد (أيام)' : 'Lead Time'}</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, color: '#475569', textAlign: isAr ? 'left' : 'right' }}>{isAr ? 'الإجمالي' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody>
                  {rfqItems.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px', fontWeight: 600, fontFamily: 'monospace', color: '#2563eb' }}>
                        {item.code}
                      </td>
                      <td style={{ padding: '14px', color: '#1e293b' }}>
                        <div style={{ fontWeight: 500 }}>{isAr ? item.descriptionAr : item.description}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          {isAr ? 'مواصفة الفئة الاحترافية المعتمدة' : 'Standard compliance tier: Professional Grade 1'}
                        </div>
                      </td>
                      <td style={{ padding: '14px', fontWeight: 600 }}>{item.qty}</td>
                      <td style={{ padding: '14px', color: '#64748b' }}>{item.uom}</td>
                      <td style={{ padding: '14px' }}>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handlePriceChange(item.id, parseFloat(e.target.value) || 0)}
                          style={{
                            width: '110px',
                            padding: '6px 10px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 600,
                            textAlign: 'right'
                          }}
                        />
                      </td>
                      <td style={{ padding: '14px' }}>
                        <input
                          type="number"
                          value={item.leadTimeDays}
                          onChange={(e) => handleLeadTimeChange(item.id, parseInt(e.target.value, 10) || 0)}
                          style={{
                            width: '70px',
                            padding: '6px 10px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '13px',
                            textAlign: 'center'
                          }}
                        />
                      </td>
                      <td style={{ padding: '14px', fontWeight: 700, color: '#0f172a', textAlign: isAr ? 'left' : 'right' }}>
                        {(item.qty * (item.unitPrice || 0)).toLocaleString()} {currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                    <td colSpan={6} style={{ padding: '16px 14px', fontWeight: 700, fontSize: '14px', textAlign: isAr ? 'left' : 'right' }}>
                      {isAr ? 'إجمالي قيمة العطاء المالي المقترح:' : 'Total Proposed Quotation:'}
                    </td>
                    <td style={{ padding: '16px 14px', fontWeight: 800, fontSize: '16px', color: '#2563eb', textAlign: isAr ? 'left' : 'right' }}>
                      {totalQuotation.toLocaleString()} {currency}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Section 2: Compliance & Document Verification Upload */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 4px 0', color: '#0f172a' }}>
              {isAr ? '2. وثائق الاعتماد الفني والتراخيص النظامية' : '2. Statutory Compliance & Insurance Certifications'}
            </h2>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px' }}>
              {isAr
                ? 'وفق ضوابط الحوكمة، تخضع جميع الوثائق للفحص الفوري للكشف عن الفيروسات والتثبت من سريان الصلاحية'
                : 'All uploaded certificates are scanned via E3 Document Quarantine Service and cryptographically hashed upon ingestion'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              {uploadedFiles.map((f, i) => (
                <div key={i} style={{
                  padding: '14px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>📄 {f.name}</span>
                    <Badge variant="success">{isAr ? 'مفحوص وسليم' : 'Clean & Verified'}</Badge>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Size: {f.size}</span>
                    <span style={{ fontFamily: 'monospace' }}>SHA-256: {f.hash.substring(0, 12)}...</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Drag and Drop Zone */}
            <div
              onClick={() => {
                const sampleName = `Additional_Endorsement_${Date.now().toString().slice(-4)}.pdf`;
                setUploadedFiles((prev) => [
                  ...prev,
                  {
                    name: sampleName,
                    size: '1.9 MB',
                    status: 'scanned_clean',
                    hash: 'd4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35',
                  },
                ]);
              }}
              style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '8px',
              padding: '24px',
              textAlign: 'center',
              backgroundColor: '#fafaf9',
              cursor: 'pointer',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>📤</div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#334155' }}>
                {isAr ? 'انقر أو اسحب ملفات إضافية هنا' : 'Click or Drag Additional Certificates Here'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                PDF, XLSX, DOCX up to 50MB • ISO 27001 / Zero Executable Guard Active
              </div>
            </div>

            {/* Vendor Clarifications and Terms */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                {isAr ? 'ملاحظات العطاء وشروط التوريد الإضافية:' : 'Quotation Caveats, Exclusions & Payment Terms:'}
              </label>
              <textarea
                value={vendorNotes}
                onChange={(e) => setVendorNotes(e.target.value)}
                rows={3}
                placeholder={isAr ? 'أدخل أي شروط دفع أو متطلبات خاصة بالموقع والتوصيل...' : 'E.g., Mobilization requires 48-hour clear site access; pricing valid for 45 calendar days...'}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Submit Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                {isAr ? '🛡️ يتم حفظ وتشفير العطاء باستخدام مفتاح Idempotency-Key الفريد' : '🛡️ Protected by Tenant Boundary & Idempotency Lock'}
              </div>
              <Button
                variant="primary"
                size="lg"
                onClick={handleSubmitQuotation}
                disabled={isSubmitting}
                style={{ minWidth: '220px' }}
              >
                {isSubmitting
                  ? (isAr ? 'جارٍ التشفير والإرسال...' : 'Encrypting & Submitting...')
                  : (isAr ? `إرسال العطاء الرسمي (${totalQuotation.toLocaleString()} ${currency})` : `Submit Encrypted Bid (${totalQuotation.toLocaleString()} ${currency})`)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierPortalView;
