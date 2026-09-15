import { Platform, ViewStyle } from "react-native";

/**
 * Greenroom design language — ported from the "personality" prototype.
 *
 * Direction: deep aubergine/indigo canvas, purple accent, and a signature
 * warm→pink→violet gradient used for selected / active / primary states.
 * Selected nav pill is a neutral frosted lozenge (Apple-style), NOT the
 * accent color. Type is Poppins.
 *
 * Every screen draws spacing, radii, type, card surfaces and press feedback
 * from this file. If a value you need isn't here, add a token rather than
 * writing a number in a screen.
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
    // 0.80 alpha clears WCAG AA (4.5:1) on bg, card, and accentSoft.
    textMuted: "rgba(70, 62, 110, 0.80)",
    accent: "#7C4DEB",
    accentSoft: "rgba(124, 77, 235, 0.10)",
    danger: "#CC2B52",
    warn: "#966200",
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
    // 0.78 alpha clears WCAG AA (4.5:1) on bg, card, and accentSoft.
    textMuted: "rgba(190, 183, 228, 0.78)",
    accent: "#A874FF",
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

/**
 * 4-point spacing scale. `xxs` is the one exception: a 2pt nudge for a
 * subtitle sitting under a title, or the vertical padding of a tiny tag.
 */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

/**
 * Corner radii. `sm` for small inputs and thumbnails, `md` for badges and
 * icon tiles, `lg` for cards / inputs / buttons, `xl` for sheets.
 */
export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  sheet: 28,
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

/**
 * Seven text sizes cover the whole app: 34 / 28 / 20 / 16 / 14 / 13 / 10.
 * Pick the token by role, then override weight or color in place if a
 * screen needs to (e.g. `{ ...type.caption, fontFamily: fonts.semibold }`).
 */
export const type = {
  /** Tab-root screen titles ("Shows", "Songs"). */
  title: { fontSize: 34, fontFamily: fonts.extrabold, fontWeight: "800" as const, letterSpacing: -0.5 },
  /** Sub-screen headings and the editable title on detail screens. */
  heading: { fontSize: 28, fontFamily: fonts.extrabold, fontWeight: "800" as const, letterSpacing: -0.4 },
  /** Sheet titles and the big tiles on the Show Hub. */
  subheading: { fontSize: 20, fontFamily: fonts.bold, fontWeight: "700" as const, letterSpacing: -0.3 },
  body: { fontSize: 16, fontFamily: fonts.regular, fontWeight: "400" as const },
  /** List-row and card titles. */
  bodyStrong: { fontSize: 16, fontFamily: fonts.semibold, fontWeight: "600" as const, letterSpacing: -0.2 },
  /** Primary button labels. */
  button: { fontSize: 16, fontFamily: fonts.bold, fontWeight: "700" as const },
  /** Secondary lines, chips, small inputs. */
  label: { fontSize: 14, fontFamily: fonts.medium, fontWeight: "500" as const },
  /** Muted captions, tags, status text. */
  caption: { fontSize: 13, fontFamily: fonts.regular, fontWeight: "400" as const },
  /** Uppercase section labels ("NOTES", "HARMONIES"). */
  eyebrow: { fontSize: 13, fontFamily: fonts.semibold, fontWeight: "600" as const, letterSpacing: 0.8 },
  tabLabel: { fontSize: 10, fontFamily: fonts.medium, fontWeight: "500" as const },
};

/**
 * Dynamic Type caps. Body text scales freely; text inside a fixed-size box
 * (a 44pt badge, the tab bar) gets a ceiling so the box doesn't clip it.
 */
export const fontScale = {
  /** Text inside fixed-height chrome: tab labels, badge initials. */
  fixed: 1.2,
  /** Chips, tags, inline buttons — small boxes that can grow a little. */
  compact: 1.4,
  /** Large display text that would otherwise overflow one line. */
  display: 1.5,
};

/** Base card surface. Spread into a screen's card style, then add layout. */
export function cardSurface(c: ColorTokens): ViewStyle {
  return {
    backgroundColor: c.card,
    borderRadius: radius.lg,
    shadowColor: c.shadow,
    shadowOpacity: 1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  };
}

/**
 * Press feedback. Every Pressable in the app uses one of these so the
 * "pressed" feel is the same everywhere — never the bare default.
 */
export const press = {
  /** Cards, rows, tiles (pair with `pressedCard` for the tint). */
  scale: { transform: [{ scale: 0.98 }] } as ViewStyle,
  /** Icon-only buttons. */
  icon: { opacity: 0.5, transform: [{ scale: 0.9 }] } as ViewStyle,
  /** Text links and quiet controls. */
  dim: { opacity: 0.5 } as ViewStyle,
};

/** Pressed style for a card: tint to `cardHover` and shrink slightly. */
export function pressedCard(c: ColorTokens): ViewStyle {
  return { backgroundColor: c.cardHover, transform: [{ scale: 0.985 }] };
}

export const TAB_BAR_HEIGHT = 68;
export const TAB_BAR_BOTTOM_INSET = 14;
export const TAB_BAR_HORIZONTAL_MARGIN = 22;
/** Pill width as a fraction of the usable screen width (it's centered). */
export const TAB_BAR_WIDTH_FRACTION = 0.75;
export const FAB_SIZE = 54;
/** Distance from the screen bottom to the FAB, clear of the tab bar. */
export const FAB_CLEARANCE = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_INSET + spacing.xl;

/**
 * Bottom padding for scrollable content so the last row is never hidden.
 * `tabBar` clears the floating tab bar; `fab` also clears the + button.
 */
export const contentInset = {
  tabBar: FAB_CLEARANCE + spacing.lg,
  fab: FAB_CLEARANCE + FAB_SIZE + spacing.lg,
};
