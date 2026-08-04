export const dynamic = "force-dynamic";

import { listDatasets } from "@/lib/dal";
import ProcurementClient from "./ProcurementClient";

export default async function ProcurementPage() {
  const datasets = await listDatasets();

  return <ProcurementClient datasets={datasets} />;
}
