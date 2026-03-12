"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineChart } from "@/components/charts/line-chart";
import { Loader2, X } from "lucide-react";
import { CATEGORIES } from "@/types";
import type { CategoryKey, TimeSeriesPoint } from "@/types";

interface ExplorerClientProps {
  namesByCategory: Record<string, string[]>;
}

export function ExplorerClient({ namesByCategory }: ExplorerClientProps) {
  const [category, setCategory] = useState<CategoryKey>("coins");
  const [selected, setSelected] = useState<string[]>([]);
  const [chartData, setChartData] = useState<TimeSeriesPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const names = namesByCategory[category] ?? [];
  const filtered = search
    ? names.filter((n) => n.toLowerCase().includes(search.toLowerCase()))
    : names;

  const fetchChart = useCallback(async () => {
    if (selected.length === 0) {
      setChartData([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/snapshots?category=${category}&names=${selected.join(",")}`
      );
      const data = await res.json();
      setChartData(data);
    } catch {
      setChartData([]);
    } finally {
      setLoading(false);
    }
  }, [category, selected]);

  useEffect(() => {
    fetchChart();
  }, [fetchChart]);

  function toggleItem(name: string) {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  }

  function handleCategoryChange(val: string) {
    setCategory(val as CategoryKey);
    setSelected([]);
    setSearch("");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Explorer</h1>
        <p className="text-muted-foreground text-sm">
          Select a category and items to visualize trends over time.
        </p>
      </div>

      {/* Category Tabs */}
      <Tabs value={category} onValueChange={handleCategoryChange}>
        <TabsList className="flex flex-wrap h-auto gap-1">
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
          <span className="text-xs text-muted-foreground">Selected:</span>
          {selected.map((name) => (
            <Badge
              key={name}
              variant="default"
              className="cursor-pointer gap-1 pr-1"
              onClick={() => toggleItem(name)}
            >
              {name}
              <X className="h-3 w-3" />
            </Badge>
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
            {CATEGORIES.find((c) => c.value === category)?.label} Over Time
          </CardTitle>
          {loading && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading...
            </div>
          )}
        </CardHeader>
        <CardContent className="pb-4">
          <LineChart data={chartData} selectedNames={selected} height={350} />
        </CardContent>
      </Card>

      {/* Item Selection + Data Table side by side on desktop */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Item Selection */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Select Items</CardTitle>
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-hiveos"
            />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5 max-h-[250px] overflow-y-auto">
              {filtered.map((name) => {
                const isSelected = selected.includes(name);
                return (
                  <Badge
                    key={name}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer text-xs transition-colors hover:bg-hiveos/20"
                    onClick={() => toggleItem(name)}
                  >
                    {name}
                  </Badge>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground">No items found.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        {selected.length > 0 && chartData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Data Table</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="max-h-[280px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border">
                      <th className="pb-2 text-left font-medium text-muted-foreground">Date</th>
                      {selected.map((name) => (
                        <th key={name} className="pb-2 text-right font-medium text-muted-foreground">
                          {name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.slice(-30).reverse().map((row) => (
                      <tr key={row.date} className="border-b border-border/30">
                        <td className="py-1.5 whitespace-nowrap">{row.date}</td>
                        {selected.map((name) => (
                          <td key={name} className="py-1.5 text-right tabular-nums">
                            {row[name] !== undefined ? `${row[name]}%` : "-"}
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
