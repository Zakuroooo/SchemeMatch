import type { Lang } from "@/i18n";

/**
 * Palette 04 "Better experiences" (chosen 2026-10-27 on the design canvas):
 * stone grey ground, charcoal ink, one signal red accent. WCAG contrast, computed (AA needs 4.5):
 * ink/bg 11.7, muted/bg 5.6, accentText/bg 5.1, onDeep/deep 12.8, onAccent/accent 5.0.
 */
export const colors = {
  bg: "#E9E8E6",
  surface: "rgba(255,255,255,0.7)",
  line: "#CFCDC9",
  ink: "#2A2A2A",
  muted: "#5A5A5A",
  deep: "#2A2A2A",
  onDeep: "#F2F2F2",
  accent: "#E10600",
  onAccent: "#FFFFFF",
  accentText: "#C40500",
  tint: "#D6D4D0",
  glass: "rgba(42,42,42,0.55)",
} as const;

/** Big tap targets (DESIGN.md: 48 px or more); the main buttons are 52–56. */
export const TAP = 52;

/** Font family names, as loaded in app/_layout.tsx. */
export const fonts = {
  display: "PlayfairDisplay_500Medium",
  displayItalic: "PlayfairDisplay_500Medium_Italic",
  body: "Inter_400Regular",
  bodyStrong: "Inter_600SemiBold",
  bnBody: "NotoSansBengali_600SemiBold",
  bnStrong: "NotoSansBengali_700Bold",
  bnDisplay: "NotoSerifBengali_700Bold",
} as const;

/** Body, strong and display faces for a language: Bengali never falls back to a Latin font. */
export function typeFor(lang: Lang) {
  return lang === "bn"
    ? { body: fonts.bnBody, strong: fonts.bnStrong, display: fonts.bnDisplay }
    : { body: fonts.body, strong: fonts.bodyStrong, display: fonts.display };
}
