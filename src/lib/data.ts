import fs from "fs";
import path from "path";
import type { CleanedSnapshot, CategoryKey, DataItem, TimeSeriesPoint } from "@/types";

function dataDir(): string {
  return process.env.DATA_DIR ?? path.join(process.cwd(), "data");
}

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

/**
 * Parse the UTC time embedded in a snapshot filename,
 * e.g. "cleaned_data_sep_2026-09-24_06-00-01.json" -> 2026-09-24T06:00:01Z.
 */
export function parseSnapshotTime(filename: string): Date | null {
  const m = filename.match(/_(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})\.json$/);
  if (!m) return null;
  const date = new Date(`${m[1]}T${m[2]}:${m[3]}:${m[4]}Z`);
  return isNaN(date.getTime()) ? null : date;
}

function fileTime(filename: string): number {
  return parseSnapshotTime(filename)?.getTime() ?? -Infinity;
}

/** Cleaned snapshot files, oldest first. Sorted by embedded timestamp: the
 *  month prefix in the name ("sep", "oct") makes a plain string sort wrong. */
export function getCleanedFiles(): string[] {
  const dir = dataDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.startsWith("cleaned_data") && f.endsWith(".json"))
    .sort((a, b) => fileTime(a) - fileTime(b) || a.localeCompare(b));
}

export function getLatestSnapshotTime(): Date | null {
  const files = getCleanedFiles();
  return files.length > 0 ? parseSnapshotTime(files[files.length - 1]) : null;
}

export function readAllSnapshots(): CleanedSnapshot[] {
  const now = Date.now();
  const files = getCleanedFiles();
  const fileCount = files.length;

  if (snapshotCache && now - cacheTime < CACHE_TTL && fileCountCache === fileCount) {
    return snapshotCache;
  }

  // Skip unreadable files so one corrupt snapshot can't take down every page
  const data: CleanedSnapshot[] = [];
  for (const file of files) {
    try {
      data.push(JSON.parse(fs.readFileSync(path.join(dataDir(), file), "utf-8")) as CleanedSnapshot);
    } catch (err) {
      console.error(`[Data] Skipping unreadable snapshot ${file}:`, (err as Error).message);
    }
  }

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

  // Every day with a snapshot is on the timeline, even if no selected item is
  // in it. An item missing from a day's snapshot has no value that day: it's
  // left out rather than filled in, so charts and exports never show an item
  // before it appeared or after it dropped out of HiveOS's stats.
  const byDate: Record<string, Record<string, number[]>> = {};
  for (const item of items) {
    const date = item.snapshot.split(" ")[0];
    if (!byDate[date]) byDate[date] = {};
    if (!nameSet.has(item.name)) continue;
    if (!byDate[date][item.name]) byDate[date][item.name] = [];
    byDate[date][item.name].push(item.amount);
  }

  // Aggregate: mean per day
  return Object.keys(byDate).sort().map((date) => {
    const point: TimeSeriesPoint = { date };
    for (const name of selectedNames) {
      const vals = byDate[date][name];
      if (vals && vals.length > 0) {
        point[name] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
      }
    }
    return point;
  });
}

export interface SnapshotDiffRow {
  name: string;
  previous: number;
  latest: number;
  change: number;
  status: "new" | "dropped" | "";
}

/**
 * Change per item between the two newest snapshots that have data for this
 * category. An item missing from one of them counts as 0 there. Sorted by size
 * of change, largest first.
 */
export function getSnapshotDiff(category: CategoryKey): {
  previousDate: string | null;
  latestDate: string | null;
  rows: SnapshotDiffRow[];
} {
  const withData = readAllSnapshots().filter(
    (s) => s?.[category] && Object.keys(s[category]).length > 0
  );
  if (withData.length < 2) {
    const only = withData[0]?.[category];
    const latestDate = only ? Object.values(only)[0].snapshot : null;
    return { previousDate: null, latestDate, rows: [] };
  }

  const prev = Object.values(withData[withData.length - 2][category]);
  const last = Object.values(withData[withData.length - 1][category]);
  const prevByName = new Map(prev.map((i) => [i.name, i.amount]));
  const lastByName = new Map(last.map((i) => [i.name, i.amount]));
  const round = (n: number) => Math.round(n * 100) / 100;

  const rows = [...new Set([...prevByName.keys(), ...lastByName.keys()])].map((name) => {
    const previous = round(prevByName.get(name) ?? 0);
    const latest = round(lastByName.get(name) ?? 0);
    const status: SnapshotDiffRow["status"] = !prevByName.has(name)
      ? "new"
      : !lastByName.has(name)
        ? "dropped"
        : "";
    return { name, previous, latest, change: round(latest - previous), status };
  });
  rows.sort((a, b) => Math.abs(b.change) - Math.abs(a.change) || a.name.localeCompare(b.name));

  return { previousDate: prev[0].snapshot, latestDate: last[0].snapshot, rows };
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
  const snapshots = readAllSnapshots();

  // Newest snapshot that actually contains items; the timestamp lives on each item
  for (let i = snapshots.length - 1; i >= 0; i--) {
    const data = snapshots[i];
    for (const cat of Object.values(data ?? {})) {
      const firstItem = cat ? Object.values(cat)[0] : undefined;
      if (firstItem?.snapshot) return { timestamp: firstItem.snapshot, data };
    }
  }
  return null;
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

/**
 * Write a timestamped snapshot file atomically: write to a temp file, then
 * rename. A crash mid-write leaves a stray .tmp, never a truncated .json.
 */
function writeSnapshotFile(prefix: string, content: string): string {
  const dir = dataDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const now = new Date();
  const month = now.toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toLowerCase();
  const ts = now.toISOString().replace("T", "_").replace(/:/g, "-").slice(0, 19);
  const filename = `${prefix}_${month}_${ts}.json`;
  const target = path.join(dir, filename);

  fs.writeFileSync(`${target}.tmp`, content);
  fs.renameSync(`${target}.tmp`, target);
  return filename;
}

export function saveSnapshot(data: CleanedSnapshot): string {
  const filename = writeSnapshotFile("cleaned_data", JSON.stringify(data, null, 2));
  invalidateCache();
  return filename;
}

export function saveRawSnapshot(data: unknown): string {
  return writeSnapshotFile("raw_data", JSON.stringify(data));
}

/** Keep an API response that failed validation, for debugging. Never read by the app. */
export function saveRejectedRawSnapshot(data: unknown): string {
  return writeSnapshotFile("rejected_raw_data", JSON.stringify(data));
}
