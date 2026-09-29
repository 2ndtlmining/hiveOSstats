"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, Minus, Plus, TrendingDown, TrendingUp, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartEmpty, ChartError } from "@/components/chart-status";
import { CopyLinkButton } from "@/components/copy-link-button";
import { RangePicker } from "@/components/range-picker";
import { useApi } from "@/hooks/use-api";
import { useCatalog } from "@/hooks/use-catalog";
import { cn } from "@/lib/utils";
import type { CatalogItem } from "@/lib/data";
import type { RangedSeries } from "@/lib/series";
import { DEFAULT_RANGE, RANGE_LABELS, type Range } from "@/lib/ranges";
import { replaceQuery } from "@/lib/url-state";
import { MAX_COMPARE_ITEMS } from "@/lib/snapshots-query";
import { CATEGORIES } from "@/types";
import type { CategoryKey, TimeSeriesPoint } from "@/types";

// Recharts is large; only load it once there's a chart to draw
const LineChart = dynamic(
  () => import("@/components/charts/line-chart").then((m) => m.LineChart),
  { ssr: false, loading: () => <div className="h-[350px] animate-pulse rounded-md bg-muted/30" /> }
);

interface CompareClientProps {
  initialCategory: CategoryKey;
  initialItems: string[];
  initialRange: Range;
  initialCatalog: CatalogItem[];
}

const selectClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-hiveos";

function ItemSelect({
  id,
  label,
  value,
  onChange,
  onRemove,
  catalog,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onRemove?: () => void;
  catalog: CatalogItem[];
}) {
  const active = catalog.filter((i) => i.current !== null);
  const historical = catalog.filter((i) => i.current === null);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label htmlFor={id} className="block text-xs font-medium text-muted-foreground">
          {label}
        </label>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${label}`}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        )}
      </div>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        <option value="">Select...</option>
        <optgroup label="In the latest snapshot">
          {active.map((i) => (
            <option key={i.name} value={i.name}>
              {i.label ?? i.name} ({i.current}%)
            </option>
          ))}
        </optgroup>
        {historical.length > 0 && (
          <optgroup label="No longer in HiveOS's stats">
            {historical.map((i) => (
              <option key={i.name} value={i.name}>
                {i.label ?? i.name} (last seen {i.lastSeen})
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}

/** First value in the range, the latest value (0 if absent), and the change between them. */
function summarize(points: TimeSeriesPoint[], name: string) {
  const firstPoint = points.find((p) => p[name] !== undefined);
  const first = (firstPoint?.[name] as number | undefined) ?? 0;
  const last = (points[points.length - 1]?.[name] as number | undefined) ?? 0;
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    name,
    firstDate: firstPoint?.date ?? null,
    first: round(first),
    last: round(last),
    change: round(last - first),
    relative: first > 0 ? round(((last - first) / first) * 100) : null,
  };
}

export function CompareClient({ initialCategory, initialItems, initialRange, initialCatalog }: CompareClientProps) {
  const [category, setCategory] = useState<CategoryKey>(initialCategory);
  // One entry per picker; "" is an empty picker. Always at least two.
  const [items, setItems] = useState<string[]>(() => [...initialItems, "", ""].slice(0, Math.max(2, initialItems.length)));
  const [range, setRange] = useState<Range>(initialRange);

  const catalog = useCatalog(category, initialCategory, initialCatalog);
  const selected = [...new Set(items.filter(Boolean))];
  const setItem = (index: number, value: string) => setItems((prev) => prev.map((v, i) => (i === index ? value : v)));
  const seriesUrl =
    selected.length > 0
      ? `/api/snapshots?${new URLSearchParams({ category, names: selected.join(","), range })}`
      : null;
  const series = useApi<RangedSeries>(seriesUrl);

  useEffect(() => {
    replaceQuery({
      cat: category,
      items: items.filter(Boolean).join(",") || null,
      range: range === DEFAULT_RANGE ? null : range,
    });
  }, [category, items, range]);

  function handleCategoryChange(val: string) {
    setCategory(val as CategoryKey);
    setItems(["", ""]);
  }

  const points = series.data?.points ?? [];
  const summaries = points.length >= 2 ? selected.map((name) => summarize(points, name)) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compare</h1>
          <p className="text-sm text-muted-foreground">
            Compare up to {MAX_COMPARE_ITEMS} items in the same category over a time range.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RangePicker value={range} onChange={setRange} />
          <CopyLinkButton />
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pb-4 pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="compare-category" className="mb-1 block text-xs font-medium text-muted-foreground">
                Category
              </label>
              <select
                id="compare-category"
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className={selectClass}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            {items.map((value, i) => (
              <ItemSelect
                key={i}
                id={`compare-item-${i}`}
                label={`Item ${String.fromCharCode(65 + i)}`}
                value={value}
                onChange={(v) => setItem(i, v)}
                onRemove={items.length > 2 ? () => setItems((prev) => prev.filter((_, j) => j !== i)) : undefined}
                catalog={catalog.catalog}
              />
            ))}
            {items.length < MAX_COMPARE_ITEMS && (
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setItems((prev) => [...prev, ""])}
                  className="inline-flex h-[38px] w-full items-center justify-center gap-1 rounded-md border border-dashed border-border text-sm text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Add item
                </button>
              </div>
            )}
          </div>
          {catalog.error && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              Couldn&apos;t load items: {catalog.error}.{" "}
              <button type="button" className="underline" onClick={catalog.retry}>Retry</button>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">
            Comparison Chart
            {series.data?.resolution === "weekly" && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">weekly averages</span>
            )}
          </CardTitle>
          {series.loading && (
            <div role="status" className="flex items-center gap-1 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Loading...
            </div>
          )}
        </CardHeader>
        <CardContent className="pb-4">
          {selected.length === 0 ? (
            <ChartEmpty>No data to display. Select items above.</ChartEmpty>
          ) : series.error ? (
            <ChartError message={series.error} onRetry={series.retry} />
          ) : !series.data ? (
            <div className="h-[350px] animate-pulse rounded-md bg-muted/30" aria-label="Loading chart" />
          ) : (
            <div className={cn("transition-opacity", series.loading && "opacity-50")}>
              <LineChart data={points} selectedNames={selected} labels={series.data?.labels} height={350} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Summary Cards */}
      {summaries.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map((row) => {
            const isPositive = row.change > 0;
            const isNeutral = row.change === 0;
            const tone = isNeutral ? "text-muted-foreground" : isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
            const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
            return (
              <Card key={row.name}>
                <CardContent className="pb-4 pt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{series.data?.labels[row.name] ?? row.name}</h3>
                    <div
                      className={cn("flex items-center gap-1 text-sm font-medium", tone)}
                      title="Percentage points: the difference between the two shares (e.g. 38% → 41% is +3 pp)"
                    >
                      <Icon className="h-3 w-3" aria-hidden />
                      {isPositive ? "+" : ""}
                      {row.change} pp
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">
                        {row.firstDate === points[0]?.date ? `Start of ${RANGE_LABELS[range]}` : `First seen ${row.firstDate}`}
                      </p>
                      <p className="font-medium tabular-nums">{row.first}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Latest</p>
                      <p className="font-medium tabular-nums">{row.last}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Relative change</p>
                      <p className={cn("font-medium tabular-nums", tone)}>
                        {row.relative === null ? "–" : `${isPositive ? "+" : ""}${row.relative}%`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
