# Floating Liquid-Glass Bottom Nav — UI Overview

A reusable spec for a mobile PWA bottom navigation styled as a floating glass capsule (lozenge/pill) with a smooth-traveling active highlight. Tested in iOS PWA standalone and mobile Safari.

> **⚠️ Icons vary per project.** Everything in this doc is fixed except the four nav icons. Different apps will swap their own PNG/SVG icons, label strings, and tab routes. The icon dimensions (60px) are tuned for a 4-tab nav on iPhone-class screens — adjust if your tab count or screen width differs.

---

## 1. Visual concept

- **Page background:** near-jet-black (`#040406`), uniform.
- **Nav container:** a floating capsule (full `border-radius: 999`) positioned ~14px above the screen bottom edge, with 22px horizontal margins on each side.
- **Glass material:** mostly transparent with a faint white tint (so it picks up content scrolling behind it via heavy backdrop blur).
- **Active state:** a single shared lozenge highlight that smoothly travels between tabs via Framer Motion `layoutId`.
- **No labels overlap:** labels sit comfortably above the iOS home indicator (`y ~12–18 from screen bottom` is the danger zone).

---

## 2. Page-level layout (foundation)

### 2.1 `.app-shell` (the root layout container)
```css
.app-shell {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
  overflow: hidden;
}
```

### 2.2 `html, body, #root`
```css
html, body, #root {
  height: var(--app-height, 100dvh);
  margin: 0;
  padding: 0;
}

html, body {
  overflow: hidden;
  overscroll-behavior: none;
  touch-action: pan-x pan-y;
  -webkit-text-size-adjust: 100%;
}
```

### 2.3 JS-derived viewport height (for iOS PWA reliability)
`100dvh`/`100%` can misreport on iOS PWA standalone. Set a CSS variable from `window.innerHeight`:

```ts
// In main.tsx (before render)
function syncAppHeight() {
  document.documentElement.style.setProperty(
    '--app-height',
    `${window.innerHeight}px`,
  );
}
syncAppHeight();
window.addEventListener('resize', syncAppHeight);
window.addEventListener('orientationchange', syncAppHeight);
```

### 2.4 Scrollable main area — **NO bottom padding**
The pill is `position: fixed`, so content scrolls *under* it. The pill is translucent enough that the last list items are still visible through the glass.

```css
.app-main {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  min-height: 0;
  display: flex;
}

@media (max-width: 767px) {
  .app-main { padding-bottom: 0; }
}
```

Per-page containers should have **`paddingBottom: 120`** (or close) so the user can scroll until the last item sits ~120px above the screen bottom, well clear of the floating pill. This buffer lives *inside* the page content area, never on the shell.

---

## 3. Theme color tokens (dark, system-light, forced light/dark)

Defined in `:root`, then duplicated in `@media (prefers-color-scheme: light)`, `html.dark`, `html.light` (so users can force themes from settings).

### 3.1 Dark mode (default)
```css
:root {
  --bg-primary: #040406;       /* near-jet-black page */
  --bg-card: #2C2C2E;
  --bg-card-hover: #3A3A3C;
  --bg-elevated: #3A3A3C;
  --bg-sidenav: #232325;       /* desktop side rail */

  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-divider: rgba(255, 255, 255, 0.05);

  --text-primary: #FFFFFF;
  --text-secondary: #98989F;

  --active-green: #34D399;
  --passive-blue: #60A5FA;
  --focus-violet: #7C5CFC;

  --card-shadow: 0 1px 0 rgba(255, 255, 255, 0.04);
  --modal-backdrop: rgba(0, 0, 0, 0.45);

  --nav-icon-active: #FFFFFF;
  --nav-icon-inactive: #98989F;

  /* Floating glass pill — these are the key tokens */
  --nav-glass-bg: rgba(255, 255, 255, 0.05);      /* colorless glass — picks up content behind */
  --nav-glass-border: rgba(255, 255, 255, 0.14);
  --nav-active-pill-bg: rgba(255, 255, 255, 0.22);
  --nav-active-pill-border: rgba(255, 255, 255, 0.18);

  color-scheme: dark;
}
```

### 3.2 Light mode (system + forced)
```css
:root {
  --bg-primary: #F2F2F7;
  --bg-card: #FFFFFF;
  --bg-card-hover: #F8F8FB;
  --bg-elevated: #FFFFFF;
  --bg-sidenav: #FFFFFF;

  --border-subtle: rgba(0, 0, 0, 0.06);
  --border-divider: rgba(0, 0, 0, 0.04);

  --text-primary: #000000;
  --text-secondary: #6C6C70;

  --nav-glass-bg: rgba(255, 255, 255, 0.55);
  --nav-glass-border: rgba(0, 0, 0, 0.1);
  --nav-active-pill-bg: rgba(0, 0, 0, 0.18);
  --nav-active-pill-border: rgba(0, 0, 0, 0.14);

  color-scheme: light;
}
```

