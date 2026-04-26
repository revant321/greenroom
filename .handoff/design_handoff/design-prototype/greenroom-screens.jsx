// Screen components for greenroom. Each expects a `nav` (fn) + state props.

// ─────────────────────────────────────────────────────────────
// Home
// ─────────────────────────────────────────────────────────────
function HomeScreen({ nav, shows }) {
  const active = shows.filter(s => !s.completed);
  return (
    <StageBG variant="night">
      <GrNavBar
        noBack
        eyebrow="Backstage · 2 Active Shows"
        title="greenroom."
        right={
          <GlassIconBtn onClick={() => nav('completed')}>
            {Icon.trophy()}
          </GlassIconBtn>
        }
      />

      <div style={{ padding: '14px 16px 12px' }}>
        {active.map((s, i) => (
          <div key={s.id} style={{ marginBottom: 14 }}>
            <ShowCard show={s} onOpen={() => nav('hub', s.id)} accent={i === 0 ? GR_COLORS.emerald : GR_COLORS.amber} />
          </div>
        ))}
      </div>

      <SectionLabel>Storage · On this device</SectionLabel>
      <div style={{ padding: '0 16px' }}>
        <Glass r={14} solid>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 14, color: 'rgba(235,235,245,0.75)' }}>218 MB of audio · 4 recordings</span>
              <span style={{ fontSize: 12, color: GR_COLORS.emerald }}>LOCAL</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <div style={{
                width: '38%', height: '100%',
                background: GR_COLORS.emerald,
                
              }} />
            </div>
          </div>
        </Glass>
      </div>

      {/* Floating action pills */}
      <div style={{
        position: 'absolute', bottom: 44, left: 0, right: 0,
        padding: '0 16px', display: 'flex', gap: 10, justifyContent: 'center',
      }}>
        <GlassPill variant="primary" onClick={() => nav('new')}>
          <span style={{ marginRight: 6 }}>＋</span>New show
        </GlassPill>
        <GlassPill onClick={() => nav('import')}>
          {Icon.import()} Import .grm
        </GlassPill>
      </div>
    </StageBG>
  );
}

