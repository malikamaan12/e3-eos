/**
 * EOS / Governance / ApprovalCard & DecisionPanel
 * Conforms to Master Plan Section 6.5 and Section 8.5 (Approval Workspace).
 */

import React, { useState } from 'react';
import { TOKENS } from '../foundations/tokens.js';
import { Badge } from '../primitives/Badge.js';
import { Button } from '../primitives/Button.js';
import { Textarea } from '../primitives/Input.js';

export interface ApprovalRequestItem {
  id: string;
  projectCode: string;
  title: string;
  requesterName: string;
  requesterRole: string;
  submittedAt: string;
  amount?: string;
  governancePillar: string;
  status: 'pending' | 'approved' | 'rejected' | 'returned';
  slaHoursRemaining?: number;
}

export interface ApprovalCardProps {
  request: ApprovalRequestItem;
  onApprove?: (id: string, reason: string) => void;
  onReject?: (id: string, reason: string) => void;
  style?: React.CSSProperties;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({
  request,
  onApprove,
  onReject,
  style,
}) => {
  const [isDecisionOpen, setIsDecisionOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<'approve' | 'reject'>('approve');
  const [reason, setReason] = useState('');

  const isOverdue = request.slaHoursRemaining !== undefined && request.slaHoursRemaining <= 0;

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: `1px solid ${TOKENS.border.default.light}`,
        borderRadius: TOKENS.radius.card,
        padding: '16px 20px',
        boxShadow: TOKENS.elevation.level1,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: TOKENS.text.muted.light }}>
              {request.projectCode} • {request.governancePillar}
            </span>
            <Badge
              variant={
                request.status === 'approved'
                  ? 'success'
                  : request.status === 'rejected'
                  ? 'danger'
                  : 'warning'
              }
              size="sm"
            >
              {request.status.toUpperCase()}
            </Badge>
          </div>
          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: TOKENS.text.primary.light }}>
            {request.title}
          </h4>
          <div style={{ fontSize: '12px', color: TOKENS.text.secondary.light, marginTop: '4px' }}>
            Requested by <strong>{request.requesterName}</strong> ({request.requesterRole}) on {request.submittedAt}
          </div>
        </div>

        {request.amount && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: TOKENS.text.muted.light, textTransform: 'uppercase' }}>
              Impact Value
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: TOKENS.text.primary.light, fontVariantNumeric: 'tabular-nums' }}>
              {request.amount}
            </div>
          </div>
        )}
      </div>

      {request.slaHoursRemaining !== undefined && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 600,
            color: isOverdue ? '#dc2626' : '#92400e',
            backgroundColor: isOverdue ? '#fef2f2' : '#fffbeb',
            padding: '4px 8px',
            borderRadius: '4px',
            width: 'fit-content',
          }}
        >
          <span>⏱️ SLA:</span>
          <span>{isOverdue ? 'Overdue for review' : `${request.slaHoursRemaining}h remaining to sign-off`}</span>
        </div>
      )}

      {request.status === 'pending' && !isDecisionOpen && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <Button
            size="sm"
            variant="success"
            onClick={() => {
              setDecisionType('approve');
              setIsDecisionOpen(true);
            }}
          >
            ✓ Authorize (Four-Eyes)
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              setDecisionType('reject');
              setIsDecisionOpen(true);
            }}
          >
            ✕ Reject Request
          </Button>
        </div>
      )}

      {isDecisionOpen && (
        <div
          style={{
            backgroundColor: TOKENS.surface.sunken.light,
            padding: '12px',
            borderRadius: TOKENS.radius.control,
            border: `1px solid ${TOKENS.border.default.light}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.text.primary.light }}>
            {decisionType === 'approve' ? 'Confirmation Reason (Audit Record):' : 'Rejection Reason (Mandatory):'}
          </div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="State governance rationale for this decision..."
            style={{
              width: '100%',
              minHeight: '60px',
              padding: '8px',
              fontSize: '12px',
              borderRadius: '4px',
              border: `1px solid ${TOKENS.border.strong.light}`,
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button size="sm" variant="secondary" onClick={() => setIsDecisionOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant={decisionType === 'approve' ? 'success' : 'danger'}
              disabled={decisionType === 'reject' && !reason.trim()}
              onClick={() => {
                if (decisionType === 'approve' && onApprove) onApprove(request.id, reason);
                if (decisionType === 'reject' && onReject) onReject(request.id, reason);
                setIsDecisionOpen(false);
              }}
            >
              Confirm {decisionType === 'approve' ? 'Approval' : 'Rejection'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
