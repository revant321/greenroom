# Phase N8: Polish + EAS / TestFlight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Expo Go-runnable app into a polished, installable TestFlight build. Themes, skeletons, errors, empty states, and SF Symbols get their passes; then EAS Build is configured and a first TestFlight submission goes out.

**Architecture:** Introduces a `ThemeProvider` (Appearance + persisted override), replaces hard-coded colors with tokens, installs `expo-symbols` and swaps icons, adds a small `Skeleton` component and a `Toast` system, then configures `eas.json` and a production build profile.

**Tech Stack (added):** `expo-symbols`, `@expo/vector-icons`, `eas-cli`.

**Spec:** `docs/superpowers/specs/2026-04-19-react-native-expo-migration-design.md`
**Prior plans:** N1–N7 complete.

---

## File Structure

```
src/
├── theme/
│   ├── tokens.ts              # NEW: colors, spacing, radius, type
│   ├── ThemeProvider.tsx      # NEW
│   └── useTheme.ts            # NEW
├── components/
│   ├── Skeleton.tsx           # NEW
│   ├── ErrorState.tsx         # NEW
│   ├── Toast.tsx              # NEW: ToastProvider + useToast
│   └── Icon.tsx               # NEW: wrapper around expo-symbols with Ionicons fallback
app/(app)/settings.tsx         # MODIFIED: theme override picker
app/_layout.tsx                # MODIFIED: ThemeProvider + ToastProvider
[all screens]                  # MODIFIED: colors/spacing pulled from tokens, skeletons, toasts
eas.json                       # NEW
app.json                       # MODIFIED: production metadata (icon, splash, privacy strings)
```

---

## Task 1: Design tokens

**Files:**
- Create: `src/theme/tokens.ts`

- [ ] **Step 1: Implement**

```ts
export const palette = {
  light: {
    bg: "#FAFAFA",
    bgElevated: "#FFFFFF",
    card: "#FFFFFF",
    border: "#E5E5EA",
    text: "#111111",
    textMuted: "#6C6C70",
    accent: "#007AFF",
    danger: "#FF3B30",
    warn: "#FF9500",
    success: "#34C759",
    shadow: "rgba(0,0,0,0.05)",
  },
  dark: {
    bg: "#000000",
    bgElevated: "#1C1C1E",
    card: "#1C1C1E",
    border: "#3A3A3C",
    text: "#FFFFFF",
    textMuted: "#8E8E93",
    accent: "#0A84FF",
    danger: "#FF453A",
    warn: "#FF9F0A",
    success: "#30D158",
    shadow: "rgba(0,0,0,0.4)",
  },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 6, md: 10, lg: 14, pill: 999 };
export const type = {
  title: { fontSize: 32, fontWeight: "700" as const },
  heading: { fontSize: 20, fontWeight: "600" as const },
  body: { fontSize: 16, fontWeight: "400" as const },
  bodyStrong: { fontSize: 16, fontWeight: "600" as const },
  caption: { fontSize: 13, fontWeight: "400" as const },
  label: { fontSize: 14, fontWeight: "500" as const },
};

export type ColorTokens = typeof palette.light;
```

- [ ] **Step 2: Commit**

```bash
git add src/theme/tokens.ts
git commit -m "feat(theme): add design tokens for colors, spacing, radius, type"
```

---

## Task 2: ThemeProvider + useTheme

**Files:**
- Create: `src/theme/ThemeProvider.tsx`, `src/theme/useTheme.ts`

- [ ] **Step 1: Provider**

