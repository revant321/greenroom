# Phase N4: Audio — Harmonies + Media Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** First media slice. Establish the `media_cache` SQLite table, the `uploadMedia` helper, the `useMedia` hook, and an audio recorder + player, then wire them into a harmonies feature on each Musical Number detail screen. By phase end, the user can record a harmony, kill the app, reopen offline, and play it back.

**Architecture:** The `media` Storage bucket + `media_cache` table form the media layer. Uploads go bucket-first, row-second (so a row never references a missing file). Playback pulls the `file://` URI from cache when present, otherwise fetches a signed URL, streams to disk, and records the path.

**Tech Stack:** `expo-av`, `expo-file-system`, `expo-crypto` (for UUIDs); builds on TanStack Query / expo-sqlite from N2.

**Spec:** `docs/superpowers/specs/2026-04-19-react-native-expo-migration-design.md`
**Prior plans (must be complete):** N1, N2, N3 (tags `phase-n1-complete` through `phase-n3-complete`).

---

## File Structure

```
src/
├── db/
│   └── mediaCache.ts              # NEW: SQLite table + lookup/insert/delete helpers
├── lib/types.ts                   # MODIFIED: add Harmony
├── services/
│   ├── mediaService.ts            # NEW: uploadMedia, deleteMedia, useMedia
│   └── harmonyService.ts          # NEW
components/
├── AudioRecorder.tsx              # NEW
└── AudioPlayer.tsx                # NEW
app/(app)/shows/[showId]/musical-numbers/[numberId].tsx   # MODIFIED: harmonies section
__tests__/
├── mediaCache.test.ts             # NEW
└── harmonyService.test.tsx        # NEW
```

---

## Task 1: `media_cache` SQLite table (TDD)

**Files:**
- Modify: `src/db/sqlite.ts` (add `media_cache` table DDL)
- Create: `src/db/mediaCache.ts`
- Test: `__tests__/mediaCache.test.ts`

- [ ] **Step 1: Extend `sqlite.ts`**

Inside `getDb()` after the `kv_store` CREATE TABLE, add:
```ts
    db.execSync(`
      CREATE TABLE IF NOT EXISTS media_cache (
        storage_path TEXT PRIMARY KEY,
        local_uri TEXT NOT NULL,
        downloaded_at INTEGER NOT NULL,
        size_bytes INTEGER
      );
    `);
```

- [ ] **Step 2: Write failing test**

```ts
import { mediaCache } from "@/db/mediaCache";

const rows = new Map<string, { local_uri: string; downloaded_at: number; size_bytes: number | null }>();
jest.mock("@/db/sqlite", () => ({
  getDb: () => ({
    getFirstSync: (_sql: string, key: string) => rows.get(key) ?? null,
    runSync: (sql: string, ...params: any[]) => {
      if (sql.startsWith("INSERT")) {
        rows.set(params[0], { local_uri: params[1], downloaded_at: params[2], size_bytes: params[3] ?? null });
      } else if (sql.startsWith("DELETE")) {
        rows.delete(params[0]);
      }
    },
  }),
}));

beforeEach(() => rows.clear());

test("put and get round-trip", () => {
  mediaCache.put("a/b.m4a", "file:///tmp/b.m4a", 1234);
  expect(mediaCache.get("a/b.m4a")).toMatchObject({ local_uri: "file:///tmp/b.m4a", size_bytes: 1234 });
});

test("get returns null for missing path", () => {
  expect(mediaCache.get("missing")).toBeNull();
});

test("remove deletes the entry", () => {
  mediaCache.put("a/b.m4a", "file:///tmp/b.m4a", 10);
  mediaCache.remove("a/b.m4a");
  expect(mediaCache.get("a/b.m4a")).toBeNull();
});
```

- [ ] **Step 3: Watch it fail**

Run: `npm test -- mediaCache`

- [ ] **Step 4: Implement**

