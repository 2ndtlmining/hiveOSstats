"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart } from "@/components/charts/area-chart";
import { fromColumns, type ColumnarSeries } from "@/lib/series-format";

interface TrendView {
  title: string;
  names: string[];
  data: ColumnarSeries;
}

interface TrendsClientProps {
  views: TrendView[];
}

export function TrendsClient({ views }: TrendsClientProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trends</h1>
        <p className="text-muted-foreground">
          Composition over time: weekly averages of the current top 10 in each category.
        </p>
      </div>

      {views.map((view) => (
        <Card key={view.title}>
          <CardHeader>
            <CardTitle>{view.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaChart data={fromColumns(view.data)} selectedNames={view.names} stacked />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
