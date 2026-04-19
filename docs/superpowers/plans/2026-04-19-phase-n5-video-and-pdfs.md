# Phase N5: Video + PDFs (Scene Recordings, Dance Videos, Sheet Music) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reach feature parity with the web app for videos and sheet music. Scenes support audio + video recordings; musical numbers gain dance videos (file pick or external URL) and sheet music (PDF); the media layer gains a video player and a WebView-based PDF viewer.

**Architecture:** Reuses the media layer from N4 (`uploadMedia`, `useMedia`, `media_cache`). Video uses `expo-video`. PDFs render inside `react-native-webview` pointed at the local cached file. External dance video URLs open via `Linking`, no in-app player.

**Tech Stack (added):** `expo-image-picker`, `expo-document-picker`, `expo-video`, `react-native-webview`.

**Spec:** `docs/superpowers/specs/2026-04-19-react-native-expo-migration-design.md`
**Prior plans:** N1–N4 complete (`phase-n4-complete`).

---

## File Structure

```
src/
├── lib/types.ts                  # MODIFIED: add SceneRecording, DanceVideo, SheetMusic
└── services/
    ├── sceneRecordingService.ts  # NEW
    ├── danceVideoService.ts      # NEW
    └── sheetMusicService.ts      # NEW
components/
├── VideoPlayer.tsx               # NEW
└── PdfViewer.tsx                 # NEW
app/(app)/shows/[showId]/
├── scenes/[sceneId].tsx          # MODIFIED: recordings section
└── musical-numbers/[numberId].tsx # MODIFIED: dance videos + sheet music sections
__tests__/
├── sceneRecordingService.test.tsx
├── danceVideoService.test.tsx
└── sheetMusicService.test.tsx
```

---

## Task 1: Install video + picker + webview deps

- [ ] **Step 1: Install**

```bash
npx expo install expo-image-picker expo-document-picker expo-video react-native-webview
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install image-picker, document-picker, expo-video, webview"
```

---

## Task 2: Row types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Append**

```ts
export type SceneRecording = {
  id: string;
  user_id: string;
  scene_id: string;
  kind: "audio" | "video";
  storage_path: string;
  caption: string;
  created_at: string;
};
export type NewSceneRecording = Pick<SceneRecording, "scene_id" | "kind" | "storage_path"> &
  Partial<Pick<SceneRecording, "caption">>;

export type DanceVideo = {
  id: string;
  user_id: string;
  musical_number_id: string;
  title: string;
  storage_path: string | null;
  external_url: string | null;
  created_at: string;
};
export type NewDanceVideo = {
  musical_number_id: string;
  title: string;
} & (
  | { storage_path: string; external_url?: null }
  | { storage_path?: null; external_url: string }
);

export type SheetMusic = {
  id: string;
  user_id: string;
  musical_number_id: string;
  title: string;
  storage_path: string;
  created_at: string;
};
export type NewSheetMusic = Pick<SheetMusic, "musical_number_id" | "title" | "storage_path">;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): add video and PDF row types"
```

---

## Task 3: Service layer for each new entity (TDD)

**Files:**
- Create: `src/services/sceneRecordingService.ts`, `src/services/danceVideoService.ts`, `src/services/sheetMusicService.ts`
- Tests: corresponding `__tests__/*.test.tsx`

Each follows the `harmonyService` template from N4:
- `use<Entity>s(parentId)` — list query, ordered by created_at asc
- `useCreate<Entity>` — insert + invalidate list key
- `useDelete<Entity>` — `deleteMedia(row.storage_path)` if present, then row delete

Specifics:

**sceneRecordingService:**
- Parent: `scene_id`
- Table: `scene_recordings`
- `kind` field passed through; delete always calls `deleteMedia`.

**danceVideoService:**
- Parent: `musical_number_id`
- Table: `dance_videos`
- Delete calls `deleteMedia(row.storage_path)` only if `storage_path` is non-null (external URL rows have no blob to delete).
- Also include `useUpdateDanceVideo({ id, patch: { title } })` for renaming.

**sheetMusicService:**
- Parent: `musical_number_id`
- Table: `sheet_music`
- `useUpdateSheetMusic({ id, patch: { title } })` for renaming.

