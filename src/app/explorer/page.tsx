export const dynamic = "force-dynamic";

import { listDatasets } from "@/lib/dal";
import ExplorerClient from "./ExplorerClient";

export default async function ExplorerPage() {
  const datasets = await listDatasets();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">🗂️ Data Explorer</h1>
      {datasets.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No datasets uploaded yet. See Upload Data.</p>
      ) : (
        <ExplorerClient datasets={datasets} />
      )}
    </div>
  );
}
