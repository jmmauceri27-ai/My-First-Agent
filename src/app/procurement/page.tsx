export const dynamic = "force-dynamic";

import { listDatasets } from "@/lib/dal";
import SiteMapClient from "./SiteMapClient";

export default async function ProcurementPage() {
  const datasets = await listDatasets();

  return <SiteMapClient datasets={datasets} />;
}
