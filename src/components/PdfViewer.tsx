import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { useMedia } from "@/services/mediaService";

type Props = { storagePath: string };

export function PdfViewer({ storagePath }: Props) {
  const { data: uri, isLoading, error } = useMedia(storagePath);

  if (isLoading && !uri) return <ActivityIndicator />;
  if (error || !uri)
    return <Text style={{ color: "#FF3B30" }}>Couldn't open PDF.</Text>;

  return (
    <View style={styles.container}>
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
  container: { flex: 1, backgroundColor: "#eee" },
  webview: { flex: 1 },
});