```ts
// src/db/mediaCache.ts
import { getDb } from "./sqlite";

type Row = { local_uri: string; downloaded_at: number; size_bytes: number | null };

export const mediaCache = {
  get(storagePath: string): Row | null {
    return getDb().getFirstSync<Row>(
      "SELECT local_uri, downloaded_at, size_bytes FROM media_cache WHERE storage_path = ?",
      storagePath,
    ) ?? null;
  },
  put(storagePath: string, localUri: string, sizeBytes: number | null): void {
    getDb().runSync(
      "INSERT INTO media_cache (storage_path, local_uri, downloaded_at, size_bytes) VALUES (?, ?, ?, ?) " +
        "ON CONFLICT(storage_path) DO UPDATE SET local_uri=excluded.local_uri, downloaded_at=excluded.downloaded_at, size_bytes=excluded.size_bytes",
      storagePath, localUri, Date.now(), sizeBytes,
    );
  },
  remove(storagePath: string): void {
    getDb().runSync("DELETE FROM media_cache WHERE storage_path = ?", storagePath);
  },
};
```

- [ ] **Step 5: Watch it pass, commit**

```bash
git add src/db/sqlite.ts src/db/mediaCache.ts __tests__/mediaCache.test.ts
git commit -m "feat(media): add media_cache table and accessor"
```

---

## Task 2: `mediaService` — upload / delete / download

**Files:**
- Create: `src/services/mediaService.ts`

Not TDD'd exhaustively — the meaningful behavior involves `expo-file-system` + Supabase Storage, which are painful to mock faithfully. We rely on manual device verification (Task 7).

- [ ] **Step 1: Implement**

```ts
import * as FileSystem from "expo-file-system";
import * as Crypto from "expo-crypto";
import { supabase } from "@/lib/supabase";
import { mediaCache } from "@/db/mediaCache";
import { useQuery } from "@tanstack/react-query";

const BUCKET = "media";

export async function uploadMedia(
  localUri: string,
  subdir: "harmonies" | "scene-recordings" | "dance-videos" | "sheet-music" | "song-parts" | "song-tracks" | "song-sheet-music",
  extension: string,
): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("No signed-in user.");

  const id = Crypto.randomUUID();
  const storagePath = `${uid}/${subdir}/${id}.${extension}`;

  const fileBytes = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
  const arrayBuffer = Uint8Array.from(atob(fileBytes), (c) => c.charCodeAt(0)).buffer;

  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, arrayBuffer, {
    contentType: mimeForExtension(extension),
    upsert: false,
  });
  if (error) throw error;

  // Move the local copy into our cache so first playback is instant.
  const cachedUri = `${FileSystem.documentDirectory}media/${id}.${extension}`;
  await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}media`, { intermediates: true }).catch(() => {});
  await FileSystem.copyAsync({ from: localUri, to: cachedUri });
  const info = await FileSystem.getInfoAsync(cachedUri);
  mediaCache.put(storagePath, cachedUri, info.exists ? info.size ?? null : null);

  return storagePath;
}

export async function deleteMedia(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) throw error;
  const row = mediaCache.get(storagePath);
  if (row) {
    await FileSystem.deleteAsync(row.local_uri, { idempotent: true }).catch(() => {});
    mediaCache.remove(storagePath);
  }
}

