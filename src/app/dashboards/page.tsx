import { getDatasetRows, listDashboards, loadDashboard } from "@/lib/dal";
import type { DatasetRecord } from "@/lib/types";
import DashboardCardsView from "@/components/DashboardCardsView";
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

  const rowsByDataset: Record<string, DatasetRecord[]> = {};
  for (const card of config.cards) {
    if (!(card.datasetId in rowsByDataset)) {
      rowsByDataset[card.datasetId] = await getDatasetRows(card.datasetId);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">📊 Dashboards</h1>
      <DashboardPicker dashboards={dashboards} selectedId={selectedId} />
      <DashboardCardsView cards={config.cards} rowsByDataset={rowsByDataset} />
    </div>
  );
}
