"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkline } from "@/components/charts/sparkline";
import { explorerHref } from "@/lib/links";
import { cn } from "@/lib/utils";
import { MOVER_WINDOWS, type Mover, type MoverWindow } from "@/lib/movers-types";

export interface MoversData {
  window: MoverWindow;
  gainers: Mover[];
  losers: Mover[];
  from: string | null;
  to: string | null;
}

const UP = "text-emerald-600 dark:text-emerald-400";
const DOWN = "text-red-600 dark:text-red-400";

function MoverRow({ mover, window }: { mover: Mover; window: MoverWindow }) {
  const up = mover.change > 0;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <Link
      href={explorerHref(mover.category, [mover.name], window === "7d" ? "30d" : "90d")}
      className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/40"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{mover.name}</p>
        <p className="text-xs text-muted-foreground">
          {mover.categoryLabel} · {mover.start}% → {mover.end}%
        </p>
      </div>
      <div className="hidden w-20 shrink-0 sm:block" aria-hidden>
        <Sparkline data={mover.spark.map((value) => ({ value }))} color={up ? "#10B981" : "#EF4444"} height={28} />
      </div>
      <div className={cn("shrink-0 text-right", up ? UP : DOWN)}>
        <p className="flex items-center justify-end gap-1 text-sm font-semibold">
          <Arrow className="h-4 w-4" aria-hidden />
          {up ? "+" : "−"}
          {Math.abs(mover.change).toFixed(2)} pp
        </p>
        <p className="text-xs opacity-80">
          {mover.relative === null ? "new" : `${up ? "+" : "−"}${Math.abs(mover.relative).toFixed(0)}%`}
        </p>
      </div>
    </Link>
  );
}

function MoverList({ title, movers, window, up }: { title: string; movers: Mover[]; window: MoverWindow; up: boolean }) {
  return (
    <div className="space-y-2">
      <h3 className={cn("text-sm font-medium", up ? UP : DOWN)}>{title}</h3>
      {movers.length > 0 ? (
        movers.map((m) => <MoverRow key={`${m.category}-${m.name}`} mover={m} window={window} />)
      ) : (
        <p className="text-sm text-muted-foreground">No significant moves.</p>
      )}
    </div>
  );
}

export function MoversCard({ data }: { data: MoversData }) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle>Top Movers</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Change in share (percentage points){data.from && data.to ? `, ${data.from} → ${data.to}` : ""}.
            Items under 0.5% are ignored.
          </p>
        </div>
        <nav className="flex rounded-md border border-border p-0.5 text-xs" aria-label="Time window">
          {(Object.keys(MOVER_WINDOWS) as MoverWindow[]).map((w) => (
            <Link
              key={w}
              href={`/?movers=${w}`}
              scroll={false}
              aria-current={w === data.window ? "page" : undefined}
              className={cn(
                "rounded px-2.5 py-1 font-medium uppercase transition-colors",
                w === data.window ? "bg-hiveos text-black" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {w}
            </Link>
          ))}
        </nav>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <MoverList title="Gainers" movers={data.gainers} window={data.window} up />
        <MoverList title="Losers" movers={data.losers} window={data.window} up={false} />
      </CardContent>
    </Card>
  );
}
