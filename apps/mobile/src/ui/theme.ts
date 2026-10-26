// DESIGN.md tokens, light theme. Primary buttons are marigold with ink text: white text on
// marigold is below WCAG AA contrast, ink on marigold is well above it.
export const colors = {
  bg: "#F4F1EA",
  fg: "#14181D",
  muted: "#5D6672",
  accent: "#F2A93B",
  ok: "#1E8A63",
  card: "#FFFFFF",
  border: "#D6D0C4",
  danger: "#9B1C1C",
} as const;

/** DESIGN.md: 48 px+ tap targets; we use 56 for the main actions. */
export const TAP = 56;
