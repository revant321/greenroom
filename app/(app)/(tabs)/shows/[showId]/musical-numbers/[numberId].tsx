import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Linking from "expo-linking";
import {
  useMusicalNumber,
  useUpdateMusicalNumber,
} from "@/services/musicalNumberService";
import { useShow } from "@/services/showService";
import { ArchivedBanner } from "@/components/ArchivedBanner";
import {
  useCreateHarmony,
  useDeleteHarmony,
  useHarmonies,
  useUpdateHarmony,
} from "@/services/harmonyService";
import {
  useCreateDanceVideo,
  useDanceVideos,
  useDeleteDanceVideo,
} from "@/services/danceVideoService";
import {
  useCreateSheetMusic,
  useDeleteSheetMusic,
  useSheetMusic,
} from "@/services/sheetMusicService";
import { uploadMedia } from "@/services/mediaService";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { AudioPlayer } from "@/components/AudioPlayer";
import { VideoPlayer } from "@/components/VideoPlayer";
import { PdfViewer } from "@/components/PdfViewer";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { InlineAction } from "@/components/GradientButton";
import { SectionLabel } from "@/components/ScreenTitle";
import { RiseIn } from "@/components/RiseIn";
import { AddUrlForm } from "@/components/AddUrlForm";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";
import { Harmony } from "@/lib/types";
import { useTheme } from "@/theme/useTheme";
import {
  ColorTokens,
  FAB_CLEARANCE,
  fonts,
  radius,
  spacing,
} from "@/theme/tokens";

