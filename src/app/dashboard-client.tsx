"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sparkline } from "@/components/charts/sparkline";
import { ExportButton } from "@/components/export-button";
import { EXPORT_TYPES, type ExportType } from "@/lib/export-types";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Download, RefreshCw } from "lucide-react";
import { MoversCard, type MoversData } from "./movers-card";
import { explorerHref } from "@/lib/links";
import type { CategoryKey } from "@/types";

interface StatCard {
  category: CategoryKey;
  label: string;
  count: number;
  topItem: { name: string; label: string; amount: number; change: number | null } | null;
  runnersUp: { label: string; amount: number }[];
  sparkData: { value: number }[];
}

interface DashboardClientProps {
  stats: StatCard[];
  movers: MoversData;
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            aria-label="Refresh data"
            title="Refresh data"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      {/* Stats Cards: Coins is double width, so 7 cards fill 2 rows of 4 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, i) => (
          <Link
            key={stat.category}
            href={explorerHref(stat.category, stat.topItem ? [stat.topItem.name] : [])}
            className={cn(
              "rounded-xl transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hiveos",
              i === 0 && "sm:col-span-2"
            )}
          >
            <StatCardView stat={stat} wide={i === 0} />
          </Link>
        ))}
      </div>

      <MoversCard data={movers} />

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

function StatCardView({ stat, wide }: { stat: StatCard; wide: boolean }) {
  const change = stat.topItem?.change ?? null;
  const tone =
    change === null || change === 0
      ? "text-muted-foreground"
      : change > 0
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-red-600 dark:text-red-400";
  return (
    <Card className="h-full transition-colors hover:border-hiveos/50">
      <CardHeader className="flex flex-row items-baseline justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
        <span className="text-xs text-muted-foreground">{stat.count} tracked</span>
      </CardHeader>
      <CardContent>
        {stat.topItem ? (
          <div className={cn(wide && "grid gap-4 sm:grid-cols-2")}>
            <div>
              <p className="truncate text-sm font-medium" title={stat.topItem.label}>{stat.topItem.label}</p>
              <p className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums">{stat.topItem.amount}%</span>
                {change !== null && (
                  <span className={cn("text-xs font-medium tabular-nums", tone)} title="Change over the last 30 days, in percentage points">
                    {change > 0 ? "+" : change < 0 ? "−" : "±"}
                    {Math.abs(change).toFixed(2)} pp · 30d
                  </span>
                )}
              </p>
              {stat.sparkData.length > 1 && (
                <div className="mt-2" title={`${stat.topItem.label}, last 30 days`}>
                  <Sparkline data={stat.sparkData} />
                </div>
              )}
            </div>
            {wide && stat.runnersUp.length > 0 && (
              <ol className="space-y-1.5 self-center text-sm" start={2}>
                {stat.runnersUp.map((item, i) => (
                  <li key={item.label} className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-muted-foreground">
                      {i + 2}. <span className="text-foreground">{item.label}</span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">{item.amount}%</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No data</p>
        )}
      </CardContent>
    </Card>
  );
}
