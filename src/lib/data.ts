import fs from "fs";
import path from "path";
import type { CleanedSnapshot, CategoryKey, DataItem, TimeSeriesPoint } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");

export function getCleanedFiles(): string[] {
  if (!fs.existsSync(DATA_DIR)) return [];
  return fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.startsWith("cleaned_data") && f.endsWith(".json"))
    .sort();
}

export function readAllSnapshots(): CleanedSnapshot[] {
  return getCleanedFiles().map((file) => {
    const raw = fs.readFileSync(path.join(DATA_DIR, file), "utf-8");
    return JSON.parse(raw) as CleanedSnapshot;
  });
}

export function getCategoryData(category: CategoryKey): DataItem[] {
  const snapshots = readAllSnapshots();
  const items: DataItem[] = [];

  for (const snap of snapshots) {
    const cat = snap[category];
    if (!cat) continue;
    for (const item of Object.values(cat)) {
      items.push({ name: item.name, amount: item.amount, snapshot: item.snapshot });
    }
  }

  return items;
}

export function getUniqueNames(category: CategoryKey): string[] {
  const items = getCategoryData(category);
  return [...new Set(items.map((i) => i.name))].sort();
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
    const date = item.snapshot.split(" ")[0]; // YYYY-MM-DD
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
    // Backward fill
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

export function getLatestSnapshot(): { timestamp: string; data: CleanedSnapshot } | null {
  const files = getCleanedFiles();
  if (files.length === 0) return null;

  const lastFile = files[files.length - 1];
  const raw = fs.readFileSync(path.join(DATA_DIR, lastFile), "utf-8");
  const data = JSON.parse(raw) as CleanedSnapshot;

  // Get timestamp from first item of first category
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
