"use client";

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
import { COLORS, downsample, formatDate, formatTooltipDate } from "./utils";

interface AreaChartProps {
  data: TimeSeriesPoint[];
  selectedNames: string[];
  /** Readable names for the legend and tooltip, by series name. */
  labels?: Record<string, string>;
  stacked?: boolean;
  height?: number;
}

export function AreaChart({ data, selectedNames, labels, stacked = true, height = 400 }: AreaChartProps) {
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

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <defs>
          {selectedNames.map((name, i) => (
            <linearGradient key={name} id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.05} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272A" opacity={0.5} />
        <XAxis
          dataKey="date"
          tick={{ fill: "#A1A1AA", fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "#27272A" }}
          tickFormatter={formatDate}
          interval="preserveStartEnd"
          minTickGap={50}
        />
        <YAxis
          tick={{ fill: "#A1A1AA", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={45}
          tickFormatter={(v: number) => `${v}%`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#141414",
            border: "1px solid #27272A",
            borderRadius: "8px",
            color: "#FAFAFA",
            fontSize: "12px",
            padding: "8px 12px",
          }}
          labelFormatter={(label: unknown) => formatTooltipDate(String(label))}
          formatter={(value: unknown, name: unknown) => [`${value}%`, String(name)]}
        />
        <Legend
          wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
        />
        {selectedNames.map((name, i) => (
          <Area
            key={name}
            type="monotone"
            dataKey={name}
            name={labels?.[name] ?? name}
            stackId={stacked ? "1" : undefined}
            stroke={COLORS[i % COLORS.length]}
            fill={`url(#gradient-${i})`}
            strokeWidth={2}
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
