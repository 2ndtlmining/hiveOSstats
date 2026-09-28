import type { TimeSeriesPoint } from "@/types";

export const COLORS = ["#FFB800", "#22C55E", "#3B82F6", "#A855F7", "#EF4444", "#06B6D4", "#F97316", "#EC4899"];

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