- [ ] **Step 1: Tests**

For each service: write 4–5 tests mirroring `harmonyService.test.tsx`:
1. list query hits correct table + `eq(parent_column, id)`
2. create inserts + invalidates
3. update patches by id (where applicable)
4. delete-with-storage calls `deleteMedia` then deletes row
5. (dance-video only) delete of external-URL row skips `deleteMedia`

Example for the external-URL skip:
```tsx
test("useDeleteDanceVideo skips deleteMedia when row is URL-only", async () => {
  const eq = jest.fn().mockResolvedValue({ error: null });
  const del = jest.fn().mockReturnValue({ eq });
  (supabase.from as jest.Mock).mockReturnValue({ delete: del });

  const { result } = renderHook(() => useDeleteDanceVideo(), { wrapper: wrap() });
  await act(async () => {
    await result.current.mutateAsync({
      id: "d1", user_id: "u", musical_number_id: "m1", title: "",
      storage_path: null, external_url: "https://youtu.be/x", created_at: "now",
    });
  });
  const { deleteMedia } = require("@/services/mediaService");
  expect(deleteMedia).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Implementations**

Structurally identical to `harmonyService`. The key difference in `useDeleteDanceVideo`:
```ts
export function useDeleteDanceVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: DanceVideo): Promise<void> => {
      if (row.storage_path) await deleteMedia(row.storage_path);
      const { error } = await supabase.from("dance_videos").delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: (_d, row) =>
      qc.invalidateQueries({ queryKey: ["dance-videos", "list", row.musical_number_id] }),
  });
}
```

- [ ] **Step 3: Commit per service**

```bash
git add src/services/sceneRecordingService.ts __tests__/sceneRecordingService.test.tsx
git commit -m "feat(scene-recordings): CRUD service"

git add src/services/danceVideoService.ts __tests__/danceVideoService.test.tsx
git commit -m "feat(dance-videos): CRUD service with conditional storage cleanup"

git add src/services/sheetMusicService.ts __tests__/sheetMusicService.test.tsx
git commit -m "feat(sheet-music): CRUD service"
```

---

## Task 4: `VideoPlayer` component

**Files:**
- Create: `components/VideoPlayer.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View, Text } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { useMedia } from "@/services/mediaService";

type Props = { storagePath: string };

