import { Link, Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useShow } from "@/services/showService";

export default function ShowHub() {
  const { showId } = useLocalSearchParams<{ showId: string }>();
  const { data: show, isLoading } = useShow(showId);

  if (isLoading && !show) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!show) {
    return (
      <View style={styles.center}>
        <Text>Show not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: show.name }} />
      <Text style={styles.title}>{show.name}</Text>

      <Link href={`/shows/${show.id}/musical-numbers`} style={styles.tile}>
        <Text style={styles.tileText}>Musical Numbers</Text>
      </Link>

      <Link href={`/shows/${show.id}/scenes`} style={styles.tile}>
        <Text style={styles.tileText}>Scenes</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 32, fontWeight: "700", marginBottom: 16 },
  tile: {
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
  },
  tileText: { fontSize: 18, fontWeight: "500" },
});
