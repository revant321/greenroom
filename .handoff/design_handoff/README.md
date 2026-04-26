# greenroom — Design Handoff

A personal theater organizer PWA. Design is **native iOS dark** — flat system colors, SF system font, grouped lists, 0.5pt separators. No gradients, no glows, no bloom effects.

This bundle contains:

- `greenroom-project-spec.md` — the original product spec (pages, data schema, build phases).
- `screenshots/` — 10 PNGs, one per screen, at 390×844 (iPhone 14 Pro).
- `design-prototype/` — HTML/JSX source of the clickable prototype (open `greenroom.html` in a browser to interact).

---

## How to use this with Claude Code

1. Drop this entire `design_handoff/` folder at the root of your new Vite project.
2. In Claude Code, paste this prompt:

```
Read design_handoff/README.md, design_handoff/greenroom-project-spec.md,
and the PNGs in design_handoff/screenshots/. Then scaffold a Vite + React 18
+ TypeScript PWA that implements the spec and matches the designs pixel-
for-pixel. Start with Phase 1 (scaffold + routing + Home). Use the design
system notes below — all tokens, spacing, typography. Do not invent new
colors or components.

After Phase 1 renders, show me the Home screen before continuing to Phase 2.
```

3. Work through the Build Phases from the spec one at a time. Review the matching screenshot(s) at each phase boundary.

The prototype in `design-prototype/` is a React-in-the-browser mock — it's a reference, not the target stack. The target stack is the one in the spec: **Vite + React 18 + TypeScript + Dexie.js + React Router + MediaRecorder API**.

---

## Design system

### Typography

| Role | Font | Size / Weight |
|---|---|---|
| Large title | SF Pro (`-apple-system`) | 34pt / 700, letter-spacing −0.022em, line-height 1.05 |
| Title / row | SF Pro | 17pt / 500, letter-spacing −0.24pt |
| Subtitle / body | SF Pro | 15pt / 400 |
| Footnote / caption | SF Pro | 13pt / 400, `rgba(235,235,245,0.6)` |
| Caption 2 | SF Pro | 11pt / 400 |
| Section header | SF Pro | 13pt / 400 uppercase, letter-spacing −0.08pt, `rgba(235,235,245,0.6)` |

**Font stack:** `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", sans-serif`.

No Fraunces, no custom display fonts — this is a native iOS app, so it uses the system font.

### Colors (iOS dark mode system colors)

| Token | Hex | Role |
|---|---|---|
| `systemBackground` | `#000000` | Full-screen background |
| `secondarySystemGroupedBackground` | `#1C1C1E` | Grouped list cards, hub tiles |
| `tertiarySystemGroupedBackground` | `#2C2C2E` | Pills, chrome surfaces |
| `separator` | `rgba(84,84,88,0.6)` / 0.5pt | Row dividers |
| `label` | `#FFFFFF` | Primary text |
| `secondaryLabel` | `rgba(235,235,245,0.6)` | Subtitles, captions |
| `tertiaryLabel` | `rgba(235,235,245,0.3)` | Placeholder, disabled |
| `systemGreen` | `#30D158` | Primary accent — active state, CTA, progress |
| `systemOrange` | `#FF9F0A` | Scene/warm accent, current-scene chip |
| `systemRed` | `#FF453A` | Record button, destructive |

Opacity conventions — text uses label/secondary/tertiary alphas above, **not** custom RGB greys.

### Surfaces

- Grouped list cards: solid `#1C1C1E`, radius **14**, no border, no shadow. Rows separated by `0.5px solid rgba(255,255,255,0.08)` — last row omits it.
- Chrome pills / toolbar glass: `rgba(40,40,40,0.62)` + `backdrop-filter: blur(28px) saturate(160%)`, 0.5px `rgba(255,255,255,0.08)` hairline, pill radius 999.
- Primary pill button: filled `#30D158`, white text, 17pt/600, height 50, horizontal padding 22, radius 999.
- Floating FAB: 56×56, `#30D158`, drop shadow `0 8px 20px rgba(0,0,0,0.4)`.
- Record button (scene detail): 50-height pill, `#FF453A`, white dot + "Record audio" label.

### Spacing

- Screen horizontal padding: 16 (rows) / 20 (titles, section headers).
- Card-to-card gap: 12–14.
- Section header spacing: 28 top / 7 bottom.
- Nav bar: 58pt top (status bar + inset), large title 14pt below chrome pills.

