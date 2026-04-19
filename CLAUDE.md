# CLAUDE.md — greenroom

> This file is auto-read by Claude Code at the start of every session. Update it after every coding session.

## Project Overview

**greenroom** is a personal theater organizer app for managing musical numbers, scenes, harmonies, dance videos, and rehearsal notes. Cloud-backed via Supabase, native iOS app built with Expo.

- **Repo:** github.com/revant321/greenroom
- **Full spec:** `greenroom-project-spec.md` (always reference this for detailed requirements)
- **Target devices:** iPhone (iOS-only; Expo Go during development, TestFlight for long-term installs)

## Tech Stack

- Expo (managed workflow) + React Native + TypeScript
- Expo Router (file-based routing)
- Supabase (Postgres + Auth + Storage)
- TanStack Query + expo-sqlite (for data caching, added in Phase N2)
- expo-av / expo-video / expo-file-system (media, added in Phase N4+)
- iOS-only (iPhone)

## Architecture Rules

- **Cloud-backed:** Supabase is the source of truth. Local caching provides offline reads.
- **Offline-read:** Any data or media the user has previously loaded is available without network. Writes require network.
- **No AI integration:** Privacy preference — no AI features in the app.
- **No web/PWA:** The app is a native iOS app distributed via Expo Go during development and EAS Build → TestFlight for long-term installs. The old Vite/PWA code is in git history but no longer built.
- **No `.grm` export/import:** Cloud sync IS the backup.
- **Theme:** Light/dark mode, defaulting to system (implemented in Phase N8).
- **UI:** Native-first (iOS system chrome), custom content styling. SF Symbols where possible.

## Database Tables

Schema mirrors the conceptual model from the original PWA but is now stored in Supabase Postgres (not IndexedDB). Media blobs live in Supabase Storage with a per-user path prefix. Full SQL in `supabase/migrations/` (added in Phase N2). Every table has a `user_id` column and RLS policies for owner-only access.

- `shows` — id, name, roles[], isCompleted, completedAt, createdAt
- `musicalNumbers` — id, showId, name, order, notes, createdAt
- `harmonies` — id, musicalNumberId, audioBlob, measureNumber, caption, createdAt
- `danceVideos` — id, musicalNumberId, type, url/videoBlob, title, createdAt
- `scenes` — id, showId, name, order, isUserInScene, notes, createdAt
- `sceneRecordings` — id, sceneId, type, blob, caption, createdAt
- `sheetMusic` — id, musicalNumberId, pdfBlob, title, createdAt
- `songs` — id, title, isAuditionSong, category (vocal/guitar/null), status (in-progress/completed), notes, createdAt
- `songParts` — id, songId, audioBlob, measureNumber, caption, createdAt
- `songTracks` — id, songId, type (link/audio/video), url/blob, title, createdAt
- `songSheetMusic` — id, songId, pdfBlob, title, createdAt

## File Structure

```
app/
├── _layout.tsx                # Root: AuthProvider (+ QueryClient, Theme in later phases)
├── index.tsx                  # Redirect based on auth
├── (auth)/
│   └── login.tsx              # Apple + Google sign-in
└── (app)/
    ├── _layout.tsx            # Session gate; redirects to /login if unauth
    ├── index.tsx              # Home
    └── settings.tsx           # Sign-out
src/
├── lib/
│   ├── secureStoreAdapter.ts  # Supabase session storage (Expo SecureStore)
│   └── supabase.ts            # Supabase client
├── hooks/
│   └── useAuth.tsx            # AuthProvider + useAuth
└── services/
    └── authService.ts         # signInWithApple / signInWithGoogle / signOut
__tests__/                     # Jest unit tests
```

Note that later phases will add more under `src/` (services, components, etc.) per the spec and plan docs.

## Build Phases & Status

| Phase | Focus                                                    | Status      |
| ----- | -------------------------------------------------------- | ----------- |
| N1    | Expo scaffold + Expo Router + Supabase auth (Apple + Google) | DONE        |
| N2    | Postgres schema + RLS + TanStack Query persister + shows CRUD | PENDING     |
| N3    | Musical numbers + scenes (row-only features)              | PENDING     |
| N4    | Audio harmonies + media cache + expo-av                   | PENDING     |
| N5    | Video (expo-video) + PDFs (WebView) + external URLs        | PENDING     |
| N6    | Standalone songs (parts, tracks, sheet music, filters)    | PENDING     |
| N7    | Completed shows archive + cascading storage cleanup       | PENDING     |
| N8    | Theme, skeletons, toasts, SF Symbols, EAS → TestFlight    | PENDING     |

## Current Session State

> Update this section at the END of every coding session.

**Last session:** 2026-04-19
**Currently working on:** Phase N2 (next): Supabase schema migration + TanStack Query persister + shows CRUD. Phase N1 (scaffold + auth) complete on `feat/phase-n1-scaffold-auth` branch, tag `phase-n1-complete`.
**Completed this session:** Replaced the Vite/React/Dexie PWA with an Expo managed TypeScript app. Expo Router wired with `(auth)` / `(app)` route groups. Supabase client configured with SecureStore session persistence. AuthProvider + useAuth hook; Apple Sign In (via expo-apple-authentication) and Google Sign In (via expo-auth-session) both wired through Supabase signInWithIdToken. Settings screen with sign-out. 11 Jest tests covering SecureStore adapter, authService, and useAuth hook. All 15 tasks of the Phase N1 plan complete.
**Next steps:** (1) Verify end-to-end sign-in on device via Expo Go — requires the user to provide real Supabase URL + publishable key and Google OAuth client IDs in `.env`, plus Supabase Dashboard configuration for Apple + Google providers. (2) Start Phase N2 per `docs/superpowers/plans/2026-04-19-phase-n2-data-foundation-and-shows.md`.
**Blockers:** User action required — fill `.env` with real credentials; complete Supabase Auth provider setup for Apple + Google; ensure Apple Developer Program membership + Sign In with Apple capability on the bundle identifier `com.jesseluo.greenroom`; complete Google Cloud OAuth iOS + Web client ID setup.

## Session Rules

1. **Read this file first** at the start of every session.
2. **Reference these for context before implementing a feature:**
   - `greenroom-project-spec.md` — long-form feature spec
   - `docs/superpowers/specs/2026-04-19-react-native-expo-migration-design.md` — native migration design
   - `docs/superpowers/plans/` — per-phase implementation plans
3. **Update "Current Session State"** at the end of every session.
4. **Explain what code does** — the developer is learning and wants to understand, not just receive code.
5. **Commit often** with descriptive messages.
