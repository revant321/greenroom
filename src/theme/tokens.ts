import { Platform } from "react-native";

/**
 * Greenroom design language — ported from the "personality" prototype.
 *
 * Direction: deep aubergine/indigo canvas, purple accent, and a signature
 * warm→pink→violet gradient used for selected / active / primary states.
 * Selected nav pill is a neutral frosted lozenge (Apple-style), NOT the
 * accent color. Type is Poppins.
 *
 * Token NAMES are unchanged from the original tokens.ts so existing screens
 * keep working — only the VALUES changed. New additions: `gradient`,
 * `gradientColors`, `accentSoft`, and the `fonts` block.
 */

export const palette = {
  light: {
    bg: "#EFEDF7",
    bgElevated: "#FFFFFF",
    card: "#FFFFFF",
    cardHover: "#F6F4FC",
    border: "rgba(70, 62, 110, 0.14)",
    divider: "rgba(70, 62, 110, 0.08)",
    text: "#1D1B2E",
    textMuted: "rgba(70, 62, 110, 0.62)",
    accent: "#7C4DEB",
    accentSoft: "rgba(124, 77, 235, 0.10)",
    danger: "#E8446B",
    warn: "#B07300",
    success: "#7C4DEB",
    shadow: "rgba(70, 62, 110, 0.10)",
    modalBackdrop: "rgba(0, 0, 0, 0.35)",

    // Signature gradient (warm → pink → violet)
    gradientColors: ["#FFB03A", "#F0447D", "#8C5CFF"] as const,

    navGlassTint: "rgba(196, 175, 255, 0.45)",
    navGlassBorder: "rgba(124, 77, 235, 0.22)",
    navActivePill: "#FFFFFF",
    navActivePillBorder: "rgba(124, 77, 235, 0.16)",
    navIconActive: "#1D1B2E",
    navIconInactive: "rgba(70, 62, 110, 0.55)",
    navBlurTint: "light" as "light" | "dark",
  },
  dark: {
    bg: "#1C1B2E",
    bgElevated: "#262539",
    card: "#262539",
    cardHover: "#2F2E45",
    border: "rgba(150, 140, 200, 0.16)",
    divider: "rgba(150, 140, 200, 0.09)",
    text: "#FFFFFF",
    textMuted: "rgba(190, 183, 228, 0.65)",
    accent: "#A06BFF",
    accentSoft: "rgba(160, 107, 255, 0.16)",
    danger: "#FF5C7A",
    warn: "#FFB03A",
    success: "#9D5CFF",
    shadow: "rgba(0, 0, 0, 0.4)",
    modalBackdrop: "rgba(0, 0, 0, 0.55)",

    gradientColors: ["#FFB03A", "#F0447D", "#8C5CFF"] as const,

    navGlassTint: "rgba(74, 58, 128, 0.55)",
    navGlassBorder: "rgba(160, 107, 255, 0.28)",
    navActivePill: "rgba(160, 107, 255, 0.30)",
    navActivePillBorder: "rgba(200, 170, 255, 0.35)",
    navIconActive: "#FFFFFF",
    navIconInactive: "rgba(190, 183, 228, 0.6)",
    navBlurTint: "dark" as "light" | "dark",
  },
};

export type ColorTokens = typeof palette.light;

/** CSS-ready gradient angle used by the prototype (135deg, 3 stops). */
export const GRADIENT_ANGLE = 135;
/** expo-linear-gradient start/end for a 135deg diagonal. */
export const gradientVector = {
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
  locations: [0, 0.52, 1] as const,
};

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

/**
 * Poppins type scale. Requires the fonts to be loaded at app start
 * (see note in the handoff) — falls back to system if not yet loaded.
 */
const FALLBACK = Platform.select({ ios: "System", default: "sans-serif" });
export const fonts = {
  regular: "Poppins_400Regular",
  medium: "Poppins_500Medium",
  semibold: "Poppins_600SemiBold",
  bold: "Poppins_700Bold",
  extrabold: "Poppins_800ExtraBold",
  fallback: FALLBACK,
};

export const type = {
  title: { fontSize: 34, fontFamily: fonts.extrabold, fontWeight: "800" as const, letterSpacing: -0.5 },
  heading: { fontSize: 20, fontFamily: fonts.bold, fontWeight: "700" as const, letterSpacing: -0.3 },
  body: { fontSize: 16, fontFamily: fonts.regular, fontWeight: "400" as const },
  bodyStrong: { fontSize: 16, fontFamily: fonts.semibold, fontWeight: "600" as const },
  caption: { fontSize: 13, fontFamily: fonts.regular, fontWeight: "400" as const },
  label: { fontSize: 14, fontFamily: fonts.medium, fontWeight: "500" as const },
  tabLabel: { fontSize: 10, fontFamily: fonts.medium, fontWeight: "500" as const },
};

export const TAB_BAR_HEIGHT = 54;
export const TAB_BAR_BOTTOM_INSET = 14;
export const TAB_BAR_HORIZONTAL_MARGIN = 22;
/** Pill width as a fraction of the usable screen width (it's centered). */
export const TAB_BAR_WIDTH_FRACTION = 0.6;
export const FAB_CLEARANCE = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_INSET + 24;
