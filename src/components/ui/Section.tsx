import type { ReactNode } from 'react';

/**
 * Section header above a grouped card. Mirrors the iOS uppercase 13pt
 * footnote convention. `action` is an optional right-aligned link
 * (e.g. "Add", "Edit", "Export .grm") rendered in systemGreen.
 */
export function SectionLabel({
  children,
  action,
  onAction,
}: {
  children: ReactNode;
  action?: ReactNode;
  onAction?: () => void;
}) {
  return (
    <div className="section-label">
      <div className="section-label-text">{children}</div>
      {action && (
        <button className="section-label-action" onClick={onAction} type="button">
          {action}
        </button>
      )}
    </div>
  );
}

/**
 * GroupedCard — the iOS list surface. Children should be <Row> elements;
 * dividers are added between adjacent rows automatically.
 */
export function GroupedCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`grouped ${className}`.trim()}>{children}</div>;
}
