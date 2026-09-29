import type { TimeSeriesPoint } from "@/types";

/** A time series as columns: far smaller to send than one object per point. */
export interface ColumnarSeries {
  dates: string[];
  series: Record<string, (number | null)[]>;
}

export function toColumns(points: TimeSeriesPoint[], names: string[]): ColumnarSeries {
  return {
    dates: points.map((p) => p.date),
    series: Object.fromEntries(
      names.map((name) => [name, points.map((p) => (p[name] as number | undefined) ?? null)])
    ),
  };
}

export function fromColumns({ dates, series }: ColumnarSeries): TimeSeriesPoint[] {
  return dates.map((date, i) => {
    const point: TimeSeriesPoint = { date };
    for (const [name, values] of Object.entries(series)) {
      if (values[i] !== null) point[name] = values[i]!;
    }
    return point;
  });
}

/** Monday of the ISO week containing a "YYYY-MM-DD" date. */
function weekStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/**
 * Weekly means of daily points, dated by the first day with data in each week.
 * An item is averaged over the days it was present; a week where it never
 * appeared has no value.
 */
export function weeklyMeans(points: TimeSeriesPoint[], names: string[]): TimeSeriesPoint[] {
  const weeks: { date: string; sums: Map<string, [number, number]> }[] = [];
  let currentWeek = "";
  for (const point of points) {
    const week = weekStart(point.date);
    if (week !== currentWeek) {
      weeks.push({ date: point.date, sums: new Map() });
      currentWeek = week;
    }
    const { sums } = weeks[weeks.length - 1];
    for (const name of names) {
      const v = point[name] as number | undefined;
      if (v === undefined) continue;
      const acc = sums.get(name) ?? [0, 0];
      acc[0] += v;
      acc[1] += 1;
      sums.set(name, acc);
    }
  }
  return weeks.map(({ date, sums }) => {
    const point: TimeSeriesPoint = { date };
    for (const [name, [sum, n]] of sums) point[name] = Math.round((sum / n) * 100) / 100;
    return point;
  });
}
