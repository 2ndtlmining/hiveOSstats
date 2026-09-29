"use client";

import { useId } from "react";
import {
  ResponsiveContainer,
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { TimeSeriesPoint } from "@/types";
import {
  AXIS_TICK,
  GRID_STROKE,
  OTHER_COLOR,
  OTHER_SERIES,
  TOOLTIP_STYLE,
  downsample,
  formatDate,
  formatTooltipDate,
  seriesColor,
} from "./utils";

interface AreaChartProps {
  data: TimeSeriesPoint[];
  /** Series in stack order, bottom first. OTHER_SERIES is drawn in neutral grey. */
  selectedNames: string[];
  /** Readable names for the legend and tooltip, by series name. */
  labels?: Record<string, string>;
  /** Latest value per series, shown next to its name in the legend. */
  latest?: Record<string, number>;
  stacked?: boolean;
  height?: number;
}

export function AreaChart({ data, selectedNames, labels, latest, stacked = true, height = 400 }: AreaChartProps) {
  const id = useId().replace(/:/g, "");

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground" style={{ height }}>
        No data to display.
      </div>
    );
  }

  // An item absent from a snapshot has no value that day. Stacking needs a
  // number, so treat absent as 0% here; line charts show a gap instead.
  const chartData = downsample(data, 400).map((point) => {
    const filled: TimeSeriesPoint = { ...point };
    for (const name of selectedNames) filled[name] ??= 0;
    return filled;
  });
  const colorOf = (name: string, i: number) => (name === OTHER_SERIES ? OTHER_COLOR : seriesColor(i));
  const labelOf = (name: string) => labels?.[name] ?? name;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <defs>
          {selectedNames.map((name, i) => (
            <linearGradient key={name} id={`${id}-fill-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colorOf(name, i)} stopOpacity={0.35} />
              <stop offset="95%" stopColor={colorOf(name, i)} stopOpacity={0.08} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} opacity={0.6} />
        <XAxis
          dataKey="date"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: GRID_STROKE }}
          tickFormatter={formatDate}
          interval="preserveStartEnd"
          minTickGap={50}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={45}
          // Shares stack to ~100%; HiveOS's own totals occasionally run a little over
          domain={stacked ? [0, (max: number) => Math.max(100, Math.ceil(max))] : undefined}
          tickFormatter={(v: number) => `${v}%`}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
          labelFormatter={(label: unknown) => formatTooltipDate(String(label))}
          formatter={(value: unknown, name: unknown) => [`${value}%`, String(name)]}
          // Top of the stack first, matching what's on screen
          itemSorter={(item) => -selectedNames.indexOf(String(item.dataKey))}
        />
        <Legend
          wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
          // Top of the stack first, like the tooltip (Recharts sorts alphabetically by default)
          itemSorter={(item) => -selectedNames.indexOf(String(item.dataKey))}
          formatter={(value: string, entry) => {
            const v = latest?.[String((entry as { dataKey?: unknown }).dataKey)];
            return (
              <span style={{ color: "var(--foreground)" }}>
                {value}
                {v !== undefined && <span style={{ color: "var(--muted-foreground)" }}> {v}%</span>}
              </span>
            );
          }}
        />
        {selectedNames.map((name, i) => (
          <Area
            key={name}
            type="monotone"
            dataKey={name}
            name={labelOf(name)}
            stackId={stacked ? "1" : undefined}
            stroke={colorOf(name, i)}
            fill={`url(#${id}-fill-${i})`}
            strokeWidth={1.5}
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
