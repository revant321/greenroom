import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/theme/useTheme";
import { fonts, radius, spacing } from "@/theme/tokens";
import { Icon } from "./Icon";

/**
 * Shown on the Shows and Songs lists while signed in as a guest. Closing it
 * hides it until the next app launch; the Settings screen always shows the
 * guest state regardless.
 */
export function GuestBanner() {
  const { isGuest, guestBannerDismissed, dismissGuestBanner } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  if (!isGuest || guestBannerDismissed) return null;

  return (
    <View
      accessibilityRole="summary"
      style={[
        styles.wrap,
        { backgroundColor: colors.accentSoft, borderColor: colors.border },
      ]}
    >
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: colors.text }]}>
          You're using greenroom without an account.
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Create one to sync and back up your work.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/upgrade")}
          hitSlop={6}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.action, { color: colors.accent }]}>Create an account</Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        onPress={dismissGuestBanner}
        hitSlop={10}
        style={({ pressed }) => [styles.close, pressed && { opacity: 0.6 }]}
      >
        <Icon sf="xmark" ion="close" size={16} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  textCol: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontFamily: fonts.semibold, fontWeight: "600" },
  body: { fontSize: 13, fontFamily: fonts.regular, lineHeight: 18 },
  action: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
  close: { padding: 2 },
});
