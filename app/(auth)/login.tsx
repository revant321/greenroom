import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { AuthOptions } from "@/components/AuthOptions";
import {
  signInAsGuest,
  signInWithApple,
  signInWithEmail,
  signInWithGoogle,
} from "@/services/authService";
import { useTheme } from "@/theme/useTheme";
import { ColorTokens, radius, spacing, type } from "@/theme/tokens";

export default function Login() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.keyboardView}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>greenroom</Text>
        <Text style={styles.subtitle}>Sign in to sync your shows.</Text>

        <AuthOptions
          onApple={signInWithApple}
          onGoogle={signInWithGoogle}
          onEmail={signInWithEmail}
          appleButtonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          googleLabel="Continue with Google"
          emailLabel="Sign in with email"
          busyLabel="Signing in…"
          errorTitle="Sign in failed"
          passwordAutoComplete="current-password"
          footer={({ busy, setBusy }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy !== null, busy: busy === "other" }}
              disabled={busy !== null}
              onPress={async () => {
                try {
                  setBusy("other");
                  await signInAsGuest();
                } catch (e: any) {
                  Alert.alert(
                    "Couldn't start guest mode",
                    `${e?.message ?? String(e)}\n\nGuest mode needs an internet connection the first time it is used.`,
                  );
                } finally {
                  setBusy(null);
                }
              }}
              style={({ pressed }) => [
                styles.guestButton,
                busy !== null && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.guestButtonText}>
                {busy === "other" ? "Starting…" : "Continue without an account"}
              </Text>
              <Text style={styles.guestHint}>
                Try greenroom now. You can create an account later and keep everything.
              </Text>
            </Pressable>
          )}
        />
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
    title: { ...type.title, color: c.text, marginBottom: 4 },
    subtitle: {
      ...type.body,
      color: c.textMuted,
      marginBottom: spacing.xxl,
      textAlign: "center",
    },
    guestButton: {
      width: "100%",
      marginTop: spacing.xl,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      alignItems: "center",
      gap: spacing.xs,
    },
    guestButtonText: { ...type.bodyStrong, color: c.accent },
    guestHint: { ...type.caption, color: c.textMuted, textAlign: "center" },
    pressed: { transform: [{ scale: 0.98 }] },
    disabled: { opacity: 0.5 },
  });
}
