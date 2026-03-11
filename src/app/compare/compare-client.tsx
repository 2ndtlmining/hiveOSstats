"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart } from "@/components/charts/line-chart";
import { CATEGORIES } from "@/types";
import type { CategoryKey, TimeSeriesPoint } from "@/types";

interface CompareClientProps {
  namesByCategory: Record<string, string[]>;
}

export function CompareClient({ namesByCategory }: CompareClientProps) {
  const [category, setCategory] = useState<CategoryKey>("coins");
  const [itemA, setItemA] = useState("");
  const [itemB, setItemB] = useState("");
  const [chartData, setChartData] = useState<TimeSeriesPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const names = namesByCategory[category] ?? [];

  const selected = [itemA, itemB].filter(Boolean);

  const fetchData = useCallback(async () => {
    if (selected.length === 0) {
      setChartData([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/snapshots?category=${category}&names=${selected.join(",")}`
      );
      setChartData(await res.json());
    } catch {
      setChartData([]);
    } finally {
      setLoading(false);
    }
  }, [category, itemA, itemB]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleCategoryChange(val: string) {
    setCategory(val as CategoryKey);
    setItemA("");
    setItemB("");
  }

  // Diff table
  const diffRows = selected.map((name) => {
    if (chartData.length < 2) return { name, first: 0, last: 0, change: 0 };
    const first = (chartData[0][name] as number) ?? 0;
    const last = (chartData[chartData.length - 1][name] as number) ?? 0;
    return {
      name,
      first: Math.round(first * 100) / 100,
      last: Math.round(last * 100) / 100,
      change: Math.round((last - first) * 100) / 100,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compare</h1>
        <p className="text-muted-foreground">
          Side-by-side comparison of two items in the same category.
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Category</label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Item A</label>
              <select
                value={itemA}
                onChange={(e) => setItemA(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">Select...</option>
                {names.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Item B</label>
              <select
                value={itemB}
                onChange={(e) => setItemB(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">Select...</option>
                {names.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Comparison Chart</CardTitle>
          {loading && <span className="text-sm text-muted-foreground">Loading...</span>}
        </CardHeader>
        <CardContent>
          <LineChart data={chartData} selectedNames={selected} />
        </CardContent>
      </Card>

      {/* Diff Table */}
      {diffRows.length > 0 && chartData.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Change Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left font-medium text-muted-foreground">Item</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">First</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">Last</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">Change</th>
                </tr>
              </thead>
              <tbody>
                {diffRows.map((row) => (
                  <tr key={row.name} className="border-b border-border/50">
                    <td className="py-2 font-medium">{row.name}</td>
                    <td className="py-2 text-right">{row.first}%</td>
                    <td className="py-2 text-right">{row.last}%</td>
                    <td className={`py-2 text-right font-medium ${row.change >= 0 ? "text-success" : "text-danger"}`}>
                      {row.change >= 0 ? "+" : ""}{row.change}%
                    </td>
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
