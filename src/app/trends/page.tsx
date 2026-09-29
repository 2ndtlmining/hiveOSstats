import { getTimeSeries, getTopItems } from "@/lib/data";
import { toColumns, weeklyMeans } from "@/lib/series-format";
import type { CategoryKey } from "@/types";
import { TrendsClient } from "./trends-client";

export const dynamic = "force-dynamic";

const VIEWS: { title: string; category: CategoryKey }[] = [
  { title: "GPU Market Share", category: "gpu_brands" },
  { title: "Top 10 Coins", category: "coins" },
  { title: "Mining Software Popularity", category: "miners" },
  { title: "Top Algorithms", category: "algos" },
  { title: "Top NVIDIA Models", category: "nvidia_models" },
  { title: "Top AMD Models", category: "amd_models" },
];

export default function TrendsPage() {
  // Weekly means keep the shape of two-plus years of daily data at a
  // seventh of the points, sent as columns to keep the page small
  const views = VIEWS.map(({ title, category }) => {
    const names = getTopItems(category, 10).map((i) => i.name);
    const weekly = weeklyMeans(getTimeSeries(category, names), names);
    return { title, names, data: toColumns(weekly, names) };
  });

  return <TrendsClient views={views} />;
}
