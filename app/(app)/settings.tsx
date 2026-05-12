import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { signOut } from "@/services/authService";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/theme/useTheme";
import { ThemeMode } from "@/theme/ThemeProvider";
import { ColorTokens, radius, spacing, type } from "@/theme/tokens";

export default function Settings() {
  const { session } = useAuth();
  const { colors, mode, setMode } = useTheme();
  const router = useRouter();
  const styles = makeStyles(colors);

  async function onSignOut() {
    try {
      await signOut();
      router.replace("/login");
    } catch (e: any) {
      Alert.alert("Sign out failed", e?.message ?? String(e));
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Signed in as</Text>
      <Text style={styles.email}>{session?.user.email ?? "(unknown)"}</Text>

      <Text style={[styles.label, { marginTop: spacing.lg }]}>Theme</Text>
      <View style={styles.chipRow}>
        {(["auto", "light", "dark"] as const).map((m) => (
          <ThemeChip
            key={m}
            label={m}
            active={mode === m}
            onPress={() => setMode(m as ThemeMode)}
            colors={colors}
          />
        ))}
      </View>

      <Link href="/shows/completed" style={styles.link}>
        Completed shows →
      </Link>

      <Pressable
        style={styles.signOut}
        onPress={onSignOut}
        accessibilityRole="button"
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

function ThemeChip({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ColorTokens;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: active ? colors.accent : colors.card,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
      }}
    >
      <Text
        style={{
          color: active ? "#fff" : colors.text,
          fontWeight: active ? "600" : "400",
          textTransform: "capitalize",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: spacing.xl,
      gap: spacing.md,
      backgroundColor: c.bg,
    },
    label: { ...type.label, color: c.textMuted },
    email: {
      ...type.heading,
      color: c.text,
      marginBottom: spacing.lg,
    },
    chipRow: { flexDirection: "row", gap: spacing.sm },
    link: {
      padding: spacing.md + 2,
      fontSize: 16,
      color: c.accent,
    },
    signOut: {
      padding: spacing.md + 2,
      borderRadius: radius.lg,
      backgroundColor: c.danger,
      alignItems: "center",
      marginTop: "auto",
    },
    signOutText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  });
}
