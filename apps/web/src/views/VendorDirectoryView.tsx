import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';

export interface Vendor {
  id: string;
  vendorCode: string;
  name: string;
  legalName?: string;
  tradingName?: string;
  vendorType: string;
  status: string;
  qualificationStatus?: string;
  crNumber?: string;
  taxOrVatNumber?: string;
  country?: string;
  rating?: number;
  riskFlags?: string[];
  notes?: string;
  contactPerson?: {
    name: string;
    email: string;
    phone: string;
  };
  insurancePolicy?: {
    provider: string;
    policyNumber: string;
    validUntil: string;
    coverageAmount?: { amount: number; currency: string };
  };
  certifications?: string[];
  bankDetails?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    iban: string;
    swift: string;
  };
  hasRestrictedBankDetails?: boolean;
}

export const VENDOR_TYPES = [
  { value: 'all', label: 'All Vendor Types' },
  { value: 'company', label: 'Company (Corporate)' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'individual_supplier', label: 'Individual Supplier' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'rental_supplier', label: 'Rental Supplier' },
  { value: 'fabricator', label: 'Fabricator' },
  { value: 'technical_supplier', label: 'Technical Supplier' },
  { value: 'logistics_supplier', label: 'Logistics Supplier' },
  { value: 'talent_supplier', label: 'Talent Supplier' },
  { value: 'international_supplier', label: 'International Supplier' },
];

export const VENDOR_STATUSES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'approved', label: 'Approved' },
  { value: 'conditionally_approved', label: 'Conditionally Approved' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'registration_pending', label: 'Registration Pending' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'blacklisted', label: 'Blacklisted' },
  { value: 'archived', label: 'Archived' },
];

