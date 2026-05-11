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
- expo-audio + expo-file-system (audio recording / playback / cache, added in Phase N4)
- expo-video + expo-image-picker + expo-document-picker + react-native-webview (video + PDF + pickers, added in Phase N5)
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
├── _layout.tsx                # Root: PersistQueryClientProvider + AuthProvider
├── index.tsx                  # Redirect based on auth
├── (auth)/
│   └── login.tsx              # Apple + Google sign-in
└── (app)/
    ├── _layout.tsx            # Session gate; declares stack screens (modal for shows/new)
    ├── index.tsx              # Home: active shows list + FAB
    ├── completed.tsx          # Completed shows archive
    ├── settings.tsx           # Sign-out + link to completed shows
    └── shows/
        ├── new.tsx            # New show modal
        └── [showId]/
            ├── _layout.tsx           # Stack for show-scoped screens
            ├── index.tsx             # Show Hub (Musical Numbers / Scenes tiles)
            ├── musical-numbers/
            │   ├── index.tsx         # List
            │   ├── new.tsx           # Add modal
            │   └── [numberId].tsx    # Detail with debounced autosave
            └── scenes/
                ├── index.tsx         # List with active/grayed styling
                ├── new.tsx           # Add modal
                └── [sceneId].tsx     # Detail with Switch + autosave
    └── songs/
        ├── index.tsx               # Standalone songs list with filter chips
        ├── new.tsx                 # New song modal (title + audition + category)
        └── [songId].tsx            # Detail: title/audition/completed/notes + parts/tracks/sheet music
src/
├── db/
│   ├── sqlite.ts              # expo-sqlite handle + kv_store + media_cache tables
│   ├── kvStore.ts             # KV wrapper used by the query persister
│   └── mediaCache.ts          # storage_path → local file:// URI map
├── lib/
│   ├── secureStoreAdapter.ts  # Supabase session storage (Expo SecureStore)
│   ├── supabase.ts            # Supabase client
│   ├── queryClient.ts         # TanStack QueryClient + persister
│   └── types.ts               # Row types (Show, MusicalNumber, Scene, Harmony, …)
├── hooks/
│   ├── useAuth.tsx            # AuthProvider + useAuth
│   └── useDebouncedSave.ts    # generic debounce-then-save hook used by detail screens
├── utils/
│   └── confirm.ts             # Alert.alert wrapper with Cancel + destructive Delete buttons
├── components/
│   ├── AudioRecorder.tsx      # expo-audio recorder (mic permission + start/stop)
│   ├── AudioPlayer.tsx        # cached playback via useMedia + useAudioPlayer
│   ├── VideoPlayer.tsx        # expo-video with native iOS controls
│   └── PdfViewer.tsx          # WebView pointed at the cached PDF
└── services/
    ├── authService.ts         # signInWithApple / signInWithGoogle / signOut
    ├── showService.ts         # useShows / useShow / useCreateShow / useUpdateShow / useCompleteShow / useDeleteShow
    ├── musicalNumberService.ts # useMusicalNumbers / useMusicalNumber / useCreate / useUpdate / useDelete
    ├── sceneService.ts        # useScenes / useScene / useCreateScene / useUpdateScene / useDeleteScene
    ├── mediaService.ts        # uploadMedia / deleteMedia / useMedia (cached signed-URL download)
    ├── harmonyService.ts      # useHarmonies / useCreateHarmony / useUpdateHarmony / useDeleteHarmony
    ├── sceneRecordingService.ts # useSceneRecordings / useCreate / useDelete (audio + video scene clips)
    ├── danceVideoService.ts   # useDanceVideos / useCreate / useUpdate / useDelete (file OR external URL)
    ├── sheetMusicService.ts   # useSheetMusic / useCreate / useUpdate / useDelete (PDF only)
    ├── songService.ts         # useSongs (with filters) / useSong / useCreate / useUpdate / useDelete
    ├── songPartService.ts     # useSongParts / useCreate / useUpdate / useDelete (audio clips per song)
    ├── songTrackService.ts    # useSongTracks / useCreate / useUpdate / useDelete (audio/video/link)
    ├── songSheetMusicService.ts # useSongSheetMusic / useCreate / useUpdate / useDelete (PDF)
    └── cascadeDelete.ts       # collectShowStoragePaths / collectSongStoragePaths / deleteShowWithMedia / deleteSongWithMedia
