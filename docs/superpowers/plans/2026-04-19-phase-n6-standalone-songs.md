# Phase N6: Standalone Songs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the standalone songs feature: a list with audition/vocal/guitar/completed filters, plus a detail screen with parts (audio clips), tracks (audio/video file or external link), sheet music PDFs, and notes.

**Architecture:** Mostly a reapplication of the patterns from N2–N5 to four new tables: `songs`, `song_parts`, `song_tracks`, `song_sheet_music`. No new infra; reuses `uploadMedia`, `useMedia`, players, PDF viewer.

**Tech Stack:** No new deps.

**Spec:** `docs/superpowers/specs/2026-04-19-react-native-expo-migration-design.md`
**Prior plans:** N1–N5 complete.

---

## File Structure

```
src/
├── lib/types.ts                          # MODIFIED
└── services/
    ├── songService.ts                    # NEW
    ├── songPartService.ts                # NEW
    ├── songTrackService.ts               # NEW
    └── songSheetMusicService.ts          # NEW
app/(app)/songs/
├── index.tsx                             # NEW: list with filters
├── new.tsx                               # NEW: add modal
└── [songId].tsx                          # NEW: detail
__tests__/
├── songService.test.tsx
├── songPartService.test.tsx
├── songTrackService.test.tsx
└── songSheetMusicService.test.tsx
```

Add a "Songs" nav entry on Home (Settings link is also acceptable; this plan puts it on Home).

---

## Task 1: Row types

**Files:** Modify `src/lib/types.ts`.

- [ ] **Step 1: Append**

```ts
export type SongCategory = "vocal" | "guitar" | null;
export type SongStatus = "in-progress" | "completed";

export type Song = {
  id: string;
  user_id: string;
  title: string;
  is_audition_song: boolean;
  category: SongCategory;
  status: SongStatus;
  notes: string;
  created_at: string;
};
export type NewSong = Pick<Song, "title"> & Partial<Pick<Song, "is_audition_song" | "category" | "status">>;
export type SongUpdate = Partial<Pick<Song, "title" | "is_audition_song" | "category" | "status" | "notes">>;

export type SongPart = {
  id: string; user_id: string; song_id: string;
  storage_path: string; measure_number: number | null; caption: string; created_at: string;
};
export type NewSongPart = Pick<SongPart, "song_id" | "storage_path"> & Partial<Pick<SongPart, "measure_number" | "caption">>;
export type SongPartUpdate = Partial<Pick<SongPart, "measure_number" | "caption">>;

export type SongTrackKind = "audio" | "video" | "link";
export type SongTrack = {
  id: string; user_id: string; song_id: string;
  kind: SongTrackKind; title: string;
  storage_path: string | null; external_url: string | null;
  created_at: string;
};
export type NewSongTrack =
  | { song_id: string; kind: "audio" | "video"; storage_path: string; title?: string }
  | { song_id: string; kind: "link"; external_url: string; title?: string };

export type SongSheetMusic = {
  id: string; user_id: string; song_id: string;
  title: string; storage_path: string; created_at: string;
};
export type NewSongSheetMusic = Pick<SongSheetMusic, "song_id" | "title" | "storage_path">;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): add Song and related row types"
```

---

## Task 2: `songService` (TDD)

**Files:** `src/services/songService.ts` + test.

- [ ] **Step 1: Tests**

Follow the `showService` template. Add one distinguishing test:

```tsx
test("useSongs supports filtering by category and status", async () => {
  const order = jest.fn().mockResolvedValue({ data: [{ id: "g1", category: "guitar", status: "in-progress" }], error: null });
  const eqStatus = jest.fn().mockReturnValue({ order });
  const eqCategory = jest.fn().mockReturnValue({ eq: eqStatus });
  const select = jest.fn().mockReturnValue({ eq: eqCategory });
  (supabase.from as jest.Mock).mockReturnValue({ select });

  const { result } = renderHook(() => useSongs({ category: "guitar", status: "in-progress" }), { wrapper: wrap() });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(eqCategory).toHaveBeenCalledWith("category", "guitar");
  expect(eqStatus).toHaveBeenCalledWith("status", "in-progress");
});
```

Plus standard list-by-`is_audition_song`, detail, create, update, delete.

