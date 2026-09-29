import type { CategoryKey, TimeSeriesPoint } from "@/types";
import { getCategorySeries, getTimeSeries } from "./data";
import { rangeStart, type Range } from "./ranges";
import { weeklyMeans } from "./series-format";

/** Above this many days, charts get weekly means instead of daily points. */
export const MAX_DAILY_POINTS = 400;

export interface RangedSeries {
  range: Range;
  resolution: "daily" | "weekly";
  from: string | null;
  to: string | null;
  points: TimeSeriesPoint[];
}

/**
 * Series for the selected items over a range, counted back from the latest
 * snapshot. Long ranges are averaged by week rather than sampled, so no day
 * is silently dropped.
 */
export function getRangedSeries(category: CategoryKey, names: string[], range: Range): RangedSeries {
  const { dates } = getCategorySeries(category);
  const latest = dates[dates.length - 1];
  const daily = latest ? getTimeSeries(category, names, { from: rangeStart(latest, range) }) : [];
  const weekly = daily.length > MAX_DAILY_POINTS;
  return {
    range,
    resolution: weekly ? "weekly" : "daily",
    from: daily[0]?.date ?? null,
    to: daily[daily.length - 1]?.date ?? null,
    points: weekly ? weeklyMeans(daily, names) : daily,
  };
}