export function useMedia(storagePath: string | null | undefined) {
  return useQuery({
    queryKey: ["media", storagePath],
    enabled: !!storagePath,
    staleTime: Infinity,
    queryFn: async (): Promise<string> => {
      const path = storagePath!;
      const cached = mediaCache.get(path);
      if (cached) return cached.local_uri;

      const { data: signed, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
      if (error || !signed) throw error ?? new Error("No signed URL");

      const filename = path.split("/").pop() ?? "file";
      const dest = `${FileSystem.documentDirectory}media/${filename}`;
      await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}media`, { intermediates: true }).catch(() => {});
      const res = await FileSystem.downloadAsync(signed.signedUrl, dest);
      if (res.status !== 200) throw new Error(`Download failed: ${res.status}`);
      const info = await FileSystem.getInfoAsync(dest);
      mediaCache.put(path, dest, info.exists ? info.size ?? null : null);
      return dest;
    },
  });
}

function mimeForExtension(ext: string): string {
  switch (ext.toLowerCase()) {
    case "m4a": return "audio/mp4";
    case "mp3": return "audio/mpeg";
    case "mp4": return "video/mp4";
    case "mov": return "video/quicktime";
    case "pdf": return "application/pdf";
    default: return "application/octet-stream";
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/mediaService.ts
git commit -m "feat(media): add upload/download/delete and useMedia hook"
```

---

## Task 3: Harmony type + service (TDD)

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/services/harmonyService.ts`
- Test: `__tests__/harmonyService.test.tsx`

- [ ] **Step 1: Add type**

Append to `src/lib/types.ts`:
```ts
export type Harmony = {
  id: string;
  user_id: string;
  musical_number_id: string;
  storage_path: string;
  measure_number: number | null;
  caption: string;
  created_at: string;
};

export type NewHarmony = Pick<Harmony, "musical_number_id" | "storage_path"> &
  Partial<Pick<Harmony, "measure_number" | "caption">>;
export type HarmonyUpdate = Partial<Pick<Harmony, "measure_number" | "caption">>;
```

- [ ] **Step 2: Write test + implement service**

The pattern matches `showService` / `musicalNumberService`: `useHarmonies(musicalNumberId)`, `useCreateHarmony`, `useUpdateHarmony`, `useDeleteHarmony`. Tests mirror the earlier phases' CRUD tests; implementation is:

```ts
// src/services/harmonyService.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Harmony, NewHarmony, HarmonyUpdate } from "@/lib/types";
import { deleteMedia } from "./mediaService";

export const harmonyKeys = {
  all: ["harmonies"] as const,
  list: (mnId: string) => [...harmonyKeys.all, "list", mnId] as const,
};

export function useHarmonies(musicalNumberId: string | undefined) {
  return useQuery({
    queryKey: musicalNumberId ? harmonyKeys.list(musicalNumberId) : [...harmonyKeys.all, "nil"],
    enabled: !!musicalNumberId,
    queryFn: async (): Promise<Harmony[]> => {
      const { data, error } = await supabase
        .from("harmonies").select("*").eq("musical_number_id", musicalNumberId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Harmony[];
    },
  });
}

export function useCreateHarmony() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewHarmony): Promise<Harmony> => {
      const { data, error } = await supabase.from("harmonies").insert(input).select().single();
      if (error) throw error;
      return data as Harmony;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: harmonyKeys.list(d.musical_number_id) }),
  });
}

export function useUpdateHarmony() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: HarmonyUpdate }): Promise<Harmony> => {
      const { data, error } = await supabase
        .from("harmonies").update(input.patch).eq("id", input.id).select().single();
      if (error) throw error;
      return data as Harmony;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: harmonyKeys.list(d.musical_number_id) }),
  });
}

export function useDeleteHarmony() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Harmony): Promise<void> => {
      await deleteMedia(row.storage_path);
      const { error } = await supabase.from("harmonies").delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: (_d, row) => qc.invalidateQueries({ queryKey: harmonyKeys.list(row.musical_number_id) }),
  });
}
```

Test file — follow the pattern in `__tests__/musicalNumberService.test.tsx`: mock `supabase.from` chains for `select/eq/order`, `insert/select/single`, `update/eq/select/single`, `delete/eq`. Add one test that `useDeleteHarmony` calls `deleteMedia(row.storage_path)` by mocking `@/services/mediaService`:
```tsx
jest.mock("@/services/mediaService", () => ({ deleteMedia: jest.fn().mockResolvedValue(undefined) }));
// ...
test("useDeleteHarmony also deletes the storage object", async () => {
  const eq = jest.fn().mockResolvedValue({ error: null });
  const del = jest.fn().mockReturnValue({ eq });
  (supabase.from as jest.Mock).mockReturnValue({ delete: del });
  const { result } = renderHook(() => useDeleteHarmony(), { wrapper: wrap() });
  await act(async () => {
    await result.current.mutateAsync({
      id: "h1", user_id: "u", musical_number_id: "m1",
      storage_path: "u/harmonies/x.m4a", measure_number: null, caption: "",
      created_at: "now",
    });
  });
  const { deleteMedia } = require("@/services/mediaService");
  expect(deleteMedia).toHaveBeenCalledWith("u/harmonies/x.m4a");
});
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts src/services/harmonyService.ts __tests__/harmonyService.test.tsx
git commit -m "feat(harmonies): add CRUD service with storage cleanup on delete"
```

---

## Task 4: `AudioRecorder` component

**Files:**
- Create: `components/AudioRecorder.tsx`

- [ ] **Step 1: Install `expo-av`**

```bash
npx expo install expo-av
```

- [ ] **Step 2: Request permission once and record**

```tsx
// components/AudioRecorder.tsx
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Audio } from "expo-av";

