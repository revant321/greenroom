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
import * as ImagePicker from "expo-image-picker";
import { useScene, useUpdateScene } from "@/services/sceneService";
import {
  useCreateSceneRecording,
  useDeleteSceneRecording,
  useSceneRecordings,
} from "@/services/sceneRecordingService";
import { uploadMedia } from "@/services/mediaService";
import { AudioRecorder } from "@/components/AudioRecorder";
import { AudioPlayer } from "@/components/AudioPlayer";
import { VideoPlayer } from "@/components/VideoPlayer";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";

export default function SceneDetail() {
  const { sceneId } = useLocalSearchParams<{ sceneId: string }>();
  const { data, isLoading } = useScene(sceneId);
  const update = useUpdateScene();

  const { data: recordings } = useSceneRecordings(sceneId);
  const createRec = useCreateSceneRecording();
  const deleteRec = useDeleteSceneRecording();

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [inScene, setInScene] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [recOpen, setRecOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (data && !hydrated) {
      setName(data.name);
      setNotes(data.notes);
      setInScene(data.is_user_in_scene);
      setHydrated(true);
    }
  }, [data, hydrated]);

  useDebouncedSave(
    { name, notes, is_user_in_scene: inScene },
    800,
    (patch) => {
      if (!data) return;
      if (
        patch.name === data.name &&
        patch.notes === data.notes &&
        patch.is_user_in_scene === data.is_user_in_scene
      ) {
        return;
      }
      update.mutate({ id: data.id, patch });
    },
    hydrated,
  );

  async function handleRecordedAudio(uri: string) {
    setRecOpen(false);
    if (!sceneId) return;
    try {
      setUploading(true);
      const storage_path = await uploadMedia(uri, "scene-recordings", "m4a");
      await createRec.mutateAsync({ scene_id: sceneId, kind: "audio", storage_path });
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? String(e));
    } finally {
      setUploading(false);
    }
  }

  async function handlePickVideo(useCamera: boolean) {
    if (!sceneId) return;
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
      const storage_path = await uploadMedia(asset.uri, "scene-recordings", ext);
      await createRec.mutateAsync({ scene_id: sceneId, kind: "video", storage_path });
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? String(e));
    } finally {
      setUploading(false);
    }
  }

  if (isLoading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!data) {
    return (
      <View style={styles.center}>
        <Text>Not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: name || "Scene" }} />
      <Text style={styles.label}>Name</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} />
      <View style={styles.row}>
        <Text style={styles.label}>I'm in this scene</Text>
        <Switch value={inScene} onValueChange={setInScene} />
      </View>
      <Text style={styles.label}>Notes</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholder="Blocking, cues, costume change…"
        style={[styles.input, styles.notes]}
      />
      <Text style={styles.saved}>
        {update.isPending
          ? "Saving…"
          : update.isError
            ? "Offline — will retry when you edit."
            : "Saved"}
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recordings</Text>
        <View style={styles.btnRow}>
          <Pressable
            style={styles.addBtn}
            onPress={() => setRecOpen(true)}
            disabled={uploading}
          >
            <Text style={styles.addBtnText}>Record audio</Text>
          </Pressable>
          <Pressable
            style={styles.addBtn}
            onPress={() => handlePickVideo(false)}
            disabled={uploading}
          >
            <Text style={styles.addBtnText}>Pick video</Text>
          </Pressable>
          <Pressable
            style={styles.addBtn}
            onPress={() => handlePickVideo(true)}
            disabled={uploading}
          >
            <Text style={styles.addBtnText}>Record video</Text>
          </Pressable>
        </View>
        {uploading && <Text style={styles.status}>Uploading…</Text>}
        {(recordings ?? []).length === 0 && (
          <Text style={styles.empty}>No recordings yet.</Text>
        )}
        {(recordings ?? []).map((r) => (
          <View key={r.id} style={styles.recRow}>
            {r.kind === "audio" ? (
              <AudioPlayer storagePath={r.storage_path} />
            ) : (
              <VideoPlayer storagePath={r.storage_path} />
            )}
            <Pressable
              onPress={() => deleteRec.mutate(r)}
              style={{ alignSelf: "flex-end" }}
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
          onFinish={handleRecordedAudio}
          onCancel={() => setRecOpen(false)}
        />
      </Modal>
    </ScrollView>
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
    padding: 8,
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
  },
  addBtnText: { color: "#fff", fontWeight: "600" },
  status: { color: "#666" },
  empty: { color: "#999", padding: 8 },
  recRow: {
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    gap: 6,
  },
});
