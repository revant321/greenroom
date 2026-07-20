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
├── _layout.tsx                # Root: GestureHandlerRoot + PersistQueryClient + Auth + Theme + Toast
├── index.tsx                  # Redirect: /shows if signed in, /login otherwise
├── (auth)/
│   └── login.tsx              # Apple + Google sign-in (themed)
└── (app)/
    ├── _layout.tsx            # Auth gate + Stack registering (tabs) + settings modal
    ├── settings.tsx           # Settings sheet (modal route): theme picker + Completed shows link + Sign out
    └── (tabs)/
        ├── _layout.tsx        # 2-tab <Tabs tabBar={FloatingGlassTabBar}>: Shows + Songs
        ├── shows/             # Shows tab — a Stack
        │   ├── _layout.tsx    # Stack with all show-scoped screens registered flatly
        │   ├── index.tsx      # Shows list + FAB
        │   ├── new.tsx        # New show modal
        │   ├── completed.tsx  # Completed shows archive (linked from Settings)
        │   └── [showId]/
        │       ├── index.tsx       # Show Hub (Musical Numbers / Scenes tiles)
        │       ├── musical-numbers/
        │       │   ├── index.tsx     # List
        │       │   ├── new.tsx       # Add modal
        │       │   └── [numberId].tsx # Detail with debounced autosave + harmonies/videos/PDFs
        │       └── scenes/
        │           ├── index.tsx     # List with active/grayed styling
        │           ├── new.tsx       # Add modal
        │           └── [sceneId].tsx # Detail with Switch + autosave + recordings
        └── songs/             # Songs tab — a Stack
            ├── _layout.tsx     # Stack: index, new (modal), [songId]
            ├── index.tsx       # Standalone songs list with filter chips
            ├── new.tsx         # New song modal (title + audition + category)
            └── [songId].tsx    # Detail: title/audition/completed/notes + parts/tracks/sheet music
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
├── theme/
│   ├── tokens.ts              # light/dark palettes + spacing/radius/type + tab-bar layout constants
│   ├── ThemeProvider.tsx      # auto/light/dark, persisted in SecureStore, subscribes to Appearance
│   └── useTheme.ts            # hook returning { mode, setMode, scheme, colors }
├── utils/
│   └── confirm.ts             # Alert.alert wrapper with Cancel + destructive Delete buttons
├── components/
│   ├── AudioRecorder.tsx      # expo-audio recorder (mic permission + start/stop)
│   ├── AudioPlayer.tsx        # cached playback via useMedia + useAudioPlayer (SF Symbol play/pause)
│   ├── VideoPlayer.tsx        # expo-video with native iOS controls
│   ├── PdfViewer.tsx          # WebView pointed at the cached PDF
│   ├── FloatingGlassTabBar.tsx # BlurView capsule + reanimated lozenge for the 2-tab nav
│   ├── SettingsButton.tsx     # gearshape top-right button → /settings modal
│   ├── Icon.tsx               # SF Symbols (expo-symbols) on iOS, Ionicons fallback
│   ├── Skeleton.tsx           # animated translucent block for loading states
│   ├── EmptyState.tsx         # icon + title + body + action; used on Shows + Songs lists
│   └── Toast.tsx              # ToastProvider + useToast (info/error/success)
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

**Last session:** 2026-07-20
**Currently working on:** UI overhaul applied on branch `feat/ui-overhaul` (off origin/main `09e69e2`, the exact commit the design handoff targeted — no drift to reconcile). Handoff bundle lives in `design_handoff_ui_overhaul/` (gitignored, tsc-excluded). Latest addition: animated "liquid gradient" on the big action elements — new `src/components/LiquidGradient.tsx` (Skia canvas: three drifting radial washes over #E9337A, blur + Turbulence/DisplacementMap warp, durations × `useTheme().speed`) used by GradientFab (`variant="fab"`) and GradientButton primary (`variant="button"`). Chips/tags/play buttons keep the static Gradient. New dep `@shopify/react-native-skia` 2.2.12 (bundled in Expo Go, no native build needed). tsc clean, 73/73 tests, Metro iOS export clean. Not yet device-tested — confirm 60fps; if it stutters, drop `octaves` to 1 or lower `blurSigma`/`intensity` in LiquidGradient.
**Completed this session:** Applied the full aubergine/Poppins UI overhaul from `design_handoff_ui_overhaul/overhaul-files/` in six commits: (1) new deps expo-linear-gradient + expo-font + @expo-google-fonts/poppins; (2) new theme tokens + ThemeProvider with persisted animation-speed setting (`useTheme().speed`); (3) new components — Gradient/GradientButton/GradientFab/Chip/RiseIn/Sheet/SegmentedControl/AnimatedToggle/VoiceRecorder/ScreenTitle/AddUrlForm, replaced AudioPlayer/EmptyState/SettingsButton, deleted AudioRecorder (VoiceRecorder keeps the same onFinish/onCancel contract) and the never-imported `src/components/ui/` folder; (4) all screens restyled with entrance animations + bottom sheets; (5) tsconfig/.gitignore exclude the handoff bundle; (6) carried-over local tweak: tab lozenge spring → 280ms ease-out timing. No service/hook/db/Supabase code changed. `npx tsc --noEmit` clean (the previous `/shows/complete` typed-route blocker is gone — the new shows screen doesn't use that route). 73/73 tests pass. Metro compiles the full iOS bundle cleanly with all overhaul modules present.
**Next steps:** (1) **User action — device test on iPhone via Expo Go** (`npx expo start -c`): aubergine theme on Shows/Songs, glass gear opens/rotates/closes Settings, animation-speed control changes list-entrance speed, recording a harmony/part/scene opens the bottom-sheet recorder with live waveform and Save still uploads. (2) Push `feat/ui-overhaul` and open a PR to main. (3) Known follow-ups from the handoff: login screen not yet restyled; multi-category (AND) song filtering needs a `songService` change; Metro flags minor patch-version drift (expo 54.0.34→~54.0.35, expo-file-system, expo-router) — `npx expo install --fix` when convenient.
**Blockers:** None for the code. Old `feat/ui-polish` branch is stale (already merged as PR #30) — its uncommitted `UI_Overview.md` deletion is still in the working tree, left for the user to decide.

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