function ShowCard({ show, onOpen, accent }) {
  return (
    <Glass r={16} solid onClick={onOpen} style={{ cursor: 'pointer' }}>
      <div style={{ padding: '20px 20px 18px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{
            width: 56, height: 70, borderRadius: 10,
            background: `${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: 28 }}>
              {show.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 26, fontWeight: 500, color: '#fff', letterSpacing: -0.01,
              lineHeight: 1.1, marginBottom: 4,
            }}>{show.name}</div>
            <div style={{ fontSize: 14, color: 'rgba(235,235,245,0.62)', marginBottom: 10 }}>
              {show.roles.join(' · ')}
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12 }} >
              <span style={{ color: 'rgba(255,255,255,0.55)' }}>
                <span style={{ color: '#fff', fontSize: 14 }}>{show.nums}</span> numbers
              </span>
              <span style={{ color: 'rgba(255,255,255,0.55)' }}>
                <span style={{ color: '#fff', fontSize: 14 }}>{show.scenes}</span> scenes
              </span>
              <span style={{ color: 'rgba(255,255,255,0.55)' }}>
                <span style={{ color: '#fff', fontSize: 14 }}>{show.recs}</span> recs
              </span>
            </div>
          </div>
        </div>
      </div>
    </Glass>
  );
}

// ─────────────────────────────────────────────────────────────
// Show Hub
// ─────────────────────────────────────────────────────────────
function ShowHubScreen({ nav, show }) {
  return (
    <StageBG variant="night">
      <GrNavBar
        onBack={() => nav('home')}
        eyebrow={show.roles.join(' · ')}
        title={show.name}
      />

      <div style={{ padding: '20px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <HubTile
          label="Musical Numbers"
          count={show.nums}
          sub="harmonies · dance · notes"
          accent="rgba(120,220,180,0.55)"
          onClick={() => nav('numbers')}
          icon={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M9 18V6l10-2v12" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="7" cy="18" r="2.5" stroke="#fff" strokeWidth="1.6"/>
              <circle cx="17" cy="16" r="2.5" stroke="#fff" strokeWidth="1.6"/>
            </svg>
          }
        />
        <HubTile
          label="Scenes"
          count={show.scenes}
          sub={`you’re in ${show.scenesIn}`}
          accent="rgba(220,150,200,0.55)"
          onClick={() => nav('scenes')}
          icon={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M3 12h18M3 18h18" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>
              <rect x="3" y="4" width="18" height="16" rx="2" stroke="#fff" strokeWidth="1.6"/>
            </svg>
          }
        />
      </div>

      <SectionLabel>Quick jump</SectionLabel>
      <div style={{ padding: '0 16px' }}>
        <Glass r={14} solid>
          <GlassRow
            leading={<Pip color={GR_COLORS.emerald} />}
            title="Defying Gravity"
            subtitle="Last opened · 2h ago"
            trailing={Icon.chev()}
            onClick={() => nav('number')}
          />
          <GlassRow
            leading={<Pip color={GR_COLORS.amber} />}
            title="Scene 7 — Rooftop"
            subtitle="3 recordings · notes updated Tue"
            trailing={Icon.chev()}
            onClick={() => nav('scene')}
          />
          <GlassRow
            last
            leading={<Pip color="#b89eff" />}
            title="One Short Day"
            subtitle="2 harmonies · no dance yet"
            trailing={Icon.chev()}
          />
        </Glass>
      </div>

      <SectionLabel action="Export .grm">This show</SectionLabel>
      <div style={{ padding: '0 16px' }}>
        <Glass r={14} solid>
          <GlassRow title="Edit show details" subtitle="Name, roles" trailing={Icon.chev()} />
          <GlassRow last title="Mark as completed"
            subtitle="Archive with cleanup options"
            trailing={Icon.chev()}
            onClick={() => nav('complete')} />
        </Glass>
      </div>
      <div style={{ height: 40 }} />
    </StageBG>
  );
}

function HubTile({ label, count, sub, accent, icon, onClick }) {
  return (
    <Glass r={16} solid onClick={onClick}>
      <div style={{ position: 'relative', padding: '18px 18px 20px', minHeight: 170, overflow: 'hidden' }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'rgba(255,255,255,0.12)',
            border: '0.5px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 22,
          }}>{icon}</div>
          <div style={{
            fontSize: 40, fontWeight: 500, color: '#fff', lineHeight: 1,
          }}>{count}</div>
          <div style={{ fontSize: 15, color: '#fff', fontWeight: 500, marginTop: 6, letterSpacing: -0.2 }}>{label}</div>
          <div style={{ fontSize: 12, color: 'rgba(235,235,245,0.55)', marginTop: 2 }}>{sub}</div>
        </div>
      </div>
    </Glass>
  );
}

function Pip({ color }) {
  return (
    <div style={{
      width: 10, height: 10, borderRadius: 5, background: color,
    }} />
  );
}

// ─────────────────────────────────────────────────────────────
// Musical Numbers — list
// ─────────────────────────────────────────────────────────────
const NUMBERS = [
  { o: 1, name: 'No One Mourns the Wicked', sub: 'Ensemble · 4 harmonies', hasDance: true },
  { o: 2, name: 'Dear Old Shiz', sub: 'Ensemble · 1 harmony' },
  { o: 3, name: 'The Wizard and I', sub: 'Elphaba · 2 harmonies · dance', hasDance: true },
  { o: 4, name: 'What Is This Feeling?', sub: 'Elphaba & Galinda · 3 harmonies' },
  { o: 5, name: 'Something Bad', sub: 'Dillamond · notes only' },
  { o: 6, name: 'Dancing Through Life', sub: 'Fiyero · 2 harmonies · dance', hasDance: true },
  { o: 7, name: 'Popular', sub: 'Galinda · 1 harmony' },
  { o: 8, name: 'I’m Not That Girl', sub: 'Elphaba' },
  { o: 9, name: 'One Short Day', sub: 'Ensemble · 2 harmonies' },
  { o: 10, name: 'Defying Gravity', sub: 'Elphaba · 6 harmonies · dance', hasDance: true, hot: true },
];

function NumbersScreen({ nav, show }) {
  return (
    <StageBG variant="night">
      <GrNavBar
        onBack={() => nav('hub', show.id)}
        eyebrow={`${show.name} · Act I`}
        title="Musical Numbers"
      />
      <div style={{ padding: '10px 16px 0' }}>
        <Glass r={14} solid>
          {NUMBERS.map((n, i) => (
            <GlassRow
              key={n.o}
              last={i === NUMBERS.length - 1}
              leading={
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: n.hot ? `linear-gradient(145deg, ${GR_COLORS.emerald}, #8ae6c9)` : 'rgba(255,255,255,0.08)',
                  border: '0.5px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: n.hot ? '#fff' : 'rgba(255,255,255,0.8)',
                  fontSize: 13, fontWeight: 600,
                }} >{String(n.o).padStart(2, '0')}</div>
              }
              title={n.name}
              subtitle={n.sub}
              trailing={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {n.hasDance && (
                    <div style={{
                      width: 26, height: 26, borderRadius: 8,
                      background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {Icon.video('rgba(255,255,255,0.7)')}
                    </div>
                  )}
                  {Icon.chev()}
                </div>
              }
              onClick={() => nav('number')}
            />
          ))}
        </Glass>
      </div>

      <div style={{
        position: 'absolute', right: 20, bottom: 48,
      }}>
        <Glass r={999} tint={GR_COLORS.emerald} blur={0} border={false} shadow style={{ boxShadow: '0 8px 20px rgba(0,0,0,0.4)' }}>
          <div style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {Icon.plus('#fff')}
          </div>
        </Glass>
      </div>
    </StageBG>
  );
}

