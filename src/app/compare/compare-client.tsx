"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, Minus, TrendingDown, TrendingUp } from "lucide-react";
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
import { CATEGORIES } from "@/types";
import type { CategoryKey, TimeSeriesPoint } from "@/types";

// Recharts is large; only load it once there's a chart to draw
const LineChart = dynamic(
  () => import("@/components/charts/line-chart").then((m) => m.LineChart),
  { ssr: false, loading: () => <div className="h-[350px] animate-pulse rounded-md bg-muted/30" /> }
);

interface CompareClientProps {
  initialCategory: CategoryKey;
  initialA: string;
  initialB: string;
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
  catalog,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  catalog: CatalogItem[];
}) {
  const active = catalog.filter((i) => i.current !== null);
  const historical = catalog.filter((i) => i.current === null);
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        <option value="">Select...</option>
        <optgroup label="In the latest snapshot">
          {active.map((i) => (
            <option key={i.name} value={i.name}>
              {i.name} ({i.current}%)
            </option>
          ))}
        </optgroup>
        {historical.length > 0 && (
          <optgroup label="No longer in HiveOS's stats">
            {historical.map((i) => (
              <option key={i.name} value={i.name}>
                {i.name} (last seen {i.lastSeen})
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

export function CompareClient({ initialCategory, initialA, initialB, initialRange, initialCatalog }: CompareClientProps) {
  const [category, setCategory] = useState<CategoryKey>(initialCategory);
  const [itemA, setItemA] = useState(initialA);
  const [itemB, setItemB] = useState(initialB);
  const [range, setRange] = useState<Range>(initialRange);

  const catalog = useCatalog(category, initialCategory, initialCatalog);
  const selected = [...new Set([itemA, itemB].filter(Boolean))];
  const seriesUrl =
    selected.length > 0
      ? `/api/snapshots?${new URLSearchParams({ category, names: selected.join(","), range })}`
      : null;
  const series = useApi<RangedSeries>(seriesUrl);

  useEffect(() => {
    replaceQuery({
      cat: category,
      a: itemA || null,
      b: itemB || null,
      range: range === DEFAULT_RANGE ? null : range,
    });
  }, [category, itemA, itemB, range]);

  function handleCategoryChange(val: string) {
    setCategory(val as CategoryKey);
    setItemA("");
    setItemB("");
  }

  const points = series.data?.points ?? [];
  const summaries = points.length >= 2 ? selected.map((name) => summarize(points, name)) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compare</h1>
          <p className="text-sm text-muted-foreground">
            Side-by-side comparison of two items in the same category.
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
          <div className="grid gap-3 sm:grid-cols-3">
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
            <ItemSelect id="compare-a" label="Item A" value={itemA} onChange={setItemA} catalog={catalog.catalog} />
            <ItemSelect id="compare-b" label="Item B" value={itemB} onChange={setItemB} catalog={catalog.catalog} />
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
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading...
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
              <LineChart data={points} selectedNames={selected} height={350} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Summary Cards */}
      {summaries.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {summaries.map((row) => {
            const isPositive = row.change > 0;
            const isNeutral = row.change === 0;
            const tone = isNeutral ? "text-muted-foreground" : isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
            const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
            return (
              <Card key={row.name}>
                <CardContent className="pb-4 pt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{row.name}</h3>
                    <div className={cn("flex items-center gap-1 text-sm font-medium", tone)}>
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
