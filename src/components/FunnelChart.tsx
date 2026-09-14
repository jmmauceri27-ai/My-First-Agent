"use client";

import type { ChartPoint } from "@/lib/kpi";
import { CHART_COLORS_DARK, CHART_COLORS_LIGHT } from "@/lib/chartPalette";
import { useIsDarkMode } from "@/lib/useIsDarkMode";

/** A labeled horizontal-bar list in a fixed category order (e.g. pipeline stages) -- unlike ChartRenderer's
 * bar chart, rows are never re-sorted by value, since the point is showing progression through fixed stages. */
export default function FunnelChart({
  data,
  formatValue = (v) => v.toLocaleString(),
}: {
  data: ChartPoint[];
  formatValue?: (value: number) => string;
}) {
  const isDark = useIsDarkMode();
  const color = isDark ? CHART_COLORS_DARK[0] : CHART_COLORS_LIGHT[0];
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="flex flex-col gap-2.5">
      {data.map((d) => (
        <div key={d.key} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate font-medium text-slate-700 dark:text-slate-300">{d.key}</span>
            <span className="shrink-0 tabular-nums text-slate-900 dark:text-slate-50">{formatValue(d.value)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full transition-[width]"
              style={{ width: `${(d.value / max) * 100}%`, backgroundColor: color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