// ─────────────────────────────────────────────────────────────
// Musical Number Detail — Defying Gravity
// ─────────────────────────────────────────────────────────────
function NumberDetailScreen({ nav, show }) {
  const [playing, setPlaying] = React.useState(1); // index of playing harmony
  return (
    <StageBG variant="night">
      <GrNavBar
        onBack={() => nav('numbers')}
        eyebrow={`${show.name} · #10`}
        title="Defying Gravity"
      />

      {/* now playing / hero */}
      <div style={{ padding: '6px 16px 0' }}>
        <Glass r={16} tint="rgba(48,209,88,0.12)" blur={0} border>
          <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <Glass r={999} tint={GR_COLORS.emerald} blur={0} border={false}>
              <div
                style={{ width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setPlaying(p => p === null ? 1 : null)}
              >
                {playing !== null ? Icon.pause() : Icon.play()}
              </div>
            </Glass>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 2 }}>
                Harmony · m. 64 — “The bridge”
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Waveform w={180} h={24} seed={7} progress={0.42} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>1:12 / 2:48</span>
              </div>
            </div>
          </div>
        </Glass>
      </div>

      <SectionLabel action="Add">Harmonies · 6</SectionLabel>
      <div style={{ padding: '0 16px' }}>
        <Glass r={14} solid>
          {[
            { m: 'm. 48', cap: 'Alto — lift over the orchestra', dur: '0:42', seed: 3 },
            { m: 'm. 64', cap: 'Bridge — “unlimited”', dur: '2:48', seed: 7, active: true },
            { m: 'm. 89', cap: 'Belt — C5 sustain', dur: '0:18', seed: 11 },
            { m: 'm. 112', cap: 'Descant on button', dur: '0:55', seed: 4 },
          ].map((h, i, arr) => (
            <GlassRow
              key={i}
              last={i === arr.length - 1}
              dense
              leading={
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: h.active ? `linear-gradient(145deg, ${GR_COLORS.emerald}, #8ae6c9)` : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {h.active ? Icon.pause() : Icon.play('rgba(255,255,255,0.85)')}
                </div>
              }
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: GR_COLORS.emerald, fontSize: 12 }}>{h.m}</span>
                  <span>{h.cap}</span>
                </div>
              }
              subtitle={null}
              trailing={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Waveform w={56} h={22} seed={h.seed} progress={h.active ? 0.5 : 0} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{h.dur}</span>
                </div>
              }
            />
          ))}
        </Glass>
      </div>

      <SectionLabel action="Add link">Dance Videos · 2</SectionLabel>
      <div style={{ padding: '0 16px', display: 'flex', gap: 10, overflowX: 'auto' }}>
        <VideoCard title="Choreo — full" dur="3:02" hue={200} type="file" />
        <VideoCard title="Spin count (slow)" dur="0:48" hue={320} type="link" />
      </div>

      <SectionLabel>Notes</SectionLabel>
      <div style={{ padding: '0 16px 36px' }}>
        <Glass r={14} solid>
          <div style={{ padding: '16px 18px', fontSize: 15, lineHeight: 1.5, color: 'rgba(235,235,245,0.88)' }}>
            Cue 64 — breathe <span style={{ color: GR_COLORS.emerald, fontWeight: 600 }}>before</span> the lift, not after. The harness clicks on beat 2 of m.&nbsp;65; wait for Maria’s nod. On the long C5, phrase onto the consonant or it goes flat in the house.
            <div style={{ height: 10 }} />
            <span style={{ color: 'rgba(255,255,255,0.55)' }}>— edited Tue, 9:48 PM</span>
          </div>
        </Glass>
      </div>
    </StageBG>
  );
}

