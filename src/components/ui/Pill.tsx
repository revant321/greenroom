import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * Pill button — height 50, radius 999, three variants:
 * - glass    (default) — chrome backdrop-filter, white text
 * - primary             — filled systemGreen, white text, 600 weight
 * - tinted              — translucent green, green text, 600 weight
 * - danger              — filled systemRed, white text
 */

type Variant = 'glass' | 'primary' | 'tinted' | 'danger';

type PillProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  compact?: boolean;
  children: ReactNode;
};

export function Pill({
  variant = 'glass',
  compact = false,
  className = '',
  children,
  ...rest
}: PillProps) {
  const cls = [
    'pill',
    variant !== 'glass' && variant,
    compact && 'compact',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
