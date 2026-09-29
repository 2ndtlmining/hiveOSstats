"use client";

import type { CatalogItem } from "@/lib/data";
import type { CategoryKey } from "@/types";
import { useApi } from "./use-api";

/** Items for a category: the server-provided list for the initial one, fetched for others. */
export function useCatalog(category: CategoryKey, initialCategory: CategoryKey, initialCatalog: CatalogItem[]) {
  const isInitial = category === initialCategory;
  const { data, loading, error, retry } = useApi<CatalogItem[]>(
    isInitial ? null : `/api/snapshots?action=catalog&category=${category}`,
    { debounceMs: 0 }
  );
  return { catalog: isInitial ? initialCatalog : data ?? [], loading, error, retry };
}
