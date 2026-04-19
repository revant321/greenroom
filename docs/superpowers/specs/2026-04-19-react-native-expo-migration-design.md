# React Native + Expo Migration Design

**Date:** 2026-04-19
**Status:** Design approved, pending implementation plan.
**Supersedes (in practice):** the in-flight web Supabase sync work described in `2026-04-12-supabase-auth-and-sync-design.md`. The server-side design (schema, RLS, OAuth providers) from that spec is reused; the web client work is paused.

## Summary

Replace the greenroom web PWA with a native iOS app built on Expo + React Native. The app uses Supabase for identity, data, and media storage from day one. Structured data is cached locally via TanStack Query + `expo-sqlite` for offline reads; media blobs are cached to the filesystem on first view. Writes require network. Distribution is Expo Go during development, EAS Build → TestFlight later.

## Goals

1. Replace the PWA with a native iOS app that feels like a real iOS app.
2. Use Supabase as the source of truth for rows and media, with per-user RLS.
3. Offline-read: any show, musical number, scene, harmony, dance video, sheet music, or song the user has already viewed is available without network.
4. Zero data migration: the current web app has no production data worth preserving.
5. Keep the greenroom git history; archive the old web code via git rather than a parallel directory.

## Non-goals

- Web app / PWA. The old `src/` is abandoned and left in git history.
- Mac / iPad / Android. iPhone only.
- Offline writes / sync queue. Writes require network; UI surfaces a toast on failure.
- `.grm` export/import. Replaced by cloud sync as the backup mechanism.
- In-app video recording UI. We defer to the system camera via `expo-image-picker`.
- YouTube embeds / WebView players. External URLs open in the system browser via `Linking`.
- Push notifications, deep links, widgets, share extensions.
- AI features (explicit project rule).

## High-level architecture

A single Expo (managed workflow) app. Supabase is the source of truth; the device keeps a local cache so anything previously viewed works offline.

```
┌──────────────── iPhone ────────────────┐
│                                        │
│   React Native UI (Expo SDK)           │
│        │                               │
│        ▼                               │
│   Service layer (TanStack Query hooks) │
│        │          │                    │
│        ▼          ▼                    │
│   Local cache   Supabase client        │
│   (SQLite +     (JSON + Storage        │
│    FileSystem)   signed URLs)          │
│        │              │                │
└────────┼──────────────┼────────────────┘
         │              │
         │    (network when available)
         │              ▼
         │     ┌─────── Supabase ───────┐
         │     │ Postgres (RLS per user)│
         └─────│ Storage (audio/video/  │
               │           PDF blobs)   │
               └────────────────────────┘
```

**Reads.** Service hooks ask the local cache first; if missing or stale, fetch from Supabase and write to cache. Return whichever is available.

**Writes.** Require network. Writes go directly to Supabase; on success the local cache is updated (via TanStack Query invalidation). On failure, the UI shows an "offline — try again later" toast. No write queue.

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Expo (managed workflow), Expo SDK latest, React Native, TypeScript |
| Navigation | Expo Router (file-based) |
| Data cache | TanStack Query + `@tanstack/query-async-storage-persister` backed by `expo-sqlite` |
| Local DB | `expo-sqlite` (single DB file, tables: `media_cache`, query-cache store) |
| Backend | Supabase (Postgres + Auth + Storage) |
| Auth (native flows) | `expo-apple-authentication` (Apple), `expo-auth-session` with Google provider (Google) → Supabase `signInWithIdToken` |
| Session storage | Custom Supabase storage adapter backed by `expo-secure-store` |
| Audio recording + playback | `expo-av` |
| Video playback | `expo-video` |
| Video + photo picking | `expo-image-picker` (library + system camera handoff) |
| PDF picking | `expo-document-picker` |
| PDF viewing | `react-native-webview` (iOS renders PDFs natively inside WebView) |
| Filesystem | `expo-file-system` |
| External URL handling | `expo.Linking` |
| Icons | `expo-symbols` (SF Symbols) primary, `@expo/vector-icons` (Ionicons) fallback |
| Styling | `StyleSheet.create` + a small `theme.ts` module; no styling library |
| Distribution | Expo Go during dev, EAS Build → TestFlight once native modules require it or app is stable |

