import { getItemCatalog } from "@/lib/data";
import { withLabels } from "@/lib/labels";
import { parseViewParams } from "@/lib/view-params";
import { MAX_COMPARE_ITEMS } from "@/lib/snapshots-query";
import { CompareClient } from "./compare-client";

export const dynamic = "force-dynamic";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; items?: string; a?: string; b?: string; range?: string }>;
}) {
  const params = await searchParams;
  const { category, range, catalog, pickNames } = parseViewParams(params, (cat) => withLabels(cat, getItemCatalog(cat)));

  return (
    <CompareClient
      initialCategory={category}
      // ?items=A,B,C; ?a=&b= links from before multi-item compare still work
      initialItems={pickNames(params.items ?? [params.a, params.b].filter(Boolean).join(","), MAX_COMPARE_ITEMS)}
      initialRange={range}
      initialCatalog={catalog}
    />
  );
}