- [ ] **Step 2: Implement**

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Song, NewSong, SongUpdate, SongCategory, SongStatus } from "@/lib/types";

type Filter = {
  is_audition_song?: boolean;
  category?: Exclude<SongCategory, null>;
  status?: SongStatus;
};

export const songKeys = {
  all: ["songs"] as const,
  list: (f: Filter) => [...songKeys.all, "list", f] as const,
  detail: (id: string) => [...songKeys.all, "detail", id] as const,
};

export function useSongs(filter: Filter = {}) {
  return useQuery({
    queryKey: songKeys.list(filter),
    queryFn: async (): Promise<Song[]> => {
      let q = supabase.from("songs").select("*");
      if (filter.is_audition_song !== undefined) q = q.eq("is_audition_song", filter.is_audition_song);
      if (filter.category) q = q.eq("category", filter.category);
      if (filter.status) q = q.eq("status", filter.status);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Song[];
    },
  });
}

export function useSong(id: string | undefined) {
  return useQuery({
    queryKey: id ? songKeys.detail(id) : [...songKeys.all, "detail", "nil"],
    enabled: !!id,
    queryFn: async (): Promise<Song> => {
      const { data, error } = await supabase.from("songs").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as Song;
    },
  });
}

export function useCreateSong() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewSong): Promise<Song> => {
      const { data, error } = await supabase.from("songs").insert(input).select().single();
      if (error) throw error;
      return data as Song;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: songKeys.all }),
  });
}

export function useUpdateSong() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: SongUpdate }): Promise<Song> => {
      const { data, error } = await supabase.from("songs").update(input.patch).eq("id", input.id).select().single();
      if (error) throw error;
      return data as Song;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: songKeys.detail(d.id) });
      qc.invalidateQueries({ queryKey: songKeys.all });
    },
  });
}

export function useDeleteSong() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("songs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: songKeys.all }),
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/services/songService.ts __tests__/songService.test.tsx
git commit -m "feat(songs): CRUD with category and status filters"
```

---

## Task 3: Song parts / tracks / sheet-music services

**Files:** three new services + tests.

Each mirrors the corresponding feature from N4/N5:
- `songPartService` ≅ `harmonyService` (parent: `song_id`, table: `song_parts`)
- `songTrackService` ≅ `danceVideoService` but with three kinds: `audio`, `video`, `link`. Delete calls `deleteMedia` only when `storage_path` is non-null.
- `songSheetMusicService` ≅ `sheetMusicService` (parent: `song_id`, table: `song_sheet_music`)

Tests: one file per service, 4–5 tests each, mirroring the earlier phases' templates exactly. Each service exposes `use<X>s(songId)`, `useCreate<X>`, `useUpdate<X>` (where applicable), `useDelete<X>`.

- [ ] **Step 1: Implement + test each, commit per service**

```bash
git add src/services/songPartService.ts __tests__/songPartService.test.tsx
git commit -m "feat(songs): parts CRUD service"

git add src/services/songTrackService.ts __tests__/songTrackService.test.tsx
git commit -m "feat(songs): tracks CRUD with audio/video/link kinds"

git add src/services/songSheetMusicService.ts __tests__/songSheetMusicService.test.tsx
git commit -m "feat(songs): sheet music CRUD service"
```

---

## Task 4: Songs list with filters

**Files:**
- Create: `app/(app)/songs/index.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { Link, useRouter } from "expo-router";
import { useSongs, useDeleteSong } from "@/services/songService";
import { SongCategory, SongStatus } from "@/lib/types";

type Filter = {
  is_audition_song?: boolean;
  category?: Exclude<SongCategory, null>;
  status?: SongStatus;
};

const PRESETS: { label: string; filter: Filter }[] = [
  { label: "All", filter: {} },
  { label: "Audition", filter: { is_audition_song: true } },
  { label: "Vocal", filter: { category: "vocal" } },
  { label: "Guitar", filter: { category: "guitar" } },
  { label: "In progress", filter: { status: "in-progress" } },
  { label: "Completed", filter: { status: "completed" } },
];

export default function Songs() {
  const router = useRouter();
  const [preset, setPreset] = useState(0);
  const { data, isLoading } = useSongs(PRESETS[preset].filter);
  const del = useDeleteSong();

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.filters}>
        {PRESETS.map((p, i) => (
          <Pressable key={p.label} onPress={() => setPreset(i)}
            style={[styles.chip, i === preset && styles.chipActive]}>
            <Text style={[styles.chipText, i === preset && styles.chipTextActive]}>{p.label}</Text>
          </Pressable>
        ))}
      </View>
      {isLoading && !data ? <ActivityIndicator style={{ marginTop: 24 }} /> : (
        <FlatList
          data={data ?? []}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={<Text style={{ color: "#666", padding: 16 }}>No songs match this filter.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Link href={`/(app)/songs/${item.id}`} style={{ flex: 1 }}>
                <View>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.meta}>
                    {[item.category, item.status, item.is_audition_song ? "audition" : null]
                      .filter(Boolean).join(" · ")}
                  </Text>
                </View>
              </Link>
              <Pressable onPress={() => del.mutate(item.id)}>
                <Text style={{ color: "#FF3B30" }}>Delete</Text>
              </Pressable>
            </View>
          )}
        />
      )}
      <Pressable style={styles.fab} onPress={() => router.push("/(app)/songs/new")}>
        <Text style={styles.fabPlus}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: "#eee" },
  chipActive: { backgroundColor: "#007AFF" },
  chipText: { color: "#333", fontSize: 14 },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  card: {
    flexDirection: "row", alignItems: "center", padding: 16,
    backgroundColor: "#fff", borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: "#ddd",
  },
  title: { fontSize: 17, fontWeight: "500" },
  meta: { fontSize: 13, color: "#666", marginTop: 2 },
  fab: { position: "absolute", right: 20, bottom: 32, width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#007AFF", alignItems: "center", justifyContent: "center" },
  fabPlus: { color: "#fff", fontSize: 32, lineHeight: 32 },
});
```

- [ ] **Step 2: Add a link on Home**

Modify `app/(app)/index.tsx` to include at the top (above the FlatList or as a Header):
```tsx
<Link href="/(app)/songs" style={{ padding: 16, fontSize: 16, color: "#007AFF" }}>
  Songs →