```tsx
// src/theme/ThemeProvider.tsx
import { createContext, ReactNode, useEffect, useState } from "react";
import { Appearance, ColorSchemeName } from "react-native";
import * as SecureStore from "expo-secure-store";
import { palette, ColorTokens } from "./tokens";

type Mode = "auto" | "light" | "dark";
const KEY = "greenroom.theme-mode";

export type ThemeContextValue = {
  mode: Mode;
  setMode: (m: Mode) => void;
  colors: ColorTokens;
  scheme: "light" | "dark";
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>("auto");
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

  useEffect(() => {
    SecureStore.getItemAsync(KEY).then((v) => { if (v === "light" || v === "dark" || v === "auto") setModeState(v); });
    const sub = Appearance.addChangeListener(({ colorScheme }) => setSystemScheme(colorScheme));
    return () => sub.remove();
  }, []);

  const effective: "light" | "dark" =
    mode === "auto" ? (systemScheme === "dark" ? "dark" : "light") : mode;

  function setMode(m: Mode) {
    setModeState(m);
    SecureStore.setItemAsync(KEY, m).catch(() => {});
  }

  return (
    <ThemeContext.Provider value={{ mode, setMode, scheme: effective, colors: palette[effective] }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

- [ ] **Step 2: Hook**

```ts
// src/theme/useTheme.ts
import { useContext } from "react";
import { ThemeContext } from "./ThemeProvider";

export function useTheme() {
  const v = useContext(ThemeContext);
  if (!v) throw new Error("useTheme must be used inside ThemeProvider");
  return v;
}
```

- [ ] **Step 3: Wire into root layout**

Modify `app/_layout.tsx`:
```tsx
import { ThemeProvider } from "@/theme/ThemeProvider";
// ...
<PersistQueryClientProvider ...>
  <AuthProvider>
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  </AuthProvider>
</PersistQueryClientProvider>
```

- [ ] **Step 4: Commit**

```bash
git add src/theme/ThemeProvider.tsx src/theme/useTheme.ts app/_layout.tsx
git commit -m "feat(theme): ThemeProvider with persisted override"
```

---

## Task 3: Theme override picker in Settings

**Files:**
- Modify: `app/(app)/settings.tsx`

- [ ] **Step 1: Add a 3-chip picker**

```tsx
import { useTheme } from "@/theme/useTheme";
// ...
const { mode, setMode, colors } = useTheme();

// Render above the sign-out button:
<Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 16 }}>Theme</Text>
<View style={{ flexDirection: "row", gap: 8 }}>
  {(["auto", "light", "dark"] as const).map((m) => (
    <Pressable key={m} onPress={() => setMode(m)}
      style={{
        padding: 10, paddingHorizontal: 16, borderRadius: 999,
        backgroundColor: mode === m ? colors.accent : colors.card,
        borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
      }}>
      <Text style={{ color: mode === m ? "#fff" : colors.text }}>{m}</Text>
    </Pressable>
  ))}
</View>
```

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/settings.tsx"
git commit -m "feat(theme): light/dark/auto picker in settings"
```

---

## Task 4: Apply tokens across screens

**Files:**
- Modify: every screen and component file that currently uses hard-coded `"#007AFF"`, `"#FF3B30"`, `"#666"`, `"#fff"`, `"#ddd"`, etc.

Mechanical pass. Each component imports `useTheme` and swaps literal colors for token references. StyleSheets that used static colors become functions:

```tsx
const makeStyles = (c: ColorTokens) => StyleSheet.create({
  container: { backgroundColor: c.bg, flex: 1 },
  card: { backgroundColor: c.card, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.lg },
  ...
});

// inside component:
const { colors } = useTheme();
const styles = useMemo(() => makeStyles(colors), [colors]);
```

This is a repetitive but important refactor. Work screen by screen, commit one at a time:
- Home (`app/(app)/index.tsx`)
- Completed (`app/(app)/completed.tsx`)
- Settings (`app/(app)/settings.tsx`)
- Show hub + musical numbers list + detail + new
- Scenes list + detail + new
- Songs list + detail + new
- Login screen
- Components: `AudioRecorder`, `AudioPlayer`, `VideoPlayer`, `PdfViewer`

- [ ] **Step 1: Do it**

- [ ] **Step 2: Commit per screen or in logical chunks**