---

## 4. The pill — exact dimensions

### 4.1 Outer pill (`<nav>`)
| Property | Value | Why |
|---|---|---|
| `position` | `fixed` | Sits over scrolling content |
| `bottom` | `14` | 14px above screen edge — clears the home indicator |
| `left` | `22` | Horizontal margin from screen edge |
| `right` | `22` | Same |
| `display` | `flex` | Tab buttons in a row |
| `justifyContent` | `space-around` | Even tab spacing |
| `alignItems` | `center` | Tabs vertically centered (no extra space because tab fills nav) |
| `paddingTop` | `0` | Tab content fills nav vertically |
| `paddingLeft / paddingRight` | `6` | Side gutter inside the glass shape |
| `paddingBottom` | `0` | Tab content fills nav vertically |
| `borderRadius` | `999` | Full capsule |
| `background` | `var(--nav-glass-bg)` | Faint white-tinted glass |
| `backdropFilter` | `blur(60px) saturate(180%)` | Heavy frost; saturate compensates for blur washout |
| `WebkitBackdropFilter` | Same | Safari support |
| `border` | `1.5px solid var(--nav-glass-border)` | Subtle highlighted edge |
| `boxShadow` | `inset 0 1px 0 rgba(255, 255, 255, 0.12)` | Inner top highlight — DO NOT add an outer drop shadow (creates a visible dark halo on dark bg) |
| `zIndex` | `50` | Above page content |

**Outer pill total height ≈ 68px** (icon 60 + label 10 + zero padding = 70, but flex column with `gap: 0` collapses to ~68 in practice with line-height: 1).

### 4.2 Each tab button
| Property | Value |
|---|---|
| `display` | `flex` |
| `flexDirection` | `column` |
| `alignItems` | `center` |
| `justifyContent` | `center` |
| `gap` | `0` |
| `padding` | `'0 4px'` |
| `position` | `relative` (so the active pill positions against it) |
| `flex` | `1` (equal width per tab) |
| `background` | `none` |
| `border` | `none` |

`whileTap={{ scale: 0.92 }}` on the motion.button for press feedback.

### 4.3 Icon (PNG, will vary per project)
| Property | Value |
|---|---|
| `width` | `60` |
| `height` | `60` |
| `opacity` | `1` if active, `0.55` if inactive |
| `position` | `relative` |
| `zIndex` | `1` (above the active pill background) |
| `pointerEvents` | `none` |
| `WebkitTouchCallout` | `none` |
| `className` | `'nav-icon'` (used by the light-mode invert filter — see §6) |

### 4.4 Label
| Property | Value |
|---|---|
| `fontSize` | `10` |
| `lineHeight` | `1` (tight; with `1.1` adds another ~1px) |
| `fontWeight` | `500` |
| `color` | `var(--nav-icon-active)` |
| `letterSpacing` | `'0.2px'` |
| `position` | `relative` |
| `zIndex` | `1` |
| `transform` | `translateY(-9px)` ← shifts label visually up without affecting flex layout |
| `opacity` | `1` if active, `0.55` if inactive |

**Label text:** keep to ≤7 characters (e.g. `Home`, `Inbox`, `Goals`, `Reflect`) at fontSize 10. Avoid wrapping.

### 4.5 Active highlight (the moving lozenge)
| Property | Value |
|---|---|
| `position` | `absolute` (inside the tab button, which is `position: relative`) |
| `top` | `3` |
| `bottom` | `3` |
| `left` | `-4` (extends 4px past each tab edge — gives 2px gap from outer pill edge on side tabs, since outer paddingLeft is 6) |
| `right` | `-4` |
| `borderRadius` | `999` (matches the outer pill shape — semicircle ends on left/right) |
| `background` | `var(--nav-active-pill-bg)` |
| `border` | `1px solid var(--nav-active-pill-border)` |
| `zIndex` | `0` (below icon + label) |
| Framer Motion | `layoutId="activeTab"` so a single shared element travels between tabs |
| Transition | `{ type: 'spring', stiffness: 380, damping: 30 }` — slightly damped, "liquid" feel |

Only ONE active highlight should be rendered at a time (conditional on `active` per tab). Framer Motion's `layoutId` handles the cross-tab travel animation.

---

## 5. Component reference (full BottomNav.tsx)

