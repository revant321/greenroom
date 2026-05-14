export const palette = {
  light: {
    bg: "#F2F2F7",
    bgElevated: "#FFFFFF",
    card: "#FFFFFF",
    cardHover: "#F8F8FB",
    border: "rgba(0, 0, 0, 0.08)",
    divider: "rgba(0, 0, 0, 0.04)",
    text: "#000000",
    textMuted: "#6C6C70",
    accent: "#007AFF",
    danger: "#FF3B30",
    warn: "#FF9500",
    success: "#34C759",
    shadow: "rgba(0, 0, 0, 0.05)",
    modalBackdrop: "rgba(0, 0, 0, 0.35)",

    navGlassTint: "rgba(255, 255, 255, 0.72)",
    navGlassBorder: "rgba(0, 0, 0, 0.14)",
    navActivePill: "rgba(0, 0, 0, 0.10)",
    navActivePillBorder: "rgba(0, 0, 0, 0.14)",
    navIconActive: "#000000",
    navIconInactive: "#8E8E93",
    navBlurTint: "light" as "light" | "dark",
  },
  dark: {
    bg: "#040406",
    bgElevated: "#1C1C1E",
    card: "#1C1C1E",
    cardHover: "#2C2C2E",
    border: "rgba(255, 255, 255, 0.08)",
    divider: "rgba(255, 255, 255, 0.05)",
    text: "#FFFFFF",
    textMuted: "#98989F",
    accent: "#0A84FF",
    danger: "#FF453A",
    warn: "#FF9F0A",
    success: "#30D158",
    shadow: "rgba(0, 0, 0, 0.4)",
    modalBackdrop: "rgba(0, 0, 0, 0.55)",

    navGlassTint: "rgba(28, 28, 30, 0.55)",
    navGlassBorder: "rgba(255, 255, 255, 0.20)",
    navActivePill: "rgba(255, 255, 255, 0.22)",
    navActivePillBorder: "rgba(255, 255, 255, 0.18)",
    navIconActive: "#FFFFFF",
    navIconInactive: "#98989F",
    navBlurTint: "dark" as "light" | "dark",
  },
};

export type ColorTokens = typeof palette.light;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
};

export const type = {
  title: { fontSize: 32, fontWeight: "700" as const },
  heading: { fontSize: 20, fontWeight: "600" as const },
  body: { fontSize: 16, fontWeight: "400" as const },
  bodyStrong: { fontSize: 16, fontWeight: "600" as const },
  caption: { fontSize: 13, fontWeight: "400" as const },
  label: { fontSize: 14, fontWeight: "500" as const },
  tabLabel: { fontSize: 10, fontWeight: "500" as const },
};

export const TAB_BAR_HEIGHT = 68;
export const TAB_BAR_BOTTOM_INSET = 14;
export const TAB_BAR_HORIZONTAL_MARGIN = 22;
export const FAB_CLEARANCE = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_INSET + 24;
