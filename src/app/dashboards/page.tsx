export const dynamic = "force-dynamic";

import { listDashboardsWithCategory, listDatasets, loadDashboard } from "@/lib/dal";
import { DATASET_CATEGORIES } from "@/lib/types";
import AreaSidebar from "./AreaSidebar";
import DashboardPicker from "./DashboardPicker";
import DashboardViewClient from "./DashboardViewClient";

export default async function DashboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; id?: string }>;
}) {
  const { area, id } = await searchParams;
  const [dashboards, datasets] = await Promise.all([listDashboardsWithCategory(), listDatasets()]);

  const byId = new Map(dashboards.map((d) => [d.id, d]));
  const selectedArea =
    area ?? (id && byId.get(id)?.category) ?? dashboards[0]?.category ?? DATASET_CATEGORIES[0];

  const areaDashboards = dashboards.filter((d) => d.category === selectedArea);
  const selectedId = (id && areaDashboards.some((d) => d.id === id) ? id : areaDashboards[0]?.id) as
    | string
    | undefined;
  const config = selectedId ? await loadDashboard(selectedId) : null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-50">📊 Dashboards</h1>

      <div className="flex flex-col gap-6 lg:flex-row">
        <AreaSidebar selectedArea={selectedArea} />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {areaDashboards.length === 0 ? (
            <p className="text-sm text-slate-400">
              No dashboards yet for {selectedArea}. Build one in Dashboard Builder.
            </p>
          ) : (
            <>
              <DashboardPicker dashboards={areaDashboards} selectedId={selectedId} area={selectedArea} />
              {!config || config.cards.length === 0 ? (
                <p className="text-sm text-slate-400">This dashboard has no cards yet.</p>
              ) : (
                <DashboardViewClient key={selectedId} config={config} datasets={datasets} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