E.g.:
```bash
git add "app/(app)/index.tsx" "app/(app)/completed.tsx" "app/(app)/settings.tsx"
git commit -m "refactor(theme): apply color tokens to top-level screens"

git add "app/(app)/shows" "app/(app)/songs"
git commit -m "refactor(theme): apply color tokens to show and song screens"

git add components/
git commit -m "refactor(theme): apply color tokens to media components"
```

---

## Task 5: Skeleton component + apply to lists

**Files:**
- Create: `src/components/Skeleton.tsx`
- Modify: every list screen (Home, Completed, Musical Numbers, Scenes, Songs)

- [ ] **Step 1: Implement Skeleton**

```tsx
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "@/theme/useTheme";

export function Skeleton({ style }: { style?: ViewStyle }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.base, { backgroundColor: colors.border, opacity }, style]} />;
}

const styles = StyleSheet.create({ base: { borderRadius: 8, height: 16 } });
```

- [ ] **Step 2: Replace `ActivityIndicator` loading states with skeleton lists**

In each list screen, when `isLoading && !data`, render an array of 4–6 skeleton cards instead of a spinner.

Example for Home:
```tsx
if (isLoading && !data) {
  return (
    <View style={{ padding: spacing.lg, gap: spacing.md }}>
      {[0,1,2,3].map((i) => (
        <View key={i} style={styles.card}>
          <Skeleton style={{ height: 20, width: "60%" }} />
          <Skeleton style={{ height: 14, width: "40%", marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Skeleton.tsx "app/(app)"
git commit -m "feat(ui): skeleton loading states for list screens"
```

---

## Task 6: Toast system

**Files:**
- Create: `src/components/Toast.tsx`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/Toast.tsx
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/useTheme";

type Toast = { id: number; message: string; kind: "info" | "error" | "success" };
type ToastContextValue = { show: (message: string, kind?: Toast["kind"]) => void };
const Ctx = createContext<ToastContextValue | null>(null);

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast must be inside ToastProvider");
  return v;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const idRef = useRef(0);

  const show = useCallback((message: string, kind: Toast["kind"] = "info") => {
    const id = ++idRef.current;
    setToast({ id, message, kind });
    Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    setTimeout(() => {
      if (idRef.current !== id) return;
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToast(null));
    }, 2400);
  }, [opacity]);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {toast && <ToastView toast={toast} opacity={opacity} />}
    </Ctx.Provider>
  );
}

function ToastView({ toast, opacity }: { toast: Toast; opacity: Animated.Value }) {
  const { colors } = useTheme();
  const bg = toast.kind === "error" ? colors.danger : toast.kind === "success" ? colors.success : colors.bgElevated;
  const fg = toast.kind === "info" ? colors.text : "#fff";
  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { opacity, backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{toast.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute", bottom: 64, left: 24, right: 24, padding: 14, borderRadius: 12,
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  text: { fontSize: 14, textAlign: "center" },
});
```

- [ ] **Step 2: Wrap root**

```tsx
// app/_layout.tsx
import { ToastProvider } from "@/components/Toast";
// ...
<ThemeProvider>
  <ToastProvider>
    <Stack screenOptions={{ headerShown: false }} />
  </ToastProvider>
</ThemeProvider>
```

- [ ] **Step 3: Replace `Alert.alert` mutation-error calls with `useToast().show(..., "error")`**

Pass through every upload/mutation failure path in musical-number detail, scene detail, song detail, dance-video flow, PDF flow, login. Keep destructive-action confirmations as `Alert.alert` (those need blocking modal UX).

- [ ] **Step 4: Commit**

```bash
git add src/components/Toast.tsx app/_layout.tsx "app/(app)" "app/(auth)"
git commit -m "feat(ui): add Toast system and swap error Alerts to toasts"
```

---

## Task 7: Empty states

**Files:**
- Modify: every list screen

Replace bare "No X yet." text with a branded empty state: a small icon + title + supportive body + primary action.

- [ ] **Step 1: Create a shared component**

```tsx
// src/components/EmptyState.tsx
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/useTheme";

type Props = { icon?: string; title: string; body: string; actionLabel?: string; onAction?: () => void };
export function EmptyState({ icon = "✨", title, body, actionLabel, onAction }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>{body}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} style={[styles.action, { backgroundColor: colors.accent }]}>
          <Text style={{ color: "#fff", fontWeight: "600" }}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", padding: 32, gap: 8 },
  icon: { fontSize: 40 },
  title: { fontSize: 20, fontWeight: "600" },
  body: { fontSize: 15, textAlign: "center" },
  action: { marginTop: 12, padding: 12, paddingHorizontal: 20, borderRadius: 10 },
});
```

- [ ] **Step 2: Use it**

In Home: `<EmptyState icon="🎭" title="No shows yet" body="Tap + to add your first show." />`
Similar for musical numbers, scenes, songs, completed.

- [ ] **Step 3: Commit**

```bash
git add src/components/EmptyState.tsx "app/(app)"
git commit -m "feat(ui): branded empty states across list screens"
```

---

## Task 8: SF Symbols icon pass

**Files:**
- Install: `expo-symbols`
- Create: `src/components/Icon.tsx`
- Modify: every place using emoji (✓, 🗑, +, 📄, ↗, ↩︎, etc.)

- [ ] **Step 1: Install**

```bash
npx expo install expo-symbols @expo/vector-icons
```

- [ ] **Step 2: Wrapper**

```tsx
// src/components/Icon.tsx
import { SymbolView, SymbolWeight } from "expo-symbols";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/useTheme";
import { Platform, StyleProp, ViewStyle } from "react-native";

