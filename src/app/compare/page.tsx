import { getUniqueNames } from "@/lib/data";
import { CATEGORIES } from "@/types";
import { CompareClient } from "./compare-client";

export const dynamic = "force-dynamic";

export default function ComparePage() {
  const namesByCategory: Record<string, string[]> = {};
  for (const cat of CATEGORIES) {
    namesByCategory[cat.value] = getUniqueNames(cat.value);
  }

  return <CompareClient namesByCategory={namesByCategory} />;
}
