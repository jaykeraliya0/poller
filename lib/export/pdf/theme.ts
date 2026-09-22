import { StyleSheet } from "@react-pdf/renderer";

/**
 * The app's light-theme tokens (app/globals.css), as plain hex for print.
 * Categorical order and the heatmap ramp match the results page, so a chart
 * reads the same on screen and on paper.
 */
export const color = {
  ink: "#151823",
  muted: "#5d6475",
  line: "#e1e4eb",
  panel: "#ffffff",
  canvas: "#f2f3f6",
  signal: "#3b38f0",
  signalInk: "#2a27c9",
  signalWash: "#ecebff",
  accentSoft: "#a9a8ff",
  rest: "#c9ceda",
  track: "#eceef3",
  negative: "#eb6834",
} as const;

export const SERIES = ["#3b38f0", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"] as const;

const hex = (value: string) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));

/** `pole` mixed into white at `percent`, the print stand-in for the page's color-mix() tints. */
export function tint(pole: string, percent: number): string {
  const p = Math.min(Math.max(percent, 0), 100) / 100;
  const [r, g, b] = hex(pole).map((channel) => Math.round(255 + (channel - 255) * p));
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

// Same ramp as components/insights/analysis/heatmap.tsx: text stays ink on every step.
const SEQUENTIAL_MIN = 14;
const SEQUENTIAL_MAX = 72;
const DIVERGING_MAX = 60;

export type CellTone = "sequential" | "positive" | "negative" | "neutral";

export function heatFill(intensity: number, tone: CellTone = "sequential"): string {
  const clamped = Math.min(Math.max(intensity, 0), 1);
  if (clamped === 0) return color.track;
  if (tone === "sequential") return tint(color.signal, SEQUENTIAL_MIN + clamped * (SEQUENTIAL_MAX - SEQUENTIAL_MIN));
  // The grey midpoint of a diverging scale: never a hue.
  if (tone === "neutral") return tint(color.muted, 8 + clamped * 30);
  return tint(tone === "positive" ? color.signal : color.negative, 12 + clamped * (DIVERGING_MAX - 12));
}

export const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: color.ink,
  },
  /**
   * Line height lives here, not on the page: @react-pdf re-applies an inherited
   * unitless line height every time a `fixed` element (the footer) repeats, so
   * on a long report the footer's line height grows until layout breaks.
   */
  body: { lineHeight: 1.4 },
  brand: { fontFamily: "Helvetica-Bold", fontSize: 10, color: color.signal, letterSpacing: 0.2 },
  kicker: { fontSize: 8.5, color: color.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 20, lineHeight: 1.2, marginTop: 6 },
  description: { color: color.muted, marginTop: 4 },
  meta: { color: color.muted, fontSize: 8.5, marginTop: 8 },
  section: { marginTop: 22 },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 12 },
  sectionNote: { color: color.muted, fontSize: 8.5, marginTop: 2, marginBottom: 8 },
  muted: { color: color.muted },
  small: { fontSize: 8 },
  bold: { fontFamily: "Helvetica-Bold" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 44,
    right: 44,
    fontSize: 7.5,
    color: color.muted,
  },
});