export function VideoPlayer({ storagePath }: Props) {
  const { data: uri, isLoading, error } = useMedia(storagePath);
  const player = useVideoPlayer(uri ?? null, (p) => { p.loop = false; });

  useEffect(() => () => player.release?.(), [player]);

  if (isLoading && !uri) return <ActivityIndicator />;
  if (error) return <Text style={{ color: "#FF3B30" }}>Couldn't load video.</Text>;

  return (
    <View style={styles.container}>
      <VideoView player={player} style={styles.video} nativeControls allowsFullscreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { aspectRatio: 16 / 9, backgroundColor: "#000", borderRadius: 8, overflow: "hidden" },
  video: { flex: 1 },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/VideoPlayer.tsx
git commit -m "feat(media): VideoPlayer via expo-video + useMedia"
```

---

## Task 5: `PdfViewer` component

**Files:**
- Create: `components/PdfViewer.tsx`

- [ ] **Step 1: Implement**

```tsx
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { useMedia } from "@/services/mediaService";

type Props = { storagePath: string };

export function PdfViewer({ storagePath }: Props) {
  const { data: uri, isLoading, error } = useMedia(storagePath);

  if (isLoading && !uri) return <ActivityIndicator />;
  if (error || !uri) return <Text style={{ color: "#FF3B30" }}>Couldn't open PDF.</Text>;

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri }}
        style={styles.webview}
        originWhitelist={["*"]}
        allowFileAccess
        scalesPageToFit
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#eee" },
  webview: { flex: 1 },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/PdfViewer.tsx
git commit -m "feat(media): PdfViewer via react-native-webview"
```

---

## Task 6: Scene detail — recordings

**Files:**
- Modify: `app/(app)/shows/[showId]/scenes/[sceneId].tsx`

Add a recordings section: choose "Record audio" (reuses `AudioRecorder`), "Pick video from library" (via `expo-image-picker`), or "Record video" (system camera via `expo-image-picker`). Each lists recordings with kind-appropriate player + delete.

- [ ] **Step 1: Extend the existing scene detail screen**

Add (below the notes TextInput):

```tsx
import * as ImagePicker from "expo-image-picker";
import { Modal } from "react-native";
import { AudioRecorder } from "@/../components/AudioRecorder";
import { AudioPlayer } from "@/../components/AudioPlayer";
import { VideoPlayer } from "@/../components/VideoPlayer";
import { useSceneRecordings, useCreateSceneRecording, useDeleteSceneRecording } from "@/services/sceneRecordingService";
import { uploadMedia } from "@/services/mediaService";

// inside component:
const { data: recordings } = useSceneRecordings(sceneId);
const createRec = useCreateSceneRecording();
const deleteRec = useDeleteSceneRecording();
const [recOpen, setRecOpen] = useState(false);
const [uploading, setUploading] = useState(false);

async function handleRecordedAudio(uri: string) {
  setRecOpen(false);
  try {
    setUploading(true);
    const storage_path = await uploadMedia(uri, "scene-recordings", "m4a");
    await createRec.mutateAsync({ scene_id: sceneId, kind: "audio", storage_path });
  } catch (e: any) { Alert.alert("Upload failed", e?.message ?? String(e)); }
  finally { setUploading(false); }
}

async function handlePickVideo(useCamera: boolean) {
  const perm = useCamera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Permission needed", "Please allow access.");
    return;
  }
  const result = await (useCamera
    ? ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.8 })
    : ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.8 }));
  if (result.canceled) return;
  const asset = result.assets[0];
  const ext = (asset.uri.split(".").pop() || "mp4").toLowerCase();
  try {
    setUploading(true);
    const storage_path = await uploadMedia(asset.uri, "scene-recordings", ext);
    await createRec.mutateAsync({ scene_id: sceneId, kind: "video", storage_path });
  } catch (e: any) { Alert.alert("Upload failed", e?.message ?? String(e)); }
  finally { setUploading(false); }
}

// render (add under the existing form):
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Recordings</Text>
  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
    <Pressable style={styles.addBtn} onPress={() => setRecOpen(true)}>
      <Text style={styles.addBtnText}>Record audio</Text>
    </Pressable>
    <Pressable style={styles.addBtn} onPress={() => handlePickVideo(false)}>
      <Text style={styles.addBtnText}>Pick video</Text>
    </Pressable>
    <Pressable style={styles.addBtn} onPress={() => handlePickVideo(true)}>
      <Text style={styles.addBtnText}>Record video</Text>
    </Pressable>
  </View>
  {uploading && <Text style={{ color: "#666" }}>Uploading…</Text>}
  {(recordings ?? []).map((r) => (
    <View key={r.id} style={styles.recRow}>
      {r.kind === "audio" ? <AudioPlayer storagePath={r.storage_path} /> : <VideoPlayer storagePath={r.storage_path} />}
      <Pressable onPress={() => deleteRec.mutate(r)}><Text style={{ color: "#FF3B30" }}>Delete</Text></Pressable>
    </View>
  ))}
</View>

<Modal visible={recOpen} animationType="slide" presentationStyle="pageSheet">
  <AudioRecorder onFinish={handleRecordedAudio} onCancel={() => setRecOpen(false)} />
</Modal>
```

Add to styles:
```ts
section: { marginTop: 16, gap: 8 },
sectionTitle: { fontSize: 20, fontWeight: "600" },
addBtn: { padding: 10, backgroundColor: "#007AFF", borderRadius: 8 },
addBtnText: { color: "#fff", fontWeight: "600" },
recRow: { padding: 8, backgroundColor: "#fff", borderRadius: 10, marginBottom: 8, gap: 4 },
```

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/shows/[showId]/scenes/[sceneId].tsx"
git commit -m "feat(scenes): audio + video recordings on scene detail"
```

---

## Task 7: Musical Number detail — dance videos + sheet music

**Files:**
- Modify: `app/(app)/shows/[showId]/musical-numbers/[numberId].tsx`

