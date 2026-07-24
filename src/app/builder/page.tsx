export const dynamic = "force-dynamic";

import { listDashboards, listDatasets } from "@/lib/dal";
import BuilderClient from "./BuilderClient";

export default async function BuilderPage() {
  const [datasets, dashboards] = await Promise.all([listDatasets(), listDashboards()]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">🛠️ Dashboard Builder</h1>
      {datasets.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Upload at least one dataset first (see Upload Data).
        </p>
      ) : (
        <BuilderClient datasets={datasets} dashboards={dashboards} />
      )}
    </div>
  );
}
