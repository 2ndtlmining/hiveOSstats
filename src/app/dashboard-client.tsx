"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sparkline } from "@/components/charts/sparkline";
import { ExportButton } from "@/components/export-button";
import { EXPORT_TYPES, type ExportType } from "@/lib/export-types";
import { Download, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";

interface StatCard {
  category: string;
  label: string;
  count: number;
  topItem: { name: string; amount: number } | null;
  sparkData: { value: number }[];
}

interface Mover {
  name: string;
  category: string;
  change: number;
  current: number;
}

interface DashboardClientProps {
  stats: StatCard[];
  movers: Mover[];
  snapshotCount: number;
  latestLabel: string | null;
}

export function DashboardClient({
  stats,
  movers,
  snapshotCount,
  latestLabel,
}: DashboardClientProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            {snapshotCount} snapshots
            {latestLabel && (
              <> &middot; Latest: {latestLabel}</>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <a href="#excel-reports" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Download className="mr-2 h-4 w-4" />
            Excel reports
          </a>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.category}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <Badge variant="secondary">{stat.count}</Badge>
            </CardHeader>
            <CardContent>
              {stat.topItem ? (
                <>
                  <p className="text-lg font-semibold">{stat.topItem.name}</p>
                  <p className="text-sm text-hiveos">{stat.topItem.amount}%</p>
                  {stat.sparkData.length > 1 && (
                    <div className="mt-2">
                      <Sparkline data={stat.sparkData} />
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No data</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top Movers */}
      {movers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Movers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {movers.map((mover, i) => (
                <div
                  key={`${mover.name}-${i}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="font-medium">{mover.name}</p>
                    <p className="text-xs text-muted-foreground">{mover.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{mover.current}%</span>
                    <Badge
                      variant={mover.change >= 0 ? "default" : "destructive"}
                      className="flex items-center gap-1"
                    >
                      {mover.change >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {mover.change >= 0 ? "+" : ""}
                      {mover.change}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Options */}
      <Card id="excel-reports" className="scroll-mt-6">
        <CardHeader>
          <CardTitle>Excel Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {(Object.keys(EXPORT_TYPES) as ExportType[]).map((type) => (
              <div key={type} className="flex flex-col items-start gap-2">
                <ExportButton type={type} />
                <p className="text-xs text-muted-foreground">{EXPORT_TYPES[type].description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