### Iconography

Line icons, 1.6–1.8 stroke, rounded caps, white. Sizes: 18–20 in rows, 28 in hub tiles. No filled or duotone icons.

### Navigation chrome

- Back button: circular glass pill (40×40, radius 999), chevron centered.
- Overflow: three-dot circular glass pill (40×40), top right.
- Large title below chrome, left-aligned, SF 34pt/700.
- Eyebrow text (13pt secondary) above title when context is needed (e.g. show name on nested screens).

---

## Screens — what each one does

| # | Screen | File | Screenshot |
|---|---|---|---|
| 01 | Home | `src/pages/Home.tsx` | `screenshots/01-home.png` |
| 02 | Show Hub | `src/pages/ShowHub.tsx` | `screenshots/02-show-hub.png` |
| 03 | Musical Numbers list | `src/pages/MusicalNumbers.tsx` | `screenshots/03-musical-numbers.png` |
| 04 | Musical Number detail | `src/pages/MusicalNumberDetail.tsx` | `screenshots/04-number-detail.png` |
| 05 | Scenes list | `src/pages/Scenes.tsx` | `screenshots/05-scenes.png` |
| 06 | Scene detail | `src/pages/SceneDetail.tsx` | `screenshots/06-scene-detail.png` |
| 07 | Complete-show flow | modal in `ShowHub.tsx` | `screenshots/07-complete-flow.png` |
| 08 | Completed shows | `src/pages/CompletedShows.tsx` | `screenshots/08-completed-shows.png` |
| 09 | New show | modal in `Home.tsx` | `screenshots/09-new-show.png` |
| 10 | Import `.grm` | `src/components/ImportFlow.tsx` | `screenshots/10-import-grm.png` |

### 01 · Home (`screenshots/01-home.png`)

