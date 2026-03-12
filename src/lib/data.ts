import fs from "fs";
import path from "path";
import type { CleanedSnapshot, CategoryKey, DataItem, TimeSeriesPoint } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");

// ─── Cache Layer ──────────────────────────────────────────────
// All caches share a single TTL and invalidate together

let snapshotCache: CleanedSnapshot[] | null = null;
let fileCountCache = 0;
let cacheTime = 0;
const CACHE_TTL = 5 * 60_000; // 5 minutes

const categoryDataCache = new Map<CategoryKey, DataItem[]>();
const uniqueNamesCache = new Map<CategoryKey, string[]>();

function invalidateCache() {
  snapshotCache = null;
  categoryDataCache.clear();
  uniqueNamesCache.clear();
  cacheTime = 0;
}

// ─── Core Data Functions ──────────────────────────────────────

export function getCleanedFiles(): string[] {
  if (!fs.existsSync(DATA_DIR)) return [];
  return fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.startsWith("cleaned_data") && f.endsWith(".json"))
    .sort();
}

export function readAllSnapshots(): CleanedSnapshot[] {
  const now = Date.now();
  const fileCount = getCleanedFiles().length;

  if (snapshotCache && now - cacheTime < CACHE_TTL && fileCountCache === fileCount) {
    return snapshotCache;
  }

  const files = getCleanedFiles();
  const data = files.map((file) => {
    const raw = fs.readFileSync(path.join(DATA_DIR, file), "utf-8");
    return JSON.parse(raw) as CleanedSnapshot;
  });

  snapshotCache = data;
  fileCountCache = fileCount;
  cacheTime = now;
  categoryDataCache.clear();
  uniqueNamesCache.clear();
  return data;
}

export function getCategoryData(category: CategoryKey): DataItem[] {
  if (categoryDataCache.has(category)) {
    // Ensure snapshots are still cached (triggers reload if TTL expired)
    readAllSnapshots();
    if (categoryDataCache.has(category)) return categoryDataCache.get(category)!;
  }

  const snapshots = readAllSnapshots();
  const items: DataItem[] = [];

  for (const snap of snapshots) {
    const cat = snap[category];
    if (!cat) continue;
    for (const item of Object.values(cat)) {
      items.push({ name: item.name, amount: item.amount, snapshot: item.snapshot });
    }
  }

  categoryDataCache.set(category, items);
  return items;
}

export function getUniqueNames(category: CategoryKey): string[] {
  if (uniqueNamesCache.has(category)) {
    readAllSnapshots(); // ensure cache is valid
    if (uniqueNamesCache.has(category)) return uniqueNamesCache.get(category)!;
  }

  const items = getCategoryData(category);
  const names = [...new Set(items.map((i) => i.name))].sort();
  uniqueNamesCache.set(category, names);
  return names;
}

export function getTimeSeries(
  category: CategoryKey,
  selectedNames: string[]
): TimeSeriesPoint[] {
  const items = getCategoryData(category);
  const nameSet = new Set(selectedNames);

  // Group by date
  const byDate: Record<string, Record<string, number[]>> = {};
  for (const item of items) {
    if (!nameSet.has(item.name)) continue;
    const date = item.snapshot.split(" ")[0];
    if (!byDate[date]) byDate[date] = {};
    if (!byDate[date][item.name]) byDate[date][item.name] = [];
    byDate[date][item.name].push(item.amount);
  }

  // Aggregate: mean per day
  const dates = Object.keys(byDate).sort();
  const result: TimeSeriesPoint[] = [];

  for (const date of dates) {
    const point: TimeSeriesPoint = { date };
    for (const name of selectedNames) {
      const vals = byDate[date]?.[name];
      if (vals && vals.length > 0) {
        point[name] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
      }
    }
    result.push(point);
  }

  // Forward fill then backward fill
  for (const name of selectedNames) {
    let lastVal: number | undefined;
    for (const point of result) {
      if (point[name] !== undefined) {
        lastVal = point[name] as number;
      } else if (lastVal !== undefined) {
        point[name] = lastVal;
      }
    }
    lastVal = undefined;
    for (let i = result.length - 1; i >= 0; i--) {
      if (result[i][name] !== undefined) {
        lastVal = result[i][name] as number;
      } else if (lastVal !== undefined) {
        result[i][name] = lastVal;
      }
    }
  }

  return result;
}

