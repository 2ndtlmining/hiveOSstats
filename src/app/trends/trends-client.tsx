"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart } from "@/components/charts/area-chart";
import { RangePicker } from "@/components/range-picker";
import { fromColumns, type ColumnarSeries } from "@/lib/series-format";
import type { Range } from "@/lib/ranges";

interface TrendView {
  title: string;
  names: string[];
  labels: Record<string, string>;
  resolution: "daily" | "weekly";
  data: ColumnarSeries;
}

interface TrendsClientProps {
  views: TrendView[];
  range: Range;
  defaultRange: Range;
}

export function TrendsClient({ views, range, defaultRange }: TrendsClientProps) {
  const weekly = views.some((v) => v.resolution === "weekly");
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trends</h1>
          <p className="text-muted-foreground">
            Composition over time of the current top 10 in each category
            {weekly ? " (weekly averages)" : ""}.
          </p>
        </div>
        <RangePicker value={range} hrefFor={(r) => (r === defaultRange ? "/trends" : `/trends?range=${r}`)} />
      </div>

      {views.map((view) => (
        <Card key={view.title}>
          <CardHeader>
            <CardTitle>{view.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaChart data={fromColumns(view.data)} selectedNames={view.names} labels={view.labels} stacked />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
