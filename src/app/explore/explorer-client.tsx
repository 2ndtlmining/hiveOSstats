"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartEmpty, ChartError } from "@/components/chart-status";
import { CopyLinkButton } from "@/components/copy-link-button";
import { RangePicker } from "@/components/range-picker";
import { useApi } from "@/hooks/use-api";
import { useCatalog } from "@/hooks/use-catalog";
import { cn } from "@/lib/utils";
import type { CatalogItem } from "@/lib/data";
import type { RangedSeries } from "@/lib/series";
import { DEFAULT_RANGE, type Range } from "@/lib/ranges";
import { MAX_SERIES_NAMES } from "@/lib/snapshots-query";
import { replaceQuery } from "@/lib/url-state";
import { CATEGORIES } from "@/types";
import type { CategoryKey } from "@/types";

// Recharts is large; only load it once there's a chart to draw
const LineChart = dynamic(
  () => import("@/components/charts/line-chart").then((m) => m.LineChart),
  { ssr: false, loading: () => <div className="h-[350px] animate-pulse rounded-md bg-muted/30" /> }
);

interface ExplorerClientProps {
  initialCategory: CategoryKey;
  initialItems: string[];
  initialRange: Range;
  initialCatalog: CatalogItem[];
}

export function ExplorerClient({ initialCategory, initialItems, initialRange, initialCatalog }: ExplorerClientProps) {
  const [category, setCategory] = useState<CategoryKey>(initialCategory);
  const [selected, setSelected] = useState<string[]>(initialItems);
  const [range, setRange] = useState<Range>(initialRange);
  const [search, setSearch] = useState("");
  const [showHistorical, setShowHistorical] = useState(false);

  const catalog = useCatalog(category, initialCategory, initialCatalog);
  const seriesUrl =
    selected.length > 0
      ? `/api/snapshots?${new URLSearchParams({ category, names: selected.join(","), range })}`
      : null;
  const series = useApi<RangedSeries>(seriesUrl);

  // Keep the URL in sync so the view survives a refresh and can be shared
  useEffect(() => {
    replaceQuery({
      cat: category,
      items: selected.join(",") || null,
      range: range === DEFAULT_RANGE ? null : range,
    });
  }, [category, selected, range]);

  function toggleItem(name: string) {
    setSelected((prev) =>
      prev.includes(name)
        ? prev.filter((n) => n !== name)
        : prev.length < MAX_SERIES_NAMES
          ? [...prev, name]
          : prev
    );
  }

  function handleCategoryChange(val: string) {
    setCategory(val as CategoryKey);
    setSelected([]);
    setSearch("");
    setShowHistorical(false);
  }

  const categoryLabel = CATEGORIES.find((c) => c.value === category)?.label;
  const labels = series.data?.labels ?? {};
  const catalogLabels = Object.fromEntries(catalog.catalog.map((i) => [i.name, i.label ?? i.name]));
  const labelOf = (name: string) => labels[name] ?? catalogLabels[name] ?? name;
  const points = series.data?.points ?? [];
  const weekly = series.data?.resolution === "weekly";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Explorer</h1>
          <p className="text-sm text-muted-foreground">
            Select a category and items to visualize trends over time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RangePicker value={range} onChange={setRange} />
          <CopyLinkButton />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={category} onValueChange={handleCategoryChange}>
        <TabsList className="flex h-auto flex-wrap gap-1">
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value} className="text-xs">
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Selected items as removable chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Selected{selected.length >= MAX_SERIES_NAMES ? ` (maximum of ${MAX_SERIES_NAMES})` : ""}:
          </span>
          {selected.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => toggleItem(name)}
              aria-label={`Remove ${labelOf(name)}`}
              className="inline-flex items-center gap-1 rounded-full bg-hiveos px-2.5 py-0.5 text-xs font-semibold text-black hover:bg-hiveos/80"
            >
              {labelOf(name)}
              <X className="h-3 w-3" aria-hidden />
            </button>
          ))}
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelected([])}>
            Clear all
          </Button>
        </div>
      )}

      {/* Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">
            {categoryLabel} Over Time
            {weekly && <span className="ml-2 text-xs font-normal text-muted-foreground">weekly averages</span>}
          </CardTitle>
          {series.loading && (
            <div role="status" className="flex items-center gap-1 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Loading...
            </div>
          )}
        </CardHeader>
        <CardContent className="pb-4">
          {selected.length === 0 ? (
            <ChartEmpty>No data to display. Select items below.</ChartEmpty>
          ) : series.error ? (
            <ChartError message={series.error} onRetry={series.retry} />
          ) : !series.data ? (
            <div className="h-[350px] animate-pulse rounded-md bg-muted/30" aria-label="Loading chart" />
          ) : (
            <div className={cn("transition-opacity", series.loading && "opacity-50")}>
              <LineChart data={points} selectedNames={selected} labels={labels} height={350} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Item Selection + Data Table side by side on desktop */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ItemPicker
          catalog={catalog.catalog}
          loading={catalog.loading}
          error={catalog.error}
          onRetry={catalog.retry}
          selected={selected}
          onToggle={toggleItem}
          search={search}
          onSearch={setSearch}
          showHistorical={showHistorical}
          onShowHistorical={setShowHistorical}
        />

        {selected.length > 0 && points.length > 0 && !series.error && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Data Table
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  latest 30 {weekly ? "weeks" : "days"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="max-h-[280px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border">
                      <th className="pb-2 text-left font-medium text-muted-foreground">
                        {weekly ? "Week of" : "Date"}
                      </th>
                      {selected.map((name) => (
                        <th key={name} className="pb-2 text-right font-medium text-muted-foreground">
                          {labelOf(name)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {points.slice(-30).reverse().map((row) => (
                      <tr key={row.date} className="border-b border-border/30">
                        <td className="whitespace-nowrap py-1.5">{row.date}</td>
                        {selected.map((name) => (
                          <td key={name} className="py-1.5 text-right tabular-nums">
                            {row[name] !== undefined ? `${row[name]}%` : "–"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ItemButton({
  item,
  selected,
  onToggle,
}: {
  item: CatalogItem;
  selected: boolean;
  onToggle: (name: string) => void;
}) {
  const historical = item.current === null;
  return (
    <button
      type="button"
      onClick={() => onToggle(item.name)}
      aria-pressed={selected}
      title={
        historical
          ? `No longer in HiveOS's stats. Last seen ${item.lastSeen}, peak ${item.peak}%`
          : `${item.current}% now, peak ${item.peak}%`
      }
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
        selected
          ? "border-transparent bg-hiveos text-black"
          : "border-border hover:bg-hiveos/20",
        historical && !selected && "border-dashed text-muted-foreground"
      )}
    >
      {item.label ?? item.name}
      {!historical && <span className={cn("tabular-nums", selected ? "text-black/70" : "text-muted-foreground")}>{item.current}%</span>}
    </button>
  );
}

function ItemPicker({
  catalog,
  loading,
  error,
  onRetry,
  selected,
  onToggle,
  search,
  onSearch,
  showHistorical,
  onShowHistorical,
}: {
  catalog: CatalogItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  selected: string[];
  onToggle: (name: string) => void;
  search: string;
  onSearch: (value: string) => void;
  showHistorical: boolean;
  onShowHistorical: (value: boolean) => void;
}) {
  const query = search.trim().toLowerCase();
  const { active, historical } = useMemo(() => {
    const matches = query
      ? catalog.filter((i) => i.name.toLowerCase().includes(query) || i.label?.toLowerCase().includes(query))
      : catalog;
    return {
      active: matches.filter((i) => i.current !== null),
      historical: matches.filter((i) => i.current === null),
    };
  }, [catalog, query]);
  const selectedSet = new Set(selected);
  const historicalVisible = showHistorical || query !== "";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Select Items</CardTitle>
        <input
          type="search"
          placeholder="Search all items, including ones no longer tracked..."
          aria-label="Search items"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="mt-2 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-hiveos"
        />
      </CardHeader>
      <CardContent>
        {error ? (
          <ChartError message={error} onRetry={onRetry} height={120} />
        ) : loading && catalog.length === 0 ? (
          <div className="h-[120px] animate-pulse rounded-md bg-muted/30" />
        ) : (
          <div className="max-h-[300px] space-y-3 overflow-y-auto">
            {active.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {active.map((item) => (
                  <ItemButton key={item.name} item={item} selected={selectedSet.has(item.name)} onToggle={onToggle} />
                ))}
              </div>
            )}
            {historical.length > 0 &&
              (historicalVisible ? (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    No longer in HiveOS&apos;s stats (most recently seen first):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {historical.map((item) => (
                      <ItemButton key={item.name} item={item} selected={selectedSet.has(item.name)} onToggle={onToggle} />
                    ))}
                  </div>
                </div>
              ) : (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onShowHistorical(true)}>
                  Show {historical.length.toLocaleString()} items no longer in HiveOS&apos;s stats
                </Button>
              ))}
            {active.length === 0 && historical.length === 0 && (
              <p className="text-sm text-muted-foreground">No items found.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
