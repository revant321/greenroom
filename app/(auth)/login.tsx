import { useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { Gradient } from "@/components/Gradient";
import {
  signInWithApple,
  signInWithEmail,
  signInWithGoogle,
} from "@/services/authService";
import { useTheme } from "@/theme/useTheme";
import { ColorTokens, fonts, radius, spacing, type } from "@/theme/tokens";

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const { colors, scheme } = useTheme();
  const styles = makeStyles(colors);
  const [busy, setBusy] = useState<"apple" | "google" | "email" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const passwordInput = useRef<TextInput>(null);
  const canSubmitEmail = busy === null && email.trim().length > 0 && password.length > 0;

  const [, , promptGoogle] = Google.useIdTokenAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  async function onApple() {
    if (busy !== null) return;

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
    if (!canSubmitEmail) return;

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
    if (busy !== null) return;

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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.keyboardView}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>greenroom</Text>
          <Text style={styles.subtitle}>Sign in to sync your shows.</Text>

          <View style={styles.socialButtons}>
            {Platform.OS === "ios" && (
              <View
                pointerEvents={busy === null ? "auto" : "none"}
                style={busy !== null && styles.disabled}
              >
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={
                    scheme === "dark"
                      ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                      : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                  }
                  cornerRadius={radius.md}
                  style={styles.appleButton}
                  onPress={onApple}
                />
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy !== null, busy: busy === "google" }}
              disabled={busy !== null}
              onPress={onGoogle}
              style={({ pressed }) => [
                styles.googleButton,
                busy !== null && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.googleButtonText}>
                {busy === "google" ? "Signing in…" : "Continue with Google"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or use email</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.emailForm}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              accessibilityLabel="Email"
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="next"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={() => passwordInput.current?.focus()}
            />

            <Text style={[styles.label, styles.passwordLabel]}>Password</Text>
            <TextInput
              ref={passwordInput}
              style={styles.input}
              accessibilityLabel="Password"
              placeholder="Your password"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoComplete="current-password"
              autoCorrect={false}
              returnKeyType="go"
              secureTextEntry
              textContentType="password"
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={onEmail}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmitEmail, busy: busy === "email" }}
              disabled={!canSubmitEmail}
              onPress={onEmail}
              style={({ pressed }) => [
                styles.emailButton,
                !canSubmitEmail && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Gradient style={styles.emailButtonFill}>
                <Text style={styles.emailButtonText}>
                  {busy === "email" ? "Signing in…" : "Sign in with email"}
                </Text>
              </Gradient>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    keyboardView: {
      flex: 1,
      backgroundColor: c.bg,
    },
    container: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.xl,
      backgroundColor: c.bg,
    },
    content: {
      width: "100%",
      maxWidth: 360,
      alignItems: "center",
    },
    title: { ...type.title, color: c.text, marginBottom: 4 },
    subtitle: {
      ...type.body,
      color: c.textMuted,
      marginBottom: spacing.xxl,
      textAlign: "center",
    },
    socialButtons: {
      width: "100%",
      gap: spacing.md,
    },
    appleButton: { width: "100%", height: 50 },
    googleButton: {
      width: "100%",
      height: 50,
      borderRadius: radius.md,
      backgroundColor: c.bgElevated,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    googleButtonText: { ...type.bodyStrong, color: c.text },
    divider: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginVertical: spacing.xl,
    },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
    },
    dividerText: {
      ...type.caption,
      color: c.textMuted,
      textAlign: "center",
    },
    emailForm: { width: "100%" },
    label: {
      ...type.label,
      color: c.text,
      marginBottom: spacing.sm,
    },
    passwordLabel: { marginTop: spacing.lg },
    input: {
      height: 50,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: spacing.md,
      backgroundColor: c.card,
      fontSize: 15,
      fontFamily: fonts.regular,
      color: c.text,
    },
    emailButton: {
      width: "100%",
      borderRadius: radius.lg,
      marginTop: spacing.xl,
      overflow: "hidden",
    },
    emailButtonFill: {
      height: 50,
      alignItems: "center",
      justifyContent: "center",
    },
    emailButtonText: {
      ...type.bodyStrong,
      color: "#FFFFFF",
    },
    pressed: { transform: [{ scale: 0.98 }] },
    disabled: { opacity: 0.5 },
  });
}
