/**
 * EOS / Composite / EmptyState
 * Conforms to Master Plan Section 6.3 and Section 10 (Universal State Matrix: Empty).
 */

import React from 'react';
import { TOKENS } from '../foundations/tokens.js';
import { Button } from '../primitives/Button.js';

export interface EmptyStateProps {
  icon?: string | React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'accent' | 'secondary';
  };
  style?: React.CSSProperties;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📂',
  title,
  description,
  action,
  style,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        backgroundColor: '#ffffff',
        border: `1px dashed ${TOKENS.border.strong.light}`,
        borderRadius: TOKENS.radius.card,
        textAlign: 'center',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div style={{ fontSize: '36px', marginBottom: '12px' }}>{icon}</div>
      <h3
        style={{
          margin: '0 0 6px 0',
          fontSize: '16px',
          fontWeight: 700,
          color: TOKENS.text.primary.light,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: '0 0 16px 0',
          fontSize: '13px',
          color: TOKENS.text.secondary.light,
          maxWidth: '440px',
          lineHeight: 1.4,
        }}
      >
        {description}
      </p>
      {action && (
        <Button
          variant={action.variant || 'primary'}
          size="md"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};