function VideoCard({ title, dur, hue, type }) {
  return (
    <Glass r={12} solid style={{ minWidth: 180, flexShrink: 0 }}>
      <div style={{
        height: 110,
        background: `hsl(${hue} 45% 35%)`,
        position: 'relative',
      }}>
        {/* fake scanlines */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: 8, left: 8, right: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        }}>
          <Glass r={999} tint="rgba(0,0,0,0.4)">
            <div style={{ padding: '4px 10px', fontSize: 11, color: '#fff' }} >
              {type === 'link' ? 'YOUTUBE' : 'LOCAL'}
            </div>
          </Glass>
          <Glass r={999} tint="rgba(255,255,255,0.85)">
            <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="10" height="12" viewBox="0 0 10 12"><path d="M1 1v10l8-5L1 1z" fill="#fff"/></svg>
            </div>
          </Glass>
        </div>
      </div>
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ fontSize: 14, color: '#fff', fontWeight: 500, letterSpacing: -0.2 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>{dur}</div>
      </div>
    </Glass>
  );
}

// ─────────────────────────────────────────────────────────────
// Scenes — list (some grayed)
// ─────────────────────────────────────────────────────────────
const SCENES = [
  { o: 1, name: 'Opening — Oz', sub: 'Ensemble', inIt: true, recs: 0 },
  { o: 2, name: 'Shiz University', sub: 'Elphaba, Galinda, Nessa', inIt: true, recs: 2 },
  { o: 3, name: 'The Ozdust Ballroom', sub: 'Ensemble', inIt: true, recs: 1 },
  { o: 4, name: 'Train to Emerald City', sub: 'Elphaba, Galinda', inIt: false },
  { o: 5, name: 'The Wizard’s Chamber', sub: 'Wizard, Elphaba', inIt: false },
  { o: 6, name: 'Flight to Freedom', sub: 'Elphaba', inIt: true, recs: 0, active: true },
  { o: 7, name: 'Rooftop — Act II open', sub: 'Elphaba, Fiyero', inIt: true, recs: 3 },
  { o: 8, name: 'The Lion’s Cage', sub: 'Elphaba, Fiyero', inIt: false },
];

function ScenesScreen({ nav, show }) {
  return (
    <StageBG variant="dawn">
      <GrNavBar
        onBack={() => nav('hub', show.id)}
        eyebrow={`${show.name}`}
        title="Scenes"
      />
      <div style={{ padding: '6px 20px 14px', color: 'rgba(235,235,245,0.7)', fontSize: 13 }}>
        Tap a scene you’re in. Grayed scenes are others’ — kept for context.
      </div>

      <div style={{ padding: '0 16px' }}>
        <Glass r={14} solid>
          {SCENES.map((s, i) => (
            <GlassRow
              key={s.o}
              last={i === SCENES.length - 1}
              muted={!s.inIt}
              onClick={s.inIt ? () => nav('scene') : undefined}
              leading={
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: s.active
                    ? `linear-gradient(145deg, ${GR_COLORS.amber}, #ffd18a)`
                    : s.inIt ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                  border: s.inIt ? '0.5px solid rgba(255,255,255,0.2)' : '0.5px dashed rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: s.active ? '#fff' : 'rgba(255,255,255,0.75)',
                  fontSize: 13, fontWeight: 600,
                }} >{s.o}</div>
              }
              title={s.name}
              subtitle={s.sub}
              trailing={
                s.inIt ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {s.recs > 0 && (
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>
                        ●{s.recs}
                      </span>
                    )}
                    {Icon.chev()}
                  </div>
                ) : (
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.2 }}>
                    NOT IN
                  </span>
                )
              }
            />
          ))}
        </Glass>
      </div>
      <div style={{ height: 120 }} />
    </StageBG>
  );
}

