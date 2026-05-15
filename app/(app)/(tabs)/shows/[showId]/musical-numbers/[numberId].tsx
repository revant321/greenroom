import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { AudioRecorder } from "@/components/AudioRecorder";
import { AudioPlayer } from "@/components/AudioPlayer";
import { VideoPlayer } from "@/components/VideoPlayer";
import { PdfViewer } from "@/components/PdfViewer";
import { Icon } from "@/components/Icon";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";
import { Harmony } from "@/lib/types";
import { useTheme } from "@/theme/useTheme";
import {
  ColorTokens,
  FAB_CLEARANCE,
  radius,
  spacing,
  type,
} from "@/theme/tokens";

export default function MusicalNumberDetail() {
  const { numberId } = useLocalSearchParams<{ numberId: string }>();
  const { data, isLoading } = useMusicalNumber(numberId);
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
      if (!data) return;
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
      <Stack.Screen options={{ title: name || "Musical Number" }} />
      <Text style={styles.label}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        style={styles.input}
        placeholderTextColor={colors.textMuted}
      />
      <Text style={styles.label}>Notes</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholder="Tempo, cues, reminders…"
        placeholderTextColor={colors.textMuted}
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
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Harmonies</Text>
          <Pressable
            onPress={() => setRecorderOpen(true)}
            style={styles.addBtn}
            disabled={uploading}
          >
            <Text style={styles.addBtnText}>
              {uploading ? "Uploading…" : "+ Record"}
            </Text>
          </Pressable>
        </View>

        <FlatList
          data={harmonies ?? []}
          keyExtractor={(h) => h.id}
          scrollEnabled={false}
          ListEmptyComponent={
            <Text style={styles.empty}>No harmonies yet. Tap + Record.</Text>
          }
          renderItem={({ item }) => <HarmonyRow item={item} colors={colors} />}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dance Videos</Text>
        <View style={styles.btnRow}>
          <Pressable
            style={styles.addBtn}
            onPress={() => addVideoFile(false)}
            disabled={uploading}
          >
            <Text style={styles.addBtnText}>Pick video</Text>
          </Pressable>
          <Pressable
            style={styles.addBtn}
            onPress={() => addVideoFile(true)}
            disabled={uploading}
          >
            <Text style={styles.addBtnText}>Record video</Text>
          </Pressable>
          <Pressable
            style={styles.addBtn}
            onPress={() => setUrlModalOpen(true)}
            disabled={uploading}
          >
            <Text style={styles.addBtnText}>Add URL</Text>
          </Pressable>
        </View>
        {(videos ?? []).length === 0 && (
          <Text style={styles.empty}>No dance videos yet.</Text>
        )}
        {(videos ?? []).map((v) => (
          <View key={v.id} style={styles.mediaRow}>
            {v.storage_path ? (
              <VideoPlayer storagePath={v.storage_path} />
            ) : (
              <Pressable
                onPress={() => v.external_url && Linking.openURL(v.external_url)}
                style={styles.urlCard}
              >
                <View style={styles.urlLine}>
                  <Icon
                    sf="arrow.up.right.square"
                    ion="open-outline"
                    size={18}
                    color={colors.accent}
                  />
                  <Text style={styles.urlText}>
                    {v.title || v.external_url || "Untitled"}
                  </Text>
                </View>
              </Pressable>
            )}
            <Pressable
              onPress={() => deleteVideo.mutate(v)}
              style={styles.deleteBtn}
            >
              <Text style={{ color: colors.danger }}>Delete</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sheet Music</Text>
        <Pressable style={styles.addBtn} onPress={addPdf} disabled={uploading}>
          <Text style={styles.addBtnText}>Add PDF</Text>
        </Pressable>
        {(pdfs ?? []).length === 0 && (
          <Text style={styles.empty}>No sheet music yet.</Text>
        )}
        {(pdfs ?? []).map((p) => (
          <View key={p.id} style={styles.mediaRow}>
            <Pressable
              onPress={() => setPdfViewerPath(p.storage_path)}
              style={styles.urlLine}
            >
              <Icon
                sf="doc"
                ion="document-outline"
                size={18}
                color={colors.accent}
              />
              <Text style={styles.pdfLink}>{p.title || "Sheet music"}</Text>
            </Pressable>
            <Pressable
              onPress={() => deletePdf.mutate(p)}
              style={styles.deleteBtn}
            >
              <Text style={{ color: colors.danger }}>Delete</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <Modal
        visible={recorderOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setRecorderOpen(false)}
      >
        <AudioRecorder
          onFinish={onRecordingFinished}
          onCancel={() => setRecorderOpen(false)}
        />
      </Modal>

      <Modal
        visible={urlModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setUrlModalOpen(false)}
      >
        <AddUrlSheet
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
          colors={colors}
        />
      </Modal>

      <Modal
        visible={!!pdfViewerPath}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setPdfViewerPath(null)}
      >
        <View style={[styles.pdfModal, { backgroundColor: colors.bg }]}>
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

function HarmonyRow({
  item,
  colors,
}: {
  item: Harmony;
  colors: ColorTokens;
}) {
  const update = useUpdateHarmony();
  const del = useDeleteHarmony();
  const styles = makeStyles(colors);
  const [measure, setMeasure] = useState<string>(
    item.measure_number?.toString() ?? "",
  );
  const [caption, setCaption] = useState(item.caption);

  useDebouncedSave({ measure, caption }, 800, ({ measure, caption }) => {
    const trimmed = measure.trim();
    const mNum = trimmed === "" ? null : Number(trimmed);
    if (mNum !== null && Number.isNaN(mNum)) return;
    if (mNum === item.measure_number && caption === item.caption) return;
    update.mutate({ id: item.id, patch: { measure_number: mNum, caption } });
  });

  return (
    <View style={styles.harmonyRow}>
      <AudioPlayer storagePath={item.storage_path} />
      <View style={styles.harmonyFields}>
        <TextInput
          value={measure}
          onChangeText={setMeasure}
          placeholder="Measure #"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          style={[styles.smallInput, { width: 100 }]}
        />
        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="Caption"
          placeholderTextColor={colors.textMuted}
          style={[styles.smallInput, { flex: 1 }]}
        />
      </View>
      <Pressable onPress={() => del.mutate(item)} style={styles.deleteBtn}>
        <Text style={{ color: colors.danger }}>Delete</Text>
      </Pressable>
    </View>
  );
}

function AddUrlSheet({
  onCancel,
  onSave,
  colors,
}: {
  onCancel: () => void;
  onSave: (v: { title: string; url: string }) => void;
  colors: ColorTokens;
}) {
  const styles = makeStyles(colors);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  return (
    <View style={[styles.urlSheet, { backgroundColor: colors.bg }]}>
      <Text style={styles.label}>Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Choreography reference"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
      <Text style={styles.label}>URL</Text>
      <TextInput
        value={url}
        onChangeText={setUrl}
        placeholder="https://youtu.be/…"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="url"
        style={styles.input}
      />
      <View style={styles.urlSheetActions}>
        <Pressable onPress={onCancel} style={{ padding: spacing.md }}>
          <Text style={{ color: colors.text }}>Cancel</Text>
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

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    container: { padding: spacing.lg, gap: spacing.sm },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    label: { ...type.label, color: c.textMuted },
    input: {
      ...type.body,
      padding: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      borderRadius: radius.md,
      backgroundColor: c.card,
      color: c.text,
    },
    notes: { minHeight: 120, textAlignVertical: "top" },
    saved: { ...type.caption, color: c.textMuted, marginTop: 4 },
    section: { marginTop: spacing.xl, gap: spacing.sm },
    sectionHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    sectionTitle: { ...type.heading, color: c.text },
    btnRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
    addBtn: {
      padding: spacing.sm + 2,
      paddingHorizontal: spacing.md + 2,
      backgroundColor: c.accent,
      borderRadius: radius.md,
      alignSelf: "flex-start",
    },
    addBtnText: { color: "#fff", fontWeight: "600" },
    empty: { color: c.textMuted, padding: spacing.sm },
    harmonyRow: {
      padding: spacing.md,
      backgroundColor: c.card,
      borderRadius: radius.md,
      marginBottom: spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      gap: 6,
    },
    harmonyFields: { flexDirection: "row", gap: spacing.sm },
    smallInput: {
      padding: spacing.sm,
      fontSize: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      borderRadius: radius.sm,
      backgroundColor: c.card,
      color: c.text,
    },
    mediaRow: {
      padding: spacing.md,
      backgroundColor: c.card,
      borderRadius: radius.md,
      marginBottom: spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      gap: 6,
    },
    urlCard: { padding: spacing.md },
    urlLine: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    urlText: { color: c.accent, ...type.body },
    pdfLink: { color: c.accent, ...type.body },
    deleteBtn: { alignSelf: "flex-end" },
    pdfModal: { flex: 1 },
    pdfDoneBar: {
      padding: spacing.lg,
      backgroundColor: c.bgElevated,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    pdfDoneText: { color: c.accent, ...type.body },
    urlSheet: { flex: 1, padding: spacing.xl, gap: spacing.md },
    urlSheetActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    saveBtn: {
      padding: spacing.md,
      backgroundColor: c.accent,
      borderRadius: radius.md,
      paddingHorizontal: spacing.xl,
    },
    saveBtnText: { color: "#fff", fontWeight: "600" },
  });
}
