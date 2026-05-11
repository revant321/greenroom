import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useMedia } from "@/services/mediaService";

type Props = { storagePath: string };

export function VideoPlayer({ storagePath }: Props) {
  const { data: uri, isLoading, error } = useMedia(storagePath);
  const player = useVideoPlayer(uri ?? null, (p) => {
    p.loop = false;
  });

  if (isLoading && !uri) return <ActivityIndicator />;
  if (error)
    return <Text style={{ color: "#FF3B30" }}>Couldn't load video.</Text>;

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
        nativeControls
        allowsFullscreen
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    aspectRatio: 16 / 9,
    backgroundColor: "#000",
    borderRadius: 8,
    overflow: "hidden",
  },
  video: { flex: 1 },
});
