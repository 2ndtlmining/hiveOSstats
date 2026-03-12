import { getLatestSnapshot, getSnapshotCount, getTopItems, getTimeSeries } from "@/lib/data";
import type { CategoryKey } from "@/types";
import { CATEGORY_LABELS } from "@/types";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const latest = getLatestSnapshot();
  const snapshotCount = getSnapshotCount();

  const categories: CategoryKey[] = ["coins", "algos", "gpu_brands", "nvidia_models", "amd_models", "miners", "asic_models"];

  const stats = categories.map((cat) => {
    const items = latest ? Object.values(latest.data[cat] || {}) : [];
    const topItem = items.sort((a, b) => b.amount - a.amount)[0];

    const sparkData = topItem
      ? getTimeSeries(cat, [topItem.name]).map((p) => ({ value: (p[topItem.name] as number) ?? 0 }))
      : [];

    return {
      category: cat,
      label: CATEGORY_LABELS[cat],
      count: items.length,
      topItem: topItem ? { name: topItem.name, amount: Math.round(topItem.amount * 100) / 100 } : null,
      sparkData,
    };
  });

  // Top movers: items with biggest % change from first to last snapshot
  const topMovers: { name: string; category: string; change: number; current: number }[] = [];
  for (const cat of categories) {
    const topItems = getTopItems(cat, 20);
    for (const item of topItems) {
      const series = getTimeSeries(cat, [item.name]);
      if (series.length >= 2) {
        const first = series[0][item.name] as number;
        const last = series[series.length - 1][item.name] as number;
        if (first && first > 0) {
          const change = ((last - first) / first) * 100;
          topMovers.push({
            name: item.name,
            category: CATEGORY_LABELS[cat],
            change: Math.round(change * 100) / 100,
            current: Math.round(last * 100) / 100,
          });
        }
      }
    }
  }

  topMovers.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  const movers = topMovers.slice(0, 10);

  return (
    <DashboardClient
      stats={stats}
      movers={movers}
      snapshotCount={snapshotCount}
      latestTimestamp={latest?.timestamp ?? null}
    />
  );
}