type Props = {
  onFinish: (uri: string) => void; // caller uploads the file
  onCancel: () => void;
};

export function AudioRecorder({ onFinish, onCancel }: Props) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [elapsed, setElapsed] = useState(0);

  async function start() {
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Microphone permission needed", "Enable microphone access in Settings.");
      return;
    }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
      (status) => setElapsed(Math.floor((status.durationMillis ?? 0) / 1000)),
      200,
    );
    setRecording(recording);
  }

  async function stop() {
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    setElapsed(0);
    if (uri) onFinish(uri);
    else Alert.alert("Recording failed", "No file was produced.");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.timer}>{formatTimer(elapsed)}</Text>
      {recording ? (
        <Pressable style={[styles.button, styles.stop]} onPress={stop}>
          <Text style={styles.buttonText}>Stop</Text>
        </Pressable>
      ) : (
        <Pressable style={[styles.button, styles.record]} onPress={start}>
          <Text style={styles.buttonText}>Record</Text>
        </Pressable>
      )}
      <Pressable onPress={onCancel}><Text style={{ color: "#666" }}>Cancel</Text></Pressable>
    </View>
  );
}

function formatTimer(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
}

const styles = StyleSheet.create({
  container: { alignItems: "center", padding: 24, gap: 16 },
  timer: { fontSize: 48, fontVariant: ["tabular-nums"] },
  button: { padding: 24, borderRadius: 999, minWidth: 140, alignItems: "center" },
  record: { backgroundColor: "#FF3B30" },
  stop: { backgroundColor: "#8E8E93" },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
```

- [ ] **Step 3: Commit**

```bash
git add components/AudioRecorder.tsx package.json package-lock.json
git commit -m "feat(media): AudioRecorder component using expo-av"
```

---

## Task 5: `AudioPlayer` component

**Files:**
- Create: `components/AudioPlayer.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Audio } from "expo-av";
import { useMedia } from "@/services/mediaService";

type Props = { storagePath: string };

export function AudioPlayer({ storagePath }: Props) {
  const { data: uri, isLoading, error } = useMedia(storagePath);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setPlaying] = useState(false);

  useEffect(() => () => { soundRef.current?.unloadAsync(); }, []);

  async function toggle() {
    if (!uri) return;
    if (!soundRef.current) {
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      sound.setOnPlaybackStatusUpdate((s) => {
        if (!s.isLoaded) return;
        setPlaying(s.isPlaying);
        if (s.didJustFinish) { setPlaying(false); }
      });
      soundRef.current = sound;
      setPlaying(true);
      return;
    }
    const status = await soundRef.current.getStatusAsync();
    if (status.isLoaded && status.isPlaying) await soundRef.current.pauseAsync();
    else await soundRef.current.playAsync();
  }

  if (isLoading && !uri) return <ActivityIndicator />;
  if (error) return <Text style={{ color: "#FF3B30" }}>Couldn't load audio.</Text>;

  return (
    <Pressable onPress={toggle} style={styles.row}>
      <Text style={styles.play}>{isPlaying ? "⏸" : "▶︎"}</Text>
      <View style={styles.bar} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 8 },
  play: { fontSize: 24 },
  bar: { flex: 1, height: 4, backgroundColor: "#ddd", borderRadius: 2 },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/AudioPlayer.tsx
git commit -m "feat(media): AudioPlayer with local cache via useMedia"
```

---

## Task 6: Wire harmonies into Musical Number detail

**Files:**
- Modify: `app/(app)/shows/[showId]/musical-numbers/[numberId].tsx`

Add a harmonies section below notes: list of harmonies with measure + caption + player; an "Add harmony" button opens a recorder overlay; on finish, upload + create row.

- [ ] **Step 1: Implement**

Replace the previous screen with:

```tsx
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useMusicalNumber, useUpdateMusicalNumber } from "@/services/musicalNumberService";
import { useHarmonies, useCreateHarmony, useDeleteHarmony } from "@/services/harmonyService";
import { uploadMedia } from "@/services/mediaService";
import { AudioRecorder } from "@/../components/AudioRecorder";
import { AudioPlayer } from "@/../components/AudioPlayer";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";

