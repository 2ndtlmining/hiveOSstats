import { getLatestSnapshot, getLatestSnapshotTime, getRecentValues, getSnapshotCount } from "@/lib/data";
import { dataAgeHours, formatAge, formatUtc } from "@/lib/health";
import { displayName } from "@/lib/labels";
import { DEFAULT_MOVER_WINDOW, getMovers, isMoverWindow } from "@/lib/movers";
import type { CategoryKey } from "@/types";
import { CATEGORY_LABELS } from "@/types";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

const CATEGORIES: CategoryKey[] = ["coins", "algos", "gpu_brands", "nvidia_models", "amd_models", "miners", "asic_models"];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ movers?: string }>;
}) {
  const { movers: moversParam } = await searchParams;
  const moverWindow = isMoverWindow(moversParam) ? moversParam : DEFAULT_MOVER_WINDOW;

  const latest = getLatestSnapshot();

  const round2 = (n: number) => Math.round(n * 100) / 100;
  const stats = CATEGORIES.map((cat) => {
    const items = latest ? Object.values(latest.data[cat] || {}).sort((a, b) => b.amount - a.amount) : [];
    const topItem = items[0];
    const sparkData = topItem ? getRecentValues(cat, topItem.name, 30) : [];
    const change = sparkData.length > 1 ? round2(sparkData[sparkData.length - 1].value - sparkData[0].value) : null;
    return {
      category: cat,
      label: CATEGORY_LABELS[cat],
      count: items.length,
      topItem: topItem
        ? { name: topItem.name, label: displayName(cat, topItem.name), amount: round2(topItem.amount), change }
        : null,
      runnersUp: items.slice(1, 4).map((i) => ({ label: displayName(cat, i.name), amount: round2(i.amount) })),
      sparkData,
    };
  });

  const latestTime = getLatestSnapshotTime();
  const age = dataAgeHours(latestTime);
  const latestLabel = latestTime && age !== null ? `${formatAge(age)} (${formatUtc(latestTime)})` : null;

  return (
    <DashboardClient
      stats={stats}
      movers={{ window: moverWindow, ...getMovers(moverWindow) }}
      snapshotCount={getSnapshotCount()}
      latestLabel={latestLabel}
    />
  );
}
