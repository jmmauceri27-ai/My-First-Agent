export const dynamic = "force-dynamic";

import { listSites, listVendors } from "@/lib/networkDal";
import { listFieldClasses } from "@/lib/fieldsDal";
import VendorsClient from "./VendorsClient";

export default async function NetworkPage() {
  const [vendors, sites, fieldClasses] = await Promise.all([listVendors(), listSites(), listFieldClasses()]);
  return <VendorsClient vendors={vendors} sites={sites} fieldClasses={fieldClasses} />;
}