// ─────────────────────────────────────────────────────────────
// Scene Detail
// ─────────────────────────────────────────────────────────────
function SceneDetailScreen({ nav, show }) {
  return (
    <StageBG variant="dawn">
      <GrNavBar
        onBack={() => nav('scenes')}
        eyebrow={`${show.name} · Scene 7`}
        title="Rooftop"
      />

      <SectionLabel action="Edit">Notes</SectionLabel>
      <div style={{ padding: '0 16px' }}>
        <Glass r={14} solid>
          <div style={{ padding: '16px 18px', fontSize: 15, lineHeight: 1.55, color: 'rgba(235,235,245,0.88)' }}>
            Enter stage-left <span style={{ color: GR_COLORS.amber, fontSize: 13 }}>SL-3</span> on Fiyero’s line “you’re the only one.” Cross to the bench — <em style={{ fontStyle: 'italic', color: '#fff' }}>don’t sit yet</em>. The kiss lands on the word “safe.”
            <div style={{ height: 6 }} />
            Blocking change from 4/10 — hold the embrace through the bar line, release on the cello pickup.
          </div>
        </Glass>
      </div>

      <SectionLabel action="＋ Capture">Recordings · 3</SectionLabel>
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <RecordingRow type="audio" caption="Blocking walkthru w/ Maria" dur="3:24" seed={2} />
        <RecordingRow type="video" caption="Rooftop cross — iPhone side-stage" dur="1:02" hue={280} />
        <RecordingRow type="audio" caption="Self note — pickup cue" dur="0:18" seed={9} />
      </div>

      {/* Record action bar */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 42, padding: '0 16px' }}>
        <Glass r={26} tint="rgba(255,255,255,0.14)">
          <div style={{ padding: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
            <GlassPill>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {Icon.import()} Upload
              </span>
            </GlassPill>
            <div style={{ flex: 1 }} />
            <Glass r={999} tint={GR_COLORS.red} blur={0} border={false}>
              <div style={{ height: 50, padding: '0 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: 6, background: '#fff', boxShadow: '0 0 8px #fff' }} />
                <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>Record audio</span>
              </div>
            </Glass>
            <GlassIconBtn>{Icon.video()}</GlassIconBtn>
          </div>
        </Glass>
      </div>
    </StageBG>
  );
}

function RecordingRow({ type, caption, dur, seed, hue }) {
  if (type === 'video') {
    return (
      <Glass r={12} solid>
        <div style={{ display: 'flex', alignItems: 'center', padding: 8, gap: 12 }}>
          <div style={{
            width: 76, height: 56, borderRadius: 12,
            background: `hsl(${hue} 45% 35%)`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'none',
            }} />
            <Glass r={999} tint="rgba(255,255,255,0.85)">
              <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="8" height="10" viewBox="0 0 8 10"><path d="M1 1v8l6-4L1 1z" fill="#fff"/></svg>
              </div>
            </Glass>
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
            <div style={{ fontSize: 15, color: '#fff', fontWeight: 500 }}>{caption}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>VIDEO · {dur}</div>
          </div>
        </div>
      </Glass>
    );
  }
  return (
    <Glass r={12} solid>
      <div style={{ display: 'flex', alignItems: 'center', padding: 12, gap: 12 }}>
        <Glass r={999} tint="rgba(255,255,255,0.16)">
          <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {Icon.play('rgba(255,255,255,0.95)')}
          </div>
        </Glass>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, color: '#fff', fontWeight: 500, marginBottom: 4 }}>{caption}</div>
          <Waveform w={190} h={22} seed={seed} progress={0} />
        </div>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{dur}</span>
      </div>
    </Glass>
  );
}

// ─────────────────────────────────────────────────────────────
// Complete Show — confirmation flow
// ─────────────────────────────────────────────────────────────
function CompleteScreen({ nav, show }) {
  const [flags, setFlags] = React.useState({ audio: true, video: true, links: false });
  const toggle = (k) => setFlags(f => ({ ...f, [k]: !f[k] }));

  return (
    <StageBG variant="emerald">
      <GrNavBar
        onBack={() => nav('hub', show.id)}
        eyebrow="Archive"
        title="Complete show"
      />

      <div style={{ padding: '6px 20px 18px', color: 'rgba(235,235,245,0.75)', fontSize: 15, lineHeight: 1.5 }}>
        Nice work. Choose what to keep before <strong style={{ color: '#fff' }}>{show.name}</strong> moves to your trophy shelf.
      </div>

      <div style={{ padding: '0 16px' }}>
        <Glass r={14} solid>
          <ToggleRow
            on={flags.audio} onToggle={() => toggle('audio')}
            title="Delete audio recordings"
            sub="Harmonies + scene audio · frees 218 MB"
          />
          <ToggleRow
            on={flags.video} onToggle={() => toggle('video')}
            title="Delete video files"
            sub="Uploaded & recorded · frees 1.4 GB"
          />
          <ToggleRow
            last
            on={flags.links} onToggle={() => toggle('links')}
            title="Delete external links"
            sub="Keep linked YouTube videos for reference"
          />
        </Glass>

        <div style={{ marginTop: 16 }}>
          <Glass r={14} tint="rgba(48,209,88,0.10)" blur={0} border>
            <div style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 11, color: GR_COLORS.emerald, letterSpacing: 0.2, marginBottom: 8 }}>
                ALWAYS KEPT
              </div>
              <div style={{ color: 'rgba(235,235,245,0.9)', fontSize: 14, lineHeight: 1.5 }}>
                Show structure, musical numbers, scenes, and which scenes you were in.
                <span style={{ color: 'rgba(255,255,255,0.55)' }}> Notes are always cleared.</span>
              </div>
            </div>
          </Glass>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 44, padding: '0 16px', display: 'flex', gap: 10 }}>
        <GlassPill style={{ flex: 1 }} onClick={() => nav('hub', show.id)}>Cancel</GlassPill>
        <GlassPill variant="primary" style={{ flex: 1.4 }} onClick={() => nav('completed')}>
          Complete show
        </GlassPill>
      </div>
    </StageBG>
  );
}

