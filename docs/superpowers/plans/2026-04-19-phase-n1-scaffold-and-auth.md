# Phase N1: Scaffold + Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the web PWA with a fresh Expo iOS app that a signed-in user can open, see their email in Settings, and sign out of — proving the entire auth toolchain works end-to-end on a real iPhone.

**Architecture:** Expo managed workflow at repo root (the old web code is deleted; git history preserves it). Expo Router with `(auth)` and `(app)` route groups. Supabase Auth for identity with native ID-token flows (`expo-apple-authentication` + `expo-auth-session` for Google). The Supabase JS client persists its session via a custom adapter backed by `expo-secure-store`.

**Tech Stack:** Expo SDK (latest), React Native, TypeScript, Expo Router, `@supabase/supabase-js`, `expo-apple-authentication`, `expo-auth-session`, `expo-secure-store`, `expo-crypto`, Jest (`jest-expo`) + React Native Testing Library.

**Spec:** `docs/superpowers/specs/2026-04-19-react-native-expo-migration-design.md`

**Prereqs (non-code, user-owned — verify before starting):**
- Supabase project exists; URL + publishable key known.
- Supabase Dashboard → Authentication → Providers: Apple + Google both enabled with client IDs configured.
- Apple Developer Program membership + "Sign In with Apple" capability configured against the chosen bundle identifier.
- Google Cloud OAuth client IDs exist (one iOS-type, one Web-type for Supabase exchange).
- Node + npm + Xcode installed on the dev Mac; Expo Go installed on the dev iPhone.

---

## File Structure

Post-plan repo layout (only Phase N1 files shown):

```
greenroom/
├── app/
│   ├── _layout.tsx              # Root: providers (Auth, QueryClient, Theme)
│   ├── index.tsx                # Entry: redirects based on auth state
│   ├── (auth)/
│   │   └── login.tsx            # Apple + Google sign-in buttons
│   └── (app)/
│       ├── _layout.tsx          # Gates on session; redirects to /login if none
│       ├── index.tsx            # Home placeholder ("Signed in as {email}")
│       └── settings.tsx         # Email + sign-out button
├── src/
│   ├── lib/
│   │   ├── supabase.ts          # Supabase client + SecureStore adapter
│   │   └── secureStoreAdapter.ts
│   ├── hooks/
│   │   └── useAuth.tsx          # AuthProvider + useAuth hook
│   └── services/
│       └── authService.ts       # signInWithApple, signInWithGoogle, signOut
├── __tests__/
│   ├── secureStoreAdapter.test.ts
│   ├── useAuth.test.tsx
│   └── authService.test.ts
├── app.json                     # Expo config (bundle id, plugins, scheme)
├── babel.config.js              # Expo preset
├── tsconfig.json                # Expo TS preset + path aliases
├── package.json
├── jest.config.js
├── .env.example
├── .env                         # gitignored
├── .gitignore
├── CLAUDE.md                    # updated
├── greenroom-project-spec.md    # updated
└── docs/                        # untouched
```

Each file has one responsibility. The Supabase client, session adapter, auth hook, and service functions live in separate files so each can be unit-tested in isolation.

---

## Task 1: Archive web code and scaffold Expo app

**Files:**
- Delete: `src/`, `public/`, `dist/`, `index.html`, `vite.config.ts`, `eslint.config.js`, `tsconfig.app.json`, `tsconfig.node.json`, `tsconfig.json`, `package.json`, `package-lock.json`, `node_modules/`
- Create: everything `create-expo-app` produces (`package.json`, `app.json`, `babel.config.js`, `tsconfig.json`, `app/`, `assets/`, etc.)

The old files stay recoverable via git history (last web commit: `75318d9` before this plan starts, or any earlier hash). We don't need a branch.

- [ ] **Step 1: Sanity check git state**

Run: `git status && git log --oneline -5`
Expected: Working tree clean. Current HEAD is on `main` with the spec commit present.

- [ ] **Step 2: Delete web files**

```bash
rm -rf src public dist node_modules
rm -f index.html vite.config.ts eslint.config.js \
      tsconfig.app.json tsconfig.node.json tsconfig.json \
      package.json package-lock.json
```

