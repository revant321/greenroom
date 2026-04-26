/**
 * Waveform — 36 bars, deterministic pseudo-random heights so the same
 * `seed` always renders the same wave. Bars left of `progress` (0–1)
 * fill with the accent color.
 *
 * The pattern matches the design ref: envelope-shaped (sin curve) so
 * the bars taper toward each end like a real audio clip preview.
 */
export function Waveform({
  w = 130,
  h = 28,
  seed = 1,
  progress = 0,
  color = 'rgba(255,255,255,0.55)',
  activeColor = 'var(--accent)',
}: {
  w?: number;
  h?: number;
  seed?: number;
  progress?: number;
  color?: string;
  activeColor?: string;
}) {
  const bars = 36;
  const barW = (w - (bars - 1) * 1.5) / bars;

  const rng = (i: number) => {
    const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => {
        const r = rng(i);
        const envelope = Math.sin((i / bars) * Math.PI) * 0.9 + 0.1;
        const bh = Math.max(2, h * envelope * (0.35 + r * 0.65));
        const x = i * (barW + 1.5);
        const y = (h - bh) / 2;
        const active = i / bars < progress;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={bh}
            rx={barW / 2}
            fill={active ? activeColor : color}
          />
        );
      })}
    </svg>
  );
}
