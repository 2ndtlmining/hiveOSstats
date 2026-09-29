"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sparkline } from "@/components/charts/sparkline";
import { ExportButton } from "@/components/export-button";
import { EXPORT_TYPES, type ExportType } from "@/lib/export-types";
import Link from "next/link";
import { Download, RefreshCw } from "lucide-react";
import { MoversCard, type MoversData } from "./movers-card";
import { explorerHref } from "@/lib/links";
import type { CategoryKey } from "@/types";

interface StatCard {
  category: CategoryKey;
  label: string;
  count: number;
  topItem: { name: string; amount: number } | null;
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
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.category}
            href={explorerHref(stat.category, stat.topItem ? [stat.topItem.name] : [])}
            className="rounded-xl transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hiveos"
          >
            <Card className="h-full transition-colors hover:border-hiveos/50">
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