- [ ] **Step 3: Commit the deletion**

```bash
git add -A
git commit -m "chore: remove web PWA in preparation for RN/Expo scaffold"
```

- [ ] **Step 4: Scaffold Expo app in place**

The greenroom directory becomes the Expo project root. `create-expo-app` refuses a non-empty directory, so scaffold into a temp dir then move the contents in.

```bash
cd /tmp
npx create-expo-app@latest greenroom-scaffold --template blank-typescript
# When prompted for anything, accept defaults.
cd greenroom-scaffold
# Move everything (including dotfiles) except .git into the real repo.
shopt -s dotglob 2>/dev/null || setopt -s dotglob  # zsh; bash uses shopt
for f in *; do
  [ "$f" = ".git" ] && continue
  mv "$f" /Users/jesseluo/Documents/workspaces/greenroom/
done
cd /Users/jesseluo/Documents/workspaces/greenroom
rm -rf /tmp/greenroom-scaffold
```

Verify: `ls -la` should show `app.json`, `package.json`, `App.tsx` (or equivalent), `assets/`, `tsconfig.json`.

- [ ] **Step 5: Install and smoke-test**

```bash
npm install
npx expo-doctor
```

Expected: `expo-doctor` reports no critical issues.

- [ ] **Step 6: Commit the scaffold**

```bash
git add -A
git commit -m "feat: scaffold Expo managed app with TypeScript template"
```

---

## Task 2: Convert to Expo Router

`create-expo-app --template blank-typescript` produces a plain single-file RN app. We need Expo Router's file-based layout.

**Files:**
- Modify: `package.json`, `app.json`
- Delete: `App.tsx` (replaced by `app/_layout.tsx` + `app/index.tsx`)
- Create: `app/_layout.tsx`, `app/index.tsx`

- [ ] **Step 1: Install Expo Router**

```bash
npx expo install expo-router react-native-safe-area-context \
  react-native-screens expo-linking expo-constants expo-status-bar
```

- [ ] **Step 2: Configure entry point in `package.json`**

Edit `package.json` so that the `"main"` field is:
```json
"main": "expo-router/entry"
```

If there is no `"main"` field, add it. The value was previously `"expo/AppEntry.js"` or similar.

- [ ] **Step 3: Configure scheme + plugin in `app.json`**

Inside the existing `expo` object, ensure these fields exist (merge with what's there):
```json
{
  "expo": {
    "name": "greenroom",
    "slug": "greenroom",
    "scheme": "greenroom",
    "plugins": ["expo-router"],
    "experiments": { "typedRoutes": true },
    "ios": { "bundleIdentifier": "com.codeflixacademy.greenroom" }
  }
}
```

- [ ] **Step 4: Delete the legacy entry**

```bash
rm App.tsx
```

- [ ] **Step 5: Create `app/_layout.tsx`**

```tsx
import { Stack } from "expo-router";

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 6: Create `app/index.tsx`**

```tsx
import { Text, View } from "react-native";

export default function Home() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>greenroom — scaffold works</Text>
    </View>
  );
}
```

- [ ] **Step 7: Run and verify**

Run: `npx expo start`
Expected: Dev server starts. Open Expo Go on iPhone, scan QR, see "greenroom — scaffold works." Kill the dev server once verified.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: adopt Expo Router with root layout and placeholder home"
```

---

## Task 3: Configure TypeScript path aliases and environment variables

**Files:**
- Modify: `tsconfig.json`
- Create: `.env.example`, `.env`
- Modify: `.gitignore`

- [ ] **Step 1: Add `@/*` path alias to `tsconfig.json`**

