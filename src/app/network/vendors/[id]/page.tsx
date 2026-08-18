export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getVendor, listAssignmentsForSubVendor, listAssignmentsForVendor } from "@/lib/networkDal";
import VendorDetailClient from "./VendorDetailClient";

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vendor = await getVendor(id);
  if (!vendor) notFound();

  const [assignmentsAsVendor, assignmentsAsSubVendor] = await Promise.all([
    listAssignmentsForVendor(id),
    listAssignmentsForSubVendor(id),
  ]);

  return (
    <VendorDetailClient vendor={vendor} assignmentsAsVendor={assignmentsAsVendor} assignmentsAsSubVendor={assignmentsAsSubVendor} />
  );
}
