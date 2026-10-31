// Icon component - Material Symbols Outlined
// Follows design tokens and contrast rules.
// Font settings: FILL 0, wght 400, GRAD 0, opsz 24.

import React from 'react';

interface IconProps {
  name: string;
  size?: number; // 20px (button/meta), 24px (icon-box), 32px (empty-state)
  color?: string; // CSS color string or variable
  className?: string;
  style?: React.CSSProperties;
  'aria-hidden'?: boolean | 'true' | 'false';
  'aria-label'?: string;
}

export function Icon({
  name,
  size = 20,
  color,
  className = '',
  style,
  'aria-hidden': ariaHidden,
  'aria-label': ariaLabel,
}: IconProps) {
  const isHidden = ariaLabel ? undefined : (ariaHidden ?? true);

  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{
        fontSize: size,
        color: color || undefined,
        fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
        ...style,
      }}
      aria-hidden={isHidden}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      {name}
    </span>
  );
}

export default Icon;
