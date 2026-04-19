# Supabase Auth & Cloud Sync — Design Spec

> Greenroom transitions from local-only (Dexie/IndexedDB) to cloud-synced with Supabase as the source of truth. Auth via Google and Apple Sign-In. Media files served on-demand from Supabase Storage.

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Primary goal | Multi-device sync with cloud backup | User wants data on phone + laptop, no data loss |
| Media strategy | Sync metadata, media on-demand | Balances "data everywhere" feel with bandwidth/storage costs |
| Offline support | Online-only to start, room for offline later | Avoid premature complexity; service layer abstraction keeps the door open |
| Auth providers | Google + Apple | Apple required for App Store submission |
| Mobile path | React Native (future) | Supabase backend is the shared layer between web and native |
| Architecture | Service layer abstraction (Approach B) | Components call services, services call Supabase; enables offline later and React Native reuse |
| Migration | Fresh start | No existing users, no local data migration needed |
| RLS | Simple authenticated-only policy for now | `auth.uid() IS NOT NULL` on all tables; tighten to per-user before launch |

---

## 1. Auth

### Providers

- Google Sign-In (OAuth)
- Apple Sign-In (OAuth)

Both configured in the Supabase dashboard.

### Auth Flow

1. On app load, check for an existing session via `supabase.auth.getSession()`
2. If no session, show a login screen with "Sign in with Google" and "Sign in with Apple" buttons
3. Use `supabase.auth.signInWithOAuth()` for both providers — redirects to the provider and back
4. After login, the Supabase client automatically attaches the user's JWT to all subsequent requests
5. A React context (`AuthProvider`) wraps the app, providing the current user and a loading state
6. All routes except login are protected — if no session, redirect to login

### Session Handling

- Supabase JS client handles token refresh automatically
- Sign out clears the session and redirects to login

---

## 2. Database Schema (Supabase Postgres)

### Key changes from Dexie

- **Every table gets a `user_id` column** — foreign key to `auth.users.id`
- **IDs switch from auto-increment integers to UUIDs** — standard for Postgres, better for distributed systems
- **Media Blob columns replaced with `storage_path`** — a string pointing to a file in Supabase Storage
- **Naming convention:** snake_case for Postgres columns (service layer maps to/from camelCase in JS)

### Tables

| Table | Key changes from Dexie |
|-------|----------------------|
| `shows` | + `user_id`, UUID pk, `is_completed` as boolean |
| `musical_numbers` | + `user_id`, references `shows.id` |
| `harmonies` | + `user_id`, `audio_blob` → `storage_path` |
| `dance_videos` | + `user_id`, `video_blob` → `storage_path` (keeps `url` for links) |
| `sheet_music` | + `user_id`, `pdf_blob` → `storage_path` (keeps `url` for links) |
| `scenes` | + `user_id`, references `shows.id` |
| `scene_recordings` | + `user_id`, `blob` → `storage_path` (keeps `url` for links) |
| `quick_changes` | + `user_id`, references `shows.id` |
| `songs` | + `user_id` |
| `song_parts` | + `user_id`, `audio_blob` → `storage_path` |
| `song_tracks` | + `user_id`, `blob` → `storage_path` (keeps `url` for links) |
| `song_sheet_music` | + `user_id`, `storage_path` (keeps `url` for links) |

### RLS Policies

Simple authenticated-only policy on all tables for now:

```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON <table>
  FOR ALL USING (auth.uid() IS NOT NULL);
```

Per-user policies (`WHERE user_id = auth.uid()`) to be added before public launch.

---

## 3. Supabase Storage

### Bucket

One private bucket: `media`.

### File Organization

```
media/
  {user_id}/
    harmonies/{id}.webm
    dance-videos/{id}.mp4
    scene-recordings/{id}.webm
    sheet-music/{id}.pdf
    song-parts/{id}.webm
    song-tracks/{id}.mp4
    song-sheet-music/{id}.pdf
```

### How It Works

- **Upload:** Service layer uploads the file to Supabase Storage, stores the resulting path in the Postgres row
- **Playback/view:** Service layer generates a signed URL via `supabase.storage.from('media').createSignedUrl(path, expiresIn)` — temporary download URL
- **Access control:** Storage policies restrict access to `media/{user_id}/*` for each authenticated user

### On-Demand Download

- When syncing across devices, only the metadata row syncs (just a `storage_path` string)
- Actual file bytes only transfer when the user taps play/view — the client fetches the signed URL at that point

---

## 4. Service Layer Architecture

### Structure

```
src/
  services/
    supabaseClient.ts    — Supabase client singleton
    authService.ts       — login, logout, session management
    showService.ts       — CRUD for shows
    musicalNumberService.ts
    harmonyService.ts
    sceneService.ts
    songService.ts
    storageService.ts    — upload/download/signed URLs for media
```

### Pattern

Each service exports async functions. Components call services, never Supabase directly.

```ts
// Example: showService.ts
export async function getShows(): Promise<Show[]> { ... }
export async function createShow(show: CreateShowInput): Promise<Show> { ... }
export async function updateShow(id: string, updates: Partial<Show>): Promise<Show> { ... }
export async function deleteShow(id: string): Promise<void> { ... }
```

### Why This Matters

- **Offline later:** Swap the service internals to use a local cache + sync queue without touching components
- **React Native:** Same service interfaces, different Supabase client initialization
- **Testing:** Easy to mock services in tests

---

## 5. App Structure Changes

### New Components

- `LoginPage` — Google + Apple sign-in buttons
- `AuthProvider` — React context providing current user and loading state
- `ProtectedRoute` — wrapper that redirects to login if no session

### Modified Flow

```
App load
  → AuthProvider checks session
  → No session? → LoginPage
  → Has session? → Existing app routes (Home, ShowHub, etc.)
```

### Removed

- Dexie database (`src/db/database.ts`) — replaced entirely by Supabase
- `.grm` export/import — replaced by cloud sync (may revisit as a sharing feature later)

---

## 6. Environment & Config

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase publishable key (`sb_publishable_…`), safe for frontend. Replaces the legacy `anon` key.
- These go in `.env` (gitignored) with a `.env.example` committed to the repo

---

## Open Items (for later)

- Per-user RLS policies before public launch
- Offline support (local cache + sync queue)
- React Native app sharing the same Supabase backend
- Sharing shows between users (cast collaboration)
- Real-time sync (Supabase Realtime subscriptions)