export default function MusicalNumberDetail() {
  const { showId, numberId } = useLocalSearchParams<{
    showId: string;
    numberId: string;
  }>();
  const { data, isLoading } = useMusicalNumber(numberId);
  const { data: show } = useShow(showId);
  const readOnly = show?.is_completed === true;
  const update = useUpdateMusicalNumber();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const { data: harmonies } = useHarmonies(numberId);
  const createHarmony = useCreateHarmony();

  const { data: videos } = useDanceVideos(numberId);
  const createVideo = useCreateDanceVideo();
  const deleteVideo = useDeleteDanceVideo();

  const { data: pdfs } = useSheetMusic(numberId);
  const createPdf = useCreateSheetMusic();
  const deletePdf = useDeleteSheetMusic();

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [pdfViewerPath, setPdfViewerPath] = useState<string | null>(null);

  useEffect(() => {
    if (data && !hydrated) {
      setName(data.name);
      setNotes(data.notes);
      setHydrated(true);
    }
  }, [data, hydrated]);

  useDebouncedSave(
    { name, notes },
    800,
    ({ name, notes }) => {
      if (!data || readOnly) return;
      if (name === data.name && notes === data.notes) return;
      update.mutate({ id: data.id, patch: { name, notes } });
    },
    hydrated,
  );

  async function onRecordingFinished(uri: string) {
    setRecorderOpen(false);
    if (!data) return;
    try {
      setUploading(true);
      const storagePath = await uploadMedia(uri, "harmonies", "m4a");
      await createHarmony.mutateAsync({
        musical_number_id: data.id,
        storage_path: storagePath,
      });
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? String(e));
    } finally {
      setUploading(false);
    }
  }

  async function addVideoFile(useCamera: boolean) {
    if (!data) return;
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
      const storage_path = await uploadMedia(asset.uri, "dance-videos", ext);
      await createVideo.mutateAsync({
        musical_number_id: data.id,
        title: "",
        storage_path,
      });
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? String(e));
    } finally {
      setUploading(false);
    }
  }

  async function addPdf() {
    if (!data) return;
    const res = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    const asset = res.assets[0];
    try {
      setUploading(true);
      const storage_path = await uploadMedia(asset.uri, "sheet-music", "pdf");
      await createPdf.mutateAsync({
        musical_number_id: data.id,
        title: asset.name ?? "Sheet music",
        storage_path,
      });
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
          placeholder="Number title"
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
        <SectionLabel>Notes</SectionLabel>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Tempo, cues, reminders…"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.notes]}
          editable={!readOnly}
        />
      </RiseIn>

      <RiseIn index={2}>
        <SectionLabel
          action={
            !readOnly ? (
              <InlineAction
                label={uploading ? "Uploading…" : "Record"}
                onPress={() => setRecorderOpen(true)}
                disabled={uploading}
              >
                <Icon sf="mic.fill" ion="mic" size={12} color={colors.accent} />
              </InlineAction>
            ) : undefined
          }
        >
          Harmonies
        </SectionLabel>
        {(harmonies ?? []).length === 0 && (
          <Text style={styles.empty}>
            {readOnly
              ? "No harmonies were saved."
              : "Tap Record to save your first harmony."}
          </Text>
        )}
        <View style={{ gap: spacing.sm }}>
          {(harmonies ?? []).map((h) => (
            <HarmonyRow key={h.id} item={h} colors={colors} readOnly={readOnly} />
          ))}
        </View>
      </RiseIn>

      <RiseIn index={3}>
        <SectionLabel>Dance videos</SectionLabel>
        {!readOnly && (
          <View style={styles.btnRow}>
            <InlineAction label="Pick video" onPress={() => addVideoFile(false)} disabled={uploading}>
              <Icon sf="plus" ion="add" size={12} color={colors.accent} />
            </InlineAction>
            <InlineAction label="Record video" onPress={() => addVideoFile(true)} disabled={uploading}>
              <Icon sf="video.fill" ion="videocam" size={12} color={colors.accent} />
            </InlineAction>
            <InlineAction label="Link" onPress={() => setUrlModalOpen(true)} disabled={uploading}>
              <Icon sf="plus" ion="add" size={12} color={colors.accent} />
            </InlineAction>
          </View>
        )}
        {(videos ?? []).length === 0 && (
          <Text style={styles.empty}>
            {readOnly
              ? "No dance videos were saved."
              : "Add a video or link to remember choreography."}
          </Text>
        )}
        <View style={{ gap: spacing.sm }}>
          {(videos ?? []).map((v) => (
            <View key={v.id} style={styles.mediaCard}>
              {v.storage_path ? (
                <VideoPlayer storagePath={v.storage_path} />
              ) : (
                <Pressable
                  onPress={() => v.external_url && Linking.openURL(v.external_url)}
                  style={styles.urlLine}
                >
                  <Icon sf="arrow.up.right.square" ion="open-outline" size={18} color={colors.accent} />
                  <Text style={styles.urlText} numberOfLines={1}>
                    {v.title || v.external_url || "Untitled"}
                  </Text>
                </Pressable>
              )}
              {!readOnly && (
                <Pressable
                  onPress={() => deleteVideo.mutate(v)}
                  style={{ alignSelf: "flex-end", padding: 4 }}
                >
                  <Text style={{ color: colors.danger, fontSize: 13 }}>Delete</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      </RiseIn>

      <RiseIn index={4}>
        <SectionLabel
          action={
            !readOnly ? (
              <InlineAction label="PDF" onPress={addPdf} disabled={uploading}>
                <Icon sf="plus" ion="add" size={12} color={colors.accent} />
              </InlineAction>
            ) : undefined
          }
        >
          Sheet music
        </SectionLabel>
        {(pdfs ?? []).length === 0 && (
          <Text style={styles.empty}>
            {readOnly
              ? "No sheet music was saved."
              : "Add a PDF to keep your sheet music here."}
          </Text>
        )}
        <View style={{ gap: spacing.sm }}>
          {(pdfs ?? []).map((p) => (
            <View key={p.id} style={styles.mediaCard}>
              <Pressable
                onPress={() => setPdfViewerPath(p.storage_path)}
                style={styles.urlLine}
              >
                <View style={[styles.pdfBadge, { backgroundColor: "rgba(255,92,122,0.12)" }]}>
                  <Icon sf="doc.fill" ion="document" size={16} color="#FF5C7A" />
                </View>
                <Text style={styles.pdfLink} numberOfLines={1}>
                  {p.title || "Sheet music"}
                </Text>
              </Pressable>
              {!readOnly && (
                <Pressable
                  onPress={() => deletePdf.mutate(p)}
                  style={{ alignSelf: "flex-end", padding: 4 }}
                >
                  <Text style={{ color: colors.danger, fontSize: 13 }}>Delete</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      </RiseIn>

      <Sheet open={recorderOpen} onClose={() => setRecorderOpen(false)}>
        {recorderOpen && (
          <VoiceRecorder
            onFinish={onRecordingFinished}
            onCancel={() => setRecorderOpen(false)}
          />
        )}
      </Sheet>

      <Sheet open={urlModalOpen} onClose={() => setUrlModalOpen(false)} title="Add Link">
        <AddUrlForm
          onCancel={() => setUrlModalOpen(false)}
          onSave={async ({ title, url }) => {
            setUrlModalOpen(false);
            if (!data) return;
            try {
              await createVideo.mutateAsync({
                musical_number_id: data.id,
                title,
                external_url: url,
              });
            } catch (e: any) {
              Alert.alert("Couldn't save", e?.message ?? String(e));
            }
          }}
        />
      </Sheet>

      <Modal
        visible={!!pdfViewerPath}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setPdfViewerPath(null)}
      >
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <Pressable
            onPress={() => setPdfViewerPath(null)}
            style={[styles.pdfDoneBar, { backgroundColor: colors.bgElevated }]}
          >
            <Text style={{ color: colors.accent, fontSize: 16, fontFamily: fonts.semibold }}>
              Done
            </Text>
          </Pressable>
          {pdfViewerPath && <PdfViewer storagePath={pdfViewerPath} />}
        </View>
      </Modal>
    </ScrollView>
  );
}

function HarmonyRow({
  item,
  colors,
  readOnly,
}: {
  item: Harmony;
  colors: ColorTokens;
  readOnly: boolean;
}) {
  const update = useUpdateHarmony();
  const del = useDeleteHarmony();
  const styles = makeStyles(colors);
  const [measure, setMeasure] = useState<string>(
    item.measure_number?.toString() ?? "",
  );
  const [caption, setCaption] = useState(item.caption);

  useDebouncedSave({ measure, caption }, 800, ({ measure, caption }) => {
    if (readOnly) return;
    const trimmed = measure.trim();
    const mNum = trimmed === "" ? null : Number(trimmed);
    if (mNum !== null && Number.isNaN(mNum)) return;
    if (mNum === item.measure_number && caption === item.caption) return;
    update.mutate({ id: item.id, patch: { measure_number: mNum, caption } });
  });

  return (
    <View style={styles.mediaCard}>
      <AudioPlayer storagePath={item.storage_path} />
      <View style={styles.harmonyFields}>
        <TextInput
          value={measure}
          onChangeText={setMeasure}
          placeholder="Measure #"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          style={[styles.smallInput, { width: 100 }]}
          editable={!readOnly}
        />
        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="Caption"
          placeholderTextColor={colors.textMuted}
          style={[styles.smallInput, { flex: 1 }]}
          editable={!readOnly}
        />
      </View>
      {!readOnly && (
        <Pressable
          onPress={() => del.mutate(item)}
          style={{ alignSelf: "flex-end", padding: 4 }}
        >
          <Text style={{ color: colors.danger, fontSize: 13 }}>Delete</Text>
        </Pressable>
      )}
    </View>
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
    harmonyFields: { flexDirection: "row", gap: spacing.sm },
    smallInput: {
      padding: spacing.sm + 1,
      fontSize: 14,
      fontFamily: fonts.regular,
      borderRadius: radius.sm + 2,
      backgroundColor: c.accentSoft,
      color: c.text,
    },
    urlLine: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.xs },
    urlText: { color: c.accent, fontSize: 15, fontFamily: fonts.medium, flex: 1 },
    pdfBadge: {
      width: 34,
      height: 34,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
    },
    pdfLink: { color: c.text, fontSize: 15, fontFamily: fonts.medium, flex: 1 },
    pdfDoneBar: { padding: spacing.lg },
  });
}
