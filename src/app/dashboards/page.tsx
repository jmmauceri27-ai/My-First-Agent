export const dynamic = "force-dynamic";

import { listDashboards, listDatasets, loadDashboard } from "@/lib/dal";
import DashboardPicker from "./DashboardPicker";
import DashboardViewClient from "./DashboardViewClient";

export default async function DashboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const [dashboards, datasets] = await Promise.all([listDashboards(), listDatasets()]);

  if (dashboards.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">📊 Dashboards</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No dashboards yet. Build one in Dashboard Builder.
        </p>
      </div>
    );
  }

  const selectedId = id && dashboards.some((d) => d.id === id) ? id : dashboards[0].id;
  const config = await loadDashboard(selectedId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">📊 Dashboards</h1>
      <DashboardPicker dashboards={dashboards} selectedId={selectedId} />
      {!config || config.cards.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">This dashboard has no cards yet.</p>
      ) : (
        <DashboardViewClient key={selectedId} config={config} datasets={datasets} />
      )}
    </div>
  );
}
