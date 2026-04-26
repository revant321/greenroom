import type { ReactNode } from 'react';
import { Icon } from './Icon';

/**
 * Row inside a GroupedCard.
 * - `leading`  — chip/icon on the left
 * - `title`    — main label (17pt/500)
 * - `subtitle` — secondary label (13pt/secondary)
 * - `trailing` — chevron/badge on the right (chevron added by default if
 *                onClick is set and trailing is undefined)
 * - `dense`    — 44px min-height instead of 56px, tighter padding
 * - `muted`    — 35% opacity, non-tappable (used for "not in" scenes)
 */

export type RowProps = {
  leading?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  dense?: boolean;
  muted?: boolean;
  className?: string;
};

export function Row({
  leading,
  title,
  subtitle,
  trailing,
  onClick,
  dense = false,
  muted = false,
  className = '',
}: RowProps) {
  const isTappable = !!onClick && !muted;
  const computedTrailing =
    trailing === undefined && isTappable ? <Icon.ChevronRight /> : trailing;

  return (
    <div
      className={[
        'row',
        dense && 'dense',
        muted && 'muted',
        isTappable && 'tappable',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={isTappable ? onClick : undefined}
      role={isTappable ? 'button' : undefined}
      tabIndex={isTappable ? 0 : undefined}
    >
      {leading}
      {(title || subtitle) && (
        <div className="row-body">
          {title && <div className="row-title">{title}</div>}
          {subtitle && <div className="row-subtitle">{subtitle}</div>}
        </div>
      )}
      {computedTrailing && <div className="row-trailing">{computedTrailing}</div>}
    </div>
  );
}

/** Numbered chip used as `leading` in number/scene rows. */
export function NumberChip({
  n,
  variant = 'default',
}: {
  n: number | string;
  variant?: 'default' | 'active' | 'warm' | 'dashed';
}) {
  const cls =
    variant === 'active' ? 'row-chip active'
    : variant === 'warm' ? 'row-chip warm'
    : variant === 'dashed' ? 'row-chip dashed'
    : 'row-chip';
  return <div className={cls}>{typeof n === 'number' ? String(n).padStart(2, '0') : n}</div>;
}

/** Small colored pip for the Quick Jump rows on Show Hub. */
export function Pip({ color }: { color: string }) {
  return (
    <div
      style={{
        width: 10,
        height: 10,
        borderRadius: 5,
        background: color,
        flexShrink: 0,
      }}
      aria-hidden
    />
  );
}
