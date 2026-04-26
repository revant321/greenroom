// App shell — lays out multiple iPhone frames as a canvas, or
// shows a single navigable phone. Persisted via localStorage.

const SHOWS = [
  { id: 1, name: 'Wicked',            roles: ['Elphaba', 'Glinda u/s'], nums: 10, scenes: 18, scenesIn: 11, recs: 14 },
  { id: 2, name: 'Sweeney Todd',      roles: ['Mrs. Lovett'],           nums: 14, scenes: 22, scenesIn: 16, recs: 9  },
];

const SCREENS = [
  { key: 'home',      label: 'Home'              },
  { key: 'hub',       label: 'Show Hub'          },
  { key: 'numbers',   label: 'Musical Numbers'   },
  { key: 'number',    label: 'Number · detail'   },
  { key: 'scenes',    label: 'Scenes'            },
  { key: 'scene',     label: 'Scene · detail'    },
  { key: 'complete',  label: 'Complete show'     },
  { key: 'completed', label: 'Trophy shelf'      },
  { key: 'new',       label: 'New show'          },
  { key: 'import',    label: 'Import .grm'       },
];

function renderScreen(key, nav, show) {
  switch (key) {
    case 'home':      return <HomeScreen         nav={nav} shows={SHOWS} />;
    case 'hub':       return <ShowHubScreen      nav={nav} show={show} />;
    case 'numbers':   return <NumbersScreen      nav={nav} show={show} />;
    case 'number':    return <NumberDetailScreen nav={nav} show={show} />;
    case 'scenes':    return <ScenesScreen       nav={nav} show={show} />;
    case 'scene':     return <SceneDetailScreen  nav={nav} show={show} />;
    case 'complete':  return <CompleteScreen     nav={nav} show={show} />;
    case 'completed': return <CompletedScreen    nav={nav} />;
    case 'new':       return <NewShowScreen      nav={nav} />;
    case 'import':    return <ImportScreen       nav={nav} />;
    default:          return <HomeScreen         nav={nav} shows={SHOWS} />;
  }
}

