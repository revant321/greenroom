import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useMedia } from "@/services/mediaService";
import { useTheme } from "@/theme/useTheme";
import { radius } from "@/theme/tokens";

type Props = { storagePath: string };

export function VideoPlayer({ storagePath }: Props) {
  const { colors } = useTheme();
  const { data: uri, isLoading, error } = useMedia(storagePath);
  const player = useVideoPlayer(uri ?? null, (p) => {
    p.loop = false;
  });

  if (isLoading && !uri) return <ActivityIndicator color={colors.text} />;
  if (error)
    return <Text style={{ color: colors.danger }}>Couldn't load video.</Text>;

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
    borderRadius: radius.md,
    overflow: "hidden",
  },
  video: { flex: 1 },
});
