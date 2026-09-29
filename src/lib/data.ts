import fs from "fs";
import path from "path";
import type { CleanedSnapshot, CategoryKey, DataItem, TimeSeriesPoint } from "@/types";

export function dataDir(): string {
  return process.env.DATA_DIR ?? path.join(process.cwd(), "data");
}

// ─── Cache Layer ──────────────────────────────────────────────
// Each snapshot file is parsed once and kept in memory. On every read the
// directory listing is compared with what's loaded: new files are parsed,
// removed ones dropped. Everything derived from the snapshots is cached per
// data version, so it's rebuilt only when the set of files changes.

const parsedFiles = new Map<string, CleanedSnapshot | null>(); // null = unreadable
let loaded: { version: string; snapshots: CleanedSnapshot[] } = { version: "", snapshots: [] };

const categoryDataCache = new Map<CategoryKey, DataItem[]>();
const seriesCache = new Map<CategoryKey, CategorySeries>();
const catalogCache = new Map<CategoryKey, CatalogItem[]>();

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

/** Identifies the current set of snapshot files; changes when one is added or removed. */
export function getDataVersion(): string {
  const files = getCleanedFiles();
  return files.length > 0 ? `${files[files.length - 1]}#${files.length}` : "";
}

export function readAllSnapshots(): CleanedSnapshot[] {
  const files = getCleanedFiles();
  const version = files.length > 0 ? `${files[files.length - 1]}#${files.length}` : "";
  if (version === loaded.version) return loaded.snapshots;

  const current = new Set(files);
  for (const file of parsedFiles.keys()) {
    if (!current.has(file)) parsedFiles.delete(file);
  }

  const snapshots: CleanedSnapshot[] = [];
  for (const file of files) {
    if (!parsedFiles.has(file)) {
      // Skip unreadable files so one corrupt snapshot can't take down every page
      try {
        parsedFiles.set(file, JSON.parse(fs.readFileSync(path.join(dataDir(), file), "utf-8")));
      } catch (err) {
        console.error(`[Data] Skipping unreadable snapshot ${file}:`, (err as Error).message);
        parsedFiles.set(file, null);
      }
    }
    const snap = parsedFiles.get(file);
    if (snap) snapshots.push(snap);
  }

  loaded = { version, snapshots };
  categoryDataCache.clear();
  seriesCache.clear();
  catalogCache.clear();
  return snapshots;
}

