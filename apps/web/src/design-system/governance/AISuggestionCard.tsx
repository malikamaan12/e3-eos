/**
 * EOS / Governance / AISuggestionCard
 * Conforms to Master Plan Section 1 & Section 6.8.
 * Guarantees AI outputs are clearly labeled as machine drafts requiring human review.
 */

import React from 'react';
import { TOKENS } from '../foundations/tokens.js';
import { Badge } from '../primitives/Badge.js';
import { Button } from '../primitives/Button.js';

export interface AISuggestionCardProps {
  title: string;
  summary: string;
  sources?: string[];
  confidenceScore?: number;
  onAcceptAsDraft?: () => void;
  onReject?: () => void;
  style?: React.CSSProperties;
}

export const AISuggestionCard: React.FC<AISuggestionCardProps> = ({
  title,
  summary,
  sources,
  confidenceScore,
  onAcceptAsDraft,
  onReject,
  style,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#faf5ff',
        border: '1px solid #d8b4fe',
        borderRadius: TOKENS.radius.card,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>✨</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#6b21a8' }}>
            AI Proposed Draft: {title}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {confidenceScore !== undefined && (
            <span style={{ fontSize: '11px', color: '#7e22ce', fontWeight: 600 }}>
              {(confidenceScore * 100).toFixed(0)}% Confidence
            </span>
          )}
          <Badge variant="purple" size="sm">
            Human Approval Required
          </Badge>
        </div>
      </div>

      <div style={{ fontSize: '13px', color: '#3b0764', lineHeight: 1.45 }}>
        {summary}
      </div>

      {sources && sources.length > 0 && (
        <div style={{ fontSize: '11px', color: '#6b21a8', borderTop: '1px dashed #e9d5ff', paddingTop: '6px' }}>
          <strong>Source Citations:</strong> {sources.join(' • ')}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
        <span style={{ fontSize: '11px', color: '#9333ea', fontStyle: 'italic' }}>
          AI assistance may draft or summarize. AI cannot approve, spend, or commit records.
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onReject && (
            <Button size="sm" variant="ghost" onClick={onReject}>
              Dismiss
            </Button>
          )}
          {onAcceptAsDraft && (
            <Button size="sm" variant="primary" style={{ backgroundColor: '#7e22ce', borderColor: '#6b21a8' }} onClick={onAcceptAsDraft}>
              Accept as Draft
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
