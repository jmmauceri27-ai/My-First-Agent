export const dynamic = "force-dynamic";

import { listVendors } from "@/lib/networkDal";
import VendorsClient from "./VendorsClient";

export default async function NetworkPage() {
  const vendors = await listVendors();
  return <VendorsClient vendors={vendors} />;
}
