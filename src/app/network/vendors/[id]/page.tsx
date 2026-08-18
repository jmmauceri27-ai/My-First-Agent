export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getVendor, listSitesForSubVendor, listSitesForVendor } from "@/lib/networkDal";
import VendorDetailClient from "./VendorDetailClient";

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vendor = await getVendor(id);
  if (!vendor) notFound();

  const [sitesAsVendor, sitesAsSubVendor] = await Promise.all([listSitesForVendor(id), listSitesForSubVendor(id)]);

  return <VendorDetailClient vendor={vendor} sitesAsVendor={sitesAsVendor} sitesAsSubVendor={sitesAsSubVendor} />;
}