Every library chosen above is Expo Go-compatible so early development needs no custom dev client.

## Auth

Supabase Auth is the identity provider. Native OAuth uses the **ID-token flow** rather than the web redirect flow:

- **Apple:** `expo-apple-authentication` → native Sign In with Apple sheet → returns an ID token → `supabase.auth.signInWithIdToken({ provider: 'apple', token })`.
- **Google:** `expo-auth-session` with the Google provider (Expo Go-compatible; `@react-native-google-signin/google-signin` is not because it needs a dev client) → returns an ID token → `supabase.auth.signInWithIdToken({ provider: 'google', token })`. If the system sign-in sheet becomes desirable later, migrate to `@react-native-google-signin/google-signin` once the project moves off Expo Go.

The returned Supabase session is persisted by the Supabase JS client via a custom storage adapter backed by **`expo-secure-store`** (default `localStorage` does not exist in RN). `supabase.auth.onAuthStateChange` drives a `useAuth` hook (session, user, loading, signOut).

Apple Sign In is required by App Store policy once any third-party sign-in is offered, and it is required by Apple Developer Program membership for EAS Build and TestFlight.

### Auth gating

A `(app)` layout in Expo Router checks `useAuth().session`; if null, redirects to `/login`. Mirrors the current `ProtectedRoute` component from the web app, re-expressed as a layout.

## Data layer

### Server

Postgres schema and RLS are reused from `docs/superpowers/specs/2026-04-12-supabase-auth-and-sync-design.md`. Tables mirror the current IndexedDB tables, each with a `user_id` FK and owner-only RLS:

- `shows`, `musical_numbers`, `harmonies`, `scenes`, `scene_recordings`, `dance_videos`, `sheet_music`, `songs`, `song_parts`, `song_tracks`, `song_sheet_music`.

Media blobs are **not** stored in Postgres. A single private Storage bucket (`media`) holds them with per-user path prefixes:

```
media/{user_id}/harmonies/{uuid}.m4a
media/{user_id}/scene-recordings/{uuid}.{m4a|mp4}
media/{user_id}/dance-videos/{uuid}.mp4
media/{user_id}/sheet-music/{uuid}.pdf
media/{user_id}/song-parts/{uuid}.m4a
media/{user_id}/song-tracks/{uuid}.{m4a|mp4}
media/{user_id}/song-sheet-music/{uuid}.pdf
```

Storage RLS restricts read/write on `media` to rows where `name` begins with the caller's `auth.uid()`.

Each media-bearing table stores a `storage_path` column (string) rather than any inline blob. External video URLs live in a separate `external_url` column on `dance_videos` / `song_tracks`.

### Client

**Structured data (rows).** TanStack Query owns the read path:

- Each entity gets hooks: `useShows()`, `useShow(id)`, `useMusicalNumbers(showId)`, `useMusicalNumber(id)`, etc. Each wraps `useQuery` with a stable `queryKey` and a fetcher that calls the Supabase client.
- A persister serializes the query cache to `expo-sqlite` on change and rehydrates at app launch. When offline, hooks return persisted data immediately with no network call. When online, background refetch updates the cache.
- Mutations use `useMutation` and invalidate the relevant query keys on success. Network failure surfaces a toast; nothing is queued.

**Media blobs.** Handled separately from JSON rows:

- A `media_cache` SQLite table: `(storage_path TEXT PRIMARY KEY, local_uri TEXT, downloaded_at INTEGER, size_bytes INTEGER)`.
- A `useMedia(storagePath)` hook returns `{ uri, state }` where `state ∈ 'idle' | 'downloading' | 'ready' | 'missing' | 'error'`.
- On first call, the hook fetches a signed URL from Supabase Storage (short TTL), streams the file to `FileSystem.documentDirectory`, writes the row, and returns the local `file://` URI.
- On subsequent calls, the local URI is returned immediately — no network.
- When a row is deleted (e.g., harmony removed, show permanently deleted from archive), the service layer also deletes the Storage object and the `media_cache` row + file.

