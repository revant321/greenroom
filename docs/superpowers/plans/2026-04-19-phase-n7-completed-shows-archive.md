# Phase N7: Completed Shows Archive + Cascading Storage Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the archive flow. Postgres cascade-deletes rows when a parent is removed, but Supabase Storage blobs do not cascade. This phase introduces a cascade-deletion helper that collects every storage path under a parent and removes the files before the row deletion, then wires it into `useDeleteShow` and `useDeleteSong`.

**Architecture:** A single `collectShowStoragePaths(showId)` helper queries every descendant table under a show and returns a flat list of storage paths. `deleteShowWithMedia(id)` calls it, then batch-removes from Storage, then deletes the row (Postgres cascade wipes child rows). Same shape for songs.

**Tech Stack:** No new deps.

**Spec:** `docs/superpowers/specs/2026-04-19-react-native-expo-migration-design.md`
**Prior plans:** N1–N6 complete.

---

## File Structure

```
src/
└── services/
    ├── cascadeDelete.ts    # NEW: collectShowStoragePaths, collectSongStoragePaths, deleteShowWithMedia, deleteSongWithMedia
    ├── showService.ts      # MODIFIED: useDeleteShow calls deleteShowWithMedia
    └── songService.ts      # MODIFIED: useDeleteSong calls deleteSongWithMedia
app/(app)/completed.tsx     # MODIFIED: confirmation dialog + "delete permanently"
__tests__/
└── cascadeDelete.test.ts   # NEW
```

Note: Phase N2 already added a Completed shows screen. This phase enhances it with confirmation UX and storage cleanup.

---

## Task 1: Cascade-delete helper (TDD)

**Files:**
- Create: `src/services/cascadeDelete.ts`
- Test: `__tests__/cascadeDelete.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { collectShowStoragePaths, collectSongStoragePaths } from "@/services/cascadeDelete";
import { supabase } from "@/lib/supabase";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));

function mockTable(rows: any[]) {
  const eq = jest.fn().mockResolvedValue({ data: rows, error: null });
  const select = jest.fn().mockReturnValue({ eq });
  return { select };
}

describe("collectShowStoragePaths", () => {
  beforeEach(() => jest.clearAllMocks());

  test("returns all storage paths across descendants", async () => {
    const byTable: Record<string, any[]> = {
      musical_numbers:  [{ id: "m1" }, { id: "m2" }],
      harmonies:        [{ storage_path: "u/harmonies/h1.m4a" }, { storage_path: "u/harmonies/h2.m4a" }],
      dance_videos:     [{ storage_path: "u/dance-videos/d1.mp4" }, { storage_path: null }],
      sheet_music:      [{ storage_path: "u/sheet-music/s1.pdf" }],
      scenes:           [{ id: "sc1" }],
      scene_recordings: [{ storage_path: "u/scene-recordings/r1.m4a" }],
    };
    (supabase.from as jest.Mock).mockImplementation((t: string) => mockTable(byTable[t] ?? []));

    const paths = await collectShowStoragePaths("show-1");
    expect(new Set(paths)).toEqual(new Set([
      "u/harmonies/h1.m4a",
      "u/harmonies/h2.m4a",
      "u/dance-videos/d1.mp4",
      "u/sheet-music/s1.pdf",
      "u/scene-recordings/r1.m4a",
    ]));
  });
});

describe("collectSongStoragePaths", () => {
  test("returns all storage paths across song descendants", async () => {
    const byTable: Record<string, any[]> = {
      song_parts:        [{ storage_path: "u/song-parts/p1.m4a" }],
      song_tracks:       [{ storage_path: "u/song-tracks/t1.m4a" }, { storage_path: null, external_url: "https://…" }],
      song_sheet_music:  [{ storage_path: "u/song-sheet-music/s1.pdf" }],
    };
    (supabase.from as jest.Mock).mockImplementation((t: string) => mockTable(byTable[t] ?? []));

    const paths = await collectSongStoragePaths("song-1");
    expect(new Set(paths)).toEqual(new Set([
      "u/song-parts/p1.m4a",
      "u/song-tracks/t1.m4a",
      "u/song-sheet-music/s1.pdf",
    ]));
  });
});
```

- [ ] **Step 2: Watch it fail**

Run: `npm test -- cascadeDelete`

- [ ] **Step 3: Implement**

