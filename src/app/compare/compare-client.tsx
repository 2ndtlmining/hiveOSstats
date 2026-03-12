"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart } from "@/components/charts/line-chart";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, itemA, itemB]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleCategoryChange(val: string) {
    setCategory(val as CategoryKey);
    setItemA("");
    setItemB("");
  }

  // Diff calculations
  const diffRows = selected.map((name) => {
    if (chartData.length < 2) return { name, first: 0, last: 0, change: 0, pctChange: 0 };
    const first = (chartData[0][name] as number) ?? 0;
    const last = (chartData[chartData.length - 1][name] as number) ?? 0;
    const change = Math.round((last - first) * 100) / 100;
    const pctChange = first > 0 ? Math.round(((last - first) / first) * 10000) / 100 : 0;
    return {
      name,
      first: Math.round(first * 100) / 100,
      last: Math.round(last * 100) / 100,
      change,
      pctChange,
    };
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compare</h1>
        <p className="text-muted-foreground text-sm">
          Side-by-side comparison of two items in the same category.
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Category</label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-hiveos outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Item A</label>
              <select
                value={itemA}
                onChange={(e) => setItemA(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-hiveos outline-none"
              >
                <option value="">Select...</option>
                {names.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Item B</label>
              <select
                value={itemB}
                onChange={(e) => setItemB(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-hiveos outline-none"
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
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Comparison Chart</CardTitle>
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

      {/* Change Summary Cards */}
      {diffRows.length > 0 && chartData.length >= 2 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {diffRows.map((row) => {
            const isPositive = row.change > 0;
            const isNeutral = row.change === 0;
            return (
              <Card key={row.name}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">{row.name}</h3>
                    <div className={`flex items-center gap-1 text-sm font-medium ${
                      isNeutral ? "text-muted-foreground" : isPositive ? "text-green-500" : "text-red-500"
                    }`}>
                      {isNeutral ? <Minus className="h-3 w-3" /> : isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {isPositive ? "+" : ""}{row.change}%
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">First</p>
                      <p className="font-medium tabular-nums">{row.first}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Latest</p>
                      <p className="font-medium tabular-nums">{row.last}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">% Change</p>
                      <p className={`font-medium tabular-nums ${
                        isNeutral ? "" : isPositive ? "text-green-500" : "text-red-500"
                      }`}>
                        {isPositive ? "+" : ""}{row.pctChange}%
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
