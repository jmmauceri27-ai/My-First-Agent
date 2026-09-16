export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getVendor, listAssignmentsForSubVendor, listAssignmentsForVendor } from "@/lib/networkDal";
import { listFieldClasses } from "@/lib/fieldsDal";
import VendorDetailClient from "./VendorDetailClient";

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vendor = await getVendor(id);
  if (!vendor) notFound();

  const [assignmentsAsVendor, assignmentsAsSubVendor, fieldClasses] = await Promise.all([
    listAssignmentsForVendor(id),
    listAssignmentsForSubVendor(id),
    listFieldClasses(),
  ]);

  return (
    <VendorDetailClient
      vendor={vendor}
      assignmentsAsVendor={assignmentsAsVendor}
      assignmentsAsSubVendor={assignmentsAsSubVendor}
      fieldClasses={fieldClasses}
    />
  );
}
