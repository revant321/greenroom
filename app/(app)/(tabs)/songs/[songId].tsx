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
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { AudioPlayer } from "@/components/AudioPlayer";
import { VideoPlayer } from "@/components/VideoPlayer";
import { PdfViewer } from "@/components/PdfViewer";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { AddUrlForm } from "@/components/AddUrlForm";
import { AnimatedToggle } from "@/components/AnimatedToggle";
import { GradientButton, InlineAction } from "@/components/GradientButton";
import { SectionLabel } from "@/components/ScreenTitle";
import { RiseIn } from "@/components/RiseIn";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";
import { useTheme } from "@/theme/useTheme";
import {
  ColorTokens,
  FAB_CLEARANCE,
  fonts,
  radius,
  spacing,
} from "@/theme/tokens";

export default function SongDetail() {
  const { songId } = useLocalSearchParams<{ songId: string }>();
  const { data: song, isLoading } = useSong(songId);
  const updateSong = useUpdateSong();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

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
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }
  if (!song) {
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
      <RiseIn index={0}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Song title"
          placeholderTextColor={colors.textMuted}
          style={styles.titleInput}
        />
        <Text style={styles.saved}>
          {updateSong.isPending
            ? "Saving…"
            : updateSong.isError
              ? "Offline — will retry when you edit."
              : "Saved"}
        </Text>
      </RiseIn>

      <RiseIn index={1}>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Audition song</Text>
            <AnimatedToggle value={audition} onValueChange={setAudition} />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Completed</Text>
            <AnimatedToggle
              value={status === "completed"}
              onValueChange={(v) => setStatus(v ? "completed" : "in-progress")}
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
          placeholder="Practice notes, tempo, lyrics tips…"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.notes]}
        />
      </RiseIn>

      <RiseIn index={3}>
        <SectionLabel
          action={
            <InlineAction
              label={uploading ? "Uploading…" : "Record"}
              onPress={() => setRecOpen(true)}
              disabled={uploading}
            >
              <Icon sf="mic.fill" ion="mic" size={12} color={colors.accent} />
            </InlineAction>
          }
        >
          Parts
        </SectionLabel>
        {(parts ?? []).length === 0 && (
          <Text style={styles.empty}>Record a part to practice it later.</Text>
        )}
        <View style={{ gap: spacing.sm }}>
          {(parts ?? []).map((p) => (
            <View key={p.id} style={styles.mediaCard}>
              <AudioPlayer storagePath={p.storage_path} />
              <Pressable onPress={() => deletePart.mutate(p)} style={styles.deleteBtn}>
                <Text style={{ color: colors.danger, fontSize: 13 }}>Delete</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </RiseIn>

      <RiseIn index={4}>
        <SectionLabel>Tracks</SectionLabel>
        <View style={styles.btnRow}>
          <InlineAction label="Audio" onPress={pickAudioTrack} disabled={uploading}>
            <Icon sf="plus" ion="add" size={12} color={colors.accent} />
          </InlineAction>
          <InlineAction label="Video" onPress={() => pickVideoTrack(false)} disabled={uploading}>
            <Icon sf="plus" ion="add" size={12} color={colors.accent} />
          </InlineAction>
          <InlineAction label="Link" onPress={() => setUrlOpen(true)} disabled={uploading}>
            <Icon sf="plus" ion="add" size={12} color={colors.accent} />
          </InlineAction>
        </View>
        {(tracks ?? []).length === 0 && (
          <Text style={styles.empty}>Add audio, video, or a rehearsal link.</Text>
        )}
        <View style={{ gap: spacing.sm }}>
          {(tracks ?? []).map((t) => (
            <View key={t.id} style={styles.mediaCard}>
              {t.kind === "audio" && t.storage_path && (
                <AudioPlayer storagePath={t.storage_path} label={t.title || undefined} />
              )}
              {t.kind === "video" && t.storage_path && (
                <VideoPlayer storagePath={t.storage_path} />
              )}
              {t.kind === "link" && t.external_url && (
                <Pressable
                  onPress={() => t.external_url && Linking.openURL(t.external_url)}
                  style={styles.urlLine}
                >
                  <Icon sf="arrow.up.right.square" ion="open-outline" size={18} color={colors.accent} />
                  <Text style={styles.urlText} numberOfLines={1}>
                    {t.title || t.external_url}
                  </Text>
                </Pressable>
              )}
              <Pressable onPress={() => deleteTrack.mutate(t)} style={styles.deleteBtn}>
                <Text style={{ color: colors.danger, fontSize: 13 }}>Delete</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </RiseIn>

      <RiseIn index={5}>
        <SectionLabel
          action={
            <InlineAction label="PDF" onPress={addSheet} disabled={uploading}>
              <Icon sf="plus" ion="add" size={12} color={colors.accent} />
            </InlineAction>
          }
        >
          Sheet music
        </SectionLabel>
        {(sheets ?? []).length === 0 && (
          <Text style={styles.empty}>Add a PDF to keep your sheet music here.</Text>
        )}
        <View style={{ gap: spacing.sm }}>
          {(sheets ?? []).map((s) => (
            <View key={s.id} style={styles.mediaCard}>
              <Pressable
                onPress={() => setPdfViewerPath(s.storage_path)}
                style={styles.urlLine}
              >
                <View style={[styles.pdfBadge, { backgroundColor: "rgba(255,92,122,0.12)" }]}>
                  <Icon sf="doc.fill" ion="document" size={16} color="#FF5C7A" />
                </View>
                <Text style={styles.pdfLink} numberOfLines={1}>
                  {s.title || "Sheet music"}
                </Text>
              </Pressable>
              <Pressable onPress={() => deleteSheet.mutate(s)} style={styles.deleteBtn}>
                <Text style={{ color: colors.danger, fontSize: 13 }}>Delete</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </RiseIn>

      <Sheet open={recOpen} onClose={() => setRecOpen(false)}>
        {recOpen && (
          <VoiceRecorder onFinish={recordPart} onCancel={() => setRecOpen(false)} />
        )}
      </Sheet>

      <Sheet open={urlOpen} onClose={() => setUrlOpen(false)} title="Add Link">
        <AddUrlForm
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
    divider: { height: StyleSheet.hairlineWidth },
    input: {
      fontSize: 16,
      fontFamily: fonts.regular,
      padding: spacing.lg - 2,
      borderRadius: radius.lg,
      backgroundColor: c.card,
      color: c.text,
    },
    sheetInput: {
      fontSize: 16,
      fontFamily: fonts.regular,
      padding: spacing.lg - 2,
      borderRadius: radius.lg,
      backgroundColor: c.accentSoft,
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
    deleteBtn: { alignSelf: "flex-end", padding: 4 },
    pdfDoneBar: { padding: spacing.lg },
  });
}