Nav: no back button. Eyebrow `"Backstage · N Active Shows"`, large title `"greenroom."` (include the trailing period — it's part of the wordmark), trophy icon in the overflow slot.

Body:
- **Active shows** — one grouped card per show, stacked with 14pt gap. Each card: 56×70 colored role-accent tile (systemGreen for first show, systemOrange for second), 2-letter initials in 28pt/600 white. Beside it: show name (26pt/500), roles joined by ` · ` (14pt secondary), then a row of three stat pairs (`10 numbers`, `18 scenes`, `14 recs`) in 12pt tertiary with the count in 14pt white.
- **Storage section** — section header `STORAGE · ON THIS DEVICE`, single row showing `"218 MB of audio · 4 recordings"` with a `LOCAL` chip on the right. A thin systemGreen progress bar sits at the bottom of that row.
- **Footer** — two floating pills anchored bottom-center: `+ New show` (primary, systemGreen) and `↓ Import .grm` (chrome glass).

### 02 · Show Hub (`screenshots/02-show-hub.png`)

Nav: back, eyebrow with roles, title = show name.

Body:
- **Two hub tiles** in a 2-column grid (gap 12). Each tile: solid `#1C1C1E`, radius 16, 170px tall. Inside — 44×44 white-12% rounded icon chip at top, big count (40pt/500), label (15pt/500), sub (12pt tertiary). No gradients, no blooms.
- **Quick jump** section — 3-row grouped card. Left pip (10px colored circle), title, subtitle, chevron.
- **This show** section — grouped card with `Edit show details` and `Mark as completed` rows. Section header has an `Export .grm` action on the right.

### 03 · Musical Numbers (`screenshots/03-musical-numbers.png`)

Nav: back, eyebrow `"<Show> · Act I"`, title `Musical Numbers`.

Body:
- Single grouped card with 10 rows. Each row:
  - **Leading** — 34×34 radius-10 chip. Normal state: `rgba(255,255,255,0.08)`, white `01`–`10` number. Active/hot state: solid `#30D158` fill, white text (the "hot" number is the one the user most recently worked on).
  - **Title** — 17pt/500 number name.
  - **Subtitle** — 13pt secondary (`"Ensemble · 4 harmonies"` etc.).
  - **Trailing** — if number has a dance video, show a 26×26 chip with a video icon. Then a chevron.
- **FAB** — bottom-right floating systemGreen circle with white `+` icon. Tap → add number modal.

### 04 · Musical Number detail — *Defying Gravity* (`screenshots/04-number-detail.png`)

Nav: back, eyebrow `"<Show> · #10"`, title `Defying Gravity`.

Body:
1. **Now-playing hero** — `rgba(48,209,88,0.12)` tinted card with a green play/pause circle, current harmony label (`"Harmony · m. 64 — 'The bridge'"`), waveform, timecode.
2. Section `HARMONIES · N` with `Add` action on the right. Grouped card w/ dense rows (44px). Leading = play chip (solid green if active). Title = measure label in systemGreen + caption. Trailing = tiny waveform + duration.
3. Section `DANCE VIDEOS · N` + `Add link` action. Horizontal-scroll row of **VideoCard**s (min-width 180, glass radius 12):
   - 110px thumbnail with flat `hsl(H 45% 35%)` background (no gradient). Bottom-left: dark-scrim pill with `YOUTUBE` / `LOCAL` label. Bottom-right: 32×32 white circular play button.
   - Title below (14pt/500), duration (11pt tertiary).
4. Section `NOTES` — single grouped card with free-text notes in 15pt, line-height 1.5. Measure references inline use systemGreen. Timestamp ("— edited Tue, 9:48 PM") in tertiary at the bottom.

### 05 · Scenes (`screenshots/05-scenes.png`)

Nav: back, eyebrow = show name, title `Scenes`.

Body:
- Helper row (13pt secondary): `"Tap a scene you're in. Grayed scenes are others' — kept for context."`
- Single grouped card with 8 scene rows. Each:
  - **Leading** — 34×34 chip with scene number. In-scene = solid white-10%, normal border. Not-in-scene = white-4%, dashed border. Active (current) scene = solid `#FF9F0A`.
  - **Title / subtitle** — scene name + cast.
  - **Trailing** — if user is in the scene: recording count (`●3`) + chevron. If not: `NOT IN` label in tertiary caption.
- Not-in-scene rows are dimmed to 35% opacity and not tappable.

### 06 · Scene detail — *Rooftop* (`screenshots/06-scene-detail.png`)

Nav: back, eyebrow `"<Show> · Scene 7"`, title `Rooftop`.

Body:
1. Section `NOTES` + `Edit` action. Single card with free text; stage-position references (e.g. `SL-3`) use systemOrange.
2. Section `RECORDINGS · N` + `＋ Capture` action. Stack of recording rows (gap 10):
   - **Audio row**: glass card with play chip + waveform + caption + `AUDIO · 0:42` meta.
   - **Video row**: glass card with 76×56 video thumbnail (flat `hsl(H 45% 35%)` bg, white circular play overlay) + caption + `VIDEO · 1:02`.
3. **Record action bar** anchored at bottom — full-width chrome glass (radius 14). Upload pill on left, big `● Record audio` button in `#FF453A` in center, video icon button on right.

### 07 · Complete show flow (`screenshots/07-complete-flow.png`)

Modal presented from Show Hub's "Mark as completed".

- Nav: back, eyebrow `Archive`, title `Complete show`.
- Helper paragraph below title: `"Nice work. Choose what to keep before <Show> moves to your trophy shelf."`
- **Three switch rows** in a grouped card. Each row: title + subtitle + iOS switch (systemGreen when on). Switches are phrased as *delete* toggles (on = delete):
  - `Delete audio recordings` · `"Harmonies + scene audio · frees 256 MB"`
  - `Delete video files` · `"Uploaded & recorded · frees 1.4 GB"`
  - `Delete external links` · `"Keep linked YouTube videos for reference"` (default off)
- **"Always kept" callout** — systemGreen-tinted card (`rgba(48,209,88,0.10)`, no blur) below the switches. 11pt uppercase systemGreen label `ALWAYS KEPT` + body: `"Show structure, musical numbers, scenes, and which scenes you were in. Notes are always cleared."`
- Bottom row of two pills: `Cancel` (chrome glass) on the left, `Complete show` (primary systemGreen) on the right.

### 08 · Completed shows — trophy shelf (`screenshots/08-completed-shows.png`)

Nav: back, eyebrow `"Trophy shelf · N shows"`, title `Completed`.

Body:
- Vertical column of grouped cards (gap 12). Each:
  - 52×66 flat `hsl(H 50% 40%)` role-accent tile with 2-letter initials (22pt/500 white).
  - Show name (20pt/500) + roles (13pt secondary).
  - Bottom row: date chip (`"MAR 2025"`, 11pt mono-ish, in chrome glass) + kept-media summary (`"· audio, notes"` in 12pt tertiary).
  - Chevron on right.

### 09 · New show (`screenshots/09-new-show.png`)

Modal from Home's `+ New show`.

- Nav: back-arrow (cancel) on left, title `New show`, `Save` pill (tinted systemGreen) on right — disabled until the name is filled.
- **Single grouped card** containing three stacked sections:
  - `SHOW NAME` — uppercase 11pt section label, then a 17pt white text input. Blinking 1px systemGreen caret when focused. Placeholder: `"e.g. Les Misérables"`.
  - `ROLES — TAP TO ADD` — chips wrap. Filled role chips in chrome glass with `×` to remove. Last chip = `+ add role` (tinted systemGreen).
  - `SUGGESTED TEMPLATES` — horizontal-scroll pill row: `Empty`, `Act I / Act II`, `Revue (no scenes)`, `One-act play`. Each pill pre-populates scene/number counts.

### 10 · Import `.grm` (`screenshots/10-import-grm.png`)

Modal from Home's `↓ Import .grm`.

- Nav: back, title `Import`.
- **File summary card** (grouped) — 58×58 green `.GRM` tile (systemGreen fill, white `.GRM` label in 11pt), filename (17pt/500 e.g. `wicked-2026.grm`), meta line `"1 show · 10 numbers · 8 scenes · 238 MB"`.
- **Duplicate resolution block** — per detected duplicate:
  - Small uppercase systemOrange section label `DUPLICATE DETECTED`.
  - Prompt paragraph (15pt) — `"A show named Wicked already exists with 3 harmonies and 12 scenes. What would you like to do?"` The show name is bolded.
  - **Three radio rows**, each a standalone card (radius 14, gap 10):
    - `Keep both` — solid `#1C1C1E`. Subtitle: `"Imports as 'Wicked (2)' — both shows stay."` Empty circle on left.
    - `Replace existing` — systemRed-tinted card (`rgba(255,69,58,0.12)`) with a red hairline. Subtitle: `"Overwrites current Wicked data. Destructive."` Empty red circle on left.
    - `Skip this show` — solid `#1C1C1E`. Subtitle: `"Leaves the existing Wicked untouched."` Empty circle.
  - Tapping a row selects it (fill the left circle) and advances to the next duplicate or completes the import. No separate Import button — the selection is the commit.

---

## Implementation notes

### Keep these exact behaviors

- **Scene in/out** is a user-set boolean. Not-in-scene rows must be visible but dimmed and non-tappable — the spec is specific that they stay for context.
- **"Mark as completed" has three independent toggles** (audio, video, links). Notes are always deleted regardless. Show structure is always kept.
- **Duplicate detection on import** works *per show by name*. User resolves each duplicate independently before tapping Import.
- **Completion date is recorded** at the moment of archival and shown on the trophy shelf.

### Don't over-design

- No animations beyond standard iOS transitions (navigation push, sheet present, switch flip).
- No haptic mimicry in the UI layer.
- No skeleton loaders — data comes from IndexedDB and is instant; if there's ever loading state, use a simple spinner.
- No dark/light theme toggle in-app. Follow the OS via `prefers-color-scheme` (the spec asks for it) — designs above are dark mode; mirror the same structure in light mode using the corresponding iOS system colors (systemBackground `#FFFFFF`, secondarySystemGroupedBackground `#F2F2F7`, label `#000000`, etc.).

### PWA polish (Phase 8)

- `apple-mobile-web-app-capable`, status-bar style `black-translucent`.
- App icons: white `"greenroom."` wordmark on black, 180×180 + 512×512.
- `manifest.json` with `display: standalone`, `background_color: #000000`, `theme_color: #000000`.
- Service worker caches the shell + Dexie is already offline-first.

---

## Opening the prototype locally

```bash
cd design-prototype
python3 -m http.server 8000
# open http://localhost:8000/greenroom.html
```

The prototype is a single HTML file that loads React + Babel from unpkg and renders the full canvas. The featured phone at the top is interactive — tap any phone in the canvas below to feature it.

If you want to **check pixel-perfect layout** while building, open the prototype alongside your dev server and compare side-by-side. The 10 PNG screenshots were captured from this prototype at 390×844.
