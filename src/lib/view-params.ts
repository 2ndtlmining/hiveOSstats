import type { CatalogItem } from "./data";
import { DEFAULT_RANGE, isRange, type Range } from "./ranges";
import { isCategory, MAX_SERIES_NAMES } from "./snapshots-query";
import type { CategoryKey } from "@/types";

/**
 * Read a view's state from URL params, ignoring anything invalid: an unknown
 * category falls back to the default, and names not in the catalog are dropped.
 */
export function parseViewParams(
  params: { cat?: string; range?: string },
  getCatalog: (category: CategoryKey) => CatalogItem[],
  defaultRange: Range = DEFAULT_RANGE
) {
  const category: CategoryKey = isCategory(params.cat) ? params.cat : "coins";
  const range: Range = isRange(params.range) ? params.range : defaultRange;
  const catalog = getCatalog(category);
  const known = new Set(catalog.map((i) => i.name));
  const pickNames = (value: string | undefined, max = MAX_SERIES_NAMES) =>
    [...new Set((value ?? "").split(",").map((n) => n.trim()))].filter((n) => known.has(n)).slice(0, max);
  return { category, range, catalog, pickNames };
}