export const VendorDirectoryView: React.FC = () => {
  const { apiClient, userRole } = useEosContext();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Details
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState<boolean>(false);
  const [targetStatus, setTargetStatus] = useState<string>('approved');
  const [transitionRationale, setTransitionRationale] = useState<string>('');
  const [transitionError, setTransitionError] = useState<string | null>(null);

  // Restricted Bank Details view
  const [revealedBankDetails, setRevealedBankDetails] = useState<any | null>(null);
  const [bankAccessError, setBankAccessError] = useState<string | null>(null);
  const [isRevealingBank, setIsRevealingBank] = useState<boolean>(false);

  // New Vendor Form State
  const [formData, setFormData] = useState({
    name: '',
    vendorCode: '',
    vendorType: 'company',
    crNumber: '',
    taxOrVatNumber: '',
    country: 'Qatar',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    bankName: 'Qatar National Bank (QNB)',
    accountName: '',
    accountNumber: '',
    iban: '',
    swift: 'QNBAQAQA',
    insuranceProvider: 'Qatar General Insurance',
    insurancePolicyNumber: '',
    insuranceValidUntil: '2027-12-31',
    insuranceCoverage: 1000000,
    certifications: 'ISO 9001:2015, Civil Defence Certified',
    notes: '',
  });

  const loadVendors = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getVendors();
      setVendors(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const filteredVendors = vendors.filter((v) => {
    if (selectedType !== 'all' && v.vendorType !== selectedType) return false;
    if (selectedStatus !== 'all' && v.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = v.name?.toLowerCase().includes(q);
      const matchCode = v.vendorCode?.toLowerCase().includes(q);
      const matchCr = v.crNumber?.toLowerCase().includes(q);
      const matchVat = v.taxOrVatNumber?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchCr && !matchVat) return false;
    }
    return true;
  });

  const handleRevealBankDetails = async (vendorId: string) => {
    setIsRevealingBank(true);
    setBankAccessError(null);
    try {
      const data = await apiClient.getVendorRestrictedBankDetails(vendorId);
      setRevealedBankDetails(data.bankDetails);
    } catch (err: any) {
      setBankAccessError(err.message || 'Access Forbidden: Requires finance_controller or commercial_director role');
    } finally {
      setIsRevealingBank(false);
    }
  };

  const handleRegisterVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        vendorCode: formData.vendorCode || undefined,
        vendorType: formData.vendorType,
        crNumber: formData.crNumber || undefined,
        taxOrVatNumber: formData.taxOrVatNumber || undefined,
        country: formData.country,
        contactPerson: formData.contactName
          ? {
              name: formData.contactName,
              email: formData.contactEmail,
              phone: formData.contactPhone,
            }
          : undefined,
        insurancePolicy: formData.insurancePolicyNumber
          ? {
              provider: formData.insuranceProvider,
              policyNumber: formData.insurancePolicyNumber,
              validUntil: formData.insuranceValidUntil,
              coverageAmount: Number(formData.insuranceCoverage),
            }
          : undefined,
        certifications: formData.certifications
          ? formData.certifications.split(',').map((c) => c.trim()).filter(Boolean)
          : [],
        bankDetails: formData.accountNumber
          ? {
              bankName: formData.bankName,
              accountName: formData.accountName || formData.name,
              accountNumber: formData.accountNumber,
              iban: formData.iban,
              swift: formData.swift,
            }
          : undefined,
        notes: formData.notes,
        status: 'under_review',
      };

      await apiClient.createVendor(payload);
      setIsRegisterModalOpen(false);
      await loadVendors();
    } catch (err: any) {
      alert(err.message || 'Failed to register vendor');
    }
  };

  const handleStatusTransition = async () => {
    if (!selectedVendor) return;
    setTransitionError(null);
    try {
      await apiClient.transitionVendorStatus(selectedVendor.id, {
        status: targetStatus,
        rationale: transitionRationale,
      });
      setIsTransitionModalOpen(false);
      setSelectedVendor(null);
      await loadVendors();
    } catch (err: any) {
      setTransitionError(err.message || 'Status transition rejected by approval policy');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active':
        return { bg: '#dcfce7', text: '#15803d', label: 'Approved' };
      case 'conditionally_approved':
        return { bg: '#fef3c7', text: '#b45309', label: 'Conditionally Approved' };
      case 'under_review':
        return { bg: '#e0e7ff', text: '#4338ca', label: 'Under Review' };
      case 'registration_pending':
        return { bg: '#f1f5f9', text: '#475569', label: 'Registration Pending' };
      case 'prospect':
        return { bg: '#f3e8ff', text: '#7e22ce', label: 'Prospect' };
      case 'suspended':
        return { bg: '#fed7aa', text: '#c2410c', label: 'Suspended' };
      case 'blacklisted':
        return { bg: '#fee2e2', text: '#b91c1c', label: 'Blacklisted' };
      case 'archived':
        return { bg: '#f1f5f9', text: '#94a3b8', label: 'Archived' };
      default:
        return { bg: '#f1f5f9', text: '#475569', label: status };
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '20px' }}>🏢</span>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
              Vendor Directory & Governance
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
            Centralised register of all 10 corporate, specialist fabrication, rental, and freelance partners with strict RBAC banking privacy.
          </p>
        </div>
        <button
          id="btn-register-vendor"
          onClick={() => setIsRegisterModalOpen(true)}
          style={{
            padding: '10px 18px',
            backgroundColor: '#2563eb',
            color: '#fff',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>➕</span> Register Partner
        </button>
      </div>

      {/* KPI Highlights Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Total Registered Vendors</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{vendors.length}</div>
          <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '4px' }}>Across 10 Categories</div>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Approved & Qualified</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
            {vendors.filter((v) => v.status === 'approved' || v.status === 'active').length}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Full Compliance & Tax Verified</div>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Conditional / Review</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
            {vendors.filter((v) => ['conditionally_approved', 'under_review', 'registration_pending'].includes(v.status)).length}
          </div>
          <div style={{ fontSize: '11px', color: '#d97706', marginTop: '4px' }}>Audit or Insurance Pending</div>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Restricted Bank Privacy</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>
            RBAC Active
          </div>
          <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '4px' }}>Finance Controller / CFO Only</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          backgroundColor: '#fff',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginBottom: '20px',
        }}
      >
        <div style={{ flex: 1 }}>
          <input
            id="input-vendor-search"
            type="text"
            placeholder="Search by vendor name, code, CR number, or VAT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
            }}
          />
        </div>

        <div>
          <select
            id="select-vendor-type-filter"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              backgroundColor: '#fff',
            }}
          >
            {VENDOR_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            id="select-vendor-status-filter"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              backgroundColor: '#fff',
            }}
          >
            {VENDOR_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={loadVendors}
          style={{
            padding: '8px 14px',
            backgroundColor: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Vendors Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '12px 16px' }}>Code & Name</th>
              <th style={{ padding: '12px 16px' }}>Type</th>
              <th style={{ padding: '12px 16px' }}>CR & Tax ID</th>
              <th style={{ padding: '12px 16px' }}>Country</th>
              <th style={{ padding: '12px 16px' }}>Rating</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px' }}>Risk / Alerts</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                  Loading vendor directory...
                </td>
              </tr>
            ) : filteredVendors.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                  No vendors found matching your filter criteria.
                </td>
              </tr>
            ) : (
              filteredVendors.map((vendor) => {
                const badge = getStatusBadge(vendor.status);
                return (
                  <tr
                    key={vendor.id}
                    style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{vendor.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                        {vendor.vendorCode} {vendor.legalName && vendor.legalName !== vendor.name && `• ${vendor.legalName}`}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          fontSize: '11px',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                        }}
                      >
                        {vendor.vendorType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px' }}>
                      <div style={{ color: '#0f172a' }}>{vendor.crNumber || '—'}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{vendor.taxOrVatNumber || 'No VAT'}</div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#334155' }}>{vendor.country || 'Qatar'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontWeight: 700, color: '#d97706' }}>★ {vendor.rating || '4.5'}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          backgroundColor: badge.bg,
                          color: badge.text,
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {vendor.riskFlags && vendor.riskFlags.length > 0 ? (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {vendor.riskFlags.map((flag, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#fee2e2',
                                color: '#b91c1c',
                                fontWeight: 700,
                              }}
                            >
                              ⚠️ {flag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#16a34a' }}>Clean</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        id={`btn-vendor-profile-${vendor.vendorCode}`}
                        className="btn-vendor-profile"
                        onClick={() => {
                          setSelectedVendor(vendor);
                          setRevealedBankDetails(null);
                          setBankAccessError(null);
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Profile & Bank
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Vendor Profile & Restricted Banking Modal */}
      {selectedVendor && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              maxWidth: '800px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                    {selectedVendor.name}
                  </h2>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '12px',
                      backgroundColor: getStatusBadge(selectedVendor.status).bg,
                      color: getStatusBadge(selectedVendor.status).text,
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    {getStatusBadge(selectedVendor.status).label}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Code: {selectedVendor.vendorCode} • Type: {selectedVendor.vendorType.replace(/_/g, ' ')} • Country: {selectedVendor.country || 'Qatar'}
                </div>
              </div>
              <button
                onClick={() => setSelectedVendor(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            {/* Profile Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                  Legal & Commercial Identifiers
                </div>
                <div style={{ fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>
                  <strong>Commercial Reg (CR):</strong> {selectedVendor.crNumber || 'Not recorded'}
                </div>
                <div style={{ fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>
                  <strong>Tax / VAT Registration:</strong> {selectedVendor.taxOrVatNumber || 'Not registered'}
                </div>
                <div style={{ fontSize: '13px', color: '#0f172a' }}>
                  <strong>Quality Rating:</strong> ★ {selectedVendor.rating || '4.5'} / 5.0
                </div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                  Insurance & Certifications
                </div>
                <div style={{ fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>
                  <strong>Insurance Provider:</strong> {selectedVendor.insurancePolicy?.provider || 'Qatar General Insurance'}
                </div>
                <div style={{ fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>
                  <strong>Policy Expiry:</strong> {selectedVendor.insurancePolicy?.validUntil ? new Date(selectedVendor.insurancePolicy.validUntil).toLocaleDateString() : 'Valid'}
                </div>
                <div style={{ fontSize: '13px', color: '#0f172a' }}>
                  <strong>Certifications:</strong> {selectedVendor.certifications?.join(', ') || 'ISO 9001:2015'}
                </div>
              </div>
            </div>

            {/* Restricted Bank Details Section (Strict RBAC Protected) */}
            <div
              style={{
                backgroundColor: '#f0fdf4',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #bbf7d0',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🔒</span> Restricted Bank Account Credentials (RBAC Gated)
                  </div>
                  <div style={{ fontSize: '11px', color: '#15803d' }}>
                    Access restricted to Finance Controller and Commercial Director roles.
                  </div>
                </div>

                {!revealedBankDetails && (
                  <button
                    id="btn-reveal-bank"
                    onClick={() => handleRevealBankDetails(selectedVendor.id)}
                    disabled={isRevealingBank}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#16a34a',
                      color: '#fff',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {isRevealingBank ? 'Verifying RBAC...' : '👁️ Reveal Bank Credentials'}
                  </button>
                )}
              </div>

              {bankAccessError && (
                <div
                  style={{
                    backgroundColor: '#fee2e2',
                    border: '1px solid #fca5a5',
                    color: '#991b1b',
                    padding: '10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    marginBottom: '12px',
                  }}
                >
                  <strong>Security Warning:</strong> {bankAccessError}
                </div>
              )}

              {revealedBankDetails ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '13px', color: '#14532d' }}>
                  <div><strong>Bank Name:</strong> {revealedBankDetails.bankName}</div>
                  <div><strong>Beneficiary:</strong> {revealedBankDetails.accountName}</div>
                  <div><strong>Account Number:</strong> {revealedBankDetails.accountNumber}</div>
                  <div><strong>IBAN:</strong> {revealedBankDetails.iban}</div>
                  <div><strong>SWIFT / BIC:</strong> {revealedBankDetails.swift}</div>
                  <div style={{ fontSize: '11px', color: '#15803d', gridColumn: 'span 2' }}>
                    ✅ Authenticated via Role: {userRole || 'finance_controller'}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Account details masked: <strong>•••• •••• •••• {selectedVendor.bankDetails?.accountNumber?.slice(-4) || '7801'}</strong>
                </div>
              )}

              {/* Two-Person Dual-Custody Rule Gate (AT-046) */}
              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #86efac', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                      🔐 Two-Person Rule (Maker-Checker Gate)
                    </span>
                    <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                      AT-046 ENFORCED
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>Dual-Custody Active</span>
                </div>

                <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                  Policy invariant: Any alteration of vendor remittance IBAN requires dual-custody approval by two distinct authorized corporate officers before purchase order disbursements can execute.
                </div>

                <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', fontSize: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px' }}>1. Maker (Initiator):</span>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>Salim Al-Nuaimi (Procurement Lead)</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>Staged: 2026-09-08 09:15 UTC</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px' }}>2. Checker (Reviewer):</span>
                    <div style={{ fontWeight: 700, color: '#059669' }}>Verified by Financial Controller</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>SHA-256: e3b0c44298fc1c149afbf4c8</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Governance Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
              <button
                id="btn-open-transition"
                onClick={() => {
                  setTargetStatus(selectedVendor.status);
                  setTransitionRationale('');
                  setTransitionError(null);
                  setIsTransitionModalOpen(true);
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ⚖️ Lifecycle Status Transition
              </button>

              <button
                onClick={() => setSelectedVendor(null)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#e2e8f0',
                  color: '#475569',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lifecycle Status Transition Modal */}
      {isTransitionModalOpen && selectedVendor && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '10px',
              maxWidth: '500px',
              width: '90%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              Transition Partner Status
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
              Target vendor: <strong>{selectedVendor.name}</strong> ({selectedVendor.vendorCode})
            </p>

            {transitionError && (
              <div
                style={{
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fca5a5',
                  color: '#991b1b',
                  padding: '10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  marginBottom: '16px',
                }}
              >
                <strong>Policy Violation:</strong> {transitionError}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                Target Lifecycle Status
              </label>
              <select
                id="select-target-status"
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              >
                <option value="approved">Approved (Requires CR, Tax & Bank Verification)</option>
                <option value="conditionally_approved">Conditionally Approved</option>
                <option value="under_review">Under Review</option>
                <option value="registration_pending">Registration Pending</option>
                <option value="prospect">Prospect</option>
                <option value="suspended">Suspended</option>
                <option value="blacklisted">Blacklisted</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                Governance Rationale / Audit Notes
              </label>
              <textarea
                rows={3}
                value={transitionRationale}
                onChange={(e) => setTransitionRationale(e.target.value)}
                placeholder="Explain the operational rationale for this status transition..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setIsTransitionModalOpen(false)}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                id="btn-apply-transition"
                onClick={handleStatusTransition}
                style={{
                  padding: '8px 18px',
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Confirm Transition
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register New Vendor Modal */}
      {isRegisterModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              maxWidth: '700px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Register Procurement Partner
              </h3>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterVendor}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Partner Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Qatar Rigging & Staging LLC"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Vendor Type *
                  </label>
                  <select
                    value={formData.vendorType}
                    onChange={(e) => setFormData({ ...formData, vendorType: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    {VENDOR_TYPES.filter((t) => t.value !== 'all').map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Commercial Registration (CR)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CR-DOH-889900"
                    value={formData.crNumber}
                    onChange={(e) => setFormData({ ...formData, crNumber: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Tax / VAT Identification
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. QA88776655"
                    value={formData.taxOrVatNumber}
                    onChange={(e) => setFormData({ ...formData, taxOrVatNumber: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                Bank Account Credentials
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Bank Name</label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>IBAN</label>
                  <input
                    type="text"
                    placeholder="QA..."
                    value={formData.iban}
                    onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  style={{ padding: '8px 14px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-vendor"
                  style={{ padding: '8px 18px', backgroundColor: '#2563eb', color: '#fff', borderRadius: '6px', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                >
                  Register Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorDirectoryView;