Full `tsconfig.json` contents:
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ]
}
```

- [ ] **Step 2: Create `.env.example`**

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

- [ ] **Step 3: Create `.env` (real values, gitignored)**

Copy `.env.example` to `.env` and fill in real values from the Supabase dashboard + Google Cloud Console. The Web client ID is the one Supabase uses server-side for token verification.

- [ ] **Step 4: Confirm `.env` is gitignored**

Check that `.gitignore` contains `.env`. The Expo default `.gitignore` already includes `.env*.local` but NOT plain `.env`. Add an explicit `.env` line if missing:

```
.env
```

- [ ] **Step 5: Smoke test: env vars are readable**

Add a temporary `console.log(process.env.EXPO_PUBLIC_SUPABASE_URL)` in `app/index.tsx`, restart the dev server (`npx expo start -c` — the `-c` clears the cache so env changes pick up), and confirm the URL is logged in the Metro terminal when the app loads. Remove the log.

- [ ] **Step 6: Commit**

```bash
git add tsconfig.json .env.example .gitignore
git commit -m "chore: configure TS path aliases and env var scaffolding"
```

---

## Task 4: Install data + auth dependencies

**Files:**
- Modify: `package.json` (via `npx expo install`)

- [ ] **Step 1: Install Supabase + auth + storage libs**

```bash
npx expo install @supabase/supabase-js expo-secure-store expo-crypto \
  expo-apple-authentication expo-auth-session expo-web-browser \
  @react-native-async-storage/async-storage
```

`async-storage` is a transitive dep of some Supabase/Expo helpers even though we use SecureStore for sessions; installing it avoids resolver warnings.

- [ ] **Step 2: Install dev dependencies for testing**

```bash
npm install --save-dev jest jest-expo @types/jest \
  @testing-library/react-native @testing-library/jest-native \
  react-test-renderer
```

- [ ] **Step 3: Verify install**

Run: `npx expo-doctor`
Expected: no "incompatible version" warnings for the installed packages.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install Supabase, auth, and test dependencies"
```

---

## Task 5: Configure Jest

**Files:**
- Create: `jest.config.js`
- Modify: `package.json` (add `"test"` script)

- [ ] **Step 1: Create `jest.config.js`**

```js
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEach: ["@testing-library/jest-native/extend-expect"],
  transformIgnorePatterns: [
    "node_modules/(?!(jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@supabase/.*)"
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1"
  }
};
```

- [ ] **Step 2: Add `test` script to `package.json`**

Under `"scripts"`, add:
```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 3: Smoke-test Jest**

Create a throwaway `__tests__/smoke.test.ts`:
```ts
test("jest is wired", () => {
  expect(1 + 1).toBe(2);
});
```

Run: `npm test -- smoke`
Expected: 1 test passes. Delete the file.

- [ ] **Step 4: Commit**

```bash
git add jest.config.js package.json package-lock.json
git commit -m "chore: configure Jest with jest-expo preset"
```

---

## Task 6: Secure-store session adapter (TDD)

The Supabase JS client requires a storage implementation with `getItem/setItem/removeItem`. Default is `localStorage`, which does not exist in RN. We write a thin adapter over `expo-secure-store`.

**Files:**
- Create: `src/lib/secureStoreAdapter.ts`
- Test: `__tests__/secureStoreAdapter.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/secureStoreAdapter.test.ts`:
```ts
import { secureStoreAdapter } from "@/lib/secureStoreAdapter";
import * as SecureStore from "expo-secure-store";

jest.mock("expo-secure-store");

