import type { CategoryKey } from "@/types";

/** Explorer URL with items preselected, e.g. /explore?cat=coins&items=XMR%2CPRL */
export function explorerHref(category: CategoryKey, items: string[] = [], range?: string): string {
  const params = new URLSearchParams({ cat: category });
  if (items.length > 0) params.set("items", items.join(","));
  if (range) params.set("range", range);
  return `/explore?${params}`;
}