### Service layer

`src/services/` (or the Expo equivalent) mirrors the existing web services, but backed by Supabase instead of Dexie and exposed as query hooks:

- `authService.ts` — sign-in flows, sign-out, session getter.
- `showService.ts` — `useShows`, `useShow`, `useCreateShow`, `useUpdateShow`, `useCompleteShow`, `useDeleteShow`.
- `musicalNumberService.ts`, `harmonyService.ts`, `sceneService.ts`, `sceneRecordingService.ts`, `danceVideoService.ts`, `sheetMusicService.ts`, `songService.ts`, `songPartService.ts`, `songTrackService.ts`, `songSheetMusicService.ts` — same pattern.
- `mediaService.ts` — `useMedia`, `uploadMedia(file, path)`, `deleteMedia(path)`; encapsulates Storage + `media_cache`.

## Media capture, import, and playback

### Audio recording (harmonies, song parts)

- `expo-av` `Audio.Recording` recording to `.m4a` (AAC, ~64 kbps mono).
- Recorder UI: record/stop button, elapsed timer, post-capture preview with save/retry/cancel.
- On save: upload to `media/{uid}/harmonies/{uuid}.m4a`, insert `harmonies` row with `storage_path`, move the local temp file into the media cache so first playback is instant.
- Playback uses `expo-av` `Audio.Sound` with the local cache URI when present.

### Video (dance videos, scene recordings)