</Link>
```

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/songs/index.tsx" "app/(app)/index.tsx"
git commit -m "feat(songs): list with filter chips and home link"
```

---

## Task 5: Songs add modal

**Files:**
- Create: `app/(app)/songs/new.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useCreateSong } from "@/services/songService";
import { SongCategory } from "@/lib/types";

export default function NewSong() {
  const router = useRouter();
  const create = useCreateSong();
  const [title, setTitle] = useState("");
  const [isAudition, setIsAudition] = useState(false);
  const [category, setCategory] = useState<Exclude<SongCategory, null> | null>(null);

  async function onSave() {
    const t = title.trim();
    if (!t) return;
    try {
      await create.mutateAsync({ title: t, is_audition_song: isAudition, category });
      router.back();
    } catch (e: any) { Alert.alert("Couldn't save", e?.message ?? String(e)); }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Title</Text>
      <TextInput value={title} onChangeText={setTitle} autoFocus style={styles.input}
                 returnKeyType="done" onSubmitEditing={onSave} />
      <View style={styles.row}>
        <Text style={styles.label}>Audition song</Text>
        <Switch value={isAudition} onValueChange={setIsAudition} />
      </View>
      <Text style={styles.label}>Category</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["vocal", "guitar"] as const).map((c) => (
          <Pressable key={c} onPress={() => setCategory(category === c ? null : c)}
            style={[styles.chip, category === c && styles.chipActive]}>
            <Text style={[styles.chipText, category === c && { color: "#fff" }]}>{c}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.footer}>
        <Pressable style={styles.cancel} onPress={() => router.back()}><Text>Cancel</Text></Pressable>
        <Pressable style={styles.save} onPress={onSave}>
          <Text style={styles.saveText}>{create.isPending ? "Saving…" : "Save"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  label: { fontSize: 14, color: "#666" },
  input: { fontSize: 18, padding: 12, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: "#ccc" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: "#eee" },
  chipActive: { backgroundColor: "#007AFF" },
  chipText: { color: "#333" },
  footer: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 24 },
  cancel: { padding: 12 },
  save: { padding: 12, paddingHorizontal: 20, backgroundColor: "#007AFF", borderRadius: 8 },
  saveText: { color: "#fff", fontWeight: "600" },
});
```

