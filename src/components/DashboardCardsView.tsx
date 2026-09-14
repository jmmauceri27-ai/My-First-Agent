import type { ReactNode } from "react";
import {
  computeAging,
  computeChartData,
  computeGaugePercent,
  computeGroupedChartData,
  computeKpi,
  computeMultiValueChartData,
  computeOrderedChartData,
  computeScorecard,
} from "@/lib/kpi";
import type { ChartPoint } from "@/lib/kpi";
import type { DashboardCard, DatasetRecord, KpiCard } from "@/lib/types";
import type { DashboardSourceKey } from "@/lib/dashboardSources";
import { CHART_COLORS_LIGHT } from "@/lib/chartPalette";
import AgingDonutChart from "./AgingDonutChart";
import ChartRenderer from "./ChartRenderer";
import FunnelChart from "./FunnelChart";
import GaugeChart from "./GaugeChart";
import Card from "./ui/Card";

/** Auto-compact for a hero/stat-tile-style number, e.g. 1284 -> "$1,284", 35200 -> "$35.2K", 4200000 -> "$4.2M". */
function formatCompactMoney(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${sign}$${Math.round(abs).toLocaleString()}`;
}

/** Full-precision dollar amount, e.g. 35200 -> "$35,200" -- for list/table rows, where an exact figure
 * (not an auto-compacted one) is what the reader is there to read. */
function formatExactMoney(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.round(Math.abs(value)).toLocaleString()}`;
}

function formatValue(value: number, format: "number" | "currency" | undefined, compact: boolean): string {
  if (format !== "currency") return value.toLocaleString();
  return compact ? formatCompactMoney(value) : formatExactMoney(value);
}

function CardTitle({ accent, children }: { accent: string; children: ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-50">
      <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
      {children}
    </h2>
  );
}

export default function DashboardCardsView({
  cards,
  rowsBySource,
}: {
  cards: DashboardCard[];
  rowsBySource: Partial<Record<DashboardSourceKey, DatasetRecord[]>>;
}) {
  const kpiCards = cards.filter((c): c is KpiCard => c.type === "kpi");
  const otherCards = cards.filter((c) => c.type !== "kpi");

  return (
    <div className="flex flex-col gap-4">
      {kpiCards.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {kpiCards.map((card, i) => {
            const rows = rowsBySource[card.source] ?? [];
            let value: number | string;
            try {
              const raw = computeKpi(rows, card.agg, card.column, card.filters);
              value = card.agg === "pct_match" ? `${raw}%` : formatValue(raw, card.valueFormat, true);
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
                <p className="mt-1.5 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                  {value}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      {/* Every non-KPI card shares one grid regardless of type, so a dashboard reads as a hub of small,
          varied widgets (funnel, leaderboard, gauge, chart, ...) side by side instead of one full-width
          section per type stacked underneath each other. */}
      {otherCards.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {otherCards.map((card, i) => {
            const accent = CHART_COLORS_LIGHT[i % CHART_COLORS_LIGHT.length];
            const rows = rowsBySource[card.source] ?? [];

            if (card.type === "aging") {
              const buckets = computeAging(rows, card.dateColumn, card.buckets, card.filters);
              return (
                <Card key={i} className="p-4">
                  <CardTitle accent={accent}>{card.title}</CardTitle>
                  <AgingDonutChart buckets={buckets} />
                </Card>
              );
            }

            if (card.type === "gauge") {
              const percent = computeGaugePercent(rows, card.matchFilters, card.baseFilters);
              return (
                <Card key={i} className="flex flex-col items-center justify-center p-4">
                  <CardTitle accent={accent}>{card.title}</CardTitle>
                  <GaugeChart percent={percent} />
                </Card>
              );
            }

            if (card.type === "funnel") {
              const data = computeOrderedChartData(rows, card.x, card.xOrder, card.y, card.agg, card.filters);
              return (
                <Card key={i} className="p-4">
                  <CardTitle accent={accent}>{card.title}</CardTitle>
                  <FunnelChart data={data} formatValue={(v) => formatValue(v, card.valueFormat, true)} />
                </Card>
              );
            }

            if (card.type === "scorecard") {
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
                <Card key={i} className="overflow-hidden p-4 xl:col-span-2">
                  <CardTitle accent={accent}>{card.title}</CardTitle>
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
                          <tr key={row.group} className="border-b border-slate-100 last:border-0 dark:border-slate-900">
                            <td className="py-2 pr-4 font-medium text-slate-800 dark:text-slate-200">{row.group}</td>
                            {card.metrics.includes("count") && <td className="py-2 pr-4 tabular-nums">{row.count}</td>}
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
            }

            // "chart" card -- rendered as an actual chart, or as a ranked list when chartType is "leaderboard".
            const grouped = card.series
              ? computeGroupedChartData(rows, card.x, card.series, card.y, card.agg, card.filters)
              : null;
            const computed = grouped
              ? grouped.data
              : card.xMulti
                ? computeMultiValueChartData(rows, card.x, card.y, card.agg, card.filters)
                : computeChartData(rows, card.x, card.y, card.agg, card.filters);
            const data = card.limit ? computed.slice(0, card.limit) : computed;

            if (card.chartType === "leaderboard") {
              const ranked = data as ChartPoint[];
              return (
                <Card key={i} className="p-4">
                  <CardTitle accent={accent}>{card.title}</CardTitle>
                  {ranked.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No data to display.</p>
                  ) : (
                    <ol className="flex flex-col gap-0.5">
                      {ranked.map((d, idx) => (
                        <li
                          key={d.key}
                          className="flex items-center justify-between gap-2 rounded px-1.5 py-1.5 text-sm odd:bg-slate-50 dark:odd:bg-slate-900/40"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="w-5 shrink-0 text-right text-xs font-semibold text-slate-400 dark:text-slate-500">
                              {idx + 1}
                            </span>
                            <span className="truncate font-medium text-slate-800 dark:text-slate-200">{d.key}</span>
                          </span>
                          <span className="shrink-0 tabular-nums font-semibold text-slate-900 dark:text-slate-50">
                            {formatValue(d.value, card.valueFormat, false)}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </Card>
              );
            }

            return (
              <Card key={i} className="p-4">
                <CardTitle accent={accent}>{card.title}</CardTitle>
                <ChartRenderer chartType={card.chartType} data={data} seriesKeys={grouped?.seriesKeys} />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
