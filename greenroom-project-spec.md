# greenroom — Project Spec

## Overview

A personal theater organizer native iOS app for managing musical numbers, scenes, harmony recordings, dance videos, and rehearsal notes — all in one place. Built for iPhone with Expo + React Native, cloud-backed via Supabase.

## Core Philosophy

One clean backstage companion that replaces scattered notes, voice memos, and video links. Everything about your show lives here.

---

## Pages & Navigation

### Homepage

- App title/logo
- List of all **active shows** — each displays the show name with role(s) underneath in lighter/smaller text
- Tapping a show opens its **Show Hub**
- Small **trophy icon** to access Completed Shows
- Option to **create a new show** (name + roles)
- Supports **multiple active shows** simultaneously

### Show Hub

- Two main buttons: **Musical Numbers** and **Scenes** (scoped to that show)
- Option to **edit show details** (name, roles)
- Option to **mark show as completed**

### Musical Numbers (list page)

- Shows all musical numbers for that show
- User manually adds/edits/deletes numbers
- Each number displays its name and optionally the order in the show

### Musical Number Detail (detail page)

Tapping a number opens its detail page with these sections:

- **Harmonies** — audio recordings, each with a measure number and caption
- **Dance Videos** — links to external videos OR uploaded/recorded videos, each with a title
- **Notes** — free-text notes for that number

### Scenes (list page)

- Shows all scenes in the show
- Scenes the user is NOT in → grayed out, not tappable
- Scenes the user IS in → tappable, opens detail page
- User manually marks which scenes they're in

### Scene Detail (detail page)

- **Notes** — free-text notes for that scene
- **Recordings** — optional audio or video recordings, each with an optional caption

### Completed Shows

- Accessed via trophy icon on homepage
- Lists all completed shows with name, role(s), and completion date
- Tapping a completed show opens a **read-only view** of its musical numbers and scenes (plus any media the user chose to keep)
- Per-show option to **delete remaining saved data** to free storage

### Mark as Completed Flow

1. User initiates "Complete Show" from the Show Hub
2. Confirmation screen appears with three independent toggles:
   - Delete audio recordings (harmonies + scene recordings)
   - Delete video files (uploaded/recorded videos)
   - Delete external links
3. Notes are always deleted
4. Show structure (numbers, scenes, which scenes user was in) always stays
5. Completion date is recorded
6. Show moves to Completed Shows section

---

## Recording & Media

All recording/media slots support two input methods:

- **Upload** — select an existing file from the device
- **Record in-app** — use the microphone (audio) or camera (video) to capture directly

Audio uses expo-av (expo-audio). Video uses expo-video. Files are stored in Supabase Storage with a per-user path prefix; previously loaded media is cached locally via expo-file-system for offline playback.

---

## Backup & Sync

Cloud sync via Supabase IS the backup. There is no manual export/import file format. All data (rows + media files) is owned by the authenticated user and persisted in Supabase Postgres + Supabase Storage. The user's data is always available on any device they sign in to.

---

## Appearance

- **Theme:** Light/dark mode, defaulting to system settings
- **UI style:** Clean, modern iOS aesthetic

---

## Data & Storage

- **Database:** Supabase Postgres (cloud); local SQLite cache via expo-sqlite + TanStack Query persister for offline reads (added in Phase N2)
- **Media storage:** Supabase Storage; cached locally via expo-file-system after first load
- **Authentication:** Supabase Auth with Apple Sign In and Google Sign In
- **Offline reads:** Any data/media previously loaded is available without a network connection. Writes require network.

---

## Tech Stack

- Expo (managed workflow) + React Native + TypeScript
- Expo Router (file-based, native navigation)
- Supabase (Postgres + Auth + Storage)
- TanStack Query + expo-sqlite (data caching; Phase N2+)
- expo-av / expo-video (in-app recording and playback; Phase N4+)
- expo-file-system (local media cache; Phase N4+)

---

## Data Schema (Supabase Postgres tables)

Each table has a `user_id` column (UUID, references `auth.users`) and RLS policies for owner-only access. Full SQL migrations live in `supabase/migrations/` (added in Phase N2). The schema below describes the conceptual model; `audioBlob` / `videoBlob` / `pdfBlob` fields are stored as Supabase Storage object paths, not inline binary data.

