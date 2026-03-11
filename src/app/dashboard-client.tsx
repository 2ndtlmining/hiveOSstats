"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkline } from "@/components/charts/sparkline";
import { Camera, Download, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";

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
  latestTimestamp: string | null;
}

export function DashboardClient({
  stats,
  movers,
  snapshotCount,
  latestTimestamp,
}: DashboardClientProps) {
  const [snapshotStatus, setSnapshotStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function takeSnapshot() {
    setLoading(true);
    setSnapshotStatus(null);
    try {
      const res = await fetch("/api/cron/snapshot", { method: "POST" });
      if (res.ok) {
        setSnapshotStatus("Snapshot taken successfully!");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setSnapshotStatus("Failed to take snapshot.");
      }
    } catch {
      setSnapshotStatus("Error taking snapshot.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            {snapshotCount} snapshots
            {latestTimestamp && (
              <> &middot; Latest: {latestTimestamp}</>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={takeSnapshot} disabled={loading} size="sm">
            <Camera className="mr-2 h-4 w-4" />
            {loading ? "Taking..." : "Take Snapshot"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/api/export?type=snapshot", "_blank")}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {snapshotStatus && (
        <div className="rounded-lg border border-border bg-card p-3 text-sm">
          {snapshotStatus}
        </div>
      )}

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
      <Card>
        <CardHeader>
          <CardTitle>Excel Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              { type: "snapshot", label: "Snapshot Data" },
              { type: "diff", label: "Differences" },
              { type: "daily", label: "Daily Pivot" },
              { type: "monthly", label: "Monthly Pivot" },
            ].map((exp) => (
              <Button
                key={exp.type}
                variant="outline"
                size="sm"
                onClick={() => window.open(`/api/export?type=${exp.type}`, "_blank")}
              >
                <Download className="mr-2 h-4 w-4" />
                {exp.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