```tsx
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const BASE = import.meta.env.BASE_URL;

// ⚠️ Icons + labels vary per project — replace these four
const tabs = [
  { path: '/', icon: `${BASE}icons/home.png`, label: 'Home' },
  { path: '/inbox', icon: `${BASE}icons/inbox.png`, label: 'Inbox' },
  { path: '/goals', icon: `${BASE}icons/goals.png`, label: 'Goals' },
  { path: '/reflections', icon: `${BASE}icons/reflections.png`, label: 'Reflect' },
] as const;

interface BottomNavProps { visible: boolean }

export default function BottomNav({ visible }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  if (!visible) return null;

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <nav style={styles.nav}>
      {tabs.map(({ path, icon, label }) => {
        const active = isActive(path);
        return (
          <motion.button
            key={path}
            onClick={() => navigate(path)}
            style={styles.tab}
            whileTap={{ scale: 0.92 }}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
          >
            {active && (
              <motion.div
                layoutId="activeTab"
                style={styles.activePill}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <img
              src={icon}
              alt=""
              width={60}
              height={60}
              draggable={false}
              className="nav-icon"
              style={{
                opacity: active ? 1 : 0.55,
                position: 'relative',
                zIndex: 1,
                pointerEvents: 'none',
                WebkitTouchCallout: 'none',
              }}
            />
            <span style={{ ...styles.tabLabel, opacity: active ? 1 : 0.55 }}>
              {label}
            </span>
          </motion.button>
        );
      })}
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    position: 'fixed',
    bottom: 14,
    left: 22,
    right: 22,
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 0,
    paddingLeft: 6,
    paddingRight: 6,
    paddingBottom: 0,
    borderRadius: 999,
    background: 'var(--nav-glass-bg)',
    backdropFilter: 'blur(60px) saturate(180%)',
    WebkitBackdropFilter: 'blur(60px) saturate(180%)',
    border: '1.5px solid var(--nav-glass-border)',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    zIndex: 50,
  },
  tab: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    padding: '0 4px',
    position: 'relative',
    flex: 1,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  },
  activePill: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: -4,
    right: -4,
    borderRadius: 999,
    background: 'var(--nav-active-pill-bg)',
    border: '1px solid var(--nav-active-pill-border)',
    zIndex: 0,
  },
  tabLabel: {
    fontSize: 10,
    lineHeight: 1,
    fontWeight: 500,
    color: 'var(--nav-icon-active)',
    letterSpacing: '0.2px',
    position: 'relative',
    zIndex: 1,
    transform: 'translateY(-9px)',
  },
};
```

---

## 6. Icon notes (the variable part)

### 6.1 Format
- 4 transparent PNG/SVG icons sized for 60px display (export at 2x = 120px, or use SVG).
- White-on-transparent assets work well for dark mode.

### 6.2 Light-mode inversion (only needed if icons are white-only)
For white-on-transparent PNGs, this CSS auto-inverts them in light mode so they show as black on the light pill:
```css
.nav-icon { filter: none; }
@media (prefers-color-scheme: light) {
  html:not(.dark):not(.light) .nav-icon { filter: invert(1); }
}
html.light .nav-icon { filter: invert(1); }
html.dark .nav-icon { filter: none; }
```
If your icons are properly multi-color or themed-by-asset, remove this rule.

### 6.3 Icon style guidance
- Stroke-style line icons (Apple Music / iOS Settings vibe) work well.
- Filled or duotone also works but tends to feel heavier — adjust opacity values for the active/inactive states.
- Keep icons within the 60×60 frame with ~6px of internal padding so they don't crowd the active highlight's corners.

---

## 7. Routing / visibility integration

In `App.tsx`:
```tsx
const isMobile = useIsMobile();
const showNav =
  !location.pathname.startsWith('/focus') &&  // hide on immersive screens
  location.pathname !== '/reflection';

return (
  <div className="app-shell">
    {!isMobile && <SideNav visible={showNav} />}
    <main className="app-main"><Routes>…</Routes></main>
    {isMobile && <BottomNav visible={showNav} />}
  </div>
);
```

The pill is rendered as a sibling of `<main>` so it's NOT inside the scroll container.

---

## 8. iOS PWA specifics that matter

