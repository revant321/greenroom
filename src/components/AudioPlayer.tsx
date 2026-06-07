import { useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useMedia } from "@/services/mediaService";
import { useTheme } from "@/theme/useTheme";
import { Icon } from "@/components/Icon";

type Props = { storagePath: string };

export function AudioPlayer({ storagePath }: Props) {
  const { colors } = useTheme();
  const { data: uri, isLoading, error } = useMedia(storagePath);
  const player = useAudioPlayer(uri ? { uri } : null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (status.didJustFinish) {
      player.seekTo(0);
      player.pause();
    }
  }, [status.didJustFinish, player]);

  if (isLoading && !uri) return <ActivityIndicator color={colors.text} />;
  if (error)
    return <Text style={{ color: colors.danger }}>Couldn't load audio.</Text>;

  const playing = status.playing;
  const ready = status.isLoaded;

  return (
    <Pressable
      onPress={() => (playing ? player.pause() : player.play())}
      disabled={!ready}
      style={styles.row}
      accessibilityLabel={playing ? "Pause" : "Play"}
    >
      <Icon
        sf={playing ? "pause.fill" : "play.fill"}
        ion={playing ? "pause" : "play"}
        size={24}
        color={ready ? colors.accent : colors.textMuted}
      />
      <View style={[styles.bar, { backgroundColor: colors.border }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 8 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
});
