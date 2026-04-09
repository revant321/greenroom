# greenroom — Project Spec

## Overview

A personal theater organizer PWA for managing musical numbers, scenes, harmony recordings, dance videos, and rehearsal notes — all in one place. Built for iPhone (Safari) and Mac, local-first with no cloud dependency.

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

Audio uses the MediaRecorder API. Video uses the same API with camera access. Files are stored locally in IndexedDB via Dexie.js.

---

## Export / Import

- **File format:** Custom `.grm` file (JSON with embedded media as base64)
- **Export:** Individual shows (active or completed) can be exported separately
- **Import:** Import a `.grm` file to add a show
- **Duplicate detection:** On import, auto-check for duplicates by show name. For each duplicate found, the user is prompted with three options:
  - **Keep both** — import as a separate copy
  - **Replace** — overwrite existing with imported version
  - **Cancel** — skip that duplicate

---

## Appearance

- **Theme:** Light/dark mode, defaulting to system settings
- **UI style:** Clean, modern iOS aesthetic

---

## Data & Storage

- **Database:** IndexedDB via Dexie.js
- **Data stays on-device** — no cloud, no accounts
- **No automatic sync** — each device holds its own copy, user transfers manually via `.grm` export/import

---

## Tech Stack

- React 18 + TypeScript + Vite (PWA)
- Dexie.js (IndexedDB wrapper)
- React Router (page navigation)
- MediaRecorder API (in-app recording)
- Web Audio API (playback)

---

## Data Schema (Dexie tables)

### shows

| Field       | Type             | Description                        |
| ----------- | ---------------- | ---------------------------------- |
| id          | auto-incremented | Primary key                        |
| name        | string           | Show title                         |
| roles       | string[]         | Array of role names                |
| isCompleted | boolean          | Whether the show has been archived |
| completedAt | Date \| null     | Date the show was marked completed |
| createdAt   | Date             | Date the show was created          |

### musicalNumbers

| Field     | Type             | Description                     |
| --------- | ---------------- | ------------------------------- |
| id        | auto-incremented | Primary key                     |
| showId    | number           | Foreign key to shows            |
| name      | string           | Name of the musical number      |
| order     | number           | Position in the show            |
| notes     | string           | Free-text notes                 |
| createdAt | Date             | Date the number was added       |

### harmonies

| Field           | Type             | Description                  |
| --------------- | ---------------- | ---------------------------- |
| id              | auto-incremented | Primary key                  |
| musicalNumberId | number           | Foreign key to musicalNumbers|
| audioBlob       | Blob             | Recorded/uploaded audio data |
| measureNumber   | string           | Measure number reference     |
| caption         | string           | Short description            |
| createdAt       | Date             | Date the harmony was added   |

### danceVideos

| Field           | Type             | Description                          |
| --------------- | ---------------- | ------------------------------------ |
| id              | auto-incremented | Primary key                          |
| musicalNumberId | number           | Foreign key to musicalNumbers        |
| type            | "link" \| "file" | Whether it's an external URL or upload|
| url             | string \| null   | External video URL (if type="link")  |
| videoBlob       | Blob \| null     | Uploaded/recorded video (if type="file")|
| title           | string           | Display title                        |
| createdAt       | Date             | Date the video was added             |

### scenes

| Field         | Type             | Description                       |
| ------------- | ---------------- | --------------------------------- |
| id            | auto-incremented | Primary key                       |
| showId        | number           | Foreign key to shows              |
| name          | string           | Scene name/number                 |
| order         | number           | Position in the show              |
| isUserInScene | boolean          | Whether the user is in this scene |
| notes         | string           | Free-text notes                   |
| createdAt     | Date             | Date the scene was added          |

### sceneRecordings

| Field     | Type                | Description                       |
| --------- | ------------------- | --------------------------------- |
| id        | auto-incremented    | Primary key                       |
| sceneId   | number              | Foreign key to scenes             |
| type      | "audio" \| "video"  | Recording type                    |
| blob      | Blob                | Recorded/uploaded media data      |
| caption   | string              | Optional short description        |
| createdAt | Date                | Date the recording was added      |

---

## Build Phases

| Phase | Focus                                                              |
| ----- | ------------------------------------------------------------------ |
| 1     | Project scaffold + routing + homepage with show management         |
| 2     | Show Hub + Musical Numbers list + detail page with notes           |
| 3     | Harmony recording/upload with measure numbers and captions         |
| 4     | Scenes list (active/grayed-out) + scene detail with notes & recordings |
| 5     | Dance video links/uploads                                          |
| 6     | Completed Shows flow (mark complete, archive view, storage cleanup)|
| 7     | Export/import with `.grm` format and duplicate detection           |
| 8     | PWA setup (installable, offline-ready) + light/dark theming + iOS polish |

---

## File Structure

```
greenroom/
├── public/
│   └── icons/
├── src/
│   ├── components/
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── ShowHub.tsx
│   │   ├── MusicalNumbers.tsx
│   │   ├── MusicalNumberDetail.tsx
│   │   ├── Scenes.tsx
│   │   ├── SceneDetail.tsx
│   │   └── CompletedShows.tsx
│   ├── db/
│   │   └── database.ts
│   ├── hooks/
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
├── CLAUDE.md
├── greenroom-project-spec.md
├── README.md
├── package.json
└── tsconfig.json
```
