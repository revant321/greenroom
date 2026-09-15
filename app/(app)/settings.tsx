import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { signOut } from "@/services/authService";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/theme/useTheme";
import { AnimSpeed, ThemeMode } from "@/theme/ThemeProvider";
import { SegmentedControl } from "@/components/SegmentedControl";
import { SectionLabel } from "@/components/ScreenTitle";
import { GradientButton } from "@/components/GradientButton";
import { cardSurface, ColorTokens, press, radius, spacing, type } from "@/theme/tokens";

const SPEED_HINTS: Record<AnimSpeed, string> = {
  slower: "A more relaxed, unhurried pace.",
  normal: "The standard Greenroom pace.",
  faster: "Snappier transitions throughout.",
};

export default function Settings() {
  const { session, isGuest } = useAuth();
  const { colors, mode, setMode, animSpeed, setAnimSpeed } = useTheme();
  const router = useRouter();
  const styles = makeStyles(colors);

  async function doSignOut() {
    try {
      await signOut();
      router.replace("/login");
    } catch (e: any) {
      Alert.alert("Sign out failed", e?.message ?? String(e));
    }
  }

  function onSignOut() {
    if (!isGuest) {
      void doSignOut();
      return;
    }
    // A guest user has no way back in: once signed out, that anonymous user
    // and everything attached to it is unreachable.
    Alert.alert(
      "Sign out of guest mode?",
      "You're using greenroom without an account. Signing out will permanently lose every show, song and recording you've made unless you create an account first.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Create an account", onPress: () => router.push("/upgrade") },
        { text: "Sign out and lose my work", style: "destructive", onPress: () => void doSignOut() },
      ],
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
    >
      <SectionLabel>Account</SectionLabel>
      <View style={styles.card}>
        {isGuest ? (
          <View style={styles.guestBlock}>
            <Text style={styles.rowLabel}>Signed in as</Text>
            <Text style={styles.email}>Guest</Text>
            <Text style={styles.hint}>
              Your work is saved to this device's guest account only. Create an
              account to keep it if you switch phones or reinstall.
            </Text>
            <GradientButton
              label="Create an account"
              onPress={() => router.push("/upgrade")}
              style={styles.upgradeButton}
            />
          </View>
        ) : (
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.rowLabel}>Signed in as</Text>
              <Text style={styles.email} numberOfLines={1}>
                {session?.user.email ?? "(unknown)"}
              </Text>
            </View>
          </View>
        )}
      </View>

      <SectionLabel>Appearance</SectionLabel>
      <View style={styles.card}>
        <SegmentedControl<ThemeMode>
          options={["auto", "light", "dark"] as const}
          value={mode}
          onChange={setMode}
          labels={{ auto: "System" }}
        />
        <Text style={styles.hint}>
          Greenroom follows your system appearance by default.
        </Text>
      </View>

      <SectionLabel>Animation speed</SectionLabel>
      <View style={styles.card}>
        <SegmentedControl<AnimSpeed>
          options={["slower", "normal", "faster"] as const}
          value={animSpeed}
          onChange={setAnimSpeed}
        />
        <Text style={styles.hint}>{SPEED_HINTS[animSpeed]}</Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.signOut, pressed && press.scale]}
        onPress={onSignOut}
        accessibilityRole="button"
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    container: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    card: {
      ...cardSurface(c),
      padding: spacing.md,
    },
    rowBetween: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: spacing.xs,
    },
    guestBlock: { padding: spacing.xs },
    rowLabel: { ...type.caption, color: c.textMuted },
    email: { ...type.bodyStrong, color: c.text, marginTop: spacing.xxs },
    upgradeButton: { marginTop: spacing.md, alignSelf: "stretch" },
    hint: {
      ...type.caption,
      color: c.textMuted,
      paddingTop: spacing.md,
      paddingHorizontal: spacing.sm,
      paddingBottom: spacing.xxs,
    },
    signOut: {
      marginTop: spacing.xl,
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: c.danger,
      alignItems: "center",
    },
    signOutText: { ...type.button, color: "#fff" },
  });
}
