import { getUniqueNames } from "@/lib/data";
import { CATEGORIES } from "@/types";
import { ExplorerClient } from "./explorer-client";

export const dynamic = "force-dynamic";

export default function ExplorePage() {
  // Pre-load names for all categories
  const namesByCategory: Record<string, string[]> = {};
  for (const cat of CATEGORIES) {
    namesByCategory[cat.value] = getUniqueNames(cat.value);
  }

  return <ExplorerClient namesByCategory={namesByCategory} />;
}