function PhoneFrame({ screen, nav, show, labelBelow }) {
  return (
    <div data-screen-label={screen} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        width: 390, height: 844, borderRadius: 54,
        background: '#000',
        boxShadow: `
          0 0 0 2px rgba(255,255,255,0.06),
          0 0 0 10px #1b1b22,
          0 0 0 11px rgba(255,255,255,0.08),
          0 60px 120px rgba(0,0,0,0.55),
          0 20px 40px rgba(0,0,0,0.35)
        `,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* dynamic island */}
        <div style={{
          position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
          width: 122, height: 35, borderRadius: 22, background: '#000', zIndex: 80,
        }} />
        {/* status bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 70 }}>
          <IOSStatusBar dark time="7:41" />
        </div>
        {/* content */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'auto' }}>
          {renderScreen(screen, nav, show)}
        </div>
        {/* home indicator */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 90,
          height: 34, display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
          paddingBottom: 8, pointerEvents: 'none',
        }}>
          <div style={{ width: 139, height: 5, borderRadius: 100, background: 'rgba(255,255,255,0.5)' }} />
        </div>
      </div>
      {labelBelow && (
        <div style={{
          marginTop: 18, fontSize: 11, letterSpacing: 0.3, textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.55)',
        }}>{labelBelow}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// The canvas: all screens side-by-side, plus a big interactive phone on top
// ─────────────────────────────────────────────────────────────

const TWEAKS_DEFAULTS = /*EDITMODE-BEGIN*/{
  "mode": "canvas",
  "showLabels": true,
  "activeShowId": 1
}/*EDITMODE-END*/;

function App() {
  const [screen, setScreen] = React.useState(() => {
    return localStorage.getItem('gr-screen') || 'home';
  });
  const [showId, setShowId] = React.useState(() => {
    return Number(localStorage.getItem('gr-showId') || 1);
  });
  const [tweaks, setTweaks] = React.useState(TWEAKS_DEFAULTS);
  const [tweaksOpen, setTweaksOpen] = React.useState(false);

  React.useEffect(() => { localStorage.setItem('gr-screen', screen); }, [screen]);
  React.useEffect(() => { localStorage.setItem('gr-showId', String(showId)); }, [showId]);

  React.useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const setTweak = (k, v) => {
    setTweaks(t => {
      const next = { ...t, [k]: v };
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*');
      return next;
    });
  };

  const show = SHOWS.find(s => s.id === showId) || SHOWS[0];

  const nav = (k, id) => {
    if (id) setShowId(id);
    setScreen(k);
    // scroll to the interactive phone when nav is used
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const featuredScreen = screen;

  return (
    <div style={{ position: 'relative', zIndex: 2, padding: '56px 40px 80px' }}>
      {/* ─── header ─── */}
      <header style={{ maxWidth: 1280, margin: '0 auto 44px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
          <div style={{
            fontSize: 82, fontWeight: 500, color: '#fff', letterSpacing: -0.035,
            lineHeight: 1,
          }}>
            greenroom<span style={{ color: GR_COLORS.emerald }}>.</span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.2 }}>
            V0.1 · LIQUID GLASS STUDY · iOS PWA
          </div>
        </div>
        <div style={{
          marginTop: 20, maxWidth: 720, fontSize: 17,
          color: 'rgba(235,235,245,0.72)', lineHeight: 1.5,
        }}>
          A backstage companion for harmonies, blocking notes and dance videos — local-first, no cloud. Below: the full show flow, rendered as iOS 26 liquid glass on a stage-lit backdrop. Tap through the featured phone, or scan every screen on the canvas.
        </div>
      </header>

      {/* ─── Featured interactive phone ─── */}
      <section style={{ maxWidth: 1280, margin: '0 auto 90px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 390px 1fr', gap: 40, alignItems: 'center' }}>
          <FeatureCopy side="left" screen={featuredScreen} />
          <PhoneFrame screen={featuredScreen} nav={nav} show={show} />
          <FeatureCopy side="right" screen={featuredScreen} onPick={setScreen} />
        </div>
      </section>

      {/* ─── Canvas: every screen at a glance ─── */}
      <section style={{ maxWidth: 1680, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 28, padding: '0 8px' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.3 }}>
            ALL SCREENS · {SCREENS.length} VIEWS
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            Tap any phone to feature it above
          </div>
        </div>
        <div style={{ display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(390px, 1fr))',
          gap: 60,
          rowGap: 80,
          justifyItems: 'center',
        }}>
          {SCREENS.map(s => (
            <div key={s.key} onClick={() => setScreen(s.key)} style={{ cursor: 'pointer' }}>
              <PhoneFrame
                screen={s.key}
                nav={(k, id) => { if (id) setShowId(id); setScreen(k); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                show={show}
                labelBelow={s.label}
              />
            </div>
          ))}
        </div>
      </section>

      <footer style={{
        maxWidth: 1280, margin: '120px auto 0', padding: '36px 0 0',
        borderTop: '0.5px solid rgba(255,255,255,0.12)', display: 'flex', justifyContent: 'space-between',
        fontSize: 12, color: 'rgba(255,255,255,0.45)',
      }} >
        <span>GREENROOM · LOCAL-ONLY · INDEXEDDB</span>
        <span>STAGE LIGHT ↔ GLASS ↔ BACKSTAGE INK</span>
      </footer>

      {/* ─── Tweaks panel ─── */}
      {tweaksOpen && (
        <div style={{
          position: 'fixed', right: 24, bottom: 24, width: 300, zIndex: 100,
        }}>
          <Glass r={14} tint="rgba(30,30,32,0.85)" blur={24}>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: GR_COLORS.emerald, letterSpacing: 0.3 }}>TWEAKS</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }} onClick={() => setTweaksOpen(false)}>close</div>
              </div>
              <TweakField label="Jump to screen">
                <select
                  value={screen} onChange={(e) => setScreen(e.target.value)}
                  style={selectStyle}
                >
                  {SCREENS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </TweakField>
              <TweakField label="Active show">
                <select
                  value={showId} onChange={(e) => setShowId(Number(e.target.value))}
                  style={selectStyle}
                >
                  {SHOWS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </TweakField>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 6, lineHeight: 1.45 }}>
                Toggle tweaks off to hide this panel. Navigate by tapping any phone or using in-screen back/CTAs.
              </div>
            </div>
          </Glass>
        </div>
      )}
    </div>
  );
}

const selectStyle = {
  width: '100%', padding: '8px 10px', borderRadius: 10,
  background: 'rgba(255,255,255,0.06)',
  border: '0.5px solid rgba(255,255,255,0.12)',
  color: '#fff', fontSize: 13, fontFamily: 'inherit',
  appearance: 'none', outline: 'none',
};