describe("secureStoreAdapter", () => {
  beforeEach(() => jest.resetAllMocks());

  test("getItem delegates to SecureStore.getItemAsync", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("stored-value");
    await expect(secureStoreAdapter.getItem("k")).resolves.toBe("stored-value");
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith("k");
  });

  test("setItem delegates to SecureStore.setItemAsync", async () => {
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    await secureStoreAdapter.setItem("k", "v");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("k", "v");
  });

  test("removeItem delegates to SecureStore.deleteItemAsync", async () => {
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
    await secureStoreAdapter.removeItem("k");
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("k");
  });

  test("getItem returns null when SecureStore returns null", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    await expect(secureStoreAdapter.getItem("missing")).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npm test -- secureStoreAdapter`
Expected: FAIL — `Cannot find module '@/lib/secureStoreAdapter'`.

- [ ] **Step 3: Implement the adapter**

Create `src/lib/secureStoreAdapter.ts`:
```ts
import * as SecureStore from "expo-secure-store";

export const secureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm test -- secureStoreAdapter`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/secureStoreAdapter.ts __tests__/secureStoreAdapter.test.ts
git commit -m "feat: add SecureStore adapter for Supabase session persistence"
```

---

## Task 7: Supabase client

Tiny module — just wires env vars + the adapter. No behavior worth unit-testing beyond "it doesn't throw on import"; the real test is the auth flow in later tasks.

**Files:**
- Create: `src/lib/supabase.ts`

- [ ] **Step 1: Create the client**

```ts
import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import { secureStoreAdapter } from "./secureStoreAdapter";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. " +
      "Copy .env.example to .env and fill in real values.",
  );
}

export const supabase = createClient(url, key, {
  auth: {
    storage: secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 2: Install the URL polyfill referenced above**

```bash
npx expo install react-native-url-polyfill
```

- [ ] **Step 3: Smoke test**

Temporarily add in `app/index.tsx`:
```tsx
import { supabase } from "@/lib/supabase";
console.log("Supabase client:", supabase ? "ready" : "missing");
```

Restart dev server with `npx expo start -c`, load the app, confirm "Supabase client: ready" in the Metro log. Remove the import + log.

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase.ts package.json package-lock.json
git commit -m "feat: add Supabase client with SecureStore-backed sessions"
```

---

## Task 8: Auth service — Apple + Google + sign out (TDD)

**Files:**
- Create: `src/services/authService.ts`
- Test: `__tests__/authService.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/authService.test.ts`:
```ts
import { signInWithApple, signInWithGoogle, signOut } from "@/services/authService";
import { supabase } from "@/lib/supabase";
import * as AppleAuth from "expo-apple-authentication";

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithIdToken: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));
jest.mock("expo-apple-authentication");

describe("authService", () => {
  beforeEach(() => jest.resetAllMocks());

  test("signInWithApple passes the Apple ID token to Supabase", async () => {
    (AppleAuth.signInAsync as jest.Mock).mockResolvedValue({
      identityToken: "fake-apple-token",
    });
    (supabase.auth.signInWithIdToken as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
      error: null,
    });

    await signInWithApple();

    expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
      provider: "apple",
      token: "fake-apple-token",
    });
  });

  test("signInWithApple throws when Apple returns no identityToken", async () => {
    (AppleAuth.signInAsync as jest.Mock).mockResolvedValue({ identityToken: null });
    await expect(signInWithApple()).rejects.toThrow(/identity token/i);
  });

  test("signInWithGoogle passes the Google ID token to Supabase", async () => {
    (supabase.auth.signInWithIdToken as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "u2" } } },
      error: null,
    });
    await signInWithGoogle("fake-google-token");
    expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
      provider: "google",
      token: "fake-google-token",
    });
  });

  test("signOut delegates to supabase.auth.signOut", async () => {
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
    await signOut();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npm test -- authService`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the service**

Create `src/services/authService.ts`:
```ts
import * as AppleAuthentication from "expo-apple-authentication";
import { supabase } from "@/lib/supabase";

export async function signInWithApple(): Promise<void> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential.identityToken) {
    throw new Error("Apple sign-in did not return an identity token.");
  }
  const { error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: credential.identityToken,
  });
  if (error) throw error;
}

export async function signInWithGoogle(idToken: string): Promise<void> {
  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
```

Note: `signInWithGoogle` takes the ID token as an argument rather than doing the OAuth dance itself. The `login.tsx` screen owns the `expo-auth-session` flow and hands the token to this function. Keeps the service testable and the OAuth wiring co-located with the UI that triggers it.

- [ ] **Step 4: Run and watch it pass**

Run: `npm test -- authService`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/authService.ts __tests__/authService.test.ts
git commit -m "feat: add authService with Apple + Google ID-token sign-in"
```

---

## Task 9: `useAuth` hook + `AuthProvider` (TDD)

**Files:**
- Create: `src/hooks/useAuth.tsx`
- Test: `__tests__/useAuth.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/useAuth.test.tsx`:
```tsx
import React from "react";
import { Text } from "react-native";
import { render, waitFor, act } from "@testing-library/react-native";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

jest.mock("@/lib/supabase", () => {
  const listeners: Array<(event: string, session: any) => void> = [];
  return {
    supabase: {
      auth: {
        getSession: jest.fn(),
        onAuthStateChange: jest.fn((cb) => {
          listeners.push(cb);
          return { data: { subscription: { unsubscribe: jest.fn() } } };
        }),
        __emit: (event: string, session: any) =>
          listeners.forEach((cb) => cb(event, session)),
      },
    },
  };
});

function Probe() {
  const { session, loading } = useAuth();
  if (loading) return <Text>loading</Text>;
  return <Text>{session ? `user:${session.user.id}` : "no-session"}</Text>;
}

describe("useAuth", () => {
  beforeEach(() => jest.clearAllMocks());

  test("initially loading, then resolves to no session", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    });
    const { getByText } = render(<AuthProvider><Probe /></AuthProvider>);
    expect(getByText("loading")).toBeTruthy();
    await waitFor(() => expect(getByText("no-session")).toBeTruthy());
  });

  test("hydrates with existing session", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    const { findByText } = render(<AuthProvider><Probe /></AuthProvider>);
    expect(await findByText("user:u1")).toBeTruthy();
  });

  test("updates on auth state change", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
    const { findByText } = render(<AuthProvider><Probe /></AuthProvider>);
    expect(await findByText("no-session")).toBeTruthy();

    await act(async () => {
      (supabase.auth as any).__emit("SIGNED_IN", { user: { id: "u2" } });
    });
    expect(await findByText("user:u2")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npm test -- useAuth`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

Create `src/hooks/useAuth.tsx`:
```tsx
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthState = {
  session: Session | null;
  loading: boolean;
};

const AuthContext = createContext<AuthState>({ session: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 4: Run and watch it pass**

Run: `npm test -- useAuth`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAuth.tsx __tests__/useAuth.test.tsx
git commit -m "feat: add AuthProvider and useAuth hook with session hydration"
```

---

## Task 10: Root layout with AuthProvider and redirect logic

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `app/index.tsx` (becomes redirect stub)

- [ ] **Step 1: Update `app/_layout.tsx`**

```tsx
import { Stack } from "expo-router";
import { AuthProvider } from "@/hooks/useAuth";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
```

- [ ] **Step 2: Replace `app/index.tsx` with an auth-aware redirect**

```tsx
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/hooks/useAuth";

export default function Index() {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }
  return <Redirect href={session ? "/(app)" : "/(auth)/login"} />;
}
```

- [ ] **Step 3: Smoke test**

Run: `npx expo start -c`, load in Expo Go. With no `(auth)` or `(app)` screens yet, the redirect will fail — that's expected. The purpose of this step is to confirm no runtime errors in the layout itself. Should see the spinner, then a "page not found" style error for the redirect target, which is fine. Kill the dev server.

- [ ] **Step 4: Commit**

```bash
git add app/_layout.tsx app/index.tsx
git commit -m "feat: wrap app in AuthProvider and redirect based on session"
```

---

## Task 11: Login screen (Apple + Google)

Manual-tested, not unit-tested. The service-layer tests in Task 8 cover the token-handling logic; the login screen is UI + OAuth wiring.

**Files:**
- Create: `app/(auth)/login.tsx`

- [ ] **Step 1: Create `app/(auth)/login.tsx`**

```tsx
import { useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { signInWithApple, signInWithGoogle } from "@/services/authService";

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const [busy, setBusy] = useState<"apple" | "google" | null>(null);

  const [, , promptGoogle] = Google.useIdTokenAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  async function onApple() {
    try {
      setBusy("apple");
      await signInWithApple();
    } catch (e: any) {
      if (e?.code !== "ERR_REQUEST_CANCELED") {
        Alert.alert("Sign in failed", e?.message ?? String(e));
      }
    } finally {
      setBusy(null);
    }
  }

  async function onGoogle() {
    try {
      setBusy("google");
      const result = await promptGoogle();
      if (result?.type !== "success") return;
      const idToken = (result.params as any).id_token;
      if (!idToken) throw new Error("Google did not return an ID token.");
      await signInWithGoogle(idToken);
    } catch (e: any) {
      Alert.alert("Sign in failed", e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>greenroom</Text>
      <Text style={styles.subtitle}>Sign in to sync your shows.</Text>

      {Platform.OS === "ios" && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={10}
          style={styles.appleButton}
          onPress={onApple}
        />
      )}

      <Pressable
        accessibilityRole="button"
        disabled={busy !== null}
        onPress={onGoogle}
        style={({ pressed }) => [styles.googleButton, pressed && { opacity: 0.8 }]}
      >
        <Text style={styles.googleButtonText}>
          {busy === "google" ? "Signing in…" : "Continue with Google"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  title: { fontSize: 36, fontWeight: "700", marginBottom: 4 },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 24, textAlign: "center" },
  appleButton: { width: 260, height: 48 },
  googleButton: {
    width: 260, height: 48, borderRadius: 10, backgroundColor: "#fff",
    borderWidth: 1, borderColor: "#ddd", alignItems: "center", justifyContent: "center",
  },
  googleButtonText: { fontSize: 16, fontWeight: "600", color: "#111" },
});
```

- [ ] **Step 2: Declare the `expo-apple-authentication` plugin in `app.json`**

Inside `"expo"`:
```json
"plugins": ["expo-router", "expo-apple-authentication"]
```

- [ ] **Step 3: Smoke-test Apple Sign In**

Run: `npx expo start -c`, open in Expo Go on a physical iPhone (simulator works for Apple Sign In too, but physical device is the real test). Home redirects to `/login`. Tap "Sign in with Apple." Complete the flow.

Expected: after returning, the app re-redirects through `index.tsx`. It will fail to find `/(app)` (next task) — that's fine. Check the Metro log for any Supabase auth errors. If sign-in completed without error, the session is persisted and Task 12 will show it.

- [ ] **Step 4: Commit**

```bash
git add "app/(auth)/login.tsx" app.json
git commit -m "feat: add login screen with Apple and Google sign-in"
```

---

## Task 12: Protected `(app)` layout + Home placeholder

**Files:**
- Create: `app/(app)/_layout.tsx`
- Create: `app/(app)/index.tsx`

- [ ] **Step 1: Create `app/(app)/_layout.tsx`**

```tsx
import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/hooks/useAuth";

export default function AppLayout() {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }
  return <Stack />;
}
```

- [ ] **Step 2: Create `app/(app)/index.tsx`**

```tsx
import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { session } = useAuth();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>greenroom</Text>
      <Text style={styles.email}>Signed in as {session?.user.email ?? "(unknown)"}</Text>
      <Link href="/(app)/settings" style={styles.link}>Settings</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 32, fontWeight: "700" },
  email: { fontSize: 16, color: "#666" },
  link: { fontSize: 16, color: "#007AFF", marginTop: 12 },
});
```

- [ ] **Step 3: Smoke-test the end-to-end flow**

Run: `npx expo start -c`. In Expo Go:
1. First launch → login screen.
2. Tap Apple sign-in, complete flow.
3. Expect redirect to Home showing "Signed in as {your-email}".
4. Kill and reopen the app → should go straight to Home (session persisted in SecureStore).

If step 4 fails (lands back on login), the SecureStore adapter isn't wired correctly — revisit Task 6/7.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/_layout.tsx" "app/(app)/index.tsx"
git commit -m "feat: add protected app layout and signed-in home screen"
```

