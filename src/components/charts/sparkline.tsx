"use client";

import { ResponsiveContainer, AreaChart, Area } from "recharts";

interface SparklineProps {
  data: { value: number }[];
  color?: string;
  height?: number;
}

export function Sparkline({ data, color = "#FFB800", height = 40 }: SparklineProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          fill={color}
          fillOpacity={0.15}
          strokeWidth={1.5}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
