export const dynamic = "force-dynamic";

import { listVendors } from "@/lib/networkDal";
import { listFieldClasses } from "@/lib/fieldsDal";
import VendorsClient from "./VendorsClient";

export default async function NetworkPage() {
  const [vendors, fieldClasses] = await Promise.all([listVendors(), listFieldClasses()]);
  return <VendorsClient vendors={vendors} fieldClasses={fieldClasses} />;
}