- [ ] **Step 2: Register as a modal**

In `app/(app)/_layout.tsx`, add to the Stack:
```tsx
<Stack.Screen name="songs/index" options={{ title: "Songs" }} />
<Stack.Screen name="songs/new" options={{ presentation: "modal", title: "New Song" }} />
<Stack.Screen name="songs/[songId]" options={{ title: "" }} />
```

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/songs/new.tsx" "app/(app)/_layout.tsx"
git commit -m "feat(songs): add-new modal with audition/category options"
```

---

## Task 6: Song detail with parts, tracks, and sheet music

**Files:**
- Create: `app/(app)/songs/[songId].tsx`

Combines patterns from musical-number-detail (debounced autosave for notes, harmonies → song_parts, sheet music, media sections) with song-specific track kinds.

- [ ] **Step 1: Implement**

```tsx
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { useSong, useUpdateSong } from "@/services/songService";
import { useSongParts, useCreateSongPart, useDeleteSongPart } from "@/services/songPartService";
import { useSongTracks, useCreateSongTrack, useDeleteSongTrack } from "@/services/songTrackService";
import { useSongSheetMusic, useCreateSongSheetMusic, useDeleteSongSheetMusic } from "@/services/songSheetMusicService";
import { uploadMedia } from "@/services/mediaService";
import { AudioRecorder } from "@/../components/AudioRecorder";
import { AudioPlayer } from "@/../components/AudioPlayer";
import { VideoPlayer } from "@/../components/VideoPlayer";
import { PdfViewer } from "@/../components/PdfViewer";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";

