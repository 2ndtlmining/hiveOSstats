import { CATEGORIES, type CategoryKey } from "@/types";
import { DEFAULT_RANGE, isRange, RANGES, type Range } from "./ranges";

/** Most items a single series request may ask for. */
export const MAX_SERIES_NAMES = 20;

export type SnapshotsQuery =
  | { action: "summary" }
  | { action: "latest"; category: CategoryKey | null }
  | { action: "names"; category: CategoryKey }
  | { action: "catalog"; category: CategoryKey }
  | { action: "series"; category: CategoryKey; names: string[]; range: Range };

const CATEGORY_KEYS = new Set<string>(CATEGORIES.map((c) => c.value));
const ACTIONS = ["summary", "latest", "names", "catalog", "series"];

export function isCategory(value: string | null | undefined): value is CategoryKey {
  return value != null && CATEGORY_KEYS.has(value);
}

/** Validate /api/snapshots query parameters. */
export function parseSnapshotsQuery(params: URLSearchParams): SnapshotsQuery | { error: string } {
  const rawNames = params.get("names");
  const action = params.get("action") ?? (rawNames !== null ? "series" : null);
  const category = params.get("category");

  if (action === null || !ACTIONS.includes(action)) {
    return { error: `action must be one of: ${ACTIONS.join(", ")} (or pass names= for a series)` };
  }
  if (action === "summary") return { action };

  if (category !== null && !isCategory(category)) {
    return { error: `Unknown category "${category}". Valid: ${[...CATEGORY_KEYS].join(", ")}` };
  }
  if (action === "latest") return { action, category };
  if (!isCategory(category)) return { error: "category is required" };
  if (action === "names" || action === "catalog") return { action, category };

  const range = params.get("range") ?? DEFAULT_RANGE;
  if (!isRange(range)) {
    return { error: `Unknown range "${range}". Valid: ${Object.keys(RANGES).join(", ")}` };
  }

  const names = [...new Set((rawNames ?? "").split(",").map((n) => n.trim()).filter(Boolean))];
  if (names.length === 0) return { error: "names is required: a comma-separated list" };
  if (names.length > MAX_SERIES_NAMES) {
    return { error: `At most ${MAX_SERIES_NAMES} names per request (got ${names.length})` };
  }
  return { action: "series", category, names, range };
}
