export const dynamic = "force-dynamic";

import { listDashboards, listDatasets } from "@/lib/dal";
import BuilderClient from "./BuilderClient";

export default async function BuilderPage() {
  const [datasets, dashboards] = await Promise.all([listDatasets(), listDashboards()]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">🛠️ Dashboard Builder</h1>
      {datasets.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Upload at least one dataset first (see Upload Data).
        </p>
      ) : (
        <BuilderClient datasets={datasets} dashboards={dashboards} />
      )}
    </div>
  );
}