supabase/
└── migrations/
    └── 20260419000001_init_schema.sql  # All 11 tables + RLS + media bucket
__tests__/                     # Jest unit tests
```

Note that later phases will add more under `src/` (services, components, etc.) per the spec and plan docs.

## Build Phases & Status

| Phase | Focus                                                    | Status      |
| ----- | -------------------------------------------------------- | ----------- |
| N1    | Expo scaffold + Expo Router + Supabase auth (Apple + Google) | DONE        |
| N2    | Postgres schema + RLS + TanStack Query persister + shows CRUD | DONE        |
| N3    | Musical numbers + scenes (row-only features)              | DONE        |
| N4    | Audio harmonies + media cache + expo-audio                | DONE        |
| N5    | Video (expo-video) + PDFs (WebView) + external URLs        | DONE        |
| N6    | Standalone songs (parts, tracks, sheet music, filters)    | DONE        |
| N7    | Completed shows archive + cascading storage cleanup       | DONE        |
| N8    | Theme, skeletons, toasts, SF Symbols, EAS → TestFlight    | PENDING     |

## Current Session State

> Update this section at the END of every coding session.

**Last session:** 2026-05-10
**Currently working on:** Phase N7 code complete on branch `feat/phase-n7-completed-shows-archive` (off N6). N6 PR #9 open, awaiting user device acceptance. N7 PR not yet opened.
**Completed this session:** Phase N7 implemented — cascading storage cleanup + confirmation UX. New `src/services/cascadeDelete.ts` exposes `collectShowStoragePaths(showId)` (walks musical_numbers → harmonies/dance_videos/sheet_music, plus scenes → scene_recordings, returning every non-null storage_path), `collectSongStoragePaths(songId)` (walks song_parts/song_tracks/song_sheet_music), `deleteShowWithMedia(id)` and `deleteSongWithMedia(id)` (each: collect descendant paths → chunked batch-remove from the 'media' bucket (chunks of 900 to stay under Supabase's 1000-per-call limit) → clear matching `media_cache` rows + delete local files → delete the parent row, with Postgres FK cascade wiping the descendant rows). `useDeleteShow` and `useDeleteSong` now route through these helpers; tests updated to mock the cascade module and assert the helper is called. New `src/utils/confirm.ts` is a thin `Alert.alert` wrapper with Cancel + destructive Delete buttons (configurable label); wired into Home, Songs list, and Completed screens. Completed screen's row pair changed from '↩︎ Unarchive' / 'Delete' to 'Restore' / 'Delete forever' with the confirm dialog. 3 new cascadeDelete tests; 72 total across 17 suites, all passing. `npx tsc --noEmit` clean. Known perf caveat: `collectShowStoragePaths` is N+1 across musical numbers + scenes — acceptable for a personal app; collapse into an RPC if it ever matters.
**Next steps:** (1) **User action — confirm Supabase migration is applied** (no new SQL for N7). (2) **User action — device test on iPhone via Expo Go**: create a show + add a musical number + record a harmony + add a scene with a recording → complete it → Settings → Completed shows → tap 'Delete forever' → confirm dialog → confirm → check Supabase Dashboard → Storage → `media` → your uid → harmony and scene recording blobs are gone. Repeat for a song: create + add a part + delete → blobs gone. Verify Cancel on the confirm dialog leaves the row alone. (3) Open the N7 PR when the user gives the go-ahead. (4) Tag `phase-n7-complete` once accepted. (5) Phase N8 (theme, skeletons, toasts, SF Symbols, EAS → TestFlight).
**Blockers:** Same as prior phases — migration must be applied to Supabase before anything works on device.

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
