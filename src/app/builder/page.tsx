export const dynamic = "force-dynamic";

import { listDashboards } from "@/lib/dal";
import { DASHBOARD_SOURCES } from "@/lib/dashboardSources";
import BuilderClient from "./BuilderClient";

export default async function BuilderPage() {
  const dashboards = await listDashboards();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">🛠️ Dashboard Builder</h1>
      <BuilderClient sources={DASHBOARD_SOURCES} dashboards={dashboards} />
    </div>
  );
}
