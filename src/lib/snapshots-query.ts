import { CATEGORIES, type CategoryKey } from "@/types";

/** Most items a single series request may ask for. */
export const MAX_SERIES_NAMES = 20;

export type SnapshotsQuery =
  | { action: "summary" }
  | { action: "latest"; category: CategoryKey | null }
  | { action: "names"; category: CategoryKey }
  | { action: "series"; category: CategoryKey; names: string[] };

const CATEGORY_KEYS = new Set<string>(CATEGORIES.map((c) => c.value));
const ACTIONS = ["summary", "latest", "names", "series"];

function isCategory(value: string | null): value is CategoryKey {
  return value !== null && CATEGORY_KEYS.has(value);
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
  if (action === "names") return { action, category };

  const names = [...new Set((rawNames ?? "").split(",").map((n) => n.trim()).filter(Boolean))];
  if (names.length === 0) return { error: "names is required: a comma-separated list" };
  if (names.length > MAX_SERIES_NAMES) {
    return { error: `At most ${MAX_SERIES_NAMES} names per request (got ${names.length})` };
  }
  return { action: "series", category, names };
}
