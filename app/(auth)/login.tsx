import { useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { signInWithApple, signInWithGoogle } from "@/services/authService";

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const [busy, setBusy] = useState<"apple" | "google" | null>(null);

  const [, , promptGoogle] = Google.useIdTokenAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  async function onApple() {
    try {
      setBusy("apple");
      await signInWithApple();
    } catch (e: any) {
      if (e?.code !== "ERR_REQUEST_CANCELED") {
        Alert.alert("Sign in failed", e?.message ?? String(e));
      }
    } finally {
      setBusy(null);
    }
  }

  async function onGoogle() {
    try {
      setBusy("google");
      const result = await promptGoogle();
      if (result?.type !== "success") return;
      const idToken = (result.params as any).id_token;
      if (!idToken) throw new Error("Google did not return an ID token.");
      await signInWithGoogle(idToken);
    } catch (e: any) {
      Alert.alert("Sign in failed", e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>greenroom</Text>
      <Text style={styles.subtitle}>Sign in to sync your shows.</Text>

      {Platform.OS === "ios" && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={10}
          style={styles.appleButton}
          onPress={onApple}
        />
      )}

      <Pressable
        accessibilityRole="button"
        disabled={busy !== null}
        onPress={onGoogle}
        style={({ pressed }) => [styles.googleButton, pressed && { opacity: 0.8 }]}
      >
        <Text style={styles.googleButtonText}>
          {busy === "google" ? "Signing in…" : "Continue with Google"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  title: { fontSize: 36, fontWeight: "700", marginBottom: 4 },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 24, textAlign: "center" },
  appleButton: { width: 260, height: 48 },
  googleButton: {
    width: 260, height: 48, borderRadius: 10, backgroundColor: "#fff",
    borderWidth: 1, borderColor: "#ddd", alignItems: "center", justifyContent: "center",
  },
  googleButtonText: { fontSize: 16, fontWeight: "600", color: "#111" },
});
