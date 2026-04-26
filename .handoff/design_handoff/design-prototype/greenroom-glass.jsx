// Liquid glass primitives for greenroom.
// Everything reads from a stage background; glass refracts what's behind it.

// Native iOS dark system colors (matches iOS 17/26 system greys + system tint).
const GR_COLORS = {
  // systemBackground (dark)
  bg:           '#000000',
  // secondarySystemBackground (dark)
  bg2:          '#1C1C1E',
  // tertiarySystemBackground (dark) — grouped list cards sit on this
  bg3:          '#2C2C2E',
  // systemGroupedBackground (dark)
  grouped:      '#000000',
  // separator (dark, non-opaque equiv)
  separator:    'rgba(84,84,88,0.6)',
  // system tint (iOS "systemGreen", used sparingly as accent)
  emerald:      '#30D158',
  // system orange for scene/warm accents
  amber:        '#FF9F0A',
  // destructive systemRed
  red:          '#FF453A',
};

// Full-frame background. Native iOS uses a flat system color.
// `variant` is kept as a prop for API compatibility but always returns the
// same neutral near-black — no gradients, no blooms.
function StageBG({ variant = 'night', children }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#000000',
      overflow: 'hidden',
    }}>
      {children}
    </div>
  );
}

// Native iOS "material" surface. On dark mode iOS, grouped-list cards sit on
// secondarySystemGroupedBackground (#1C1C1E). Glass pills/toolbars use a thin
// chromeMaterialDark tint (rgba(40,40,40,0.72)) + backdrop blur.
function Glass({
  children, style, r = 18, tint, blur, border = true, highlight = true,
  shadow = true, onClick, solid = false,
}) {
  // `solid` means a native grouped-card surface (no blur). Default otherwise
  // is a light chrome/toolbar glass.
  const isSolid = solid;
  const bg = tint ?? (isSolid ? '#1C1C1E' : 'rgba(40,40,40,0.62)');
  const _blur = blur ?? (isSolid ? 0 : 28);
  return (
    <div onClick={onClick} style={{
      position: 'relative', borderRadius: r, overflow: 'hidden',
      cursor: onClick ? 'pointer' : undefined,
      boxShadow: shadow && !isSolid
        ? '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.25)'
        : 'none',
      ...style,
    }}>
      {/* tint + blur */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: r,
        background: bg,
        backdropFilter: _blur ? `blur(${_blur}px) saturate(160%)` : undefined,
        WebkitBackdropFilter: _blur ? `blur(${_blur}px) saturate(160%)` : undefined,
      }} />
      {/* very subtle top sheen on glass (not solid) */}
      {highlight && !isSolid && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: r, pointerEvents: 'none',
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%)',
        }} />
      )}
      {/* hairline edge — iOS uses 0.33pt separators */}
      {border && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: r, pointerEvents: 'none',
          border: isSolid
            ? 'none'
            : '0.5px solid rgba(255,255,255,0.08)',
        }} />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}

// Pill button. Variants: glass (default), tinted, primary.
function GlassPill({ children, variant = 'glass', onClick, style, accent }) {
  if (variant === 'primary') {
    return (
      <div onClick={onClick} style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        height: 50, padding: '0 22px', borderRadius: 999,
        background: accent || GR_COLORS.emerald,
        color: '#fff', fontWeight: 600, fontSize: 17, letterSpacing: -0.24,
        cursor: 'pointer',
        ...style,
      }}>{children}</div>
    );
  }
  // "tinted" = iOS tinted button (translucent accent), "glass" = chrome
  const tint = variant === 'tinted'
    ? 'rgba(48,209,88,0.18)'
    : 'rgba(58,58,60,0.72)';
  return (
    <Glass r={999} tint={tint} style={{ display: 'inline-flex', ...style }} onClick={onClick}>
      <div style={{
        height: 50, padding: '0 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 8,
        color: variant === 'tinted' ? GR_COLORS.emerald : '#fff',
        fontWeight: variant === 'tinted' ? 600 : 500,
        fontSize: 17, letterSpacing: -0.24,
      }}>{children}</div>
    </Glass>
  );
}

// Small round chrome icon button (40×40) — like iOS nav pills.
function GlassIconBtn({ children, onClick, size = 40, style }) {
  return (
    <Glass r={999} tint="rgba(58,58,60,0.72)" style={{ ...style }} onClick={onClick}>
      <div style={{
        width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(255,255,255,0.92)',
      }}>{children}</div>
    </Glass>
  );
}

// Row used inside list cards. Provides its own separator (0.5px white/6%).
function GlassRow({ leading, title, subtitle, trailing, onClick, last, dense, muted }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: dense ? '10px 16px' : '14px 16px',
      borderBottom: last ? 'none' : '0.5px solid rgba(255,255,255,0.08)',
      opacity: muted ? 0.35 : 1,
      cursor: onClick && !muted ? 'pointer' : 'default',
      minHeight: dense ? 44 : 56,
    }}>
      {leading}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color: '#fff', fontSize: 17, fontWeight: 500, letterSpacing: -0.24,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{title}</div>
        {subtitle && (
          <div style={{
            color: 'rgba(235,235,245,0.6)', fontSize: 15, marginTop: 2, letterSpacing: -0.24,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{subtitle}</div>
        )}
      </div>
      {trailing}
    </div>
  );
}

