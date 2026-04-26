# CLAUDE.md — greenroom

> This file is auto-read by Claude Code at the start of every session. Update it after every coding session.

## Project Overview

**greenroom** is a personal theater organizer app for managing musical numbers, scenes, harmonies, dance videos, and rehearsal notes. Cloud-backed via Supabase, native iOS app built with Expo.

- **Repo:** github.com/revant321/greenroom
- **Full spec:** `greenroom-project-spec.md` (always reference this for detailed requirements)
- **Target devices:** iPhone (iOS-only; Expo Go during development, TestFlight for long-term installs)

## Who's working on this

The primary collaborator writing and testing code on this codebase is a **high school student** who is a capable beginner — comfortable with the command line and basic JavaScript, but new to React Native, Expo, Supabase, OAuth, and most of the rest of the stack. They are learning by doing. **Write for them, not for a senior engineer.**

### How this changes your work

- **Explain what and why, not just code.** Before a non-trivial change, say in one or two sentences what you're about to do and why. After it, say what changed.
- **Define jargon the first time per conversation.** The first time you say "OAuth", "RLS", "migration", "persister", "mutation", "signed URL", "TanStack Query", "SQLite", "EAS", etc., add a one-line plain-English explanation. Don't repeat definitions forever — but don't skip them either.
- **Prefer plain English over shorthand in prose.** "The file that lists dependencies (`package.json`)" rather than "package.json."
- **In PR descriptions and `npm` / `git` commands given to the user:** include a short "what this does" sentence. Assume they may not have seen the command before.
- **Code comments are fine to explain non-obvious *why*** — but still follow the project rule of no comments for obvious *what*. Default is still "no comments."
- **When breaking work into steps, each step should do one clear thing** and be runnable on its own. Avoid cascading changes across many files in a single command the student has to trust blindly.
- **If a step depends on something the student needs to do outside the editor** (e.g., click around in Supabase dashboard, enroll in Apple Developer, add a key to `.env`), state it separately with explicit clicks/paths, not as an assumed prereq.
- **Pointers and tradeoffs over decisions:** when a choice has genuine tradeoffs, name them briefly rather than silently picking. The student is learning to reason, not just type.

### How this does NOT change your work

- Technical rigor stays the same. Simpler language ≠ simpler code or looser quality standards. TDD, small commits, clean interfaces, etc. still apply.
- You are still the technical authority. If the student (or another assistant writing on their behalf) proposes something that contradicts the design spec or breaks project patterns, say so — don't just agree.
- Don't dumb down the architecture. This app uses real production-grade tools. Explain them; don't replace them with toy alternatives.

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
**Blockers:** User action required — fill `.env` with real credentials; complete Supabase Auth provider setup for Apple + Google; ensure Apple Developer Program membership + Sign In with Apple capability on the bundle identifier `com.codeflixacademy.greenroom`; complete Google Cloud OAuth iOS + Web client ID setup.

## Session Rules

1. **Read this file first** at the start of every session.
2. **Reference these for context before implementing a feature:**
   - `greenroom-project-spec.md` — long-form feature spec
   - `docs/superpowers/specs/2026-04-19-react-native-expo-migration-design.md` — native migration design
   - `docs/superpowers/plans/` — per-phase implementation plans
3. **Update "Current Session State"** at the end of every session.
4. **Explain what code does, and why** — see the "Who's working on this" section. The developer is a high school student learning this stack for the first time. Simplify prose, define jargon on first use, and walk through changes instead of dropping diffs.
5. **Commit often** with descriptive messages. Prefer many small commits over one big one — easier for the student to review and understand.
6. **Spell out manual steps.** When the student has to do something outside the editor (open a dashboard, enroll in a program, paste a key into `.env`, install an app on their phone), write it out click-by-click rather than assuming.
