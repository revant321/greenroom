import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useScene, useUpdateScene } from "@/services/sceneService";
import { useShow } from "@/services/showService";
import { ArchivedBanner } from "@/components/ArchivedBanner";
import {
  useCreateSceneRecording,
  useDeleteSceneRecording,
  useSceneRecordings,
} from "@/services/sceneRecordingService";
import { uploadMedia } from "@/services/mediaService";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { AudioPlayer } from "@/components/AudioPlayer";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Sheet } from "@/components/Sheet";
import { AnimatedToggle } from "@/components/AnimatedToggle";
import { InlineAction } from "@/components/GradientButton";
import { SectionLabel } from "@/components/ScreenTitle";
import { RiseIn } from "@/components/RiseIn";
import { Icon } from "@/components/Icon";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";
import { useTheme } from "@/theme/useTheme";
import {
  ColorTokens,
  FAB_CLEARANCE,
  fonts,
  radius,
  spacing,
} from "@/theme/tokens";

export default function SceneDetail() {
  const { showId, sceneId } = useLocalSearchParams<{
    showId: string;
    sceneId: string;
  }>();
  const { data, isLoading } = useScene(sceneId);
  const { data: show } = useShow(showId);
  const readOnly = show?.is_completed === true;
  const update = useUpdateScene();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

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
      if (!data || readOnly) return;
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
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }
  if (!data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.text }}>Not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[
        styles.container,
        { paddingBottom: FAB_CLEARANCE + spacing.lg },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: "" }} />
      {readOnly && showId && <ArchivedBanner showId={showId} />}
      <RiseIn index={0}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Scene name"
          placeholderTextColor={colors.textMuted}
          style={styles.titleInput}
          editable={!readOnly}
        />
        {!readOnly && (
          <Text style={styles.saved}>
            {update.isPending
              ? "Saving…"
              : update.isError
                ? "Offline — will retry when you edit."
                : "Saved"}
          </Text>
        )}
      </RiseIn>

      <RiseIn index={1}>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>I'm in this scene</Text>
            <AnimatedToggle
              value={inScene}
              onValueChange={setInScene}
              disabled={readOnly}
            />
          </View>
        </View>
      </RiseIn>

      <RiseIn index={2}>
        <SectionLabel>Notes</SectionLabel>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Blocking, cues, costume change…"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.notes]}
          editable={!readOnly}
        />
      </RiseIn>

      <RiseIn index={3}>
        <SectionLabel
          action={
            !readOnly ? (
              <InlineAction
                label={uploading ? "Uploading…" : "Record"}
                onPress={() => setRecOpen(true)}
                disabled={uploading}
              >
                <Icon sf="mic.fill" ion="mic" size={12} color={colors.accent} />
              </InlineAction>
            ) : undefined
          }
        >
          Recordings
        </SectionLabel>
        {!readOnly && (
          <View style={styles.btnRow}>
            <InlineAction label="Pick video" onPress={() => handlePickVideo(false)} disabled={uploading}>
              <Icon sf="plus" ion="add" size={12} color={colors.accent} />
            </InlineAction>
            <InlineAction label="Record video" onPress={() => handlePickVideo(true)} disabled={uploading}>
              <Icon sf="video.fill" ion="videocam" size={12} color={colors.accent} />
            </InlineAction>
          </View>
        )}
        {(recordings ?? []).length === 0 && (
          <Text style={styles.empty}>
            {readOnly
              ? "No recordings were saved."
              : "Record audio or add a video for this scene."}
          </Text>
        )}
        <View style={{ gap: spacing.sm }}>
          {(recordings ?? []).map((r) => (
            <View key={r.id} style={styles.mediaCard}>
              {r.kind === "audio" ? (
                <AudioPlayer storagePath={r.storage_path} />
              ) : (
                <VideoPlayer storagePath={r.storage_path} />
              )}
              {!readOnly && (
                <Pressable
                  onPress={() => deleteRec.mutate(r)}
                  style={{ alignSelf: "flex-end", padding: 4 }}
                >
                  <Text style={{ color: colors.danger, fontSize: 13 }}>Delete</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      </RiseIn>

      <Sheet open={recOpen} onClose={() => setRecOpen(false)}>
        {recOpen && (
          <VoiceRecorder
            onFinish={handleRecordedAudio}
            onCancel={() => setRecOpen(false)}
          />
        )}
      </Sheet>
    </ScrollView>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    container: { padding: spacing.lg, gap: spacing.xs },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    titleInput: {
      fontSize: 26,
      fontFamily: fonts.extrabold,
      fontWeight: "800",
      letterSpacing: -0.4,
      color: c.text,
      padding: 0,
    },
    saved: {
      fontSize: 12,
      fontFamily: fonts.regular,
      color: c.textMuted,
      marginTop: 4,
      marginBottom: spacing.md,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.lg,
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 13,
    },
    toggleLabel: { fontSize: 16, fontFamily: fonts.regular, color: c.text },
    input: {
      fontSize: 16,
      fontFamily: fonts.regular,
      padding: spacing.lg - 2,
      borderRadius: radius.lg,
      backgroundColor: c.card,
      color: c.text,
    },
    notes: { minHeight: 120, textAlignVertical: "top" },
    btnRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap", marginBottom: spacing.sm },
    empty: {
      fontSize: 14,
      fontFamily: fonts.regular,
      color: c.textMuted,
      padding: spacing.sm,
    },
    mediaCard: {
      padding: spacing.md,
      backgroundColor: c.card,
      borderRadius: radius.lg,
      gap: 6,
    },
  });
}
