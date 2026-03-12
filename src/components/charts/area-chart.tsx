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
}

export function AreaChart({ data, selectedNames, stacked = true }: AreaChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center text-muted-foreground">
        No data to display.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <RechartsAreaChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
        <XAxis dataKey="date" tick={{ fill: "#A1A1AA", fontSize: 12 }} />
        <YAxis tick={{ fill: "#A1A1AA", fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#141414",
            border: "1px solid #27272A",
            borderRadius: "8px",
            color: "#FAFAFA",
          }}
        />
        <Legend />
        {selectedNames.map((name, i) => (
          <Area
            key={name}
            type="monotone"
            dataKey={name}
            stackId={stacked ? "1" : undefined}
            stroke={COLORS[i % COLORS.length]}
            fill={COLORS[i % COLORS.length]}
            fillOpacity={0.3}
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