---

## Task 13: Settings screen with sign-out

**Files:**
- Create: `app/(app)/settings.tsx`

- [ ] **Step 1: Create `app/(app)/settings.tsx`**

```tsx
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { signOut } from "@/services/authService";
import { useAuth } from "@/hooks/useAuth";

export default function Settings() {
  const { session } = useAuth();

  async function onSignOut() {
    try {
      await signOut();
    } catch (e: any) {
      Alert.alert("Sign out failed", e?.message ?? String(e));
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Signed in as</Text>
      <Text style={styles.email}>{session?.user.email ?? "(unknown)"}</Text>

      <Pressable style={styles.signOut} onPress={onSignOut} accessibilityRole="button">
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  label: { fontSize: 14, color: "#666" },
  email: { fontSize: 18, fontWeight: "600", marginBottom: 24 },
  signOut: { padding: 14, borderRadius: 10, backgroundColor: "#FF3B30", alignItems: "center" },
  signOutText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
```

- [ ] **Step 2: Smoke-test sign-out**

Run: `npx expo start -c`. Navigate Home → Settings → tap Sign out. Expect redirect back to login screen. Reopen the app — should stay on login (session cleared).

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/settings.tsx"
git commit -m "feat: add settings screen with sign-out"
```

---

## Task 14: Update project docs

**Files:**
- Modify: `CLAUDE.md`
- Modify: `greenroom-project-spec.md`

- [ ] **Step 1: Update `CLAUDE.md`**

Replace the `## Tech Stack`, `## Architecture Rules`, `## File Structure`, `## Build Phases & Status`, `## Database Tables`, and `## Current Session State` sections to reflect:

