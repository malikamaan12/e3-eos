/**
 * EOS / Primitive / Switch & Checkbox
 * Conforms to Master Plan Section 6.1.
 */

import React from 'react';
import { TOKENS } from '../foundations/tokens.js';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  id,
}) => {
  return (
    <label
      htmlFor={id}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        userSelect: 'none',
      }}
    >
      <div
        onClick={() => !disabled && onChange(!checked)}
        style={{
          width: '38px',
          height: '20px',
          borderRadius: '10px',
          backgroundColor: checked ? TOKENS.brand.accent : '#cbd5e1',
          position: 'relative',
          transition: `background-color ${TOKENS.motion.fast}`,
        }}
      >
        <div
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            position: 'absolute',
            top: '2px',
            left: checked ? '20px' : '2px',
            transition: `left ${TOKENS.motion.fast}`,
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          }}
        />
      </div>
      {label && <span style={{ fontSize: '13px', fontWeight: 500, color: TOKENS.text.primary.light }}>{label}</span>}
    </label>
  );
};

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, id, style, ...props }) => {
  return (
    <label
      htmlFor={id}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        color: TOKENS.text.primary.light,
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.5 : 1,
        userSelect: 'none',
      }}
    >
      <input
        id={id}
        type="checkbox"
        style={{
          width: '16px',
          height: '16px',
          accentColor: TOKENS.brand.accent,
          cursor: 'inherit',
          ...style,
        }}
        {...props}
      />
      {label && <span>{label}</span>}
    </label>
  );
};
