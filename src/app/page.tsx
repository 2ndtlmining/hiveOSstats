import { getLatestSnapshot, getSnapshotCount, getTopMovers, getSparklineData } from "@/lib/data";
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

    // Use lightweight sparkline helper instead of full getTimeSeries()
    const sparkData = topItem ? getSparklineData(cat, topItem.name) : [];

    return {
      category: cat,
      label: CATEGORY_LABELS[cat],
      count: items.length,
      topItem: topItem ? { name: topItem.name, amount: Math.round(topItem.amount * 100) / 100 } : null,
      sparkData,
    };
  });

  // Compute top movers in a single efficient pass
  const movers = getTopMovers(categories, CATEGORY_LABELS);

  return (
    <DashboardClient
      stats={stats}
      movers={movers}
      snapshotCount={snapshotCount}
      latestTimestamp={latest?.timestamp ?? null}
    />
  );
}