export default function MusicalNumberDetail() {
  const { numberId } = useLocalSearchParams<{ numberId: string }>();
  const { data, isLoading } = useMusicalNumber(numberId);
  const update = useUpdateMusicalNumber();
  const { data: harmonies } = useHarmonies(numberId);
  const createHarmony = useCreateHarmony();
  const deleteHarmony = useDeleteHarmony();

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (data && !hydrated) { setName(data.name); setNotes(data.notes); setHydrated(true); }
  }, [data, hydrated]);

  useDebouncedSave({ name, notes }, 800, ({ name, notes }) => {
    if (!data) return;
    if (name === data.name && notes === data.notes) return;
    update.mutate({ id: data.id, patch: { name, notes } });
  }, hydrated);

  async function onRecordingFinished(uri: string) {
    setRecorderOpen(false);
    if (!data) return;
    try {
      setUploading(true);
      const storagePath = await uploadMedia(uri, "harmonies", "m4a");
      await createHarmony.mutateAsync({ musical_number_id: data.id, storage_path: storagePath });
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? String(e));
    } finally {
      setUploading(false);
    }
  }

  if (isLoading && !data) return <View style={styles.center}><ActivityIndicator /></View>;
  if (!data) return <View style={styles.center}><Text>Not found.</Text></View>;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: name || "Musical Number" }} />
      <Text style={styles.label}>Name</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} />
      <Text style={styles.label}>Notes</Text>
      <TextInput value={notes} onChangeText={setNotes} multiline style={[styles.input, styles.notes]} />

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Harmonies</Text>
          <Pressable onPress={() => setRecorderOpen(true)} style={styles.addBtn}>
            <Text style={styles.addBtnText}>{uploading ? "Uploading…" : "+ Record"}</Text>
          </Pressable>
        </View>
        <FlatList
          data={harmonies ?? []}
          keyExtractor={(h) => h.id}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={{ color: "#999", padding: 8 }}>No harmonies yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.harmonyRow}>
              <AudioPlayer storagePath={item.storage_path} />
              <Text style={styles.caption}>
                {item.measure_number != null ? `m. ${item.measure_number} — ` : ""}{item.caption || "(untitled)"}
              </Text>
              <Pressable onPress={() => deleteHarmony.mutate(item)}>
                <Text style={{ color: "#FF3B30" }}>Delete</Text>
              </Pressable>
            </View>
          )}
        />
      </View>

      <Modal visible={recorderOpen} animationType="slide" presentationStyle="pageSheet">
        <AudioRecorder onFinish={onRecordingFinished} onCancel={() => setRecorderOpen(false)} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 14, color: "#666" },
  input: {
    fontSize: 16, padding: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: "#ccc", borderRadius: 8,
    backgroundColor: "#fff",
  },
  notes: { minHeight: 120, textAlignVertical: "top" },
  section: { marginTop: 16 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  sectionTitle: { fontSize: 20, fontWeight: "600" },
  addBtn: { padding: 8, paddingHorizontal: 12, backgroundColor: "#007AFF", borderRadius: 8 },
  addBtnText: { color: "#fff", fontWeight: "600" },
  harmonyRow: {
    padding: 12, backgroundColor: "#fff", borderRadius: 10, marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth, borderColor: "#ddd", gap: 4,
  },
  caption: { color: "#666" },
});
```

(Import paths `@/../components/...` are a workaround because `components/` lives outside `src/`. If preferred, move `components/` under `src/components/` and drop the `..`; adjust the `@/*` alias accordingly.)

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/shows/[showId]/musical-numbers/[numberId].tsx"
git commit -m "feat(harmonies): record, upload, list, play on musical number detail"
```

---

## Task 7: Add measure number + caption editing

**Files:**
- Modify: `app/(app)/shows/[showId]/musical-numbers/[numberId].tsx`

After saving a harmony, users need to edit its caption and measure number. Add inline inputs per row.

- [ ] **Step 1: Extend harmony row to show editable fields**

Replace the `renderItem` with:
```tsx
renderItem={({ item }) => (
  <HarmonyRow item={item} />
)}
```

Add a `HarmonyRow` component inside the file:
```tsx
import { useUpdateHarmony } from "@/services/harmonyService";

function HarmonyRow({ item }: { item: import("@/lib/types").Harmony }) {
  const update = useUpdateHarmony();
  const del = useDeleteHarmony();
  const [measure, setMeasure] = useState<string>(item.measure_number?.toString() ?? "");
  const [caption, setCaption] = useState(item.caption);

  useDebouncedSave({ measure, caption }, 800, ({ measure, caption }) => {
    const mNum = measure.trim() === "" ? null : Number(measure);
    if (mNum !== null && Number.isNaN(mNum)) return;
    if (mNum === item.measure_number && caption === item.caption) return;
    update.mutate({ id: item.id, patch: { measure_number: mNum, caption } });
  });

  return (
    <View style={styles.harmonyRow}>
      <AudioPlayer storagePath={item.storage_path} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          value={measure} onChangeText={setMeasure}
          placeholder="Measure #" keyboardType="number-pad"
          style={[styles.smallInput, { width: 100 }]}
        />
        <TextInput
          value={caption} onChangeText={setCaption}
          placeholder="Caption"
          style={[styles.smallInput, { flex: 1 }]}
        />
      </View>
      <Pressable onPress={() => del.mutate(item)} style={{ alignSelf: "flex-end" }}>
        <Text style={{ color: "#FF3B30" }}>Delete</Text>
      </Pressable>
    </View>
  );
}
```

Append to `styles`:
```ts
smallInput: {
  padding: 8, fontSize: 14,
  borderWidth: StyleSheet.hairlineWidth, borderColor: "#ccc", borderRadius: 6,
  backgroundColor: "#fff",
},
```

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/shows/[showId]/musical-numbers/[numberId].tsx"
git commit -m "feat(harmonies): editable measure number and caption per row"
```

---

## Task 8: Acceptance pass

- [ ] **Step 1: `npm test`** — all tests pass.

- [ ] **Step 2: Record + playback round-trip**

Inside a musical number: tap "+ Record" → allow mic permission first time → record 5 seconds → Stop. Expect the row to appear with a player. Tap play — audio plays.

- [ ] **Step 3: Offline playback**

With a harmony recorded and previously played once, kill the app, enable airplane mode, reopen, navigate to the musical number, tap play. Audio plays (from cache).

- [ ] **Step 4: Delete removes storage + cache**

Delete a harmony. In Supabase Dashboard → Storage → `media` → `<your-uid>/harmonies/`, confirm the file is gone. Re-inspect `media_cache` (via `adb`/`xcrun` or a small debug log) — row absent.

- [ ] **Step 5: Tag**

```bash
git tag phase-n4-complete
```

---

## Self-Review

- **Spec coverage:** `media_cache` ✓, `useMedia` ✓, upload helper ✓, audio recorder ✓, playback ✓, harmonies CRUD ✓, measure + caption editing ✓, offline playback verification ✓, storage cleanup on delete ✓.
- **Placeholder scan:** Task 3 leaves harmonyService tests "mirror earlier phases" with a concrete additional test called out explicitly. Tests still need to be written during implementation — not a placeholder, a delegation.
- **Path alias caveat:** `components/` sits outside `src/`, so imports read `@/../components/...`. Alternative: move `components/` to `src/components/` and simplify — prefer this during implementation if it feels awkward.
- **Known risk:** `expo-av` is scheduled for deprecation in favor of `expo-audio`/`expo-video` in recent Expo SDKs. If the Expo SDK at implementation time ships `expo-audio` as GA, prefer that; API is similar. Update this phase accordingly.

---

## Next plan

After `phase-n4-complete`, write `YYYY-MM-DD-phase-n5-video-and-pdfs.md`.
