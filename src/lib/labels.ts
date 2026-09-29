import fs from "fs";
import path from "path";
import type { CategoryKey, RawSnapshot } from "@/types";
import { CATEGORIES } from "@/types";
import { dataDir, parseSnapshotTime, type CatalogItem } from "./data";
import { cleanKey } from "./hiveos";

/**
 * Readable names for items. Items are stored under cleaned keys
 * ("ANTMINER L3_ HIVEON"), but every snapshot also keeps the raw HiveOS
 * response, which has the original spelling ("Antminer L3+ Hiveon"). The most
 * recent spelling for each key wins. Each raw file is read once; later calls
 * only read new files.
 */

type LabelMaps = Record<CategoryKey, Map<string, string>>;

const readFiles = new Set<string>();
const labels: LabelMaps = Object.fromEntries(CATEGORIES.map((c) => [c.value, new Map()])) as LabelMaps;

function rawFiles(): string[] {
  const dir = dataDir();
  if (!fs.existsSync(dir)) return [];
  const time = (f: string) => parseSnapshotTime(f)?.getTime() ?? -Infinity;
  return fs
    .readdirSync(dir)
    .filter((f) => f.startsWith("raw_data") && f.endsWith(".json"))
    .sort((a, b) => time(a) - time(b) || a.localeCompare(b));
}

function refresh() {
  for (const file of rawFiles()) {
    if (readFiles.has(file)) continue;
    readFiles.add(file);
    let raw: RawSnapshot;
    try {
      raw = JSON.parse(fs.readFileSync(path.join(dataDir(), file), "utf-8"));
    } catch {
      continue; // unreadable raw files only cost us labels
    }
    for (const { value: category } of CATEGORIES) {
      const items = raw?.[category];
      if (!Array.isArray(items)) continue;
      // Several spellings can share a key in one snapshot; keep the largest
      const best = new Map<string, { name: string; amount: number }>();
      for (const item of items) {
        if (typeof item?.name !== "string") continue;
        const key = cleanKey(item.name);
        const prev = best.get(key);
        if (!prev || (item.amount ?? 0) > prev.amount) best.set(key, { name: item.name.trim(), amount: item.amount ?? 0 });
      }
      for (const [key, { name }] of best) labels[category].set(key, name);
    }
  }
}

/** Readable names for the given keys, only where they differ from the key. */
export function getDisplayNames(category: CategoryKey, keys: Iterable<string>): Record<string, string> {
  refresh();
  const map = labels[category];
  const result: Record<string, string> = {};
  for (const key of keys) {
    const label = map.get(key);
    if (label && label !== key) result[key] = label;
  }
  return result;
}

/** One readable name, falling back to the key. */
export function displayName(category: CategoryKey, key: string): string {
  return getDisplayNames(category, [key])[key] ?? key;
}

/** Catalog items with their readable names attached. */
export function withLabels(category: CategoryKey, catalog: CatalogItem[]): CatalogItem[] {
  const names = getDisplayNames(category, catalog.map((i) => i.name));
  return catalog.map((i) => (names[i.name] ? { ...i, label: names[i.name] } : i));
}
