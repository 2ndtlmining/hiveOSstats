/** Time ranges for charts, safe to import from client components. */

export const RANGES = { "30d": 30, "90d": 90, "6m": 182, "1y": 365, all: null } as const;
export type Range = keyof typeof RANGES;
export const DEFAULT_RANGE: Range = "90d";

export const RANGE_LABELS: Record<Range, string> = {
  "30d": "30D", "90d": "90D", "6m": "6M", "1y": "1Y", all: "All",
};

export function isRange(value: unknown): value is Range {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(RANGES, value);
}

/** First date ("YYYY-MM-DD") in the range, counted back from the latest data date; null = all. */
export function rangeStart(latestDate: string, range: Range): string | null {
  const days = RANGES[range];
  if (days === null) return null;
  const d = new Date(`${latestDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}