- **No custom camera.** Use `expo-image-picker` for both library pick and system camera handoff.
- Upload flow identical to audio.
- Playback uses `expo-video` (simpler API than `expo-av`'s deprecated `Video`, and the Expo go-forward path).
- External URL: stored as `external_url` on the row; tapping opens via `Linking.openURL` (YouTube app or Safari).

### PDFs (sheet music)

- Import: `expo-document-picker` restricted to `application/pdf`; upload as above.
- View: local cached file loaded into a `WebView` — iOS's WebView renders PDFs natively with pinch/zoom. We revisit `react-native-pdf` once the project adopts a dev client + EAS Build.

### Permissions

Microphone, photo library, camera — requested on first use via each module's permission helper, with a short explanation. No background-audio mode.

## Navigation & screen map

Expo Router (file-based). Stack-based native navigation via `react-native-screens`, so nav chrome (nav bars, swipe-back, sheet modals) is native-feeling by default. Screen content is custom-styled cards and lists.

```
app/
├── _layout.tsx                  # Root: AuthProvider, QueryClientProvider, ThemeProvider
├── (auth)/
│   └── login.tsx                # Apple / Google sign-in buttons
├── (app)/
│   ├── _layout.tsx              # Requires session; else redirect to /login
│   ├── index.tsx                # Home: active shows list
│   ├── settings.tsx             # Sign out, signed-in email, theme override
│   ├── completed.tsx            # Completed shows archive
│   ├── songs/
│   │   ├── index.tsx
│   │   └── [songId].tsx
│   └── shows/
│       └── [showId]/
│           ├── index.tsx        # Show Hub
│           ├── musical-numbers/
│           │   ├── index.tsx
│           │   └── [numberId].tsx
│           └── scenes/
│               ├── index.tsx
│               └── [sceneId].tsx
```

## Styling & theming

- `StyleSheet.create` + a `theme.ts` module (colors, spacing, radius, typography).
- Light / dark themes with shared shape; `ThemeProvider` reads `Appearance` plus an override from SecureStore and exposes the active theme via context.
- System font (San Francisco) via default `fontFamily`; no custom font bundling.
- Settings screen offers a light / dark / auto toggle.
- Icons: `expo-symbols` primary, `@expo/vector-icons` fallback.

## Repo structure

Fresh Expo app at the repo root. The current web files (`src/`, `index.html`, `vite.config.ts`, `eslint.config.js`, `tsconfig*`, `public/`, `dist/`, `package.json`) are deleted and replaced by the Expo scaffold. The web code remains recoverable via git history (the last web commit is `44dbf85`).

Post-migration layout (approximate — actual tree is what `create-expo-app` produces plus project-specific additions):

```
greenroom/
├── app/                 # Expo Router routes (see navigation section)
├── src/
│   ├── components/
│   ├── services/
│   ├── hooks/
│   ├── utils/
│   ├── theme.ts
│   └── db/              # expo-sqlite setup + media_cache helpers
├── assets/              # icons, splash
├── app.json
├── babel.config.js
├── tsconfig.json
├── package.json
├── eas.json             # added in Phase N8
├── CLAUDE.md
├── greenroom-project-spec.md
└── docs/
```

`greenroom-project-spec.md` and `CLAUDE.md` are updated to reflect the new stack and drop references to Dexie, MediaRecorder, PWA, and `.grm`.

## Migration order & milestones

Each phase ends with the app installable on the developer's iPhone via Expo Go and independently testable.

- **Phase N1 — Scaffold + auth.** Fresh Expo project at repo root, Supabase client + SecureStore adapter, `AuthProvider` / `useAuth`, login screen with Apple + Google, protected `(app)` layout, Settings with email + sign-out. *Done when:* sign in with Apple on phone, see email on Settings.

- **Phase N2 — Data foundation + shows.** Apply Supabase schema + RLS. Wire TanStack Query + SQLite persister. `useShows` / `useCreateShow` / `useUpdateShow`. Home screen + add-show form + complete/delete. *Done when:* cross-device round-trip works under the same signed-in account.

- **Phase N3 — Musical numbers & scenes (rows only).** Show Hub, Musical Numbers list + detail (notes), Scenes list + detail (active/grayed, user-in-scene toggle, notes). *Done when:* all row-based web features work on native.

- **Phase N4 — Audio (harmonies).** First media slice. Recording, upload, `media_cache`, `useMedia`, playback. Measure numbers + captions. *Done when:* record a harmony, close the app, reopen offline, play it back.

- **Phase N5 — Video & PDFs.** Scene recordings (audio or video), dance videos (file pick + external URL), sheet music (PDF pick + WebView view). *Done when:* feature parity with web app for videos and sheet music.

- **Phase N6 — Standalone songs.** Songs list, song detail (parts / tracks / sheet music), audition + completed filters.

- **Phase N7 — Completed shows archive.** Completed shows list, view, unarchive, delete-with-storage-cleanup.

- **Phase N8 — Polish + EAS.** Theming pass, loading skeletons, error toasts, offline messaging, empty states, SF Symbols pass. EAS Build + TestFlight setup.

## Testing strategy

- **Unit tests** for service layer functions (pure data transforms, `media_cache` bookkeeping) using Jest + `jest-expo`.
- **Integration tests** for auth session persistence, Supabase CRUD, and media cache hit/miss flows — run against a local Supabase instance when feasible.
- **Manual device testing** for media capture, permissions, and anything touching system UI — no realistic way to automate microphone / camera / Photos access.
- Each phase's "Done when" criteria double as manual acceptance tests.

## Risks & open questions

- **Supabase Storage TTL on signed URLs.** If a download takes longer than the TTL on a slow connection, the transfer fails. Mitigation: generous TTL (e.g., 1 hour), retry once on failure.
- **Expo Go module limits.** If any library we depend on turns out not to be Expo Go-compatible mid-build, we move to an EAS Dev Client earlier than Phase N8. Current stack is verified Expo Go-compatible.
- **WebView PDF rendering** is adequate for personal use but not a polished reading experience. If it becomes annoying, swap to `react-native-pdf` once a dev client is in place.
- **Apple Developer Program enrollment** ($99/yr, can take several days) is required before Phase N8 TestFlight distribution, and is required at dev time for Apple Sign In on a physical device. This is a non-code blocker that the user must resolve.
- **Google OAuth client setup.** Separate OAuth client IDs for iOS are needed and tied to the bundle identifier. Deferred until Phase N1 implementation.
