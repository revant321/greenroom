import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { useRouter } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import { AuthOptions } from "@/components/AuthOptions";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/hooks/useAuth";
import {
  linkApple,
  linkEmail,
  linkGoogle,
  LinkOutcome,
} from "@/services/authService";
import { useTheme } from "@/theme/useTheme";
import { ColorTokens, spacing, type } from "@/theme/tokens";

/**
 * "Create an account" for guests. Every option here *links* a real identity
 * to the existing anonymous user rather than creating a new one, so the
 * user id stays the same and every show, song and recording carries over.
 */
export default function Upgrade() {
  const { colors } = useTheme();
  const { isGuest } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const styles = makeStyles(colors);

  function handleOutcome(outcome: LinkOutcome, providerLabel: string): Promise<void> {
    if (outcome.status === "linked") {
      toast.show("Account created. Your work is now backed up.", "success");
      router.back();
      return Promise.resolve();
    }

    if (outcome.status === "confirm-email") {
      return new Promise((resolve) => {
        Alert.alert(
          "Check your email",
          `We sent a confirmation link to ${outcome.email}. Tap it to finish creating your account. Until then you stay in guest mode and nothing is lost.`,
          [{ text: "OK", onPress: () => { router.back(); resolve(); } }],
        );
      });
    }

    // Conflict: that identity already belongs to a different account.
    return new Promise((resolve, reject) => {
      Alert.alert(
        "That account already exists",
        `${providerLabel} is already linked to a different greenroom account, so your guest work can't be merged into it automatically.\n\nYou can keep working as a guest, or switch to that account. Switching leaves the shows and songs you made as a guest behind.`,
        [
          { text: "Keep guest work", style: "cancel", onPress: () => resolve() },
          {
            text: "Switch to that account",
            style: "destructive",
            onPress: () => {
              outcome
                .switchToExisting()
                .then(() => {
                  toast.show("Signed in to your existing account.", "info");
                  router.back();
                  resolve();
                })
                .catch(reject);
            },
          },
        ],
      );
    });
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
        <Text style={styles.subtitle}>
          {isGuest
            ? "Pick how you'd like to sign in from now on. Everything you've made as a guest stays exactly where it is."
            : "You already have an account."}
        </Text>

        <AuthOptions
          onApple={async () => handleOutcome(await linkApple(), "That Apple ID")}
          onGoogle={async (idToken) =>
            handleOutcome(await linkGoogle(idToken), "That Google account")
          }
          onEmail={async (email, password) =>
            handleOutcome(await linkEmail(email, password), "That email address")
          }
          appleButtonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
          googleLabel="Continue with Google"
          emailLabel="Create account with email"
          busyLabel="Linking…"
          errorTitle="Couldn't create account"
          passwordAutoComplete="new-password"
        />

        <Text style={styles.footnote}>
          Already have a greenroom account on another device? Choose it above
          and we'll explain your options if it's a different account.
        </Text>
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
      padding: spacing.xl,
      paddingTop: spacing.xxl,
      backgroundColor: c.bg,
    },
    subtitle: {
      ...type.body,
      color: c.textMuted,
      marginBottom: spacing.xl,
      textAlign: "center",
      maxWidth: 360,
    },
    footnote: {
      ...type.caption,
      color: c.textMuted,
      textAlign: "center",
      marginTop: spacing.xl,
      maxWidth: 360,
    },
  });
}