```ts
// src/services/cascadeDelete.ts
import { supabase } from "@/lib/supabase";
import { mediaCache } from "@/db/mediaCache";
import * as FileSystem from "expo-file-system";

const BUCKET = "media";

async function fetchRows<T>(table: string, parentColumn: string, parentId: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select("*").eq(parentColumn, parentId);
  if (error) throw error;
  return (data ?? []) as T[];
}

export async function collectShowStoragePaths(showId: string): Promise<string[]> {
  const paths: string[] = [];

  const mns = await fetchRows<{ id: string }>("musical_numbers", "show_id", showId);
  for (const mn of mns) {
    const harms = await fetchRows<{ storage_path: string | null }>("harmonies", "musical_number_id", mn.id);
    harms.forEach((h) => h.storage_path && paths.push(h.storage_path));
    const dvs = await fetchRows<{ storage_path: string | null }>("dance_videos", "musical_number_id", mn.id);
    dvs.forEach((d) => d.storage_path && paths.push(d.storage_path));
    const sms = await fetchRows<{ storage_path: string | null }>("sheet_music", "musical_number_id", mn.id);
    sms.forEach((s) => s.storage_path && paths.push(s.storage_path));
  }

  const scenes = await fetchRows<{ id: string }>("scenes", "show_id", showId);
  for (const sc of scenes) {
    const recs = await fetchRows<{ storage_path: string | null }>("scene_recordings", "scene_id", sc.id);
    recs.forEach((r) => r.storage_path && paths.push(r.storage_path));
  }

  return paths;
}

export async function collectSongStoragePaths(songId: string): Promise<string[]> {
  const paths: string[] = [];
  const parts = await fetchRows<{ storage_path: string | null }>("song_parts", "song_id", songId);
  parts.forEach((p) => p.storage_path && paths.push(p.storage_path));
  const tracks = await fetchRows<{ storage_path: string | null }>("song_tracks", "song_id", songId);
  tracks.forEach((t) => t.storage_path && paths.push(t.storage_path));
  const sheets = await fetchRows<{ storage_path: string | null }>("song_sheet_music", "song_id", songId);
  sheets.forEach((s) => s.storage_path && paths.push(s.storage_path));
  return paths;
}

async function removeFromStorageAndCache(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  // Supabase allows bulk removal of up to 1000 objects per call.
  const chunks: string[][] = [];
  for (let i = 0; i < paths.length; i += 900) chunks.push(paths.slice(i, i + 900));
  for (const chunk of chunks) {
    const { error } = await supabase.storage.from(BUCKET).remove(chunk);
    if (error) throw error;
  }
  for (const p of paths) {
    const row = mediaCache.get(p);
    if (row) {
      await FileSystem.deleteAsync(row.local_uri, { idempotent: true }).catch(() => {});
      mediaCache.remove(p);
    }
  }
}

export async function deleteShowWithMedia(showId: string): Promise<void> {
  const paths = await collectShowStoragePaths(showId);
  await removeFromStorageAndCache(paths);
  const { error } = await supabase.from("shows").delete().eq("id", showId);
  if (error) throw error;
}

export async function deleteSongWithMedia(songId: string): Promise<void> {
  const paths = await collectSongStoragePaths(songId);
  await removeFromStorageAndCache(paths);
  const { error } = await supabase.from("songs").delete().eq("id", songId);
  if (error) throw error;
}
```

- [ ] **Step 4: Watch tests pass**

Run: `npm test -- cascadeDelete`

- [ ] **Step 5: Commit**

```bash
git add src/services/cascadeDelete.ts __tests__/cascadeDelete.test.ts
git commit -m "feat(media): cascade-delete helpers for shows and songs"
```

---

## Task 2: Wire `useDeleteShow` to the cascade helper

**Files:**
- Modify: `src/services/showService.ts`

- [ ] **Step 1: Replace the implementation**

```ts
import { deleteShowWithMedia } from "./cascadeDelete";

export function useDeleteShow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await deleteShowWithMedia(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: showKeys.all }),
  });
}
```

- [ ] **Step 2: Update the existing test**

In `__tests__/showService.test.tsx`, replace the previous `useDeleteShow` test with:
```tsx
jest.mock("@/services/cascadeDelete", () => ({
  deleteShowWithMedia: jest.fn().mockResolvedValue(undefined),
}));
// ...
test("useDeleteShow calls deleteShowWithMedia", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrap = ({ children }: any) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result } = renderHook(() => useDeleteShow(), { wrapper: wrap });
  await act(async () => { await result.current.mutateAsync("s1"); });
  const { deleteShowWithMedia } = require("@/services/cascadeDelete");
  expect(deleteShowWithMedia).toHaveBeenCalledWith("s1");
});
```

- [ ] **Step 3: Commit**

```bash
git add src/services/showService.ts __tests__/showService.test.tsx
git commit -m "feat(shows): cascade-delete media when deleting a show"
```

---

