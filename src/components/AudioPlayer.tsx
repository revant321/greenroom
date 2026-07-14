import { useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useMedia } from "@/services/mediaService";
import { useTheme } from "@/theme/useTheme";
import { Gradient, gradientShadow } from "./Gradient";
import { Icon } from "./Icon";

type Props = { storagePath: string; label?: string };

/**
 * Prototype audio row: 38px circular play button that "pops" to the
 * signature gradient while playing, with a slim gradient progress bar.
 */
export function AudioPlayer({ storagePath, label }: Props) {
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
  const progress =
    status.duration && status.duration > 0
      ? Math.min(1, (status.currentTime ?? 0) / status.duration)
      : 0;

  return (
    <Pressable
      onPress={() => (playing ? player.pause() : player.play())}
      disabled={!ready}
      style={styles.row}
      accessibilityLabel={playing ? "Pause" : "Play"}
    >
      {playing ? (
        <View style={[gradientShadow.glowSm, { transform: [{ scale: 1.08 }] }]}>
          <Gradient style={styles.btn}>
            <Icon sf="pause.fill" ion="pause" size={16} color="#fff" />
          </Gradient>
        </View>
      ) : (
        <View style={[styles.btn, { backgroundColor: colors.accentSoft }]}>
          <Icon
            sf="play.fill"
            ion="play"
            size={16}
            color={ready ? colors.accent : colors.textMuted}
          />
        </View>
      )}
      <View style={styles.barArea}>
        {label ? (
          <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
            {label}
          </Text>
        ) : null}
        <View style={[styles.track, { backgroundColor: colors.border }]}>
          {playing || progress > 0 ? (
            <Gradient
              style={[styles.fill, { width: `${Math.max(progress * 100, 2)}%` }]}
            />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 4 },
  btn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  barArea: { flex: 1, gap: 7 },
  label: { fontSize: 15, fontWeight: "500" },
  track: { height: 3, borderRadius: 2, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2 },
});
