"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPoint } from "@/lib/kpi";
import type { ChartType } from "@/lib/types";
import { CHART_COLORS_DARK, CHART_COLORS_LIGHT } from "@/lib/chartPalette";
import { useIsDarkMode } from "@/lib/useIsDarkMode";

export default function ChartRenderer({ chartType, data }: { chartType: ChartType; data: ChartPoint[] }) {
  const isDark = useIsDarkMode();
  const colors = isDark ? CHART_COLORS_DARK : CHART_COLORS_LIGHT;

  if (data.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">No data to display.</p>;
  }

  const gridClass = "stroke-zinc-200 dark:stroke-zinc-800";
  const tickStyle = { fontSize: 12, fill: isDark ? "#c3c2b7" : "#52514e" };

  return (
    <ResponsiveContainer width="100%" height={300}>
      {chartType === "bar" ? (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className={gridClass} />
          <XAxis dataKey="key" tick={tickStyle} interval={0} angle={-30} textAnchor="end" height={60} />
          <YAxis tick={tickStyle} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "none",
              boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
              fontSize: 13,
            }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      ) : chartType === "line" ? (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className={gridClass} />
          <XAxis dataKey="key" tick={tickStyle} />
          <YAxis tick={tickStyle} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", fontSize: 13 }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={colors[0]}
            strokeWidth={2.5}
            dot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      ) : chartType === "area" ? (
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className={gridClass} />
          <XAxis dataKey="key" tick={tickStyle} />
          <YAxis tick={tickStyle} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", fontSize: 13 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={colors[0]}
            strokeWidth={2.5}
            fill={colors[0]}
            fillOpacity={0.2}
            isAnimationActive={false}
          />
        </AreaChart>
      ) : chartType === "scatter" ? (
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" className={gridClass} />
          <XAxis dataKey="key" tick={tickStyle} name="category" />
          <YAxis dataKey="value" tick={tickStyle} name="value" />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", fontSize: 13 }}
          />
          <Scatter data={data} fill={colors[0]} isAnimationActive={false} />
        </ScatterChart>
      ) : (
        <PieChart>
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="key"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label
            stroke={isDark ? "#1a1a19" : "#fcfcfb"}
            strokeWidth={2}
            isAnimationActive={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
        </PieChart>
      )}
    </ResponsiveContainer>
  );
}