- Tech stack is now Expo + RN + TypeScript + Expo Router + Supabase + TanStack Query + expo-sqlite (not Vite + Dexie + MediaRecorder).
- Architecture: Supabase source of truth, offline-read, no `.grm`, iOS-only.
- File structure: new Expo layout (`app/`, `src/lib`, `src/hooks`, `src/services`).
- Build phases: add a new "Native Migration" phase table (N1 DONE after this plan completes, N2–N8 PENDING).
- Current Session State: describe Phase N1 completion, next step is Phase N2 plan.

Actual edits: work through the file section-by-section. For each section where web-era content is wrong (e.g., "Dexie.js (IndexedDB)" in Tech Stack), replace with the RN equivalent. Keep project-purpose prose, session rules, and the reference to `greenroom-project-spec.md` intact.

- [ ] **Step 2: Update `greenroom-project-spec.md`**

Same treatment — strip or rewrite sections that assume web/PWA (service worker, "Add to Home Screen," MediaRecorder, `.grm`, Dexie schema) and replace with native equivalents. The behavioral requirements (what shows/numbers/harmonies do) are still valid and stay.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md greenroom-project-spec.md
git commit -m "docs: update CLAUDE.md and project spec for RN/Expo stack"
```

---

## Task 15: Final acceptance pass

Not code — verifies Phase N1 "Done when" criteria from the spec.

- [ ] **Step 1: Clean run-through**

Sign out of Expo Go (if signed in), force-kill the app, restart the dev server with `npx expo start -c`. Reopen:

1. Lands on login screen? ✓
2. Apple sign-in succeeds and returns to Home with email? ✓
3. Kill + reopen app → lands on Home directly? ✓
4. Settings → Sign out → back to login? ✓
5. Kill + reopen after sign-out → stays on login? ✓
6. Google sign-in succeeds and returns to Home with Google email? ✓

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 3: Confirm no lingering TODOs**

Grep: `grep -rn "TODO\|FIXME\|XXX" src app __tests__`
Expected: no results, or only intentional ones.

- [ ] **Step 4: Tag the phase completion commit**

```bash
git tag phase-n1-complete
```

Phase N1 is now shippable to TestFlight whenever EAS is configured, and Phase N2's plan can be written.

---

## Self-Review

- **Spec coverage (Phase N1 only):** scaffold ✓ (Tasks 1–5), Supabase client + SecureStore ✓ (Tasks 6–7), AuthProvider + useAuth ✓ (Task 9), login screen with Apple + Google ✓ (Task 11), protected layout ✓ (Task 12), settings with email + sign-out ✓ (Task 13), docs updated ✓ (Task 14), acceptance criteria verified ✓ (Task 15). Phases N2–N8 are intentionally deferred.
- **Placeholder scan:** no "TBD" / "add appropriate error handling" / "write tests for the above." Every code step includes the code.
- **Type consistency:** `Session` from `@supabase/supabase-js`, `signInWithApple()`, `signInWithGoogle(idToken)`, `signOut()` — names match across authService, useAuth, login, settings.
- **Known deferrals:** `useAuth` exposes `{ session, loading }` but not `signOut` (components call `authService.signOut()` directly). Kept intentionally to avoid duplicating the service on the context. If that becomes awkward in later phases, revisit then.

---

## Next plan

After Phase N1 ships (this plan's `phase-n1-complete` tag), write `docs/superpowers/plans/YYYY-MM-DD-phase-n2-data-foundation-and-shows.md` covering: Supabase schema + RLS migrations, TanStack Query + SQLite persister, `useShows` / `useCreateShow` / `useUpdateShow` / `useCompleteShow` / `useDeleteShow`, Home active-shows list, add-show form, complete/delete flows.
