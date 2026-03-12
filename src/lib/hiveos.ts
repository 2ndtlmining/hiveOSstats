import type { RawSnapshot, CleanedSnapshot, CleanedCategory, CategoryKey } from "@/types";

const API_URL = "https://api2.hiveos.farm/api/v2/hive/stats";

const NAMES_TO_REMOVE = new Set(["SMH 永州"]);

export async function fetchFromApi(): Promise<RawSnapshot | null> {
  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("HiveOS API error:", err);
    return null;
  }
}

export function cleanData(data: RawSnapshot): CleanedSnapshot {
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  const cleaned: Partial<CleanedSnapshot> = {};

  for (const [setName, items] of Object.entries(data)) {
    const cleanedSet: CleanedCategory = {};

    for (const item of items) {
      const { name, amount } = item;
      if (!name || typeof name !== "string") continue;

      const cleanName = name
        .replace(/[^\w\s\p{L}]/gu, "_")
        .toUpperCase();

      if (NAMES_TO_REMOVE.has(cleanName)) continue;

      const pct = amount * 100;
      if (cleanName in cleanedSet) {
        cleanedSet[cleanName].amount += pct;
      } else {
        cleanedSet[cleanName] = { name: cleanName, amount: pct, snapshot: timestamp };
      }
    }

    cleaned[setName as CategoryKey] = cleanedSet;
  }

  return cleaned as CleanedSnapshot;
}