Add two more sections below harmonies. Dance videos support file pick (from library or camera) OR external URL. Sheet music supports PDF pick only.

- [ ] **Step 1: Implement dance videos UI**

Below the harmonies section, add a "Dance Videos" section. Buttons: "Pick video," "Record video," "Add URL." The URL path shows a small input modal.

Key behaviors:
- Row render: if `storage_path` → `<VideoPlayer />`; if `external_url` → link card with `Linking.openURL`.
- External URL row has a "title" text input for the label.

- [ ] **Step 2: Implement sheet music UI**

Below dance videos, a "Sheet Music" section. Button: "Add PDF." Row render: title + a "View" button that pushes to a full-screen PDF modal.

Full code (replace the end of the file, under the existing harmonies section):

```tsx
import * as DocumentPicker from "expo-document-picker";
import * as Linking from "expo-linking";
import { useDanceVideos, useCreateDanceVideo, useDeleteDanceVideo } from "@/services/danceVideoService";
import { useSheetMusic, useCreateSheetMusic, useDeleteSheetMusic } from "@/services/sheetMusicService";
import { VideoPlayer } from "@/../components/VideoPlayer";
import { PdfViewer } from "@/../components/PdfViewer";

// inside component:
const { data: videos } = useDanceVideos(numberId);
const createVideo = useCreateDanceVideo();
const deleteVideo = useDeleteDanceVideo();

const { data: pdfs } = useSheetMusic(numberId);
const createPdf = useCreateSheetMusic();
const deletePdf = useDeleteSheetMusic();

const [urlModalOpen, setUrlModalOpen] = useState(false);
const [pdfViewer, setPdfViewer] = useState<string | null>(null);

async function addVideoFile(useCamera: boolean) {
  const perm = useCamera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return;
  const result = await (useCamera
    ? ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.8 })
    : ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.8 }));
  if (result.canceled) return;
  const asset = result.assets[0];
  const ext = (asset.uri.split(".").pop() || "mp4").toLowerCase();
  try {
    const storage_path = await uploadMedia(asset.uri, "dance-videos", ext);
    await createVideo.mutateAsync({ musical_number_id: numberId, title: "", storage_path });
  } catch (e: any) { Alert.alert("Upload failed", e?.message ?? String(e)); }
}

async function addPdf() {
  const res = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
  if (res.canceled) return;
  const asset = res.assets[0];
  try {
    const storage_path = await uploadMedia(asset.uri, "sheet-music", "pdf");
    await createPdf.mutateAsync({
      musical_number_id: numberId,
      title: asset.name ?? "Sheet music",
      storage_path,
    });
  } catch (e: any) { Alert.alert("Upload failed", e?.message ?? String(e)); }
}

// below the harmonies JSX, add:
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Dance Videos</Text>
  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
    <Pressable style={styles.addBtn} onPress={() => addVideoFile(false)}>
      <Text style={styles.addBtnText}>Pick video</Text>
    </Pressable>
    <Pressable style={styles.addBtn} onPress={() => addVideoFile(true)}>
      <Text style={styles.addBtnText}>Record video</Text>
    </Pressable>
    <Pressable style={styles.addBtn} onPress={() => setUrlModalOpen(true)}>
      <Text style={styles.addBtnText}>Add URL</Text>
    </Pressable>
  </View>
  {(videos ?? []).map((v) => (
    <View key={v.id} style={styles.recRow}>
      {v.storage_path
        ? <VideoPlayer storagePath={v.storage_path} />
        : (
          <Pressable onPress={() => v.external_url && Linking.openURL(v.external_url)}>
            <Text style={{ color: "#007AFF" }}>↗ {v.title || v.external_url}</Text>
          </Pressable>
        )
      }
      <Pressable onPress={() => deleteVideo.mutate(v)}><Text style={{ color: "#FF3B30" }}>Delete</Text></Pressable>
    </View>
  ))}
</View>

<View style={styles.section}>
  <Text style={styles.sectionTitle}>Sheet Music</Text>
  <Pressable style={styles.addBtn} onPress={addPdf}><Text style={styles.addBtnText}>Add PDF</Text></Pressable>
  {(pdfs ?? []).map((p) => (
    <View key={p.id} style={styles.recRow}>
      <Pressable onPress={() => setPdfViewer(p.storage_path)}>
        <Text style={{ color: "#007AFF", fontSize: 16 }}>📄 {p.title || "Sheet music"}</Text>
      </Pressable>
      <Pressable onPress={() => deletePdf.mutate(p)}><Text style={{ color: "#FF3B30" }}>Delete</Text></Pressable>
    </View>
  ))}
</View>

<Modal visible={urlModalOpen} animationType="slide" presentationStyle="pageSheet"
       onRequestClose={() => setUrlModalOpen(false)}>
  <AddUrlSheet
    onCancel={() => setUrlModalOpen(false)}
    onSave={async ({ title, url }) => {
      setUrlModalOpen(false);
      try {
        await createVideo.mutateAsync({ musical_number_id: numberId, title, external_url: url });
      } catch (e: any) { Alert.alert("Couldn't save", e?.message ?? String(e)); }
    }}
  />
</Modal>

<Modal visible={!!pdfViewer} animationType="slide" presentationStyle="fullScreen"
       onRequestClose={() => setPdfViewer(null)}>
  <View style={{ flex: 1 }}>
    <Pressable onPress={() => setPdfViewer(null)} style={{ padding: 16, backgroundColor: "#fff" }}>
      <Text style={{ color: "#007AFF", fontSize: 16 }}>Done</Text>
    </Pressable>
    {pdfViewer && <PdfViewer storagePath={pdfViewer} />}
  </View>
</Modal>
```

