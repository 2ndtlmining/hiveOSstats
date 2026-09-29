import type { CategoryKey } from "@/types";
import { CATEGORY_LABELS } from "@/types";
import { getCategorySeries } from "./data";
import { getDisplayNames } from "./labels";
import { MOVER_WINDOWS, type Mover, type MoverWindow } from "./movers-types";

export { DEFAULT_MOVER_WINDOW, isMoverWindow, MOVER_WINDOWS } from "./movers-types";
export type { Mover, MoverWindow } from "./movers-types";

const ALL_CATEGORIES: CategoryKey[] = [
  "coins", "algos", "gpu_brands", "nvidia_models", "amd_models", "miners", "asic_models",
];

/** "2026-09-28" minus n days. */
function daysBefore(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Biggest share changes over the window, in percentage points. Each end is the
 * average of up to `smoothDays` days to smooth out day-to-day noise. On a day
 * with a snapshot, an item missing from it counts as 0%. Items below
 * `minShare` at both ends are ignored, so tiny items can't dominate.
 */
export function getMovers(
  window: MoverWindow,
  { minShare = 0.5, limit = 5, smoothDays = 3, categories = ALL_CATEGORIES } = {}
): { gainers: Mover[]; losers: Mover[]; from: string | null; to: string | null } {
  const movers: Mover[] = [];
  let from: string | null = null;
  let to: string | null = null;

  for (const category of categories) {
    const { dates, values } = getCategorySeries(category);
    if (dates.length < 2) continue;

    const last = dates.length - 1;
    const windowStart = daysBefore(dates[last], MOVER_WINDOWS[window]);
    const first = dates.findIndex((d) => d >= windowStart);
    if (first < 0 || first >= last) continue;
    from = dates[first];
    to = dates[last];

    // Smoothing ranges at each end, never overlapping
    const span = Math.max(1, Math.min(smoothDays, Math.floor((last - first + 1) / 2)));

    for (const [name, column] of values) {
      const at = (i: number) => (Number.isNaN(column[i]) ? 0 : column[i]);
      const mean = (from: number, to: number) => {
        let sum = 0;
        for (let i = from; i <= to; i++) sum += at(i);
        return sum / (to - from + 1);
      };
      const start = mean(first, first + span - 1);
      const end = mean(last - span + 1, last);
      if (Math.max(start, end) < minShare || start === end) continue;

      const spark: number[] = [];
      for (let i = first; i <= last; i++) spark.push(at(i));

      movers.push({
        name,
        label: name,
        category,
        categoryLabel: CATEGORY_LABELS[category],
        start: round2(start),
        end: round2(end),
        change: round2(end - start),
        relative: start > 0 ? round2(((end - start) / start) * 100) : null,
        spark,
      });
    }
  }

  for (const category of new Set(movers.map((m) => m.category))) {
    const ofCategory = movers.filter((m) => m.category === category);
    const names = getDisplayNames(category, ofCategory.map((m) => m.name));
    for (const m of ofCategory) m.label = names[m.name] ?? m.name;
  }

  const gainers = movers.filter((m) => m.change > 0).sort((a, b) => b.change - a.change);
  const losers = movers.filter((m) => m.change < 0).sort((a, b) => a.change - b.change);
  return { gainers: gainers.slice(0, limit), losers: losers.slice(0, limit), from, to };
}
