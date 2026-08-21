export const dynamic = "force-dynamic";

import { DASHBOARD_DEFINITIONS } from "@/lib/dashboardDefinitions";
import AreaSidebar from "./AreaSidebar";
import DashboardPicker from "./DashboardPicker";
import DashboardViewClient from "./DashboardViewClient";

export default async function DashboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; id?: string }>;
}) {
  const { area, id } = await searchParams;

  const byId = new Map(DASHBOARD_DEFINITIONS.map((d) => [d.id, d]));
  const selectedArea = area ?? (id && byId.get(id)?.area) ?? DASHBOARD_DEFINITIONS[0]?.area ?? "CRM";

  const areaDashboards = DASHBOARD_DEFINITIONS.filter((d) => d.area === selectedArea);
  const selected =
    id && areaDashboards.some((d) => d.id === id) ? byId.get(id) : areaDashboards[0];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-50">📊 Dashboards</h1>

      <div className="flex flex-col gap-6 lg:flex-row">
        <AreaSidebar selectedArea={selectedArea} />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {areaDashboards.length === 0 && (
            <p className="text-sm text-slate-400">No dashboards yet for {selectedArea}.</p>
          )}

          {areaDashboards.length > 0 && (
            <>
              <DashboardPicker dashboards={areaDashboards} selectedId={selected?.id} area={selectedArea} />
              {!selected || selected.config.cards.length === 0 ? (
                <p className="text-sm text-slate-400">This dashboard has no cards yet.</p>
              ) : (
                <DashboardViewClient key={selected.id} config={selected.config} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
