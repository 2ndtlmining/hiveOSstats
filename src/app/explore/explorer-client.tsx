"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineChart } from "@/components/charts/line-chart";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Explorer</h1>
        <p className="text-muted-foreground">
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

      {/* Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {CATEGORIES.find((c) => c.value === category)?.label} Over Time
          </CardTitle>
          {loading && <span className="text-sm text-muted-foreground">Loading...</span>}
        </CardHeader>
        <CardContent>
          <LineChart data={chartData} selectedNames={selected} />
        </CardContent>
      </Card>

      {/* Item Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Select Items</CardTitle>
            {selected.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                Clear ({selected.length})
              </Button>
            )}
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-hiveos"
          />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto">
            {filtered.map((name) => {
              const isSelected = selected.includes(name);
              return (
                <Badge
                  key={name}
                  variant={isSelected ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
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
          <CardHeader>
            <CardTitle>Data Table</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
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
                {chartData.map((row) => (
                  <tr key={row.date} className="border-b border-border/50">
                    <td className="py-2">{row.date}</td>
                    {selected.map((name) => (
                      <td key={name} className="py-2 text-right">
                        {row[name] !== undefined ? `${row[name]}%` : "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
