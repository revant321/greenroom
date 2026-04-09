# CLAUDE.md — greenroom

> This file is auto-read by Claude Code at the start of every session. Update it after every coding session.

## Project Overview

**greenroom** is a personal theater organizer PWA for managing musical numbers, scenes, harmonies, dance videos, and rehearsal notes. Local-first, no cloud dependency.

- **Repo:** github.com/revant321/greenroom
- **Full spec:** `greenroom-project-spec.md` (always reference this for detailed requirements)
- **Target devices:** iPhone (Safari PWA) + Mac (Chrome/Safari)

## Tech Stack

- React 18 + TypeScript + Vite (PWA)
- Dexie.js (IndexedDB)
- React Router
- MediaRecorder API + Web Audio API

## Architecture Rules

- **Local-first:** All data stored in IndexedDB via Dexie.js. No cloud, no accounts.
- **No AI integration:** Privacy preference — no AI features in the app.
- **PWA:** Must be installable on iPhone via "Add to Home Screen."
- **Single-file media:** Audio and video stored as Blobs in IndexedDB.
- **Export format:** `.grm` files (JSON with base64-encoded media).
- **Theme:** Light/dark mode, defaulting to system settings.
- **UI:** Clean, modern iOS aesthetic.

## Database Tables

- `shows` — id, name, roles[], isCompleted, completedAt, createdAt
- `musicalNumbers` — id, showId, name, order, notes, createdAt
- `harmonies` — id, musicalNumberId, audioBlob, measureNumber, caption, createdAt
- `danceVideos` — id, musicalNumberId, type, url/videoBlob, title, createdAt
- `scenes` — id, showId, name, order, isUserInScene, notes, createdAt
- `sceneRecordings` — id, sceneId, type, blob, caption, createdAt

## File Structure

```
src/
├── components/     # Reusable UI components
├── pages/          # Route-level page components
│   ├── Home.tsx
│   ├── ShowHub.tsx
│   ├── MusicalNumbers.tsx
│   ├── MusicalNumberDetail.tsx
│   ├── Scenes.tsx
│   ├── SceneDetail.tsx
│   └── CompletedShows.tsx
├── db/
│   └── database.ts # Dexie database definition
├── hooks/          # Custom React hooks
├── utils/          # Helper functions (export/import, etc.)
├── App.tsx         # Router setup
└── main.tsx        # Entry point
```

## Build Phases & Status

| Phase | Focus                                              | Status      |
| ----- | -------------------------------------------------- | ----------- |
| 1     | Scaffold + routing + homepage + show management    | DONE        |
| 2     | Show Hub + Musical Numbers list + detail with notes| DONE        |
| 3     | Harmony recording/upload + measure numbers/captions| DONE        |
| 4     | Scenes list (active/grayed) + detail + recordings  | DONE        |
| 5     | Dance videos + sheet music + standalone songs      | DONE        |
| 6     | Completed Shows (archive, view, storage cleanup)   | DONE        |
| 7     | Export/import (.grm) + duplicate detection          | DONE        |
| 8     | PWA + theming + iOS polish                         | DONE        |

## Database Tables (updated)

Original tables plus:
- `sheetMusic` — id, musicalNumberId, pdfBlob, title, createdAt
- `songs` — id, title, isAuditionSong, category (vocal/guitar/null), status (in-progress/completed), notes, createdAt
- `songParts` — id, songId, audioBlob, measureNumber, caption, createdAt
- `songTracks` — id, songId, type (link/audio/video), url/blob, title, createdAt
- `songSheetMusic` — id, songId, pdfBlob, title, createdAt

## Current Session State

> Update this section at the END of every coding session.

**Last session:** 2026-04-09
**Currently working on:** All phases complete
**Completed this session:** Phase 8 — PWA setup (manifest, service worker, offline caching, iOS meta tags, app icons), Apple Liquid Glass UI overhaul (pure black dark mode, grouped card containers with separator lines, minimal shadows, clean typography hierarchy), iOS polish (44px tap targets, safe-area-insets, Apple-style ease curves, scale-down touch feedback on all tappable elements), viewport-fit=cover for edge-to-edge display. Fixed pre-existing TS error in ShowHub (scene recording type mismatch).
**Next steps:** Ship it! All 8 phases complete.
**Blockers:** None

## Session Rules

1. **Read this file first** at the start of every session.
2. **Reference `greenroom-project-spec.md`** for detailed requirements before implementing any feature.
3. **Update "Current Session State"** at the end of every session.
4. **Explain what code does** — the developer is learning and wants to understand, not just receive code.
5. **Commit often** with descriptive messages.