type Props = {
  sfSymbol: string;
  ioniconsFallback: keyof typeof Ionicons.glyphMap;
  size?: number;
  weight?: SymbolWeight;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export function Icon({ sfSymbol, ioniconsFallback, size = 22, weight = "regular", color, style }: Props) {
  const { colors } = useTheme();
  const c = color ?? colors.accent;
  if (Platform.OS === "ios") {
    return <SymbolView name={sfSymbol as any} size={size} weight={weight} tintColor={c} style={style} />;
  }
  return <Ionicons name={ioniconsFallback} size={size} color={c} style={style as any} />;
}
```

- [ ] **Step 3: Replace emoji icons**

Mapping cheatsheet:
- Checkmark (✓) → `{ sfSymbol: "checkmark.circle", ioniconsFallback: "checkmark-circle-outline" }`
- Trash (🗑) → `trash` / `"trash-outline"`
- Plus (+) → `plus` / `"add"`
- Document (📄) → `doc` / `"document-outline"`
- Arrow external (↗) → `arrow.up.right.square` / `"open-outline"`
- Undo/restore (↩︎) → `arrow.uturn.backward` / `"arrow-undo"`
- Play (▶︎) → `play.fill` / `"play"`
- Pause (⏸) → `pause.fill` / `"pause"`
- Record (filled circle) → `record.circle` / `"radio-button-on"`
- Stop → `stop.fill` / `"stop"`

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/components/Icon.tsx "app" components
git commit -m "feat(ui): SF Symbols icons with Ionicons fallback"
```

---

## Task 9: App icon, splash, and metadata

**Files:**
- Modify: `app.json`
- Add: `assets/icon.png`, `assets/splash.png` (if not already provided by `create-expo-app` defaults you want to replace)

- [ ] **Step 1: Source assets**

Provide a 1024×1024 `icon.png` and a splash image (or keep Expo defaults for V1 and revisit).

- [ ] **Step 2: Update `app.json`**

```json
{
  "expo": {
    "name": "greenroom",
    "slug": "greenroom",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "scheme": "greenroom",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#FFFFFF"
    },
    "ios": {
      "bundleIdentifier": "com.codeflixacademy.greenroom",
      "supportsTablet": false,
      "usesAppleSignIn": true,
      "infoPlist": {
        "NSMicrophoneUsageDescription": "greenroom uses the microphone to record harmonies and scene rehearsals.",
        "NSCameraUsageDescription": "greenroom uses the camera to record dance videos and scene recordings.",
        "NSPhotoLibraryUsageDescription": "greenroom imports videos from your Photos for dance-number reference."
      }
    },
    "plugins": ["expo-router", "expo-apple-authentication"],
    "experiments": { "typedRoutes": true }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app.json assets/
git commit -m "feat: production app metadata, icon, splash, and privacy strings"
```

---

## Task 10: EAS Build configuration

**Files:**
- Create: `eas.json`

- [ ] **Step 1: Install EAS CLI (once per dev machine)**

```bash
npm install --global eas-cli
```

- [ ] **Step 2: Log in and configure**

```bash
eas login
eas init --id <supabase-agnostic; EAS prompts you>
```

The first `eas init` inside the repo writes a project ID back into `app.json` under `expo.extra.eas.projectId`. Commit that change.

- [ ] **Step 3: Create `eas.json`**

```json
{
  "cli": { "version": ">= 7.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "<placeholder — fill after App Store Connect record exists>",
        "appleTeamId": "<placeholder — your Apple Developer Team ID>"
      }
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add eas.json app.json
git commit -m "chore: configure EAS build profiles (dev, preview, production)"
```

---

## Task 11: First internal build

- [ ] **Step 1: Build preview**

```bash
eas build --profile preview --platform ios
```

EAS will prompt for Apple Developer credentials if not already stored. Wait for the build to finish (~10–20 min).

- [ ] **Step 2: Install on device**

When the build completes, EAS gives a URL. Open on the iPhone → follow install prompts. The app installs without Expo Go and launches directly.

- [ ] **Step 3: Smoke-test on the installed build**

Run the Phase N1–N7 acceptance flows end-to-end: sign in, create a show, record a harmony, play it back offline, etc. This is the first time the app runs outside Expo Go — some issues only surface here (e.g., missing plugin config, permission strings, font/icon loading).

If anything fails, fix it, rebuild, and repeat.

---

## Task 12: TestFlight submission (optional, requires App Store Connect setup)

- [ ] **Step 1: Create an App Store Connect record**

In https://appstoreconnect.apple.com → My Apps → + → New App → iOS, name "greenroom," bundle ID `com.codeflixacademy.greenroom`, SKU `greenroom-ios`. Note the ASC App ID.

- [ ] **Step 2: Fill in submit config**

Edit `eas.json` `submit.production.ios` with your real `ascAppId` and `appleTeamId`. Commit.

- [ ] **Step 3: Production build + submit**

```bash
eas build --profile production --platform ios
eas submit --platform ios --latest
```

- [ ] **Step 4: Install via TestFlight**

Once App Store Connect finishes processing, the build appears in TestFlight; install TestFlight on your iPhone and run it from there.

- [ ] **Step 5: Tag and celebrate**

```bash
git tag phase-n8-complete
git tag v1.0.0-testflight
```

---

## Self-Review

- **Spec coverage:** theming (tokens, provider, override picker) ✓, skeletons ✓, error toasts ✓, empty states ✓, SF Symbols ✓, EAS build + TestFlight ✓.
- **Placeholder scan:** `app.json` and `eas.json` contain bracketed placeholders (`<your-project-ref>`, `<placeholder — …>`) that the user must fill during Apple Developer setup. These are genuine user-action placeholders, not plan laziness. Called out explicitly in the surrounding steps.
- **Assets caveat:** `assets/icon.png` and `assets/splash.png` are external deliverables (ideally produced by a designer or AI image tool), not code. Task 9 leaves room for the user to provide these or defer.
- **Out of scope, intentionally:** App Store review submission (not TestFlight), localization, accessibility audit, analytics, crash reporting, CI/CD. These are all reasonable next steps but not part of the spec's V1.

---

## Done

After `phase-n8-complete`, the React Native + Expo migration is complete: a signed-in user runs greenroom as a TestFlight-installed native iOS app, with all of the web app's features (minus `.grm` and the web PWA itself), backed by Supabase for identity + data + media, and working offline for anything previously viewed.
