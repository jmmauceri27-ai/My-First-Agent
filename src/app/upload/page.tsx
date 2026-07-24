export const dynamic = "force-dynamic";

import { listDatasets } from "@/lib/dal";
import DatasetList from "./DatasetList";
import UploadForm from "./UploadForm";

export default async function UploadPage() {
  const datasets = await listDatasets();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">📤 Upload Data</h1>

      <UploadForm datasets={datasets} />

      <section>
        <h2 className="mb-2 text-lg font-bold text-slate-900 dark:text-slate-50">Existing datasets</h2>
        <DatasetList datasets={datasets} />
      </section>
    </div>
  );
}
