import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { useSong, useUpdateSong } from "@/services/songService";
import {
  useCreateSongPart,
  useDeleteSongPart,
  useSongParts,
} from "@/services/songPartService";
import {
  useCreateSongTrack,
  useDeleteSongTrack,
  useSongTracks,
} from "@/services/songTrackService";
import {
  useCreateSongSheetMusic,
  useDeleteSongSheetMusic,
  useSongSheetMusic,
} from "@/services/songSheetMusicService";
import { uploadMedia } from "@/services/mediaService";
import { AudioRecorder } from "@/components/AudioRecorder";
import { AudioPlayer } from "@/components/AudioPlayer";
import { VideoPlayer } from "@/components/VideoPlayer";
import { PdfViewer } from "@/components/PdfViewer";
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
  const [pdfViewerPath, setPdfViewerPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (song && !hydrated) {
      setTitle(song.title);
      setNotes(song.notes);
      setStatus(song.status);
      setAudition(song.is_audition_song);
      setHydrated(true);
    }
  }, [song, hydrated]);

  useDebouncedSave(
    { title, notes, status, audition },
    800,
    (p) => {
      if (!song) return;
      if (
        p.title === song.title &&
        p.notes === song.notes &&
        p.status === song.status &&
        p.audition === song.is_audition_song
      ) {
        return;
      }
      updateSong.mutate({
        id: song.id,
        patch: {
          title: p.title,
          notes: p.notes,
          status: p.status,
          is_audition_song: p.audition,
        },
      });
    },
    hydrated,
  );

  async function recordPart(uri: string) {
    setRecOpen(false);
    if (!songId) return;
    try {
      setUploading(true);
      const storage_path = await uploadMedia(uri, "song-parts", "m4a");
      await createPart.mutateAsync({ song_id: songId, storage_path });
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? String(e));
    } finally {
      setUploading(false);
    }
  }

  async function pickAudioTrack() {
    if (!songId) return;
    const res = await DocumentPicker.getDocumentAsync({
      type: "audio/*",
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    const a = res.assets[0];
    const ext = (a.name?.split(".").pop() || "m4a").toLowerCase();
    try {
      setUploading(true);
      const storage_path = await uploadMedia(a.uri, "song-tracks", ext);
      await createTrack.mutateAsync({
        song_id: songId,
        kind: "audio",
        storage_path,
        title: a.name ?? "",
      });
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? String(e));
    } finally {
      setUploading(false);
    }
  }

  async function pickVideoTrack(useCamera: boolean) {
    if (!songId) return;
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permission needed",
        useCamera
          ? "Allow camera access in iOS Settings → greenroom."
          : "Allow photos access in iOS Settings → greenroom.",
      );
      return;
    }
    const result = await (useCamera
      ? ImagePicker.launchCameraAsync({ mediaTypes: ["videos"], quality: 0.8 })
      : ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], quality: 0.8 }));
    if (result.canceled) return;
    const asset = result.assets[0];
    const ext = (asset.uri.split(".").pop() || "mp4").toLowerCase();
    try {
      setUploading(true);
      const storage_path = await uploadMedia(asset.uri, "song-tracks", ext);
      await createTrack.mutateAsync({
        song_id: songId,
        kind: "video",
        storage_path,
        title: "",
      });
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? String(e));
    } finally {
      setUploading(false);
    }
  }

  async function addSheet() {
    if (!songId) return;
    const res = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    const a = res.assets[0];
    try {
      setUploading(true);
      const storage_path = await uploadMedia(a.uri, "song-sheet-music", "pdf");
      await createSheet.mutateAsync({
        song_id: songId,
        title: a.name ?? "Sheet music",
        storage_path,
      });
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? String(e));
    } finally {
      setUploading(false);
    }
  }

  if (isLoading && !song) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!song) {
    return (
      <View style={styles.center}>
        <Text>Not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: title || "Song" }} />
      <Text style={styles.label}>Title</Text>
      <TextInput value={title} onChangeText={setTitle} style={styles.input} />
      <View style={styles.row}>
        <Text style={styles.label}>Audition song</Text>
        <Switch value={audition} onValueChange={setAudition} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Completed</Text>
        <Switch
          value={status === "completed"}
          onValueChange={(v) => setStatus(v ? "completed" : "in-progress")}
        />
      </View>
      <Text style={styles.label}>Notes</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholder="Practice notes, tempo, lyrics tips…"
        style={[styles.input, styles.notes]}
      />
      <Text style={styles.saved}>
        {updateSong.isPending
          ? "Saving…"
          : updateSong.isError
            ? "Offline — will retry when you edit."
            : "Saved"}
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Parts</Text>
        <Pressable
          style={styles.addBtn}
          onPress={() => setRecOpen(true)}
          disabled={uploading}
        >
          <Text style={styles.addBtnText}>
            {uploading ? "Uploading…" : "+ Record"}
          </Text>
        </Pressable>
        {(parts ?? []).length === 0 && (
          <Text style={styles.empty}>No parts yet.</Text>
        )}
        {(parts ?? []).map((p) => (
          <View key={p.id} style={styles.mediaRow}>
            <AudioPlayer storagePath={p.storage_path} />
            <Pressable
              onPress={() => deletePart.mutate(p)}
              style={styles.deleteBtn}
            >
              <Text style={{ color: "#FF3B30" }}>Delete</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tracks</Text>
        <View style={styles.btnRow}>
          <Pressable
            style={styles.addBtn}
            onPress={pickAudioTrack}
            disabled={uploading}
          >
            <Text style={styles.addBtnText}>+ Audio</Text>
          </Pressable>
          <Pressable
            style={styles.addBtn}
            onPress={() => pickVideoTrack(false)}
            disabled={uploading}
          >
            <Text style={styles.addBtnText}>+ Video</Text>
          </Pressable>
          <Pressable
            style={styles.addBtn}
            onPress={() => setUrlOpen(true)}
            disabled={uploading}
          >
            <Text style={styles.addBtnText}>+ Link</Text>
          </Pressable>
        </View>
        {(tracks ?? []).length === 0 && (
          <Text style={styles.empty}>No tracks yet.</Text>
        )}
        {(tracks ?? []).map((t) => (
          <View key={t.id} style={styles.mediaRow}>
            {t.kind === "audio" && t.storage_path && (
              <AudioPlayer storagePath={t.storage_path} />
            )}
            {t.kind === "video" && t.storage_path && (
              <VideoPlayer storagePath={t.storage_path} />
            )}
            {t.kind === "link" && t.external_url && (
              <Pressable
                onPress={() => t.external_url && Linking.openURL(t.external_url)}
              >
                <Text style={styles.urlText}>↗ {t.title || t.external_url}</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => deleteTrack.mutate(t)}
              style={styles.deleteBtn}
            >
              <Text style={{ color: "#FF3B30" }}>Delete</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sheet Music</Text>
        <Pressable style={styles.addBtn} onPress={addSheet} disabled={uploading}>
          <Text style={styles.addBtnText}>+ PDF</Text>
        </Pressable>
        {(sheets ?? []).length === 0 && (
          <Text style={styles.empty}>No sheet music yet.</Text>
        )}
        {(sheets ?? []).map((s) => (
          <View key={s.id} style={styles.mediaRow}>
            <Pressable onPress={() => setPdfViewerPath(s.storage_path)}>
              <Text style={styles.pdfLink}>📄 {s.title || "Sheet music"}</Text>
            </Pressable>
            <Pressable
              onPress={() => deleteSheet.mutate(s)}
              style={styles.deleteBtn}
            >
              <Text style={{ color: "#FF3B30" }}>Delete</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <Modal
        visible={recOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setRecOpen(false)}
      >
        <AudioRecorder
          onFinish={recordPart}
          onCancel={() => setRecOpen(false)}
        />
      </Modal>

      <Modal
        visible={urlOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setUrlOpen(false)}
      >
        <AddUrlSheet
          onCancel={() => setUrlOpen(false)}
          onSave={async ({ title: t, url }) => {
            setUrlOpen(false);
            if (!songId) return;
            try {
              await createTrack.mutateAsync({
                song_id: songId,
                kind: "link",
                external_url: url,
                title: t,
              });
            } catch (e: any) {
              Alert.alert("Couldn't save", e?.message ?? String(e));
            }
          }}
        />
      </Modal>

      <Modal
        visible={!!pdfViewerPath}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setPdfViewerPath(null)}
      >
        <View style={styles.pdfModal}>
          <Pressable
            onPress={() => setPdfViewerPath(null)}
            style={styles.pdfDoneBar}
          >
            <Text style={styles.pdfDoneText}>Done</Text>
          </Pressable>
          {pdfViewerPath && <PdfViewer storagePath={pdfViewerPath} />}
        </View>
      </Modal>
    </ScrollView>
  );
}

function AddUrlSheet({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (v: { title: string; url: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  return (
    <View style={styles.urlSheet}>
      <Text style={styles.label}>Title</Text>
      <TextInput value={title} onChangeText={setTitle} style={styles.input} />
      <Text style={styles.label}>URL</Text>
      <TextInput
        value={url}
        onChangeText={setUrl}
        placeholder="https://youtu.be/…"
        autoCapitalize="none"
        keyboardType="url"
        style={styles.input}
      />
      <View style={styles.urlSheetActions}>
        <Pressable onPress={onCancel} style={{ padding: 12 }}>
          <Text>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            if (url.trim()) onSave({ title: title.trim(), url: url.trim() });
          }}
          style={styles.saveBtn}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 14, color: "#666" },
  input: {
    fontSize: 16,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  notes: { minHeight: 120, textAlignVertical: "top" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  saved: { fontSize: 12, color: "#999", marginTop: 4 },
  section: { marginTop: 24, gap: 8 },
  sectionTitle: { fontSize: 20, fontWeight: "600" },
  btnRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  addBtn: {
    padding: 10,
    paddingHorizontal: 14,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  addBtnText: { color: "#fff", fontWeight: "600" },
  empty: { color: "#999", padding: 8 },
  mediaRow: {
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    gap: 6,
  },
  urlText: { color: "#007AFF", fontSize: 16, padding: 8 },
  pdfLink: { color: "#007AFF", fontSize: 16, padding: 8 },
  deleteBtn: { alignSelf: "flex-end" },
  pdfModal: { flex: 1 },
  pdfDoneBar: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  pdfDoneText: { color: "#007AFF", fontSize: 16 },
  urlSheet: { flex: 1, padding: 24, gap: 12 },
  urlSheetActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 16,
  },
  saveBtn: {
    padding: 12,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingHorizontal: 20,
  },
  saveBtnText: { color: "#fff", fontWeight: "600" },
});