function TweakField({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.2, marginBottom: 6, textTransform: 'uppercase' }}>{label}</div>
      {children}
    </div>
  );
}

function FeatureCopy({ side, screen, onPick }) {
  const info = {
    home:      { k: '01', t: 'Homepage',             d: 'Active shows as glass cards, each glowing with a role-accent. Trophy icon jumps to completed work. New-show and import live as floating glass pills.' },
    hub:       { k: '02', t: 'Show Hub',             d: 'Two big destinations — numbers and scenes — as glass tiles with atmospheric blooms. Quick-jump to recent work, plus the path to completion.' },
    numbers:   { k: '03', t: 'Musical Numbers',      d: 'Running-order list with monospaced number chips. Dance video chips preview in-row. The current hot number lights up in emerald.' },
    number:    { k: '04', t: 'Number · Detail',      d: 'Harmonies with measure numbers and live waveforms, dance videos as glass cards, free-text notes in a soft frosted panel.' },
    scenes:    { k: '05', t: 'Scenes',               d: 'Tappable for scenes you’re in; muted and marked NOT IN for the rest — the list stays complete for context without competing for attention.' },
    scene:     { k: '06', t: 'Scene · Detail',       d: 'Notes + audio/video recordings, with a persistent capture bar anchored at the bottom. One-tap record in amber; upload for existing files.' },
    complete:  { k: '07', t: 'Complete Flow',        d: 'Three independent switches for cleanup. Notes always clear; structure always stays. Destructive actions read warm, safe ones read cool.' },
    completed: { k: '08', t: 'Trophy Shelf',         d: 'Shows at rest — read-only, with the kept-media chip so you know what you have. Great to revisit blocking years later.' },
    new:       { k: '09', t: 'New Show',             d: 'Inline glass fields with a blinking emerald caret. Roles are removable chips. Templates as horizontally-scrolling pills.' },
    import:    { k: '10', t: 'Import .grm',          d: 'Detected duplicate prompts keep-both / replace / skip. Destructive option gets a warm glass tint so the eye spots risk before a tap.' },
  }[screen] || { k: '--', t: '—', d: '—' };

  if (side === 'left') {
    return (
      <div style={{ textAlign: 'right', paddingRight: 10 }}>
        <div style={{
          fontSize: 12, color: GR_COLORS.emerald, letterSpacing: 0.3,
        }}>SCREEN {info.k}</div>
        <div style={{
          fontSize: 48, fontWeight: 500, color: '#fff', lineHeight: 1.05,
          letterSpacing: -0.02, marginTop: 6,
        }}>{info.t}</div>
        <div style={{
          fontSize: 15, color: 'rgba(235,235,245,0.72)', lineHeight: 1.55,
          marginTop: 14, marginLeft: 'auto', maxWidth: 340,
        }}>{info.d}</div>
      </div>
    );
  }
  // right — system notes + tap-through shortcuts
  return (
    <div style={{ paddingLeft: 10 }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.3, marginBottom: 10 }}>
        GLASS SYSTEM
      </div>
      <ul style={{
        listStyle: 'none', padding: 0, margin: 0, fontSize: 13,
        color: 'rgba(235,235,245,0.72)', lineHeight: 1.8,
      }}>
        <li>· stage-lit backdrop w/ colored blooms</li>
        <li>· frosted surfaces @ 22px · 180% saturate</li>
        <li>· specular top + warm inner edge</li>
        <li>· monospace labels, fraunces</li>
        <li>· emerald for “yours” · amber for scene · red for destructive</li>
      </ul>

      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.3, margin: '24px 0 10px' }}>
        JUMP TO
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {SCREENS.map(s => (
          <div
            key={s.key}
            onClick={() => onPick(s.key)}
            style={{
              padding: '6px 10px', borderRadius: 999,
              border: `0.5px solid ${screen === s.key ? GR_COLORS.emerald : 'rgba(255,255,255,0.15)'}`,
              background: screen === s.key ? 'rgba(120,220,180,0.15)' : 'rgba(255,255,255,0.04)',
              color: screen === s.key ? GR_COLORS.emerald : 'rgba(255,255,255,0.75)',
              fontSize: 11, letterSpacing: 0.2, cursor: 'pointer',
            }} >
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