Add the `AddUrlSheet` inline component (below the main component in the same file):
```tsx
function AddUrlSheet({ onCancel, onSave }:
  { onCancel: () => void; onSave: (v: { title: string; url: string }) => void }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  return (
    <View style={{ flex: 1, padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 14, color: "#666" }}>Title</Text>
      <TextInput value={title} onChangeText={setTitle} placeholder="Choreography"
        style={{ fontSize: 16, padding: 12, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: "#ccc" }} />
      <Text style={{ fontSize: 14, color: "#666" }}>URL</Text>
      <TextInput value={url} onChangeText={setUrl} placeholder="https://youtu.be/…" autoCapitalize="none" keyboardType="url"
        style={{ fontSize: 16, padding: 12, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: "#ccc" }} />
      <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
        <Pressable onPress={onCancel} style={{ padding: 12 }}><Text>Cancel</Text></Pressable>
        <Pressable
          onPress={() => { if (url.trim()) onSave({ title: title.trim(), url: url.trim() }); }}
          style={{ padding: 12, backgroundColor: "#007AFF", borderRadius: 8, paddingHorizontal: 20 }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/shows/[showId]/musical-numbers/[numberId].tsx"
git commit -m "feat(musical-numbers): dance videos (file + URL) and sheet music sections"
```

---

## Task 8: Acceptance pass

- [ ] **Step 1:** `npm test` — all green.
- [ ] **Step 2:** Scene → record audio, record video (camera), pick video. All three list and play back.
- [ ] **Step 3:** Musical number → pick video from library, add URL, add PDF. Video plays inline; URL opens Safari/YouTube via `Linking`; PDF opens in WebView modal.
- [ ] **Step 4:** Kill app, airplane mode, reopen — previously viewed video and PDF still render from cache.
- [ ] **Step 5:** Delete each → confirm row + Storage object both disappear.
- [ ] **Step 6:** Tag.

```bash
git tag phase-n5-complete
```

---

## Self-Review

- **Spec coverage:** scene recordings (audio + video) ✓, dance videos (file + URL) ✓, sheet music PDFs (WebView) ✓, external URL via `Linking` ✓, storage cleanup on delete ✓.
- **Placeholder scan:** Task 3 delegates per-service test writing to "mirror harmonyService" — acceptable given the strict template; the additional external-URL-skip test is written out explicitly.
- **Known constraint:** `useVideoPlayer` API in `expo-video` may evolve; if the current Expo SDK at implementation exposes a different initializer, adjust `VideoPlayer.tsx` per its docs.

---

## Next plan

After `phase-n5-complete`, write `YYYY-MM-DD-phase-n6-standalone-songs.md`.
