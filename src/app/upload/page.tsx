export const dynamic = "force-dynamic";

import { listDatasets } from "@/lib/dal";
import DatasetList from "./DatasetList";
import UploadForm from "./UploadForm";

export default async function UploadPage() {
  const datasets = await listDatasets();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">📤 Upload Data</h1>

      <UploadForm datasets={datasets} />

      <section>
        <h2 className="mb-2 text-lg font-medium text-zinc-900 dark:text-zinc-50">Existing datasets</h2>
        <DatasetList datasets={datasets} />
      </section>
    </div>
  );
}
