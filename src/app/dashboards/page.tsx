import { computeChartData, computeKpi } from "@/lib/kpi";
import { getDatasetRows, listDashboards, loadDashboard } from "@/lib/dal";
import type { DatasetRecord } from "@/lib/types";
import ChartRenderer from "./ChartRenderer";
import DashboardPicker from "./DashboardPicker";

export default async function DashboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const dashboards = await listDashboards();

  if (dashboards.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">📊 Dashboards</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No dashboards yet. Build one in Dashboard Builder.
        </p>
      </div>
    );
  }

  const selectedId = id && dashboards.some((d) => d.id === id) ? id : dashboards[0].id;
  const config = await loadDashboard(selectedId);

  if (!config || config.cards.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">📊 Dashboards</h1>
        <DashboardPicker dashboards={dashboards} selectedId={selectedId} />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">This dashboard has no cards yet.</p>
      </div>
    );
  }

  const rowsByDataset = new Map<string, DatasetRecord[]>();
  for (const card of config.cards) {
    if (!rowsByDataset.has(card.datasetId)) {
      rowsByDataset.set(card.datasetId, await getDatasetRows(card.datasetId));
    }
  }

  const kpiCards = config.cards.filter((c) => c.type === "kpi");
  const chartCards = config.cards.filter((c) => c.type === "chart");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">📊 Dashboards</h1>
      <DashboardPicker dashboards={dashboards} selectedId={selectedId} />

      {kpiCards.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {kpiCards.map((card, i) => {
            const rows = rowsByDataset.get(card.datasetId) ?? [];
            let value: number | string;
            try {
              const raw = computeKpi(rows, card.agg, card.column, card.filters);
              value = card.agg === "pct_match" ? `${raw}%` : raw.toLocaleString();
            } catch {
              value = "—";
            }
            return (
              <div key={i} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
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
            const rows = rowsByDataset.get(card.datasetId) ?? [];
            const data = computeChartData(rows, card.x, card.y, card.agg, card.filters);
            return (
              <div key={i} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
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
