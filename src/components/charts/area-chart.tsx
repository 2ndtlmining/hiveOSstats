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

const COLORS = ["#FFB800", "#22C55E", "#3B82F6", "#A855F7", "#EF4444", "#06B6D4", "#F97316", "#EC4899"];

interface AreaChartProps {
  data: TimeSeriesPoint[];
  selectedNames: string[];
  stacked?: boolean;
  height?: number;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { year: "2-digit", month: "short", day: "numeric" });
}

function formatTooltipDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function downsample(data: TimeSeriesPoint[], maxPoints: number): TimeSeriesPoint[] {
  if (data.length <= maxPoints) return data;
  const step = data.length / maxPoints;
  const result: TimeSeriesPoint[] = [];
  for (let i = 0; i < maxPoints - 1; i++) {
    result.push(data[Math.round(i * step)]);
  }
  result.push(data[data.length - 1]);
  return result;
}

export function AreaChart({ data, selectedNames, stacked = true, height = 400 }: AreaChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground" style={{ height }}>
        No data to display.
      </div>
    );
  }

  const chartData = downsample(data, 120);

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
