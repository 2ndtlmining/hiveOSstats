import { getItemCatalog } from "@/lib/data";
import { parseViewParams } from "@/lib/view-params";
import { ExplorerClient } from "./explorer-client";

export const dynamic = "force-dynamic";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; items?: string; range?: string }>;
}) {
  const params = await searchParams;
  const { category, range, catalog, pickNames } = parseViewParams(params, getItemCatalog);

  return (
    <ExplorerClient
      initialCategory={category}
      initialItems={pickNames(params.items)}
      initialRange={range}
      initialCatalog={catalog}
    />
  );
}