export default function SongDetail() {
  const { songId } = useLocalSearchParams<{ songId: string }>();
  const { data: song, isLoading } = useSong(songId);
  const updateSong = useUpdateSong();

  const { data: parts } = useSongParts(songId);
  const createPart = useCreateSongPart();
  const deletePart = useDeleteSongPart();

  const { data: tracks } = useSongTracks(songId);
  const createTrack = useCreateSongTrack();
  const deleteTrack = useDeleteSongTrack();

  const { data: sheets } = useSongSheetMusic(songId);
  const createSheet = useCreateSongSheetMusic();
  const deleteSheet = useDeleteSongSheetMusic();

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"in-progress" | "completed">("in-progress");
  const [audition, setAudition] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [recOpen, setRecOpen] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [pdfViewer, setPdfViewer] = useState<string | null>(null);

  useEffect(() => {
    if (song && !hydrated) {
      setTitle(song.title); setNotes(song.notes);
      setStatus(song.status); setAudition(song.is_audition_song);
      setHydrated(true);
    }
  }, [song, hydrated]);

  useDebouncedSave({ title, notes, status, audition }, 800, (p) => {
    if (!song) return;
    if (p.title === song.title && p.notes === song.notes &&
        p.status === song.status && p.audition === song.is_audition_song) return;
    updateSong.mutate({ id: song.id, patch: {
      title: p.title, notes: p.notes, status: p.status, is_audition_song: p.audition,
    }});
  }, hydrated);

  async function recordPart(uri: string) {
    setRecOpen(false);
    try {
      const storage_path = await uploadMedia(uri, "song-parts", "m4a");
      await createPart.mutateAsync({ song_id: songId, storage_path });
    } catch (e: any) { Alert.alert("Upload failed", e?.message ?? String(e)); }
  }

  async function pickTrackFile(kind: "audio" | "video", useCamera = false) {
    if (kind === "audio") {
      const res = await DocumentPicker.getDocumentAsync({ type: "audio/*", copyToCacheDirectory: true });
      if (res.canceled) return;
      const a = res.assets[0];
      const ext = (a.name?.split(".").pop() || "m4a").toLowerCase();
      try {
        const storage_path = await uploadMedia(a.uri, "song-tracks", ext);
        await createTrack.mutateAsync({ song_id: songId, kind: "audio", storage_path, title: a.name ?? "" });
      } catch (e: any) { Alert.alert("Upload failed", e?.message ?? String(e)); }
    } else {
      const perm = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const result = await (useCamera
        ? ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos })
        : ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos }));
      if (result.canceled) return;
      const a = result.assets[0];
      const ext = (a.uri.split(".").pop() || "mp4").toLowerCase();
      try {
        const storage_path = await uploadMedia(a.uri, "song-tracks", ext);
        await createTrack.mutateAsync({ song_id: songId, kind: "video", storage_path, title: "" });
      } catch (e: any) { Alert.alert("Upload failed", e?.message ?? String(e)); }
    }
  }

  async function addSheet() {
    const res = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
    if (res.canceled) return;
    const a = res.assets[0];
    try {
      const storage_path = await uploadMedia(a.uri, "song-sheet-music", "pdf");
      await createSheet.mutateAsync({ song_id: songId, title: a.name ?? "Sheet music", storage_path });
    } catch (e: any) { Alert.alert("Upload failed", e?.message ?? String(e)); }
  }

  if (isLoading && !song) return <View style={styles.center}><ActivityIndicator /></View>;
  if (!song) return <View style={styles.center}><Text>Not found.</Text></View>;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: title || "Song" }} />
      <Text style={styles.label}>Title</Text>
      <TextInput value={title} onChangeText={setTitle} style={styles.input} />
      <View style={styles.row}>
        <Text style={styles.label}>Audition song</Text>
        <Switch value={audition} onValueChange={setAudition} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Completed</Text>
        <Switch value={status === "completed"} onValueChange={(v) => setStatus(v ? "completed" : "in-progress")} />
      </View>
      <Text style={styles.label}>Notes</Text>
      <TextInput value={notes} onChangeText={setNotes} multiline style={[styles.input, styles.notes]} />

      <Section title="Parts">
        <Pressable style={styles.addBtn} onPress={() => setRecOpen(true)}>
          <Text style={styles.addBtnText}>+ Record</Text>
        </Pressable>
        {(parts ?? []).map((p) => (
          <View key={p.id} style={styles.row2}>
            <AudioPlayer storagePath={p.storage_path} />
            <Pressable onPress={() => deletePart.mutate(p)}><Text style={{ color: "#FF3B30" }}>Delete</Text></Pressable>
          </View>
        ))}
      </Section>

      <Section title="Tracks">
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Pressable style={styles.addBtn} onPress={() => pickTrackFile("audio")}><Text style={styles.addBtnText}>+ Audio</Text></Pressable>
          <Pressable style={styles.addBtn} onPress={() => pickTrackFile("video", false)}><Text style={styles.addBtnText}>+ Video</Text></Pressable>
          <Pressable style={styles.addBtn} onPress={() => setUrlOpen(true)}><Text style={styles.addBtnText}>+ Link</Text></Pressable>
        </View>
        {(tracks ?? []).map((t) => (
          <View key={t.id} style={styles.row2}>
            {t.kind === "audio" && t.storage_path && <AudioPlayer storagePath={t.storage_path} />}
            {t.kind === "video" && t.storage_path && <VideoPlayer storagePath={t.storage_path} />}
            {t.kind === "link" && t.external_url && (
              <Pressable onPress={() => Linking.openURL(t.external_url!)}>
                <Text style={{ color: "#007AFF" }}>↗ {t.title || t.external_url}</Text>
              </Pressable>
            )}
            <Pressable onPress={() => deleteTrack.mutate(t)}><Text style={{ color: "#FF3B30" }}>Delete</Text></Pressable>
          </View>
        ))}
      </Section>

      <Section title="Sheet Music">
        <Pressable style={styles.addBtn} onPress={addSheet}><Text style={styles.addBtnText}>+ PDF</Text></Pressable>
        {(sheets ?? []).map((s) => (
          <View key={s.id} style={styles.row2}>
            <Pressable onPress={() => setPdfViewer(s.storage_path)}>
              <Text style={{ color: "#007AFF", fontSize: 16 }}>📄 {s.title}</Text>
            </Pressable>
            <Pressable onPress={() => deleteSheet.mutate(s)}><Text style={{ color: "#FF3B30" }}>Delete</Text></Pressable>
          </View>
        ))}
      </Section>

      <Modal visible={recOpen} animationType="slide" presentationStyle="pageSheet">
        <AudioRecorder onFinish={recordPart} onCancel={() => setRecOpen(false)} />
      </Modal>
      <Modal visible={urlOpen} animationType="slide" presentationStyle="pageSheet"
             onRequestClose={() => setUrlOpen(false)}>
        <AddUrlSheet
          onCancel={() => setUrlOpen(false)}
          onSave={async ({ title: t, url }) => {
            setUrlOpen(false);
            await createTrack.mutateAsync({ song_id: songId, kind: "link", external_url: url, title: t });
          }}
        />
      </Modal>
      <Modal visible={!!pdfViewer} animationType="slide" presentationStyle="fullScreen"
             onRequestClose={() => setPdfViewer(null)}>
        <Pressable onPress={() => setPdfViewer(null)} style={{ padding: 16, backgroundColor: "#fff" }}>
          <Text style={{ color: "#007AFF", fontSize: 16 }}>Done</Text>
        </Pressable>
        {pdfViewer && <PdfViewer storagePath={pdfViewer} />}
      </Modal>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 16, gap: 8 }}>
      <Text style={{ fontSize: 20, fontWeight: "600" }}>{title}</Text>
      {children}
    </View>
  );
}

