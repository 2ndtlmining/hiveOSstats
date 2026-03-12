"use client";

import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { TimeSeriesPoint } from "@/types";

const COLORS = ["#FFB800", "#22C55E", "#3B82F6", "#A855F7", "#EF4444", "#06B6D4", "#F97316", "#EC4899"];

interface LineChartProps {
  data: TimeSeriesPoint[];
  selectedNames: string[];
  yLabel?: string;
  height?: number;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTooltipDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// Downsample data to avoid rendering too many points
function downsample(data: TimeSeriesPoint[], maxPoints: number): TimeSeriesPoint[] {
  if (data.length <= maxPoints) return data;
  const step = data.length / maxPoints;
  const result: TimeSeriesPoint[] = [];
  for (let i = 0; i < maxPoints - 1; i++) {
    result.push(data[Math.round(i * step)]);
  }
  result.push(data[data.length - 1]); // always include last point
  return result;
}

export function LineChart({ data, selectedNames, yLabel = "%", height = 400 }: LineChartProps) {
  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center text-muted-foreground`} style={{ height }}>
        No data to display. Select items above.
      </div>
    );
  }

  const chartData = downsample(data, 120);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
          tickFormatter={(v: number) => `${v}${yLabel}`}
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
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
