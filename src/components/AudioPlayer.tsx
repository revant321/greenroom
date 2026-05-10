import { useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useMedia } from "@/services/mediaService";

type Props = { storagePath: string };

export function AudioPlayer({ storagePath }: Props) {
  const { data: uri, isLoading, error } = useMedia(storagePath);
  const player = useAudioPlayer(uri ? { uri } : null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (status.didJustFinish) {
      player.seekTo(0);
      player.pause();
    }
  }, [status.didJustFinish, player]);

  if (isLoading && !uri) return <ActivityIndicator />;
  if (error) return <Text style={{ color: "#FF3B30" }}>Couldn't load audio.</Text>;

  const playing = status.playing;
  const ready = status.isLoaded;

  return (
    <Pressable
      onPress={() => (playing ? player.pause() : player.play())}
      disabled={!ready}
      style={styles.row}
      accessibilityLabel={playing ? "Pause" : "Play"}
    >
      <Text style={[styles.play, !ready && { color: "#bbb" }]}>{playing ? "⏸" : "▶︎"}</Text>
      <View style={styles.bar} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 8 },
  play: { fontSize: 24 },
  bar: { flex: 1, height: 4, backgroundColor: "#ddd", borderRadius: 2 },
});