function AddUrlSheet({ onCancel, onSave }:
  { onCancel: () => void; onSave: (v: { title: string; url: string }) => void }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  return (
    <View style={{ flex: 1, padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 14, color: "#666" }}>Title</Text>
      <TextInput value={title} onChangeText={setTitle}
        style={{ fontSize: 16, padding: 12, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: "#ccc" }} />
      <Text style={{ fontSize: 14, color: "#666" }}>URL</Text>
      <TextInput value={url} onChangeText={setUrl} autoCapitalize="none" keyboardType="url"
        style={{ fontSize: 16, padding: 12, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: "#ccc" }} />
      <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
        <Pressable onPress={onCancel} style={{ padding: 12 }}><Text>Cancel</Text></Pressable>
        <Pressable onPress={() => { if (url.trim()) onSave({ title: title.trim(), url: url.trim() }); }}
          style={{ padding: 12, backgroundColor: "#007AFF", borderRadius: 8, paddingHorizontal: 20 }}>
          <Text style={{ color: "#fff", fontWeight: "600" }}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 14, color: "#666" },
  input: { fontSize: 16, padding: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: "#ccc", borderRadius: 8, backgroundColor: "#fff" },
  notes: { minHeight: 120, textAlignVertical: "top" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  row2: { padding: 8, backgroundColor: "#fff", borderRadius: 10, gap: 4,
          borderWidth: StyleSheet.hairlineWidth, borderColor: "#ddd" },
  addBtn: { padding: 10, backgroundColor: "#007AFF", borderRadius: 8, alignSelf: "flex-start" },
  addBtnText: { color: "#fff", fontWeight: "600" },
});
```

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/songs/[songId].tsx"
git commit -m "feat(songs): detail with parts, tracks, sheet music, and autosave"
```

---

## Task 7: Acceptance pass

- [ ] **Step 1:** `npm test` passes.
- [ ] **Step 2:** Create audition + guitar song; filter by "Audition" and "Guitar" both show it.
- [ ] **Step 3:** Open song; record a part; add audio track, video track, link track; add a PDF; all render and play/open correctly.
- [ ] **Step 4:** Toggle completed — the row disappears from "In progress" and appears in "Completed."
- [ ] **Step 5:** Delete song → row gone; associated parts, tracks, sheets cascade-deleted (Postgres FK on_delete=cascade handles rows, but Storage objects don't cascade. Known limitation: song deletion leaves Storage orphans. Acceptable for V1; Phase N7 introduces cascade-with-storage-cleanup for shows and we'll extend it to songs then.)
- [ ] **Step 6:** Tag.

```bash
git tag phase-n6-complete
```

---

## Self-Review

- **Spec coverage:** songs CRUD with filters ✓, song parts ✓, song tracks (audio + video + link) ✓, song sheet music ✓, notes + status + audition toggle ✓.
- **Placeholder scan:** Task 3 describes three services "mirror earlier patterns" — acceptable given the strict template established in N4/N5. If implementation diverges, tests follow.
- **Known gap:** deleting a song leaves Storage orphans. Flagged above. Addressed in N7 pattern (which we'll extend to song cascades).

---

## Next plan

After `phase-n6-complete`, write `YYYY-MM-DD-phase-n7-completed-shows-archive.md`.