### 8.1 Index.html
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover" />
<meta name="theme-color" content="#0A0A0A" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black" />
```
- `viewport-fit=cover` is **required** to expose safe-area-inset values.
- `apple-mobile-web-app-status-bar-style` should be `black` (NOT `black-translucent`) — translucent decouples the layout viewport from the visual viewport on iOS standalone and breaks `position: fixed; bottom: 0`.

### 8.2 Manifest (vite-plugin-pwa)
```ts
manifest: {
  display: 'standalone',
  orientation: 'portrait-primary',
  start_url: '/...',
  scope: '/...',
  theme_color: '#0A0A0A',
  background_color: '#040406',
  // …icons
}
```
- `display: standalone` enables the PWA-installed-to-home-screen mode.
- `orientation: portrait-primary` locks orientation in iOS PWA (only works on first install — reinstall PWA to apply changes).

### 8.3 Reinstall caveat
iOS aggressively caches both the manifest AND the service-worker shell at install time. Any change to manifest values, viewport meta, or theme color does NOT propagate to existing installs. **Tell users to remove the home-screen icon and re-add it** when shipping these changes.

---

## 9. Update flow (live PWA updates)

`vite-plugin-pwa` config:
```ts
VitePWA({
  registerType: 'autoUpdate',
  injectRegister: 'auto',
  workbox: {
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    skipWaiting: true,
    globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg}'],
  },
  manifest: { … }
})
```

Pair with an `UpdatePrompt.tsx` component using `useRegisterSW` from `virtual:pwa-register/react`:
```tsx
const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegisteredSW(_url, r) {
    if (!r) return;
    setInterval(() => { r.update().catch(() => {}) }, 30 * 60 * 1000);
  },
});
```
Render a fixed pill at the top of the screen when `needRefresh[0]` is true, with `Update` + `Later` buttons. Update calls `updateServiceWorker(true)` to activate the new SW and reload.

---

## 10. Other UX details that pair with this nav

### 10.1 Selection / callout suppression
```css
* {
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}
input, textarea, [contenteditable="true"], .selectable, .selectable * {
  -webkit-user-select: text;
  user-select: text;
  -webkit-touch-callout: default;
}
```
Prevents the iOS text-callout from appearing on long-press of icons/labels/headings. Inputs and `.selectable` opt-in.

### 10.2 Zoom disabled
The viewport meta above (`maximum-scale=1, user-scalable=no`) + `touch-action: pan-x pan-y` on html/body kills pinch and double-tap zoom.

### 10.3 FAB clearance
Floating action buttons should sit `bottom: calc(96px + env(safe-area-inset-bottom, 0px))` to clear the pill plus a bit of breathing room.

### 10.4 Modals
Center modals on every breakpoint with `padding: 20` gutter — don't use bottom-sheet style modals, they get clipped behind the floating pill on mobile.

### 10.5 Landscape lock
Optional CSS fallback for browsers that don't honor `orientation: portrait-primary`:
```css
@media (orientation: landscape) and (max-device-height: 600px) {
  .app-shell { display: none !important; }
  body::before {
    content: 'Rotate your phone to portrait';
    position: fixed; inset: 0;
    display: flex; align-items: center; justify-content: center;
    background: var(--bg-primary); color: var(--text-primary);
    font-size: 16px; font-weight: 600; padding: 24px; z-index: 9999;
  }
}
```

---

## 11. The single-knob summary (if you only had time to skim)

| Knob | Value | Effect |
|---|---|---|
| Page bg | `#040406` | Jet-black canvas — content cards must be lighter than this |
| Nav `bottom` | `14` | Clears the home indicator |
| Nav `left / right` | `22` | Floating feel — visible gutter |
| Nav `borderRadius` | `999` | Full capsule |
| Nav `background` | `rgba(255,255,255,0.05)` | Colorless glass — takes its tint from what's behind |
| Backdrop filter | `blur(60px) saturate(180%)` | The "liquid glass" effect |
| Icons | `60px` | Big enough to read at a glance |
| Labels | `10px` font, `translateY(-9px)` | Tucked tight under the icons |
| Active pill | `top:3 bottom:3 left:-4 right:-4`, `radius:999` | 3px inset from top/bottom of outer pill, sits 2px from outer pill on side tabs |
| Active pill bg | `rgba(255,255,255,0.22)` | Clearly visible against the colorless outer glass |
| Active travel | `layoutId="activeTab"`, spring 380/30 | Liquid travel between tabs |

---

## 12. Known constraints / non-goals

- Tested with 4 tabs. With 3 or 5+ tabs, the `left:-4 right:-4` extension on side tabs may need adjustment to keep the 2px outer gap.
- Heavy `backdrop-filter: blur(60px)` is GPU-cheap on iOS/modern Android but can drop frames on very old Android. Reduce to `blur(40px)` if needed.
- The colorless glass relies on the page having some content scrolling behind it; if your page is uniformly empty (all background), the pill will look almost identical to the page. The border + active highlight are what give it presence in that case.