export function getCategoryData(category: CategoryKey): DataItem[] {
  const snapshots = readAllSnapshots();
  const cached = categoryDataCache.get(category);
  if (cached) return cached;

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

/**
 * One category as daily columns: every day with a snapshot, and for each item
 * its mean share that day (NaN on days it wasn't in HiveOS's stats).
 */
export interface CategorySeries {
  dates: string[];
  names: string[];
  values: Map<string, Float64Array>;
}

export function getCategorySeries(category: CategoryKey): CategorySeries {
  const snapshots = readAllSnapshots();
  const cached = seriesCache.get(category);
  if (cached) return cached;

  const dateSet = new Set<string>();
  for (const snap of snapshots) {
    for (const item of Object.values(snap[category] ?? {})) dateSet.add(item.snapshot.split(" ")[0]);
  }
  const dates = [...dateSet].sort();
  const dateIndex = new Map(dates.map((d, i) => [d, i]));

  // Several snapshots on one day are averaged
  const sums = new Map<string, Float64Array>();
  const counts = new Map<string, Uint16Array>();
  for (const snap of snapshots) {
    for (const item of Object.values(snap[category] ?? {})) {
      const i = dateIndex.get(item.snapshot.split(" ")[0])!;
      let sum = sums.get(item.name);
      if (!sum) {
        sums.set(item.name, (sum = new Float64Array(dates.length)));
        counts.set(item.name, new Uint16Array(dates.length));
      }
      sum[i] += item.amount;
      counts.get(item.name)![i] += 1;
    }
  }

  const values = new Map<string, Float64Array>();
  for (const [name, sum] of sums) {
    const count = counts.get(name)!;
    for (let i = 0; i < sum.length; i++) {
      sum[i] = count[i] > 0 ? Math.round((sum[i] / count[i]) * 100) / 100 : NaN;
    }
    values.set(name, sum);
  }

  const series = { dates, names: [...values.keys()].sort(), values };
  seriesCache.set(category, series);
  return series;
}

export function getUniqueNames(category: CategoryKey): string[] {
  return getCategorySeries(category).names;
}

/**
 * Daily points for the selected items. Every day with a snapshot is on the
 * timeline; an item missing from a day's snapshot has no value that day. It's
 * left out rather than filled in, so charts and exports never show an item
 * before it appeared or after it dropped out of HiveOS's stats.
 */
export function getTimeSeries(
  category: CategoryKey,
  selectedNames: string[],
  { from }: { from?: string | null } = {}
): TimeSeriesPoint[] {
  const { dates, values } = getCategorySeries(category);
  const start = from ? dates.findIndex((d) => d >= from) : 0;
  if (start < 0) return [];
  const columns = selectedNames
    .map((name) => [name, values.get(name)] as const)
    .filter((c): c is readonly [string, Float64Array] => c[1] !== undefined);

  return dates.slice(start).map((date, offset) => {
    const i = start + offset;
    const point: TimeSeriesPoint = { date };
    for (const [name, column] of columns) {
      if (!Number.isNaN(column[i])) point[name] = column[i];
    }
    return point;
  });
}

export interface CatalogItem {
  name: string;
  /** Share in the latest snapshot, or null if the item has dropped out. */
  current: number | null;
  /** Last day the item was in HiveOS's stats. */
  lastSeen: string;
  /** Highest daily share ever. */
  peak: number;
  /** Original HiveOS spelling, when it differs from the name (see labels.ts). */
  label?: string;
}

/**
 * Every item ever seen in a category: active items first (largest current
 * share first), then items that have dropped out (most recently seen first).
 */
export function getItemCatalog(category: CategoryKey): CatalogItem[] {
  const { dates, values } = getCategorySeries(category);
  const cached = catalogCache.get(category);
  if (cached) return cached;

  const last = dates.length - 1;
  const items: CatalogItem[] = [];
  for (const [name, column] of values) {
    let lastIndex = -1;
    let peak = 0;
    for (let i = 0; i < column.length; i++) {
      if (Number.isNaN(column[i])) continue;
      lastIndex = i;
      if (column[i] > peak) peak = column[i];
    }
    if (lastIndex < 0) continue;
    items.push({
      name,
      current: lastIndex === last ? column[last] : null,
      lastSeen: dates[lastIndex],
      peak,
    });
  }
  items.sort((a, b) => {
    if (a.current !== null && b.current !== null) return b.current - a.current || a.name.localeCompare(b.name);
    if (a.current !== null) return -1;
    if (b.current !== null) return 1;
    return b.lastSeen.localeCompare(a.lastSeen) || b.peak - a.peak;
  });

  catalogCache.set(category, items);
  return items;
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

// ─── Dashboard Helpers ────────────────────────────────────────

/** An item's daily share over the last `days` snapshot days (days it was absent are skipped). */
export function getRecentValues(category: CategoryKey, name: string, days = 30): { value: number }[] {
  const column = getCategorySeries(category).values.get(name);
  if (!column) return [];
  const values: { value: number }[] = [];
  for (let i = Math.max(0, column.length - days); i < column.length; i++) {
    if (!Number.isNaN(column[i])) values.push({ value: column[i] });
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
  return writeSnapshotFile("cleaned_data", JSON.stringify(data, null, 2));
}

export function saveRawSnapshot(data: unknown): string {
  return writeSnapshotFile("raw_data", JSON.stringify(data));
}

/** Keep an API response that failed validation, for debugging. Never read by the app. */
export function saveRejectedRawSnapshot(data: unknown): string {
  return writeSnapshotFile("rejected_raw_data", JSON.stringify(data));
}
