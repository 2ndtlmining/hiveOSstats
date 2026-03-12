import { getLatestSnapshot } from "@/lib/data";
import { CATEGORIES } from "@/types";
import { CompareClient } from "./compare-client";

export const dynamic = "force-dynamic";

export default function ComparePage() {
  const latest = getLatestSnapshot();
  const namesByCategory: Record<string, string[]> = {};

  for (const cat of CATEGORIES) {
    if (latest) {
      const catData = latest.data[cat.value];
      namesByCategory[cat.value] = catData
        ? Object.values(catData).map((i) => i.name).sort()
        : [];
    } else {
      namesByCategory[cat.value] = [];
    }
  }

  return <CompareClient namesByCategory={namesByCategory} />;
}
