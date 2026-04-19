import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { signOut } from "@/services/authService";
import { useAuth } from "@/hooks/useAuth";

export default function Settings() {
  const { session } = useAuth();

  async function onSignOut() {
    try {
      await signOut();
    } catch (e: any) {
      Alert.alert("Sign out failed", e?.message ?? String(e));
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Signed in as</Text>
      <Text style={styles.email}>{session?.user.email ?? "(unknown)"}</Text>

      <Pressable style={styles.signOut} onPress={onSignOut} accessibilityRole="button">
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  label: { fontSize: 14, color: "#666" },
  email: { fontSize: 18, fontWeight: "600", marginBottom: 24 },
  signOut: { padding: 14, borderRadius: 10, backgroundColor: "#FF3B30", alignItems: "center" },
  signOutText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
