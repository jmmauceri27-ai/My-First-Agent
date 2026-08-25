"use client";

import { useState } from "react";
import { computeAging, computeChartData, computeGroupedChartData, computeKpi, computeScorecard } from "@/lib/kpi";
import type { AgingCard, ChartCard, DashboardCard, DatasetRecord, KpiCard, ScorecardCard } from "@/lib/types";
import type { DashboardSourceKey } from "@/lib/dashboardSources";
import { CHART_COLORS_LIGHT } from "@/lib/chartPalette";
import { inputClass } from "./ui/formClasses";
import AgingDonutChart from "./AgingDonutChart";
import ChartRenderer from "./ChartRenderer";
import Card from "./ui/Card";

export default function DashboardCardsView({
  cards,
  rowsBySource,
}: {
  cards: DashboardCard[];
  rowsBySource: Partial<Record<DashboardSourceKey, DatasetRecord[]>>;
}) {
  const kpiCards = cards.filter((c): c is KpiCard => c.type === "kpi");
  const chartCards = cards.filter((c): c is ChartCard => c.type === "chart");
  const agingCards = cards.filter((c): c is AgingCard => c.type === "aging");
  const scorecardCards = cards.filter((c): c is ScorecardCard => c.type === "scorecard");

  /** Selected grouping column per chart card index, for chart cards that offer a regionOptions dropdown. */
  const [regionSelections, setRegionSelections] = useState<Record<number, string>>({});

  return (
    <div className="flex flex-col gap-6">
      {kpiCards.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {kpiCards.map((card, i) => {
            const rows = rowsBySource[card.source] ?? [];
            let value: number | string;
            try {
              const raw = computeKpi(rows, card.agg, card.column, card.filters);
              value = card.agg === "pct_match" ? `${raw}%` : raw.toLocaleString();
            } catch {
              value = "—";
            }
            const accent = CHART_COLORS_LIGHT[i % CHART_COLORS_LIGHT.length];
            return (
              <Card
                key={i}
                className="overflow-hidden p-4 transition-transform hover:-translate-y-0.5 hover:shadow-md"
                style={{ borderTop: `3px solid ${accent}` }}
              >
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {card.title}
                </p>
                <p className="mt-1.5 text-3xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-slate-50">
                  {value}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      {agingCards.length > 0 && (
        <div className="flex flex-col gap-6">
          {agingCards.map((card, i) => {
            const rows = rowsBySource[card.source] ?? [];
            const buckets = computeAging(rows, card.dateColumn, card.buckets, card.filters);
            return (
              <Card key={i} className="p-4">
                <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-50">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: CHART_COLORS_LIGHT[7] }}
                  />
                  {card.title}
                </h2>
                <AgingDonutChart buckets={buckets} />
              </Card>
            );
          })}
        </div>
      )}

      {scorecardCards.length > 0 && (
        <div className="flex flex-col gap-6">
          {scorecardCards.map((card, i) => {
            const rows = rowsBySource[card.source] ?? [];
            const data = computeScorecard(rows, {
              groupColumn: card.groupColumn,
              statusColumn: card.statusColumn,
              completedValues: card.completedValues,
              startDateColumn: card.startDateColumn,
              completionDateColumn: card.completionDateColumn,
              dueDateColumn: card.dueDateColumn,
              filters: card.filters,
            });
            return (
              <Card key={i} className="overflow-hidden p-4">
                <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-50">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: CHART_COLORS_LIGHT[3] }}
                  />
                  {card.title}
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                        <th className="py-2 pr-4">{card.groupColumn}</th>
                        {card.metrics.includes("count") && <th className="py-2 pr-4">Work orders</th>}
                        {card.metrics.includes("completion_rate") && <th className="py-2 pr-4">Completion rate</th>}
                        {card.metrics.includes("on_time_rate") && <th className="py-2 pr-4">On-time rate</th>}
                        {card.metrics.includes("avg_duration") && <th className="py-2 pr-4">Avg days</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row) => (
                        <tr
                          key={row.group}
                          className="border-b border-slate-100 last:border-0 dark:border-slate-900"
                        >
                          <td className="py-2 pr-4 font-medium text-slate-800 dark:text-slate-200">{row.group}</td>
                          {card.metrics.includes("count") && (
                            <td className="py-2 pr-4 tabular-nums">{row.count}</td>
                          )}
                          {card.metrics.includes("completion_rate") && (
                            <td className="py-2 pr-4 tabular-nums">
                              {row.completionRate === null ? "—" : `${row.completionRate}%`}
                            </td>
                          )}
                          {card.metrics.includes("on_time_rate") && (
                            <td className="py-2 pr-4 tabular-nums">
                              {row.onTimeRate === null ? "—" : `${row.onTimeRate}%`}
                            </td>
                          )}
                          {card.metrics.includes("avg_duration") && (
                            <td className="py-2 pr-4 tabular-nums">
                              {row.avgDurationDays === null ? "—" : row.avgDurationDays}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {chartCards.length > 0 && (
        <div className="flex flex-col gap-6">
          {chartCards.map((card, i) => {
            const rows = rowsBySource[card.source] ?? [];
            const x = card.regionOptions?.length
              ? (regionSelections[i] ?? card.regionOptions[0].column)
              : card.x;
            const grouped = card.series
              ? computeGroupedChartData(rows, x, card.series, card.y, card.agg, card.filters)
              : null;
            const data = grouped ? grouped.data : computeChartData(rows, x, card.y, card.agg, card.filters);
            return (
              <Card key={i} className="p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-50">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: CHART_COLORS_LIGHT[0] }}
                    />
                    {card.title}
                  </h2>
                  {card.regionOptions && card.regionOptions.length > 0 && (
                    <select
                      value={x}
                      onChange={(e) => setRegionSelections((prev) => ({ ...prev, [i]: e.target.value }))}
                      className={`${inputClass} w-auto`}
                    >
                      {card.regionOptions.map((opt) => (
                        <option key={opt.column} value={opt.column}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <ChartRenderer chartType={card.chartType} data={data} seriesKeys={grouped?.seriesKeys} />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
