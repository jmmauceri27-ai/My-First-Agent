"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
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
import type { ChartPoint, GroupedChartPoint } from "@/lib/kpi";
import type { ChartType } from "@/lib/types";
import { CHART_COLORS_DARK, CHART_COLORS_LIGHT } from "@/lib/chartPalette";
import { useIsDarkMode } from "@/lib/useIsDarkMode";

export default function ChartRenderer({
  chartType,
  data,
  seriesKeys,
}: {
  chartType: ChartType;
  data: ChartPoint[] | GroupedChartPoint[];
  /** When set, renders one bar per series (side-by-side per x-group) instead of a single-series bar per x-group. */
  seriesKeys?: string[];
}) {
  const isDark = useIsDarkMode();
  const colors = isDark ? CHART_COLORS_DARK : CHART_COLORS_LIGHT;

  if (data.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No data to display.</p>;
  }

  const gridClass = "stroke-slate-200 dark:stroke-slate-800";
  const tickStyle = { fontSize: 12, fill: isDark ? "#c3c2b7" : "#52514e" };
  const labelStyle = { fontSize: 11, fill: isDark ? "#e7e6df" : "#33322f" };

  if (chartType === "bar" && seriesKeys && seriesKeys.length > 0) {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data as GroupedChartPoint[]}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className={gridClass} />
          <XAxis dataKey="key" tick={tickStyle} interval={0} angle={-30} textAnchor="end" height={60} />
          <YAxis tick={tickStyle} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "none",
              boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
              fontSize: 13,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          {seriesKeys.map((seriesKey, i) => (
            <Bar
              key={seriesKey}
              dataKey={seriesKey}
              name={seriesKey}
              fill={colors[i % colors.length]}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            >
              <LabelList dataKey={seriesKey} position="top" style={labelStyle} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      {chartType === "bar" ? (
        <BarChart data={data as ChartPoint[]}>
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
            <LabelList dataKey="value" position="top" style={labelStyle} />
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      ) : chartType === "line" ? (
        <LineChart data={data as ChartPoint[]}>
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
        <AreaChart data={data as ChartPoint[]}>
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
          <Scatter data={data as ChartPoint[]} fill={colors[0]} isAnimationActive={false} />
        </ScatterChart>
      ) : (
        <PieChart>
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Pie
            data={data as ChartPoint[]}
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
