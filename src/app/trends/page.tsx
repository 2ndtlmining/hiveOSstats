import { getTopItems } from "@/lib/data";
import { isRange, type Range } from "@/lib/ranges";
import { getRangedSeries } from "@/lib/series";
import { toColumns } from "@/lib/series-format";
import { OTHER_SERIES, SERIES_SLOTS } from "@/components/charts/utils";
import type { CategoryKey, TimeSeriesPoint } from "@/types";
import { TrendsClient } from "./trends-client";

export const dynamic = "force-dynamic";

/** Trends shows long-term composition, so it defaults to the whole history. */
const TRENDS_DEFAULT_RANGE: Range = "all";

const VIEWS: { title: string; category: CategoryKey }[] = [
  { title: "GPU Market Share", category: "gpu_brands" },
  { title: "Top Coins", category: "coins" },
  { title: "Mining Software Popularity", category: "miners" },
  { title: "Top Algorithms", category: "algos" },
  { title: "Top NVIDIA Models", category: "nvidia_models" },
  { title: "Top AMD Models", category: "amd_models" },
];

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Add an "Other" series (everything outside the top items) so each stack reaches 100%. */
function withOther(points: TimeSeriesPoint[], names: string[]): TimeSeriesPoint[] {
  return points.map((p) => {
    const top = names.reduce((sum, n) => sum + ((p[n] as number | undefined) ?? 0), 0);
    return { ...p, [OTHER_SERIES]: round2(Math.max(0, 100 - top)) };
  });
}

export default async function TrendsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range: rangeParam } = await searchParams;
  const range = isRange(rangeParam) ? rangeParam : TRENDS_DEFAULT_RANGE;

  // One colour per item: the top 8, then everything else as "Other".
  // Long ranges come back as weekly means; everything is sent as columns.
  const views = VIEWS.map(({ title, category }) => {
    const top = getTopItems(category, SERIES_SLOTS + 1);
    const hasOther = top.length > SERIES_SLOTS;
    const names = top.slice(0, SERIES_SLOTS).map((i) => i.name);
    const series = getRangedSeries(category, names, range);
    const points = hasOther ? withOther(series.points, names) : series.points;
    const allNames = hasOther ? [...names, OTHER_SERIES] : names;
    const last = points[points.length - 1] ?? { date: "" };
    const latest = Object.fromEntries(
      allNames.filter((n) => last[n] !== undefined).map((n) => [n, last[n] as number])
    );
    return {
      title,
      names: allNames,
      labels: { ...series.labels, [OTHER_SERIES]: "Other" },
      latest,
      resolution: series.resolution,
      data: toColumns(points, allNames),
    };
  });

  return <TrendsClient views={views} range={range} defaultRange={TRENDS_DEFAULT_RANGE} />;
}
