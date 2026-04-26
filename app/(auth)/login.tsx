import { useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { signInWithApple, signInWithEmail, signInWithGoogle } from "@/services/authService";

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const [busy, setBusy] = useState<"apple" | "google" | "email" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

  async function onEmail() {
    try {
      setBusy("email");
      await signInWithEmail(email.trim(), password);
    } catch (e: any) {
      Alert.alert("Sign in failed", e?.message ?? String(e));
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

      {__DEV__ && (
        <View style={styles.devBlock}>
          <Text style={styles.devLabel}>Dev sign-in (email + password)</Text>
          <TextInput
            style={styles.input}
            placeholder="email"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="password"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Pressable
            accessibilityRole="button"
            disabled={busy !== null || !email || !password}
            onPress={onEmail}
            style={({ pressed }) => [
              styles.emailButton,
              (busy !== null || !email || !password) && { opacity: 0.5 },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.emailButtonText}>
              {busy === "email" ? "Signing in…" : "Sign in with email"}
            </Text>
          </Pressable>
        </View>
      )}
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
  devBlock: { width: 260, marginTop: 24, gap: 8 },
  devLabel: { fontSize: 12, color: "#888", textAlign: "center", marginBottom: 4 },
  input: {
    height: 44, borderRadius: 8, borderWidth: 1, borderColor: "#ddd",
    paddingHorizontal: 12, backgroundColor: "#fff", fontSize: 15,
  },
  emailButton: {
    height: 44, borderRadius: 8, backgroundColor: "#111",
    alignItems: "center", justifyContent: "center", marginTop: 4,
  },
  emailButtonText: { fontSize: 15, fontWeight: "600", color: "#fff" },
});