### shows

| Field       | Type             | Description                        |
| ----------- | ---------------- | ---------------------------------- |
| id          | uuid | Primary key                        |
| name        | string           | Show title                         |
| roles       | string[]         | Array of role names                |
| isCompleted | boolean          | Whether the show has been archived |
| completedAt | Date \| null     | Date the show was marked completed |
| createdAt   | Date             | Date the show was created          |

### musicalNumbers

| Field     | Type             | Description                     |
| --------- | ---------------- | ------------------------------- |
| id        | uuid | Primary key                     |
| showId    | uuid             | Foreign key to shows            |
| name      | string           | Name of the musical number      |
| order     | number           | Position in the show            |
| notes     | string           | Free-text notes                 |
| createdAt | Date             | Date the number was added       |

### harmonies

| Field           | Type             | Description                  |
| --------------- | ---------------- | ---------------------------- |
| id              | uuid | Primary key                  |
| musicalNumberId | uuid             | Foreign key to musicalNumbers|
| audioBlob       | storage path     | Recorded/uploaded audio (Supabase Storage) |
| measureNumber   | string           | Measure number reference     |
| caption         | string           | Short description            |
| createdAt       | Date             | Date the harmony was added   |

### danceVideos

| Field           | Type             | Description                          |
| --------------- | ---------------- | ------------------------------------ |
| id              | uuid | Primary key                          |
| musicalNumberId | uuid             | Foreign key to musicalNumbers        |
| type            | "link" \| "file" | Whether it's an external URL or upload|
| url             | string \| null   | External video URL (if type="link")  |
| videoBlob       | storage path \| null | Uploaded/recorded video path in Supabase Storage (if type="file")|
| title           | string           | Display title                        |
| createdAt       | Date             | Date the video was added             |

### scenes

| Field         | Type             | Description                       |
| ------------- | ---------------- | --------------------------------- |
| id            | uuid | Primary key                       |
| showId        | uuid             | Foreign key to shows              |
| name          | string           | Scene name/number                 |
| order         | number           | Position in the show              |
| isUserInScene | boolean          | Whether the user is in this scene |
| notes         | string           | Free-text notes                   |
| createdAt     | Date             | Date the scene was added          |

### sceneRecordings

| Field     | Type                | Description                       |
| --------- | ------------------- | --------------------------------- |
| id        | uuid    | Primary key                       |
| sceneId   | uuid                | Foreign key to scenes             |
| type      | "audio" \| "video"  | Recording type                    |
| blob      | storage path        | Recorded/uploaded media path in Supabase Storage |
| caption   | string              | Optional short description        |
| createdAt | Date                | Date the recording was added      |

---

## Build Phases (Native Migration)

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

---

## File Structure

```
greenroom/
├── app/
│   ├── _layout.tsx                # Root: AuthProvider (+ QueryClient, Theme in later phases)
│   ├── index.tsx                  # Redirect based on auth state
│   ├── (auth)/
│   │   └── login.tsx              # Apple + Google sign-in screen
│   └── (app)/
│       ├── _layout.tsx            # Session gate; redirects to /login if unauthenticated
│       ├── index.tsx              # Home screen (shows list)
│       └── settings.tsx           # Sign-out + account info
├── src/
│   ├── lib/
│   │   ├── secureStoreAdapter.ts  # Supabase session storage via Expo SecureStore
│   │   └── supabase.ts            # Supabase client singleton
│   ├── hooks/
│   │   └── useAuth.tsx            # AuthProvider + useAuth hook
│   └── services/
│       └── authService.ts         # signInWithApple / signInWithGoogle / signOut
├── __tests__/                     # Jest unit tests
├── supabase/
│   └── migrations/                # SQL migration files (added in Phase N2)
├── CLAUDE.md
├── greenroom-project-spec.md
├── app.json                       # Expo config
├── package.json
└── tsconfig.json
```

Note: `src/` will grow significantly in later phases (services per entity, shared components, etc.) per the phase plans in `docs/superpowers/plans/`.
