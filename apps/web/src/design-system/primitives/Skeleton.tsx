/**
 * EOS / Primitive / Skeleton
 * Conforms to Master Plan Section 6.1 and Section 10 (Universal State Matrix: Loading).
 */

import React from 'react';
import { TOKENS } from '../foundations/tokens.js';

export interface SkeletonProps {
  variant?: 'text' | 'rect' | 'circle' | 'card' | 'table';
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  borderRadius,
  style,
}) => {
  const defaultHeights: Record<string, string> = {
    text: '16px',
    rect: '100px',
    circle: '40px',
    card: '180px',
    table: '240px',
  };

  const defaultWidths: Record<string, string> = {
    text: '100%',
    rect: '100%',
    circle: '40px',
    card: '100%',
    table: '100%',
  };

  const computedHeight = height || defaultHeights[variant];
  const computedWidth = width || defaultWidths[variant];
  const computedRadius =
    borderRadius || (variant === 'circle' ? '50%' : variant === 'card' ? TOKENS.radius.card : TOKENS.radius.control);

  return (
    <div
      style={{
        width: computedWidth,
        height: computedHeight,
        borderRadius: computedRadius,
        backgroundColor: '#e2e8f0',
        backgroundImage: 'linear-gradient(90deg, #e2e8f0 0px, #f1f5f9 40px, #e2e8f0 80px)',
        backgroundSize: '300% 100%',
        animation: 'e3-skeleton-pulse 1.4s ease-in-out infinite',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <style>{`
        @keyframes e3-skeleton-pulse {
          0% { background-position: 100% 50%; }
          100% { background-position: 0 50%; }
        }
      `}</style>
    </div>
  );
};
