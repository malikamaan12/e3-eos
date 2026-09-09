import React, { useState } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { useEosApi } from '../hooks/useEosApi.js';
import { Button } from './DesignSystem.js';

interface RequestApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprovalRequested: (request: any) => void;
  projectId: string;
}

export const RequestApprovalModal: React.FC<RequestApprovalModalProps> = ({
  isOpen,
  onClose,
  onApprovalRequested,
  projectId,
}) => {
  const { currentLanguage, triggerRefresh } = useEosContext();
  const { client } = useEosApi();

  const [targetType, setTargetType] = useState<string>('task');
  const [targetId, setTargetId] = useState<string>('d1111111-1111-4111-8111-111111111111');
  const [reason, setReason] = useState<string>('Sign-off on Rigging Calculations & Structural Certification');
  const [requiredRole, setRequiredRole] = useState<string>('executive');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await client.requestApproval(projectId, {
        targetType,
        targetId,
        reason,
        requiredRole,
      });
      onApprovalRequested(res.data);
      triggerRefresh();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to request approval in PostgreSQL');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          width: '100%',
          maxWidth: '540px',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          border: '1px solid #cbd5e1',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
            {currentLanguage === 'ar' ? 'طلب توقيع موافقة حوكمة رسمية' : 'Request Governance Approval Sign-off'}
          </h3>
          <button
            onClick={onClose}
            style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {error && (
            <div style={{ padding: '10px', backgroundColor: '#fef2f2', border: '1px solid #f87171', borderRadius: '6px', color: '#991b1b', marginBottom: '14px', fontSize: '12px' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              {currentLanguage === 'ar' ? 'نوع المستند أو المخرج المستهدف' : 'Target Type'}
            </label>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            >
              <option value="task">Deliverable Task Completion</option>
              <option value="proposal">Commercial Proposal & Margin Scenario</option>
              <option value="drawing_set">Technical CAD Drawing Set Freeze</option>
              <option value="purchase_order">Commercial PO Commitment (&gt;100k QAR)</option>
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              {currentLanguage === 'ar' ? 'معرّف المخرج / العنصر المستهدف' : 'Target Entity Identifier'}
            </label>
            <input
              type="text"
              required
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'monospace' }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              {currentLanguage === 'ar' ? 'سبب ومبررات طلب الموافقة' : 'Sign-off Justification & Context'}
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              {currentLanguage === 'ar' ? 'الدور المطلوب للتوقيع (Decider Role)' : 'Required Decider Role'}
            </label>
            <select
              value={requiredRole}
              onChange={(e) => setRequiredRole(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            >
              <option value="executive">Executive Partner (Nasser Al-Attiyah)</option>
              <option value="project_director">Project Director (Fatima Al-Sulaiti)</option>
              <option value="finance">Financial Controller (Rashid Al-Hajri)</option>
            </select>
          </div>

          <div style={{ padding: '10px 12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '11px', color: '#166534', marginBottom: '16px' }}>
            🔒 <strong>Adversarial Invariant:</strong> The approval request creates a cryptographically hashed pending decision in PostgreSQL <code>approval_requests</code>. Self-approval is blocked by policy POL-GOV-01.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
              {currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button id="btn-submit-approval" variant="primary" size="sm" type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? (currentLanguage === 'ar' ? 'جارِ الإرسال...' : 'Submitting to DB...')
                : (currentLanguage === 'ar' ? 'إرسال طلب الموافقة' : 'Submit Approval Request')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
