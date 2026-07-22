import { computeChartData, computeKpi } from "@/lib/kpi";
import type { ChartCard, DashboardCard, DatasetRecord, KpiCard } from "@/lib/types";
import ChartRenderer from "./ChartRenderer";

export default function DashboardCardsView({
  cards,
  rowsByDataset,
}: {
  cards: DashboardCard[];
  rowsByDataset: Record<string, DatasetRecord[]>;
}) {
  const kpiCards = cards.filter((c): c is KpiCard => c.type === "kpi");
  const chartCards = cards.filter((c): c is ChartCard => c.type === "chart");

  return (
    <div className="flex flex-col gap-6">
      {kpiCards.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {kpiCards.map((card, i) => {
            const rows = rowsByDataset[card.datasetId] ?? [];
            let value: number | string;
            try {
              const raw = computeKpi(rows, card.agg, card.column, card.filters);
              value = card.agg === "pct_match" ? `${raw}%` : raw.toLocaleString();
            } catch {
              value = "—";
            }
            return (
              <div
                key={i}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{card.title}</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{value}</p>
              </div>
            );
          })}
        </div>
      )}

      {chartCards.length > 0 && (
        <div className="flex flex-col gap-6">
          {chartCards.map((card, i) => {
            const rows = rowsByDataset[card.datasetId] ?? [];
            const data = computeChartData(rows, card.x, card.y, card.agg, card.filters);
            return (
              <div
                key={i}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <h2 className="mb-2 text-lg font-medium text-zinc-900 dark:text-zinc-50">{card.title}</h2>
                <ChartRenderer chartType={card.chartType} data={data} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
