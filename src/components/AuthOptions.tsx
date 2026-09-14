import { ReactNode, useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { Gradient } from "@/components/Gradient";
import { useTheme } from "@/theme/useTheme";
import { ColorTokens, fonts, radius, spacing, type } from "@/theme/tokens";

WebBrowser.maybeCompleteAuthSession();

export type AuthBusy = "apple" | "google" | "email" | "other" | null;

type Props = {
  /** Runs after Apple returns a credential. Throw to show an error alert. */
  onApple: () => Promise<void>;
  /** Runs once Google hands back an ID token. Throw to show an error alert. */
  onGoogle: (idToken: string) => Promise<void>;
  /** Runs on submit of the email form. Throw to show an error alert. */
  onEmail: (email: string, password: string) => Promise<void>;
  appleButtonType: AppleAuthentication.AppleAuthenticationButtonType;
  googleLabel: string;
  emailLabel: string;
  busyLabel: string;
  errorTitle: string;
  passwordAutoComplete: "current-password" | "new-password";
  /**
   * Lets the parent render its own buttons (e.g. "Continue without an
   * account") that share this form's busy state. Receives the current busy
   * value and a setter for the parent's own async action.
   */
  footer?: (state: { busy: AuthBusy; setBusy: (b: AuthBusy) => void }) => ReactNode;
};

/**
 * Apple + Google + email/password controls used by both the sign-in screen
 * and the "create an account" (guest upgrade) screen. Owns the Google OAuth
 * request hook, the text inputs and the shared busy state; the parent decides
 * what a successful credential *means* through the three callbacks.
 */
export function AuthOptions({
  onApple,
  onGoogle,
  onEmail,
  appleButtonType,
  googleLabel,
  emailLabel,
  busyLabel,
  errorTitle,
  passwordAutoComplete,
  footer,
}: Props) {
  const { colors, scheme } = useTheme();
  const styles = makeStyles(colors);
  const [busy, setBusy] = useState<AuthBusy>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const passwordInput = useRef<TextInput>(null);
  const handledGoogleToken = useRef<string | null>(null);
  const canSubmitEmail =
    busy === null && email.trim().length > 0 && password.length > 0;
  const appleSignInEnabled =
    process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED !== "false";

  const [googleRequest, googleResponse, promptGoogle] =
    Google.useIdTokenAuthRequest({
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });

  // On native platforms the prompt first returns an authorization code. Expo
  // exchanges it for an ID token asynchronously and publishes the completed
  // response through this hook value.
  useEffect(() => {
    if (googleResponse?.type !== "success") return;

    const idToken =
      googleResponse.authentication?.idToken ?? googleResponse.params.id_token;
    if (!idToken) {
      Alert.alert(errorTitle, "Google completed sign-in but did not return an ID token.");
      setBusy(null);
      return;
    }
    if (handledGoogleToken.current === idToken) return;
    handledGoogleToken.current = idToken;

    void onGoogle(idToken)
      .catch((e: any) => {
        handledGoogleToken.current = null;
        Alert.alert(errorTitle, e?.message ?? String(e));
      })
      .finally(() => setBusy(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleResponse]);

  async function handleApple() {
    if (busy !== null) return;

    try {
      setBusy("apple");
      await onApple();
    } catch (e: any) {
      if (e?.code !== "ERR_REQUEST_CANCELED") {
        Alert.alert(errorTitle, e?.message ?? String(e));
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleEmail() {
    if (!canSubmitEmail) return;

    try {
      setBusy("email");
      await onEmail(email.trim(), password);
    } catch (e: any) {
      Alert.alert(errorTitle, e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleGoogle() {
    if (busy !== null || !googleRequest) return;

    try {
      setBusy("google");
      const result = await promptGoogle();
      if (result?.type !== "success") setBusy(null);
    } catch (e: any) {
      Alert.alert(errorTitle, e?.message ?? String(e));
      setBusy(null);
    }
  }

  return (
    <View style={styles.content}>
      <View style={styles.socialButtons}>
        {Platform.OS === "ios" && appleSignInEnabled && (
          <View
            pointerEvents={busy === null ? "auto" : "none"}
            style={busy !== null && styles.disabled}
          >
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={appleButtonType}
              buttonStyle={
                scheme === "dark"
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={radius.md}
              style={styles.appleButton}
              onPress={handleApple}
            />
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            disabled: busy !== null || !googleRequest,
            busy: busy === "google",
          }}
          disabled={busy !== null || !googleRequest}
          onPress={handleGoogle}
          style={({ pressed }) => [
            styles.googleButton,
            (busy !== null || !googleRequest) && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.googleButtonText}>
            {busy === "google" ? busyLabel : googleLabel}
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
          placeholder={
            passwordAutoComplete === "new-password"
              ? "At least 6 characters"
              : "Your password"
          }
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoComplete={passwordAutoComplete}
          autoCorrect={false}
          returnKeyType="go"
          secureTextEntry
          textContentType={
            passwordAutoComplete === "new-password" ? "newPassword" : "password"
          }
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleEmail}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            disabled: !canSubmitEmail,
            busy: busy === "email",
          }}
          disabled={!canSubmitEmail}
          onPress={handleEmail}
          style={({ pressed }) => [
            styles.emailButton,
            !canSubmitEmail && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Gradient style={styles.emailButtonFill}>
            <Text style={styles.emailButtonText}>
              {busy === "email" ? busyLabel : emailLabel}
            </Text>
          </Gradient>
        </Pressable>
      </View>

      {footer?.({ busy, setBusy })}
    </View>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    content: {
      width: "100%",
      maxWidth: 360,
      alignItems: "center",
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
