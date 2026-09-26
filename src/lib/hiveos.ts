import type { RawSnapshot, CleanedSnapshot, CleanedCategory, CategoryKey } from "@/types";
import { CATEGORIES } from "@/types";

const API_URL = "https://api2.hiveos.farm/api/v2/hive/stats";
const FETCH_TIMEOUT_MS = 30_000;

const NAMES_TO_REMOVE = new Set(["SMH 永州"]);

export async function fetchFromApi(): Promise<RawSnapshot | null> {
  try {
    const res = await fetch(API_URL, { cache: "no-store", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("HiveOS API error:", err);
    return null;
  }
}

/**
 * Check an API response has the shape cleanData() expects.
 * Returns a list of problems; empty means valid.
 */
export function validateRawSnapshot(data: unknown): string[] {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return ["response is not a JSON object"];
  }

  const errors: string[] = [];
  for (const { value: key } of CATEGORIES) {
    const items = (data as Record<string, unknown>)[key];
    if (!Array.isArray(items) || items.length === 0) {
      errors.push(`${key}: expected a non-empty array`);
      continue;
    }
    items.forEach((item, i) => {
      const { name, amount } = (item ?? {}) as { name?: unknown; amount?: unknown };
      if (typeof name !== "string") {
        errors.push(`${key}[${i}]: name must be a string`);
      } else if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0 || amount > 1) {
        errors.push(`${key}[${i}] (${name}): amount must be a number between 0 and 1, got ${String(amount)}`);
      }
    });
  }
  return errors;
}

export function cleanData(data: RawSnapshot): CleanedSnapshot {
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  const cleaned: Partial<CleanedSnapshot> = {};

  for (const { value: setName } of CATEGORIES) {
    const items = data[setName];
    if (!Array.isArray(items)) continue;
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