// ─── Efficient Dashboard Helpers ──────────────────────────────

/**
 * Compute top movers across all categories in a single pass over the data.
 * Avoids calling getTimeSeries() 140+ times.
 */
export function getTopMovers(
  categories: CategoryKey[],
  categoryLabels: Record<string, string>,
  limit = 10
): { name: string; category: string; change: number; current: number }[] {
  const latest = getLatestSnapshot();
  if (!latest) return [];

  const movers: { name: string; category: string; change: number; current: number }[] = [];

  for (const cat of categories) {
    const catData = latest.data[cat];
    if (!catData) continue;

    // Get top 20 items by current amount
    const topNames = Object.values(catData)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 20)
      .map((i) => i.name);

    if (topNames.length === 0) continue;

    // Get first and last snapshot values for these names in one pass
    const items = getCategoryData(cat);
    const firstByName: Record<string, { date: string; amount: number }> = {};
    const lastByName: Record<string, { date: string; amount: number }> = {};
    const nameSet = new Set(topNames);

    for (const item of items) {
      if (!nameSet.has(item.name)) continue;
      const date = item.snapshot.split(" ")[0];

      if (!firstByName[item.name] || date < firstByName[item.name].date) {
        firstByName[item.name] = { date, amount: item.amount };
      }
      if (!lastByName[item.name] || date > lastByName[item.name].date) {
        lastByName[item.name] = { date, amount: item.amount };
      }
    }

    for (const name of topNames) {
      const first = firstByName[name];
      const last = lastByName[name];
      if (first && last && first.amount > 0) {
        const change = ((last.amount - first.amount) / first.amount) * 100;
        movers.push({
          name,
          category: categoryLabels[cat] || cat,
          change: Math.round(change * 100) / 100,
          current: Math.round(last.amount * 100) / 100,
        });
      }
    }
  }

  movers.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  return movers.slice(0, limit);
}

/**
 * Get sparkline data for a single item from the latest few snapshots only.
 * Much cheaper than full getTimeSeries().
 */
export function getSparklineData(category: CategoryKey, name: string, maxPoints = 30): { value: number }[] {
  const snapshots = readAllSnapshots();
  const values: { value: number }[] = [];

  // Only sample from the last N snapshots to keep it fast
  const start = Math.max(0, snapshots.length - maxPoints);
  for (let i = start; i < snapshots.length; i++) {
    const cat = snapshots[i][category];
    if (!cat) continue;
    const item = Object.values(cat).find((v) => v.name === name);
    if (item) {
      values.push({ value: item.amount });
    }
  }

  return values;
}

// ─── Existing Helpers ─────────────────────────────────────────

export function getLatestSnapshot(): { timestamp: string; data: CleanedSnapshot } | null {
  const files = getCleanedFiles();
  if (files.length === 0) return null;

  // Use cached snapshots if available
  const snapshots = readAllSnapshots();
  const data = snapshots[snapshots.length - 1];

  const firstCat = Object.values(data)[0];
  const firstItem = Object.values(firstCat)[0];
  const timestamp = firstItem?.snapshot ?? "Unknown";

  return { timestamp, data };
}

export function getSnapshotCount(): number {
  return getCleanedFiles().length;
}

export function getTopItems(category: CategoryKey, limit = 10): DataItem[] {
  const latest = getLatestSnapshot();
  if (!latest) return [];

  const cat = latest.data[category];
  if (!cat) return [];

  return Object.values(cat)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

export function saveSnapshot(data: CleanedSnapshot): string {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const now = new Date();
  const month = now.toLocaleString("en-US", { month: "short" }).toLowerCase();
  const ts = now.toISOString().replace("T", "_").replace(/:/g, "-").slice(0, 19);
  const filename = `cleaned_data_${month}_${ts}.json`;

  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
  invalidateCache();
  return filename;
}

export function saveRawSnapshot(data: unknown): string {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const now = new Date();
  const month = now.toLocaleString("en-US", { month: "short" }).toLowerCase();
  const ts = now.toISOString().replace("T", "_").replace(/:/g, "-").slice(0, 19);
  const filename = `raw_data_${month}_${ts}.json`;

  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data));
  return filename;
}