function ToggleRow({ title, sub, on, onToggle, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
      borderBottom: last ? 'none' : '0.5px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, color: '#fff', fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'rgba(235,235,245,0.6)', marginTop: 2 }}>{sub}</div>
      </div>
      <div onClick={onToggle} style={{
        width: 52, height: 32, borderRadius: 999, padding: 2, flexShrink: 0,
        background: on ? GR_COLORS.emerald : 'rgba(120,120,128,0.35)', display: 'flex', alignItems: 'center', justifyContent: on ? 'flex-end' : 'flex-start',
        boxShadow: on ? '0 0 14px rgba(120,220,180,0.5), inset 0 0 0 0.5px rgba(255,255,255,0.3)' : 'inset 0 0 0 0.5px rgba(255,255,255,0.1)',
        transition: 'all 0.2s',
        cursor: 'pointer',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', background: '#fff',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Completed shelf
// ─────────────────────────────────────────────────────────────
function CompletedScreen({ nav }) {
  const completed = [
    { name: 'Into the Woods', roles: 'Baker’s Wife', date: 'Mar 2025', hue: 160, kept: 'notes + 3 harmonies' },
    { name: 'Cabaret', roles: 'Ensemble · Kit Kat', date: 'Nov 2024', hue: 20, kept: 'structure only' },
    { name: 'Spring Awakening', roles: 'Wendla', date: 'May 2024', hue: 300, kept: 'notes + audio' },
    { name: 'The Last 5 Years', roles: 'Cathy', date: 'Feb 2024', hue: 220, kept: 'all media kept' },
  ];
  return (
    <StageBG variant="emerald">
      <GrNavBar
        onBack={() => nav('home')}
        eyebrow="Trophy shelf · 4 shows"
        title="Completed"
      />
      <div style={{ padding: '6px 16px 36px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {completed.map((c, i) => (
          <Glass key={i} r={14} solid>
            <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 52, height: 66, borderRadius: 9,
                background: `hsl(${c.hue} 50% 40%)`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 600, fontSize: 22,
                boxShadow: '0 6px 14px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
              }} >
                {c.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 500, color: '#fff' }}>{c.name}</div>
                <div style={{ fontSize: 13, color: 'rgba(235,235,245,0.65)' }}>{c.roles}</div>
                <div style={{ marginTop: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{
                    fontSize: 10, padding: '3px 8px', borderRadius: 999,
                    background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)',
                    letterSpacing: 0.1,
                  }}>{c.date.toUpperCase()}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>· {c.kept}</span>
                </div>
              </div>
              {Icon.chev()}
            </div>
          </Glass>
        ))}
      </div>
    </StageBG>
  );
}

