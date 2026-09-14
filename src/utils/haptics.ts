import * as Haptics from "expo-haptics";

/**
 * Haptic feedback for meaningful moments only. Every call swallows errors
 * so a simulator (which has no haptic engine) never throws.
 */
const quiet = (p: Promise<void>) => p.catch(() => {});

export const haptics = {
  /** A light tap: FAB, record start. */
  tap: () => quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Value changed: toggles, chips, segmented control, tab switch. */
  select: () => quiet(Haptics.selectionAsync()),
  /** Something was created or completed. */
  success: () =>
    quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** Something was destroyed. */
  warning: () =>
    quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
