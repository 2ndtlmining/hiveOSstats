import type { TimeSeriesPoint } from "@/types";

/** Number of categorical colour slots (--series-1..8 in globals.css). */
export const SERIES_SLOTS = 8;

/** Colour for the i-th series. Slots are assigned in order and never cycled on their own. */
export function seriesColor(i: number): string {
  return `var(--series-${(i % SERIES_SLOTS) + 1})`;
}

/**
 * Past 8 series, colours repeat, so a dash pattern tells them apart
 * (solid for 1-8, dashed for 9-16, dotted after that).
 */
export function seriesDash(i: number): string | undefined {
  if (i < SERIES_SLOTS) return undefined;
  return i < SERIES_SLOTS * 2 ? "6 3" : "2 3";
}

export const OTHER_SERIES = "__other__";
export const OTHER_COLOR = "var(--series-other)";

/** Shared axis, grid and tooltip styling, driven by theme tokens so it follows light/dark mode. */
export const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 11 };
export const GRID_STROKE = "var(--border)";
export const TOOLTIP_STYLE = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  color: "var(--popover-foreground)",
  fontSize: "12px",
  padding: "8px 12px",
};

export function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { year: "2-digit", month: "short", day: "numeric" });
}

export function formatTooltipDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** Downsample data to avoid rendering too many points, always keeping the last one. */
export function downsample(data: TimeSeriesPoint[], maxPoints: number): TimeSeriesPoint[] {
  if (data.length <= maxPoints) return data;
  const step = data.length / maxPoints;
  const result: TimeSeriesPoint[] = [];
  for (let i = 0; i < maxPoints - 1; i++) {
    result.push(data[Math.round(i * step)]);
  }
  result.push(data[data.length - 1]);
  return result;
}