// ─────────────────────────────────────────────────────────────
// New show — with keyboard
// ─────────────────────────────────────────────────────────────
function NewShowScreen({ nav }) {
  return (
    <StageBG variant="night">
      <GrNavBar
        onBack={() => nav('home')}
        title="New show"
        right={<GlassPill variant="tinted" onClick={() => nav('home')}>Save</GlassPill>}
        onMenu={false}
      />

      <div style={{ padding: '16px 16px 0' }}>
        <Glass r={14} solid>
          <div style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 10, letterSpacing: 0.2, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
              SHOW NAME
            </div>
            <div style={{ fontSize: 28, color: '#fff', fontWeight: 500 }}>
              Wicke<span style={{ borderRight: `2px solid ${GR_COLORS.emerald}`, animation: 'none' }}>d</span>
            </div>
          </div>
          <div style={{ height: 0.5, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 10, letterSpacing: 0.2, color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>
              ROLES · TAP TO ADD
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['Elphaba', 'Glinda u/s'].map(r => (
                <Glass key={r} r={999} tint="rgba(120,220,180,0.18)">
                  <div style={{ padding: '6px 14px', fontSize: 14, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {r}
                    <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 16 }}>×</span>
                  </div>
                </Glass>
              ))}
              <Glass r={999} tint="rgba(255,255,255,0.1)">
                <div style={{ padding: '6px 14px', fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>+ add role</div>
              </Glass>
            </div>
          </div>
        </Glass>

        <SectionLabel>Suggested templates</SectionLabel>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {['Empty', 'Act I / Act II', 'Revue (no scenes)', 'One-act play'].map((t, i) => (
            <Glass key={i} r={999} tint="rgba(255,255,255,0.08)">
              <div style={{ padding: '8px 14px', fontSize: 13, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap' }}>{t}</div>
            </Glass>
          ))}
        </div>
      </div>
    </StageBG>
  );
}

// ─────────────────────────────────────────────────────────────
// Import .grm — duplicate resolution modal
// ─────────────────────────────────────────────────────────────
function ImportScreen({ nav }) {
  return (
    <StageBG variant="night">
      <GrNavBar onBack={() => nav('home')} title="Import" />
      <div style={{ padding: '8px 16px 0' }}>
        <Glass r={14} solid>
          <div style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{
              width: 48, height: 60, borderRadius: 8,
              background: GR_COLORS.emerald, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 600, fontSize: 11,
            }} >.grm</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, color: '#fff', fontWeight: 500 }}>wicked-2026.grm</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }} >
                1 show · 10 numbers · 8 scenes · 218 MB
              </div>
            </div>
          </div>
        </Glass>
      </div>

      <div style={{ padding: '22px 20px 10px' }}>
        <div style={{
          fontSize: 11, color: GR_COLORS.amber, letterSpacing: 0.2, marginBottom: 8, textTransform: 'uppercase',
        }}>Duplicate detected</div>
        <div style={{ color: 'rgba(235,235,245,0.85)', fontSize: 14, lineHeight: 1.5 }}>
          A show named <strong style={{ color: '#fff' }}>Wicked</strong> already exists with 3 harmonies and 12 scenes. What would you like to do?
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <OptionCard
          title="Keep both"
          sub="Imports as “Wicked (2)” — both shows stay"
          tint="rgba(255,255,255,0.08)"
        />
        <OptionCard
          title="Replace existing"
          sub="Overwrites current Wicked data. Destructive."
          tint="rgba(255,120,120,0.14)"
          warn
        />
        <OptionCard
          title="Skip this show"
          sub="Leaves the existing Wicked untouched"
          tint="rgba(255,255,255,0.05)"
        />
      </div>
    </StageBG>
  );
}

function OptionCard({ title, sub, tint, warn }) {
  return (
    <Glass r={18} tint={tint}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          border: `1.5px solid ${warn ? '#ff8a8a' : 'rgba(255,255,255,0.4)'}`,
          flexShrink: 0,
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, color: warn ? '#ffb8b8' : '#fff', fontWeight: 500 }}>{title}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{sub}</div>
        </div>
      </div>
    </Glass>
  );
}

Object.assign(window, {
  HomeScreen, ShowHubScreen, NumbersScreen, NumberDetailScreen,
  ScenesScreen, SceneDetailScreen, CompleteScreen, CompletedScreen,
  NewShowScreen, ImportScreen,
});
