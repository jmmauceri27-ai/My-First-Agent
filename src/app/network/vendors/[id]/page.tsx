export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getVendor, listSitesForVendor } from "@/lib/networkDal";
import VendorDetailClient from "./VendorDetailClient";

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vendor = await getVendor(id);
  if (!vendor) notFound();

  const sites = await listSitesForVendor(id);

  return <VendorDetailClient vendor={vendor} sites={sites} />;
}
