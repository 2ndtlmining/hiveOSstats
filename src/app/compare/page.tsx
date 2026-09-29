import { getItemCatalog } from "@/lib/data";
import { withLabels } from "@/lib/labels";
import { parseViewParams } from "@/lib/view-params";
import { CompareClient } from "./compare-client";

export const dynamic = "force-dynamic";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; a?: string; b?: string; range?: string }>;
}) {
  const params = await searchParams;
  const { category, range, catalog, pickNames } = parseViewParams(params, (cat) => withLabels(cat, getItemCatalog(cat)));

  return (
    <CompareClient
      initialCategory={category}
      initialA={pickNames(params.a, 1)[0] ?? ""}
      initialB={pickNames(params.b, 1)[0] ?? ""}
      initialRange={range}
      initialCatalog={catalog}
    />
  );
}
