import { getTopItems } from "@/lib/data";
import { isRange, type Range } from "@/lib/ranges";
import { getRangedSeries } from "@/lib/series";
import { toColumns } from "@/lib/series-format";
import type { CategoryKey } from "@/types";
import { TrendsClient } from "./trends-client";

export const dynamic = "force-dynamic";

/** Trends shows long-term composition, so it defaults to the whole history. */
const TRENDS_DEFAULT_RANGE: Range = "all";

const VIEWS: { title: string; category: CategoryKey }[] = [
  { title: "GPU Market Share", category: "gpu_brands" },
  { title: "Top 10 Coins", category: "coins" },
  { title: "Mining Software Popularity", category: "miners" },
  { title: "Top Algorithms", category: "algos" },
  { title: "Top NVIDIA Models", category: "nvidia_models" },
  { title: "Top AMD Models", category: "amd_models" },
];

export default async function TrendsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range: rangeParam } = await searchParams;
  const range = isRange(rangeParam) ? rangeParam : TRENDS_DEFAULT_RANGE;

  // Long ranges come back as weekly means; everything is sent as columns to
  // keep the page small
  const views = VIEWS.map(({ title, category }) => {
    const names = getTopItems(category, 10).map((i) => i.name);
    const series = getRangedSeries(category, names, range);
    return { title, names, labels: series.labels, resolution: series.resolution, data: toColumns(series.points, names) };
  });

  return <TrendsClient views={views} range={range} defaultRange={TRENDS_DEFAULT_RANGE} />;
}
