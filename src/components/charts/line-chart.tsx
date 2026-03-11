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
}

export function LineChart({ data, selectedNames, yLabel = "%" }: LineChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center text-muted-foreground">
        No data to display. Select items above.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <RechartsLineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#A1A1AA", fontSize: 12 }}
          tickLine={{ stroke: "#27272A" }}
        />
        <YAxis
          tick={{ fill: "#A1A1AA", fontSize: 12 }}
          tickLine={{ stroke: "#27272A" }}
          label={{ value: yLabel, angle: -90, position: "insideLeft", fill: "#A1A1AA" }}
        />
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
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