## Task 3: Wire `useDeleteSong` to the cascade helper

**Files:**
- Modify: `src/services/songService.ts` and its test (same pattern as Task 2)

- [ ] **Step 1: Implement**

```ts
import { deleteSongWithMedia } from "./cascadeDelete";

export function useDeleteSong() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => { await deleteSongWithMedia(id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: songKeys.all }),
  });
}
```

- [ ] **Step 2: Update test** (mirror of Task 2)

- [ ] **Step 3: Commit**

```bash
git add src/services/songService.ts __tests__/songService.test.tsx
git commit -m "feat(songs): cascade-delete media when deleting a song"
```

---

## Task 4: Confirmation dialogs on destructive actions

**Files:**
- Modify: `app/(app)/index.tsx`, `app/(app)/completed.tsx`, `app/(app)/songs/index.tsx`

Naked `del.mutate(id)` invocations are dangerous. Add an Alert confirmation before every delete on list screens.

- [ ] **Step 1: Helper**

Create `src/utils/confirm.ts`:
```ts
import { Alert } from "react-native";

export function confirm(title: string, message: string, onConfirm: () => void) {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: onConfirm },
  ]);
}
```

- [ ] **Step 2: Replace each list's delete handler**

In each of the three screens, swap:
```tsx
onPress={() => del.mutate(item.id)}
```
for:
```tsx
onPress={() =>
  confirm(
    "Delete forever?",
    `This will remove “${item.name ?? item.title}” and all its recordings.`,
    () => del.mutate(item.id),
  )
}
```

Import the helper at the top of each file.

- [ ] **Step 3: Commit**

```bash
git add src/utils/confirm.ts "app/(app)/index.tsx" "app/(app)/completed.tsx" "app/(app)/songs/index.tsx"
git commit -m "feat: confirm destructive deletes before cascading cleanup"
```

---

## Task 5: Completed shows "restore vs delete permanently" UX

**Files:**
- Modify: `app/(app)/completed.tsx`

Restoring (`is_completed = false`) and deleting are different-level destructive actions. Make the distinction obvious.

- [ ] **Step 1: Render row with two explicit buttons**

```tsx
import { confirm } from "@/utils/confirm";

renderItem={({ item }) => (
  <View style={styles.card}>
    <Text style={styles.name}>{item.name}</Text>
    <View style={{ flexDirection: "row", gap: 12 }}>
      <Pressable onPress={() => update.mutate({ id: item.id, patch: { is_completed: false, completed_at: null } })}>
        <Text style={{ color: "#007AFF" }}>Restore</Text>
      </Pressable>
      <Pressable
        onPress={() =>
          confirm(
            "Delete permanently?",
            `Removes “${item.name}” and every harmony, scene recording, dance video, and PDF associated with it.`,
            () => del.mutate(item.id),
          )
        }
      >
        <Text style={{ color: "#FF3B30" }}>Delete forever</Text>
      </Pressable>
    </View>
  </View>
)}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/completed.tsx"
git commit -m "feat(archive): clarify restore vs delete-permanently"
```

---

## Task 6: Acceptance pass

- [ ] **Step 1:** `npm test` — all tests pass.
- [ ] **Step 2:** Create a show; add a musical number with a harmony; add a scene with a recording. Complete the show. Go to Completed → "Delete forever" → confirm. Open Supabase Dashboard → Storage → `media` → your uid → confirm the harmony and scene recording blobs are gone. Confirm the DB rows for show, musical_numbers, harmonies, scenes, scene_recordings are also gone (cascade).
- [ ] **Step 3:** Same test with a song: create, add a part, delete. Storage orphan does not exist; DB cascade worked.
- [ ] **Step 4:** Test the Cancel path of the confirmation dialog — no deletion.
- [ ] **Step 5:** Tag.

```bash
git tag phase-n7-complete
```

---

## Self-Review

- **Spec coverage:** completed shows archive (already in N2) + storage cleanup on permanent delete ✓, same for songs ✓, confirmation dialogs ✓, restore vs delete-forever distinction ✓.
- **Placeholder scan:** test mirroring in Task 3 points to Task 2. Acceptable; concrete.
- **Type consistency:** `deleteShowWithMedia(id: string)` and `deleteSongWithMedia(id: string)` used identically.
- **Performance caveat:** `collectShowStoragePaths` issues N+1 queries (one per musical number + one per scene). For a personal app with a dozen numbers per show this is fine. If that becomes a hot path, collapse into a single SQL join via an RPC — out of scope for V1.

---

## Next plan

After `phase-n7-complete`, write `YYYY-MM-DD-phase-n8-polish-and-eas.md`.
