import { computeAging, computeChartData, computeKpi } from "@/lib/kpi";
import type { AgingCard, ChartCard, DashboardCard, DatasetRecord, KpiCard } from "@/lib/types";
import { CHART_COLORS_LIGHT } from "@/lib/chartPalette";
import AgingDonutChart from "./AgingDonutChart";
import ChartRenderer from "./ChartRenderer";
import Card from "./ui/Card";

export default function DashboardCardsView({
  cards,
  rowsByDataset,
}: {
  cards: DashboardCard[];
  rowsByDataset: Record<string, DatasetRecord[]>;
}) {
  const kpiCards = cards.filter((c): c is KpiCard => c.type === "kpi");
  const chartCards = cards.filter((c): c is ChartCard => c.type === "chart");
  const agingCards = cards.filter((c): c is AgingCard => c.type === "aging");

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
            const accent = CHART_COLORS_LIGHT[i % CHART_COLORS_LIGHT.length];
            return (
              <Card
                key={i}
                className="overflow-hidden p-4 transition-transform hover:-translate-y-0.5 hover:shadow-md"
                style={{ borderTop: `3px solid ${accent}` }}
              >
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {card.title}
                </p>
                <p className="mt-1.5 text-3xl font-extrabold tracking-tight tabular-nums text-zinc-900 dark:text-zinc-50">
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
            const rows = rowsByDataset[card.datasetId] ?? [];
            const buckets = computeAging(rows, card.dateColumn, card.buckets, card.filters);
            return (
              <Card key={i} className="p-4">
                <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
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

      {chartCards.length > 0 && (
        <div className="flex flex-col gap-6">
          {chartCards.map((card, i) => {
            const rows = rowsByDataset[card.datasetId] ?? [];
            const data = computeChartData(rows, card.x, card.y, card.agg, card.filters);
            return (
              <Card key={i} className="p-4">
                <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: CHART_COLORS_LIGHT[0] }}
                  />
                  {card.title}
                </h2>
                <ChartRenderer chartType={card.chartType} data={data} />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
