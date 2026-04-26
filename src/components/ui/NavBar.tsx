import type { ReactNode } from 'react';
import { Icon } from './Icon';

/**
 * iOS large-title nav bar.
 *
 * - Chrome glass back/menu pills (40×40) sit on a translucent surface
 *   that refracts whatever is scrolling behind. The page itself sits on
 *   pure black.
 * - Eyebrow appears above the title for context (e.g. "Sweeney Todd · #10").
 * - `right` slot is rendered before the menu pill — use it for "Save",
 *   trophy icons, etc. Pass `onMenu={false}` to hide the ellipsis.
 * - `noBack` removes the back pill (Home screen).
 */

type NavBarProps = {
  title: ReactNode;
  eyebrow?: ReactNode;
  onBack?: () => void;
  noBack?: boolean;
  onMenu?: boolean | (() => void);
  right?: ReactNode;
};

export function NavBar({
  title,
  eyebrow,
  onBack,
  noBack = false,
  onMenu = false,
  right,
}: NavBarProps) {
  return (
    <div className="nav">
      <div className="nav-row">
        {!noBack ? (
          <button className="chrome-btn" onClick={onBack} aria-label="Back">
            <Icon.ChevronLeft size={18} />
          </button>
        ) : (
          <div style={{ width: 40 }} aria-hidden />
        )}
        <div className="nav-right">
          {right}
          {onMenu && (
            <button
              className="chrome-btn"
              onClick={typeof onMenu === 'function' ? onMenu : undefined}
              aria-label="More"
            >
              <Icon.Ellipsis size={20} />
            </button>
          )}
        </div>
      </div>
      <div className="nav-title-wrap">
        {eyebrow && <div className="nav-eyebrow">{eyebrow}</div>}
        <div className="nav-title">{title}</div>
      </div>
    </div>
  );
}
