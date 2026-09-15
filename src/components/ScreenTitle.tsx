import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { fontScale, spacing, type } from "@/theme/tokens";

/** Large screen title + optional subtitle (prototype header). */
export function ScreenTitle({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.text }]} maxFontSizeMultiplier={fontScale.display}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[styles.subtitle, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/** Uppercase section label above grouped content. */
export function SectionLabel({
  children,
  action,
}: {
  children: string;
  action?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionRow}>
      <Text
        style={[styles.section, { color: colors.textMuted }]}
        maxFontSizeMultiplier={fontScale.compact}
      >
        {children.toUpperCase()}
      </Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  title: { ...type.title },
  subtitle: { ...type.label, marginTop: spacing.xxs },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.sm,
    marginTop: spacing.xl,
  },
  section: { ...type.eyebrow },
});
