/**
 * Playbill spine — the colored role-accent tile shown to the left of
 * show cards on Home + Completed. Two-letter monogram derived from
 * the show name. Color is a flat `hsl(H 50% 40%)` per the design.
 *
 * `accent` is the hex/hsl background fill. Use `hueFromName(name)` to
 * derive a stable hue; on Home the first show is systemGreen, the
 * second is systemOrange, etc.
 */

export function Spine({
  name,
  accent,
  size = 'md',
}: {
  name: string;
  accent: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const initials = name
    .split(/\s+/)
    .map(w => w[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('');

  const dims =
    size === 'lg' ? { w: 56, h: 70, fs: 28 } :
    size === 'sm' ? { w: 44, h: 56, fs: 18 } :
    { w: 52, h: 66, fs: 22 };

  return (
    <div
      className="spine"
      style={{
        width: dims.w,
        height: dims.h,
        background: accent,
        fontSize: dims.fs,
      }}
      aria-hidden
    >
      {initials}
    </div>
  );
}

/** Derive a stable hue from a string for the trophy-shelf flat tiles. */
export function hueFromName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % 360;
}

/** `hsl(H 50% 40%)` — the design's flat tile recipe. */
export function spineColor(name: string): string {
  return `hsl(${hueFromName(name)} 50% 40%)`;
}
