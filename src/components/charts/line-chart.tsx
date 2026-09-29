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
import {
  AXIS_TICK,
  GRID_STROKE,
  TOOLTIP_STYLE,
  downsample,
  formatDate,
  formatTooltipDate,
  seriesColor,
  seriesDash,
} from "./utils";

interface LineChartProps {
  data: TimeSeriesPoint[];
  selectedNames: string[];
  /** Readable names for the legend and tooltip, by series name. */
  labels?: Record<string, string>;
  yLabel?: string;
  height?: number;
}

export function LineChart({ data, selectedNames, labels, yLabel = "%", height = 400 }: LineChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground" style={{ height }}>
        No data to display. Select items above.
      </div>
    );
  }

  const chartData = downsample(data, 400);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
          tickFormatter={(v: number) => `${v}${yLabel}`}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
          labelFormatter={(label: unknown) => formatTooltipDate(String(label))}
          formatter={(value: unknown, name: unknown) => [`${value}%`, String(name)]}
        />
        {/* Selection order, which is also colour order (Recharts sorts alphabetically by default) */}
        <Legend
          wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
          itemSorter={(item) => selectedNames.indexOf(String(item.dataKey))}
        />
        {selectedNames.map((name, i) => (
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            name={labels?.[name] ?? name}
            stroke={seriesColor(i)}
            strokeDasharray={seriesDash(i)}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
