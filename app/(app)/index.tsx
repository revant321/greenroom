import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { session } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>greenroom</Text>
      <Text style={styles.email}>Signed in as {session?.user.email ?? "(unknown)"}</Text>
      <Link href="/(app)/settings" style={styles.link} asChild>
        <Text>Settings</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 32, fontWeight: "700" },
  email: { fontSize: 16, color: "#666" },
  link: { fontSize: 16, color: "#007AFF", marginTop: 12 },
});
