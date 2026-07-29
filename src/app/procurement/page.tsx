export const dynamic = "force-dynamic";

import { listDatasets } from "@/lib/dal";
import SiteMapClient from "./SiteMapClient";

export default async function ProcurementPage() {
  const datasets = await listDatasets();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-50">🧾 Procurement</h1>
      <SiteMapClient datasets={datasets} />
    </div>
  );
}