// Section header — iOS uppercase grey footnote style.
function SectionLabel({ children, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      padding: '28px 20px 7px',
    }}>
      <div style={{
        fontSize: 13, letterSpacing: -0.08, textTransform: 'uppercase',
        color: 'rgba(235,235,245,0.6)', fontWeight: 400,
      }}>{children}</div>
      {action && (
        <div style={{ color: GR_COLORS.emerald, fontSize: 15, fontWeight: 400 }}>{action}</div>
      )}
    </div>
  );
}

// iOS large-title nav bar. Chrome pills for back / ellipsis.
function GrNavBar({ title, onBack, onMenu = true, right, eyebrow, display, noBack }) {
  return (
    <div style={{ paddingTop: 58, paddingBottom: 8, position: 'relative', zIndex: 5 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', gap: 8,
      }}>
        {!noBack ? (
          <GlassIconBtn onClick={onBack}>
            <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
              <path d="M10 2L2 10l8 8" stroke="rgba(255,255,255,0.95)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </GlassIconBtn>
        ) : <div style={{ width: 40 }} />}
        <div style={{ display: 'flex', gap: 8 }}>
          {right}
          {onMenu && (
            <GlassIconBtn>
              <svg width="22" height="6" viewBox="0 0 22 6">
                <circle cx="3" cy="3" r="2.2" fill="rgba(255,255,255,0.95)"/>
                <circle cx="11" cy="3" r="2.2" fill="rgba(255,255,255,0.95)"/>
                <circle cx="19" cy="3" r="2.2" fill="rgba(255,255,255,0.95)"/>
              </svg>
            </GlassIconBtn>
          )}
        </div>
      </div>
      <div style={{ padding: '14px 20px 0' }}>
        {eyebrow && (
          <div style={{
            fontSize: 13, letterSpacing: -0.08,
            color: 'rgba(235,235,245,0.6)', marginBottom: 4,
          }}>{eyebrow}</div>
        )}
        <div style={{
          color: '#fff',
          fontSize: 34,
          fontWeight: 700,
          lineHeight: 1.05, letterSpacing: -0.022,
        }}>{title}</div>
      </div>
    </div>
  );
}

// Waveform glyph (svg) — uses white with emerald overlay
function Waveform({ w = 130, h = 28, seed = 1, playing, progress = 0.3 }) {
  const bars = 36;
  const rng = (i) => {
    // deterministic pseudo-random so the svg stays stable
    const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  const barW = (w - (bars - 1) * 1.5) / bars;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {Array.from({ length: bars }).map((_, i) => {
        const r = rng(i);
        const envelope = Math.sin((i / bars) * Math.PI) * 0.9 + 0.1;
        const bh = Math.max(2, h * envelope * (0.35 + r * 0.65));
        const x = i * (barW + 1.5);
        const y = (h - bh) / 2;
        const active = i / bars < progress;
        return (
          <rect key={i} x={x} y={y} width={barW} height={bh} rx={barW / 2}
            fill={active ? GR_COLORS.emerald : 'rgba(255,255,255,0.55)'}
          />
        );
      })}
    </svg>
  );
}

// Icon helpers
const Icon = {
  trophy: (c='rgba(255,255,255,0.9)') => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M7 4h10v4a5 5 0 01-10 0V4z" stroke={c} strokeWidth="1.7"/>
      <path d="M7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3" stroke={c} strokeWidth="1.7"/>
      <path d="M10 13v3M14 13v3M8 19h8M9 16h6" stroke={c} strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  ),
  plus: (c='rgba(255,255,255,0.95)') => (
    <svg width="20" height="20" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke={c} strokeWidth="2.2" strokeLinecap="round"/></svg>
  ),
  chev: (c='rgba(255,255,255,0.4)', size=14) => (
    <svg width={size*0.57} height={size} viewBox="0 0 8 14"><path d="M1 1l6 6-6 6" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  note: (c='rgba(255,255,255,0.9)') => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M9 18V6l10-2v12" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="7" cy="18" r="2.5" stroke={c} strokeWidth="1.8"/>
      <circle cx="17" cy="16" r="2.5" stroke={c} strokeWidth="1.8"/>
    </svg>
  ),
  mic: (c='rgba(255,255,255,0.9)') => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="3" width="6" height="12" rx="3" stroke={c} strokeWidth="1.8"/>
      <path d="M5 11a7 7 0 0014 0M12 18v3" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  video: (c='rgba(255,255,255,0.9)') => (
    <svg width="20" height="18" viewBox="0 0 24 20" fill="none">
      <rect x="2" y="3" width="15" height="14" rx="2.5" stroke={c} strokeWidth="1.8"/>
      <path d="M17 8l5-3v10l-5-3V8z" stroke={c} strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  ),
  play: (c='#fff') => (
    <svg width="14" height="16" viewBox="0 0 14 16"><path d="M2 2v12l10-6L2 2z" fill={c}/></svg>
  ),
  pause: (c='#fff') => (
    <svg width="12" height="14" viewBox="0 0 12 14"><rect x="1" y="1" width="3" height="12" rx="1" fill={c}/><rect x="8" y="1" width="3" height="12" rx="1" fill={c}/></svg>
  ),
  check: (c='#fff') => (
    <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 7l3.5 3.5L12 3.5" stroke={c} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  import: (c='rgba(255,255,255,0.9)') => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 3v13m0 0l-5-5m5 5l5-5M4 20h16" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
};

Object.assign(window, {
  GR_COLORS, StageBG, Glass, GlassPill, GlassIconBtn, GlassRow, SectionLabel,
  GrNavBar, Waveform, Icon,
});
