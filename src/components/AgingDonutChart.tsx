"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { AgingResult } from "@/lib/kpi";
import { AGING_COLORS_DARK, AGING_COLORS_LIGHT } from "@/lib/chartPalette";
import { useIsDarkMode } from "@/lib/useIsDarkMode";

export default function AgingDonutChart({ buckets }: { buckets: AgingResult[] }) {
  const isDark = useIsDarkMode();
  const colors = isDark ? AGING_COLORS_DARK : AGING_COLORS_LIGHT;
  const total = buckets.reduce((sum, b) => sum + b.count, 0);

  if (total === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Nothing past due right now — every open record is within its ETC.
      </p>
    );
  }

  const data = buckets.map((b) => ({ key: b.label, value: b.count }));

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "none",
              boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
              fontSize: 13,
            }}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="key"
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={2}
            isAnimationActive={false}
            stroke={isDark ? "#1a1a19" : "#fcfcfb"}
            strokeWidth={2}
            label={({ value }) => (value > 0 ? value : "")}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-zinc-900 dark:fill-zinc-50"
            style={{ fontSize: 28, fontWeight: 800 }}
          >
            {total}
          </text>
          <text
            x="50%"
            y="50%"
            dy={22}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-zinc-500 dark:fill-zinc-400"
            style={{ fontSize: 12 }}
          >
            past due
          </text>
        </PieChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {data.map((d, i) => (
          <div key={d.key} className="flex items-center gap-1.5 text-sm">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: colors[i % colors.length] }}
            />
            <span className="text-zinc-700 dark:text-zinc-300">
              {d.key} <span className="text-zinc-400 dark:text-zinc-500">({d.value})</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
