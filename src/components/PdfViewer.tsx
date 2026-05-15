import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { useMedia } from "@/services/mediaService";
import { useTheme } from "@/theme/useTheme";

type Props = { storagePath: string };

export function PdfViewer({ storagePath }: Props) {
  const { colors } = useTheme();
  const { data: uri, isLoading, error } = useMedia(storagePath);

  if (isLoading && !uri) return <ActivityIndicator color={colors.text} />;
  if (error || !uri)
    return <Text style={{ color: colors.danger }}>Couldn't open PDF.</Text>;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgElevated }]}>
      <WebView
        source={{ uri }}
        style={styles.webview}
        originWhitelist={["*"]}
        allowFileAccess
        scalesPageToFit
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
});
